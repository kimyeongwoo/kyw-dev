import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { homedir } from "node:os";
import path, {
  basename,
  delimiter,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { performance } from "node:perf_hooks";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";

import {
  classifyProtectedState,
  resolveProtectedLocations,
  snapshotProtectedState,
} from "./release-gate-isolation.mjs";

export const HARNESS_ERROR_CODES = Object.freeze({
  ARGUMENT_ERROR: "ARGUMENT_ERROR",
  AUTHORIZATION_REQUIRED: "AUTHORIZATION_REQUIRED",
  CLEANUP_OWNERSHIP_MISMATCH: "CLEANUP_OWNERSHIP_MISMATCH",
  COMMAND_PLAN_INVALID: "COMMAND_PLAN_INVALID",
  DUPLICATE_INVOCATION: "DUPLICATE_INVOCATION",
  EVIDENCE_OUTPUT_UNSAFE: "EVIDENCE_OUTPUT_UNSAFE",
  EVIDENCE_ROOT_UNSAFE: "EVIDENCE_ROOT_UNSAFE",
  NPM_PROVENANCE_MISMATCH: "NPM_PROVENANCE_MISMATCH",
  POST_PROCESSING_FAILED: "POST_PROCESSING_FAILED",
  PROTECTED_STATE_CHANGED: "PROTECTED_STATE_CHANGED",
  CHILD_FAILED: "CHILD_FAILED",
});

export const RELEASE_COMMAND = Object.freeze(["npm", "run", "release:check"]);
export const RELEASE_INVOCATION_MAXIMUM = 1;
export const RELEASE_RETRY_MAXIMUM = 0;

const ownerFileName = ".release-evidence-owner.json";
const sealFileName = ".release-evidence-seal.json";
const summaryLimit = 8_192;
const summaryDocumentLimit = 262_144;
const streamCarryLimit = 512;
const streamLineLimit = 65_536;
const forbiddenLifecycleScripts = Object.freeze([
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepack",
  "postpack",
  "prepublish",
  "prepublishOnly",
  "publish",
  "postpublish",
]);
const credentialEnvironmentName =
  /(?:^|_)(?:api[_-]?key|auth|authorization|credential|password|passwd|secret|token)(?:_|$)/i;
const credentialPatterns = Object.freeze([
  {
    pattern:
      /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,})\b/g,
    replacement: "[REDACTED_CREDENTIAL]",
  },
  {
    pattern: /\b(?:authorization|proxy-authorization)\s*:\s*(?:bearer|basic)\s+\S+/gi,
    replacement: "authorization: [REDACTED_CREDENTIAL]",
  },
  {
    pattern:
      /(^|[\s/:])(?:_authToken|authToken|npmAuthToken|password|passwd)\s*[:=]\s*["']?[^<\s"']{8,}/gim,
    replacement: "$1[REDACTED_CREDENTIAL_ASSIGNMENT]",
  },
  {
    pattern:
      /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
]);

const nativeRealpath = realpathSync.native?.bind(realpathSync) ?? realpathSync;

export class ReleaseEvidenceHarnessError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ReleaseEvidenceHarnessError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new ReleaseEvidenceHarnessError(code, message, details);
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function sha256File(filePath) {
  return sha256(readFileSync(filePath));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeError(error) {
  return {
    code: String(error?.code ?? "UNKNOWN_ERROR").slice(0, 80),
    message: redactSecrets(String(error?.message ?? error)).slice(0, 500),
  };
}

function pathOptions(platform = process.platform) {
  return {
    pathApi: platform === "win32" ? path.win32 : path.posix,
    platform,
  };
}

export function stripWindowsExtendedPrefix(filePath) {
  if (/^\\\\\?\\UNC\\/i.test(filePath)) {
    return `\\\\${filePath.slice(8)}`;
  }
  if (/^\\\\\?\\/i.test(filePath)) {
    return filePath.slice(4);
  }
  return filePath;
}

export function normalizePathIdentity(filePath, options = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    fail(HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE, "Path identity requires a value");
  }
  const { pathApi, platform } = { ...pathOptions(options.platform), ...options };
  const withoutExtendedPrefix =
    platform === "win32" ? stripWindowsExtendedPrefix(filePath) : filePath;
  let normalized = pathApi.normalize(pathApi.resolve(withoutExtendedPrefix));
  const parsedRoot = pathApi.parse(normalized).root;
  while (normalized.length > parsedRoot.length && normalized.endsWith(pathApi.sep)) {
    normalized = normalized.slice(0, -1);
  }
  return platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function isSameOrDescendant(rootPath, candidatePath, options = {}) {
  const { pathApi } = { ...pathOptions(options.platform), ...options };
  const rootIdentity = normalizePathIdentity(rootPath, options);
  const candidateIdentity = normalizePathIdentity(candidatePath, options);
  return (
    candidateIdentity === rootIdentity ||
    candidateIdentity.startsWith(`${rootIdentity}${pathApi.sep}`)
  );
}

export function isStrictDescendant(rootPath, candidatePath, options = {}) {
  return (
    normalizePathIdentity(rootPath, options) !== normalizePathIdentity(candidatePath, options) &&
    isSameOrDescendant(rootPath, candidatePath, options)
  );
}

export function identitiesOverlap(leftPath, rightPath, options = {}) {
  return (
    isSameOrDescendant(leftPath, rightPath, options) ||
    isSameOrDescendant(rightPath, leftPath, options)
  );
}

function pathState(filePath) {
  try {
    return lstatSync(filePath, { bigint: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function statIdentity(stats) {
  return Object.freeze({
    birthtimeNs: String(stats.birthtimeNs),
    dev: String(stats.dev),
    ino: String(stats.ino),
  });
}

function sameStatIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.birthtimeNs === right.birthtimeNs;
}

function entryType(stats) {
  if (!stats) return "missing";
  if (stats.isSymbolicLink()) return "link";
  if (stats.isDirectory()) return "directory";
  if (stats.isFile()) return "file";
  return "unsupported";
}

function canonicalIdentity(filePath, options = {}) {
  const canonicalizeExisting = options.canonicalizeExisting ?? nativeRealpath;
  return normalizePathIdentity(canonicalizeExisting(filePath), options);
}

export function canonicalIdentitiesEqual(leftPath, rightPath, options = {}) {
  return canonicalIdentity(leftPath, options) === canonicalIdentity(rightPath, options);
}

function assertRealEntry(filePath, role, errorCode, { allowFile = false } = {}) {
  const state = pathState(filePath);
  const type = entryType(state);
  if (
    !state ||
    state.isSymbolicLink() ||
    (!state.isDirectory() && !(allowFile && state.isFile()))
  ) {
    fail(errorCode, `${role} must be an existing real ${allowFile ? "file or directory" : "directory"}`, {
      role,
      type,
    });
  }
  return state;
}

function nearestExistingAncestor(filePath, pathApi) {
  const missingSegments = [];
  let current = filePath;
  while (!pathState(current)) {
    const parent = pathApi.dirname(current);
    if (parent === current) {
      fail(
        HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
        "Evidence output has no existing ancestor",
      );
    }
    missingSegments.unshift(pathApi.basename(current));
    current = parent;
  }
  return { existingAncestor: current, missingSegments };
}

function assertAncestorChain({
  candidatePath,
  boundaryCanonical,
  errorCode,
  options,
  finalMayBeFile = false,
}) {
  const { pathApi } = { ...pathOptions(options.platform), ...options };
  let current = candidatePath;
  let first = true;
  while (true) {
    const state = assertRealEntry(current, "Evidence ancestor", errorCode, {
      allowFile: first && finalMayBeFile,
    });
    const currentCanonical = canonicalIdentity(current, options);
    if (currentCanonical === boundaryCanonical) {
      return { boundaryReachedAt: current, state };
    }
    if (!isStrictDescendant(boundaryCanonical, currentCanonical, options)) {
      fail(errorCode, "Evidence ancestor resolves outside its canonical boundary", {
        role: "ancestor",
      });
    }
    const parent = pathApi.dirname(current);
    if (parent === current) {
      fail(errorCode, "Evidence ancestor chain did not reach its canonical boundary");
    }
    current = parent;
    first = false;
  }
}

export function validateEvidenceRoot({
  evidenceRoot,
  allowedParent = dirname(resolve(evidenceRoot)),
  repositoryRoot,
  platform = process.platform,
  canonicalizeExisting = nativeRealpath,
} = {}) {
  const options = { ...pathOptions(platform), canonicalizeExisting };
  const { pathApi } = options;
  if (![evidenceRoot, allowedParent, repositoryRoot].every((value) => typeof value === "string")) {
    fail(
      HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
      "Evidence root validation requires root, allowed parent, and repository",
    );
  }
  const rootLexical = pathApi.resolve(evidenceRoot);
  const parentLexical = pathApi.resolve(allowedParent);
  const repositoryLexical = pathApi.resolve(repositoryRoot);
  const parentState = assertRealEntry(
    parentLexical,
    "Allowed evidence parent",
    HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
  );
  const rootState = assertRealEntry(
    rootLexical,
    "Evidence root",
    HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
  );
  assertRealEntry(
    repositoryLexical,
    "Repository root",
    HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
  );
  const parentCanonical = canonicalIdentity(parentLexical, options);
  const rootCanonical = canonicalIdentity(rootLexical, options);
  const repositoryCanonical = canonicalIdentity(repositoryLexical, options);

  if (!isStrictDescendant(parentCanonical, rootCanonical, options)) {
    fail(
      HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
      "Evidence root must be a canonical strict descendant of the allowed parent",
    );
  }
  assertAncestorChain({
    candidatePath: rootLexical,
    boundaryCanonical: parentCanonical,
    errorCode: HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
    options,
  });
  if (
    identitiesOverlap(rootLexical, repositoryLexical, options) ||
    identitiesOverlap(rootCanonical, repositoryCanonical, options)
  ) {
    fail(
      HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
      "Evidence root overlaps the repository",
    );
  }
  return Object.freeze({
    allowedParent: parentLexical,
    canonicalAllowedParent: parentCanonical,
    canonicalRepositoryRoot: repositoryCanonical,
    canonicalRoot: rootCanonical,
    canonicalizeExisting,
    lexicalRepositoryRoot: repositoryLexical,
    lexicalRoot: rootLexical,
    parentIdentity: statIdentity(parentState),
    platform,
    rootIdentity: statIdentity(rootState),
  });
}

export function validateEvidenceOutput(
  rootValidation,
  outputPath,
  { mustExist = false, allowDirectory = true, allowFile = true } = {},
) {
  if (!rootValidation?.canonicalRoot || typeof outputPath !== "string") {
    fail(
      HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
      "Evidence output validation requires a validated root and output path",
    );
  }
  const options = {
    ...pathOptions(rootValidation.platform),
    canonicalizeExisting: rootValidation.canonicalizeExisting,
  };
  const { pathApi } = options;
  const outputLexical = pathApi.resolve(outputPath);
  const { existingAncestor, missingSegments } = nearestExistingAncestor(outputLexical, pathApi);
  const existingState = pathState(outputLexical);

  if (mustExist && !existingState) {
    fail(HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE, "Evidence output does not exist");
  }
  if (
    existingState &&
    (existingState.isSymbolicLink() ||
      (!allowDirectory && existingState.isDirectory()) ||
      (!allowFile && existingState.isFile()) ||
      (!existingState.isDirectory() && !existingState.isFile()))
  ) {
    fail(HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE, "Evidence output has an unsafe type", {
      type: entryType(existingState),
    });
  }

  assertAncestorChain({
    candidatePath: existingAncestor,
    boundaryCanonical: rootValidation.canonicalRoot,
    errorCode: HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
    options,
    finalMayBeFile: existingAncestor === outputLexical,
  });

  const ancestorCanonical = canonicalIdentity(existingAncestor, options);
  const projectedCanonical = normalizePathIdentity(
    pathApi.join(ancestorCanonical, ...missingSegments),
    options,
  );
  const outputCanonical = existingState
    ? canonicalIdentity(outputLexical, options)
    : projectedCanonical;

  if (!isStrictDescendant(rootValidation.canonicalRoot, outputCanonical, options)) {
    fail(
      HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
      "Evidence output must be a canonical strict descendant of the evidence root",
    );
  }
  if (
    identitiesOverlap(outputLexical, rootValidation.lexicalRepositoryRoot, options) ||
    identitiesOverlap(outputCanonical, rootValidation.canonicalRepositoryRoot, options)
  ) {
    fail(
      HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
      "Evidence output overlaps the repository",
    );
  }

  return Object.freeze({
    canonicalOutput: outputCanonical,
    lexicalOutput: outputLexical,
    missingSegments: Object.freeze([...missingSegments]),
  });
}

function writeFileDurablyExclusive(filePath, contents, mode = 0o600) {
  const descriptor = openSync(filePath, "wx", mode);
  try {
    if (Buffer.isBuffer(contents)) {
      writeSync(descriptor, contents);
    } else {
      writeFileSync(descriptor, contents, "utf8");
    }
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function sanitizeString(value, limit = summaryLimit) {
  const redacted = redactSecrets(value);
  if (redacted.length <= limit) return redacted;
  const half = Math.floor((limit - 40) / 2);
  return `${redacted.slice(0, half)}\n[TRUNCATED ${redacted.length - half * 2} CHARS]\n${redacted.slice(-half)}`;
}

function sanitizeValue(value, depth = 0) {
  if (depth > 12) return "[TRUNCATED_DEPTH]";
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "bigint") return String(value);
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeValue(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 200)
        .map(([key, item]) => [key, sanitizeValue(item, depth + 1)]),
    );
  }
  return value;
}

export function redactSecrets(text) {
  let result = String(text);
  for (const { pattern, replacement } of credentialPatterns) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }
  return result;
}

function ownedPath(context, relativePath) {
  const outputPath = resolve(context.runRoot, ...relativePath.split("/"));
  validateEvidenceOutput(context.rootValidation, outputPath);
  return outputPath;
}

function ensureOwnedDirectory(context, relativePath) {
  const directoryPath = ownedPath(context, relativePath);
  if (!existsSync(directoryPath)) {
    mkdirSync(directoryPath);
  }
  validateEvidenceOutput(context.rootValidation, directoryPath, {
    allowDirectory: true,
    allowFile: false,
    mustExist: true,
  });
  return directoryPath;
}

function writeOwnedText(context, relativePath, contents) {
  const filePath = ownedPath(context, relativePath);
  ensureOwnedDirectory(context, relativePath.split("/").slice(0, -1).join("/") || ".");
  writeFileDurablyExclusive(filePath, contents);
  validateEvidenceOutput(context.rootValidation, filePath, {
    allowDirectory: false,
    allowFile: true,
    mustExist: true,
  });
  return filePath;
}

function writeOwnedJson(context, relativePath, value) {
  return writeOwnedText(context, relativePath, stableJson(sanitizeValue(value)));
}

export function atomicWriteSanitizedSummary(
  context,
  relativePath,
  value,
  { beforeRename } = {},
) {
  const targetPath = ownedPath(context, relativePath);
  if (existsSync(targetPath)) {
    fail(
      HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
      "Refusing to replace an existing evidence summary",
    );
  }
  const parentRelative = relativePath.split("/").slice(0, -1).join("/") || ".";
  ensureOwnedDirectory(context, parentRelative);
  const temporaryPath = `${targetPath}.tmp-${randomBytes(8).toString("hex")}`;
  validateEvidenceOutput(context.rootValidation, temporaryPath);
  const sanitizedValue = sanitizeValue(value);
  const completeDocument = stableJson(sanitizedValue);
  const completeBytes = Buffer.byteLength(completeDocument);
  const boundedDocument =
    completeBytes <= summaryDocumentLimit
      ? completeDocument
      : stableJson({
          originalSanitizedBytes: completeBytes,
          originalSanitizedSha256: sha256(completeDocument),
          retainedKeys:
            sanitizedValue && typeof sanitizedValue === "object"
              ? Object.keys(sanitizedValue).slice(0, 200)
              : [],
          status:
            sanitizedValue && typeof sanitizedValue.status === "string"
              ? sanitizedValue.status
              : "SUMMARY_TRUNCATED",
          summaryTruncated: true,
        });
  writeFileDurablyExclusive(temporaryPath, boundedDocument);
  validateEvidenceOutput(context.rootValidation, temporaryPath, {
    allowDirectory: false,
    allowFile: true,
    mustExist: true,
  });
  if (beforeRename) beforeRename({ targetPath, temporaryPath });
  renameSync(temporaryPath, targetPath);
  validateEvidenceOutput(context.rootValidation, targetPath, {
    allowDirectory: false,
    allowFile: true,
    mustExist: true,
  });
  return targetPath;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "");
}

export function createOwnedRun({
  evidenceRoot,
  allowedParent,
  repositoryRoot,
  mode = "run",
  canonicalizeExisting = nativeRealpath,
} = {}) {
  const rootValidation = validateEvidenceRoot({
    allowedParent,
    canonicalizeExisting,
    evidenceRoot,
    repositoryRoot,
  });
  const token = randomBytes(16).toString("hex");
  const runName = `release-evidence-${mode}-${timestampSlug()}-${token.slice(0, 12)}`;
  const runRoot = resolve(rootValidation.lexicalRoot, runName);
  validateEvidenceOutput(rootValidation, runRoot);
  mkdirSync(runRoot);
  const runValidation = validateEvidenceOutput(rootValidation, runRoot, {
    allowDirectory: true,
    allowFile: false,
    mustExist: true,
  });
  const rootState = statSync(runRoot, { bigint: true });
  const context = {
    mode,
    repositoryRoot: rootValidation.lexicalRepositoryRoot,
    rootValidation,
    runRoot,
    runValidation,
    token,
  };
  writeOwnedJson(context, ownerFileName, {
    schemaVersion: 1,
    mode,
    runName,
    rootIdentity: statIdentity(rootState),
    token,
  });
  return Object.freeze(context);
}

function collectOwnedInventory(runRoot, { excludeSeal = true } = {}) {
  const inventory = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const entryPath = join(directory, entry.name);
      const relativePath = relative(runRoot, entryPath).replaceAll("\\", "/");
      if (excludeSeal && relativePath === sealFileName) continue;
      const state = lstatSync(entryPath, { bigint: true });
      if (state.isSymbolicLink() || (!state.isDirectory() && !state.isFile())) {
        fail(
          HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
          "Owned run contains a link or unsupported entry",
          { relativePath, type: entryType(state) },
        );
      }
      if (state.isDirectory()) {
        inventory.push({ path: relativePath, type: "directory" });
        visit(entryPath);
      } else {
        inventory.push({
          bytes: Number(state.size),
          path: relativePath,
          sha256: sha256File(entryPath),
          type: "file",
        });
      }
    }
  }
  visit(runRoot);
  return inventory.sort((left, right) => left.path.localeCompare(right.path));
}

export function sealOwnedRun(context, preservationProof) {
  if (typeof preservationProof !== "string" || preservationProof.trim().length < 8) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "A concrete preservation proof is required before sealing cleanup ownership",
    );
  }
  if (existsSync(join(context.runRoot, sealFileName))) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Owned run is already sealed",
    );
  }
  const inventory = collectOwnedInventory(context.runRoot);
  writeOwnedJson(context, sealFileName, {
    inventory,
    preservationProof,
    sealedAt: new Date().toISOString(),
    token: context.token,
  });
  return Object.freeze({ entries: inventory.length, sealed: true });
}

export function cleanupOwnedRun({
  evidenceRoot,
  allowedParent,
  repositoryRoot,
  runRoot,
  token,
  canonicalizeExisting = nativeRealpath,
} = {}) {
  const rootValidation = validateEvidenceRoot({
    allowedParent,
    canonicalizeExisting,
    evidenceRoot,
    repositoryRoot,
  });
  validateEvidenceOutput(rootValidation, runRoot, {
    allowDirectory: true,
    allowFile: false,
    mustExist: true,
  });
  if (
    normalizePathIdentity(dirname(resolve(runRoot))) !==
      normalizePathIdentity(rootValidation.lexicalRoot) ||
    !basename(runRoot).startsWith("release-evidence-")
  ) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Cleanup target is not an exact harness-owned child",
    );
  }
  const ownerPath = join(runRoot, ownerFileName);
  const sealPath = join(runRoot, sealFileName);
  if (!existsSync(ownerPath) || !existsSync(sealPath)) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Cleanup requires owner and preservation seal evidence",
    );
  }
  const owner = JSON.parse(readFileSync(ownerPath, "utf8"));
  const seal = JSON.parse(readFileSync(sealPath, "utf8"));
  const currentIdentity = statIdentity(statSync(runRoot, { bigint: true }));
  if (
    owner.token !== token ||
    seal.token !== token ||
    !sameStatIdentity(owner.rootIdentity, currentIdentity)
  ) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Cleanup token or filesystem identity changed",
    );
  }
  const currentInventory = collectOwnedInventory(runRoot);
  if (JSON.stringify(currentInventory) !== JSON.stringify(seal.inventory)) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Cleanup inventory changed after preservation",
    );
  }
  rmSync(runRoot, { recursive: true, force: false });
  if (existsSync(runRoot)) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Owned cleanup root remains",
    );
  }
  return Object.freeze({ removed: true });
}

class RedactingCapture {
  constructor(filePath) {
    this.decoder = new StringDecoder("utf8");
    this.descriptor = openSync(filePath, "wx", 0o600);
    this.filePath = filePath;
    this.inPrivateKey = false;
    this.pending = "";
  }

  writeSanitized(text) {
    if (!text) return;
    let value = text;
    if (this.inPrivateKey) {
      const end = value.search(/-----END (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/);
      if (end === -1) return;
      const endLine = value.indexOf("\n", end);
      this.inPrivateKey = false;
      value = endLine === -1 ? "" : value.slice(endLine + 1);
    }
    const start = value.search(/-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/);
    if (start !== -1) {
      const before = value.slice(0, start);
      writeSync(this.descriptor, redactSecrets(before));
      writeSync(this.descriptor, "[REDACTED_PRIVATE_KEY]\n");
      this.inPrivateKey = true;
      this.writeSanitized(value.slice(start));
      return;
    }
    writeSync(this.descriptor, redactSecrets(value));
  }

  push(chunk) {
    this.pending += this.decoder.write(chunk);
    while (true) {
      const newline = this.pending.indexOf("\n");
      if (newline !== -1) {
        const line = this.pending.slice(0, newline + 1);
        this.pending = this.pending.slice(newline + 1);
        this.writeSanitized(line);
        continue;
      }
      if (this.pending.length > streamLineLimit) {
        const safeLength = this.pending.length - streamCarryLimit;
        const segment = this.pending.slice(0, safeLength);
        this.pending = this.pending.slice(safeLength);
        this.writeSanitized(segment);
        continue;
      }
      break;
    }
  }

  finish() {
    this.pending += this.decoder.end();
    this.writeSanitized(this.pending);
    this.pending = "";
    fsyncSync(this.descriptor);
    closeSync(this.descriptor);
  }
}

export function acquireInvocationGuard(context, name = "release") {
  const guardPath = ownedPath(context, `invocation-${name}.lock`);
  try {
    writeFileDurablyExclusive(
      guardPath,
      stableJson({
        invocationMaximum: RELEASE_INVOCATION_MAXIMUM,
        name,
        retryMaximum: RELEASE_RETRY_MAXIMUM,
        token: context.token,
      }),
    );
  } catch (error) {
    if (error.code === "EEXIST") {
      fail(
        HARNESS_ERROR_CODES.DUPLICATE_INVOCATION,
        `Invocation ${name} already exists and cannot be retried`,
      );
    }
    throw error;
  }
  validateEvidenceOutput(context.rootValidation, guardPath, {
    allowDirectory: false,
    allowFile: true,
    mustExist: true,
  });
  return guardPath;
}

function fileEvidence(filePath) {
  const lexicalState = lstatSync(filePath, { bigint: true });
  const canonicalPath = nativeRealpath(filePath);
  const canonicalState = statSync(canonicalPath, { bigint: true });
  return Object.freeze({
    canonicalPath,
    canonicalSha256: sha256File(canonicalPath),
    canonicalType: entryType(canonicalState),
    canonicalIdentity: statIdentity(canonicalState),
    launcherPath: resolve(filePath),
    launcherSha256: sha256File(filePath),
    launcherType: entryType(lexicalState),
  });
}

function pathEntries(environment = process.env) {
  const pathValue =
    Object.entries(environment).find(([name]) => name.toLowerCase() === "path")?.[1] ?? "";
  return String(pathValue)
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveNpmLauncher(requestedLauncher, environment = process.env) {
  const requested = requestedLauncher || (process.platform === "win32" ? "npm.cmd" : "npm");
  if (isAbsolute(requested)) {
    assertRealEntry(
      requested,
      "Requested npm launcher",
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      { allowFile: true },
    );
    return resolve(requested);
  }
  const names =
    process.platform === "win32" && !path.extname(requested)
      ? [`${requested}.cmd`, `${requested}.exe`, requested]
      : [requested];
  for (const directory of pathEntries(environment)) {
    for (const name of names) {
      const candidate = resolve(directory, name);
      const state = pathState(candidate);
      if (state?.isFile() || state?.isSymbolicLink()) {
        const canonicalState = pathState(nativeRealpath(candidate));
        if (canonicalState?.isFile()) return candidate;
      }
    }
  }
  fail(
    HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
    `Cannot resolve requested npm launcher ${requested}`,
  );
}

function runLauncherVersion(launcherPath, environment) {
  let result;
  if (process.platform === "win32") {
    if (/[\r\n"%!&|<>^]/.test(launcherPath)) {
      fail(
        HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
        "Requested npm launcher path cannot be represented safely for cmd.exe",
      );
    }
    result = spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", `""${launcherPath}" --version"`],
      {
        encoding: "utf8",
        env: environment,
        windowsVerbatimArguments: true,
        windowsHide: true,
      },
    );
  } else {
    result = spawnSync(launcherPath, ["--version"], {
      encoding: "utf8",
      env: environment,
      windowsHide: true,
    });
  }
  if (result.status !== 0) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      `Requested npm launcher version probe failed: ${safeError(result.error ?? result.stderr).message}`,
    );
  }
  return result.stdout.trim();
}

function runCliVersion(cliPath, environment) {
  const result = spawnSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8",
    env: environment,
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function candidateNpmCliPaths(launcherPath, requestedCli, environment) {
  const candidates = [];
  function add(candidate) {
    if (!candidate) return;
    const absolute = resolve(candidate);
    try {
      const canonical = nativeRealpath(absolute);
      if (!candidates.includes(canonical) && pathState(canonical)?.isFile()) {
        candidates.push(canonical);
      }
    } catch {
      // Missing and non-file candidates are ignored; the complete mismatch is reported below.
    }
  }
  if (requestedCli) {
    add(requestedCli);
    return candidates;
  }
  add(
    Object.entries(environment).find(([name]) => name.toLowerCase() === "npm_execpath")?.[1],
  );
  try {
    add(nativeRealpath(launcherPath));
  } catch {
    // The launcher itself can be a command shim rather than the npm CLI.
  }
  add(join(dirname(launcherPath), "node_modules", "npm", "bin", "npm-cli.js"));
  add(join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"));
  add(
    resolve(
      dirname(process.execPath),
      "..",
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  );
  const prefixScript = join(
    dirname(launcherPath),
    "node_modules",
    "npm",
    "bin",
    "npm-prefix.js",
  );
  if (pathState(prefixScript)?.isFile()) {
    const prefix = spawnSync(process.execPath, [prefixScript], {
      encoding: "utf8",
      env: environment,
      windowsHide: true,
    });
    if (prefix.status === 0 && prefix.stdout.trim()) {
      add(join(prefix.stdout.trim(), "node_modules", "npm", "bin", "npm-cli.js"));
    }
  }
  for (const directory of pathEntries(environment)) {
    add(join(directory, "node_modules", "npm", "bin", "npm-cli.js"));
  }
  return candidates;
}

function shellQuotePosix(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

function assertWindowsShimValue(value) {
  if (/[\r\n%!]/.test(value)) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      "Selected npm or Node path cannot be represented safely in a Windows shim",
    );
  }
}

function materializeNpmShim(context, npmCliPath) {
  const shimDirectory = ensureOwnedDirectory(context, "shim");
  const posixShim = join(shimDirectory, "npm");
  const windowsShim = join(shimDirectory, "npm.cmd");
  writeFileDurablyExclusive(
    posixShim,
    `#!/bin/sh\nexec ${shellQuotePosix(process.execPath)} ${shellQuotePosix(npmCliPath)} \"$@\"\n`,
    0o700,
  );
  chmodSync(posixShim, 0o700);
  assertWindowsShimValue(process.execPath);
  assertWindowsShimValue(npmCliPath);
  writeFileDurablyExclusive(
    windowsShim,
    `@ECHO OFF\r\n\"${process.execPath}\" \"${npmCliPath}\" %*\r\n`,
  );
  for (const shimPath of [posixShim, windowsShim]) {
    validateEvidenceOutput(context.rootValidation, shimPath, {
      allowDirectory: false,
      allowFile: true,
      mustExist: true,
    });
  }
  return Object.freeze({ shimDirectory, posixShim, windowsShim });
}

function setEnvironmentValue(environment, name, value) {
  for (const current of Object.keys(environment)) {
    if (current.toLowerCase() === name.toLowerCase()) delete environment[current];
  }
  environment[name] = value;
}

function safeChildEnvironment(context, npmCliPath, shimDirectory, inheritedEnvironment) {
  const environment = {};
  for (const [name, value] of Object.entries(inheritedEnvironment)) {
    if (
      typeof value === "string" &&
      !credentialEnvironmentName.test(name) &&
      !["npm_config_userconfig", "npm_config_globalconfig", "npm_config_cache"].includes(
        name.toLowerCase(),
      )
    ) {
      environment[name] = value;
    }
  }
  const configDirectory = ensureOwnedDirectory(context, "config");
  const cacheDirectory = ensureOwnedDirectory(context, "npm-cache");
  const userconfig = writeOwnedText(
    context,
    "config/userconfig",
    [
      `cache=${cacheDirectory.replaceAll("\\", "/")}`,
      "audit=false",
      "fund=false",
      "color=false",
      "update-notifier=false",
      "",
    ].join("\n"),
  );
  const globalconfig = writeOwnedText(context, "config/globalconfig", "\n");
  const originalPath = pathEntries(inheritedEnvironment);
  const precedence = [
    shimDirectory,
    dirname(process.execPath),
    ...originalPath.filter(
      (entry) =>
        normalizePathIdentity(entry) !== normalizePathIdentity(shimDirectory) &&
        normalizePathIdentity(entry) !== normalizePathIdentity(dirname(process.execPath)),
    ),
  ];
  setEnvironmentValue(environment, "PATH", precedence.join(delimiter));
  setEnvironmentValue(environment, "npm_execpath", npmCliPath);
  setEnvironmentValue(environment, "npm_config_userconfig", userconfig);
  setEnvironmentValue(environment, "npm_config_globalconfig", globalconfig);
  setEnvironmentValue(environment, "npm_config_cache", cacheDirectory);
  setEnvironmentValue(environment, "npm_config_audit", "false");
  setEnvironmentValue(environment, "npm_config_fund", "false");
  setEnvironmentValue(environment, "npm_config_color", "false");
  setEnvironmentValue(environment, "npm_config_update_notifier", "false");
  return Object.freeze({
    cacheDirectory,
    environment: Object.freeze(environment),
    globalconfig,
    pathPrecedence: Object.freeze(precedence),
    userconfig,
  });
}

function materializeProbe(context) {
  const probeDirectory = ensureOwnedDirectory(context, "probe");
  writeOwnedText(
    context,
    "probe/package.json",
    `${JSON.stringify(
      {
        name: "kyw-dev-release-evidence-probe",
        private: true,
        scripts: { probe: "node probe.mjs" },
        version: "0.0.0",
      },
      null,
      2,
    )}\n`,
  );
  writeOwnedText(
    context,
    "probe/probe.mjs",
    [
      'import { spawnSync } from "node:child_process";',
      "",
      'const nested = process.platform === "win32"',
      '  ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm --version"], {',
      '      encoding: "utf8",',
      "      env: process.env,",
      "      windowsHide: true,",
      "    })",
      '  : spawnSync("npm", ["--version"], {',
      '      encoding: "utf8",',
      "      env: process.env,",
      "      windowsHide: true,",
      "    });",
      "process.stdout.write(`${JSON.stringify({",
      "  nestedStatus: nested.status,",
      "  nestedVersion: nested.stdout?.trim(),",
      "  nodeExecPath: process.execPath,",
      "  nodeVersion: process.version,",
      "  npmConfigUserAgent: process.env.npm_config_user_agent,",
      "  npmExecPath: process.env.npm_execpath,",
      "  pathEntries: (process.env.PATH ?? process.env.Path ?? '').split(process.platform === 'win32' ? ';' : ':'),",
      "})}\\n`);",
      "",
    ].join("\n"),
  );
  return probeDirectory;
}

export function assertNpmProvenance(provenance) {
  const versions = [
    provenance.launcherReportedVersion,
    provenance.selectedCliVersion,
    provenance.effectiveCompositeNpmVersion,
  ];
  const probeResolutionMatches =
    typeof provenance.probeResolvedNpmLauncher === "string" &&
    typeof provenance.npmShimLauncher === "string" &&
    canonicalIdentitiesEqual(
      provenance.probeResolvedNpmLauncher,
      provenance.npmShimLauncher,
    );
  if (
    versions.some((value) => typeof value !== "string" || !value.trim()) ||
    new Set(versions).size !== 1 ||
    provenance.probeChildNpmExecPathIdentity !== provenance.selectedCliIdentity ||
    provenance.probeNodeIdentity !== provenance.nodeIdentity ||
    provenance.probeNodeVersion !== provenance.nodeVersion ||
    provenance.pathPrecedence?.[0] !== provenance.shimDirectory ||
    !probeResolutionMatches ||
    !String(provenance.probeNpmConfigUserAgent).startsWith(
      `npm/${provenance.selectedCliVersion} `,
    )
  ) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      "Requested launcher, child, nested, or effective npm provenance does not agree",
      {
        effectiveCompositeNpmVersion: provenance.effectiveCompositeNpmVersion,
        launcherReportedVersion: provenance.launcherReportedVersion,
        pathPrecedenceMatches:
          provenance.pathPrecedence?.[0] === provenance.shimDirectory &&
          probeResolutionMatches,
        probeChildNpmExecPathIdentity: provenance.probeChildNpmExecPathIdentity,
        probeNodeIdentity: provenance.probeNodeIdentity,
        probeResolvedNpmLauncher: provenance.probeResolvedNpmLauncher,
        probeUserAgentPrefix: String(provenance.probeNpmConfigUserAgent ?? "").split(" ").at(0),
        selectedCliIdentity: provenance.selectedCliIdentity,
        selectedCliVersion: provenance.selectedCliVersion,
        selectedNodeIdentity: provenance.nodeIdentity,
      },
    );
  }
  return true;
}

export function resolveNpmProvenance({
  context,
  requestedLauncher,
  requestedCli,
  inheritedEnvironment = process.env,
} = {}) {
  const launcherPath = resolveNpmLauncher(requestedLauncher, inheritedEnvironment);
  const launcherReportedVersion = runLauncherVersion(launcherPath, inheritedEnvironment);
  const candidates = candidateNpmCliPaths(launcherPath, requestedCli, inheritedEnvironment);
  const versions = candidates.map((candidate) => ({
    candidate,
    version: runCliVersion(candidate, inheritedEnvironment),
  }));
  const selected = versions.find(({ version }) => version === launcherReportedVersion);
  if (!selected) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      "No exact npm CLI candidate matches the requested launcher-reported version",
      {
        candidateVersions: versions,
        launcherReportedVersion,
      },
    );
  }
  const selectedCliPath = nativeRealpath(selected.candidate);
  const shim = materializeNpmShim(context, selectedCliPath);
  const child = safeChildEnvironment(
    context,
    selectedCliPath,
    shim.shimDirectory,
    inheritedEnvironment,
  );
  const probeDirectory = materializeProbe(context);
  const probeResult = spawnSync(
    process.execPath,
    [selectedCliPath, "run", "--silent", "probe"],
    {
      cwd: probeDirectory,
      encoding: "utf8",
      env: child.environment,
      windowsHide: true,
    },
  );
  if (probeResult.status !== 0) {
    writeOwnedJson(context, "probe/exit.json", {
      code: probeResult.status,
      signal: probeResult.signal,
      spawnError: probeResult.error ? safeError(probeResult.error) : undefined,
    });
    writeOwnedText(context, "probe/stdout.log", redactSecrets(probeResult.stdout ?? ""));
    writeOwnedText(context, "probe/stderr.log", redactSecrets(probeResult.stderr ?? ""));
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      `Harmless npm provenance probe failed: ${safeError(probeResult.error ?? probeResult.stderr).message}`,
    );
  }
  writeOwnedJson(context, "probe/exit.json", {
    code: probeResult.status,
    signal: probeResult.signal,
    spawnError: probeResult.error ? safeError(probeResult.error) : undefined,
  });
  writeOwnedText(context, "probe/stdout.log", redactSecrets(probeResult.stdout ?? ""));
  writeOwnedText(context, "probe/stderr.log", redactSecrets(probeResult.stderr ?? ""));
  let probe;
  try {
    const lines = probeResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    probe = JSON.parse(lines.at(-1));
  } catch (error) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      `Harmless npm provenance probe returned invalid evidence: ${safeError(error).message}`,
    );
  }
  if (
    !probe ||
    typeof probe.npmExecPath !== "string" ||
    typeof probe.nodeExecPath !== "string" ||
    !Array.isArray(probe.pathEntries)
  ) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      "Harmless npm provenance probe omitted child environment identity",
    );
  }
  const probeResolvedNpmLauncher = resolveNpmLauncher("npm", {
    PATH: probe.pathEntries.join(delimiter),
  });
  const launcherEvidence = fileEvidence(launcherPath);
  const cliEvidence = fileEvidence(selectedCliPath);
  const provenance = Object.freeze({
    effectiveCompositeNpmVersion: probe.nestedVersion,
    launcherFileIdentity: launcherEvidence,
    launcherReportedVersion,
    nodeExecutable: process.execPath,
    nodeIdentity: normalizePathIdentity(nativeRealpath(process.execPath)),
    nodeVersion: process.version,
    npmShimLauncher:
      process.platform === "win32" ? shim.windowsShim : shim.posixShim,
    pathPrecedence: child.pathPrecedence,
    probeChildNpmExecPath: probe.npmExecPath,
    probeChildNpmExecPathIdentity: normalizePathIdentity(nativeRealpath(probe.npmExecPath)),
    probeNodeExecutable: probe.nodeExecPath,
    probeNodeIdentity: normalizePathIdentity(nativeRealpath(probe.nodeExecPath)),
    probeNodeVersion: probe.nodeVersion,
    probeNpmConfigUserAgent: probe.npmConfigUserAgent,
    probePathPrecedence: Object.freeze(probe.pathEntries),
    probeResolvedNpmLauncher,
    probeResolvedNpmLauncherFileIdentity: fileEvidence(probeResolvedNpmLauncher),
    requestedLauncherPath: launcherPath,
    selectedCliFileIdentity: cliEvidence,
    selectedCliIdentity: normalizePathIdentity(selectedCliPath),
    selectedCliPath,
    selectedCliVersion: selected.version,
    shimDirectory: shim.shimDirectory,
  });
  assertNpmProvenance(provenance);
  return Object.freeze({
    childEnvironment: child.environment,
    provenance,
  });
}

function expandedReleaseScripts(packageJson) {
  const scripts = packageJson.scripts ?? {};
  const visited = new Set();
  const commands = [];
  function visit(name) {
    if (visited.has(name)) return;
    visited.add(name);
    const command = scripts[name];
    if (typeof command !== "string") {
      fail(
        HARNESS_ERROR_CODES.COMMAND_PLAN_INVALID,
        `Release command references missing npm script ${name}`,
      );
    }
    commands.push({ name, command });
    for (const match of command.matchAll(/\bnpm run ([A-Za-z0-9:_-]+)/g)) {
      visit(match[1]);
    }
  }
  visit("release:check");
  return commands;
}

export function buildReleaseCommandPlan(repositoryRoot) {
  const packagePath = resolve(repositoryRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  if (packageJson.scripts?.["release:check"] !== "npm run release:ci && npm publish --dry-run --json") {
    fail(
      HARNESS_ERROR_CODES.COMMAND_PLAN_INVALID,
      "release:check no longer matches the reviewed one-composite dry-run contract",
    );
  }
  if (packageJson.scripts?.["release:ci"] !== "npm run check && npm run release:candidate") {
    fail(
      HARNESS_ERROR_CODES.COMMAND_PLAN_INVALID,
      "release:ci no longer matches the reviewed Stable-plus-candidate contract",
    );
  }
  const expandedScripts = expandedReleaseScripts(packageJson);
  const invokedScriptLifecycleNames = expandedScripts.flatMap(({ name }) => [
    `pre${name}`,
    `post${name}`,
  ]);
  const lifecycleScripts = [
    ...new Set([...forbiddenLifecycleScripts, ...invokedScriptLifecycleNames]),
  ].filter((name) => name in (packageJson.scripts ?? {}));
  if (lifecycleScripts.length > 0) {
    fail(
      HARNESS_ERROR_CODES.COMMAND_PLAN_INVALID,
      `Unexpected npm lifecycle scripts: ${lifecycleScripts.join(", ")}`,
    );
  }
  const expandedText = expandedScripts.map(({ command }) => command).join("\n");
  const publishCommands = [...expandedText.matchAll(/\bnpm publish\b[^\n&|]*/g)].map(
    (match) => match[0],
  );
  const actualPublishCommands = publishCommands.filter(
    (command) => !/(?:^|\s)--dry-run(?:\s|$)/.test(command),
  );
  if (
    actualPublishCommands.length > 0 ||
    /\bnpm (?:login|logout|adduser|config\s+(?:set|delete))\b/i.test(expandedText) ||
    /\b(?:retry|while|until)\b|\|\|/.test(expandedText)
  ) {
    fail(
      HARNESS_ERROR_CODES.COMMAND_PLAN_INVALID,
      "Release script expansion contains an actual publish, config mutation, or retry path",
    );
  }
  return Object.freeze({
    actualPublishCommands: 0,
    childInvocationMaximum: RELEASE_INVOCATION_MAXIMUM,
    command: RELEASE_COMMAND.join(" "),
    dryRunInsideComposite: publishCommands.length === 1,
    expandedScripts: Object.freeze(expandedScripts),
    lifecycleScripts: Object.freeze([]),
    modelBackedCommands: 0,
    releaseIsolationInvocations: 0,
    retryMaximum: RELEASE_RETRY_MAXIMUM,
    standaloneDryRunInvocations: 0,
  });
}

function gitOutput(repositoryRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    windowsHide: true,
  });
  if (result.status !== 0) {
    fail(
      HARNESS_ERROR_CODES.COMMAND_PLAN_INVALID,
      `Git observation failed: ${safeError(result.error ?? result.stderr).message}`,
    );
  }
  return result.stdout.trim();
}

function captureRepositoryState(repositoryRoot) {
  const status = gitOutput(repositoryRoot, [
    "status",
    "--porcelain=v2",
    "--branch",
    "--untracked-files=all",
  ]);
  return Object.freeze({
    branch: gitOutput(repositoryRoot, ["branch", "--show-current"]),
    headSha: gitOutput(repositoryRoot, ["rev-parse", "HEAD"]),
    status,
    statusSha256: sha256(status),
  });
}

function capturePackageState(repositoryRoot) {
  const packagePath = resolve(repositoryRoot, "package.json");
  const contents = readFileSync(packagePath);
  const manifest = JSON.parse(contents.toString("utf8"));
  return Object.freeze({
    manifestSha256: sha256(contents),
    name: manifest.name,
    version: manifest.version,
  });
}

function normalUserconfigPath(environment = process.env) {
  const configured = Object.entries(environment).find(
    ([name, value]) => name.toLowerCase() === "npm_config_userconfig" && value,
  )?.[1];
  return resolve(configured || join(homedir(), ".npmrc"));
}

function captureUserconfigState(environment = process.env) {
  const filePath = normalUserconfigPath(environment);
  const state = pathState(filePath);
  if (!state) {
    return Object.freeze({
      exists: false,
      pathIdentitySha256: sha256(normalizePathIdentity(filePath)),
      type: "missing",
    });
  }
  return Object.freeze({
    contentSha256: state.isFile() ? sha256File(filePath) : undefined,
    exists: true,
    metadata: {
      birthtimeNs: String(state.birthtimeNs),
      mtimeNs: String(state.mtimeNs),
      size: String(state.size),
    },
    pathIdentitySha256: sha256(normalizePathIdentity(nativeRealpath(filePath))),
    type: entryType(state),
  });
}

function protectedSnapshotEvidence(snapshot) {
  const locations = snapshot.map((location) => ({
    entries: location.entries?.length ?? 0,
    label: location.label,
    sha256: sha256(JSON.stringify(location)),
  }));
  return Object.freeze({
    aggregateSha256: sha256(JSON.stringify(snapshot)),
    locations: Object.freeze(locations),
  });
}

function captureProtectedState(environment = process.env) {
  const locations = resolveProtectedLocations({ environment });
  const snapshot = snapshotProtectedState(locations);
  return Object.freeze({
    evidence: protectedSnapshotEvidence(snapshot),
    snapshot,
  });
}

function protectedComparison(before, after) {
  const classification = classifyProtectedState(before.snapshot, after.snapshot);
  return Object.freeze({
    attributedCount: classification.attributedCount,
    differenceCount: classification.differenceCount,
    differences: classification.displayedDifferences,
    inconclusive: classification.inconclusive,
    status: classification.status,
    truncated: classification.truncated,
  });
}

function assertRepositoryAndConfigUnchanged(before, after) {
  if (
    before.repository.headSha !== after.repository.headSha ||
    before.repository.statusSha256 !== after.repository.statusSha256 ||
    before.package.manifestSha256 !== after.package.manifestSha256 ||
    JSON.stringify(before.userconfig) !== JSON.stringify(after.userconfig)
  ) {
    fail(
      HARNESS_ERROR_CODES.PROTECTED_STATE_CHANGED,
      "Repository, package, or normal npm userconfig changed during evidence collection",
    );
  }
}

function captureBaseline(repositoryRoot, environment, includeProtectedState) {
  const protectedState = includeProtectedState ? captureProtectedState(environment) : undefined;
  return Object.freeze({
    package: capturePackageState(repositoryRoot),
    protectedState,
    repository: captureRepositoryState(repositoryRoot),
    userconfig: captureUserconfigState(environment),
  });
}

function baselineEvidence(baseline) {
  return Object.freeze({
    package: baseline.package,
    protectedState: baseline.protectedState?.evidence,
    repository: baseline.repository,
    userconfig: baseline.userconfig,
  });
}

function rawFileEvidence(filePath) {
  const state = statSync(filePath);
  return Object.freeze({
    bytes: state.size,
    sha256: sha256File(filePath),
  });
}

export async function runDurableChild({
  args,
  command,
  context,
  cwd,
  environment,
  expectedExitCode,
  invocationName,
  parser,
  summaryRelativePath = "child-summary.json",
  summaryBeforeRename,
} = {}) {
  acquireInvocationGuard(context, invocationName);
  ensureOwnedDirectory(context, "raw");
  const stdoutPath = ownedPath(context, "raw/stdout.log");
  const stderrPath = ownedPath(context, "raw/stderr.log");
  const stdout = new RedactingCapture(stdoutPath);
  const stderr = new RedactingCapture(stderrPath);
  for (const streamPath of [stdoutPath, stderrPath]) {
    validateEvidenceOutput(context.rootValidation, streamPath, {
      allowDirectory: false,
      allowFile: true,
      mustExist: true,
    });
  }
  const startedAt = new Date().toISOString();
  const monotonicStart = performance.now();
  writeOwnedJson(context, "raw/start.json", {
    args,
    command,
    cwd,
    invocationName,
    startedAt,
  });

  let spawnError;
  const result = await new Promise((resolveResult) => {
    const child = spawn(command, args, {
      cwd,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      spawnError = error;
    });
    child.on("close", (code, signal) => {
      resolveResult({ code, signal });
    });
  });

  const exitRecord = Object.freeze({
    code: result.code,
    endedAt: new Date().toISOString(),
    monotonicRuntimeMs: Math.max(0, performance.now() - monotonicStart),
    signal: result.signal,
    spawnError: spawnError ? safeError(spawnError) : undefined,
  });
  writeOwnedJson(context, "raw/exit.json", exitRecord);
  stdout.finish();
  stderr.finish();
  validateEvidenceOutput(context.rootValidation, stdoutPath, {
    allowDirectory: false,
    allowFile: true,
    mustExist: true,
  });
  validateEvidenceOutput(context.rootValidation, stderrPath, {
    allowDirectory: false,
    allowFile: true,
    mustExist: true,
  });
  const hashes = Object.freeze({
    exit: rawFileEvidence(ownedPath(context, "raw/exit.json")),
    ...(existsSync(ownedPath(context, "provenance.json"))
      ? { provenance: rawFileEvidence(ownedPath(context, "provenance.json")) }
      : {}),
    start: rawFileEvidence(ownedPath(context, "raw/start.json")),
    stderr: rawFileEvidence(stderrPath),
    stdout: rawFileEvidence(stdoutPath),
  });
  writeOwnedJson(context, "raw/raw-hashes.json", hashes);

  let parsed;
  try {
    parsed = parser
      ? await parser({
          exitRecord,
          stderr: readFileSync(stderrPath, "utf8"),
          stdout: readFileSync(stdoutPath, "utf8"),
        })
      : {};
  } catch (error) {
    atomicWriteSanitizedSummary(
      context,
      summaryRelativePath,
      {
        error: safeError(error),
        exit: exitRecord,
        rawEvidenceHashes: hashes,
        status: HARNESS_ERROR_CODES.POST_PROCESSING_FAILED,
      },
      { beforeRename: summaryBeforeRename },
    );
    fail(
      HARNESS_ERROR_CODES.POST_PROCESSING_FAILED,
      "Child returned and raw evidence is durable, but summary post-processing failed",
      { runRoot: context.runRoot },
    );
  }

  const status =
    spawnError || (expectedExitCode !== undefined && result.code !== expectedExitCode)
      ? "CHILD_FAILED"
      : "CHILD_EVIDENCE_RETAINED";
  const summary = Object.freeze({
    exit: exitRecord,
    parsed,
    rawEvidenceHashes: hashes,
    status,
  });
  atomicWriteSanitizedSummary(context, summaryRelativePath, summary, {
    beforeRename: summaryBeforeRename,
  });
  return Object.freeze({ ...summary, stderrPath, stdoutPath });
}

function summaryParser({ exitRecord, stderr, stdout }) {
  return Object.freeze({
    exitCode: exitRecord.code,
    stderrTail: sanitizeString(stderr.slice(-4_096), 4_096),
    stdoutTail: sanitizeString(stdout.slice(-4_096), 4_096),
  });
}

function prepareHarnessRun(options, mode) {
  const context = createOwnedRun({ ...options, mode });
  const commandPlan = buildReleaseCommandPlan(context.repositoryRoot);
  const before = captureBaseline(
    context.repositoryRoot,
    options.inheritedEnvironment ?? process.env,
    options.includeProtectedState !== false,
  );
  writeOwnedJson(context, "preflight-baseline.json", baselineEvidence(before));
  const npm = resolveNpmProvenance({
    context,
    inheritedEnvironment: options.inheritedEnvironment ?? process.env,
    requestedCli: options.requestedCli,
    requestedLauncher: options.requestedLauncher,
  });
  writeOwnedJson(context, "command-plan.json", commandPlan);
  writeOwnedJson(context, "provenance.json", npm.provenance);
  return Object.freeze({ before, commandPlan, context, npm });
}

export function dryValidateReleaseEvidence(options = {}) {
  const prepared = prepareHarnessRun(options, "dry");
  const before = prepared.before;
  writeOwnedJson(prepared.context, "preflight.json", baselineEvidence(before));
  const after = captureBaseline(
    prepared.context.repositoryRoot,
    options.inheritedEnvironment ?? process.env,
    options.includeProtectedState !== false,
  );
  assertRepositoryAndConfigUnchanged(before, after);
  const protectedState =
    before.protectedState && after.protectedState
      ? protectedComparison(before.protectedState, after.protectedState)
      : { status: "NOT_CAPTURED" };
  writeOwnedJson(prepared.context, "postflight.json", {
    ...baselineEvidence(after),
    protectedComparison: protectedState,
  });
  if (protectedState.status === "ISOLATION_VIOLATION") {
    fail(
      HARNESS_ERROR_CODES.PROTECTED_STATE_CHANGED,
      "Dry validation observed an attributed protected-state change",
    );
  }
  const summary = Object.freeze({
    commandPlan: prepared.commandPlan,
    npmProvenance: prepared.npm.provenance,
    protectedState,
    runRoot: prepared.context.runRoot,
    status: "DRY_VALIDATION_PASS",
  });
  atomicWriteSanitizedSummary(prepared.context, "summary.json", summary);
  return Object.freeze({ context: prepared.context, summary });
}

function expectHarnessError(callback, code) {
  try {
    callback();
  } catch (error) {
    if (error?.code === code) return error;
    throw error;
  }
  fail(code, `Expected ${code} was not raised`);
}

function selfTestPathBehavior(context) {
  const safeOutput = join(context.runRoot, "path-self-test");
  validateEvidenceOutput(context.rootValidation, safeOutput);
  expectHarnessError(
    () => validateEvidenceOutput(context.rootValidation, context.rootValidation.lexicalRoot),
    HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
  );
  expectHarnessError(
    () => validateEvidenceOutput(context.rootValidation, context.repositoryRoot),
    HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
  );
  const aliasMap = new Map([
    ["c:\\progra~1\\nodejs", "C:\\Program Files\\nodejs"],
    ["c:\\program files\\nodejs", "C:\\Program Files\\nodejs"],
  ]);
  const canonicalizeExisting = (value) =>
    aliasMap.get(normalizePathIdentity(value, { platform: "win32" })) ?? value;
  if (
    !canonicalIdentitiesEqual("C:\\PROGRA~1\\nodejs", "C:\\Program Files\\nodejs", {
      canonicalizeExisting,
      platform: "win32",
    })
  ) {
    fail(
      HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
      "Simulated Windows alias identities did not compare equal",
    );
  }
  const escapeDirectory = ensureOwnedDirectory(context, "identity-escape");
  expectHarnessError(
    () =>
      validateEvidenceOutput(
        {
          ...context.rootValidation,
          canonicalizeExisting: (value) =>
            normalizePathIdentity(value) === normalizePathIdentity(escapeDirectory)
              ? dirname(context.rootValidation.canonicalAllowedParent)
              : nativeRealpath(value),
        },
        escapeDirectory,
        { mustExist: true },
      ),
    HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
  );
  let nativeLinkEscape = "UNAVAILABLE";
  const linkPath = join(context.runRoot, "native-link-escape");
  try {
    symlinkSync(
      context.repositoryRoot,
      linkPath,
      process.platform === "win32" ? "junction" : "dir",
    );
    expectHarnessError(
      () => validateEvidenceOutput(context.rootValidation, join(linkPath, "package.json")),
      HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
    );
    nativeLinkEscape = "PASS";
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) throw error;
  } finally {
    if (pathState(linkPath)?.isSymbolicLink()) unlinkSync(linkPath);
  }
  return Object.freeze({
    injectedIdentityEscape: "PASS",
    nativeLinkEscape,
    repositoryEscape: "PASS",
    rootEquality: "PASS",
    simulatedWindowsAlias: "PASS",
  });
}

function selfTestCleanup(options) {
  const disposable = createOwnedRun({ ...options, mode: "cleanup-test" });
  writeOwnedText(disposable, "retained.txt", "sanitized evidence retained\n");
  atomicWriteSanitizedSummary(disposable, "summary.json", { status: "PASS" });
  sealOwnedRun(disposable, "self-test sanitized evidence preserved");
  cleanupOwnedRun({
    allowedParent: options.allowedParent,
    evidenceRoot: options.evidenceRoot,
    repositoryRoot: options.repositoryRoot,
    runRoot: disposable.runRoot,
    token: disposable.token,
  });
  if (existsSync(disposable.runRoot)) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Cleanup self-test left its exact owned root",
    );
  }
  return "PASS";
}

export async function runSelfTest(options = {}) {
  const prepared = prepareHarnessRun(options, "self-test");
  const before = prepared.before;
  writeOwnedJson(prepared.context, "preflight.json", baselineEvidence(before));
  const pathChecks = selfTestPathBehavior(prepared.context);
  const atomicity = { summaryAbsentBeforeRename: false, temporaryPresentBeforeRename: false };
  let parserFailure;
  try {
    await runDurableChild({
      args: [
        "-e",
        "process.stdout.write('SELF_TEST_STDOUT\\n'); process.stderr.write('SELF_TEST_STDERR\\n'); process.exit(7);",
      ],
      command: process.execPath,
      context: prepared.context,
      cwd: prepared.context.repositoryRoot,
      environment: prepared.npm.childEnvironment,
      expectedExitCode: 7,
      invocationName: "self-test",
      parser() {
        throw new Error("deliberate parser failure");
      },
      summaryBeforeRename({ targetPath, temporaryPath }) {
        atomicity.summaryAbsentBeforeRename = !existsSync(targetPath);
        atomicity.temporaryPresentBeforeRename = existsSync(temporaryPath);
      },
      summaryRelativePath: "parser-failure-summary.json",
    });
  } catch (error) {
    if (error.code !== HARNESS_ERROR_CODES.POST_PROCESSING_FAILED) throw error;
    parserFailure = error;
  }
  if (!parserFailure || !atomicity.summaryAbsentBeforeRename || !atomicity.temporaryPresentBeforeRename) {
    fail(
      HARNESS_ERROR_CODES.POST_PROCESSING_FAILED,
      "Self-test did not preserve parser-failure evidence atomically",
    );
  }
  const exitRecord = JSON.parse(
    readFileSync(ownedPath(prepared.context, "raw/exit.json"), "utf8"),
  );
  const stdout = readFileSync(ownedPath(prepared.context, "raw/stdout.log"), "utf8");
  const stderr = readFileSync(ownedPath(prepared.context, "raw/stderr.log"), "utf8");
  if (
    exitRecord.code !== 7 ||
    exitRecord.monotonicRuntimeMs < 0 ||
    stdout !== "SELF_TEST_STDOUT\n" ||
    stderr !== "SELF_TEST_STDERR\n"
  ) {
    fail(
      HARNESS_ERROR_CODES.POST_PROCESSING_FAILED,
      "Self-test raw stdout, stderr, exit, or runtime evidence is incomplete",
    );
  }
  expectHarnessError(
    () => acquireInvocationGuard(prepared.context, "self-test"),
    HARNESS_ERROR_CODES.DUPLICATE_INVOCATION,
  );
  expectHarnessError(
    () =>
      assertNpmProvenance({
        ...prepared.npm.provenance,
        effectiveCompositeNpmVersion: "0.0.0-mismatch",
      }),
    HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
  );
  const syntheticSecret = `npm_${"a".repeat(24)}`;
  atomicWriteSanitizedSummary(prepared.context, "redaction-summary.json", {
    syntheticSecret,
  });
  if (readFileSync(ownedPath(prepared.context, "redaction-summary.json"), "utf8").includes(syntheticSecret)) {
    fail(
      HARNESS_ERROR_CODES.POST_PROCESSING_FAILED,
      "Self-test summary retained a credential-shaped value",
    );
  }
  const cleanup = selfTestCleanup(options);
  const after = captureBaseline(
    prepared.context.repositoryRoot,
    options.inheritedEnvironment ?? process.env,
    options.includeProtectedState !== false,
  );
  assertRepositoryAndConfigUnchanged(before, after);
  const protectedState =
    before.protectedState && after.protectedState
      ? protectedComparison(before.protectedState, after.protectedState)
      : { status: "NOT_CAPTURED" };
  writeOwnedJson(prepared.context, "postflight.json", {
    ...baselineEvidence(after),
    protectedComparison: protectedState,
  });
  if (protectedState.status === "ISOLATION_VIOLATION") {
    fail(
      HARNESS_ERROR_CODES.PROTECTED_STATE_CHANGED,
      "Self-test observed an attributed protected-state change",
    );
  }
  const summary = Object.freeze({
    atomicSummary: "PASS",
    cleanup,
    duplicateInvocation: "PASS",
    npmProvenanceMatch: "PASS",
    npmProvenanceMismatch: "PASS",
    parserFailureRawPreservation: "PASS",
    pathChecks,
    protectedState,
    redaction: "PASS",
    runRoot: prepared.context.runRoot,
    runtimePreserved: "PASS",
    status: "SELF_TEST_PASS",
    stderrSeparated: "PASS",
    stdoutSeparated: "PASS",
  });
  atomicWriteSanitizedSummary(prepared.context, "summary.json", summary);
  return Object.freeze({ context: prepared.context, summary });
}

export async function runReleaseEvidence(options = {}) {
  if (options.allowReleaseCommand !== true) {
    fail(
      HARNESS_ERROR_CODES.AUTHORIZATION_REQUIRED,
      "Actual mode requires --allow-release-command after separate explicit approval",
    );
  }
  const prepared = prepareHarnessRun({ ...options, includeProtectedState: true }, "run");
  const before = prepared.before;
  writeOwnedJson(prepared.context, "preflight.json", baselineEvidence(before));
  const child = await runDurableChild({
    args: [prepared.npm.provenance.selectedCliPath, "run", "release:check"],
    command: process.execPath,
    context: prepared.context,
    cwd: prepared.context.repositoryRoot,
    environment: prepared.npm.childEnvironment,
    expectedExitCode: 0,
    invocationName: "release-check",
    parser: summaryParser,
    summaryRelativePath: "child-summary.json",
  });
  const after = captureBaseline(
    prepared.context.repositoryRoot,
    options.inheritedEnvironment ?? process.env,
    true,
  );
  const protectedState = protectedComparison(before.protectedState, after.protectedState);
  writeOwnedJson(prepared.context, "postflight.json", {
    ...baselineEvidence(after),
    protectedComparison: protectedState,
  });
  let status = child.status;
  try {
    assertRepositoryAndConfigUnchanged(before, after);
    if (protectedState.status !== "CLEAN") {
      fail(
        HARNESS_ERROR_CODES.PROTECTED_STATE_CHANGED,
        "Actual release evidence observed protected-state drift",
      );
    }
  } catch (error) {
    status = error.code;
  }
  const summary = Object.freeze({
    child: {
      exit: child.exit,
      parsed: child.parsed,
      rawEvidenceHashes: child.rawEvidenceHashes,
    },
    commandPlan: prepared.commandPlan,
    npmProvenance: prepared.npm.provenance,
    protectedState,
    runRoot: prepared.context.runRoot,
    status,
  });
  atomicWriteSanitizedSummary(prepared.context, "summary.json", summary);
  if (status !== "CHILD_EVIDENCE_RETAINED") {
    fail(
      status === "CHILD_FAILED"
        ? HARNESS_ERROR_CODES.CHILD_FAILED
        : HARNESS_ERROR_CODES.PROTECTED_STATE_CHANGED,
      "Actual release evidence completed with a non-success harness status",
      { runRoot: prepared.context.runRoot, status },
    );
  }
  return Object.freeze({ context: prepared.context, summary });
}

function parseArguments(argv) {
  const booleanFlags = new Set([
    "--allow-release-command",
    "--dry-validate",
    "--run",
    "--self-test",
  ]);
  const valueFlags = new Set([
    "--allowed-parent",
    "--evidence-root",
    "--npm-cli",
    "--npm-launcher",
    "--repository",
  ]);
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (booleanFlags.has(argument)) {
      if (parsed[argument]) fail(HARNESS_ERROR_CODES.ARGUMENT_ERROR, `Duplicate ${argument}`);
      parsed[argument] = true;
      continue;
    }
    if (valueFlags.has(argument)) {
      if (parsed[argument] !== undefined || index + 1 >= argv.length) {
        fail(HARNESS_ERROR_CODES.ARGUMENT_ERROR, `Invalid ${argument}`);
      }
      parsed[argument] = argv[++index];
      continue;
    }
    fail(HARNESS_ERROR_CODES.ARGUMENT_ERROR, `Unsupported argument ${argument}`);
  }
  const modes = ["--self-test", "--dry-validate", "--run"].filter((name) => parsed[name]);
  if (modes.length !== 1) {
    fail(
      HARNESS_ERROR_CODES.ARGUMENT_ERROR,
      "Choose exactly one of --self-test, --dry-validate, or --run",
    );
  }
  if (!parsed["--repository"] || !parsed["--evidence-root"]) {
    fail(
      HARNESS_ERROR_CODES.ARGUMENT_ERROR,
      "--repository and --evidence-root are required",
    );
  }
  if (parsed["--allow-release-command"] && !parsed["--run"]) {
    fail(
      HARNESS_ERROR_CODES.ARGUMENT_ERROR,
      "--allow-release-command is valid only with --run",
    );
  }
  const evidenceRoot = resolve(parsed["--evidence-root"]);
  return Object.freeze({
    allowReleaseCommand: parsed["--allow-release-command"] === true,
    allowedParent: resolve(parsed["--allowed-parent"] ?? dirname(evidenceRoot)),
    evidenceRoot,
    mode: modes[0],
    repositoryRoot: resolve(parsed["--repository"]),
    requestedCli: parsed["--npm-cli"],
    requestedLauncher: parsed["--npm-launcher"],
  });
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return nativeRealpath(process.argv[1]) === nativeRealpath(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const result =
    options.mode === "--self-test"
      ? await runSelfTest(options)
      : options.mode === "--dry-validate"
        ? dryValidateReleaseEvidence(options)
        : await runReleaseEvidence(options);
  process.stdout.write(
    `${stableJson({
      runRoot: result.context.runRoot,
      status: result.summary.status,
      summary: join(result.context.runRoot, "summary.json"),
    })}`,
  );
}

if (isMainModule()) {
  main().catch((error) => {
    const code = error?.code ?? "RELEASE_EVIDENCE_HARNESS_FAILED";
    process.stderr.write(`${code}: ${redactSecrets(String(error?.message ?? error))}\n`);
    if (error?.details?.runRoot) {
      process.stderr.write(`Evidence retained at: ${error.details.runRoot}\n`);
    }
    process.exitCode = 1;
  });
}
