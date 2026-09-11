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

function runOwnedLocalCommand({ command, args, cwd, timeoutMs, maxBuffer }) {
  if (command === "git") {
    const target = "[a-f0-9]{40}";
    assert.ok(
      (args.length === 2 && args[0] === "rev-parse" &&
        (args[1] === "--show-toplevel" || new RegExp(`^${target}\\^\\{(?:tree|commit)\\}$`, "u").test(args[1]))) ||
      (args.join(" ") === "remote get-url origin") ||
      (args.length === 2 && args[0] === "show" && new RegExp(`^${target}:(?:package\\.json|\\.codex-plugin/plugin\\.json|\\.github/workflows/publish\\.yml)$`, "u").test(args[1])) ||
      (args.length === 3 && args[0] === "cat-file" && args[1] === "-e" && new RegExp(`^${target}:\\.npmrc$`, "u").test(args[2])) ||
      (args.length === 4 && args[0] === "archive" && args[1] === "--format=tar" && args[2].startsWith("--output=") && new RegExp(`^${target}$`, "u").test(args[3])),
      `unexpected local Git command: ${args.join(" ")}`,
    );
  } else if (command === "tar") {
    assert.equal(args.length, 4);
    assert.equal(args[0], "-xf");
    assert.equal(args[2], "-C");
    assert.equal(path.basename(args[1]), "source.tar");
    assert.equal(path.dirname(args[1]), path.dirname(args[3]));
    assert.equal(path.basename(args[3]), "source");
  } else {
    const packArgs = process.platform === "win32" ? args.slice(1) : args;
    assert.equal(command, process.platform === "win32" ? process.execPath : "npm");
    if (process.platform === "win32") assert.equal(args[0], path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"));
    assert.deepEqual(packArgs.slice(0, 4), ["pack", "--json", "--ignore-scripts", "--pack-destination"]);
    assert.equal(packArgs.length, 5);
    assert.equal(path.basename(cwd), "source");
    assert.equal(path.dirname(cwd), path.dirname(packArgs[4]));
  }
  const result = spawnSync(command, args, { cwd, timeout: timeoutMs, maxBuffer, encoding: "utf8", windowsHide: true });
  return { ...result, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

test("explicit release hydration inspects an exact prepared tree without a tasks directory or GitHub delivery ledger", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "kyw-release-target-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, ".github/workflows"), { recursive: true });
  await mkdir(path.join(repositoryRoot, ".codex-plugin"));
  const packageJson = { name: "kyw-dev", version: "2.0.0", private: false, type: "module",
    repository: { type: "git", url: "git+https://github.com/kimyeongwoo/kyw-dev.git" },
    files: [".codex-plugin/"], publishConfig: { access: "public", registry: "https://registry.npmjs.org/" } };
  await writeFile(path.join(repositoryRoot, "package.json"), JSON.stringify(packageJson));
  await writeFile(path.join(repositoryRoot, ".codex-plugin/plugin.json"), JSON.stringify({ name: "kyw-dev", version: "2.0.0" }));
  const workflow = await readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  await writeFile(path.join(repositoryRoot, ".github/workflows/publish.yml"), workflow.replaceAll("kimyeongwoo/kyw-dev", "kimyeongwoo/kyw-dev"));
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["config", "user.email", "fixture@example.invalid"]);
  git(repositoryRoot, ["config", "user.name", "Fixture"]);
  git(repositoryRoot, ["remote", "add", "origin", "https://github.com/kimyeongwoo/kyw-dev.git"]);
  git(repositoryRoot, ["add", "."]);
  git(repositoryRoot, ["commit", "-m", "prepared source"]);
  const releaseSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  const publicKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).publicKey.export({ type: "spki", format: "der" }).toString("base64");
  let publicReads = 0;
  const clients = {
    readPublishWorkflowIdentity: async () => { publicReads += 1; return { id: 77, name: "Publish npm package through OIDC", path: ".github/workflows/publish.yml", state: "active" }; },
    readPackageIndex: async () => ({ versions: { "1.0.0": {} }, "dist-tags": { latest: "1.0.0" } }),
    readSigningKeys: async () => ({ keys: [{ keyid: "SHA256:fixture", key: publicKey, expires: null }] }),
    readWorkflowRuns: async () => ({ runs: [], complete: true, baseHeadSha: releaseSha }),
  };
  const commandTrace = [];
  const commandRunner = async ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    commandTrace.push({ command, args, cwd });
    assert.notEqual(command, "gh");
    assert.equal(args.includes("publish"), false);
    return runOwnedLocalCommand({ command, args, cwd, timeoutMs, maxBuffer });
  };
  git(repositoryRoot, ["checkout", "--detach", releaseSha]);
  git(repositoryRoot, ["branch", "-D", "main"]);
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
  const afterLocalAdvance = await hydratePublicReleaseContext({ repositoryRoot, releaseVersion: "2.0.0", releaseSha, commandRunner, clients });
  assert.equal(afterLocalAdvance.standardDelivery.releaseTarget.currentMainSha, releaseSha);
  assert.equal(afterLocalAdvance.diagnostics.baseHeadRelation, "EXACT");
  assert.equal(publicReads, 2);
  for (const reader of [undefined, async () => ({ runs: [], complete: true }),
    ...[null, [], [releaseSha], "invalid", "A".repeat(40)].map((baseHeadSha) => async () => ({ runs: [], complete: true, baseHeadSha }))]) {
    await assert.rejects(hydratePublicReleaseContext({ repositoryRoot, releaseVersion: "2.0.0", releaseSha,
      commandRunner, clients: { ...clients, readWorkflowRuns: reader } }), /CLIENTS|SOURCE_IDENTITY/u);
  }
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
    await assert.rejects(clients.readPublishWorkflowIdentity({ repository: "kimyeongwoo/kyw-dev", path: ".github/workflows/publish.yml" }));
    assert.equal(calls, expectedCalls);
  }
  let calls = 0;
  const clients = createPublicReleaseClients({ repositoryRoot: process.cwd(), commandRunner: async () => {
    calls += 1;
    return calls < 3 ? { status: 1, stdout: "", stderr: "HTTP 503" }
      : { status: 0, stdout: JSON.stringify({ id: 1, name: "Publish npm package through OIDC", path: ".github/workflows/publish.yml", state: "active" }), stderr: "" };
  } });
  assert.equal((await clients.readPublishWorkflowIdentity({ repository: "kimyeongwoo/kyw-dev", path: ".github/workflows/publish.yml" })).id, 1);
  assert.equal(calls, 3);
});

async function standaloneResumeFixture(t, { legacyWorkflow = false, workflowTransform = (text) => text, bootstrap = true,
  packageVersion = "2.0.0", pluginVersion = "2.0.0" } = {}) {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "kyw-release-resume-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, ".github/workflows"), { recursive: true });
  await mkdir(path.join(repositoryRoot, ".codex-plugin"));
  const repository = "kimyeongwoo/kyw-dev";
  const packageJson = { name: "kyw-dev", version: packageVersion, private: false, type: "module",
    repository: { type: "git", url: `git+https://github.com/${repository}.git` },
    files: [".codex-plugin/"], publishConfig: { access: "public", registry: "https://registry.npmjs.org/" } };
  await writeFile(path.join(repositoryRoot, "package.json"), JSON.stringify(packageJson));
  await writeFile(path.join(repositoryRoot, ".codex-plugin/plugin.json"), JSON.stringify({ name: "kyw-dev", version: pluginVersion }));
  let workflowText = await readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  if (legacyWorkflow) workflowText = workflowText
    .replace("Require latest canonical CI before publication", "Publish the exact checkout directory through OIDC")
    .replace(/\r?\n      - name: Publish the exact checkout directory through OIDC\r?\n        run: npm publish[^\r\n]+\r?\n?$/u, "\n");
  const originalWorkflowText = workflowText;
  workflowText = workflowTransform(workflowText);
  await writeFile(path.join(repositoryRoot, ".github/workflows/publish.yml"), workflowText);
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["config", "user.email", "fixture@example.invalid"]);
  git(repositoryRoot, ["config", "user.name", "Fixture"]);
  git(repositoryRoot, ["config", "core.autocrlf", "false"]);
  git(repositoryRoot, ["remote", "add", "origin", `https://github.com/${repository}.git`]);
  await writeFile(path.join(repositoryRoot, "before.txt"), "before release\n");
  git(repositoryRoot, ["add", "before.txt"]);
  git(repositoryRoot, ["commit", "-m", "before release"]);
  const previousSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  git(repositoryRoot, ["add", "."]);
  git(repositoryRoot, ["commit", "-m", "prepared release"]);
  const releaseSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  const keyPairs = ["original", "backup", "rotated"].map((name) => ({
    keyid: `SHA256:${name}`, ...generateKeyPairSync("ec", { namedCurve: "P-256" }),
  }));
  const state = { npm: false, workflow: false, tag: false, release: false,
    remoteMainSha: releaseSha, remoteRef: "refs/heads/main", remoteType: "commit", compareStatus: "ahead",
    compareBaseSha: releaseSha, mergeBaseSha: releaseSha, signingKeys: 2, fault: null, advanceOnMainRead: null };
  const trace = { writes: [], reads: [], commands: [], workflowBytes: [], npmPublish: 0, provenance: 0 };
  let originalTuple, archive, signature;
  const json = (value) => ({ status: 0, stdout: JSON.stringify(value), stderr: "" });
  const notFound = () => ({ status: 1, stdout: "", stderr: "HTTP 404 Not Found" });
  const release = () => ({ id: 701, tag_name: "v2.0.0", name: "v2.0.0", body: "",
    draft: false, prerelease: false, assets: [] });
  const commandRunner = async ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (command !== "gh") {
      trace.commands.push({ command, args: [...args] });
      if (args.includes("publish")) { trace.npmPublish += 1; throw new Error("unexpected npm publish"); }
      const result = runOwnedLocalCommand({ command, args, cwd, timeoutMs, maxBuffer });
      if (command === "git" && args[0] === "show" && args[1].endsWith(":.github/workflows/publish.yml")) {
        trace.workflowBytes.push(result.stdout);
        if (state.freshWorkflowText !== undefined) result.stdout = state.freshWorkflowText;
      }
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
    assert.ok(endpoint.startsWith(`repos/${repository}/`), `unexpected GitHub repository: ${endpoint}`);
    if (endpoint.split("?")[0] === `repos/${repository}/git/ref/heads/main`) {
      if (state.fault === "remote-read") return { status: 1, stdout: "", stderr: "HTTP 403 Forbidden" };
      const mainReads = trace.reads.filter((entry) => entry.includes("/git/ref/heads/main")).length;
      if (state.advanceOnMainRead === mainReads) state.remoteMainSha = advancedMainSha;
      return json({ ref: state.remoteRef, object: { type: state.remoteType, sha: state.remoteMainSha } });
    }
    if (endpoint.split("?")[0] === `repos/${repository}/compare/${releaseSha}...${state.remoteMainSha}`) return json({ status: state.compareStatus,
      base_commit: { sha: state.compareBaseSha }, merge_base_commit: { sha: state.mergeBaseSha } });
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
    assert.equal(url.origin, "https://registry.npmjs.org");
    assert.equal(url.username, ""); assert.equal(url.password, ""); assert.equal(url.hash, "");
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
  const hydrate = (overrides = {}) => hydratePublicReleaseContext({ repositoryRoot, releaseVersion: "2.0.0", releaseSha, ...runtime, ...overrides });
  if (!bootstrap) return { repositoryRoot, releaseSha, previousSha, state, trace, hydrate, workflowText, originalWorkflowText };
  // Freeze the real prepared source before the fixture represents publication.
  originalTuple = (await hydrate()).tuple;
  signature = sign("sha256", Buffer.from(`kyw-dev@2.0.0:${originalTuple.package.tarball.integrity}`), keyPairs[0].privateKey).toString("base64");
  await writeFile(path.join(repositoryRoot, "later.txt"), "main advanced after npm publication\n");
  git(repositoryRoot, ["add", "later.txt"]);
  git(repositoryRoot, ["commit", "-m", "advance main"]);
  const advancedMainSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  state.remoteMainSha = advancedMainSha;
  const reset = () => {
    Object.assign(state, { npm: true, workflow: true, tag: false, release: false, signingKeys: 3,
      remoteMainSha: advancedMainSha, remoteRef: "refs/heads/main", remoteType: "commit", compareStatus: "ahead",
      compareBaseSha: releaseSha, mergeBaseSha: releaseSha, fault: null, advanceOnMainRead: null, freshWorkflowText: undefined });
    trace.writes.length = 0; trace.reads.length = 0; trace.commands.length = 0; trace.workflowBytes.length = 0;
    trace.npmPublish = 0; trace.provenance = 0;
  };
  const invoke = () => runTaskArtifactCommand(["public-release", "--repository-root", repositoryRoot,
    "--invocation", `$kyw-deliver --release 2.0.0 --sha ${releaseSha}`], runtime);
  reset();
  return { state, trace, reset, invoke, hydrate, originalTuple, releaseSha, previousSha, advancedMainSha, repositoryRoot, workflowText, originalWorkflowText };
}

test("production remote-main proof admits exact target objects with absent, stale or different local main", async (t) => {
  const fixture = await standaloneResumeFixture(t);
  git(fixture.repositoryRoot, ["checkout", "--detach", fixture.releaseSha]);
  await writeFile(path.join(fixture.repositoryRoot, "user-work.txt"), "preserve this worktree\n");
  for (const [name, localMain] of [["absent", null], ["stale", fixture.previousSha], ["different", fixture.advancedMainSha]]) {
    await t.test(name, async () => {
      fixture.reset();
      Object.assign(fixture.state, { npm: false, workflow: false, remoteMainSha: fixture.releaseSha });
      if (localMain === null) git(fixture.repositoryRoot, ["branch", "-D", "main"]);
      else git(fixture.repositoryRoot, ["branch", "-f", "main", localMain]);
      const before = { refs: git(fixture.repositoryRoot, ["show-ref", "--head"]),
        head: git(fixture.repositoryRoot, ["rev-parse", "HEAD"]), status: git(fixture.repositoryRoot, ["status", "--porcelain"]) };
      const context = await fixture.hydrate();
      assert.equal(context.standardDelivery.releaseTarget.currentMainSha, fixture.releaseSha);
      assert.equal(context.standardDelivery.releaseTarget.mainContainsTarget, true);
      assert.equal(context.diagnostics.baseHeadSha, fixture.releaseSha);
      assert.equal(context.diagnostics.baseHeadRelation, "EXACT");
      assert.deepEqual(context.tuple.target, fixture.originalTuple.target);
      assert.deepEqual(context.tuple.package.tarball, fixture.originalTuple.package.tarball);
      assert.ok(fixture.trace.reads.some((endpoint) => endpoint.includes("/git/ref/heads/main")));
      assert.equal(fixture.trace.commands.some(({ args }) => args.some((arg) => arg === "refs/heads/main" || arg === "merge-base" || arg === "fetch")), false);
      assert.deepEqual(fixture.trace.writes, []);
      assert.deepEqual({ refs: git(fixture.repositoryRoot, ["show-ref", "--head"]),
        head: git(fixture.repositoryRoot, ["rev-parse", "HEAD"]), status: git(fixture.repositoryRoot, ["status", "--porcelain"]) }, before);
      assert.equal(await readFile(path.join(fixture.repositoryRoot, "user-work.txt"), "utf8"), "preserve this worktree\n");
    });
  }
});

test("production canonical ref identity and ancestry errors block even when local main equals target", async (t) => {
  const fixture = await standaloneResumeFixture(t);
  git(fixture.repositoryRoot, ["checkout", "--detach", fixture.releaseSha]);
  git(fixture.repositoryRoot, ["branch", "-f", "main", fixture.releaseSha]);
  for (const [name, change] of [
    ["wrong ref", { remoteRef: "refs/heads/other" }],
    ["wrong type", { remoteType: "tag" }],
    ["missing SHA", { remoteMainSha: undefined }],
    ["malformed SHA", { remoteMainSha: "invalid" }],
    ["read failure", { fault: "remote-read" }],
    ["diverged target", { compareStatus: "diverged" }],
    ["wrong compare base", { compareBaseSha: "f".repeat(40) }],
    ["wrong merge base", { mergeBaseSha: "f".repeat(40) }],
  ]) await t.test(name, async () => {
    fixture.reset();
    Object.assign(fixture.state, change);
    const result = await fixture.invoke();
    assert.equal(result.outcome, "BLOCKED", JSON.stringify(result));
    assert.deepEqual(fixture.trace.writes, []);
    assert.equal(fixture.trace.npmPublish, 0);
    assert.equal(git(fixture.repositoryRoot, ["rev-parse", "main"]), fixture.releaseSha);
  });
});

test("production fresh PRE_NPM_WRITE and mutator boundaries reject main advancing after hydration", async (t) => {
  const fixture = await standaloneResumeFixture(t);
  fixture.reset();
  Object.assign(fixture.state, { npm: false, workflow: false, remoteMainSha: fixture.releaseSha, signingKeys: 1, advanceOnMainRead: 3 });
  const result = await fixture.invoke();
  assert.equal(result.outcome, "BLOCKED", JSON.stringify(result));
  assert.ok(fixture.trace.reads.filter((endpoint) => endpoint.includes("/git/ref/heads/main")).length >= 3);
  assert.deepEqual(fixture.trace.writes, []);

  fixture.reset();
  Object.assign(fixture.state, { npm: false, workflow: false, remoteMainSha: fixture.releaseSha, signingKeys: 1 });
  const context = await fixture.hydrate();
  const exactProof = await context.clients.readWorkflowRuns(context.tuple, { fresh: true, cacheBypass: true, purpose: "PRE_NPM_WRITE", sequence: 1 });
  assert.equal(exactProof.baseHeadSha, fixture.releaseSha);
  fixture.state.remoteMainSha = fixture.advancedMainSha;
  await assert.rejects(context.clients.dispatchPublishWorkflow(context.tuple), (error) => error.code === "PUBLIC_RELEASE_PREWRITE_STATE_CHANGED");
  assert.deepEqual(fixture.trace.writes, []);
  assert.equal(fixture.trace.npmPublish, 0);
});

test("exact target object and package/plugin version checks remain mandatory", async (t) => {
  const fixture = await standaloneResumeFixture(t);
  await assert.rejects(fixture.hydrate({ releaseSha: "e".repeat(40) }), /command failure|required evidence|source/i);
  assert.deepEqual(fixture.trace.writes, []);
  for (const versions of [{ packageVersion: "2.0.1" }, { pluginVersion: "2.0.1" }]) {
    const mismatch = await standaloneResumeFixture(t, { ...versions, bootstrap: false });
    await assert.rejects(mismatch.hydrate(), /versions must equal|version/i);
    assert.deepEqual(mismatch.trace.writes, []);
    assert.deepEqual(mismatch.trace.reads, []);
  }
});

function workflowWithYamlComments(text) {
  return "# npm publish appears only in the actual publisher below\n# NPM_TOKEN is not used\n# run: node ./scripts/publish-gate.mjs\n" + text
    .replace("contents: read", "contents: read # NPM_TOKEN is not used")
    .replace("run: |", "run: | # keep the entire executable block")
    .replace("      - name: Require latest canonical CI before publication", "      # npm publish is performed only after this gate\n      - name: Require latest canonical CI before publication")
    .replace("      - name: Publish the exact checkout directory through OIDC", "      # NPM_TOKEN and npm publish in YAML comments are inert\n      - name: Publish the exact checkout directory through OIDC # publisher identity\n        # run: node ./scripts/publish-gate.mjs")
    .replace("run: npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/", "run: npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/ # npm publish is performed only here")
    + "\n# trailing npm publish / NPM_TOKEN / gate documentation\n";
}

test("YAML-only workflow comments pass hydration and production fresh source checks with original bytes intact", async (t) => {
  const fixture = await standaloneResumeFixture(t, { workflowTransform: workflowWithYamlComments });
  const context = await fixture.hydrate();
  const history = await context.clients.readWorkflowRuns(context.tuple, { fresh: true, cacheBypass: true, purpose: "PRE_TAG_WRITE", sequence: 2 });
  assert.equal(history.baseHeadSha, fixture.advancedMainSha);
  assert.ok(fixture.trace.workflowBytes.length >= 3);
  assert.ok(fixture.trace.workflowBytes.every((text) => text === fixture.workflowText));
  assert.equal(git(fixture.repositoryRoot, ["show", `${fixture.releaseSha}:.github/workflows/publish.yml`]), fixture.workflowText.trim());
  assert.notEqual(createHash("sha256").update(fixture.workflowText).digest("hex"), createHash("sha256").update(fixture.originalWorkflowText).digest("hex"));
  assert.equal(context.tuple.target.treeSha, git(fixture.repositoryRoot, ["rev-parse", `${fixture.releaseSha}^{tree}`]));
  assert.deepEqual(context.tuple.target, fixture.originalTuple.target);
  assert.deepEqual(context.tuple.package.signature, fixture.originalTuple.package.signature);
  const result = await fixture.invoke();
  assert.equal(result.outcome, "COMPLETE", JSON.stringify(result));
  assert.equal(fixture.trace.npmPublish, 0);
});

test("actual workflow guard and publisher changes block hydration and production fresh source revalidation", async (t) => {
  const valid = await standaloneResumeFixture(t);
  const context = await valid.hydrate();
  valid.state.remoteMainSha = valid.releaseSha;
  await context.clients.readWorkflowRuns(context.tuple, { fresh: true, cacheBypass: true, purpose: "PRE_NPM_WRITE", sequence: 3 });
  for (const [name, transform] of [
    ["duplicate publisher", (text) => text + "\n      - name: Extra publisher\n        run: npm publish .\n"],
    ["real token", (text) => text.replace("GITHUB_TOKEN: ${{ github.token }}", "NPM_TOKEN: ${{ secrets.NPM_TOKEN }}")],
    ["continue on error", (text) => text.replace("        run: npm publish", "        continue-on-error: true\n        run: npm publish")],
    ["guard only in comment", (text) => text.replace("        run: node ./scripts/publish-gate.mjs", "        # run: node ./scripts/publish-gate.mjs\n        run: echo gate removed")],
    ["conditional gate", (text) => text.replace("      - name: Require latest canonical CI before publication", "      - name: Require latest canonical CI before publication\n        if: ${{ false }}")],
    ["changed publisher command", (text) => text.replace("run: npm publish .", "run: npm publish other")],
    ["changed permission", (text) => text.replace("id-token: write", "id-token: read")],
    ["unpinned action", (text) => text.replace(/(uses: actions\/checkout@)[a-f0-9]{40}/u, "$1v6")],
  ]) await t.test(name, async () => {
    const changed = await standaloneResumeFixture(t, { workflowTransform: transform, bootstrap: false });
    assert.notEqual(changed.workflowText, changed.originalWorkflowText);
    await assert.rejects(changed.hydrate(), /PUBLISH_WORKFLOW/u);
    assert.deepEqual(changed.trace.writes, []);
    valid.state.freshWorkflowText = transform(valid.workflowText);
    await assert.rejects(context.clients.readWorkflowRuns(context.tuple, { fresh: true, cacheBypass: true, purpose: "PRE_NPM_WRITE", sequence: 3 }), /PUBLISH_WORKFLOW/u);
    assert.deepEqual(valid.trace.writes, []);
  });
});

test("standalone CR cannot hide settings or a second publisher from production source checks", async (t) => {
  for (const [endingName, ending] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
    const valid = await standaloneResumeFixture(t, {
      bootstrap: false,
      workflowTransform: (text) => text.replaceAll("\r\n", "\n").replaceAll("\n", ending),
    });
    const context = await valid.hydrate();
    const fresh = () => context.clients.readWorkflowRuns(context.tuple, {
      fresh: true, cacheBypass: true, purpose: "PRE_NPM_WRITE", sequence: 3,
    });
    await fresh();
    for (const [name, transform] of [
      ["token setting", (text) => text.replace(`env:${ending}`,
        `env:${ending}  # explanatory comment\r  NPM_TOKEN: synthetic-marker${ending}`)],
      ["second publisher", (text) => text.replace("      - name: Publish the exact checkout directory through OIDC",
        `      # explanatory comment\r      - name: Extra publisher\r        run: npm publish .${ending}` +
          "      - name: Publish the exact checkout directory through OIDC")],
    ]) {
      const workflowText = `# removable first\n${transform(valid.workflowText)}`;
      await t.test(`${endingName} ${name}: hydration`, async () => {
        const changed = await standaloneResumeFixture(t, {
          bootstrap: false, workflowTransform: () => workflowText,
        });
        await assert.rejects(changed.hydrate(), /PUBLISH_WORKFLOW/u);
        assert.ok(changed.trace.workflowBytes.length > 0);
        assert.ok(changed.trace.workflowBytes.every((text) => text === workflowText));
        assert.deepEqual(changed.trace.writes, []);
        assert.equal(changed.trace.npmPublish, 0);
      });
      await t.test(`${endingName} ${name}: fresh revalidation`, async () => {
        valid.state.freshWorkflowText = workflowText;
        await assert.rejects(fresh(), /PUBLISH_WORKFLOW/u);
        assert.deepEqual(valid.trace.writes, []);
        assert.equal(valid.trace.npmPublish, 0);
      });
    }
  }
});

test("new standalone invocation hydrates published ancestors and resumes only missing exact effects", async (t) => {
  const fixture = await standaloneResumeFixture(t);
  git(fixture.repositoryRoot, ["checkout", "--detach", fixture.releaseSha]);
  git(fixture.repositoryRoot, ["branch", "-f", "main", fixture.releaseSha]);
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
    assert.deepEqual(fixture.trace.writes.map(({ endpoint }) => endpoint.replace("repos/kimyeongwoo/kyw-dev/", "")), expectedWrites);
    assert.equal(fixture.trace.npmPublish, 0);
    assert.ok(fixture.trace.provenance > 0);
    assert.ok(fixture.trace.reads.some((endpoint) => endpoint.includes(`/compare/${fixture.releaseSha}...${fixture.advancedMainSha}`)));
    assert.equal(git(fixture.repositoryRoot, ["rev-parse", "main"]), fixture.releaseSha);
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
      assert.equal(git(fixture.repositoryRoot, ["rev-parse", "main"]), fixture.releaseSha);
    });
  }
});

test("a new invocation resumes a published ancestor with the historical combined workflow", async (t) => {
  const fixture = await standaloneResumeFixture(t, { legacyWorkflow: true });
  const result = await fixture.invoke();
  assert.equal(result.outcome, "COMPLETE", JSON.stringify(result));
  assert.equal(result.publicReleaseHydration.baseHeadSha, fixture.advancedMainSha);
  assert.deepEqual(result.publicReleaseTuple.package.signature, fixture.originalTuple.package.signature);
  assert.deepEqual(fixture.trace.writes.map(({ endpoint }) => endpoint.replace("repos/kimyeongwoo/kyw-dev/", "")), ["git/refs", "releases"]);
  assert.equal(fixture.trace.npmPublish, 0);
});

test("standalone public-release adapter rejects another origin without publisher, tag or Release effects", async (t) => {
  const fixture = await standaloneResumeFixture(t);
  git(fixture.repositoryRoot, ["remote", "set-url", "origin", "https://github.com/other/project.git"]);
  const result = await fixture.invoke();
  assert.equal(result.outcome, "BLOCKED");
  assert.equal(result.code, "PUBLIC_RELEASE_REPOSITORY_UNSUPPORTED");
  assert.deepEqual(fixture.trace.writes, []);
  assert.deepEqual(fixture.trace.reads, []);
  assert.equal(fixture.trace.npmPublish, 0);
});
