import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
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
import {
  createSyntheticStandardDeliveryProbe,
  deriveStandardDeliveryFrontier,
  readAlignedMainStandardDeliveryCheckpoint,
  readRepositoryPorcelainStatus,
} from "./support/task-delivery-frontier.mjs";

const SHA = Object.freeze({
  sourceMain: "1".repeat(40),
  legacyOutcome: "2".repeat(40),
  legacyMerge: "3".repeat(40),
  hardenedOutcome: "4".repeat(40),
  hardenedMerge: "5".repeat(40),
});
const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const REPOSITORY_TASKS_ROOT = path.join(REPOSITORY_ROOT, "docs", "tasks");

function assertBoundedLiveQueryCounts(diagnostics) {
  const { queryCounts, queryPolicy } = diagnostics;
  for (const key of [
    "commands",
    "gitCommands",
    "githubApiCommands",
    "jobLogFetches",
  ]) {
    assert.ok(Number.isInteger(queryCounts[key]) && queryCounts[key] >= 0, key);
  }
  assert.equal(queryPolicy.retries, 0);
  assert.ok(queryCounts.commands <= queryPolicy.maxCommands);
  assert.ok(queryCounts.gitCommands <= queryCounts.commands);
  assert.ok(queryCounts.githubApiCommands <= queryCounts.commands);
  assert.ok(queryCounts.jobLogFetches <= queryCounts.commands);
}

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

test("terminal delivery hydrates predecessor continuity without selected-Task self-coverage", async () => {
  const { checkpoint } = checkpointFixture();
  const allCoveredTasks = [completedTask("0001"), completedTask("0002")];
  let localDiscoveryCalls = 0;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-deliver 0002",
    queueInspector: async () => ({
      tasks: allCoveredTasks,
      errors: [],
    }),
    continuityLoader: async ({ requiredTasks, coverageTasks }) => {
      assert.deepEqual(requiredTasks.map((task) => task.id), ["0001"]);
      assert.deepEqual(coverageTasks.map((task) => task.id), ["0001", "0002"]);
      return {
        checkpoint,
        partition: {
          coveredTasks: [allCoveredTasks[0]],
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
    currentDeliveryHydrator: async ({ task }) => ({
      deliveryLedger: {},
      deliveryExpectations: {},
      classifications: { [task.id]: "PENDING" },
      chronology: [],
      diagnostics: { taskId: task.id, state: "RESUMABLE" },
    }),
  });
  assert.equal(localDiscoveryCalls, 0);
  assert.deepEqual(hydrated.diagnostics.requiredTaskIds, ["0001"]);
  assert.equal(hydrated.diagnostics.continuity.coveredTaskCount, 1);
  assert.equal(hydrated.diagnostics.continuity.checkpointCoveredTaskCount, 2);
  assert.deepEqual(Object.keys(hydrated.deliveryLedger), ["0001", "0002"]);
  assert.equal(hydrated.diagnostics.currentDelivery, undefined);
  assert.equal(
    hydrated.deliveryLedger["0002"].classification,
    "DURABLE_STANDARD_CONTINUITY",
  );
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
  });
  assert.deepEqual(
    subsetLoaded.partition.coveredTasks.map((task) => task.id),
    ["0002"],
  );
  assert.deepEqual(
    subsetLoaded.coveragePartition.coveredTasks.map((task) => task.id),
    ["0001", "0002"],
  );
  const uncoveredPredecessor = {
    ...completedTask("0003"),
    taskPath: path.join(tasksRoot, "0003-uncovered", "TASK.md"),
    testPath: path.join(tasksRoot, "0003-uncovered", "TEST.md"),
  };
  const selectedCurrent = {
    ...completedTask("0004"),
    taskPath: path.join(tasksRoot, "0004-selected", "TASK.md"),
    testPath: path.join(tasksRoot, "0004-selected", "TEST.md"),
  };
  const causalLagLoaded = await loadTrustedStandardDeliveryContinuity({
    tasksRoot,
    requiredTasks: [requiredTask, requiredSecond, uncoveredPredecessor],
    coverageTasks: [
      requiredTask,
      requiredSecond,
      uncoveredPredecessor,
      selectedCurrent,
    ],
    currentDeliveryTaskId: "0004",
    commandCache: createInvocationCommandCache({ runner }),
    githubClient,
  });
  assert.deepEqual(
    causalLagLoaded.partition.uncoveredTasks.map((task) => task.id),
    ["0003"],
  );
  assert.equal(
    causalLagLoaded.coverageTasks.some((task) => task.id === "0004"),
    false,
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

test("checkpoint writer serializes divergent transitions and preserves stale locks", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-continuity-lock-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const genesis = checkpointFixture();
  await writeStandardDeliveryContinuityCheckpoint({
    tasksRoot: root,
    bytes: genesis.bytes,
  });
  const rolling = (seed) =>
    createStandardDeliveryContinuityCheckpoint({
      repository: "owner/repository",
      baseRef: "main",
      sourceMainSha: seed.repeat(40),
      previousCheckpoint: genesis.checkpoint,
      coveredRecords: [
        coveredRecord({
          taskId: "0003",
          classification: "HARDENED_EXACT_HEAD",
          outcomeSha: String(Number(seed) + 1).repeat(40),
          mergeSha: String(Number(seed) + 2).repeat(40),
          seed: String(Number(seed) + 3),
        }),
      ],
    });
  const left = rolling("1");
  const right = rolling("5");
  let releaseLeft;
  let reportLocked;
  const locked = new Promise((resolve) => {
    reportLocked = resolve;
  });
  const hold = new Promise((resolve) => {
    releaseLeft = resolve;
  });
  const leftWrite = writeStandardDeliveryContinuityCheckpoint({
    tasksRoot: root,
    bytes: left.bytes,
    beforePublish: async () => {
      reportLocked();
      await hold;
    },
  });
  await locked;
  await assert.rejects(
    writeStandardDeliveryContinuityCheckpoint({
      tasksRoot: root,
      bytes: right.bytes,
    }),
    (error) => error.code === "DELIVERY_CONTINUITY_LOCKED",
  );
  releaseLeft();
  await leftWrite;
  assert.equal(
    await readFile(
      path.join(root, ".kyw-dev-standard-delivery-continuity.json"),
      "utf8",
    ),
    left.bytes,
  );
  await assert.rejects(
    writeStandardDeliveryContinuityCheckpoint({
      tasksRoot: root,
      bytes: right.bytes,
    }),
    /does not match previousCheckpointDigest/,
  );

  const lockPath = path.join(
    root,
    ".kyw-dev-standard-delivery-continuity.lock",
  );
  await writeFile(lockPath, "manual recovery evidence\n", "utf8");
  const lockBytes = await readFile(lockPath, "utf8");
  await assert.rejects(
    writeStandardDeliveryContinuityCheckpoint({
      tasksRoot: root,
      bytes: left.bytes,
    }),
    (error) => error.code === "DELIVERY_CONTINUITY_LOCKED",
  );
  assert.equal(await readFile(lockPath, "utf8"), lockBytes);
});

test("checkpoint writer detects target, stage, and lock replacement before publish", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-continuity-cas-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const genesis = checkpointFixture();
  await writeStandardDeliveryContinuityCheckpoint({
    tasksRoot: root,
    bytes: genesis.bytes,
  });
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
  const target = path.join(
    root,
    ".kyw-dev-standard-delivery-continuity.json",
  );
  const displacedTarget = `${target}.displaced`;
  await assert.rejects(
    writeStandardDeliveryContinuityCheckpoint({
      tasksRoot: root,
      bytes: advanced.bytes,
      beforePublish: async () => {
        await rename(target, displacedTarget);
        await writeFile(target, genesis.bytes, "utf8");
      },
    }),
    (error) => error.code === "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
  );
  assert.equal(await readFile(target, "utf8"), genesis.bytes);
  await rm(displacedTarget);

  let foreignStage;
  await assert.rejects(
    writeStandardDeliveryContinuityCheckpoint({
      tasksRoot: root,
      bytes: advanced.bytes,
      beforePublish: async ({ stage }) => {
        await rename(stage, `${stage}.owned`);
        await writeFile(stage, "foreign stage bytes\n", "utf8");
        foreignStage = stage;
      },
    }),
    (error) => error.code === "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
  );
  assert.equal(await readFile(target, "utf8"), genesis.bytes);
  assert.equal(await readFile(foreignStage, "utf8"), "foreign stage bytes\n");

  const lockPath = path.join(
    root,
    ".kyw-dev-standard-delivery-continuity.lock",
  );
  const displacedLock = `${lockPath}.owned`;
  await assert.rejects(
    writeStandardDeliveryContinuityCheckpoint({
      tasksRoot: root,
      bytes: advanced.bytes,
      beforePublish: async () => {
        await rename(lockPath, displacedLock);
        await writeFile(lockPath, "foreign lock bytes\n", "utf8");
      },
    }),
    (error) => error.code === "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
  );
  assert.equal(await readFile(target, "utf8"), genesis.bytes);
  assert.equal(await readFile(lockPath, "utf8"), "foreign lock bytes\n");
});

test("prepared advancement applies only inside the selected terminal delivery branch", async (t) => {
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
  const deliveredTaskPath = path.join(
    tasksRoot,
    "0001-delivered",
    "TASK.md",
  );
  const deliveredTestPath = path.join(
    tasksRoot,
    "0001-delivered",
    "TEST.md",
  );
  const deliveredTaskBytes = "# TASK 0001 — Delivered\n\n## Status\n\nDONE\n";
  const deliveredTestBytes = "# TEST 0001 — Delivered\n\n## Status\n\nPASSED\n";
  await Promise.all([
    writeFile(
      deliveredTaskPath,
      deliveredTaskBytes,
      "utf8",
    ),
    writeFile(
      deliveredTestPath,
      deliveredTestBytes,
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
  let directMainSha = currentMainSha;
  let githubMainSha = currentMainSha;
  const commandRunner = ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (
      command === "git" &&
      args.join("\u0000") ===
        "ls-remote\u0000--heads\u0000origin\u0000refs/heads/main"
    ) {
      return {
        status: 0,
        stdout: `${directMainSha}\trefs/heads/main\n`,
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
  const githubClient = {
    async getMainRef() {
      return { object: { sha: githubMainSha } };
    },
  };
  const applyRuntime = { commandRunner, githubClient };
  const advanced = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: currentMainSha,
    previousCheckpoint: genesis.checkpoint,
    coveredRecords: [
      {
        ...coveredRecord({
        taskId: "0001",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: currentMainSha,
        mergeSha: currentMainSha,
        seed: "2",
        }),
        taskSha256: sha256(deliveredTaskBytes),
        testSha256: sha256(deliveredTestBytes),
      },
    ],
  });
  const token = createStandardDeliveryContinuityTransitionToken({
    selectedTaskId: "0002",
    checkpoint: advanced.checkpoint,
  });
  const queueInspector = async () => ({
    tasks: [
      {
        ...completedTask("0001"),
        taskPath: deliveredTaskPath,
        testPath: deliveredTestPath,
      },
      completedTask("0002"),
    ],
    errors: [],
  });
  const checkpointRelative =
    "docs/tasks/.kyw-dev-standard-delivery-continuity.json";
  const checkpointPath = path.join(
    tasksRoot,
    ".kyw-dev-standard-delivery-continuity.json",
  );
  const beforeRejectedApply = await readFile(
    checkpointPath,
    "utf8",
  );
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
      ...applyRuntime,
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
  git(root, ["switch", "-c", "evil/task/0002-selected"]);
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
      ...applyRuntime,
    }),
    /branch does not prove selected-Task ownership/,
  );
  git(root, ["switch", "main"]);
  git(root, ["switch", "-c", "task/0002-selected"]);
  let queueReads = 0;
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector: async () => {
        queueReads += 1;
        return queueReads === 1
          ? queueInspector()
          : {
              tasks: [
                completedTask("0001"),
                {
                  ...completedTask("0002"),
                  taskStatus: "IN_PROGRESS",
                  testStatus: "RUNNING",
                },
              ],
              errors: [],
            };
      },
      ...applyRuntime,
    }),
    /continuity cannot apply while implementation is active/,
  );
  assert.equal(
    await readFile(checkpointPath, "utf8"),
    genesis.bytes,
  );

  let pairByteReads = 0;
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector: async () => {
        pairByteReads += 1;
        if (pairByteReads === 2) {
          await writeFile(
            deliveredTaskPath,
            `${deliveredTaskBytes}\nlast-moment drift\n`,
            "utf8",
          );
        }
        return queueInspector();
      },
      ...applyRuntime,
    }),
    /bytes changed after preparation/,
  );
  assert.equal(pairByteReads, 2);
  assert.equal(await readFile(checkpointPath, "utf8"), genesis.bytes);
  await writeFile(deliveredTaskPath, deliveredTaskBytes, "utf8");

  let pairModeReads = 0;
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector: async () => {
        pairModeReads += 1;
        if (pairModeReads === 2) {
          git(root, [
            "update-index",
            "--chmod=+x",
            "docs/tasks/0001-delivered/TASK.md",
          ]);
        }
        return queueInspector();
      },
      ...applyRuntime,
    }),
    /tree\/index mode, type, stage, or blob changed after preparation/,
  );
  assert.equal(pairModeReads, 2);
  assert.equal(await readFile(checkpointPath, "utf8"), genesis.bytes);
  git(root, [
    "update-index",
    "--chmod=-x",
    "docs/tasks/0001-delivered/TASK.md",
  ]);

  let pairPathReads = 0;
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector: async () => {
        pairPathReads += 1;
        if (pairPathReads === 1) return queueInspector();
        return {
          tasks: [
            {
              ...completedTask("0001"),
              taskPath: path.join(tasksRoot, "0001-renamed", "TASK.md"),
              testPath: path.join(tasksRoot, "0001-renamed", "TEST.md"),
            },
            completedTask("0002"),
          ],
          errors: [],
        };
      },
      ...applyRuntime,
    }),
    /tree\/index mode, type, stage, or blob changed after preparation/,
  );
  assert.equal(pairPathReads, 2);
  assert.equal(await readFile(checkpointPath, "utf8"), genesis.bytes);

  let directReads = 0;
  const driftingRemoteRunner = (request) => {
    if (
      request.command === "git" &&
      request.args.join("\u0000") ===
        "ls-remote\u0000--heads\u0000origin\u0000refs/heads/main"
    ) {
      directReads += 1;
      return {
        status: 0,
        stdout: `${directReads === 1 ? currentMainSha : checkpointBase}\trefs/heads/main\n`,
        stderr: "",
      };
    }
    return commandRunner(request);
  };
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
      commandRunner: driftingRemoteRunner,
      githubClient,
    }),
    /direct remote main does not equal local main/,
  );
  assert.equal(directReads, 2);
  assert.equal(
    await readFile(
      path.join(tasksRoot, ".kyw-dev-standard-delivery-continuity.json"),
      "utf8",
    ),
    genesis.bytes,
  );

  let githubReads = 0;
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
      commandRunner,
      githubClient: {
        async getMainRef() {
          githubReads += 1;
          return {
            object: {
              sha: githubReads === 1 ? currentMainSha : checkpointBase,
            },
          };
        },
      },
    }),
    /GitHub main SHA must equal/,
  );
  assert.equal(githubReads, 2);

  const checkpointBlob = git(root, [
    "rev-parse",
    `HEAD:${checkpointRelative}`,
  ]);
  git(root, ["update-index", "--chmod=+x", checkpointRelative]);
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
      ...applyRuntime,
    }),
    /checkpoint index entry must be absent or exactly one stage-0 regular 100644 blob/,
  );
  assert.equal(await readFile(checkpointPath, "utf8"), genesis.bytes);
  git(root, ["restore", "--staged", checkpointRelative]);

  git(root, [
    "update-index",
    "--add",
    "--cacheinfo",
    `120000,${checkpointBlob},${checkpointRelative}`,
  ]);
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
      ...applyRuntime,
    }),
    /checkpoint index entry must be absent or exactly one stage-0 regular 100644 blob/,
  );
  assert.equal(await readFile(checkpointPath, "utf8"), genesis.bytes);
  git(root, ["restore", "--staged", checkpointRelative]);

  const unmergedIndexRunner = (request) => {
    if (
      request.command === "git" &&
      request.args.join("\u0000") ===
        `ls-files\u0000--stage\u0000--\u0000${checkpointRelative}`
    ) {
      return {
        status: 0,
        stdout:
          `100644 ${checkpointBlob} 1\t${checkpointRelative}\n` +
          `100644 ${checkpointBlob} 2\t${checkpointRelative}\n`,
        stderr: "",
      };
    }
    return commandRunner(request);
  };
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
      commandRunner: unmergedIndexRunner,
      githubClient,
    }),
    /checkpoint index entry must be absent or exactly one stage-0 regular 100644 blob/,
  );
  assert.equal(await readFile(checkpointPath, "utf8"), genesis.bytes);

  await writeFile(checkpointPath, advanced.bytes, "utf8");
  git(root, ["add", checkpointRelative]);
  await writeFile(checkpointPath, genesis.bytes, "utf8");
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector,
      ...applyRuntime,
    }),
    /checkpoint HEAD\/index\/worktree state is unsafe \(PREVIOUS\/DESIRED\/PREVIOUS\)/,
  );
  assert.equal(await readFile(checkpointPath, "utf8"), genesis.bytes);
  assert.equal(git(root, ["show", `:${checkpointRelative}`]), advanced.bytes.trim());
  git(root, ["restore", "--staged", checkpointRelative]);

  const unrelatedPath = path.join(root, "unrelated-staged.txt");
  await writeFile(unrelatedPath, "preserve staged user work\n", "utf8");
  git(root, ["add", "unrelated-staged.txt"]);
  const first = await applyStandardDeliveryContinuityTransition({
    tasksRoot,
    selectedTaskId: "0002",
    preparedCheckpoint: advanced.checkpoint,
    queueInspector,
    ...applyRuntime,
  });
  assert.equal(first.write.applied, true);
  assert.equal(first.coveredTaskCount, 1);
  assert.match(
    git(root, ["diff", "--cached", "--name-only"]),
    /unrelated-staged\.txt/,
  );
  const repeated = await applyStandardDeliveryContinuityTransition({
    tasksRoot,
    selectedTaskId: "0002",
    preparedCheckpoint: advanced.checkpoint,
    queueInspector,
    ...applyRuntime,
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
      ...applyRuntime,
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
      ...applyRuntime,
    }),
    /does not equal local main/,
  );
  git(root, ["update-ref", "refs/remotes/origin/main", currentMainSha]);
  await assert.rejects(
    applyStandardDeliveryContinuityTransition({
      tasksRoot,
      selectedTaskId: "0002",
      transitionToken: token,
      queueInspector: async () => ({
        tasks: [
          completedTask("0001"),
          {
            ...completedTask("0002"),
            taskStatus: "IN_PROGRESS",
            testStatus: "RUNNING",
          },
        ],
        errors: [],
      }),
      ...applyRuntime,
    }),
    /continuity cannot apply while implementation is active/,
  );
});

test("rolling continuity remains one-step and cannot cover the selected Task", () => {
  const through0101 = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "a".repeat(40),
    coveredRecords: [
      coveredRecord({
        taskId: "0101",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "b".repeat(40),
        mergeSha: "c".repeat(40),
        seed: "1",
      }),
    ],
  });
  const through0102 = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "d".repeat(40),
    previousCheckpoint: through0101.checkpoint,
    coveredRecords: [
      coveredRecord({
        taskId: "0102",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "e".repeat(40),
        mergeSha: "f".repeat(40),
        seed: "2",
      }),
    ],
  });
  assert.equal(
    through0102.checkpoint.previousCheckpointDigest,
    through0101.checkpoint.checkpointDigest,
  );
  assert.equal(through0102.checkpoint.coverage.taskCount, 2);
  assert.equal(through0102.checkpoint.coverage.lastTaskId, "0102");
  const token = createStandardDeliveryContinuityTransitionToken({
    selectedTaskId: "0103",
    checkpoint: through0102.checkpoint,
  });
  const parsed = parseStandardDeliveryContinuityTransitionToken(token);
  assert.equal(parsed.selectedTaskId, "0103");
  assert.equal(parsed.checkpoint.coverage.lastTaskId, "0102");
  assert.throws(
    () =>
      createStandardDeliveryContinuityTransitionToken({
        selectedTaskId: "0102",
        checkpoint: through0102.checkpoint,
      }),
    /cannot attest to its own delivery/,
  );
  assert.throws(
    () =>
      createStandardDeliveryContinuityCheckpoint({
        repository: "owner/repository",
        sourceMainSha: "d".repeat(40),
        previousCheckpoint: through0101.checkpoint,
        coveredRecords: [
          coveredRecord({
            taskId: "0102",
            classification: "HARDENED_EXACT_HEAD",
            outcomeSha: "e".repeat(40),
            mergeSha: "f".repeat(40),
            seed: "2",
          }),
          coveredRecord({
            taskId: "0103",
            classification: "HARDENED_EXACT_HEAD",
            outcomeSha: "1".repeat(40),
            mergeSha: "2".repeat(40),
            seed: "3",
          }),
        ],
      }),
    /rolling transition may cover exactly one new outcome/,
  );
});

test("frontier-relative live expectations compose offline and follow one rolling transition", () => {
  const initial = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "a".repeat(40),
    coveredRecords: [
      coveredRecord({
        taskId: "0001",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "b".repeat(40),
        mergeSha: "c".repeat(40),
        seed: "1",
      }),
    ],
  });
  const tasks = [
    completedTask("0001"),
    completedTask("0002"),
    {
      ...completedTask("0003"),
      deliveryRequirement: {
        kind: "NONE",
        reason: "offline fixture has no external delivery",
      },
    },
    {
      ...completedTask("0004"),
      taskStatus: "IN_PROGRESS",
      testStatus: "RUNNING",
    },
    {
      ...completedTask("0005"),
      taskStatus: "READY",
      testStatus: "READY",
    },
  ];
  const probe = createSyntheticStandardDeliveryProbe({
    tasks,
    tasksRoot: "C:\\fixture\\docs\\tasks",
  });
  assert.equal(probe.selectedTask.id, "0006");
  assert.deepEqual(probe.selectedTask.dependencies, ["0003"]);
  assert.deepEqual(
    probe.tasks
      .filter((task) => task.id === "0004")
      .map((task) => [task.taskStatus, task.testStatus]),
    [["READY", "READY"]],
  );

  const beforeRoll = deriveStandardDeliveryFrontier({
    tasks: probe.tasks,
    invocation: probe.invocation,
    checkpoint: initial.checkpoint,
  });
  assert.deepEqual(beforeRoll.requiredTaskIds, ["0001", "0002"]);
  assert.deepEqual(beforeRoll.coveredTaskIds, ["0001"]);
  assert.deepEqual(beforeRoll.uncoveredTaskIds, ["0002"]);
  assert.deepEqual(beforeRoll.classifications, {
    "0001": "DURABLE_STANDARD_CONTINUITY",
    "0002": "HARDENED_EXACT_HEAD",
  });
  assert.equal(beforeRoll.preparedAdvancement, true);
  assert.equal(beforeRoll.expectedTaskCount, 2);
  assert.equal(beforeRoll.expectedLastTaskId, "0002");

  const rolled = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "d".repeat(40),
    previousCheckpoint: initial.checkpoint,
    coveredRecords: [
      coveredRecord({
        taskId: "0002",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "e".repeat(40),
        mergeSha: "f".repeat(40),
        seed: "4",
      }),
    ],
  });
  const afterRoll = deriveStandardDeliveryFrontier({
    tasks: probe.tasks,
    invocation: probe.invocation,
    checkpoint: rolled.checkpoint,
  });
  assert.deepEqual(afterRoll.coveredTaskIds, ["0001", "0002"]);
  assert.deepEqual(afterRoll.uncoveredTaskIds, []);
  assert.equal(afterRoll.preparedAdvancement, false);
  assert.equal(afterRoll.expectedTaskCount, 2);
  assert.equal(afterRoll.expectedLastTaskId, "0002");

  const nextTasks = tasks.map((task) =>
    task.id === "0003"
      ? { ...task, deliveryRequirement: { kind: "STANDARD" } }
      : task,
  );
  const nextProbe = createSyntheticStandardDeliveryProbe({
    tasks: nextTasks,
    tasksRoot: "C:\\fixture\\docs\\tasks",
  });
  const nextFrontier = deriveStandardDeliveryFrontier({
    tasks: nextProbe.tasks,
    invocation: nextProbe.invocation,
    checkpoint: rolled.checkpoint,
  });
  assert.deepEqual(nextFrontier.requiredTaskIds, ["0001", "0002", "0003"]);
  assert.deepEqual(nextFrontier.coveredTaskIds, ["0001", "0002"]);
  assert.deepEqual(nextFrontier.uncoveredTaskIds, ["0003"]);
  assert.equal(nextFrontier.expectedTaskCount, 3);
  assert.equal(nextFrontier.expectedLastTaskId, "0003");
  assert.throws(
    () =>
      deriveStandardDeliveryFrontier({
        tasks: nextProbe.tasks,
        invocation: nextProbe.invocation,
        checkpoint: initial.checkpoint,
      }),
    (error) => error.code === "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
  );
});

test(
  "live STANDARD delivery continuity proves bootstrap and the next bounded transition",
  { skip: process.env.KYW_LIVE_GITHUB_CONTINUITY !== "1" },
  async (t) => {
    const statusBefore = readRepositoryPorcelainStatus(REPOSITORY_ROOT);
    const alignedBefore =
      readAlignedMainStandardDeliveryCheckpoint(REPOSITORY_ROOT);
    const queue = await inspectTaskQueue(REPOSITORY_TASKS_ROOT);
    assert.deepEqual(queue.errors, []);
    const probe = createSyntheticStandardDeliveryProbe({
      tasks: queue.tasks,
      tasksRoot: REPOSITORY_TASKS_ROOT,
    });
    const expected = deriveStandardDeliveryFrontier({
      tasks: probe.tasks,
      invocation: probe.invocation,
      checkpoint: alignedBefore.checkpoint,
    });
    const steadyState = await hydratePriorStandardDeliveries({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      invocation: probe.invocation,
      queueInspector: async () => ({ tasks: probe.tasks, errors: [] }),
    });
    assert.deepEqual(
      steadyState.diagnostics.requiredTaskIds,
      expected.requiredTaskIds,
    );
    assert.deepEqual(
      steadyState.diagnostics.continuity.coveredTaskIds,
      expected.coveredTaskIds,
    );
    assert.deepEqual(
      steadyState.diagnostics.continuity.uncoveredTaskIds,
      expected.uncoveredTaskIds,
    );
    assert.equal(
      steadyState.diagnostics.continuity.coveredTaskCount,
      expected.coveredTaskIds.length,
    );
    assert.equal(
      steadyState.diagnostics.continuity.freshEvidenceTaskCount,
      expected.uncoveredTaskIds.length,
    );
    assert.equal(
      steadyState.diagnostics.continuity.preparedAdvancement,
      expected.preparedAdvancement,
    );
    assert.equal(steadyState.diagnostics.continuity.fullHistoryFallback, false);
    for (const taskId of expected.requiredTaskIds) {
      assert.equal(
        steadyState.diagnostics.classifications[taskId],
        expected.classifications[taskId],
      );
      const evaluation = evaluateDeliveryEvidence(
        taskId,
        steadyState.deliveryLedger[taskId],
        steadyState.deliveryExpectations[taskId],
      );
      assert.equal(
        evaluation.satisfied,
        true,
        `Task ${taskId}: ${evaluation.issues.join("; ")}`,
      );
    }
    if (expected.preparedAdvancement) {
      assert.ok(steadyState.preparedCheckpoint);
      assert.equal(
        steadyState.preparedCheckpoint.previousCheckpointDigest,
        alignedBefore.checkpoint.checkpointDigest,
      );
      assert.equal(
        steadyState.preparedCheckpoint.coverage.taskCount,
        expected.expectedTaskCount,
      );
      assert.equal(
        steadyState.preparedCheckpoint.coverage.lastTaskId,
        expected.expectedLastTaskId,
      );
      assert.ok(steadyState.diagnostics.queryCounts.jobLogFetches > 0);
    } else {
      assert.equal(steadyState.preparedCheckpoint, undefined);
      assert.equal(steadyState.diagnostics.queryCounts.jobLogFetches, 0);
    }
    assertBoundedLiveQueryCounts(steadyState.diagnostics);
    t.diagnostic(
      `frontier required=${expected.requiredTaskIds.length} covered=${expected.coveredTaskIds.length} uncovered=${expected.uncoveredTaskIds.join(",") || "none"} expected=${expected.expectedTaskCount}/${expected.expectedLastTaskId}; queries commands=${steadyState.diagnostics.queryCounts.commands} github=${steadyState.diagnostics.queryCounts.githubApiCommands} logs=${steadyState.diagnostics.queryCounts.jobLogFetches}`,
    );
    const alignedAfter =
      readAlignedMainStandardDeliveryCheckpoint(REPOSITORY_ROOT);
    assert.equal(alignedAfter.bytes, alignedBefore.bytes);
    assert.equal(
      readRepositoryPorcelainStatus(REPOSITORY_ROOT),
      statusBefore,
    );
  },
);
