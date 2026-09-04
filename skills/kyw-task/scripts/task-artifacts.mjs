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
  derivePublicReleasePlan,
  hydratePriorStandardDeliveries,
  hydratePublicReleaseContext,
  inspectTaskBatchTransaction,
  recoverTaskBatchTransaction,
  parseTaskInvocation,
  resolveTaskDispatch,
  redactPublicReleaseDiagnostics,
  runPublicRelease,
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
  "   or: task-artifacts.mjs dispatch --tasks-root <path> --invocation <text> " +
  "--managed-routing <true|false> " +
  "[--execution-preflight <json-path> | --execution-preflight-json <json>]\n" +
  "   or: task-artifacts.mjs public-release --tasks-root <path> " +
  "--invocation '$kyw-deliver NNNN' " +
  "--managed-routing <true|false>";

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

async function settledPublicReleaseRead(method, tuple, readContext) {
  try {
    return { value: await method(tuple, readContext) };
  } catch (error) {
    return { error: redactPublicReleaseDiagnostics(error) };
  }
}

async function readPublicReleaseSnapshot(tuple, clients) {
  const readContext = Object.freeze({
    fresh: true,
    cacheBypass: true,
    purpose: "ADAPTER_PREFLIGHT",
    sequence: 1,
  });
  const [workflow, npm, tag, release] = await Promise.all([
    settledPublicReleaseRead(clients?.readWorkflowRuns, tuple, readContext),
    settledPublicReleaseRead(clients?.readNpmVersion, tuple, readContext),
    settledPublicReleaseRead(clients?.readTag, tuple, readContext),
    settledPublicReleaseRead(clients?.readRelease, tuple, readContext),
  ]);
  return Object.freeze({
    snapshot: Object.freeze({
      workflow: workflow.value,
      npm: npm.value,
      tag: tag.value,
      release: release.value,
      readContext,
    }),
    readErrors: Object.freeze({
      ...(workflow.error ? { workflow: workflow.error } : {}),
      ...(npm.error ? { npm: npm.error } : {}),
      ...(tag.error ? { tag: tag.error } : {}),
      ...(release.error ? { release: release.error } : {}),
    }),
  });
}

function publicReleaseHydrationBlocked(command, result, error, hydrationDiagnostics) {
  const diagnostics = redactPublicReleaseDiagnostics(error);
  const code = /^[A-Z][A-Z0-9_]{0,79}$/u.test(error?.code ?? "")
    ? error.code
    : "PUBLIC_RELEASE_HYDRATION_FAILED";
  const rawMessage = String(error?.message ?? "");
  const classification =
    code === "PUBLIC_RELEASE_EXTERNAL_FAILURE" ||
    code === "PUBLIC_RELEASE_RESPONSE_BOUND_EXCEEDED" ||
    /\b(?:unavailable|unreadable|malformed|ambiguous|timeout|permission|authentication|network|parse|invalid json|exceeds? (?:its )?(?:byte|response) bound)\b/iu.test(
      rawMessage,
    )
      ? "UNKNOWN"
      : /\b(?:mismatch|changed|drift|conflict|violat\w*|forbidden|duplicate|already exists|does not match|does not retain|not (?:the )?(?:expected|exact)|must (?:remain|equal|match))\b/iu.test(
            rawMessage,
          )
        ? "CONFLICT"
        : "UNKNOWN";
  return Object.freeze({
    command,
    ...result,
    outcome: "BLOCKED",
    code,
    publicReleaseState: "BLOCKED",
    publicReleaseNextStage: "NPM",
    classification,
    publicWriteAuthorized: false,
    mutationRequired: false,
    completedStage: "STANDARD_FINAL",
    blockingStage: "NPM",
    resumePoint: "NPM",
    recoveryCondition:
      "Restore fresh canonical STANDARD and public-release identity reads before resuming.",
    publicReleaseDiagnostics: diagnostics,
    ...(hydrationDiagnostics ? { hydration: hydrationDiagnostics } : {}),
  });
}

export function formatTaskArtifactCliError(error, command) {
  const rawCode = typeof error?.code === "string" ? error.code : "TASK_ADAPTER_FAILED";
  const code =
    command === "public-release" && !/^[A-Z][A-Z0-9_]{0,79}$/u.test(rawCode)
      ? "PUBLIC_RELEASE_FAILED"
      : rawCode;
  const rawMessage = error instanceof Error ? error.message : String(error);
  if (command !== "public-release") return { code, message: rawMessage };
  const redacted = redactPublicReleaseDiagnostics({ message: rawMessage });
  return {
    code,
    message:
      typeof redacted?.message === "string"
        ? redacted.message
        : "Public release failed without canonical proof.",
  };
}

function publicReleaseDispatchResult({
  command,
  result,
  context,
  plan,
  snapshot,
  readErrors,
  hydrationDiagnostics,
}) {
  const ready = plan.outcome === "READY";
  const nextStage = plan.nextStage ?? plan.resumePoint ?? null;
  const publicWriteAuthorized =
    ready &&
    plan.mutationRequired === true &&
    ["NPM", "TAG", "RELEASE"].includes(nextStage) &&
    (nextStage !== "NPM" ||
      snapshot.workflow?.baseHeadSha === context.tuple.target.mergeSha);
  return Object.freeze({
    command,
    ...result,
    outcome: ready ? result.outcome : "BLOCKED",
    ...(ready ? {} : { code: plan.code }),
    publicReleaseState: plan.outcome,
    publicReleaseNextStage: nextStage,
    ...(plan.classification ? { classification: plan.classification } : {}),
    publicWriteAuthorized,
    mutationRequired: plan.mutationRequired,
    publicReleaseTuple: context.tuple,
    publicReleasePlan: plan,
    ...(Object.keys(readErrors).length > 0
      ? { publicReleaseReadErrors: readErrors }
      : {}),
    ...(context.diagnostics
      ? { publicReleaseHydration: context.diagnostics }
      : {}),
    ...(hydrationDiagnostics ? { hydration: hydrationDiagnostics } : {}),
  });
}

export async function runTaskArtifactCommand(argv, runtime = {}) {
  const [command, ...args] = argv;
  const hydrateDeliveries =
    runtime.hydratePriorStandardDeliveries ?? hydratePriorStandardDeliveries;
  const dispatchTask = runtime.resolveTaskDispatch ?? resolveTaskDispatch;
  const bootstrapContinuity =
    runtime.bootstrapStandardDeliveryContinuity ??
    bootstrapStandardDeliveryContinuity;
  const applyContinuity =
    runtime.applyStandardDeliveryContinuityTransition ??
    applyStandardDeliveryContinuityTransition;
  const hydratePublicContext =
    runtime.hydratePublicReleaseContext ?? hydratePublicReleaseContext;
  const derivePublicPlan =
    runtime.derivePublicReleasePlan ?? derivePublicReleasePlan;
  const runAuthorizedPublicRelease =
    runtime.runPublicRelease ?? runPublicRelease;

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

  if (command === "dispatch" || command === "public-release") {
    const options = parseOptions(
      args,
      ["--tasks-root", "--invocation", "--managed-routing"],
      command === "dispatch"
        ? [
            "--delivery-ledger",
            "--delivery-ledger-json",
            "--delivery-expectations",
            "--delivery-expectations-json",
            "--execution-preflight",
            "--execution-preflight-json",
          ]
        : [],
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
    if (
      command === "public-release" &&
      (!parsedInvocation?.recognized ||
        parsedInvocation.route !== "DELIVERY" ||
        parsedInvocation.mode !== "EXACT" ||
        parsedInvocation.source !== "PORTABLE_SKILL")
    ) {
      throw new TaskArtifactError(
        "PUBLIC_RELEASE_EXACT_INVOCATION_REQUIRED",
        "public-release requires exactly $kyw-deliver NNNN",
      );
    }
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
    if (
      manualDeliveryInput &&
      (result.deliveryMode === "PUBLIC_RELEASE" ||
        result.action === "PUBLIC_RELEASE")
    ) {
      throw new TaskArtifactError(
        "PUBLIC_RELEASE_CANONICAL_HYDRATION_REQUIRED",
        "public-release does not accept caller-supplied STANDARD ledger or expectation JSON",
      );
    }
    if (
      command === "public-release" &&
      (result.outcome !== "SELECTED" || result.action !== "PUBLIC_RELEASE")
    ) {
      throw new TaskArtifactError(
        "PUBLIC_RELEASE_STANDARD_FINAL_REQUIRED",
        "public-release requires a fresh contract-4 STANDARD FINAL result from exact $kyw-deliver NNNN dispatch",
      );
    }
    const selectedDelivery =
      parsedInvocation.route === "DELIVERY" &&
      result.outcome === "SELECTED" &&
      result.action === "DELIVER";
    if (
      selectedDelivery &&
      (!/^\d{4}$/u.test(result.task?.id ?? "") ||
        result.task.id !== parsedInvocation.taskId ||
        result.task.taskStatus !== "DONE" ||
        result.task.testStatus !== "PASSED" ||
        result.task.deliveryRequirement?.kind !== "STANDARD")
    ) {
      throw new TaskArtifactError(
        "INVALID_DELIVERY_SELECTION",
        "selected delivery result is missing its exact terminal STANDARD identity",
      );
    }
    if (selectedDelivery && preparedCheckpoint !== undefined) {
      await applyContinuity({
        tasksRoot,
        selectedTaskId: result.task.id,
        preparedCheckpoint,
        commandRunner: runtime.commandRunner,
        queueInspector: runtime.queueInspector,
        githubClient: runtime.githubClient,
      });
    }
    const baseResult = {
      command,
      ...result,
      ...(hydrationDiagnostics ? { hydration: hydrationDiagnostics } : {}),
    };
    if (
      result.outcome !== "SELECTED" ||
      result.action !== "PUBLIC_RELEASE"
    ) {
      return baseResult;
    }

    let publicContext;
    try {
      publicContext = await hydratePublicContext({
        tasksRoot,
        taskId: parsedInvocation.taskId,
        deliveryLedger,
        deliveryExpectations,
        commandRunner: runtime.commandRunner,
        fetchImpl: runtime.fetchImpl,
        provenanceVerifier: runtime.provenanceVerifier,
        clients: runtime.publicReleaseClients,
      });
    } catch (error) {
      return publicReleaseHydrationBlocked(
        command,
        result,
        error,
        hydrationDiagnostics,
      );
    }
    const { snapshot, readErrors } = await readPublicReleaseSnapshot(
      publicContext.tuple,
      publicContext.clients,
    );
    const publicPlan = derivePublicPlan({
      standardDelivery: publicContext.standardDelivery,
      tuple: publicContext.tuple,
      snapshot,
    });
    const dispatched = publicReleaseDispatchResult({
      command,
      result,
      context: publicContext,
      plan: publicPlan,
      snapshot,
      readErrors,
      hydrationDiagnostics,
    });
    if (
      command !== "public-release" ||
      !["READY", "OBSERVE"].includes(publicPlan.outcome)
    ) {
      return dispatched;
    }

    let publicResult;
    try {
      publicResult = await runAuthorizedPublicRelease({
        standardDelivery: publicContext.standardDelivery,
        tuple: publicContext.tuple,
        clients: publicContext.clients,
        reconciliationReads: runtime.reconciliationReads,
      });
    } catch (error) {
      return Object.freeze({
        ...dispatched,
        outcome: "BLOCKED",
        code: "PUBLIC_RELEASE_RUNNER_FAILED",
        publicReleaseState: "BLOCKED",
        publicReleaseNextStage: publicPlan.nextStage ?? publicPlan.resumePoint,
        classification: "UNKNOWN",
        publicWriteAuthorized: false,
        mutationRequired: false,
        completedStage: publicPlan.completedStage,
        blockingStage: publicPlan.nextStage ?? publicPlan.resumePoint,
        resumePoint: publicPlan.nextStage ?? publicPlan.resumePoint,
        recoveryCondition:
          "Restore the canonical public-release runner boundary and resume without retrying an ambiguous mutator.",
        publicReleaseDiagnostics: redactPublicReleaseDiagnostics(error),
      });
    }
    return Object.freeze({
      ...dispatched,
      outcome: publicResult.outcome,
      code: publicResult.code,
      publicReleaseState: publicResult.outcome,
      publicReleaseNextStage: publicResult.resumePoint ?? null,
      ...(publicResult.classification
        ? { classification: publicResult.classification }
        : {}),
      publicWriteAuthorized: false,
      mutationRequired: false,
      publicReleaseResult: publicResult,
    });
  }

  throw new TaskArtifactError(
    "INVALID_TASK_ADAPTER_ARGUMENTS",
    `Expected create, create-batch, inspect-transaction, recover-transaction, validate, bootstrap-continuity, dispatch, or public-release, received ${command ?? "<missing>"}\n${usage}`,
  );
}

async function main() {
  try {
    const result = await runTaskArtifactCommand(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const { code, message } = formatTaskArtifactCliError(error, process.argv[2]);
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
