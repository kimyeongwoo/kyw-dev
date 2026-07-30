import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
  RELEASE_COMMAND,
  RELEASE_INVOCATION_MAXIMUM,
  RELEASE_RETRY_MAXIMUM,
  acquireInvocationGuard,
  assertNpmProvenance,
  atomicWriteSanitizedSummary,
  buildReleaseCommandPlan,
  canonicalIdentitiesEqual,
  cleanupOwnedRun,
  createOwnedRun,
  dryValidateReleaseEvidence,
  normalizePathIdentity,
  redactSecrets,
  resolveNpmProvenance,
  runDurableChild,
  runReleaseEvidence,
  runSelfTest,
  sealOwnedRun,
  validateEvidenceOutput,
  validateEvidenceRoot,
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
