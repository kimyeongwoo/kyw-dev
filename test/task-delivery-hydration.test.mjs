import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildStandardDeliveryContinuityState,
  classifyLocalDeliveryContracts,
  createStandardDeliveryContinuityCheckpoint,
  createGitHubEvidenceClient,
  createInvocationCommandCache,
  discoverLocalDeliveryOutcomes,
  discoverRequiredStandardDeliveries,
  evaluateDeliveryEvidence,
  hydratePriorStandardDeliveries,
  normalizeHardenedDeliveryEvidence,
  parseKywCiEvidence,
  STANDARD_DELIVERY_CONTINUITY_FILE,
} from "../src/core/task-artifacts.mjs";
import { runTaskArtifactCommand } from "../skills/kyw-task/scripts/task-artifacts.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));

function task({
  id,
  status = "DONE",
  testStatus = status === "DONE" ? "PASSED" : status === "READY" ? "READY" : "RUNNING",
  delivery = "STANDARD",
  dependencies = [],
  contractVersion = 2,
}) {
  return {
    id,
    number: Number(id),
    taskStatus: status,
    testStatus,
    contractVersion,
    dependencies,
    deliveryRequirement:
      delivery === "STANDARD"
        ? { kind: "STANDARD" }
        : { kind: "NONE", reason: "fixture has no external delivery" },
  };
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

async function futureTerminalFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-future-terminal-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tasksRoot = path.join(root, "docs", "tasks");
  const directory = path.join(tasksRoot, "0001-immutable");
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");
  const workflowPath = path.join(root, ".github", "workflows", "ci.yml");
  const taskBytes = `# TASK 0001 — Immutable

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Prove immutable terminal delivery behavior.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Exercise terminal pair enforcement.

## Out of Scope

- Do not mutate external state.

## Acceptance Criteria

- [x] AC-01: The immutable fixture is delivered.

## Plan

- [x] Deliver and verify the fixture.

## Decisions

- Keep the fixture deterministic.

## Risks

- Preserve exact terminal bytes.

## Discoveries and Changes

- The fixture uses one protected merge.

## Documentation Impact

- SPEC: Unaffected.
- ARCHITECTURE: Unaffected.
- README: Unaffected.
- AGENTS: Unaffected.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Repository outcome verified.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker is known.
`;
  const testBytes = `# TEST 0001 — Immutable

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: \`./TASK.md\`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — immutable fixture delivery | Run the focused fixture. | Integration | PASS | Focused fixture passed. |

## Regression Coverage

- Preserve terminal delivery behavior.

## Commands

- Focused fixture.

## Results

- Focused fixture passed.

## Unverified

- Not applicable — no residual risk remains.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
`;
  await mkdir(path.dirname(workflowPath), { recursive: true });
  await writeFile(
    workflowPath,
    await readFile(path.join(REPOSITORY_ROOT, ".github", "workflows", "ci.yml"), "utf8"),
    "utf8",
  );
  await writeFile(path.join(root, "README.md"), "# Fixture\n", "utf8");
  await writeFile(path.join(root, ".gitattributes"), "*.md text eol=lf\n", "utf8");
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.name", "Future Terminal Fixture"]);
  git(root, ["config", "user.email", "future-terminal@example.invalid"]);
  git(root, ["config", "core.autocrlf", "false"]);
  git(root, ["add", "README.md", ".gitattributes", ".github/workflows/ci.yml"]);
  git(root, ["commit", "-m", "Initialize immutable delivery fixture"]);
  git(root, ["switch", "-c", "task/0001-immutable"]);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(taskPath, taskBytes, "utf8"),
    writeFile(testPath, testBytes, "utf8"),
  ]);
  git(root, ["add", "docs/tasks/0001-immutable"]);
  git(root, ["commit", "-m", "Complete immutable Task"]);
  const outcomeSha = git(root, ["rev-parse", "HEAD"]);
  git(root, ["switch", "main"]);
  git(root, [
    "merge",
    "--no-ff",
    "task/0001-immutable",
    "-m",
    "Merge pull request #1 from owner/task/0001-immutable",
  ]);
  let alignedMainSha = git(root, ["rev-parse", "HEAD"]);
  git(root, [
    "remote",
    "add",
    "origin",
    "https://github.com/owner/repository.git",
  ]);
  git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
  git(root, ["config", "branch.main.remote", "origin"]);
  git(root, ["config", "branch.main.merge", "refs/heads/main"]);
  const queueTask = {
    ...task({ id: "0001", contractVersion: 3 }),
    name: "0001-immutable",
    directory,
    taskPath,
    testPath,
  };
  const commandRunner = ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (command === "git" && args[0] === "ls-remote") {
      return {
        status: 0,
        signal: null,
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
  const deliveryCollector = async ({ local }) => {
    const outcome = local.outcomes[0];
    const created = createStandardDeliveryContinuityCheckpoint({
      repository: local.repository,
      sourceMainSha: local.currentMainSha,
      coveredRecords: [
        {
          taskId: queueTask.id,
          taskSha256: sha256(taskBytes),
          testSha256: sha256(testBytes),
          taskStatus: "DONE",
          testStatus: "PASSED",
          classification: "HARDENED_EXACT_HEAD",
          outcomeSha: outcome.outcomeSha,
          mergeSha: outcome.mergeSha,
          evidenceSha256: "a".repeat(64),
        },
      ],
    });
    const state = buildStandardDeliveryContinuityState({
      checkpoint: created.checkpoint,
      coveredTasks: [queueTask],
      coverageTasks: [queueTask],
    });
    return {
      ...state,
      classifications: Object.freeze({
        [queueTask.id]: "HARDENED_EXACT_HEAD",
      }),
      chronology: Object.freeze([]),
      githubMainSha: local.currentMainSha,
    };
  };
  const hydrate = () =>
    hydratePriorStandardDeliveries({
      tasksRoot,
      invocation: "$kyw-impl 0001",
      commandRunner,
      queueInspector: async () => ({ tasks: [queueTask], errors: [] }),
      deliveryCollector,
      allowUncheckpointedCompatibility: true,
    });
  const hydrateFromQueue = () =>
    hydratePriorStandardDeliveries({
      tasksRoot,
      invocation: "$kyw-impl 0001",
      commandRunner,
      deliveryCollector,
      allowUncheckpointedCompatibility: true,
    });
  return {
    root,
    tasksRoot,
    directory,
    taskPath,
    testPath,
    taskBytes,
    testBytes,
    outcomeSha,
    queueTask,
    hydrate,
    hydrateFromQueue,
    async checkpointDelivery() {
      const checkpoint = createStandardDeliveryContinuityCheckpoint({
        repository: "owner/repository",
        sourceMainSha: alignedMainSha,
        coveredRecords: [
          {
            taskId: queueTask.id,
            taskSha256: sha256(taskBytes),
            testSha256: sha256(testBytes),
            taskStatus: "DONE",
            testStatus: "PASSED",
            classification: "HARDENED_EXACT_HEAD",
            outcomeSha,
            mergeSha: alignedMainSha,
            evidenceSha256: "b".repeat(64),
          },
        ],
      }).checkpoint;
      await writeFile(
        path.join(tasksRoot, STANDARD_DELIVERY_CONTINUITY_FILE),
        `${JSON.stringify(checkpoint, null, 2)}\n`,
        "utf8",
      );
      git(root, ["add", `docs/tasks/${STANDARD_DELIVERY_CONTINUITY_FILE}`]);
      git(root, ["commit", "-m", "Record immutable delivery continuity"]);
      alignedMainSha = git(root, ["rev-parse", "HEAD"]);
      git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
      const githubClient = {
        async getMainRef() {
          return { object: { sha: alignedMainSha } };
        },
      };
      return () =>
        hydratePriorStandardDeliveries({
          tasksRoot,
          invocation: "$kyw-impl 0001",
          commandRunner,
          githubClient,
        });
    },
    advanceMain() {
      alignedMainSha = git(root, ["rev-parse", "HEAD"]);
      git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
      return alignedMainSha;
    },
  };
}

test("required delivery discovery is empty when the selected Task has no prior outcome", () => {
  const tasks = [task({ id: "0001", status: "READY" })];
  assert.deepEqual(
    discoverRequiredStandardDeliveries({
      tasks,
      invocation: "$kyw-impl 0001",
      managedRoutingAvailable: false,
    }).map(({ id }) => id),
    [],
  );
});

test("required delivery discovery follows queue transition and dependency truth", () => {
  const tasks = [
    task({ id: "0001" }),
    task({ id: "0002", delivery: "NONE" }),
    task({ id: "0003", status: "BLOCKED", testStatus: "BLOCKED" }),
    task({ id: "0004", dependencies: ["0001"] }),
    task({ id: "0005", status: "READY", dependencies: ["0004"] }),
    task({ id: "0006" }),
  ];
  assert.deepEqual(
    discoverRequiredStandardDeliveries({
      tasks,
      invocation: "$kyw-impl 0005",
      managedRoutingAvailable: false,
    }).map(({ id }) => id),
    ["0001", "0004"],
  );
});

test("future terminal delivery binds canonical pair bytes and rejects worktree mutation before dispatch", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const unchanged = await fixture.hydrate();
  assert.equal(
    evaluateDeliveryEvidence(
      "0001",
      unchanged.deliveryLedger["0001"],
      unchanged.deliveryExpectations["0001"],
    ).satisfied,
    true,
  );

  for (const scenario of [
    {
      name: "TASK.md bytes",
      path: fixture.taskPath,
      mutate: () => writeFile(fixture.taskPath, `${fixture.taskBytes}\nchanged\n`, "utf8"),
      restore: () => writeFile(fixture.taskPath, fixture.taskBytes, "utf8"),
    },
    {
      name: "TEST.md bytes",
      path: fixture.testPath,
      mutate: () => writeFile(fixture.testPath, `${fixture.testBytes}\nchanged\n`, "utf8"),
      restore: () => writeFile(fixture.testPath, fixture.testBytes, "utf8"),
    },
    {
      name: "TASK.md deletion",
      path: fixture.taskPath,
      mutate: () => rm(fixture.taskPath),
      restore: () => writeFile(fixture.taskPath, fixture.taskBytes, "utf8"),
    },
    {
      name: "TASK.md rename",
      path: fixture.taskPath,
      mutate: () => rename(fixture.taskPath, `${fixture.taskPath}.moved`),
      restore: () => rename(`${fixture.taskPath}.moved`, fixture.taskPath),
    },
    {
      name: "TASK.md unsupported replacement",
      path: fixture.taskPath,
      mutate: async () => {
        await rm(fixture.taskPath);
        await mkdir(fixture.taskPath);
      },
      restore: async () => {
        await rm(fixture.taskPath, { recursive: true });
        await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
      },
    },
  ]) {
    await scenario.mutate();
    await assert.rejects(
      fixture.hydrate(),
      (error) =>
        error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
        error.message.includes("Task 0001") &&
        error.message.includes(
          path.relative(fixture.root, scenario.path).replaceAll("\\", "/"),
        ) &&
        error.message.includes('$kyw-task "<correction outcome>"'),
      scenario.name,
    );
    await scenario.restore();
  }

  const shadowDirectory = path.join(fixture.tasksRoot, "0001-shadow");
  await mkdir(shadowDirectory);
  await Promise.all([
    writeFile(path.join(shadowDirectory, "TASK.md"), fixture.taskBytes, "utf8"),
    writeFile(path.join(shadowDirectory, "TEST.md"), fixture.testBytes, "utf8"),
  ]);
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /0001-shadow\/(?:TASK|TEST)\.md/.test(error.message),
  );
});

test("production queue validation cannot mask delivered pair deletion or rename", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const unchanged = await fixture.hydrateFromQueue();
  assert.equal(
    evaluateDeliveryEvidence(
      "0001",
      unchanged.deliveryLedger["0001"],
      unchanged.deliveryExpectations["0001"],
    ).satisfied,
    true,
  );

  await rm(fixture.taskPath);
  await assert.rejects(
    fixture.hydrateFromQueue(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message) &&
      error.message.includes('$kyw-task "<correction outcome>"'),
  );
  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");

  const movedDirectory = path.join(fixture.tasksRoot, "0001-moved");
  await rename(fixture.directory, movedDirectory);
  await assert.rejects(
    fixture.hydrateFromQueue(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message),
  );
  await rename(movedDirectory, fixture.directory);

  const confusedDirectory = path.join(
    fixture.tasksRoot,
    "0001-IMMUTABLE-SHADOW",
  );
  await mkdir(confusedDirectory);
  await Promise.all([
    writeFile(path.join(confusedDirectory, "TASK.md"), fixture.taskBytes, "utf8"),
    writeFile(path.join(confusedDirectory, "TEST.md"), fixture.testBytes, "utf8"),
  ]);
  await assert.rejects(
    fixture.hydrateFromQueue(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /0001-IMMUTABLE-SHADOW\/(?:TASK|TEST)\.md/.test(error.message),
  );
});

test("production queue validation cannot mask a delivered pair link", async (t) => {
  const fixture = await futureTerminalFixture(t);
  await rm(fixture.taskPath);
  try {
    await symlink(path.basename(fixture.testPath), fixture.taskPath, "file");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      t.skip("file symlink creation is unavailable on this host");
      return;
    }
    throw error;
  }
  await assert.rejects(
    fixture.hydrateFromQueue(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message) &&
      /link|symbolic/i.test(error.message),
  );
});

test("checkpoint-covered future pairs remain exact without newline-normalization false positives", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const hydrateCovered = await fixture.checkpointDelivery();
  const unchanged = await hydrateCovered();
  assert.equal(
    unchanged.diagnostics.classifications["0001"],
    "DURABLE_STANDARD_CONTINUITY",
  );

  await writeFile(
    fixture.taskPath,
    fixture.taskBytes.replaceAll("\n", "\r\n"),
    "utf8",
  );
  await hydrateCovered();
  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");

  await rm(fixture.testPath);
  await assert.rejects(
    hydrateCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TEST\.md/.test(error.message),
  );
  await writeFile(fixture.testPath, fixture.testBytes, "utf8");

  await writeFile(fixture.testPath, `${fixture.testBytes}\nchanged\n`, "utf8");
  git(fixture.root, ["add", "docs/tasks/0001-immutable/TEST.md"]);
  git(fixture.root, ["commit", "-m", "Mutate checkpoint-covered evidence"]);
  fixture.advanceMain();
  await assert.rejects(
    hydrateCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /terminal artifact/.test(error.message),
  );
});

test("future terminal history rejects committed mutation even after byte reversion", async (t) => {
  const fixture = await futureTerminalFixture(t);
  await writeFile(fixture.taskPath, `${fixture.taskBytes}\nchanged\n`, "utf8");
  git(fixture.root, ["add", "docs/tasks/0001-immutable/TASK.md"]);
  git(fixture.root, ["commit", "-m", "Mutate delivered Task evidence"]);
  fixture.advanceMain();
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message),
  );

  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
  git(fixture.root, ["add", "docs/tasks/0001-immutable/TASK.md"]);
  git(fixture.root, ["commit", "-m", "Revert delivered Task evidence bytes"]);
  fixture.advanceMain();
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /terminal artifact/.test(error.message),
  );
});

test("future terminal history rejects a second Task-scoped delivery graph", async (t) => {
  const fixture = await futureTerminalFixture(t);
  git(fixture.root, ["switch", "-c", "task/0001-immutable-followup"]);
  await writeFile(path.join(fixture.root, "followup.txt"), "second delivery\n", "utf8");
  git(fixture.root, ["add", "followup.txt"]);
  git(fixture.root, ["commit", "-m", "Attempt a second delivery"]);
  git(fixture.root, ["switch", "main"]);
  git(fixture.root, [
    "merge",
    "--no-ff",
    "task/0001-immutable-followup",
    "-m",
    "Merge pull request #2 from owner/task/0001-immutable-followup",
  ]);
  fixture.advanceMain();
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /another Task-scoped protected merge/.test(error.message),
  );
});

test("future terminal history rejects ambiguous canonical delivery candidates", async (t) => {
  const fixture = await futureTerminalFixture(t);
  git(fixture.root, ["switch", "-c", "task/0001-second"]);
  const secondDirectory = path.join(fixture.tasksRoot, "0001-second");
  await mkdir(secondDirectory);
  await Promise.all([
    writeFile(path.join(secondDirectory, "TASK.md"), fixture.taskBytes, "utf8"),
    writeFile(path.join(secondDirectory, "TEST.md"), fixture.testBytes, "utf8"),
  ]);
  git(fixture.root, ["add", "docs/tasks/0001-second"]);
  git(fixture.root, ["commit", "-m", "Add ambiguous terminal pair"]);
  git(fixture.root, ["switch", "main"]);
  git(fixture.root, [
    "merge",
    "--no-ff",
    "task/0001-second",
    "-m",
    "Merge pull request #3 from owner/task/0001-second",
  ]);
  fixture.advanceMain();
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_DELIVERY_AMBIGUOUS" &&
      /0001-immutable, 0001-second|0001-second, 0001-immutable/.test(error.message),
  );
});

test("real Task 0059 multi-merge history remains grandfathered under contract 2", async () => {
  const name = "0059-automatically-hydrate-prior-standard-de-0e0a8659";
  const tasksRoot = path.join(REPOSITORY_ROOT, "docs", "tasks");
  const directory = path.join(tasksRoot, name);
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");
  const mainSha = git(REPOSITORY_ROOT, ["rev-parse", "main"]);
  const queueTask = {
    ...task({ id: "0059", contractVersion: 2 }),
    name,
    directory,
    taskPath,
    testPath,
  };
  const commandRunner = ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (command === "git" && args[0] === "ls-remote") {
      return {
        status: 0,
        signal: null,
        stdout: `${mainSha}\trefs/heads/main\n`,
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
  let observedOutcome;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot,
    invocation: "$kyw-impl 0059",
    commandRunner,
    queueInspector: async () => ({ tasks: [queueTask], errors: [] }),
    localDiscovery: discoverLocalDeliveryOutcomes,
    deliveryCollector: async ({ local }) => {
      [observedOutcome] = local.outcomes;
      const [taskBytes, testBytes] = await Promise.all([
        readFile(taskPath, "utf8"),
        readFile(testPath, "utf8"),
      ]);
      const checkpoint = createStandardDeliveryContinuityCheckpoint({
        repository: local.repository,
        sourceMainSha: local.currentMainSha,
        coveredRecords: [
          {
            taskId: queueTask.id,
            taskSha256: sha256(taskBytes),
            testSha256: sha256(testBytes),
            taskStatus: "DONE",
            testStatus: "PASSED",
            classification: "HARDENED_EXACT_HEAD",
            outcomeSha: observedOutcome.outcomeSha,
            mergeSha: observedOutcome.mergeSha,
            evidenceSha256: "c".repeat(64),
          },
        ],
      }).checkpoint;
      return {
        ...buildStandardDeliveryContinuityState({
          checkpoint,
          coveredTasks: [queueTask],
          coverageTasks: [queueTask],
        }),
        classifications: Object.freeze({
          [queueTask.id]: "HARDENED_EXACT_HEAD",
        }),
        chronology: Object.freeze([]),
        githubMainSha: local.currentMainSha,
      };
    },
    allowUncheckpointedCompatibility: true,
  });
  const mergeSubjects = git(REPOSITORY_ROOT, [
    "log",
    "--first-parent",
    "--format=%s",
    "main",
    "--",
    `docs/tasks/${name}`,
  ]).split(/\r?\n/);
  assert.equal(observedOutcome.mergeSha, "ffe51058a7e1adad1035a8fd2b9cde7215877d07");
  assert.equal(observedOutcome.terminalPair, undefined);
  assert.equal(
    evaluateDeliveryEvidence(
      "0059",
      hydrated.deliveryLedger["0059"],
      hydrated.deliveryExpectations["0059"],
    ).satisfied,
    true,
  );
  assert.ok(mergeSubjects.some((subject) => subject.includes("#46")));
  assert.ok(mergeSubjects.some((subject) => subject.includes("#47")));
});

test("legacy eligibility comes from ancestry around the hardened boundary, not Task numbers", async () => {
  const outcomes = [
    {
      taskId: "9000",
      baseSha: "a".repeat(40),
      outcomeSha: "b".repeat(40),
      mergeSha: "c".repeat(40),
      firstParentIndex: 1,
      hardenedWorkflow: false,
    },
    {
      taskId: "0001",
      baseSha: "c".repeat(40),
      outcomeSha: "d".repeat(40),
      mergeSha: "e".repeat(40),
      firstParentIndex: 2,
      hardenedWorkflow: true,
    },
  ];
  const ancestry = new Set([
    `${"b".repeat(40)}:${"c".repeat(40)}`,
    `${"c".repeat(40)}:${"c".repeat(40)}`,
    `${"c".repeat(40)}:${"e".repeat(40)}`,
  ]);
  const classified = await classifyLocalDeliveryContracts(outcomes, {
    currentMainSha: "e".repeat(40),
    isAncestor: async (ancestor, descendant) =>
      ancestor === descendant || ancestry.has(`${ancestor}:${descendant}`),
  });
  assert.equal(classified.contractAnchorSha, "c".repeat(40));
  assert.deepEqual(
    classified.outcomes.map(({ taskId, classification }) => [taskId, classification]),
    [
      ["9000", "LEGACY_PRE_CONTRACT"],
      ["0001", "HARDENED_EXACT_HEAD"],
    ],
  );
});

test("legacy-only and hardened-only histories derive their contract from ancestry and workflow truth", async () => {
  const legacy = await classifyLocalDeliveryContracts(
    [
      {
        taskId: "9001",
        baseSha: "1".repeat(40),
        outcomeSha: "2".repeat(40),
        mergeSha: "3".repeat(40),
        firstParentIndex: 1,
        hardenedWorkflow: false,
      },
    ],
    {
      currentMainSha: "4".repeat(40),
      isAncestor: async () => true,
    },
  );
  assert.equal(legacy.contractAnchorSha, "4".repeat(40));
  assert.equal(legacy.outcomes[0].classification, "LEGACY_PRE_CONTRACT");

  const hardened = await classifyLocalDeliveryContracts(
    [
      {
        taskId: "0001",
        baseSha: "5".repeat(40),
        outcomeSha: "6".repeat(40),
        mergeSha: "7".repeat(40),
        firstParentIndex: 1,
        hardenedWorkflow: true,
      },
    ],
    {
      currentMainSha: "7".repeat(40),
      isAncestor: async () => true,
    },
  );
  assert.equal(hardened.contractAnchorSha, "5".repeat(40));
  assert.equal(hardened.outcomes[0].classification, "HARDENED_EXACT_HEAD");
});

test("CI evidence parser ignores echoed commands and requires one emitted schema-2 record", () => {
  const sha = "a".repeat(40);
  const log = [
    "Job\tStep\t2026-01-01T00:00:00Z ^[[36;1mprintf 'KYWCIEVIDENCE schema=2 role=%s' \\^[[0m",
    `Job\tStep\t2026-01-01T00:00:01Z \u001b[36;1mKYWCIEVIDENCE schema=2 role=PR_ACTUAL_HEAD repository=owner/repo event=pull_request pr=7 workflow=CI run_id=11 run_attempt=1 job=behavioral expected_sha=${sha} actual_sha=${sha}\u001b[0m`,
  ].join("\n");
  assert.deepEqual(parseKywCiEvidence(log), {
    schema: 2,
    role: "PR_ACTUAL_HEAD",
    repository: "owner/repo",
    event: "pull_request",
    pr: "7",
    workflow: "CI",
    run_id: "11",
    run_attempt: "1",
    job: "behavioral",
    expected_sha: sha,
    actual_sha: sha,
  });
  assert.throws(
    () => parseKywCiEvidence("Job\tStep\tno emitted evidence"),
    /exactly one emitted KYWCIEVIDENCE record/,
  );
});

function hardenedFixture() {
  const repository = "owner/repository";
  const baseSha = "a".repeat(40);
  const outcomeSha = "b".repeat(40);
  const syntheticSha = "c".repeat(40);
  const mergeSha = "d".repeat(40);
  const workflow = { id: 71, name: "CI", path: ".github/workflows/ci.yml" };
  const names = [
    "Behavioral / fixture",
    "Quality / fixture",
    "Packed release / fixture",
  ];
  const workflowContract = {
    name: "CI",
    path: workflow.path,
    workflow,
    actualHeadJobs: names,
    postMergeJobs: [...names],
    mergeCompatibilityJob: "Merge compatibility / fixture",
    requiredGateJob: "Required / credential-free CI",
    jobKeys: {
      "Behavioral / fixture": "behavioral",
      "Quality / fixture": "quality",
      "Packed release / fixture": "packed-release",
      "Merge compatibility / fixture": "merge-compatibility",
      "Required / credential-free CI": "required",
    },
  };
  const outcome = {
    taskId: "0058",
    baseRef: "main",
    baseSha,
    outcomeSha,
    mergeSha,
    pullRequestNumber: 45,
    headRef: "task/0058-fixture",
    classification: "HARDENED_EXACT_HEAD",
    hardenedWorkflow: workflowContract,
  };
  const run = ({
    id,
    attempt,
    event,
    branch,
    sha,
  }) => ({
    id,
    runAttempt: attempt,
    workflowId: workflow.id,
    name: workflow.name,
    path: workflow.path,
    event,
    headBranch: branch,
    headSha: sha,
    status: "completed",
    conclusion: "success",
    pullRequestNumbers: event === "pull_request" ? [45] : [],
  });
  const prRun = run({
    id: 1001,
    attempt: 2,
    event: "pull_request",
    branch: outcome.headRef,
    sha: outcomeSha,
  });
  const postRun = run({
    id: 1002,
    attempt: 1,
    event: "push",
    branch: "main",
    sha: mergeSha,
  });
  const evidence = ({
    role,
    runValue,
    job,
    expectedSha,
    extras = {},
  }) => ({
    schema: 2,
    role,
    repository,
    event: role === "POST_MERGE_MAIN" ? "push" : "pull_request",
    pr: role === "POST_MERGE_MAIN" ? "0" : "45",
    workflow: "CI",
    run_id: String(runValue.id),
    run_attempt: String(runValue.runAttempt),
    job,
    expected_sha: expectedSha,
    actual_sha: expectedSha,
    ...extras,
  });
  let nextId = 2000;
  const job = ({ name, runValue, evidenceRecord }) => ({
    id: ++nextId,
    runId: runValue.id,
    runAttempt: runValue.runAttempt,
    name,
    headSha: runValue.headSha,
    status: "completed",
    conclusion: "success",
    ...(evidenceRecord ? { evidence: evidenceRecord } : {}),
  });
  const prJobs = names.map((name) =>
    job({
      name,
      runValue: prRun,
      evidenceRecord: evidence({
        role: "PR_ACTUAL_HEAD",
        runValue: prRun,
        job: workflowContract.jobKeys[name],
        expectedSha: outcomeSha,
      }),
    }),
  );
  prJobs.push(
    job({
      name: workflowContract.mergeCompatibilityJob,
      runValue: prRun,
      evidenceRecord: evidence({
        role: "PR_MERGE_COMPATIBILITY",
        runValue: prRun,
        job: "merge-compatibility",
        expectedSha: syntheticSha,
        extras: {
          expected_base_sha: baseSha,
          actual_base_sha: baseSha,
          expected_head_sha: outcomeSha,
          actual_head_sha: outcomeSha,
        },
      }),
    }),
    job({ name: workflowContract.requiredGateJob, runValue: prRun }),
  );
  const postJobs = names.map((name) =>
    job({
      name,
      runValue: postRun,
      evidenceRecord: evidence({
        role: "POST_MERGE_MAIN",
        runValue: postRun,
        job: workflowContract.jobKeys[name],
        expectedSha: mergeSha,
      }),
    }),
  );
  postJobs.push(job({ name: workflowContract.requiredGateJob, runValue: postRun }));
  return {
    outcome,
    repository,
    workflowContract,
    snapshot: {
      pullRequest: {
        number: 45,
        head: {
          sha: outcomeSha,
          ref: outcome.headRef,
          repo: { full_name: repository },
        },
        base: {
          sha: baseSha,
          ref: "main",
          repo: { full_name: repository },
        },
        merge_commit_sha: mergeSha,
        merged: true,
        draft: false,
      },
      reviews: [],
      pullRequestRun: prRun,
      pullRequestJobs: prJobs,
      syntheticCommit: {
        sha: syntheticSha,
        parents: [{ sha: baseSha }, { sha: outcomeSha }],
      },
      postMergeRun: postRun,
      postMergeJobs: postJobs,
      chronology: [
        {
          taskId: "0058",
          role: "PR_ATTEMPT",
          runId: 1001,
          runAttempt: 1,
          headSha: outcomeSha,
          status: "completed",
          conclusion: "failure",
        },
        {
          taskId: "0058",
          role: "PR_ATTEMPT",
          runId: 1001,
          runAttempt: 2,
          headSha: outcomeSha,
          status: "completed",
          conclusion: "success",
        },
      ],
    },
  };
}

function normalizeFixture(fixture) {
  return normalizeHardenedDeliveryEvidence(fixture);
}

test("complete hardened graph reaches the existing production evaluator", () => {
  const fixture = hardenedFixture();
  const normalized = normalizeFixture(fixture);
  const evaluation = evaluateDeliveryEvidence(
    fixture.outcome.taskId,
    normalized.entry,
    normalized.expectation,
  );
  assert.equal(evaluation.satisfied, true);
  assert.equal(evaluation.classification, "HARDENED_EXACT_HEAD");
  assert.deepEqual(
    normalized.chronology.map(({ runAttempt, conclusion }) => [
      runAttempt,
      conclusion,
    ]),
    [
      [1, "failure"],
      [2, "success"],
    ],
  );
});

test("checkpoint hydration freshly evaluates only one uncovered hardened outcome", async () => {
  const fixture = hardenedFixture();
  const normalized = normalizeFixture(fixture);
  const checkpoint = createStandardDeliveryContinuityCheckpoint({
    repository: fixture.repository,
    sourceMainSha: "f".repeat(40),
    coveredRecords: [
      {
        taskId: "0057",
        taskSha256: "1".repeat(64),
        testSha256: "2".repeat(64),
        taskStatus: "DONE",
        testStatus: "PASSED",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "3".repeat(40),
        mergeSha: "4".repeat(40),
        evidenceSha256: "5".repeat(64),
      },
    ],
  }).checkpoint;
  const coveredTask = task({ id: "0057" });
  const uncoveredTask = task({ id: "0058" });
  const selectedTask = task({ id: "0059", status: "READY" });
  let localDiscoveryCalls = 0;
  let collectionCalls = 0;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
    invocation: "$kyw-impl 0059",
    queueInspector: async () => ({
      tasks: [coveredTask, uncoveredTask, selectedTask],
      errors: [],
    }),
    continuityLoader: async ({ requiredTasks }) => {
      assert.deepEqual(requiredTasks.map(({ id }) => id), ["0057", "0058"]);
      return {
        checkpoint,
        partition: {
          coveredTasks: [coveredTask],
          uncoveredTasks: [uncoveredTask],
        },
        source: "ALIGNED_MAIN",
        identity: {
          repository: fixture.repository,
          repositoryRoot: REPOSITORY_ROOT,
          currentMainSha: "f".repeat(40),
          upstreamSha: "f".repeat(40),
          cachedMainSha: "f".repeat(40),
          directRemoteSha: "f".repeat(40),
          githubMainSha: "f".repeat(40),
          githubClient: {},
        },
      };
    },
    localDiscovery: async ({ requiredTasks, contractTasks }) => {
      localDiscoveryCalls += 1;
      assert.deepEqual(requiredTasks.map(({ id }) => id), ["0058"]);
      assert.deepEqual(contractTasks.map(({ id }) => id), ["0058"]);
      return {
        repository: fixture.repository,
        repositoryRoot: REPOSITORY_ROOT,
        currentMainSha: "f".repeat(40),
        upstreamSha: "f".repeat(40),
        cachedMainSha: "f".repeat(40),
        directRemoteSha: "f".repeat(40),
        contractAnchorSha: fixture.outcome.baseSha,
        outcomes: [fixture.outcome],
      };
    },
    deliveryCollector: async () => {
      collectionCalls += 1;
      return {
        deliveryLedger: { "0058": normalized.entry },
        deliveryExpectations: { "0058": normalized.expectation },
        classifications: { "0058": "HARDENED_EXACT_HEAD" },
        chronology: normalized.chronology,
        githubMainSha: "f".repeat(40),
      };
    },
    continuityRecordBuilder: async () => ({
      taskId: "0058",
      taskSha256: "6".repeat(64),
      testSha256: "7".repeat(64),
      taskStatus: "DONE",
      testStatus: "PASSED",
      classification: "HARDENED_EXACT_HEAD",
      outcomeSha: fixture.outcome.outcomeSha,
      mergeSha: fixture.outcome.mergeSha,
      evidenceSha256: "8".repeat(64),
    }),
  });
  assert.equal(localDiscoveryCalls, 1);
  assert.equal(collectionCalls, 1);
  assert.equal(hydrated.diagnostics.continuity.coveredTaskCount, 1);
  assert.deepEqual(hydrated.diagnostics.continuity.uncoveredTaskIds, ["0058"]);
  assert.equal(hydrated.diagnostics.continuity.freshEvidenceTaskCount, 1);
  assert.equal(hydrated.preparedCheckpoint.coverage.taskCount, 2);
  assert.equal(hydrated.preparedCheckpoint.coverage.lastTaskId, "0058");
  assert.equal(
    hydrated.preparedCheckpoint.previousCheckpointDigest,
    checkpoint.checkpointDigest,
  );
  assert.equal(
    evaluateDeliveryEvidence(
      "0058",
      hydrated.deliveryLedger["0058"],
      hydrated.deliveryExpectations["0058"],
    ).satisfied,
    true,
  );
});

function assertFixtureRejected(mutate, pattern) {
  const fixture = hardenedFixture();
  mutate(fixture);
  let message = "";
  try {
    const normalized = normalizeFixture(fixture);
    const evaluation = evaluateDeliveryEvidence(
      fixture.outcome.taskId,
      normalized.entry,
      normalized.expectation,
    );
    assert.equal(evaluation.satisfied, false);
    message = evaluation.issues.join("\n");
  } catch (error) {
    message = error.message;
  }
  assert.match(message, pattern);
  assert.match(message, /0058|actualHead|mergeCompatibility|postMerge/);
}

test("hardened normalization rejects stale, cross-attempt, role, job, and checkout evidence", () => {
  const mutations = [
    [
      (fixture) => {
        fixture.snapshot.pullRequest.head.sha = "e".repeat(40);
      },
      /Task 0058 PULL_REQUEST.*head SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequest.head.repo.full_name = "other/repository";
      },
      /Task 0058 PULL_REQUEST.*repository/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.path = ".github/workflows/other.yml";
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow path/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.workflowId = 72;
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow ID/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.name = "Other";
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow name/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.event = "push";
      },
      /Task 0058 PR_ACTUAL_HEAD.*event/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].runAttempt = 1;
      },
      /Task 0058 PR_ACTUAL_HEAD.*job run attempt/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].id = 0;
      },
      /Task 0058 PR_ACTUAL_HEAD.*job ID/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].name = "Other";
      },
      /Task 0058 PR_ACTUAL_HEAD.*Behavioral/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].evidence.job = "quality";
      },
      /Task 0058 PR_ACTUAL_HEAD.*job key/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].evidence.actual_sha = "e".repeat(40);
      },
      /Task 0058 PR_ACTUAL_HEAD.*actual checkout SHA/,
    ],
    [
      (fixture) => {
        delete fixture.snapshot.pullRequestJobs[0].evidence;
      },
      /Task 0058 PR_ACTUAL_HEAD.*checkout log evidence is missing/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs.splice(0, 1);
      },
      /Task 0058 PR_ACTUAL_HEAD.*Behavioral/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs.pop();
      },
      /Task 0058 PR_ACTUAL_HEAD.*Required/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeRun.id = 1001;
      },
      /Task 0058 POST_MERGE_MAIN.*distinct/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeRun.headSha = "e".repeat(40);
      },
      /Task 0058 POST_MERGE_MAIN.*run head SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequest.merge_commit_sha = "e".repeat(40);
      },
      /Task 0058 PULL_REQUEST.*merge SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.reviews.push({
          user: { login: "reviewer" },
          state: "CHANGES_REQUESTED",
          submitted_at: "2026-01-01T00:00:00Z",
        });
      },
      /Task 0058 PULL_REQUEST.*CHANGES_REQUESTED/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeJobs[0].id =
          fixture.snapshot.pullRequestJobs[0].id;
      },
      /reuse a job ID/,
    ],
  ];
  for (const [mutate, pattern] of mutations) assertFixtureRejected(mutate, pattern);
});

test("synthetic merge normalization requires one exact ordered base/head parent pair", () => {
  for (const parents of [
    [],
    ["a".repeat(40)],
    ["b".repeat(40), "a".repeat(40)],
    ["a".repeat(40), "b".repeat(40), "e".repeat(40)],
    ["e".repeat(40), "b".repeat(40)],
  ]) {
    assertFixtureRejected(
      (fixture) => {
        fixture.snapshot.syntheticCommit.parents = parents.map((sha) => ({ sha }));
      },
      /Task 0058 PR_MERGE_COMPATIBILITY.*exactly two ordered/,
    );
  }
});

test("invocation-local command cache deduplicates reads and redacts external failure detail", async () => {
  let calls = 0;
  const cache = createInvocationCommandCache({
    runner: () => {
      calls += 1;
      return { status: 0, stdout: "{\"ok\":true}", stderr: "" };
    },
  });
  const request = {
    command: "gh",
    args: ["api", "repos/owner/repository"],
    cwd: REPOSITORY_ROOT,
    taskId: "0058",
    role: "PULL_REQUEST",
  };
  await cache.run(request);
  await cache.run(request);
  assert.equal(calls, 1);
  assert.deepEqual(cache.stats(), {
    hits: 1,
    misses: 1,
    entries: 1,
    maxCommands: 512,
  });

  const failing = createInvocationCommandCache({
    runner: () => ({
      status: 1,
      stdout: "",
      stderr: "Bad credentials token=ghp_do_not_echo",
    }),
  });
  await assert.rejects(
    failing.run(request),
    (error) =>
      /authentication failure/.test(error.message) &&
      !error.message.includes("ghp_do_not_echo"),
  );
});

test("GitHub adapter fails closed on malformed JSON and partial pagination", async () => {
  const malformedCache = createInvocationCommandCache({
    runner: () => ({ status: 0, stdout: "{", stderr: "" }),
  });
  const malformed = createGitHubEvidenceClient({
    repository: "owner/repository",
    repositoryRoot: REPOSITORY_ROOT,
    commandCache: malformedCache,
  });
  await assert.rejects(
    malformed.getWorkflow({ taskId: "0058", role: "GITHUB_WORKFLOW" }),
    /Task 0058 GITHUB_WORKFLOW.*malformed JSON/,
  );

  const partialCache = createInvocationCommandCache({
    runner: () => ({
      status: 0,
      stdout: JSON.stringify({ total_count: 2, workflow_runs: [{ id: 1 }] }),
      stderr: "",
    }),
  });
  const partial = createGitHubEvidenceClient({
    repository: "owner/repository",
    repositoryRoot: REPOSITORY_ROOT,
    commandCache: partialCache,
  });
  await assert.rejects(
    partial.listRuns(71, { event: "push" }, {
      taskId: "0058",
      role: "POST_MAIN_RUNS",
    }),
    /partial, malformed, or exceeds bound/,
  );
});

test("external command failure classes never expose raw GitHub diagnostics", async () => {
  for (const [stderr, pattern] of [
    ["gh is not logged into any GitHub hosts token=secret", /authentication failure/],
    ["API rate limit exceeded header=secret", /rate limit/],
    ["Resource not accessible by integration header=secret", /authorization failure/],
  ]) {
    const cache = createInvocationCommandCache({
      runner: () => ({ status: 1, stdout: "", stderr }),
    });
    await assert.rejects(
      cache.run({
        command: "gh",
        args: ["api", "repos/owner/repository"],
        cwd: REPOSITORY_ROOT,
        taskId: "0058",
        role: "GITHUB",
      }),
      (error) => pattern.test(error.message) && !error.message.includes("secret"),
    );
  }
  const timeout = createInvocationCommandCache({
    runner: () => ({
      status: null,
      stdout: "",
      stderr: "",
      error: Object.assign(new Error("timed out token=secret"), {
        code: "ETIMEDOUT",
      }),
    }),
  });
  await assert.rejects(
    timeout.run({
      command: "gh",
      args: ["api", "repos/owner/repository"],
      cwd: REPOSITORY_ROOT,
      taskId: "0058",
      role: "GITHUB",
    }),
    (error) => /timeout/.test(error.message) && !error.message.includes("secret"),
  );
});

test("no-prior hydration performs no local Git or GitHub collection", async () => {
  let localCalls = 0;
  const result = await hydratePriorStandardDeliveries({
    tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
    invocation: "$kyw-impl 0001",
    allowUncheckpointedCompatibility: true,
    queueInspector: async () => ({
      tasks: [task({ id: "0001", status: "READY" })],
      errors: [],
    }),
    localDiscovery: async () => {
      localCalls += 1;
      throw new Error("must not be called");
    },
  });
  assert.equal(localCalls, 0);
  assert.deepEqual(result.diagnostics.requiredTaskIds, []);
  assert.deepEqual(result.deliveryLedger, {});
});

test("an old exact Task derives the legacy anchor from all completed STANDARD contracts", async () => {
  await assert.rejects(
    hydratePriorStandardDeliveries({
      tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
      invocation: "$kyw-impl 0030",
      allowUncheckpointedCompatibility: true,
      queueInspector: async () => ({
        tasks: [
          task({ id: "0030" }),
          task({ id: "0054" }),
          task({ id: "0059", status: "READY" }),
        ],
        errors: [],
      }),
      localDiscovery: async ({ requiredTasks, contractTasks }) => {
        assert.deepEqual(requiredTasks.map(({ id }) => id), ["0030"]);
        assert.deepEqual(contractTasks.map(({ id }) => id), ["0030", "0054"]);
        throw new Error("anchor planning observed");
      },
    }),
    /anchor planning observed/,
  );
});

test("normal adapter hydrates before one dispatcher call and failure invokes none", async () => {
  const argumentsList = [
    "dispatch",
    "--tasks-root",
    path.join(REPOSITORY_ROOT, "docs", "tasks"),
    "--invocation",
    "$kyw-impl 0059",
    "--managed-routing",
    "false",
  ];
  const events = [];
  const success = await runTaskArtifactCommand(argumentsList, {
    hydratePriorStandardDeliveries: async () => {
      events.push("hydrate");
      return {
        deliveryLedger: {},
        deliveryExpectations: {},
        diagnostics: { requiredTaskIds: [] },
      };
    },
    resolveTaskDispatch: async () => {
      events.push("dispatch");
      return {
        outcome: "SELECTED",
        action: "IMPLEMENT",
        task: { id: "0059" },
      };
    },
  });
  assert.deepEqual(events, ["hydrate", "dispatch"]);
  assert.equal(success.outcome, "SELECTED");

  let dispatchCalls = 0;
  await assert.rejects(
    runTaskArtifactCommand(argumentsList, {
      hydratePriorStandardDeliveries: async () => {
        throw new Error("Task 0058 POST_MERGE_MAIN: timeout");
      },
      resolveTaskDispatch: async () => {
        dispatchCalls += 1;
      },
    }),
    /POST_MERGE_MAIN: timeout/,
  );
  assert.equal(dispatchCalls, 0);
});

test("manual delivery objects remain a low-level seam and bypass automatic hydration", async () => {
  let hydrationCalls = 0;
  let dispatchCalls = 0;
  await runTaskArtifactCommand(
    [
      "dispatch",
      "--tasks-root",
      path.join(REPOSITORY_ROOT, "docs", "tasks"),
      "--invocation",
      "$kyw-impl 0059",
      "--managed-routing",
      "false",
      "--delivery-ledger-json",
      "{}",
      "--delivery-expectations-json",
      "{}",
    ],
    {
      hydratePriorStandardDeliveries: async () => {
        hydrationCalls += 1;
      },
      resolveTaskDispatch: async () => {
        dispatchCalls += 1;
        return { outcome: "BLOCKED" };
      },
    },
  );
  assert.equal(hydrationCalls, 0);
  assert.equal(dispatchCalls, 1);
});

test(
  "live repository and GitHub hydration recovers the queue-required hardened chain",
  { skip: process.env.KYW_LIVE_GITHUB_HYDRATION !== "1" },
  async () => {
    const hydrated = await hydratePriorStandardDeliveries({
      tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
      invocation: "$kyw-impl 0059",
    });
    const terminalInvocation = Boolean(hydrated.deliveryLedger["0059"]);
    const hardenedTaskIds = terminalInvocation
      ? ["0057", "0058", "0059"]
      : ["0054", "0055", "0056", "0057", "0058"];
    assert.equal(hydrated.diagnostics.requiredTaskIds.length, terminalInvocation ? 3 : 28);
    for (const taskId of hardenedTaskIds) {
      assert.equal(
        hydrated.diagnostics.classifications[taskId],
        "HARDENED_EXACT_HEAD",
      );
      assert.equal(
        evaluateDeliveryEvidence(
          taskId,
          hydrated.deliveryLedger[taskId],
          hydrated.deliveryExpectations[taskId],
        ).satisfied,
        true,
      );
    }
    if (!terminalInvocation) {
      assert.equal(
        hydrated.diagnostics.chronology.some(
          (entry) =>
            entry.taskId === "0055" &&
            entry.role === "POST_MAIN_ATTEMPT" &&
            entry.runAttempt === 1 &&
            entry.conclusion === "failure",
        ),
        true,
      );
    }
  },
);
