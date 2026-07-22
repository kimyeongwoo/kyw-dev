#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path, { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { trustedCaBundle } from "./audit-smoke.mjs";
import {
  appendEvaluatorDiagnostics,
  cleanupFailureDiagnostic,
  createEvaluatorRunScope,
  defaultRemoveOwnedPath,
  EvaluatorInterruptedError,
} from "./evaluator-process.mjs";
import {
  parseJsonl,
} from "./grilling-eval/core.mjs";
import {
  EXPECTED_TARBALL_FILES,
  SKILL_NAMES,
} from "./lib/validate-foundation.mjs";

export const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const FIXTURE_ROOT = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "spec-behavioral-e2e",
);
export const REQUIRED_MODEL = "gpt-5.6-sol";
export const REQUIRED_REASONING_EFFORT = "high";
export const REQUIRED_BASE = "8f4279c69f170c293af12581b51b994da5cc8de4";

const DOCKER_IMAGE =
  "node@sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b";
const DOCKER_ENGINE_HOST = "npipe:////./pipe/dockerDesktopLinuxEngine";
const CONTAINER_CODEX =
  "/runtime/codex-package/vendor/x86_64-unknown-linux-musl/bin/codex";
const CONTAINER_CODEX_PATH =
  "/runtime/codex-package/vendor/x86_64-unknown-linux-musl/codex-path";
const CONTAINER_PATH = `${CONTAINER_CODEX_PATH}:/usr/local/bin:/usr/bin:/bin`;
const CONTAINER_WORKSPACE = "/workspace";
const CONTAINER_AUTH_SOURCE = "/protected/auth-source/auth.json";
const EXPECTED_TARBALL_SIZE = 61_708;
const EXPECTED_TARBALL_SHA256 =
  "750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f";
const CAPABILITY_PROMPT = [
  "This is one bounded harness capability probe, not a SPEC scenario and not product acceptance evidence.",
  "Do not invoke any kyw Skill. Do not inspect credential contents or any protected source contents.",
  "Run these exact workflow checks with tool commands: `git --version`, `node --version`, `npm --version`, `tar --version`, `git status --short`, and `node --test ./test/probe.test.mjs`.",
  "Then create `probe-created.txt` with exact UTF-8 contents `created\\n`, replace `probe-modify.txt` with exact UTF-8 contents `modified\\n`, and delete `probe-delete.txt`.",
  "Actively attempt one write to each protected boundary and confirm that every attempt is rejected: create `/workspace/.git/task-0026-forbidden`, append to `/workspace/.agents/skills/kyw-task/SKILL.md`, create `/protected/source-checkout/task-0026-forbidden`, and append to `/protected/auth-source/auth.json`.",
  "Run the four denial attempts independently so an expected non-zero exit does not prevent the remaining attempts.",
  "Also create `$HOME/probe-home.txt` with exact contents `home\\n`, `$CODEX_HOME/probe-codex-home.txt` with exact contents `codex\\n`, and `$TMPDIR/probe-temp.txt` with exact contents `temp\\n`.",
  "Do not make any other filesystem change. Finish with a concise list of completed actions and denied writes.",
].join("\n\n");

const DOCKER_BOUNDARY_CONTRACT = Object.freeze({
  image: DOCKER_IMAGE,
  pull: "never",
  rootFilesystem: "read-only",
  user: "1000:1000",
  capabilities: "drop-all",
  noNewPrivileges: true,
  pidsLimit: 256,
  network: "bridge",
  workspace: { target: CONTAINER_WORKSPACE, mode: "read-write" },
  nestedReadOnly: Object.freeze([
    "/workspace/.git",
    "/workspace/.agents",
    "/protected/source-checkout",
    "/protected/packed-product",
    CONTAINER_AUTH_SOURCE,
    "/runtime/codex-package",
    "/runtime/trusted-ca.pem",
  ]),
  writableState: Object.freeze([
    "/state/home",
    "/state/codex-home",
    "/state/tool-codex-home",
    "/state/npm",
    "/state/temp",
    "/tmp",
    "/state/xdg-config",
    "/state/xdg-cache",
    "/state/control",
  ]),
  toolPath: CONTAINER_PATH,
});

const REPORT_SCHEMA_VERSION = 1;
const TASK_HELPER_RUNTIME_FILES = Object.freeze([
  "src/core/task-artifacts.mjs",
  "src/core/template-contracts.mjs",
  "templates/project/AGENTS.md",
  "templates/project/ARCHITECTURE.md",
  "templates/project/README.md",
  "templates/project/SPEC.md",
  "templates/task/TASK.md",
  "templates/task/TEST.md",
]);
const PERMANENT_DOCUMENTS = Object.freeze([
  "README.md",
  "AGENTS.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
]);
const PROTECTED_ENVIRONMENT_NAMES = new Set(
  [
    "HOME",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "CODEX_HOME",
    "CODEX_SQLITE_HOME",
    "npm_config_userconfig",
    "npm_config_cache",
    "NPM_CONFIG_USERCONFIG",
    "NPM_CONFIG_CACHE",
    "TEMP",
    "TMP",
    "TMPDIR",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
  ].map((name) => name.toLowerCase()),
);
const CREDENTIAL_PATTERNS = Object.freeze([
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/g,
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,})\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /\b(?:OPENAI_API_KEY|CODEX_API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|AUTH_TOKEN)\s*[:=]\s*["']?[^\s"',;}]{8,}/gi,
  /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/g,
]);
const GENERIC_PROTECTED_PATH_PATTERNS = Object.freeze([
  /[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'`;|]+/gi,
  /\/(?:Users|home)\/[^/\s"'`;|]+/g,
]);
const TASK_STATUS_DONE = /^## Status\s*\n\s*DONE\s*$/im;
const TEST_STATUS_PASSED = /^## Status\s*\n\s*PASSED\s*$/im;

const SCENARIOS = Object.freeze([
  Object.freeze({
    id: "S-01",
    specAcceptance: "SPEC AC-04",
    fixture: "s01-empty",
    timeoutMs: 480_000,
    maximumTurns: 3,
    requiredReads: Object.freeze([
      "skills/kyw-init/SKILL.md",
      "skills/kyw-grilling/SKILL.md",
      "templates/project/README.md",
      "templates/project/AGENTS.md",
      "templates/project/SPEC.md",
      "templates/project/ARCHITECTURE.md",
    ]),
    prompts: Object.freeze([
      [
        '$kyw-init "Initialize this empty repository as the Tiny Greeting CLI."',
        "The durable context is already fixed: the project is for individual developers; it is a dependency-free Node.js 22+ command-line project; setup and verification use npm test; it has no configuration, storage, network, accounts, or application implementation yet. The only unresolved durable decision is the exact greeting text.",
        "Inspect the fixture first. Ask exactly one decision question per interview-progress turn with exactly one Recommendation and concise Why. Do not write final documents or implementation before I explicitly confirm the final shared-understanding summary and four-file plan.",
        "Before responding, use read-only commands to read the exact installed packed sources at .agents/skills/kyw-init/SKILL.md, .agents/skills/kyw-grilling/SKILL.md, and all four files under .agents/skills/.kyw-dev/runtime/templates/project/. Use no kyw-dev checkout elsewhere.",
      ].join("\n\n"),
      'I choose the exact user-visible greeting `Hello, kyw!`. This explicitly settles the one pending decision.',
      "I explicitly confirm the current shared-understanding summary and exact four-file write plan. Create only README.md, AGENTS.md, docs/SPEC.md, and docs/ARCHITECTURE.md. Do not implement application code and do not create a numbered Task.",
    ]),
  }),
  Object.freeze({
    id: "S-02",
    specAcceptance: "SPEC AC-04",
    fixture: "s02-adopt",
    timeoutMs: 480_000,
    maximumTurns: 3,
    requiredReads: Object.freeze([
      "skills/kyw-init/SKILL.md",
      "skills/kyw-grilling/SKILL.md",
      "templates/project/README.md",
      "templates/project/AGENTS.md",
      "templates/project/SPEC.md",
      "templates/project/ARCHITECTURE.md",
    ]),
    prompts: Object.freeze([
      [
        '$kyw-init "Adopt this existing greeting service into the kyw-dev document contract without replacing useful README content or changing application/tests."',
        "Adopt the observed Node.js runtime, commands, application behavior, dependency-free boundary, and lack of storage/network/configuration. Preserve the README block delimited by KYW-PRESERVE-BEGIN and KYW-PRESERVE-END byte-for-byte. The only unresolved durable decision is the primary audience for the reconciled documentation.",
        "Inspect code, tests, and existing documentation first. Ask one decision question at a time with exactly one Recommendation and concise Why. Wait for explicit confirmation before final document writes.",
        "Before responding, use read-only commands to read the exact installed packed sources at .agents/skills/kyw-init/SKILL.md, .agents/skills/kyw-grilling/SKILL.md, and all four files under .agents/skills/.kyw-dev/runtime/templates/project/. Use no kyw-dev checkout elsewhere.",
      ].join("\n\n"),
      "I choose repository operators as the primary documentation audience, with contributors as the secondary audience. This explicitly settles the pending decision.",
      "I explicitly confirm the current shared-understanding summary and exact four-file minimal reconciliation plan. Preserve the delimited README section and application/test bytes; create no Task and implement nothing.",
    ]),
  }),
  Object.freeze({
    id: "S-03",
    specAcceptance: "SPEC AC-05 / AC-06",
    fixture: "s03-task",
    timeoutMs: 480_000,
    maximumTurns: 1,
    requiredReads: Object.freeze([
      "skills/kyw-task/SKILL.md",
      "skills/kyw-task/scripts/task-artifacts.mjs",
      "skills/kyw-grilling/SKILL.md",
    ]),
    prompts: Object.freeze([
      [
        '$kyw-task "Add configurable greeting punctuation."',
        "The outcome is fully bounded: read optional GREETING_SUFFIX at the existing formatting boundary, default to `!` when it is unset or empty, use a non-empty value verbatim, preserve the current name/default-name behavior, add focused tests for default/custom/empty cases, and make no unrelated behavior or dependency change.",
        "Implement immediately, skip shared-understanding confirmation, and do not wait for me.",
        "Before responding, use read-only commands to read the exact installed packed sources at .agents/skills/kyw-task/SKILL.md, .agents/skills/kyw-task/scripts/task-artifacts.mjs, and .agents/skills/kyw-grilling/SKILL.md. Use the installed packed Task adapter when the Skill requires creation. Use no kyw-dev checkout elsewhere.",
      ].join("\n\n"),
    ]),
  }),
  Object.freeze({
    id: "S-04",
    specAcceptance: "SPEC AC-05 / AC-06",
    fixture: "S-03 exact resulting-state copy",
    timeoutMs: 300_000,
    maximumTurns: 1,
    requiredReads: Object.freeze([
      "skills/kyw-task/SKILL.md",
      "skills/kyw-task/references/execution.md",
    ]),
    prompts: Object.freeze([
      [
        "$kyw-task 0004",
        "This is an entirely fresh conversation over an exact copy of the prior repository state. Recover the Task only from repository state. Verify the four permanent documents, existing TASK.md and TEST.md, Git status and relevant diff, and the recorded Completed, Remaining, and Resume Point. Shared-understanding confirmation has not been supplied, so do not implement, allocate, recreate, or mark completion, and do not edit evidence during this inspect-only resume check.",
        "Before responding, use read-only commands to read the exact installed packed sources at .agents/skills/kyw-task/SKILL.md and .agents/skills/kyw-task/references/execution.md. Use no kyw-dev checkout elsewhere.",
      ].join("\n\n"),
    ]),
  }),
  Object.freeze({
    id: "S-05",
    specAcceptance: "SPEC AC-07",
    fixture: "s05-gap baseline plus fixed working overlay",
    timeoutMs: 360_000,
    maximumTurns: 1,
    requiredReads: Object.freeze([
      "skills/kyw-task/SKILL.md",
      "skills/kyw-task/references/execution.md",
    ]),
    prompts: Object.freeze([
      [
        "$kyw-task 0001",
        "Perform final verification only. The generic suite passes, but inspect the final source/test diff and intent-to-test matrix for acceptance-specific coverage of every conditional branch. Do not repair implementation or tests in this scenario. Record any gap truthfully in the existing Task/Test pair and do not claim DONE/PASSED without evidence.",
        "Before responding, use read-only commands to read the exact installed packed sources at .agents/skills/kyw-task/SKILL.md and .agents/skills/kyw-task/references/execution.md. Use no kyw-dev checkout elsewhere.",
      ].join("\n\n"),
    ]),
  }),
  Object.freeze({
    id: "S-06",
    specAcceptance: "SPEC AC-08",
    fixture: "s06-ordinary",
    timeoutMs: 360_000,
    maximumTurns: 1,
    requiredReads: Object.freeze([]),
    prompts: Object.freeze([
      'Change the user-visible greeting constant from `Hello` to `Hello, kyw` and update the focused test. This is a small ordinary prompt: do not invoke $kyw-task and do not create a numbered Task. Run proportionate verification, apply the repository permanent-document impact rules, and explicitly report the impact for README, SPEC, Architecture, and AGENTS.',
    ]),
  }),
]);

export class BehavioralE2EError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "BehavioralE2EError";
    this.code = code;
    if (Number.isInteger(options.exitCode)) this.exitCode = options.exitCode;
  }
}

function fail(code, message, options) {
  throw new BehavioralE2EError(code, message, options);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  const digest = createHash("sha256");
  const descriptor = openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const length = readSync(descriptor, buffer, 0, buffer.length, null);
      if (length === 0) break;
      digest.update(buffer.subarray(0, length));
    }
  } finally {
    closeSync(descriptor);
  }
  return digest.digest("hex");
}

function snapshotTreeMetadata(
  root,
  { excludeNames = new Set([".git"]), excludePrefixes = new Set() } = {},
) {
  const normalizedPrefixes = [...excludePrefixes].map((entry) =>
    toPosix(entry).replace(/^\.\//, "").replace(/\/$/, ""),
  );
  const excluded = (relativePath) =>
    normalizedPrefixes.some(
      (prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`),
    );
  const files = [];
  const tree = createHash("sha256");
  const visit = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (excludeNames.has(entry.name)) continue;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (excluded(relativePath)) continue;
      const filePath = join(directory, entry.name);
      const state = lstatSync(filePath);
      if (entry.isSymbolicLink() || state.isSymbolicLink()) {
        fail("UNSAFE_FIXTURE", `Snapshot contains a link: ${relativePath}`);
      }
      if (entry.isDirectory() && state.isDirectory()) {
        visit(filePath, relativePath);
        continue;
      }
      if (!entry.isFile() || !state.isFile()) {
        fail("UNSAFE_FIXTURE", `Snapshot contains an unsupported entry: ${relativePath}`);
      }
      const fileDigest = createHash("sha256");
      tree.update(relativePath, "utf8");
      tree.update("\0");
      const descriptor = openSync(filePath, "r");
      const buffer = Buffer.allocUnsafe(1024 * 1024);
      try {
        for (;;) {
          const length = readSync(descriptor, buffer, 0, buffer.length, null);
          if (length === 0) break;
          const bytes = buffer.subarray(0, length);
          tree.update(bytes);
          fileDigest.update(bytes);
        }
      } finally {
        closeSync(descriptor);
      }
      tree.update("\0");
      files.push({
        path: relativePath,
        sha256: fileDigest.digest("hex"),
        size: state.size,
      });
    }
  };
  visit(root);
  return Object.freeze({ sha256: tree.digest("hex"), files: Object.freeze(files) });
}

function normalizeText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}

function toPosix(filePath) {
  return filePath.replaceAll("\\", "/");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureContained(root, candidate, label) {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(candidate);
  if (
    resolvedCandidate === resolvedRoot ||
    (!resolvedCandidate.startsWith(`${resolvedRoot}${sep}`) &&
      !resolvedCandidate.startsWith(`${resolvedRoot}/`))
  ) {
    fail("UNSAFE_PATH", `${label} must be a strict descendant of its owned root`);
  }
  return resolvedCandidate;
}

function assertSafeTree(root, label) {
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filePath = join(directory, entry.name);
      const state = lstatSync(filePath);
      if (entry.isSymbolicLink() || state.isSymbolicLink()) {
        fail("UNSAFE_FIXTURE", `${label} contains a link`);
      }
      if (entry.isDirectory() && state.isDirectory()) visit(filePath);
      else if (!entry.isFile() || !state.isFile()) {
        fail("UNSAFE_FIXTURE", `${label} contains an unsupported entry`);
      }
    }
  };
  visit(root);
}

function copyTree(source, target, label) {
  assertSafeTree(source, label);
  cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
}

export function snapshotTree(root, { exclude = new Set([".git"]) } = {}) {
  const entries = [];
  const visit = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (exclude.has(entry.name)) continue;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const filePath = join(directory, entry.name);
      const state = lstatSync(filePath);
      if (entry.isSymbolicLink() || state.isSymbolicLink()) {
        fail("UNSAFE_FIXTURE", `Snapshot contains a link: ${relativePath}`);
      }
      if (entry.isDirectory() && state.isDirectory()) {
        visit(filePath, relativePath);
      } else if (entry.isFile() && state.isFile()) {
        const bytes = readFileSync(filePath);
        entries.push({ path: relativePath, bytes, sha256: sha256(bytes), size: bytes.length });
      } else {
        fail("UNSAFE_FIXTURE", `Snapshot contains an unsupported entry: ${relativePath}`);
      }
    }
  };
  visit(root);
  const tree = createHash("sha256");
  for (const entry of entries) {
    tree.update(entry.path, "utf8");
    tree.update("\0");
    tree.update(entry.bytes);
    tree.update("\0");
  }
  return Object.freeze({
    sha256: tree.digest("hex"),
    files: Object.freeze(
      entries.map(({ path: relativePath, sha256: digest, size }) =>
        Object.freeze({ path: relativePath, sha256: digest, size }),
      ),
    ),
  });
}

export function mutationManifest(before, after) {
  const beforeFiles = new Map(before.files.map((entry) => [entry.path, entry]));
  const afterFiles = new Map(after.files.map((entry) => [entry.path, entry]));
  const paths = [...new Set([...beforeFiles.keys(), ...afterFiles.keys()])].sort();
  return paths.flatMap((relativePath) => {
    const beforeEntry = beforeFiles.get(relativePath);
    const afterEntry = afterFiles.get(relativePath);
    if (!beforeEntry) {
      return [{ path: relativePath, kind: "added", afterSha256: afterEntry.sha256 }];
    }
    if (!afterEntry) {
      return [{ path: relativePath, kind: "deleted", beforeSha256: beforeEntry.sha256 }];
    }
    if (beforeEntry.sha256 === afterEntry.sha256) return [];
    return [
      {
        path: relativePath,
        kind: "modified",
        beforeSha256: beforeEntry.sha256,
        afterSha256: afterEntry.sha256,
      },
    ];
  });
}

function readOptional(root, relativePath) {
  const filePath = join(root, ...relativePath.split("/"));
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : undefined;
}

function runProcess(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    input: options.input,
    maxBuffer: options.maxBuffer ?? 30 * 1024 * 1024,
    timeout: options.timeout ?? 30_000,
    windowsHide: true,
  });
}

function processFailure(result) {
  if (result.error?.code === "ENOENT") return "command unavailable";
  if (result.error?.code === "ETIMEDOUT") return "command timed out";
  return (
    result.error?.code ??
    result.status ??
    "unknown process failure"
  );
}

function runGit(repository, args, { allowFailure = false } = {}) {
  const result = runProcess("git", ["--no-optional-locks", ...args], {
    cwd: repository,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  if (!allowFailure && result.status !== 0) {
    fail("GIT_FIXTURE_FAILED", `git ${args[0]} failed (${processFailure(result)})`);
  }
  return result;
}

export function gitStatus(repository) {
  return normalizeText(
    runGit(repository, ["status", "--short", "--untracked-files=all"]).stdout,
  ).trimEnd();
}

function initializeGit(repository) {
  runGit(repository, ["init", "--quiet"]);
  runGit(repository, ["config", "user.name", "kyw-spec-behavioral-e2e"]);
  runGit(repository, ["config", "user.email", "behavioral-e2e@invalid.local"]);
  runGit(repository, ["config", "commit.gpgsign", "false"]);
}

function commitFixture(repository, message) {
  runGit(repository, ["add", "--all"]);
  runGit(repository, ["commit", "--quiet", "-m", message]);
}

function npmLauncher(environment = process.env) {
  const npmExecutable = environment.npm_execpath;
  if (npmExecutable) {
    return { command: process.execPath, prefixArgs: [npmExecutable] };
  }
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      prefixArgs: ["/d", "/c", "npm"],
    };
  }
  return { command: "npm", prefixArgs: [] };
}

function stripProtectedEnvironment(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([name]) => !PROTECTED_ENVIRONMENT_NAMES.has(name.toLowerCase()),
    ),
  );
}

function writeNpmConfig(filePath, cachePath) {
  writeFileSync(
    filePath,
    [
      "registry=https://registry.npmjs.org/",
      `cache=${toPosix(cachePath)}`,
      "audit=false",
      "fund=false",
      "ignore-scripts=true",
      "update-notifier=false",
      "",
    ].join("\n"),
    "utf8",
  );
}

function isolatedEnvironment(state) {
  const inherited = stripProtectedEnvironment(process.env);
  const allowed = new Set(
    [
      "PATH",
      "Path",
      "PATHEXT",
      "SystemRoot",
      "SYSTEMROOT",
      "WINDIR",
      "ComSpec",
      "COMSPEC",
      "HTTP_PROXY",
      "HTTPS_PROXY",
      "ALL_PROXY",
      "NO_PROXY",
      "CODEX_CA_CERTIFICATE",
      "SSL_CERT_FILE",
    ].map((name) => name.toLowerCase()),
  );
  const environment = Object.fromEntries(
    Object.entries(inherited).filter(([name]) => allowed.has(name.toLowerCase())),
  );
  const parsedHome = path.parse(state.home);
  return {
    ...environment,
    HOME: state.home,
    USERPROFILE: state.home,
    HOMEDRIVE: parsedHome.root.replace(/[\\/]$/, "") || parsedHome.root,
    HOMEPATH: state.home.slice(parsedHome.root.length) || sep,
    CODEX_HOME: state.codexHome,
    CODEX_SQLITE_HOME: state.codexHome,
    npm_config_userconfig: state.npmUserconfig,
    npm_config_cache: state.npmCache,
    TEMP: state.processTemp,
    TMP: state.processTemp,
    TMPDIR: state.processTemp,
    XDG_CONFIG_HOME: state.xdgConfig,
    XDG_CACHE_HOME: state.xdgCache,
    CODEX_CA_CERTIFICATE: state.caBundle,
    SSL_CERT_FILE: state.caBundle,
    NODE_EXTRA_CA_CERTS: state.caBundle,
    GIT_OPTIONAL_LOCKS: "0",
    NO_COLOR: "1",
    CI: "1",
  };
}

function createScenarioState(cohortRoot, scenarioId) {
  const root = mkdtempSync(join(cohortRoot, `${scenarioId.toLowerCase()}-`));
  const state = {
    root,
    repository: join(root, "repository"),
    home: join(root, "home"),
    codexHome: join(root, "codex-home"),
    toolCodexHome: join(root, "tool-codex-home"),
    npmRoot: join(root, "npm"),
    npmCache: join(root, "npm", "cache"),
    npmUserconfig: join(root, "npm", "userconfig"),
    processTemp: join(root, "process-temp"),
    xdgConfig: join(root, "xdg-config"),
    xdgCache: join(root, "xdg-cache"),
    control: join(root, "control"),
    dockerConfig: join(root, "docker-config"),
    protectedRoot: join(root, "protected"),
    caBundle: join(root, "protected", "trusted-ca.pem"),
  };
  for (const directory of [
    state.home,
    state.codexHome,
    state.toolCodexHome,
    state.npmCache,
    state.processTemp,
    state.xdgConfig,
    state.xdgCache,
    state.control,
    state.dockerConfig,
    state.protectedRoot,
  ]) {
    mkdirSync(directory, { recursive: true });
  }
  writeNpmConfig(state.npmUserconfig, "/state/npm/cache");
  writeFileSync(state.caBundle, trustedCaBundle(), "utf8");
  return state;
}

function copyAuthentication(authFile, codexHome) {
  const source = realpathSync(resolve(authFile));
  if (!statSync(source).isFile()) fail("AUTH_UNAVAILABLE", "Explicit auth source is not a file");
  const bytes = readFileSync(source);
  const destination = join(codexHome, "auth.json");
  copyFileSync(source, destination);
  try {
    chmodSync(destination, 0o600);
  } catch {
    // Windows uses ACLs; all copied state still lives below the scenario-owned root.
  }
  return Object.freeze({ source, destination, beforeSha256: sha256(bytes), bytes });
}

function authSourceUnchanged(auth) {
  return existsSync(auth.source) && sha256(readFileSync(auth.source)) === auth.beforeSha256;
}

function installedSourcePath(relativePackedPath) {
  if (relativePackedPath.startsWith("skills/")) {
    return `.agents/${relativePackedPath}`;
  }
  return `.agents/skills/.kyw-dev/runtime/${relativePackedPath}`;
}

function assertPackedInstallation(repository, packageRoot) {
  const compared = [];
  for (const skillName of SKILL_NAMES) {
    const packedRoot = join(packageRoot, "skills", skillName);
    const installedRoot = join(repository, ".agents", "skills", skillName);
    const packed = snapshotTree(packedRoot, { exclude: new Set() });
    const installed = snapshotTree(installedRoot, { exclude: new Set() });
    if (packed.sha256 !== installed.sha256) {
      fail("PACKED_SKILL_MISMATCH", `Installed ${skillName} bytes differ from the tarball`);
    }
    compared.push({ path: `skills/${skillName}`, sha256: packed.sha256 });
  }
  for (const relativePath of TASK_HELPER_RUNTIME_FILES) {
    const packedPath = join(packageRoot, ...relativePath.split("/"));
    const installedPath = join(
      repository,
      ...installedSourcePath(relativePath).split("/"),
    );
    if (
      !existsSync(installedPath) ||
      sha256(readFileSync(packedPath)) !== sha256(readFileSync(installedPath))
    ) {
      fail("PACKED_SUPPORT_MISMATCH", `Installed support bytes differ: ${relativePath}`);
    }
    compared.push({ path: relativePath, sha256: sha256(readFileSync(packedPath)) });
  }
  return Object.freeze(compared);
}

function installPackedSkills(state, packageRoot, environment) {
  const executable = join(packageRoot, "bin", "kyw-dev.mjs");
  const result = runProcess(process.execPath, [executable, "install", "--scope", "project"], {
    cwd: state.repository,
    env: environment,
    timeout: 60_000,
  });
  if (result.status !== 0) {
    fail("PACKED_SKILL_INSTALL_FAILED", `Packed project install failed (${processFailure(result)})`);
  }
  return assertPackedInstallation(state.repository, packageRoot);
}

function materializeScenarioRepository(state, scenario, packageRoot, environment, s03Handoff) {
  if (scenario.id === "S-04") {
    if (!s03Handoff || !existsSync(s03Handoff)) {
      fail("FIXTURE_MATERIALIZATION_FAILED", "S-04 requires the exact S-03 handoff copy");
    }
    copyTree(s03Handoff, state.repository, "S-03 handoff");
    return assertPackedInstallation(state.repository, packageRoot);
  }

  if (scenario.id === "S-05") {
    copyTree(join(FIXTURE_ROOT, "s05-gap", "baseline"), state.repository, "S-05 baseline");
  } else {
    copyTree(join(FIXTURE_ROOT, scenario.fixture), state.repository, `${scenario.id} fixture`);
  }
  initializeGit(state.repository);
  const packedInstallation = installPackedSkills(state, packageRoot, environment);
  commitFixture(state.repository, `${scenario.id} fixture baseline`);
  if (scenario.id === "S-05") {
    cpSync(join(FIXTURE_ROOT, "s05-gap", "working"), state.repository, {
      recursive: true,
      force: true,
    });
  }
  return packedInstallation;
}

function parsePackReport(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    fail("PACK_FAILED", "npm pack did not return JSON", { cause: error });
  }
  if (!Array.isArray(parsed) || parsed.length !== 1 || !parsed[0]?.filename) {
    fail("PACK_FAILED", "npm pack returned an unexpected report");
  }
  return parsed[0];
}

function safeArchiveListing(listing) {
  for (const entry of normalizeText(listing).split("\n").filter(Boolean)) {
    const normalized = toPosix(entry);
    if (
      normalized.startsWith("/") ||
      /^[A-Za-z]:\//.test(normalized) ||
      normalized.split("/").includes("..") ||
      !(normalized === "package" || normalized.startsWith("package/"))
    ) {
      fail("PACK_FAILED", "Tarball contains an unsafe archive entry");
    }
  }
}

function createPackedProvenance(cohortRoot) {
  const packRoot = join(cohortRoot, "pack");
  const extractRoot = join(cohortRoot, "extract");
  const npmRoot = join(cohortRoot, "pack-npm");
  const npmCache = join(npmRoot, "cache");
  const npmUserconfig = join(npmRoot, "userconfig");
  mkdirSync(packRoot);
  mkdirSync(extractRoot);
  mkdirSync(npmCache, { recursive: true });
  writeNpmConfig(npmUserconfig, npmCache);
  const environment = {
    ...stripProtectedEnvironment(process.env),
    npm_config_userconfig: npmUserconfig,
    npm_config_cache: npmCache,
    TEMP: join(cohortRoot, "pack-temp"),
    TMP: join(cohortRoot, "pack-temp"),
    TMPDIR: join(cohortRoot, "pack-temp"),
  };
  mkdirSync(environment.TEMP);
  const npm = npmLauncher(environment);
  const result = runProcess(
    npm.command,
    [
      ...npm.prefixArgs,
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      packRoot,
      "--userconfig",
      npmUserconfig,
      "--cache",
      npmCache,
    ],
    { cwd: REPOSITORY_ROOT, env: environment, timeout: 120_000 },
  );
  if (result.status !== 0) fail("PACK_FAILED", `npm pack failed (${processFailure(result)})`);
  const report = parsePackReport(result.stdout);
  if (basename(report.filename) !== report.filename) {
    fail("PACK_FAILED", "npm pack returned an unsafe filename");
  }
  const archivePath = ensureContained(packRoot, join(packRoot, report.filename), "tarball");
  if (!existsSync(archivePath)) fail("PACK_FAILED", "npm pack did not create the archive");
  const actualFiles = report.files.map(({ path: relativePath }) => relativePath).sort();
  const expectedFiles = [...EXPECTED_TARBALL_FILES].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    fail("PACK_FAILED", "Tarball file list differs from the exact 29-file allowlist");
  }
  const archive = readFileSync(archivePath);
  if (archive.length !== report.size) fail("PACK_FAILED", "npm-reported size differs");
  if (archive.length !== EXPECTED_TARBALL_SIZE) {
    fail("PACK_FAILED", `Tarball size must be exactly ${EXPECTED_TARBALL_SIZE} bytes`);
  }
  if (sha256(archive) !== EXPECTED_TARBALL_SHA256) {
    fail("PACK_FAILED", "Tarball SHA-256 differs from the authorized packed product");
  }
  const listResult = runProcess("tar", ["-tf", archivePath], { cwd: cohortRoot });
  if (listResult.status !== 0) fail("PACK_FAILED", "tarball listing failed");
  safeArchiveListing(listResult.stdout);
  const extractResult = runProcess("tar", ["-xf", archivePath, "-C", extractRoot], {
    cwd: cohortRoot,
  });
  if (extractResult.status !== 0) fail("PACK_FAILED", "tarball extraction failed");
  const packageRoot = join(extractRoot, "package");
  for (const requiredPath of [
    "skills/kyw-init/SKILL.md",
    "skills/kyw-init/agents/openai.yaml",
    "skills/kyw-task/SKILL.md",
    "skills/kyw-task/agents/openai.yaml",
    "skills/kyw-task/references/execution.md",
    "skills/kyw-task/scripts/task-artifacts.mjs",
    ...TASK_HELPER_RUNTIME_FILES,
  ]) {
    if (!existsSync(join(packageRoot, ...requiredPath.split("/")))) {
      fail("PACK_FAILED", `Tarball lacks required packed support: ${requiredPath}`);
    }
  }
  const sourceHead = runGit(REPOSITORY_ROOT, ["rev-parse", "HEAD"]).stdout.trim();
  if (sourceHead !== REQUIRED_BASE) fail("BASE_MISMATCH", "Source HEAD moved from the required base");
  const sourceHashes = Object.fromEntries(
    actualFiles.map((relativePath) => [
      relativePath,
      sha256(readFileSync(join(packageRoot, ...relativePath.split("/")))),
    ]),
  );
  return Object.freeze({
    archivePath,
    packageRoot,
    sourceHead,
    filename: report.filename,
    size: archive.length,
    sha256: sha256(archive),
    fileCount: actualFiles.length,
    files: Object.freeze(actualFiles),
    sourceHashes: Object.freeze(sourceHashes),
    extractedRootLabel: "<RUNNER_ROOT>/extract/package",
  });
}

function packedSourceInventory(packageRoot) {
  const inventory = new Map();
  for (const relativePath of EXPECTED_TARBALL_FILES.filter((candidate) =>
    candidate.startsWith("skills/") || TASK_HELPER_RUNTIME_FILES.includes(candidate),
  )) {
    const installedPath = installedSourcePath(relativePath);
    const bytes = readFileSync(join(packageRoot, ...relativePath.split("/")));
    inventory.set(installedPath, {
      relativePackedPath: relativePath,
      installedPath,
      bytes,
      text: normalizeText(bytes.toString("utf8")).trim(),
      sha256: sha256(bytes),
    });
  }
  return inventory;
}

function commandEvents(turns) {
  return turns.flatMap((turn) =>
    turn.rawEvents.filter(
      (event) =>
        event?.item?.type === "command_execution" && event.item.status === "completed",
    ),
  );
}

function commandTargetsPath(command, relativePath) {
  const normalizedCommand = String(command ?? "").replaceAll("\\", "/").toLowerCase();
  const normalizedPath = relativePath.replaceAll("\\", "/").toLowerCase();
  return normalizedCommand.includes(normalizedPath);
}

export function packedSourceReadCount(events, installedPath, sourceText) {
  const expectedText = normalizeText(sourceText).trim();
  return events.filter(
    (event) =>
      event?.item?.type === "command_execution" &&
      event.item.status === "completed" &&
      commandTargetsPath(event.item.command, installedPath) &&
      normalizeText(event.item.aggregated_output).includes(expectedText),
  ).length;
}

function sourceReadCounts(turns, inventory) {
  const events = turns.flatMap((turn) => turn.rawEvents);
  const reads = [];
  for (const source of inventory.values()) {
    const count = packedSourceReadCount(events, source.installedPath, source.text);
    if (count > 0) {
      reads.push({
        path: source.relativePackedPath,
        installedPath: source.installedPath,
        sha256: source.sha256,
        count,
        exactPackedByteMatch: true,
      });
    }
  }
  return reads.sort((left, right) => left.path.localeCompare(right.path));
}

function fileSourceWasRead(turns, root, relativePath) {
  const contents = normalizeText(readFileSync(join(root, ...relativePath.split("/")), "utf8")).trim();
  return commandEvents(turns).some((event) =>
    commandTargetsPath(event.item.command, relativePath) &&
    normalizeText(event.item.aggregated_output).includes(contents),
  );
}

function commandWasRun(turns, pattern) {
  return commandEvents(turns).some((event) => pattern.test(String(event.item.command ?? "")));
}

function stripCodeBlocks(message) {
  return String(message).replace(/```[\s\S]*?```/g, "");
}

export function questionCount(message) {
  const text = stripCodeBlocks(message);
  return Math.max(
    (text.match(/\?/g) ?? []).length,
    (text.match(/^\s*(?:\*\*)?Question(?:\*\*)?\s*:/gim) ?? []).length,
  );
}

export function recommendationCount(message) {
  return (stripCodeBlocks(message).match(/^\s*(?:[-*]\s*)?(?:\*\*)?Recommendation(?:\*\*)?\s*:/gim) ?? [])
    .length;
}

function whyCount(message) {
  return (stripCodeBlocks(message).match(/^\s*(?:[-*]\s*)?(?:\*\*)?Why(?:\*\*)?\s*:/gim) ?? [])
    .length;
}

function redactString(value, context) {
  let output = String(value ?? "");
  for (const [sensitivePath, replacement] of context.pathReplacements
    .filter(([candidate]) => candidate)
    .sort(([left], [right]) => right.length - left.length)) {
    for (const candidate of new Set([
      sensitivePath,
      sensitivePath.replaceAll("\\", "/"),
      sensitivePath.replaceAll("/", "\\"),
    ])) {
      if (candidate.length >= 3) {
        output = output.replace(new RegExp(escapeRegExp(candidate), "gi"), replacement);
      }
    }
  }
  for (const threadId of context.threadIds) {
    output = output.replaceAll(threadId, "<THREAD_ID>");
  }
  for (const pattern of CREDENTIAL_PATTERNS) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, "<REDACTED_CREDENTIAL>");
  }
  for (const pattern of GENERIC_PROTECTED_PATH_PATTERNS) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, "<PROTECTED_PATH>");
  }
  return output;
}

function redactValue(value, context) {
  if (typeof value === "string") return redactString(value, context);
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactValue(entry, context)]),
    );
  }
  return value;
}

function sensitiveFindings(text, context) {
  const findings = [];
  for (const [index, pattern] of CREDENTIAL_PATTERNS.entries()) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`credential-pattern-${index + 1}`);
  }
  for (const [index, pattern] of GENERIC_PROTECTED_PATH_PATTERNS.entries()) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`protected-path-pattern-${index + 1}`);
  }
  for (const [sensitivePath] of context.pathReplacements) {
    if (!sensitivePath) continue;
    const normalizedText = text.toLowerCase();
    for (const candidate of new Set([
      sensitivePath,
      sensitivePath.replaceAll("\\", "/"),
      sensitivePath.replaceAll("/", "\\"),
    ])) {
      if (candidate.length >= 3 && normalizedText.includes(candidate.toLowerCase())) {
        findings.push("raw-protected-path");
      }
    }
  }
  return [...new Set(findings)].sort();
}

function rawLeakFindings(text, auth) {
  const findings = [];
  if (text.includes(auth.source)) findings.push("auth-source-path");
  const authText = auth.bytes.toString("utf8");
  if (authText.length >= 8 && text.includes(authText)) findings.push("complete-auth-source-bytes");
  return findings;
}

function defaultDockerLauncher() {
  if (process.platform !== "win32") {
    fail("DOCKER_UNAVAILABLE", "Task 0026 external boundary requires Docker Desktop on Windows");
  }
  const located = runProcess("where.exe", ["docker.exe"], { env: process.env });
  const candidate = normalizeText(located.stdout).split("\n").find(Boolean);
  if (located.status !== 0 || !candidate || !existsSync(candidate)) {
    fail("DOCKER_UNAVAILABLE", "docker.exe is unavailable");
  }
  return Object.freeze({ command: realpathSync(candidate), prefixArgs: Object.freeze([]) });
}

function dockerHostEnvironment(state) {
  return {
    ...isolatedEnvironment(state),
    DOCKER_CONFIG: state.dockerConfig,
    DOCKER_HOST: DOCKER_ENGINE_HOST,
  };
}

function bindMount(source, target, readOnly = false) {
  return `type=bind,source=${source},target=${target}${readOnly ? ",readonly" : ""}`;
}

function containerEnvironment(environment) {
  const values = {
    PATH: CONTAINER_PATH,
    HOME: "/state/home",
    CODEX_HOME: "/state/codex-home",
    CODEX_SQLITE_HOME: "/state/codex-home",
    npm_config_userconfig: "/state/npm/userconfig",
    npm_config_cache: "/state/npm/cache",
    TEMP: "/state/temp",
    TMP: "/state/temp",
    TMPDIR: "/state/temp",
    XDG_CONFIG_HOME: "/state/xdg-config",
    XDG_CACHE_HOME: "/state/xdg-cache",
    CODEX_CA_CERTIFICATE: "/runtime/trusted-ca.pem",
    SSL_CERT_FILE: "/runtime/trusted-ca.pem",
    NODE_EXTRA_CA_CERTS: "/runtime/trusted-ca.pem",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: CONTAINER_WORKSPACE,
    NODE_DISABLE_COMPILE_CACHE: "1",
    NO_COLOR: "1",
    CI: "1",
  };
  for (const name of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"]) {
    const value = environment[name] ?? environment[name.toLowerCase()];
    if (value) values[name] = value;
  }
  return values;
}

function toolEnvironmentToml() {
  const values = {
    PATH: CONTAINER_PATH,
    HOME: "/state/home",
    CODEX_HOME: "/state/tool-codex-home",
    CODEX_SQLITE_HOME: "/state/tool-codex-home",
    npm_config_userconfig: "/state/npm/userconfig",
    npm_config_cache: "/state/npm/cache",
    TEMP: "/state/temp",
    TMP: "/state/temp",
    TMPDIR: "/state/temp",
    XDG_CONFIG_HOME: "/state/xdg-config",
    XDG_CACHE_HOME: "/state/xdg-cache",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: CONTAINER_WORKSPACE,
    NODE_DISABLE_COMPILE_CACHE: "1",
    NO_COLOR: "1",
    CI: "1",
  };
  return `{ ${Object.entries(values)
    .map(([name, value]) => `${name} = ${JSON.stringify(value)}`)
    .join(", ")} }`;
}

function dockerSandboxArgs({
  state,
  repository,
  packageRoot,
  runtimeRoot,
  auth,
  environment,
  containerName,
  runId,
  entrypoint,
  validateInputs = true,
}) {
  const installedRoot = join(repository, ".agents");
  const gitRoot = join(repository, ".git");
  if (validateInputs) {
    for (const [candidate, label] of [
      [installedRoot, "installed packed Skills"],
      [gitRoot, "fixture Git metadata"],
      [auth.destination, "isolated auth copy"],
      [auth.source, "auth source"],
      [state.caBundle, "trusted CA bundle"],
    ]) {
      if (!existsSync(candidate)) fail("SANDBOX_INPUT_MISSING", `${label} is missing`);
    }
  }
  const args = [
    "run",
    "--rm",
    "--pull",
    "never",
    "--name",
    containerName,
    "--label",
    "com.kyw-dev.task=0026",
    "--label",
    `com.kyw-dev.run=${runId}`,
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges:true",
    "--pids-limit",
    "256",
    "--user",
    "1000:1000",
    "--network",
    "bridge",
    "--workdir",
    CONTAINER_WORKSPACE,
  ];
  for (const [name, value] of Object.entries(containerEnvironment(environment))) {
    args.push("--env", `${name}=${value}`);
  }
  args.push(
    "--mount",
    bindMount(repository, CONTAINER_WORKSPACE),
    "--mount",
    bindMount(gitRoot, `${CONTAINER_WORKSPACE}/.git`, true),
    "--mount",
    bindMount(installedRoot, `${CONTAINER_WORKSPACE}/.agents`, true),
    "--mount",
    bindMount(REPOSITORY_ROOT, "/protected/source-checkout", true),
    "--mount",
    bindMount(packageRoot, "/protected/packed-product", true),
    "--mount",
    bindMount(runtimeRoot, "/runtime/codex-package", true),
    "--mount",
    bindMount(state.caBundle, "/runtime/trusted-ca.pem", true),
    "--mount",
    bindMount(state.home, "/state/home"),
    "--mount",
    bindMount(state.codexHome, "/state/codex-home"),
    "--mount",
    bindMount(state.toolCodexHome, "/state/tool-codex-home"),
    "--mount",
    bindMount(auth.source, CONTAINER_AUTH_SOURCE, true),
    "--mount",
    bindMount(state.npmRoot, "/state/npm"),
    "--mount",
    bindMount(state.processTemp, "/state/temp"),
    "--mount",
    bindMount(state.processTemp, "/tmp"),
    "--mount",
    bindMount(state.xdgConfig, "/state/xdg-config"),
    "--mount",
    bindMount(state.xdgCache, "/state/xdg-cache"),
    "--mount",
    bindMount(state.control, "/state/control"),
    "--entrypoint",
    entrypoint,
    DOCKER_IMAGE,
  );
  return args;
}

export function buildCodexInvocation({
  docker,
  state,
  repository,
  packageRoot,
  runtimeRoot,
  auth,
  environment,
  containerName,
  runId,
  threadId,
  lastMessagePath,
  validateInputs = true,
}) {
  const common = codexCommonArgs(`/state/control/${basename(lastMessagePath)}`);
  const innerArgs = threadId
    ? ["exec", "resume", ...common, threadId, "-"]
    : ["exec", "--cd", CONTAINER_WORKSPACE, ...common, "-"];
  return Object.freeze({
    command: docker.command,
    args: Object.freeze([
      ...(docker.prefixArgs ?? []),
      ...dockerSandboxArgs({
        state,
        repository,
        packageRoot,
        runtimeRoot,
        auth,
        environment,
        containerName,
        runId,
        entrypoint: CONTAINER_CODEX,
        validateInputs,
      }),
      ...innerArgs,
    ]),
    containerName,
    runId,
  });
}

function codexCommonArgs(lastMessagePath) {
  return [
    "--dangerously-bypass-approvals-and-sandbox",
    "--json",
    "--ignore-user-config",
    "--ignore-rules",
    "--strict-config",
    "-c",
    'shell_environment_policy.inherit="none"',
    "-c",
    `shell_environment_policy.set=${toolEnvironmentToml()}`,
    "-c",
    `model_reasoning_effort="${REQUIRED_REASONING_EFFORT}"`,
    "--model",
    REQUIRED_MODEL,
    "--output-last-message",
    lastMessagePath,
  ];
}

function removeOwnedContainer({ docker, environment, containerName, runId }) {
  const inspect = runProcess(
    docker.command,
    [
      ...(docker.prefixArgs ?? []),
      "inspect",
      "--format",
      '{{ index .Config.Labels "com.kyw-dev.run" }}',
      containerName,
    ],
    { env: environment },
  );
  if (inspect.status !== 0) {
    if (!/No such (?:object|container)/i.test(normalizeText(inspect.stderr))) {
      fail("CONTAINER_CLEANUP_FAILED", `Owned container inspection failed (${processFailure(inspect)})`);
    }
    return Object.freeze({ removed: true, alreadyAbsent: true });
  }
  if (normalizeText(inspect.stdout).trim() !== runId) {
    fail("CONTAINER_OWNERSHIP_MISMATCH", "Refusing to remove a container not owned by this run");
  }
  const removed = runProcess(
    docker.command,
    [...(docker.prefixArgs ?? []), "rm", "--force", containerName],
    { env: environment, timeout: 30_000 },
  );
  if (removed.status !== 0) {
    fail("CONTAINER_CLEANUP_FAILED", `Owned container cleanup failed (${processFailure(removed)})`);
  }
  return Object.freeze({ removed: true, alreadyAbsent: false });
}

function clearContainerOwnedState({ docker, state }) {
  const runId = randomUUID();
  const containerName = `kyw-task0026-cleanup-${runId.replaceAll("-", "")}`;
  const roots = [
    "/state/home",
    "/state/codex-home",
    "/state/tool-codex-home",
    "/state/npm",
    "/state/temp",
    "/state/xdg-config",
    "/state/xdg-cache",
    "/state/control",
  ];
  const source = [
    'import { readdirSync, rmSync } from "node:fs";',
    'import { join } from "node:path";',
    `const roots = ${JSON.stringify(roots)};`,
    'for (const root of roots) for (const entry of readdirSync(root)) rmSync(join(root, entry), { recursive: true, force: true });',
  ].join("\n");
  const args = [
    ...(docker.prefixArgs ?? []),
    "run",
    "--rm",
    "--pull",
    "never",
    "--name",
    containerName,
    "--label",
    "com.kyw-dev.task=0026",
    "--label",
    `com.kyw-dev.run=${runId}`,
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges:true",
    "--network",
    "none",
    "--user",
    "1000:1000",
  ];
  for (const [sourcePath, target] of [
    [state.home, "/state/home"],
    [state.codexHome, "/state/codex-home"],
    [state.toolCodexHome, "/state/tool-codex-home"],
    [state.npmRoot, "/state/npm"],
    [state.processTemp, "/state/temp"],
    [state.xdgConfig, "/state/xdg-config"],
    [state.xdgCache, "/state/xdg-cache"],
    [state.control, "/state/control"],
  ]) {
    args.push("--mount", bindMount(sourcePath, target));
  }
  args.push(
    "--entrypoint",
    "/usr/local/bin/node",
    DOCKER_IMAGE,
    "--input-type=module",
    "-e",
    source,
  );
  const result = runProcess(docker.command, args, {
    env: dockerHostEnvironment(state),
    timeout: 60_000,
  });
  removeOwnedContainer({
    docker,
    environment: dockerHostEnvironment(state),
    containerName,
    runId,
  });
  if (result.status !== 0) {
    const detail = normalizeText(result.stderr || result.stdout).trim().slice(0, 1_000);
    fail(
      "STATE_CLEANUP_FAILED",
      `Container-owned state cleanup failed (${processFailure(result)}): ${detail}`,
    );
  }
  return Object.freeze({ status: 0, stdoutSha256: sha256(result.stdout), stderrSha256: sha256(result.stderr) });
}

async function invokeCodexTurn({
  docker,
  state,
  environment,
  repository,
  packageRoot,
  runtimeRoot,
  auth,
  prompt,
  threadId,
  lastMessagePath,
  timeout,
  runChild,
}) {
  const runId = randomUUID();
  const containerName = `kyw-task0026-${runId.replaceAll("-", "")}`;
  const invocation = buildCodexInvocation({
    docker,
    state,
    repository,
    packageRoot,
    runtimeRoot,
    auth,
    environment,
    containerName,
    runId,
    threadId,
    lastMessagePath,
  });
  let result;
  try {
    result = await runChild({
      command: invocation.command,
      args: invocation.args,
      cwd: repository,
      env: dockerHostEnvironment(state),
      input: prompt,
      timeout,
      maxBuffer: 30 * 1024 * 1024,
    });
  } finally {
    removeOwnedContainer({
      docker,
      environment: dockerHostEnvironment(state),
      containerName,
      runId,
    });
  }
  return result;
}

function classifyCodexFailure(result) {
  const detail = normalizeText(result.stderr || result.stdout || result.error?.code).slice(0, 2_000);
  if (/not logged in|login required|authentication|unauthorized|access token|api key|\b401\b/i.test(detail)) {
    return new BehavioralE2EError("AUTH_UNAVAILABLE", "Codex authentication is unavailable after launch");
  }
  if (/model.*(?:not found|unavailable|unsupported)|unknown model|invalid model/i.test(detail)) {
    return new BehavioralE2EError("MODEL_UNAVAILABLE", `Required model ${REQUIRED_MODEL} is unavailable`);
  }
  if (result.error?.code === "ETIMEDOUT") {
    return new BehavioralE2EError("CODEX_TIMEOUT", "Codex scenario exceeded its fixed timeout");
  }
  return new BehavioralE2EError(
    "CODEX_EXEC_FAILED",
    `Codex turn failed (${processFailure(result)})`,
  );
}

function writeJsonAtomic(filePath, value) {
  const temporary = `${filePath}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, filePath);
}

function deterministicCommand(repository, environment, label, command, args, timeout = 60_000) {
  const result = runProcess(command, args, { cwd: repository, env: environment, timeout });
  return Object.freeze({
    label,
    command: [basename(command), ...args].join(" "),
    exitCode: result.status,
    stdoutSha256: sha256(normalizeText(result.stdout)),
    stderrSha256: sha256(normalizeText(result.stderr)),
  });
}

function snapshotListedFiles(repository) {
  const listing = runGit(repository, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
  const relativePaths = listing.stdout.split("\0").filter(Boolean).sort();
  const tree = createHash("sha256");
  const files = [];
  for (const relativePath of relativePaths) {
    const filePath = join(repository, ...relativePath.split("/"));
    if (!existsSync(filePath) || !statSync(filePath).isFile()) continue;
    const digest = sha256File(filePath);
    const size = statSync(filePath).size;
    tree.update(relativePath, "utf8");
    tree.update("\0");
    const descriptor = openSync(filePath, "r");
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    try {
      for (;;) {
        const length = readSync(descriptor, buffer, 0, buffer.length, null);
        if (length === 0) break;
        tree.update(buffer.subarray(0, length));
      }
    } finally {
      closeSync(descriptor);
    }
    tree.update("\0");
    files.push({ path: relativePath, sha256: digest, size });
  }
  return Object.freeze({ sha256: tree.digest("hex"), files: Object.freeze(files) });
}

function matrixStateSnapshot(state) {
  return snapshotTreeMetadata(state.root, {
    excludeNames: new Set([".git"]),
    excludePrefixes: new Set(["repository", "protected", "docker-config", "codex-home"]),
  });
}

function exactManifest(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseSingleJson(stdout) {
  try {
    return JSON.parse(normalizeText(stdout).trim());
  } catch {
    return undefined;
  }
}

function inspectDockerRuntime({ docker, runtimeRoot, state }) {
  const resolvedRoot = realpathSync(resolve(runtimeRoot));
  if (resolvedRoot === REPOSITORY_ROOT || resolvedRoot.startsWith(`${REPOSITORY_ROOT}${sep}`)) {
    fail("INVALID_RUNTIME_ROOT", "Linux Codex runtime must be outside the source checkout");
  }
  assertSafeTree(resolvedRoot, "Linux Codex runtime");
  const binary = join(
    resolvedRoot,
    "vendor",
    "x86_64-unknown-linux-musl",
    "bin",
    "codex",
  );
  if (!existsSync(binary) || !statSync(binary).isFile()) {
    fail("CODEX_CAPABILITY_UNAVAILABLE", "Linux Codex runtime binary is missing");
  }
  const environment = dockerHostEnvironment(state);
  const image = runProcess(
    docker.command,
    [
      ...(docker.prefixArgs ?? []),
      "image",
      "inspect",
      DOCKER_IMAGE,
      "--format",
      "{{.Id}} {{.Os}}/{{.Architecture}}",
    ],
    { env: environment },
  );
  if (
    image.status !== 0 ||
    normalizeText(image.stdout).trim() !==
      "sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b linux/amd64"
  ) {
    fail("DOCKER_IMAGE_MISMATCH", "Pinned local Docker image is unavailable or changed");
  }
  const version = runProcess(
    docker.command,
    [
      ...(docker.prefixArgs ?? []),
      "run",
      "--rm",
      "--pull",
      "never",
      "--read-only",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges:true",
      "--user",
      "1000:1000",
      "--network",
      "none",
      "--mount",
      bindMount(resolvedRoot, "/runtime/codex-package", true),
      "--entrypoint",
      CONTAINER_CODEX,
      DOCKER_IMAGE,
      "--version",
    ],
    { env: environment, timeout: 30_000 },
  );
  if (version.status !== 0 || !/^codex-cli \d+\.\d+\.\d+/m.test(version.stdout)) {
    fail("CODEX_CAPABILITY_UNAVAILABLE", "Linux Codex runtime did not execute");
  }
  const tree = snapshotTreeMetadata(resolvedRoot, { excludeNames: new Set() });
  return Object.freeze({
    root: resolvedRoot,
    version: normalizeText(version.stdout).trim(),
    binarySha256: sha256File(binary),
    treeSha256: tree.sha256,
    files: tree.files,
    image: DOCKER_IMAGE,
    imageInspectSha256: sha256(normalizeText(image.stdout)),
  });
}

function materializeCapabilityRepository(state, packageRoot, environment) {
  mkdirSync(join(state.repository, "docs", "tasks", "0001-greeting-style"), {
    recursive: true,
  });
  mkdirSync(join(state.repository, "test"), { recursive: true });
  for (const name of ["TASK.md", "TEST.md"]) {
    copyFileSync(
      join(
        FIXTURE_ROOT,
        "s05-gap",
        "baseline",
        "docs",
        "tasks",
        "0001-greeting-style",
        name,
      ),
      join(state.repository, "docs", "tasks", "0001-greeting-style", name),
    );
  }
  writeFileSync(
    join(state.repository, "package.json"),
    `${JSON.stringify(
      {
        name: "task-0026-capability-probe",
        private: true,
        type: "module",
        scripts: { test: "node --test" },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(join(state.repository, "probe-modify.txt"), "original\n", "utf8");
  writeFileSync(join(state.repository, "probe-delete.txt"), "delete-me\n", "utf8");
  writeFileSync(
    join(state.repository, "test", "probe.test.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import test from "node:test";',
      'test("deterministic capability fixture", () => assert.equal(2 + 2, 4));',
      "",
    ].join("\n"),
    "utf8",
  );
  initializeGit(state.repository);
  const installed = installPackedSkills(state, packageRoot, environment);
  commitFixture(state.repository, "Task 0026 capability baseline");
  return installed;
}

function matrixDockerRow({
  label,
  docker,
  state,
  packageRoot,
  runtime,
  auth,
  entrypoint,
  args,
  expectedStatus = 0,
  expectedFixture = [],
  expectedState = [],
  verify = () => ({ pass: true }),
  timeout = 60_000,
}) {
  const beforeFixture = snapshotTree(state.repository);
  const beforeState = matrixStateSnapshot(state);
  const runId = randomUUID();
  const containerName = `kyw-task0026-matrix-${runId.replaceAll("-", "")}`;
  const environment = isolatedEnvironment(state);
  const result = runProcess(
    docker.command,
    [
      ...(docker.prefixArgs ?? []),
      ...dockerSandboxArgs({
        state,
        repository: state.repository,
        packageRoot,
        runtimeRoot: runtime.root,
        auth,
        environment,
        containerName,
        runId,
        entrypoint,
      }),
      ...args,
    ],
    {
      cwd: state.repository,
      env: dockerHostEnvironment(state),
      timeout,
      maxBuffer: 30 * 1024 * 1024,
    },
  );
  const cleanup = removeOwnedContainer({
    docker,
    environment: dockerHostEnvironment(state),
    containerName,
    runId,
  });
  const actualFixture = mutationManifest(beforeFixture, snapshotTree(state.repository));
  const actualState = mutationManifest(beforeState, matrixStateSnapshot(state));
  const verification = verify(result);
  const statusMatches =
    expectedStatus === "nonzero" ? result.status !== 0 : result.status === expectedStatus;
  const pass =
    statusMatches &&
    !result.error &&
    exactManifest(expectedFixture, actualFixture) &&
    exactManifest(expectedState, actualState) &&
    verification.pass === true &&
    cleanup.removed === true;
  return Object.freeze({
    label,
    hostLauncher: docker.command,
    containerLauncher: entrypoint,
    command: Object.freeze([entrypoint, ...args]),
    expectedStatus,
    status: result.status,
    signal: result.signal,
    error: result.error?.code ?? null,
    stdoutSha256: sha256(normalizeText(result.stdout)),
    stderrSha256: sha256(normalizeText(result.stderr)),
    expectedMutationManifest: Object.freeze({
      fixture: Object.freeze(expectedFixture),
      state: Object.freeze(expectedState),
    }),
    actualMutationManifest: Object.freeze({
      fixture: Object.freeze(actualFixture),
      state: Object.freeze(actualState),
    }),
    verification,
    containerRemoved: cleanup.removed,
    pass,
  });
}

function nestedVersionSource(command, args) {
  return [
    'import { spawnSync } from "node:child_process";',
    'import { readlinkSync } from "node:fs";',
    `const command = ${JSON.stringify(command)};`,
    `const args = ${JSON.stringify(args)};`,
    'const child = spawnSync(command, args, { cwd: "/workspace", env: process.env, encoding: "utf8" });',
    'const record = { parentExecutable: readlinkSync(`/proc/${process.pid}/exe`), parentPid: process.pid, child: { command, args, status: child.status, signal: child.signal, error: child.error?.code ?? null, stdout: child.stdout, stderr: child.stderr } };',
    'process.stdout.write(`${JSON.stringify(record)}\\n`);',
    'if (child.status !== 0 || child.error) process.exitCode = 1;',
  ].join("\n");
}

function versionVerification(pattern, nested = false) {
  return (result) => {
    if (!nested) {
      return Object.freeze({ pass: pattern.test(normalizeText(result.stdout)) });
    }
    const parsed = parseSingleJson(result.stdout);
    return Object.freeze({
      pass:
        parsed?.parentExecutable === "/usr/local/bin/node" &&
        parsed?.child?.status === 0 &&
        parsed?.child?.error === null &&
        pattern.test(normalizeText(parsed?.child?.stdout)),
      parentExecutable: parsed?.parentExecutable,
      childStatus: parsed?.child?.status,
      childError: parsed?.child?.error,
    });
  };
}

async function runDockerTopologyMatrix({ docker, runtime, authFile, cohortRoot }) {
  const state = createScenarioState(cohortRoot, "topology");
  const environment = isolatedEnvironment(state);
  const rows = [];
  let auth;
  let installed;
  let report;
  let stateCleanup;
  try {
    installed = materializeCapabilityRepository(state, REPOSITORY_ROOT, environment);
    auth = copyAuthentication(authFile, state.codexHome);
    const fixtureBefore = snapshotTree(state.repository);
    const gitBefore = snapshotTreeMetadata(join(state.repository, ".git"), {
      excludeNames: new Set(),
    });
    const packedBefore = snapshotTreeMetadata(join(state.repository, ".agents"), {
      excludeNames: new Set(),
    });
    const sourceBefore = snapshotListedFiles(REPOSITORY_ROOT);
    const authBefore = sha256File(auth.source);

    for (const [label, entrypoint, args, pattern] of [
      ["direct-posix-shell", "/bin/sh", ["-c", "printf 'shell-ok\\n'"], /^shell-ok\n$/],
      ["direct-bash-shell", "/bin/bash", ["--version"], /^GNU bash/m],
      ["direct-git-version", "/usr/bin/git", ["--version"], /^git version /m],
      ["direct-node-version", "/usr/local/bin/node", ["--version"], /^v\d+/m],
      ["direct-npm-version", "/usr/local/bin/npm", ["--version"], /^\d+\.\d+/m],
      ["direct-tar-version", "/usr/bin/tar", ["--version"], /^tar \(GNU tar\)/m],
    ]) {
      rows.push(
        matrixDockerRow({
          label,
          docker,
          state,
          packageRoot: REPOSITORY_ROOT,
          runtime,
          auth,
          entrypoint,
          args,
          verify: versionVerification(pattern),
        }),
      );
    }

    for (const [label, command, args, pattern] of [
      ["node-to-git-version", "/usr/bin/git", ["--version"], /^git version /m],
      ["node-to-node-version", "/usr/local/bin/node", ["--version"], /^v\d+/m],
      ["node-to-npm-version", "/usr/local/bin/npm", ["--version"], /^\d+\.\d+/m],
      ["node-to-tar-version", "/usr/bin/tar", ["--version"], /^tar \(GNU tar\)/m],
    ]) {
      rows.push(
        matrixDockerRow({
          label,
          docker,
          state,
          packageRoot: REPOSITORY_ROOT,
          runtime,
          auth,
          entrypoint: "/usr/local/bin/node",
          args: ["--input-type=module", "-e", nestedVersionSource(command, args)],
          verify: versionVerification(pattern, true),
        }),
      );
    }

    const mutationSource = [
      'import { rmSync, writeFileSync } from "node:fs";',
      'writeFileSync("probe-created.txt", "created\\n", "utf8");',
      'writeFileSync("probe-modify.txt", "modified\\n", "utf8");',
      'rmSync("probe-delete.txt");',
    ].join("\n");
    rows.push(
      matrixDockerRow({
        label: "fixture-create-modify-delete",
        docker,
        state,
        packageRoot: REPOSITORY_ROOT,
        runtime,
        auth,
        entrypoint: "/usr/local/bin/node",
        args: ["--input-type=module", "-e", mutationSource],
        expectedFixture: [
          { path: "probe-created.txt", kind: "added", afterSha256: sha256("created\n") },
          { path: "probe-delete.txt", kind: "deleted", beforeSha256: sha256("delete-me\n") },
          {
            path: "probe-modify.txt",
            kind: "modified",
            beforeSha256: sha256("original\n"),
            afterSha256: sha256("modified\n"),
          },
        ],
      }),
    );

    const gitInspectionSource = nestedVersionSource("/usr/bin/git", [
      "status",
      "--short",
    ]).replace(
      'const command = "/usr/bin/git";',
      'const command = "/usr/bin/git";',
    );
    rows.push(
      matrixDockerRow({
        label: "fixture-git-status",
        docker,
        state,
        packageRoot: REPOSITORY_ROOT,
        runtime,
        auth,
        entrypoint: "/usr/local/bin/node",
        args: ["--input-type=module", "-e", gitInspectionSource],
        verify: (result) => {
          const parsed = parseSingleJson(result.stdout);
          const output = normalizeText(parsed?.child?.stdout);
          return Object.freeze({
            pass:
              parsed?.child?.status === 0 &&
              output.includes("?? probe-created.txt") &&
              output.includes(" D probe-delete.txt") &&
              output.includes(" M probe-modify.txt"),
          });
        },
      }),
    );
    for (const [label, args, pattern] of [
      ["fixture-git-diff", ["diff", "--stat"], /probe-(?:delete|modify)\.txt/],
      ["fixture-git-rev-parse", ["rev-parse", "HEAD"], /^[0-9a-f]{40}\n$/],
    ]) {
      rows.push(
        matrixDockerRow({
          label,
          docker,
          state,
          packageRoot: REPOSITORY_ROOT,
          runtime,
          auth,
          entrypoint: "/usr/bin/git",
          args,
          verify: versionVerification(pattern),
        }),
      );
    }

    rows.push(
      matrixDockerRow({
        label: "packed-task-adapter-validate",
        docker,
        state,
        packageRoot: REPOSITORY_ROOT,
        runtime,
        auth,
        entrypoint: "/usr/local/bin/node",
        args: [
          ".agents/skills/kyw-task/scripts/task-artifacts.mjs",
          "validate",
          "--task-directory",
          "docs/tasks/0001-greeting-style",
        ],
        verify: versionVerification(/"valid": true/),
      }),
    );

    const authReadSource = [
      'import { createHash } from "node:crypto";',
      'import { readFileSync } from "node:fs";',
      'process.stdout.write(`${createHash("sha256").update(readFileSync("/state/codex-home/auth.json")).digest("hex")}\\n`);',
    ].join("\n");
    rows.push(
      matrixDockerRow({
        label: "isolated-auth-copy-read",
        docker,
        state,
        packageRoot: REPOSITORY_ROOT,
        runtime,
        auth,
        entrypoint: "/usr/local/bin/node",
        args: ["--input-type=module", "-e", authReadSource],
        verify: versionVerification(new RegExp(`^${auth.beforeSha256}\\n$`)),
      }),
    );

    for (const [label, args, pattern] of [
      ["codex-version", ["--version"], /^codex-cli \d+\.\d+\.\d+/m],
      [
        "codex-exec-help",
        [
          "exec",
          "--cd",
          CONTAINER_WORKSPACE,
          ...codexCommonArgs("/state/control/help-last-message.txt"),
          "--help",
        ],
        /externally sandboxed/,
      ],
      [
        "codex-resume-help",
        [
          "exec",
          "resume",
          ...codexCommonArgs("/state/control/help-resume-last-message.txt"),
          "--help",
        ],
        /externally sandboxed/,
      ],
    ]) {
      rows.push(
        matrixDockerRow({
          label,
          docker,
          state,
          packageRoot: REPOSITORY_ROOT,
          runtime,
          auth,
          entrypoint: CONTAINER_CODEX,
          args,
          verify: versionVerification(pattern),
        }),
      );
    }

    const stateWriteSource = [
      'import { writeFileSync } from "node:fs";',
      'writeFileSync("/state/home/topology-home.txt", "home\\n");',
      'writeFileSync("/state/tool-codex-home/topology-codex.txt", "codex\\n");',
      'writeFileSync("/state/temp/topology-temp.txt", "temp\\n");',
    ].join("\n");
    rows.push(
      matrixDockerRow({
        label: "scenario-owned-state-write",
        docker,
        state,
        packageRoot: REPOSITORY_ROOT,
        runtime,
        auth,
        entrypoint: "/usr/local/bin/node",
        args: ["--input-type=module", "-e", stateWriteSource],
        expectedState: [
          { path: "home/topology-home.txt", kind: "added", afterSha256: sha256("home\n") },
          {
            path: "process-temp/topology-temp.txt",
            kind: "added",
            afterSha256: sha256("temp\n"),
          },
          {
            path: "tool-codex-home/topology-codex.txt",
            kind: "added",
            afterSha256: sha256("codex\n"),
          },
        ],
      }),
    );

    for (const [label, target] of [
      ["source-checkout-write-denial", "/protected/source-checkout/task-0026-forbidden"],
      ["packed-skill-write-denial", "/workspace/.agents/skills/kyw-task/SKILL.md"],
      ["fixture-git-write-denial", "/workspace/.git/task-0026-forbidden"],
      ["authentication-source-write-denial", CONTAINER_AUTH_SOURCE],
    ]) {
      const denialSource = [
        'import { appendFileSync, writeFileSync } from "node:fs";',
        `const target = ${JSON.stringify(target)};`,
        'if (target.endsWith("SKILL.md") || target.endsWith("auth.json")) appendFileSync(target, "forbidden\\n");',
        'else writeFileSync(target, "forbidden\\n");',
      ].join("\n");
      rows.push(
        matrixDockerRow({
          label,
          docker,
          state,
          packageRoot: REPOSITORY_ROOT,
          runtime,
          auth,
          entrypoint: "/usr/local/bin/node",
          args: ["--input-type=module", "-e", denialSource],
          expectedStatus: "nonzero",
          verify: (result) =>
            Object.freeze({ pass: /EROFS|Read-only file system/i.test(normalizeText(result.stderr)) }),
        }),
      );
    }

    const fixtureAfter = snapshotTree(state.repository);
    const gitAfter = snapshotTreeMetadata(join(state.repository, ".git"), {
      excludeNames: new Set(),
    });
    const packedAfter = snapshotTreeMetadata(join(state.repository, ".agents"), {
      excludeNames: new Set(),
    });
    const sourceAfter = snapshotListedFiles(REPOSITORY_ROOT);
    const authAfter = sha256File(auth.source);
    report = {
      schemaVersion: 1,
      status: "COMPLETE",
      boundarySha256: sha256(JSON.stringify(DOCKER_BOUNDARY_CONTRACT)),
      processTree: {
        host: `${process.execPath} -> ${docker.command}`,
        sandbox: "Docker Desktop Linux engine -> runc container",
        direct: `${docker.command} -> <container launcher as PID 1>`,
        nested: `${docker.command} -> /usr/local/bin/node (PID 1) -> exact child executable`,
        model:
          `${docker.command} -> ${CONTAINER_CODEX} (PID 1) -> Codex shell -> exact workflow executable`,
      },
      runtime: {
        version: runtime.version,
        binarySha256: runtime.binarySha256,
        treeSha256: runtime.treeSha256,
        image: runtime.image,
      },
      rows,
      protected: {
        sourceCheckoutBefore: sourceBefore.sha256,
        sourceCheckoutAfter: sourceAfter.sha256,
        sourceCheckoutUnchanged: sourceBefore.sha256 === sourceAfter.sha256,
        installedPackedBefore: packedBefore.sha256,
        installedPackedAfter: packedAfter.sha256,
        installedPackedUnchanged: packedBefore.sha256 === packedAfter.sha256,
        gitBefore: gitBefore.sha256,
        gitAfter: gitAfter.sha256,
        gitUnchanged: gitBefore.sha256 === gitAfter.sha256,
        authBefore,
        authAfter,
        authUnchanged: authBefore === authAfter,
      },
      fixtureInitialTreeSha256: fixtureBefore.sha256,
      fixtureFinalTreeSha256: fixtureAfter.sha256,
      installedPackedFilesCompared: installed.length,
      cleanup: { rootRemoved: false, authCopyRemoved: false },
    };
  } finally {
    stateCleanup = clearContainerOwnedState({ docker, state });
    defaultRemoveOwnedPath(state.root, { recursive: true, force: true });
  }
  report.cleanup = {
    rootRemoved: !existsSync(state.root),
    authCopyRemoved: !existsSync(auth?.destination ?? join(state.codexHome, "auth.json")),
  };
  report.rows.push({
    label: "complete-cleanup",
    hostLauncher: docker.command,
    containerLauncher: "/usr/local/bin/node",
    command: Object.freeze(["clear-container-owned-state", "remove-owned-topology-root"]),
    expectedStatus: 0,
    status: report.cleanup.rootRemoved && report.cleanup.authCopyRemoved ? 0 : 1,
    signal: null,
    error: null,
    stdoutSha256: stateCleanup.stdoutSha256,
    stderrSha256: stateCleanup.stderrSha256,
    expectedMutationManifest: { ownedRoot: "removed", fixture: [], state: [] },
    actualMutationManifest: {
      ownedRoot: report.cleanup.rootRemoved ? "removed" : "present",
      fixture: [],
      state: [],
    },
    verification: { pass: report.cleanup.rootRemoved && report.cleanup.authCopyRemoved },
    containerRemoved: true,
    pass: report.cleanup.rootRemoved && report.cleanup.authCopyRemoved,
  });
  report.pass =
    report.rows.every((row) => row.pass === true) &&
    report.protected.sourceCheckoutUnchanged &&
    report.protected.installedPackedUnchanged &&
    report.protected.gitUnchanged &&
    report.protected.authUnchanged &&
    report.cleanup.rootRemoved &&
    report.cleanup.authCopyRemoved;
  return Object.freeze(report);
}

function frozenContractManifest(runtime) {
  const harnessPath = fileURLToPath(import.meta.url);
  const focusedTestPath = join(REPOSITORY_ROOT, "test", "spec-behavioral-e2e.test.mjs");
  const fixtures = snapshotTreeMetadata(FIXTURE_ROOT, { excludeNames: new Set() });
  const productFiles = Object.fromEntries(
    [...EXPECTED_TARBALL_FILES]
      .sort()
      .map((relativePath) => [
        relativePath,
        sha256File(join(REPOSITORY_ROOT, ...relativePath.split("/"))),
      ]),
  );
  const scenarioDefinitions = Object.fromEntries(
    SCENARIOS.map((scenario) => [scenario.id, sha256(JSON.stringify(scenario))]),
  );
  const expectedMutations = Object.fromEntries(
    SCENARIOS.map((scenario) => [scenario.id, expectedMutationSet(scenario.id)]),
  );
  const core = {
    harnessSha256: sha256File(harnessPath),
    focusedTestSha256: sha256File(focusedTestPath),
    dockerBoundarySha256: sha256(JSON.stringify(DOCKER_BOUNDARY_CONTRACT)),
    dockerBoundary: DOCKER_BOUNDARY_CONTRACT,
    capabilityPromptSha256: sha256(CAPABILITY_PROMPT),
    capabilityPromptBytes: Buffer.byteLength(CAPABILITY_PROMPT),
    scenarioDefinitions,
    fixtures: { sha256: fixtures.sha256, files: fixtures.files },
    productFiles,
    expectedMutations,
    expectedAndForbiddenLogicSha256: sha256(
      [expectedMutationCheck, expectedMutationSet, permanentDocsUnchanged]
        .map((candidate) => candidate.toString())
        .join("\n"),
    ),
    matcherLogicSha256: sha256(
      [
        packedSourceReadCount,
        questionCount,
        recommendationCount,
        coverageGapClaim,
        documentationImpactClaim,
      ]
        .map((candidate) => candidate.toString())
        .join("\n"),
    ),
    scenarioValidatorSha256: sha256(
      [validateScenarioEvidence, scenarioVerdict, validateCohort]
        .map((candidate) => candidate.toString())
        .join("\n"),
    ),
    reportValidatorsSha256: sha256(
      [validateEvidenceReport, validateCapabilityEvidence]
        .map((candidate) => candidate.toString())
        .join("\n"),
    ),
    cleanupLogicSha256: sha256(
      [removeOwnedContainer, runScenario, defaultRemoveOwnedPath]
        .map((candidate) => candidate.toString())
        .join("\n"),
    ),
    runtime: {
      version: runtime.version,
      binarySha256: runtime.binarySha256,
      treeSha256: runtime.treeSha256,
      files: runtime.files,
      image: runtime.image,
    },
  };
  return Object.freeze({ ...core, manifestSha256: sha256(JSON.stringify(core)) });
}

function assertFrozenContract(expected, runtime) {
  const actual = frozenContractManifest(runtime);
  if (actual.manifestSha256 !== expected.manifestSha256) {
    fail("FROZEN_CONTRACT_CHANGED", "A frozen harness, prompt, fixture, matcher, or boundary changed");
  }
  return actual;
}

function completedToolCommands(events) {
  return events
    .filter(
      (event) =>
        event?.type === "item.completed" && event?.item?.type === "command_execution",
    )
    .map((event) => event.item);
}

function modelCommandProof(commands, commandPattern, outputPattern) {
  return commands.some(
    (command) =>
      commandPattern.test(String(command.command ?? "")) &&
      outputPattern.test(normalizeText(command.aggregated_output)),
  );
}

function modelDenialProof(commands, target) {
  return commands.some(
    (command) =>
      String(command.command ?? "").includes(target) &&
      /EROFS|Read-only file system|read-only file system/i.test(
        normalizeText(command.aggregated_output),
      ),
  );
}

async function runModelCapabilityProbe({
  docker,
  runtime,
  authFile,
  capabilityRoot,
  cohortRoot,
}) {
  const state = createScenarioState(cohortRoot, "model-capability");
  const scope = createEvaluatorRunScope();
  const environment = isolatedEnvironment(state);
  let auth;
  let record;
  let sanitizedEvents;
  let sanitizedFinalMessage;
  let primaryError;
  try {
    const installed = materializeCapabilityRepository(state, REPOSITORY_ROOT, environment);
    auth = copyAuthentication(authFile, state.codexHome);
    const before = snapshotTree(state.repository);
    const gitBefore = snapshotTreeMetadata(join(state.repository, ".git"), {
      excludeNames: new Set(),
    });
    const packedBefore = snapshotTreeMetadata(join(state.repository, ".agents"), {
      excludeNames: new Set(),
    });
    const sourceBefore = snapshotListedFiles(REPOSITORY_ROOT);
    const authBefore = sha256File(auth.source);
    const authCopyBefore = sha256File(auth.destination);
    const runtimeBefore = snapshotTreeMetadata(runtime.root, { excludeNames: new Set() });
    const lastMessagePath = join(state.control, "last-message.txt");
    const startedAt = new Date().toISOString();
    const startedMilliseconds = Date.now();
    const result = await invokeCodexTurn({
      docker,
      state,
      environment,
      repository: state.repository,
      packageRoot: REPOSITORY_ROOT,
      runtimeRoot: runtime.root,
      auth,
      prompt: CAPABILITY_PROMPT,
      threadId: undefined,
      lastMessagePath,
      timeout: 360_000,
      runChild: scope.runChild,
    });
    if (result.status !== 0) throw classifyCodexFailure(result);
    const parsed = parseJsonl(result.stdout);
    const finalMessage = existsSync(lastMessagePath)
      ? readFileSync(lastMessagePath, "utf8")
      : parsed.agentMessages.at(-1);
    if (!finalMessage?.trim()) fail("INVALID_CODEX_OUTPUT", "Capability probe returned no final message");
    rmSync(lastMessagePath, { force: true });
    const commands = completedToolCommands(parsed.events);
    const after = snapshotTree(state.repository);
    const manifest = mutationManifest(before, after);
    const gitAfter = snapshotTreeMetadata(join(state.repository, ".git"), {
      excludeNames: new Set(),
    });
    const packedAfter = snapshotTreeMetadata(join(state.repository, ".agents"), {
      excludeNames: new Set(),
    });
    const sourceAfter = snapshotListedFiles(REPOSITORY_ROOT);
    const authAfter = sha256File(auth.source);
    const authCopyAfter = sha256File(auth.destination);
    const runtimeAfter = snapshotTreeMetadata(runtime.root, { excludeNames: new Set() });
    const expectedManifest = [
      { path: "probe-created.txt", kind: "added", afterSha256: sha256("created\n") },
      { path: "probe-delete.txt", kind: "deleted", beforeSha256: sha256("delete-me\n") },
      {
        path: "probe-modify.txt",
        kind: "modified",
        beforeSha256: sha256("original\n"),
        afterSha256: sha256("modified\n"),
      },
    ];
    const checks = {
      gitVersion: modelCommandProof(commands, /\bgit\s+--version\b/, /git version /),
      nodeVersion: modelCommandProof(commands, /\bnode\s+--version\b/, /v\d+\.\d+/),
      npmVersion: modelCommandProof(commands, /\bnpm\s+--version\b/, /\b\d+\.\d+\.\d+\b/),
      tarVersion: modelCommandProof(commands, /\btar\s+--version\b/, /GNU tar/),
      gitStatus: modelCommandProof(commands, /\bgit\s+status\s+--short\b/, /(?:^|\n|$)/),
      nodeTest: modelCommandProof(
        commands,
        /\bnode\s+--test\s+(?:\.\/)?test\/probe\.test\.mjs\b/,
        /(?:pass|tests?\s+1)/i,
      ),
      gitWriteDenied: modelDenialProof(commands, "/workspace/.git/task-0026-forbidden"),
      packedWriteDenied: modelDenialProof(
        commands,
        "/workspace/.agents/skills/kyw-task/SKILL.md",
      ),
      sourceWriteDenied: modelDenialProof(
        commands,
        "/protected/source-checkout/task-0026-forbidden",
      ),
      authWriteDenied: modelDenialProof(commands, CONTAINER_AUTH_SOURCE),
      homeWrite:
        existsSync(join(state.home, "probe-home.txt")) &&
        readFileSync(join(state.home, "probe-home.txt"), "utf8") === "home\n",
      codexHomeWrite:
        existsSync(join(state.toolCodexHome, "probe-codex-home.txt")) &&
        readFileSync(join(state.toolCodexHome, "probe-codex-home.txt"), "utf8") === "codex\n",
      tempWrite:
        existsSync(join(state.processTemp, "probe-temp.txt")) &&
        readFileSync(join(state.processTemp, "probe-temp.txt"), "utf8") === "temp\n",
      exactMutationManifest: exactManifest(expectedManifest, manifest),
      gitUnchanged: gitBefore.sha256 === gitAfter.sha256,
      packedUnchanged: packedBefore.sha256 === packedAfter.sha256,
      sourceUnchanged: sourceBefore.sha256 === sourceAfter.sha256,
      authSourceUnchanged: authBefore === authAfter,
      runtimeUnchanged: runtimeBefore.sha256 === runtimeAfter.sha256,
      noUnexpectedMutation: exactManifest(expectedManifest, manifest),
    };
    const pathReplacements = [
      [state.root, "<CAPABILITY_ROOT>"],
      [state.repository, "<CAPABILITY_REPOSITORY>"],
      [state.home, "<ISOLATED_HOME>"],
      [state.codexHome, "<ISOLATED_CODEX_HOME>"],
      [state.toolCodexHome, "<ISOLATED_TOOL_CODEX_HOME>"],
      [state.npmRoot, "<ISOLATED_NPM>"],
      [auth.source, "<AUTH_SOURCE>"],
      [runtime.root, "<CODEX_RUNTIME>"],
      [REPOSITORY_ROOT, "<SOURCE_CHECKOUT>"],
    ];
    const redactionContext = { pathReplacements, threadIds: [parsed.threadId] };
    sanitizedEvents = parsed.events.map((event) => redactValue(event, redactionContext));
    sanitizedFinalMessage = redactString(finalMessage, redactionContext);
    const serializedEvents = `${sanitizedEvents.map((event) => JSON.stringify(event)).join("\n")}\n`;
    const findings = [
      ...sensitiveFindings(serializedEvents, redactionContext),
      ...sensitiveFindings(sanitizedFinalMessage, redactionContext),
      ...rawLeakFindings(`${result.stdout}\n${result.stderr}\n${finalMessage}`, auth),
    ];
    const finalReported =
      /(?:git|node|npm|tar)/i.test(finalMessage) &&
      /(?:creat|modif|delet)/i.test(finalMessage) &&
      /(?:denied|reject|read-only|failed)/i.test(finalMessage);
    checks.finalReported = finalReported;
    const packedSkillCommands = commands.filter((command) =>
      String(command.command ?? "").includes("/workspace/.agents/skills/"),
    );
    checks.noKywSkillInvocation =
      packedSkillCommands.every(
        (command) =>
          String(command.command ?? "").includes(
            "/workspace/.agents/skills/kyw-task/SKILL.md",
          ) &&
          /EROFS|Read-only file system|read-only file system/i.test(
            normalizeText(command.aggregated_output),
          ),
      ) && !/\$kyw-(?:init|task|audit|grilling)\b/i.test(finalMessage);
    checks.noProductAcceptanceAssertion =
      !/(?:SPEC(?:\s+AC-0[4-8])?|AC-0[4-8])[^\n.]{0,80}(?:PASS|PASSED|proven)/i.test(
        finalMessage,
      );
    const pass = Object.values(checks).every(Boolean) && findings.length === 0;
    record = {
      schemaVersion: 1,
      kind: "HARNESS_CAPABILITY_ONLY",
      status: pass ? "PASSED" : "BLOCKED",
      verdict: pass ? "PASS" : "FAIL",
      model: REQUIRED_MODEL,
      reasoningEffort: REQUIRED_REASONING_EFFORT,
      codexVersion: runtime.version,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMilliseconds,
      modelCallCount: 1,
      threadIdentityHash: sha256(parsed.threadId),
      processExit: { status: result.status, signal: result.signal },
      promptSha256: sha256(CAPABILITY_PROMPT),
      expectedMutationManifest: expectedManifest,
      mutationManifest: manifest,
      checks,
      protected: {
        gitBefore: gitBefore.sha256,
        gitAfter: gitAfter.sha256,
        packedBefore: packedBefore.sha256,
        packedAfter: packedAfter.sha256,
        sourceBefore: sourceBefore.sha256,
        sourceAfter: sourceAfter.sha256,
        authBefore,
        authAfter,
        authCopyBefore,
        authCopyAfter,
        runtimeBefore: runtimeBefore.sha256,
        runtimeAfter: runtimeAfter.sha256,
      },
      installedPackedFilesCompared: installed.length,
      finalMessageSha256: sha256(`${sanitizedFinalMessage.trimEnd()}\n`),
      sanitizedEventsSha256: sha256(serializedEvents),
      sensitiveFindings: [...new Set(findings)].sort(),
      cleanup: { rootRemoved: false, authCopyRemoved: false, containerRemoved: true },
    };
  } catch (error) {
    primaryError = error;
    scope.claimFailure();
  }

  const finalState = await scope.finalize(async () => {
    const failures = [];
    try {
      clearContainerOwnedState({ docker, state });
      defaultRemoveOwnedPath(state.root, { recursive: true, force: true });
    } catch (error) {
      failures.push(
        cleanupFailureDiagnostic({ operation: "remove-tree", pathLabel: "model-capability-root", error }),
      );
    }
    return failures;
  });
  if (primaryError) {
    appendEvaluatorDiagnostics(primaryError, finalState.diagnostics);
    throw primaryError;
  }
  if (finalState.diagnostics.length > 0) {
    fail("CAPABILITY_CLEANUP_FAILED", "Model capability cleanup failed");
  }
  record.cleanup = {
    rootRemoved: !existsSync(state.root),
    authCopyRemoved: !existsSync(auth.destination),
    containerRemoved: true,
  };
  if (!Object.values(record.cleanup).every(Boolean)) {
    record.status = "BLOCKED";
    record.verdict = "FAIL";
  }
  const modelRoot = join(capabilityRoot, "model");
  mkdirSync(modelRoot);
  const serializedEvents = `${sanitizedEvents.map((event) => JSON.stringify(event)).join("\n")}\n`;
  writeFileSync(join(modelRoot, "events.jsonl"), serializedEvents, "utf8");
  writeFileSync(
    join(modelRoot, "final-message.txt"),
    `${sanitizedFinalMessage.trimEnd()}\n`,
    "utf8",
  );
  writeJsonAtomic(join(modelRoot, "summary.json"), record);
  return Object.freeze(record);
}

export function validateCapabilityEvidence(capabilityRoot) {
  const resolvedRoot = realpathSync(resolve(capabilityRoot));
  const topologyPath = join(resolvedRoot, "topology-report.json");
  const freezePath = join(resolvedRoot, "freeze-manifest.json");
  const reportPath = join(resolvedRoot, "capability-report.json");
  const summaryPath = join(resolvedRoot, "model", "summary.json");
  const eventsPath = join(resolvedRoot, "model", "events.jsonl");
  const messagePath = join(resolvedRoot, "model", "final-message.txt");
  for (const required of [topologyPath, freezePath, reportPath, summaryPath, eventsPath, messagePath]) {
    if (!existsSync(required) || !statSync(required).isFile()) {
      fail("CAPABILITY_REPORT_INVALID", "Capability evidence is incomplete");
    }
  }
  const topology = JSON.parse(readFileSync(topologyPath, "utf8"));
  const freeze = JSON.parse(readFileSync(freezePath, "utf8"));
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const errors = [];
  if (topology.pass !== true || !topology.rows?.every((row) => row.pass === true)) {
    errors.push("deterministic topology did not pass");
  }
  if (report.modelCallCount !== 1 || summary.modelCallCount !== 1) {
    errors.push("model capability call count differs from one");
  }
  if (report.verdict !== "PASS" || summary.verdict !== "PASS") {
    errors.push("model capability verdict is not PASS");
  }
  if (!Object.values(summary.checks ?? {}).every(Boolean)) {
    errors.push("one or more model capability checks failed");
  }
  if (!Object.values(summary.cleanup ?? {}).every(Boolean)) {
    errors.push("model capability cleanup is incomplete");
  }
  if ((summary.sensitiveFindings ?? []).length > 0) {
    errors.push("model capability evidence contains a sensitive finding");
  }
  if (sha256(readFileSync(eventsPath)) !== summary.sanitizedEventsSha256) {
    errors.push("model capability event hash differs");
  }
  if (sha256(readFileSync(messagePath)) !== summary.finalMessageSha256) {
    errors.push("model capability final-message hash differs");
  }
  if (report.freezeManifestSha256 !== freeze.manifestSha256) {
    errors.push("frozen manifest attribution differs");
  }
  if (report.topologyReportSha256 !== sha256(readFileSync(topologyPath))) {
    errors.push("topology report attribution differs");
  }
  if (report.modelSummarySha256 !== sha256(readFileSync(summaryPath))) {
    errors.push("model summary attribution differs");
  }
  if (errors.length > 0) fail("CAPABILITY_REPORT_INVALID", errors.join("; "));
  return Object.freeze({
    valid: true,
    verdict: "PASS",
    modelCallCount: 1,
    reportSha256: sha256(readFileSync(reportPath)),
    artifactTreeSha256: artifactTreeSha256(resolvedRoot),
  });
}

function fixtureGapProof(repository) {
  const source = readFileSync(join(repository, "src", "greeting.mjs"), "utf8");
  const test = readFileSync(join(repository, "test", "greeting.test.mjs"), "utf8");
  return Object.freeze({
    sourceHasFormalBranch: source.includes("acceptance-branch: formal"),
    sourceHasCasualBranch: source.includes("acceptance-branch: casual"),
    testExercisesFormal: test.includes('"formal"'),
    testExercisesCasual: /"casual"|Hi, Ada/.test(test),
    intentionalGapProven:
      source.includes("acceptance-branch: formal") &&
      source.includes("acceptance-branch: casual") &&
      test.includes('"formal"') &&
      !/"casual"|Hi, Ada/.test(test),
  });
}

function preservationBlock(readme) {
  const match = /<!-- KYW-PRESERVE-BEGIN -->[\s\S]*?<!-- KYW-PRESERVE-END -->/.exec(readme);
  return match?.[0];
}

function pathSet(manifest) {
  return manifest.map(({ path: relativePath }) => relativePath).sort();
}

function setEquals(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function taskDirectories(repository) {
  const tasksRoot = join(repository, "docs", "tasks");
  if (!existsSync(tasksRoot)) return [];
  return readdirSync(tasksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function unsupportedTerminalClaim(message, taskMarkdown, testMarkdown) {
  return (
    TASK_STATUS_DONE.test(taskMarkdown ?? "") ||
    TEST_STATUS_PASSED.test(testMarkdown ?? "") ||
    /\b(?:Task|work)\s+(?:is|was|has been)\s+(?:DONE|complete(?:d)?)\b/i.test(message) ||
    /\b(?:mark(?:ed)?|status)\s+(?:the\s+)?(?:Task|Test)?\s*(?:as|:)\s*(?:DONE|PASSED)\b/i.test(
      message,
    )
  );
}

export function coverageGapClaim(message) {
  return (
    /casual/i.test(message) &&
    /(?:uncovered|untested|not covered|coverage gap|lacks?[^.\n]{0,80}coverage)/i.test(message)
  );
}

export function documentationImpactClaim(message) {
  return /(?:documentation|permanent-document) impact/i.test(message);
}

function expectedMutationCheck(id, manifest, details = {}) {
  const paths = pathSet(manifest);
  if (id === "S-01" || id === "S-02") {
    return setEquals(paths, PERMANENT_DOCUMENTS);
  }
  if (id === "S-03") {
    return (
      paths.length === 2 &&
      paths.every((relativePath) =>
        /^docs\/tasks\/0004-[a-z0-9-]+\/(?:TASK|TEST)\.md$/.test(relativePath),
      )
    );
  }
  if (id === "S-04") return paths.length === 0;
  if (id === "S-05") {
    return (
      paths.length > 0 &&
      paths.every((relativePath) =>
        /^docs\/tasks\/0001-greeting-style\/(?:TASK|TEST)\.md$/.test(relativePath),
      )
    );
  }
  if (id === "S-06") {
    return setEquals(paths, ["README.md", "src/greeting.mjs", "test/greeting.test.mjs"]);
  }
  return false;
}

function expectedMutationSet(id) {
  if (id === "S-01" || id === "S-02") return [...PERMANENT_DOCUMENTS];
  if (id === "S-03") {
    return [
      "docs/tasks/0004-<allocated-slug>/TASK.md",
      "docs/tasks/0004-<allocated-slug>/TEST.md",
    ];
  }
  if (id === "S-04") return [];
  if (id === "S-05") {
    return [
      "docs/tasks/0001-greeting-style/TASK.md and/or TEST.md evidence only",
    ];
  }
  return ["README.md", "src/greeting.mjs", "test/greeting.test.mjs"];
}

function permanentDocsUnchanged(before, snapshot) {
  const beforeFiles = new Map(before.files.map((entry) => [entry.path, entry.sha256]));
  const afterFiles = new Map(snapshot.files.map((entry) => [entry.path, entry.sha256]));
  return PERMANENT_DOCUMENTS.every(
    (relativePath) => beforeFiles.get(relativePath) === afterFiles.get(relativePath),
  );
}

function allRequiredReads(requiredReads, sourceReads) {
  const observed = new Map(sourceReads.map((entry) => [entry.path, entry]));
  return requiredReads.every((relativePath) => {
    const entry = observed.get(relativePath);
    return entry?.count > 0 && entry.exactPackedByteMatch;
  });
}

function scenarioChecks({
  scenario,
  repository,
  before,
  after,
  turnSnapshots,
  turns,
  sourceReads,
  deterministicCommands,
  gapProof,
  preservationSha256,
  manifest,
}) {
  const finalMessage = turns.at(-1)?.finalMessage ?? "";
  const questionCounts = turns.map((turn) => questionCount(turn.finalMessage));
  const recommendationCounts = turns.map((turn) =>
    recommendationCount(turn.finalMessage),
  );
  const whyCounts = turns.map((turn) => whyCount(turn.finalMessage));
  const checks = {
    packedSkillMatches: allRequiredReads(scenario.requiredReads, sourceReads),
    skillReadTotal: sourceReads.reduce((sum, entry) => sum + entry.count, 0),
    questionCounts,
    recommendationCounts,
    whyCounts,
    expectedMutationManifest: expectedMutationCheck(scenario.id, manifest),
    unexpectedMutations: expectedMutationCheck(scenario.id, manifest)
      ? []
      : pathSet(manifest),
    unsupportedTerminalClaim: false,
  };

  if (scenario.id === "S-01") {
    const taskDirs = taskDirectories(repository);
    checks.interviewProtocol =
      questionCounts[0] === 1 && recommendationCounts[0] === 1 && whyCounts[0] === 1;
    checks.confirmationRequested =
      /shared understanding|shared-understanding/i.test(turns[1]?.finalMessage ?? "") &&
      /confirm/i.test(turns[1]?.finalMessage ?? "");
    checks.preConfirmationDurableWrites = !(
      permanentDocsUnchanged(before, turnSnapshots[0]) &&
      permanentDocsUnchanged(before, turnSnapshots[1])
    );
    checks.documentsComplete = PERMANENT_DOCUMENTS.every((relativePath) =>
      existsSync(join(repository, ...relativePath.split("/"))),
    );
    checks.agentsThin =
      existsSync(join(repository, "AGENTS.md")) &&
      statSync(join(repository, "AGENTS.md")).size < 4096;
    checks.noTask = taskDirs.length === 0;
    checks.noApplication = !existsSync(join(repository, "src"));
    checks.sentinelPreserved =
      sha256(readFileSync(join(repository, "sentinel", "user-note.txt"))) ===
      new Map(before.files.map((entry) => [entry.path, entry.sha256])).get(
        "sentinel/user-note.txt",
      );
  }

  if (scenario.id === "S-02") {
    checks.interviewProtocol =
      questionCounts[0] === 1 && recommendationCounts[0] === 1 && whyCounts[0] === 1;
    checks.confirmationRequested =
      /shared understanding|shared-understanding/i.test(turns[1]?.finalMessage ?? "") &&
      /confirm/i.test(turns[1]?.finalMessage ?? "");
    checks.preConfirmationDurableWrites = !(
      permanentDocsUnchanged(before, turnSnapshots[0]) &&
      permanentDocsUnchanged(before, turnSnapshots[1])
    );
    checks.documentsComplete = PERMANENT_DOCUMENTS.every((relativePath) =>
      existsSync(join(repository, ...relativePath.split("/"))),
    );
    checks.adoptMode = /\badopt\b/i.test(turns.map((turn) => turn.finalMessage).join("\n"));
    checks.preservationSection =
      sha256(preservationBlock(readFileSync(join(repository, "README.md"), "utf8")) ?? "") ===
      preservationSha256;
    const beforeFiles = new Map(before.files.map((entry) => [entry.path, entry.sha256]));
    const afterFiles = new Map(after.files.map((entry) => [entry.path, entry.sha256]));
    checks.applicationPreserved = [
      "package.json",
      "src/greeting.mjs",
      "test/greeting.test.mjs",
    ].every((relativePath) => beforeFiles.get(relativePath) === afterFiles.get(relativePath));
    checks.noTask = taskDirectories(repository).length === 0;
  }

  if (scenario.id === "S-03") {
    const directories = taskDirectories(repository);
    const created = directories.filter((name) => name.startsWith("0004-"));
    const taskDirectory = created.length === 1 ? join(repository, "docs", "tasks", created[0]) : null;
    const taskMarkdown = taskDirectory ? readOptional(taskDirectory, "TASK.md") : undefined;
    const testMarkdown = taskDirectory ? readOptional(taskDirectory, "TEST.md") : undefined;
    checks.taskNumber = created.length === 1 ? "0004" : null;
    checks.singleTaskCreated = directories.length === 4 && created.length === 1;
    checks.pairComplete = Boolean(taskMarkdown && testMarkdown);
    checks.traceability =
      /AC-\d+/.test(taskMarkdown ?? "") &&
      /Intent-to-Test Matrix/.test(testMarkdown ?? "") &&
      /\|\s*T-\d+\s*\|/.test(testMarkdown ?? "");
    checks.confirmationRequired = /confirm/i.test(finalMessage) && /implementation/i.test(finalMessage);
    checks.applicationUnchanged = manifest.every(({ path: relativePath }) =>
      relativePath.startsWith("docs/tasks/0004-"),
    );
    checks.unsupportedTerminalClaim = unsupportedTerminalClaim(
      finalMessage,
      taskMarkdown,
      testMarkdown,
    );
    checks.createdTaskDirectory = created[0] ?? null;
  }

  if (scenario.id === "S-04") {
    const directories = taskDirectories(repository);
    const created = directories.filter((name) => name.startsWith("0004-"));
    const taskDirectory = created.length === 1 ? join(repository, "docs", "tasks", created[0]) : null;
    const taskMarkdown = taskDirectory ? readOptional(taskDirectory, "TASK.md") : undefined;
    const testMarkdown = taskDirectory ? readOptional(taskDirectory, "TEST.md") : undefined;
    checks.resumeAllocatedTask = directories.some((name) => name.startsWith("0005-"));
    checks.existingTaskPreserved = created.length === 1 && manifest.length === 0;
    checks.permanentDocsRead = PERMANENT_DOCUMENTS.every((relativePath) =>
      fileSourceWasRead(turns, repository, relativePath),
    );
    checks.taskPairRead = Boolean(
      taskDirectory &&
        fileSourceWasRead(
          turns,
          repository,
          `docs/tasks/${created[0]}/TASK.md`,
        ) &&
        fileSourceWasRead(
          turns,
          repository,
          `docs/tasks/${created[0]}/TEST.md`,
        ),
    );
    checks.gitStateRead =
      commandWasRun(turns, /git\s+.*status/i) && commandWasRun(turns, /git\s+.*diff/i);
    checks.handoffFieldsRead = ["Completed", "Remaining", "Resume Point"].every((field) =>
      finalMessage.includes(field),
    );
    checks.confirmationRequired = /confirm/i.test(finalMessage) && /DRAFT/i.test(finalMessage);
    checks.unsupportedTerminalClaim = unsupportedTerminalClaim(
      finalMessage,
      taskMarkdown,
      testMarkdown,
    );
  }

  if (scenario.id === "S-05") {
    const taskRoot = join(repository, "docs", "tasks", "0001-greeting-style");
    const taskMarkdown = readOptional(taskRoot, "TASK.md") ?? "";
    const testMarkdown = readOptional(taskRoot, "TEST.md") ?? "";
    checks.genericSuitePass = deterministicCommands.some(
      (command) => command.label === "S-05 generic suite precheck" && command.exitCode === 0,
    );
    checks.intentionalGapProven = gapProof?.intentionalGapProven === true;
    checks.diffInspected = commandWasRun(turns, /git\s+.*diff/i);
    checks.genericTestExecuted = commandWasRun(
      turns,
      /(?:npm(?:\.cmd)?\s+test|node(?:\.exe)?\s+--test)/i,
    );
    checks.gapDetected = coverageGapClaim(finalMessage);
    checks.gapRecorded =
      /casual/i.test(testMarkdown) &&
      (/\|\s*(?:FAIL|BLOCKED)\s*\|/.test(testMarkdown) ||
        /^## Status\s*\n\s*BLOCKED\s*$/im.test(testMarkdown) ||
        /^## Status\s*\n\s*BLOCKED\s*$/im.test(taskMarkdown));
    const beforeFiles = new Map(before.files.map((entry) => [entry.path, entry.sha256]));
    const afterFiles = new Map(after.files.map((entry) => [entry.path, entry.sha256]));
    checks.productTestsUnchanged = ["src/greeting.mjs", "test/greeting.test.mjs"].every(
      (relativePath) => beforeFiles.get(relativePath) === afterFiles.get(relativePath),
    );
    checks.unsupportedTerminalClaim = unsupportedTerminalClaim(
      finalMessage,
      taskMarkdown,
      testMarkdown,
    );
  }

  if (scenario.id === "S-06") {
    checks.ordinaryCreatedTask = taskDirectories(repository).length > 0;
    checks.noSkillInvocation = sourceReads.length === 0 && !commandWasRun(turns, /\.agents[\\/]skills[\\/]kyw-/i);
    checks.sourceChanged = readFileSync(join(repository, "src", "greeting.mjs"), "utf8").includes(
      '"Hello, kyw"',
    );
    checks.testChanged = readFileSync(join(repository, "test", "greeting.test.mjs"), "utf8").includes(
      '"Hello, kyw"',
    );
    checks.readmeImpactHandled = readFileSync(join(repository, "README.md"), "utf8").includes(
      "`Hello, kyw`",
    );
    checks.proportionateVerification = deterministicCommands.some(
      (command) => command.label === "S-06 focused postcheck" && command.exitCode === 0,
    );
    checks.finalDocumentationReport =
      documentationImpactClaim(finalMessage) &&
      /README/i.test(finalMessage) &&
      /SPEC/i.test(finalMessage) &&
      /Architecture/i.test(finalMessage) &&
      /AGENTS/i.test(finalMessage);
  }

  return checks;
}

export function validateScenarioEvidence(record) {
  const errors = [];
  const requireCheck = (name, expected = true) => {
    if (record.checks?.[name] !== expected) errors.push(`${record.id}: ${name}`);
  };
  if (!/^S-0[1-6]$/.test(record.id ?? "")) errors.push("scenario ID is invalid");
  else if (JSON.stringify(record.expectedMutationSet) !== JSON.stringify(expectedMutationSet(record.id))) {
    errors.push(`${record.id}: expected mutation set`);
  }
  if (record.model !== REQUIRED_MODEL) errors.push(`${record.id}: model mismatch`);
  if (record.reasoningEffort !== REQUIRED_REASONING_EFFORT) {
    errors.push(`${record.id}: reasoning effort mismatch`);
  }
  if (!/^[a-f0-9]{64}$/.test(record.packedTarballSha256 ?? "")) {
    errors.push(`${record.id}: packed tarball hash missing`);
  }
  if (!/^[a-f0-9]{64}$/.test(record.threadIdentityHash ?? "")) {
    errors.push(`${record.id}: fresh thread identity missing`);
  }
  if (!Number.isInteger(record.turnCount) || record.turnCount < 1) {
    errors.push(`${record.id}: turn count missing`);
  }
  if (!/^[a-f0-9]{64}$/.test(record.finalMessageSha256 ?? "")) {
    errors.push(`${record.id}: final-message hash missing`);
  }
  if (!/^[a-f0-9]{64}$/.test(record.sanitizedEventsSha256 ?? "")) {
    errors.push(`${record.id}: event hash missing`);
  }
  if (record.authSourceUnchanged !== true) errors.push(`${record.id}: auth source changed`);
  if (
    record.cleanup?.scenarioRootRemoved !== true ||
    record.cleanup?.authCopyRemoved !== true ||
    record.cleanup?.residueFree !== true
  ) {
    errors.push(`${record.id}: owned residue remains`);
  }
  if ((record.sensitiveFindings ?? []).length > 0) errors.push(`${record.id}: sensitive output`);
  requireCheck("packedSkillMatches");
  requireCheck("expectedMutationManifest");
  if ((record.checks?.unexpectedMutations ?? []).length > 0) {
    errors.push(`${record.id}: unexpected fixture mutation`);
  }

  if (record.id === "S-01") {
    for (const name of [
      "interviewProtocol",
      "confirmationRequested",
      "documentsComplete",
      "agentsThin",
      "noTask",
      "noApplication",
      "sentinelPreserved",
    ]) requireCheck(name);
    requireCheck("preConfirmationDurableWrites", false);
  }
  if (record.id === "S-02") {
    for (const name of [
      "interviewProtocol",
      "confirmationRequested",
      "documentsComplete",
      "adoptMode",
      "preservationSection",
      "applicationPreserved",
      "noTask",
    ]) requireCheck(name);
    requireCheck("preConfirmationDurableWrites", false);
  }
  if (record.id === "S-03") {
    for (const name of [
      "singleTaskCreated",
      "pairComplete",
      "traceability",
      "confirmationRequired",
      "applicationUnchanged",
    ]) requireCheck(name);
    if (record.checks?.taskNumber !== "0004") errors.push("S-03: wrong Task number");
    requireCheck("unsupportedTerminalClaim", false);
  }
  if (record.id === "S-04") {
    for (const name of [
      "existingTaskPreserved",
      "permanentDocsRead",
      "taskPairRead",
      "gitStateRead",
      "handoffFieldsRead",
      "confirmationRequired",
    ]) requireCheck(name);
    requireCheck("resumeAllocatedTask", false);
    requireCheck("unsupportedTerminalClaim", false);
  }
  if (record.id === "S-05") {
    for (const name of [
      "genericSuitePass",
      "intentionalGapProven",
      "diffInspected",
      "genericTestExecuted",
      "gapDetected",
      "gapRecorded",
      "productTestsUnchanged",
    ]) requireCheck(name);
    requireCheck("unsupportedTerminalClaim", false);
  }
  if (record.id === "S-06") {
    for (const name of [
      "noSkillInvocation",
      "sourceChanged",
      "testChanged",
      "readmeImpactHandled",
      "proportionateVerification",
      "finalDocumentationReport",
    ]) requireCheck(name);
    requireCheck("ordinaryCreatedTask", false);
  }
  return errors;
}

export function scenarioVerdict(record) {
  const errors = validateScenarioEvidence(record);
  return Object.freeze({ verdict: errors.length === 0 ? "PASS" : "FAIL", errors });
}

export function validateCohort(records) {
  const errors = [];
  const expectedIds = SCENARIOS.map(({ id }) => id);
  const ids = records.map(({ id }) => id);
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    errors.push("cohort must contain S-01 through S-06 in fixed order");
  }
  const threads = records.map(({ threadIdentityHash }) => threadIdentityHash);
  if (new Set(threads).size !== threads.length) {
    errors.push("fresh thread identities must be distinct");
  }
  const tarballs = new Set(records.map(({ packedTarballSha256 }) => packedTarballSha256));
  if (tarballs.size !== 1) errors.push("every scenario must use the same tarball");
  const scenarioResults = records.map((record) => {
    const result = scenarioVerdict(record);
    if (result.verdict === "FAIL") errors.push(...result.errors);
    return Object.freeze({ id: record.id, ...result });
  });
  return Object.freeze({
    verdict: errors.length === 0 ? "PASS" : "FAIL",
    errors: Object.freeze(errors),
    scenarios: Object.freeze(scenarioResults),
  });
}

function scenarioEvidencePaths(evidenceRoot, id) {
  const directory = join(evidenceRoot, id.toLowerCase());
  return {
    directory,
    events: join(directory, "events.jsonl"),
    finalMessage: join(directory, "final-message.txt"),
    summary: join(directory, "summary.json"),
  };
}

function writeScenarioEvidence(evidenceRoot, record, sanitizedEvents, sanitizedFinalMessage) {
  const paths = scenarioEvidencePaths(evidenceRoot, record.id);
  mkdirSync(paths.directory);
  writeFileSync(
    paths.events,
    `${sanitizedEvents.map((event) => JSON.stringify(event)).join("\n")}\n`,
    "utf8",
  );
  writeFileSync(paths.finalMessage, `${sanitizedFinalMessage.trimEnd()}\n`, "utf8");
  writeJsonAtomic(paths.summary, record);
  return paths;
}

function partialReport({ provenance, records, startedAt }) {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    status: "RUNNING",
    startedAt,
    model: REQUIRED_MODEL,
    reasoningEffort: REQUIRED_REASONING_EFFORT,
    tarball: {
      sourceHead: provenance.sourceHead,
      filename: provenance.filename,
      size: provenance.size,
      sha256: provenance.sha256,
      fileCount: provenance.fileCount,
      files: provenance.files,
      extractedRoot: provenance.extractedRootLabel,
    },
    scenarios: records,
  };
}

async function runScenario({
  scenario,
  cohortRoot,
  evidenceRoot,
  provenance,
  authFile,
  docker,
  runtime,
  codexVersion,
  knownSources,
  seenThreadHashes,
  s03Handoff,
}) {
  const startedAt = new Date().toISOString();
  const startedMilliseconds = Date.now();
  const state = createScenarioState(cohortRoot, scenario.id);
  const scope = createEvaluatorRunScope();
  let primaryError;
  let record;
  let handoffPath = s03Handoff;
  const turns = [];
  const turnSnapshots = [];
  const processExits = [];
  const deterministicCommands = [];
  const rawOutput = [];
  let auth;

  try {
    const environment = isolatedEnvironment(state);
    const installed = materializeScenarioRepository(
      state,
      scenario,
      provenance.packageRoot,
      environment,
      s03Handoff,
    );
    auth = copyAuthentication(authFile, state.codexHome);
    const before = snapshotTree(state.repository);
    const initialGitStatus = gitStatus(state.repository);
    const initialTaskDirectories = taskDirectories(state.repository);
    const preserve =
      scenario.id === "S-02"
        ? preservationBlock(readFileSync(join(state.repository, "README.md"), "utf8"))
        : undefined;
    const preservationSha256 = preserve === undefined ? undefined : sha256(preserve);

    if (["S-02", "S-03", "S-05", "S-06"].includes(scenario.id)) {
      const label =
        scenario.id === "S-05"
          ? "S-05 generic suite precheck"
          : `${scenario.id} fixture precheck`;
      deterministicCommands.push(
        deterministicCommand(
          state.repository,
          environment,
          label,
          process.execPath,
          ["--test"],
        ),
      );
    }
    const gapProof = scenario.id === "S-05" ? fixtureGapProof(state.repository) : undefined;
    if (scenario.id === "S-05" && !gapProof.intentionalGapProven) {
      fail("FIXTURE_CONTRACT_FAILED", "S-05 intentional branch gap is not materialized");
    }

    const deadline = startedMilliseconds + scenario.timeoutMs;
    let threadId;
    for (let index = 0; index < scenario.prompts.length; index += 1) {
      if (index >= scenario.maximumTurns) {
        fail("TURN_LIMIT", `${scenario.id} exceeded its fixed turn limit`);
      }
      const lastMessagePath = join(state.control, `last-message-${index + 1}.txt`);
      const remaining = deadline - Date.now();
      if (remaining <= 0) fail("SCENARIO_TIMEOUT", `${scenario.id} reached its fixed timeout`);
      const turnStartedAt = new Date().toISOString();
      const result = await invokeCodexTurn({
        docker,
        state,
        environment,
        repository: state.repository,
        packageRoot: provenance.packageRoot,
        runtimeRoot: runtime.root,
        auth,
        prompt: scenario.prompts[index],
        threadId,
        lastMessagePath,
        timeout: remaining,
        runChild: scope.runChild,
      });
      processExits.push({ turn: index + 1, exitCode: result.status, signal: result.signal });
      rawOutput.push(result.stdout, result.stderr);
      if (result.status !== 0) throw classifyCodexFailure(result);
      const parsed = parseJsonl(result.stdout);
      const finalMessage = existsSync(lastMessagePath)
        ? readFileSync(lastMessagePath, "utf8")
        : parsed.agentMessages.at(-1);
      if (!finalMessage?.trim()) fail("INVALID_CODEX_OUTPUT", "Codex returned no final message");
      rmSync(lastMessagePath, { force: true });
      if (index === 0) threadId = parsed.threadId;
      turns.push({
        index: index + 1,
        startedAt: turnStartedAt,
        completedAt: new Date().toISOString(),
        threadId: parsed.threadId,
        rawEvents: parsed.events,
        finalMessage,
        usage: parsed.usage,
      });
      turnSnapshots.push(snapshotTree(state.repository));
    }

    if (!turns.every((turn) => turn.threadId === threadId)) {
      fail("THREAD_REUSED_OR_CHANGED", `${scenario.id} did not retain one thread across its turns`);
    }
    const threadIdentityHash = sha256(threadId);
    if (seenThreadHashes.has(threadIdentityHash)) {
      fail("THREAD_REUSED_OR_CHANGED", `${scenario.id} reused a prior fresh thread`);
    }
    seenThreadHashes.add(threadIdentityHash);
    const sourceReads = sourceReadCounts(turns, knownSources);
    const after = snapshotTree(state.repository);
    const manifest = mutationManifest(before, after);
    const finalGitStatus = gitStatus(state.repository);

    if (scenario.id === "S-06") {
      deterministicCommands.push(
        deterministicCommand(
          state.repository,
          environment,
          "S-06 focused postcheck",
          process.execPath,
          ["--test"],
        ),
      );
    }

    const checks = scenarioChecks({
      scenario,
      repository: state.repository,
      before,
      after,
      turnSnapshots,
      turns,
      sourceReads,
      deterministicCommands,
      gapProof,
      preservationSha256,
      manifest,
    });
    const pathReplacements = [
      [state.root, "<SCENARIO_ROOT>"],
      [state.repository, "<FIXTURE_REPOSITORY>"],
      [state.home, "<ISOLATED_HOME>"],
      [state.codexHome, "<ISOLATED_CODEX_HOME>"],
      [state.npmRoot, "<ISOLATED_NPM>"],
      [auth.source, "<AUTH_SOURCE>"],
      [runtime.root, "<CODEX_RUNTIME>"],
      [REPOSITORY_ROOT, "<SOURCE_CHECKOUT>"],
    ];
    const redactionContext = { pathReplacements, threadIds: [threadId] };
    const sanitizedEvents = turns.flatMap((turn) =>
      turn.rawEvents.map((event) => redactValue(event, redactionContext)),
    );
    const sanitizedFinalMessage = redactString(
      turns.at(-1).finalMessage,
      redactionContext,
    );
    const serializedEvents = `${sanitizedEvents.map((event) => JSON.stringify(event)).join("\n")}\n`;
    const serializedMessages = turns.map((turn) => turn.finalMessage).join("\n");
    const findings = [
      ...sensitiveFindings(serializedEvents, redactionContext),
      ...sensitiveFindings(sanitizedFinalMessage, redactionContext),
      ...rawLeakFindings(rawOutput.join("\n") + serializedMessages, auth),
    ];
    const requiredSkillHashes = Object.fromEntries(
      scenario.requiredReads.map((relativePath) => [
        relativePath,
        provenance.sourceHashes[relativePath],
      ]),
    );
    record = {
      schemaVersion: REPORT_SCHEMA_VERSION,
      id: scenario.id,
      specAcceptance: scenario.specAcceptance,
      fixture: scenario.fixture,
      model: REQUIRED_MODEL,
      reasoningEffort: REQUIRED_REASONING_EFFORT,
      codexVersion,
      packedTarballSha256: provenance.sha256,
      requiredSkillHashes,
      sourceReads,
      threadIdentityHash,
      turnCount: turns.length,
      maximumTurns: scenario.maximumTurns,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMilliseconds,
      processExits,
      finalMessageSha256: sha256(`${sanitizedFinalMessage.trimEnd()}\n`),
      sanitizedEventsSha256: sha256(serializedEvents),
      fixtureInitialTreeSha256: before.sha256,
      fixtureFinalTreeSha256: after.sha256,
      initialGitStatus,
      finalGitStatus,
      initialTaskDirectories,
      finalTaskDirectories: taskDirectories(state.repository),
      mutationManifest: manifest,
      expectedMutationSet: expectedMutationSet(scenario.id),
      forbiddenMutationResult:
        checks.unexpectedMutations.length === 0 ? "none" : checks.unexpectedMutations,
      confirmationTurnBoundary: ["S-01", "S-02"].includes(scenario.id)
        ? { confirmationUserTurn: 3, preConfirmationAssistantTurns: [1, 2] }
        : scenario.id === "S-03"
          ? { confirmationSupplied: false, stoppedBeforeConfirmation: true }
          : null,
      taskId:
        scenario.id === "S-03"
          ? checks.taskNumber
          : ["S-04", "S-05"].includes(scenario.id)
            ? scenario.id === "S-05"
              ? "0001"
              : "0004"
            : null,
      deterministicCommands,
      checks,
      authSourceUnchanged: authSourceUnchanged(auth),
      sensitiveFindings: [...new Set(findings)].sort(),
      installedPackedFilesCompared: installed.length,
      cleanup: { scenarioRootRemoved: false, authCopyRemoved: false, residueFree: false },
      displayExcerpt: sanitizedFinalMessage.slice(0, 500),
    };

    if (scenario.id === "S-03") {
      handoffPath = join(cohortRoot, "s03-handoff");
      copyTree(state.repository, handoffPath, "S-03 result handoff");
      record.s03HandoffTreeSha256 = snapshotTree(handoffPath).sha256;
    }

    const preliminary = scenarioVerdict(record);
    record.result = preliminary.verdict;
    record.reason = preliminary.errors.length === 0 ? "fixed scenario contract satisfied" : preliminary.errors.join("; ");
    record.validatorInputSha256 = sha256(JSON.stringify({ ...record, displayExcerpt: undefined }));
    record._sanitizedEvents = sanitizedEvents;
    record._sanitizedFinalMessage = sanitizedFinalMessage;
  } catch (error) {
    primaryError = error;
    scope.claimFailure();
  }

  const finalState = await scope.finalize(async () => {
    const failures = [];
    try {
      clearContainerOwnedState({ docker, state });
      defaultRemoveOwnedPath(state.root, { recursive: true, force: true });
    } catch (error) {
      failures.push(
        cleanupFailureDiagnostic({
          operation: "remove-tree",
          pathLabel: `${scenario.id.toLowerCase()}-scenario-root`,
          error,
        }),
      );
    }
    return failures;
  });

  if (finalState.cause.kind === "interruption") {
    const interrupted = new EvaluatorInterruptedError(finalState.cause.signal);
    primaryError = new BehavioralE2EError("BEHAVIORAL_E2E_INTERRUPTED", interrupted.message, {
      exitCode: interrupted.exitCode,
    });
  } else if (!primaryError && finalState.diagnostics.length > 0) {
    primaryError = new BehavioralE2EError(
      "SCENARIO_CLEANUP_FAILED",
      `${scenario.id} cleanup failed`,
    );
  }
  if (primaryError) {
    appendEvaluatorDiagnostics(primaryError, finalState.diagnostics);
    throw primaryError;
  }

  record.cleanup = {
    scenarioRootRemoved: !existsSync(state.root),
    authCopyRemoved: !existsSync(auth.destination),
    residueFree: !existsSync(state.root) && !existsSync(auth.destination),
  };
  const sanitizedEvents = record._sanitizedEvents;
  const sanitizedFinalMessage = record._sanitizedFinalMessage;
  delete record._sanitizedEvents;
  delete record._sanitizedFinalMessage;
  const finalVerdict = scenarioVerdict(record);
  record.result = finalVerdict.verdict;
  record.reason =
    finalVerdict.errors.length === 0
      ? "fixed scenario contract satisfied"
      : finalVerdict.errors.join("; ");
  record.validatorInputSha256 = sha256(JSON.stringify({ ...record, displayExcerpt: undefined }));
  writeScenarioEvidence(evidenceRoot, record, sanitizedEvents, sanitizedFinalMessage);
  return { record, handoffPath };
}

export async function validateFixtureContracts() {
  const errors = [];
  const required = [
    "s01-empty/sentinel/user-note.txt",
    "s02-adopt/README.md",
    "s02-adopt/src/greeting.mjs",
    "s02-adopt/test/greeting.test.mjs",
    "s03-task/AGENTS.md",
    "s03-task/docs/SPEC.md",
    "s03-task/docs/ARCHITECTURE.md",
    "s05-gap/baseline/docs/tasks/0001-greeting-style/TASK.md",
    "s05-gap/baseline/docs/tasks/0001-greeting-style/TEST.md",
    "s05-gap/working/src/greeting.mjs",
    "s05-gap/working/test/greeting.test.mjs",
    "s06-ordinary/AGENTS.md",
    "s06-ordinary/src/greeting.mjs",
    "s06-ordinary/test/greeting.test.mjs",
  ];
  for (const relativePath of required) {
    if (!existsSync(join(FIXTURE_ROOT, ...relativePath.split("/")))) {
      errors.push(`missing fixture path ${relativePath}`);
    }
  }
  if (errors.length > 0) return errors;
  assertSafeTree(FIXTURE_ROOT, "behavioral fixture root");
  const adoptReadme = readFileSync(join(FIXTURE_ROOT, "s02-adopt", "README.md"), "utf8");
  if (!preservationBlock(adoptReadme)) errors.push("S-02 preservation block is missing");
  for (const scenarioName of ["s03-task", "s05-gap/baseline", "s06-ordinary"]) {
    const agents = readFileSync(join(FIXTURE_ROOT, ...scenarioName.split("/"), "AGENTS.md"));
    if (agents.length >= 4096) errors.push(`${scenarioName} AGENTS.md is not thin`);
  }
  const temporaryRoot = mkdtempSync(join(tmpdir(), "kyw-spec-e2e-fixtures-"));
  try {
    for (const scenarioName of ["s02-adopt", "s03-task", "s06-ordinary"]) {
      const repository = join(temporaryRoot, scenarioName);
      copyTree(join(FIXTURE_ROOT, scenarioName), repository, `${scenarioName} fixture`);
      const testResult = runProcess(process.execPath, ["--test"], {
        cwd: repository,
        timeout: 60_000,
      });
      if (testResult.status !== 0) errors.push(`${scenarioName} generic suite failed`);
    }
    const gapRepository = join(temporaryRoot, "s05-gap");
    copyTree(join(FIXTURE_ROOT, "s05-gap", "baseline"), gapRepository, "S-05 baseline");
    cpSync(join(FIXTURE_ROOT, "s05-gap", "working"), gapRepository, {
      recursive: true,
      force: true,
    });
    const gapTest = runProcess(process.execPath, ["--test"], {
      cwd: gapRepository,
      timeout: 60_000,
    });
    if (gapTest.status !== 0) errors.push("S-05 generic suite does not pass");
    if (!fixtureGapProof(gapRepository).intentionalGapProven) {
      errors.push("S-05 intentional branch gap is not independently proven");
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  return errors;
}

function artifactTreeSha256(root) {
  return snapshotTree(root, { exclude: new Set() }).sha256;
}

export function validateEvidenceReport(evidenceRoot) {
  const resolvedRoot = resolve(evidenceRoot);
  const reportPath = join(resolvedRoot, "report.json");
  if (!existsSync(reportPath)) fail("REPORT_INVALID", "report.json is missing");
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  if (report.schemaVersion !== REPORT_SCHEMA_VERSION) {
    fail("REPORT_INVALID", "report schema version is invalid");
  }
  if (report.model !== REQUIRED_MODEL || report.reasoningEffort !== REQUIRED_REASONING_EFFORT) {
    fail("REPORT_INVALID", "report model configuration differs from the fixed cohort");
  }
  if (report.tarball?.fileCount !== 29 || report.tarball?.files?.length !== 29) {
    fail("REPORT_INVALID", "report tarball inventory is incomplete");
  }
  if (
    report.tarball?.filename !== "kyw-dev-0.1.0.tgz" ||
    report.tarball?.size !== EXPECTED_TARBALL_SIZE ||
    report.tarball?.sha256 !== EXPECTED_TARBALL_SHA256
  ) {
    fail("REPORT_INVALID", "report tarball identity differs from the authorized packed product");
  }
  if (
    report.cohort !== undefined &&
    (report.cohort !== "two" || !report.capabilityEvidence?.freezeManifestSha256)
  ) {
    fail("REPORT_INVALID", "report lacks cohort-two capability attribution");
  }
  const records = [];
  for (const scenario of SCENARIOS) {
    const paths = scenarioEvidencePaths(resolvedRoot, scenario.id);
    for (const filePath of [paths.events, paths.finalMessage, paths.summary]) {
      if (!existsSync(filePath)) fail("REPORT_INVALID", `${scenario.id} evidence is incomplete`);
    }
    const record = JSON.parse(readFileSync(paths.summary, "utf8"));
    if (sha256(readFileSync(paths.events)) !== record.sanitizedEventsSha256) {
      fail("REPORT_INVALID", `${scenario.id} event hash differs`);
    }
    if (sha256(readFileSync(paths.finalMessage)) !== record.finalMessageSha256) {
      fail("REPORT_INVALID", `${scenario.id} final-message hash differs`);
    }
    const verdict = scenarioVerdict(record);
    const reason = verdict.errors.length === 0 ? "fixed scenario contract satisfied" : verdict.errors.join("; ");
    if (record.result !== verdict.verdict || record.reason !== reason) {
      fail("REPORT_INVALID", `${scenario.id} retained verdict differs from deterministic validation`);
    }
    records.push(record);
  }
  const cohort = validateCohort(records);
  if (cohort.verdict !== report.cohortVerdict) {
    fail("REPORT_INVALID", "report cohort verdict differs from deterministic validation");
  }
  const reportSha256 = sha256(readFileSync(reportPath));
  const artifactSha256 = artifactTreeSha256(resolvedRoot);
  return Object.freeze({
    valid: true,
    cohortVerdict: cohort.verdict,
    scenarioCount: records.length,
    scenarioVerdicts: records.map(({ id, result }) => ({ id, result })),
    reportSha256,
    artifactTreeSha256: artifactSha256,
  });
}

export function parseArguments(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }
  const booleans = new Set(["--allow-model", "--validate-fixtures", "--validate-topology"]);
  const values = new Set([
    "--model",
    "--reasoning-effort",
    "--auth-file",
    "--evidence-root",
    "--capability-evidence-root",
    "--codex-runtime-root",
    "--validate-report",
    "--validate-capability-report",
  ]);
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (booleans.has(option)) {
      if (parsed[option] !== undefined) fail("INVALID_ARGUMENT", `${option} may appear once`);
      parsed[option] = true;
      continue;
    }
    if (!values.has(option)) fail("INVALID_ARGUMENT", `Unknown option: ${option}`);
    if (parsed[option] !== undefined) fail("INVALID_ARGUMENT", `${option} may appear once`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("INVALID_ARGUMENT", `${option} requires a value`);
    parsed[option] = value;
    index += 1;
  }
  if (parsed["--validate-fixtures"]) {
    if (Object.keys(parsed).length !== 1) {
      fail("INVALID_ARGUMENT", "--validate-fixtures accepts no other option");
    }
    return { validateFixtures: true };
  }
  if (parsed["--validate-report"]) {
    if (Object.keys(parsed).length !== 1) {
      fail("INVALID_ARGUMENT", "--validate-report accepts no other option");
    }
    return { validateReport: resolve(parsed["--validate-report"]) };
  }
  if (parsed["--validate-capability-report"]) {
    if (Object.keys(parsed).length !== 1) {
      fail("INVALID_ARGUMENT", "--validate-capability-report accepts no other option");
    }
    return { validateCapabilityReport: resolve(parsed["--validate-capability-report"]) };
  }
  if (parsed["--validate-topology"]) {
    const allowed = new Set([
      "--validate-topology",
      "--auth-file",
      "--codex-runtime-root",
      "--evidence-root",
    ]);
    if (Object.keys(parsed).some((option) => !allowed.has(option))) {
      fail("INVALID_ARGUMENT", "--validate-topology received an incompatible option");
    }
    for (const required of ["--auth-file", "--codex-runtime-root", "--evidence-root"]) {
      if (!parsed[required]) fail("INVALID_ARGUMENT", `${required} is required`);
    }
    const evidenceRoot = resolve(parsed["--evidence-root"]);
    ensureContained(REPOSITORY_ROOT, evidenceRoot, "topology evidence root");
    return {
      validateTopology: true,
      authFile: parsed["--auth-file"],
      codexRuntimeRoot: resolve(parsed["--codex-runtime-root"]),
      evidenceRoot,
    };
  }
  if (!parsed["--allow-model"]) fail("INVALID_ARGUMENT", "Model execution requires --allow-model");
  if (parsed["--model"] !== REQUIRED_MODEL) {
    fail("INVALID_ARGUMENT", `--model must be exactly ${REQUIRED_MODEL}`);
  }
  if (parsed["--reasoning-effort"] !== REQUIRED_REASONING_EFFORT) {
    fail("INVALID_ARGUMENT", `--reasoning-effort must be exactly ${REQUIRED_REASONING_EFFORT}`);
  }
  if (!parsed["--auth-file"]) fail("INVALID_ARGUMENT", "--auth-file is required");
  if (!parsed["--evidence-root"]) fail("INVALID_ARGUMENT", "--evidence-root is required");
  if (!parsed["--capability-evidence-root"]) {
    fail("INVALID_ARGUMENT", "--capability-evidence-root is required");
  }
  if (!parsed["--codex-runtime-root"]) {
    fail("INVALID_ARGUMENT", "--codex-runtime-root is required");
  }
  const evidenceRoot = resolve(parsed["--evidence-root"]);
  const capabilityEvidenceRoot = resolve(parsed["--capability-evidence-root"]);
  ensureContained(REPOSITORY_ROOT, evidenceRoot, "evidence root");
  ensureContained(REPOSITORY_ROOT, capabilityEvidenceRoot, "capability evidence root");
  if (evidenceRoot === capabilityEvidenceRoot) {
    fail("INVALID_ARGUMENT", "Capability and cohort evidence roots must differ");
  }
  return {
    allowModel: true,
    model: parsed["--model"],
    reasoningEffort: parsed["--reasoning-effort"],
    authFile: parsed["--auth-file"],
    evidenceRoot,
    capabilityEvidenceRoot,
    codexRuntimeRoot: resolve(parsed["--codex-runtime-root"]),
  };
}

const HELP = `kyw-dev SPEC behavioral E2E

Usage:
  node ./scripts/spec-behavioral-e2e.mjs --validate-fixtures
  node ./scripts/spec-behavioral-e2e.mjs --validate-report <ignored-evidence-root>
  node ./scripts/spec-behavioral-e2e.mjs --validate-capability-report <ignored-capability-root>
  node ./scripts/spec-behavioral-e2e.mjs --validate-topology --auth-file <explicit-auth-json> --codex-runtime-root <linux-package-root> --evidence-root <ignored-root>
  node ./scripts/spec-behavioral-e2e.mjs --allow-model --model ${REQUIRED_MODEL} --reasoning-effort ${REQUIRED_REASONING_EFFORT} --auth-file <explicit-auth-json> --codex-runtime-root <linux-package-root> --capability-evidence-root <ignored-capability-root> --evidence-root <ignored-cohort-root>

The model command first runs the deterministic Docker topology matrix, freezes the complete
contract, and makes exactly one non-SPEC model capability call. Only a full capability PASS
creates the one unpublished tarball and runs exactly S-01 through S-06. It never retries.`;

async function runTopologyOnly(options, dependencies = {}) {
  if (existsSync(options.evidenceRoot)) {
    fail("EVIDENCE_ROOT_EXISTS", "Refusing to overwrite topology evidence");
  }
  mkdirSync(options.evidenceRoot, { recursive: true });
  const ownerRoot = mkdtempSync(join(tmpdir(), "kyw-spec-topology-"));
  let primaryError;
  let completed;
  try {
    const authSource = realpathSync(resolve(options.authFile));
    if (!statSync(authSource).isFile()) fail("AUTH_UNAVAILABLE", "Explicit auth source is not a file");
    const docker = dependencies.docker ?? defaultDockerLauncher();
    const runtimeState = createScenarioState(ownerRoot, "runtime");
    const runtime = inspectDockerRuntime({
      docker,
      runtimeRoot: options.codexRuntimeRoot,
      state: runtimeState,
    });
    defaultRemoveOwnedPath(runtimeState.root, { recursive: true, force: true });
    const report = await runDockerTopologyMatrix({
      docker,
      runtime,
      authFile: authSource,
      cohortRoot: ownerRoot,
    });
    writeJsonAtomic(join(options.evidenceRoot, "topology-report.json"), report);
    completed = {
      report,
      reportSha256: sha256(readFileSync(join(options.evidenceRoot, "topology-report.json"))),
    };
    if (!report.pass) fail("TOPOLOGY_MATRIX_FAILED", "Deterministic Docker topology matrix failed");
  } catch (error) {
    primaryError = error;
  }
  try {
    defaultRemoveOwnedPath(ownerRoot, { recursive: true, force: true });
  } catch (error) {
    const diagnostic = cleanupFailureDiagnostic({
      operation: "remove-tree",
      pathLabel: "topology-owner-root",
      error,
    });
    if (primaryError) appendEvaluatorDiagnostics(primaryError, [diagnostic]);
    else primaryError = new BehavioralE2EError("TOPOLOGY_CLEANUP_FAILED", diagnostic);
  }
  if (primaryError) throw primaryError;
  return Object.freeze(completed);
}

export async function runBehavioralCohort(options, dependencies = {}) {
  const fixtureErrors = await validateFixtureContracts();
  if (fixtureErrors.length > 0) fail("FIXTURE_CONTRACT_FAILED", fixtureErrors.join("; "));
  if (existsSync(options.capabilityEvidenceRoot) || existsSync(options.evidenceRoot)) {
    fail("EVIDENCE_ROOT_EXISTS", "Refusing to overwrite capability or cohort evidence");
  }
  mkdirSync(options.capabilityEvidenceRoot, { recursive: true });
  const cohortRoot = mkdtempSync(join(tmpdir(), "kyw-spec-behavioral-e2e-"));
  const startedAt = new Date().toISOString();
  const startedMilliseconds = Date.now();
  const records = [];
  const seenThreadHashes = new Set();
  const docker = dependencies.docker ?? defaultDockerLauncher();
  let primaryError;
  let provenance;
  let authBeforeSha256;
  let authAfterSha256;
  let s03Handoff;
  let completed;
  let frozen;
  let capabilityValidation;

  try {
    const authSource = realpathSync(resolve(options.authFile));
    if (!statSync(authSource).isFile()) fail("AUTH_UNAVAILABLE", "Explicit auth source is not a file");
    authBeforeSha256 = sha256File(authSource);
    const runtimeState = createScenarioState(cohortRoot, "runtime");
    const runtime = inspectDockerRuntime({
      docker,
      runtimeRoot: options.codexRuntimeRoot,
      state: runtimeState,
    });
    defaultRemoveOwnedPath(runtimeState.root, { recursive: true, force: true });

    const topology = await runDockerTopologyMatrix({
      docker,
      runtime,
      authFile: authSource,
      cohortRoot,
    });
    const topologyPath = join(options.capabilityEvidenceRoot, "topology-report.json");
    writeJsonAtomic(topologyPath, topology);
    if (!topology.pass) {
      writeJsonAtomic(join(options.capabilityEvidenceRoot, "capability-report.json"), {
        schemaVersion: 1,
        kind: "HARNESS_CAPABILITY_ONLY",
        status: "BLOCKED",
        verdict: "NOT_RUN",
        modelCallCount: 0,
        topologyReportSha256: sha256(readFileSync(topologyPath)),
        cohortStarted: false,
      });
      fail("TOPOLOGY_MATRIX_FAILED", "Deterministic Docker topology matrix failed");
    }

    frozen = frozenContractManifest(runtime);
    const freezePath = join(options.capabilityEvidenceRoot, "freeze-manifest.json");
    writeJsonAtomic(freezePath, frozen);
    assertFrozenContract(frozen, runtime);

    let capability;
    try {
      capability = await runModelCapabilityProbe({
        docker,
        runtime,
        authFile: authSource,
        capabilityRoot: options.capabilityEvidenceRoot,
        cohortRoot,
      });
    } catch (error) {
      writeJsonAtomic(join(options.capabilityEvidenceRoot, "capability-report.json"), {
        schemaVersion: 1,
        kind: "HARNESS_CAPABILITY_ONLY",
        status: "BLOCKED",
        verdict: "FAIL",
        modelCallCount: 1,
        topologyReportSha256: sha256(readFileSync(topologyPath)),
        freezeManifestSha256: frozen.manifestSha256,
        failureCode: error instanceof BehavioralE2EError ? error.code : "UNEXPECTED_ERROR",
        cohortStarted: false,
      });
      throw error;
    }
    assertFrozenContract(frozen, runtime);
    const modelSummaryPath = join(options.capabilityEvidenceRoot, "model", "summary.json");
    const capabilityReport = {
      schemaVersion: 1,
      kind: "HARNESS_CAPABILITY_ONLY",
      status: capability.verdict === "PASS" ? "PASSED" : "BLOCKED",
      verdict: capability.verdict,
      modelCallCount: 1,
      model: REQUIRED_MODEL,
      reasoningEffort: REQUIRED_REASONING_EFFORT,
      topologyReportSha256: sha256(readFileSync(topologyPath)),
      freezeManifestSha256: frozen.manifestSha256,
      modelSummarySha256: sha256(readFileSync(modelSummaryPath)),
      cohortStarted: false,
    };
    writeJsonAtomic(
      join(options.capabilityEvidenceRoot, "capability-report.json"),
      capabilityReport,
    );
    if (capability.verdict !== "PASS") {
      fail("MODEL_CAPABILITY_FAILED", "The single model capability probe failed; cohort two is forbidden");
    }
    capabilityValidation = validateCapabilityEvidence(options.capabilityEvidenceRoot);
    assertFrozenContract(frozen, runtime);

    provenance = createPackedProvenance(cohortRoot);
    assertFrozenContract(frozen, runtime);
    mkdirSync(options.evidenceRoot, { recursive: true });
    const knownSources = packedSourceInventory(provenance.packageRoot);
    for (const scenario of SCENARIOS) {
      const outcome = await runScenario({
        scenario,
        cohortRoot,
        evidenceRoot: options.evidenceRoot,
        provenance,
        authFile: authSource,
        docker,
        runtime,
        codexVersion: runtime.version,
        knownSources,
        seenThreadHashes,
        s03Handoff,
      });
      records.push(outcome.record);
      s03Handoff = outcome.handoffPath;
      writeJsonAtomic(
        join(options.evidenceRoot, "partial-report.json"),
        partialReport({ provenance, records, startedAt }),
      );
    }
    assertFrozenContract(frozen, runtime);
    authAfterSha256 = sha256File(authSource);
    if (authAfterSha256 !== authBeforeSha256) {
      fail("AUTH_SOURCE_CHANGED", "Explicit auth source changed during the cohort");
    }
    const cohort = validateCohort(records);
    const report = {
      schemaVersion: REPORT_SCHEMA_VERSION,
      status: cohort.verdict === "PASS" ? "PASSED" : "BLOCKED",
      cohortVerdict: cohort.verdict,
      cohort: "two",
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMilliseconds,
      model: REQUIRED_MODEL,
      reasoningEffort: REQUIRED_REASONING_EFFORT,
      codexVersion: runtime.version,
      authBeforeSha256,
      authAfterSha256,
      authSourceUnchanged: authBeforeSha256 === authAfterSha256,
      capabilityEvidence: {
        reportSha256: capabilityValidation.reportSha256,
        artifactTreeSha256: capabilityValidation.artifactTreeSha256,
        freezeManifestSha256: frozen.manifestSha256,
      },
      tarball: {
        sourceHead: provenance.sourceHead,
        filename: provenance.filename,
        size: provenance.size,
        sha256: provenance.sha256,
        fileCount: provenance.fileCount,
        files: provenance.files,
        extractedRoot: provenance.extractedRootLabel,
      },
      scenarioCount: SCENARIOS.length,
      completedScenarioCount: records.length,
      totalTurnCount: records.reduce((sum, record) => sum + record.turnCount, 0),
      scenarios: records,
      cohortErrors: cohort.errors,
      cleanup: {
        scenarioRootsRemoved: records.every((record) => record.cleanup.residueFree),
        cohortRootRemoved: false,
      },
      retryHistory: [],
    };
    if (s03Handoff && existsSync(s03Handoff)) {
      defaultRemoveOwnedPath(s03Handoff, { recursive: true, force: true });
    }
    rmSync(join(options.evidenceRoot, "partial-report.json"), { force: true });
    completed = { report, cohort };
  } catch (error) {
    primaryError = error;
  }

  try {
    defaultRemoveOwnedPath(cohortRoot, { recursive: true, force: true });
  } catch (error) {
    const diagnostic = cleanupFailureDiagnostic({
      operation: "remove-tree",
      pathLabel: "behavioral-cohort-root",
      error,
    });
    if (primaryError) appendEvaluatorDiagnostics(primaryError, [diagnostic]);
    else primaryError = new BehavioralE2EError("COHORT_CLEANUP_FAILED", diagnostic);
  }
  if (primaryError) throw primaryError;

  completed.report.cleanup.cohortRootRemoved = !existsSync(cohortRoot);
  if (!completed.report.cleanup.cohortRootRemoved) {
    fail("COHORT_CLEANUP_FAILED", "Cohort temporary root remains");
  }
  writeJsonAtomic(join(options.evidenceRoot, "report.json"), completed.report);
  const validation = validateEvidenceReport(options.evidenceRoot);
  if (completed.cohort.verdict !== "PASS") {
    const error = new BehavioralE2EError(
      "BEHAVIORAL_COHORT_FAILED",
      `One or more fixed scenarios failed; sanitized report sha256=${validation.reportSha256}`,
    );
    error.report = validation;
    throw error;
  }
  return Object.freeze({
    report: completed.report,
    validation,
    capabilityValidation,
    frozen,
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (options.validateFixtures) {
    const errors = await validateFixtureContracts();
    if (errors.length > 0) fail("FIXTURE_CONTRACT_FAILED", errors.join("; "));
    console.log(JSON.stringify({ valid: true, scenarioCount: SCENARIOS.length }));
    return;
  }
  if (options.validateReport) {
    console.log(JSON.stringify(validateEvidenceReport(options.validateReport)));
    return;
  }
  if (options.validateCapabilityReport) {
    console.log(JSON.stringify(validateCapabilityEvidence(options.validateCapabilityReport)));
    return;
  }
  if (options.validateTopology) {
    const completed = await runTopologyOnly(options);
    console.log(
      JSON.stringify({
        valid: completed.report.pass,
        rowCount: completed.report.rows.length,
        reportSha256: completed.reportSha256,
        cleanup: completed.report.cleanup,
      }),
    );
    return;
  }
  const completed = await runBehavioralCohort(options);
  console.log(
    JSON.stringify({
      status: completed.report.status,
      cohortVerdict: completed.report.cohortVerdict,
      scenarioCount: completed.report.scenarioCount,
      completedScenarioCount: completed.report.completedScenarioCount,
      totalTurnCount: completed.report.totalTurnCount,
      tarballSha256: completed.report.tarball.sha256,
      reportSha256: completed.validation.reportSha256,
      artifactTreeSha256: completed.validation.artifactTreeSha256,
      capabilityReportSha256: completed.capabilityValidation.reportSha256,
      frozenManifestSha256: completed.frozen.manifestSha256,
      evidenceRoot: relative(REPOSITORY_ROOT, options.evidenceRoot).replaceAll("\\", "/"),
      cleanup: completed.report.cleanup,
    }),
  );
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    await main();
  } catch (error) {
    const code = error instanceof BehavioralE2EError ? error.code : "UNEXPECTED_ERROR";
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${code}: ${message}`);
    console.error(
      "No publication action ran; sanitized completed evidence was retained when available and owned temporary cleanup was attempted.",
    );
    process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
  }
}
