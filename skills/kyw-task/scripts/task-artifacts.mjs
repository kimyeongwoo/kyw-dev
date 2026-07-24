#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
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
    "kyw-task runtime support is missing. Reinstall or update kyw-dev before running task-artifacts.mjs.",
  );
}

const {
  TaskArtifactError,
  createTaskArtifactBatch,
  createTaskArtifacts,
  resolveTaskDispatch,
  validateTaskDirectory,
} = await import(coreUrl);

const usage =
  "Usage: task-artifacts.mjs create --tasks-root <path> --title <title>\n" +
  "   or: task-artifacts.mjs create-batch --tasks-root <path> " +
  "(--batch-json <json> | --batch-file <path>)\n" +
  "   or: task-artifacts.mjs validate --task-directory <path>\n" +
  "   or: task-artifacts.mjs dispatch --tasks-root <path> --invocation <text> " +
  "--managed-routing <true|false> [--delivery-ledger <json-path> | --delivery-ledger-json <json>] " +
  "[--delivery-expectations <json-path> | --delivery-expectations-json <json>] " +
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

  let value;
  try {
    value = JSON.parse(inlineJson ?? (await readFile(resolve(filePath), "utf8")));
  } catch (error) {
    const source = filePath ? resolve(filePath) : "inline JSON";
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

export async function runTaskArtifactCommand(argv) {
  const [command, ...args] = argv;

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

    const deliveryLedger = await readJsonObjectOption(options, {
      pathOption: "--delivery-ledger",
      jsonOption: "--delivery-ledger-json",
      label: "delivery ledger",
      errorCode: "INVALID_DELIVERY_LEDGER",
    });
    const deliveryExpectations = await readJsonObjectOption(options, {
      pathOption: "--delivery-expectations",
      jsonOption: "--delivery-expectations-json",
      label: "delivery expectations",
      errorCode: "INVALID_DELIVERY_EXPECTATIONS",
    });
    const executionPreflight = await readJsonObjectOption(options, {
      pathOption: "--execution-preflight",
      jsonOption: "--execution-preflight-json",
      label: "execution preflight",
      errorCode: "INVALID_EXECUTION_PREFLIGHT",
    });

    const result = await resolveTaskDispatch({
      tasksRoot: resolve(options.get("--tasks-root")),
      invocation: options.get("--invocation"),
      managedRoutingAvailable: managedRoutingValue === "true",
      deliveryLedger,
      deliveryExpectations,
      executionPreflight,
    });
    return { command, ...result };
  }

  throw new TaskArtifactError(
    "INVALID_TASK_ADAPTER_ARGUMENTS",
    `Expected create, create-batch, validate, or dispatch, received ${command ?? "<missing>"}\n${usage}`,
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
