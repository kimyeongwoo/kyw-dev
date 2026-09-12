import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { AuditSmokeError, runAuditSmoke } from "../scripts/audit-smoke.mjs";

const MODEL_FIXTURE = fileURLToPath(new URL("./fixtures/kyw-audit/fake-smoke-model.mjs", import.meta.url));
const REPAIR_PATHS = [
  "docs/tasks/0001-greeting-contract/TASK.md", "docs/tasks/0001-greeting-contract/TEST.md",
  "src/greeting.mjs", "test/greeting.test.mjs",
];

function harness(t, { mode = "fix", extraEnv = {}, imageUnavailable = false,
  cleanup = "COMPLETED", exitStatus = 0, execution = "complete", onVerification, interruptAfterClose = false } = {}) {
  const parent = realpathSync(tmpdir());
  const base = mkdtempSync(join(parent, "kyw-audit-fix-test-"));
  t.after(() => {
    assert.equal(dirname(resolve(base)), parent);
    rmSync(base, { recursive: true, force: true });
  });
  const authFile = join(base, "synthetic-auth.json");
  const promptLog = join(base, "synthetic-prompt.txt");
  const verificationTemporaryParent = join(base, "verification");
  mkdirSync(verificationTemporaryParent);
  writeFileSync(authFile, '{"synthetic":"no-real-authentication"}\n');
  const authBefore = readFileSync(authFile);
  const processTarget = new EventEmitter();
  const dockerTimeout = Symbol("synthetic-docker-timeout");
  const state = { boundedCalls: [], spawns: [], verificationErrors: [], authFile, authBefore, promptLog, base, verificationTemporaryParent };
  const dependencies = {
    launcher: { command: process.execPath, prefixArgs: [MODEL_FIXTURE] },
    extraEnv: { FAKE_AUDIT_CASE: mode === "fix" ? "fix" : "readonly", FAKE_AUDIT_PROMPT_LOG: promptLog, ...extraEnv },
    processTarget,
    verificationTemporaryParent,
    ...(execution === "timeout" ? { scheduler: {
      setTimeout(callback, milliseconds) {
        if (milliseconds === 120000) {
          queueMicrotask(callback);
          return dockerTimeout;
        }
        return setTimeout(callback, milliseconds);
      },
      clearTimeout(handle) { if (handle !== dockerTimeout) clearTimeout(handle); },
    } } : {}),
    onState(event) {
      if (event.type === "repository") state.repository = event.repository;
      if (event.type === "temporary-root") state.temporaryRoot = event.temporaryRoot;
      if (event.type === "isolated-state") state.controlDirectory = event.controlDirectory;
    },
    verificationRunner: async (command, args, options) => {
      state.boundedCalls.push({ command, args, options });
      assert.equal(command, "docker");
      assert.notEqual(args[0], "run");
      assert.deepEqual(options, { timeout: 10000, maxBuffer: 4096, windowsHide: true });
      if (args[0] === "image") {
        if (imageUnavailable) throw Object.assign(new Error("synthetic unavailable local image"), { code: "ENOENT" });
        return { stdout: `sha256:${"c".repeat(64)}`, stderr: "" };
      }
      if (cleanup === "UNKNOWN") throw new Error("synthetic daemon state unavailable after CLI close");
      if (args[1] === "inspect") return { stdout: cleanup === "BLOCKED" ? "another-owner" : args.at(-1), stderr: "" };
      if (cleanup === "FAILED") throw new Error("synthetic daemon refused container removal");
      return { stdout: "", stderr: "" };
    },
    spawnChild(command, args, options) {
      state.spawns.push({ command, args, options });
      if (command !== "docker") {
        assert.equal(command, process.execPath);
        assert.equal(args[0], MODEL_FIXTURE);
        return spawn(command, args, options);
      }
      if (execution === "spawn") throw Object.assign(new Error("synthetic Docker spawn failed"), { code: "ENOENT" });
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = new EventEmitter();
      child.stdin.end = () => queueMicrotask(async () => {
        try {
          child.emit("spawn");
          const mount = args[args.indexOf("--mount") + 1];
          state.workspace = mount.slice("type=bind,source=".length, -",target=/work".length);
          state.repairedSource = readFileSync(join(state.repository, "src/greeting.mjs"), "utf8");
          state.repairedTask = readFileSync(join(state.repository, REPAIR_PATHS[0]), "utf8");
          if (execution === "timeout") return;
          await onVerification?.(state);
          if (execution === "output") {
            child.stdout.emit("data", Buffer.alloc(1024 * 1024 + 1, "a"));
            return;
          }
          if (execution === "interruption") {
            processTarget.emit("SIGINT");
            return;
          }
          child.stdout.emit("data", "synthetic independent test output\n");
          child.stderr.emit("data", exitStatus ? "synthetic assertion failure\n" : "");
          child.emit("close", exitStatus, null);
          if (interruptAfterClose) queueMicrotask(() => processTarget.emit("SIGINT"));
        } catch (error) {
          state.verificationErrors.push(error);
          child.emit("error", error);
          child.emit("close", 1, null);
        }
      });
      return child;
    },
  };
  const options = { mode, model: "Synthetic-Requested-Model", reasoningEffort: "Custom_01-Token", authFile, timeoutMs: 10000 };
  const run = async () => {
    let value;
    let error;
    try { value = await runAuditSmoke(options, dependencies); } catch (caught) { error = caught; }
    assert.deepEqual(state.verificationErrors, []);
    assert.equal(processTarget.listenerCount("SIGINT"), 0);
    assert.equal(processTarget.listenerCount("SIGTERM"), 0);
    assert.equal(existsSync(state.temporaryRoot), false, "safe owned model control is cleaned after evaluation");
    return { value, error, evidence: error?.evidence ?? value };
  };
  return { ...state, state, dependencies, options, run };
}

function assertUnverified(result) {
  assert.equal(result.value, undefined);
  assert.ok(result.error instanceof AuditSmokeError);
  assert.equal(result.error.code, "AUDIT_SMOKE_UNVERIFIED");
  assert.equal(result.evidence.evaluatorOutcome, "UNVERIFIED");
  assert.deepEqual(result.evidence.violations, []);
}

test("synthetic fix reaches fixed isolated verification while honest pending report and plan remain distinct", async (t) => {
  const fixture = harness(t, { onVerification(state) {
    assert.match(state.repairedSource, /Hello,.*!/u);
    assert.match(state.repairedTask, /Independent execution pending/u);
    assert.deepEqual(readdirSync(state.workspace), ["package.json", "src", "test"]);
    assert.equal(readFileSync(join(state.workspace, "src/greeting.mjs"), "utf8"), state.repairedSource);
    assert.equal(existsSync(join(state.workspace, ".git")), false);
    assert.equal(existsSync(join(state.workspace, ".agents")), false);
  } });
  const result = await fixture.run();
  assertUnverified(result);
  assert.equal(result.evidence.verdict, "BLOCKED");
  assert.equal(result.evidence.modelExecution, "COMPLETED");
  assert.equal(result.evidence.planBeforeMutation, "UNVERIFIED");
  assert.equal(result.evidence.skillSourceRead, "CONFIRMED");
  assert.equal(result.evidence.mutationAttemptCount, 1);
  assert.deepEqual(result.evidence.changedPaths, REPAIR_PATHS);
  assert.equal(result.evidence.authSourceUnchanged, true);
  assert.equal(result.evidence.independentVerification.verificationOutcome, "PASSED");
  assert.equal(result.evidence.independentVerification.completed, true);
  assert.equal(result.evidence.independentVerification.cleanup.outcome, "COMPLETED");
  assert.deepEqual(fixture.state.spawns.map(({ command }) => command), [process.execPath, "docker"]);
  assert.deepEqual(fixture.state.spawns[1].args.slice(-4), [`sha256:${"c".repeat(64)}`, "node", "--test", "test/greeting.test.mjs"]);
  assert.equal(result.evidence.model, "Synthetic-Requested-Model");
  assert.equal(result.evidence.reasoningEffort, "Custom_01-Token");
  assert.equal(result.evidence.codexVersion, "codex-cli 9.9.9-audit-fixture");
  assert.deepEqual(readFileSync(fixture.authFile), fixture.authBefore);
  assert.match(readFileSync(fixture.promptLog, "utf8"), /independent/iu);
  assert.match(readFileSync(fixture.promptLog, "utf8"), /pending|UNEXECUTED/iu);
});

test("unavailable local execution remains unexecuted without host fallback or model retry", async (t) => {
  const fixture = harness(t, { imageUnavailable: true });
  const result = await fixture.run();
  assertUnverified(result);
  assert.equal(result.evidence.independentVerification.status, "UNAVAILABLE");
  assert.equal(result.evidence.independentVerification.verificationOutcome, "UNEXECUTED");
  assert.equal(result.evidence.independentVerification.attempted, false);
  assert.equal(result.evidence.independentVerification.completed, false);
  assert.equal(fixture.state.spawns.length, 1);
  assert.equal(fixture.state.boundedCalls.length, 1);
  assert.equal(fixture.state.boundedCalls[0].args[0], "image");
  assert.equal(result.evidence.authSourceUnchanged, true);
  assert.deepEqual(readdirSync(fixture.verificationTemporaryParent), []);
});

test("completed isolated test failure outranks unknown source-read and natural plan evidence", async (t) => {
  const fixture = harness(t, { exitStatus: 7, extraEnv: { FAKE_AUDIT_SKIP_SKILL_READ: "1" } });
  const credential = "sk-syntheticToken1234567890";
  fixture.dependencies.extraEnv.FAKE_AUDIT_COMMAND = `Get-Content -LiteralPath '${fixture.authFile}'; OPENAI_API_KEY=${credential}`;
  const result = await fixture.run();
  assert.equal(result.value, undefined);
  assert.equal(result.error.code, "FIX_VERIFICATION_FAILED");
  assert.equal(result.evidence.evaluatorOutcome, "VIOLATION");
  assert.equal(result.evidence.skillSourceRead, "UNVERIFIED");
  assert.equal(result.evidence.planBeforeMutation, "UNVERIFIED");
  assert.equal(result.evidence.independentVerification.verificationOutcome, "FAILED");
  assert.equal(result.evidence.independentVerification.exitCode, 7);
  assert.equal(result.evidence.independentVerification.completed, true);
  assert.equal(result.evidence.independentVerification.cleanup.outcome, "COMPLETED");
  assert.ok(result.evidence.unverifiedReasons.length > 0);
  assert.ok(result.evidence.violations.some(({ code }) => code === "FIX_VERIFICATION_FAILED"));
  assert.equal(fixture.state.boundedCalls.at(-1).args[1], "rm");
  const output = JSON.stringify(result.evidence);
  assert.equal(output.includes(credential), false);
  assert.equal(output.includes(fixture.authFile), false);
  assert.equal(output.includes(fixture.authFile.replaceAll("\\", "\\\\")), false);
  assert.match(output, /REDACTED_CREDENTIAL/u);
  assert.equal(result.evidence.model, fixture.options.model);
  assert.equal(result.evidence.reasoningEffort, fixture.options.reasoningEffort);
});

test("final verifier changes to protected originals are rejected even when its copy reports success", async (t) => {
  for (const [name, relativePath, contents, code] of [
    ["authentication", null, '{"synthetic":"changed"}\n', "AUTH_SOURCE_CHANGED"],
    ["user notes", "notes/user-draft.md", "\nchanged after model\n", "POST_VERIFICATION_WRITE"],
    ["Task", REPAIR_PATHS[0], "\nchanged after model\n", "POST_VERIFICATION_WRITE"],
    ["Git config", ".git/config", "\n[alias]\n synthetic = status\n", "GIT_STATE_CHANGED"],
    ["Git hook", ".git/hooks/pre-commit", "#!/bin/sh\nexit 0\n", "GIT_STATE_CHANGED"],
    ["installed verifier", ".agents/skills/kyw-audit/scripts/verify.mjs", "\n// changed after model\n", "POST_VERIFICATION_WRITE"],
    ["repaired source", "src/greeting.mjs", "\n// changed after model\n", "POST_VERIFICATION_WRITE"],
  ]) {
    await t.test(name, async (caseTest) => {
      const fixture = harness(caseTest, { onVerification(state) {
        if (relativePath) appendFileSync(join(state.repository, relativePath), contents);
        else writeFileSync(state.authFile, contents);
      } });
      const result = await fixture.run();
      assert.equal(result.value, undefined);
      assert.equal(result.error.code, code);
      assert.equal(result.evidence.evaluatorOutcome, "VIOLATION");
      assert.equal(result.evidence.independentVerification.verificationOutcome, "PASSED");
      assert.ok(result.evidence.violations.some((violation) => violation.code === code));
      if (!relativePath) assert.equal(result.evidence.authSourceUnchanged, false);
    });
  }
});

test("uncertain daemon cleanup survives outer cleanup and retains the original verification outcome", async (t) => {
  for (const cleanup of ["UNKNOWN", "BLOCKED", "FAILED"]) {
    const fixture = harness(t, { cleanup });
    const result = await fixture.run();
    assertUnverified(result);
    const verification = result.evidence.independentVerification;
    assert.equal(verification.verificationOutcome, "PASSED");
    assert.equal(verification.completed, true);
    assert.equal(verification.cleanup.outcome, cleanup);
    assert.ok(verification.cleanup.reason);
    assert.equal(existsSync(verification.cleanup.temporaryPath), true);
    assert.equal(existsSync(verification.cleanup.temporaryParent), true);
    assert.equal(existsSync(fixture.state.temporaryRoot), false);
    assert.equal(existsSync(fixture.state.controlDirectory), false);
    assert.equal(readFileSync(join(verification.cleanup.temporaryPath, "work/src/greeting.mjs"), "utf8"), fixture.state.repairedSource);
  }
});

test("SIGINT immediately after the final child closes prevents success and preserves verification evidence", async (t) => {
  const fixture = harness(t, { interruptAfterClose: true, cleanup: "UNKNOWN" });
  const result = await fixture.run();
  assert.equal(result.value, undefined);
  assert.equal(result.error.code, "AUDIT_SMOKE_INTERRUPTED");
  assert.equal(result.error.exitCode, 130);
  assert.ok(result.evidence.independentVerification);
  assert.equal(result.evidence.independentVerification.cleanup.outcome, "UNKNOWN");
  assert.equal(existsSync(result.evidence.independentVerification.cleanup.temporaryPath), true);
  assert.notEqual(result.evidence.evaluatorOutcome, "PASS");
});

test("confirmed absent pre-write speech is a violation but unsupported prior commands leave plan order unknown", async (t) => {
  const absent = harness(t, { extraEnv: { FAKE_AUDIT_PLAN: "none" } });
  const absentResult = await absent.run();
  assert.equal(absentResult.error.code, "PLAN_ORDER_VIOLATION");
  assert.equal(absentResult.evidence.planBeforeMutation, "ABSENT");
  assert.equal(absentResult.evidence.independentVerification.verificationOutcome, "PASSED");
  const uncertain = harness(t, { extraEnv: { FAKE_AUDIT_PLAN: "none", FAKE_AUDIT_COMMAND: "rg --files -g '*.md'" } });
  const uncertainResult = await uncertain.run();
  assertUnverified(uncertainResult);
  assert.equal(uncertainResult.evidence.planBeforeMutation, "UNVERIFIED");
  assert.equal(uncertainResult.evidence.independentVerification.verificationOutcome, "PASSED");
});

test("unverified model evidence leaves long verification lifecycle limits active after the model child", async (t) => {
  for (const execution of ["spawn", "timeout", "output", "interruption"]) {
    await t.test(execution, async (caseTest) => {
      const fixture = harness(caseTest, { execution, cleanup: "UNKNOWN",
        extraEnv: { FAKE_AUDIT_SKIP_SKILL_READ: "1", FAKE_AUDIT_COMMAND: "rg --files -g '*.md'" },
      });
      const result = await fixture.run();
      assert.equal(result.value, undefined);
      assert.equal(result.error.code, execution === "interruption" ? "AUDIT_SMOKE_INTERRUPTED" : "AUDIT_SMOKE_UNVERIFIED");
      assert.equal(result.evidence.evaluatorOutcome, "UNVERIFIED");
      assert.deepEqual(result.evidence.violations, []);
      assert.equal(result.evidence.modelExecution, "COMPLETED");
      assert.equal(result.evidence.planBeforeMutation, "UNVERIFIED");
      assert.equal(result.evidence.skillSourceRead, "UNVERIFIED");
      assert.equal(fixture.state.spawns.length, 2);
      const verification = result.evidence.independentVerification;
      assert.equal(verification.verificationOutcome, execution === "spawn" ? "UNEXECUTED" : "UNKNOWN");
      assert.equal(verification.completed, false);
      assert.equal(verification.executed, false);
      assert.equal(verification.executionFailure.code, {
        spawn: "ENOENT", timeout: "ETIMEDOUT", output: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", interruption: "EVALUATOR_INTERRUPTED",
      }[execution]);
      assert.equal(verification.cleanup.outcome, "UNKNOWN");
      assert.ok(verification.cleanup.reason);
      assert.equal(fixture.state.boundedCalls.at(-1).args[0], "container");
      assert.equal(fixture.state.boundedCalls.at(-1).args[1], "inspect");
      assert.equal(existsSync(verification.cleanup.temporaryPath), true);
      assert.equal(result.evidence.preservation, "UNVERIFIED");
      assert.equal(result.evidence.authSourceUnchanged, null);
      assert.equal(existsSync(fixture.state.controlDirectory), false);
      if (execution === "interruption") assert.equal(result.error.exitCode, 130);
    });
  }
});

test("completed test failure remains a violation when daemon cleanup is unknown", async (t) => {
  const fixture = harness(t, { exitStatus: 4, cleanup: "UNKNOWN",
    extraEnv: { FAKE_AUDIT_SKIP_SKILL_READ: "1" },
  });
  const result = await fixture.run();
  assert.equal(result.value, undefined);
  assert.equal(result.error.code, "FIX_VERIFICATION_FAILED");
  assert.equal(result.evidence.evaluatorOutcome, "VIOLATION");
  assert.equal(result.evidence.independentVerification.verificationOutcome, "FAILED");
  assert.equal(result.evidence.independentVerification.completed, true);
  assert.equal(result.evidence.independentVerification.exitCode, 4);
  assert.equal(result.evidence.independentVerification.cleanup.outcome, "UNKNOWN");
  assert.equal(existsSync(result.evidence.independentVerification.cleanup.temporaryPath), true);
  assert.ok(result.evidence.violations.some(({ code }) => code === "FIX_VERIFICATION_FAILED"));
  assert.ok(result.evidence.unverifiedReasons.some(({ code }) => code === "VERIFICATION_CLEANUP_UNVERIFIED"));
  assert.equal(result.evidence.preservation, "UNVERIFIED");
});

test("fix without required repairs remains incomplete despite a completed independent check", async (t) => {
  const fixture = harness(t, { extraEnv: { FAKE_AUDIT_CASE: "readonly" } });
  const result = await fixture.run();
  assert.equal(result.value, undefined);
  assert.equal(result.error.code, "FIX_INCOMPLETE");
  assert.equal(result.evidence.evaluatorOutcome, "VIOLATION");
  assert.equal(result.evidence.modelExecution, "COMPLETED");
  assert.deepEqual(result.evidence.changedPaths, []);
  assert.equal(result.evidence.independentVerification.verificationOutcome, "PASSED");
  assert.ok(result.evidence.violations.some(({ code }) => code === "FIX_INCOMPLETE"));
  assert.equal(fixture.state.spawns.length, 2);
});

test("fix scope and user-file violations remain confirmed alongside unknown command and read evidence", async (t) => {
  const fixture = harness(t, { extraEnv: {
    FAKE_AUDIT_MUTATION: "notes/user-draft.md",
    FAKE_AUDIT_SKIP_SKILL_READ: "1",
    FAKE_AUDIT_COMMAND: "rg --files -g '*.md'",
  } });
  const result = await fixture.run();
  assert.equal(result.value, undefined);
  assert.equal(result.error.code, "FIX_SCOPE_VIOLATION");
  assert.equal(result.evidence.evaluatorOutcome, "VIOLATION");
  assert.equal(result.evidence.planBeforeMutation, "UNVERIFIED");
  assert.equal(result.evidence.skillSourceRead, "UNVERIFIED");
  assert.equal(result.evidence.independentVerification.verificationOutcome, "PASSED");
  assert.ok(result.evidence.changedPaths.includes("notes/user-draft.md"));
  assert.equal(result.evidence.preservation, "UNVERIFIED", "a preserved post-model snapshot does not undo a model's user-file violation");
  assert.ok(result.evidence.violations.some(({ code }) => code === "FIX_SCOPE_VIOLATION"));
  assert.ok(result.evidence.violations.some(({ code }) => code === "USER_FILE_CHANGED"));
  assert.ok(result.evidence.unverifiedReasons.length > 0);
  assert.equal(fixture.state.spawns.length, 2);
});

test("removal of a previously observed original root remains a confirmed violation", async (t) => {
  for (const gitOnly of [true, false]) {
    await t.test(gitOnly ? "Git root removed" : "fixture root removed", async (caseTest) => {
      const fixture = harness(caseTest, { onVerification(state) {
        const repository = realpathSync(state.repository);
        const target = gitOnly ? realpathSync(join(repository, ".git")) : repository;
        assert.equal(dirname(target), gitOnly ? repository : realpathSync(state.temporaryRoot));
        rmSync(target, { recursive: true, force: false });
      } });
      const result = await fixture.run();
      assert.equal(result.value, undefined);
      assert.equal(result.error.code, "GIT_STATE_CHANGED");
      assert.equal(result.evidence.evaluatorOutcome, "VIOLATION");
      assert.equal(result.evidence.independentVerification.verificationOutcome, "PASSED");
      assert.ok(result.evidence.violations.some(({ code }) => code === "GIT_STATE_CHANGED"));
      assert.equal(result.evidence.gitStatusAfter, null);
      assert.equal(result.evidence.preservation, "UNVERIFIED");
      if (!gitOnly) {
        assert.ok(result.evidence.violations.some(({ code }) => code === "POST_VERIFICATION_WRITE"));
        assert.equal(result.evidence.treeSha256After, null);
      }
    });
  }
});
