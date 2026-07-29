import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH,
  applyStandardDeliveryContinuityTransition,
  buildStandardDeliveryContinuityState,
  createStandardDeliveryContinuityCheckpoint,
  createStandardDeliveryContinuityTransitionToken,
  createInvocationCommandCache,
  evaluateDeliveryEvidence,
  hydratePriorStandardDeliveries,
  inspectTaskQueue,
  loadTrustedStandardDeliveryContinuity,
  parseStandardDeliveryContinuityCheckpoint,
  parseStandardDeliveryContinuityTransitionToken,
  partitionStandardDeliveryContinuity,
  writeStandardDeliveryContinuityCheckpoint,
} from "../src/core/task-artifacts.mjs";
import { runTaskArtifactCommand } from "../skills/kyw-task/scripts/task-artifacts.mjs";

const SHA = Object.freeze({
  sourceMain: "1".repeat(40),
  legacyOutcome: "2".repeat(40),
  legacyMerge: "3".repeat(40),
  hardenedOutcome: "4".repeat(40),
  hardenedMerge: "5".repeat(40),
});
const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const REPOSITORY_TASKS_ROOT = path.join(REPOSITORY_ROOT, "docs", "tasks");

function git(repositoryRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function coveredRecord({
  taskId,
  classification,
  outcomeSha,
  mergeSha,
  seed,
}) {
  const hex = "0123456789abcdef";
  const index = hex.indexOf(seed);
  return {
    taskId,
    taskSha256: seed.repeat(64),
    testSha256: hex[index + 1].repeat(64),
    taskStatus: "DONE",
    testStatus: "PASSED",
    classification,
    outcomeSha,
    mergeSha,
    evidenceSha256: hex[index + 2].repeat(64),
  };
}

function completedTask(id) {
  return {
    id,
    number: Number(id),
    taskStatus: "DONE",
    testStatus: "PASSED",
    contractVersion: 2,
    deliveryRequirement: { kind: "STANDARD" },
  };
}

function checkpointFixture() {
  return createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    baseRef: "main",
    sourceMainSha: SHA.sourceMain,
    coveredRecords: [
      coveredRecord({
        taskId: "0001",
        classification: "LEGACY_PRE_CONTRACT",
        outcomeSha: SHA.legacyOutcome,
        mergeSha: SHA.legacyMerge,
        seed: "6",
      }),
      coveredRecord({
        taskId: "0002",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: SHA.hardenedOutcome,
        mergeSha: SHA.hardenedMerge,
        seed: "9",
      }),
    ],
  });
}

test("continuity checkpoint is canonical, closed, fixed-bounded, and digest-bound", () => {
  const created = checkpointFixture();
  assert.ok(Buffer.byteLength(created.bytes, "utf8") <= 8192);
  assert.equal(created.checkpoint.schemaVersion, 1);
  assert.equal(created.checkpoint.coverage.taskCount, 2);
  assert.equal(created.checkpoint.coverage.lastTaskId, "0002");
  assert.equal(created.checkpoint.previousCheckpointDigest, "GENESIS");
  assert.equal(created.checkpoint.transition.taskId, "0002");
  assert.equal(created.checkpoint.transition.classification, "HARDENED_EXACT_HEAD");
  assert.deepEqual(
    parseStandardDeliveryContinuityCheckpoint(created.bytes),
    created.checkpoint,
  );

  const tampered = created.bytes.replace(
    '"repository": "owner/repository"',
    '"repository": "other/repository"',
  );
  assert.throws(
    () => parseStandardDeliveryContinuityCheckpoint(tampered),
    /checkpoint digest/,
  );
  const unknown = created.bytes.replace(
    '"schemaVersion": 1,',
    '"schemaVersion": 1,\n  "unknown": true,',
  );
  assert.throws(
    () => parseStandardDeliveryContinuityCheckpoint(unknown),
    /unknown field/,
  );
  assert.throws(
    () => parseStandardDeliveryContinuityCheckpoint(`${created.bytes} `),
    /canonical/,
  );
  assert.throws(
    () =>
      parseStandardDeliveryContinuityCheckpoint(
        `${"x".repeat(8192)}\n`,
      ),
    /exceeds 8192/,
  );
  assert.throws(
    () =>
      parseStandardDeliveryContinuityCheckpoint(
        created.bytes.replace(
          '"repository": "owner/repository",',
          '"repository": "owner/repository",\n  "authorization": "Bearer secret",',
        ),
      ),
    /unknown field authorization/,
  );
  assert.throws(
    () =>
      createStandardDeliveryContinuityCheckpoint({
        repository: "token@owner/repository",
        sourceMainSha: SHA.sourceMain,
        coveredRecords: [],
      }),
    /owner\/name identity/,
  );
  assert.throws(
    () =>
      createStandardDeliveryContinuityCheckpoint({
        repository: "other/repository",
        sourceMainSha: "a".repeat(40),
        previousCheckpoint: created.checkpoint,
        coveredRecords: [
          coveredRecord({
            taskId: "0003",
            classification: "HARDENED_EXACT_HEAD",
            outcomeSha: "b".repeat(40),
            mergeSha: "c".repeat(40),
            seed: "c",
          }),
        ],
      }),
    /cannot change repository or base identity/,
  );
});

test("checkpoint coverage is an exact ordered prefix with a one-outcome uncovered bound", () => {
  const { checkpoint } = checkpointFixture();
  const exact = partitionStandardDeliveryContinuity({
    checkpoint,
    requiredTasks: [completedTask("0001"), completedTask("0002")],
  });
  assert.deepEqual(exact.coveredTasks.map(({ id }) => id), ["0001", "0002"]);
  assert.deepEqual(exact.uncoveredTasks, []);

  const oneStep = partitionStandardDeliveryContinuity({
    checkpoint,
    requiredTasks: [
      completedTask("0001"),
      completedTask("0002"),
      completedTask("0003"),
    ],
  });
  assert.deepEqual(oneStep.uncoveredTasks.map(({ id }) => id), ["0003"]);

  assert.throws(
    () =>
      partitionStandardDeliveryContinuity({
        checkpoint,
        requiredTasks: [completedTask("0002"), completedTask("0001")],
      }),
    /ordered required Task set/,
  );
  assert.throws(
    () =>
      partitionStandardDeliveryContinuity({
        checkpoint,
        requiredTasks: [
          completedTask("0001"),
          completedTask("0002"),
          completedTask("0003"),
          completedTask("0004"),
        ],
      }),
    /migration\/rebaseline/,
  );
});

test("covered Tasks use a distinct production-evaluated continuity classification", () => {
  const { checkpoint } = checkpointFixture();
  const coveredTasks = [completedTask("0001"), completedTask("0002")];
  const state = buildStandardDeliveryContinuityState({
    checkpoint,
    coveredTasks,
  });

  for (const task of coveredTasks) {
    const evaluation = evaluateDeliveryEvidence(
      task.id,
      state.deliveryLedger[task.id],
      state.deliveryExpectations[task.id],
    );
    assert.equal(evaluation.satisfied, true);
    assert.equal(evaluation.classification, "DURABLE_STANDARD_CONTINUITY");
    assert.equal(evaluation.actualHead, "PREVIOUSLY_EVALUATOR_SATISFIED");
  }

  const mutated = structuredClone(state.deliveryLedger["0002"]);
  mutated.checkpointDigest = "f".repeat(64);
  const rejected = evaluateDeliveryEvidence(
    "0002",
    mutated,
    state.deliveryExpectations["0002"],
  );
  assert.equal(rejected.satisfied, false);
  assert.match(rejected.issues.join("; "), /checkpointDigest/);

  const subset = buildStandardDeliveryContinuityState({
    checkpoint,
    coveredTasks: [coveredTasks[1]],
    coverageTasks: coveredTasks,
  });
  assert.deepEqual(Object.keys(subset.deliveryLedger), ["0002"]);
  assert.equal(
    evaluateDeliveryEvidence(
      "0002",
      subset.deliveryLedger["0002"],
      subset.deliveryExpectations["0002"],
    ).satisfied,
    true,
  );
});

test("checkpoint-covered hydration evaluator-replays no historical GitHub graph", async () => {
  const { checkpoint } = checkpointFixture();
  const coveredTasks = [completedTask("0001"), completedTask("0002")];
  const ready = {
    ...completedTask("0003"),
    taskStatus: "READY",
    testStatus: "READY",
  };
  let localDiscoveryCalls = 0;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-impl 0003",
    queueInspector: async () => ({
      tasks: [...coveredTasks, ready],
      errors: [],
    }),
    continuityLoader: async ({ requiredTasks }) => ({
      checkpoint,
      partition: partitionStandardDeliveryContinuity({
        checkpoint,
        requiredTasks,
      }),
      source: "ALIGNED_MAIN",
      identity: {
        repository: "owner/repository",
        currentMainSha: SHA.sourceMain,
        upstreamSha: SHA.sourceMain,
        cachedMainSha: SHA.sourceMain,
        directRemoteSha: SHA.sourceMain,
        githubMainSha: SHA.sourceMain,
        githubClient: {},
      },
    }),
    localDiscovery: async () => {
      localDiscoveryCalls += 1;
      throw new Error("covered history must not be locally rediscovered");
    },
  });
  assert.equal(localDiscoveryCalls, 0);
  assert.deepEqual(hydrated.diagnostics.requiredTaskIds, ["0001", "0002"]);
  assert.equal(hydrated.diagnostics.continuity.coveredTaskCount, 2);
  assert.equal(hydrated.diagnostics.continuity.freshEvidenceTaskCount, 0);
  assert.equal(hydrated.diagnostics.queryCounts.jobLogFetches, 0);
  assert.deepEqual(new Set(Object.values(hydrated.diagnostics.classifications)), new Set([
    "DURABLE_STANDARD_CONTINUITY",
  ]));
});

test("terminal delivery closure uses a checkpoint-covered subset of global continuity", async () => {
  const { checkpoint } = checkpointFixture();
  const allCoveredTasks = [completedTask("0001"), completedTask("0002")];
  let localDiscoveryCalls = 0;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-impl 0002",
    queueInspector: async () => ({
      tasks: allCoveredTasks,
      errors: [],
    }),
    continuityLoader: async ({ requiredTasks, coverageTasks }) => {
      assert.deepEqual(requiredTasks.map((task) => task.id), ["0002"]);
      assert.deepEqual(coverageTasks.map((task) => task.id), ["0001", "0002"]);
      return {
        checkpoint,
        partition: {
          coveredTasks: [allCoveredTasks[1]],
          uncoveredTasks: [],
        },
        coveragePartition: partitionStandardDeliveryContinuity({
          checkpoint,
          requiredTasks: coverageTasks,
        }),
        source: "ALIGNED_MAIN",
        identity: {
          repository: "owner/repository",
          currentMainSha: SHA.sourceMain,
          upstreamSha: SHA.sourceMain,
          cachedMainSha: SHA.sourceMain,
          directRemoteSha: SHA.sourceMain,
          githubMainSha: SHA.sourceMain,
          githubClient: {},
        },
      };
    },
    localDiscovery: async () => {
      localDiscoveryCalls += 1;
      throw new Error("checkpoint-covered terminal closure must stay durable");
    },
  });
  assert.equal(localDiscoveryCalls, 0);
  assert.deepEqual(hydrated.diagnostics.requiredTaskIds, ["0002"]);
  assert.equal(hydrated.diagnostics.continuity.coveredTaskCount, 1);
  assert.equal(hydrated.diagnostics.continuity.checkpointCoveredTaskCount, 2);
  assert.deepEqual(Object.keys(hydrated.deliveryLedger), ["0002"]);
});

test("empty delivery history prepares genesis without GitHub access or mutation", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-continuity-empty-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tasksRoot = path.join(root, "docs", "tasks");
  await mkdir(tasksRoot, { recursive: true });
  await writeFile(path.join(root, "README.md"), "# Fixture\n", "utf8");
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.name", "Continuity Fixture"]);
  git(root, ["config", "user.email", "continuity@example.invalid"]);
  git(root, [
    "remote",
    "add",
    "origin",
    "https://github.com/owner/repository.git",
  ]);
  git(root, ["add", "README.md"]);
  git(root, ["commit", "-m", "Initialize empty delivery history"]);
  const mainSha = git(root, ["rev-parse", "HEAD"]);
  git(root, ["update-ref", "refs/remotes/origin/main", mainSha]);
  git(root, ["config", "branch.main.remote", "origin"]);
  git(root, ["config", "branch.main.merge", "refs/heads/main"]);
  let githubCommands = 0;
  const runner = ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (command === "gh") {
      githubCommands += 1;
      throw new Error("empty genesis must not invoke GitHub");
    }
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer,
      shell: false,
    });
    return {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error,
    };
  };
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot,
    invocation: "$kyw-impl 0001",
    commandRunner: runner,
    queueInspector: async () => ({
      tasks: [
        {
          ...completedTask("0001"),
          taskStatus: "READY",
          testStatus: "READY",
        },
      ],
      errors: [],
    }),
  });
  assert.equal(githubCommands, 0);
  assert.equal(hydrated.preparedCheckpoint.coverage.taskCount, 0);
  assert.equal(hydrated.diagnostics.continuity.source, "EMPTY_HISTORY_PREPARED");
  assert.equal(hydrated.diagnostics.queryCounts.githubApiCommands, 0);
  assert.equal(hydrated.diagnostics.queryCounts.jobLogFetches, 0);
  await assert.rejects(
    readFile(
      path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
      "utf8",
    ),
    /ENOENT/,
  );
});

test("trusted continuity reads aligned main and rejects pair, predecessor, or GitHub-main drift", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-continuity-git-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tasksRoot = path.join(root, "docs", "tasks");
  const taskDirectory = path.join(tasksRoot, "0001-covered");
  await mkdir(taskDirectory, { recursive: true });
  const taskPath = path.join(taskDirectory, "TASK.md");
  const testPath = path.join(taskDirectory, "TEST.md");
  const taskBytes = "# TASK 0001 — Covered\n\n## Status\n\nDONE\n";
  const testBytes = "# TEST 0001 — Covered\n\n## Status\n\nPASSED\n";
  await Promise.all([
    writeFile(taskPath, taskBytes, "utf8"),
    writeFile(testPath, testBytes, "utf8"),
  ]);
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.name", "Continuity Fixture"]);
  git(root, ["config", "user.email", "continuity@example.invalid"]);
  git(root, [
    "remote",
    "add",
    "origin",
    "https://github.com/owner/repository.git",
  ]);
  git(root, ["add", "docs/tasks/0001-covered/TASK.md", "docs/tasks/0001-covered/TEST.md"]);
  git(root, ["commit", "-m", "Add covered terminal pair"]);
  const sourceMainSha = git(root, ["rev-parse", "HEAD"]);
  const record = coveredRecord({
    taskId: "0001",
    classification: "HARDENED_EXACT_HEAD",
    outcomeSha: sourceMainSha,
    mergeSha: sourceMainSha,
    seed: "2",
  });
  record.taskSha256 = sha256(taskBytes);
  record.testSha256 = sha256(testBytes);
  const checkpoint = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha,
    coveredRecords: [record],
  });
  await writeFile(
    path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
    checkpoint.bytes,
    "utf8",
  );
  git(root, ["add", "docs/tasks/.kyw-dev-standard-delivery-continuity.json"]);
  git(root, ["commit", "-m", "Add continuity checkpoint"]);
  let alignedMainSha = git(root, ["rev-parse", "HEAD"]);
  git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
  git(root, ["config", "branch.main.remote", "origin"]);
  git(root, ["config", "branch.main.merge", "refs/heads/main"]);
  git(root, ["switch", "-c", "task/0002-fixture"]);

  const runner = ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (command === "git" && args[0] === "ls-remote") {
      return {
        status: 0,
        stdout: `${alignedMainSha}\trefs/heads/main\n`,
        stderr: "",
      };
    }
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer,
      shell: false,
    });
    return {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error,
    };
  };
  const requiredTask = {
    ...completedTask("0001"),
    taskPath,
    testPath,
  };
  const githubClient = {
    getMainRef: async () => ({ object: { sha: alignedMainSha } }),
  };
  await writeFile(
    path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
    '{"forged":true}\n',
    "utf8",
  );
  const loaded = await loadTrustedStandardDeliveryContinuity({
    tasksRoot,
    requiredTasks: [requiredTask],
    commandCache: createInvocationCommandCache({ runner }),
    githubClient,
    allowBootstrapWorktreeCheckpoint: false,
  });
  assert.equal(loaded.source, "ALIGNED_MAIN");
  assert.equal(
    loaded.checkpoint.checkpointDigest,
    checkpoint.checkpoint.checkpointDigest,
  );

  await writeFile(taskPath, `${taskBytes}\nforged\n`, "utf8");
  await assert.rejects(
    loadTrustedStandardDeliveryContinuity({
      tasksRoot,
      requiredTasks: [requiredTask],
      commandCache: createInvocationCommandCache({ runner }),
      githubClient,
      allowBootstrapWorktreeCheckpoint: false,
    }),
    /working-tree substitution/,
  );
  await writeFile(taskPath, taskBytes, "utf8");
  await assert.rejects(
    loadTrustedStandardDeliveryContinuity({
      tasksRoot,
      requiredTasks: [requiredTask],
      commandCache: createInvocationCommandCache({ runner }),
      githubClient: {
        getMainRef: async () => ({ object: { sha: "f".repeat(40) } }),
      },
      allowBootstrapWorktreeCheckpoint: false,
    }),
    /GitHub main SHA/,
  );

  await writeFile(
    path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
    checkpoint.bytes,
    "utf8",
  );
  git(root, ["switch", "main"]);
  const secondDirectory = path.join(tasksRoot, "0002-covered");
  const secondTaskPath = path.join(secondDirectory, "TASK.md");
  const secondTestPath = path.join(secondDirectory, "TEST.md");
  const secondTaskBytes = "# TASK 0002 — Covered\n\n## Status\n\nDONE\n";
  const secondTestBytes = "# TEST 0002 — Covered\n\n## Status\n\nPASSED\n";
  await mkdir(secondDirectory, { recursive: true });
  await Promise.all([
    writeFile(secondTaskPath, secondTaskBytes, "utf8"),
    writeFile(secondTestPath, secondTestBytes, "utf8"),
  ]);
  git(root, ["add", "docs/tasks/0002-covered"]);
  git(root, ["commit", "-m", "Add the next delivered pair"]);
  const rollingSourceMainSha = git(root, ["rev-parse", "HEAD"]);
  const secondRecord = coveredRecord({
    taskId: "0002",
    classification: "HARDENED_EXACT_HEAD",
    outcomeSha: rollingSourceMainSha,
    mergeSha: rollingSourceMainSha,
    seed: "6",
  });
  secondRecord.taskSha256 = sha256(secondTaskBytes);
  secondRecord.testSha256 = sha256(secondTestBytes);
  const rolling = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: rollingSourceMainSha,
    previousCheckpoint: checkpoint.checkpoint,
    coveredRecords: [secondRecord],
  });
  await writeFile(
    path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
    rolling.bytes,
    "utf8",
  );
  git(root, ["add", "docs/tasks/.kyw-dev-standard-delivery-continuity.json"]);
  git(root, ["commit", "-m", "Advance continuity"]);
  alignedMainSha = git(root, ["rev-parse", "HEAD"]);
  git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
  const requiredSecond = {
    ...completedTask("0002"),
    taskPath: secondTaskPath,
    testPath: secondTestPath,
  };
  const rollingLoaded = await loadTrustedStandardDeliveryContinuity({
    tasksRoot,
    requiredTasks: [requiredTask, requiredSecond],
    commandCache: createInvocationCommandCache({ runner }),
    githubClient,
    allowBootstrapWorktreeCheckpoint: false,
  });
  assert.equal(
    rollingLoaded.checkpoint.previousCheckpointDigest,
    checkpoint.checkpoint.checkpointDigest,
  );
  const subsetLoaded = await loadTrustedStandardDeliveryContinuity({
    tasksRoot,
    requiredTasks: [requiredSecond],
    coverageTasks: [requiredTask, requiredSecond],
    commandCache: createInvocationCommandCache({ runner }),
    githubClient,
    allowBootstrapWorktreeCheckpoint: false,
  });
  assert.deepEqual(
    subsetLoaded.partition.coveredTasks.map((task) => task.id),
    ["0002"],
  );
  assert.deepEqual(
    subsetLoaded.coveragePartition.coveredTasks.map((task) => task.id),
    ["0001", "0002"],
  );

  const mismatchedPrevious = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: rollingSourceMainSha,
    coveredRecords: [record],
  });
  const mismatchedRolling = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: rollingSourceMainSha,
    previousCheckpoint: mismatchedPrevious.checkpoint,
    coveredRecords: [secondRecord],
  });
  await writeFile(
    path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
    mismatchedRolling.bytes,
    "utf8",
  );
  git(root, ["add", "docs/tasks/.kyw-dev-standard-delivery-continuity.json"]);
  git(root, ["commit", "-m", "Add mismatched predecessor fixture"]);
  alignedMainSha = git(root, ["rev-parse", "HEAD"]);
  git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
  await assert.rejects(
    loadTrustedStandardDeliveryContinuity({
      tasksRoot,
      requiredTasks: [requiredTask, requiredSecond],
      commandCache: createInvocationCommandCache({ runner }),
      githubClient,
      allowBootstrapWorktreeCheckpoint: false,
    }),
    /does not bind the exact source-main predecessor/,
  );
});

test("rolling transition token is causal, atomic, and idempotent", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-continuity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const genesis = checkpointFixture();
  const firstWrite = await writeStandardDeliveryContinuityCheckpoint({
    tasksRoot: root,
    bytes: genesis.bytes,
  });
  assert.equal(firstWrite.applied, true);

  const advanced = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    baseRef: "main",
    sourceMainSha: "a".repeat(40),
    previousCheckpoint: genesis.checkpoint,
    coveredRecords: [
      coveredRecord({
        taskId: "0003",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "b".repeat(40),
        mergeSha: "c".repeat(40),
        seed: "2",
      }),
    ],
  });
  const token = createStandardDeliveryContinuityTransitionToken({
    selectedTaskId: "0004",
    checkpoint: advanced.checkpoint,
  });
  const parsedToken =
    parseStandardDeliveryContinuityTransitionToken(token);
  assert.equal(parsedToken.selectedTaskId, "0004");
  assert.equal(parsedToken.checkpoint.coverage.lastTaskId, "0003");
  assert.throws(
    () =>
      createStandardDeliveryContinuityTransitionToken({
        selectedTaskId: "0003",
        checkpoint: advanced.checkpoint,
      }),
    /cannot attest to its own delivery/,
  );

  const applied = await writeStandardDeliveryContinuityCheckpoint({
    tasksRoot: root,
    bytes: advanced.bytes,
  });
  assert.equal(applied.applied, true);
  const repeated = await writeStandardDeliveryContinuityCheckpoint({
    tasksRoot: root,
    bytes: advanced.bytes,
  });
  assert.equal(repeated.applied, false);
  assert.equal(repeated.idempotent, true);
  assert.equal(
    await readFile(
      path.join(root, ".kyw-dev-standard-delivery-continuity.json"),
      "utf8",
    ),
    advanced.bytes,
  );
  assert.deepEqual(
    (await readdir(root)).filter((name) => name.includes(".stage-")),
    [],
  );
});

test("prepared advancement applies only inside the selected active Task branch", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-continuity-apply-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tasksRoot = path.join(root, "docs", "tasks");
  await mkdir(tasksRoot, { recursive: true });
  await writeFile(path.join(root, "README.md"), "# Fixture\n", "utf8");
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.name", "Continuity Fixture"]);
  git(root, ["config", "user.email", "continuity@example.invalid"]);
  git(root, ["add", "README.md"]);
  git(root, ["commit", "-m", "Initialize apply fixture"]);
  const checkpointBase = git(root, ["rev-parse", "HEAD"]);
  const genesis = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: checkpointBase,
    coveredRecords: [],
  });
  await writeFile(
    path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
    genesis.bytes,
    "utf8",
  );
  git(root, ["add", "docs/tasks/.kyw-dev-standard-delivery-continuity.json"]);
  git(root, ["commit", "-m", "Add empty genesis"]);
  await Promise.all([
    mkdir(path.join(tasksRoot, "0001-delivered"), { recursive: true }),
    mkdir(path.join(tasksRoot, "0002-selected"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(tasksRoot, "0001-delivered", "TASK.md"),
      "# TASK 0001 — Delivered\n\n## Status\n\nDONE\n",
      "utf8",
    ),
    writeFile(
      path.join(tasksRoot, "0001-delivered", "TEST.md"),
      "# TEST 0001 — Delivered\n\n## Status\n\nPASSED\n",
      "utf8",
    ),
    writeFile(
      path.join(tasksRoot, "0002-selected", "TASK.md"),
      "# TASK 0002 — Selected\n\n## Status\n\nREADY\n",
      "utf8",
    ),
    writeFile(
      path.join(tasksRoot, "0002-selected", "TEST.md"),
      "# TEST 0002 — Selected\n\n## Status\n\nREADY\n",
      "utf8",
    ),
  ]);
  git(root, ["add", "docs/tasks"]);
  git(root, ["commit", "-m", "Add delivered and selected Tasks"]);
  const currentMainSha = git(root, ["rev-parse", "HEAD"]);
  git(root, [
    "remote",
    "add",
    "origin",
    "https://github.com/owner/repository.git",
  ]);
  git(root, ["update-ref", "refs/remotes/origin/main", currentMainSha]);
  git(root, ["config", "branch.main.remote", "origin"]);
  git(root, ["config", "branch.main.merge", "refs/heads/main"]);
  const advanced = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: currentMainSha,
    previousCheckpoint: genesis.checkpoint,
    coveredRecords: [
      coveredRecord({
        taskId: "0001",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: currentMainSha,
        mergeSha: currentMainSha,
        seed: "2",
      }),
    ],
  });
  const token = createStandardDeliveryContinuityTransitionToken({
    selectedTaskId: "0002",
    checkpoint: advanced.checkpoint,
  });
  const queueInspector = async () => ({
    tasks: [
      completedTask("0001"),
      {
        ...completedTask("0002"),
        taskStatus: "IN_PROGRESS",
        testStatus: "RUNNING",
      },
    ],
    errors: [],
  });
  const beforeRejectedApply = await readFile(
    path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
    "utf8",
  );
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
    }),
    /branch does not prove selected-Task ownership/,
  );
  assert.equal(
    await readFile(
      path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
      "utf8",
    ),
    beforeRejectedApply,
  );
  git(root, ["switch", "-c", "task/0002-selected"]);
  const first = await applyStandardDeliveryContinuityTransition({
    tasksRoot,
    selectedTaskId: "0002",
    transitionToken: token,
    queueInspector,
  });
  assert.equal(first.write.applied, true);
  assert.equal(first.coveredTaskCount, 1);
  const repeated = await applyStandardDeliveryContinuityTransition({
    tasksRoot,
    selectedTaskId: "0002",
    transitionToken: token,
    queueInspector,
  });
  assert.equal(repeated.write.idempotent, true);
  assert.equal(
    await readFile(
      path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
      "utf8",
    ),
    advanced.bytes,
  );
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0003",
      transitionToken: token,
      queueInspector,
    }),
    /different selected Task/,
  );
  git(root, [
    "update-ref",
    "refs/remotes/origin/main",
    checkpointBase,
  ]);
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
    }),
    /no longer align/,
  );
  git(root, ["update-ref", "refs/remotes/origin/main", currentMainSha]);
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector: async () => ({
        tasks: [completedTask("0001"), completedTask("0002")],
        errors: [],
      }),
    }),
    /must own the active IN_PROGRESS\/RUNNING lifecycle/,
  );
});

test("adapter emits an opaque transition only for recognized selected work", async () => {
  const genesis = checkpointFixture();
  const advanced = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "a".repeat(40),
    previousCheckpoint: genesis.checkpoint,
    coveredRecords: [
      coveredRecord({
        taskId: "0003",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "b".repeat(40),
        mergeSha: "c".repeat(40),
        seed: "2",
      }),
    ],
  }).checkpoint;
  const args = [
    "dispatch",
    "--tasks-root",
    "C:\\fixture\\docs\\tasks",
    "--invocation",
    "$kyw-impl 0004",
    "--managed-routing",
    "false",
  ];
  const hydrated = async () => ({
    deliveryLedger: {},
    deliveryExpectations: {},
    diagnostics: { requiredTaskIds: ["0003"] },
    preparedCheckpoint: advanced,
  });
  const selected = await runTaskArtifactCommand(args, {
    hydratePriorStandardDeliveries: hydrated,
    resolveTaskDispatch: async () => ({
      outcome: "SELECTED",
      action: "IMPLEMENT",
      task: { id: "0004" },
    }),
  });
  assert.equal(
    parseStandardDeliveryContinuityTransitionToken(
      selected.continuityTransitionToken,
    ).selectedTaskId,
    "0004",
  );
  const terminal = await runTaskArtifactCommand(args, {
    hydratePriorStandardDeliveries: hydrated,
    resolveTaskDispatch: async () => ({ outcome: "ALL_COMPLETE" }),
  });
  assert.equal("continuityTransitionToken" in terminal, false);
});

test(
  "live STANDARD delivery continuity proves bootstrap and the next bounded transition",
  { skip: process.env.KYW_LIVE_GITHUB_CONTINUITY !== "1" },
  async () => {
    const queue = await inspectTaskQueue(REPOSITORY_TASKS_ROOT);
    assert.deepEqual(queue.errors, []);
    const task0060 = queue.tasks.find(({ id }) => id === "0060");
    assert.ok(task0060);
    const mainCheckpoint = spawnSync(
      "git",
      [
        "show",
        `main:${STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH}`,
      ],
      {
        cwd: REPOSITORY_ROOT,
        encoding: "utf8",
        windowsHide: true,
        shell: false,
      },
    );
    const postDelivery =
      task0060.taskStatus === "DONE" &&
      task0060.testStatus === "PASSED" &&
      mainCheckpoint.status === 0;

    if (!postDelivery) {
      const bootstrap = await hydratePriorStandardDeliveries({
        tasksRoot: REPOSITORY_TASKS_ROOT,
        invocation: "$kyw-impl 0060",
        managedRoutingAvailable: true,
        allowBootstrapWorktreeCheckpoint: true,
        queueInspector: async () => ({
          tasks: queue.tasks.map((task) =>
            task.id === "0060"
              ? { ...task, taskStatus: "READY", testStatus: "READY" }
              : task,
          ),
          errors: [],
        }),
      });
      assert.equal(bootstrap.diagnostics.continuity.coveredTaskCount, 29);
      assert.equal(bootstrap.diagnostics.continuity.freshEvidenceTaskCount, 0);
      assert.equal(bootstrap.diagnostics.continuity.fullHistoryFallback, false);
      assert.equal(bootstrap.diagnostics.queryCounts.jobLogFetches, 0);
      assert.ok(bootstrap.diagnostics.queryCounts.commands <= 512);
      return;
    }

    const syntheticReady = {
      id: "0061",
      number: 61,
      name: "0061-live-continuity-probe",
      taskStatus: "READY",
      testStatus: "READY",
      contractVersion: 2,
      dependencies: ["0060"],
      deliveryRequirement: { kind: "STANDARD" },
      taskPath: path.join(
        REPOSITORY_TASKS_ROOT,
        "0061-live-continuity-probe",
        "TASK.md",
      ),
      testPath: path.join(
        REPOSITORY_TASKS_ROOT,
        "0061-live-continuity-probe",
        "TEST.md",
      ),
    };
    const steadyState = await hydratePriorStandardDeliveries({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      invocation: "$kyw-impl 0061",
      managedRoutingAvailable: false,
      queueInspector: async () => ({
        tasks: [...queue.tasks, syntheticReady],
        errors: [],
      }),
    });
    assert.equal(steadyState.diagnostics.continuity.coveredTaskCount, 29);
    assert.deepEqual(
      steadyState.diagnostics.continuity.uncoveredTaskIds,
      ["0060"],
    );
    assert.equal(steadyState.diagnostics.continuity.freshEvidenceTaskCount, 1);
    assert.equal(steadyState.diagnostics.continuity.fullHistoryFallback, false);
    assert.equal(
      steadyState.diagnostics.classifications["0060"],
      "HARDENED_EXACT_HEAD",
    );
    assert.equal(
      evaluateDeliveryEvidence(
        "0060",
        steadyState.deliveryLedger["0060"],
        steadyState.deliveryExpectations["0060"],
      ).satisfied,
      true,
    );
    assert.equal(steadyState.preparedCheckpoint.coverage.taskCount, 30);
    assert.equal(steadyState.preparedCheckpoint.coverage.lastTaskId, "0060");
    assert.ok(steadyState.diagnostics.queryCounts.jobLogFetches > 0);
    assert.ok(steadyState.diagnostics.queryCounts.commands <= 512);
  },
);
