import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  coverageGapClaim,
  DIRECT_EVIDENCE_METHOD,
  directScenarioVerdict,
  documentationImpactClaim,
  expectedMutationSet,
  FIXTURE_ROOT,
  fixtureGapProof,
  mutationManifest,
  questionCount,
  recommendationCount,
  REPOSITORY_ROOT,
  SCENARIO_CONTRACTS,
  sha256,
  snapshotTree,
  validateDirectScenarioEvidence,
  validateFixtureContracts,
} from "../scripts/spec-behavioral-acceptance.mjs";

const PACKAGE_SOURCE_SHA256 = sha256("current source tree");
const PACKED_TARBALL_SHA256 = sha256("one real packed tarball");

function checksFor(id) {
  const common = {
    expectedMutationManifest: true,
    unexpectedMutations: [],
    unsupportedTerminalClaim: false,
  };
  if (id === "S-01") {
    return {
      ...common,
      interviewProtocol: true,
      confirmationRequested: true,
      preConfirmationDurableWrites: false,
      documentsComplete: true,
      agentsThin: true,
      noTask: true,
      noApplication: true,
      sentinelPreserved: true,
    };
  }
  if (id === "S-02") {
    return {
      ...common,
      interviewProtocol: true,
      confirmationRequested: true,
      preConfirmationDurableWrites: false,
      documentsComplete: true,
      adoptMode: true,
      preservationSection: true,
      applicationPreserved: true,
      noTask: true,
    };
  }
  if (id === "S-03") {
    return {
      ...common,
      taskNumber: "0004",
      singleTaskCreated: true,
      pairComplete: true,
      traceability: true,
      confirmationRequired: true,
      applicationUnchanged: true,
    };
  }
  if (id === "S-04") {
    return {
      ...common,
      resumeAllocatedTask: false,
      existingTaskPreserved: true,
      permanentDocsRead: true,
      taskPairRead: true,
      gitStateRead: true,
      handoffFieldsRead: true,
      confirmationRequired: true,
    };
  }
  if (id === "S-05") {
    return {
      ...common,
      genericSuitePass: true,
      intentionalGapProven: true,
      diffInspected: true,
      genericTestExecuted: true,
      gapDetected: true,
      gapRecorded: true,
      productTestsUnchanged: true,
    };
  }
  return {
    ...common,
    ordinaryCreatedTask: false,
    noSkillInvocation: true,
    sourceChanged: true,
    testChanged: true,
    readmeImpactHandled: true,
    proportionateVerification: true,
    finalDocumentationReport: true,
  };
}

function validRecord(id) {
  return {
    id,
    method: DIRECT_EVIDENCE_METHOD,
    expectedMutationSet: expectedMutationSet(id),
    fixtureBeforeSha256: sha256(`before-${id}`),
    fixtureAfterSha256: sha256(`after-${id}`),
    package: {
      sourceTreeSha256: PACKAGE_SOURCE_SHA256,
      tarballSha256: PACKED_TARBALL_SHA256,
      packedBytesMatch: true,
    },
    commands: [{ label: `${id} focused verification`, exitCode: 0 }],
    checks: checksFor(id),
  };
}

function expectFailure(record, fragment) {
  const errors = validateDirectScenarioEvidence(record);
  assert.ok(errors.some((error) => error.includes(fragment)), errors.join("\n"));
  assert.equal(directScenarioVerdict(record).verdict, "FAIL");
}

test("fixture contract preserves all six repositories and launches only Node", async () => {
  const launches = [];
  assert.deepEqual(
    await validateFixtureContracts({ onLaunch: (launch) => launches.push(launch) }),
    [],
  );
  assert.equal(snapshotTree(FIXTURE_ROOT, { exclude: new Set() }).files.length, 33);
  assert.equal(launches.length, 1);
  assert.deepEqual(launches[0].scenarioIds, ["S-02", "S-03", "S-05", "S-06"]);
  assert.ok(
    launches.every(
      ({ command, args }) =>
        command === process.execPath &&
        args[0] === "--test" &&
        args.slice(1).every((entry) => entry.endsWith("greeting.test.mjs")),
    ),
  );
});

test("S-05 keeps a passing generic suite with an independently proven branch gap", () => {
  const source = readFileSync(
    new URL("../test/fixtures/spec-behavioral-e2e/s05-gap/working/src/greeting.mjs", import.meta.url),
    "utf8",
  );
  const focusedTest = readFileSync(
    new URL(
      "../test/fixtures/spec-behavioral-e2e/s05-gap/working/test/greeting.test.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /acceptance-branch: casual/);
  assert.doesNotMatch(focusedTest, /"casual"|Hi, Ada/);

  const proofRoot = fileURLToPath(
    new URL("../test/fixtures/spec-behavioral-e2e/s05-gap/working", import.meta.url),
  );
  assert.equal(fixtureGapProof(proofRoot).intentionalGapProven, true);
});

test("scenario contracts preserve S-01 through S-06 without a mandatory cohort", () => {
  assert.deepEqual(
    SCENARIO_CONTRACTS.map(({ id }) => id),
    ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06"],
  );
  assert.equal(directScenarioVerdict(validRecord("S-05")).verdict, "PASS");
  assert.equal(directScenarioVerdict(validRecord("S-01")).verdict, "PASS");
});

test("direct evidence requires the current-session method", () => {
  const record = validRecord("S-01");
  record.method = "FRESH_MODEL_COHORT";
  expectFailure(record, "evidence method");
});

test("direct evidence requires reproducible fixture, package, and command identity", () => {
  const missingFixtureHash = validRecord("S-02");
  missingFixtureHash.fixtureAfterSha256 = "";
  expectFailure(missingFixtureHash, "fixture tree hashes");

  const mismatchedPackage = validRecord("S-03");
  mismatchedPackage.package.packedBytesMatch = false;
  expectFailure(mismatchedPackage, "package byte identity");

  const missingCommand = validRecord("S-04");
  missingCommand.commands = [];
  expectFailure(missingCommand, "command evidence");
});

test("one interview question without one recommendation fails", () => {
  const message = "Which greeting should be durable?\n\nWhy: It affects users.";
  assert.equal(questionCount(message), 1);
  assert.equal(recommendationCount(message), 0);
  const record = validRecord("S-01");
  record.checks.interviewProtocol = false;
  expectFailure(record, "interviewProtocol");
});

test("multiple questions in one interview turn fail", () => {
  const message = [
    "Which greeting should be durable?",
    "Who is the primary audience?",
    "Recommendation: Use the existing greeting.",
    "Why: It preserves behavior.",
  ].join("\n\n");
  assert.equal(questionCount(message), 2);
  const record = validRecord("S-02");
  record.checks.interviewProtocol = false;
  expectFailure(record, "interviewProtocol");
});

test("permanent documents written before confirmation fail", () => {
  const record = validRecord("S-01");
  record.checks.preConfirmationDurableWrites = true;
  expectFailure(record, "preConfirmationDurableWrites");
});

test("application source changed before Task confirmation fails", () => {
  const record = validRecord("S-03");
  record.checks.applicationUnchanged = false;
  expectFailure(record, "applicationUnchanged");
});

test("a Task allocation other than the exact next number fails", () => {
  const record = validRecord("S-03");
  record.checks.taskNumber = "0005";
  expectFailure(record, "wrong Task number");
});

test("a missing Task/Test pair member fails", () => {
  const record = validRecord("S-03");
  record.checks.pairComplete = false;
  expectFailure(record, "pairComplete");
});

test("resume that allocates another Task fails", () => {
  const record = validRecord("S-04");
  record.checks.resumeAllocatedTask = true;
  expectFailure(record, "resumeAllocatedTask");
});

test("generic suite success without uncovered-branch detection fails", () => {
  const record = validRecord("S-05");
  record.checks.gapDetected = false;
  expectFailure(record, "gapDetected");
});

test("an unsupported DONE or PASSED claim fails", () => {
  const record = validRecord("S-05");
  record.checks.unsupportedTerminalClaim = true;
  expectFailure(record, "unsupportedTerminalClaim");
});

test("an ordinary prompt that creates a numbered Task fails", () => {
  const record = validRecord("S-06");
  record.checks.ordinaryCreatedTask = true;
  expectFailure(record, "ordinaryCreatedTask");
});

test("a durable visible change without README impact handling fails", () => {
  const record = validRecord("S-06");
  record.checks.readmeImpactHandled = false;
  expectFailure(record, "readmeImpactHandled");
});

test("unexpected fixture mutations fail while the exact manifest passes", () => {
  const record = validRecord("S-06");
  record.checks.unexpectedMutations = ["docs/SPEC.md"];
  expectFailure(record, "unexpected fixture mutation");
  assert.equal(directScenarioVerdict(validRecord("S-06")).verdict, "PASS");
});

test("a changed fixed expected-mutation label set fails", () => {
  const record = validRecord("S-03");
  record.expectedMutationSet = [];
  expectFailure(record, "expected mutation set");
});

test("bounded equivalent wording is accepted and vague wording is rejected", () => {
  assert.equal(
    coverageGapClaim("AC-01 lacks acceptance-specific coverage for the casual branch."),
    true,
  );
  assert.equal(coverageGapClaim("Coverage could be better."), false);
  assert.equal(
    documentationImpactClaim("Permanent-document impact: README changes; SPEC does not."),
    true,
  );
  assert.equal(documentationImpactClaim("Documentation was considered."), false);
});

test("snapshot comparison retains deterministic direct mutation attribution", () => {
  const before = {
    files: [
      { path: "README.md", sha256: sha256("old"), size: 3 },
      { path: "removed.txt", sha256: sha256("remove"), size: 6 },
    ],
  };
  const after = {
    files: [
      { path: "README.md", sha256: sha256("new"), size: 3 },
      { path: "added.txt", sha256: sha256("add"), size: 3 },
    ],
  };
  assert.deepEqual(mutationManifest(before, after), [
    { path: "README.md", kind: "modified" },
    { path: "added.txt", kind: "added" },
    { path: "removed.txt", kind: "removed" },
  ]);
});

test("cancelled nested runner and fixed-cohort tests are absent", () => {
  assert.equal(existsSync(`${REPOSITORY_ROOT}/scripts/spec-behavioral-e2e.mjs`), false);
  assert.equal(existsSync(`${REPOSITORY_ROOT}/test/spec-behavioral-e2e.test.mjs`), false);
  const source = readFileSync(
    `${REPOSITORY_ROOT}/scripts/spec-behavioral-acceptance.mjs`,
    "utf8",
  );
  for (const forbidden of [
    "codex exec",
    "--allow-model",
    "--reasoning-effort",
    "docker",
    "cohort",
    "capability",
  ]) {
    assert.equal(source.toLowerCase().includes(forbidden), false, forbidden);
  }
});

test("direct CLI rejects retired execution flags before fixture work", () => {
  const result = spawnSync(
    process.execPath,
    [`${REPOSITORY_ROOT}/scripts/spec-behavioral-acceptance.mjs`, "--allow-model"],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /INVALID_ARGUMENT/);
  assert.match(result.stderr, /--validate-fixtures/);
});
