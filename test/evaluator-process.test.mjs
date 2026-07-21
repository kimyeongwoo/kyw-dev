import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  cleanupFailureDiagnostic,
  createEvaluatorRunScope,
  defaultRemoveOwnedPath,
} from "../scripts/evaluator-process.mjs";

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

async function waitFor(predicate, description, milliseconds = 5_000) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(predicate(), `Timed out waiting for ${description}`);
}

async function readReady(path) {
  await waitFor(() => existsSync(path), `readiness marker ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function stopExactTree(pid) {
  if (!Number.isInteger(pid) || !processAlive(pid)) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

function newScope(target, options = {}) {
  return createEvaluatorRunScope({
    forcedTerminationMs: 1_000,
    gracefulTerminationMs: 250,
    processTarget: target,
    ...options,
  });
}

test("owned-process termination remains PID-rooted without global process enumeration", () => {
  const source = readFileSync(join(REPOSITORY_ROOT, "scripts", "evaluator-process.mjs"), "utf8");
  assert.match(source, /processTarget\.kill\(-pid,/);
  assert.match(source, /\["\/PID", String\(pid\), "\/T"\]/);
  assert.doesNotMatch(source, /\b(?:Get-Process|tasklist|wmic|ps\s+-|pgrep|pkill)\b/i);
});

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

test("timeout and max-output causes terminate the exact owned child tree within fixed bounds", async (t) => {
  const root = temporaryDirectory(t);
  for (const expectation of [
    { code: "ETIMEDOUT", maxBuffer: 1_024, mode: "hang", timeout: 1_000 },
    { code: "ENOBUFS", maxBuffer: 128, mode: "overflow", timeout: 3_000 },
  ]) {
    const target = processTarget();
    const scope = newScope(target);
    const readyPath = join(root, `${expectation.mode}.json`);
    let ready;
    try {
      const result = await scope.runChild({
        args: [FAKE_CHILD, expectation.mode, readyPath],
        command: process.execPath,
        maxBuffer: expectation.maxBuffer,
        timeout: expectation.timeout,
      });
      assert.equal(result.error?.code, expectation.code);
      if (expectation.mode === "hang") ready = await readReady(readyPath);
    } finally {
      await scope.finalize();
      if (ready) stopExactTree(ready.pid);
    }
    if (ready) {
      await waitFor(() => !processAlive(ready.pid), "timed-out child exit");
      await waitFor(() => !processAlive(ready.descendantPid), "timed-out descendant exit");
    }
  }
});

test("repeated interruption owns only the tracked tree, is idempotent, and removes listeners", async (t) => {
  const root = temporaryDirectory(t);
  const readyPath = join(root, "ready.json");
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
  const scope = newScope(target);
  let ready;
  try {
    const running = scope.runChild({
      args: [FAKE_CHILD, "hang-ignore-term", readyPath],
      command: process.execPath,
      timeout: 10_000,
    });
    ready = await readReady(readyPath);
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
    if (ready) stopExactTree(ready.pid);
  }
  await waitFor(() => !processAlive(ready.pid), "interrupted child exit");
  await waitFor(() => !processAlive(ready.descendantPid), "interrupted descendant exit");
  assert.equal(processAlive(unrelated.pid), true);
  assert.equal(target.listenerCount("SIGINT"), baselineInt);
  assert.equal(target.listenerCount("SIGTERM"), baselineTerm);
});

test("timeout remains authoritative when a later signal races with termination", async (t) => {
  const root = temporaryDirectory(t);
  const readyPath = join(root, "timeout-race.json");
  const target = processTarget();
  const scope = newScope(target);
  let ready;
  try {
    const running = scope.runChild({
      args: [FAKE_CHILD, "hang-ignore-term", readyPath],
      command: process.execPath,
      timeout: 1_000,
    });
    ready = await readReady(readyPath);
    await waitFor(() => scope.cause?.kind === "timeout", "timeout cause", 3_000);
    target.emit("SIGINT");
    const result = await running;
    assert.equal(result.error?.code, "ETIMEDOUT");
    assert.equal(scope.cause.kind, "timeout");
  } finally {
    await scope.finalize();
    if (ready) stopExactTree(ready.pid);
  }
});

test("a signal after child exit but before final cleanup prevents success", async () => {
  const target = processTarget();
  const scope = newScope(target);
  const result = await scope.runChild({
    args: [FAKE_CHILD, "success"],
    command: process.execPath,
    timeout: 3_000,
  });
  assert.equal(result.status, 0);
  target.emit("SIGINT");
  await assert.rejects(scope.checkpoint(), (error) => error?.code === "EVALUATOR_INTERRUPTED");
  const finalState = await scope.finalize();
  assert.deepEqual(finalState.cause, { kind: "interruption", signal: "SIGINT" });
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
