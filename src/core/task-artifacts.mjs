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
  readCanonicalTemplate,
  renderTemplate,
  validateTaskTestContract,
} from "./template-contracts.mjs";

export const MAX_TASK_NUMBER = 9999;
export const MAX_TASK_SLUG_LENGTH = 48;

const taskDirectoryPattern = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const stagingPrefix = ".kyw-dev-task-";
const creationLockName = ".kyw-dev-task-create.lock";

export class TaskArtifactError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "TaskArtifactError";
    this.code = code;
  }
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
