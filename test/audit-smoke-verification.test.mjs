import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyAuditFixture } from "../scripts/audit-smoke-verification.mjs";
import { createEvaluatorRunScope } from "../scripts/evaluator-process.mjs";

async function fixture(t) {
  const base = await realpath(await mkdtemp(path.join(tmpdir(), "kyw-smoke-verification-test-")));
  t.after(() => rm(base, { recursive: true, force: true }));
  const outerTemporaryRoot = path.join(base, "outer");
  const repositoryRoot = path.join(outerTemporaryRoot, "repository");
  const temporaryParent = path.join(base, "verification");
  for (const directory of ["src", "test", ".git", ".agents"]) {
    await mkdir(path.join(repositoryRoot, directory), { recursive: true });
  }
  await mkdir(temporaryParent);
  const files = {
    "package.json": '{"type":"module"}\n',
    "src/greeting.mjs": 'export const greeting = "hello";\n',
    "test/greeting.test.mjs": 'throw new Error("Never execute this file on the host");\n',
    ".git/config": "protected git configuration\n",
    ".agents/untrusted-helper.mjs": "process.exit(73);\n",
    "user-notes.md": "preserve me\n",
  };
  for (const [relative, contents] of Object.entries(files)) await writeFile(path.join(repositoryRoot, relative), contents);
  return { base, outerTemporaryRoot, repositoryRoot, temporaryParent };
}

function boundedDocker(cleanupOutcome = "COMPLETED") {
  const calls = [];
  const runner = async (command, args, options) => {
    calls.push({ command, args, options });
    assert.equal(command, "docker");
    assert.notEqual(args[0], "run", "the long Docker run must belong to the evaluator scope");
    assert.deepEqual(options, { timeout: 10000, maxBuffer: 4096, windowsHide: true });
    if (args[0] === "image") {
      assert.deepEqual(args, ["image", "inspect", "--format", "{{.Id}}", "node:22"]);
      return { stdout: `sha256:${"a".repeat(64)}`, stderr: "" };
    }
    if (cleanupOutcome === "UNKNOWN") throw new Error("synthetic daemon inspect failure");
    if (args[1] === "inspect") return { stdout: cleanupOutcome === "BLOCKED" ? "another-owner" : args.at(-1) };
    if (cleanupOutcome === "FAILED") throw new Error("synthetic container removal failure");
    assert.equal(args[1], "rm");
    return { stdout: "", stderr: "" };
  };
  return { calls, runner };
}

function mountedWorkspace(args) {
  return args[args.indexOf("--mount") + 1].slice("type=bind,source=".length, -",target=/work".length);
}

test("smoke verification uses the trusted fixed copy and only scopes the long Docker run", async (t) => {
  const options = await fixture(t);
  const docker = boundedDocker();
  let runCount = 0;
  const scope = { async runChild({ command, args, ...childOptions }) {
    runCount += 1;
    assert.equal(command, "docker");
    assert.equal(args[0], "run");
    assert.deepEqual(args.slice(-4), [`sha256:${"a".repeat(64)}`, "node", "--test", "test/greeting.test.mjs"]);
    assert.deepEqual(childOptions, { timeout: 120000, maxBuffer: 1024 * 1024, windowsHide: true });
    for (const flag of ["--pull=never", "--network=none", "--read-only", "--cap-drop=ALL",
      "--security-opt=no-new-privileges", "--pids-limit=128", "--memory=512m", "--cpus=1", "--user=1000:1000"]) {
      assert.ok(args.includes(flag));
    }
    const workspace = mountedWorkspace(args);
    assert.ok(!workspace.startsWith(`${options.outerTemporaryRoot}${path.sep}`));
    assert.deepEqual(await readdir(workspace), ["package.json", "src", "test"]);
    assert.deepEqual(await readdir(path.join(workspace, "src")), ["greeting.mjs"]);
    assert.deepEqual(await readdir(path.join(workspace, "test")), ["greeting.test.mjs"]);
    assert.match(await readFile(path.join(workspace, "test/greeting.test.mjs"), "utf8"), /Never execute/u);
    await writeFile(path.join(workspace, "src/greeting.mjs"), "copy changed by test");
    return { status: 0, signal: null, stdout: "completed test", stderr: "" };
  } };
  const result = await verifyAuditFixture({ ...options, scope, runner: docker.runner });
  assert.equal(runCount, 1);
  assert.equal(result.status, "PASSED");
  assert.equal(result.verificationOutcome, "PASSED");
  assert.equal(result.completed, true);
  assert.equal(result.stdout, "completed test");
  assert.deepEqual(result.cleanup, { outcome: "COMPLETED" });
  assert.deepEqual(await readdir(options.temporaryParent), []);
  assert.equal(await readFile(path.join(options.repositoryRoot, "src/greeting.mjs"), "utf8"), 'export const greeting = "hello";\n');
  assert.equal(docker.calls.length, 3);
});

test("missing Docker or local image remains unavailable without a host fallback", async (t) => {
  const options = await fixture(t);
  let calls = 0;
  const result = await verifyAuditFixture({ ...options,
    scope: { runChild() { assert.fail("Unavailable image must not start a test child"); } },
    runner: async (command, args, executionOptions) => {
      calls += 1;
      assert.equal(command, "docker");
      assert.equal(args[0], "image");
      assert.equal(executionOptions.timeout, 10000);
      throw Object.assign(new Error("synthetic missing Docker"), { code: "ENOENT" });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.verificationOutcome, "UNEXECUTED");
  assert.equal(result.attempted, false);
  assert.equal(result.completed, false);
  assert.deepEqual(result.cleanup, { outcome: "NOT_REQUIRED" });
  assert.deepEqual(await readdir(options.temporaryParent), []);
});

test("runChild result translation never accepts nonzero, spawn failure, or interrupted results", async (t) => {
  const options = await fixture(t);
  const cases = [
    [{ status: 2 }, "BLOCKED", "FAILED", true, 2],
    [{ status: 125 }, "UNAVAILABLE", "UNEXECUTED", false, 125],
    [{ status: 126 }, "UNAVAILABLE", "UNEXECUTED", false, 126],
    [{ status: 127 }, "UNAVAILABLE", "UNEXECUTED", false, 127],
    [{ status: null, error: { code: "ENOENT", message: "spawn failed" } }, "UNAVAILABLE", "UNEXECUTED", false, null],
    [{ status: 0, error: { code: "EACCES", message: "spawn denied" } }, "BLOCKED", "UNKNOWN", false, null],
    [{ status: 1, error: { code: 1, message: "process infrastructure failure" } }, "BLOCKED", "UNKNOWN", false, null],
    [{ status: 1, error: { code: "ETIMEDOUT" } }, "BLOCKED", "UNKNOWN", false, null],
    [{ status: 1, error: { code: "ENOBUFS" } }, "BLOCKED", "UNKNOWN", false, null],
    [{ status: 0, signal: "SIGTERM" }, "BLOCKED", "UNKNOWN", false, 0],
    [{ status: null }, "BLOCKED", "UNKNOWN", false, null],
  ];
  for (const [childResult, status, outcome, completed, exitCode] of cases) {
    const docker = boundedDocker();
    const result = await verifyAuditFixture({ ...options, runner: docker.runner,
      scope: { async runChild() { return { stdout: "retained output", stderr: "retained diagnostic", ...childResult }; } },
    });
    assert.equal(result.status, status);
    assert.equal(result.verificationOutcome, outcome);
    assert.equal(result.attempted, true);
    assert.equal(result.completed, completed);
    assert.equal(result.executed, completed);
    assert.equal(result.exitCode, exitCode);
    assert.equal(result.stdout, "retained output");
    assert.equal(result.stderr, "retained diagnostic");
    assert.equal(result.cleanup.outcome, "COMPLETED");
    assert.equal(docker.calls.at(-1).args[1], "rm", "bounded cleanup follows every failed long child");
    assert.deepEqual(await readdir(options.temporaryParent), []);
  }
});

test("uncertain daemon cleanup preserves completed outcomes and roots after outer recursive cleanup", async (t) => {
  for (const outcome of ["UNKNOWN", "BLOCKED", "FAILED"]) {
    const options = await fixture(t);
    const docker = boundedDocker(outcome);
    const result = await verifyAuditFixture({ ...options, runner: docker.runner,
      scope: { async runChild() { return { status: 0, stdout: "test passed", stderr: "" }; } },
    });
    assert.equal(result.verificationOutcome, "PASSED");
    assert.equal(result.completed, true);
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.cleanup.outcome, outcome);
    assert.ok(result.cleanup.reason);
    assert.equal(path.dirname(result.cleanup.temporaryPath), result.cleanup.temporaryParent);
    assert.equal(path.dirname(result.cleanup.temporaryParent), options.temporaryParent);
    await rm(options.outerTemporaryRoot, { recursive: true, force: false });
    assert.ok((await lstat(result.cleanup.temporaryPath)).isDirectory());
    assert.match(await readFile(path.join(result.cleanup.temporaryPath, "work/test/greeting.test.mjs"), "utf8"), /Never execute/u);
  }
});

test("physical aliases into the outer root are rejected before creating any verification copy", async (t) => {
  const options = await fixture(t);
  const alias = path.join(options.base, "outer-alias");
  await symlink(options.outerTemporaryRoot, alias, process.platform === "win32" ? "junction" : "dir");
  for (const temporaryParent of [options.outerTemporaryRoot, options.repositoryRoot, alias]) {
    await assert.rejects(verifyAuditFixture({ ...options, temporaryParent,
      scope: { runChild() { assert.fail("no child for an overlapping cleanup boundary"); } },
      runner: async () => assert.fail("no Docker call for an overlapping cleanup boundary"),
    }), /outside the outer cleanup root/u);
  }
  assert.deepEqual(await readdir(options.temporaryParent), []);
});

test("a shared temporary ancestor is allowed while actual verification and outer roots are disjoint", async (t) => {
  const options = await fixture(t);
  const docker = boundedDocker("UNKNOWN");
  const result = await verifyAuditFixture({ ...options, temporaryParent: options.base, runner: docker.runner,
    scope: { async runChild() { return { status: 0, stdout: "pass", stderr: "" }; } },
  });
  assert.equal(path.dirname(result.cleanup.temporaryParent), options.base);
  assert.notEqual(result.cleanup.temporaryParent, options.outerTemporaryRoot);
  await rm(options.outerTemporaryRoot, { recursive: true, force: false });
  assert.ok((await lstat(result.cleanup.temporaryPath)).isDirectory());
});

test("parent cleanup never recursively deletes files introduced outside the G3-owned root", async (t) => {
  const options = await fixture(t);
  const docker = boundedDocker();
  const result = await verifyAuditFixture({ ...options, runner: docker.runner,
    scope: { async runChild({ args }) {
      const parent = path.dirname(path.dirname(mountedWorkspace(args)));
      await writeFile(path.join(parent, "unowned-file"), "must survive");
      return { status: 0, stdout: "pass", stderr: "" };
    } },
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.verificationOutcome, "PASSED");
  assert.equal(result.cleanup.outcome, "FAILED");
  assert.equal(await readFile(path.join(result.cleanup.temporaryPath, "unowned-file"), "utf8"), "must survive");
});

test("changed parent identity prevents deletion and retains the successful check", async (t) => {
  const options = await fixture(t);
  const docker = boundedDocker();
  const originalRunner = docker.runner;
  let parent;
  const result = await verifyAuditFixture({ ...options,
    runner: async (command, args, executionOptions) => {
      const response = await originalRunner(command, args, executionOptions);
      if (args[1] === "rm") {
        await rename(parent, `${parent}-held`);
        await mkdir(parent);
        await writeFile(path.join(parent, "replacement"), "must survive");
      }
      return response;
    },
    scope: { async runChild({ args }) {
      parent = path.dirname(path.dirname(mountedWorkspace(args)));
      return { status: 0, stdout: "pass", stderr: "" };
    } },
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.verificationOutcome, "PASSED");
  assert.equal(result.cleanup.outcome, "UNKNOWN");
  assert.equal(await readFile(path.join(parent, "replacement"), "utf8"), "must survive");
  assert.deepEqual((await readdir(`${parent}-held`)).length, 1);
});

test("real evaluator scope limits and interruption retain verifier cleanup evidence without reusing the scope for cleanup", async (t) => {
  for (const kind of ["failed", "spawn", "timeout", "output", "interruption"]) {
    const options = await fixture(t);
    const docker = boundedDocker(kind === "interruption" ? "UNKNOWN" : "COMPLETED");
    const processTarget = new EventEmitter();
    let child;
    let spawnCount = 0;
    const scope = createEvaluatorRunScope({
      platform: "win32",
      processTarget,
      spawnChild(command) {
        spawnCount += 1;
        assert.equal(command, "docker");
        if (kind === "spawn") throw Object.assign(new Error("synthetic missing executable"), { code: "ENOENT" });
        child = new EventEmitter();
        child.pid = 42420;
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.stdin = new EventEmitter();
        child.stdin.end = () => queueMicrotask(() => {
          child.emit("spawn");
          if (kind === "failed") child.emit("close", 3, null);
          if (kind === "output") child.stdout.emit("data", Buffer.alloc(1024 * 1024 + 1, "a"));
          if (kind === "interruption") processTarget.emit("SIGINT");
        });
        return child;
      },
      taskkill() { child.emit("close", 1, "SIGTERM"); },
      ...(kind === "timeout" ? { scheduler: {
        setTimeout(callback) { queueMicrotask(callback); return 1; },
        clearTimeout() {},
      } } : {}),
    });
    t.after(() => scope.finalize());
    const result = await verifyAuditFixture({ ...options, scope, runner: docker.runner });
    assert.equal(spawnCount, 1);
    assert.equal(result.verificationOutcome, kind === "failed" ? "FAILED" : kind === "spawn" ? "UNEXECUTED" : "UNKNOWN");
    assert.equal(result.completed, kind === "failed");
    assert.equal(result.executionFailure.code, {
      failed: 3, spawn: "ENOENT", timeout: "ETIMEDOUT", output: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", interruption: "EVALUATOR_INTERRUPTED",
    }[kind]);
    assert.equal(result.cleanup.outcome, kind === "interruption" ? "UNKNOWN" : "COMPLETED");
    assert.equal(docker.calls.filter(({ args }) => args[1] === "inspect").length, 2);
    if (kind === "interruption") {
      assert.equal(result.executionFailure.signal, "SIGINT");
      await assert.rejects(scope.checkpoint(), { code: "EVALUATOR_INTERRUPTED" });
      await scope.finalize(() => rm(options.outerTemporaryRoot, { recursive: true, force: false }));
      assert.ok((await lstat(result.cleanup.temporaryPath)).isDirectory());
    } else {
      assert.equal(docker.calls.at(-1).args[1], "rm");
      await scope.finalize();
    }
    assert.equal(processTarget.listenerCount("SIGINT"), 0);
  }
});
