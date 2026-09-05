import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requireCanonicalCi as requireExactCi, readWorkflowRuns, readAttemptJobs } from "../src/core/ci-evidence.mjs";
import { publicationWasSkipped, PUBLIC_RELEASE_PUBLISH_STEP } from "../src/core/task-artifact-public-release.mjs";

export const PUBLISH_STEP = PUBLIC_RELEASE_PUBLISH_STEP;
const repository = "kimyeongwoo/kyw-dev";
const transientStatus = new Set([408, 429, 500, 502, 503, 504]);

export function requireFrozenSigningKeys(encoded, primary, activeIds) {
  if (encoded === undefined || encoded === "") return;
  let ids;
  try { ids = JSON.parse(encoded); } catch { throw new Error("Frozen signing-key set is malformed"); }
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 32 ||
      ids.some((id) => typeof id !== "string" || !id || /\s/u.test(id) || Buffer.byteLength(id, "utf8") > 256) ||
      new Set(ids).size !== ids.length || !ids.includes(primary) ||
      JSON.stringify([...ids].sort()) !== encoded ||
      JSON.stringify([...activeIds].sort()) !== encoded) {
    throw new Error("Registry active signing-key set changed from the frozen dispatch");
  }
}

// Read retries never surround npm publish. Authentication, malformed responses,
// and invalid requests fail immediately; an uncertain write is never reissued.
export async function fetchRead(url, options = {}, {
  fetchImpl = fetch, delay = (ms) => new Promise((done) => setTimeout(done, ms)),
} = {}) {
  if (options.method && options.method !== "GET") throw new Error("Read helper only accepts GET");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, { ...options, redirect: "error", signal: AbortSignal.timeout(15000) });
    } catch (error) {
      if (attempt === 2 || !(error instanceof TypeError || ["AbortError", "TimeoutError"].includes(error.name))) throw error;
    }
    if (response && (!transientStatus.has(response.status) || attempt === 2)) return response;
    await response?.body?.cancel();
    await delay(250 * (attempt + 1));
  }
  throw new Error("Read retry bound exhausted");
}

export function githubReader(token, fetchOptions) {
  if (typeof token !== "string" || !token) throw new Error("GitHub read token is missing");
  return async (path) => {
    const response = await fetchRead(new URL(path, "https://api.github.com/"), {
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`,
        "cache-control": "no-cache", "x-github-api-version": "2022-11-28" },
    }, fetchOptions);
    if (!response.ok) throw new Error(`GitHub read failed (${response.status})`);
    if (response.headers.get("link")?.includes('rel="next"')) throw new Error("GitHub result exceeds bounded query");
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      if (bytes > 1024 * 1024) throw new Error("GitHub response exceeds byte bound");
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  };
}

export async function requireCanonicalCi(options) {
  if ((options.repositoryFullName ?? repository) !== repository) throw new Error("Publication repository mismatch");
  return requireExactCi({ ...options, repositoryFullName: repository, branch: "main", event: "push" });
}

export async function requireSafePublishAttempt({ read, sha, runId, runAttempt }) {
  const { runs } = await readWorkflowRuns(read, "publish.yml", sha, "workflow_dispatch", repository);
  if (runs.length > 20) throw new Error("Publication attempt history exceeds inspection bound");
  const current = runs.find((run) => String(run.id) === String(runId));
  if (!current || current.id !== runs[0]?.id || current.run_attempt !== Number(runAttempt) || current.status !== "in_progress") {
    throw new Error("Current publication run identity is not authoritative");
  }
  for (const run of runs) {
    if (run.run_attempt > 10) throw new Error("Publication attempt count exceeds inspection bound");
    if (run !== current && (run.status !== "completed" || !["failure", "cancelled", "timed_out"].includes(run.conclusion))) {
      throw new Error("Another publication may have written or is still running");
    }
    const last = run === current ? run.run_attempt - 1 : run.run_attempt;
    for (let attempt = 1; attempt <= last; attempt += 1) {
      const jobs = await readAttemptJobs(read, run, attempt, repository);
      if (!publicationWasSkipped(jobs)) {
        throw new Error("Prior publication was not proven to stop before its side effect");
      }
    }
  }
  return current;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const read = githubReader(process.env.GITHUB_TOKEN);
    // Keep this entry point read-only: its failure must skip the distinct npm
    // step so Actions history can prove that publication never started.
    const proof = await requireCanonicalCi({ read, sha: process.env.EXPECTED_SHA,
      repositoryFullName: process.env.GITHUB_REPOSITORY });
    console.log(JSON.stringify({ stage: "ci-approved", ci: proof }));
  } catch (error) {
    console.error(`Publication preflight stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
