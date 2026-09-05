import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runTaskArtifactCommand } from "../skills/kyw-task/scripts/task-artifacts.mjs";
import { createTaskArtifactBatch, inspectTaskQueue, resolveTaskDispatch, validateTaskDirectory } from "../src/core/task-artifacts.mjs";
import { parseTaskMetadata, validateTaskTestContract } from "../src/core/template-contracts.mjs";

async function temporaryRoot(t) {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-single-task-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const record = `# TASK {{TASK_ID}} — {{TASK_TITLE}}

<!-- kyw-task-contract: 5 -->
<!-- kyw-task: {"id":"{{TASK_ID}}","status":"READY","dependencies":[]} -->

The goal and verification plan can use the project's natural prose.
`;

test("adapter creates, resumes and completes a single record without TEST or external state", async (t) => {
  const root = await temporaryRoot(t);
  const created = await runTaskArtifactCommand(["create", "--tasks-root", root, "--title", "Small outcome"]);
  assert.deepEqual(await readdir(created.directory), ["TASK.md"]);
  assert.equal(created.testPath, undefined);
  let markdown = await readFile(created.taskPath, "utf8");
  assert.equal(parseTaskMetadata(markdown).status, "DRAFT");
  assert.equal((await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0001" })).code, "DRAFT_AUTHORING_REQUIRED");
  for (const [status, expected] of [["READY", "SELECTED"], ["IN_PROGRESS", "SELECTED"], ["BLOCKED", "SELECTED"], ["DONE", "TERMINAL"]]) {
    markdown = markdown.replace(/"status":"[A-Z_]+"/, `"status":"${status}"`);
    await writeFile(created.taskPath, markdown);
    assert.deepEqual(await validateTaskDirectory(created.directory), []);
    const result = await runTaskArtifactCommand(["dispatch", "--tasks-root", root, "--invocation", "$kyw-impl 0001"]);
    assert.equal(result.outcome, expected);
  }
  assert.deepEqual(await readdir(created.directory), ["TASK.md"]);
});

test("batch resolves actual dependencies without release versions or duplicate verification fields", async (t) => {
  const root = await temporaryRoot(t);
  const created = await createTaskArtifactBatch({ tasksRoot: root, tasks: [
    { title: "Foundation", taskMarkdown: record },
    { title: "Dependent", taskMarkdown: record, dependencies: [{ taskTitle: "Foundation" }] },
  ] });
  assert.deepEqual(parseTaskMetadata(await readFile(created.tasks[1].taskPath, "utf8")).dependencies, ["0001"]);
  assert.deepEqual((await inspectTaskQueue(root)).errors, []);
  const pending = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0002" });
  assert.equal(pending.outcome, "SELECTED");
  assert.equal(pending.dependencyChecks[0].taskStatus, "READY");
  assert.equal(pending.dependencyChecks[0].availability, "UNVERIFIED");
  const first = await readFile(created.tasks[0].taskPath, "utf8");
  await writeFile(created.tasks[0].taskPath, first.replace('"status":"READY"', '"status":"DONE"') + "\nVerification: actual command passed.\n");
  const completed = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0002" });
  assert.equal(completed.outcome, "SELECTED");
  assert.equal(completed.dependencyChecks[0].taskStatus, "DONE");
  assert.equal(completed.dependencyChecks[0].availability, "UNVERIFIED");
});

test("small machine fields reject malformed identity and dependency graphs while prose remains free", () => {
  const markdown = record.replaceAll("{{TASK_ID}}", "0001").replaceAll("{{TASK_TITLE}}", "Goal");
  assert.deepEqual(validateTaskTestContract({taskMarkdown: markdown}), []);
  assert.deepEqual(validateTaskTestContract({taskMarkdown: markdown, testMarkdown: "Optional detailed evidence."}), []);
  for (const invalid of [
    markdown.replace('"status":"READY"', '"status":"PASS"'),
    markdown.replace('"dependencies":[]', '"dependencies":["0001"]'),
    markdown.replace('"dependencies":[]', '"dependencies":["0002","0002"]'),
    markdown.replace('"id":"0001"', '"id":"0002"'),
    markdown + '\n<!-- kyw-task: {} -->',
  ]) assert.ok(validateTaskTestContract({taskMarkdown: invalid}).length > 0);
});

test("legacy paired records validate without rewriting historical evidence", async () => {
  for (const relative of ["normal/docs/tasks/0001-complete-task", "ergonomics/0101-standard-task", "ergonomics/0102-documentation-only"]) {
    const directory = fileURLToPath(new URL(`./fixtures/task-repositories/${relative}/`, import.meta.url));
    const before = await Promise.all([readFile(path.join(directory, "TASK.md")), readFile(path.join(directory, "TEST.md"))]);
    assert.deepEqual(await validateTaskDirectory(directory), []);
    const after = await Promise.all([readFile(path.join(directory, "TASK.md")), readFile(path.join(directory, "TEST.md"))]);
    assert.deepEqual(after, before);
  }
});


test("batch never silently drops prefilled dependency metadata", async (t) => {
  const root = await temporaryRoot(t);
  await createTaskArtifactBatch({ tasksRoot: root, tasks: [{ title: "Foundation", taskMarkdown: record }] });
  const before = await readdir(root);
  await assert.rejects(createTaskArtifactBatch({ tasksRoot: root, tasks: [{
    title: "Requires foundation", taskMarkdown: record.replace('"dependencies":[]', '"dependencies":["0001"]'),
  }] }), /metadata dependencies conflict/);
  assert.deepEqual(await readdir(root), before);
});

test("batch creation keeps global inventory validation even when exact local selection can proceed", async (t) => {
  const root = await temporaryRoot(t);
  await createTaskArtifactBatch({ tasksRoot: root, tasks: [{ title: "Foundation", taskMarkdown: record }] });
  await mkdir(path.join(root, "archive"));
  const before = await readdir(root);
  assert.equal((await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0001" })).outcome, "SELECTED");
  await assert.rejects(createTaskArtifactBatch({ tasksRoot: root, tasks: [{ title: "Next", taskMarkdown: record }] }), /archive/);
  assert.deepEqual(await readdir(root), before);
});
