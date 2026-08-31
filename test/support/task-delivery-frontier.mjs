import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  MAX_TASK_NUMBER,
  STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH,
  discoverRequiredStandardDeliveries,
  formatTaskId,
  parseStandardDeliveryContinuityCheckpoint,
  partitionStandardDeliveryContinuity,
} from "../../src/core/task-artifacts.mjs";

function gitRaw(repositoryRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args[0]} failed: ${result.stderr || result.error?.message || "unknown failure"}`,
    );
  }
  return result.stdout;
}

export function readAlignedMainStandardDeliveryCheckpoint(repositoryRoot) {
  const bytes = gitRaw(repositoryRoot, [
    "show",
    `refs/heads/main:${STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH}`,
  ]);
  return Object.freeze({
    bytes,
    checkpoint: parseStandardDeliveryContinuityCheckpoint(bytes),
  });
}

export function readRepositoryPorcelainStatus(repositoryRoot) {
  return gitRaw(repositoryRoot, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
}

export function createSyntheticStandardDeliveryProbe({ tasks, tasksRoot }) {
  const nextNumber = Math.max(0, ...tasks.map((task) => task.number)) + 1;
  if (nextNumber > MAX_TASK_NUMBER) {
    throw new Error("live STANDARD delivery probe exhausted four-digit Task IDs");
  }
  const id = formatTaskId(nextNumber);
  const name = `${id}-live-standard-delivery-probe`;
  const normalizedTasks = tasks.map((task) =>
    task.taskStatus === "IN_PROGRESS" && task.testStatus === "RUNNING"
      ? { ...task, taskStatus: "READY", testStatus: "READY" }
      : task,
  );
  const latestCompleted = normalizedTasks
    .filter(
      (task) =>
        task.contractVersion >= 2 &&
        task.taskStatus === "DONE" &&
        task.testStatus === "PASSED",
    )
    .sort((left, right) => left.number - right.number)
    .at(-1);
  const syntheticTask = Object.freeze({
    id,
    number: nextNumber,
    name,
    taskStatus: "READY",
    testStatus: "READY",
    contractVersion: 3,
    dependencies: latestCompleted ? [latestCompleted.id] : [],
    deliveryRequirement: Object.freeze({ kind: "STANDARD" }),
    taskPath: path.join(path.resolve(tasksRoot), name, "TASK.md"),
    testPath: path.join(path.resolve(tasksRoot), name, "TEST.md"),
  });
  return Object.freeze({
    invocation: `$kyw-impl ${id}`,
    selectedTask: syntheticTask,
    tasks: Object.freeze([...normalizedTasks, syntheticTask]),
  });
}

export function deriveStandardDeliveryFrontier({
  tasks,
  invocation,
  checkpoint,
  managedRoutingAvailable = false,
}) {
  const requiredTasks = discoverRequiredStandardDeliveries({
    tasks,
    invocation,
    managedRoutingAvailable,
  });
  const partition = partitionStandardDeliveryContinuity({
    checkpoint,
    requiredTasks,
  });
  const requiredTaskIds = Object.freeze(requiredTasks.map((task) => task.id));
  const coveredTaskIds = Object.freeze(
    partition.coveredTasks.map((task) => task.id),
  );
  const uncoveredTaskIds = Object.freeze(
    partition.uncoveredTasks.map((task) => task.id),
  );
  const classifications = Object.fromEntries([
    ...coveredTaskIds.map((taskId) => [
      taskId,
      "DURABLE_STANDARD_CONTINUITY",
    ]),
    ...uncoveredTaskIds.map((taskId) => [taskId, "HARDENED_EXACT_HEAD"]),
  ]);
  return Object.freeze({
    requiredTasks,
    requiredTaskIds,
    coveredTaskIds,
    uncoveredTaskIds,
    classifications: Object.freeze(classifications),
    preparedAdvancement: uncoveredTaskIds.length === 1,
    expectedTaskCount:
      checkpoint.coverage.taskCount + uncoveredTaskIds.length,
    expectedLastTaskId:
      uncoveredTaskIds.at(-1) ?? checkpoint.coverage.lastTaskId,
  });
}
