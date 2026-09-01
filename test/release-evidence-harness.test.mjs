import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path, { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  HARNESS_ERROR_CODES,
  HERMETIC_PROOF_SCHEMA_VERSION,
  RELEASE_COMMAND,
  RELEASE_INVOCATION_MAXIMUM,
  RELEASE_RETRY_MAXIMUM,
  acquireInvocationGuard,
  assertNpmProvenance,
  assertNpmRuntimeProvenanceUnchanged,
  atomicWriteSanitizedSummary,
  buildHermeticRunProof,
  buildReleaseCommandPlan,
  canonicalIdentitiesEqual,
  captureNpmPackageTreeEvidence,
  captureNpmRuntimeIdentityEvidence,
  cleanupOwnedRun,
  consumeHermeticRunProof,
  createOwnedRun,
  dryValidateReleaseEvidence,
  normalizePathIdentity,
  redactSecrets,
  resolveNpmProvenance,
  runDurableChild,
  runReleaseEvidence,
  runSelfTest,
  sealOwnedRun,
  validateHermeticProofReceipt,
  validateHermeticRunProof,
  validateEvidenceOutput,
  validateEvidenceRoot,
  writeOwnedEvidenceJson,
} from "../scripts/release-evidence-harness.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function createFixture(t, label = "fixture") {
  const parent = mkdtempSync(join(tmpdir(), `kyw-release-evidence-${label}-`));
  const evidenceRoot = join(parent, "evidence");
  mkdirSync(evidenceRoot);
  t.after(() => {
    const resolvedParent = resolve(parent);
    const resolvedTemp = resolve(tmpdir());
    assert.ok(
      resolvedParent.startsWith(`${resolvedTemp}${path.sep}`),
      "test cleanup remains beneath the native temporary root",
    );
    if (existsSync(resolvedParent)) rmSync(resolvedParent, { recursive: true, force: false });
  });
  return { evidenceRoot, parent };
}

function harnessOptions(t, label) {
  const fixture = createFixture(t, label);
  return {
    allowedParent: fixture.parent,
    evidenceRoot: fixture.evidenceRoot,
    includeProtectedState: false,
    repositoryRoot,
  };
}

function createSyntheticNpmRuntime(t, label) {
  const fixture = createFixture(t, label);
  const runtimeRoot = join(fixture.parent, "runtime-copy");
  const packageRoot = join(runtimeRoot, "node_modules", "npm");
  const selectedCliPath = join(packageRoot, "bin", "npm-cli.js");
  const trampolineDependency = join(packageRoot, "lib", "cli.js");
  const nodeExecutable = join(
    runtimeRoot,
    process.platform === "win32" ? "node.exe" : "node",
  );
  const requestedLauncherPath = join(
    runtimeRoot,
    process.platform === "win32" ? "npm.cmd" : "npm",
  );
  const npmShimLauncher = join(
    runtimeRoot,
    "shim",
    process.platform === "win32" ? "npm.cmd" : "npm",
  );
  const selectedCliVersion = "9.9.9";

  mkdirSync(dirname(selectedCliPath), { recursive: true });
  mkdirSync(dirname(trampolineDependency), { recursive: true });
  mkdirSync(dirname(npmShimLauncher), { recursive: true });
  writeFileSync(nodeExecutable, "synthetic copied Node executable bytes\n");
  writeFileSync(requestedLauncherPath, "synthetic requested npm launcher bytes\n");
  writeFileSync(npmShimLauncher, "synthetic owned npm platform shim bytes\n");
  writeFileSync(selectedCliPath, "require('../lib/cli.js');\n");
  writeFileSync(trampolineDependency, "module.exports = () => 'synthetic npm';\n");
  writeFileSync(
    join(packageRoot, "package.json"),
    `${JSON.stringify({
      bin: { npm: "bin/npm-cli.js" },
      name: "npm",
      version: selectedCliVersion,
    })}\n`,
  );

  const paths = {
    nodeExecutable,
    npmShimLauncher,
    requestedLauncherPath,
    selectedCliPath,
    selectedCliVersion,
  };
  const provenance = Object.freeze({
    ...paths,
    ...captureNpmRuntimeIdentityEvidence({ ...paths, includePackageTree: true }),
  });
  return Object.freeze({
    ...fixture,
    ...paths,
    packageRoot,
    provenance,
    runtimeRoot,
    trampolineDependency,
  });
}

function mutateSyntheticRuntimeFile(filePath, marker) {
  writeFileSync(
    filePath,
    Buffer.concat([readFileSync(filePath), Buffer.from(`// ${marker}\n`)]),
  );
}

function gitFixtureOutput(repository, args) {
  const result = spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" },
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}

function createHermeticProofFixture(t, label = "proof") {
  const fixture = createFixture(t, label);
  const canonicalParent = (realpathSync.native ?? realpathSync)(fixture.parent);
  const canonicalEvidenceRoot = (realpathSync.native ?? realpathSync)(
    fixture.evidenceRoot,
  );
  const stateRoot = join(canonicalParent, "state");
  const checkoutRoot = join(stateRoot, "checkout");
  const layout = {
    appDataRoot: join(stateRoot, "appdata", "roaming"),
    codexHomeRoot: join(stateRoot, "codex-home"),
    gitConfigGlobalFile: join(stateRoot, "git", "global.config"),
    gitConfigSystemFile: join(stateRoot, "git", "system.config"),
    homeRoot: join(stateRoot, "home"),
    localAppDataRoot: join(stateRoot, "appdata", "local"),
    npmCacheRoot: join(stateRoot, "npm", "cache"),
    npmGlobalConfigFile: join(stateRoot, "npm", "globalconfig.npmrc"),
    npmUserConfigFile: join(stateRoot, "npm", "userconfig.npmrc"),
    tempRoot: join(stateRoot, "temp"),
    xdgCacheHome: join(stateRoot, "xdg", "cache"),
    xdgConfigHome: join(stateRoot, "xdg", "config"),
    xdgDataHome: join(stateRoot, "xdg", "data"),
    xdgStateHome: join(stateRoot, "xdg", "state"),
  };
  mkdirSync(join(checkoutRoot, "scripts"), { recursive: true });
  for (const [name, entryPath] of Object.entries(layout)) {
    if (name.endsWith("File")) {
      mkdirSync(dirname(entryPath), { recursive: true });
      writeFileSync(entryPath, name.startsWith("npmUser") ? "audit=false\n" : "\n");
    } else {
      mkdirSync(entryPath, { recursive: true });
    }
  }
  writeFileSync(
    join(checkoutRoot, "scripts", "release-evidence-manual-runner.mjs"),
    "export const runner = true;\n",
  );
  writeFileSync(
    join(checkoutRoot, "scripts", "release-evidence-harness.mjs"),
    "export const harness = true;\n",
  );
  writeFileSync(join(checkoutRoot, "non-proof-tracked.txt"), "committed bytes\n");
  writeFileSync(
    join(checkoutRoot, "package.json"),
    `${JSON.stringify({
      name: "proof-fixture",
      private: true,
      scripts: {
        check: "node -e \"process.exit(0)\"",
        "release:candidate": "node -e \"process.exit(0)\"",
        "release:check": "npm run release:ci && npm publish --dry-run --json",
        "release:ci": "npm run check && npm run release:candidate",
      },
      version: "0.0.0",
    })}\n`,
  );
  gitFixtureOutput(checkoutRoot, ["init"]);
  gitFixtureOutput(checkoutRoot, ["config", "user.email", "proof@example.invalid"]);
  gitFixtureOutput(checkoutRoot, ["config", "user.name", "Proof Fixture"]);
  gitFixtureOutput(checkoutRoot, ["add", "."]);
  gitFixtureOutput(checkoutRoot, ["commit", "-m", "proof fixture"]);
  gitFixtureOutput(checkoutRoot, ["checkout", "--detach", "HEAD"]);
  const sourceSha = gitFixtureOutput(checkoutRoot, ["rev-parse", "HEAD"]);
  const sourceTree = gitFixtureOutput(checkoutRoot, ["rev-parse", "HEAD^{tree}"]);
  const fileGitBlobs = {
    harness: gitFixtureOutput(checkoutRoot, [
      "rev-parse",
      `${sourceSha}:scripts/release-evidence-harness.mjs`,
    ]),
    package: gitFixtureOutput(checkoutRoot, ["rev-parse", `${sourceSha}:package.json`]),
    runner: gitFixtureOutput(checkoutRoot, [
      "rev-parse",
      `${sourceSha}:scripts/release-evidence-manual-runner.mjs`,
    ]),
  };
  const environment = {
    APPDATA: layout.appDataRoot,
    CODEX_HOME: layout.codexHomeRoot,
    GIT_ATTR_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: layout.gitConfigGlobalFile,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: layout.gitConfigSystemFile,
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    HOME: layout.homeRoot,
    LOCALAPPDATA: layout.localAppDataRoot,
    PATH: process.env.PATH ?? "",
    TEMP: layout.tempRoot,
    TMP: layout.tempRoot,
    TMPDIR: layout.tempRoot,
    USERPROFILE: layout.homeRoot,
    XDG_CACHE_HOME: layout.xdgCacheHome,
    XDG_CONFIG_HOME: layout.xdgConfigHome,
    XDG_DATA_HOME: layout.xdgDataHome,
    XDG_STATE_HOME: layout.xdgStateHome,
    npm_config_audit: "false",
    npm_config_cache: layout.npmCacheRoot,
    npm_config_color: "false",
    npm_config_fund: "false",
    npm_config_globalconfig: layout.npmGlobalConfigFile,
    npm_config_update_notifier: "false",
    npm_config_userconfig: layout.npmUserConfigFile,
  };
  if (process.platform === "win32") {
    const parsedHome = path.parse(layout.homeRoot);
    Object.assign(environment, {
      HOMEDRIVE: parsedHome.root.replace(/[\\/]$/, ""),
      HOMEPATH: layout.homeRoot.slice(parsedHome.root.length),
    });
    for (const name of ["ComSpec", "OS", "PATHEXT", "SystemRoot", "windir"]) {
      if (typeof process.env[name] === "string") environment[name] = process.env[name];
    }
  }
  const outer = createOwnedRun({
    allowedParent: canonicalParent,
    evidenceRoot: canonicalEvidenceRoot,
    mode: "proof-outer",
    repositoryRoot: checkoutRoot,
  });
  const innerEvidence = join(outer.runRoot, "inner-evidence");
  mkdirSync(innerEvidence);
  const proof = buildHermeticRunProof({
    checkoutRoot,
    environment,
    evidenceRoot: innerEvidence,
    fileGitBlobs,
    invocation: {
      harnessMaximum: 1,
      releaseMaximum: 1,
      retryMaximum: 0,
      runnerMaximum: 1,
    },
    layout,
    nonce: "a".repeat(64),
    sourceSha,
    sourceTree,
    stateRoot,
  });
  const proofPath = writeOwnedEvidenceJson(
    outer,
    "inner-evidence/runner-proof.json",
    proof,
  );
  return {
    ...fixture,
    checkoutRoot,
    environment,
    innerEvidence,
    layout,
    outer,
    proof,
    proofPath,
    sourceSha,
    stateRoot,
  };
}

function assertHarnessError(callback, code) {
  assert.throws(callback, (error) => {
    assert.equal(error?.code, code);
    return true;
  });
}

test("evidence root equality is valid while output equality is rejected", (t) => {
  const fixture = createFixture(t, "root-roles");
  const root = validateEvidenceRoot({
    allowedParent: fixture.parent,
    evidenceRoot: fixture.evidenceRoot,
    repositoryRoot,
  });

  assert.equal(
    canonicalIdentitiesEqual(root.lexicalRoot, root.canonicalRoot),
    true,
    "the root may equal its own canonical identity",
  );
  assertHarnessError(
    () => validateEvidenceOutput(root, fixture.evidenceRoot),
    HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
  );
});

test("output validation allows normal descendants and rejects siblings and prefix confusion", (t) => {
  const fixture = createFixture(t, "output-containment");
  const root = validateEvidenceRoot({
    allowedParent: fixture.parent,
    evidenceRoot: fixture.evidenceRoot,
    repositoryRoot,
  });
  const descendant = join(fixture.evidenceRoot, "run", "stdout.log");
  mkdirSync(dirname(descendant), { recursive: true });
  writeFileSync(descendant, "safe\n");

  assert.equal(
    canonicalIdentitiesEqual(
      validateEvidenceOutput(root, descendant, { mustExist: true }).canonicalOutput,
      descendant,
    ),
    true,
  );
  for (const unsafe of [
    join(fixture.parent, "sibling"),
    `${fixture.evidenceRoot}-prefix-confusion`,
  ]) {
    assertHarnessError(
      () => validateEvidenceOutput(root, unsafe),
      HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
    );
  }
});

test("Windows drive, UNC, extended-prefix, separator, and case identities normalize", () => {
  const longTail = Array.from({ length: 24 }, (_, index) => `segment-${index}`).join("\\");
  assert.equal(
    normalizePathIdentity(String.raw`\\?\C:\Temp\Mixed\Path`, { platform: "win32" }),
    String.raw`c:\temp\mixed\path`,
  );
  assert.equal(
    normalizePathIdentity(String.raw`C:/TEMP/mixed/path`, { platform: "win32" }),
    String.raw`c:\temp\mixed\path`,
  );
  assert.equal(
    normalizePathIdentity(String.raw`\\?\UNC\Server\Share\Folder`, { platform: "win32" }),
    String.raw`\\server\share\folder`,
  );
  assert.equal(
    normalizePathIdentity(String.raw`\\SERVER\SHARE\folder`, { platform: "win32" }),
    String.raw`\\server\share\folder`,
  );
  assert.equal(
    normalizePathIdentity(`\\\\?\\C:\\VeryLong\\${longTail}`, { platform: "win32" }),
    normalizePathIdentity(`C:\\VeryLong\\${longTail}`, { platform: "win32" }),
  );
});

test("simulated Windows short and long aliases use one canonical identity", () => {
  const aliases = new Map([
    [String.raw`c:\progra~1\nodejs`, String.raw`C:\Program Files\nodejs`],
    [String.raw`c:\program files\nodejs`, String.raw`C:\Program Files\nodejs`],
  ]);
  const canonicalizeExisting = (value) =>
    aliases.get(normalizePathIdentity(value, { platform: "win32" })) ?? value;

  assert.equal(
    canonicalIdentitiesEqual(
      String.raw`C:\PROGRA~1\nodejs`,
      String.raw`c:\Program Files\NodeJS`,
      { canonicalizeExisting, platform: "win32" },
    ),
    true,
  );
});

test("repository overlap and injected identity escape fail closed", (t) => {
  assertHarnessError(
    () =>
      validateEvidenceRoot({
        allowedParent: dirname(repositoryRoot),
        evidenceRoot: repositoryRoot,
        repositoryRoot,
      }),
    HARNESS_ERROR_CODES.EVIDENCE_ROOT_UNSAFE,
  );

  const fixture = createFixture(t, "identity-escape");
  const escaped = join(fixture.evidenceRoot, "escaped");
  mkdirSync(escaped);
  const root = validateEvidenceRoot({
    allowedParent: fixture.parent,
    evidenceRoot: fixture.evidenceRoot,
    repositoryRoot,
  });
  const injected = {
    ...root,
    canonicalizeExisting(value) {
      return normalizePathIdentity(value) === normalizePathIdentity(escaped)
        ? dirname(fixture.parent)
        : path.resolve(value);
    },
  };
  assertHarnessError(
    () => validateEvidenceOutput(injected, escaped, { mustExist: true }),
    HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
  );
});

test("native symlink or junction escape is rejected when the host supports it", (t) => {
  const fixture = createFixture(t, "native-link");
  const root = validateEvidenceRoot({
    allowedParent: fixture.parent,
    evidenceRoot: fixture.evidenceRoot,
    repositoryRoot,
  });
  const linkPath = join(fixture.evidenceRoot, "repository-link");
  try {
    symlinkSync(repositoryRoot, linkPath, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.diagnostic(`native link capability unavailable: ${error.code}; injected escape test remains authoritative`);
      return;
    }
    throw error;
  }
  t.after(() => {
    if (existsSync(linkPath)) unlinkSync(linkPath);
  });
  assertHarnessError(
    () => validateEvidenceOutput(root, join(linkPath, "package.json"), { mustExist: true }),
    HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
  );
});

test("release command plan is exact, one-shot, dry-run-only, and lifecycle-safe", (t) => {
  const plan = buildReleaseCommandPlan(repositoryRoot);
  assert.deepEqual(RELEASE_COMMAND, ["npm", "run", "release:check"]);
  assert.equal(plan.command, "npm run release:check");
  assert.equal(plan.childInvocationMaximum, 1);
  assert.equal(plan.retryMaximum, 0);
  assert.equal(plan.standaloneDryRunInvocations, 0);
  assert.equal(plan.actualPublishCommands, 0);
  assert.equal(plan.releaseIsolationInvocations, 0);
  assert.equal(plan.modelBackedCommands, 0);
  assert.equal(plan.dryRunInsideComposite, true);
  assert.deepEqual(plan.lifecycleScripts, []);

  const fixture = createFixture(t, "lifecycle-surprise");
  const packageJson = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
  packageJson.scripts["prerelease:check"] = "node unexpected.mjs";
  writeFileSync(join(fixture.parent, "package.json"), `${JSON.stringify(packageJson)}\n`);
  assertHarnessError(
    () => buildReleaseCommandPlan(fixture.parent),
    HARNESS_ERROR_CODES.COMMAND_PLAN_INVALID,
  );
});

test("hermetic proof binds exact checkout, layout, environment, and committed files", (t) => {
  const fixture = createHermeticProofFixture(t, "valid-proof");
  const validated = validateHermeticRunProof({
    evidenceRoot: fixture.innerEvidence,
    inheritedEnvironment: fixture.environment,
    repositoryRoot: fixture.checkoutRoot,
    runnerProof: fixture.proofPath,
    sourceSha: fixture.sourceSha,
  });

  assert.equal(HERMETIC_PROOF_SCHEMA_VERSION, 1);
  assert.equal(validated.digest, fixture.proof.digest);
  assert.equal(validated.source.sha, fixture.sourceSha);
  assert.equal(validated.invocation.runnerMaximum, 1);
  assert.equal(validated.invocation.harnessMaximum, 1);
  assert.equal(validated.invocation.releaseMaximum, 1);
  assert.equal(validated.invocation.retryMaximum, 0);
  for (const name of ["runner", "harness", "package"]) {
    assert.match(validated.files[name].blobSha, /^[a-f0-9]{40}$/);
    assert.match(validated.files[name].sha256, /^[a-f0-9]{64}$/);
    assert.ok(validated.files[name].bytes > 0);
  }
  for (const name of [
    "gitConfigGlobalFile",
    "gitConfigSystemFile",
    "npmGlobalConfigFile",
    "npmUserConfigFile",
  ]) {
    assert.match(validated.layout[name].sha256, /^[a-f0-9]{64}$/);
  }
});

test("hermetic proof rejects digest, environment, and in-place config drift", (t) => {
  const digestFixture = createHermeticProofFixture(t, "proof-digest");
  assertHarnessError(
    () =>
      validateHermeticRunProof({
        evidenceRoot: digestFixture.innerEvidence,
        inheritedEnvironment: digestFixture.environment,
        proof: { ...digestFixture.proof, digest: "0".repeat(64) },
        repositoryRoot: digestFixture.checkoutRoot,
        sourceSha: digestFixture.sourceSha,
      }),
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
  );

  const environmentFixture = createHermeticProofFixture(t, "proof-environment");
  assertHarnessError(
    () =>
      validateHermeticRunProof({
        evidenceRoot: environmentFixture.innerEvidence,
        inheritedEnvironment: {
          ...environmentFixture.environment,
          NODE_OPTIONS: "--require synthetic.js",
        },
        proof: environmentFixture.proof,
        repositoryRoot: environmentFixture.checkoutRoot,
        sourceSha: environmentFixture.sourceSha,
      }),
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
  );

  const configFixture = createHermeticProofFixture(t, "proof-config-drift");
  writeFileSync(configFixture.layout.npmUserConfigFile, "audit=true\n");
  assertHarnessError(
    () =>
      validateHermeticRunProof({
        evidenceRoot: configFixture.innerEvidence,
        inheritedEnvironment: configFixture.environment,
        proof: configFixture.proof,
        repositoryRoot: configFixture.checkoutRoot,
        sourceSha: configFixture.sourceSha,
      }),
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
  );

  const dirtyFixture = createHermeticProofFixture(t, "proof-dirty-checkout");
  writeFileSync(join(dirtyFixture.checkoutRoot, "untracked.txt"), "dirty\n");
  assertHarnessError(
    () =>
      validateHermeticRunProof({
        evidenceRoot: dirtyFixture.innerEvidence,
        inheritedEnvironment: dirtyFixture.environment,
        proof: dirtyFixture.proof,
        repositoryRoot: dirtyFixture.checkoutRoot,
        sourceSha: dirtyFixture.sourceSha,
      }),
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
  );
});

test("hermetic proof rejects hidden non-proof tracked-file drift", (t) => {
  for (const [label, indexFlag] of [
    ["assume-unchanged", "--assume-unchanged"],
    ["skip-worktree", "--skip-worktree"],
  ]) {
    const fixture = createHermeticProofFixture(t, `proof-${label}`);
    gitFixtureOutput(fixture.checkoutRoot, [
      "update-index",
      indexFlag,
      "non-proof-tracked.txt",
    ]);
    writeFileSync(
      join(fixture.checkoutRoot, "non-proof-tracked.txt"),
      `${label} drift\n`,
    );
    assert.equal(
      gitFixtureOutput(fixture.checkoutRoot, [
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      ]),
      "",
      `${label} hides the tracked-file drift from porcelain status`,
    );
    assertHarnessError(
      () =>
        validateHermeticRunProof({
          evidenceRoot: fixture.innerEvidence,
          inheritedEnvironment: fixture.environment,
          proof: fixture.proof,
          repositoryRoot: fixture.checkoutRoot,
          sourceSha: fixture.sourceSha,
        }),
      HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
    );
  }
});

test("hermetic proof consumption is durable, single-use, and filename-bound", (t) => {
  const fixture = createHermeticProofFixture(t, "proof-consume");
  const options = {
    evidenceRoot: fixture.innerEvidence,
    inheritedEnvironment: fixture.environment,
    repositoryRoot: fixture.checkoutRoot,
    runnerProof: fixture.proofPath,
    sourceSha: fixture.sourceSha,
  };
  const consumed = consumeHermeticRunProof(options);
  assert.equal(consumed.proof.digest, fixture.proof.digest);
  assert.equal(existsSync(consumed.receiptPath), true);
  const validatedReceipt = validateHermeticProofReceipt({
    evidenceRoot: fixture.innerEvidence,
    proof: consumed.proof,
    proofPath: fixture.proofPath,
  });
  assert.equal(validatedReceipt.receipt.digest, fixture.proof.digest);
  assert.equal(validatedReceipt.receipt.nonce, fixture.proof.nonce);
  assert.equal(validatedReceipt.receipt.sourceSha, fixture.sourceSha);
  assert.equal(
    canonicalIdentitiesEqual(validatedReceipt.receiptPath, consumed.receiptPath),
    true,
  );
  assertHarnessError(
    () => consumeHermeticRunProof(options),
    HARNESS_ERROR_CODES.DUPLICATE_INVOCATION,
  );

  const originalReceipt = readFileSync(consumed.receiptPath);
  const tamperedReceipt = JSON.parse(originalReceipt.toString("utf8"));
  tamperedReceipt.nonce = "f".repeat(64);
  writeFileSync(consumed.receiptPath, `${JSON.stringify(tamperedReceipt, null, 2)}\n`);
  assertHarnessError(
    () =>
      validateHermeticProofReceipt({
        evidenceRoot: fixture.innerEvidence,
        proof: consumed.proof,
        proofPath: fixture.proofPath,
      }),
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
  );
  writeFileSync(consumed.receiptPath, Buffer.alloc(256 * 1024 + 1, 0x78));
  assertHarnessError(
    () =>
      validateHermeticProofReceipt({
        evidenceRoot: fixture.innerEvidence,
        proof: consumed.proof,
        proofPath: fixture.proofPath,
      }),
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
  );
  writeFileSync(consumed.receiptPath, originalReceipt);

  const nestedEvidence = join(fixture.innerEvidence, "nested");
  mkdirSync(nestedEvidence);
  const nestedProof = join(nestedEvidence, "runner-proof.json");
  writeFileSync(nestedProof, readFileSync(fixture.proofPath));
  assertHarnessError(
    () =>
      validateHermeticProofReceipt({
        evidenceRoot: fixture.innerEvidence,
        proof: consumed.proof,
        proofPath: nestedProof,
      }),
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
  );

  const copiedProof = join(fixture.innerEvidence, "copied-proof.json");
  writeFileSync(copiedProof, readFileSync(fixture.proofPath));
  assertHarnessError(
    () => consumeHermeticRunProof({ ...options, runnerProof: copiedProof }),
    HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID,
  );
});

test("proof-mode npm environment preserves runner-owned roots and remains bounded", (t) => {
  const fixture = createHermeticProofFixture(t, "proof-child-environment");
  const context = createOwnedRun({
    allowedParent: fixture.outer.runRoot,
    evidenceRoot: fixture.innerEvidence,
    mode: "proof-provenance",
    repositoryRoot: fixture.checkoutRoot,
  });
  const resolved = resolveNpmProvenance({
    context,
    hermeticProof: fixture.proof,
    inheritedEnvironment: fixture.environment,
  });

  assert.equal(
    normalizePathIdentity(resolved.childEnvironment.npm_config_userconfig),
    normalizePathIdentity(fixture.layout.npmUserConfigFile),
  );
  assert.equal(
    normalizePathIdentity(resolved.childEnvironment.npm_config_globalconfig),
    normalizePathIdentity(fixture.layout.npmGlobalConfigFile),
  );
  assert.equal(
    normalizePathIdentity(resolved.childEnvironment.npm_config_cache),
    normalizePathIdentity(fixture.layout.npmCacheRoot),
  );
  assert.equal(
    normalizePathIdentity(resolved.childEnvironment.HOME),
    normalizePathIdentity(fixture.layout.homeRoot),
  );
  for (const forbidden of [
    "NODE_OPTIONS",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NPM_TOKEN",
    "GIT_SSH_COMMAND",
  ]) {
    assert.equal(resolved.childEnvironment[forbidden], undefined);
  }
});

test("proof-mode dry baseline observes the final runner-owned npm config", (t) => {
  const fixture = createHermeticProofFixture(t, "proof-baseline-environment");
  const result = dryValidateReleaseEvidence({
    allowedParent: fixture.outer.runRoot,
    evidenceRoot: fixture.innerEvidence,
    hermeticProof: fixture.proof,
    includeProtectedState: true,
    inheritedEnvironment: fixture.environment,
    repositoryRoot: fixture.checkoutRoot,
  });
  const baseline = JSON.parse(
    readFileSync(join(result.context.runRoot, "preflight-baseline.json"), "utf8"),
  );

  assert.equal(result.summary.status, "DRY_VALIDATION_PASS");
  assert.equal(baseline.userconfig.exists, true);
  assert.equal(
    baseline.userconfig.contentSha256,
    fixture.proof.layout.npmUserConfigFile.sha256,
  );
  assert.ok(
    baseline.protectedState.locations.some(
      (location) => location.label === "configured-npm-userconfig",
    ),
  );
});

test("outer, child, and effective npm provenance agree and mismatch gates", (t) => {
  const options = harnessOptions(t, "npm-provenance");
  const context = createOwnedRun({ ...options, mode: "provenance" });
  const resolved = resolveNpmProvenance({ context });

  assert.equal(assertNpmProvenance(resolved.provenance), true);
  assert.equal(
    resolved.provenance.launcherReportedVersion,
    resolved.provenance.selectedCliVersion,
  );
  assert.equal(
    resolved.provenance.selectedCliVersion,
    resolved.provenance.effectiveCompositeNpmVersion,
  );
  assert.equal(
    canonicalIdentitiesEqual(
      resolved.provenance.probeResolvedNpmLauncher,
      resolved.provenance.npmShimLauncher,
    ),
    true,
  );
  assert.equal(resolved.provenance.probeNodeVersion, resolved.provenance.nodeVersion);
  assert.match(
    resolved.provenance.launcherFileIdentity.canonicalSha256,
    /^[a-f0-9]{64}$/,
  );
  assert.match(
    resolved.provenance.selectedCliFileIdentity.canonicalSha256,
    /^[a-f0-9]{64}$/,
  );
  assert.match(
    resolved.provenance.probeNpmConfigUserAgent,
    /^npm\/\d+\.\d+\.\d+ /,
  );
  assertHarnessError(
    () =>
      assertNpmProvenance({
        ...resolved.provenance,
        effectiveCompositeNpmVersion: "0.0.0-mismatch",
      }),
    HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
  );
});

test("copied npm runtime provenance remains exact before and after a harmless child", async (t) => {
  const runtime = createSyntheticNpmRuntime(t, "runtime-provenance-unchanged");
  const context = createOwnedRun({
    ...harnessOptions(t, "runtime-provenance-unchanged-evidence"),
    mode: "runtime-provenance-unchanged",
  });
  writeOwnedEvidenceJson(context, "provenance.json", runtime.provenance);

  const packageTree = captureNpmPackageTreeEvidence(
    runtime.selectedCliPath,
    runtime.selectedCliVersion,
  );
  assert.match(packageTree.aggregateSha256, /^[a-f0-9]{64}$/);
  assert.equal(
    packageTree.aggregateSha256,
    runtime.provenance.selectedCliPackageTreeEvidence.aggregateSha256,
  );
  assert.ok(packageTree.counts.files >= 3);
  assert.equal(assertNpmRuntimeProvenanceUnchanged(runtime.provenance), true);

  const child = await runDurableChild({
    args: ["-e", "process.stdout.write('UNCHANGED_RUNTIME\\n');"],
    command: process.execPath,
    context,
    cwd: repositoryRoot,
    environment: process.env,
    expectedExitCode: 0,
    invocationName: "unchanged-runtime",
  });

  assert.equal(child.status, "CHILD_EVIDENCE_RETAINED");
  assert.equal(assertNpmRuntimeProvenanceUnchanged(runtime.provenance), true);
  assert.equal(readFileSync(child.stdoutPath, "utf8"), "UNCHANGED_RUNTIME\n");
  assert.equal(existsSync(join(context.runRoot, "raw", "raw-hashes.json")), true);
  assert.doesNotMatch(
    readFileSync(join(context.runRoot, "child-summary.json"), "utf8"),
    /PASS/,
  );
  assert.equal(existsSync(join(context.runRoot, "summary.json")), false);
});

test("exact runtime file drift is rejected before a child can spawn", (t) => {
  for (const [role, field] of [
    ["node", "nodeExecutable"],
    ["requested-launcher", "requestedLauncherPath"],
    ["selected-cli", "selectedCliPath"],
    ["platform-shim", "npmShimLauncher"],
  ]) {
    const runtime = createSyntheticNpmRuntime(t, `runtime-pre-spawn-${role}`);
    const context = createOwnedRun({
      ...harnessOptions(t, `runtime-pre-spawn-${role}-evidence`),
      mode: `runtime-pre-spawn-${role}`,
    });
    writeOwnedEvidenceJson(context, "provenance.json", runtime.provenance);
    assert.equal(assertNpmRuntimeProvenanceUnchanged(runtime.provenance), true);

    mutateSyntheticRuntimeFile(runtime[field], `${role} drift before spawn`);

    assertHarnessError(
      () => assertNpmRuntimeProvenanceUnchanged(runtime.provenance),
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
    );
    assert.equal(existsSync(join(context.runRoot, "provenance.json")), true);
    assert.equal(existsSync(join(context.runRoot, "raw")), false);
    assert.equal(existsSync(join(context.runRoot, "summary.json")), false);
    assert.equal(
      readdirSync(context.runRoot).some((name) => name.startsWith("invocation-")),
      false,
    );
  }
});

test("npm package dependency drift during a harmless child fails postflight with raw evidence", async (t) => {
  const runtime = createSyntheticNpmRuntime(t, "runtime-package-drift");
  const context = createOwnedRun({
    ...harnessOptions(t, "runtime-package-drift-evidence"),
    mode: "runtime-package-drift",
  });
  writeOwnedEvidenceJson(context, "provenance.json", runtime.provenance);
  assert.equal(assertNpmRuntimeProvenanceUnchanged(runtime.provenance), true);

  const child = await runDurableChild({
    args: [
      "-e",
      [
        "const { appendFileSync } = require('node:fs');",
        "appendFileSync(process.argv[1], '\\n// child-time dependency drift\\n');",
        "process.stdout.write('DEPENDENCY_MUTATED\\n');",
      ].join(" "),
      runtime.trampolineDependency,
    ],
    command: process.execPath,
    context,
    cwd: repositoryRoot,
    environment: process.env,
    expectedExitCode: 0,
    invocationName: "package-dependency-drift",
  });

  assert.equal(child.status, "CHILD_EVIDENCE_RETAINED");
  assertHarnessError(
    () => assertNpmRuntimeProvenanceUnchanged(runtime.provenance),
    HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
  );
  assert.equal(readFileSync(child.stdoutPath, "utf8"), "DEPENDENCY_MUTATED\n");
  assert.equal(existsSync(join(context.runRoot, "raw", "exit.json")), true);
  assert.equal(existsSync(join(context.runRoot, "raw", "stderr.log")), true);
  const rawHashes = JSON.parse(
    readFileSync(join(context.runRoot, "raw", "raw-hashes.json"), "utf8"),
  );
  assert.match(rawHashes.provenance.sha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(
    readFileSync(join(context.runRoot, "child-summary.json"), "utf8"),
    /PASS/,
  );
  assert.equal(existsSync(join(context.runRoot, "summary.json")), false);
});

test("npm package tree capture rejects external and dangling links", (t) => {
  let exercised = 0;
  for (const linkKind of ["external", "dangling"]) {
    const runtime = createSyntheticNpmRuntime(t, `runtime-package-${linkKind}-link`);
    const target = join(runtime.parent, `${linkKind}-target`);
    const linkPath = join(runtime.packageRoot, "lib", `${linkKind}-link`);
    if (linkKind === "external") mkdirSync(target);
    try {
      symlinkSync(
        target,
        linkPath,
        process.platform === "win32" ? "junction" : "dir",
      );
    } catch (error) {
      if (["EACCES", "EINVAL", "EPERM", "UNKNOWN"].includes(error.code)) {
        t.diagnostic(`${linkKind} link capability unavailable: ${error.code}`);
        continue;
      }
      throw error;
    }
    exercised += 1;
    assertHarnessError(
      () =>
        captureNpmRuntimeIdentityEvidence({
          includePackageTree: true,
          nodeExecutable: runtime.nodeExecutable,
          npmShimLauncher: runtime.npmShimLauncher,
          requestedLauncherPath: runtime.requestedLauncherPath,
          selectedCliPath: runtime.selectedCliPath,
          selectedCliVersion: runtime.selectedCliVersion,
        }),
      HARNESS_ERROR_CODES.NPM_PROVENANCE_MISMATCH,
    );
  }
  assert.ok(exercised >= 1, "at least one native package-link case is exercised");
});

test("exit 7, separated streams, runtime, raw hashes, and atomic summary remain durable", async (t) => {
  const options = harnessOptions(t, "durable-child");
  const context = createOwnedRun({ ...options, mode: "durable" });
  let atomicObservation;
  const result = await runDurableChild({
    args: [
      "-e",
      "process.stdout.write('OUT\\n'); process.stderr.write('ERR\\n'); process.exit(7);",
    ],
    command: process.execPath,
    context,
    cwd: repositoryRoot,
    environment: process.env,
    expectedExitCode: 7,
    invocationName: "exit-seven",
    parser({ exitRecord, stderr, stdout }) {
      return { code: exitRecord.code, stderr, stdout };
    },
    summaryBeforeRename({ targetPath, temporaryPath }) {
      atomicObservation = {
        targetAbsent: !existsSync(targetPath),
        temporaryPresent: existsSync(temporaryPath),
      };
    },
  });

  assert.equal(result.exit.code, 7);
  assert.ok(result.exit.monotonicRuntimeMs >= 0);
  assert.equal(readFileSync(result.stdoutPath, "utf8"), "OUT\n");
  assert.equal(readFileSync(result.stderrPath, "utf8"), "ERR\n");
  assert.deepEqual(atomicObservation, { targetAbsent: true, temporaryPresent: true });
  assert.equal(existsSync(join(context.runRoot, "raw", "raw-hashes.json")), true);
  assert.equal(
    readdirSync(context.runRoot).some((name) => name.includes(".tmp-")),
    false,
  );
});

test("parser failure preserves raw stdout, stderr, exit, runtime, and failure summary", async (t) => {
  const options = harnessOptions(t, "parser-failure");
  const context = createOwnedRun({ ...options, mode: "parser" });
  await assert.rejects(
    runDurableChild({
      args: [
        "-e",
        "process.stdout.write('RAW_OUT\\n'); process.stderr.write('RAW_ERR\\n'); process.exit(7);",
      ],
      command: process.execPath,
      context,
      cwd: repositoryRoot,
      environment: process.env,
      expectedExitCode: 7,
      invocationName: "parser-failure",
      parser() {
        throw new Error("deliberate parser failure");
      },
    }),
    (error) => {
      assert.equal(error?.code, HARNESS_ERROR_CODES.POST_PROCESSING_FAILED);
      return true;
    },
  );

  const exit = JSON.parse(readFileSync(join(context.runRoot, "raw", "exit.json"), "utf8"));
  assert.equal(exit.code, 7);
  assert.ok(exit.monotonicRuntimeMs >= 0);
  assert.equal(readFileSync(join(context.runRoot, "raw", "stdout.log"), "utf8"), "RAW_OUT\n");
  assert.equal(readFileSync(join(context.runRoot, "raw", "stderr.log"), "utf8"), "RAW_ERR\n");
  assert.match(
    readFileSync(join(context.runRoot, "child-summary.json"), "utf8"),
    /POST_PROCESSING_FAILED/,
  );
});

test("synchronous spawn failure still retains exit and stream evidence", async (t) => {
  const context = createOwnedRun({
    ...harnessOptions(t, "synchronous-spawn-failure"),
    mode: "spawn-failure",
  });
  const result = await runDurableChild({
    args: [],
    command: null,
    context,
    cwd: repositoryRoot,
    environment: process.env,
    expectedExitCode: 0,
    invocationName: "sync-spawn-failure",
  });

  assert.equal(result.status, "CHILD_FAILED");
  assert.equal(result.exit.code, null);
  assert.ok(result.exit.spawnError);
  assert.equal(existsSync(join(context.runRoot, "raw", "exit.json")), true);
  assert.equal(existsSync(join(context.runRoot, "raw", "stdout.log")), true);
  assert.equal(existsSync(join(context.runRoot, "raw", "stderr.log")), true);
});

test("duplicate invocation is rejected and retry maximum remains zero", (t) => {
  const context = createOwnedRun({ ...harnessOptions(t, "duplicate"), mode: "duplicate" });
  acquireInvocationGuard(context, "release-check");
  assertHarnessError(
    () => acquireInvocationGuard(context, "release-check"),
    HARNESS_ERROR_CODES.DUPLICATE_INVOCATION,
  );
  assert.equal(RELEASE_INVOCATION_MAXIMUM, 1);
  assert.equal(RELEASE_RETRY_MAXIMUM, 0);
});

test("secret-shaped child output and summaries are redacted before retention", async (t) => {
  const context = createOwnedRun({ ...harnessOptions(t, "redaction"), mode: "redaction" });
  const synthetic = `npm_${"s".repeat(24)}`;
  const result = await runDurableChild({
    args: ["-e", `process.stdout.write(${JSON.stringify(`${synthetic}\n`)});`],
    command: process.execPath,
    context,
    cwd: repositoryRoot,
    environment: process.env,
    expectedExitCode: 0,
    invocationName: "redaction",
    parser({ stdout }) {
      return { stdout };
    },
  });
  atomicWriteSanitizedSummary(context, "redaction-summary.json", { synthetic });
  atomicWriteSanitizedSummary(context, "bounded-summary.json", {
    payload: Array.from({ length: 100 }, (_, index) => ({
      index,
      value: "x".repeat(10_000),
    })),
    status: "SYNTHETIC_LARGE_SUMMARY",
  });

  for (const filePath of [
    result.stdoutPath,
    join(context.runRoot, "child-summary.json"),
    join(context.runRoot, "redaction-summary.json"),
  ]) {
    const retained = readFileSync(filePath, "utf8");
    assert.doesNotMatch(retained, new RegExp(synthetic));
    assert.match(retained, /REDACTED/);
  }
  assert.doesNotMatch(redactSecrets(`Authorization: Bearer ${synthetic}`), new RegExp(synthetic));
  assert.doesNotMatch(
    redactSecrets("//registry.example.invalid/:_authToken=synthetic-value-123456"),
    /synthetic-value-123456/,
  );
  assert.doesNotMatch(
    redactSecrets(
      "-----BEGIN PRIVATE KEY-----\nsynthetic-private-material\n-----END PRIVATE KEY-----",
    ),
    /synthetic-private-material/,
  );
  const boundedSummary = readFileSync(
    join(context.runRoot, "bounded-summary.json"),
    "utf8",
  );
  assert.ok(Buffer.byteLength(boundedSummary) <= 262_144);
  assert.match(boundedSummary, /"summaryTruncated": true/);
});

test("cleanup removes only an exact sealed owned run and rejects foreign additions", (t) => {
  const options = harnessOptions(t, "cleanup");
  const context = createOwnedRun({ ...options, mode: "cleanup" });
  atomicWriteSanitizedSummary(context, "summary.json", { status: "PASS" });
  assertHarnessError(
    () =>
      cleanupOwnedRun({
        ...options,
        runRoot: options.evidenceRoot,
        token: context.token,
      }),
    HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
  );
  assertHarnessError(
    () =>
      cleanupOwnedRun({
        ...options,
        runRoot: repositoryRoot,
        token: context.token,
      }),
    HARNESS_ERROR_CODES.EVIDENCE_OUTPUT_UNSAFE,
  );
  sealOwnedRun(context, "sanitized evidence copied into Task/Test");
  assertHarnessError(
    () =>
      cleanupOwnedRun({
        ...options,
        runRoot: context.runRoot,
        token: "wrong-token",
      }),
    HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
  );
  const ownerPath = join(context.runRoot, ".release-evidence-owner.json");
  const originalOwner = readFileSync(ownerPath, "utf8");
  const changedOwner = JSON.parse(originalOwner);
  changedOwner.rootIdentity.dev = `${changedOwner.rootIdentity.dev}-changed`;
  writeFileSync(ownerPath, `${JSON.stringify(changedOwner, null, 2)}\n`);
  assertHarnessError(
    () =>
      cleanupOwnedRun({
        ...options,
        runRoot: context.runRoot,
        token: context.token,
      }),
    HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
  );
  writeFileSync(ownerPath, originalOwner);
  const foreignPath = join(context.runRoot, "foreign.txt");
  writeFileSync(foreignPath, "foreign\n");

  assertHarnessError(
    () =>
      cleanupOwnedRun({
        ...options,
        runRoot: context.runRoot,
        token: context.token,
      }),
    HARNESS_ERROR_CODES.CLEANUP_OWNERSHIP_MISMATCH,
  );
  unlinkSync(foreignPath);
  assert.deepEqual(
    cleanupOwnedRun({
      ...options,
      runRoot: context.runRoot,
      token: context.token,
    }),
    { removed: true },
  );
  assert.equal(existsSync(context.runRoot), false);
  assert.equal(existsSync(options.evidenceRoot), true);
});

test("dry validation uses the exact plan and leaves normal userconfig byte-identical", (t) => {
  const options = harnessOptions(t, "dry-validation");
  const normalConfig = join(options.allowedParent, "normal-userconfig");
  writeFileSync(normalConfig, "//registry.example.invalid/:_authToken=<redacted-placeholder>\n");
  const before = readFileSync(normalConfig);
  const inheritedEnvironment = {
    ...process.env,
    npm_config_userconfig: normalConfig,
  };
  const result = dryValidateReleaseEvidence({ ...options, inheritedEnvironment });

  assert.equal(result.summary.status, "DRY_VALIDATION_PASS");
  assert.equal(result.summary.commandPlan.command, "npm run release:check");
  assert.equal(result.summary.commandPlan.childInvocationMaximum, 1);
  assert.equal(result.summary.commandPlan.standaloneDryRunInvocations, 0);
  assert.equal(result.summary.commandPlan.actualPublishCommands, 0);
  assert.deepEqual(readFileSync(normalConfig), before);
  const preflight = JSON.parse(
    readFileSync(join(result.context.runRoot, "preflight-baseline.json"), "utf8"),
  );
  assert.match(preflight.repository.headSha, /^[a-f0-9]{40}$/);
  assert.match(preflight.package.manifestSha256, /^[a-f0-9]{64}$/);
  assert.equal(preflight.package.name, "kyw-dev");
  assert.equal(
    normalizePathIdentity(result.context.runRoot).startsWith(
      `${normalizePathIdentity(options.evidenceRoot)}${path.sep}`,
    ),
    true,
  );
});

test("self-test proves harmless exit durability, parser preservation, provenance, and cleanup", async (t) => {
  const result = await runSelfTest(harnessOptions(t, "self-test"));

  assert.equal(result.summary.status, "SELF_TEST_PASS");
  assert.equal(result.summary.stdoutSeparated, "PASS");
  assert.equal(result.summary.stderrSeparated, "PASS");
  assert.equal(result.summary.parserFailureRawPreservation, "PASS");
  assert.equal(result.summary.npmProvenanceMatch, "PASS");
  assert.equal(result.summary.npmProvenanceMismatch, "PASS");
  assert.equal(result.summary.duplicateInvocation, "PASS");
  assert.equal(result.summary.cleanup, "PASS");
  const exit = JSON.parse(readFileSync(join(result.context.runRoot, "raw", "exit.json"), "utf8"));
  assert.equal(exit.code, 7);
  const rawHashes = JSON.parse(
    readFileSync(join(result.context.runRoot, "raw", "raw-hashes.json"), "utf8"),
  );
  assert.match(rawHashes.provenance.sha256, /^[a-f0-9]{64}$/);
});

test("actual mode is gated before any release child or evidence run", async () => {
  await assert.rejects(
    runReleaseEvidence({
      evidenceRoot: "not-used",
      repositoryRoot,
    }),
    (error) => {
      assert.equal(error?.code, HARNESS_ERROR_CODES.AUTHORIZATION_REQUIRED);
      return true;
    },
  );
  await assert.rejects(
    runReleaseEvidence({
      allowReleaseCommand: true,
      evidenceRoot: "not-used",
      repositoryRoot,
    }),
    (error) => {
      assert.equal(error?.code, HARNESS_ERROR_CODES.HERMETIC_PROOF_REQUIRED);
      return true;
    },
  );
});

test("self-test and dry CLI reject actual proof-only flags before filesystem work", () => {
  const harnessPath = join(repositoryRoot, "scripts", "release-evidence-harness.mjs");
  for (const mode of ["--self-test", "--dry-validate"]) {
    const result = spawnSync(
      process.execPath,
      [
        harnessPath,
        mode,
        "--repository",
        repositoryRoot,
        "--evidence-root",
        repositoryRoot,
        "--source-sha",
        "a".repeat(40),
      ],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ARGUMENT_ERROR/);
    assert.match(result.stderr, /valid only with --run/);
  }
});

test("invalid actual proof fails before harness evidence preparation", async (t) => {
  const fixture = createHermeticProofFixture(t, "actual-invalid-proof");
  const invalid = JSON.parse(readFileSync(fixture.proofPath, "utf8"));
  invalid.digest = "0".repeat(64);
  writeFileSync(fixture.proofPath, `${JSON.stringify(invalid, null, 2)}\n`);
  const before = readdirSync(fixture.innerEvidence).sort();

  await assert.rejects(
    runReleaseEvidence({
      allowReleaseCommand: true,
      allowedParent: fixture.outer.runRoot,
      evidenceRoot: fixture.innerEvidence,
      inheritedEnvironment: fixture.environment,
      repositoryRoot: fixture.checkoutRoot,
      runnerProof: fixture.proofPath,
      sourceSha: fixture.sourceSha,
    }),
    (error) => {
      assert.equal(error?.code, HARNESS_ERROR_CODES.HERMETIC_PROOF_INVALID);
      return true;
    },
  );
  assert.deepEqual(readdirSync(fixture.innerEvidence).sort(), before);
});

test("harness and tests stay development-only while Stable CI discovers them on every host", () => {
  const packageJson = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
  const workflow = readFileSync(join(repositoryRoot, ".github", "workflows", "ci.yml"), "utf8");
  const source = readFileSync(
    join(repositoryRoot, "scripts", "release-evidence-harness.mjs"),
    "utf8",
  );

  assert.equal(packageJson.version, "0.1.3");
  assert.equal(packageJson.scripts.test, "node --test");
  assert.equal(packageJson.dependencies, undefined);
  assert.equal(packageJson.devDependencies, undefined);
  assert.equal(packageJson.files.includes("scripts/"), false);
  assert.equal(packageJson.files.includes("test/"), false);
  assert.match(source, /realpathSync\.native/);
  for (const os of ["ubuntu-latest", "macos-latest", "windows-latest"]) {
    assert.match(workflow, new RegExp(os));
  }
  assert.match(workflow, /^\s+run: npm test\s*$/mu);
});
