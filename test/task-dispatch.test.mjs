import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ALL_TASKS_COMPLETE_MESSAGE,
  evaluateDeliveryEvidence,
  parseTaskInvocation,
  resolveTaskDispatch,
} from "../src/core/task-artifacts.mjs";
import { TASK_CONTRACT_MARKER } from "../src/core/template-contracts.mjs";

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
  dependencies = "- None",
  delivery = "STANDARD",
  legacy = false,
  blocker = "- None known.",
}) {
  const done = status === "DONE";
  const marker = legacy ? "" : `\n${TASK_CONTRACT_MARKER}\n`;
  const deliverySection = legacy
    ? ""
    : `\n## Delivery\n\n${
        delivery === "STANDARD"
          ? "- Requirement: STANDARD\n- Canonical ledger: GitHub PR/Actions exact-SHA state."
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

- None.

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
}) {
  const status = pairStatus(taskStatus);
  const passed = status === "PASSED";
  const blocked = status === "BLOCKED";
  const rowStatus = passed ? "PASS" : blocked ? "BLOCKED" : "TODO";
  const evidence = passed ? "Focused fixture passed." : blocked ? "Fixture is blocked." : "Not run.";
  const marker = legacy ? "" : `\n${TASK_CONTRACT_MARKER}\n`;
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

- ${passed ? "None." : "Fixture remains open."}

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
    }), "utf8"),
  ]);
}

function deliveredEntry({
  taskId = "0001",
  outcomeCharacter = "a",
  mergeCharacter = "b",
} = {}) {
  const outcomeSha = outcomeCharacter.repeat(40);
  const mergeSha = mergeCharacter.repeat(40);
  return {
    source: "GITHUB",
    taskId,
    repository: "example/dispatch-fixture",
    outcomeSha,
    pullRequest: {
      number: 42,
      headSha: outcomeSha,
      baseRef: "main",
      mergeSha,
      state: "MERGED",
      checks: "SUCCESS",
      review: "CLEAR",
      runId: 1001,
    },
    merge: {
      repository: "example/dispatch-fixture",
      branch: "main",
      sha: mergeSha,
      mainRunHeadSha: mergeSha,
      checks: "SUCCESS",
      runId: 1002,
    },
  };
}

function deliveredExpectation({
  taskId = "0001",
  outcomeCharacter = "a",
} = {}) {
  return {
    source: "LOCAL_GIT",
    taskId,
    repository: "example/dispatch-fixture",
    baseRef: "main",
    outcomeSha: outcomeCharacter.repeat(40),
  };
}

test("anchored invocation parsing preserves overrides and rejects incidental task text", () => {
  assert.deepEqual(parseTaskInvocation("$kyw-task 0042 verify only the parser"), {
    recognized: true,
    mode: "EXACT",
    source: "PORTABLE_SKILL",
    taskId: "0042",
    overrideText: "verify only the parser",
    overrideScope: "FIRST_SELECTED_TASK",
  });
  assert.equal(
    parseTaskInvocation("task 0042 실행해줘", { managedRoutingAvailable: true }).mode,
    "EXACT",
  );
  assert.deepEqual(
    parseTaskInvocation("task 0042 실행해줘 preserve this constraint", {
      managedRoutingAvailable: true,
    }),
    {
      recognized: true,
      mode: "EXACT",
      source: "MANAGED_ALIAS",
      taskId: "0042",
      overrideText: "preserve this constraint",
      overrideScope: "FIRST_SELECTED_TASK",
    },
  );
  assert.equal(
    parseTaskInvocation("task 진행해줘", { managedRoutingAvailable: true }).mode,
    "NEXT",
  );
  assert.equal(
    parseTaskInvocation("남은 task 계속 실행해줘", { managedRoutingAvailable: true }).mode,
    "CONTINUOUS",
  );
  for (const incidental of [
    "Please update this task description.",
    "please task 진행해줘",
    "prefix $kyw-task 0042",
    " task 0042 실행해줘",
    "task 진행해줘.",
    "task 42 실행해줘",
    "$kyw-task 00420",
    "$kyw-task 0042.",
  ]) {
    assert.deepEqual(parseTaskInvocation(incidental, { managedRoutingAvailable: true }), {
      recognized: false,
      mode: "NONE",
    });
  }

  const fallback = parseTaskInvocation("task 0042 실행해줘 preserve this constraint");
  assert.equal(fallback.mode, "FALLBACK_REQUIRED");
  assert.equal(fallback.overrideText, "preserve this constraint");
  assert.equal(fallback.portableFallback, "$kyw-task 0042 preserve this constraint");
  assert.equal(
    parseTaskInvocation("task 진행해줘 focused only").portableFallback,
    "$kyw-task NNNN focused only",
  );
  assert.equal(
    parseTaskInvocation("남은 task 계속 실행해줘 every remaining Task").portableFallback,
    "$kyw-task NNNN every remaining Task",
  );
});

test("exact READY selection is confirmation and legacy terminal dependencies remain satisfied", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "DONE", legacy: true },
    { id: "0002", status: "READY", dependencies: "- Task 0001." },
  ]);
  const result = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "$kyw-task 0002 verify the focused path",
  });
  assert.equal(result.outcome, "SELECTED");
  assert.equal(result.task.id, "0002");
  assert.equal(result.confirmation, true);
  assert.equal(result.overrideText, "verify the focused path");
  assert.equal(result.overrideScope, "FIRST_SELECTED_TASK");
});

test("exact dispatch can resume DRAFT authoring and recheck a recorded blocker without authorizing implementation", async (t) => {
  const draftRoot = await createQueue(t, [{ id: "0001", status: "DRAFT" }]);
  const draft = await resolveTaskDispatch({
    tasksRoot: draftRoot,
    invocation: "$kyw-task 0001",
  });
  assert.equal(draft.outcome, "SELECTED");
  assert.equal(draft.action, "AUTHOR");
  assert.equal(draft.confirmation, false);

  const blockedRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", blocker: "- Required fixture is unavailable." },
  ]);
  const blocked = await resolveTaskDispatch({
    tasksRoot: blockedRoot,
    invocation: "$kyw-task 0001",
  });
  assert.equal(blocked.outcome, "SELECTED");
  assert.equal(blocked.action, "RECHECK_BLOCKER");
  assert.match(blocked.blocker, /Required fixture is unavailable/);
});

test("automatic dispatch resumes one active Task and fails closed on multiple active Tasks", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "IN_PROGRESS" },
    { id: "0002", status: "READY" },
  ]);
  const resumed = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(resumed.outcome, "SELECTED");
  assert.equal(resumed.task.id, "0001");
  assert.equal(resumed.confirmation, false);

  await writePair(root, { id: "0003", status: "IN_PROGRESS" });
  const conflict = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(conflict.outcome, "BLOCKED");
  assert.equal(conflict.code, "MULTIPLE_ACTIVE_TASKS");
});

test("automatic dispatch uses literal hard dependencies and the lowest satisfied READY Task", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "DONE", delivery: "local fixture" },
    {
      id: "0002",
      status: "READY",
      dependencies: "- Task 0001.\n- Tasks 9999 through 9998 are explanatory prose.",
    },
    { id: "0003", status: "READY" },
  ]);
  const result = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(result.outcome, "SELECTED");
  assert.equal(result.task.id, "0002");
  assert.deepEqual(result.task.dependencies, ["0001"]);
});

test("missing dependencies, cycles, and required blockers fail closed without freezing unrelated work", async (t) => {
  const missingRoot = await createQueue(t, [
    { id: "0001", status: "READY", dependencies: "- Task 9999." },
  ]);
  const missing = await resolveTaskDispatch({
    tasksRoot: missingRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(missing.code, "INVALID_TASK_QUEUE");
  assert.match(missing.message, /missing hard dependency Task 9999/);

  const cycleRoot = await createQueue(t, [
    { id: "0001", status: "READY", dependencies: "- Task 0002." },
    { id: "0002", status: "READY", dependencies: "- Task 0001." },
  ]);
  const cycle = await resolveTaskDispatch({
    tasksRoot: cycleRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(cycle.code, "INVALID_TASK_QUEUE");
  assert.match(cycle.message, /Hard dependency cycle/);

  const historicalRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", legacy: true, blocker: "- Historical blocker." },
    { id: "0002", status: "READY" },
  ]);
  const unrelated = await resolveTaskDispatch({
    tasksRoot: historicalRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(unrelated.outcome, "SELECTED");
  assert.equal(unrelated.task.id, "0002");

  const requiredRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", legacy: true, blocker: "- Required blocker." },
    { id: "0002", status: "READY", dependencies: "- Task 0001." },
  ]);
  const required = await resolveTaskDispatch({
    tasksRoot: requiredRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(required.code, "NO_DEPENDENCY_SATISFIED_TASK");
  assert.match(required.message, /Required blocker/);
});

test("exact active and terminal Tasks cannot bypass unsatisfied hard dependencies", async (t) => {
  const activeRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", legacy: true, blocker: "- Dependency remains blocked." },
    { id: "0002", status: "IN_PROGRESS", dependencies: "- Task 0001." },
  ]);
  const active = await resolveTaskDispatch({
    tasksRoot: activeRoot,
    invocation: "$kyw-task 0002",
  });
  assert.equal(active.code, "UNSATISFIED_DEPENDENCY");
  assert.match(active.message, /Dependency remains blocked/);

  const terminalRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", legacy: true, blocker: "- Dependency remains blocked." },
    {
      id: "0002",
      status: "DONE",
      dependencies: "- Task 0001.",
      delivery: "local terminal fixture",
    },
  ]);
  const terminal = await resolveTaskDispatch({
    tasksRoot: terminalRoot,
    invocation: "$kyw-task 0002",
  });
  assert.equal(terminal.code, "UNSATISFIED_DEPENDENCY");
  assert.match(terminal.message, /Dependency remains blocked/);
});

test("continuous dispatch re-inspects serial state, gates transitions, and scopes overrides to the first Task", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "READY" },
    { id: "0002", status: "READY" },
  ]);
  const result = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "남은 task 계속 실행해줘 run only focused checks",
    managedRoutingAvailable: true,
  });
  assert.equal(result.outcome, "SELECTED");
  assert.equal(result.mode, "CONTINUOUS");
  assert.equal(result.continuous, true);
  assert.equal(result.task.id, "0001");
  assert.equal(result.overrideText, "run only focused checks");
  assert.equal(result.overrideScope, "FIRST_SELECTED_TASK");

  const resumedAfterSessionStop = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "남은 task 계속 실행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(resumedAfterSessionStop.task.id, "0001");
  assert.equal(resumedAfterSessionStop.overrideText, "");

  await writePair(root, { id: "0001", status: "DONE" });
  const pendingDelivery = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "남은 task 계속 실행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(pendingDelivery.outcome, "BLOCKED");
  assert.match(pendingDelivery.message, /Cannot advance past Task 0001|Task 0001 delivery/);

  const next = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "남은 task 계속 실행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": deliveredEntry() },
    deliveryExpectations: { "0001": deliveredExpectation() },
  });
  assert.equal(next.outcome, "SELECTED");
  assert.equal(next.task.id, "0002");
  assert.equal(next.overrideText, "");
});

test("exact GitHub ledger evidence gates terminal queue advancement and no-work messaging", async (t) => {
  const root = await createQueue(t, [{ id: "0001", status: "DONE" }]);
  const pending = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(pending.code, "DELIVERY_EVIDENCE_REQUIRED");

  const entry = deliveredEntry();
  const expectation = deliveredExpectation();
  assert.deepEqual(evaluateDeliveryEvidence("0001", entry, expectation), {
    satisfied: true,
    issues: [],
  });
  assert.match(
    evaluateDeliveryEvidence("0001", entry).issues.join("\n"),
    /trusted local delivery expectations/,
  );
  for (const [label, mutate, pattern] of [
    ["expected source", (value) => { value.source = "GITHUB"; }, /expectation.source/],
    ["expected task", (value) => { value.taskId = "0002"; }, /expectation.taskId/],
    ["expected repository", (value) => { value.repository = "other/repository"; }, /repository must equal the trusted local expectation/],
    ["expected base", (value) => { value.baseRef = "release"; }, /baseRef must equal the trusted local expectation/],
    ["expected outcome", (value) => { value.outcomeSha = "c".repeat(40); }, /outcomeSha must equal the trusted local expectation/],
  ]) {
    const invalidExpectation = structuredClone(expectation);
    mutate(invalidExpectation);
    const evaluation = evaluateDeliveryEvidence("0001", entry, invalidExpectation);
    assert.equal(evaluation.satisfied, false, label);
    assert.match(evaluation.issues.join("\n"), pattern, label);
  }
  const invalidEvidenceCases = [
    ["source", (value) => { value.source = "LOCAL"; }, /source must be GITHUB/],
    ["task", (value) => { value.taskId = "0002"; }, /taskId must equal 0001/],
    ["repository", (value) => { value.repository = "missing-slash"; }, /owner\/name/],
    ["outcome SHA", (value) => { value.outcomeSha = "A".repeat(40); }, /outcomeSha/],
    ["PR number", (value) => { value.pullRequest.number = 0; }, /positive integer/],
    ["PR head", (value) => { value.pullRequest.headSha = "c".repeat(40); }, /headSha must equal/],
    ["PR base", (value) => { value.pullRequest.baseRef = ""; }, /baseRef is required/],
    ["PR merge SHA", (value) => { value.pullRequest.mergeSha = "c".repeat(40); }, /mergeSha must equal merge.sha/],
    ["PR state", (value) => { value.pullRequest.state = "OPEN"; }, /state must be MERGED/],
    ["PR checks", (value) => { value.pullRequest.checks = "FAILURE"; }, /checks must be SUCCESS/],
    ["PR review", (value) => { value.pullRequest.review = "CHANGES_REQUESTED"; }, /review must be CLEAR/],
    ["PR run", (value) => { value.pullRequest.runId = 0; }, /runId must be a positive integer/],
    ["merge repository", (value) => { value.merge.repository = "other/repository"; }, /merge.repository/],
    ["merge branch", (value) => { value.merge.branch = "release"; }, /merge.branch/],
    ["merge SHA", (value) => { value.merge.sha = "short"; }, /merge.sha/],
    ["main head", (value) => { value.merge.mainRunHeadSha = "c".repeat(40); }, /mainRunHeadSha/],
    ["main checks", (value) => { value.merge.checks = "FAILURE"; }, /checks must be SUCCESS/],
    ["main run", (value) => { value.merge.runId = 0; }, /runId must be a positive integer/],
  ];
  for (const [label, mutate, pattern] of invalidEvidenceCases) {
    const invalid = structuredClone(entry);
    mutate(invalid);
    const evaluation = evaluateDeliveryEvidence("0001", invalid, expectation);
    assert.equal(evaluation.satisfied, false, label);
    assert.match(evaluation.issues.join("\n"), pattern, label);
  }

  const inventoryBefore = (await readdir(root)).sort();
  const complete = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": entry },
    deliveryExpectations: { "0001": expectation },
  });
  assert.equal(complete.outcome, "NO_WORK");
  assert.equal(complete.message, ALL_TASKS_COMPLETE_MESSAGE);
  assert.deepEqual((await readdir(root)).sort(), inventoryBefore);

  const staleEntry = structuredClone(entry);
  staleEntry.pullRequest.headSha = "c".repeat(40);
  const stale = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": staleEntry },
    deliveryExpectations: { "0001": expectation },
  });
  assert.equal(stale.code, "DELIVERY_EVIDENCE_REQUIRED");
  assert.match(stale.message, /headSha must equal outcomeSha/);

  const independentRoot = await createQueue(t, [
    { id: "0001", status: "DONE" },
    { id: "0002", status: "DONE", delivery: "independent local fixture" },
  ]);
  const cannotSkip = await resolveTaskDispatch({
    tasksRoot: independentRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(cannotSkip.code, "QUEUE_TRANSITION_BLOCKED");
  assert.match(cannotSkip.message, /Cannot advance past Task 0001/);
  const allDelivered = await resolveTaskDispatch({
    tasksRoot: independentRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": deliveredEntry() },
    deliveryExpectations: { "0001": deliveredExpectation() },
  });
  assert.equal(allDelivered.outcome, "NO_WORK");
});

test("cancelled frontiers require standard delivery and unrelated historical blockers do not stop a later frontier", async (t) => {
  const cancelledRoot = await createQueue(t, [{ id: "0001", status: "CANCELLED" }]);
  const pending = await resolveTaskDispatch({
    tasksRoot: cancelledRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(pending.code, "DELIVERY_EVIDENCE_REQUIRED");
  const delivered = await resolveTaskDispatch({
    tasksRoot: cancelledRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": deliveredEntry() },
    deliveryExpectations: { "0001": deliveredExpectation() },
  });
  assert.equal(delivered.outcome, "NO_WORK");

  const dependencyRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", legacy: true, blocker: "- Required blocker." },
    {
      id: "0002",
      status: "CANCELLED",
      dependencies: "- Task 0001.",
      delivery: "cancelled locally",
    },
  ]);
  const dependencyBlocked = await resolveTaskDispatch({
    tasksRoot: dependencyRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(dependencyBlocked.code, "UNSATISFIED_DEPENDENCY");
  assert.match(dependencyBlocked.message, /Required blocker/);

  const blockedFrontierRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", blocker: "- Current frontier blocker." },
  ]);
  const blockedFrontier = await resolveTaskDispatch({
    tasksRoot: blockedFrontierRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(blockedFrontier.code, "QUEUE_FRONTIER_BLOCKED");
  assert.match(blockedFrontier.message, /Current frontier blocker/);

  const frontierRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", legacy: true, blocker: "- Unrelated blocker." },
    { id: "0002", status: "DONE", delivery: "local fixture" },
  ]);
  const frontier = await resolveTaskDispatch({
    tasksRoot: frontierRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(frontier.outcome, "NO_WORK");
  assert.equal(frontier.message, ALL_TASKS_COMPLETE_MESSAGE);
});

test("queue dispatch rejects header identity drift and a symbolic-link tasks root", async (t) => {
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
    invocation: "$kyw-task 0002",
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
    invocation: "$kyw-task 0001",
  });
  assert.equal(duplicate.code, "INVALID_TASK_QUEUE");
  assert.match(duplicate.message, /requires exactly one section "Status"/);

  const targetRoot = await createQueue(t, [{ id: "0001", status: "READY" }]);
  const linkParent = await mkdtemp(path.join(tmpdir(), "kyw-task-dispatch-link-"));
  t.after(() => rm(linkParent, { recursive: true, force: true }));
  const linkedRoot = path.join(linkParent, "tasks-link");
  await symlink(targetRoot, linkedRoot, process.platform === "win32" ? "junction" : "dir");
  const linked = await resolveTaskDispatch({
    tasksRoot: linkedRoot,
    invocation: "$kyw-task 0001",
  });
  assert.equal(linked.code, "INVALID_TASK_QUEUE");
  assert.match(linked.message, /must not be a symbolic link/);
});
