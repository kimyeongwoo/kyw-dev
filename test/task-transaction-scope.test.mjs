import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createTaskArtifactBatch,
  inspectTaskQueue,
  resolveTaskDispatch,
} from "../src/core/task-artifacts.mjs";
import { inspectTaskBatchSelectionScope } from "../src/core/task-artifact-creation.mjs";

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "kyw-task-scope-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const tasksRoot = path.join(directory, "tasks");
  const taskMarkdown = (await readFile(new URL("../templates/task/TASK.md", import.meta.url), "utf8"))
    .replace('"status":"DRAFT"', '"status":"READY"');
  const definition = (key) => ({ key, title: key, taskMarkdown });
  const existing = await createTaskArtifactBatch({ tasksRoot, tasks: [definition("existing")] });
  return { tasksRoot, definition, existing: existing.tasks[0] };
}

const dispatch = (tasksRoot, id) => resolveTaskDispatch({ tasksRoot, invocation: `$kyw-impl ${id}` });

test("exact existing Task remains selectable during an unrelated live creation", async (t) => {
  const { tasksRoot, definition } = await fixture(t);
  const observations = [];
  async function observe() {
    const scope = await inspectTaskBatchSelectionScope({ tasksRoot });
    assert.equal(scope.state, "SCOPED");
    assert.deepEqual(scope.taskIds, ["0002"]);
    const existing = await dispatch(tasksRoot, "0001");
    observations.push(existing);
    const reserved = await dispatch(tasksRoot, "0002");
    assert.equal(reserved.outcome, "BLOCKED");
    assert.match(reserved.message, /0002.*transaction|transaction.*0002/i);
    const global = await inspectTaskQueue(tasksRoot);
    assert.match(global.errors.join("\n"), /locked/);
    const automatic = await resolveTaskDispatch({ tasksRoot, invocation: "task 진행해줘", managedRoutingAvailable: true });
    assert.equal(automatic.outcome, "BLOCKED");
    const delivery = await resolveTaskDispatch({ tasksRoot, invocation: "$kyw-deliver 0001" });
    assert.equal(delivery.outcome, "BLOCKED");
    assert.match(delivery.message, /locked/);
    await assert.rejects(
      createTaskArtifactBatch({ tasksRoot, tasks: [definition("competing")] }),
      (error) => error.code === "TASK_CREATION_LOCKED",
    );
  }
  await createTaskArtifactBatch({
    tasksRoot,
    tasks: [definition("new-task")],
    hooks: { afterLock: observe, afterDirectoryPublish: observe },
  });
  assert.equal(observations.length, 2);
  for (const result of observations) {
    assert.equal(result.outcome, "SELECTED", JSON.stringify(result));
    assert.ok(result.warnings.some((warning) => /transaction/i.test(warning)));
    assert.equal(result.publicWriteAuthorized, false);
  }
  assert.deepEqual(await readdir(tasksRoot), ["0001-existing", "0002-new-task"]);
});

test("a transitive dependency being published remains protected before its record is consumed", async (t) => {
  const { tasksRoot, definition } = await fixture(t);
  const second = await createTaskArtifactBatch({ tasksRoot, tasks: [definition("dependency")] });
  const firstPath = path.join(tasksRoot, "0001-existing", "TASK.md");
  const secondPath = second.tasks[0].taskPath;
  const [first, originalSecond] = await Promise.all([
    readFile(firstPath, "utf8"),
    readFile(secondPath, "utf8"),
  ]);
  await writeFile(firstPath, first.replace('"dependencies":[]', '"dependencies":["0002"]'));
  let observation;
  await createTaskArtifactBatch({
    tasksRoot,
    tasks: [definition("pending")],
    hooks: {
      async afterDirectoryPublish({ task }) {
        await writeFile(secondPath, originalSecond.replace('"dependencies":[]', '"dependencies":["0003"]'));
        // A readable but invalid reserved record must not be consumed first.
        const reservedPath = task.taskPath;
        const reserved = await readFile(reservedPath, "utf8");
        try {
          await writeFile(reservedPath, "incomplete publication\n");
          observation = await dispatch(tasksRoot, "0001");
        } finally {
          await writeFile(reservedPath, reserved);
          await writeFile(secondPath, originalSecond);
        }
      },
    },
  });
  assert.equal(observation.outcome, "BLOCKED");
  assert.match(observation.message, /0003.*transaction|transaction.*0003/i);
  assert.doesNotMatch(observation.message, /contract marker|TASK\.md headers/);
});

test("a retained committed release marker keeps only its transaction targets protected", async (t) => {
  const { tasksRoot, definition } = await fixture(t);
  await assert.rejects(createTaskArtifactBatch({
    tasksRoot,
    tasks: [definition("committed")],
    hooks: { afterLockReleaseRename() { throw new Error("retain release marker"); } },
  }), (error) => error.code === "TASK_BATCH_FINALIZATION_FAILED");
  const before = await readdir(tasksRoot);
  const markerPath = path.join(tasksRoot, before.find((name) => name.startsWith(".kyw-dev-task-release-")));
  const markerBefore = await readFile(markerPath);
  assert.equal((await dispatch(tasksRoot, "0001")).outcome, "SELECTED");
  assert.equal((await dispatch(tasksRoot, "0002")).outcome, "BLOCKED");
  assert.deepEqual(await readdir(tasksRoot), before);
  assert.deepEqual(await readFile(markerPath), markerBefore);
});

test("damaged retained journal and unknown legacy evidence never imply non-overlap", async (t) => {
  for (const kind of ["damaged-journal", "legacy-lock", "orphan-stage", "replacement-marker", "extra-evidence"]) {
    await t.test(kind, async (t) => {
      const { tasksRoot, definition } = await fixture(t);
      const lockPath = path.join(tasksRoot, ".kyw-dev-task-create.lock");
      if (kind === "legacy-lock") {
        await writeFile(lockPath, "legacy lock with no scoped manifest\n");
      } else if (kind === "orphan-stage") {
        await mkdir(path.join(tasksRoot, ".kyw-dev-task-batch-orphan.tmp"));
      } else {
        await assert.rejects(createTaskArtifactBatch({
          tasksRoot,
          tasks: [definition("retained")],
          hooks: {
            afterDirectoryPublish() { throw new Error("retain transaction"); },
            beforeRollback() { throw new Error("retain owned data"); },
          },
        }), (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED");
        const original = await readFile(lockPath, "utf8");
        if (kind === "damaged-journal") {
          await writeFile(lockPath, original.slice(0, -3));
        } else if (kind === "replacement-marker") {
          await rename(lockPath, path.join(tasksRoot, "displaced-marker"));
          await writeFile(lockPath, original);
        } else {
          await mkdir(path.join(tasksRoot, ".kyw-dev-task-batch-unexpected.tmp"));
        }
      }
      const before = await readdir(tasksRoot);
      const markerBefore = before.includes(path.basename(lockPath)) ? await readFile(lockPath) : undefined;
      const existingPath = path.join(tasksRoot, "0001-existing", "TASK.md");
      const existingBefore = await readFile(existingPath);
      const scope = await inspectTaskBatchSelectionScope({ tasksRoot });
      assert.equal(scope.state, "UNKNOWN");
      assert.deepEqual(scope.taskIds, []);
      assert.match(scope.message, /Cannot determine batch transaction scope/);
      const result = await dispatch(tasksRoot, "0001");
      assert.equal(result.outcome, "BLOCKED");
      assert.match(result.message, /Cannot determine batch transaction scope/);
      assert.deepEqual(await readdir(tasksRoot), before);
      if (markerBefore) assert.deepEqual(await readFile(lockPath), markerBefore);
      assert.deepEqual(await readFile(existingPath), existingBefore);
    });
  }
});
