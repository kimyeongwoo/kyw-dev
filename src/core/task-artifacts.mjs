import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  CURRENT_TASK_CONTRACT_VERSION,
  getTaskContractVersion,
  readCanonicalTemplate,
  renderTemplate,
  validateTaskTestContract,
} from "./template-contracts.mjs";

export const MAX_TASK_NUMBER = 9999;
export const MAX_TASK_SLUG_LENGTH = 48;
export const ALL_TASKS_COMPLETE_MESSAGE =
  "현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?";

const taskDirectoryPattern = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const stagingPrefix = ".kyw-dev-task-";
const creationLockName = ".kyw-dev-task-create.lock";
const exactInvocationPattern = /^\$kyw-task\s+(\d{4})(?:\s+([\s\S]*\S))?\s*$/u;
const managedExactAliasPattern = /^task\s+(\d{4})\s+실행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const managedNextAliasPattern = /^task\s+진행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const managedContinuousAliasPattern =
  /^남은\s+task\s+계속\s+실행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const gitShaPattern = /^[0-9a-f]{40}$/;

export class TaskArtifactError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "TaskArtifactError";
    this.code = code;
  }
}

function stripMarkdownComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

function markdownSection(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const normalizedHeading = heading.trim().toLowerCase();
  const collected = [];
  let active = false;

  for (const line of lines) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      active = match[1].trim().toLowerCase() === normalizedHeading;
      continue;
    }
    if (active) {
      collected.push(line);
    }
  }
  return collected.join("\n");
}

function firstSectionLine(markdown, heading) {
  return stripMarkdownComments(markdownSection(markdown, heading))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function parseDeliveryRequirement(taskMarkdown, contractVersion) {
  if (contractVersion !== CURRENT_TASK_CONTRACT_VERSION) {
    return Object.freeze({ kind: "LEGACY" });
  }
  const requirement = stripMarkdownComments(markdownSection(taskMarkdown, "Delivery"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("- Requirement:"));
  if (requirement === "- Requirement: STANDARD") {
    return Object.freeze({ kind: "STANDARD" });
  }
  if (requirement?.startsWith("- Requirement: NONE — ")) {
    return Object.freeze({ kind: "NONE", reason: requirement.slice("- Requirement: NONE — ".length) });
  }
  return Object.freeze({ kind: "INVALID" });
}

function parseHardDependencies(taskMarkdown, contractVersion) {
  if (contractVersion !== CURRENT_TASK_CONTRACT_VERSION) {
    return Object.freeze([]);
  }
  const dependencies = [];
  const section = stripMarkdownComments(markdownSection(taskMarkdown, "Dependencies"));
  for (const match of section.matchAll(/\bTask\s+(\d{4})\b/g)) {
    if (!dependencies.includes(match[1])) {
      dependencies.push(match[1]);
    }
  }
  return Object.freeze(dependencies);
}

function activeTask(task) {
  return task.taskStatus === "IN_PROGRESS" && task.testStatus === "RUNNING";
}

function completeTask(task) {
  return task.taskStatus === "DONE" && task.testStatus === "PASSED";
}

function blockedTask(task) {
  return task.taskStatus === "BLOCKED" && task.testStatus === "BLOCKED";
}

function cancelledTask(task) {
  return task.taskStatus === "CANCELLED" && task.testStatus === "BLOCKED";
}

function readyTask(task) {
  return task.taskStatus === "READY" && task.testStatus === "READY";
}

function draftTask(task) {
  return task.taskStatus === "DRAFT" && task.testStatus === "DRAFT";
}

function taskSummary(task) {
  return Object.freeze({
    id: task.id,
    directory: task.directory,
    name: task.name,
    title: task.title,
    taskStatus: task.taskStatus,
    testStatus: task.testStatus,
    contractVersion: task.contractVersion,
    dependencies: task.dependencies,
    deliveryRequirement: task.deliveryRequirement,
  });
}

function portableFallback(taskId) {
  return taskId ? `$kyw-task ${taskId}` : "$kyw-task NNNN";
}

export function parseTaskInvocation(invocation, { managedRoutingAvailable = false } = {}) {
  if (typeof invocation !== "string") {
    throw new TypeError("Task invocation must be a string");
  }
  const exact = exactInvocationPattern.exec(invocation);
  if (exact) {
    return Object.freeze({
      recognized: true,
      mode: "EXACT",
      source: "PORTABLE_SKILL",
      taskId: exact[1],
      overrideText: exact[2] ?? "",
      overrideScope: "FIRST_SELECTED_TASK",
    });
  }

  const managedExact = managedExactAliasPattern.exec(invocation);
  const managedNext = managedNextAliasPattern.exec(invocation);
  const managedContinuous = managedContinuousAliasPattern.exec(invocation);
  const managed = managedExact ?? managedNext ?? managedContinuous;
  if (!managed) {
    return Object.freeze({ recognized: false, mode: "NONE" });
  }

  const taskId = managedExact?.[1];
  const overrideText = managedExact?.[2] ?? managedNext?.[1] ?? managedContinuous?.[1] ?? "";
  if (!managedRoutingAvailable) {
    const fallback = `${portableFallback(taskId)}${overrideText ? ` ${overrideText}` : ""}`;
    return Object.freeze({
      recognized: true,
      mode: "FALLBACK_REQUIRED",
      source: "MANAGED_ALIAS",
      taskId,
      overrideText,
      overrideScope: "FIRST_SELECTED_TASK",
      portableFallback: fallback,
      message: `Managed repository routing is unavailable on this surface. Use ${fallback}.`,
    });
  }

  return Object.freeze({
    recognized: true,
    mode: managedExact ? "EXACT" : managedContinuous ? "CONTINUOUS" : "NEXT",
    source: "MANAGED_ALIAS",
    taskId,
    overrideText,
    overrideScope: "FIRST_SELECTED_TASK",
  });
}

export function evaluateDeliveryEvidence(taskId, entry, expectation) {
  const issues = [];
  if (!expectation || typeof expectation !== "object" || Array.isArray(expectation)) {
    issues.push(`Task ${taskId} requires trusted local delivery expectations`);
  } else {
    if (expectation.source !== "LOCAL_GIT") {
      issues.push("expectation.source must be LOCAL_GIT");
    }
    if (expectation.taskId !== taskId) {
      issues.push(`expectation.taskId must equal ${taskId}`);
    }
    if (!/^[^/\s]+\/[^/\s]+$/.test(expectation.repository ?? "")) {
      issues.push("expectation.repository must be an exact owner/name identifier");
    }
    if (typeof expectation.baseRef !== "string" || !expectation.baseRef.trim()) {
      issues.push("expectation.baseRef is required");
    }
    if (!gitShaPattern.test(expectation.outcomeSha ?? "")) {
      issues.push("expectation.outcomeSha must be an exact 40-character lowercase Git SHA");
    }
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return Object.freeze({
      satisfied: false,
      issues: Object.freeze([...issues, `Task ${taskId} requires GitHub delivery evidence`]),
    });
  }

  if (entry.source !== "GITHUB") {
    issues.push("source must be GITHUB");
  }
  if (entry.taskId !== taskId) {
    issues.push(`taskId must equal ${taskId}`);
  }
  if (!/^[^/\s]+\/[^/\s]+$/.test(entry.repository ?? "")) {
    issues.push("repository must be an exact owner/name identifier");
  }
  if (entry.repository !== expectation?.repository) {
    issues.push("repository must equal the trusted local expectation");
  }
  if (!gitShaPattern.test(entry.outcomeSha ?? "")) {
    issues.push("outcomeSha must be an exact 40-character lowercase Git SHA");
  }
  if (entry.outcomeSha !== expectation?.outcomeSha) {
    issues.push("outcomeSha must equal the trusted local expectation");
  }
  const pullRequest = entry.pullRequest;
  if (!pullRequest || typeof pullRequest !== "object") {
    issues.push("pullRequest evidence is required");
  } else {
    if (!Number.isInteger(pullRequest.number) || pullRequest.number < 1) {
      issues.push("pullRequest.number must be a positive integer");
    }
    if (pullRequest.headSha !== entry.outcomeSha) {
      issues.push("pullRequest.headSha must equal outcomeSha");
    }
    if (typeof pullRequest.baseRef !== "string" || !pullRequest.baseRef.trim()) {
      issues.push("pullRequest.baseRef is required");
    }
    if (pullRequest.baseRef !== expectation?.baseRef) {
      issues.push("pullRequest.baseRef must equal the trusted local expectation");
    }
    if (!gitShaPattern.test(pullRequest.mergeSha ?? "")) {
      issues.push("pullRequest.mergeSha must be an exact 40-character lowercase Git SHA");
    }
    if (pullRequest.state !== "MERGED") {
      issues.push("pullRequest.state must be MERGED");
    }
    if (pullRequest.checks !== "SUCCESS") {
      issues.push("pullRequest.checks must be SUCCESS");
    }
    if (pullRequest.review !== "CLEAR") {
      issues.push("pullRequest.review must be CLEAR");
    }
    if (!Number.isInteger(pullRequest.runId) || pullRequest.runId < 1) {
      issues.push("pullRequest.runId must be a positive integer");
    }
  }

  const merge = entry.merge;
  if (!merge || typeof merge !== "object") {
    issues.push("merge evidence is required");
  } else {
    if (merge.repository !== entry.repository) {
      issues.push("merge.repository must equal repository");
    }
    if (merge.branch !== pullRequest?.baseRef) {
      issues.push("merge.branch must equal pullRequest.baseRef");
    }
    if (!gitShaPattern.test(merge.sha ?? "")) {
      issues.push("merge.sha must be an exact 40-character lowercase Git SHA");
    }
    if (pullRequest?.mergeSha !== merge.sha) {
      issues.push("pullRequest.mergeSha must equal merge.sha");
    }
    if (merge.mainRunHeadSha !== merge.sha) {
      issues.push("merge.mainRunHeadSha must equal merge.sha");
    }
    if (merge.checks !== "SUCCESS") {
      issues.push("merge.checks must be SUCCESS");
    }
    if (!Number.isInteger(merge.runId) || merge.runId < 1) {
      issues.push("merge.runId must be a positive integer");
    }
  }

  return Object.freeze({ satisfied: issues.length === 0, issues: Object.freeze(issues) });
}

function normalizeComparable(filePath, pathApi) {
  return pathApi.sep === "\\" ? filePath.toLowerCase() : filePath;
}

async function pathState(filePath) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function taskLayoutError(inventory) {
  const details = [...inventory.malformed];
  for (const conflict of inventory.conflicts) {
    details.push(`Task ID ${conflict.id} is used by: ${conflict.names.join(", ")}`);
  }
  return new TaskArtifactError(
    "INVALID_TASK_LAYOUT",
    `Cannot allocate a Task ID until the tasks directory is reconciled:\n- ${details.join("\n- ")}`,
  );
}

export function normalizeTaskTitle(title) {
  if (typeof title !== "string") {
    throw new TypeError("Task title must be a string");
  }
  const normalized = title.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) {
    throw new TaskArtifactError("EMPTY_TASK_TITLE", "Task title must contain visible text");
  }
  return normalized;
}

export function slugifyTaskTitle(title) {
  if (typeof title !== "string") {
    throw new TypeError("Task title must be a string");
  }
  const source = title.normalize("NFKC").trim();
  const ascii = source
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  const bounded = ascii.slice(0, MAX_TASK_SLUG_LENGTH).replace(/-+$/g, "");
  if (bounded) {
    return bounded;
  }
  const digest = createHash("sha256").update(source).digest("hex").slice(0, 8);
  return `task-${digest}`;
}

export const createTaskSlug = slugifyTaskTitle;

export function formatTaskId(value) {
  const number = typeof value === "string" && /^\d{4}$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(number) || number < 1 || number > MAX_TASK_NUMBER) {
    throw new TaskArtifactError(
      "INVALID_TASK_ID",
      `Task ID must be an integer from 1 through ${MAX_TASK_NUMBER}`,
    );
  }
  return String(number).padStart(4, "0");
}

export function parseTaskDirectoryName(name) {
  if (typeof name !== "string") {
    return undefined;
  }
  const match = taskDirectoryPattern.exec(name);
  if (!match || match[1] === "0000" || match[2].length > MAX_TASK_SLUG_LENGTH) {
    return undefined;
  }
  return Object.freeze({
    id: match[1],
    number: Number(match[1]),
    slug: match[2],
    name,
  });
}

export function buildTaskDirectoryName(taskId, slug) {
  const id = formatTaskId(taskId);
  if (typeof slug !== "string" || !slugPattern.test(slug) || slug.length > MAX_TASK_SLUG_LENGTH) {
    throw new TaskArtifactError(
      "INVALID_TASK_SLUG",
      `Task slug must be lowercase ASCII kebab-case with at most ${MAX_TASK_SLUG_LENGTH} characters`,
    );
  }
  return `${id}-${slug}`;
}

export function resolveTaskDirectory(tasksRoot, taskId, slug, pathApi = path) {
  if (typeof tasksRoot !== "string" || !tasksRoot.trim()) {
    throw new TypeError("Tasks root must be a non-empty path string");
  }
  const root = pathApi.resolve(tasksRoot);
  const name = buildTaskDirectoryName(taskId, slug);
  const candidate = pathApi.resolve(root, name);
  if (
    normalizeComparable(pathApi.dirname(candidate), pathApi) !== normalizeComparable(root, pathApi) ||
    pathApi.basename(candidate) !== name
  ) {
    throw new TaskArtifactError("TASK_PATH_ESCAPE", `Task path must be a direct child of ${root}`);
  }
  return candidate;
}

export async function inspectTaskDirectories(tasksRoot) {
  let directoryEntries;
  try {
    directoryEntries = await readdir(tasksRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return Object.freeze({ entries: [], malformed: [], conflicts: [], maxId: 0 });
    }
    throw new TaskArtifactError("TASK_ROOT_READ_FAILED", `Cannot read tasks root ${tasksRoot}: ${error.message}`, {
      cause: error,
    });
  }

  const entries = [];
  const malformed = [];
  for (const entry of directoryEntries) {
    if (entry.name.startsWith(stagingPrefix) || entry.name === creationLockName) {
      continue;
    }
    const parsed = parseTaskDirectoryName(entry.name);
    if (entry.isSymbolicLink()) {
      if (parsed || /^\d{4}-/.test(entry.name)) {
        malformed.push(`${entry.name} is a symbolic link, not a Task directory`);
      }
    } else if (entry.isDirectory()) {
      if (parsed) {
        entries.push(parsed);
      } else {
        malformed.push(`${entry.name} is not a valid NNNN-ascii-kebab Task directory`);
      }
    } else if (parsed) {
      malformed.push(`${entry.name} uses a Task directory name but is not a directory`);
    }
  }

  entries.sort((left, right) => left.number - right.number || left.name.localeCompare(right.name));
  const byId = new Map();
  for (const entry of entries) {
    const names = byId.get(entry.id) ?? [];
    names.push(entry.name);
    byId.set(entry.id, names);
  }
  const conflicts = [...byId.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([id, names]) => Object.freeze({ id, names: Object.freeze(names) }));
  const maxId = entries.at(-1)?.number ?? 0;

  return Object.freeze({
    entries: Object.freeze(entries),
    malformed: Object.freeze(malformed),
    conflicts: Object.freeze(conflicts),
    maxId,
  });
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
      lstat(testPath),
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
  if (testState.isSymbolicLink() || !testState.isFile()) {
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
      readFile(testPath, "utf8"),
    ]);
  } catch (error) {
    return {
      entry,
      errors: [`${entry.name} must contain readable TASK.md and TEST.md: ${error.message}`],
    };
  }

  const errors = validateTaskTestContract({ taskMarkdown, testMarkdown }).map(
    (message) => `${entry.name}: ${message}`,
  );
  const taskId = /^# TASK (\d{4}) — (.+)$/m.exec(taskMarkdown);
  const testId = /^# TEST (\d{4}) — (.+)$/m.exec(testMarkdown);
  if (taskId?.[1] !== entry.id || testId?.[1] !== entry.id) {
    errors.push(
      `${entry.name}: directory ID ${entry.id} must match TASK.md and TEST.md headers (${taskId?.[1] ?? "<missing>"}/${testId?.[1] ?? "<missing>"})`,
    );
  }
  const contractVersion = getTaskContractVersion(taskMarkdown);
  const taskStatus = firstSectionLine(taskMarkdown, "Status");
  const testStatus = firstSectionLine(testMarkdown, "Status");
  const deliveryRequirement = parseDeliveryRequirement(taskMarkdown, contractVersion);
  return {
    entry,
    errors,
    task: Object.freeze({
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
      dependencies: parseHardDependencies(taskMarkdown, contractVersion),
      deliveryRequirement,
      blocker: firstSectionLine(taskMarkdown, "Blockers") ?? "No blocker reason recorded.",
    }),
  };
}

function dependencyGraphErrors(tasks, byId) {
  const currentTasks = tasks.filter(
    (task) => task.contractVersion === CURRENT_TASK_CONTRACT_VERSION,
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

export async function inspectTaskQueue(tasksRoot) {
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

  const inventory = await inspectTaskDirectories(tasksRoot);
  const errors = [...inventory.malformed];
  for (const conflict of inventory.conflicts) {
    errors.push(`Task ID ${conflict.id} is used by: ${conflict.names.join(", ")}`);
  }

  const records = await Promise.all(
    inventory.entries.map((entry) => readTaskQueueEntry(tasksRoot, entry)),
  );
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
    currentTasks: Object.freeze(
      tasks.filter((task) => task.contractVersion === CURRENT_TASK_CONTRACT_VERSION),
    ),
  });
}

function blockedResult(code, message, details = {}) {
  return Object.freeze({ outcome: "BLOCKED", code, message, ...details });
}

function deliveryBlockers(task, deliveryState) {
  if (task.deliveryRequirement.kind !== "STANDARD") {
    return [];
  }
  const evaluation = evaluateDeliveryEvidence(
    task.id,
    deliveryState.ledger?.[task.id],
    deliveryState.expectations?.[task.id],
  );
  return evaluation.satisfied
    ? []
    : evaluation.issues.map((issue) => `Task ${task.id} delivery: ${issue}`);
}

function completionBlockers(task, byId, deliveryState, visited = new Set()) {
  if (visited.has(task.id)) {
    return [];
  }
  visited.add(task.id);
  if (blockedTask(task)) {
    return [`Task ${task.id} is BLOCKED: ${task.blocker}`];
  }
  if (cancelledTask(task)) {
    return [`Task ${task.id} is CANCELLED and cannot satisfy a hard dependency`];
  }
  if (!completeTask(task)) {
    return [`Task ${task.id} is not repository-complete (${task.taskStatus}/${task.testStatus})`];
  }

  const blockers = [...deliveryBlockers(task, deliveryState)];
  for (const dependencyId of task.dependencies) {
    const dependency = byId.get(dependencyId);
    if (!dependency) {
      blockers.push(`Task ${task.id} references missing hard dependency Task ${dependencyId}`);
      continue;
    }
    blockers.push(...completionBlockers(dependency, byId, deliveryState, visited));
  }
  return blockers;
}

function selectionBlockers(task, byId, deliveryState) {
  const blockers = [];
  for (const dependencyId of task.dependencies) {
    const dependency = byId.get(dependencyId);
    if (!dependency) {
      blockers.push(`Task ${task.id} references missing hard dependency Task ${dependencyId}`);
      continue;
    }
    blockers.push(...completionBlockers(dependency, byId, deliveryState));
  }
  return blockers;
}

function terminalGateBlockers(task, byId, deliveryState) {
  return [
    ...selectionBlockers(task, byId, deliveryState),
    ...deliveryBlockers(task, deliveryState),
  ];
}

function priorTransitionBlockers(task, currentTasks, byId, deliveryState) {
  if (task.contractVersion !== CURRENT_TASK_CONTRACT_VERSION) {
    return [];
  }
  const blockers = [];
  for (const prior of currentTasks) {
    if (prior.number >= task.number || (!completeTask(prior) && !cancelledTask(prior))) {
      continue;
    }
    for (const blocker of terminalGateBlockers(prior, byId, deliveryState)) {
      blockers.push(`Cannot advance past Task ${prior.id}: ${blocker}`);
    }
  }
  return blockers;
}

function queueSelectionBlockers(task, currentTasks, byId, deliveryState) {
  return [
    ...selectionBlockers(task, byId, deliveryState),
    ...priorTransitionBlockers(task, currentTasks, byId, deliveryState),
  ];
}

function selectionBlockedResult(task, blockers) {
  const priorTransitionBlocked = blockers.some((blocker) =>
    blocker.startsWith("Cannot advance past Task "),
  );
  return blockedResult(
    priorTransitionBlocked ? "QUEUE_TRANSITION_BLOCKED" : "UNSATISFIED_DEPENDENCY",
    blockers.join("; "),
    { task: taskSummary(task) },
  );
}

function selectedResult(task, parsedInvocation) {
  const action = draftTask(task)
    ? "AUTHOR"
    : blockedTask(task)
      ? "RECHECK_BLOCKER"
      : activeTask(task)
        ? "RESUME"
        : "IMPLEMENT";
  return Object.freeze({
    outcome: "SELECTED",
    mode: parsedInvocation.mode,
    action,
    confirmation: readyTask(task),
    continuous: parsedInvocation.mode === "CONTINUOUS",
    task: taskSummary(task),
    ...(blockedTask(task) ? { blocker: task.blocker } : {}),
    overrideText: parsedInvocation.overrideText,
    overrideScope: parsedInvocation.overrideScope,
  });
}

function terminalTaskResult(task, byId, deliveryState) {
  if (completeTask(task)) {
    const dependencyBlockers = selectionBlockers(task, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult(
        "UNSATISFIED_DEPENDENCY",
        dependencyBlockers.join("; "),
        { task: taskSummary(task) },
      );
    }
    const blockers = deliveryBlockers(task, deliveryState);
    if (blockers.length > 0) {
      return blockedResult(
        "DELIVERY_EVIDENCE_REQUIRED",
        blockers.join("; "),
        { task: taskSummary(task) },
      );
    }
    return Object.freeze({
      outcome: "TERMINAL",
      code: "TASK_COMPLETE",
      message: `Task ${task.id} is repository-complete and required delivery is satisfied.`,
      task: taskSummary(task),
    });
  }
  if (blockedTask(task)) {
    return blockedResult(
      "TASK_BLOCKED",
      `Task ${task.id} is BLOCKED: ${task.blocker}`,
      { task: taskSummary(task) },
    );
  }
  if (cancelledTask(task)) {
    const dependencyBlockers = selectionBlockers(task, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult(
        "UNSATISFIED_DEPENDENCY",
        dependencyBlockers.join("; "),
        { task: taskSummary(task) },
      );
    }
    const blockers = deliveryBlockers(task, deliveryState);
    if (blockers.length > 0) {
      return blockedResult(
        "DELIVERY_EVIDENCE_REQUIRED",
        blockers.join("; "),
        { task: taskSummary(task) },
      );
    }
    return Object.freeze({
      outcome: "TERMINAL",
      code: "TASK_CANCELLED",
      message: `Task ${task.id} is CANCELLED and required delivery is satisfied.`,
      task: taskSummary(task),
    });
  }
  return blockedResult(
    "TASK_NOT_SELECTABLE",
    `Task ${task.id} is not selectable (${task.taskStatus}/${task.testStatus}).`,
    { task: taskSummary(task) },
  );
}

export async function resolveTaskDispatch({
  tasksRoot,
  invocation,
  managedRoutingAvailable = false,
  deliveryLedger = {},
  deliveryExpectations = {},
}) {
  const parsedInvocation = parseTaskInvocation(invocation, { managedRoutingAvailable });
  if (!parsedInvocation.recognized) {
    return Object.freeze({
      outcome: "NOT_TASK_INVOCATION",
      code: "NO_ANCHORED_TASK_COMMAND",
    });
  }
  if (parsedInvocation.mode === "FALLBACK_REQUIRED") {
    return Object.freeze({
      outcome: "FALLBACK_REQUIRED",
      code: "MANAGED_ROUTING_UNAVAILABLE",
      message: parsedInvocation.message,
      portableFallback: parsedInvocation.portableFallback,
    });
  }

  const queue = await inspectTaskQueue(tasksRoot);
  if (queue.errors.length > 0) {
    return blockedResult(
      "INVALID_TASK_QUEUE",
      `Task queue validation failed:\n- ${queue.errors.join("\n- ")}`,
      { errors: queue.errors },
    );
  }

  const byId = new Map(queue.tasks.map((task) => [task.id, task]));
  const deliveryState = Object.freeze({
    ledger: deliveryLedger,
    expectations: deliveryExpectations,
  });
  const active = queue.tasks.filter(activeTask);
  if (active.length > 1) {
    return blockedResult(
      "MULTIPLE_ACTIVE_TASKS",
      `Multiple active Tasks fail closed: ${active.map((task) => task.id).join(", ")}`,
      { taskIds: Object.freeze(active.map((task) => task.id)) },
    );
  }

  if (parsedInvocation.mode === "EXACT") {
    const task = byId.get(parsedInvocation.taskId);
    if (!task) {
      return blockedResult(
        "TASK_NOT_FOUND",
        `No Task directory exists for ${parsedInvocation.taskId}.`,
      );
    }
    if (active.length === 1 && active[0].id !== task.id) {
      return blockedResult(
        "ANOTHER_TASK_ACTIVE",
        `Task ${active[0].id} is active; Task ${task.id} cannot start concurrently.`,
        { task: taskSummary(active[0]) },
      );
    }
    if (activeTask(task)) {
      const blockers = queueSelectionBlockers(
        task,
        queue.currentTasks,
        byId,
        deliveryState,
      );
      return blockers.length === 0
        ? selectedResult(task, parsedInvocation)
        : selectionBlockedResult(task, blockers);
    }
    if (readyTask(task)) {
      const blockers = queueSelectionBlockers(
        task,
        queue.currentTasks,
        byId,
        deliveryState,
      );
      return blockers.length === 0
        ? selectedResult(task, parsedInvocation)
        : selectionBlockedResult(task, blockers);
    }
    if (draftTask(task)) {
      return selectedResult(task, parsedInvocation);
    }
    if (blockedTask(task)) {
      const blockers = queueSelectionBlockers(
        task,
        queue.currentTasks,
        byId,
        deliveryState,
      );
      return blockers.length === 0
        ? selectedResult(task, parsedInvocation)
        : selectionBlockedResult(task, blockers);
    }
    return terminalTaskResult(task, byId, deliveryState);
  }

  if (active.length === 1) {
    const task = active[0];
    const blockers = queueSelectionBlockers(
      task,
      queue.currentTasks,
      byId,
      deliveryState,
    );
    return blockers.length === 0
      ? selectedResult(task, parsedInvocation)
      : selectionBlockedResult(task, blockers);
  }

  if (queue.currentTasks.length === 0) {
    return blockedResult(
      "CURRENT_QUEUE_UNAVAILABLE",
      "No current-contract Task queue exists. Select an existing Task with $kyw-task NNNN.",
    );
  }

  const ready = queue.currentTasks.filter(readyTask).sort((left, right) => left.number - right.number);
  const unavailable = [];
  for (const task of ready) {
    const blockers = queueSelectionBlockers(
      task,
      queue.currentTasks,
      byId,
      deliveryState,
    );
    if (blockers.length === 0) {
      return selectedResult(task, parsedInvocation);
    }
    unavailable.push(`Task ${task.id}: ${blockers.join("; ")}`);
  }
  if (unavailable.length > 0) {
    return blockedResult("NO_DEPENDENCY_SATISFIED_TASK", unavailable.join("\n"), {
      blockers: Object.freeze(unavailable),
    });
  }

  const frontier = [...queue.currentTasks].sort((left, right) => left.number - right.number).at(-1);
  if (blockedTask(frontier)) {
    return blockedResult(
      "QUEUE_FRONTIER_BLOCKED",
      `Task ${frontier.id} is the current queue frontier and is BLOCKED: ${frontier.blocker}`,
      { task: taskSummary(frontier) },
    );
  }
  if (completeTask(frontier)) {
    const transitionBlockers = priorTransitionBlockers(
      frontier,
      queue.currentTasks,
      byId,
      deliveryState,
    );
    if (transitionBlockers.length > 0) {
      return blockedResult("QUEUE_TRANSITION_BLOCKED", transitionBlockers.join("; "), {
        task: taskSummary(frontier),
      });
    }
    const dependencyBlockers = selectionBlockers(frontier, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult("UNSATISFIED_DEPENDENCY", dependencyBlockers.join("; "), {
        task: taskSummary(frontier),
      });
    }
    const delivery = deliveryBlockers(frontier, deliveryState);
    if (delivery.length > 0) {
      return blockedResult("DELIVERY_EVIDENCE_REQUIRED", delivery.join("; "), {
        task: taskSummary(frontier),
      });
    }
    return Object.freeze({
      outcome: "NO_WORK",
      code: "ALL_TASKS_COMPLETE",
      message: ALL_TASKS_COMPLETE_MESSAGE,
      task: taskSummary(frontier),
    });
  }
  if (cancelledTask(frontier)) {
    const transitionBlockers = priorTransitionBlockers(
      frontier,
      queue.currentTasks,
      byId,
      deliveryState,
    );
    if (transitionBlockers.length > 0) {
      return blockedResult("QUEUE_TRANSITION_BLOCKED", transitionBlockers.join("; "), {
        task: taskSummary(frontier),
      });
    }
    const dependencyBlockers = selectionBlockers(frontier, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult("UNSATISFIED_DEPENDENCY", dependencyBlockers.join("; "), {
        task: taskSummary(frontier),
      });
    }
    const delivery = deliveryBlockers(frontier, deliveryState);
    if (delivery.length > 0) {
      return blockedResult("DELIVERY_EVIDENCE_REQUIRED", delivery.join("; "), {
        task: taskSummary(frontier),
      });
    }
    return Object.freeze({
      outcome: "NO_WORK",
      code: "ALL_TASKS_COMPLETE",
      message: ALL_TASKS_COMPLETE_MESSAGE,
      task: taskSummary(frontier),
    });
  }
  return blockedResult(
    "NO_SELECTABLE_TASK",
    `No READY or active Task exists; current queue frontier Task ${frontier.id} is ${frontier.taskStatus}/${frontier.testStatus}.`,
    { task: taskSummary(frontier) },
  );
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

async function ensureTasksRoot(tasksRoot) {
  try {
    await mkdir(tasksRoot, { recursive: true });
  } catch (error) {
    throw new TaskArtifactError("TASK_ROOT_CREATE_FAILED", `Cannot create tasks root ${tasksRoot}: ${error.message}`, {
      cause: error,
    });
  }
  const state = await lstat(tasksRoot);
  if (state.isSymbolicLink()) {
    throw new TaskArtifactError("SYMLINK_TASK_ROOT", `Refusing to create Task artifacts through symlink ${tasksRoot}`);
  }
  if (!state.isDirectory()) {
    throw new TaskArtifactError("INVALID_TASK_ROOT", `Tasks root is not a directory: ${tasksRoot}`);
  }
  return realpath(tasksRoot);
}

async function releaseCreationLock(lockHandle, lockPath) {
  if (!lockHandle) {
    return;
  }
  await lockHandle.close();
  try {
    await unlink(lockPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function createTaskArtifacts({ tasksRoot, title, templateRoot, hooks = {} }) {
  const normalizedTitle = normalizeTaskTitle(title);
  const resolvedRoot = await ensureTasksRoot(tasksRoot);
  const id = await allocateNextTaskId(resolvedRoot);
  const slug = slugifyTaskTitle(normalizedTitle);
  const directory = resolveTaskDirectory(resolvedRoot, id, slug);
  const directoryName = path.basename(directory);
  const stageDirectory = path.join(resolvedRoot, `${stagingPrefix}${directoryName}-${randomUUID()}.tmp`);
  const lockPath = path.join(resolvedRoot, creationLockName);
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");

  const [taskTemplate, testTemplate] = await Promise.all([
    readCanonicalTemplate("TASK", templateRoot),
    readCanonicalTemplate("TEST", templateRoot),
  ]);
  const templateValues = { TASK_ID: id, TASK_TITLE: normalizedTitle };
  const taskMarkdown = renderTemplate(taskTemplate, templateValues);
  const testMarkdown = renderTemplate(testTemplate, templateValues);
  const contractErrors = validateTaskTestContract({ taskMarkdown, testMarkdown });
  if (contractErrors.length > 0) {
    throw new TaskArtifactError(
      "INVALID_TASK_TEMPLATES",
      `Rendered Task templates do not satisfy their contract:\n- ${contractErrors.join("\n- ")}`,
    );
  }

  let lockHandle;
  let published = false;
  try {
    await mkdir(stageDirectory);
    await writeFile(path.join(stageDirectory, "TASK.md"), taskMarkdown, { encoding: "utf8", flag: "wx" });
    if (hooks.afterTaskWrite) {
      await hooks.afterTaskWrite({ stageDirectory, id, slug });
    }
    await writeFile(path.join(stageDirectory, "TEST.md"), testMarkdown, { encoding: "utf8", flag: "wx" });

    try {
      lockHandle = await open(lockPath, "wx");
    } catch (error) {
      if (error.code === "EEXIST") {
        throw new TaskArtifactError(
          "TASK_CREATION_LOCKED",
          `Another Task creation or an unrecovered lock exists at ${lockPath}`,
          { cause: error },
        );
      }
      throw error;
    }

    const currentId = await allocateNextTaskId(resolvedRoot);
    if (currentId !== id || (await pathState(directory))) {
      throw new TaskArtifactError(
        "TASK_CREATION_CONFLICT",
        `Task ${id} was claimed before ${directoryName} could be published; retry allocation`,
      );
    }
    await rename(stageDirectory, directory);
    published = true;
  } catch (error) {
    if (!published) {
      try {
        await rm(stageDirectory, { recursive: true, force: true });
      } catch (cleanupError) {
        throw new TaskArtifactError(
          "TASK_STAGE_CLEANUP_FAILED",
          `Task creation failed and staged content could not be removed from ${stageDirectory}: ${cleanupError.message}`,
          { cause: error },
        );
      }
    }
    if (error instanceof TaskArtifactError) {
      throw error;
    }
    throw new TaskArtifactError("TASK_CREATION_FAILED", `Could not create Task ${id}: ${error.message}`, {
      cause: error,
    });
  } finally {
    await releaseCreationLock(lockHandle, lockPath);
  }

  return Object.freeze({ id, slug, directory, taskPath, testPath });
}

export async function validateTaskDirectory(taskDirectory) {
  const errors = [];
  const state = await pathState(taskDirectory);
  if (!state) {
    return [`Task directory does not exist: ${taskDirectory}`];
  }
  if (state.isSymbolicLink()) {
    return [`Task directory must not be a symbolic link: ${taskDirectory}`];
  }
  if (!state.isDirectory()) {
    return [`Task path is not a directory: ${taskDirectory}`];
  }

  const parsed = parseTaskDirectoryName(path.basename(taskDirectory));
  if (!parsed) {
    errors.push(`Task directory name is invalid: ${path.basename(taskDirectory)}`);
  }

  let taskMarkdown;
  let testMarkdown;
  try {
    [taskMarkdown, testMarkdown] = await Promise.all([
      readFile(path.join(taskDirectory, "TASK.md"), "utf8"),
      readFile(path.join(taskDirectory, "TEST.md"), "utf8"),
    ]);
  } catch (error) {
    errors.push(`Task directory must contain readable TASK.md and TEST.md: ${error.message}`);
    return errors;
  }

  errors.push(...validateTaskTestContract({ taskMarkdown, testMarkdown }));
  if (parsed) {
    const taskId = /^# TASK (\d{4}) —/m.exec(taskMarkdown)?.[1];
    const testId = /^# TEST (\d{4}) —/m.exec(testMarkdown)?.[1];
    if (taskId && taskId !== parsed.id) {
      errors.push(`TASK.md ID ${taskId} does not match directory ID ${parsed.id}`);
    }
    if (testId && testId !== parsed.id) {
      errors.push(`TEST.md ID ${testId} does not match directory ID ${parsed.id}`);
    }
  }
  return errors;
}
