import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const MANAGED_SKILL_NAMES = Object.freeze([
  "kyw-grilling",
  "kyw-init",
  "kyw-task",
  "kyw-audit",
]);
export const INSTALL_SCHEMA_VERSION = 1;
export const INSTALL_METADATA_NAME = ".kyw-dev-install.json";
export const TRANSACTION_NAME = ".kyw-dev-transaction.json";
export const TRANSACTION_COMPLETE_NAME = ".kyw-dev-transaction-complete";

export const EXIT_CODES = Object.freeze({
  OK: 0,
  USAGE: 1,
  UNSUPPORTED_RUNTIME: 2,
  SCOPE_RESOLUTION: 3,
  CONFLICT: 4,
  INVALID_STATE: 5,
  FILESYSTEM: 6,
  RECOVERY_REQUIRED: 7,
});

export const stagePrefix = ".kyw-dev-stage-";
export const backupPrefix = ".kyw-dev-backup-";
export const commitStartedName = ".commit-started";
export const commitStartedText = "commit started\n";
export const commitCompleteText = "commit complete\n";
export const packageName = "kyw-dev";
export const semanticVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
export const sha256Pattern = /^[a-f0-9]{64}$/;
export const transactionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const windowsDeviceNamePattern = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const windowsInvalidSegmentPattern = /[<>:"|?*\u0000-\u001f]/;

const errorExitCodes = Object.freeze({
  UNSUPPORTED_RUNTIME: EXIT_CODES.UNSUPPORTED_RUNTIME,
  SCOPE_RESOLUTION_FAILED: EXIT_CODES.SCOPE_RESOLUTION,
  INSTALL_CONFLICT: EXIT_CODES.CONFLICT,
  UPDATE_CONFLICT: EXIT_CODES.CONFLICT,
  UNINSTALL_CONFLICT: EXIT_CODES.CONFLICT,
  DUPLICATE_INSTALLATION: EXIT_CODES.CONFLICT,
  INVALID_PACKAGE: EXIT_CODES.INVALID_STATE,
  INVALID_INSTALL_METADATA: EXIT_CODES.INVALID_STATE,
  INSTALL_NOT_FOUND: EXIT_CODES.INVALID_STATE,
  FILESYSTEM_ERROR: EXIT_CODES.FILESYSTEM,
  PERMISSION_DENIED: EXIT_CODES.FILESYSTEM,
  RECOVERY_REQUIRED: EXIT_CODES.RECOVERY_REQUIRED,
});

export class SkillInstallationError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "SkillInstallationError";
    this.code = code;
    this.exitCode = options.exitCode ?? errorExitCodes[code] ?? EXIT_CODES.FILESYSTEM;
  }
}

export function installationError(code, message, cause) {
  return new SkillInstallationError(code, message, cause ? { cause } : undefined);
}

export function pathState(filePath) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function normalizedComparable(filePath, pathApi = path) {
  const resolved = pathApi.resolve(filePath);
  return pathApi.sep === "\\" ? resolved.toLowerCase() : resolved;
}

export function isPathInside(root, candidate, pathApi = path) {
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${pathApi.sep}`) && relative !== ".." && !pathApi.isAbsolute(relative));
}

export function assertCanonicalRealPath(filePath, label, errorCode, trustedRoot) {
  let resolved;
  try {
    resolved = realpathSync(filePath);
  } catch (error) {
    throw installationError(errorCode, `Cannot resolve ${label} at ${filePath}: ${error.message}`, error);
  }
  const lexical = path.resolve(filePath);
  if (normalizedComparable(resolved) !== normalizedComparable(lexical)) {
    throw installationError(errorCode, `${label} reaches a different real path and may contain a link: ${filePath}`);
  }
  if (trustedRoot && !isPathInside(trustedRoot, resolved)) {
    throw installationError(errorCode, `${label} escapes its trusted root: ${filePath}`);
  }
  return resolved;
}

export function sameFileIdentity(left, right) {
  if (left.dev !== right.dev || left.ino !== right.ino || left.size !== right.size) {
    return false;
  }
  return left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

export function readRegularFile(
  filePath,
  { label = "file", errorCode = "FILESYSTEM_ERROR", trustedRoot, relativePath } = {},
) {
  if (trustedRoot && relativePath) {
    const expected = resolveManagedPath(trustedRoot, relativePath);
    if (normalizedComparable(expected) !== normalizedComparable(filePath)) {
      throw installationError(errorCode, `${label} path does not match its managed identity: ${filePath}`);
    }
    assertSafeManagedParents(trustedRoot, relativePath, { errorCode });
  }
  const before = pathState(filePath);
  if (!before?.isFile() || before.isSymbolicLink()) {
    throw installationError(errorCode, `${label} must be a real regular file: ${filePath}`);
  }
  assertCanonicalRealPath(filePath, label, errorCode, trustedRoot);
  let buffer;
  try {
    buffer = readFileSync(filePath);
  } catch (error) {
    throw installationError(errorCode, `Cannot read ${label} at ${filePath}: ${error.message}`, error);
  }
  const after = pathState(filePath);
  if (!after?.isFile() || after.isSymbolicLink() || !sameFileIdentity(before, after) || after.size !== buffer.length) {
    throw installationError(errorCode, `${label} changed type or identity while it was read: ${filePath}`);
  }
  assertCanonicalRealPath(filePath, label, errorCode, trustedRoot);
  return buffer;
}

export function hashFile(filePath, options) {
  return hashBuffer(readRegularFile(filePath, options));
}

export function normalizeManagedPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw installationError("INVALID_INSTALL_METADATA", "Managed file paths must be non-empty strings");
  }
  const windowsForm = relativePath.replaceAll("/", "\\");
  if (
    relativePath.includes("\\") ||
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(windowsForm) ||
    /^[A-Za-z]:/.test(relativePath)
  ) {
    throw installationError(
      "INVALID_INSTALL_METADATA",
      `Managed file path must use relative POSIX separators: ${relativePath}`,
    );
  }
  const segments = relativePath.split("/");
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        windowsInvalidSegmentPattern.test(segment) ||
        /[. ]$/.test(segment) ||
        windowsDeviceNamePattern.test(segment),
    )
  ) {
    throw installationError("INVALID_INSTALL_METADATA", `Unsafe managed file path: ${relativePath}`);
  }
  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath) {
    throw installationError("INVALID_INSTALL_METADATA", `Managed file path is not normalized: ${relativePath}`);
  }
  return normalized;
}

export function portablePathIdentity(relativePath) {
  return relativePath.normalize("NFC").toLowerCase();
}

export function managedManifestErrors(paths, label) {
  const errors = [];
  const byIdentity = new Map();
  for (const relativePath of paths) {
    const identity = portablePathIdentity(relativePath);
    const existing = byIdentity.get(identity);
    if (existing !== undefined) {
      errors.push(
        existing === relativePath
          ? `${label} contains duplicate path: ${relativePath}`
          : `${label} contains case or normalization collision: ${existing} and ${relativePath}`,
      );
      continue;
    }
    byIdentity.set(identity, relativePath);
  }
  const identities = [...byIdentity.keys()].sort();
  for (let index = 0; index < identities.length; index += 1) {
    for (let nested = index + 1; nested < identities.length; nested += 1) {
      const parent = identities[index];
      const candidate = identities[nested];
      if (candidate.startsWith(`${parent}/`)) {
        errors.push(
          `${label} contains file/directory prefix collision: ${byIdentity.get(parent)} and ${byIdentity.get(candidate)}`,
        );
      }
    }
  }
  return errors;
}

export function assertManagedManifest(paths, label, errorCode) {
  const errors = managedManifestErrors(paths, label);
  if (errors.length > 0) {
    throw installationError(errorCode, errors.join("; "));
  }
}

export function isAllowedManagedPath(relativePath) {
  return (
    MANAGED_SKILL_NAMES.some((name) => relativePath === name || relativePath.startsWith(`${name}/`)) ||
    relativePath.startsWith(".kyw-dev/runtime/")
  );
}

export function resolveManagedPath(root, relativePath, pathApi = path) {
  const normalized = normalizeManagedPath(relativePath);
  const candidate = pathApi.resolve(root, ...normalized.split("/"));
  if (!isPathInside(root, candidate, pathApi) || normalizedComparable(candidate, pathApi) === normalizedComparable(root, pathApi)) {
    throw installationError("INVALID_INSTALL_METADATA", `Managed path escapes the Skills root: ${relativePath}`);
  }
  return candidate;
}

export function resolveScopeLayout({ scope, home, repositoryRoot, pathApi = path }) {
  if (!["user", "project"].includes(scope)) {
    throw installationError("SCOPE_RESOLUTION_FAILED", `Scope must be user or project, received ${scope ?? "<missing>"}`);
  }
  const baseDirectory = scope === "user" ? home : repositoryRoot;
  if (typeof baseDirectory !== "string" || !baseDirectory.trim()) {
    throw installationError(
      "SCOPE_RESOLUTION_FAILED",
      `${scope === "user" ? "User home" : "Git repository root"} is unavailable`,
    );
  }
  const base = pathApi.resolve(baseDirectory);
  const agentsRoot = pathApi.resolve(base, ".agents");
  const skillsRoot = pathApi.resolve(agentsRoot, "skills");
  return Object.freeze({
    scope,
    baseDirectory: base,
    agentsRoot,
    skillsRoot,
    metadataPath: pathApi.resolve(skillsRoot, INSTALL_METADATA_NAME),
    transactionPath: pathApi.resolve(skillsRoot, TRANSACTION_NAME),
    transactionCompletePath: pathApi.resolve(skillsRoot, TRANSACTION_COMPLETE_NAME),
  });
}

export function assertLocationLayout(location, errorCode = "INVALID_INSTALL_METADATA") {
  if (!location || typeof location !== "object") {
    throw installationError(errorCode, "Installation location must be an object");
  }
  const expected = resolveScopeLayout({
    scope: location.scope,
    home: location.scope === "user" ? location.baseDirectory : undefined,
    repositoryRoot: location.scope === "project" ? location.baseDirectory : undefined,
  });
  for (const key of [
    "baseDirectory",
    "agentsRoot",
    "skillsRoot",
    "metadataPath",
    "transactionPath",
    "transactionCompletePath",
  ]) {
    if (
      typeof location[key] !== "string" ||
      normalizedComparable(location[key]) !== normalizedComparable(expected[key])
    ) {
      throw installationError(errorCode, `Installation location has an unsafe ${key}`);
    }
  }
  return expected;
}

function resolvePhysicalScopeRoot(directory, label) {
  const requested = path.resolve(directory);
  const requestedState = pathState(requested);
  if (!requestedState || requestedState.isSymbolicLink() || !requestedState.isDirectory()) {
    throw installationError("SCOPE_RESOLUTION_FAILED", `${label} must be an existing real directory: ${requested}`);
  }
  let resolved;
  try {
    resolved = realpathSync(requested);
  } catch (error) {
    throw installationError("SCOPE_RESOLUTION_FAILED", `Cannot resolve ${label} ${requested}: ${error.message}`, error);
  }
  const resolvedState = pathState(resolved);
  if (!resolvedState?.isDirectory() || resolvedState.isSymbolicLink()) {
    throw installationError("SCOPE_RESOLUTION_FAILED", `${label} is unsafe: ${resolved}`);
  }
  return resolved;
}

export function resolveUserHome({ env = process.env, platform = process.platform } = {}) {
  const configured = platform === "win32" ? env.USERPROFILE || env.HOME : env.HOME;
  const value = configured || homedir();
  if (typeof value !== "string" || !value.trim()) {
    throw installationError("SCOPE_RESOLUTION_FAILED", "Cannot resolve the current user's home directory");
  }
  return path.resolve(value);
}

export function resolveCodexHome({ home = resolveUserHome(), env = process.env } = {}) {
  const value = env.CODEX_HOME || path.join(home, ".codex");
  if (typeof value !== "string" || !value.trim()) {
    throw installationError("SCOPE_RESOLUTION_FAILED", "Cannot resolve the current Codex home directory");
  }
  return path.resolve(value);
}

export function repositorySearchPath(startDirectory, pathApi = path) {
  const directories = [];
  let current = pathApi.resolve(startDirectory);
  while (true) {
    directories.push(current);
    const parent = pathApi.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return directories;
}

export function findRepositoryRoot(startDirectory = process.cwd()) {
  let realStart;
  try {
    realStart = realpathSync(path.resolve(startDirectory));
  } catch (error) {
    throw installationError(
      "SCOPE_RESOLUTION_FAILED",
      `Cannot inspect the current directory ${path.resolve(startDirectory)}: ${error.message}`,
      error,
    );
  }
  const startState = pathState(realStart);
  if (!startState?.isDirectory()) {
    throw installationError("SCOPE_RESOLUTION_FAILED", `Project scope must start from a directory: ${realStart}`);
  }

  for (const directory of repositorySearchPath(realStart)) {
    const marker = path.join(directory, ".git");
    const state = pathState(marker);
    if (!state) {
      continue;
    }
    if (state.isSymbolicLink()) {
      throw installationError("SCOPE_RESOLUTION_FAILED", `Refusing symlinked Git marker: ${marker}`);
    }
    if (state.isDirectory()) {
      assertCanonicalRealPath(marker, "Git directory marker", "SCOPE_RESOLUTION_FAILED", directory);
      return directory;
    }
    if (state.isFile()) {
      return directory;
    }
    throw installationError("SCOPE_RESOLUTION_FAILED", `Unsupported Git marker type: ${marker}`);
  }
  throw installationError(
    "SCOPE_RESOLUTION_FAILED",
    `No Git repository root was found from ${realStart}; run the project-scope command inside a Git repository`,
  );
}

export function resolveInstallLocation({
  scope,
  cwd = process.cwd(),
  home = resolveUserHome(),
  repositoryRoot,
} = {}) {
  const resolvedRepositoryRoot = scope === "project" ? repositoryRoot ?? findRepositoryRoot(cwd) : undefined;
  if (!["user", "project"].includes(scope)) {
    return resolveScopeLayout({ scope, home, repositoryRoot: resolvedRepositoryRoot });
  }
  const physicalBase = resolvePhysicalScopeRoot(
    scope === "user" ? home : resolvedRepositoryRoot,
    scope === "user" ? "User home" : "Git repository root",
  );
  return resolveScopeLayout({
    scope,
    home: scope === "user" ? physicalBase : home,
    repositoryRoot: scope === "project" ? physicalBase : resolvedRepositoryRoot,
  });
}

export function readJson(filePath, errorCode, label, options = {}) {
  try {
    return JSON.parse(readRegularFile(filePath, { label, errorCode, ...options }).toString("utf8"));
  } catch (error) {
    if (error instanceof SkillInstallationError) {
      throw error;
    }
    throw installationError(errorCode, `${label} is not valid JSON at ${filePath}: ${error.message}`, error);
  }
}

export function assertRealDirectory(
  directory,
  label,
  { errorCode = "FILESYSTEM_ERROR", trustedRoot } = {},
) {
  const state = pathState(directory);
  if (!state) {
    return false;
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    throw installationError(errorCode, `${label} must be a real directory: ${directory}`);
  }
  assertCanonicalRealPath(directory, label, errorCode, trustedRoot);
  return true;
}

export function assertSafeManagedParents(root, relativePath, { create = false, errorCode = "FILESYSTEM_ERROR" } = {}) {
  const normalized = normalizeManagedPath(relativePath);
  const segments = normalized.split("/").slice(0, -1);
  if (!assertRealDirectory(root, "Managed root", { errorCode })) {
    throw installationError(errorCode, `Managed root does not exist: ${root}`);
  }
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    const state = pathState(current);
    if (!state) {
      if (!create) {
        return;
      }
      mkdirSync(current);
      if (!assertRealDirectory(current, "Managed path parent", { errorCode, trustedRoot: root })) {
        throw installationError(errorCode, `Managed path parent was not created safely: ${current}`);
      }
      continue;
    }
    if (state.isSymbolicLink() || !state.isDirectory()) {
      throw installationError(errorCode, `Managed path parent is unsafe: ${current}`);
    }
    assertCanonicalRealPath(current, "Managed path parent", errorCode, root);
  }
}
