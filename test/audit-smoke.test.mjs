import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AuditSmokeError,
  analyzeEvents,
  commandShellForPlatform,
  diffSnapshots,
  extractFinalVerdict,
  findOutputRedirections,
  mutationAttemptDiagnostic,
  outerSandboxConfig,
  parseArguments,
  redactedDiagnostic,
  snapshotTree,
  trustedCaBundle,
} from "../scripts/audit-smoke.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-audit");
const FIXTURE_PROJECT = join(FIXTURE_ROOT, "fresh-session-project");

function temporaryDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), "kyw-audit-unit-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function posixQuote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function powershellQuote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

test("audit smoke requires an explicit model-cost and mode contract", () => {
  const runnerSource = readFileSync(join(REPOSITORY_ROOT, "scripts", "audit-smoke.mjs"), "utf8");
  assert.match(runnerSource, /"--ignore-user-config"/);
  assert.match(runnerSource, /default_permissions =/);
  assert.doesNotMatch(runnerSource, /"--sandbox"/);
  assert.match(runnerSource, /shell_environment_policy\.inherit=\"all\"/);
  assert.match(runnerSource, /--dangerously-bypass-approvals-and-sandbox/);
  const readOnlyOuter = outerSandboxConfig({ controlDirectory: "C:\\audit-control", mode: "readonly" });
  const fixOuter = outerSandboxConfig({ controlDirectory: "C:\\audit-control", mode: "fix" });
  assert.match(readOnlyOuter, /"\." = "read"/);
  assert.match(fixOuter, /"\." = "write"/);
  assert.match(fixOuter, /"\.git" = "read"/);
  assert.match(fixOuter, /"\.agents" = "read"/);
  assert.match(fixOuter, /"\*" = "allow"/);
  assert.match(trustedCaBundle(), /-----BEGIN CERTIFICATE-----/);
  assert.match(trustedCaBundle(), /-----END CERTIFICATE-----/);
  assert.deepEqual(parseArguments(["--help"]), { help: true });
  assert.deepEqual(
    parseArguments([
      "--allow-model",
      "--mode",
      "readonly",
      "--model",
      "gpt-5.6",
      "--reasoning-effort",
      "high",
      "--auth-file",
      "auth.json",
    ]),
    {
      authFile: "auth.json",
      mode: "readonly",
      model: "gpt-5.6",
      reasoningEffort: "high",
      timeoutMs: 600000,
    },
  );
  assert.throws(
    () =>
      parseArguments([
        "--mode",
        "fix",
        "--model",
        "gpt-5.6",
        "--reasoning-effort",
        "high",
        "--auth-file",
        "auth.json",
      ]),
    (error) => error instanceof AuditSmokeError && error.code === "INVALID_ARGUMENT",
  );
  assert.throws(
    () =>
      parseArguments([
        "--allow-model",
        "--mode",
        "repair-if-clear",
        "--model",
        "gpt-5.6",
        "--reasoning-effort",
        "high",
        "--auth-file",
        "auth.json",
      ]),
    /--mode must be readonly or fix/,
  );
});

test("fixture tree hashes expose tracked, untracked, generated, and Task changes", (t) => {
  const root = temporaryDirectory(t);
  mkdirSync(join(root, ".git"));
  mkdirSync(join(root, "docs", "tasks"), { recursive: true });
  mkdirSync(join(root, "generated"));
  mkdirSync(join(root, "scratch"));
  writeFileSync(join(root, ".git", "index"), "ignored metadata\n");
  writeFileSync(join(root, "tracked.txt"), "tracked\n");
  writeFileSync(join(root, "docs", "tasks", "TASK.md"), "task\n");
  writeFileSync(join(root, "generated", "cache.txt"), "generated\n");
  writeFileSync(join(root, "scratch", "idea.txt"), "untracked\n");

  const before = snapshotTree(root);
  writeFileSync(join(root, ".git", "index"), "refreshed metadata\n");
  assert.equal(snapshotTree(root).sha256, before.sha256, ".git metadata is outside the fixture-tree claim");
  writeFileSync(join(root, "docs", "tasks", "TASK.md"), "changed task\n");
  writeFileSync(join(root, "generated", "cache.txt"), "changed generated\n");
  const after = snapshotTree(root);

  assert.notEqual(after.sha256, before.sha256);
  assert.deepEqual(diffSnapshots(before, after), {
    added: [],
    changed: ["docs/tasks/TASK.md", "generated/cache.txt"],
    deleted: [],
  });
});

test("event analysis rejects mutation attempts and proves plan ordering", () => {
  const readOnly = analyzeEvents([
    { type: "item.completed", item: { type: "command_execution", command: "Get-Content -Raw README.md" } },
    { type: "item.completed", item: { type: "command_execution", command: "git --no-optional-locks status --short" } },
    { type: "item.completed", item: { type: "agent_message", text: "Verdict: BLOCKED" } },
  ]);
  assert.deepEqual(readOnly.fileChanges, []);
  assert.deepEqual(readOnly.mutatingCommands, []);
  assert.equal(readOnly.firstMutationIndex, null);

  const repair = analyzeEvents([
    {
      type: "item.completed",
      item: { type: "agent_message", text: "Repair plan for F-01: update src and its test, then run node --test." },
    },
    { type: "item.completed", item: { type: "file_change" } },
  ]);
  assert.equal(repair.firstMutationIndex, 1);
  assert.equal(repair.planBeforeMutation, true);

  const unplanned = analyzeEvents([
    { type: "item.completed", item: { type: "command_execution", command: "Set-Content src/greeting.mjs 'changed'" } },
    { type: "item.completed", item: { type: "agent_message", text: "Repair plan for F-01" } },
  ]);
  assert.equal(unplanned.mutatingCommands.length, 1);
  assert.deepEqual(unplanned.mutatingCommands[0].reasons, [
    {
      code: "MUTATING_COMMAND_GRAMMAR",
      description: "command text matched the detector's mutating executable or subcommand grammar",
      matches: ["Set-Content"],
    },
  ]);
  assert.equal(unplanned.planBeforeMutation, false);
});

test("output redirection scanner follows PowerShell and POSIX quote and escape rules", () => {
  const redirectCases = [
    ["Get-Content README.md > snapshot.txt", ">", null],
    ["Get-Content README.md >> snapshot.txt", ">>", null],
    ["Get-Content README.md 1>snapshot.txt", ">", "1"],
    ["Get-Content README.md 2>errors.txt", ">", "2"],
    ["Get-Content README.md 2>>errors.txt", ">>", "2"],
  ];
  const commonLiterals = [
    "Write-Output '>'",
    'Write-Output ">"',
    'node -e "const f = x => x"',
    'Write-Output "C:\\temp\\>literal"',
  ];

  for (const shell of ["powershell", "posix"]) {
    for (const [command, operator, fileDescriptor] of redirectCases) {
      const matches = findOutputRedirections(command, { shell });
      assert.equal(matches.length, 1, `${shell}: ${command}`);
      assert.equal(matches[0].operator, operator);
      assert.equal(matches[0].fileDescriptor, fileDescriptor);
      assert.equal(matches[0].offset, command.indexOf(">"));
      assert.equal(matches[0].quoteState, "unquoted");
      assert.equal(matches[0].escaped, false);
    }
    for (const command of commonLiterals) {
      assert.deepEqual(findOutputRedirections(command, { shell }), [], `${shell}: ${command}`);
    }
    const harmlessAnalysis = analyzeEvents(
      [
        {
          type: "item.completed",
          item: { type: "command_execution", command: 'node -e "const f = x => x"' },
        },
      ],
      { shell },
    );
    assert.deepEqual(harmlessAnalysis.mutatingCommands, []);
    const mixed = 'node -e "const f = x => x" 2>>errors.txt';
    assert.equal(findOutputRedirections(mixed, { shell })[0].offset, mixed.lastIndexOf(">>"));
    const mixedAnalysis = analyzeEvents(
      [{ type: "item.completed", item: { type: "command_execution", command: mixed } }],
      { shell },
    );
    assert.equal(mixedAnalysis.mutatingCommands.length, 1);
    assert.equal(mixedAnalysis.mutatingCommands[0].reasons[0].code, "OUTPUT_REDIRECTION_GRAMMAR");
  }

  for (const command of [
    String.raw`printf '%s\n' \>`,
    String.raw`printf '%s\n' "say \"> literal"`,
    String.raw`printf '%s\n' 'it'\''s > literal'`,
    String.raw`printf '%s\n' "value=$((2 > 1))"`,
    String.raw`printf '%s\n' $((2 > 1))`,
  ]) {
    assert.deepEqual(findOutputRedirections(command, { shell: "posix" }), [], command);
  }
  for (const command of [
    "Write-Output `>",
    'Write-Output "say `"> literal"',
    "Write-Output 'it''s > literal'",
  ]) {
    assert.deepEqual(findOutputRedirections(command, { shell: "powershell" }), [], command);
  }

  const powershellBackslash = String.raw`Write-Output \>`;
  assert.equal(findOutputRedirections(powershellBackslash, { shell: "powershell" }).length, 1);
  assert.deepEqual(findOutputRedirections(powershellBackslash, { shell: "posix" }), []);

  const posixSubstitution = 'echo "$(printf hi > nested.txt)"';
  const powershellSubexpression = 'Write-Output "$(Get-Content README.md > nested.txt)"';
  assert.equal(
    findOutputRedirections(posixSubstitution, { shell: "posix" })[0].offset,
    posixSubstitution.indexOf(">"),
  );
  assert.equal(
    findOutputRedirections(powershellSubexpression, { shell: "powershell" })[0].offset,
    powershellSubexpression.indexOf(">"),
  );

  const posixNestedShell = `bash -lc 'printf "%s" ">" > nested.txt'`;
  const powershellNestedShell = `powershell.exe -NoProfile -Command 'Write-Output ">" > nested.txt'`;
  const posixNestedMatch = findOutputRedirections(posixNestedShell, { shell: "posix" })[0];
  const powershellNestedMatch = findOutputRedirections(powershellNestedShell, { shell: "powershell" })[0];
  assert.equal(posixNestedMatch.offset, posixNestedShell.lastIndexOf(">"));
  assert.equal(posixNestedMatch.shell, "posix");
  assert.equal(posixNestedMatch.evaluationDepth, 1);
  assert.equal(posixNestedMatch.outerQuoteState, "single");
  assert.equal(powershellNestedMatch.offset, powershellNestedShell.lastIndexOf(">"));
  assert.equal(powershellNestedMatch.shell, "powershell");
  assert.equal(powershellNestedMatch.evaluationDepth, 1);
  assert.equal(powershellNestedMatch.outerQuoteState, "single");
  assert.deepEqual(findOutputRedirections(`bash -lc 'printf "%s" ">"'`, { shell: "posix" }), []);
  assert.deepEqual(
    findOutputRedirections(`powershell -Command 'Write-Output ">"'`, { shell: "powershell" }),
    [],
  );
  assert.equal(commandShellForPlatform("win32"), "powershell");
  assert.equal(commandShellForPlatform("linux"), "posix");
  assert.equal(commandShellForPlatform("darwin"), "posix");
  assert.throws(() => findOutputRedirections("echo > file", { shell: "cmd" }), /Unsupported command shell/);
});

test("fd duplication is narrowly allowed and matches the native executor without creating a file", (t) => {
  for (const shell of ["powershell", "posix"]) {
    assert.deepEqual(findOutputRedirections("node probe.mjs 2>&1", { shell }), []);
    assert.equal(findOutputRedirections("node probe.mjs 2>errors.txt", { shell }).length, 1);
    assert.equal(findOutputRedirections("node probe.mjs 2>>errors.txt", { shell }).length, 1);
    assert.equal(findOutputRedirections("node probe.mjs 2>&2", { shell }).length, 1);
    assert.equal(findOutputRedirections("node probe.mjs 1>&2", { shell }).length, 1);
  }

  const root = temporaryDirectory(t);
  const script = "process.stderr.write('fd-duplication-probe')";
  const shell = commandShellForPlatform();
  const command =
    shell === "powershell"
      ? `& ${powershellQuote(process.execPath)} -e "${script}" 2>&1`
      : `${posixQuote(process.execPath)} -e "${script}" 2>&1`;
  const result =
    shell === "powershell"
      ? spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command], {
          cwd: root,
          encoding: "utf8",
          windowsHide: true,
        })
      : spawnSync("/bin/sh", ["-c", command], { cwd: root, encoding: "utf8" });

  assert.equal(result.error, undefined);
  if (shell === "powershell") {
    assert.ok(
      new Set([0, 1]).has(result.status),
      `PowerShell fd-duplication probe exited ${result.status}: ${result.stderr}`,
    );
  } else {
    assert.equal(result.status, 0, result.stderr);
  }
  assert.match(`${result.stdout}${result.stderr}`, /fd-duplication-probe/);
  assert.deepEqual(readdirSync(root), []);
  const analysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command } }],
    { shell },
  );
  assert.deepEqual(analysis.mutatingCommands, []);
});

test("mutation diagnostics retain ordered structural evidence and invariance", () => {
  const analysis = analyzeEvents([
    { type: "item.completed", item: { type: "command_execution", command: "Get-Content README.md" } },
    {
      type: "item.completed",
      item: { type: "command_execution", command: "Set-Content src/greeting.mjs 'changed'" },
    },
    {
      type: "item.completed",
      item: { type: "command_execution", command: "Get-Content README.md > snapshot.txt" },
    },
    {
      type: "item.completed",
      item: { type: "file_change", changes: [{ path: "src/greeting.mjs", kind: "update" }] },
    },
  ]);
  const before = { sha256: "a".repeat(64) };
  const after = { sha256: "a".repeat(64) };
  const diagnostic = mutationAttemptDiagnostic({
    after,
    analysis,
    before,
    statusAfter: " M notes/user-draft.md",
    statusBefore: " M notes/user-draft.md",
  });

  assert.equal(analysis.mutationAttempts.length, 3);
  assert.deepEqual(
    analysis.mutationAttempts.map(({ eventType, index }) => ({ eventType, index })),
    [
      { eventType: "command_execution", index: 1 },
      { eventType: "command_execution", index: 2 },
      { eventType: "file_change", index: 3 },
    ],
  );
  assert.match(diagnostic, /attemptCount=3/);
  assert.match(diagnostic, /treeInvariant=true/);
  assert.match(diagnostic, /gitStatusInvariant=true/);
  assert.match(diagnostic, /eventIndex=1 eventType=command_execution/);
  assert.match(diagnostic, /reason=MUTATING_COMMAND_GRAMMAR:/);
  assert.match(diagnostic, /matched=Set-Content/);
  assert.match(diagnostic, /eventIndex=2 eventType=command_execution/);
  assert.match(diagnostic, /reason=OUTPUT_REDIRECTION_GRAMMAR:/);
  assert.match(diagnostic, /operator=">"/);
  assert.match(diagnostic, /offset=22/);
  assert.match(diagnostic, /shell=(?:powershell|posix)/);
  assert.match(diagnostic, /fileDescriptor=default/);
  assert.match(diagnostic, /quoteState=unquoted escaped=false/);
  assert.match(diagnostic, /contextStart=0/);
  assert.doesNotMatch(diagnostic, /matched=>/);
  assert.match(diagnostic, /eventIndex=3 eventType=file_change fileChangeKinds=update/);
  assert.match(diagnostic, /reason=FILE_CHANGE_EVENT:/);
  assert.doesNotMatch(diagnostic, /eventIndex=0/);
});

test("mutation diagnostics redact credentials and absolute user paths", () => {
  const windowsUserPath = "C:\\Users\\Audit User\\secrets\\auth.json";
  const posixUserPath = "/home/auditor/.codex/auth.json";
  const temporaryFixture = "D:\\isolated\\audit-fixture";
  const credential = "sk-task0018syntheticcredential";
  const analysis = analyzeEvents([
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: `Set-Content '${temporaryFixture}\\out.txt' \"CODEX_API_KEY=${credential}\"`,
      },
    },
  ]);
  const diagnostic = mutationAttemptDiagnostic({
    after: { sha256: "b".repeat(64) },
    analysis,
    before: { sha256: "a".repeat(64) },
    paths: [temporaryFixture, windowsUserPath],
    statusAfter: `?? ${posixUserPath}`,
    statusBefore: "",
  });
  const directlyRedacted = redactedDiagnostic(
    `Authorization: Bearer top-secret ${windowsUserPath} ${posixUserPath}`,
    [windowsUserPath],
  );

  for (const sensitive of [credential, temporaryFixture, windowsUserPath, posixUserPath, "top-secret"]) {
    assert.doesNotMatch(diagnostic, new RegExp(sensitive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(directlyRedacted, new RegExp(sensitive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(diagnostic, /<TEMP_PATH>/);
  assert.match(diagnostic, /<REDACTED_CREDENTIAL>/);
  assert.match(directlyRedacted, /<USER_PATH>/);
  assert.match(directlyRedacted, /Bearer <REDACTED_CREDENTIAL>/);
});

test("redirection diagnostics retain exact evidence beyond the legacy preview without exposing the command", () => {
  const temporaryFixture = "D:\\isolated\\audit-fixture";
  const credential = "sk-task0021syntheticcredential";
  const prefix = `BEGIN_OF_COMMAND_SHOULD_NOT_APPEAR ${"x".repeat(680)}`;
  const command = `${prefix} 2>>${temporaryFixture}\\out.txt CODEX_API_KEY=${credential}`;
  const expectedOffset = command.indexOf(">>");
  const analysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command } }],
    { shell: "powershell" },
  );
  const match = analysis.mutatingCommands[0].reasons[0].redirections[0];
  const diagnostic = mutationAttemptDiagnostic({
    after: { sha256: "a".repeat(64) },
    analysis,
    before: { sha256: "a".repeat(64) },
    paths: [temporaryFixture],
    statusAfter: "",
    statusBefore: "",
  });

  assert.ok(expectedOffset > 600);
  assert.equal(match.operator, ">>");
  assert.equal(match.offset, expectedOffset);
  assert.equal(match.fileDescriptor, "2");
  assert.equal(match.quoteState, "unquoted");
  assert.equal(match.escaped, false);
  assert.ok(match.context.length <= 160);
  assert.equal(match.context[expectedOffset - match.contextStart], ">");
  assert.equal(match.context.slice(expectedOffset - match.contextStart, expectedOffset - match.contextStart + 2), ">>");
  assert.match(diagnostic, new RegExp(`operator=">>" offset=${expectedOffset}`));
  assert.match(diagnostic, /fileDescriptor=2 quoteState=unquoted escaped=false/);
  assert.match(diagnostic, /contextLength=160/);
  assert.match(diagnostic, /<TEMP_PATH>/);
  assert.match(diagnostic, /<REDACTED_CREDENTIAL>/);
  assert.doesNotMatch(diagnostic, /BEGIN_OF_COMMAND_SHOULD_NOT_APPEAR/);
  assert.doesNotMatch(diagnostic, new RegExp(credential));
  assert.doesNotMatch(diagnostic, /command="/);
  assert.doesNotMatch(diagnostic, /truncated length=/);
});

test("final verdict parsing accepts inline and heading report forms", () => {
  assert.equal(extractFinalVerdict("## Verdict: `PASS`\n\nDone."), "PASS");
  assert.equal(extractFinalVerdict("## Verdict\n\n**BLOCKED** — one finding remains."), "BLOCKED");
  assert.equal(extractFinalVerdict("## Verdict\n**BLOCKED** — one finding remains."), "BLOCKED");
  assert.equal(extractFinalVerdict("PASS appears only in evidence."), null);
});

test("fresh-session fixture contains a passing but product-inconsistent claim", () => {
  const config = JSON.parse(readFileSync(join(FIXTURE_ROOT, "fresh-session.json"), "utf8"));
  const source = readFileSync(join(FIXTURE_PROJECT, "src", "greeting.mjs"), "utf8");
  const spec = readFileSync(join(FIXTURE_PROJECT, "docs", "SPEC.md"), "utf8");
  const fixtureTest = spawnSync(process.execPath, ["--test"], {
    cwd: FIXTURE_PROJECT,
    encoding: "utf8",
    timeout: 60000,
  });

  assert.equal(fixtureTest.status, 0, fixtureTest.stderr);
  assert.match(source, /Hello, \$\{name\}\./);
  assert.match(spec, /Hello, <name>!/);
  assert.deepEqual(config.requiredRepairPaths, config.allowedRepairPaths);
  assert.deepEqual(config.readOnlyReportSignals, ["F-", "BLOCKED"]);
  assert.deepEqual(config.fixReportSignals, ["F-", "PASS"]);
});
