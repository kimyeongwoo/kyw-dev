import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RETAINED_CANDIDATE_SCHEMA_VERSION,
  assertOwnedCandidateRoot,
  assertPackedHygiene,
  cleanupPackedReleaseCandidate,
  createPackedReleaseCandidate,
  parsePackReport,
  prepareCandidateRoot,
} from "../scripts/packed-release-check.mjs";
import {
  EXPECTED_TARBALL_FILES,
  RELEASE_METADATA,
} from "../scripts/lib/validate-foundation.mjs";
import {
  ISOLATION_OUTCOMES,
  runIsolatedReleaseLifecycle,
} from "../scripts/release-gate-isolation.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const packedReleaseScript = fileURLToPath(
  new URL("../scripts/packed-release-check.mjs", import.meta.url),
);
const marketplaceFixtureRoot = join(
  repositoryRoot,
  "test",
  "fixtures",
  "distribution",
  "marketplace-root",
);
const managedSkillNames = [
  "kyw-audit",
  "kyw-grilling",
  "kyw-impl",
  "kyw-init",
  "kyw-task",
];
const forbiddenLifecycleScripts = [
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepack",
  "postpack",
  "prepublish",
  "prepublishOnly",
  "publish",
  "postpublish",
];

function syntheticProtectedFixture(t) {
  const root = mkdtempSync(join(tmpdir(), "kyw-dev-distribution-protected-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const normalUserRoot = join(root, "normal-user");
  const normalCodexRoot = join(normalUserRoot, ".codex");
  const normalAgentsRoot = join(normalUserRoot, ".agents");
  const npmUserconfig = join(normalUserRoot, ".npmrc");
  const temporaryParent = join(root, "lifecycle-attempts");
  mkdirSync(join(normalAgentsRoot, "skills", "unrelated-skill"), { recursive: true });
  mkdirSync(join(normalCodexRoot, "sessions"), { recursive: true });
  mkdirSync(temporaryParent);
  writeFileSync(
    join(normalAgentsRoot, "skills", "unrelated-skill", "SKILL.md"),
    "name: unrelated-skill\n",
  );
  writeFileSync(join(normalCodexRoot, "config.toml"), 'model = "synthetic"\n');
  writeFileSync(
    join(normalCodexRoot, "sessions", "fixture.jsonl"),
    '{"synthetic":"session payload"}\n',
  );
  writeFileSync(npmUserconfig, "registry=https://registry.npmjs.org/\n");
  return {
    root,
    normalUserRoot,
    normalCodexRoot,
    npmUserconfig,
    temporaryParent,
    environment: {
      ...process.env,
      HOME: normalUserRoot,
      USERPROFILE: normalUserRoot,
      CODEX_HOME: normalCodexRoot,
      npm_config_userconfig: npmUserconfig,
    },
  };
}

function fixtureTreeSha256(root) {
  const digest = createHash("sha256");
  function visit(directory, relativePath = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const entryPath = join(directory, entry.name);
      const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      digest.update(`${entry.isDirectory() ? "directory" : "file"}\0${childRelativePath}\0`);
      if (entry.isDirectory()) {
        visit(entryPath, childRelativePath);
      } else {
        digest.update(readFileSync(entryPath));
        digest.update("\0");
      }
    }
  }
  visit(root);
  return digest.digest("hex");
}

test("release metadata is public-ready while publication remains an explicit command", () => {
  const packageJson = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
  const pluginJson = JSON.parse(
    readFileSync(join(repositoryRoot, ".codex-plugin", "plugin.json"), "utf8"),
  );
  const marketplaceJson = JSON.parse(
    readFileSync(
      join(marketplaceFixtureRoot, ".agents", "plugins", "marketplace.json"),
      "utf8",
    ),
  );

  assert.equal(packageJson.private, false);
  assert.equal(packageJson.name, RELEASE_METADATA.name);
  assert.equal(packageJson.version, RELEASE_METADATA.version);
  assert.equal(packageJson.author.name, RELEASE_METADATA.authorName);
  assert.equal(packageJson.homepage, RELEASE_METADATA.homepage);
  assert.deepEqual(packageJson.repository, {
    type: "git",
    url: RELEASE_METADATA.repositoryGitUrl,
  });
  assert.deepEqual(packageJson.bugs, { url: RELEASE_METADATA.issuesUrl });
  assert.equal(packageJson.engines.node, RELEASE_METADATA.nodeRange);
  assert.equal("maintainers" in packageJson, false);
  assert.equal(packageJson.bin["kyw-dev"], "bin/kyw-dev.mjs");
  assert.match(
    readFileSync(join(repositoryRoot, packageJson.bin["kyw-dev"]), "utf8"),
    /^#!\/usr\/bin\/env node\r?\n/,
  );
  assert.deepEqual(packageJson.publishConfig, {
    access: "public",
    registry: "https://registry.npmjs.org/",
  });
  assert.equal(
    packageJson.scripts["release:candidate"],
    "node ./scripts/packed-release-check.mjs",
  );
  assert.equal(
    packageJson.scripts["release:ci"],
    "npm run check && npm run release:candidate",
  );
  assert.equal(
    packageJson.scripts["release:check"],
    "npm run release:ci && npm publish --dry-run --json",
  );
  for (const scriptName of forbiddenLifecycleScripts) {
    assert.equal(scriptName in packageJson.scripts, false);
  }
  assert.equal(pluginJson.name, packageJson.name);
  assert.equal(pluginJson.version, packageJson.version);
  assert.equal(pluginJson.author.name, packageJson.author.name);
  assert.equal(pluginJson.homepage, packageJson.homepage);
  assert.equal(pluginJson.repository, RELEASE_METADATA.repositoryWebUrl);
  assert.deepEqual(pluginJson.keywords, packageJson.keywords);
  assert.equal(pluginJson.interface.developerName, packageJson.author.name);
  assert.equal(pluginJson.interface.websiteURL, RELEASE_METADATA.repositoryWebUrl);
  assert.deepEqual(pluginJson.interface.capabilities, ["Interactive", "Write"]);
  assert.equal(pluginJson.interface.defaultPrompt.length, 4);
  assert.match(
    pluginJson.interface.defaultPrompt[2],
    /\$kyw-impl 0001.*execute an existing Task/,
  );
  assert.match(
    pluginJson.interface.defaultPrompt[3],
    /\$kyw-audit 0001.*without modifying the repository/,
  );
  assert.equal(marketplaceJson.plugins[0].source.path, "./plugins/kyw-dev");
  assert.deepEqual(marketplaceJson.plugins[0].policy, {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL",
  });
});

test("retained candidate mode returns one exact archive and cleans only its owned root", (t) => {
  const retained = spawnSync(process.execPath, [packedReleaseScript, "--retain-candidate"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.equal(retained.status, 0, retained.stderr);
  assert.equal(retained.stderr, "");
  const candidate = JSON.parse(retained.stdout);
  t.after(() => {
    if (existsSync(candidate.ownedRoot)) {
      cleanupPackedReleaseCandidate(candidate.ownedRoot);
    }
  });

  assert.equal(candidate.schemaVersion, RETAINED_CANDIDATE_SCHEMA_VERSION);
  assert.equal(candidate.kind, "KYW_PACKED_RELEASE_CANDIDATE");
  assert.equal(candidate.retained, true);
  assert.equal(candidate.name, RELEASE_METADATA.name);
  assert.equal(candidate.version, RELEASE_METADATA.version);
  assert.equal(
    candidate.filename,
    `${RELEASE_METADATA.name}-${RELEASE_METADATA.version}.tgz`,
  );
  assert.equal(candidate.fileCount, EXPECTED_TARBALL_FILES.length);
  assert.equal(candidate.size, readFileSync(candidate.archivePath).length);
  assert.equal(isAbsolute(candidate.ownedRoot), true);
  assert.equal(isAbsolute(candidate.archivePath), true);
  assert.equal(dirname(candidate.archivePath), join(candidate.ownedRoot, "pack"));
  assert.match(candidate.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
  assert.match(candidate.shasum, /^[a-f0-9]{40}$/);
  assert.match(candidate.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(readdirSync(candidate.ownedRoot), ["pack"]);
  assert.deepEqual(readdirSync(join(candidate.ownedRoot, "pack")), [candidate.filename]);
  assert.equal(
    assertOwnedCandidateRoot(candidate.ownedRoot, {
      requireRetainedStructure: true,
    }),
    candidate.ownedRoot,
  );

  const cleanup = spawnSync(
    process.execPath,
    [packedReleaseScript, "--cleanup-candidate", candidate.ownedRoot],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(cleanup.status, 0, cleanup.stderr);
  assert.deepEqual(JSON.parse(cleanup.stdout), {
    schemaVersion: RETAINED_CANDIDATE_SCHEMA_VERSION,
    kind: "KYW_PACKED_RELEASE_CANDIDATE_CLEANUP",
    cleaned: true,
  });
  assert.equal(existsSync(candidate.ownedRoot), false);
});

test("candidate root, pack report, hygiene, collision, and cleanup guards fail closed", (t) => {
  const temporaryParent = mkdtempSync(join(tmpdir(), "kyw-dev-candidate-guards-"));
  t.after(() => rmSync(temporaryParent, { recursive: true, force: true }));

  assert.throws(
    () =>
      prepareCandidateRoot({
        temporaryParent,
        candidateRoot: "relative-candidate",
      }),
    /absolute path/,
  );
  assert.throws(
    () =>
      prepareCandidateRoot({
        temporaryParent,
        candidateRoot: join(tmpdir(), "kyw-dev-packed-release-outside"),
      }),
    /direct child/,
  );
  assert.throws(
    () => prepareCandidateRoot({ temporaryParent: repositoryRoot }),
    /system temporary root|overlap the repository/,
  );

  const collisionRoot = join(
    temporaryParent,
    "kyw-dev-packed-release-collision",
  );
  mkdirSync(collisionRoot);
  assert.throws(
    () => prepareCandidateRoot({ temporaryParent, candidateRoot: collisionRoot }),
    /already exists/,
  );
  assert.throws(
    () =>
      assertOwnedCandidateRoot(
        join(temporaryParent, "kyw-dev-packed-release-missing"),
        { temporaryParent },
      ),
    /does not exist/,
  );
  assert.throws(
    () => cleanupPackedReleaseCandidate(collisionRoot, { temporaryParent }),
    /unexpected structure/,
  );

  const aliasFixture = mkdtempSync(join(tmpdir(), "kyw-dev-candidate-alias-"));
  t.after(() => rmSync(aliasFixture, { recursive: true, force: true }));
  const physicalAncestor = join(aliasFixture, "physical");
  const physicalParent = join(physicalAncestor, "parent");
  const aliasAncestor = join(aliasFixture, "alias");
  mkdirSync(physicalParent, { recursive: true });
  symlinkSync(
    physicalAncestor,
    aliasAncestor,
    process.platform === "win32" ? "junction" : "dir",
  );
  const aliasParent = join(aliasAncestor, "parent");
  const aliasCandidate = join(
    aliasParent,
    "kyw-dev-packed-release-physical-parent",
  );
  const physicalCandidate = join(
    physicalParent,
    "kyw-dev-packed-release-physical-parent",
  );
  const preparedCandidate = prepareCandidateRoot({
    temporaryParent: aliasParent,
    candidateRoot: aliasCandidate,
  });
  assert.equal(preparedCandidate, realpathSync(physicalCandidate));
  assert.equal(realpathSync(aliasCandidate), preparedCandidate);
  assert.deepEqual(readdirSync(physicalParent), [
    "kyw-dev-packed-release-physical-parent",
  ]);
  assert.throws(
    () =>
      prepareCandidateRoot({
        temporaryParent: aliasParent,
        candidateRoot: aliasCandidate,
    }),
    /already exists/,
  );
  assert.deepEqual(readdirSync(physicalParent), [
    "kyw-dev-packed-release-physical-parent",
  ]);

  for (const malformed of [
    "",
    "{}",
    "[]",
    '[{"filename":"candidate.tgz"}]',
    '[{"filename":"candidate.tgz","files":"not-an-array"}]',
  ]) {
    assert.throws(() => parsePackReport(malformed), /npm pack/);
  }

  const forbiddenRoot = join(temporaryParent, "forbidden-package");
  mkdirSync(forbiddenRoot);
  writeFileSync(join(forbiddenRoot, ".npmrc"), "registry=https://example.invalid/\n");
  assert.throws(() => assertPackedHygiene(forbiddenRoot), /forbidden path/);

  const credentialRoot = join(temporaryParent, "credential-package");
  mkdirSync(credentialRoot);
  writeFileSync(
    join(credentialRoot, "README.md"),
    `synthetic npm_${"a".repeat(24)}\n`,
  );
  assert.throws(() => assertPackedHygiene(credentialRoot), /credential-shaped token/);

  let malformedOwnedRoot;
  assert.throws(
    () =>
      createPackedReleaseCandidate({
        temporaryParent,
        packRunner(packDirectory) {
          malformedOwnedRoot = dirname(packDirectory);
          return { status: 0, stdout: "{}", stderr: "" };
        },
      }),
    /unexpected report shape/,
  );
  assert.equal(existsSync(malformedOwnedRoot), false);
});

test("disposable candidate behavior still removes its verified temporary root", (t) => {
  const temporaryParent = mkdtempSync(join(tmpdir(), "kyw-dev-candidate-disposable-"));
  t.after(() => rmSync(temporaryParent, { recursive: true, force: true }));
  const candidate = createPackedReleaseCandidate({ temporaryParent });
  assert.equal(candidate.retained, false);
  assert.equal(candidate.fileCount, EXPECTED_TARBALL_FILES.length);
  assert.equal(existsSync(candidate.ownedRoot), false);
  assert.deepEqual(readdirSync(temporaryParent), []);
});

test("actual tarball passes the fail-closed isolated direct and marketplace lifecycles", (t) => {
  const fixture = syntheticProtectedFixture(t);
  const protectedBefore = fixtureTreeSha256(fixture.normalUserRoot);
  const summary = runIsolatedReleaseLifecycle({
    repositoryRoot,
    requireMarketplace: false,
    inheritedEnvironment: fixture.environment,
    temporaryParent: fixture.temporaryParent,
  });

  assert.equal(summary.isolation.status, ISOLATION_OUTCOMES.CLEAN);
  assert.equal(summary.isolation.attempts, 1);
  assert.deepEqual(
    summary.isolation.history.map(({ status }) => status),
    [ISOLATION_OUTCOMES.CLEAN],
  );
  assert.equal(summary.tarball.fileCount, EXPECTED_TARBALL_FILES.length);
  assert.equal(
    summary.tarball.filename,
    `${RELEASE_METADATA.name}-${RELEASE_METADATA.version}.tgz`,
  );
  assert.match(summary.tarball.sha256, /^[a-f0-9]{64}$/);
  assert.equal(summary.pathGuard.targetCount >= 15, true);
  assert.equal(summary.pathGuard.approvedRootRemoved, true);
  assert.equal(summary.environment.childOnly, true);
  assert.equal(summary.environment.parentUnchanged, true);
  assert.deepEqual(summary.sentinels.after, summary.sentinels.before);
  assert.equal(summary.sentinels.unchanged, true);
  assert.equal(summary.cleanup.removed, true);
  assert.equal(fixtureTreeSha256(fixture.normalUserRoot), protectedBefore);
  assert.deepEqual(readdirSync(fixture.temporaryParent), []);
  assert.equal(JSON.stringify(summary).includes(fixture.normalUserRoot), false);

  assert.deepEqual(
    summary.direct.steps.map(({ label, status }) => [label, status]),
    [
      ["user install", 0],
      ["user update", 0],
      ["user doctor", 0],
      ["user normal uninstall", 0],
      ["project install", 0],
      ["project update", 0],
      ["project doctor", 0],
      ["project normal uninstall", 0],
      ["force fixture install", 0],
      ["user preservation refusal", 4],
      ["user force uninstall", 0],
    ],
  );
  assert.match(summary.direct.preserved.unknownSha256, /^[a-f0-9]{64}$/);
  assert.match(summary.direct.preserved.unrelatedSha256, /^[a-f0-9]{64}$/);

  if (summary.marketplace.status === "unavailable") {
    t.diagnostic("Codex CLI unavailable; guarded direct tarball lifecycle still passed");
  } else {
    assert.equal(summary.marketplace.status, "passed");
    assert.deepEqual(summary.marketplace.skills, managedSkillNames);
    assert.deepEqual(
      summary.marketplace.steps.map(({ label, status }) => [label, status]),
      [
        ["marketplace add", 0],
        ["marketplace plugin discovery", 0],
        ["plugin install", 0],
        ["installed plugin list", 0],
        ["plugin remove", 0],
        ["marketplace remove", 0],
      ],
    );
  }
});
