import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  gitStatus,
  inspectReadOnlyCommand,
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

function analyzeCommand(command, shell) {
  return analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command } }],
    { shell },
  );
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

test("strict read-only boundary admits the required cross-platform inspection workload", () => {
  const commands = [
    ["Get-Content -Raw -LiteralPath 'docs/tasks/0033-audit/TASK.md'", "powershell"],
    ["cat -- 'docs/tasks/0033-audit/TASK.md'", "posix"],
    ["sed -n '1,160p' -- 'docs/tasks/0033-audit/TASK.md'", "posix"],
    ["rg --files 'docs/tasks'", "powershell"],
    ["rg --files 'docs/tasks'", "posix"],
    ["rg -n -F -- '## Status' 'docs/tasks/0033-audit/TASK.md'", "powershell"],
    ["rg -n -- 'AC-[0-9]+' 'docs/tasks/0033-audit/TEST.md'", "posix"],
    [
      "git --no-optional-locks --no-pager status --short --branch --untracked-files=all",
      "powershell",
    ],
    [
      "git --no-optional-locks --no-pager diff --no-ext-diff --no-textconv --stat HEAD~1..HEAD -- 'src'",
      "posix",
    ],
    [
      "git --no-optional-locks --no-pager log --no-ext-diff --no-textconv --oneline --max-count=5 main",
      "powershell",
    ],
    [
      "git --no-optional-locks --no-pager show --no-ext-diff --no-textconv --stat HEAD",
      "posix",
    ],
    ["git --no-optional-locks --no-pager rev-parse --verify HEAD", "powershell"],
    ["git --no-optional-locks --no-pager merge-base --is-ancestor main HEAD", "posix"],
    [
      "git --no-optional-locks --no-pager ls-files --others --exclude-standard",
      "powershell",
    ],
    [
      "git --no-optional-locks --no-pager ls-tree -r --name-only HEAD -- 'docs'",
      "posix",
    ],
    [
      "node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory 'docs/tasks/0033-audit'",
      "powershell",
    ],
    [
      "node .agents/skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory 'docs/tasks/0033-audit'",
      "posix",
    ],
  ];

  for (const [command, shell] of commands) {
    const result = inspectReadOnlyCommand(command, { shell });
    assert.equal(result.allowed, true, `${shell}: ${command}\n${JSON.stringify(result.issues)}`);
    assert.deepEqual(analyzeCommand(command, shell).mutationAttempts, []);
  }
  assert.equal(commandShellForPlatform("win32"), "powershell");
  assert.equal(commandShellForPlatform("linux"), "posix");
  assert.equal(commandShellForPlatform("darwin"), "posix");
  assert.throws(
    () => inspectReadOnlyCommand("rg --files", { shell: "cmd" }),
    /Unsupported command shell/,
  );
});

test("strict read-only boundary rejects mutators, wrappers, redirects, dynamics, and ambiguity", () => {
  const cases = [
    ["Set-Content 'out.txt' 'secret-value'", "powershell", "COMMAND_NOT_ALLOWED", "Set-Content"],
    ["rm -f out.txt", "posix", "COMMAND_NOT_ALLOWED", "rm"],
    ["npm publish", "posix", "COMMAND_NOT_ALLOWED", "npm"],
    ["node --test", "powershell", "ARGUMENT_SHAPE_NOT_ALLOWED", "--test"],
    ["git push origin main", "posix", "ARGUMENT_SHAPE_NOT_ALLOWED", "push"],
    [
      "git --no-optional-locks --no-pager push origin main",
      "powershell",
      "GIT_SUBCOMMAND_NOT_ALLOWED",
      "push",
    ],
    ["bash -lc 'git push origin main'", "posix", "SHELL_WRAPPER_UNSUPPORTED", "bash"],
    [
      "pwsh -EncodedCommand sensitive-payload-value",
      "powershell",
      "SHELL_WRAPPER_UNSUPPORTED",
      "pwsh",
    ],
    ["Get-Content -Raw -LiteralPath 'README.md' > 'copy.txt'", "powershell", "REDIRECTION_UNSUPPORTED", ">"],
    ["cat -- 'README.md' 2>&1", "posix", "REDIRECTION_UNSUPPORTED", ">"],
    ["rg --files | Set-Content 'files.txt'", "powershell", "CONTROL_OPERATOR_UNSUPPORTED", "|"],
    ["rg --files; rm -f out.txt", "posix", "CONTROL_OPERATOR_UNSUPPORTED", ";"],
    ["rg --files\nrm -f out.txt", "posix", "MULTI_COMMAND_UNSUPPORTED", "\n"],
    ["rg -n -F -- $pattern 'README.md'", "powershell", "DYNAMIC_EXPANSION_UNSUPPORTED", "$"],
    ["rg -n -F -- \"pattern\" 'README.md'", "posix", "DOUBLE_QUOTE_UNSUPPORTED", "\""],
    ["rg -n -F -- 'pattern 'README.md'", "posix", "QUOTED_FRAGMENT_UNSUPPORTED", "README"],
    ["cat <<'EOF'\ntext\nEOF", "posix", "REDIRECTION_UNSUPPORTED", "<"],
    [
      "Get-Content -Raw -LiteralPath '../outside.txt'",
      "powershell",
      "REPOSITORY_PATH_REQUIRED",
      "'../outside.txt'",
    ],
    ["cat -- '/etc/passwd'", "posix", "REPOSITORY_PATH_REQUIRED", "'/etc/passwd'"],
    ["rg --pre cat -- 'pattern' 'src'", "posix", "ARGUMENT_SHAPE_NOT_ALLOWED", "--pre"],
    ["rg -n -F -- pattern 'src'", "posix", "ARGUMENT_SHAPE_NOT_ALLOWED", "pattern"],
    ["rg --files '.g*'", "posix", "REPOSITORY_PATH_REQUIRED", "'.g*'"],
    ["rg --files @paths", "powershell", "DYNAMIC_EXPANSION_UNSUPPORTED", "@"],
  ];

  for (const [command, shell, kind, offsetText] of cases) {
    const result = inspectReadOnlyCommand(command, { shell });
    assert.equal(result.allowed, false, `${shell}: ${command}`);
    assert.equal(result.issues[0].kind, kind, `${shell}: ${command}`);
    assert.equal(result.issues[0].offset, command.indexOf(offsetText), `${shell}: ${command}`);
    assert.ok(result.issues[0].context.length <= 160);
    const analysis = analyzeCommand(command, shell);
    assert.equal(analysis.mutatingCommands.length, 1, `${shell}: ${command}`);
    assert.equal(analysis.mutatingCommands[0].reasons[0].code, "READ_ONLY_COMMAND_BOUNDARY");
  }

  const encoded = inspectReadOnlyCommand(
    "pwsh -EncodedCommand sensitive-payload-value",
    { shell: "powershell" },
  );
  assert.equal(encoded.issues[0].context, "pwsh");
  assert.doesNotMatch(encoded.issues[0].context, /sensitive-payload-value/);
});

test("literal data cases avoid whole-shell interpretation while executable forms stay rejected", () => {
  const harmlessPatterns = [
    "Never run git push origin main > out.txt",
    "const positive = value => value > 0",
    "Set-Content and rm are finding text; 2>&1 is data",
    "$(rm -f x) and `git push origin main` are examples",
  ];
  for (const shell of ["powershell", "posix"]) {
    for (const pattern of harmlessPatterns) {
      const command = `rg -n -F -- '${pattern}' 'docs/SPEC.md'`;
      const result = inspectReadOnlyCommand(command, { shell });
      assert.equal(result.allowed, true, `${shell}: ${command}\n${JSON.stringify(result.issues)}`);
    }
  }

  for (const [command, shell, kind] of [
    ['node -e "const positive = value => value > 0"', "posix", "DOUBLE_QUOTE_UNSUPPORTED"],
    ["python - <<'PY'\nprint(2 > 1)\nPY", "posix", "REDIRECTION_UNSUPPORTED"],
    ["Write-Output 'Set-Content is only data'", "powershell", "COMMAND_NOT_ALLOWED"],
  ]) {
    const result = inspectReadOnlyCommand(command, { shell });
    assert.equal(result.allowed, false, command);
    assert.equal(result.issues[0].kind, kind, command);
  }
});

test("event analysis treats the strict boundary as the pre-repair mutation-capable edge", () => {
  const readOnly = analyzeEvents([
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "Get-Content -Raw -LiteralPath 'README.md'",
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "git --no-optional-locks --no-pager status --short --untracked-files=all",
      },
    },
  ], { shell: "powershell" });
  assert.deepEqual(readOnly.fileChanges, []);
  assert.deepEqual(readOnly.mutatingCommands, []);
  assert.equal(readOnly.firstMutationIndex, null);

  const repair = analyzeEvents([
    {
      type: "item.completed",
      item: {
        type: "agent_message",
        text: "Bounded repair plan: F-01 changes src and test, then reruns node --test.",
      },
    },
    {
      type: "item.completed",
      item: { type: "command_execution", command: "node --test" },
    },
    { type: "item.completed", item: { type: "file_change" } },
  ], { shell: "powershell" });
  assert.equal(repair.firstMutationIndex, 1);
  assert.equal(repair.planBeforeMutation, true);

  const unplanned = analyzeEvents([
    {
      type: "item.completed",
      item: { type: "command_execution", command: "Set-Content 'out.txt' 'changed'" },
    },
    {
      type: "item.completed",
      item: { type: "agent_message", text: "Bounded repair plan: F-01" },
    },
  ], { shell: "powershell" });
  assert.equal(unplanned.firstMutationIndex, 0);
  assert.equal(unplanned.planBeforeMutation, false);
  assert.equal(unplanned.mutatingCommands[0].reasons[0].code, "READ_ONLY_COMMAND_BOUNDARY");
});

test("native allowed inspection preserves repository, Git, and protected-state bytes", (t) => {
  const root = temporaryDirectory(t);
  const repository = join(root, "repository");
  const protectedState = join(root, "protected");
  mkdirSync(repository);
  mkdirSync(protectedState);
  writeFileSync(join(repository, "README.md"), "# Fixture\n");
  writeFileSync(join(protectedState, "auth.json"), "synthetic protected bytes\n");

  for (const args of [
    ["init", "--quiet"],
    ["config", "user.name", "audit-boundary-test"],
    ["config", "user.email", "audit-boundary@invalid.local"],
    ["config", "commit.gpgsign", "false"],
    ["add", "--all"],
    ["commit", "--quiet", "-m", "fixture"],
  ]) {
    const result = spawnSync("git", args, { cwd: repository, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  writeFileSync(join(repository, "user-draft.txt"), "pre-existing user bytes\n");

  const before = snapshotTree(repository);
  const protectedBefore = snapshotTree(protectedState);
  const statusBefore = gitStatus(repository);
  const shell = commandShellForPlatform();
  const command =
    shell === "powershell"
      ? "Get-Content -Raw -LiteralPath 'README.md'"
      : "cat -- 'README.md'";
  assert.equal(inspectReadOnlyCommand(command, { shell }).allowed, true);
  const content =
    shell === "powershell"
      ? spawnSync(
          "powershell.exe",
          ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
          { cwd: repository, encoding: "utf8", windowsHide: true },
        )
      : spawnSync("/bin/sh", ["-c", command], { cwd: repository, encoding: "utf8" });
  assert.equal(content.status, 0, content.stderr);
  assert.match(content.stdout, /Fixture/);

  const gitInspection = spawnSync(
    "git",
    ["--no-optional-locks", "--no-pager", "status", "--short", "--untracked-files=all"],
    { cwd: repository, encoding: "utf8", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } },
  );
  assert.equal(gitInspection.status, 0, gitInspection.stderr);
  assert.equal(snapshotTree(repository).sha256, before.sha256);
  assert.equal(snapshotTree(protectedState).sha256, protectedBefore.sha256);
  assert.equal(gitStatus(repository), statusBefore);
});

test("mutation diagnostics retain ordered structural evidence and invariance", () => {
  const analysis = analyzeEvents(
    [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "Get-Content -Raw -LiteralPath 'README.md'",
        },
      },
      {
        type: "item.completed",
        item: { type: "command_execution", command: "Set-Content src/greeting.mjs 'changed'" },
      },
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "Get-Content -Raw -LiteralPath 'README.md' > snapshot.txt",
        },
      },
      {
        type: "item.completed",
        item: { type: "file_change", changes: [{ path: "src/greeting.mjs", kind: "update" }] },
      },
    ],
    { shell: "powershell" },
  );
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
  assert.match(diagnostic, /reason=READ_ONLY_COMMAND_BOUNDARY:/);
  assert.match(diagnostic, /issue=COMMAND_NOT_ALLOWED/);
  assert.match(diagnostic, /context="Set-Content"/);
  assert.match(diagnostic, /eventIndex=2 eventType=command_execution/);
  assert.match(diagnostic, /issue=REDIRECTION_UNSUPPORTED/);
  assert.match(diagnostic, /offset=42/);
  assert.match(diagnostic, /shell=powershell/);
  assert.match(diagnostic, /contextStart=42/);
  assert.match(diagnostic, /context=">"/);
  assert.match(diagnostic, /eventIndex=3 eventType=file_change fileChangeKinds=update/);
  assert.match(diagnostic, /reason=FILE_CHANGE_EVENT:/);
  assert.doesNotMatch(diagnostic, /eventIndex=0/);
});

test("mutation diagnostics redact credentials and absolute user paths", () => {
  const windowsUserPath = "C:\\Users\\Audit User\\secrets\\auth.json";
  const posixUserPath = "/home/auditor/.codex/auth.json";
  const temporaryFixture = "D:\\isolated\\audit-fixture";
  const credential = "sk-task0018syntheticcredential";
  const analysis = analyzeEvents(
    [
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: `Get-Content -Raw -LiteralPath '${temporaryFixture}\\CODEX_API_KEY=${credential}.txt'`,
        },
      },
    ],
    { shell: "powershell" },
  );
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

test("boundary diagnostics retain exact late offsets without exposing adjacent command data", () => {
  const temporaryFixture = "D:\\isolated\\audit-fixture";
  const credential = "sk-task0021syntheticcredential";
  const prefix = `BEGIN_OF_COMMAND_SHOULD_NOT_APPEAR ${"x".repeat(680)}`;
  const command = `${prefix} 2>>${temporaryFixture}\\out.txt CODEX_API_KEY=${credential}`;
  const expectedOffset = command.indexOf(">>");
  const analysis = analyzeEvents(
    [{ type: "item.completed", item: { type: "command_execution", command } }],
    { shell: "powershell" },
  );
  const match = analysis.mutatingCommands[0].reasons[0].issues[0];
  const diagnostic = mutationAttemptDiagnostic({
    after: { sha256: "a".repeat(64) },
    analysis,
    before: { sha256: "a".repeat(64) },
    paths: [temporaryFixture],
    statusAfter: "",
    statusBefore: "",
  });

  assert.ok(expectedOffset > 600);
  assert.equal(match.kind, "REDIRECTION_UNSUPPORTED");
  assert.equal(match.offset, expectedOffset);
  assert.equal(match.quoteState, "unquoted");
  assert.ok(match.context.length <= 160);
  assert.equal(match.context, ">");
  assert.equal(match.contextStart, expectedOffset);
  assert.match(diagnostic, new RegExp(`issue=REDIRECTION_UNSUPPORTED offset=${expectedOffset}`));
  assert.match(diagnostic, /contextLength=1 context=">"/);
  assert.doesNotMatch(diagnostic, /BEGIN_OF_COMMAND_SHOULD_NOT_APPEAR/);
  assert.doesNotMatch(diagnostic, new RegExp(credential));
  assert.doesNotMatch(diagnostic, new RegExp(temporaryFixture.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(diagnostic, /command="/);
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
