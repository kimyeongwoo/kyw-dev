const exactInvocationPattern = /^\$kyw-impl\s+(\d{4})(?:\s+([\s\S]*\S))?\s*$/u;
const managedExactAliasPattern = /^task\s+(\d{4})\s+실행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const managedNextAliasPattern = /^task\s+진행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const managedContinuousAliasPattern =
  /^남은\s+task\s+계속\s+실행해줘(?:\s+([\s\S]*\S))?\s*$/iu;
const gitShaPattern = /^[0-9a-f]{40}$/;
const repositoryPattern = /^[^/\s]+\/[^/\s]+$/;

const EXPECTATION_SCHEMA_VERSION = 2;
const HARDENED_LEDGER_SCHEMA_VERSION = 2;
const LEGACY_LEDGER_SCHEMA_VERSION = 1;
const CONTINUITY_SCHEMA_VERSION = 3;
const HARDENED_CONTRACT = "HARDENED_EXACT_HEAD";
const LEGACY_CONTRACT = "LEGACY_PRE_CONTRACT";
const CONTINUITY_CONTRACT = "DURABLE_STANDARD_CONTINUITY";
const LEGACY_CLASSIFICATION = "LEGACY_PRE_CONTRACT_CONTINUITY";
const CONTINUITY_EVALUATION = "PREVIOUSLY_EVALUATOR_SATISFIED";
const LEGACY_ELIGIBILITY_SOURCE = "LOCAL_GIT_PRE_CONTRACT_HISTORY";
const ACTUAL_HEAD_ROLE = "PR_ACTUAL_HEAD";
const MERGE_COMPATIBILITY_ROLE = "PR_MERGE_COMPATIBILITY";
const POST_MERGE_ROLE = "POST_MERGE_MAIN";

function portableFallback(taskId) {
  return taskId ? `$kyw-impl ${taskId}` : "$kyw-impl NNNN";
}

export function parseTaskInvocation(invocation, { managedRoutingAvailable = false } = {}) {
  if (typeof invocation !== "string") {
    throw new TypeError("Task invocation must be a string");
  }
  const explicitRelease = /^\$kyw-deliver\s+--release\s+((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\s+--sha\s+([a-f0-9]{40})\s*$/u.exec(invocation);
  if (explicitRelease) return Object.freeze({ recognized: true, route: "DELIVERY", mode: "EXACT", source: "PORTABLE_SKILL", action: "PUBLIC_RELEASE", releaseVersion: explicitRelease[1], releaseSha: explicitRelease[2] });
  const delivery = /^\$kyw-deliver\s+(\d{4})(?:\s+(--merge))?\s*$/u.exec(invocation);
  if (delivery) return Object.freeze({ recognized: true, route: "DELIVERY", mode: "EXACT", source: "PORTABLE_SKILL", taskId: delivery[1], action: delivery[2] ? "MERGE" : "PR", overrideText: "", overrideScope: "FIRST_SELECTED_TASK" });
  const currentDelivery = /^\$kyw-deliver(?:\s+(--merge))?\s*$/u.exec(invocation);
  if (currentDelivery) return Object.freeze({ recognized: true, route: "DELIVERY", mode: "CURRENT", source: "PORTABLE_SKILL", action: currentDelivery[1] ? "MERGE" : "PR" });
  const audit = /^\$kyw-audit(?:\s+(\d{4}))?(?:\s+(--fix))?\s*$/u.exec(invocation);
  if (audit) return Object.freeze({ recognized: true, route: "AUDIT", mode: audit[1] ? "EXACT" : "CURRENT", source: "PORTABLE_SKILL", taskId: audit[1], action: audit[2] ? "FIX" : "AUDIT" });

  // A quoted goal is a separate explicit form, never a fallback for a broken ID
  // or option. JSON quoting supports embedded quotes without shell evaluation.
  const goalInvocation = /^\$kyw-impl\s+("(?:[^"\\\r\n]|\\[^\r\n])*")\s*$/u.exec(invocation);
  if (goalInvocation) {
    let goal;
    try { goal = JSON.parse(goalInvocation[1]); } catch { /* Invalid escaping is not an invocation. */ }
    if (typeof goal === "string" && goal.trim() && !/[\u0000-\u001f\u007f]/u.test(goal)) {
      return Object.freeze({ recognized: true, route: "IMPLEMENTATION", mode: "GOAL", source: "PORTABLE_SKILL", action: "IMPLEMENT", goal: goal.trim() });
    }
  }

  const exact = exactInvocationPattern.exec(invocation);
  if (exact && !/^--/u.test(exact[2] ?? "")) {
    return Object.freeze({
      recognized: true,
      route: "IMPLEMENTATION",
      mode: "EXACT",
      source: "PORTABLE_SKILL",
      taskId: exact[1],
      overrideText: exact[2] ?? "",
      overrideScope: "FIRST_SELECTED_TASK",
    });
  }

  const invalidExplicit = /^\$kyw-(impl|deliver|audit)(?:\s|$)/u.exec(invocation);
  if (invalidExplicit) {
    return Object.freeze({
      recognized: false,
      route: { impl: "IMPLEMENTATION", deliver: "DELIVERY", audit: "AUDIT" }[invalidExplicit[1]],
      mode: "NONE",
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
  if (/^--/u.test(overrideText)) return Object.freeze({ recognized: false, route: "IMPLEMENTATION", mode: "NONE" });
  if (!managedRoutingAvailable) {
    const fallback = `${portableFallback(taskId)}${overrideText ? ` ${overrideText}` : ""}`;
    return Object.freeze({
      recognized: true,
      route: "IMPLEMENTATION",
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
    route: "IMPLEMENTATION",
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
      overrideClassification: "UNCLASSIFIED",
    });
  }
  const labels = Object.freeze({
    conflicts: "conflict",
    unexplainedUserWork: "unexplained user work",
    remoteDrift: "remote drift",
    userOwnedDecisions: "unresolved user-owned decision",
  });
  const issues = [];
  let overrideClassification = "UNCLASSIFIED";
  for (const key of Object.keys(preflight)) {
    if (key === "overrideClassification") {
      if (
        preflight[key] !== "TASK_OVERRIDE_PRESENT" &&
        preflight[key] !== "NO_TASK_OVERRIDE"
      ) {
        issues.push(
          "execution preflight overrideClassification must be TASK_OVERRIDE_PRESENT or NO_TASK_OVERRIDE",
        );
      } else {
        overrideClassification = preflight[key];
      }
      continue;
    }
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
    if (key !== "remoteDrift") issues.push(...values.map((value) => `${labels[key]}: ${value}`));
  }
  return Object.freeze({
    safe: issues.length === 0,
    issues: Object.freeze(issues),
    overrideClassification,
  });
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unknownFields(label, value, allowed, issues) {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      issues.push(`${label} contains unknown field ${key}`);
    }
  }
}

function requireString(label, value, issues) {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${label} must be a non-empty string`);
    return false;
  }
  return true;
}

function requireSha(label, value, issues) {
  if (!gitShaPattern.test(value ?? "")) {
    issues.push(`${label} must be an exact 40-character lowercase Git SHA`);
    return false;
  }
  return true;
}

function requireDigest(label, value, issues) {
  if (!/^[0-9a-f]{64}$/.test(value ?? "")) {
    issues.push(`${label} must be an exact lowercase SHA-256 digest`);
    return false;
  }
  return true;
}

function requirePositiveInteger(label, value, issues) {
  if (!Number.isInteger(value) || value < 1) {
    issues.push(`${label} must be a positive integer`);
    return false;
  }
  return true;
}

function requireExact(label, value, expected, issues) {
  if (value !== expected) {
    issues.push(`${label} must equal ${JSON.stringify(expected)}`);
    return false;
  }
  return true;
}

function validateStringSet(label, value, issues) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => typeof entry !== "string" || !entry.trim())
  ) {
    issues.push(`${label} must be a non-empty array of non-empty strings`);
    return [];
  }
  if (new Set(value).size !== value.length) {
    issues.push(`${label} must not contain duplicate values`);
  }
  return value;
}

function expectationContractKind(expectation) {
  return isRecord(expectation?.deliveryContract)
    ? expectation.deliveryContract.kind
    : undefined;
}

function continuityExpectationIssues(taskId, expectation) {
  const issues = [];
  unknownFields(
    "expectation",
    expectation,
    [
      "schemaVersion",
      "source",
      "taskId",
      "repository",
      "baseRef",
      "deliveryContract",
    ],
    issues,
  );
  requireExact(
    "expectation.schemaVersion",
    expectation.schemaVersion,
    CONTINUITY_SCHEMA_VERSION,
    issues,
  );
  requireExact(
    "expectation.source",
    expectation.source,
    "ALIGNED_MAIN_CHECKPOINT",
    issues,
  );
  requireExact("expectation.taskId", expectation.taskId, taskId, issues);
  if (!repositoryPattern.test(expectation.repository ?? "")) {
    issues.push("expectation.repository must be an exact owner/name identifier");
  }
  requireExact("expectation.baseRef", expectation.baseRef, "main", issues);
  const contract = expectation.deliveryContract;
  if (!isRecord(contract)) {
    issues.push("expectation.deliveryContract is required");
    return issues;
  }
  unknownFields(
    "expectation.deliveryContract",
    contract,
    [
      "kind",
      "version",
      "checkpointDigest",
      "coveredTaskSetSha256",
      "terminalPairStateSha256",
      "cumulativeEvidenceSha256",
    ],
    issues,
  );
  requireExact(
    "expectation.deliveryContract.kind",
    contract.kind,
    CONTINUITY_CONTRACT,
    issues,
  );
  requireExact("expectation.deliveryContract.version", contract.version, 1, issues);
  requireDigest(
    "expectation.deliveryContract.checkpointDigest",
    contract.checkpointDigest,
    issues,
  );
  requireDigest(
    "expectation.deliveryContract.coveredTaskSetSha256",
    contract.coveredTaskSetSha256,
    issues,
  );
  requireDigest(
    "expectation.deliveryContract.terminalPairStateSha256",
    contract.terminalPairStateSha256,
    issues,
  );
  requireDigest(
    "expectation.deliveryContract.cumulativeEvidenceSha256",
    contract.cumulativeEvidenceSha256,
    issues,
  );
  return issues;
}

function deliveryExpectationIssues(taskId, expectation) {
  const issues = [];
  if (!isRecord(expectation)) {
    return [`Task ${taskId} requires trusted local delivery expectations`];
  }
  if (expectationContractKind(expectation) === CONTINUITY_CONTRACT) {
    return continuityExpectationIssues(taskId, expectation);
  }
  unknownFields(
    "expectation",
    expectation,
    [
      "schemaVersion",
      "source",
      "taskId",
      "repository",
      "baseRef",
      "baseSha",
      "outcomeSha",
      "deliveryContract",
    ],
    issues,
  );
  requireExact(
    "expectation.schemaVersion",
    expectation.schemaVersion,
    EXPECTATION_SCHEMA_VERSION,
    issues,
  );
  requireExact("expectation.source", expectation.source, "LOCAL_GIT", issues);
  requireExact("expectation.taskId", expectation.taskId, taskId, issues);
  if (!repositoryPattern.test(expectation.repository ?? "")) {
    issues.push("expectation.repository must be an exact owner/name identifier");
  }
  requireString("expectation.baseRef", expectation.baseRef, issues);
  requireSha("expectation.outcomeSha", expectation.outcomeSha, issues);

  const contract = expectation.deliveryContract;
  if (!isRecord(contract)) {
    issues.push("expectation.deliveryContract is required");
    return issues;
  }
  if (contract.kind === HARDENED_CONTRACT) {
    requireSha("expectation.baseSha", expectation.baseSha, issues);
    unknownFields(
      "expectation.deliveryContract",
      contract,
      [
        "kind",
        "version",
        "workflow",
        "actualHeadJobs",
        "mergeCompatibilityJob",
        "requiredGateJob",
        "postMergeJobs",
      ],
      issues,
    );
    requireExact("expectation.deliveryContract.version", contract.version, 2, issues);
    const workflow = contract.workflow;
    if (!isRecord(workflow)) {
      issues.push("expectation.deliveryContract.workflow is required");
    } else {
      unknownFields(
        "expectation.deliveryContract.workflow",
        workflow,
        ["id", "name", "path"],
        issues,
      );
      requirePositiveInteger("expectation.deliveryContract.workflow.id", workflow.id, issues);
      requireString("expectation.deliveryContract.workflow.name", workflow.name, issues);
      requireString("expectation.deliveryContract.workflow.path", workflow.path, issues);
    }
    const actualHeadJobs = validateStringSet(
      "expectation.deliveryContract.actualHeadJobs",
      contract.actualHeadJobs,
      issues,
    );
    const postMergeJobs = validateStringSet(
      "expectation.deliveryContract.postMergeJobs",
      contract.postMergeJobs,
      issues,
    );
    requireString(
      "expectation.deliveryContract.mergeCompatibilityJob",
      contract.mergeCompatibilityJob,
      issues,
    );
    requireString(
      "expectation.deliveryContract.requiredGateJob",
      contract.requiredGateJob,
      issues,
    );
    if (actualHeadJobs.includes(contract.mergeCompatibilityJob)) {
      issues.push(
        "expectation.deliveryContract.mergeCompatibilityJob must be distinct from actualHeadJobs",
      );
    }
    if (actualHeadJobs.includes(contract.requiredGateJob)) {
      issues.push(
        "expectation.deliveryContract.requiredGateJob must be distinct from actualHeadJobs",
      );
    }
    if (postMergeJobs.includes(contract.requiredGateJob)) {
      issues.push(
        "expectation.deliveryContract.requiredGateJob must be distinct from postMergeJobs",
      );
    }
  } else if (contract.kind === LEGACY_CONTRACT) {
    unknownFields(
      "expectation.deliveryContract",
      contract,
      [
        "kind",
        "version",
        "eligibilitySource",
        "contractAnchorSha",
        "mergeSha",
      ],
      issues,
    );
    requireExact("expectation.deliveryContract.version", contract.version, 1, issues);
    requireExact(
      "expectation.deliveryContract.eligibilitySource",
      contract.eligibilitySource,
      LEGACY_ELIGIBILITY_SOURCE,
      issues,
    );
    requireSha(
      "expectation.deliveryContract.contractAnchorSha",
      contract.contractAnchorSha,
      issues,
    );
    requireSha("expectation.deliveryContract.mergeSha", contract.mergeSha, issues);
  } else {
    issues.push(
      `expectation.deliveryContract.kind must be ${HARDENED_CONTRACT}, ${LEGACY_CONTRACT}, or ${CONTINUITY_CONTRACT}`,
    );
  }
  return issues;
}

function deliveryIdentityIssues(taskId, entry, expectation) {
  const issues = [];
  if (!isRecord(entry)) {
    return [`Task ${taskId} requires GitHub delivery evidence`];
  }
  requireExact("source", entry.source, "GITHUB", issues);
  requireExact("taskId", entry.taskId, taskId, issues);
  if (!repositoryPattern.test(entry.repository ?? "")) {
    issues.push("repository must be an exact owner/name identifier");
  }
  if (entry.repository !== expectation?.repository) {
    issues.push("repository must equal the trusted local expectation");
  }
  requireSha("outcomeSha", entry.outcomeSha, issues);
  if (entry.outcomeSha !== expectation?.outcomeSha) {
    issues.push("outcomeSha must equal the trusted local expectation");
  }
  return issues;
}

function createValidation(classification, actualHead, mergeCompatibility, postMerge) {
  return {
    issues: [],
    blockers: [],
    classification,
    actualHead,
    mergeCompatibility,
    postMerge,
  };
}

function validateConclusion(label, conclusion, validation) {
  if (conclusion === "FAILURE") {
    validation.blockers.push(`${label} reports FAILURE`);
  } else if (conclusion !== "SUCCESS") {
    validation.issues.push(`${label} must be SUCCESS`);
  }
}

function validateWorkflowRun(label, role, expectedRole, expectation, entry, validation) {
  const issues = validation.issues;
  if (!isRecord(role)) {
    issues.push(`${label} evidence is required`);
    return false;
  }
  const workflow = expectation?.deliveryContract?.workflow;
  requireExact(`${label}.role`, role.role, expectedRole, issues);
  requireExact(`${label}.repository`, role.repository, entry.repository, issues);
  requirePositiveInteger(`${label}.workflowId`, role.workflowId, issues);
  requireExact(`${label}.workflowId`, role.workflowId, workflow?.id, issues);
  requireString(`${label}.workflowName`, role.workflowName, issues);
  requireExact(`${label}.workflowName`, role.workflowName, workflow?.name, issues);
  requireString(`${label}.workflowPath`, role.workflowPath, issues);
  requireExact(`${label}.workflowPath`, role.workflowPath, workflow?.path, issues);
  requirePositiveInteger(`${label}.runId`, role.runId, issues);
  requirePositiveInteger(`${label}.runAttempt`, role.runAttempt, issues);
  requireSha(`${label}.runHeadSha`, role.runHeadSha, issues);
  return true;
}

function validateCheckoutJob(
  label,
  job,
  { expectedName, expectedSha },
  validation,
) {
  const issues = validation.issues;
  if (!isRecord(job)) {
    issues.push(`${label} must be an object`);
    return undefined;
  }
  unknownFields(
    label,
    job,
    [
      "id",
      "name",
      "key",
      "conclusion",
      "expectedSha",
      "actualCheckoutSha",
    ],
    issues,
  );
  requirePositiveInteger(`${label}.id`, job.id, issues);
  requireString(`${label}.name`, job.name, issues);
  if (expectedName !== undefined) {
    requireExact(`${label}.name`, job.name, expectedName, issues);
  }
  requireString(`${label}.key`, job.key, issues);
  validateConclusion(`${label}.conclusion`, job.conclusion, validation);
  requireSha(`${label}.expectedSha`, job.expectedSha, issues);
  requireExact(`${label}.expectedSha`, job.expectedSha, expectedSha, issues);
  requireSha(`${label}.actualCheckoutSha`, job.actualCheckoutSha, issues);
  requireExact(
    `${label}.actualCheckoutSha`,
    job.actualCheckoutSha,
    expectedSha,
    issues,
  );
  return job.id;
}

function validateGateJob(label, job, expectedName, validation) {
  const issues = validation.issues;
  if (!isRecord(job)) {
    issues.push(`${label} evidence is required`);
    return undefined;
  }
  unknownFields(label, job, ["id", "name", "key", "conclusion"], issues);
  requirePositiveInteger(`${label}.id`, job.id, issues);
  requireString(`${label}.name`, job.name, issues);
  requireExact(`${label}.name`, job.name, expectedName, issues);
  requireString(`${label}.key`, job.key, issues);
  validateConclusion(`${label}.conclusion`, job.conclusion, validation);
  return job.id;
}

function validateCheckoutJobSet(
  label,
  jobs,
  expectedNames,
  expectedSha,
  validation,
) {
  const issues = validation.issues;
  if (!Array.isArray(jobs)) {
    issues.push(`${label} must be an array`);
    return [];
  }
  const expected = Array.isArray(expectedNames) ? expectedNames : [];
  const actualNames = jobs.map((job) => job?.name);
  if (
    actualNames.length !== expected.length ||
    expected.some((name) => !actualNames.includes(name)) ||
    actualNames.some((name) => !expected.includes(name))
  ) {
    issues.push(`${label} names must exactly match the trusted required job set`);
  }
  if (new Set(actualNames).size !== actualNames.length) {
    issues.push(`${label} must not reuse a job name`);
  }
  return jobs
    .map((job, index) =>
      validateCheckoutJob(
        `${label}[${index}]`,
        job,
        { expectedName: job?.name, expectedSha },
        validation,
      ),
    )
    .filter((value) => value !== undefined);
}

function validatePullRequest(entry, expectation, validation, { final }) {
  const issues = validation.issues;
  const pullRequest = entry.pullRequest;
  if (!isRecord(pullRequest)) {
    issues.push("pullRequest evidence is required");
    return undefined;
  }
  unknownFields(
    "pullRequest",
    pullRequest,
    ["number", "headSha", "baseRef", "baseSha", "mergeSha", "state", "review"],
    issues,
  );
  requirePositiveInteger("pullRequest.number", pullRequest.number, issues);
  requireSha("pullRequest.headSha", pullRequest.headSha, issues);
  requireExact("pullRequest.headSha", pullRequest.headSha, entry.outcomeSha, issues);
  requireString("pullRequest.baseRef", pullRequest.baseRef, issues);
  requireExact(
    "pullRequest.baseRef",
    pullRequest.baseRef,
    expectation?.baseRef,
    issues,
  );
  requireSha("pullRequest.baseSha", pullRequest.baseSha, issues);
  if (pullRequest.baseSha !== expectation?.baseSha) {
    issues.push("pullRequest.baseSha must equal the trusted local expectation");
  }
  if (!["OPEN", "MERGED"].includes(pullRequest.state)) {
    issues.push("pullRequest.state must be OPEN or MERGED");
  }
  if (!["PENDING", "CLEAR", "CHANGES_REQUESTED"].includes(pullRequest.review)) {
    issues.push("pullRequest.review must be PENDING, CLEAR, or CHANGES_REQUESTED");
  } else if (pullRequest.review === "CHANGES_REQUESTED") {
    validation.blockers.push("pullRequest.review reports CHANGES_REQUESTED");
  }
  if (pullRequest.state === "OPEN") {
    if (pullRequest.mergeSha !== undefined && pullRequest.mergeSha !== null) {
      issues.push("an OPEN pullRequest must not assert mergeSha");
    }
    if (entry.merge !== undefined && entry.merge !== null) {
      issues.push("an OPEN pullRequest must not assert merge evidence");
    }
    if (entry.postMerge !== undefined && entry.postMerge !== null) {
      issues.push("an OPEN pullRequest must not assert postMerge evidence");
    }
  } else {
    requireSha("pullRequest.mergeSha", pullRequest.mergeSha, issues);
  }
  if (final) {
    requireExact("pullRequest.state", pullRequest.state, "MERGED", issues);
    requireExact("pullRequest.review", pullRequest.review, "CLEAR", issues);
  }
  return pullRequest;
}

function validateMerge(entry, pullRequest, validation, { required }) {
  const issues = validation.issues;
  const merge = entry.merge;
  if (!isRecord(merge)) {
    if (required) issues.push("merge evidence is required");
    return undefined;
  }
  unknownFields("merge", merge, ["repository", "branch", "sha"], issues);
  requireExact("merge.repository", merge.repository, entry.repository, issues);
  requireExact("merge.branch", merge.branch, pullRequest?.baseRef, issues);
  requireSha("merge.sha", merge.sha, issues);
  requireExact("merge.sha", merge.sha, pullRequest?.mergeSha, issues);
  return merge;
}

function validateActualHead(entry, expectation, pullRequest, validation, { required }) {
  const evidence = entry.actualHead;
  if (!isRecord(evidence)) {
    if (required) validation.issues.push("actualHead evidence is required");
    return undefined;
  }
  unknownFields(
    "actualHead",
    evidence,
    [
      "role",
      "repository",
      "event",
      "pullRequestNumber",
      "workflowId",
      "workflowName",
      "workflowPath",
      "runId",
      "runAttempt",
      "runHeadSha",
      "jobs",
      "gateJob",
    ],
    validation.issues,
  );
  validateWorkflowRun(
    "actualHead",
    evidence,
    ACTUAL_HEAD_ROLE,
    expectation,
    entry,
    validation,
  );
  requireExact("actualHead.event", evidence.event, "pull_request", validation.issues);
  requireExact(
    "actualHead.pullRequestNumber",
    evidence.pullRequestNumber,
    pullRequest?.number,
    validation.issues,
  );
  requireExact(
    "actualHead.runHeadSha",
    evidence.runHeadSha,
    entry.outcomeSha,
    validation.issues,
  );
  const jobIds = validateCheckoutJobSet(
    "actualHead.jobs",
    evidence.jobs,
    expectation?.deliveryContract?.actualHeadJobs,
    entry.outcomeSha,
    validation,
  );
  const gateJobId = validateGateJob(
    "actualHead.gateJob",
    evidence.gateJob,
    expectation?.deliveryContract?.requiredGateJob,
    validation,
  );
  return { ...evidence, jobIds, gateJobId };
}

function validateMergeCompatibility(
  entry,
  expectation,
  pullRequest,
  validation,
  { required },
) {
  const evidence = entry.mergeCompatibility;
  if (!isRecord(evidence)) {
    if (required) validation.issues.push("mergeCompatibility evidence is required");
    return undefined;
  }
  unknownFields(
    "mergeCompatibility",
    evidence,
    [
      "role",
      "repository",
      "event",
      "pullRequestNumber",
      "workflowId",
      "workflowName",
      "workflowPath",
      "runId",
      "runAttempt",
      "runHeadSha",
      "syntheticMergeSha",
      "expectedBaseSha",
      "actualBaseParentSha",
      "expectedHeadSha",
      "actualHeadParentSha",
      "job",
    ],
    validation.issues,
  );
  validateWorkflowRun(
    "mergeCompatibility",
    evidence,
    MERGE_COMPATIBILITY_ROLE,
    expectation,
    entry,
    validation,
  );
  requireExact(
    "mergeCompatibility.event",
    evidence.event,
    "pull_request",
    validation.issues,
  );
  requireExact(
    "mergeCompatibility.pullRequestNumber",
    evidence.pullRequestNumber,
    pullRequest?.number,
    validation.issues,
  );
  requireExact(
    "mergeCompatibility.runHeadSha",
    evidence.runHeadSha,
    entry.outcomeSha,
    validation.issues,
  );
  requireSha(
    "mergeCompatibility.syntheticMergeSha",
    evidence.syntheticMergeSha,
    validation.issues,
  );
  if (evidence.syntheticMergeSha === entry.outcomeSha) {
    validation.issues.push(
      "mergeCompatibility.syntheticMergeSha must be distinct from the actual PR head",
    );
  }
  requireExact(
    "mergeCompatibility.expectedBaseSha",
    evidence.expectedBaseSha,
    pullRequest?.baseSha,
    validation.issues,
  );
  requireExact(
    "mergeCompatibility.actualBaseParentSha",
    evidence.actualBaseParentSha,
    pullRequest?.baseSha,
    validation.issues,
  );
  requireExact(
    "mergeCompatibility.expectedHeadSha",
    evidence.expectedHeadSha,
    entry.outcomeSha,
    validation.issues,
  );
  requireExact(
    "mergeCompatibility.actualHeadParentSha",
    evidence.actualHeadParentSha,
    entry.outcomeSha,
    validation.issues,
  );
  const jobId = validateCheckoutJob(
    "mergeCompatibility.job",
    evidence.job,
    {
      expectedName: expectation?.deliveryContract?.mergeCompatibilityJob,
      expectedSha: evidence.syntheticMergeSha,
    },
    validation,
  );
  return { ...evidence, jobId };
}

function validatePostMerge(entry, expectation, pullRequest, merge, validation, { required }) {
  const evidence = entry.postMerge;
  if (!isRecord(evidence)) {
    if (required) validation.issues.push("postMerge evidence is required");
    return undefined;
  }
  unknownFields(
    "postMerge",
    evidence,
    [
      "role",
      "repository",
      "event",
      "branch",
      "workflowId",
      "workflowName",
      "workflowPath",
      "runId",
      "runAttempt",
      "runHeadSha",
      "jobs",
      "gateJob",
    ],
    validation.issues,
  );
  validateWorkflowRun(
    "postMerge",
    evidence,
    POST_MERGE_ROLE,
    expectation,
    entry,
    validation,
  );
  requireExact("postMerge.event", evidence.event, "push", validation.issues);
  requireExact("postMerge.branch", evidence.branch, pullRequest?.baseRef, validation.issues);
  requireExact("postMerge.runHeadSha", evidence.runHeadSha, merge?.sha, validation.issues);
  const jobIds = validateCheckoutJobSet(
    "postMerge.jobs",
    evidence.jobs,
    expectation?.deliveryContract?.postMergeJobs,
    merge?.sha,
    validation,
  );
  const gateJobId = validateGateJob(
    "postMerge.gateJob",
    evidence.gateJob,
    expectation?.deliveryContract?.requiredGateJob,
    validation,
  );
  return { ...evidence, jobIds, gateJobId };
}

function validateDistinctExactIdentities(actualHead, mergeCompatibility, postMerge, validation) {
  if (actualHead && mergeCompatibility) {
    requireExact(
      "mergeCompatibility.runId",
      mergeCompatibility.runId,
      actualHead.runId,
      validation.issues,
    );
    requireExact(
      "mergeCompatibility.runAttempt",
      mergeCompatibility.runAttempt,
      actualHead.runAttempt,
      validation.issues,
    );
  }
  if (
    postMerge &&
    (postMerge.runId === actualHead?.runId || postMerge.runId === mergeCompatibility?.runId)
  ) {
    validation.issues.push("postMerge.runId must be distinct from the pull-request run");
  }
  const ids = [
    ...(actualHead?.jobIds ?? []),
    actualHead?.gateJobId,
    mergeCompatibility?.jobId,
    ...(postMerge?.jobIds ?? []),
    postMerge?.gateJobId,
  ].filter((value) => value !== undefined);
  if (new Set(ids).size !== ids.length) {
    validation.issues.push(
      "actualHead, mergeCompatibility, gate, and postMerge evidence must not reuse a job ID",
    );
  }
}

function validateHardenedEntry(taskId, entry, expectation, { final }) {
  const validation = createValidation(
    HARDENED_CONTRACT,
    "VERIFIED",
    "VERIFIED_SYNTHETIC",
    "VERIFIED_EXACT_CHECKOUT",
  );
  validation.issues.push(...deliveryExpectationIssues(taskId, expectation));
  if (!isRecord(entry)) {
    validation.issues.push(`Task ${taskId} requires GitHub delivery evidence`);
    return validation;
  }
  unknownFields(
    "delivery evidence",
    entry,
    [
      "schemaVersion",
      "claim",
      "source",
      "taskId",
      "repository",
      "outcomeSha",
      "pullRequest",
      "actualHead",
      "mergeCompatibility",
      "merge",
      "postMerge",
    ],
    validation.issues,
  );
  requireExact(
    "schemaVersion",
    entry.schemaVersion,
    HARDENED_LEDGER_SCHEMA_VERSION,
    validation.issues,
  );
  requireExact("claim", entry.claim, final ? "FINAL" : "PENDING", validation.issues);
  validation.issues.push(...deliveryIdentityIssues(taskId, entry, expectation));
  if (expectationContractKind(expectation) !== HARDENED_CONTRACT) {
    validation.issues.push(
      `hardened schema ${HARDENED_LEDGER_SCHEMA_VERSION} evidence requires ${HARDENED_CONTRACT} expectations`,
    );
  }

  const pullRequest = validatePullRequest(entry, expectation, validation, { final });
  const mergeRequired = final || pullRequest?.state === "MERGED";
  const merge = validateMerge(entry, pullRequest, validation, { required: mergeRequired });
  const actualHead = validateActualHead(entry, expectation, pullRequest, validation, {
    required: final,
  });
  const mergeCompatibility = validateMergeCompatibility(
    entry,
    expectation,
    pullRequest,
    validation,
    { required: final },
  );
  const postMerge = validatePostMerge(
    entry,
    expectation,
    pullRequest,
    merge,
    validation,
    { required: final },
  );
  validation.actualHead = actualHead ? "VERIFIED" : "UNVERIFIED";
  validation.mergeCompatibility = mergeCompatibility
    ? "VERIFIED_SYNTHETIC"
    : "UNVERIFIED";
  validation.postMerge = postMerge ? "VERIFIED_EXACT_CHECKOUT" : "UNVERIFIED";
  validateDistinctExactIdentities(
    actualHead,
    mergeCompatibility,
    postMerge,
    validation,
  );
  return validation;
}

function validateLegacyObservedMergeCompatibility(entry, observed, validation) {
  if (observed === undefined) return "LEGACY_CHECKS_SUCCESS";
  if (!isRecord(observed)) {
    validation.issues.push("observedMergeCompatibility must be an object when present");
    return "INVALID";
  }
  unknownFields(
    "observedMergeCompatibility",
    observed,
    [
      "role",
      "runId",
      "jobId",
      "syntheticMergeSha",
      "actualCheckoutSha",
      "baseSha",
      "headSha",
      "actualBaseParentSha",
      "actualHeadParentSha",
    ],
    validation.issues,
  );
  requireExact(
    "observedMergeCompatibility.role",
    observed.role,
    MERGE_COMPATIBILITY_ROLE,
    validation.issues,
  );
  requireExact(
    "observedMergeCompatibility.runId",
    observed.runId,
    entry.pullRequest?.runId,
    validation.issues,
  );
  requirePositiveInteger(
    "observedMergeCompatibility.jobId",
    observed.jobId,
    validation.issues,
  );
  requireSha(
    "observedMergeCompatibility.syntheticMergeSha",
    observed.syntheticMergeSha,
    validation.issues,
  );
  requireExact(
    "observedMergeCompatibility.actualCheckoutSha",
    observed.actualCheckoutSha,
    observed.syntheticMergeSha,
    validation.issues,
  );
  requireSha(
    "observedMergeCompatibility.baseSha",
    observed.baseSha,
    validation.issues,
  );
  requireExact(
    "observedMergeCompatibility.headSha",
    observed.headSha,
    entry.outcomeSha,
    validation.issues,
  );
  requireExact(
    "observedMergeCompatibility.actualBaseParentSha",
    observed.actualBaseParentSha,
    observed.baseSha,
    validation.issues,
  );
  requireExact(
    "observedMergeCompatibility.actualHeadParentSha",
    observed.actualHeadParentSha,
    entry.outcomeSha,
    validation.issues,
  );
  if (observed.syntheticMergeSha === entry.outcomeSha) {
    validation.issues.push(
      "observedMergeCompatibility.syntheticMergeSha must be distinct from the PR head",
    );
  }
  return "VERIFIED_SYNTHETIC";
}

function validateLegacyObservedPostMerge(entry, observed, validation) {
  if (observed === undefined) return "LEGACY_API_HEAD_SUCCESS";
  if (!isRecord(observed)) {
    validation.issues.push("observedPostMerge must be an object when present");
    return "INVALID";
  }
  unknownFields(
    "observedPostMerge",
    observed,
    ["role", "runId", "jobId", "expectedSha", "actualCheckoutSha"],
    validation.issues,
  );
  requireExact(
    "observedPostMerge.role",
    observed.role,
    POST_MERGE_ROLE,
    validation.issues,
  );
  requireExact(
    "observedPostMerge.runId",
    observed.runId,
    entry.merge?.runId,
    validation.issues,
  );
  requirePositiveInteger("observedPostMerge.jobId", observed.jobId, validation.issues);
  requireExact(
    "observedPostMerge.expectedSha",
    observed.expectedSha,
    entry.merge?.sha,
    validation.issues,
  );
  requireExact(
    "observedPostMerge.actualCheckoutSha",
    observed.actualCheckoutSha,
    entry.merge?.sha,
    validation.issues,
  );
  return "VERIFIED_EXACT_CHECKOUT";
}

function validateLegacyEntry(taskId, entry, expectation) {
  const validation = createValidation(
    LEGACY_CLASSIFICATION,
    "UNVERIFIED",
    "LEGACY_CHECKS_SUCCESS",
    "LEGACY_API_HEAD_SUCCESS",
  );
  validation.issues.push(...deliveryExpectationIssues(taskId, expectation));
  if (!isRecord(entry)) {
    validation.issues.push(`Task ${taskId} requires GitHub delivery evidence`);
    return validation;
  }
  unknownFields(
    "delivery evidence",
    entry,
    [
      "schemaVersion",
      "claim",
      "source",
      "taskId",
      "repository",
      "outcomeSha",
      "classification",
      "actualHead",
      "contractAnchorSha",
      "pullRequest",
      "merge",
      "observedMergeCompatibility",
      "observedPostMerge",
    ],
    validation.issues,
  );
  requireExact(
    "schemaVersion",
    entry.schemaVersion,
    LEGACY_LEDGER_SCHEMA_VERSION,
    validation.issues,
  );
  requireExact("claim", entry.claim, "FINAL", validation.issues);
  validation.issues.push(...deliveryIdentityIssues(taskId, entry, expectation));
  requireExact("classification", entry.classification, LEGACY_CLASSIFICATION, validation.issues);
  requireExact("actualHead", entry.actualHead, "UNVERIFIED", validation.issues);
  const contract = expectation?.deliveryContract;
  if (expectationContractKind(expectation) !== LEGACY_CONTRACT) {
    validation.issues.push(
      `legacy schema ${LEGACY_LEDGER_SCHEMA_VERSION} evidence requires ${LEGACY_CONTRACT} expectations`,
    );
  }
  requireExact(
    "contractAnchorSha",
    entry.contractAnchorSha,
    contract?.contractAnchorSha,
    validation.issues,
  );

  const pullRequest = entry.pullRequest;
  if (!isRecord(pullRequest)) {
    validation.issues.push("pullRequest evidence is required");
  } else {
    unknownFields(
      "pullRequest",
      pullRequest,
      [
        "number",
        "headSha",
        "baseRef",
        "mergeSha",
        "state",
        "checks",
        "review",
        "runId",
      ],
      validation.issues,
    );
    requirePositiveInteger("pullRequest.number", pullRequest.number, validation.issues);
    requireExact(
      "pullRequest.headSha",
      pullRequest.headSha,
      entry.outcomeSha,
      validation.issues,
    );
    requireExact(
      "pullRequest.baseRef",
      pullRequest.baseRef,
      expectation?.baseRef,
      validation.issues,
    );
    requireExact(
      "pullRequest.mergeSha",
      pullRequest.mergeSha,
      contract?.mergeSha,
      validation.issues,
    );
    requireExact("pullRequest.state", pullRequest.state, "MERGED", validation.issues);
    validateConclusion("pullRequest.checks", pullRequest.checks, validation);
    if (pullRequest.review === "CHANGES_REQUESTED") {
      validation.blockers.push("pullRequest.review reports CHANGES_REQUESTED");
    } else {
      requireExact("pullRequest.review", pullRequest.review, "CLEAR", validation.issues);
    }
    requirePositiveInteger("pullRequest.runId", pullRequest.runId, validation.issues);
  }

  const merge = entry.merge;
  if (!isRecord(merge)) {
    validation.issues.push("merge evidence is required");
  } else {
    unknownFields(
      "merge",
      merge,
      [
        "repository",
        "branch",
        "sha",
        "mainRunHeadSha",
        "checks",
        "runId",
      ],
      validation.issues,
    );
    requireExact("merge.repository", merge.repository, entry.repository, validation.issues);
    requireExact("merge.branch", merge.branch, expectation?.baseRef, validation.issues);
    requireExact("merge.sha", merge.sha, contract?.mergeSha, validation.issues);
    requireExact("merge.mainRunHeadSha", merge.mainRunHeadSha, merge.sha, validation.issues);
    validateConclusion("merge.checks", merge.checks, validation);
    requirePositiveInteger("merge.runId", merge.runId, validation.issues);
  }

  validation.mergeCompatibility = validateLegacyObservedMergeCompatibility(
    entry,
    entry.observedMergeCompatibility,
    validation,
  );
  validation.postMerge = validateLegacyObservedPostMerge(
    entry,
    entry.observedPostMerge,
    validation,
  );
  return validation;
}

function validateContinuityEntry(taskId, entry, expectation) {
  const validation = createValidation(
    CONTINUITY_CONTRACT,
    CONTINUITY_EVALUATION,
    CONTINUITY_EVALUATION,
    CONTINUITY_EVALUATION,
  );
  validation.issues.push(...deliveryExpectationIssues(taskId, expectation));
  if (!isRecord(entry)) {
    validation.issues.push(
      `Task ${taskId} requires durable STANDARD continuity evidence`,
    );
    return validation;
  }
  unknownFields(
    "delivery evidence",
    entry,
    [
      "schemaVersion",
      "claim",
      "source",
      "taskId",
      "repository",
      "classification",
      "checkpointDigest",
      "coveredTaskSetSha256",
      "terminalPairStateSha256",
      "cumulativeEvidenceSha256",
      "evaluation",
    ],
    validation.issues,
  );
  requireExact(
    "schemaVersion",
    entry.schemaVersion,
    CONTINUITY_SCHEMA_VERSION,
    validation.issues,
  );
  requireExact("claim", entry.claim, "FINAL", validation.issues);
  requireExact(
    "source",
    entry.source,
    "REPOSITORY_CHECKPOINT",
    validation.issues,
  );
  requireExact("taskId", entry.taskId, taskId, validation.issues);
  if (!repositoryPattern.test(entry.repository ?? "")) {
    validation.issues.push("repository must be an exact owner/name identifier");
  }
  requireExact(
    "repository",
    entry.repository,
    expectation?.repository,
    validation.issues,
  );
  requireExact(
    "classification",
    entry.classification,
    CONTINUITY_CONTRACT,
    validation.issues,
  );
  requireExact(
    "evaluation",
    entry.evaluation,
    CONTINUITY_EVALUATION,
    validation.issues,
  );
  const contract = expectation?.deliveryContract;
  for (const field of [
    "checkpointDigest",
    "coveredTaskSetSha256",
    "terminalPairStateSha256",
    "cumulativeEvidenceSha256",
  ]) {
    requireDigest(field, entry[field], validation.issues);
    requireExact(field, entry[field], contract?.[field], validation.issues);
  }
  return validation;
}

function invalidValidation(taskId, entry, expectation) {
  const validation = createValidation("INVALID", "UNVERIFIED", "UNVERIFIED", "UNVERIFIED");
  validation.issues.push(...deliveryExpectationIssues(taskId, expectation));
  if (!isRecord(entry)) {
    validation.issues.push(`Task ${taskId} requires GitHub delivery evidence`);
    return validation;
  }
  validation.issues.push(...deliveryIdentityIssues(taskId, entry, expectation));
  if (
    ![
      LEGACY_LEDGER_SCHEMA_VERSION,
      HARDENED_LEDGER_SCHEMA_VERSION,
      CONTINUITY_SCHEMA_VERSION,
    ].includes(entry.schemaVersion)
  ) {
    validation.issues.push(
      `schemaVersion must be ${LEGACY_LEDGER_SCHEMA_VERSION}, ${HARDENED_LEDGER_SCHEMA_VERSION}, or ${CONTINUITY_SCHEMA_VERSION}`,
    );
  } else {
    validation.issues.push(
      `schemaVersion ${entry.schemaVersion} does not match the trusted delivery contract`,
    );
  }
  return validation;
}

function finalValidation(taskId, entry, expectation) {
  const contractKind = expectationContractKind(expectation);
  if (contractKind === HARDENED_CONTRACT && entry?.schemaVersion === 2) {
    return validateHardenedEntry(taskId, entry, expectation, { final: true });
  }
  if (contractKind === LEGACY_CONTRACT && entry?.schemaVersion === 1) {
    return validateLegacyEntry(taskId, entry, expectation);
  }
  if (
    contractKind === CONTINUITY_CONTRACT &&
    entry?.schemaVersion === CONTINUITY_SCHEMA_VERSION
  ) {
    return validateContinuityEntry(taskId, entry, expectation);
  }
  return invalidValidation(taskId, entry, expectation);
}

function publicEvaluation(validation) {
  return Object.freeze({
    satisfied: validation.issues.length === 0 && validation.blockers.length === 0,
    classification: validation.classification,
    actualHead: validation.actualHead,
    mergeCompatibility: validation.mergeCompatibility,
    postMerge: validation.postMerge,
    issues: Object.freeze([...validation.issues, ...validation.blockers]),
  });
}

export function evaluateDeliveryEvidence(taskId, entry, expectation) {
  return publicEvaluation(finalValidation(taskId, entry, expectation));
}

function blockedDeliveryClassification(blockerCode, validation) {
  return Object.freeze({
    disposition: "BLOCKED",
    blockerCode,
    classification: validation.classification,
    actualHead: validation.actualHead,
    mergeCompatibility: validation.mergeCompatibility,
    postMerge: validation.postMerge,
    issues: Object.freeze([...validation.issues, ...validation.blockers]),
  });
}

function resumableClassification(expectation) {
  return Object.freeze({
    disposition: "RESUMABLE",
    classification:
      expectationContractKind(expectation) === HARDENED_CONTRACT
        ? HARDENED_CONTRACT
        : expectationContractKind(expectation) === CONTINUITY_CONTRACT
          ? CONTINUITY_CONTRACT
        : "PENDING",
    actualHead: "UNVERIFIED",
    mergeCompatibility: "UNVERIFIED",
    postMerge: "UNVERIFIED",
    issues: Object.freeze([]),
  });
}

export function classifyDeliveryEvidence(taskId, entry, expectation) {
  const evidenceSupplied = entry !== undefined;
  const expectationSupplied = expectation !== undefined;
  if (!evidenceSupplied && !expectationSupplied) {
    return resumableClassification(expectation);
  }

  const expectationIssues = deliveryExpectationIssues(taskId, expectation);
  if (!evidenceSupplied) {
    if (expectationIssues.length > 0) {
      const validation = createValidation(
        "INVALID",
        "UNVERIFIED",
        "UNVERIFIED",
        "UNVERIFIED",
      );
      validation.issues.push(...expectationIssues);
      return blockedDeliveryClassification("DELIVERY_EVIDENCE_INVALID", validation);
    }
    return resumableClassification(expectation);
  }

  if (!isRecord(entry)) {
    return blockedDeliveryClassification(
      "DELIVERY_EVIDENCE_INVALID",
      invalidValidation(taskId, entry, expectation),
    );
  }

  if (entry.claim === "PENDING") {
    if (
      entry.schemaVersion !== HARDENED_LEDGER_SCHEMA_VERSION ||
      expectationContractKind(expectation) !== HARDENED_CONTRACT
    ) {
      return blockedDeliveryClassification(
        "DELIVERY_EVIDENCE_INVALID",
        invalidValidation(taskId, entry, expectation),
      );
    }
    const validation = validateHardenedEntry(taskId, entry, expectation, {
      final: false,
    });
    if (validation.blockers.length > 0) {
      return blockedDeliveryClassification("DELIVERY_BLOCKED", validation);
    }
    if (validation.issues.length > 0) {
      return blockedDeliveryClassification("DELIVERY_EVIDENCE_INVALID", validation);
    }
    return Object.freeze({
      disposition: "RESUMABLE",
      classification: HARDENED_CONTRACT,
      actualHead: entry.actualHead ? "VERIFIED" : "UNVERIFIED",
      mergeCompatibility: entry.mergeCompatibility
        ? "VERIFIED_SYNTHETIC"
        : "UNVERIFIED",
      postMerge: entry.postMerge ? "VERIFIED_EXACT_CHECKOUT" : "UNVERIFIED",
      issues: Object.freeze([]),
    });
  }

  const validation = finalValidation(taskId, entry, expectation);
  if (validation.blockers.length > 0) {
    return blockedDeliveryClassification("DELIVERY_BLOCKED", validation);
  }
  if (validation.issues.length > 0) {
    return blockedDeliveryClassification("DELIVERY_EVIDENCE_INVALID", validation);
  }
  return Object.freeze({
    disposition: "SATISFIED",
    classification: validation.classification,
    actualHead: validation.actualHead,
    mergeCompatibility: validation.mergeCompatibility,
    postMerge: validation.postMerge,
    issues: Object.freeze([]),
  });
}
