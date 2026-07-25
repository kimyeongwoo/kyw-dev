import { randomUUID } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  INSTALL_METADATA_NAME,
  INSTALL_SCHEMA_VERSION,
  MANAGED_SKILL_NAMES,
  PACKAGE_ROOT,
  SkillInstallationError,
  TRANSACTION_COMPLETE_NAME,
  TRANSACTION_NAME,
  assertCanonicalRealPath,
  assertLocationLayout,
  assertRealDirectory,
  assertSafeManagedParents,
  backupPrefix,
  commitCompleteText,
  commitStartedName,
  commitStartedText,
  hashBuffer,
  hashFile,
  installationError,
  isAllowedManagedPath,
  isPathInside,
  managedManifestErrors,
  normalizeManagedPath,
  normalizedComparable,
  pathState,
  portablePathIdentity,
  readRegularFile,
  resolveInstallLocation,
  resolveManagedPath,
  resolveUserHome,
  sameFileIdentity,
  sha256Pattern,
  stagePrefix,
  transactionIdPattern,
} from "./skill-installation-shared.mjs";
import {
  buildManagedSourceInventory,
  createInstallMetadata,
  serializeJson,
  validateInstallMetadata,
} from "./skill-installation-inventory.mjs";
import {
  assertScopeDirectoryChain,
  directManagedContainers,
  ensureScopeDirectories,
  inspectManagedInstallation,
  knownManagedDirectories,
  listManagedRootIdentityCollisions,
  listReservedArtifacts,
  readInstallMetadata,
} from "./skill-installation-state.mjs";

function validateTransactionName(name, prefix) {
  const identifier = typeof name === "string" && name.startsWith(prefix) ? name.slice(prefix.length) : "";
  if (typeof name !== "string" || name !== `${prefix}${identifier}` || !transactionIdPattern.test(identifier)) {
    throw installationError("RECOVERY_REQUIRED", `Transaction contains an unsafe reserved path: ${name}`);
  }
  return name;
}

function validateTransaction(transaction, location) {
  const errors = [];
  if (!transaction || typeof transaction !== "object" || Array.isArray(transaction)) {
    errors.push("transaction root must be an object");
  } else {
    if (transaction.schemaVersion !== INSTALL_SCHEMA_VERSION) {
      errors.push(`schemaVersion must be ${INSTALL_SCHEMA_VERSION}`);
    }
    if (!["install", "update", "uninstall"].includes(transaction.operation)) {
      errors.push("operation is invalid");
    }
    if (transaction.scope !== location.scope) {
      errors.push(`scope ${transaction.scope ?? "<missing>"} does not match ${location.scope}`);
    }
    if (!Number.isInteger(transaction.processId) || transaction.processId < 1) {
      errors.push("processId must be a positive integer");
    }
    if (transaction.force === undefined) {
      transaction.force = false;
    } else if (typeof transaction.force !== "boolean") {
      errors.push("force must be boolean");
    }
    try {
      validateTransactionName(transaction.stageDirectory, stagePrefix);
      validateTransactionName(transaction.backupDirectory, backupPrefix);
    } catch (error) {
      errors.push(error.message);
    }
    const allPaths = [];
    for (const key of ["oldFiles", "newFiles"]) {
      if (!Array.isArray(transaction[key])) {
        errors.push(`${key} must be an array`);
        continue;
      }
      const paths = [];
      for (const entry of transaction[key]) {
        try {
          normalizeManagedPath(entry?.path);
        } catch (error) {
          errors.push(`${key}: ${error.message}`);
          continue;
        }
        if (!isAllowedManagedPath(entry.path) || !sha256Pattern.test(entry.sha256 ?? "")) {
          errors.push(`${key} contains an invalid managed entry: ${entry.path}`);
        }
        if (
          key === "oldFiles" &&
          entry.ownedSha256 !== undefined &&
          !sha256Pattern.test(entry.ownedSha256)
        ) {
          errors.push(`${key} contains an invalid ownership hash: ${entry.path}`);
        }
        paths.push(entry.path);
        allPaths.push(entry.path);
      }
      errors.push(...managedManifestErrors(paths, key));
    }
    const uniqueAllPaths = [...new Set(allPaths)];
    errors.push(...managedManifestErrors(uniqueAllPaths, "transaction inventory"));
    if (typeof transaction.hadOldMetadata !== "boolean") {
      errors.push("hadOldMetadata must be boolean");
    }
    for (const key of ["oldMetadataHash", "newMetadataHash"]) {
      if (transaction[key] !== null && !sha256Pattern.test(transaction[key] ?? "")) {
        errors.push(`${key} must be null or a SHA-256 hash`);
      }
    }
    if (transaction.operation === "install") {
      if (
        transaction.hadOldMetadata ||
        transaction.oldMetadataHash !== null ||
        transaction.force ||
        transaction.oldFiles?.length !== 0 ||
        transaction.newFiles?.length === 0 ||
        transaction.newMetadataHash === null
      ) {
        errors.push("install transaction ownership fields are inconsistent");
      }
    } else if (transaction.operation === "update") {
      if (
        !transaction.hadOldMetadata ||
        transaction.oldMetadataHash === null ||
        transaction.force ||
        transaction.newMetadataHash === null ||
        transaction.oldFiles?.length === 0 ||
        transaction.newFiles?.length === 0
      ) {
        errors.push("update transaction ownership fields are inconsistent");
      }
    } else if (transaction.operation === "uninstall") {
      if (
        !transaction.hadOldMetadata ||
        transaction.oldMetadataHash === null ||
        transaction.newMetadataHash !== null ||
        typeof transaction.force !== "boolean" ||
        transaction.oldFiles?.length === 0 ||
        transaction.newFiles?.length !== 0
      ) {
        errors.push("uninstall transaction ownership fields are inconsistent");
      }
    }
  }
  if (errors.length > 0) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Cannot safely recover malformed transaction ${location.transactionPath}:\n- ${errors.join("\n- ")}`,
    );
  }
  return transaction;
}

function reservedDirectoryPath(location, name, prefix) {
  validateTransactionName(name, prefix);
  const directory = path.resolve(location.skillsRoot, name);
  if (!isPathInside(location.skillsRoot, directory) || directory === path.resolve(location.skillsRoot)) {
    throw installationError("RECOVERY_REQUIRED", `Refusing to remove unsafe transaction directory: ${directory}`);
  }
  return directory;
}

function expectedReservedFiles(transaction, kind) {
  const expected = new Map();
  if (kind === "stage") {
    for (const entry of transaction.newFiles) {
      expected.set(entry.path, entry.sha256);
    }
    if (transaction.newMetadataHash) {
      expected.set(INSTALL_METADATA_NAME, transaction.newMetadataHash);
    }
  } else {
    for (const entry of transaction.oldFiles) {
      expected.set(entry.path, entry.sha256);
    }
    if (transaction.oldMetadataHash) {
      expected.set(INSTALL_METADATA_NAME, transaction.oldMetadataHash);
    }
    expected.set(commitStartedName, hashBuffer(Buffer.from(commitStartedText, "utf8")));
  }
  return expected;
}

function validateReservedDirectory(location, transaction, kind) {
  const isStage = kind === "stage";
  const name = isStage ? transaction.stageDirectory : transaction.backupDirectory;
  const prefix = isStage ? stagePrefix : backupPrefix;
  const directory = reservedDirectoryPath(location, name, prefix);
  const state = pathState(directory);
  if (!state) {
    return directory;
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    throw installationError("RECOVERY_REQUIRED", `Transaction path is not a real directory: ${directory}`);
  }
  assertCanonicalRealPath(directory, "transaction directory", "RECOVERY_REQUIRED", location.skillsRoot);
  const expected = expectedReservedFiles(transaction, kind);
  const expectedByIdentity = new Map(
    [...expected.keys()].map((relativePath) => [portablePathIdentity(relativePath), relativePath]),
  );
  const knownDirectories = new Set();
  for (const relativePath of expected.keys()) {
    const segments = relativePath.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      knownDirectories.add(segments.slice(0, index).join("/"));
    }
  }

  function visit(current, relativeDirectory = "") {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      const expectedPath = expectedByIdentity.get(portablePathIdentity(relativePath));
      if (expectedPath !== undefined && expectedPath !== relativePath) {
        throw installationError(
          "RECOVERY_REQUIRED",
          `Transaction path case-collides with ${expectedPath}: ${absolute}`,
        );
      }
      const entryState = pathState(absolute);
      if (!entryState || entry.isSymbolicLink() || entryState.isSymbolicLink()) {
        throw installationError("RECOVERY_REQUIRED", `Transaction contains an unsafe entry: ${absolute}`);
      }
      if (entry.isDirectory() && entryState.isDirectory()) {
        if (!knownDirectories.has(relativePath)) {
          throw installationError("RECOVERY_REQUIRED", `Transaction contains an unknown directory: ${absolute}`);
        }
        assertCanonicalRealPath(absolute, "transaction directory", "RECOVERY_REQUIRED", directory);
        visit(absolute, relativePath);
      } else if (entry.isFile() && entryState.isFile()) {
        const expectedHash = expected.get(relativePath);
        if (!expectedHash) {
          throw installationError("RECOVERY_REQUIRED", `Transaction contains an unknown file: ${absolute}`);
        }
        if (
          hashFile(absolute, {
            label: "transaction file",
            errorCode: "RECOVERY_REQUIRED",
            trustedRoot: directory,
            relativePath,
          }) !== expectedHash
        ) {
          throw installationError("RECOVERY_REQUIRED", `Transaction file changed unexpectedly: ${absolute}`);
        }
      } else {
        throw installationError("RECOVERY_REQUIRED", `Transaction contains an unsupported entry: ${absolute}`);
      }
    }
  }
  visit(directory);
  return directory;
}

function removeReservedDirectory(location, transaction, kind) {
  const directory = validateReservedDirectory(location, transaction, kind);
  const state = pathState(directory);
  if (!state) {
    return;
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    throw installationError("RECOVERY_REQUIRED", `Transaction directory became unsafe: ${directory}`);
  }
  assertCanonicalRealPath(directory, "transaction directory", "RECOVERY_REQUIRED", location.skillsRoot);
  rmSync(directory, { recursive: true, force: true });
  if (pathState(directory)) {
    throw installationError("RECOVERY_REQUIRED", `Transaction directory remained after cleanup: ${directory}`);
  }
}

function removeKnownFile(filePath, expectedHash, label, { trustedRoot, relativePath } = {}) {
  const state = pathState(filePath);
  if (!state) {
    return;
  }
  if (state.isSymbolicLink() || !state.isFile()) {
    throw installationError("RECOVERY_REQUIRED", `Cannot recover through unsafe ${label}: ${filePath}`);
  }
  if (
    hashFile(filePath, {
      label,
      errorCode: "RECOVERY_REQUIRED",
      trustedRoot,
      relativePath,
    }) !== expectedHash
  ) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Cannot remove concurrently modified ${label} during recovery: ${filePath}`,
    );
  }
  unlinkSync(filePath);
  if (pathState(filePath)) {
    throw installationError("RECOVERY_REQUIRED", `${label} remained after cleanup: ${filePath}`);
  }
}

function pruneManagedDirectories(location, filePaths, { errorCode = "FILESYSTEM_ERROR" } = {}) {
  const directories = [...knownManagedDirectories(filePaths)]
    .sort((left, right) => right.split("/").length - left.split("/").length || right.localeCompare(left));
  for (const relativeDirectory of directories) {
    const directory = resolveManagedPath(location.skillsRoot, relativeDirectory);
    const state = pathState(directory);
    if (!state) {
      continue;
    }
    if (state.isSymbolicLink() || !state.isDirectory()) {
      throw installationError(errorCode, `Managed directory became unsafe before pruning: ${directory}`);
    }
    assertCanonicalRealPath(directory, "managed directory", errorCode, location.skillsRoot);
    try {
      rmdirSync(directory);
    } catch (error) {
      if (!["ENOTEMPTY", "ENOENT", "EEXIST"].includes(error.code)) {
        throw error;
      }
    }
  }
}

function parseMetadataBuffer(buffer, filePath, expectedScope) {
  let metadata;
  try {
    metadata = JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Transaction ownership metadata is malformed at ${filePath}: ${error.message}`,
      error,
    );
  }
  const errors = validateInstallMetadata(metadata, { expectedScope });
  if (errors.length > 0) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Transaction ownership metadata is invalid at ${filePath}: ${errors.join("; ")}`,
    );
  }
  return metadata;
}

function findMetadataProof(candidates, expectedHash, scope, label) {
  const matches = [];
  for (const candidate of candidates) {
    if (!pathState(candidate.filePath)) {
      continue;
    }
    const buffer = readRegularFile(candidate.filePath, {
      label,
      errorCode: "RECOVERY_REQUIRED",
      trustedRoot: candidate.trustedRoot,
      relativePath: candidate.relativePath,
    });
    if (hashBuffer(buffer) === expectedHash) {
      matches.push({
        ...candidate,
        metadata: parseMetadataBuffer(buffer, candidate.filePath, scope),
      });
    }
  }
  if (matches.length !== 1) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Cannot prove exactly one ${label} snapshot for the interrupted transaction`,
    );
  }
  return matches[0];
}

function assertMetadataInventory(metadata, entries, label, { exact }) {
  const metadataByPath = new Map(metadata.files.map((entry) => [entry.path, entry.sha256]));
  for (const entry of entries) {
    const ownedHash = entry.ownedSha256 ?? entry.sha256;
    if (metadataByPath.get(entry.path) !== ownedHash) {
      throw installationError(
        "RECOVERY_REQUIRED",
        `${label} does not prove ownership of ${entry.path}`,
      );
    }
  }
  if (exact && metadata.files.length !== entries.length) {
    throw installationError("RECOVERY_REQUIRED", `${label} inventory does not match the transaction`);
  }
}

function assertTransactionOwnershipProof(location, transaction) {
  const stageRoot = reservedDirectoryPath(location, transaction.stageDirectory, stagePrefix);
  const backupRoot = reservedDirectoryPath(location, transaction.backupDirectory, backupPrefix);
  let oldProof;
  let newProof;
  if (transaction.hadOldMetadata) {
    oldProof = findMetadataProof(
      [
        {
          filePath: location.metadataPath,
          trustedRoot: location.skillsRoot,
          relativePath: INSTALL_METADATA_NAME,
        },
        {
          filePath: path.join(backupRoot, INSTALL_METADATA_NAME),
          trustedRoot: backupRoot,
          relativePath: INSTALL_METADATA_NAME,
        },
      ],
      transaction.oldMetadataHash,
      location.scope,
      "old installation metadata",
    );
    assertMetadataInventory(oldProof.metadata, transaction.oldFiles, "old installation metadata", {
      exact: transaction.operation === "update",
    });
  }
  if (transaction.newMetadataHash) {
    newProof = findMetadataProof(
      [
        {
          filePath: path.join(stageRoot, INSTALL_METADATA_NAME),
          trustedRoot: stageRoot,
          relativePath: INSTALL_METADATA_NAME,
        },
        {
          filePath: location.metadataPath,
          trustedRoot: location.skillsRoot,
          relativePath: INSTALL_METADATA_NAME,
        },
      ],
      transaction.newMetadataHash,
      location.scope,
      "new installation metadata",
    );
    assertMetadataInventory(newProof.metadata, transaction.newFiles, "new installation metadata", {
      exact: true,
    });
  }
  return { oldProof, newProof };
}

function assertCommittedTransactionState(location, transaction) {
  const proofs = assertTransactionOwnershipProof(location, transaction);
  if (transaction.newMetadataHash) {
    if (normalizedComparable(proofs.newProof.filePath) !== normalizedComparable(location.metadataPath)) {
      throw installationError("RECOVERY_REQUIRED", "Commit-complete state did not publish installation metadata");
    }
    for (const entry of transaction.newFiles) {
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      if (
        hashFile(target, {
          label: "published managed file",
          errorCode: "RECOVERY_REQUIRED",
          trustedRoot: location.skillsRoot,
          relativePath: entry.path,
        }) !== entry.sha256
      ) {
        throw installationError("RECOVERY_REQUIRED", `Published managed file changed: ${target}`);
      }
    }
  } else {
    if (pathState(location.metadataPath)) {
      throw installationError("RECOVERY_REQUIRED", `Uninstall metadata unexpectedly remains: ${location.metadataPath}`);
    }
    for (const entry of proofs.oldProof.metadata.files) {
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      assertSafeManagedParents(location.skillsRoot, entry.path, { errorCode: "RECOVERY_REQUIRED" });
      if (pathState(target)) {
        throw installationError(
          "RECOVERY_REQUIRED",
          `A path appeared after committed uninstall and was preserved: ${target}`,
        );
      }
    }
  }
}

function cleanupPublishedTransaction(location, transaction, journalHash) {
  validateReservedDirectory(location, transaction, "stage");
  validateReservedDirectory(location, transaction, "backup");
  assertCommittedTransactionState(location, transaction);
  removeReservedDirectory(location, transaction, "stage");
  removeReservedDirectory(location, transaction, "backup");
  removeKnownFile(location.transactionPath, journalHash, "transaction journal", {
    trustedRoot: location.skillsRoot,
    relativePath: TRANSACTION_NAME,
  });
  removeKnownFile(
    location.transactionCompletePath,
    hashBuffer(Buffer.from(commitCompleteText, "utf8")),
    "transaction completion marker",
    { trustedRoot: location.skillsRoot, relativePath: TRANSACTION_COMPLETE_NAME },
  );
}

function isProcessAlive(processId) {
  if (processId === process.pid) {
    return true;
  }
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

function rollbackPublishedTransaction(location, transaction, journalHash) {
  const stageRoot = validateReservedDirectory(location, transaction, "stage");
  const backupRoot = validateReservedDirectory(location, transaction, "backup");
  const commitStartedPath = path.join(backupRoot, commitStartedName);
  const commitStarted = Boolean(pathState(commitStartedPath));
  const oldByPath = new Map(transaction.oldFiles.map((entry) => [entry.path, entry]));

  if (commitStarted) {
    if (
      hashFile(commitStartedPath, {
        label: "commit-started marker",
        errorCode: "RECOVERY_REQUIRED",
        trustedRoot: backupRoot,
        relativePath: commitStartedName,
      }) !== hashBuffer(Buffer.from(commitStartedText, "utf8"))
    ) {
      throw installationError("RECOVERY_REQUIRED", `Commit-started marker changed: ${commitStartedPath}`);
    }
    assertTransactionOwnershipProof(location, transaction);
    for (const entry of transaction.newFiles) {
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      const backup = resolveManagedPath(backupRoot, entry.path);
      if (pathState(backup)) {
        removeKnownFile(target, entry.sha256, "new managed file", {
          trustedRoot: location.skillsRoot,
          relativePath: entry.path,
        });
      } else if (!oldByPath.has(entry.path)) {
        removeKnownFile(target, entry.sha256, "new managed file", {
          trustedRoot: location.skillsRoot,
          relativePath: entry.path,
        });
      }
    }

    for (const entry of transaction.oldFiles) {
      const backup = resolveManagedPath(backupRoot, entry.path);
      const backupState = pathState(backup);
      if (!backupState) {
        continue;
      }
      if (backupState.isSymbolicLink() || !backupState.isFile()) {
        throw installationError("RECOVERY_REQUIRED", `Backup file is unsafe: ${backup}`);
      }
      if (
        hashFile(backup, {
          label: "backup managed file",
          errorCode: "RECOVERY_REQUIRED",
          trustedRoot: backupRoot,
          relativePath: entry.path,
        }) !== entry.sha256
      ) {
        throw installationError("RECOVERY_REQUIRED", `Backup managed file changed: ${backup}`);
      }
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      if (pathState(target)) {
        throw installationError("RECOVERY_REQUIRED", `Cannot restore managed file over unexpected path: ${target}`);
      }
      assertSafeManagedParents(location.skillsRoot, entry.path, {
        create: true,
        errorCode: "RECOVERY_REQUIRED",
      });
      renameSync(backup, target);
      if (
        hashFile(target, {
          label: "restored managed file",
          errorCode: "RECOVERY_REQUIRED",
          trustedRoot: location.skillsRoot,
          relativePath: entry.path,
        }) !== entry.sha256
      ) {
        throw installationError("RECOVERY_REQUIRED", `Restored managed file changed: ${target}`);
      }
    }

    const backupMetadata = path.join(backupRoot, INSTALL_METADATA_NAME);
    if (transaction.hadOldMetadata && pathState(backupMetadata)?.isFile()) {
      if (pathState(location.metadataPath)) {
        removeKnownFile(location.metadataPath, transaction.newMetadataHash, "new installation metadata", {
          trustedRoot: location.skillsRoot,
          relativePath: INSTALL_METADATA_NAME,
        });
      }
      if (
        hashFile(backupMetadata, {
          label: "backup installation metadata",
          errorCode: "RECOVERY_REQUIRED",
          trustedRoot: backupRoot,
          relativePath: INSTALL_METADATA_NAME,
        }) !== transaction.oldMetadataHash
      ) {
        throw installationError("RECOVERY_REQUIRED", `Backup metadata changed: ${backupMetadata}`);
      }
      renameSync(backupMetadata, location.metadataPath);
    } else if (!transaction.hadOldMetadata && transaction.newMetadataHash && pathState(location.metadataPath)) {
      removeKnownFile(location.metadataPath, transaction.newMetadataHash, "new installation metadata", {
        trustedRoot: location.skillsRoot,
        relativePath: INSTALL_METADATA_NAME,
      });
    }
    pruneManagedDirectories(
      location,
      [...transaction.oldFiles, ...transaction.newFiles].map((entry) => entry.path),
      { errorCode: "RECOVERY_REQUIRED" },
    );
  }

  removeReservedDirectory(location, transaction, "stage");
  removeReservedDirectory(location, transaction, "backup");
  if (pathState(location.transactionCompletePath)) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Unexpected completion marker prevented rollback: ${location.transactionCompletePath}`,
    );
  }
  removeKnownFile(location.transactionPath, journalHash, "transaction journal", {
    trustedRoot: location.skillsRoot,
    relativePath: TRANSACTION_NAME,
  });
  return Object.freeze({ recovered: true, action: commitStarted ? "rolled-back" : "discarded-stage" });
}

export function recoverInterruptedInstallation(location) {
  assertLocationLayout(location, "RECOVERY_REQUIRED");
  if (!assertScopeDirectoryChain(location, { errorCode: "RECOVERY_REQUIRED" })) {
    return Object.freeze({ recovered: false, action: "none" });
  }
  const identityCollisions = listManagedRootIdentityCollisions(location.skillsRoot);
  if (identityCollisions.length > 0) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Skills root contains case-colliding managed paths: ${identityCollisions.join(", ")}`,
    );
  }

  const transactionState = pathState(location.transactionPath);
  if (!transactionState) {
    const completeState = pathState(location.transactionCompletePath);
    const leftovers = listReservedArtifacts(location.skillsRoot).filter(
      (name) =>
        portablePathIdentity(name).startsWith(portablePathIdentity(stagePrefix)) ||
        portablePathIdentity(name).startsWith(portablePathIdentity(backupPrefix)),
    );
    if (leftovers.length > 0) {
      throw installationError(
        "RECOVERY_REQUIRED",
        `Orphaned kyw-dev transaction paths require manual inspection: ${leftovers.join(", ")}`,
      );
    }
    if (completeState) {
      removeKnownFile(
        location.transactionCompletePath,
        hashBuffer(Buffer.from(commitCompleteText, "utf8")),
        "orphaned transaction completion marker",
        { trustedRoot: location.skillsRoot, relativePath: TRANSACTION_COMPLETE_NAME },
      );
    }
    return Object.freeze({ recovered: false, action: "none" });
  }
  if (transactionState.isSymbolicLink() || !transactionState.isFile()) {
    throw installationError("RECOVERY_REQUIRED", `Transaction journal is unsafe: ${location.transactionPath}`);
  }
  let transaction;
  let journalHash;
  try {
    const journalBuffer = readRegularFile(location.transactionPath, {
      label: "transaction journal",
      errorCode: "RECOVERY_REQUIRED",
      trustedRoot: location.skillsRoot,
      relativePath: TRANSACTION_NAME,
    });
    journalHash = hashBuffer(journalBuffer);
    transaction = validateTransaction(JSON.parse(journalBuffer.toString("utf8")), location);
  } catch (error) {
    if (error instanceof SkillInstallationError) {
      throw error;
    }
    throw installationError(
      "RECOVERY_REQUIRED",
      `Transaction journal is malformed at ${location.transactionPath}: ${error.message}`,
      error,
    );
  }

  const allowedReservedArtifacts = new Set([
    TRANSACTION_NAME,
    TRANSACTION_COMPLETE_NAME,
    transaction.stageDirectory,
    transaction.backupDirectory,
  ]);
  const unexpectedReservedArtifacts = listReservedArtifacts(location.skillsRoot).filter(
    (name) => !allowedReservedArtifacts.has(name),
  );
  if (unexpectedReservedArtifacts.length > 0) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Transaction has unrelated reserved paths requiring inspection: ${unexpectedReservedArtifacts.join(", ")}`,
    );
  }

  if (transaction.processId !== process.pid && isProcessAlive(transaction.processId)) {
    throw installationError(
      "INSTALL_CONFLICT",
      `Another kyw-dev ${transaction.operation} process (${transaction.processId}) owns ${location.transactionPath}`,
    );
  }

  const completeState = pathState(location.transactionCompletePath);
  if (completeState) {
    if (completeState.isSymbolicLink() || !completeState.isFile()) {
      throw installationError(
        "RECOVERY_REQUIRED",
        `Transaction completion marker is unsafe: ${location.transactionCompletePath}`,
      );
    }
    if (
      hashFile(location.transactionCompletePath, {
        label: "transaction completion marker",
        errorCode: "RECOVERY_REQUIRED",
        trustedRoot: location.skillsRoot,
        relativePath: TRANSACTION_COMPLETE_NAME,
      }) !== hashBuffer(Buffer.from(commitCompleteText, "utf8"))
    ) {
      throw installationError(
        "RECOVERY_REQUIRED",
        `Transaction completion marker changed: ${location.transactionCompletePath}`,
      );
    }
    cleanupPublishedTransaction(location, transaction, journalHash);
    return Object.freeze({ recovered: true, action: "completed-cleanup" });
  }
  return rollbackPublishedTransaction(location, transaction, journalHash);
}

function writeTransactionJournal(location, transaction) {
  const journalText = serializeJson(transaction);
  const journalHash = hashBuffer(Buffer.from(journalText, "utf8"));
  assertScopeDirectoryChain(location, { requireSkills: true });
  try {
    writeFileSync(location.transactionPath, journalText, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error.code === "EEXIST") {
      throw installationError(
        "INSTALL_CONFLICT",
        `Another kyw-dev operation or unrecovered transaction owns ${location.transactionPath}`,
        error,
      );
    }
    throw error;
  }
  if (
    hashFile(location.transactionPath, {
      label: "transaction journal",
      trustedRoot: location.skillsRoot,
      relativePath: TRANSACTION_NAME,
    }) !== journalHash
  ) {
    throw installationError("FILESYSTEM_ERROR", `Transaction journal write was not stable: ${location.transactionPath}`);
  }
  return journalHash;
}

function stageTransactionFiles(stageRoot, newFiles, metadataText, newMetadataHash) {
  for (const entry of newFiles) {
    const staged = resolveManagedPath(stageRoot, entry.path);
    assertSafeManagedParents(stageRoot, entry.path, { create: true });
    if (
      hashFile(entry.sourcePath, {
        label: "packaged source file",
        errorCode: "INVALID_PACKAGE",
        trustedRoot: entry.sourceRoot,
        relativePath: entry.sourceRelativePath,
      }) !== entry.sha256
    ) {
      throw installationError("INVALID_PACKAGE", `Packaged source changed before staging: ${entry.sourcePath}`);
    }
    if (pathState(staged)) {
      throw installationError("FILESYSTEM_ERROR", `Staged path already exists: ${staged}`);
    }
    copyFileSync(entry.sourcePath, staged);
    const stagedState = pathState(staged);
    if (!stagedState?.isFile() || stagedState.isSymbolicLink()) {
      throw installationError("FILESYSTEM_ERROR", `Staged path is not a regular file: ${staged}`);
    }
    try {
      chmodSync(staged, entry.mode);
    } catch (error) {
      if (error.code !== "EPERM") {
        throw error;
      }
    }
    if (
      hashFile(entry.sourcePath, {
        label: "packaged source file",
        errorCode: "INVALID_PACKAGE",
        trustedRoot: entry.sourceRoot,
        relativePath: entry.sourceRelativePath,
      }) !== entry.sha256
    ) {
      throw installationError("INVALID_PACKAGE", `Packaged source changed during staging: ${entry.sourcePath}`);
    }
    if (
      hashFile(staged, {
        label: "staged managed file",
        trustedRoot: stageRoot,
        relativePath: entry.path,
      }) !== entry.sha256
    ) {
      throw installationError("FILESYSTEM_ERROR", `Staged file hash mismatch: ${entry.path}`);
    }
  }
  if (metadataText !== undefined) {
    const stagedMetadata = path.join(stageRoot, INSTALL_METADATA_NAME);
    writeFileSync(stagedMetadata, metadataText, { encoding: "utf8", flag: "wx" });
    if (
      hashFile(stagedMetadata, {
        label: "staged installation metadata",
        trustedRoot: stageRoot,
        relativePath: INSTALL_METADATA_NAME,
      }) !== newMetadataHash
    ) {
      throw installationError("FILESYSTEM_ERROR", `Staged metadata hash mismatch: ${stagedMetadata}`);
    }
  }
}

function assertCurrentTransactionInputs(location, transaction) {
  assertScopeDirectoryChain(location, { requireSkills: true });
  const rootCollisions = listManagedRootIdentityCollisions(location.skillsRoot);
  if (rootCollisions.length > 0) {
    throw installationError(
      "INSTALL_CONFLICT",
      `Managed root gained case-colliding paths: ${rootCollisions.join(", ")}`,
    );
  }
  if (transaction.operation === "install") {
    if (pathState(location.metadataPath) || directManagedContainers(location).length > 0) {
      throw installationError("INSTALL_CONFLICT", "Managed installation paths appeared before commit");
    }
  } else {
    const metadata = readInstallMetadata(location, { required: true });
    const state = inspectManagedInstallation(location, metadata);
    const conflicts = [];
    if (!transaction.force && state.missing.length > 0) {
      conflicts.push(`missing managed files: ${state.missing.join(", ")}`);
    }
    if (!transaction.force && state.modified.length > 0) {
      conflicts.push(`modified managed files: ${state.modified.join(", ")}`);
    }
    if (!transaction.force && state.unknown.length > 0) {
      conflicts.push(`unknown files or directories: ${state.unknown.join(", ")}`);
    }
    if (state.unsafe.length > 0) {
      conflicts.push(`unsafe filesystem entries: ${state.unsafe.join(", ")}`);
    }
    if (conflicts.length > 0) {
      throw installationError(
        "INSTALL_CONFLICT",
        `Managed state changed before commit: ${conflicts.join("; ")}`,
      );
    }
    const transactionByPath = new Map(transaction.oldFiles.map((entry) => [entry.path, entry]));
    for (const metadataEntry of metadata.files) {
      const actualHash = state.existingFiles.get(metadataEntry.path);
      if (actualHash === undefined) {
        continue;
      }
      const transactionEntry = transactionByPath.get(metadataEntry.path);
      if (
        !transactionEntry ||
        transactionEntry.sha256 !== actualHash ||
        (transactionEntry.ownedSha256 ?? transactionEntry.sha256) !== metadataEntry.sha256
      ) {
        throw installationError(
          "INSTALL_CONFLICT",
          `Managed ownership changed before commit: ${metadataEntry.path}`,
        );
      }
    }
  }
  for (const entry of transaction.oldFiles) {
    const target = resolveManagedPath(location.skillsRoot, entry.path);
    if (
      hashFile(target, {
        label: "managed file",
        errorCode: "INSTALL_CONFLICT",
        trustedRoot: location.skillsRoot,
        relativePath: entry.path,
      }) !== entry.sha256
    ) {
      throw installationError("INSTALL_CONFLICT", `Managed file changed before commit: ${target}`);
    }
  }
  const oldPaths = new Set(transaction.oldFiles.map((entry) => entry.path));
  for (const entry of transaction.newFiles) {
    if (oldPaths.has(entry.path)) {
      continue;
    }
    const target = resolveManagedPath(location.skillsRoot, entry.path);
    assertSafeManagedParents(location.skillsRoot, entry.path, { errorCode: "INSTALL_CONFLICT" });
    if (pathState(target)) {
      throw installationError("INSTALL_CONFLICT", `Unmanaged path appeared before commit: ${target}`);
    }
  }
  const metadataState = pathState(location.metadataPath);
  if (transaction.hadOldMetadata) {
    if (
      !metadataState?.isFile() ||
      metadataState.isSymbolicLink() ||
      hashFile(location.metadataPath, {
        label: "installation metadata",
        errorCode: "INSTALL_CONFLICT",
        trustedRoot: location.skillsRoot,
        relativePath: INSTALL_METADATA_NAME,
      }) !== transaction.oldMetadataHash
    ) {
      throw installationError("INSTALL_CONFLICT", `Installation metadata changed before commit: ${location.metadataPath}`);
    }
  } else if (metadataState) {
    throw installationError("INSTALL_CONFLICT", `Installation metadata appeared before commit: ${location.metadataPath}`);
  }
}

function commitManagedTransaction({
  operation,
  location,
  oldFiles,
  newFiles,
  oldMetadataHash,
  metadataText,
  force = false,
  hooks = {},
}) {
  const id = randomUUID();
  const stageDirectory = `${stagePrefix}${id}`;
  const backupDirectory = `${backupPrefix}${id}`;
  const stageRoot = path.join(location.skillsRoot, stageDirectory);
  const backupRoot = path.join(location.skillsRoot, backupDirectory);
  const newMetadataHash = metadataText === undefined ? null : hashBuffer(Buffer.from(metadataText, "utf8"));
  const transaction = Object.freeze({
    schemaVersion: INSTALL_SCHEMA_VERSION,
    operation,
    scope: location.scope,
    processId: process.pid,
    force,
    stageDirectory,
    backupDirectory,
    oldFiles: Object.freeze(
      oldFiles.map(({ path: filePath, sha256, ownedSha256 }) =>
        Object.freeze({
          path: filePath,
          sha256,
          ...(ownedSha256 && ownedSha256 !== sha256 ? { ownedSha256 } : {}),
        }),
      ),
    ),
    newFiles: Object.freeze(newFiles.map(({ path: filePath, sha256 }) => Object.freeze({ path: filePath, sha256 }))),
    hadOldMetadata: oldMetadataHash !== null,
    oldMetadataHash,
    newMetadataHash,
  });

  const journalHash = writeTransactionJournal(location, transaction);
  try {
    if (pathState(stageRoot) || pathState(backupRoot)) {
      throw installationError("INSTALL_CONFLICT", "Reserved transaction directory appeared before staging");
    }
    mkdirSync(stageRoot);
    mkdirSync(backupRoot);
    assertRealDirectory(stageRoot, "Transaction stage directory", {
      trustedRoot: location.skillsRoot,
    });
    assertRealDirectory(backupRoot, "Transaction backup directory", {
      trustedRoot: location.skillsRoot,
    });
    hooks.afterJournalCreated?.({ operation, location, transaction });
    stageTransactionFiles(stageRoot, newFiles, metadataText, newMetadataHash);
    hooks.afterStagePrepared?.({ operation, location, transaction });

    assertCurrentTransactionInputs(location, transaction);
    assertRealDirectory(stageRoot, "Transaction stage directory", {
      trustedRoot: location.skillsRoot,
    });
    assertRealDirectory(backupRoot, "Transaction backup directory", {
      trustedRoot: location.skillsRoot,
    });
    const commitStartedPath = path.join(backupRoot, commitStartedName);
    writeFileSync(commitStartedPath, commitStartedText, { encoding: "utf8", flag: "wx" });
    if (
      hashFile(commitStartedPath, {
        label: "commit-started marker",
        trustedRoot: backupRoot,
        relativePath: commitStartedName,
      }) !== hashBuffer(Buffer.from(commitStartedText, "utf8"))
    ) {
      throw installationError("FILESYSTEM_ERROR", `Commit-started marker write was not stable: ${commitStartedPath}`);
    }
    hooks.afterCommitStarted?.({ operation, location, transaction });

    for (const [index, entry] of oldFiles.entries()) {
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      const backup = resolveManagedPath(backupRoot, entry.path);
      if (
        hashFile(target, {
          label: "managed file before backup",
          errorCode: "INSTALL_CONFLICT",
          trustedRoot: location.skillsRoot,
          relativePath: entry.path,
        }) !== entry.sha256
      ) {
        throw installationError("INSTALL_CONFLICT", `Managed file changed before rename: ${target}`);
      }
      assertSafeManagedParents(backupRoot, entry.path, { create: true });
      if (pathState(backup)) {
        throw installationError("INSTALL_CONFLICT", `Backup path appeared before rename: ${backup}`);
      }
      renameSync(target, backup);
      if (
        hashFile(backup, {
          label: "backed-up managed file",
          trustedRoot: backupRoot,
          relativePath: entry.path,
        }) !== entry.sha256
      ) {
        throw installationError("FILESYSTEM_ERROR", `Managed backup hash mismatch: ${backup}`);
      }
      hooks.afterOldFileMoved?.({ operation, location, transaction, entry, index });
    }
    for (const [index, entry] of newFiles.entries()) {
      const staged = resolveManagedPath(stageRoot, entry.path);
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      if (
        hashFile(staged, {
          label: "staged managed file",
          trustedRoot: stageRoot,
          relativePath: entry.path,
        }) !== entry.sha256
      ) {
        throw installationError("FILESYSTEM_ERROR", `Staged file changed before commit: ${staged}`);
      }
      assertSafeManagedParents(location.skillsRoot, entry.path, {
        create: true,
        errorCode: "INSTALL_CONFLICT",
      });
      if (pathState(target)) {
        throw installationError("INSTALL_CONFLICT", `Refusing to replace unexpected path: ${target}`);
      }
      renameSync(staged, target);
      if (
        hashFile(target, {
          label: "published managed file",
          trustedRoot: location.skillsRoot,
          relativePath: entry.path,
        }) !== entry.sha256
      ) {
        throw installationError("FILESYSTEM_ERROR", `Published file hash mismatch: ${target}`);
      }
      hooks.afterNewFileMoved?.({ operation, location, transaction, entry, index });
    }
    pruneManagedDirectories(
      location,
      [...oldFiles, ...newFiles].map((entry) => entry.path),
    );

    if (oldMetadataHash !== null) {
      assertRealDirectory(backupRoot, "Transaction backup directory", {
        trustedRoot: location.skillsRoot,
      });
      if (
        hashFile(location.metadataPath, {
          label: "installation metadata before backup",
          errorCode: "INSTALL_CONFLICT",
          trustedRoot: location.skillsRoot,
          relativePath: INSTALL_METADATA_NAME,
        }) !== oldMetadataHash
      ) {
        throw installationError("INSTALL_CONFLICT", `Installation metadata changed before rename: ${location.metadataPath}`);
      }
      const backupMetadata = path.join(backupRoot, INSTALL_METADATA_NAME);
      if (pathState(backupMetadata)) {
        throw installationError("INSTALL_CONFLICT", `Backup metadata path appeared before rename: ${backupMetadata}`);
      }
      renameSync(location.metadataPath, backupMetadata);
    }
    if (metadataText !== undefined) {
      const stagedMetadata = path.join(stageRoot, INSTALL_METADATA_NAME);
      if (
        hashFile(stagedMetadata, {
          label: "staged installation metadata",
          trustedRoot: stageRoot,
          relativePath: INSTALL_METADATA_NAME,
        }) !== newMetadataHash
      ) {
        throw installationError("FILESYSTEM_ERROR", `Staged metadata changed before commit: ${stagedMetadata}`);
      }
      if (pathState(location.metadataPath)) {
        throw installationError("INSTALL_CONFLICT", `Metadata path appeared before commit: ${location.metadataPath}`);
      }
      renameSync(stagedMetadata, location.metadataPath);
    }
    hooks.afterMetadataCommitted?.({ operation, location, transaction });

    validateReservedDirectory(location, transaction, "stage");
    validateReservedDirectory(location, transaction, "backup");
    assertCommittedTransactionState(location, transaction);
    writeFileSync(location.transactionCompletePath, commitCompleteText, { encoding: "utf8", flag: "wx" });
    if (
      hashFile(location.transactionCompletePath, {
        label: "transaction completion marker",
        trustedRoot: location.skillsRoot,
        relativePath: TRANSACTION_COMPLETE_NAME,
      }) !== hashBuffer(Buffer.from(commitCompleteText, "utf8"))
    ) {
      throw installationError(
        "FILESYSTEM_ERROR",
        `Transaction completion marker write was not stable: ${location.transactionCompletePath}`,
      );
    }
    hooks.afterCommitComplete?.({ operation, location, transaction });
    cleanupPublishedTransaction(location, transaction, journalHash);
  } catch (error) {
    try {
      recoverInterruptedInstallation(location);
    } catch (recoveryError) {
      throw installationError(
        "RECOVERY_REQUIRED",
        `${operation} failed and automatic recovery could not finish. Run kyw-dev doctor before retrying. ` +
          `Failure: ${error.message}. Recovery: ${recoveryError.message}`,
        recoveryError,
      );
    }
    if (error instanceof SkillInstallationError) {
      throw error;
    }
    throw installationError("FILESYSTEM_ERROR", `${operation} failed and was rolled back: ${error.message}`, error);
  }
}

function captureExistingManagedFiles(location, metadata, { allowModified = false, allowMissing = false, allowUnknown = false } = {}) {
  const state = inspectManagedInstallation(location, metadata);
  const conflicts = [];
  if (!allowMissing && state.missing.length > 0) {
    conflicts.push(`missing managed files: ${state.missing.join(", ")}`);
  }
  if (!allowModified && state.modified.length > 0) {
    conflicts.push(`modified managed files: ${state.modified.join(", ")}`);
  }
  if (!allowUnknown && state.unknown.length > 0) {
    conflicts.push(`unknown files or directories: ${state.unknown.join(", ")}`);
  }
  if (state.unsafe.length > 0) {
    conflicts.push(`unsafe filesystem entries: ${state.unsafe.join(", ")}`);
  }
  return {
    state,
    conflicts,
    oldFiles: metadata.files
      .filter((entry) => state.existingFiles.has(entry.path))
      .map((entry) => ({
        path: entry.path,
        sha256: state.existingFiles.get(entry.path),
        ownedSha256: entry.sha256,
      })),
  };
}

function withFilesystemBoundary(operation, callback) {
  try {
    return callback();
  } catch (error) {
    if (error instanceof SkillInstallationError) {
      throw error;
    }
    const code = error?.code === "EACCES" || error?.code === "EPERM" ? "PERMISSION_DENIED" : "FILESYSTEM_ERROR";
    throw installationError(code, `${operation} failed: ${error.message}`, error);
  }
}

function prepareMutation({ scope, cwd, home, sourceRoot }) {
  const location = resolveInstallLocation({ scope, cwd, home });
  const inventory = buildManagedSourceInventory({ sourceRoot });
  ensureScopeDirectories(location);
  const recovery = recoverInterruptedInstallation(location);
  return { location, inventory, recovery };
}

export function assertSupportedRuntime(version = process.versions.node) {
  const major = Number.parseInt(String(version).split(".")[0], 10);
  if (!Number.isInteger(major) || major < 22) {
    throw installationError(
      "UNSUPPORTED_RUNTIME",
      `Node.js 22 or newer is required; current runtime is ${version ?? "unknown"}`,
    );
  }
}

export function installManagedSkills({
  scope,
  cwd = process.cwd(),
  home = resolveUserHome(),
  sourceRoot = PACKAGE_ROOT,
  now,
  hooks,
  nodeVersion = process.versions.node,
} = {}) {
  return withFilesystemBoundary("install", () => {
    assertSupportedRuntime(nodeVersion);
    const { location, inventory, recovery } = prepareMutation({ scope, cwd, home, sourceRoot });
    if (pathState(location.metadataPath)) {
      throw installationError(
        "INSTALL_CONFLICT",
        `A kyw-dev installation already exists at ${location.metadataPath}; use update instead`,
      );
    }
    const existingContainers = directManagedContainers(location);
    if (existingContainers.length > 0) {
      throw installationError(
        "INSTALL_CONFLICT",
        `Refusing to overwrite unmanaged kyw-dev paths under ${location.skillsRoot}: ${existingContainers.join(", ")}`,
      );
    }
    const metadata = createInstallMetadata({ inventory, scope, now });
    commitManagedTransaction({
      operation: "install",
      location,
      oldFiles: [],
      newFiles: inventory.files,
      oldMetadataHash: null,
      metadataText: serializeJson(metadata),
      hooks,
    });
    return Object.freeze({
      operation: "install",
      scope,
      skillsRoot: location.skillsRoot,
      version: inventory.version,
      skillCount: MANAGED_SKILL_NAMES.length,
      fileCount: inventory.files.length,
      recovery,
    });
  });
}

export function updateManagedSkills({
  scope,
  cwd = process.cwd(),
  home = resolveUserHome(),
  sourceRoot = PACKAGE_ROOT,
  now,
  hooks,
  nodeVersion = process.versions.node,
} = {}) {
  return withFilesystemBoundary("update", () => {
    assertSupportedRuntime(nodeVersion);
    const { location, inventory, recovery } = prepareMutation({ scope, cwd, home, sourceRoot });
    const previousMetadata = readInstallMetadata(location, { required: true });
    const captured = captureExistingManagedFiles(location, previousMetadata);
    if (captured.conflicts.length > 0) {
      throw installationError(
        "UPDATE_CONFLICT",
        `Refusing to update locally changed or partial installation at ${location.skillsRoot}:\n- ${captured.conflicts.join("\n- ")}`,
      );
    }
    const metadata = createInstallMetadata({ inventory, scope, previousMetadata, now });
    commitManagedTransaction({
      operation: "update",
      location,
      oldFiles: captured.oldFiles,
      newFiles: inventory.files,
      oldMetadataHash: hashFile(location.metadataPath, {
        label: "installation metadata",
        errorCode: "INSTALL_CONFLICT",
        trustedRoot: location.skillsRoot,
        relativePath: INSTALL_METADATA_NAME,
      }),
      metadataText: serializeJson(metadata),
      hooks,
    });
    return Object.freeze({
      operation: "update",
      scope,
      skillsRoot: location.skillsRoot,
      previousVersion: previousMetadata.version,
      version: inventory.version,
      skillCount: MANAGED_SKILL_NAMES.length,
      fileCount: inventory.files.length,
      recovery,
    });
  });
}

export function uninstallManagedSkills({
  scope,
  cwd = process.cwd(),
  home = resolveUserHome(),
  force = false,
  nodeVersion = process.versions.node,
  hooks,
} = {}) {
  return withFilesystemBoundary("uninstall", () => {
    assertSupportedRuntime(nodeVersion);
    const location = resolveInstallLocation({ scope, cwd, home });
    if (!assertRealDirectory(location.skillsRoot, "Skills directory")) {
      throw installationError("INSTALL_NOT_FOUND", `No Skills directory exists at ${location.skillsRoot}`);
    }
    const recovery = recoverInterruptedInstallation(location);
    const metadata = readInstallMetadata(location, { required: true });
    const captured = captureExistingManagedFiles(location, metadata, {
      allowModified: force,
      allowMissing: force,
      allowUnknown: force,
    });
    if (captured.conflicts.length > 0) {
      throw installationError(
        "UNINSTALL_CONFLICT",
        `Refusing to uninstall changed or partial managed state at ${location.skillsRoot}:\n- ${captured.conflicts.join("\n- ")}\n` +
          "Review the paths and rerun uninstall with --force only if modified managed files may be removed; unknown files are preserved.",
      );
    }
    commitManagedTransaction({
      operation: "uninstall",
      location,
      oldFiles: captured.oldFiles,
      newFiles: [],
      oldMetadataHash: hashFile(location.metadataPath, {
        label: "installation metadata",
        errorCode: "INSTALL_CONFLICT",
        trustedRoot: location.skillsRoot,
        relativePath: INSTALL_METADATA_NAME,
      }),
      metadataText: undefined,
      force,
      hooks,
    });
    return Object.freeze({
      operation: "uninstall",
      scope,
      skillsRoot: location.skillsRoot,
      version: metadata.version,
      removedFileCount: captured.oldFiles.length,
      force,
      recovery,
    });
  });
}
