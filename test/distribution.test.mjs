import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path, { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { EXPECTED_TARBALL_FILES } from "../scripts/lib/validate-foundation.mjs";

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

function temporaryDirectory(t, prefix) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function runNpmPack(destination) {
  const npmExecutable = process.env.npm_execpath;
  if (npmExecutable) {
    return spawnSync(
      process.execPath,
      [npmExecutable, "pack", "--json", "--pack-destination", destination],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
  }
  if (process.platform === "win32") {
    return spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", "npm", "pack", "--json", "--pack-destination", destination],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
  }
  return spawnSync("npm", ["pack", "--json", "--pack-destination", destination], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

function runCodex(args, options = {}) {
  const spawnOptions = { encoding: "utf8", ...options };
  if (process.platform === "win32") {
    return spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", "codex", ...args],
      spawnOptions,
    );
  }
  return spawnSync("codex", args, spawnOptions);
}

function assertSucceeded(result, label) {
  assert.equal(
    result.status,
    0,
    `${label} failed\nstdout:\n${result.stdout ?? ""}\nstderr:\n${result.stderr ?? result.error?.message ?? ""}`,
  );
}

function collectFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }
  visit(root);
  return files;
}

function packAndExtract(t) {
  const root = temporaryDirectory(t, "kyw-dev-distribution-");
  const packed = runNpmPack(root);
  assertSucceeded(packed, "npm pack");
  const report = JSON.parse(packed.stdout)[0];
  const extractRoot = join(root, "extract");
  mkdirSync(extractRoot);
  const extracted = spawnSync("tar", ["-xf", join(root, report.filename), "-C", extractRoot], {
    encoding: "utf8",
  });
  assertSucceeded(extracted, "tar extraction");
  return { root, report, packageRoot: join(extractRoot, "package") };
}

function runPackedCli(packageRoot, args, options) {
  return spawnSync(process.execPath, [join(packageRoot, "bin", "kyw-dev.mjs"), ...args], {
    encoding: "utf8",
    ...options,
  });
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
  assert.deepEqual(pluginJson.interface.capabilities, ["Interactive", "Write"]);
  assert.equal(pluginJson.interface.defaultPrompt.length, 3);
  assert.equal(marketplaceJson.plugins[0].source.path, "./plugins/kyw-dev");
  assert.deepEqual(marketplaceJson.plugins[0].policy, {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL",
  });
});

test("actual tarball passes direct and isolated Codex marketplace lifecycles", (t) => {
  const { root, report, packageRoot } = packAndExtract(t);
  assert.deepEqual(
    report.files.map(({ path: filePath }) => filePath).sort(),
    [...EXPECTED_TARBALL_FILES].sort(),
  );
  assert.ok(existsSync(join(packageRoot, "LICENSE")));
  assert.ok(existsSync(join(packageRoot, "THIRD_PARTY_NOTICES.md")));
  assert.ok(existsSync(join(packageRoot, "licenses", "mattpocock-skills-MIT.txt")));

  const packedFiles = collectFiles(packageRoot);
  const secretPattern = /\b(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|npm_[A-Za-z0-9]{20,})\b/;
  for (const filePath of packedFiles) {
    if (!/\.(?:json|md|mjs|txt|yaml|yml)$/.test(filePath) && path.basename(filePath) !== "LICENSE") {
      continue;
    }
    const contents = readFileSync(filePath, "utf8");
    assert.equal(contents.includes(repositoryRoot), false, `packed file exposes source path: ${filePath}`);
    assert.equal(secretPattern.test(contents), false, `packed file resembles a secret: ${filePath}`);
  }

  const home = join(root, "home");
  const work = join(root, "work");
  mkdirSync(home);
  mkdirSync(work);
  const directEnv = { ...process.env, HOME: home, USERPROFILE: home };
  for (const [label, args] of [
    ["user install", ["install", "--scope", "user"]],
    ["user update", ["update", "--scope", "user"]],
    ["user doctor", ["doctor"]],
    ["user uninstall", ["uninstall", "--scope", "user"]],
  ]) {
    assertSucceeded(runPackedCli(packageRoot, args, { cwd: work, env: directEnv }), label);
  }
  assert.equal(existsSync(join(home, ".agents", "skills", ".kyw-dev-install.json")), false);

  const project = join(root, "project");
  const nested = join(project, "packages", "api");
  mkdirSync(join(project, ".git"), { recursive: true });
  mkdirSync(nested, { recursive: true });
  for (const [label, args] of [
    ["project install", ["install", "--scope", "project"]],
    ["project update", ["update", "--scope", "project"]],
    ["project doctor", ["doctor"]],
    ["project uninstall", ["uninstall", "--scope", "project"]],
  ]) {
    assertSucceeded(runPackedCli(packageRoot, args, { cwd: nested, env: directEnv }), label);
  }
  for (const documentPath of ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"]) {
    assert.equal(existsSync(join(project, ...documentPath.split("/"))), false);
  }

  const codexVersion = runCodex(["--version"]);
  if (codexVersion.status !== 0) {
    t.skip(`Codex CLI is unavailable: ${codexVersion.error?.message ?? codexVersion.stderr}`);
    return;
  }

  const marketplaceRoot = join(root, "marketplace");
  cpSync(marketplaceFixtureRoot, marketplaceRoot, { recursive: true });
  const marketplacePlugin = join(marketplaceRoot, "plugins", "kyw-dev");
  mkdirSync(path.dirname(marketplacePlugin), { recursive: true });
  cpSync(packageRoot, marketplacePlugin, { recursive: true });
  const codexHome = join(root, "codex-home");
  mkdirSync(codexHome);
  const codexEnv = { ...process.env, CODEX_HOME: codexHome };

  const marketplaceAdd = runCodex(
    ["plugin", "marketplace", "add", marketplaceRoot, "--json"],
    { cwd: work, env: codexEnv },
  );
  assertSucceeded(marketplaceAdd, "marketplace add");
  const available = runCodex(
    ["plugin", "list", "--marketplace", "kyw-dev-local", "--available", "--json"],
    { cwd: work, env: codexEnv },
  );
  assertSucceeded(available, "marketplace plugin discovery");
  assert.match(available.stdout, /kyw-dev/);

  const pluginAdd = runCodex(
    ["plugin", "add", "kyw-dev@kyw-dev-local", "--json"],
    { cwd: work, env: codexEnv },
  );
  assertSucceeded(pluginAdd, "plugin add");
  const cachedSkills = collectFiles(codexHome)
    .filter((filePath) => path.basename(filePath) === "SKILL.md")
    .map((filePath) => path.basename(path.dirname(filePath)))
    .filter((skillName) => managedSkillNames.includes(skillName))
    .sort();
  assert.deepEqual([...new Set(cachedSkills)], managedSkillNames);

  const installed = runCodex(["plugin", "list", "--json"], { cwd: work, env: codexEnv });
  assertSucceeded(installed, "installed plugin list");
  assert.match(installed.stdout, /kyw-dev/);
  assertSucceeded(
    runCodex(["plugin", "remove", "kyw-dev@kyw-dev-local", "--json"], {
      cwd: work,
      env: codexEnv,
    }),
    "plugin remove",
  );
  assertSucceeded(
    runCodex(["plugin", "marketplace", "remove", "kyw-dev-local", "--json"], {
      cwd: work,
      env: codexEnv,
    }),
    "marketplace remove",
  );

  assert.equal(
    collectFiles(packageRoot).some((filePath) => relative(packageRoot, filePath).startsWith("test")),
    false,
  );
});
