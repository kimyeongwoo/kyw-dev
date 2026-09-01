import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
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
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path, {
  basename,
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  HERMETIC_PROOF_SCHEMA_VERSION,
  atomicWriteSanitizedSummary,
  buildHermeticRunProof,
  createOwnedRun,
  identitiesOverlap as harnessIdentitiesOverlap,
  isSameOrDescendant as harnessIsSameOrDescendant,
  isStrictDescendant as harnessIsStrictDescendant,
  normalizePathIdentity as normalizeHarnessPathIdentity,
  redactSecrets,
  runDurableChild,
  sealOwnedRun,
  validateHermeticProofReceipt,
  writeOwnedEvidenceJson,
} from "./release-evidence-harness.mjs";

export const MANUAL_RUNNER_ERROR_CODES = Object.freeze({
  ARGUMENT_ERROR: "ARGUMENT_ERROR",
  ATTEMPT_ALREADY_CONSUMED: "ATTEMPT_ALREADY_CONSUMED",
  AUTHORIZATION_REQUIRED: "AUTHORIZATION_REQUIRED",
  CHECKOUT_IDENTITY_MISMATCH: "CHECKOUT_IDENTITY_MISMATCH",
  CHECKOUT_MATERIALIZATION_FAILED: "CHECKOUT_MATERIALIZATION_FAILED",
  ENVIRONMENT_UNSAFE: "ENVIRONMENT_UNSAFE",
  EVIDENCE_FAILED: "EVIDENCE_FAILED",
  GIT_CAPABILITY_MISSING: "GIT_CAPABILITY_MISSING",
  HARNESS_FAILED: "HARNESS_FAILED",
  PATH_UNSAFE: "PATH_UNSAFE",
  POST_PROCESSING_FAILED: "POST_PROCESSING_FAILED",
  PROOF_FAILED: "PROOF_FAILED",
  SOURCE_REPOSITORY_UNSAFE: "SOURCE_REPOSITORY_UNSAFE",
  SOURCE_SHA_INVALID: "SOURCE_SHA_INVALID",
  SOURCE_STATE_CHANGED: "SOURCE_STATE_CHANGED",
  SOURCE_STATE_MISMATCH: "SOURCE_STATE_MISMATCH",
  STATE_ROOT_UNSAFE: "STATE_ROOT_UNSAFE",
});

export const RUNNER_INVOCATION_LIMITS = Object.freeze({
  harnessMaximum: 1,
  releaseMaximum: 1,
  retryMaximum: 0,
  runnerMaximum: 1,
});

const sourceFilePaths = Object.freeze({
  harness: "scripts/release-evidence-harness.mjs",
  package: "package.json",
  runner: "scripts/release-evidence-manual-runner.mjs",
});
const stateOwnerFileName = ".release-evidence-runner-owner.json";
const stateSealFileName = ".release-evidence-runner-seal.json";
const attemptFileName = ".release-evidence-manual-attempt.json";
const fullCommitPattern = /^[0-9a-f]{40}$/i;
const fullObjectPattern = /^[0-9a-f]{40}$/;
const safeNoncePattern = /^[a-f0-9]{32,96}$/;
const unsafeEnvironmentName =
  /(?:credential|password|passwd|secret|token|auth|proxy|cookie|private[_-]?key)/i;
const nativeRealpath = realpathSync.native?.bind(realpathSync) ?? realpathSync;

export class ReleaseEvidenceManualRunnerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ReleaseEvidenceManualRunnerError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new ReleaseEvidenceManualRunnerError(code, message, details);
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeError(error) {
  const homePath = homedir();
  const redactedMessage = redactSecrets(String(error?.message ?? error));
  return Object.freeze({
    code: String(error?.code ?? "UNKNOWN_ERROR").slice(0, 80),
    message: redactedMessage
      .replaceAll(homePath, "[REDACTED_HOME]")
      .slice(0, 1_000),
  });
}

function pathApiFor(platform = process.platform) {
  return platform === "win32" ? path.win32 : path.posix;
}

function normalizePathIdentity(filePath, platform = process.platform) {
  return normalizeHarnessPathIdentity(String(filePath), { platform });
}

function isSameOrDescendant(rootPath, candidatePath, platform = process.platform) {
  return harnessIsSameOrDescendant(rootPath, candidatePath, { platform });
}

function isStrictDescendant(rootPath, candidatePath, platform = process.platform) {
  return harnessIsStrictDescendant(rootPath, candidatePath, { platform });
}

function pathsOverlap(leftPath, rightPath, platform = process.platform) {
  return harnessIdentitiesOverlap(leftPath, rightPath, { platform });
}

function pathState(filePath) {
  try {
    return lstatSync(filePath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

function statIdentity(state) {
  return Object.freeze({
    birthtimeNs: String(state.birthtimeNs),
    dev: String(state.dev),
    ino: String(state.ino),
  });
}

function identitiesEqual(left, right) {
  return (
    left?.birthtimeNs === right?.birthtimeNs &&
    left?.dev === right?.dev &&
    left?.ino === right?.ino
  );
}

function walkExistingAncestors(filePath, callback) {
  let current = resolve(filePath);
  while (true) {
    callback(current);
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function assertNonLinkedAncestorChain(filePath, role, code) {
  walkExistingAncestors(filePath, (candidate) => {
    const state = pathState(candidate);
    if (state?.isSymbolicLink()) {
      fail(code, `${role} contains a symbolic-link or reparse ancestor`, {
        role,
        path: candidate,
      });
    }
  });
}

function canonicalRealEntry(
  filePath,
  role,
  {
    allowFile = false,
    canonicalizer = nativeRealpath,
    code = MANUAL_RUNNER_ERROR_CODES.PATH_UNSAFE,
    requireCanonicalInput = true,
  } = {},
) {
  if (typeof filePath !== "string" || !filePath.trim() || !isAbsolute(filePath)) {
    fail(code, `${role} must be an explicit absolute path`, { role });
  }
  const lexicalPath = resolve(filePath);
  const state = pathState(lexicalPath);
  if (
    !state ||
    state.isSymbolicLink() ||
    (!state.isDirectory() && !(allowFile && state.isFile()))
  ) {
    fail(code, `${role} must be an existing real ${allowFile ? "file or directory" : "directory"}`, {
      role,
    });
  }
  assertNonLinkedAncestorChain(lexicalPath, role, code);
  const canonicalPath = resolve(canonicalizer(lexicalPath));
  if (
    requireCanonicalInput &&
    normalizePathIdentity(lexicalPath) !== normalizePathIdentity(canonicalPath)
  ) {
    fail(code, `${role} must be supplied by its canonical real path`, { role });
  }
  const canonicalState = statSync(canonicalPath, { bigint: true });
  return Object.freeze({
    canonicalPath,
    identity: statIdentity(canonicalState),
    lexicalPath,
    type: canonicalState.isFile() ? "file" : "directory",
  });
}

function canonicalProjectedPath(filePath, canonicalizer = nativeRealpath) {
  let ancestor = resolve(filePath);
  const missing = [];
  while (!pathState(ancestor)) {
    const parent = dirname(ancestor);
    if (parent === ancestor) return resolve(filePath);
    missing.unshift(path.basename(ancestor));
    ancestor = parent;
  }
  return resolve(canonicalizer(ancestor), ...missing);
}

function environmentValue(environment, name) {
  return Object.entries(environment).find(
    ([candidate, value]) => candidate.toLowerCase() === name.toLowerCase() && value,
  )?.[1];
}

function collectInteractiveRoots(environment, canonicalizer = nativeRealpath) {
  const names = [
    "HOME",
    "USERPROFILE",
    "CODEX_HOME",
    "APPDATA",
    "LOCALAPPDATA",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "XDG_DATA_HOME",
    "XDG_STATE_HOME",
    "TEMP",
    "TMP",
    "TMPDIR",
    "npm_config_userconfig",
    "npm_config_globalconfig",
    "npm_config_cache",
    "GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_SYSTEM",
  ];
  const candidates = [{ name: "os.homedir", value: homedir() }];
  for (const name of names) {
    const value = environmentValue(environment, name);
    if (typeof value === "string" && value.trim() && isAbsolute(value)) {
      candidates.push({ name, value });
    }
  }
  const unique = new Map();
  for (const candidate of candidates) {
    if (!isAbsolute(candidate.value)) continue;
    const canonicalPath = canonicalProjectedPath(candidate.value, canonicalizer);
    const identity = normalizePathIdentity(canonicalPath);
    if (!unique.has(identity)) unique.set(identity, { ...candidate, canonicalPath });
  }
  return Object.freeze([...unique.values()].map((entry) => Object.freeze(entry)));
}

function assertDisjointRoles(roles, code = MANUAL_RUNNER_ERROR_CODES.PATH_UNSAFE) {
  const entries = Object.entries(roles).filter(([, value]) => typeof value === "string");
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const [leftRole, leftPath] = entries[leftIndex];
      const [rightRole, rightPath] = entries[rightIndex];
      if (pathsOverlap(leftPath, rightPath)) {
        fail(code, `${leftRole} overlaps ${rightRole}`, { leftRole, rightRole });
      }
    }
  }
}

export function parseManualRunnerArguments(argv) {
  if (!Array.isArray(argv)) {
    fail(MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR, "Arguments must be an array");
  }
  const booleans = new Set(["--allow-release-command", "--dry-validate", "--run"]);
  const values = new Set([
    "--allowed-parent",
    "--evidence-root",
    "--repository",
    "--source-sha",
  ]);
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (booleans.has(argument)) {
      if (parsed[argument]) {
        fail(MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR, `Duplicate ${argument}`);
      }
      parsed[argument] = true;
      continue;
    }
    if (values.has(argument)) {
      if (
        parsed[argument] !== undefined ||
        index + 1 >= argv.length ||
        String(argv[index + 1]).startsWith("--")
      ) {
        fail(MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR, `Invalid ${argument}`);
      }
      parsed[argument] = argv[++index];
      continue;
    }
    fail(MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR, `Unsupported argument ${argument}`);
  }
  const modes = ["--dry-validate", "--run"].filter((name) => parsed[name]);
  if (modes.length !== 1) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR,
      "Choose exactly one of --dry-validate or --run",
    );
  }
  for (const name of ["--allowed-parent", "--evidence-root", "--repository", "--source-sha"]) {
    if (!parsed[name]) {
      fail(MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR, `${name} is required`);
    }
  }
  if (!fullCommitPattern.test(parsed["--source-sha"])) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_SHA_INVALID,
      "--source-sha must be one literal full 40-hex commit",
    );
  }
  const allowReleaseCommand = parsed["--allow-release-command"] === true;
  if (allowReleaseCommand && !parsed["--run"]) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR,
      "--allow-release-command is valid only with --run",
    );
  }
  if (parsed["--run"] && !allowReleaseCommand) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.AUTHORIZATION_REQUIRED,
      "Actual mode requires --allow-release-command",
    );
  }
  return Object.freeze({
    allowReleaseCommand,
    allowedParent: parsed["--allowed-parent"],
    evidenceRoot: parsed["--evidence-root"],
    mode: parsed["--run"] ? "run" : "dry-validate",
    repositoryRoot: parsed["--repository"],
    sourceSha: parsed["--source-sha"].toLowerCase(),
  });
}

export function validateManualRunnerInputs(
  options,
  { canonicalizer = nativeRealpath, inheritedEnvironment = process.env } = {},
) {
  if (!fullCommitPattern.test(String(options?.sourceSha ?? ""))) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_SHA_INVALID,
      "sourceSha must be one literal full 40-hex commit",
    );
  }
  if (!["dry-validate", "run"].includes(options?.mode)) {
    fail(MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR, "Mode must be dry-validate or run");
  }
  if (options.mode === "run" && options.allowReleaseCommand !== true) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.AUTHORIZATION_REQUIRED,
      "Actual mode requires explicit release-command authority",
    );
  }
  if (options.mode !== "run" && options.allowReleaseCommand === true) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.ARGUMENT_ERROR,
      "Release-command authority is forbidden outside actual mode",
    );
  }
  const repository = canonicalRealEntry(options.repositoryRoot, "Source repository", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.SOURCE_REPOSITORY_UNSAFE,
  });
  const allowedParent = canonicalRealEntry(options.allowedParent, "Allowed parent", {
    canonicalizer,
  });
  const evidenceRoot = canonicalRealEntry(options.evidenceRoot, "Evidence root", {
    canonicalizer,
  });
  if (!isStrictDescendant(allowedParent.canonicalPath, evidenceRoot.canonicalPath)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.PATH_UNSAFE,
      "Evidence root must be a canonical strict child of the allowed parent",
    );
  }
  if (pathsOverlap(repository.canonicalPath, allowedParent.canonicalPath)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.PATH_UNSAFE,
      "The repository and caller-owned external parent must be disjoint",
    );
  }
  const interactiveRoots = collectInteractiveRoots(inheritedEnvironment, canonicalizer);
  for (const interactive of interactiveRoots) {
    if (pathsOverlap(evidenceRoot.canonicalPath, interactive.canonicalPath)) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.PATH_UNSAFE,
        `Evidence root overlaps interactive root ${interactive.name}`,
        { interactiveRole: interactive.name },
      );
    }
  }
  return Object.freeze({
    allowedParent,
    evidenceRoot,
    interactiveRoots,
    mode: options.mode,
    repository,
    sourceSha: options.sourceSha.toLowerCase(),
  });
}

function writeDurableExclusive(filePath, contents, mode = 0o600) {
  const descriptor = openSync(filePath, "wx", mode);
  try {
    writeFileSync(descriptor, contents);
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

function createRealDirectory(directoryPath) {
  mkdirSync(directoryPath);
  const state = lstatSync(directoryPath, { bigint: true });
  if (!state.isDirectory() || state.isSymbolicLink()) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "A hermetic layout entry was not created as a real directory",
    );
  }
  fsyncParentDirectory(directoryPath);
  return state;
}

function assertStateOwnership(state) {
  const current = pathState(state.stateRoot);
  const ownerPath = join(state.stateRoot, stateOwnerFileName);
  if (!current?.isDirectory() || current.isSymbolicLink() || !existsSync(ownerPath)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Runner-owned state root is missing or linked",
      { stateRoot: state.stateRoot },
    );
  }
  let owner;
  try {
    owner = JSON.parse(readFileSync(ownerPath, "utf8"));
  } catch (error) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      `Runner-owned state record is unreadable: ${safeError(error).message}`,
      { stateRoot: state.stateRoot },
    );
  }
  if (
    owner.token !== state.token ||
    owner.schemaVersion !== 1 ||
    !identitiesEqual(owner.rootIdentity, statIdentity(current))
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Runner-owned state token or filesystem identity changed",
      { stateRoot: state.stateRoot },
    );
  }
}

function collectStateInventory(stateRoot, { excludeSeal = true } = {}) {
  const inventory = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const entryPath = join(directory, entry.name);
      const relativePath = relative(stateRoot, entryPath).replaceAll("\\", "/");
      if (excludeSeal && relativePath === stateSealFileName) continue;
      const state = lstatSync(entryPath, { bigint: true });
      if (state.isSymbolicLink() || (!state.isDirectory() && !state.isFile())) {
        fail(
          MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
          "Runner-owned state contains a link or unsupported entry",
          { relativePath },
        );
      }
      if (state.isDirectory()) {
        inventory.push({ path: relativePath, type: "directory" });
        visit(entryPath);
      } else {
        const contents = readFileSync(entryPath);
        inventory.push({
          bytes: contents.length,
          path: relativePath,
          sha256: sha256(contents),
          type: "file",
        });
      }
    }
  }
  visit(stateRoot);
  return inventory.sort((left, right) => left.path.localeCompare(right.path));
}

export function createHermeticLayout(
  validation,
  {
    canonicalizer = nativeRealpath,
    clock = () => new Date(),
    nonce = () => randomBytes(24).toString("hex"),
    onStateCreated,
  } = {},
) {
  const token = String(typeof nonce === "function" ? nonce() : nonce);
  if (!safeNoncePattern.test(token)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "The runner nonce must be an unpredictable filesystem-safe value",
    );
  }
  const evidenceParent = dirname(validation.evidenceRoot.canonicalPath);
  if (!isSameOrDescendant(validation.allowedParent.canonicalPath, evidenceParent)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Evidence sibling parent escaped the allowed parent",
    );
  }
  canonicalRealEntry(evidenceParent, "Evidence sibling parent", { canonicalizer });
  const stateRoot = join(evidenceParent, `.release-evidence-state-${token}`);
  if (existsSync(stateRoot)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Unpredictable runner state root already exists",
      { stateRoot },
    );
  }
  const stateRootIdentity = statIdentity(createRealDirectory(stateRoot));
  const owner = Object.freeze({
    createdAt: clockIso(clock),
    rootIdentity: stateRootIdentity,
    schemaVersion: 1,
    token,
  });
  writeDurableExclusive(join(stateRoot, stateOwnerFileName), stableJson(owner));
  const checkoutRoot = join(stateRoot, "checkout");
  const partialState = Object.freeze({
    allowedParent: validation.allowedParent,
    checkoutRoot,
    evidenceRoot: validation.evidenceRoot,
    layout: Object.freeze({}),
    repository: validation.repository,
    rootIdentity: stateRootIdentity,
    stateRoot: resolve(stateRoot),
    token,
  });
  if (typeof onStateCreated === "function") onStateCreated(partialState);
  const containerNames = ["appdata", "git", "npm", "xdg"];
  for (const name of containerNames) createRealDirectory(join(stateRoot, name));
  const directoryLayout = {
    appDataRoot: join(stateRoot, "appdata", "roaming"),
    codexHomeRoot: join(stateRoot, "codex-home"),
    homeRoot: join(stateRoot, "home"),
    localAppDataRoot: join(stateRoot, "appdata", "local"),
    npmCacheRoot: join(stateRoot, "npm", "cache"),
    tempRoot: join(stateRoot, "temp"),
    xdgCacheHome: join(stateRoot, "xdg", "cache"),
    xdgConfigHome: join(stateRoot, "xdg", "config"),
    xdgDataHome: join(stateRoot, "xdg", "data"),
    xdgStateHome: join(stateRoot, "xdg", "state"),
  };
  for (const directoryPath of Object.values(directoryLayout)) createRealDirectory(directoryPath);
  const fileLayout = {
    gitConfigGlobalFile: join(stateRoot, "git", "global.config"),
    gitConfigSystemFile: join(stateRoot, "git", "system.config"),
    npmGlobalConfigFile: join(stateRoot, "npm", "globalconfig.npmrc"),
    npmUserConfigFile: join(stateRoot, "npm", "userconfig.npmrc"),
  };
  for (const filePath of Object.values(fileLayout)) writeDurableExclusive(filePath, "\n");
  const layout = {};
  for (const [role, entryPath] of Object.entries({ ...directoryLayout, ...fileLayout })) {
    layout[role] = resolve(canonicalizer(entryPath));
    if (!isStrictDescendant(stateRoot, layout[role])) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
        `Hermetic role ${role} escaped runner-owned state`,
      );
    }
    canonicalRealEntry(entryPath, `Hermetic role ${role}`, {
      allowFile: role.endsWith("File"),
      canonicalizer,
    });
  }
  assertDisjointRoles(layout, MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE);
  const forbidden = {
    evidenceRoot: validation.evidenceRoot.canonicalPath,
    repositoryRoot: validation.repository.canonicalPath,
    ...Object.fromEntries(
      validation.interactiveRoots.map((entry, index) => [
        `interactive-${index}-${entry.name}`,
        entry.canonicalPath,
      ]),
    ),
  };
  for (const [role, rolePath] of Object.entries({
    checkoutRoot,
    stateRoot,
    ...layout,
  })) {
    for (const [forbiddenRole, forbiddenPath] of Object.entries(forbidden)) {
      if (pathsOverlap(rolePath, forbiddenPath)) {
        fail(
          MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
          `${role} overlaps forbidden ${forbiddenRole}`,
          { forbiddenRole, role },
        );
      }
    }
  }
  const state = Object.freeze({
    allowedParent: validation.allowedParent,
    checkoutRoot,
    evidenceRoot: validation.evidenceRoot,
    layout: Object.freeze(layout),
    repository: validation.repository,
    rootIdentity: stateRootIdentity,
    stateRoot: resolve(canonicalizer(stateRoot)),
    token,
  });
  assertStateOwnership(state);
  if (typeof onStateCreated === "function") onStateCreated(state);
  return state;
}

function executableExtensions(environment, platform) {
  if (platform !== "win32") return [""];
  const configured = environmentValue(environment, "PATHEXT");
  const values = String(configured || ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter(Boolean);
  return values.map((value) => value.toLowerCase());
}

function resolveExecutable(name, environment, platform = process.platform) {
  const pathApi = pathApiFor(platform);
  const configuredPath = environmentValue(environment, "PATH") ?? "";
  const extensions = executableExtensions(environment, platform);
  for (const entry of configuredPath.split(platform === "win32" ? ";" : ":")) {
    if (!entry) continue;
    for (const extension of extensions) {
      const candidate = pathApi.resolve(entry, `${name}${extension}`);
      const state = pathState(candidate);
      if (state?.isFile() || state?.isSymbolicLink()) return candidate;
    }
  }
  fail(
    MANUAL_RUNNER_ERROR_CODES.GIT_CAPABILITY_MISSING,
    `Required runtime ${name} was not found on the inherited PATH`,
  );
}

function fileIdentity(filePath, canonicalizer = nativeRealpath) {
  const lexicalPath = resolve(filePath);
  const lexicalState = pathState(lexicalPath);
  if (!lexicalState || (!lexicalState.isFile() && !lexicalState.isSymbolicLink())) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
      "A required runtime launcher is missing, linked, or not a regular file",
    );
  }
  const canonicalPath = resolve(canonicalizer(lexicalPath));
  const canonicalState = statSync(canonicalPath, { bigint: true });
  if (!canonicalState.isFile()) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
      "A required runtime launcher target is not a regular file",
    );
  }
  const contents = readFileSync(canonicalPath);
  return Object.freeze({
    bytes: contents.length,
    canonicalPath,
    identity: statIdentity(canonicalState),
    lexicalIdentity: statIdentity(lexicalState),
    lexicalPath,
    lexicalType: lexicalState.isSymbolicLink() ? "link" : "file",
    sha256: sha256(contents),
  });
}

function assertRuntimeIdentitiesUnchanged(runtime, canonicalizer = nativeRealpath) {
  for (const [role, launcher] of [
    ["git", runtime.gitCandidate],
    ["node", runtime.nodeCandidate],
    ["npm", runtime.npmCandidate],
  ]) {
    const current = fileIdentity(launcher, canonicalizer);
    if (stableJson(current) !== stableJson(runtime[role])) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        `Required ${role} runtime identity changed during the manual run`,
      );
    }
  }
  return true;
}

export function resolveRuntimeIdentities(
  {
    forbiddenRoots = [],
    inheritedEnvironment = process.env,
    interactiveRoots = collectInteractiveRoots(inheritedEnvironment),
    platform = process.platform,
  } = {},
  { canonicalizer = nativeRealpath } = {},
) {
  const nodeExecutable = resolve(canonicalizer(process.execPath));
  const gitCandidate = resolveExecutable("git", inheritedEnvironment, platform);
  const npmCandidate = resolveExecutable("npm", inheritedEnvironment, platform);
  const git = fileIdentity(gitCandidate, canonicalizer);
  const node = fileIdentity(nodeExecutable, canonicalizer);
  const npm = fileIdentity(npmCandidate, canonicalizer);
  const gitLauncher = git.canonicalPath;
  const npmLauncher = npm.canonicalPath;
  const runtime = {
    git,
    gitCandidate,
    gitLauncher,
    node,
    nodeCandidate: nodeExecutable,
    nodeExecutable: node.canonicalPath,
    npm,
    npmCandidate,
    npmLauncher,
  };
  const forbidden = [...interactiveRoots, ...forbiddenRoots];
  for (const launcher of [git, node, npm]) {
    const lexicalPaths = [launcher.lexicalPath, dirname(launcher.lexicalPath)];
    for (const forbiddenRoot of forbidden) {
      const forbiddenPaths = [
        forbiddenRoot.canonicalPath,
        forbiddenRoot.lexicalPath,
        forbiddenRoot.value,
      ].filter(
        (candidate, index, candidates) =>
          typeof candidate === "string" &&
          pathApiFor(platform).isAbsolute(candidate) &&
          candidates.indexOf(candidate) === index,
      );
      if (
        lexicalPaths.some((launcherPath) =>
          forbiddenPaths.some((forbiddenPath) =>
            pathsOverlap(launcherPath, forbiddenPath, platform),
          ),
        )
      ) {
        fail(
          MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
          `A required runtime directory overlaps forbidden root ${forbiddenRoot.name}`,
          { forbiddenRole: forbiddenRoot.name },
        );
      }
    }
  }
  const runtimeDirectories = [
    dirname(gitCandidate),
    dirname(gitLauncher),
    dirname(node.canonicalPath),
    dirname(npmCandidate),
    dirname(npmLauncher),
  ];
  const systemEnvironment = {};
  if (platform === "win32") {
    const systemRoot = environmentValue(inheritedEnvironment, "SystemRoot");
    if (!systemRoot || !isAbsolute(systemRoot)) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        "Windows hermetic execution requires an absolute SystemRoot",
      );
    }
    const systemRootEntry = canonicalRealEntry(systemRoot, "Windows SystemRoot", {
      canonicalizer,
      code: MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
    });
    const windowsDirectory = environmentValue(inheritedEnvironment, "windir");
    if (
      typeof windowsDirectory !== "string" ||
      normalizePathIdentity(windowsDirectory, platform) !==
        normalizePathIdentity(systemRootEntry.canonicalPath, platform)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        "Windows windir must identify the exact SystemRoot",
      );
    }
    const commandProcessor = canonicalRealEntry(
      environmentValue(inheritedEnvironment, "ComSpec"),
      "Windows command processor",
      {
        allowFile: true,
        canonicalizer,
        code: MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
      },
    );
    if (
      commandProcessor.type !== "file" ||
      !isStrictDescendant(systemRootEntry.canonicalPath, commandProcessor.canonicalPath)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        "Windows command processor must be inside SystemRoot",
      );
    }
    const pathExtensions = environmentValue(inheritedEnvironment, "PATHEXT");
    if (
      typeof pathExtensions !== "string" ||
      !/^(?:\.[A-Za-z0-9]+)(?:;\.[A-Za-z0-9]+)*$/.test(pathExtensions)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        "Windows PATHEXT contains an unsafe runtime value",
      );
    }
    const operatingSystem = environmentValue(inheritedEnvironment, "OS");
    if (operatingSystem !== "Windows_NT") {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        "Windows OS runtime identity is unavailable",
      );
    }
    Object.assign(systemEnvironment, {
      ComSpec: commandProcessor.canonicalPath,
      OS: operatingSystem,
      PATHEXT: pathExtensions,
      SystemRoot: systemRootEntry.canonicalPath,
      windir: systemRootEntry.canonicalPath,
    });
    runtimeDirectories.push(
      systemRootEntry.canonicalPath,
      join(systemRootEntry.canonicalPath, "System32"),
      join(systemRootEntry.canonicalPath, "System32", "Wbem"),
    );
  } else {
    runtimeDirectories.push("/usr/local/bin", "/usr/bin", "/bin");
  }
  const pathDirectories = [];
  const seen = new Set();
  for (const candidate of runtimeDirectories) {
    const state = pathState(candidate);
    if (!state?.isDirectory()) continue;
    const canonicalPath = resolve(canonicalizer(candidate));
    const identity = normalizePathIdentity(canonicalPath, platform);
    if (seen.has(identity)) continue;
    for (const forbiddenRoot of forbidden) {
      if (pathsOverlap(canonicalPath, forbiddenRoot.canonicalPath, platform)) {
        fail(
          MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
          `A required runtime directory overlaps forbidden root ${forbiddenRoot.name}`,
          { forbiddenRole: forbiddenRoot.name },
        );
      }
    }
    seen.add(identity);
    pathDirectories.push(canonicalPath);
  }
  return Object.freeze({
    ...runtime,
    pathDirectories: Object.freeze(pathDirectories),
    systemEnvironment: Object.freeze(systemEnvironment),
  });
}

function setEnvironmentValue(environment, name, value) {
  for (const current of Object.keys(environment)) {
    if (current.toLowerCase() === name.toLowerCase()) delete environment[current];
  }
  environment[name] = String(value);
}

function assertSafeProjectedEnvironment(environment, state, platform = process.platform) {
  for (const [name, value] of Object.entries(environment)) {
    if (unsafeEnvironmentName.test(name)) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        `Credential, authentication, or proxy environment key ${name} reached projection`,
      );
    }
    if (typeof value !== "string" || /[\0\r\n]/.test(value)) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        `Projected environment key ${name} is invalid`,
      );
    }
  }
  const requiredBindings = {
    APPDATA: state.layout.appDataRoot,
    CODEX_HOME: state.layout.codexHomeRoot,
    GIT_CONFIG_GLOBAL: state.layout.gitConfigGlobalFile,
    GIT_CONFIG_SYSTEM: state.layout.gitConfigSystemFile,
    HOME: state.layout.homeRoot,
    LOCALAPPDATA: state.layout.localAppDataRoot,
    TEMP: state.layout.tempRoot,
    TMP: state.layout.tempRoot,
    TMPDIR: state.layout.tempRoot,
    USERPROFILE: state.layout.homeRoot,
    XDG_CACHE_HOME: state.layout.xdgCacheHome,
    XDG_CONFIG_HOME: state.layout.xdgConfigHome,
    XDG_DATA_HOME: state.layout.xdgDataHome,
    XDG_STATE_HOME: state.layout.xdgStateHome,
    npm_config_cache: state.layout.npmCacheRoot,
    npm_config_globalconfig: state.layout.npmGlobalConfigFile,
    npm_config_userconfig: state.layout.npmUserConfigFile,
  };
  for (const [name, expected] of Object.entries(requiredBindings)) {
    if (
      normalizePathIdentity(environmentValue(environment, name), platform) !==
      normalizePathIdentity(expected, platform)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
        `Projected environment key ${name} escaped its hermetic role`,
      );
    }
  }
}

export function projectHermeticEnvironment({
  inheritedEnvironment = process.env,
  platform = process.platform,
  runtime,
  state,
} = {}) {
  if (!runtime || !state?.layout) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
      "Hermetic environment projection requires runtime and layout identities",
    );
  }
  const environment = {};
  setEnvironmentValue(environment, "PATH", runtime.pathDirectories.join(platform === "win32" ? ";" : ":"));
  const bindings = {
    APPDATA: state.layout.appDataRoot,
    CODEX_HOME: state.layout.codexHomeRoot,
    GIT_ATTR_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: state.layout.gitConfigGlobalFile,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: state.layout.gitConfigSystemFile,
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    HOME: state.layout.homeRoot,
    LOCALAPPDATA: state.layout.localAppDataRoot,
    TEMP: state.layout.tempRoot,
    TMP: state.layout.tempRoot,
    TMPDIR: state.layout.tempRoot,
    USERPROFILE: state.layout.homeRoot,
    XDG_CACHE_HOME: state.layout.xdgCacheHome,
    XDG_CONFIG_HOME: state.layout.xdgConfigHome,
    XDG_DATA_HOME: state.layout.xdgDataHome,
    XDG_STATE_HOME: state.layout.xdgStateHome,
    npm_config_audit: "false",
    npm_config_cache: state.layout.npmCacheRoot,
    npm_config_color: "false",
    npm_config_fund: "false",
    npm_config_globalconfig: state.layout.npmGlobalConfigFile,
    npm_config_update_notifier: "false",
    npm_config_userconfig: state.layout.npmUserConfigFile,
  };
  for (const [name, value] of Object.entries(bindings)) {
    setEnvironmentValue(environment, name, value);
  }
  if (platform === "win32") {
    for (const name of ["ComSpec", "OS", "PATHEXT", "SystemRoot", "windir"]) {
      const value = runtime.systemEnvironment?.[name];
      if (typeof value !== "string" || !value || /[\0\r\n]/.test(value)) {
        fail(
          MANUAL_RUNNER_ERROR_CODES.ENVIRONMENT_UNSAFE,
          `Windows runtime environment ${name} is unavailable`,
        );
      }
      setEnvironmentValue(environment, name, value);
    }
    const home = parse(state.layout.homeRoot);
    setEnvironmentValue(environment, "HOMEDRIVE", home.root.replace(/[\\/]$/, ""));
    setEnvironmentValue(
      environment,
      "HOMEPATH",
      state.layout.homeRoot.slice(home.root.length - 1),
    );
    const systemDrive = parse(runtime.systemEnvironment.SystemRoot).root.replace(
      /[\\/]$/,
      "",
    );
    setEnvironmentValue(environment, "LOGONSERVER", "\\\\HERMETIC");
    setEnvironmentValue(environment, "SYSTEMDRIVE", systemDrive);
    setEnvironmentValue(environment, "USERDOMAIN", "HERMETIC");
    setEnvironmentValue(environment, "USERNAME", "kyw-release-evidence");
  } else if (existsSync("/bin/sh")) {
    setEnvironmentValue(environment, "SHELL", "/bin/sh");
  }
  assertSafeProjectedEnvironment(environment, state, platform);
  return Object.freeze(environment);
}

function defaultGitSpawn(executable, args, options) {
  return spawnSync(executable, args, options);
}

function runGitRaw({
  args,
  cwd,
  environment,
  gitExecutable,
  gitSpawn = defaultGitSpawn,
  code = MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
  label = "Git observation",
}) {
  const result = gitSpawn(gitExecutable, args, {
    cwd,
    encoding: null,
    env: environment,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (result?.status !== 0 || result?.error) {
    const stderr = Buffer.isBuffer(result?.stderr)
      ? result.stderr.toString("utf8")
      : String(result?.stderr ?? "");
    fail(code, `${label} failed: ${safeError(result?.error ?? stderr).message}`, {
      args,
    });
  }
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
}

function runGitText(options) {
  return runGitRaw(options).toString("utf8").trim();
}

function readCommittedFileIdentity({
  environment,
  gitExecutable,
  gitSpawn,
  repositoryRoot,
  sourceSha,
  relativePath,
}) {
  const common = { cwd: repositoryRoot, environment, gitExecutable, gitSpawn };
  const blobSha = runGitText({
    ...common,
    args: ["rev-parse", `${sourceSha}:${relativePath}`],
    label: `Committed blob lookup for ${relativePath}`,
  });
  if (!fullObjectPattern.test(blobSha)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
      `Committed path ${relativePath} did not resolve to a full blob`,
    );
  }
  const objectType = runGitText({
    ...common,
    args: ["cat-file", "-t", blobSha],
    label: `Committed type lookup for ${relativePath}`,
  });
  if (objectType !== "blob") {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
      `Committed path ${relativePath} is not a blob`,
    );
  }
  const contents = runGitRaw({
    ...common,
    args: ["cat-file", "blob", blobSha],
    label: `Committed byte lookup for ${relativePath}`,
  });
  return Object.freeze({
    blobSha,
    bytes: contents.length,
    relativePath,
    sha256: sha256(contents),
  });
}

function gitMetadataIdentity(filePath, canonicalizer = nativeRealpath) {
  const state = pathState(filePath);
  if (!state?.isFile() || state.isSymbolicLink()) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_REPOSITORY_UNSAFE,
      "Repository index must be an existing real file",
    );
  }
  const canonicalPath = resolve(canonicalizer(filePath));
  const contents = readFileSync(canonicalPath);
  return Object.freeze({
    bytes: contents.length,
    canonicalPath,
    identity: statIdentity(statSync(canonicalPath, { bigint: true })),
    sha256: sha256(contents),
  });
}

function gitBlobSha(contents) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${contents.length}\0`))
    .update(contents)
    .digest("hex");
}

function captureTrackedWorktreeIdentity(
  repositoryRoot,
  indexEntries,
  canonicalizer = nativeRealpath,
) {
  const decoded = indexEntries.toString("utf8");
  if (!Buffer.from(decoded, "utf8").equals(indexEntries)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
      "Tracked index paths must be valid UTF-8",
    );
  }
  const entries = [];
  const seenPaths = new Set();
  for (const record of decoded.split("\0")) {
    if (!record) continue;
    const separator = record.indexOf("\t");
    const metadata = separator === -1 ? "" : record.slice(0, separator);
    const relativePath = separator === -1 ? "" : record.slice(separator + 1);
    const match = /^(100644|100755) ([a-f0-9]{40}) 0$/.exec(metadata);
    if (
      !match ||
      !relativePath ||
      seenPaths.has(relativePath) ||
      /(?:^|\/)\.\.(?:\/|$)/.test(relativePath)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
        "The source index contains an unsupported mode, stage, or path",
      );
    }
    seenPaths.add(relativePath);
    const lexicalPath = resolve(repositoryRoot, ...relativePath.split("/"));
    const state = pathState(lexicalPath);
    if (!state?.isFile() || state.isSymbolicLink()) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
        `Tracked source path ${relativePath} is missing, linked, or not a file`,
      );
    }
    const canonicalPath = resolve(canonicalizer(lexicalPath));
    if (
      !isStrictDescendant(repositoryRoot, canonicalPath) ||
      normalizePathIdentity(lexicalPath) !== normalizePathIdentity(canonicalPath)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
        `Tracked source path ${relativePath} escapes through an alias or link`,
      );
    }
    const contents = readFileSync(canonicalPath);
    if (gitBlobSha(contents) !== match[2]) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
        `Tracked source bytes for ${relativePath} differ from the exact index blob`,
      );
    }
    entries.push({
      blobSha: match[2],
      bytes: contents.length,
      mode: match[1],
      path: relativePath,
      sha256: sha256(contents),
    });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return Object.freeze({
    count: entries.length,
    sha256: sha256(stableJson(entries)),
  });
}

export function captureRepositoryIdentity({
  canonicalizer = nativeRealpath,
  environment,
  gitExecutable,
  gitSpawn = defaultGitSpawn,
  repositoryRoot,
  sourceSha,
} = {}) {
  const common = { cwd: repositoryRoot, environment, gitExecutable, gitSpawn };
  const topLevel = runGitText({
    ...common,
    args: ["rev-parse", "--show-toplevel"],
    label: "Repository top-level lookup",
  });
  if (
    normalizePathIdentity(canonicalizer(topLevel)) !==
    normalizePathIdentity(canonicalizer(repositoryRoot))
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_REPOSITORY_UNSAFE,
      "Source repository does not name its exact Git top level",
    );
  }
  const headSha = runGitText({ ...common, args: ["rev-parse", "HEAD"] });
  const resolvedSource = runGitText({
    ...common,
    args: ["rev-parse", `${sourceSha}^{commit}`],
    label: "Literal source commit lookup",
  });
  const sourceTree = runGitText({
    ...common,
    args: ["rev-parse", `${sourceSha}^{tree}`],
    label: "Source tree lookup",
  });
  if (
    headSha !== sourceSha ||
    resolvedSource !== sourceSha ||
    !fullObjectPattern.test(sourceTree)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
      "Source repository is not at the requested literal commit",
      { actualHead: headSha, expectedHead: sourceSha },
    );
  }
  const statusBuffer = runGitRaw({
    ...common,
    args: ["status", "--porcelain=v2", "--untracked-files=all"],
  });
  if (statusBuffer.length !== 0) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
      "Source repository must be exactly clean, including untracked files",
    );
  }
  const absoluteGitDir = runGitText({
    ...common,
    args: ["rev-parse", "--absolute-git-dir"],
    label: "Git directory lookup",
  });
  const commonGitDirRaw = runGitText({
    ...common,
    args: ["rev-parse", "--git-common-dir"],
    label: "Git common-directory lookup",
  });
  const commonGitDir = resolve(repositoryRoot, commonGitDirRaw);
  const gitDir = canonicalRealEntry(absoluteGitDir, "Repository Git directory", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.SOURCE_REPOSITORY_UNSAFE,
  });
  const commonDir = canonicalRealEntry(commonGitDir, "Repository Git common directory", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.SOURCE_REPOSITORY_UNSAFE,
  });
  if (
    !isStrictDescendant(repositoryRoot, gitDir.canonicalPath) ||
    !isStrictDescendant(repositoryRoot, commonDir.canonicalPath)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.SOURCE_REPOSITORY_UNSAFE,
      "Linked worktrees or external Git metadata are not accepted",
    );
  }
  const indexPathRaw = runGitText({
    ...common,
    args: ["rev-parse", "--git-path", "index"],
    label: "Git index lookup",
  });
  const indexPath = isAbsolute(indexPathRaw)
    ? indexPathRaw
    : resolve(repositoryRoot, indexPathRaw);
  const indexEntries = runGitRaw({ ...common, args: ["ls-files", "--stage", "-z"] });
  const indexFlags = runGitRaw({ ...common, args: ["ls-files", "-v", "-z"] });
  const refs = runGitRaw({
    ...common,
    args: ["for-each-ref", "--format=%(refname)%00%(objectname)%00"],
  });
  const worktreeList = runGitRaw({
    ...common,
    args: ["worktree", "list", "--porcelain", "-z"],
  });
  const committedFiles = {};
  for (const [role, relativePath] of Object.entries(sourceFilePaths)) {
    committedFiles[role] = readCommittedFileIdentity({
      environment,
      gitExecutable,
      gitSpawn,
      relativePath,
      repositoryRoot,
      sourceSha,
    });
    const worktreeContents = readFileSync(resolve(repositoryRoot, relativePath));
    if (
      worktreeContents.length !== committedFiles[role].bytes ||
      sha256(worktreeContents) !== committedFiles[role].sha256
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
        `Source bytes for ${relativePath} do not match the committed blob`,
      );
    }
  }
  return Object.freeze({
    branch: runGitText({ ...common, args: ["branch", "--show-current"] }),
    committedFiles: Object.freeze(committedFiles),
    gitCommonDirectory: commonDir.canonicalPath,
    gitDirectory: gitDir.canonicalPath,
    headSha,
    index: gitMetadataIdentity(indexPath, canonicalizer),
    indexEntries: Object.freeze({ bytes: indexEntries.length, sha256: sha256(indexEntries) }),
    indexFlags: Object.freeze({ bytes: indexFlags.length, sha256: sha256(indexFlags) }),
    refs: Object.freeze({ bytes: refs.length, sha256: sha256(refs) }),
    repositoryRoot: resolve(canonicalizer(repositoryRoot)),
    sourceTree,
    status: Object.freeze({ bytes: statusBuffer.length, sha256: sha256(statusBuffer) }),
    trackedWorktree: captureTrackedWorktreeIdentity(
      repositoryRoot,
      indexEntries,
      canonicalizer,
    ),
    worktreeList: Object.freeze({ bytes: worktreeList.length, sha256: sha256(worktreeList) }),
  });
}

function repositoryComparisonView(identity) {
  return {
    branch: identity.branch,
    committedFiles: identity.committedFiles,
    gitCommonDirectory: identity.gitCommonDirectory,
    gitDirectory: identity.gitDirectory,
    headSha: identity.headSha,
    index: identity.index,
    indexEntries: identity.indexEntries,
    indexFlags: identity.indexFlags,
    refs: identity.refs,
    repositoryRoot: identity.repositoryRoot,
    sourceTree: identity.sourceTree,
    status: identity.status,
    trackedWorktree: identity.trackedWorktree,
    worktreeList: identity.worktreeList,
  };
}

export function assertRepositoryIdentityUnchanged(before, after, role = "Source") {
  if (stableJson(repositoryComparisonView(before)) !== stableJson(repositoryComparisonView(after))) {
    fail(
      role === "Checkout"
        ? MANUAL_RUNNER_ERROR_CODES.CHECKOUT_IDENTITY_MISMATCH
        : MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_CHANGED,
      `${role} HEAD, tree, index, status, refs, worktree metadata, or committed files changed`,
    );
  }
  return true;
}

function assertCheckoutIdentity(checkout, expected, state, canonicalizer = nativeRealpath) {
  if (
    checkout.headSha !== expected.headSha ||
    checkout.sourceTree !== expected.sourceTree ||
    checkout.branch !== "" ||
    checkout.status.bytes !== 0
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.CHECKOUT_IDENTITY_MISMATCH,
      "Materialized checkout is not clean, detached, and exact",
    );
  }
  for (const role of Object.keys(sourceFilePaths)) {
    if (
      stableJson(checkout.committedFiles[role]) !==
      stableJson(expected.committedFiles[role])
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.CHECKOUT_IDENTITY_MISMATCH,
        `Checkout identity for ${sourceFilePaths[role]} differs from source`,
      );
    }
  }
  if (
    pathsOverlap(checkout.gitDirectory, expected.gitDirectory) ||
    pathsOverlap(checkout.gitCommonDirectory, expected.gitCommonDirectory) ||
    !isStrictDescendant(state.checkoutRoot, checkout.gitDirectory) ||
    !isStrictDescendant(state.checkoutRoot, checkout.gitCommonDirectory)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.CHECKOUT_IDENTITY_MISMATCH,
      "Checkout Git metadata is linked to or outside the isolated checkout",
    );
  }
  const alternatesPath = join(checkout.gitCommonDirectory, "objects", "info", "alternates");
  if (existsSync(alternatesPath) && readFileSync(alternatesPath, "utf8").trim()) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.CHECKOUT_IDENTITY_MISMATCH,
      "Checkout uses an object alternate instead of independent committed objects",
    );
  }
  canonicalRealEntry(state.checkoutRoot, "Detached checkout", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.CHECKOUT_IDENTITY_MISMATCH,
  });
}

export function materializeExactCheckout({
  canonicalizer = nativeRealpath,
  environment,
  gitExecutable,
  gitSpawn = defaultGitSpawn,
  sourceIdentity,
  sourceSha,
  state,
} = {}) {
  assertStateOwnership(state);
  if (existsSync(state.checkoutRoot)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.CHECKOUT_MATERIALIZATION_FAILED,
      "Checkout target already exists; materialization cannot retry or reuse it",
    );
  }
  runGitRaw({
    args: [
      "clone",
      "--no-local",
      "--no-hardlinks",
      "--no-checkout",
      sourceIdentity.repositoryRoot,
      state.checkoutRoot,
    ],
    code: MANUAL_RUNNER_ERROR_CODES.CHECKOUT_MATERIALIZATION_FAILED,
    cwd: state.stateRoot,
    environment,
    gitExecutable,
    gitSpawn,
    label: "Independent no-local clone",
  });
  runGitRaw({
    args: ["-c", "advice.detachedHead=false", "checkout", "--detach", sourceSha],
    code: MANUAL_RUNNER_ERROR_CODES.CHECKOUT_MATERIALIZATION_FAILED,
    cwd: state.checkoutRoot,
    environment,
    gitExecutable,
    gitSpawn,
    label: "Literal detached checkout",
  });
  const checkout = captureRepositoryIdentity({
    canonicalizer,
    environment,
    gitExecutable,
    gitSpawn,
    repositoryRoot: state.checkoutRoot,
    sourceSha,
  });
  assertCheckoutIdentity(checkout, sourceIdentity, state, canonicalizer);
  assertStateOwnership(state);
  return checkout;
}

function assertHarnessLauncherIdentity(
  checkoutIdentity,
  state,
  canonicalizer = nativeRealpath,
) {
  const harnessPath = join(state.checkoutRoot, sourceFilePaths.harness);
  const entry = canonicalRealEntry(harnessPath, "Checked-out release-evidence harness", {
    allowFile: true,
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.CHECKOUT_IDENTITY_MISMATCH,
  });
  const expected = checkoutIdentity.committedFiles.harness;
  const contents = readFileSync(entry.canonicalPath);
  if (
    entry.type !== "file" ||
    contents.length !== expected.bytes ||
    sha256(contents) !== expected.sha256
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.CHECKOUT_IDENTITY_MISMATCH,
      "Checked-out harness launcher differs from the exact committed blob",
    );
  }
  return entry.canonicalPath;
}

export function prepareHermeticRunProof({
  checkoutIdentity,
  environment,
  evidenceRoot,
  sourceSha,
  state,
} = {}) {
  try {
    return buildHermeticRunProof({
      checkoutRoot: state.checkoutRoot,
      environment,
      evidenceRoot,
      fileGitBlobs: Object.freeze(
        Object.fromEntries(
          Object.entries(checkoutIdentity.committedFiles).map(([role, value]) => [
            role,
            value.blobSha,
          ]),
        ),
      ),
      invocation: RUNNER_INVOCATION_LIMITS,
      layout: state.layout,
      nonce: state.token,
      sourceSha,
      sourceTree: checkoutIdentity.sourceTree,
      stateRoot: state.stateRoot,
    });
  } catch (error) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.PROOF_FAILED,
      `Hermetic proof construction failed: ${safeError(error).message}`,
    );
  }
}

function clockIso(clock) {
  const value = typeof clock === "function" ? clock() : clock;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    fail(MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED, "Injected clock returned an invalid time");
  }
  return date.toISOString();
}

function acquireAttemptMarker({
  validation,
  sourceSha,
  clock = () => new Date(),
}) {
  const markerPath = join(validation.allowedParent.canonicalPath, attemptFileName);
  const marker = {
    allowedParentIdentity: validation.allowedParent.identity,
    createdAt: clockIso(clock),
    directoryFsync: process.platform === "win32" ? "UNAVAILABLE_ON_WIN32" : "REQUIRED",
    evidenceRootIdentity: validation.evidenceRoot.identity,
    evidenceRootIdentitySha256: sha256(
      normalizePathIdentity(validation.evidenceRoot.canonicalPath),
    ),
    invocation: RUNNER_INVOCATION_LIMITS,
    schemaVersion: HERMETIC_PROOF_SCHEMA_VERSION,
    sourceSha,
    sourceRepositoryIdentity: validation.repository.identity,
    sourceRepositoryIdentitySha256: sha256(
      normalizePathIdentity(validation.repository.canonicalPath),
    ),
  };
  try {
    writeDurableExclusive(markerPath, stableJson(marker));
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail(
        MANUAL_RUNNER_ERROR_CODES.ATTEMPT_ALREADY_CONSUMED,
        "This evidence root already contains a consumed actual-attempt marker",
        { markerPath },
      );
    }
    fail(
      MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
      `Actual-attempt marker could not be made durable: ${safeError(error).message}`,
    );
  }
  const stateNow = pathState(markerPath);
  if (!stateNow?.isFile() || stateNow.isSymbolicLink()) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
      "Actual-attempt marker is not a retained real file",
    );
  }
  const markerEntry = canonicalRealEntry(markerPath, "Actual-attempt marker", {
    allowFile: true,
    code: MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
  });
  if (markerEntry.type !== "file") {
    fail(
      MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
      "Actual-attempt marker is not a retained real file",
    );
  }
  return Object.freeze({
    canonicalPath: markerEntry.canonicalPath,
    identity: markerEntry.identity,
    lexicalPath: markerEntry.lexicalPath,
    marker,
    markerPath: markerEntry.canonicalPath,
    sha256: sha256(readFileSync(markerEntry.canonicalPath)),
  });
}

function assertAttemptMarkerUnchanged(attempt, canonicalizer = nativeRealpath) {
  try {
    if (
      !attempt ||
      typeof attempt.lexicalPath !== "string" ||
      typeof attempt.canonicalPath !== "string" ||
      !attempt.identity ||
      !/^[a-f0-9]{64}$/.test(attempt.sha256 ?? "")
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
        "Actual-attempt marker identity evidence is incomplete",
      );
    }
    const before = canonicalRealEntry(attempt.lexicalPath, "Actual-attempt marker", {
      allowFile: true,
      canonicalizer,
      code: MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
    });
    if (
      before.type !== "file" ||
      normalizePathIdentity(before.lexicalPath) !==
        normalizePathIdentity(attempt.lexicalPath) ||
      normalizePathIdentity(before.canonicalPath) !==
        normalizePathIdentity(attempt.canonicalPath) ||
      !identitiesEqual(before.identity, attempt.identity)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
        "Actual-attempt marker path or filesystem identity changed",
      );
    }
    const markerHash = sha256(readFileSync(before.canonicalPath));
    const after = canonicalRealEntry(attempt.lexicalPath, "Actual-attempt marker", {
      allowFile: true,
      canonicalizer,
      code: MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
    });
    if (
      markerHash !== attempt.sha256 ||
      normalizePathIdentity(after.lexicalPath) !==
        normalizePathIdentity(attempt.lexicalPath) ||
      normalizePathIdentity(after.canonicalPath) !==
        normalizePathIdentity(attempt.canonicalPath) ||
      !identitiesEqual(after.identity, attempt.identity)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
        "Actual-attempt marker bytes or filesystem identity changed",
      );
    }
    return true;
  } catch (error) {
    if (error instanceof ReleaseEvidenceManualRunnerError) throw error;
    fail(
      MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
      `Actual-attempt marker could not be revalidated: ${safeError(error).message}`,
    );
  }
}

function readBoundedEvidenceJson(filePath, role, maximumBytes = 2 * 1024 * 1024) {
  const entry = canonicalRealEntry(filePath, role, {
    allowFile: true,
    code: MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
  });
  if (entry.type !== "file") {
    fail(
      MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
      `${role} must be a retained real file`,
    );
  }
  const bytes = readFileSync(entry.canonicalPath);
  if (bytes.length === 0 || bytes.length > maximumBytes) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
      `${role} is empty or exceeds its parser bound`,
    );
  }
  try {
    return Object.freeze({
      bytes,
      entry,
      value: JSON.parse(bytes.toString("utf8")),
    });
  } catch (error) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
      `${role} is not valid JSON: ${safeError(error).message}`,
    );
  }
}

function parseHarnessResult({
  exitRecord,
  innerEvidenceRoot,
  proof,
  proofPath,
  stdout,
}) {
  if (exitRecord.code !== 0) {
    return Object.freeze({ reportedResult: "UNAVAILABLE_AFTER_NONZERO_EXIT" });
  }
  const text = stdout.trim();
  if (!text || Buffer.byteLength(text) > 262_144) {
    throw new Error("Harness success output was missing or exceeded the parser bound");
  }
  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
      `Harness success output is not JSON: ${safeError(error).message}`,
    );
  }
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result) ||
    Object.keys(result).sort().join("\n") !== "runRoot\nstatus\nsummary" ||
    typeof result.runRoot !== "string" ||
    typeof result.status !== "string" ||
    typeof result.summary !== "string" ||
    result.status !== "CHILD_EVIDENCE_RETAINED"
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
      "Harness success output omitted its exact retained PASS identity",
    );
  }
  const innerRoot = canonicalRealEntry(result.runRoot, "Inner harness run", {
    code: MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
  });
  if (
    normalizePathIdentity(dirname(innerRoot.canonicalPath)) !==
      normalizePathIdentity(innerEvidenceRoot) ||
    !basename(innerRoot.canonicalPath).startsWith("release-evidence-run-")
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
      "Inner harness run is not the direct owned evidence child",
    );
  }
  const expectedSummaryPath = join(innerRoot.canonicalPath, "summary.json");
  if (normalizePathIdentity(result.summary) !== normalizePathIdentity(expectedSummaryPath)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
      "Harness-reported summary is not the fixed inner summary path",
    );
  }
  const innerSummary = readBoundedEvidenceJson(
    expectedSummaryPath,
    "Inner harness summary",
  );
  if (
    !innerSummary.value ||
    typeof innerSummary.value !== "object" ||
    innerSummary.value.status !== "CHILD_EVIDENCE_RETAINED" ||
    innerSummary.value.proofDigest !== proof.digest ||
    normalizePathIdentity(innerSummary.value.runRoot ?? "") !==
      normalizePathIdentity(innerRoot.canonicalPath) ||
    innerSummary.value.protectedState?.status !== "CLEAN"
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED,
      "Inner harness summary is not CLEAN, successful, and proof-bound",
    );
  }
  const receipt = validateHermeticProofReceipt({
    evidenceRoot: innerEvidenceRoot,
    proof,
    proofPath,
  });
  return Object.freeze({
    innerSummarySha256: sha256(innerSummary.bytes),
    proofReceiptSha256: receipt.receiptFile.sha256,
    reportedResult: Object.freeze(result),
  });
}

function stateLayoutEvidence(state) {
  return Object.freeze({
    checkoutRootIdentitySha256: sha256(normalizePathIdentity(state.checkoutRoot)),
    layout: Object.freeze(
      Object.fromEntries(
        Object.entries(state.layout).map(([role, rolePath]) => [
          role,
          sha256(normalizePathIdentity(rolePath)),
        ]),
      ),
    ),
    stateRootIdentitySha256: sha256(normalizePathIdentity(state.stateRoot)),
  });
}

function sealStatePreserved(state, proof, clock) {
  assertStateOwnership(state);
  const sealPath = join(state.stateRoot, stateSealFileName);
  if (existsSync(sealPath)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Runner state seal already exists and cannot be reused",
    );
  }
  const topLevel = readdirSync(state.stateRoot).sort();
  if (!topLevel.includes(stateOwnerFileName)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Runner state lost its ownership record before sealing",
    );
  }
  const inventory = collectStateInventory(state.stateRoot);
  writeDurableExclusive(
    sealPath,
    stableJson({
      bindings: {
        allowedParent: state.allowedParent,
        evidenceRoot: state.evidenceRoot,
        repository: state.repository,
        stateRoot: {
          canonicalPath: state.stateRoot,
          identity: state.rootIdentity,
        },
      },
      hermeticProofDigest: proof?.digest ?? null,
      inventory,
      inventorySha256: sha256(stableJson(inventory)),
      preservedByDefault: true,
      rootIdentity: state.rootIdentity,
      sealedAt: clockIso(clock),
      token: state.token,
      topLevel,
    }),
  );
  return sealPath;
}

export function cleanupHermeticState({
  allowedParent,
  canonicalizer = nativeRealpath,
  evidenceRoot,
  proofDigest = null,
  repositoryRoot,
  stateRoot,
  token,
} = {}) {
  const parent = canonicalRealEntry(allowedParent, "Cleanup allowed parent", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
  });
  const evidence = canonicalRealEntry(evidenceRoot, "Cleanup evidence root", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
  });
  const repository = canonicalRealEntry(repositoryRoot, "Cleanup repository", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
  });
  const stateEntry = canonicalRealEntry(stateRoot, "Cleanup state root", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
  });
  if (
    !isStrictDescendant(parent.canonicalPath, stateEntry.canonicalPath) ||
    normalizePathIdentity(dirname(stateEntry.canonicalPath)) !==
      normalizePathIdentity(dirname(evidence.canonicalPath)) ||
    basename(stateEntry.canonicalPath) !== `.release-evidence-state-${token}` ||
    pathsOverlap(stateEntry.canonicalPath, evidence.canonicalPath) ||
    pathsOverlap(stateEntry.canonicalPath, repository.canonicalPath)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Cleanup target is not the exact disjoint runner-owned state sibling",
    );
  }
  const ownerPath = join(stateEntry.canonicalPath, stateOwnerFileName);
  const sealPath = join(stateEntry.canonicalPath, stateSealFileName);
  let owner;
  let seal;
  try {
    owner = JSON.parse(readFileSync(ownerPath, "utf8"));
    seal = JSON.parse(readFileSync(sealPath, "utf8"));
  } catch (error) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      `Cleanup ownership evidence is missing or invalid: ${safeError(error).message}`,
    );
  }
  const currentIdentity = statIdentity(lstatSync(stateEntry.canonicalPath, { bigint: true }));
  const bindings = seal.bindings;
  if (
    typeof token !== "string" ||
    owner.schemaVersion !== 1 ||
    owner.token !== token ||
    seal.token !== token ||
    !identitiesEqual(owner.rootIdentity, currentIdentity) ||
    !identitiesEqual(seal.rootIdentity, currentIdentity) ||
    seal.hermeticProofDigest !== proofDigest ||
    !bindings ||
    typeof bindings.allowedParent?.canonicalPath !== "string" ||
    typeof bindings.evidenceRoot?.canonicalPath !== "string" ||
    typeof bindings.repository?.canonicalPath !== "string" ||
    typeof bindings.stateRoot?.canonicalPath !== "string" ||
    normalizePathIdentity(bindings.allowedParent.canonicalPath) !==
      normalizePathIdentity(parent.canonicalPath) ||
    normalizePathIdentity(bindings.evidenceRoot.canonicalPath) !==
      normalizePathIdentity(evidence.canonicalPath) ||
    normalizePathIdentity(bindings.repository.canonicalPath) !==
      normalizePathIdentity(repository.canonicalPath) ||
    normalizePathIdentity(bindings.stateRoot.canonicalPath) !==
      normalizePathIdentity(stateEntry.canonicalPath) ||
    !identitiesEqual(bindings.allowedParent?.identity, parent.identity) ||
    !identitiesEqual(bindings.evidenceRoot?.identity, evidence.identity) ||
    !identitiesEqual(bindings.repository?.identity, repository.identity) ||
    !identitiesEqual(bindings.stateRoot?.identity, currentIdentity)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Cleanup token or root filesystem identity does not match the sealed owner",
    );
  }
  const inventory = collectStateInventory(stateEntry.canonicalPath);
  if (
    !Array.isArray(seal.inventory) ||
    seal.inventorySha256 !== sha256(stableJson(inventory)) ||
    stableJson(seal.inventory) !== stableJson(inventory)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Cleanup inventory differs from the sealed runner-owned state",
    );
  }
  const immediateIdentity = statIdentity(
    lstatSync(stateEntry.canonicalPath, { bigint: true }),
  );
  const immediateInventory = collectStateInventory(stateEntry.canonicalPath);
  if (
    !identitiesEqual(currentIdentity, immediateIdentity) ||
    stableJson(inventory) !== stableJson(immediateInventory)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Cleanup target changed immediately before quarantine",
    );
  }
  const quarantinePath = join(
    dirname(stateEntry.canonicalPath),
    `.release-evidence-cleanup-${token}-${randomBytes(12).toString("hex")}`,
  );
  if (
    existsSync(quarantinePath) ||
    pathsOverlap(quarantinePath, evidence.canonicalPath) ||
    pathsOverlap(quarantinePath, repository.canonicalPath)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Cleanup quarantine path is not a fresh disjoint sibling",
    );
  }
  try {
    renameSync(stateEntry.canonicalPath, quarantinePath);
    fsyncParentDirectory(quarantinePath);
  } catch (error) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      `Owned state could not be atomically quarantined: ${safeError(error).message}`,
    );
  }
  const quarantine = canonicalRealEntry(quarantinePath, "Cleanup quarantine", {
    canonicalizer,
    code: MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
  });
  const quarantinedInventory = collectStateInventory(quarantine.canonicalPath);
  if (
    existsSync(stateEntry.canonicalPath) ||
    !identitiesEqual(currentIdentity, quarantine.identity) ||
    stableJson(inventory) !== stableJson(quarantinedInventory)
  ) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Cleanup quarantine identity changed; retained without recursive deletion",
      { quarantinePath: quarantine.canonicalPath },
    );
  }
  rmSync(quarantine.canonicalPath, { recursive: true, force: false });
  fsyncParentDirectory(quarantine.canonicalPath);
  if (existsSync(quarantine.canonicalPath) || existsSync(stateEntry.canonicalPath)) {
    fail(
      MANUAL_RUNNER_ERROR_CODES.STATE_ROOT_UNSAFE,
      "Exact runner-owned state cleanup did not remove its target",
    );
  }
  return Object.freeze({ cleaned: true, entries: inventory.length });
}

function classifyRunnerFailure(error) {
  if (error instanceof ReleaseEvidenceManualRunnerError) return error;
  const code =
    error?.code === "POST_PROCESSING_FAILED"
      ? MANUAL_RUNNER_ERROR_CODES.POST_PROCESSING_FAILED
      : MANUAL_RUNNER_ERROR_CODES.HARNESS_FAILED;
  return new ReleaseEvidenceManualRunnerError(
    code,
    `Manual release-evidence run failed: ${safeError(error).message}`,
    error?.details,
  );
}

function attachRetainedPaths(error, context, state, attempt) {
  error.details = {
    ...(error.details ?? {}),
    ...(attempt ? { attemptMarker: attempt.markerPath } : {}),
    ...(context ? { runRoot: context.runRoot } : {}),
    ...(state ? { stateRoot: state.stateRoot } : {}),
  };
  return error;
}

export async function runManualReleaseEvidence(
  options,
  {
    canonicalizer = nativeRealpath,
    clock = () => new Date(),
    gitSpawn = defaultGitSpawn,
    harnessSpawn = runDurableChild,
    inheritedEnvironment = process.env,
    nonce = () => randomBytes(24).toString("hex"),
    evidenceSealer = sealOwnedRun,
    stateSealer = sealStatePreserved,
  } = {},
) {
  let attempt;
  let context;
  let state;
  let proof;
  let sourceBefore;
  let checkoutBefore;
  let environment;
  let runtime;
  let validation;
  let summaryWritten = false;
  let evidenceSealed = false;
  let evidenceSealAttempted = false;
  let stateSealAttempted = false;
  try {
    validation = validateManualRunnerInputs(options, {
      canonicalizer,
      inheritedEnvironment,
    });
    const runningModule = canonicalRealEntry(
      fileURLToPath(import.meta.url),
      "Invoked manual runner",
      {
        allowFile: true,
        canonicalizer,
        code: MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
      },
    );
    const expectedRunningModule = canonicalRealEntry(
      join(validation.repository.canonicalPath, sourceFilePaths.runner),
      "Selected source manual runner",
      {
        allowFile: true,
        canonicalizer,
        code: MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
      },
    );
    if (
      runningModule.type !== "file" ||
      expectedRunningModule.type !== "file" ||
      normalizePathIdentity(runningModule.canonicalPath) !==
        normalizePathIdentity(expectedRunningModule.canonicalPath)
    ) {
      fail(
        MANUAL_RUNNER_ERROR_CODES.SOURCE_STATE_MISMATCH,
        "The invoked runner is not the runner in the selected source repository",
      );
    }
    if (validation.mode === "run") {
      attempt = acquireAttemptMarker({
        clock,
        sourceSha: validation.sourceSha,
        validation,
      });
    }
    context = createOwnedRun({
      allowedParent: validation.allowedParent.canonicalPath,
      canonicalizeExisting: canonicalizer,
      evidenceRoot: validation.evidenceRoot.canonicalPath,
      mode: validation.mode === "run" ? "manual-run" : "manual-dry",
      repositoryRoot: validation.repository.canonicalPath,
    });
    runtime = resolveRuntimeIdentities(
      {
        forbiddenRoots: [
          {
            canonicalPath: validation.allowedParent.canonicalPath,
            lexicalPath: validation.allowedParent.lexicalPath,
            name: "allowed-parent",
          },
          {
            canonicalPath: validation.evidenceRoot.canonicalPath,
            lexicalPath: validation.evidenceRoot.lexicalPath,
            name: "evidence-root",
          },
          {
            canonicalPath: validation.repository.canonicalPath,
            lexicalPath: validation.repository.lexicalPath,
            name: "source-repository",
          },
        ],
        inheritedEnvironment,
        interactiveRoots: validation.interactiveRoots,
      },
      { canonicalizer },
    );
    state = createHermeticLayout(validation, {
      canonicalizer,
      clock,
      nonce,
      onStateCreated: (createdState) => {
        state = createdState;
      },
    });
    environment = projectHermeticEnvironment({
      inheritedEnvironment,
      runtime,
      state,
    });
    assertRuntimeIdentitiesUnchanged(runtime, canonicalizer);
    sourceBefore = captureRepositoryIdentity({
      canonicalizer,
      environment,
      gitExecutable: runtime.gitLauncher,
      gitSpawn,
      repositoryRoot: validation.repository.canonicalPath,
      sourceSha: validation.sourceSha,
    });
    writeOwnedEvidenceJson(context, "runner-preflight.json", {
      attempt: attempt
        ? {
            markerPathIdentitySha256: sha256(normalizePathIdentity(attempt.markerPath)),
            markerSha256: attempt.sha256,
          }
        : undefined,
      invocation: RUNNER_INVOCATION_LIMITS,
      parentDirectoryFsync:
        process.platform === "win32" ? "UNAVAILABLE_THROUGH_NODE_WIN32" : "PASS",
      layout: stateLayoutEvidence(state),
      mode: validation.mode,
      runtime,
      source: sourceBefore,
      sourceSha: validation.sourceSha,
    });
    assertRuntimeIdentitiesUnchanged(runtime, canonicalizer);
    checkoutBefore = materializeExactCheckout({
      canonicalizer,
      environment,
      gitExecutable: runtime.gitLauncher,
      gitSpawn,
      sourceIdentity: sourceBefore,
      sourceSha: validation.sourceSha,
      state,
    });
    const sourceAfterMaterialization = captureRepositoryIdentity({
      canonicalizer,
      environment,
      gitExecutable: runtime.gitLauncher,
      gitSpawn,
      repositoryRoot: validation.repository.canonicalPath,
      sourceSha: validation.sourceSha,
    });
    assertRepositoryIdentityUnchanged(sourceBefore, sourceAfterMaterialization, "Source");
    const innerEvidenceRoot = join(context.runRoot, "inner-evidence");
    createRealDirectory(innerEvidenceRoot);
    proof = prepareHermeticRunProof({
      checkoutIdentity: checkoutBefore,
      environment,
      evidenceRoot: resolve(canonicalizer(innerEvidenceRoot)),
      sourceSha: validation.sourceSha,
      state,
    });
    const proofRelativePath = "inner-evidence/runner-proof.json";
    const proofPath = writeOwnedEvidenceJson(context, proofRelativePath, proof);
    writeOwnedEvidenceJson(context, "runner-materialization.json", {
      checkout: checkoutBefore,
      hermeticProofDigest: proof.digest,
      hermeticProofSchemaVersion: HERMETIC_PROOF_SCHEMA_VERSION,
      sourceAfterMaterialization,
    });

    let child;
    if (validation.mode === "run") {
      assertRuntimeIdentitiesUnchanged(runtime, canonicalizer);
      assertAttemptMarkerUnchanged(attempt, canonicalizer);
      const harnessLauncher = assertHarnessLauncherIdentity(
        checkoutBefore,
        state,
        canonicalizer,
      );
      child = await harnessSpawn({
        args: [
          harnessLauncher,
          "--run",
          "--allow-release-command",
          "--repository",
          state.checkoutRoot,
          "--source-sha",
          validation.sourceSha,
          "--runner-proof",
          proofPath,
          "--npm-launcher",
          runtime.npmCandidate,
          "--allowed-parent",
          context.runRoot,
          "--evidence-root",
          innerEvidenceRoot,
        ],
        command: runtime.nodeExecutable,
        context,
        cwd: state.checkoutRoot,
        environment,
        expectedExitCode: 0,
        invocationName: "manual-harness",
        parser: (result) =>
          parseHarnessResult({
            ...result,
            innerEvidenceRoot,
            proof,
            proofPath,
          }),
        summaryRelativePath: "harness-child-summary.json",
      });
    }

    const sourceAfter = captureRepositoryIdentity({
      canonicalizer,
      environment,
      gitExecutable: runtime.gitLauncher,
      gitSpawn,
      repositoryRoot: validation.repository.canonicalPath,
      sourceSha: validation.sourceSha,
    });
    assertRuntimeIdentitiesUnchanged(runtime, canonicalizer);
    const checkoutAfter = captureRepositoryIdentity({
      canonicalizer,
      environment,
      gitExecutable: runtime.gitLauncher,
      gitSpawn,
      repositoryRoot: state.checkoutRoot,
      sourceSha: validation.sourceSha,
    });
    assertRepositoryIdentityUnchanged(sourceBefore, sourceAfter, "Source");
    assertRepositoryIdentityUnchanged(checkoutBefore, checkoutAfter, "Checkout");
    assertCheckoutIdentity(checkoutAfter, sourceBefore, state, canonicalizer);
    assertStateOwnership(state);
    assertRuntimeIdentitiesUnchanged(runtime, canonicalizer);
    writeOwnedEvidenceJson(context, "runner-postflight.json", {
      checkout: checkoutAfter,
      runtimeIdentity: "UNCHANGED",
      source: sourceAfter,
      stateOwnership: "PASS",
    });
    if (child && child.status !== "CHILD_EVIDENCE_RETAINED") {
      fail(
        MANUAL_RUNNER_ERROR_CODES.HARNESS_FAILED,
        "The sole harness invocation completed nonzero; no retry is permitted",
        { childStatus: child.status },
      );
    }
    const summary = Object.freeze({
      checkoutSha: checkoutAfter.headSha,
      commandGraph: Object.freeze({
        harnessInvocations: validation.mode === "run" ? 1 : 0,
        releaseInvocationMaximum: validation.mode === "run" ? 1 : 0,
        retries: 0,
        runnerInvocations: 1,
      }),
      evidenceRoot: context.runRoot,
      harness: child
        ? {
            exit: child.exit,
            parsed: child.parsed,
            rawEvidenceHashes: child.rawEvidenceHashes,
            status: child.status,
          }
        : undefined,
      hermeticProofDigest: proof.digest,
      sourceSha: validation.sourceSha,
      statePreservedAt: state.stateRoot,
      status:
        validation.mode === "run"
          ? "MANUAL_RELEASE_EVIDENCE_PASS"
          : "MANUAL_DRY_VALIDATION_PASS",
    });
    if (attempt) assertAttemptMarkerUnchanged(attempt, canonicalizer);
    stateSealAttempted = true;
    try {
      stateSealer(state, proof, clock);
    } catch (error) {
      if (
        error instanceof ReleaseEvidenceManualRunnerError &&
        error.code === MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED
      ) {
        throw error;
      }
      fail(
        MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
        `Runner state could not be sealed: ${safeError(error).message}`,
        { stateSealError: safeError(error) },
      );
    }
    atomicWriteSanitizedSummary(context, "summary.json", {
      ...summary,
      commandOutcome: "PASS",
      status:
        validation.mode === "run"
          ? "MANUAL_RELEASE_EVIDENCE_COMMAND_PASS_REQUIRES_VALID_SEALS"
          : "MANUAL_DRY_VALIDATION_COMMAND_PASS_REQUIRES_VALID_SEALS",
      terminalValidity: "REQUIRES_STATE_AND_EVIDENCE_SEALS",
    });
    summaryWritten = true;
    evidenceSealAttempted = true;
    try {
      evidenceSealer(context, `Outer and inner evidence retained for ${proof.digest}`);
    } catch (error) {
      if (error instanceof ReleaseEvidenceManualRunnerError) throw error;
      fail(
        MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
        `Outer evidence could not be sealed: ${safeError(error).message}`,
      );
    }
    evidenceSealed = true;
    return Object.freeze({ context, proof, state, summary });
  } catch (originalError) {
    let error = attachRetainedPaths(
      classifyRunnerFailure(originalError),
      context,
      state,
      attempt,
    );
    if (context) {
      if (
        validation &&
        runtime &&
        environment &&
        sourceBefore &&
        state &&
        checkoutBefore
      ) {
        try {
          const failureSourceAfter = captureRepositoryIdentity({
            canonicalizer,
            environment,
            gitExecutable: runtime.gitLauncher,
            gitSpawn,
            repositoryRoot: validation.repository.canonicalPath,
            sourceSha: validation.sourceSha,
          });
          const failureCheckoutAfter = captureRepositoryIdentity({
            canonicalizer,
            environment,
            gitExecutable: runtime.gitLauncher,
            gitSpawn,
            repositoryRoot: state.checkoutRoot,
            sourceSha: validation.sourceSha,
          });
          let postflightStatus = "UNCHANGED";
          try {
            assertRepositoryIdentityUnchanged(sourceBefore, failureSourceAfter, "Source");
            assertRepositoryIdentityUnchanged(checkoutBefore, failureCheckoutAfter, "Checkout");
            assertCheckoutIdentity(failureCheckoutAfter, sourceBefore, state, canonicalizer);
            assertRuntimeIdentitiesUnchanged(runtime, canonicalizer);
            assertStateOwnership(state);
          } catch (postflightError) {
            postflightStatus = postflightError?.code ?? "POSTFLIGHT_FAILED";
            const classified = attachRetainedPaths(
              classifyRunnerFailure(postflightError),
              context,
              state,
              attempt,
            );
            classified.details.priorFailure = safeError(error);
            error = classified;
          }
          writeOwnedEvidenceJson(context, "runner-failure-postflight.json", {
            checkout: failureCheckoutAfter,
            source: failureSourceAfter,
            status: postflightStatus,
          });
        } catch (postflightCaptureError) {
          error.details.postflightCaptureError = safeError(postflightCaptureError);
        }
      }
      if (state && !stateSealAttempted) {
        try {
          stateSealAttempted = true;
          stateSealer(state, proof, clock);
        } catch (stateSealError) {
          const priorFailure = safeError(error);
          error = attachRetainedPaths(
            new ReleaseEvidenceManualRunnerError(
              MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
              `Runner state could not be sealed after failure: ${safeError(stateSealError).message}`,
              {
                priorFailure,
                stateSealError: safeError(stateSealError),
              },
            ),
            context,
            state,
            attempt,
          );
        }
      }
      try {
        if (!existsSync(join(context.runRoot, "runner-failure.json"))) {
          writeOwnedEvidenceJson(context, "runner-failure.json", {
            error: safeError(error),
            sourceSha: options?.sourceSha,
            status: error.code,
          });
        }
        const summaryPath = join(context.runRoot, "summary.json");
        if (summaryWritten && existsSync(summaryPath)) {
          const preservedResultPath = join(
            context.runRoot,
            "summary.command-result-before-terminal-failure.json",
          );
          if (existsSync(preservedResultPath)) {
            fail(
              MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
              "Failure-summary preservation target already exists",
            );
          }
          renameSync(summaryPath, preservedResultPath);
          fsyncParentDirectory(preservedResultPath);
          summaryWritten = false;
        }
        if (!summaryWritten && !existsSync(summaryPath)) {
          atomicWriteSanitizedSummary(context, "summary.json", {
            error: safeError(error),
            hermeticProofDigest: proof?.digest,
            runRoot: context.runRoot,
            stateRoot: state?.stateRoot,
            status: error.code,
          });
          summaryWritten = true;
        }
      } catch (retentionError) {
        error.details.retentionError = safeError(retentionError);
      }
    }
    if (context && !evidenceSealed && !evidenceSealAttempted) {
      try {
        evidenceSealAttempted = true;
        evidenceSealer(context, `Failure evidence retained with status ${error.code}`);
        evidenceSealed = true;
      } catch (sealError) {
        const priorFailure = safeError(error);
        const evidenceError = attachRetainedPaths(
          new ReleaseEvidenceManualRunnerError(
            MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
            `Failure evidence could not be sealed: ${safeError(sealError).message}`,
            {
              evidenceSealError: safeError(sealError),
              priorFailure,
            },
          ),
          context,
          state,
          attempt,
        );
        error = evidenceError;
        try {
          const summaryPath = join(context.runRoot, "summary.json");
          const preservedFailurePath = join(
            context.runRoot,
            "summary.failure-before-evidence-seal-failure.json",
          );
          if (!existsSync(summaryPath) || existsSync(preservedFailurePath)) {
            fail(
              MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
              "Evidence-seal failure summary cannot be safely superseded",
            );
          }
          renameSync(summaryPath, preservedFailurePath);
          fsyncParentDirectory(preservedFailurePath);
          atomicWriteSanitizedSummary(context, "summary.json", {
            error: safeError(error),
            priorFailure,
            runRoot: context.runRoot,
            stateRoot: state?.stateRoot,
            status: MANUAL_RUNNER_ERROR_CODES.EVIDENCE_FAILED,
          });
          summaryWritten = true;
        } catch (terminalRetentionError) {
          error.details.terminalRetentionError = safeError(terminalRetentionError);
        }
      }
    }
    throw error;
  }
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
  const options = parseManualRunnerArguments(process.argv.slice(2));
  const result = await runManualReleaseEvidence(options);
  process.stdout.write(
    stableJson({
      runRoot: result.context.runRoot,
      stateRoot: result.state.stateRoot,
      status: result.summary.status,
      summary: join(result.context.runRoot, "summary.json"),
    }),
  );
}

if (isMainModule()) {
  main().catch((error) => {
    process.stderr.write(`${error?.code ?? "MANUAL_RUNNER_FAILED"}: ${safeError(error).message}\n`);
    if (error?.details?.runRoot) {
      process.stderr.write(`Evidence retained at: ${error.details.runRoot}\n`);
    }
    if (error?.details?.stateRoot) {
      process.stderr.write(`Hermetic state retained at: ${error.details.stateRoot}\n`);
    }
    process.exitCode = 1;
  });
}
