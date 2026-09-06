import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { parseTaskInvocation } from "./task-artifact-delivery.mjs";

const shaPattern = /^[0-9a-f]{40}$/u;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const acceptedStates = new Set(["CLEAN", "UNSTABLE", "HAS_HOOKS"]);
const checks = `statusCheckRollup { contexts(first: 100) {
  totalCount pageInfo { hasNextPage } nodes { __typename
    ... on CheckRun { id name status conclusion detailsUrl isRequired(pullRequestNumber: $number)
      checkSuite { app { databaseId slug } } }
    ... on StatusContext { id context state targetUrl isRequired(pullRequestNumber: $number)
      creator { login } }
  }
} }`;
const query = `query KywPullRequest($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) { nameWithOwner
    pullRequest(number: $number) {
      id number url state isDraft headRefOid headRefName headRepository { nameWithOwner }
      baseRefName baseRefOid mergeable mergeStateStatus reviewDecision
      isMergeQueueEnabled isInMergeQueue autoMergeRequest { enabledAt } mergeCommit { oid }
      commits(last: 1) { nodes { commit { oid ${checks} } } }
      potentialMergeCommit { oid parents(first: 2) { nodes { oid } } ${checks} }
    }
  }
}`;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function validateTarget(target) {
  if (!repositoryPattern.test(target.repository ?? "") ||
      !Number.isSafeInteger(target.prNumber) || target.prNumber < 1 ||
      !shaPattern.test(target.headSha ?? "") || !shaPattern.test(target.baseSha ?? "") ||
      typeof target.baseBranch !== "string" || !target.baseBranch.trim()) {
    fail("PR_TARGET_INVALID", "An exact repository, PR number, head SHA, base branch and base SHA are required");
  }
}

async function defaultRunner(request) {
  return new Promise((accept) => execFile(request.command, request.args, {
    cwd: request.cwd, timeout: request.timeoutMs, maxBuffer: request.maxBuffer,
    encoding: "utf8", windowsHide: true,
  }, (error, stdout, stderr) => accept({ status: error ? 1 : 0, stdout, stderr })));
}

async function graphql(target, operation, fields) {
  const args = ["api", "--hostname", "github.com", "graphql", "-H", "Cache-Control: no-cache, no-store",
    "-f", `query=${operation}`];
  for (const [key, value] of Object.entries(fields)) args.push(typeof value === "number" ? "-F" : "-f", `${key}=${value}`);
  const request = { command: "gh", args, cwd: resolve(target.repositoryRoot ?? process.cwd()),
    timeoutMs: 30_000, maxBuffer: 2 * 1024 * 1024 };
  let result;
  try { result = await (target.commandRunner ?? defaultRunner)(request); }
  catch { fail("PR_GITHUB_UNAVAILABLE", "GitHub PR operation could not be observed"); }
  if (result?.status !== 0 || Buffer.byteLength(result.stdout ?? "", "utf8") > request.maxBuffer) {
    fail("PR_GITHUB_UNAVAILABLE", "GitHub PR operation failed or exceeded its response bound");
  }
  let response;
  try { response = JSON.parse(result.stdout); }
  catch { fail("PR_GITHUB_UNAVAILABLE", "GitHub PR response is malformed"); }
  if (!response?.data || response.errors?.length ||
      (Object.hasOwn(response, "errors") && !Array.isArray(response.errors))) {
    fail("PR_GITHUB_UNAVAILABLE", "GitHub PR policy or target is unavailable; partial data is not proof");
  }
  return response.data;
}

async function readPullRequest(target, { afterWrite = false } = {}) {
  const [owner, name] = target.repository.split("/");
  const data = await graphql(target, query, { owner, name, number: target.prNumber });
  const pr = data.repository?.pullRequest;
  if (data.repository?.nameWithOwner !== target.repository || !pr?.id || pr.number !== target.prNumber ||
      pr.url !== `https://github.com/${target.repository}/pull/${target.prNumber}` ||
      pr.headRefOid !== target.headSha || pr.baseRefName !== target.baseBranch ||
      (!afterWrite && pr.baseRefOid !== target.baseSha) || !shaPattern.test(pr.baseRefOid ?? "") ||
      !repositoryPattern.test(pr.headRepository?.nameWithOwner ?? "") || !pr.headRefName) {
    fail("PR_TARGET_CHANGED", "GitHub PR repository, number, head or base no longer matches the inspected target");
  }
  if (!["OPEN", "CLOSED", "MERGED"].includes(pr.state) || typeof pr.isDraft !== "boolean" ||
      typeof pr.isMergeQueueEnabled !== "boolean" || typeof pr.isInMergeQueue !== "boolean" ||
      !Object.hasOwn(pr, "autoMergeRequest") || !Object.hasOwn(pr, "reviewDecision")) {
    fail("PR_POLICY_UNKNOWN", "GitHub PR policy response is incomplete");
  }
  return pr;
}

function commitChecks(commit) {
  if (!commit || !shaPattern.test(commit.oid ?? "") || !Object.hasOwn(commit, "statusCheckRollup")) {
    fail("PR_CHECKS_INCOMPLETE", "Current commit check evidence is missing");
  }
  if (commit.statusCheckRollup === null) return [];
  const contexts = commit.statusCheckRollup?.contexts;
  if (!contexts || !Array.isArray(contexts.nodes) || contexts.pageInfo?.hasNextPage !== false ||
      contexts.totalCount !== contexts.nodes.length || contexts.totalCount > 100 ||
      new Set(contexts.nodes.map((node) => node?.id)).size !== contexts.nodes.length) {
    fail("PR_CHECKS_INCOMPLETE", "Current commit check evidence is incomplete or exceeds 100 contexts");
  }
  return contexts.nodes.map((node) => {
    if (!node?.id || typeof node.isRequired !== "boolean" ||
        !["CheckRun", "StatusContext"].includes(node.__typename)) {
      fail("PR_CHECKS_INCOMPLETE", "GitHub required-check classification is unavailable");
    }
    const checkRun = node.__typename === "CheckRun";
    const state = checkRun ? (node.status === "COMPLETED" ? node.conclusion : node.status) : node.state;
    if (typeof state !== "string" || !(checkRun ? node.name : node.context)) {
      fail("PR_CHECKS_INCOMPLETE", "GitHub check result is incomplete");
    }
    return { id: node.id, name: checkRun ? node.name : node.context, type: node.__typename,
      required: node.isRequired, state,
      accepted: checkRun ? node.status === "COMPLETED" && ["SUCCESS", "SKIPPED", "NEUTRAL"].includes(state) : state === "SUCCESS",
      execution: ["SKIPPED", "NEUTRAL"].includes(state) ? "NOT_PROVEN" : "REPORTED_RESULT",
      source: checkRun ? node.checkSuite?.app ?? null : node.creator ?? null,
      url: checkRun ? node.detailsUrl : node.targetUrl };
  });
}

function observedCompletion(pr) {
  if (pr.state === "MERGED" && shaPattern.test(pr.mergeCommit?.oid ?? "")) return { outcome: "MERGED", mergeSha: pr.mergeCommit.oid };
  if (pr.state === "OPEN" && pr.isInMergeQueue) return { outcome: "QUEUED" };
  if (pr.state === "OPEN" && pr.autoMergeRequest) return { outcome: "AUTO_MERGE_SCHEDULED" };
  return null;
}

function proofFor(pr, target) {
  if (pr.state !== "OPEN" || pr.isDraft) fail("PR_NOT_READY", "The selected PR must be open and ready for review");
  if (pr.reviewDecision === "REVIEW_REQUIRED") {
    fail("PR_REQUIRED_REVIEWS_BLOCKED", "GitHub reports a required review is still missing; a merge summary cannot authorize a new merge or queue entry");
  }
  if (pr.mergeable !== "MERGEABLE" || !acceptedStates.has(pr.mergeStateStatus) ||
      ![null, "APPROVED", "CHANGES_REQUESTED"].includes(pr.reviewDecision)) {
    fail("PR_POLICY_BLOCKED", "GitHub has not established current checks, reviews and protection as mergeable");
  }
  const head = pr.commits?.nodes;
  if (head?.length !== 1 || head[0]?.commit?.oid !== target.headSha) {
    fail("PR_TARGET_CHANGED", "Check evidence does not belong to the current PR head");
  }
  if (!Object.hasOwn(pr, "potentialMergeCommit")) fail("PR_CHECKS_INCOMPLETE", "Test-merge evidence was not queried");
  const mergeChecks = pr.potentialMergeCommit === null ? [] : commitChecks(pr.potentialMergeCommit);
  if (mergeChecks.length) {
    const parents = pr.potentialMergeCommit.parents?.nodes;
    if (parents?.length !== 2 || parents[0]?.oid !== target.baseSha || parents[1]?.oid !== target.headSha) {
      fail("PR_TARGET_CHANGED", "Test-merge checks are not linked to the current PR head and base");
    }
  }
  // GitHub selects test-merge evidence when it has checks. isRequired and the
  // merge state are server decisions, including missing checks and required
  // sources. Never rebuild that policy by matching names or reading admin APIs.
  const selected = mergeChecks.length ? mergeChecks : commitChecks(head[0].commit);
  if (selected.some((check) => check.required && !check.accepted)) {
    fail("PR_REQUIRED_CHECKS_BLOCKED", "A required current PR check failed, is pending, or has no accepted conclusion");
  }
  return { repository: target.repository, prNumber: target.prNumber, headSha: target.headSha,
    headRepository: pr.headRepository.nameWithOwner, headBranch: pr.headRefName,
    baseBranch: target.baseBranch, baseSha: target.baseSha,
    checkCommit: mergeChecks.length ? pr.potentialMergeCommit.oid : target.headSha,
    checkRole: mergeChecks.length ? "TEST_MERGE" : "HEAD", checks: selected,
    policyEvidence: "GITHUB_MERGE_STATE", mergeStateStatus: pr.mergeStateStatus,
    reviewDecision: pr.reviewDecision, mergeQueue: pr.isMergeQueueEnabled,
    // An empty rollup alone never proves absence of rules. The current platform
    // acceptance above is still necessary and the server enforces the write.
    requiredChecksReported: selected.filter((check) => check.required).length };
}

export async function inspectPullRequest(target) {
  validateTarget(target);
  const pr = await readPullRequest(target);
  const completion = observedCompletion(pr);
  return completion ? { ...completion, repository: target.repository, prNumber: target.prNumber,
    headSha: target.headSha, baseBranch: target.baseBranch } : { outcome: "READY", proof: proofFor(pr, target) };
}

export async function mergePullRequest(target) {
  validateTarget(target);
  const invocation = parseTaskInvocation(target.invocation);
  if (!invocation.recognized || invocation.action !== "MERGE") fail("PR_MERGE_ACTION_REQUIRED", "merge-pr requires an explicit $kyw-deliver [NNNN] --merge action");
  if (!([undefined, "merge", "squash", "rebase"].includes(target.mergeMethod))) fail("PR_MERGE_METHOD_INVALID", "Merge method must be merge, squash or rebase");
  const first = await readPullRequest(target);
  const complete = observedCompletion(first);
  if (complete) return { ...complete, mutationAttempted: false };
  proofFor(first, target);
  const fresh = await readPullRequest(target);
  if (fresh.id !== first.id || fresh.headRefName !== first.headRefName ||
      fresh.headRepository.nameWithOwner !== first.headRepository.nameWithOwner ||
      fresh.isMergeQueueEnabled !== first.isMergeQueueEnabled) fail("PR_TARGET_CHANGED", "PR source or queue policy changed during preflight");
  const concurrentCompletion = observedCompletion(fresh);
  if (concurrentCompletion) return { ...concurrentCompletion, mutationAttempted: false };
  const proof = proofFor(fresh, target);
  if (!fresh.isMergeQueueEnabled && !target.mergeMethod) fail("PR_MERGE_METHOD_REQUIRED", "Use the target project's merge method for this PR");
  const operation = fresh.isMergeQueueEnabled
    ? `mutation KywEnqueue($id: ID!, $head: GitObjectID!) { enqueuePullRequest(input: {pullRequestId: $id, expectedHeadOid: $head}) { mergeQueueEntry { id } } }`
    : `mutation KywMerge($id: ID!, $head: GitObjectID!, $method: PullRequestMergeMethod!) { mergePullRequest(input: {pullRequestId: $id, expectedHeadOid: $head, mergeMethod: $method}) { pullRequest { id } } }`;
  let writeAccepted = false;
  try {
    await graphql(target, operation, { id: fresh.id, head: target.headSha,
      ...(fresh.isMergeQueueEnabled ? {} : { method: target.mergeMethod.toUpperCase() }) });
    writeAccepted = true;
  } catch { /* A failed/lost response is reconciled once, never retried. */ }
  try {
    const observed = await readPullRequest(target, { afterWrite: true });
    if (observed.id !== fresh.id) fail("PR_TARGET_CHANGED", "PR identity changed after the write");
    const result = observedCompletion(observed);
    if (result) return { ...result, proof, mutationAttempted: true, writeAccepted };
  } catch { /* Unknown state preserves the write uncertainty. */ }
  return { outcome: "UNKNOWN", code: "PR_WRITE_UNCONFIRMED", proof, mutationAttempted: true, writeAccepted,
    resumePoint: "Read the exact PR before any retry; absence immediately after a write is not proof of non-execution." };
}
