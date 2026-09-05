import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import {
  STANDARD_DELIVERY_CONTINUITY_FILE,
  STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH,
  buildStandardDeliveryContinuityState,
  createStandardDeliveryContinuityCheckpoint,
  digestStandardDeliveryContinuityEvidence,
  digestStandardDeliveryContinuityTerminalPairs,
  parseStandardDeliveryContinuityCheckpoint,
  parseStandardDeliveryContinuityTransitionToken,
  partitionStandardDeliveryContinuity,
  writeStandardDeliveryContinuityCheckpoint,
} from "./task-artifact-continuity.mjs";
import {
  evaluateDeliveryEvidence,
  parseTaskInvocation,
} from "./task-artifact-delivery.mjs";
import { parseDeliveryRequirement } from "./task-artifact-contract.mjs";
import {
  classifyPublicReleaseState,
  assertPublicReleaseRepository,
  derivePublicReleaseWorkflowInputs,
  freezePublicReleaseTuple,
  recoverPublicReleaseSigningTuple,
  publicationWasSkipped,
  PUBLIC_RELEASE_PUBLISH_JOB,
  PUBLIC_RELEASE_PUBLISH_STEP,
} from "./task-artifact-public-release.mjs";
import {
  inspectTaskQueue,
  parseTaskQueueMarkdownPair,
} from "./task-artifact-queue.mjs";
import { TaskArtifactError } from "./task-artifact-shared.mjs";
import {
  getTaskContractVersion,
  IMMUTABLE_TERMINAL_TASK_CONTRACT_VERSIONS,
  isImmutableTerminalTaskContractVersion,
  isQueueAwareTaskContractVersion,
  isStableReleaseVersion,
  RELEASE_BEARING_TASK_CONTRACT_VERSION,
} from "./template-contracts.mjs";

const SHA_PATTERN = /^[a-f0-9]{40}$/;
const TASK_BRANCH_IDENTITY_PATTERN =
  /^(?:agent\/)?task(?:\/|-)(\d{4})(?:-|$)/u;
const MAX_REQUIRED_DELIVERIES = 128;
const MAX_FIRST_PARENT_COMMITS = 4096;
const MAX_TASK_PATH_COMMITS = 64;
const MAX_GITHUB_RESULTS = 100;
const MAX_REVIEW_PAGES = 2;
const MAX_RUN_ATTEMPTS = 10;
const MAX_COMMANDS = 1024;
const MAX_LOG_BYTES = 8 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 30_000;
const WORKFLOW_PATH = ".github/workflows/ci.yml";
const FUTURE_TERMINAL_CORRECTION_ROUTE = '$kyw-task "<correction outcome>"';
const requireFromRuntime = createRequire(import.meta.url);

function hydrationError(taskId, role, message, code = "DELIVERY_HYDRATION_FAILED") {
  const taskLabel = taskId ? `Task ${taskId}` : "delivery hydration";
  const roleLabel = role ? ` ${role}` : "";
  return new TaskArtifactError(code, `${taskLabel}${roleLabel}: ${message}`);
}

function immutableTerminalPairError(taskId, relativePath, detail) {
  const pathLabel = relativePath?.replaceAll("\\", "/") ?? `docs/tasks/${taskId}-*/`;
  return hydrationError(
    taskId,
    "TERMINAL_PAIR_IMMUTABILITY",
    `${pathLabel}: ${detail}. Preserve the delivered pair byte-for-byte and use ${FUTURE_TERMINAL_CORRECTION_ROUTE}; the correction Task must hard-depend on Task ${taskId}`,
    "FUTURE_TERMINAL_PAIR_IMMUTABLE",
  );
}

async function tasksRootMatchesRepository(requestedRoot, repositoryRoot) {
  const [requestedPhysical, expectedPhysical] = await Promise.all([
    realpath(requestedRoot),
    realpath(path.resolve(repositoryRoot, "docs", "tasks")),
  ]);
  return requestedPhysical.toLowerCase() === expectedPhysical.toLowerCase();
}

function completeTask(task) {
  return task.taskStatus === "DONE" && task.testStatus === "PASSED";
}

function releaseBearingStandardTask(task) {
  return (
    task?.contractVersion === RELEASE_BEARING_TASK_CONTRACT_VERSION &&
    task?.deliveryRequirement?.kind === "STANDARD" &&
    isStableReleaseVersion(task.deliveryRequirement.releaseVersion)
  );
}

function cancelledTask(task) {
  return task.taskStatus === "CANCELLED" && task.testStatus === "BLOCKED";
}

function activeTask(task) {
  return task.taskStatus === "IN_PROGRESS" && task.testStatus === "RUNNING";
}

function selectableTask(task) {
  return (
    activeTask(task) ||
    (task.taskStatus === "READY" && task.testStatus === "READY") ||
    (task.taskStatus === "BLOCKED" && task.testStatus === "BLOCKED")
  );
}

function requiresStandardDelivery(task) {
  return task.deliveryRequirement?.kind === "STANDARD";
}

function addCompletionClosure(task, byId, selected, visited = new Set()) {
  if (!task || visited.has(task.id)) return;
  visited.add(task.id);
  for (const dependencyId of task.dependencies ?? []) {
    addCompletionClosure(byId.get(dependencyId), byId, selected, visited);
  }
  if (completeTask(task) && requiresStandardDelivery(task)) {
    selected.set(task.id, task);
  }
}

function addSelectionPrerequisites(task, currentTasks, byId, selected) {
  for (const dependencyId of task.dependencies ?? []) {
    addCompletionClosure(byId.get(dependencyId), byId, selected);
  }
  if (!isQueueAwareTaskContractVersion(task.contractVersion)) return;
  for (const prior of currentTasks) {
    if (
      prior.number >= task.number ||
      (!completeTask(prior) && !cancelledTask(prior))
    ) {
      continue;
    }
    addCompletionClosure(prior, byId, selected);
  }
}

/**
 * Mirrors only the dispatcher's read-only delivery prerequisites. The dispatcher
 * remains the selection authority and is called once after hydration succeeds.
 */
function discoverStandardDeliveryHydrationPlan({
  tasks,
  invocation,
  managedRoutingAvailable = false,
  parsedInvocation: suppliedParsedInvocation,
}) {
  const parsed =
    suppliedParsedInvocation ??
    parseTaskInvocation(invocation, { managedRoutingAvailable });
  if (!parsed.recognized || parsed.mode === "FALLBACK_REQUIRED") {
    return Object.freeze({
      requiredTasks: Object.freeze([]),
      currentDeliveryTask: undefined,
    });
  }

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const currentTasks = tasks
    .filter((task) => isQueueAwareTaskContractVersion(task.contractVersion))
    .sort((left, right) => left.number - right.number);
  const active = tasks.filter(activeTask);
  const selected = new Map();

  if (parsed.mode === "EXACT") {
    const task = byId.get(parsed.taskId);
    if (!task || (active.length === 1 && active[0].id !== task.id)) {
      return Object.freeze({
        requiredTasks: Object.freeze([]),
        currentDeliveryTask: undefined,
      });
    }
    if (parsed.route === "DELIVERY") {
      if (completeTask(task) && requiresStandardDelivery(task) && active.length === 0) {
        addSelectionPrerequisites(task, currentTasks, byId, selected);
      }
    } else if (selectableTask(task)) {
      addSelectionPrerequisites(task, currentTasks, byId, selected);
    } else if (completeTask(task) || cancelledTask(task)) {
      addSelectionPrerequisites(task, currentTasks, byId, selected);
    }
  } else if (active.length === 1) {
    addSelectionPrerequisites(active[0], currentTasks, byId, selected);
  } else if (active.length === 0) {
    for (const task of currentTasks) {
      if (completeTask(task) || cancelledTask(task)) {
        addCompletionClosure(task, byId, selected);
      }
    }
  }

  if (selected.size > MAX_REQUIRED_DELIVERIES) {
    throw hydrationError(
      undefined,
      "QUEUE",
      `required delivery count ${selected.size} exceeds bound ${MAX_REQUIRED_DELIVERIES}`,
      "DELIVERY_HYDRATION_BOUND_EXCEEDED",
    );
  }
  const exactTask =
    parsed.mode === "EXACT" ? byId.get(parsed.taskId) : undefined;
  const currentDeliveryTask =
    exactTask && completeTask(exactTask) && requiresStandardDelivery(exactTask)
      ? exactTask
      : undefined;
  if (currentDeliveryTask) selected.delete(currentDeliveryTask.id);
  return Object.freeze({
    requiredTasks: Object.freeze(
      [...selected.values()].sort((left, right) => left.number - right.number),
    ),
    currentDeliveryTask,
  });
}

export function discoverRequiredStandardDeliveries(options) {
  return discoverStandardDeliveryHydrationPlan(options).requiredTasks;
}

function defaultCommandRunner({ command, args, cwd, timeoutMs, maxBuffer }) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: timeoutMs,
    maxBuffer,
    shell: false,
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

function failureKind(result) {
  try {
    const errorCode = result?.error?.code;
    const diagnostic = `${result?.error?.message ?? ""}\n${result?.stderr ?? ""}`.toLowerCase();
    if (errorCode === "ETIMEDOUT" || diagnostic.includes("timed out")) return "timeout";
    if (
      diagnostic.includes("not logged") ||
      diagnostic.includes("authentication") ||
      diagnostic.includes("bad credentials")
    ) {
      return "authentication failure";
    }
    if (diagnostic.includes("rate limit") || diagnostic.includes("secondary rate")) {
      return "rate limit";
    }
    if (diagnostic.includes("forbidden") || diagnostic.includes("resource not accessible")) {
      return "authorization failure";
    }
    if (errorCode === "ENOENT") return "command unavailable";
  } catch {
    // Hostile or malformed runner diagnostics must not escape the redaction boundary.
  }
  return "command failure";
}

function normalizeCommandRunnerFailure(error) {
  return Object.freeze({
    kind: "RUNNER_ERROR",
    failureKind: failureKind({ error }),
  });
}

function normalizeCommandCompletion(result) {
  try {
    const normalized = Object.freeze({
      status: result?.status,
      stdout: String(result?.stdout ?? ""),
      stderr: String(result?.stderr ?? ""),
      signal: result?.signal,
      error: result?.error,
    });
    return Object.freeze({
      kind: "COMPLETION",
      result: normalized,
      failureKind: failureKind(normalized),
    });
  } catch (error) {
    return normalizeCommandRunnerFailure(error);
  }
}

export function createInvocationCommandCache({
  runner = defaultCommandRunner,
  maxCommands = MAX_COMMANDS,
} = {}) {
  if (!Number.isSafeInteger(maxCommands) || maxCommands < 0) {
    throw new TypeError("maxCommands must be a non-negative safe integer");
  }
  const cache = new Map();
  let hits = 0;
  let misses = 0;
  let gitCommands = 0;
  let githubApiCommands = 0;
  let jobLogFetches = 0;

  async function run({
    command,
    args,
    cwd,
    taskId,
    role,
    allowFailure = false,
    maxBuffer = MAX_LOG_BYTES,
  }) {
    if (!Number.isSafeInteger(maxBuffer) || maxBuffer < 0) {
      throw hydrationError(
        taskId,
        role,
        "maxBuffer must be a non-negative safe integer",
        "DELIVERY_HYDRATION_BOUND_EXCEEDED",
      );
    }
    const executionArgs = Object.freeze([...args]);
    const executionCwd = path.resolve(cwd);
    const key = JSON.stringify([command, executionArgs, executionCwd, maxBuffer]);
    if (cache.has(key)) {
      hits += 1;
    } else {
      if (misses >= maxCommands) {
        throw hydrationError(
          taskId,
          role,
          `query bound ${maxCommands} was exhausted`,
          "DELIVERY_HYDRATION_BOUND_EXCEEDED",
        );
      }
      misses += 1;
      if (command === "git") gitCommands += 1;
      if (command === "gh" && executionArgs[0] === "api") githubApiCommands += 1;
      if (
        command === "gh" &&
        executionArgs[0] === "run" &&
        executionArgs.includes("--log")
      ) {
        jobLogFetches += 1;
      }
      let pending;
      try {
        const runnerResult = runner({
          command,
          args: [...executionArgs],
          cwd: executionCwd,
          timeoutMs: COMMAND_TIMEOUT_MS,
          maxBuffer,
        });
        pending = Promise.resolve(runnerResult).then(
          normalizeCommandCompletion,
          normalizeCommandRunnerFailure,
        );
      } catch (error) {
        pending = Promise.resolve(normalizeCommandRunnerFailure(error));
      }
      cache.set(key, pending);
    }
    const record = await cache.get(key);
    if (record.kind === "RUNNER_ERROR") {
      throw hydrationError(
        taskId,
        role,
        `${record.failureKind}; required evidence is unavailable`,
        "DELIVERY_HYDRATION_EXTERNAL_FAILURE",
      );
    }
    const { result } = record;
    if (result.status !== 0 && !allowFailure) {
      throw hydrationError(
        taskId,
        role,
        `${record.failureKind}; required evidence is unavailable`,
        "DELIVERY_HYDRATION_EXTERNAL_FAILURE",
      );
    }
    return result;
  }

  return Object.freeze({
    run,
    stats: () => Object.freeze({ hits, misses, entries: cache.size, maxCommands }),
    details: () =>
      Object.freeze({
        hits,
        misses,
        entries: cache.size,
        maxCommands,
        gitCommands,
        githubApiCommands,
        jobLogFetches,
      }),
  });
}

function requireSha(value, taskId, role, label) {
  if (!SHA_PATTERN.test(value ?? "")) {
    throw hydrationError(taskId, role, `${label} must be a lowercase 40-character SHA`);
  }
  return value;
}

function parseRepositorySlug(remoteUrl) {
  const match =
    /github\.com[/:]([^/\s:]+)\/([^/\s]+?)(?:\.git)?$/.exec(remoteUrl.trim());
  if (!match) {
    throw hydrationError(
      undefined,
      "LOCAL_GIT",
      "origin must identify a GitHub owner/repository",
    );
  }
  return `${match[1]}/${match[2]}`;
}

function sectionStatus(markdown) {
  return /^## Status\r?\n\r?\n([A-Z_]+)\s*$/m.exec(markdown)?.[1];
}

function parseWorkflowJobBlocks(workflowText) {
  const lines = workflowText.split(/\r?\n/);
  const jobs = [];
  let current;
  for (const line of lines) {
    const jobStart = /^  ([a-zA-Z0-9_-]+):\s*$/.exec(line);
    if (jobStart) {
      if (current) jobs.push(current);
      current = { key: jobStart[1], lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) jobs.push(current);
  return jobs.map((job) => {
    const text = job.lines.join("\n");
    const name = /^\s{4}name:\s*(.+?)\s*$/m.exec(text)?.[1]?.replace(/^["']|["']$/g, "");
    const labels = [...text.matchAll(/^\s{10}- label:\s*(.+?)\s*$/gm)].map(
      (match) => match[1].replace(/^["']|["']$/g, ""),
    );
    const names = name?.includes("${{ matrix.label }}")
      ? labels.map((label) => name.replace("${{ matrix.label }}", label))
      : name
        ? [name]
        : [];
    return Object.freeze({ key: job.key, name, names: Object.freeze(names), text });
  });
}

export function parseHardenedWorkflowContract(workflowText) {
  const hasEvidenceMarker = /KYWCIEVIDENCE|EVIDENCE_ROLE|EXPECTED_SYNTHETIC_SHA/.test(
    workflowText,
  );
  if (!hasEvidenceMarker) return false;
  const requiredMarkers = [
    "PR_ACTUAL_HEAD",
    "PR_MERGE_COMPATIBILITY",
    "POST_MERGE_MAIN",
    "schema=2",
  ];
  if (requiredMarkers.some((marker) => !workflowText.includes(marker))) {
    throw hydrationError(
      undefined,
      "LOCAL_WORKFLOW",
      "partial exact-SHA evidence markers cannot define a hardened contract",
    );
  }

  const workflowName = /^name:\s*(.+?)\s*$/m
    .exec(workflowText)?.[1]
    ?.replace(/^["']|["']$/g, "");
  const blocks = parseWorkflowJobBlocks(workflowText);
  const actualBlocks = blocks.filter(
    (block) =>
      block.text.includes("PR_ACTUAL_HEAD") &&
      block.text.includes("POST_MERGE_MAIN") &&
      !block.text.includes("PR_MERGE_COMPATIBILITY"),
  );
  const mergeBlock = blocks.find((block) =>
    block.text.includes("PR_MERGE_COMPATIBILITY"),
  );
  const requiredBlock = blocks.find((block) => block.key === "required");
  const actualHeadJobs = actualBlocks.flatMap((block) => block.names);
  if (
    workflowName !== "CI" ||
    actualHeadJobs.length === 0 ||
    mergeBlock?.names.length !== 1 ||
    requiredBlock?.names.length !== 1
  ) {
    throw hydrationError(
      undefined,
      "LOCAL_WORKFLOW",
      "hardened workflow jobs or names are incomplete",
    );
  }

  const jobKeys = {};
  for (const block of actualBlocks) {
    for (const name of block.names) jobKeys[name] = block.key;
  }
  jobKeys[mergeBlock.names[0]] = mergeBlock.key;
  jobKeys[requiredBlock.names[0]] = requiredBlock.key;
  return Object.freeze({
    name: workflowName,
    path: WORKFLOW_PATH,
    actualHeadJobs: Object.freeze(actualHeadJobs),
    postMergeJobs: Object.freeze([...actualHeadJobs]),
    mergeCompatibilityJob: mergeBlock.names[0],
    requiredGateJob: requiredBlock.names[0],
    jobKeys: Object.freeze(jobKeys),
  });
}

export async function classifyLocalDeliveryContracts(
  outcomes,
  { currentMainSha, isAncestor },
) {
  requireSha(currentMainSha, undefined, "LOCAL_GIT", "current main");
  const ordered = [...outcomes].sort(
    (left, right) => left.firstParentIndex - right.firstParentIndex,
  );
  const hardenedIndex = ordered.findIndex((outcome) => Boolean(outcome.hardenedWorkflow));
  const contractAnchorSha =
    hardenedIndex === -1 ? currentMainSha : ordered[hardenedIndex].baseSha;
  requireSha(contractAnchorSha, undefined, "LOCAL_GIT", "contract anchor");

  const classified = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const outcome = ordered[index];
    requireSha(outcome.baseSha, outcome.taskId, "LOCAL_GIT", "base SHA");
    requireSha(outcome.outcomeSha, outcome.taskId, "LOCAL_GIT", "outcome SHA");
    requireSha(outcome.mergeSha, outcome.taskId, "LOCAL_GIT", "merge SHA");
    if (!(await isAncestor(outcome.mergeSha, currentMainSha))) {
      throw hydrationError(
        outcome.taskId,
        "LOCAL_GIT",
        "terminal merge is not an ancestor of current main",
      );
    }
    if (index < hardenedIndex || hardenedIndex === -1) {
      const outcomeEligible = await isAncestor(outcome.outcomeSha, contractAnchorSha);
      const mergeEligible = await isAncestor(outcome.mergeSha, contractAnchorSha);
      if (!outcomeEligible || !mergeEligible) {
        throw hydrationError(
          outcome.taskId,
          "LEGACY_PRE_CONTRACT",
          "outcome and merge must both be ancestor-proven at or before the contract anchor",
        );
      }
      classified.push({ ...outcome, classification: "LEGACY_PRE_CONTRACT" });
      continue;
    }
    if (!outcome.hardenedWorkflow) {
      throw hydrationError(
        outcome.taskId,
        "HARDENED_EXACT_HEAD",
        "an outcome at or after the hardened boundary cannot be downgraded to legacy",
      );
    }
    classified.push({ ...outcome, classification: "HARDENED_EXACT_HEAD" });
  }
  return Object.freeze({
    contractAnchorSha,
    outcomes: Object.freeze(classified.map((outcome) => Object.freeze(outcome))),
  });
}

async function git(cache, cwd, args, { taskId, role, allowFailure = false } = {}) {
  return cache.run({
    command: "git",
    args,
    cwd,
    taskId,
    role: role ?? "LOCAL_GIT",
    allowFailure,
    maxBuffer: MAX_LOG_BYTES,
  });
}

async function gitText(cache, cwd, args, context) {
  return (await git(cache, cwd, args, context)).stdout.trim();
}

function stripFinalGitCommandDelimiter(stdout) {
  const text = String(stdout);
  if (text.endsWith("\r\n")) return text.slice(0, -2);
  if (text.endsWith("\n")) return text.slice(0, -1);
  return text;
}

export async function gitScalarText(cache, cwd, args, context) {
  return stripFinalGitCommandDelimiter(
    (await git(cache, cwd, args, context)).stdout,
  );
}

export async function gitPorcelainText(cache, cwd, args, context) {
  return (await git(cache, cwd, args, context)).stdout;
}

async function gitIsAncestor(cache, cwd, ancestor, descendant) {
  const result = await git(
    cache,
    cwd,
    ["merge-base", "--is-ancestor", ancestor, descendant],
    { role: "LOCAL_GIT", allowFailure: true },
  );
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw hydrationError(
    undefined,
    "LOCAL_GIT",
    "ancestry query failed",
    "DELIVERY_HYDRATION_EXTERNAL_FAILURE",
  );
}

async function showGitFile(cache, repositoryRoot, sha, relativePath, taskId) {
  const result = await git(
    cache,
    repositoryRoot,
    ["show", `${sha}:${relativePath.replaceAll("\\", "/")}`],
    { taskId, role: "LOCAL_GIT", allowFailure: true },
  );
  return result.status === 0 ? result.stdout : undefined;
}

function taskPairPathMatch(taskId, relativePath, { allowCaseConfusion = false } = {}) {
  const normalized = relativePath.replaceAll("\\", "/");
  const match = new RegExp(
    `^docs/tasks/(${taskId}-[a-z0-9]+(?:-[a-z0-9]+)*)/(TASK|TEST)\\.md$`,
    allowCaseConfusion ? "i" : "",
  ).exec(normalized);
  return match
    ? Object.freeze({
        directory: match[1],
        kind: match[2].toUpperCase(),
        relativePath: normalized,
      })
    : undefined;
}

function anyTaskPairPathMatch(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  const match =
    /^docs\/tasks\/(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\/(TASK|TEST)\.md$/.exec(
      normalized,
    );
  return match
    ? Object.freeze({
        id: match[1],
        number: Number(match[1]),
        directory: `${match[1]}-${match[2]}`,
        kind: match[3],
        relativePath: normalized,
      })
    : undefined;
}

function immutableTerminalTaskFromMarkdown({
  tasksRoot,
  pair,
  taskMarkdown,
  testMarkdown,
}) {
  const taskContractVersion = getTaskContractVersion(taskMarkdown);
  if (
    !isImmutableTerminalTaskContractVersion(taskContractVersion) ||
    getTaskContractVersion(testMarkdown) !== taskContractVersion ||
    sectionStatus(taskMarkdown) !== "DONE" ||
    sectionStatus(testMarkdown) !== "PASSED"
  ) {
    return undefined;
  }
  const parsed = parseTaskQueueMarkdownPair({
    tasksRoot,
    entry: {
      id: pair.id,
      number: pair.number,
      name: pair.directory,
      slug: pair.directory.slice(5),
    },
    taskMarkdown,
    testMarkdown,
  });
  return parsed.errors.length === 0 &&
    parsed.task.deliveryRequirement.kind === "STANDARD"
    ? parsed.task
    : undefined;
}

async function discoverHistoricalImmutableTerminalTasks({
  commandCache,
  repositoryRoot,
  currentMainSha,
  tasksRoot,
}) {
  const contractMarkerPattern = `<!-- kyw-task-contract: (${IMMUTABLE_TERMINAL_TASK_CONTRACT_VERSIONS.join("|")}) -->`;
  const [treeResult, historyPaths] = await Promise.all([
    git(
      commandCache,
      repositoryRoot,
      [
        "grep",
        "-l",
        "-E",
        contractMarkerPattern,
        currentMainSha,
        "--",
        ":(glob)docs/tasks/*/TASK.md",
        ":(glob)docs/tasks/*/TEST.md",
      ],
      { role: "TERMINAL_PAIR_CATALOG", allowFailure: true },
    ),
    gitText(
      commandCache,
      repositoryRoot,
      [
        "log",
        "--first-parent",
        "--diff-merges=first-parent",
        `--max-count=${MAX_FIRST_PARENT_COMMITS + 1}`,
        "--format=",
        "--name-only",
        `-G${contractMarkerPattern}`,
        currentMainSha,
        "--",
        ":(glob)docs/tasks/*/TASK.md",
        ":(glob)docs/tasks/*/TEST.md",
      ],
      { role: "TERMINAL_PAIR_CATALOG" },
    ),
  ]);
  if (treeResult.status !== 0 && treeResult.status !== 1) {
    throw hydrationError(
      undefined,
      "TERMINAL_PAIR_CATALOG",
      "future terminal path catalog could not be read",
      "DELIVERY_HYDRATION_EXTERNAL_FAILURE",
    );
  }
  const treePaths = treeResult.status === 0 ? treeResult.stdout.trim() : "";
  const byDirectory = new Map();
  for (const value of `${treePaths}\n${historyPaths}`.split(/\r?\n/)) {
    const normalized = value.trim().replace(
      new RegExp(`^${currentMainSha}:`),
      "",
    );
    const matched = anyTaskPairPathMatch(normalized);
    if (!matched) continue;
    const pair = byDirectory.get(matched.directory) ?? {
      id: matched.id,
      number: matched.number,
      directory: matched.directory,
    };
    pair[matched.kind === "TASK" ? "taskRelative" : "testRelative"] =
      matched.relativePath;
    byDirectory.set(matched.directory, pair);
  }
  if (byDirectory.size > MAX_REQUIRED_DELIVERIES) {
    throw hydrationError(
      undefined,
      "TERMINAL_PAIR_CATALOG",
      `future terminal path count ${byDirectory.size} exceeds bound ${MAX_REQUIRED_DELIVERIES}`,
      "DELIVERY_HYDRATION_BOUND_EXCEEDED",
    );
  }
  const candidates = [];
  for (const pair of [...byDirectory.values()].sort((left, right) =>
    left.directory.localeCompare(right.directory),
  )) {
    if (!pair.taskRelative || !pair.testRelative) continue;
    const history = await gitText(
      commandCache,
      repositoryRoot,
      [
        "log",
        "--first-parent",
        "--diff-merges=first-parent",
        "--no-patch",
        `--max-count=${MAX_TASK_PATH_COMMITS + 1}`,
        "--format=%H",
        currentMainSha,
        "--",
        pair.taskRelative,
        pair.testRelative,
      ],
      { taskId: pair.id, role: "TERMINAL_PAIR_CATALOG" },
    );
    const commits = [
      currentMainSha,
      ...(history ? history.split(/\r?\n/).filter(Boolean) : []),
    ].filter((value, index, values) => values.indexOf(value) === index);
    if (commits.length > MAX_TASK_PATH_COMMITS) {
      throw hydrationError(
        pair.id,
        "TERMINAL_PAIR_CATALOG",
        `Task path history exceeds bound ${MAX_TASK_PATH_COMMITS}`,
        "DELIVERY_HYDRATION_BOUND_EXCEEDED",
      );
    }
    let candidate;
    for (let index = 0; index < commits.length; index += 1) {
      const [taskMarkdown, testMarkdown] = await Promise.all([
        showGitFile(
          commandCache,
          repositoryRoot,
          commits[index],
          pair.taskRelative,
          pair.id,
        ),
        showGitFile(
          commandCache,
          repositoryRoot,
          commits[index],
          pair.testRelative,
          pair.id,
        ),
      ]);
      if (taskMarkdown === undefined || testMarkdown === undefined) continue;
      const task = immutableTerminalTaskFromMarkdown({
        tasksRoot,
        pair,
        taskMarkdown,
        testMarkdown,
      });
      if (task) {
        candidate = Object.freeze({ task, historyIndex: index });
      }
    }
    if (candidate) candidates.push(candidate);
  }
  const byId = new Map();
  for (const candidate of candidates) {
    const previous = byId.get(candidate.task.id);
    if (
      !previous ||
      candidate.historyIndex > previous.historyIndex ||
      (candidate.historyIndex === previous.historyIndex &&
        candidate.task.name.localeCompare(previous.task.name) < 0)
    ) {
      byId.set(candidate.task.id, candidate);
    }
  }
  return Object.freeze(
    [...byId.values()]
      .map(({ task }) => task)
      .sort((left, right) => left.number - right.number),
  );
}

async function discoverFutureTaskPairPaths(
  cache,
  repositoryRoot,
  currentMainSha,
  task,
) {
  const taskRelative = path
    .relative(repositoryRoot, task.taskPath)
    .replaceAll("\\", "/");
  const testRelative = path
    .relative(repositoryRoot, task.testPath)
    .replaceAll("\\", "/");
  const discovered = await gitText(
    cache,
    repositoryRoot,
    [
      "log",
      "--first-parent",
      `--max-count=${MAX_TASK_PATH_COMMITS + 1}`,
      "--format=",
      "--name-only",
      "--no-renames",
      `-S<!-- kyw-task-contract: ${task.contractVersion} -->`,
      currentMainSha,
      "--",
      `:(glob)docs/tasks/${task.id}-*/TASK.md`,
      `:(glob)docs/tasks/${task.id}-*/TEST.md`,
    ],
    { taskId: task.id, role: "TERMINAL_PAIR_HISTORY" },
  );
  const paths = [taskRelative, testRelative, ...(discovered ? discovered.split(/\r?\n/) : [])];
  const byDirectory = new Map();
  for (const relativePath of paths) {
    const matched = taskPairPathMatch(task.id, relativePath.trim());
    if (!matched) continue;
    const pair = byDirectory.get(matched.directory) ?? {};
    pair[matched.kind === "TASK" ? "taskRelative" : "testRelative"] =
      matched.relativePath;
    byDirectory.set(matched.directory, pair);
  }
  const pairs = [...byDirectory.entries()]
    .filter(([, pair]) => pair.taskRelative && pair.testRelative)
    .map(([directory, pair]) =>
      Object.freeze({
        directory,
        taskRelative: pair.taskRelative,
        testRelative: pair.testRelative,
      }),
    )
    .sort((left, right) => left.directory.localeCompare(right.directory));
  if (pairs.length === 0) {
    throw hydrationError(
      task.id,
      "TERMINAL_PAIR_HISTORY",
      "no canonical Task/Test path could be derived for the future contract",
    );
  }
  return Object.freeze(pairs);
}

async function discoverTaskOutcomeCandidatesAtPair({
  cache,
  repositoryRoot,
  currentMainSha,
  task,
  indexBySha,
  pair,
}) {
  const { taskRelative, testRelative } = pair;
  const log = await gitText(
    cache,
    repositoryRoot,
    [
      "log",
      "--first-parent",
      `--max-count=${MAX_TASK_PATH_COMMITS + 1}`,
      "--format=%H%x09%P%x09%s",
      currentMainSha,
      "--",
      taskRelative,
      testRelative,
    ],
    { taskId: task.id, role: "LOCAL_GIT" },
  );
  const records = log ? log.split(/\r?\n/) : [];
  if (records.length > MAX_TASK_PATH_COMMITS) {
    throw hydrationError(
      task.id,
      "LOCAL_GIT",
      `Task path history exceeds bound ${MAX_TASK_PATH_COMMITS}`,
      "DELIVERY_HYDRATION_BOUND_EXCEEDED",
    );
  }

  const candidates = [];
  for (const record of records) {
    const [mergeSha, parentText, ...subjectParts] = record.split("\t");
    const parents = parentText?.split(" ").filter(Boolean) ?? [];
    const subject = subjectParts.join("\t");
    const standardMerge = /^Merge pull request #(\d+) from (.+)$/.exec(subject);
    const titledMerge = /\(#(\d+)\)$/.exec(subject);
    const pullRequestNumber = Number(standardMerge?.[1] ?? titledMerge?.[1]);
    if (!positiveInteger(pullRequestNumber) || parents.length !== 2) continue;
    const headRefHint = standardMerge?.[2]
      ?.match(
        new RegExp(
          `((?:agent/)?task(?:/|-)${task.id}(?:-[a-zA-Z0-9._-]+)?)$`,
        ),
      )?.[1];
    const [baseSha, outcomeSha] = parents;
    const [taskMarkdown, testMarkdown, baseTaskMarkdown, baseTestMarkdown] =
      await Promise.all([
      showGitFile(cache, repositoryRoot, outcomeSha, taskRelative, task.id),
      showGitFile(cache, repositoryRoot, outcomeSha, testRelative, task.id),
      showGitFile(cache, repositoryRoot, baseSha, taskRelative, task.id),
      showGitFile(cache, repositoryRoot, baseSha, testRelative, task.id),
    ]);
    if (
      sectionStatus(taskMarkdown ?? "") !== "DONE" ||
      sectionStatus(testMarkdown ?? "") !== "PASSED" ||
      (sectionStatus(baseTaskMarkdown ?? "") === "DONE" &&
        sectionStatus(baseTestMarkdown ?? "") === "PASSED")
    ) {
      continue;
    }
    const taskContractVersion = getTaskContractVersion(taskMarkdown);
    const testContractVersion = getTaskContractVersion(testMarkdown);
    if (taskContractVersion !== testContractVersion) {
      throw hydrationError(
        task.id,
        "LOCAL_GIT",
        `terminal pair contract versions disagree at ${pair.directory}`,
      );
    }
    const firstParentIndex = indexBySha.get(mergeSha);
    if (firstParentIndex === undefined) {
      throw hydrationError(
        task.id,
        "LOCAL_GIT",
        "terminal merge is absent from bounded first-parent history",
      );
    }
    const workflowText = await showGitFile(
      cache,
      repositoryRoot,
      outcomeSha,
      WORKFLOW_PATH,
      task.id,
    );
    let terminalPair;
    if (isImmutableTerminalTaskContractVersion(taskContractVersion)) {
      const terminalPaths = [taskRelative, testRelative];
      const [
        mergeTaskMarkdown,
        mergeTestMarkdown,
        outcomeTreeEntries,
        mergeTreeEntries,
      ] = await Promise.all([
        showGitFile(cache, repositoryRoot, mergeSha, taskRelative, task.id),
        showGitFile(cache, repositoryRoot, mergeSha, testRelative, task.id),
        readTerminalArtifactGitEntries({
          cache,
          repositoryRoot,
          source: "tree",
          revision: outcomeSha,
          relativePaths: terminalPaths,
          taskId: task.id,
          role: "TERMINAL_PAIR_BINDING",
        }),
        readTerminalArtifactGitEntries({
          cache,
          repositoryRoot,
          source: "tree",
          revision: mergeSha,
          relativePaths: terminalPaths,
          taskId: task.id,
          role: "TERMINAL_PAIR_BINDING",
        }),
      ]);
      for (const relativePath of terminalPaths) {
        const outcomeEntry = outcomeTreeEntries?.get(relativePath);
        const mergeEntry = mergeTreeEntries?.get(relativePath);
        if (
          !terminalArtifactGitEntryIsRegular(outcomeEntry, {
            source: "tree",
          }) ||
          !terminalArtifactGitEntryIsRegular(mergeEntry, { source: "tree" })
        ) {
          throw immutableTerminalPairError(
            task.id,
            relativePath,
            "canonical terminal artifact Git mode or type is not a regular file",
          );
        }
        if (
          outcomeEntry.mode !== mergeEntry.mode ||
          outcomeEntry.objectSha !== mergeEntry.objectSha
        ) {
          throw immutableTerminalPairError(
            task.id,
            relativePath,
            `expected-head PR merge ${mergeSha} does not preserve the outcome terminal artifact mode and bytes`,
          );
        }
      }
      if (
        mergeTaskMarkdown !== taskMarkdown ||
        mergeTestMarkdown !== testMarkdown ||
        sectionStatus(mergeTaskMarkdown ?? "") !== "DONE" ||
        sectionStatus(mergeTestMarkdown ?? "") !== "PASSED"
      ) {
        throw hydrationError(
          task.id,
          "TERMINAL_PAIR_BINDING",
          `expected-head PR merge ${mergeSha} does not preserve the exact terminal pair from outcome ${outcomeSha}`,
        );
      }
      terminalPair = Object.freeze({
        contractVersion: taskContractVersion,
        directory: pair.directory,
        taskPath: taskRelative,
        testPath: testRelative,
        taskSha256: sha256Text(mergeTaskMarkdown),
        testSha256: sha256Text(mergeTestMarkdown),
        taskBlobSha: mergeTreeEntries.get(taskRelative).objectSha,
        testBlobSha: mergeTreeEntries.get(testRelative).objectSha,
        taskMode: mergeTreeEntries.get(taskRelative).mode,
        testMode: mergeTreeEntries.get(testRelative).mode,
      });
    }
    candidates.push(Object.freeze({
      taskId: task.id,
      directory: pair.directory,
      baseRef: "main",
      baseSha,
      outcomeSha,
      mergeSha,
      pullRequestNumber,
      headRefHint,
      firstParentIndex,
      hardenedWorkflow: workflowText
        ? parseHardenedWorkflowContract(workflowText)
        : false,
      ...(terminalPair ? { terminalPair } : {}),
    }));
  }
  return Object.freeze(candidates);
}

export function parseProtectedMergeTaskIdentity(record) {
  if (record?.parents?.length !== 2) return undefined;
  const standardMerge = /^Merge pull request #(\d+) from ([^/\s]+)\/(\S+)$/.exec(
    record.subject ?? "",
  );
  const pullRequestNumber = Number(standardMerge?.[1]);
  if (!positiveInteger(pullRequestNumber)) return undefined;
  const [, , owner, sourceBranch] = standardMerge;
  const leadingIdentity = TASK_BRANCH_IDENTITY_PATTERN.exec(sourceBranch);
  if (!leadingIdentity) return undefined;
  return Object.freeze({
    pullRequestNumber,
    owner,
    sourceBranch,
    taskId: leadingIdentity[1],
  });
}

function futureTaskMergeSubject(taskId, record) {
  return parseProtectedMergeTaskIdentity(record)?.taskId === taskId;
}

function changedFutureTaskArtifactPaths(taskId, nameStatus) {
  const paths = [];
  for (const line of nameStatus.split(/\r?\n/)) {
    if (!line.trim()) continue;
    for (const candidate of line.split("\t").slice(1)) {
      const matched = taskPairPathMatch(taskId, candidate.trim(), {
        allowCaseConfusion: true,
      });
      if (matched && !paths.includes(matched.relativePath)) {
        paths.push(matched.relativePath);
      }
    }
  }
  return Object.freeze(paths);
}

export function terminalArtifactGitModeClass(mode) {
  if (mode === "100644") return "REGULAR_FILE";
  if (mode === "100755") return "EXECUTABLE_FILE";
  return undefined;
}

export function parseTerminalArtifactGitEntries(
  entryText,
  { source = "tree" } = {},
) {
  if (typeof entryText !== "string" || !["tree", "index"].includes(source)) {
    return undefined;
  }
  if (entryText.length === 0) return Object.freeze([]);
  const framed = stripFinalGitCommandDelimiter(entryText);
  if (framed.length === 0) return undefined;
  const entries = [];
  for (const line of framed.split(/\r?\n/)) {
    const match =
      source === "tree"
        ? /^([0-7]{6}) ([a-z]+) ([a-f0-9]{40})\t([^\t\r\n]+)$/u.exec(line)
        : /^([0-7]{6}) ([a-f0-9]{40}) ([0-3])\t([^\t\r\n]+)$/u.exec(
            line,
          );
    if (!match) return undefined;
    entries.push(
      Object.freeze(
        source === "tree"
          ? {
              mode: match[1],
              type: match[2],
              objectSha: match[3],
              relativePath: match[4].replaceAll("\\", "/"),
            }
          : {
              mode: match[1],
              objectSha: match[2],
              stage: Number(match[3]),
              relativePath: match[4].replaceAll("\\", "/"),
            },
      ),
    );
  }
  return Object.freeze(entries);
}

async function readTerminalArtifactGitEntries({
  cache,
  repositoryRoot,
  source,
  revision,
  relativePaths,
  taskId,
  role,
}) {
  const args =
    source === "tree"
      ? ["ls-tree", revision, "--", ...relativePaths]
      : ["ls-files", "--stage", "--", ...relativePaths];
  const text = await gitPorcelainText(cache, repositoryRoot, args, {
    taskId,
    role,
  });
  const entries = parseTerminalArtifactGitEntries(text, { source });
  if (!entries) return undefined;
  const expected = new Set(relativePaths);
  const byPath = new Map();
  for (const entry of entries) {
    if (!expected.has(entry.relativePath)) return undefined;
    byPath.set(
      entry.relativePath,
      byPath.has(entry.relativePath) ? undefined : entry,
    );
  }
  return byPath;
}

function terminalArtifactGitEntryIsRegular(entry, { source }) {
  return Boolean(
    entry &&
      terminalArtifactGitModeClass(entry.mode) &&
      (source === "tree"
        ? entry.type === "blob"
        : entry.stage === 0),
  );
}

function terminalArtifactWorktreeModeMatches(canonicalMode, state) {
  if (process.platform === "win32") return true;
  const canonicalExecutable = canonicalMode === "100755";
  const worktreeExecutable = (state.mode & 0o111) !== 0;
  return canonicalExecutable === worktreeExecutable;
}

function normalizeTerminalArtifactLineEndings(bytes) {
  const source = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const normalized = Buffer.allocUnsafe(source.length);
  let targetIndex = 0;
  for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
    if (
      source[sourceIndex] === 0x0d &&
      sourceIndex + 1 < source.length &&
      source[sourceIndex + 1] === 0x0a
    ) {
      normalized[targetIndex] = 0x0a;
      targetIndex += 1;
      sourceIndex += 1;
      continue;
    }
    normalized[targetIndex] = source[sourceIndex];
    targetIndex += 1;
  }
  return normalized.subarray(0, targetIndex);
}

export function terminalArtifactNewlineEquivalent(canonicalBytes, worktreeBytes) {
  const canonical = Buffer.isBuffer(canonicalBytes)
    ? canonicalBytes
    : Buffer.from(canonicalBytes);
  const worktree = Buffer.isBuffer(worktreeBytes)
    ? worktreeBytes
    : Buffer.from(worktreeBytes);
  if (canonical.equals(worktree)) return true;
  if (canonical.includes(0x0d)) return false;
  return normalizeTerminalArtifactLineEndings(worktree).equals(canonical);
}

export function parseTerminalPairWorktreeStatus(statusText, taskId) {
  const malformed = () => {
    throw immutableTerminalPairError(
      taskId,
      undefined,
      "worktree porcelain status is malformed or ambiguous",
    );
  };
  if (typeof statusText !== "string") malformed();
  if (statusText.length === 0) return Object.freeze([]);
  const framedStatus = stripFinalGitCommandDelimiter(statusText);
  if (framedStatus.length === 0) malformed();

  const entries = [];
  for (const line of framedStatus.split(/\r?\n/)) {
    if (
      line.length < 4 ||
      line[2] !== " " ||
      line.includes("\r") ||
      line.includes("\0")
    ) {
      malformed();
    }
    const code = line.slice(0, 2);
    if (
      code === "  " ||
      !/^[ MTADRCU?!]{2}$/u.test(code) ||
      (code.includes("?") && code !== "??") ||
      (code.includes("!") && code !== "!!")
    ) {
      malformed();
    }
    const value = line.slice(3);
    const renamed = code.includes("R") || code.includes("C");
    const hasRenameSeparator = value.includes(" -> ");
    if (renamed !== hasRenameSeparator) malformed();
    const relativePaths = renamed ? value.split(" -> ") : [value];
    if (relativePaths.length !== (renamed ? 2 : 1)) malformed();
    for (const relativePath of relativePaths) {
      if (
        relativePath.length === 0 ||
        relativePath.startsWith('"') ||
        path.isAbsolute(relativePath) ||
        relativePath === ".." ||
        relativePath.startsWith("../") ||
        relativePath.startsWith("..\\")
      ) {
        malformed();
      }
    }
    entries.push(
      Object.freeze({
        code,
        relativePaths: Object.freeze(relativePaths),
      }),
    );
  }
  return Object.freeze(entries);
}

async function inspectFutureTerminalPairDrift({
  cache,
  repositoryRoot,
  currentMainSha,
  task,
  outcome,
  firstParentHistory,
}) {
  const pair = outcome.terminalPair;
  if (!pair) return undefined;
  const mainNameStatus = await gitText(
    cache,
    repositoryRoot,
    [
      "log",
      "--format=",
      "--name-status",
      "--no-renames",
      `${outcome.mergeSha}..${currentMainSha}`,
      "--",
      "docs/tasks",
    ],
    { taskId: task.id, role: "TERMINAL_PAIR_HISTORY" },
  );
  const mainChanges = changedFutureTaskArtifactPaths(task.id, mainNameStatus);
  const worktreeStatus = await gitPorcelainText(
    cache,
    repositoryRoot,
    [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      "docs/tasks",
    ],
    { taskId: task.id, role: "TERMINAL_PAIR_WORKTREE" },
  );
  const worktreeStatusEntries = parseTerminalPairWorktreeStatus(
    worktreeStatus,
    task.id,
  );
  const terminalArtifacts = [
    {
      relativePath: pair.taskPath,
      expectedBlobSha: pair.taskBlobSha,
      expectedMode: pair.taskMode,
    },
    {
      relativePath: pair.testPath,
      expectedBlobSha: pair.testBlobSha,
      expectedMode: pair.testMode,
    },
  ];
  const terminalPaths = terminalArtifacts.map(({ relativePath }) => relativePath);
  const [currentTreeEntries, indexEntries] = await Promise.all([
    readTerminalArtifactGitEntries({
      cache,
      repositoryRoot,
      source: "tree",
      revision: currentMainSha,
      relativePaths: terminalPaths,
      taskId: task.id,
      role: "TERMINAL_PAIR_WORKTREE",
    }),
    readTerminalArtifactGitEntries({
      cache,
      repositoryRoot,
      source: "index",
      relativePaths: terminalPaths,
      taskId: task.id,
      role: "TERMINAL_PAIR_WORKTREE",
    }),
  ]);
  const exactSpaceMPaths = new Set();
  for (const relativePath of terminalPaths) {
    const matchingEntries = worktreeStatusEntries.filter((entry) =>
      entry.relativePaths.some(
        (candidate) =>
          candidate.replaceAll("\\", "/").toLowerCase() ===
          relativePath.toLowerCase(),
      ),
    );
    if (
      matchingEntries.length === 1 &&
      matchingEntries[0].code === " M" &&
      matchingEntries[0].relativePaths.length === 1 &&
      matchingEntries[0].relativePaths[0] === relativePath
    ) {
      exactSpaceMPaths.add(relativePath);
    }
  }
  const worktreePairIssues = [];
  const newlineEquivalentPairPaths = new Set();
  for (const { relativePath, expectedBlobSha, expectedMode } of terminalArtifacts) {
    const absolutePath = path.resolve(repositoryRoot, relativePath);
    let state;
    try {
      state = await lstat(absolutePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        worktreePairIssues.push(
          Object.freeze({
            path: relativePath,
            detail: "terminal artifact filesystem state could not be inspected",
          }),
        );
        continue;
      }
    }
    if (!state) {
      worktreePairIssues.push(
        Object.freeze({ path: relativePath, detail: "terminal artifact is missing from the worktree" }),
      );
      continue;
    }
    if (state.isSymbolicLink() || !state.isFile()) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "terminal artifact was replaced by a link or unsupported filesystem type",
        }),
      );
      continue;
    }
    if (!terminalArtifactGitModeClass(expectedMode)) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "canonical terminal artifact Git mode is unsupported",
        }),
      );
      continue;
    }
    const currentTreeEntry = currentTreeEntries?.get(relativePath);
    if (
      !terminalArtifactGitEntryIsRegular(currentTreeEntry, {
        source: "tree",
      }) ||
      currentTreeEntry.mode !== expectedMode
    ) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "aligned main terminal artifact mode or type differs from the canonical merge",
        }),
      );
      continue;
    }
    if (currentTreeEntry.objectSha !== expectedBlobSha) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "aligned main terminal artifact bytes differ from the canonical merge",
        }),
      );
      continue;
    }
    const indexEntry = indexEntries?.get(relativePath);
    if (
      !terminalArtifactGitEntryIsRegular(indexEntry, { source: "index" }) ||
      indexEntry.mode !== expectedMode
    ) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "terminal artifact index mode or stage differs from the canonical merge",
        }),
      );
      continue;
    }
    if (indexEntry.objectSha !== expectedBlobSha) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "terminal artifact index bytes differ from the canonical merge",
        }),
      );
      continue;
    }
    if (!terminalArtifactWorktreeModeMatches(expectedMode, state)) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "terminal artifact worktree mode differs from the canonical merge",
        }),
      );
      continue;
    }
    const canonicalBlob = await git(
      cache,
      repositoryRoot,
      ["cat-file", "blob", expectedBlobSha],
      {
        taskId: task.id,
        role: "TERMINAL_PAIR_WORKTREE",
        allowFailure: true,
      },
    );
    if (canonicalBlob.status !== 0) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "canonical terminal artifact blob is unavailable",
        }),
      );
      continue;
    }
    let worktreeBytes;
    try {
      worktreeBytes = await readFile(absolutePath);
    } catch {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "terminal artifact worktree bytes could not be read",
        }),
      );
      continue;
    }
    const canonicalBytes = Buffer.from(canonicalBlob.stdout, "utf8");
    const rawBytesDiffer = !canonicalBytes.equals(worktreeBytes);
    if (!rawBytesDiffer) continue;
    if (
      !terminalArtifactNewlineEquivalent(canonicalBytes, worktreeBytes) ||
      !exactSpaceMPaths.has(relativePath)
    ) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "terminal artifact bytes differ from the canonical merge",
        }),
      );
      continue;
    }
    newlineEquivalentPairPaths.add(relativePath);
  }
  const worktreeChanges = Object.freeze(
    worktreeStatusEntries
      .flatMap((entry) =>
        entry.relativePaths.flatMap((candidate) => {
          const matched = taskPairPathMatch(task.id, candidate, {
            allowCaseConfusion: true,
          });
          if (!matched) return [];
          const newlineOnlyCanonicalPair =
            entry.code === " M" &&
            entry.relativePaths.length === 1 &&
            (matched.relativePath === pair.taskPath ||
              matched.relativePath === pair.testPath) &&
            newlineEquivalentPairPaths.has(matched.relativePath);
          return newlineOnlyCanonicalPair ? [] : [matched.relativePath];
        }),
      )
      .filter((value, index, values) => values.indexOf(value) === index),
  );
  const additionalDeliveries = Object.freeze(
    firstParentHistory
      .filter(
        (record) =>
          record.index > outcome.firstParentIndex &&
          futureTaskMergeSubject(task.id, record),
      )
      .map((record) =>
        Object.freeze({
          mergeSha: record.sha,
          path: pair.taskPath,
        }),
      ),
  );
  return Object.freeze({
    mainChanges,
    worktreeChanges,
    worktreePairIssues: Object.freeze(worktreePairIssues),
    newlineEquivalentPairPaths: Object.freeze([
      ...newlineEquivalentPairPaths,
    ]),
    additionalDeliveries,
  });
}

async function discoverTaskOutcome(
  cache,
  repositoryRoot,
  currentMainSha,
  task,
  indexBySha,
  firstParentHistory,
) {
  const currentPair = Object.freeze({
    directory: task.name,
    taskRelative: path
      .relative(repositoryRoot, task.taskPath)
      .replaceAll("\\", "/"),
    testRelative: path
      .relative(repositoryRoot, task.testPath)
      .replaceAll("\\", "/"),
  });
  const pairs = isImmutableTerminalTaskContractVersion(task.contractVersion)
    ? await discoverFutureTaskPairPaths(
        cache,
        repositoryRoot,
        currentMainSha,
        task,
      )
    : Object.freeze([currentPair]);
  const candidates = [];
  for (const pair of pairs) {
    candidates.push(
      ...(await discoverTaskOutcomeCandidatesAtPair({
        cache,
        repositoryRoot,
        currentMainSha,
        task,
        indexBySha,
        pair,
      })),
    );
  }
  const relevantCandidates = isImmutableTerminalTaskContractVersion(
    task.contractVersion,
  )
    ? candidates.filter((candidate) => candidate.terminalPair)
    : candidates;
  if (
    isImmutableTerminalTaskContractVersion(task.contractVersion) &&
    relevantCandidates.length > 1
  ) {
    throw hydrationError(
      task.id,
      "TERMINAL_PAIR_BINDING",
      `multiple canonical terminal delivery candidates were found at ${relevantCandidates.map((candidate) => candidate.directory).join(", ")}`,
      "FUTURE_TERMINAL_DELIVERY_AMBIGUOUS",
    );
  }
  const outcome = relevantCandidates[0];
  if (outcome) {
    const immutableDrift = await inspectFutureTerminalPairDrift({
      cache,
      repositoryRoot,
      currentMainSha,
      task,
      outcome,
      firstParentHistory,
    });
    return Object.freeze({
      ...outcome,
      ...(immutableDrift ? { immutableDrift } : {}),
    });
  }
  throw hydrationError(
    task.id,
    "LOCAL_GIT",
    "could not map the terminal pair to an exact two-parent Task delivery merge",
  );
}

function assertFutureTerminalOutcomeImmutable(task, outcome) {
  if (
    !isImmutableTerminalTaskContractVersion(task.contractVersion) ||
    !outcome?.terminalPair
  ) {
    return;
  }
  const drift = outcome.immutableDrift;
  const pair = outcome.terminalPair;
  if (!drift) {
    throw immutableTerminalPairError(
      task.id,
      pair.taskPath,
      "canonical terminal binding could not be revalidated",
    );
  }
  if (drift.mainChanges.length > 0) {
    throw immutableTerminalPairError(
      task.id,
      drift.mainChanges[0],
      "aligned main changed, deleted, renamed, or replaced the canonical terminal artifact",
    );
  }
  if (drift.worktreePairIssues.length > 0) {
    const [issue] = drift.worktreePairIssues;
    throw immutableTerminalPairError(task.id, issue.path, issue.detail);
  }
  if (drift.worktreeChanges.length > 0) {
    throw immutableTerminalPairError(
      task.id,
      drift.worktreeChanges[0],
      "worktree state shadows the canonical terminal artifact",
    );
  }
  if (drift.additionalDeliveries.length > 0) {
    throw immutableTerminalPairError(
      task.id,
      drift.additionalDeliveries[0].path,
      `another Task-scoped PR merge ${drift.additionalDeliveries[0].mergeSha} follows the canonical delivery`,
    );
  }
}

async function collectFirstParentHistory({
  commandCache,
  repositoryRoot,
  currentMainSha,
  role,
}) {
  const firstParentText = await gitText(
    commandCache,
    repositoryRoot,
    [
      "log",
      "--first-parent",
      `--max-count=${MAX_FIRST_PARENT_COMMITS + 1}`,
      "--format=%H%x09%P%x09%s",
      currentMainSha,
    ],
    { role },
  );
  const newestFirst = firstParentText
    ? firstParentText.split(/\r?\n/).map((record) => {
        const [sha, parentText, ...subjectParts] = record.split("\t");
        return Object.freeze({
          sha,
          parents: Object.freeze(parentText?.split(" ").filter(Boolean) ?? []),
          subject: subjectParts.join("\t"),
        });
      })
    : [];
  if (newestFirst.length > MAX_FIRST_PARENT_COMMITS) {
    throw hydrationError(
      undefined,
      role,
      `first-parent history exceeds bound ${MAX_FIRST_PARENT_COMMITS}`,
      "DELIVERY_HYDRATION_BOUND_EXCEEDED",
    );
  }
  const history = Object.freeze(
    [...newestFirst]
      .reverse()
      .map((record, index) => Object.freeze({ ...record, index })),
  );
  return Object.freeze({
    history,
    indexBySha: new Map(history.map((record) => [record.sha, record.index])),
  });
}

export async function discoverLocalDeliveryOutcomes({
  tasksRoot,
  requiredTasks,
  contractTasks = requiredTasks,
  commandCache,
}) {
  const requestedRoot = path.resolve(tasksRoot);
  const repositoryRoot = await gitText(
    commandCache,
    requestedRoot,
    ["rev-parse", "--show-toplevel"],
    { role: "LOCAL_GIT" },
  );
  if (!(await tasksRootMatchesRepository(requestedRoot, repositoryRoot))) {
    throw hydrationError(
      undefined,
      "LOCAL_GIT",
      "tasks root must be the repository docs/tasks directory",
    );
  }

  const [currentMainSha, upstreamSha, cachedMainSha, originUrl, directRemote] =
    await Promise.all([
      gitText(commandCache, repositoryRoot, ["rev-parse", "refs/heads/main"], {
        role: "LOCAL_GIT",
      }),
      gitText(commandCache, repositoryRoot, ["rev-parse", "main@{upstream}"], {
        role: "LOCAL_GIT",
      }),
      gitText(
        commandCache,
        repositoryRoot,
        ["rev-parse", "refs/remotes/origin/main"],
        { role: "LOCAL_GIT" },
      ),
      gitText(commandCache, repositoryRoot, ["remote", "get-url", "origin"], {
        role: "LOCAL_GIT",
      }),
      gitText(
        commandCache,
        repositoryRoot,
        ["ls-remote", "--heads", "origin", "refs/heads/main"],
        { role: "LOCAL_GIT" },
      ),
    ]);
  requireSha(currentMainSha, undefined, "LOCAL_GIT", "local main");
  const directRemoteSha = directRemote.split(/\s+/)[0];
  for (const [label, value] of [
    ["upstream main", upstreamSha],
    ["cached origin/main", cachedMainSha],
    ["direct remote main", directRemoteSha],
  ]) {
    if (value !== currentMainSha) {
      throw hydrationError(
        undefined,
        "LOCAL_GIT",
        `${label} does not equal local main`,
      );
    }
  }

  const { history: firstParentHistory, indexBySha } =
    await collectFirstParentHistory({
      commandCache,
      repositoryRoot,
      currentMainSha,
      role: "LOCAL_GIT",
    });
  if (contractTasks.length > MAX_REQUIRED_DELIVERIES) {
    throw hydrationError(
      undefined,
      "LOCAL_GIT",
      `contract outcome count ${contractTasks.length} exceeds bound ${MAX_REQUIRED_DELIVERIES}`,
      "DELIVERY_HYDRATION_BOUND_EXCEEDED",
    );
  }
  const contractOutcomes = [];
  for (const task of contractTasks) {
    contractOutcomes.push(
      await discoverTaskOutcome(
        commandCache,
        repositoryRoot,
        currentMainSha,
        task,
        indexBySha,
        firstParentHistory,
      ),
    );
  }
  const classified = await classifyLocalDeliveryContracts(contractOutcomes, {
    currentMainSha,
    isAncestor: (ancestor, descendant) =>
      gitIsAncestor(commandCache, repositoryRoot, ancestor, descendant),
  });
  const requiredIds = new Set(requiredTasks.map((task) => task.id));
  const outcomes = classified.outcomes.filter((outcome) =>
    requiredIds.has(outcome.taskId),
  );
  if (outcomes.length !== requiredTasks.length) {
    throw hydrationError(
      undefined,
      "LOCAL_GIT",
      "required delivery outcomes are missing from the classified contract history",
    );
  }
  return Object.freeze({
    repositoryRoot,
    repository: parseRepositorySlug(originUrl),
    currentMainSha,
    upstreamSha,
    cachedMainSha,
    directRemoteSha,
    contractAnchorSha: classified.contractAnchorSha,
    outcomes: Object.freeze(outcomes),
  });
}

async function discoverAlignedMainIdentity({
  tasksRoot,
  commandCache,
  githubClient,
}) {
  const requestedRoot = path.resolve(tasksRoot);
  const repositoryRoot = await gitText(
    commandCache,
    requestedRoot,
    ["rev-parse", "--show-toplevel"],
    { role: "CHECKPOINT_MAIN" },
  );
  if (!(await tasksRootMatchesRepository(requestedRoot, repositoryRoot))) {
    throw hydrationError(
      undefined,
      "CHECKPOINT_MAIN",
      "tasks root must be the repository docs/tasks directory",
    );
  }
  const [currentMainSha, upstreamSha, cachedMainSha, originUrl, directRemote] =
    await Promise.all([
      gitText(commandCache, repositoryRoot, ["rev-parse", "refs/heads/main"], {
        role: "CHECKPOINT_MAIN",
      }),
      gitText(commandCache, repositoryRoot, ["rev-parse", "main@{upstream}"], {
        role: "CHECKPOINT_MAIN",
      }),
      gitText(
        commandCache,
        repositoryRoot,
        ["rev-parse", "refs/remotes/origin/main"],
        { role: "CHECKPOINT_MAIN" },
      ),
      gitText(commandCache, repositoryRoot, ["remote", "get-url", "origin"], {
        role: "CHECKPOINT_MAIN",
      }),
      gitText(
        commandCache,
        repositoryRoot,
        ["ls-remote", "--heads", "origin", "refs/heads/main"],
        { role: "CHECKPOINT_MAIN" },
      ),
    ]);
  requireSha(currentMainSha, undefined, "CHECKPOINT_MAIN", "local main");
  const directRemoteSha = directRemote.split(/\s+/)[0];
  for (const [label, value] of [
    ["upstream main", upstreamSha],
    ["cached origin/main", cachedMainSha],
    ["direct remote main", directRemoteSha],
  ]) {
    if (value !== currentMainSha) {
      throw hydrationError(
        undefined,
        "CHECKPOINT_MAIN",
        `${label} does not equal local main`,
      );
    }
  }
  const repository = parseRepositorySlug(originUrl);
  const client =
    githubClient ??
    createGitHubEvidenceClient({
      repository,
      repositoryRoot,
      commandCache,
    });
  const rawMainRef = await client.getMainRef({ role: "GITHUB_MAIN" });
  const githubMainSha = rawMainRef?.object?.sha;
  exact(
    githubMainSha,
    currentMainSha,
    undefined,
    "GITHUB_MAIN",
    "GitHub main SHA",
  );
  return Object.freeze({
    repositoryRoot,
    repository,
    currentMainSha,
    upstreamSha,
    cachedMainSha,
    directRemoteSha,
    githubMainSha,
    githubClient: client,
  });
}

export async function loadTrustedStandardDeliveryContinuity({
  tasksRoot,
  requiredTasks,
  coverageTasks = requiredTasks,
  currentDeliveryTaskId,
  maxUncoveredTasks = 1,
  commandCache,
  githubClient,
}) {
  const identity = await discoverAlignedMainIdentity({
    tasksRoot,
    commandCache,
    githubClient,
  });
  const mainBytes = await showGitFile(
    commandCache,
    identity.repositoryRoot,
    identity.currentMainSha,
    STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH,
  );
  const source = "ALIGNED_MAIN";
  const bytes = mainBytes;
  if (bytes === undefined) {
    throw hydrationError(
      undefined,
      "CHECKPOINT",
      "aligned main has no durable continuity checkpoint; explicit migration/rebaseline is required",
      "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
    );
  }
  let checkpoint;
  try {
    checkpoint = parseStandardDeliveryContinuityCheckpoint(bytes);
  } catch (error) {
    throw hydrationError(
      undefined,
      "CHECKPOINT",
      error instanceof Error ? error.message : "checkpoint is invalid",
      error?.code ?? "DELIVERY_CONTINUITY_INVALID",
    );
  }
  if (checkpoint.repository !== identity.repository) {
    throw hydrationError(
      undefined,
      "CHECKPOINT",
      "checkpoint repository identity does not match the exact remote",
    );
  }
  if (
    !(await gitIsAncestor(
      commandCache,
      identity.repositoryRoot,
      checkpoint.sourceMainSha,
      identity.currentMainSha,
    )) ||
    !(await gitIsAncestor(
      commandCache,
      identity.repositoryRoot,
      checkpoint.coveredMainSha,
      identity.currentMainSha,
    ))
  ) {
    throw hydrationError(
      undefined,
      "CHECKPOINT",
      "checkpoint main identities are not ancestors of aligned main",
    );
  }
  const previousBytes = await showGitFile(
    commandCache,
    identity.repositoryRoot,
    checkpoint.sourceMainSha,
    STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH,
  );
  if (checkpoint.previousCheckpointDigest === "GENESIS") {
    if (previousBytes !== undefined) {
      throw hydrationError(
        undefined,
        "CHECKPOINT",
        "genesis source main already contains continuity state",
      );
    }
  } else {
    if (previousBytes === undefined) {
      throw hydrationError(
        undefined,
        "CHECKPOINT",
        "rolling source main is missing the previous checkpoint",
      );
    }
    let previousCheckpoint;
    try {
      previousCheckpoint =
        parseStandardDeliveryContinuityCheckpoint(previousBytes);
    } catch (error) {
      throw hydrationError(
        undefined,
        "CHECKPOINT",
        `previous checkpoint is invalid: ${error.message}`,
        error?.code ?? "DELIVERY_CONTINUITY_INVALID",
      );
    }
    if (
      previousCheckpoint.checkpointDigest !==
        checkpoint.previousCheckpointDigest ||
      previousCheckpoint.repository !== checkpoint.repository ||
      previousCheckpoint.baseRef !== checkpoint.baseRef
    ) {
      throw hydrationError(
        undefined,
        "CHECKPOINT",
        "rolling checkpoint does not bind the exact source-main predecessor",
      );
    }
  }
  const originalCoverageTaskIds = new Set(
    coverageTasks.map((task) => task.id),
  );
  const historicalImmutableTasks =
    await discoverHistoricalImmutableTerminalTasks({
      commandCache,
      repositoryRoot: identity.repositoryRoot,
      currentMainSha: identity.currentMainSha,
      tasksRoot: path.resolve(tasksRoot),
    });
  const effectiveCoverageById = new Map(
    coverageTasks.map((task) => [task.id, task]),
  );
  for (const task of historicalImmutableTasks) {
    effectiveCoverageById.set(task.id, task);
  }
  const effectiveCoverageTasks = Object.freeze(
    [...effectiveCoverageById.values()].sort(
      (left, right) => left.number - right.number,
    ),
  );
  const recoveredImmutableTaskIds = Object.freeze(
    historicalImmutableTasks
      .filter((task) => !originalCoverageTaskIds.has(task.id))
      .map((task) => task.id),
  );
  const currentDeliveryIndex = currentDeliveryTaskId
    ? effectiveCoverageTasks.findIndex(
        (task) => task.id === currentDeliveryTaskId,
      )
    : -1;
  const continuityCoverageTasks = Object.freeze(
    currentDeliveryIndex >= checkpoint.coverage.taskCount
      ? effectiveCoverageTasks.filter(
          (task) => task.id !== currentDeliveryTaskId,
        )
      : [...effectiveCoverageTasks],
  );
  let coveragePartition;
  try {
    coveragePartition = partitionStandardDeliveryContinuity({
      checkpoint,
      requiredTasks: continuityCoverageTasks,
      maxUncoveredTasks,
    });
  } catch (error) {
    throw hydrationError(
      undefined,
      "CHECKPOINT",
      error instanceof Error ? error.message : "checkpoint coverage is invalid",
      error?.code ?? "DELIVERY_CONTINUITY_INVALID",
    );
  }
  const immutableCoveredTasks = coveragePartition.coveredTasks.filter((task) =>
    isImmutableTerminalTaskContractVersion(task.contractVersion),
  );
  const immutableNewlineEquivalentPaths = new Set();
  if (immutableCoveredTasks.length > 0) {
    const { history: firstParentHistory, indexBySha } =
      await collectFirstParentHistory({
        commandCache,
        repositoryRoot: identity.repositoryRoot,
        currentMainSha: identity.currentMainSha,
        role: "CHECKPOINT_PAIR_IMMUTABILITY",
      });
    for (const task of immutableCoveredTasks) {
      const outcome = await discoverTaskOutcome(
        commandCache,
        identity.repositoryRoot,
        identity.currentMainSha,
        task,
        indexBySha,
        firstParentHistory,
      );
      assertFutureTerminalOutcomeImmutable(task, outcome);
      for (const relativePath of
        outcome.immutableDrift?.newlineEquivalentPairPaths ?? []) {
        immutableNewlineEquivalentPaths.add(relativePath);
      }
    }
  }
  const coverageTaskIds = new Set(
    continuityCoverageTasks.map((task) => task.id),
  );
  const checkpointCoveredTaskIds = new Set(
    coveragePartition.coveredTasks.map((task) => task.id),
  );
  const requiredOutsideCoverage = requiredTasks.filter(
    (task) => !coverageTaskIds.has(task.id),
  );
  const partition = Object.freeze({
    coveredTasks: Object.freeze(
      requiredTasks.filter((task) => checkpointCoveredTaskIds.has(task.id)),
    ),
    uncoveredTasks: Object.freeze([
      ...requiredTasks.filter(
        (task) =>
          coverageTaskIds.has(task.id) &&
          !checkpointCoveredTaskIds.has(task.id),
      ),
      ...requiredOutsideCoverage,
    ]),
  });
  if (partition.uncoveredTasks.length > maxUncoveredTasks) {
    throw hydrationError(
      undefined,
      "CHECKPOINT",
      `checkpoint gap ${partition.uncoveredTasks.length} requires explicit migration/rebaseline`,
      "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
    );
  }
  const coveredPairs = coveragePartition.coveredTasks.map((task) => {
    const relativeTask = path.relative(path.resolve(tasksRoot), task.taskPath);
    const relativeTest = path.relative(path.resolve(tasksRoot), task.testPath);
    if (
      [relativeTask, relativeTest].some(
        (relativePath) =>
          path.isAbsolute(relativePath) ||
          relativePath === ".." ||
          relativePath.startsWith(`..${path.sep}`),
      )
    ) {
      throw hydrationError(
        task.id,
        "CHECKPOINT_PAIR_STATE",
        "covered pair path escapes the exact tasks root",
      );
    }
    return Object.freeze({
      task,
      taskPath: `docs/tasks/${relativeTask.replaceAll("\\", "/")}`,
      testPath: `docs/tasks/${relativeTest.replaceAll("\\", "/")}`,
    });
  });
  const coveredPaths = coveredPairs.flatMap(({ taskPath, testPath }) => [
    taskPath,
    testPath,
  ]);
  if (coveredPaths.length > 0) {
    const terminalPairs = [];
    const immutableCoveredPaths = new Map();
    for (const covered of coveredPairs) {
      const [taskMarkdown, testMarkdown, sourceTaskMarkdown, sourceTestMarkdown] =
        await Promise.all([
        showGitFile(
          commandCache,
          identity.repositoryRoot,
          identity.currentMainSha,
          covered.taskPath,
        ),
        showGitFile(
          commandCache,
          identity.repositoryRoot,
          identity.currentMainSha,
          covered.testPath,
        ),
        showGitFile(
          commandCache,
          identity.repositoryRoot,
          checkpoint.sourceMainSha,
          covered.taskPath,
        ),
        showGitFile(
          commandCache,
          identity.repositoryRoot,
          checkpoint.sourceMainSha,
          covered.testPath,
        ),
      ]);
      if (
        taskMarkdown === undefined ||
        testMarkdown === undefined ||
        sectionStatus(taskMarkdown) !== "DONE" ||
        sectionStatus(testMarkdown) !== "PASSED"
      ) {
        throw hydrationError(
          covered.task.id,
          "CHECKPOINT_PAIR_STATE",
          "aligned main terminal Task/Test bytes are missing or nonterminal",
        );
      }
      if (
        isImmutableTerminalTaskContractVersion(
          getTaskContractVersion(sourceTaskMarkdown),
        )
      ) {
        if (
          getTaskContractVersion(sourceTestMarkdown) !==
            getTaskContractVersion(sourceTaskMarkdown) ||
          sectionStatus(sourceTaskMarkdown ?? "") !== "DONE" ||
          sectionStatus(sourceTestMarkdown ?? "") !== "PASSED"
        ) {
          throw immutableTerminalPairError(
            covered.task.id,
            covered.taskPath,
            "checkpoint source main does not contain one valid canonical terminal pair",
          );
        }
        for (const [relativePath, currentBytes, canonicalBytes] of [
          [covered.taskPath, taskMarkdown, sourceTaskMarkdown],
          [covered.testPath, testMarkdown, sourceTestMarkdown],
        ]) {
          immutableCoveredPaths.set(relativePath, covered.task.id);
          if (currentBytes !== canonicalBytes) {
            throw immutableTerminalPairError(
              covered.task.id,
              relativePath,
              "aligned main bytes differ from the checkpoint-bound canonical terminal artifact",
            );
          }
        }
      }
      terminalPairs.push({
        taskId: covered.task.id,
        taskSha256: sha256Text(taskMarkdown),
        testSha256: sha256Text(testMarkdown),
        taskStatus: "DONE",
        testStatus: "PASSED",
      });
    }
    if (
      digestStandardDeliveryContinuityTerminalPairs(terminalPairs) !==
      checkpoint.coverage.terminalPairStateSha256
    ) {
      throw hydrationError(
        undefined,
        "CHECKPOINT_PAIR_STATE",
        "terminal Task/Test state digest does not match aligned main",
      );
    }
    const historicalChanges = await gitText(
      commandCache,
      identity.repositoryRoot,
      [
        "log",
        "--format=",
        "--name-only",
        `${checkpoint.sourceMainSha}..${identity.currentMainSha}`,
        "--",
        ...coveredPaths,
      ],
      { role: "CHECKPOINT_PAIR_STATE" },
    );
    if (historicalChanges) {
      const changedPath = historicalChanges
        .split(/\r?\n/)
        .map((value) => value.trim().replaceAll("\\", "/"))
        .find(Boolean);
      const immutableTaskId = immutableCoveredPaths.get(changedPath);
      if (immutableTaskId) {
        throw immutableTerminalPairError(
          immutableTaskId,
          changedPath,
          "terminal artifact history changed after the checkpoint binding",
        );
      }
      throw hydrationError(
        undefined,
        "CHECKPOINT_PAIR_STATE",
        "a checkpoint-covered terminal pair changed after checkpoint source main",
      );
    }
    const worktreeChanges = await gitText(
      commandCache,
      identity.repositoryRoot,
      ["diff", "--name-only", identity.currentMainSha, "--", ...coveredPaths],
      { role: "CHECKPOINT_PAIR_STATE" },
    );
    if (worktreeChanges) {
      const changedPath = worktreeChanges
        .split(/\r?\n/)
        .map((value) => value.trim().replaceAll("\\", "/"))
        .find(
          (value) =>
            Boolean(value) && !immutableNewlineEquivalentPaths.has(value),
        );
      if (changedPath) {
        const immutableTaskId = immutableCoveredPaths.get(changedPath);
        if (immutableTaskId) {
          throw immutableTerminalPairError(
            immutableTaskId,
            changedPath,
            "working-tree substitution changed a canonical terminal artifact",
          );
        }
        throw hydrationError(
          undefined,
          "CHECKPOINT_PAIR_STATE",
          "working-tree substitution changed a checkpoint-covered terminal pair",
        );
      }
    }
  }
  return Object.freeze({
    checkpoint,
    partition,
    coveragePartition,
    coverageTasks: continuityCoverageTasks,
    recoveredImmutableTaskIds,
    identity,
    source,
  });
}

async function prepareEmptyHistoryStandardDeliveryContinuity({
  tasksRoot,
  commandCache,
}) {
  const requestedRoot = path.resolve(tasksRoot);
  const repositoryRoot = await gitText(
    commandCache,
    requestedRoot,
    ["rev-parse", "--show-toplevel"],
    { role: "EMPTY_CHECKPOINT" },
  );
  if (!(await tasksRootMatchesRepository(requestedRoot, repositoryRoot))) {
    throw hydrationError(
      undefined,
      "EMPTY_CHECKPOINT",
      "tasks root must be the repository docs/tasks directory",
    );
  }
  const [currentMainSha, upstreamSha, cachedMainSha, originUrl] =
    await Promise.all([
      gitText(commandCache, repositoryRoot, ["rev-parse", "refs/heads/main"], {
        role: "EMPTY_CHECKPOINT",
      }),
      gitText(commandCache, repositoryRoot, ["rev-parse", "main@{upstream}"], {
        role: "EMPTY_CHECKPOINT",
      }),
      gitText(
        commandCache,
        repositoryRoot,
        ["rev-parse", "refs/remotes/origin/main"],
        { role: "EMPTY_CHECKPOINT" },
      ),
      gitText(commandCache, repositoryRoot, ["remote", "get-url", "origin"], {
        role: "EMPTY_CHECKPOINT",
      }),
    ]);
  requireSha(currentMainSha, undefined, "EMPTY_CHECKPOINT", "local main");
  if (upstreamSha !== currentMainSha || cachedMainSha !== currentMainSha) {
    throw hydrationError(
      undefined,
      "EMPTY_CHECKPOINT",
      "local main, upstream, and cached origin/main must align",
    );
  }
  const repository = parseRepositorySlug(originUrl);
  const mainBytes = await showGitFile(
    commandCache,
    repositoryRoot,
    currentMainSha,
    STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH,
  );
  if (mainBytes !== undefined) {
    const checkpoint = parseStandardDeliveryContinuityCheckpoint(mainBytes);
    if (
      checkpoint.repository !== repository ||
      checkpoint.coverage.taskCount !== 0
    ) {
      throw hydrationError(
        undefined,
        "EMPTY_CHECKPOINT",
        "aligned-main checkpoint does not represent this empty delivery history",
      );
    }
    return Object.freeze({
      repository,
      repositoryRoot,
      currentMainSha,
      upstreamSha,
      cachedMainSha,
      checkpoint,
      preparedCheckpoint: undefined,
      source: "ALIGNED_MAIN",
    });
  }
  const created = createStandardDeliveryContinuityCheckpoint({
    repository,
    baseRef: "main",
    sourceMainSha: currentMainSha,
    coveredRecords: [],
  });
  return Object.freeze({
    repository,
    repositoryRoot,
    currentMainSha,
    upstreamSha,
    cachedMainSha,
    checkpoint: created.checkpoint,
    preparedCheckpoint: created.checkpoint,
    source: "EMPTY_HISTORY_PREPARED",
  });
}

const EVIDENCE_KEYS = Object.freeze({
  PR_ACTUAL_HEAD: Object.freeze([
    "schema",
    "role",
    "repository",
    "event",
    "pr",
    "workflow",
    "run_id",
    "run_attempt",
    "job",
    "expected_sha",
    "actual_sha",
  ]),
  POST_MERGE_MAIN: Object.freeze([
    "schema",
    "role",
    "repository",
    "event",
    "pr",
    "workflow",
    "run_id",
    "run_attempt",
    "job",
    "expected_sha",
    "actual_sha",
  ]),
  PR_MERGE_COMPATIBILITY: Object.freeze([
    "schema",
    "role",
    "repository",
    "event",
    "pr",
    "workflow",
    "run_id",
    "run_attempt",
    "job",
    "expected_sha",
    "actual_sha",
    "expected_base_sha",
    "actual_base_sha",
    "expected_head_sha",
    "actual_head_sha",
  ]),
});

export function parseKywCiEvidence(log) {
  const records = [];
  for (const rawLine of String(log).split(/\r?\n/)) {
    const line = rawLine
      .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
      .replace(/\^(\[\[[0-9;]*[a-zA-Z])/g, "");
    const marker = line.indexOf("KYWCIEVIDENCE ");
    if (marker === -1) continue;
    const prefix = line.slice(0, marker);
    if (/(?:printf|echo)\s*['"]/i.test(prefix)) continue;
    const fields = {};
    for (const token of line.slice(marker + "KYWCIEVIDENCE ".length).trim().split(/\s+/)) {
      const separator = token.indexOf("=");
      if (separator <= 0 || separator === token.length - 1) {
        throw hydrationError(undefined, "JOB_LOG", "malformed KYWCIEVIDENCE token");
      }
      const key = token.slice(0, separator);
      if (Object.hasOwn(fields, key)) {
        throw hydrationError(undefined, "JOB_LOG", `duplicate evidence field ${key}`);
      }
      fields[key] = token.slice(separator + 1);
    }
    records.push(fields);
  }
  if (records.length !== 1) {
    throw hydrationError(
      undefined,
      "JOB_LOG",
      "expected exactly one emitted KYWCIEVIDENCE record",
    );
  }
  const record = records[0];
  const expectedKeys = EVIDENCE_KEYS[record.role];
  if (
    !expectedKeys ||
    Object.keys(record).sort().join(",") !== [...expectedKeys].sort().join(",") ||
    record.schema !== "2"
  ) {
    throw hydrationError(
      undefined,
      "JOB_LOG",
      "KYWCIEVIDENCE schema, role, or fields are malformed",
    );
  }
  record.schema = 2;
  return record;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function exact(value, expected, taskId, role, label) {
  if (value !== expected) {
    throw hydrationError(
      taskId,
      role,
      `${label} must equal ${JSON.stringify(expected)}`,
    );
  }
}

function apiField(value, camelName, snakeName = camelName) {
  return value?.[camelName] ?? value?.[snakeName];
}

function normalizePullRequest(raw) {
  return {
    number: Number(raw?.number),
    headSha: apiField(raw?.head, "sha"),
    headRef: apiField(raw?.head, "ref"),
    headRepository: apiField(raw?.head?.repo, "fullName", "full_name"),
    baseRef: apiField(raw?.base, "ref"),
    baseSha: apiField(raw?.base, "sha"),
    baseRepository: apiField(raw?.base?.repo, "fullName", "full_name"),
    mergeSha: apiField(raw, "mergeSha", "merge_commit_sha"),
    merged: raw?.merged === true || Boolean(apiField(raw, "mergedAt", "merged_at")),
    draft: raw?.draft === true,
  };
}

function normalizeRun(raw, attemptOverride) {
  return {
    id: Number(raw?.id),
    runAttempt: Number(
      attemptOverride ?? apiField(raw, "runAttempt", "run_attempt"),
    ),
    workflowId: Number(apiField(raw, "workflowId", "workflow_id")),
    workflowName: raw?.workflowName ?? raw?.name,
    workflowPath: raw?.workflowPath ?? raw?.path,
    event: raw?.event,
    headBranch: apiField(raw, "headBranch", "head_branch"),
    headSha: apiField(raw, "headSha", "head_sha"),
    status: String(raw?.status ?? "").toLowerCase(),
    conclusion: String(raw?.conclusion ?? "").toLowerCase(),
    createdAt: apiField(raw, "createdAt", "created_at") ?? "",
    runStartedAt: apiField(raw, "runStartedAt", "run_started_at") ?? "",
    updatedAt: apiField(raw, "updatedAt", "updated_at") ?? "",
    pullRequestNumbers: Array.isArray(raw?.pull_requests)
      ? raw.pull_requests.map((pullRequest) => Number(pullRequest?.number))
      : Array.isArray(raw?.pullRequestNumbers)
        ? raw.pullRequestNumbers.map(Number)
        : [],
  };
}

function normalizeJobStep(raw) {
  return {
    number: Number(raw?.number),
    name: raw?.name,
    status: String(raw?.status ?? "").toLowerCase(),
    conclusion: String(raw?.conclusion ?? "").toLowerCase(),
    startedAt: apiField(raw, "startedAt", "started_at") ?? "",
    completedAt: apiField(raw, "completedAt", "completed_at") ?? "",
  };
}

function normalizeJob(raw, {
  runAttempt,
  apiRunAttempt,
  collectionAttempt,
  evidence,
  rawLog,
} = {}) {
  return {
    id: Number(raw?.id),
    runId: Number(apiField(raw, "runId", "run_id")),
    runAttempt: Number(
      runAttempt ?? apiField(raw, "runAttempt", "run_attempt"),
    ),
    apiRunAttempt: Number(
      apiRunAttempt ?? apiField(raw, "runAttempt", "run_attempt"),
    ),
    collectionAttempt:
      collectionAttempt === undefined ? undefined : Number(collectionAttempt),
    name: raw?.name,
    headSha: apiField(raw, "headSha", "head_sha"),
    status: String(raw?.status ?? "").toLowerCase(),
    conclusion: String(raw?.conclusion ?? "").toLowerCase(),
    startedAt: apiField(raw, "startedAt", "started_at") ?? "",
    completedAt: apiField(raw, "completedAt", "completed_at") ?? "",
    runnerId: Number(apiField(raw, "runnerId", "runner_id") ?? 0),
    runnerName: apiField(raw, "runnerName", "runner_name") ?? "",
    runnerGroupId: Number(
      apiField(raw, "runnerGroupId", "runner_group_id") ?? 0,
    ),
    runnerGroupName:
      apiField(raw, "runnerGroupName", "runner_group_name") ?? "",
    labels: Array.isArray(raw?.labels) ? [...raw.labels] : [],
    steps: Array.isArray(raw?.steps)
      ? raw.steps.map((step) => normalizeJobStep(step))
      : [],
    evidence: evidence ?? raw?.evidence,
    rawLog: rawLog ?? raw?.rawLog,
  };
}

function normalizeCommit(raw) {
  return {
    sha: raw?.sha,
    parents: Array.isArray(raw?.parents)
      ? raw.parents.map((parent) => (typeof parent === "string" ? parent : parent?.sha))
      : [],
  };
}

function normalizeWorkflow(raw) {
  return {
    id: Number(raw?.id),
    name: raw?.name,
    path: raw?.path,
    state: raw?.state,
  };
}

function newestRun(runs, taskId, role) {
  if (runs.length === 0) {
    throw hydrationError(taskId, role, "required workflow run is missing");
  }
  return [...runs].sort(
    (left, right) =>
      String(right.createdAt).localeCompare(String(left.createdAt)) ||
      right.id - left.id,
  )[0];
}

const RESUMABLE_RUN_STATUSES = new Set([
  "queued",
  "in_progress",
  "pending",
  "requested",
  "waiting",
]);

function assertSuccessfulRunState(run, taskId, role, { pendingAllowed = false } = {}) {
  if (run.status === "completed" && run.conclusion === "success") return;
  if (
    pendingAllowed &&
    RESUMABLE_RUN_STATUSES.has(run.status) &&
    !run.conclusion
  ) {
    throw hydrationError(
      taskId,
      role,
      `latest run ${run.id} attempt ${run.runAttempt} is ${run.status}`,
      "DELIVERY_HYDRATION_PENDING",
    );
  }
  throw hydrationError(
    taskId,
    role,
    `latest run ${run.id} attempt ${run.runAttempt} is ${run.status}/${run.conclusion || "NONE"}`,
    "DELIVERY_BLOCKED",
  );
}

export function createGitHubEvidenceClient({
  repository,
  repositoryRoot,
  commandCache,
}) {
  async function api(endpoint, { taskId, role }) {
    const result = await commandCache.run({
      command: "gh",
      args: [
        "api",
        "--hostname",
        "github.com",
        "--method",
        "GET",
        endpoint,
      ],
      cwd: repositoryRoot,
      taskId,
      role,
      maxBuffer: MAX_LOG_BYTES,
    });
    try {
      return JSON.parse(result.stdout);
    } catch {
      throw hydrationError(
        taskId,
        role,
        "GitHub returned malformed JSON",
        "DELIVERY_HYDRATION_EXTERNAL_FAILURE",
      );
    }
  }

  async function listCounted(endpoint, field, { taskId, role }) {
    const response = await api(
      `${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=${MAX_GITHUB_RESULTS}&page=1`,
      { taskId, role },
    );
    if (
      !isRecord(response) ||
      !Array.isArray(response[field]) ||
      !Number.isSafeInteger(response.total_count) ||
      response.total_count < 0 ||
      response.total_count !== response[field].length ||
      response.total_count > MAX_GITHUB_RESULTS
    ) {
      throw hydrationError(
        taskId,
        role,
        `GitHub ${field} pagination is partial, malformed, or exceeds bound ${MAX_GITHUB_RESULTS}`,
        "DELIVERY_HYDRATION_BOUND_EXCEEDED",
      );
    }
    return response[field];
  }

  return Object.freeze({
    async getMainRef(context = {}) {
      return api(`repos/${repository}/git/ref/heads/main`, {
        ...context,
        role: context.role ?? "GITHUB_MAIN",
      });
    },
    async getWorkflow(context = {}) {
      return api(`repos/${repository}/actions/workflows/ci.yml`, {
        ...context,
        role: context.role ?? "GITHUB_WORKFLOW",
      });
    },
    async getPullRequest(number, context = {}) {
      return api(`repos/${repository}/pulls/${number}`, context);
    },
    async listPullRequests(query, context = {}) {
      const parameters = new URLSearchParams({
        ...query,
        per_page: String(MAX_GITHUB_RESULTS),
        page: "1",
      });
      const response = await api(
        `repos/${repository}/pulls?${parameters}`,
        context,
      );
      if (!Array.isArray(response) || response.length >= MAX_GITHUB_RESULTS) {
        throw hydrationError(
          context.taskId,
          context.role,
          `GitHub pull request pagination is malformed or reaches bound ${MAX_GITHUB_RESULTS}`,
          "DELIVERY_HYDRATION_BOUND_EXCEEDED",
        );
      }
      return response;
    },
    async listReviews(number, context = {}) {
      const reviews = [];
      for (let page = 1; page <= MAX_REVIEW_PAGES; page += 1) {
        const response = await api(
          `repos/${repository}/pulls/${number}/reviews?per_page=${MAX_GITHUB_RESULTS}&page=${page}`,
          context,
        );
        if (!Array.isArray(response)) {
          throw hydrationError(
            context.taskId,
            context.role,
            "GitHub reviews response is malformed",
            "DELIVERY_HYDRATION_EXTERNAL_FAILURE",
          );
        }
        reviews.push(...response);
        if (response.length < MAX_GITHUB_RESULTS) return reviews;
      }
      throw hydrationError(
        context.taskId,
        context.role,
        `review pagination exceeds ${MAX_REVIEW_PAGES} pages`,
        "DELIVERY_HYDRATION_BOUND_EXCEEDED",
      );
    },
    async listRuns(workflowId, query, context = {}) {
      const parameters = new URLSearchParams(query);
      return listCounted(
        `repos/${repository}/actions/workflows/${workflowId}/runs?${parameters}`,
        "workflow_runs",
        context,
      );
    },
    async getRunAttempt(runId, attempt, context = {}) {
      return api(
        `repos/${repository}/actions/runs/${runId}/attempts/${attempt}`,
        context,
      );
    },
    async listJobs(runId, attemptOrFilter, context = {}) {
      if (positiveInteger(attemptOrFilter)) {
        return listCounted(
          `repos/${repository}/actions/runs/${runId}/attempts/${attemptOrFilter}/jobs`,
          "jobs",
          context,
        );
      }
      if (!["all", "latest"].includes(attemptOrFilter)) {
        throw hydrationError(
          context.taskId,
          context.role,
          "job collection selector must be an attempt or all/latest",
        );
      }
      return listCounted(
        `repos/${repository}/actions/runs/${runId}/jobs?filter=${attemptOrFilter}`,
        "jobs",
        context,
      );
    },
    async getJobLog(runId, attempt, jobId, context = {}) {
      const result = await commandCache.run({
        command: "gh",
        args: [
          "run",
          "view",
          String(runId),
          "--repo",
          `github.com/${repository}`,
          "--attempt",
          String(attempt),
          "--job",
          String(jobId),
          "--log",
        ],
        cwd: repositoryRoot,
        taskId: context.taskId,
        role: context.role,
        maxBuffer: MAX_LOG_BYTES,
      });
      if (Buffer.byteLength(result.stdout, "utf8") > MAX_LOG_BYTES) {
        throw hydrationError(
          context.taskId,
          context.role,
          `job log exceeds ${MAX_LOG_BYTES} bytes`,
          "DELIVERY_HYDRATION_BOUND_EXCEEDED",
        );
      }
      return result.stdout;
    },
    async getCommit(sha, context = {}) {
      return api(`repos/${repository}/git/commits/${sha}`, context);
    },
  });
}

function reviewState(reviews) {
  const latestByAuthor = new Map();
  for (const review of reviews) {
    const author = review?.user?.login;
    const state = String(review?.state ?? "").toUpperCase();
    if (!author || !state) continue;
    const previous = latestByAuthor.get(author);
    const submitted = apiField(review, "submittedAt", "submitted_at") ?? "";
    if (!previous || submitted >= previous.submitted) {
      latestByAuthor.set(author, { state, submitted });
    }
  }
  return [...latestByAuthor.values()].some(
    ({ state }) => state === "CHANGES_REQUESTED",
  )
    ? "CHANGES_REQUESTED"
    : "CLEAR";
}

function validatePullRequestSnapshot({
  outcome,
  repository,
  rawPullRequest,
  reviews,
}) {
  const role = "PULL_REQUEST";
  const pullRequest = normalizePullRequest(rawPullRequest);
  exact(pullRequest.number, outcome.pullRequestNumber, outcome.taskId, role, "number");
  exact(pullRequest.headSha, outcome.outcomeSha, outcome.taskId, role, "head SHA");
  if (outcome.headRef) {
    exact(pullRequest.headRef, outcome.headRef, outcome.taskId, role, "head ref");
  }
  if (!pullRequest.headRef) {
    throw hydrationError(outcome.taskId, role, "head ref is missing");
  }
  exact(
    pullRequest.headRepository,
    repository,
    outcome.taskId,
    role,
    "head repository",
  );
  exact(pullRequest.baseRef, outcome.baseRef, outcome.taskId, role, "base ref");
  exact(pullRequest.baseSha, outcome.baseSha, outcome.taskId, role, "base SHA");
  exact(
    pullRequest.baseRepository,
    repository,
    outcome.taskId,
    role,
    "base repository",
  );
  exact(pullRequest.mergeSha, outcome.mergeSha, outcome.taskId, role, "merge SHA");
  exact(pullRequest.merged, true, outcome.taskId, role, "merged state");
  exact(pullRequest.draft, false, outcome.taskId, role, "draft state");
  if (reviewState(reviews) !== "CLEAR") {
    throw hydrationError(
      outcome.taskId,
      role,
      "latest review state contains CHANGES_REQUESTED",
    );
  }
  return pullRequest;
}

function validateCurrentPullRequestSnapshot({
  outcome,
  repository,
  rawPullRequest,
  reviews,
}) {
  const role = "CURRENT_PULL_REQUEST";
  const pullRequest = normalizePullRequest(rawPullRequest);
  if (!positiveInteger(pullRequest.number)) {
    throw hydrationError(outcome.taskId, role, "number must be a positive integer");
  }
  exact(pullRequest.number, outcome.pullRequestNumber, outcome.taskId, role, "number");
  exact(pullRequest.headSha, outcome.outcomeSha, outcome.taskId, role, "head SHA");
  exact(pullRequest.headRef, outcome.headRef, outcome.taskId, role, "head ref");
  exact(
    pullRequest.headRepository,
    repository,
    outcome.taskId,
    role,
    "head repository",
  );
  exact(pullRequest.baseRef, outcome.baseRef, outcome.taskId, role, "base ref");
  exact(pullRequest.baseSha, outcome.baseSha, outcome.taskId, role, "base SHA");
  exact(
    pullRequest.baseRepository,
    repository,
    outcome.taskId,
    role,
    "base repository",
  );
  exact(pullRequest.draft, false, outcome.taskId, role, "draft state");
  const state = String(rawPullRequest?.state ?? "").toUpperCase();
  if (state !== "OPEN" || pullRequest.merged) {
    throw hydrationError(
      outcome.taskId,
      role,
      "a pre-merge delivery probe requires one open, unmerged pull request",
    );
  }
  return Object.freeze({
    ...pullRequest,
    state,
    review: reviews === undefined ? "PENDING" : reviewState(reviews),
    mergeable:
      typeof rawPullRequest?.mergeable === "boolean"
        ? rawPullRequest.mergeable
        : undefined,
    mergeableState: String(
      apiField(rawPullRequest, "mergeableState", "mergeable_state") ?? "",
    ).toLowerCase(),
  });
}

function pendingHardenedDeliverySnapshot({
  task,
  repository,
  outcome,
  workflowContract,
  pullRequest,
  pullRequestStages,
  stage,
  chronology = [],
  commandCache,
}) {
  const entry = {
    schemaVersion: 2,
    claim: "PENDING",
    source: "GITHUB",
    taskId: task.id,
    repository,
    outcomeSha: outcome.outcomeSha,
    pullRequest: {
      number: pullRequest.number,
      headSha: pullRequest.headSha,
      baseRef: pullRequest.baseRef,
      baseSha: pullRequest.baseSha,
      state: "OPEN",
      review: pullRequest.review,
    },
    ...(pullRequestStages
      ? {
          actualHead: pullRequestStages.actualHead,
          mergeCompatibility: pullRequestStages.mergeCompatibility,
        }
      : {}),
  };
  return Object.freeze({
    deliveryLedger: Object.freeze({ [task.id]: Object.freeze(entry) }),
    deliveryExpectations: Object.freeze({
      [task.id]: Object.freeze(
        hardenedExpectation(outcome, repository, workflowContract),
      ),
    }),
    classifications: Object.freeze({ [task.id]: "HARDENED_EXACT_HEAD" }),
    chronology: Object.freeze([...chronology]),
    diagnostics: Object.freeze({
      taskId: task.id,
      state: "RESUMABLE",
      source: "CURRENT_DELIVERY_PROBE",
      stage,
      cache: commandCache.stats(),
    }),
  });
}

function resumableCurrentDeliverySnapshot({ task, stage, source, commandCache }) {
  return Object.freeze({
    deliveryLedger: Object.freeze({}),
    deliveryExpectations: Object.freeze({}),
    classifications: Object.freeze({ [task.id]: "PENDING" }),
    chronology: Object.freeze([]),
    diagnostics: Object.freeze({
      taskId: task.id,
      state: "RESUMABLE",
      source,
      stage,
      cache: commandCache.stats(),
    }),
  });
}

function validateRun(run, {
  taskId,
  role,
  repository,
  workflow,
  event,
  branch,
  sha,
  pullRequestNumber,
}) {
  if (!positiveInteger(run.id) || !positiveInteger(run.runAttempt)) {
    throw hydrationError(taskId, role, "run ID and attempt must be positive integers");
  }
  exact(run.workflowId, workflow.id, taskId, role, "workflow ID");
  exact(run.workflowName, workflow.name, taskId, role, "workflow name");
  exact(run.workflowPath, workflow.path, taskId, role, "workflow path");
  exact(run.event, event, taskId, role, "event");
  exact(run.headBranch, branch, taskId, role, "head branch");
  exact(run.headSha, sha, taskId, role, "run head SHA");
  exact(run.status, "completed", taskId, role, "status");
  exact(run.conclusion, "success", taskId, role, "conclusion");
  if (
    pullRequestNumber !== undefined &&
    run.pullRequestNumbers.length > 0 &&
    !run.pullRequestNumbers.includes(pullRequestNumber)
  ) {
    throw hydrationError(taskId, role, "run is associated with a different pull request");
  }
  return run;
}

function findExactJob(jobs, name, taskId, role) {
  const matches = jobs.filter((job) => job.name === name);
  if (matches.length !== 1) {
    throw hydrationError(
      taskId,
      role,
      `expected exactly one job named ${JSON.stringify(name)}`,
    );
  }
  return matches[0];
}

function validateJobEnvelope(job, run, taskId, role) {
  if (!positiveInteger(job.id) || !positiveInteger(job.runAttempt)) {
    throw hydrationError(
      taskId,
      role,
      "job ID and actual execution attempt must be positive integers",
    );
  }
  exact(job.runId, run.id, taskId, role, "job run ID");
  if (job.runAttempt > run.runAttempt) {
    throw hydrationError(
      taskId,
      role,
      "job actual execution attempt exceeds the run-level latest attempt",
    );
  }
  exact(job.headSha, run.headSha, taskId, role, "job head SHA");
  exact(job.status, "completed", taskId, role, "job status");
  exact(job.conclusion, "success", taskId, role, "job conclusion");
}

function validateEvidenceRecord(record, {
  taskId,
  role,
  repository,
  event,
  pullRequestNumber,
  workflow,
  run,
  executionAttempt,
  jobKey,
  expectedSha,
}) {
  if (!isRecord(record)) {
    throw hydrationError(taskId, role, "checkout log evidence is missing");
  }
  exact(record.schema, 2, taskId, role, "evidence schema");
  exact(record.role, role, taskId, role, "evidence role");
  exact(record.repository, repository, taskId, role, "evidence repository");
  exact(record.event, event, taskId, role, "evidence event");
  exact(
    record.pr,
    String(pullRequestNumber),
    taskId,
    role,
    "evidence pull request",
  );
  exact(record.workflow, workflow.name, taskId, role, "evidence workflow");
  exact(record.run_id, String(run.id), taskId, role, "evidence run ID");
  exact(
    record.run_attempt,
    String(executionAttempt),
    taskId,
    role,
    "evidence actual execution attempt",
  );
  exact(record.job, jobKey, taskId, role, "evidence job key");
  exact(record.expected_sha, expectedSha, taskId, role, "expected checkout SHA");
  exact(record.actual_sha, expectedSha, taskId, role, "actual checkout SHA");
}

function checkoutLedgerJob(job, key, expectedSha) {
  return {
    id: job.id,
    name: job.name,
    key,
    conclusion: "SUCCESS",
    expectedSha,
    actualCheckoutSha: job.evidence.actual_sha,
  };
}

function normalizeAcceptedJobs({
  jobs,
  run,
  taskId,
  role,
  names,
  workflowContract,
  repository,
  event,
  pullRequestNumber,
  expectedSha,
}) {
  return names.map((name) => {
    const job = findExactJob(jobs, name, taskId, role);
    validateJobEnvelope(job, run, taskId, role);
    const jobKey = workflowContract.jobKeys[name];
    validateEvidenceRecord(job.evidence, {
      taskId,
      role,
      repository,
      event,
      pullRequestNumber,
      workflow: workflowContract.workflow,
      run,
      executionAttempt: job.runAttempt,
      jobKey,
      expectedSha,
    });
    return checkoutLedgerJob(job, jobKey, expectedSha);
  });
}

function normalizeGateJob({
  jobs,
  run,
  taskId,
  role,
  workflowContract,
}) {
  const job = findExactJob(
    jobs,
    workflowContract.requiredGateJob,
    taskId,
    role,
  );
  validateJobEnvelope(job, run, taskId, role);
  return {
    id: job.id,
    name: job.name,
    key: workflowContract.jobKeys[job.name],
    conclusion: "SUCCESS",
  };
}

function hardenedExpectation(outcome, repository, workflowContract) {
  return {
    schemaVersion: 2,
    source: "LOCAL_GIT",
    taskId: outcome.taskId,
    repository,
    baseRef: outcome.baseRef,
    baseSha: outcome.baseSha,
    outcomeSha: outcome.outcomeSha,
    deliveryContract: {
      kind: "HARDENED_EXACT_HEAD",
      version: 2,
      workflow: workflowContract.workflow,
      actualHeadJobs: [...workflowContract.actualHeadJobs],
      mergeCompatibilityJob: workflowContract.mergeCompatibilityJob,
      requiredGateJob: workflowContract.requiredGateJob,
      postMergeJobs: [...workflowContract.postMergeJobs],
    },
  };
}

function normalizeHardenedPullRequestStages({
  outcome,
  pullRequest,
  repository,
  workflowContract,
  snapshot,
}) {
  const prRun = validateRun(normalizeRun(snapshot.pullRequestRun), {
    taskId: outcome.taskId,
    role: "PR_ACTUAL_HEAD",
    repository,
    workflow: workflowContract.workflow,
    event: "pull_request",
    branch: outcome.headRef,
    sha: outcome.outcomeSha,
    pullRequestNumber: outcome.pullRequestNumber,
  });
  const prJobs = (snapshot.pullRequestJobs ?? []).map((job) => normalizeJob(job));
  const actualHeadJobs = normalizeAcceptedJobs({
    jobs: prJobs,
    run: prRun,
    taskId: outcome.taskId,
    role: "PR_ACTUAL_HEAD",
    names: workflowContract.actualHeadJobs,
    workflowContract,
    repository,
    event: "pull_request",
    pullRequestNumber: outcome.pullRequestNumber,
    expectedSha: outcome.outcomeSha,
  });
  const actualGate = normalizeGateJob({
    jobs: prJobs,
    run: prRun,
    taskId: outcome.taskId,
    role: "PR_ACTUAL_HEAD",
    workflowContract,
  });

  const mergeJob = findExactJob(
    prJobs,
    workflowContract.mergeCompatibilityJob,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
  );
  validateJobEnvelope(
    mergeJob,
    prRun,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
  );
  const mergeEvidence = mergeJob.evidence;
  validateEvidenceRecord(mergeEvidence, {
    taskId: outcome.taskId,
    role: "PR_MERGE_COMPATIBILITY",
    repository,
    event: "pull_request",
    pullRequestNumber: outcome.pullRequestNumber,
    workflow: workflowContract.workflow,
    run: prRun,
    executionAttempt: mergeJob.runAttempt,
    jobKey: workflowContract.jobKeys[workflowContract.mergeCompatibilityJob],
    expectedSha: mergeEvidence?.expected_sha,
  });
  requireSha(
    mergeEvidence?.expected_sha,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
    "synthetic merge SHA",
  );
  exact(
    mergeEvidence.actual_sha,
    mergeEvidence.expected_sha,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
    "actual synthetic merge SHA",
  );
  exact(
    mergeEvidence.expected_base_sha,
    outcome.baseSha,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
    "expected base parent",
  );
  exact(
    mergeEvidence.actual_base_sha,
    outcome.baseSha,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
    "actual base parent",
  );
  exact(
    mergeEvidence.expected_head_sha,
    outcome.outcomeSha,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
    "expected head parent",
  );
  exact(
    mergeEvidence.actual_head_sha,
    outcome.outcomeSha,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
    "actual head parent",
  );
  const syntheticCommit = normalizeCommit(snapshot.syntheticCommit);
  exact(
    syntheticCommit.sha,
    mergeEvidence.expected_sha,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
    "GitHub synthetic commit SHA",
  );
  if (
    syntheticCommit.parents.length !== 2 ||
    syntheticCommit.parents[0] !== outcome.baseSha ||
    syntheticCommit.parents[1] !== outcome.outcomeSha
  ) {
    throw hydrationError(
      outcome.taskId,
      "PR_MERGE_COMPATIBILITY",
      "synthetic commit must have exactly two ordered base/head parents",
    );
  }

  return Object.freeze({
    run: prRun,
    actualHead: {
      role: "PR_ACTUAL_HEAD",
      repository,
      event: "pull_request",
      pullRequestNumber: pullRequest.number,
      workflowId: workflowContract.workflow.id,
      workflowName: workflowContract.workflow.name,
      workflowPath: workflowContract.workflow.path,
      runId: prRun.id,
      runAttempt: prRun.runAttempt,
      runHeadSha: prRun.headSha,
      jobs: actualHeadJobs,
      gateJob: actualGate,
    },
    mergeCompatibility: Object.freeze({
      role: "PR_MERGE_COMPATIBILITY",
      repository,
      event: "pull_request",
      pullRequestNumber: pullRequest.number,
      workflowId: workflowContract.workflow.id,
      workflowName: workflowContract.workflow.name,
      workflowPath: workflowContract.workflow.path,
      runId: prRun.id,
      runAttempt: prRun.runAttempt,
      runHeadSha: prRun.headSha,
      syntheticMergeSha: syntheticCommit.sha,
      expectedBaseSha: outcome.baseSha,
      actualBaseParentSha: syntheticCommit.parents[0],
      expectedHeadSha: outcome.outcomeSha,
      actualHeadParentSha: syntheticCommit.parents[1],
      job: checkoutLedgerJob(
        mergeJob,
        workflowContract.jobKeys[mergeJob.name],
        syntheticCommit.sha,
      ),
    }),
  });
}

export function normalizeHardenedDeliveryEvidence({
  outcome,
  repository,
  workflowContract,
  snapshot,
}) {
  const pullRequest = validatePullRequestSnapshot({
    outcome,
    repository,
    rawPullRequest: snapshot.pullRequest,
    reviews: snapshot.reviews ?? [],
  });
  const pullRequestStages = normalizeHardenedPullRequestStages({
    outcome,
    pullRequest,
    repository,
    workflowContract,
    snapshot,
  });
  const postRun = validateRun(normalizeRun(snapshot.postMergeRun), {
    taskId: outcome.taskId,
    role: "POST_MERGE_MAIN",
    repository,
    workflow: workflowContract.workflow,
    event: "push",
    branch: outcome.baseRef,
    sha: outcome.mergeSha,
  });
  if (postRun.id === pullRequestStages.run.id) {
    throw hydrationError(
      outcome.taskId,
      "POST_MERGE_MAIN",
      "post-main run must be distinct from the pull-request run",
    );
  }
  const postJobs = (snapshot.postMergeJobs ?? []).map((job) => normalizeJob(job));
  const postMergeJobs = normalizeAcceptedJobs({
    jobs: postJobs,
    run: postRun,
    taskId: outcome.taskId,
    role: "POST_MERGE_MAIN",
    names: workflowContract.postMergeJobs,
    workflowContract,
    repository,
    event: "push",
    pullRequestNumber: 0,
    expectedSha: outcome.mergeSha,
  });
  const postGate = normalizeGateJob({
    jobs: postJobs,
    run: postRun,
    taskId: outcome.taskId,
    role: "POST_MERGE_MAIN",
    workflowContract,
  });

  const entry = {
    schemaVersion: 2,
    claim: "FINAL",
    source: "GITHUB",
    taskId: outcome.taskId,
    repository,
    outcomeSha: outcome.outcomeSha,
    pullRequest: {
      number: pullRequest.number,
      headSha: pullRequest.headSha,
      baseRef: pullRequest.baseRef,
      baseSha: pullRequest.baseSha,
      mergeSha: pullRequest.mergeSha,
      state: "MERGED",
      review: "CLEAR",
    },
    actualHead: pullRequestStages.actualHead,
    mergeCompatibility: pullRequestStages.mergeCompatibility,
    merge: {
      repository,
      branch: outcome.baseRef,
      sha: outcome.mergeSha,
    },
    postMerge: {
      role: "POST_MERGE_MAIN",
      repository,
      event: "push",
      branch: outcome.baseRef,
      workflowId: workflowContract.workflow.id,
      workflowName: workflowContract.workflow.name,
      workflowPath: workflowContract.workflow.path,
      runId: postRun.id,
      runAttempt: postRun.runAttempt,
      runHeadSha: postRun.headSha,
      jobs: postMergeJobs,
      gateJob: postGate,
    },
  };
  return Object.freeze({
    expectation: hardenedExpectation(outcome, repository, workflowContract),
    entry,
    chronology: Object.freeze([...(snapshot.chronology ?? [])]),
  });
}

function legacyExpectation(outcome, repository, contractAnchorSha) {
  return {
    schemaVersion: 2,
    source: "LOCAL_GIT",
    taskId: outcome.taskId,
    repository,
    baseRef: outcome.baseRef,
    outcomeSha: outcome.outcomeSha,
    deliveryContract: {
      kind: "LEGACY_PRE_CONTRACT",
      version: 1,
      eligibilitySource: "LOCAL_GIT_PRE_CONTRACT_HISTORY",
      contractAnchorSha,
      mergeSha: outcome.mergeSha,
    },
  };
}

export function normalizeLegacyDeliveryEvidence({
  outcome,
  repository,
  contractAnchorSha,
  workflow,
  snapshot,
}) {
  const pullRequest = validatePullRequestSnapshot({
    outcome,
    repository,
    rawPullRequest: snapshot.pullRequest,
    reviews: snapshot.reviews ?? [],
  });
  const prRun = validateRun(normalizeRun(snapshot.pullRequestRun), {
    taskId: outcome.taskId,
    role: "LEGACY_PR",
    repository,
    workflow,
    event: "pull_request",
    branch: outcome.headRef,
    sha: outcome.outcomeSha,
    pullRequestNumber: outcome.pullRequestNumber,
  });
  const postRun = validateRun(normalizeRun(snapshot.postMergeRun), {
    taskId: outcome.taskId,
    role: "LEGACY_POST_MAIN",
    repository,
    workflow,
    event: "push",
    branch: outcome.baseRef,
    sha: outcome.mergeSha,
  });
  if (prRun.id === postRun.id) {
    throw hydrationError(
      outcome.taskId,
      "LEGACY_POST_MAIN",
      "post-main run must be distinct from the pull-request run",
    );
  }
  return Object.freeze({
    expectation: legacyExpectation(outcome, repository, contractAnchorSha),
    entry: {
      schemaVersion: 1,
      claim: "FINAL",
      source: "GITHUB",
      taskId: outcome.taskId,
      repository,
      outcomeSha: outcome.outcomeSha,
      classification: "LEGACY_PRE_CONTRACT_CONTINUITY",
      actualHead: "UNVERIFIED",
      contractAnchorSha,
      pullRequest: {
        number: pullRequest.number,
        headSha: pullRequest.headSha,
        baseRef: pullRequest.baseRef,
        mergeSha: pullRequest.mergeSha,
        state: "MERGED",
        checks: "SUCCESS",
        review: "CLEAR",
        runId: prRun.id,
      },
      merge: {
        repository,
        branch: outcome.baseRef,
        sha: outcome.mergeSha,
        mainRunHeadSha: postRun.headSha,
        checks: "SUCCESS",
        runId: postRun.id,
      },
    },
    chronology: Object.freeze([...(snapshot.chronology ?? [])]),
  });
}

function runSummary(run, taskId, role) {
  return Object.freeze({
    taskId,
    role,
    runId: run.id,
    runAttempt: run.runAttempt,
    headSha: run.headSha,
    status: run.status,
    conclusion: run.conclusion,
  });
}

function validateRunList(runs, {
  taskId,
  role,
  workflow,
  event,
  branch,
}) {
  return runs.map((raw) => {
    const run = normalizeRun(raw);
    if (
      !positiveInteger(run.id) ||
      !positiveInteger(run.runAttempt) ||
      !SHA_PATTERN.test(run.headSha ?? "")
    ) {
      throw hydrationError(taskId, role, "run list contains malformed identity");
    }
    exact(run.workflowId, workflow.id, taskId, role, "workflow ID");
    exact(run.workflowName, workflow.name, taskId, role, "workflow name");
    exact(run.workflowPath, workflow.path, taskId, role, "workflow path");
    exact(run.event, event, taskId, role, "event");
    exact(run.headBranch, branch, taskId, role, "head branch");
    return run;
  });
}

function requiredTimestamp(value, taskId, role, label) {
  const parsed = Date.parse(value ?? "");
  if (!Number.isFinite(parsed)) {
    throw hydrationError(taskId, role, `${label} must be an exact timestamp`);
  }
  return parsed;
}

async function acceptedAttempt(client, selectedRun, context) {
  if (selectedRun.runAttempt > MAX_RUN_ATTEMPTS) {
    throw hydrationError(
      context.taskId,
      context.role,
      `run attempt ${selectedRun.runAttempt} exceeds bound ${MAX_RUN_ATTEMPTS}`,
      "DELIVERY_HYDRATION_BOUND_EXCEEDED",
    );
  }
  const attempts = [];
  let previousStartedAt = -1;
  for (let attempt = 1; attempt <= selectedRun.runAttempt; attempt += 1) {
    const raw = await client.getRunAttempt(selectedRun.id, attempt, context);
    const normalized = normalizeRun(raw);
    exact(normalized.id, selectedRun.id, context.taskId, context.role, "attempt run ID");
    exact(
      normalized.runAttempt,
      attempt,
      context.taskId,
      context.role,
      "reported run attempt",
    );
    exact(
      normalized.workflowId,
      selectedRun.workflowId,
      context.taskId,
      context.role,
      "attempt workflow ID",
    );
    exact(
      normalized.workflowName,
      selectedRun.workflowName,
      context.taskId,
      context.role,
      "attempt workflow name",
    );
    exact(
      normalized.workflowPath,
      selectedRun.workflowPath,
      context.taskId,
      context.role,
      "attempt workflow path",
    );
    exact(normalized.event, selectedRun.event, context.taskId, context.role, "attempt event");
    exact(
      normalized.headBranch,
      selectedRun.headBranch,
      context.taskId,
      context.role,
      "attempt head branch",
    );
    exact(
      normalized.headSha,
      selectedRun.headSha,
      context.taskId,
      context.role,
      "attempt head SHA",
    );
    const runStartedAt = requiredTimestamp(
      normalized.runStartedAt,
      context.taskId,
      context.role,
      "attempt run_started_at",
    );
    if (runStartedAt <= previousStartedAt) {
      throw hydrationError(
        context.taskId,
        context.role,
        "attempt run_started_at values must increase strictly",
      );
    }
    previousStartedAt = runStartedAt;
    attempts.push(normalized);
  }
  return Object.freeze({ accepted: attempts.at(-1), attempts: Object.freeze(attempts) });
}

function jobCollectionFingerprint(job) {
  return JSON.stringify({
    id: job.id,
    runId: job.runId,
    apiRunAttempt: job.apiRunAttempt,
    collectionAttempt: job.collectionAttempt,
    name: job.name,
    headSha: job.headSha,
    status: job.status,
    conclusion: job.conclusion,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    runnerId: job.runnerId,
    runnerName: job.runnerName,
    runnerGroupId: job.runnerGroupId,
    runnerGroupName: job.runnerGroupName,
    labels: job.labels,
    steps: job.steps,
  });
}

function jobExecutionFingerprint(job) {
  return JSON.stringify({
    runId: job.runId,
    name: job.name,
    headSha: job.headSha,
    status: job.status,
    conclusion: job.conclusion,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    runnerId: job.runnerId,
    runnerName: job.runnerName,
    runnerGroupId: job.runnerGroupId,
    runnerGroupName: job.runnerGroupName,
    labels: job.labels,
    steps: job.steps,
  });
}

function normalizeCollectedJobs({
  rawJobs,
  run,
  collectionAttempt,
  taskId,
  role,
  requireUniqueNames = true,
}) {
  const jobs = rawJobs.map((raw) =>
    normalizeJob(raw, {
      apiRunAttempt: apiField(raw, "runAttempt", "run_attempt"),
      collectionAttempt:
        collectionAttempt ?? apiField(raw, "runAttempt", "run_attempt"),
    }),
  );
  const ids = new Set();
  const names = new Set();
  for (const job of jobs) {
    if (!positiveInteger(job.id) || !positiveInteger(job.apiRunAttempt)) {
      throw hydrationError(taskId, role, "job ID and API attempt must be positive");
    }
    exact(job.runId, run.id, taskId, role, "job run ID");
    exact(job.headSha, run.headSha, taskId, role, "job head SHA");
    exact(
      job.apiRunAttempt,
      job.collectionAttempt,
      taskId,
      role,
      "job collection attempt",
    );
    if (ids.has(job.id)) {
      throw hydrationError(taskId, role, `job ID ${job.id} is duplicated`);
    }
    ids.add(job.id);
    if (requireUniqueNames && names.has(job.name)) {
      throw hydrationError(
        taskId,
        role,
        `logical job name ${JSON.stringify(job.name)} is ambiguous`,
      );
    }
    names.add(job.name);
    if (!job.name || !Array.isArray(job.labels) || !Array.isArray(job.steps)) {
      throw hydrationError(taskId, role, "job envelope is malformed");
    }
    for (const step of job.steps) {
      if (
        !positiveInteger(step.number) ||
        !step.name ||
        !step.status ||
        !step.startedAt ||
        !step.completedAt
      ) {
        throw hydrationError(taskId, role, `job ${job.name} step envelope is malformed`);
      }
    }
  }
  return jobs;
}

function requireSameJobCollection({
  expected,
  actual,
  taskId,
  role,
  label,
}) {
  const expectedById = new Map(expected.map((job) => [job.id, job]));
  const actualById = new Map(actual.map((job) => [job.id, job]));
  if (
    expectedById.size !== expected.length ||
    actualById.size !== actual.length ||
    expectedById.size !== actualById.size
  ) {
    throw hydrationError(taskId, role, `${label} job collection is mismatched`);
  }
  for (const [id, expectedJob] of expectedById) {
    const actualJob = actualById.get(id);
    if (
      !actualJob ||
      jobCollectionFingerprint(actualJob) !==
        jobCollectionFingerprint(expectedJob)
    ) {
      throw hydrationError(
        taskId,
        role,
        `${label} job collection differs at job ${id}`,
      );
    }
  }
}

export async function reconcileAuthoritativeJobs({
  client,
  run,
  attempts,
  names,
  evidenceNames,
  gateName,
  taskId,
  role,
}) {
  const attemptCollections = [];
  for (const attempt of attempts) {
    const rawJobs = await client.listJobs(run.id, attempt.runAttempt, {
      taskId,
      role: `${role}:ATTEMPT_${attempt.runAttempt}_JOBS`,
    });
    attemptCollections.push(
      normalizeCollectedJobs({
        rawJobs,
        run,
        collectionAttempt: attempt.runAttempt,
        taskId,
        role: `${role}:ATTEMPT_${attempt.runAttempt}_JOBS`,
      }),
    );
  }
  const rawAllJobs = await client.listJobs(run.id, "all", {
    taskId,
    role: `${role}:ALL_JOBS`,
  });
  const allJobs = normalizeCollectedJobs({
    rawJobs: rawAllJobs,
    run,
    taskId,
    role: `${role}:ALL_JOBS`,
    requireUniqueNames: false,
  });
  const rawLatestJobs = await client.listJobs(run.id, "latest", {
    taskId,
    role: `${role}:LATEST_JOBS`,
  });
  const latestJobs = normalizeCollectedJobs({
    rawJobs: rawLatestJobs,
    run,
    collectionAttempt: run.runAttempt,
    taskId,
    role: `${role}:LATEST_JOBS`,
  });
  const attemptUnion = attemptCollections.flat();
  requireSameJobCollection({
    expected: attemptUnion,
    actual: allJobs,
    taskId,
    role,
    label: "filter=all",
  });
  requireSameJobCollection({
    expected: attemptCollections.at(-1),
    actual: latestJobs,
    taskId,
    role,
    label: "filter=latest",
  });

  const evidenceNameSet = new Set(evidenceNames);
  const logCache = new Map();
  const readJobLog = async (job) => {
    const key = `${job.collectionAttempt}:${job.id}`;
    if (!logCache.has(key)) {
      const rawLog = await client.getJobLog(
        run.id,
        job.collectionAttempt,
        job.id,
        {
          taskId,
          role: `${role}:${job.name}`,
        },
      );
      if (typeof rawLog !== "string" || rawLog.length === 0) {
        throw hydrationError(taskId, role, `job ${job.name} log is missing`);
      }
      logCache.set(key, rawLog);
    }
    return logCache.get(key);
  };

  const selected = [];
  const chronology = [];
  const selectedEvidenceDigests = new Set();
  for (const name of names) {
    let authoritative;
    let authoritativeAttempt;
    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      const job = findExactJob(
        attemptCollections[index],
        name,
        taskId,
        `${role}:ATTEMPT_${attempt.runAttempt}`,
      );
      const startedAt = requiredTimestamp(
        job.startedAt,
        taskId,
        role,
        `${name} started_at`,
      );
      const completedAt = requiredTimestamp(
        job.completedAt,
        taskId,
        role,
        `${name} completed_at`,
      );
      if (completedAt < startedAt) {
        throw hydrationError(
          taskId,
          role,
          `job ${name} completion precedes its start`,
        );
      }
      const attemptStartedAt = requiredTimestamp(
        attempt.runStartedAt,
        taskId,
        role,
        `attempt ${attempt.runAttempt} run_started_at`,
      );
      if (startedAt >= attemptStartedAt) {
        if (attempt.updatedAt) {
          const attemptUpdatedAt = requiredTimestamp(
            attempt.updatedAt,
            taskId,
            role,
            `attempt ${attempt.runAttempt} updated_at`,
          );
          if (startedAt > attemptUpdatedAt || completedAt > attemptUpdatedAt) {
            throw hydrationError(
              taskId,
              role,
              `job ${name} lies outside attempt ${attempt.runAttempt} chronology`,
            );
          }
        }
        authoritative = job;
        authoritativeAttempt = attempt.runAttempt;
        chronology.push(
          Object.freeze({
            taskId,
            role: `${role}_JOB_EXECUTION`,
            runId: run.id,
            runAttempt: authoritativeAttempt,
            jobId: job.id,
            jobName: job.name,
            projectionAttempt: attempt.runAttempt,
            conclusion: job.conclusion,
          }),
        );
        continue;
      }
      if (!authoritative || !positiveInteger(authoritativeAttempt)) {
        throw hydrationError(
          taskId,
          role,
          `job ${name} has no prior actual execution for its projection`,
        );
      }
      if (
        jobExecutionFingerprint(job) !==
        jobExecutionFingerprint(authoritative)
      ) {
        throw hydrationError(
          taskId,
          role,
          `job ${name} projection does not match the latest actual execution`,
        );
      }
      const [projectionLog, authoritativeLog] = await Promise.all([
        readJobLog(job),
        readJobLog(authoritative),
      ]);
      if (projectionLog !== authoritativeLog) {
        throw hydrationError(
          taskId,
          role,
          `job ${name} projection log does not match its actual execution`,
        );
      }
      chronology.push(
        Object.freeze({
          taskId,
          role: `${role}_JOB_PROJECTION`,
          runId: run.id,
          runAttempt: authoritativeAttempt,
          jobId: authoritative.id,
          jobName: job.name,
          projectionAttempt: attempt.runAttempt,
          conclusion: authoritative.conclusion,
        }),
      );
    }
    const rawLog = await readJobLog(authoritative);
    let evidence;
    if (evidenceNameSet.has(name)) {
      try {
        evidence = parseKywCiEvidence(rawLog);
      } catch (error) {
        throw hydrationError(
          taskId,
          `${role}:${name}`,
          error instanceof Error
            ? error.message.replace(/^delivery hydration JOB_LOG:\s*/, "")
            : "job log is malformed",
        );
      }
      const evidenceDigest = sha256Text(rawLog);
      if (selectedEvidenceDigests.has(evidenceDigest)) {
        throw hydrationError(
          taskId,
          role,
          `job ${name} reuses another selected checkout log`,
        );
      }
      selectedEvidenceDigests.add(evidenceDigest);
    }
    selected.push(
      normalizeJob(authoritative, {
        runAttempt: authoritativeAttempt,
        apiRunAttempt: authoritative.apiRunAttempt,
        collectionAttempt: authoritative.collectionAttempt,
        evidence,
        rawLog,
      }),
    );
  }

  if (gateName) {
    const gate = findExactJob(selected, gateName, taskId, role);
    const dependencies = selected.filter((job) => job.name !== gateName);
    const latestDependencyAttempt = Math.max(
      ...dependencies.map((job) => job.runAttempt),
    );
    exact(
      gate.runAttempt,
      latestDependencyAttempt,
      taskId,
      role,
      "Required gate execution attempt",
    );
    const latestDependencyCompletion = Math.max(
      ...dependencies.map((job) =>
        requiredTimestamp(
          job.completedAt,
          taskId,
          role,
          `${job.name} completed_at`,
        ),
      ),
    );
    if (
      requiredTimestamp(
        gate.startedAt,
        taskId,
        role,
        "Required gate started_at",
      ) < latestDependencyCompletion
    ) {
      throw hydrationError(
        taskId,
        role,
        "Required gate started before its authoritative dependencies completed",
      );
    }
  }
  return Object.freeze({
    jobs: Object.freeze(selected),
    chronology: Object.freeze(chronology),
  });
}

async function collectHardenedPullRequestSnapshot({
  client,
  outcome,
  repository,
  workflowContract,
  allowPending = false,
}) {
  const prContext = { taskId: outcome.taskId, role: "PR_RUNS" };
  const rawPrRuns = await client.listRuns(
    workflowContract.workflow.id,
    { event: "pull_request", branch: outcome.headRef },
    prContext,
  );
  const prRuns = validateRunList(rawPrRuns, {
    taskId: outcome.taskId,
    role: "PR_RUNS",
    workflow: workflowContract.workflow,
    event: "pull_request",
    branch: outcome.headRef,
  });
  const exactPrRuns = prRuns.filter((run) => run.headSha === outcome.outcomeSha);
  if (allowPending && exactPrRuns.length === 0) {
    return Object.freeze({
      pending: true,
      stage: "OBSERVE_ACTUAL_HEAD_CI",
      chronology: Object.freeze(
        prRuns.map((run) => runSummary(run, outcome.taskId, "PR_RUN")),
      ),
    });
  }
  const selectedPrRun = newestRun(exactPrRuns, outcome.taskId, "PR_ACTUAL_HEAD");
  if (
    allowPending &&
    RESUMABLE_RUN_STATUSES.has(selectedPrRun.status) &&
    !selectedPrRun.conclusion
  ) {
    const rawLatestJobs = await client.listJobs(selectedPrRun.id, "latest", {
      taskId: outcome.taskId,
      role: "PR_PENDING_LATEST_JOBS",
    });
    if (!Array.isArray(rawLatestJobs)) {
      throw hydrationError(
        outcome.taskId,
        "PR_PENDING_LATEST_JOBS",
        "latest job collection is malformed",
      );
    }
    const latestJobs = rawLatestJobs.map((raw) => normalizeJob(raw, {
      apiRunAttempt: apiField(raw, "runAttempt", "run_attempt"),
      collectionAttempt: selectedPrRun.runAttempt,
    }));
    const byName = new Map();
    for (const job of latestJobs) {
      if (
        !positiveInteger(job.id) ||
        job.runId !== selectedPrRun.id ||
        job.headSha !== selectedPrRun.headSha ||
        job.apiRunAttempt !== selectedPrRun.runAttempt ||
        !job.name ||
        byName.has(job.name)
      ) {
        throw hydrationError(
          outcome.taskId,
          "PR_PENDING_LATEST_JOBS",
          "latest job collection has ambiguous or mismatched identity",
        );
      }
      byName.set(job.name, job);
    }
    for (const name of [
      ...workflowContract.actualHeadJobs,
      workflowContract.mergeCompatibilityJob,
      workflowContract.requiredGateJob,
    ]) {
      const job = byName.get(name);
      if (
        job &&
        !(RESUMABLE_RUN_STATUSES.has(job.status) && !job.conclusion) &&
        (job.status !== "completed" || job.conclusion !== "success")
      ) {
        throw hydrationError(
          outcome.taskId,
          "PR_PENDING_LATEST_JOBS",
          `latest job ${name} is ${job.status}/${job.conclusion || "NONE"}`,
          "DELIVERY_BLOCKED",
        );
      }
    }
    const pendingStageFor = (names, stage) => {
      for (const name of names) {
        const job = byName.get(name);
        if (!job || (RESUMABLE_RUN_STATUSES.has(job.status) && !job.conclusion)) {
          return stage;
        }
      }
      return undefined;
    };
    const actualHeadPending = pendingStageFor(
      workflowContract.actualHeadJobs,
      "OBSERVE_ACTUAL_HEAD_CI",
    );
    let actualHeadProven = false;
    let actualHeadChronology = [];
    if (
      !actualHeadPending &&
      typeof client.getRunAttempt === "function" &&
      typeof client.getJobLog === "function"
    ) {
      const attemptState = await acceptedAttempt(client, selectedPrRun, {
        taskId: outcome.taskId,
        role: "PR_PENDING_ACTUAL_HEAD",
      });
      const acceptedAttemptState = attemptState.accepted;
      if (
        !(
          (acceptedAttemptState.status === "completed" &&
            acceptedAttemptState.conclusion === "success") ||
          (RESUMABLE_RUN_STATUSES.has(acceptedAttemptState.status) &&
            !acceptedAttemptState.conclusion)
        )
      ) {
        throw hydrationError(
          outcome.taskId,
          "PR_PENDING_ACTUAL_HEAD",
          `latest attempt ${acceptedAttemptState.runAttempt} is ${acceptedAttemptState.status}/${acceptedAttemptState.conclusion || "NONE"}`,
          "DELIVERY_BLOCKED",
        );
      }
      const actualHeadNames = new Set(workflowContract.actualHeadJobs);
      const actualHeadClient = {
        async listJobs(...args) {
          const jobs = await client.listJobs(...args);
          return Array.isArray(jobs)
            ? jobs.filter((job) => actualHeadNames.has(job?.name))
            : jobs;
        },
        async getJobLog(...args) {
          return client.getJobLog(...args);
        },
      };
      const actualHeadState = await reconcileAuthoritativeJobs({
        client: actualHeadClient,
        run: attemptState.accepted,
        attempts: attemptState.attempts,
        names: workflowContract.actualHeadJobs,
        evidenceNames: workflowContract.actualHeadJobs,
        taskId: outcome.taskId,
        role: "PR_PENDING_ACTUAL_HEAD_JOB_LOG",
      });
      normalizeAcceptedJobs({
        jobs: actualHeadState.jobs,
        run: attemptState.accepted,
        taskId: outcome.taskId,
        role: "PR_ACTUAL_HEAD",
        names: workflowContract.actualHeadJobs,
        workflowContract,
        repository,
        event: "pull_request",
        pullRequestNumber: outcome.pullRequestNumber,
        expectedSha: outcome.outcomeSha,
      });
      actualHeadProven = true;
      actualHeadChronology = [
        ...attemptState.attempts.map((run) =>
          runSummary(run, outcome.taskId, "PR_PENDING_ACTUAL_HEAD_ATTEMPT"),
        ),
        ...actualHeadState.chronology,
      ];
    }
    const stage =
      actualHeadPending || !actualHeadProven
        ? "OBSERVE_ACTUAL_HEAD_CI"
        : pendingStageFor(
              [
                workflowContract.mergeCompatibilityJob,
                workflowContract.requiredGateJob,
              ],
              "OBSERVE_MERGE_COMPATIBILITY",
            ) ?? "OBSERVE_MERGE_COMPATIBILITY";
    return Object.freeze({
      pending: true,
      stage,
      chronology: Object.freeze([
        ...prRuns.map((run) => runSummary(run, outcome.taskId, "PR_RUN")),
        ...actualHeadChronology,
        ...latestJobs.map((job) => Object.freeze({
          taskId: outcome.taskId,
          role: "PR_PENDING_JOB",
          runId: selectedPrRun.id,
          runAttempt: selectedPrRun.runAttempt,
          jobId: job.id,
          jobName: job.name,
          conclusion: job.conclusion,
        })),
      ]),
    });
  }
  try {
    assertSuccessfulRunState(selectedPrRun, outcome.taskId, "PR_ACTUAL_HEAD", {
      pendingAllowed: allowPending,
    });
  } catch (error) {
    if (!allowPending || error?.code !== "DELIVERY_HYDRATION_PENDING") throw error;
    return Object.freeze({
      pending: true,
      stage: "OBSERVE_ACTUAL_HEAD_CI",
      chronology: Object.freeze(
        prRuns.map((run) => runSummary(run, outcome.taskId, "PR_RUN")),
      ),
    });
  }
  const prAttemptState = await acceptedAttempt(client, selectedPrRun, {
    taskId: outcome.taskId,
    role: "PR_ACTUAL_HEAD",
  });
  const acceptedPrRun = prAttemptState.accepted;
  const prJobState = await reconcileAuthoritativeJobs({
    client,
    run: acceptedPrRun,
    attempts: prAttemptState.attempts,
    names: [
      ...workflowContract.actualHeadJobs,
      workflowContract.mergeCompatibilityJob,
      workflowContract.requiredGateJob,
    ],
    evidenceNames: [
      ...workflowContract.actualHeadJobs,
      workflowContract.mergeCompatibilityJob,
    ],
    gateName: workflowContract.requiredGateJob,
    taskId: outcome.taskId,
    role: "PR_ACCEPTED_JOB_LOG",
  });
  const pullRequestJobs = prJobState.jobs;
  const mergeJob = findExactJob(
    pullRequestJobs,
    workflowContract.mergeCompatibilityJob,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
  );
  const syntheticSha = mergeJob.evidence?.expected_sha;
  requireSha(
    syntheticSha,
    outcome.taskId,
    "PR_MERGE_COMPATIBILITY",
    "synthetic merge SHA",
  );
  const syntheticCommit = await client.getCommit(syntheticSha, {
    taskId: outcome.taskId,
    role: "PR_MERGE_COMPATIBILITY",
  });
  return Object.freeze({
    pending: false,
    pullRequestRun: acceptedPrRun,
    pullRequestJobs,
    syntheticCommit,
    chronology: Object.freeze([
      ...prRuns.map((run) => runSummary(run, outcome.taskId, "PR_RUN")),
      ...prAttemptState.attempts.map((run) =>
        runSummary(run, outcome.taskId, "PR_ATTEMPT"),
      ),
      ...prJobState.chronology,
    ]),
  });
}

async function collectHardenedSnapshot({
  client,
  outcome,
  repository,
  workflowContract,
  rawPullRequest,
  reviews,
}) {
  validatePullRequestSnapshot({
    outcome,
    repository,
    rawPullRequest,
    reviews,
  });
  const pullRequestSnapshot = await collectHardenedPullRequestSnapshot({
    client,
    outcome,
    repository,
    workflowContract,
  });
  const {
    pullRequestRun: acceptedPrRun,
    pullRequestJobs,
    syntheticCommit,
  } = pullRequestSnapshot;

  const rawPostRuns = await client.listRuns(
    workflowContract.workflow.id,
    { event: "push", head_sha: outcome.mergeSha },
    { taskId: outcome.taskId, role: "POST_MAIN_RUNS" },
  );
  const postRuns = validateRunList(rawPostRuns, {
    taskId: outcome.taskId,
    role: "POST_MAIN_RUNS",
    workflow: workflowContract.workflow,
    event: "push",
    branch: outcome.baseRef,
  }).filter((run) => run.headSha === outcome.mergeSha);
  if (postRuns.length === 0) {
    throw hydrationError(
      outcome.taskId,
      "POST_MERGE_MAIN",
      "required workflow run is not visible yet",
      "DELIVERY_HYDRATION_PENDING",
    );
  }
  const selectedPostRun = newestRun(postRuns, outcome.taskId, "POST_MERGE_MAIN");
  assertSuccessfulRunState(selectedPostRun, outcome.taskId, "POST_MERGE_MAIN", {
    pendingAllowed: true,
  });
  const postAttemptState = await acceptedAttempt(client, selectedPostRun, {
    taskId: outcome.taskId,
    role: "POST_MERGE_MAIN",
  });
  const acceptedPostRun = postAttemptState.accepted;
  const postJobState = await reconcileAuthoritativeJobs({
    client,
    run: acceptedPostRun,
    attempts: postAttemptState.attempts,
    names: [
      ...workflowContract.postMergeJobs,
      workflowContract.requiredGateJob,
    ],
    evidenceNames: workflowContract.postMergeJobs,
    gateName: workflowContract.requiredGateJob,
    taskId: outcome.taskId,
    role: "POST_MAIN_JOB_LOG",
  });
  const postMergeJobs = postJobState.jobs;

  const chronology = [
    ...pullRequestSnapshot.chronology,
    ...postAttemptState.attempts.map((run) =>
      runSummary(run, outcome.taskId, "POST_MAIN_ATTEMPT"),
    ),
    ...postJobState.chronology,
  ];
  return {
    pullRequest: rawPullRequest,
    reviews,
    pullRequestRun: acceptedPrRun,
    pullRequestJobs,
    syntheticCommit,
    postMergeRun: acceptedPostRun,
    postMergeJobs,
    chronology,
  };
}

async function collectLegacySnapshot({
  client,
  outcome,
  workflow,
  rawPullRequest,
  reviews,
}) {
  const rawPrRuns = await client.listRuns(
    workflow.id,
    { event: "pull_request", head_sha: outcome.outcomeSha },
    { taskId: outcome.taskId, role: "LEGACY_PR" },
  );
  const prRuns = validateRunList(rawPrRuns, {
    taskId: outcome.taskId,
    role: "LEGACY_PR",
    workflow,
    event: "pull_request",
    branch: outcome.headRef,
  }).filter((run) => run.headSha === outcome.outcomeSha);
  const pullRequestRun = newestRun(prRuns, outcome.taskId, "LEGACY_PR");

  const rawPostRuns = await client.listRuns(
    workflow.id,
    { event: "push", head_sha: outcome.mergeSha },
    { taskId: outcome.taskId, role: "LEGACY_POST_MAIN" },
  );
  const postRuns = validateRunList(rawPostRuns, {
    taskId: outcome.taskId,
    role: "LEGACY_POST_MAIN",
    workflow,
    event: "push",
    branch: outcome.baseRef,
  }).filter((run) => run.headSha === outcome.mergeSha);
  const postMergeRun = newestRun(postRuns, outcome.taskId, "LEGACY_POST_MAIN");
  return {
    pullRequest: rawPullRequest,
    reviews,
    pullRequestRun,
    postMergeRun,
    chronology: [
      ...prRuns.map((run) => runSummary(run, outcome.taskId, "LEGACY_PR")),
      ...postRuns.map((run) =>
        runSummary(run, outcome.taskId, "LEGACY_POST_MAIN"),
      ),
    ],
  };
}

function evidenceJobIds(entry) {
  if (entry?.schemaVersion !== 2) return [];
  return [
    ...(entry.actualHead?.jobs ?? []).map((job) => job.id),
    entry.actualHead?.gateJob?.id,
    entry.mergeCompatibility?.job?.id,
    ...(entry.postMerge?.jobs ?? []).map((job) => job.id),
    entry.postMerge?.gateJob?.id,
  ].filter((value) => value !== undefined);
}

function freezeHydrationResult({
  deliveryLedger,
  deliveryExpectations,
  diagnostics,
  preparedCheckpoint,
}) {
  return Object.freeze({
    deliveryLedger: Object.freeze(deliveryLedger),
    deliveryExpectations: Object.freeze(deliveryExpectations),
    diagnostics: Object.freeze(diagnostics),
    ...(preparedCheckpoint
      ? { preparedCheckpoint: Object.freeze(preparedCheckpoint) }
      : {}),
  });
}

function missingCurrentDeliveryOutcome(error, taskId) {
  return (
    error?.code === "DELIVERY_HYDRATION_FAILED" &&
    typeof error.message === "string" &&
    error.message.includes(`Task ${taskId} LOCAL_GIT:`) &&
    error.message.includes(
      "could not map the terminal pair to an exact two-parent Task delivery merge",
    )
  );
}

function branchOwnsTask(branch, taskId) {
  return TASK_BRANCH_IDENTITY_PATTERN.exec(branch)?.[1] === taskId;
}

async function currentDeliveryWorkflowContract({
  task,
  identity,
  localHeadSha,
  commandCache,
}) {
  const workflowText = await showGitFile(
    commandCache,
    identity.repositoryRoot,
    localHeadSha,
    WORKFLOW_PATH,
    task.id,
  );
  const localContract = workflowText
    ? parseHardenedWorkflowContract(workflowText)
    : false;
  if (!localContract) {
    throw hydrationError(
      task.id,
      "CURRENT_DELIVERY_WORKFLOW",
      "selected head does not contain the hardened exact-SHA workflow contract",
    );
  }
  const workflow = normalizeWorkflow(
    await identity.githubClient.getWorkflow({
      taskId: task.id,
      role: "CURRENT_DELIVERY_WORKFLOW",
    }),
  );
  if (
    !positiveInteger(workflow.id) ||
    workflow.name !== "CI" ||
    workflow.path !== WORKFLOW_PATH ||
    workflow.state !== "active"
  ) {
    throw hydrationError(
      task.id,
      "CURRENT_DELIVERY_WORKFLOW",
      "workflow ID/name/path/state is malformed or unexpected",
    );
  }
  return Object.freeze({
    ...localContract,
    workflow: Object.freeze({
      id: workflow.id,
      name: workflow.name,
      path: workflow.path,
    }),
  });
}

export async function probeCurrentStandardDeliveryState({
  tasksRoot,
  task,
  commandCache,
  githubClient,
}) {
  const identity = await discoverAlignedMainIdentity({
    tasksRoot,
    commandCache,
    githubClient,
  });
  const branch = await gitText(
    commandCache,
    identity.repositoryRoot,
    ["symbolic-ref", "--quiet", "--short", "HEAD"],
    { taskId: task.id, role: "CURRENT_DELIVERY_BRANCH" },
  );
  if (!branchOwnsTask(branch, task.id)) {
    throw hydrationError(
      task.id,
      "CURRENT_DELIVERY_BRANCH",
      "current branch does not prove selected-Task ownership",
    );
  }
  const localHeadSha = await gitText(
    commandCache,
    identity.repositoryRoot,
    ["rev-parse", "HEAD"],
    { taskId: task.id, role: "CURRENT_DELIVERY_BRANCH" },
  );
  requireSha(localHeadSha, task.id, "CURRENT_DELIVERY_BRANCH", "local head");
  // The canonical delivery preflight proves the complete selected path set and
  // preserves unrelated work. The terminal pair is the bounded marker that a
  // repository repair still needs its selected-Task commit; do not let other
  // worktree changes move an already committed delivery back to COMMIT.
  const selectedPairStatus = await gitPorcelainText(
    commandCache,
    identity.repositoryRoot,
    [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      `:(glob)docs/tasks/${task.id}-*/TASK.md`,
      `:(glob)docs/tasks/${task.id}-*/TEST.md`,
    ],
    { taskId: task.id, role: "CURRENT_DELIVERY_PAIR" },
  );
  const hasPendingPairChanges = selectedPairStatus.length > 0;
  if (
    localHeadSha !== identity.currentMainSha &&
    !(await gitIsAncestor(
      commandCache,
      identity.repositoryRoot,
      identity.currentMainSha,
      localHeadSha,
    ))
  ) {
    throw hydrationError(
      task.id,
      "CURRENT_DELIVERY_BRANCH",
      "local selected head is not based on exact aligned main",
    );
  }
  const directBranch = await gitText(
    commandCache,
    identity.repositoryRoot,
    ["ls-remote", "--heads", "origin", `refs/heads/${branch}`],
    { taskId: task.id, role: "CURRENT_DELIVERY_REMOTE" },
  );
  const remoteLines = directBranch ? directBranch.split(/\r?\n/) : [];
  if (remoteLines.length > 1) {
    throw hydrationError(
      task.id,
      "CURRENT_DELIVERY_REMOTE",
      "remote selected branch identity is ambiguous",
    );
  }
  const [remoteHeadSha, remoteRef, ...remoteRemainder] = directBranch
    ? directBranch.split(/\s+/)
    : [];
  if (
    directBranch &&
    (!SHA_PATTERN.test(remoteHeadSha ?? "") ||
      remoteRef !== `refs/heads/${branch}` ||
      remoteRemainder.length > 0)
  ) {
    throw hydrationError(
      task.id,
      "CURRENT_DELIVERY_REMOTE",
      "remote selected branch identity is malformed",
    );
  }
  const [owner] = identity.repository.split("/");
  const pullRequests = await identity.githubClient.listPullRequests(
    {
      state: "all",
      head: `${owner}:${branch}`,
      base: "main",
    },
    { taskId: task.id, role: "CURRENT_PULL_REQUESTS" },
  );
  if (pullRequests.length > 1) {
    throw hydrationError(
      task.id,
      "CURRENT_PULL_REQUESTS",
      "selected branch maps to more than one pull request",
    );
  }
  if (localHeadSha === identity.currentMainSha) {
    if (remoteHeadSha || pullRequests.length > 0) {
      throw hydrationError(
        task.id,
        "CURRENT_DELIVERY_REMOTE",
        "existing remote or pull-request history conflicts with the pre-commit state",
      );
    }
    return resumableCurrentDeliverySnapshot({
      task,
      stage: "COMMIT",
      source: "CURRENT_DELIVERY_PROBE",
      commandCache,
    });
  }
  const workflowContract = await currentDeliveryWorkflowContract({
    task,
    identity,
    localHeadSha,
    commandCache,
  });
  if (!remoteHeadSha) {
    if (pullRequests.length > 0) {
      throw hydrationError(
        task.id,
        "CURRENT_DELIVERY_REMOTE",
        "pull-request history exists but the exact remote selected branch is missing",
      );
    }
    return resumableCurrentDeliverySnapshot({
      task,
      stage: hasPendingPairChanges ? "COMMIT" : "PUSH",
      source: "CURRENT_DELIVERY_PROBE",
      commandCache,
    });
  }
  const rawPullRequest = pullRequests[0];
  if (rawPullRequest) {
    validateCurrentPullRequestSnapshot({
      outcome: Object.freeze({
        taskId: task.id,
        baseRef: "main",
        baseSha: identity.currentMainSha,
        outcomeSha: remoteHeadSha,
        pullRequestNumber: Number(rawPullRequest.number),
        headRef: branch,
      }),
      repository: identity.repository,
      rawPullRequest,
      reviews: undefined,
    });
  }
  if (remoteHeadSha !== localHeadSha) {
    if (
      !(await gitIsAncestor(
        commandCache,
        identity.repositoryRoot,
        remoteHeadSha,
        localHeadSha,
      ))
    ) {
      throw hydrationError(
        task.id,
        "CURRENT_DELIVERY_REMOTE",
        "remote selected head diverges from the local selected head",
      );
    }
    return resumableCurrentDeliverySnapshot({
      task,
      stage: hasPendingPairChanges ? "COMMIT" : "PUSH",
      source: "CURRENT_DELIVERY_PROBE",
      commandCache,
    });
  }

  if (hasPendingPairChanges) {
    return resumableCurrentDeliverySnapshot({
      task,
      stage: "COMMIT",
      source: "CURRENT_DELIVERY_PROBE",
      commandCache,
    });
  }
  if (pullRequests.length === 0) {
    return resumableCurrentDeliverySnapshot({
      task,
      stage: "CREATE_PR",
      source: "CURRENT_DELIVERY_PROBE",
      commandCache,
    });
  }
  const outcome = Object.freeze({
    taskId: task.id,
    baseRef: "main",
    baseSha: identity.currentMainSha,
    outcomeSha: localHeadSha,
    pullRequestNumber: Number(rawPullRequest.number),
    headRef: branch,
  });
  let pullRequest = validateCurrentPullRequestSnapshot({
    outcome,
    repository: identity.repository,
    rawPullRequest,
    reviews: undefined,
  });
  const pullRequestSnapshot = await collectHardenedPullRequestSnapshot({
    client: identity.githubClient,
    outcome,
    repository: identity.repository,
    workflowContract,
    allowPending: true,
  });
  if (pullRequestSnapshot.pending) {
    return pendingHardenedDeliverySnapshot({
      task,
      repository: identity.repository,
      outcome,
      workflowContract,
      pullRequest,
      stage: pullRequestSnapshot.stage,
      chronology: pullRequestSnapshot.chronology,
      commandCache,
    });
  }
  const [rawDetailedPullRequest, reviews] = await Promise.all([
    identity.githubClient.getPullRequest(outcome.pullRequestNumber, {
      taskId: task.id,
      role: "CURRENT_PULL_REQUEST",
    }),
    identity.githubClient.listReviews(outcome.pullRequestNumber, {
      taskId: task.id,
      role: "CURRENT_PULL_REQUEST_REVIEWS",
    }),
  ]);
  pullRequest = validateCurrentPullRequestSnapshot({
    outcome,
    repository: identity.repository,
    rawPullRequest: rawDetailedPullRequest,
    reviews,
  });
  const pullRequestStages = normalizeHardenedPullRequestStages({
    outcome,
    pullRequest,
    repository: identity.repository,
    workflowContract,
    snapshot: {
      pullRequestRun: pullRequestSnapshot.pullRequestRun,
      pullRequestJobs: pullRequestSnapshot.pullRequestJobs,
      syntheticCommit: pullRequestSnapshot.syntheticCommit,
    },
  });
  if (pullRequest.review === "CHANGES_REQUESTED") {
    return pendingHardenedDeliverySnapshot({
      task,
      repository: identity.repository,
      outcome,
      workflowContract,
      pullRequest,
      pullRequestStages,
      stage: "INSPECT_REVIEW_AND_MERGEABILITY",
      chronology: pullRequestSnapshot.chronology,
      commandCache,
    });
  }
  if (
    pullRequest.mergeable !== true ||
    pullRequest.mergeableState !== "clean"
  ) {
    throw hydrationError(
      task.id,
      "CURRENT_PULL_REQUEST",
      `reviewed pull request is not safely mergeable (${pullRequest.mergeableState || "UNKNOWN"})`,
      "DELIVERY_BLOCKED",
    );
  }
  return pendingHardenedDeliverySnapshot({
    task,
    repository: identity.repository,
    outcome,
    workflowContract,
    pullRequest,
    pullRequestStages,
    stage: "MERGE_EXPECTED_HEAD",
    chronology: pullRequestSnapshot.chronology,
    commandCache,
  });
}

async function hydrateSelectedStandardDeliverySnapshot({
  tasksRoot,
  task,
  contractTasks,
  commandRunner,
  localDiscovery,
  deliveryCollector,
  githubClient,
  currentDeliveryProbe,
  allowCurrentDeliveryProbe = false,
}) {
  const commandCache = createInvocationCommandCache({ runner: commandRunner });
  let local;
  try {
    local = await localDiscovery({
      tasksRoot: path.resolve(tasksRoot),
      requiredTasks: Object.freeze([task]),
      contractTasks,
      commandCache,
    });
  } catch (error) {
    if (!missingCurrentDeliveryOutcome(error, task.id)) throw error;
    if (!allowCurrentDeliveryProbe) {
      return Object.freeze({
        deliveryLedger: Object.freeze({}),
        deliveryExpectations: Object.freeze({}),
        classifications: Object.freeze({ [task.id]: "PENDING" }),
        chronology: Object.freeze([]),
        diagnostics: Object.freeze({
          taskId: task.id,
          state: "RESUMABLE",
          source: "IMPLEMENTATION_DELIVERY_HANDOFF",
          stage: "EXACT_DELIVERY_REQUIRED",
          issue: error.message,
          cache: commandCache.stats(),
        }),
      });
    }
    return currentDeliveryProbe({
      tasksRoot: path.resolve(tasksRoot),
      task,
      commandCache,
      githubClient,
    });
  }
  if (
    !isRecord(local) ||
    !Array.isArray(local.outcomes) ||
    local.outcomes.length !== 1 ||
    local.outcomes[0]?.taskId !== task.id
  ) {
    throw hydrationError(
      task.id,
      "CURRENT_DELIVERY",
      "selected delivery discovery returned a partial or malformed outcome",
    );
  }
  assertFutureTerminalOutcomeImmutable(task, local.outcomes[0]);
  let collected;
  try {
    collected = await deliveryCollector({
      local,
      commandCache,
      githubClient,
    });
  } catch (error) {
    if (error?.code !== "DELIVERY_HYDRATION_PENDING") throw error;
    return Object.freeze({
      deliveryLedger: Object.freeze({}),
      deliveryExpectations: Object.freeze({}),
      classifications: Object.freeze({ [task.id]: "PENDING" }),
      chronology: Object.freeze([]),
      diagnostics: Object.freeze({
        taskId: task.id,
        state: "RESUMABLE",
        source: "CANONICAL_DELIVERY_GRAPH_PENDING",
        stage: "OBSERVE_POST_MAIN_CI",
        issue: error.message,
        cache: commandCache.stats(),
      }),
    });
  }
  return Object.freeze({
    deliveryLedger: collected.deliveryLedger,
    deliveryExpectations: collected.deliveryExpectations,
    classifications: collected.classifications,
    chronology: collected.chronology,
    diagnostics: Object.freeze({
      taskId: task.id,
      state: "SATISFIED",
      source: "CANONICAL_DELIVERY_GRAPH",
      cache: commandCache.stats(),
    }),
  });
}

async function mergeSelectedStandardDeliverySnapshot({
  hydrated,
  currentDeliveryTask,
  tasksRoot,
  commandRunner,
  localDiscovery,
  deliveryCollector,
  githubClient,
  currentDeliveryHydrator,
  currentDeliveryProbe,
  allowCurrentDeliveryProbe = false,
  forceCurrentDeliveryRevalidation = false,
}) {
  const selectedTask = currentDeliveryTask;
  if (
    !selectedTask ||
    (!forceCurrentDeliveryRevalidation &&
      hydrated.deliveryLedger[selectedTask.id] !== undefined)
  ) {
    return hydrated;
  }
  const contractTasks = Object.freeze(
    [selectedTask].filter((task) =>
      isQueueAwareTaskContractVersion(task.contractVersion),
    ),
  );
  const current = await currentDeliveryHydrator({
    tasksRoot,
    task: selectedTask,
    contractTasks,
    commandRunner,
    localDiscovery,
    deliveryCollector,
    githubClient,
    currentDeliveryProbe,
    allowCurrentDeliveryProbe,
  });
  const priorDeliveryLedger = Object.fromEntries(
    Object.entries(hydrated.deliveryLedger).filter(
      ([taskId]) => taskId !== selectedTask.id,
    ),
  );
  const priorDeliveryExpectations = Object.fromEntries(
    Object.entries(hydrated.deliveryExpectations).filter(
      ([taskId]) => taskId !== selectedTask.id,
    ),
  );
  const acceptedIds = new Set(
    Object.values(priorDeliveryLedger).flatMap(evidenceJobIds),
  );
  for (const entry of Object.values(current.deliveryLedger)) {
    for (const jobId of evidenceJobIds(entry)) {
      if (acceptedIds.has(jobId)) {
        throw hydrationError(
          selectedTask.id,
          "CURRENT_DELIVERY",
          `accepted job ID ${jobId} is reused across delivery graphs`,
        );
      }
      acceptedIds.add(jobId);
    }
  }
  return freezeHydrationResult({
    deliveryLedger: {
      ...priorDeliveryLedger,
      ...current.deliveryLedger,
    },
    deliveryExpectations: {
      ...priorDeliveryExpectations,
      ...current.deliveryExpectations,
    },
    preparedCheckpoint: hydrated.preparedCheckpoint,
    diagnostics: {
      ...hydrated.diagnostics,
      classifications: Object.freeze({
        ...(hydrated.diagnostics?.classifications ?? {}),
        ...current.classifications,
      }),
      chronology: Object.freeze([
        ...(hydrated.diagnostics?.chronology ?? []),
        ...current.chronology,
      ]),
      currentDelivery: current.diagnostics,
      ...(forceCurrentDeliveryRevalidation
        ? { publicReleaseStandardRevalidation: true }
        : {}),
    },
  });
}

async function collectNormalizedDeliveryOutcomes({
  local,
  commandCache,
  githubClient,
}) {
  const client =
    githubClient ??
    createGitHubEvidenceClient({
      repository: local.repository,
      repositoryRoot: local.repositoryRoot,
      commandCache,
    });
  const [rawMainRef, rawWorkflow] = await Promise.all([
    client.getMainRef({ role: "GITHUB_MAIN" }),
    client.getWorkflow({ role: "GITHUB_WORKFLOW" }),
  ]);
  const githubMainSha = rawMainRef?.object?.sha;
  exact(
    githubMainSha,
    local.currentMainSha,
    undefined,
    "GITHUB_MAIN",
    "GitHub main SHA",
  );
  const workflow = normalizeWorkflow(rawWorkflow);
  if (
    !positiveInteger(workflow.id) ||
    workflow.name !== "CI" ||
    workflow.path !== WORKFLOW_PATH ||
    workflow.state !== "active"
  ) {
    throw hydrationError(
      undefined,
      "GITHUB_WORKFLOW",
      "workflow ID/name/path/state is malformed or unexpected",
    );
  }

  const deliveryLedger = {};
  const deliveryExpectations = {};
  const chronology = [];
  const classifications = {};
  const acceptedJobIds = new Set();
  for (const outcome of local.outcomes) {
    const [rawPullRequest, reviews] = await Promise.all([
      client.getPullRequest(outcome.pullRequestNumber, {
        taskId: outcome.taskId,
        role: "PULL_REQUEST",
      }),
      client.listReviews(outcome.pullRequestNumber, {
        taskId: outcome.taskId,
        role: "PULL_REQUEST_REVIEWS",
      }),
    ]);
    const observedHeadRef = rawPullRequest?.head?.ref;
    if (!observedHeadRef) {
      throw hydrationError(outcome.taskId, "PULL_REQUEST", "head ref is missing");
    }
    if (outcome.headRefHint && outcome.headRefHint !== observedHeadRef) {
      throw hydrationError(
        outcome.taskId,
        "PULL_REQUEST",
        "head ref does not match the locally recorded merge subject",
      );
    }
    const observedOutcome = Object.freeze({
      ...outcome,
      headRef: observedHeadRef,
    });
    let normalized;
    if (outcome.classification === "HARDENED_EXACT_HEAD") {
      if (!outcome.hardenedWorkflow) {
        throw hydrationError(
          outcome.taskId,
          "HARDENED_EXACT_HEAD",
          "trusted local workflow contract is missing",
        );
      }
      const workflowContract = Object.freeze({
        ...outcome.hardenedWorkflow,
        workflow: Object.freeze({
          id: workflow.id,
          name: workflow.name,
          path: workflow.path,
        }),
      });
      const snapshot = await collectHardenedSnapshot({
        client,
        outcome: observedOutcome,
        repository: local.repository,
        workflowContract,
        rawPullRequest,
        reviews,
      });
      normalized = normalizeHardenedDeliveryEvidence({
        outcome: observedOutcome,
        repository: local.repository,
        workflowContract,
        snapshot,
      });
    } else if (outcome.classification === "LEGACY_PRE_CONTRACT") {
      const snapshot = await collectLegacySnapshot({
        client,
        outcome: observedOutcome,
        workflow,
        rawPullRequest,
        reviews,
      });
      normalized = normalizeLegacyDeliveryEvidence({
        outcome: observedOutcome,
        repository: local.repository,
        contractAnchorSha: local.contractAnchorSha,
        workflow,
        snapshot,
      });
    } else {
      throw hydrationError(
        outcome.taskId,
        "LOCAL_GIT",
        "local delivery classification is unknown",
      );
    }

    const evaluation = evaluateDeliveryEvidence(
      outcome.taskId,
      normalized.entry,
      normalized.expectation,
    );
    if (!evaluation.satisfied) {
      throw hydrationError(
        outcome.taskId,
        outcome.classification,
        `production evaluator rejected hydrated evidence: ${evaluation.issues.join("; ")}`,
      );
    }
    for (const jobId of evidenceJobIds(normalized.entry)) {
      if (acceptedJobIds.has(jobId)) {
        throw hydrationError(
          outcome.taskId,
          outcome.classification,
          `accepted job ID ${jobId} is reused across delivery graphs`,
        );
      }
      acceptedJobIds.add(jobId);
    }
    deliveryLedger[outcome.taskId] = normalized.entry;
    deliveryExpectations[outcome.taskId] = normalized.expectation;
    chronology.push(...normalized.chronology);
    classifications[outcome.taskId] = outcome.classification;
  }
  return Object.freeze({
    deliveryLedger: Object.freeze(deliveryLedger),
    deliveryExpectations: Object.freeze(deliveryExpectations),
    chronology: Object.freeze(chronology),
    classifications: Object.freeze(classifications),
    githubMainSha,
    workflow: Object.freeze(workflow),
  });
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function buildContinuityCoveredRecord({
  task,
  outcome,
  entry,
  expectation,
  local,
  commandCache,
  role,
}) {
  const taskRelative = path
    .relative(local.repositoryRoot, task.taskPath)
    .replaceAll("\\", "/");
  const testRelative = path
    .relative(local.repositoryRoot, task.testPath)
    .replaceAll("\\", "/");
  const [taskMarkdown, testMarkdown] = await Promise.all([
    showGitFile(
      commandCache,
      local.repositoryRoot,
      local.currentMainSha,
      taskRelative,
      task.id,
    ),
    showGitFile(
      commandCache,
      local.repositoryRoot,
      local.currentMainSha,
      testRelative,
      task.id,
    ),
  ]);
  if (
    taskMarkdown === undefined ||
    testMarkdown === undefined ||
    sectionStatus(taskMarkdown) !== "DONE" ||
    sectionStatus(testMarkdown) !== "PASSED"
  ) {
    throw hydrationError(
      task.id,
      role,
      "aligned main terminal Task/Test bytes are missing or nonterminal",
    );
  }
  return Object.freeze({
    taskId: task.id,
    taskSha256: sha256Text(taskMarkdown),
    testSha256: sha256Text(testMarkdown),
    taskStatus: "DONE",
    testStatus: "PASSED",
    classification: outcome.classification,
    outcomeSha: outcome.outcomeSha,
    mergeSha: outcome.mergeSha,
    evidenceSha256: digestStandardDeliveryContinuityEvidence({
      entry,
      expectation,
    }),
  });
}

export async function bootstrapStandardDeliveryContinuity({
  tasksRoot,
  invocation,
  managedRoutingAvailable = false,
  commandRunner,
  queueInspector = inspectTaskQueue,
  localDiscovery = discoverLocalDeliveryOutcomes,
  githubClient,
  writeCheckpoint = true,
} = {}) {
  const resolvedTasksRoot = path.resolve(tasksRoot);
  const queue = await queueInspector(resolvedTasksRoot);
  if (!isRecord(queue) || !Array.isArray(queue.tasks) || !Array.isArray(queue.errors)) {
    throw hydrationError(
      undefined,
      "QUEUE",
      "queue inspection returned a malformed response",
    );
  }
  if (queue.errors.length > 0) {
    throw hydrationError(
      undefined,
      "QUEUE",
      `queue validation failed: ${queue.errors.join("; ")}`,
    );
  }
  const requiredTasks = discoverRequiredStandardDeliveries({
    tasks: queue.tasks,
    invocation,
    managedRoutingAvailable,
  });
  const parsedInvocation = parseTaskInvocation(invocation, {
    managedRoutingAvailable,
  });
  const invokedTask = queue.tasks.find(
    (task) => task.id === parsedInvocation.taskId,
  );
  if (
    parsedInvocation.mode === "EXACT" &&
    (requiredTasks.some((task) => task.id === parsedInvocation.taskId) ||
      (invokedTask &&
        completeTask(invokedTask) &&
        requiresStandardDelivery(invokedTask)))
  ) {
    throw hydrationError(
      parsedInvocation.taskId,
      "CHECKPOINT_BOOTSTRAP",
      "the invoked Task cannot attest to its own delivery; bootstrap must target selectable work after the terminal history",
      "DELIVERY_CONTINUITY_INVALID",
    );
  }
  if (requiredTasks.length === 0) {
    throw hydrationError(
      undefined,
      "CHECKPOINT_BOOTSTRAP",
      "existing-history bootstrap requires at least one prior STANDARD delivery",
      "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
    );
  }

  const localCommandCache = createInvocationCommandCache({
    runner: commandRunner,
  });
  const contractTasks = queue.tasks
    .filter(
      (task) =>
        isQueueAwareTaskContractVersion(task.contractVersion) &&
        completeTask(task) &&
        requiresStandardDelivery(task),
    )
    .sort((left, right) => left.number - right.number);
  const local = await localDiscovery({
    tasksRoot: resolvedTasksRoot,
    requiredTasks,
    contractTasks,
    commandCache: localCommandCache,
  });
  if (
    !isRecord(local) ||
    !Array.isArray(local.outcomes) ||
    local.outcomes.length !== requiredTasks.length
  ) {
    throw hydrationError(
      undefined,
      "LOCAL_GIT",
      "local discovery returned a partial or malformed outcome set",
    );
  }
  const existingMainCheckpoint = await showGitFile(
    localCommandCache,
    local.repositoryRoot,
    local.currentMainSha,
    STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH,
  );
  if (existingMainCheckpoint !== undefined) {
    throw hydrationError(
      undefined,
      "CHECKPOINT_BOOTSTRAP",
      "aligned main already contains a continuity checkpoint",
      "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
    );
  }

  const externalCommandCache = createInvocationCommandCache({
    runner: commandRunner,
  });
  const collected = await collectNormalizedDeliveryOutcomes({
    local,
    commandCache: externalCommandCache,
    githubClient,
  });
  const outcomeByTask = new Map(
    local.outcomes.map((outcome) => [outcome.taskId, outcome]),
  );
  const coveredRecords = [];
  for (const task of requiredTasks) {
    const outcome = outcomeByTask.get(task.id);
    const entry = collected.deliveryLedger[task.id];
    const expectation = collected.deliveryExpectations[task.id];
    const evaluation = evaluateDeliveryEvidence(task.id, entry, expectation);
    if (!evaluation.satisfied) {
      throw hydrationError(
        task.id,
        "CHECKPOINT_BOOTSTRAP",
        `production evaluator rejected bootstrap evidence: ${evaluation.issues.join("; ")}`,
      );
    }
    assertFutureTerminalOutcomeImmutable(task, outcome);
    coveredRecords.push(
      await buildContinuityCoveredRecord({
        task,
        outcome,
        entry,
        expectation,
        local,
        commandCache: localCommandCache,
        role: "CHECKPOINT_BOOTSTRAP",
      }),
    );
  }
  const created = createStandardDeliveryContinuityCheckpoint({
    repository: local.repository,
    baseRef: "main",
    sourceMainSha: local.currentMainSha,
    coveredRecords,
  });
  const writeResult = writeCheckpoint
    ? await writeStandardDeliveryContinuityCheckpoint({
        tasksRoot: resolvedTasksRoot,
        bytes: created.bytes,
      })
    : undefined;
  const localMetrics = localCommandCache.details();
  const externalMetrics = externalCommandCache.details();
  return Object.freeze({
    checkpoint: created.checkpoint,
    bytes: created.bytes,
    write: writeResult,
    diagnostics: Object.freeze({
      requiredTaskIds: Object.freeze(requiredTasks.map((task) => task.id)),
      classifications: collected.classifications,
      identities: Object.freeze({
        repository: local.repository,
        localMainSha: local.currentMainSha,
        upstreamSha: local.upstreamSha,
        cachedMainSha: local.cachedMainSha,
        directRemoteSha: local.directRemoteSha,
        githubMainSha: collected.githubMainSha,
        contractAnchorSha: local.contractAnchorSha,
      }),
      localCache: localMetrics,
      externalCache: externalMetrics,
      commandCount: localMetrics.misses + externalMetrics.misses,
      jobLogFetchCount:
        localMetrics.jobLogFetches + externalMetrics.jobLogFetches,
      persistentRawLogs: false,
    }),
  });
}

export async function applyStandardDeliveryContinuityTransition({
  tasksRoot,
  selectedTaskId,
  preparedCheckpoint,
  transitionToken,
  commandRunner,
  queueInspector = inspectTaskQueue,
  githubClient,
} = {}) {
  let prepared;
  try {
    const hasPreparedCheckpoint = preparedCheckpoint !== undefined;
    const hasTransitionToken = transitionToken !== undefined;
    if (hasPreparedCheckpoint === hasTransitionToken) {
      throw new TaskArtifactError(
        "DELIVERY_CONTINUITY_INVALID",
        "exactly one internal continuity transition input is required",
      );
    }
    if (hasPreparedCheckpoint) {
      const checkpoint = parseStandardDeliveryContinuityCheckpoint(
        `${JSON.stringify(preparedCheckpoint, null, 2)}\n`,
      );
      if (checkpoint.transition?.taskId === selectedTaskId) {
        throw new TaskArtifactError(
          "DELIVERY_CONTINUITY_INVALID",
          "selected Task cannot attest to its own delivery",
        );
      }
      prepared = Object.freeze({ selectedTaskId, checkpoint });
    } else {
      prepared = parseStandardDeliveryContinuityTransitionToken(transitionToken);
    }
  } catch (error) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      error instanceof Error ? error.message : "transition token is invalid",
      error?.code ?? "DELIVERY_CONTINUITY_INVALID",
    );
  }
  if (prepared.selectedTaskId !== selectedTaskId) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      "transition token belongs to a different selected Task",
    );
  }
  const resolvedTasksRoot = path.resolve(tasksRoot);
  const validateQueue = async () => {
    const queue = await queueInspector(resolvedTasksRoot);
    if (
      !isRecord(queue) ||
      !Array.isArray(queue.tasks) ||
      !Array.isArray(queue.errors)
    ) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        "queue inspection returned a malformed response",
      );
    }
    if (queue.errors.length > 0) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        `queue validation failed: ${queue.errors.join("; ")}`,
      );
    }
    const activeTasks = queue.tasks.filter(activeTask);
    if (activeTasks.length > 0) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        `continuity cannot apply while implementation is active: ${activeTasks.map((task) => task.id).join(", ")}`,
      );
    }
    const selectedTask = queue.tasks.find((task) => task.id === selectedTaskId);
    if (
      !selectedTask ||
      selectedTask.taskStatus !== "DONE" ||
      selectedTask.testStatus !== "PASSED" ||
      !requiresStandardDelivery(selectedTask)
    ) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        "selected Task must be terminal DONE/PASSED STANDARD delivery work",
      );
    }
    const requiredTasks = discoverRequiredStandardDeliveries({
      tasks: queue.tasks,
      invocation: `$kyw-deliver ${selectedTaskId}`,
      managedRoutingAvailable: false,
    });
    let partition;
    try {
      partition = partitionStandardDeliveryContinuity({
        checkpoint: prepared.checkpoint,
        requiredTasks,
      });
    } catch (error) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        error instanceof Error ? error.message : "prepared coverage is invalid",
        error?.code ?? "DELIVERY_CONTINUITY_INVALID",
      );
    }
    if (partition.uncoveredTasks.length !== 0) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        "prepared checkpoint does not cover the exact prior delivery set",
      );
    }
    return Object.freeze({ queue, requiredTasks });
  };

  const desiredBytes = `${JSON.stringify(prepared.checkpoint, null, 2)}\n`;
  const checkpointBytesKind = (bytes) => {
    if (bytes === desiredBytes) return "DESIRED";
    if (bytes === undefined) {
      return prepared.checkpoint.previousCheckpointDigest === "GENESIS"
        ? "PREVIOUS"
        : "UNKNOWN";
    }
    try {
      return parseStandardDeliveryContinuityCheckpoint(bytes)
        .checkpointDigest === prepared.checkpoint.previousCheckpointDigest
        ? "PREVIOUS"
        : "UNKNOWN";
    } catch {
      return "UNKNOWN";
    }
  };
  const validateCheckpointGitTuple = async (commandCache, repositoryRoot) => {
    const relativePath = STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH;
    const [headBytes, indexBytes, headEntryText, indexEntryText] = await Promise.all([
      showGitFile(commandCache, repositoryRoot, "HEAD", relativePath, selectedTaskId),
      showGitFile(commandCache, repositoryRoot, "", relativePath, selectedTaskId),
      gitPorcelainText(
        commandCache,
        repositoryRoot,
        ["ls-tree", "HEAD", "--", relativePath],
        { taskId: selectedTaskId, role: "CHECKPOINT_APPLY" },
      ),
      gitPorcelainText(
        commandCache,
        repositoryRoot,
        ["ls-files", "--stage", "--", relativePath],
        { taskId: selectedTaskId, role: "CHECKPOINT_APPLY" },
      ),
    ]);
    const validateEntry = ({ source, text, bytes }) => {
      const entries = parseTerminalArtifactGitEntries(text, { source });
      const validEntry =
        entries?.length === 1 &&
        entries[0].relativePath === relativePath &&
        entries[0].mode === "100644" &&
        (source === "tree"
          ? entries[0].type === "blob"
          : entries[0].stage === 0);
      if (
        (!entries || entries.length > 1) ||
        (entries.length === 0 && bytes !== undefined) ||
        (entries.length === 1 && (!validEntry || bytes === undefined))
      ) {
        throw hydrationError(
          selectedTaskId,
          "CHECKPOINT_APPLY",
          `checkpoint ${source === "tree" ? "HEAD" : "index"} entry must be absent or exactly one stage-0 regular 100644 blob`,
        );
      }
    };
    validateEntry({ source: "tree", text: headEntryText, bytes: headBytes });
    validateEntry({ source: "index", text: indexEntryText, bytes: indexBytes });
    const target = path.resolve(
      resolvedTasksRoot,
      STANDARD_DELIVERY_CONTINUITY_FILE,
    );
    let worktreeBytes;
    try {
      const targetState = await lstat(target);
      if (targetState.isSymbolicLink() || !targetState.isFile()) {
        throw hydrationError(
          selectedTaskId,
          "CHECKPOINT_APPLY",
          "checkpoint worktree target must be absent or a regular file",
        );
      }
      worktreeBytes = await readFile(target, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const tuple = [headBytes, indexBytes, worktreeBytes].map(checkpointBytesKind);
    const tupleKey = tuple.join("/");
    if (
      tuple.includes("UNKNOWN") ||
      !new Set([
        "PREVIOUS/PREVIOUS/PREVIOUS",
        "PREVIOUS/PREVIOUS/DESIRED",
        "PREVIOUS/DESIRED/DESIRED",
        "DESIRED/DESIRED/DESIRED",
      ]).has(tupleKey)
    ) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        `checkpoint HEAD/index/worktree state is unsafe (${tupleKey})`,
      );
    }
    return Object.freeze({ head: tuple[0], index: tuple[1], worktree: tuple[2] });
  };

  const validatePreparedTerminalPairs = async ({
    requiredTasks,
    commandCache,
    repositoryRoot,
  }) => {
    const pairs = requiredTasks.map((task) => {
      const artifacts = [
        { kind: "TASK", absolutePath: task.taskPath },
        { kind: "TEST", absolutePath: task.testPath },
      ].map(({ kind, absolutePath }) => {
        if (typeof absolutePath !== "string" || !path.isAbsolute(absolutePath)) {
          throw hydrationError(
            task.id,
            "CHECKPOINT_PAIR_STATE",
            `${kind}.md path must be one absolute canonical Task-pair path`,
          );
        }
        const resolvedPath = path.resolve(absolutePath);
        const relativePath = path
          .relative(resolvedTasksRoot, resolvedPath)
          .replaceAll("\\", "/");
        if (
          path.isAbsolute(relativePath) ||
          relativePath === ".." ||
          relativePath.startsWith("../")
        ) {
          throw hydrationError(
            task.id,
            "CHECKPOINT_PAIR_STATE",
            `${kind}.md path escapes the exact tasks root`,
          );
        }
        const repositoryRelativePath = `docs/tasks/${relativePath}`;
        const match = taskPairPathMatch(task.id, repositoryRelativePath);
        if (!match || match.kind !== kind) {
          throw hydrationError(
            task.id,
            "CHECKPOINT_PAIR_STATE",
            `${kind}.md path is not the exact canonical Task ${task.id} pair path`,
          );
        }
        return Object.freeze({
          kind,
          absolutePath: resolvedPath,
          relativePath: repositoryRelativePath,
          directory: match.directory,
        });
      });
      if (artifacts[0].directory !== artifacts[1].directory) {
        throw hydrationError(
          task.id,
          "CHECKPOINT_PAIR_STATE",
          "Task/Test paths do not name one canonical pair directory",
        );
      }
      return Object.freeze({ task, artifacts: Object.freeze(artifacts) });
    });
    const relativePaths = pairs.flatMap(({ artifacts }) =>
      artifacts.map(({ relativePath }) => relativePath),
    );
    const [treeEntries, indexEntries] = await Promise.all([
      readTerminalArtifactGitEntries({
        cache: commandCache,
        repositoryRoot,
        source: "tree",
        revision: prepared.checkpoint.sourceMainSha,
        relativePaths,
        taskId: selectedTaskId,
        role: "CHECKPOINT_PAIR_STATE",
      }),
      readTerminalArtifactGitEntries({
        cache: commandCache,
        repositoryRoot,
        source: "index",
        relativePaths,
        taskId: selectedTaskId,
        role: "CHECKPOINT_PAIR_STATE",
      }),
    ]);
    if (!treeEntries || !indexEntries) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_PAIR_STATE",
        "terminal-pair tree or index entries are malformed or ambiguous",
      );
    }
    const terminalPairs = [];
    for (const { task, artifacts } of pairs) {
      const markdown = {};
      for (const artifact of artifacts) {
        const treeEntry = treeEntries.get(artifact.relativePath);
        const indexEntry = indexEntries.get(artifact.relativePath);
        if (
          !terminalArtifactGitEntryIsRegular(treeEntry, { source: "tree" }) ||
          !terminalArtifactGitEntryIsRegular(indexEntry, { source: "index" }) ||
          treeEntry.mode !== indexEntry.mode ||
          treeEntry.objectSha !== indexEntry.objectSha
        ) {
          throw hydrationError(
            task.id,
            "CHECKPOINT_PAIR_STATE",
            `${artifact.relativePath} tree/index mode, type, stage, or blob changed after preparation`,
          );
        }
        let state;
        let worktreeBytes;
        try {
          state = await lstat(artifact.absolutePath);
          worktreeBytes = await readFile(artifact.absolutePath, "utf8");
        } catch (error) {
          throw hydrationError(
            task.id,
            "CHECKPOINT_PAIR_STATE",
            `${artifact.relativePath} could not be read as a terminal artifact: ${error.message}`,
          );
        }
        if (
          state.isSymbolicLink() ||
          !state.isFile() ||
          !terminalArtifactWorktreeModeMatches(treeEntry.mode, state)
        ) {
          throw hydrationError(
            task.id,
            "CHECKPOINT_PAIR_STATE",
            `${artifact.relativePath} worktree type or executable mode changed after preparation`,
          );
        }
        const sourceBytes = await showGitFile(
          commandCache,
          repositoryRoot,
          prepared.checkpoint.sourceMainSha,
          artifact.relativePath,
          task.id,
        );
        if (sourceBytes === undefined || sourceBytes !== worktreeBytes) {
          throw hydrationError(
            task.id,
            "CHECKPOINT_PAIR_STATE",
            `${artifact.relativePath} bytes changed after preparation`,
          );
        }
        markdown[artifact.kind] = sourceBytes;
      }
      if (
        sectionStatus(markdown.TASK) !== "DONE" ||
        sectionStatus(markdown.TEST) !== "PASSED"
      ) {
        throw hydrationError(
          task.id,
          "CHECKPOINT_PAIR_STATE",
          "prepared terminal pair no longer proves DONE/PASSED",
        );
      }
      terminalPairs.push({
        taskId: task.id,
        taskSha256: sha256Text(markdown.TASK),
        testSha256: sha256Text(markdown.TEST),
        taskStatus: "DONE",
        testStatus: "PASSED",
      });
    }
    if (
      digestStandardDeliveryContinuityTerminalPairs(terminalPairs) !==
      prepared.checkpoint.coverage.terminalPairStateSha256
    ) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_PAIR_STATE",
        "terminal Task/Test path, mode, or byte state no longer matches the prepared checkpoint",
      );
    }
  };

  const validateRepository = async (requiredTasks) => {
    const commandCache = createInvocationCommandCache({ runner: commandRunner });
    const identity = await discoverAlignedMainIdentity({
      tasksRoot: resolvedTasksRoot,
      commandCache,
      githubClient,
    });
    if (identity.currentMainSha !== prepared.checkpoint.sourceMainSha) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        "local or remote main advanced after checkpoint preparation",
      );
    }
    if (identity.repository !== prepared.checkpoint.repository) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        "repository identity changed after checkpoint preparation",
      );
    }
    const [currentBranch, currentHeadSha] = await Promise.all([
      gitText(
        commandCache,
        identity.repositoryRoot,
        ["symbolic-ref", "--quiet", "--short", "HEAD"],
        { taskId: selectedTaskId, role: "CHECKPOINT_APPLY" },
      ),
      gitText(commandCache, identity.repositoryRoot, ["rev-parse", "HEAD"], {
        taskId: selectedTaskId,
        role: "CHECKPOINT_APPLY",
      }),
    ]);
    if (!branchOwnsTask(currentBranch, selectedTaskId)) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        "current branch does not prove selected-Task ownership",
      );
    }
    requireSha(currentHeadSha, selectedTaskId, "CHECKPOINT_APPLY", "current HEAD");
    if (
      !(await gitIsAncestor(
        commandCache,
        identity.repositoryRoot,
        identity.currentMainSha,
        currentHeadSha,
      ))
    ) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        "selected branch is not descended from prepared main",
      );
    }
    if (
      !(await gitIsAncestor(
        commandCache,
        identity.repositoryRoot,
        prepared.checkpoint.coveredMainSha,
        identity.currentMainSha,
      ))
    ) {
      throw hydrationError(
        selectedTaskId,
        "CHECKPOINT_APPLY",
        "covered main is not an ancestor of prepared source main",
      );
    }
    const checkpointTuple = await validateCheckpointGitTuple(
      commandCache,
      identity.repositoryRoot,
    );
    await validatePreparedTerminalPairs({
      requiredTasks,
      commandCache,
      repositoryRoot: identity.repositoryRoot,
    });
    return Object.freeze({
      identity,
      currentBranch,
      currentHeadSha,
      checkpointTuple,
      commandCache,
    });
  };

  const initialQueue = await validateQueue();
  const initial = await validateRepository(initialQueue.requiredTasks);

  const write = await writeStandardDeliveryContinuityCheckpoint({
    tasksRoot: resolvedTasksRoot,
    bytes: desiredBytes,
    beforePublish: async () => {
      const finalQueue = await validateQueue();
      await validateRepository(finalQueue.requiredTasks);
    },
  });
  return Object.freeze({
    selectedTaskId,
    currentBranch: initial.currentBranch,
    currentMainSha: initial.identity.currentMainSha,
    currentHeadSha: initial.currentHeadSha,
    checkpointDigest: prepared.checkpoint.checkpointDigest,
    coveredTaskCount: prepared.checkpoint.coverage.taskCount,
    write,
    checkpointTuple: initial.checkpointTuple,
    cache: initial.commandCache.details(),
  });
}

async function buildImmutableTerminalFallbackQueue({
  tasksRoot,
  queue,
  commandRunner,
}) {
  const commandCache = createInvocationCommandCache({ runner: commandRunner });
  const requestedRoot = path.resolve(tasksRoot);
  const repositoryRoot = await gitText(
    commandCache,
    requestedRoot,
    ["rev-parse", "--show-toplevel"],
    { role: "TERMINAL_PAIR_FALLBACK" },
  );
  if (!(await tasksRootMatchesRepository(requestedRoot, repositoryRoot))) {
    return undefined;
  }
  const currentMainSha = await gitText(
    commandCache,
    repositoryRoot,
    ["rev-parse", "refs/heads/main"],
    { role: "TERMINAL_PAIR_FALLBACK" },
  );
  requireSha(
    currentMainSha,
    undefined,
    "TERMINAL_PAIR_FALLBACK",
    "local main",
  );
  const historicalTasks = await discoverHistoricalImmutableTerminalTasks({
    commandCache,
    repositoryRoot,
    currentMainSha,
    tasksRoot: requestedRoot,
  });
  if (historicalTasks.length === 0) return undefined;
  const byId = new Map(queue.tasks.map((task) => [task.id, task]));
  for (const task of historicalTasks) byId.set(task.id, task);
  return Object.freeze({
    tasks: Object.freeze(
      [...byId.values()].sort((left, right) => left.number - right.number),
    ),
    errors: Object.freeze([]),
    currentTasks: Object.freeze(
      [...byId.values()]
        .filter((task) =>
          isQueueAwareTaskContractVersion(task.contractVersion),
        )
        .sort((left, right) => left.number - right.number),
    ),
  });
}

export async function hydratePriorStandardDeliveries({
  tasksRoot,
  invocation,
  managedRoutingAvailable = false,
  parsedInvocation: suppliedParsedInvocation,
  commandRunner,
  queueInspector = inspectTaskQueue,
  localDiscovery = discoverLocalDeliveryOutcomes,
  githubClient,
  allowUncheckpointedCompatibility = false,
  continuityLoader = loadTrustedStandardDeliveryContinuity,
  emptyContinuityPreparer = prepareEmptyHistoryStandardDeliveryContinuity,
  deliveryCollector = collectNormalizedDeliveryOutcomes,
  currentDeliveryHydrator = hydrateSelectedStandardDeliverySnapshot,
  currentDeliveryProbe = probeCurrentStandardDeliveryState,
  continuityRecordBuilder = buildContinuityCoveredRecord,
  _skipImmutableTerminalFallback = false,
} = {}) {
  const parsedInvocation =
    suppliedParsedInvocation ??
    parseTaskInvocation(invocation, { managedRoutingAvailable });
  const queue = await queueInspector(path.resolve(tasksRoot));
  if (!isRecord(queue) || !Array.isArray(queue.tasks) || !Array.isArray(queue.errors)) {
    throw hydrationError(
      undefined,
      "QUEUE",
      "queue inspection returned a malformed response",
    );
  }
  const rethrowProvenImmutableTerminalDrift = async () => {
    if (_skipImmutableTerminalFallback) return;
    let fallbackQueue;
    try {
      fallbackQueue = await buildImmutableTerminalFallbackQueue({
        tasksRoot,
        queue,
        commandRunner,
      });
    } catch {
      return;
    }
    if (!fallbackQueue) return;
    try {
      await hydratePriorStandardDeliveries({
        tasksRoot,
        invocation,
        managedRoutingAvailable,
        parsedInvocation,
        commandRunner,
        queueInspector: async () => fallbackQueue,
        localDiscovery,
        githubClient,
        allowUncheckpointedCompatibility,
        continuityLoader,
        emptyContinuityPreparer,
        deliveryCollector,
        currentDeliveryHydrator,
        currentDeliveryProbe,
        continuityRecordBuilder,
        _skipImmutableTerminalFallback: true,
      });
    } catch (error) {
      if (
        error?.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" ||
        error?.code === "FUTURE_TERMINAL_DELIVERY_AMBIGUOUS"
      ) {
        throw error;
      }
    }
  };
  if (queue.errors.length > 0) {
    await rethrowProvenImmutableTerminalDrift();
    throw hydrationError(
      undefined,
      "QUEUE",
      `queue validation failed: ${queue.errors.join("; ")}`,
    );
  }
  const hydrationPlan = discoverStandardDeliveryHydrationPlan({
    tasks: queue.tasks,
    invocation,
    managedRoutingAvailable,
    parsedInvocation,
  });
  const { requiredTasks, currentDeliveryTask } = hydrationPlan;
  const finalizeHydration = (
    hydrated,
    selectedCurrentDeliveryTask = currentDeliveryTask,
  ) =>
    mergeSelectedStandardDeliverySnapshot({
      hydrated,
      currentDeliveryTask: selectedCurrentDeliveryTask,
      tasksRoot: path.resolve(tasksRoot),
      commandRunner,
      localDiscovery,
      deliveryCollector,
      githubClient,
      currentDeliveryHydrator,
      currentDeliveryProbe,
      allowCurrentDeliveryProbe: parsedInvocation.route === "DELIVERY",
      forceCurrentDeliveryRevalidation:
        parsedInvocation.route === "DELIVERY" &&
        releaseBearingStandardTask(selectedCurrentDeliveryTask),
    });
  if (requiredTasks.length === 0) {
    await rethrowProvenImmutableTerminalDrift();
    if (!allowUncheckpointedCompatibility) {
      const commandCache = createInvocationCommandCache({
        runner: commandRunner,
      });
      const selectedDeliveryTask = currentDeliveryTask;
      if (selectedDeliveryTask) {
        const coverageTasks = queue.tasks
          .filter(
            (task) =>
              isQueueAwareTaskContractVersion(task.contractVersion) &&
              completeTask(task) &&
              requiresStandardDelivery(task),
          )
          .sort((left, right) => left.number - right.number);
        let continuity;
        try {
          continuity = await continuityLoader({
            tasksRoot: path.resolve(tasksRoot),
            requiredTasks,
            coverageTasks,
            currentDeliveryTaskId: selectedDeliveryTask.id,
            commandCache,
            githubClient,
          });
        } catch (error) {
          if (
            error?.code !== "DELIVERY_CONTINUITY_REBASELINE_REQUIRED" ||
            !String(error.message).includes("has no durable continuity checkpoint")
          ) {
            throw error;
          }
        }
        if (continuity) {
          const coveredTasks =
            continuity.coveragePartition?.coveredTasks ??
            continuity.partition.coveredTasks;
          const coveredState = buildStandardDeliveryContinuityState({
            checkpoint: continuity.checkpoint,
            coveredTasks,
            coverageTasks: continuity.coverageTasks ?? coverageTasks,
          });
          const metrics = commandCache.details();
          return finalizeHydration(freezeHydrationResult({
            deliveryLedger: coveredState.deliveryLedger,
            deliveryExpectations: coveredState.deliveryExpectations,
            diagnostics: {
              requiredTaskIds: Object.freeze([]),
              classifications: Object.freeze(
                Object.fromEntries(
                  coveredTasks.map((task) => [
                    task.id,
                    "DURABLE_STANDARD_CONTINUITY",
                  ]),
                ),
              ),
              chronology: Object.freeze([]),
              identities: Object.freeze({
                repository: continuity.identity.repository,
                localMainSha: continuity.identity.currentMainSha,
                upstreamSha: continuity.identity.upstreamSha,
                cachedMainSha: continuity.identity.cachedMainSha,
                directRemoteSha: continuity.identity.directRemoteSha,
                githubMainSha: continuity.identity.githubMainSha,
              }),
              continuity: Object.freeze({
                source: continuity.source,
                checkpointDigest: continuity.checkpoint.checkpointDigest,
                coveredTaskCount: 0,
                checkpointCoveredTaskCount: coveredTasks.length,
                coveredTaskIds: Object.freeze([]),
                uncoveredTaskIds: Object.freeze([]),
                freshEvidenceTaskCount: 0,
                preparedAdvancement: false,
                fullHistoryFallback: false,
              }),
              cache: commandCache.stats(),
              queryCounts: Object.freeze({
                commands: metrics.misses,
                gitCommands: metrics.gitCommands,
                githubApiCommands: metrics.githubApiCommands,
                jobLogFetches: metrics.jobLogFetches,
              }),
              queryPolicy: Object.freeze({
                retries: 0,
                maxRequiredDeliveries: MAX_REQUIRED_DELIVERIES,
                maxUncoveredDeliveries: 1,
                maxGitHubResults: MAX_GITHUB_RESULTS,
                maxRunAttempts: MAX_RUN_ATTEMPTS,
                persistentCache: false,
                persistentRawLogs: false,
              }),
            },
          }));
        }
      }
      const empty = await emptyContinuityPreparer({
        tasksRoot: path.resolve(tasksRoot),
        commandCache,
      });
      const metrics = commandCache.details();
      return finalizeHydration(freezeHydrationResult({
        deliveryLedger: {},
        deliveryExpectations: {},
        preparedCheckpoint: empty.preparedCheckpoint,
        diagnostics: {
          requiredTaskIds: Object.freeze([]),
          classifications: Object.freeze({}),
          chronology: Object.freeze([]),
          identities: Object.freeze({
            repository: empty.repository,
            localMainSha: empty.currentMainSha,
            upstreamSha: empty.upstreamSha,
            cachedMainSha: empty.cachedMainSha,
          }),
          continuity: Object.freeze({
            source: empty.source,
            checkpointDigest: empty.checkpoint.checkpointDigest,
            coveredTaskCount: 0,
            coveredTaskIds: Object.freeze([]),
            uncoveredTaskIds: Object.freeze([]),
            freshEvidenceTaskCount: 0,
            preparedAdvancement: Boolean(empty.preparedCheckpoint),
            fullHistoryFallback: false,
          }),
          cache: commandCache.stats(),
          queryCounts: Object.freeze({
            commands: metrics.misses,
            gitCommands: metrics.gitCommands,
            githubApiCommands: metrics.githubApiCommands,
            jobLogFetches: metrics.jobLogFetches,
          }),
          queryPolicy: Object.freeze({
            retries: 0,
            maxRequiredDeliveries: MAX_REQUIRED_DELIVERIES,
            maxUncoveredDeliveries: 1,
            maxGitHubResults: MAX_GITHUB_RESULTS,
            maxRunAttempts: MAX_RUN_ATTEMPTS,
            persistentCache: false,
            persistentRawLogs: false,
          }),
        },
      }));
    }
    return finalizeHydration(freezeHydrationResult({
      deliveryLedger: {},
      deliveryExpectations: {},
      diagnostics: {
        requiredTaskIds: Object.freeze([]),
        classifications: Object.freeze({}),
        chronology: Object.freeze([]),
        cache: Object.freeze({ hits: 0, misses: 0, entries: 0, maxCommands: MAX_COMMANDS }),
        queryPolicy: Object.freeze({
          retries: 0,
          maxRequiredDeliveries: MAX_REQUIRED_DELIVERIES,
          maxGitHubResults: MAX_GITHUB_RESULTS,
          maxRunAttempts: MAX_RUN_ATTEMPTS,
          persistentCache: false,
        }),
      },
    }));
  }

  if (!allowUncheckpointedCompatibility) {
    const commandCache = createInvocationCommandCache({ runner: commandRunner });
    const coverageTasks = queue.tasks
      .filter(
        (task) =>
          isQueueAwareTaskContractVersion(task.contractVersion) &&
          completeTask(task) &&
          requiresStandardDelivery(task),
      )
      .sort((left, right) => left.number - right.number);
    const continuity = await continuityLoader({
      tasksRoot: path.resolve(tasksRoot),
      requiredTasks,
      coverageTasks,
      currentDeliveryTaskId: currentDeliveryTask?.id,
      maxUncoveredTasks: currentDeliveryTask
        ? 1
        : MAX_REQUIRED_DELIVERIES,
      commandCache,
      githubClient,
    });
    const checkpointCoveredCurrentTask = currentDeliveryTask
      ? continuity.coveragePartition?.coveredTasks.find(
          (task) => task.id === currentDeliveryTask.id,
        )
      : undefined;
    const durableTasks = Object.freeze([
      ...continuity.partition.coveredTasks,
      ...(checkpointCoveredCurrentTask &&
      !continuity.partition.coveredTasks.some(
        (task) => task.id === checkpointCoveredCurrentTask.id,
      )
        ? [checkpointCoveredCurrentTask]
        : []),
    ]);
    const coveredState = buildStandardDeliveryContinuityState({
      checkpoint: continuity.checkpoint,
      coveredTasks: durableTasks,
      coverageTasks: continuity.coverageTasks ?? coverageTasks,
    });
    for (const task of durableTasks) {
      const evaluation = evaluateDeliveryEvidence(
        task.id,
        coveredState.deliveryLedger[task.id],
        coveredState.deliveryExpectations[task.id],
      );
      if (!evaluation.satisfied) {
        throw hydrationError(
          task.id,
          "CHECKPOINT",
          `production evaluator rejected durable continuity: ${evaluation.issues.join("; ")}`,
        );
      }
    }

    let fresh = {
      deliveryLedger: Object.freeze({}),
      deliveryExpectations: Object.freeze({}),
      classifications: Object.freeze({}),
      chronology: Object.freeze([]),
      githubMainSha: continuity.identity.githubMainSha,
    };
    let freshLocal;
    let preparedCheckpoint;
    let dynamicCurrentDeliveryTask;
    let freshEvidenceTaskCount = 0;
    const recoveredImmutableTaskIds = new Set(
      continuity.recoveredImmutableTaskIds ?? [],
    );
    const uncoveredTasks = Object.freeze([
      ...continuity.partition.uncoveredTasks,
      ...(continuity.coveragePartition?.uncoveredTasks ?? []).filter(
        (task) =>
          recoveredImmutableTaskIds.has(task.id) &&
          !continuity.partition.uncoveredTasks.some(
            (requiredTask) => requiredTask.id === task.id,
        ),
      ),
    ]);
    const strictDeliveryPredecessor =
      parsedInvocation.route === "DELIVERY" && Boolean(currentDeliveryTask);
    if (currentDeliveryTask && uncoveredTasks.length > 1) {
      throw hydrationError(
        undefined,
        "CHECKPOINT",
        `checkpoint gap ${uncoveredTasks.length} requires explicit migration/rebaseline`,
        "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
      );
    }
    const predecessorCandidates = currentDeliveryTask
      ? uncoveredTasks
      : uncoveredTasks.slice(0, 1);
    if (predecessorCandidates.length === 1) {
      const predecessor = predecessorCandidates[0];
      try {
        freshLocal = await localDiscovery({
          tasksRoot: path.resolve(tasksRoot),
          requiredTasks: predecessorCandidates,
          contractTasks: predecessorCandidates,
          commandCache,
        });
      } catch (error) {
        if (
          strictDeliveryPredecessor ||
          !missingCurrentDeliveryOutcome(error, predecessor.id)
        ) {
          throw error;
        }
        dynamicCurrentDeliveryTask = predecessor;
      }
    }
    if (freshLocal) {
      if (
        !isRecord(freshLocal) ||
        !Array.isArray(freshLocal.outcomes) ||
        freshLocal.outcomes.length !== 1
      ) {
        throw hydrationError(
          undefined,
          "LOCAL_GIT",
          "uncovered local discovery returned a partial or malformed outcome set",
        );
      }
      const uncoveredTask = predecessorCandidates[0];
      try {
        fresh = await deliveryCollector({
          local: freshLocal,
          commandCache,
          githubClient: continuity.identity.githubClient,
        });
      } catch (error) {
        if (
          strictDeliveryPredecessor ||
          error?.code !== "DELIVERY_HYDRATION_PENDING"
        ) {
          throw error;
        }
        dynamicCurrentDeliveryTask = uncoveredTask;
      }
      if (!dynamicCurrentDeliveryTask) {
      const outcome = freshLocal.outcomes[0];
      const freshEvaluation = evaluateDeliveryEvidence(
        uncoveredTask.id,
        fresh.deliveryLedger[uncoveredTask.id],
        fresh.deliveryExpectations[uncoveredTask.id],
      );
      if (!freshEvaluation.satisfied) {
        if (!strictDeliveryPredecessor) {
          dynamicCurrentDeliveryTask = uncoveredTask;
        } else {
        throw hydrationError(
          uncoveredTask.id,
          "HARDENED_EXACT_HEAD",
          `production evaluator rejected uncovered evidence: ${freshEvaluation.issues.join("; ")}`,
        );
        }
      }
      if (freshEvaluation.satisfied) {
        assertFutureTerminalOutcomeImmutable(uncoveredTask, outcome);
        const coveredRecord = await continuityRecordBuilder({
          task: uncoveredTask,
          outcome,
          entry: fresh.deliveryLedger[uncoveredTask.id],
          expectation: fresh.deliveryExpectations[uncoveredTask.id],
          local: freshLocal,
          commandCache,
          role: "CHECKPOINT_PREPARE",
        });
        preparedCheckpoint = createStandardDeliveryContinuityCheckpoint({
          repository: continuity.identity.repository,
          baseRef: "main",
          sourceMainSha: continuity.identity.currentMainSha,
          coveredRecords: [coveredRecord],
          previousCheckpoint: continuity.checkpoint,
        }).checkpoint;
        freshEvidenceTaskCount = 1;
        if (!currentDeliveryTask) {
          dynamicCurrentDeliveryTask = uncoveredTasks[1];
        }
      }
      }
    }
    const classifications = Object.fromEntries(
      durableTasks.map((task) => [
        task.id,
        "DURABLE_STANDARD_CONTINUITY",
      ]),
    );
    Object.assign(classifications, fresh.classifications);
    const metrics = commandCache.details();
    const visibleUncoveredTasks = currentDeliveryTask
      ? uncoveredTasks
      : uncoveredTasks.slice(0, dynamicCurrentDeliveryTask ? 2 : 1);
    return finalizeHydration(freezeHydrationResult({
      deliveryLedger: {
        ...coveredState.deliveryLedger,
        ...fresh.deliveryLedger,
      },
      deliveryExpectations: {
        ...coveredState.deliveryExpectations,
        ...fresh.deliveryExpectations,
      },
      preparedCheckpoint,
      diagnostics: {
        requiredTaskIds: Object.freeze(requiredTasks.map((task) => task.id)),
        classifications: Object.freeze(classifications),
        chronology: fresh.chronology,
        identities: Object.freeze({
          repository: continuity.identity.repository,
          localMainSha: continuity.identity.currentMainSha,
          upstreamSha: continuity.identity.upstreamSha,
          cachedMainSha: continuity.identity.cachedMainSha,
          directRemoteSha: continuity.identity.directRemoteSha,
          githubMainSha: fresh.githubMainSha,
          checkpointSourceMainSha: continuity.checkpoint.sourceMainSha,
          checkpointCoveredMainSha: continuity.checkpoint.coveredMainSha,
        }),
        continuity: Object.freeze({
          source: continuity.source,
          checkpointDigest: continuity.checkpoint.checkpointDigest,
          coveredTaskCount: continuity.partition.coveredTasks.length,
          checkpointCoveredTaskCount:
            continuity.coveragePartition?.coveredTasks.length ??
            continuity.checkpoint.coverage.taskCount,
          coveredTaskIds: Object.freeze(
            continuity.partition.coveredTasks.map((task) => task.id),
          ),
          uncoveredTaskIds: Object.freeze(
            visibleUncoveredTasks.map((task) => task.id),
          ),
          freshEvidenceTaskCount,
          preparedAdvancement: Boolean(preparedCheckpoint),
          fullHistoryFallback: false,
        }),
        cache: commandCache.stats(),
        queryCounts: Object.freeze({
          commands: metrics.misses,
          gitCommands: metrics.gitCommands,
          githubApiCommands: metrics.githubApiCommands,
          jobLogFetches: metrics.jobLogFetches,
        }),
        queryPolicy: Object.freeze({
          retries: 0,
          maxRequiredDeliveries: MAX_REQUIRED_DELIVERIES,
          maxUncoveredDeliveries: currentDeliveryTask ? 1 : 2,
          maxFirstParentCommits: MAX_FIRST_PARENT_COMMITS,
          maxTaskPathCommits: MAX_TASK_PATH_COMMITS,
          maxGitHubResults: MAX_GITHUB_RESULTS,
          maxReviewPages: MAX_REVIEW_PAGES,
          maxRunAttempts: MAX_RUN_ATTEMPTS,
          maxCommands: MAX_COMMANDS,
          persistentCache: false,
          persistentRawLogs: false,
        }),
      },
    }), dynamicCurrentDeliveryTask);
  }

  const commandCache = createInvocationCommandCache({ runner: commandRunner });
  const contractTasks = queue.tasks
    .filter(
      (task) =>
        isQueueAwareTaskContractVersion(task.contractVersion) &&
        completeTask(task) &&
        requiresStandardDelivery(task),
    )
    .sort((left, right) => left.number - right.number);
  const local = await localDiscovery({
    tasksRoot: path.resolve(tasksRoot),
    requiredTasks,
    contractTasks,
    commandCache,
  });
  if (
    !isRecord(local) ||
    !Array.isArray(local.outcomes) ||
    local.outcomes.length !== requiredTasks.length
  ) {
    throw hydrationError(
      undefined,
      "LOCAL_GIT",
      "local discovery returned a partial or malformed outcome set",
    );
  }
  const collected = await deliveryCollector({
    local,
    commandCache,
    githubClient,
  });
  const outcomeByTask = new Map(
    local.outcomes.map((outcome) => [outcome.taskId, outcome]),
  );
  for (const task of requiredTasks) {
    const evaluation = evaluateDeliveryEvidence(
      task.id,
      collected.deliveryLedger[task.id],
      collected.deliveryExpectations[task.id],
    );
    if (evaluation.satisfied) {
      assertFutureTerminalOutcomeImmutable(task, outcomeByTask.get(task.id));
    }
  }

  return finalizeHydration(freezeHydrationResult({
    deliveryLedger: collected.deliveryLedger,
    deliveryExpectations: collected.deliveryExpectations,
    diagnostics: {
      requiredTaskIds: Object.freeze(requiredTasks.map((task) => task.id)),
      classifications: collected.classifications,
      chronology: collected.chronology,
      identities: Object.freeze({
        repository: local.repository,
        localMainSha: local.currentMainSha,
        upstreamSha: local.upstreamSha,
        cachedMainSha: local.cachedMainSha,
        directRemoteSha: local.directRemoteSha,
        githubMainSha: collected.githubMainSha,
        contractAnchorSha: local.contractAnchorSha,
      }),
      cache: commandCache.stats(),
      queryPolicy: Object.freeze({
        retries: 0,
        maxRequiredDeliveries: MAX_REQUIRED_DELIVERIES,
        maxFirstParentCommits: MAX_FIRST_PARENT_COMMITS,
        maxTaskPathCommits: MAX_TASK_PATH_COMMITS,
        maxGitHubResults: MAX_GITHUB_RESULTS,
        maxReviewPages: MAX_REVIEW_PAGES,
        maxRunAttempts: MAX_RUN_ATTEMPTS,
        maxCommands: MAX_COMMANDS,
        persistentCache: false,
      }),
    },
  }));
}

const PUBLIC_RELEASE_WORKFLOW_PATH = ".github/workflows/publish.yml";
const PUBLIC_RELEASE_WORKFLOW_NAME = "Publish npm package through OIDC";

const PUBLIC_REGISTRY = "https://registry.npmjs.org/";
const PUBLIC_RELEASE_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const PUBLIC_RELEASE_MAX_TARBALL_BYTES = PUBLIC_RELEASE_MAX_RESPONSE_BYTES;
const PUBLIC_RELEASE_MAX_PACK_ENTRIES = 256;
const PUBLIC_RELEASE_MAX_PACK_PATH_BYTES = 512;
const PUBLIC_RELEASE_COMMAND =
  "npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/";
const PUBLIC_RELEASE_LIFECYCLE_SCRIPTS = Object.freeze([
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepack",
  "postpack",
  "prepublish",
  "prepublishOnly",
  "publish",
  "postpublish",
]);

function publicReleaseHydrationError(role, message, code = "PUBLIC_RELEASE_HYDRATION_FAILED") {
  return new TaskArtifactError(code, `public release ${role}: ${message}`);
}

function boundedText(value, role) {
  const text = String(value ?? "");
  if (Buffer.byteLength(text, "utf8") > PUBLIC_RELEASE_MAX_RESPONSE_BYTES) {
    throw publicReleaseHydrationError(
      role,
      `response exceeds ${PUBLIC_RELEASE_MAX_RESPONSE_BYTES} bytes`,
      "PUBLIC_RELEASE_RESPONSE_BOUND_EXCEEDED",
    );
  }
  return text;
}

async function runPublicReleaseCommand({
  runner = defaultCommandRunner,
  command,
  args,
  cwd,
  role,
  allowFailure = false,
}) {
  let result;
  try {
    result = await runner({
      command,
      args: [...args],
      cwd: path.resolve(cwd),
      timeoutMs: COMMAND_TIMEOUT_MS,
      maxBuffer: PUBLIC_RELEASE_MAX_RESPONSE_BYTES,
    });
  } catch {
    throw publicReleaseHydrationError(
      role,
      "command runner failed; canonical evidence is unavailable",
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  }
  const normalized = {
    status: result?.status,
    signal: result?.signal,
    stdout: boundedText(result?.stdout, role),
    stderr: boundedText(result?.stderr, role),
    error: result?.error,
  };
  if (normalized.status !== 0 && !allowFailure) {
    throw publicReleaseHydrationError(
      role,
      `${failureKind(normalized)}; canonical evidence is unavailable`,
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  }
  return normalized;
}

function publicReleaseUrl(base, relativePath, sequence) {
  const target = new URL(relativePath, base);
  target.searchParams.set("kyw-public-read", String(sequence ?? 1));
  return target;
}

async function fetchPublicReleaseBytes({
  fetchImpl,
  url,
  role,
  allowNotFound = false,
}) {
  if (typeof fetchImpl !== "function") {
    throw publicReleaseHydrationError(
      role,
      "fetch is unavailable",
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  }
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetchImpl(url, {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(COMMAND_TIMEOUT_MS),
      headers: Object.freeze({
        accept: "application/json, application/octet-stream;q=0.9",
        "cache-control": "no-cache, no-store, max-age=0",
        pragma: "no-cache",
      }),
      });
      if (![408, 429, 500, 502, 503, 504].includes(response?.status) || attempt === 2) break;
      await response.body?.cancel?.();
    } catch (error) {
      if (attempt === 2 || !["TypeError", "TimeoutError", "AbortError"].includes(error?.name)) {
        throw publicReleaseHydrationError(
      role,
      "canonical read failed",
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
  }
  if (response?.status === 404 && allowNotFound) {
    return Object.freeze({ status: 404, bytes: undefined });
  }
  if (!response?.ok) {
    throw publicReleaseHydrationError(
      role,
      `canonical read returned status ${response?.status ?? "UNKNOWN"}`,
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  }
  const declaredLength = response.headers?.get?.("content-length");
  if (
    declaredLength !== null &&
    declaredLength !== undefined &&
    (!/^(?:0|[1-9]\d*)$/u.test(declaredLength) ||
      Number(declaredLength) > PUBLIC_RELEASE_MAX_RESPONSE_BYTES)
  ) {
    throw publicReleaseHydrationError(
      role,
      `response exceeds ${PUBLIC_RELEASE_MAX_RESPONSE_BYTES} bytes`,
      "PUBLIC_RELEASE_RESPONSE_BOUND_EXCEEDED",
    );
  }
  if (response.body === null || response.body === undefined) {
    return Object.freeze({ status: response.status, bytes: Buffer.alloc(0) });
  }
  if (typeof response.body.getReader !== "function") {
    throw publicReleaseHydrationError(
      role,
      "canonical response body cannot be read through the bounded stream boundary",
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  }
  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk?.done === true) break;
      if (!(chunk?.value instanceof Uint8Array)) {
        throw publicReleaseHydrationError(
          role,
          "canonical response returned a malformed body chunk",
          "PUBLIC_RELEASE_EXTERNAL_FAILURE",
        );
      }
      receivedBytes += chunk.value.byteLength;
      if (receivedBytes > PUBLIC_RELEASE_MAX_RESPONSE_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The bounded read has already failed closed; cancellation is best effort.
        }
        throw publicReleaseHydrationError(
          role,
          `response exceeds ${PUBLIC_RELEASE_MAX_RESPONSE_BYTES} bytes`,
          "PUBLIC_RELEASE_RESPONSE_BOUND_EXCEEDED",
        );
      }
      chunks.push(Buffer.from(chunk.value));
    }
  } catch (error) {
    if (error instanceof TaskArtifactError) throw error;
    throw publicReleaseHydrationError(
      role,
      "canonical response body read failed",
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  } finally {
    reader.releaseLock?.();
  }
  const buffer = Buffer.concat(chunks, receivedBytes);
  return Object.freeze({ status: response.status, bytes: buffer });
}

async function fetchPublicReleaseJson(options) {
  const response = await fetchPublicReleaseBytes(options);
  if (response.status === 404) return Object.freeze({ status: 404, value: null });
  let value;
  try {
    value = JSON.parse(response.bytes.toString("utf8"));
  } catch {
    throw publicReleaseHydrationError(
      options.role,
      "canonical endpoint returned malformed JSON",
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  }
  return Object.freeze({ status: response.status, value });
}

function parseJsonBlob(text, role) {
  try {
    const value = JSON.parse(text);
    if (!isRecord(value)) throw new TypeError("expected an object");
    return value;
  } catch {
    throw publicReleaseHydrationError(role, "repository JSON is malformed");
  }
}

async function readCommitFile(commandCache, repositoryRoot, revision, relativePath, role) {
  const result = await commandCache.run({
    command: "git",
    args: ["show", `${revision}:${relativePath}`],
    cwd: repositoryRoot,
    role,
    maxBuffer: PUBLIC_RELEASE_MAX_RESPONSE_BYTES,
  });
  return boundedText(result.stdout, role);
}

function normalizedPackageRepository(value) {
  return typeof value === "string" ? value : value?.url;
}

function stableVersionParts(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.exec(value);
  return match ? match.slice(1).map(Number) : undefined;
}

function compareStableVersions(left, right) {
  const leftParts = stableVersionParts(left);
  const rightParts = stableVersionParts(right);
  if (!leftParts || !rightParts) return String(left).localeCompare(String(right));
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function decodeCanonicalBase64(value) {
  if (
    typeof value !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      value,
    )
  ) {
    return undefined;
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length < 1 || bytes.toString("base64") !== value) return undefined;
  return bytes;
}

function parseRegistrySigningPublicKey(value) {
  const bytes = decodeCanonicalBase64(value);
  if (!bytes) return undefined;
  try {
    const publicKey = createPublicKey({ key: bytes, format: "der", type: "spki" });
    verifySignature("sha256", Buffer.alloc(0), publicKey, Buffer.alloc(0));
    return publicKey;
  } catch {
    return undefined;
  }
}

function selectCurrentRegistrySigningKey(
  rawKeys,
  expectedKeyId,
  {
    validAt = Date.now(),
  } = {},
) {
  if (!Array.isArray(rawKeys?.keys)) {
    throw publicReleaseHydrationError("REGISTRY_KEYS", "signing-key response is malformed");
  }
  if (
    rawKeys.keys.some(
      (key) =>
        !isRecord(key) ||
        typeof key.keyid !== "string" ||
        !key.keyid ||
        /\s/u.test(key.keyid) ||
        Buffer.byteLength(key.keyid, "utf8") > 256 ||
        parseRegistrySigningPublicKey(key.key) === undefined ||
        !(
          key.expires === null ||
          (typeof key.expires === "string" &&
            Number.isFinite(Date.parse(key.expires)))
        ),
    )
  ) {
    throw publicReleaseHydrationError(
      "REGISTRY_KEYS",
      "signing-key response contains an unreadable key record",
    );
  }
  if (new Set(rawKeys.keys.map((key) => key.keyid)).size !== rawKeys.keys.length) {
    throw publicReleaseHydrationError("REGISTRY_KEYS", "duplicate signing key identity");
  }
  const allActive = rawKeys.keys.filter(
    (key) => key.expires === null || Date.parse(key.expires) > validAt,
  );
  const active =
    expectedKeyId === undefined
      ? allActive
      : allActive.filter((key) => key.keyid === expectedKeyId);
  if (active.length === 0 || (expectedKeyId !== undefined && active.length !== 1)) {
    throw publicReleaseHydrationError(
      "REGISTRY_KEYS",
      expectedKeyId === undefined
        ? "the canonical registry does not expose a current signing key"
        : "the frozen signing key does not map to exactly one active canonical registry key",
    );
  }
  return [...active].sort((left, right) => left.keyid.localeCompare(right.keyid))[0];
}

function verifyRegistrySignatures({ signatures, keys, name, version, integrity, validAt, requiredKeyId }) {
  if (!Array.isArray(signatures) || signatures.length === 0) return false;
  if (requiredKeyId && !signatures.some((signature) => signature?.keyid === requiredKeyId)) return false;
  return signatures.every((signature) => {
    try {
      const key = selectCurrentRegistrySigningKey(keys, signature?.keyid, { validAt });
      return verifyRegistrySignature({ name, version, integrity, signature, key });
    } catch {
      return false;
    }
  });
}

function assertPublicReleaseSourceContract({
  packageJson,
  pluginJson,
  workflowText,
  repository,
}) {
  const publishConfig = packageJson.publishConfig;
  const publishConfigKeys = isRecord(publishConfig)
    ? Object.keys(publishConfig).sort()
    : [];
  const publishConfigPrototype = isRecord(publishConfig)
    ? Object.getPrototypeOf(publishConfig)
    : undefined;
  if (
    packageJson.name !== pluginJson.name ||
    packageJson.version !== pluginJson.version ||
    !stableVersionParts(packageJson.version)
  ) {
    throw publicReleaseHydrationError(
      "SOURCE_IDENTITY",
      "package and plugin name/version are not one stable exact identity",
    );
  }
  if (
    parseRepositorySlug(normalizedPackageRepository(packageJson.repository)) !==
      repository ||
    !isRecord(publishConfig) ||
    (publishConfigPrototype !== Object.prototype &&
      publishConfigPrototype !== null) ||
    publishConfigKeys.length !== 2 ||
    publishConfigKeys[0] !== "access" ||
    publishConfigKeys[1] !== "registry" ||
    publishConfig.access !== "public" ||
    publishConfig.registry !== PUBLIC_REGISTRY ||
    packageJson.private !== false
  ) {
    throw publicReleaseHydrationError(
      "SOURCE_IDENTITY",
      "package repository/access/registry identity is not the expected public tuple",
    );
  }
  if (
    [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "bundledDependencies",
      "bundleDependencies",
      "peerDependencies",
      "peerDependenciesMeta",
    ].some((name) => Object.hasOwn(packageJson, name)) ||
    PUBLIC_RELEASE_LIFECYCLE_SCRIPTS.some((name) =>
      Object.hasOwn(packageJson.scripts ?? {}, name),
    )
  ) {
    throw publicReleaseHydrationError(
      "SOURCE_IDENTITY",
      "package dependencies or lifecycle scripts violate the public-release contract",
    );
  }
  const requiredWorkflowFragments = [
    `name: ${PUBLIC_RELEASE_WORKFLOW_NAME}`, "  workflow_dispatch:",
    "      expected_sha:", "      expected_version:", "permissions: {}",
    "  cancel-in-progress: false", "    environment: npm-production",
    "      actions: read", "      contents: read", "      id-token: write",
    "          persist-credentials: false", "          ref: ${{ inputs.expected_sha }}",
    "      - name: Publish the exact checkout directory through OIDC",
    "run: node ./scripts/publish-gate.mjs",
  ];
  const triggerBlock = /^on:\s*\r?\n([\s\S]*?)(?=^[^\s#])/mu.exec(workflowText)?.[1];
  const triggerKeys = triggerBlock
    ? [...triggerBlock.matchAll(/^  ([a-zA-Z0-9_-]+):/gmu)].map(
        (match) => match[1],
      )
    : [];
  const uses = [...workflowText.matchAll(/^\s*uses:\s*(\S+)\s*(?:#.*)?$/gmu)].map(
    (match) => match[1],
  );
  const exactPinnedUses =
    uses.length === 2 &&
    /^actions\/checkout@[0-9a-f]{40}$/u.test(uses[0]) &&
    /^actions\/setup-node@[0-9a-f]{40}$/u.test(uses[1]);
  const publishCommands = workflowText.match(/\bnpm\s+publish\b/gu) ?? [];
  const stepBlocks = workflowText.replaceAll("\r\n", "\n").split(/^      - name: /mu).slice(1);
  const publisherBlock = stepBlocks.at(-1) ?? "";
  const gateBlock = stepBlocks.at(-2) ?? "";
  const gateCommand = "        run: node ./scripts/publish-gate.mjs";
  // Keep the historical combined boundary readable for already fixed targets.
  // Its failed step is never reinterpreted as proof that npm was not called.
  const combinedBoundary = publishCommands.length === 0 &&
    publisherBlock.startsWith(`${PUBLIC_RELEASE_PUBLISH_STEP}\n`) &&
    publisherBlock.split("\n").includes(gateCommand) && !/^\s+if:/mu.test(publisherBlock);
  const splitBoundary = publishCommands.length === 1 &&
    gateBlock.startsWith("Require latest canonical CI before publication\n") &&
    gateBlock.split("\n").includes(gateCommand) && !/^\s+if:/mu.test(gateBlock) &&
    publisherBlock.trimEnd() === `${PUBLIC_RELEASE_PUBLISH_STEP}\n        run: ${PUBLIC_RELEASE_COMMAND}`;
  const forbiddenWorkflowPatterns = [
    /\b(?:npm\s+(?:login|adduser)|NODE_AUTH_TOKEN|NPM_TOKEN|_authToken|always-auth)\b/iu,
    /\bsecrets\.[A-Za-z0-9_]+\b/u,
    /\bgh\s+run\s+rerun\b/iu,
    /\/rerun\b/iu,
    /^\s*continue-on-error\s*:/mu,
    /^\s*strategy\s*:/mu,
    /\b(?:curl|wget)\b[^\r\n]*(?:npmjs|registry)/iu,
  ];
  if (
    requiredWorkflowFragments.some((fragment) => !workflowText.includes(fragment)) ||
    workflowText.split("run: node ./scripts/publish-gate.mjs").length !== 2 ||
    triggerKeys.length !== 1 ||
    triggerKeys[0] !== "workflow_dispatch" ||
    !exactPinnedUses ||
    !(combinedBoundary || splitBoundary) ||
    forbiddenWorkflowPatterns.some((pattern) => pattern.test(workflowText))
  ) {
    throw publicReleaseHydrationError(
      "PUBLISH_WORKFLOW",
      "repository publication workflow does not retain the exact manual one-publish contract",
    );
  }
}

function safePackagePaths(packageJson) {
  const candidates = ["package.json", ...(packageJson.files ?? [])];
  if (
    !Array.isArray(packageJson.files) ||
    candidates.some(
      (value) =>
        typeof value !== "string" ||
        !value ||
        path.posix.isAbsolute(value) ||
        value.includes("\\") ||
        value.split("/").includes(".."),
    )
  ) {
    throw publicReleaseHydrationError(
      "PACK_INPUT",
      "package files allowlist is missing or contains an unsafe path",
    );
  }
  return Object.freeze([...new Set(candidates)]);
}

function normalizedPackEntries(report) {
  if (
    !Array.isArray(report?.files) ||
    report.files.length < 1 ||
    report.files.length > PUBLIC_RELEASE_MAX_PACK_ENTRIES
  ) {
    throw publicReleaseHydrationError(
      "PACK",
      "npm pack entry report is missing or exceeds the bounded entry count",
    );
  }
  const entries = report.files.map((file) => file?.path);
  if (
    entries.some(
      (entry) =>
        typeof entry !== "string" ||
        !entry ||
        Buffer.byteLength(entry, "utf8") > PUBLIC_RELEASE_MAX_PACK_PATH_BYTES ||
        path.posix.isAbsolute(entry) ||
        entry.includes("\\") ||
        entry
          .split("/")
          .some((segment) => !segment || segment === "." || segment === ".."),
    ) ||
    new Set(entries).size !== entries.length
  ) {
    throw publicReleaseHydrationError(
      "PACK",
      "npm pack entry report contains an unsafe or duplicate path",
    );
  }
  return Object.freeze(entries.sort());
}

async function createExactPublicReleaseTarball({
  commandCache,
  commandRunner,
  repositoryRoot,
  mergeSha,
  packageJson,
}) {
  safePackagePaths(packageJson);
  const npmrc = await commandCache.run({
    command: "git",
    args: ["cat-file", "-e", `${mergeSha}:.npmrc`],
    cwd: repositoryRoot,
    role: "PACK_INPUT",
    allowFailure: true,
  });
  if (npmrc.status === 0) {
    throw publicReleaseHydrationError(
      "PACK_INPUT",
      "the exact delivered merge contains .npmrc",
    );
  }

  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "kyw-public-release-pack-"));
  try {
    const sourceRoot = path.join(temporaryRoot, "source");
    const packRoot = path.join(temporaryRoot, "pack");
    const archivePath = path.join(temporaryRoot, "source.tar");
    await Promise.all([mkdir(sourceRoot), mkdir(packRoot)]);
    await runPublicReleaseCommand({
      runner: commandRunner,
      command: "git",
      args: ["archive", "--format=tar", `--output=${archivePath}`, mergeSha],
      cwd: repositoryRoot,
      role: "PACK_ARCHIVE",
    });
    await runPublicReleaseCommand({
      runner: commandRunner,
      command: "tar",
      args: ["-xf", archivePath, "-C", sourceRoot],
      cwd: repositoryRoot,
      role: "PACK_ARCHIVE",
    });
    const npmPackArgs = [
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      packRoot,
    ];
    const result = await runPublicReleaseCommand({
      runner: commandRunner,
      command: process.platform === "win32" ? process.execPath : "npm",
      args:
        process.platform === "win32"
          ? [
              path.join(
                path.dirname(process.execPath),
                "node_modules",
                "npm",
                "bin",
                "npm-cli.js",
              ),
              ...npmPackArgs,
            ]
          : npmPackArgs,
      cwd: sourceRoot,
      role: "PACK",
    });
    let report;
    try {
      const parsed = JSON.parse(result.stdout);
      if (!Array.isArray(parsed) || parsed.length !== 1 || !isRecord(parsed[0])) {
        throw new TypeError("unexpected report");
      }
      report = parsed[0];
    } catch {
      throw publicReleaseHydrationError("PACK", "npm pack returned malformed JSON");
    }
    if (
      typeof report.filename !== "string" ||
      !report.filename ||
      report.filename === "." ||
      report.filename === ".." ||
      path.basename(report.filename) !== report.filename
    ) {
      throw publicReleaseHydrationError("PACK", "npm pack returned an unsafe filename");
    }
    const packedArchivePath = path.join(packRoot, report.filename);
    const packedArchiveState = await lstat(packedArchivePath);
    if (
      packedArchiveState.isSymbolicLink() ||
      !packedArchiveState.isFile() ||
      packedArchiveState.size < 1 ||
      packedArchiveState.size > PUBLIC_RELEASE_MAX_TARBALL_BYTES
    ) {
      throw publicReleaseHydrationError(
        "PACK",
        `generated archive must be a regular file between 1 and ${PUBLIC_RELEASE_MAX_TARBALL_BYTES} bytes`,
      );
    }
    const archive = await readFile(packedArchivePath);
    const entries = normalizedPackEntries(report);
    const integrity = `sha512-${createHash("sha512").update(archive).digest("base64")}`;
    const shasum = createHash("sha1").update(archive).digest("hex");
    if (
      archive.length < 1 ||
      report.size !== archive.length ||
      report.integrity !== integrity ||
      report.shasum !== shasum ||
      report.name !== packageJson.name ||
      report.version !== packageJson.version
    ) {
      throw publicReleaseHydrationError(
        "PACK",
        "npm pack report does not match the exact generated archive",
      );
    }
    return Object.freeze({
      identity: Object.freeze({
        bytes: archive.length,
        integrity,
        shasum,
        sha256: createHash("sha256").update(archive).digest("hex"),
        entries,
      }),
      archiveBytes: archive,
      entries,
    });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function githubEndpointSegment(value) {
  return encodeURIComponent(value).replaceAll("%2F", "/");
}

function isGitHubNotFound(result) {
  return (
    result?.status !== 0 &&
    /(?:HTTP\s+404|status\s+404|not found)/iu.test(String(result.stderr ?? ""))
  );
}

async function parseGitHubJsonCommand({
  runner,
  repositoryRoot,
  args,
  role,
  allowNotFound = false,
}) {
  const isRead = args[0] === "api" && args[args.indexOf("--method") + 1] === "GET";
  let result;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    result = await runPublicReleaseCommand({
      runner, command: "gh", args, cwd: repositoryRoot, role, allowFailure: true,
    });
    if (!isRead || result.status === 0 || attempt === 2 ||
      !/(?:HTTP|status)\s+(?:408|429|500|502|503|504)\b/iu.test(result.stderr)) break;
    await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
  }
  if (allowNotFound && isGitHubNotFound(result)) return null;
  if (result.status !== 0) {
    throw publicReleaseHydrationError(
      role,
      `${failureKind(result)}; canonical GitHub evidence is unavailable`,
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  }
  if (!result.stdout.trim()) return Object.freeze({});
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw publicReleaseHydrationError(
      role,
      "GitHub returned malformed JSON",
      "PUBLIC_RELEASE_EXTERNAL_FAILURE",
    );
  }
}

function publishEvidenceFromLog(log) {
  const dispatchMatches = [
    ...log.matchAll(
      /KYWPUBLISHEVIDENCE schema=1 stage=dispatch repository=(\S+) event=(\S+) ref=(\S+) expected_sha=([0-9a-f]{40}) expected_version=(\S+) expected_tarball_bytes=(\d+) expected_tarball_sha256=([0-9a-f]{64}) expected_tarball_shasum=([0-9a-f]{40}) expected_tarball_integrity=(sha512-\S+) expected_packed_entries_sha256=([0-9a-f]{64}) expected_prior_versions_sha256=([0-9a-f]{64}) expected_prior_latest=(\S+) expected_signing_key_id=(\S+)(?: expected_signing_key_ids=(\S+))?/gu,
    ),
  ];
  const sourceMatches = [
    ...log.matchAll(
      /KYWPUBLISHEVIDENCE schema=1 stage=source expected_sha=([0-9a-f]{40}) actual_sha=([0-9a-f]{40}) package=(\S+) version=(\S+)/gu,
    ),
  ];
  const dispatch = dispatchMatches.length === 1 ? dispatchMatches[0] : undefined;
  const source = sourceMatches.length === 1 ? sourceMatches[0] : undefined;
  return Object.freeze({
    inputs: dispatch
      ? Object.freeze({
          expectedSha: dispatch[4],
          expectedVersion: dispatch[5],
          expectedTarballBytes: dispatch[6],
          expectedTarballSha256: dispatch[7],
          expectedTarballShasum: dispatch[8],
          expectedTarballIntegrity: dispatch[9],
          expectedPackedEntriesSha256: dispatch[10],
          expectedPriorVersionsSha256: dispatch[11],
          expectedPriorLatest: dispatch[12],
          expectedSigningKeyId: dispatch[13],
          ...(dispatch[14] === undefined ? {} : { expectedSigningKeyIds: dispatch[14] }),
        })
      : undefined,
    checkoutSha: source?.[2],
  });
}

function normalizeGitHubWorkflow(raw, expectedPath) {
  return Object.freeze({
    id: positiveInteger(raw?.id) ? raw.id : undefined,
    name: raw?.name,
    path: raw?.path,
    state: raw?.state,
    expectedPath,
  });
}

function normalizeTagObject(tuple, rawRef, peeled) {
  const objectType = rawRef?.object?.type;
  return Object.freeze({
    repository: tuple.repository,
    ref: rawRef?.ref,
    objectType,
    ...(objectType === "commit" ? { targetSha: rawRef?.object?.sha } : {}),
    ...(objectType === "tag"
      ? {
          peelComplete:
            peeled === undefined ? undefined : peeled?.type === "commit",
          peeledSha: peeled?.type === "commit" ? peeled.sha : undefined,
        }
      : {}),
  });
}

async function peelGitHubTag({
  tuple,
  rawRef,
  githubGet,
  context,
}) {
  const object = rawRef?.object;
  if (object?.type !== "tag") return object;
  if (!SHA_PATTERN.test(object.sha ?? "")) return undefined;
  const tagObject = await githubGet(
    `repos/${tuple.repository}/git/tags/${object.sha}`,
    "TAG_PEEL",
    { context },
  );
  if (
    !isRecord(tagObject) ||
    !SHA_PATTERN.test(tagObject.sha ?? "") ||
    typeof tagObject.tag !== "string" ||
    !isRecord(tagObject.object) ||
    typeof tagObject.object.type !== "string" ||
    !SHA_PATTERN.test(tagObject.object.sha ?? "")
  ) {
    return undefined;
  }
  if (
    tagObject.sha !== object.sha ||
    tagObject.tag !== tuple.tag.name ||
    tagObject.object.type !== "commit"
  ) {
    return Object.freeze({ conflict: true });
  }
  return tagObject.object;
}

function normalizedReleaseBody(release) {
  return Object.hasOwn(release, "body") ? (release.body ?? "") : undefined;
}

function normalizedReleaseAssets(release) {
  return Object.hasOwn(release, "assets") && Array.isArray(release.assets)
    ? Object.freeze([...release.assets])
    : release.assets;
}

function releaseEndpointIdentity(release) {
  if (!isRecord(release)) return undefined;
  const assets = normalizedReleaseAssets(release);
  return JSON.stringify({
    id: release.id,
    tagName: release.tag_name,
    title: release.name,
    body: normalizedReleaseBody(release),
    draft: release.draft,
    prerelease: release.prerelease,
    assets: Array.isArray(assets) ? assets : { unreadable: true },
  });
}

function packageUrlPath(name, suffix = "") {
  return `${encodeURIComponent(name)}${suffix}`;
}

function registryRepository(metadata) {
  return normalizedPackageRepository(metadata?.repository);
}

function registryImmutableVersionIdentity(metadata) {
  if (
    !isRecord(metadata) ||
    !isRecord(metadata.dist) ||
    !Array.isArray(metadata.dist.signatures)
  ) {
    return undefined;
  }
  const signatures = metadata.dist.signatures.map((signature) => ({
    keyid: signature?.keyid,
    sig: signature?.sig,
  }));
  if (
    signatures.some(
      (signature) =>
        typeof signature.keyid !== "string" || typeof signature.sig !== "string",
    )
  ) {
    return undefined;
  }
  return JSON.stringify({
    name: metadata.name,
    version: metadata.version,
    repository: registryRepository(metadata),
    gitHead: metadata.gitHead,
    dist: {
      tarball: metadata.dist.tarball,
      integrity: metadata.dist.integrity,
      shasum: metadata.dist.shasum,
      signatures,
    },
  });
}

function parseGitHubWorkflowInvocationId(value, repository) {
  try {
    const target = new URL(value);
    const [owner, name] = repository.split("/");
    const segments = target.pathname.split("/").filter(Boolean);
    if (
      target.protocol !== "https:" ||
      target.hostname !== "github.com" ||
      target.port ||
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      segments.length !== 7 ||
      segments[0] !== owner ||
      segments[1] !== name ||
      segments[2] !== "actions" ||
      segments[3] !== "runs" ||
      segments[5] !== "attempts" ||
      !/^[1-9]\d*$/u.test(segments[4]) ||
      !/^[1-9]\d*$/u.test(segments[6])
    ) {
      return undefined;
    }
    const runId = Number(segments[4]);
    const runAttempt = Number(segments[6]);
    return Number.isSafeInteger(runId) && Number.isSafeInteger(runAttempt)
      ? Object.freeze({ runId, runAttempt })
      : undefined;
  } catch {
    return undefined;
  }
}

function verifyRegistrySignature({ name, version, integrity, signature, key }) {
  if (
    !isRecord(signature) ||
    signature.keyid !== key?.keyid ||
    typeof signature.sig !== "string" ||
    typeof key?.key !== "string"
  ) {
    return false;
  }
  try {
    const publicKey = parseRegistrySigningPublicKey(key.key);
    const signatureBytes = decodeCanonicalBase64(signature.sig);
    if (!publicKey || !signatureBytes) return false;
    return verifySignature(
      "sha256",
      Buffer.from(`${name}@${version}:${integrity}`, "utf8"),
      publicKey,
      signatureBytes,
    );
  } catch {
    return false;
  }
}

async function defaultProvenanceVerifier(
  bundle,
  tuple,
  { moduleLoader = requireFromRuntime } = {},
) {
  const executableRoot = path.dirname(process.execPath);
  const npmRoots = [
    path.join(executableRoot, "node_modules", "npm"),
    path.resolve(executableRoot, "..", "lib", "node_modules", "npm"),
    path.resolve(executableRoot, "..", "node_modules", "npm"),
  ];
  let sigstore;
  for (const npmRoot of new Set(npmRoots)) {
    try {
      sigstore = moduleLoader(path.join(npmRoot, "node_modules", "sigstore"));
      break;
    } catch {
      // Try the next bounded runtime-owned npm installation layout.
    }
  }
  if (typeof sigstore?.verify !== "function") {
    throw publicReleaseHydrationError(
      "PROVENANCE_VERIFIER",
      "the runtime-owned npm Sigstore verifier is unavailable",
      "PUBLIC_RELEASE_PROVENANCE_VERIFIER_UNAVAILABLE",
    );
  }
  try {
    await sigstore.verify(bundle, {
      certificateIssuer: "https://token.actions.githubusercontent.com",
      certificateIdentityURI: `https://github.com/${tuple.repository}/${tuple.publishWorkflow.path}@${tuple.publishWorkflow.ref}`,
      retry: { retries: 0 },
      timeout: 5_000,
    });
    return true;
  } catch (error) {
    if (
      [sigstore.ValidationError, sigstore.VerificationError, sigstore.PolicyError]
        .filter((ErrorType) => typeof ErrorType === "function")
        .some((ErrorType) => error instanceof ErrorType)
    ) {
      return false;
    }
    throw publicReleaseHydrationError(
      "PROVENANCE_VERIFIER",
      "the runtime-owned npm Sigstore trust material is unavailable",
      "PUBLIC_RELEASE_PROVENANCE_VERIFIER_UNAVAILABLE",
    );
  }
}

async function parseSlsaProvenance({
  tuple,
  attestations,
  tarballSha512,
  tarballSha256,
  provenanceVerifier,
}) {
  const matches = [];
  let verificationUnavailable = false;
  let malformedRelevant = !Array.isArray(attestations?.attestations);
  let conflictingRelevant = false;
  const candidates = Array.isArray(attestations?.attestations)
    ? attestations.attestations
    : [];
  for (const attestation of candidates) {
    if (!isRecord(attestation) || typeof attestation.predicateType !== "string") {
      malformedRelevant = true;
      continue;
    }
    if (attestation.predicateType !== "https://slsa.dev/provenance/v1") continue;
    try {
      const envelope = attestation.bundle?.dsseEnvelope;
      const verificationMaterial = attestation.bundle?.verificationMaterial;
      const payloadBytes = decodeCanonicalBase64(envelope?.payload);
      if (
        !isRecord(attestation) ||
        !isRecord(attestation.bundle) ||
        !isRecord(envelope) ||
        payloadBytes === undefined ||
        typeof envelope.payloadType !== "string" ||
        !Array.isArray(envelope.signatures) ||
        envelope.signatures.length < 1 ||
        envelope.signatures.some(
          (signature) =>
            !isRecord(signature) ||
            decodeCanonicalBase64(signature.sig) === undefined,
        ) ||
        !isRecord(verificationMaterial) ||
        (!Array.isArray(verificationMaterial.tlogEntries) &&
          !isRecord(verificationMaterial.certificate))
      ) {
        malformedRelevant = true;
        continue;
      }
      const statement = JSON.parse(
        payloadBytes.toString("utf8"),
      );
      if (
        !isRecord(statement) ||
        !isRecord(statement.predicate) ||
        !Array.isArray(statement.subject) ||
        !Array.isArray(
          statement.predicate?.buildDefinition?.resolvedDependencies,
        )
      ) {
        malformedRelevant = true;
        continue;
      }
      const workflow =
        statement?.predicate?.buildDefinition?.externalParameters?.workflow;
      const buildDefinition = statement?.predicate?.buildDefinition;
      const runDetails = statement?.predicate?.runDetails;
      const invocation = parseGitHubWorkflowInvocationId(
        runDetails?.metadata?.invocationId,
        tuple.repository,
      );
      const dependencies =
        statement.predicate.buildDefinition.resolvedDependencies;
      const expectedSubjects = statement.subject.filter(
        (candidate) => candidate?.name === `pkg:npm/${tuple.package.name}@${tuple.package.version}`,
      );
      const subject = expectedSubjects.length === 1 ? expectedSubjects[0] : undefined;
      const source = dependencies.find(
        (candidate) => candidate?.digest?.gitCommit === tuple.target.mergeSha,
      );
      const identityMatches =
        envelope.payloadType === "application/vnd.in-toto+json" &&
        statement._type === "https://in-toto.io/Statement/v1" &&
        statement.predicateType === "https://slsa.dev/provenance/v1" &&
        expectedSubjects.length === 1 &&
        buildDefinition?.buildType ===
          "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1" &&
        buildDefinition?.internalParameters?.github?.event_name ===
          "workflow_dispatch" &&
        runDetails?.builder?.id ===
          "https://github.com/actions/runner/github-hosted" &&
        invocation &&
        invocation.runAttempt >= 1 && invocation.runAttempt <= 10 &&
        subject?.digest?.sha512 === tarballSha512 &&
        parseRepositorySlug(workflow?.repository) === tuple.repository &&
        workflow?.path === tuple.publishWorkflow.path &&
        workflow?.ref === tuple.publishWorkflow.ref &&
        source;
      if (!identityMatches) {
        conflictingRelevant = true;
        continue;
      }
      let cryptographicallyVerified;
      try {
        cryptographicallyVerified = await provenanceVerifier(
          attestation.bundle,
          tuple,
        );
      } catch {
        verificationUnavailable = true;
        continue;
      }
      if (cryptographicallyVerified === true) {
        matches.push({
          source,
          runId: invocation.runId,
          runAttempt: invocation.runAttempt,
        });
      } else {
        conflictingRelevant = true;
      }
    } catch {
      malformedRelevant = true;
    }
  }
  return Object.freeze({
    verified:
      malformedRelevant || verificationUnavailable
        ? undefined
        : matches.length === 1 && !conflictingRelevant
        ? true
        : false,
    sourceRepository: tuple.repository,
    workflowPath: tuple.publishWorkflow.path,
    workflowRef: tuple.publishWorkflow.ref,
    sourceCommit: tuple.target.mergeSha,
    subjectSha256: tarballSha256,
    ...(matches.length === 1
      ? { runId: matches[0].runId, runAttempt: matches[0].runAttempt }
      : {}),
  });
}

async function assertPublicReleaseWorktreeArtifacts(
  repositoryRoot,
  artifacts,
) {
  for (const artifact of artifacts) {
    const absolutePath = path.resolve(repositoryRoot, artifact.relativePath);
    let state;
    try {
      state = await lstat(absolutePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw publicReleaseHydrationError(
          "REPOSITORY_GUARD",
          "guarded repository filesystem state is unreadable",
        );
      }
    }
    if (!artifact.present) {
      if (state !== undefined) {
        throw publicReleaseHydrationError(
          "REPOSITORY_GUARD",
          "an absent guarded repository artifact is shadowed in the worktree",
        );
      }
      continue;
    }
    if (
      !state ||
      state.isSymbolicLink() ||
      !state.isFile() ||
      state.size > PUBLIC_RELEASE_MAX_RESPONSE_BYTES
    ) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "guarded repository artifact type or size changed",
      );
    }
    let bytes;
    try {
      bytes = await readFile(absolutePath);
    } catch {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "guarded repository artifact bytes are unreadable",
      );
    }
    if (!bytes.equals(artifact.bytes)) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "guarded repository artifact bytes changed",
      );
    }
  }
}

async function freezePublicReleaseRepositoryState({
  commandCache,
  repositoryRoot,
  repository,
  taskId,
  mergeSha,
  currentMainSha,
}) {
  const taskPaths = await gitText(
    commandCache,
    repositoryRoot,
    ["ls-tree", "-r", "--name-only", mergeSha, "--", "docs/tasks"],
    { taskId, role: "PUBLIC_RELEASE_REPOSITORY_GUARD" },
  );
  const pairs = new Map();
  for (const relativePath of taskPaths.split(/\r?\n/u).filter(Boolean)) {
    const matched = taskPairPathMatch(taskId, relativePath);
    if (!matched) continue;
    const pair = pairs.get(matched.directory) ?? {};
    pair[matched.kind === "TASK" ? "taskPath" : "testPath"] =
      matched.relativePath;
    pairs.set(matched.directory, pair);
  }
  const completePairs = [...pairs.values()].filter(
    (pair) => pair.taskPath && pair.testPath,
  );
  if (completePairs.length !== 1) {
    throw publicReleaseHydrationError(
      "REPOSITORY_GUARD",
      "the exact delivered tree does not contain one canonical selected Task/Test pair",
    );
  }
  const pair = completePairs[0];
  const pairPaths = [pair.taskPath, pair.testPath];
  const guardedPaths = [...pairPaths, STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH];
  const [targetEntries, currentEntries, indexEntries, taskText, testText] =
    await Promise.all([
      readTerminalArtifactGitEntries({
        cache: commandCache,
        repositoryRoot,
        source: "tree",
        revision: mergeSha,
        relativePaths: pairPaths,
        taskId,
        role: "PUBLIC_RELEASE_REPOSITORY_GUARD",
      }),
      readTerminalArtifactGitEntries({
        cache: commandCache,
        repositoryRoot,
        source: "tree",
        revision: currentMainSha,
        relativePaths: guardedPaths,
        taskId,
        role: "PUBLIC_RELEASE_REPOSITORY_GUARD",
      }),
      readTerminalArtifactGitEntries({
        cache: commandCache,
        repositoryRoot,
        source: "index",
        relativePaths: guardedPaths,
        taskId,
        role: "PUBLIC_RELEASE_REPOSITORY_GUARD",
      }),
      showGitFile(commandCache, repositoryRoot, mergeSha, pair.taskPath, taskId),
      showGitFile(commandCache, repositoryRoot, mergeSha, pair.testPath, taskId),
    ]);
  if (!targetEntries || !currentEntries || !indexEntries) {
    throw publicReleaseHydrationError(
      "REPOSITORY_GUARD",
      "guarded repository Git entries are malformed or ambiguous",
    );
  }
  if (
    taskText === undefined ||
    testText === undefined ||
    !isImmutableTerminalTaskContractVersion(getTaskContractVersion(taskText)) ||
    getTaskContractVersion(testText) !== getTaskContractVersion(taskText) ||
    sectionStatus(taskText) !== "DONE" ||
    sectionStatus(testText) !== "PASSED"
  ) {
    throw publicReleaseHydrationError(
      "REPOSITORY_GUARD",
      "the exact selected Task/Test pair is not immutable DONE/PASSED truth",
    );
  }
  const artifacts = [];
  for (const relativePath of guardedPaths) {
    const targetEntry = targetEntries.get(relativePath);
    const currentEntry = currentEntries.get(relativePath);
    const indexEntry = indexEntries.get(relativePath);
    const pairArtifact = pairPaths.includes(relativePath);
    if (
      pairArtifact &&
      (!terminalArtifactGitEntryIsRegular(targetEntry, { source: "tree" }) ||
        !terminalArtifactGitEntryIsRegular(currentEntry, { source: "tree" }) ||
        targetEntry.mode !== currentEntry.mode ||
        targetEntry.objectSha !== currentEntry.objectSha)
    ) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "current main does not preserve the exact selected terminal pair",
      );
    }
    if (
      currentEntry !== undefined &&
      !terminalArtifactGitEntryIsRegular(currentEntry, { source: "tree" })
    ) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "guarded repository artifact is not a regular Git file",
      );
    }
    if (
      (currentEntry === undefined) !== (indexEntry === undefined) ||
      (currentEntry !== undefined &&
        (!terminalArtifactGitEntryIsRegular(indexEntry, { source: "index" }) ||
          currentEntry.mode !== indexEntry.mode ||
          currentEntry.objectSha !== indexEntry.objectSha))
    ) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "the index does not preserve guarded repository identity",
      );
    }
    const text =
      currentEntry === undefined
        ? undefined
        : await showGitFile(
            commandCache,
            repositoryRoot,
            currentMainSha,
            relativePath,
            taskId,
          );
    if (currentEntry !== undefined && text === undefined) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "guarded repository bytes are unavailable from current main",
      );
    }
    artifacts.push({
      relativePath,
      present: currentEntry !== undefined,
      mode: currentEntry?.mode,
      blobSha: currentEntry?.objectSha,
      bytes: Buffer.from(text ?? "", "utf8"),
    });
  }
  await assertPublicReleaseWorktreeArtifacts(repositoryRoot, artifacts);
  return {
    taskId,
    repositoryRoot,
    repository,
    targetMergeSha: mergeSha,
    artifacts,
  };
}

function decodeGitHubContents(raw, artifact) {
  if (raw === null) return undefined;
  if (
    !isRecord(raw) ||
    raw.type !== "file" ||
    raw.encoding !== "base64" ||
    typeof raw.content !== "string" ||
    raw.sha !== artifact.blobSha ||
    !Number.isSafeInteger(raw.size) ||
    raw.size < 0
  ) {
    throw publicReleaseHydrationError(
      "REPOSITORY_GUARD",
      "GitHub returned malformed guarded repository content",
    );
  }
  const encoded = raw.content.replaceAll(/\s/gu, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) {
    throw publicReleaseHydrationError(
      "REPOSITORY_GUARD",
      "GitHub returned malformed guarded repository encoding",
    );
  }
  const bytes = Buffer.from(encoded, "base64");
  if (
    bytes.length !== raw.size ||
    bytes.toString("base64") !== encoded ||
    !bytes.equals(artifact.bytes)
  ) {
    throw publicReleaseHydrationError(
      "REPOSITORY_GUARD",
      "GitHub guarded repository bytes changed",
    );
  }
  return bytes;
}

function assertGitHubRemoteTreeIdentity(raw, artifacts, expectedTreeSha) {
  if (
    !isRecord(raw) ||
    raw.sha !== expectedTreeSha ||
    raw.truncated !== false ||
    !Array.isArray(raw.tree)
  ) {
    throw publicReleaseHydrationError(
      "REPOSITORY_GUARD",
      "GitHub returned an incomplete guarded repository tree",
    );
  }
  for (const artifact of artifacts) {
    const entries = raw.tree.filter(
      (entry) => isRecord(entry) && entry.path === artifact.relativePath,
    );
    if (!artifact.present) {
      if (entries.length !== 0) {
        throw publicReleaseHydrationError(
          "REPOSITORY_GUARD",
          "an absent guarded repository artifact appeared in the remote tree",
        );
      }
      continue;
    }
    if (
      entries.length !== 1 ||
      entries[0].type !== "blob" ||
      entries[0].mode !== artifact.mode ||
      entries[0].sha !== artifact.blobSha
    ) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "GitHub guarded repository mode or blob identity changed",
      );
    }
  }
}

export function createPublicReleaseClients({
  repositoryRoot,
  commandRunner = defaultCommandRunner,
  fetchImpl = globalThis.fetch,
  expectedTarball,
  provenanceVerifier,
  provenanceModuleLoader = requireFromRuntime,
  guardedRepositoryState,
} = {}) {
  const cwd = path.resolve(repositoryRoot);
  const privateExpectedTarball = Buffer.isBuffer(expectedTarball?.archiveBytes)
    ? {
        archiveBytes: Buffer.from(expectedTarball.archiveBytes),
        entries: Object.freeze([...(expectedTarball.entries ?? [])]),
      }
    : undefined;
  const privateRepositoryGuard = isRecord(guardedRepositoryState)
    ? {
        taskId: guardedRepositoryState.taskId,
        repository: guardedRepositoryState.repository,
        repositoryRoot: path.resolve(guardedRepositoryState.repositoryRoot),
        targetMergeSha: guardedRepositoryState.targetMergeSha,
        artifacts: (guardedRepositoryState.artifacts ?? []).map((artifact) => ({
          relativePath: artifact.relativePath,
          present: artifact.present,
          mode: artifact.mode,
          blobSha: artifact.blobSha,
          bytes: Buffer.from(artifact.bytes ?? ""),
        })),
      }
    : undefined;
  if (
    privateRepositoryGuard &&
    (privateRepositoryGuard.repositoryRoot !== cwd ||
      !/^\d{4}$/u.test(privateRepositoryGuard.taskId ?? "") ||
      !SHA_PATTERN.test(privateRepositoryGuard.targetMergeSha ?? "") ||
      typeof privateRepositoryGuard.repository !== "string" ||
      privateRepositoryGuard.artifacts.length !== 3 ||
      privateRepositoryGuard.artifacts.some(
        (artifact) =>
          typeof artifact.relativePath !== "string" ||
          typeof artifact.present !== "boolean" ||
          !Buffer.isBuffer(artifact.bytes) ||
          (artifact.present &&
            (typeof artifact.mode !== "string" ||
              !SHA_PATTERN.test(artifact.blobSha ?? ""))),
      ))
  ) {
    throw publicReleaseHydrationError(
      "REPOSITORY_GUARD",
      "guarded repository state is malformed",
    );
  }
  const verifyProvenance =
    provenanceVerifier ??
    ((bundle, tuple) =>
      defaultProvenanceVerifier(bundle, tuple, {
        moduleLoader: provenanceModuleLoader,
      }));

  const githubGet = (
    endpoint,
    role,
    { allowNotFound = false, context = {} } = {},
  ) => {
    const separator = endpoint.includes("?") ? "&" : "?";
    const sequencedEndpoint = `${endpoint}${separator}kyw-public-read=${
      Number.isInteger(context.sequence) ? context.sequence : 1
    }`;
    return parseGitHubJsonCommand({
      runner: commandRunner,
      repositoryRoot: cwd,
      args: [
        "api",
        "--hostname",
        "github.com",
        "--method",
        "GET",
        "-H",
        "Cache-Control: no-cache, no-store, max-age=0",
        "-H",
        "Pragma: no-cache",
        sequencedEndpoint,
      ],
      role,
      allowNotFound,
    });
  };

  const githubCreate = async (endpoint, fields, role) => {
    const args = [
      "api",
      "--hostname",
      "github.com",
      "--method",
      "POST",
      endpoint,
    ];
    for (const [name, value, typed = false] of fields) {
      args.push(typed ? "-F" : "-f", `${name}=${String(value)}`);
    }
    const response = await parseGitHubJsonCommand({
      runner: commandRunner,
      repositoryRoot: cwd,
      args,
      role,
    });
    return Object.freeze({ accepted: true, id: response?.id });
  };

  async function readPublishWorkflowIdentity(
    { repository, path: workflowPath },
    context = {},
  ) {
    const raw = await githubGet(
      `repos/${repository}/actions/workflows/${path.posix.basename(workflowPath)}`,
      "PUBLISH_WORKFLOW",
      { context },
    );
    return normalizeGitHubWorkflow(raw, workflowPath);
  }

  async function readPackageIndex({ name, registry }, context = {}) {
    const response = await fetchPublicReleaseJson({
      fetchImpl,
      url: publicReleaseUrl(
        registry,
        packageUrlPath(name),
        context.sequence,
      ),
      role: "REGISTRY_PACKAGE",
      allowNotFound: true,
    });
    return response.status === 404 ? null : response.value;
  }

  async function readSigningKeys(registry, context = {}) {
    const response = await fetchPublicReleaseJson({
      fetchImpl,
      url: publicReleaseUrl(registry, "-/npm/v1/keys", context.sequence),
      role: "REGISTRY_KEYS",
    });
    return response.value;
  }

  async function readFreshGitText(args, role, { allowFailure = false } = {}) {
    const result = await runPublicReleaseCommand({
      runner: commandRunner,
      command: "git",
      args,
      cwd,
      role,
      allowFailure,
    });
    return result;
  }

  async function revalidateGuardedRepositoryState(
    tuple,
    remoteHeadSha,
    context,
  ) {
    if (!privateRepositoryGuard) return;
    if (
      tuple.taskId !== privateRepositoryGuard.taskId ||
      tuple.repository !== privateRepositoryGuard.repository ||
      tuple.target.mergeSha !== privateRepositoryGuard.targetMergeSha
    ) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "frozen public tuple does not match guarded repository identity",
      );
    }
    const guardCache = createInvocationCommandCache({ runner: commandRunner });
    const localMainSha = await gitText(
      guardCache,
      cwd,
      ["rev-parse", "refs/heads/main"],
      { taskId: tuple.taskId, role: "PUBLIC_RELEASE_REPOSITORY_GUARD" },
    );
    if (
      !SHA_PATTERN.test(localMainSha) ||
      (localMainSha !== tuple.target.mergeSha &&
        !(await gitIsAncestor(
          guardCache,
          cwd,
          tuple.target.mergeSha,
          localMainSha,
        )))
    ) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "local main no longer contains the frozen public target",
      );
    }
    const paths = privateRepositoryGuard.artifacts.map(
      ({ relativePath }) => relativePath,
    );
    const remoteCommit = await githubGet(
      `repos/${tuple.repository}/git/commits/${remoteHeadSha}`,
      "PUBLIC_REPOSITORY_COMMIT",
      { context },
    );
    const remoteTreeSha = remoteCommit?.tree?.sha;
    if (
      remoteCommit?.sha !== remoteHeadSha ||
      !isRecord(remoteCommit.tree) ||
      !SHA_PATTERN.test(remoteTreeSha ?? "")
    ) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "GitHub returned a malformed guarded repository commit",
      );
    }
    const [currentEntries, indexEntries, remoteTree, remoteContents] =
      await Promise.all([
      readTerminalArtifactGitEntries({
        cache: guardCache,
        repositoryRoot: cwd,
        source: "tree",
        revision: localMainSha,
        relativePaths: paths,
        taskId: tuple.taskId,
        role: "PUBLIC_RELEASE_REPOSITORY_GUARD",
      }),
      readTerminalArtifactGitEntries({
        cache: guardCache,
        repositoryRoot: cwd,
        source: "index",
        relativePaths: paths,
        taskId: tuple.taskId,
        role: "PUBLIC_RELEASE_REPOSITORY_GUARD",
        }),
        githubGet(
          `repos/${tuple.repository}/git/trees/${remoteTreeSha}?recursive=1`,
          "PUBLIC_REPOSITORY_TREE",
          { context },
      ),
      Promise.all(
        privateRepositoryGuard.artifacts.map((artifact) =>
          githubGet(
            `repos/${tuple.repository}/contents/${githubEndpointSegment(artifact.relativePath)}?ref=${encodeURIComponent(remoteHeadSha)}`,
            "PUBLIC_REPOSITORY_CONTENT",
            { context, allowNotFound: !artifact.present },
          ),
        ),
      ),
      ]);
    if (!currentEntries || !indexEntries) {
      throw publicReleaseHydrationError(
        "REPOSITORY_GUARD",
        "guarded repository Git entries are malformed or ambiguous",
      );
    }
    assertGitHubRemoteTreeIdentity(
      remoteTree,
      privateRepositoryGuard.artifacts,
      remoteTreeSha,
    );
    for (let index = 0; index < privateRepositoryGuard.artifacts.length; index += 1) {
      const artifact = privateRepositoryGuard.artifacts[index];
      const currentEntry = currentEntries.get(artifact.relativePath);
      const indexEntry = indexEntries.get(artifact.relativePath);
      if (!artifact.present) {
        if (
          currentEntry !== undefined ||
          indexEntry !== undefined ||
          remoteContents[index] !== null
        ) {
          throw publicReleaseHydrationError(
            "REPOSITORY_GUARD",
            "an absent guarded repository artifact appeared",
          );
        }
        continue;
      }
      if (
        !terminalArtifactGitEntryIsRegular(currentEntry, { source: "tree" }) ||
        !terminalArtifactGitEntryIsRegular(indexEntry, { source: "index" }) ||
        currentEntry.mode !== artifact.mode ||
        indexEntry.mode !== artifact.mode ||
        currentEntry.objectSha !== artifact.blobSha ||
        indexEntry.objectSha !== artifact.blobSha
      ) {
        throw publicReleaseHydrationError(
          "REPOSITORY_GUARD",
          "local guarded repository identity changed",
        );
      }
      decodeGitHubContents(remoteContents[index], artifact);
    }
    await assertPublicReleaseWorktreeArtifacts(
      privateRepositoryGuard.repositoryRoot,
      privateRepositoryGuard.artifacts,
    );
  }

  async function revalidateTupleSource(tuple, context = {}) {
    const sequence = Number.isInteger(context.sequence) ? context.sequence : 1;
    const remoteRef = await githubGet(
      `repos/${tuple.repository}/git/ref/heads/${githubEndpointSegment(tuple.baseBranch)}`,
      "PUBLIC_BASE_REF",
      { context: { ...context, sequence } },
    );
    const remoteHeadSha = remoteRef?.object?.sha;
    let descendantProof;
    if (remoteHeadSha !== tuple.target.mergeSha && SHA_PATTERN.test(remoteHeadSha ?? "")) {
      descendantProof = await githubGet(
        `repos/${tuple.repository}/compare/${tuple.target.mergeSha}...${remoteHeadSha}`,
        "PUBLIC_BASE_ANCESTRY",
        { context: { ...context, sequence } },
      );
    }
    const [treeResult, packageResult, pluginResult, workflowResult, npmrcResult] =
      await Promise.all([
        readFreshGitText(
          ["rev-parse", `${tuple.target.mergeSha}^{tree}`],
          "PUBLIC_SOURCE_TREE",
        ),
        readFreshGitText(
          ["show", `${tuple.target.mergeSha}:package.json`],
          "PUBLIC_SOURCE_PACKAGE",
        ),
        readFreshGitText(
          ["show", `${tuple.target.mergeSha}:.codex-plugin/plugin.json`],
          "PUBLIC_SOURCE_PLUGIN",
        ),
        readFreshGitText(
          ["show", `${tuple.target.mergeSha}:${tuple.publishWorkflow.path}`],
          "PUBLIC_SOURCE_WORKFLOW",
        ),
        readFreshGitText(
          ["cat-file", "-e", `${tuple.target.mergeSha}:.npmrc`],
          "PUBLIC_SOURCE_NPMRC",
          { allowFailure: true },
        ),
      ]);
    const packageJson = parseJsonBlob(packageResult.stdout, "PUBLIC_SOURCE_PACKAGE");
    const pluginJson = parseJsonBlob(pluginResult.stdout, "PUBLIC_SOURCE_PLUGIN");
    assertPublicReleaseSourceContract({
      packageJson,
      pluginJson,
      workflowText: workflowResult.stdout,
      repository: tuple.repository,
    });
    if (
      remoteRef?.ref !== tuple.publishWorkflow.ref ||
      tuple.baseBranch !== "main" ||
      tuple.publishWorkflow.ref !== "refs/heads/main" ||
      remoteRef?.object?.type !== "commit" ||
      !SHA_PATTERN.test(remoteHeadSha ?? "") ||
      (remoteHeadSha !== tuple.target.mergeSha &&
        (descendantProof?.status !== "ahead" ||
          descendantProof?.base_commit?.sha !== tuple.target.mergeSha ||
          descendantProof?.merge_base_commit?.sha !== tuple.target.mergeSha)) ||
      (context.purpose === "PRE_NPM_WRITE" &&
        remoteHeadSha !== tuple.target.mergeSha) ||
      treeResult.stdout.trim() !== tuple.target.treeSha ||
      npmrcResult.status === 0 ||
      packageJson.name !== tuple.package.name ||
      packageJson.version !== tuple.package.version ||
      normalizedPackageRepository(packageJson.repository) !==
        tuple.package.repository ||
      pluginJson.name !== tuple.plugin.name ||
      pluginJson.version !== tuple.plugin.version
    ) {
      throw publicReleaseHydrationError(
        "PUBLIC_SOURCE_IDENTITY",
        "canonical base ref or exact delivered source drifted after tuple freeze",
      );
    }
    await revalidateGuardedRepositoryState(tuple, remoteHeadSha, context);
    return Object.freeze({ remoteHeadSha });
  }

  async function readTag(tuple, context = {}) {
    const matching = await githubGet(
      `repos/${tuple.repository}/git/matching-refs/tags/${githubEndpointSegment(tuple.tag.name)}?per_page=${MAX_GITHUB_RESULTS}&page=1`,
      "TAG_READ",
      { context },
    );
    if (!Array.isArray(matching)) {
      throw publicReleaseHydrationError("TAG_READ", "matching-ref response is malformed");
    }
    if (
      matching.some(
        (rawRef) => !isRecord(rawRef) || typeof rawRef.ref !== "string",
      )
    ) {
      return Object.freeze({ tags: Object.freeze([]), complete: false });
    }
    if (matching.length >= MAX_GITHUB_RESULTS) {
      return Object.freeze({ tags: Object.freeze([]), complete: false });
    }
    const exact = matching.filter((rawRef) => rawRef?.ref === tuple.tag.ref);
    const namespaceCollisions = matching.filter((rawRef) =>
      String(rawRef?.ref ?? "").startsWith(`${tuple.tag.ref}/`),
    );
    const tags = [];
    for (const rawRef of exact) {
      const peeled = await peelGitHubTag({ tuple, rawRef, githubGet, context });
      tags.push(normalizeTagObject(tuple, rawRef, peeled));
    }
    if (namespaceCollisions.length > 0) {
      tags.push(
        Object.freeze({
          repository: tuple.repository,
          ref: tuple.tag.ref,
          objectType: "unsupported",
          namespaceCollision: true,
        }),
      );
    }
    return Object.freeze({ tags: Object.freeze(tags), complete: true });
  }

  let publicClients;
  async function assertPublicMutationBoundary(tuple, stage) {
    assertPublicReleaseRepository(tuple?.repository);
    const readContext = Object.freeze({
      fresh: true,
      cacheBypass: true,
      purpose: `PRE_${stage}_WRITE`,
      sequence: 1,
    });
    let workflow;
    let npm;
    let tag;
    let release;
    try {
      [workflow, npm, tag, release] = await Promise.all([
        publicClients.readWorkflowRuns(tuple, readContext),
        publicClients.readNpmVersion(tuple, readContext),
        publicClients.readTag(tuple, readContext),
        publicClients.readRelease(tuple, readContext),
      ]);
    } catch {
      throw publicReleaseHydrationError(
        `${stage}_WRITE_BOUNDARY`,
        "fresh canonical boundary reads failed before the create action",
        "PUBLIC_RELEASE_PREWRITE_STATE_CHANGED",
      );
    }
    const state = classifyPublicReleaseState(tuple, {
      workflow,
      npm,
      tag,
      release,
      readContext,
    });
    if (state.disposition !== "READY" || state.nextStage !== stage) {
      throw publicReleaseHydrationError(
        `${stage}_WRITE_BOUNDARY`,
        "fresh canonical state no longer admits this exact create action",
        "PUBLIC_RELEASE_PREWRITE_STATE_CHANGED",
      );
    }
  }

  publicClients = {
    readPublishWorkflowIdentity,
    readPackageIndex,
    readSigningKeys,
    async readWorkflowRuns(tuple, context = {}) {
      const sourceState = await revalidateTupleSource(tuple, context);
      const workflow = await readPublishWorkflowIdentity({
        repository: tuple.repository,
        path: tuple.publishWorkflow.path,
      }, context);
      if (
        workflow.id !== tuple.publishWorkflow.id ||
        workflow.name !== tuple.publishWorkflow.name ||
        workflow.path !== tuple.publishWorkflow.path ||
        workflow.state !== "active"
      ) {
        throw publicReleaseHydrationError(
          "PUBLISH_WORKFLOW",
          "workflow identity drifted after tuple freeze",
        );
      }
      const parameters = new URLSearchParams({
        event: "workflow_dispatch",
        head_sha: tuple.target.mergeSha,
        per_page: String(MAX_GITHUB_RESULTS),
        page: "1",
      });
      const raw = await githubGet(
        `repos/${tuple.repository}/actions/workflows/${tuple.publishWorkflow.id}/runs?${parameters}`,
        "PUBLISH_WORKFLOW_RUNS",
        { context },
      );
      if (!Array.isArray(raw?.workflow_runs) || !Number.isInteger(raw.total_count)) {
        throw publicReleaseHydrationError(
          "PUBLISH_WORKFLOW_RUNS",
          "workflow run collection is malformed",
        );
      }
      const collectionComplete =
        raw.workflow_runs.length < MAX_GITHUB_RESULTS &&
        raw.total_count === raw.workflow_runs.length;
      if (!collectionComplete) {
        return Object.freeze({
          runs: Object.freeze([]),
          complete: false,
          baseHeadSha: sourceState.remoteHeadSha,
        });
      }
      const matching = raw.workflow_runs;
      if (matching.length > MAX_RUN_ATTEMPTS) {
        throw publicReleaseHydrationError(
          "PUBLISH_WORKFLOW_RUNS",
          `more than ${MAX_RUN_ATTEMPTS} matching workflow runs exceed the bounded read contract`,
        );
      }
      const runs = [];
      for (const run of matching) {
        if (
          !isRecord(run) ||
          !positiveInteger(run.id) ||
          !positiveInteger(run.run_attempt)
        ) {
          throw publicReleaseHydrationError(
            "PUBLISH_WORKFLOW_RUNS",
            "workflow run identity contains a malformed numeric identifier",
          );
        }
        const normalizedRun = {
          runId: run.id,
          runAttempt: run.run_attempt,
          repository: tuple.repository,
          workflowId: workflow.id,
          workflowName: workflow.name,
          workflowPath: workflow.path,
          event: run.event,
          ref:
            typeof run.head_branch === "string"
              ? `refs/heads/${run.head_branch}`
              : undefined,
          headSha: run.head_sha,
          ...(run.inputs === undefined ? {} : { inputs: run.inputs }),
          status: run.status,
          conclusion: run.conclusion,
        };
        if (
          ["queued", "in_progress", "waiting", "requested", "pending"].includes(
            run.status,
          ) ||
          run.status !== "completed"
        ) {
          runs.push(Object.freeze(normalizedRun));
          continue;
        }
        if (run.run_attempt > 10) throw publicReleaseHydrationError("PUBLISH_WORKFLOW_JOBS", "publish attempts exceed bounded history");
        let jobsResponse;
        const priorAttempts = [];
        for (let attempt = 1; attempt <= run.run_attempt; attempt += 1) {
          const response = await githubGet(
            `repos/${tuple.repository}/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=${MAX_GITHUB_RESULTS}&page=1`,
            "PUBLISH_WORKFLOW_JOBS", { context },
          );
          if (!Array.isArray(response?.jobs) || response.total_count !== 1 || response.jobs.length !== 1 ||
              response.jobs.some((job) => !isRecord(job) || !positiveInteger(job.id) || job.run_id !== run.id ||
                job.head_sha !== tuple.target.mergeSha || job.name !== PUBLIC_RELEASE_PUBLISH_JOB ||
                (job.run_attempt !== undefined && job.run_attempt !== attempt))) {
            throw publicReleaseHydrationError("PUBLISH_WORKFLOW_JOBS", "workflow job collection is incomplete or has the wrong run/attempt/checkout identity");
          }
          const skipped = publicationWasSkipped(response.jobs);
          if (attempt < run.run_attempt) priorAttempts.push(Object.freeze({ attempt,
            publishBoundary: skipped ? "NOT_EXECUTED" : "UNKNOWN" }));
          else jobsResponse = response;
        }
        normalizedRun.priorAttempts = Object.freeze(priorAttempts);
        const jobEvidence = [];
        for (const job of jobsResponse.jobs) {
          const logResult = await runPublicReleaseCommand({
            runner: commandRunner,
            command: "gh",
            args: [
              "run",
              "view",
              String(run.id),
              "--repo",
              `github.com/${tuple.repository}`,
              "--attempt",
              String(run.run_attempt),
              "--job",
              String(job.id),
              "--log",
            ],
            cwd,
            role: "PUBLISH_WORKFLOW_LOG",
            allowFailure: true,
          });
          if (logResult.status === 0) {
            jobEvidence.push(publishEvidenceFromLog(logResult.stdout));
          }
        }
        const evidence =
          jobEvidence.length === 1 ? jobEvidence[0] : Object.freeze({});
        if (run.conclusion !== "success") {
          const unexecuted = priorAttempts.every((attempt) => attempt.publishBoundary === "NOT_EXECUTED") &&
            publicationWasSkipped(jobsResponse.jobs);
          runs.push(Object.freeze({ ...normalizedRun, inputs: evidence.inputs ?? run.inputs,
            ...(unexecuted ? { publishBoundary: "NOT_EXECUTED", publishAttempts: [] } : {}),
          }));
          continue;
        }
        const publishSteps = jobsResponse.jobs.flatMap((job) =>
          (job.steps ?? []).filter(
            (step) => step?.name === PUBLIC_RELEASE_PUBLISH_STEP,
          ),
        );
        runs.push(
          Object.freeze({
            ...normalizedRun,
            inputs: evidence.inputs ?? run.inputs,
            ...(run.status === "completed" && publishSteps.length > 0
              ? {
                  publishAttempts: publishSteps.map((step) =>
                    Object.freeze({
                      checkoutSha: evidence.checkoutSha,
                      conclusion: String(step.conclusion ?? "").toUpperCase(),
                      command: PUBLIC_RELEASE_COMMAND,
                    }),
                  ),
                }
              : {}),
          }),
        );
      }
      return Object.freeze({
        runs: Object.freeze(runs),
        complete: true,
        baseHeadSha: sourceState.remoteHeadSha,
      });
    },
    async readNpmVersion(tuple, context = {}) {
      const versionResponse = await fetchPublicReleaseJson({
        fetchImpl,
        url: publicReleaseUrl(
          tuple.package.registry,
          packageUrlPath(tuple.package.name, `/${encodeURIComponent(tuple.package.version)}`),
          context.sequence,
        ),
        role: "REGISTRY_VERSION",
        allowNotFound: true,
      });
      if (versionResponse.status === 404) {
        const [index, keys] = await Promise.all([
          readPackageIndex(tuple.package, context),
          readSigningKeys(tuple.package.registry, context),
        ]);
        if (
          !isRecord(index) ||
          index.name !== tuple.package.name ||
          !isRecord(index.versions) ||
          !isRecord(index["dist-tags"])
        ) {
          throw publicReleaseHydrationError(
            "REGISTRY_PACKAGE",
            "package index is malformed while the target version is absent",
          );
        }
        const currentKey = selectCurrentRegistrySigningKey(
          keys,
          tuple.package.signature.keyId,
          { requireSoleActive: true },
        );
        return Object.freeze({
          status: 404,
          absent: true,
          name: tuple.package.name,
          version: tuple.package.version,
          registry: tuple.package.registry,
          signatureKeyId: currentKey.keyid,
          indexComplete: true,
          versions: Object.freeze(
            Object.keys(index?.versions ?? {}).sort(compareStableVersions),
          ),
          distTags: Object.freeze({
            latest: index?.["dist-tags"]?.latest ?? null,
          }),
        });
      }
      const metadata = versionResponse.value;
      if (!isRecord(metadata) || typeof metadata.dist?.tarball !== "string") {
        throw publicReleaseHydrationError(
          "REGISTRY_VERSION",
          "version metadata is malformed",
        );
      }
      let canonicalTarballUrl;
      try {
        canonicalTarballUrl = new URL(metadata.dist.tarball);
      } catch {
        throw publicReleaseHydrationError(
          "REGISTRY_TARBALL",
          "version metadata contains a malformed tarball URL",
        );
      }
      const packageLeaf = tuple.package.name.split("/").at(-1);
      const expectedTarballPath = `/${tuple.package.name}/-/${packageLeaf}-${tuple.package.version}.tgz`;
      if (
        canonicalTarballUrl.origin !== new URL(tuple.package.registry).origin ||
        decodeURIComponent(canonicalTarballUrl.pathname) !== expectedTarballPath ||
        canonicalTarballUrl.username ||
        canonicalTarballUrl.password ||
        canonicalTarballUrl.search ||
        canonicalTarballUrl.hash
      ) {
        throw publicReleaseHydrationError(
          "REGISTRY_TARBALL",
          "version metadata tarball URL is outside the exact canonical registry path",
        );
      }
      const [index, keys, attestations, tarballResponse] = await Promise.all([
        readPackageIndex(tuple.package, context),
        readSigningKeys(tuple.package.registry, context),
        fetchPublicReleaseJson({
          fetchImpl,
          url: publicReleaseUrl(
            tuple.package.registry,
            `-/npm/v1/attestations/${encodeURIComponent(tuple.package.name)}@${encodeURIComponent(tuple.package.version)}`,
            context.sequence,
          ),
          role: "REGISTRY_ATTESTATIONS",
        }).then((response) => response.value),
        fetchPublicReleaseBytes({
          fetchImpl,
          url: publicReleaseUrl(
            canonicalTarballUrl,
            "",
            context.sequence,
          ),
          role: "REGISTRY_TARBALL",
        }),
      ]);
      const indexedTarget = index?.versions?.[tuple.package.version];
      const endpointIdentity = registryImmutableVersionIdentity(metadata);
      const indexedIdentity = registryImmutableVersionIdentity(indexedTarget);
      if (
        !isRecord(index) ||
        index.name !== tuple.package.name ||
        !isRecord(index.versions) ||
        !isRecord(index["dist-tags"]) ||
        endpointIdentity === undefined ||
        indexedIdentity === undefined ||
        endpointIdentity !== indexedIdentity
      ) {
        throw publicReleaseHydrationError(
          "REGISTRY_PACKAGE",
          "package index and version endpoint do not expose one exact immutable target identity",
        );
      }
      const archive = tarballResponse.bytes;
      const rawBytesVerified =
        Buffer.isBuffer(privateExpectedTarball?.archiveBytes) &&
        archive.equals(privateExpectedTarball.archiveBytes);
      const sha512Hex = createHash("sha512").update(archive).digest("hex");
      const sha256 = createHash("sha256").update(archive).digest("hex");
      const validAt = Number.isFinite(Date.parse(index?.time?.[tuple.package.version]))
        ? Date.parse(index.time[tuple.package.version]) : Date.now();
      const signatures = metadata.dist.signatures ?? [];
      const allowedKeyIds = tuple.package.signature.keyIds ?? [tuple.package.signature.keyId];
      return Object.freeze({
        status: 200,
        name: metadata.name,
        version: metadata.version,
        registry: tuple.package.registry,
        repository: registryRepository(metadata),
        access: "public",
        gitHead: metadata.gitHead,
        distTags: Object.freeze({ latest: index?.["dist-tags"]?.latest }),
        tarball: Object.freeze({
          bytes: archive.length,
          integrity: metadata.dist.integrity,
          shasum: metadata.dist.shasum,
          sha256,
          rawBytesVerified,
          entries: Object.freeze(
            rawBytesVerified && Array.isArray(privateExpectedTarball?.entries)
              ? [...privateExpectedTarball.entries]
              : [],
          ),
        }),
        signature: Object.freeze({
          keyId: tuple.package.signature.keyId,
          keyIds: signatures.map((signature) => signature?.keyid),
          verified: signatures.every((signature) => allowedKeyIds.includes(signature?.keyid)) &&
            verifyRegistrySignatures({ signatures, keys, name: metadata.name,
              version: metadata.version, integrity: metadata.dist.integrity, validAt,
              requiredKeyId: tuple.package.signature.keyIds ? undefined : tuple.package.signature.keyId }),
        }),
        provenance: await parseSlsaProvenance({
          tuple,
          attestations,
          tarballSha512: sha512Hex,
          tarballSha256: sha256,
          provenanceVerifier: verifyProvenance,
        }),
        versions: Object.freeze(Object.keys(index?.versions ?? {}).sort(compareStableVersions)),
      });
    },
    readTag,
    async readRelease(tuple, context = {}) {
      const [byTag, raw] = await Promise.all([
        githubGet(
          `repos/${tuple.repository}/releases/tags/${encodeURIComponent(tuple.release.tagName)}`,
          "RELEASE_BY_TAG_READ",
          { context, allowNotFound: true },
        ),
        githubGet(
          `repos/${tuple.repository}/releases?per_page=${MAX_GITHUB_RESULTS}&page=1`,
          "RELEASE_READ",
          { context },
        ),
      ]);
      if (!Array.isArray(raw)) {
        throw publicReleaseHydrationError("RELEASE_READ", "release collection is malformed");
      }
      if (
        (byTag !== null &&
          (!isRecord(byTag) ||
            !positiveInteger(byTag.id) ||
            typeof byTag.tag_name !== "string")) ||
        raw.some(
          (release) =>
            !isRecord(release) ||
            !positiveInteger(release.id) ||
            typeof release.tag_name !== "string",
        )
      ) {
        return Object.freeze({ releases: Object.freeze([]), complete: false });
      }
      if (raw.length >= MAX_GITHUB_RESULTS) {
        return Object.freeze({ releases: Object.freeze([]), complete: false });
      }
      const matching = raw.filter((release) => release?.tag_name === tuple.release.tagName);
      const tagState = await readTag(tuple, context);
      const tagTarget = tagState.tags?.[0];
      const tagTargetSha =
        tagTarget?.objectType === "tag" ? tagTarget.peeledSha : tagTarget?.targetSha;
      const endpointsAgree =
        (byTag === null && matching.length === 0) ||
        (isRecord(byTag) &&
          matching.length === 1 &&
          releaseEndpointIdentity(byTag) ===
            releaseEndpointIdentity(matching[0]));
      const selected = byTag === null ? matching : [byTag];
      if (!endpointsAgree) {
        selected.push(
          Object.freeze({
            id: -1,
            tag_name: tuple.release.tagName,
            name: "CANONICAL_ENDPOINT_CONFLICT",
            body: "",
            draft: false,
            prerelease: false,
            assets: [],
          }),
        );
      }
      return Object.freeze({
        releases: Object.freeze(
          selected.map((release) =>
            Object.freeze({
              id: release.id,
              repository: tuple.repository,
              tagName: release.tag_name,
              tagTargetSha,
              title: release.name,
              body: normalizedReleaseBody(release),
              draft: release.draft,
              prerelease: release.prerelease,
              state: release.draft ? "draft" : "published",
              assets: normalizedReleaseAssets(release),
            }),
          ),
        ),
        complete: true,
      });
    },
    async dispatchPublishWorkflow(tuple) {
      await assertPublicMutationBoundary(tuple, "NPM");
      const workflowInputs = derivePublicReleaseWorkflowInputs(tuple);
      return githubCreate(
        `repos/${tuple.repository}/actions/workflows/${tuple.publishWorkflow.id}/dispatches`,
        [
          ["ref", tuple.baseBranch],
          ...Object.entries(workflowInputs).map(([name, value]) => [
            `inputs[${name}]`,
            value,
          ]),
        ],
        "PUBLISH_WORKFLOW_DISPATCH",
      );
    },
    async createTag(tuple) {
      await assertPublicMutationBoundary(tuple, "TAG");
      return githubCreate(
        `repos/${tuple.repository}/git/refs`,
        [
          ["ref", tuple.tag.ref],
          ["sha", tuple.target.mergeSha],
        ],
        "TAG_CREATE",
      );
    },
    async createRelease(tuple) {
      await assertPublicMutationBoundary(tuple, "RELEASE");
      return githubCreate(
        `repos/${tuple.repository}/releases`,
        [
          ["tag_name", tuple.release.tagName],
          ["target_commitish", tuple.target.mergeSha],
          ["name", tuple.release.title],
          ["body", tuple.release.body],
          ["draft", false, true],
          ["prerelease", false, true],
          ["generate_release_notes", false, true],
        ],
        "RELEASE_CREATE",
      );
    },
  };
  return Object.freeze(publicClients);
}

export async function hydratePublicReleaseContext({
  tasksRoot,
  repositoryRoot: requestedRepositoryRoot,
  releaseVersion: requestedVersion,
  releaseSha,
  taskId,
  deliveryLedger,
  deliveryExpectations,
  commandRunner,
  fetchImpl = globalThis.fetch,
  provenanceVerifier,
  clients: suppliedClients,
} = {}) {
  const commandCache = createInvocationCommandCache({ runner: commandRunner });
  let releaseVersion, repositoryRoot, repository, mergeSha, mainSha, treeSha;
  let packageText, pluginText, workflowText, evaluation, entry;
  const independentRelease = requestedVersion !== undefined || releaseSha !== undefined;
  if (independentRelease) {
    if (!stableVersionParts(requestedVersion) || !SHA_PATTERN.test(releaseSha ?? "")) {
      throw publicReleaseHydrationError("RELEASE_TARGET", "release requires a stable version and exact SHA");
    }
    taskId = null;
    releaseVersion = requestedVersion;
    mergeSha = releaseSha;
    repositoryRoot = await gitText(commandCache, path.resolve(requestedRepositoryRoot ?? process.cwd()),
      ["rev-parse", "--show-toplevel"], { role: "PUBLIC_RELEASE_REPOSITORY" });
    const remote = await gitText(commandCache, repositoryRoot, ["remote", "get-url", "origin"],
      { role: "PUBLIC_RELEASE_REPOSITORY" });
    const matched = /^(?:https:\/\/github\.com\/|git@github\.com:)([^/\s]+\/[^/\s]+?)(?:\.git)?$/u.exec(remote);
    if (!matched) throw publicReleaseHydrationError("SOURCE_IDENTITY", "origin must identify one GitHub repository");
    repository = matched[1];
    assertPublicReleaseRepository(repository);
    [mainSha, treeSha, packageText, pluginText, workflowText] = await Promise.all([
      gitText(commandCache, repositoryRoot, ["rev-parse", "refs/heads/main"], { role: "PUBLIC_RELEASE_MAIN" }),
      gitText(commandCache, repositoryRoot, ["rev-parse", `${mergeSha}^{tree}`], { role: "PUBLIC_RELEASE_TREE" }),
      readCommitFile(commandCache, repositoryRoot, mergeSha, "package.json", "PUBLIC_RELEASE_PACKAGE"),
      readCommitFile(commandCache, repositoryRoot, mergeSha, ".codex-plugin/plugin.json", "PUBLIC_RELEASE_PLUGIN"),
      readCommitFile(commandCache, repositoryRoot, mergeSha, PUBLIC_RELEASE_WORKFLOW_PATH, "PUBLIC_RELEASE_WORKFLOW"),
    ]);
    requireSha(mainSha, taskId, "PUBLIC_RELEASE_MAIN", "local main");
    // An already published target can outlive the main tip. Keep the real tip
    // and prove ancestry here; canonical publication proof gates later writes.
    if (mainSha !== mergeSha && !(await gitIsAncestor(commandCache, repositoryRoot, mergeSha, mainSha))) {
      throw publicReleaseHydrationError("RELEASE_TARGET", "release SHA must be prepared main or its proven ancestor");
    }
    entry = { repository, merge: { sha: mergeSha, branch: "main" } };
  } else {
  if (!/^\d{4}$/u.test(taskId ?? "")) {
    throw publicReleaseHydrationError(
      "STANDARD_FINAL",
      "selected Task ID must be an exact four-digit value",
    );
  }
  const resolvedTasksRoot = path.resolve(tasksRoot);
  const queue = await inspectTaskQueue(resolvedTasksRoot);
  if (queue.errors.length > 0) {
    throw publicReleaseHydrationError(
      "TASK_CONTRACT",
      `Task queue validation failed: ${queue.errors.join("; ")}`,
      "PUBLIC_RELEASE_TASK_INVALID",
    );
  }
  const selectedTasks = queue.tasks.filter((task) => task.id === taskId);
  if (selectedTasks.length !== 1) {
    throw publicReleaseHydrationError(
      "TASK_CONTRACT",
      `expected one canonical Task ${taskId}, found ${selectedTasks.length}`,
      "PUBLIC_RELEASE_TASK_INVALID",
    );
  }
  const [selectedTask] = selectedTasks;
  if (!completeTask(selectedTask) || !releaseBearingStandardTask(selectedTask)) {
    throw publicReleaseHydrationError(
      "TASK_CONTRACT",
      "public stages require a terminal contract-4 STANDARD Task with one stable Release version",
      "PUBLIC_RELEASE_TASK_INELIGIBLE",
    );
  }
  releaseVersion = selectedTask.deliveryRequirement.releaseVersion;
  entry = deliveryLedger?.[taskId];
  const expectation = deliveryExpectations?.[taskId];
  evaluation = evaluateDeliveryEvidence(taskId, entry, expectation);
  if (
    !evaluation.satisfied ||
    evaluation.classification !== "HARDENED_EXACT_HEAD" ||
    evaluation.postMerge !== "VERIFIED_EXACT_CHECKOUT" ||
    entry?.schemaVersion !== 2 ||
    entry?.claim !== "FINAL"
  ) {
    throw publicReleaseHydrationError(
      "STANDARD_FINAL",
      "production evaluator did not prove a fresh hardened FINAL graph",
      "STANDARD_DELIVERY_NOT_FINAL",
    );
  }

  repositoryRoot = await gitText(
    commandCache,
    resolvedTasksRoot,
    ["rev-parse", "--show-toplevel"],
    { taskId, role: "PUBLIC_RELEASE_REPOSITORY" },
  );
  if (!(await tasksRootMatchesRepository(resolvedTasksRoot, repositoryRoot))) {
    throw publicReleaseHydrationError(
      "SOURCE_IDENTITY",
      "tasks root is not the canonical repository docs/tasks directory",
    );
  }
  repository = entry.repository;
  mergeSha = entry.merge?.sha;
  if (entry.merge?.branch !== "main") {
    throw publicReleaseHydrationError(
      "PUBLISH_WORKFLOW",
      "the repository-owned publication workflow permits only the exact main base",
    );
  }
  requireSha(mergeSha, taskId, "PUBLIC_RELEASE_STANDARD", "merge SHA");
  const taskPathWithinTasksRoot = path.relative(
    resolvedTasksRoot,
    selectedTask.taskPath,
  );
  if (
    path.isAbsolute(taskPathWithinTasksRoot) ||
    taskPathWithinTasksRoot === ".." ||
    taskPathWithinTasksRoot.startsWith(`..${path.sep}`)
  ) {
    throw publicReleaseHydrationError(
      "TASK_CONTRACT",
      "selected Task path escapes the canonical tasks root",
      "PUBLIC_RELEASE_TASK_INVALID",
    );
  }
  const taskRelativePath = path.posix.join(
    "docs/tasks",
    ...taskPathWithinTasksRoot.split(path.sep),
  );
  let taskText;
  [mainSha, treeSha, taskText, packageText, pluginText, workflowText] = await Promise.all([
    gitText(commandCache, repositoryRoot, ["rev-parse", "refs/heads/main"], {
      taskId,
      role: "PUBLIC_RELEASE_MAIN",
    }),
    gitText(commandCache, repositoryRoot, ["rev-parse", `${mergeSha}^{tree}`], {
      taskId,
      role: "PUBLIC_RELEASE_TREE",
    }),
    readCommitFile(
      commandCache,
      repositoryRoot,
      mergeSha,
      taskRelativePath,
      "PUBLIC_RELEASE_TASK",
    ),
    readCommitFile(
      commandCache,
      repositoryRoot,
      mergeSha,
      "package.json",
      "PUBLIC_RELEASE_PACKAGE",
    ),
    readCommitFile(
      commandCache,
      repositoryRoot,
      mergeSha,
      ".codex-plugin/plugin.json",
      "PUBLIC_RELEASE_PLUGIN",
    ),
    readCommitFile(
      commandCache,
      repositoryRoot,
      mergeSha,
      PUBLIC_RELEASE_WORKFLOW_PATH,
      "PUBLIC_RELEASE_WORKFLOW",
    ),
  ]);
  if (mainSha !== mergeSha) {
    const ancestry = await commandCache.run({
      command: "git",
      args: ["merge-base", "--is-ancestor", mergeSha, mainSha],
      cwd: repositoryRoot,
      role: "PUBLIC_RELEASE_MAIN_ANCESTRY",
      allowFailure: true,
    });
    if (ancestry.status !== 0) {
      throw publicReleaseHydrationError(
        "STANDARD_FINAL",
        "selected expected-head merge is not the current base or its proven ancestor",
        "STANDARD_DELIVERY_NOT_FINAL",
      );
    }
  }
  requireSha(treeSha, taskId, "PUBLIC_RELEASE_TREE", "merge tree SHA");
  const deliveredTaskContractVersion = getTaskContractVersion(taskText);
  const deliveredTaskRequirement = parseDeliveryRequirement(
    taskText,
    deliveredTaskContractVersion,
  );
  if (
    deliveredTaskContractVersion !== RELEASE_BEARING_TASK_CONTRACT_VERSION ||
    deliveredTaskRequirement.kind !== "STANDARD" ||
    deliveredTaskRequirement.releaseVersion !== releaseVersion
  ) {
    throw publicReleaseHydrationError(
      "TASK_CONTRACT",
      "the exact delivered Task tree does not carry the same contract-4 Release version",
      "PUBLIC_RELEASE_TASK_VERSION_MISMATCH",
    );
  }
  }
  const packageJson = parseJsonBlob(packageText, "SOURCE_PACKAGE");
  const pluginJson = parseJsonBlob(pluginText, "SOURCE_PLUGIN");
  assertPublicReleaseSourceContract({
    packageJson,
    pluginJson,
    workflowText,
    repository,
  });
  if (
    packageJson.version !== releaseVersion ||
    pluginJson.version !== releaseVersion
  ) {
    throw publicReleaseHydrationError(
      "SOURCE_IDENTITY",
      "the exact delivered package and plugin versions must equal the explicitly selected release version",
      "PUBLIC_RELEASE_TASK_VERSION_MISMATCH",
    );
  }
  const guardedRepositoryState = suppliedClients || independentRelease
    ? undefined
    : await freezePublicReleaseRepositoryState({
        commandCache,
        repositoryRoot,
        repository,
        taskId,
        mergeSha,
        currentMainSha: mainSha,
      });

  const bootstrapClients =
    suppliedClients ??
    createPublicReleaseClients({
      repositoryRoot,
      commandRunner,
      fetchImpl,
      provenanceVerifier,
    });
  if (
    typeof bootstrapClients?.readPublishWorkflowIdentity !== "function" ||
    typeof bootstrapClients?.readPackageIndex !== "function" ||
    typeof bootstrapClients?.readSigningKeys !== "function"
  ) {
    throw publicReleaseHydrationError(
      "CLIENTS",
      "tuple hydration clients are incomplete",
    );
  }
  const packageIdentity = Object.freeze({
    name: packageJson.name,
    version: releaseVersion,
    repository: normalizedPackageRepository(packageJson.repository),
    access: "public",
    registry: PUBLIC_REGISTRY,
  });
  const [workflow, packageIndex, registryKeys, tarball] = await Promise.all([
    bootstrapClients.readPublishWorkflowIdentity({
      repository,
      path: PUBLIC_RELEASE_WORKFLOW_PATH,
    }),
    bootstrapClients.readPackageIndex(packageIdentity, {
      fresh: true,
      cacheBypass: true,
      purpose: "TUPLE_FREEZE",
      sequence: 1,
    }),
    bootstrapClients.readSigningKeys(PUBLIC_REGISTRY, {
      fresh: true,
      cacheBypass: true,
      purpose: "TUPLE_FREEZE",
      sequence: 1,
    }),
    createExactPublicReleaseTarball({
      commandCache,
      commandRunner,
      repositoryRoot,
      mergeSha,
      packageJson,
    }),
  ]);
  if (
    workflow?.name !== PUBLIC_RELEASE_WORKFLOW_NAME ||
    workflow?.path !== PUBLIC_RELEASE_WORKFLOW_PATH ||
    workflow?.state !== "active" ||
    !positiveInteger(workflow?.id)
  ) {
    throw publicReleaseHydrationError(
      "PUBLISH_WORKFLOW",
      "canonical GitHub workflow identity is malformed or changed",
    );
  }
  if (
    packageIndex !== null &&
    (!isRecord(packageIndex) || !isRecord(packageIndex.versions))
  ) {
    throw publicReleaseHydrationError(
      "REGISTRY_PACKAGE",
      "canonical package index is malformed",
    );
  }
  const versions = Object.keys(packageIndex?.versions ?? {});
  const stableVersions = versions.filter(stableVersionParts);
  if (stableVersions.length !== versions.length) {
    throw publicReleaseHydrationError(
      "REGISTRY_PACKAGE",
      "canonical version history contains a non-stable version outside the release tuple",
    );
  }
  const priorVersions = stableVersions
    .filter((version) => version !== releaseVersion)
    .sort(compareStableVersions);
  const priorLatest = priorVersions.at(-1) ?? null;
  if (
    priorVersions.some(
      (version) => compareStableVersions(releaseVersion, version) <= 0,
    )
  ) {
    throw publicReleaseHydrationError(
      "REGISTRY_PACKAGE",
      "target version is not newer than every stable prior version",
    );
  }
  const targetRegistryMetadata = packageIndex?.versions?.[releaseVersion];
  if (independentRelease && mainSha !== mergeSha && targetRegistryMetadata === undefined) {
    throw publicReleaseHydrationError("RELEASE_TARGET", "new npm publication requires the exact prepared main SHA; an older target requires existing exact publication proof");
  }
  let tupleSigningKey;
  if (targetRegistryMetadata !== undefined) {
    const targetSignatures = targetRegistryMetadata?.dist?.signatures;
    if (
      !Array.isArray(targetSignatures) ||
      targetSignatures.length < 1 ||
      typeof targetSignatures[0]?.keyid !== "string"
    ) {
      throw publicReleaseHydrationError(
        "REGISTRY_PACKAGE",
        "existing target metadata does not expose a nonempty registry signature set",
      );
    }
    const publishedAt = Date.parse(packageIndex?.time?.[releaseVersion]);
    tupleSigningKey = selectCurrentRegistrySigningKey(
      registryKeys,
      targetSignatures[0].keyid,
      { validAt: Number.isFinite(publishedAt) ? publishedAt : Date.now() },
    );
    if (!verifyRegistrySignatures({ signatures: targetSignatures, keys: registryKeys,
      name: packageIdentity.name, version: releaseVersion, integrity: tarball.identity.integrity,
      validAt: Number.isFinite(publishedAt) ? publishedAt : Date.now() })) {
      throw publicReleaseHydrationError(
        "REGISTRY_PACKAGE",
        "existing target metadata does not expose an entirely valid trusted registry signature set",
      );
    }
  } else {
    tupleSigningKey = selectCurrentRegistrySigningKey(registryKeys);
    if ((packageIndex?.["dist-tags"]?.latest ?? null) !== priorLatest) {
      throw publicReleaseHydrationError(
        "REGISTRY_PACKAGE",
        "current latest dist-tag does not equal the highest stable prior version",
      );
    }
  }
  const tagName = `v${releaseVersion}`;
  const workflowRef = `refs/heads/${entry.merge.branch}`;
  let tuple = freezePublicReleaseTuple({
    schemaVersion: 1,
    taskId,
    repository,
    baseBranch: entry.merge.branch,
    target: { mergeSha, treeSha },
    publishWorkflow: {
      id: workflow.id,
      name: workflow.name,
      path: workflow.path,
      state: workflow.state,
      ref: workflowRef,
      event: "workflow_dispatch",
      environment: "npm-production",
      publisher: {
        provider: "GitHub Actions",
        authentication: "OIDC",
        repository,
        workflow: path.posix.basename(workflow.path),
        environment: "npm-production",
        action: "npm publish",
      },
    },
    package: {
      ...packageIdentity,
      tarball: tarball.identity,
      signature: { required: true, keyId: tupleSigningKey.keyid,
        keyIds: targetRegistryMetadata
          ? [...new Set(targetRegistryMetadata.dist.signatures.map((signature) => signature.keyid))].sort()
          : registryKeys.keys.filter((key) => key.expires === null || Date.parse(key.expires) > Date.now())
            .map((key) => key.keyid).sort(),
      },
      provenance: {
        required: true,
        sourceRepository: repository,
        workflowPath: workflow.path,
        workflowRef,
        sourceCommit: mergeSha,
        subjectSha256: tarball.identity.sha256,
      },
      priorVersions,
      priorLatest,
    },
    plugin: { name: pluginJson.name, version: releaseVersion },
    tag: { name: tagName, ref: `refs/tags/${tagName}` },
    release: {
      tagName,
      title: tagName,
      body: "",
      draft: false,
      prerelease: false,
      generateReleaseNotes: false,
      assets: [],
    },
  });
  if (typeof bootstrapClients.readWorkflowRuns === "function") {
    const dispatchHistory = await bootstrapClients.readWorkflowRuns(tuple, {
      fresh: true, cacheBypass: true, purpose: "FROZEN_SIGNING_RECOVERY", sequence: 1,
    });
    tuple = recoverPublicReleaseSigningTuple(tuple, dispatchHistory);
  }
  const clients =
    suppliedClients ??
    createPublicReleaseClients({
      repositoryRoot,
      commandRunner,
      fetchImpl,
      expectedTarball: tarball,
      provenanceVerifier,
      guardedRepositoryState,
    });
  return Object.freeze({
    tuple,
    standardDelivery: Object.freeze(independentRelease ? {
      releaseTarget: Object.freeze({ repository, baseBranch: "main", sha: mergeSha,
        treeSha, currentMainSha: mainSha, mainContainsTarget: true }),
    } : { evaluation, evidence: entry, mergeTreeSha: treeSha }),
    clients,
    diagnostics: Object.freeze({
      taskId,
      repository,
      mergeSha,
      mergeTreeSha: treeSha,
      package: `${packageJson.name}@${releaseVersion}`,
      releaseVersion,
      workflowId: workflow.id,
      priorVersionCount: priorVersions.length,
      packedEntryCount: tarball.entries.length,
      baseHeadSha: mainSha,
      baseHeadRelation: mainSha === mergeSha ? "EXACT" : "DESCENDANT",
      commandCache: commandCache.stats(),
      repositoryMutation: false,
      externalMutation: false,
    }),
  });
}
