import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

// Execute the declared read-only gate CLI with an entirely local HTTP fixture,
// then apply Actions' default success condition to the adjacent mock npm step.
// The returned step records are also used by production history-reader tests.
export async function executePublicationBoundary({
  sha = "a".repeat(40), repository = "kimyeongwoo/kyw-dev",
  ciStatus = "completed", ciConclusion = "success", ciSha = sha,
  ciReadStatus = 200, publisher = () => {},
} = {}) {
  const workflow = readFileSync(new URL("../../.github/workflows/publish.yml", import.meta.url), "utf8").replaceAll("\r\n", "\n");
  const blocks = [...workflow.matchAll(/^      - name: (.+)\n([\s\S]*?)(?=^      - name: |$(?![\s\S]))/gm)];
  const [gate, publish] = blocks.slice(-2);
  assert.equal(gate?.[1], "Require latest canonical CI before publication");
  assert.equal(publish?.[1], "Publish the exact checkout directory through OIDC");
  assert.doesNotMatch(gate[2] + publish[2], /continue-on-error|^\s+if:/m);
  const gateCommand = /^        run: node (\.\/scripts\/[a-z-]+\.mjs)$/m.exec(gate[2]);
  const publisherCommand = /^        run: (npm publish [^\n]+)$/m.exec(publish[2]);
  assert.ok(gateCommand, "workflow must declare a directly executable gate");
  assert.ok(publisherCommand, "workflow must declare one adjacent npm publisher");

  const run = { id: 20, run_number: 5, run_attempt: 1, workflow_id: 10,
    repository: { full_name: repository }, head_repository: { full_name: repository },
    event: "push", head_branch: "main", head_sha: ciSha, status: ciStatus, conclusion: ciConclusion,
    run_started_at: "2026-09-05T01:00:00Z" };
  const aggregate = { id: 30, run_id: 20, head_sha: ciSha,
    name: "Required / credential-free CI", status: "completed", conclusion: "success",
    started_at: "2026-09-05T01:10:00Z", completed_at: "2026-09-05T01:11:00Z",
    steps: [{ name: "Validate selected CI results", status: "completed", conclusion: "success" }] };
  const base = `/repos/${repository}/actions`;
  const responses = {
    [`${base}/workflows/ci.yml`]: { id: 10, path: ".github/workflows/ci.yml", state: "active" },
    [`${base}/workflows/10/runs?event=push&branch=main&head_sha=${sha}&per_page=100&page=1`]: {
      total_count: 1, workflow_runs: [run],
    },
    [`${base}/runs/20`]: run,
    [`${base}/runs/20/attempts/1`]: run,
    [`${base}/runs/20/attempts/1/jobs?per_page=100&page=1`]: { total_count: 1, jobs: [aggregate] },
  };
  const preload = `
    const responses = JSON.parse(process.env.KYW_GATE_FIXTURE_RESPONSES);
    globalThis.fetch = async (input, options) => {
      const url = new URL(input);
      const key = url.pathname + url.search;
      if (url.origin !== "https://api.github.com" || !Object.hasOwn(responses, key) ||
          (options.method && options.method !== "GET")) throw new Error("Unexpected fixture HTTP request");
      return new Response(JSON.stringify(responses[key]), { status: Number(process.env.KYW_GATE_FIXTURE_STATUS) });
    };
  `;
  const gateResult = spawnSync(process.execPath,
    ["--import", `data:text/javascript,${encodeURIComponent(preload)}`, gateCommand[1]], {
      cwd: repositoryRoot, encoding: "utf8", timeout: 15000, windowsHide: true,
      env: { ...process.env, NODE_OPTIONS: "", GITHUB_TOKEN: "offline-fixture",
        GITHUB_REPOSITORY: repository, EXPECTED_SHA: sha,
        KYW_GATE_FIXTURE_RESPONSES: JSON.stringify(responses), KYW_GATE_FIXTURE_STATUS: String(ciReadStatus) },
    });
  assert.ifError(gateResult.error);
  assert.equal(gateResult.signal, null);
  let publisherCalls = 0;
  let error;
  let publishConclusion = "skipped";
  if (gateResult.status === 0) {
    publisherCalls += 1;
    try {
      const [command, ...args] = publisherCommand[1].split(" ");
      await publisher({ command, args });
      publishConclusion = "success";
    } catch (failure) {
      error = failure;
      publishConclusion = "failure";
    }
  }
  return { gateResult, publisherCalls, error, steps: [
    { name: gate[1], status: "completed", conclusion: gateResult.status === 0 ? "success" : "failure" },
    { name: publish[1], status: "completed", conclusion: publishConclusion },
  ] };
}
