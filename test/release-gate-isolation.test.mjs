import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path, { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ISOLATION_ERROR_CODES,
  ISOLATION_OUTCOMES,
  ReleaseGateIsolationError,
  assertProtectedStateUnchanged,
  classifyProtectedState,
  createIsolatedChildEnvironment,
  formatIsolationFailure,
  isSameOrDescendant,
  removeApprovedTemporaryRoot,
  resolveProtectedLocations,
  runIsolatedReleaseLifecycle,
  snapshotProtectedState,
} from "../scripts/release-gate-isolation.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const runnerSource = fileURLToPath(
  new URL("../scripts/release-gate-isolation.mjs", import.meta.url),
);
const syntheticCredential = "sk-proj-abcdefghijklmnop1234567890";

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function expectIsolationError(callback, code) {
  assert.throws(callback, (error) => error?.code === code);
}

function relevantEnvironment(environment) {
  const names = new Set([
    "home",
    "userprofile",
    "homedrive",
    "homepath",
    "codex_home",
    "npm_config_userconfig",
    "npm_config_cache",
    "temp",
    "tmp",
    "tmpdir",
    "xdg_config_home",
    "xdg_cache_home",
  ]);
  return Object.fromEntries(
    Object.entries(environment)
      .filter(([name]) => names.has(name.toLowerCase()))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function createSyntheticProtectedFixture(t) {
  const root = mkdtempSync(join(tmpdir(), "kyw-dev-isolation-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const normalUserRoot = join(root, "normal-user");
  const normalAgentsRoot = join(normalUserRoot, ".agents");
  const normalCodexRoot = join(normalUserRoot, ".codex");
  const npmUserconfig = join(normalUserRoot, ".npmrc");
  const temporaryParent = join(root, "attempts");
  mkdirSync(join(normalAgentsRoot, "skills"), { recursive: true });
  mkdirSync(join(normalCodexRoot, "sessions"), { recursive: true });
  mkdirSync(join(normalCodexRoot, "cache"), { recursive: true });
  mkdirSync(temporaryParent);
  writeFileSync(join(normalCodexRoot, "auth.json"), `{"token":"${syntheticCredential}"}\n`);
  writeFileSync(join(normalCodexRoot, "config.toml"), 'model = "synthetic-before"\n');
  writeFileSync(npmUserconfig, "registry=https://registry.npmjs.org/\n", "utf8");
  const environment = {
    ...process.env,
    HOME: normalUserRoot,
    USERPROFILE: normalUserRoot,
    CODEX_HOME: normalCodexRoot,
    npm_config_userconfig: npmUserconfig,
  };
  return {
    root,
    normalUserRoot,
    normalAgentsRoot,
    normalCodexRoot,
    npmUserconfig,
    temporaryParent,
    environment,
    protectedLocations: resolveProtectedLocations({ environment }),
  };
}

function snapshotFixture(fixture) {
  return snapshotProtectedState(fixture.protectedLocations);
}

function writeFixtureFile(root, relativePath, contents) {
  const filePath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
  return filePath;
}

function fakeLifecycleSummary(attempt) {
  return {
    summary: Object.freeze({ fixtureAttempt: attempt }),
    packedSkillDigests: new Set(),
  };
}

test("identical protected state is CLEAN", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const before = snapshotFixture(fixture);
  const after = snapshotFixture(fixture);
  const classification = classifyProtectedState(before, after);

  assert.equal(classification.status, ISOLATION_OUTCOMES.CLEAN);
  assert.equal(classification.differenceCount, 0);
  assert.equal(classification.retryable, false);
  assert.equal(classification.inconclusive, false);
});

test("managed normal Skill paths are ISOLATION_VIOLATION", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const managedFile = writeFixtureFile(
    fixture.normalAgentsRoot,
    "skills/kyw-audit/SKILL.md",
    "managed before\n",
  );
  const before = snapshotFixture(fixture);
  writeFileSync(managedFile, "managed after\n", "utf8");
  const classification = classifyProtectedState(before, snapshotFixture(fixture));

  assert.equal(classification.status, ISOLATION_OUTCOMES.ISOLATION_VIOLATION);
  assert.ok(
    classification.differences.some(
      ({ relativePath, reason }) =>
        relativePath === "skills/kyw-audit/SKILL.md" && reason === "managed Skill path",
    ),
  );
});

test("normal ownership metadata changes are ISOLATION_VIOLATION", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const metadata = writeFixtureFile(
    fixture.normalAgentsRoot,
    "skills/.kyw-dev-install.json",
    "{}\n",
  );
  const before = snapshotFixture(fixture);
  writeFileSync(metadata, '{"schemaVersion":1}\n', "utf8");
  const classification = classifyProtectedState(before, snapshotFixture(fixture));

  assert.equal(classification.status, ISOLATION_OUTCOMES.ISOLATION_VIOLATION);
  assert.ok(
    classification.differences.some(
      ({ relativePath, reason }) =>
        relativePath === "skills/.kyw-dev-install.json" &&
        reason === "managed ownership metadata",
    ),
  );
});

test("exact kyw-dev Codex path markers are ISOLATION_VIOLATION", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const pluginState = writeFixtureFile(
    fixture.normalCodexRoot,
    "plugins/cache/kyw-dev@kyw-dev-local/state.json",
    "{}\n",
  );
  const before = snapshotFixture(fixture);
  writeFileSync(pluginState, '{"changed":true}\n', "utf8");
  const classification = classifyProtectedState(before, snapshotFixture(fixture));

  assert.equal(classification.status, ISOLATION_OUTCOMES.ISOLATION_VIOLATION);
  assert.ok(
    classification.differences.some(
      ({ reason }) => reason === "exact kyw-dev identifier: kyw-dev",
    ),
  );
});

test("exact packed kyw-dev Skill bytes in protected Codex state are ISOLATION_VIOLATION", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const packedBytes = Buffer.from("synthetic exact packed Skill bytes\n", "utf8");
  const before = snapshotFixture(fixture);
  writeFixtureFile(
    fixture.normalCodexRoot,
    "plugins/unrelated/cache/copied-skill.bin",
    packedBytes,
  );
  const classification = classifyProtectedState(before, snapshotFixture(fixture), {
    packedSkillDigests: [sha256(packedBytes)],
  });

  assert.equal(classification.status, ISOLATION_OUTCOMES.ISOLATION_VIOLATION);
  assert.ok(
    classification.differences.some(({ reason }) => reason === "exact packed Skill bytes"),
  );
});

test("unrelated Codex session and cache structural drift is AMBIENT_STATE_CHANGED", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const before = snapshotFixture(fixture);
  writeFixtureFile(
    fixture.normalCodexRoot,
    `sessions/${syntheticCredential}/events.jsonl`,
    `{"token":"${syntheticCredential}","payload":"must not be emitted"}\n`,
  );
  writeFixtureFile(fixture.normalCodexRoot, "cache/unrelated/item.bin", "cache payload\n");
  writeFixtureFile(fixture.normalCodexRoot, "logs/runner.log", "log payload\n");
  const classification = classifyProtectedState(before, snapshotFixture(fixture));
  const rendered = JSON.stringify(classification);

  assert.equal(classification.status, ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED);
  assert.equal(classification.attributedCount, 0);
  assert.ok(classification.differenceCount > 0);
  assert.equal(rendered.includes(fixture.root), false);
  assert.equal(rendered.includes(syntheticCredential), false);
  assert.equal(rendered.includes("must not be emitted"), false);
  assert.match(rendered, /\[REDACTED_CREDENTIAL\]/);
});

test("unrelated normal agents changes are AMBIENT_STATE_CHANGED and never CLEAN", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const before = snapshotFixture(fixture);
  writeFixtureFile(
    fixture.normalAgentsRoot,
    "skills/unrelated-skill/SKILL.md",
    "name: unrelated-skill\n",
  );
  const classification = classifyProtectedState(before, snapshotFixture(fixture));

  assert.equal(classification.status, ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED);
  assert.notEqual(classification.status, ISOLATION_OUTCOMES.CLEAN);
  assert.equal(classification.attributedCount, 0);
});

test("unknown Codex control changes without kyw-dev markers are AMBIENT_STATE_CHANGED", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const before = snapshotFixture(fixture);
  writeFileSync(join(fixture.normalCodexRoot, "config.toml"), 'model = "synthetic-after"\n');
  const first = classifyProtectedState(before, snapshotFixture(fixture));
  const second = classifyProtectedState(before, snapshotFixture(fixture));
  const rendered = JSON.stringify(first);

  assert.equal(first.status, ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED);
  assert.deepEqual(second, first);
  assert.equal(rendered.includes("synthetic-after"), false);
  assert.ok(
    first.differences.some(
      ({ relativePath, reason }) =>
        relativePath === "config.toml" && reason === "no exact kyw-dev attribution marker",
    ),
  );
});

test("unmarked normal npm userconfig changes are AMBIENT_STATE_CHANGED", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const before = snapshotFixture(fixture);
  writeFileSync(fixture.npmUserconfig, "registry=https://example.invalid/\n", "utf8");
  const classification = classifyProtectedState(before, snapshotFixture(fixture));

  assert.equal(classification.status, ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED);
  assert.ok(
    classification.differences.some(
      ({ protectedLocation, reason }) =>
        protectedLocation.endsWith("npm-userconfig") &&
        reason === "no exact kyw-dev attribution marker",
    ),
  );
});

test("entry evidence reports added, removed, modified, and type-changed paths", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const base = "skills/unrelated-skill";
  const modified = writeFixtureFile(
    fixture.normalAgentsRoot,
    `${base}/modified.txt`,
    "before\n",
  );
  const removed = writeFixtureFile(
    fixture.normalAgentsRoot,
    `${base}/removed.txt`,
    "remove me\n",
  );
  const typeChanged = writeFixtureFile(
    fixture.normalAgentsRoot,
    `${base}/type-changed`,
    "file before\n",
  );
  const before = snapshotFixture(fixture);
  writeFileSync(modified, "after\n", "utf8");
  rmSync(removed);
  rmSync(typeChanged);
  mkdirSync(typeChanged);
  writeFixtureFile(fixture.normalAgentsRoot, `${base}/added.txt`, "added\n");
  const classification = classifyProtectedState(before, snapshotFixture(fixture));
  const expected = new Map([
    [`${base}/added.txt`, ["added", "file"]],
    [`${base}/removed.txt`, ["removed", "file"]],
    [`${base}/modified.txt`, ["modified", "file"]],
    [`${base}/type-changed`, ["type changed", "directory"]],
  ]);

  assert.equal(classification.status, ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED);
  for (const [relativePath, [kind, entryType]] of expected) {
    assert.ok(
      classification.differences.some(
        (difference) =>
          difference.relativePath === relativePath &&
          difference.kind === kind &&
          difference.entryType === entryType,
      ),
      `${relativePath} should be ${kind}/${entryType}`,
    );
  }
});

test("parent protected-environment changes are ISOLATION_VIOLATION", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const snapshot = snapshotFixture(fixture);
  const classification = classifyProtectedState(snapshot, snapshot, {
    parentEnvironmentChanges: ["TMPDIR"],
  });

  assert.equal(classification.status, ISOLATION_OUTCOMES.ISOLATION_VIOLATION);
  assert.deepEqual(classification.differences, [
    {
      protectedLocation: "parent-environment",
      relativePath: "TMPDIR",
      category: "protected-environment",
      kind: "modified",
      entryType: "environment",
      attributed: true,
      reason: "runner process protected environment mutation",
      markers: [],
      contentDigest: undefined,
    },
  ]);
});

test("snapshot failure retains NORMAL_STATE_SNAPSHOT_FAILED", () => {
  expectIsolationError(
    () =>
      snapshotProtectedState({
        platform: process.platform,
        entries: [{ label: "normal-agents", path: "\u0000", mode: "tree" }],
      }),
    ISOLATION_ERROR_CODES.NORMAL_STATE_SNAPSHOT_FAILED,
  );
});

test("classification inspects every change before diagnostics are truncated", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const before = snapshotFixture(fixture);
  writeFixtureFile(
    fixture.normalAgentsRoot,
    "skills/kyw-task/SKILL.md",
    "managed bytes\n",
  );
  writeFixtureFile(fixture.normalAgentsRoot, "skills/unrelated/SKILL.md", "ambient bytes\n");
  const classification = classifyProtectedState(before, snapshotFixture(fixture), {
    maxDisplayedDifferences: 0,
  });

  assert.equal(classification.status, ISOLATION_OUTCOMES.ISOLATION_VIOLATION);
  assert.ok(classification.differenceCount > 0);
  assert.ok(classification.attributedCount > 0);
  assert.equal(classification.displayedDifferences.length, 0);
  assert.equal(classification.truncated, true);
});

test("ambient then clean runs exactly twice with fresh roots, snapshots, and cleanup", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const roots = [];
  const outsideMarker = join(fixture.root, "preserve-outside-attempts.txt");
  writeFileSync(outsideMarker, "preserve\n", "utf8");

  const summary = runIsolatedReleaseLifecycle({
    repositoryRoot,
    requireMarketplace: false,
    inheritedEnvironment: fixture.environment,
    temporaryParent: fixture.temporaryParent,
    attemptLifecycle({ attempt, plan }) {
      roots.push(plan.approvedTemporaryRoot);
      if (attempt === 1) {
        writeFixtureFile(
          fixture.normalAgentsRoot,
          "skills/unrelated-skill/SKILL.md",
          "ambient first attempt\n",
        );
      }
      return fakeLifecycleSummary(attempt);
    },
  });

  assert.equal(summary.isolation.status, ISOLATION_OUTCOMES.CLEAN);
  assert.equal(summary.isolation.attempts, 2);
  assert.deepEqual(
    summary.isolation.history.map(({ status }) => status),
    [ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED, ISOLATION_OUTCOMES.CLEAN],
  );
  assert.ok(summary.isolation.history[0].differenceCount > 0);
  assert.equal(summary.isolation.history[1].differenceCount, 0);
  assert.equal(summary.fixtureAttempt, 2);
  assert.equal(roots.length, 2);
  assert.equal(new Set(roots).size, 2);
  assert.ok(roots.every((root) => !existsSync(root)));
  assert.equal(readFileSync(outsideMarker, "utf8"), "preserve\n");
  assert.equal(JSON.stringify(summary).includes(fixture.root), false);
});

test("ambient then ambient runs exactly twice and fails retryable/inconclusive", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const roots = [];
  let observedError;

  assert.throws(
    () =>
      runIsolatedReleaseLifecycle({
        repositoryRoot,
        requireMarketplace: false,
        inheritedEnvironment: fixture.environment,
        temporaryParent: fixture.temporaryParent,
        attemptLifecycle({ attempt, plan }) {
          roots.push(plan.approvedTemporaryRoot);
          writeFileSync(
            fixture.npmUserconfig,
            `registry=https://example-${attempt}.invalid/\n`,
            "utf8",
          );
          return fakeLifecycleSummary(attempt);
        },
      }),
    (error) => {
      observedError = error;
      return error?.code === ISOLATION_ERROR_CODES.AMBIENT_STATE_CHANGED;
    },
  );

  assert.equal(observedError.retryable, true);
  assert.equal(observedError.inconclusive, true);
  assert.equal(observedError.isolation.attempts, 2);
  assert.deepEqual(
    observedError.isolation.history.map(({ status }) => status),
    [
      ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED,
      ISOLATION_OUTCOMES.AMBIENT_STATE_CHANGED,
    ],
  );
  assert.equal(roots.length, 2);
  assert.equal(new Set(roots).size, 2);
  assert.ok(roots.every((root) => !existsSync(root)));
  const failureOutput = formatIsolationFailure(observedError);
  assert.match(failureOutput, /^AMBIENT_STATE_CHANGED:/);
  assert.match(failureOutput, /"retryable": true/);
  assert.match(failureOutput, /"inconclusive": true/);
  assert.equal(failureOutput.includes(fixture.root), false);
});

test("a first isolation violation receives no retry", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const roots = [];
  let observedError;

  assert.throws(
    () =>
      runIsolatedReleaseLifecycle({
        repositoryRoot,
        requireMarketplace: false,
        inheritedEnvironment: fixture.environment,
        temporaryParent: fixture.temporaryParent,
        attemptLifecycle({ attempt, plan }) {
          roots.push(plan.approvedTemporaryRoot);
          writeFixtureFile(
            fixture.normalAgentsRoot,
            "skills/kyw-init/SKILL.md",
            `managed attempt ${attempt}\n`,
          );
          return fakeLifecycleSummary(attempt);
        },
      }),
    (error) => {
      observedError = error;
      return error?.code === ISOLATION_ERROR_CODES.ISOLATION_VIOLATION;
    },
  );

  assert.equal(observedError.isolation.attempts, 1);
  assert.equal(observedError.retryable, false);
  assert.equal(roots.length, 1);
  assert.equal(existsSync(roots[0]), false);
});

test("runner-observed parent environment mutation is a one-attempt violation", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const prior = process.env.TMPDIR;
  let calls = 0;
  let observedError;

  try {
    assert.throws(
      () =>
        runIsolatedReleaseLifecycle({
          repositoryRoot,
          requireMarketplace: false,
          inheritedEnvironment: fixture.environment,
          temporaryParent: fixture.temporaryParent,
          attemptLifecycle({ attempt }) {
            calls += 1;
            process.env.TMPDIR = "synthetic-runner-mutation";
            return fakeLifecycleSummary(attempt);
          },
        }),
      (error) => {
        observedError = error;
        return error?.code === ISOLATION_ERROR_CODES.ISOLATION_VIOLATION;
      },
    );
  } finally {
    if (prior === undefined) {
      delete process.env.TMPDIR;
    } else {
      process.env.TMPDIR = prior;
    }
  }

  assert.equal(calls, 1);
  assert.equal(observedError.isolation.attempts, 1);
  assert.ok(
    observedError.isolation.history[0].differences.some(
      ({ protectedLocation, relativePath }) =>
        protectedLocation === "parent-environment" && relativePath === "TMPDIR",
    ),
  );
  assert.equal(formatIsolationFailure(observedError).includes("synthetic-runner-mutation"), false);
});

test("child, package, marketplace, snapshot, and cleanup failures never retry", async (t) => {
  for (const code of [
    ISOLATION_ERROR_CODES.CHILD_FAILED,
    ISOLATION_ERROR_CODES.PACKAGE_INVALID,
    ISOLATION_ERROR_CODES.MARKETPLACE_UNAVAILABLE,
    ISOLATION_ERROR_CODES.NORMAL_STATE_SNAPSHOT_FAILED,
    ISOLATION_ERROR_CODES.CLEANUP_GUARD,
  ]) {
    await t.test(code, (t) => {
      const fixture = createSyntheticProtectedFixture(t);
      const roots = [];
      let calls = 0;
      let observedError;
      assert.throws(
        () =>
          runIsolatedReleaseLifecycle({
            repositoryRoot,
            requireMarketplace: false,
            inheritedEnvironment: fixture.environment,
            temporaryParent: fixture.temporaryParent,
            attemptLifecycle({ plan }) {
              calls += 1;
              roots.push(plan.approvedTemporaryRoot);
              throw new ReleaseGateIsolationError(code, `synthetic ${code}`);
            },
          }),
        (error) => {
          observedError = error;
          return error?.code === code;
        },
      );
      assert.equal(calls, 1);
      assert.equal(observedError.attempts, 1);
      assert.equal(roots.length, 1);
      assert.equal(existsSync(roots[0]), false);
    });
  }
});

test("Windows path guards are case-insensitive and normalize both separator forms", () => {
  const options = { platform: "win32", pathApi: path.win32 };
  assert.equal(
    isSameOrDescendant("C:\\Users\\Ada\\.agents", "c:/USERS/ADA/.AGENTS/skills", options),
    true,
  );
  assert.equal(
    isSameOrDescendant("C:/Users/Ada/.codex", "c:\\users\\ada\\.CODEX", options),
    true,
  );
  assert.equal(
    isSameOrDescendant("C:\\Users\\Ada\\.npmrc", "c:/users/ada/.npmrc/cache", options),
    true,
  );
  assert.equal(
    isSameOrDescendant("C:\\Users\\Ada\\.agents", "C:\\Users\\Ada\\.agents-old", options),
    false,
  );
});

test("intentional synthetic normal-path collisions fail before any child process", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const normalAgents = fixture.protectedLocations.entries.find(
    (entry) => entry.label === "normal-agents",
  );
  const normalCodex = fixture.protectedLocations.entries.find(
    (entry) => entry.label === "normal-codex",
  );
  const npmUserconfig = fixture.protectedLocations.entries.find((entry) =>
    entry.label.endsWith("npm-userconfig"),
  );
  assert.ok(normalAgents);
  assert.ok(normalCodex);
  assert.ok(npmUserconfig);
  const before = snapshotFixture(fixture);
  const windowsAgentsAlias =
    process.platform === "win32"
      ? normalAgents.path.toUpperCase().replaceAll("\\", "/")
      : normalAgents.path;

  for (const targetOverrides of [
    { isolatedUserAgentsRoot: windowsAgentsAlias },
    { isolatedCodexRoot: join(normalCodex.path, "release-gate-child") },
    { isolatedNpmUserconfig: npmUserconfig.path },
  ]) {
    let lifecycleCalls = 0;
    let observedError;
    assert.throws(
      () =>
        runIsolatedReleaseLifecycle({
          repositoryRoot,
          requireMarketplace: false,
          inheritedEnvironment: fixture.environment,
          temporaryParent: fixture.temporaryParent,
          targetOverrides,
          attemptLifecycle() {
            lifecycleCalls += 1;
            return fakeLifecycleSummary(1);
          },
        }),
      (error) => {
        observedError = error;
        return (
          error?.code === ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD &&
          /collides with protected/.test(error.message)
        );
      },
    );
    assert.equal(lifecycleCalls, 0);
    assert.equal(observedError.attempts, 1);
  }

  const classification = classifyProtectedState(before, snapshotFixture(fixture));
  assert.equal(classification.status, ISOLATION_OUTCOMES.CLEAN);
});

test("isolated environment values exist only in the child environment", () => {
  const isolatedBase = path.resolve(tmpdir(), "kyw-dev-release-gate-environment-fixture");
  const plan = {
    isolatedUserRoot: join(isolatedBase, "user"),
    isolatedCodexRoot: join(isolatedBase, "codex"),
    isolatedNpmUserconfig: join(isolatedBase, "npm", "userconfig"),
    isolatedNpmCache: join(isolatedBase, "npm", "cache"),
    isolatedProcessTempRoot: join(isolatedBase, "temp"),
    isolatedXdgConfigRoot: join(isolatedBase, "xdg-config"),
    isolatedXdgCacheRoot: join(isolatedBase, "xdg-cache"),
  };
  const parentBefore = relevantEnvironment(process.env);
  const inherited = {
    ...process.env,
    HOME: "normal-home-must-not-survive",
    CoDeX_HoMe: "normal-codex-must-not-survive",
    NPM_CONFIG_USERCONFIG: "normal-npmrc-must-not-survive",
  };
  const child = createIsolatedChildEnvironment(plan, inherited);

  assert.equal(child.HOME, plan.isolatedUserRoot);
  assert.equal(child.USERPROFILE, plan.isolatedUserRoot);
  assert.equal(child.CODEX_HOME, plan.isolatedCodexRoot);
  assert.equal(child.npm_config_userconfig, plan.isolatedNpmUserconfig);
  assert.equal(child.npm_config_cache, plan.isolatedNpmCache);
  assert.equal(child.TEMP, plan.isolatedProcessTempRoot);
  assert.equal(child.TMP, plan.isolatedProcessTempRoot);
  assert.equal(child.TMPDIR, plan.isolatedProcessTempRoot);
  assert.equal(child.XDG_CONFIG_HOME, plan.isolatedXdgConfigRoot);
  assert.equal(child.XDG_CACHE_HOME, plan.isolatedXdgCacheRoot);
  for (const protectedName of [
    "home",
    "userprofile",
    "codex_home",
    "npm_config_userconfig",
    "npm_config_cache",
  ]) {
    assert.equal(
      Object.keys(child).filter((name) => name.toLowerCase() === protectedName).length,
      1,
      `child has a duplicate case-variant environment key: ${protectedName}`,
    );
  }
  assert.deepEqual(relevantEnvironment(process.env), parentBefore);
});

test("changed protected state throws its attributed ambient code", (t) => {
  const fixture = createSyntheticProtectedFixture(t);
  const before = snapshotFixture(fixture);
  writeFixtureFile(fixture.normalAgentsRoot, "unrelated.txt", "ambient\n");
  const after = snapshotFixture(fixture);
  expectIsolationError(
    () => assertProtectedStateUnchanged(before, after),
    ISOLATION_ERROR_CODES.AMBIENT_STATE_CHANGED,
  );
});

test("cleanup rejects a broad target and removes only an identity-approved exact root", () => {
  const temporaryParent = realpathSync(tmpdir());
  const broadState = lstatSync(temporaryParent, { bigint: true });
  expectIsolationError(
    () =>
      removeApprovedTemporaryRoot({
        approvedTemporaryRoot: temporaryParent,
        approvedTemporaryParent: dirname(temporaryParent),
        rootIdentity: {
          dev: String(broadState.dev),
          ino: String(broadState.ino),
          birthtimeNs: String(broadState.birthtimeNs),
        },
      }),
    ISOLATION_ERROR_CODES.CLEANUP_GUARD,
  );
  assert.equal(existsSync(temporaryParent), true);

  const approvedTemporaryRoot = mkdtempSync(join(temporaryParent, "kyw-dev-release-gate-"));
  writeFileSync(join(approvedTemporaryRoot, "owned.txt"), "owned\n", "utf8");
  const approvedState = lstatSync(approvedTemporaryRoot, { bigint: true });
  const result = removeApprovedTemporaryRoot({
    approvedTemporaryRoot,
    approvedTemporaryParent: temporaryParent,
    rootIdentity: {
      dev: String(approvedState.dev),
      ino: String(approvedState.ino),
      birthtimeNs: String(approvedState.birthtimeNs),
    },
  });
  assert.deepEqual(result, { removed: true, alreadyAbsent: false });
  assert.equal(existsSync(approvedTemporaryRoot), false);
});

test("runner source remains development-only with exact outcome and dependency boundaries", () => {
  const source = readFileSync(runnerSource, "utf8");
  assert.match(source, /\bisolatedUserRoot\b/);
  assert.match(source, /\bisolatedCodexRoot\b/);
  assert.match(source, /\bisolatedNpmRoot\b/);
  assert.doesNotMatch(source, /(?:const|let|var)\s+\$(?:home|HOME|CODEX_HOME)\b/);
  assert.doesNotMatch(source, /\$(?:home|HOME|CODEX_HOME)\s*=/);
  assert.doesNotMatch(source, /NORMAL_STATE_CHANGED\s*:/);
  for (const outcome of Object.values(ISOLATION_OUTCOMES)) {
    assert.match(source, new RegExp(`\\b${outcome}\\b`));
  }
  const packageJson = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal("dependencies" in packageJson, false);
  assert.equal("devDependencies" in packageJson, false);
  assert.equal(packageJson.files.includes("scripts/"), false);
});
