import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_TARBALL_FILES,
  RELEASE_METADATA,
} from "../scripts/lib/validate-foundation.mjs";
import { runIsolatedReleaseLifecycle } from "../scripts/release-gate-isolation.mjs";

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
  const summary = runIsolatedReleaseLifecycle({ repositoryRoot, requireMarketplace: false });

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
