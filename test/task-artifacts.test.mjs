import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MAX_TASK_SLUG_LENGTH,
  allocateNextTaskId,
  buildTaskDirectoryName,
  createTaskArtifactBatch,
  createTaskArtifacts,
  inspectTaskDirectories,
  inspectTaskQueue,
  normalizeTaskTitle,
  resolveTaskDirectory,
  slugifyTaskTitle,
  validateTaskDirectory,
} from "../src/core/task-artifacts.mjs";

const fixturesRoot = fileURLToPath(new URL("./fixtures/task-repositories/", import.meta.url));

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

<!-- kyw-task-contract: 2 -->

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

<!-- kyw-task-contract: 2 -->

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
  assert.equal(slugifyTaskTitle("Crème brûlée API"), "creme-brulee-api");
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
  assert.match(taskMarkdown, /<!-- kyw-task-contract: 2 -->/);
  assert.match(testMarkdown, /<!-- kyw-task-contract: 2 -->/);
  assert.match(taskMarkdown, /^## Delivery$/m);
  assert.deepEqual(await validateTaskDirectory(created.directory), []);

  const second = await createTaskArtifacts({ tasksRoot, title: "Second task" });
  assert.equal(second.id, "0002");
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
  assert.deepEqual(await readdir(invalidRoot), []);

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
  assert.deepEqual(await readdir(missingRoot), []);

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
  assert.deepEqual(await readdir(cycleRoot), []);

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
        async afterPrevalidation({ tasks }) {
          await mkdir(tasks[0].directory);
        },
      },
    }),
    (error) => error.code === "TASK_CREATION_CONFLICT",
  );
  assert.deepEqual(await readdir(tasksRoot), ["0001-first"]);
  assert.deepEqual(await readdir(path.join(tasksRoot, "0001-first")), []);
});
