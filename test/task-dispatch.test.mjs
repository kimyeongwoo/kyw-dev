import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ALL_TASKS_COMPLETE_MESSAGE,
  allocateNextTaskId,
  classifyDeliveryEvidence,
  evaluateDeliveryEvidence,
  inspectTaskQueue,
  parseTaskInvocation,
  resolveTaskDispatch,
} from "../src/core/task-artifacts.mjs";
import {
  TASK_CONTRACT_MARKER,
} from "../src/core/template-contracts.mjs";
import {
  formatTaskArtifactCliError,
  runTaskArtifactCommand,
} from "../skills/kyw-task/scripts/task-artifacts.mjs";

test("all-complete dispatch message remains the exact product phrase", () => {
  assert.equal(
    ALL_TASKS_COMPLETE_MESSAGE,
    "현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?",
  );
});

function pairStatus(taskStatus) {
  return {
    DRAFT: "DRAFT",
    READY: "READY",
    IN_PROGRESS: "RUNNING",
    DONE: "PASSED",
    BLOCKED: "BLOCKED",
    CANCELLED: "BLOCKED",
  }[taskStatus];
}

function taskMarkdown({
  id,
  title = `Task ${id}`,
  status = "READY",
  dependencies = "- Not applicable — no hard dependency is required for this outcome.",
  delivery = "STANDARD",
  releaseVersion,
  legacy = false,
  contractVersion = 3,
  blocker = "- None known.",
}) {
  const done = status === "DONE";
  const marker = legacy
    ? ""
    : `\n${contractVersion ? `<!-- kyw-task-contract: ${contractVersion} -->` : TASK_CONTRACT_MARKER}\n`;
  const deliverySection = legacy
    ? ""
    : `\n## Delivery\n\n${
        delivery === "STANDARD"
          ? `- Requirement: STANDARD${releaseVersion ? `\n- Release version: ${releaseVersion}` : ""}\n- Canonical ledger: GitHub PR/Actions exact-SHA state.`
          : `- Requirement: NONE — ${delivery}`
      }\n\nRepository outcome only; mutable delivery state is external.\n`;
  return `# TASK ${id} — ${title}
${marker}
## Status

${status}

## Goal

Exercise Task dispatch.

## Dependencies

${dependencies}

## In Scope

- Dispatch behavior.

## Out of Scope

- Production mutation.

## Acceptance Criteria

- [${done ? "x" : " "}] AC-01: Dispatch resolves correctly.

## Plan

- [${done ? "x" : " "}] Resolve the Task.

## Decisions

- Keep the fixture deterministic.

## Risks

- None known.

## Discoveries and Changes

- Not applicable — no discovery changed the fixture.

## Documentation Impact

- SPEC: Unaffected.
- ARCHITECTURE: Unaffected.
- README: Unaffected.
- AGENTS: Unaffected.
${deliverySection}
## Completed

- ${done ? "Repository outcome verified." : "Not complete."}

## Remaining

${done ? "- None — repository outcome complete." : "- Complete the fixture."}

## Resume Point

${done ? "- None — repository outcome complete." : "- Continue fixture execution."}

## Blockers

${blocker}
`;
}

function testMarkdown({
  id,
  title = `Task ${id}`,
  taskStatus = "READY",
  legacy = false,
  contractVersion = 3,
}) {
  const status = pairStatus(taskStatus);
  const passed = status === "PASSED";
  const blocked = status === "BLOCKED";
  const rowStatus = passed ? "PASS" : blocked ? "BLOCKED" : "TODO";
  const evidence = passed ? "Focused fixture passed." : blocked ? "Fixture is blocked." : "Not run.";
  const marker = legacy
    ? ""
    : `\n${contractVersion ? `<!-- kyw-task-contract: ${contractVersion} -->` : TASK_CONTRACT_MARKER}\n`;
  return `# TEST ${id} — ${title}
${marker}
## Status

${status}

## Test Basis

- Task: \`./TASK.md\`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 dispatch | Run resolver | Unit | ${rowStatus} | ${evidence} |

## Regression Coverage

- Queue selection.

## Commands

- Focused resolver.

## Results

- ${passed ? "Focused fixture passed." : "Not complete."}

## Unverified

- ${passed ? "Not applicable — no residual risk remains." : "Fixture remains open."}

## Final Coverage Review

- [${passed ? "x" : " "}] Compare the final diff to the matrix.
- [${passed ? "x" : " "}] Map every acceptance criterion to one or more test rows.
`;
}

async function createQueue(t, definitions) {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-task-dispatch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const definition of definitions) {
    await writePair(root, definition);
  }
  return root;
}

async function writePair(root, definition) {
  const directory = path.join(root, `${definition.id}-${definition.slug ?? `task-${definition.id}`}`);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, "TASK.md"), taskMarkdown(definition), "utf8"),
    writeFile(path.join(directory, "TEST.md"), testMarkdown({
      id: definition.id,
      title: definition.title,
      taskStatus: definition.status,
      legacy: definition.legacy,
      contractVersion: definition.contractVersion,
    }), "utf8"),
  ]);
}

function deliveredEntry({
  taskId = "0001",
  outcomeCharacter = "a",
  mergeCharacter = "b",
  baseCharacter = outcomeCharacter === "c" ? "e" : "c",
  syntheticCharacter = outcomeCharacter === "d" ? "f" : "d",
} = {}) {
  const outcomeSha = outcomeCharacter.repeat(40);
  const mergeSha = mergeCharacter.repeat(40);
  const baseSha = baseCharacter.repeat(40);
  const syntheticMergeSha = syntheticCharacter.repeat(40);
  const checkoutJob = (id, name, key, sha) => ({
    id,
    name,
    key,
    conclusion: "SUCCESS",
    expectedSha: sha,
    actualCheckoutSha: sha,
  });
  return {
    schemaVersion: 2,
    claim: "FINAL",
    source: "GITHUB",
    taskId,
    repository: "example/dispatch-fixture",
    outcomeSha,
    pullRequest: {
      number: 42,
      headSha: outcomeSha,
      baseRef: "main",
      baseSha,
      mergeSha,
      state: "MERGED",
      review: "CLEAR",
    },
    actualHead: {
      role: "PR_ACTUAL_HEAD",
      repository: "example/dispatch-fixture",
      event: "pull_request",
      pullRequestNumber: 42,
      workflowId: 314856028,
      workflowName: "CI",
      workflowPath: ".github/workflows/ci.yml",
      runId: 1001,
      runAttempt: 1,
      runHeadSha: outcomeSha,
      jobs: [
        checkoutJob(1101, "Behavioral / fixture", "behavioral", outcomeSha),
        checkoutJob(1102, "Quality / fixture", "quality", outcomeSha),
        checkoutJob(1103, "Packed release / fixture", "packed-release", outcomeSha),
      ],
      gateJob: {
        id: 1104,
        name: "Required / credential-free CI",
        key: "required",
        conclusion: "SUCCESS",
      },
    },
    mergeCompatibility: {
      role: "PR_MERGE_COMPATIBILITY",
      repository: "example/dispatch-fixture",
      event: "pull_request",
      pullRequestNumber: 42,
      workflowId: 314856028,
      workflowName: "CI",
      workflowPath: ".github/workflows/ci.yml",
      runId: 1001,
      runAttempt: 1,
      runHeadSha: outcomeSha,
      syntheticMergeSha,
      expectedBaseSha: baseSha,
      actualBaseParentSha: baseSha,
      expectedHeadSha: outcomeSha,
      actualHeadParentSha: outcomeSha,
      job: checkoutJob(
        1105,
        "Merge compatibility / fixture",
        "merge-compatibility",
        syntheticMergeSha,
      ),
    },
    merge: {
      repository: "example/dispatch-fixture",
      branch: "main",
      sha: mergeSha,
    },
    postMerge: {
      role: "POST_MERGE_MAIN",
      repository: "example/dispatch-fixture",
      event: "push",
      branch: "main",
      workflowId: 314856028,
      workflowName: "CI",
      workflowPath: ".github/workflows/ci.yml",
      runId: 1002,
      runAttempt: 1,
      runHeadSha: mergeSha,
      jobs: [
        checkoutJob(1201, "Behavioral / fixture", "behavioral", mergeSha),
        checkoutJob(1202, "Quality / fixture", "quality", mergeSha),
        checkoutJob(1203, "Packed release / fixture", "packed-release", mergeSha),
      ],
      gateJob: {
        id: 1204,
        name: "Required / credential-free CI",
        key: "required",
        conclusion: "SUCCESS",
      },
    },
  };
}

function deliveredExpectation({
  taskId = "0001",
  outcomeCharacter = "a",
  baseCharacter = outcomeCharacter === "c" ? "e" : "c",
} = {}) {
  return {
    schemaVersion: 2,
    source: "LOCAL_GIT",
    taskId,
    repository: "example/dispatch-fixture",
    baseRef: "main",
    baseSha: baseCharacter.repeat(40),
    outcomeSha: outcomeCharacter.repeat(40),
    deliveryContract: {
      kind: "HARDENED_EXACT_HEAD",
      version: 2,
      workflow: {
        id: 314856028,
        name: "CI",
        path: ".github/workflows/ci.yml",
      },
      actualHeadJobs: [
        "Behavioral / fixture",
        "Quality / fixture",
        "Packed release / fixture",
      ],
      mergeCompatibilityJob: "Merge compatibility / fixture",
      requiredGateJob: "Required / credential-free CI",
      postMergeJobs: [
        "Behavioral / fixture",
        "Quality / fixture",
        "Packed release / fixture",
      ],
    },
  };
}

test("anchored delivery syntax separates PR, merge, and exact release", () => {
  assert.equal(parseTaskInvocation("$kyw-deliver 0001").action, "PR");
  assert.equal(parseTaskInvocation("$kyw-deliver 0001 --merge").action, "MERGE");
  const release = parseTaskInvocation(`$kyw-deliver --release 1.2.3 --sha ${"a".repeat(40)}`);
  assert.equal(release.action, "PUBLIC_RELEASE");
  assert.equal(release.taskId, undefined);
  assert.equal(release.releaseVersion, "1.2.3");
  assert.equal(release.releaseSha, "a".repeat(40));
  for (const command of ["$kyw-deliver 0001 --public-release", "$kyw-deliver 0001 --merge extra", "$kyw-deliver --release 1.2.3", "README says $kyw-deliver 0001", "$kyw-deliver --release 1.2.3-rc.1 --sha " + "a".repeat(40)]) {
    assert.equal(parseTaskInvocation(command).recognized, false, command);
  }
  assert.equal(parseTaskInvocation("ordinary task prose").recognized, false);
  assert.equal(parseTaskInvocation("task 진행해줘").mode, "FALLBACK_REQUIRED");
  assert.equal(parseTaskInvocation("$kyw-impl 0001 use your design").overrideText, "use your design");
});

test("local dispatch ignores unrelated undelivered tasks, external outages, and remote drift", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "DONE", contractVersion: 4, releaseVersion: "1.2.3" },
    { id: "0002", status: "READY" },
  ]);
  let hydrationCalls = 0;
  const runtime = { hydratePriorStandardDeliveries() { hydrationCalls++; throw new Error("npm unavailable"); }, hydratePublicReleaseContext() { hydrationCalls++; throw new Error("offline"); } };
  const selected = await runTaskArtifactCommand(["dispatch", "--tasks-root", root, "--invocation", "$kyw-impl 0002", "--execution-preflight-json", JSON.stringify({remoteDrift: ["main ahead"]})], runtime);
  assert.equal(selected.outcome, "SELECTED");
  assert.equal(selected.task.id, "0002");
  assert.equal(hydrationCalls, 0);
  const terminal = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0001" });
  assert.equal(terminal.code, "TASK_COMPLETE");
  const next = await resolveTaskDispatch({ tasksRoot: root, invocation: "task 진행해줘", managedRoutingAvailable: true });
  assert.equal(next.task.id, "0002");
});

test("exact local dependency checks keep record status separate from worktree availability", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "IN_PROGRESS" },
    { id: "0002", status: "READY", dependencies: "- Task 0001." },
    { id: "0003", status: "READY" },
  ]);
  const implementationPath = path.join(root, "foundation.mjs");
  await writeFile(implementationPath, "export const foundation = true;\n");
  const selected = await runTaskArtifactCommand(["dispatch", "--tasks-root", root, "--invocation", "$kyw-impl 0002"], {
    hydratePriorStandardDeliveries() { throw new Error("Local selection must not read external state"); },
  });
  assert.equal(selected.outcome, "SELECTED");
  assert.deepEqual(selected.dependencyChecks, [{
    taskId: "0001", taskPath: path.join(root, "0001-task-0001", "TASK.md"),
    taskStatus: "IN_PROGRESS", availability: "UNVERIFIED",
  }]);
  assert.match(selected.dependencyGuidance, /Inspect.*current worktree/);
  assert.equal(selected.mergeAuthorized, false);
  assert.equal(selected.publicWriteAuthorized, false);
  assert.equal((await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0003" })).outcome, "SELECTED");
  await writePair(root, { id: "0001", status: "DONE" });
  await rm(implementationPath);
  const doneRecord = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0002" });
  assert.equal(doneRecord.outcome, "SELECTED");
  assert.equal(doneRecord.dependencyChecks[0].taskStatus, "DONE");
  assert.equal(doneRecord.dependencyChecks[0].availability, "UNVERIFIED");
});

test("automatic dispatch retains status eligibility without trusting free-form dependency IDs", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "BLOCKED" },
    { id: "0002", status: "READY", dependencies: "- Task 0001." },
  ]);
  for (const invocation of ["task 진행해줘", "남은 task 계속 실행해줘"]) {
    const result = await resolveTaskDispatch({ tasksRoot: root, invocation, managedRoutingAvailable: true, availableDependencyTaskIds: ["0001"] });
    assert.equal(result.code, "NO_SELECTABLE_TASK");
    assert.notEqual(result.outcome, "NO_WORK");
  }
  await writePair(root, { id: "0001", status: "IN_PROGRESS" });
  await writePair(root, { id: "0002", status: "IN_PROGRESS", dependencies: "- Task 0001." });
  const ambiguous = await resolveTaskDispatch({ tasksRoot: root, invocation: "task 진행해줘", managedRoutingAvailable: true });
  assert.equal(ambiguous.code, "AMBIGUOUS_ACTIVE_TASK");
});

test("exact local selection reports unrelated layout errors while global and delivery checks retain them", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "READY" },
    { id: "0002", status: "DONE" },
  ]);
  await mkdir(path.join(root, "archive"));
  await mkdir(path.join(root, "0009-first"));
  await mkdir(path.join(root, "0009-second"));
  await mkdir(path.join(root, "0010-INVALID"));
  const selected = await runTaskArtifactCommand(["dispatch", "--tasks-root", root, "--invocation", "$kyw-impl 0001"]);
  assert.equal(selected.outcome, "SELECTED");
  assert.match(selected.warnings.join("\n"), /archive/);
  assert.match(selected.warnings.join("\n"), /Task ID 0009/);
  assert.match(selected.warnings.join("\n"), /0010-INVALID/);
  assert.match((await inspectTaskQueue(root)).errors.join("\n"), /archive/);
  await assert.rejects(allocateNextTaskId(root), /archive/);
  assert.equal((await resolveTaskDispatch({ tasksRoot: root, invocation: "task 진행해줘", managedRoutingAvailable: true })).code, "INVALID_TASK_QUEUE");
  assert.equal((await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-deliver 0002" })).code, "INVALID_TASK_QUEUE");
});

test("exact selection rejects ambiguity and unsafe entries throughout its dependency closure", async (t) => {
  for (const relatedId of ["0001", "0002"]) {
    const root = await createQueue(t, [
      { id: "0001", status: "READY", dependencies: "- Task 0002." },
      { id: "0002", status: "DONE" },
    ]);
    const duplicate = path.join(root, `${relatedId}-duplicate`);
    await mkdir(duplicate);
    let result = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0001" });
    assert.equal(result.code, "INVALID_TASK_QUEUE");
    assert.match(result.message, new RegExp(`Task ID ${relatedId} is used by`));
    await rm(duplicate, { recursive: true });
    await mkdir(path.join(root, `${relatedId}-INVALID`));
    result = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0001" });
    assert.equal(result.code, "INVALID_TASK_QUEUE");
    assert.match(result.message, /INVALID is not a valid/);
  }
});

test("unrelated linked task paths are diagnostic while related links and cycles stay blocked", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "READY" },
    { id: "0002", status: "READY", dependencies: "- Task 0003." },
    { id: "0003", status: "READY", dependencies: "- Task 0002." },
  ]);
  const link = path.join(root, "0009-linked");
  await symlink(path.join(root, "0001-task-0001"), link, process.platform === "win32" ? "junction" : "dir");
  const selected = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0001" });
  assert.equal(selected.outcome, "SELECTED");
  assert.match(selected.warnings.join("\n"), /0009-linked is a symbolic link/);
  assert.equal((await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0009" })).code, "INVALID_TASK_QUEUE");
  const cyclic = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0002" });
  assert.equal(cyclic.code, "INVALID_TASK_QUEUE");
  assert.match(cyclic.message, /Hard dependency cycle/);
  await writePair(root, { id: "0003", status: "READY", dependencies: "- Task 0004." });
  const missing = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0002" });
  assert.equal(missing.code, "INVALID_TASK_QUEUE");
  assert.match(missing.message, /Task 0003 references missing hard dependency Task 0004/);
});

test("exact selection loads only its dependency closure and preserves legacy record bytes", async (t) => {
  const root = await createQueue(t, [{ id: "0001", status: "READY" }, { id: "0002", status: "READY" }]);
  const selectedPath = path.join(root, "0001-task-0001", "TASK.md");
  const before = await readFile(selectedPath);
  await writeFile(path.join(root, "0002-task-0002", "TASK.md"), "unfinished unrelated draft");
  assert.equal((await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-impl 0001" })).outcome, "SELECTED");
  assert.deepEqual(await readFile(selectedPath), before);
});

test("default delivery never invokes merge or public release and legacy contract 4 does not expand authority", async (t) => {
  const root = await createQueue(t, [{ id: "0001", status: "DONE", contractVersion: 4, releaseVersion: "1.2.3" }]);
  const calls = [];
  const runtime = { hydratePriorStandardDeliveries() { calls.push("history"); }, hydratePublicReleaseContext() { calls.push("release"); }, runPublicRelease() { calls.push("publish"); }, merge() { calls.push("merge"); } };
  const result = await runTaskArtifactCommand(["dispatch", "--tasks-root", root, "--invocation", "$kyw-deliver 0001"], runtime);
  assert.equal(result.action, "PR");
  assert.equal(result.mergeAuthorized, false);
  assert.equal(result.publicWriteAuthorized, false);
  assert.deepEqual(calls, []);
  const merge = await resolveTaskDispatch({ tasksRoot: root, invocation: "$kyw-deliver 0001 --merge" });
  assert.equal(merge.action, "MERGE");
  assert.equal(merge.mergeAuthorized, true);
  assert.equal(merge.publicWriteAuthorized, false);
  await assert.rejects(runTaskArtifactCommand(["public-release", "--tasks-root", root, "--invocation", "$kyw-deliver 0001"], runtime), /requires \$kyw-deliver --release/);
  assert.deepEqual(calls, []);
});

test("release routing is independent of Task directory and forwards exact identity and invocation", async () => {
  const invocation = `$kyw-deliver --release 1.2.3 --sha ${"a".repeat(40)}`;
  const calls = [];
  const tuple = { target: { mergeSha: "a".repeat(40) } };
  const result = await runTaskArtifactCommand(["public-release", "--invocation", invocation], {
    hydratePublicReleaseContext(options) { calls.push(options); return { tuple, standardDelivery: { releaseTarget: {} }, clients: {} }; },
    derivePublicReleasePlan() { return {outcome: "READY", nextStage: "NPM", mutationRequired: true}; },
    runPublicRelease(options) { calls.push(options); return { outcome: "COMPLETE", code: "MOCK_COMPLETE" }; },
  });
  assert.equal(result.outcome, "COMPLETE");
  assert.equal(calls[0].releaseVersion, "1.2.3");
  assert.equal(calls[0].releaseSha, "a".repeat(40));
  assert.equal(calls[0].taskId, undefined);
  assert.equal(calls[1].invocation, invocation);
});

test("preflight preserves user-work and unresolved conflict boundaries", async (t) => {
  const root = await createQueue(t, [{ id: "0001", status: "READY" }]);
  for (const executionPreflight of [{ conflicts: ["unresolved conflict"] }, { unexplainedUserWork: ["overlapping user edit"] }, { userOwnedDecisions: ["unknown deletion target"] }]) {
    assert.equal((await resolveTaskDispatch({tasksRoot: root, invocation: "$kyw-impl 0001", executionPreflight})).code, "PREFLIGHT_BLOCKED");
  }
});

test("historical exact-head evidence still rejects incomplete, mismatched, and failed graphs", () => {
  const entry = deliveredEntry();
  const expectation = deliveredExpectation();
  const evaluation = evaluateDeliveryEvidence("0001", entry, expectation);
  assert.equal(evaluation.satisfied, true);
  assert.equal(evaluation.classification, "HARDENED_EXACT_HEAD");
  assert.equal(evaluation.actualHead, "VERIFIED");
  assert.equal(evaluation.mergeCompatibility, "VERIFIED_SYNTHETIC");
  assert.equal(evaluation.postMerge, "VERIFIED_EXACT_CHECKOUT");
  assert.deepEqual(evaluation.issues, []);
  const finalClassification = classifyDeliveryEvidence(
    "0001",
    entry,
    expectation,
  );
  assert.equal(finalClassification.disposition, "SATISFIED");
  assert.equal(finalClassification.actualHead, "VERIFIED");
  assert.match(
    evaluateDeliveryEvidence("0001", entry).issues.join("\n"),
    /trusted local delivery expectations/,
  );
  for (const [label, mutate, pattern] of [
    ["expected source", (value) => { value.source = "GITHUB"; }, /expectation.source/],
    ["expected task", (value) => { value.taskId = "0002"; }, /expectation.taskId/],
    ["expected repository", (value) => { value.repository = "other/repository"; }, /repository must equal the trusted local expectation/],
    ["expected base", (value) => { value.baseRef = "release"; }, /pullRequest.baseRef/],
    ["expected outcome", (value) => { value.outcomeSha = "c".repeat(40); }, /outcomeSha must equal the trusted local expectation/],
    ["expected version", (value) => { value.schemaVersion = 3; }, /expectation.schemaVersion/],
    ["expected base SHA", (value) => { value.baseSha = "short"; }, /expectation.baseSha/],
    ["expected workflow", (value) => { value.deliveryContract.workflow.id = 0; }, /positive integer/],
    ["expected job set", (value) => { value.deliveryContract.actualHeadJobs.pop(); }, /required job set/],
    ["expected post job set", (value) => {
      value.deliveryContract.postMergeJobs.pop();
    }, /required job set/],
  ]) {
    const invalidExpectation = structuredClone(expectation);
    mutate(invalidExpectation);
    const evaluation = evaluateDeliveryEvidence("0001", entry, invalidExpectation);
    assert.equal(evaluation.satisfied, false, label);
    assert.match(evaluation.issues.join("\n"), pattern, label);
  }
  const invalidEvidenceCases = [
    ["schema version", (value) => { value.schemaVersion = 3; }, /schemaVersion/],
    ["final claim", (value) => { value.claim = "PENDING"; }, /claim/],
    ["source", (value) => { value.source = "LOCAL"; }, /source must equal "GITHUB"/],
    ["task", (value) => { value.taskId = "0002"; }, /taskId must equal "0001"/],
    ["repository", (value) => { value.repository = "missing-slash"; }, /owner\/name/],
    ["outcome SHA", (value) => { value.outcomeSha = "A".repeat(40); }, /outcomeSha/],
    ["PR number", (value) => { value.pullRequest.number = 0; }, /positive integer/],
    ["PR head", (value) => { value.pullRequest.headSha = "c".repeat(40); }, /headSha must equal/],
    ["PR base", (value) => { value.pullRequest.baseRef = ""; }, /baseRef/],
    ["PR base SHA", (value) => { value.pullRequest.baseSha = "short"; }, /baseSha/],
    ["trusted PR base drift", (value) => {
      const staleBaseSha = "9".repeat(40);
      value.pullRequest.baseSha = staleBaseSha;
      value.mergeCompatibility.expectedBaseSha = staleBaseSha;
      value.mergeCompatibility.actualBaseParentSha = staleBaseSha;
    }, /trusted local expectation/],
    ["PR merge SHA", (value) => { value.pullRequest.mergeSha = "c".repeat(40); }, /merge.sha/],
    ["PR state", (value) => { value.pullRequest.state = "OPEN"; }, /pullRequest.state/],
    ["PR review", (value) => { value.pullRequest.review = "CHANGES_REQUESTED"; }, /pullRequest.review/],
    ["actual role", (value) => { value.actualHead.role = "PR_MERGE_COMPATIBILITY"; }, /actualHead.role/],
    ["actual event", (value) => { value.actualHead.event = "push"; }, /actualHead.event/],
    ["actual workflow ID", (value) => { value.actualHead.workflowId = 7; }, /actualHead.workflowId/],
    ["actual workflow name", (value) => { value.actualHead.workflowName = "Other"; }, /actualHead.workflowName/],
    ["actual workflow path", (value) => { value.actualHead.workflowPath = "other.yml"; }, /actualHead.workflowPath/],
    ["actual run", (value) => { value.actualHead.runId = 0; }, /actualHead.runId/],
    ["actual attempt", (value) => { value.actualHead.runAttempt = 0; }, /actualHead.runAttempt/],
    ["actual run head", (value) => { value.actualHead.runHeadSha = "c".repeat(40); }, /runHeadSha/],
    ["actual expected checkout", (value) => { value.actualHead.jobs[0].expectedSha = "c".repeat(40); }, /expectedSha/],
    ["actual checkout", (value) => { value.actualHead.jobs[0].actualCheckoutSha = "c".repeat(40); }, /actualCheckoutSha/],
    ["actual job ID", (value) => { value.actualHead.jobs[0].id = 0; }, /positive integer/],
    ["actual job name", (value) => { value.actualHead.jobs[0].name = "Other"; }, /required job set/],
    ["actual job key", (value) => { value.actualHead.jobs[0].key = ""; }, /key/],
    ["actual missing lane", (value) => { value.actualHead.jobs.pop(); }, /required job set/],
    ["actual partial lane", (value) => {
      delete value.actualHead.jobs[0].actualCheckoutSha;
    }, /actualCheckoutSha/],
    ["actual missing gate", (value) => {
      delete value.actualHead.gateJob;
    }, /actualHead.gateJob evidence is required/],
    ["actual skipped gate", (value) => {
      value.actualHead.gateJob.conclusion = "SKIPPED";
    }, /must be SUCCESS/],
    ["merge role", (value) => { value.mergeCompatibility.role = "PR_ACTUAL_HEAD"; }, /mergeCompatibility.role/],
    ["merge attempt mismatch", (value) => {
      value.mergeCompatibility.runAttempt = 2;
    }, /mergeCompatibility.runAttempt/],
    ["merge missing job", (value) => {
      delete value.mergeCompatibility.job;
    }, /mergeCompatibility.job must be an object/],
    ["synthetic equals head", (value) => {
      value.mergeCompatibility.syntheticMergeSha = value.outcomeSha;
      value.mergeCompatibility.job.expectedSha = value.outcomeSha;
      value.mergeCompatibility.job.actualCheckoutSha = value.outcomeSha;
    }, /distinct from the actual PR head/],
    ["merge base parent", (value) => { value.mergeCompatibility.actualBaseParentSha = "e".repeat(40); }, /actualBaseParentSha/],
    ["merge head parent", (value) => { value.mergeCompatibility.actualHeadParentSha = "e".repeat(40); }, /actualHeadParentSha/],
    ["merge job reuse", (value) => { value.mergeCompatibility.job.id = value.actualHead.jobs[0].id; }, /reuse a job ID/],
    ["merge repository", (value) => { value.merge.repository = "other/repository"; }, /merge.repository/],
    ["merge branch", (value) => { value.merge.branch = "release"; }, /merge.branch/],
    ["merge SHA", (value) => { value.merge.sha = "short"; }, /merge.sha/],
    ["post event", (value) => { value.postMerge.event = "pull_request"; }, /postMerge.event/],
    ["post branch", (value) => { value.postMerge.branch = "release"; }, /postMerge.branch/],
    ["post workflow path", (value) => {
      value.postMerge.workflowPath = ".github/workflows/other.yml";
    }, /postMerge.workflowPath/],
    ["post attempt", (value) => { value.postMerge.runAttempt = 0; }, /postMerge.runAttempt/],
    ["post head", (value) => { value.postMerge.runHeadSha = "c".repeat(40); }, /postMerge.runHeadSha/],
    ["post run reuse", (value) => { value.postMerge.runId = value.actualHead.runId; }, /distinct from the pull-request run/],
    ["post checkout", (value) => { value.postMerge.jobs[0].actualCheckoutSha = "c".repeat(40); }, /actualCheckoutSha/],
    ["post missing lane", (value) => { value.postMerge.jobs.pop(); }, /required job set/],
    ["post partial lane", (value) => {
      delete value.postMerge.jobs[0].expectedSha;
    }, /expectedSha/],
    ["post missing gate", (value) => {
      delete value.postMerge.gateJob;
    }, /postMerge.gateJob evidence is required/],
    ["reused required gate", (value) => {
      value.postMerge.gateJob.id = value.actualHead.gateJob.id;
    }, /must not reuse a job ID/],
    ["reused post job", (value) => {
      value.postMerge.jobs[0].id = value.actualHead.jobs[0].id;
    }, /must not reuse a job ID/],
    ["unknown field", (value) => { value.syntheticOnly = true; }, /unknown field syntheticOnly/],
  ];
  for (const [label, mutate, pattern] of invalidEvidenceCases) {
    const invalid = structuredClone(entry);
    mutate(invalid);
    const evaluation = evaluateDeliveryEvidence("0001", invalid, expectation);
    assert.equal(evaluation.satisfied, false, label);
    assert.match(evaluation.issues.join("\n"), pattern, label);
  }


});

test("public-release adapter terminal errors are bounded and credential-redacted", () => {
  const formatted = formatTaskArtifactCliError(
    Object.assign(
      new Error(
        "Bearer ghp_abcdefghijklmnopqrstuvwxyz012345 token=npm_secret_abcdefghijklmnopqrstuvwxyz https://user:password@example.invalid/path",
      ),
      { code: "unsafe-secret-code" },
    ),
    "public-release",
  );
  assert.equal(formatted.code, "PUBLIC_RELEASE_FAILED");
  assert.doesNotMatch(formatted.message, /ghp_|npm_secret_|password/u);
  assert.ok(Buffer.byteLength(formatted.message, "utf8") < 16 * 1024);
});

test("PR 40 remains legacy synthetic compatibility with actual head unverified", () => {
  const outcomeSha = "c1a896e447020cd99d80079e770d95e9cd387474";
  const baseSha = "bc6cf87b2e391f14f39c95726d8d0e89dd58cbe9";
  const syntheticMergeSha = "e27468e27fab93a06c0a250278982751035dc4eb";
  const mergeSha = "4463051d2bd073048321b09f0b6524ea31fb8f80";
  const expectation = {
    schemaVersion: 2,
    source: "LOCAL_GIT",
    taskId: "0053",
    repository: "kimyeongwoo/kyw-dev",
    baseRef: "main",
    outcomeSha,
    deliveryContract: {
      kind: "LEGACY_PRE_CONTRACT",
      version: 1,
      eligibilitySource: "LOCAL_GIT_PRE_CONTRACT_HISTORY",
      contractAnchorSha: mergeSha,
      mergeSha,
    },
  };
  const entry = {
    schemaVersion: 1,
    claim: "FINAL",
    source: "GITHUB",
    taskId: "0053",
    repository: "kimyeongwoo/kyw-dev",
    outcomeSha,
    classification: "LEGACY_PRE_CONTRACT_CONTINUITY",
    actualHead: "UNVERIFIED",
    contractAnchorSha: mergeSha,
    pullRequest: {
      number: 40,
      headSha: outcomeSha,
      baseRef: "main",
      mergeSha,
      state: "MERGED",
      checks: "SUCCESS",
      review: "CLEAR",
      runId: 30263213789,
    },
    merge: {
      repository: "kimyeongwoo/kyw-dev",
      branch: "main",
      sha: mergeSha,
      mainRunHeadSha: mergeSha,
      checks: "SUCCESS",
      runId: 30263379563,
    },
    observedMergeCompatibility: {
      role: "PR_MERGE_COMPATIBILITY",
      runId: 30263213789,
      jobId: 89967727509,
      syntheticMergeSha,
      actualCheckoutSha: syntheticMergeSha,
      baseSha,
      headSha: outcomeSha,
      actualBaseParentSha: baseSha,
      actualHeadParentSha: outcomeSha,
    },
    observedPostMerge: {
      role: "POST_MERGE_MAIN",
      runId: 30263379563,
      jobId: 89968284743,
      expectedSha: mergeSha,
      actualCheckoutSha: mergeSha,
    },
  };

  const evaluation = evaluateDeliveryEvidence("0053", entry, expectation);
  assert.equal(evaluation.satisfied, true);
  assert.equal(evaluation.classification, "LEGACY_PRE_CONTRACT_CONTINUITY");
  assert.equal(evaluation.actualHead, "UNVERIFIED");
  assert.equal(evaluation.mergeCompatibility, "VERIFIED_SYNTHETIC");
  assert.equal(evaluation.postMerge, "VERIFIED_EXACT_CHECKOUT");
  assert.equal(
    classifyDeliveryEvidence("0053", entry, expectation).disposition,
    "SATISFIED",
  );

  const hardenedExpectation = deliveredExpectation({ taskId: "0053" });
  hardenedExpectation.repository = "kimyeongwoo/kyw-dev";
  hardenedExpectation.outcomeSha = outcomeSha;
  const cannotPromote = classifyDeliveryEvidence(
    "0053",
    entry,
    hardenedExpectation,
  );
  assert.equal(cannotPromote.disposition, "BLOCKED");
  assert.notEqual(cannotPromote.actualHead, "VERIFIED");
  assert.match(cannotPromote.issues.join("\n"), /does not match the trusted delivery contract/);

  const missingEligibility = structuredClone(expectation);
  delete missingEligibility.deliveryContract.contractAnchorSha;
  const missingEligibilityResult = classifyDeliveryEvidence(
    "0053",
    entry,
    missingEligibility,
  );
  assert.equal(missingEligibilityResult.disposition, "BLOCKED");
  assert.match(missingEligibilityResult.issues.join("\n"), /contractAnchorSha/);
});

test("queue dispatch rejects identity drift, an in-flight creation lock, and a symbolic-link root", async (t) => {
  const mismatchedRoot = await createQueue(t, [{ id: "0002", status: "READY" }]);
  const mismatchedDirectory = path.join(mismatchedRoot, "0002-task-0002");
  await Promise.all([
    writeFile(
      path.join(mismatchedDirectory, "TASK.md"),
      taskMarkdown({ id: "0001", status: "READY" }),
      "utf8",
    ),
    writeFile(
      path.join(mismatchedDirectory, "TEST.md"),
      testMarkdown({ id: "0001", taskStatus: "READY" }),
      "utf8",
    ),
  ]);
  const mismatched = await resolveTaskDispatch({
    tasksRoot: mismatchedRoot,
    invocation: "$kyw-impl 0002",
  });
  assert.equal(mismatched.code, "INVALID_TASK_QUEUE");
  assert.match(mismatched.message, /directory ID 0002 must match/);

  const duplicateRoot = await createQueue(t, [{ id: "0001", status: "READY" }]);
  await writeFile(
    path.join(duplicateRoot, "0001-task-0001", "TASK.md"),
    `${taskMarkdown({ id: "0001", status: "READY" })}\n## Status\n\nCANCELLED\n`,
    "utf8",
  );
  const duplicate = await resolveTaskDispatch({
    tasksRoot: duplicateRoot,
    invocation: "$kyw-impl 0001",
  });
  assert.equal(duplicate.code, "INVALID_TASK_QUEUE");
  assert.match(duplicate.message, /requires exactly one section "Status"/);

  const lockedRoot = await createQueue(t, [{ id: "0001", status: "READY" }]);
  await writeFile(path.join(lockedRoot, ".kyw-dev-task-create.lock"), "in flight", "utf8");
  const locked = await resolveTaskDispatch({
    tasksRoot: lockedRoot,
    invocation: "$kyw-impl 0001",
  });
  assert.equal(locked.code, "INVALID_TASK_QUEUE");
  assert.match(locked.message, /Task queue creation is locked/);

  const targetRoot = await createQueue(t, [{ id: "0001", status: "READY" }]);
  const linkParent = await mkdtemp(path.join(tmpdir(), "kyw-task-dispatch-link-"));
  t.after(() => rm(linkParent, { recursive: true, force: true }));
  const linkedRoot = path.join(linkParent, "tasks-link");
  await symlink(targetRoot, linkedRoot, process.platform === "win32" ? "junction" : "dir");
  const linked = await resolveTaskDispatch({
    tasksRoot: linkedRoot,
    invocation: "$kyw-impl 0001",
  });
  assert.equal(linked.code, "INVALID_TASK_QUEUE");
  assert.match(linked.message, /must not be a symbolic link/);
});


test("explicit check-ci uses the same exact-SHA current aggregate policy as publishing", async () => {
  const repository = "example/project";
  const sha = "a".repeat(40);
  const run = { id: 20, run_number: 5, run_attempt: 2, workflow_id: 10, repository: { full_name: repository }, head_repository: { full_name: repository }, event: "push", head_branch: "main", head_sha: sha, status: "completed", conclusion: "success", run_started_at: "2026-09-05T01:00:00Z" };
  const aggregate = { id: 30, run_id: 20, head_sha: sha, name: "Required / credential-free CI", status: "completed", conclusion: "success", started_at: "2026-09-05T01:10:00Z", completed_at: "2026-09-05T01:11:00Z", steps: [{name: "Validate selected CI results", status: "completed", conclusion: "success"}] };
  const reads = [];
  const readCi = async (apiPath) => {
    reads.push(apiPath);
    if (apiPath.endsWith("/workflows/ci.yml")) return { id: 10, path: ".github/workflows/ci.yml", state: "active" };
    if (apiPath.includes("/workflows/10/runs?")) return { total_count: 1, workflow_runs: [run] };
    if (apiPath.includes("/jobs?")) return { total_count: 1, jobs: [aggregate] };
    return run;
  };
  const args = ["check-ci", "--repository", repository, "--sha", sha];
  const result = await runTaskArtifactCommand(args, { readCi });
  assert.equal(result.proof.runAttempt, 2);
  assert.equal(result.proof.sha, sha);
  assert.equal(reads.filter((value) => value.includes("/workflows/10/runs?")).length, 2, "fresh recheck must not reuse an invocation cache");
  let attempts = 0;
  const delays = [];
  const recovered = await runTaskArtifactCommand(args, {
    delay: async (milliseconds) => { delays.push(milliseconds); },
    commandRunner: async (request) => {
      attempts += 1;
      if (attempts <= 2) return { status: 1, stderr: "gh: Service Unavailable (HTTP 503)" };
      return { status: 0, stdout: JSON.stringify(await readCi(request.args.at(-1))) };
    },
  });
  assert.equal(recovered.proof.sha, sha);
  assert.deepEqual(delays, [100, 200]);
  for (const [httpStatus, expectedAttempts] of [[408, 3], [429, 3], [500, 3], [502, 3], [503, 3], [504, 3], [401, 1], [403, 1], [404, 1], [422, 1]]) {
    attempts = 0;
    await assert.rejects(runTaskArtifactCommand(args, {
      delay: async () => {},
      commandRunner: async () => { attempts += 1; return { status: 1, stderr: `gh: fixture failure (HTTP ${httpStatus})` }; },
    }), /Canonical CI API read failed/);
    assert.equal(attempts, expectedAttempts, `HTTP ${httpStatus}`);
  }
  attempts = 0;
  await assert.rejects(runTaskArtifactCommand(args, {
    commandRunner: async () => { attempts += 1; return { status: 0, stdout: "invalid JSON" }; },
  }), /returned malformed JSON/);
  assert.equal(attempts, 1);
  aggregate.steps = [];
  await assert.rejects(runTaskArtifactCommand(args, { readCi }), /did not validate selected jobs/);
  await assert.rejects(runTaskArtifactCommand(args, { commandRunner: async () => ({ status: 1, stdout: "", stderr: "private token" }) }), /Canonical CI API read failed/);
});


test("check-ci accepts an exact fork PR source and retains source checks at every read boundary", async () => {
  const repository = "upstream/project";
  const headRepository = "contributor/project";
  const sha = "a".repeat(40);
  const branch = "feature";
  const baseRun = { id: 20, run_number: 5, run_attempt: 1, workflow_id: 10,
    repository: { full_name: repository }, head_repository: { full_name: headRepository },
    event: "pull_request", head_branch: branch, head_sha: sha, status: "completed", conclusion: "success", run_started_at: "2026-09-05T01:00:00Z" };
  function fixture(change = () => {}) {
    const state = { index: structuredClone(baseRun), detail: structuredClone(baseRun), attempt: structuredClone(baseRun), fresh: structuredClone(baseRun) };
    change(state);
    let indexes = 0;
    return async (apiPath) => {
      if (apiPath.endsWith("/workflows/ci.yml")) return { id: 10, path: ".github/workflows/ci.yml", state: "active" };
      if (apiPath.includes("/workflows/10/runs?")) return { total_count: 1, workflow_runs: [indexes++ ? state.fresh : state.index] };
      if (apiPath.includes("/jobs?")) return { total_count: 1, jobs: [{ id: 30, run_id: 20, head_sha: sha,
        name: "Required / credential-free CI", status: "completed", conclusion: "success", started_at: "2026-09-05T01:10:00Z", completed_at: "2026-09-05T01:11:00Z",
        steps: [{ name: "Validate selected CI results", status: "completed", conclusion: "success" }] }] };
      return apiPath.includes("/attempts/") ? state.attempt : state.detail;
    };
  }
  const args = ["check-ci", "--repository", repository, "--sha", sha, "--branch", branch, "--event", "pull_request", "--head-repository", headRepository];
  const result = await runTaskArtifactCommand(args, { readCi: fixture() });
  assert.equal(result.valid, true);
  assert.equal(result.proof.repository, repository);
  assert.equal(result.proof.headRepository, headRepository);
  for (const boundary of ["index", "detail", "attempt", "fresh"]) {
    await assert.rejects(runTaskArtifactCommand(args, {
      readCi: fixture((state) => { state[boundary].head_repository.full_name = "other/project"; }),
    }), /execution identity/, boundary);
  }
  for (const change of [
    (state) => { state.index.repository.full_name = "other/project"; },
    (state) => { state.index.head_sha = "b".repeat(40); },
    (state) => { state.index.event = "push"; },
  ]) await assert.rejects(runTaskArtifactCommand(args, { readCi: fixture(change) }), /execution identity/);
  const pushArgs = args.map((value) => value === "pull_request" ? "push" : value);
  await assert.rejects(runTaskArtifactCommand(pushArgs, { readCi: fixture() }), /Invalid exact workflow target/);
  await assert.rejects(runTaskArtifactCommand(pushArgs.slice(0, -2), {
    readCi: fixture((state) => { for (const run of Object.values(state)) run.event = "push"; }),
  }), /execution identity/);
  await assert.rejects(runTaskArtifactCommand(args.map((value) => value === "pull_request" ? "workflow_dispatch" : value), { readCi: fixture() }), /Invalid exact workflow target/);
});
