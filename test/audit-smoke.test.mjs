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
  diffSnapshots,
  extractFinalVerdict,
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
