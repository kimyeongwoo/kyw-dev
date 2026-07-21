import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path, { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_TARBALL_FILES,
  PRESERVED_LEGAL_HASHES,
  RELEASE_METADATA,
  REPOSITORY_ROOT,
} from "./lib/validate-foundation.mjs";

export const ISOLATION_ERROR_CODES = Object.freeze({
  AMBIENT_STATE_CHANGED: "AMBIENT_STATE_CHANGED",
  CLEANUP_GUARD: "CLEANUP_GUARD",
  CHILD_FAILED: "CHILD_FAILED",
  ISOLATION_VIOLATION: "ISOLATION_VIOLATION",
  ISOLATION_PATH_GUARD: "ISOLATION_PATH_GUARD",
  MARKETPLACE_UNAVAILABLE: "MARKETPLACE_UNAVAILABLE",
  NORMAL_STATE_SNAPSHOT_FAILED: "NORMAL_STATE_SNAPSHOT_FAILED",
  PACKAGE_INVALID: "PACKAGE_INVALID",
});

export const ISOLATION_OUTCOMES = Object.freeze({
  CLEAN: "CLEAN",
  ISOLATION_VIOLATION: "ISOLATION_VIOLATION",
  AMBIENT_STATE_CHANGED: "AMBIENT_STATE_CHANGED",
});

const managedSkillNames = Object.freeze(["kyw-audit", "kyw-grilling", "kyw-init", "kyw-task"]);
const attributionIdentifiers = Object.freeze([
  "kyw-dev-local",
  "kyw-dev",
  ...managedSkillNames,
]);
const maximumDisplayedDifferences = 20;
const maximumSafeRelativePathLength = 240;
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
const forbiddenPackageRoots = Object.freeze([
  ".agents",
  ".github",
  ".npmrc",
  "DOCUMENT_BUNDLE.txt",
  "auth.json",
  "docs",
  "eval",
  "scripts",
  "test",
]);
const packedTextPatterns = Object.freeze([
  {
    label: "credential-shaped token",
    pattern:
      /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,})\b/,
  },
  {
    label: "private key",
    pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/,
  },
  {
    label: "credential assignment",
    pattern: /(?:^|\s)(?:_authToken|npmAuthToken|password|passwd)\s*[:=]\s*["']?[^<\s"']{8,}/im,
  },
  {
    label: "Windows absolute path",
    pattern: /(?:^|[\s"'(=])[A-Za-z]:[\\/][^\s"'`)]+/m,
  },
  {
    label: "UNC absolute path",
    pattern: /(?:^|[\s"'(=])\\\\[^\\\s]+\\[^\s"'`)]+/m,
  },
  {
    label: "local POSIX absolute path",
    pattern: /(?:^|[\s"'(=])\/(?:Users|home|root|tmp|private\/tmp)\/[^\s"'`)]+/m,
  },
  {
    label: "local file dependency",
    pattern: /\bfile:(?:\.\.?[\\/]|\/|[A-Za-z]:[\\/])/i,
  },
]);
const isolatedEnvironmentKeys = Object.freeze([
  "HOME",
  "USERPROFILE",
  "HOMEDRIVE",
  "HOMEPATH",
  "CODEX_HOME",
  "npm_config_userconfig",
  "npm_config_cache",
  "NPM_CONFIG_USERCONFIG",
  "NPM_CONFIG_CACHE",
  "TEMP",
  "TMP",
  "TMPDIR",
  "XDG_CONFIG_HOME",
  "XDG_CACHE_HOME",
]);
const temporaryPrefix = "kyw-dev-release-gate-";
const codexControlNames = new Set([
  ".codex-global-state.json",
  ".codex-global-state.json.bak",
  ".personality_migration",
  "AGENTS.md",
  "auth.json",
  "chrome-native-hosts-v2.json",
  "config.toml",
  "config.toml.bak",
  "config.toml.bak2",
  "installation_id",
  "plugins",
  "skills",
  "vendor_imports",
  "version.json",
]);
const windowsCodexControlNames = new Set(
  [...codexControlNames].map((name) => name.toLowerCase()),
);

export class ReleaseGateIsolationError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "ReleaseGateIsolationError";
    this.code = code;
    for (const property of ["status", "retryable", "inconclusive", "attempts", "history", "isolation"]) {
      if (Object.hasOwn(options, property)) {
        this[property] = options[property];
      }
    }
  }
}

function isolationError(code, message, cause, details = {}) {
  return new ReleaseGateIsolationError(code, message, {
    ...details,
    ...(cause ? { cause } : {}),
  });
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function environmentValue(environment, requestedName) {
  if (typeof environment?.[requestedName] === "string" && environment[requestedName].trim()) {
    return environment[requestedName];
  }
  const normalizedName = requestedName.toLowerCase();
  for (const [name, value] of Object.entries(environment ?? {})) {
    if (name.toLowerCase() === normalizedName && typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function comparisonOptions(platform = process.platform) {
  return {
    platform,
    pathApi: platform === "win32" ? path.win32 : path.posix,
  };
}

export function normalizePathIdentity(filePath, options = {}) {
  const { platform, pathApi } = { ...comparisonOptions(options.platform), ...options };
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw isolationError(ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD, "Path identity requires a value");
  }
  let normalized = pathApi.normalize(pathApi.resolve(filePath));
  const root = pathApi.parse(normalized).root;
  while (normalized.length > root.length && normalized.endsWith(pathApi.sep)) {
    normalized = normalized.slice(0, -1);
  }
  return platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function isSameOrDescendant(rootPath, candidatePath, options = {}) {
  const { pathApi } = { ...comparisonOptions(options.platform), ...options };
  const normalizedRoot = normalizePathIdentity(rootPath, options);
  const normalizedCandidate = normalizePathIdentity(candidatePath, options);
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}${pathApi.sep}`)
  );
}

function isStrictDescendant(rootPath, candidatePath, options = {}) {
  return (
    normalizePathIdentity(rootPath, options) !== normalizePathIdentity(candidatePath, options) &&
    isSameOrDescendant(rootPath, candidatePath, options)
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
    dev: String(stats.dev),
    ino: String(stats.ino),
    birthtimeNs: String(stats.birthtimeNs),
  });
}

function sameStatIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.birthtimeNs === right.birthtimeNs;
}

function metadataFingerprint(stats) {
  return [
    String(stats.dev),
    String(stats.ino),
    String(stats.mode),
    String(stats.nlink),
    String(stats.size),
    String(stats.mtimeNs),
    String(stats.ctimeNs),
    String(stats.birthtimeNs),
  ].join(":");
}

function realAlias(filePath) {
  try {
    return realpathSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function addProtectedLocation(entries, seen, label, filePath, options, mode = "tree") {
  const absolutePath = resolve(filePath);
  const aliases = [absolutePath];
  const resolvedAlias = realAlias(absolutePath);
  if (resolvedAlias) {
    aliases.push(resolvedAlias);
  }
  for (const alias of aliases) {
    const identity = normalizePathIdentity(alias, options);
    if (seen.has(identity)) {
      continue;
    }
    seen.add(identity);
    entries.push(
      Object.freeze({
        label: entries.some((entry) => entry.label === label) ? `${label}-real` : label,
        mode,
        path: alias,
      }),
    );
  }
}

export function resolveProtectedLocations({
  environment = process.env,
  platform = process.platform,
  processDirectory = process.cwd(),
} = {}) {
  const options = comparisonOptions(platform);
  const configuredUserRoot =
    platform === "win32"
      ? environmentValue(environment, "USERPROFILE") ?? environmentValue(environment, "HOME")
      : environmentValue(environment, "HOME") ?? environmentValue(environment, "USERPROFILE");
  const normalUserRoot = resolve(configuredUserRoot ?? homedir());
  const configuredCodexValue = environmentValue(environment, "CODEX_HOME");
  const configuredNpmValue = environmentValue(environment, "npm_config_userconfig");
  const defaultNpmUserconfig = join(normalUserRoot, ".npmrc");
  const entries = [];
  const seen = new Set();

  addProtectedLocation(entries, seen, "normal-agents", join(normalUserRoot, ".agents"), options);
  addProtectedLocation(
    entries,
    seen,
    "normal-codex",
    join(normalUserRoot, ".codex"),
    options,
    "codex-control",
  );
  if (configuredCodexValue) {
    addProtectedLocation(
      entries,
      seen,
      "configured-codex",
      resolve(processDirectory, configuredCodexValue),
      options,
      "codex-control",
    );
  }
  addProtectedLocation(entries, seen, "default-npm-userconfig", defaultNpmUserconfig, options);
  if (configuredNpmValue) {
    addProtectedLocation(
      entries,
      seen,
      "configured-npm-userconfig",
      resolve(processDirectory, configuredNpmValue),
      options,
    );
  }

  return Object.freeze({
    normalUserRoot,
    entries: Object.freeze(entries),
    platform,
  });
}

function assertTemporaryParent(temporaryParent, protectedLocations) {
  const options = comparisonOptions(protectedLocations.platform);
  const absoluteParent = resolve(temporaryParent);
  const state = pathState(absoluteParent);
  if (!state?.isDirectory() || state.isSymbolicLink()) {
    throw isolationError(
      ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
      "Approved temporary parent must be an existing real directory",
    );
  }
  const realParent = realpathSync(absoluteParent);
  for (const protectedLocation of protectedLocations.entries) {
    if (isSameOrDescendant(protectedLocation.path, realParent, options)) {
      throw isolationError(
        ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
        `Approved temporary parent collides with protected ${protectedLocation.label}`,
      );
    }
  }
  return realParent;
}

function targetValue(approvedTemporaryRoot, overrides, name, ...segments) {
  return resolve(overrides?.[name] ?? join(approvedTemporaryRoot, ...segments));
}

function createIsolationPlan({ approvedTemporaryRoot, approvedTemporaryParent, rootIdentity, overrides }) {
  const isolatedUserRoot = targetValue(approvedTemporaryRoot, overrides, "isolatedUserRoot", "user");
  const isolatedCodexRoot = targetValue(approvedTemporaryRoot, overrides, "isolatedCodexRoot", "codex");
  const isolatedNpmRoot = targetValue(approvedTemporaryRoot, overrides, "isolatedNpmRoot", "npm");
  const isolatedProcessTempRoot = targetValue(
    approvedTemporaryRoot,
    overrides,
    "isolatedProcessTempRoot",
    "process-temp",
  );
  const isolatedWorkRoot = targetValue(approvedTemporaryRoot, overrides, "isolatedWorkRoot", "work");
  const isolatedPackRoot = targetValue(approvedTemporaryRoot, overrides, "isolatedPackRoot", "pack");
  const isolatedExtractRoot = targetValue(
    approvedTemporaryRoot,
    overrides,
    "isolatedExtractRoot",
    "extract",
  );
  const isolatedProjectRoot = targetValue(
    approvedTemporaryRoot,
    overrides,
    "isolatedProjectRoot",
    "project",
  );
  const isolatedMarketplaceRoot = targetValue(
    approvedTemporaryRoot,
    overrides,
    "isolatedMarketplaceRoot",
    "marketplace",
  );
  const plan = {
    approvedTemporaryRoot,
    approvedTemporaryParent,
    rootIdentity,
    isolatedUserRoot,
    isolatedUserAgentsRoot: targetValue(
      approvedTemporaryRoot,
      overrides,
      "isolatedUserAgentsRoot",
      relative(approvedTemporaryRoot, isolatedUserRoot),
      ".agents",
    ),
    isolatedCodexRoot,
    isolatedNpmRoot,
    isolatedNpmUserconfig: targetValue(
      approvedTemporaryRoot,
      overrides,
      "isolatedNpmUserconfig",
      relative(approvedTemporaryRoot, isolatedNpmRoot),
      "userconfig",
    ),
    isolatedNpmCache: targetValue(
      approvedTemporaryRoot,
      overrides,
      "isolatedNpmCache",
      relative(approvedTemporaryRoot, isolatedNpmRoot),
      "cache",
    ),
    isolatedProcessTempRoot,
    isolatedXdgConfigRoot: targetValue(
      approvedTemporaryRoot,
      overrides,
      "isolatedXdgConfigRoot",
      "xdg-config",
    ),
    isolatedXdgCacheRoot: targetValue(
      approvedTemporaryRoot,
      overrides,
      "isolatedXdgCacheRoot",
      "xdg-cache",
    ),
    isolatedWorkRoot,
    isolatedPackRoot,
    isolatedExtractRoot,
    extractedPackageRoot: targetValue(
      approvedTemporaryRoot,
      overrides,
      "extractedPackageRoot",
      relative(approvedTemporaryRoot, isolatedExtractRoot),
      "package",
    ),
    isolatedProjectRoot,
    isolatedProjectNestedRoot: targetValue(
      approvedTemporaryRoot,
      overrides,
      "isolatedProjectNestedRoot",
      relative(approvedTemporaryRoot, isolatedProjectRoot),
      "packages",
      "api",
    ),
    isolatedMarketplaceRoot,
    isolatedMarketplacePluginRoot: targetValue(
      approvedTemporaryRoot,
      overrides,
      "isolatedMarketplacePluginRoot",
      relative(approvedTemporaryRoot, isolatedMarketplaceRoot),
      "plugins",
      "kyw-dev",
    ),
  };
  plan.targets = Object.freeze(
    Object.entries(plan)
      .filter(([name]) => name.startsWith("isolated") || name === "extractedPackageRoot")
      .map(([label, filePath]) => Object.freeze({ label, path: filePath })),
  );
  return Object.freeze(plan);
}

export function assertIsolationPlan(plan, protectedLocations) {
  const options = comparisonOptions(protectedLocations.platform);
  if (!path.isAbsolute(plan.approvedTemporaryRoot)) {
    throw isolationError(ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD, "Temporary root is not absolute");
  }
  if (!isStrictDescendant(plan.approvedTemporaryParent, plan.approvedTemporaryRoot, options)) {
    throw isolationError(
      ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
      "Temporary root is not a strict child of the approved temporary parent",
    );
  }
  for (const protectedLocation of protectedLocations.entries) {
    if (isSameOrDescendant(protectedLocation.path, plan.approvedTemporaryRoot, options)) {
      throw isolationError(
        ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
        `Temporary root collides with protected ${protectedLocation.label}`,
      );
    }
  }
  for (const target of plan.targets) {
    if (!path.isAbsolute(target.path)) {
      throw isolationError(
        ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
        `${target.label} is not absolute`,
      );
    }
    for (const protectedLocation of protectedLocations.entries) {
      if (isSameOrDescendant(protectedLocation.path, target.path, options)) {
        throw isolationError(
          ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
          `${target.label} collides with protected ${protectedLocation.label}`,
        );
      }
    }
    if (!isStrictDescendant(plan.approvedTemporaryRoot, target.path, options)) {
      throw isolationError(
        ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
        `${target.label} is not a strict child of the approved temporary root`,
      );
    }
  }
  return true;
}

function assertPathChain(plan, target) {
  const options = comparisonOptions();
  if (!isStrictDescendant(plan.approvedTemporaryRoot, target.path, options)) {
    throw isolationError(
      ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
      `${target.label} escaped the approved temporary root`,
    );
  }
  const relativePath = relative(plan.approvedTemporaryRoot, target.path);
  let current = plan.approvedTemporaryRoot;
  for (const segment of relativePath.split(path.sep).filter(Boolean)) {
    current = join(current, segment);
    const state = pathState(current);
    if (!state) {
      break;
    }
    if (state.isSymbolicLink() || (!state.isDirectory() && !state.isFile())) {
      throw isolationError(
        ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
        `${target.label} contains a link or unsupported filesystem entry`,
      );
    }
    const resolvedPath = realpathSync(current);
    if (!isStrictDescendant(plan.approvedTemporaryRoot, resolvedPath, options)) {
      throw isolationError(
        ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
        `${target.label} resolves outside the approved temporary root`,
      );
    }
  }
}

function assertMaterializedPlan(plan, protectedLocations) {
  assertIsolationPlan(plan, protectedLocations);
  const rootState = pathState(plan.approvedTemporaryRoot);
  if (!rootState?.isDirectory() || rootState.isSymbolicLink()) {
    throw isolationError(ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD, "Temporary root is no longer a real directory");
  }
  if (!sameStatIdentity(statIdentity(rootState), plan.rootIdentity)) {
    throw isolationError(ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD, "Temporary root identity changed");
  }
  if (
    normalizePathIdentity(realpathSync(plan.approvedTemporaryRoot)) !==
    normalizePathIdentity(plan.approvedTemporaryRoot)
  ) {
    throw isolationError(ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD, "Temporary root realpath changed");
  }
  for (const target of plan.targets) {
    assertPathChain(plan, target);
  }
  return true;
}

function materializeIsolationPlan(plan) {
  for (const directory of [
    plan.isolatedUserRoot,
    plan.isolatedCodexRoot,
    plan.isolatedNpmRoot,
    plan.isolatedNpmCache,
    plan.isolatedProcessTempRoot,
    plan.isolatedXdgConfigRoot,
    plan.isolatedXdgCacheRoot,
    plan.isolatedWorkRoot,
    plan.isolatedPackRoot,
    plan.isolatedExtractRoot,
    plan.isolatedProjectNestedRoot,
  ]) {
    mkdirSync(directory, { recursive: true });
  }
  mkdirSync(join(plan.isolatedProjectRoot, ".git"), { recursive: true });
  writeFileSync(
    plan.isolatedNpmUserconfig,
    [
      "registry=https://registry.npmjs.org/",
      `cache=${plan.isolatedNpmCache.replaceAll("\\", "/")}`,
      "audit=false",
      "fund=false",
      "ignore-scripts=true",
      "update-notifier=false",
      "",
    ].join("\n"),
    "utf8",
  );
}

function stripEnvironmentKeys(environment, keys) {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  return Object.fromEntries(
    Object.entries(environment).filter(([key]) => !normalizedKeys.has(key.toLowerCase())),
  );
}

export function createIsolatedChildEnvironment(plan, inheritedEnvironment = process.env) {
  const environment = stripEnvironmentKeys(inheritedEnvironment, isolatedEnvironmentKeys);
  const parsedUserRoot = path.parse(plan.isolatedUserRoot);
  return Object.freeze({
    ...environment,
    HOME: plan.isolatedUserRoot,
    USERPROFILE: plan.isolatedUserRoot,
    HOMEDRIVE: parsedUserRoot.root.replace(/[\\/]$/, "") || parsedUserRoot.root,
    HOMEPATH: plan.isolatedUserRoot.slice(parsedUserRoot.root.length) || path.sep,
    CODEX_HOME: plan.isolatedCodexRoot,
    npm_config_userconfig: plan.isolatedNpmUserconfig,
    npm_config_cache: plan.isolatedNpmCache,
    TEMP: plan.isolatedProcessTempRoot,
    TMP: plan.isolatedProcessTempRoot,
    TMPDIR: plan.isolatedProcessTempRoot,
    XDG_CONFIG_HOME: plan.isolatedXdgConfigRoot,
    XDG_CACHE_HOME: plan.isolatedXdgCacheRoot,
    NO_UPDATE_NOTIFIER: "1",
  });
}

function captureParentEnvironment(environment = process.env) {
  const normalizedKeys = new Set(isolatedEnvironmentKeys.map((key) => key.toLowerCase()));
  return Object.freeze(
    Object.fromEntries(
      Object.entries(environment)
        .filter(([key]) => normalizedKeys.has(key.toLowerCase()))
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

function parentEnvironmentDifferences(before, after) {
  const changes = [];
  const canonicalNames = new Map(
    isolatedEnvironmentKeys.map((name) => [name.toLowerCase(), name]),
  );
  for (const [normalizedName, canonicalName] of canonicalNames) {
    const beforeEntries = Object.entries(before)
      .filter(([name]) => name.toLowerCase() === normalizedName)
      .sort(([left], [right]) => compareText(left, right));
    const afterEntries = Object.entries(after)
      .filter(([name]) => name.toLowerCase() === normalizedName)
      .sort(([left], [right]) => compareText(left, right));
    if (JSON.stringify(beforeEntries) !== JSON.stringify(afterEntries)) {
      changes.push(canonicalName);
    }
  }
  return Object.freeze(changes.sort(compareText));
}

function findNearestExistingAncestor(filePath) {
  let current = resolve(filePath);
  while (!pathState(current)) {
    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
  return current;
}

function filesystemEntryType(state) {
  if (state.isSymbolicLink()) {
    return "link";
  }
  if (state.isDirectory()) {
    return "directory";
  }
  if (state.isFile()) {
    return "file";
  }
  return "special";
}

function safeRelativePath(relativePath) {
  const normalized = (relativePath || ".")
    .replaceAll("\\", "/")
    .replace(/[\u0000-\u001f\u007f]/g, (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
    )
    .replace(
      /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,})\b/g,
      "[REDACTED_CREDENTIAL]",
    )
    .replace(
      /(?:_authToken|npmAuthToken|password|passwd)\s*[:=]\s*[^/\s]{8,}/gi,
      "[REDACTED_CREDENTIAL_ASSIGNMENT]",
    );
  if (normalized.length <= maximumSafeRelativePathLength) {
    return normalized;
  }
  const suffix = sha256(Buffer.from(relativePath, "utf8")).slice(0, 16);
  return `${normalized.slice(0, maximumSafeRelativePathLength - 19)}...#${suffix}`;
}

function isIdentifierByte(value) {
  return (
    (value >= 48 && value <= 57) ||
    (value >= 65 && value <= 90) ||
    (value >= 97 && value <= 122) ||
    value === 45 ||
    value === 95
  );
}

function bufferContainsExactIdentifier(contents, identifier) {
  const needle = Buffer.from(identifier, "utf8");
  let offset = contents.indexOf(needle);
  while (offset >= 0) {
    const before = offset > 0 ? contents[offset - 1] : undefined;
    const afterOffset = offset + needle.length;
    const after = afterOffset < contents.length ? contents[afterOffset] : undefined;
    if (
      (before === undefined || !isIdentifierByte(before)) &&
      (after === undefined || !isIdentifierByte(after))
    ) {
      return true;
    }
    offset = contents.indexOf(needle, offset + 1);
  }
  return false;
}

function exactIdentifiersIn(contents) {
  const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, "utf8");
  return attributionIdentifiers.filter((identifier) =>
    bufferContainsExactIdentifier(buffer, identifier),
  );
}

function managedAgentsPathKind(relativePath, platform) {
  const comparable = platform === "win32" ? relativePath.toLowerCase() : relativePath;
  if (comparable === "skills/.kyw-dev-install.json") {
    return "ownership-metadata";
  }
  for (const skillName of managedSkillNames) {
    const root = `skills/${skillName}`;
    if (comparable === root || comparable.startsWith(`${root}/`)) {
      return "managed-skill";
    }
  }
  return undefined;
}

function protectedEntryCategory(location, structural) {
  if (location.label.startsWith("normal-agents")) {
    return "agents-state";
  }
  if (location.label.includes("npm-userconfig")) {
    return "npm-userconfig";
  }
  if (location.mode === "codex-control") {
    return structural ? "codex-volatile-structure" : "codex-control";
  }
  return "protected-state";
}

function isCodexControlName(name, platform) {
  return platform === "win32"
    ? windowsCodexControlNames.has(name.toLowerCase())
    : codexControlNames.has(name);
}

function snapshotProtectedLocation(location) {
  try {
    const rootState = pathState(location.path);
    const platform = location.platform ?? process.platform;
    const entries = [];
    let unreadableCount = 0;

    function recordEntry(filePath, relativePath, state, structural) {
      const normalizedRelativePath = relativePath.replaceAll("\\", "/") || ".";
      const comparableRelativePath =
        platform === "win32" ? normalizedRelativePath.toLowerCase() : normalizedRelativePath;
      const entryType = filesystemEntryType(state);
      let contentSha256;
      let linkTargetSha256;
      let unreadableCode;
      let contentMarkers = [];

      if (entryType === "link") {
        linkTargetSha256 = sha256(Buffer.from(readlinkSync(filePath), "utf8"));
      } else if (entryType === "file" && !structural) {
        try {
          const contents = readFileSync(filePath);
          contentSha256 = sha256(contents);
          contentMarkers = exactIdentifiersIn(contents);
        } catch (error) {
          if (!["EACCES", "EBUSY", "EPERM"].includes(error.code)) {
            throw error;
          }
          unreadableCount += 1;
          unreadableCode = error.code;
        }
      }

      const pathMarkers = exactIdentifiersIn(comparableRelativePath);
      entries.push(
        Object.freeze({
          pathId: sha256(Buffer.from(comparableRelativePath, "utf8")),
          relativePath: safeRelativePath(normalizedRelativePath),
          category: protectedEntryCategory(location, structural),
          entryType,
          structural,
          identitySha256: structural ? undefined : sha256(metadataFingerprint(state)),
          contentSha256,
          linkTargetSha256,
          unreadableCode,
          markers: Object.freeze([...new Set([...pathMarkers, ...contentMarkers])].sort(compareText)),
          managedAgentsPath: location.label.startsWith("normal-agents")
            ? managedAgentsPathKind(comparableRelativePath, platform)
            : undefined,
        }),
      );
    }

    function visit(filePath, relativePath, structural = false) {
      const state = pathState(filePath);
      if (!state) {
        throw new Error(`entry disappeared while snapshotting protected ${location.label}`);
      }
      recordEntry(filePath, relativePath, state, structural);
      if (!state.isDirectory() || state.isSymbolicLink()) {
        return;
      }
      for (const entry of readdirSync(filePath, { withFileTypes: true }).sort((left, right) =>
        compareText(left.name, right.name),
      )) {
        const childRelativePath = relativePath === "." ? entry.name : `${relativePath}/${entry.name}`;
        visit(join(filePath, entry.name), childRelativePath, structural);
      }
    }

    if (!rootState) {
      const ancestor = findNearestExistingAncestor(location.path);
      if (!ancestor) {
        throw new Error("no existing ancestor is available");
      }
      const ancestorState = pathState(ancestor);
      entries.push(
        Object.freeze({
          pathId: sha256(Buffer.from(".", "utf8")),
          relativePath: ".",
          category: "absence-sentinel",
          entryType: "absent",
          structural: false,
          identitySha256: sha256(metadataFingerprint(ancestorState)),
          contentSha256: undefined,
          linkTargetSha256: undefined,
          unreadableCode: undefined,
          markers: Object.freeze([]),
          managedAgentsPath: undefined,
        }),
      );
      return Object.freeze({
        label: location.label,
        state: "absent",
        entryCount: entries.length,
        unreadableCount,
        sha256: sha256(JSON.stringify(entries)),
        entries: Object.freeze(entries),
      });
    }

    if (location.mode === "codex-control" && rootState.isDirectory()) {
      recordEntry(location.path, ".", rootState, false);
      for (const entry of readdirSync(location.path, { withFileTypes: true }).sort((left, right) =>
        compareText(left.name, right.name),
      )) {
        const entryPath = join(location.path, entry.name);
        visit(entryPath, entry.name, !isCodexControlName(entry.name, platform));
      }
    } else {
      visit(location.path, ".");
    }
    entries.sort(
      (left, right) =>
        compareText(left.relativePath, right.relativePath) || compareText(left.pathId, right.pathId),
    );
    return Object.freeze({
      label: location.label,
      state: "present",
      entryCount: entries.length,
      unreadableCount,
      sha256: sha256(JSON.stringify(entries)),
      entries: Object.freeze(entries),
    });
  } catch (error) {
    throw isolationError(
      ISOLATION_ERROR_CODES.NORMAL_STATE_SNAPSHOT_FAILED,
      `Cannot snapshot protected ${location.label}`,
      error,
    );
  }
}

export function snapshotProtectedState(protectedLocations) {
  return Object.freeze(
    protectedLocations.entries
      .map((entry) =>
        snapshotProtectedLocation({ ...entry, platform: protectedLocations.platform }),
      )
      .sort((left, right) => compareText(left.label, right.label)),
  );
}

function entriesByIdentity(snapshot) {
  const entries = new Map();
  for (const location of snapshot) {
    for (const entry of location.entries ?? []) {
      entries.set(`${location.label}\0${entry.pathId}`, { location, entry });
    }
  }
  return entries;
}

function comparableEntry(entry) {
  if (!entry) {
    return undefined;
  }
  return {
    category: entry.category,
    entryType: entry.entryType,
    structural: entry.structural,
    identitySha256: entry.identitySha256,
    contentSha256: entry.contentSha256,
    linkTargetSha256: entry.linkTargetSha256,
    unreadableCode: entry.unreadableCode,
    markers: entry.markers,
    managedAgentsPath: entry.managedAgentsPath,
  };
}

export function protectedStateDifferences(before, after) {
  const beforeEntries = entriesByIdentity(before);
  const afterEntries = entriesByIdentity(after);
  const identities = [...new Set([...beforeEntries.keys(), ...afterEntries.keys()])].sort(compareText);
  const differences = [];
  for (const identity of identities) {
    const beforeValue = beforeEntries.get(identity);
    const afterValue = afterEntries.get(identity);
    const beforeEntry = beforeValue?.entry;
    const afterEntry = afterValue?.entry;
    let kind;
    if (!beforeEntry) {
      kind = "added";
    } else if (!afterEntry) {
      kind = "removed";
    } else if (beforeEntry.entryType !== afterEntry.entryType) {
      kind = "type changed";
    } else if (JSON.stringify(comparableEntry(beforeEntry)) !== JSON.stringify(comparableEntry(afterEntry))) {
      kind = "modified";
    } else {
      continue;
    }
    differences.push(
      Object.freeze({
        protectedLocation: afterValue?.location.label ?? beforeValue.location.label,
        relativePath: afterEntry?.relativePath ?? beforeEntry.relativePath,
        pathId: afterEntry?.pathId ?? beforeEntry.pathId,
        category: afterEntry?.category ?? beforeEntry.category,
        kind,
        entryType: afterEntry?.entryType ?? beforeEntry.entryType,
        before: beforeEntry,
        after: afterEntry,
      }),
    );
  }
  return Object.freeze(
    differences.sort(
      (left, right) =>
        compareText(left.protectedLocation, right.protectedLocation) ||
        compareText(left.relativePath, right.relativePath) ||
        compareText(left.pathId, right.pathId),
    ),
  );
}

function packedDigestMatches(difference, packedSkillDigests) {
  for (const entry of [difference.before, difference.after]) {
    if (entry?.contentSha256 && packedSkillDigests.has(entry.contentSha256)) {
      return true;
    }
  }
  return false;
}

function attributionForDifference(difference, packedSkillDigests) {
  for (const entry of [difference.before, difference.after]) {
    if (entry?.managedAgentsPath === "ownership-metadata") {
      return "managed ownership metadata";
    }
    if (entry?.managedAgentsPath === "managed-skill") {
      return "managed Skill path";
    }
  }
  const markers = [
    ...new Set([
      ...(difference.before?.markers ?? []),
      ...(difference.after?.markers ?? []),
    ]),
  ].sort(compareText);
  if (markers.length > 0) {
    return `exact kyw-dev identifier: ${markers[0]}`;
  }
  if (packedDigestMatches(difference, packedSkillDigests)) {
    return "exact packed Skill bytes";
  }
  return undefined;
}

function diagnosticDifference(difference, packedSkillDigests) {
  const reason = attributionForDifference(difference, packedSkillDigests);
  const markers = [
    ...new Set([
      ...(difference.before?.markers ?? []),
      ...(difference.after?.markers ?? []),
    ]),
  ].sort(compareText);
  const contentDigest = difference.after?.contentSha256 ?? difference.before?.contentSha256;
  return Object.freeze({
    protectedLocation: difference.protectedLocation,
    relativePath: difference.relativePath,
    category: difference.category,
    kind: difference.kind,
    entryType: difference.entryType,
    attributed: Boolean(reason),
    reason: reason ?? "no exact kyw-dev attribution marker",
    markers: Object.freeze(markers),
    contentDigest: contentDigest?.slice(0, 16),
  });
}

export function classifyProtectedState(
  before,
  after,
  {
    packedSkillDigests = [],
    parentEnvironmentChanges = [],
    maxDisplayedDifferences = maximumDisplayedDifferences,
  } = {},
) {
  const packedDigests = new Set(packedSkillDigests);
  const protectedDifferences = protectedStateDifferences(before, after);
  const differences = protectedDifferences.map((difference) =>
    diagnosticDifference(difference, packedDigests),
  );
  const protectedEnvironmentNames = new Map(
    isolatedEnvironmentKeys.map((name) => [name.toLowerCase(), name]),
  );
  const safeEnvironmentChanges = [
    ...new Set(
      parentEnvironmentChanges.map(
        (change) =>
          protectedEnvironmentNames.get(String(change).toLowerCase()) ?? "protected-environment-key",
      ),
    ),
  ].sort(compareText);
  for (const change of safeEnvironmentChanges) {
    differences.push(
      Object.freeze({
        protectedLocation: "parent-environment",
        relativePath: change,
        category: "protected-environment",
        kind: "modified",
        entryType: "environment",
        attributed: true,
        reason: "runner process protected environment mutation",
        markers: Object.freeze([]),
        contentDigest: undefined,
      }),
    );
  }
  differences.sort(
    (left, right) =>
      compareText(left.protectedLocation, right.protectedLocation) ||
      compareText(left.relativePath, right.relativePath) ||
      compareText(left.kind, right.kind),
  );

  const attributedCount = differences.filter((difference) => difference.attributed).length;
  const status =
    differences.length === 0
      ? ISOLATION_OUTCOMES.CLEAN
      : attributedCount > 0
        ? ISOLATION_OUTCOMES.ISOLATION_VIOLATION
        : ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED;
  const displayLimit = Number.isInteger(maxDisplayedDifferences) && maxDisplayedDifferences >= 0
    ? Math.min(maximumDisplayedDifferences, maxDisplayedDifferences)
    : maximumDisplayedDifferences;
  return Object.freeze({
    status,
    differenceCount: differences.length,
    attributedCount,
    retryable: status === ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED,
    inconclusive: status === ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED,
    differences: Object.freeze(differences),
    displayedDifferences: Object.freeze(differences.slice(0, displayLimit)),
    truncated: differences.length > displayLimit,
  });
}

function attributionError(classification, isolation) {
  const code =
    classification.status === ISOLATION_OUTCOMES.ISOLATION_VIOLATION
      ? ISOLATION_ERROR_CODES.ISOLATION_VIOLATION
      : ISOLATION_ERROR_CODES.AMBIENT_STATE_CHANGED;
  const message =
    classification.status === ISOLATION_OUTCOMES.ISOLATION_VIOLATION
      ? `Protected state change is attributable to kyw-dev (${classification.differenceCount} difference(s))`
      : `Protected state changed without positive kyw-dev attribution (${classification.differenceCount} difference(s)); isolation proof is inconclusive`;
  return isolationError(code, message, undefined, {
    status: classification.status,
    retryable: classification.retryable,
    inconclusive: classification.inconclusive,
    attempts: isolation.attempts,
    history: isolation.history,
    isolation,
  });
}

export function assertProtectedStateUnchanged(before, after, options = {}) {
  const classification = classifyProtectedState(before, after, options);
  if (classification.status !== ISOLATION_OUTCOMES.CLEAN) {
    const attempt = Object.freeze({
      attempt: 1,
      status: classification.status,
      differenceCount: classification.differenceCount,
      attributedCount: classification.attributedCount,
      differences: classification.displayedDifferences,
      truncated: classification.truncated,
    });
    const isolation = Object.freeze({
      status: classification.status,
      attempts: 1,
      history: Object.freeze([attempt]),
      retryable: classification.retryable,
      inconclusive: classification.inconclusive,
    });
    throw attributionError(classification, isolation);
  }
  return classification;
}

function assertChildEnvironment(plan, environment) {
  const expected = {
    HOME: plan.isolatedUserRoot,
    USERPROFILE: plan.isolatedUserRoot,
    CODEX_HOME: plan.isolatedCodexRoot,
    npm_config_userconfig: plan.isolatedNpmUserconfig,
    npm_config_cache: plan.isolatedNpmCache,
    TEMP: plan.isolatedProcessTempRoot,
    TMP: plan.isolatedProcessTempRoot,
    TMPDIR: plan.isolatedProcessTempRoot,
    XDG_CONFIG_HOME: plan.isolatedXdgConfigRoot,
    XDG_CACHE_HOME: plan.isolatedXdgCacheRoot,
  };
  for (const [name, value] of Object.entries(expected)) {
    if (environment[name] !== value) {
      throw isolationError(
        ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
        `Child environment ${name} does not use its approved isolated path`,
      );
    }
  }
}

function runChild({
  plan,
  protectedLocations,
  environment,
  spawnProcess,
  command,
  args,
  cwd,
  label,
  allowRepositoryRoot = false,
  repositoryRoot,
}) {
  assertMaterializedPlan(plan, protectedLocations);
  assertChildEnvironment(plan, environment);
  const resolvedCwd = resolve(cwd);
  if (
    !isSameOrDescendant(plan.approvedTemporaryRoot, resolvedCwd) &&
    !(allowRepositoryRoot && normalizePathIdentity(resolvedCwd) === normalizePathIdentity(repositoryRoot))
  ) {
    throw isolationError(
      ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD,
      `${label} cwd is outside the approved lifecycle roots`,
    );
  }
  return spawnProcess(command, args, {
    cwd: resolvedCwd,
    env: environment,
    encoding: "utf8",
    windowsHide: true,
  });
}

function resultDetail(result) {
  return result.stderr?.trim() || result.error?.message || result.stdout?.trim() || "unknown process error";
}

function assertChildStatus(result, label, expectedStatus = 0) {
  if (result.status !== expectedStatus) {
    throw isolationError(
      ISOLATION_ERROR_CODES.CHILD_FAILED,
      `${label} exited ${result.status ?? "without status"}; expected ${expectedStatus}: ${resultDetail(result)}`,
    );
  }
}

function npmCommand(environment) {
  const npmExecutable = environmentValue(environment, "npm_execpath");
  if (npmExecutable) {
    return Object.freeze({ command: process.execPath, prefix: Object.freeze([npmExecutable]) });
  }
  if (process.platform === "win32") {
    return Object.freeze({
      command: process.env.ComSpec ?? "cmd.exe",
      prefix: Object.freeze(["/d", "/c", "npm"]),
    });
  }
  return Object.freeze({ command: "npm", prefix: Object.freeze([]) });
}

function codexCommand(args) {
  if (process.platform === "win32") {
    return Object.freeze({
      command: process.env.ComSpec ?? "cmd.exe",
      args: Object.freeze(["/d", "/c", "codex", ...args]),
    });
  }
  return Object.freeze({ command: "codex", args: Object.freeze(args) });
}

function collectRegularFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const entryPath = join(directory, entry.name);
      const state = pathState(entryPath);
      if (state.isSymbolicLink()) {
        throw isolationError(
          ISOLATION_ERROR_CODES.PACKAGE_INVALID,
          "Lifecycle tree contains a link",
        );
      }
      if (state.isDirectory()) {
        visit(entryPath);
      } else if (state.isFile()) {
        files.push(entryPath);
      } else {
        throw isolationError(
          ISOLATION_ERROR_CODES.PACKAGE_INVALID,
          "Lifecycle tree contains an unsupported filesystem entry",
        );
      }
    }
  }
  visit(root);
  return files;
}

function collectPackedSkillDigests(packageRoot) {
  const digests = new Set();
  for (const skillName of managedSkillNames) {
    const skillRoot = join(packageRoot, "skills", skillName);
    for (const filePath of collectRegularFiles(skillRoot)) {
      digests.add(sha256(readFileSync(filePath)));
    }
  }
  return digests;
}

function parsePackReport(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "npm pack did not return JSON", error);
  }
  if (!Array.isArray(parsed) || parsed.length !== 1 || !parsed[0]?.filename) {
    throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "npm pack returned an unexpected report");
  }
  return parsed[0];
}

function verifyPackedPackage(packageRoot, report, repositoryRoot) {
  const actualFiles = report.files.map(({ path: filePath }) => filePath).sort();
  assert.deepEqual(actualFiles, [...EXPECTED_TARBALL_FILES].sort(), "real tarball allowlist changed");
  for (const excludedPath of forbiddenPackageRoots) {
    if (existsSync(join(packageRoot, excludedPath))) {
      throw isolationError(
        ISOLATION_ERROR_CODES.PACKAGE_INVALID,
        `Packed package contains forbidden path: ${excludedPath}`,
      );
    }
  }

  for (const filePath of collectRegularFiles(packageRoot)) {
    if (!/\.(?:json|md|mjs|txt|yaml|yml)$/.test(filePath) && basename(filePath).toUpperCase() !== "LICENSE") {
      continue;
    }
    const contents = readFileSync(filePath, "utf8");
    if (contents.includes(repositoryRoot)) {
      throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "Packed file exposes the source path");
    }
    for (const { label, pattern } of packedTextPatterns) {
      if (pattern.test(contents)) {
        throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, `Packed file contains ${label}`);
      }
    }
  }

  const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  for (const scriptName of forbiddenLifecycleScripts) {
    if (scriptName in (packageJson.scripts ?? {})) {
      throw isolationError(
        ISOLATION_ERROR_CODES.PACKAGE_INVALID,
        `Packed package contains forbidden lifecycle script: ${scriptName}`,
      );
    }
  }
  if (!readFileSync(join(packageRoot, "LICENSE"), "utf8").includes(RELEASE_METADATA.copyright)) {
    throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "Packed project license is incomplete");
  }
  for (const [relativePath, expectedHash] of Object.entries(PRESERVED_LEGAL_HASHES)) {
    const actualHash = sha256(readFileSync(join(packageRoot, ...relativePath.split("/"))));
    if (actualHash !== expectedHash) {
      throw isolationError(
        ISOLATION_ERROR_CODES.PACKAGE_INVALID,
        `Packed legal hash changed: ${relativePath}`,
      );
    }
  }
  return packageJson;
}

function runPackedCli(context, args, cwd, label, expectedStatus = 0) {
  const result = runChild({
    ...context,
    command: process.execPath,
    args: [join(context.plan.extractedPackageRoot, "bin", "kyw-dev.mjs"), ...args],
    cwd,
    label,
  });
  assertChildStatus(result, label, expectedStatus);
  return Object.freeze({ label, status: result.status });
}

function assertFileHash(filePath, expectedHash, label) {
  if (!existsSync(filePath) || sha256(readFileSync(filePath)) !== expectedHash) {
    throw isolationError(ISOLATION_ERROR_CODES.CHILD_FAILED, `${label} was not preserved`);
  }
}

function runDirectLifecycles(context) {
  const steps = [];
  const record = (args, cwd, label, expectedStatus = 0) => {
    steps.push(runPackedCli(context, args, cwd, label, expectedStatus));
  };

  record(["install", "--scope", "user"], context.plan.isolatedWorkRoot, "user install");
  record(["update", "--scope", "user"], context.plan.isolatedWorkRoot, "user update");
  record(["doctor"], context.plan.isolatedWorkRoot, "user doctor");
  record(["uninstall", "--scope", "user"], context.plan.isolatedWorkRoot, "user normal uninstall");

  record(
    ["install", "--scope", "project"],
    context.plan.isolatedProjectNestedRoot,
    "project install",
  );
  record(
    ["update", "--scope", "project"],
    context.plan.isolatedProjectNestedRoot,
    "project update",
  );
  record(["doctor"], context.plan.isolatedProjectNestedRoot, "project doctor");
  record(
    ["uninstall", "--scope", "project"],
    context.plan.isolatedProjectNestedRoot,
    "project normal uninstall",
  );
  for (const documentPath of ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"]) {
    if (existsSync(join(context.plan.isolatedProjectRoot, ...documentPath.split("/")))) {
      throw isolationError(ISOLATION_ERROR_CODES.CHILD_FAILED, `Project lifecycle created ${documentPath}`);
    }
  }

  record(["install", "--scope", "user"], context.plan.isolatedWorkRoot, "force fixture install");
  const skillsRoot = join(context.plan.isolatedUserAgentsRoot, "skills");
  const modifiedOwnedFile = join(skillsRoot, "kyw-init", "SKILL.md");
  const unknownFile = join(skillsRoot, "kyw-init", "notes", "mine.txt");
  const unrelatedFile = join(skillsRoot, "another-skill", "SKILL.md");
  writeFileSync(
    modifiedOwnedFile,
    `${readFileSync(modifiedOwnedFile, "utf8")}\n<!-- isolated local change -->\n`,
    "utf8",
  );
  mkdirSync(dirname(unknownFile), { recursive: true });
  mkdirSync(dirname(unrelatedFile), { recursive: true });
  writeFileSync(unknownFile, "preserve unknown\n", "utf8");
  writeFileSync(unrelatedFile, "preserve unrelated\n", "utf8");
  const modifiedHash = sha256(readFileSync(modifiedOwnedFile));
  const unknownHash = sha256(readFileSync(unknownFile));
  const unrelatedHash = sha256(readFileSync(unrelatedFile));

  record(
    ["uninstall", "--scope", "user"],
    context.plan.isolatedWorkRoot,
    "user preservation refusal",
    4,
  );
  assertFileHash(modifiedOwnedFile, modifiedHash, "modified owned file after normal refusal");
  assertFileHash(unknownFile, unknownHash, "unknown file after normal refusal");
  assertFileHash(unrelatedFile, unrelatedHash, "unrelated file after normal refusal");

  record(
    ["uninstall", "--scope", "user", "--force"],
    context.plan.isolatedWorkRoot,
    "user force uninstall",
  );
  if (existsSync(modifiedOwnedFile)) {
    throw isolationError(ISOLATION_ERROR_CODES.CHILD_FAILED, "Force uninstall retained a modified owned file");
  }
  assertFileHash(unknownFile, unknownHash, "unknown file after force uninstall");
  assertFileHash(unrelatedFile, unrelatedHash, "unrelated file after force uninstall");
  if (existsSync(join(skillsRoot, ".kyw-dev-install.json"))) {
    throw isolationError(ISOLATION_ERROR_CODES.CHILD_FAILED, "Force uninstall retained ownership metadata");
  }

  return Object.freeze({
    steps: Object.freeze(steps),
    preserved: Object.freeze({ unknownSha256: unknownHash, unrelatedSha256: unrelatedHash }),
  });
}

function runCodex(context, args, label) {
  const invocation = codexCommand(args);
  return runChild({
    ...context,
    command: invocation.command,
    args: invocation.args,
    cwd: context.plan.isolatedWorkRoot,
    label,
  });
}

function runMarketplaceLifecycle(context, requireMarketplace) {
  const version = runCodex(context, ["--version"], "Codex version");
  if (version.status !== 0) {
    if (requireMarketplace) {
      throw isolationError(
        ISOLATION_ERROR_CODES.MARKETPLACE_UNAVAILABLE,
        `Codex CLI is required for marketplace verification: ${resultDetail(version)}`,
      );
    }
    return Object.freeze({ status: "unavailable", version: undefined, steps: Object.freeze([]) });
  }

  const marketplaceFixtureRoot = join(
    context.repositoryRoot,
    "test",
    "fixtures",
    "distribution",
    "marketplace-root",
  );
  cpSync(marketplaceFixtureRoot, context.plan.isolatedMarketplaceRoot, { recursive: true });
  mkdirSync(dirname(context.plan.isolatedMarketplacePluginRoot), { recursive: true });
  cpSync(context.plan.extractedPackageRoot, context.plan.isolatedMarketplacePluginRoot, {
    recursive: true,
  });
  assertMaterializedPlan(context.plan, context.protectedLocations);

  const steps = [];
  const run = (args, label) => {
    const result = runCodex(context, args, label);
    assertChildStatus(result, label);
    steps.push(Object.freeze({ label, status: result.status }));
    return result;
  };
  run(
    ["plugin", "marketplace", "add", context.plan.isolatedMarketplaceRoot, "--json"],
    "marketplace add",
  );
  const available = run(
    ["plugin", "list", "--marketplace", "kyw-dev-local", "--available", "--json"],
    "marketplace plugin discovery",
  );
  if (!available.stdout.includes("kyw-dev")) {
    throw isolationError(ISOLATION_ERROR_CODES.CHILD_FAILED, "Marketplace did not expose kyw-dev");
  }
  run(["plugin", "add", "kyw-dev@kyw-dev-local", "--json"], "plugin install");

  const cachedFiles = collectRegularFiles(context.plan.isolatedCodexRoot);
  for (const skillName of managedSkillNames) {
    const packedSkillRoot = join(context.plan.extractedPackageRoot, "skills", skillName);
    for (const packedFile of collectRegularFiles(packedSkillRoot)) {
      const relativeSkillPath = relative(packedSkillRoot, packedFile).replaceAll("\\", "/");
      const suffix = `/skills/${skillName}/${relativeSkillPath}`;
      const matches = cachedFiles.filter((filePath) => filePath.replaceAll("\\", "/").endsWith(suffix));
      if (matches.length !== 1) {
        throw isolationError(
          ISOLATION_ERROR_CODES.CHILD_FAILED,
          `Expected exactly one cached ${skillName}/${relativeSkillPath}`,
        );
      }
      if (!readFileSync(matches[0]).equals(readFileSync(packedFile))) {
        throw isolationError(
          ISOLATION_ERROR_CODES.CHILD_FAILED,
          `Cached ${skillName}/${relativeSkillPath} bytes differ`,
        );
      }
    }
  }
  run(["plugin", "list", "--json"], "installed plugin list");
  run(["plugin", "remove", "kyw-dev@kyw-dev-local", "--json"], "plugin remove");
  run(["plugin", "marketplace", "remove", "kyw-dev-local", "--json"], "marketplace remove");

  return Object.freeze({
    status: "passed",
    version: version.stdout.trim(),
    skills: managedSkillNames,
    steps: Object.freeze(steps),
  });
}

function verifyArchiveEntries(listing) {
  for (const entry of listing.split(/\r?\n/).filter(Boolean)) {
    const normalized = entry.replaceAll("\\", "/");
    if (
      normalized.startsWith("/") ||
      /^[A-Za-z]:\//.test(normalized) ||
      normalized.split("/").includes("..") ||
      !(normalized === "package" || normalized.startsWith("package/"))
    ) {
      throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "Tarball contains an unsafe entry");
    }
  }
}

function createAndExtractTarball(context) {
  const npm = npmCommand(process.env);
  const packResult = runChild({
    ...context,
    command: npm.command,
    args: [
      ...npm.prefix,
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      context.plan.isolatedPackRoot,
      "--userconfig",
      context.plan.isolatedNpmUserconfig,
      "--cache",
      context.plan.isolatedNpmCache,
    ],
    cwd: context.repositoryRoot,
    label: "npm pack",
    allowRepositoryRoot: true,
  });
  assertChildStatus(packResult, "npm pack");
  const report = parsePackReport(packResult.stdout);
  if (basename(report.filename) !== report.filename) {
    throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "npm pack returned an unsafe filename");
  }
  const archivePath = resolve(context.plan.isolatedPackRoot, report.filename);
  if (
    normalizePathIdentity(dirname(archivePath)) !== normalizePathIdentity(context.plan.isolatedPackRoot) ||
    !pathState(archivePath)?.isFile()
  ) {
    throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "npm pack archive escaped its destination");
  }

  const listResult = runChild({
    ...context,
    command: "tar",
    args: ["-tf", archivePath],
    cwd: context.plan.isolatedWorkRoot,
    label: "tarball list",
  });
  assertChildStatus(listResult, "tarball list");
  verifyArchiveEntries(listResult.stdout);
  const extractResult = runChild({
    ...context,
    command: "tar",
    args: ["-xf", archivePath, "-C", context.plan.isolatedExtractRoot],
    cwd: context.plan.isolatedWorkRoot,
    label: "tarball extraction",
  });
  assertChildStatus(extractResult, "tarball extraction");
  assertMaterializedPlan(context.plan, context.protectedLocations);
  if (!pathState(context.plan.extractedPackageRoot)?.isDirectory()) {
    throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "Extracted package root is missing");
  }
  verifyPackedPackage(context.plan.extractedPackageRoot, report, context.repositoryRoot);
  const archive = readFileSync(archivePath);
  if (archive.length !== report.size) {
    throw isolationError(ISOLATION_ERROR_CODES.PACKAGE_INVALID, "Packed archive size differs from npm report");
  }
  return Object.freeze({
    fileCount: report.files.length,
    filename: report.filename,
    size: archive.length,
    sha256: sha256(archive),
  });
}

function runReleaseLifecycleAttempt(context) {
  const tarball = createAndExtractTarball(context);
  const packedSkillDigests = collectPackedSkillDigests(context.plan.extractedPackageRoot);
  const direct = runDirectLifecycles(context);
  const marketplace = runMarketplaceLifecycle(context, context.requireMarketplace);
  return Object.freeze({
    summary: Object.freeze({ tarball, direct, marketplace }),
    packedSkillDigests,
  });
}

function validateCleanupTree(root) {
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      const state = pathState(entryPath);
      if (!state || state.isSymbolicLink() || (!state.isDirectory() && !state.isFile())) {
        throw isolationError(
          ISOLATION_ERROR_CODES.CLEANUP_GUARD,
          "Approved temporary root contains a link or unsupported cleanup entry",
        );
      }
      if (state.isDirectory()) {
        visit(entryPath);
      }
    }
  }
  visit(root);
}

export function removeApprovedTemporaryRoot({
  approvedTemporaryRoot,
  approvedTemporaryParent,
  rootIdentity,
}) {
  const root = resolve(approvedTemporaryRoot);
  const parent = realpathSync(resolve(approvedTemporaryParent));
  if (
    normalizePathIdentity(dirname(root)) !== normalizePathIdentity(parent) ||
    !basename(root).startsWith(temporaryPrefix) ||
    basename(root).length <= temporaryPrefix.length
  ) {
    throw isolationError(ISOLATION_ERROR_CODES.CLEANUP_GUARD, "Refusing broad or substituted cleanup root");
  }
  const state = pathState(root);
  if (!state) {
    throw isolationError(ISOLATION_ERROR_CODES.CLEANUP_GUARD, "Approved cleanup root disappeared");
  }
  if (!state.isDirectory() || state.isSymbolicLink() || !sameStatIdentity(statIdentity(state), rootIdentity)) {
    throw isolationError(ISOLATION_ERROR_CODES.CLEANUP_GUARD, "Cleanup root identity is not approved");
  }
  if (normalizePathIdentity(realpathSync(root)) !== normalizePathIdentity(root)) {
    throw isolationError(ISOLATION_ERROR_CODES.CLEANUP_GUARD, "Cleanup root realpath is not approved");
  }
  validateCleanupTree(root);
  rmSync(root, { recursive: true, force: false });
  if (existsSync(root)) {
    throw isolationError(ISOLATION_ERROR_CODES.CLEANUP_GUARD, "Approved temporary root remains after cleanup");
  }
  return Object.freeze({ removed: true, alreadyAbsent: false });
}

function combineFailures(failures) {
  if (failures.length === 1) {
    return failures[0];
  }
  const error = new AggregateError(
    failures,
    "Release gate isolation failed in multiple safety boundaries",
  );
  error.code = "RELEASE_GATE_ISOLATION_FAILED";
  error.errorCodes = Object.freeze(
    failures.map((failure) => failure?.code ?? "RELEASE_GATE_ISOLATION_FAILED"),
  );
  const attributedFailure = failures.find((failure) => failure?.isolation);
  if (attributedFailure) {
    error.status = attributedFailure.status;
    error.retryable = attributedFailure.retryable;
    error.inconclusive = attributedFailure.inconclusive;
    error.isolation = attributedFailure.isolation;
  }
  return error;
}

function protectedSnapshotSummary(snapshot) {
  return Object.freeze(
    snapshot.map(({ label, state, entryCount, unreadableCount, sha256: digest }) =>
      Object.freeze({ label, state, entryCount, unreadableCount, sha256: digest }),
    ),
  );
}

function attemptHistoryRecord(attempt, classification) {
  return Object.freeze({
    attempt,
    status: classification.status,
    differenceCount: classification.differenceCount,
    attributedCount: classification.attributedCount,
    retryable: classification.retryable,
    inconclusive: classification.inconclusive,
    differences: classification.displayedDifferences,
    truncated: classification.truncated,
  });
}

function finalIsolationSummary(status, history) {
  return Object.freeze({
    status,
    attempts: history.length,
    history: Object.freeze([...history]),
    retryable: status === ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED,
    inconclusive: status === ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED,
    retryExhausted:
      status === ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED && history.length === 2,
  });
}

function attachAttemptMetadata(error, attempts, history) {
  if (error && typeof error === "object") {
    error.attempts = attempts;
    error.history = Object.freeze([...history]);
  }
  return error;
}

function runSingleIsolationAttempt({
  attempt,
  physicalRepositoryRoot,
  requireMarketplace,
  inheritedEnvironment,
  spawnProcess,
  targetOverrides,
  temporaryParent,
  attemptLifecycle,
}) {
  const protectedLocations = resolveProtectedLocations({ environment: inheritedEnvironment });
  const approvedTemporaryParent = assertTemporaryParent(temporaryParent, protectedLocations);
  const parentEnvironmentBefore = captureParentEnvironment(process.env);
  let plan;
  let protectedBefore;
  let protectedAfter;
  let lifecycleSummary;
  let packedSkillDigests = new Set();
  let classification;
  let cleanupResult;
  const failures = [];

  const approvedTemporaryRoot = mkdtempSync(join(approvedTemporaryParent, temporaryPrefix));
  const rootState = pathState(approvedTemporaryRoot);
  const rootIdentity = statIdentity(rootState);
  const cleanupApproval = {
    approvedTemporaryRoot: realpathSync(approvedTemporaryRoot),
    approvedTemporaryParent,
    rootIdentity,
  };

  try {
    plan = createIsolationPlan({
      ...cleanupApproval,
      overrides: targetOverrides,
    });
    assertIsolationPlan(plan, protectedLocations);
    materializeIsolationPlan(plan);
    assertMaterializedPlan(plan, protectedLocations);
    const environment = createIsolatedChildEnvironment(plan, inheritedEnvironment);
    protectedBefore = snapshotProtectedState(protectedLocations);
    const context = {
      plan,
      protectedLocations,
      environment,
      spawnProcess,
      repositoryRoot: physicalRepositoryRoot,
      requireMarketplace,
      attempt,
    };
    const lifecycleResult = attemptLifecycle(context);
    lifecycleSummary = lifecycleResult?.summary ?? {};
    packedSkillDigests = new Set(lifecycleResult?.packedSkillDigests ?? []);
  } catch (error) {
    failures.push(error);
  } finally {
    if (protectedBefore) {
      try {
        protectedAfter = snapshotProtectedState(protectedLocations);
      } catch (error) {
        failures.push(error);
      }
    }
    const parentEnvironmentAfter = captureParentEnvironment(process.env);
    const environmentChanges = parentEnvironmentDifferences(
      parentEnvironmentBefore,
      parentEnvironmentAfter,
    );
    if (protectedBefore && protectedAfter) {
      classification = classifyProtectedState(protectedBefore, protectedAfter, {
        packedSkillDigests,
        parentEnvironmentChanges: environmentChanges,
      });
    } else if (environmentChanges.length > 0) {
      classification = classifyProtectedState([], [], {
        parentEnvironmentChanges: environmentChanges,
      });
    }
    try {
      cleanupResult = removeApprovedTemporaryRoot(plan ?? cleanupApproval);
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    if (classification && classification.status !== ISOLATION_OUTCOMES.CLEAN) {
      const record = attemptHistoryRecord(attempt, classification);
      const isolation = finalIsolationSummary(classification.status, [record]);
      failures.push(attributionError(classification, isolation));
    }
    throw combineFailures(failures);
  }
  if (!classification) {
    throw isolationError(
      ISOLATION_ERROR_CODES.NORMAL_STATE_SNAPSHOT_FAILED,
      "Protected-state classification was unavailable",
    );
  }

  return Object.freeze({
    classification,
    history: attemptHistoryRecord(attempt, classification),
    pathGuard: Object.freeze({
      approvedRootRemoved: !existsSync(plan.approvedTemporaryRoot),
      protectedLocationCount: protectedLocations.entries.length,
      targetCount: plan.targets.length,
    }),
    sentinels: Object.freeze({
      before: protectedSnapshotSummary(protectedBefore),
      after: protectedSnapshotSummary(protectedAfter),
      unchanged: protectedStateDifferences(protectedBefore, protectedAfter).length === 0,
    }),
    environment: Object.freeze({
      childOnly: true,
      parentUnchanged: classification.differences.every(
        ({ protectedLocation }) => protectedLocation !== "parent-environment",
      ),
    }),
    cleanup: Object.freeze({ removed: cleanupResult.removed }),
    lifecycleSummary,
  });
}

export function runIsolatedReleaseLifecycle({
  repositoryRoot = REPOSITORY_ROOT,
  requireMarketplace = true,
  inheritedEnvironment = process.env,
  spawnProcess = spawnSync,
  targetOverrides,
  temporaryParent = tmpdir(),
  attemptLifecycle = runReleaseLifecycleAttempt,
} = {}) {
  const physicalRepositoryRoot = realpathSync(resolve(repositoryRoot));
  const history = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let result;
    try {
      result = runSingleIsolationAttempt({
        attempt,
        physicalRepositoryRoot,
        requireMarketplace,
        inheritedEnvironment,
        spawnProcess,
        targetOverrides,
        temporaryParent,
        attemptLifecycle,
      });
    } catch (error) {
      throw attachAttemptMetadata(error, attempt, history);
    }

    history.push(result.history);
    const { status } = result.classification;
    if (status === ISOLATION_OUTCOMES.CLEAN) {
      return Object.freeze({
        isolation: finalIsolationSummary(status, history),
        pathGuard: result.pathGuard,
        sentinels: result.sentinels,
        environment: result.environment,
        cleanup: result.cleanup,
        ...result.lifecycleSummary,
      });
    }
    if (status === ISOLATION_OUTCOMES.ISOLATION_VIOLATION) {
      const isolation = finalIsolationSummary(status, history);
      throw attributionError(result.classification, isolation);
    }
    if (attempt === 2) {
      const isolation = finalIsolationSummary(status, history);
      throw attributionError(result.classification, isolation);
    }
  }

  throw new Error("Unreachable isolation retry state");
}

export function formatIsolationFailure(error) {
  const code = error?.code ?? "RELEASE_GATE_ISOLATION_FAILED";
  const message = error instanceof Error ? error.message : String(error);
  const details = {
    ...(error?.errorCodes ? { failureCodes: error.errorCodes } : {}),
    ...(error?.isolation ? { isolation: error.isolation } : {}),
  };
  const structured = Object.keys(details).length > 0
    ? `\n${JSON.stringify(details, null, 2)}`
    : "";
  return `${code}: ${message}${structured}\n`;
}

function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    const summary = runIsolatedReleaseLifecycle();
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(formatIsolationFailure(error));
    process.exitCode = 1;
  }
}
