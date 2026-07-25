import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rmdir,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";

import {
  CURRENT_TASK_CONTRACT_VERSION,
  TASK_TEST_STATUS_PAIRS,
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
const batchKeyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const stagingPrefix = ".kyw-dev-task-";
const creationLockName = ".kyw-dev-task-create.lock";
const batchReleaseMarkerPrefix = ".kyw-dev-task-release-";
const batchStagePrefix = `${stagingPrefix}batch-`;
const batchTransactionKind = "kyw-task-batch-transaction";
const batchTransactionSchemaVersion = 1;
const batchTransactionTokenPattern = /^[a-f0-9]{32}$/;
const batchTransactionHashPattern = /^[a-f0-9]{64}$/;
const maxBatchJournalBytes = 16 * 1024 * 1024;
const maxBatchDiagnosticObservations = 64;
const batchIdToken = "{{TASK_ID}}";
const batchTitleToken = "{{TASK_TITLE}}";
const batchDependenciesToken = "{{TASK_DEPENDENCIES}}";
const exactInvocationPattern = /^\$kyw-task\s+(\d{4})(?:\s+([\s\S]*\S))?\s*$/u;
const managedExactAliasPattern = /^task\s+(\d{4})\s+실행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const managedNextAliasPattern = /^task\s+진행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const managedContinuousAliasPattern =
  /^남은\s+task\s+계속\s+실행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const gitShaPattern = /^[0-9a-f]{40}$/;
const canonicalNoDependency =
  "- Not applicable — no hard dependency is required for this outcome.";
const canonicalDependencyPattern = /^- Task (\d{4})\.$/;
const currentTaskStateByPair = new Map(
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

function literalHardDependencies(taskMarkdown) {
  const dependencies = [];
  const section = stripMarkdownComments(markdownSection(taskMarkdown, "Dependencies"));
  for (const match of section.matchAll(/\bTask\s+(\d{4})\b/g)) {
    if (!dependencies.includes(match[1])) {
      dependencies.push(match[1]);
    }
  }
  return Object.freeze(dependencies);
}

function parseCanonicalHardDependencies(taskMarkdown) {
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

function parseHardDependencies(taskMarkdown, contractVersion, { completedCompatibility = false } = {}) {
  if (contractVersion !== CURRENT_TASK_CONTRACT_VERSION) {
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

function taskLifecycleState(task) {
  return currentTaskStateByPair.get(`${task.taskStatus}/${task.testStatus}`) ?? "INVALID";
}

function activeTask(task) {
  return taskLifecycleState(task) === "ACTIVE";
}

function completeTask(task) {
  return taskLifecycleState(task) === "COMPLETE";
}

function blockedTask(task) {
  return taskLifecycleState(task) === "BLOCKED";
}

function cancelledTask(task) {
  return taskLifecycleState(task) === "CANCELLED";
}

function readyTask(task) {
  return taskLifecycleState(task) === "READY";
}

function draftTask(task) {
  return taskLifecycleState(task) === "DRAFT";
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

export function evaluateTaskExecutionPreflight(preflight = {}) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    return Object.freeze({
      safe: false,
      issues: Object.freeze(["execution preflight must be an object"]),
    });
  }
  const labels = Object.freeze({
    conflicts: "conflict",
    unexplainedUserWork: "unexplained user work",
    remoteDrift: "remote drift",
    userOwnedDecisions: "unresolved user-owned decision",
  });
  const issues = [];
  for (const key of Object.keys(preflight)) {
    if (!Object.hasOwn(labels, key)) {
      issues.push(`execution preflight contains unknown field ${key}`);
      continue;
    }
    const values = preflight[key];
    if (
      !Array.isArray(values) ||
      values.some((value) => typeof value !== "string" || !value.trim())
    ) {
      issues.push(`execution preflight ${key} must be an array of non-empty strings`);
      continue;
    }
    issues.push(...values.map((value) => `${labels[key]}: ${value}`));
  }
  return Object.freeze({ safe: issues.length === 0, issues: Object.freeze(issues) });
}

function deliveryExpectationIssues(taskId, expectation) {
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
  return issues;
}

function deliveryIdentityIssues(taskId, entry, expectation) {
  const issues = [];
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
  return issues;
}

export function evaluateDeliveryEvidence(taskId, entry, expectation) {
  const issues = deliveryExpectationIssues(taskId, expectation);
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return Object.freeze({
      satisfied: false,
      issues: Object.freeze([...issues, `Task ${taskId} requires GitHub delivery evidence`]),
    });
  }

  issues.push(...deliveryIdentityIssues(taskId, entry, expectation));
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

function blockedDeliveryClassification(blockerCode, issues) {
  return Object.freeze({
    disposition: "BLOCKED",
    blockerCode,
    issues: Object.freeze(issues),
  });
}

function classifyPendingDeliveryEvidence(taskId, entry, expectation) {
  const invalidIssues = [
    ...deliveryExpectationIssues(taskId, expectation),
    ...deliveryIdentityIssues(taskId, entry, expectation),
  ];
  const pullRequest = entry.pullRequest;
  if (!pullRequest || typeof pullRequest !== "object" || Array.isArray(pullRequest)) {
    invalidIssues.push("pullRequest evidence is required");
  } else {
    if (!Number.isInteger(pullRequest.number) || pullRequest.number < 1) {
      invalidIssues.push("pullRequest.number must be a positive integer");
    }
    if (pullRequest.headSha !== entry.outcomeSha) {
      invalidIssues.push("pullRequest.headSha must equal outcomeSha");
    }
    if (pullRequest.baseRef !== expectation?.baseRef) {
      invalidIssues.push("pullRequest.baseRef must equal the trusted local expectation");
    }
    if (!["OPEN", "MERGED"].includes(pullRequest.state)) {
      invalidIssues.push("pullRequest.state must be OPEN or MERGED");
    }
    if (!["PENDING", "SUCCESS", "FAILURE"].includes(pullRequest.checks)) {
      invalidIssues.push("pullRequest.checks must be PENDING, SUCCESS, or FAILURE");
    }
    if (!["PENDING", "CLEAR", "CHANGES_REQUESTED"].includes(pullRequest.review)) {
      invalidIssues.push("pullRequest.review must be PENDING, CLEAR, or CHANGES_REQUESTED");
    }
    if (
      pullRequest.runId !== undefined &&
      (!Number.isInteger(pullRequest.runId) || pullRequest.runId < 1)
    ) {
      invalidIssues.push("pullRequest.runId must be a positive integer when present");
    }
  }
  if (invalidIssues.length > 0) {
    return blockedDeliveryClassification("DELIVERY_EVIDENCE_INVALID", invalidIssues);
  }

  if (pullRequest.state === "OPEN") {
    const openIssues = [];
    if (pullRequest.mergeSha !== undefined && pullRequest.mergeSha !== null) {
      openIssues.push("an OPEN pullRequest must not assert mergeSha");
    }
    if (entry.merge !== undefined && entry.merge !== null) {
      openIssues.push("an OPEN pullRequest must not assert merge evidence");
    }
    if (openIssues.length > 0) {
      return blockedDeliveryClassification("DELIVERY_EVIDENCE_INVALID", openIssues);
    }
    const blockedIssues = [];
    if (pullRequest.checks === "FAILURE") {
      blockedIssues.push("pullRequest.checks reports FAILURE");
    }
    if (pullRequest.review === "CHANGES_REQUESTED") {
      blockedIssues.push("pullRequest.review reports CHANGES_REQUESTED");
    }
    return blockedIssues.length > 0
      ? blockedDeliveryClassification("DELIVERY_BLOCKED", blockedIssues)
      : Object.freeze({ disposition: "RESUMABLE", issues: Object.freeze([]) });
  }

  const mergedIssues = [];
  if (!gitShaPattern.test(pullRequest.mergeSha ?? "")) {
    mergedIssues.push("pullRequest.mergeSha must be an exact 40-character lowercase Git SHA");
  }
  if (!Number.isInteger(pullRequest.runId) || pullRequest.runId < 1) {
    mergedIssues.push("pullRequest.runId must be a positive integer");
  }
  const merge = entry.merge;
  if (!merge || typeof merge !== "object" || Array.isArray(merge)) {
    mergedIssues.push("merge evidence is required for a MERGED pullRequest");
  } else {
    if (merge.repository !== entry.repository) {
      mergedIssues.push("merge.repository must equal repository");
    }
    if (merge.branch !== pullRequest.baseRef) {
      mergedIssues.push("merge.branch must equal pullRequest.baseRef");
    }
    if (!gitShaPattern.test(merge.sha ?? "")) {
      mergedIssues.push("merge.sha must be an exact 40-character lowercase Git SHA");
    }
    if (pullRequest.mergeSha !== merge.sha) {
      mergedIssues.push("pullRequest.mergeSha must equal merge.sha");
    }
    if (!["PENDING", "SUCCESS", "FAILURE"].includes(merge.checks)) {
      mergedIssues.push("merge.checks must be PENDING, SUCCESS, or FAILURE");
    }
    if (
      merge.mainRunHeadSha !== undefined &&
      merge.mainRunHeadSha !== null &&
      merge.mainRunHeadSha !== merge.sha
    ) {
      mergedIssues.push("merge.mainRunHeadSha must equal merge.sha when present");
    }
    if (
      merge.runId !== undefined &&
      (!Number.isInteger(merge.runId) || merge.runId < 1)
    ) {
      mergedIssues.push("merge.runId must be a positive integer when present");
    }
    if (merge.checks !== "PENDING" && merge.mainRunHeadSha !== merge.sha) {
      mergedIssues.push("completed merge evidence requires mainRunHeadSha equal to merge.sha");
    }
    if (
      merge.checks !== "PENDING" &&
      (!Number.isInteger(merge.runId) || merge.runId < 1)
    ) {
      mergedIssues.push("completed merge evidence requires a positive merge.runId");
    }
  }
  if (mergedIssues.length > 0) {
    return blockedDeliveryClassification("DELIVERY_EVIDENCE_INVALID", mergedIssues);
  }
  const blockedIssues = [];
  if (pullRequest.checks === "FAILURE") {
    blockedIssues.push("pullRequest.checks reports FAILURE");
  }
  if (pullRequest.review === "CHANGES_REQUESTED") {
    blockedIssues.push("pullRequest.review reports CHANGES_REQUESTED");
  }
  if (merge.checks === "FAILURE") {
    blockedIssues.push("merge.checks reports FAILURE");
  }
  if (blockedIssues.length > 0) {
    return blockedDeliveryClassification("DELIVERY_BLOCKED", blockedIssues);
  }
  if (
    pullRequest.checks === "PENDING" ||
    pullRequest.review === "PENDING" ||
    merge.checks === "PENDING"
  ) {
    return Object.freeze({ disposition: "RESUMABLE", issues: Object.freeze([]) });
  }
  return blockedDeliveryClassification("DELIVERY_EVIDENCE_INVALID", [
    "supplied delivery evidence is neither pending nor a valid final ledger",
  ]);
}

export function classifyDeliveryEvidence(taskId, entry, expectation) {
  const evidenceSupplied = entry !== undefined;
  const expectationSupplied = expectation !== undefined;
  if (!evidenceSupplied && !expectationSupplied) {
    return Object.freeze({ disposition: "RESUMABLE", issues: Object.freeze([]) });
  }

  const evaluation = evaluateDeliveryEvidence(taskId, entry, expectation);
  if (!evidenceSupplied) {
    const missingEvidenceIssue = `Task ${taskId} requires GitHub delivery evidence`;
    const suppliedExpectationIssues = evaluation.issues.filter(
      (issue) => issue !== missingEvidenceIssue,
    );
    return suppliedExpectationIssues.length === 0
      ? Object.freeze({ disposition: "RESUMABLE", issues: Object.freeze([]) })
      : blockedDeliveryClassification(
          "DELIVERY_EVIDENCE_INVALID",
          suppliedExpectationIssues,
        );
  }

  if (evaluation.satisfied) {
    return Object.freeze({ disposition: "SATISFIED", issues: Object.freeze([]) });
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return blockedDeliveryClassification("DELIVERY_EVIDENCE_INVALID", evaluation.issues);
  }
  return classifyPendingDeliveryEvidence(taskId, entry, expectation);
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function filesystemIdentity(state) {
  return Object.freeze({
    device: String(state.dev),
    inode: String(state.ino),
    birthtimeNanoseconds: String(state.birthtimeNs),
  });
}

function validFilesystemIdentity(identity) {
  return (
    identity &&
    typeof identity === "object" &&
    !Array.isArray(identity) &&
    Object.keys(identity).sort().join(",") ===
      "birthtimeNanoseconds,device,inode" &&
    ["device", "inode", "birthtimeNanoseconds"].every(
      (key) => typeof identity[key] === "string" && /^\d+$/.test(identity[key]),
    )
  );
}

function sameFilesystemIdentity(left, right) {
  return (
    validFilesystemIdentity(left) &&
    validFilesystemIdentity(right) &&
    left.device === right.device &&
    left.inode === right.inode &&
    left.birthtimeNanoseconds === right.birthtimeNanoseconds
  );
}

async function bigintPathState(filePath) {
  try {
    return await lstat(filePath, { bigint: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function readRegularFileProof(filePath) {
  const before = await bigintPathState(filePath);
  if (!before || before.isSymbolicLink() || !before.isFile()) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Expected a real regular file at ${filePath}`,
    );
  }
  const content = await readFile(filePath);
  const after = await bigintPathState(filePath);
  const beforeIdentity = filesystemIdentity(before);
  if (
    !after ||
    after.isSymbolicLink() ||
    !after.isFile() ||
    !sameFilesystemIdentity(beforeIdentity, filesystemIdentity(after))
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Regular-file identity changed while reading ${filePath}`,
    );
  }
  return Object.freeze({
    identity: beforeIdentity,
    bytes: content.byteLength,
    sha256: sha256(content),
    content,
  });
}

function proofMatchesExpected(proof, expected) {
  return (
    proof.bytes === expected.bytes &&
    proof.sha256 === expected.sha256 &&
    (!expected.identity || sameFilesystemIdentity(proof.identity, expected.identity))
  );
}

function boundedOwnerMetadata() {
  let observedHost = "unavailable";
  try {
    observedHost = hostname();
  } catch {
    // Host metadata is diagnostic only.
  }
  const host = observedHost
    .replace(/[\u0000-\u001f\u007f/\\]+/g, "-")
    .slice(0, 64) || "unavailable";
  return Object.freeze({
    processId: Number.isSafeInteger(process.pid) && process.pid > 0 ? process.pid : 0,
    host,
    createdAt: new Date().toISOString(),
  });
}

function batchReleaseMarkerName(token) {
  return `${batchReleaseMarkerPrefix}${token}.lock`;
}

function isBatchReleaseMarkerName(name) {
  return (
    name.startsWith(batchReleaseMarkerPrefix) &&
    name.endsWith(".lock")
  );
}

function isBatchTransactionArtifactName(name) {
  return (
    name === creationLockName ||
    name.startsWith(batchReleaseMarkerPrefix) ||
    name.startsWith(batchStagePrefix)
  );
}

async function listBatchTransactionArtifacts(tasksRoot) {
  let entries;
  try {
    entries = await readdir(tasksRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return Object.freeze([]);
    }
    throw error;
  }
  return Object.freeze(
    entries
      .filter((entry) => isBatchTransactionArtifactName(entry.name))
      .map((entry) => entry.name)
      .sort(),
  );
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
    taskMarkdown,
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
      dependencies: Object.freeze([]),
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

async function inspectTaskQueueContents(tasksRoot) {
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
      const dependencyParse = parseHardDependencies(
        record.taskMarkdown,
        record.task.contractVersion,
        { completedCompatibility: completeTask(record.task) },
      );
      errors.push(
        ...dependencyParse.errors.map(
          (message) => `${record.entry.name}: TASK.md: ${message}`,
        ),
      );
      tasks.push(
        Object.freeze({
          ...record.task,
          dependencies: dependencyParse.dependencies,
        }),
      );
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

  const transactionArtifacts = await listBatchTransactionArtifacts(path.resolve(tasksRoot));
  if (transactionArtifacts.length > 0) {
    return Object.freeze({
      tasks: Object.freeze([]),
      errors: Object.freeze([
        "Task queue creation is locked by batch transaction evidence",
      ]),
      currentTasks: Object.freeze([]),
    });
  }
  return inspectTaskQueueContents(tasksRoot);
}

function blockedResult(code, message, details = {}) {
  return Object.freeze({ outcome: "BLOCKED", code, message, ...details });
}

function deliveryClassification(task, deliveryState) {
  if (task.deliveryRequirement.kind !== "STANDARD") {
    return Object.freeze({ disposition: "SATISFIED", issues: Object.freeze([]) });
  }
  return classifyDeliveryEvidence(
    task.id,
    deliveryState.ledger?.[task.id],
    deliveryState.expectations?.[task.id],
  );
}

function deliveryBlockers(task, deliveryState) {
  const classification = deliveryClassification(task, deliveryState);
  if (classification.disposition === "SATISFIED") {
    return [];
  }
  if (classification.disposition === "RESUMABLE") {
    return [`Task ${task.id} delivery is resumable but not yet satisfied`];
  }
  return classification.issues.map((issue) => `Task ${task.id} delivery: ${issue}`);
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

function selectedResult(task, parsedInvocation, requestedAction) {
  const action =
    requestedAction ??
    (draftTask(task)
      ? "AUTHOR"
      : blockedTask(task)
        ? "RECHECK_BLOCKER"
        : activeTask(task)
          ? "RESUME"
          : "IMPLEMENT");
  const lifecycleSelection = ["IMPLEMENT", "RESUME", "DELIVER"].includes(action);
  const standardDeliveryAuthorized =
    lifecycleSelection && task.deliveryRequirement.kind === "STANDARD";
  return Object.freeze({
    outcome: "SELECTED",
    mode: parsedInvocation.mode,
    action,
    confirmation: readyTask(task),
    continuous: parsedInvocation.mode === "CONTINUOUS",
    task: taskSummary(task),
    ...(lifecycleSelection
      ? {
          authoritySource: "RECOGNIZED_TASK_INVOCATION",
          authorityScope: standardDeliveryAuthorized
            ? "STANDARD_LIFECYCLE"
            : "REPOSITORY_LIFECYCLE",
          standardDeliveryAuthorized,
          ceremonialConfirmationRequired: false,
          separateAuthorityBoundary: "NON_STANDARD_EXTERNAL_MUTATIONS",
        }
      : {}),
    ...(action === "DELIVER"
      ? {
          deliveryDisposition: "RESUMABLE",
          message: `Task ${task.id} is repository-complete; the recognized invocation authorizes resuming ordinary STANDARD delivery without ceremonial reconfirmation.`,
        }
      : {}),
    ...(blockedTask(task) ? { blocker: task.blocker } : {}),
    overrideText: parsedInvocation.overrideText,
    overrideScope: parsedInvocation.overrideScope,
  });
}

function deliveryEvidenceBlockedResult(task, classification) {
  return blockedResult(
    classification.blockerCode ?? "DELIVERY_EVIDENCE_INVALID",
    classification.issues.map((issue) => `Task ${task.id} delivery: ${issue}`).join("; "),
    {
      task: taskSummary(task),
      deliveryDisposition: "BLOCKED",
      issues: classification.issues,
    },
  );
}

function terminalTaskResult(task, byId, deliveryState, parsedInvocation) {
  if (completeTask(task)) {
    const dependencyBlockers = selectionBlockers(task, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult(
        "UNSATISFIED_DEPENDENCY",
        dependencyBlockers.join("; "),
        { task: taskSummary(task) },
      );
    }
    const classification = deliveryClassification(task, deliveryState);
    if (classification.disposition === "RESUMABLE") {
      return selectedResult(task, parsedInvocation, "DELIVER");
    }
    if (classification.disposition === "BLOCKED") {
      return deliveryEvidenceBlockedResult(task, classification);
    }
    return Object.freeze({
      outcome: "TERMINAL",
      code: "TASK_COMPLETE",
      message: `Task ${task.id} is repository-complete and required delivery is satisfied.`,
      task: taskSummary(task),
      deliveryDisposition: "SATISFIED",
      mutationRequired: false,
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

function automaticTerminalResult(currentTasks, byId, deliveryState, parsedInvocation) {
  const frontier = currentTasks.at(-1);
  const incomplete = currentTasks.find((task) => !completeTask(task));
  if (incomplete) {
    if (blockedTask(incomplete)) {
      const frontierBlocked = incomplete.id === frontier.id;
      return blockedResult(
        frontierBlocked ? "QUEUE_FRONTIER_BLOCKED" : "QUEUE_TRANSITION_BLOCKED",
        frontierBlocked
          ? `Task ${incomplete.id} is the current queue frontier and is BLOCKED: ${incomplete.blocker}`
          : `Task ${incomplete.id} is BLOCKED and the current queue is not complete: ${incomplete.blocker}`,
        { task: taskSummary(incomplete) },
      );
    }
    if (cancelledTask(incomplete)) {
      return terminalTaskResult(incomplete, byId, deliveryState, parsedInvocation);
    }
    return blockedResult(
      "NO_SELECTABLE_TASK",
      `No READY or active Task exists; current Task ${incomplete.id} is ${incomplete.taskStatus}/${incomplete.testStatus}.`,
      { task: taskSummary(incomplete) },
    );
  }

  for (const task of currentTasks) {
    const dependencyBlockers = selectionBlockers(task, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult("UNSATISFIED_DEPENDENCY", dependencyBlockers.join("; "), {
        task: taskSummary(task),
      });
    }
    const classification = deliveryClassification(task, deliveryState);
    if (classification.disposition === "RESUMABLE") {
      return selectedResult(task, parsedInvocation, "DELIVER");
    }
    if (classification.disposition === "BLOCKED") {
      return deliveryEvidenceBlockedResult(task, classification);
    }
  }

  return Object.freeze({
    outcome: "NO_WORK",
    code: "ALL_TASKS_COMPLETE",
    message: ALL_TASKS_COMPLETE_MESSAGE,
    task: taskSummary(frontier),
    deliveryDisposition: "SATISFIED",
    mutationRequired: false,
  });
}

export async function resolveTaskDispatch({
  tasksRoot,
  invocation,
  managedRoutingAvailable = false,
  deliveryLedger = {},
  deliveryExpectations = {},
  executionPreflight = {},
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

  const preflight = evaluateTaskExecutionPreflight(executionPreflight);
  if (!preflight.safe) {
    return blockedResult("PREFLIGHT_BLOCKED", preflight.issues.join("; "), {
      preflightIssues: preflight.issues,
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
    return terminalTaskResult(task, byId, deliveryState, parsedInvocation);
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

  const deliveryCandidates = queue.currentTasks
    .filter(
      (task) => completeTask(task) && task.deliveryRequirement.kind === "STANDARD",
    )
    .sort((left, right) => left.number - right.number);
  const unavailableDelivery = [];
  for (const task of deliveryCandidates) {
    const classification = deliveryClassification(task, deliveryState);
    if (classification.disposition === "SATISFIED") {
      continue;
    }
    if (classification.disposition === "BLOCKED") {
      return deliveryEvidenceBlockedResult(task, classification);
    }
    const blockers = queueSelectionBlockers(
      task,
      queue.currentTasks,
      byId,
      deliveryState,
    );
    if (blockers.length === 0) {
      return selectedResult(task, parsedInvocation, "DELIVER");
    }
    unavailableDelivery.push(`Task ${task.id}: ${blockers.join("; ")}`);
  }
  if (unavailableDelivery.length > 0) {
    return blockedResult(
      "QUEUE_TRANSITION_BLOCKED",
      unavailableDelivery.join("\n"),
      { blockers: Object.freeze(unavailableDelivery) },
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

  return automaticTerminalResult(
    queue.currentTasks,
    byId,
    deliveryState,
    parsedInvocation,
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

function invalidBatch(message, code = "INVALID_TASK_BATCH") {
  return new TaskArtifactError(code, message);
}

function normalizeBatchTaskDefinitions(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw invalidBatch("Task batch must contain at least one task definition");
  }
  if (tasks.length > MAX_TASK_NUMBER) {
    throw invalidBatch(`Task batch cannot contain more than ${MAX_TASK_NUMBER} definitions`);
  }

  const keys = new Set();
  return Object.freeze(
    tasks.map((definition, index) => {
      const label = `Task batch definition ${index + 1}`;
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
        throw invalidBatch(`${label} must be an object`);
      }
      const allowedKeys = new Set([
        "key",
        "title",
        "taskMarkdown",
        "testMarkdown",
        "dependencies",
      ]);
      const unknownKeys = Object.keys(definition).filter((key) => !allowedKeys.has(key));
      if (unknownKeys.length > 0) {
        throw invalidBatch(`${label} contains unknown fields: ${unknownKeys.sort().join(", ")}`);
      }

      const key = definition.key;
      if (typeof key !== "string" || !batchKeyPattern.test(key)) {
        throw invalidBatch(
          `${label} key must be unique lowercase ASCII kebab-case beginning with a letter`,
        );
      }
      if (key.length > MAX_TASK_SLUG_LENGTH) {
        throw invalidBatch(
          `${label} key must contain at most ${MAX_TASK_SLUG_LENGTH} characters`,
        );
      }
      if (keys.has(key)) {
        throw invalidBatch(`Task batch key is duplicated: ${key}`);
      }
      keys.add(key);

      const title = normalizeTaskTitle(definition.title);
      const taskMarkdown = definition.taskMarkdown;
      const testMarkdown = definition.testMarkdown;
      if (typeof taskMarkdown !== "string" || !taskMarkdown.trim()) {
        throw invalidBatch(`${label} taskMarkdown must be a non-empty string`);
      }
      if (typeof testMarkdown !== "string" || !testMarkdown.trim()) {
        throw invalidBatch(`${label} testMarkdown must be a non-empty string`);
      }
      if (taskMarkdown.includes("\0") || testMarkdown.includes("\0")) {
        throw invalidBatch(`${label} Markdown must not contain NUL bytes`);
      }
      for (const token of [batchIdToken, batchTitleToken, batchDependenciesToken]) {
        if (!taskMarkdown.includes(token)) {
          throw invalidBatch(`${label} taskMarkdown must contain ${token}`);
        }
      }
      const dependencySection = stripMarkdownComments(
        markdownSection(taskMarkdown, "Dependencies"),
      ).trim();
      if (
        taskMarkdown.split(batchDependenciesToken).length !== 2 ||
        dependencySection !== batchDependenciesToken
      ) {
        throw invalidBatch(
          `${label} taskMarkdown must place exactly one ${batchDependenciesToken} as the complete Dependencies section`,
        );
      }
      for (const token of [batchIdToken, batchTitleToken]) {
        if (!testMarkdown.includes(token)) {
          throw invalidBatch(`${label} testMarkdown must contain ${token}`);
        }
      }
      if (testMarkdown.includes(batchDependenciesToken)) {
        throw invalidBatch(`${label} testMarkdown must not contain ${batchDependenciesToken}`);
      }

      const dependencies = definition.dependencies ?? [];
      if (!Array.isArray(dependencies)) {
        throw invalidBatch(`${label} dependencies must be an array`);
      }
      const normalizedDependencies = dependencies.map((dependency, dependencyIndex) => {
        const dependencyLabel = `${label} dependency ${dependencyIndex + 1}`;
        if (!dependency || typeof dependency !== "object" || Array.isArray(dependency)) {
          throw invalidBatch(`${dependencyLabel} must be an object`);
        }
        const dependencyKeys = Object.keys(dependency);
        const hasTaskKey = Object.hasOwn(dependency, "taskKey");
        const hasTaskId = Object.hasOwn(dependency, "taskId");
        if (
          dependencyKeys.length !== 1 ||
          hasTaskKey === hasTaskId
        ) {
          throw invalidBatch(
            `${dependencyLabel} must contain exactly one of taskKey or taskId`,
          );
        }
        if (hasTaskKey) {
          if (
            typeof dependency.taskKey !== "string" ||
            !batchKeyPattern.test(dependency.taskKey) ||
            dependency.taskKey.length > MAX_TASK_SLUG_LENGTH
          ) {
            throw invalidBatch(`${dependencyLabel} taskKey is invalid`);
          }
          return Object.freeze({ kind: "BATCH", value: dependency.taskKey });
        }
        if (typeof dependency.taskId !== "string" || !/^\d{4}$/.test(dependency.taskId)) {
          throw invalidBatch(`${dependencyLabel} taskId must be a four-digit string`);
        }
        return Object.freeze({ kind: "EXISTING", value: formatTaskId(dependency.taskId) });
      });

      return Object.freeze({
        key,
        title,
        taskMarkdown,
        testMarkdown,
        dependencies: Object.freeze(normalizedDependencies),
      });
    }),
  );
}

function preallocateBatchTasks(resolvedRoot, inventory, definitions) {
  if (inventory.malformed.length > 0 || inventory.conflicts.length > 0) {
    throw taskLayoutError(inventory);
  }
  if (inventory.maxId + definitions.length > MAX_TASK_NUMBER) {
    throw new TaskArtifactError(
      "TASK_ID_EXHAUSTED",
      `Cannot allocate ${definitions.length} Tasks after ${formatTaskId(inventory.maxId)}; four-digit Task IDs are exhausted`,
    );
  }

  return Object.freeze(
    definitions.map((definition, index) => {
      const id = formatTaskId(inventory.maxId + index + 1);
      const slug = slugifyTaskTitle(definition.title);
      const directory = resolveTaskDirectory(resolvedRoot, id, slug);
      return Object.freeze({
        ...definition,
        id,
        number: Number(id),
        slug,
        directory,
        taskPath: path.join(directory, "TASK.md"),
        testPath: path.join(directory, "TEST.md"),
      });
    }),
  );
}

function sameOrderedValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function renderBatchTasks(preallocated, existingTasks) {
  const byKey = new Map(preallocated.map((task) => [task.key, task]));
  const existingById = new Map(existingTasks.map((task) => [task.id, task]));
  const allocatedIds = new Set(preallocated.map((task) => task.id));

  const prepared = preallocated.map((task) => {
    const resolvedDependencies = [];
    for (const dependency of task.dependencies) {
      let dependencyId;
      if (dependency.kind === "BATCH") {
        const target = byKey.get(dependency.value);
        if (!target) {
          throw invalidBatch(
            `Task batch key ${task.key} references missing batch dependency ${dependency.value}`,
            "MISSING_TASK_DEPENDENCY",
          );
        }
        dependencyId = target.id;
      } else {
        dependencyId = dependency.value;
        if (allocatedIds.has(dependencyId)) {
          throw invalidBatch(
            `Task batch key ${task.key} must reference new Task ${dependencyId} by taskKey`,
          );
        }
        if (!existingById.has(dependencyId)) {
          throw invalidBatch(
            `Task batch key ${task.key} references missing hard dependency Task ${dependencyId}`,
            "MISSING_TASK_DEPENDENCY",
          );
        }
      }
      if (resolvedDependencies.includes(dependencyId)) {
        throw invalidBatch(
          `Task batch key ${task.key} repeats dependency Task ${dependencyId}`,
        );
      }
      resolvedDependencies.push(dependencyId);
    }

    const dependencyMarkdown =
      resolvedDependencies.length === 0
        ? "- Not applicable — no hard dependency is required for this outcome."
        : resolvedDependencies.map((dependencyId) => `- Task ${dependencyId}.`).join("\n");
    let taskMarkdown;
    let testMarkdown;
    try {
      const values = {
        TASK_ID: task.id,
        TASK_TITLE: task.title,
        TASK_DEPENDENCIES: dependencyMarkdown,
      };
      taskMarkdown = renderTemplate(task.taskMarkdown, values);
      testMarkdown = renderTemplate(task.testMarkdown, values);
    } catch (error) {
      throw invalidBatch(
        `Task batch key ${task.key} could not render complete Markdown: ${error.message}`,
      );
    }

    const contractErrors = validateTaskTestContract({ taskMarkdown, testMarkdown });
    if (contractErrors.length > 0) {
      throw invalidBatch(
        `Task batch key ${task.key} failed canonical validation:\n- ${contractErrors.join("\n- ")}`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }
    if (
      firstSectionLine(taskMarkdown, "Status") !== "READY" ||
      firstSectionLine(testMarkdown, "Status") !== "READY"
    ) {
      throw invalidBatch(
        `Task batch key ${task.key} must render a READY/READY pair`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }
    const taskHeader = /^# TASK (\d{4}) — (.+)$/m.exec(taskMarkdown);
    const testHeader = /^# TEST (\d{4}) — (.+)$/m.exec(testMarkdown);
    if (
      taskHeader?.[1] !== task.id ||
      testHeader?.[1] !== task.id ||
      taskHeader?.[2]?.trim() !== task.title ||
      testHeader?.[2]?.trim() !== task.title
    ) {
      throw invalidBatch(
        `Task batch key ${task.key} headers must match allocated Task ${task.id} and title`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }
    const parsedDependencies = parseHardDependencies(
      taskMarkdown,
      getTaskContractVersion(taskMarkdown),
    );
    if (
      parsedDependencies.errors.length > 0 ||
      !sameOrderedValues(parsedDependencies.dependencies, resolvedDependencies)
    ) {
      throw invalidBatch(
        `Task batch key ${task.key} Dependencies must match its declared dependency references`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }

    return Object.freeze({
      ...task,
      taskMarkdown,
      testMarkdown,
      resolvedDependencies: Object.freeze(resolvedDependencies),
    });
  });

  const combinedTasks = [
    ...existingTasks,
    ...prepared.map((task) =>
      Object.freeze({
        id: task.id,
        number: task.number,
        name: path.basename(task.directory),
        directory: task.directory,
        taskPath: task.taskPath,
        testPath: task.testPath,
        title: task.title,
        taskStatus: "READY",
        testStatus: "READY",
        contractVersion: CURRENT_TASK_CONTRACT_VERSION,
        dependencies: task.resolvedDependencies,
        deliveryRequirement: Object.freeze({ kind: "STANDARD" }),
        blocker: "Not applicable — no blocker is known.",
      }),
    ),
  ];
  const graphErrors = dependencyGraphErrors(
    combinedTasks,
    new Map(combinedTasks.map((task) => [task.id, task])),
  );
  if (graphErrors.length > 0) {
    const code = graphErrors.some((error) => error.startsWith("Hard dependency cycle:"))
      ? "TASK_DEPENDENCY_CYCLE"
      : "MISSING_TASK_DEPENDENCY";
    throw invalidBatch(
      `Task batch dependency graph is invalid:\n- ${graphErrors.join("\n- ")}`,
      code,
    );
  }
  return Object.freeze(prepared);
}

function expectedBatchTasks(prepared) {
  return Object.freeze(
    prepared.map((task) =>
      Object.freeze({
        key: task.key,
        id: task.id,
        slug: task.slug,
        directoryName: path.basename(task.directory),
        dependencies: task.resolvedDependencies,
        files: Object.freeze(
          [
            ["TASK.md", task.taskMarkdown],
            ["TEST.md", task.testMarkdown],
          ].map(([name, content]) =>
            Object.freeze({
              name,
              bytes: Buffer.byteLength(content, "utf8"),
              sha256: sha256(content),
            }),
          ),
        ),
      }),
    ),
  );
}

function preparedBatchFingerprint(expectedTasks) {
  return sha256(JSON.stringify(expectedTasks));
}

async function captureTaskQueueSnapshot(tasksRoot) {
  const queue = await inspectTaskQueueContents(tasksRoot);
  if (queue.errors.length > 0) {
    throw invalidBatch(
      `Cannot create a Task batch until the queue is reconciled:\n- ${queue.errors.join("\n- ")}`,
      "INVALID_TASK_QUEUE",
    );
  }
  const inventory = await inspectTaskDirectories(tasksRoot);
  if (inventory.malformed.length > 0 || inventory.conflicts.length > 0) {
    throw taskLayoutError(inventory);
  }
  const entries = [];
  for (const entry of inventory.entries) {
    const directory = resolveTaskDirectory(tasksRoot, entry.id, entry.slug);
    const directoryState = await bigintPathState(directory);
    if (!directoryState || directoryState.isSymbolicLink() || !directoryState.isDirectory()) {
      throw new TaskArtifactError(
        "INVALID_TASK_QUEUE",
        `Task directory identity is not a real directory: ${entry.name}`,
      );
    }
    const [taskProof, testProof] = await Promise.all([
      readRegularFileProof(path.join(directory, "TASK.md")),
      readRegularFileProof(path.join(directory, "TEST.md")),
    ]);
    entries.push({
      name: entry.name,
      directoryIdentity: filesystemIdentity(directoryState),
      task: {
        identity: taskProof.identity,
        bytes: taskProof.bytes,
        sha256: taskProof.sha256,
      },
      test: {
        identity: testProof.identity,
        bytes: testProof.bytes,
        sha256: testProof.sha256,
      },
    });
  }
  const semanticQueue = queue.tasks.map((task) => ({
    id: task.id,
    name: task.name,
    title: task.title,
    taskStatus: task.taskStatus,
    testStatus: task.testStatus,
    contractVersion: task.contractVersion,
    dependencies: task.dependencies,
    deliveryRequirement: task.deliveryRequirement,
    blocker: task.blocker,
  }));
  return Object.freeze({
    queue,
    inventory,
    fingerprint: sha256(JSON.stringify({ entries, semanticQueue })),
  });
}

async function assertBatchRootIdentity(tasksRoot, expectedIdentity) {
  const state = await bigintPathState(tasksRoot);
  if (
    !state ||
    state.isSymbolicLink() ||
    !state.isDirectory() ||
    !sameFilesystemIdentity(filesystemIdentity(state), expectedIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "The Task root identity changed during batch creation",
    );
  }
}

async function assertPreparedBatchStillCurrent(prepared, expectedTasks, expectedFingerprint) {
  const currentExpected = expectedBatchTasks(prepared);
  if (
    preparedBatchFingerprint(currentExpected) !== expectedFingerprint ||
    JSON.stringify(currentExpected) !== JSON.stringify(expectedTasks)
  ) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "Prepared Task pair content changed during batch creation",
    );
  }
}

async function assertBatchTargetsAbsent(tasksRoot, expectedTasks) {
  for (const task of expectedTasks) {
    const target = path.join(tasksRoot, task.directoryName);
    if (await bigintPathState(target)) {
      throw new TaskArtifactError(
        "TASK_CREATION_CONFLICT",
        `Task ${task.id} was claimed before the batch could be published`,
      );
    }
  }
}

async function revalidateBatchSnapshot({
  tasksRoot,
  rootIdentity,
  queueFingerprint,
  prepared,
  expectedTasks,
  preparedFingerprint,
}) {
  await assertBatchRootIdentity(tasksRoot, rootIdentity);
  let current;
  try {
    current = await captureTaskQueueSnapshot(tasksRoot);
  } catch (error) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "The Task queue became invalid during batch creation",
      { cause: error },
    );
  }
  if (current.fingerprint !== queueFingerprint) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "The Task queue or a dependency source changed during batch creation",
    );
  }
  await assertPreparedBatchStillCurrent(prepared, expectedTasks, preparedFingerprint);
  await assertBatchTargetsAbsent(tasksRoot, expectedTasks);
}

function journalRecordBody({ sequence, token, event, previousHash, data }) {
  return {
    schemaVersion: batchTransactionSchemaVersion,
    kind: batchTransactionKind,
    sequence,
    token,
    event,
    previousHash,
    data,
  };
}

function createJournalRecord(record) {
  const body = journalRecordBody(record);
  return Object.freeze({ ...body, hash: sha256(JSON.stringify(body)) });
}

function exactObjectKeys(value, expected) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...expected].sort().join(",")
  );
}

function validExpectedBatchFile(file) {
  return (
    exactObjectKeys(file, ["name", "bytes", "sha256"]) &&
    ["TASK.md", "TEST.md"].includes(file.name) &&
    Number.isSafeInteger(file.bytes) &&
    file.bytes >= 0 &&
    batchTransactionHashPattern.test(file.sha256)
  );
}

function validateInitialJournalData(data, token) {
  if (
    !exactObjectKeys(data, [
      "owner",
      "lockIdentity",
      "rootIdentity",
      "queueFingerprint",
      "preparedFingerprint",
      "stageName",
      "tasks",
    ]) ||
    !validFilesystemIdentity(data.lockIdentity) ||
    !validFilesystemIdentity(data.rootIdentity) ||
    !batchTransactionHashPattern.test(data.queueFingerprint) ||
    !batchTransactionHashPattern.test(data.preparedFingerprint) ||
    !Array.isArray(data.tasks) ||
    data.tasks.length === 0 ||
    !exactObjectKeys(data.owner, ["processId", "host", "createdAt"]) ||
    !Number.isSafeInteger(data.owner.processId) ||
    data.owner.processId < 0 ||
    typeof data.owner.host !== "string" ||
    data.owner.host.length < 1 ||
    data.owner.host.length > 64 ||
    /[\u0000-\u001f\u007f/\\]/.test(data.owner.host) ||
    typeof data.owner.createdAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.owner.createdAt)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest INIT record is invalid",
    );
  }
  const firstId = data.tasks[0]?.id;
  const lastId = data.tasks.at(-1)?.id;
  if (data.stageName !== `${batchStagePrefix}${firstId}-${lastId}-${token}.tmp`) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction staging path does not match its identity",
    );
  }
  const ids = new Set();
  const keys = new Set();
  for (const [index, task] of data.tasks.entries()) {
    if (
      !exactObjectKeys(task, [
        "key",
        "id",
        "slug",
        "directoryName",
        "dependencies",
        "files",
      ]) ||
      typeof task.key !== "string" ||
      !batchKeyPattern.test(task.key) ||
      keys.has(task.key) ||
      typeof task.id !== "string" ||
      !/^\d{4}$/.test(task.id) ||
      task.id === "0000" ||
      ids.has(task.id) ||
      typeof task.slug !== "string" ||
      !slugPattern.test(task.slug) ||
      task.directoryName !== buildTaskDirectoryName(task.id, task.slug) ||
      !Array.isArray(task.dependencies) ||
      task.dependencies.some(
        (dependency) => typeof dependency !== "string" || !/^\d{4}$/.test(dependency),
      ) ||
      !Array.isArray(task.files) ||
      task.files.length !== 2 ||
      task.files.some((file) => !validExpectedBatchFile(file)) ||
      task.files.map((file) => file.name).sort().join(",") !== "TASK.md,TEST.md"
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        `The batch transaction manifest Task entry ${index + 1} is invalid`,
      );
    }
    if (
      index > 0 &&
      Number(task.id) !== Number(data.tasks[index - 1].id) + 1
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        "The batch transaction manifest Task IDs are not contiguous",
      );
    }
    ids.add(task.id);
    keys.add(task.key);
  }
}

function validOwnershipFiles(files) {
  return (
    Array.isArray(files) &&
    files.length === 2 &&
    files.every(
      (file) =>
        exactObjectKeys(file, ["name", "identity"]) &&
        ["TASK.md", "TEST.md"].includes(file.name) &&
        validFilesystemIdentity(file.identity),
    ) &&
    files.map((file) => file.name).sort().join(",") === "TASK.md,TEST.md"
  );
}

const batchTransactionPhases = new Set([
  "LOCKED",
  "POST_LOCK_VALIDATED",
  "STAGED",
  "PUBLISHING",
  "ROLLING_BACK",
  "ROLLED_BACK",
  "COMMITTED",
]);

function reduceBatchJournal(records) {
  const initial = records[0];
  validateInitialJournalData(initial.data, initial.token);
  const expectedById = new Map(initial.data.tasks.map((task) => [task.id, task]));
  const ownership = new Map();
  const finalOwnership = new Map();
  const published = new Set();
  let phase = "LOCKED";
  let stageIdentity;

  for (const record of records.slice(1)) {
    if (record.event === "STAGE_CREATED") {
      if (
        !exactObjectKeys(record.data, ["identity"]) ||
        !validFilesystemIdentity(record.data.identity) ||
        stageIdentity
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction STAGE_CREATED record is invalid",
        );
      }
      stageIdentity = record.data.identity;
      continue;
    }
    if (record.event === "TASK_STAGED") {
      if (
        !exactObjectKeys(record.data, [
          "id",
          "directoryIdentity",
          "files",
        ]) ||
        !expectedById.has(record.data.id) ||
        !validFilesystemIdentity(record.data.directoryIdentity) ||
        !validOwnershipFiles(record.data.files) ||
        ownership.has(record.data.id)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction TASK_STAGED record is invalid",
        );
      }
      ownership.set(
        record.data.id,
        Object.freeze({
          directoryIdentity: record.data.directoryIdentity,
          files: Object.freeze(record.data.files),
        }),
      );
      continue;
    }
    if (record.event === "FINAL_DIRECTORY_CREATED") {
      if (
        !exactObjectKeys(record.data, ["id", "directoryIdentity"]) ||
        !expectedById.has(record.data.id) ||
        !validFilesystemIdentity(record.data.directoryIdentity) ||
        finalOwnership.has(record.data.id)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction FINAL_DIRECTORY_CREATED record is invalid",
        );
      }
      finalOwnership.set(record.data.id, {
        directoryIdentity: record.data.directoryIdentity,
        files: [],
      });
      continue;
    }
    if (record.event === "FINAL_FILE_CREATED") {
      const final = finalOwnership.get(record.data?.id);
      if (
        !exactObjectKeys(record.data, ["id", "name", "identity"]) ||
        !final ||
        !["TASK.md", "TEST.md"].includes(record.data.name) ||
        !validFilesystemIdentity(record.data.identity) ||
        final.files.some((file) => file.name === record.data.name)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction FINAL_FILE_CREATED record is invalid",
        );
      }
      final.files.push(
        Object.freeze({
          name: record.data.name,
          identity: record.data.identity,
        }),
      );
      continue;
    }
    if (record.event === "TASK_PUBLISHED") {
      const final = finalOwnership.get(record.data?.id);
      if (
        !exactObjectKeys(record.data, ["id"]) ||
        !expectedById.has(record.data.id) ||
        !final ||
        !validOwnershipFiles(final.files) ||
        published.has(record.data.id)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction TASK_PUBLISHED record is invalid",
        );
      }
      published.add(record.data.id);
      continue;
    }
    if (record.event === "PHASE") {
      if (
        !exactObjectKeys(record.data, ["phase"]) ||
        !batchTransactionPhases.has(record.data.phase)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction PHASE record is invalid",
        );
      }
      phase = record.data.phase;
      continue;
    }
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      `Unsupported batch transaction event ${record.event}`,
    );
  }
  return Object.freeze({
    initial: initial.data,
    token: initial.token,
    phase,
    stageIdentity,
    ownership,
    finalOwnership,
    published,
    lastHash: records.at(-1).hash,
    sequence: records.at(-1).sequence,
  });
}

function parseBatchJournal(content) {
  if (!Buffer.isBuffer(content) || content.byteLength > maxBatchJournalBytes) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest exceeds its bounded size",
    );
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch (error) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest is not valid UTF-8",
      { cause: error },
    );
  }
  if (!text || !text.endsWith("\n")) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest has an incomplete final record",
    );
  }
  const lines = text.slice(0, -1).split("\n");
  const records = [];
  let token;
  let previousHash = null;
  for (const [index, line] of lines.entries()) {
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        `The batch transaction manifest record ${index} is invalid JSON`,
        { cause: error },
      );
    }
    if (
      !exactObjectKeys(record, [
        "schemaVersion",
        "kind",
        "sequence",
        "token",
        "event",
        "previousHash",
        "data",
        "hash",
      ]) ||
      record.schemaVersion !== batchTransactionSchemaVersion ||
      record.kind !== batchTransactionKind ||
      record.sequence !== index ||
      typeof record.event !== "string" ||
      !record.event ||
      !batchTransactionTokenPattern.test(record.token) ||
      !batchTransactionHashPattern.test(record.hash) ||
      record.previousHash !== previousHash ||
      (token && record.token !== token)
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        `The batch transaction manifest record ${index} has invalid identity fields`,
      );
    }
    const body = journalRecordBody(record);
    if (sha256(JSON.stringify(body)) !== record.hash) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        `The batch transaction manifest record ${index} failed its hash chain`,
      );
    }
    if (index === 0 && record.event !== "INIT") {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        "The batch transaction manifest does not start with INIT",
      );
    }
    token = record.token;
    previousHash = record.hash;
    records.push(Object.freeze(record));
  }
  return Object.freeze({
    records: Object.freeze(records),
    state: reduceBatchJournal(records),
  });
}

async function writeAllAt(fileHandle, buffer, position) {
  let offset = 0;
  while (offset < buffer.byteLength) {
    const result = await fileHandle.write(
      buffer,
      offset,
      buffer.byteLength - offset,
      position + offset,
    );
    if (result.bytesWritten < 1) {
      throw new Error("The batch transaction manifest write made no progress");
    }
    offset += result.bytesWritten;
  }
}

async function readOwnedBatchJournal(markerPath, expectedIdentity) {
  const proof = await readRegularFileProof(markerPath);
  if (!sameFilesystemIdentity(proof.identity, expectedIdentity)) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The batch transaction marker no longer has its acquired identity",
    );
  }
  return Object.freeze({ proof, parsed: parseBatchJournal(proof.content) });
}

async function assertOpenBatchHandle(transaction) {
  if (!transaction.handle) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The batch transaction no longer holds its lock handle",
    );
  }
  const handleState = await transaction.handle.stat({ bigint: true });
  if (
    !handleState.isFile() ||
    !sameFilesystemIdentity(filesystemIdentity(handleState), transaction.lockIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The held batch transaction lock identity changed",
    );
  }
}

async function assertOwnedBatchTransaction(transaction) {
  await assertOpenBatchHandle(transaction);
  const loaded = await readOwnedBatchJournal(
    transaction.markerPath,
    transaction.lockIdentity,
  );
  if (
    loaded.parsed.state.token !== transaction.token ||
    loaded.parsed.state.lastHash !== transaction.lastHash ||
    loaded.proof.content.byteLength !== transaction.journalBytes
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The batch transaction marker content changed outside its owner",
    );
  }
  return loaded;
}

async function appendBatchJournal(transaction, event, data) {
  if (transaction.sequence >= 0) {
    await assertOwnedBatchTransaction(transaction);
  } else {
    await assertOpenBatchHandle(transaction);
  }
  const sequence = transaction.sequence + 1;
  const record = createJournalRecord({
    sequence,
    token: transaction.token,
    event,
    previousHash: transaction.lastHash,
    data,
  });
  if (transaction.hooks.beforeJournalAppend) {
    await transaction.hooks.beforeJournalAppend({ event, sequence });
  }
  const bytes = Buffer.from(`${JSON.stringify(record)}\n`, "utf8");
  if (transaction.journalBytes + bytes.byteLength > maxBatchJournalBytes) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest would exceed its bounded size",
    );
  }
  await writeAllAt(transaction.handle, bytes, transaction.journalBytes);
  await transaction.handle.sync();
  if (transaction.hooks.afterJournalAppend) {
    await transaction.hooks.afterJournalAppend({ event, sequence });
  }
  transaction.sequence = sequence;
  transaction.lastHash = record.hash;
  transaction.journalBytes += bytes.byteLength;
  const loaded = await assertOwnedBatchTransaction(transaction);
  transaction.state = loaded.parsed.state;
  return loaded.parsed.state;
}

async function removeMarkerWithExpectedIdentity(markerPath, expectedIdentity) {
  const quarantinePath = `${markerPath}.discard`;
  if (await bigintPathState(quarantinePath)) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "An unexpected transaction discard marker already exists",
    );
  }
  await rename(markerPath, quarantinePath);
  const state = await bigintPathState(quarantinePath);
  if (
    !state ||
    state.isSymbolicLink() ||
    !state.isFile() ||
    !sameFilesystemIdentity(filesystemIdentity(state), expectedIdentity)
  ) {
    if (!(await bigintPathState(markerPath)) && (await bigintPathState(quarantinePath))) {
      await rename(quarantinePath, markerPath);
    }
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The transaction lock was replaced before cleanup",
    );
  }
  await unlink(quarantinePath);
}

async function acquireBatchTransaction({
  tasksRoot,
  lockPath,
  rootIdentity,
  queueFingerprint,
  preparedFingerprint,
  expectedTasks,
  stageName,
  token,
  hooks,
}) {
  let handle;
  let lockIdentity;
  try {
    handle = await open(lockPath, "wx+");
    const handleState = await handle.stat({ bigint: true });
    lockIdentity = filesystemIdentity(handleState);
    const transaction = {
      tasksRoot,
      lockPath,
      markerPath: lockPath,
      handle,
      lockIdentity,
      token,
      hooks,
      sequence: -1,
      lastHash: null,
      journalBytes: 0,
      state: undefined,
    };
    await appendBatchJournal(transaction, "INIT", {
      owner: boundedOwnerMetadata(),
      lockIdentity,
      rootIdentity,
      queueFingerprint,
      preparedFingerprint,
      stageName,
      tasks: expectedTasks,
    });
    return transaction;
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new TaskArtifactError(
        "TASK_CREATION_LOCKED",
        `Another Task creation or unrecovered transaction exists at ${lockPath}`,
        { cause: error },
      );
    }
    if (handle) {
      await handle.close().catch(() => {});
      if (lockIdentity) {
        await removeMarkerWithExpectedIdentity(lockPath, lockIdentity).catch(() => {});
      }
    }
    throw error;
  }
}

function expectedTaskFile(task, name) {
  return task.files.find((file) => file.name === name);
}

function ownershipFile(ownership, name) {
  return ownership.files.find((file) => file.name === name);
}

async function assertDirectoryIdentityAndEntries(
  directory,
  expectedIdentity,
  expectedEntries,
) {
  const before = await bigintPathState(directory);
  if (
    !before ||
    before.isSymbolicLink() ||
    !before.isDirectory() ||
    !sameFilesystemIdentity(filesystemIdentity(before), expectedIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Directory identity is not transaction-owned: ${directory}`,
    );
  }
  const entries = (await readdir(directory, { withFileTypes: true }))
    .map((entry) => entry.name)
    .sort();
  if (entries.join("\n") !== [...expectedEntries].sort().join("\n")) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Directory entries are not the exact transaction-owned set: ${directory}`,
    );
  }
  const after = await bigintPathState(directory);
  if (
    !after ||
    after.isSymbolicLink() ||
    !after.isDirectory() ||
    !sameFilesystemIdentity(filesystemIdentity(after), expectedIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Directory identity changed during proof: ${directory}`,
    );
  }
}

async function proveRecordedTaskDirectory(
  directory,
  task,
  ownership,
  { requireComplete = true } = {},
) {
  if (!ownership) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Task ${task.id} has no recorded regular-file ownership`,
    );
  }
  const names = ownership.files.map((file) => file.name).sort();
  if (
    requireComplete &&
    names.join(",") !== "TASK.md,TEST.md"
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Task ${task.id} has incomplete regular-file ownership`,
    );
  }
  await assertDirectoryIdentityAndEntries(
    directory,
    ownership.directoryIdentity,
    names,
  );
  for (const name of names) {
    const proof = await readRegularFileProof(path.join(directory, name));
    const expected = expectedTaskFile(task, name);
    const observedOwnership = ownershipFile(ownership, name);
    if (
      !proofMatchesExpected(proof, {
        ...expected,
        identity: observedOwnership.identity,
      })
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Task ${task.id} ${name} no longer matches its recorded identity and hash`,
      );
    }
  }
  await assertDirectoryIdentityAndEntries(
    directory,
    ownership.directoryIdentity,
    names,
  );
}

async function proveOwnedTaskDirectory(directory, task, ownership) {
  await proveRecordedTaskDirectory(directory, task, ownership);
}

async function captureStagedTaskOwnership(directory, task) {
  const state = await bigintPathState(directory);
  if (!state || state.isSymbolicLink() || !state.isDirectory()) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Staged Task ${task.id} is not a real directory`,
    );
  }
  const directoryIdentity = filesystemIdentity(state);
  await assertDirectoryIdentityAndEntries(
    directory,
    directoryIdentity,
    ["TASK.md", "TEST.md"],
  );
  const files = [];
  for (const name of ["TASK.md", "TEST.md"]) {
    const proof = await readRegularFileProof(path.join(directory, name));
    const expected = expectedTaskFile(task, name);
    if (!proofMatchesExpected(proof, expected)) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Staged Task ${task.id} ${name} changed before ownership was recorded`,
      );
    }
    files.push(Object.freeze({ name, identity: proof.identity }));
  }
  return Object.freeze({
    directoryIdentity,
    files: Object.freeze(files),
  });
}

async function classifyTaskLocation(
  directory,
  task,
  ownership,
  { requireComplete = true } = {},
) {
  const state = await bigintPathState(directory);
  if (!state) {
    return "MISSING";
  }
  if (!ownership) {
    return "FOREIGN";
  }
  try {
    await proveRecordedTaskDirectory(directory, task, ownership, {
      requireComplete,
    });
    return "OWNED";
  } catch {
    return "FOREIGN";
  }
}

async function restoreMovedForeign(source, destination) {
  if (!(await bigintPathState(source)) && (await bigintPathState(destination))) {
    await rename(destination, source);
  }
}

async function removeProvenRegularFile({
  transaction,
  filePath,
  expected,
  label,
  useRollbackHooks = true,
}) {
  const proof = await readRegularFileProof(filePath);
  if (!proofMatchesExpected(proof, expected)) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `${label} no longer matches its recorded identity and hash`,
    );
  }
  const quarantinePath = `${filePath}.${transaction.token}.remove`;
  if (await bigintPathState(quarantinePath)) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `${label} removal quarantine is unexpectedly occupied`,
    );
  }
  if (useRollbackHooks && transaction.hooks.beforeRollbackFileMove) {
    await transaction.hooks.beforeRollbackFileMove({ label });
  }
  await rename(filePath, quarantinePath);
  try {
    const movedProof = await readRegularFileProof(quarantinePath);
    if (!proofMatchesExpected(movedProof, expected)) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `${label} was replaced during ownership-safe removal`,
      );
    }
    if (useRollbackHooks && transaction.hooks.beforeRollbackFileUnlink) {
      await transaction.hooks.beforeRollbackFileUnlink({ label });
    }
    const finalProof = await readRegularFileProof(quarantinePath);
    if (!proofMatchesExpected(finalProof, expected)) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `${label} changed before ownership-safe unlink`,
      );
    }
    await unlink(quarantinePath);
  } catch (error) {
    await restoreMovedForeign(filePath, quarantinePath);
    throw error;
  }
}

async function removeProvenEmptyDirectory({
  transaction,
  directory,
  identity,
  label,
  useRollbackHooks = true,
}) {
  await assertDirectoryIdentityAndEntries(directory, identity, []);
  const quarantinePath = `${directory}.${transaction.token}.remove`;
  if (await bigintPathState(quarantinePath)) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `${label} removal quarantine is unexpectedly occupied`,
    );
  }
  if (useRollbackHooks && transaction.hooks.beforeRollbackDirectoryRemove) {
    await transaction.hooks.beforeRollbackDirectoryRemove({ label });
  }
  await rename(directory, quarantinePath);
  try {
    await assertDirectoryIdentityAndEntries(quarantinePath, identity, []);
    if (useRollbackHooks && transaction.hooks.beforeRollbackDirectoryRmdir) {
      await transaction.hooks.beforeRollbackDirectoryRmdir({ label });
    }
    await assertDirectoryIdentityAndEntries(quarantinePath, identity, []);
    await rmdir(quarantinePath);
  } catch (error) {
    await restoreMovedForeign(directory, quarantinePath);
    throw error;
  }
}

async function removeProvenTaskDirectory({
  transaction,
  directory,
  task,
  ownership,
  requireComplete = true,
  useRollbackHooks = true,
}) {
  await proveRecordedTaskDirectory(directory, task, ownership, {
    requireComplete,
  });
  const remaining = ownership.files.map((file) => file.name).sort();
  for (const name of [...remaining]) {
    await removeProvenRegularFile({
      transaction,
      filePath: path.join(directory, name),
      expected: {
        ...expectedTaskFile(task, name),
        identity: ownershipFile(ownership, name).identity,
      },
      label: `Task ${task.id} ${name}`,
      useRollbackHooks,
    });
    remaining.splice(remaining.indexOf(name), 1);
    await assertDirectoryIdentityAndEntries(
      directory,
      ownership.directoryIdentity,
      remaining,
    );
  }
  await removeProvenEmptyDirectory({
    transaction,
    directory,
    identity: ownership.directoryIdentity,
    label: `Task ${task.id} directory`,
    useRollbackHooks,
  });
}

async function planBatchRollback(transaction) {
  const {
    initial,
    ownership,
    finalOwnership,
    published,
    stageIdentity,
  } = transaction.state;
  const stageDirectory = path.join(transaction.tasksRoot, initial.stageName);
  const stageState = await bigintPathState(stageDirectory);
  if (stageState) {
    if (!stageIdentity) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "The staging directory exists without a recorded transaction identity",
      );
    }
    const allowed = new Set(initial.tasks.map((task) => task.directoryName));
    const entries = await readdir(stageDirectory, { withFileTypes: true });
    if (entries.some((entry) => !allowed.has(entry.name))) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "The staging directory contains an unexpected entry",
      );
    }
    await assertDirectoryIdentityAndEntries(
      stageDirectory,
      stageIdentity,
      entries.map((entry) => entry.name),
    );
  }

  const tasks = [];
  for (const task of [...initial.tasks].reverse()) {
    const stagedOwnership = ownership.get(task.id);
    const recordedFinalOwnership = finalOwnership.get(task.id);
    const finalDirectory = path.join(transaction.tasksRoot, task.directoryName);
    const stagedDirectory = path.join(stageDirectory, task.directoryName);
    const finalCategory = await classifyTaskLocation(
      finalDirectory,
      task,
      recordedFinalOwnership,
      { requireComplete: false },
    );
    const stagedCategory = await classifyTaskLocation(
      stagedDirectory,
      task,
      stagedOwnership,
    );
    if (stagedCategory === "FOREIGN") {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Staged Task ${task.id} is not fully transaction-owned`,
      );
    }
    if (recordedFinalOwnership && finalCategory !== "OWNED") {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Final Task ${task.id} no longer matches its recorded ownership`,
      );
    }
    if (published.has(task.id) && finalCategory !== "OWNED") {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Published Task ${task.id} no longer has a provable final location`,
      );
    }
    tasks.push(
      Object.freeze({
        task,
        stagedOwnership,
        finalOwnership: recordedFinalOwnership,
        finalDirectory,
        stagedDirectory,
        removeFinal: finalCategory === "OWNED",
        removeStaged: stagedCategory === "OWNED",
      }),
    );
  }
  return Object.freeze({
    stageDirectory,
    stageIdentity,
    tasks: Object.freeze(tasks),
  });
}

async function rollbackBatchTransaction(transaction) {
  const plan = await planBatchRollback(transaction);
  await appendBatchJournal(transaction, "PHASE", { phase: "ROLLING_BACK" });
  if (transaction.hooks.beforeRollback) {
    await transaction.hooks.beforeRollback();
  }
  for (const step of plan.tasks) {
    if (step.removeFinal) {
      await removeProvenTaskDirectory({
        transaction,
        directory: step.finalDirectory,
        task: step.task,
        ownership: step.finalOwnership,
        requireComplete: false,
      });
    }
  }

  if (await bigintPathState(plan.stageDirectory)) {
    for (const step of plan.tasks) {
      if (!step.removeStaged) {
        continue;
      }
      if (
        (await classifyTaskLocation(
          step.stagedDirectory,
          step.task,
          step.stagedOwnership,
        )) !==
        "OWNED"
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_OWNERSHIP_UNPROVEN",
          `Staged Task ${step.task.id} changed during rollback`,
        );
      }
      await removeProvenTaskDirectory({
        transaction,
        directory: step.stagedDirectory,
        task: step.task,
        ownership: step.stagedOwnership,
      });
    }
    await removeProvenEmptyDirectory({
      transaction,
      directory: plan.stageDirectory,
      identity: plan.stageIdentity,
      label: "batch staging directory",
    });
  }
  await appendBatchJournal(transaction, "PHASE", { phase: "ROLLED_BACK" });
}

async function proveCommittedBatch(transaction) {
  const { initial, finalOwnership, stageIdentity } = transaction.state;
  for (const task of initial.tasks) {
    const finalDirectory = path.join(transaction.tasksRoot, task.directoryName);
    await proveOwnedTaskDirectory(
      finalDirectory,
      task,
      finalOwnership.get(task.id),
    );
  }
  const stageDirectory = path.join(transaction.tasksRoot, initial.stageName);
  if (await bigintPathState(stageDirectory)) {
    if (!stageIdentity) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "The committed transaction staging root has no identity record",
      );
    }
    await removeProvenEmptyDirectory({
      transaction,
      directory: stageDirectory,
      identity: stageIdentity,
      label: "committed batch staging directory",
      useRollbackHooks: false,
    });
  }
}

async function closeBatchTransactionHandle(transaction) {
  if (transaction.handle) {
    const handle = transaction.handle;
    transaction.handle = undefined;
    await handle.close();
  }
}

async function releaseOwnedBatchTransaction(transaction) {
  await assertOwnedBatchTransaction(transaction);
  const releasePath = path.join(
    transaction.tasksRoot,
    batchReleaseMarkerName(transaction.token),
  );
  if (transaction.markerPath === transaction.lockPath) {
    if (await bigintPathState(releasePath)) {
      throw new TaskArtifactError(
        "TASK_BATCH_LOCK_OWNERSHIP_LOST",
        "The transaction release marker is unexpectedly occupied",
      );
    }
    if (transaction.hooks.beforeLockReleaseRename) {
      await transaction.hooks.beforeLockReleaseRename();
    }
    await closeBatchTransactionHandle(transaction);
    await rename(transaction.lockPath, releasePath);
    transaction.markerPath = releasePath;
    if (transaction.hooks.afterLockReleaseRename) {
      await transaction.hooks.afterLockReleaseRename();
    }
  } else {
    await closeBatchTransactionHandle(transaction);
  }

  let loaded;
  try {
    loaded = await readOwnedBatchJournal(
      transaction.markerPath,
      transaction.lockIdentity,
    );
  } catch (error) {
    if (
      transaction.markerPath === releasePath &&
      !(await bigintPathState(transaction.lockPath)) &&
      (await bigintPathState(releasePath))
    ) {
      await rename(releasePath, transaction.lockPath);
      transaction.markerPath = transaction.lockPath;
    }
    throw error;
  }
  if (
    loaded.parsed.state.token !== transaction.token ||
    loaded.parsed.state.lastHash !== transaction.lastHash
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The transaction release marker does not belong to the expected token",
    );
  }
  if (await bigintPathState(transaction.lockPath)) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "A replacement creation lock appeared during transaction release",
    );
  }
  if (transaction.hooks.beforeReleaseMarkerUnlink) {
    await transaction.hooks.beforeReleaseMarkerUnlink();
  }
  const finalProof = await readOwnedBatchJournal(
    transaction.markerPath,
    transaction.lockIdentity,
  );
  if (
    finalProof.parsed.state.token !== transaction.token ||
    finalProof.parsed.state.lastHash !== transaction.lastHash
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The transaction release marker changed before unlink",
    );
  }
  await unlink(transaction.markerPath);
  transaction.markerPath = undefined;
}

function normalizeBatchCreationFailure(error, firstId, lastId) {
  if (error instanceof TaskArtifactError) {
    return error;
  }
  return new TaskArtifactError(
    "TASK_BATCH_CREATION_FAILED",
    `Could not create Task batch ${firstId}-${lastId}: ${error.message}`,
    { cause: error },
  );
}

export async function createTaskArtifactBatch({ tasksRoot, tasks, hooks = {} }) {
  const definitions = normalizeBatchTaskDefinitions(tasks);
  const resolvedRoot = await ensureTasksRoot(tasksRoot);
  const transactionArtifacts = await listBatchTransactionArtifacts(resolvedRoot);
  if (transactionArtifacts.length > 0) {
    throw new TaskArtifactError(
      "TASK_CREATION_LOCKED",
      "Another Task creation or unrecovered batch transaction exists",
    );
  }
  const rootState = await bigintPathState(resolvedRoot);
  const rootIdentity = filesystemIdentity(rootState);
  const baseline = await captureTaskQueueSnapshot(resolvedRoot);
  const preallocated = preallocateBatchTasks(
    resolvedRoot,
    baseline.inventory,
    definitions,
  );
  const prepared = renderBatchTasks(preallocated, baseline.queue.tasks);
  const expectedTasks = expectedBatchTasks(prepared);
  const preparedFingerprint = preparedBatchFingerprint(expectedTasks);
  if (hooks.afterPrevalidation) {
    await hooks.afterPrevalidation({ tasks: prepared });
  }

  const firstId = prepared[0].id;
  const lastId = prepared.at(-1).id;
  const token = randomUUID().replaceAll("-", "");
  const stageName = `${batchStagePrefix}${firstId}-${lastId}-${token}.tmp`;
  const stageDirectory = path.join(resolvedRoot, stageName);
  const lockPath = path.join(resolvedRoot, creationLockName);
  let transaction;
  let committed = false;

  try {
    transaction = await acquireBatchTransaction({
      tasksRoot: resolvedRoot,
      lockPath,
      rootIdentity,
      queueFingerprint: baseline.fingerprint,
      preparedFingerprint,
      expectedTasks,
      stageName,
      token,
      hooks,
    });
    if (hooks.afterLock) {
      await hooks.afterLock({ tasks: prepared, lockPath });
    }
    await revalidateBatchSnapshot({
      tasksRoot: resolvedRoot,
      rootIdentity,
      queueFingerprint: baseline.fingerprint,
      prepared,
      expectedTasks,
      preparedFingerprint,
    });
    await appendBatchJournal(transaction, "PHASE", {
      phase: "POST_LOCK_VALIDATED",
    });
    if (hooks.afterPostLockRevalidation) {
      await hooks.afterPostLockRevalidation({ tasks: prepared });
    }

    await mkdir(stageDirectory);
    const stageState = await bigintPathState(stageDirectory);
    if (!stageState || stageState.isSymbolicLink() || !stageState.isDirectory()) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "The batch staging path is not a real directory",
      );
    }
    await appendBatchJournal(transaction, "STAGE_CREATED", {
      identity: filesystemIdentity(stageState),
    });
    if (hooks.afterStageDirectoryCreate) {
      await hooks.afterStageDirectoryCreate({ stageDirectory });
    }

    for (const [index, task] of prepared.entries()) {
      const expectedTask = expectedTasks[index];
      const stagedTaskDirectory = path.join(
        stageDirectory,
        expectedTask.directoryName,
      );
      await mkdir(stagedTaskDirectory);
      await writeFile(
        path.join(stagedTaskDirectory, "TASK.md"),
        task.taskMarkdown,
        { encoding: "utf8", flag: "wx" },
      );
      await writeFile(
        path.join(stagedTaskDirectory, "TEST.md"),
        task.testMarkdown,
        { encoding: "utf8", flag: "wx" },
      );
      const ownership = await captureStagedTaskOwnership(
        stagedTaskDirectory,
        expectedTask,
      );
      await appendBatchJournal(transaction, "TASK_STAGED", {
        id: task.id,
        directoryIdentity: ownership.directoryIdentity,
        files: ownership.files,
      });
      if (hooks.afterPairWrite) {
        await hooks.afterPairWrite({
          stageDirectory,
          stagedTaskDirectory,
          task,
          index,
        });
      }
      await proveOwnedTaskDirectory(
        stagedTaskDirectory,
        expectedTask,
        transaction.state.ownership.get(task.id),
      );
      const stageErrors = await validateTaskDirectory(stagedTaskDirectory);
      if (stageErrors.length > 0) {
        throw invalidBatch(
          `Staged Task ${task.id} failed canonical validation:\n- ${stageErrors.join("\n- ")}`,
          "INVALID_TASK_BATCH_PAIR",
        );
      }
    }
    await appendBatchJournal(transaction, "PHASE", { phase: "STAGED" });
    if (hooks.beforePublish) {
      await hooks.beforePublish({ stageDirectory, tasks: prepared });
    }
    await revalidateBatchSnapshot({
      tasksRoot: resolvedRoot,
      rootIdentity,
      queueFingerprint: baseline.fingerprint,
      prepared,
      expectedTasks,
      preparedFingerprint,
    });
    for (const task of expectedTasks) {
      await proveOwnedTaskDirectory(
        path.join(stageDirectory, task.directoryName),
        task,
        transaction.state.ownership.get(task.id),
      );
    }
    await appendBatchJournal(transaction, "PHASE", { phase: "PUBLISHING" });

    for (const [index, task] of prepared.entries()) {
      const expectedTask = expectedTasks[index];
      const stagedTaskDirectory = path.join(
        stageDirectory,
        expectedTask.directoryName,
      );
      if (hooks.beforeDirectoryPublish) {
        await hooks.beforeDirectoryPublish({ task, index });
      }
      await proveOwnedTaskDirectory(
        stagedTaskDirectory,
        expectedTask,
        transaction.state.ownership.get(task.id),
      );
      try {
        await mkdir(task.directory);
      } catch (error) {
        if (error.code === "EEXIST") {
          throw new TaskArtifactError(
            "TASK_CREATION_CONFLICT",
            `Task ${task.id} was claimed immediately before publication`,
            { cause: error },
          );
        }
        throw error;
      }
      const finalDirectoryState = await bigintPathState(task.directory);
      if (
        !finalDirectoryState ||
        finalDirectoryState.isSymbolicLink() ||
        !finalDirectoryState.isDirectory()
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_OWNERSHIP_UNPROVEN",
          `Final Task ${task.id} is not a real transaction-owned directory`,
        );
      }
      await appendBatchJournal(transaction, "FINAL_DIRECTORY_CREATED", {
        id: task.id,
        directoryIdentity: filesystemIdentity(finalDirectoryState),
      });
      if (hooks.afterFinalDirectoryCreate) {
        await hooks.afterFinalDirectoryCreate({ task, index });
      }
      for (const [name, content] of [
        ["TASK.md", task.taskMarkdown],
        ["TEST.md", task.testMarkdown],
      ]) {
        const finalPath = path.join(task.directory, name);
        await writeFile(finalPath, content, { encoding: "utf8", flag: "wx" });
        const proof = await readRegularFileProof(finalPath);
        if (!proofMatchesExpected(proof, expectedTaskFile(expectedTask, name))) {
          throw new TaskArtifactError(
            "TASK_BATCH_OWNERSHIP_UNPROVEN",
            `Final Task ${task.id} ${name} changed before ownership was recorded`,
          );
        }
        await appendBatchJournal(transaction, "FINAL_FILE_CREATED", {
          id: task.id,
          name,
          identity: proof.identity,
        });
        if (hooks.afterFinalFileCreate) {
          await hooks.afterFinalFileCreate({ task, index, name });
        }
      }
      await proveOwnedTaskDirectory(
        task.directory,
        expectedTask,
        transaction.state.finalOwnership.get(task.id),
      );
      await appendBatchJournal(transaction, "TASK_PUBLISHED", { id: task.id });
      await removeProvenTaskDirectory({
        transaction,
        directory: stagedTaskDirectory,
        task: expectedTask,
        ownership: transaction.state.ownership.get(task.id),
        useRollbackHooks: false,
      });
      if (hooks.afterDirectoryPublish) {
        await hooks.afterDirectoryPublish({ task, index });
      }
    }
    await appendBatchJournal(transaction, "PHASE", { phase: "COMMITTED" });
    committed = true;
    await proveCommittedBatch(transaction);
    await releaseOwnedBatchTransaction(transaction);
  } catch (error) {
    const primary = normalizeBatchCreationFailure(error, firstId, lastId);
    if (!transaction) {
      throw primary;
    }
    if (committed || transaction.state?.phase === "COMMITTED") {
      await closeBatchTransactionHandle(transaction).catch(() => {});
      throw new TaskArtifactError(
        "TASK_BATCH_FINALIZATION_FAILED",
        `Task batch ${firstId}-${lastId} was committed but final cleanup is blocked; inspect and recover the preserved transaction evidence`,
        { cause: primary },
      );
    }
    try {
      await rollbackBatchTransaction(transaction);
      await releaseOwnedBatchTransaction(transaction);
    } catch (rollbackError) {
      await closeBatchTransactionHandle(transaction).catch(() => {});
      throw new TaskArtifactError(
        "TASK_BATCH_ROLLBACK_FAILED",
        `Task batch creation failed and ownership-safe rollback is blocked: ${rollbackError.message}`,
        { cause: primary },
      );
    }
    throw primary;
  }

  return Object.freeze({
    firstId,
    lastId,
    tasks: Object.freeze(
      prepared.map((task) =>
        Object.freeze({
          key: task.key,
          id: task.id,
          slug: task.slug,
          directory: task.directory,
          taskPath: task.taskPath,
          testPath: task.testPath,
          dependencies: task.resolvedDependencies,
        }),
      ),
    ),
  });
}

async function resolveExistingTaskRoot(tasksRoot) {
  if (typeof tasksRoot !== "string" || !tasksRoot.trim()) {
    throw new TaskArtifactError(
      "INVALID_TASK_ROOT",
      "Tasks root must be a non-empty path string",
    );
  }
  const resolved = path.resolve(tasksRoot);
  const state = await bigintPathState(resolved);
  if (!state) {
    return Object.freeze({ resolved, exists: false });
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    throw new TaskArtifactError(
      "INVALID_TASK_ROOT",
      "Task transaction inspection requires a real Task root directory",
    );
  }
  return Object.freeze({
    resolved: await realpath(resolved),
    exists: true,
    identity: filesystemIdentity(state),
  });
}

async function loadBatchTransaction(tasksRoot) {
  const artifacts = await listBatchTransactionArtifacts(tasksRoot);
  if (artifacts.length === 0) {
    return Object.freeze({ exists: false, artifacts });
  }
  const markers = artifacts.filter(
    (name) => name === creationLockName || isBatchReleaseMarkerName(name),
  );
  if (markers.length !== 1) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "Transaction evidence does not contain exactly one lock or release marker",
    );
  }
  const markerName = markers[0];
  const markerPath = path.join(tasksRoot, markerName);
  const proof = await readRegularFileProof(markerPath);
  const parsed = parseBatchJournal(proof.content);
  const expectedMarkerNames = new Set([
    creationLockName,
    batchReleaseMarkerName(parsed.state.token),
  ]);
  if (
    !expectedMarkerNames.has(markerName) ||
    !sameFilesystemIdentity(proof.identity, parsed.state.initial.lockIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "The transaction marker name or filesystem identity is unproven",
    );
  }
  const rootState = await bigintPathState(tasksRoot);
  if (
    !rootState ||
    rootState.isSymbolicLink() ||
    !rootState.isDirectory() ||
    !sameFilesystemIdentity(
      filesystemIdentity(rootState),
      parsed.state.initial.rootIdentity,
    )
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "The Task root no longer matches the transaction root identity",
    );
  }
  const allowedArtifacts = new Set([
    markerName,
    parsed.state.initial.stageName,
  ]);
  if (artifacts.some((name) => !allowedArtifacts.has(name))) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "Unexpected transaction-like evidence is present beside the owned marker",
    );
  }
  return Object.freeze({
    exists: true,
    artifacts,
    markerName,
    markerPath,
    proof,
    parsed,
  });
}

async function openLoadedBatchTransaction(tasksRoot, loaded, hooks) {
  const handle = await open(loaded.markerPath, "r+");
  try {
    const handleState = await handle.stat({ bigint: true });
    if (
      !handleState.isFile() ||
      !sameFilesystemIdentity(
        filesystemIdentity(handleState),
        loaded.proof.identity,
      )
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_RECOVERY_BLOCKED",
        "The transaction marker changed while recovery acquired it",
      );
    }
    const transaction = {
      tasksRoot,
      lockPath: path.join(tasksRoot, creationLockName),
      markerPath: loaded.markerPath,
      handle,
      lockIdentity: loaded.proof.identity,
      token: loaded.parsed.state.token,
      hooks,
      sequence: loaded.parsed.state.sequence,
      lastHash: loaded.parsed.state.lastHash,
      journalBytes: loaded.proof.content.byteLength,
      state: loaded.parsed.state,
    };
    await assertOwnedBatchTransaction(transaction);
    return transaction;
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
}

async function stageObservation(tasksRoot, state) {
  const stagePath = path.join(tasksRoot, state.initial.stageName);
  const observed = await bigintPathState(stagePath);
  if (!observed) {
    return "MISSING";
  }
  if (
    !state.stageIdentity ||
    observed.isSymbolicLink() ||
    !observed.isDirectory() ||
    !sameFilesystemIdentity(
      filesystemIdentity(observed),
      state.stageIdentity,
    )
  ) {
    return "UNPROVEN";
  }
  const entries = await readdir(stagePath, { withFileTypes: true });
  const allowed = new Set(state.initial.tasks.map((task) => task.directoryName));
  if (entries.some((entry) => !allowed.has(entry.name))) {
    return "UNEXPECTED_ENTRY";
  }
  return entries.length === 0 ? "OWNED_EMPTY" : "OWNED_CONTENT";
}

async function diagnosticTaskObservations(tasksRoot, state) {
  const observations = [];
  let truncated = 0;
  const firstId = state.initial.tasks[0].id;
  const lastId = state.initial.tasks.at(-1).id;
  const diagnosticStageName =
    `${batchStagePrefix}${firstId}-${lastId}-${state.token.slice(0, 8)}….tmp`;
  for (const task of state.initial.tasks) {
    const stageDirectory = path.join(
      tasksRoot,
      state.initial.stageName,
      task.directoryName,
    );
    const finalDirectory = path.join(tasksRoot, task.directoryName);
    for (const [relativePath, directory, ownership, requireComplete] of [
      [
        `${diagnosticStageName}/${task.directoryName}`,
        stageDirectory,
        state.ownership.get(task.id),
        true,
      ],
      [
        task.directoryName,
        finalDirectory,
        state.finalOwnership.get(task.id),
        false,
      ],
    ]) {
      const category = await classifyTaskLocation(
        directory,
        task,
        ownership,
        { requireComplete },
      );
      if (category === "MISSING") {
        continue;
      }
      if (observations.length < maxBatchDiagnosticObservations) {
        observations.push(
          Object.freeze({
            path: relativePath,
            category:
              category === "OWNED"
                ? "EXPECTED_IDENTITY_AND_HASH"
                : "UNPROVEN_CONTENT",
          }),
        );
      } else {
        truncated += 1;
      }
    }
  }
  return Object.freeze({
    observations: Object.freeze(observations),
    truncated,
  });
}

function noBatchTransactionDiagnostic() {
  return Object.freeze({
    schemaVersion: batchTransactionSchemaVersion,
    state: "NONE",
    category: "NO_TRANSACTION_EVIDENCE",
    observations: Object.freeze([]),
    truncatedObservations: 0,
  });
}

export async function inspectTaskBatchTransaction({ tasksRoot }) {
  let root;
  try {
    root = await resolveExistingTaskRoot(tasksRoot);
    if (!root.exists) {
      return noBatchTransactionDiagnostic();
    }
    const loaded = await loadBatchTransaction(root.resolved);
    if (!loaded.exists) {
      return noBatchTransactionDiagnostic();
    }
    const state = loaded.parsed.state;
    const firstId = state.initial.tasks[0].id;
    const lastId = state.initial.tasks.at(-1).id;
    const diagnosticStageName =
      `${batchStagePrefix}${firstId}-${lastId}-${state.token.slice(0, 8)}….tmp`;
    const diagnosticMarkerName =
      loaded.markerName === creationLockName
        ? creationLockName
        : `${batchReleaseMarkerPrefix}${state.token.slice(0, 8)}….lock`;
    const taskObservations = await diagnosticTaskObservations(
      root.resolved,
      state,
    );
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      state: "RECOVERY_REQUIRED",
      category: "TRANSACTION_EVIDENCE_PRESENT",
      phase: state.phase,
      tokenPrefix: state.token.slice(0, 8),
      journalHashPrefix: state.lastHash.slice(0, 12),
      preparedHashPrefix: state.initial.preparedFingerprint.slice(0, 12),
      marker: Object.freeze({
        path: diagnosticMarkerName,
        category: "EXPECTED_IDENTITY_AND_HASH_CHAIN",
      }),
      stage: Object.freeze({
        path: diagnosticStageName,
        category: await stageObservation(root.resolved, state),
      }),
      owner: Object.freeze({
        processId: state.initial.owner.processId,
        host: state.initial.owner.host,
        createdAt: state.initial.owner.createdAt,
      }),
      expectedTaskCount: state.initial.tasks.length,
      publishedTaskCount: state.published.size,
      observations: taskObservations.observations,
      truncatedObservations: taskObservations.truncated,
    });
  } catch (error) {
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      state: "BLOCKED",
      category:
        error instanceof TaskArtifactError
          ? error.code
          : "TASK_BATCH_DIAGNOSTIC_FAILED",
      observations: Object.freeze([]),
      truncatedObservations: 0,
    });
  }
}

async function proveRolledBackBatch(transaction) {
  const { initial, finalOwnership, stageIdentity } = transaction.state;
  const stageDirectory = path.join(transaction.tasksRoot, initial.stageName);
  if (await bigintPathState(stageDirectory)) {
    if (!stageIdentity) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "Rolled-back staging content has no recorded identity",
      );
    }
    await assertDirectoryIdentityAndEntries(
      stageDirectory,
      stageIdentity,
      [],
    );
  }
  for (const task of initial.tasks) {
    const finalDirectory = path.join(transaction.tasksRoot, task.directoryName);
    if (
      (await classifyTaskLocation(
        finalDirectory,
        task,
        finalOwnership.get(task.id),
        { requireComplete: false },
      )) === "OWNED"
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Rolled-back Task ${task.id} still exists as transaction-owned content`,
      );
    }
  }
  if (await bigintPathState(stageDirectory)) {
    await removeProvenEmptyDirectory({
      transaction,
      directory: stageDirectory,
      identity: stageIdentity,
      label: "rolled-back batch staging directory",
    });
  }
}

export async function recoverTaskBatchTransaction({ tasksRoot, hooks = {} }) {
  const root = await resolveExistingTaskRoot(tasksRoot);
  if (!root.exists) {
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      recovered: false,
      action: "none",
      state: "NONE",
    });
  }
  let loaded;
  try {
    loaded = await loadBatchTransaction(root.resolved);
  } catch (error) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "Batch transaction recovery cannot prove the preserved evidence",
      { cause: error },
    );
  }
  if (!loaded.exists) {
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      recovered: false,
      action: "none",
      state: "NONE",
    });
  }
  let transaction;
  try {
    transaction = await openLoadedBatchTransaction(
      root.resolved,
      loaded,
      hooks,
    );
    let action;
    if (transaction.state.phase === "COMMITTED") {
      await proveCommittedBatch(transaction);
      action = "completed-cleanup";
    } else if (transaction.state.phase === "ROLLED_BACK") {
      await proveRolledBackBatch(transaction);
      action = "rolled-back-cleanup";
    } else {
      await rollbackBatchTransaction(transaction);
      action = "rolled-back";
    }
    await releaseOwnedBatchTransaction(transaction);
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      recovered: true,
      action,
      state: "RECOVERED",
      tokenPrefix: loaded.parsed.state.token.slice(0, 8),
    });
  } catch (error) {
    if (transaction) {
      await closeBatchTransactionHandle(transaction).catch(() => {});
    }
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "Batch transaction recovery stopped because ownership proof failed; all unproven evidence was preserved",
      { cause: error },
    );
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
