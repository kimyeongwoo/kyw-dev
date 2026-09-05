import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { hydratePublicReleaseContext } from "../src/core/task-artifact-hydration.mjs";

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
  assert.equal(publicReads, 1);
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
