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

function analyzeCommand(command, shell) {
  return analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command } }],
    { shell },
  );
}

function reasonWithCode(analysis, code) {
  return analysis.mutatingCommands[0]?.reasons.find((reason) => reason.code === code);
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
  const [mutatingReason] = unplanned.mutatingCommands[0].reasons;
  assert.equal(mutatingReason.code, "MUTATING_COMMAND_GRAMMAR");
  assert.equal(
    mutatingReason.description,
    "command text matched the detector's mutating executable or subcommand grammar",
  );
  assert.deepEqual(mutatingReason.matches, ["Set-Content"]);
  assert.deepEqual(
    mutatingReason.mutators.map(({ evaluationDepth, match, offset, quoteState, shell }) => ({
      evaluationDepth,
      match,
      offset,
      quoteState,
      shell,
    })),
    [
      {
        evaluationDepth: 0,
        match: "Set-Content",
        offset: 0,
        quoteState: "unquoted",
        shell: commandShellForPlatform(),
      },
    ],
  );
  assert.equal(unplanned.planBeforeMutation, false);
});

test("command mutation classifier detects nested mutators but ignores quoted output literals", () => {
  const nestedCases = [
    {
      command: "bash -lc 'git push origin main'",
      expectedMatch: "git push",
      expectedOffset: "bash -lc '".length,
      shell: "posix",
    },
    {
      command: "sh -c 'rm -f x'",
      expectedMatch: "rm",
      expectedOffset: "sh -c '".length,
      shell: "posix",
    },
    {
      command: "env bash -lc 'rm -f x'",
      expectedMatch: "rm",
      expectedOffset: "env bash -lc '".length,
      shell: "posix",
    },
    {
      command: "bash -lc 'npm publish'",
      expectedMatch: "npm publish",
      expectedOffset: "bash -lc '".length,
      shell: "posix",
    },
    {
      command: "bash -lc 'sed -i file.txt'",
      expectedMatch: "sed -i",
      expectedOffset: "bash -lc '".length,
      shell: "posix",
    },
    {
      command: "pwsh -Command 'Set-Content out.txt x'",
      expectedMatch: "Set-Content",
      expectedOffset: "pwsh -Command '".length,
      shell: "powershell",
    },
  ];

  for (const { command, expectedMatch, expectedOffset, shell } of nestedCases) {
    const analysis = analyzeEvents(
      [{ type: "item.completed", item: { type: "command_execution", command } }],
      { shell },
    );
    assert.equal(analysis.mutationAttempts.length, 1, `${shell}: ${command}`);
    const reason = analysis.mutatingCommands[0].reasons.find(
      ({ code }) => code === "MUTATING_COMMAND_GRAMMAR",
    );
    assert.ok(reason, command);
    assert.deepEqual(reason.matches, [expectedMatch]);
    assert.equal(reason.mutators[0].match, expectedMatch);
    assert.equal(reason.mutators[0].offset, expectedOffset);
    assert.equal(reason.mutators[0].evaluationDepth, 1);
    assert.equal(reason.mutators[0].outerQuoteState, "single");
    assert.equal(reason.mutators[0].shell, shell);
  }

  const nestedRedirect = "bash -lc 'printf ok > nested.txt'";
  const redirectAnalysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command: nestedRedirect } }],
    { shell: "posix" },
  );
  const redirectReason = redirectAnalysis.mutatingCommands[0].reasons.find(
    ({ code }) => code === "OUTPUT_REDIRECTION_GRAMMAR",
  );
  assert.ok(redirectReason);
  assert.equal(redirectReason.redirections[0].offset, nestedRedirect.indexOf(">"));
  assert.equal(redirectReason.redirections[0].evaluationDepth, 1);
  assert.equal(redirectReason.redirections[0].outerQuoteState, "single");

  const benignCases = [
    {
      command: String.raw`printf '%s\n' 'Never run git push origin main'`,
      shell: "posix",
    },
    {
      command: "Write-Output 'Never run git push origin main'",
      shell: "powershell",
    },
    {
      command: 'Write-Output "Set-Content out.txt x is forbidden"',
      shell: "powershell",
    },
    {
      command: ["@'", "Never run git push origin main > out.txt", "'@ | Write-Output"].join("\n"),
      shell: "powershell",
    },
    {
      command: 'node -e "const f = x => x; console.log(\'git push origin main\')"',
      shell: "posix",
    },
    {
      command: String.raw`printf '%s\n' $((1 << 2))`,
      shell: "posix",
    },
    {
      command: 'cat <<< "body > data"',
      shell: "posix",
    },
  ];
  for (const { command, shell } of benignCases) {
    const analysis = analyzeEvents(
      [{ type: "item.completed", item: { type: "command_execution", command } }],
      { shell },
    );
    assert.deepEqual(analysis.mutatingCommands, [], `${shell}: ${command}`);
    assert.deepEqual(analysis.mutationAttempts, [], `${shell}: ${command}`);
  }
});

test("command mutation classifier ignores here-document bodies and preserves exact redirects", () => {
  const pythonHereDocument = [
    "python - <<'PY'",
    "print(2 > 1)",
    "PY",
  ].join("\n");
  const nodeHereDocument = [
    "node <<'NODE'",
    "const positive = (value) => value > 0;",
    "console.log(positive(1));",
    "NODE",
  ].join("\n");
  const unquotedPythonHereDocument = [
    "python - <<PY",
    "print(3 > 2)",
    "PY",
  ].join("\n");
  for (const command of [pythonHereDocument, nodeHereDocument, unquotedPythonHereDocument]) {
    const analysis = analyzeEvents(
      [{ type: "item.completed", item: { type: "command_execution", command } }],
      { shell: "posix" },
    );
    assert.deepEqual(analysis.mutatingCommands, [], command);
  }

  const outsideRedirect = `${pythonHereDocument}\nprintf done 2>>outside.log`;
  const outsideAnalysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command: outsideRedirect } }],
    { shell: "posix" },
  );
  assert.equal(outsideAnalysis.mutatingCommands.length, 1);
  const outsideReason = outsideAnalysis.mutatingCommands[0].reasons.find(
    ({ code }) => code === "OUTPUT_REDIRECTION_GRAMMAR",
  );
  assert.ok(outsideReason);
  assert.equal(outsideReason.redirections.length, 1);
  assert.equal(outsideReason.redirections[0].operator, ">>");
  assert.equal(outsideReason.redirections[0].fileDescriptor, "2");
  assert.equal(outsideReason.redirections[0].offset, outsideRedirect.lastIndexOf(">>"));

  const headerRedirect = [
    "node <<'NODE' >result.txt",
    "console.log(2 > 1);",
    "NODE",
  ].join("\n");
  const headerAnalysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command: headerRedirect } }],
    { shell: "posix" },
  );
  const headerReason = headerAnalysis.mutatingCommands[0].reasons.find(
    ({ code }) => code === "OUTPUT_REDIRECTION_GRAMMAR",
  );
  assert.equal(headerReason.redirections.length, 1);
  assert.equal(headerReason.redirections[0].offset, headerRedirect.indexOf(">result.txt"));

  for (const shell of ["powershell", "posix"]) {
    for (const command of ["node probe.mjs 2>errors.txt", "node probe.mjs 2>>errors.txt"]) {
      const analysis = analyzeEvents(
        [{ type: "item.completed", item: { type: "command_execution", command } }],
        { shell },
      );
      assert.equal(analysis.mutatingCommands.length, 1, `${shell}: ${command}`);
      assert.equal(analysis.mutatingCommands[0].reasons[0].code, "OUTPUT_REDIRECTION_GRAMMAR");
    }
    const duplication = analyzeEvents(
      [{ type: "item.completed", item: { type: "command_execution", command: "node probe.mjs 2>&1" } }],
      { shell },
    );
    assert.deepEqual(duplication.mutatingCommands, [], shell);
  }
});

test("command mutation classifier maps nested diagnostics and fails closed on malformed grammar", () => {
  const command = "bash -lc 'git push origin main'";
  const analysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command } }],
    { shell: "posix" },
  );
  const diagnostic = mutationAttemptDiagnostic({
    after: { sha256: "a".repeat(64) },
    analysis,
    before: { sha256: "a".repeat(64) },
    statusAfter: "",
    statusBefore: "",
  });
  assert.match(
    diagnostic,
    new RegExp(`mutator="git push" offset=${command.indexOf("git push")} shell=posix`),
  );
  assert.match(diagnostic, /evaluationDepth=1 outerQuoteState=single/);
  assert.match(diagnostic, /contextStart=0/);
  assert.match(diagnostic, /context="bash -lc 'git push origin main'"/);
  assert.doesNotMatch(diagnostic, / command=/);

  const nestedRedirect = "sh -c 'printf ok 2>>nested.log'";
  const redirectAnalysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command: nestedRedirect } }],
    { shell: "posix" },
  );
  const redirectDiagnostic = mutationAttemptDiagnostic({
    after: { sha256: "b".repeat(64) },
    analysis: redirectAnalysis,
    before: { sha256: "b".repeat(64) },
    statusAfter: "",
    statusBefore: "",
  });
  assert.match(
    redirectDiagnostic,
    new RegExp(`operator=">>" offset=${nestedRedirect.indexOf(">>")} shell=posix`),
  );
  assert.match(redirectDiagnostic, /evaluationDepth=1 outerQuoteState=single/);
  assert.match(redirectDiagnostic, /context="sh -c 'printf ok 2>>nested.log'"/);
  assert.doesNotMatch(redirectDiagnostic, / command=/);

  const malformedCases = [
    { command: "bash -lc", shell: "posix", issue: "NESTED_SCRIPT_MISSING" },
    {
      command: "bash -lc 'printf harmless",
      shell: "posix",
      issue: "UNTERMINATED_QUOTE",
    },
    {
      command: 'bash -lc "$script"',
      shell: "posix",
      issue: "NESTED_SCRIPT_DYNAMIC_UNSUPPORTED",
    },
    { command: "pwsh -Command", shell: "powershell", issue: "NESTED_SCRIPT_MISSING" },
    {
      command: ["python - <<'PY'", "print(2 > 1)"].join("\n"),
      shell: "posix",
      issue: "HERE_DOCUMENT_UNTERMINATED",
    },
  ];
  for (const { command: malformed, issue, shell } of malformedCases) {
    const malformedAnalysis = analyzeEvents(
      [{ type: "item.completed", item: { type: "command_execution", command: malformed } }],
      { shell },
    );
    assert.equal(malformedAnalysis.mutationAttempts.length, 1, malformed);
    const reason = malformedAnalysis.mutatingCommands[0].reasons.find(
      ({ code }) => code === "UNSUPPORTED_COMMAND_GRAMMAR",
    );
    assert.ok(reason, malformed);
    assert.ok(reason.issues.some(({ kind }) => kind === issue), `${malformed}: ${issue}`);
  }

  let depthOverflow = "printf harmless";
  for (let depth = 0; depth < 6; depth += 1) depthOverflow = `bash -lc ${posixQuote(depthOverflow)}`;
  const depthAnalysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command: depthOverflow } }],
    { shell: "posix" },
  );
  const depthReason = depthAnalysis.mutatingCommands[0].reasons.find(
    ({ code }) => code === "UNSUPPORTED_COMMAND_GRAMMAR",
  );
  assert.ok(depthReason);
  assert.ok(depthReason.issues.some(({ kind }) => kind === "NESTED_SHELL_DEPTH_EXCEEDED"));
});

test("audit repair command positions distinguish executables from ordinary arguments", () => {
  const benignCases = [
    [String.raw`printf '%s\n' git push origin main`, "posix"],
    [String.raw`printf '%s\n' bash -lc 'git push origin main'`, "posix"],
    ["Write-Output Set-Content out.txt x", "powershell"],
    ['Write-Output "pwsh -Command Set-Content out.txt x"', "powershell"],
    ["'pwsh' -Command 'Set-Content out.txt x'", "powershell"],
  ];
  for (const [command, shell] of benignCases) {
    assert.deepEqual(analyzeCommand(command, shell).mutationAttempts, [], `${shell}: ${command}`);
  }

  const mutatingCases = [
    { command: "'rm' -f x", depth: 0, offsetText: "rm", shell: "posix" },
    { command: "./rm -f x", depth: 0, offsetText: "./rm", shell: "posix" },
    { command: "/usr/bin/git push origin main", depth: 0, offsetText: "/usr/bin/git", shell: "posix" },
    { command: "'/bin/bash' -lc 'rm -f x'", depth: 1, offsetText: "rm", shell: "posix" },
    { command: "bash -lc 'git push origin main'", depth: 1, offsetText: "git push", shell: "posix" },
    { command: "sh -c 'rm -f x'", depth: 1, offsetText: "rm", shell: "posix" },
    { command: "printf ok; 'rm' -f x", depth: 0, offsetText: "rm", shell: "posix" },
    { command: "2>errors 'rm' -f x", depth: 0, offsetText: "rm", shell: "posix" },
    { command: "printf ok && sh -c 'rm -f x'", depth: 1, offsetText: "rm", shell: "posix" },
    {
      command: "printf ok | /usr/bin/git push origin main",
      depth: 0,
      offsetText: "/usr/bin/git",
      shell: "posix",
    },
    {
      command: "& 'pwsh' -Command 'Set-Content out.txt x'",
      depth: 1,
      offsetText: "Set-Content",
      shell: "powershell",
    },
    {
      command: "& 'Set-Content' out.txt x",
      depth: 0,
      offsetText: "Set-Content",
      shell: "powershell",
    },
  ];
  for (const { command, depth, offsetText, shell } of mutatingCases) {
    const analysis = analyzeCommand(command, shell);
    const reason = reasonWithCode(analysis, "MUTATING_COMMAND_GRAMMAR");
    assert.ok(reason, `${shell}: ${command}`);
    assert.equal(reason.mutators.length, 1, command);
    assert.equal(reason.mutators[0].offset, command.indexOf(offsetText), command);
    assert.equal(reason.mutators[0].evaluationDepth, depth, command);
  }
});

test("audit repair unsupported launcher grammar fails closed without exposing encoded payloads", () => {
  const cases = [
    {
      command: "pwsh -EncodedCommand sensitive-payload-value",
      issue: "ENCODED_COMMAND_UNSUPPORTED",
      offsetText: "-EncodedCommand",
      shell: "powershell",
    },
    {
      command: "pwsh -enc sensitive-payload-value",
      issue: "ENCODED_COMMAND_UNSUPPORTED",
      offsetText: "-enc",
      shell: "powershell",
    },
    {
      command: "powershell -EncodedCommand sensitive-payload-value",
      issue: "ENCODED_COMMAND_UNSUPPORTED",
      offsetText: "-EncodedCommand",
      shell: "powershell",
    },
    {
      command: "bash -lc 'pwsh -EncodedCommand sensitive-payload-value'",
      issue: "ENCODED_COMMAND_UNSUPPORTED",
      offsetText: "-EncodedCommand",
      shell: "posix",
    },
    {
      command: "bash $flags 'rm -f x'",
      issue: "LAUNCHER_OPTION_DYNAMIC_UNSUPPORTED",
      offsetText: "$flags",
      shell: "posix",
    },
    {
      command: 'sh "$option" \'rm -f x\'',
      issue: "LAUNCHER_OPTION_DYNAMIC_UNSUPPORTED",
      offsetText: "$option",
      shell: "posix",
    },
    {
      command: "pwsh $option 'Set-Content out.txt x'",
      issue: "LAUNCHER_OPTION_DYNAMIC_UNSUPPORTED",
      offsetText: "$option",
      shell: "powershell",
    },
  ];
  for (const { command, issue, offsetText, shell } of cases) {
    const analysis = analyzeCommand(command, shell);
    const reason = reasonWithCode(analysis, "UNSUPPORTED_COMMAND_GRAMMAR");
    assert.ok(reason, `${shell}: ${command}`);
    const evidence = reason.issues.find(({ kind }) => kind === issue);
    assert.ok(evidence, `${command}: ${issue}`);
    assert.equal(evidence.offset, command.indexOf(offsetText));
    assert.equal(evidence.context, offsetText);
    assert.equal(evidence.contextStart, evidence.offset);
  }

  for (const [command, shell] of [
    ["bash -l -c 'printf ok'", "posix"],
    ["bash --noprofile script.sh", "posix"],
    ["pwsh -NoProfile -Command 'Write-Output ok'", "powershell"],
    ["pwsh -NoProfile script.ps1", "powershell"],
  ]) {
    assert.deepEqual(analyzeCommand(command, shell).mutationAttempts, [], `${shell}: ${command}`);
  }

  const encoded = cases[0].command;
  const diagnostic = mutationAttemptDiagnostic({
    after: { sha256: "c".repeat(64) },
    analysis: analyzeCommand(encoded, "powershell"),
    before: { sha256: "c".repeat(64) },
    statusAfter: "",
    statusBefore: "",
  });
  assert.match(diagnostic, /UNSUPPORTED_COMMAND_GRAMMAR/);
  assert.match(diagnostic, /issue=ENCODED_COMMAND_UNSUPPORTED/);
  assert.match(diagnostic, /context="-EncodedCommand"/);
  assert.doesNotMatch(diagnostic, /sensitive-payload-value/);
});

test("audit repair here-documents distinguish literal bodies from executable expansions", () => {
  const quoted = [
    "cat <<'EOF'",
    "$(rm -f x)",
    "`git push origin main`",
    "print(2 > 1)",
    "EOF",
  ].join("\n");
  assert.deepEqual(analyzeCommand(quoted, "posix").mutationAttempts, []);

  const unquotedDollar = ["cat <<EOF", "$(rm -f x)", "EOF"].join("\n");
  const dollarReason = reasonWithCode(
    analyzeCommand(unquotedDollar, "posix"),
    "MUTATING_COMMAND_GRAMMAR",
  );
  assert.ok(dollarReason);
  assert.equal(dollarReason.mutators[0].offset, unquotedDollar.indexOf("rm"));
  assert.equal(dollarReason.mutators[0].evaluationDepth, 1);
  assert.equal(dollarReason.mutators[0].outerQuoteState, "here-document");

  const unquotedBacktick = ["cat <<EOF", "`git push origin main`", "EOF"].join("\n");
  const backtickReason = reasonWithCode(
    analyzeCommand(unquotedBacktick, "posix"),
    "MUTATING_COMMAND_GRAMMAR",
  );
  assert.ok(backtickReason);
  assert.equal(backtickReason.mutators[0].offset, unquotedBacktick.indexOf("git push"));

  assert.deepEqual(analyzeCommand("printf ok # <<EOF", "posix").mutationAttempts, []);
  for (const command of [
    ["python - <<EOF", "print(2 > 1)", "EOF"].join("\n"),
    ["node - <<EOF", "const positive = (value) => value > 0;", "EOF"].join("\n"),
  ]) {
    assert.deepEqual(analyzeCommand(command, "posix").mutationAttempts, [], command);
  }

  const headerRedirect = [
    "python - <<'PY' > out.txt",
    'print("x")',
    "PY",
  ].join("\n");
  const redirectReason = reasonWithCode(
    analyzeCommand(headerRedirect, "posix"),
    "OUTPUT_REDIRECTION_GRAMMAR",
  );
  assert.ok(redirectReason);
  assert.equal(redirectReason.redirections[0].offset, headerRedirect.indexOf("> out.txt"));

  const malformed = ["cat <<EOF", "$(printf ok)"].join("\n");
  const malformedReason = reasonWithCode(
    analyzeCommand(malformed, "posix"),
    "UNSUPPORTED_COMMAND_GRAMMAR",
  );
  assert.ok(malformedReason);
  assert.ok(malformedReason.issues.some(({ kind }) => kind === "HERE_DOCUMENT_UNTERMINATED"));
});

test("audit repair descriptor boundaries remain observable through event analysis", () => {
  for (const command of [
    "node probe.mjs 2>file",
    "node probe.mjs 2>>file",
    "node probe.mjs 12>&1",
    "node probe.mjs 2>&10",
    "node probe.mjs 2>&1file",
  ]) {
    const reason = reasonWithCode(analyzeCommand(command, "posix"), "OUTPUT_REDIRECTION_GRAMMAR");
    assert.ok(reason, command);
    assert.equal(reason.redirections[0].offset, command.indexOf(">"), command);
  }
  for (const [command, shell] of [
    ["node probe.mjs 2>&1", "posix"],
    ["Write-Output '2>&1'", "powershell"],
    [String.raw`printf '%s\n' fd='2>&1'`, "posix"],
    ["Write-Output prefix'2>&1'suffix", "powershell"],
    [String.raw`printf '%s\n' fd=2\>\&1`, "posix"],
    ["Write-Output fd=2`>`&1", "powershell"],
  ]) {
    assert.deepEqual(analyzeCommand(command, shell).mutationAttempts, [], `${shell}: ${command}`);
  }
});

test("audit repair long nested diagnostics retain exact original offsets and bounded context", () => {
  const command = `printf '${"x".repeat(720)}'; '/bin/bash' -lc 'git push origin main'`;
  const expectedOffset = command.indexOf("git push");
  const analysis = analyzeCommand(command, "posix");
  const reason = reasonWithCode(analysis, "MUTATING_COMMAND_GRAMMAR");
  assert.ok(reason);
  const mutator = reason.mutators[0];
  assert.ok(expectedOffset > 600);
  assert.equal(mutator.offset, expectedOffset);
  assert.equal(mutator.context, command.slice(mutator.contextStart, mutator.contextStart + mutator.context.length));
  assert.equal(mutator.context[mutator.offset - mutator.contextStart], "g");
  assert.ok(mutator.context.length <= 160);

  const diagnostic = mutationAttemptDiagnostic({
    after: { sha256: "d".repeat(64) },
    analysis,
    before: { sha256: "d".repeat(64) },
    statusAfter: "",
    statusBefore: "",
  });
  assert.match(diagnostic, /MUTATING_COMMAND_GRAMMAR/);
  assert.match(diagnostic, new RegExp(`mutator="git push" offset=${expectedOffset}`));
  assert.match(diagnostic, /evaluationDepth=1 outerQuoteState=single/);
  assert.match(diagnostic, /contextLength=160/);
  assert.ok(diagnostic.length <= 6000);
  assert.doesNotMatch(diagnostic, /x{200}/);
  assert.doesNotMatch(diagnostic, / command=/);
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
