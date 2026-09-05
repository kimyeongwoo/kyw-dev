export const CI_REQUIRED_JOB = "Required / credential-free CI";
export const CI_AGGREGATE_STEP = "Validate selected CI results";
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

function completeIndex(index, key) {
  if (!index || !Number.isSafeInteger(index.total_count) || !Array.isArray(index[key]) ||
      index.total_count !== index[key].length || index.total_count > 100 ||
      new Set(index[key].map((entry) => entry?.id)).size !== index.total_count) {
    throw new Error(`Incomplete or ambiguous GitHub ${key}`);
  }
  return index[key];
}

function assertRun(run, { sha, workflowId, event, branch, repository, expectedHeadRepository = repository }) {
  if (!run || !positiveInteger(run.id) || !positiveInteger(run.run_number) ||
      !positiveInteger(run.run_attempt) || run.workflow_id !== workflowId ||
      run.repository?.full_name !== repository ||
      run.head_repository?.full_name !== (event === "pull_request" ? expectedHeadRepository : repository) ||
      run.event !== event || run.head_branch !== branch || run.head_sha !== sha) {
    throw new Error("Workflow execution identity does not match exact repository/workflow/branch/SHA");
  }
}

export async function readWorkflowRuns(read, workflow, sha, event, repository, branch = "main", expectedHeadRepository = repository) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "") ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(expectedHeadRepository ?? "") ||
      (event !== "pull_request" && expectedHeadRepository !== repository) ||
      typeof branch !== "string" || !branch || !["push", "pull_request", "workflow_dispatch"].includes(event) ||
      !["ci.yml", "publish.yml"].includes(workflow)) throw new Error("Invalid exact workflow target");
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("Invalid target SHA");
  const metadata = await read(`repos/${repository}/actions/workflows/${workflow}`);
  if (!positiveInteger(metadata?.id) || metadata.path !== `.github/workflows/${workflow}` || metadata.state !== "active") {
    throw new Error("Canonical workflow identity is unavailable");
  }
  const query = new URLSearchParams({ event, branch, head_sha: sha, per_page: "100", page: "1" });
  const runs = completeIndex(await read(`repos/${repository}/actions/workflows/${metadata.id}/runs?${query}`), "workflow_runs");
  for (const run of runs) assertRun(run, { sha, workflowId: metadata.id, event, repository, branch, expectedHeadRepository });
  if (new Set(runs.map((run) => run.run_number)).size !== runs.length) throw new Error("Ambiguous workflow chronology");
  return { workflowId: metadata.id, runs: runs.sort((a, b) => b.run_number - a.run_number) };
}

export async function readAttemptJobs(read, run, attempt, repository) {
  const jobs = completeIndex(await read(
    `repos/${repository}/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100&page=1`,
  ), "jobs");
  if (!jobs.length || jobs.some((job) => !positiveInteger(job.id) || job.run_id !== run.id ||
      (job.run_attempt !== undefined && job.run_attempt !== attempt) || job.head_sha !== run.head_sha)) throw new Error("Job attempt identity is ambiguous");
  return jobs;
}

export async function requireCanonicalCi({ read, sha, repositoryFullName: repository, branch = "main", event = "push", expectedHeadRepository = repository }) {
  const { workflowId, runs } = await readWorkflowRuns(read, "ci.yml", sha, event, repository, branch, expectedHeadRepository);
  if (!runs.length) throw new Error("Canonical CI for the exact event/branch/SHA is missing");
  const latest = runs[0];
  const run = await read(`repos/${repository}/actions/runs/${latest.id}`);
  assertRun(run, { sha, workflowId, event, repository, branch, expectedHeadRepository });
  if (run.id !== latest.id || run.run_number !== latest.run_number || run.run_attempt !== latest.run_attempt ||
      run.status !== "completed" || run.conclusion !== "success") {
    throw new Error("Latest canonical CI run/attempt has not succeeded");
  }
  const attempt = await read(`repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}`);
  assertRun(attempt, { sha, workflowId, event, repository, branch, expectedHeadRepository });
  if (attempt.id !== run.id || attempt.run_attempt !== run.run_attempt || attempt.status !== "completed" ||
      attempt.conclusion !== "success" || !Number.isFinite(Date.parse(attempt.run_started_at))) {
    throw new Error("Current CI attempt execution is not proven");
  }
  const jobs = await readAttemptJobs(read, run, run.run_attempt, repository);
  const aggregate = jobs.filter((job) => job.name === CI_REQUIRED_JOB);
  if (aggregate.length !== 1 || aggregate[0].status !== "completed" || aggregate[0].conclusion !== "success") {
    throw new Error("Latest required CI aggregate is missing or unsuccessful");
  }
  if (!Number.isFinite(Date.parse(aggregate[0].started_at)) ||
      Date.parse(aggregate[0].started_at) < Date.parse(attempt.run_started_at) ||
      !Number.isFinite(Date.parse(aggregate[0].completed_at)) ||
      Date.parse(aggregate[0].completed_at) < Date.parse(aggregate[0].started_at)) {
    throw new Error("Required aggregate was not executed in the current CI attempt");
  }
  const steps = aggregate[0].steps?.filter((step) => step.name === CI_AGGREGATE_STEP);
  if (steps?.length !== 1 || steps[0].status !== "completed" || steps[0].conclusion !== "success") {
    throw new Error("Required CI did not validate selected jobs");
  }
  // Detect a new run or rerun begun while collecting job proof. The remaining
  // read/write race is a GitHub/npm trust boundary, not an atomic guarantee.
  const fresh = await readWorkflowRuns(read, "ci.yml", sha, event, repository, branch, expectedHeadRepository);
  if (fresh.workflowId !== workflowId || fresh.runs[0]?.id !== run.id ||
      fresh.runs[0]?.run_attempt !== run.run_attempt || fresh.runs[0]?.status !== "completed" ||
      fresh.runs[0]?.conclusion !== "success") throw new Error("CI changed during validation preflight");
  return { runId: run.id, runAttempt: run.run_attempt, sha, repository, branch, event, workflowId,
    ...(event === "pull_request" ? { headRepository: expectedHeadRepository } : {}) };
}
