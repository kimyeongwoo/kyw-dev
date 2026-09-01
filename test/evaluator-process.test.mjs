import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  cleanupFailureDiagnostic,
  createEvaluatorRunScope,
  DEFAULT_CLEANUP_MAX_RETRIES,
  DEFAULT_CLEANUP_RETRY_DELAY_MS,
  defaultRemoveEvaluatorOwnedPath,
  defaultRemoveOwnedPath,
} from "../scripts/evaluator-process.mjs";
import {
  createReadinessRecord,
  inspectReadinessText,
  publishReadiness,
  waitForReadiness,
} from "./fixtures/evaluator-process/readiness.mjs";
import {
  createFixtureChildOwner,
  FIXTURE_CHILD_CLOSE_TIMEOUT_MS,
} from "./fixtures/evaluator-process/child-owner.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FAKE_CHILD = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "evaluator-process",
  "fake-child.mjs",
);

function temporaryDirectory(t, prefix = "kyw-evaluator-process-") {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function processTarget() {
  const target = new EventEmitter();
  target.kill = process.kill.bind(process);
  return target;
}

function controlledChild(pid = 42_001) {
  const child = new EventEmitter();
  child.pid = pid;
  child.stdin = new EventEmitter();
  child.stdin.end = () => {};
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  queueMicrotask(() => child.emit("spawn"));
  return child;
}

function manualScheduler() {
  let currentTime = 0;
  let nextHandle = 1;
  const timers = new Map();
  const runDueTimers = () => {
    const due = [...timers.entries()]
      .filter(([, timer]) => timer.deadline <= currentTime)
      .sort((left, right) => left[1].deadline - right[1].deadline);
    for (const [handle, timer] of due) {
      if (!timers.delete(handle)) continue;
      timer.callback();
    }
  };
  return {
    advance(milliseconds) {
      currentTime += milliseconds;
      runDueTimers();
    },
    pendingTimers() {
      return timers.size;
    },
    scheduler: {
      clearTimeout(handle) {
        timers.delete(handle);
      },
      async delay(milliseconds) {
        currentTime += milliseconds;
        runDueTimers();
      },
      now() {
        return currentTime;
      },
      setTimeout(callback, milliseconds) {
        const handle = nextHandle;
        nextHandle += 1;
        timers.set(handle, { callback, deadline: currentTime + milliseconds });
        return handle;
      },
      async yield() {},
    },
  };
}

function controlledTimeout() {
  let nextHandle = 1;
  const timers = new Map();
  return {
    fire() {
      assert.equal(timers.size, 1, "one owned child timeout must be pending");
      const [[handle, callback]] = timers;
      timers.delete(handle);
      callback();
    },
    pending() {
      return timers.size;
    },
    scheduler: {
      clearTimeout(handle) {
        timers.delete(handle);
      },
      setTimeout(callback) {
        const handle = nextHandle;
        nextHandle += 1;
        timers.set(handle, callback);
        return handle;
      },
    },
  };
}

function controlledFixtureCloseTimeout() {
  let nextHandle = 1;
  const timers = new Map();
  return {
    fireAll() {
      const callbacks = [...timers.values()].map(({ callback }) => callback);
      timers.clear();
      for (const callback of callbacks) callback();
    },
    pending() {
      return timers.size;
    },
    scheduler: {
      clearTimeout(handle) {
        timers.delete(handle);
      },
      setTimeout(callback, milliseconds) {
        assert.equal(milliseconds, FIXTURE_CHILD_CLOSE_TIMEOUT_MS);
        const handle = nextHandle;
        nextHandle += 1;
        timers.set(handle, { callback, milliseconds });
        return handle;
      },
    },
  };
}

function fixtureCleanupRegistration() {
  let cleanup;
  return {
    context: {
      after(callback) {
        assert.equal(cleanup, undefined, "fixture cleanup must register exactly once");
        cleanup = callback;
      },
    },
    registered() {
      assert.equal(typeof cleanup, "function", "fixture cleanup must register eagerly");
      return cleanup;
    },
  };
}

async function settleMicrotasks() {
  for (let index = 0; index < 4; index += 1) await Promise.resolve();
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

async function waitFor(
  predicate,
  description,
  milliseconds = 30_000,
  diagnostics = () => "state=unavailable",
) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!predicate()) {
    throw new Error(`Timed out waiting for ${description}; ${diagnostics()}`);
  }
}

async function readReady(path, expectedRunId, pathLabel) {
  return waitForReadiness({ path, expectedRunId, pathLabel });
}

function newScope(target, options = {}) {
  return createEvaluatorRunScope({
    forcedTerminationMs: 1_000,
    gracefulTerminationMs: 250,
    processTarget: target,
    ...options,
  });
}

test("retained fixture child close ownership registers before spawn and is repeat-safe", async () => {
  const registration = fixtureCleanupRegistration();
  const child = controlledChild(42_101);
  const taskkillCalls = [];
  const owner = createFixtureChildOwner(registration.context, {
    platform: "win32",
    spawnChild() {
      registration.registered();
      return child;
    },
    taskkill(...args) {
      taskkillCalls.push(args);
      return { status: 0 };
    },
  });

  assert.equal(owner.spawnChild("fixture", [], { detached: true }), child);
  assert.equal(child.listenerCount("exit"), 1);
  assert.equal(child.listenerCount("close"), 1);
  assert.equal(owner.retain(child), child, "retaining the same handle is idempotent");
  assert.equal(child.listenerCount("exit"), 1);
  assert.equal(child.listenerCount("close"), 1);

  child.emit("exit", 0, null);
  child.emit("close", 0, null);
  const firstCleanup = owner.cleanup();
  assert.equal(owner.cleanup(), firstCleanup);
  assert.equal(registration.registered()(), firstCleanup);
  await firstCleanup;

  assert.deepEqual(taskkillCalls, []);
  assert.equal(child.listenerCount("exit"), 0);
  assert.equal(child.listenerCount("close"), 0);
});

test("retained fixture child close ownership is safe without a child and after spawn failure", async () => {
  const absentRegistration = fixtureCleanupRegistration();
  const absentOwner = createFixtureChildOwner(absentRegistration.context, {
    spawnChild() {
      throw Object.assign(new Error("synthetic spawn failure"), { code: "ENOENT" });
    },
  });
  assert.throws(
    () => absentOwner.spawnChild("missing-fixture"),
    (error) => error?.code === "ENOENT",
  );
  await absentOwner.cleanup();

  const missingRegistration = fixtureCleanupRegistration();
  const missingOwner = createFixtureChildOwner(missingRegistration.context, {
    spawnChild: () => undefined,
  });
  assert.throws(
    () => missingOwner.spawnChild("missing-handle"),
    (error) => error?.code === "FIXTURE_CHILD_HANDLE_MISSING",
  );
  await missingOwner.cleanup();

  const pendingRegistration = fixtureCleanupRegistration();
  const closeControl = controlledFixtureCloseTimeout();
  const child = controlledChild(42_102);
  const taskkillCalls = [];
  const pendingOwner = createFixtureChildOwner(pendingRegistration.context, {
    platform: "win32",
    scheduler: closeControl.scheduler,
    spawnChild: () => child,
    taskkill(...args) {
      taskkillCalls.push(args);
      return { status: 0 };
    },
  });
  pendingOwner.spawnChild("fixture", [], { detached: true });
  child.emit("exit", 1, null);
  const cleanup = pendingOwner.cleanup();
  assert.equal(closeControl.pending(), 1, "close remains the postcondition after exit");
  assert.deepEqual(taskkillCalls, [], "an exited handle must not trigger PID reuse action");
  child.emit("close", 1, null);
  await cleanup;
  assert.equal(closeControl.pending(), 0);
  assert.equal(child.listenerCount("exit"), 0);
  assert.equal(child.listenerCount("close"), 0);
});

test("retained fixture child close accepts taskkill diagnostics only after close", async () => {
  for (const taskkillResult of [
    { status: 255 },
    {
      error: Object.assign(new Error("synthetic taskkill launch failure"), {
        code: "ENOENT",
      }),
      status: null,
    },
  ]) {
    const registration = fixtureCleanupRegistration();
    const closeControl = controlledFixtureCloseTimeout();
    const alreadyClosed = controlledChild(42_103);
    const live = controlledChild(42_104);
    const taskkillCalls = [];
    const owner = createFixtureChildOwner(registration.context, {
      platform: "win32",
      scheduler: closeControl.scheduler,
      spawnChild: (() => {
        const children = [alreadyClosed, live];
        return () => children.shift();
      })(),
      taskkill(...args) {
        taskkillCalls.push(args);
        return taskkillResult;
      },
    });
    owner.spawnChild("closed-fixture", [], { detached: true });
    owner.spawnChild("live-fixture", [], { detached: true });
    alreadyClosed.emit("exit", 0, null);
    alreadyClosed.emit("close", 0, null);

    const cleanup = registration.registered()();
    assert.deepEqual(taskkillCalls, [
      [
        "taskkill.exe",
        ["/PID", "42104", "/T", "/F"],
        {
          encoding: "utf8",
          timeout: FIXTURE_CHILD_CLOSE_TIMEOUT_MS,
          windowsHide: true,
        },
      ],
    ]);
    assert.equal(closeControl.pending(), 1);
    live.emit("exit", taskkillResult.status, null);
    live.emit("close", taskkillResult.status, null);
    await cleanup;

    assert.equal(closeControl.pending(), 0);
    assert.equal(alreadyClosed.listenerCount("exit"), 0);
    assert.equal(alreadyClosed.listenerCount("close"), 0);
    assert.equal(live.listenerCount("exit"), 0);
    assert.equal(live.listenerCount("close"), 0);
  }
});

test("retained fixture child close requests only its captured POSIX ownership boundary", async () => {
  for (const expectation of [
    { detached: true, target: -42_106, error: null },
    { detached: false, target: 42_106, error: "EPERM" },
  ]) {
    const registration = fixtureCleanupRegistration();
    const closeControl = controlledFixtureCloseTimeout();
    const child = controlledChild(42_106);
    const killCalls = [];
    const owner = createFixtureChildOwner(registration.context, {
      killProcess(target, signal) {
        killCalls.push([target, signal]);
        if (expectation.error) {
          throw Object.assign(new Error("synthetic POSIX kill failure"), {
            code: expectation.error,
          });
        }
      },
      platform: "linux",
      scheduler: closeControl.scheduler,
      spawnChild: () => child,
    });
    owner.spawnChild("fixture", [], { detached: expectation.detached });
    const cleanup = registration.registered()();
    assert.deepEqual(killCalls, [[expectation.target, "SIGKILL"]]);
    child.emit("exit", 0, null);
    child.emit("close", 0, null);
    await cleanup;
    assert.equal(closeControl.pending(), 0);
    assert.equal(child.listenerCount("exit"), 0);
    assert.equal(child.listenerCount("close"), 0);
  }
});

test("retained fixture child close times out with bounded taskkill state", async () => {
  for (const expectation of [
    { result: { status: 255 }, status: "255", error: "none" },
    {
      result: {
        error: Object.assign(new Error("synthetic taskkill failure"), { code: "EACCES" }),
        status: null,
      },
      status: "null",
      error: "EACCES",
    },
  ]) {
    const registration = fixtureCleanupRegistration();
    const closeControl = controlledFixtureCloseTimeout();
    const child = controlledChild(42_105);
    let taskkillCount = 0;
    const owner = createFixtureChildOwner(registration.context, {
      platform: "win32",
      scheduler: closeControl.scheduler,
      spawnChild: () => child,
      taskkill() {
        taskkillCount += 1;
        return expectation.result;
      },
    });
    owner.spawnChild("fixture", [], { detached: true });
    const cleanup = owner.cleanup();
    assert.equal(owner.cleanup(), cleanup);
    assert.equal(closeControl.pending(), 1);
    closeControl.fireAll();
    await assert.rejects(
      cleanup,
      (error) =>
        error?.code === "FIXTURE_CHILD_CLOSE_TIMEOUT" &&
        error.message.includes("state=close-pending") &&
        error.message.includes("pid=42105") &&
        error.message.includes("closeObserved=false") &&
        error.message.includes(`terminationStatus=${expectation.status}`) &&
        error.message.includes(`terminationError=${expectation.error}`) &&
        error.message.includes(`timeoutMs=${FIXTURE_CHILD_CLOSE_TIMEOUT_MS}`),
    );
    assert.equal(taskkillCount, 1);
    assert.equal(closeControl.pending(), 0);
    assert.equal(child.listenerCount("exit"), 0);
    assert.equal(child.listenerCount("close"), 0);
  }

  const registration = fixtureCleanupRegistration();
  const closeControl = controlledFixtureCloseTimeout();
  const children = [controlledChild(42_107), controlledChild(42_108)];
  const owner = createFixtureChildOwner(registration.context, {
    platform: "win32",
    scheduler: closeControl.scheduler,
    spawnChild: () => children.find((child) => child.listenerCount("close") === 0),
    taskkill: () => ({ status: 255 }),
  });
  owner.spawnChild("fixture-one", [], { detached: true });
  owner.spawnChild("fixture-two", [], { detached: true });
  const cleanup = registration.registered()();
  assert.equal(closeControl.pending(), 2);
  closeControl.fireAll();
  await assert.rejects(
    cleanup,
    (error) =>
      error?.code === "FIXTURE_CHILD_CLEANUP_FAILED" &&
      error.errors.length === 2 &&
      error.errors.every((failure) => failure?.code === "FIXTURE_CHILD_CLOSE_TIMEOUT"),
  );
  assert.equal(closeControl.pending(), 0);
  for (const child of children) {
    assert.equal(child.listenerCount("exit"), 0);
    assert.equal(child.listenerCount("close"), 0);
  }
});

test("readiness publication is atomic and consumption validates the owned run", async () => {
  const path = "fixture-ready.json";
  const runId = "process-readiness-owned-run";
  const files = new Map();
  const operations = [];
  const record = publishReadiness(
    path,
    {
      descendantPid: 42_002,
      pid: 42_001,
      protocol: "caller-cannot-override",
      runId,
      state: "partial",
      version: 99,
    },
    {
      writeFile(stagingPath, value) {
        operations.push(`write:${stagingPath}`);
        assert.equal(files.has(path), false, "the final path is absent before publication");
        files.set(stagingPath, value);
      },
      rename(stagingPath, publishedPath) {
        operations.push(`rename:${stagingPath}->${publishedPath}`);
        assert.equal(files.has(stagingPath), true);
        assert.equal(files.has(publishedPath), false);
        files.set(publishedPath, files.get(stagingPath));
        files.delete(stagingPath);
      },
      remove(stagingPath) {
        files.delete(stagingPath);
      },
    },
  );
  assert.equal(operations.length, 2);
  assert.equal(record.protocol, "kyw-evaluator-readiness");
  assert.equal(record.state, "ready");
  assert.equal(record.version, 1);
  assert.match(operations[0], /\.ready\.tmp$/);
  assert.match(operations[1], /^rename:.*\.ready\.tmp->fixture-ready\.json$/);
  assert.deepEqual(inspectReadinessText(files.get(path), runId), {
    state: "ready",
    reason: "VALIDATED",
    bytes: Buffer.byteLength(files.get(path), "utf8"),
    record,
  });

  const wrongRun = createReadinessRecord({
    descendantPid: 42_004,
    pid: 42_003,
    runId: "process-readiness-other-run",
  });
  const scripted = [
    { state: "absent", reason: "NOT_PUBLISHED", bytes: 0 },
    inspectReadinessText('{"protocol":', runId),
    inspectReadinessText(JSON.stringify(wrongRun), runId),
    inspectReadinessText(files.get(path), runId),
  ];
  const observedStates = [];
  let currentTime = 0;
  const accepted = await waitForReadiness({
    path,
    expectedRunId: runId,
    timeoutMs: 10,
    pollIntervalMs: 1,
    now: () => currentTime,
    sleep: async (milliseconds) => {
      currentTime += milliseconds;
    },
    read: () => scripted.shift(),
    onObservation: (observation) => observedStates.push(observation.state),
  });
  assert.equal(accepted.runId, runId);
  assert.deepEqual(observedStates, ["absent", "incomplete", "wrong-run", "ready"]);

  currentTime = 0;
  await assert.rejects(
    waitForReadiness({
      path,
      expectedRunId: runId,
      pathLabel: "partial-ready",
      timeoutMs: 2,
      pollIntervalMs: 1,
      now: () => currentTime,
      sleep: async (milliseconds) => {
        currentTime += milliseconds;
      },
      read: () => inspectReadinessText('{"protocol":', runId),
    }),
    (error) =>
      error?.code === "EVALUATOR_READINESS_TIMEOUT" &&
      /state=incomplete/.test(error.message) &&
      /reason=INVALID_JSON/.test(error.message) &&
      /attempts=3/.test(error.message),
  );

  const failedFiles = new Map();
  const failedOperations = [];
  assert.throws(
    () =>
      publishReadiness(
        "failed-ready.json",
        { pid: 42_005, runId: "process-readiness-failed-publication" },
        {
          writeFile(stagingPath, value) {
            failedOperations.push("write");
            failedFiles.set(stagingPath, value);
          },
          rename() {
            failedOperations.push("rename");
            throw Object.assign(new Error("synthetic rename failure"), { code: "EACCES" });
          },
          remove(stagingPath) {
            failedOperations.push("remove");
            failedFiles.delete(stagingPath);
          },
        },
      ),
    (error) => error?.code === "EACCES",
  );
  assert.deepEqual(failedOperations, ["write", "rename", "remove"]);
  assert.equal(failedFiles.size, 0);
});

test("timeout remains authoritative when a later signal races with termination", async () => {
  const target = processTarget();
  const baselineInt = target.listenerCount("SIGINT");
  const child = controlledChild();
  const clock = manualScheduler();
  const terminationCalls = [];
  const scope = newScope(target, {
    platform: "win32",
    scheduler: clock.scheduler,
    spawnChild: () => child,
    taskkill(pid, forced, milliseconds) {
      terminationCalls.push({ forced, milliseconds, pid });
      if (forced) child.emit("close", null, "SIGKILL");
    },
  });
  const running = scope.runChild({ command: "controlled-child", timeout: 10 });
  await settleMicrotasks();
  assert.equal(clock.pendingTimers(), 1);
  clock.advance(10);
  await settleMicrotasks();
  target.emit("SIGINT");
  const result = await running;
  assert.equal(result.error?.code, "ETIMEDOUT");
  assert.deepEqual(scope.cause, { kind: "timeout" });
  assert.deepEqual(terminationCalls, [
    { forced: false, milliseconds: 250, pid: child.pid },
    { forced: true, milliseconds: 1_000, pid: child.pid },
  ]);
  const finalState = await scope.finalize();
  assert.deepEqual(finalState.cause, { kind: "timeout" });
  assert.equal(clock.pendingTimers(), 0);
  assert.equal(target.listenerCount("SIGINT"), baselineInt);
  const settledEvidence = {
    cause: scope.cause,
    diagnostics: finalState.diagnostics,
    stdout: result.stdout,
    terminationCalls: [...terminationCalls],
  };
  child.stdout.emit("data", Buffer.from("late-output"));
  child.emit("close", 99, "SIGKILL");
  target.emit("SIGINT");
  clock.advance(10_000);
  await settleMicrotasks();
  assert.deepEqual(
    {
      cause: scope.cause,
      diagnostics: finalState.diagnostics,
      stdout: result.stdout,
      terminationCalls,
    },
    settledEvidence,
    "settled lifecycle evidence must not change after late child or signal events",
  );
});

test("injected Linux and macOS schedulers terminate only the owned POSIX group", async () => {
  for (const platform of ["linux", "darwin"]) {
    const target = new EventEmitter();
    const child = controlledChild(platform === "linux" ? 42_101 : 42_102);
    const clock = manualScheduler();
    const signals = [];
    let groupAlive = true;
    target.kill = (pid, signal) => {
      assert.equal(pid, -child.pid);
      signals.push(signal);
      if (signal === "SIGTERM") {
        groupAlive = false;
        child.emit("close", null, "SIGTERM");
        return;
      }
      if (signal === 0 && !groupAlive) {
        throw Object.assign(new Error("missing controlled process group"), { code: "ESRCH" });
      }
    };
    const baselineInt = target.listenerCount("SIGINT");
    const baselineTerm = target.listenerCount("SIGTERM");
    const scope = newScope(target, {
      platform,
      scheduler: clock.scheduler,
      spawnChild: () => child,
    });
    const running = scope.runChild({ command: "controlled-posix-child", timeout: 10 });
    await settleMicrotasks();
    clock.advance(10);
    const result = await running;
    assert.equal(result.error?.code, "ETIMEDOUT");
    assert.deepEqual(signals, ["SIGTERM", 0]);
    const finalState = await scope.finalize();
    assert.deepEqual(finalState.cause, { kind: "timeout" });
    assert.equal(target.listenerCount("SIGINT"), baselineInt);
    assert.equal(target.listenerCount("SIGTERM"), baselineTerm);
  }
});

test("owned-process termination remains PID-rooted without global process enumeration", () => {
  const source = readFileSync(join(REPOSITORY_ROOT, "scripts", "evaluator-process.mjs"), "utf8");
  assert.match(source, /processTarget\.kill\(-pid,/);
  assert.match(source, /\["\/PID", String\(pid\), "\/T"\]/);
  assert.doesNotMatch(source, /\b(?:Get-Process|tasklist|wmic|ps\s+-|pgrep|pkill)\b/i);
});

// Native-only boundary: Windows exclusive-handle release and filesystem retry semantics are
// observable only through a real handle-owning process.
test(
  "Windows evaluator cleanup awaits bounded release of an owned exclusive handle",
  { skip: process.platform !== "win32" },
  async (t) => {
    const fixtureChildOwner = createFixtureChildOwner(t);
    const root = mkdtempSync(join(tmpdir(), "kyw-evaluator-handle-"));
    const heldPath = join(root, "held.tmp");
    writeFileSync(heldPath, "task-0028\n", "utf8");
    const holder = fixtureChildOwner.spawnChild(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        '$handle=[System.IO.File]::Open($env:KYW_EVALUATOR_HELD_PATH,[System.IO.FileMode]::Open,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::None); [Console]::Out.WriteLine("READY"); Start-Sleep -Milliseconds 300; $handle.Dispose()',
      ],
      {
        env: { ...process.env, KYW_EVALUATOR_HELD_PATH: heldPath },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    t.after(() => rmSync(root, { recursive: true, force: true }));
    let holderStderr = "";
    holder.stderr.on("data", (chunk) => {
      holderStderr += chunk;
    });
    await new Promise((resolveReady, rejectReady) => {
      holder.once("error", rejectReady);
      holder.stdout.once("data", resolveReady);
      holder.once("close", (status) => {
        rejectReady(
          new Error(
            `exclusive-handle fixture closed before readiness status=${status ?? "unknown"} stderrPresent=${Boolean(holderStderr.trim())}`,
          ),
        );
      });
    });

    assert.throws(
      () => defaultRemoveOwnedPath(root, { recursive: true, force: true }),
      (error) => new Set(["EBUSY", "EPERM"]).has(error?.code),
      "the previous one-shot synchronous removal must expose the transient Windows handle",
    );
    assert.equal(existsSync(root), true, "the transient handle must leave the owned root present");
    assert.equal(DEFAULT_CLEANUP_MAX_RETRIES, 5);
    assert.equal(DEFAULT_CLEANUP_RETRY_DELAY_MS, 100);

    await defaultRemoveEvaluatorOwnedPath(root, { recursive: true, force: true });
    await new Promise((resolveClose) => {
      if (holder.exitCode !== null) resolveClose();
      else holder.once("close", resolveClose);
    });
    assert.equal(holder.exitCode, 0, "exclusive-handle fixture must exit cleanly");
    assert.equal(
      existsSync(root),
      false,
      "flow=shared phase=finalize pathLabel=evaluator-temporary-root existence=true",
    );
  },
);

// Native-only boundary: actual stdin/stdout/stderr encoding, exit status, and spawn failure
// behavior add process-transport confidence beyond the controlled child seam.
test("run-scoped child execution preserves input, UTF-8 output, non-zero status, and spawn errors", async () => {
  for (const expectation of [
    {
      args: [FAKE_CHILD, "success"],
      check(result) {
        assert.equal(result.status, 0);
        assert.equal(result.error, undefined);
        assert.equal(result.stdout, "stdout:hello:한글");
        assert.equal(result.stderr, "stderr:bounded");
      },
      command: process.execPath,
      input: "hello",
    },
    {
      args: [FAKE_CHILD, "nonzero"],
      check(result) {
        assert.equal(result.status, 7);
        assert.equal(result.error, undefined);
        assert.equal(result.stderr, "synthetic child failure");
      },
      command: process.execPath,
    },
    {
      args: [],
      check(result) {
        assert.equal(result.status, null);
        assert.equal(result.error?.code, "ENOENT");
      },
      command: join(tmpdir(), `missing-evaluator-${process.pid}`),
    },
  ]) {
    const target = processTarget();
    const baselineInt = target.listenerCount("SIGINT");
    const baselineTerm = target.listenerCount("SIGTERM");
    const scope = newScope(target);
    try {
      const result = await scope.runChild({
        args: expectation.args,
        command: expectation.command,
        input: expectation.input,
        timeout: 3_000,
      });
      expectation.check(result);
    } finally {
      await scope.finalize();
    }
    assert.equal(target.listenerCount("SIGINT"), baselineInt);
    assert.equal(target.listenerCount("SIGTERM"), baselineTerm);
  }
});

// Native-only boundary: a real stream overflow and an owned child plus descendant prove
// behavior that the deterministic scheduler cannot represent.
test(
  "timeout and max-output causes terminate the exact owned child tree",
  { timeout: 120_000 },
  async (t) => {
    const root = temporaryDirectory(t);
    for (const expectation of [
      { code: "ETIMEDOUT", maxBuffer: 1_024, mode: "hang" },
      { code: "ENOBUFS", maxBuffer: 128, mode: "overflow" },
    ]) {
      const fixtureChildOwner = createFixtureChildOwner(t);
      const target = processTarget();
      const timeoutControl = controlledTimeout();
      const scope = newScope(target, {
        scheduler: timeoutControl.scheduler,
        spawnChild: fixtureChildOwner.spawnChild,
      });
      const readyPath = join(root, `${expectation.mode}.json`);
      const readinessRunId = `process-${expectation.mode}-owned-tree`;
      let ready;
      let result;
      try {
        const running = scope.runChild({
          args: [FAKE_CHILD, expectation.mode, readyPath, readinessRunId],
          command: process.execPath,
          maxBuffer: expectation.maxBuffer,
          timeout: 30_000,
        });
        if (expectation.mode === "hang") {
          ready = await readReady(
            readyPath,
            readinessRunId,
            "process-timeout-owned-tree",
          );
          timeoutControl.fire();
        }
        result = await running;
      } finally {
        await scope.finalize();
      }
      assert.equal(result.error?.code, expectation.code);
      assert.equal(timeoutControl.pending(), 0);
      if (ready) {
        await waitFor(
          () => !processAlive(ready.pid),
          "timed-out child exit",
          30_000,
          () => `pid=${ready.pid} alive=${processAlive(ready.pid)} cause=${scope.cause?.kind}`,
        );
        await waitFor(
          () => !processAlive(ready.descendantPid),
          "timed-out descendant exit",
          30_000,
          () =>
            `pid=${ready.descendantPid} alive=${processAlive(ready.descendantPid)} cause=${scope.cause?.kind}`,
        );
      }
    }
  },
);

// Native-only boundary: a real child tree proves narrowly owned termination and preserves an
// unrelated process; pure lifecycle tests cover cause ordering and listener state.
test("repeated interruption owns only the tracked tree, is idempotent, and removes listeners", async (t) => {
  const root = temporaryDirectory(t);
  const readyPath = join(root, "ready.json");
  const readinessRunId = "process-repeated-interruption";
  const target = processTarget();
  const baselineInt = target.listenerCount("SIGINT");
  const baselineTerm = target.listenerCount("SIGTERM");
  const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    detached: false,
    stdio: "ignore",
    windowsHide: true,
  });
  t.after(() => {
    if (processAlive(unrelated.pid)) unrelated.kill("SIGKILL");
  });
  const timeoutControl = controlledTimeout();
  const fixtureChildOwner = createFixtureChildOwner(t);
  const scope = newScope(target, {
    scheduler: timeoutControl.scheduler,
    spawnChild: fixtureChildOwner.spawnChild,
  });
  let ready;
  try {
    const running = scope.runChild({
      args: [FAKE_CHILD, "hang-ignore-term", readyPath, readinessRunId],
      command: process.execPath,
      timeout: 30_000,
    });
    ready = await readReady(
      readyPath,
      readinessRunId,
      "process-repeated-interruption-ready",
    );
    target.emit("SIGINT");
    target.emit("SIGINT");
    await assert.rejects(
      running,
      (error) => error?.code === "EVALUATOR_INTERRUPTED" && error?.exitCode === 130,
    );
    assert.equal(processAlive(unrelated.pid), true);
  } finally {
    const first = scope.finalize();
    const second = scope.finalize();
    assert.equal(first, second);
    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.deepEqual(firstResult, secondResult);
  }
  await waitFor(
    () => !processAlive(ready.pid),
    "interrupted child exit",
    30_000,
    () => `pid=${ready.pid} alive=${processAlive(ready.pid)} cause=${scope.cause?.kind}`,
  );
  await waitFor(
    () => !processAlive(ready.descendantPid),
    "interrupted descendant exit",
    30_000,
    () =>
      `pid=${ready.descendantPid} alive=${processAlive(ready.descendantPid)} cause=${scope.cause?.kind}`,
  );
  assert.equal(processAlive(unrelated.pid), true);
  assert.equal(timeoutControl.pending(), 0);
  assert.equal(target.listenerCount("SIGINT"), baselineInt);
  assert.equal(target.listenerCount("SIGTERM"), baselineTerm);
});

test("a signal after child exit but before final cleanup prevents success", async () => {
  const target = processTarget();
  const baselineInt = target.listenerCount("SIGINT");
  const child = controlledChild();
  const clock = manualScheduler();
  const scope = newScope(target, {
    scheduler: clock.scheduler,
    spawnChild: () => child,
  });
  const running = scope.runChild({ command: "controlled-child", timeout: 10 });
  await settleMicrotasks();
  child.emit("close", 0, null);
  const result = await running;
  assert.equal(result.status, 0);
  assert.equal(clock.pendingTimers(), 0);
  target.emit("SIGINT");
  await assert.rejects(scope.checkpoint(), (error) => error?.code === "EVALUATOR_INTERRUPTED");
  const finalState = await scope.finalize();
  assert.deepEqual(finalState.cause, { kind: "interruption", signal: "SIGINT" });
  assert.equal(target.listenerCount("SIGINT"), baselineInt);
});

test("partial cleanup is repeat-safe and diagnostics expose labels, not secret paths or values", async (t) => {
  const root = temporaryDirectory(t);
  const target = processTarget();
  const scope = newScope(target);
  const secretPath = join(root, "Users", "alice", "auth.json");
  const secret = "sk-secret-value";
  const diagnostic = cleanupFailureDiagnostic({
    error: Object.assign(new Error(`${secretPath}: ${secret}`), { code: "EACCES" }),
    operation: "remove-tree",
    pathLabel: "grilling-temporary-root",
  });
  assert.equal(
    diagnostic,
    "cleanup operation=remove-tree pathLabel=grilling-temporary-root reason=EACCES",
  );
  assert.equal(diagnostic.includes(secretPath), false);
  assert.equal(diagnostic.includes(secret), false);

  defaultRemoveOwnedPath(join(root, "not-acquired"), { recursive: true, force: true });
  const first = await scope.finalize(() => [diagnostic]);
  const second = await scope.finalize(() => {
    throw new Error("must not run twice");
  });
  assert.deepEqual(second, first);
  assert.equal(first.cause.kind, "cleanup-failure");
  assert.deepEqual(first.diagnostics, [diagnostic]);
});
