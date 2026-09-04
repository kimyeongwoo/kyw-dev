import assert from "node:assert/strict";
import {
  mkdir,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as taskArtifactsFacade from "../src/core/task-artifacts.mjs";
import {
  MAX_TASK_SLUG_LENGTH,
  allocateNextTaskId,
  buildTaskDirectoryName,
  createTaskArtifactBatch,
  createTaskArtifacts,
  deriveTaskKey,
  inspectTaskBatchTransaction,
  inspectTaskDirectories,
  inspectTaskQueue,
  normalizeTaskTitle,
  recoverTaskBatchTransaction,
  resolveTaskDirectory,
  slugifyTaskTitle,
  validateTaskDirectory,
} from "../src/core/task-artifacts.mjs";

const fixturesRoot = fileURLToPath(new URL("./fixtures/task-repositories/", import.meta.url));
const coreRoot = fileURLToPath(new URL("../src/core/", import.meta.url));

test("task artifact facade preserves its public export inventory", () => {
  assert.deepEqual(Object.keys(taskArtifactsFacade), [
    "ALL_TASKS_COMPLETE_MESSAGE",
    "MAX_STANDARD_DELIVERY_CONTINUITY_BYTES",
    "MAX_STANDARD_DELIVERY_CONTINUITY_TASKS",
    "MAX_TASK_BATCH_PAYLOAD_BYTES",
    "MAX_TASK_NUMBER",
    "MAX_TASK_SLUG_LENGTH",
    "PUBLIC_RELEASE_ATTEMPT_SCOPE",
    "PUBLIC_RELEASE_CLASSIFICATIONS",
    "PUBLIC_RELEASE_STAGES",
    "STANDARD_DELIVERY_CONTINUITY_FILE",
    "STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH",
    "TaskArtifactError",
    "allocateNextTaskId",
    "allocateNextTaskNumber",
    "applyStandardDeliveryContinuityTransition",
    "bootstrapStandardDeliveryContinuity",
    "buildStandardDeliveryContinuityState",
    "buildTaskDirectoryName",
    "classifyDeliveryEvidence",
    "classifyLocalDeliveryContracts",
    "classifyPublicReleaseState",
    "createCanonicalPublicReleaseProof",
    "createGitHubEvidenceClient",
    "createInvocationCommandCache",
    "createPublicReleaseClients",
    "createStandardDeliveryContinuityCheckpoint",
    "createStandardDeliveryContinuityTransitionToken",
    "createTaskArtifactBatch",
    "createTaskArtifacts",
    "createTaskSlug",
    "derivePublicReleasePlan",
    "deriveTaskKey",
    "digestStandardDeliveryContinuityEvidence",
    "digestStandardDeliveryContinuityTerminalPairs",
    "discoverLocalDeliveryOutcomes",
    "discoverRequiredStandardDeliveries",
    "evaluateDeliveryEvidence",
    "evaluateTaskExecutionPreflight",
    "formatTaskId",
    "freezePublicReleaseTuple",
    "hydratePriorStandardDeliveries",
    "hydratePublicReleaseContext",
    "inspectTaskBatchTransaction",
    "inspectTaskDirectories",
    "inspectTaskQueue",
    "loadTrustedStandardDeliveryContinuity",
    "normalizeHardenedDeliveryEvidence",
    "normalizeLegacyDeliveryEvidence",
    "normalizeTaskTitle",
    "parseHardenedWorkflowContract",
    "parseKywCiEvidence",
    "parsePublicReleaseInvocation",
    "parseStandardDeliveryContinuityCheckpoint",
    "parseStandardDeliveryContinuityTransitionToken",
    "parseTaskDirectoryName",
    "parseTaskInvocation",
    "partitionStandardDeliveryContinuity",
    "recoverTaskBatchTransaction",
    "redactPublicReleaseDiagnostics",
    "resolveTaskDirectory",
    "resolveTaskDispatch",
    "runPublicRelease",
    "slugifyTaskTitle",
    "validateTaskDirectory",
    "writeStandardDeliveryContinuityCheckpoint",
  ]);
});

test("task artifact modules keep the intended acyclic dependency graph", async () => {
  const expectedGraph = new Map([
    ["task-artifact-contract.mjs", ["task-artifact-shared.mjs"]],
    [
      "task-artifact-creation.mjs",
      ["task-artifact-contract.mjs", "task-artifact-queue.mjs", "task-artifact-shared.mjs"],
    ],
    ["task-artifact-delivery.mjs", ["task-artifact-public-release.mjs"]],
    [
      "task-artifact-continuity.mjs",
      ["task-artifact-shared.mjs"],
    ],
    [
      "task-artifact-hydration.mjs",
      [
        "task-artifact-continuity.mjs",
        "task-artifact-delivery.mjs",
        "task-artifact-public-release.mjs",
        "task-artifact-queue.mjs",
        "task-artifact-shared.mjs",
      ],
    ],
    [
      "task-artifact-queue.mjs",
      ["task-artifact-contract.mjs", "task-artifact-delivery.mjs", "task-artifact-shared.mjs"],
    ],
    ["task-artifact-public-release.mjs", []],
    ["task-artifact-shared.mjs", []],
    [
      "task-artifacts.mjs",
      [
        "task-artifact-contract.mjs",
        "task-artifact-continuity.mjs",
        "task-artifact-creation.mjs",
        "task-artifact-delivery.mjs",
        "task-artifact-hydration.mjs",
        "task-artifact-public-release.mjs",
        "task-artifact-queue.mjs",
        "task-artifact-shared.mjs",
      ],
    ],
  ]);
  const actualGraph = new Map();

  await Promise.all(
    [...expectedGraph].map(async ([fileName, expectedDependencies]) => {
      const source = await readFile(path.join(coreRoot, fileName), "utf8");
      const actualDependencies = [
        ...source.matchAll(/\bfrom\s+"\.\/(task-artifact(?:s|-[a-z-]+)\.mjs)"/g),
      ]
        .map((match) => match[1])
        .sort();
      actualGraph.set(fileName, actualDependencies);
      assert.deepEqual(actualDependencies, [...expectedDependencies].sort(), fileName);
    }),
  );

  const visiting = new Set();
  const visited = new Set();
  function visit(fileName) {
    assert.ok(!visiting.has(fileName), `task artifact dependency cycle reaches ${fileName}`);
    if (visited.has(fileName)) {
      return;
    }
    visiting.add(fileName);
    for (const dependency of actualGraph.get(fileName)) {
      visit(dependency);
    }
    visiting.delete(fileName);
    visited.add(fileName);
  }

  for (const fileName of actualGraph.keys()) {
    visit(fileName);
  }
});

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "kyw-dev-task0002-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function fixtureTasks(name) {
  return path.join(fixturesRoot, name, "docs", "tasks");
}

function readyBatchTaskMarkdown() {
  return `# TASK {{TASK_ID}} — {{TASK_TITLE}}

<!-- kyw-task-contract: 3 -->

## Status

READY

## Goal

Deliver one independently verifiable batch-authored outcome.

## Dependencies

{{TASK_DEPENDENCIES}}

## In Scope

- Implement the named outcome.

## Out of Scope

- Do not implement another Task.

## Acceptance Criteria

- [ ] AC-01: The named outcome is independently verified.

## Plan

- [ ] Implement and verify the outcome.

## Decisions

- Use the smallest compatible design.

## Risks

- Preserve existing behavior while adding the outcome.

## Discoveries and Changes

- Not applicable — implementation has not started.

## Documentation Impact

- SPEC: Review after implementation.
- ARCHITECTURE: Review after implementation.
- README: Review after implementation.
- AGENTS: Review after implementation.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Not applicable — implementation has not started.

## Remaining

- Implement and verify the outcome.

## Resume Point

- Begin with the scoped implementation.

## Blockers

- Not applicable — no blocker is known.
`;
}

function readyBatchTestMarkdown() {
  return `# TEST {{TASK_ID}} — {{TASK_TITLE}}

<!-- kyw-task-contract: 3 -->

## Status

READY

## Test Basis

- Task: \`./TASK.md\`
- Product requirements: \`../../SPEC.md\`
- Architecture constraints: \`../../ARCHITECTURE.md\`

## Model Provenance

- Model identifier: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Requested model alias: \`NOT_REQUESTED\` (\`OBSERVED\`: no override was requested)
- Reasoning effort: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Codex surface: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Codex version: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Independently verified outcome | Run the focused acceptance check. | Integration | TODO | Not run — newly authored pair. |

## Regression Coverage

- Preserve existing behavior around the named outcome.

## Commands

- Planned: focused acceptance and required regressions.

## Results

- Not applicable — verification has not run.

## Unverified

- Not applicable — no residual risk is recorded yet.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [ ] Confirm PASS evidence is reproducible.
- [ ] Confirm required regressions ran.
`;
}

function batchDefinition(key, title, dependencies = []) {
  return {
    key,
    title,
    taskMarkdown: readyBatchTaskMarkdown(),
    testMarkdown: readyBatchTestMarkdown(),
    dependencies,
  };
}

test("task number allocation starts at 0001 and advances beyond normal and gapped fixtures", async (t) => {
  assert.equal(await allocateNextTaskId(fixtureTasks("empty")), "0001");
  assert.equal(await allocateNextTaskId(fixtureTasks("normal")), "0002");
  assert.equal(await allocateNextTaskId(fixtureTasks("gapped")), "0004");

  const sequential = path.join(await temporaryDirectory(t), "tasks");
  await mkdir(path.join(sequential, "0001-first"), { recursive: true });
  await mkdir(path.join(sequential, "0002-second"));
  assert.equal(await allocateNextTaskId(sequential), "0003");

  const exhausted = path.join(await temporaryDirectory(t), "tasks");
  await mkdir(path.join(exhausted, "9999-last-task"), { recursive: true });
  await assert.rejects(
    allocateNextTaskId(exhausted),
    (error) => error.code === "TASK_ID_EXHAUSTED" && /9999/.test(error.message),
  );
});

test("task number inventory diagnoses malformed and duplicate-ID repositories", async () => {
  const malformed = await inspectTaskDirectories(fixtureTasks("malformed"));
  assert.ok(malformed.malformed.some((message) => message.includes("not-a-task")));
  await assert.rejects(
    allocateNextTaskId(fixtureTasks("malformed")),
    (error) => error.code === "INVALID_TASK_LAYOUT" && /not-a-task/.test(error.message),
  );

  const conflicting = await inspectTaskDirectories(fixtureTasks("conflicting"));
  assert.deepEqual(conflicting.conflicts.map(({ id }) => id), ["0001"]);
  await assert.rejects(
    allocateNextTaskId(fixtureTasks("conflicting")),
    (error) => error.code === "INVALID_TASK_LAYOUT" && /0001-alpha, 0001-beta/.test(error.message),
  );
});

test("task slug generation is bounded, ASCII-safe, and deterministic for Unicode fallback", () => {
  assert.equal(deriveTaskKey("Crème brûlée API"), "creme-brulee-api-66716e2d");
  assert.equal(slugifyTaskTitle("Crème brûlée API"), deriveTaskKey("Crème brûlée API"));
  assert.equal(slugifyTaskTitle("../../escape"), "escape");
  assert.equal(slugifyTaskTitle("C:\\temp\\CON"), "c-temp-con");
  assert.equal(normalizeTaskTitle("  line one\nline two  "), "line one line two");

  const korean = slugifyTaskTitle("템플릿 계약");
  assert.match(korean, /^task-[a-f0-9]{8}$/);
  assert.equal(slugifyTaskTitle("템플릿 계약"), korean);

  const longSlug = slugifyTaskTitle("word ".repeat(30));
  assert.ok(longSlug.length <= MAX_TASK_SLUG_LENGTH);
  assert.match(longSlug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.throws(() => normalizeTaskTitle(" \n\t "), (error) => error.code === "EMPTY_TASK_TITLE");
});

test("task paths remain direct children with POSIX and Windows path dialects", () => {
  assert.equal(
    resolveTaskDirectory("/repo/docs/tasks", "0007", "safe-title", path.posix),
    "/repo/docs/tasks/0007-safe-title",
  );
  assert.equal(
    resolveTaskDirectory("C:\\repo\\docs\\tasks", 7, "safe-title", path.win32),
    "C:\\repo\\docs\\tasks\\0007-safe-title",
  );
  assert.equal(buildTaskDirectoryName(12, "cross-platform"), "0012-cross-platform");
  assert.throws(
    () => resolveTaskDirectory("/repo/docs/tasks", 1, "../escape", path.posix),
    (error) => error.code === "INVALID_TASK_SLUG",
  );
  assert.throws(
    () => buildTaskDirectoryName(1, "absolute/path"),
    (error) => error.code === "INVALID_TASK_SLUG",
  );
});

test("atomic task creation publishes TASK.md and TEST.md together", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  const created = await createTaskArtifacts({ tasksRoot, title: "템플릿 계약" });

  assert.equal(created.id, "0001");
  assert.match(created.slug, /^task-[a-f0-9]{8}$/);
  assert.deepEqual(await readdir(tasksRoot), [path.basename(created.directory)]);
  const taskMarkdown = await readFile(created.taskPath, "utf8");
  const testMarkdown = await readFile(created.testPath, "utf8");
  assert.match(taskMarkdown, /^# TASK 0001 — 템플릿 계약/m);
  assert.match(testMarkdown, /^# TEST 0001 — 템플릿 계약/m);
  assert.match(taskMarkdown, /<!-- kyw-task-contract: 3 -->/);
  assert.match(testMarkdown, /<!-- kyw-task-contract: 3 -->/);
  assert.match(taskMarkdown, /^## Delivery$/m);
  assert.deepEqual(await validateTaskDirectory(created.directory), []);

  const second = await createTaskArtifacts({ tasksRoot, title: "Second task" });
  assert.equal(second.id, "0002");
});

test("pair validation enforces canonical open dependencies and reads completed history", async (t) => {
  const temporaryRoot = await temporaryDirectory(t);
  const readyFixture = path.join(
    fixturesRoot,
    "ergonomics",
    "0101-standard-task",
  );
  const invalidDirectory = path.join(temporaryRoot, "0101-invalid-dependencies");
  await mkdir(invalidDirectory);
  const invalidTask = (
    await readFile(path.join(readyFixture, "TASK.md"), "utf8")
  ).replace(
    "- Not applicable — no hard dependency is required for this outcome.",
    "- This Task does not depend on Task 9999.",
  );
  await Promise.all([
    writeFile(path.join(invalidDirectory, "TASK.md"), invalidTask, "utf8"),
    writeFile(
      path.join(invalidDirectory, "TEST.md"),
      await readFile(path.join(readyFixture, "TEST.md"), "utf8"),
      "utf8",
    ),
  ]);
  assert.match(
    (await validateTaskDirectory(invalidDirectory)).join("\n"),
    /Dependencies line 1 must be exactly/,
  );

  const completedHistory = path.join(
    fixturesRoot,
    "ergonomics",
    "0102-documentation-only",
  );
  assert.deepEqual(await validateTaskDirectory(completedHistory), []);
});

test("atomic task creation removes staged partial files after injected failure", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  await assert.rejects(
    createTaskArtifacts({
      tasksRoot,
      title: "Injected failure",
      hooks: {
        afterTaskWrite() {
          throw new Error("injected between writes");
        },
      },
    }),
    (error) => error.code === "TASK_CREATION_FAILED" && /injected between writes/.test(error.message),
  );
  assert.deepEqual(await readdir(tasksRoot), []);
});

test("atomic task creation preserves a conflicting final directory without partial artifacts", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  let conflictingDirectory;
  await assert.rejects(
    createTaskArtifacts({
      tasksRoot,
      title: "Conflict",
      hooks: {
        async afterTaskWrite({ id, slug }) {
          conflictingDirectory = path.join(tasksRoot, `${id}-${slug}`);
          await mkdir(conflictingDirectory);
        },
      },
    }),
    (error) => error.code === "TASK_CREATION_CONFLICT",
  );
  assert.deepEqual(await readdir(conflictingDirectory), []);
  assert.deepEqual(await readdir(tasksRoot), [path.basename(conflictingDirectory)]);
});

test("task creation rejects a symlinked tasks root", async (t) => {
  const temporaryRoot = await temporaryDirectory(t);
  const realRoot = path.join(temporaryRoot, "real-tasks");
  const linkedRoot = path.join(temporaryRoot, "linked-tasks");
  await mkdir(realRoot);
  try {
    await symlink(realRoot, linkedRoot, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
      t.skip(`symlink creation is unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    createTaskArtifacts({ tasksRoot: linkedRoot, title: "Unsafe root" }),
    (error) => error.code === "SYMLINK_TASK_ROOT",
  );
  assert.deepEqual(await readdir(realRoot), []);
});

test("atomic batch creation preallocates and publishes complete READY dependency-aware pairs", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  const created = await createTaskArtifactBatch({
    tasksRoot,
    tasks: [
      batchDefinition("foundation", "Foundation"),
      batchDefinition("dependent", "Dependent", [{ taskKey: "foundation" }]),
    ],
  });

  assert.equal(created.firstId, "0001");
  assert.equal(created.lastId, "0002");
  assert.deepEqual(
    created.tasks.map(({ key, id, dependencies }) => ({ key, id, dependencies })),
    [
      { key: "foundation", id: "0001", dependencies: [] },
      { key: "dependent", id: "0002", dependencies: ["0001"] },
    ],
  );
  assert.deepEqual(await readdir(tasksRoot), ["0001-foundation", "0002-dependent"]);
  for (const task of created.tasks) {
    assert.deepEqual(await validateTaskDirectory(task.directory), []);
    assert.match(await readFile(task.taskPath, "utf8"), /## Status\n\nREADY/);
    assert.match(await readFile(task.testPath, "utf8"), /## Status\n\nREADY/);
  }
  assert.match(await readFile(created.tasks[1].taskPath, "utf8"), /- Task 0001\./);
});

test("atomic batch creation accepts existing dependencies and keeps the legacy scaffold helper", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  const legacy = await createTaskArtifacts({ tasksRoot, title: "Existing scaffold" });
  const created = await createTaskArtifactBatch({
    tasksRoot,
    tasks: [
      batchDefinition("ready-outcome", "Ready outcome", [{ taskId: legacy.id }]),
    ],
  });

  assert.equal(legacy.id, "0001");
  assert.equal(created.firstId, "0002");
  assert.deepEqual(created.tasks[0].dependencies, ["0001"]);
  assert.match(await readFile(legacy.taskPath, "utf8"), /## Status\n\nDRAFT/);
  assert.match(await readFile(created.tasks[0].taskPath, "utf8"), /- Task 0001\./);
});

test("atomic batch creation rejects invalid pairs, missing dependencies, cycles, and exhaustion before publication", async (t) => {
  const invalidRoot = path.join(await temporaryDirectory(t), "invalid", "tasks");
  const invalidPair = batchDefinition("invalid-pair", "Invalid pair");
  invalidPair.testMarkdown = invalidPair.testMarkdown.replace("\nREADY\n", "\nDRAFT\n");
  await assert.rejects(
    createTaskArtifactBatch({ tasksRoot: invalidRoot, tasks: [invalidPair] }),
    (error) => error.code === "INVALID_TASK_BATCH_PAIR",
  );
  await assert.rejects(
    readdir(invalidRoot),
    (error) => error.code === "ENOENT",
  );

  const misplacedTokenRoot = path.join(
    await temporaryDirectory(t),
    "misplaced-token",
    "tasks",
  );
  const misplacedToken = batchDefinition("misplaced-token", "Misplaced token");
  misplacedToken.taskMarkdown = misplacedToken.taskMarkdown.replace(
    "## Dependencies\n\n{{TASK_DEPENDENCIES}}",
    "## Dependencies\n\n- Not applicable — declared dependencies are missing.\n\n## Token Copy\n\n{{TASK_DEPENDENCIES}}",
  );
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: misplacedTokenRoot,
      tasks: [misplacedToken],
    }),
    (error) => error.code === "INVALID_TASK_BATCH",
  );
  await assert.rejects(
    readdir(misplacedTokenRoot),
    (error) => error.code === "ENOENT",
  );

  const missingRoot = path.join(await temporaryDirectory(t), "missing", "tasks");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: missingRoot,
      tasks: [
        batchDefinition("missing-edge", "Missing edge", [{ taskKey: "not-created" }]),
      ],
    }),
    (error) => error.code === "MISSING_TASK_DEPENDENCY",
  );
  await assert.rejects(
    readdir(missingRoot),
    (error) => error.code === "ENOENT",
  );

  const cycleRoot = path.join(await temporaryDirectory(t), "cycle", "tasks");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: cycleRoot,
      tasks: [
        batchDefinition("cycle-a", "Cycle A", [{ taskKey: "cycle-b" }]),
        batchDefinition("cycle-b", "Cycle B", [{ taskKey: "cycle-a" }]),
      ],
    }),
    (error) => error.code === "TASK_DEPENDENCY_CYCLE",
  );
  await assert.rejects(
    readdir(cycleRoot),
    (error) => error.code === "ENOENT",
  );

  const exhaustedRoot = path.join(await temporaryDirectory(t), "exhausted", "tasks");
  const exhaustedDirectory = path.join(exhaustedRoot, "9999-last");
  await mkdir(exhaustedDirectory, { recursive: true });
  const exhaustedValues = [
    ["{{TASK_ID}}", "9999"],
    ["{{TASK_TITLE}}", "Last"],
    [
      "{{TASK_DEPENDENCIES}}",
      "- Not applicable — no hard dependency is required for this outcome.",
    ],
  ];
  let exhaustedTask = readyBatchTaskMarkdown();
  let exhaustedTest = readyBatchTestMarkdown();
  for (const [token, value] of exhaustedValues) {
    exhaustedTask = exhaustedTask.replaceAll(token, value);
    exhaustedTest = exhaustedTest.replaceAll(token, value);
  }
  await Promise.all([
    writeFile(path.join(exhaustedDirectory, "TASK.md"), exhaustedTask, "utf8"),
    writeFile(path.join(exhaustedDirectory, "TEST.md"), exhaustedTest, "utf8"),
  ]);
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: exhaustedRoot,
      tasks: [batchDefinition("too-late", "Too late")],
    }),
    (error) => error.code === "TASK_ID_EXHAUSTED",
  );
  assert.deepEqual(await readdir(exhaustedRoot), ["9999-last"]);
});

test("atomic batch creation rolls back hidden writes and published prefixes after injected failure", async (t) => {
  const stagedRoot = path.join(await temporaryDirectory(t), "staged", "tasks");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: stagedRoot,
      tasks: [
        batchDefinition("first", "First"),
        batchDefinition("second", "Second"),
      ],
      hooks: {
        afterPairWrite({ index }) {
          if (index === 0) {
            throw new Error("injected staged failure");
          }
        },
      },
    }),
    (error) =>
      error.code === "TASK_BATCH_CREATION_FAILED" &&
      /injected staged failure/.test(error.message),
  );
  assert.deepEqual(await readdir(stagedRoot), []);

  for (const failureIndex of [0, 1]) {
    const publishedRoot = path.join(
      await temporaryDirectory(t),
      `published-${failureIndex}`,
      "tasks",
    );
    await assert.rejects(
      createTaskArtifactBatch({
        tasksRoot: publishedRoot,
        tasks: [
          batchDefinition("first", "First"),
          batchDefinition("second", "Second"),
        ],
        hooks: {
          afterDirectoryPublish({ index }) {
            if (index === failureIndex) {
              throw new Error("injected publication failure");
            }
          },
        },
      }),
      (error) =>
        error.code === "TASK_BATCH_CREATION_FAILED" &&
        /injected publication failure/.test(error.message),
    );
    assert.deepEqual(await readdir(publishedRoot), []);
  }
});

test("creation lock blocks batch creation and canonical queue inspection", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  await mkdir(tasksRoot, { recursive: true });
  await writeFile(path.join(tasksRoot, ".kyw-dev-task-create.lock"), "owned lock", "utf8");

  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot,
      tasks: [batchDefinition("locked", "Locked")],
    }),
    (error) => error.code === "TASK_CREATION_LOCKED",
  );
  const queue = await inspectTaskQueue(tasksRoot);
  assert.match(queue.errors.join("\n"), /Task queue creation is locked/);
  assert.deepEqual(await readdir(tasksRoot), [".kyw-dev-task-create.lock"]);
});

test("batch allocation race preserves the competing directory and publishes no batch-owned prefix", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot,
      tasks: [
        batchDefinition("first", "First"),
        batchDefinition("second", "Second"),
      ],
      hooks: {
        async afterAllocation({ tasks }) {
          await mkdir(tasks[0].directory);
        },
      },
    }),
    (error) => error.code === "TASK_CREATION_CONFLICT",
  );
  assert.deepEqual(await readdir(tasksRoot), ["0001-first"]);
  assert.deepEqual(await readdir(path.join(tasksRoot, "0001-first")), []);
});

test("batch transaction lock identity is versioned and a replacement lock is never unlinked", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  const lockPath = path.join(tasksRoot, ".kyw-dev-task-create.lock");
  const displacedPath = path.join(tasksRoot, "displaced-owned-lock");
  const replacement = "foreign replacement lock\n";

  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot,
      tasks: [batchDefinition("owned", "Owned")],
      hooks: {
        async afterLock() {
          await rename(lockPath, displacedPath);
          await writeFile(lockPath, replacement, "utf8");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );

  assert.equal(await readFile(lockPath, "utf8"), replacement);
  const initialRecord = JSON.parse(
    (await readFile(displacedPath, "utf8")).trim().split("\n")[0],
  );
  assert.equal(initialRecord.schemaVersion, 1);
  assert.equal(initialRecord.kind, "kyw-task-batch-transaction");
  assert.match(initialRecord.token, /^[a-f0-9]{32}$/);
  assert.deepEqual(await readdir(tasksRoot), [
    ".kyw-dev-task-create.lock",
    "displaced-owned-lock",
  ]);
  const diagnostic = await inspectTaskBatchTransaction({ tasksRoot });
  assert.equal(diagnostic.state, "BLOCKED");
  assert.equal(diagnostic.category, "TASK_BATCH_MANIFEST_INVALID");
});

test("batch transaction revalidates dependency bytes and final targets under the held lock", async (t) => {
  const dependencyRoot = path.join(
    await temporaryDirectory(t),
    "dependency",
    "docs",
    "tasks",
  );
  const dependency = await createTaskArtifacts({
    tasksRoot: dependencyRoot,
    title: "Dependency",
  });
  const dependencyTask = await readFile(dependency.taskPath, "utf8");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: dependencyRoot,
      tasks: [
        batchDefinition("dependent", "Dependent", [{ taskId: dependency.id }]),
      ],
      hooks: {
        async afterLock() {
          await writeFile(
            dependency.taskPath,
            `${dependencyTask}\n<!-- post-lock drift -->\n`,
            "utf8",
          );
        },
      },
    }),
    (error) => error.code === "TASK_CREATION_CONFLICT",
  );
  assert.deepEqual(await readdir(dependencyRoot), ["0001-dependency"]);
  assert.match(await readFile(dependency.taskPath, "utf8"), /post-lock drift/);

  const targetRoot = path.join(
    await temporaryDirectory(t),
    "target",
    "docs",
    "tasks",
  );
  let foreignTarget;
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: targetRoot,
      tasks: [batchDefinition("target", "Target")],
      hooks: {
        async beforePublish({ tasks }) {
          foreignTarget = tasks[0].directory;
          await mkdir(foreignTarget);
        },
      },
    }),
    (error) => error.code === "TASK_CREATION_CONFLICT",
  );
  assert.deepEqual(await readdir(targetRoot), ["0001-target"]);
  assert.deepEqual(await readdir(foreignTarget), []);

  const immediateRoot = path.join(
    await temporaryDirectory(t),
    "immediate-target",
    "docs",
    "tasks",
  );
  let immediateTarget;
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: immediateRoot,
      tasks: [batchDefinition("immediate", "Immediate")],
      hooks: {
        async beforeDirectoryPublish({ task }) {
          immediateTarget = task.directory;
          await mkdir(immediateTarget);
          await writeFile(
            path.join(immediateTarget, "foreign-user-file.txt"),
            "never overwrite\n",
            "utf8",
          );
        },
      },
    }),
    (error) => error.code === "TASK_CREATION_CONFLICT",
  );
  assert.deepEqual(await readdir(immediateRoot), ["0001-immediate"]);
  assert.equal(
    await readFile(path.join(immediateTarget, "foreign-user-file.txt"), "utf8"),
    "never overwrite\n",
  );
});

test("unproven rollback content remains byte-preserved and diagnostics stay bounded and relative", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  let extraPath;
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot,
      tasks: [
        batchDefinition("first", "First"),
        batchDefinition("second", "Second"),
      ],
      hooks: {
        async afterDirectoryPublish({ task, index }) {
          if (index === 0) {
            extraPath = path.join(task.directory, "unknown-user-file.txt");
            await writeFile(extraPath, "preserve me\n", "utf8");
            throw new Error("stop after foreign content injection");
          }
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );

  const rootEntries = await readdir(tasksRoot);
  const stageName = rootEntries.find((name) =>
    name.startsWith(".kyw-dev-task-batch-"),
  );
  const lockPath = path.join(tasksRoot, ".kyw-dev-task-create.lock");
  const journalBefore = await readFile(lockPath);
  const extraBefore = await readFile(extraPath);
  const stageTaskBefore = await readFile(
    path.join(tasksRoot, stageName, "0002-second", "TASK.md"),
  );
  const initial = JSON.parse(journalBefore.toString("utf8").split("\n")[0]);

  const diagnostic = await inspectTaskBatchTransaction({ tasksRoot });
  const serializedDiagnostic = JSON.stringify(diagnostic);
  assert.equal(diagnostic.state, "RECOVERY_REQUIRED");
  assert.equal(diagnostic.phase, "PUBLISHING");
  assert.ok(
    diagnostic.observations.some(
      (observation) => observation.category === "UNPROVEN_CONTENT",
    ),
  );
  assert.equal(serializedDiagnostic.includes(tasksRoot), false);
  assert.equal(serializedDiagnostic.includes(initial.token), false);
  assert.equal(diagnostic.tokenPrefix, initial.token.slice(0, 8));
  assert.ok(diagnostic.observations.length <= 64);

  await assert.rejects(
    recoverTaskBatchTransaction({ tasksRoot }),
    (error) => error.code === "TASK_BATCH_RECOVERY_BLOCKED",
  );
  assert.deepEqual(await readFile(lockPath), journalBefore);
  assert.deepEqual(await readFile(extraPath), extraBefore);
  assert.deepEqual(
    await readFile(path.join(tasksRoot, stageName, "0002-second", "TASK.md")),
    stageTaskBefore,
  );
});

test("rollback preserves changed pair bytes and linked extras instead of recursively cleaning them", async (t) => {
  const changedRoot = path.join(
    await temporaryDirectory(t),
    "changed",
    "docs",
    "tasks",
  );
  let changedTaskPath;
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: changedRoot,
      tasks: [batchDefinition("changed", "Changed")],
      hooks: {
        async afterPairWrite({ stagedTaskDirectory }) {
          changedTaskPath = path.join(stagedTaskDirectory, "TASK.md");
          await writeFile(changedTaskPath, "foreign changed bytes\n", "utf8");
          throw new Error("stop after pair replacement");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );
  assert.equal(await readFile(changedTaskPath, "utf8"), "foreign changed bytes\n");
  await assert.rejects(
    recoverTaskBatchTransaction({ tasksRoot: changedRoot }),
    (error) => error.code === "TASK_BATCH_RECOVERY_BLOCKED",
  );
  assert.equal(await readFile(changedTaskPath, "utf8"), "foreign changed bytes\n");

  const linkFixture = await temporaryDirectory(t);
  const linkIsJunction = process.platform === "win32";
  const linkSource = path.join(
    linkFixture,
    linkIsJunction ? "source-directory" : "source.txt",
  );
  const linkProbe = path.join(
    linkFixture,
    linkIsJunction ? "probe-directory" : "probe.txt",
  );
  if (linkIsJunction) {
    await mkdir(linkSource);
    await writeFile(
      path.join(linkSource, "user-bytes.txt"),
      "linked user bytes\n",
      "utf8",
    );
  } else {
    await writeFile(linkSource, "linked user bytes\n", "utf8");
  }
  try {
    await symlink(linkSource, linkProbe, linkIsJunction ? "junction" : "file");
    await rm(linkProbe);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
      t.diagnostic(`symlink rollback fixture is unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const linkedRoot = path.join(
    await temporaryDirectory(t),
    "linked",
    "docs",
    "tasks",
  );
  let linkedPath;
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: linkedRoot,
      tasks: [batchDefinition("linked", "Linked")],
      hooks: {
        async afterPairWrite({ stagedTaskDirectory }) {
          linkedPath = path.join(
            stagedTaskDirectory,
            linkIsJunction ? "linked-user-directory" : "linked-user-file.txt",
          );
          await symlink(
            linkSource,
            linkedPath,
            linkIsJunction ? "junction" : "file",
          );
          throw new Error("stop after linked extra");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );
  assert.equal((await lstat(linkedPath)).isSymbolicLink(), true);
  assert.equal(
    await readFile(
      linkIsJunction ? path.join(linkedPath, "user-bytes.txt") : linkedPath,
      "utf8",
    ),
    "linked user bytes\n",
  );
  await assert.rejects(
    recoverTaskBatchTransaction({ tasksRoot: linkedRoot }),
    (error) => error.code === "TASK_BATCH_RECOVERY_BLOCKED",
  );
  assert.equal((await lstat(linkedPath)).isSymbolicLink(), true);
});

test("explicit recovery rolls back a fully proven interrupted publication and is idempotent", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot,
      tasks: [
        batchDefinition("first", "First"),
        batchDefinition("second", "Second"),
      ],
      hooks: {
        afterDirectoryPublish({ index }) {
          if (index === 0) {
            throw new Error("interrupt publication");
          }
        },
        beforeRollback() {
          throw new Error("interrupt automatic rollback");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );
  assert.equal(
    (await inspectTaskBatchTransaction({ tasksRoot })).state,
    "RECOVERY_REQUIRED",
  );

  const recovered = await recoverTaskBatchTransaction({ tasksRoot });
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.action, "rolled-back");
  assert.deepEqual(await readdir(tasksRoot), []);

  const repeated = await recoverTaskBatchTransaction({ tasksRoot });
  assert.equal(repeated.recovered, false);
  assert.equal(repeated.state, "NONE");
});

test("explicit recovery handles proven pre-publish and rolled-back cleanup phases", async (t) => {
  const prepublishRoot = path.join(
    await temporaryDirectory(t),
    "prepublish",
    "docs",
    "tasks",
  );
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: prepublishRoot,
      tasks: [batchDefinition("prepublish", "Prepublish")],
      hooks: {
        afterStageDirectoryCreate() {
          throw new Error("interrupt before pair staging");
        },
        beforeRollback() {
          throw new Error("retain pre-publish transaction");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );
  assert.equal(
    (await inspectTaskBatchTransaction({ tasksRoot: prepublishRoot })).phase,
    "ROLLING_BACK",
  );
  assert.equal(
    (await recoverTaskBatchTransaction({ tasksRoot: prepublishRoot })).action,
    "rolled-back",
  );
  assert.deepEqual(await readdir(prepublishRoot), []);

  const rolledBackRoot = path.join(
    await temporaryDirectory(t),
    "rolled-back",
    "docs",
    "tasks",
  );
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: rolledBackRoot,
      tasks: [batchDefinition("rolled-back", "Rolled back")],
      hooks: {
        afterPairWrite() {
          throw new Error("trigger automatic rollback");
        },
        beforeLockReleaseRename() {
          throw new Error("retain rolled-back marker");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );
  assert.equal(
    (await inspectTaskBatchTransaction({ tasksRoot: rolledBackRoot })).phase,
    "ROLLED_BACK",
  );
  assert.equal(
    (await recoverTaskBatchTransaction({ tasksRoot: rolledBackRoot })).action,
    "rolled-back-cleanup",
  );
  assert.deepEqual(await readdir(rolledBackRoot), []);
  assert.equal(
    (await recoverTaskBatchTransaction({ tasksRoot: rolledBackRoot })).state,
    "NONE",
  );
});

test("explicit recovery completes proven committed cleanup without removing published Tasks", async (t) => {
  const tasksRoot = path.join(await temporaryDirectory(t), "docs", "tasks");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot,
      tasks: [
        batchDefinition("first", "First"),
        batchDefinition("second", "Second"),
      ],
      hooks: {
        beforeLockReleaseRename() {
          throw new Error("interrupt final lock release");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_FINALIZATION_FAILED",
  );
  const diagnostic = await inspectTaskBatchTransaction({ tasksRoot });
  assert.equal(diagnostic.phase, "COMMITTED");

  const recovered = await recoverTaskBatchTransaction({ tasksRoot });
  assert.equal(recovered.action, "completed-cleanup");
  assert.deepEqual(await readdir(tasksRoot), [
    "0001-first",
    "0002-second",
  ]);
  for (const directory of await readdir(tasksRoot)) {
    assert.deepEqual(
      await validateTaskDirectory(path.join(tasksRoot, directory)),
      [],
    );
  }
  assert.equal(
    (await recoverTaskBatchTransaction({ tasksRoot })).state,
    "NONE",
  );
});

test("batch failure boundaries either restore the prior queue or retain explicit recovery evidence", async (t) => {
  const cleanBoundaries = [
    "afterStageDirectoryCreate",
    "afterPairWrite",
    "beforePublish",
    "beforeDirectoryPublish",
    "afterFinalDirectoryCreate",
    "afterFinalFileCreate",
    "afterDirectoryPublish",
  ];
  for (const boundary of cleanBoundaries) {
    const tasksRoot = path.join(
      await temporaryDirectory(t),
      boundary,
      "docs",
      "tasks",
    );
    let injected = false;
    await assert.rejects(
      createTaskArtifactBatch({
        tasksRoot,
        tasks: [batchDefinition("boundary", "Boundary")],
        hooks: {
          [boundary]() {
            if (!injected) {
              injected = true;
              throw new Error(`injected ${boundary}`);
            }
          },
        },
      }),
      (error) =>
        error.code === "TASK_BATCH_CREATION_FAILED" &&
        error.message.includes(boundary),
    );
    assert.deepEqual(await readdir(tasksRoot), []);
  }

  const releaseRoot = path.join(
    await temporaryDirectory(t),
    "release",
    "docs",
    "tasks",
  );
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: releaseRoot,
      tasks: [batchDefinition("release", "Release")],
      hooks: {
        beforeReleaseMarkerUnlink() {
          throw new Error("injected release unlink");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_FINALIZATION_FAILED",
  );
  const releaseDiagnostic = await inspectTaskBatchTransaction({
    tasksRoot: releaseRoot,
  });
  assert.equal(releaseDiagnostic.phase, "COMMITTED");
  assert.match(releaseDiagnostic.marker.path, /\.kyw-dev-task-release-/);
  assert.equal(
    (await recoverTaskBatchTransaction({ tasksRoot: releaseRoot })).action,
    "completed-cleanup",
  );

  const manifestRoot = path.join(
    await temporaryDirectory(t),
    "manifest",
    "docs",
    "tasks",
  );
  let manifestInterrupted = false;
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: manifestRoot,
      tasks: [batchDefinition("manifest", "Manifest")],
      hooks: {
        afterJournalAppend({ event }) {
          if (event === "STAGE_CREATED" && !manifestInterrupted) {
            manifestInterrupted = true;
            throw new Error("interrupt after durable manifest record");
          }
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );
  assert.equal(
    (await inspectTaskBatchTransaction({ tasksRoot: manifestRoot })).phase,
    "POST_LOCK_VALIDATED",
  );
  assert.equal(
    (await recoverTaskBatchTransaction({ tasksRoot: manifestRoot })).action,
    "rolled-back",
  );
  assert.deepEqual(await readdir(manifestRoot), []);

  const rollbackRoot = path.join(
    await temporaryDirectory(t),
    "rollback-boundary",
    "docs",
    "tasks",
  );
  let unlinkInterrupted = false;
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: rollbackRoot,
      tasks: [batchDefinition("rollback-boundary", "Rollback boundary")],
      hooks: {
        afterDirectoryPublish() {
          throw new Error("trigger rollback boundary");
        },
        beforeRollbackFileUnlink() {
          if (!unlinkInterrupted) {
            unlinkInterrupted = true;
            throw new Error("interrupt proven file unlink");
          }
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );
  assert.equal(
    (await recoverTaskBatchTransaction({ tasksRoot: rollbackRoot })).action,
    "rolled-back",
  );
  assert.deepEqual(await readdir(rollbackRoot), []);
});
