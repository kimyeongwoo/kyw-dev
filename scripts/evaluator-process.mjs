import { spawn, spawnSync } from "node:child_process";
import { rmSync, rmdirSync } from "node:fs";
import { setImmediate as waitForImmediate } from "node:timers/promises";

export const DEFAULT_GRACEFUL_TERMINATION_MS = 1_500;
export const DEFAULT_FORCED_TERMINATION_MS = 1_500;

const SIGNAL_EXIT_CODES = Object.freeze({ SIGINT: 130, SIGTERM: 143 });
const SAFE_LABEL_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_OPERATION_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_REASON_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export class EvaluatorInterruptedError extends Error {
  constructor(signal) {
    super(`Evaluator interrupted by ${signal}`);
    this.name = "EvaluatorInterruptedError";
    this.code = "EVALUATOR_INTERRUPTED";
    this.signal = signal;
    this.exitCode = SIGNAL_EXIT_CODES[signal] ?? 1;
  }
}

export class EvaluatorProcessError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "EvaluatorProcessError";
    this.code = code;
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function safeField(value, pattern, fallback) {
  const normalized = String(value ?? "");
  return pattern.test(normalized) ? normalized : fallback;
}

function safeReason(error) {
  for (const candidate of [error?.code, error?.name]) {
    if (SAFE_REASON_PATTERN.test(String(candidate ?? ""))) return String(candidate);
  }
  return "UNKNOWN";
}

export function cleanupFailureDiagnostic({ operation, pathLabel, error }) {
  return `cleanup operation=${safeField(operation, SAFE_OPERATION_PATTERN, "unknown-operation")} pathLabel=${safeField(
    pathLabel,
    SAFE_LABEL_PATTERN,
    "owned-path",
  )} reason=${safeReason(error)}`;
}

export function defaultRemoveOwnedPath(path, options = {}) {
  if (options.directoryOnly) {
    rmdirSync(path);
    return;
  }
  const removeOptions = { ...options };
  delete removeOptions.directoryOnly;
  rmSync(path, removeOptions);
}

function supportedSignals(platform) {
  return platform === "win32" ? ["SIGINT"] : ["SIGINT", "SIGTERM"];
}

function isMissingProcessError(error) {
  return new Set(["ESRCH", "ENOENT"]).has(error?.code);
}

function posixProcessGroupAlive(pid, processTarget) {
  try {
    processTarget.kill(-pid, 0);
    return true;
  } catch (error) {
    if (isMissingProcessError(error)) return false;
    throw error;
  }
}

async function waitUntil(predicate, milliseconds) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (!predicate()) return true;
    await delay(Math.min(25, Math.max(1, deadline - Date.now())));
  }
  return !predicate();
}

function signalPosixGroup(pid, signal, processTarget) {
  try {
    processTarget.kill(-pid, signal);
    return;
  } catch (error) {
    if (isMissingProcessError(error)) return;
    throw error;
  }
}

function runTaskkill(pid, forced, timeout) {
  const args = ["/PID", String(pid), "/T"];
  if (forced) args.push("/F");
  return spawnSync("taskkill.exe", args, {
    encoding: "utf8",
    timeout: Math.max(1, timeout),
    windowsHide: true,
  });
}

async function runWindowsTerminationPhase(state, pid, forced, milliseconds, taskkill) {
  const startedAt = Date.now();
  taskkill(pid, forced, milliseconds);
  const remaining = Math.max(0, milliseconds - (Date.now() - startedAt));
  return waitUntil(() => !state.closed, remaining);
}

async function terminateOwnedTree(
  state,
  {
    platform,
    processTarget,
    gracefulTerminationMs,
    forcedTerminationMs,
    taskkill = runTaskkill,
  },
) {
  if (!Number.isInteger(state.child.pid)) return { forced: false, terminated: true };
  const pid = state.child.pid;

  if (platform === "win32") {
    const graceful = await runWindowsTerminationPhase(
      state,
      pid,
      false,
      gracefulTerminationMs,
      taskkill,
    );
    if (graceful) return { forced: false, terminated: true };
    const forced = await runWindowsTerminationPhase(
      state,
      pid,
      true,
      forcedTerminationMs,
      taskkill,
    );
    return { forced: true, terminated: forced };
  }

  signalPosixGroup(pid, "SIGTERM", processTarget);
  const graceful = await waitUntil(
    () => posixProcessGroupAlive(pid, processTarget),
    gracefulTerminationMs,
  );
  if (graceful) return { forced: false, terminated: true };
  signalPosixGroup(pid, "SIGKILL", processTarget);
  const forced = await waitUntil(
    () => posixProcessGroupAlive(pid, processTarget),
    forcedTerminationMs,
  );
  return { forced: true, terminated: forced };
}

function errorWithCode(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function appendBuffer(state, chunk, limit, onOverflow) {
  const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  const remaining = Math.max(0, limit - state.length);
  if (remaining > 0) state.chunks.push(bytes.subarray(0, remaining));
  state.length += bytes.length;
  if (state.length > limit) onOverflow();
}

export function createEvaluatorRunScope({
  platform = process.platform,
  processTarget = process,
  spawnChild = spawn,
  gracefulTerminationMs = DEFAULT_GRACEFUL_TERMINATION_MS,
  forcedTerminationMs = DEFAULT_FORCED_TERMINATION_MS,
  taskkill,
  onChildSpawn,
} = {}) {
  let activeChild;
  let cause;
  let finalized;
  const lifecycleDiagnostics = [];
  const listeners = new Map();

  const claimCause = (candidate) => {
    if (cause) return false;
    cause = Object.freeze(candidate);
    return true;
  };

  const terminationOptions = {
    platform,
    processTarget,
    gracefulTerminationMs,
    forcedTerminationMs,
    taskkill: taskkill ?? runTaskkill,
  };

  const terminateActiveChild = async () => {
    const state = activeChild;
    if (!state) return { forced: false, terminated: true };
    state.terminationPromise ??= terminateOwnedTree(state, terminationOptions)
      .then((result) => {
        if (!result.terminated) {
          lifecycleDiagnostics.push(
            "termination operation=terminate-tree pathLabel=active-child-tree reason=TIMEOUT",
          );
        }
        state.terminalWake?.resolve();
        return result;
      })
      .catch((error) => {
        lifecycleDiagnostics.push(
          `termination operation=terminate-tree pathLabel=active-child-tree reason=${safeReason(error)}`,
        );
        state.terminalWake?.resolve();
        return { forced: true, terminated: false };
      });
    return state.terminationPromise;
  };

  const signalHandler = (signal) => {
    if (!claimCause({ kind: "interruption", signal })) return;
    void terminateActiveChild();
  };

  for (const signal of supportedSignals(platform)) {
    const listener = () => signalHandler(signal);
    listeners.set(signal, listener);
    processTarget.on(signal, listener);
  }

  const interruptionError = () =>
    cause?.kind === "interruption" ? new EvaluatorInterruptedError(cause.signal) : null;

  const checkpoint = async () => {
    await waitForImmediate();
    const error = interruptionError();
    if (error) throw error;
  };

  const runChild = async ({
    command,
    args = [],
    cwd,
    env,
    input,
    timeout = 30_000,
    maxBuffer = 20 * 1024 * 1024,
    windowsHide = true,
  }) => {
    await checkpoint();
    if (activeChild) {
      throw new EvaluatorProcessError(
        "EVALUATOR_CHILD_ALREADY_ACTIVE",
        "An evaluator run may own only one active long-running child",
      );
    }

    let child;
    try {
      child = spawnChild(command, args, {
        cwd,
        detached: true,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide,
      });
    } catch (error) {
      claimCause({ kind: "spawn-failure" });
      return { error, signal: null, status: null, stderr: "", stdout: "" };
    }

    const closed = deferred();
    const terminalWake = deferred();
    const state = {
      child,
      closed: false,
      closeSignal: null,
      closeStatus: null,
      closePromise: closed.promise,
      terminalWake,
      terminationPromise: null,
    };
    activeChild = state;
    const stdout = { chunks: [], length: 0 };
    const stderr = { chunks: [], length: 0 };
    let processError;
    let overflowError;
    let timeoutError;
    let terminationStarted = false;

    const wakeAfterTermination = () => {
      if (terminationStarted) return;
      terminationStarted = true;
      void terminateActiveChild().finally(() => terminalWake.resolve());
    };

    const overflow = () => {
      if (overflowError) return;
      overflowError = errorWithCode("ENOBUFS", `Evaluator child output exceeded maxBuffer=${maxBuffer}`);
      if (claimCause({ kind: "max-output" })) wakeAfterTermination();
    };

    child.stdout?.on("data", (chunk) => appendBuffer(stdout, chunk, maxBuffer, overflow));
    child.stderr?.on("data", (chunk) => appendBuffer(stderr, chunk, maxBuffer, overflow));
    child.once("spawn", () => {
      try {
        onChildSpawn?.({ pid: child.pid });
      } catch (error) {
        processError = error;
        if (claimCause({ kind: "failure" })) wakeAfterTermination();
      }
    });
    child.once("error", (error) => {
      processError = error;
      if (claimCause({ kind: "spawn-failure" })) terminalWake.resolve();
    });
    child.once("close", (status, signal) => {
      state.closed = true;
      state.closeStatus = status;
      state.closeSignal = signal;
      closed.resolve();
    });
    child.stdin?.on("error", () => {
      // A child may close before consuming all input; its exit/error remains authoritative.
    });

    if (input === undefined) child.stdin?.end();
    else child.stdin?.end(input);

    const timeoutHandle = setTimeout(() => {
      timeoutError = errorWithCode("ETIMEDOUT", `Evaluator child exceeded timeout=${timeout}`);
      if (claimCause({ kind: "timeout" })) wakeAfterTermination();
    }, timeout);

    await Promise.race([closed.promise, terminalWake.promise]);
    clearTimeout(timeoutHandle);

    if (cause?.kind === "interruption") {
      await terminateActiveChild();
    }

    if (state.closed) activeChild = undefined;
    if (!cause && state.closeStatus !== 0) claimCause({ kind: "child-failure" });

    const terminalError =
      cause?.kind === "timeout"
        ? timeoutError
        : cause?.kind === "max-output"
          ? overflowError
          : processError;
    const result = {
      error: terminalError,
      signal: state.closeSignal,
      status: state.closeStatus,
      stderr: Buffer.concat(stderr.chunks).toString("utf8"),
      stdout: Buffer.concat(stdout.chunks).toString("utf8"),
    };
    const interrupted = interruptionError();
    if (interrupted) throw interrupted;
    return result;
  };

  const claimFailure = () => claimCause({ kind: "failure" });

  const finalize = (cleanup) => {
    finalized ??= (async () => {
      if (activeChild) await terminateActiveChild();
      let cleanupDiagnostics = [];
      try {
        cleanupDiagnostics = (await cleanup?.()) ?? [];
      } catch (error) {
        cleanupDiagnostics = [
          cleanupFailureDiagnostic({
            operation: "cleanup",
            pathLabel: "evaluator-state",
            error,
          }),
        ];
      }
      lifecycleDiagnostics.push(...cleanupDiagnostics);
      if (!cause) {
        claimCause({
          kind: lifecycleDiagnostics.length > 0 ? "cleanup-failure" : "success",
        });
      }
      for (const [signal, listener] of listeners) processTarget.off(signal, listener);
      return {
        cause,
        diagnostics: [...lifecycleDiagnostics],
      };
    })();
    return finalized;
  };

  return Object.freeze({
    checkpoint,
    claimFailure,
    finalize,
    get cause() {
      return cause;
    },
    interruptionError,
    runChild,
  });
}

export function appendEvaluatorDiagnostics(error, diagnostics) {
  if (!error || diagnostics.length === 0) return error;
  error.message = `${error.message}\n${diagnostics.join("\n")}`;
  return error;
}
