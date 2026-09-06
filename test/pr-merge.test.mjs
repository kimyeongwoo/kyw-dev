import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runTaskArtifactCommand } from "../skills/kyw-task/scripts/task-artifacts.mjs";
import { createPublicReleaseClients } from "../src/core/task-artifact-hydration.mjs";

const repository = "example/service";
const headSha = "a".repeat(40);
const baseSha = "b".repeat(40);
const mergeSha = "c".repeat(40);
const check = (overrides = {}) => ({ __typename: "CheckRun", id: "CR_test", name: "Build on target project",
  status: "COMPLETED", conclusion: "SUCCESS", isRequired: true,
  checkSuite: { app: { databaseId: 123, slug: "project-ci" } }, detailsUrl: "https://example.invalid/build", ...overrides });
const commit = (oid, nodes) => ({ oid, statusCheckRollup: nodes === null ? null : {
  contexts: { totalCount: nodes.length, pageInfo: { hasNextPage: false }, nodes } } });
function fixture() {
  const pr = { id: "PR_target", number: 42, url: `https://github.com/${repository}/pull/42`,
    state: "OPEN", isDraft: false, headRefOid: headSha, headRefName: "work/current-goal",
    headRepository: { nameWithOwner: "contributor/service" }, baseRefName: "develop", baseRefOid: baseSha,
    mergeable: "MERGEABLE", mergeStateStatus: "CLEAN", reviewDecision: "APPROVED",
    isMergeQueueEnabled: false, isInMergeQueue: false, autoMergeRequest: null, mergeCommit: null,
    commits: { nodes: [{ commit: commit(headSha, [check()]) }] }, potentialMergeCommit: null };
  const state = { pr, writes: [], reads: 0, beforeRead: null, write: null, unavailable: false };
  state.commandRunner = async (request) => {
    assert.equal(request.command, "gh");
    assert.equal(request.args[request.args.indexOf("--hostname") + 1], "github.com");
    assert.ok(request.args.includes("graphql"));
    const query = request.args.find((arg) => arg.startsWith("query=")).slice(6);
    assert.doesNotMatch(query, /ci\.yml|credential-free|Validate selected|enablePullRequestAutoMerge|jump:/);
    assert.equal(request.args.some((arg) => /--(?:admin|force|auto)/u.test(arg)), false);
    const fields = Object.fromEntries(request.args.filter((arg) => /^[a-z]+=/.test(arg) && !arg.startsWith("query=")).map((arg) => {
      const index = arg.indexOf("="); return [arg.slice(0, index), arg.slice(index + 1)];
    }));
    if (query.startsWith("mutation")) {
      state.writes.push({ query, fields });
      assert.equal(fields.id, "PR_target");
      assert.equal(fields.head, headSha);
      assert.match(query, /expectedHeadOid: \$head/);
      if (state.write) return state.write(request);
      if (pr.isMergeQueueEnabled) pr.isInMergeQueue = true;
      else { pr.state = "MERGED"; pr.mergeCommit = { oid: mergeSha }; pr.baseRefOid = mergeSha; }
      return { status: 0, stdout: JSON.stringify({ data: { accepted: {} } }) };
    }
    assert.deepEqual(fields, { owner: "example", name: "service", number: "42" });
    state.reads += 1;
    state.beforeRead?.(state.reads);
    if (state.unavailable) return { status: 1, stderr: "HTTP 403" };
    return { status: 0, stdout: JSON.stringify({ data: { repository: { nameWithOwner: repository, pullRequest: pr } } }) };
  };
  return state;
}
const argsFor = (operation, extra = []) => [operation, "--repository", repository, "--pr", "42",
  "--sha", headSha, "--base", "develop", "--base-sha", baseSha, ...extra];
const inspect = (state) => runTaskArtifactCommand(argsFor("check-pr"), { commandRunner: state.commandRunner });
const merge = (state, extra = ["--method", "squash"]) => runTaskArtifactCommand(argsFor("merge-pr",
  ["--invocation", "$kyw-deliver --merge", ...extra]), { commandRunner: state.commandRunner });

test("shared generic PR adapter merges another project's current fork head and non-main base without Task artifacts", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "kyw-generic-merge-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  const state = fixture();
  const result = await runTaskArtifactCommand(argsFor("merge-pr", ["--repository-root", repositoryRoot,
    "--invocation", "$kyw-deliver --merge", "--method", "squash"]), { commandRunner: state.commandRunner });
  assert.equal(result.outcome, "MERGED");
  assert.equal(result.mergeSha, mergeSha);
  assert.equal(result.proof.checkRole, "HEAD");
  assert.equal(result.proof.headRepository, "contributor/service");
  assert.equal(state.reads, 3);
  assert.equal(state.writes.length, 1);
  assert.equal(state.writes[0].fields.method, "SQUASH");
  assert.deepEqual(await readdir(repositoryRoot), []);
});

test("platform-accepted skip/neutral, nonrequired failure and no reported checks keep their actual meaning", async () => {
  for (const conclusion of ["SKIPPED", "NEUTRAL"]) {
    const state = fixture();
    state.pr.commits.nodes[0].commit = commit(headSha, [check({ conclusion })]);
    const result = await inspect(state);
    assert.equal(result.outcome, "READY");
    assert.equal(result.proof.checks[0].state, conclusion);
    assert.equal(result.proof.checks[0].execution, "NOT_PROVEN");
  }
  const optional = fixture();
  optional.pr.mergeStateStatus = "UNSTABLE";
  optional.pr.commits.nodes[0].commit = commit(headSha, [check(), check({ id: "optional", isRequired: false, conclusion: "FAILURE" })]);
  assert.equal((await merge(optional)).outcome, "MERGED");
  const optionalReview = fixture();
  optionalReview.pr.reviewDecision = "CHANGES_REQUESTED";
  assert.equal((await inspect(optionalReview)).proof.reviewDecision, "CHANGES_REQUESTED");
  for (const nodes of [[], null]) {
    const none = fixture();
    none.pr.reviewDecision = null;
    none.pr.commits.nodes[0].commit = commit(headSha, nodes);
    const result = await merge(none);
    assert.equal(result.outcome, "MERGED");
    assert.equal(result.proof.requiredChecksReported, 0);
    assert.equal(result.proof.policyEvidence, "GITHUB_MERGE_STATE");
    assert.equal(Object.hasOwn(result.proof, "noProtectionRules"), false);
  }
});

test("checks on the current test-merge commit satisfy that project's selected validation role", async () => {
  const state = fixture();
  state.pr.commits.nodes[0].commit = commit(headSha, [check({ conclusion: "FAILURE" })]);
  state.pr.commits.nodes[0].commit.statusCheckRollup.contexts.pageInfo.hasNextPage = true;
  state.pr.potentialMergeCommit = { ...commit(mergeSha, [check()]), parents: { nodes: [{ oid: baseSha }, { oid: headSha }] } };
  const result = await merge(state);
  assert.equal(result.outcome, "MERGED");
  assert.equal(result.proof.checkRole, "TEST_MERGE");
  assert.equal(result.proof.checkCommit, mergeSha);
});

test("required failures, missing/current evidence, wrong sources, reviews and unknown policy block with zero writes", async (t) => {
  const cases = {
    failure: (s) => { s.pr.commits.nodes[0].commit = commit(headSha, [check({ conclusion: "FAILURE" })]); },
    pending: (s) => { s.pr.commits.nodes[0].commit = commit(headSha, [check({ status: "QUEUED", conclusion: null })]); },
    cancelled: (s) => { s.pr.commits.nodes[0].commit = commit(headSha, [check({ conclusion: "CANCELLED" })]); },
    "skipped workflow pending": (s) => { s.pr.commits.nodes[0].commit = commit(headSha, [{ __typename: "StatusContext", id: "required-status", context: "Expected workflow", isRequired: true, state: "EXPECTED" }]); },
    "missing required check": (s) => { s.pr.commits.nodes[0].commit = commit(headSha, []); s.pr.mergeStateStatus = "BLOCKED"; },
    "wrong required source": (s) => { s.pr.commits.nodes[0].commit.statusCheckRollup.contexts.nodes[0].checkSuite.app.databaseId = 999; s.pr.mergeStateStatus = "BLOCKED"; },
    "same name different source": (s) => { s.pr.commits.nodes[0].commit = commit(headSha, [check(), check({ id: "other-source", conclusion: "FAILURE" })]); },
    "old head result": (s) => { s.pr.commits.nodes[0].commit.oid = "d".repeat(40); },
    "changed PR": (s) => { s.pr.number = 43; },
    "changed base": (s) => { s.pr.baseRefName = "other"; },
    "unknown merge state": (s) => { s.pr.mergeStateStatus = "UNKNOWN"; },
    "review required": (s) => { s.pr.reviewDecision = "REVIEW_REQUIRED"; s.pr.mergeStateStatus = "BLOCKED"; },
    "missing review data": (s) => { delete s.pr.reviewDecision; },
    "empty evidence and unknown policy": (s) => { s.pr.commits.nodes[0].commit = commit(headSha, null); s.pr.mergeStateStatus = "UNKNOWN"; },
    "incomplete page": (s) => { s.pr.commits.nodes[0].commit.statusCheckRollup.contexts.pageInfo.hasNextPage = true; },
    "old test merge": (s) => { s.pr.potentialMergeCommit = { ...commit(mergeSha, [check()]), parents: { nodes: [{ oid: "d".repeat(40) }, { oid: headSha }] } }; },
    "unavailable policy": (s) => { s.unavailable = true; },
    "head changed before merge": (s) => { s.beforeRead = (count) => { if (count === 2) s.pr.headRefOid = "d".repeat(40); }; },
    "checks changed before merge": (s) => { s.beforeRead = (count) => { if (count === 2) s.pr.mergeStateStatus = "BLOCKED"; }; },
    "base tip changed before merge": (s) => { s.beforeRead = (count) => { if (count === 2) s.pr.baseRefOid = "d".repeat(40); }; },
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, async () => {
    const state = fixture(); mutate(state);
    await assert.rejects(merge(state));
    assert.equal(state.writes.length, 0);
  });
});

test("check-pr rejects required reviews despite an accepted merge summary", async (t) => {
  for (const mergeStateStatus of ["CLEAN", "UNSTABLE", "HAS_HOOKS"]) await t.test(mergeStateStatus, async () => {
    const state = fixture();
    state.pr.reviewDecision = "REVIEW_REQUIRED";
    state.pr.mergeStateStatus = mergeStateStatus;
    await assert.rejects(inspect(state), { code: "PR_REQUIRED_REVIEWS_BLOCKED", message: /required review/i });
    assert.equal(state.reads, 1);
    assert.equal(state.writes.length, 0);
  });
});

test("merge-pr blocks required reviews on first and pre-write reads for direct merge and queue", async (t) => {
  for (const mergeStateStatus of ["CLEAN", "UNSTABLE"]) {
    for (const queue of [false, true]) {
      for (const blockedRead of [1, 2]) await t.test(`${mergeStateStatus}, ${queue ? "queue" : "direct"}, read ${blockedRead}`, async () => {
        const state = fixture();
        state.pr.mergeStateStatus = mergeStateStatus;
        state.pr.isMergeQueueEnabled = queue;
        state.beforeRead = (count) => { if (count === blockedRead) state.pr.reviewDecision = "REVIEW_REQUIRED"; };
        await assert.rejects(merge(state, queue ? [] : ["--method", "squash"]),
          { code: "PR_REQUIRED_REVIEWS_BLOCKED", message: /required review/i });
        assert.equal(state.reads, blockedRead);
        assert.equal(state.writes.length, 0);
      });
    }
  }
});

test("required reviews do not hide existing or concurrently observed effects or repeat writes", async () => {
  const effects = {
    MERGED: (pr) => { pr.state = "MERGED"; pr.mergeCommit = { oid: mergeSha }; },
    QUEUED: (pr) => { pr.isInMergeQueue = true; },
    AUTO_MERGE_SCHEDULED: (pr) => { pr.autoMergeRequest = { enabledAt: "2026-09-05T00:00:00Z" }; },
  };
  for (const [outcome, complete] of Object.entries(effects)) {
    const existing = fixture();
    existing.pr.isMergeQueueEnabled = outcome === "QUEUED";
    existing.pr.reviewDecision = "REVIEW_REQUIRED";
    complete(existing.pr);
    assert.equal((await inspect(existing)).outcome, outcome);
    const resumed = await merge(existing);
    assert.equal(resumed.outcome, outcome);
    assert.equal(resumed.mutationAttempted, false);
    assert.equal(existing.writes.length, 0);

    const concurrent = fixture();
    concurrent.pr.isMergeQueueEnabled = outcome === "QUEUED";
    concurrent.beforeRead = (count) => {
      if (count === 2) { concurrent.pr.reviewDecision = "REVIEW_REQUIRED"; complete(concurrent.pr); }
    };
    const observed = await merge(concurrent);
    assert.equal(observed.outcome, outcome);
    assert.equal(observed.mutationAttempted, false);
    assert.equal(concurrent.reads, 2);
    assert.equal(concurrent.writes.length, 0);
  }
});

test("merge queue enqueues directly with expected head, and never schedules auto-merge", async () => {
  const state = fixture(); state.pr.isMergeQueueEnabled = true;
  const result = await merge(state, []);
  assert.equal(result.outcome, "QUEUED");
  assert.match(state.writes[0].query, /enqueuePullRequest/);
  assert.equal(Object.hasOwn(state.writes[0].fields, "method"), false);
  const resumed = await merge(state, []);
  assert.equal(resumed.outcome, "QUEUED");
  assert.equal(resumed.mutationAttempted, false);
  assert.equal(state.writes.length, 1);
  const pending = fixture(); pending.pr.isMergeQueueEnabled = true; pending.pr.mergeStateStatus = "BLOCKED";
  await assert.rejects(merge(pending, []));
  assert.equal(pending.writes.length, 0);
  const scheduled = fixture(); scheduled.pr.autoMergeRequest = { enabledAt: "2026-09-05T00:00:00Z" };
  assert.equal((await merge(scheduled)).outcome, "AUTO_MERGE_SCHEDULED");
  assert.equal(scheduled.writes.length, 0);
});

test("lost merge response reconciles exact state once and never retries a write", async () => {
  for (const completed of [false, true]) {
    const state = fixture();
    state.write = () => {
      if (completed) { state.pr.state = "MERGED"; state.pr.mergeCommit = { oid: mergeSha }; }
      throw new Error("lost response");
    };
    const result = await merge(state);
    assert.equal(result.outcome, completed ? "MERGED" : "UNKNOWN");
    assert.equal(result.writeAccepted, false);
    assert.equal(state.writes.length, 1);
  }
});

test("merge adapter requires the exact merge action and retains ID compatibility", async () => {
  for (const invocation of ["$kyw-deliver", "please $kyw-deliver --merge", "$kyw-deliver --release 1.0.0 --sha " + headSha]) {
    const state = fixture();
    await assert.rejects(runTaskArtifactCommand(argsFor("merge-pr", ["--invocation", invocation, "--method", "merge"]), { commandRunner: state.commandRunner }));
    assert.equal(state.writes.length, 0);
    assert.equal(state.reads, 0);
  }
  const state = fixture();
  const result = await runTaskArtifactCommand(argsFor("merge-pr", ["--invocation", "$kyw-deliver 0042 --merge", "--method", "merge"]), { commandRunner: state.commandRunner });
  assert.equal(result.outcome, "MERGED");
  for (const prNumber of ["1e2", "0x42", "0", "-1", "42.0"]) {
    const invalid = fixture();
    const args = argsFor("check-pr");
    args[args.indexOf("--pr") + 1] = prNumber;
    await assert.rejects(runTaskArtifactCommand(args, { commandRunner: invalid.commandRunner }));
    assert.equal(invalid.reads, 0);
    assert.equal(invalid.writes.length, 0);
  }
});

test("actual built-in publisher mutators reject another repository before any read or write", async () => {
  const trace = [];
  const clients = createPublicReleaseClients({ repositoryRoot: process.cwd(),
    commandRunner: (request) => { trace.push(request); throw new Error("unexpected command"); },
    fetchImpl: (request) => { trace.push(request); throw new Error("unexpected HTTP"); } });
  for (const method of ["dispatchPublishWorkflow", "createTag", "createRelease"]) {
    await assert.rejects(clients[method]({ repository }), { code: "PUBLIC_RELEASE_REPOSITORY_UNSUPPORTED" });
  }
  assert.deepEqual(trace, []);
});
