import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import {
  getTaskContractVersion,
  isQueueAwareTaskContractVersion,
  SINGLE_TASK_CONTRACT_VERSION,
  TASK_TEST_STATUS_PAIRS,
  validateTaskTestContract,
} from "./template-contracts.mjs";
import {
  ALL_TASKS_COMPLETE_MESSAGE,
  MAX_TASK_NUMBER,
  activeTask,
  blockedTask,
  cancelledTask,
  completeTask,
  draftTask,
  firstSectionLine,
  formatTaskId,
  inspectTaskDirectories,
  parseDeliveryRequirement,
  parseHardDependencies,
  readyTask,
  resolveTaskDirectory,
  taskSummary,
} from "./task-artifact-contract.mjs";
import {
  evaluateTaskExecutionPreflight,
  parseTaskInvocation,
} from "./task-artifact-delivery.mjs";
import {
  TaskArtifactError,
  listBatchTransactionArtifacts,
  taskLayoutError,
} from "./task-artifact-shared.mjs";

export function parseTaskQueueMarkdownPair({
  tasksRoot,
  entry,
  taskMarkdown,
  testMarkdown,
}) {
  const directory = resolveTaskDirectory(tasksRoot, entry.id, entry.slug);
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");
  const errors = validateTaskTestContract({ taskMarkdown, testMarkdown }).map(
    (message) => `${entry.name}: ${message}`,
  );
  const taskId = /^# TASK (\d{4}) — (.+)$/m.exec(taskMarkdown);
  const testId = /^# TEST (\d{4}) — (.+)$/m.exec(testMarkdown ?? "");
  const single = getTaskContractVersion(taskMarkdown) === SINGLE_TASK_CONTRACT_VERSION;
  if (taskId?.[1] !== entry.id || (!single && testId?.[1] !== entry.id)) {
    errors.push(
      `${entry.name}: directory ID ${entry.id} must match TASK.md and TEST.md headers (${taskId?.[1] ?? "<missing>"}/${testId?.[1] ?? "<missing>"})`,
    );
  }
  const contractVersion = getTaskContractVersion(taskMarkdown);
  const taskStatus = firstSectionLine(taskMarkdown, "Status");
  const testStatus = single ? TASK_TEST_STATUS_PAIRS.find(([status]) => status === taskStatus)?.[1] : firstSectionLine(testMarkdown, "Status");
  const deliveryRequirement = parseDeliveryRequirement(
    taskMarkdown,
    contractVersion,
  );
  const baseTask = {
    id: entry.id,
    number: entry.number,
    name: entry.name,
    directory,
    taskPath,
    testPath,
    title: taskId?.[2]?.trim() ?? entry.name,
    taskStatus,
    testStatus,
    contractVersion,
    dependencies: Object.freeze([]),
    deliveryRequirement,
    blocker:
      firstSectionLine(taskMarkdown, "Blockers") ??
      "No blocker reason recorded.",
  };
  const dependencyParse = parseHardDependencies(
    taskMarkdown,
    contractVersion,
    { completedCompatibility: completeTask(baseTask) },
  );
  errors.push(
    ...dependencyParse.errors.map(
      (message) => `${entry.name}: TASK.md: ${message}`,
    ),
  );
  return {
    entry,
    errors,
    taskMarkdown,
    task: Object.freeze({
      ...baseTask,
      dependencies: dependencyParse.dependencies,
    }),
  };
}

async function readTaskQueueEntry(tasksRoot, entry) {
  const directory = resolveTaskDirectory(tasksRoot, entry.id, entry.slug);
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");
  let directoryState;
  let taskState;
  let testState;
  try {
    [directoryState, taskState, testState] = await Promise.all([
      lstat(directory),
      lstat(taskPath),
      lstat(testPath).catch((error) => { if (error.code === "ENOENT") return undefined; throw error; }),
    ]);
  } catch (error) {
    return {
      entry,
      errors: [`${entry.name} must contain regular TASK.md and TEST.md files: ${error.message}`],
    };
  }
  const unsafePaths = [];
  if (directoryState.isSymbolicLink() || !directoryState.isDirectory()) {
    unsafePaths.push("Task directory");
  }
  if (taskState.isSymbolicLink() || !taskState.isFile()) {
    unsafePaths.push("TASK.md");
  }
  if (testState && (testState.isSymbolicLink() || !testState.isFile())) {
    unsafePaths.push("TEST.md");
  }
  if (unsafePaths.length > 0) {
    return {
      entry,
      errors: [
        `${entry.name} must not dispatch through symbolic-link or non-file paths: ${unsafePaths.join(", ")}`,
      ],
    };
  }

  let taskMarkdown;
  let testMarkdown;
  try {
    [taskMarkdown, testMarkdown] = await Promise.all([
      readFile(taskPath, "utf8"),
      testState ? readFile(testPath, "utf8") : undefined,
    ]);
  } catch (error) {
    return {
      entry,
      errors: [`${entry.name} must contain readable TASK.md and TEST.md: ${error.message}`],
    };
  }

  return parseTaskQueueMarkdownPair({
    tasksRoot,
    entry,
    taskMarkdown,
    testMarkdown,
  });
}

export function dependencyGraphErrors(tasks, byId) {
  const currentTasks = tasks.filter(
    (task) => isQueueAwareTaskContractVersion(task.contractVersion),
  );
  const errors = [];
  for (const task of currentTasks) {
    for (const dependencyId of task.dependencies) {
      if (!byId.has(dependencyId)) {
        errors.push(`Task ${task.id} references missing hard dependency Task ${dependencyId}`);
      }
    }
  }

  const currentIds = new Set(currentTasks.map((task) => task.id));
  const state = new Map();
  const stack = [];
  const cycles = new Set();
  function visit(task) {
    const currentState = state.get(task.id);
    if (currentState === "DONE") {
      return;
    }
    if (currentState === "ACTIVE") {
      const cycleStart = stack.indexOf(task.id);
      const cycle = [...stack.slice(cycleStart), task.id].join(" -> ");
      cycles.add(`Hard dependency cycle: ${cycle}`);
      return;
    }
    state.set(task.id, "ACTIVE");
    stack.push(task.id);
    for (const dependencyId of task.dependencies) {
      if (currentIds.has(dependencyId)) {
        visit(byId.get(dependencyId));
      }
    }
    stack.pop();
    state.set(task.id, "DONE");
  }
  for (const task of currentTasks) {
    visit(task);
  }
  errors.push(...cycles);

  return errors;
}

export async function inspectTaskQueueContents(tasksRoot, {
  selectedTaskId, selectedTaskIds, localSelection = false, protectedTaskIds = [],
} = {}) {
  const inventory = await inspectTaskDirectories(tasksRoot);
  // An exact Task selection may narrow inventory errors. Batch
  // snapshots also bound record reads, but must retain global layout checks.
  const scoped = localSelection && selectedTaskId !== undefined && selectedTaskIds === undefined;
  const inventoryIssues = [
    ...inventory.malformedEntries,
    ...inventory.conflicts.map((conflict) => ({
      id: conflict.id, message: `Task ID ${conflict.id} is used by: ${conflict.names.join(", ")}`,
    })),
  ];
  const errors = scoped ? [] : inventoryIssues.map((issue) => issue.message);
  const protectedIds = new Set(protectedTaskIds);

  const records = [];
  const targeted = selectedTaskId !== undefined || selectedTaskIds !== undefined;
  const pending = selectedTaskIds ? [...selectedTaskIds] : selectedTaskId ? [selectedTaskId] : inventory.entries.map((entry) => entry.id);
  const inspected = new Set();
  while (pending.length) {
    const id = pending.shift();
    if (inspected.has(id)) continue;
    inspected.add(id);
    const relatedIssues = inventoryIssues.filter((issue) => issue.id === id);
    if (scoped) errors.push(...relatedIssues.map((issue) => issue.message));
    if (protectedIds.has(id)) {
      errors.push(`Task ${id} is a target of the active batch creation or recovery transaction`);
      continue;
    }
    // Never choose the first duplicate or read through a malformed ID alias.
    if (relatedIssues.length > 0) continue;
    const entry = inventory.entries.find((candidate) => candidate.id === id);
    if (!entry) continue;
    const record = await readTaskQueueEntry(tasksRoot, entry);
    records.push(record);
    if (targeted && record.task) pending.push(...record.task.dependencies);
  }
  const tasks = [];
  for (const record of records) {
    errors.push(...record.errors);
    if (record.task) {
      tasks.push(record.task);
    }
  }
  const byId = new Map(tasks.map((task) => [task.id, task]));
  errors.push(...dependencyGraphErrors(tasks, byId));
  return Object.freeze({
    tasks: Object.freeze(tasks),
    errors: Object.freeze(errors),
    warnings: Object.freeze(scoped ? inventoryIssues.filter((issue) => !inspected.has(issue.id)).map((issue) => issue.message) : []),
    currentTasks: Object.freeze(
      tasks.filter((task) => isQueueAwareTaskContractVersion(task.contractVersion)),
    ),
  });
}

export async function inspectTaskQueue(tasksRoot, options = {}) {
  try {
    const rootState = await lstat(tasksRoot);
    if (rootState.isSymbolicLink()) {
      return Object.freeze({
        tasks: Object.freeze([]),
        errors: Object.freeze([`Tasks root must not be a symbolic link: ${tasksRoot}`]),
        currentTasks: Object.freeze([]),
      });
    }
    if (!rootState.isDirectory()) {
      return Object.freeze({
        tasks: Object.freeze([]),
        errors: Object.freeze([`Tasks root is not a directory: ${tasksRoot}`]),
        currentTasks: Object.freeze([]),
      });
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new TaskArtifactError(
        "TASK_ROOT_READ_FAILED",
        `Cannot inspect tasks root ${tasksRoot}: ${error.message}`,
        { cause: error },
      );
    }
  }

  const transactionArtifacts = await listBatchTransactionArtifacts(path.resolve(tasksRoot));
  if (transactionArtifacts.length > 0) {
    if (options.localSelection && options.selectedTaskId !== undefined && options.selectedTaskIds === undefined) {
      // Creation imports the queue for snapshots; load its existing transaction
      // reader only when an exact selection needs the reserved IDs.
      const { inspectTaskBatchSelectionScope } = await import("./task-artifact-creation.mjs");
      const scope = await inspectTaskBatchSelectionScope({ tasksRoot });
      if (scope.state !== "UNKNOWN") {
        const queue = await inspectTaskQueueContents(tasksRoot, { ...options, protectedTaskIds: scope.taskIds });
        return Object.freeze({
          ...queue,
          warnings: Object.freeze([...queue.warnings, ...(scope.message ? [scope.message] : [])]),
        });
      }
      return Object.freeze({
        tasks: Object.freeze([]),
        errors: Object.freeze([`Task queue creation is locked by batch transaction evidence: ${scope.message}`]),
        warnings: Object.freeze([]),
        currentTasks: Object.freeze([]),
      });
    }
    return Object.freeze({
      tasks: Object.freeze([]),
      errors: Object.freeze([
        "Task queue creation is locked by batch transaction evidence",
      ]),
      currentTasks: Object.freeze([]),
    });
  }
  return inspectTaskQueueContents(tasksRoot, options);
}

function blockedResult(code, message, details = {}) {
  return Object.freeze({ outcome: "BLOCKED", code, message, ...details });
}

function dependencyBlockers(task, byId, visited = new Set()) {
  const blockers = [];
  if (visited.has(task.id)) return blockers;
  visited.add(task.id);
  for (const id of task.dependencies) {
    const dependency = byId.get(id);
    if (!dependency || !completeTask(dependency)) {
      blockers.push(`Task ${id} records ${dependency?.taskStatus ?? "a missing record"}; automatic selection requires completed dependency records`);
    } else blockers.push(...dependencyBlockers(dependency, byId, visited));
  }
  return blockers;
}

function dependencyChecks(task, byId, visited = new Set()) {
  const checks = [];
  for (const id of task.dependencies) {
    if (visited.has(id)) continue;
    visited.add(id);
    const dependency = byId.get(id);
    checks.push(Object.freeze({
      taskId: id, taskPath: dependency.taskPath,
      taskStatus: dependency.taskStatus, availability: "UNVERIFIED",
    }));
    checks.push(...dependencyChecks(dependency, byId, visited));
  }
  return checks;
}

function selectedResult(task, invocation, details = {}) {
  return Object.freeze({
    outcome: "SELECTED", route: invocation.route, mode: invocation.mode, continuous: invocation.mode === "CONTINUOUS",
    action: invocation.route !== "IMPLEMENTATION" ? invocation.action : activeTask(task) || blockedTask(task) ? "RESUME" : "IMPLEMENT",
    task: taskSummary(task), taskRequired: true, mutationRequired: invocation.action !== "AUDIT",
    overrideText: invocation.overrideText, overrideScope: invocation.overrideScope,
    mergeAuthorized: invocation.action === "MERGE", publicWriteAuthorized: false,
    fixAuthorized: invocation.action === "FIX",
    ...details,
  });
}

export async function resolveTaskDispatch({
  tasksRoot, invocation, managedRoutingAvailable = false, executionPreflight = {},
  parsedInvocation: suppliedParsedInvocation,
}) {
  const parsed = suppliedParsedInvocation ?? parseTaskInvocation(invocation, { managedRoutingAvailable });
  if (!parsed.recognized) return Object.freeze({
    outcome: "NOT_TASK_INVOCATION", code: "NO_ANCHORED_TASK_COMMAND", mutationRequired: false,
  });
  if (parsed.mode === "FALLBACK_REQUIRED") return Object.freeze({
    outcome: "FALLBACK_REQUIRED", code: "MANAGED_ROUTING_UNAVAILABLE",
    message: parsed.message, portableFallback: parsed.portableFallback,
  });
  const preflight = evaluateTaskExecutionPreflight(executionPreflight);
  if (!preflight.safe) return blockedResult("PREFLIGHT_BLOCKED", preflight.issues.join("; "), { preflightIssues: preflight.issues });
  if (parsed.action === "PUBLIC_RELEASE") return Object.freeze({
    outcome: "SELECTED", route: "DELIVERY", action: "PUBLIC_RELEASE",
    releaseVersion: parsed.releaseVersion, releaseSha: parsed.releaseSha,
    publicWriteAuthorized: false, mutationRequired: false,
  });
  if (["GOAL", "CURRENT"].includes(parsed.mode)) return Object.freeze({
    outcome: "SELECTED", route: parsed.route, mode: parsed.mode, action: parsed.action,
    ...(parsed.goal ? { goal: parsed.goal } : {}),
    taskRequired: false, scope: "CURRENT_REQUEST", scopeResolved: false,
    scopeGuidance: "Read the current request, applicable instructions, diff, branch, and existing PR where relevant. Resolve included paths and the intended external target before writes; preserve unrelated user work and ask only when reading cannot resolve a consequential ambiguity. Do not stage all changes or create a Task as a prerequisite. Coordinate overlapping source writes.",
    mutationRequired: parsed.action !== "AUDIT", continuous: false,
    mergeAuthorized: parsed.action === "MERGE", fixAuthorized: parsed.action === "FIX", publicWriteAuthorized: false,
  });
  const exactLocal = parsed.route === "IMPLEMENTATION" && parsed.mode === "EXACT";
  const queue = await inspectTaskQueue(tasksRoot, {
    selectedTaskId: parsed.mode === "EXACT" ? parsed.taskId : undefined,
    localSelection: parsed.mode === "EXACT",
  });
  const diagnostics = queue.warnings?.length ? { warnings: queue.warnings } : {};
  if (queue.errors.length) return blockedResult("INVALID_TASK_QUEUE", queue.errors.join("\n"), { errors: queue.errors, ...diagnostics });
  const byId = new Map(queue.tasks.map((task) => [task.id, task]));
  const active = queue.tasks.filter(activeTask);
  let task;
  if (parsed.mode === "EXACT") {
    task = byId.get(parsed.taskId);
    if (!task) return blockedResult("TASK_NOT_FOUND", `Task ${parsed.taskId} does not exist`, diagnostics);
  } else {
    if (active.length > 1) return blockedResult("AMBIGUOUS_ACTIVE_TASK", "Select the intended Task explicitly", { taskIds: active.map((entry) => entry.id) });
    task = active[0] ?? queue.tasks.find((candidate) => readyTask(candidate) && dependencyBlockers(candidate, byId).length === 0);
    if (!task) {
      const pending = queue.tasks.filter((entry) => !completeTask(entry) && !cancelledTask(entry));
      return pending.length ? blockedResult("NO_SELECTABLE_TASK", "No ready Task has completed dependency records; exact local selection can inspect the required worktree results") : Object.freeze({
        outcome: "NO_WORK", code: "ALL_TASKS_COMPLETE", message: ALL_TASKS_COMPLETE_MESSAGE, mutationRequired: false,
      });
    }
  }
  if (parsed.route === "DELIVERY") {
    if (!completeTask(task)) return blockedResult("TASK_NOT_DELIVERABLE", `Task ${task.id} requires local completion before delivery`, { task: taskSummary(task), ...diagnostics });
    return selectedResult(task, parsed, { ...diagnostics, dependencyChecks: Object.freeze(dependencyChecks(task, byId)) });
  }
  if (parsed.route === "AUDIT") return selectedResult(task, parsed, { ...diagnostics, dependencyChecks: Object.freeze(dependencyChecks(task, byId)) });
  if (completeTask(task) || cancelledTask(task)) return Object.freeze({
    outcome: "TERMINAL", route: "IMPLEMENTATION", code: completeTask(task) ? "TASK_COMPLETE" : "TASK_CANCELLED",
    task: taskSummary(task), message: `Task ${task.id} is ${task.taskStatus}; delivery is independent`, mutationRequired: false, ...diagnostics,
  });
  if (draftTask(task)) return blockedResult("DRAFT_AUTHORING_REQUIRED", `Complete Task ${task.id} before implementation`, { task: taskSummary(task), ...diagnostics });
  const checks = Object.freeze(dependencyChecks(task, byId));
  const details = {
    ...diagnostics, dependencyChecks: checks,
    ...(checks.length ? { dependencyGuidance: "Inspect the required code, files, and interfaces in the current worktree before consuming dependency results. Task status, including DONE, does not verify availability; report absent results as concrete blockers or implement prerequisites within the approved goal." } : {}),
  };
  const blockers = exactLocal ? [] : dependencyBlockers(task, byId);
  return blockers.length ? blockedResult("UNSATISFIED_DEPENDENCY", blockers.join("; "), { task: taskSummary(task), blockers, ...details }) : selectedResult(task, parsed, details);
}

export async function allocateNextTaskId(tasksRoot) {
  const inventory = await inspectTaskDirectories(tasksRoot);
  if (inventory.malformed.length > 0 || inventory.conflicts.length > 0) {
    throw taskLayoutError(inventory);
  }
  if (inventory.maxId >= MAX_TASK_NUMBER) {
    throw new TaskArtifactError(
      "TASK_ID_EXHAUSTED",
      `Cannot allocate after Task ${formatTaskId(MAX_TASK_NUMBER)}; four-digit Task IDs are exhausted`,
    );
  }
  return formatTaskId(inventory.maxId + 1);
}

export const allocateNextTaskNumber = allocateNextTaskId;
