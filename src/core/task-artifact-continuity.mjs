import { createHash, randomBytes } from "node:crypto";
import {
  lstat,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import { TaskArtifactError } from "./task-artifact-shared.mjs";

export const STANDARD_DELIVERY_CONTINUITY_FILE =
  ".kyw-dev-standard-delivery-continuity.json";
export const STANDARD_DELIVERY_CONTINUITY_RELATIVE_PATH =
  `docs/tasks/${STANDARD_DELIVERY_CONTINUITY_FILE}`;
export const MAX_STANDARD_DELIVERY_CONTINUITY_BYTES = 8192;
export const MAX_STANDARD_DELIVERY_CONTINUITY_TASKS = 128;

const CHECKPOINT_SCHEMA_VERSION = 1;
const CHECKPOINT_KIND = "KYW_STANDARD_DELIVERY_CONTINUITY";
const CHECKPOINT_CONTRACT_KIND = "HARDENED_EXACT_HEAD";
const CHECKPOINT_CONTRACT_VERSION = 2;
const TRANSITION_TOKEN_SCHEMA_VERSION = 1;
const TRANSITION_TOKEN_KIND =
  "KYW_STANDARD_DELIVERY_CONTINUITY_TRANSITION";
const MAX_TRANSITION_TOKEN_BYTES = 16 * 1024;
const CONTINUITY_CONTRACT_KIND = "DURABLE_STANDARD_CONTINUITY";
const CONTINUITY_CONTRACT_VERSION = 1;
const CONTINUITY_CLASSIFICATION = "DURABLE_STANDARD_CONTINUITY";
const CONTINUITY_EVALUATION = "PREVIOUSLY_EVALUATOR_SATISFIED";
const GENESIS = "GENESIS";
const CONTINUITY_LOCK_FILE =
  ".kyw-dev-standard-delivery-continuity.lock";
const TASK_ID_PATTERN = /^\d{4}$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const CLASSIFICATIONS = new Set([
  "HARDENED_EXACT_HEAD",
  "LEGACY_PRE_CONTRACT",
]);

const ORDERED_TASK_SET_SEED = digestText(
  "kyw-dev/standard-delivery-continuity/ordered-task-set/v1",
);
const TERMINAL_PAIR_STATE_SEED = digestText(
  "kyw-dev/standard-delivery-continuity/terminal-pair-state/v1",
);
const CUMULATIVE_EVIDENCE_SEED = digestText(
  "kyw-dev/standard-delivery-continuity/cumulative-evidence/v1",
);

function continuityError(message, code = "DELIVERY_CONTINUITY_INVALID") {
  return new TaskArtifactError(code, `STANDARD delivery continuity: ${message}`);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function digestText(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function rollDigest(domain, previousDigest, value) {
  return digestText(`${domain}\0${previousDigest}\0${stableJson(value)}`);
}

function requireExactKeys(label, value, expected) {
  if (!isRecord(value)) {
    throw continuityError(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  const unknown = actual.filter((key) => !wanted.includes(key));
  const missing = wanted.filter((key) => !actual.includes(key));
  if (unknown.length > 0) {
    throw continuityError(`${label} contains unknown field ${unknown[0]}`);
  }
  if (missing.length > 0) {
    throw continuityError(`${label} is missing field ${missing[0]}`);
  }
}

function requireSha(label, value) {
  if (!SHA_PATTERN.test(value ?? "")) {
    throw continuityError(`${label} must be a lowercase 40-character Git SHA`);
  }
}

function requireDigest(label, value) {
  if (!DIGEST_PATTERN.test(value ?? "")) {
    throw continuityError(`${label} must be a lowercase SHA-256 digest`);
  }
}

function requireTaskId(label, value) {
  if (!TASK_ID_PATTERN.test(value ?? "")) {
    throw continuityError(`${label} must be a four-digit Task ID`);
  }
}

function checkpointBody(checkpoint) {
  return {
    schemaVersion: checkpoint.schemaVersion,
    kind: checkpoint.kind,
    repository: checkpoint.repository,
    baseRef: checkpoint.baseRef,
    sourceMainSha: checkpoint.sourceMainSha,
    coveredMainSha: checkpoint.coveredMainSha,
    deliveryContract: {
      kind: checkpoint.deliveryContract.kind,
      version: checkpoint.deliveryContract.version,
    },
    coverage: {
      taskCount: checkpoint.coverage.taskCount,
      lastTaskId: checkpoint.coverage.lastTaskId,
      orderedTaskSetSha256: checkpoint.coverage.orderedTaskSetSha256,
      terminalPairStateSha256: checkpoint.coverage.terminalPairStateSha256,
      cumulativeEvidenceSha256: checkpoint.coverage.cumulativeEvidenceSha256,
    },
    previousCheckpointDigest: checkpoint.previousCheckpointDigest,
    transition:
      checkpoint.transition === null
        ? null
        : {
            taskId: checkpoint.transition.taskId,
            classification: checkpoint.transition.classification,
            outcomeSha: checkpoint.transition.outcomeSha,
            mergeSha: checkpoint.transition.mergeSha,
            evidenceSha256: checkpoint.transition.evidenceSha256,
          },
  };
}

function orderedCheckpoint(checkpoint) {
  return {
    ...checkpointBody(checkpoint),
    checkpointDigest: checkpoint.checkpointDigest,
  };
}

function checkpointBytes(checkpoint) {
  return `${JSON.stringify(orderedCheckpoint(checkpoint), null, 2)}\n`;
}

function validateTransition(transition, taskCount, lastTaskId, coveredMainSha) {
  if (taskCount === 0) {
    if (transition !== null) {
      throw continuityError("empty genesis transition must be null");
    }
    if (lastTaskId !== null) {
      throw continuityError("empty genesis lastTaskId must be null");
    }
    return;
  }
  requireExactKeys("transition", transition, [
    "taskId",
    "classification",
    "outcomeSha",
    "mergeSha",
    "evidenceSha256",
  ]);
  requireTaskId("transition.taskId", transition.taskId);
  if (!CLASSIFICATIONS.has(transition.classification)) {
    throw continuityError("transition.classification is unsupported");
  }
  requireSha("transition.outcomeSha", transition.outcomeSha);
  requireSha("transition.mergeSha", transition.mergeSha);
  requireDigest("transition.evidenceSha256", transition.evidenceSha256);
  if (transition.taskId !== lastTaskId) {
    throw continuityError("transition.taskId must equal coverage.lastTaskId");
  }
  if (transition.mergeSha !== coveredMainSha) {
    throw continuityError("transition.mergeSha must equal coveredMainSha");
  }
}

function validateCheckpointObject(checkpoint) {
  requireExactKeys("checkpoint", checkpoint, [
    "schemaVersion",
    "kind",
    "repository",
    "baseRef",
    "sourceMainSha",
    "coveredMainSha",
    "deliveryContract",
    "coverage",
    "previousCheckpointDigest",
    "transition",
    "checkpointDigest",
  ]);
  if (checkpoint.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    throw continuityError(`schemaVersion must be ${CHECKPOINT_SCHEMA_VERSION}`);
  }
  if (checkpoint.kind !== CHECKPOINT_KIND) {
    throw continuityError(`kind must be ${CHECKPOINT_KIND}`);
  }
  if (!REPOSITORY_PATTERN.test(checkpoint.repository ?? "")) {
    throw continuityError("repository must be an exact owner/name identity");
  }
  if (checkpoint.baseRef !== "main") {
    throw continuityError('baseRef must be "main"');
  }
  requireSha("sourceMainSha", checkpoint.sourceMainSha);
  requireSha("coveredMainSha", checkpoint.coveredMainSha);

  requireExactKeys("deliveryContract", checkpoint.deliveryContract, [
    "kind",
    "version",
  ]);
  if (
    checkpoint.deliveryContract.kind !== CHECKPOINT_CONTRACT_KIND ||
    checkpoint.deliveryContract.version !== CHECKPOINT_CONTRACT_VERSION
  ) {
    throw continuityError(
      `deliveryContract must be ${CHECKPOINT_CONTRACT_KIND} version ${CHECKPOINT_CONTRACT_VERSION}`,
    );
  }

  requireExactKeys("coverage", checkpoint.coverage, [
    "taskCount",
    "lastTaskId",
    "orderedTaskSetSha256",
    "terminalPairStateSha256",
    "cumulativeEvidenceSha256",
  ]);
  if (
    !Number.isSafeInteger(checkpoint.coverage.taskCount) ||
    checkpoint.coverage.taskCount < 0 ||
    checkpoint.coverage.taskCount > MAX_STANDARD_DELIVERY_CONTINUITY_TASKS
  ) {
    throw continuityError(
      `coverage.taskCount must be between 0 and ${MAX_STANDARD_DELIVERY_CONTINUITY_TASKS}`,
    );
  }
  if (checkpoint.coverage.taskCount > 0) {
    requireTaskId("coverage.lastTaskId", checkpoint.coverage.lastTaskId);
  }
  requireDigest(
    "coverage.orderedTaskSetSha256",
    checkpoint.coverage.orderedTaskSetSha256,
  );
  requireDigest(
    "coverage.terminalPairStateSha256",
    checkpoint.coverage.terminalPairStateSha256,
  );
  requireDigest(
    "coverage.cumulativeEvidenceSha256",
    checkpoint.coverage.cumulativeEvidenceSha256,
  );
  if (
    checkpoint.previousCheckpointDigest !== GENESIS &&
    !DIGEST_PATTERN.test(checkpoint.previousCheckpointDigest ?? "")
  ) {
    throw continuityError(
      "previousCheckpointDigest must be GENESIS or a lowercase SHA-256 digest",
    );
  }
  validateTransition(
    checkpoint.transition,
    checkpoint.coverage.taskCount,
    checkpoint.coverage.lastTaskId,
    checkpoint.coveredMainSha,
  );
  if (
    checkpoint.coverage.taskCount === 0 &&
    checkpoint.coveredMainSha !== checkpoint.sourceMainSha
  ) {
    throw continuityError(
      "empty genesis coveredMainSha must equal sourceMainSha",
    );
  }
  requireDigest("checkpointDigest", checkpoint.checkpointDigest);
  const expectedDigest = digestText(stableJson(checkpointBody(checkpoint)));
  if (checkpoint.checkpointDigest !== expectedDigest) {
    throw continuityError("checkpoint digest does not match canonical content");
  }
  return checkpoint;
}

function freezeDeep(value) {
  if (Array.isArray(value)) {
    value.forEach(freezeDeep);
  } else if (isRecord(value)) {
    Object.values(value).forEach(freezeDeep);
  }
  return Object.freeze(value);
}

function validateCoveredRecord(record) {
  requireExactKeys("covered record", record, [
    "taskId",
    "taskSha256",
    "testSha256",
    "taskStatus",
    "testStatus",
    "classification",
    "outcomeSha",
    "mergeSha",
    "evidenceSha256",
  ]);
  requireTaskId("covered record taskId", record.taskId);
  requireDigest("covered record taskSha256", record.taskSha256);
  requireDigest("covered record testSha256", record.testSha256);
  if (record.taskStatus !== "DONE" || record.testStatus !== "PASSED") {
    throw continuityError("covered record must bind DONE/PASSED terminal state");
  }
  if (!CLASSIFICATIONS.has(record.classification)) {
    throw continuityError("covered record classification is unsupported");
  }
  requireSha("covered record outcomeSha", record.outcomeSha);
  requireSha("covered record mergeSha", record.mergeSha);
  requireDigest("covered record evidenceSha256", record.evidenceSha256);
}

function terminalPairState(record) {
  return {
    taskId: record.taskId,
    taskSha256: record.taskSha256,
    testSha256: record.testSha256,
    taskStatus: record.taskStatus,
    testStatus: record.testStatus,
  };
}

function validateTerminalPairState(record) {
  requireExactKeys("terminal pair state", record, [
    "taskId",
    "taskSha256",
    "testSha256",
    "taskStatus",
    "testStatus",
  ]);
  requireTaskId("terminal pair state taskId", record.taskId);
  requireDigest("terminal pair state taskSha256", record.taskSha256);
  requireDigest("terminal pair state testSha256", record.testSha256);
  if (record.taskStatus !== "DONE" || record.testStatus !== "PASSED") {
    throw continuityError("terminal pair state must bind DONE/PASSED");
  }
}

export function digestStandardDeliveryContinuityTerminalPairs(records) {
  if (
    !Array.isArray(records) ||
    records.length > MAX_STANDARD_DELIVERY_CONTINUITY_TASKS
  ) {
    throw continuityError(
      `terminal pair states must be an array of at most ${MAX_STANDARD_DELIVERY_CONTINUITY_TASKS}`,
    );
  }
  const seen = new Set();
  let digest = TERMINAL_PAIR_STATE_SEED;
  for (const record of records) {
    validateTerminalPairState(record);
    if (seen.has(record.taskId)) {
      throw continuityError(`terminal pair state repeats Task ${record.taskId}`);
    }
    seen.add(record.taskId);
    digest = rollDigest(
      "terminal-pair-state/v1",
      digest,
      terminalPairState(record),
    );
  }
  return digest;
}

export function createStandardDeliveryContinuityCheckpoint({
  repository,
  baseRef = "main",
  sourceMainSha,
  coveredRecords = [],
  previousCheckpoint,
}) {
  if (!Array.isArray(coveredRecords)) {
    throw continuityError("coveredRecords must be an array");
  }
  if (
    coveredRecords.length >
    (previousCheckpoint ? 1 : MAX_STANDARD_DELIVERY_CONTINUITY_TASKS)
  ) {
    throw continuityError(
      previousCheckpoint
        ? "a rolling transition may cover exactly one new outcome"
        : `bootstrap may cover at most ${MAX_STANDARD_DELIVERY_CONTINUITY_TASKS} outcomes`,
    );
  }
  const previous = previousCheckpoint
    ? validateCheckpointObject(structuredClone(previousCheckpoint))
    : undefined;
  if (
    previous &&
    (repository !== previous.repository || baseRef !== previous.baseRef)
  ) {
    throw continuityError(
      "rolling checkpoint cannot change repository or base identity",
    );
  }
  if (previous && coveredRecords.length !== 1) {
    throw continuityError("a rolling transition must cover exactly one outcome");
  }
  const seen = new Set();
  let taskCount = previous?.coverage.taskCount ?? 0;
  let orderedTaskSetSha256 =
    previous?.coverage.orderedTaskSetSha256 ?? ORDERED_TASK_SET_SEED;
  let terminalPairStateSha256 =
    previous?.coverage.terminalPairStateSha256 ?? TERMINAL_PAIR_STATE_SEED;
  let cumulativeEvidenceSha256 =
    previous?.coverage.cumulativeEvidenceSha256 ?? CUMULATIVE_EVIDENCE_SEED;
  let lastTaskId = previous?.coverage.lastTaskId ?? null;
  let transition = null;

  for (const record of coveredRecords) {
    validateCoveredRecord(record);
    if (seen.has(record.taskId) || record.taskId === lastTaskId) {
      throw continuityError(`covered record repeats Task ${record.taskId}`);
    }
    seen.add(record.taskId);
    taskCount += 1;
    if (taskCount > MAX_STANDARD_DELIVERY_CONTINUITY_TASKS) {
      throw continuityError(
        `coverage exceeds ${MAX_STANDARD_DELIVERY_CONTINUITY_TASKS} outcomes`,
      );
    }
    orderedTaskSetSha256 = rollDigest(
      "ordered-task-set/v1",
      orderedTaskSetSha256,
      record.taskId,
    );
    terminalPairStateSha256 = rollDigest(
      "terminal-pair-state/v1",
      terminalPairStateSha256,
      terminalPairState(record),
    );
    transition = {
      taskId: record.taskId,
      classification: record.classification,
      outcomeSha: record.outcomeSha,
      mergeSha: record.mergeSha,
      evidenceSha256: record.evidenceSha256,
    };
    cumulativeEvidenceSha256 = rollDigest(
      "cumulative-evidence/v1",
      cumulativeEvidenceSha256,
      transition,
    );
    lastTaskId = record.taskId;
  }

  const coveredMainSha =
    transition?.mergeSha ?? previous?.coveredMainSha ?? sourceMainSha;
  const body = {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    kind: CHECKPOINT_KIND,
    repository,
    baseRef,
    sourceMainSha,
    coveredMainSha,
    deliveryContract: {
      kind: CHECKPOINT_CONTRACT_KIND,
      version: CHECKPOINT_CONTRACT_VERSION,
    },
    coverage: {
      taskCount,
      lastTaskId,
      orderedTaskSetSha256,
      terminalPairStateSha256,
      cumulativeEvidenceSha256,
    },
    previousCheckpointDigest: previous?.checkpointDigest ?? GENESIS,
    transition,
  };
  const checkpoint = {
    ...body,
    checkpointDigest: digestText(stableJson(body)),
  };
  validateCheckpointObject(checkpoint);
  const bytes = checkpointBytes(checkpoint);
  if (
    Buffer.byteLength(bytes, "utf8") >
    MAX_STANDARD_DELIVERY_CONTINUITY_BYTES
  ) {
    throw continuityError(
      `checkpoint exceeds ${MAX_STANDARD_DELIVERY_CONTINUITY_BYTES} UTF-8 bytes`,
    );
  }
  return freezeDeep({ checkpoint, bytes });
}

export function parseStandardDeliveryContinuityCheckpoint(bytes) {
  if (typeof bytes !== "string") {
    throw continuityError("checkpoint bytes must be UTF-8 text");
  }
  if (
    Buffer.byteLength(bytes, "utf8") >
    MAX_STANDARD_DELIVERY_CONTINUITY_BYTES
  ) {
    throw continuityError(
      `checkpoint exceeds ${MAX_STANDARD_DELIVERY_CONTINUITY_BYTES} UTF-8 bytes`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes);
  } catch {
    throw continuityError("checkpoint must contain valid JSON");
  }
  validateCheckpointObject(parsed);
  if (bytes !== checkpointBytes(parsed)) {
    throw continuityError("checkpoint must use canonical JSON bytes");
  }
  return freezeDeep(parsed);
}

function orderedTaskSetDigest(tasks) {
  let digest = ORDERED_TASK_SET_SEED;
  for (const task of tasks) {
    requireTaskId("required Task ID", task?.id);
    digest = rollDigest("ordered-task-set/v1", digest, task.id);
  }
  return digest;
}

export function partitionStandardDeliveryContinuity({
  checkpoint,
  requiredTasks,
  maxUncoveredTasks = 1,
}) {
  validateCheckpointObject(structuredClone(checkpoint));
  if (!Array.isArray(requiredTasks)) {
    throw continuityError("requiredTasks must be an array");
  }
  if (
    !Number.isSafeInteger(maxUncoveredTasks) ||
    maxUncoveredTasks < 0 ||
    maxUncoveredTasks > MAX_STANDARD_DELIVERY_CONTINUITY_TASKS
  ) {
    throw continuityError(
      `maxUncoveredTasks must be an integer from 0 to ${MAX_STANDARD_DELIVERY_CONTINUITY_TASKS}`,
    );
  }
  const coveredCount = checkpoint.coverage.taskCount;
  if (coveredCount > requiredTasks.length) {
    throw continuityError(
      "checkpoint coverage is not a prefix of the ordered required Task set",
    );
  }
  const coveredTasks = requiredTasks.slice(0, coveredCount);
  for (const task of coveredTasks) {
    if (
      task.taskStatus !== "DONE" ||
      task.testStatus !== "PASSED" ||
      task.deliveryRequirement?.kind !== "STANDARD"
    ) {
      throw continuityError(
        `covered Task ${task.id ?? "<missing>"} is not terminal STANDARD`,
      );
    }
  }
  if (
    orderedTaskSetDigest(coveredTasks) !==
    checkpoint.coverage.orderedTaskSetSha256
  ) {
    throw continuityError(
      "checkpoint does not bind the exact ordered required Task set",
    );
  }
  const observedLast = coveredTasks.at(-1)?.id ?? null;
  if (observedLast !== checkpoint.coverage.lastTaskId) {
    throw continuityError(
      "checkpoint last Task does not match the ordered required Task set",
    );
  }
  const uncoveredTasks = requiredTasks.slice(coveredCount);
  if (uncoveredTasks.length > maxUncoveredTasks) {
    throw continuityError(
      `checkpoint gap ${uncoveredTasks.length} requires explicit migration/rebaseline`,
      "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
    );
  }
  return freezeDeep({
    coveredTasks: [...coveredTasks],
    uncoveredTasks: [...uncoveredTasks],
  });
}

export function buildStandardDeliveryContinuityState({
  checkpoint,
  coveredTasks,
  coverageTasks = coveredTasks,
}) {
  const coveragePartition = partitionStandardDeliveryContinuity({
    checkpoint,
    requiredTasks: coverageTasks,
    maxUncoveredTasks: MAX_STANDARD_DELIVERY_CONTINUITY_TASKS,
  });
  const coveredTaskIds = new Set(
    coveragePartition.coveredTasks.map((task) => task.id),
  );
  if (coveredTasks.some((task) => !coveredTaskIds.has(task.id))) {
    throw continuityError(
      "coveredTasks must be a subset of exact checkpoint coverage",
    );
  }
  const deliveryLedger = {};
  const deliveryExpectations = {};
  for (const task of coveredTasks) {
    const deliveryContract = {
      kind: CONTINUITY_CONTRACT_KIND,
      version: CONTINUITY_CONTRACT_VERSION,
      checkpointDigest: checkpoint.checkpointDigest,
      coveredTaskSetSha256: checkpoint.coverage.orderedTaskSetSha256,
      terminalPairStateSha256: checkpoint.coverage.terminalPairStateSha256,
      cumulativeEvidenceSha256:
        checkpoint.coverage.cumulativeEvidenceSha256,
    };
    deliveryExpectations[task.id] = {
      schemaVersion: 3,
      source: "ALIGNED_MAIN_CHECKPOINT",
      taskId: task.id,
      repository: checkpoint.repository,
      baseRef: checkpoint.baseRef,
      deliveryContract,
    };
    deliveryLedger[task.id] = {
      schemaVersion: 3,
      claim: "FINAL",
      source: "REPOSITORY_CHECKPOINT",
      taskId: task.id,
      repository: checkpoint.repository,
      classification: CONTINUITY_CLASSIFICATION,
      checkpointDigest: checkpoint.checkpointDigest,
      coveredTaskSetSha256: checkpoint.coverage.orderedTaskSetSha256,
      terminalPairStateSha256: checkpoint.coverage.terminalPairStateSha256,
      cumulativeEvidenceSha256:
        checkpoint.coverage.cumulativeEvidenceSha256,
      evaluation: CONTINUITY_EVALUATION,
    };
  }
  return freezeDeep({ deliveryLedger, deliveryExpectations });
}

export function digestStandardDeliveryContinuityEvidence({
  entry,
  expectation,
}) {
  if (!isRecord(entry) || !isRecord(expectation)) {
    throw continuityError("evaluator evidence digest requires entry and expectation");
  }
  return digestText(stableJson({ entry, expectation }));
}

async function optionalState(target, options) {
  try {
    return await lstat(target, options);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function sameFileIdentity(left, right) {
  return Boolean(
    left &&
      right &&
      left.dev === right.dev &&
      left.ino === right.ino,
  );
}

async function regularFileProof(target, label) {
  const state = await optionalState(target, { bigint: true });
  if (!state) return Object.freeze({ exists: false });
  if (state.isSymbolicLink() || !state.isFile()) {
    throw continuityError(`${label} must be absent or a regular file`);
  }
  return Object.freeze({
    exists: true,
    state,
    bytes: await readFile(target, "utf8"),
  });
}

async function requireUnchangedProof(target, baseline, label) {
  const current = await regularFileProof(target, label);
  if (baseline.exists !== current.exists) {
    throw continuityError(
      `${label} changed during checkpoint publication`,
      "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
    );
  }
  if (
    baseline.exists &&
    (!sameFileIdentity(baseline.state, current.state) ||
      baseline.bytes !== current.bytes)
  ) {
    throw continuityError(
      `${label} was replaced or modified during checkpoint publication`,
      "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
    );
  }
  return current;
}

async function acquireContinuityLock(root) {
  const token = randomBytes(24).toString("hex");
  const lockPath = path.join(root, CONTINUITY_LOCK_FILE);
  let handle;
  try {
    handle = await open(lockPath, "wx+", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw continuityError(
        `checkpoint lock ${CONTINUITY_LOCK_FILE} already exists; preserve it for explicit recovery`,
        "DELIVERY_CONTINUITY_LOCKED",
      );
    }
    throw continuityError(
      `checkpoint lock acquisition failed: ${error.message}`,
      "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
    );
  }
  try {
    await handle.writeFile(`${token}\n`, "utf8");
    await handle.sync();
    const state = await handle.stat({ bigint: true });
    return { token, lockPath, handle, state };
  } catch (error) {
    try {
      await handle.close();
    } catch {
      // The acquisition failure remains authoritative.
    }
    throw continuityError(
      `checkpoint lock initialization failed: ${error.message}`,
      "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
    );
  }
}

async function releaseContinuityLock(root, lock) {
  const releasePath = path.join(
    root,
    `${CONTINUITY_LOCK_FILE}.release-${lock.token}.tmp`,
  );
  try {
    await lock.handle.close();
    lock.handle = undefined;
    const fixedProof = await regularFileProof(lock.lockPath, "checkpoint lock");
    if (
      !fixedProof.exists ||
      !sameFileIdentity(fixedProof.state, lock.state) ||
      fixedProof.bytes !== `${lock.token}\n`
    ) {
      throw new Error("owned checkpoint lock identity changed");
    }
    if (await optionalState(releasePath, { bigint: true })) {
      throw new Error("owned checkpoint lock release path is occupied");
    }
    await rename(lock.lockPath, releasePath);
    const releaseProof = await regularFileProof(
      releasePath,
      "checkpoint lock release marker",
    );
    if (
      !releaseProof.exists ||
      !sameFileIdentity(releaseProof.state, lock.state) ||
      releaseProof.bytes !== `${lock.token}\n`
    ) {
      throw new Error("owned checkpoint lock release identity changed");
    }
    if (await optionalState(lock.lockPath, { bigint: true })) {
      throw new Error("a replacement checkpoint lock appeared during release");
    }
    await unlink(releasePath);
  } catch (error) {
    try {
      await lock.handle?.close();
    } catch {
      // Recovery remains explicit when ownership cannot be proved.
    }
    throw continuityError(
      `checkpoint lock release requires explicit recovery: ${error.message}`,
      "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
    );
  }
}

export async function writeStandardDeliveryContinuityCheckpoint({
  tasksRoot,
  bytes,
  beforePublish,
}) {
  const checkpoint = parseStandardDeliveryContinuityCheckpoint(bytes);
  const root = path.resolve(tasksRoot);
  const rootState = await lstat(root, { bigint: true });
  if (rootState.isSymbolicLink() || !rootState.isDirectory()) {
    throw continuityError("tasks root must be a real directory");
  }
  const target = path.join(root, STANDARD_DELIVERY_CONTINUITY_FILE);
  const lock = await acquireContinuityLock(root);
  const stage = `${target}.stage-${lock.token}.tmp`;
  let stageHandle;
  let stageState;
  let result;
  let failure;
  try {
    const baseline = await regularFileProof(target, "checkpoint target");
    let idempotent = false;
    if (baseline.exists) {
      if (baseline.bytes === bytes) {
        idempotent = true;
      } else {
        const existing = parseStandardDeliveryContinuityCheckpoint(
          baseline.bytes,
        );
        if (checkpoint.previousCheckpointDigest === GENESIS) {
          throw continuityError(
            "genesis checkpoint cannot replace existing continuity",
          );
        }
        if (existing.checkpointDigest !== checkpoint.previousCheckpointDigest) {
          throw continuityError(
            "existing checkpoint does not match previousCheckpointDigest",
          );
        }
      }
    } else if (checkpoint.previousCheckpointDigest !== GENESIS) {
      throw continuityError(
        "rolling checkpoint requires its exact previous checkpoint",
      );
    }

    if (!idempotent) {
      stageHandle = await open(stage, "wx", 0o600);
      stageState = await stageHandle.stat({ bigint: true });
      await stageHandle.writeFile(bytes, "utf8");
      await stageHandle.sync();
      await stageHandle.close();
      stageHandle = undefined;
      const stagedProof = await regularFileProof(stage, "checkpoint staging path");
      if (
        !stagedProof.exists ||
        !sameFileIdentity(stagedProof.state, stageState) ||
        stagedProof.bytes !== bytes
      ) {
        throw continuityError(
          "checkpoint staging ownership or bytes changed after fsync",
          "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
        );
      }
    }

    if (beforePublish !== undefined) {
      if (typeof beforePublish !== "function") {
        throw continuityError("beforePublish must be a function");
      }
      await beforePublish(Object.freeze({
        checkpoint,
        target,
        stage: idempotent ? undefined : stage,
        idempotent,
      }));
    }
    const currentLock = await regularFileProof(
      lock.lockPath,
      "checkpoint lock",
    );
    if (
      !currentLock.exists ||
      !sameFileIdentity(currentLock.state, lock.state) ||
      currentLock.bytes !== `${lock.token}\n`
    ) {
      throw continuityError(
        "owned checkpoint lock identity changed before publication",
        "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
      );
    }
    const currentRootState = await lstat(root, { bigint: true });
    if (
      currentRootState.isSymbolicLink() ||
      !currentRootState.isDirectory() ||
      !sameFileIdentity(rootState, currentRootState)
    ) {
      throw continuityError(
        "tasks root identity changed during checkpoint publication",
        "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
      );
    }
    await requireUnchangedProof(target, baseline, "checkpoint target");
    if (idempotent) {
      result = freezeDeep({
        path: target,
        checkpointDigest: checkpoint.checkpointDigest,
        applied: false,
        idempotent: true,
      });
    } else {
      const stagedProof = await regularFileProof(stage, "checkpoint staging path");
      if (
        !stagedProof.exists ||
        !sameFileIdentity(stagedProof.state, stageState) ||
        stagedProof.bytes !== bytes
      ) {
        throw continuityError(
          "checkpoint staging path was replaced or modified before publication",
          "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
        );
      }
      await rename(stage, target);
      const publishedProof = await regularFileProof(target, "checkpoint target");
      if (
        !publishedProof.exists ||
        !sameFileIdentity(publishedProof.state, stageState) ||
        publishedProof.bytes !== bytes
      ) {
        throw continuityError(
          "published checkpoint identity or bytes cannot be proved",
          "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
        );
      }
      stageState = undefined;
      result = freezeDeep({
        path: target,
        checkpointDigest: checkpoint.checkpointDigest,
        applied: true,
        idempotent: false,
      });
    }
  } catch (error) {
    failure = error;
    try {
      await stageHandle?.close();
    } catch {
      // The original write failure remains authoritative.
    }
    if (stageState) {
      try {
        const currentStage = await optionalState(stage, { bigint: true });
        if (currentStage && sameFileIdentity(stageState, currentStage)) {
          await unlink(stage);
        } else if (currentStage) {
          throw new Error("checkpoint staging path has foreign identity");
        }
      } catch (cleanupError) {
        failure = continuityError(
          `checkpoint write failed and exact staging cleanup could not be proved: ${cleanupError.message}`,
          "DELIVERY_CONTINUITY_WRITE_RECOVERY_REQUIRED",
        );
      }
    }
  }
  try {
    await releaseContinuityLock(root, lock);
  } catch (error) {
    throw error;
  }
  if (failure) {
    if (failure instanceof TaskArtifactError) throw failure;
    throw continuityError(`checkpoint atomic write failed: ${failure.message}`);
  }
  return result;
}

function transitionTokenBody(value) {
  return {
    schemaVersion: value.schemaVersion,
    kind: value.kind,
    selectedTaskId: value.selectedTaskId,
    checkpoint: orderedCheckpoint(value.checkpoint),
  };
}

function transitionTokenObject(value) {
  return {
    ...transitionTokenBody(value),
    tokenDigest: value.tokenDigest,
  };
}

function transitionTokenText(value) {
  return JSON.stringify(transitionTokenObject(value));
}

export function createStandardDeliveryContinuityTransitionToken({
  selectedTaskId,
  checkpoint,
}) {
  requireTaskId("selectedTaskId", selectedTaskId);
  validateCheckpointObject(structuredClone(checkpoint));
  if (checkpoint.transition?.taskId === selectedTaskId) {
    throw continuityError("selected Task cannot attest to its own delivery");
  }
  const body = {
    schemaVersion: TRANSITION_TOKEN_SCHEMA_VERSION,
    kind: TRANSITION_TOKEN_KIND,
    selectedTaskId,
    checkpoint: orderedCheckpoint(checkpoint),
  };
  const value = {
    ...body,
    tokenDigest: digestText(stableJson(body)),
  };
  const text = transitionTokenText(value);
  if (Buffer.byteLength(text, "utf8") > MAX_TRANSITION_TOKEN_BYTES) {
    throw continuityError(
      `transition token exceeds ${MAX_TRANSITION_TOKEN_BYTES} UTF-8 bytes`,
    );
  }
  return Buffer.from(text, "utf8").toString("base64url");
}

export function parseStandardDeliveryContinuityTransitionToken(token) {
  if (
    typeof token !== "string" ||
    !token ||
    Buffer.byteLength(token, "utf8") > MAX_TRANSITION_TOKEN_BYTES * 2
  ) {
    throw continuityError("transition token is missing or oversized");
  }
  let text;
  let parsed;
  try {
    text = Buffer.from(token, "base64url").toString("utf8");
    parsed = JSON.parse(text);
  } catch {
    throw continuityError("transition token is malformed");
  }
  requireExactKeys("transition token", parsed, [
    "schemaVersion",
    "kind",
    "selectedTaskId",
    "checkpoint",
    "tokenDigest",
  ]);
  if (
    parsed.schemaVersion !== TRANSITION_TOKEN_SCHEMA_VERSION ||
    parsed.kind !== TRANSITION_TOKEN_KIND
  ) {
    throw continuityError("transition token schema or kind is unsupported");
  }
  requireTaskId("transition token selectedTaskId", parsed.selectedTaskId);
  validateCheckpointObject(parsed.checkpoint);
  requireDigest("transition token tokenDigest", parsed.tokenDigest);
  if (
    parsed.tokenDigest !== digestText(stableJson(transitionTokenBody(parsed)))
  ) {
    throw continuityError("transition token digest does not match its content");
  }
  if (parsed.checkpoint.transition?.taskId === parsed.selectedTaskId) {
    throw continuityError("selected Task cannot attest to its own delivery");
  }
  if (
    text !== transitionTokenText(parsed) ||
    Buffer.from(text, "utf8").toString("base64url") !== token
  ) {
    throw continuityError("transition token must use canonical bytes");
  }
  return freezeDeep(parsed);
}
