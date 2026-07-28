import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  readReadiness,
  readinessDiagnostic,
  waitForReadiness,
} from "./fixtures/evaluator-process/readiness.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const ENTRYPOINT = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "evaluator-process",
  "run-evaluator.mjs",
);
const WINDOWS_CTRL_C = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "evaluator-process",
  "windows-console-ctrl-c.ps1",
);
const READINESS_WAITER = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "evaluator-process",
  "wait-for-readiness.mjs",
);

function temporaryDirectory(t, prefix = "kyw-evaluator-platform-") {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
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
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!predicate()) {
    throw new Error(`Timed out waiting for ${description}; ${diagnostics()}`);
  }
}

async function waitForExit(child, milliseconds = 30_000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode };
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            `Evaluator exit timed out pid=${child.pid} exitCode=${child.exitCode} signalCode=${child.signalCode}`,
          ),
        ),
      milliseconds,
    );
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });
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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertPlatformCleanup(stateDirectory, flow, expectedExitCode, readinessRunId) {
  const readiness = readReadiness(join(stateDirectory, "ready.json"), readinessRunId);
  assert.equal(
    readiness.state,
    "ready",
    readinessDiagnostic({
      attempts: 1,
      expectedRunId: readinessRunId,
      observation: readiness,
      pathLabel: `${flow}-platform-ready`,
    }),
  );
  const ready = readiness.record;
  const lifecycle = readJson(join(stateDirectory, "lifecycle.json"));
  const terminal = readJson(join(stateDirectory, "terminal.json"));
  const temporary = lifecycle.events.find((event) => event.type === "temporary-root");
  const isolated = lifecycle.events.find((event) => event.type === "isolated-state");
  assert.ok(temporary);
  assert.ok(isolated);
  assert.equal(terminal.code, flow === "audit" ? "AUDIT_SMOKE_INTERRUPTED" : "EVALUATION_INTERRUPTED");
  assert.equal(terminal.exitCode, expectedExitCode);
  assert.equal(terminal.authSourceUnchanged, true);
  assert.equal(existsSync(temporary.temporaryRoot), false);
  for (const path of [
    ready.authCopy,
    ready.codexHome,
    ready.repository,
    ready.temporaryHome,
    isolated.authCopy,
    isolated.codexHome,
    isolated.evalRepository,
    isolated.repository,
    isolated.temporaryHome,
  ]) {
    if (path) assert.equal(existsSync(path), false, path);
  }
  const outputRoot = join(stateDirectory, "results");
  if (existsSync(outputRoot)) {
    const entries = readdirSync(outputRoot);
    assert.equal(entries.some((name) => name.startsWith(".staging-")), false);
    assert.equal(entries.some((name) => !name.startsWith(".")), false);
  }
  return ready;
}

test("required public CI keeps model-backed evaluator commands and credentials absent", () => {
  const workflow = readFileSync(join(REPOSITORY_ROOT, ".github", "workflows", "ci.yml"), "utf8");
  const packageJson = JSON.parse(
    readFileSync(join(REPOSITORY_ROOT, "package.json"), "utf8"),
  );
  assert.doesNotMatch(workflow, /\bnpm\s+run\s+eval:/);
  assert.doesNotMatch(workflow, /\b(?:CODEX|OPENAI)_API_KEY\b/);
  assert.equal(packageJson.scripts.check.includes("eval:"), false);
  assert.equal(packageJson.scripts["release:ci"].includes("eval:"), false);
  assert.deepEqual(packageJson.dependencies ?? {}, {});
  assert.deepEqual(packageJson.devDependencies ?? {}, {});
});

if (process.platform === "win32") {
  for (const flow of ["audit", "grilling"]) {
    // Native-only boundary: a real hidden Windows console and generated Ctrl+C cannot be
    // represented by the injected lifecycle scheduler.
    test(`Windows real console Ctrl+C interrupts and cleans the ${flow} evaluator`, async (t) => {
      const stateDirectory = temporaryDirectory(t, `kyw-windows-ctrl-c-${flow}-`);
      const readinessRunId = `platform-${flow}-${basename(stateDirectory)}`;
      const resultPath = join(stateDirectory, "console-result.json");
      const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
        stdio: "ignore",
        windowsHide: true,
      });
      t.after(() => {
        const launchPath = join(stateDirectory, "console-launch.json");
        if (existsSync(launchPath)) stopExactTree(readJson(launchPath).evaluatorPid);
        if (processAlive(unrelated.pid)) unrelated.kill("SIGKILL");
      });
      const helper = spawnSync(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          WINDOWS_CTRL_C,
          "-NodePath",
          process.execPath,
          "-Entrypoint",
          ENTRYPOINT,
          "-ReadinessWaiter",
          READINESS_WAITER,
          "-ReadinessRunId",
          readinessRunId,
          "-Flow",
          flow,
          "-StateDirectory",
          stateDirectory,
          "-ResultPath",
          resultPath,
        ],
        {
          encoding: "utf8",
          timeout: 120_000,
          windowsHide: true,
        },
      );
      assert.equal(
        helper.status,
        0,
        `console helper failed: ${helper.error?.message ?? helper.stderr ?? helper.stdout}`,
      );
      const consoleResult = readJson(resultPath);
      assert.equal(consoleResult.ctrlCGenerated, true);
      assert.equal(consoleResult.waitCompleted, true);
      assert.equal(consoleResult.exitCodeRead, true);
      assert.equal(consoleResult.exitCode, 130);
      assert.equal(consoleResult.readinessValidated, true);
      assert.equal(consoleResult.readinessRunId, readinessRunId);
      const ready = assertPlatformCleanup(stateDirectory, flow, 130, readinessRunId);
      await waitFor(
        () => !processAlive(ready.pid),
        `${flow} Windows child exit`,
        30_000,
        () => `pid=${ready.pid} alive=${processAlive(ready.pid)}`,
      );
      await waitFor(
        () => !processAlive(ready.descendantPid),
        `${flow} Windows descendant exit`,
        30_000,
        () =>
          `pid=${ready.descendantPid} alive=${processAlive(ready.descendantPid)}`,
      );
      assert.equal(processAlive(unrelated.pid), true);
    });
  }
} else {
  for (const flow of ["audit", "grilling"]) {
    for (const [signal, expectedExitCode] of [
      ["SIGINT", 130],
      ["SIGTERM", 143],
    ]) {
      // Native-only boundary: real POSIX signal delivery and process-group ownership cannot
      // be represented by the injected lifecycle scheduler.
      test(`POSIX real ${signal} interrupts and cleans the ${flow} evaluator`, async (t) => {
        const stateDirectory = temporaryDirectory(t, `kyw-posix-${signal}-${flow}-`);
        const readinessRunId = `platform-${flow}-${basename(stateDirectory)}`;
        const stdout = [];
        const stderr = [];
        const evaluator = spawn(
          process.execPath,
          [ENTRYPOINT, flow, stateDirectory, "hang", readinessRunId],
          {
            cwd: REPOSITORY_ROOT,
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        evaluator.stdout.on("data", (chunk) => stdout.push(chunk));
        evaluator.stderr.on("data", (chunk) => stderr.push(chunk));
        const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
          stdio: "ignore",
        });
        let ready;
        t.after(() => {
          if (processAlive(evaluator.pid)) evaluator.kill("SIGKILL");
          if (ready) stopExactTree(ready.pid);
          if (processAlive(unrelated.pid)) unrelated.kill("SIGKILL");
        });
        ready = await waitForReadiness({
          path: join(stateDirectory, "ready.json"),
          expectedRunId: readinessRunId,
          pathLabel: `${flow}-${signal.toLowerCase()}-ready`,
        });
        process.kill(evaluator.pid, signal);
        const exit = await waitForExit(evaluator);
        assert.deepEqual(
          exit,
          { code: expectedExitCode, signal: null },
          `stdout=${Buffer.concat(stdout).toString("utf8")} stderr=${Buffer.concat(stderr).toString("utf8")}`,
        );
        await waitFor(
          () => existsSync(join(stateDirectory, "terminal.json")),
          `${flow} ${signal} terminal record`,
          30_000,
          () =>
            `pid=${evaluator.pid} exitCode=${evaluator.exitCode} signalCode=${evaluator.signalCode} stdoutBytes=${Buffer.concat(stdout).length} stderrBytes=${Buffer.concat(stderr).length}`,
        );
        ready = assertPlatformCleanup(
          stateDirectory,
          flow,
          expectedExitCode,
          readinessRunId,
        );
        await waitFor(
          () => !processAlive(ready.pid),
          `${flow} ${signal} child exit`,
          30_000,
          () => `pid=${ready.pid} alive=${processAlive(ready.pid)}`,
        );
        await waitFor(
          () => !processAlive(ready.descendantPid),
          `${flow} ${signal} descendant exit`,
          30_000,
          () =>
            `pid=${ready.descendantPid} alive=${processAlive(ready.descendantPid)}`,
        );
        assert.equal(processAlive(unrelated.pid), true);
      });
    }
  }
}
