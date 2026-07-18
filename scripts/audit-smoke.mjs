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
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { getCACertificates, rootCertificates } from "node:tls";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-audit");
const FIXTURE_PROJECT = join(FIXTURE_ROOT, "fresh-session-project");
const FIXTURE_CONFIG = join(FIXTURE_ROOT, "fresh-session.json");
const SKILL_ROOT = join(REPOSITORY_ROOT, "skills", "kyw-audit");
const REASONING_EFFORTS = new Set(["minimal", "low", "medium", "high", "xhigh"]);
const MUTATING_COMMAND_PATTERN =
  /(?:^|[\s;&|])(set-content|add-content|out-file|remove-item|move-item|copy-item|new-item|mkdir|md|rm|rmdir|del|erase|mv|cp|touch|tee|apply_patch|sed\s+-i|npm\s+(?:install|ci|update|publish)|git\s+(?:add|am|apply|checkout|cherry-pick|clean|commit|merge|mv|rebase|reset|restore|rm|switch|tag|push))(?:\s|$)/i;
const OUTPUT_REDIRECTION_PATTERN = /(?:^|[^2])(>{1,2})(?!&1)/;
const MAX_DIAGNOSTIC_ATTEMPTS = 8;
const MAX_DIAGNOSTIC_COMMAND_LENGTH = 600;

const HELP = `kyw-audit fresh-session behavior smoke

Usage:
  node ./scripts/audit-smoke.mjs --allow-model --mode <readonly|fix> --model <model> --reasoning-effort <effort> --auth-file <path>

The runner uses one temporary Git repository, one repository-local kyw-audit Skill,
an isolated HOME/CODEX_HOME, and no retained result artifact. Read-only mode uses
an outer read-only OS sandbox; fix mode gives that outer sandbox write access only
to the synthetic fixture and isolated control directory.`;

export class AuditSmokeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuditSmokeError";
    this.code = code;
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

function prepareFixture(temporaryRoot) {
  const repository = join(temporaryRoot, "repository");
  copyTree(FIXTURE_PROJECT, repository, "audit fixture");
  const installedSkill = join(repository, ".agents", "skills", "kyw-audit");
  mkdirSync(dirname(installedSkill), { recursive: true });
  copyTree(SKILL_ROOT, installedSkill, "kyw-audit Skill");

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

function commandText(event) {
  const command = event?.item?.command;
  return typeof command === "string" ? command : JSON.stringify(command ?? "");
}

function commandMutationReasons(command) {
  const reasons = [];
  const mutatingMatches = [
    ...command.matchAll(new RegExp(MUTATING_COMMAND_PATTERN.source, `${MUTATING_COMMAND_PATTERN.flags}g`)),
  ].map((match) => match[1]);
  if (mutatingMatches.length > 0) {
    reasons.push({
      code: "MUTATING_COMMAND_GRAMMAR",
      description: "command text matched the detector's mutating executable or subcommand grammar",
      matches: [...new Set(mutatingMatches)],
    });
  }
  const redirectionMatches = [
    ...command.matchAll(new RegExp(OUTPUT_REDIRECTION_PATTERN.source, `${OUTPUT_REDIRECTION_PATTERN.flags}g`)),
  ].map((match) => match[1]);
  if (redirectionMatches.length > 0) {
    reasons.push({
      code: "OUTPUT_REDIRECTION_GRAMMAR",
      description: "command text matched shell output redirection that can write a file",
      matches: [...new Set(redirectionMatches)],
    });
  }
  return reasons;
}

function fileChangeKinds(event) {
  const candidates = [];
  for (const change of Array.isArray(event?.item?.changes) ? event.item.changes : []) {
    candidates.push(change?.kind, change?.type, change?.operation);
  }
  candidates.push(event?.item?.kind, event?.item?.change_type, event?.item?.operation);
  const kinds = [...new Set(candidates.filter((value) => typeof value === "string" && value.trim()))];
  return kinds.length > 0 ? kinds : ["file_change"];
}

export function analyzeEvents(events) {
  const messages = [];
  const fileChanges = [];
  const mutatingCommands = [];
  const commands = [];
  events.forEach((event, index) => {
    if (event?.item?.type === "agent_message" && typeof event.item.text === "string") {
      messages.push({ index, text: event.item.text });
    }
    if (event?.item?.type === "file_change") {
      fileChanges.push({
        eventType: "file_change",
        fileChangeKinds: fileChangeKinds(event),
        index,
        reasons: [
          {
            code: "FILE_CHANGE_EVENT",
            description: "Codex emitted a file_change event",
          },
        ],
      });
    }
    if (event?.item?.type === "command_execution") {
      const command = commandText(event);
      commands.push({ index, command });
      const reasons = commandMutationReasons(command);
      if (reasons.length > 0) {
        mutatingCommands.push({ command, eventType: "command_execution", index, reasons });
      }
    }
  });
  const mutationAttempts = [...fileChanges, ...mutatingCommands].sort((a, b) => a.index - b.index);
  const mutationIndices = mutationAttempts.map(({ index }) => index);
  const firstMutationIndex = mutationIndices[0] ?? null;
  const planMessages = messages.filter(
    ({ text }) => /(?:bounded\s+)?repair plan|수리 계획/i.test(text) && /F-\d{2}/i.test(text),
  );
  const planBeforeMutation =
    firstMutationIndex !== null && planMessages.some(({ index }) => index < firstMutationIndex);
  return {
    commands,
    fileChanges,
    firstMutationIndex,
    messages,
    mutatingCommands,
    mutationAttempts,
    planBeforeMutation,
    planMessages,
  };
}

export function mutationAttemptDiagnostic({ analysis, before, after, statusBefore, statusAfter, paths = [] }) {
  const attempts = analysis.mutationAttempts ?? [];
  const lines = [
    `attemptCount=${attempts.length}`,
    `treeInvariant=${before.sha256 === after.sha256}`,
    `treeSha256Before=${before.sha256}`,
    `treeSha256After=${after.sha256}`,
    `gitStatusInvariant=${statusBefore === statusAfter}`,
  ];
  for (const attempt of attempts.slice(0, MAX_DIAGNOSTIC_ATTEMPTS)) {
    const reasons = attempt.reasons
      .map(
        ({ code, description, matches }) =>
          `${code}: ${description}${matches?.length ? ` [matched=${matches.join(",")}]` : ""}`,
      )
      .join("; ");
    if (attempt.eventType === "command_execution") {
      const redactedCommand = redactedDiagnostic(attempt.command, paths).replace(/\s+/g, " ").trim();
      const compactCommand =
        redactedCommand.length > MAX_DIAGNOSTIC_COMMAND_LENGTH
          ? `${redactedCommand.slice(0, MAX_DIAGNOSTIC_COMMAND_LENGTH)}…<truncated length=${redactedCommand.length}>`
          : redactedCommand;
      lines.push(
        `eventIndex=${attempt.index} eventType=command_execution reason=${reasons} command=${JSON.stringify(compactCommand)}`,
      );
    } else {
      lines.push(
        `eventIndex=${attempt.index} eventType=file_change fileChangeKinds=${attempt.fileChangeKinds.join(",")} reason=${reasons}`,
      );
    }
  }
  if (attempts.length > MAX_DIAGNOSTIC_ATTEMPTS) {
    lines.push(`omittedAttemptCount=${attempts.length - MAX_DIAGNOSTIC_ATTEMPTS}`);
  }
  if (attempts.length === 0) lines.push("offendingEvent=none-detected");
  return redactedDiagnostic(lines.join("\n"), paths);
}

function sourceWasRead(events, sourceText) {
  const expected = normalizeText(sourceText).trim();
  return events.some((event) => {
    if (event?.item?.type !== "command_execution") return false;
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

function fixtureTest(repository) {
  return runProcess(process.execPath, ["--test"], {
    cwd: repository,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    timeout: 60_000,
  });
}

function assertReportSignals(message, signals) {
  for (const signal of signals) {
    if (!message.includes(signal)) fail("BEHAVIOR_MISMATCH", `Final report lacks required signal: ${signal}`);
  }
}

function planOrderDiagnostic(events, analysis) {
  const cutoff = analysis.firstMutationIndex ?? events.length;
  return events
    .map((event, index) => ({ event, index }))
    .filter(({ event, index }) =>
      index <= cutoff && new Set(["agent_message", "command_execution", "file_change"]).has(event?.item?.type),
    )
    .slice(-12)
    .map(({ event, index }) => {
      if (event.item.type === "agent_message") return `[${index}] message: ${event.item.text}`;
      if (event.item.type === "command_execution") return `[${index}] command: ${commandText(event)}`;
      return `[${index}] file_change: ${JSON.stringify(event.item)}`;
    })
    .join("\n");
}

function assertPreservedPaths(before, after, paths) {
  const beforeFiles = new Map(before.files.map((entry) => [entry.path, entry.sha256]));
  const afterFiles = new Map(after.files.map((entry) => [entry.path, entry.sha256]));
  for (const path of paths) {
    if (beforeFiles.get(path) !== afterFiles.get(path)) {
      fail("FIX_SCOPE_VIOLATION", `Unrelated fixture path changed: ${path}`);
    }
  }
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
  if (!REASONING_EFFORTS.has(parsed["--reasoning-effort"])) {
    fail("INVALID_ARGUMENT", "--reasoning-effort must be minimal, low, medium, high, or xhigh");
  }
  if (!parsed["--auth-file"]) fail("INVALID_ARGUMENT", "--auth-file is required");
  const timeoutMs = parsed["--timeout-ms"] === undefined ? 600_000 : Number(parsed["--timeout-ms"]);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 60_000 || timeoutMs > 1_800_000) {
    fail("INVALID_ARGUMENT", "--timeout-ms must be an integer from 60000 through 1800000");
  }
  return {
    authFile: parsed["--auth-file"],
    mode: parsed["--mode"],
    model: parsed["--model"],
    reasoningEffort: parsed["--reasoning-effort"],
    timeoutMs,
  };
}

export function runAuditSmoke(options) {
  const launcher = codexLauncher();
  const codexVersion = preflightCodex(launcher);
  const temporaryRoot = mkdtempSync(join(tmpdir(), "kyw-audit-smoke-"));
  const diagnosticPaths = [temporaryRoot, REPOSITORY_ROOT];
  try {
    const { config, repository } = prepareFixture(temporaryRoot);
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
    const environment = buildChildEnvironment({
      caBundlePath,
      temporaryHome,
      codexHome,
      temporaryRoot: controlDirectory,
    });
    const before = snapshotTree(repository);
    const statusBefore = gitStatus(repository);
    const invocation = options.mode === "readonly" ? "$kyw-audit 0001" : "$kyw-audit 0001 --fix";
    const prompt = `${invocation}\n\nBefore responding, use a read-only command to read the exact installed Skill at .agents/skills/kyw-audit/SKILL.md and its referenced audit.md. Follow that installed Skill exactly. This is an isolated synthetic fixture; complete the audit and return its required structured report.`;
    const lastMessagePath = join(controlDirectory, "last-message.txt");
    const sandbox = options.mode === "readonly" ? "read-only" : "workspace-write";
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
      `model_reasoning_effort="${options.reasoningEffort}"`,
      "--model",
      options.model,
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
    const result = runCodex(launcher, outerArgs, {
      cwd: repository,
      env: environment,
      input: prompt,
      timeout: options.timeoutMs,
    });
    if (result.status !== 0) fail("CODEX_EXEC_FAILED", `Codex execution failed: ${processFailure(result)}`);
    const events = parseJsonl(result.stdout);
    const finalMessage = existsSync(lastMessagePath)
      ? readFileSync(lastMessagePath, "utf8")
      : events.filter((event) => event?.item?.type === "agent_message").at(-1)?.item?.text;
    if (!finalMessage?.trim()) fail("INVALID_CODEX_OUTPUT", "Codex returned no final message");
    const analysis = analyzeEvents(events);
    const after = snapshotTree(repository);
    const statusAfter = gitStatus(repository);
    const diff = diffSnapshots(before, after);
    const skillRead = sourceWasRead(events, readFileSync(join(SKILL_ROOT, "SKILL.md"), "utf8"));
    if (!skillRead) fail("SKILL_NOT_READ", "Fresh session lacks observable installed Skill source-read proof");
    if (!existsSync(auth.source) || sha256File(auth.source) !== auth.beforeSha256) {
      fail("AUTH_SOURCE_CHANGED", "The explicitly named authentication source changed");
    }

    const verdict = extractFinalVerdict(finalMessage);
    if (options.mode === "readonly") {
      assertReportSignals(finalMessage, config.readOnlyReportSignals);
      if (verdict !== "BLOCKED") {
        fail(
          "BEHAVIOR_MISMATCH",
          `Read-only fixture expected BLOCKED, received ${verdict ?? "none"}. Report:\n${redactedDiagnostic(finalMessage, [repository, temporaryRoot, auth.source])}`,
        );
      }
      const diagnostic = mutationAttemptDiagnostic({
        after,
        analysis,
        before,
        paths: diagnosticPaths,
        statusAfter,
        statusBefore,
      });
      if (analysis.fileChanges.length > 0 || analysis.mutatingCommands.length > 0) {
        fail(
          "READONLY_MUTATION_ATTEMPT",
          `Read-only session attempted a mutating tool or command.\n${diagnostic}`,
        );
      }
      if (before.sha256 !== after.sha256 || statusBefore !== statusAfter) {
        fail("READONLY_WRITE", `Read-only fixture state changed.\n${diagnostic}`);
      }
    } else {
      assertReportSignals(finalMessage, config.fixReportSignals);
      if (verdict !== "PASS") {
        fail(
          "BEHAVIOR_MISMATCH",
          `Fix fixture expected PASS, received ${verdict ?? "none"}; changed paths: ${[
            ...diff.added,
            ...diff.changed,
            ...diff.deleted,
          ].join(", ") || "none"}; plan before mutation: ${analysis.planBeforeMutation}. Report:\n${redactedDiagnostic(finalMessage, [repository, temporaryRoot, auth.source])}`,
        );
      }
      if (!analysis.planBeforeMutation) {
        fail(
          "PLAN_ORDER_VIOLATION",
          `No finding-specific repair plan preceded the first mutation. Event trace:\n${redactedDiagnostic(
            planOrderDiagnostic(events, analysis),
            [repository, temporaryRoot, auth.source],
          )}`,
        );
      }
      const allChangedPaths = [...diff.added, ...diff.changed, ...diff.deleted].sort();
      const allowed = new Set(config.allowedRepairPaths);
      const unexpected = allChangedPaths.filter((path) => !allowed.has(path));
      const missing = config.requiredRepairPaths.filter((path) => !diff.changed.includes(path));
      if (unexpected.length > 0) fail("FIX_SCOPE_VIOLATION", `Unexpected repair paths: ${unexpected.join(", ")}`);
      if (missing.length > 0) fail("FIX_INCOMPLETE", `Required repair paths did not change: ${missing.join(", ")}`);
      assertPreservedPaths(before, after, [
        config.trackedUserChange.path,
        ...config.untrackedUserFiles.map(({ path }) => path),
      ]);
      const testResult = fixtureTest(repository);
      if (testResult.status !== 0) fail("FIX_VERIFICATION_FAILED", `Fixture test failed: ${processFailure(testResult)}`);
    }

    return {
      authSourceUnchanged: true,
      changedPaths: [...diff.added, ...diff.changed, ...diff.deleted].sort(),
      codexVersion,
      finalMessageSha256: sha256(finalMessage),
      gitStatusAfter: statusAfter,
      gitStatusBefore: statusBefore,
      mode: options.mode,
      model: options.model,
      mutationAttemptCount: analysis.fileChanges.length + analysis.mutatingCommands.length,
      planBeforeMutation: analysis.planBeforeMutation,
      reasoningEffort: options.reasoningEffort,
      sandbox,
      skillSourceRead: skillRead,
      treeSha256After: after.sha256,
      treeSha256Before: before.sha256,
      verdict,
    };
  } catch (error) {
    if (error instanceof AuditSmokeError) {
      throw new AuditSmokeError(error.code, redactedDiagnostic(error.message, diagnosticPaths));
    }
    throw error;
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }
  console.log(JSON.stringify(runAuditSmoke(options)));
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) {
  try {
    main();
  } catch (error) {
    const code = error instanceof AuditSmokeError ? error.code : "UNEXPECTED_ERROR";
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${code}: ${message}`);
    console.error("No audit smoke result artifact was published; temporary state was removed.");
    process.exitCode = 1;
  }
}
