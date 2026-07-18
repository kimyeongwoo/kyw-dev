import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path, { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ISOLATION_ERROR_CODES,
  assertProtectedStateUnchanged,
  createIsolatedChildEnvironment,
  isSameOrDescendant,
  removeApprovedTemporaryRoot,
  resolveProtectedLocations,
  runIsolatedReleaseLifecycle,
  snapshotProtectedState,
} from "../scripts/release-gate-isolation.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const runnerSource = fileURLToPath(new URL("../scripts/release-gate-isolation.mjs", import.meta.url));

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

test("intentional normal-path collisions fail before any child process starts", () => {
  const protectedLocations = resolveProtectedLocations();
  const normalAgents = protectedLocations.entries.find((entry) => entry.label === "normal-agents");
  const normalCodex = protectedLocations.entries.find((entry) => entry.label === "normal-codex");
  const npmUserconfig = protectedLocations.entries.find((entry) =>
    entry.label.endsWith("npm-userconfig"),
  );
  assert.ok(normalAgents);
  assert.ok(normalCodex);
  assert.ok(npmUserconfig);
  const before = snapshotProtectedState(protectedLocations);
  const windowsAgentsAlias =
    process.platform === "win32"
      ? normalAgents.path.toUpperCase().replaceAll("\\", "/")
      : normalAgents.path;

  for (const targetOverrides of [
    { isolatedUserAgentsRoot: windowsAgentsAlias },
    { isolatedCodexRoot: join(normalCodex.path, "release-gate-child") },
    { isolatedNpmUserconfig: npmUserconfig.path },
  ]) {
    let childCalls = 0;
    assert.throws(
      () =>
        runIsolatedReleaseLifecycle({
          repositoryRoot,
          spawnProcess() {
            childCalls += 1;
            return { status: 0, stdout: "", stderr: "" };
          },
          targetOverrides,
        }),
      (error) =>
        error?.code === ISOLATION_ERROR_CODES.ISOLATION_PATH_GUARD &&
        /collides with protected/.test(error.message),
    );
    assert.equal(childCalls, 0);
  }

  const after = snapshotProtectedState(protectedLocations);
  assertProtectedStateUnchanged(before, after);
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
  for (const protectedName of ["home", "userprofile", "codex_home", "npm_config_userconfig", "npm_config_cache"]) {
    assert.equal(
      Object.keys(child).filter((name) => name.toLowerCase() === protectedName).length,
      1,
      `child has a duplicate case-variant environment key: ${protectedName}`,
    );
  }
  assert.deepEqual(relevantEnvironment(process.env), parentBefore);
});

test("normal sentinel mismatch fails even when product work otherwise succeeded", () => {
  const before = [{ label: "normal-agents", state: "present", entryCount: 2, sha256: "a".repeat(64) }];
  const after = [{ label: "normal-agents", state: "present", entryCount: 2, sha256: "b".repeat(64) }];
  expectIsolationError(
    () => assertProtectedStateUnchanged(before, after),
    ISOLATION_ERROR_CODES.NORMAL_STATE_CHANGED,
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

test("runner source uses collision-resistant local names and remains development-only", () => {
  const source = readFileSync(runnerSource, "utf8");
  assert.match(source, /\bisolatedUserRoot\b/);
  assert.match(source, /\bisolatedCodexRoot\b/);
  assert.match(source, /\bisolatedNpmRoot\b/);
  assert.doesNotMatch(source, /(?:const|let|var)\s+\$(?:home|HOME|CODEX_HOME)\b/);
  assert.doesNotMatch(source, /\$(?:home|HOME|CODEX_HOME)\s*=/);
  const packageJson = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal("dependencies" in packageJson, false);
  assert.equal("devDependencies" in packageJson, false);
  assert.equal(packageJson.files.includes("scripts/"), false);
});
