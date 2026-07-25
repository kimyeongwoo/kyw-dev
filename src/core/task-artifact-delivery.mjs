const exactInvocationPattern = /^\$kyw-task\s+(\d{4})(?:\s+([\s\S]*\S))?\s*$/u;
const managedExactAliasPattern = /^task\s+(\d{4})\s+실행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const managedNextAliasPattern = /^task\s+진행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const managedContinuousAliasPattern =
  /^남은\s+task\s+계속\s+실행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const gitShaPattern = /^[0-9a-f]{40}$/;

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
