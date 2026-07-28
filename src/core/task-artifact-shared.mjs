import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { hostname } from "node:os";

export const stagingPrefix = ".kyw-dev-task-";
export const creationLockName = ".kyw-dev-task-create.lock";
export const batchReleaseMarkerPrefix = ".kyw-dev-task-release-";
export const batchStagePrefix = `${stagingPrefix}batch-`;
export const batchTransactionKind = "kyw-task-batch-transaction";
export const batchTransactionSchemaVersion = 1;
export const batchTransactionTokenPattern = /^[a-f0-9]{32}$/;
export const batchTransactionHashPattern = /^[a-f0-9]{64}$/;
export const MAX_TASK_BATCH_PAYLOAD_BYTES = 16 * 1024 * 1024;
export const maxBatchPayloadBytes = MAX_TASK_BATCH_PAYLOAD_BYTES;
export const maxBatchJournalBytes = 16 * 1024 * 1024;
export const maxBatchDiagnosticObservations = 64;

export class TaskArtifactError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "TaskArtifactError";
    this.code = code;
  }
}


export function normalizeComparable(filePath, pathApi) {
  return pathApi.sep === "\\" ? filePath.toLowerCase() : filePath;
}

export async function pathState(filePath) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function filesystemIdentity(state) {
  return Object.freeze({
    device: String(state.dev),
    inode: String(state.ino),
    birthtimeNanoseconds: String(state.birthtimeNs),
  });
}

export function validFilesystemIdentity(identity) {
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

export function sameFilesystemIdentity(left, right) {
  return (
    validFilesystemIdentity(left) &&
    validFilesystemIdentity(right) &&
    left.device === right.device &&
    left.inode === right.inode &&
    left.birthtimeNanoseconds === right.birthtimeNanoseconds
  );
}

export async function bigintPathState(filePath) {
  try {
    return await lstat(filePath, { bigint: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function readRegularFileProof(filePath) {
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

export function proofMatchesExpected(proof, expected) {
  return (
    proof.bytes === expected.bytes &&
    proof.sha256 === expected.sha256 &&
    (!expected.identity || sameFilesystemIdentity(proof.identity, expected.identity))
  );
}

export function boundedOwnerMetadata() {
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

export function batchReleaseMarkerName(token) {
  return `${batchReleaseMarkerPrefix}${token}.lock`;
}

export function isBatchReleaseMarkerName(name) {
  return (
    name.startsWith(batchReleaseMarkerPrefix) &&
    name.endsWith(".lock")
  );
}

export function isBatchTransactionArtifactName(name) {
  return (
    name === creationLockName ||
    name.startsWith(batchReleaseMarkerPrefix) ||
    name.startsWith(batchStagePrefix)
  );
}

export async function listBatchTransactionArtifacts(tasksRoot) {
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

export function taskLayoutError(inventory) {
  const details = [...inventory.malformed];
  for (const conflict of inventory.conflicts) {
    details.push(`Task ID ${conflict.id} is used by: ${conflict.names.join(", ")}`);
  }
  return new TaskArtifactError(
    "INVALID_TASK_LAYOUT",
    `Cannot allocate a Task ID until the tasks directory is reconciled:\n- ${details.join("\n- ")}`,
  );
}
