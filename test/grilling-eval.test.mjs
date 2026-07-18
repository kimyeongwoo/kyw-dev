import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BENCHMARK_THRESHOLDS,
  EvaluationError,
  gradeRun,
  loadEvaluationDefinition,
  parseJsonl,
  preflightCodex,
  redactText,
  runComparison,
  runEvaluation,
  scanSensitiveText,
  sha256File,
  validateResult,
  writeBenchmarkReport,
} from "../scripts/grilling-eval/core.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FAKE_CODEX = join(REPOSITORY_ROOT, "test", "fixtures", "grilling-eval", "fake-codex.mjs");
const CLI = join(REPOSITORY_ROOT, "scripts", "grilling-eval.mjs");
const FAKE_LAUNCHER = { command: process.execPath, prefixArgs: [FAKE_CODEX] };

function temporaryDirectory(t, prefix) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function eventTurn(message, threadId = "11111111-2222-4333-8444-555555555555") {
  return {
    finalMessage: message,
    events: [
      { type: "thread.started", thread_id: threadId },
      { type: "item.completed", item: { type: "agent_message", text: message } },
      {
        type: "turn.completed",
        usage: {
          input_tokens: 100,
          cached_input_tokens: 50,
          output_tokens: 25,
          reasoning_output_tokens: 5,
        },
      },
    ],
    usage: {
      input_tokens: 100,
      cached_input_tokens: 50,
      output_tokens: 25,
      reasoning_output_tokens: 5,
    },
  };
}

test("pinned upstream baseline, rubric, schemas, and eight scenarios validate offline", () => {
  const definition = loadEvaluationDefinition();
  assert.equal(definition.baseline.commit, "9603c1cc8118d08bc1b3bf34cf714f62178dea3b");
  assert.equal(definition.baseline.sourcePath, "skills/productivity/grilling/SKILL.md");
  assert.equal(definition.baseline.sha256, "44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587");
  assert.equal(
    sha256File(join(REPOSITORY_ROOT, definition.baseline.vendoredPath)),
    definition.baseline.sha256,
  );
  assert.equal(
    sha256File(join(REPOSITORY_ROOT, definition.baseline.license.licensePath)),
    definition.baseline.license.sha256,
  );
  assert.equal(
    sha256File(join(REPOSITORY_ROOT, "skills", "kyw-grilling", "SKILL.md")),
    "99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf",
    "Task 0017 kyw-grilling bytes must remain explicit and reviewable",
  );
  const notice = readFileSync(join(REPOSITORY_ROOT, "THIRD_PARTY_NOTICES.md"), "utf8");
  assert.match(notice, new RegExp(definition.baseline.commit));
  assert.match(notice, new RegExp(definition.baseline.sourcePath.replaceAll("/", "\\/")));
  assert.match(notice, new RegExp(definition.baseline.sha256));
  assert.equal(definition.rubric.frozenBeforeModelRuns, true);
  assert.equal(
    definition.rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0),
    100,
  );
  assert.equal(definition.scenarios.size, 8);
  assert.deepEqual(
    new Set([...definition.scenarios.values()].map((scenario) => scenario.category)),
    new Set([
      "greenfield-discovery",
      "existing-code-facts",
      "conflicting-requirements",
      "migration",
      "multi-layer-feature",
      "oversized-request",
      "uncertain-user",
      "pressure-to-code",
    ]),
  );
  for (const schemaName of [
    "scenario.schema.v1.json",
    "result.schema.v1.json",
    "result.schema.v2.json",
    "result.schema.v3.json",
  ]) {
    const schema = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "eval", "grilling", schemaName), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.type, "object");
  }
});

test("Task 0017 benchmark v10 preserves every frozen v9 condition except the expected kyw Skill hash", () => {
  const evalRoot = join(REPOSITORY_ROOT, "eval", "grilling");
  const benchmarkV9 = JSON.parse(readFileSync(join(evalRoot, "benchmark.v9.json"), "utf8"));
  const benchmarkV10 = JSON.parse(readFileSync(join(evalRoot, "benchmark.v10.json"), "utf8"));
  const skillSha256 = sha256File(join(REPOSITORY_ROOT, "skills", "kyw-grilling", "SKILL.md"));

  assert.equal(skillSha256, "99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf");
  assert.equal(benchmarkV10.kywSkillSha256ForScoredRun, skillSha256);
  assert.notEqual(benchmarkV9.kywSkillSha256ForScoredRun, benchmarkV10.kywSkillSha256ForScoredRun);

  const frozenV9 = { ...benchmarkV9 };
  const frozenV10 = { ...benchmarkV10 };
  delete frozenV9.kywSkillSha256ForScoredRun;
  delete frozenV10.kywSkillSha256ForScoredRun;
  assert.deepEqual(frozenV10, frozenV9);
  assert.match(
    readFileSync(join(REPOSITORY_ROOT, "scripts", "grilling-eval", "core.mjs"), "utf8"),
    /benchmark\.v10\.json/,
  );
});

test("scenario fixtures contain facts, dependency-ordered decisions, replies, and critical expectations", () => {
  const { scenarios } = loadEvaluationDefinition();
  for (const scenario of scenarios.values()) {
    assert.ok(scenario.repository.files.length >= 1, scenario.id);
    assert.ok(scenario.repositoryFacts.length >= 1, scenario.id);
    assert.ok(scenario.unresolvedDecisions.length >= 2, scenario.id);
    assert.ok(scenario.scriptedUserReplies.length >= 1, scenario.id);
    assert.ok(scenario.expectedCriticalBehaviors.required.includes("one_question_per_turn"), scenario.id);
    assert.ok(scenario.expectedCriticalBehaviors.required.includes("recommendation_per_question"), scenario.id);
    assert.equal(
      scenario.scriptedUserReplies.at(-1).afterAssistantTurn + 1 <= scenario.budgets.maxAssistantTurns,
      true,
      scenario.id,
    );
  }
});

test("JSONL parser captures one thread, assistant messages, and usage", () => {
  const message = "Question: Which scope?\nRecommendation: Use tenant scope.";
  const lines = [
    { type: "thread.started", thread_id: "11111111-2222-4333-8444-555555555555" },
    { type: "turn.started" },
    { type: "item.completed", item: { type: "agent_message", text: message } },
    {
      type: "turn.completed",
      usage: {
        input_tokens: 120,
        cached_input_tokens: 20,
        output_tokens: 30,
        reasoning_output_tokens: 4,
      },
    },
  ];
  const parsed = parseJsonl(`${lines.map((line) => JSON.stringify(line)).join("\n")}\n`);
  assert.equal(parsed.threadId, "11111111-2222-4333-8444-555555555555");
  assert.deepEqual(parsed.agentMessages, [message]);
  assert.equal(parsed.usage.output_tokens, 30);
  assert.throws(() => parseJsonl("not-json\n"), (error) => error.code === "INVALID_CODEX_OUTPUT");
  assert.throws(
    () => parseJsonl(`${JSON.stringify({ type: "thread.started", thread_id: "one" })}\n`),
    (error) => error.code === "INVALID_CODEX_OUTPUT",
  );
});

test("rubric grading is deterministic for compliant and violating transcripts", () => {
  const definition = loadEvaluationDefinition();
  const scenario = definition.scenarios.get("existing-code-facts");
  const compliantTurns = [
    eventTurn(
      "Question: What idempotency key and duplicate scope should define a submission?\nRecommendation: Scope it to tenant and endpoint.",
    ),
    eventTurn(
      "Question: What duplicate response should return the same job?\nRecommendation: Reuse the original 202 response.",
    ),
    eventTurn(
      "Question: How long should the idempotency record retention window last?\nRecommendation: Use 24 hours.",
    ),
    eventTurn(
      "Question: May a failed job retry with the same key?\nRecommendation: Allow a deliberate resubmit after terminal failure.",
    ),
  ];
  const isolation = {
    fixtureUnchanged: true,
    skillInstallCount: 1,
    authSourceUnchanged: null,
  };
  const session = { resumedSameThread: true };
  const grade = gradeRun({ scenario, rubric: definition.rubric, turns: compliantTurns, isolation, session });
  assert.equal(grade.criticalViolations.length, 0);
  assert.equal(grade.totalScore, 100);

  const violatingTurns = [
    eventTurn("Are you using Node? Should I implement now? We have reached a shared understanding."),
  ];
  violatingTurns[0].events.splice(1, 0, {
    type: "item.completed",
    item: { type: "command_execution", command: "Set-Content src/jobs.mjs", status: "completed" },
  });
  const violation = gradeRun({
    scenario,
    rubric: definition.rubric,
    turns: violatingTurns,
    isolation: { fixtureUnchanged: false, skillInstallCount: 2, authSourceUnchanged: false },
    session: { resumedSameThread: false },
  });
  const ids = new Set(violation.criticalViolations.map((entry) => entry.id));
  for (const id of ["CV-01", "CV-02", "CV-03", "CV-04", "CV-05", "CV-06", "CV-08", "CV-10"]) {
    assert.ok(ids.has(id), `missing ${id}`);
  }
  assert.ok(violation.totalScore < grade.totalScore);
});

test("redaction removes exact roots, home paths, API keys, bearer tokens, and JWT-shaped values", () => {
  const fakeSecret = ["secret", "value"].join("-");
  const fakeApiKey = `${["s", "k"].join("")}-${"1234567890abcdef"}`;
  const fakeJwt = ["eyJabcdefghijk", "abcdefghijk", "abcdefghijk"].join(".");
  const raw = [
    "C:\\eval\\repository\\README.md",
    "C:\\Users\\Alice\\.codex\\auth.json",
    `${["OPENAI", "API", "KEY"].join("_")}=${fakeSecret}`,
    fakeApiKey,
    "Bearer abc.def-ghi",
    fakeJwt,
  ].join("\n");
  const redacted = redactText(raw, {
    evalRepository: "C:\\eval\\repository",
    userHome: "C:\\Users\\Alice",
  });
  assert.match(redacted, /<EVAL_REPO>/);
  assert.match(redacted, /<USER_HOME>/);
  assert.ok(!redacted.includes(fakeSecret));
  assert.ok(!redacted.includes(fakeApiKey));
  assert.deepEqual(scanSensitiveText(redacted), []);
});

test("Codex capability preflight fails clearly when the command or resume support is absent", () => {
  assert.throws(
    () => preflightCodex({ launcher: { command: join(tmpdir(), "missing-codex-command"), prefixArgs: [] } }),
    (error) => error instanceof EvaluationError && error.code === "CODEX_UNAVAILABLE",
  );
  const fake = preflightCodex({ launcher: FAKE_LAUNCHER });
  assert.equal(fake.version, "codex-cli 9.9.9-test");
  assert.equal(fake.capabilities.explicitSessionResume, true);
});

test("fake model run uses isolated homes, resumes one thread, redacts JSONL, and leaves the fixture unchanged", async (t) => {
  const root = temporaryDirectory(t, "kyw-grilling-runner-");
  const outputRoot = join(root, "results");
  const authFile = join(root, "auth.json");
  writeFileSync(authFile, "{\"test\":\"not-a-real-credential\"}\n", "utf8");
  const authBefore = sha256File(authFile);
  const completed = await runEvaluation({
    variant: "kyw",
    scenario: "existing-code-facts",
    model: "fake-model",
    reasoningEffort: "high",
    authFile,
    outputRoot,
    launcher: FAKE_LAUNCHER,
  });
  assert.equal(sha256File(authFile), authBefore);
  assert.equal(completed.result.status, "completed");
  assert.equal(completed.result.schemaVersion, 3);
  assert.equal(completed.result.codex.config.reasoningEffort, "high");
  assert.equal(completed.result.turns.length, 4);
  assert.equal(completed.result.session.resumedSameThread, true);
  assert.deepEqual(completed.result.session.resumeThreadIds, [
    completed.result.session.threadId,
    completed.result.session.threadId,
    completed.result.session.threadId,
  ]);
  assert.equal(completed.result.isolation.fixtureUnchanged, true);
  assert.equal(completed.result.isolation.gitStatusClean, true);
  assert.equal(completed.result.isolation.skillInstallCount, 1);
  assert.equal(completed.result.isolation.skillInstallScope, "repository");
  assert.equal(completed.result.isolation.skillSourceRead, true);
  assert.equal(completed.result.isolation.normalUserConfigurationLoaded, false);
  assert.equal(completed.result.isolation.authSourceUnchanged, true);
  assert.equal(completed.result.usage.inputTokens, 410);
  assert.equal(completed.result.usage.outputTokens, 100);
  assert.equal(completed.result.grade.criticalViolations.length, 0);
  assert.equal(readdirSync(completed.resultDirectory).length, 9);

  const runText = readFileSync(join(completed.resultDirectory, "run.json"), "utf8");
  const eventsText = readFileSync(join(completed.resultDirectory, "turn-01.events.jsonl"), "utf8");
  assert.match(eventsText, /<EVAL_REPO>/);
  assert.match(eventsText, /# kyw Grilling/);
  assert.deepEqual(scanSensitiveText(`${runText}\n${eventsText}`), []);
  const parsedResult = validateResult(JSON.parse(runText));
  assert.equal(parsedResult.runId, completed.result.runId);
});

test("missing authentication publishes no result directory", async (t) => {
  const root = temporaryDirectory(t, "kyw-grilling-no-auth-");
  const outputRoot = join(root, "results");
  await assert.rejects(
    runEvaluation({
      variant: "upstream",
      scenario: "greenfield-discovery",
      model: "fake-model",
      reasoningEffort: "high",
      outputRoot,
      launcher: FAKE_LAUNCHER,
      extraEnv: { FAKE_CODEX_AUTH: "missing" },
    }),
    (error) => error instanceof EvaluationError && error.code === "AUTH_UNAVAILABLE",
  );
  assert.equal(existsSync(outputRoot), false);
});

test("missing evaluated Skill read proof publishes no result directory", async (t) => {
  const root = temporaryDirectory(t, "kyw-grilling-no-skill-proof-");
  const outputRoot = join(root, "results");
  await assert.rejects(
    runEvaluation({
      variant: "kyw",
      scenario: "existing-code-facts",
      model: "fake-model",
      reasoningEffort: "high",
      outputRoot,
      launcher: FAKE_LAUNCHER,
      extraEnv: { FAKE_CODEX_SKIP_SKILL_READ: "1" },
    }),
    (error) => error instanceof EvaluationError && error.code === "EVALUATED_SKILL_NOT_LOADED",
  );
  assert.equal(existsSync(outputRoot), false);
});

test("fixture mutation and implementation attempts are captured as critical violations", async (t) => {
  const root = temporaryDirectory(t, "kyw-grilling-mutation-");
  const completed = await runEvaluation({
    variant: "upstream",
    scenario: "existing-code-facts",
    model: "fake-model",
    reasoningEffort: "high",
    outputRoot: join(root, "results"),
    launcher: FAKE_LAUNCHER,
    extraEnv: { FAKE_CODEX_MUTATE: "1" },
  });
  assert.equal(completed.result.status, "completed_with_violations");
  assert.equal(completed.result.isolation.fixtureUnchanged, false);
  const ids = new Set(completed.result.grade.criticalViolations.map((entry) => entry.id));
  assert.ok(ids.has("CV-01"));
  assert.ok(ids.has("CV-05"));
});

test("a resumed turn with a different thread ID is retained as a critical session violation", async (t) => {
  const root = temporaryDirectory(t, "kyw-grilling-thread-");
  const completed = await runEvaluation({
    variant: "kyw",
    scenario: "existing-code-facts",
    model: "fake-model",
    reasoningEffort: "high",
    outputRoot: join(root, "results"),
    launcher: FAKE_LAUNCHER,
    extraEnv: { FAKE_CODEX_WRONG_THREAD: "1" },
  });
  assert.equal(completed.result.status, "completed_with_violations");
  assert.equal(completed.result.session.resumedSameThread, false);
  assert.ok(completed.result.grade.criticalViolations.some((entry) => entry.id === "CV-02"));
});

test("comparison runs both variants and atomically writes a descriptive summary", async (t) => {
  const root = temporaryDirectory(t, "kyw-grilling-comparison-");
  const outputRoot = join(root, "results");
  const completed = await runComparison({
    scenarios: ["existing-code-facts"],
    runs: 1,
    model: "fake-model",
    reasoningEffort: "high",
    outputRoot,
    launcher: FAKE_LAUNCHER,
  });
  assert.equal(completed.runs.length, 2);
  assert.deepEqual(
    completed.runs.map(({ result }) => result.variant.id),
    ["kyw", "upstream"],
  );
  assert.equal(completed.comparison.descriptiveOnly, true);
  assert.equal(completed.comparison.reasoningEffort, "high");
  assert.equal(completed.comparison.byVariant.kyw.runCount, 1);
  assert.equal(completed.comparison.byVariant.upstream.runCount, 1);
  assert.deepEqual(readdirSync(completed.comparisonDirectory), ["comparison.json"]);
  assert.ok(!readdirSync(outputRoot).some((name) => name.startsWith(".staging-")));

  const benchmarkPath = join(root, "benchmark.json");
  writeFileSync(
    benchmarkPath,
    `${JSON.stringify(
      {
        schemaVersion: 2,
        codexVersion: "codex-cli 9.9.9-test",
        model: "fake-model",
        reasoningEffort: "high",
        resultSchemaVersion: 3,
        upstream: {
          commit: "9603c1cc8118d08bc1b3bf34cf714f62178dea3b",
          skillSha256: "44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587",
        },
        kywSkillSha256BeforeBenchmark:
          "8bc7fbc767f57a27f5346abb5e69a76103ddaf5b6209d4bde1ba82a395b8972d",
        scenarioSchemaVersion: 1,
        scenarioSuiteRevision: "379d96eae1f4031e4d6da0b12d4ce583af667832a7ed5fa797435b7a6c19137b",
        scenarioOrder: ["existing-code-facts"],
        rubric: {
          id: "kyw-grilling-rubric-v1",
          sha256: "4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323",
        },
        repetitionsPerVariantScenario: 1,
        expectedRuns: 2,
        expectedAssistantTurns: 8,
        execution: {
          variantOrderWithinScenario: ["kyw", "upstream"],
          runsWithinVariant: "1",
          authMode: "none",
          skillInstallScope: "repository",
          skillSourceReadRequired: true,
          sandbox: "read-only",
          ignoreUserConfig: true,
          ignoreRules: true,
          strictConfig: true,
          shellEnvironmentInherit: "none",
          modelTurnTimeoutMs: 300000,
        },
        primaryTokenMetric:
          "inputTokens + outputTokens (cached input and reasoning output recorded separately, not double-counted)",
        thresholds: BENCHMARK_THRESHOLDS,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const reported = writeBenchmarkReport(completed.comparisonDirectory, { benchmarkPath });
  assert.equal(reported.report.gateResult, "pass");
  assert.equal(reported.report.aggregate.qualityMedianDelta, 0);
  assert.equal(reported.report.aggregate.kyw.medianAssistantTurns, 4);
  assert.equal(reported.report.runs.every((run) => run.artifactCount === 9), true);
  assert.match(reported.reportSha256, /^[0-9a-f]{64}$/);
});

test("model-backed CLI requires explicit opt-in before creating output", (t) => {
  const root = temporaryDirectory(t, "kyw-grilling-cli-opt-in-");
  const outputRoot = join(root, "results");
  const result = spawnSync(
    process.execPath,
    [CLI, "smoke", "--variant", "kyw", "--scenario", "greenfield-discovery", "--model", "fake", "--output", outputRoot],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires the explicit --allow-model flag/);
  assert.equal(existsSync(outputRoot), false);
});

test("package and ignore boundaries keep all eval sources and generated results development-only", () => {
  const packageJson = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "package.json"), "utf8"));
  assert.deepEqual(
    {
      unit: packageJson.scripts["eval:grilling:unit"],
      smoke: packageJson.scripts["eval:grilling:smoke"],
      compare: packageJson.scripts["eval:grilling:compare"],
      report: packageJson.scripts["eval:grilling:report"],
    },
    {
      unit: "node --test test/grilling-eval.test.mjs",
      smoke: "node ./scripts/grilling-eval.mjs smoke",
      compare: "node ./scripts/grilling-eval.mjs compare",
      report: "node ./scripts/grilling-eval.mjs report",
    },
  );
  assert.ok(packageJson.files.every((path) => !path.startsWith("eval") && !path.startsWith("test")));
  const gitignore = readFileSync(join(REPOSITORY_ROOT, ".gitignore"), "utf8");
  assert.match(gitignore, /^eval\/grilling\/results\/$/m);
  for (const script of ["scripts/format-check.mjs", "scripts/lint.mjs"]) {
    assert.match(readFileSync(join(REPOSITORY_ROOT, script), "utf8"), /eval", "grilling", "results/);
  }
});
