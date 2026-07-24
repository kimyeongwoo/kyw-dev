import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  constants as fsConstants,
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
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

const stagePrefix = ".kyw-dev-stage-";
const backupPrefix = ".kyw-dev-backup-";
const commitStartedName = ".commit-started";
const commitStartedText = "commit started\n";
const commitCompleteText = "commit complete\n";
const packageName = "kyw-dev";
const semanticVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const transactionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

function installationError(code, message, cause) {
  return new SkillInstallationError(code, message, cause ? { cause } : undefined);
}

function pathState(filePath) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalizedComparable(filePath, pathApi = path) {
  const resolved = pathApi.resolve(filePath);
  return pathApi.sep === "\\" ? resolved.toLowerCase() : resolved;
}

function isPathInside(root, candidate, pathApi = path) {
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${pathApi.sep}`) && relative !== ".." && !pathApi.isAbsolute(relative));
}

function assertCanonicalRealPath(filePath, label, errorCode, trustedRoot) {
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

function sameFileIdentity(left, right) {
  if (left.dev !== right.dev || left.ino !== right.ino || left.size !== right.size) {
    return false;
  }
  return left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

function readRegularFile(
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

function hashFile(filePath, options) {
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

function portablePathIdentity(relativePath) {
  return relativePath.normalize("NFC").toLowerCase();
}

function managedManifestErrors(paths, label) {
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

function assertManagedManifest(paths, label, errorCode) {
  const errors = managedManifestErrors(paths, label);
  if (errors.length > 0) {
    throw installationError(errorCode, errors.join("; "));
  }
}

function isAllowedManagedPath(relativePath) {
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

function assertLocationLayout(location, errorCode = "INVALID_INSTALL_METADATA") {
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

function readJson(filePath, errorCode, label, options = {}) {
  try {
    return JSON.parse(readRegularFile(filePath, { label, errorCode, ...options }).toString("utf8"));
  } catch (error) {
    if (error instanceof SkillInstallationError) {
      throw error;
    }
    throw installationError(errorCode, `${label} is not valid JSON at ${filePath}: ${error.message}`, error);
  }
}

function validateSkillContract(skillDirectory, skillName, { errorCode = "INVALID_PACKAGE", trustedRoot } = {}) {
  const errors = [];
  const rootState = pathState(skillDirectory);
  if (!rootState) {
    return [`${skillName} directory is missing`];
  }
  if (rootState.isSymbolicLink() || !rootState.isDirectory()) {
    return [`${skillName} must be a real directory`];
  }
  const skillPath = path.join(skillDirectory, "SKILL.md");
  const metadataPath = path.join(skillDirectory, "agents", "openai.yaml");
  const skillState = pathState(skillPath);
  const metadataState = pathState(metadataPath);
  if (!skillState?.isFile() || skillState.isSymbolicLink()) {
    errors.push(`${skillName}/SKILL.md is missing or unsafe`);
  }
  if (!metadataState?.isFile() || metadataState.isSymbolicLink()) {
    errors.push(`${skillName}/agents/openai.yaml is missing or unsafe`);
  }
  if (errors.length > 0) {
    return errors;
  }
  let skill;
  let metadata;
  try {
    skill = readRegularFile(skillPath, {
      label: `${skillName}/SKILL.md`,
      errorCode,
      trustedRoot,
      relativePath: trustedRoot ? path.relative(trustedRoot, skillPath).replaceAll("\\", "/") : undefined,
    }).toString("utf8");
    metadata = readRegularFile(metadataPath, {
      label: `${skillName}/agents/openai.yaml`,
      errorCode,
      trustedRoot,
      relativePath: trustedRoot ? path.relative(trustedRoot, metadataPath).replaceAll("\\", "/") : undefined,
    }).toString("utf8");
  } catch (error) {
    errors.push(error.message);
    return errors;
  }
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(skill)?.[1];
  if (!frontmatter) {
    errors.push(`${skillName}/SKILL.md has invalid front matter`);
  } else {
    if (!new RegExp(`^name: ${skillName}$`, "m").test(frontmatter)) {
      errors.push(`${skillName}/SKILL.md name does not match its directory`);
    }
    if (!/^description:\s+\S.{20,}$/m.test(frontmatter)) {
      errors.push(`${skillName}/SKILL.md needs a descriptive trigger boundary`);
    }
  }
  if (!metadata.includes("policy:\n  allow_implicit_invocation: false\n")) {
    errors.push(`${skillName}/agents/openai.yaml must disable implicit invocation`);
  }
  return errors;
}

function collectSourceTree(sourceDirectory, targetPrefix, sourceRoot) {
  const rootState = pathState(sourceDirectory);
  if (!rootState?.isDirectory() || rootState.isSymbolicLink()) {
    throw installationError("INVALID_PACKAGE", `Packaged source directory is missing or unsafe: ${sourceDirectory}`);
  }
  const files = [];

  function visit(directory, relativeDirectory = "") {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const sourcePath = path.join(directory, entry.name);
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const state = pathState(sourcePath);
      if (!state || entry.isSymbolicLink() || state.isSymbolicLink()) {
        throw installationError("INVALID_PACKAGE", `Packaged source must not contain symlinks: ${sourcePath}`);
      }
      if (entry.isDirectory() && state.isDirectory()) {
        assertCanonicalRealPath(sourcePath, "packaged source directory", "INVALID_PACKAGE", sourceRoot);
        visit(sourcePath, relativePath);
      } else if (entry.isFile() && state.isFile()) {
        const targetPath = normalizeManagedPath(`${targetPrefix}/${relativePath}`);
        files.push(
          Object.freeze({
            path: targetPath,
            sourcePath,
            sourceRoot,
            sourceRelativePath: path.relative(sourceRoot, sourcePath).replaceAll("\\", "/"),
            sha256: hashFile(sourcePath, {
              label: "packaged source file",
              errorCode: "INVALID_PACKAGE",
              trustedRoot: sourceRoot,
              relativePath: path.relative(sourceRoot, sourcePath).replaceAll("\\", "/"),
            }),
            mode: state.mode & 0o777,
          }),
        );
      } else {
        throw installationError("INVALID_PACKAGE", `Unsupported packaged source entry: ${sourcePath}`);
      }
    }
  }

  visit(sourceDirectory);
  return files;
}

function validatePluginPackage(sourceRoot, packageJson) {
  const pluginPath = path.join(sourceRoot, ".codex-plugin", "plugin.json");
  const pluginJson = readJson(pluginPath, "INVALID_PACKAGE", "Plugin manifest", {
    trustedRoot: sourceRoot,
    relativePath: ".codex-plugin/plugin.json",
  });
  const errors = [];
  if (packageJson.name !== packageName) {
    errors.push(`package name must be ${packageName}`);
  }
  if (!semanticVersionPattern.test(packageJson.version ?? "")) {
    errors.push(`package version is invalid: ${packageJson.version ?? "<missing>"}`);
  }
  if (pluginJson.name !== packageJson.name) {
    errors.push("plugin and package names do not match");
  }
  if (pluginJson.version !== packageJson.version) {
    errors.push("plugin and package versions do not match");
  }
  if (pluginJson.skills !== "./skills/") {
    errors.push("plugin skills path must be ./skills/");
  }
  if (errors.length > 0) {
    throw installationError("INVALID_PACKAGE", `Packaged kyw-dev metadata is invalid:\n- ${errors.join("\n- ")}`);
  }
}

export function buildManagedSourceInventory({ sourceRoot = PACKAGE_ROOT } = {}) {
  const requestedRoot = path.resolve(sourceRoot);
  const requestedState = pathState(requestedRoot);
  if (!requestedState || requestedState.isSymbolicLink() || !requestedState.isDirectory()) {
    throw installationError("INVALID_PACKAGE", `Packaged source root is missing or unsafe: ${requestedRoot}`);
  }
  let resolvedRoot;
  try {
    resolvedRoot = realpathSync(requestedRoot);
  } catch (error) {
    throw installationError("INVALID_PACKAGE", `Cannot resolve packaged source ${sourceRoot}: ${error.message}`, error);
  }
  const rootState = pathState(resolvedRoot);
  if (!rootState?.isDirectory() || rootState.isSymbolicLink()) {
    throw installationError("INVALID_PACKAGE", `Packaged source root is missing or unsafe: ${resolvedRoot}`);
  }
  const packageJson = readJson(path.join(resolvedRoot, "package.json"), "INVALID_PACKAGE", "package.json", {
    trustedRoot: resolvedRoot,
    relativePath: "package.json",
  });
  validatePluginPackage(resolvedRoot, packageJson);

  const files = [];
  for (const skillName of MANAGED_SKILL_NAMES) {
    const skillDirectory = path.join(resolvedRoot, "skills", skillName);
    const contractErrors = validateSkillContract(skillDirectory, skillName, {
      errorCode: "INVALID_PACKAGE",
      trustedRoot: resolvedRoot,
    });
    if (contractErrors.length > 0) {
      throw installationError("INVALID_PACKAGE", `Packaged Skill ${skillName} is malformed:\n- ${contractErrors.join("\n- ")}`);
    }
    files.push(...collectSourceTree(skillDirectory, skillName, resolvedRoot));
  }

  const coreMappings = [
    ["src/core/task-artifacts.mjs", ".kyw-dev/runtime/src/core/task-artifacts.mjs"],
    ["src/core/template-contracts.mjs", ".kyw-dev/runtime/src/core/template-contracts.mjs"],
  ];
  for (const [sourceRelative, targetRelative] of coreMappings) {
    const sourcePath = path.join(resolvedRoot, ...sourceRelative.split("/"));
    const state = pathState(sourcePath);
    if (!state?.isFile() || state.isSymbolicLink()) {
      throw installationError("INVALID_PACKAGE", `Required direct-install runtime file is missing: ${sourceRelative}`);
    }
    files.push(
      Object.freeze({
        path: targetRelative,
        sourcePath,
        sourceRoot: resolvedRoot,
        sourceRelativePath: sourceRelative,
        sha256: hashFile(sourcePath, {
          label: "packaged runtime file",
          errorCode: "INVALID_PACKAGE",
          trustedRoot: resolvedRoot,
          relativePath: sourceRelative,
        }),
        mode: state.mode & 0o777,
      }),
    );
  }
  files.push(
    ...collectSourceTree(path.join(resolvedRoot, "templates"), ".kyw-dev/runtime/templates", resolvedRoot),
  );
  files.sort((left, right) => left.path.localeCompare(right.path));

  const paths = [];
  for (const file of files) {
    if (!isAllowedManagedPath(file.path)) {
      throw installationError("INVALID_PACKAGE", `Packaged inventory escaped managed containers: ${file.path}`);
    }
    paths.push(file.path);
  }
  assertManagedManifest(paths, "Packaged inventory", "INVALID_PACKAGE");
  return Object.freeze({
    sourceRoot: resolvedRoot,
    packageName: packageJson.name,
    version: packageJson.version,
    files: Object.freeze(files),
  });
}

function timestamp(now) {
  const value = typeof now === "function" ? now() : now;
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Installation timestamp source returned an invalid date");
  }
  return date.toISOString();
}

export function createInstallMetadata({ inventory, scope, previousMetadata, now = () => new Date() }) {
  const currentTimestamp = timestamp(now);
  return Object.freeze({
    schemaVersion: INSTALL_SCHEMA_VERSION,
    packageName,
    version: inventory.version,
    scope,
    installedAt: previousMetadata?.installedAt ?? currentTimestamp,
    updatedAt: currentTimestamp,
    skills: Object.freeze(MANAGED_SKILL_NAMES.map((name) => Object.freeze({ name, path: name }))),
    files: Object.freeze(
      inventory.files.map(({ path: filePath, sha256 }) => Object.freeze({ path: filePath, sha256 })),
    ),
  });
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function validateInstallMetadata(metadata, { expectedScope } = {}) {
  const errors = [];
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return ["metadata root must be an object"];
  }
  if (metadata.schemaVersion !== INSTALL_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${INSTALL_SCHEMA_VERSION}`);
  }
  if (metadata.packageName !== packageName) {
    errors.push(`packageName must be ${packageName}`);
  }
  if (!semanticVersionPattern.test(metadata.version ?? "")) {
    errors.push("version must be semantic version text");
  }
  if (!["user", "project"].includes(metadata.scope)) {
    errors.push("scope must be user or project");
  } else if (expectedScope && metadata.scope !== expectedScope) {
    errors.push(`scope ${metadata.scope} does not match requested scope ${expectedScope}`);
  }
  for (const field of ["installedAt", "updatedAt"]) {
    if (typeof metadata[field] !== "string" || Number.isNaN(Date.parse(metadata[field]))) {
      errors.push(`${field} must be an ISO timestamp`);
    }
  }

  const skillNames = [];
  if (!Array.isArray(metadata.skills)) {
    errors.push("skills must be an array");
  } else {
    for (const skill of metadata.skills) {
      if (!skill || typeof skill !== "object" || typeof skill.name !== "string" || skill.path !== skill.name) {
        errors.push("each Skill entry must contain matching name and path strings");
        continue;
      }
      skillNames.push(skill.name);
    }
    if (JSON.stringify(skillNames) !== JSON.stringify(MANAGED_SKILL_NAMES)) {
      errors.push(`skills must list exactly: ${MANAGED_SKILL_NAMES.join(", ")}`);
    }
  }

  const filePaths = [];
  if (!Array.isArray(metadata.files) || metadata.files.length === 0) {
    errors.push("files must be a non-empty array");
  } else {
    for (const file of metadata.files) {
      if (!file || typeof file !== "object" || typeof file.path !== "string") {
        errors.push("each managed file must contain a path string");
        continue;
      }
      try {
        normalizeManagedPath(file.path);
      } catch (error) {
        errors.push(error.message);
        continue;
      }
      if (!isAllowedManagedPath(file.path)) {
        errors.push(`managed file is outside kyw-dev containers: ${file.path}`);
      }
      filePaths.push(file.path);
      if (!sha256Pattern.test(file.sha256 ?? "")) {
        errors.push(`managed file has invalid SHA-256: ${file.path}`);
      }
    }
    errors.push(...managedManifestErrors(filePaths, "managed file inventory"));
  }
  return errors;
}

export function readInstallMetadata(location, { required = false } = {}) {
  assertLocationLayout(location, "INVALID_INSTALL_METADATA");
  const hasSkillsRoot = assertScopeDirectoryChain(location, {
    requireSkills: required,
    errorCode: "INVALID_INSTALL_METADATA",
  });
  if (!hasSkillsRoot) {
    return undefined;
  }
  const state = pathState(location.metadataPath);
  if (!state) {
    if (required) {
      throw installationError(
        "INSTALL_NOT_FOUND",
        `No managed kyw-dev installation metadata exists at ${location.metadataPath}`,
      );
    }
    return undefined;
  }
  if (state.isSymbolicLink() || !state.isFile()) {
    throw installationError("INVALID_INSTALL_METADATA", `Installation metadata is unsafe: ${location.metadataPath}`);
  }
  const metadata = readJson(location.metadataPath, "INVALID_INSTALL_METADATA", "Installation metadata", {
    trustedRoot: location.skillsRoot,
    relativePath: INSTALL_METADATA_NAME,
  });
  const errors = validateInstallMetadata(metadata, { expectedScope: location.scope });
  if (errors.length > 0) {
    throw installationError(
      "INVALID_INSTALL_METADATA",
      `Installation metadata is malformed at ${location.metadataPath}:\n- ${errors.join("\n- ")}`,
    );
  }
  return metadata;
}

function assertRealDirectory(
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

function assertScopeDirectoryChain(
  location,
  { create = false, requireSkills = false, errorCode = "FILESYSTEM_ERROR" } = {},
) {
  assertLocationLayout(location, errorCode);
  if (!assertRealDirectory(location.baseDirectory, "Scope root", { errorCode })) {
    throw installationError(
      errorCode === "FILESYSTEM_ERROR" ? "SCOPE_RESOLUTION_FAILED" : errorCode,
      `Scope root does not exist: ${location.baseDirectory}`,
    );
  }
  for (const [directory, label] of [
    [location.agentsRoot, "Agents directory"],
    [location.skillsRoot, "Skills directory"],
  ]) {
    if (!assertRealDirectory(directory, label, { errorCode, trustedRoot: location.baseDirectory })) {
      if (!create) {
        if (requireSkills) {
          throw installationError(errorCode, `${label} does not exist: ${directory}`);
        }
        return false;
      }
      mkdirSync(directory);
      if (!assertRealDirectory(directory, label, { errorCode, trustedRoot: location.baseDirectory })) {
        throw installationError(errorCode, `${label} was not created safely: ${directory}`);
      }
    }
  }
  return true;
}

function ensureScopeDirectories(location) {
  assertScopeDirectoryChain(location, { create: true });
}

function assertSafeManagedParents(root, relativePath, { create = false, errorCode = "FILESYSTEM_ERROR" } = {}) {
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

function knownManagedDirectories(filePaths) {
  const directories = new Set(MANAGED_SKILL_NAMES);
  directories.add(".kyw-dev");
  directories.add(".kyw-dev/runtime");
  for (const filePath of filePaths) {
    const segments = filePath.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join("/"));
    }
  }
  return directories;
}

function scanManagedContainer(
  location,
  containerPath,
  knownFiles,
  knownDirectories,
  knownPathsByIdentity,
  result,
) {
  const absoluteContainer = resolveManagedPath(location.skillsRoot, containerPath);
  const state = pathState(absoluteContainer);
  if (!state) {
    result.missingContainers.push(containerPath);
    return;
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    result.unsafe.push(containerPath);
    return;
  }
  try {
    assertCanonicalRealPath(
      absoluteContainer,
      "managed container",
      "INVALID_INSTALL_METADATA",
      location.skillsRoot,
    );
  } catch {
    result.unsafe.push(containerPath);
    return;
  }

  function visit(directory, relativeDirectory) {
    const entries = readdirSync(directory, { withFileTypes: true });
    if (entries.length === 0 && !knownDirectories.has(relativeDirectory)) {
      result.unknown.push(`${relativeDirectory}/`);
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = `${relativeDirectory}/${entry.name}`;
      const expected = knownPathsByIdentity.get(portablePathIdentity(relative));
      if (expected !== undefined && expected !== relative) {
        result.unsafe.push(`${relative} (collides with ${expected})`);
        continue;
      }
      const entryState = pathState(absolute);
      if (!entryState) {
        result.unsafe.push(relative);
      } else if (entry.isSymbolicLink() || entryState.isSymbolicLink()) {
        if (knownFiles.has(relative) || knownDirectories.has(relative)) {
          result.unsafe.push(relative);
        } else {
          result.unknown.push(relative);
        }
      } else if (entry.isDirectory() && entryState.isDirectory()) {
        if (!knownDirectories.has(relative)) {
          result.unknown.push(`${relative}/`);
          continue;
        }
        try {
          assertCanonicalRealPath(
            absolute,
            "managed directory",
            "INVALID_INSTALL_METADATA",
            location.skillsRoot,
          );
        } catch {
          result.unsafe.push(relative);
          continue;
        }
        visit(absolute, relative);
      } else if (entry.isFile() && entryState.isFile()) {
        if (!knownFiles.has(relative)) {
          result.unknown.push(relative);
        }
      } else {
        result.unsafe.push(relative);
      }
    }
  }
  visit(absoluteContainer, containerPath);
}

export function inspectManagedInstallation(location, metadata) {
  assertLocationLayout(location, "INVALID_INSTALL_METADATA");
  assertScopeDirectoryChain(location, {
    requireSkills: true,
    errorCode: "INVALID_INSTALL_METADATA",
  });
  const metadataErrors = validateInstallMetadata(metadata, { expectedScope: location.scope });
  if (metadataErrors.length > 0) {
    throw installationError(
      "INVALID_INSTALL_METADATA",
      `Cannot inspect malformed installation metadata:\n- ${metadataErrors.join("\n- ")}`,
    );
  }
  const knownFiles = new Set(metadata.files.map((file) => file.path));
  const knownDirectories = knownManagedDirectories(knownFiles);
  const knownPathsByIdentity = new Map(
    [...knownFiles, ...knownDirectories].map((relativePath) => [portablePathIdentity(relativePath), relativePath]),
  );
  const result = {
    missing: [],
    modified: [],
    unknown: [],
    unsafe: [],
    missingContainers: [],
    existingFiles: new Map(),
  };
  result.unsafe.push(...listManagedRootIdentityCollisions(location.skillsRoot));

  for (const file of metadata.files) {
    const target = resolveManagedPath(location.skillsRoot, file.path);
    try {
      assertSafeManagedParents(location.skillsRoot, file.path, { errorCode: "INVALID_INSTALL_METADATA" });
    } catch {
      result.unsafe.push(file.path);
      continue;
    }
    const state = pathState(target);
    if (!state) {
      result.missing.push(file.path);
      continue;
    }
    if (state.isSymbolicLink() || !state.isFile()) {
      result.unsafe.push(file.path);
      continue;
    }
    let actualHash;
    try {
      actualHash = hashFile(target, {
        label: "managed file",
        errorCode: "INVALID_INSTALL_METADATA",
        trustedRoot: location.skillsRoot,
        relativePath: file.path,
      });
    } catch {
      result.unsafe.push(file.path);
      continue;
    }
    result.existingFiles.set(file.path, actualHash);
    if (actualHash !== file.sha256) {
      result.modified.push(file.path);
    }
  }

  for (const container of [...MANAGED_SKILL_NAMES, ".kyw-dev/runtime"]) {
    scanManagedContainer(
      location,
      container,
      knownFiles,
      knownDirectories,
      knownPathsByIdentity,
      result,
    );
  }
  for (const key of ["missing", "modified", "unknown", "unsafe", "missingContainers"]) {
    result[key] = [...new Set(result[key])].sort();
  }
  return result;
}

function stateConflictSummary(state) {
  const details = [];
  for (const [label, paths] of [
    ["missing managed files", state.missing],
    ["modified managed files", state.modified],
    ["unknown files or directories", state.unknown],
    ["unsafe filesystem entries", state.unsafe],
  ]) {
    if (paths.length > 0) {
      details.push(`${label}: ${paths.join(", ")}`);
    }
  }
  return details;
}

function listManagedRootIdentityCollisions(skillsRoot) {
  const state = pathState(skillsRoot);
  if (!state?.isDirectory() || state.isSymbolicLink()) {
    return [];
  }
  const exactNames = [
    ...MANAGED_SKILL_NAMES,
    ".kyw-dev",
    INSTALL_METADATA_NAME,
    TRANSACTION_NAME,
    TRANSACTION_COMPLETE_NAME,
  ];
  const expectedByIdentity = new Map(exactNames.map((name) => [portablePathIdentity(name), name]));
  const collisions = [];
  for (const name of readdirSync(skillsRoot)) {
    const identity = portablePathIdentity(name);
    const expected = expectedByIdentity.get(identity);
    if (expected !== undefined && name !== expected) {
      collisions.push(`${name} (collides with ${expected})`);
      continue;
    }
    for (const prefix of [stagePrefix, backupPrefix]) {
      if (identity.startsWith(portablePathIdentity(prefix)) && !name.startsWith(prefix)) {
        collisions.push(`${name} (collides with ${prefix}*)`);
      }
    }
  }
  return collisions.sort();
}

function directManagedContainers(location) {
  return [...MANAGED_SKILL_NAMES, ".kyw-dev/runtime"].filter((relativePath) =>
    Boolean(pathState(resolveManagedPath(location.skillsRoot, relativePath))),
  );
}

function listReservedArtifacts(skillsRoot) {
  const state = pathState(skillsRoot);
  if (!state?.isDirectory() || state.isSymbolicLink()) {
    return [];
  }
  return readdirSync(skillsRoot)
    .filter(
      (name) => {
        const identity = portablePathIdentity(name);
        return (
          identity === portablePathIdentity(TRANSACTION_NAME) ||
          identity === portablePathIdentity(TRANSACTION_COMPLETE_NAME) ||
          identity.startsWith(portablePathIdentity(stagePrefix)) ||
          identity.startsWith(portablePathIdentity(backupPrefix))
        );
      },
    )
    .sort();
}

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

function discoverKywSkills(skillsRoot) {
  const state = pathState(skillsRoot);
  if (!state?.isDirectory() || state.isSymbolicLink()) {
    return [];
  }
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.name.startsWith("kyw-") && (entry.isDirectory() || entry.isSymbolicLink()))
    .map((entry) => entry.name)
    .sort();
}

function doctorFinding(severity, code, message, exitCode = 0) {
  return Object.freeze({ severity, code, message, exitCode });
}

function listDoctorDirectory(directory, label, trustedRoot, findings) {
  let state;
  try {
    state = pathState(directory);
  } catch (error) {
    findings.push(
      doctorFinding(
        "error",
        "PLUGIN_CACHE_UNREADABLE",
        `Cannot inspect ${label} at ${directory}: ${error.message}`,
        EXIT_CODES.FILESYSTEM,
      ),
    );
    return undefined;
  }
  if (!state) {
    return undefined;
  }
  if (!state.isDirectory() || state.isSymbolicLink()) {
    findings.push(
      doctorFinding(
        "error",
        "UNSAFE_PLUGIN_CACHE",
        `${label} must be a real directory: ${directory}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
    return undefined;
  }
  try {
    assertCanonicalRealPath(directory, label, "RECOVERY_REQUIRED", trustedRoot);
    return readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  } catch (error) {
    findings.push(
      doctorFinding(
        "error",
        error.code === "RECOVERY_REQUIRED" ? "UNSAFE_PLUGIN_CACHE" : "PLUGIN_CACHE_UNREADABLE",
        `Cannot inspect ${label} at ${directory}: ${error.message}`,
        error.code === "RECOVERY_REQUIRED" ? EXIT_CODES.RECOVERY_REQUIRED : EXIT_CODES.FILESYSTEM,
      ),
    );
    return undefined;
  }
}

function doctorPluginDirectories(directory, label, trustedRoot, findings) {
  const entries = listDoctorDirectory(directory, label, trustedRoot, findings);
  if (!entries) {
    return [];
  }
  const directories = [];
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) {
      continue;
    }
    const child = path.join(directory, entry.name);
    if (listDoctorDirectory(child, `${label} entry ${JSON.stringify(entry.name)}`, trustedRoot, findings)) {
      directories.push(Object.freeze({ name: entry.name, path: child }));
    }
  }
  return directories;
}

function doctorInspectionRoot(directory) {
  const resolved = path.resolve(directory);
  let before;
  try {
    before = pathState(resolved);
  } catch {
    return resolved;
  }
  if (!before?.isDirectory() || before.isSymbolicLink()) {
    return resolved;
  }
  try {
    const canonical = realpathSync(resolved);
    const after = pathState(resolved);
    if (
      !after?.isDirectory() ||
      after.isSymbolicLink() ||
      before.dev !== after.dev ||
      before.ino !== after.ino
    ) {
      return resolved;
    }
    return canonical;
  } catch {
    return resolved;
  }
}

function inspectDoctorPluginCache(codexHome) {
  const findings = [];
  const sources = [];
  const resolvedCodexHome = path.resolve(codexHome);
  const inspectionCodexHome = doctorInspectionRoot(resolvedCodexHome);
  const cacheRoot = path.join(resolvedCodexHome, "plugins", "cache");
  const inspectionCacheRoot = path.join(inspectionCodexHome, "plugins", "cache");
  const codexEntries = listDoctorDirectory(inspectionCodexHome, "Codex home", undefined, findings);
  if (codexEntries) {
    const pluginsRoot = path.join(inspectionCodexHome, "plugins");
    if (listDoctorDirectory(pluginsRoot, "Codex plugins directory", inspectionCodexHome, findings)) {
      const marketplaces = doctorPluginDirectories(
        inspectionCacheRoot,
        "Codex plugin cache",
        inspectionCodexHome,
        findings,
      );
      for (const marketplace of marketplaces) {
        const plugins = doctorPluginDirectories(
          marketplace.path,
          `plugin marketplace ${JSON.stringify(marketplace.name)}`,
          inspectionCodexHome,
          findings,
        );
        for (const plugin of plugins) {
          const versions = doctorPluginDirectories(
            plugin.path,
            `plugin ${JSON.stringify(`${marketplace.name}/${plugin.name}`)}`,
            inspectionCodexHome,
            findings,
          );
          for (const version of versions) {
            const skillsRoot = path.join(version.path, "skills");
            const skillEntries = listDoctorDirectory(
              skillsRoot,
              `plugin Skills ${JSON.stringify(`${marketplace.name}/${plugin.name}@${version.name}`)}`,
              inspectionCodexHome,
              findings,
            );
            if (!skillEntries) {
              continue;
            }
            const skillNames = [];
            for (const entry of skillEntries) {
              if (!entry.name.startsWith("kyw-")) {
                continue;
              }
              skillNames.push(entry.name);
              if (!entry.isDirectory() || entry.isSymbolicLink()) {
                findings.push(
                  doctorFinding(
                    "error",
                    "MALFORMED_PLUGIN_SKILL",
                    `Plugin Skill ${JSON.stringify(entry.name)} is not a real directory at ${skillsRoot}`,
                    EXIT_CODES.INVALID_STATE,
                  ),
                );
              }
            }
            if (skillNames.length > 0) {
              sources.push(
                Object.freeze({
                  marketplace: marketplace.name,
                  plugin: plugin.name,
                  version: version.name,
                  skillsRoot: path.join(
                    resolvedCodexHome,
                    path.relative(inspectionCodexHome, skillsRoot),
                  ),
                  skillNames: Object.freeze(skillNames.sort()),
                }),
              );
            }
          }
        }
      }
    }
  }
  let available = false;
  try {
    const cacheState = pathState(inspectionCacheRoot);
    available = Boolean(codexEntries && cacheState?.isDirectory() && !cacheState.isSymbolicLink());
  } catch {
    // The preceding guarded inspection already records an unreadable cache.
  }
  return Object.freeze({
    codexHome: resolvedCodexHome,
    cacheRoot,
    available,
    sources: Object.freeze(sources),
    findings: Object.freeze(findings),
  });
}

function duplicateSkillFinding(scopes, pluginCache) {
  const sourcesBySkill = new Map();
  const addSource = (skillName, source) => {
    const sources = sourcesBySkill.get(skillName) ?? [];
    sources.push(source);
    sourcesBySkill.set(skillName, sources);
  };
  for (const scope of scopes) {
    if (!scope.available) {
      continue;
    }
    for (const skillName of scope.skillNames) {
      addSource(skillName, scope.scope);
    }
  }
  for (const source of pluginCache.sources) {
    const label = `plugin ${JSON.stringify(`${source.marketplace}/${source.plugin}@${source.version}`)}`;
    for (const skillName of source.skillNames) {
      addSource(skillName, label);
    }
  }
  const duplicates = [...sourcesBySkill.entries()]
    .filter(([, sources]) => sources.length > 1)
    .sort(([left], [right]) => left.localeCompare(right));
  if (duplicates.length === 0) {
    return undefined;
  }
  return doctorFinding(
    "error",
    "DUPLICATE_INSTALLATION",
    `Duplicate Skill sources: ${duplicates
      .map(([skillName, sources]) => `${skillName} (${sources.join(", ")})`)
      .join("; ")}`,
    EXIT_CODES.CONFLICT,
  );
}

function nearestExistingDirectory(directory) {
  let current = path.resolve(directory);
  while (!pathState(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
  return current;
}

function inspectDoctorScope(location, { currentVersion, accessChecker = accessSync } = {}) {
  const findings = [];
  try {
    assertLocationLayout(location, "RECOVERY_REQUIRED");
    assertScopeDirectoryChain(location, { errorCode: "RECOVERY_REQUIRED" });
  } catch (error) {
    findings.push(
      doctorFinding(
        "error",
        "UNSAFE_SCOPE",
        `${location.scope} scope path is unsafe: ${error.message}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
    return Object.freeze({
      scope: location.scope,
      available: true,
      skillsRoot: location.skillsRoot,
      installed: false,
      version: undefined,
      skillNames: Object.freeze([]),
      findings: Object.freeze(findings),
    });
  }
  const skills = discoverKywSkills(location.skillsRoot);
  const reserved = listReservedArtifacts(location.skillsRoot);
  const identityCollisions = listManagedRootIdentityCollisions(location.skillsRoot);
  if (identityCollisions.length > 0) {
    findings.push(
      doctorFinding(
        "error",
        "UNSAFE_MANAGED_PATH",
        `${location.scope} scope has case-colliding managed paths: ${identityCollisions.join(", ")}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
  }
  if (reserved.length > 0) {
    findings.push(
      doctorFinding(
        "error",
        "PARTIAL_INSTALL",
        `${location.scope} scope has recoverable transaction artifacts: ${reserved.join(", ")}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
  }

  let metadata;
  const metadataState = pathState(location.metadataPath);
  if (metadataState) {
    try {
      metadata = readInstallMetadata(location, { required: true });
    } catch (error) {
      findings.push(
        doctorFinding("error", error.code, error.message, error.exitCode ?? EXIT_CODES.INVALID_STATE),
      );
    }
  } else if (MANAGED_SKILL_NAMES.some((name) => skills.includes(name)) || directManagedContainers(location).length > 0) {
    findings.push(
      doctorFinding(
        "error",
        "PARTIAL_INSTALL",
        `${location.scope} scope contains kyw-dev paths without ${INSTALL_METADATA_NAME}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
  }

  if (metadata) {
    try {
      const state = inspectManagedInstallation(location, metadata);
      const details = stateConflictSummary(state);
      if (details.length > 0) {
        findings.push(
          doctorFinding(
            "error",
            "PARTIAL_INSTALL",
            `${location.scope} scope managed state is incomplete or modified: ${details.join("; ")}`,
            state.missing.length > 0 || state.unsafe.length > 0
              ? EXIT_CODES.RECOVERY_REQUIRED
              : EXIT_CODES.INVALID_STATE,
          ),
        );
      }
    } catch (error) {
      findings.push(
        doctorFinding(
          "error",
          error.code ?? "PARTIAL_INSTALL",
          error.message,
          error.exitCode ?? EXIT_CODES.RECOVERY_REQUIRED,
        ),
      );
    }
    if (metadata.version !== currentVersion) {
      findings.push(
        doctorFinding(
          "warning",
          "VERSION_DRIFT",
          `${location.scope} scope has kyw-dev ${metadata.version}; current CLI is ${currentVersion}`,
        ),
      );
    }
  }

  for (const skillName of skills) {
    const contractErrors = validateSkillContract(path.join(location.skillsRoot, skillName), skillName, {
      errorCode: "INVALID_INSTALL_METADATA",
      trustedRoot: location.skillsRoot,
    });
    if (contractErrors.length > 0) {
      findings.push(
        doctorFinding(
          "error",
          "MALFORMED_SKILL",
          `${location.scope} scope ${skillName} is malformed: ${contractErrors.join("; ")}`,
          EXIT_CODES.INVALID_STATE,
        ),
      );
    }
  }

  const permissionTarget = nearestExistingDirectory(location.skillsRoot);
  if (permissionTarget) {
    try {
      accessChecker(permissionTarget, fsConstants.R_OK | fsConstants.W_OK);
    } catch (error) {
      findings.push(
        doctorFinding(
          "error",
          "PERMISSION_DENIED",
          `${location.scope} scope is not readable and writable at ${permissionTarget}: ${error.message}`,
          EXIT_CODES.FILESYSTEM,
        ),
      );
    }
  }

  return Object.freeze({
    scope: location.scope,
    available: true,
    skillsRoot: location.skillsRoot,
    installed: Boolean(metadata),
    version: metadata?.version,
    skillNames: Object.freeze(skills),
    findings: Object.freeze(findings),
  });
}

function defaultCommandRunner(command, args) {
  if (process.platform === "win32") {
    if (!/^[a-z0-9-]+$/i.test(command) || JSON.stringify(args) !== JSON.stringify(["--version"])) {
      throw new TypeError("Windows command detection accepts only a fixed tool name and --version");
    }
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `${command} --version`], {
      encoding: "utf8",
    });
  }
  return spawnSync(command, args, { encoding: "utf8" });
}

function detectCommand(command, commandRunner) {
  try {
    const result = commandRunner(command, ["--version"]);
    if (result?.status === 0) {
      return Object.freeze({ available: true, version: String(result.stdout ?? "").trim() || "detected" });
    }
    return Object.freeze({ available: false });
  } catch {
    return Object.freeze({ available: false });
  }
}

export function diagnoseInstallations({
  cwd = process.cwd(),
  home = resolveUserHome(),
  codexHome = path.join(home, ".codex"),
  sourceRoot = PACKAGE_ROOT,
  nodeVersion = process.versions.node,
  commandRunner = defaultCommandRunner,
  accessChecker = accessSync,
} = {}) {
  const findings = [];
  let currentVersion = "unknown";
  try {
    const inventory = buildManagedSourceInventory({ sourceRoot });
    currentVersion = inventory.version;
  } catch (error) {
    findings.push(
      doctorFinding("error", error.code ?? "INVALID_PACKAGE", error.message, EXIT_CODES.INVALID_STATE),
    );
  }

  const runtimeMajor = Number.parseInt(String(nodeVersion).split(".")[0], 10);
  if (!Number.isInteger(runtimeMajor) || runtimeMajor < 22) {
    findings.push(
      doctorFinding(
        "error",
        "UNSUPPORTED_RUNTIME",
        `Node.js 22 or newer is required; current runtime is ${nodeVersion ?? "unknown"}`,
        EXIT_CODES.UNSUPPORTED_RUNTIME,
      ),
    );
  }
  const npm = detectCommand("npm", commandRunner);
  const codex = detectCommand("codex", commandRunner);
  if (!npm.available) {
    findings.push(doctorFinding("warning", "NPM_NOT_DETECTED", "npm was not detected on PATH"));
  }
  if (!codex.available) {
    findings.push(doctorFinding("warning", "CODEX_NOT_DETECTED", "Codex was not detected on PATH"));
  }

  const scopes = [];
  let userLocation;
  try {
    userLocation = resolveInstallLocation({ scope: "user", home });
    scopes.push(inspectDoctorScope(userLocation, { currentVersion, accessChecker }));
  } catch (error) {
    const fallbackLocation = resolveScopeLayout({ scope: "user", home, repositoryRoot: undefined });
    const finding = doctorFinding(
      "error",
      "UNSAFE_SCOPE",
      `user scope could not be resolved safely: ${error.message}`,
      error.exitCode ?? EXIT_CODES.SCOPE_RESOLUTION,
    );
    scopes.push(
      Object.freeze({
        scope: "user",
        available: true,
        skillsRoot: fallbackLocation.skillsRoot,
        installed: false,
        version: undefined,
        skillNames: Object.freeze([]),
        findings: Object.freeze([finding]),
      }),
    );
  }
  let projectRoot;
  try {
    projectRoot = findRepositoryRoot(cwd);
    const projectLocation = resolveInstallLocation({
      scope: "project",
      home,
      repositoryRoot: projectRoot,
    });
    scopes.push(inspectDoctorScope(projectLocation, { currentVersion, accessChecker }));
  } catch (error) {
    if (error.code === "SCOPE_RESOLUTION_FAILED") {
      const noRepository = /^No Git repository root was found/.test(error.message);
      const scopeFindings = noRepository
        ? []
        : [
            doctorFinding(
              "error",
              "UNSAFE_SCOPE",
              `project scope could not be resolved safely: ${error.message}`,
              error.exitCode ?? EXIT_CODES.SCOPE_RESOLUTION,
            ),
          ];
      scopes.push(
        Object.freeze({
          scope: "project",
          available: false,
          skillsRoot: undefined,
          installed: false,
          version: undefined,
          skillNames: Object.freeze([]),
          findings: Object.freeze(scopeFindings),
        }),
      );
    } else {
      throw error;
    }
  }
  for (const scopeResult of scopes) {
    findings.push(...scopeResult.findings);
  }

  const pluginCache = inspectDoctorPluginCache(codexHome);
  findings.push(...pluginCache.findings);
  const duplicate = duplicateSkillFinding(scopes, pluginCache);
  if (duplicate) {
    findings.push(duplicate);
  }

  const exitCode = findings.reduce((highest, finding) => Math.max(highest, finding.exitCode ?? 0), 0);
  return Object.freeze({
    version: currentVersion,
    runtime: Object.freeze({ node: nodeVersion, npm, codex }),
    projectRoot,
    scopes: Object.freeze(scopes),
    pluginCache,
    findings: Object.freeze(findings),
    exitCode,
  });
}

export function formatDoctorReport(report) {
  const lines = [
    `kyw-dev doctor ${report.version}`,
    `Node: ${report.runtime.node}`,
    `npm: ${report.runtime.npm.available ? report.runtime.npm.version : "not detected"}`,
    `Codex: ${report.runtime.codex.available ? report.runtime.codex.version : "not detected"}`,
    "Scopes:",
  ];
  for (const scope of report.scopes) {
    if (!scope.available) {
      lines.push(
        `  ${scope.scope}: unavailable (${scope.findings.length > 0 ? "unsafe scope" : "not inside a Git repository"})`,
      );
    } else if (scope.installed) {
      lines.push(`  ${scope.scope}: ${scope.skillsRoot} (installed ${scope.version})`);
    } else {
      lines.push(`  ${scope.scope}: ${scope.skillsRoot} (not managed)`);
    }
  }
  lines.push("Plugin Skills:");
  if (report.pluginCache.sources.length === 0) {
    lines.push(`  none (${report.pluginCache.cacheRoot})`);
  } else {
    for (const source of report.pluginCache.sources) {
      lines.push(
        `  ${source.marketplace}/${source.plugin}@${source.version}: ${source.skillNames.join(", ")} (${source.skillsRoot})`,
      );
    }
  }
  lines.push("Findings:");
  if (report.findings.length === 0) {
    lines.push("  none");
  } else {
    for (const finding of report.findings) {
      lines.push(`  [${finding.severity.toUpperCase()} ${finding.code}] ${finding.message}`);
    }
  }
  lines.push(`Result: ${report.exitCode === 0 ? "healthy" : `issues found (exit ${report.exitCode})`}`);
  return `${lines.join("\n")}\n`;
}
