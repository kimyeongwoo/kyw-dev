import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseArguments } from "../scripts/grilling-eval.mjs";
import {
  resultSummary,
  runEvaluation,
  validateResult,
} from "../scripts/grilling-eval/core.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FAKE_LAUNCHER = {
  command: process.execPath,
  prefixArgs: [join(REPOSITORY_ROOT, "test", "fixtures", "grilling-eval", "fake-codex.mjs")],
};
const MODEL = "mock-model-kept-verbatim";
const UNSAFE_EFFORTS = ["", " ", "\t", "\n", "high\n", "high\r", "high\0", "high\x1b", "high low", " high", "high ", 'high"', "high'", "high\\", "high=low", "high;low", "--high", "_high", "고급"];

function temporaryDirectory(t) {
  const root = mkdtempSync(join(tmpdir(), "kyw-grilling-v4-test-"));
  t.after(() => {
    assert.ok(resolve(root).startsWith(`${resolve(tmpdir())}${sep}`));
    assert.match(root.slice(resolve(tmpdir()).length + 1), /^kyw-grilling-v4-test-[^\\/]+$/);
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function cliArguments(reasoningEffort, outputRoot) {
  return [
    "smoke", "--allow-model", "--variant", "kyw", "--scenario", "existing-code-facts",
    "--model", MODEL, "--reasoning-effort", reasoningEffort, "--output", outputRoot,
  ];
}

function directOptions(reasoningEffort, outputRoot) {
  return { variant: "kyw", scenario: "existing-code-facts", model: MODEL, reasoningEffort, outputRoot };
}

function readInvocations(path) {
  return readFileSync(path, "utf8").trimEnd().split("\n").map((line) => JSON.parse(line));
}

function assertRequestedArguments(invocations, effort) {
  for (const args of invocations) {
    assert.equal(args[args.indexOf("--model") + 1], MODEL);
    assert.deepEqual(args.filter((arg) => arg.startsWith("model_reasoning_effort=")), [`model_reasoning_effort="${effort}"`]);
  }
  assert.notEqual(invocations[0][1], "resume");
  assert.ok(invocations.slice(1).every((args) => args[1] === "resume"));
}

test("mock launcher receives unchanged max/ultra/legacy/custom effort on initial and resumed turns through CLI and direct boundaries", async (t) => {
  const root = temporaryDirectory(t);
  const efforts = ["minimal", "low", "medium", "high", "xhigh", "max", "ultra", "Future_9-v2"];
  for (const effort of efforts) {
    const sources = ["high", "max", "ultra"].includes(effort) ? ["cli", "direct-call"] : ["direct-call"];
    const parsed = parseArguments(cliArguments(effort, join(root, "parser-only")));
    assert.equal(parsed.reasoningEffort, effort);
    assert.equal(parsed.model, MODEL);
    assert.equal(parsed.configurationSource, "cli");
    for (const source of sources) {
      const outputRoot = join(root, `${effort}-${source}`);
      const argumentLog = join(root, `${effort}-${source}.jsonl`);
      const options = source === "cli" ? parseArguments(cliArguments(effort, outputRoot)) : directOptions(effort, outputRoot);
      const completed = await runEvaluation({
        ...options,
        launcher: FAKE_LAUNCHER,
        extraEnv: { FAKE_CODEX_ARGUMENT_LOG: argumentLog, FAKE_CODEX_EXPECT_REASONING_EFFORT: effort },
      });
      const invocations = readInvocations(argumentLog);
      assert.equal(invocations.length, 4);
      assertRequestedArguments(invocations, effort);
      assert.equal(completed.result.schemaVersion, 4);
      assert.equal(completed.result.codex.version, "codex-cli 9.9.9-test");
      assert.deepEqual(completed.result.configurationProvenance, {
        requested: { model: MODEL, reasoningEffort: effort, source },
        observed: { status: "UNAVAILABLE", model: null, reasoningEffort: null, source: null },
        serverExecution: { status: "UNAVAILABLE", model: null, reasoningEffort: null, source: null },
      });
      assert.deepEqual(resultSummary(completed.result).configurationProvenance, completed.result.configurationProvenance);
      assert.equal(completed.result.grade.criticalViolations.length, 0);
    }
  }
});

test("CLI and direct runner reject unsafe effort and invalid provenance before preflight or fixture creation", async (t) => {
  const root = temporaryDirectory(t);
  const outputRoot = join(root, "results");
  let preflightCalls = 0;
  let stateEvents = 0;
  for (const effort of [...UNSAFE_EFFORTS, null, undefined, 1]) {
    if (typeof effort === "string") {
      assert.throws(() => parseArguments(cliArguments(effort, outputRoot)), { code: "INVALID_ARGUMENT" });
    }
    await assert.rejects(runEvaluation({
      ...directOptions(effort, outputRoot),
      launcher: FAKE_LAUNCHER,
      preflight: () => { preflightCalls += 1; },
      onState: () => { stateEvents += 1; },
    }), { code: "INVALID_ARGUMENT" });
  }
  await assert.rejects(runEvaluation({
    ...directOptions("max", outputRoot),
    configurationSource: "server",
    launcher: FAKE_LAUNCHER,
    preflight: () => { preflightCalls += 1; },
    onState: () => { stateEvents += 1; },
  }), { code: "INVALID_ARGUMENT" });
  assert.equal(preflightCalls, 0);
  assert.equal(stateEvents, 0);
  assert.equal(existsSync(outputRoot), false);
});

test("mock host effort errors on initial or resumed turns retain the original error, never fall back, and publish no result", async (t) => {
  const root = temporaryDirectory(t);
  for (const [effort, failureEnv, expectedCalls] of [["max", "FAKE_CODEX_REJECT_EFFORT", 1], ["ultra", "FAKE_CODEX_REJECT_RESUME", 2]]) {
    const outputRoot = join(root, effort);
    const argumentLog = join(root, `${effort}.jsonl`);
    await assert.rejects(runEvaluation({
      ...directOptions(effort, outputRoot),
      launcher: FAKE_LAUNCHER,
      extraEnv: { FAKE_CODEX_ARGUMENT_LOG: argumentLog, [failureEnv]: "1" },
    }), (error) => {
      assert.equal(error.code, "CODEX_CAPABILITY_UNAVAILABLE");
      assert.match(error.message, /invalid value: this mock host rejects the requested reasoning effort/);
      return true;
    });
    const invocations = readInvocations(argumentLog);
    assert.equal(invocations.length, expectedCalls);
    assertRequestedArguments(invocations, effort);
    assert.equal(existsSync(outputRoot), false);
  }
});

test("v4 validator enforces requested aliases and unavailable provenance without changing legacy reader meaning", async (t) => {
  const root = temporaryDirectory(t);
  const { result } = await runEvaluation({ ...directOptions("high", join(root, "results")), launcher: FAKE_LAUNCHER });
  const schema = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "eval", "grilling", "result.schema.v4.json"), "utf8"));
  const schemaEffortPattern = new RegExp(schema.$defs.reasoningEffortToken.pattern);
  for (const effort of ["max", "ultra", "high", "Future_9-v2"]) assert.equal(schemaEffortPattern.test(effort), true);
  for (const effort of UNSAFE_EFFORTS) assert.equal(schemaEffortPattern.test(effort), false);
  for (const mutate of [
    (value) => { delete value.configurationProvenance; },
    (value) => { value.configurationProvenance.requested.model = "different-model"; },
    (value) => { value.configurationProvenance.requested.reasoningEffort = "ultra"; },
    (value) => { value.configurationProvenance.requested.source = "server"; },
    (value) => { value.configurationProvenance.requested.extra = true; },
    (value) => { value.configurationProvenance.observed.model = MODEL; },
    (value) => { value.configurationProvenance.observed.model = "different-observed-model"; },
    (value) => { value.configurationProvenance.observed.status = "AVAILABLE"; },
    (value) => { value.configurationProvenance.observed.source = "turn_context"; },
    (value) => { value.configurationProvenance.serverExecution.reasoningEffort = "high"; },
    (value) => { value.configurationProvenance.serverExecution.source = "codex-cli 9.9.9-test"; },
    (value) => { value.configurationProvenance.serverExecution = null; },
    (value) => { value.configurationProvenance.extra = true; },
  ]) {
    const invalid = structuredClone(result);
    mutate(invalid);
    assert.throws(() => validateResult(invalid));
  }
  for (const effort of UNSAFE_EFFORTS) {
    const invalid = structuredClone(result);
    invalid.codex.config.reasoningEffort = effort;
    invalid.configurationProvenance.requested.reasoningEffort = effort;
    assert.throws(() => validateResult(invalid), { code: "INVALID_RESULT" });
  }
  for (const schemaVersion of [1, 2, 3]) {
    const legacy = structuredClone(result);
    legacy.schemaVersion = schemaVersion;
    delete legacy.configurationProvenance;
    const before = JSON.stringify(legacy);
    validateResult(legacy);
    assert.equal(JSON.stringify(legacy), before);
    assert.equal("configurationProvenance" in resultSummary(legacy), false);
    if (schemaVersion >= 2) {
      legacy.codex.config.reasoningEffort = "ultra";
      assert.throws(() => validateResult(legacy), { code: "INVALID_RESULT" });
    }
  }
});
