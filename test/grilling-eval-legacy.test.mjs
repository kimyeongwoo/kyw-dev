import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BENCHMARK_THRESHOLDS,
  resultSummary,
  sha256File,
  validateResult,
  writeBenchmarkReport,
} from "../scripts/grilling-eval/core.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FIXTURES = join(REPOSITORY_ROOT, "test", "fixtures", "grilling-eval-legacy");
const PROVENANCE = JSON.parse(readFileSync(join(FIXTURES, "provenance.json"), "utf8"));
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function ownedFixture(t, version) {
  const root = mkdtempSync(join(tmpdir(), "kyw-grilling-legacy-test-"));
  const resolvedRoot = resolve(root);
  t.after(() => {
    assert.equal(dirname(resolvedRoot), resolve(tmpdir()));
    assert.ok(relative(tmpdir(), resolvedRoot).startsWith("kyw-grilling-legacy-test-"));
    rmSync(resolvedRoot, { recursive: true, force: true });
  });
  const input = JSON.parse(readFileSync(join(FIXTURES, `input-v${version}.json`), "utf8"));
  for (const [path, text] of Object.entries(input.artifacts)) {
    const destination = resolve(root, path);
    const contained = relative(resolvedRoot, destination);
    assert.ok(contained !== ".." && !contained.startsWith(`..${sep}`) && !isAbsolute(contained));
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, text, "utf8");
  }
  const comparisonDirectory = join(root, "comparison");
  mkdirSync(comparisonDirectory);
  writeFileSync(join(comparisonDirectory, "comparison.json"), json(input.comparison), "utf8");
  const benchmarkPath = join(root, "benchmark.json");
  writeFileSync(benchmarkPath, json(input.benchmark), "utf8");
  return { root, input, comparisonDirectory, benchmarkPath };
}

test("historical result schemas v1-v3 and benchmarks v1-v11 retain captured bytes", () => {
  assert.equal(PROVENANCE.kind, "synthetic-offline-legacy-reporter-oracle");
  assert.equal(PROVENANCE.baselineHead, "2d3b0a1025abca23ad065e26e126354f55d0b19b");
  assert.equal(
    PROVENANCE.capturedCoreSha256,
    "f15070783a5012313f54f1b58379ac383d59fb0341ca8d18b403283f82981ab4",
  );
  assert.equal(Object.keys(PROVENANCE.historicalBytesSha256).length, 14);
  for (const [path, expectedHash] of Object.entries(PROVENANCE.historicalBytesSha256)) {
    assert.equal(sha256File(join(REPOSITORY_ROOT, "eval", "grilling", path)), expectedHash, path);
  }
});

for (const version of [1, 2, 3]) {
  test(`legacy v${version} reader preserves input and historical requested-value summary`, (t) => {
    const { input } = ownedFixture(t, version);
    assert.deepEqual(input.benchmark.thresholds, BENCHMARK_THRESHOLDS);
    assert.equal(input.comparison.summaries.length, 2);
    for (const summary of input.comparison.summaries) {
      const raw = input.artifacts[`${summary.runId}/run.json`];
      const result = JSON.parse(raw);
      assert.strictEqual(validateResult(result), result);
      assert.equal(json(result), raw, "reader must not migrate or backfill provenance in memory");
      assert.deepEqual(resultSummary(result), summary);
      assert.equal(result.turns.length, 4);
      assert.equal(result.codex.model, "fake-model");
      assert.equal(result.codex.config.reasoningEffort, version === 1 ? undefined : "high");
      assert.equal(summary.reasoningEffort, version === 1 ? null : "high");
      assert.equal(Object.hasOwn(result, "configurationProvenance"), false);
    }
  });

  test(`legacy v${version} report matches pre-change bytes, digest, and OUTPUT_CONFLICT behavior`, (t) => {
    const { root, input, comparisonDirectory, benchmarkPath } = ownedFixture(t, version);
    const expectedPath = join(FIXTURES, `report-v${version}.json`);
    const expected = readFileSync(expectedPath);
    const expectedHash = PROVENANCE.reports[`v${version}`].sha256;
    assert.equal(sha256File(expectedPath), expectedHash);
    const result = writeBenchmarkReport(comparisonDirectory, { benchmarkPath });
    assert.deepEqual(readFileSync(result.reportPath), expected);
    assert.equal(result.reportSha256, expectedHash);
    assert.equal(result.report.gateResult, PROVENANCE.reports[`v${version}`].gateResult);
    assert.equal(result.report.benchmarkConfigSha256, sha256File(benchmarkPath));
    assert.equal(result.report.runs.every((run) => run.artifactCount === 9), true);
    assert.equal(result.report.conditionChecks.exactModel, true);
    assert.equal(Object.hasOwn(result.report.conditionChecks, "requestedModelMatches"), false);
    const repeated = writeBenchmarkReport(comparisonDirectory, { benchmarkPath });
    assert.equal(repeated.reportSha256, expectedHash);
    assert.deepEqual(readFileSync(repeated.reportPath), expected);

    const conflict = "synthetic conflicting report\n";
    writeFileSync(result.reportPath, conflict, "utf8");
    assert.throws(
      () => writeBenchmarkReport(comparisonDirectory, { benchmarkPath }),
      { code: "OUTPUT_CONFLICT", message: "Existing report.json differs" },
    );
    assert.equal(readFileSync(result.reportPath, "utf8"), conflict);
    assert.deepEqual(readdirSync(comparisonDirectory).sort(), ["comparison.json", "report.json"]);
    assert.equal(readFileSync(benchmarkPath, "utf8"), json(input.benchmark));
    assert.equal(readFileSync(join(comparisonDirectory, "comparison.json"), "utf8"), json(input.comparison));
    for (const [path, original] of Object.entries(input.artifacts)) {
      assert.equal(readFileSync(join(root, path), "utf8"), original, "reporter must not rewrite legacy artifacts");
    }
  });
}

test("legacy v2-v3 retain their original effort allowlist", () => {
  for (const version of [2, 3]) {
    const { artifacts } = JSON.parse(readFileSync(join(FIXTURES, `input-v${version}.json`), "utf8"));
    const raw = Object.entries(artifacts).find(([path]) => path.endsWith("/run.json"))[1];
    for (const effort of ["max", "ultra"]) {
      const result = JSON.parse(raw);
      result.codex.config.reasoningEffort = effort;
      assert.throws(() => validateResult(result), { code: "INVALID_RESULT" });
    }
  }
});
