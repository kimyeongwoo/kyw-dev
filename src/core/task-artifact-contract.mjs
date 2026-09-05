import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  RELEASE_BEARING_TASK_CONTRACT_VERSION,
  TASK_TEST_STATUS_PAIRS,
  SINGLE_TASK_CONTRACT_VERSION,
  parseTaskMetadata,
  getTaskContractVersion,
  isQueueAwareTaskContractVersion,
  isStableReleaseVersion,
  validateTaskTestContract,
} from "./template-contracts.mjs";
import {
  TaskArtifactError,
  creationLockName,
  normalizeComparable,
  pathState,
  stagingPrefix,
} from "./task-artifact-shared.mjs";

export const MAX_TASK_NUMBER = 9999;
export const MAX_TASK_SLUG_LENGTH = 48;
const TASK_KEY_SUFFIX_HEX_LENGTH = 8;
export const ALL_TASKS_COMPLETE_MESSAGE =
  "현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?";

export const taskDirectoryPattern = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const canonicalNoDependency =
  "- Not applicable — no hard dependency is required for this outcome.";
export const canonicalDependencyPattern = /^- Task (\d{4})\.$/;
export const currentTaskStateByPair = new Map(
  [
    ["DRAFT/DRAFT", "DRAFT"],
    ["READY/READY", "READY"],
    ["IN_PROGRESS/RUNNING", "ACTIVE"],
    ["DONE/PASSED", "COMPLETE"],
    ["BLOCKED/BLOCKED", "BLOCKED"],
    ["CANCELLED/BLOCKED", "CANCELLED"],
  ].map((entry) => Object.freeze(entry)),
);

if (
  currentTaskStateByPair.size !== TASK_TEST_STATUS_PAIRS.length ||
  TASK_TEST_STATUS_PAIRS.some(
    ([taskStatus, testStatus]) => !currentTaskStateByPair.has(`${taskStatus}/${testStatus}`),
  )
) {
  throw new Error("Current Task state classification must cover every valid status pair");
}


export function stripMarkdownComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

export function markdownSection(markdown, heading) {
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

export function firstSectionLine(markdown, heading) {
  if (typeof markdown !== "string") return undefined;
  if (heading === "Status" && getTaskContractVersion(markdown) === SINGLE_TASK_CONTRACT_VERSION) {
    try { return parseTaskMetadata(markdown).status; } catch { return undefined; }
  }
  return stripMarkdownComments(markdownSection(markdown, heading))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

export function parseDeliveryRequirement(taskMarkdown, contractVersion) {
  if (contractVersion === SINGLE_TASK_CONTRACT_VERSION) return Object.freeze({ kind: "OPTIONAL" });
  if (!isQueueAwareTaskContractVersion(contractVersion)) {
    return Object.freeze({ kind: "LEGACY" });
  }
  const lines = stripMarkdownComments(markdownSection(taskMarkdown, "Delivery"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const requirements = lines.filter((line) => line.startsWith("- Requirement:"));
  const releaseVersions = lines.filter((line) =>
    line.startsWith("- Release version:"),
  );
  if (requirements.length !== 1) {
    return Object.freeze({ kind: "INVALID" });
  }
  const [requirement] = requirements;
  if (requirement === "- Requirement: STANDARD") {
    if (contractVersion === RELEASE_BEARING_TASK_CONTRACT_VERSION) {
      if (releaseVersions.length !== 1) {
        return Object.freeze({ kind: "INVALID" });
      }
      const releaseVersion = releaseVersions[0].slice(
        "- Release version: ".length,
      );
      if (!isStableReleaseVersion(releaseVersion)) {
        return Object.freeze({ kind: "INVALID" });
      }
      return Object.freeze({ kind: "STANDARD", releaseVersion });
    }
    if (releaseVersions.length > 0) {
      return Object.freeze({ kind: "INVALID" });
    }
    return Object.freeze({ kind: "STANDARD" });
  }
  if (
    requirement.startsWith("- Requirement: NONE — ") &&
    releaseVersions.length === 0
  ) {
    return Object.freeze({ kind: "NONE", reason: requirement.slice("- Requirement: NONE — ".length) });
  }
  return Object.freeze({ kind: "INVALID" });
}

export function literalHardDependencies(taskMarkdown) {
  const dependencies = [];
  const section = stripMarkdownComments(markdownSection(taskMarkdown, "Dependencies"));
  for (const match of section.matchAll(/\bTask\s+(\d{4})\b/g)) {
    if (!dependencies.includes(match[1])) {
      dependencies.push(match[1]);
    }
  }
  return Object.freeze(dependencies);
}

export function parseCanonicalHardDependencies(taskMarkdown) {
  const section = stripMarkdownComments(markdownSection(taskMarkdown, "Dependencies")).trim();
  if (section === canonicalNoDependency) {
    return Object.freeze({
      dependencies: Object.freeze([]),
      errors: Object.freeze([]),
    });
  }

  const dependencies = [];
  const errors = [];
  if (!section) {
    return Object.freeze({
      dependencies: Object.freeze([]),
      errors: Object.freeze(["Dependencies must not be empty"]),
    });
  }
  const lines = section.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = canonicalDependencyPattern.exec(line);
    if (!match) {
      errors.push(
        `Dependencies line ${index + 1} must be exactly "- Task NNNN." or the section must be exactly "${canonicalNoDependency}"`,
      );
      return;
    }
    if (dependencies.includes(match[1])) {
      errors.push(`Dependencies repeats Task ${match[1]}`);
      return;
    }
    dependencies.push(match[1]);
  });
  return Object.freeze({
    dependencies: Object.freeze(dependencies),
    errors: Object.freeze(errors),
  });
}

export function parseHardDependencies(taskMarkdown, contractVersion, { completedCompatibility = false } = {}) {
  if (contractVersion === SINGLE_TASK_CONTRACT_VERSION) {
    try { return { dependencies: parseTaskMetadata(taskMarkdown).dependencies, errors: [], grammar: "METADATA" }; }
    catch (error) { return { dependencies: [], errors: [error.message], grammar: "INVALID" }; }
  }
  if (!isQueueAwareTaskContractVersion(contractVersion)) {
    return Object.freeze({
      dependencies: Object.freeze([]),
      errors: Object.freeze([]),
      grammar: "LEGACY",
    });
  }
  const canonical = parseCanonicalHardDependencies(taskMarkdown);
  if (canonical.errors.length === 0) {
    return Object.freeze({ ...canonical, grammar: "CANONICAL" });
  }
  if (completedCompatibility) {
    return Object.freeze({
      dependencies: literalHardDependencies(taskMarkdown),
      errors: Object.freeze([]),
      grammar: "COMPLETED_COMPATIBILITY",
    });
  }
  return Object.freeze({ ...canonical, grammar: "INVALID" });
}

export function taskLifecycleState(task) {
  return currentTaskStateByPair.get(`${task.taskStatus}/${task.testStatus}`) ?? "INVALID";
}

export function activeTask(task) {
  return taskLifecycleState(task) === "ACTIVE";
}

export function completeTask(task) {
  return taskLifecycleState(task) === "COMPLETE";
}

export function blockedTask(task) {
  return taskLifecycleState(task) === "BLOCKED";
}

export function cancelledTask(task) {
  return taskLifecycleState(task) === "CANCELLED";
}

export function readyTask(task) {
  return taskLifecycleState(task) === "READY";
}

export function draftTask(task) {
  return taskLifecycleState(task) === "DRAFT";
}

export function taskSummary(task) {
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

export function deriveTaskKey(title) {
  if (typeof title !== "string") {
    throw new TypeError("Task title must be a string");
  }
  const source = normalizeTaskTitle(title.normalize("NFKC")).toLowerCase().normalize("NFKC");
  const normalizedBase = source
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  const portableBase =
    normalizedBase && !/^[a-z]/.test(normalizedBase)
      ? `task-${normalizedBase}`
      : normalizedBase;

  const requiresStableSuffix =
    portableBase.length === 0 ||
    portableBase.length > MAX_TASK_SLUG_LENGTH ||
    /[^\u0000-\u007f]/u.test(source);
  if (!requiresStableSuffix) {
    return portableBase;
  }

  const digest = createHash("sha256")
    .update(source)
    .digest("hex")
    .slice(0, TASK_KEY_SUFFIX_HEX_LENGTH);
  const prefixBudget = MAX_TASK_SLUG_LENGTH - digest.length - 1;
  const prefix = portableBase.slice(0, prefixBudget).replace(/-+$/g, "") || "task";
  return `${prefix}-${digest}`;
}

export function slugifyTaskTitle(title) {
  return deriveTaskKey(title);
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
      return Object.freeze({ entries: [], malformed: [], malformedEntries: [], conflicts: [], maxId: 0 });
    }
    throw new TaskArtifactError("TASK_ROOT_READ_FAILED", `Cannot read tasks root ${tasksRoot}: ${error.message}`, {
      cause: error,
    });
  }

  const entries = [];
  const malformed = [];
  const malformedEntries = [];
  function recordMalformed(name, message) {
    malformed.push(message);
    malformedEntries.push(Object.freeze({ name, id: /^(\d{4})/.exec(name)?.[1], message }));
  }
  for (const entry of directoryEntries) {
    if (entry.name.startsWith(stagingPrefix) || entry.name === creationLockName) {
      continue;
    }
    const parsed = parseTaskDirectoryName(entry.name);
    if (entry.isSymbolicLink()) {
      if (parsed || /^\d{4}-/.test(entry.name)) {
        recordMalformed(entry.name, `${entry.name} is a symbolic link, not a Task directory`);
      }
    } else if (entry.isDirectory()) {
      if (parsed) {
        entries.push(parsed);
      } else {
        recordMalformed(entry.name, `${entry.name} is not a valid NNNN-ascii-kebab Task directory`);
      }
    } else if (parsed) {
      recordMalformed(entry.name, `${entry.name} uses a Task directory name but is not a directory`);
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
    malformedEntries: Object.freeze(malformedEntries),
    conflicts: Object.freeze(conflicts),
    maxId,
  });
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
    for (const name of ["TASK.md", "TEST.md"]) {
      const filePath = path.join(taskDirectory, name);
      const fileState = await pathState(filePath);
      if (!fileState && name === "TEST.md") continue;
      if (!fileState || fileState.isSymbolicLink() || !fileState.isFile()) {
        return [`${name} must be a real regular file`];
      }
      const content = await readFile(filePath, "utf8");
      if (name === "TASK.md") taskMarkdown = content;
      else testMarkdown = content;
    }
  } catch (error) {
    return [`Task directory must contain readable task records: ${error.message}`];
  }

  errors.push(...validateTaskTestContract({ taskMarkdown, testMarkdown }));
  const contractVersion = getTaskContractVersion(taskMarkdown);
  const repositoryComplete =
    firstSectionLine(taskMarkdown, "Status") === "DONE" &&
    firstSectionLine(testMarkdown, "Status") === "PASSED";
  const dependencyParse = parseHardDependencies(taskMarkdown, contractVersion, {
    completedCompatibility: repositoryComplete,
  });
  errors.push(...dependencyParse.errors.map((message) => `TASK.md: ${message}`));
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
