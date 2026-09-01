import { spawn, spawnSync } from "node:child_process";

export const FIXTURE_CHILD_CLOSE_TIMEOUT_MS = 5_000;

const CLOSE_OBSERVED = Symbol("fixture-child-close-observed");
const CLOSE_TIMEOUT = Symbol("fixture-child-close-timeout");
const SAFE_REASON = /^[A-Za-z0-9_-]{1,64}$/;

function deferred() {
  let resolve;
  const promise = new Promise((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function ownerError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function safeReason(error) {
  for (const candidate of [error?.code, error?.name]) {
    if (SAFE_REASON.test(String(candidate ?? ""))) return String(candidate);
  }
  return "UNKNOWN";
}

function safeStatus(value) {
  return Number.isInteger(value) ? String(value) : value === null ? "null" : "unknown";
}

function safeSignal(value) {
  return SAFE_REASON.test(String(value ?? "")) ? String(value) : value === null ? "null" : "unknown";
}

function childPid(child) {
  return Number.isInteger(child.pid) && child.pid > 0 ? child.pid : null;
}

function schedulerFrom(overrides = {}) {
  return Object.freeze({
    clearTimeout: overrides.clearTimeout ?? ((handle) => clearTimeout(handle)),
    setTimeout:
      overrides.setTimeout ??
      ((callback, milliseconds) => setTimeout(callback, milliseconds)),
  });
}

function spawnDetached(args) {
  const options = args.at(-1);
  return Boolean(
    options &&
      typeof options === "object" &&
      !Array.isArray(options) &&
      options.detached === true,
  );
}

function timeoutDiagnostic(record, termination, closeTimeoutMs) {
  const fields = [
    "fixture child cleanup timed out",
    "state=close-pending",
    `pid=${record.pid ?? "unknown"}`,
    `detached=${record.detached}`,
    `exitObserved=${record.exited}`,
    `exitStatus=${safeStatus(record.exitStatus)}`,
    `exitSignal=${safeSignal(record.exitSignal)}`,
    `closeObserved=${record.closed}`,
    `termination=${termination.operation}`,
    `terminationStatus=${termination.status}`,
    `terminationError=${termination.error}`,
    `timeoutMs=${closeTimeoutMs}`,
  ];
  const error = ownerError("FIXTURE_CHILD_CLOSE_TIMEOUT", fields.join(" "));
  error.name = "FixtureChildCloseTimeoutError";
  return error;
}

function removeObservation(record) {
  record.child.removeListener("exit", record.onExit);
  record.child.removeListener("close", record.onClose);
}

export function createFixtureChildOwner(
  t,
  {
    spawnChild: baseSpawnChild = spawn,
    platform = process.platform,
    taskkill = spawnSync,
    killProcess = process.kill.bind(process),
    scheduler: schedulerOverrides,
    closeTimeoutMs = FIXTURE_CHILD_CLOSE_TIMEOUT_MS,
  } = {},
) {
  if (!t || typeof t.after !== "function") {
    throw new TypeError("Fixture child ownership requires a test context with after()");
  }
  if (typeof baseSpawnChild !== "function") {
    throw new TypeError("Fixture child ownership requires a spawn function");
  }
  if (!Number.isFinite(closeTimeoutMs) || closeTimeoutMs <= 0) {
    throw new TypeError("Fixture child closeTimeoutMs must be a positive finite number");
  }

  const scheduler = schedulerFrom(schedulerOverrides);
  const records = [];
  const retained = new WeakMap();
  let cleanupPromise;
  let cleanupStarted = false;

  function retain(child, { detached = child?.detached === true } = {}) {
    if (cleanupStarted) {
      throw ownerError(
        "FIXTURE_CHILD_OWNER_CLOSED",
        "Fixture child ownership cannot retain a child after cleanup starts",
      );
    }
    if (
      !child ||
      (typeof child !== "object" && typeof child !== "function") ||
      typeof child.on !== "function" ||
      typeof child.removeListener !== "function"
    ) {
      throw ownerError(
        "FIXTURE_CHILD_HANDLE_MISSING",
        "Fixture spawn did not return an observable child handle",
      );
    }
    if (retained.has(child)) return child;

    const closed = deferred();
    const record = {
      child,
      pid: childPid(child),
      detached: detached === true,
      exited: false,
      exitStatus: undefined,
      exitSignal: undefined,
      closed: false,
      closeStatus: undefined,
      closeSignal: undefined,
      closePromise: closed.promise,
      onExit: undefined,
      onClose: undefined,
    };
    record.onExit = (status, signal) => {
      record.exited = true;
      record.exitStatus = status;
      record.exitSignal = signal;
    };
    record.onClose = (status, signal) => {
      record.closed = true;
      record.closeStatus = status;
      record.closeSignal = signal;
      closed.resolve(CLOSE_OBSERVED);
    };

    try {
      child.on("close", record.onClose);
      child.on("exit", record.onExit);
    } catch {
      child.removeListener?.("close", record.onClose);
      child.removeListener?.("exit", record.onExit);
      throw ownerError(
        "FIXTURE_CHILD_HANDLE_INVALID",
        "Fixture spawn returned a child handle that cannot be observed",
      );
    }

    retained.set(child, record);
    records.push(record);
    return child;
  }

  function ownedSpawnChild(...args) {
    if (cleanupStarted) {
      throw ownerError(
        "FIXTURE_CHILD_OWNER_CLOSED",
        "Fixture child ownership cannot spawn a child after cleanup starts",
      );
    }
    const detached = spawnDetached(args);
    const child = baseSpawnChild(...args);
    return retain(child, { detached });
  }

  function requestTermination(record) {
    if (record.exited) {
      return { operation: "suppressed-after-exit", status: "not-run", error: "none" };
    }
    if (record.pid === null) {
      return { operation: "missing-retained-pid", status: "not-run", error: "none" };
    }

    if (platform === "win32") {
      let result;
      try {
        result = taskkill(
          "taskkill.exe",
          ["/PID", String(record.pid), "/T", "/F"],
          {
            encoding: "utf8",
            timeout: closeTimeoutMs,
            windowsHide: true,
          },
        );
      } catch (error) {
        return {
          operation: "windows-taskkill-tree",
          status: "unknown",
          error: safeReason(error),
        };
      }
      return {
        operation: "windows-taskkill-tree",
        status: safeStatus(result?.status),
        error: result?.error ? safeReason(result.error) : "none",
      };
    }

    try {
      killProcess(record.detached ? -record.pid : record.pid, "SIGKILL");
      return {
        operation: record.detached ? "posix-retained-group" : "posix-retained-root",
        status: "requested",
        error: "none",
      };
    } catch (error) {
      return {
        operation: record.detached ? "posix-retained-group" : "posix-retained-root",
        status: "unknown",
        error: safeReason(error),
      };
    }
  }

  async function finalizeRecord(record) {
    let timeoutHandle;
    try {
      if (record.closed) return;
      const timeout = new Promise((resolve) => {
        timeoutHandle = scheduler.setTimeout(
          () => resolve(CLOSE_TIMEOUT),
          closeTimeoutMs,
        );
      });
      const termination = requestTermination(record);
      const outcome = await Promise.race([record.closePromise, timeout]);
      if (outcome === CLOSE_TIMEOUT && !record.closed) {
        throw timeoutDiagnostic(record, termination, closeTimeoutMs);
      }
    } finally {
      if (timeoutHandle !== undefined) scheduler.clearTimeout(timeoutHandle);
      removeObservation(record);
    }
  }

  async function cleanupAll() {
    const outcomes = await Promise.allSettled(
      records.map((record) => finalizeRecord(record)),
    );
    const failures = outcomes
      .filter((outcome) => outcome.status === "rejected")
      .map((outcome) => outcome.reason);
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) {
      const error = new AggregateError(
        failures,
        `fixture child cleanup failed records=${records.length} failures=${failures.length}`,
      );
      error.code = "FIXTURE_CHILD_CLEANUP_FAILED";
      throw error;
    }
  }

  function cleanup() {
    if (cleanupPromise) return cleanupPromise;
    cleanupStarted = true;
    cleanupPromise = cleanupAll();
    return cleanupPromise;
  }

  t.after(cleanup);
  return Object.freeze({ cleanup, retain, spawnChild: ownedSpawnChild });
}
