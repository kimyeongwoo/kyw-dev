import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
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
const packageName = "kyw-dev";
const semanticVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

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

function hashFile(filePath) {
  return hashBuffer(readFileSync(filePath));
}

function normalizedComparable(filePath, pathApi = path) {
  const resolved = pathApi.resolve(filePath);
  return pathApi.sep === "\\" ? resolved.toLowerCase() : resolved;
}

function isPathInside(root, candidate, pathApi = path) {
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${pathApi.sep}`) && relative !== ".." && !pathApi.isAbsolute(relative));
}

export function normalizeManagedPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw installationError("INVALID_INSTALL_METADATA", "Managed file paths must be non-empty strings");
  }
  if (relativePath.includes("\\") || path.posix.isAbsolute(relativePath)) {
    throw installationError(
      "INVALID_INSTALL_METADATA",
      `Managed file path must use relative POSIX separators: ${relativePath}`,
    );
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\0"))) {
    throw installationError("INVALID_INSTALL_METADATA", `Unsafe managed file path: ${relativePath}`);
  }
  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath) {
    throw installationError("INVALID_INSTALL_METADATA", `Managed file path is not normalized: ${relativePath}`);
  }
  return normalized;
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

export function resolveUserHome({ env = process.env, platform = process.platform } = {}) {
  const configured = platform === "win32" ? env.USERPROFILE || env.HOME : env.HOME;
  const value = configured || homedir();
  if (typeof value !== "string" || !value.trim()) {
    throw installationError("SCOPE_RESOLUTION_FAILED", "Cannot resolve the current user's home directory");
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
    if (state.isDirectory() || state.isFile()) {
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
  return resolveScopeLayout({ scope, home, repositoryRoot: resolvedRepositoryRoot });
}

function readJson(filePath, errorCode, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw installationError(errorCode, `${label} is not valid JSON at ${filePath}: ${error.message}`, error);
  }
}

function validateSkillContract(skillDirectory, skillName) {
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
  const skill = readFileSync(skillPath, "utf8");
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
  const metadata = readFileSync(metadataPath, "utf8");
  if (!metadata.includes("policy:\n  allow_implicit_invocation: false\n")) {
    errors.push(`${skillName}/agents/openai.yaml must disable implicit invocation`);
  }
  return errors;
}

function collectSourceTree(sourceDirectory, targetPrefix) {
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
      if (entry.isSymbolicLink()) {
        throw installationError("INVALID_PACKAGE", `Packaged source must not contain symlinks: ${sourcePath}`);
      }
      if (entry.isDirectory()) {
        visit(sourcePath, relativePath);
      } else if (entry.isFile()) {
        const targetPath = normalizeManagedPath(`${targetPrefix}/${relativePath}`);
        const state = lstatSync(sourcePath);
        files.push(
          Object.freeze({
            path: targetPath,
            sourcePath,
            sha256: hashFile(sourcePath),
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
  const pluginJson = readJson(pluginPath, "INVALID_PACKAGE", "Plugin manifest");
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
  const packageJson = readJson(path.join(resolvedRoot, "package.json"), "INVALID_PACKAGE", "package.json");
  validatePluginPackage(resolvedRoot, packageJson);

  const files = [];
  for (const skillName of MANAGED_SKILL_NAMES) {
    const skillDirectory = path.join(resolvedRoot, "skills", skillName);
    const contractErrors = validateSkillContract(skillDirectory, skillName);
    if (contractErrors.length > 0) {
      throw installationError("INVALID_PACKAGE", `Packaged Skill ${skillName} is malformed:\n- ${contractErrors.join("\n- ")}`);
    }
    files.push(...collectSourceTree(skillDirectory, skillName));
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
        sha256: hashFile(sourcePath),
        mode: state.mode & 0o777,
      }),
    );
  }
  files.push(...collectSourceTree(path.join(resolvedRoot, "templates"), ".kyw-dev/runtime/templates"));
  files.sort((left, right) => left.path.localeCompare(right.path));

  const paths = new Set();
  for (const file of files) {
    if (!isAllowedManagedPath(file.path)) {
      throw installationError("INVALID_PACKAGE", `Packaged inventory escaped managed containers: ${file.path}`);
    }
    if (paths.has(file.path)) {
      throw installationError("INVALID_PACKAGE", `Packaged inventory contains duplicate path: ${file.path}`);
    }
    paths.add(file.path);
  }
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

  const filePaths = new Set();
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
      if (filePaths.has(file.path)) {
        errors.push(`duplicate managed file path: ${file.path}`);
      }
      filePaths.add(file.path);
      if (!sha256Pattern.test(file.sha256 ?? "")) {
        errors.push(`managed file has invalid SHA-256: ${file.path}`);
      }
    }
  }
  return errors;
}

export function readInstallMetadata(location, { required = false } = {}) {
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
  const metadata = readJson(location.metadataPath, "INVALID_INSTALL_METADATA", "Installation metadata");
  const errors = validateInstallMetadata(metadata, { expectedScope: location.scope });
  if (errors.length > 0) {
    throw installationError(
      "INVALID_INSTALL_METADATA",
      `Installation metadata is malformed at ${location.metadataPath}:\n- ${errors.join("\n- ")}`,
    );
  }
  return metadata;
}

function assertRealDirectory(directory, label) {
  const state = pathState(directory);
  if (!state) {
    return false;
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    throw installationError("FILESYSTEM_ERROR", `${label} must be a real directory: ${directory}`);
  }
  return true;
}

function ensureScopeDirectories(location) {
  if (!assertRealDirectory(location.baseDirectory, "Scope root")) {
    throw installationError("SCOPE_RESOLUTION_FAILED", `Scope root does not exist: ${location.baseDirectory}`);
  }
  for (const [directory, label] of [
    [location.agentsRoot, "Agents directory"],
    [location.skillsRoot, "Skills directory"],
  ]) {
    if (!assertRealDirectory(directory, label)) {
      mkdirSync(directory);
    }
  }
}

function assertSafeManagedParents(root, relativePath, { create = false } = {}) {
  const normalized = normalizeManagedPath(relativePath);
  const segments = normalized.split("/").slice(0, -1);
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    const state = pathState(current);
    if (!state) {
      if (!create) {
        return;
      }
      mkdirSync(current);
      continue;
    }
    if (state.isSymbolicLink() || !state.isDirectory()) {
      throw installationError("FILESYSTEM_ERROR", `Managed path parent is unsafe: ${current}`);
    }
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

function scanManagedContainer(location, containerPath, knownFiles, knownDirectories, result) {
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

  function visit(directory, relativeDirectory) {
    const entries = readdirSync(directory, { withFileTypes: true });
    if (entries.length === 0 && !knownDirectories.has(relativeDirectory)) {
      result.unknown.push(`${relativeDirectory}/`);
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = `${relativeDirectory}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        if (knownFiles.has(relative) || knownDirectories.has(relative)) {
          result.unsafe.push(relative);
        } else {
          result.unknown.push(relative);
        }
      } else if (entry.isDirectory()) {
        if (!knownDirectories.has(relative)) {
          result.unknown.push(`${relative}/`);
        }
        visit(absolute, relative);
      } else if (entry.isFile()) {
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
  const knownFiles = new Set(metadata.files.map((file) => file.path));
  const knownDirectories = knownManagedDirectories(knownFiles);
  const result = {
    missing: [],
    modified: [],
    unknown: [],
    unsafe: [],
    missingContainers: [],
    existingFiles: new Map(),
  };

  for (const file of metadata.files) {
    const target = resolveManagedPath(location.skillsRoot, file.path);
    const state = pathState(target);
    if (!state) {
      result.missing.push(file.path);
      continue;
    }
    if (state.isSymbolicLink() || !state.isFile()) {
      result.unsafe.push(file.path);
      continue;
    }
    const actualHash = hashFile(target);
    result.existingFiles.set(file.path, actualHash);
    if (actualHash !== file.sha256) {
      result.modified.push(file.path);
    }
  }

  for (const container of [...MANAGED_SKILL_NAMES, ".kyw-dev/runtime"]) {
    scanManagedContainer(location, container, knownFiles, knownDirectories, result);
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
      (name) =>
        name === TRANSACTION_NAME ||
        name === TRANSACTION_COMPLETE_NAME ||
        name.startsWith(stagePrefix) ||
        name.startsWith(backupPrefix),
    )
    .sort();
}

function validateTransactionName(name, prefix) {
  if (typeof name !== "string" || !name.startsWith(prefix) || !/^[-.a-z0-9]+$/i.test(name)) {
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
    try {
      validateTransactionName(transaction.stageDirectory, stagePrefix);
      validateTransactionName(transaction.backupDirectory, backupPrefix);
    } catch (error) {
      errors.push(error.message);
    }
    for (const key of ["oldFiles", "newFiles"]) {
      if (!Array.isArray(transaction[key])) {
        errors.push(`${key} must be an array`);
        continue;
      }
      const seen = new Set();
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
        if (seen.has(entry.path)) {
          errors.push(`${key} contains duplicate path: ${entry.path}`);
        }
        seen.add(entry.path);
      }
    }
    if (typeof transaction.hadOldMetadata !== "boolean") {
      errors.push("hadOldMetadata must be boolean");
    }
    for (const key of ["oldMetadataHash", "newMetadataHash"]) {
      if (transaction[key] !== null && !sha256Pattern.test(transaction[key] ?? "")) {
        errors.push(`${key} must be null or a SHA-256 hash`);
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

function removeReservedDirectory(location, name, prefix) {
  validateTransactionName(name, prefix);
  const directory = path.resolve(location.skillsRoot, name);
  if (!isPathInside(location.skillsRoot, directory) || directory === path.resolve(location.skillsRoot)) {
    throw installationError("RECOVERY_REQUIRED", `Refusing to remove unsafe transaction directory: ${directory}`);
  }
  const state = pathState(directory);
  if (!state) {
    return;
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    throw installationError("RECOVERY_REQUIRED", `Transaction path is not a real directory: ${directory}`);
  }
  rmSync(directory, { recursive: true, force: true });
}

function removeKnownFile(filePath, expectedHash, label) {
  const state = pathState(filePath);
  if (!state) {
    return;
  }
  if (state.isSymbolicLink() || !state.isFile()) {
    throw installationError("RECOVERY_REQUIRED", `Cannot recover through unsafe ${label}: ${filePath}`);
  }
  if (hashFile(filePath) !== expectedHash) {
    throw installationError(
      "RECOVERY_REQUIRED",
      `Cannot remove concurrently modified ${label} during recovery: ${filePath}`,
    );
  }
  unlinkSync(filePath);
}

function pruneManagedDirectories(location, filePaths) {
  const directories = [...knownManagedDirectories(filePaths)]
    .sort((left, right) => right.split("/").length - left.split("/").length || right.localeCompare(left));
  for (const relativeDirectory of directories) {
    const directory = resolveManagedPath(location.skillsRoot, relativeDirectory);
    const state = pathState(directory);
    if (!state || state.isSymbolicLink() || !state.isDirectory()) {
      continue;
    }
    try {
      rmdirSync(directory);
    } catch (error) {
      if (!["ENOTEMPTY", "ENOENT", "EEXIST"].includes(error.code)) {
        throw error;
      }
    }
  }
}

function cleanupPublishedTransaction(location, transaction) {
  removeReservedDirectory(location, transaction.stageDirectory, stagePrefix);
  removeReservedDirectory(location, transaction.backupDirectory, backupPrefix);
  if (existsSync(location.transactionPath)) {
    unlinkSync(location.transactionPath);
  }
  if (existsSync(location.transactionCompletePath)) {
    unlinkSync(location.transactionCompletePath);
  }
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

function rollbackPublishedTransaction(location, transaction) {
  const stageRoot = path.join(location.skillsRoot, transaction.stageDirectory);
  const backupRoot = path.join(location.skillsRoot, transaction.backupDirectory);
  const commitStartedPath = path.join(backupRoot, commitStartedName);
  const commitStarted = pathState(commitStartedPath)?.isFile() ?? false;
  const oldByPath = new Map(transaction.oldFiles.map((entry) => [entry.path, entry]));

  if (commitStarted) {
    for (const entry of transaction.newFiles) {
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      const backup = resolveManagedPath(backupRoot, entry.path);
      if (pathState(backup)) {
        removeKnownFile(target, entry.sha256, "new managed file");
      } else if (!oldByPath.has(entry.path)) {
        removeKnownFile(target, entry.sha256, "new managed file");
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
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      if (pathState(target)) {
        throw installationError("RECOVERY_REQUIRED", `Cannot restore managed file over unexpected path: ${target}`);
      }
      assertSafeManagedParents(location.skillsRoot, entry.path, { create: true });
      renameSync(backup, target);
    }

    const backupMetadata = path.join(backupRoot, INSTALL_METADATA_NAME);
    if (transaction.hadOldMetadata && pathState(backupMetadata)?.isFile()) {
      if (pathState(location.metadataPath)) {
        removeKnownFile(location.metadataPath, transaction.newMetadataHash, "new installation metadata");
      }
      renameSync(backupMetadata, location.metadataPath);
    } else if (!transaction.hadOldMetadata && transaction.newMetadataHash && pathState(location.metadataPath)) {
      removeKnownFile(location.metadataPath, transaction.newMetadataHash, "new installation metadata");
    }
    pruneManagedDirectories(
      location,
      [...transaction.oldFiles, ...transaction.newFiles].map((entry) => entry.path),
    );
  }

  removeReservedDirectory(location, transaction.stageDirectory, stagePrefix);
  removeReservedDirectory(location, transaction.backupDirectory, backupPrefix);
  if (pathState(location.transactionCompletePath)) {
    unlinkSync(location.transactionCompletePath);
  }
  unlinkSync(location.transactionPath);
  return Object.freeze({ recovered: true, action: commitStarted ? "rolled-back" : "discarded-stage" });
}

export function recoverInterruptedInstallation(location) {
  const skillsState = pathState(location.skillsRoot);
  if (!skillsState) {
    return Object.freeze({ recovered: false, action: "none" });
  }
  if (skillsState.isSymbolicLink() || !skillsState.isDirectory()) {
    throw installationError("RECOVERY_REQUIRED", `Skills root is unsafe: ${location.skillsRoot}`);
  }

  const transactionState = pathState(location.transactionPath);
  if (!transactionState) {
    const completeState = pathState(location.transactionCompletePath);
    if (completeState) {
      if (completeState.isSymbolicLink() || !completeState.isFile()) {
        throw installationError(
          "RECOVERY_REQUIRED",
          `Transaction completion marker is unsafe: ${location.transactionCompletePath}`,
        );
      }
      unlinkSync(location.transactionCompletePath);
    }
    const leftovers = listReservedArtifacts(location.skillsRoot).filter(
      (name) => name.startsWith(stagePrefix) || name.startsWith(backupPrefix),
    );
    if (leftovers.length > 0) {
      throw installationError(
        "RECOVERY_REQUIRED",
        `Orphaned kyw-dev transaction paths require manual inspection: ${leftovers.join(", ")}`,
      );
    }
    return Object.freeze({ recovered: false, action: "none" });
  }
  if (transactionState.isSymbolicLink() || !transactionState.isFile()) {
    throw installationError("RECOVERY_REQUIRED", `Transaction journal is unsafe: ${location.transactionPath}`);
  }
  let transaction;
  try {
    transaction = validateTransaction(JSON.parse(readFileSync(location.transactionPath, "utf8")), location);
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

  if (transaction.processId !== process.pid && isProcessAlive(transaction.processId)) {
    throw installationError(
      "INSTALL_CONFLICT",
      `Another kyw-dev ${transaction.operation} process (${transaction.processId}) owns ${location.transactionPath}`,
    );
  }

  if (pathState(location.transactionCompletePath)?.isFile()) {
    cleanupPublishedTransaction(location, transaction);
    return Object.freeze({ recovered: true, action: "completed-cleanup" });
  }
  return rollbackPublishedTransaction(location, transaction);
}

function writeTransactionJournal(location, transaction) {
  try {
    writeFileSync(location.transactionPath, serializeJson(transaction), { encoding: "utf8", flag: "wx" });
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
}

function stageTransactionFiles(stageRoot, newFiles, metadataText) {
  for (const entry of newFiles) {
    const staged = resolveManagedPath(stageRoot, entry.path);
    assertSafeManagedParents(stageRoot, entry.path, { create: true });
    copyFileSync(entry.sourcePath, staged);
    try {
      chmodSync(staged, entry.mode);
    } catch (error) {
      if (error.code !== "EPERM") {
        throw error;
      }
    }
    if (hashFile(staged) !== entry.sha256) {
      throw installationError("FILESYSTEM_ERROR", `Staged file hash mismatch: ${entry.path}`);
    }
  }
  if (metadataText !== undefined) {
    writeFileSync(path.join(stageRoot, INSTALL_METADATA_NAME), metadataText, { encoding: "utf8", flag: "wx" });
  }
}

function assertCurrentTransactionInputs(location, transaction) {
  for (const entry of transaction.oldFiles) {
    const target = resolveManagedPath(location.skillsRoot, entry.path);
    const state = pathState(target);
    if (!state?.isFile() || state.isSymbolicLink() || hashFile(target) !== entry.sha256) {
      throw installationError("INSTALL_CONFLICT", `Managed file changed before commit: ${target}`);
    }
  }
  const oldPaths = new Set(transaction.oldFiles.map((entry) => entry.path));
  for (const entry of transaction.newFiles) {
    if (oldPaths.has(entry.path)) {
      continue;
    }
    const target = resolveManagedPath(location.skillsRoot, entry.path);
    if (pathState(target)) {
      throw installationError("INSTALL_CONFLICT", `Unmanaged path appeared before commit: ${target}`);
    }
  }
  const metadataState = pathState(location.metadataPath);
  if (transaction.hadOldMetadata) {
    if (!metadataState?.isFile() || metadataState.isSymbolicLink() || hashFile(location.metadataPath) !== transaction.oldMetadataHash) {
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
    stageDirectory,
    backupDirectory,
    oldFiles: Object.freeze(oldFiles.map(({ path: filePath, sha256 }) => Object.freeze({ path: filePath, sha256 }))),
    newFiles: Object.freeze(newFiles.map(({ path: filePath, sha256 }) => Object.freeze({ path: filePath, sha256 }))),
    hadOldMetadata: oldMetadataHash !== null,
    oldMetadataHash,
    newMetadataHash,
  });

  writeTransactionJournal(location, transaction);
  try {
    mkdirSync(stageRoot);
    mkdirSync(backupRoot);
    hooks.afterJournalCreated?.({ operation, location, transaction });
    stageTransactionFiles(stageRoot, newFiles, metadataText);
    hooks.afterStagePrepared?.({ operation, location, transaction });

    assertCurrentTransactionInputs(location, transaction);
    writeFileSync(path.join(backupRoot, commitStartedName), "commit started\n", { encoding: "utf8", flag: "wx" });
    hooks.afterCommitStarted?.({ operation, location, transaction });

    for (const [index, entry] of oldFiles.entries()) {
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      const backup = resolveManagedPath(backupRoot, entry.path);
      assertSafeManagedParents(backupRoot, entry.path, { create: true });
      renameSync(target, backup);
      hooks.afterOldFileMoved?.({ operation, location, transaction, entry, index });
    }
    for (const [index, entry] of newFiles.entries()) {
      const staged = resolveManagedPath(stageRoot, entry.path);
      const target = resolveManagedPath(location.skillsRoot, entry.path);
      assertSafeManagedParents(location.skillsRoot, entry.path, { create: true });
      if (pathState(target)) {
        throw installationError("INSTALL_CONFLICT", `Refusing to replace unexpected path: ${target}`);
      }
      renameSync(staged, target);
      hooks.afterNewFileMoved?.({ operation, location, transaction, entry, index });
    }
    pruneManagedDirectories(
      location,
      [...oldFiles, ...newFiles].map((entry) => entry.path),
    );

    if (oldMetadataHash !== null) {
      renameSync(location.metadataPath, path.join(backupRoot, INSTALL_METADATA_NAME));
    }
    if (metadataText !== undefined) {
      renameSync(path.join(stageRoot, INSTALL_METADATA_NAME), location.metadataPath);
    }
    hooks.afterMetadataCommitted?.({ operation, location, transaction });

    writeFileSync(location.transactionCompletePath, "commit complete\n", { encoding: "utf8", flag: "wx" });
    hooks.afterCommitComplete?.({ operation, location, transaction });
    cleanupPublishedTransaction(location, transaction);
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
      .map((entry) => ({ path: entry.path, sha256: state.existingFiles.get(entry.path) })),
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
      oldMetadataHash: hashFile(location.metadataPath),
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
      oldMetadataHash: hashFile(location.metadataPath),
      metadataText: undefined,
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
  const skills = discoverKywSkills(location.skillsRoot);
  const reserved = listReservedArtifacts(location.skillsRoot);
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
    const contractErrors = validateSkillContract(path.join(location.skillsRoot, skillName), skillName);
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

  const userLocation = resolveScopeLayout({ scope: "user", home, repositoryRoot: undefined });
  const scopes = [inspectDoctorScope(userLocation, { currentVersion, accessChecker })];
  let projectRoot;
  try {
    projectRoot = findRepositoryRoot(cwd);
    const projectLocation = resolveScopeLayout({ scope: "project", home, repositoryRoot: projectRoot });
    scopes.push(inspectDoctorScope(projectLocation, { currentVersion, accessChecker }));
  } catch (error) {
    if (error.code === "SCOPE_RESOLUTION_FAILED") {
      scopes.push(
        Object.freeze({
          scope: "project",
          available: false,
          skillsRoot: undefined,
          installed: false,
          version: undefined,
          skillNames: Object.freeze([]),
          findings: Object.freeze([]),
        }),
      );
    } else {
      throw error;
    }
  }
  for (const scopeResult of scopes) {
    findings.push(...scopeResult.findings);
  }

  const userScope = scopes.find((entry) => entry.scope === "user");
  const projectScope = scopes.find((entry) => entry.scope === "project" && entry.available);
  if (projectScope && normalizedComparable(userScope.skillsRoot) !== normalizedComparable(projectScope.skillsRoot)) {
    const duplicates = userScope.skillNames.filter((name) => projectScope.skillNames.includes(name));
    if (duplicates.length > 0) {
      findings.push(
        doctorFinding(
          "error",
          "DUPLICATE_INSTALLATION",
          `Duplicate user/project Skills: ${duplicates.join(", ")}`,
          EXIT_CODES.CONFLICT,
        ),
      );
    }
  }

  const exitCode = findings.reduce((highest, finding) => Math.max(highest, finding.exitCode ?? 0), 0);
  return Object.freeze({
    version: currentVersion,
    runtime: Object.freeze({ node: nodeVersion, npm, codex }),
    projectRoot,
    scopes: Object.freeze(scopes),
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
      lines.push(`  ${scope.scope}: unavailable (not inside a Git repository)`);
    } else if (scope.installed) {
      lines.push(`  ${scope.scope}: ${scope.skillsRoot} (installed ${scope.version})`);
    } else {
      lines.push(`  ${scope.scope}: ${scope.skillsRoot} (not managed)`);
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
