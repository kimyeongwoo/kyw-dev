import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runAuditSmoke } from "../scripts/audit-smoke.mjs";
import {
  defaultRemoveEvaluatorOwnedPath,
  defaultRemoveOwnedPath,
} from "../scripts/evaluator-process.mjs";
import { runComparison, runEvaluation } from "../scripts/grilling-eval/core.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FAKE_CODEX = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "evaluator-process",
  "fake-codex.mjs",
);
const FAKE_LAUNCHER = { command: process.execPath, prefixArgs: [FAKE_CODEX] };

function temporaryDirectory(t, prefix = "kyw-evaluator-cleanup-") {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function processTarget() {
  const target = new EventEmitter();
  target.kill = process.kill.bind(process);
  return target;
}

function processAlive(pid) {
  if (!Number.isInteger(pid)) return false;
  if (process.platform === "linux") {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      const state = stat.slice(stat.lastIndexOf(")") + 2).split(" ", 1)[0];
      if (new Set(["X", "Z"]).has(state)) return false;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (new Set(["ESRCH", "ENOENT"]).has(error?.code)) return false;
    throw error;
  }
}

async function waitFor(predicate, description, milliseconds = 8_000) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.ok(predicate(), `Timed out waiting for ${description}`);
}

async function readReady(path) {
  await waitFor(() => existsSync(path), `readiness marker ${normalizedOwnedPath(path)}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function stopExactPid(pid) {
  if (!Number.isInteger(pid)) return;
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (new Set(["ESRCH", "ENOENT"]).has(error?.code)) return;
    throw error;
  }
}

function stopFixtureProcesses(ready) {
  if (!ready) return;
  if (process.platform === "win32") {
    if (!Number.isInteger(ready.pid)) return;
    const result = spawnSync(
      "taskkill.exe",
      ["/PID", String(ready.pid), "/T", "/F"],
      {
        encoding: "utf8",
        timeout: 5_000,
        windowsHide: true,
      },
    );
    if (result.error) throw result.error;
    // taskkill uses status 128 when the exact PID is already absent.
    if (!new Set([0, 128]).has(result.status)) {
      const error = new Error(`taskkill failed with status=${result.status ?? "unknown"}`);
      error.code = "TASKKILL_FAILED";
      throw error;
    }
    return;
  }
  stopExactPid(ready.descendantPid);
  stopExactPid(ready.pid);
}

function startFlow(
  t,
  flow,
  {
    behavior = "normal",
    forcedTerminationMs = 1_000,
    gracefulTerminationMs = 250,
    launcher = FAKE_LAUNCHER,
    modelTurnTimeoutMs = 3_000,
    onState,
    preflight,
    processTarget: target,
    removeOwnedPath = defaultRemoveEvaluatorOwnedPath,
  } = {},
) {
  const root = temporaryDirectory(t, `kyw-${flow}-flow-`);
  const authFile = join(root, "auth-source.json");
  const outputRoot = join(root, "results");
  const readyPath = join(root, "ready.json");
  const authBytes = Buffer.from('{"synthetic":"credential-free"}\n');
  writeFileSync(authFile, authBytes);
  const events = [];
  const stateHandler = (event) => {
    events.push(event);
    onState?.(event);
  };
  const extraEnv = {
    FAKE_EVALUATOR_BEHAVIOR: behavior,
    FAKE_EVALUATOR_STATE_FILE: readyPath,
  };
  const promise =
    flow === "audit"
      ? runAuditSmoke(
          {
            authFile,
            mode: "readonly",
            model: "fake-model",
            reasoningEffort: "high",
            timeoutMs: modelTurnTimeoutMs,
          },
          {
            extraEnv,
            forcedTerminationMs,
            gracefulTerminationMs,
            launcher,
            onState: stateHandler,
            preflight,
            processTarget: target,
            removeOwnedPath,
          },
        )
      : runEvaluation({
          authFile,
          extraEnv,
          forcedTerminationMs,
          gracefulTerminationMs,
          launcher,
          model: "fake-model",
          modelTurnTimeoutMs,
          onState: stateHandler,
          outputRoot,
          preflight,
          processTarget: target,
          reasoningEffort: "high",
          removeOwnedPath,
          scenario: "existing-code-facts",
          variant: "kyw",
        });
  return { authBytes, authFile, events, flow, outputRoot, promise, readyPath, root };
}

function temporaryEvent(events) {
  return events.find((event) => event.type === "temporary-root");
}

function isolatedEvent(events) {
  return events.find((event) => event.type === "isolated-state");
}

function normalizedOwnedPath(path) {
  const normalized = String(path).replaceAll("\\", "/");
  const normalizedTemporaryRoot = tmpdir().replaceAll("\\", "/").replace(/\/$/, "");
  const normalizedHome = homedir().replaceAll("\\", "/").replace(/\/$/, "");
  if (normalized === normalizedTemporaryRoot || normalized.startsWith(`${normalizedTemporaryRoot}/`)) {
    return `<TASK_TEMP>${normalized.slice(normalizedTemporaryRoot.length)}`;
  }
  if (normalized === normalizedHome || normalized.startsWith(`${normalizedHome}/`)) {
    return `<USER_HOME>${normalized.slice(normalizedHome.length)}`;
  }
  return normalized;
}

function terminalDiagnostic(invocation, { error, phase = "terminal" } = {}) {
  const processStates = invocation.events
    .filter((event) => event.type === "child-spawn")
    .map((event) => `child:${event.pid}:alive=${processAlive(event.pid)}`);
  if (existsSync(invocation.readyPath)) {
    try {
      const ready = JSON.parse(readFileSync(invocation.readyPath, "utf8"));
      for (const [label, pid] of [
        ["ready-child", ready.pid],
        ["ready-descendant", ready.descendantPid],
      ]) {
        if (Number.isInteger(pid)) processStates.push(`${label}:${pid}:alive=${processAlive(pid)}`);
      }
    } catch {
      processStates.push("ready-state=invalid");
    }
  }
  const cleanupDiagnostics = String(error?.message ?? "")
    .split("\n")
    .filter((line) => /^(?:cleanup|termination) operation=/.test(line));
  return [
    `flow=${invocation.flow}`,
    `phase=${phase}`,
    `eventOrder=${invocation.events.map((event) => event.type).join(">") || "none"}`,
    `processState=${processStates.join(",") || "none-observed"}`,
    `cleanupDiagnostics=${cleanupDiagnostics.join("|") || "none"}`,
  ].join(" ");
}

function assertOwnedPathAbsent(path, pathLabel, diagnostic) {
  const exists = existsSync(path);
  assert.equal(
    exists,
    false,
    `${diagnostic} pathLabel=${pathLabel} ownedPath=${normalizedOwnedPath(path)} existence=${exists}`,
  );
}

function assertOwnedStateRemoved(invocation, context) {
  const diagnostic = terminalDiagnostic(invocation, context);
  const temporary = temporaryEvent(invocation.events);
  assert.ok(
    temporary,
    `${diagnostic} temporary root acquisition must be observable to the fixture`,
  );
  assertOwnedPathAbsent(temporary.temporaryRoot, "temporary-root", diagnostic);
  const isolated = isolatedEvent(invocation.events);
  if (isolated) {
    for (const [pathLabel, path] of [
      ["auth-copy", isolated.authCopy],
      ["codex-home", isolated.codexHome],
      ["evaluation-repository", isolated.evalRepository],
      ["audit-repository", isolated.repository],
      ["temporary-home", isolated.temporaryHome],
    ]) {
      if (path) assertOwnedPathAbsent(path, pathLabel, diagnostic);
    }
  }
  for (const staging of invocation.events.filter((event) => event.type === "staging")) {
    assertOwnedPathAbsent(staging.stagingDirectory, "unpublished-staging", diagnostic);
  }
  assert.deepEqual(
    readFileSync(invocation.authFile),
    invocation.authBytes,
    `${diagnostic} auth source must remain byte-identical`,
  );
}

function assertNoIncompletePublication(invocation, context) {
  if (!existsSync(invocation.outputRoot)) return;
  const names = readdirSync(invocation.outputRoot);
  const diagnostic = terminalDiagnostic(invocation, context);
  assert.equal(
    names.some((name) => name.startsWith(".staging-")),
    false,
    `${diagnostic} pathLabel=output-root ownedPath=${normalizedOwnedPath(invocation.outputRoot)} incompleteStaging=${names.filter((name) => name.startsWith(".staging-")).join(",") || "none"}`,
  );
  assert.equal(
    names.some((name) => name.startsWith("comparison-")),
    false,
    `${diagnostic} pathLabel=output-root ownedPath=${normalizedOwnedPath(invocation.outputRoot)} incompleteComparison=${names.filter((name) => name.startsWith("comparison-")).join(",") || "none"}`,
  );
}

test("both evaluator flows preserve success and ordinary cleanup", async (t) => {
  for (const flow of ["audit", "grilling"]) {
    const invocation = startFlow(t, flow);
    const completed = await invocation.promise;
    assertOwnedStateRemoved(invocation);
    if (flow === "audit") {
      assert.equal(completed.authSourceUnchanged, true);
      assert.equal(completed.verdict, "BLOCKED");
    } else {
      assert.ok(
        existsSync(completed.resultDirectory),
        `flow=${flow} phase=success pathLabel=published-result ownedPath=${normalizedOwnedPath(completed.resultDirectory)} existence=false`,
      );
      assert.equal(completed.result.status.startsWith("completed"), true);
      assert.equal(
        invocation.events.filter((event) => event.type === "published").length,
        1,
      );
    }
  }
});

test("both evaluator flows preserve handled child failure and publish nothing incomplete", async (t) => {
  for (const flow of ["audit", "grilling"]) {
    const invocation = startFlow(t, flow, { behavior: "nonzero" });
    await assert.rejects(invocation.promise, (error) => error?.code === "CODEX_EXEC_FAILED");
    assertOwnedStateRemoved(invocation);
    assertNoIncompletePublication(invocation);
  }
});

test("both evaluator flows preserve timeout classification and remove the timed-out tree", async (t) => {
  for (const flow of ["audit", "grilling"]) {
    const invocation = startFlow(t, flow, {
      behavior: "hang-ignore-term",
      modelTurnTimeoutMs: 1_000,
    });
    const ready = await readReady(invocation.readyPath);
    t.after(() => {
      stopFixtureProcesses(ready);
    });
    await assert.rejects(
      invocation.promise,
      (error) =>
        error?.code === (flow === "audit" ? "CODEX_EXEC_FAILED" : "CODEX_TIMEOUT"),
    );
    await waitFor(() => !processAlive(ready.pid), `${flow} timed-out child exit`);
    await waitFor(
      () => !processAlive(ready.descendantPid),
      `${flow} timed-out descendant exit`,
    );
    assertOwnedStateRemoved(invocation);
    assertNoIncompletePublication(invocation);
  }
});

test("both evaluator flows preserve spawn-failure classification and cleanup", async (t) => {
  for (const flow of ["audit", "grilling"]) {
    const missing = join(tmpdir(), `missing-codex-${flow}-${process.pid}`);
    const invocation = startFlow(t, flow, {
      launcher: { command: missing, prefixArgs: [] },
      preflight:
        flow === "audit"
          ? () => "codex-cli synthetic-preflight"
          : () => ({ capabilities: {}, version: "codex-cli synthetic-preflight" }),
    });
    await assert.rejects(invocation.promise, (error) => error?.code === "CODEX_EXEC_FAILED");
    assertOwnedStateRemoved(invocation);
    assertNoIncompletePublication(invocation);
  }
});

test("both evaluator flows interrupt active children idempotently without listener leaks", async (t) => {
  for (const flow of ["audit", "grilling"]) {
    const target = processTarget();
    const baselineInt = target.listenerCount("SIGINT");
    const baselineTerm = target.listenerCount("SIGTERM");
    const invocation = startFlow(t, flow, {
      behavior: "hang-ignore-term",
      modelTurnTimeoutMs: 20_000,
      processTarget: target,
    });
    const ready = await readReady(invocation.readyPath);
    t.after(() => {
      stopFixtureProcesses(ready);
    });
    target.emit("SIGINT");
    target.emit("SIGINT");
    await assert.rejects(
      invocation.promise,
      (error) =>
        error?.code ===
          (flow === "audit" ? "AUDIT_SMOKE_INTERRUPTED" : "EVALUATION_INTERRUPTED") &&
        error?.exitCode === 130,
    );
    await waitFor(() => !processAlive(ready.pid), `${flow} interrupted child exit`);
    await waitFor(
      () => !processAlive(ready.descendantPid),
      `${flow} interrupted descendant exit`,
    );
    assertOwnedStateRemoved(invocation);
    assertNoIncompletePublication(invocation);
    assert.equal(target.listenerCount("SIGINT"), baselineInt);
    assert.equal(target.listenerCount("SIGTERM"), baselineTerm);
  }
});

test("interruption checkpoints clean partially acquired resources and prevent publication", async (t) => {
  const cases = [
    ["audit", "temporary-root"],
    ["audit", "isolated-state"],
    ["audit", "child-spawn"],
    ["grilling", "temporary-root"],
    ["grilling", "isolated-state"],
    ["grilling", "staging"],
    ["grilling", "child-spawn"],
    ["grilling", "publication-ready"],
  ];
  for (const [flow, phase] of cases) {
    const target = processTarget();
    let emitted = false;
    let observedError;
    const invocation = startFlow(t, flow, {
      onState(event) {
        if (!emitted && event.type === phase) {
          emitted = true;
          target.emit("SIGINT");
          target.emit("SIGINT");
        }
      },
      processTarget: target,
    });
    await assert.rejects(
      invocation.promise,
      (error) => {
        observedError = error;
        return (
          error?.code ===
          (flow === "audit" ? "AUDIT_SMOKE_INTERRUPTED" : "EVALUATION_INTERRUPTED")
        );
      },
      `${flow} ${phase}`,
    );
    assert.equal(emitted, true, `${flow} ${phase}`);
    const context = { error: observedError, phase };
    assertOwnedStateRemoved(invocation, context);
    assertNoIncompletePublication(invocation, context);
    assert.equal(
      invocation.events.filter((event) => event.type === "published").length,
      0,
    );
  }
});

test("both evaluator flows await owned removal before interruption becomes terminal", async (t) => {
  for (const flow of ["audit", "grilling"]) {
    const target = processTarget();
    const baselineInt = target.listenerCount("SIGINT");
    const baselineTerm = target.listenerCount("SIGTERM");
    let releaseRemoval;
    let reportRemovalStarted;
    const removalStarted = new Promise((resolve) => {
      reportRemovalStarted = resolve;
    });
    const removalReleased = new Promise((resolve) => {
      releaseRemoval = resolve;
    });
    let removalCompleted;
    const invocation = startFlow(t, flow, {
      onState(event) {
        if (event.type === "temporary-root") target.emit("SIGINT");
      },
      processTarget: target,
      removeOwnedPath(path, options) {
        reportRemovalStarted();
        removalCompleted = removalReleased.then(() => defaultRemoveOwnedPath(path, options));
        return removalCompleted;
      },
    });
    let observedError;
    const terminal = invocation.promise.then(
      () => "resolved",
      (error) => {
        observedError = error;
        return "rejected";
      },
    );
    await removalStarted;
    const stateBeforeRelease = await Promise.race([
      terminal,
      new Promise((resolve) => setImmediate(() => resolve("pending"))),
    ]);
    const acquired = temporaryEvent(invocation.events);
    assert.ok(acquired, `flow=${flow} phase=temporary-root acquisition event`);
    assert.equal(
      existsSync(acquired.temporaryRoot),
      true,
      `flow=${flow} phase=temporary-root pathLabel=temporary-root ownedPath=${normalizedOwnedPath(acquired.temporaryRoot)} existence=false before release`,
    );
    releaseRemoval();
    await removalCompleted;
    assert.equal(
      stateBeforeRelease,
      "pending",
      `flow=${flow} phase=temporary-root terminal state must await owned removal`,
    );
    assert.equal(await terminal, "rejected", `flow=${flow} phase=temporary-root`);
    assert.equal(
      observedError?.code,
      flow === "audit" ? "AUDIT_SMOKE_INTERRUPTED" : "EVALUATION_INTERRUPTED",
      `flow=${flow} phase=temporary-root first interruption cause must be preserved`,
    );
    assertOwnedStateRemoved(invocation, {
      error: observedError,
      phase: "temporary-root-delayed-removal",
    });
    assertNoIncompletePublication(invocation, {
      error: observedError,
      phase: "temporary-root-delayed-removal",
    });
    assert.equal(target.listenerCount("SIGINT"), baselineInt, `flow=${flow} SIGINT listeners`);
    assert.equal(target.listenerCount("SIGTERM"), baselineTerm, `flow=${flow} SIGTERM listeners`);
  }
});

test("an interruption during ordinary cleanup remains bounded for both flows", async (t) => {
  for (const flow of ["audit", "grilling"]) {
    const target = processTarget();
    let emitted = false;
    const invocation = startFlow(t, flow, {
      onState(event) {
        if (!emitted && event.type === "cleanup-complete") {
          emitted = true;
          target.emit("SIGINT");
        }
      },
      processTarget: target,
    });
    await assert.rejects(
      invocation.promise,
      (error) =>
        error?.code ===
        (flow === "audit" ? "AUDIT_SMOKE_INTERRUPTED" : "EVALUATION_INTERRUPTED"),
    );
    assert.equal(emitted, true);
    assertOwnedStateRemoved(invocation);
    if (flow === "grilling") {
      const published = invocation.events.find((event) => event.type === "published");
      assert.ok(published);
      assert.equal(
        existsSync(published.publishedDirectory),
        true,
        `flow=${flow} phase=cleanup-complete pathLabel=published-result ownedPath=${normalizedOwnedPath(published.publishedDirectory)} existence=false`,
      );
    }
  }
});

test("cleanup failures append one safe diagnostic while interruption stays primary", async (t) => {
  const secret = "sk-fixture-secret-value";
  for (const flow of ["audit", "grilling"]) {
    const target = processTarget();
    const leakedRoots = [];
    const invocation = startFlow(t, flow, {
      behavior: "hang",
      onState(event) {
        if (event.type === "temporary-root") leakedRoots.push(event.temporaryRoot);
      },
      processTarget: target,
      removeOwnedPath(path) {
        throw Object.assign(new Error(`${path} ${secret}`), { code: "EACCES" });
      },
    });
    t.after(() => {
      for (const path of leakedRoots) rmSync(path, { recursive: true, force: true });
    });
    const ready = await readReady(invocation.readyPath);
    t.after(() => {
      stopFixtureProcesses(ready);
    });
    let observed;
    target.emit("SIGINT");
    await assert.rejects(invocation.promise, (error) => {
      observed = error;
      return (
        error?.code ===
        (flow === "audit" ? "AUDIT_SMOKE_INTERRUPTED" : "EVALUATION_INTERRUPTED")
      );
    });
    await waitFor(() => !processAlive(ready.pid), `${flow} cleanup-failure child exit`);
    await waitFor(
      () => !processAlive(ready.descendantPid),
      `${flow} cleanup-failure descendant exit`,
    );
    assert.match(observed.message, /Evaluator interrupted by SIGINT/);
    assert.match(observed.message, /cleanup operation=/);
    assert.match(observed.message, /pathLabel=/);
    assert.match(observed.message, /reason=EACCES/);
    assert.equal(observed.message.includes(secret), false);
    assert.equal(observed.message.includes(invocation.authFile), false);
    assert.equal(observed.message.includes(homedir()), false);
    const diagnostics = observed.message
      .split("\n")
      .filter((line) => line.startsWith("cleanup operation="));
    assert.equal(new Set(diagnostics).size, diagnostics.length);
    if (existsSync(invocation.outputRoot)) {
      const entries = readdirSync(invocation.outputRoot);
      assert.equal(entries.some((name) => !name.startsWith(".")), false);
      assert.equal(entries.some((name) => name.startsWith("comparison-")), false);
    }
  }
});

test("an incomplete comparison preserves already atomically published run directories", async (t) => {
  const root = temporaryDirectory(t, "kyw-grilling-preserve-");
  const outputRoot = join(root, "results");
  const authFile = join(root, "auth.json");
  const extraEnv = { FAKE_EVALUATOR_BEHAVIOR: "normal" };
  writeFileSync(authFile, '{"synthetic":"credential-free"}\n', "utf8");
  await assert.rejects(
    runComparison({
      authFile,
      extraEnv,
      launcher: FAKE_LAUNCHER,
      model: "fake-model",
      onState(event) {
        if (event.type === "published") extraEnv.FAKE_EVALUATOR_BEHAVIOR = "nonzero";
      },
      outputRoot,
      reasoningEffort: "high",
      runs: 1,
      scenarios: ["existing-code-facts"],
    }),
    (error) => error?.code === "CODEX_EXEC_FAILED",
  );
  const entries = readdirSync(outputRoot);
  assert.equal(entries.filter((name) => !name.startsWith(".")).length, 1);
  assert.equal(entries.some((name) => name.startsWith(".staging-")), false);
  assert.equal(entries.some((name) => name.startsWith("comparison-")), false);
  const runPath = join(outputRoot, entries[0], "run.json");
  assert.equal(
    existsSync(runPath),
    true,
    `flow=grilling phase=comparison-failure pathLabel=published-run ownedPath=${normalizedOwnedPath(runPath)} existence=false`,
  );
});
