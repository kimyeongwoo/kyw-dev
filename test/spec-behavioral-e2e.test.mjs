import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCodexInvocation,
  coverageGapClaim,
  documentationImpactClaim,
  packedSourceReadCount,
  questionCount,
  recommendationCount,
  scenarioVerdict,
  sha256,
  validateCohort,
  validateFixtureContracts,
  validateScenarioEvidence,
} from "../scripts/spec-behavioral-e2e.mjs";

const PACKED_TARBALL_SHA256 = sha256("one-fixed-packed-tarball");

function expectedMutationSetFor(id) {
  if (id === "S-01" || id === "S-02") {
    return ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"];
  }
  if (id === "S-03") {
    return [
      "docs/tasks/0004-<allocated-slug>/TASK.md",
      "docs/tasks/0004-<allocated-slug>/TEST.md",
    ];
  }
  if (id === "S-04") return [];
  if (id === "S-05") {
    return ["docs/tasks/0001-greeting-style/TASK.md and/or TEST.md evidence only"];
  }
  return ["README.md", "src/greeting.mjs", "test/greeting.test.mjs"];
}

function checksFor(id) {
  const common = {
    packedSkillMatches: true,
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
    model: "gpt-5.6-sol",
    reasoningEffort: "high",
    packedTarballSha256: PACKED_TARBALL_SHA256,
    threadIdentityHash: sha256(`thread-${id}`),
    turnCount: ["S-01", "S-02"].includes(id) ? 3 : 1,
    finalMessageSha256: sha256(`final-${id}`),
    sanitizedEventsSha256: sha256(`events-${id}`),
    authSourceUnchanged: true,
    expectedMutationSet: expectedMutationSetFor(id),
    cleanup: { scenarioRootRemoved: true, authCopyRemoved: true, residueFree: true },
    sensitiveFindings: [],
    checks: checksFor(id),
    displayExcerpt: `bounded display excerpt for ${id}`,
  };
}

function expectFailure(record, fragment) {
  const errors = validateScenarioEvidence(record);
  assert.ok(errors.some((error) => error.includes(fragment)), errors.join("\n"));
  assert.equal(scenarioVerdict(record).verdict, "FAIL");
}

test("fixture contract materializes all six deterministic repositories", async () => {
  assert.deepEqual(await validateFixtureContracts(), []);
});

test("01 packed Skill source mismatch fails", () => {
  const record = validRecord("S-01");
  record.checks.packedSkillMatches = false;
  expectFailure(record, "packedSkillMatches");
});

test("02 missing or reused fresh thread identity fails", () => {
  const missing = validRecord("S-01");
  missing.threadIdentityHash = "";
  expectFailure(missing, "fresh thread identity missing");

  const records = ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06"].map(validRecord);
  records[1].threadIdentityHash = records[0].threadIdentityHash;
  assert.match(validateCohort(records).errors.join("\n"), /must be distinct/);
});

test("03 an interview question without one recommendation fails", () => {
  const message = "Which greeting should be durable?\n\nWhy: It affects users.";
  assert.equal(questionCount(message), 1);
  assert.equal(recommendationCount(message), 0);
  const record = validRecord("S-01");
  record.checks.interviewProtocol = false;
  expectFailure(record, "interviewProtocol");
});

test("04 multiple questions in one interview turn fail", () => {
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

test("05 permanent documents written before confirmation fail", () => {
  const record = validRecord("S-01");
  record.checks.preConfirmationDurableWrites = true;
  expectFailure(record, "preConfirmationDurableWrites");
});

test("06 application source changed before Task confirmation fails", () => {
  const record = validRecord("S-03");
  record.checks.applicationUnchanged = false;
  expectFailure(record, "applicationUnchanged");
});

test("07 a Task allocation other than the exact next number fails", () => {
  const record = validRecord("S-03");
  record.checks.taskNumber = "0005";
  expectFailure(record, "wrong Task number");
});

test("08 a missing Task/Test pair member fails", () => {
  const record = validRecord("S-03");
  record.checks.pairComplete = false;
  expectFailure(record, "pairComplete");
});

test("09 resume that allocates another Task fails", () => {
  const record = validRecord("S-04");
  record.checks.resumeAllocatedTask = true;
  expectFailure(record, "resumeAllocatedTask");
});

test("10 generic suite success without uncovered-branch detection fails", () => {
  const record = validRecord("S-05");
  assert.equal(record.checks.genericSuitePass, true);
  record.checks.gapDetected = false;
  expectFailure(record, "gapDetected");
});

test("11 an unsupported DONE or PASSED claim fails", () => {
  const record = validRecord("S-05");
  record.checks.unsupportedTerminalClaim = true;
  expectFailure(record, "unsupportedTerminalClaim");
});

test("12 an ordinary prompt that creates a numbered Task fails", () => {
  const record = validRecord("S-06");
  record.checks.ordinaryCreatedTask = true;
  expectFailure(record, "ordinaryCreatedTask");
});

test("13 a durable visible change without README impact handling fails", () => {
  const record = validRecord("S-06");
  record.checks.readmeImpactHandled = false;
  expectFailure(record, "readmeImpactHandled");
});

test("14 any unexpected fixture mutation fails", () => {
  const record = validRecord("S-06");
  record.checks.unexpectedMutations = ["docs/SPEC.md"];
  expectFailure(record, "unexpected fixture mutation");
});

test("15 the exact expected mutation manifest passes", () => {
  assert.deepEqual(validateScenarioEvidence(validRecord("S-06")), []);
  assert.equal(scenarioVerdict(validRecord("S-06")).verdict, "PASS");
});

test("16 raw credentials or protected absolute paths fail", () => {
  const record = validRecord("S-01");
  record.sensitiveFindings = ["credential-like text", "protected path"];
  expectFailure(record, "sensitive output");
});

test("17 source-auth byte mismatch fails", () => {
  const record = validRecord("S-02");
  record.authSourceUnchanged = false;
  expectFailure(record, "auth source changed");
});

test("18 scenario-root or authentication-copy residue fails", () => {
  const record = validRecord("S-03");
  record.cleanup = {
    scenarioRootRemoved: false,
    authCopyRemoved: false,
    residueFree: false,
  };
  expectFailure(record, "owned residue remains");
});

test("19 transcript display truncation cannot alter the verdict", () => {
  const record = validRecord("S-04");
  const initialVerdict = scenarioVerdict(record);
  record.displayExcerpt = "x";
  const truncatedVerdict = scenarioVerdict(record);
  assert.deepEqual(truncatedVerdict, initialVerdict);
  assert.equal(truncatedVerdict.verdict, "PASS");
});

test("20 one scenario failure fails the cohort without hiding completed evidence", () => {
  const records = ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06"].map(validRecord);
  records[4].checks.gapRecorded = false;
  const cohort = validateCohort(records);
  assert.equal(cohort.verdict, "FAIL");
  assert.equal(cohort.scenarios.length, 6);
  assert.deepEqual(
    cohort.scenarios.map(({ id, verdict }) => ({ id, verdict })),
    [
      { id: "S-01", verdict: "PASS" },
      { id: "S-02", verdict: "PASS" },
      { id: "S-03", verdict: "PASS" },
      { id: "S-04", verdict: "PASS" },
      { id: "S-05", verdict: "FAIL" },
      { id: "S-06", verdict: "PASS" },
    ],
  );
});

test("21 writable model sessions use the frozen external Docker boundary", () => {
  const docker = { command: "docker-test", prefixArgs: [] };
  const state = {
    caBundle: "state/protected/trusted-ca.pem",
    home: "state/home",
    codexHome: "state/codex-home",
    toolCodexHome: "state/tool-codex-home",
    npmRoot: "state/npm",
    processTemp: "state/temp",
    xdgConfig: "state/xdg-config",
    xdgCache: "state/xdg-cache",
    control: "state/control",
  };
  const common = {
    docker,
    state,
    repository: "fixture-repository",
    packageRoot: "packed-product",
    runtimeRoot: "codex-runtime",
    auth: { source: "auth/source.json", destination: "state/codex-home/auth.json" },
    environment: {},
    containerName: "task0026-test-container",
    runId: "task0026-test-run",
    lastMessagePath: "state/control/last-message.txt",
    validateInputs: false,
  };
  const invocation = buildCodexInvocation({
    ...common,
    threadId: undefined,
  });
  assert.equal(invocation.command, docker.command);
  assert.deepEqual(invocation.args.slice(0, 4), ["run", "--rm", "--pull", "never"]);
  assert.ok(invocation.args.includes("--read-only"));
  assert.ok(invocation.args.includes("--cap-drop"));
  assert.ok(invocation.args.includes("no-new-privileges:true"));
  assert.ok(invocation.args.some((value) => value.includes("target=/workspace/.git,readonly")));
  assert.ok(invocation.args.some((value) => value.includes("target=/workspace/.agents,readonly")));
  assert.ok(
    invocation.args.some((value) => value.includes("target=/protected/auth-source/auth.json,readonly")),
  );
  assert.ok(invocation.args.some((value) => value.includes("target=/tmp")));
  assert.ok(invocation.args.includes("NODE_DISABLE_COMPILE_CACHE=1"));
  assert.ok(
    invocation.args.includes(
      "node@sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b",
    ),
  );
  assert.ok(invocation.args.includes("--dangerously-bypass-approvals-and-sandbox"));
  assert.ok(invocation.args.includes('shell_environment_policy.inherit="none"'));
  assert.ok(invocation.args.some((value) => value.startsWith("shell_environment_policy.set=")));
  assert.equal(invocation.args.includes("audit-smoke-outer"), false);
  assert.equal(invocation.args.includes("workspace-write"), false);

  const resumed = buildCodexInvocation({
    ...common,
    threadId: "fixed-thread",
  });
  assert.ok(resumed.args.includes("resume"));
  assert.ok(resumed.args.includes("fixed-thread"));
});

test("22 bounded equivalent wording is accepted and vague wording is rejected", () => {
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

test("23 packed source proof requires the installed path and completed exact output", () => {
  const sourceText = "# packed Skill\nexact bytes";
  const installedPath = ".agents/skills/kyw-task/SKILL.md";
  const events = [
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        status: "completed",
        command: "Get-Content C:/source-checkout/skills/kyw-task/SKILL.md",
        aggregated_output: sourceText,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        status: "declined",
        command: `Get-Content ${installedPath}`,
        aggregated_output: sourceText,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        status: "completed",
        command: "Get-Content .agents\\skills\\kyw-task\\SKILL.md",
        aggregated_output: sourceText,
      },
    },
  ];
  assert.equal(packedSourceReadCount(events, installedPath, sourceText), 1);
});

test("24 a missing fixed expected-mutation label set fails", () => {
  const record = validRecord("S-03");
  record.expectedMutationSet = [];
  expectFailure(record, "expected mutation set");
});
