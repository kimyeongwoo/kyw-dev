import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_TARBALL_FILES,
  RELEASE_METADATA,
} from "../scripts/lib/validate-foundation.mjs";
import {
  ISOLATION_OUTCOMES,
  runIsolatedReleaseLifecycle,
} from "../scripts/release-gate-isolation.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const marketplaceFixtureRoot = join(
  repositoryRoot,
  "test",
  "fixtures",
  "distribution",
  "marketplace-root",
);
const managedSkillNames = ["kyw-audit", "kyw-grilling", "kyw-init", "kyw-task"];
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
    packageJson.scripts["release:ci"],
    "npm run check && node ./scripts/packed-release-check.mjs",
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
  assert.equal(pluginJson.interface.defaultPrompt.length, 3);
  assert.match(
    pluginJson.interface.defaultPrompt[2],
    /\$kyw-audit 0001.*without modifying the repository/,
  );
  assert.equal(marketplaceJson.plugins[0].source.path, "./plugins/kyw-dev");
  assert.deepEqual(marketplaceJson.plugins[0].policy, {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL",
  });
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
  assert.match(summary.tarball.filename, /^kyw-dev-0\.1\.0\.tgz$/);
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
