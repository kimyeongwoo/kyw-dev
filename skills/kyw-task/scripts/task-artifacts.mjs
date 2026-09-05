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

const [shared, creation, contract, queue, delivery, publicRelease] = await Promise.all([
  import(new URL("task-artifact-shared.mjs", coreUrl)),
  import(new URL("task-artifact-creation.mjs", coreUrl)),
  import(new URL("task-artifact-contract.mjs", coreUrl)),
  import(new URL("task-artifact-queue.mjs", coreUrl)),
  import(new URL("task-artifact-delivery.mjs", coreUrl)),
  import(new URL("task-artifact-public-release.mjs", coreUrl)),
]);
const { MAX_TASK_BATCH_PAYLOAD_BYTES, TaskArtifactError } = shared;
const { createTaskArtifactBatch, createTaskArtifacts, inspectTaskBatchTransaction, recoverTaskBatchTransaction } = creation;
const { validateTaskDirectory } = contract;
const { resolveTaskDispatch } = queue;
const { parseTaskInvocation } = delivery;
const { derivePublicReleasePlan, redactPublicReleaseDiagnostics, runPublicRelease } = publicRelease;
const loadExternalEvidence = () => import(new URL("task-artifact-hydration.mjs", coreUrl));

const usage =
  "Usage: task-artifacts.mjs check-pr --repository <owner/name> --pr <number> --sha <sha> --base <branch> --base-sha <sha> [--repository-root <path>]\n" +
  "   or: task-artifacts.mjs merge-pr --repository <owner/name> --pr <number> --sha <sha> --base <branch> --base-sha <sha> --invocation '$kyw-deliver [NNNN] --merge' [--method <merge|squash|rebase>] [--repository-root <path>]\n" +
  "Usage: task-artifacts.mjs check-ci --repository <owner/name> --sha <sha> [--branch <branch> --event <push|pull_request> --head-repository <owner/name>]\n" +
  "Usage: task-artifacts.mjs create --tasks-root <path> --title <title>\n" +
  "   or: task-artifacts.mjs create-batch --tasks-root <path> " +
  "(--batch-json <json> | --batch-file <path>)\n" +
  "   or: task-artifacts.mjs inspect-transaction --tasks-root <path>\n" +
  "   or: task-artifacts.mjs recover-transaction --tasks-root <path>\n" +
  "   or: task-artifacts.mjs validate --task-directory <path>\n" +
  "   or: task-artifacts.mjs bootstrap-continuity --tasks-root <path> " +
  "--invocation <text> --managed-routing <true|false> " +
  "--migration-authority EXPLICIT_REBASELINE\n" +
  "   or: task-artifacts.mjs dispatch --invocation <text> " +
  "[--repository-root <path>] [--tasks-root <path>] [--managed-routing <true|false>] " +
  "[--execution-preflight <json-path> | --execution-preflight-json <json>]\n" +
  "   or: task-artifacts.mjs public-release [--repository-root <path>] " +
  "--invocation '$kyw-deliver --release <version> --sha <sha>' " +
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
  const dispatchTask = runtime.resolveTaskDispatch ?? resolveTaskDispatch;
  const derivePublicPlan =
    runtime.derivePublicReleasePlan ?? derivePublicReleasePlan;
  const runAuthorizedPublicRelease =
    runtime.runPublicRelease ?? runPublicRelease;

  if (command === "create") {
    const options = parseOptions(args, ["--tasks-root", "--title"], ["--detailed-tests"]);
    if (options.has("--detailed-tests") && !["true", "false"].includes(options.get("--detailed-tests"))) throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", "--detailed-tests must be true or false");
    const created = await createTaskArtifacts({
      tasksRoot: resolve(options.get("--tasks-root")),
      title: options.get("--title"),
      detailedTests: options.get("--detailed-tests") === "true",
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
    const bootstrapContinuity = runtime.bootstrapStandardDeliveryContinuity ?? (await loadExternalEvidence()).bootstrapStandardDeliveryContinuity;
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

  if (command === "check-pr" || command === "merge-pr") {
    const options = parseOptions(args,
      ["--repository", "--pr", "--sha", "--base", "--base-sha", ...(command === "merge-pr" ? ["--invocation"] : [])],
      ["--repository-root", ...(command === "merge-pr" ? ["--method"] : [])],
    );
    if (!/^[1-9]\d*$/u.test(options.get("--pr"))) throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", "--pr must be a positive decimal PR number");
    const { inspectPullRequest, mergePullRequest } = await import(new URL("pr-merge.mjs", coreUrl));
    const target = {
      repositoryRoot: resolve(options.get("--repository-root") ?? process.cwd()),
      repository: options.get("--repository"), prNumber: Number(options.get("--pr")),
      headSha: options.get("--sha"), baseBranch: options.get("--base"), baseSha: options.get("--base-sha"),
      invocation: options.get("--invocation"), mergeMethod: options.get("--method"),
      commandRunner: runtime.commandRunner,
    };
    return { command, ...await (command === "check-pr" ? inspectPullRequest(target) : mergePullRequest(target)) };
  }

  // Compatibility command for kyw-dev's dedicated publication contract. It is
  // deliberately separate from the target project's ordinary PR merge policy.
  if (command === "check-ci") {
    const options = parseOptions(args, ["--repository", "--sha"], ["--repository-root", "--branch", "--event", "--head-repository"]);
    const repositoryRoot = resolve(options.get("--repository-root") ?? process.cwd());
    const { requireCanonicalCi } = await import(new URL("ci-evidence.mjs", coreUrl));
    const read = runtime.readCi ?? (async (apiPath) => {
      const request = { command: "gh", args: ["api", "--hostname", "github.com", "--method", "GET", apiPath], cwd: repositoryRoot, timeoutMs: 30_000, maxBuffer: 2 * 1024 * 1024 };
      let stdout;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        let response;
        try {
          if (runtime.commandRunner) response = await runtime.commandRunner(request);
          else {
            const { execFile } = await import("node:child_process");
            response = await new Promise((accept) => execFile(request.command, request.args, {
              cwd: request.cwd, timeout: request.timeoutMs, maxBuffer: request.maxBuffer, encoding: "utf8", windowsHide: true,
            }, (error, output, stderr) => accept({ status: error ? 1 : 0, stdout: output, stderr, error })));
          }
        } catch (error) { response = { status: 1, error, stderr: error?.stderr }; }
        if (response?.status === 0) { stdout = response.stdout; break; }
        const httpStatus = /\bHTTP(?:\/\d(?:\.\d)?)?\s+(\d{3})\b/i.exec(String(response?.stderr ?? response?.error?.message ?? ""))?.[1];
        const transient = httpStatus
          ? [408, 429, 500, 502, 503, 504].includes(Number(httpStatus))
          : ["ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ENETUNREACH"].includes(response?.error?.code);
        if (!transient || attempt === 3) throw new TaskArtifactError("CI_READ_FAILED", "Canonical CI API read failed");
        const delay = runtime.delay ?? ((milliseconds) => new Promise((accept) => setTimeout(accept, milliseconds)));
        await delay(attempt * 100);
      }
      if (Buffer.byteLength(stdout ?? "", "utf8") > request.maxBuffer) throw new TaskArtifactError("CI_READ_FAILED", "Canonical CI response exceeds its bound");
      try { return JSON.parse(stdout); } catch { throw new TaskArtifactError("CI_READ_FAILED", "Canonical CI API returned malformed JSON"); }
    });
    const proof = await requireCanonicalCi({ read, repositoryFullName: options.get("--repository"), sha: options.get("--sha"), branch: options.get("--branch") ?? "main", event: options.get("--event") ?? "push", expectedHeadRepository: options.get("--head-repository") });
    return { command, valid: true, proof };
  }

  if (command === "dispatch" || command === "public-release") {
    const options = parseOptions(args, ["--invocation"], [
      "--tasks-root", "--repository-root", "--managed-routing", "--execution-preflight", "--execution-preflight-json",
    ]);
    const managedRoutingValue = options.get("--managed-routing") ?? "false";
    if (!["true", "false"].includes(managedRoutingValue)) throw new TaskArtifactError("INVALID_TASK_ADAPTER_ARGUMENTS", "--managed-routing must be true or false");
    const invocation = options.get("--invocation");
    const parsedInvocation = parseTaskInvocation(invocation, { managedRoutingAvailable: managedRoutingValue === "true" });
    if (command === "public-release" && parsedInvocation.action !== "PUBLIC_RELEASE") {
      throw new TaskArtifactError("PUBLIC_RELEASE_EXACT_INVOCATION_REQUIRED", "public-release requires $kyw-deliver --release <version> --sha <sha>");
    }
    const repositoryRoot = resolve(options.get("--repository-root") ?? (options.get("--tasks-root") ? resolve(options.get("--tasks-root"), "../..") : process.cwd()));
    const tasksRoot = resolve(options.get("--tasks-root") ?? resolve(repositoryRoot, "docs/tasks"));
    const executionPreflight = await readJsonObjectOption(options, {
      pathOption: "--execution-preflight", jsonOption: "--execution-preflight-json",
      label: "execution preflight", errorCode: "INVALID_EXECUTION_PREFLIGHT",
    });
    const result = await dispatchTask({ tasksRoot, invocation, parsedInvocation, executionPreflight });
    if (result.outcome !== "SELECTED" || result.action !== "PUBLIC_RELEASE") return { command, ...result };
    let publicContext;
    try {
      const hydratePublicContext = runtime.hydratePublicReleaseContext ?? (await loadExternalEvidence()).hydratePublicReleaseContext;
      publicContext = await hydratePublicContext({
        repositoryRoot, releaseVersion: parsedInvocation.releaseVersion, releaseSha: parsedInvocation.releaseSha,
        commandRunner: runtime.commandRunner, fetchImpl: runtime.fetchImpl,
        provenanceVerifier: runtime.provenanceVerifier, clients: runtime.publicReleaseClients,
      });
    } catch (error) { return publicReleaseHydrationBlocked(command, result, error); }
    const { snapshot, readErrors } = await readPublicReleaseSnapshot(publicContext.tuple, publicContext.clients);
    const publicPlan = derivePublicPlan({ standardDelivery: publicContext.standardDelivery, tuple: publicContext.tuple, snapshot });
    const dispatched = publicReleaseDispatchResult({ command, result, context: publicContext, plan: publicPlan, snapshot, readErrors });
    if (command !== "public-release" || !["READY", "OBSERVE"].includes(publicPlan.outcome)) return dispatched;
    try {
      const publicResult = await runAuthorizedPublicRelease({
        invocation, standardDelivery: publicContext.standardDelivery, tuple: publicContext.tuple,
        clients: publicContext.clients, reconciliationReads: runtime.reconciliationReads,
      });
      return { ...dispatched, outcome: publicResult.outcome, code: publicResult.code,
        publicReleaseState: publicResult.outcome, publicReleaseNextStage: publicResult.resumePoint ?? null,
        publicWriteAuthorized: false, mutationRequired: false, publicReleaseResult: publicResult };
    } catch (error) { return publicReleaseHydrationBlocked(command, result, error); }
  }

  throw new TaskArtifactError(
    "INVALID_TASK_ADAPTER_ARGUMENTS",
    `Expected create, create-batch, inspect-transaction, recover-transaction, validate, bootstrap-continuity, check-pr, merge-pr, check-ci, dispatch, or public-release, received ${command ?? "<missing>"}\n${usage}`,
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
