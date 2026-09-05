import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { hydratePublicReleaseContext } from "../src/core/task-artifact-hydration.mjs";
import { derivePublicReleaseWorkflowInputs } from "../src/core/task-artifact-public-release.mjs";
import { runTaskArtifactCommand } from "../skills/kyw-task/scripts/task-artifacts.mjs";

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("explicit release hydration inspects an exact prepared tree without a tasks directory or GitHub delivery ledger", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "kyw-release-target-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, ".github/workflows"), { recursive: true });
  await mkdir(path.join(repositoryRoot, ".codex-plugin"));
  const packageJson = { name: "kyw-dev", version: "2.0.0", private: false, type: "module",
    repository: { type: "git", url: "git+https://github.com/owner/repository.git" },
    files: [".codex-plugin/"], publishConfig: { access: "public", registry: "https://registry.npmjs.org/" } };
  await writeFile(path.join(repositoryRoot, "package.json"), JSON.stringify(packageJson));
  await writeFile(path.join(repositoryRoot, ".codex-plugin/plugin.json"), JSON.stringify({ name: "kyw-dev", version: "2.0.0" }));
  const workflow = await readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  await writeFile(path.join(repositoryRoot, ".github/workflows/publish.yml"), workflow.replaceAll("kimyeongwoo/kyw-dev", "owner/repository"));
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["config", "user.email", "fixture@example.invalid"]);
  git(repositoryRoot, ["config", "user.name", "Fixture"]);
  git(repositoryRoot, ["remote", "add", "origin", "https://github.com/owner/repository.git"]);
  git(repositoryRoot, ["add", "."]);
  git(repositoryRoot, ["commit", "-m", "prepared source"]);
  const releaseSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  const publicKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).publicKey.export({ type: "spki", format: "der" }).toString("base64");
  let publicReads = 0;
  const clients = {
    readPublishWorkflowIdentity: async () => { publicReads += 1; return { id: 77, name: "Publish npm package through OIDC", path: ".github/workflows/publish.yml", state: "active" }; },
    readPackageIndex: async () => ({ versions: { "1.0.0": {} }, "dist-tags": { latest: "1.0.0" } }),
    readSigningKeys: async () => ({ keys: [{ keyid: "SHA256:fixture", key: publicKey, expires: null }] }),
  };
  const commandTrace = [];
  const commandRunner = async ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    commandTrace.push({ command, args, cwd });
    assert.notEqual(command, "gh");
    assert.equal(args.includes("publish"), false);
    const result = spawnSync(command, args, { cwd, timeout: timeoutMs, maxBuffer, encoding: "utf8", windowsHide: true });
    return { ...result, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  };
  const context = await hydratePublicReleaseContext({ repositoryRoot, releaseVersion: "2.0.0", releaseSha, commandRunner, clients });
  assert.equal(context.tuple.taskId, null);
  assert.equal(context.tuple.package.version, "2.0.0");
  assert.equal(context.tuple.target.mergeSha, releaseSha);
  assert.equal(context.standardDelivery.releaseTarget.currentMainSha, releaseSha);
  assert.equal(context.tuple.package.tarball.entries.some((entry) => entry.startsWith("docs/tasks/")), false);
  assert.equal(commandTrace.some(({ args }) => args.some((argument) => argument.includes("docs/tasks"))), false);
  assert.equal(git(repositoryRoot, ["status", "--porcelain"]), "");
  await assert.rejects(hydratePublicReleaseContext({ repositoryRoot, releaseVersion: "2.0.1", releaseSha, commandRunner, clients }), /versions must equal/);
  assert.equal(publicReads, 1);
  await writeFile(path.join(repositoryRoot, "later.txt"), "later");
  git(repositoryRoot, ["add", "later.txt"]);
  git(repositoryRoot, ["commit", "-m", "advance main"]);
  await assert.rejects(hydratePublicReleaseContext({ repositoryRoot, releaseVersion: "2.0.0", releaseSha, commandRunner, clients }), /prepared main/);
  assert.equal(publicReads, 2);
});

test("GitHub read retries are bounded and do not retry authentication or invalid requests", async () => {
  const { createPublicReleaseClients } = await import("../src/core/task-artifact-hydration.mjs");
  for (const [status, expectedCalls] of [[503, 3], [401, 1], [403, 1], [422, 1]]) {
    let calls = 0;
    const clients = createPublicReleaseClients({ repositoryRoot: process.cwd(), commandRunner: async ({ command, args }) => {
      assert.equal(command, "gh");
      assert.equal(args[args.indexOf("--method") + 1], "GET");
      calls += 1;
      return { status: 1, stdout: "", stderr: `HTTP ${status}` };
    } });
    await assert.rejects(clients.readPublishWorkflowIdentity({ repository: "owner/repository", path: ".github/workflows/publish.yml" }));
    assert.equal(calls, expectedCalls);
  }
  let calls = 0;
  const clients = createPublicReleaseClients({ repositoryRoot: process.cwd(), commandRunner: async () => {
    calls += 1;
    return calls < 3 ? { status: 1, stdout: "", stderr: "HTTP 503" }
      : { status: 0, stdout: JSON.stringify({ id: 1, name: "Publish npm package through OIDC", path: ".github/workflows/publish.yml", state: "active" }), stderr: "" };
  } });
  assert.equal((await clients.readPublishWorkflowIdentity({ repository: "owner/repository", path: ".github/workflows/publish.yml" })).id, 1);
  assert.equal(calls, 3);
});

async function standaloneResumeFixture(t, { legacyWorkflow = false } = {}) {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "kyw-release-resume-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, ".github/workflows"), { recursive: true });
  await mkdir(path.join(repositoryRoot, ".codex-plugin"));
  const repository = "owner/repository";
  const packageJson = { name: "kyw-dev", version: "2.0.0", private: false, type: "module",
    repository: { type: "git", url: `git+https://github.com/${repository}.git` },
    files: [".codex-plugin/"], publishConfig: { access: "public", registry: "https://registry.npmjs.org/" } };
  await writeFile(path.join(repositoryRoot, "package.json"), JSON.stringify(packageJson));
  await writeFile(path.join(repositoryRoot, ".codex-plugin/plugin.json"), JSON.stringify({ name: "kyw-dev", version: "2.0.0" }));
  let workflowText = await readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  if (legacyWorkflow) workflowText = workflowText
    .replace("Require latest canonical CI before publication", "Publish the exact checkout directory through OIDC")
    .replace(/\r?\n      - name: Publish the exact checkout directory through OIDC\r?\n        run: npm publish[^\r\n]+\r?\n?$/u, "\n");
  await writeFile(path.join(repositoryRoot, ".github/workflows/publish.yml"), workflowText.replaceAll("kimyeongwoo/kyw-dev", repository));
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["config", "user.email", "fixture@example.invalid"]);
  git(repositoryRoot, ["config", "user.name", "Fixture"]);
  git(repositoryRoot, ["config", "core.autocrlf", "false"]);
  git(repositoryRoot, ["remote", "add", "origin", `https://github.com/${repository}.git`]);
  git(repositoryRoot, ["add", "."]);
  git(repositoryRoot, ["commit", "-m", "prepared release"]);
  const releaseSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  const keyPairs = ["original", "backup", "rotated"].map((name) => ({
    keyid: `SHA256:${name}`, ...generateKeyPairSync("ec", { namedCurve: "P-256" }),
  }));
  const state = { npm: false, workflow: false, tag: false, release: false,
    remoteMainSha: releaseSha, compareStatus: "ahead", signingKeys: 2, fault: null };
  const trace = { writes: [], reads: [], npmPublish: 0, provenance: 0 };
  let originalTuple, archive, signature;
  const json = (value) => ({ status: 0, stdout: JSON.stringify(value), stderr: "" });
  const notFound = () => ({ status: 1, stdout: "", stderr: "HTTP 404 Not Found" });
  const release = () => ({ id: 701, tag_name: "v2.0.0", name: "v2.0.0", body: "",
    draft: false, prerelease: false, assets: [] });
  const commandRunner = async ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (command !== "gh") {
      if (args.includes("publish")) { trace.npmPublish += 1; throw new Error("unexpected npm publish"); }
      assert.ok(command === "git" || command === "tar" || args.includes("pack"), `unexpected local command ${command} ${args}`);
      const result = spawnSync(command, args, { cwd, timeout: timeoutMs, maxBuffer, encoding: "utf8", windowsHide: true });
      if (args.includes("pack") && result.status === 0) {
        const [report] = JSON.parse(result.stdout);
        const packed = await readFile(path.join(args[args.indexOf("--pack-destination") + 1], report.filename));
        if (archive) assert.deepEqual(packed, archive, "fresh hydration must pack the original source bytes");
        else archive = packed;
      }
      return { ...result, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
    }
    if (args[0] === "run") {
      assert.equal(args[args.indexOf("--repo") + 1], `github.com/${repository}`);
      const inputs = Object.entries(derivePublicReleaseWorkflowInputs(originalTuple))
        .map(([key, value]) => `${key}=${value}`).join(" ");
      return { status: 0, stderr: "", stdout: [
        `KYWPUBLISHEVIDENCE schema=1 stage=dispatch repository=${repository} event=workflow_dispatch ref=refs/heads/main ${inputs}`,
        `KYWPUBLISHEVIDENCE schema=1 stage=source expected_sha=${releaseSha} actual_sha=${releaseSha} package=kyw-dev version=2.0.0`,
      ].join("\n") };
    }
    assert.equal(args[0], "api");
    assert.equal(args[args.indexOf("--hostname") + 1], "github.com");
    const methodIndex = args.indexOf("--method");
    const method = args[methodIndex + 1];
    const endpoint = method === "GET" ? args.at(-1) : args[methodIndex + 2];
    if (method !== "GET") {
      trace.writes.push({ method, endpoint, args });
      assert.equal(method, "POST");
      if (endpoint.endsWith("/git/refs")) {
        assert.ok(args.includes(`sha=${releaseSha}`));
        assert.ok(args.includes("ref=refs/tags/v2.0.0"));
        state.tag = true;
      } else if (endpoint.endsWith("/releases")) {
        assert.ok(args.includes(`target_commitish=${releaseSha}`));
        assert.ok(args.includes("tag_name=v2.0.0"));
        state.release = true;
      } else throw new Error(`unexpected external write ${endpoint}`);
      return json({ id: 9001 });
    }
    trace.reads.push(endpoint);
    if (endpoint.includes("/git/ref/heads/main")) return json({ ref: "refs/heads/main", object: { type: "commit", sha: state.remoteMainSha } });
    if (endpoint.includes("/compare/")) return json({ status: state.compareStatus, base_commit: { sha: releaseSha }, merge_base_commit: { sha: releaseSha } });
    if (endpoint.includes("/actions/workflows/publish.yml")) return json({ id: 77, name: "Publish npm package through OIDC", path: ".github/workflows/publish.yml", state: "active" });
    if (endpoint.includes("/actions/workflows/77/runs?")) {
      const runs = state.workflow ? [{ id: 501, run_attempt: 1, event: "workflow_dispatch", head_branch: "main",
        head_sha: state.fault === "workflow-sha" ? "f".repeat(40) : releaseSha, status: "completed",
        conclusion: state.fault === "ambiguous-publish" ? "failure" : "success" }] : [];
      return json({ total_count: runs.length + (state.fault === "incomplete-history" ? 1 : 0), workflow_runs: runs });
    }
    if (endpoint.includes("/actions/runs/501/attempts/1/jobs?")) return json({ total_count: 1, jobs: [{ id: 601,
      run_id: 501, run_attempt: 1, head_sha: releaseSha, name: "Publish exact npm checkout",
      steps: [{ name: "Publish the exact checkout directory through OIDC", status: "completed",
        conclusion: state.fault === "ambiguous-publish" ? "failure" : "success" }] }] });
    if (endpoint.includes("/git/matching-refs/tags/")) return json(state.tag ? [{ ref: "refs/tags/v2.0.0",
      object: { type: "commit", sha: state.fault === "tag-conflict" ? "f".repeat(40) : releaseSha } }] : []);
    if (endpoint.includes("/releases/tags/")) return state.release ? json(release()) : notFound();
    if (endpoint.includes("/releases?")) return json(state.release ? [release()] : []);
    throw new Error(`unexpected fixture GET ${endpoint}`);
  };
  const metadata = () => ({ name: "kyw-dev", version: state.fault === "version-conflict" ? "9.0.0" : "2.0.0",
    repository: packageJson.repository, gitHead: state.fault === "npm-sha" ? "f".repeat(40) : releaseSha,
    dist: { tarball: "https://registry.npmjs.org/kyw-dev/-/kyw-dev-2.0.0.tgz",
      integrity: originalTuple.package.tarball.integrity, shasum: originalTuple.package.tarball.shasum,
      signatures: [{ keyid: keyPairs[0].keyid, sig: signature }] } });
  const fetchImpl = async (url, options) => {
    assert.equal(url.hostname, "registry.npmjs.org");
    assert.equal(options.method ?? "GET", "GET");
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === "/-/npm/v1/keys") return Response.json({ keys: keyPairs.slice(0, state.signingKeys).map((key) => ({
      keyid: key.keyid, key: key.publicKey.export({ type: "spki", format: "der" }).toString("base64"), expires: null,
    })) });
    if (pathname === "/kyw-dev") return Response.json({ name: "kyw-dev", versions: { "1.0.0": {}, ...(state.npm ? { "2.0.0": metadata() } : {}) },
      "dist-tags": { latest: state.npm ? "2.0.0" : "1.0.0" }, time: { "2.0.0": "2026-09-01T00:00:00.000Z" } });
    if (pathname === "/kyw-dev/2.0.0") return state.npm ? Response.json(metadata()) : new Response("", { status: 404 });
    if (pathname === "/kyw-dev/-/kyw-dev-2.0.0.tgz") return new Response(archive);
    if (pathname === "/-/npm/v1/attestations/kyw-dev@2.0.0") {
      const statement = { _type: "https://in-toto.io/Statement/v1", predicateType: "https://slsa.dev/provenance/v1",
        subject: [{ name: "pkg:npm/kyw-dev@2.0.0", digest: { sha512: createHash("sha512").update(archive).digest("hex") } }],
        predicate: { buildDefinition: { buildType: "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
          externalParameters: { workflow: { repository: `https://github.com/${repository}`, path: ".github/workflows/publish.yml", ref: "refs/heads/main" } },
          resolvedDependencies: [{ digest: { gitCommit: state.fault === "provenance-sha" ? "f".repeat(40) : releaseSha } }],
          internalParameters: { github: { event_name: "workflow_dispatch" } } },
        runDetails: { builder: { id: "https://github.com/actions/runner/github-hosted" },
          metadata: { invocationId: `https://github.com/${repository}/actions/runs/501/attempts/1` } } } };
      return Response.json({ attestations: [{ predicateType: "https://slsa.dev/provenance/v1", bundle: {
        dsseEnvelope: { payloadType: "application/vnd.in-toto+json", payload: Buffer.from(JSON.stringify(statement)).toString("base64"),
          signatures: [{ sig: Buffer.from("mock DSSE signature").toString("base64") }] }, verificationMaterial: { tlogEntries: [{}] },
      } }] });
    }
    throw new Error(`unexpected fixture registry URL ${url}`);
  };
  const runtime = { commandRunner, fetchImpl, provenanceVerifier: async () => { trace.provenance += 1; return state.fault !== "invalid-provenance"; }, reconciliationReads: 1 };
  // Freeze the real prepared source before the fixture represents publication.
  originalTuple = (await hydratePublicReleaseContext({ repositoryRoot, releaseVersion: "2.0.0", releaseSha, ...runtime })).tuple;
  signature = sign("sha256", Buffer.from(`kyw-dev@2.0.0:${originalTuple.package.tarball.integrity}`), keyPairs[0].privateKey).toString("base64");
  await writeFile(path.join(repositoryRoot, "later.txt"), "main advanced after npm publication\n");
  git(repositoryRoot, ["add", "later.txt"]);
  git(repositoryRoot, ["commit", "-m", "advance main"]);
  const advancedMainSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  state.remoteMainSha = advancedMainSha;
  const reset = () => {
    Object.assign(state, { npm: true, workflow: true, tag: false, release: false, signingKeys: 3,
      remoteMainSha: advancedMainSha, compareStatus: "ahead", fault: null });
    trace.writes.length = 0; trace.reads.length = 0; trace.npmPublish = 0; trace.provenance = 0;
  };
  const invoke = () => runTaskArtifactCommand(["public-release", "--repository-root", repositoryRoot,
    "--invocation", `$kyw-deliver --release 2.0.0 --sha ${releaseSha}`], runtime);
  reset();
  return { state, trace, reset, invoke, originalTuple, releaseSha, advancedMainSha, repositoryRoot };
}

test("new standalone invocation hydrates published ancestors and resumes only missing exact effects", async (t) => {
  const fixture = await standaloneResumeFixture(t);
  for (const [name, tag, release, expectedWrites] of [
    ["TAG and RELEASE missing", false, false, ["git/refs", "releases"]],
    ["only RELEASE missing", true, false, ["releases"]],
    ["already complete", true, true, []],
  ]) await t.test(name, async () => {
    fixture.reset();
    Object.assign(fixture.state, { tag, release });
    const result = await fixture.invoke();
    assert.equal(result.outcome, "COMPLETE", JSON.stringify(result));
    assert.equal(result.publicReleaseResult.proof.mergeSha, fixture.releaseSha);
    assert.equal(result.publicReleaseHydration.baseHeadSha, fixture.advancedMainSha);
    assert.equal(result.publicReleaseHydration.baseHeadRelation, "DESCENDANT");
    assert.deepEqual(result.publicReleaseTuple.package.signature, fixture.originalTuple.package.signature);
    assert.deepEqual(fixture.trace.writes.map(({ endpoint }) => endpoint.replace("repos/owner/repository/", "")), expectedWrites);
    assert.equal(fixture.trace.npmPublish, 0);
    assert.ok(fixture.trace.provenance > 0);
    assert.ok(fixture.trace.reads.some((endpoint) => endpoint.includes(`/compare/${fixture.releaseSha}...${fixture.advancedMainSha}`)));
    assert.equal(git(fixture.repositoryRoot, ["rev-parse", "main"]), fixture.advancedMainSha);
    assert.equal(git(fixture.repositoryRoot, ["status", "--porcelain"]), "");
  });
  for (const fault of ["unpublished", "npm-sha", "version-conflict", "workflow-sha", "provenance-sha",
    "invalid-provenance", "tag-conflict", "ambiguous-publish", "incomplete-history", "missing-workflow", "remote-diverged"]) {
    await t.test(`blocks ${fault} with zero writes`, async () => {
      fixture.reset();
      fixture.state.fault = fault;
      if (fault === "unpublished") Object.assign(fixture.state, { npm: false, workflow: false });
      if (fault === "tag-conflict") fixture.state.tag = true;
      if (fault === "missing-workflow") fixture.state.workflow = false;
      if (fault === "remote-diverged") fixture.state.compareStatus = "diverged";
      const result = await fixture.invoke();
      assert.equal(result.outcome, "BLOCKED", JSON.stringify(result));
      assert.equal(fixture.trace.npmPublish, 0);
      assert.deepEqual(fixture.trace.writes, []);
      assert.equal(git(fixture.repositoryRoot, ["rev-parse", "main"]), fixture.advancedMainSha);
    });
  }
});

test("a new invocation resumes a published ancestor with the historical combined workflow", async (t) => {
  const fixture = await standaloneResumeFixture(t, { legacyWorkflow: true });
  const result = await fixture.invoke();
  assert.equal(result.outcome, "COMPLETE", JSON.stringify(result));
  assert.equal(result.publicReleaseHydration.baseHeadSha, fixture.advancedMainSha);
  assert.deepEqual(result.publicReleaseTuple.package.signature, fixture.originalTuple.package.signature);
  assert.deepEqual(fixture.trace.writes.map(({ endpoint }) => endpoint.replace("repos/owner/repository/", "")), ["git/refs", "releases"]);
  assert.equal(fixture.trace.npmPublish, 0);
});
