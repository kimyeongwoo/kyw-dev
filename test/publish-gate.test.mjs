import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fetchRead, githubReader, publishWithCiGate, requireSafePublishAttempt, requireFrozenSigningKeys, PUBLISH_STEP } from "../scripts/publish-gate.mjs";

const sha = "a".repeat(40);
const repository = "kimyeongwoo/kyw-dev";
function fixture() {
  const metadata = { id: 10, path: ".github/workflows/ci.yml", state: "active" };
  const run = { id: 20, run_number: 5, run_attempt: 1, workflow_id: 10,
    repository: { full_name: repository }, head_repository: { full_name: repository },
    event: "push", head_branch: "main", head_sha: sha, status: "completed", conclusion: "success",
    run_started_at: "2026-09-05T01:00:00Z" };
  const aggregate = { id: 30, run_id: 20, run_attempt: 1, head_sha: sha,
    name: "Required / credential-free CI", status: "completed", conclusion: "success",
    started_at: "2026-09-05T01:10:00Z", completed_at: "2026-09-05T01:11:00Z",
    steps: [{ name: "Validate selected CI results", status: "completed", conclusion: "success" }] };
  const state = { metadata, runs: [run], run, jobs: [aggregate], afterRuns: undefined, indexExtra: 0 };
  let runReads = 0;
  state.read = async (path) => {
    if (path.endsWith("/workflows/ci.yml")) return state.metadata;
    if (path.includes("/workflows/10/runs?")) {
      const params = new URL(path, "https://api.github.com/").searchParams;
      assert.equal(params.get("head_sha"), sha);
      assert.equal(params.get("event"), "push");
      assert.equal(params.get("branch"), "main");
      assert.equal(params.has("status"), false, "must see later failed/in-progress runs");
      const runs = ++runReads > 1 && state.afterRuns ? state.afterRuns : state.runs;
      return { total_count: runs.length + state.indexExtra, workflow_runs: runs };
    }
    if (path === `repos/${repository}/actions/runs/20`) return state.run;
    if (path === `repos/${repository}/actions/runs/20/attempts/${state.run.run_attempt}`) return state.run;
    if (path === `repos/${repository}/actions/runs/20/attempts/${state.run.run_attempt}/jobs?per_page=100&page=1`) {
      return { total_count: state.jobs.length, jobs: state.jobs };
    }
    throw new Error(`Unexpected API query ${path}`);
  };
  return state;
}

test("only authoritative canonical main push success reaches the publisher", async () => {
  const state = fixture();
  let calls = 0;
  const proof = await publishWithCiGate({ read: state.read, sha }, () => { calls += 1; });
  assert.equal(calls, 1);
  assert.deepEqual(proof, { runId: 20, runAttempt: 1, sha, repository,
    branch: "main", event: "push", workflowId: 10 });
  // GitHub's documented job response omits run_attempt; the scoped API and
  // current-attempt chronology supply it, without inventing a required field.
  delete state.jobs[0].run_attempt;
  await publishWithCiGate({ read: state.read, sha }, () => { calls += 1; });
  assert.equal(calls, 2);
  state.run.run_attempt = 2;
  state.jobs[0].run_attempt = 2;
  const rerunProof = await publishWithCiGate({ read: state.read, sha }, () => { calls += 1; });
  assert.equal(rerunProof.runAttempt, 2);
  assert.equal(calls, 3);
});

test("wrong identities, newer failures, missing/ambiguous evidence and read errors call publisher zero times", async () => {
  const mutations = [
    (s) => { s.metadata.path = ".github/workflows/lookalike.yml"; },
    (s) => { s.metadata.state = "disabled_manually"; },
    (s) => { s.runs = []; },
    (s) => { s.indexExtra = 1; },
    (s) => { s.run.repository.full_name = "other/repo"; },
    (s) => { s.run.head_repository.full_name = "fork/repo"; },
    (s) => { s.run.workflow_id = 11; },
    (s) => { s.run.head_sha = "b".repeat(40); },
    (s) => { s.run.event = "pull_request"; },
    (s) => { s.run.head_branch = "feature"; },
    (s) => { s.run.status = "in_progress"; },
    ...["failure", "cancelled", "timed_out", "skipped", null].map((conclusion) => (s) => { s.run.conclusion = conclusion; }),
    (s) => { s.runs = [structuredClone(s.run), { ...s.run, id: 21, run_number: 6, conclusion: "failure" }]; },
    (s) => { s.runs = [structuredClone(s.run), { ...s.run, id: 21, run_number: 6, status: "in_progress" }]; },
    (s) => { s.runs = [structuredClone(s.run)]; s.run.run_attempt = 2; s.run.conclusion = "failure"; },
    (s) => { s.runs = [structuredClone(s.run)]; s.run.run_attempt = 2; s.run.status = "in_progress"; },
    (s) => { s.jobs = []; },
    (s) => { s.jobs[0].name = "Unrelated success"; },
    (s) => { s.jobs[0].run_attempt = 2; },
    (s) => { s.jobs[0].run_id = 21; },
    (s) => { s.jobs[0].head_sha = "b".repeat(40); },
    (s) => { s.jobs[0].conclusion = "skipped"; },
    (s) => { s.jobs[0].steps = []; },
    (s) => { s.jobs[0].steps[0].conclusion = "failure"; },
    (s) => { s.jobs[0].started_at = "2026-09-05T00:30:00Z"; },
    (s) => { delete s.jobs[0].started_at; },
    (s) => { s.run.run_started_at = "invalid"; },
    (s) => { s.jobs.push({ ...s.jobs[0], id: 31 }); },
    (s) => { s.afterRuns = [{ ...s.run, run_attempt: 2, status: "in_progress" }]; },
    (s) => { s.read = async () => { throw new Error("403"); }; },
    (s) => { s.read = async () => { throw new DOMException("timeout", "TimeoutError"); }; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const state = fixture();
    mutate(state);
    let calls = 0;
    await assert.rejects(publishWithCiGate({ read: state.read, sha }, () => { calls += 1; }), `case ${index}`);
    assert.equal(calls, 0, `case ${index}`);
  }
});

test("publisher response loss or failure is never automatically republished", async () => {
  let calls = 0;
  await assert.rejects(publishWithCiGate({ read: fixture().read, sha }, () => {
    calls += 1;
    throw new Error("response lost after write");
  }));
  assert.equal(calls, 1);
});

test("read retries are bounded and distinguish transient errors from authentication or bad requests", async () => {
  for (const status of [401, 403, 404, 422]) {
    let calls = 0;
    const response = await fetchRead("https://api.github.com/", {}, {
      fetchImpl: async () => { calls += 1; return new Response("error", { status }); }, delay: async () => {},
    });
    assert.equal(response.status, status);
    assert.equal(calls, 1);
  }
  let calls = 0;
  const response = await fetchRead("https://api.github.com/", {}, {
    fetchImpl: async () => { calls += 1; return new Response("{}", { status: calls < 3 ? 503 : 200 }); }, delay: async () => {},
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(fetchRead("https://api.github.com/", {}, {
    fetchImpl: async () => { calls += 1; throw new TypeError("network"); }, delay: async () => {},
  }));
  assert.equal(calls, 3);
  await assert.rejects(fetchRead("https://api.github.com/", { method: "POST" }));
  const read = githubReader("fixture", { fetchImpl: async () => new Response("{}", {
    headers: { link: '<next>; rel="next"' },
  }) });
  await assert.rejects(read("repos/a/b"), /bounded query/);
});

function publishFixture(previousStep = "skipped", previousAttempt = 1) {
  const current = { ...fixture().run, id: 50, run_number: 10, workflow_id: 40,
    event: "workflow_dispatch", status: "in_progress", conclusion: null };
  const prior = { ...current, id: 49, run_number: 9, run_attempt: previousAttempt,
    status: "completed", conclusion: "failure" };
  return async (path) => {
    if (path.endsWith("/workflows/publish.yml")) return { id: 40, path: ".github/workflows/publish.yml", state: "active" };
    if (path.includes("/workflows/40/runs?")) return { total_count: 2, workflow_runs: [current, prior] };
    const match = /\/runs\/49\/attempts\/(\d+)\/jobs\?/.exec(path);
    if (match) return { total_count: 1, jobs: [{ id: 60 + Number(match[1]), run_id: 49, run_attempt: Number(match[1]),
      head_sha: sha, name: "Publish exact npm checkout", steps: [
        { name: PUBLISH_STEP, status: "completed", conclusion: previousStep },
      ] }] };
    throw new Error(`unexpected path ${path}`);
  };
}

test("a new approved run can follow proven pre-publish failure, but unknown or executed writes block", async () => {
  await requireSafePublishAttempt({ read: publishFixture(), sha, runId: 50, runAttempt: 1 });
  await requireSafePublishAttempt({ read: publishFixture("skipped", 2), sha, runId: 50, runAttempt: 1 });
  for (const result of ["success", "failure", "cancelled", null]) {
    await assert.rejects(requireSafePublishAttempt({ read: publishFixture(result), sha, runId: 50, runAttempt: 1 }), /side effect/);
  }
  await assert.rejects(requireSafePublishAttempt({ read: publishFixture(), sha, runId: 51, runAttempt: 1 }), /authoritative/);
  await assert.rejects(requireSafePublishAttempt({ read: publishFixture("skipped", 11), sha, runId: 50, runAttempt: 1 }), /bound/);
});

test("the actual workflow calls the gate as its sole publisher and does not ignore gate failure", () => {
  const workflow = readFileSync(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  const helper = readFileSync(new URL("../scripts/publish-gate.mjs", import.meta.url), "utf8");
  assert.equal((workflow.match(/run: node \.\/scripts\/publish-gate.mjs/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /run: npm publish|continue-on-error|if:.*always|\|\|\s*true/);
  assert.match(workflow, /await requireSafePublishAttempt\(\{/);
  assert.match(helper, /const proof = await publishWithCiGate/);
  assert.match(helper, /execFileSync\("npm", \["publish", "\."/);
  assert.match(helper, /const proof = await requireCanonicalCi\(options\);\s+await publisher\(\)/);
});

test("new dispatches freeze the complete active key set while historical inputs remain valid", () => {
  assert.doesNotThrow(() => requireFrozenSigningKeys('["SHA256:A","SHA256:B"]', "SHA256:A", ["SHA256:B", "SHA256:A"]));
  assert.doesNotThrow(() => requireFrozenSigningKeys("", "SHA256:A", ["SHA256:A", "SHA256:B"]));
  for (const [encoded, ids] of [
    ['["SHA256:A"]', ["SHA256:A", "SHA256:B"]],
    ['["SHA256:A","SHA256:B"]', ["SHA256:A"]],
    ['["SHA256:B","SHA256:A"]', ["SHA256:A", "SHA256:B"]],
    ['["SHA256:A","SHA256:A"]', ["SHA256:A"]],
    ['["SHA256:B"]', ["SHA256:B"]], ["not JSON", []],
  ]) assert.throws(() => requireFrozenSigningKeys(encoded, "SHA256:A", ids));
});
