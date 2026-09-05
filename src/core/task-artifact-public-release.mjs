import { createHash } from "node:crypto";

const exactPublicReleaseInvocationPattern =
  /^\$kyw-deliver\s+--release\s+((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\s+--sha\s+([0-9a-f]{40})\s*$/u;
const gitShaPattern = /^[0-9a-f]{40}$/u;
const sha256Pattern = /^[0-9a-f]{64}$/u;
const sha1Pattern = /^[0-9a-f]{40}$/u;
const integrityPattern = /^sha512-[A-Za-z0-9+/]{86}==$/u;
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const repositoryPattern = /^[^/\s]+\/[^/\s]+$/u;
const MAX_TARBALL_BYTES = 8 * 1024 * 1024;
const MAX_TARBALL_ENTRIES = 256;
const MAX_TARBALL_ENTRY_LENGTH = 512;
const MAX_VERSION_LENGTH = 64;
const MAX_PRIOR_VERSIONS = 1024;
const MAX_PRIOR_VERSIONS_BYTES = 128 * 1024;
const MAX_SIGNING_KEY_ID_BYTES = 256;
const PACKED_ENTRY_SET_DIGEST_DOMAIN = "kyw-public-release/packed-entry-set/v1\n";
const PRIOR_VERSION_SET_DIGEST_DOMAIN = "kyw-public-release/prior-version-set/v1\n";

export const PUBLIC_RELEASE_CLASSIFICATIONS = Object.freeze([
  "ABSENT",
  "EXACT_ALREADY_COMPLETE",
  "PENDING_PROOF",
  "CONFLICT",
  "UNKNOWN",
]);

export const PUBLIC_RELEASE_STAGES = Object.freeze([
  "STANDARD_FINAL",
  "NPM",
  "TAG",
  "RELEASE",
  "FINAL_PROOF",
]);

export const PUBLIC_RELEASE_ATTEMPT_SCOPE = "EXACT_AUTHORIZED_INVOCATION";
export const PUBLIC_RELEASE_PUBLISH_JOB = "Publish exact npm checkout";
export const PUBLIC_RELEASE_PUBLISH_STEP = "Publish the exact checkout directory through OIDC";
export const PUBLIC_RELEASE_REPOSITORY = "kimyeongwoo/kyw-dev";

export function assertPublicReleaseRepository(repository) {
  if (repository !== PUBLIC_RELEASE_REPOSITORY) {
    throw publicReleaseError("PUBLIC_RELEASE_REPOSITORY_UNSUPPORTED",
      "The built-in npm publisher, tag and Release actions are only for kimyeongwoo/kyw-dev; use the target project's existing release procedure.");
  }
}

// Actions step evidence, after the caller validates run/attempt/checkout identity.
// The adjacent CI gate can fail while this actual npm step is skipped. A failed
// publication step (including the historical combined gate) stays ambiguous.
export function publicationWasSkipped(jobs) {
  if (!Array.isArray(jobs) || jobs.length !== 1 || jobs[0]?.name !== PUBLIC_RELEASE_PUBLISH_JOB ||
      !Array.isArray(jobs[0].steps)) return false;
  const steps = jobs[0].steps.filter((step) => step?.name === PUBLIC_RELEASE_PUBLISH_STEP);
  return steps.length === 1 && steps[0].status === "completed" && steps[0].conclusion === "skipped";
}

const DEFAULT_RECONCILIATION_READS = 2;
const MAX_RECONCILIATION_READS = 3;
const DEFAULT_DIAGNOSTIC_LIMITS = Object.freeze({
  maxBytes: 16 * 1024,
  maxDepth: 6,
  maxEntries: 48,
  maxStringLength: 1024,
  maxLogLength: 512,
});

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function unknownFields(label, value, allowed, issues) {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) issues.push(`${label} contains unknown field ${key}`);
  }
}

function requireRecord(label, value, issues) {
  if (!isRecord(value)) {
    issues.push(`${label} must be an object`);
    return false;
  }
  return true;
}

function requireString(label, value, issues) {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${label} must be a non-empty string`);
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

function requirePattern(label, value, pattern, description, issues) {
  if (typeof value !== "string" || !pattern.test(value)) {
    issues.push(`${label} must be ${description}`);
    return false;
  }
  return true;
}

function isCanonicalSha512Integrity(value) {
  if (
    typeof value !== "string" ||
    value.length !== 95 ||
    !integrityPattern.test(value)
  ) {
    return false;
  }
  const encoded = value.slice("sha512-".length);
  const decoded = Buffer.from(encoded, "base64");
  return decoded.length === 64 && decoded.toString("base64") === encoded;
}

function sameStringSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return leftSet.size === left.length && right.every((value) => leftSet.has(value));
}

function stableVersionParts(value) {
  const match = versionPattern.exec(value ?? "");
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

function digestCanonicalStringSet(values, domain, label) {
  if (
    !Array.isArray(values) ||
    values.some((value) => typeof value !== "string") ||
    new Set(values).size !== values.length
  ) {
    throw new TypeError(`${label} must be a unique string array`);
  }
  const canonicalJson = JSON.stringify([...values].sort());
  return createHash("sha256").update(domain, "utf8").update(canonicalJson, "utf8").digest("hex");
}

export function createPackedEntrySetDigest(entries) {
  return digestCanonicalStringSet(
    entries,
    PACKED_ENTRY_SET_DIGEST_DOMAIN,
    "packed entry set",
  );
}

export function createPriorVersionSetDigest(versions) {
  return digestCanonicalStringSet(
    versions,
    PRIOR_VERSION_SET_DIGEST_DOMAIN,
    "prior version set",
  );
}

function packageRepositorySlug(value) {
  if (typeof value !== "string") return undefined;
  const match = /github\.com[/:]([^/\s:]+)\/([^/\s]+?)(?:\.git)?$/u.exec(value.trim());
  return match ? `${match[1]}/${match[2]}` : undefined;
}

function cloneCanonical(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneCanonical(entry));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, cloneCanonical(value[key])]),
  );
}

function publicReleaseError(code, message, issues = []) {
  const safeIssues = redactPublicReleaseDiagnostics(issues);
  const safeMessage = redactString(message, DEFAULT_DIAGNOSTIC_LIMITS.maxStringLength);
  const error = new Error(safeMessage);
  error.code = code;
  error.issues = Array.isArray(safeIssues)
    ? Object.freeze([...safeIssues])
    : Object.freeze([safeIssues]);
  return error;
}

export function parsePublicReleaseInvocation(invocation) {
  if (typeof invocation !== "string") return null;
  const match = exactPublicReleaseInvocationPattern.exec(invocation);
  if (!match) return null;
  return Object.freeze({
    recognized: true,
    route: "RELEASE",
    mode: "RELEASE",
    source: "PORTABLE_SKILL",
    taskId: null,
    releaseVersion: match[1],
    releaseSha: match[2],
    overrideText: "",
    overrideScope: "NONE",
  });
}

function validateTupleTopLevel(candidate, issues) {
  if (!requireRecord("public release tuple", candidate, issues)) return;
  unknownFields(
    "public release tuple",
    candidate,
    [
      "schemaVersion",
      "taskId",
      "repository",
      "baseBranch",
      "target",
      "publishWorkflow",
      "package",
      "plugin",
      "tag",
      "release",
    ],
    issues,
  );
  requireExact("public release tuple.schemaVersion", candidate.schemaVersion, 1, issues);
  if (candidate.taskId !== null) requirePattern(
    "public release tuple.taskId",
    candidate.taskId,
    /^\d{4}$/u,
    "an exact four-digit Task ID",
    issues,
  );
  requirePattern(
    "public release tuple.repository",
    candidate.repository,
    repositoryPattern,
    "an exact owner/name repository",
    issues,
  );
  requireString("public release tuple.baseBranch", candidate.baseBranch, issues);
}

function validateTupleTarget(candidate, issues) {
  const target = candidate?.target;
  if (!requireRecord("public release tuple.target", target, issues)) return;
  unknownFields("public release tuple.target", target, ["mergeSha", "treeSha"], issues);
  requirePattern(
    "public release tuple.target.mergeSha",
    target.mergeSha,
    gitShaPattern,
    "an exact lowercase 40-character Git SHA",
    issues,
  );
  requirePattern(
    "public release tuple.target.treeSha",
    target.treeSha,
    gitShaPattern,
    "an exact lowercase 40-character Git SHA",
    issues,
  );
}

function validateTupleWorkflow(candidate, issues) {
  const workflow = candidate?.publishWorkflow;
  if (!requireRecord("public release tuple.publishWorkflow", workflow, issues)) return;
  unknownFields(
    "public release tuple.publishWorkflow",
    workflow,
    ["id", "name", "path", "state", "ref", "event", "environment", "publisher"],
    issues,
  );
  if (!Number.isInteger(workflow.id) || workflow.id < 1) {
    issues.push("public release tuple.publishWorkflow.id must be a positive integer");
  }
  requireString("public release tuple.publishWorkflow.name", workflow.name, issues);
  if (
    !requireString("public release tuple.publishWorkflow.path", workflow.path, issues) ||
    !/^\.github\/workflows\/[^/]+\.ya?ml$/u.test(workflow.path)
  ) {
    issues.push(
      "public release tuple.publishWorkflow.path must be one repository workflow YAML path",
    );
  }
  requireExact(
    "public release tuple.publishWorkflow.state",
    workflow.state,
    "active",
    issues,
  );
  requireExact(
    "public release tuple.publishWorkflow.ref",
    workflow.ref,
    `refs/heads/${candidate?.baseBranch ?? ""}`,
    issues,
  );
  requireExact(
    "public release tuple.publishWorkflow.event",
    workflow.event,
    "workflow_dispatch",
    issues,
  );
  requireExact(
    "public release tuple.publishWorkflow.environment",
    workflow.environment,
    "npm-production",
    issues,
  );
  const publisher = workflow.publisher;
  if (!requireRecord("public release tuple.publishWorkflow.publisher", publisher, issues)) {
    return;
  }
  unknownFields(
    "public release tuple.publishWorkflow.publisher",
    publisher,
    ["provider", "authentication", "repository", "workflow", "environment", "action"],
    issues,
  );
  for (const [label, actual, expected] of [
    ["provider", publisher.provider, "GitHub Actions"],
    ["authentication", publisher.authentication, "OIDC"],
    ["repository", publisher.repository, candidate?.repository],
    ["workflow", publisher.workflow, workflow.path?.split("/").at(-1)],
    ["environment", publisher.environment, workflow.environment],
    ["action", publisher.action, "npm publish"],
  ]) {
    requireExact(
      `public release tuple.publishWorkflow.publisher.${label}`,
      actual,
      expected,
      issues,
    );
  }
}

function validateTupleTarball(packageIdentity, issues) {
  const tarball = packageIdentity?.tarball;
  if (!requireRecord("public release tuple.package.tarball", tarball, issues)) return;
  unknownFields(
    "public release tuple.package.tarball",
    tarball,
    ["bytes", "integrity", "shasum", "sha256", "entries"],
    issues,
  );
  if (
    !Number.isInteger(tarball.bytes) ||
    tarball.bytes < 1 ||
    tarball.bytes > MAX_TARBALL_BYTES
  ) {
    issues.push(
      `public release tuple.package.tarball.bytes must be an integer from 1 through ${MAX_TARBALL_BYTES}`,
    );
  }
  if (!isCanonicalSha512Integrity(tarball.integrity)) {
    issues.push(
      "public release tuple.package.tarball.integrity must be a canonical 95-character SHA-512 Subresource Integrity value",
    );
  }
  requirePattern(
    "public release tuple.package.tarball.shasum",
    tarball.shasum,
    sha1Pattern,
    "an exact lowercase SHA-1 digest",
    issues,
  );
  requirePattern(
    "public release tuple.package.tarball.sha256",
    tarball.sha256,
    sha256Pattern,
    "an exact lowercase SHA-256 digest",
    issues,
  );
  if (
    !Array.isArray(tarball.entries) ||
    tarball.entries.length < 1 ||
    tarball.entries.length > MAX_TARBALL_ENTRIES
  ) {
    issues.push(
      `public release tuple.package.tarball.entries must contain 1-${MAX_TARBALL_ENTRIES} packed paths`,
    );
  } else {
    const invalidEntry = tarball.entries.some(
      (entry) =>
        typeof entry !== "string" ||
        !entry ||
        Buffer.byteLength(entry, "utf8") > MAX_TARBALL_ENTRY_LENGTH ||
        entry.startsWith("/") ||
        entry.includes("\\") ||
        entry.includes("\0") ||
        entry.split("/").some((segment) => !segment || segment === "." || segment === ".."),
    );
    if (invalidEntry || new Set(tarball.entries).size !== tarball.entries.length) {
      issues.push(
        "public release tuple.package.tarball.entries must be unique safe POSIX relative paths",
      );
    }
    const sortedEntries = [...tarball.entries].sort();
    if (sortedEntries.some((entry, index) => entry !== tarball.entries[index])) {
      issues.push("public release tuple.package.tarball.entries must be sorted ascending");
    }
  }
}

function validateTupleSupplyChain(candidate, issues) {
  const packageIdentity = candidate?.package;
  const signature = packageIdentity?.signature;
  if (requireRecord("public release tuple.package.signature", signature, issues)) {
    unknownFields(
      "public release tuple.package.signature",
      signature,
      ["required", "keyId", "keyIds"],
      issues,
    );
    requireExact(
      "public release tuple.package.signature.required",
      signature.required,
      true,
      issues,
    );
    if (signature.keyIds !== undefined && (
      !Array.isArray(signature.keyIds) || signature.keyIds.length < 1 || signature.keyIds.length > 32 ||
      new Set(signature.keyIds).size !== signature.keyIds.length ||
      !signature.keyIds.includes(signature.keyId) ||
      signature.keyIds.some((id) => typeof id !== "string" || !id || /\s/u.test(id) || Buffer.byteLength(id, "utf8") > MAX_SIGNING_KEY_ID_BYTES)
    )) issues.push("public release tuple.package.signature.keyIds must be a bounded unique frozen key set containing keyId");
    if (
      typeof signature.keyId !== "string" ||
      !signature.keyId ||
      /\s/u.test(signature.keyId) ||
      Buffer.byteLength(signature.keyId, "utf8") > MAX_SIGNING_KEY_ID_BYTES
    ) {
      issues.push(
        `public release tuple.package.signature.keyId must be a non-whitespace token of at most ${MAX_SIGNING_KEY_ID_BYTES} UTF-8 bytes`,
      );
    }
  }

  const provenance = packageIdentity?.provenance;
  if (!requireRecord("public release tuple.package.provenance", provenance, issues)) return;
  unknownFields(
    "public release tuple.package.provenance",
    provenance,
    [
      "required",
      "sourceRepository",
      "workflowPath",
      "workflowRef",
      "sourceCommit",
      "subjectSha256",
    ],
    issues,
  );
  requireExact(
    "public release tuple.package.provenance.required",
    provenance.required,
    true,
    issues,
  );
  requireExact(
    "public release tuple.package.provenance.sourceRepository",
    provenance.sourceRepository,
    candidate?.repository,
    issues,
  );
  requireExact(
    "public release tuple.package.provenance.workflowPath",
    provenance.workflowPath,
    candidate?.publishWorkflow?.path,
    issues,
  );
  requireExact(
    "public release tuple.package.provenance.workflowRef",
    provenance.workflowRef,
    candidate?.publishWorkflow?.ref,
    issues,
  );
  requireExact(
    "public release tuple.package.provenance.sourceCommit",
    provenance.sourceCommit,
    candidate?.target?.mergeSha,
    issues,
  );
  requireExact(
    "public release tuple.package.provenance.subjectSha256",
    provenance.subjectSha256,
    packageIdentity?.tarball?.sha256,
    issues,
  );
}

function validateTuplePackage(candidate, issues) {
  const packageIdentity = candidate?.package;
  if (!requireRecord("public release tuple.package", packageIdentity, issues)) return;
  unknownFields(
    "public release tuple.package",
    packageIdentity,
    [
      "name",
      "version",
      "repository",
      "access",
      "registry",
      "tarball",
      "signature",
      "provenance",
      "priorVersions",
      "priorLatest",
    ],
    issues,
  );
  requireString("public release tuple.package.name", packageIdentity.name, issues);
  requirePattern(
    "public release tuple.package.version",
    packageIdentity.version,
    versionPattern,
    "an exact stable semantic version",
    issues,
  );
  if (
    typeof packageIdentity.version === "string" &&
    Buffer.byteLength(packageIdentity.version, "utf8") > MAX_VERSION_LENGTH
  ) {
    issues.push(
      `public release tuple.package.version must not exceed ${MAX_VERSION_LENGTH} UTF-8 bytes`,
    );
  }
  if (requireString("public release tuple.package.repository", packageIdentity.repository, issues)) {
    requireExact(
      "public release tuple.package.repository target",
      packageRepositorySlug(packageIdentity.repository),
      candidate?.repository,
      issues,
    );
  }
  requireExact("public release tuple.package.access", packageIdentity.access, "public", issues);
  requireExact(
    "public release tuple.package.registry",
    packageIdentity.registry,
    "https://registry.npmjs.org/",
    issues,
  );
  if (
    !Array.isArray(packageIdentity.priorVersions) ||
    packageIdentity.priorVersions.length > MAX_PRIOR_VERSIONS ||
    Buffer.byteLength(
      JSON.stringify(packageIdentity.priorVersions ?? []),
      "utf8",
    ) > MAX_PRIOR_VERSIONS_BYTES ||
    packageIdentity.priorVersions.some(
      (version) =>
        typeof version !== "string" ||
        Buffer.byteLength(version, "utf8") > MAX_VERSION_LENGTH ||
        !versionPattern.test(version) ||
        version === packageIdentity.version,
    ) ||
    new Set(packageIdentity.priorVersions ?? []).size !==
      (packageIdentity.priorVersions ?? []).length
  ) {
    issues.push(
      `public release tuple.package.priorVersions must be at most ${MAX_PRIOR_VERSIONS} unique bounded stable versions excluding the target and serialize within ${MAX_PRIOR_VERSIONS_BYTES} bytes`,
    );
  } else {
    const sortedPriorVersions = [...packageIdentity.priorVersions].sort(compareStableVersions);
    if (
      sortedPriorVersions.some(
        (version, index) => version !== packageIdentity.priorVersions[index],
      )
    ) {
      issues.push("public release tuple.package.priorVersions must be sorted ascending");
    }
    if (
      packageIdentity.priorVersions.some(
        (version) => compareStableVersions(packageIdentity.version, version) <= 0,
      )
    ) {
      issues.push(
        "public release tuple.package.version must be newer than every frozen prior version",
      );
    }
  }
  requireExact(
    "public release tuple.package.priorLatest",
    packageIdentity.priorLatest,
    packageIdentity.priorVersions?.at(-1) ?? null,
    issues,
  );
  validateTupleTarball(packageIdentity, issues);
  validateTupleSupplyChain(candidate, issues);
}

function validateTuplePlugin(candidate, issues) {
  const plugin = candidate?.plugin;
  if (!requireRecord("public release tuple.plugin", plugin, issues)) return;
  unknownFields("public release tuple.plugin", plugin, ["name", "version"], issues);
  requireString("public release tuple.plugin.name", plugin.name, issues);
  requireExact(
    "public release tuple.plugin.name",
    plugin.name,
    candidate?.package?.name,
    issues,
  );
  requireExact(
    "public release tuple.plugin.version",
    plugin.version,
    candidate?.package?.version,
    issues,
  );
}

function validateTupleTagAndRelease(candidate, issues) {
  const version = candidate?.package?.version ?? "";
  const expectedName = `v${version}`;
  const tag = candidate?.tag;
  if (requireRecord("public release tuple.tag", tag, issues)) {
    unknownFields("public release tuple.tag", tag, ["name", "ref"], issues);
    requireExact("public release tuple.tag.name", tag.name, expectedName, issues);
    requireExact(
      "public release tuple.tag.ref",
      tag.ref,
      `refs/tags/${expectedName}`,
      issues,
    );
  }

  const release = candidate?.release;
  if (!requireRecord("public release tuple.release", release, issues)) return;
  unknownFields(
    "public release tuple.release",
    release,
    [
      "tagName",
      "title",
      "body",
      "draft",
      "prerelease",
      "generateReleaseNotes",
      "assets",
    ],
    issues,
  );
  requireExact("public release tuple.release.tagName", release.tagName, expectedName, issues);
  requireExact("public release tuple.release.title", release.title, expectedName, issues);
  requireExact("public release tuple.release.body", release.body, "", issues);
  requireExact("public release tuple.release.draft", release.draft, false, issues);
  requireExact("public release tuple.release.prerelease", release.prerelease, false, issues);
  requireExact(
    "public release tuple.release.generateReleaseNotes",
    release.generateReleaseNotes,
    false,
    issues,
  );
  if (!Array.isArray(release.assets) || release.assets.length !== 0) {
    issues.push("public release tuple.release.assets must be an empty array");
  }
}

export function freezePublicReleaseTuple(candidate) {
  const issues = [];
  validateTupleTopLevel(candidate, issues);
  validateTupleTarget(candidate, issues);
  validateTupleWorkflow(candidate, issues);
  validateTuplePackage(candidate, issues);
  validateTuplePlugin(candidate, issues);
  validateTupleTagAndRelease(candidate, issues);
  if (issues.length > 0) {
    throw publicReleaseError(
      "PUBLIC_RELEASE_TUPLE_INVALID",
      `Public release tuple is invalid: ${issues.join("; ")}`,
      issues,
    );
  }
  return deepFreeze(cloneCanonical(candidate));
}

export function derivePublicReleaseWorkflowInputs(tupleCandidate) {
  const tuple = freezePublicReleaseTuple(tupleCandidate);
  return deepFreeze({
    expected_sha: tuple.target.mergeSha,
    expected_version: tuple.package.version,
    expected_tarball_bytes: String(tuple.package.tarball.bytes),
    expected_tarball_sha256: tuple.package.tarball.sha256,
    expected_tarball_shasum: tuple.package.tarball.shasum,
    expected_tarball_integrity: tuple.package.tarball.integrity,
    expected_packed_entries_sha256: createPackedEntrySetDigest(
      tuple.package.tarball.entries,
    ),
    expected_prior_versions_sha256: createPriorVersionSetDigest(
      tuple.package.priorVersions,
    ),
    expected_prior_latest:
      tuple.package.priorLatest === null ? "null" : tuple.package.priorLatest,
    expected_signing_key_id: tuple.package.signature.keyId,
    ...(tuple.package.signature.keyIds ? {
      expected_signing_key_ids: JSON.stringify([...tuple.package.signature.keyIds].sort()),
    } : {}),
  });
}

function classification(classificationValue, issues = [], evidence = {}) {
  return deepFreeze({
    classification: classificationValue,
    issues: [...issues],
    evidence: cloneCanonical(evidence),
  });
}

function normalizeCollection(value, collectionKey) {
  if (Array.isArray(value)) return { values: value, complete: true };
  if (isRecord(value) && Array.isArray(value[collectionKey])) {
    return {
      values: value[collectionKey],
      complete: value.complete === true && value.pagesComplete !== false,
    };
  }
  return undefined;
}

function workflowInputSpecs(expectedInputs) {
  return [
    ["expected_sha", "expectedSha", expectedInputs.expected_sha],
    ["expected_version", "expectedVersion", expectedInputs.expected_version],
    ["expected_tarball_bytes", "expectedTarballBytes", expectedInputs.expected_tarball_bytes],
    ["expected_tarball_sha256", "expectedTarballSha256", expectedInputs.expected_tarball_sha256],
    ["expected_tarball_shasum", "expectedTarballShasum", expectedInputs.expected_tarball_shasum],
    [
      "expected_tarball_integrity",
      "expectedTarballIntegrity",
      expectedInputs.expected_tarball_integrity,
    ],
    [
      "expected_packed_entries_sha256",
      "expectedPackedEntriesSha256",
      expectedInputs.expected_packed_entries_sha256,
    ],
    [
      "expected_prior_versions_sha256",
      "expectedPriorVersionsSha256",
      expectedInputs.expected_prior_versions_sha256,
    ],
    ["expected_prior_latest", "expectedPriorLatest", expectedInputs.expected_prior_latest],
    [
      "expected_signing_key_id",
      "expectedSigningKeyId",
      expectedInputs.expected_signing_key_id,
    ],
    ...(expectedInputs.expected_signing_key_ids === undefined ? [] : [[
      "expected_signing_key_ids", "expectedSigningKeyIds", expectedInputs.expected_signing_key_ids,
    ]]),
  ];
}

function workflowRunIdentityIssues(tuple, run) {
  const missing = [];
  const successProofMissing = [];
  const conflicts = [];
  const expected = {
    repository: tuple.repository,
    workflowId: tuple.publishWorkflow.id,
    workflowName: tuple.publishWorkflow.name,
    workflowPath: tuple.publishWorkflow.path,
    event: tuple.publishWorkflow.event,
    ref: tuple.publishWorkflow.ref,
    headSha: tuple.target.mergeSha,
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (run?.[key] === undefined) missing.push(`workflow run ${key} is missing`);
    else if (run[key] !== expectedValue) {
      conflicts.push(`workflow run ${key} does not match the frozen tuple`);
    }
  }
  const expectedInputs = derivePublicReleaseWorkflowInputs(tuple);
  const inputs = run?.inputs;
  if (inputs !== undefined && inputs !== null && !isRecord(inputs)) {
    missing.push("workflow run input proof is malformed");
  } else {
    const allowedInputKeys = new Set(
      workflowInputSpecs(expectedInputs).flatMap(([snakeName, camelName]) => [
        snakeName,
        camelName,
      ]),
    );
    if (isRecord(inputs)) {
      for (const inputName of Object.keys(inputs)) {
        if (!allowedInputKeys.has(inputName)) {
          conflicts.push(`workflow run input ${inputName} is not in the frozen input set`);
        }
      }
    }
    for (const [snakeName, camelName, expectedValue] of workflowInputSpecs(expectedInputs)) {
      const hasSnake = isRecord(inputs) && Object.hasOwn(inputs, snakeName);
      const hasCamel = isRecord(inputs) && Object.hasOwn(inputs, camelName);
      if (hasSnake && hasCamel && inputs[snakeName] !== inputs[camelName]) {
        conflicts.push(`workflow run input aliases for ${snakeName} disagree`);
        continue;
      }
      const actual = hasSnake ? inputs[snakeName] : hasCamel ? inputs[camelName] : undefined;
      if (actual === undefined) {
        successProofMissing.push(`workflow run input ${snakeName} is missing`);
      } else if (actual !== expectedValue) {
        conflicts.push(`workflow run input ${snakeName} does not match the frozen tuple`);
      }
    }
  }
  if (!Number.isInteger(run?.runId) || run.runId < 1) {
    missing.push("workflow run ID is missing or malformed");
  }
  if (!Number.isInteger(run?.runAttempt) || run.runAttempt < 1) {
    missing.push("workflow run attempt is missing or malformed");
  } else if (run.runAttempt > 10 || (run.runAttempt > 1 && (
    !Array.isArray(run.priorAttempts) || run.priorAttempts.length !== run.runAttempt - 1 ||
    run.priorAttempts.some((attempt, index) => attempt?.attempt !== index + 1 ||
      attempt.publishBoundary !== "NOT_EXECUTED")
  ))) {
    conflicts.push("workflow rerun lacks complete proof that every prior attempt did not publish");
  }
  return { missing, successProofMissing, conflicts };
}

// Recover only the signing fields of the original dispatch from canonical run
// evidence. Every other input must still match the prepared package/SHA tuple.
// Legacy keyId-only evidence remains legacy; no registry rotation rewrites it.
export function recoverPublicReleaseSigningTuple(tupleCandidate, rawWorkflow) {
  const tuple = freezePublicReleaseTuple(tupleCandidate);
  const collection = normalizeCollection(rawWorkflow, "runs");
  if (!collection?.complete) throw publicReleaseError("PUBLIC_RELEASE_SIGNING_RECOVERY", "Canonical dispatch history is incomplete");
  let recovered;
  let identity;
  for (const run of collection.values) {
    if (!isRecord(run?.inputs)) continue;
    const keyId = run.inputs.expected_signing_key_id ?? run.inputs.expectedSigningKeyId;
    const encoded = run.inputs.expected_signing_key_ids ?? run.inputs.expectedSigningKeyIds;
    let keyIds;
    if (encoded !== undefined) {
      try {
        keyIds = JSON.parse(encoded);
        if (!Array.isArray(keyIds) || JSON.stringify([...keyIds].sort()) !== encoded) throw new Error("noncanonical");
      } catch {
        throw publicReleaseError("PUBLIC_RELEASE_SIGNING_RECOVERY", "Frozen dispatch key set is malformed");
      }
    }
    const candidate = freezePublicReleaseTuple({ ...tuple, package: { ...tuple.package,
      signature: { required: true, keyId, ...(keyIds ? { keyIds } : {}) },
    } });
    const issues = workflowRunIdentityIssues(candidate, run);
    if (issues.conflicts.length || issues.missing.length || issues.successProofMissing.length) {
      throw publicReleaseError("PUBLIC_RELEASE_SIGNING_RECOVERY", "Canonical dispatch inputs differ from the prepared release target",
        [...issues.conflicts, ...issues.missing, ...issues.successProofMissing]);
    }
    const candidateIdentity = JSON.stringify(candidate.package.signature);
    if (identity !== undefined && identity !== candidateIdentity) {
      throw publicReleaseError("PUBLIC_RELEASE_SIGNING_RECOVERY", "Canonical dispatches contain conflicting frozen signing identities");
    }
    identity = candidateIdentity;
    recovered = candidate;
  }
  return recovered ?? tuple;
}

function publishAttemptIssues(tuple, run) {
  if (!Array.isArray(run?.publishAttempts)) {
    return { missing: ["publication workflow publish attempt proof is missing"], conflicts: [] };
  }
  if (run.publishAttempts.length !== 1) {
    return {
      missing: [],
      conflicts: ["publication workflow did not execute exactly one publish attempt"],
    };
  }
  const attempt = run.publishAttempts[0];
  if (!isRecord(attempt)) {
    return { missing: ["publication workflow publish attempt is malformed"], conflicts: [] };
  }
  const missing = [];
  const conflicts = [];
  for (const [label, actual, expected] of [
    ["publish checkout SHA", attempt.checkoutSha, tuple.target.mergeSha],
    ["publish conclusion", attempt.conclusion, "SUCCESS"],
    [
      "publish command",
      attempt.command,
      `npm publish . --access public --ignore-scripts --registry=${tuple.package.registry}`,
    ],
  ]) {
    fieldComparison(label, actual, expected, missing, conflicts);
  }
  return { missing, conflicts };
}

export function classifyPublicationWorkflow(tupleCandidate, rawWorkflow) {
  const tuple = freezePublicReleaseTuple(tupleCandidate);
  if (rawWorkflow === undefined || rawWorkflow === null) {
    return classification("UNKNOWN", ["publication workflow runs are unreadable"]);
  }
  const collection = normalizeCollection(rawWorkflow, "runs");
  if (!collection || !collection.complete) {
    return classification("UNKNOWN", ["publication workflow pagination is incomplete"]);
  }
  const unresolvedRuns = [];
  for (const candidate of collection.values) {
    const identity = workflowRunIdentityIssues(tuple, candidate);
    // NOT_EXECUTED is normalized only from the actual publisher step being
    // skipped in every attempt; a gate error or absent registry version alone
    // cannot supply this evidence.
    const provedUnexecuted = identity.conflicts.length === 0 && identity.missing.length === 0 &&
      candidate.status === "completed" && ["failure", "cancelled", "timed_out"].includes(candidate.conclusion) &&
      candidate.publishBoundary === "NOT_EXECUTED" && Array.isArray(candidate.publishAttempts) && candidate.publishAttempts.length === 0;
    if (!provedUnexecuted) unresolvedRuns.push(candidate);
  }
  if (unresolvedRuns.length === 0) return classification("ABSENT", [], {
    unexecutedRunIds: collection.values.map((run) => run.runId),
  });
  if (unresolvedRuns.length !== 1) {
    return classification("CONFLICT", ["multiple matching publication workflow runs exist"]);
  }
  const run = unresolvedRuns[0];
  if (!isRecord(run)) {
    return classification("UNKNOWN", ["publication workflow run is malformed"]);
  }
  const identity = workflowRunIdentityIssues(tuple, run);
  if (identity.conflicts.length > 0) return classification("CONFLICT", identity.conflicts);
  if (identity.missing.length > 0) return classification("UNKNOWN", identity.missing);

  const evidence = { runId: run.runId, runAttempt: run.runAttempt };
  if (["queued", "in_progress", "waiting", "requested", "pending"].includes(run.status)) {
    return classification("PENDING_PROOF", [], evidence);
  }
  if (run.status !== "completed") {
    return classification("UNKNOWN", ["publication workflow status is unknown"], evidence);
  }
  if (
    [
      "failure",
      "cancelled",
      "timed_out",
      "action_required",
      "neutral",
      "stale",
      "skipped",
      "startup_failure",
    ].includes(run.conclusion)
  ) {
    return classification(
      "CONFLICT",
      [`publication workflow concluded ${run.conclusion}`],
      evidence,
    );
  }
  if (run.conclusion !== "success") {
    return classification("UNKNOWN", ["publication workflow conclusion is unknown"], evidence);
  }
  if (identity.successProofMissing.length > 0) {
    return classification("UNKNOWN", identity.successProofMissing, evidence);
  }
  const publishAttempt = publishAttemptIssues(tuple, run);
  if (publishAttempt.conflicts.length > 0) {
    return classification("CONFLICT", publishAttempt.conflicts, evidence);
  }
  if (publishAttempt.missing.length > 0) {
    return classification(
      "UNKNOWN",
      publishAttempt.missing,
      evidence,
    );
  }
  return classification("EXACT_ALREADY_COMPLETE", [], {
    ...evidence,
    headSha: run.headSha,
    conclusion: "success",
    inputs: derivePublicReleaseWorkflowInputs(tuple),
  });
}

function fieldComparison(label, actual, expected, missing, conflicts) {
  if (actual === undefined) missing.push(`${label} is missing`);
  else if (actual !== expected) conflicts.push(`${label} does not match the frozen tuple`);
}

function absenceFromStatus(raw) {
  return raw === null || raw?.status === 404 || raw?.exists === false;
}

export function classifyNpmPublication(tupleCandidate, rawNpm) {
  const tuple = freezePublicReleaseTuple(tupleCandidate);
  if (rawNpm === undefined || rawNpm === null) {
    return classification("UNKNOWN", ["npm state is unreadable"]);
  }
  if (rawNpm?.pending === true || rawNpm?.status === 202) {
    return classification("PENDING_PROOF");
  }
  if (!isRecord(rawNpm)) return classification("UNKNOWN", ["npm state is malformed"]);
  if (rawNpm.absent === true || rawNpm.status === 404 || rawNpm.exists === false) {
    const missing = [];
    const conflicts = [];
    for (const [label, actual, expected] of [
      ["absent npm status", rawNpm.status, 404],
      ["absent npm marker", rawNpm.absent, true],
      ["absent npm package name", rawNpm.name, tuple.package.name],
      ["absent npm package version", rawNpm.version, tuple.package.version],
      ["absent npm registry", rawNpm.registry, tuple.package.registry],
      [
        "absent npm signing key",
        rawNpm.signatureKeyId,
        tuple.package.signature.keyId,
      ],
      ["absent npm prior latest", rawNpm.distTags?.latest, tuple.package.priorLatest],
    ]) {
      fieldComparison(label, actual, expected, missing, conflicts);
    }
    if (rawNpm.indexComplete !== true) {
      missing.push("absent npm package index is incomplete or unreadable");
    }
    if (!Array.isArray(rawNpm.versions)) {
      missing.push("absent npm prior version history is missing");
    } else if (!sameStringSet(rawNpm.versions, tuple.package.priorVersions)) {
      conflicts.push("absent npm prior version history drifted after tuple freeze");
    }
    if (rawNpm.versions?.includes(tuple.package.version)) {
      conflicts.push("absent npm state includes the target version");
    }
    if (conflicts.length > 0) return classification("CONFLICT", conflicts);
    if (missing.length > 0) return classification("UNKNOWN", missing);
    return classification("ABSENT", [], {
      name: rawNpm.name,
      version: rawNpm.version,
      priorLatest: rawNpm.distTags.latest,
      priorVersionCount: rawNpm.versions.length,
    });
  }
  if (rawNpm.status !== undefined && rawNpm.status !== 200) {
    return classification("UNKNOWN", [`npm read returned status ${rawNpm.status}`]);
  }
  const missing = [];
  const conflicts = [];
  for (const [label, actual, expected] of [
    ["npm package name", rawNpm.name, tuple.package.name],
    ["npm package version", rawNpm.version, tuple.package.version],
    ["npm registry", rawNpm.registry, tuple.package.registry],
    ["npm package repository", rawNpm.repository, tuple.package.repository],
    ["npm package access", rawNpm.access, tuple.package.access],
    ["npm gitHead", rawNpm.gitHead, tuple.target.mergeSha],
    ["npm latest dist-tag", rawNpm.distTags?.latest, tuple.package.version],
    ["npm tarball bytes", rawNpm.tarball?.bytes, tuple.package.tarball.bytes],
    ["npm tarball integrity", rawNpm.tarball?.integrity, tuple.package.tarball.integrity],
    ["npm tarball shasum", rawNpm.tarball?.shasum, tuple.package.tarball.shasum],
    ["npm tarball SHA-256", rawNpm.tarball?.sha256, tuple.package.tarball.sha256],
    ["npm tarball raw-byte equality", rawNpm.tarball?.rawBytesVerified, true],
    ["npm signature key ID", rawNpm.signature?.keyId, tuple.package.signature.keyId],
  ]) {
    fieldComparison(label, actual, expected, missing, conflicts);
  }
  fieldComparison("npm signature verification", rawNpm.signature?.verified, true, missing, conflicts);
  fieldComparison(
    "npm provenance verification",
    rawNpm.provenance?.verified,
    true,
    missing,
    conflicts,
  );
  if (!Array.isArray(rawNpm.tarball?.entries)) {
    missing.push("npm packed entry-set proof is missing");
  } else if (
    rawNpm.tarball.entries.length !== tuple.package.tarball.entries.length ||
    rawNpm.tarball.entries.some(
      (entry, index) => entry !== tuple.package.tarball.entries[index],
    )
  ) {
    conflicts.push("npm packed entry set does not match the frozen tuple");
  }
  for (const key of [
    "sourceRepository",
    "workflowPath",
    "workflowRef",
    "sourceCommit",
    "subjectSha256",
  ]) {
    fieldComparison(
      `npm provenance ${key}`,
      rawNpm.provenance?.[key],
      tuple.package.provenance[key],
      missing,
      conflicts,
    );
  }
  if (rawNpm.provenance?.runId === undefined) {
    missing.push("npm provenance workflow run ID is missing");
  } else if (!Number.isInteger(rawNpm.provenance.runId) || rawNpm.provenance.runId < 1) {
    conflicts.push("npm provenance workflow run ID is malformed");
  }
  if (rawNpm.provenance?.runAttempt === undefined) missing.push("npm provenance workflow run attempt is missing");
  else if (!Number.isInteger(rawNpm.provenance.runAttempt) || rawNpm.provenance.runAttempt < 1 ||
      rawNpm.provenance.runAttempt > 10) conflicts.push("npm provenance workflow run attempt is invalid");
  const expectedVersions = [...tuple.package.priorVersions, tuple.package.version];
  if (!Array.isArray(rawNpm.versions)) missing.push("npm version history is missing");
  else if (!sameStringSet(rawNpm.versions, expectedVersions)) {
    conflicts.push("npm version history does not preserve the frozen version set");
  }
  if (conflicts.length > 0) return classification("CONFLICT", conflicts);
  if (missing.length > 0) return classification("UNKNOWN", missing);
  return classification("EXACT_ALREADY_COMPLETE", [], {
    name: rawNpm.name,
    version: rawNpm.version,
    gitHead: rawNpm.gitHead,
    rawBytesVerified: true,
    entryCount: tuple.package.tarball.entries.length,
    provenanceRunId: rawNpm.provenance.runId,
    provenanceRunAttempt: rawNpm.provenance.runAttempt,
  });
}

function oneRemoteObject(raw, collectionKey, label) {
  if (raw === undefined) return { classification: "UNKNOWN", issue: `${label} is unreadable` };
  if (raw?.pending === true || raw?.status === 202) {
    return { classification: "PENDING_PROOF" };
  }
  if (absenceFromStatus(raw)) return { classification: "ABSENT" };
  const collection = normalizeCollection(raw, collectionKey);
  if (collection) {
    if (!collection.complete) {
      return { classification: "UNKNOWN", issue: `${label} pagination is incomplete` };
    }
    if (collection.values.length === 0) return { classification: "ABSENT" };
    if (collection.values.length > 1) {
      return { classification: "CONFLICT", issue: `multiple matching ${label} objects exist` };
    }
    return { value: collection.values[0] };
  }
  return { value: raw };
}

export function classifyGitTag(tupleCandidate, rawTag) {
  const tuple = freezePublicReleaseTuple(tupleCandidate);
  const selected = oneRemoteObject(rawTag, "tags", "Git tag");
  if (selected.classification) {
    return classification(selected.classification, selected.issue ? [selected.issue] : []);
  }
  const tag = selected.value;
  if (!isRecord(tag)) return classification("UNKNOWN", ["Git tag state is malformed"]);
  const missing = [];
  const conflicts = [];
  fieldComparison("Git tag repository", tag.repository, tuple.repository, missing, conflicts);
  fieldComparison("Git tag ref", tag.ref, tuple.tag.ref, missing, conflicts);
  if (tag.namespaceCollision === true) {
    conflicts.push("Git tag namespace collision exists");
  }
  if (tag.objectType === undefined) missing.push("Git tag object type is missing");
  else if (tag.objectType === "commit") {
    fieldComparison(
      "Git tag direct target",
      tag.targetSha,
      tuple.target.mergeSha,
      missing,
      conflicts,
    );
  } else if (tag.objectType === "tag") {
    fieldComparison("Git tag peel completeness", tag.peelComplete, true, missing, conflicts);
    fieldComparison(
      "Git tag peeled target",
      tag.peeledSha,
      tuple.target.mergeSha,
      missing,
      conflicts,
    );
  } else {
    conflicts.push("Git tag targets an unsupported object type");
  }
  if (conflicts.length > 0) return classification("CONFLICT", conflicts);
  if (missing.length > 0) return classification("UNKNOWN", missing);
  return classification("EXACT_ALREADY_COMPLETE", [], {
    ref: tag.ref,
    objectType: tag.objectType,
    targetSha: tag.objectType === "tag" ? tag.peeledSha : tag.targetSha,
  });
}

export function classifyGitHubRelease(tupleCandidate, rawRelease) {
  const tuple = freezePublicReleaseTuple(tupleCandidate);
  const selected = oneRemoteObject(rawRelease, "releases", "GitHub Release");
  if (selected.classification) {
    return classification(selected.classification, selected.issue ? [selected.issue] : []);
  }
  const release = selected.value;
  if (!isRecord(release)) {
    return classification("UNKNOWN", ["GitHub Release state is malformed"]);
  }
  const missing = [];
  const conflicts = [];
  for (const [label, actual, expected] of [
    ["GitHub Release repository", release.repository, tuple.repository],
    ["GitHub Release tag", release.tagName, tuple.release.tagName],
    ["GitHub Release tag target", release.tagTargetSha, tuple.target.mergeSha],
    ["GitHub Release title", release.title, tuple.release.title],
    ["GitHub Release body", release.body, tuple.release.body],
    ["GitHub Release draft flag", release.draft, false],
    ["GitHub Release prerelease flag", release.prerelease, false],
    ["GitHub Release state", release.state, "published"],
  ]) {
    fieldComparison(label, actual, expected, missing, conflicts);
  }
  if (!Array.isArray(release.assets)) missing.push("GitHub Release assets are unreadable");
  else if (release.assets.length !== 0) {
    conflicts.push("GitHub Release contains unexpected assets");
  }
  if (!Number.isInteger(release.id) || release.id < 1) {
    missing.push("GitHub Release ID is missing or malformed");
  }
  if (conflicts.length > 0) return classification("CONFLICT", conflicts);
  if (missing.length > 0) return classification("UNKNOWN", missing);
  return classification("EXACT_ALREADY_COMPLETE", [], {
    id: release.id,
    tagName: release.tagName,
    tagTargetSha: release.tagTargetSha,
  });
}

function replaceClassification(result, value, issue) {
  return classification(value, [...result.issues, issue], result.evidence);
}

function aggregateNpmStage(workflow, npm) {
  if (workflow.classification === "CONFLICT" || npm.classification === "CONFLICT") {
    return "CONFLICT";
  }
  if (workflow.classification === "UNKNOWN" || npm.classification === "UNKNOWN") {
    return "UNKNOWN";
  }
  if (
    workflow.classification === "EXACT_ALREADY_COMPLETE" &&
    npm.classification === "EXACT_ALREADY_COMPLETE"
  ) {
    return "EXACT_ALREADY_COMPLETE";
  }
  if (workflow.classification === "ABSENT" && npm.classification === "ABSENT") {
    return "ABSENT";
  }
  return "PENDING_PROOF";
}

function highestCompletedStage(stageClassifications) {
  let completed = "STANDARD_FINAL";
  for (const stage of ["NPM", "TAG", "RELEASE"]) {
    if (stageClassifications[stage] !== "EXACT_ALREADY_COMPLETE") break;
    completed = stage;
  }
  return completed;
}

function firstStageWith(stageClassifications, values) {
  return ["NPM", "TAG", "RELEASE"].find((stage) =>
    values.includes(stageClassifications[stage]),
  );
}

export function classifyPublicReleaseState(tupleCandidate, snapshot = {}) {
  const tuple = freezePublicReleaseTuple(tupleCandidate);
  let workflow = classifyPublicationWorkflow(tuple, snapshot.workflow);
  let npm = classifyNpmPublication(tuple, snapshot.npm);
  let tag = classifyGitTag(tuple, snapshot.tag);
  let release = classifyGitHubRelease(tuple, snapshot.release);

  if (
    workflow.classification === "EXACT_ALREADY_COMPLETE" &&
    npm.classification === "ABSENT"
  ) {
    npm = replaceClassification(
      npm,
      "PENDING_PROOF",
      "successful workflow publication is not yet visible in the canonical registry",
    );
  }
  if (
    npm.classification === "EXACT_ALREADY_COMPLETE" &&
    workflow.classification === "ABSENT"
  ) {
    workflow = replaceClassification(
      workflow,
      "UNKNOWN",
      "exact npm state lacks its required matching publication workflow run",
    );
  }
  if (
    npm.classification === "EXACT_ALREADY_COMPLETE" &&
    Number.isInteger(workflow.evidence.runId) &&
    (npm.evidence.provenanceRunId !== workflow.evidence.runId ||
      npm.evidence.provenanceRunAttempt !== workflow.evidence.runAttempt)
  ) {
    npm = replaceClassification(
      npm,
      "CONFLICT",
      "npm provenance run/attempt does not match the exact publication workflow run",
    );
  }

  let npmStage = aggregateNpmStage(workflow, npm);
  if (
    tag.classification !== "ABSENT" &&
    npmStage !== "EXACT_ALREADY_COMPLETE"
  ) {
    tag = replaceClassification(
      tag,
      "CONFLICT",
      "Git tag state exists before exact npm publication proof",
    );
  }
  if (
    release.classification !== "ABSENT" &&
    tag.classification !== "EXACT_ALREADY_COMPLETE"
  ) {
    release = replaceClassification(
      release,
      "CONFLICT",
      "GitHub Release state exists before exact Git tag proof",
    );
  }
  npmStage = aggregateNpmStage(workflow, npm);

  const surfaces = { workflow, npm, tag, release };
  const stageClassifications = {
    NPM: npmStage,
    TAG: tag.classification,
    RELEASE: release.classification,
  };
  const completedStage = highestCompletedStage(stageClassifications);
  const completedStages = PUBLIC_RELEASE_STAGES.slice(
    0,
    PUBLIC_RELEASE_STAGES.indexOf(completedStage) + 1,
  ).filter((stage) => stage !== "FINAL_PROOF");
  const blocker = firstStageWith(stageClassifications, ["CONFLICT", "UNKNOWN"]);
  const pending = firstStageWith(stageClassifications, ["PENDING_PROOF"]);
  const absent = firstStageWith(stageClassifications, ["ABSENT"]);
  const allExact = ["NPM", "TAG", "RELEASE"].every(
    (stage) => stageClassifications[stage] === "EXACT_ALREADY_COMPLETE",
  );

  let disposition;
  let nextStage;
  if (blocker) {
    disposition = "BLOCKED";
    nextStage = null;
  } else if (pending) {
    disposition = "OBSERVE";
    nextStage = pending;
  } else if (allExact) {
    disposition = "COMPLETE";
    nextStage = "FINAL_PROOF";
  } else {
    disposition = "READY";
    nextStage = absent ?? null;
  }

  return deepFreeze({
    disposition,
    classifications: Object.fromEntries(
      Object.entries(surfaces).map(([key, value]) => [key, value.classification]),
    ),
    stageClassifications,
    issues: Object.fromEntries(
      Object.entries(surfaces).map(([key, value]) => [key, [...value.issues]]),
    ),
    evidence: Object.fromEntries(
      Object.entries(surfaces).map(([key, value]) => [key, cloneCanonical(value.evidence)]),
    ),
    completedStages,
    completedStage,
    blockingStage: blocker ?? null,
    nextStage,
  });
}

function standardDeliveryValues(standardDelivery) {
  const evaluation = standardDelivery?.evaluation ?? standardDelivery;
  const evidence =
    standardDelivery?.evidence ?? standardDelivery?.entry ?? standardDelivery;
  return {
    satisfied: evaluation?.satisfied,
    classification: evaluation?.classification,
    claim: evidence?.claim ?? standardDelivery?.claim,
    taskId: evidence?.taskId ?? standardDelivery?.taskId,
    repository: evidence?.repository ?? standardDelivery?.repository,
    baseBranch:
      evidence?.merge?.branch ??
      evidence?.pullRequest?.baseRef ??
      standardDelivery?.baseBranch,
    mergeSha:
      evidence?.merge?.sha ??
      evidence?.pullRequest?.mergeSha ??
      standardDelivery?.mergeSha,
    mergeTreeSha:
      standardDelivery?.mergeTreeSha ??
      evidence?.merge?.treeSha ??
      evidence?.mergeTreeSha,
    postMainCi:
      standardDelivery?.postMainCi ?? evaluation?.postMerge ?? evidence?.postMainCi,
  };
}

function standardDeliveryIssues(standardDelivery, tuple) {
  if (tuple.taskId === null) {
    const target = standardDelivery?.releaseTarget;
    return target?.repository === tuple.repository &&
      target?.baseBranch === tuple.baseBranch &&
      target?.sha === tuple.target.mergeSha &&
      target?.treeSha === tuple.target.treeSha &&
      (target?.currentMainSha === tuple.target.mergeSha ||
        (gitShaPattern.test(target?.currentMainSha ?? "") && target?.mainContainsTarget === true))
      ? [] : ["explicit release requires the exact target tree and proven main ancestry"];
  }
  if (!isRecord(standardDelivery)) return ["STANDARD delivery proof is missing"];
  const values = standardDeliveryValues(standardDelivery);
  const issues = [];
  for (const [label, actual, expected] of [
    ["STANDARD satisfied state", values.satisfied, true],
    ["STANDARD classification", values.classification, "HARDENED_EXACT_HEAD"],
    ["STANDARD claim", values.claim, "FINAL"],
    ["STANDARD Task ID", values.taskId, tuple.taskId],
    ["STANDARD repository", values.repository, tuple.repository],
    ["STANDARD base branch", values.baseBranch, tuple.baseBranch],
    ["STANDARD merge SHA", values.mergeSha, tuple.target.mergeSha],
    ["STANDARD merge tree SHA", values.mergeTreeSha, tuple.target.treeSha],
    ["STANDARD post-main CI", values.postMainCi, "VERIFIED_EXACT_CHECKOUT"],
  ]) {
    if (actual !== expected) issues.push(`${label} must equal the frozen public-release tuple`);
  }
  return issues;
}

function blockedPlan({
  code,
  completedStage,
  blockingStage,
  classification: classificationValue,
  diagnostics,
  resumePoint,
  recoveryCondition,
}) {
  return deepFreeze({
    outcome: "BLOCKED",
    attemptScope: PUBLIC_RELEASE_ATTEMPT_SCOPE,
    code,
    completedStage,
    blockingStage,
    classification: classificationValue,
    diagnostics: redactPublicReleaseDiagnostics(diagnostics),
    recoveryCondition,
    resumePoint,
    mutationRequired: false,
  });
}

function monotonicRegressionPlan({ stage, classification: value, state, purpose }) {
  const orderedStages = ["NPM", "TAG", "RELEASE"];
  const stageIndex = orderedStages.indexOf(stage);
  return blockedPlan({
    code:
      purpose === "FINAL_PROOF"
        ? "PUBLIC_RELEASE_FINAL_PROOF_REGRESSION"
        : `PUBLIC_RELEASE_${stage}_STATE_REGRESSION`,
    completedStage: stageIndex === 0 ? "STANDARD_FINAL" : orderedStages[stageIndex - 1],
    blockingStage: stage,
    classification: value,
    diagnostics: {
      purpose,
      priorClassification: "EXACT_ALREADY_COMPLETE",
      currentClassification: value,
      issues: state.issues,
    },
    resumePoint: stage,
    recoveryCondition:
      "Restore fresh canonical proof of the previously exact stage and resume without dispatching or recreating it.",
  });
}

export function derivePublicReleasePlan({ standardDelivery, tuple: tupleCandidate, snapshot }) {
  let tuple;
  try {
    tuple = freezePublicReleaseTuple(tupleCandidate);
  } catch (error) {
    return blockedPlan({
      code: "PUBLIC_RELEASE_TUPLE_INVALID",
      completedStage: null,
      blockingStage: "STANDARD_FINAL",
      classification: "CONFLICT",
      diagnostics: error?.issues ?? [error?.message],
      resumePoint: "STANDARD_FINAL",
      recoveryCondition: "Rebuild and cross-check the exact public-release tuple before resuming.",
    });
  }
  const gateIssues = standardDeliveryIssues(standardDelivery, tuple);
  if (gateIssues.length > 0) {
    return blockedPlan({
      code: "STANDARD_DELIVERY_NOT_FINAL",
      completedStage: null,
      blockingStage: "STANDARD_FINAL",
      classification: "CONFLICT",
      diagnostics: gateIssues,
      resumePoint: "STANDARD_FINAL",
      recoveryCondition:
        "Complete or freshly revalidate unchanged STANDARD delivery at the exact expected-head merge before resuming.",
    });
  }
  const state = classifyPublicReleaseState(tuple, snapshot);
  // Older standalone targets may only resume after both npm and its workflow
  // are exact. Recheck each snapshot so lost proof can never enable dispatch.
  if (tuple.taskId === null &&
      standardDelivery.releaseTarget.currentMainSha !== tuple.target.mergeSha &&
      state.stageClassifications.NPM !== "EXACT_ALREADY_COMPLETE") {
    return blockedPlan({
      code: "PUBLIC_RELEASE_PREVIOUS_TARGET_UNPROVEN",
      completedStage: "STANDARD_FINAL",
      blockingStage: "NPM",
      classification: state.stageClassifications.NPM === "ABSENT" ? "CONFLICT" : state.stageClassifications.NPM,
      diagnostics: { issues: state.issues, readErrors: snapshot?.readErrors ?? {} },
      resumePoint: "NPM",
      recoveryCondition: "An older main target requires exact existing npm and workflow proof; new npm publication requires the current prepared main SHA.",
    });
  }
  if (state.disposition === "BLOCKED") {
    const stageClassification = state.stageClassifications[state.blockingStage];
    return blockedPlan({
      code: `PUBLIC_RELEASE_${stageClassification}`,
      completedStage: state.completedStage,
      blockingStage: state.blockingStage,
      classification: stageClassification,
      diagnostics: { issues: state.issues, readErrors: snapshot?.readErrors ?? {} },
      resumePoint: state.blockingStage,
      recoveryCondition:
        stageClassification === "UNKNOWN"
          ? "Restore fresh cache-bypassed canonical read access and resume without retrying a mutator."
          : "Resolve the external identity conflict without replacing immutable public state, then resume.",
    });
  }
  if (state.disposition === "OBSERVE") {
    return deepFreeze({
      outcome: "OBSERVE",
      attemptScope: PUBLIC_RELEASE_ATTEMPT_SCOPE,
      code: "PUBLIC_RELEASE_PENDING_PROOF",
      completedStage: state.completedStage,
      blockingStage: state.nextStage,
      classification: "PENDING_PROOF",
      diagnostics: redactPublicReleaseDiagnostics({
        issues: state.issues,
        readErrors: snapshot?.readErrors ?? {},
      }),
      recoveryCondition:
        "Resume after canonical state becomes observable; do not dispatch, rerun, or recreate the pending stage.",
      resumePoint: state.nextStage,
      mutationRequired: false,
      state,
    });
  }
  if (state.disposition === "COMPLETE") {
    return deepFreeze({
      outcome: "READY",
      attemptScope: PUBLIC_RELEASE_ATTEMPT_SCOPE,
      code: "PUBLIC_RELEASE_FINAL_PROOF_REQUIRED",
      completedStage: state.completedStage,
      nextStage: "FINAL_PROOF",
      mutationRequired: false,
      state,
    });
  }
  return deepFreeze({
    outcome: "READY",
    attemptScope: PUBLIC_RELEASE_ATTEMPT_SCOPE,
    code: `PUBLIC_RELEASE_${state.nextStage}_READY`,
    completedStage: state.completedStage,
    nextStage: state.nextStage,
    mutationRequired: true,
    state,
  });
}

function requireFreshFinalSnapshot(snapshot) {
  return (
    isRecord(snapshot?.readContext) &&
    snapshot.readContext.fresh === true &&
    snapshot.readContext.cacheBypass === true &&
    Number.isInteger(snapshot.readContext.sequence) &&
    snapshot.readContext.sequence > 0
  );
}

export function createCanonicalPublicReleaseProof(tupleCandidate, snapshot) {
  const tuple = freezePublicReleaseTuple(tupleCandidate);
  if (!requireFreshFinalSnapshot(snapshot)) {
    throw publicReleaseError(
      "PUBLIC_RELEASE_FINAL_READ_NOT_FRESH",
      "Canonical public-release proof requires a fresh cache-bypassed read",
    );
  }
  const state = classifyPublicReleaseState(tuple, snapshot);
  if (state.disposition !== "COMPLETE") {
    throw publicReleaseError(
      "PUBLIC_RELEASE_FINAL_PROOF_INCOMPLETE",
      "Canonical public-release proof is incomplete",
      Object.values(state.issues).flat(),
    );
  }
  return deepFreeze({
    schemaVersion: 1,
    disposition: "COMPLETE",
    taskId: tuple.taskId,
    repository: tuple.repository,
    baseBranch: tuple.baseBranch,
    mergeSha: tuple.target.mergeSha,
    mergeTreeSha: tuple.target.treeSha,
    package: {
      name: tuple.package.name,
      version: tuple.package.version,
      repository: tuple.package.repository,
      access: tuple.package.access,
      registry: tuple.package.registry,
      gitHead: tuple.target.mergeSha,
      latest: tuple.package.version,
      versions: [...tuple.package.priorVersions, tuple.package.version],
      tarball: {
        bytes: tuple.package.tarball.bytes,
        integrity: tuple.package.tarball.integrity,
        shasum: tuple.package.tarball.shasum,
        sha256: tuple.package.tarball.sha256,
        rawBytesVerified: state.evidence.npm.rawBytesVerified,
        entryCount: tuple.package.tarball.entries.length,
      },
      signatureKeyId: tuple.package.signature.keyId,
      provenance: {
        ...cloneCanonical(tuple.package.provenance),
        runId: state.evidence.npm.provenanceRunId,
        runAttempt: state.evidence.npm.provenanceRunAttempt,
      },
    },
    plugin: cloneCanonical(tuple.plugin),
    workflow: {
      id: tuple.publishWorkflow.id,
      name: tuple.publishWorkflow.name,
      path: tuple.publishWorkflow.path,
      ref: tuple.publishWorkflow.ref,
      state: tuple.publishWorkflow.state,
      event: tuple.publishWorkflow.event,
      environment: tuple.publishWorkflow.environment,
      publisher: cloneCanonical(tuple.publishWorkflow.publisher),
      ...cloneCanonical(state.evidence.workflow),
    },
    tag: {
      repository: tuple.repository,
      name: tuple.tag.name,
      ...cloneCanonical(state.evidence.tag),
    },
    release: {
      repository: tuple.repository,
      title: tuple.release.title,
      body: tuple.release.body,
      draft: tuple.release.draft,
      prerelease: tuple.release.prerelease,
      assets: [],
      ...cloneCanonical(state.evidence.release),
    },
    classifications: cloneCanonical(state.classifications),
    canonicalRead: {
      fresh: true,
      cacheBypass: true,
      sequence: snapshot.readContext.sequence,
    },
  });
}

function sensitiveKey(key) {
  return (
    /^(?:env|environment)$/iu.test(key) ||
    /(?:authorization|cookie|set-cookie|token|secret|password|passwd|credential|npmrc|oidc|jwt|otp|one.?time|api.?key|private.?key|session)/iu.test(
      key,
    )
  );
}

function logKey(key) {
  return /(?:log|stdout|stderr|output|trace|response.?body)/iu.test(key);
}

function redactAuthUrls(text) {
  return text.replace(/https?:\/\/[^\s"'<>]+/giu, (candidate) => {
    try {
      const parsed = new URL(candidate);
      const authSurface = /(?:auth|authorize|oauth|login|signin|device|session)/iu.test(
        `${parsed.hostname}${parsed.pathname}`,
      );
      const sensitiveQuery = [...parsed.searchParams.keys()].some(
        (key) =>
          sensitiveKey(key) ||
          /^(?:code|state|ticket|nonce|assertion|samlresponse)$/iu.test(key),
      );
      if (authSurface || sensitiveQuery || parsed.username || parsed.password) {
        return "[REDACTED_AUTH_URL]";
      }
    } catch {
      return "[REDACTED_URL]";
    }
    return candidate;
  });
}

function redactString(value, limit) {
  let redacted = String(value);
  redacted = redactAuthUrls(redacted);
  redacted = redacted.replace(
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu,
    "[REDACTED_JWT]",
  );
  redacted = redacted.replace(
    /\b(?:npm_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})\b/gu,
    "[REDACTED_TOKEN]",
  );
  redacted = redacted.replace(
    /\b(Authorization\s*:\s*)(?:Basic|Bearer|token)\s+[^\s,;]+/giu,
    "$1[REDACTED]",
  );
  redacted = redacted.replace(
    /\b((?:set-)?cookie\s*:\s*)[^\r\n]+/giu,
    "$1[REDACTED]",
  );
  redacted = redacted.replace(
    /\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|COOKIE|AUTH|JWT|OTP)[A-Z0-9_]*\s*=\s*)[^\s]+/gu,
    "$1[REDACTED]",
  );
  redacted = redacted.replace(
    /\b((?:otp|one[- ]time(?: password| code)?|verification code)\s*[:=]?\s*)\d{4,10}\b/giu,
    "$1[REDACTED_OTP]",
  );
  redacted = redacted.replace(
    /\b((?:token|secret|password|credential|api[-_ ]?key)\s*[:=]\s*)[^\s,;]+/giu,
    "$1[REDACTED]",
  );
  if (redacted.length > limit) {
    return `${redacted.slice(0, limit)}[TRUNCATED ${redacted.length - limit} CHARS]`;
  }
  return redacted;
}

function numericLimit(value, fallback, minimum, maximum) {
  if (!Number.isInteger(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

function diagnosticLimits(options) {
  return {
    maxBytes: numericLimit(options?.maxBytes, DEFAULT_DIAGNOSTIC_LIMITS.maxBytes, 256, 64 * 1024),
    maxDepth: numericLimit(options?.maxDepth, DEFAULT_DIAGNOSTIC_LIMITS.maxDepth, 1, 12),
    maxEntries: numericLimit(options?.maxEntries, DEFAULT_DIAGNOSTIC_LIMITS.maxEntries, 1, 128),
    maxStringLength: numericLimit(
      options?.maxStringLength,
      DEFAULT_DIAGNOSTIC_LIMITS.maxStringLength,
      64,
      4096,
    ),
    maxLogLength: numericLimit(
      options?.maxLogLength,
      DEFAULT_DIAGNOSTIC_LIMITS.maxLogLength,
      64,
      2048,
    ),
  };
}

function sanitizeDiagnostic(value, limits, depth, seen, key = "") {
  if (sensitiveKey(key)) return "[REDACTED]";
  if (typeof value === "string") {
    return redactString(value, logKey(key) ? limits.maxLogLength : limits.maxStringLength);
  }
  if (["number", "boolean"].includes(typeof value) || value === null) return value;
  if (["bigint", "symbol", "function", "undefined"].includes(typeof value)) {
    return `[${(typeof value === "undefined" ? "UNAVAILABLE" : typeof value).toUpperCase()}]`;
  }
  if (depth >= limits.maxDepth) return "[TRUNCATED_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (value instanceof Error) {
    return sanitizeDiagnostic(
      { name: value.name, code: value.code, message: value.message },
      limits,
      depth,
      seen,
      key,
    );
  }
  if (Array.isArray(value)) {
    const values = value
      .slice(0, limits.maxEntries)
      .map((entry) => sanitizeDiagnostic(entry, limits, depth + 1, seen, key));
    if (value.length > limits.maxEntries) {
      values.push(`[TRUNCATED ${value.length - limits.maxEntries} ITEMS]`);
    }
    return values;
  }
  const keys = Object.keys(value).sort();
  const result = {};
  for (const childKey of keys.slice(0, limits.maxEntries)) {
    let child;
    try {
      child = value[childKey];
    } catch {
      child = "[UNREADABLE]";
    }
    result[childKey] = sanitizeDiagnostic(
      child,
      limits,
      depth + 1,
      seen,
      childKey,
    );
  }
  if (keys.length > limits.maxEntries) {
    result.truncatedKeys = keys.length - limits.maxEntries;
  }
  return result;
}

export function redactPublicReleaseDiagnostics(value, options = {}) {
  const limits = diagnosticLimits(options);
  const sanitized = sanitizeDiagnostic(value, limits, 0, new WeakSet());
  const serialized = JSON.stringify(sanitized);
  if (Buffer.byteLength(serialized, "utf8") <= limits.maxBytes) {
    return deepFreeze(sanitized);
  }
  const preview = redactString(serialized, Math.max(64, Math.floor(limits.maxBytes / 4)));
  return deepFreeze({
    redacted: true,
    reason: "DIAGNOSTIC_LIMIT",
    preview,
  });
}

function validateClient(client) {
  const required = [
    "readWorkflowRuns",
    "readNpmVersion",
    "readTag",
    "readRelease",
    "dispatchPublishWorkflow",
    "createTag",
    "createRelease",
  ];
  return required.filter((name) => typeof client?.[name] !== "function");
}

async function settledRead(method, tuple, context) {
  try {
    return { value: await method(tuple, context) };
  } catch (error) {
    return { error: redactPublicReleaseDiagnostics(error) };
  }
}

function createReadAll(client, tuple) {
  let sequence = 0;
  return async function readAll(purpose) {
    sequence += 1;
    const readContext = Object.freeze({
      fresh: true,
      cacheBypass: true,
      purpose,
      sequence,
    });
    const [workflow, npm, tag, release] = await Promise.all([
      settledRead(client.readWorkflowRuns, tuple, readContext),
      settledRead(client.readNpmVersion, tuple, readContext),
      settledRead(client.readTag, tuple, readContext),
      settledRead(client.readRelease, tuple, readContext),
    ]);
    return Object.freeze({
      workflow: workflow.value,
      npm: npm.value,
      tag: tag.value,
      release: release.value,
      readErrors: deepFreeze({
        ...(workflow.error ? { workflow: workflow.error } : {}),
        ...(npm.error ? { npm: npm.error } : {}),
        ...(tag.error ? { tag: tag.error } : {}),
        ...(release.error ? { release: release.error } : {}),
      }),
      readContext,
    });
  };
}

function completedStagesThrough(stage) {
  return PUBLIC_RELEASE_STAGES.slice(0, PUBLIC_RELEASE_STAGES.indexOf(stage) + 1).filter(
    (value) => value !== "FINAL_PROOF",
  );
}

function runBlocked(plan, mutations, extra = {}) {
  return deepFreeze({
    ...plan,
    outcome: "BLOCKED",
    mutations: cloneCanonical(mutations),
    ...extra,
  });
}

function pendingAfterMutation(stage, state, mutations) {
  return runBlocked(
    blockedPlan({
      code: `PUBLIC_RELEASE_${stage}_PROOF_PENDING`,
      completedStage: state.completedStage,
      blockingStage: stage,
      classification: "PENDING_PROOF",
      diagnostics: state.issues,
      resumePoint: stage,
      recoveryCondition:
        "Resume after canonical state becomes observable; do not retry the accepted mutator.",
    }),
    mutations,
  );
}

function mutationMethod(client, stage) {
  if (stage === "NPM") return client.dispatchPublishWorkflow;
  if (stage === "TAG") return client.createTag;
  return client.createRelease;
}

async function reconcileWithoutMutation({
  readAll,
  planSnapshot,
  reconciliationReads,
  purpose,
}) {
  let snapshot;
  let plan;
  for (let index = 0; index < Math.max(1, reconciliationReads); index += 1) {
    snapshot = await readAll(`${purpose}_${index + 1}`);
    plan = planSnapshot(snapshot, `${purpose}_${index + 1}`);
    if (plan.outcome !== "OBSERVE") break;
  }
  return { snapshot, plan };
}

// One call is one exact authorized invocation/attempt. The guard below prevents
// duplicate mutator requests inside that attempt; canonical remote state is the
// only cross-invocation arbiter, not a distributed lock or durable retry ledger.
export async function runPublicRelease({
  invocation,
  standardDelivery,
  tuple: tupleCandidate,
  clients,
  reconciliationReads = DEFAULT_RECONCILIATION_READS,
}) {
  let tuple;
  try {
    tuple = freezePublicReleaseTuple(tupleCandidate);
  } catch (error) {
    return blockedPlan({
      code: "PUBLIC_RELEASE_TUPLE_INVALID",
      completedStage: null,
      blockingStage: "STANDARD_FINAL",
      classification: "CONFLICT",
      diagnostics: error?.issues ?? [error?.message],
      resumePoint: "STANDARD_FINAL",
      recoveryCondition: "Rebuild and cross-check the exact public-release tuple before resuming.",
    });
  }
  const route = parsePublicReleaseInvocation(invocation);
  if (!route || route.releaseVersion !== tuple.package.version ||
      route.releaseSha !== tuple.target.mergeSha) {
    return blockedPlan({
      code: "PUBLIC_RELEASE_AUTHORITY_REQUIRED", completedStage: null,
      blockingStage: "STANDARD_FINAL", classification: "CONFLICT",
      diagnostics: ["An explicit release action must match the frozen version and SHA."],
      resumePoint: "STANDARD_FINAL", recoveryCondition: "Obtain the user's release action for this target.",
    });
  }
  if (tuple.repository !== PUBLIC_RELEASE_REPOSITORY) {
    return blockedPlan({
      code: "PUBLIC_RELEASE_REPOSITORY_UNSUPPORTED", completedStage: null,
      blockingStage: "STANDARD_FINAL", classification: "CONFLICT",
      diagnostics: ["The built-in public publisher is restricted to kimyeongwoo/kyw-dev."],
      resumePoint: "STANDARD_FINAL", recoveryCondition: "Use the target project's existing authorized release procedure.",
    });
  }
  const gateIssues = standardDeliveryIssues(standardDelivery, tuple);
  if (gateIssues.length > 0) {
    return blockedPlan({
      code: "STANDARD_DELIVERY_NOT_FINAL",
      completedStage: null,
      blockingStage: "STANDARD_FINAL",
      classification: "CONFLICT",
      diagnostics: gateIssues,
      resumePoint: "STANDARD_FINAL",
      recoveryCondition:
        "Complete or freshly revalidate unchanged STANDARD delivery at the exact expected-head merge before resuming.",
    });
  }
  const missingClientMethods = validateClient(clients);
  if (missingClientMethods.length > 0) {
    return blockedPlan({
      code: "PUBLIC_RELEASE_CLIENT_INVALID",
      completedStage: "STANDARD_FINAL",
      blockingStage: "NPM",
      classification: "UNKNOWN",
      diagnostics: missingClientMethods.map((name) => `missing injected client method ${name}`),
      resumePoint: "NPM",
      recoveryCondition: "Restore the canonical injected read and create boundaries before resuming.",
    });
  }
  const boundedReads = numericLimit(
    reconciliationReads,
    DEFAULT_RECONCILIATION_READS,
    1,
    MAX_RECONCILIATION_READS,
  );
  const readAll = createReadAll(clients, tuple);
  const mutations = [];
  const attemptedStages = new Set();
  const provenExactStages = new Set();
  const planSnapshot = (currentSnapshot, purpose) => {
    const state = classifyPublicReleaseState(tuple, currentSnapshot);
    const regression = ["NPM", "TAG", "RELEASE"].find(
      (stage) =>
        provenExactStages.has(stage) &&
        state.stageClassifications[stage] !== "EXACT_ALREADY_COMPLETE",
    );
    if (regression) {
      return monotonicRegressionPlan({
        stage: regression,
        classification: state.stageClassifications[regression],
        state,
        purpose,
      });
    }
    for (const stage of ["NPM", "TAG", "RELEASE"]) {
      if (state.stageClassifications[stage] === "EXACT_ALREADY_COMPLETE") {
        provenExactStages.add(stage);
      }
    }
    return derivePublicReleasePlan({ standardDelivery, tuple, snapshot: currentSnapshot });
  };
  let snapshot = await readAll("PREFLIGHT");

  for (let transition = 0; transition < 16; transition += 1) {
    let plan = planSnapshot(snapshot, "STATE_TRANSITION");
    if (plan.outcome === "BLOCKED") return runBlocked(plan, mutations);
    if (plan.outcome === "OBSERVE") {
      const reconciled = await reconcileWithoutMutation({
        readAll,
        planSnapshot,
        reconciliationReads: boundedReads,
        purpose: `OBSERVE_${plan.resumePoint}`,
      });
      snapshot = reconciled.snapshot;
      plan = reconciled.plan;
      if (plan.outcome === "OBSERVE") return runBlocked(plan, mutations);
      if (plan.outcome === "BLOCKED") return runBlocked(plan, mutations);
    }

    if (plan.nextStage === "FINAL_PROOF") {
      const finalSnapshot = await readAll("FINAL_PROOF");
      const finalPlan = planSnapshot(finalSnapshot, "FINAL_PROOF");
      if (finalPlan.outcome !== "READY" || finalPlan.nextStage !== "FINAL_PROOF") {
        return runBlocked(finalPlan, mutations);
      }
      try {
        const proof = createCanonicalPublicReleaseProof(tuple, finalSnapshot);
        return deepFreeze({
          outcome: "COMPLETE",
          attemptScope: PUBLIC_RELEASE_ATTEMPT_SCOPE,
          code: "PUBLIC_RELEASE_COMPLETE",
          completedStage: "RELEASE",
          completedStages: completedStagesThrough("RELEASE"),
          resumePoint: null,
          mutationRequired: false,
          mutations: cloneCanonical(mutations),
          proof,
        });
      } catch (error) {
        return runBlocked(
          blockedPlan({
            code: error?.code ?? "PUBLIC_RELEASE_FINAL_PROOF_INCOMPLETE",
            completedStage: finalPlan.completedStage,
            blockingStage: "FINAL_PROOF",
            classification: "UNKNOWN",
            diagnostics: error?.issues ?? [error?.message],
            resumePoint: "FINAL_PROOF",
            recoveryCondition:
              "Restore fresh canonical final reads and resume without repeating a completed create.",
          }),
          mutations,
        );
      }
    }

    const stage = plan.nextStage;
    if (!stage || attemptedStages.has(stage)) {
      const state = classifyPublicReleaseState(tuple, snapshot);
      return pendingAfterMutation(stage ?? "NPM", state, mutations);
    }

    snapshot = await readAll(`PRE_${stage}_WRITE`);
    const recheck = planSnapshot(snapshot, `PRE_${stage}_WRITE`);
    if (recheck.outcome === "BLOCKED") return runBlocked(recheck, mutations);
    if (recheck.outcome === "OBSERVE") {
      const reconciled = await reconcileWithoutMutation({
        readAll,
        planSnapshot,
        reconciliationReads: boundedReads,
        purpose: `OBSERVE_${stage}_RACE`,
      });
      snapshot = reconciled.snapshot;
      if (reconciled.plan.outcome === "OBSERVE") {
        return runBlocked(reconciled.plan, mutations);
      }
      continue;
    }
    if (recheck.nextStage !== stage) continue;

    attemptedStages.add(stage);
    const attemptContext = Object.freeze({
      attempt: 1,
      attemptScope: PUBLIC_RELEASE_ATTEMPT_SCOPE,
      stage,
      expectedSha: tuple.target.mergeSha,
      expectedVersion: tuple.package.version,
      ref: stage === "NPM" ? tuple.publishWorkflow.ref : tuple.tag.ref,
    });
    const requested = {
      stage,
      attempt: 1,
      attemptScope: PUBLIC_RELEASE_ATTEMPT_SCOPE,
      status: "REQUESTED",
    };
    mutations.push(requested);
    let mutationResult;
    let mutationError;
    try {
      mutationResult = await mutationMethod(clients, stage)(tuple, attemptContext);
    } catch (error) {
      mutationError = error;
    }
    const accepted = !mutationError && mutationResult?.accepted === true;
    mutations[mutations.length - 1] = {
      ...requested,
      status: accepted ? "ACCEPTED" : "AMBIGUOUS_OR_FAILED",
    };

    if (!accepted) {
      const reconciled = await reconcileWithoutMutation({
        readAll,
        planSnapshot,
        reconciliationReads: boundedReads,
        purpose: `RECONCILE_${stage}_MUTATION`,
      });
      const state = classifyPublicReleaseState(tuple, reconciled.snapshot);
      const reconciledClassification = state.stageClassifications[stage];
      return runBlocked(
        blockedPlan({
          code: `PUBLIC_RELEASE_${stage}_MUTATION_AMBIGUOUS`,
          completedStage: state.completedStage,
          blockingStage:
            state.completedStage === stage
              ? PUBLIC_RELEASE_STAGES[PUBLIC_RELEASE_STAGES.indexOf(stage) + 1]
              : stage,
          classification:
            reconciledClassification === "ABSENT"
              ? "UNKNOWN"
              : (reconciledClassification ?? reconciled.plan.classification ?? "UNKNOWN"),
          diagnostics: {
            mutation: mutationError ?? mutationResult,
            reconciliation: state.issues,
          },
          resumePoint:
            state.completedStage === stage
              ? PUBLIC_RELEASE_STAGES[PUBLIC_RELEASE_STAGES.indexOf(stage) + 1]
              : stage,
          recoveryCondition:
            "Use canonical reads to establish the attempted stage, then resume; never retry this mutator from the failed or ambiguous response.",
        }),
        mutations,
      );
    }

    snapshot = await readAll(`PROVE_${stage}_AFTER_WRITE`);
    const afterWrite = planSnapshot(snapshot, `PROVE_${stage}_AFTER_WRITE`);
    if (afterWrite.outcome === "BLOCKED") return runBlocked(afterWrite, mutations);
    const state = classifyPublicReleaseState(tuple, snapshot);
    if (!state.completedStages.includes(stage)) {
      if (afterWrite.outcome === "OBSERVE") {
        const reconciled = await reconcileWithoutMutation({
          readAll,
          planSnapshot,
          reconciliationReads: boundedReads,
          purpose: `PROVE_${stage}`,
        });
        snapshot = reconciled.snapshot;
        const reconciledState = classifyPublicReleaseState(tuple, snapshot);
        if (!reconciledState.completedStages.includes(stage)) {
          return pendingAfterMutation(stage, reconciledState, mutations);
        }
      } else {
        return pendingAfterMutation(stage, state, mutations);
      }
    }
  }

  return runBlocked(
    blockedPlan({
      code: "PUBLIC_RELEASE_TRANSITION_BOUND_EXCEEDED",
      completedStage: "STANDARD_FINAL",
      blockingStage: "NPM",
      classification: "UNKNOWN",
      diagnostics: "bounded public-release transition limit reached",
      resumePoint: "NPM",
      recoveryCondition: "Resume from fresh canonical state without repeating a mutator.",
    }),
    mutations,
  );
}
