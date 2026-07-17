#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
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

const { TaskArtifactError, createTaskArtifacts, validateTaskDirectory } = await import(coreUrl);

const usage =
  "Usage: task-artifacts.mjs create --tasks-root <path> --title <title>\n" +
  "   or: task-artifacts.mjs validate --task-directory <path>";

function parseOptions(args, allowedNames) {
  const allowed = new Set(allowedNames);
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

  for (const name of allowedNames) {
    if (!options.has(name)) {
      throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", `Missing required option ${name}\n${usage}`);
    }
  }
  return options;
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

  throw new TaskArtifactError(
    "INVALID_TASK_ADAPTER_ARGUMENTS",
    `Expected create or validate, received ${command ?? "<missing>"}\n${usage}`,
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
