#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isReasoningEffortToken } from "./evaluator-configuration.mjs";

import {
  DEFAULT_RESULTS_ROOT,
  EvaluationError,
  loadEvaluationDefinition,
  resultSummary,
  runComparison,
  runEvaluation,
  writeBenchmarkReport,
} from "./grilling-eval/core.mjs";

const HELP = `kyw-grilling model evaluation harness

Usage:
  node ./scripts/grilling-eval.mjs smoke --allow-model --variant <kyw|upstream> --scenario <id> --model <model> --reasoning-effort <effort> [auth]
  node ./scripts/grilling-eval.mjs compare --allow-model --scenario <id|all> --model <model> --reasoning-effort <effort> --runs <1-10> [auth]
  node ./scripts/grilling-eval.mjs report --comparison <comparison-directory> [--benchmark <file>]

Auth (choose at most one):
  --auth-file <path>       Copy an explicitly named auth.json into temporary CODEX_HOME.
  --use-env-api-key        Pass CODEX_API_KEY only to each codex exec process.

Other options:
  --output <directory>     Result root (default: eval/grilling/results).
  --reasoning-effort <token>
                           Letters/digits followed by letters/digits/_/-; passed unchanged.
                           Syntax acceptance does not prove model support; Codex decides support.
  --comparison <directory> Completed comparison directory (report only).
  --benchmark <file>       Use this exact benchmark file (report only).
                           Omitted: benchmark.v11.json, the historical fixed Luna/high experiment.
                           Explicit relative comparison/benchmark paths resolve from current cwd.
  -h, --help               Print this help without running a model.

Every model-backed command requires --allow-model. The runner uses a temporary Git repository,
temporary HOME and CODEX_HOME, one explicit Skill variant, read-only sandboxing, JSONL capture,
and explicit thread-ID resume. Failed capability or auth checks publish no result artifact.
New results record requested configuration and its CLI/direct-call source. Observed configuration
and server execution remain UNAVAILABLE with null values; requested matches are not server proof.
No model or effort fallback is attempted when Codex rejects a setting.`;

function fail(message) {
  throw new EvaluationError("INVALID_ARGUMENT", message);
}

export function parseArguments(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) return { help: true };
  const command = argv[0];
  if (!["smoke", "compare", "report"].includes(command)) fail(`Unknown command: ${command}`);
  const values = {};
  const booleans = new Set(["--allow-model", "--use-env-api-key"]);
  const valueOptions = new Set([
    "--variant",
    "--scenario",
    "--model",
    "--reasoning-effort",
    "--runs",
    "--auth-file",
    "--output",
    "--comparison",
    "--benchmark",
  ]);
  for (let index = 1; index < argv.length; index += 1) {
    const option = argv[index];
    if (booleans.has(option)) {
      if (values[option] !== undefined) fail(`${option} may appear only once`);
      values[option] = true;
      continue;
    }
    if (!valueOptions.has(option)) fail(`Unknown option: ${option}`);
    if (values[option] !== undefined) fail(`${option} may appear only once`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`${option} requires a value`);
    values[option] = value;
    index += 1;
  }
  if (command === "report") {
    const allowed = new Set(["--comparison", "--benchmark"]);
    for (const option of Object.keys(values)) {
      if (!allowed.has(option)) fail(`report does not accept ${option}`);
    }
    if (!values["--comparison"]) fail("report requires --comparison");
    return {
      command,
      comparisonDirectory: resolve(values["--comparison"]),
      benchmarkPath: values["--benchmark"] === undefined ? undefined : resolve(values["--benchmark"]),
    };
  }

  for (const option of ["--comparison", "--benchmark"]) {
    if (values[option] !== undefined) fail(`${option} is valid only for report`);
  }

  if (!values["--allow-model"]) fail("Model execution requires the explicit --allow-model flag");
  if (!values["--scenario"]) fail("--scenario is required");
  if (!values["--model"]) fail("--model is required so results record the requested model");
  if (!values["--reasoning-effort"]) {
    fail("--reasoning-effort is required so results record the requested configuration");
  }
  if (!isReasoningEffortToken(values["--reasoning-effort"])) {
    fail("--reasoning-effort must be a nonempty token: letters/digits followed by letters/digits/_/-");
  }
  if (values["--auth-file"] && values["--use-env-api-key"]) {
    fail("Use either --auth-file or --use-env-api-key, not both");
  }
  const outputRoot = resolve(values["--output"] ?? DEFAULT_RESULTS_ROOT);
  if (command === "smoke") {
    if (!["kyw", "upstream"].includes(values["--variant"])) {
      fail("smoke requires --variant kyw or --variant upstream");
    }
    if (values["--runs"] !== undefined) fail("--runs is valid only for compare");
    if (values["--scenario"] === "all") fail("smoke requires one scenario ID, not all");
  } else {
    if (values["--variant"] !== undefined) fail("compare always runs both variants; omit --variant");
    if (values["--runs"] === undefined) fail("compare requires an explicit --runs value");
    const runs = Number(values["--runs"]);
    if (!Number.isInteger(runs) || runs < 1 || runs > 10) fail("--runs must be an integer from 1 through 10");
  }
  return {
    command,
    variant: values["--variant"],
    scenario: values["--scenario"],
    model: values["--model"],
    reasoningEffort: values["--reasoning-effort"],
    configurationSource: "cli",
    runs: values["--runs"] === undefined ? undefined : Number(values["--runs"]),
    authFile: values["--auth-file"],
    useEnvApiKey: values["--use-env-api-key"] === true,
    outputRoot,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (options.command === "report") {
    const report = writeBenchmarkReport(options.comparisonDirectory, { benchmarkPath: options.benchmarkPath });
    console.log(
      JSON.stringify({
        reportPath: report.reportPath,
        reportSha256: report.reportSha256,
        gateResult: report.report.gateResult,
      }),
    );
    return;
  }
  if (options.command === "smoke") {
    const completed = await runEvaluation(options);
    console.log(JSON.stringify({ resultDirectory: completed.resultDirectory, ...resultSummary(completed.result) }));
    return;
  }

  const definition = loadEvaluationDefinition();
  const scenarios =
    options.scenario === "all" ? [...definition.scenarios.keys()] : [options.scenario];
  for (const scenario of scenarios) {
    if (!definition.scenarios.has(scenario)) fail(`Unknown scenario: ${scenario}`);
  }
  const comparison = await runComparison({ ...options, scenarios });
  console.log(
    JSON.stringify({
      comparisonDirectory: comparison.comparisonDirectory,
      runCount: comparison.runs.length,
      comparisonId: comparison.comparison.comparisonId,
    }),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => {
  const code = error instanceof EvaluationError ? error.code : "UNEXPECTED_ERROR";
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${code}: ${message}`);
  console.error("No incomplete comparison or failed-run result artifact was published.");
  process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
});
