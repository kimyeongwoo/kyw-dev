#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageCoreUrl = new URL("../../../src/core/task-artifacts.mjs", import.meta.url);
const directInstallCoreUrl = new URL(
  "../../.kyw-dev/runtime/src/core/task-artifacts.mjs",
  import.meta.url,
);
const coreUrl = existsSync(fileURLToPath(packageCoreUrl)) ? packageCoreUrl : directInstallCoreUrl;

if (!existsSync(fileURLToPath(coreUrl))) {
  throw new Error(
    "kyw-dev Task runtime support is missing. Reinstall or update kyw-dev before running task-artifacts.mjs.",
  );
}

const {
  MAX_TASK_BATCH_PAYLOAD_BYTES,
  TaskArtifactError,
  applyStandardDeliveryContinuityTransition,
  bootstrapStandardDeliveryContinuity,
  createTaskArtifactBatch,
  createTaskArtifacts,
  createStandardDeliveryContinuityTransitionToken,
  hydratePriorStandardDeliveries,
  inspectTaskBatchTransaction,
  recoverTaskBatchTransaction,
  parseTaskInvocation,
  resolveTaskDispatch,
  validateTaskDirectory,
} = await import(coreUrl);

const usage =
  "Usage: task-artifacts.mjs create --tasks-root <path> --title <title>\n" +
  "   or: task-artifacts.mjs create-batch --tasks-root <path> " +
  "(--batch-json <json> | --batch-file <path>)\n" +
  "   or: task-artifacts.mjs inspect-transaction --tasks-root <path>\n" +
  "   or: task-artifacts.mjs recover-transaction --tasks-root <path>\n" +
  "   or: task-artifacts.mjs validate --task-directory <path>\n" +
  "   or: task-artifacts.mjs bootstrap-continuity --tasks-root <path> " +
  "--invocation <text> --managed-routing <true|false> " +
  "--migration-authority EXPLICIT_REBASELINE\n" +
  "   or: task-artifacts.mjs apply-continuity --tasks-root <path> " +
  "--selected-task <NNNN> --transition-token <opaque-token>\n" +
  "   or: task-artifacts.mjs dispatch --tasks-root <path> --invocation <text> " +
  "--managed-routing <true|false> " +
  "[--execution-preflight <json-path> | --execution-preflight-json <json>]";

function parseOptions(args, requiredNames, optionalNames = []) {
  const allowed = new Set([...requiredNames, ...optionalNames]);
  const options = new Map();

  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!allowed.has(name)) {
      throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", `Unknown option ${name ?? "<missing>"}\n${usage}`);
    }
    if (value === undefined) {
      throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", `Option ${name} requires a value\n${usage}`);
    }
    if (!value.trim()) {
      throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", `Option ${name} requires a non-empty value\n${usage}`);
    }
    if (options.has(name)) {
      throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", `Option ${name} may be provided only once`);
    }
    options.set(name, value);
  }

  for (const name of requiredNames) {
    if (!options.has(name)) {
      throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", `Missing required option ${name}\n${usage}`);
    }
  }
  return options;
}

async function readJsonObjectOption(options, {
  pathOption,
  jsonOption,
  label,
  errorCode,
  maxBytes,
}) {
  const filePath = options.get(pathOption);
  const inlineJson = options.get(jsonOption);
  if (filePath && inlineJson) {
    throw new TaskArtifactError(
      "INVALID_TASK_ADAPTER_ARGUMENTS",
      `Use only one of ${pathOption} or ${jsonOption}`,
    );
  }
  if (!filePath && !inlineJson) {
    return {};
  }

  const resolvedPath = filePath ? resolve(filePath) : undefined;
  if (Number.isSafeInteger(maxBytes) && maxBytes > 0) {
    let observedBytes;
    try {
      observedBytes = inlineJson === undefined
        ? (await stat(resolvedPath)).size
        : Buffer.byteLength(inlineJson, "utf8");
    } catch (error) {
      throw new TaskArtifactError(
        errorCode,
        `Cannot inspect ${label} ${resolvedPath}: ${error.message}`,
        { cause: error },
      );
    }
    if (observedBytes > maxBytes) {
      throw new TaskArtifactError(
        "TASK_BATCH_PAYLOAD_TOO_LARGE",
        `${label} must not exceed ${maxBytes} UTF-8 bytes`,
      );
    }
  }

  let value;
  try {
    value = JSON.parse(inlineJson ?? (await readFile(resolvedPath, "utf8")));
  } catch (error) {
    const source = resolvedPath ?? "inline JSON";
    throw new TaskArtifactError(
      errorCode,
      `Cannot read ${label} ${source}: ${error.message}`,
      { cause: error },
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TaskArtifactError(
      errorCode,
      `${label} must be a JSON object`,
    );
  }
  return value;
}

export async function runTaskArtifactCommand(argv, runtime = {}) {
  const [command, ...args] = argv;
  const hydrateDeliveries =
    runtime.hydratePriorStandardDeliveries ?? hydratePriorStandardDeliveries;
  const dispatchTask = runtime.resolveTaskDispatch ?? resolveTaskDispatch;
  const bootstrapContinuity =
    runtime.bootstrapStandardDeliveryContinuity ??
    bootstrapStandardDeliveryContinuity;

  if (command === "create") {
    const options = parseOptions(args, ["--tasks-root", "--title"]);
    const created = await createTaskArtifacts({
      tasksRoot: resolve(options.get("--tasks-root")),
      title: options.get("--title"),
    });
    return { command, ...created };
  }

  if (command === "create-batch") {
    const options = parseOptions(
      args,
      ["--tasks-root"],
      ["--batch-json", "--batch-file"],
    );
    const batchSpec = await readJsonObjectOption(options, {
      pathOption: "--batch-file",
      jsonOption: "--batch-json",
      label: "Task batch specification",
      errorCode: "INVALID_TASK_BATCH",
      maxBytes: MAX_TASK_BATCH_PAYLOAD_BYTES,
    });
    const batchKeys = Object.keys(batchSpec).sort();
    if (
      batchKeys.length !== 2 ||
      batchKeys[0] !== "schemaVersion" ||
      batchKeys[1] !== "tasks" ||
      batchSpec.schemaVersion !== 1 ||
      !Array.isArray(batchSpec.tasks)
    ) {
      throw new TaskArtifactError(
        "INVALID_TASK_BATCH",
        "Task batch specification must contain exactly schemaVersion: 1 and a tasks array",
      );
    }
    const created = await createTaskArtifactBatch({
      tasksRoot: resolve(options.get("--tasks-root")),
      tasks: batchSpec.tasks,
    });
    return { command, schemaVersion: 1, ...created };
  }

  if (command === "inspect-transaction") {
    const options = parseOptions(args, ["--tasks-root"]);
    const diagnostic = await inspectTaskBatchTransaction({
      tasksRoot: resolve(options.get("--tasks-root")),
    });
    return { command, ...diagnostic };
  }

  if (command === "recover-transaction") {
    const options = parseOptions(args, ["--tasks-root"]);
    const recovery = await recoverTaskBatchTransaction({
      tasksRoot: resolve(options.get("--tasks-root")),
    });
    return { command, ...recovery };
  }

  if (command === "validate") {
    const options = parseOptions(args, ["--task-directory"]);
    const directory = resolve(options.get("--task-directory"));
    const errors = await validateTaskDirectory(directory);
    if (errors.length > 0) {
      throw new TaskArtifactError(
        "INVALID_TASK_DIRECTORY",
        `Task artifact validation failed for ${directory}:\n- ${errors.join("\n- ")}`,
      );
    }
    return { command, directory, valid: true };
  }

  if (command === "bootstrap-continuity") {
    const options = parseOptions(args, [
      "--tasks-root",
      "--invocation",
      "--managed-routing",
      "--migration-authority",
    ]);
    const managedRoutingValue = options.get("--managed-routing");
    if (!["true", "false"].includes(managedRoutingValue)) {
      throw new TaskArtifactError(
        "INVALID_TASK_ADAPTER_ARGUMENTS",
        "--managed-routing must be true or false",
      );
    }
    if (options.get("--migration-authority") !== "EXPLICIT_REBASELINE") {
      throw new TaskArtifactError(
        "MIGRATION_AUTHORITY_REQUIRED",
        "continuity bootstrap requires explicit migration/rebaseline authority",
      );
    }
    const bootstrapped = await bootstrapContinuity({
      tasksRoot: resolve(options.get("--tasks-root")),
      invocation: options.get("--invocation"),
      managedRoutingAvailable: managedRoutingValue === "true",
    });
    return {
      command,
      checkpoint: bootstrapped.checkpoint,
      write: bootstrapped.write,
      diagnostics: bootstrapped.diagnostics,
    };
  }

  if (command === "apply-continuity") {
    const options = parseOptions(args, [
      "--tasks-root",
      "--selected-task",
      "--transition-token",
    ]);
    if (!/^\d{4}$/.test(options.get("--selected-task"))) {
      throw new TaskArtifactError(
        "INVALID_TASK_ADAPTER_ARGUMENTS",
        "--selected-task must be a four-digit Task ID",
      );
    }
    const applied = await applyStandardDeliveryContinuityTransition({
      tasksRoot: resolve(options.get("--tasks-root")),
      selectedTaskId: options.get("--selected-task"),
      transitionToken: options.get("--transition-token"),
    });
    return { command, ...applied };
  }

  if (command === "dispatch") {
    const options = parseOptions(
      args,
      ["--tasks-root", "--invocation", "--managed-routing"],
      [
        "--delivery-ledger",
        "--delivery-ledger-json",
        "--delivery-expectations",
        "--delivery-expectations-json",
        "--execution-preflight",
        "--execution-preflight-json",
      ],
    );
    const managedRoutingValue = options.get("--managed-routing");
    if (!["true", "false"].includes(managedRoutingValue)) {
      throw new TaskArtifactError(
        "INVALID_TASK_ADAPTER_ARGUMENTS",
        "--managed-routing must be true or false",
      );
    }

    const executionPreflight = await readJsonObjectOption(options, {
      pathOption: "--execution-preflight",
      jsonOption: "--execution-preflight-json",
      label: "execution preflight",
      errorCode: "INVALID_EXECUTION_PREFLIGHT",
    });

    const tasksRoot = resolve(options.get("--tasks-root"));
    const invocation = options.get("--invocation");
    const managedRoutingAvailable = managedRoutingValue === "true";
    const parsedInvocation = parseTaskInvocation(invocation, {
      managedRoutingAvailable,
    });
    const manualDeliveryInput = [
      "--delivery-ledger",
      "--delivery-ledger-json",
      "--delivery-expectations",
      "--delivery-expectations-json",
    ].some((name) => options.has(name));
    let deliveryLedger;
    let deliveryExpectations;
    let hydrationDiagnostics;
    let preparedCheckpoint;
    if (manualDeliveryInput) {
      deliveryLedger = await readJsonObjectOption(options, {
        pathOption: "--delivery-ledger",
        jsonOption: "--delivery-ledger-json",
        label: "delivery ledger",
        errorCode: "INVALID_DELIVERY_LEDGER",
      });
      deliveryExpectations = await readJsonObjectOption(options, {
        pathOption: "--delivery-expectations",
        jsonOption: "--delivery-expectations-json",
        label: "delivery expectations",
        errorCode: "INVALID_DELIVERY_EXPECTATIONS",
      });
    } else {
      const hydrated = await hydrateDeliveries({
        tasksRoot,
        invocation,
        managedRoutingAvailable,
        parsedInvocation,
      });
      deliveryLedger = hydrated.deliveryLedger;
      deliveryExpectations = hydrated.deliveryExpectations;
      hydrationDiagnostics = hydrated.diagnostics;
      preparedCheckpoint = hydrated.preparedCheckpoint;
    }

    const result = await dispatchTask({
      tasksRoot,
      invocation,
      managedRoutingAvailable,
      deliveryLedger,
      deliveryExpectations,
      executionPreflight,
      parsedInvocation,
    });
    const continuityTransitionToken =
      preparedCheckpoint &&
      parsedInvocation.route === "DELIVERY" &&
      result.outcome === "SELECTED" &&
      result.action === "DELIVER" &&
      result.task?.taskStatus === "DONE" &&
      result.task?.testStatus === "PASSED" &&
      result.task?.deliveryRequirement?.kind === "STANDARD" &&
      result.task?.id
        ? createStandardDeliveryContinuityTransitionToken({
            selectedTaskId: result.task.id,
            checkpoint: preparedCheckpoint,
          })
        : undefined;
    return {
      command,
      ...result,
      ...(continuityTransitionToken ? { continuityTransitionToken } : {}),
      ...(hydrationDiagnostics ? { hydration: hydrationDiagnostics } : {}),
    };
  }

  throw new TaskArtifactError(
    "INVALID_TASK_ADAPTER_ARGUMENTS",
    `Expected create, create-batch, inspect-transaction, recover-transaction, validate, bootstrap-continuity, apply-continuity, or dispatch, received ${command ?? "<missing>"}\n${usage}`,
  );
}

async function main() {
  try {
    const result = await runTaskArtifactCommand(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "TASK_ADAPTER_FAILED";
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${code}: ${message}\n`);
    process.exitCode = 1;
  }
}

const entryPoint = process.argv[1]
  ? pathToFileURL(realpathSync(resolve(process.argv[1]))).href
  : undefined;
const moduleUrl = pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
if (entryPoint === moduleUrl) {
  await main();
}
