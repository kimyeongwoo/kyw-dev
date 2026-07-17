import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MAX_TASK_SLUG_LENGTH,
  allocateNextTaskId,
  buildTaskDirectoryName,
  createTaskArtifacts,
  inspectTaskDirectories,
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
  assert.match(await readFile(created.taskPath, "utf8"), /^# TASK 0001 — 템플릿 계약/m);
  assert.match(await readFile(created.testPath, "utf8"), /^# TEST 0001 — 템플릿 계약/m);
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
