import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyLocalDeliveryContracts,
  createGitHubEvidenceClient,
  createInvocationCommandCache,
  discoverRequiredStandardDeliveries,
  evaluateDeliveryEvidence,
  hydratePriorStandardDeliveries,
  normalizeHardenedDeliveryEvidence,
  parseKywCiEvidence,
} from "../src/core/task-artifacts.mjs";
import { runTaskArtifactCommand } from "../skills/kyw-task/scripts/task-artifacts.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));

function task({
  id,
  status = "DONE",
  testStatus = status === "DONE" ? "PASSED" : status === "READY" ? "READY" : "RUNNING",
  delivery = "STANDARD",
  dependencies = [],
  contractVersion = 2,
}) {
  return {
    id,
    number: Number(id),
    taskStatus: status,
    testStatus,
    contractVersion,
    dependencies,
    deliveryRequirement:
      delivery === "STANDARD"
        ? { kind: "STANDARD" }
        : { kind: "NONE", reason: "fixture has no external delivery" },
  };
}

test("required delivery discovery is empty when the selected Task has no prior outcome", () => {
  const tasks = [task({ id: "0001", status: "READY" })];
  assert.deepEqual(
    discoverRequiredStandardDeliveries({
      tasks,
      invocation: "$kyw-impl 0001",
      managedRoutingAvailable: false,
    }).map(({ id }) => id),
    [],
  );
});

test("required delivery discovery follows queue transition and dependency truth", () => {
  const tasks = [
    task({ id: "0001" }),
    task({ id: "0002", delivery: "NONE" }),
    task({ id: "0003", status: "BLOCKED", testStatus: "BLOCKED" }),
    task({ id: "0004", dependencies: ["0001"] }),
    task({ id: "0005", status: "READY", dependencies: ["0004"] }),
    task({ id: "0006" }),
  ];
  assert.deepEqual(
    discoverRequiredStandardDeliveries({
      tasks,
      invocation: "$kyw-impl 0005",
      managedRoutingAvailable: false,
    }).map(({ id }) => id),
    ["0001", "0004"],
  );
});

test("legacy eligibility comes from ancestry around the hardened boundary, not Task numbers", async () => {
  const outcomes = [
    {
      taskId: "9000",
      baseSha: "a".repeat(40),
      outcomeSha: "b".repeat(40),
      mergeSha: "c".repeat(40),
      firstParentIndex: 1,
      hardenedWorkflow: false,
    },
    {
      taskId: "0001",
      baseSha: "c".repeat(40),
      outcomeSha: "d".repeat(40),
      mergeSha: "e".repeat(40),
      firstParentIndex: 2,
      hardenedWorkflow: true,
    },
  ];
  const ancestry = new Set([
    `${"b".repeat(40)}:${"c".repeat(40)}`,
    `${"c".repeat(40)}:${"c".repeat(40)}`,
    `${"c".repeat(40)}:${"e".repeat(40)}`,
  ]);
  const classified = await classifyLocalDeliveryContracts(outcomes, {
    currentMainSha: "e".repeat(40),
    isAncestor: async (ancestor, descendant) =>
      ancestor === descendant || ancestry.has(`${ancestor}:${descendant}`),
  });
  assert.equal(classified.contractAnchorSha, "c".repeat(40));
  assert.deepEqual(
    classified.outcomes.map(({ taskId, classification }) => [taskId, classification]),
    [
      ["9000", "LEGACY_PRE_CONTRACT"],
      ["0001", "HARDENED_EXACT_HEAD"],
    ],
  );
});

test("legacy-only and hardened-only histories derive their contract from ancestry and workflow truth", async () => {
  const legacy = await classifyLocalDeliveryContracts(
    [
      {
        taskId: "9001",
        baseSha: "1".repeat(40),
        outcomeSha: "2".repeat(40),
        mergeSha: "3".repeat(40),
        firstParentIndex: 1,
        hardenedWorkflow: false,
      },
    ],
    {
      currentMainSha: "4".repeat(40),
      isAncestor: async () => true,
    },
  );
  assert.equal(legacy.contractAnchorSha, "4".repeat(40));
  assert.equal(legacy.outcomes[0].classification, "LEGACY_PRE_CONTRACT");

  const hardened = await classifyLocalDeliveryContracts(
    [
      {
        taskId: "0001",
        baseSha: "5".repeat(40),
        outcomeSha: "6".repeat(40),
        mergeSha: "7".repeat(40),
        firstParentIndex: 1,
        hardenedWorkflow: true,
      },
    ],
    {
      currentMainSha: "7".repeat(40),
      isAncestor: async () => true,
    },
  );
  assert.equal(hardened.contractAnchorSha, "5".repeat(40));
  assert.equal(hardened.outcomes[0].classification, "HARDENED_EXACT_HEAD");
});

test("CI evidence parser ignores echoed commands and requires one emitted schema-2 record", () => {
  const sha = "a".repeat(40);
  const log = [
    "Job\tStep\t2026-01-01T00:00:00Z ^[[36;1mprintf 'KYWCIEVIDENCE schema=2 role=%s' \\^[[0m",
    `Job\tStep\t2026-01-01T00:00:01Z \u001b[36;1mKYWCIEVIDENCE schema=2 role=PR_ACTUAL_HEAD repository=owner/repo event=pull_request pr=7 workflow=CI run_id=11 run_attempt=1 job=behavioral expected_sha=${sha} actual_sha=${sha}\u001b[0m`,
  ].join("\n");
  assert.deepEqual(parseKywCiEvidence(log), {
    schema: 2,
    role: "PR_ACTUAL_HEAD",
    repository: "owner/repo",
    event: "pull_request",
    pr: "7",
    workflow: "CI",
    run_id: "11",
    run_attempt: "1",
    job: "behavioral",
    expected_sha: sha,
    actual_sha: sha,
  });
  assert.throws(
    () => parseKywCiEvidence("Job\tStep\tno emitted evidence"),
    /exactly one emitted KYWCIEVIDENCE record/,
  );
});

function hardenedFixture() {
  const repository = "owner/repository";
  const baseSha = "a".repeat(40);
  const outcomeSha = "b".repeat(40);
  const syntheticSha = "c".repeat(40);
  const mergeSha = "d".repeat(40);
  const workflow = { id: 71, name: "CI", path: ".github/workflows/ci.yml" };
  const names = [
    "Behavioral / fixture",
    "Quality / fixture",
    "Packed release / fixture",
  ];
  const workflowContract = {
    name: "CI",
    path: workflow.path,
    workflow,
    actualHeadJobs: names,
    postMergeJobs: [...names],
    mergeCompatibilityJob: "Merge compatibility / fixture",
    requiredGateJob: "Required / credential-free CI",
    jobKeys: {
      "Behavioral / fixture": "behavioral",
      "Quality / fixture": "quality",
      "Packed release / fixture": "packed-release",
      "Merge compatibility / fixture": "merge-compatibility",
      "Required / credential-free CI": "required",
    },
  };
  const outcome = {
    taskId: "0058",
    baseRef: "main",
    baseSha,
    outcomeSha,
    mergeSha,
    pullRequestNumber: 45,
    headRef: "task/0058-fixture",
    classification: "HARDENED_EXACT_HEAD",
    hardenedWorkflow: workflowContract,
  };
  const run = ({
    id,
    attempt,
    event,
    branch,
    sha,
  }) => ({
    id,
    runAttempt: attempt,
    workflowId: workflow.id,
    name: workflow.name,
    path: workflow.path,
    event,
    headBranch: branch,
    headSha: sha,
    status: "completed",
    conclusion: "success",
    pullRequestNumbers: event === "pull_request" ? [45] : [],
  });
  const prRun = run({
    id: 1001,
    attempt: 2,
    event: "pull_request",
    branch: outcome.headRef,
    sha: outcomeSha,
  });
  const postRun = run({
    id: 1002,
    attempt: 1,
    event: "push",
    branch: "main",
    sha: mergeSha,
  });
  const evidence = ({
    role,
    runValue,
    job,
    expectedSha,
    extras = {},
  }) => ({
    schema: 2,
    role,
    repository,
    event: role === "POST_MERGE_MAIN" ? "push" : "pull_request",
    pr: role === "POST_MERGE_MAIN" ? "0" : "45",
    workflow: "CI",
    run_id: String(runValue.id),
    run_attempt: String(runValue.runAttempt),
    job,
    expected_sha: expectedSha,
    actual_sha: expectedSha,
    ...extras,
  });
  let nextId = 2000;
  const job = ({ name, runValue, evidenceRecord }) => ({
    id: ++nextId,
    runId: runValue.id,
    runAttempt: runValue.runAttempt,
    name,
    headSha: runValue.headSha,
    status: "completed",
    conclusion: "success",
    ...(evidenceRecord ? { evidence: evidenceRecord } : {}),
  });
  const prJobs = names.map((name) =>
    job({
      name,
      runValue: prRun,
      evidenceRecord: evidence({
        role: "PR_ACTUAL_HEAD",
        runValue: prRun,
        job: workflowContract.jobKeys[name],
        expectedSha: outcomeSha,
      }),
    }),
  );
  prJobs.push(
    job({
      name: workflowContract.mergeCompatibilityJob,
      runValue: prRun,
      evidenceRecord: evidence({
        role: "PR_MERGE_COMPATIBILITY",
        runValue: prRun,
        job: "merge-compatibility",
        expectedSha: syntheticSha,
        extras: {
          expected_base_sha: baseSha,
          actual_base_sha: baseSha,
          expected_head_sha: outcomeSha,
          actual_head_sha: outcomeSha,
        },
      }),
    }),
    job({ name: workflowContract.requiredGateJob, runValue: prRun }),
  );
  const postJobs = names.map((name) =>
    job({
      name,
      runValue: postRun,
      evidenceRecord: evidence({
        role: "POST_MERGE_MAIN",
        runValue: postRun,
        job: workflowContract.jobKeys[name],
        expectedSha: mergeSha,
      }),
    }),
  );
  postJobs.push(job({ name: workflowContract.requiredGateJob, runValue: postRun }));
  return {
    outcome,
    repository,
    workflowContract,
    snapshot: {
      pullRequest: {
        number: 45,
        head: {
          sha: outcomeSha,
          ref: outcome.headRef,
          repo: { full_name: repository },
        },
        base: {
          sha: baseSha,
          ref: "main",
          repo: { full_name: repository },
        },
        merge_commit_sha: mergeSha,
        merged: true,
        draft: false,
      },
      reviews: [],
      pullRequestRun: prRun,
      pullRequestJobs: prJobs,
      syntheticCommit: {
        sha: syntheticSha,
        parents: [{ sha: baseSha }, { sha: outcomeSha }],
      },
      postMergeRun: postRun,
      postMergeJobs: postJobs,
      chronology: [
        {
          taskId: "0058",
          role: "PR_ATTEMPT",
          runId: 1001,
          runAttempt: 1,
          headSha: outcomeSha,
          status: "completed",
          conclusion: "failure",
        },
        {
          taskId: "0058",
          role: "PR_ATTEMPT",
          runId: 1001,
          runAttempt: 2,
          headSha: outcomeSha,
          status: "completed",
          conclusion: "success",
        },
      ],
    },
  };
}

function normalizeFixture(fixture) {
  return normalizeHardenedDeliveryEvidence(fixture);
}

test("complete hardened graph reaches the existing production evaluator", () => {
  const fixture = hardenedFixture();
  const normalized = normalizeFixture(fixture);
  const evaluation = evaluateDeliveryEvidence(
    fixture.outcome.taskId,
    normalized.entry,
    normalized.expectation,
  );
  assert.equal(evaluation.satisfied, true);
  assert.equal(evaluation.classification, "HARDENED_EXACT_HEAD");
  assert.deepEqual(
    normalized.chronology.map(({ runAttempt, conclusion }) => [
      runAttempt,
      conclusion,
    ]),
    [
      [1, "failure"],
      [2, "success"],
    ],
  );
});

function assertFixtureRejected(mutate, pattern) {
  const fixture = hardenedFixture();
  mutate(fixture);
  let message = "";
  try {
    const normalized = normalizeFixture(fixture);
    const evaluation = evaluateDeliveryEvidence(
      fixture.outcome.taskId,
      normalized.entry,
      normalized.expectation,
    );
    assert.equal(evaluation.satisfied, false);
    message = evaluation.issues.join("\n");
  } catch (error) {
    message = error.message;
  }
  assert.match(message, pattern);
  assert.match(message, /0058|actualHead|mergeCompatibility|postMerge/);
}

test("hardened normalization rejects stale, cross-attempt, role, job, and checkout evidence", () => {
  const mutations = [
    [
      (fixture) => {
        fixture.snapshot.pullRequest.head.sha = "e".repeat(40);
      },
      /Task 0058 PULL_REQUEST.*head SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequest.head.repo.full_name = "other/repository";
      },
      /Task 0058 PULL_REQUEST.*repository/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.path = ".github/workflows/other.yml";
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow path/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.workflowId = 72;
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow ID/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.name = "Other";
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow name/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.event = "push";
      },
      /Task 0058 PR_ACTUAL_HEAD.*event/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].runAttempt = 1;
      },
      /Task 0058 PR_ACTUAL_HEAD.*job run attempt/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].id = 0;
      },
      /Task 0058 PR_ACTUAL_HEAD.*job ID/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].name = "Other";
      },
      /Task 0058 PR_ACTUAL_HEAD.*Behavioral/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].evidence.job = "quality";
      },
      /Task 0058 PR_ACTUAL_HEAD.*job key/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].evidence.actual_sha = "e".repeat(40);
      },
      /Task 0058 PR_ACTUAL_HEAD.*actual checkout SHA/,
    ],
    [
      (fixture) => {
        delete fixture.snapshot.pullRequestJobs[0].evidence;
      },
      /Task 0058 PR_ACTUAL_HEAD.*checkout log evidence is missing/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs.splice(0, 1);
      },
      /Task 0058 PR_ACTUAL_HEAD.*Behavioral/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs.pop();
      },
      /Task 0058 PR_ACTUAL_HEAD.*Required/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeRun.id = 1001;
      },
      /Task 0058 POST_MERGE_MAIN.*distinct/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeRun.headSha = "e".repeat(40);
      },
      /Task 0058 POST_MERGE_MAIN.*run head SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequest.merge_commit_sha = "e".repeat(40);
      },
      /Task 0058 PULL_REQUEST.*merge SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.reviews.push({
          user: { login: "reviewer" },
          state: "CHANGES_REQUESTED",
          submitted_at: "2026-01-01T00:00:00Z",
        });
      },
      /Task 0058 PULL_REQUEST.*CHANGES_REQUESTED/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeJobs[0].id =
          fixture.snapshot.pullRequestJobs[0].id;
      },
      /reuse a job ID/,
    ],
  ];
  for (const [mutate, pattern] of mutations) assertFixtureRejected(mutate, pattern);
});

test("synthetic merge normalization requires one exact ordered base/head parent pair", () => {
  for (const parents of [
    [],
    ["a".repeat(40)],
    ["b".repeat(40), "a".repeat(40)],
    ["a".repeat(40), "b".repeat(40), "e".repeat(40)],
    ["e".repeat(40), "b".repeat(40)],
  ]) {
    assertFixtureRejected(
      (fixture) => {
        fixture.snapshot.syntheticCommit.parents = parents.map((sha) => ({ sha }));
      },
      /Task 0058 PR_MERGE_COMPATIBILITY.*exactly two ordered/,
    );
  }
});

test("invocation-local command cache deduplicates reads and redacts external failure detail", async () => {
  let calls = 0;
  const cache = createInvocationCommandCache({
    runner: () => {
      calls += 1;
      return { status: 0, stdout: "{\"ok\":true}", stderr: "" };
    },
  });
  const request = {
    command: "gh",
    args: ["api", "repos/owner/repository"],
    cwd: REPOSITORY_ROOT,
    taskId: "0058",
    role: "PULL_REQUEST",
  };
  await cache.run(request);
  await cache.run(request);
  assert.equal(calls, 1);
  assert.deepEqual(cache.stats(), {
    hits: 1,
    misses: 1,
    entries: 1,
    maxCommands: 512,
  });

  const failing = createInvocationCommandCache({
    runner: () => ({
      status: 1,
      stdout: "",
      stderr: "Bad credentials token=ghp_do_not_echo",
    }),
  });
  await assert.rejects(
    failing.run(request),
    (error) =>
      /authentication failure/.test(error.message) &&
      !error.message.includes("ghp_do_not_echo"),
  );
});

test("GitHub adapter fails closed on malformed JSON and partial pagination", async () => {
  const malformedCache = createInvocationCommandCache({
    runner: () => ({ status: 0, stdout: "{", stderr: "" }),
  });
  const malformed = createGitHubEvidenceClient({
    repository: "owner/repository",
    repositoryRoot: REPOSITORY_ROOT,
    commandCache: malformedCache,
  });
  await assert.rejects(
    malformed.getWorkflow({ taskId: "0058", role: "GITHUB_WORKFLOW" }),
    /Task 0058 GITHUB_WORKFLOW.*malformed JSON/,
  );

  const partialCache = createInvocationCommandCache({
    runner: () => ({
      status: 0,
      stdout: JSON.stringify({ total_count: 2, workflow_runs: [{ id: 1 }] }),
      stderr: "",
    }),
  });
  const partial = createGitHubEvidenceClient({
    repository: "owner/repository",
    repositoryRoot: REPOSITORY_ROOT,
    commandCache: partialCache,
  });
  await assert.rejects(
    partial.listRuns(71, { event: "push" }, {
      taskId: "0058",
      role: "POST_MAIN_RUNS",
    }),
    /partial, malformed, or exceeds bound/,
  );
});

test("external command failure classes never expose raw GitHub diagnostics", async () => {
  for (const [stderr, pattern] of [
    ["gh is not logged into any GitHub hosts token=secret", /authentication failure/],
    ["API rate limit exceeded header=secret", /rate limit/],
    ["Resource not accessible by integration header=secret", /authorization failure/],
  ]) {
    const cache = createInvocationCommandCache({
      runner: () => ({ status: 1, stdout: "", stderr }),
    });
    await assert.rejects(
      cache.run({
        command: "gh",
        args: ["api", "repos/owner/repository"],
        cwd: REPOSITORY_ROOT,
        taskId: "0058",
        role: "GITHUB",
      }),
      (error) => pattern.test(error.message) && !error.message.includes("secret"),
    );
  }
  const timeout = createInvocationCommandCache({
    runner: () => ({
      status: null,
      stdout: "",
      stderr: "",
      error: Object.assign(new Error("timed out token=secret"), {
        code: "ETIMEDOUT",
      }),
    }),
  });
  await assert.rejects(
    timeout.run({
      command: "gh",
      args: ["api", "repos/owner/repository"],
      cwd: REPOSITORY_ROOT,
      taskId: "0058",
      role: "GITHUB",
    }),
    (error) => /timeout/.test(error.message) && !error.message.includes("secret"),
  );
});

test("no-prior hydration performs no local Git or GitHub collection", async () => {
  let localCalls = 0;
  const result = await hydratePriorStandardDeliveries({
    tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
    invocation: "$kyw-impl 0001",
    queueInspector: async () => ({
      tasks: [task({ id: "0001", status: "READY" })],
      errors: [],
    }),
    localDiscovery: async () => {
      localCalls += 1;
      throw new Error("must not be called");
    },
  });
  assert.equal(localCalls, 0);
  assert.deepEqual(result.diagnostics.requiredTaskIds, []);
  assert.deepEqual(result.deliveryLedger, {});
});

test("an old exact Task derives the legacy anchor from all completed STANDARD contracts", async () => {
  await assert.rejects(
    hydratePriorStandardDeliveries({
      tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
      invocation: "$kyw-impl 0030",
      queueInspector: async () => ({
        tasks: [
          task({ id: "0030" }),
          task({ id: "0054" }),
          task({ id: "0059", status: "READY" }),
        ],
        errors: [],
      }),
      localDiscovery: async ({ requiredTasks, contractTasks }) => {
        assert.deepEqual(requiredTasks.map(({ id }) => id), ["0030"]);
        assert.deepEqual(contractTasks.map(({ id }) => id), ["0030", "0054"]);
        throw new Error("anchor planning observed");
      },
    }),
    /anchor planning observed/,
  );
});

test("normal adapter hydrates before one dispatcher call and failure invokes none", async () => {
  const argumentsList = [
    "dispatch",
    "--tasks-root",
    path.join(REPOSITORY_ROOT, "docs", "tasks"),
    "--invocation",
    "$kyw-impl 0059",
    "--managed-routing",
    "false",
  ];
  const events = [];
  const success = await runTaskArtifactCommand(argumentsList, {
    hydratePriorStandardDeliveries: async () => {
      events.push("hydrate");
      return {
        deliveryLedger: {},
        deliveryExpectations: {},
        diagnostics: { requiredTaskIds: [] },
      };
    },
    resolveTaskDispatch: async () => {
      events.push("dispatch");
      return {
        outcome: "SELECTED",
        action: "IMPLEMENT",
        task: { id: "0059" },
      };
    },
  });
  assert.deepEqual(events, ["hydrate", "dispatch"]);
  assert.equal(success.outcome, "SELECTED");

  let dispatchCalls = 0;
  await assert.rejects(
    runTaskArtifactCommand(argumentsList, {
      hydratePriorStandardDeliveries: async () => {
        throw new Error("Task 0058 POST_MERGE_MAIN: timeout");
      },
      resolveTaskDispatch: async () => {
        dispatchCalls += 1;
      },
    }),
    /POST_MERGE_MAIN: timeout/,
  );
  assert.equal(dispatchCalls, 0);
});

test("manual delivery objects remain a low-level seam and bypass automatic hydration", async () => {
  let hydrationCalls = 0;
  let dispatchCalls = 0;
  await runTaskArtifactCommand(
    [
      "dispatch",
      "--tasks-root",
      path.join(REPOSITORY_ROOT, "docs", "tasks"),
      "--invocation",
      "$kyw-impl 0059",
      "--managed-routing",
      "false",
      "--delivery-ledger-json",
      "{}",
      "--delivery-expectations-json",
      "{}",
    ],
    {
      hydratePriorStandardDeliveries: async () => {
        hydrationCalls += 1;
      },
      resolveTaskDispatch: async () => {
        dispatchCalls += 1;
        return { outcome: "BLOCKED" };
      },
    },
  );
  assert.equal(hydrationCalls, 0);
  assert.equal(dispatchCalls, 1);
});

test(
  "live repository and GitHub hydration recovers the Tasks 0054-0058 hardened chain",
  { skip: process.env.KYW_LIVE_GITHUB_HYDRATION !== "1" },
  async () => {
    const hydrated = await hydratePriorStandardDeliveries({
      tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
      invocation: "$kyw-impl 0059",
    });
    const hardenedTaskIds = ["0054", "0055", "0056", "0057", "0058"];
    if (hydrated.deliveryLedger["0059"]) hardenedTaskIds.push("0059");
    assert.equal(
      hydrated.diagnostics.requiredTaskIds.length,
      hardenedTaskIds.length === 6 ? 29 : 28,
    );
    for (const taskId of hardenedTaskIds) {
      assert.equal(
        hydrated.diagnostics.classifications[taskId],
        "HARDENED_EXACT_HEAD",
      );
      assert.equal(
        evaluateDeliveryEvidence(
          taskId,
          hydrated.deliveryLedger[taskId],
          hydrated.deliveryExpectations[taskId],
        ).satisfied,
        true,
      );
    }
    assert.equal(
      hydrated.diagnostics.chronology.some(
        (entry) =>
          entry.taskId === "0055" &&
          entry.role === "POST_MAIN_ATTEMPT" &&
          entry.runAttempt === 1 &&
          entry.conclusion === "failure",
      ),
      true,
    );
  },
);
