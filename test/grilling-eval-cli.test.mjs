import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseArguments } from "../scripts/grilling-eval.mjs";
import { isReasoningEffortToken } from "../scripts/evaluator-configuration.mjs";
import { sha256File } from "../scripts/grilling-eval/core.mjs";

const CLI = fileURLToPath(new URL("../scripts/grilling-eval.mjs", import.meta.url));
const smoke = ["smoke", "--allow-model", "--variant", "kyw", "--scenario", "existing-code-facts", "--model", "requested-model"];

test("grilling CLI preserves safe effort tokens and rejects config-boundary inputs", () => {
  for (const effort of ["minimal", "low", "medium", "high", "xhigh", "max", "ultra", "Future-Value_2"]) {
    const options = parseArguments([...smoke, "--reasoning-effort", effort]);
    assert.equal(options.reasoningEffort, effort);
    assert.equal(options.configurationSource, "cli");
    assert.equal(isReasoningEffortToken(effort), true);
  }
  for (const effort of ["", " ", "high ", " high", "hi gh", "high\n", "high\r", "high\r\n", "high\t", "high\0", "high\u001b", "high\"", "high'", "high\\", "high=low", "한글", "-high", "_high"]) {
    assert.equal(isReasoningEffortToken(effort), false, JSON.stringify(effort));
    assert.throws(() => parseArguments([...smoke, "--reasoning-effort", effort]), /requires a value|nonempty token|required/);
  }
});

test("report paths are explicit cwd-relative inputs and report options are rejected by model commands", () => {
  assert.deepEqual(parseArguments(["report", "--comparison", "small comparison", "--benchmark", "small benchmark.json"]), {
    command: "report",
    comparisonDirectory: resolve("small comparison"),
    benchmarkPath: resolve("small benchmark.json"),
  });
  assert.equal(parseArguments(["report", "--comparison", "comparison"]).benchmarkPath, undefined);
  for (const command of ["smoke", "compare"]) {
    for (const option of ["--benchmark", "--comparison"]) {
      const result = spawnSync(process.execPath, [CLI, command, option, "unused"], { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /valid only for report/);
    }
  }
  for (const args of [
    ["report", "--comparison", "c", "--benchmark"],
    ["report", "--comparison", "c", "--benchmark", "b", "--benchmark", "b"],
    ["report", "--comparison", "c", "--model", "m"],
  ]) assert.throws(() => parseArguments(args));
});

test("public evaluator help distinguishes historical defaults, requested values, and support limits", () => {
  const result = spawnSync(process.execPath, [CLI, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--benchmark <file>/);
  assert.match(result.stdout, /historical fixed Luna\/high experiment/);
  assert.match(result.stdout, /current cwd/);
  assert.match(result.stdout, /does not prove model support/);
  assert.match(result.stdout, /UNAVAILABLE/);
});

function reportFixture(t) {
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent, "kyw-report-cli-"));
  t.after(() => {
    assert.equal(dirname(resolve(root)), parent);
    assert.ok(basename(root).startsWith("kyw-report-cli-"));
    rmSync(root, { recursive: true, force: true });
  });
  const input = JSON.parse(readFileSync(new URL("./fixtures/grilling-eval-legacy/input-v3.json", import.meta.url), "utf8"));
  const comparisonDirectory = join(root, "small comparison");
  const benchmarkPath = join(root, "explicit benchmark.json");
  mkdirSync(comparisonDirectory);
  for (const [path, contents] of Object.entries(input.artifacts)) {
    const target = resolve(root, path);
    assert.ok(target.startsWith(`${root}\\`) || target.startsWith(`${root}/`));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  writeFileSync(join(comparisonDirectory, "comparison.json"), `${JSON.stringify(input.comparison, null, 2)}\n`);
  // Intentionally distinct file formatting proves that the selected file's bytes are digested.
  writeFileSync(benchmarkPath, ` ${JSON.stringify(input.benchmark)} \n`);
  const run = (args) => spawnSync(process.execPath, [CLI, "report", "--comparison", "small comparison", ...args], {
    cwd: root, encoding: "utf8",
  });
  return { root, input, benchmarkPath, comparisonDirectory, run };
}

test("public report CLI uses the exact named small benchmark from cwd and records its digest", (t) => {
  const fixture = reportFixture(t);
  const result = fixture.run(["--benchmark", "explicit benchmark.json"]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  const report = JSON.parse(readFileSync(output.reportPath, "utf8"));
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.gateResult, "pass");
  assert.equal(report.runs.length, 2);
  assert.equal(report.benchmarkConfigSha256, sha256File(fixture.benchmarkPath));
  assert.equal(output.reportSha256, sha256File(output.reportPath));
  const absolute = fixture.run(["--benchmark", fixture.benchmarkPath]);
  assert.equal(absolute.status, 0, absolute.stderr);
  assert.equal(absolute.stdout, result.stdout, "same exact input retains report bytes and conflict behavior");
});

test("omitted benchmark retains the historical v11 contract and rejects a different small experiment", (t) => {
  const fixture = reportFixture(t);
  const omitted = fixture.run([]);
  const explicit = fixture.run(["--benchmark", fileURLToPath(new URL("../eval/grilling/benchmark.v11.json", import.meta.url))]);
  assert.equal(omitted.status, 1);
  assert.match(omitted.stderr, /Expected 32 run summaries/);
  assert.equal(omitted.stderr, explicit.stderr);
  assert.equal(existsSync(join(fixture.comparisonDirectory, "report.json")), false);
});

test("public report CLI rejects missing, malformed, mismatched, and changed-evidence inputs without publishing", (t) => {
  const fixture = reportFixture(t);
  const cases = [
    ["missing.json", undefined, /Unable to parse/],
    ["malformed.json", "{", /Unable to parse/],
    ["count.json", { ...fixture.input.benchmark, expectedRuns: 3 }, /Expected 3 run summaries/],
    ["model.json", { ...fixture.input.benchmark, model: "different-request" }, /comparison model differs/],
    ["effort.json", { ...fixture.input.benchmark, reasoningEffort: "ultra" }, /comparison reasoning effort differs/],
    ["thresholds.json", { ...fixture.input.benchmark, thresholds: {} }, /thresholds differ/],
  ];
  for (const [path, content, error] of cases) {
    if (content !== undefined) writeFileSync(join(fixture.root, path), typeof content === "string" ? content : JSON.stringify(content));
    const result = fixture.run(["--benchmark", path]);
    assert.equal(result.status, 1, path);
    assert.match(result.stderr, error);
    assert.equal(existsSync(join(fixture.comparisonDirectory, "report.json")), false);
  }
  const runId = fixture.input.comparison.summaries[0].runId;
  const originalPath = join(fixture.root, runId, "turn-01.final.txt");
  writeFileSync(originalPath, "tampered synthetic evidence\n");
  const tampered = fixture.run(["--benchmark", fixture.benchmarkPath]);
  assert.equal(tampered.status, 1);
  assert.match(tampered.stderr, /differs|mismatch/);
  assert.equal(existsSync(join(fixture.comparisonDirectory, "report.json")), false);
});
