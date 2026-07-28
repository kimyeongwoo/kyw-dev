import { spawnSync } from "node:child_process";
import path from "node:path";

import { evaluateDeliveryEvidence, parseTaskInvocation } from "./task-artifact-delivery.mjs";
import { inspectTaskQueue } from "./task-artifact-queue.mjs";
import { TaskArtifactError } from "./task-artifact-shared.mjs";
import { CURRENT_TASK_CONTRACT_VERSION } from "./template-contracts.mjs";

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

function hydrationError(taskId, role, message, code = "DELIVERY_HYDRATION_FAILED") {
  const taskLabel = taskId ? `Task ${taskId}` : "delivery hydration";
  const roleLabel = role ? ` ${role}` : "";
  return new TaskArtifactError(code, `${taskLabel}${roleLabel}: ${message}`);
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
  if (task.contractVersion !== CURRENT_TASK_CONTRACT_VERSION) return;
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
    .filter((task) => task.contractVersion === CURRENT_TASK_CONTRACT_VERSION)
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

async function discoverTaskOutcome(cache, repositoryRoot, currentMainSha, task, indexBySha) {
  const taskRelative = path
    .relative(repositoryRoot, task.taskPath)
    .replaceAll("\\", "/");
  const testRelative = path
    .relative(repositoryRoot, task.testPath)
    .replaceAll("\\", "/");
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
    return Object.freeze({
      taskId: task.id,
      directory: task.name,
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
    });
  }
  throw hydrationError(
    task.id,
    "LOCAL_GIT",
    "could not map the terminal pair to an exact two-parent Task delivery merge",
  );
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
  if (
    path.resolve(repositoryRoot, "docs", "tasks").toLowerCase() !==
    requestedRoot.toLowerCase()
  ) {
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

  const firstParentText = await gitText(
    commandCache,
    repositoryRoot,
    [
      "rev-list",
      "--first-parent",
      `--max-count=${MAX_FIRST_PARENT_COMMITS + 1}`,
      currentMainSha,
    ],
    { role: "LOCAL_GIT" },
  );
  const newestFirst = firstParentText ? firstParentText.split(/\r?\n/) : [];
  if (newestFirst.length > MAX_FIRST_PARENT_COMMITS) {
    throw hydrationError(
      undefined,
      "LOCAL_GIT",
      `first-parent history exceeds bound ${MAX_FIRST_PARENT_COMMITS}`,
      "DELIVERY_HYDRATION_BOUND_EXCEEDED",
    );
  }
  const indexBySha = new Map(
    [...newestFirst].reverse().map((sha, index) => [sha, index]),
  );
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
    pullRequestNumbers: Array.isArray(raw?.pull_requests)
      ? raw.pull_requests.map((pullRequest) => Number(pullRequest?.number))
      : Array.isArray(raw?.pullRequestNumbers)
        ? raw.pullRequestNumbers.map(Number)
        : [],
  };
}

function normalizeJob(raw, { runAttempt, evidence } = {}) {
  return {
    id: Number(raw?.id),
    runId: Number(apiField(raw, "runId", "run_id")),
    runAttempt: Number(
      runAttempt ?? apiField(raw, "runAttempt", "run_attempt"),
    ),
    name: raw?.name,
    headSha: apiField(raw, "headSha", "head_sha"),
    status: String(raw?.status ?? "").toLowerCase(),
    conclusion: String(raw?.conclusion ?? "").toLowerCase(),
    evidence: evidence ?? raw?.evidence,
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
    async listJobs(runId, attempt, context = {}) {
      return listCounted(
        `repos/${repository}/actions/runs/${runId}/attempts/${attempt}/jobs`,
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
  if (!positiveInteger(job.id)) {
    throw hydrationError(taskId, role, "job ID must be a positive integer");
  }
  exact(job.runId, run.id, taskId, role, "job run ID");
  exact(job.runAttempt, run.runAttempt, taskId, role, "job run attempt");
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
    String(run.runAttempt),
    taskId,
    role,
    "evidence run attempt",
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
    attempts.push(normalized);
  }
  return Object.freeze({ accepted: attempts.at(-1), attempts: Object.freeze(attempts) });
}

async function attachJobEvidence({
  client,
  rawJobs,
  run,
  names,
  taskId,
  role,
}) {
  const normalized = rawJobs.map((job) =>
    normalizeJob(job, { runAttempt: run.runAttempt }),
  );
  for (const name of names) {
    const job = findExactJob(normalized, name, taskId, role);
    const rawLog = await client.getJobLog(run.id, run.runAttempt, job.id, {
      taskId,
      role: `${role}:${name}`,
    });
    let evidence;
    try {
      evidence = parseKywCiEvidence(rawLog);
    } catch (error) {
      throw hydrationError(
        taskId,
        `${role}:${name}`,
        error instanceof Error ? error.message.replace(/^delivery hydration JOB_LOG:\s*/, "") : "job log is malformed",
      );
    }
    job.evidence = evidence;
  }
  return normalized;
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
  const rawPrJobs = await client.listJobs(
    acceptedPrRun.id,
    acceptedPrRun.runAttempt,
    { taskId: outcome.taskId, role: "PR_ACCEPTED_JOBS" },
  );
  const pullRequestJobs = await attachJobEvidence({
    client,
    rawJobs: rawPrJobs,
    run: acceptedPrRun,
    names: [
      ...workflowContract.actualHeadJobs,
      workflowContract.mergeCompatibilityJob,
    ],
    taskId: outcome.taskId,
    role: "PR_ACCEPTED_JOB_LOG",
  });
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
  const rawPostJobs = await client.listJobs(
    acceptedPostRun.id,
    acceptedPostRun.runAttempt,
    { taskId: outcome.taskId, role: "POST_MAIN_ACCEPTED_JOBS" },
  );
  const postMergeJobs = await attachJobEvidence({
    client,
    rawJobs: rawPostJobs,
    run: acceptedPostRun,
    names: workflowContract.postMergeJobs,
    taskId: outcome.taskId,
    role: "POST_MAIN_JOB_LOG",
  });

  const chronology = [
    ...prRuns.map((run) => runSummary(run, outcome.taskId, "PR_RUN")),
    ...prAttemptState.attempts.map((run) =>
      runSummary(run, outcome.taskId, "PR_ATTEMPT"),
    ),
    ...postAttemptState.attempts.map((run) =>
      runSummary(run, outcome.taskId, "POST_MAIN_ATTEMPT"),
    ),
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
}) {
  return Object.freeze({
    deliveryLedger: Object.freeze(deliveryLedger),
    deliveryExpectations: Object.freeze(deliveryExpectations),
    diagnostics: Object.freeze(diagnostics),
  });
}

export async function hydratePriorStandardDeliveries({
  tasksRoot,
  invocation,
  managedRoutingAvailable = false,
  commandRunner,
  queueInspector = inspectTaskQueue,
  localDiscovery = discoverLocalDeliveryOutcomes,
  githubClient,
} = {}) {
  const queue = await queueInspector(path.resolve(tasksRoot));
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

  const commandCache = createInvocationCommandCache({ runner: commandRunner });
  const contractTasks = queue.tasks
    .filter(
      (task) =>
        task.contractVersion === CURRENT_TASK_CONTRACT_VERSION &&
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
    const observedOutcome = Object.freeze({ ...outcome, headRef: observedHeadRef });
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
        workflow: Object.freeze({ id: workflow.id, name: workflow.name, path: workflow.path }),
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

  return freezeHydrationResult({
    deliveryLedger,
    deliveryExpectations,
    diagnostics: {
      requiredTaskIds: Object.freeze(requiredTasks.map((task) => task.id)),
      classifications: Object.freeze(classifications),
      chronology: Object.freeze(chronology),
      identities: Object.freeze({
        repository: local.repository,
        localMainSha: local.currentMainSha,
        upstreamSha: local.upstreamSha,
        cachedMainSha: local.cachedMainSha,
        directRemoteSha: local.directRemoteSha,
        githubMainSha,
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
