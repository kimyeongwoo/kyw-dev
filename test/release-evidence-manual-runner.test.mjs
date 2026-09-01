import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path, { basename, dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureParent = dirname(repositoryRoot);
const fixturePrefix = ".kyw-release-runner-test-";
const fixtureFiles = [
  ".gitattributes",
  "package.json",
  "scripts/lib/validate-foundation.mjs",
  "scripts/release-evidence-harness.mjs",
  "scripts/release-evidence-manual-runner.mjs",
  "scripts/release-gate-isolation.mjs",
  "src/core/template-contracts.mjs",
];
let importSequence = 0;

function assertRunnerCode(code) {
  return (error) => error?.code === code;
}

function replaceEnvironmentValue(environment, name, value) {
  for (const current of Object.keys(environment)) {
    if (current.toLowerCase() === name.toLowerCase()) delete environment[current];
  }
  environment[name] = value;
  return environment;
}

function git(cwd, args, { allowFailure = false, environment = process.env } = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...environment,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0",
    },
    windowsHide: true,
  });
  if (!allowFailure && (result.status !== 0 || result.error)) {
    throw new Error(
      `git ${args.join(" ")} failed: ${String(result.error?.message ?? result.stderr).trim()}`,
    );
  }
  return result;
}

function commitAll(cwd, message) {
  git(cwd, ["add", "--all"]);
  git(cwd, ["-c", "commit.gpgsign=false", "commit", "--no-verify", "-m", message], {
    environment: {
      ...process.env,
      GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
      GIT_AUTHOR_EMAIL: "runner-test@example.invalid",
      GIT_AUTHOR_NAME: "Runner Test",
      GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
      GIT_COMMITTER_EMAIL: "runner-test@example.invalid",
      GIT_COMMITTER_NAME: "Runner Test",
    },
  });
}

function assertExactFixtureRoot(root) {
  const resolvedRoot = resolve(root);
  assert.equal(dirname(resolvedRoot), resolve(fixtureParent));
  assert.match(basename(resolvedRoot), /^\.kyw-release-runner-test-[A-Za-z0-9._-]+$/);
  const state = lstatSync(resolvedRoot);
  assert.equal(state.isDirectory(), true);
  assert.equal(state.isSymbolicLink(), false);
  return resolvedRoot;
}

function removeFixture(root) {
  if (!existsSync(root)) return;
  const exactRoot = assertExactFixtureRoot(root);
  rmSync(exactRoot, { force: true, maxRetries: 3, recursive: true, retryDelay: 50 });
}

async function createFixture(t) {
  const root = mkdtempSync(join(fixtureParent, fixturePrefix));
  try {
    const source = join(root, "repository with spaces");
    const allowedParent = join(root, "external parent with spaces");
    const evidenceRoot = join(allowedParent, "evidence");
    mkdirSync(join(source, "scripts"), { recursive: true });
    mkdirSync(evidenceRoot, { recursive: true });
    for (const relativePath of fixtureFiles) {
      const target = join(source, ...relativePath.split("/"));
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(repositoryRoot, ...relativePath.split("/")), target);
    }
    git(source, ["init", "--initial-branch=main"]);
    commitAll(source, "fixture source");
    const sourceSha = git(source, ["rev-parse", "HEAD"]).stdout.trim();
    const sourceTree = git(source, ["rev-parse", "HEAD^{tree}"]).stdout.trim();
    const runnerUrl = pathToFileURL(
      join(source, "scripts", "release-evidence-manual-runner.mjs"),
    );
    const harnessUrl = pathToFileURL(
      join(source, "scripts", "release-evidence-harness.mjs"),
    );
    importSequence += 1;
    const runner = await import(`${runnerUrl.href}?fixture=${importSequence}`);
    const harness = await import(harnessUrl.href);
    const fixture = {
      allowedParent,
      evidenceRoot,
      harness,
      root,
      runner,
      source,
      sourceSha,
      sourceTree,
    };
    t.after(() => removeFixture(root));
    return fixture;
  } catch (error) {
    removeFixture(root);
    throw error;
  }
}

function runnerOptions(fixture, mode = "dry-validate") {
  return {
    allowReleaseCommand: mode === "run",
    allowedParent: fixture.allowedParent,
    evidenceRoot: fixture.evidenceRoot,
    mode,
    repositoryRoot: fixture.source,
    sourceSha: fixture.sourceSha,
  };
}

function nonceSequence(start = 1) {
  let current = start;
  return () => {
    const value = current;
    current += 1;
    return value.toString(16).padStart(64, "0");
  };
}

function prepareHermeticFixture(fixture, { gitSpawn } = {}) {
  const options = runnerOptions(fixture);
  const validation = fixture.runner.validateManualRunnerInputs(options, {
    inheritedEnvironment: process.env,
  });
  const state = fixture.runner.createHermeticLayout(validation, {
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    nonce: nonceSequence(),
  });
  const runtime = fixture.runner.resolveRuntimeIdentities({
    inheritedEnvironment: process.env,
    interactiveRoots: validation.interactiveRoots,
  });
  const environment = fixture.runner.projectHermeticEnvironment({
    inheritedEnvironment: process.env,
    runtime,
    state,
  });
  const sourceIdentity = fixture.runner.captureRepositoryIdentity({
    environment,
    gitExecutable: runtime.gitLauncher,
    gitSpawn,
    repositoryRoot: fixture.source,
    sourceSha: fixture.sourceSha,
  });
  return { environment, options, runtime, sourceIdentity, state, validation };
}

function pathContains(root, candidate) {
  const normalizedRoot = resolve(root).toLowerCase();
  const normalizedCandidate = resolve(candidate).toLowerCase();
  const projected = relative(normalizedRoot, normalizedCandidate);
  return projected === "" || (!projected.startsWith("..") && !path.isAbsolute(projected));
}

function fakeHarnessSpawn(harness, calls, scenario = "success") {
  return async (intended) => {
    calls.push({
      args: [...intended.args],
      command: intended.command,
      cwd: intended.cwd,
      environment: { ...intended.environment },
      invocationName: intended.invocationName,
    });
    let reportedResult;
    if (!["child-failure", "parser-failure"].includes(scenario)) {
      const argumentValue = (name) => intended.args[intended.args.indexOf(name) + 1];
      const proofPath = argumentValue("--runner-proof");
      const innerEvidenceRoot = argumentValue("--evidence-root");
      const proofBytes = readFileSync(proofPath);
      const proof = JSON.parse(proofBytes.toString("utf8"));
      const receiptPath = `${proofPath}.consumed.json`;
      if (scenario !== "missing-receipt") {
        writeFileSync(
          receiptPath,
          `${JSON.stringify(
            {
              consumedAt: "2026-01-01T00:00:00.000Z",
              digest: proof.digest,
              kind: "kyw-dev-hermetic-run-proof-receipt",
              nonce: proof.nonce,
              proofFileSha256: createHash("sha256").update(proofBytes).digest("hex"),
              schemaVersion: 1,
              sourceSha: proof.source.sha,
            },
            null,
            2,
          )}\n`,
        );
      }
      const innerRun =
        scenario === "outside-inner-run"
          ? join(intended.context.runRoot, `outside-inner-${proof.nonce.slice(0, 12)}`)
          : join(innerEvidenceRoot, `release-evidence-run-fake-${proof.nonce.slice(0, 12)}`);
      mkdirSync(innerRun);
      const innerSummaryPath = join(innerRun, "summary.json");
      if (scenario !== "missing-summary") {
        writeFileSync(
          innerSummaryPath,
          `${JSON.stringify(
            {
              child: { status: "CHILD_EVIDENCE_RETAINED" },
              commandPlan: { releaseInvocationMaximum: 1, retryMaximum: 0 },
              proofDigest:
                scenario === "digest-mismatch" ? "0".repeat(64) : proof.digest,
              protectedState: { status: "CLEAN" },
              runRoot: innerRun,
              status:
                scenario === "summary-failure"
                  ? "CHILD_FAILED"
                  : "CHILD_EVIDENCE_RETAINED",
            },
            null,
            2,
          )}\n`,
        );
      }
      reportedResult = {
        runRoot: innerRun,
        status: "CHILD_EVIDENCE_RETAINED",
        summary: innerSummaryPath,
      };
    }
    const script =
      scenario === "child-failure"
        ? "process.stderr.write('FAKE_CHILD_FAILURE\\n'); process.exit(7);"
        : scenario === "parser-failure"
          ? "process.stdout.write('not-json');"
          : `process.stdout.write(${JSON.stringify(
              JSON.stringify(reportedResult),
            )});`;
    return harness.runDurableChild({
      ...intended,
      args: ["-e", script],
      command: process.execPath,
    });
  };
}

test("manual runner CLI parser rejects malformed command shapes", async (t) => {
  const fixture = await createFixture(t);
  const base = [
    "--repository",
    fixture.source,
    "--source-sha",
    fixture.sourceSha,
    "--allowed-parent",
    fixture.allowedParent,
    "--evidence-root",
    fixture.evidenceRoot,
  ];
  const parse = fixture.runner.parseManualRunnerArguments;
  assert.equal(parse(["--dry-validate", ...base]).mode, "dry-validate");
  assert.equal(
    parse(["--run", "--allow-release-command", ...base]).allowReleaseCommand,
    true,
  );
  for (const argv of [
    base,
    ["--dry-validate", "--run", ...base],
    ["--dry-validate", "--dry-validate", ...base],
    ["--dry-validate", ...base, "--repository", fixture.source],
    ["--dry-validate", ...base, "--unsupported"],
  ]) {
    assert.throws(() => parse(argv), assertRunnerCode("ARGUMENT_ERROR"));
  }
  assert.throws(
    () => parse(["--dry-validate", "--allow-release-command", ...base]),
    assertRunnerCode("ARGUMENT_ERROR"),
  );
  assert.throws(
    () => parse(["--run", ...base]),
    assertRunnerCode("AUTHORIZATION_REQUIRED"),
  );
  for (const invalidSha of ["HEAD", "main", fixture.sourceSha.slice(0, 12), "g".repeat(40)]) {
    const args = ["--dry-validate", ...base];
    args[args.indexOf(fixture.sourceSha)] = invalidSha;
    assert.throws(() => parse(args), assertRunnerCode("SOURCE_SHA_INVALID"));
  }
});

test("canonical real path validation rejects overlap, links, and interactive roots", async (t) => {
  const fixture = await createFixture(t);
  const options = runnerOptions(fixture);
  const valid = fixture.runner.validateManualRunnerInputs(options, {
    inheritedEnvironment: process.env,
  });
  assert.equal(valid.sourceSha, fixture.sourceSha);
  assert.equal(valid.repository.canonicalPath, fixture.source);
  assert.equal(valid.evidenceRoot.canonicalPath, fixture.evidenceRoot);

  assert.throws(
    () =>
      fixture.runner.validateManualRunnerInputs(
        { ...options, repositoryRoot: relative(process.cwd(), fixture.source) },
        { inheritedEnvironment: process.env },
      ),
    assertRunnerCode("SOURCE_REPOSITORY_UNSAFE"),
  );
  assert.throws(
    () =>
      fixture.runner.validateManualRunnerInputs(
        { ...options, evidenceRoot: fixture.allowedParent },
        { inheritedEnvironment: process.env },
      ),
    assertRunnerCode("PATH_UNSAFE"),
  );

  const insideRepository = join(fixture.source, "external", "evidence");
  mkdirSync(insideRepository, { recursive: true });
  assert.throws(
    () =>
      fixture.runner.validateManualRunnerInputs(
        {
          ...options,
          allowedParent: join(fixture.source, "external"),
          evidenceRoot: insideRepository,
        },
        { inheritedEnvironment: process.env },
      ),
    assertRunnerCode("PATH_UNSAFE"),
  );

  assert.throws(
    () =>
      fixture.runner.validateManualRunnerInputs(options, {
        inheritedEnvironment: {
          HOME: fixture.evidenceRoot,
          USERPROFILE: fixture.evidenceRoot,
        },
      }),
    assertRunnerCode("PATH_UNSAFE"),
  );

  const linkedEvidence = join(fixture.allowedParent, "linked-evidence");
  try {
    symlinkSync(
      fixture.evidenceRoot,
      linkedEvidence,
      process.platform === "win32" ? "junction" : "dir",
    );
    assert.throws(
      () =>
        fixture.runner.validateManualRunnerInputs(
          { ...options, evidenceRoot: linkedEvidence },
          { inheritedEnvironment: process.env },
        ),
      assertRunnerCode("PATH_UNSAFE"),
    );
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) throw error;
    t.diagnostic(`native link check unavailable: ${error.code}`);
  }

  if (process.platform === "win32") {
    const caseAliased = {
      ...options,
      allowedParent: fixture.allowedParent.toUpperCase(),
      evidenceRoot: fixture.evidenceRoot.toUpperCase(),
      repositoryRoot: fixture.source.toUpperCase(),
    };
    const windowsIdentity = fixture.runner.validateManualRunnerInputs(caseAliased, {
      inheritedEnvironment: process.env,
    });
    assert.equal(windowsIdentity.sourceSha, fixture.sourceSha);
  }
});

test("shared path identities cover spaces, Windows drive, UNC, extended, case, and 8.3 aliases", async (t) => {
  const fixture = await createFixture(t);
  const validation = fixture.runner.validateManualRunnerInputs(runnerOptions(fixture), {
    inheritedEnvironment: process.env,
  });
  assert.match(validation.repository.canonicalPath, /repository with spaces/);
  assert.match(validation.allowedParent.canonicalPath, /external parent with spaces/);
  for (const role of [validation.repository, validation.allowedParent, validation.evidenceRoot]) {
    assert.equal(
      fixture.harness.normalizePathIdentity(role.lexicalPath),
      fixture.harness.normalizePathIdentity(role.canonicalPath),
    );
  }

  const windowsOptions = { platform: "win32" };
  const drivePath = "C:\\Release Evidence\\Exact SHA";
  const driveCase = "c:\\release evidence\\exact sha";
  const extendedDrive = "\\\\?\\C:\\Release Evidence\\Exact SHA";
  assert.equal(
    fixture.harness.normalizePathIdentity(drivePath, windowsOptions),
    fixture.harness.normalizePathIdentity(driveCase, windowsOptions),
  );
  assert.equal(
    fixture.harness.normalizePathIdentity(extendedDrive, windowsOptions),
    fixture.harness.normalizePathIdentity(drivePath, windowsOptions),
  );
  assert.equal(
    fixture.harness.stripWindowsExtendedPrefix(extendedDrive),
    drivePath,
  );

  const uncPath = "\\\\EvidenceServer\\Release Share\\Exact SHA";
  const extendedUnc = "\\\\?\\UNC\\EvidenceServer\\Release Share\\Exact SHA";
  assert.equal(
    fixture.harness.stripWindowsExtendedPrefix(extendedUnc),
    uncPath,
  );
  assert.equal(
    fixture.harness.normalizePathIdentity(extendedUnc, windowsOptions),
    fixture.harness.normalizePathIdentity(uncPath.toLowerCase(), windowsOptions),
  );
  assert.equal(
    fixture.harness.isSameOrDescendant(
      "\\\\EvidenceServer\\Release Share",
      uncPath,
      windowsOptions,
    ),
    true,
  );

  const shortAlias = "C:\\PROGRA~1\\KYWDEV~1";
  const longAlias = "C:\\Program Files\\KYW Dev Evidence";
  const shortIdentity = fixture.harness.normalizePathIdentity(shortAlias, windowsOptions);
  const injectedCanonicalizer = (value) =>
    fixture.harness.normalizePathIdentity(value, windowsOptions) === shortIdentity
      ? longAlias
      : value;
  assert.equal(
    fixture.harness.canonicalIdentitiesEqual(shortAlias, longAlias, {
      canonicalizeExisting: injectedCanonicalizer,
      platform: "win32",
    }),
    true,
  );
});

test("hermetic layout and environment use only disjoint owned whitelist values", async (t) => {
  const fixture = await createFixture(t);
  const validation = fixture.runner.validateManualRunnerInputs(runnerOptions(fixture), {
    inheritedEnvironment: process.env,
  });
  const state = fixture.runner.createHermeticLayout(validation, {
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    nonce: () => "1".repeat(64),
  });
  assert.equal(dirname(state.stateRoot), dirname(fixture.evidenceRoot));
  assert.equal(pathContains(state.stateRoot, state.checkoutRoot), true);
  const layoutEntries = Object.entries(state.layout);
  for (const [, entryPath] of layoutEntries) {
    assert.equal(existsSync(entryPath), true);
    assert.equal(lstatSync(entryPath).isSymbolicLink(), false);
    assert.equal(pathContains(state.stateRoot, entryPath), true);
    assert.equal(pathContains(fixture.source, entryPath), false);
    assert.equal(pathContains(fixture.evidenceRoot, entryPath), false);
  }
  for (let left = 0; left < layoutEntries.length; left += 1) {
    for (let right = left + 1; right < layoutEntries.length; right += 1) {
      assert.equal(pathContains(layoutEntries[left][1], layoutEntries[right][1]), false);
      assert.equal(pathContains(layoutEntries[right][1], layoutEntries[left][1]), false);
    }
  }

  const inheritedEnvironment = {
    ...process.env,
    GIT_CONFIG_GLOBAL: join(homedir(), "interactive-gitconfig"),
    GIT_DIR: fixture.source,
    HTTP_PROXY: "http://user:password@example.invalid",
    NPM_TOKEN: `npm_${"x".repeat(24)}`,
    NODE_OPTIONS: "--require credential-loader",
    NODE_PATH: join(homedir(), "interactive-node-modules"),
    NO_PROXY: "localhost",
    npm_config_cache: join(homedir(), "interactive-npm-cache"),
    npm_config_registry: "https://user:password@example.invalid",
    npm_config_userconfig: join(homedir(), "interactive-npmrc"),
  };
  const runtime = fixture.runner.resolveRuntimeIdentities({
    inheritedEnvironment,
    interactiveRoots: validation.interactiveRoots,
  });
  const environment = fixture.runner.projectHermeticEnvironment({
    inheritedEnvironment,
    runtime,
    state,
  });
  const forbidden = [
    "GIT_DIR",
    "HTTP_PROXY",
    "NPM_TOKEN",
    "NODE_OPTIONS",
    "NODE_PATH",
    "NO_PROXY",
    "npm_config_registry",
  ];
  for (const name of forbidden) assert.equal(environment[name], undefined);
  assert.equal(environment.HOME, state.layout.homeRoot);
  assert.equal(environment.USERPROFILE, state.layout.homeRoot);
  assert.equal(environment.CODEX_HOME, state.layout.codexHomeRoot);
  assert.equal(environment.GIT_CONFIG_GLOBAL, state.layout.gitConfigGlobalFile);
  assert.equal(environment.npm_config_userconfig, state.layout.npmUserConfigFile);
  assert.equal(environment.npm_config_cache, state.layout.npmCacheRoot);
  assert.equal(environment.GIT_OPTIONAL_LOCKS, "0");
  assert.equal(environment.GIT_TERMINAL_PROMPT, "0");
  assert.equal(environment.npm_config_audit, "false");
  assert.equal(JSON.stringify(environment).toLowerCase().includes(homedir().toLowerCase()), false);
  const allowedNames = new Set([
    "APPDATA",
    "CODEX_HOME",
    "ComSpec",
    "GIT_ATTR_NOSYSTEM",
    "GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_NOSYSTEM",
    "GIT_CONFIG_SYSTEM",
    "GIT_OPTIONAL_LOCKS",
    "GIT_TERMINAL_PROMPT",
    "HOME",
    "HOMEDRIVE",
    "HOMEPATH",
    "LOCALAPPDATA",
    "LOGONSERVER",
    "OS",
    "PATH",
    "PATHEXT",
    "SHELL",
    "SystemRoot",
    "SYSTEMDRIVE",
    "TEMP",
    "TMP",
    "TMPDIR",
    "USERPROFILE",
    "USERDOMAIN",
    "USERNAME",
    "windir",
    "XDG_CACHE_HOME",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_STATE_HOME",
    "npm_config_audit",
    "npm_config_cache",
    "npm_config_color",
    "npm_config_fund",
    "npm_config_globalconfig",
    "npm_config_update_notifier",
    "npm_config_userconfig",
  ]);
  assert.equal(Object.keys(environment).every((name) => allowedNames.has(name)), true);
  if (process.platform === "win32") {
    assert.equal(
      resolve(`${environment.HOMEDRIVE}${environment.HOMEPATH}`).toLowerCase(),
      resolve(state.layout.homeRoot).toLowerCase(),
    );
  }
});

test("runtime resolution fails closed when Git or npm is unavailable", async (t) => {
  const fixture = await createFixture(t);
  const emptyPathEnvironment = replaceEnvironmentValue({ ...process.env }, "PATH", "");
  assert.throws(
    () =>
      fixture.runner.resolveRuntimeIdentities({
        inheritedEnvironment: emptyPathEnvironment,
        interactiveRoots: [],
      }),
    assertRunnerCode("GIT_CAPABILITY_MISSING"),
  );

  const baseline = fixture.runner.resolveRuntimeIdentities({
    inheritedEnvironment: process.env,
    interactiveRoots: [],
  });
  const isolatedBin = join(fixture.root, "git-only-runtime");
  mkdirSync(isolatedBin);
  const copiedGitName = process.platform === "win32" ? "git.exe" : "git";
  const copiedGit = join(isolatedBin, copiedGitName);
  copyFileSync(baseline.gitLauncher, copiedGit);
  if (process.platform !== "win32") chmodSync(copiedGit, 0o700);
  const gitOnlyEnvironment = replaceEnvironmentValue(
    { ...process.env },
    "PATH",
    isolatedBin,
  );
  assert.throws(
    () =>
      fixture.runner.resolveRuntimeIdentities({
        inheritedEnvironment: gitOnlyEnvironment,
        interactiveRoots: [],
      }),
    (error) => error?.code === "GIT_CAPABILITY_MISSING" && /npm/.test(error.message),
  );
});

test("actual attempt marker is durable before runtime failure and blocks the duplicate immediately", async (t) => {
  const fixture = await createFixture(t);
  const calls = [];
  const inheritedEnvironment = replaceEnvironmentValue({ ...process.env }, "PATH", "");
  const dependencies = {
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    harnessSpawn: async () => {
      calls.push("unexpected");
      throw new Error("harness must not run after a runtime preflight failure");
    },
    inheritedEnvironment,
    nonce: nonceSequence(300),
  };
  let firstFailure;
  await assert.rejects(
    () => fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), dependencies),
    (error) => {
      firstFailure = error;
      return error?.code === "GIT_CAPABILITY_MISSING";
    },
  );
  const markerPath = join(
    fixture.allowedParent,
    ".release-evidence-manual-attempt.json",
  );
  assert.equal(existsSync(markerPath), true);
  assert.equal(typeof firstFailure.details.runRoot, "string");
  assert.equal(existsSync(firstFailure.details.runRoot), true);
  await assert.rejects(
    () => fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), dependencies),
    assertRunnerCode("ATTEMPT_ALREADY_CONSUMED"),
  );
  assert.equal(calls.length, 0);
});

test("mid-layout failure retains owned evidence and a bound partial state seal", async (t) => {
  const fixture = await createFixture(t);
  const token = "7".repeat(64);
  const expectedStateRoot = join(
    fixture.allowedParent,
    `.release-evidence-state-${token}`,
  );
  const nativeCanonicalizer = realpathSync.native ?? realpathSync;
  let injectedFailures = 0;
  let harnessCalls = 0;
  const canonicalizer = (candidate) => {
    const candidatePath = resolve(candidate);
    if (
      injectedFailures === 0 &&
      candidatePath.startsWith(`${expectedStateRoot}${path.sep}`) &&
      basename(candidatePath) === "roaming"
    ) {
      injectedFailures += 1;
      throw new Error("injected failure after the state owner was persisted");
    }
    return nativeCanonicalizer(candidate);
  };
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        canonicalizer,
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        harnessSpawn: async () => {
          harnessCalls += 1;
          throw new Error("harness must not run after a layout failure");
        },
        inheritedEnvironment: process.env,
        nonce: () => token,
      }),
    (error) => {
      failure = error;
      return error?.code === "HARNESS_FAILED";
    },
  );
  assert.equal(injectedFailures, 1);
  assert.equal(harnessCalls, 0);
  assert.equal(failure.details.stateRoot, expectedStateRoot);
  assert.equal(existsSync(failure.details.stateRoot), true);
  assert.equal(typeof failure.details.runRoot, "string");
  assert.equal(existsSync(failure.details.runRoot), true);

  const owner = JSON.parse(
    readFileSync(join(expectedStateRoot, ".release-evidence-runner-owner.json"), "utf8"),
  );
  const stateSeal = JSON.parse(
    readFileSync(join(expectedStateRoot, ".release-evidence-runner-seal.json"), "utf8"),
  );
  assert.equal(stateSeal.token, token);
  assert.equal(stateSeal.hermeticProofDigest, null);
  assert.deepEqual(stateSeal.rootIdentity, owner.rootIdentity);
  assert.deepEqual(stateSeal.bindings.stateRoot.identity, owner.rootIdentity);
  assert.equal(stateSeal.bindings.stateRoot.canonicalPath, expectedStateRoot);
  assert.equal(stateSeal.bindings.allowedParent.canonicalPath, fixture.allowedParent);
  assert.equal(stateSeal.bindings.evidenceRoot.canonicalPath, fixture.evidenceRoot);
  assert.equal(stateSeal.bindings.repository.canonicalPath, fixture.source);
  assert.equal(
    stateSeal.inventory.some(
      (entry) => entry.path === ".release-evidence-runner-owner.json" && entry.type === "file",
    ),
    true,
  );

  const summary = JSON.parse(
    readFileSync(join(failure.details.runRoot, "summary.json"), "utf8"),
  );
  assert.equal(summary.status, "HARNESS_FAILED");
  assert.equal(summary.stateRoot, expectedStateRoot);
  assert.notEqual(summary.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  assert.equal(
    existsSync(join(failure.details.runRoot, ".release-evidence-seal.json")),
    true,
  );
});

test("launcher aliases whose targets enter an interactive root fail closed", async (t) => {
  const fixture = await createFixture(t);
  const baseline = fixture.runner.resolveRuntimeIdentities({
    inheritedEnvironment: process.env,
    interactiveRoots: [],
  });
  const interactiveRoot = join(fixture.root, "interactive-runtime");
  const aliasDirectory = join(fixture.root, "runtime-alias");
  mkdirSync(interactiveRoot);
  mkdirSync(aliasDirectory);
  const gitName = process.platform === "win32" ? "git.exe" : "git";
  const npmName = process.platform === "win32" ? "npm.cmd" : "npm";
  const interactiveGit = join(interactiveRoot, gitName);
  const interactiveNpm = join(interactiveRoot, npmName);
  copyFileSync(baseline.gitLauncher, interactiveGit);
  copyFileSync(baseline.npmLauncher, interactiveNpm);
  if (process.platform !== "win32") {
    chmodSync(interactiveGit, 0o700);
    chmodSync(interactiveNpm, 0o700);
  }
  let directoryAlias = false;
  try {
    symlinkSync(interactiveGit, join(aliasDirectory, gitName), "file");
    symlinkSync(interactiveNpm, join(aliasDirectory, npmName), "file");
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) throw error;
    rmSync(aliasDirectory, { recursive: true });
    symlinkSync(
      interactiveRoot,
      aliasDirectory,
      process.platform === "win32" ? "junction" : "dir",
    );
    directoryAlias = true;
  }
  const aliasedEnvironment = replaceEnvironmentValue(
    { ...process.env },
    "PATH",
    aliasDirectory,
  );
  assert.throws(
    () =>
      fixture.runner.resolveRuntimeIdentities({
        inheritedEnvironment: aliasedEnvironment,
        interactiveRoots: [
          {
            canonicalPath: interactiveRoot,
            name: "synthetic-interactive-runtime",
          },
        ],
      }),
    (error) =>
      error?.code === "ENVIRONMENT_UNSAFE" &&
      error?.details?.forbiddenRole === "synthetic-interactive-runtime" &&
      /forbidden root/i.test(error.message),
  );
  t.diagnostic(directoryAlias ? "directory alias exercised" : "launcher file aliases exercised");
});

test("copied launcher directories inside source and evidence scopes fail closed", async (t) => {
  const fixture = await createFixture(t);
  const baseline = fixture.runner.resolveRuntimeIdentities({
    inheritedEnvironment: process.env,
    interactiveRoots: [],
  });
  const scopes = [
    ["source-repository", fixture.source],
    ["allowed-parent", fixture.allowedParent],
    ["evidence-root", fixture.evidenceRoot],
  ];
  for (const [name, scopeRoot] of scopes) {
    await t.test(name, () => {
      const copiedRuntime = join(scopeRoot, `copied runtime ${name}`);
      mkdirSync(copiedRuntime);
      const copiedGit = join(copiedRuntime, basename(baseline.gitLauncher));
      const copiedNpm = join(copiedRuntime, basename(baseline.npmCandidate));
      copyFileSync(baseline.gitLauncher, copiedGit);
      copyFileSync(baseline.npmLauncher, copiedNpm);
      if (process.platform !== "win32") {
        chmodSync(copiedGit, 0o700);
        chmodSync(copiedNpm, 0o700);
      }
      const copiedEnvironment = replaceEnvironmentValue(
        { ...process.env },
        "PATH",
        copiedRuntime,
      );
      assert.throws(
        () =>
          fixture.runner.resolveRuntimeIdentities({
            forbiddenRoots: [{ canonicalPath: scopeRoot, name }],
            inheritedEnvironment: copiedEnvironment,
            interactiveRoots: [],
          }),
        (error) =>
          error?.code === "ENVIRONMENT_UNSAFE" &&
          error?.details?.forbiddenRole === name &&
          /forbidden root/i.test(error.message),
      );
    });
  }
});

test("lexical launcher aliases inside forbidden roots reject safe external targets", async (t) => {
  const fixture = await createFixture(t);
  const baseline = fixture.runner.resolveRuntimeIdentities({
    inheritedEnvironment: process.env,
    interactiveRoots: [],
  });
  const externalRuntime = join(fixture.root, "safe external canonical runtime");
  mkdirSync(externalRuntime);
  const externalGit = join(externalRuntime, basename(baseline.gitCandidate));
  const externalNpm = join(externalRuntime, basename(baseline.npmCandidate));
  copyFileSync(baseline.gitLauncher, externalGit);
  copyFileSync(baseline.npmLauncher, externalNpm);
  if (process.platform !== "win32") {
    chmodSync(externalGit, 0o700);
    chmodSync(externalNpm, 0o700);
  }
  const interactiveRoot = join(fixture.root, "interactive lexical root");
  mkdirSync(interactiveRoot);
  const scopes = [
    ["interactive-root", interactiveRoot, true],
    ["source-repository", fixture.source, false],
    ["evidence-root", fixture.evidenceRoot, false],
  ];
  for (const [name, scopeRoot, interactive] of scopes) {
    await t.test(name, () => {
      const aliasDirectory = join(scopeRoot, `lexical runtime alias ${name}`);
      symlinkSync(
        externalRuntime,
        aliasDirectory,
        process.platform === "win32" ? "junction" : "dir",
      );
      const aliasedEnvironment = replaceEnvironmentValue(
        { ...process.env },
        "PATH",
        aliasDirectory,
      );
      assert.throws(
        () =>
          fixture.runner.resolveRuntimeIdentities({
            forbiddenRoots: interactive
              ? []
              : [{ canonicalPath: scopeRoot, lexicalPath: scopeRoot, name }],
            inheritedEnvironment: aliasedEnvironment,
            interactiveRoots: interactive
              ? [{ canonicalPath: scopeRoot, lexicalPath: scopeRoot, name }]
              : [],
          }),
        (error) =>
          error?.code === "ENVIRONMENT_UNSAFE" &&
          error?.details?.forbiddenRole === name &&
          /forbidden root/i.test(error.message),
      );
    });
  }
});

test("exact repository capture and no-local detached materialization preserve source identity", async (t) => {
  const fixture = await createFixture(t);
  const gitCalls = [];
  const gitSpawn = (executable, args, options) => {
    gitCalls.push([...args]);
    return spawnSync(executable, args, options);
  };
  const prepared = prepareHermeticFixture(fixture, { gitSpawn });
  assert.equal(prepared.sourceIdentity.headSha, fixture.sourceSha);
  assert.equal(prepared.sourceIdentity.sourceTree, fixture.sourceTree);
  assert.equal(prepared.sourceIdentity.status.bytes, 0);
  assert.deepEqual(
    Object.keys(prepared.sourceIdentity.committedFiles).sort(),
    ["harness", "package", "runner"],
  );

  const checkout = fixture.runner.materializeExactCheckout({
    environment: prepared.environment,
    gitExecutable: prepared.runtime.gitLauncher,
    gitSpawn,
    sourceIdentity: prepared.sourceIdentity,
    sourceSha: fixture.sourceSha,
    state: prepared.state,
  });
  assert.equal(checkout.headSha, fixture.sourceSha);
  assert.equal(checkout.sourceTree, fixture.sourceTree);
  assert.equal(checkout.branch, "");
  assert.equal(checkout.status.bytes, 0);
  assert.equal(pathContains(prepared.state.checkoutRoot, checkout.gitDirectory), true);
  assert.equal(pathContains(fixture.source, checkout.gitDirectory), false);
  const cloneCalls = gitCalls.filter((args) => args[0] === "clone");
  assert.equal(cloneCalls.length, 1);
  assert.equal(cloneCalls[0].includes("--no-local"), true);
  assert.equal(cloneCalls[0].includes("--no-hardlinks"), true);
  assert.equal(cloneCalls[0].includes("--no-checkout"), true);
  for (const relativePath of [
    "package.json",
    "scripts/release-evidence-harness.mjs",
    "scripts/release-evidence-manual-runner.mjs",
  ]) {
    assert.deepEqual(
      readFileSync(join(prepared.state.checkoutRoot, ...relativePath.split("/"))),
      readFileSync(join(fixture.source, ...relativePath.split("/"))),
    );
    assert.equal(
      git(prepared.state.checkoutRoot, ["rev-parse", `${fixture.sourceSha}:${relativePath}`])
        .stdout.trim(),
      git(fixture.source, ["rev-parse", `${fixture.sourceSha}:${relativePath}`]).stdout.trim(),
    );
  }
  const sourceAfter = fixture.runner.captureRepositoryIdentity({
    environment: prepared.environment,
    gitExecutable: prepared.runtime.gitLauncher,
    gitSpawn,
    repositoryRoot: fixture.source,
    sourceSha: fixture.sourceSha,
  });
  assert.equal(
    fixture.runner.assertRepositoryIdentityUnchanged(
      prepared.sourceIdentity,
      sourceAfter,
      "Source",
    ),
    true,
  );

  const proofEvidence = join(fixture.evidenceRoot, "proof-evidence");
  mkdirSync(proofEvidence);
  const proof = fixture.runner.prepareHermeticRunProof({
    checkoutIdentity: checkout,
    environment: prepared.environment,
    evidenceRoot: proofEvidence,
    sourceSha: fixture.sourceSha,
    state: prepared.state,
  });
  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.source.sha, fixture.sourceSha);
  assert.equal(proof.source.tree, fixture.sourceTree);
  assert.match(proof.digest, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(proof.files).sort(), ["harness", "package", "runner"]);
  assert.deepEqual(proof.invocation, {
    harnessMaximum: 1,
    releaseMaximum: 1,
    retryMaximum: 0,
    runnerMaximum: 1,
  });
});

test("projected environment validates the exact proof in a harmless cross-process harness import", async (t) => {
  const fixture = await createFixture(t);
  const prepared = prepareHermeticFixture(fixture);
  const checkout = fixture.runner.materializeExactCheckout({
    environment: prepared.environment,
    gitExecutable: prepared.runtime.gitLauncher,
    sourceIdentity: prepared.sourceIdentity,
    sourceSha: fixture.sourceSha,
    state: prepared.state,
  });
  const proofEvidence = join(fixture.evidenceRoot, "cross process proof evidence");
  mkdirSync(proofEvidence);
  const proof = fixture.runner.prepareHermeticRunProof({
    checkoutIdentity: checkout,
    environment: prepared.environment,
    evidenceRoot: proofEvidence,
    sourceSha: fixture.sourceSha,
    state: prepared.state,
  });
  const proofPath = join(proofEvidence, "runner-proof.json");
  writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  const receiptPath = `${proofPath}.consumed.json`;
  assert.equal(existsSync(receiptPath), false);

  const checkedOutHarnessUrl = pathToFileURL(
    join(checkout.repositoryRoot, "scripts", "release-evidence-harness.mjs"),
  ).href;
  const helperSource = [
    `import { validateHermeticRunProof } from ${JSON.stringify(checkedOutHarnessUrl)};`,
    `import { readFileSync } from "node:fs";`,
    "let validated;",
    "try {",
    `  validated = validateHermeticRunProof({`,
    `    evidenceRoot: ${JSON.stringify(proofEvidence)},`,
    "    inheritedEnvironment: process.env,",
    `    proofPath: ${JSON.stringify(proofPath)},`,
    `    repositoryRoot: ${JSON.stringify(checkout.repositoryRoot)},`,
    `    sourceSha: ${JSON.stringify(fixture.sourceSha)},`,
    "  });",
    "} catch (error) {",
    `  const rawProof = JSON.parse(readFileSync(${JSON.stringify(proofPath)}, "utf8"));`,
    "  process.stdout.write(JSON.stringify({",
    "    currentEnvironment: process.env,",
    "    proofEnvironment: rawProof.environment,",
    "    validationError: { code: error?.code, message: error?.message },",
    "  }));",
    "  process.exitCode = 91;",
    "}",
    "if (validated) process.stdout.write(JSON.stringify({",
    "  currentEnvironment: process.env,",
    "  digest: validated.digest,",
    "  proofEnvironment: validated.environment,",
    "}));",
  ].join("\n");
  const helper = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", helperSource],
    {
      cwd: checkout.repositoryRoot,
      encoding: "utf8",
      env: prepared.environment,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    },
  );
  assert.equal(
    helper.status,
    0,
    `cross-process proof validation failed: ${String(helper.error?.message ?? helper.stderr)}\n${helper.stdout}`,
  );
  const observed = JSON.parse(helper.stdout);
  assert.equal(observed.digest, proof.digest);
  assert.deepEqual(observed.proofEnvironment, prepared.environment);
  assert.deepEqual(observed.currentEnvironment, prepared.environment);
  assert.equal(existsSync(receiptPath), false);
  assert.equal(
    git(checkout.repositoryRoot, ["status", "--porcelain=v2", "--untracked-files=all"])
      .stdout,
    "",
  );
});

test("repository identity rejects dirty worktrees, SHA drift, and preexisting checkout links", async (t) => {
  await t.test("dirty worktree", async (subtest) => {
    const fixture = await createFixture(subtest);
    const prepared = prepareHermeticFixture(fixture);
    writeFileSync(join(fixture.source, "dirty.txt"), "dirty\n");
    assert.throws(
      () =>
        fixture.runner.captureRepositoryIdentity({
          environment: prepared.environment,
          gitExecutable: prepared.runtime.gitLauncher,
          repositoryRoot: fixture.source,
          sourceSha: fixture.sourceSha,
        }),
      assertRunnerCode("SOURCE_STATE_MISMATCH"),
    );
  });

  await t.test("literal SHA drift", async (subtest) => {
    const fixture = await createFixture(subtest);
    const prepared = prepareHermeticFixture(fixture);
    assert.throws(
      () =>
        fixture.runner.captureRepositoryIdentity({
          environment: prepared.environment,
          gitExecutable: prepared.runtime.gitLauncher,
          repositoryRoot: fixture.source,
          sourceSha: "0".repeat(40),
        }),
      assertRunnerCode("SOURCE_STATE_MISMATCH"),
    );
  });

  await t.test("HEAD drift", async (subtest) => {
    const fixture = await createFixture(subtest);
    const prepared = prepareHermeticFixture(fixture);
    writeFileSync(join(fixture.source, "next.txt"), "next\n");
    commitAll(fixture.source, "next source");
    assert.throws(
      () =>
        fixture.runner.captureRepositoryIdentity({
          environment: prepared.environment,
          gitExecutable: prepared.runtime.gitLauncher,
          repositoryRoot: fixture.source,
          sourceSha: fixture.sourceSha,
        }),
      assertRunnerCode("SOURCE_STATE_MISMATCH"),
    );
  });

  await t.test("linked checkout target", async (subtest) => {
    const fixture = await createFixture(subtest);
    const prepared = prepareHermeticFixture(fixture);
    try {
      symlinkSync(
        fixture.evidenceRoot,
        prepared.state.checkoutRoot,
        process.platform === "win32" ? "junction" : "dir",
      );
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
        subtest.skip(`native link check unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    assert.throws(
      () =>
        fixture.runner.materializeExactCheckout({
          environment: prepared.environment,
          gitExecutable: prepared.runtime.gitLauncher,
          sourceIdentity: prepared.sourceIdentity,
          sourceSha: fixture.sourceSha,
          state: prepared.state,
        }),
      assertRunnerCode("CHECKOUT_MATERIALIZATION_FAILED"),
    );
  });
});

test("repository identity rejects hidden tracked-byte drift", async (t) => {
  for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
    await t.test(flag, async (subtest) => {
      const fixture = await createFixture(subtest);
      const prepared = prepareHermeticFixture(fixture);
      git(fixture.source, ["update-index", flag, ".gitattributes"]);
      writeFileSync(join(fixture.source, ".gitattributes"), "* text=auto eol=crlf\n");
      assert.equal(
        git(fixture.source, ["status", "--porcelain=v2", "--untracked-files=all"]).stdout,
        "",
        `${flag} must establish the hidden-dirty fixture`,
      );
      assert.throws(
        () =>
          fixture.runner.captureRepositoryIdentity({
            environment: prepared.environment,
            gitExecutable: prepared.runtime.gitLauncher,
            repositoryRoot: fixture.source,
            sourceSha: fixture.sourceSha,
          }),
        assertRunnerCode("SOURCE_STATE_MISMATCH"),
      );
    });
  }
});

test("fake harness run is one-shot, retains raw evidence, rejects duplicates, and cleans only sealed state", async (t) => {
  const fixture = await createFixture(t);
  const calls = [];
  const nonces = nonceSequence(10);
  const sourceHeadBefore = git(fixture.source, ["rev-parse", "HEAD"]).stdout.trim();
  const sourceStatusBefore = git(fixture.source, ["status", "--porcelain=v2", "--untracked-files=all"])
    .stdout;
  const result = await fixture.runner.runManualReleaseEvidence(
    runnerOptions(fixture, "run"),
    {
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      harnessSpawn: fakeHarnessSpawn(fixture.harness, calls, "success"),
      inheritedEnvironment: process.env,
      nonce: nonces,
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].invocationName, "manual-harness");
  assert.equal(calls[0].args[0], join(result.state.checkoutRoot, "scripts", "release-evidence-harness.mjs"));
  assert.equal(calls[0].args.filter((value) => value === "--run").length, 1);
  assert.equal(calls[0].args.includes("--allow-release-command"), true);
  assert.equal(calls[0].args.includes("--source-sha"), true);
  assert.equal(calls[0].args.includes(fixture.sourceSha), true);
  assert.equal(calls[0].args.includes("--runner-proof"), true);
  const runnerPreflight = JSON.parse(
    readFileSync(join(result.context.runRoot, "runner-preflight.json"), "utf8"),
  );
  const npmLauncherIndexes = calls[0].args
    .map((value, index) => (value === "--npm-launcher" ? index : -1))
    .filter((index) => index >= 0);
  assert.equal(npmLauncherIndexes.length, 1);
  assert.equal(
    calls[0].args[npmLauncherIndexes[0] + 1],
    runnerPreflight.runtime.npmCandidate,
  );
  assert.equal(
    fixture.harness.normalizePathIdentity(
      (realpathSync.native ?? realpathSync)(runnerPreflight.runtime.npmCandidate),
    ),
    fixture.harness.normalizePathIdentity(runnerPreflight.runtime.npmLauncher),
  );
  if (process.platform === "win32") {
    const npmExtension = path.extname(runnerPreflight.runtime.npmCandidate).toLowerCase();
    const configuredExtensions = String(process.env.PATHEXT)
      .split(";")
      .map((value) => value.toLowerCase());
    assert.equal([".cmd", ".exe"].includes(npmExtension), true);
    assert.equal(configuredExtensions.includes(npmExtension), true);
  }
  assert.equal(calls[0].args.some((value) => /release:check/.test(value)), false);
  assert.equal(result.summary.commandGraph.harnessInvocations, 1);
  assert.equal(result.summary.commandGraph.releaseInvocationMaximum, 1);
  assert.equal(result.summary.commandGraph.retries, 0);
  assert.equal(result.summary.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  assert.equal(
    JSON.parse(readFileSync(join(result.context.runRoot, "summary.json"), "utf8")).status,
    "MANUAL_RELEASE_EVIDENCE_COMMAND_PASS_REQUIRES_VALID_SEALS",
  );
  for (const relativePath of [
    ".release-evidence-owner.json",
    ".release-evidence-seal.json",
    "harness-child-summary.json",
    "raw/exit.json",
    "raw/raw-hashes.json",
    "raw/stderr.log",
    "raw/stdout.log",
    "raw/start.json",
    "runner-materialization.json",
    "runner-postflight.json",
    "summary.json",
  ]) {
    assert.equal(existsSync(join(result.context.runRoot, ...relativePath.split("/"))), true);
  }
  assert.equal(
    existsSync(join(fixture.allowedParent, ".release-evidence-manual-attempt.json")),
    true,
  );
  assert.equal(existsSync(join(result.state.stateRoot, ".release-evidence-runner-seal.json")), true);

  let duplicateError;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock: () => new Date("2026-01-01T00:00:01.000Z"),
        harnessSpawn: fakeHarnessSpawn(fixture.harness, calls, "success"),
        inheritedEnvironment: process.env,
        nonce: nonces,
      }),
    (error) => {
      duplicateError = error;
      return error?.code === "ATTEMPT_ALREADY_CONSUMED";
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(duplicateError.details.runRoot, undefined);

  const cleanupOptions = {
    allowedParent: fixture.allowedParent,
    evidenceRoot: fixture.evidenceRoot,
    repositoryRoot: fixture.source,
    proofDigest: result.proof.digest,
    stateRoot: result.state.stateRoot,
    token: result.state.token,
  };
  assert.throws(
    () => fixture.runner.cleanupHermeticState({ ...cleanupOptions, token: "f".repeat(64) }),
    assertRunnerCode("STATE_ROOT_UNSAFE"),
  );
  assert.equal(existsSync(result.state.stateRoot), true);

  const foreignPath = join(result.state.stateRoot, "foreign-entry.txt");
  writeFileSync(foreignPath, "foreign\n");
  assert.throws(
    () => fixture.runner.cleanupHermeticState(cleanupOptions),
    assertRunnerCode("STATE_ROOT_UNSAFE"),
  );
  unlinkSync(foreignPath);

  const foreignLink = join(result.state.stateRoot, "foreign-link");
  let linkCreated = false;
  try {
    symlinkSync(
      fixture.evidenceRoot,
      foreignLink,
      process.platform === "win32" ? "junction" : "dir",
    );
    linkCreated = true;
    assert.throws(
      () => fixture.runner.cleanupHermeticState(cleanupOptions),
      assertRunnerCode("STATE_ROOT_UNSAFE"),
    );
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) throw error;
    t.diagnostic(`native cleanup link check unavailable: ${error.code}`);
  } finally {
    if (linkCreated && existsSync(foreignLink)) unlinkSync(foreignLink);
  }

  const originalState = `${result.state.stateRoot}.identity-original`;
  renameSync(result.state.stateRoot, originalState);
  mkdirSync(result.state.stateRoot);
  copyFileSync(
    join(originalState, ".release-evidence-runner-owner.json"),
    join(result.state.stateRoot, ".release-evidence-runner-owner.json"),
  );
  copyFileSync(
    join(originalState, ".release-evidence-runner-seal.json"),
    join(result.state.stateRoot, ".release-evidence-runner-seal.json"),
  );
  assert.throws(
    () => fixture.runner.cleanupHermeticState(cleanupOptions),
    assertRunnerCode("STATE_ROOT_UNSAFE"),
  );
  rmSync(result.state.stateRoot, { recursive: true });
  renameSync(originalState, result.state.stateRoot);

  const cleanup = fixture.runner.cleanupHermeticState(cleanupOptions);
  assert.equal(cleanup.cleaned, true);
  assert.equal(existsSync(result.state.stateRoot), false);
  assert.equal(existsSync(result.context.runRoot), true);
  assert.equal(existsSync(fixture.evidenceRoot), true);
  assert.equal(existsSync(fixture.allowedParent), true);
  assert.equal(existsSync(fixture.source), true);
  assert.equal(git(fixture.source, ["rev-parse", "HEAD"]).stdout.trim(), sourceHeadBefore);
  assert.equal(
    git(fixture.source, ["status", "--porcelain=v2", "--untracked-files=all"]).stdout,
    sourceStatusBefore,
  );
});

test("fake success cannot reuse a precreated runner state seal", async (t) => {
  const fixture = await createFixture(t);
  const harnessCalls = [];
  const validHarnessSpawn = fakeHarnessSpawn(fixture.harness, harnessCalls, "success");
  const forgedSealBytes = `${JSON.stringify({ forged: true, status: "UNTRUSTED" })}\n`;
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        harnessSpawn: async (intended) => {
          const child = await validHarnessSpawn(intended);
          writeFileSync(
            join(dirname(intended.cwd), ".release-evidence-runner-seal.json"),
            forgedSealBytes,
          );
          return child;
        },
        inheritedEnvironment: process.env,
        nonce: nonceSequence(1_000),
      }),
    (error) => {
      failure = error;
      return error?.code === "EVIDENCE_FAILED";
    },
  );
  assert.equal(harnessCalls.length, 1);
  assert.equal(existsSync(failure.details.runRoot), true);
  assert.equal(existsSync(failure.details.stateRoot), true);
  assert.equal(
    readFileSync(
      join(failure.details.stateRoot, ".release-evidence-runner-seal.json"),
      "utf8",
    ),
    forgedSealBytes,
  );
  const summary = JSON.parse(
    readFileSync(join(failure.details.runRoot, "summary.json"), "utf8"),
  );
  assert.equal(summary.status, "EVIDENCE_FAILED");
  assert.notEqual(summary.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  assert.equal(
    existsSync(
      join(
        failure.details.runRoot,
        "summary.command-result-before-terminal-failure.json",
      ),
    ),
    false,
  );
  const outerSeal = JSON.parse(
    readFileSync(join(failure.details.runRoot, ".release-evidence-seal.json"), "utf8"),
  );
  assert.equal(
    outerSeal.preservationProof,
    "Failure evidence retained with status EVIDENCE_FAILED",
  );
  assert.doesNotMatch(outerSeal.preservationProof, /Outer and inner evidence retained/);
});

test("fake success cannot pass after the durable attempt marker is replaced", async (t) => {
  const fixture = await createFixture(t);
  const harnessCalls = [];
  const validHarnessSpawn = fakeHarnessSpawn(fixture.harness, harnessCalls, "success");
  const markerPath = join(
    fixture.allowedParent,
    ".release-evidence-manual-attempt.json",
  );
  const replacementBytes = `${JSON.stringify({ replaced: true, status: "UNTRUSTED" })}\n`;
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        harnessSpawn: async (intended) => {
          const child = await validHarnessSpawn(intended);
          unlinkSync(markerPath);
          writeFileSync(markerPath, replacementBytes);
          return child;
        },
        inheritedEnvironment: process.env,
        nonce: nonceSequence(1_100),
      }),
    (error) => {
      failure = error;
      return error?.code === "EVIDENCE_FAILED";
    },
  );
  assert.equal(harnessCalls.length, 1);
  assert.equal(failure.details.attemptMarker, markerPath);
  assert.equal(existsSync(failure.details.runRoot), true);
  assert.equal(existsSync(failure.details.stateRoot), true);
  assert.equal(readFileSync(markerPath, "utf8"), replacementBytes);
  const summary = JSON.parse(
    readFileSync(join(failure.details.runRoot, "summary.json"), "utf8"),
  );
  assert.equal(summary.status, "EVIDENCE_FAILED");
  assert.notEqual(summary.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  assert.equal(
    existsSync(
      join(
        failure.details.runRoot,
        "summary.command-result-before-terminal-failure.json",
      ),
    ),
    false,
  );
  assert.equal(
    existsSync(join(failure.details.stateRoot, ".release-evidence-runner-seal.json")),
    true,
  );
  const outerSeal = JSON.parse(
    readFileSync(join(failure.details.runRoot, ".release-evidence-seal.json"), "utf8"),
  );
  assert.equal(
    outerSeal.preservationProof,
    "Failure evidence retained with status EVIDENCE_FAILED",
  );
  assert.doesNotMatch(outerSeal.preservationProof, /Outer and inner evidence retained/);
});

test("exit-zero fake harness evidence must be canonical, contained, consumed, and proof-bound", async (t) => {
  const fixture = await createFixture(t);
  const scenarios = [
    "missing-receipt",
    "missing-summary",
    "outside-inner-run",
    "summary-failure",
    "digest-mismatch",
  ];
  const nonces = nonceSequence(400);
  for (const scenario of scenarios) {
    const scenarioParent = join(fixture.root, `external-${scenario}`);
    const scenarioEvidence = join(scenarioParent, "evidence");
    mkdirSync(scenarioParent);
    mkdirSync(scenarioEvidence);
    const calls = [];
    let failure;
    await assert.rejects(
      () =>
        fixture.runner.runManualReleaseEvidence(
          {
            ...runnerOptions(fixture, "run"),
            allowedParent: scenarioParent,
            evidenceRoot: scenarioEvidence,
          },
          {
            clock: () => new Date("2026-01-01T00:00:00.000Z"),
            harnessSpawn: fakeHarnessSpawn(fixture.harness, calls, scenario),
            inheritedEnvironment: process.env,
            nonce: nonces,
          },
        ),
      (error) => {
        failure = error;
        return ["HARNESS_FAILED", "POST_PROCESSING_FAILED", "EVIDENCE_FAILED"].includes(
          error?.code,
        );
      },
      `${scenario} must fail closed after an exit-zero fake harness result`,
    );
    assert.equal(calls.length, 1);
    assert.equal(existsSync(failure.details.runRoot), true);
    const summaryPath = join(failure.details.runRoot, "summary.json");
    if (existsSync(summaryPath)) {
      const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
      assert.notEqual(summary.status, "MANUAL_RELEASE_EVIDENCE_PASS");
    }
  }
});

test("state sealing failure cannot leave the canonical summary at PASS", async (t) => {
  const fixture = await createFixture(t);
  const calls = [];
  let clockCalls = 0;
  const clock = () => {
    clockCalls += 1;
    return clockCalls >= 3 ? "INVALID_SEAL_TIME" : new Date("2026-01-01T00:00:00.000Z");
  };
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock,
        harnessSpawn: fakeHarnessSpawn(fixture.harness, calls, "success"),
        inheritedEnvironment: process.env,
        nonce: nonceSequence(500),
      }),
    (error) => {
      failure = error;
      return error?.code === "EVIDENCE_FAILED" || error?.code === "HARNESS_FAILED";
    },
  );
  assert.equal(calls.length, 1);
  const summaryPath = join(failure.details.runRoot, "summary.json");
  if (existsSync(summaryPath)) {
    const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
    assert.notEqual(summary.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  }
});

test("injected evidence sealing failure is attempted once without terminal PASS or retry", async (t) => {
  const fixture = await createFixture(t);
  const harnessCalls = [];
  let evidenceSealCalls = 0;
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        evidenceSealer: () => {
          evidenceSealCalls += 1;
          throw new Error("injected evidence seal failure");
        },
        harnessSpawn: fakeHarnessSpawn(fixture.harness, harnessCalls, "success"),
        inheritedEnvironment: process.env,
        nonce: nonceSequence(600),
      }),
    (error) => {
      failure = error;
      return error?.code === "EVIDENCE_FAILED";
    },
  );
  assert.equal(harnessCalls.length, 1);
  assert.equal(evidenceSealCalls, 1);
  const persisted = JSON.parse(
    readFileSync(join(failure.details.runRoot, "summary.json"), "utf8"),
  );
  const commandResult = JSON.parse(
    readFileSync(
      join(
        failure.details.runRoot,
        "summary.command-result-before-terminal-failure.json",
      ),
      "utf8",
    ),
  );
  assert.equal(persisted.status, "EVIDENCE_FAILED");
  assert.equal(
    commandResult.status,
    "MANUAL_RELEASE_EVIDENCE_COMMAND_PASS_REQUIRES_VALID_SEALS",
  );
  assert.notEqual(persisted.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  assert.notEqual(commandResult.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  assert.equal(existsSync(join(failure.details.runRoot, ".release-evidence-seal.json")), false);
  assert.equal(
    existsSync(join(failure.details.stateRoot, ".release-evidence-runner-seal.json")),
    true,
  );
});

test("fake child failure retains raw streams, exit, postflight, and bounded failure summary", async (t) => {
  const fixture = await createFixture(t);
  const calls = [];
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        harnessSpawn: fakeHarnessSpawn(fixture.harness, calls, "child-failure"),
        inheritedEnvironment: process.env,
        nonce: nonceSequence(100),
      }),
    (error) => {
      failure = error;
      return error?.code === "HARNESS_FAILED";
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(existsSync(failure.details.runRoot), true);
  const exit = JSON.parse(readFileSync(join(failure.details.runRoot, "raw", "exit.json"), "utf8"));
  const summary = JSON.parse(readFileSync(join(failure.details.runRoot, "summary.json"), "utf8"));
  assert.equal(exit.code, 7);
  assert.equal(summary.status, "HARNESS_FAILED");
  assert.equal(existsSync(join(failure.details.runRoot, "raw", "stderr.log")), true);
  assert.equal(existsSync(join(failure.details.runRoot, "harness-child-summary.json")), true);
  assert.equal(existsSync(join(failure.details.runRoot, "runner-failure-postflight.json")), true);
  assert.equal(existsSync(join(failure.details.runRoot, ".release-evidence-seal.json")), true);
  assert.equal(existsSync(failure.details.stateRoot), true);
});

test("evidence-seal failure supersedes and preserves a prior fake-child failure", async (t) => {
  const fixture = await createFixture(t);
  const harnessCalls = [];
  let evidenceSealCalls = 0;
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        evidenceSealer: () => {
          evidenceSealCalls += 1;
          throw new Error("injected failure while sealing child-failure evidence");
        },
        harnessSpawn: fakeHarnessSpawn(fixture.harness, harnessCalls, "child-failure"),
        inheritedEnvironment: process.env,
        nonce: nonceSequence(800),
      }),
    (error) => {
      failure = error;
      return error?.code === "EVIDENCE_FAILED";
    },
  );
  assert.equal(harnessCalls.length, 1);
  assert.equal(evidenceSealCalls, 1);
  const canonicalSummary = JSON.parse(
    readFileSync(join(failure.details.runRoot, "summary.json"), "utf8"),
  );
  const preservedFailure = JSON.parse(
    readFileSync(
      join(
        failure.details.runRoot,
        "summary.failure-before-evidence-seal-failure.json",
      ),
      "utf8",
    ),
  );
  assert.equal(canonicalSummary.status, "EVIDENCE_FAILED");
  assert.equal(canonicalSummary.priorFailure.code, "HARNESS_FAILED");
  assert.equal(preservedFailure.status, "HARNESS_FAILED");
  assert.notEqual(canonicalSummary.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  assert.notEqual(preservedFailure.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  assert.equal(
    existsSync(join(failure.details.runRoot, ".release-evidence-seal.json")),
    false,
  );
  assert.equal(
    existsSync(join(failure.details.stateRoot, ".release-evidence-runner-seal.json")),
    true,
  );
});

test("state-seal failure reclassifies a prior fake-child failure before outer sealing", async (t) => {
  const fixture = await createFixture(t);
  const harnessCalls = [];
  let stateSealCalls = 0;
  let evidenceSealCalls = 0;
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        evidenceSealer: (context, preservationProof) => {
          evidenceSealCalls += 1;
          return fixture.harness.sealOwnedRun(context, preservationProof);
        },
        harnessSpawn: fakeHarnessSpawn(fixture.harness, harnessCalls, "child-failure"),
        inheritedEnvironment: process.env,
        nonce: nonceSequence(900),
        stateSealer: () => {
          stateSealCalls += 1;
          throw new Error("injected failure while sealing state after child failure");
        },
      }),
    (error) => {
      failure = error;
      return error?.code === "EVIDENCE_FAILED";
    },
  );
  assert.equal(harnessCalls.length, 1);
  assert.equal(stateSealCalls, 1);
  assert.equal(evidenceSealCalls, 1);
  assert.equal(failure.details.priorFailure.code, "HARNESS_FAILED");
  assert.equal(failure.details.stateSealError.code, "UNKNOWN_ERROR");
  assert.match(failure.details.stateSealError.message, /injected failure while sealing state/);

  const summaryPath = join(failure.details.runRoot, "summary.json");
  const summaryBytes = readFileSync(summaryPath);
  const summary = JSON.parse(summaryBytes.toString("utf8"));
  assert.equal(summary.status, "EVIDENCE_FAILED");
  assert.equal(summary.error.code, "EVIDENCE_FAILED");
  assert.notEqual(summary.status, "MANUAL_RELEASE_EVIDENCE_PASS");
  const outerSeal = JSON.parse(
    readFileSync(join(failure.details.runRoot, ".release-evidence-seal.json"), "utf8"),
  );
  const sealedSummary = outerSeal.inventory.find((entry) => entry.path === "summary.json");
  assert.equal(sealedSummary.type, "file");
  assert.equal(sealedSummary.bytes, summaryBytes.length);
  assert.equal(
    sealedSummary.sha256,
    createHash("sha256").update(summaryBytes).digest("hex"),
  );
  assert.equal(
    existsSync(join(failure.details.stateRoot, ".release-evidence-runner-seal.json")),
    false,
  );
});

test("fake parser failure preserves raw evidence and exits with post-processing failure", async (t) => {
  const fixture = await createFixture(t);
  const calls = [];
  let failure;
  await assert.rejects(
    () =>
      fixture.runner.runManualReleaseEvidence(runnerOptions(fixture, "run"), {
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        harnessSpawn: fakeHarnessSpawn(fixture.harness, calls, "parser-failure"),
        inheritedEnvironment: process.env,
        nonce: nonceSequence(200),
      }),
    (error) => {
      failure = error;
      return error?.code === "POST_PROCESSING_FAILED";
    },
  );
  assert.equal(calls.length, 1);
  const rawStdout = readFileSync(join(failure.details.runRoot, "raw", "stdout.log"), "utf8");
  const childSummary = JSON.parse(
    readFileSync(join(failure.details.runRoot, "harness-child-summary.json"), "utf8"),
  );
  const runnerSummary = JSON.parse(
    readFileSync(join(failure.details.runRoot, "summary.json"), "utf8"),
  );
  assert.equal(rawStdout, "not-json");
  assert.equal(childSummary.status, "POST_PROCESSING_FAILED");
  assert.equal(runnerSummary.status, "POST_PROCESSING_FAILED");
  assert.equal(existsSync(join(failure.details.runRoot, "runner-failure-postflight.json")), true);
  assert.equal(existsSync(join(failure.details.runRoot, ".release-evidence-seal.json")), true);
});
