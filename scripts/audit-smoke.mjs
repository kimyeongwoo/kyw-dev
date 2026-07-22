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

export const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-audit");
const FIXTURE_PROJECT = join(FIXTURE_ROOT, "fresh-session-project");
const FIXTURE_CONFIG = join(FIXTURE_ROOT, "fresh-session.json");
const SKILL_ROOT = join(REPOSITORY_ROOT, "skills", "kyw-audit");
const REASONING_EFFORTS = new Set(["minimal", "low", "medium", "high", "xhigh"]);
const SIMPLE_MUTATING_COMMANDS = new Set([
  "add-content",
  "apply_patch",
  "copy-item",
  "cp",
  "del",
  "erase",
  "md",
  "mkdir",
  "move-item",
  "mv",
  "new-item",
  "out-file",
  "remove-item",
  "rm",
  "rmdir",
  "set-content",
  "tee",
  "touch",
]);
const GIT_MUTATING_SUBCOMMANDS = new Set([
  "add",
  "am",
  "apply",
  "checkout",
  "cherry-pick",
  "clean",
  "commit",
  "merge",
  "mv",
  "push",
  "rebase",
  "reset",
  "restore",
  "rm",
  "switch",
  "tag",
]);
const NPM_MUTATING_SUBCOMMANDS = new Set(["ci", "install", "publish", "update"]);
const COMMAND_SHELLS = new Set(["posix", "powershell"]);
const MAX_DIAGNOSTIC_ATTEMPTS = 8;
const MAX_DIAGNOSTIC_COMMAND_LENGTH = 600;
const MAX_DIAGNOSTIC_CONTEXT_LENGTH = 160;
const MAX_NESTED_SHELL_DEPTH = 4;

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

export function commandShellForPlatform(platform = process.platform) {
  return platform === "win32" ? "powershell" : "posix";
}

function assertCommandShell(shell) {
  if (!COMMAND_SHELLS.has(shell)) {
    fail("INVALID_ARGUMENT", `Unsupported command shell: ${shell}`);
  }
}

function descriptorBefore(command, offset) {
  let start = offset;
  while (start > 0 && /[0-9]/.test(command[start - 1])) start -= 1;
  if (start === offset) return { start: offset, value: null };
  const preceding = start > 0 ? command[start - 1] : null;
  if (preceding !== null && !/[\s;&|(){}]/.test(preceding)) {
    return { start: offset, value: null };
  }
  return { start, value: command.slice(start, offset) };
}

function isTokenBoundary(character) {
  return character === undefined || /[\s;&|(){}]/.test(character);
}

function isAllowedStderrDuplication(command, offset, descriptor) {
  return (
    descriptor.value === "2" &&
    command.slice(offset, offset + 3) === ">&1" &&
    isTokenBoundary(command[offset + 3])
  );
}

function boundedMatchContext(command, offset) {
  const preferredPrefixLength = Math.floor(MAX_DIAGNOSTIC_CONTEXT_LENGTH / 2);
  let start = Math.max(0, offset - preferredPrefixLength);
  let end = Math.min(command.length, start + MAX_DIAGNOSTIC_CONTEXT_LENGTH);
  if (end === command.length) start = Math.max(0, end - MAX_DIAGNOSTIC_CONTEXT_LENGTH);
  return { context: command.slice(start, end), contextStart: start };
}

function originalOffset(view, offset) {
  const mapped = view.sourceOffsets[offset];
  return Number.isInteger(mapped) ? mapped : offset;
}

function sourceMappedContext(command, offset) {
  return { ...boundedMatchContext(command, offset), offset };
}

function tokenMappedContext(command, token) {
  const offset = token.sourceOffsets[0] ?? token.start;
  const lastOffset = token.sourceOffsets.at(-1) ?? offset;
  return {
    context: command.slice(offset, lastOffset + 1),
    contextStart: offset,
    offset,
  };
}

function shellEvidence(command, view, offset, shell, context) {
  const mappedOffset = originalOffset(view, offset);
  return {
    ...sourceMappedContext(command, mappedOffset),
    evaluationDepth: context.evaluationDepth,
    outerQuoteState: context.outerQuoteState,
    shell,
  };
}

function readHereDocumentDelimiter(command, start, lineEnd) {
  let index = start;
  while (index < lineEnd && /[ \t]/.test(command[index])) index += 1;
  let delimiter = "";
  let quoteState = "unquoted";
  let quoted = false;
  for (; index < lineEnd; index += 1) {
    const character = command[index];
    if (quoteState === "single") {
      if (character === "'") quoteState = "unquoted";
      else delimiter += character;
      continue;
    }
    if (quoteState === "double") {
      if (character === "\\" && index + 1 < lineEnd) {
        index += 1;
        delimiter += command[index];
      } else if (character === '"') {
        quoteState = "unquoted";
      } else {
        delimiter += character;
      }
      continue;
    }
    if (/\s/.test(character) || /[;&|()<>]/.test(character)) break;
    if (character === "'") {
      quoted = true;
      quoteState = "single";
      continue;
    }
    if (character === '"') {
      quoted = true;
      quoteState = "double";
      continue;
    }
    if (character === "\\" && index + 1 < lineEnd) {
      quoted = true;
      index += 1;
      delimiter += command[index];
      continue;
    }
    delimiter += character;
  }
  return { delimiter, end: index, quoteState, quoted };
}

function findHereDocumentTerminator(command, start, delimiter, stripTabs) {
  let cursor = start;
  while (cursor <= command.length) {
    const newline = command.indexOf("\n", cursor);
    const lineEnd = newline === -1 ? command.length : newline;
    let line = command.slice(cursor, lineEnd);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    const comparable = stripTabs ? line.replace(/^\t+/, "") : line;
    if (comparable === delimiter) {
      return { end: newline === -1 ? lineEnd : newline + 1, terminatorStart: cursor };
    }
    if (newline === -1) break;
    cursor = newline + 1;
  }
  return null;
}

function skipPosixArithmeticForHereDocuments(command, start) {
  let parenthesisDepth = 0;
  let quoteState = "unquoted";
  for (let index = start; index < command.length; index += 1) {
    const character = command[index];
    if (quoteState === "single") {
      if (character === "'") quoteState = "unquoted";
      continue;
    }
    if (quoteState === "double") {
      if (character === "\\" && index + 1 < command.length) index += 1;
      else if (character === '"') quoteState = "unquoted";
      continue;
    }
    if (character === "\\" && index + 1 < command.length) {
      index += 1;
      continue;
    }
    if (character === "'") {
      quoteState = "single";
      continue;
    }
    if (character === '"') {
      quoteState = "double";
      continue;
    }
    if (character === "$" && command[index + 1] === "(" && command[index + 2] === "(") {
      index = skipPosixArithmeticForHereDocuments(command, index + 3);
      continue;
    }
    if (character === "(") {
      parenthesisDepth += 1;
      continue;
    }
    if (character !== ")") continue;
    if (parenthesisDepth > 0) {
      parenthesisDepth -= 1;
      continue;
    }
    if (command[index + 1] === ")") return index + 1;
  }
  return command.length - 1;
}

function posixHereDocumentInfo(command) {
  const issues = [];
  const spans = [];
  const pending = [];
  let quoteState = "unquoted";
  let tokenActive = false;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (quoteState === "single") {
      if (character === "'") quoteState = "unquoted";
      continue;
    }
    if (quoteState === "double") {
      if (character === "\\" && index + 1 < command.length) index += 1;
      else if (character === '"') quoteState = "unquoted";
      continue;
    }
    if (character === "\\" && index + 1 < command.length) {
      tokenActive = true;
      index += 1;
      continue;
    }
    if (character === "'") {
      tokenActive = true;
      quoteState = "single";
      continue;
    }
    if (character === '"') {
      tokenActive = true;
      quoteState = "double";
      continue;
    }
    if (character === "#" && !tokenActive) {
      const newline = command.indexOf("\n", index);
      if (newline === -1) break;
      index = newline - 1;
      continue;
    }
    if (character === "$" && command[index + 1] === "(" && command[index + 2] === "(") {
      tokenActive = true;
      index = skipPosixArithmeticForHereDocuments(command, index + 3);
      continue;
    }
    if (
      character === "<" &&
      command[index - 1] !== "<" &&
      command[index + 1] === "<" &&
      command[index + 2] !== "<"
    ) {
      const operatorOffset = index;
      const stripTabs = command[index + 2] === "-";
      const lineEndCandidate = command.indexOf("\n", index);
      const lineEnd = lineEndCandidate === -1 ? command.length : lineEndCandidate;
      const delimiter = readHereDocumentDelimiter(command, index + (stripTabs ? 3 : 2), lineEnd);
      if (!delimiter.delimiter || delimiter.quoteState !== "unquoted") {
        issues.push({
          kind: !delimiter.delimiter ? "HERE_DOCUMENT_DELIMITER_MISSING" : "HERE_DOCUMENT_DELIMITER_MALFORMED",
          message: !delimiter.delimiter
            ? "here-document operator lacks a literal delimiter"
            : "here-document delimiter has an unterminated quote",
          offset: operatorOffset,
        });
      } else {
        pending.push({
          delimiter: delimiter.delimiter,
          offset: operatorOffset,
          quoted: delimiter.quoted,
          stripTabs,
        });
      }
      tokenActive = true;
      index = Math.max(index + 1, delimiter.end - 1);
      continue;
    }
    if (character !== "\n" || pending.length === 0) {
      if (/\s/.test(character) || /[;&|(){}<>]/.test(character)) tokenActive = false;
      else tokenActive = true;
      continue;
    }

    let bodyStart = index + 1;
    for (const hereDocument of pending.splice(0)) {
      const terminator = findHereDocumentTerminator(
        command,
        bodyStart,
        hereDocument.delimiter,
        hereDocument.stripTabs,
      );
      if (terminator === null) {
        issues.push({
          kind: "HERE_DOCUMENT_UNTERMINATED",
          message: `here-document delimiter ${JSON.stringify(hereDocument.delimiter)} has no terminator line`,
          offset: hereDocument.offset,
        });
        spans.push({
          end: command.length,
          quoted: hereDocument.quoted,
          start: bodyStart,
          terminatorStart: command.length,
        });
        bodyStart = command.length;
        break;
      }
      spans.push({
        end: terminator.end,
        quoted: hereDocument.quoted,
        start: bodyStart,
        terminatorStart: terminator.terminatorStart,
      });
      bodyStart = terminator.end;
    }
    index = Math.max(index, bodyStart - 1);
    quoteState = "unquoted";
    tokenActive = false;
  }
  for (const hereDocument of pending) {
    issues.push({
      kind: "HERE_DOCUMENT_BODY_MISSING",
      message: `here-document delimiter ${JSON.stringify(hereDocument.delimiter)} has no body line`,
      offset: hereDocument.offset,
    });
  }
  return { issues, spans };
}

function nestedShellDialect(commandName) {
  const basename = commandName.replaceAll("\\", "/").split("/").at(-1).toLowerCase().replace(/\.exe$/, "");
  if (new Set(["bash", "dash", "ksh", "sh", "zsh"]).has(basename)) return "posix";
  if (new Set(["powershell", "pwsh"]).has(basename)) return "powershell";
  return null;
}

function normalizedCommandName(value) {
  return value.replaceAll("\\", "/").split("/").at(-1).toLowerCase().replace(/\.exe$/, "");
}

function tokenCanBeStaticExecutable(token, shell, previousCommandOperator) {
  if (token.separator || token.dynamic || !token.value) return false;
  if (shell === "posix") return true;
  return (
    String(token.quoteStates[0] ?? "").startsWith("unquoted") ||
    previousCommandOperator === "&"
  );
}

function isPosixAssignmentToken(token) {
  return (
    !token.dynamic &&
    String(token.quoteStates[0] ?? "").startsWith("unquoted") &&
    /^[A-Za-z_][A-Za-z0-9_]*=/.test(token.value)
  );
}

function commandPositionIndexes(tokens, shell) {
  const positions = [];
  let expectingCommand = true;
  let previousCommandOperator = null;
  let redirectionTargetPending = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.separator) {
      if (token.kind === "redirection") {
        if (token.takesTarget !== false) redirectionTargetPending = true;
      } else {
        expectingCommand = true;
        previousCommandOperator = token.operator ?? null;
        redirectionTargetPending = false;
      }
      continue;
    }
    if (redirectionTargetPending) {
      redirectionTargetPending = false;
      continue;
    }
    if (!expectingCommand) continue;
    if (shell === "posix" && isPosixAssignmentToken(token)) continue;
    if (tokenCanBeStaticExecutable(token, shell, previousCommandOperator)) positions.push(index);
    expectingCommand = false;
    previousCommandOperator = null;
  }

  for (const position of [...positions]) {
    if (shell !== "posix" || normalizedCommandName(tokens[position].value) !== "env") continue;
    for (let index = position + 1; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.separator) {
        if (token.kind === "redirection" && token.takesTarget !== false) index += 1;
        else if (token.kind !== "redirection") break;
        continue;
      }
      if (token.value === "--" || token.value.startsWith("-") || isPosixAssignmentToken(token)) {
        continue;
      }
      if (tokenCanBeStaticExecutable(token, shell, null)) positions.push(index);
      break;
    }
  }

  return [...new Set(positions)].sort((left, right) => left - right);
}

function startsShellVariable(text, offset, shell) {
  const next = text[offset + 1];
  if (next === undefined) return false;
  return shell === "powershell"
    ? /[A-Za-z_{?]/.test(next)
    : /[A-Za-z_0-9{?*@$#!-]/.test(next);
}

function mutatorMatchAt(tokens, index) {
  const token = tokens[index];
  const commandName = normalizedCommandName(token.value);
  if (SIMPLE_MUTATING_COMMANDS.has(commandName)) return { match: token.value, token };
  const next = tokens[index + 1];
  if (!next || next.separator) return null;
  const subcommand = next.value.toLowerCase();
  if (commandName === "sed" && subcommand.startsWith("-i")) {
    return { match: `${token.value} ${next.value}`, token };
  }
  if (commandName === "npm" && NPM_MUTATING_SUBCOMMANDS.has(subcommand)) {
    return { match: `${token.value} ${next.value}`, token };
  }
  if (commandName === "git" && GIT_MUTATING_SUBCOMMANDS.has(subcommand)) {
    return { match: `${token.value} ${next.value}`, token };
  }
  return null;
}

function deduplicateBy(items, keyFor) {
  const unique = new Map();
  for (const item of items) unique.set(keyFor(item), item);
  return [...unique.values()];
}

function parseShellView(view, shell, rootCommand, context, aggregate) {
  const hereDocuments = shell === "posix" ? posixHereDocumentInfo(view.text) : { issues: [], spans: [] };
  const hereDocumentByStart = new Map(hereDocuments.spans.map((span) => [span.start, span]));
  const escapeCharacter = shell === "powershell" ? "`" : "\\";

  const addIssue = (kind, message, offset, issueContext = context) => {
    aggregate.issues.push({
      ...shellEvidence(rootCommand, view, offset, shell, issueContext),
      kind,
      message,
    });
  };
  for (const issue of hereDocuments.issues) addIssue(issue.kind, issue.message, issue.offset);

  let scanSegment;
  const scanHereDocumentBody = (hereDocument, segmentContext) => {
    const bodyEnd = hereDocument.terminatorStart ?? hereDocument.end;
    for (let index = hereDocument.start; index < bodyEnd; index += 1) {
      const character = view.text[index];
      if (character === "\\" && index + 1 < bodyEnd && /[\\$`\n]/.test(view.text[index + 1])) {
        index += 1;
        continue;
      }
      if (character === "$" && view.text[index + 1] === "(" && view.text[index + 2] === "(") {
        addIssue(
          "HERE_DOCUMENT_ARITHMETIC_EXPANSION_UNSUPPORTED",
          "unquoted here-document arithmetic expansion is not classified as program source",
          index,
          {
            ...segmentContext,
            evaluationDepth: segmentContext.evaluationDepth + 1,
            outerQuoteState: "here-document",
          },
        );
        index += 2;
        continue;
      }
      if (character === "$" && view.text[index + 1] === "(") {
        const child = scanSegment(index + 2, ")", {
          ...segmentContext,
          evaluationDepth: segmentContext.evaluationDepth + 1,
          outerQuoteState: "here-document",
        });
        index = child.end;
        continue;
      }
      if (character === "`") {
        const child = scanSegment(index + 1, "`", {
          ...segmentContext,
          evaluationDepth: segmentContext.evaluationDepth + 1,
          outerQuoteState: "here-document",
        });
        index = child.end;
      }
    }
  };

  scanSegment = (start, terminator, segmentContext) => {
    const tokens = [];
    let token = null;
    let quoteState = "unquoted";
    let quoteStart = null;
    let parenthesisDepth = 0;
    const ensureToken = (offset) => {
      token ??= { dynamic: false, quoteStates: [], sourceOffsets: [], start: originalOffset(view, offset), value: "" };
    };
    const append = (character, offset, state) => {
      ensureToken(offset);
      token.value += character;
      token.sourceOffsets.push(originalOffset(view, offset));
      token.quoteStates.push(state);
    };
    const finishToken = () => {
      if (token !== null) tokens.push(token);
      token = null;
    };
    const separator = (kind, offset, details = {}) => {
      finishToken();
      tokens.push({ ...details, kind, offset: originalOffset(view, offset), separator: true });
    };

    const scanArithmetic = (arithmeticStart, arithmeticContext) => {
      let arithmeticQuote = "unquoted";
      let arithmeticDepth = 0;
      for (let index = arithmeticStart; index < view.text.length; index += 1) {
        const character = view.text[index];
        if (arithmeticQuote === "single") {
          if (character === "'") arithmeticQuote = "unquoted";
          continue;
        }
        if (arithmeticQuote === "double") {
          if (character === "\\" && index + 1 < view.text.length) index += 1;
          else if (character === '"') arithmeticQuote = "unquoted";
          continue;
        }
        if (character === "\\" && index + 1 < view.text.length) {
          index += 1;
          continue;
        }
        if (character === "'") {
          arithmeticQuote = "single";
          continue;
        }
        if (character === '"') {
          arithmeticQuote = "double";
          continue;
        }
        if (character === "$" && view.text[index + 1] === "(") {
          if (view.text[index + 2] === "(") {
            index = scanArithmetic(index + 3, {
              ...arithmeticContext,
              evaluationDepth: arithmeticContext.evaluationDepth + 1,
              outerQuoteState: "arithmetic",
            });
          } else {
            const child = scanSegment(index + 2, ")", {
              ...arithmeticContext,
              evaluationDepth: arithmeticContext.evaluationDepth + 1,
              outerQuoteState: "arithmetic",
            });
            index = child.end;
          }
          continue;
        }
        if (character === "(") {
          arithmeticDepth += 1;
          continue;
        }
        if (character !== ")") continue;
        if (arithmeticDepth > 0) {
          arithmeticDepth -= 1;
          continue;
        }
        if (view.text[index + 1] === ")") return index + 1;
      }
      addIssue(
        "ARITHMETIC_EXPANSION_UNTERMINATED",
        "POSIX arithmetic expansion has no closing double parenthesis",
        Math.max(0, arithmeticStart - 3),
        arithmeticContext,
      );
      return view.text.length;
    };

    let index = start;
    for (; index < view.text.length; index += 1) {
      const hereDocument = hereDocumentByStart.get(index);
      if (hereDocument) {
        finishToken();
        if (!hereDocument.quoted) scanHereDocumentBody(hereDocument, segmentContext);
        index = hereDocument.end - 1;
        continue;
      }

      const character = view.text[index];
      if (quoteState === "single") {
        if (character !== "'") {
          append(character, index, "single");
        } else if (shell === "powershell" && view.text[index + 1] === "'") {
          append("'", index, "single-escaped");
          index += 1;
        } else {
          quoteState = "unquoted";
          quoteStart = null;
        }
        continue;
      }
      if (quoteState === "double") {
        if (character === escapeCharacter) {
          if (index + 1 >= view.text.length) {
            addIssue("DANGLING_ESCAPE", "double-quoted shell text ends with an escape character", index, segmentContext);
            continue;
          }
          index += 1;
          append(view.text[index], index, "double-escaped");
          continue;
        }
        if (character === '"') {
          quoteState = "unquoted";
          quoteStart = null;
          continue;
        }
        if (character === "$" && view.text[index + 1] === "(") {
          ensureToken(index);
          token.dynamic = true;
          if (shell === "posix" && view.text[index + 2] === "(") {
            index = scanArithmetic(index + 3, {
              ...segmentContext,
              evaluationDepth: segmentContext.evaluationDepth + 1,
              outerQuoteState: "double",
            });
          } else {
            const child = scanSegment(index + 2, ")", {
              ...segmentContext,
              evaluationDepth: segmentContext.evaluationDepth + 1,
              outerQuoteState: "double",
            });
            index = child.end;
          }
          continue;
        }
        if (character === "$" && startsShellVariable(view.text, index, shell)) {
          ensureToken(index);
          token.dynamic = true;
          append(character, index, "double");
          continue;
        }
        if (shell === "posix" && character === "`") {
          ensureToken(index);
          token.dynamic = true;
          const child = scanSegment(index + 1, "`", {
            ...segmentContext,
            evaluationDepth: segmentContext.evaluationDepth + 1,
            outerQuoteState: "double",
          });
          index = child.end;
          continue;
        }
        append(character, index, "double");
        continue;
      }

      if (terminator === "`" && character === "`") {
        finishToken();
        classifyTokens(tokens, shell, rootCommand, segmentContext, aggregate);
        inspectNestedShells(tokens, shell, rootCommand, segmentContext, aggregate);
        return { end: index, terminated: true };
      }
      if (character === escapeCharacter) {
        if (index + 1 >= view.text.length) {
          addIssue("DANGLING_ESCAPE", "shell text ends with an escape character", index, segmentContext);
          continue;
        }
        index += 1;
        append(view.text[index], index, "unquoted-escaped");
        continue;
      }
      if (character === "'") {
        ensureToken(index);
        quoteState = "single";
        quoteStart = index;
        continue;
      }
      if (character === '"') {
        ensureToken(index);
        quoteState = "double";
        quoteStart = index;
        continue;
      }
      if (character === "$" && view.text[index + 1] === "(") {
        ensureToken(index);
        token.dynamic = true;
        if (shell === "posix" && view.text[index + 2] === "(") {
          index = scanArithmetic(index + 3, {
            ...segmentContext,
            evaluationDepth: segmentContext.evaluationDepth + 1,
            outerQuoteState: "unquoted",
          });
        } else {
          const child = scanSegment(index + 2, ")", {
            ...segmentContext,
            evaluationDepth: segmentContext.evaluationDepth + 1,
            outerQuoteState: "unquoted",
          });
          index = child.end;
        }
        continue;
      }
      if (character === "$" && startsShellVariable(view.text, index, shell)) {
        ensureToken(index);
        token.dynamic = true;
        append(character, index, "unquoted");
        continue;
      }
      if (shell === "posix" && character === "`") {
        ensureToken(index);
        token.dynamic = true;
        const child = scanSegment(index + 1, "`", {
          ...segmentContext,
          evaluationDepth: segmentContext.evaluationDepth + 1,
          outerQuoteState: "unquoted",
        });
        index = child.end;
        continue;
      }
      if (character === "(") {
        parenthesisDepth += 1;
        separator("group", index, { operator: "(" });
        continue;
      }
      if (character === ")") {
        if (terminator === ")" && parenthesisDepth === 0) {
          finishToken();
          classifyTokens(tokens, shell, rootCommand, segmentContext, aggregate);
          inspectNestedShells(tokens, shell, rootCommand, segmentContext, aggregate);
          return { end: index, terminated: true };
        }
        if (parenthesisDepth > 0) parenthesisDepth -= 1;
        separator("group", index, { operator: ")" });
        continue;
      }
      if (/\s/.test(character)) {
        finishToken();
        if (character === "\r" || character === "\n") {
          separator("command", index, { operator: "newline" });
        }
        continue;
      }
      if (character === ">") {
        const descriptor = descriptorBefore(view.text, index);
        const tokenIsDescriptor =
          descriptor.value !== null &&
          token?.value === descriptor.value &&
          token.sourceOffsets[0] === originalOffset(view, descriptor.start) &&
          token.sourceOffsets.at(-1) === originalOffset(view, index - 1);
        if (tokenIsDescriptor) token = null;
        else finishToken();
        if (isAllowedStderrDuplication(view.text, index, descriptor)) {
          separator("redirection", index, { operator: ">&1", takesTarget: false });
          index += 2;
          continue;
        }
        const operator = view.text[index + 1] === ">" ? ">>" : ">";
        aggregate.redirections.push({
          ...shellEvidence(rootCommand, view, index, shell, segmentContext),
          escaped: false,
          fileDescriptor: descriptor.value,
          operator,
          quoteState: "unquoted",
        });
        separator("redirection", index, { operator, takesTarget: true });
        if (operator === ">>") index += 1;
        continue;
      }
      if (/[;&|<{}]/.test(character)) {
        const kind = character === "<" ? "redirection" : "command";
        const doubled =
          view.text[index + 1] === character && new Set(["&", "|", "<"]).has(character);
        separator(kind, index, {
          operator: doubled ? `${character}${character}` : character,
          takesTarget: kind === "redirection",
        });
        if (doubled) index += 1;
        continue;
      }
      if (character === "#" && token === null) {
        const newline = view.text.indexOf("\n", index);
        if (newline === -1) {
          index = view.text.length;
          break;
        }
        index = newline - 1;
        continue;
      }
      append(character, index, "unquoted");
    }

    finishToken();
    classifyTokens(tokens, shell, rootCommand, segmentContext, aggregate);
    inspectNestedShells(tokens, shell, rootCommand, segmentContext, aggregate);
    if (quoteState !== "unquoted") {
      addIssue(
        "UNTERMINATED_QUOTE",
        `${quoteState}-quoted shell text has no closing quote`,
        quoteStart ?? Math.max(start, view.text.length - 1),
        segmentContext,
      );
    }
    if (terminator !== null) {
      addIssue(
        "COMMAND_SUBSTITUTION_UNTERMINATED",
        `executable shell substitution has no closing ${JSON.stringify(terminator)}`,
        Math.max(0, start - (terminator === ")" ? 2 : 1)),
        segmentContext,
      );
    }
    return { end: view.text.length, terminated: false };
  };

  scanSegment(0, null, context);
}

function classifyTokens(tokens, shell, rootCommand, context, aggregate) {
  for (const index of commandPositionIndexes(tokens, shell)) {
    const result = mutatorMatchAt(tokens, index);
    if (result === null) continue;
    const offset = result.token.sourceOffsets[0] ?? result.token.start;
    aggregate.mutators.push({
      ...sourceMappedContext(rootCommand, offset),
      evaluationDepth: context.evaluationDepth,
      match: result.match,
      outerQuoteState: context.outerQuoteState,
      quoteState: result.token.quoteStates[0] ?? "unknown",
      shell,
    });
  }
}

function inspectNestedShells(tokens, shell, rootCommand, context, aggregate) {
  const addLauncherIssue = (kind, message, token, dialect, { matchLocal = false } = {}) => {
    const offset = token.sourceOffsets[0] ?? token.start;
    aggregate.issues.push({
      ...(matchLocal ? tokenMappedContext(rootCommand, token) : sourceMappedContext(rootCommand, offset)),
      evaluationDepth: context.evaluationDepth,
      kind,
      message,
      outerQuoteState: context.outerQuoteState,
      shell: dialect,
    });
  };

  for (const launcherIndex of commandPositionIndexes(tokens, shell)) {
    const launcher = tokens[launcherIndex];
    const dialect = nestedShellDialect(launcher.value);
    if (dialect === null) continue;
    for (let optionIndex = launcherIndex + 1; optionIndex < tokens.length; optionIndex += 1) {
      const option = tokens[optionIndex];
      if (option.separator) break;
      const normalized = option.value.toLowerCase();
      if (option.dynamic) {
        addLauncherIssue(
          "LAUNCHER_OPTION_DYNAMIC_UNSUPPORTED",
          `${launcher.value} uses a dynamic launcher option that cannot be classified literally`,
          option,
          dialect,
          { matchLocal: true },
        );
        break;
      }
      if (
        dialect === "powershell" &&
        new Set(["-enc", "-encodedcommand"]).has(normalized)
      ) {
        addLauncherIssue(
          "ENCODED_COMMAND_UNSUPPORTED",
          `${launcher.value} uses an encoded command payload that is not decoded`,
          option,
          dialect,
          { matchLocal: true },
        );
        break;
      }
      const isCommandOption =
        dialect === "powershell"
          ? new Set(["-c", "-command", "-commandwithargs"]).has(normalized)
          : /^-[a-z]*c[a-z]*$/i.test(option.value) && !option.value.startsWith("--");
      if (!isCommandOption) {
        if (option.value === "--" || !option.value.startsWith("-")) break;
        continue;
      }
      const script = tokens[optionIndex + 1];
      if (!script || script.separator) {
        const offset = option.sourceOffsets[0] ?? option.start;
        aggregate.issues.push({
          ...sourceMappedContext(rootCommand, offset),
          evaluationDepth: context.evaluationDepth,
          kind: "NESTED_SCRIPT_MISSING",
          message: `${launcher.value} ${option.value} lacks a literal script argument`,
          outerQuoteState: context.outerQuoteState,
          shell,
        });
        break;
      }
      if (context.launcherDepth >= MAX_NESTED_SHELL_DEPTH) {
        const offset = script.sourceOffsets[0] ?? script.start;
        aggregate.issues.push({
          ...sourceMappedContext(rootCommand, offset),
          evaluationDepth: context.evaluationDepth + 1,
          kind: "NESTED_SHELL_DEPTH_EXCEEDED",
          message: `nested shell analysis exceeds the supported depth ${MAX_NESTED_SHELL_DEPTH}`,
          outerQuoteState: script.quoteStates[0] ?? "unknown",
          shell: dialect,
        });
        break;
      }
      if (script.dynamic) {
        const offset = script.sourceOffsets[0] ?? script.start;
        aggregate.issues.push({
          ...sourceMappedContext(rootCommand, offset),
          evaluationDepth: context.evaluationDepth + 1,
          kind: "NESTED_SCRIPT_DYNAMIC_UNSUPPORTED",
          message: "nested shell script depends on outer-shell expansion and cannot be classified literally",
          outerQuoteState: script.quoteStates[0] ?? "unknown",
          shell: dialect,
        });
        break;
      }
      if (script.value.length !== script.sourceOffsets.length) {
        const offset = script.sourceOffsets[0] ?? script.start;
        aggregate.issues.push({
          ...sourceMappedContext(rootCommand, offset),
          evaluationDepth: context.evaluationDepth + 1,
          kind: "NESTED_SCRIPT_SOURCE_MAP_UNSUPPORTED",
          message: "nested literal script cannot be mapped to the original command",
          outerQuoteState: script.quoteStates[0] ?? "unknown",
          shell: dialect,
        });
        break;
      }
      parseShellView(
        {
          sourceOffsets: script.sourceOffsets,
          text: script.value,
        },
        dialect,
        rootCommand,
        {
          evaluationDepth: context.evaluationDepth + 1,
          launcherDepth: context.launcherDepth + 1,
          outerQuoteState: script.quoteStates[0] ?? "unknown",
        },
        aggregate,
      );
      break;
    }
  }
}

function classifyShellCommand(command, shell) {
  const rootCommand = String(command ?? "");
  const aggregate = { issues: [], mutators: [], redirections: [] };
  parseShellView(
    {
      sourceOffsets: Array.from({ length: rootCommand.length }, (_, index) => index),
      text: rootCommand,
    },
    shell,
    rootCommand,
    { evaluationDepth: 0, launcherDepth: 0, outerQuoteState: null },
    aggregate,
  );
  return {
    issues: deduplicateBy(
      aggregate.issues,
      (issue) => `${issue.kind}\0${issue.offset}\0${issue.shell}\0${issue.evaluationDepth}`,
    ).sort((left, right) => left.offset - right.offset),
    mutators: deduplicateBy(
      aggregate.mutators,
      (mutator) => `${mutator.match.toLowerCase()}\0${mutator.offset}\0${mutator.shell}\0${mutator.evaluationDepth}`,
    ).sort((left, right) => left.offset - right.offset),
    redirections: deduplicateBy(
      aggregate.redirections,
      (redirection) => `${redirection.offset}\0${redirection.operator}\0${redirection.shell}`,
    ).sort((left, right) => left.offset - right.offset),
  };
}

export function findOutputRedirections(command, { shell = commandShellForPlatform() } = {}) {
  assertCommandShell(shell);
  return classifyShellCommand(command, shell).redirections;
}

function commandText(event) {
  const command = event?.item?.command;
  return typeof command === "string" ? command : JSON.stringify(command ?? "");
}

function commandMutationReasons(command, shell) {
  const reasons = [];
  const classification = classifyShellCommand(command, shell);
  if (classification.mutators.length > 0) {
    reasons.push({
      code: "MUTATING_COMMAND_GRAMMAR",
      description: "command text matched the detector's mutating executable or subcommand grammar",
      matches: [...new Set(classification.mutators.map(({ match }) => match))],
      mutators: classification.mutators,
    });
  }
  if (classification.redirections.length > 0) {
    reasons.push({
      code: "OUTPUT_REDIRECTION_GRAMMAR",
      description: "command text matched shell output redirection that can write a file",
      redirections: classification.redirections,
    });
  }
  if (classification.issues.length > 0) {
    reasons.push({
      code: "UNSUPPORTED_COMMAND_GRAMMAR",
      description: "command text used malformed or unsupported shell grammar at a mutation boundary",
      issues: classification.issues,
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

export function analyzeEvents(events, { shell = commandShellForPlatform() } = {}) {
  assertCommandShell(shell);
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
      const reasons = commandMutationReasons(command, shell);
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
          redactedCommand.length > MAX_DIAGNOSTIC_COMMAND_LENGTH
            ? `${redactedCommand.slice(0, MAX_DIAGNOSTIC_COMMAND_LENGTH)}…<truncated length=${redactedCommand.length}>`
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
  } = {},
) {
  const codexVersion = preflight(launcher);
  const temporaryRoot = mkdtempSync(join(tmpdir(), "kyw-audit-smoke-"));
  const diagnosticPaths = [temporaryRoot, REPOSITORY_ROOT];
  const scope = createEvaluatorRunScope({
    platform,
    processTarget,
    gracefulTerminationMs,
    forcedTerminationMs,
    onChildSpawn: ({ pid }) => onState?.({ type: "child-spawn", pid }),
  });
  let completed;
  let primaryError;
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
    const result = await scope.runChild({
      command: launcher.command,
      args: [...launcher.prefixArgs, ...outerArgs],
      cwd: repository,
      env: environment,
      input: prompt,
      timeout: options.timeoutMs,
      maxBuffer: 30 * 1024 * 1024,
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

    completed = {
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
    await scope.checkpoint();
  } catch (error) {
    primaryError =
      error instanceof AuditSmokeError
        ? new AuditSmokeError(error.code, redactedDiagnostic(error.message, diagnosticPaths))
        : error;
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
    onState?.({ type: "cleanup-complete", temporaryRoot });
    return failures;
  });

  if (finalState.cause.kind === "interruption") {
    const interrupted = new EvaluatorInterruptedError(finalState.cause.signal);
    const error = new AuditSmokeError("AUDIT_SMOKE_INTERRUPTED", interrupted.message);
    error.exitCode = interrupted.exitCode;
    primaryError = error;
  } else if (!primaryError && finalState.diagnostics.length > 0) {
    primaryError = new AuditSmokeError("EVALUATOR_CLEANUP_FAILED", "Evaluator cleanup failed");
  }
  if (primaryError) {
    appendEvaluatorDiagnostics(primaryError, finalState.diagnostics);
    throw primaryError;
  }
  return completed;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }
  console.log(JSON.stringify(await runAuditSmoke(options)));
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) {
  try {
    await main();
  } catch (error) {
    const code = error instanceof AuditSmokeError ? error.code : "UNEXPECTED_ERROR";
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${code}: ${message}`);
    console.error("No audit smoke result artifact was published; temporary-state cleanup was attempted.");
    process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
  }
}
