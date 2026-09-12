import { execFile } from "node:child_process";
import { lstat, mkdtemp, realpath, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { verifyInAuditSandbox } from "../skills/kyw-audit/scripts/verify.mjs";

const execute = promisify(execFile);
const FIXTURE_FILES = Object.freeze(["package.json", "src/greeting.mjs", "test/greeting.test.mjs"]);
const FIXTURE_COMMAND = Object.freeze(["node", "--test", "test/greeting.test.mjs"]);

function contains(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function childFailure(result) {
  const error = new Error(result.error?.message ?? "Isolated verification child did not exit successfully");
  error.code = result.error
    ? typeof result.error.code === "number" ? String(result.error.code) : result.error.code
    : Number.isInteger(result.status) ? result.status : undefined;
  // G3 consumes execFile errors; a process limit must never become a completed
  // test failure merely because termination also supplied a numeric exit code.
  if (error.code === "ENOBUFS") error.code = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
  error.killed = result.error?.killed === true || new Set(["ETIMEDOUT", "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"]).has(error.code);
  error.signal = result.signal ?? result.error?.signal ?? null;
  error.stdout = result.stdout;
  error.stderr = result.stderr;
  return error;
}

async function removeEmptyOwnedParent(owned, identity, physicalParent) {
  try {
    const current = await lstat(owned);
    if (current.isSymbolicLink() || !current.isDirectory() || current.dev !== identity.dev ||
      current.ino !== identity.ino || path.dirname(await realpath(owned)) !== physicalParent) {
      return { outcome: "BLOCKED", temporaryPath: owned,
        reason: "Audit verification parent ownership changed; deletion withheld" };
    }
  } catch (error) {
    return { outcome: "UNKNOWN", temporaryPath: owned,
      reason: "Audit verification parent cleanup state is unknown; deletion withheld", error: error.message };
  }
  try {
    // Never recursively remove this parent: G3 may have preserved its inner root.
    await rmdir(owned);
    return null;
  } catch (error) {
    return { outcome: "FAILED", temporaryPath: owned,
      reason: "Audit verification parent removal failed; temporary path preserved", error: error.message };
  }
}

export async function verifyAuditFixture({ repositoryRoot, outerTemporaryRoot, scope,
  runner = execute, temporaryParent = tmpdir() } = {}) {
  const outer = await realpath(outerTemporaryRoot);
  const parent = await realpath(temporaryParent);
  if (contains(outer, parent)) {
    throw new Error("Audit verification temporary parent must be outside the outer cleanup root");
  }
  const owned = await mkdtemp(path.join(parent, "kyw-audit-smoke-verification-"));
  const identity = await lstat(owned);
  let verification;
  let executionFailure;
  try {
    const physicalOwned = await realpath(owned);
    if (contains(outer, physicalOwned) || contains(physicalOwned, outer)) {
      throw new Error("Audit verification and outer cleanup roots must be physically disjoint");
    }
    verification = await verifyInAuditSandbox({
      repositoryRoot,
      files: [...FIXTURE_FILES],
      command: [...FIXTURE_COMMAND],
      image: "node:22",
      temporaryParent: physicalOwned,
      runner: async (command, args, options) => {
        if (args[0] !== "run") return runner(command, args, options);
        try {
          const result = await scope.runChild({ command, args, ...options });
          if (result.error || result.signal || result.status !== 0) throw childFailure(result);
          return { stdout: result.stdout, stderr: result.stderr };
        } catch (error) {
          executionFailure = { code: error.code ?? null, signal: error.signal ?? null };
          // An interrupted scope still needs bounded daemon cleanup. G3 retains
          // UNKNOWN and cleanup evidence; the caller's final checkpoint rejects.
          throw error;
        }
      },
    });
  } catch (error) {
    verification = { status: "BLOCKED", executed: false, attempted: false, completed: false,
      verificationOutcome: "UNEXECUTED", exitCode: null,
      reason: `Audit verification preparation failed: ${error.message}`, cleanup: { outcome: "NOT_REQUIRED" } };
  }
  if (new Set(["COMPLETED", "NOT_REQUIRED"]).has(verification.cleanup.outcome)) {
    const cleanupFailure = await removeEmptyOwnedParent(owned, identity, parent);
    if (cleanupFailure) {
      verification = { ...verification, cleanup: cleanupFailure,
        status: verification.status === "PASSED" ? "BLOCKED" : verification.status };
    }
  } else {
    verification = { ...verification, cleanup: { ...verification.cleanup, temporaryParent: owned } };
  }
  return { ...verification, ...(executionFailure ? { executionFailure } : {}) };
}
