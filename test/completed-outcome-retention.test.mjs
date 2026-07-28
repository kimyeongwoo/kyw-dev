import assert from "node:assert/strict";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const physicalRepositoryRoot = realpathSync(repositoryRoot);
const registryPath = fileURLToPath(
  new URL("./completed-outcome-retention.json", import.meta.url),
);
const registrySource = readFileSync(registryPath, "utf8");
const registry = JSON.parse(registrySource);
const workflow = readFileSync(
  fileURLToPath(new URL("../.github/workflows/ci.yml", import.meta.url)),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
);

const expectedOutcomeIds = Object.freeze([
  "ci-action-pins-immutable",
  "ci-main-exact-sha-preservation",
  "installer-core-facade-module-inventory",
  "task-core-facade-module-inventory",
  "task-current-dependency-grammar",
  "task-current-terminal-verdicts",
  "task-transaction-ownership-recovery",
]);
const defaultNodeTestPath = /^test\/(?:[a-z0-9._-]+\/)*[a-z0-9._-]+\.test\.mjs$/u;

function assertObjectKeys(value, expectedKeys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} object`);
  assert.deepEqual(Object.keys(value), expectedKeys, `${label} keys`);
}

function resolveTestPath(relativePath) {
  assert.equal(typeof relativePath, "string", "test path type");
  assert.match(relativePath, defaultNodeTestPath, "default node --test discovery path");
  assert.doesNotMatch(relativePath, /\\/u, "test path uses POSIX separators");
  assert.equal(path.posix.normalize(relativePath), relativePath, "canonical test path");

  const absolutePath = path.resolve(repositoryRoot, ...relativePath.split("/"));
  assert.ok(
    absolutePath.startsWith(`${repositoryRoot}${path.sep}`),
    "test path remains inside the repository",
  );
  assert.equal(lstatSync(absolutePath).isFile(), true, `${relativePath} is a regular file`);
  const physicalPath = realpathSync(absolutePath);
  assert.ok(
    physicalPath.startsWith(`${physicalRepositoryRoot}${path.sep}`),
    "physical test path remains inside the repository",
  );
  return absolutePath;
}

function declaredTopLevelTestNames(source) {
  return [...source.matchAll(/^test\(("(?:\\.|[^"\\])*"),/gmu)].map((match) =>
    JSON.parse(match[1]),
  );
}

function assertRetentionContract(candidate) {
  assertObjectKeys(candidate, ["schemaVersion", "outcomes"], "registry");
  assert.equal(candidate.schemaVersion, 1, "registry schema version");
  assert.ok(Array.isArray(candidate.outcomes), "registry outcomes array");

  const outcomeIds = candidate.outcomes.map((outcome) => outcome.id);
  assert.deepEqual(outcomeIds, expectedOutcomeIds, "required sorted outcome IDs");

  const locatorKeys = [];
  for (const outcome of candidate.outcomes) {
    assertObjectKeys(outcome, ["id", "testCases"], `outcome ${outcome.id}`);
    assert.match(outcome.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "stable outcome ID");
    assert.ok(
      Array.isArray(outcome.testCases) && outcome.testCases.length > 0,
      `${outcome.id} has direct test cases`,
    );

    const outcomeLocatorKeys = [];
    for (const testCase of outcome.testCases) {
      assertObjectKeys(testCase, ["path", "name"], `${outcome.id} test case`);
      assert.equal(typeof testCase.name, "string", `${outcome.id} test name type`);
      assert.ok(testCase.name.length > 0, `${outcome.id} test name`);

      const source = readFileSync(resolveTestPath(testCase.path), "utf8");
      assert.match(source, /^import test from "node:test";$/mu, "node:test import");
      const matches = declaredTopLevelTestNames(source).filter(
        (name) => name === testCase.name,
      );
      assert.equal(
        matches.length,
        1,
        `${outcome.id} must resolve one exact top-level test declaration: ${testCase.name}`,
      );

      const locatorKey = `${testCase.path}\0${testCase.name}`;
      outcomeLocatorKeys.push(locatorKey);
      locatorKeys.push(locatorKey);
    }
    assert.deepEqual(
      outcomeLocatorKeys,
      [...outcomeLocatorKeys].sort(),
      `${outcome.id} test cases are sorted`,
    );
  }

  assert.equal(new Set(locatorKeys).size, locatorKeys.length, "direct test locators are unique");
  assert.equal(packageJson.scripts.test, "node --test", "npm test uses default discovery");
  assert.equal(
    (workflow.match(/^\s+run: npm test\s*$/gmu) ?? []).length,
    1,
    "the behavioral matrix reaches npm test directly",
  );
  assert.equal(
    packageJson.scripts.check,
    "npm test && npm run lint && npm run format:check && npm run pack:check",
    "the synthetic merge complete check reaches every retained test through npm run check",
  );
  assert.match(workflow, /^  behavioral:\s*$/mu);
  assert.match(workflow, /^  merge-compatibility:\s*$/mu);
  assert.match(workflow, /role=PR_MERGE_COMPATIBILITY/u);
  assert.match(workflow, /^\s+run: npm run check\s*$/mu);

  const validatorPath = path
    .relative(repositoryRoot, fileURLToPath(import.meta.url))
    .split(path.sep)
    .join("/");
  assert.match(
    validatorPath,
    defaultNodeTestPath,
    "the retention validator is itself discovered by node --test",
  );
}

test("completed-outcome retention registry preserves every critical direct mapping in ordinary CI", () => {
  assert.equal(
    registrySource,
    `${JSON.stringify(registry, null, 2)}\n`,
    "registry uses canonical deterministic JSON",
  );
  assertRetentionContract(registry);
});

test("completed-outcome retention fails when one critical mapping is removed", () => {
  const missingMapping = structuredClone(registry);
  const outcome = missingMapping.outcomes.find(
    (entry) => entry.id === "task-current-terminal-verdicts",
  );
  outcome.testCases = [];

  assert.throws(
    () => assertRetentionContract(missingMapping),
    /has direct test cases/u,
  );
});
