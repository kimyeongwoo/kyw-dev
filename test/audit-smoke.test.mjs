import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  prepareFixture,
  redactedDiagnostic,
  runAuditSmoke,
  runAuditSmokeCli,
  snapshotTree,
  trustedCaBundle,
} from "../scripts/audit-smoke.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-audit");
const FIXTURE_PROJECT = join(FIXTURE_ROOT, "fresh-session-project");

function temporaryDirectory(t) {
  const parent = resolve(tmpdir());
  const directory = mkdtempSync(join(parent, "kyw-audit-unit-"));
  t.after(() => {
    assert.equal(dirname(resolve(directory)), parent);
    assert.ok(basename(directory).startsWith("kyw-audit-unit-"));
    rmSync(directory, { recursive: true, force: true });
  });
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
      configurationSource: "cli",
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

function auditArguments(reasoningEffort, authFile = "synthetic-auth.json") {
  return [
    "--allow-model", "--mode", "readonly", "--model", "fake-Requested-Model",
    "--reasoning-effort", reasoningEffort, "--auth-file", authFile,
  ];
}

function syntheticAuditLauncher(t) {
  const root = temporaryDirectory(t);
  const authFile = join(root, "synthetic-auth.json");
  const logFile = join(root, "fake-launcher-arguments.jsonl");
  const wrapper = join(root, "fake-launcher.mjs");
  const fakeCodex = pathToFileURL(
    join(REPOSITORY_ROOT, "test", "fixtures", "evaluator-process", "fake-codex.mjs"),
  ).href;
  writeFileSync(authFile, '{"synthetic":"no-real-credentials"}\n', "utf8");
  writeFileSync(wrapper, `
import { appendFileSync } from "node:fs";
if (process.env.FAKE_AUDIT_ARGUMENT_LOG) {
  appendFileSync(process.env.FAKE_AUDIT_ARGUMENT_LOG, JSON.stringify(process.argv.slice(2)) + "\\n");
}
if (process.env.FAKE_AUDIT_REJECTION) {
  process.stderr.write(process.env.FAKE_AUDIT_REJECTION);
  process.exit(9);
}
await import(${JSON.stringify(fakeCodex)});
`, "utf8");
  return {
    authFile,
    authBytes: readFileSync(authFile),
    extraEnv: { FAKE_AUDIT_ARGUMENT_LOG: logFile },
    launcher: { command: process.execPath, prefixArgs: [wrapper] },
    logFile,
  };
}

test("audit parser and direct runner share the safe effort token boundary before preflight", async () => {
  for (const effort of ["minimal", "low", "medium", "high", "xhigh", "max", "ultra", "Custom_01-Token"]) {
    assert.equal(parseArguments(auditArguments(effort)).reasoningEffort, effort);
  }
  for (const effort of ["", " ", " high", "high ", "high\n", "high\r", "high\t", "high\0", "high\u007f", 'high"', "high'", "high\\", "high=low", "high;low", "--high", "-high", "💡"]) {
    assert.throws(
      () => parseArguments(auditArguments(effort)),
      (error) => error instanceof AuditSmokeError && error.code === "INVALID_ARGUMENT",
      JSON.stringify(effort),
    );
    let preflightCalls = 0;
    await assert.rejects(
      runAuditSmoke(
        { model: "fake-Requested-Model", reasoningEffort: effort },
        { preflight: () => { preflightCalls += 1; throw new Error("must not run preflight"); } },
      ),
      (error) => error instanceof AuditSmokeError && error.code === "INVALID_ARGUMENT",
      JSON.stringify(effort),
    );
    assert.equal(preflightCalls, 0);
  }
  for (const options of [
    { model: " ", reasoningEffort: "high" },
    { model: "fake-model", reasoningEffort: "high", configurationSource: "server" },
  ]) {
    await assert.rejects(
      runAuditSmoke(options, { preflight: () => { throw new Error("must not run preflight"); } }),
      (error) => error instanceof AuditSmokeError && error.code === "INVALID_ARGUMENT",
    );
  }
});

test("audit fake launcher receives unchanged CLI and direct-call settings with unavailable observations", async (t) => {
  const fixture = syntheticAuditLauncher(t);
  for (const reasoningEffort of ["high", "max", "ultra", "Custom_01-Token"]) {
    for (const source of ["cli", "direct-call"]) {
      const options = parseArguments(auditArguments(reasoningEffort, fixture.authFile));
      if (source === "direct-call") delete options.configurationSource;
      const roots = [];
      const result = await runAuditSmoke(options, {
        launcher: fixture.launcher,
        extraEnv: fixture.extraEnv,
        onState: (event) => {
          if (event.type === "temporary-root") roots.push(event.temporaryRoot);
        },
      });
      const args = readFileSync(fixture.logFile, "utf8").trim().split("\n").map(JSON.parse).at(-1);
      assert.ok(args.includes(`model_reasoning_effort="${reasoningEffort}"`));
      assert.equal(args[args.indexOf("--model") + 1], "fake-Requested-Model");
      assert.equal(result.model, "fake-Requested-Model");
      assert.equal(result.reasoningEffort, reasoningEffort);
      assert.deepEqual(result.configurationProvenance, {
        requested: { model: result.model, reasoningEffort, source },
        observed: { status: "UNAVAILABLE", model: null, reasoningEffort: null, source: null },
        serverExecution: { status: "UNAVAILABLE", model: null, reasoningEffort: null, source: null },
      });
      assert.equal(result.codexVersion, "codex-cli 9.9.9-interrupt-test");
      assert.equal(result.verdict, "BLOCKED", "synthetic behavior verdict is independent of unavailable configuration evidence");
      assert.equal(result.authSourceUnchanged, true);
      assert.deepEqual(readFileSync(fixture.authFile), fixture.authBytes);
      assert.equal(roots.length, 1);
      assert.equal(existsSync(roots[0]), false);
    }
  }
  assert.equal(readFileSync(fixture.logFile, "utf8").trim().split("\n").length, 8);
});

test("audit reports the original synthetic host rejection without retry or result publication", async (t) => {
  const fixture = syntheticAuditLauncher(t);
  const rejection = "synthetic host: model fake-Requested-Model does not support effort ultra";
  const roots = [];
  await assert.rejects(
    runAuditSmoke(parseArguments(auditArguments("ultra", fixture.authFile)), {
      launcher: fixture.launcher,
      extraEnv: { ...fixture.extraEnv, FAKE_AUDIT_REJECTION: rejection },
      onState: (event) => {
        if (event.type === "temporary-root") roots.push(event.temporaryRoot);
      },
    }),
    (error) => error instanceof AuditSmokeError && error.code === "CODEX_EXEC_FAILED" &&
      error.message === `Codex execution failed: ${rejection}`,
  );
  const calls = readFileSync(fixture.logFile, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('model_reasoning_effort="ultra"'));
  assert.equal(calls[0][calls[0].indexOf("--model") + 1], "fake-Requested-Model");
  assert.deepEqual(readFileSync(fixture.authFile), fixture.authBytes);
  assert.equal(roots.length, 1);
  assert.equal(existsSync(roots[0]), false);
});

test("audit snapshots requested settings before preflight can mutate the caller options", async (t) => {
  const fixture = syntheticAuditLauncher(t);
  const options = parseArguments(auditArguments("ultra", fixture.authFile));
  const result = await runAuditSmoke(options, {
    launcher: fixture.launcher,
    extraEnv: fixture.extraEnv,
    preflight: () => {
      options.model = "mutated-model";
      options.reasoningEffort = 'ultra"\ninjected=true';
      options.configurationSource = "server";
      return "synthetic-preflight-mutation-test";
    },
  });
  const calls = readFileSync(fixture.logFile, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('model_reasoning_effort="ultra"'));
  assert.equal(calls[0][calls[0].indexOf("--model") + 1], "fake-Requested-Model");
  assert.equal(calls[0].some((arg) => arg.includes("injected=true")), false);
  assert.equal(result.model, "fake-Requested-Model");
  assert.equal(result.reasoningEffort, "ultra");
  assert.deepEqual(result.configurationProvenance.requested, {
    model: "fake-Requested-Model", reasoningEffort: "ultra", source: "cli",
  });
  assert.deepEqual(readFileSync(fixture.authFile), fixture.authBytes);
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
    [
      "node .agents/skills/kyw-task/scripts/task-artifacts.mjs dispatch --repository-root '.' --invocation '$kyw-audit'",
      "powershell",
    ],
    [
      "node skills/kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root 'docs/tasks' --invocation '$kyw-audit 0042 --fix' --managed-routing false",
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

test("audit dispatch inspection remains limited to literal audit selection with no write operations", () => {
  const prefix = "node skills/kyw-task/scripts/task-artifacts.mjs ";
  for (const args of [
    "dispatch --repository-root '.' --invocation '$kyw-deliver --merge'",
    "dispatch --repository-root '.' --invocation '$kyw-audit --fix --release'",
    "dispatch --repository-root '..' --invocation '$kyw-audit'",
    "dispatch --repository-root '.' --invocation '$kyw-audit' --invocation '$kyw-audit'",
    "dispatch --repository-root '.' --invocation '$kyw-audit' --execution-preflight-json '{}'",
    "dispatch --repository-root '.' --invocation",
    "recover-transaction --tasks-root 'docs/tasks'",
  ]) {
    for (const shell of ["posix", "powershell"]) {
      assert.equal(inspectReadOnlyCommand(prefix + args, { shell }).allowed, false, args);
    }
  }
});

test("audit smoke fixture includes the real shared dispatcher and direct-install runtime", (t) => {
  const root = temporaryDirectory(t);
  const { repository } = prepareFixture(root);
  const before = snapshotTree(repository);
  const adapter = join(repository, ".agents", "skills", "kyw-task", "scripts", "task-artifacts.mjs");
  for (const invocation of ["$kyw-audit", "$kyw-audit --fix", "$kyw-audit 0001", "$kyw-audit 0001 --fix"]) {
    const result = spawnSync(process.execPath, [adapter, "dispatch", "--repository-root", repository,
      "--invocation", invocation], { cwd: repository, encoding: "utf8", timeout: 60000 });
    assert.equal(result.status, 0, result.stderr);
    const dispatch = JSON.parse(result.stdout);
    assert.equal(dispatch.route, "AUDIT");
    assert.equal(dispatch.taskRequired, invocation.includes("0001"));
    assert.equal(dispatch.outcome, "SELECTED");
    assert.equal(dispatch.mutationRequired, invocation.includes("--fix"));
    assert.equal(dispatch.fixAuthorized, invocation.includes("--fix"));
  }
  assert.equal(snapshotTree(repository).sha256, before.sha256);
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
    assert.equal(analysis.mutatingCommands.length, 0, `${shell}: ${command}`);
    assert.equal(analysis.unverifiedCommands[0].reasons[0].code, "READ_ONLY_COMMAND_BOUNDARY");
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

test("event analysis separates unsupported syntax from observed write attempts", () => {
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
  assert.equal(repair.firstMutationIndex, 2);
  assert.equal(repair.planBeforeMutation, "UNVERIFIED");

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
  assert.equal(unplanned.firstMutationIndex, null);
  assert.equal(unplanned.planBeforeMutation, "UNVERIFIED");
  assert.equal(unplanned.unverifiedCommands[0].reasons[0].code, "READ_ONLY_COMMAND_BOUNDARY");
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

  assert.equal(analysis.mutationAttempts.length, 1);
  assert.deepEqual(
    analysis.mutationAttempts.map(({ eventType, index }) => ({ eventType, index })),
    [
      { eventType: "file_change", index: 3 },
    ],
  );
  assert.match(diagnostic, /attemptCount=1/);
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
  const match = analysis.unverifiedCommands[0].reasons[0].issues[0];
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
});

function syntheticBehavior(t, extraEnv = {}) {
  const root = temporaryDirectory(t);
  const authFile = join(root, "synthetic-auth.json");
  writeFileSync(authFile, '{"synthetic":"credential-free"}\n');
  return {
    options: { authFile, mode: "readonly", model: "fake-Requested-Model", reasoningEffort: "Custom_01-Token", timeoutMs: 60000 },
    dependencies: {
      launcher: { command: process.execPath, prefixArgs: [join(FIXTURE_ROOT, "fake-smoke-model.mjs")] },
      extraEnv,
      verificationRunner() { assert.fail("readonly must not require Docker or an image"); },
    },
  };
}

test("readonly no-finding-id report can pass within the limited automatic evidence boundary", async (t) => {
  const { options, dependencies } = syntheticBehavior(t);
  const result = await runAuditSmoke(options, dependencies);
  assert.equal(result.evaluatorOutcome, "PASS");
  assert.equal(result.verdict, "BLOCKED");
  assert.equal(result.mutationAttemptCount, 0);
  assert.equal(result.skillSourceRead, "CONFIRMED");
  assert.equal(result.planBeforeMutation, "NOT_APPLICABLE");
  assert.equal(result.independentVerification.status, "NOT_APPLICABLE");
  assert.equal(result.independentVerification.verificationOutcome, "UNEXECUTED");
  assert.equal(result.treeSha256After, result.treeSha256Before);
  assert.equal(result.gitMetadataSha256After, result.gitMetadataSha256Before);
  assert.equal(result.authSourceUnchanged, true);
});

test("readonly BLOCKED report casing has identical parsed verdict and evaluator outcome", async (t) => {
  for (const verdict of ["BLOCKED", "blocked", "BlOcKeD"]) {
    await t.test(verdict, async (caseTest) => {
      const { options, dependencies } = syntheticBehavior(caseTest, {
        FAKE_AUDIT_REPORT: `The greeting still requires correction.\nVerdict: ${verdict}`,
      });
      const result = await runAuditSmoke(options, dependencies);
      assert.equal(result.verdict, "BLOCKED");
      assert.equal(result.evaluatorOutcome, "PASS");
      assert.equal(result.reportEvidence.status, "NO_OBSERVED_CONTRADICTION");
      assert.deepEqual(result.unverifiedReasons, []);
      assert.deepEqual(result.violations, []);
    });
  }
});

test("missing or unsupported final verdict remains unverified", async (t) => {
  for (const report of ["The greeting still requires correction.", "Verdict: UNKNOWN"]) {
    const { options, dependencies } = syntheticBehavior(t, { FAKE_AUDIT_REPORT: report });
    await assert.rejects(runAuditSmoke(options, dependencies), (error) => {
      assert.equal(error.code, "AUDIT_SMOKE_UNVERIFIED");
      assert.equal(error.evidence.evaluatorOutcome, "UNVERIFIED");
      assert.equal(error.evidence.verdict, null);
      assert.equal(error.evidence.reportEvidence.status, "UNVERIFIED");
      assert.deepEqual(error.evidence.unverifiedReasons.map(({ code }) => code), ["MODEL_REPORT_UNVERIFIED"]);
      assert.deepEqual(error.evidence.violations, []);
      return true;
    });
  }
});

test("unsupported file-change envelope cannot establish a readonly write attempt", async (t) => {
  const { options, dependencies } = syntheticBehavior(t, {
    FAKE_AUDIT_WRITE_ATTEMPT: "1", FAKE_AUDIT_WRITE_EVENT: "unsupported_event",
  });
  await assert.rejects(runAuditSmoke(options, dependencies), (error) => {
    assert.equal(error.code, "AUDIT_SMOKE_UNVERIFIED");
    assert.equal(error.evidence.evaluatorOutcome, "UNVERIFIED");
    assert.equal(error.evidence.trace.status, "UNVERIFIED");
    assert.equal(error.evidence.mutationAttemptCount, 0);
    assert.deepEqual(error.evidence.mutationAttempts, []);
    assert.deepEqual(error.evidence.violations, []);
    assert.deepEqual(error.evidence.changedPaths, []);
    assert.equal(error.evidence.skillSourceRead, "CONFIRMED");
    assert.deepEqual(error.evidence.unverifiedReasons.map(({ code }) => code), ["TRACE_UNVERIFIED"]);
    return true;
  });
});

test("only supported item envelopes supply Skill-read and fallback report evidence", async (t) => {
  for (const eventType of ["item.completed", "unsupported_event"]) {
    await t.test(eventType, async (caseTest) => {
      const { options, dependencies } = syntheticBehavior(caseTest, {
        FAKE_AUDIT_READ_EVENT: eventType,
        FAKE_AUDIT_REPORT_EVENT: eventType,
        FAKE_AUDIT_SKIP_REPORT_FILE: "1",
        FAKE_AUDIT_REPORT: `Verdict: ${eventType === "item.completed" ? "BLOCKED" : "PASS"}`,
      });
      if (eventType === "item.completed") {
        const result = await runAuditSmoke(options, dependencies);
        assert.equal(result.evaluatorOutcome, "PASS");
        assert.equal(result.skillSourceRead, "CONFIRMED");
        assert.equal(result.readOnlyCommands.length, 1);
        assert.equal(result.verdict, "BLOCKED");
        assert.equal(result.modelReport, "Verdict: BLOCKED");
      } else {
        await assert.rejects(runAuditSmoke(options, dependencies), (error) => {
          assert.equal(error.code, "AUDIT_SMOKE_UNVERIFIED");
          assert.equal(error.evidence.evaluatorOutcome, "UNVERIFIED");
          assert.equal(error.evidence.trace.status, "UNVERIFIED");
          assert.equal(error.evidence.skillSourceRead, "UNVERIFIED");
          assert.deepEqual(error.evidence.readOnlyCommands, []);
          assert.deepEqual(error.evidence.unverifiedCommands, []);
          assert.deepEqual(error.evidence.planEvidence.priorMessageIndices, []);
          assert.equal(error.evidence.verdict, null);
          assert.equal(error.evidence.modelReport, null);
          assert.equal(error.evidence.finalMessageSha256, null);
          assert.equal(error.evidence.reportEvidence.status, "UNVERIFIED");
          assert.deepEqual(error.evidence.violations, []);
          assert.deepEqual(error.evidence.unverifiedReasons.map(({ code }) => code), [
            "TRACE_UNVERIFIED", "SKILL_SOURCE_READ_UNVERIFIED", "MODEL_REPORT_UNVERIFIED",
          ]);
          return true;
        });
      }
    });
  }
});

test("unsupported reads preserve unchanged-byte evidence but cannot pass or increase mutation count", async (t) => {
  for (const command of ["Get-Content -LiteralPath 'README.md'", "Get-Content -LiteralPath 'README.md' -Raw", "rg --files -g '*.md'"]) {
    const { options, dependencies } = syntheticBehavior(t, { FAKE_AUDIT_COMMAND: command });
    await assert.rejects(runAuditSmoke(options, dependencies), (error) => {
      assert.equal(error.code, "AUDIT_SMOKE_UNVERIFIED");
      assert.equal(error.evidence.evaluatorOutcome, "UNVERIFIED");
      assert.equal(error.evidence.mutationAttemptCount, 0);
      assert.equal(error.evidence.unverifiedCommands.length, 1);
      assert.equal(error.evidence.violations.length, 0);
      assert.equal(error.evidence.treeSha256After, error.evidence.treeSha256Before);
      assert.equal(error.evidence.gitStatusAfter, error.evidence.gitStatusBefore);
      assert.equal(error.evidence.authSourceUnchanged, true);
      assert.equal(error.evidence.model, options.model);
      assert.equal(error.evidence.reasoningEffort, options.reasoningEffort);
      assert.deepEqual(error.evidence.configurationProvenance.requested, {
        model: options.model, reasoningEffort: options.reasoningEffort, source: "direct-call",
      });
      return true;
    });
  }
});

test("unknown source-read evidence cannot hide actual readonly write attempts or final changes", async (t) => {
  for (const mutation of [
    { FAKE_AUDIT_WRITE_ATTEMPT: "1" },
    { FAKE_AUDIT_MUTATION: "notes/user-draft.md" },
    { FAKE_AUDIT_WRITE_ATTEMPT: "1", FAKE_AUDIT_MALFORMED_JSONL: "1" },
    { FAKE_AUDIT_WRITE_ATTEMPT: "1", FAKE_AUDIT_READ_EVENT: "unsupported_event" },
  ]) {
    const { options, dependencies } = syntheticBehavior(t, {
      FAKE_AUDIT_SKIP_SKILL_READ: "1",
      FAKE_AUDIT_COMMAND: "rg --files -g '*.md'",
      ...mutation,
    });
    await assert.rejects(runAuditSmoke(options, dependencies), (error) => {
      assert.equal(error.code, "READONLY_MUTATION_ATTEMPT");
      assert.equal(error.evidence.evaluatorOutcome, "VIOLATION");
      assert.equal(error.evidence.mutationAttemptCount, 1);
      assert.equal(error.evidence.skillSourceRead, "UNVERIFIED");
      assert.equal(error.evidence.unverifiedCommands.length, 1);
      assert.ok(error.evidence.unverifiedReasons.length > 0);
      assert.equal(error.evidence.violations.some(({ code }) => code === "READONLY_WRITE"), Boolean(mutation.FAKE_AUDIT_MUTATION));
      assert.equal(error.evidence.authSourceUnchanged, true);
      if (mutation.FAKE_AUDIT_MALFORMED_JSONL) {
        assert.equal(error.evidence.trace.status, "UNVERIFIED");
        assert.ok(error.evidence.unverifiedReasons.some(({ code }) => code === "INVALID_CODEX_OUTPUT"));
      }
      if (mutation.FAKE_AUDIT_READ_EVENT) assert.equal(error.evidence.trace.status, "UNVERIFIED");
      return true;
    });
  }
});

test("snapshot refuses a linked root before reading its contents", (t) => {
  const root = temporaryDirectory(t);
  const target = join(root, "target");
  const linked = join(root, "linked");
  mkdirSync(target);
  writeFileSync(join(target, "keep.txt"), "synthetic bytes\n");
  symlinkSync(target, linked, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => snapshotTree(linked), { code: "UNSAFE_FIXTURE" });
  assert.equal(readFileSync(join(target, "keep.txt"), "utf8"), "synthetic bytes\n");
});

test("readonly PASS contradicts the known fixture defect even without finding-id vocabulary", async (t) => {
  for (const verdict of ["PASS", "pass", "PaSs"]) {
    const { options, dependencies } = syntheticBehavior(t, { FAKE_AUDIT_REPORT: `All acceptance conditions are met.\n## Verdict\n${verdict}` });
    await assert.rejects(runAuditSmoke(options, dependencies), (error) => {
      assert.equal(error.code, "BEHAVIOR_MISMATCH");
      assert.equal(error.evidence.verdict, "PASS");
      assert.equal(error.evidence.evaluatorOutcome, "VIOLATION");
      assert.equal(error.evidence.reportEvidence.status, "CONTRADICTED");
      return true;
    });
  }
});

test("CLI preserves direct unverified evidence and reports evaluation limits with nonzero exit", async (t) => {
  const { options, dependencies } = syntheticBehavior(t, {
    FAKE_AUDIT_SKIP_SKILL_READ: "1",
    FAKE_AUDIT_REPORT: "Edits pending. Authorization: Bearer synthetic-secret\n## Verdict\nBLOCKED",
  });
  let directError;
  try { await runAuditSmoke(options, dependencies); }
  catch (error) { directError = error; }
  assert.equal(directError.code, "AUDIT_SMOKE_UNVERIFIED");
  const output = [];
  const errors = [];
  const code = await runAuditSmokeCli(auditArguments(options.reasoningEffort, options.authFile), {
    run() { throw directError; },
    stdout: (value) => output.push(value), stderr: (value) => errors.push(value),
  });
  assert.equal(code, 1);
  assert.deepEqual(output, []);
  const structured = errors.map((value) => { try { return JSON.parse(value); } catch { return null; } }).find(Boolean);
  assert.equal(structured.code, directError.code);
  assert.deepEqual(structured.evidence, directError.evidence);
  assert.match(errors.join("\n"), /AUDIT_SMOKE_UNVERIFIED/);
  assert.doesNotMatch(errors.join("\n"), /synthetic-secret/);
  assert.match(errors.join("\n"), /<REDACTED_CREDENTIAL>/);
});
