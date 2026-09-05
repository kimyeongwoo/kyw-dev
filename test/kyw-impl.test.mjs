import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SHARED_ADAPTER_PATH = join(
  REPOSITORY_ROOT,
  "skills",
  "kyw-task",
  "scripts",
  "task-artifacts.mjs",
);
const EXECUTION_FIXTURE_ROOT = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "task-repositories",
  "ergonomics",
  "0101-standard-task",
);

function runAdapter(args) {
  return spawnSync(process.execPath, [SHARED_ADAPTER_PATH, ...args], {
    encoding: "utf8",
    cwd: REPOSITORY_ROOT,
  });
}

async function temporaryTasksRoot(t) {
  const root = await mkdtemp(join(tmpdir(), "kyw-dev-impl-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tasksRoot = join(root, "docs", "tasks");
  const taskDirectory = join(tasksRoot, "0101-standard-task");
  await mkdir(taskDirectory, { recursive: true });
  const [taskMarkdown, testMarkdown] = await Promise.all([
    readFile(join(EXECUTION_FIXTURE_ROOT, "TASK.md"), "utf8"),
    readFile(join(EXECUTION_FIXTURE_ROOT, "TEST.md"), "utf8"),
  ]);
  await Promise.all([
    writeFile(join(taskDirectory, "TASK.md"), taskMarkdown, "utf8"),
    writeFile(join(taskDirectory, "TEST.md"), testMarkdown, "utf8"),
  ]);
  return { tasksRoot, taskDirectory, taskMarkdown, testMarkdown };
}

test("shared adapter dispatches kyw-impl and leaves rejected authoring inputs byte-stable", async (t) => {
  const { tasksRoot, taskDirectory, taskMarkdown, testMarkdown } =
    await temporaryTasksRoot(t);

  const selectedResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    "$kyw-impl 0101",
    "--managed-routing",
    "false",
  ]);
  assert.equal(selectedResult.status, 0, selectedResult.stderr);
  const selected = JSON.parse(selectedResult.stdout);
  assert.equal(selected.outcome, "SELECTED");
  assert.equal(selected.action, "IMPLEMENT");
  assert.equal(selected.task.id, "0101");

  const fallbackResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    "task 0101 실행해줘",
    "--managed-routing",
    "false",
  ]);
  assert.equal(fallbackResult.status, 0, fallbackResult.stderr);
  const fallback = JSON.parse(fallbackResult.stdout);
  assert.equal(fallback.outcome, "FALLBACK_REQUIRED");
  assert.equal(fallback.portableFallback, "$kyw-impl 0101");

  await Promise.all([
    writeFile(join(taskDirectory, "TASK.md"), taskMarkdown.replace("\nREADY\n", "\nDRAFT\n"), "utf8"),
    writeFile(join(taskDirectory, "TEST.md"), testMarkdown.replace("\nREADY\n", "\nDRAFT\n"), "utf8"),
  ]);
  const inventoryBefore = await readdir(tasksRoot);
  const draftResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    "$kyw-impl 0101",
    "--managed-routing",
    "false",
  ]);
  assert.equal(draftResult.status, 0, draftResult.stderr);
  const draft = JSON.parse(draftResult.stdout);
  assert.equal(draft.outcome, "BLOCKED");
  assert.equal(draft.code, "DRAFT_AUTHORING_REQUIRED");
  assert.equal("action" in draft, false);

  const missingResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    "$kyw-impl 0999",
    "--managed-routing",
    "false",
  ]);
  assert.equal(missingResult.status, 0, missingResult.stderr);
  const missing = JSON.parse(missingResult.stdout);
  assert.equal(missing.outcome, "BLOCKED");
  assert.equal(missing.code, "TASK_NOT_FOUND");
  assert.equal("action" in missing, false);

  const goalResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    '$kyw-impl "a new outcome"',
    "--managed-routing",
    "false",
  ]);
  assert.equal(goalResult.status, 0, goalResult.stderr);
  const goal = JSON.parse(goalResult.stdout);
  assert.equal(goal.outcome, "NOT_TASK_INVOCATION");
  assert.equal(goal.code, "NO_ANCHORED_TASK_COMMAND");
  assert.equal(goal.mutationRequired, false);

  assert.deepEqual(await readdir(tasksRoot), inventoryBefore);
  assert.equal(
    await readFile(join(taskDirectory, "TASK.md"), "utf8"),
    taskMarkdown.replace("\nREADY\n", "\nDRAFT\n"),
  );
  assert.equal(
    await readFile(join(taskDirectory, "TEST.md"), "utf8"),
    testMarkdown.replace("\nREADY\n", "\nDRAFT\n"),
  );
});
