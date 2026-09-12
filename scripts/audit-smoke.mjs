#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { getCACertificates, rootCertificates } from "node:tls";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  appendEvaluatorDiagnostics,
  cleanupFailureDiagnostic,
  createEvaluatorRunScope,
  defaultRemoveEvaluatorOwnedPath,
  EvaluatorInterruptedError,
} from "./evaluator-process.mjs";
import {
  commandShellForPlatform,
  inspectReadOnlyCommand,
} from "./audit-readonly-boundary.mjs";
import { buildManagedSourceInventory } from "../src/core/skill-installation-inventory.mjs";
import {
  createConfigurationProvenance,
  isReasoningEffortToken,
} from "./evaluator-configuration.mjs";

import { analyzeEvents, isSupportedItemEvent } from "./audit-smoke-evidence.mjs";
import { verifyAuditFixture } from "./audit-smoke-verification.mjs";

export { analyzeEvents, commandShellForPlatform, inspectReadOnlyCommand };

export const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-audit");
const FIXTURE_PROJECT = join(FIXTURE_ROOT, "fresh-session-project");
const FIXTURE_CONFIG = join(FIXTURE_ROOT, "fresh-session.json");
const SKILL_ROOT = join(REPOSITORY_ROOT, "skills", "kyw-audit");
const MAX_DIAGNOSTIC_ATTEMPTS = 8;

const HELP = `kyw-audit fresh-session behavior smoke

Usage:
  node ./scripts/audit-smoke.mjs --allow-model --mode <readonly|fix> --model <model> --reasoning-effort <effort> --auth-file <path>

The runner uses one temporary Git repository, the audit Skill and shared adapter/runtime,
an isolated HOME/CODEX_HOME, and no retained result artifact. The existing model outer
sandbox allows root reads, control writes and network; this smoke does not newly prove
isolation of every model tool. A limited recognizer confirms supported literal reads.
Unsupported commands remain UNVERIFIED, even when final bytes are unchanged.

In fix mode the model repairs and performs static review, reporting execution as
pending/unexecuted. A separate trusted verifier copies only package.json,
src/greeting.mjs and test/greeting.test.mjs and runs the fixed command
node --test test/greeting.test.mjs in the existing local node:22 Docker boundary.
There is no host-test fallback, image pull or installation. Docker/image absence is
UNAVAILABLE/UNEXECUTED, not a completed test failure. Read-only mode never uses Docker.

verdict remains the model report; evaluatorOutcome is PASS, VIOLATION or UNVERIFIED.
mutationAttemptCount counts observed file_change tool attempts, deduplicated by item
identity, and excludes unsupported commands. Final byte changes are separate evidence.
planBeforeMutation is ABSENT, UNVERIFIED or NOT_APPLICABLE, never a boolean or plan PASS.
Only a complete ordered trace with no prior visible speech establishes ABSENT;
natural-language plan meaning and unsupported-command behavior remain unverified.
skillSourceRead is CONFIRMED only when complete Skill text is observed, otherwise UNVERIFIED.
An unverified optional smoke rejects with AUDIT_SMOKE_UNVERIFIED and partial evidence;
this is an evaluation limit, not a failure of the general audit workflow. No automatic
retry, model recall or mandatory manual approval follows. Fake tests prove orchestration
and result handling, not real Docker/OS isolation or model behavior. Cleanup outcomes
remain separate; preserved verifier-owned temporary paths are included for recovery.

Reasoning effort accepts a nonempty ASCII token: a letter or digit followed by
letters, digits, underscores, or hyphens. The exact token is passed to Codex;
acceptance here does not establish model support. Codex errors are returned without
changing the requested model or effort or retrying with another configuration.

Output model/reasoningEffort fields remain requested values. configurationProvenance
records their cli or direct-call source; observed configuration and server execution
are UNAVAILABLE because this runner does not independently verify them. codexVersion
is the preflight version of the actual launcher, not a Desktop or server version.`;

export class AuditSmokeError extends Error {
  constructor(code, message, evidence) {
    super(message);
    this.name = "AuditSmokeError";
    this.code = code;
    if (evidence) this.evidence = evidence;
  }
}

function fail(code, message) {
  throw new AuditSmokeError(code, message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function normalizeText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function environmentSensitivePaths() {
  return [
    process.env.USERPROFILE,
    process.env.HOME,
    process.env.CODEX_HOME,
    process.env.CODEX_SQLITE_HOME,
    process.env.APPDATA,
    process.env.LOCALAPPDATA,
    process.env.npm_config_cache,
    process.env.npm_config_userconfig,
  ].filter(Boolean);
}

function redactCredentials(value) {
  return value
    .replace(
      /(\b(?:CODEX_API_KEY|OPENAI_API_KEY|API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|ID_TOKEN)\b\s*(?:=|:)\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1<REDACTED_CREDENTIAL>",
    )
    .replace(
      /(\bAuthorization\b\s*(?:=|:)\s*Bearer\s+)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1<REDACTED_CREDENTIAL>",
    )
    .replace(
      /(\b--(?:api-key|access-token|auth-token)\s+)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1<REDACTED_CREDENTIAL>",
    )
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "<REDACTED_CREDENTIAL>");
}

function redactGenericUserPaths(value) {
  return value
    .replace(
      /[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'`;|]+(?:[\\/][^\s"'`;|]+)*/gi,
      "<USER_PATH>",
    )
    .replace(/\/(?:Users|home)\/[^/\s"'`;|]+(?:\/[^\s"'`;|]+)*/g, "<USER_PATH>");
}

export function redactedDiagnostic(value, paths = []) {
  let output = normalizeText(value);
  const sensitivePaths = [...new Set([...paths, ...environmentSensitivePaths()].filter(Boolean))];
  for (const path of sensitivePaths.sort((a, b) => b.length - a.length)) {
    for (const candidate of new Set([
      path,
      path.replaceAll("\\", "/"),
      path.replaceAll("/", "\\"),
      path.replaceAll("\\", "\\\\"),
      path.replaceAll("/", "\\\\"),
    ])) {
      output = output.replace(new RegExp(escapeRegExp(candidate), "gi"), "<TEMP_PATH>");
    }
  }
  return redactGenericUserPaths(redactCredentials(output)).slice(0, 6000);
}

function normalizedRelativePath(root, path) {
  return relative(root, path).replaceAll("\\", "/");
}

function assertSafeTree(root, label) {
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const state = lstatSync(path);
      if (entry.isSymbolicLink() || state.isSymbolicLink()) {
        fail("UNSAFE_FIXTURE", `${label} contains a symbolic link: ${path}`);
      }
      if (entry.isDirectory() && state.isDirectory()) walk(path);
      else if (!entry.isFile() || !state.isFile()) {
        fail("UNSAFE_FIXTURE", `${label} contains an unsupported entry: ${path}`);
      }
    }
  };
  walk(root);
}

function copyTree(source, target, label) {
  assertSafeTree(source, label);
  cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
}

export function snapshotTree(root, { excludedNames = new Set([".git"]) } = {}) {
  const rootState = lstatSync(root);
  if (rootState.isSymbolicLink() || !rootState.isDirectory()) {
    fail("UNSAFE_FIXTURE", "Snapshot root must be a directory without a symbolic link");
  }
  const entries = [];
  const walk = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (excludedNames.has(entry.name)) continue;
      const path = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const state = lstatSync(path);
      if (entry.isSymbolicLink() || state.isSymbolicLink()) {
        fail("UNSAFE_FIXTURE", `Snapshot contains a symbolic link: ${relativePath}`);
      }
      if (entry.isDirectory() && state.isDirectory()) {
        walk(path, relativePath);
      } else if (entry.isFile() && state.isFile()) {
        const bytes = readFileSync(path);
        entries.push({ path: relativePath, sha256: sha256(bytes), size: bytes.length, bytes });
      } else {
        fail("UNSAFE_FIXTURE", `Snapshot contains an unsupported entry: ${relativePath}`);
      }
    }
  };
  walk(root);
  const tree = createHash("sha256");
  for (const entry of entries) {
    tree.update(entry.path, "utf8");
    tree.update("\0");
    tree.update(entry.bytes);
    tree.update("\0");
  }
  return {
    sha256: tree.digest("hex"),
    files: entries.map(({ path, sha256: fileSha256, size }) => ({ path, sha256: fileSha256, size })),
  };
}

export function diffSnapshots(before, after) {
  const beforeFiles = new Map(before.files.map((entry) => [entry.path, entry]));
  const afterFiles = new Map(after.files.map((entry) => [entry.path, entry]));
  const added = [...afterFiles.keys()].filter((path) => !beforeFiles.has(path)).sort();
  const deleted = [...beforeFiles.keys()].filter((path) => !afterFiles.has(path)).sort();
  const changed = [...beforeFiles.keys()]
    .filter((path) => afterFiles.has(path) && beforeFiles.get(path).sha256 !== afterFiles.get(path).sha256)
    .sort();
  return { added, changed, deleted };
}

function runProcess(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    input: options.input,
    maxBuffer: 30 * 1024 * 1024,
    timeout: options.timeout ?? 30_000,
    windowsHide: true,
  });
}

function processFailure(result) {
  if (result.error?.code === "ENOENT") return "command not found";
  if (result.error?.code === "ETIMEDOUT") return "command timed out";
  return result.error?.message || result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status ?? "unknown"}`;
}

function runGit(repository, args, { allowFailure = false } = {}) {
  const result = runProcess("git", ["--no-optional-locks", ...args], {
    cwd: repository,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  if (!allowFailure && result.status !== 0) {
    fail("GIT_FIXTURE_FAILED", `git ${args[0]} failed: ${processFailure(result)}`);
  }
  return result;
}

export function gitStatus(repository) {
  return normalizeText(runGit(repository, ["status", "--short", "--untracked-files=all"]).stdout).trimEnd();
}

function writeFixtureFile(repository, relativePath, content) {
  const target = resolve(repository, ...relativePath.split("/"));
  const root = resolve(repository);
  if (target === root || !target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
    fail("UNSAFE_FIXTURE", `Fixture path escapes its repository: ${relativePath}`);
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

export function prepareFixture(temporaryRoot) {
  const repository = join(temporaryRoot, "repository");
  copyTree(FIXTURE_PROJECT, repository, "audit fixture");
  const installedSkill = join(repository, ".agents", "skills", "kyw-audit");
  const installedRoot = dirname(installedSkill);
  const inventory = buildManagedSourceInventory({ sourceRoot: REPOSITORY_ROOT });
  for (const file of inventory.files) {
    if (!file.path.startsWith("kyw-audit/") && !file.path.startsWith("kyw-task/") &&
      !file.path.startsWith(".kyw-dev/runtime/")) continue;
    const destination = join(installedRoot, ...file.path.split("/"));
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(file.sourcePath, destination);
    chmodSync(destination, file.mode);
  }

  runGit(repository, ["init", "--quiet"]);
  runGit(repository, ["config", "user.name", "kyw-audit-smoke"]);
  runGit(repository, ["config", "user.email", "audit-smoke@invalid.local"]);
  runGit(repository, ["config", "commit.gpgsign", "false"]);
  runGit(repository, ["add", "--all"]);
  runGit(repository, ["commit", "--quiet", "-m", "audit smoke fixture"]);

  const config = JSON.parse(readFileSync(FIXTURE_CONFIG, "utf8"));
  writeFixtureFile(repository, config.trackedUserChange.path, config.trackedUserChange.content);
  for (const file of config.untrackedUserFiles) writeFixtureFile(repository, file.path, file.content);
  return { config, installedSkill, repository };
}

function resolveWindowsCodexLauncher(environment) {
  const pathEntries = String(environment.PATH ?? environment.Path ?? "")
    .split(";")
    .filter(Boolean);
  for (const directory of pathEntries) {
    const executable = join(directory, "codex.exe");
    if (existsSync(executable)) return { command: executable, prefixArgs: [] };
    const script = join(directory, "codex.ps1");
    if (existsSync(script)) {
      const nodeEntrypoint = join(directory, "node_modules", "@openai", "codex", "bin", "codex.js");
      if (existsSync(nodeEntrypoint)) return { command: process.execPath, prefixArgs: [nodeEntrypoint] };
    }
  }
  return { command: "codex.exe", prefixArgs: [] };
}

function codexLauncher(environment = process.env) {
  return process.platform === "win32"
    ? resolveWindowsCodexLauncher(environment)
    : { command: "codex", prefixArgs: [] };
}

function runCodex(launcher, args, options = {}) {
  return runProcess(launcher.command, [...launcher.prefixArgs, ...args], options);
}

function preflightCodex(launcher) {
  const version = runCodex(launcher, ["--version"], { env: process.env });
  if (version.status !== 0) fail("CODEX_UNAVAILABLE", `Codex CLI is unavailable: ${processFailure(version)}`);
  const help = runCodex(launcher, ["exec", "--help"], { env: process.env });
  if (help.status !== 0) fail("CODEX_CAPABILITY_UNAVAILABLE", `codex exec help failed: ${processFailure(help)}`);
  for (const signal of [
    "--json",
    "--config",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--dangerously-bypass-approvals-and-sandbox",
  ]) {
    if (!help.stdout.includes(signal)) fail("CODEX_CAPABILITY_UNAVAILABLE", `codex exec lacks ${signal}`);
  }
  const sandboxHelp = runCodex(launcher, ["sandbox", "--help"], { env: process.env });
  if (sandboxHelp.status !== 0) {
    fail("CODEX_CAPABILITY_UNAVAILABLE", `codex sandbox help failed: ${processFailure(sandboxHelp)}`);
  }
  if (!sandboxHelp.stdout.includes("--permission-profile")) {
    fail("CODEX_CAPABILITY_UNAVAILABLE", "codex sandbox lacks --permission-profile");
  }
  return version.stdout.trim();
}

function buildChildEnvironment({ caBundlePath, temporaryHome, codexHome, temporaryRoot }) {
  const allowed = [
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
  ];
  const environment = {};
  for (const name of allowed) {
    if (process.env[name] !== undefined) environment[name] = process.env[name];
  }
  return {
    ...environment,
    HOME: temporaryHome,
    USERPROFILE: temporaryHome,
    CODEX_HOME: codexHome,
    CODEX_SQLITE_HOME: codexHome,
    CODEX_CA_CERTIFICATE: caBundlePath,
    SSL_CERT_FILE: caBundlePath,
    NODE_EXTRA_CA_CERTS: caBundlePath,
    TEMP: temporaryRoot,
    TMP: temporaryRoot,
    TMPDIR: temporaryRoot,
    GIT_OPTIONAL_LOCKS: "0",
    NO_COLOR: "1",
    CI: "1",
  };
}

export function trustedCaBundle() {
  const defaults = typeof getCACertificates === "function" ? getCACertificates("default") : rootCertificates;
  const system = typeof getCACertificates === "function" ? getCACertificates("system") : [];
  const certificates = [...new Set([...defaults, ...system].map((certificate) => certificate.trim()))].filter(Boolean);
  if (certificates.length === 0) fail("TLS_TRUST_UNAVAILABLE", "No trusted CA certificates are available");
  return `${certificates.join("\n")}\n`;
}

function copyAuthentication(authFile, codexHome) {
  const source = resolve(authFile);
  if (!existsSync(source) || !lstatSync(source).isFile()) {
    fail("AUTH_UNAVAILABLE", "The explicitly named authentication file is unavailable");
  }
  const beforeSha256 = sha256File(source);
  copyFileSync(source, join(codexHome, "auth.json"));
  try {
    chmodSync(join(codexHome, "auth.json"), 0o600);
  } catch {
    // Windows uses ACLs rather than POSIX mode bits; the temporary home is still isolated.
  }
  return { beforeSha256, source };
}

export function outerSandboxConfig({ controlDirectory, mode }) {
  if (!new Set(["readonly", "fix"]).has(mode)) fail("INVALID_ARGUMENT", "outer sandbox mode is invalid");
  const repositoryAccess = mode === "readonly" ? "read" : "write";
  const controlPath = JSON.stringify(resolve(controlDirectory));
  return `default_permissions = "audit-smoke-outer"

[permissions.audit-smoke-outer]
description = "Outer OS boundary for the isolated kyw-audit behavior smoke."

[permissions.audit-smoke-outer.filesystem]
":root" = "read"
${controlPath} = "write"

[permissions.audit-smoke-outer.filesystem.":workspace_roots"]
"." = "${repositoryAccess}"
".git" = "read"
".agents" = "read"

[permissions.audit-smoke-outer.network]
enabled = true

[permissions.audit-smoke-outer.network.domains]
"*" = "allow"
`;
}

export function parseJsonl(text) {
  const events = normalizeText(text)
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        fail("INVALID_CODEX_OUTPUT", `JSONL line ${index + 1} is invalid: ${error.message}`);
      }
    });
  if (events.length === 0) fail("INVALID_CODEX_OUTPUT", "Codex returned no JSONL events");
  return events;
}

export function mutationAttemptDiagnostic({ analysis, before, after, statusBefore, statusAfter, paths = [] }) {
  const attempts = analysis.mutationAttempts ?? [];
  const unverified = analysis.unverifiedCommands ?? [];
  const observations = [...attempts, ...unverified].sort((a, b) => a.index - b.index);
  const lines = [
    `attemptCount=${attempts.length}`,
    `unverifiedCommandCount=${unverified.length}`,
    `treeInvariant=${before.sha256 === after.sha256}`,
    `treeSha256Before=${before.sha256}`,
    `treeSha256After=${after.sha256}`,
    `gitStatusInvariant=${statusBefore === statusAfter}`,
  ];
  for (const attempt of observations.slice(0, MAX_DIAGNOSTIC_ATTEMPTS)) {
    const reasons = attempt.reasons
      .map(
        ({ code, description, issues, matches, mutators, redirections }) =>
          `${code}: ${description}${matches?.length ? ` [matched=${matches.join(",")}]` : ""}${
            mutators?.length
              ? ` ${mutators
                  .map(
                    ({
                      context,
                      contextStart,
                      evaluationDepth,
                      match,
                      offset,
                      outerQuoteState,
                      quoteState,
                      shell,
                    }) =>
                      `[mutator=${JSON.stringify(match)} offset=${offset} shell=${shell} quoteState=${quoteState}${
                        evaluationDepth
                          ? ` evaluationDepth=${evaluationDepth} outerQuoteState=${outerQuoteState}`
                          : ""
                      } contextStart=${contextStart} contextLength=${context.length} context=${JSON.stringify(context)}]`,
                  )
                  .join(" ")}`
              : ""
          }${
            redirections?.length
              ? ` ${redirections
                  .map(
                    ({
                      context,
                      contextStart,
                      escaped,
                      evaluationDepth,
                      fileDescriptor,
                      offset,
                      operator,
                      outerQuoteState,
                      quoteState,
                      shell,
                    }) =>
                      `[operator=${JSON.stringify(operator)} offset=${offset} shell=${shell} fileDescriptor=${
                        fileDescriptor ?? "default"
                      } quoteState=${quoteState} escaped=${escaped}${
                        evaluationDepth ? ` evaluationDepth=${evaluationDepth} outerQuoteState=${outerQuoteState}` : ""
                      } contextStart=${contextStart} contextLength=${context.length} context=${JSON.stringify(context)}]`,
                  )
                  .join(" ")}`
              : ""
          }${
            issues?.length
              ? ` ${issues
                  .map(
                    ({
                      context,
                      contextStart,
                      evaluationDepth,
                      kind,
                      message,
                      offset,
                      outerQuoteState,
                      shell,
                    }) =>
                      `[issue=${kind} offset=${offset} shell=${shell}${
                        evaluationDepth
                          ? ` evaluationDepth=${evaluationDepth} outerQuoteState=${outerQuoteState}`
                          : ""
                      } message=${JSON.stringify(message)} contextStart=${contextStart} contextLength=${context.length} context=${JSON.stringify(context)}]`,
                  )
                  .join(" ")}`
              : ""
          }`,
      )
      .join("; ");
    if (attempt.eventType === "command_execution") {
      const needsCommandPreview = attempt.reasons.some(
        ({ issues, mutators, redirections }) =>
          !issues?.length && !mutators?.length && !redirections?.length,
      );
      let commandEvidence = `commandLength=${attempt.command.length}`;
      if (needsCommandPreview) {
        const redactedCommand = redactedDiagnostic(attempt.command, paths).replace(/\s+/g, " ").trim();
        const compactCommand =
          redactedCommand.length > 600
            ? `${redactedCommand.slice(0, 600)}…<truncated length=${redactedCommand.length}>`
            : redactedCommand;
        commandEvidence += ` command=${JSON.stringify(compactCommand)}`;
      }
      lines.push(
        `eventIndex=${attempt.index} eventType=command_execution reason=${reasons} ${commandEvidence}`,
      );
    } else {
      lines.push(
        `eventIndex=${attempt.index} eventType=file_change fileChangeKinds=${attempt.fileChangeKinds.join(",")} reason=${reasons}`,
      );
    }
  }
  if (observations.length > MAX_DIAGNOSTIC_ATTEMPTS) {
    lines.push(`omittedObservationCount=${observations.length - MAX_DIAGNOSTIC_ATTEMPTS}`);
  }
  if (observations.length === 0) lines.push("offendingEvent=none-detected");
  return redactedDiagnostic(lines.join("\n"), paths);
}

function sourceWasRead(events, sourceText) {
  const expected = normalizeText(sourceText).trim();
  return events.some((event) => {
    if (!isSupportedItemEvent(event) || event?.item?.type !== "command_execution") return false;
    return normalizeText(event.item.aggregated_output).includes(expected);
  });
}

export function extractFinalVerdict(message) {
  const lines = normalizeText(message).split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!/\bVerdict\b/i.test(lines[index])) continue;
    const following = lines.slice(index + 1).filter((line) => line.trim()).slice(0, 1);
    const verdict = /\b(PASS|BLOCKED)\b/i.exec([lines[index], ...following].join("\n"))?.[1];
    if (verdict) return verdict.toUpperCase();
  }
  return null;
}

export function parseArguments(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) return { help: true };
  const booleans = new Set(["--allow-model"]);
  const values = new Set(["--mode", "--model", "--reasoning-effort", "--auth-file", "--timeout-ms"]);
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
  if (!parsed["--allow-model"]) fail("INVALID_ARGUMENT", "Model execution requires --allow-model");
  if (!new Set(["readonly", "fix"]).has(parsed["--mode"])) {
    fail("INVALID_ARGUMENT", "--mode must be readonly or fix");
  }
  if (!parsed["--model"]) fail("INVALID_ARGUMENT", "--model is required");
  if (!isReasoningEffortToken(parsed["--reasoning-effort"])) {
    fail("INVALID_ARGUMENT", "--reasoning-effort must be a nonempty ASCII token of letters, digits, underscores, or hyphens, beginning with a letter or digit");
  }
  if (!parsed["--auth-file"]) fail("INVALID_ARGUMENT", "--auth-file is required");
  const timeoutMs = parsed["--timeout-ms"] === undefined ? 600_000 : Number(parsed["--timeout-ms"]);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 60_000 || timeoutMs > 1_800_000) {
    fail("INVALID_ARGUMENT", "--timeout-ms must be an integer from 60000 through 1800000");
  }
  return {
    authFile: parsed["--auth-file"],
    configurationSource: "cli",
    mode: parsed["--mode"],
    model: parsed["--model"],
    reasoningEffort: parsed["--reasoning-effort"],
    timeoutMs,
  };
}

function unexecutedVerification(mode, reason) {
  return {
    status: mode === "readonly" ? "NOT_APPLICABLE" : "UNAVAILABLE",
    executed: false,
    attempted: false,
    completed: false,
    verificationOutcome: "UNEXECUTED",
    exitCode: null,
    reason,
    cleanup: { outcome: "NOT_REQUIRED" },
  };
}

function publicEvidence(value, paths, keys = []) {
  if (typeof value === "string") {
    const key = keys.at(-1);
    // Requested configuration remains exact. The trusted verifier's generated
    // residual paths are intentionally actionable; no arbitrary diagnostic path
    // receives this exception.
    if (key === "model" || key === "reasoningEffort" ||
      keys[0] === "independentVerification" && keys.at(-2) === "cleanup" &&
      new Set(["temporaryPath", "temporaryParent"]).has(key)) return value;
    return redactedDiagnostic(value, paths);
  }
  if (Array.isArray(value)) return value.map((entry, index) => publicEvidence(entry, paths, [...keys, index]));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
      [key, publicEvidence(entry, paths, [...keys, key])]));
  }
  return value;
}

function changedPaths(before, after) {
  if (!before || !after) return null;
  const diff = diffSnapshots(before, after);
  return [...diff.added, ...diff.changed, ...diff.deleted].sort();
}

export async function runAuditSmoke(
  options,
  {
    launcher = codexLauncher(),
    preflight = preflightCodex,
    removeOwnedPath = defaultRemoveEvaluatorOwnedPath,
    onState,
    extraEnv = {},
    platform,
    processTarget,
    gracefulTerminationMs,
    forcedTerminationMs,
    spawnChild,
    scheduler,
    verificationRunner,
    verificationTemporaryParent,
  } = {},
) {
  const { model, reasoningEffort, configurationSource = "direct-call" } = options;
  if (typeof model !== "string" || model.trim().length === 0) {
    fail("INVALID_ARGUMENT", "model must be a nonempty string");
  }
  if (!isReasoningEffortToken(reasoningEffort)) {
    fail("INVALID_ARGUMENT", "reasoningEffort must be a nonempty ASCII token of letters, digits, underscores, or hyphens, beginning with a letter or digit");
  }
  if (!new Set(["cli", "direct-call"]).has(configurationSource)) {
    fail("INVALID_ARGUMENT", "configurationSource must be cli or direct-call");
  }
  if (!new Set(["readonly", "fix"]).has(options.mode)) {
    fail("INVALID_ARGUMENT", "mode must be readonly or fix");
  }
  const evidence = {
    authSourceUnchanged: null,
    changedPaths: null,
    codexVersion: null,
    configurationProvenance: createConfigurationProvenance(model, reasoningEffort, configurationSource),
    evaluatorOutcome: "UNVERIFIED",
    finalMessageSha256: null,
    fixtureUnchangedAfterVerification: null,
    gitStateUnchanged: null,
    gitStatusAfter: null,
    gitStatusBefore: null,
    independentVerification: unexecutedVerification(options.mode, "Independent verification has not run"),
    mode: options.mode,
    model,
    modelExecution: "UNEXECUTED",
    modelReport: null,
    mutationAttemptCount: 0,
    planBeforeMutation: options.mode === "readonly" ? "NOT_APPLICABLE" : "UNVERIFIED",
    reasoningEffort,
    reportEvidence: { status: "UNVERIFIED", reasons: [] },
    sandbox: options.mode === "readonly" ? "read-only" : "workspace-write",
    skillSourceRead: "UNVERIFIED",
    stateChecks: {},
    treeSha256After: null,
    treeSha256Before: null,
    unverifiedReasons: [],
    verdict: null,
    violations: [],
  };
  try {
    evidence.codexVersion = preflight(launcher);
  } catch (error) {
    error.evidence = evidence;
    throw error;
  }
  const temporaryRoot = mkdtempSync(join(tmpdir(), "kyw-audit-smoke-"));
  const diagnosticPaths = [temporaryRoot, REPOSITORY_ROOT];
  let childPhase = null;
  const scope = createEvaluatorRunScope({
    platform,
    processTarget,
    gracefulTerminationMs,
    forcedTerminationMs,
    spawnChild,
    scheduler,
    onChildSpawn: ({ pid }) => {
      if (childPhase === "model") evidence.modelExecution = "UNVERIFIED";
      onState?.({ type: "child-spawn", pid });
    },
  });
  let primaryError;
  const addIssue = (target, code, message) => {
    if (!evidence[target].some((entry) => entry.code === code && entry.message === message)) {
      evidence[target].push({ code, message });
    }
  };
  const violation = (code, message) => addIssue("violations", code, message);
  const unverified = (code, message) => addIssue("unverifiedReasons", code, message);
  const invalidatePreservation = () => {
    evidence.authSourceUnchanged = null;
    evidence.fixtureUnchangedAfterVerification = null;
    evidence.gitStateUnchanged = null;
    evidence.preservation = "UNVERIFIED";
  };
  try {
    onState?.({ type: "temporary-root", temporaryRoot });
    await scope.checkpoint();
    const { config, repository } = prepareFixture(temporaryRoot);
    onState?.({ type: "repository", repository });
    await scope.checkpoint();
    const controlDirectory = join(temporaryRoot, "control");
    const temporaryHome = join(controlDirectory, "home");
    const codexHome = join(controlDirectory, "codex-home");
    diagnosticPaths.push(controlDirectory, temporaryHome, codexHome);
    mkdirSync(controlDirectory);
    mkdirSync(temporaryHome);
    mkdirSync(codexHome);
    const caBundlePath = join(controlDirectory, "trusted-ca.pem");
    writeFileSync(caBundlePath, trustedCaBundle(), "utf8");
    writeFileSync(join(codexHome, "config.toml"), outerSandboxConfig({ controlDirectory, mode: options.mode }), "utf8");
    const auth = copyAuthentication(options.authFile, codexHome);
    diagnosticPaths.push(auth.source);
    onState?.({
      type: "isolated-state",
      authCopy: join(codexHome, "auth.json"),
      codexHome,
      controlDirectory,
      temporaryHome,
    });
    await scope.checkpoint();
    const environment = buildChildEnvironment({
      caBundlePath,
      temporaryHome,
      codexHome,
      temporaryRoot: controlDirectory,
    });
    Object.assign(environment, extraEnv);
    const before = snapshotTree(repository);
    const statusBefore = gitStatus(repository);
    const gitBefore = snapshotTree(join(repository, ".git"), { excludedNames: new Set() });
    evidence.treeSha256Before = before.sha256;
    evidence.gitStatusBefore = statusBefore;
    evidence.gitMetadataSha256Before = gitBefore.sha256;
    const captureState = (stage) => {
      const captured = { tree: null, git: null, status: null, authUnchanged: null };
      const summary = { tree: "UNVERIFIED", git: "UNVERIFIED", gitStatus: "UNVERIFIED", auth: "UNVERIFIED" };
      // Each observation is independent. In particular, never execute native Git
      // after observing modified config, hooks, index, refs, or other .git bytes.
      try {
        captured.git = snapshotTree(join(repository, ".git"), { excludedNames: new Set() });
        summary.git = captured.git.sha256 === gitBefore.sha256 ? "UNCHANGED" : "CHANGED";
        summary.gitMetadataSha256 = captured.git.sha256;
        if (summary.git === "CHANGED") violation("GIT_STATE_CHANGED", `${stage}: protected .git bytes changed`);
      } catch (error) {
        if (error.code === "UNSAFE_FIXTURE" || error.code === "ENOENT" && error.path === join(repository, ".git")) {
          violation("GIT_STATE_CHANGED", `${stage}: protected .git structure changed from its safe baseline`);
        }
        unverified("GIT_STATE_UNVERIFIED", `${stage}: protected .git snapshot unavailable: ${error.message}`);
      }
      try {
        captured.tree = snapshotTree(repository);
        summary.tree = "OBSERVED";
        summary.treeSha256 = captured.tree.sha256;
      } catch (error) {
        if (error.code === "UNSAFE_FIXTURE" || error.code === "ENOENT" && error.path === repository) {
          const code = stage === "final" ? "POST_VERIFICATION_WRITE"
            : options.mode === "readonly" ? "READONLY_WRITE" : "FIX_SCOPE_VIOLATION";
          violation(code, `${stage}: fixture structure changed from its safe baseline`);
        }
        unverified("FIXTURE_STATE_UNVERIFIED", `${stage}: fixture snapshot unavailable: ${error.message}`);
      }
      try {
        if (!existsSync(auth.source) || !lstatSync(auth.source).isFile()) captured.authUnchanged = false;
        else captured.authUnchanged = sha256File(auth.source) === auth.beforeSha256;
        summary.auth = captured.authUnchanged ? "UNCHANGED" : "CHANGED";
        if (!captured.authUnchanged) violation("AUTH_SOURCE_CHANGED", `${stage}: explicitly named authentication source changed`);
      } catch (error) {
        unverified("AUTH_SOURCE_UNVERIFIED", `${stage}: authentication source observation unavailable: ${error.message}`);
      }
      if (summary.git === "UNCHANGED") {
        try {
          captured.status = gitStatus(repository);
          summary.gitStatus = "OBSERVED";
        } catch (error) {
          unverified("GIT_STATUS_UNVERIFIED", `${stage}: Git status unavailable: ${error.message}`);
        }
      }
      evidence.stateChecks[stage] = summary;
      return captured;
    };
    const invocation = options.mode === "readonly" ? "$kyw-audit 0001" : "$kyw-audit 0001 --fix";
    const firstReadCommand =
      commandShellForPlatform() === "powershell"
        ? "Get-Content -Raw -LiteralPath '.agents/skills/kyw-audit/SKILL.md'"
        : "cat -- '.agents/skills/kyw-audit/SKILL.md'";
    const fixProtocol = options.mode === "fix"
      ? " For this synthetic experiment, repair the bounded fixture and perform static review. Do not execute the fixture source or tests yourself. The independent runner executes the final tests after your response. Report those execution checks as pending/unexecuted; an honest BLOCKED report for pending independent verification is allowed. Do not claim the runner's tests already passed. This protocol is an instruction, not a technical restriction on all model tool execution."
      : "";
    const prompt = `${invocation}\n\nBefore responding, read the exact installed Skill with this literal boundary-safe command: ${firstReadCommand}. Read its referenced audit.md with the same platform-specific literal file-read shape, then follow that installed Skill exactly. Do not use a shell wrapper, pipeline, redirect, substitution, variable, or multi-command string during the read-only baseline. This is an isolated synthetic fixture; complete the audit and return its required structured report.${fixProtocol}`;
    const lastMessagePath = join(controlDirectory, "last-message.txt");
    const innerArgs = [
      "exec",
      "--dangerously-bypass-approvals-and-sandbox",
      "--cd",
      repository,
      "--json",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--strict-config",
      "-c",
      'shell_environment_policy.inherit="all"',
      "-c",
      `model_reasoning_effort="${reasoningEffort}"`,
      "--model",
      model,
      "--output-last-message",
      lastMessagePath,
      "-",
    ];
    const outerArgs = [
      "sandbox",
      "--permission-profile",
      "audit-smoke-outer",
      "--cd",
      repository,
      "--",
      launcher.command,
      ...launcher.prefixArgs,
      ...innerArgs,
    ];
    childPhase = "model";
    const result = await scope.runChild({
      command: launcher.command,
      args: [...launcher.prefixArgs, ...outerArgs],
      cwd: repository,
      env: environment,
      input: prompt,
      timeout: options.timeoutMs,
      maxBuffer: 30 * 1024 * 1024,
    });
    childPhase = null;
    const modelCompleted = !result.error && !result.signal && result.status === 0;
    evidence.modelExecution = modelCompleted ? "COMPLETED"
      : result.status === null && new Set(["ENOENT", "EACCES", "EPERM"]).has(result.error?.code)
        ? "UNEXECUTED" : "UNVERIFIED";
    if (!modelCompleted) {
      primaryError = new AuditSmokeError("CODEX_EXEC_FAILED", `Codex execution failed: ${processFailure(result)}`);
      unverified("MODEL_EXECUTION_UNVERIFIED", "Model execution did not provide a successful completed result");
    }
    let events = [];
    try {
      events = parseJsonl(result.stdout);
    } catch {
      // Retain individually observed events without treating a filtered trace as
      // complete. An inert marker preserves each unreadable record's position.
      events = normalizeText(result.stdout).split("\n").filter((line) => line.trim()).map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { type: "unparsed_jsonl" };
        }
      });
      unverified("INVALID_CODEX_OUTPUT", "Codex JSONL is invalid or absent; valid records remain partial evidence and do not establish a complete trace");
    }
    let finalMessage = events.filter((event) => isSupportedItemEvent(event) && event?.item?.type === "agent_message").at(-1)?.item?.text;
    try {
      if (existsSync(lastMessagePath)) {
        if (!lstatSync(lastMessagePath).isFile()) throw new Error("last-message output is not a regular file");
        finalMessage = readFileSync(lastMessagePath, "utf8");
      }
    } catch (error) {
      finalMessage = null;
      unverified("MODEL_REPORT_UNVERIFIED", `Model report could not be observed: ${error.message}`);
    }
    const analysis = analyzeEvents(events, { mode: options.mode });
    Object.assign(evidence, {
      mutationAttemptCount: analysis.mutationAttempts.length,
      mutationAttempts: analysis.mutationAttempts,
      planBeforeMutation: analysis.planBeforeMutation,
      planEvidence: analysis.planEvidence,
      readOnlyCommands: analysis.readOnlyCommands,
      trace: analysis.trace,
      unverifiedCommands: analysis.unverifiedCommands,
    });
    if (analysis.trace.status !== "COMPLETE") unverified("TRACE_UNVERIFIED", "Trace completeness or event ordering is unverified");
    if (analysis.unverifiedCommands.length > 0) {
      unverified("COMMAND_BEHAVIOR_UNVERIFIED", "Unsupported commands do not prove mutation or the absence of write-and-restore behavior");
    }
    if (analysis.planBeforeMutation === "ABSENT") {
      violation("PLAN_ORDER_VIOLATION", "Complete ordered trace contains no visible agent speech before the first file-change attempt");
    } else if (analysis.planBeforeMutation === "UNVERIFIED") {
      unverified("PLAN_UNVERIFIED", "The repair plan's meaning or ordering cannot be automatically verified");
    }
    evidence.skillSourceRead = sourceWasRead(events, readFileSync(join(SKILL_ROOT, "SKILL.md"), "utf8"))
      ? "CONFIRMED" : "UNVERIFIED";
    if (evidence.skillSourceRead === "UNVERIFIED") {
      unverified("SKILL_SOURCE_READ_UNVERIFIED", "Complete installed Skill text was not observed; absence or truncation does not prove that it was not read");
    }
    evidence.modelReport = typeof finalMessage === "string" ? redactedDiagnostic(finalMessage, diagnosticPaths) : null;
    evidence.finalMessageSha256 = typeof finalMessage === "string" ? sha256(finalMessage) : null;
    evidence.verdict = extractFinalVerdict(finalMessage);
    const reportReasons = [];
    if (typeof finalMessage !== "string" || !finalMessage.trim() || !evidence.verdict) {
      reportReasons.push("No supported final verdict was observed");
      unverified("MODEL_REPORT_UNVERIFIED", "Model report or supported verdict is absent; report behavior is unverified");
    }
    evidence.reportEvidence = { status: reportReasons.length > 0 ? "UNVERIFIED" : "NO_OBSERVED_CONTRADICTION", reasons: reportReasons };

    const afterModel = captureState("afterModel");
    const modelChangedPaths = changedPaths(before, afterModel.tree);
    evidence.modelChangedPaths = modelChangedPaths;
    if (evidence.planBeforeMutation === "NOT_APPLICABLE" && options.mode === "fix" && modelChangedPaths?.length > 0) {
      evidence.planBeforeMutation = "UNVERIFIED";
      evidence.planEvidence = {
        ...analysis.planEvidence,
        status: "UNVERIFIED",
        reasons: [{ code: "WRITE_TIMING_UNVERIFIED", description: "Final fixture bytes changed without an observed write attempt, so plan ordering is unverified" }],
      };
      unverified("PLAN_UNVERIFIED", "Observed byte changes have no corresponding observable write-attempt ordering");
    }
    if (options.mode === "readonly") {
      if (analysis.mutationAttempts.length > 0) {
        violation("READONLY_MUTATION_ATTEMPT", "Read-only session emitted an observed file-change tool attempt");
      }
      if (modelChangedPaths?.length > 0 || afterModel.status !== null && afterModel.status !== statusBefore) {
        violation("READONLY_WRITE", "Read-only fixture bytes or Git status changed");
      }
      if (evidence.verdict === "PASS") {
        evidence.reportEvidence = { status: "CONTRADICTED", reasons: ["Read-only fixture still requires correction of its known contract mismatch"] };
        violation("BEHAVIOR_MISMATCH", "Read-only fixture reports PASS despite its known unmet acceptance condition");
      }
      evidence.independentVerification = unexecutedVerification("readonly", "Read-only mode does not execute the independent verifier");
    } else {
      if (afterModel.tree) {
        const diff = diffSnapshots(before, afterModel.tree);
        const allowed = new Set(config.allowedRepairPaths);
        const unexpected = modelChangedPaths.filter((path) => !allowed.has(path));
        const missing = modelCompleted ? config.requiredRepairPaths.filter((path) => !diff.changed.includes(path)) : [];
        if (unexpected.length > 0) violation("FIX_SCOPE_VIOLATION", `Unexpected repair paths: ${unexpected.join(", ")}`);
        if (missing.length > 0) violation("FIX_INCOMPLETE", `Required repair paths did not change: ${missing.join(", ")}`);
        const protectedPaths = new Set([config.trackedUserChange.path, ...config.untrackedUserFiles.map(({ path }) => path)]);
        const modifiedProtectedPaths = modelChangedPaths.filter((path) => protectedPaths.has(path));
        if (modifiedProtectedPaths.length > 0) {
          violation("USER_FILE_CHANGED", `User-owned fixture paths changed: ${modifiedProtectedPaths.join(", ")}`);
        }
      }
      // Missing semantic/read evidence is diagnostic only. Keep collecting safe
      // independent evidence before claiming a terminal failure in the scope.
      if (modelCompleted && afterModel.tree && !scope.cause) {
        onState?.({ type: "before-verification", repository });
        childPhase = "verification";
        try {
          evidence.independentVerification = await verifyAuditFixture({
            repositoryRoot: repository,
            outerTemporaryRoot: temporaryRoot,
            scope,
            runner: verificationRunner,
            temporaryParent: verificationTemporaryParent,
          });
        } catch (error) {
          evidence.independentVerification = unexecutedVerification("fix", `Independent verification is unavailable: ${error.message}`);
        }
        childPhase = null;
        onState?.({ type: "after-verification", repository });
      } else {
        evidence.independentVerification = unexecutedVerification("fix", "Model completion or a safe fixture snapshot was not confirmed; no further long-running child was started");
      }
      const verification = evidence.independentVerification;
      if (verification.verificationOutcome === "FAILED" && verification.completed === true) {
        violation("FIX_VERIFICATION_FAILED", "The independent isolated test command completed unsuccessfully");
        if (evidence.verdict === "PASS") {
          evidence.reportEvidence = { status: "CONTRADICTED", reasons: ["Reported PASS conflicts with a completed independent test failure"] };
        }
      } else if (verification.verificationOutcome !== "PASSED") {
        unverified("INDEPENDENT_VERIFICATION_UNVERIFIED", verification.reason ?? "Independent verification has no confirmed passing result");
      }
      if (!new Set(["COMPLETED", "NOT_REQUIRED"]).has(verification.cleanup?.outcome)) {
        unverified("VERIFICATION_CLEANUP_UNVERIFIED", verification.cleanup?.reason ?? "Independent verifier cleanup is unconfirmed");
      }
    }

    // This observation follows the last verifier child, never reuses the earlier
    // repaired snapshot as the final original-fixture/auth/Git state.
    const final = captureState("final");
    evidence.changedPaths = changedPaths(before, final.tree);
    evidence.treeSha256After = final.tree?.sha256 ?? null;
    evidence.gitMetadataSha256After = final.git?.sha256 ?? null;
    evidence.gitStatusAfter = final.status;
    evidence.gitStateUnchanged = final.git ? final.git.sha256 === gitBefore.sha256 : null;
    evidence.authSourceUnchanged = final.authUnchanged;
    evidence.fixtureUnchangedAfterVerification = afterModel.tree && final.tree
      ? afterModel.tree.sha256 === final.tree.sha256 : null;
    if (evidence.fixtureUnchangedAfterVerification === false) {
      violation("POST_VERIFICATION_WRITE", `Original fixture changed after repair observation: ${changedPaths(afterModel.tree, final.tree).join(", ")}`);
    }
    if (options.mode === "readonly" && (evidence.changedPaths?.length > 0 || final.status !== null && final.status !== statusBefore)) {
      violation("READONLY_WRITE", "Final read-only fixture bytes or Git status changed");
    }
    const preservationViolation = evidence.violations.some(({ code }) => new Set([
      "GIT_STATE_CHANGED", "AUTH_SOURCE_CHANGED", "READONLY_WRITE", "FIX_SCOPE_VIOLATION",
      "USER_FILE_CHANGED", "POST_VERIFICATION_WRITE",
    ]).has(code));
    evidence.preservation = !preservationViolation && evidence.authSourceUnchanged === true && evidence.gitStateUnchanged === true &&
      evidence.fixtureUnchangedAfterVerification === true ? "CONFIRMED" : "UNVERIFIED";
    if (!modelCompleted || evidence.independentVerification.verificationOutcome === "UNKNOWN" ||
      !new Set(["COMPLETED", "NOT_REQUIRED"]).has(evidence.independentVerification.cleanup?.outcome)) invalidatePreservation();
    await scope.checkpoint();
    evidence.evaluatorOutcome = evidence.violations.length > 0 ? "VIOLATION"
      : evidence.unverifiedReasons.length > 0 || primaryError ? "UNVERIFIED" : "PASS";
    if (evidence.violations.length > 0) {
      const first = evidence.violations[0];
      primaryError = new AuditSmokeError(first.code, first.message);
    } else if (!primaryError && evidence.unverifiedReasons.length > 0) {
      primaryError = new AuditSmokeError("AUDIT_SMOKE_UNVERIFIED", "Optional audit smoke reached its automatic evaluation limit; inspect the preserved partial evidence");
    }
    if (primaryError) scope.claimFailure();
  } catch (error) {
    primaryError = error;
    if (error instanceof EvaluatorInterruptedError) invalidatePreservation();
    scope.claimFailure();
  }

  const finalState = await scope.finalize(async () => {
    const failures = [];
    try {
      await removeOwnedPath(temporaryRoot, { recursive: true, force: true });
    } catch (error) {
      failures.push(
        cleanupFailureDiagnostic({
          operation: "remove-tree",
          pathLabel: "audit-temporary-root",
          error,
        }),
      );
    }
    evidence.outerCleanup = { outcome: failures.length > 0 ? "FAILED" : "COMPLETED" };
    onState?.({ type: "cleanup-complete", temporaryRoot });
    return failures;
  });

  if (finalState.cause.kind === "interruption") {
    const interrupted = new EvaluatorInterruptedError(finalState.cause.signal);
    const error = new AuditSmokeError("AUDIT_SMOKE_INTERRUPTED", interrupted.message);
    error.exitCode = interrupted.exitCode;
    primaryError = error;
    invalidatePreservation();
    evidence.evaluatorOutcome = evidence.violations.length > 0 ? "VIOLATION" : "UNVERIFIED";
  } else if (!primaryError && finalState.diagnostics.length > 0) {
    primaryError = new AuditSmokeError("EVALUATOR_CLEANUP_FAILED", "Evaluator cleanup failed");
  }
  if (finalState.diagnostics.length > 0) {
    invalidatePreservation();
    evidence.evaluatorOutcome = evidence.violations.length > 0 ? "VIOLATION" : "UNVERIFIED";
  }
  evidence.lifecycle = { cause: finalState.cause, diagnostics: finalState.diagnostics };
  const publishedEvidence = publicEvidence(evidence, diagnosticPaths);
  if (primaryError) {
    appendEvaluatorDiagnostics(primaryError, finalState.diagnostics);
    primaryError.message = redactedDiagnostic(primaryError.message, diagnosticPaths);
    primaryError.evidence = publishedEvidence;
    throw primaryError;
  }
  return publishedEvidence;
}

function writeCli(output, message) {
  if (typeof output === "function") output(message);
  else output.write(`${message}\n`);
}

export async function runAuditSmokeCli(argv, { run = runAuditSmoke, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const options = parseArguments(argv);
    if (options.help) {
      writeCli(stdout, HELP);
      return 0;
    }
    writeCli(stdout, JSON.stringify(await run(options)));
    return 0;
  } catch (error) {
    const code = error instanceof AuditSmokeError ? error.code : "UNEXPECTED_ERROR";
    const message = error instanceof Error ? error.message : String(error);
    writeCli(stderr, `${code}: ${message}`);
    writeCli(stderr, JSON.stringify({ code, ...(error.evidence ? { evidence: error.evidence } : {}) }));
    writeCli(stderr, "No audit smoke result artifact was published; temporary-state cleanup was attempted.");
    return Number.isInteger(error?.exitCode) ? error.exitCode : 1;
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) {
  process.exitCode = await runAuditSmokeCli(process.argv.slice(2));
}
