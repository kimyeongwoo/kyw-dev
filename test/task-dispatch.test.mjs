import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ALL_TASKS_COMPLETE_MESSAGE,
  classifyDeliveryEvidence,
  evaluateDeliveryEvidence,
  parseTaskInvocation,
  resolveTaskDispatch,
} from "../src/core/task-artifacts.mjs";
import {
  TASK_CONTRACT_MARKER,
  TASK_TEST_STATUS_PAIRS,
} from "../src/core/template-contracts.mjs";

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

function legacyDeliveredExpectation({
  taskId = "0001",
  outcomeCharacter = "a",
  mergeCharacter = "b",
  anchorCharacter = "f",
} = {}) {
  return {
    schemaVersion: 2,
    source: "LOCAL_GIT",
    taskId,
    repository: "example/dispatch-fixture",
    baseRef: "main",
    outcomeSha: outcomeCharacter.repeat(40),
    deliveryContract: {
      kind: "LEGACY_PRE_CONTRACT",
      version: 1,
      eligibilitySource: "LOCAL_GIT_PRE_CONTRACT_HISTORY",
      contractAnchorSha: anchorCharacter.repeat(40),
      mergeSha: mergeCharacter.repeat(40),
    },
  };
}

function legacyDeliveredEntry({
  taskId = "0001",
  outcomeCharacter = "a",
  mergeCharacter = "b",
  anchorCharacter = "f",
} = {}) {
  const outcomeSha = outcomeCharacter.repeat(40);
  const mergeSha = mergeCharacter.repeat(40);
  return {
    schemaVersion: 1,
    claim: "FINAL",
    source: "GITHUB",
    taskId,
    repository: "example/dispatch-fixture",
    outcomeSha,
    classification: "LEGACY_PRE_CONTRACT_CONTINUITY",
    actualHead: "UNVERIFIED",
    contractAnchorSha: anchorCharacter.repeat(40),
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

function assertStandardAuthority(result, action) {
  assert.equal(result.outcome, "SELECTED");
  assert.equal(result.action, action);
  assert.equal(result.authoritySource, "RECOGNIZED_TASK_INVOCATION");
  assert.equal(result.authorityScope, "STANDARD_LIFECYCLE");
  assert.equal(result.standardDeliveryAuthorized, true);
  assert.equal(result.ceremonialConfirmationRequired, false);
  assert.equal(result.separateAuthorityBoundary, "NON_STANDARD_EXTERNAL_MUTATIONS");
}

test("anchored invocation parsing preserves overrides and rejects incidental task text", () => {
  assert.deepEqual(parseTaskInvocation("$kyw-impl 0042 verify only the parser"), {
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
    "prefix $kyw-impl 0042",
    " task 0042 실행해줘",
    "task 진행해줘.",
    "task 42 실행해줘",
    "$kyw-impl 00420",
    "$kyw-impl 0042.",
    "$kyw-task 0042",
  ]) {
    assert.deepEqual(parseTaskInvocation(incidental, { managedRoutingAvailable: true }), {
      recognized: false,
      mode: "NONE",
    });
  }

  const fallback = parseTaskInvocation("task 0042 실행해줘 preserve this constraint");
  assert.equal(fallback.mode, "FALLBACK_REQUIRED");
  assert.equal(fallback.overrideText, "preserve this constraint");
  assert.equal(fallback.portableFallback, "$kyw-impl 0042 preserve this constraint");
  assert.equal(
    parseTaskInvocation("task 진행해줘 focused only").portableFallback,
    "$kyw-impl NNNN focused only",
  );
  assert.equal(
    parseTaskInvocation("남은 task 계속 실행해줘 every remaining Task").portableFallback,
    "$kyw-impl NNNN every remaining Task",
  );
});

test("implementation-only dispatch guides missing and goal-style inputs without allocation", async (t) => {
  const root = await createQueue(t, []);
  const inventoryBefore = await readdir(root);

  const missing = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "$kyw-impl 0042",
  });
  assert.equal(missing.outcome, "BLOCKED");
  assert.equal(missing.code, "TASK_NOT_FOUND");
  assert.equal("action" in missing, false);
  assert.match(missing.message, /\$kyw-task "<outcome>"/);

  for (const invocation of ['$kyw-impl "new outcome"', "$kyw-task 0042"]) {
    const result = await resolveTaskDispatch({ tasksRoot: root, invocation });
    assert.equal(result.outcome, "NOT_TASK_INVOCATION", invocation);
    assert.equal(result.code, "NO_ANCHORED_IMPLEMENTATION_COMMAND", invocation);
    assert.equal(result.mutationRequired, false, invocation);
    assert.equal("action" in result, false, invocation);
    assert.match(result.message, /\$kyw-task "<outcome>"/, invocation);
  }

  assert.deepEqual(await readdir(root), inventoryBefore);
});

test("automatic implementation routing preserves exact guidance for a legacy-only queue", async (t) => {
  const root = await createQueue(t, [{ id: "0001", status: "READY", legacy: true }]);

  for (const invocation of ["task 진행해줘", "남은 task 계속 실행해줘"]) {
    const result = await resolveTaskDispatch({
      tasksRoot: root,
      invocation,
      managedRoutingAvailable: true,
    });
    assert.equal(result.outcome, "BLOCKED", invocation);
    assert.equal(result.code, "CURRENT_QUEUE_UNAVAILABLE", invocation);
    assert.match(result.message, /\$kyw-impl NNNN/, invocation);
    assert.doesNotMatch(result.message, /\$kyw-task/, invocation);
  }
});

test("exact READY selection is confirmation and legacy terminal dependencies remain satisfied", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "DONE", legacy: true },
    { id: "0002", status: "READY", dependencies: "- Task 0001." },
  ]);
  for (const [invocation, managedRoutingAvailable] of [
    ["$kyw-impl 0002 verify the focused path", false],
    ["task 0002 실행해줘 verify the focused path", true],
  ]) {
    const result = await resolveTaskDispatch({
      tasksRoot: root,
      invocation,
      managedRoutingAvailable,
    });
    assertStandardAuthority(result, "IMPLEMENT");
    assert.equal(result.task.id, "0002");
    assert.equal(result.confirmation, true);
    assert.equal(result.overrideText, "verify the focused path");
    assert.equal(result.overrideScope, "FIRST_SELECTED_TASK");
  }
});

test("exact implementation dispatch redirects DRAFT authoring and rechecks a recorded blocker", async (t) => {
  const draftRoot = await createQueue(t, [{ id: "0001", status: "DRAFT" }]);
  const draft = await resolveTaskDispatch({
    tasksRoot: draftRoot,
    invocation: "$kyw-impl 0001",
  });
  assert.equal(draft.outcome, "BLOCKED");
  assert.equal(draft.code, "DRAFT_AUTHORING_REQUIRED");
  assert.equal("confirmation" in draft, false);
  assert.equal("action" in draft, false);
  assert.match(draft.message, /\$kyw-task 0001/);

  const blockedRoot = await createQueue(t, [
    { id: "0001", status: "BLOCKED", blocker: "- Required fixture is unavailable." },
  ]);
  const blocked = await resolveTaskDispatch({
    tasksRoot: blockedRoot,
    invocation: "$kyw-impl 0001",
  });
  assert.equal(blocked.outcome, "SELECTED");
  assert.equal(blocked.action, "RECHECK_BLOCKER");
  assert.match(blocked.blocker, /Required fixture is unavailable/);
});

test("current status table is exhaustive across exact, next, and continuous dispatch", async (t) => {
  const rows = [
    {
      pair: ["DRAFT", "DRAFT"],
      status: "DRAFT",
      exact: { outcome: "BLOCKED", code: "DRAFT_AUTHORING_REQUIRED" },
      automatic: { outcome: "BLOCKED", code: "NO_SELECTABLE_TASK" },
    },
    {
      pair: ["READY", "READY"],
      status: "READY",
      exact: { outcome: "SELECTED", action: "IMPLEMENT" },
      automatic: { outcome: "SELECTED", action: "IMPLEMENT" },
    },
    {
      pair: ["IN_PROGRESS", "RUNNING"],
      status: "IN_PROGRESS",
      exact: { outcome: "SELECTED", action: "RESUME" },
      automatic: { outcome: "SELECTED", action: "RESUME" },
    },
    {
      pair: ["DONE", "PASSED"],
      status: "DONE",
      exact: { outcome: "TERMINAL", code: "TASK_COMPLETE" },
      automatic: { outcome: "NO_WORK", code: "ALL_TASKS_COMPLETE" },
    },
    {
      pair: ["BLOCKED", "BLOCKED"],
      status: "BLOCKED",
      blocker: "- Required fixture is unavailable.",
      exact: { outcome: "SELECTED", action: "RECHECK_BLOCKER" },
      automatic: { outcome: "BLOCKED", code: "QUEUE_FRONTIER_BLOCKED" },
    },
    {
      pair: ["CANCELLED", "BLOCKED"],
      status: "CANCELLED",
      exact: { outcome: "TERMINAL", code: "TASK_CANCELLED" },
      automatic: { outcome: "TERMINAL", code: "TASK_CANCELLED" },
    },
  ];
  assert.deepEqual(
    rows.map(({ pair }) => pair),
    TASK_TEST_STATUS_PAIRS.map((pair) => [...pair]),
  );

  for (const row of rows) {
    const root = await createQueue(t, [
      {
        id: "0001",
        status: row.status,
        blocker: row.blocker,
        delivery: "local status-table fixture",
      },
    ]);
    const exact = await resolveTaskDispatch({
      tasksRoot: root,
      invocation: "$kyw-impl 0001",
    });
    assert.equal(exact.outcome, row.exact.outcome, `${row.status} exact outcome`);
    if (row.exact.action) {
      assert.equal(exact.action, row.exact.action, `${row.status} exact action`);
    }
    if (row.exact.code) {
      assert.equal(exact.code, row.exact.code, `${row.status} exact code`);
    }

    for (const [invocation, expectedMode] of [
      ["task 진행해줘", "NEXT"],
      ["남은 task 계속 실행해줘", "CONTINUOUS"],
    ]) {
      const automatic = await resolveTaskDispatch({
        tasksRoot: root,
        invocation,
        managedRoutingAvailable: true,
      });
      assert.equal(
        automatic.outcome,
        row.automatic.outcome,
        `${row.status} ${expectedMode} outcome`,
      );
      if (row.automatic.action) {
        assert.equal(
          automatic.action,
          row.automatic.action,
          `${row.status} ${expectedMode} action`,
        );
      }
      if (row.automatic.code) {
        assert.equal(
          automatic.code,
          row.automatic.code,
          `${row.status} ${expectedMode} code`,
        );
      }
      if (automatic.outcome === "SELECTED") {
        assert.equal(automatic.mode, expectedMode, `${row.status} selected mode`);
      }
    }
  }
});

test("every non-highest current state prevents a false all-complete verdict", async (t) => {
  const rows = [
    {
      status: "DRAFT",
      expected: { outcome: "BLOCKED", code: "NO_SELECTABLE_TASK" },
    },
    {
      status: "READY",
      expected: { outcome: "SELECTED", action: "IMPLEMENT" },
    },
    {
      status: "IN_PROGRESS",
      expected: { outcome: "SELECTED", action: "RESUME" },
    },
    {
      status: "BLOCKED",
      blocker: "- Required fixture is unavailable.",
      expected: { outcome: "BLOCKED", code: "QUEUE_TRANSITION_BLOCKED" },
    },
    {
      status: "CANCELLED",
      expected: { outcome: "TERMINAL", code: "TASK_CANCELLED" },
    },
    {
      status: "DONE",
      delivery: "STANDARD",
      expected: { outcome: "SELECTED", action: "DELIVER" },
    },
  ];

  for (const row of rows) {
    const root = await createQueue(t, [
      {
        id: "0001",
        status: row.status,
        blocker: row.blocker,
        delivery: row.delivery ?? "local non-highest fixture",
      },
      { id: "0002", status: "DONE", delivery: "local terminal fixture" },
    ]);
    const result = await resolveTaskDispatch({
      tasksRoot: root,
      invocation: "task 진행해줘",
      managedRoutingAvailable: true,
    });
    assert.equal(result.outcome, row.expected.outcome, `${row.status} outcome`);
    if (row.expected.action) {
      assert.equal(result.action, row.expected.action, `${row.status} action`);
    }
    if (row.expected.code) {
      assert.equal(result.code, row.expected.code, `${row.status} code`);
    }
    assert.notEqual(result.code, "ALL_TASKS_COMPLETE", row.status);
    assert.notEqual(result.message, ALL_TASKS_COMPLETE_MESSAGE, row.status);
  }
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
  assertStandardAuthority(resumed, "RESUME");

  await writePair(root, { id: "0003", status: "IN_PROGRESS" });
  const conflict = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(conflict.outcome, "BLOCKED");
  assert.equal(conflict.code, "MULTIPLE_ACTIVE_TASKS");
});

test("verified execution preflight blockers stop routing before selection", async (t) => {
  const root = await createQueue(t, [{ id: "0001", status: "READY" }]);
  for (const [field, detail, pattern] of [
    ["conflicts", "merge conflict in src/core", /conflict: merge conflict/],
    ["unexplainedUserWork", "modified user-owned notes", /unexplained user work/],
    ["remoteDrift", "origin/main moved", /remote drift/],
    ["userOwnedDecisions", "choose a public API", /unresolved user-owned decision/],
  ]) {
    const result = await resolveTaskDispatch({
      tasksRoot: root,
      invocation: "task 진행해줘",
      managedRoutingAvailable: true,
      executionPreflight: { [field]: [detail] },
    });
    assert.equal(result.outcome, "BLOCKED", field);
    assert.equal(result.code, "PREFLIGHT_BLOCKED", field);
    assert.match(result.message, pattern, field);
  }
  const malformed = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    executionPreflight: { unexplainedUserWork: "not-an-array" },
  });
  assert.equal(malformed.code, "PREFLIGHT_BLOCKED");
  assert.match(malformed.message, /array of non-empty strings/);
  const inheritedName = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    executionPreflight: { constructor: [] },
  });
  assert.equal(inheritedName.code, "PREFLIGHT_BLOCKED");
  assert.match(inheritedName.message, /unknown field constructor/);
});

test("automatic dispatch uses canonical hard dependencies and the lowest satisfied READY Task", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "DONE", delivery: "local fixture" },
    {
      id: "0002",
      status: "READY",
      dependencies: "- Task 0001.",
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

test("current dependency grammar accepts only the canonical sentinel or canonical bullets", async (t) => {
  const accepted = [
    {
      label: "canonical sentinel",
      prerequisites: [],
      id: "0001",
      dependencies: "- Not applicable — no hard dependency is required for this outcome.",
      expected: [],
    },
    {
      label: "one canonical reference",
      prerequisites: [{ id: "0001", status: "DONE", delivery: "local prerequisite" }],
      id: "0002",
      dependencies: "- Task 0001.",
      expected: ["0001"],
    },
    {
      label: "one canonical reference per bullet",
      prerequisites: [
        { id: "0001", status: "DONE", delivery: "local prerequisite" },
        { id: "0002", status: "DONE", delivery: "local prerequisite" },
      ],
      id: "0003",
      dependencies: "- Task 0001.\n- Task 0002.",
      expected: ["0001", "0002"],
    },
  ];
  for (const row of accepted) {
    const root = await createQueue(t, [
      ...row.prerequisites,
      { id: row.id, status: "READY", dependencies: row.dependencies },
    ]);
    const result = await resolveTaskDispatch({
      tasksRoot: root,
      invocation: `$kyw-impl ${row.id}`,
    });
    assert.equal(result.outcome, "SELECTED", row.label);
    assert.deepEqual(result.task.dependencies, row.expected, row.label);
  }

  const rejected = [
    [
      "noncanonical no-dependency prose",
      "- Not applicable — the fixture has no hard Task dependency.",
    ],
    ["negated reference", "- This Task does not depend on Task 0001."],
    ["explanatory reference", "- Task 0001 is background context only."],
    ["multiple references in one bullet", "- Task 0001 and Task 0002."],
    ["duplicate reference", "- Task 0001.\n- Task 0001."],
    [
      "sentinel mixed with a reference",
      "- Not applicable — no hard dependency is required for this outcome.\n- Task 0001.",
    ],
    ["unreferenced explanatory bullet", "- Supporting context only."],
    ["blank line between bullets", "- Task 0001.\n\n- Task 0002."],
  ];
  for (const [label, dependencies] of rejected) {
    const root = await createQueue(t, [
      { id: "0001", status: "DONE", delivery: "local prerequisite" },
      { id: "0002", status: "READY", dependencies },
    ]);
    const result = await resolveTaskDispatch({
      tasksRoot: root,
      invocation: "$kyw-impl 0002",
    });
    assert.equal(result.outcome, "BLOCKED", label);
    assert.equal(result.code, "INVALID_TASK_QUEUE", label);
    assert.match(result.message, /Dependencies/, label);
  }
});

test("repository-complete current dependency prose remains readable without weakening open Tasks", async (t) => {
  const completedRoot = await createQueue(t, [
    { id: "0001", status: "DONE", delivery: "historical prerequisite" },
    {
      id: "0002",
      status: "DONE",
      dependencies: "- Task 0001 was the previously delivered prerequisite.",
      delivery: "historical completed artifact",
    },
  ]);
  const completed = await resolveTaskDispatch({
    tasksRoot: completedRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(completed.outcome, "NO_WORK");
  assert.equal(completed.code, "ALL_TASKS_COMPLETE");

  const openRoot = await createQueue(t, [
    { id: "0001", status: "DONE", delivery: "historical prerequisite" },
    {
      id: "0002",
      status: "READY",
      dependencies: "- Task 0001 was the previously delivered prerequisite.",
    },
  ]);
  const open = await resolveTaskDispatch({
    tasksRoot: openRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(open.outcome, "BLOCKED");
  assert.equal(open.code, "INVALID_TASK_QUEUE");
  assert.match(open.message, /Dependencies line 1/);
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
    invocation: "$kyw-impl 0002",
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
    invocation: "$kyw-impl 0002",
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
  assertStandardAuthority(result, "IMPLEMENT");

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
  assertStandardAuthority(pendingDelivery, "DELIVER");
  assert.equal(pendingDelivery.task.id, "0001");
  assert.equal(pendingDelivery.deliveryDisposition, "RESUMABLE");
  assert.match(pendingDelivery.message, /without ceremonial reconfirmation/);

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
  assertStandardAuthority(pending, "DELIVER");
  assert.equal(pending.task.id, "0001");
  const noEvidence = classifyDeliveryEvidence("0001");
  assert.equal(noEvidence.disposition, "RESUMABLE");
  assert.equal(noEvidence.classification, "PENDING");
  assert.equal(noEvidence.actualHead, "UNVERIFIED");

  const entry = deliveredEntry();
  const expectation = deliveredExpectation();
  const pendingWithExpectation = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryExpectations: { "0001": expectation },
  });
  assertStandardAuthority(pendingWithExpectation, "DELIVER");
  assert.equal(pendingWithExpectation.deliveryDisposition, "RESUMABLE");
  assert.equal(
    pendingWithExpectation.deliveryClassification,
    "HARDENED_EXACT_HEAD",
  );
  assert.equal(pendingWithExpectation.actualHeadEvidence, "UNVERIFIED");
  const pendingPullRequest = {
    schemaVersion: 2,
    claim: "PENDING",
    source: "GITHUB",
    taskId: "0001",
    repository: "example/dispatch-fixture",
    outcomeSha: "a".repeat(40),
    pullRequest: {
      number: 42,
      headSha: "a".repeat(40),
      baseRef: "main",
      baseSha: "c".repeat(40),
      state: "OPEN",
      review: "CLEAR",
    },
  };
  const pendingWithSnapshot = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": pendingPullRequest },
    deliveryExpectations: { "0001": expectation },
  });
  assertStandardAuthority(pendingWithSnapshot, "DELIVER");
  const pendingClassification = classifyDeliveryEvidence(
    "0001",
    pendingPullRequest,
    expectation,
  );
  assert.equal(pendingClassification.disposition, "RESUMABLE");
  assert.equal(pendingClassification.actualHead, "UNVERIFIED");
  const pendingMain = deliveredEntry();
  pendingMain.claim = "PENDING";
  delete pendingMain.postMerge;
  const pendingAfterMerge = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": pendingMain },
    deliveryExpectations: { "0001": expectation },
  });
  assertStandardAuthority(pendingAfterMerge, "DELIVER");
  assert.equal(pendingAfterMerge.actualHeadEvidence, "VERIFIED");
  assert.equal(
    pendingAfterMerge.mergeCompatibilityEvidence,
    "VERIFIED_SYNTHETIC",
  );
  assert.equal(pendingAfterMerge.postMergeEvidence, "UNVERIFIED");
  const pendingMainClassification = classifyDeliveryEvidence(
    "0001",
    pendingMain,
    expectation,
  );
  assert.equal(pendingMainClassification.disposition, "RESUMABLE");
  assert.equal(pendingMainClassification.actualHead, "VERIFIED");
  assert.equal(
    pendingMainClassification.mergeCompatibility,
    "VERIFIED_SYNTHETIC",
  );
  assert.equal(pendingMainClassification.postMerge, "UNVERIFIED");
  assert.equal(
    classifyDeliveryEvidence("0001", undefined, expectation).disposition,
    "RESUMABLE",
  );
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
  assert.equal(complete.deliveryDisposition, "SATISFIED");
  assert.equal(complete.mutationRequired, false);
  assert.equal("action" in complete, false);
  assert.deepEqual((await readdir(root)).sort(), inventoryBefore);

  const exactComplete = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "$kyw-impl 0001",
    deliveryLedger: { "0001": entry },
    deliveryExpectations: { "0001": expectation },
  });
  assert.equal(exactComplete.outcome, "TERMINAL");
  assert.equal(exactComplete.code, "TASK_COMPLETE");
  assert.equal(exactComplete.deliveryDisposition, "SATISFIED");
  assert.equal(exactComplete.mutationRequired, false);
  assert.equal("action" in exactComplete, false);

  const staleEntry = structuredClone(entry);
  staleEntry.pullRequest.headSha = "c".repeat(40);
  const stale = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": staleEntry },
    deliveryExpectations: { "0001": expectation },
  });
  assert.equal(stale.code, "DELIVERY_EVIDENCE_INVALID");
  assert.equal(stale.deliveryDisposition, "BLOCKED");
  assert.match(stale.message, /pullRequest.headSha/);

  const syntheticOnly = deliveredEntry();
  delete syntheticOnly.actualHead;
  const syntheticOnlyClassification = classifyDeliveryEvidence(
    "0001",
    syntheticOnly,
    expectation,
  );
  assert.equal(syntheticOnlyClassification.disposition, "BLOCKED");
  assert.equal(
    syntheticOnlyClassification.blockerCode,
    "DELIVERY_EVIDENCE_INVALID",
  );
  assert.equal(syntheticOnlyClassification.actualHead, "UNVERIFIED");
  assert.match(
    syntheticOnlyClassification.issues.join("\n"),
    /actualHead evidence is required/,
  );

  const unversionedCoarse = legacyDeliveredEntry();
  delete unversionedCoarse.schemaVersion;
  const unversionedClassification = classifyDeliveryEvidence(
    "0001",
    unversionedCoarse,
    expectation,
  );
  assert.equal(unversionedClassification.disposition, "BLOCKED");
  assert.match(unversionedClassification.issues.join("\n"), /schemaVersion/);

  const independentRoot = await createQueue(t, [
    { id: "0001", status: "DONE" },
    { id: "0002", status: "DONE", delivery: "independent local fixture" },
  ]);
  const cannotSkip = await resolveTaskDispatch({
    tasksRoot: independentRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assertStandardAuthority(cannotSkip, "DELIVER");
  assert.equal(cannotSkip.task.id, "0001");
  const allDelivered = await resolveTaskDispatch({
    tasksRoot: independentRoot,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: { "0001": deliveredEntry() },
    deliveryExpectations: { "0001": deliveredExpectation() },
  });
  assert.equal(allDelivered.outcome, "NO_WORK");
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

test("explicit legacy continuity advances the queue without claiming exact-head success", async (t) => {
  const root = await createQueue(t, [
    { id: "0001", status: "DONE" },
    { id: "0002", status: "READY" },
  ]);
  const legacyState = {
    deliveryLedger: { "0001": legacyDeliveredEntry() },
    deliveryExpectations: { "0001": legacyDeliveredExpectation() },
  };
  const terminal = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "$kyw-impl 0001",
    ...legacyState,
  });
  assert.equal(terminal.outcome, "TERMINAL");
  assert.equal(terminal.deliveryClassification, "LEGACY_PRE_CONTRACT_CONTINUITY");
  assert.equal(terminal.actualHeadEvidence, "UNVERIFIED");
  assert.notEqual(terminal.actualHeadEvidence, "VERIFIED");

  const next = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    ...legacyState,
  });
  assertStandardAuthority(next, "IMPLEMENT");
  assert.equal(next.task.id, "0002");
});

test("Task 0031 regression resumes delivery before Task 0032 without another approval", async (t) => {
  const root = await createQueue(t, [
    { id: "0030", status: "DONE" },
    { id: "0031", status: "DONE", dependencies: "- Task 0030." },
    { id: "0032", status: "READY", dependencies: "- Task 0031." },
  ]);
  const ledger30 = deliveredEntry({
    taskId: "0030",
    outcomeCharacter: "a",
    mergeCharacter: "b",
  });
  const expectation30 = deliveredExpectation({ taskId: "0030", outcomeCharacter: "a" });
  const sharedState = {
    deliveryLedger: { "0030": ledger30 },
    deliveryExpectations: { "0030": expectation30 },
  };

  for (const [invocation, managedRoutingAvailable] of [
    ["task 0031 실행해줘", true],
    ["task 진행해줘", true],
    ["$kyw-impl 0031", false],
  ]) {
    const result = await resolveTaskDispatch({
      tasksRoot: root,
      invocation,
      managedRoutingAvailable,
      ...sharedState,
    });
    assertStandardAuthority(result, "DELIVER");
    assert.equal(result.task.id, "0031");
    assert.equal(result.confirmation, false);
  }

  const ledger31 = deliveredEntry({
    taskId: "0031",
    outcomeCharacter: "c",
    mergeCharacter: "d",
  });
  const expectation31 = deliveredExpectation({ taskId: "0031", outcomeCharacter: "c" });
  const deliveredState = {
    deliveryLedger: { "0030": ledger30, "0031": ledger31 },
    deliveryExpectations: { "0030": expectation30, "0031": expectation31 },
  };
  const terminal = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "$kyw-impl 0031",
    ...deliveredState,
  });
  assert.equal(terminal.outcome, "TERMINAL");
  assert.equal(terminal.mutationRequired, false);

  const next = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    ...deliveredState,
  });
  assertStandardAuthority(next, "IMPLEMENT");
  assert.equal(next.task.id, "0032");
});

test("Task 0039 active, blocked, and pending delivery states protect Task 0032", async (t) => {
  const root = await createQueue(t, [
    { id: "0030", status: "DONE", delivery: "local prerequisite fixture" },
    { id: "0031", status: "DONE", delivery: "local prerequisite fixture" },
    {
      id: "0032",
      status: "READY",
      dependencies: "- Task 0031.\n- Task 0039.",
    },
    {
      id: "0039",
      status: "IN_PROGRESS",
      dependencies: "- Task 0030.\n- Task 0031.",
    },
  ]);
  const active = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assertStandardAuthority(active, "RESUME");
  assert.equal(active.task.id, "0039");

  await writePair(root, {
    id: "0039",
    status: "BLOCKED",
    dependencies: "- Task 0030.\n- Task 0031.",
    blocker: "- Required verification failed.",
  });
  const blocked = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assert.equal(blocked.outcome, "BLOCKED");
  assert.match(blocked.message, /Task 0039 is BLOCKED/);
  assert.notEqual(blocked.task?.id, "0032");

  await writePair(root, {
    id: "0039",
    status: "DONE",
    dependencies: "- Task 0030.\n- Task 0031.",
  });
  const pending = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
  });
  assertStandardAuthority(pending, "DELIVER");
  assert.equal(pending.task.id, "0039");

  const delivered = await resolveTaskDispatch({
    tasksRoot: root,
    invocation: "task 진행해줘",
    managedRoutingAvailable: true,
    deliveryLedger: {
      "0039": deliveredEntry({
        taskId: "0039",
        outcomeCharacter: "e",
        mergeCharacter: "f",
      }),
    },
    deliveryExpectations: {
      "0039": deliveredExpectation({ taskId: "0039", outcomeCharacter: "e" }),
    },
  });
  assertStandardAuthority(delivered, "IMPLEMENT");
  assert.equal(delivered.task.id, "0032");
});

test("supplied CI, review, and identity failures block delivery resume", async (t) => {
  const root = await createQueue(t, [{ id: "0001", status: "DONE" }]);
  const expectation = deliveredExpectation();
  const cases = [
    ["PR CI failure", "DELIVERY_BLOCKED", (entry) => { entry.actualHead.jobs[0].conclusion = "FAILURE"; }, /reports FAILURE/],
    ["PR CI skipped", "DELIVERY_EVIDENCE_INVALID", (entry) => { entry.actualHead.jobs[0].conclusion = "SKIPPED"; }, /must be SUCCESS/],
    ["merge compatibility failure", "DELIVERY_BLOCKED", (entry) => { entry.mergeCompatibility.job.conclusion = "FAILURE"; }, /reports FAILURE/],
    ["merge compatibility skipped", "DELIVERY_EVIDENCE_INVALID", (entry) => { entry.mergeCompatibility.job.conclusion = "SKIPPED"; }, /must be SUCCESS/],
    ["required PR gate failure", "DELIVERY_BLOCKED", (entry) => { entry.actualHead.gateJob.conclusion = "FAILURE"; }, /reports FAILURE/],
    ["review blocker", "DELIVERY_BLOCKED", (entry) => { entry.pullRequest.review = "CHANGES_REQUESTED"; }, /reports CHANGES_REQUESTED/],
    ["repository drift", "DELIVERY_EVIDENCE_INVALID", (entry) => { entry.repository = "other/repository"; }, /trusted local expectation/],
    ["base drift", "DELIVERY_EVIDENCE_INVALID", (entry) => { entry.pullRequest.baseRef = "release"; }, /pullRequest.baseRef/],
    ["outcome drift", "DELIVERY_EVIDENCE_INVALID", (entry) => { entry.outcomeSha = "c".repeat(40); }, /trusted local expectation/],
    ["head drift", "DELIVERY_EVIDENCE_INVALID", (entry) => { entry.pullRequest.headSha = "c".repeat(40); }, /pullRequest.headSha/],
    ["merge drift", "DELIVERY_EVIDENCE_INVALID", (entry) => { entry.postMerge.runHeadSha = "c".repeat(40); }, /postMerge.runHeadSha/],
    ["post-merge CI failure", "DELIVERY_BLOCKED", (entry) => { entry.postMerge.jobs[0].conclusion = "FAILURE"; }, /reports FAILURE/],
    ["post-merge CI skipped", "DELIVERY_EVIDENCE_INVALID", (entry) => { entry.postMerge.jobs[0].conclusion = "SKIPPED"; }, /must be SUCCESS/],
    ["required main gate failure", "DELIVERY_BLOCKED", (entry) => { entry.postMerge.gateJob.conclusion = "FAILURE"; }, /reports FAILURE/],
  ];

  for (const [label, expectedCode, mutate, pattern] of cases) {
    const entry = deliveredEntry();
    mutate(entry);
    const result = await resolveTaskDispatch({
      tasksRoot: root,
      invocation: "task 진행해줘",
      managedRoutingAvailable: true,
      deliveryLedger: { "0001": entry },
      deliveryExpectations: { "0001": expectation },
    });
    assert.equal(result.outcome, "BLOCKED", label);
    assert.equal(result.code, expectedCode, label);
    assert.equal(result.deliveryDisposition, "BLOCKED", label);
    assert.match(result.message, pattern, label);
  }
});

test("cancelled frontiers require standard delivery, stay distinct, and preserve historical isolation", async (t) => {
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
  assert.equal(delivered.outcome, "TERMINAL");
  assert.equal(delivered.code, "TASK_CANCELLED");
  assert.notEqual(delivered.message, ALL_TASKS_COMPLETE_MESSAGE);

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
