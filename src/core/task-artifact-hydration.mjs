import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import {
  STANDARD_DELIVERY_CONTINUITY_FILE,
  STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH,
  buildStandardDeliveryContinuityState,
  createStandardDeliveryContinuityCheckpoint,
  createStandardDeliveryContinuityTransitionToken,
  digestStandardDeliveryContinuityEvidence,
  digestStandardDeliveryContinuityTerminalPairs,
  parseStandardDeliveryContinuityCheckpoint,
  parseStandardDeliveryContinuityTransitionToken,
  partitionStandardDeliveryContinuity,
  writeStandardDeliveryContinuityCheckpoint,
} from "./task-artifact-continuity.mjs";
import { evaluateDeliveryEvidence, parseTaskInvocation } from "./task-artifact-delivery.mjs";
import {
  inspectTaskQueue,
  parseTaskQueueMarkdownPair,
} from "./task-artifact-queue.mjs";
import { TaskArtifactError } from "./task-artifact-shared.mjs";
import {
  getTaskContractVersion,
  IMMUTABLE_TERMINAL_TASK_CONTRACT_VERSION,
  isImmutableTerminalTaskContractVersion,
  isQueueAwareTaskContractVersion,
} from "./template-contracts.mjs";

const SHA_PATTERN = /^[a-f0-9]{40}$/;
const MAX_REQUIRED_DELIVERIES = 128;
const MAX_FIRST_PARENT_COMMITS = 4096;
const MAX_TASK_PATH_COMMITS = 64;
const MAX_GITHUB_RESULTS = 100;
const MAX_REVIEW_PAGES = 2;
const MAX_RUN_ATTEMPTS = 10;
const MAX_COMMANDS = 512;
const MAX_LOG_BYTES = 8 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 30_000;
const WORKFLOW_PATH = ".github/workflows/ci.yml";
const FUTURE_TERMINAL_CORRECTION_ROUTE = '$kyw-task "<correction outcome>"';
const TASK_0070_EXPLICIT_REBASELINE = Object.freeze({
  authority: "EXPLICIT_REBASELINE",
  selectedTaskId: "0070",
  priorTaskId: "0068",
  frontierTaskId: "0069",
  expectedBranch:
    "task/0070-repair-mixed-attempt-delivery-hydration-and-one-step-rebaseline",
  expectedMainSha: "184c0802a3327a1c287634e701206b31dec44b2f",
  expectedCheckpointDigest:
    "ffc574a5f32cd52f2ad8003ffee1dc00ea2d9b52638e880aaaea1a722526959e",
  expectedCheckpointFileSha256:
    "126567d86296f489bc5b522d13b08c510b2bf261e2e7e1792afd2a41d0bbc2f5",
  expectedCheckpointTaskCount: 37,
  expectedRequiredTaskCount: 38,
  expectedFrontierMergeSha: "184c0802a3327a1c287634e701206b31dec44b2f",
  frozenPairHashes: Object.freeze({
    "docs/tasks/0069-publish-and-prove-kyw-dev-0-1-3-through-npm-oidc/TASK.md":
      "53d973f700ce91b3ee4f3c92692c7ba691e622732f36c9cb95f7691ee522e813",
    "docs/tasks/0069-publish-and-prove-kyw-dev-0-1-3-through-npm-oidc/TEST.md":
      "6da2f8f8f4af2734753d4f7adcb9ac357c0b528e3589053bda941612cb283a67",
    "docs/tasks/0070-repair-mixed-attempt-delivery-hydration-0d08b166/TASK.md":
      "98443739a0cb936b669b77a403aca5ae602a6790f05993d88587515cd9b4f99b",
    "docs/tasks/0070-repair-mixed-attempt-delivery-hydration-0d08b166/TEST.md":
      "430c2a3418cae51a330834a562bebd22dd9ff016cd440f24ffb764a2594b6135",
  }),
  mutableAllowlist: Object.freeze([
    "src/core/task-artifact-hydration.mjs",
    "skills/kyw-task/scripts/task-artifacts.mjs",
    "test/task-delivery-hydration.test.mjs",
    "test/task-delivery-continuity.test.mjs",
    "test/kyw-impl.test.mjs",
    "docs/SPEC.md",
    "docs/ARCHITECTURE.md",
    "skills/kyw-impl/references/execution.md",
    "skills/kyw-impl/SKILL.md",
  ]),
});

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
  if ((completeTask(task) || cancelledTask(task)) && requiresStandardDelivery(task)) {
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
export function discoverRequiredStandardDeliveries({
  tasks,
  invocation,
  managedRoutingAvailable = false,
}) {
  const parsed = parseTaskInvocation(invocation, { managedRoutingAvailable });
  if (!parsed.recognized || parsed.mode === "FALLBACK_REQUIRED") return Object.freeze([]);

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const currentTasks = tasks
    .filter((task) => isQueueAwareTaskContractVersion(task.contractVersion))
    .sort((left, right) => left.number - right.number);
  const active = tasks.filter(activeTask);
  const selected = new Map();

  if (parsed.mode === "EXACT") {
    const task = byId.get(parsed.taskId);
    if (!task || (active.length === 1 && active[0].id !== task.id)) {
      return Object.freeze([]);
    }
    if (selectableTask(task)) {
      addSelectionPrerequisites(task, currentTasks, byId, selected);
    } else if (completeTask(task) || cancelledTask(task)) {
      addCompletionClosure(task, byId, selected);
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
  return Object.freeze(
    [...selected.values()].sort((left, right) => left.number - right.number),
  );
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
  const diagnostic = `${result.error?.message ?? ""}\n${result.stderr ?? ""}`.toLowerCase();
  if (result.error?.code === "ETIMEDOUT" || diagnostic.includes("timed out")) return "timeout";
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
  if (result.error?.code === "ENOENT") return "command unavailable";
  return "command failure";
}

export function createInvocationCommandCache({
  runner = defaultCommandRunner,
  maxCommands = MAX_COMMANDS,
} = {}) {
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
    const key = JSON.stringify([command, args, path.resolve(cwd)]);
    if (cache.has(key)) {
      hits += 1;
      return cache.get(key);
    }
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
    if (command === "gh" && args[0] === "api") githubApiCommands += 1;
    if (command === "gh" && args[0] === "run" && args.includes("--log")) {
      jobLogFetches += 1;
    }
    const pending = Promise.resolve(
      runner({
        command,
        args: [...args],
        cwd,
        timeoutMs: COMMAND_TIMEOUT_MS,
        maxBuffer,
      }),
    ).then((result) => {
      if (result?.status !== 0 && !allowFailure) {
        throw hydrationError(
          taskId,
          role,
          `${failureKind(result ?? {})}; required evidence is unavailable`,
          "DELIVERY_HYDRATION_EXTERNAL_FAILURE",
        );
      }
      return Object.freeze({
        status: result?.status,
        stdout: String(result?.stdout ?? ""),
        stderr: String(result?.stderr ?? ""),
        signal: result?.signal,
        error: result?.error,
      });
    });
    cache.set(key, pending);
    return pending;
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
  const contractMarker = `<!-- kyw-task-contract: ${IMMUTABLE_TERMINAL_TASK_CONTRACT_VERSION} -->`;
  const [treeResult, historyPaths] = await Promise.all([
    git(
      commandCache,
      repositoryRoot,
      [
        "grep",
        "-l",
        "-F",
        contractMarker,
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
        `-S${contractMarker}`,
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
      const [
        mergeTaskMarkdown,
        mergeTestMarkdown,
        taskBlobSha,
        testBlobSha,
      ] = await Promise.all([
        showGitFile(cache, repositoryRoot, mergeSha, taskRelative, task.id),
        showGitFile(cache, repositoryRoot, mergeSha, testRelative, task.id),
        gitText(
          cache,
          repositoryRoot,
          ["rev-parse", `${mergeSha}:${taskRelative}`],
          { taskId: task.id, role: "TERMINAL_PAIR_BINDING" },
        ),
        gitText(
          cache,
          repositoryRoot,
          ["rev-parse", `${mergeSha}:${testRelative}`],
          { taskId: task.id, role: "TERMINAL_PAIR_BINDING" },
        ),
      ]);
      if (
        mergeTaskMarkdown !== taskMarkdown ||
        mergeTestMarkdown !== testMarkdown ||
        sectionStatus(mergeTaskMarkdown ?? "") !== "DONE" ||
        sectionStatus(mergeTestMarkdown ?? "") !== "PASSED"
      ) {
        throw hydrationError(
          task.id,
          "TERMINAL_PAIR_BINDING",
          `protected merge ${mergeSha} does not preserve the exact terminal pair from outcome ${outcomeSha}`,
        );
      }
      terminalPair = Object.freeze({
        contractVersion: taskContractVersion,
        directory: pair.directory,
        taskPath: taskRelative,
        testPath: testRelative,
        taskSha256: sha256Text(mergeTaskMarkdown),
        testSha256: sha256Text(mergeTestMarkdown),
        taskBlobSha: requireSha(
          taskBlobSha,
          task.id,
          "TERMINAL_PAIR_BINDING",
          "TASK.md blob",
        ),
        testBlobSha: requireSha(
          testBlobSha,
          task.id,
          "TERMINAL_PAIR_BINDING",
          "TEST.md blob",
        ),
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

function futureTaskMergeSubject(taskId, subject) {
  return new RegExp(
    `^Merge pull request #\\d+ from .*?(?:agent/)?task(?:/|-)${taskId}(?:-|$)`,
  ).test(subject);
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
  return (
    canonical.equals(worktree) ||
    normalizeTerminalArtifactLineEndings(canonical).equals(
      normalizeTerminalArtifactLineEndings(worktree),
    )
  );
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
      !/^[ MADRCU?!]{2}$/u.test(code) ||
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
  const worktreePairIssues = [];
  const equivalentPairPaths = new Set();
  for (const [relativePath, expectedBlobSha] of [
    [pair.taskPath, pair.taskBlobSha],
    [pair.testPath, pair.testBlobSha],
  ]) {
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
    if (
      !terminalArtifactNewlineEquivalent(
        Buffer.from(canonicalBlob.stdout, "utf8"),
        worktreeBytes,
      )
    ) {
      worktreePairIssues.push(
        Object.freeze({
          path: relativePath,
          detail: "terminal artifact bytes differ from the canonical merge",
        }),
      );
      continue;
    }
    equivalentPairPaths.add(relativePath);
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
            equivalentPairPaths.has(matched.relativePath);
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
          futureTaskMergeSubject(task.id, record.subject),
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
      `another Task-scoped protected merge ${drift.additionalDeliveries[0].mergeSha} follows the canonical delivery`,
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
  commandCache,
  githubClient,
  allowBootstrapWorktreeCheckpoint,
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
  let source = "ALIGNED_MAIN";
  let bytes = mainBytes;
  if (bytes === undefined && allowBootstrapWorktreeCheckpoint) {
    const worktreePath = path.join(
      path.resolve(tasksRoot),
      STANDARD_DELIVERY_CONTINUITY_FILE,
    );
    let state;
    try {
      state = await lstat(worktreePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (!state || state.isSymbolicLink() || !state.isFile()) {
      throw hydrationError(
        undefined,
        "CHECKPOINT_BOOTSTRAP",
        "explicit bootstrap checkpoint is missing or unsafe",
        "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
      );
    }
    bytes = await readFile(worktreePath, "utf8");
    source = "EXPLICIT_BOOTSTRAP_WORKTREE";
  }
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
  if (
    source === "EXPLICIT_BOOTSTRAP_WORKTREE" &&
    checkpoint.sourceMainSha !== identity.currentMainSha
  ) {
    throw hydrationError(
      undefined,
      "CHECKPOINT_BOOTSTRAP",
      "bootstrap checkpoint source main is stale",
    );
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
  let coveragePartition;
  try {
    coveragePartition = partitionStandardDeliveryContinuity({
      checkpoint,
      requiredTasks: effectiveCoverageTasks,
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
    }
  }
  const coverageTaskIds = new Set(
    effectiveCoverageTasks.map((task) => task.id),
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
  if (partition.uncoveredTasks.length > 1) {
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
          const absolutePath = path.resolve(
            identity.repositoryRoot,
            relativePath,
          );
          let worktreeState;
          try {
            worktreeState = await lstat(absolutePath);
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
          if (
            !worktreeState ||
            worktreeState.isSymbolicLink() ||
            !worktreeState.isFile()
          ) {
            throw immutableTerminalPairError(
              covered.task.id,
              relativePath,
              "worktree artifact is missing, linked, or an unsupported type",
            );
          }
          const [canonicalBlobSha, worktreeBlobSha] = await Promise.all([
            gitText(
              commandCache,
              identity.repositoryRoot,
              ["rev-parse", `${checkpoint.sourceMainSha}:${relativePath}`],
              {
                taskId: covered.task.id,
                role: "CHECKPOINT_PAIR_STATE",
              },
            ),
            gitText(
              commandCache,
              identity.repositoryRoot,
              ["hash-object", `--path=${relativePath}`, absolutePath],
              {
                taskId: covered.task.id,
                role: "CHECKPOINT_PAIR_STATE",
              },
            ),
          ]);
          if (worktreeBlobSha !== canonicalBlobSha) {
            throw immutableTerminalPairError(
              covered.task.id,
              relativePath,
              "worktree bytes shadow the checkpoint-bound canonical terminal artifact",
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
        .find(Boolean);
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
  return Object.freeze({
    checkpoint,
    partition,
    coveragePartition,
    coverageTasks: effectiveCoverageTasks,
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

export function createGitHubEvidenceClient({
  repository,
  repositoryRoot,
  commandCache,
}) {
  async function api(endpoint, { taskId, role }) {
    const result = await commandCache.run({
      command: "gh",
      args: ["api", "--method", "GET", endpoint],
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
          repository,
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
  const postRun = validateRun(normalizeRun(snapshot.postMergeRun), {
    taskId: outcome.taskId,
    role: "POST_MERGE_MAIN",
    repository,
    workflow: workflowContract.workflow,
    event: "push",
    branch: outcome.baseRef,
    sha: outcome.mergeSha,
  });
  if (postRun.id === prRun.id) {
    throw hydrationError(
      outcome.taskId,
      "POST_MERGE_MAIN",
      "post-main run must be distinct from the pull-request run",
    );
  }

  const prJobs = (snapshot.pullRequestJobs ?? []).map((job) => normalizeJob(job));
  const postJobs = (snapshot.postMergeJobs ?? []).map((job) => normalizeJob(job));
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
    mergeCompatibility: {
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
    },
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

async function collectHardenedSnapshot({
  client,
  outcome,
  workflowContract,
  rawPullRequest,
  reviews,
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
  const selectedPrRun = newestRun(exactPrRuns, outcome.taskId, "PR_ACTUAL_HEAD");
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
  const selectedPostRun = newestRun(postRuns, outcome.taskId, "POST_MERGE_MAIN");
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
    ...prRuns.map((run) => runSummary(run, outcome.taskId, "PR_RUN")),
    ...prAttemptState.attempts.map((run) =>
      runSummary(run, outcome.taskId, "PR_ATTEMPT"),
    ),
    ...postAttemptState.attempts.map((run) =>
      runSummary(run, outcome.taskId, "POST_MAIN_ATTEMPT"),
    ),
    ...prJobState.chronology,
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
  transitionToken,
  commandRunner,
  queueInspector = inspectTaskQueue,
} = {}) {
  let prepared;
  try {
    prepared = parseStandardDeliveryContinuityTransitionToken(transitionToken);
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
  const queue = await queueInspector(resolvedTasksRoot);
  if (!isRecord(queue) || !Array.isArray(queue.tasks) || !Array.isArray(queue.errors)) {
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
  const selectedTask = queue.tasks.find((task) => task.id === selectedTaskId);
  if (
    !selectedTask ||
    selectedTask.taskStatus !== "IN_PROGRESS" ||
    selectedTask.testStatus !== "RUNNING"
  ) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      "selected Task must own the active IN_PROGRESS/RUNNING lifecycle",
    );
  }
  const requiredTasks = discoverRequiredStandardDeliveries({
    tasks: queue.tasks,
    invocation: `$kyw-impl ${selectedTaskId}`,
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

  const commandCache = createInvocationCommandCache({ runner: commandRunner });
  const repositoryRoot = await gitText(
    commandCache,
    resolvedTasksRoot,
    ["rev-parse", "--show-toplevel"],
    { taskId: selectedTaskId, role: "CHECKPOINT_APPLY" },
  );
  if (!(await tasksRootMatchesRepository(resolvedTasksRoot, repositoryRoot))) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      "tasks root must be the repository docs/tasks directory",
    );
  }
  const [
    currentBranch,
    currentMainSha,
    currentHeadSha,
    upstreamSha,
    cachedMainSha,
    originUrl,
  ] = await Promise.all([
    gitText(commandCache, repositoryRoot, ["branch", "--show-current"], {
      taskId: selectedTaskId,
      role: "CHECKPOINT_APPLY",
    }),
    gitText(commandCache, repositoryRoot, ["rev-parse", "refs/heads/main"], {
      taskId: selectedTaskId,
      role: "CHECKPOINT_APPLY",
    }),
    gitText(commandCache, repositoryRoot, ["rev-parse", "HEAD"], {
      taskId: selectedTaskId,
      role: "CHECKPOINT_APPLY",
    }),
    gitText(commandCache, repositoryRoot, ["rev-parse", "main@{upstream}"], {
      taskId: selectedTaskId,
      role: "CHECKPOINT_APPLY",
    }),
    gitText(
      commandCache,
      repositoryRoot,
      ["rev-parse", "refs/remotes/origin/main"],
      {
        taskId: selectedTaskId,
        role: "CHECKPOINT_APPLY",
      },
    ),
    gitText(commandCache, repositoryRoot, ["remote", "get-url", "origin"], {
      taskId: selectedTaskId,
      role: "CHECKPOINT_APPLY",
    }),
  ]);
  const branchPattern = new RegExp(
    `(?:^|/)task(?:/|-)${selectedTaskId}(?:-|$)`,
  );
  if (currentBranch === "main" || !branchPattern.test(currentBranch)) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      "current branch does not prove selected-Task ownership",
    );
  }
  if (currentMainSha !== prepared.checkpoint.sourceMainSha) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      "local main advanced after checkpoint preparation",
    );
  }
  if (upstreamSha !== currentMainSha || cachedMainSha !== currentMainSha) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      "local main, upstream, and cached origin/main no longer align",
    );
  }
  if (parseRepositorySlug(originUrl) !== prepared.checkpoint.repository) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      "repository identity changed after checkpoint preparation",
    );
  }
  if (
    !(await gitIsAncestor(
      commandCache,
      repositoryRoot,
      currentMainSha,
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
      repositoryRoot,
      prepared.checkpoint.coveredMainSha,
      currentMainSha,
    ))
  ) {
    throw hydrationError(
      selectedTaskId,
      "CHECKPOINT_APPLY",
      "covered main is not an ancestor of prepared source main",
    );
  }
  const bytes = `${JSON.stringify(prepared.checkpoint, null, 2)}\n`;
  const write = await writeStandardDeliveryContinuityCheckpoint({
    tasksRoot: resolvedTasksRoot,
    bytes,
  });
  return Object.freeze({
    selectedTaskId,
    currentBranch,
    currentMainSha,
    currentHeadSha,
    checkpointDigest: prepared.checkpoint.checkpointDigest,
    coveredTaskCount: prepared.checkpoint.coverage.taskCount,
    write,
    cache: commandCache.details(),
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

async function readExactRegularText(target, taskId, role) {
  let state;
  try {
    state = await lstat(target);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw hydrationError(taskId, role, `${target} is missing`);
    }
    throw error;
  }
  if (state.isSymbolicLink() || !state.isFile()) {
    throw hydrationError(taskId, role, `${target} is not a real regular file`);
  }
  return readFile(target, "utf8");
}

export function parseFrozenPreDispatchStatus(statusText, taskId) {
  if (typeof statusText !== "string") {
    throw hydrationError(
      taskId,
      "EXPLICIT_REBASELINE",
      "pre-dispatch worktree status is malformed or contains a rename",
    );
  }
  if (statusText.length === 0) return Object.freeze([]);

  const framedStatus = stripFinalGitCommandDelimiter(statusText);
  if (framedStatus.length === 0) {
    throw hydrationError(
      taskId,
      "EXPLICIT_REBASELINE",
      "pre-dispatch worktree status is malformed or contains a rename",
    );
  }
  const entries = [];
  for (const line of framedStatus.split(/\r?\n/)) {
    if (
      line.length < 4 ||
      line[2] !== " " ||
      line.includes("\r") ||
      line.includes("\0") ||
      line.includes(" -> ")
    ) {
      throw hydrationError(
        taskId,
        "EXPLICIT_REBASELINE",
        "pre-dispatch worktree status is malformed or contains a rename",
      );
    }
    const code = line.slice(0, 2);
    if (
      code === "  " ||
      !/^[ MADRCU?!]{2}$/u.test(code) ||
      (code.includes("?") && code !== "??") ||
      (code.includes("!") && code !== "!!")
    ) {
      throw hydrationError(
        taskId,
        "EXPLICIT_REBASELINE",
        "pre-dispatch worktree status is malformed or contains a rename",
      );
    }
    const relativePath = line.slice(3);
    if (
      relativePath.startsWith('"') ||
      path.isAbsolute(relativePath) ||
      relativePath === ".." ||
      relativePath.startsWith("../") ||
      relativePath.startsWith("..\\")
    ) {
      throw hydrationError(
        taskId,
        "EXPLICIT_REBASELINE",
        "pre-dispatch worktree path is unsafe",
      );
    }
    entries.push(Object.freeze({ code, relativePath }));
  }
  return Object.freeze(entries);
}

export function validateTask0070FrozenWorktreeStatus(statusText) {
  const contract = TASK_0070_EXPLICIT_REBASELINE;
  const frozenPairPaths = new Set(
    Object.keys(contract.frozenPairHashes).filter((relativePath) =>
      relativePath.includes("/0070-"),
    ),
  );
  const mutableAllowlist = new Set(contract.mutableAllowlist);
  const statusEntries = parseFrozenPreDispatchStatus(
    statusText,
    contract.selectedTaskId,
  );
  const observedFrozenPairs = new Set();
  for (const entry of statusEntries) {
    if (frozenPairPaths.has(entry.relativePath)) {
      if (entry.code !== "??") {
        throw hydrationError(
          contract.selectedTaskId,
          "EXPLICIT_REBASELINE",
          "Task 0070 pair must remain untracked and byte-frozen before selection",
        );
      }
      observedFrozenPairs.add(entry.relativePath);
      continue;
    }
    if (!mutableAllowlist.has(entry.relativePath) || entry.code !== " M") {
      throw hydrationError(
        contract.selectedTaskId,
        "EXPLICIT_REBASELINE",
        `pre-dispatch change is outside the frozen allowlist: ${entry.relativePath}`,
      );
    }
  }
  if (
    observedFrozenPairs.size !== frozenPairPaths.size ||
    [...frozenPairPaths].some(
      (relativePath) => !observedFrozenPairs.has(relativePath),
    )
  ) {
    throw hydrationError(
      contract.selectedTaskId,
      "EXPLICIT_REBASELINE",
      "both frozen Task 0070 pair files must be present before selection",
    );
  }
  return statusEntries;
}

async function validateTask0070ExplicitRebaselineBootstrap({
  tasksRoot,
  invocation,
  managedRoutingAvailable,
  queue,
  requiredTasks,
  commandCache,
}) {
  const contract = TASK_0070_EXPLICIT_REBASELINE;
  const parsed = parseTaskInvocation(invocation, { managedRoutingAvailable });
  if (
    !parsed.recognized ||
    parsed.mode !== "EXACT" ||
    parsed.source !== "PORTABLE_SKILL" ||
    parsed.taskId !== contract.selectedTaskId ||
    managedRoutingAvailable
  ) {
    throw hydrationError(
      contract.selectedTaskId,
      "EXPLICIT_REBASELINE",
      "limited bootstrap requires the exact portable Task 0070 invocation",
      "MIGRATION_AUTHORITY_REQUIRED",
    );
  }
  const selectedTask = queue.tasks.find(
    (task) => task.id === contract.selectedTaskId,
  );
  const frontierTask = queue.tasks.find(
    (task) => task.id === contract.frontierTaskId,
  );
  if (
    !selectedTask ||
    selectedTask.taskStatus !== "READY" ||
    selectedTask.testStatus !== "READY" ||
    selectedTask.contractVersion !==
      IMMUTABLE_TERMINAL_TASK_CONTRACT_VERSION ||
    selectedTask.dependencies?.length !== 1 ||
    selectedTask.dependencies[0] !== contract.priorTaskId
  ) {
    throw hydrationError(
      contract.selectedTaskId,
      "EXPLICIT_REBASELINE",
      "Task 0070 must remain the exact READY/READY correction pair",
    );
  }
  if (
    !frontierTask ||
    !completeTask(frontierTask) ||
    !requiresStandardDelivery(frontierTask)
  ) {
    throw hydrationError(
      contract.frontierTaskId,
      "EXPLICIT_REBASELINE",
      "Task 0069 must remain the sole terminal STANDARD frontier",
    );
  }
  if (
    requiredTasks.length !== contract.expectedRequiredTaskCount ||
    requiredTasks.at(-2)?.id !== contract.priorTaskId ||
    requiredTasks.at(-1)?.id !== contract.frontierTaskId
  ) {
    throw hydrationError(
      contract.selectedTaskId,
      "EXPLICIT_REBASELINE",
      "required STANDARD history is not the exact Task 0068 to 0069 frontier",
      "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
    );
  }

  const requestedRoot = path.resolve(tasksRoot);
  const repositoryRoot = await gitScalarText(
    commandCache,
    requestedRoot,
    ["rev-parse", "--show-toplevel"],
    { taskId: contract.selectedTaskId, role: "EXPLICIT_REBASELINE" },
  );
  if (!(await tasksRootMatchesRepository(requestedRoot, repositoryRoot))) {
    throw hydrationError(
      contract.selectedTaskId,
      "EXPLICIT_REBASELINE",
      "tasks root must be the repository docs/tasks directory",
    );
  }
  const [branch, headSha, mainSha, statusText] = await Promise.all([
    gitScalarText(commandCache, repositoryRoot, ["branch", "--show-current"], {
      taskId: contract.selectedTaskId,
      role: "EXPLICIT_REBASELINE",
    }),
    gitScalarText(commandCache, repositoryRoot, ["rev-parse", "HEAD"], {
      taskId: contract.selectedTaskId,
      role: "EXPLICIT_REBASELINE",
    }),
    gitScalarText(commandCache, repositoryRoot, ["rev-parse", "refs/heads/main"], {
      taskId: contract.selectedTaskId,
      role: "EXPLICIT_REBASELINE",
    }),
    gitPorcelainText(
      commandCache,
      repositoryRoot,
      ["status", "--porcelain=v1", "--untracked-files=all"],
      { taskId: contract.selectedTaskId, role: "EXPLICIT_REBASELINE" },
    ),
  ]);
  exact(
    branch,
    contract.expectedBranch,
    contract.selectedTaskId,
    "EXPLICIT_REBASELINE",
    "active branch",
  );
  exact(
    headSha,
    contract.expectedMainSha,
    contract.selectedTaskId,
    "EXPLICIT_REBASELINE",
    "pre-dispatch HEAD",
  );
  exact(
    mainSha,
    contract.expectedMainSha,
    contract.selectedTaskId,
    "EXPLICIT_REBASELINE",
    "local main",
  );

  validateTask0070FrozenWorktreeStatus(statusText);

  for (const [relativePath, expectedHash] of Object.entries(
    contract.frozenPairHashes,
  )) {
    const bytes = await readExactRegularText(
      path.join(repositoryRoot, ...relativePath.split("/")),
      contract.selectedTaskId,
      "EXPLICIT_REBASELINE",
    );
    exact(
      sha256Text(bytes),
      expectedHash,
      contract.selectedTaskId,
      "EXPLICIT_REBASELINE",
      `${relativePath} SHA-256`,
    );
  }
  const checkpointBytes = await readExactRegularText(
    path.join(requestedRoot, STANDARD_DELIVERY_CONTINUITY_FILE),
    contract.selectedTaskId,
    "EXPLICIT_REBASELINE",
  );
  exact(
    sha256Text(checkpointBytes),
    contract.expectedCheckpointFileSha256,
    contract.selectedTaskId,
    "EXPLICIT_REBASELINE",
    "checkpoint file SHA-256",
  );
  const checkpoint = parseStandardDeliveryContinuityCheckpoint(checkpointBytes);
  exact(
    checkpoint.checkpointDigest,
    contract.expectedCheckpointDigest,
    contract.selectedTaskId,
    "EXPLICIT_REBASELINE",
    "checkpoint digest",
  );
  exact(
    checkpoint.coverage.taskCount,
    contract.expectedCheckpointTaskCount,
    contract.selectedTaskId,
    "EXPLICIT_REBASELINE",
    "checkpoint task count",
  );
  exact(
    checkpoint.coverage.lastTaskId,
    contract.priorTaskId,
    contract.selectedTaskId,
    "EXPLICIT_REBASELINE",
    "checkpoint last Task",
  );
  return contract;
}

export async function hydratePriorStandardDeliveries({
  tasksRoot,
  invocation,
  managedRoutingAvailable = false,
  commandRunner,
  queueInspector = inspectTaskQueue,
  localDiscovery = discoverLocalDeliveryOutcomes,
  githubClient,
  allowBootstrapWorktreeCheckpoint = false,
  continuityBootstrapAuthority,
  allowUncheckpointedCompatibility = false,
  continuityLoader = loadTrustedStandardDeliveryContinuity,
  emptyContinuityPreparer = prepareEmptyHistoryStandardDeliveryContinuity,
  deliveryCollector = collectNormalizedDeliveryOutcomes,
  continuityRecordBuilder = buildContinuityCoveredRecord,
  explicitRebaselineValidator =
    validateTask0070ExplicitRebaselineBootstrap,
  _skipImmutableTerminalFallback = false,
} = {}) {
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
        commandRunner,
        queueInspector: async () => fallbackQueue,
        localDiscovery,
        githubClient,
        allowBootstrapWorktreeCheckpoint,
        continuityBootstrapAuthority,
        allowUncheckpointedCompatibility,
        continuityLoader,
        emptyContinuityPreparer,
        deliveryCollector,
        continuityRecordBuilder,
        explicitRebaselineValidator,
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
  const requiredTasks = discoverRequiredStandardDeliveries({
    tasks: queue.tasks,
    invocation,
    managedRoutingAvailable,
  });
  const parsedInvocation = parseTaskInvocation(invocation, {
    managedRoutingAvailable,
  });
  const task0070 = queue.tasks.find(
    (task) => task.id === TASK_0070_EXPLICIT_REBASELINE.selectedTaskId,
  );
  const limitedBootstrapPending =
    parsedInvocation.recognized &&
    parsedInvocation.mode === "EXACT" &&
    parsedInvocation.taskId ===
      TASK_0070_EXPLICIT_REBASELINE.selectedTaskId &&
    task0070?.taskStatus === "READY" &&
    task0070?.testStatus === "READY";
  if (
    continuityBootstrapAuthority !== undefined &&
    continuityBootstrapAuthority !==
      TASK_0070_EXPLICIT_REBASELINE.authority
  ) {
    throw hydrationError(
      TASK_0070_EXPLICIT_REBASELINE.selectedTaskId,
      "EXPLICIT_REBASELINE",
      "limited bootstrap requires EXPLICIT_REBASELINE authority",
      "MIGRATION_AUTHORITY_REQUIRED",
    );
  }
  if (
    limitedBootstrapPending &&
    continuityBootstrapAuthority !==
      TASK_0070_EXPLICIT_REBASELINE.authority
  ) {
    throw hydrationError(
      TASK_0070_EXPLICIT_REBASELINE.selectedTaskId,
      "EXPLICIT_REBASELINE",
      "the READY Task 0070 correction requires separate explicit rebaseline authority",
      "MIGRATION_AUTHORITY_REQUIRED",
    );
  }
  if (requiredTasks.length === 0) {
    await rethrowProvenImmutableTerminalDrift();
    if (!allowUncheckpointedCompatibility) {
      const commandCache = createInvocationCommandCache({
        runner: commandRunner,
      });
      const empty = await emptyContinuityPreparer({
        tasksRoot: path.resolve(tasksRoot),
        commandCache,
      });
      const metrics = commandCache.details();
      return freezeHydrationResult({
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
      });
    }
    return freezeHydrationResult({
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
    });
  }

  if (!allowUncheckpointedCompatibility) {
    const commandCache = createInvocationCommandCache({ runner: commandRunner });
    const explicitRebaselineContract =
      continuityBootstrapAuthority ===
      TASK_0070_EXPLICIT_REBASELINE.authority
        ? await explicitRebaselineValidator({
            tasksRoot: path.resolve(tasksRoot),
            invocation,
            managedRoutingAvailable,
            queue,
            requiredTasks,
            commandCache,
          })
        : undefined;
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
      commandCache,
      githubClient,
      allowBootstrapWorktreeCheckpoint,
    });
    if (explicitRebaselineContract) {
      exact(
        continuity.source,
        "ALIGNED_MAIN",
        explicitRebaselineContract.selectedTaskId,
        "EXPLICIT_REBASELINE",
        "checkpoint source",
      );
      exact(
        continuity.checkpoint.checkpointDigest,
        explicitRebaselineContract.expectedCheckpointDigest,
        explicitRebaselineContract.selectedTaskId,
        "EXPLICIT_REBASELINE",
        "trusted checkpoint digest",
      );
      exact(
        continuity.checkpoint.coverage.taskCount,
        explicitRebaselineContract.expectedCheckpointTaskCount,
        explicitRebaselineContract.selectedTaskId,
        "EXPLICIT_REBASELINE",
        "trusted checkpoint task count",
      );
      exact(
        continuity.checkpoint.coverage.lastTaskId,
        explicitRebaselineContract.priorTaskId,
        explicitRebaselineContract.selectedTaskId,
        "EXPLICIT_REBASELINE",
        "trusted checkpoint last Task",
      );
    }
    const coveredState = buildStandardDeliveryContinuityState({
      checkpoint: continuity.checkpoint,
      coveredTasks: continuity.partition.coveredTasks,
      coverageTasks: continuity.coverageTasks ?? coverageTasks,
    });
    for (const task of continuity.partition.coveredTasks) {
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
    if (
      explicitRebaselineContract &&
      (uncoveredTasks.length !== 1 ||
        uncoveredTasks[0]?.id !==
          explicitRebaselineContract.frontierTaskId)
    ) {
      throw hydrationError(
        explicitRebaselineContract.selectedTaskId,
        "EXPLICIT_REBASELINE",
        "limited bootstrap requires exactly the Task 0069 uncovered frontier",
        "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
      );
    }
    if (uncoveredTasks.length > 1) {
      throw hydrationError(
        undefined,
        "CHECKPOINT",
        `checkpoint gap ${uncoveredTasks.length} requires explicit migration/rebaseline`,
        "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
      );
    }
    if (uncoveredTasks.length === 1) {
      freshLocal = await localDiscovery({
        tasksRoot: path.resolve(tasksRoot),
        requiredTasks: uncoveredTasks,
        contractTasks: uncoveredTasks,
        commandCache,
      });
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
      fresh = await deliveryCollector({
        local: freshLocal,
        commandCache,
        githubClient: continuity.identity.githubClient,
      });
      const uncoveredTask = uncoveredTasks[0];
      const outcome = freshLocal.outcomes[0];
      const freshEvaluation = evaluateDeliveryEvidence(
        uncoveredTask.id,
        fresh.deliveryLedger[uncoveredTask.id],
        fresh.deliveryExpectations[uncoveredTask.id],
      );
      if (!freshEvaluation.satisfied) {
        throw hydrationError(
          uncoveredTask.id,
          "HARDENED_EXACT_HEAD",
          `production evaluator rejected uncovered evidence: ${freshEvaluation.issues.join("; ")}`,
        );
      }
      if (
        explicitRebaselineContract &&
        freshEvaluation.classification !== "HARDENED_EXACT_HEAD"
      ) {
        throw hydrationError(
          uncoveredTask.id,
          "EXPLICIT_REBASELINE",
          "fresh production evaluator verdict must be HARDENED_EXACT_HEAD",
        );
      }
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
      if (explicitRebaselineContract) {
        exact(
          preparedCheckpoint.previousCheckpointDigest,
          explicitRebaselineContract.expectedCheckpointDigest,
          explicitRebaselineContract.selectedTaskId,
          "EXPLICIT_REBASELINE",
          "prepared previous checkpoint digest",
        );
        exact(
          preparedCheckpoint.coverage.taskCount,
          explicitRebaselineContract.expectedCheckpointTaskCount + 1,
          explicitRebaselineContract.selectedTaskId,
          "EXPLICIT_REBASELINE",
          "prepared checkpoint task count",
        );
        exact(
          preparedCheckpoint.coverage.lastTaskId,
          explicitRebaselineContract.frontierTaskId,
          explicitRebaselineContract.selectedTaskId,
          "EXPLICIT_REBASELINE",
          "prepared checkpoint last Task",
        );
        exact(
          preparedCheckpoint.coveredMainSha,
          explicitRebaselineContract.expectedFrontierMergeSha,
          explicitRebaselineContract.selectedTaskId,
          "EXPLICIT_REBASELINE",
          "prepared checkpoint covered main",
        );
      }
    }
    const classifications = Object.fromEntries(
      continuity.partition.coveredTasks.map((task) => [
        task.id,
        "DURABLE_STANDARD_CONTINUITY",
      ]),
    );
    Object.assign(classifications, fresh.classifications);
    const metrics = commandCache.details();
    return freezeHydrationResult({
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
            uncoveredTasks.map((task) => task.id),
          ),
          freshEvidenceTaskCount: uncoveredTasks.length,
          preparedAdvancement: Boolean(preparedCheckpoint),
          fullHistoryFallback: false,
        }),
        ...(explicitRebaselineContract
          ? {
              explicitRebaseline: Object.freeze({
                authority: explicitRebaselineContract.authority,
                selectedTaskId: explicitRebaselineContract.selectedTaskId,
                priorTaskId: explicitRebaselineContract.priorTaskId,
                frontierTaskId: explicitRebaselineContract.frontierTaskId,
                evaluatorVerdict: "HARDENED_EXACT_HEAD",
                preparedCheckpointDigest:
                  preparedCheckpoint.checkpointDigest,
                checkpointWritten: false,
              }),
            }
          : {}),
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
    });
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

  return freezeHydrationResult({
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
  });
}
