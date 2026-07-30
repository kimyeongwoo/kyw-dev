import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";

const FIXTURE_NAME = "kyw-git-head-fixture";
const FIXTURE_VERSION = "1.0.0";
const LOOPBACK_HOST = "127.0.0.1";
const LOOPBACK_AUTH_VALUE = "kyw-owned-loopback-fixture";
const MAX_CAPTURE_BYTES = 2 * 1024 * 1024;
const MAX_COMMAND_OUTPUT_BYTES = 1024 * 1024;

function isolatedEnvironment() {
  const environment = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (
      /^(?:NODE_AUTH_TOKEN|NPM_TOKEN)$/i.test(name) ||
      (/^npm_config_/i.test(name) && name.toLowerCase() !== "npm_execpath")
    ) {
      continue;
    }
    environment[name] = value;
  }
  environment.CI = "true";
  environment.FORCE_COLOR = "0";
  environment.NO_COLOR = "1";
  environment.NO_PROXY = [environment.NO_PROXY, LOOPBACK_HOST, "localhost"]
    .filter(Boolean)
    .join(",");
  environment.no_proxy = environment.NO_PROXY;
  return environment;
}

function runCommand(
  command,
  args,
  { cwd, environment = isolatedEnvironment(), shell = false, timeout = 60_000 } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: environment,
      shell,
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let settled = false;
    let timer;

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    }

    function capture(target, chunk) {
      outputBytes += chunk.length;
      if (outputBytes > MAX_COMMAND_OUTPUT_BYTES) {
        child.kill();
        finish(new Error(`${command} exceeded the bounded output limit`));
        return;
      }
      target.push(chunk);
    }

    child.stdout.on("data", (chunk) => capture(stdout, chunk));
    child.stderr.on("data", (chunk) => capture(stderr, chunk));
    child.on("error", (error) => finish(error));
    child.on("close", (code, signal) => {
      const result = {
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) {
        finish(undefined, result);
        return;
      }
      finish(
        new Error(
          `${command} exited ${code ?? `by signal ${signal}`}: ${result.stderr.trim()}`,
        ),
      );
    });

    timer = setTimeout(() => {
      child.kill();
      finish(new Error(`${command} exceeded the ${timeout}ms timeout`));
    }, timeout);
  });
}

function npmInvocation(args) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return {
      command: process.execPath,
      args: [npmExecPath, ...args],
      shell: false,
    };
  }
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd", ...args],
      shell: false,
    };
  }
  return {
    command: "npm",
    args,
    shell: false,
  };
}

async function runNpm(args, options) {
  const invocation = npmInvocation(args);
  return runCommand(invocation.command, invocation.args, {
    ...options,
    shell: invocation.shell,
  });
}

function sha1(bytes) {
  return createHash("sha1").update(bytes).digest("hex");
}

function integrity(bytes) {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

function assertSourceManifestDoesNotFabricateGitHead(manifest) {
  assert.equal(
    Object.hasOwn(manifest, "gitHead"),
    false,
    "fixture source package.json must not define gitHead",
  );
}

function assertPackumentComesFromRawCapture(rawBody, packument) {
  assert.deepEqual(
    packument,
    JSON.parse(rawBody.toString("utf8")),
    "registry proof must use the raw submitted packument without post-processing",
  );
}

function submittedVersion(packument) {
  assert.equal(packument.name, FIXTURE_NAME);
  assert.deepEqual(Object.keys(packument.versions), [FIXTURE_VERSION]);
  return packument.versions[FIXTURE_VERSION];
}

function submittedTarball(packument) {
  const attachmentNames = Object.keys(packument._attachments);
  assert.equal(attachmentNames.length, 1);
  const attachment = packument._attachments[attachmentNames[0]];
  assert.equal(attachment.content_type, "application/octet-stream");
  const bytes = Buffer.from(attachment.data, "base64");
  assert.equal(bytes.length, attachment.length);
  return { attachmentName: attachmentNames[0], bytes };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
    server.closeAllConnections?.();
  });
}

async function capturePublish({ spec, sourceDirectory, ownedRoot, label }) {
  const requests = [];
  let handlerError;
  const server = createServer(async (request, response) => {
    try {
      const chunks = [];
      let bodyBytes = 0;
      for await (const chunk of request) {
        bodyBytes += chunk.length;
        if (bodyBytes > MAX_CAPTURE_BYTES) {
          throw new Error("loopback registry request exceeded the capture limit");
        }
        chunks.push(chunk);
      }
      if (request.method !== "PUT") {
        response.writeHead(404, { "content-type": "application/json" });
        response.end('{"error":"not_found"}');
        return;
      }
      requests.push({
        authorization: request.headers.authorization,
        body: Buffer.concat(chunks),
        method: request.method,
        url: request.url,
      });
      response.writeHead(201, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          id: FIXTURE_NAME,
          rev: "1-kyw-owned-loopback-fixture",
        }),
      );
    } catch (error) {
      handlerError = error;
      response.writeHead(500, { "content-type": "application/json" });
      response.end('{"error":"fixture_failure"}');
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, LOOPBACK_HOST, resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const registryUrl = `http://${LOOPBACK_HOST}:${address.port}/`;
  const userConfigPath = join(ownedRoot, `${label}.npmrc`);
  const cacheDirectory = join(ownedRoot, `${label}-cache`);
  await writeFile(
    userConfigPath,
    [
      `registry=${registryUrl}`,
      `//${LOOPBACK_HOST}:${address.port}/:_authToken=${LOOPBACK_AUTH_VALUE}`,
      "always-auth=true",
      "audit=false",
      "fund=false",
      "provenance=false",
      "fetch-retries=0",
      "logs-max=0",
      "",
    ].join("\n"),
    "utf8",
  );

  try {
    await runNpm(
      [
        "publish",
        spec,
        "--access=public",
        "--ignore-scripts",
        "--provenance=false",
        "--fetch-retries=0",
        "--loglevel=error",
        `--registry=${registryUrl}`,
        `--userconfig=${userConfigPath}`,
        `--cache=${cacheDirectory}`,
      ],
      { cwd: sourceDirectory },
    );
  } finally {
    await closeServer(server);
  }

  if (handlerError) throw handlerError;
  assert.equal(requests.length, 1, "npm publish must submit exactly one PUT");
  const [captured] = requests;
  assert.equal(captured.method, "PUT");
  assert.equal(decodeURIComponent(captured.url.slice(1)), FIXTURE_NAME);
  assert.equal(captured.authorization, `Bearer ${LOOPBACK_AUTH_VALUE}`);
  const packument = JSON.parse(captured.body.toString("utf8"));
  assertPackumentComesFromRawCapture(captured.body, packument);
  return { ...captured, packument };
}

test(
  "actual npm directory publish derives gitHead while tarball input cannot synthesize it",
  { timeout: 120_000 },
  async (t) => {
    const ownedRoot = await mkdtemp(join(tmpdir(), "kyw-npm-git-head-"));
    t.after(() => rm(ownedRoot, { recursive: true, force: true }));
    const sourceDirectory = join(ownedRoot, "source");
    const candidateDirectory = join(ownedRoot, "candidate");
    const extractedDirectory = join(ownedRoot, "extracted");
    await Promise.all([
      mkdir(sourceDirectory),
      mkdir(candidateDirectory),
      mkdir(extractedDirectory),
    ]);

    const sourceManifest = {
      name: FIXTURE_NAME,
      version: FIXTURE_VERSION,
      description: "Owned loopback npm gitHead fixture.",
      type: "module",
      files: ["index.js", "README.md"],
      license: "MIT",
    };
    assertSourceManifestDoesNotFabricateGitHead(sourceManifest);
    await Promise.all([
      writeFile(
        join(sourceDirectory, "package.json"),
        `${JSON.stringify(sourceManifest, null, 2)}\n`,
        "utf8",
      ),
      writeFile(join(sourceDirectory, "index.js"), 'export const fixture = "owned";\n'),
      writeFile(
        join(sourceDirectory, "README.md"),
        "# Owned npm gitHead fixture\n",
        "utf8",
      ),
    ]);

    for (const args of [
      ["init", "--quiet"],
      ["config", "user.name", "kyw fixture"],
      ["config", "user.email", "fixture@invalid.example"],
      ["config", "commit.gpgsign", "false"],
      ["add", "--all"],
      ["commit", "--quiet", "-m", "fixture"],
    ]) {
      await runCommand("git", args, { cwd: sourceDirectory });
    }
    const { stdout: commitOutput } = await runCommand(
      "git",
      ["rev-parse", "HEAD"],
      { cwd: sourceDirectory },
    );
    const expectedCommit = commitOutput.trim();
    assert.match(expectedCommit, /^[0-9a-f]{40}$/);
    await runCommand("git", ["checkout", "--quiet", "--detach", expectedCommit], {
      cwd: sourceDirectory,
    });

    const packConfigPath = join(ownedRoot, "pack.npmrc");
    const packCacheDirectory = join(ownedRoot, "pack-cache");
    await writeFile(
      packConfigPath,
      [
        "registry=http://127.0.0.1:1/",
        "audit=false",
        "fund=false",
        "provenance=false",
        "fetch-retries=0",
        "logs-max=0",
        "",
      ].join("\n"),
      "utf8",
    );
    const packed = await runNpm(
      [
        "pack",
        ".",
        "--json",
        "--ignore-scripts",
        "--loglevel=error",
        `--pack-destination=${candidateDirectory}`,
        `--userconfig=${packConfigPath}`,
        `--cache=${packCacheDirectory}`,
      ],
      { cwd: sourceDirectory },
    );
    const [packReport] = JSON.parse(packed.stdout);
    const candidatePath = join(candidateDirectory, packReport.filename);
    const candidateBytes = await readFile(candidatePath);
    assert.equal(packReport.shasum, sha1(candidateBytes));
    assert.equal(packReport.integrity, integrity(candidateBytes));
    assert.equal(packReport.filename, `${FIXTURE_NAME}-${FIXTURE_VERSION}.tgz`);

    await runCommand(
      "tar",
      ["-xf", candidatePath, "-C", extractedDirectory],
      { cwd: ownedRoot },
    );
    const archivedManifest = JSON.parse(
      await readFile(
        join(extractedDirectory, "package", "package.json"),
        "utf8",
      ),
    );
    assertSourceManifestDoesNotFabricateGitHead(archivedManifest);

    const directoryCapture = await capturePublish({
      spec: ".",
      sourceDirectory,
      ownedRoot,
      label: "directory",
    });
    const directoryVersion = submittedVersion(directoryCapture.packument);
    const directoryTarball = submittedTarball(directoryCapture.packument);
    assert.equal(directoryVersion.gitHead, expectedCommit);
    assert.equal(directoryVersion.dist.shasum, sha1(candidateBytes));
    assert.equal(directoryVersion.dist.integrity, integrity(candidateBytes));
    assert.equal(directoryTarball.attachmentName, basename(candidatePath));
    assert.deepEqual(directoryTarball.bytes, candidateBytes);

    const tarballCapture = await capturePublish({
      spec: candidatePath,
      sourceDirectory,
      ownedRoot,
      label: "tarball",
    });
    const tarballVersion = submittedVersion(tarballCapture.packument);
    const tarballBytes = submittedTarball(tarballCapture.packument).bytes;
    assert.equal(Object.hasOwn(tarballVersion, "gitHead"), false);
    assert.deepEqual(tarballBytes, candidateBytes);

    const sourceAfterPublish = JSON.parse(
      await readFile(join(sourceDirectory, "package.json"), "utf8"),
    );
    assertSourceManifestDoesNotFabricateGitHead(sourceAfterPublish);
    const { stdout: status } = await runCommand(
      "git",
      ["status", "--porcelain"],
      { cwd: sourceDirectory },
    );
    assert.equal(status, "");
  },
);

test("fixture guards reject source and registry gitHead fabrication", () => {
  const fabricatedCommit = "a".repeat(40);
  assert.throws(
    () =>
      assertSourceManifestDoesNotFabricateGitHead({
        name: FIXTURE_NAME,
        version: FIXTURE_VERSION,
        gitHead: fabricatedCommit,
      }),
    /must not define gitHead/,
  );

  const rawBody = Buffer.from(
    JSON.stringify({
      name: FIXTURE_NAME,
      versions: {
        [FIXTURE_VERSION]: {
          name: FIXTURE_NAME,
          version: FIXTURE_VERSION,
        },
      },
    }),
  );
  const postProcessed = JSON.parse(rawBody.toString("utf8"));
  postProcessed.versions[FIXTURE_VERSION].gitHead = fabricatedCommit;
  assert.throws(
    () => assertPackumentComesFromRawCapture(rawBody, postProcessed),
    /without post-processing/,
  );
});
