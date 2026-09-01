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
  readlinkSync,
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
  HERMETIC_PROOF_INVALID: "HERMETIC_PROOF_INVALID",
  HERMETIC_PROOF_REQUIRED: "HERMETIC_PROOF_REQUIRED",
  NPM_PROVENANCE_MISMATCH: "NPM_PROVENANCE_MISMATCH",
  POST_PROCESSING_FAILED: "POST_PROCESSING_FAILED",
  PROTECTED_STATE_CHANGED: "PROTECTED_STATE_CHANGED",
  CHILD_FAILED: "CHILD_FAILED",
});

export const RELEASE_COMMAND = Object.freeze(["npm", "run", "release:check"]);
export const RELEASE_INVOCATION_MAXIMUM = 1;
export const RELEASE_RETRY_MAXIMUM = 0;
export const HERMETIC_PROOF_SCHEMA_VERSION = 1;

const hermeticProofKind = "kyw-dev-hermetic-run-proof";
const hermeticReceiptKind = "kyw-dev-hermetic-run-proof-receipt";
const hermeticFilePaths = Object.freeze({
  harness: "scripts/release-evidence-harness.mjs",
  package: "package.json",
  runner: "scripts/release-evidence-manual-runner.mjs",
});
const hermeticLayoutTypes = Object.freeze({
  appDataRoot: "directory",
  codexHomeRoot: "directory",
  gitConfigGlobalFile: "file",
  gitConfigSystemFile: "file",
  homeRoot: "directory",
  localAppDataRoot: "directory",
  npmCacheRoot: "directory",
  npmGlobalConfigFile: "file",
  npmUserConfigFile: "file",
  tempRoot: "directory",
  xdgCacheHome: "directory",
  xdgConfigHome: "directory",
  xdgDataHome: "directory",
  xdgStateHome: "directory",
});
const hermeticEnvironmentNames = new Set([
  "APPDATA",
  "CODEX_HOME",
  "ComSpec",
  "GIT_ATTR_NOSYSTEM",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_NOSYSTEM",
  "GIT_CONFIG_SYSTEM",
  "GIT_OPTIONAL_LOCKS",
  "GIT_TERMINAL_PROMPT",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOCALAPPDATA",
  "LOGONSERVER",
  "OS",
  "PATH",
  "PATHEXT",
  "SHELL",
  "SystemRoot",
  "SYSTEMDRIVE",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TZ",
  "USERPROFILE",
  "USERDOMAIN",
  "USERNAME",
  "windir",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "npm_config_audit",
  "npm_config_cache",
  "npm_config_color",
  "npm_config_fund",
  "npm_config_globalconfig",
  "npm_config_update_notifier",
  "npm_config_userconfig",
]);

const ownerFileName = ".release-evidence-owner.json";
const sealFileName = ".release-evidence-seal.json";
const npmPackageTreeLimits = Object.freeze({
  entries: 20_000,
  fileBytes: 512 * 1024 * 1024,
  linkBytes: 1024 * 1024,
  pathBytes: 8 * 1024 * 1024,
});
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
  const descendantPrefix = rootIdentity.endsWith(pathApi.sep)
    ? rootIdentity
    : `${rootIdentity}${pathApi.sep}`;
  return (
    candidateIdentity === rootIdentity ||
    candidateIdentity.startsWith(descendantPrefix)
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

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hermeticProofInvalid(message, details) {
  fail(HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID, message, details);
}

function exactStringEnvironment(environment, role) {
  if (!environment || typeof environment !== "object" || Array.isArray(environment)) {
    hermeticProofInvalid(`${role} must be an object`);
  }
  const entries = Object.entries(environment);
  if (entries.some(([name, value]) => !name || typeof value !== "string")) {
    hermeticProofInvalid(`${role} must contain only named string values`);
  }
  const caseNames = new Set();
  for (const [name] of entries) {
    const folded = name.toLowerCase();
    if (caseNames.has(folded)) {
      hermeticProofInvalid(`${role} contains a case-duplicate name`, { name });
    }
    caseNames.add(folded);
  }
  return Object.freeze(
    Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right))),
  );
}

function assertHermeticEnvironmentNames(environment) {
  const allowedFolded = new Map(
    [...hermeticEnvironmentNames].map((name) => [name.toLowerCase(), name]),
  );
  for (const name of Object.keys(environment)) {
    const folded = name.toLowerCase();
    if (
      !allowedFolded.has(folded) ||
      credentialEnvironmentName.test(name) ||
      /proxy/i.test(name) ||
      (/^node_/i.test(name) && name !== "NODE_NO_WARNINGS")
    ) {
      hermeticProofInvalid("Hermetic environment contains an unapproved override", { name });
    }
  }
  for (const name of ["PATH", "HOME", "USERPROFILE", "CODEX_HOME"]) {
    if (typeof environment[name] !== "string" || !environment[name]) {
      hermeticProofInvalid(`Hermetic environment is missing ${name}`);
    }
  }
}

function proofPathEvidence(filePath, expectedType, role) {
  if (typeof filePath !== "string" || !isAbsolute(filePath)) {
    hermeticProofInvalid(`${role} must be an absolute path`);
  }
  const lexicalPath = resolve(filePath);
  const lexicalState = pathState(lexicalPath);
  if (
    !lexicalState ||
    lexicalState.isSymbolicLink() ||
    (expectedType === "directory" && !lexicalState.isDirectory()) ||
    (expectedType === "file" && !lexicalState.isFile())
  ) {
    hermeticProofInvalid(`${role} must be an existing real ${expectedType}`, {
      type: entryType(lexicalState),
    });
  }
  const canonicalPath = nativeRealpath(lexicalPath);
  if (normalizePathIdentity(lexicalPath) !== normalizePathIdentity(canonicalPath)) {
    hermeticProofInvalid(`${role} must not resolve through an alias or link`);
  }
  const canonicalState = statSync(canonicalPath, { bigint: true });
  return Object.freeze({
    ...(expectedType === "file"
      ? { bytes: Number(canonicalState.size), sha256: sha256File(canonicalPath) }
      : {}),
    canonicalPath,
    identity: statIdentity(canonicalState),
    path: lexicalPath,
    type: expectedType,
  });
}

function assertPathEvidenceEqual(expected, current, role) {
  if (
    !expected ||
    expected.type !== current.type ||
    normalizePathIdentity(expected.path ?? "") !== normalizePathIdentity(current.path) ||
    normalizePathIdentity(expected.canonicalPath ?? "") !==
      normalizePathIdentity(current.canonicalPath) ||
    !sameStatIdentity(expected.identity ?? {}, current.identity) ||
    (current.type === "file" &&
      (expected.bytes !== current.bytes || expected.sha256 !== current.sha256))
  ) {
    hermeticProofInvalid(`${role} path or filesystem identity changed`);
  }
}

function assertHermeticLayout({ checkout, evidence, layout, state }) {
  if (!isStrictDescendant(state.canonicalPath, checkout.canonicalPath)) {
    hermeticProofInvalid("Hermetic checkout must be a strict descendant of the state root");
  }
  if (
    identitiesOverlap(state.canonicalPath, evidence.canonicalPath) ||
    identitiesOverlap(checkout.canonicalPath, evidence.canonicalPath)
  ) {
    hermeticProofInvalid("Hermetic state and checkout must be disjoint from evidence");
  }
  const entries = Object.entries(layout);
  for (const [name, item] of entries) {
    if (!isStrictDescendant(state.canonicalPath, item.canonicalPath)) {
      hermeticProofInvalid(`${name} must be a strict descendant of the state root`);
    }
    if (
      identitiesOverlap(checkout.canonicalPath, item.canonicalPath) ||
      identitiesOverlap(evidence.canonicalPath, item.canonicalPath)
    ) {
      hermeticProofInvalid(`${name} overlaps the checkout or evidence root`);
    }
  }
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      if (identitiesOverlap(entries[left][1].canonicalPath, entries[right][1].canonicalPath)) {
        hermeticProofInvalid(
          `Hermetic layout entries ${entries[left][0]} and ${entries[right][0]} overlap`,
        );
      }
    }
  }
}

function assertEnvironmentLayout(environment, layout) {
  const mappings = {
    APPDATA: "appDataRoot",
    CODEX_HOME: "codexHomeRoot",
    GIT_CONFIG_GLOBAL: "gitConfigGlobalFile",
    GIT_CONFIG_SYSTEM: "gitConfigSystemFile",
    HOME: "homeRoot",
    LOCALAPPDATA: "localAppDataRoot",
    TEMP: "tempRoot",
    TMP: "tempRoot",
    TMPDIR: "tempRoot",
    USERPROFILE: "homeRoot",
    XDG_CACHE_HOME: "xdgCacheHome",
    XDG_CONFIG_HOME: "xdgConfigHome",
    XDG_DATA_HOME: "xdgDataHome",
    XDG_STATE_HOME: "xdgStateHome",
    npm_config_cache: "npmCacheRoot",
    npm_config_globalconfig: "npmGlobalConfigFile",
    npm_config_userconfig: "npmUserConfigFile",
  };
  for (const [environmentName, layoutName] of Object.entries(mappings)) {
    const value = Object.entries(environment).find(
      ([name]) => name.toLowerCase() === environmentName.toLowerCase(),
    )?.[1];
    if (
      typeof value !== "string" ||
      normalizePathIdentity(value) !== normalizePathIdentity(layout[layoutName].canonicalPath)
    ) {
      hermeticProofInvalid(`${environmentName} does not bind ${layoutName}`);
    }
  }
  for (const [name, expected] of [
    ["GIT_CONFIG_NOSYSTEM", "1"],
    ["GIT_ATTR_NOSYSTEM", "1"],
    ["GIT_OPTIONAL_LOCKS", "0"],
    ["GIT_TERMINAL_PROMPT", "0"],
    ["npm_config_audit", "false"],
    ["npm_config_fund", "false"],
    ["npm_config_color", "false"],
    ["npm_config_update_notifier", "false"],
  ]) {
    if (environment[name] !== expected) {
      hermeticProofInvalid(`Hermetic environment requires ${name}=${expected}`);
    }
  }
  const homeDrive = environment.HOMEDRIVE;
  const homePath = environment.HOMEPATH;
  const recomposedWindowsHomes =
    typeof homeDrive === "string" && typeof homePath === "string"
      ? [`${homeDrive}${homePath}`, `${homeDrive}\\${homePath}`].map((value) =>
          normalizePathIdentity(value, { platform: "win32" }),
        )
      : [];
  if (
    (homeDrive !== undefined || homePath !== undefined) &&
    (typeof homeDrive !== "string" ||
      typeof homePath !== "string" ||
      !recomposedWindowsHomes.includes(
        normalizePathIdentity(layout.homeRoot.canonicalPath, { platform: "win32" }),
      ))
  ) {
    hermeticProofInvalid("HOMEDRIVE and HOMEPATH do not recompose the hermetic home root");
  }
}

function fileProof(checkoutRoot, name, blobSha) {
  const relativePath = hermeticFilePaths[name];
  if (!/^[a-f0-9]{40}$/.test(blobSha ?? "")) {
    hermeticProofInvalid(`${name} Git blob identity must be a literal 40-hex value`);
  }
  const filePath = resolve(checkoutRoot, ...relativePath.split("/"));
  const state = assertRealEntry(
    filePath,
    `${name} proof file`,
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
    { allowFile: true },
  );
  if (!state.isFile()) hermeticProofInvalid(`${name} proof path must be a file`);
  return Object.freeze({
    blobSha,
    bytes: Number(state.size),
    relativePath,
    sha256: sha256File(filePath),
  });
}

function assertExactTrackedCheckout(checkoutRoot) {
  const indexEntries = gitBuffer(checkoutRoot, ["ls-files", "--stage", "-z"]);
  const decoded = indexEntries.toString("utf8");
  if (!Buffer.from(decoded, "utf8").equals(indexEntries)) {
    hermeticProofInvalid("Tracked checkout paths must be valid UTF-8");
  }
  const seen = new Set();
  for (const record of decoded.split("\0")) {
    if (!record) continue;
    const separator = record.indexOf("\t");
    const metadata = separator === -1 ? "" : record.slice(0, separator);
    const relativePath = separator === -1 ? "" : record.slice(separator + 1);
    const match = /^(100644|100755) ([a-f0-9]{40}) 0$/.exec(metadata);
    if (!match || !relativePath || seen.has(relativePath)) {
      hermeticProofInvalid("Checkout index contains an unsupported mode, stage, or path");
    }
    seen.add(relativePath);
    const lexicalPath = resolve(checkoutRoot, ...relativePath.split("/"));
    const state = pathState(lexicalPath);
    if (!state?.isFile() || state.isSymbolicLink()) {
      hermeticProofInvalid(`Tracked checkout path ${relativePath} is missing or linked`);
    }
    const canonicalPath = nativeRealpath(lexicalPath);
    if (
      !isStrictDescendant(checkoutRoot, canonicalPath) ||
      normalizePathIdentity(lexicalPath) !== normalizePathIdentity(canonicalPath)
    ) {
      hermeticProofInvalid(`Tracked checkout path ${relativePath} escaped its root`);
    }
    const contents = readFileSync(canonicalPath);
    const blobSha = createHash("sha1")
      .update(Buffer.from(`blob ${contents.length}\0`))
      .update(contents)
      .digest("hex");
    if (blobSha !== match[2]) {
      hermeticProofInvalid(`Tracked checkout bytes for ${relativePath} differ from the index`);
    }
  }
}

export function buildHermeticRunProof({
  checkoutRoot,
  environment,
  evidenceRoot,
  fileGitBlobs,
  files,
  invocation,
  layout,
  nonce,
  sourceSha,
  sourceTree,
  stateRoot,
} = {}) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha ?? "") || !/^[a-f0-9]{40}$/.test(sourceTree ?? "")) {
    hermeticProofInvalid("Hermetic proof requires literal source commit and tree SHA values");
  }
  if (!/^[a-f0-9]{32,128}$/.test(nonce ?? "")) {
    hermeticProofInvalid("Hermetic proof requires an unpredictable hexadecimal nonce");
  }
  if (
    !layout ||
    Object.keys(layout).sort().join("\n") !== Object.keys(hermeticLayoutTypes).sort().join("\n")
  ) {
    hermeticProofInvalid("Hermetic proof layout names do not match the required layout");
  }
  const roots = Object.freeze({
    checkout: proofPathEvidence(checkoutRoot, "directory", "Checkout root"),
    evidence: proofPathEvidence(evidenceRoot, "directory", "Evidence root"),
    state: proofPathEvidence(stateRoot, "directory", "State root"),
  });
  const normalizedLayout = Object.freeze(
    Object.fromEntries(
      Object.entries(hermeticLayoutTypes)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, type]) => [
          name,
          proofPathEvidence(
            typeof layout[name] === "string" ? layout[name] : layout[name]?.path,
            type,
            name,
          ),
        ]),
    ),
  );
  assertHermeticLayout({ ...roots, layout: normalizedLayout });
  const normalizedEnvironment = exactStringEnvironment(environment, "Hermetic environment");
  assertHermeticEnvironmentNames(normalizedEnvironment);
  assertEnvironmentLayout(normalizedEnvironment, normalizedLayout);
  const requestedInvocation = invocation ?? {};
  const limits = Object.freeze({
    harnessMaximum: requestedInvocation.harnessMaximum,
    releaseMaximum: requestedInvocation.releaseMaximum,
    retryMaximum: requestedInvocation.retryMaximum,
    runnerMaximum: requestedInvocation.runnerMaximum,
  });
  if (
    limits.runnerMaximum !== 1 ||
    limits.harnessMaximum !== 1 ||
    limits.releaseMaximum !== RELEASE_INVOCATION_MAXIMUM ||
    limits.retryMaximum !== RELEASE_RETRY_MAXIMUM
  ) {
    hermeticProofInvalid("Hermetic invocation limits must be one/one/one with zero retries");
  }
  const blobs = fileGitBlobs ?? Object.fromEntries(
    Object.keys(hermeticFilePaths).map((name) => [
      name,
      files?.[name]?.blobSha ?? files?.[name]?.gitBlob,
    ]),
  );
  const boundFiles = Object.freeze(
    Object.fromEntries(
      Object.keys(hermeticFilePaths)
        .sort()
        .map((name) => [name, fileProof(roots.checkout.canonicalPath, name, blobs?.[name])]),
    ),
  );
  const unsigned = Object.freeze({
    environment: normalizedEnvironment,
    files: boundFiles,
    invocation: limits,
    kind: hermeticProofKind,
    layout: normalizedLayout,
    nonce,
    roots,
    schemaVersion: HERMETIC_PROOF_SCHEMA_VERSION,
    source: Object.freeze({ sha: sourceSha, tree: sourceTree }),
  });
  return Object.freeze({ ...unsigned, digest: sha256(canonicalJson(unsigned)) });
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
  fsyncParentDirectory(filePath);
}

function fsyncParentDirectory(filePath) {
  if (process.platform === "win32") return "UNAVAILABLE_ON_WIN32";
  const descriptor = openSync(dirname(filePath), "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  return "PASS";
}

function readHermeticProofFile(proofPath) {
  const proofFile = proofPathEvidence(proofPath, "file", "Runner proof");
  let proof;
  try {
    proof = JSON.parse(readFileSync(proofFile.canonicalPath, "utf8"));
  } catch (error) {
    hermeticProofInvalid(`Runner proof is not valid JSON: ${safeError(error).message}`);
  }
  return { proof, proofFile };
}

export function validateHermeticRunProof({
  evidenceRoot,
  inheritedEnvironment = process.env,
  proof: suppliedProof,
  proofPath: suppliedProofPath,
  repositoryRoot,
  runnerProof,
  sourceSha,
} = {}) {
  try {
    const proofPath = runnerProof ?? suppliedProofPath;
    const loaded = proofPath ? readHermeticProofFile(proofPath) : undefined;
    const proof = suppliedProof ?? loaded?.proof;
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      hermeticProofInvalid("A runner-issued hermetic proof is required");
    }
    if (suppliedProof && loaded && canonicalJson(suppliedProof) !== canonicalJson(loaded.proof)) {
      hermeticProofInvalid("Supplied proof object does not match the proof file");
    }
    const topLevelNames = [
      "digest",
      "environment",
      "files",
      "invocation",
      "kind",
      "layout",
      "nonce",
      "roots",
      "schemaVersion",
      "source",
    ];
    if (Object.keys(proof).sort().join("\n") !== topLevelNames.sort().join("\n")) {
      hermeticProofInvalid("Hermetic proof fields do not match schema version 1");
    }
    if (
      proof.schemaVersion !== HERMETIC_PROOF_SCHEMA_VERSION ||
      proof.kind !== hermeticProofKind ||
      !/^[a-f0-9]{32,128}$/.test(proof.nonce ?? "") ||
      !/^[a-f0-9]{64}$/.test(proof.digest ?? "")
    ) {
      hermeticProofInvalid("Hermetic proof schema, kind, nonce, or digest is invalid");
    }
    const { digest, ...unsigned } = proof;
    if (digest !== sha256(canonicalJson(unsigned))) {
      hermeticProofInvalid("Hermetic proof digest does not match its bound fields");
    }
    if (
      !/^[a-f0-9]{40}$/.test(sourceSha ?? "") ||
      proof.source?.sha !== sourceSha ||
      !/^[a-f0-9]{40}$/.test(proof.source?.tree ?? "")
    ) {
      hermeticProofInvalid("Hermetic proof does not bind the requested literal source SHA");
    }
    if (
      proof.invocation?.runnerMaximum !== 1 ||
      proof.invocation?.harnessMaximum !== 1 ||
      proof.invocation?.releaseMaximum !== RELEASE_INVOCATION_MAXIMUM ||
      proof.invocation?.retryMaximum !== RELEASE_RETRY_MAXIMUM
    ) {
      hermeticProofInvalid("Hermetic proof invocation limits are invalid");
    }
    if (
      Object.keys(proof.roots ?? {}).sort().join("\n") !== "checkout\nevidence\nstate" ||
      Object.keys(proof.layout ?? {}).sort().join("\n") !==
        Object.keys(hermeticLayoutTypes).sort().join("\n")
    ) {
      hermeticProofInvalid("Hermetic proof root or layout names are invalid");
    }
    const currentRoots = Object.freeze({
      checkout: proofPathEvidence(proof.roots.checkout?.path, "directory", "Checkout root"),
      evidence: proofPathEvidence(proof.roots.evidence?.path, "directory", "Evidence root"),
      state: proofPathEvidence(proof.roots.state?.path, "directory", "State root"),
    });
    for (const name of Object.keys(currentRoots)) {
      assertPathEvidenceEqual(proof.roots[name], currentRoots[name], `${name} root`);
    }
    if (
      normalizePathIdentity(repositoryRoot ?? "") !==
        normalizePathIdentity(currentRoots.checkout.canonicalPath) ||
      normalizePathIdentity(evidenceRoot ?? "") !==
        normalizePathIdentity(currentRoots.evidence.canonicalPath)
    ) {
      hermeticProofInvalid("Harness checkout or evidence root differs from the proof");
    }
    if (
      loaded &&
      (basename(loaded.proofFile.path) !== "runner-proof.json" ||
        normalizePathIdentity(dirname(loaded.proofFile.canonicalPath)) !==
          normalizePathIdentity(currentRoots.evidence.canonicalPath))
    ) {
      hermeticProofInvalid(
        "Runner proof file must be the fixed direct evidence child runner-proof.json",
      );
    }
    const currentLayout = Object.freeze(
      Object.fromEntries(
        Object.entries(hermeticLayoutTypes)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, type]) => {
            const current = proofPathEvidence(proof.layout[name]?.path, type, name);
            assertPathEvidenceEqual(proof.layout[name], current, name);
            return [name, current];
          }),
      ),
    );
    assertHermeticLayout({ ...currentRoots, layout: currentLayout });
    const proofEnvironment = exactStringEnvironment(proof.environment, "Proof environment");
    const currentEnvironment = exactStringEnvironment(
      inheritedEnvironment,
      "Current harness environment",
    );
    assertHermeticEnvironmentNames(proofEnvironment);
    assertEnvironmentLayout(proofEnvironment, currentLayout);
    if (canonicalJson(proofEnvironment) !== canonicalJson(currentEnvironment)) {
      hermeticProofInvalid("Current harness environment differs from the runner proof");
    }
    if (
      Object.keys(proof.files ?? {}).sort().join("\n") !==
      Object.keys(hermeticFilePaths).sort().join("\n")
    ) {
      hermeticProofInvalid("Hermetic proof file names are invalid");
    }
    for (const [name, relativePath] of Object.entries(hermeticFilePaths)) {
      const expected = proof.files[name];
      const current = fileProof(
        currentRoots.checkout.canonicalPath,
        name,
        expected?.blobSha,
      );
      if (
        expected?.relativePath !== relativePath ||
        expected.bytes !== current.bytes ||
        expected.sha256 !== current.sha256
      ) {
        hermeticProofInvalid(`${name} bytes differ from the runner proof`);
      }
      const committedBlob = gitOutput(currentRoots.checkout.canonicalPath, [
        "rev-parse",
        `${sourceSha}:${relativePath}`,
      ]);
      if (committedBlob !== expected.blobSha) {
        hermeticProofInvalid(`${name} Git blob differs from the runner proof`);
      }
    }
    const currentHead = gitOutput(currentRoots.checkout.canonicalPath, ["rev-parse", "HEAD"]);
    const currentTree = gitOutput(currentRoots.checkout.canonicalPath, [
      "rev-parse",
      "HEAD^{tree}",
    ]);
    const currentBranch = gitOutput(currentRoots.checkout.canonicalPath, [
      "branch",
      "--show-current",
    ]);
    const currentStatus = gitOutput(currentRoots.checkout.canonicalPath, [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]);
    if (
      currentHead !== sourceSha ||
      currentTree !== proof.source.tree ||
      currentBranch !== "" ||
      currentStatus !== ""
    ) {
      hermeticProofInvalid("Checkout HEAD, tree, detached state, or cleanliness is invalid");
    }
    assertExactTrackedCheckout(currentRoots.checkout.canonicalPath);
    return Object.freeze(proof);
  } catch (error) {
    if (error?.code === HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID) throw error;
    hermeticProofInvalid(`Hermetic proof validation failed: ${safeError(error).message}`);
  }
}

export function validateHermeticProofReceipt({
  evidenceRoot,
  proof,
  proofPath,
} = {}) {
  if (
    typeof proofPath !== "string" ||
    !isAbsolute(proofPath) ||
    basename(proofPath) !== "runner-proof.json"
  ) {
    hermeticProofInvalid("Proof receipt validation requires the fixed runner-proof.json path");
  }
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
    hermeticProofInvalid("Proof receipt validation requires the consumed proof");
  }
  const evidence = proofPathEvidence(evidenceRoot, "directory", "Receipt evidence root");
  const canonicalProof = proofPathEvidence(proofPath, "file", "Receipt proof file");
  if (
    normalizePathIdentity(dirname(canonicalProof.canonicalPath)) !==
    normalizePathIdentity(evidence.canonicalPath)
  ) {
    hermeticProofInvalid("Runner proof is not a direct evidence child");
  }
  const receiptPath = `${canonicalProof.canonicalPath}.consumed.json`;
  if (
    basename(receiptPath) !== "runner-proof.json.consumed.json" ||
    normalizePathIdentity(dirname(receiptPath)) !==
      normalizePathIdentity(evidence.canonicalPath)
  ) {
    hermeticProofInvalid("Proof receipt escaped its fixed evidence location");
  }
  const receiptFile = proofPathEvidence(
    receiptPath,
    "file",
    "Hermetic proof receipt",
  );
  if (receiptFile.bytes === 0 || receiptFile.bytes > 256 * 1024) {
    hermeticProofInvalid("Hermetic proof receipt is empty or exceeds its parser bound");
  }
  let receipt;
  const proofBytes = readFileSync(canonicalProof.canonicalPath);
  let currentProof;
  try {
    currentProof = JSON.parse(proofBytes.toString("utf8"));
    receipt = JSON.parse(readFileSync(receiptFile.canonicalPath, "utf8"));
  } catch (error) {
    hermeticProofInvalid(
      `Hermetic proof or receipt is not valid JSON: ${safeError(error).message}`,
    );
  }
  const expectedNames = [
    "consumedAt",
    "digest",
    "kind",
    "nonce",
    "proofFileSha256",
    "schemaVersion",
    "sourceSha",
  ];
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt) ||
    Object.keys(receipt).sort().join("\n") !== expectedNames.sort().join("\n") ||
    receipt.kind !== hermeticReceiptKind ||
    receipt.schemaVersion !== HERMETIC_PROOF_SCHEMA_VERSION ||
    receipt.digest !== proof.digest ||
    receipt.nonce !== proof.nonce ||
    receipt.sourceSha !== proof.source?.sha ||
    canonicalJson(currentProof) !== canonicalJson(proof) ||
    receipt.proofFileSha256 !== sha256(proofBytes) ||
    !Number.isFinite(Date.parse(receipt.consumedAt))
  ) {
    hermeticProofInvalid("Hermetic proof receipt does not bind the exact consumed proof");
  }
  return Object.freeze({
    proofFile: canonicalProof,
    receipt: Object.freeze(receipt),
    receiptFile,
    receiptPath: receiptFile.canonicalPath,
  });
}

export function consumeHermeticRunProof(options = {}) {
  const requestedProofPath = options.runnerProof ?? options.proofPath;
  if (typeof requestedProofPath !== "string" || !isAbsolute(requestedProofPath)) {
    hermeticProofInvalid("Proof consumption requires an absolute runner-proof path");
  }
  const proofPath = resolve(requestedProofPath);
  if (basename(proofPath) !== "runner-proof.json") {
    hermeticProofInvalid("Proof consumption requires the fixed runner-proof.json name");
  }
  const receiptPath = `${proofPath}.consumed.json`;
  if (pathState(receiptPath)) {
    fail(
      HARNESS_ERROR_CODES.DUPLICATE_INVOCATION,
      "Runner proof was already consumed and cannot be retried",
    );
  }
  let before;
  try {
    before = readFileSync(proofPath);
  } catch (error) {
    hermeticProofInvalid(`Runner proof cannot be read: ${safeError(error).message}`);
  }
  const proof = validateHermeticRunProof({ ...options, proofPath });
  let after;
  try {
    after = readFileSync(proofPath);
  } catch (error) {
    hermeticProofInvalid(`Runner proof cannot be re-read: ${safeError(error).message}`);
  }
  if (!before.equals(after)) {
    hermeticProofInvalid("Runner proof changed while it was being validated");
  }
  const evidenceCanonical = nativeRealpath(options.evidenceRoot);
  if (!isStrictDescendant(evidenceCanonical, receiptPath)) {
    hermeticProofInvalid("Hermetic proof receipt must be a sibling inside evidence");
  }
  try {
    writeFileDurablyExclusive(
      receiptPath,
      stableJson({
        consumedAt: new Date().toISOString(),
        digest: proof.digest,
        kind: hermeticReceiptKind,
        nonce: proof.nonce,
        proofFileSha256: sha256(before),
        schemaVersion: HERMETIC_PROOF_SCHEMA_VERSION,
        sourceSha: proof.source.sha,
      }),
    );
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail(
        HARNESS_ERROR_CODES.DUPLICATE_INVOCATION,
        "Runner proof was already consumed and cannot be retried",
      );
    }
    hermeticProofInvalid(`Hermetic proof receipt could not be retained: ${safeError(error).message}`);
  }
  const validatedReceipt = validateHermeticProofReceipt({
    evidenceRoot: options.evidenceRoot,
    proof,
    proofPath,
  });
  return Object.freeze({ proof, receiptPath: validatedReceipt.receiptPath });
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
    fsyncParentDirectory(directoryPath);
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

export function writeOwnedEvidenceJson(context, relativePath, value) {
  return writeOwnedText(context, relativePath, stableJson(value));
}

function writeOwnedJson(context, relativePath, value) {
  return writeOwnedEvidenceJson(context, relativePath, sanitizeValue(value));
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
  fsyncParentDirectory(targetPath);
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
  fsyncParentDirectory(runRoot);
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
    owner.schemaVersion !== 1 ||
    owner.runName !== basename(resolve(runRoot)) ||
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
  const immediateIdentity = statIdentity(statSync(runRoot, { bigint: true }));
  const immediateInventory = collectOwnedInventory(runRoot);
  if (
    !sameStatIdentity(currentIdentity, immediateIdentity) ||
    JSON.stringify(immediateInventory) !== JSON.stringify(currentInventory)
  ) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Cleanup target changed immediately before quarantine",
    );
  }
  const quarantinePath = resolve(
    rootValidation.lexicalRoot,
    `.release-evidence-cleanup-${token}-${randomBytes(12).toString("hex")}`,
  );
  validateEvidenceOutput(rootValidation, quarantinePath);
  if (existsSync(quarantinePath)) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Cleanup quarantine path already exists",
    );
  }
  try {
    renameSync(runRoot, quarantinePath);
    fsyncParentDirectory(quarantinePath);
  } catch (error) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      `Owned evidence could not be atomically quarantined: ${safeError(error).message}`,
    );
  }
  validateEvidenceOutput(rootValidation, quarantinePath, {
    allowDirectory: true,
    allowFile: false,
    mustExist: true,
  });
  const quarantineIdentity = statIdentity(statSync(quarantinePath, { bigint: true }));
  const quarantineInventory = collectOwnedInventory(quarantinePath);
  if (
    existsSync(runRoot) ||
    !sameStatIdentity(currentIdentity, quarantineIdentity) ||
    JSON.stringify(quarantineInventory) !== JSON.stringify(currentInventory)
  ) {
    fail(
      HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
      "Cleanup quarantine identity changed; retained without recursive deletion",
      { quarantinePath },
    );
  }
  rmSync(quarantinePath, { recursive: true, force: false });
  fsyncParentDirectory(quarantinePath);
  if (existsSync(quarantinePath) || existsSync(runRoot)) {
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
    fsyncParentDirectory(this.filePath);
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

function standardNpmPackage(selectedCliPath, selectedCliVersion) {
  const canonicalCliPath = nativeRealpath(selectedCliPath);
  const packageRoot = resolve(dirname(canonicalCliPath), "..");
  const expectedCliPath = join(packageRoot, "bin", "npm-cli.js");
  if (
    normalizePathIdentity(canonicalCliPath) !== normalizePathIdentity(expectedCliPath)
  ) {
    return undefined;
  }
  const packageJsonPath = join(packageRoot, "package.json");
  const packageJsonState = pathState(packageJsonPath);
  if (!packageJsonState?.isFile() || packageJsonState.isSymbolicLink()) return undefined;
  let manifest;
  try {
    const packageJsonBytes = readFileSync(packageJsonPath);
    if (packageJsonBytes.length === 0 || packageJsonBytes.length > 1024 * 1024) {
      return undefined;
    }
    manifest = JSON.parse(packageJsonBytes.toString("utf8"));
  } catch {
    return undefined;
  }
  const npmBin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.npm;
  if (
    manifest.name !== "npm" ||
    typeof manifest.version !== "string" ||
    !manifest.version ||
    typeof npmBin !== "string" ||
    normalizePathIdentity(resolve(packageRoot, npmBin)) !==
      normalizePathIdentity(canonicalCliPath)
  ) {
    return undefined;
  }
  if (manifest.version !== selectedCliVersion) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      "Selected npm CLI version differs from its containing npm package",
      { packageVersion: manifest.version, selectedCliVersion },
    );
  }
  const rootState = lstatSync(packageRoot, { bigint: true });
  const canonicalRoot = nativeRealpath(packageRoot);
  if (
    !rootState.isDirectory() ||
    rootState.isSymbolicLink() ||
    normalizePathIdentity(canonicalRoot) !== normalizePathIdentity(packageRoot)
  ) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      "Selected npm CLI package root must be a canonical real directory",
    );
  }
  return Object.freeze({
    canonicalRoot,
    packageJsonPath,
    version: manifest.version,
  });
}

export function captureNpmPackageTreeEvidence(selectedCliPath, selectedCliVersion) {
  let standardPackage;
  try {
    standardPackage = standardNpmPackage(selectedCliPath, selectedCliVersion);
  } catch (error) {
    if (error instanceof ReleaseEvidenceHarnessError) throw error;
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      `Selected npm CLI package could not be identified: ${safeError(error).message}`,
    );
  }
  if (!standardPackage) return undefined;

  try {
    const aggregate = createHash("sha256");
    const counts = { directories: 0, entries: 0, files: 0, links: 0 };
    let fileBytes = 0;
    let linkBytes = 0;
    let pathBytes = 0;
    const rootState = lstatSync(standardPackage.canonicalRoot, { bigint: true });
    const rootIdentity = statIdentity(rootState);
    aggregate.update(
      `${canonicalJson({
        identity: rootIdentity,
        mode: String(rootState.mode),
        path: ".",
        type: "directory",
      })}\n`,
    );

    function visit(directoryPath, relativeDirectory = "") {
      const names = readdirSync(directoryPath).sort();
      for (const name of names) {
        const entryPath = join(directoryPath, name);
        const relativePath = relativeDirectory
          ? `${relativeDirectory}/${name}`
          : name;
        const relativeBytes = Buffer.byteLength(relativePath);
        counts.entries += 1;
        pathBytes += relativeBytes;
        if (
          counts.entries > npmPackageTreeLimits.entries ||
          pathBytes > npmPackageTreeLimits.pathBytes
        ) {
          fail(
            HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
            "Selected npm package tree exceeds its bounded entry or path budget",
          );
        }
        const before = lstatSync(entryPath, { bigint: true });
        const type = entryType(before);
        if (type === "unsupported") {
          fail(
            HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
            `Selected npm package contains unsupported entry type at ${relativePath}`,
          );
        }
        const record = {
          identity: statIdentity(before),
          mode: String(before.mode),
          path: relativePath,
          type,
        };
        if (type === "file") {
          if (
            before.size > BigInt(npmPackageTreeLimits.fileBytes - fileBytes)
          ) {
            fail(
              HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
              "Selected npm package tree exceeds its bounded file-byte budget",
            );
          }
          const contents = readFileSync(entryPath);
          fileBytes += contents.length;
          counts.files += 1;
          record.bytes = contents.length;
          record.sha256 = sha256(contents);
        } else if (type === "link") {
          const target = readlinkSync(entryPath);
          const targetBytes = Buffer.byteLength(target);
          if (targetBytes > npmPackageTreeLimits.linkBytes - linkBytes) {
            fail(
              HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
              "Selected npm package tree exceeds its bounded link-byte budget",
            );
          }
          linkBytes += targetBytes;
          counts.links += 1;
          record.targetSha256 = sha256(target);
          const canonicalTarget = nativeRealpath(entryPath);
          if (
            !isSameOrDescendant(
              standardPackage.canonicalRoot,
              canonicalTarget,
            )
          ) {
            fail(
              HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
              `Selected npm package link escapes its canonical root at ${relativePath}`,
            );
          }
          const canonicalTargetState = statSync(canonicalTarget, { bigint: true });
          const canonicalTargetType = entryType(canonicalTargetState);
          if (!["directory", "file"].includes(canonicalTargetType)) {
            fail(
              HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
              `Selected npm package link has an unsupported target at ${relativePath}`,
            );
          }
          record.targetCanonicalIdentity = statIdentity(canonicalTargetState);
          record.targetCanonicalPath = canonicalTarget;
          record.targetCanonicalType = canonicalTargetType;
        } else {
          counts.directories += 1;
        }
        const after = lstatSync(entryPath, { bigint: true });
        if (
          entryType(after) !== type ||
          !sameStatIdentity(record.identity, statIdentity(after)) ||
          before.mode !== after.mode ||
          before.size !== after.size ||
          before.mtimeNs !== after.mtimeNs
        ) {
          fail(
            HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
            `Selected npm package entry changed while it was captured: ${relativePath}`,
          );
        }
        aggregate.update(`${canonicalJson(record)}\n`);
        if (type === "directory") visit(entryPath, relativePath);
      }
    }

    visit(standardPackage.canonicalRoot);
    const finalRootState = lstatSync(standardPackage.canonicalRoot, { bigint: true });
    if (
      !sameStatIdentity(rootIdentity, statIdentity(finalRootState)) ||
      rootState.mode !== finalRootState.mode ||
      rootState.mtimeNs !== finalRootState.mtimeNs
    ) {
      fail(
        HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
        "Selected npm package root changed while its tree was captured",
      );
    }
    return Object.freeze({
      aggregateSha256: aggregate.digest("hex"),
      canonicalRoot: standardPackage.canonicalRoot,
      counts: Object.freeze(counts),
      fileBytes,
      linkBytes,
      packageJsonFileIdentity: fileEvidence(standardPackage.packageJsonPath),
      packageName: "npm",
      packageVersion: standardPackage.version,
      pathBytes,
      rootIdentity,
    });
  } catch (error) {
    if (
      error instanceof ReleaseEvidenceHarnessError &&
      error.code === HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH
    ) {
      throw error;
    }
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      `Selected npm package tree could not be captured: ${safeError(error).message}`,
    );
  }
}

export function captureNpmRuntimeIdentityEvidence({
  includePackageTree = false,
  nodeExecutable = process.execPath,
  npmShimLauncher,
  requestedLauncherPath,
  selectedCliPath,
  selectedCliVersion,
} = {}) {
  try {
    const packageTree = includePackageTree
      ? captureNpmPackageTreeEvidence(selectedCliPath, selectedCliVersion)
      : undefined;
    if (includePackageTree && !packageTree) {
      fail(
        HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
        "Hermetic actual mode requires a positively identified standard npm package tree",
      );
    }
    return Object.freeze({
      launcherFileIdentity: fileEvidence(requestedLauncherPath),
      nodeExecutableFileIdentity: fileEvidence(nodeExecutable),
      npmShimLauncherFileIdentity: fileEvidence(npmShimLauncher),
      selectedCliFileIdentity: fileEvidence(selectedCliPath),
      ...(packageTree ? { selectedCliPackageTreeEvidence: packageTree } : {}),
    });
  } catch (error) {
    if (
      error instanceof ReleaseEvidenceHarnessError &&
      error.code === HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH
    ) {
      throw error;
    }
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      `npm runtime identity could not be captured: ${safeError(error).message}`,
    );
  }
}

export function assertNpmRuntimeProvenanceUnchanged(provenance) {
  if (
    !provenance ||
    typeof provenance !== "object" ||
    typeof provenance.nodeExecutable !== "string" ||
    typeof provenance.npmShimLauncher !== "string" ||
    typeof provenance.requestedLauncherPath !== "string" ||
    typeof provenance.selectedCliPath !== "string" ||
    typeof provenance.selectedCliVersion !== "string"
  ) {
    fail(
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
      "npm runtime provenance is incomplete and cannot be revalidated",
    );
  }
  const current = captureNpmRuntimeIdentityEvidence({
    includePackageTree: provenance.selectedCliPackageTreeEvidence !== undefined,
    nodeExecutable: provenance.nodeExecutable,
    npmShimLauncher: provenance.npmShimLauncher,
    requestedLauncherPath: provenance.requestedLauncherPath,
    selectedCliPath: provenance.selectedCliPath,
    selectedCliVersion: provenance.selectedCliVersion,
  });
  for (const [role, field] of [
    ["Node executable", "nodeExecutableFileIdentity"],
    ["requested npm launcher", "launcherFileIdentity"],
    ["selected npm CLI", "selectedCliFileIdentity"],
    ["owned npm shim", "npmShimLauncherFileIdentity"],
    ["selected npm package tree", "selectedCliPackageTreeEvidence"],
  ]) {
    const expected = provenance[field];
    const observed = current[field];
    if (
      (expected === undefined) !== (observed === undefined) ||
      (expected !== undefined && canonicalJson(expected) !== canonicalJson(observed))
    ) {
      fail(
        HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
        `${role} identity changed during release evidence collection`,
        { role },
      );
    }
  }
  return true;
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
    const lexicalState = pathState(requested);
    let canonicalState;
    try {
      canonicalState = lexicalState ? pathState(nativeRealpath(requested)) : undefined;
    } catch {
      canonicalState = undefined;
    }
    if (
      (!lexicalState?.isFile() && !lexicalState?.isSymbolicLink()) ||
      !canonicalState?.isFile()
    ) {
      fail(
        HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
        "Requested npm launcher must be a file or a link to a canonical file",
      );
    }
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

function safeChildEnvironment(
  context,
  npmCliPath,
  shimDirectory,
  inheritedEnvironment,
  hermeticProof,
) {
  const environment = {};
  if (hermeticProof) {
    const allowedNames = new Set(
      [...hermeticEnvironmentNames].map((name) => name.toLowerCase()),
    );
    for (const [name, value] of Object.entries(inheritedEnvironment)) {
      if (typeof value === "string" && allowedNames.has(name.toLowerCase())) {
        environment[name] = value;
      }
    }
  } else {
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
  }
  let cacheDirectory;
  let globalconfig;
  let userconfig;
  if (hermeticProof) {
    cacheDirectory = hermeticProof.layout.npmCacheRoot.canonicalPath;
    globalconfig = hermeticProof.layout.npmGlobalConfigFile.canonicalPath;
    userconfig = hermeticProof.layout.npmUserConfigFile.canonicalPath;
  } else {
    ensureOwnedDirectory(context, "config");
    cacheDirectory = ensureOwnedDirectory(context, "npm-cache");
    userconfig = writeOwnedText(
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
    globalconfig = writeOwnedText(context, "config/globalconfig", "\n");
  }
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
  hermeticProof,
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
    hermeticProof,
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
  const npmShimLauncher =
    process.platform === "win32" ? shim.windowsShim : shim.posixShim;
  const runtimeIdentityEvidence = captureNpmRuntimeIdentityEvidence({
    includePackageTree: Boolean(hermeticProof),
    nodeExecutable: process.execPath,
    npmShimLauncher,
    requestedLauncherPath: launcherPath,
    selectedCliPath,
    selectedCliVersion: selected.version,
  });
  const provenance = Object.freeze({
    effectiveCompositeNpmVersion: probe.nestedVersion,
    ...runtimeIdentityEvidence,
    launcherReportedVersion,
    nodeExecutable: process.execPath,
    nodeIdentity: normalizePathIdentity(nativeRealpath(process.execPath)),
    nodeVersion: process.version,
    npmShimLauncher,
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

function gitBuffer(repositoryRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: null,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0 || result.error) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8")
      : String(result.stderr ?? "");
    fail(
      HARNESS_ERROR_CODES.COMMAND_PLAN_INVALID,
      `Git observation failed: ${safeError(result.error ?? stderr).message}`,
    );
  }
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
}

function gitOutput(repositoryRoot, args) {
  return gitBuffer(repositoryRoot, args).toString("utf8").trim();
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
    let child;
    try {
      child = spawn(command, args, {
        cwd,
        env: environment,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      spawnError = error;
      resolveResult({ code: null, signal: null });
      return;
    }
    child.stdout?.on("data", (chunk) => stdout.push(chunk));
    child.stderr?.on("data", (chunk) => stderr.push(chunk));
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
  const npm = resolveNpmProvenance({
    context,
    hermeticProof: options.hermeticProof,
    inheritedEnvironment: options.inheritedEnvironment ?? process.env,
    requestedCli: options.requestedCli,
    requestedLauncher: options.requestedLauncher,
  });
  const baselineEnvironment = options.hermeticProof
    ? npm.childEnvironment
    : options.inheritedEnvironment ?? process.env;
  const before = captureBaseline(
    context.repositoryRoot,
    baselineEnvironment,
    options.includeProtectedState !== false,
  );
  writeOwnedJson(context, "preflight-baseline.json", baselineEvidence(before));
  writeOwnedJson(context, "command-plan.json", commandPlan);
  writeOwnedJson(context, "provenance.json", npm.provenance);
  return Object.freeze({ baselineEnvironment, before, commandPlan, context, npm });
}

export function dryValidateReleaseEvidence(options = {}) {
  const prepared = prepareHarnessRun(options, "dry");
  const before = prepared.before;
  writeOwnedJson(prepared.context, "preflight.json", baselineEvidence(before));
  const after = captureBaseline(
    prepared.context.repositoryRoot,
    prepared.baselineEnvironment,
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
    prepared.baselineEnvironment,
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
  if (
    typeof options.sourceSha !== "string" ||
    typeof options.runnerProof !== "string"
  ) {
    fail(
      HARNESS_ERROR_CODES.HERMETIC_PROOF_REQUIRED,
      "Actual mode requires --source-sha and --runner-proof from the manual runner",
    );
  }
  const consumedProof = consumeHermeticRunProof({
    evidenceRoot: options.evidenceRoot,
    inheritedEnvironment: options.inheritedEnvironment ?? process.env,
    repositoryRoot: options.repositoryRoot,
    runnerProof: options.runnerProof,
    sourceSha: options.sourceSha,
  });
  const prepared = prepareHarnessRun(
    {
      ...options,
      hermeticProof: consumedProof.proof,
      includeProtectedState: true,
    },
    "run",
  );
  const before = prepared.before;
  writeOwnedJson(prepared.context, "preflight.json", {
    ...baselineEvidence(before),
    hermeticProof: {
      digest: consumedProof.proof.digest,
      nonce: consumedProof.proof.nonce,
      receiptPathIdentitySha256: sha256(normalizePathIdentity(consumedProof.receiptPath)),
      source: consumedProof.proof.source,
    },
  });
  assertNpmRuntimeProvenanceUnchanged(prepared.npm.provenance);
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
  let npmRuntimeIdentity;
  try {
    assertNpmRuntimeProvenanceUnchanged(prepared.npm.provenance);
    npmRuntimeIdentity = Object.freeze({ status: "UNCHANGED" });
  } catch (error) {
    if (error?.code !== HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH) throw error;
    npmRuntimeIdentity = Object.freeze({
      error: safeError(error),
      status: HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
    });
  }
  const after = captureBaseline(
    prepared.context.repositoryRoot,
    prepared.baselineEnvironment,
    true,
  );
  const protectedState = protectedComparison(before.protectedState, after.protectedState);
  writeOwnedJson(prepared.context, "postflight.json", {
    ...baselineEvidence(after),
    npmRuntimeIdentity,
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
  if (npmRuntimeIdentity.status !== "UNCHANGED") {
    status = HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH;
  }
  const summary = Object.freeze({
    child: {
      exit: child.exit,
      parsed: child.parsed,
      rawEvidenceHashes: child.rawEvidenceHashes,
    },
    commandPlan: prepared.commandPlan,
    npmProvenance: prepared.npm.provenance,
    npmRuntimeIdentity,
    proofDigest: consumedProof.proof.digest,
    protectedState,
    runRoot: prepared.context.runRoot,
    status,
  });
  atomicWriteSanitizedSummary(prepared.context, "summary.json", summary);
  if (status !== "CHILD_EVIDENCE_RETAINED") {
    const errorCode =
      status === "CHILD_FAILED"
        ? HARNESS_ERROR_CODES.CHILD_FAILED
        : status === HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH
          ? HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH
          : HARNESS_ERROR_CODES.PROTECTED_STATE_CHANGED;
    fail(
      errorCode,
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
    "--runner-proof",
    "--source-sha",
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
  if (
    !parsed["--run"] &&
    (parsed["--runner-proof"] !== undefined || parsed["--source-sha"] !== undefined)
  ) {
    fail(
      HARNESS_ERROR_CODES.ARGUMENT_ERROR,
      "--runner-proof and --source-sha are valid only with --run",
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
    runnerProof: parsed["--runner-proof"]
      ? resolve(parsed["--runner-proof"])
      : undefined,
    sourceSha: parsed["--source-sha"],
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
