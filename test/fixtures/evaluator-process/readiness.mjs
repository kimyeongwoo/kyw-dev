import {
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";

export const EVALUATOR_READINESS_PROTOCOL = "kyw-evaluator-readiness";
export const EVALUATOR_READINESS_VERSION = 1;
export const DEFAULT_READINESS_TIMEOUT_MS = 45_000;

const SAFE_LABEL = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeLabel(value) {
  const normalized = String(value ?? "");
  return SAFE_LABEL.test(normalized) ? normalized : "evaluator-readiness";
}

function safeRunId(value) {
  const normalized = String(value ?? "");
  return SAFE_RUN_ID.test(normalized) ? normalized : "invalid-run-id";
}

function serializedReadiness(record) {
  return `${JSON.stringify(record, null, 2)}\n`;
}

export function createReadinessRecord({
  runId,
  pid,
  descendantPid = null,
  ...details
}) {
  if (!SAFE_RUN_ID.test(String(runId ?? ""))) {
    throw new TypeError("Evaluator readiness requires a portable runId");
  }
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new TypeError("Evaluator readiness requires a positive child PID");
  }
  if (descendantPid !== null && (!Number.isInteger(descendantPid) || descendantPid <= 0)) {
    throw new TypeError("Evaluator readiness descendantPid must be null or a positive PID");
  }
  return Object.freeze({
    ...details,
    protocol: EVALUATOR_READINESS_PROTOCOL,
    version: EVALUATOR_READINESS_VERSION,
    state: "ready",
    runId,
    pid,
    descendantPid,
  });
}

export function inspectReadinessText(text, expectedRunId) {
  const bytes = Buffer.byteLength(String(text ?? ""), "utf8");
  let record;
  try {
    record = JSON.parse(String(text));
  } catch {
    return Object.freeze({ state: "incomplete", reason: "INVALID_JSON", bytes });
  }
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return Object.freeze({ state: "invalid", reason: "NOT_AN_OBJECT", bytes });
  }
  if (record.protocol !== EVALUATOR_READINESS_PROTOCOL) {
    return Object.freeze({ state: "invalid", reason: "WRONG_PROTOCOL", bytes });
  }
  if (record.version !== EVALUATOR_READINESS_VERSION) {
    return Object.freeze({ state: "invalid", reason: "WRONG_VERSION", bytes });
  }
  if (record.state !== "ready") {
    return Object.freeze({ state: "invalid", reason: "NOT_READY", bytes });
  }
  if (!SAFE_RUN_ID.test(String(record.runId ?? ""))) {
    return Object.freeze({ state: "invalid", reason: "INVALID_RUN_ID", bytes });
  }
  if (record.runId !== expectedRunId) {
    return Object.freeze({
      state: "wrong-run",
      reason: "RUN_ID_MISMATCH",
      observedRunId: safeRunId(record.runId),
      bytes,
    });
  }
  if (!Number.isInteger(record.pid) || record.pid <= 0) {
    return Object.freeze({ state: "invalid", reason: "INVALID_PID", bytes });
  }
  if (
    record.descendantPid !== null &&
    (!Number.isInteger(record.descendantPid) || record.descendantPid <= 0)
  ) {
    return Object.freeze({ state: "invalid", reason: "INVALID_DESCENDANT_PID", bytes });
  }
  return Object.freeze({ state: "ready", reason: "VALIDATED", bytes, record });
}

export function readReadiness(path, expectedRunId, { readFile = readFileSync } = {}) {
  try {
    return inspectReadinessText(readFile(path, "utf8"), expectedRunId);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return Object.freeze({ state: "absent", reason: "NOT_PUBLISHED", bytes: 0 });
    }
    return Object.freeze({
      state: "unreadable",
      reason: String(error?.code ?? error?.name ?? "UNKNOWN"),
      bytes: 0,
    });
  }
}

export function readinessDiagnostic({
  attempts,
  expectedRunId,
  observation,
  pathLabel,
}) {
  const observed =
    observation.observedRunId === undefined
      ? ""
      : ` observedRunId=${safeRunId(observation.observedRunId)}`;
  return [
    `readiness pathLabel=${safeLabel(pathLabel)}`,
    `expectedRunId=${safeRunId(expectedRunId)}`,
    `state=${observation.state}`,
    `reason=${observation.reason}`,
    `attempts=${attempts}`,
    `bytes=${observation.bytes ?? 0}${observed}`,
  ].join(" ");
}

export async function waitForReadiness({
  path,
  expectedRunId,
  pathLabel = "evaluator-readiness",
  timeoutMs = DEFAULT_READINESS_TIMEOUT_MS,
  pollIntervalMs = 25,
  now = Date.now,
  sleep = delay,
  read = readReadiness,
  onObservation,
}) {
  if (!SAFE_RUN_ID.test(String(expectedRunId ?? ""))) {
    throw new TypeError("Evaluator readiness wait requires a portable expectedRunId");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new TypeError("Evaluator readiness timeoutMs must be a non-negative number");
  }
  const startedAt = now();
  let attempts = 0;
  let observation = Object.freeze({
    state: "absent",
    reason: "NOT_OBSERVED",
    bytes: 0,
  });
  while (true) {
    attempts += 1;
    observation = read(path, expectedRunId);
    onObservation?.(observation);
    if (observation.state === "ready") return observation.record;

    const remaining = timeoutMs - (now() - startedAt);
    if (remaining <= 0) {
      const error = new Error(
        readinessDiagnostic({
          attempts,
          expectedRunId,
          observation,
          pathLabel,
        }),
      );
      error.name = "EvaluatorReadinessError";
      error.code = "EVALUATOR_READINESS_TIMEOUT";
      error.observation = observation;
      throw error;
    }
    await sleep(Math.min(Math.max(1, pollIntervalMs), remaining));
  }
}

export function publishReadiness(
  path,
  value,
  {
    writeFile = writeFileSync,
    rename = renameSync,
    remove = rmSync,
  } = {},
) {
  const record = createReadinessRecord(value);
  const stagingPath = `${path}.${process.pid}.ready.tmp`;
  try {
    writeFile(stagingPath, serializedReadiness(record), "utf8");
    rename(stagingPath, path);
  } catch (error) {
    try {
      remove(stagingPath, { force: true });
    } catch {
      // The publication error remains authoritative; cleanup is best-effort fixture hygiene.
    }
    throw error;
  }
  return record;
}
