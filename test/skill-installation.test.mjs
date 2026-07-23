import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path, { join, posix, win32 } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runCli } from "../src/cli/run.mjs";
import {
  EXIT_CODES,
  INSTALL_METADATA_NAME,
  MANAGED_SKILL_NAMES,
  PACKAGE_ROOT,
  SkillInstallationError,
  buildManagedSourceInventory,
  diagnoseInstallations,
  findRepositoryRoot,
  inspectManagedInstallation,
  installManagedSkills,
  readInstallMetadata,
  recoverInterruptedInstallation,
  repositorySearchPath,
  resolveManagedPath,
  resolveInstallLocation,
  resolveScopeLayout,
  uninstallManagedSkills,
  updateManagedSkills,
  normalizeManagedPath,
  validateInstallMetadata,
} from "../src/core/skill-installation.mjs";

const installationModuleUrl = pathToFileURL(
  fileURLToPath(new URL("../src/core/skill-installation.mjs", import.meta.url)),
).href;
const cliExecutable = fileURLToPath(new URL("../bin/kyw-dev.mjs", import.meta.url));

function temporaryDirectory(t, prefix = "kyw-dev-install-") {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => {
    const resolved = path.resolve(directory);
    const tempRoot = path.resolve(tmpdir());
    assert.ok(resolved.startsWith(`${tempRoot}${path.sep}`));
    rmSync(resolved, { recursive: true, force: true });
  });
  return directory;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hashFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function fileSnapshot(root) {
  if (!existsSync(root)) {
    return [];
  }
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        files.push([path.relative(root, absolute).replaceAll("\\", "/"), hashFile(absolute)]);
      } else {
        files.push([path.relative(root, absolute).replaceAll("\\", "/"), entry.isSymbolicLink() ? "symlink" : "other"]);
      }
    }
  }
  visit(root);
  return files.sort((left, right) => left[0].localeCompare(right[0]));
}

function metadataSnapshot(root) {
  if (!existsSync(root)) {
    return [];
  }
  const entries = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      const relative = path.relative(root, absolute).replaceAll("\\", "/");
      const state = lstatSync(absolute);
      const common = {
        path: relative,
        mode: state.mode,
        size: state.size,
        mtimeMs: state.mtimeMs,
        ctimeMs: state.ctimeMs,
      };
      if (entry.isSymbolicLink()) {
        entries.push({ ...common, type: "link", target: readlinkSync(absolute) });
      } else if (entry.isDirectory()) {
        entries.push({ ...common, type: "directory" });
        visit(absolute);
      } else if (entry.isFile()) {
        entries.push({ ...common, type: "file", sha256: hashFile(absolute) });
      } else {
        entries.push({ ...common, type: "other" });
      }
    }
  }
  visit(root);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function createRequiredDirectoryLink(target, link, label) {
  const type = process.platform === "win32" ? "junction" : "dir";
  try {
    symlinkSync(target, link, type);
  } catch (error) {
    assert.fail(
      `${label} requires a native ${type} fixture on ${process.platform}; creation failed with ${error.code}: ${error.message}`,
    );
  }
  assert.equal(lstatSync(link).isSymbolicLink(), true, `${label} fixture was not a link`);
  return type;
}

function replaceWithRequiredUnsupportedEntry(filePath) {
  rmSync(filePath, { force: true });
  if (process.platform === "win32") {
    mkdirSync(filePath);
    assert.equal(lstatSync(filePath).isDirectory(), true);
    return "directory-at-file-path";
  }
  const created = spawnSync("mkfifo", [filePath], { encoding: "utf8" });
  assert.equal(
    created.status,
    0,
    `mkfifo capability is required on ${process.platform}: ${created.stderr || created.error?.message}`,
  );
  const state = lstatSync(filePath);
  assert.equal(state.isFile() || state.isDirectory() || state.isSymbolicLink(), false);
  return "fifo";
}

function createRepository(root) {
  mkdirSync(root, { recursive: true });
  mkdirSync(join(root, ".git"), { recursive: true });
  return realpathSync(root);
}

function createSourceCopy(t, version, mutate) {
  const source = join(temporaryDirectory(t, "kyw-dev-source-"), "package");
  mkdirSync(source, { recursive: true });
  for (const relativePath of [".codex-plugin", "skills", "templates"]) {
    cpSync(join(PACKAGE_ROOT, relativePath), join(source, relativePath), { recursive: true });
  }
  mkdirSync(join(source, "src", "core"), { recursive: true });
  for (const name of ["task-artifacts.mjs", "template-contracts.mjs"]) {
    cpSync(join(PACKAGE_ROOT, "src", "core", name), join(source, "src", "core", name));
  }
  const packageJson = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));
  packageJson.version = version;
  writeJson(join(source, "package.json"), packageJson);
  const pluginJson = JSON.parse(readFileSync(join(source, ".codex-plugin", "plugin.json"), "utf8"));
  pluginJson.version = version;
  writeJson(join(source, ".codex-plugin", "plugin.json"), pluginJson);
  mutate?.(source);
  return source;
}

function commandRunner(command) {
  if (command === "npm") {
    return { status: 0, stdout: "11.0.0\n", stderr: "" };
  }
  return { status: 1, stdout: "", stderr: "not found" };
}

function expectInstallationError(callback, { code, exitCode }) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof SkillInstallationError);
    assert.equal(error.code, code);
    assert.equal(error.exitCode, exitCode);
    return true;
  });
}

test("scope paths and repository walks are stable for POSIX and Windows dialects", () => {
  const posixUser = resolveScopeLayout({ scope: "user", home: "/home/ada", pathApi: posix });
  assert.equal(posixUser.skillsRoot, "/home/ada/.agents/skills");
  assert.equal(posixUser.metadataPath, "/home/ada/.agents/skills/.kyw-dev-install.json");

  const windowsProject = resolveScopeLayout({
    scope: "project",
    repositoryRoot: "C:\\work\\app",
    pathApi: win32,
  });
  assert.equal(windowsProject.skillsRoot, "C:\\work\\app\\.agents\\skills");
  assert.deepEqual(repositorySearchPath("C:\\work\\app\\src", win32), [
    "C:\\work\\app\\src",
    "C:\\work\\app",
    "C:\\work",
    "C:\\",
  ]);
  assert.deepEqual(repositorySearchPath("/work/app/src", posix), ["/work/app/src", "/work/app", "/work", "/"]);
});

test("managed paths reject portable absolute, traversal, mixed-separator, and malformed forms", () => {
  const invalidPaths = [
    "",
    " ",
    "/etc/passwd",
    "//server/share/file",
    "C:/Windows/System32/file",
    "C:relative/file",
    "../outside",
    "kyw-init/../outside",
    "./kyw-init/SKILL.md",
    "kyw-init\\..\\outside",
    "kyw-init//SKILL.md",
    "kyw-init/name:stream",
    "kyw-init/trailing.",
    "kyw-init/trailing ",
    "kyw-init/CON",
    "kyw-init/null\0byte",
  ];
  for (const candidate of invalidPaths) {
    expectInstallationError(() => normalizeManagedPath(candidate), {
      code: "INVALID_INSTALL_METADATA",
      exitCode: EXIT_CODES.INVALID_STATE,
    });
  }
  assert.equal(normalizeManagedPath("kyw-init/agents/openai.yaml"), "kyw-init/agents/openai.yaml");
  assert.equal(resolveManagedPath("/safe/root", "kyw-init/SKILL.md", posix), "/safe/root/kyw-init/SKILL.md");
  assert.equal(
    resolveManagedPath("C:\\safe\\root", "kyw-init/SKILL.md", win32),
    "C:\\safe\\root\\kyw-init\\SKILL.md",
  );
});

test("metadata rejects duplicate, case-normalization, and file-prefix collisions on every host", () => {
  const inventory = buildManagedSourceInventory();
  const base = {
    schemaVersion: 1,
    packageName: "kyw-dev",
    version: inventory.version,
    scope: "user",
    installedAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
    skills: MANAGED_SKILL_NAMES.map((name) => ({ name, path: name })),
    files: inventory.files.map(({ path: filePath, sha256 }) => ({ path: filePath, sha256 })),
  };
  for (const maliciousPath of [
    base.files[0].path,
    base.files[0].path.toUpperCase(),
    `${base.files[0].path}/child`,
  ]) {
    const errors = validateInstallMetadata({
      ...base,
      files: [...base.files, { path: maliciousPath, sha256: "0".repeat(64) }],
    });
    assert.ok(errors.some((error) => /duplicate|collision/i.test(error)), errors.join("\n"));
  }
});

test("project root detection resolves a nested repository without changing cwd", (t) => {
  const root = createRepository(join(temporaryDirectory(t), "repository"));
  const nested = join(root, "src", "feature");
  mkdirSync(nested, { recursive: true });
  const cwd = process.cwd();
  assert.equal(findRepositoryRoot(nested), root);
  assert.equal(process.cwd(), cwd);
});

test("project install and doctor reject a linked Git marker", (t) => {
  const home = temporaryDirectory(t);
  const repository = join(temporaryDirectory(t), "repository");
  const outside = temporaryDirectory(t, "kyw-dev-git-marker-target-");
  mkdirSync(repository);
  writeFileSync(join(outside, "marker.txt"), "outside\n", "utf8");
  const fixtureType = createRequiredDirectoryLink(outside, join(repository, ".git"), "Git-marker link rejection");
  t.diagnostic(`created and verified native ${fixtureType} fixture on ${process.platform}`);
  const outsideBefore = metadataSnapshot(outside);

  expectInstallationError(() => installManagedSkills({ scope: "project", cwd: repository, home }), {
    code: "SCOPE_RESOLUTION_FAILED",
    exitCode: EXIT_CODES.SCOPE_RESOLUTION,
  });
  const report = diagnoseInstallations({ cwd: repository, home, commandRunner });
  assert.equal(report.exitCode, EXIT_CODES.SCOPE_RESOLUTION);
  assert.ok(report.findings.some((finding) => finding.code === "UNSAFE_SCOPE"));
  assert.deepEqual(metadataSnapshot(outside), outsideBefore);
});

test("CLI entrypoint installs and uninstalls against an isolated HOME", (t) => {
  const home = temporaryDirectory(t);
  const workingDirectory = temporaryDirectory(t);
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const install = spawnSync(process.execPath, [cliExecutable, "install", "--scope", "user"], {
    cwd: workingDirectory,
    env,
    encoding: "utf8",
  });
  assert.equal(install.status, 0, install.stderr);
  assert.match(install.stdout, /Installed 4 kyw-dev Skills/);
  assert.ok(existsSync(join(home, ".agents", "skills", "kyw-task", "SKILL.md")));

  const doctor = spawnSync(process.execPath, [cliExecutable, "doctor"], {
    cwd: workingDirectory,
    env,
    encoding: "utf8",
  });
  assert.equal(doctor.status, 0, doctor.stderr);
  assert.equal(doctor.stderr, "");
  assert.match(doctor.stdout, /user: .*installed 0\.1\.0/);

  const uninstall = spawnSync(process.execPath, [cliExecutable, "uninstall", "--scope", "user"], {
    cwd: workingDirectory,
    env,
    encoding: "utf8",
  });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  assert.match(uninstall.stdout, /Uninstalled kyw-dev 0\.1\.0/);
  assert.equal(existsSync(join(home, ".agents", "skills", INSTALL_METADATA_NAME)), false);
});

test("user install writes complete hashed Skills and a runnable direct-install Task adapter", (t) => {
  const home = temporaryDirectory(t);
  const unrelated = join(home, ".agents", "skills", "other-skill", "SKILL.md");
  mkdirSync(path.dirname(unrelated), { recursive: true });
  writeFileSync(unrelated, "unrelated\n", "utf8");

  const result = installManagedSkills({
    scope: "user",
    home,
    now: () => new Date("2026-07-17T00:00:00.000Z"),
  });
  assert.equal(result.skillCount, 4);
  assert.equal(result.fileCount, 19);
  assert.equal(readFileSync(unrelated, "utf8"), "unrelated\n");

  const location = resolveInstallLocation({ scope: "user", home });
  const metadata = readInstallMetadata(location, { required: true });
  assert.deepEqual(validateInstallMetadata(metadata, { expectedScope: "user" }), []);
  assert.equal(metadata.version, "0.1.0");
  assert.equal(metadata.files.length, 19);
  assert.ok(metadata.files.some((file) => file.path === ".kyw-dev/runtime/templates/task/TASK.md"));
  for (const file of metadata.files) {
    assert.equal(hashFile(join(location.skillsRoot, ...file.path.split("/"))), file.sha256);
  }
  for (const skillName of MANAGED_SKILL_NAMES) {
    assert.ok(existsSync(join(location.skillsRoot, skillName, "SKILL.md")));
  }

  const targetRepository = createRepository(join(temporaryDirectory(t, "kyw-dev-target-"), "repository"));
  const adapter = join(location.skillsRoot, "kyw-task", "scripts", "task-artifacts.mjs");
  const adapterResult = spawnSync(
    process.execPath,
    [adapter, "create", "--tasks-root", join(targetRepository, "docs", "tasks"), "--title", "Installed adapter"],
    { encoding: "utf8" },
  );
  assert.equal(adapterResult.status, 0, adapterResult.stderr);
  const adapterOutput = JSON.parse(adapterResult.stdout);
  assert.equal(adapterOutput.id, "0001");
  assert.ok(existsSync(join(adapterOutput.directory, "TASK.md")));
  assert.ok(existsSync(join(adapterOutput.directory, "TEST.md")));
  const dispatchResult = spawnSync(
    process.execPath,
    [
      adapter,
      "dispatch",
      "--tasks-root",
      join(targetRepository, "docs", "tasks"),
      "--invocation",
      "$kyw-task 0001",
      "--managed-routing",
      "false",
    ],
    { encoding: "utf8" },
  );
  assert.equal(dispatchResult.status, 0, dispatchResult.stderr);
  const dispatchOutput = JSON.parse(dispatchResult.stdout);
  assert.equal(dispatchOutput.outcome, "SELECTED");
  assert.equal(dispatchOutput.action, "AUTHOR");
  assert.equal(dispatchOutput.confirmation, false);

  const uninstall = uninstallManagedSkills({ scope: "user", home });
  assert.equal(uninstall.removedFileCount, 19);
  assert.equal(readFileSync(unrelated, "utf8"), "unrelated\n");
  assert.equal(existsSync(location.metadataPath), false);
  for (const skillName of MANAGED_SKILL_NAMES) {
    assert.equal(existsSync(join(location.skillsRoot, skillName)), false);
  }
  assert.equal(existsSync(join(location.skillsRoot, ".kyw-dev", "runtime")), false);
});

test("project install resolves the Git root and never creates or replaces project documents", (t) => {
  const home = temporaryDirectory(t);
  const repository = createRepository(join(temporaryDirectory(t), "repository"));
  const nested = join(repository, "packages", "api");
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(repository, "README.md"), "preserve me\n", "utf8");
  const beforeReadmeHash = hashFile(join(repository, "README.md"));

  const installed = spawnSync(process.execPath, [cliExecutable, "install", "--scope", "project"], {
    cwd: nested,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
  });
  assert.equal(installed.status, 0, installed.stderr);
  const location = resolveInstallLocation({ scope: "project", cwd: nested, home });
  assert.equal(location.baseDirectory, repository);
  assert.ok(existsSync(join(repository, ".agents", "skills", "kyw-init", "SKILL.md")));
  assert.equal(existsSync(join(nested, ".agents")), false);
  assert.equal(hashFile(join(repository, "README.md")), beforeReadmeHash);
  for (const projectDocument of ["AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"]) {
    assert.equal(existsSync(join(repository, ...projectDocument.split("/"))), false);
  }
});

test("install refuses an unmanaged Skill directory without changing it", (t) => {
  const home = temporaryDirectory(t);
  const unmanaged = join(home, ".agents", "skills", "kyw-init", "custom.txt");
  mkdirSync(path.dirname(unmanaged), { recursive: true });
  writeFileSync(unmanaged, "owner=user\n", "utf8");
  const before = fileSnapshot(home);

  expectInstallationError(() => installManagedSkills({ scope: "user", home }), {
    code: "INSTALL_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  assert.deepEqual(fileSnapshot(home), before);
  assert.equal(existsSync(join(home, ".agents", "skills", INSTALL_METADATA_NAME)), false);
});

test("install refuses a native symlink or junction managed Skill path without following it", (t) => {
  const home = temporaryDirectory(t);
  const outside = temporaryDirectory(t, "kyw-dev-symlink-target-");
  const marker = join(outside, "marker.txt");
  writeFileSync(marker, "outside\n", "utf8");
  const skillsRoot = join(home, ".agents", "skills");
  mkdirSync(skillsRoot, { recursive: true });
  const link = join(skillsRoot, "kyw-init");
  const fixtureType = createRequiredDirectoryLink(outside, link, "managed Skill link rejection");
  t.diagnostic(`created and verified native ${fixtureType} fixture on ${process.platform}`);

  expectInstallationError(() => installManagedSkills({ scope: "user", home }), {
    code: "INSTALL_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  assert.equal(readFileSync(marker, "utf8"), "outside\n");
  assert.equal(existsSync(join(skillsRoot, INSTALL_METADATA_NAME)), false);
});

test("install and doctor refuse a linked Skills root without touching the target", (t) => {
  const home = temporaryDirectory(t);
  const outside = temporaryDirectory(t, "kyw-dev-skills-root-target-");
  const marker = join(outside, "marker.txt");
  writeFileSync(marker, "outside\n", "utf8");
  const agentsRoot = join(home, ".agents");
  mkdirSync(agentsRoot);
  const skillsRoot = join(agentsRoot, "skills");
  const fixtureType = createRequiredDirectoryLink(outside, skillsRoot, "Skills-root link rejection");
  t.diagnostic(`created and verified native ${fixtureType} fixture on ${process.platform}`);
  const outsideBefore = metadataSnapshot(outside);

  expectInstallationError(() => installManagedSkills({ scope: "user", home }), {
    code: "FILESYSTEM_ERROR",
    exitCode: EXIT_CODES.FILESYSTEM,
  });
  const report = diagnoseInstallations({ home, commandRunner });
  assert.equal(report.exitCode, EXIT_CODES.RECOVERY_REQUIRED);
  assert.ok(report.findings.some((finding) => finding.code === "UNSAFE_SCOPE"));
  assert.deepEqual(metadataSnapshot(outside), outsideBefore);
  assert.equal(readFileSync(marker, "utf8"), "outside\n");
});

test("update replaces unchanged managed files and records the new package hashes", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({
    scope: "user",
    home,
    now: () => new Date("2026-07-17T00:00:00.000Z"),
  });
  const source = createSourceCopy(t, "0.2.0", (root) => {
    const skill = join(root, "skills", "kyw-grilling", "SKILL.md");
    writeFileSync(skill, `${readFileSync(skill, "utf8")}\n<!-- version 0.2.0 -->\n`, "utf8");
  });

  const result = updateManagedSkills({
    scope: "user",
    home,
    sourceRoot: source,
    now: () => new Date("2026-07-17T01:00:00.000Z"),
  });
  assert.equal(result.previousVersion, "0.1.0");
  assert.equal(result.version, "0.2.0");
  const location = resolveInstallLocation({ scope: "user", home });
  const metadata = readInstallMetadata(location, { required: true });
  assert.equal(metadata.version, "0.2.0");
  assert.equal(metadata.installedAt, "2026-07-17T00:00:00.000Z");
  assert.equal(metadata.updatedAt, "2026-07-17T01:00:00.000Z");
  assert.match(readFileSync(join(location.skillsRoot, "kyw-grilling", "SKILL.md"), "utf8"), /version 0\.2\.0/);
  assert.deepEqual(inspectManagedInstallation(location, metadata).modified, []);
});

test("update reports a local modification and leaves all installed bytes unchanged", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const source = createSourceCopy(t, "0.2.0");
  const location = resolveInstallLocation({ scope: "user", home });
  const modified = join(location.skillsRoot, "kyw-init", "SKILL.md");
  writeFileSync(modified, `${readFileSync(modified, "utf8")}local change\n`, "utf8");
  const before = fileSnapshot(location.skillsRoot);

  expectInstallationError(() => updateManagedSkills({ scope: "user", home, sourceRoot: source }), {
    code: "UPDATE_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  assert.deepEqual(fileSnapshot(location.skillsRoot), before);
  assert.equal(readInstallMetadata(location, { required: true }).version, "0.1.0");
});

test("update refuses an unknown file and preserves the entire managed tree", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const source = createSourceCopy(t, "0.2.0");
  const location = resolveInstallLocation({ scope: "user", home });
  const unknown = join(location.skillsRoot, "kyw-init", "user-notes.txt");
  writeFileSync(unknown, "preserve unknown\n", "utf8");
  const before = metadataSnapshot(home);

  expectInstallationError(() => updateManagedSkills({ scope: "user", home, sourceRoot: source }), {
    code: "UPDATE_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  assert.deepEqual(metadataSnapshot(home), before);
  assert.equal(readFileSync(unknown, "utf8"), "preserve unknown\n");
});

test("update revalidates owned content immediately before the destructive rename", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const location = resolveInstallLocation({ scope: "user", home });
  const source = createSourceCopy(t, "0.2.0");
  const target = join(location.skillsRoot, "kyw-init", "SKILL.md");

  expectInstallationError(
    () =>
      updateManagedSkills({
        scope: "user",
        home,
        sourceRoot: source,
        hooks: {
          afterCommitStarted() {
            writeFileSync(target, `${readFileSync(target, "utf8")}raced change\n`, "utf8");
          },
        },
      }),
    { code: "INSTALL_CONFLICT", exitCode: EXIT_CODES.CONFLICT },
  );
  assert.match(readFileSync(target, "utf8"), /raced change/);
  assert.equal(readInstallMetadata(location, { required: true }).version, "0.1.0");
  assert.deepEqual(
    readdirSync(location.skillsRoot).filter((name) => name.startsWith(".kyw-dev-stage-") || name.startsWith(".kyw-dev-backup-")),
    [],
  );
});

test("staging revalidates a packaged source parent that becomes a native link", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const source = createSourceCopy(t, "0.2.0");
  const sourceParent = join(source, "skills", "kyw-init", "agents");
  const outside = temporaryDirectory(t, "kyw-dev-source-link-target-");
  writeFileSync(join(outside, "openai.yaml"), readFileSync(join(sourceParent, "openai.yaml")));
  const outsideBefore = metadataSnapshot(outside);
  let fixtureType;

  expectInstallationError(
    () =>
      updateManagedSkills({
        scope: "user",
        home,
        sourceRoot: source,
        hooks: {
          afterJournalCreated() {
            rmSync(sourceParent, { recursive: true, force: true });
            fixtureType = createRequiredDirectoryLink(
              outside,
              sourceParent,
              "packaged source parent revalidation",
            );
          },
        },
      }),
    { code: "INVALID_PACKAGE", exitCode: EXIT_CODES.INVALID_STATE },
  );
  t.diagnostic(`created and verified native ${fixtureType} fixture on ${process.platform}`);
  assert.deepEqual(metadataSnapshot(outside), outsideBefore);
  assert.equal(readInstallMetadata(resolveInstallLocation({ scope: "user", home }), { required: true }).version, "0.1.0");
});

test("malicious installation metadata cannot escape update, force uninstall, or doctor", (t) => {
  const home = temporaryDirectory(t);
  const outside = temporaryDirectory(t, "kyw-dev-metadata-outside-");
  const marker = join(outside, "marker.txt");
  writeFileSync(marker, "outside stays\n", "utf8");
  installManagedSkills({ scope: "user", home });
  const location = resolveInstallLocation({ scope: "user", home });
  const metadata = JSON.parse(readFileSync(location.metadataPath, "utf8"));
  metadata.files[0].path = "../../outside/marker.txt";
  writeJson(location.metadataPath, metadata);
  const before = metadataSnapshot(home);

  expectInstallationError(() => updateManagedSkills({ scope: "user", home }), {
    code: "INVALID_INSTALL_METADATA",
    exitCode: EXIT_CODES.INVALID_STATE,
  });
  expectInstallationError(() => uninstallManagedSkills({ scope: "user", home, force: true }), {
    code: "INVALID_INSTALL_METADATA",
    exitCode: EXIT_CODES.INVALID_STATE,
  });
  const report = diagnoseInstallations({ home, commandRunner });
  assert.equal(report.exitCode, EXIT_CODES.INVALID_STATE);
  assert.ok(report.findings.some((finding) => finding.code === "INVALID_INSTALL_METADATA"));
  assert.deepEqual(metadataSnapshot(home), before);
  assert.equal(readFileSync(marker, "utf8"), "outside stays\n");
});

test("uninstall refuses changed state by default and force preserves unknown files", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const location = resolveInstallLocation({ scope: "user", home });
  const modified = join(location.skillsRoot, "kyw-init", "SKILL.md");
  const unknown = join(location.skillsRoot, "kyw-init", "notes", "mine.txt");
  const unrelated = join(location.skillsRoot, "another-skill", "SKILL.md");
  writeFileSync(modified, `${readFileSync(modified, "utf8")}local change\n`, "utf8");
  mkdirSync(path.dirname(unknown), { recursive: true });
  writeFileSync(unknown, "preserve unknown\n", "utf8");
  mkdirSync(path.dirname(unrelated), { recursive: true });
  writeFileSync(unrelated, "preserve unrelated\n", "utf8");

  expectInstallationError(() => uninstallManagedSkills({ scope: "user", home }), {
    code: "UNINSTALL_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  uninstallManagedSkills({ scope: "user", home, force: true });
  assert.equal(readFileSync(unknown, "utf8"), "preserve unknown\n");
  assert.equal(readFileSync(unrelated, "utf8"), "preserve unrelated\n");
  assert.equal(existsSync(modified), false);
  assert.equal(existsSync(location.metadataPath), false);
});

test("update, force uninstall, and doctor refuse a managed parent link and preserve its target", (t) => {
  const home = temporaryDirectory(t);
  const outside = temporaryDirectory(t, "kyw-dev-parent-link-target-");
  installManagedSkills({ scope: "user", home });
  const location = resolveInstallLocation({ scope: "user", home });
  const managedParent = join(location.skillsRoot, "kyw-init", "agents");
  rmSync(managedParent, { recursive: true, force: true });
  writeFileSync(join(outside, "openai.yaml"), "outside target\n", "utf8");
  const fixtureType = createRequiredDirectoryLink(outside, managedParent, "managed parent link rejection");
  t.diagnostic(`created and verified native ${fixtureType} fixture on ${process.platform}`);
  const outsideBefore = metadataSnapshot(outside);
  const scopeBefore = metadataSnapshot(home);

  expectInstallationError(() => updateManagedSkills({ scope: "user", home }), {
    code: "UPDATE_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  expectInstallationError(() => uninstallManagedSkills({ scope: "user", home, force: true }), {
    code: "UNINSTALL_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  const report = diagnoseInstallations({ home, commandRunner });
  assert.equal(report.exitCode, EXIT_CODES.RECOVERY_REQUIRED);
  assert.ok(report.findings.some((finding) => /unsafe/i.test(finding.message)));
  assert.deepEqual(metadataSnapshot(outside), outsideBefore);
  assert.deepEqual(metadataSnapshot(home), scopeBefore);
});

test("unsupported managed file types fail closed on every platform", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const location = resolveInstallLocation({ scope: "user", home });
  const managedFile = join(location.skillsRoot, "kyw-init", "SKILL.md");
  const fixtureType = replaceWithRequiredUnsupportedEntry(managedFile);
  t.diagnostic(`created and verified ${fixtureType} fixture on ${process.platform}`);

  expectInstallationError(() => updateManagedSkills({ scope: "user", home }), {
    code: "UPDATE_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  expectInstallationError(() => uninstallManagedSkills({ scope: "user", home, force: true }), {
    code: "UNINSTALL_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  const report = diagnoseInstallations({ home, commandRunner });
  assert.equal(report.exitCode, EXIT_CODES.RECOVERY_REQUIRED);
  assert.equal(lstatSync(managedFile).isFile(), false);
});

test("force uninstall preserves an unknown link and never touches its target", (t) => {
  const home = temporaryDirectory(t);
  const outside = temporaryDirectory(t, "kyw-dev-force-link-target-");
  const marker = join(outside, "marker.txt");
  writeFileSync(marker, "outside target\n", "utf8");
  installManagedSkills({ scope: "user", home });
  const location = resolveInstallLocation({ scope: "user", home });
  const unknownLink = join(location.skillsRoot, "kyw-init", "user-link");
  const fixtureType = createRequiredDirectoryLink(outside, unknownLink, "force unknown-link preservation");
  t.diagnostic(`created and verified native ${fixtureType} fixture on ${process.platform}`);
  const modified = join(location.skillsRoot, "kyw-init", "SKILL.md");
  writeFileSync(modified, `${readFileSync(modified, "utf8")}modified\n`, "utf8");

  uninstallManagedSkills({ scope: "user", home, force: true });
  assert.equal(lstatSync(unknownLink).isSymbolicLink(), true);
  assert.equal(readFileSync(marker, "utf8"), "outside target\n");
  assert.equal(existsSync(modified), false);
  assert.equal(existsSync(location.metadataPath), false);
});

test("doctor reports duplicate, malformed, permission, and partial installs without mutation", (t) => {
  const home = temporaryDirectory(t);
  const repository = createRepository(join(temporaryDirectory(t), "repository"));
  installManagedSkills({ scope: "user", home });
  installManagedSkills({ scope: "project", cwd: repository, home });
  const projectLocation = resolveInstallLocation({ scope: "project", cwd: repository, home });
  const brokenSkill = join(projectLocation.skillsRoot, "kyw-audit", "SKILL.md");
  writeFileSync(brokenSkill, "broken\n", "utf8");
  const beforeHome = fileSnapshot(home);
  const beforeRepository = fileSnapshot(repository);

  const report = diagnoseInstallations({
    cwd: repository,
    home,
    commandRunner,
    accessChecker(target, mode) {
      if (target.startsWith(repository)) {
        const error = new Error("denied for test");
        error.code = "EACCES";
        throw error;
      }
      return mode;
    },
  });
  assert.equal(report.exitCode, EXIT_CODES.FILESYSTEM);
  assert.ok(report.findings.some((finding) => finding.code === "DUPLICATE_INSTALLATION"));
  assert.ok(report.findings.some((finding) => finding.code === "MALFORMED_SKILL"));
  assert.ok(report.findings.some((finding) => finding.code === "PARTIAL_INSTALL"));
  assert.ok(report.findings.some((finding) => finding.code === "PERMISSION_DENIED"));
  assert.ok(report.findings.some((finding) => finding.code === "CODEX_NOT_DETECTED"));
  assert.deepEqual(fileSnapshot(home), beforeHome);
  assert.deepEqual(fileSnapshot(repository), beforeRepository);
});

test("doctor reports malformed packaged plugin metadata", (t) => {
  const home = temporaryDirectory(t);
  const source = createSourceCopy(t, "0.2.0", (root) => {
    writeFileSync(join(root, ".codex-plugin", "plugin.json"), "{ malformed\n", "utf8");
  });
  const report = diagnoseInstallations({ home, sourceRoot: source, commandRunner });
  assert.equal(report.exitCode, EXIT_CODES.INVALID_STATE);
  assert.ok(report.findings.some((finding) => finding.code === "INVALID_PACKAGE"));
});

test("doctor reports unsupported runtime and installed-version drift", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const source = createSourceCopy(t, "0.2.0");
  const before = fileSnapshot(home);
  const report = diagnoseInstallations({
    home,
    sourceRoot: source,
    nodeVersion: "21.9.0",
    commandRunner,
  });
  assert.equal(report.exitCode, EXIT_CODES.UNSUPPORTED_RUNTIME);
  assert.ok(report.findings.some((finding) => finding.code === "UNSUPPORTED_RUNTIME"));
  assert.ok(report.findings.some((finding) => finding.code === "VERSION_DRIFT"));
  assert.deepEqual(fileSnapshot(home), before);
});

test("doctor is byte-and-metadata read-only for a healthy managed tree", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const before = metadataSnapshot(home);
  const report = diagnoseInstallations({ home, commandRunner });
  assert.equal(report.exitCode, EXIT_CODES.OK);
  assert.deepEqual(metadataSnapshot(home), before);
});

test("interrupted update is diagnosed and rollback restores the complete prior install", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const location = resolveInstallLocation({ scope: "user", home });
  const previousMetadata = readInstallMetadata(location, { required: true });
  const source = createSourceCopy(t, "0.2.0", (root) => {
    const skill = join(root, "skills", "kyw-grilling", "SKILL.md");
    writeFileSync(skill, `${readFileSync(skill, "utf8")}new package bytes\n`, "utf8");
  });
  function interruptAt(hook, status) {
    const childScript = `
      import { updateManagedSkills } from ${JSON.stringify(installationModuleUrl)};
      updateManagedSkills({
        scope: "user",
        home: process.argv[1],
        sourceRoot: process.argv[2],
        hooks: { ${hook}() { process.exit(${status}); } }
      });
    `;
    return spawnSync(process.execPath, ["--input-type=module", "-e", childScript, home, source], {
      encoding: "utf8",
    });
  }

  const stagedInterruption = interruptAt("afterStagePrepared", 90);
  assert.equal(stagedInterruption.status, 90, stagedInterruption.stderr);
  assert.equal(diagnoseInstallations({ home, commandRunner }).exitCode, EXIT_CODES.RECOVERY_REQUIRED);
  const discardedStage = recoverInterruptedInstallation(location);
  assert.equal(discardedStage.action, "discarded-stage");
  assert.deepEqual(readInstallMetadata(location, { required: true }), previousMetadata);

  const interrupted = interruptAt("afterNewFileMoved", 91);
  assert.equal(interrupted.status, 91, interrupted.stderr);

  const partialReport = diagnoseInstallations({ home, commandRunner });
  assert.equal(partialReport.exitCode, EXIT_CODES.RECOVERY_REQUIRED);
  assert.ok(partialReport.findings.some((finding) => finding.code === "PARTIAL_INSTALL"));

  const recovered = recoverInterruptedInstallation(location);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.action, "rolled-back");
  const restoredMetadata = readInstallMetadata(location, { required: true });
  assert.deepEqual(restoredMetadata, previousMetadata);
  const restoredState = inspectManagedInstallation(location, restoredMetadata);
  assert.deepEqual(restoredState.missing, []);
  assert.deepEqual(restoredState.modified, []);
  assert.deepEqual(restoredState.unknown, []);
  assert.deepEqual(restoredState.unsafe, []);

  updateManagedSkills({ scope: "user", home, sourceRoot: source });
  assert.equal(readInstallMetadata(location, { required: true }).version, "0.2.0");
});

test("every transaction phase is diagnosable and recovers to the proven old or committed state", (t) => {
  const phases = [
    ["afterJournalCreated", "discarded-stage", "0.1.0"],
    ["afterStagePrepared", "discarded-stage", "0.1.0"],
    ["afterCommitStarted", "rolled-back", "0.1.0"],
    ["afterOldFileMoved", "rolled-back", "0.1.0"],
    ["afterNewFileMoved", "rolled-back", "0.1.0"],
    ["afterMetadataCommitted", "rolled-back", "0.1.0"],
    ["afterCommitComplete", "completed-cleanup", "0.2.0"],
  ];
  for (const [index, [hook, expectedAction, expectedVersion]] of phases.entries()) {
    const home = temporaryDirectory(t, `kyw-dev-phase-${index}-`);
    installManagedSkills({ scope: "user", home });
    const source = createSourceCopy(t, "0.2.0", (root) => {
      const skill = join(root, "skills", "kyw-grilling", "SKILL.md");
      writeFileSync(skill, `${readFileSync(skill, "utf8")}phase bytes\n`, "utf8");
    });
    const childScript = `
      import { updateManagedSkills } from ${JSON.stringify(installationModuleUrl)};
      updateManagedSkills({
        scope: "user",
        home: process.argv[1],
        sourceRoot: process.argv[2],
        hooks: { ${hook}() { process.exit(${100 + index}); } }
      });
    `;
    const interrupted = spawnSync(process.execPath, ["--input-type=module", "-e", childScript, home, source], {
      encoding: "utf8",
    });
    assert.equal(interrupted.status, 100 + index, `${hook}: ${interrupted.stderr}`);
    const beforeDoctor = metadataSnapshot(home);
    const report = diagnoseInstallations({ home, commandRunner });
    assert.equal(report.exitCode, EXIT_CODES.RECOVERY_REQUIRED, hook);
    assert.deepEqual(metadataSnapshot(home), beforeDoctor, `${hook}: doctor mutated transaction state`);

    const location = resolveInstallLocation({ scope: "user", home });
    const recovered = recoverInterruptedInstallation(location);
    assert.equal(recovered.action, expectedAction, hook);
    const metadata = readInstallMetadata(location, { required: true });
    assert.equal(metadata.version, expectedVersion, hook);
    const state = inspectManagedInstallation(location, metadata);
    assert.deepEqual(state.missing, [], hook);
    assert.deepEqual(state.modified, [], hook);
    assert.deepEqual(state.unknown, [], hook);
    assert.deepEqual(state.unsafe, [], hook);
  }
});

test("transaction cleanup preserves an injected unknown backup file and remains diagnosable", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const source = createSourceCopy(t, "0.2.0");
  let injected;

  expectInstallationError(
    () =>
      updateManagedSkills({
        scope: "user",
        home,
        sourceRoot: source,
        hooks: {
          afterCommitComplete({ location, transaction }) {
            injected = join(location.skillsRoot, transaction.backupDirectory, "unknown.txt");
            writeFileSync(injected, "preserve me\n", "utf8");
          },
        },
      }),
    { code: "RECOVERY_REQUIRED", exitCode: EXIT_CODES.RECOVERY_REQUIRED },
  );
  assert.equal(readFileSync(injected, "utf8"), "preserve me\n");
  const beforeDoctor = metadataSnapshot(home);
  const report = diagnoseInstallations({ home, commandRunner });
  assert.equal(report.exitCode, EXIT_CODES.RECOVERY_REQUIRED);
  assert.deepEqual(metadataSnapshot(home), beforeDoctor);
  expectInstallationError(
    () => recoverInterruptedInstallation(resolveInstallLocation({ scope: "user", home })),
    { code: "RECOVERY_REQUIRED", exitCode: EXIT_CODES.RECOVERY_REQUIRED },
  );
  assert.equal(readFileSync(injected, "utf8"), "preserve me\n");
});

test("recovery preserves an unjournaled reserved sibling instead of broad cleanup", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const source = createSourceCopy(t, "0.2.0");
  let sibling;

  expectInstallationError(
    () =>
      updateManagedSkills({
        scope: "user",
        home,
        sourceRoot: source,
        hooks: {
          afterJournalCreated({ location }) {
            sibling = join(
              location.skillsRoot,
              ".kyw-dev-stage-00000000-0000-4000-8000-000000000099",
            );
            mkdirSync(sibling);
            throw new Error("injected sibling interruption");
          },
        },
      }),
    { code: "RECOVERY_REQUIRED", exitCode: EXIT_CODES.RECOVERY_REQUIRED },
  );
  assert.equal(lstatSync(sibling).isDirectory(), true);
  expectInstallationError(
    () => recoverInterruptedInstallation(resolveInstallLocation({ scope: "user", home })),
    { code: "RECOVERY_REQUIRED", exitCode: EXIT_CODES.RECOVERY_REQUIRED },
  );
  assert.equal(lstatSync(sibling).isDirectory(), true);
});

test("recovery refuses a transaction owned by another live process", (t) => {
  const home = temporaryDirectory(t);
  installManagedSkills({ scope: "user", home });
  const location = resolveInstallLocation({ scope: "user", home });
  const metadata = readInstallMetadata(location, { required: true });
  assert.ok(process.ppid > 0);
  writeJson(location.transactionPath, {
    schemaVersion: 1,
    operation: "uninstall",
    scope: "user",
    processId: process.ppid,
    force: false,
    stageDirectory: ".kyw-dev-stage-00000000-0000-4000-8000-000000000001",
    backupDirectory: ".kyw-dev-backup-00000000-0000-4000-8000-000000000002",
    oldFiles: metadata.files,
    newFiles: [],
    hadOldMetadata: true,
    oldMetadataHash: hashFile(location.metadataPath),
    newMetadataHash: null,
  });

  expectInstallationError(() => recoverInterruptedInstallation(location), {
    code: "INSTALL_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  assert.ok(existsSync(location.transactionPath));
});

test("recovery rejects traversal and case-colliding journal paths without touching outside files", (t) => {
  const home = temporaryDirectory(t);
  const outside = temporaryDirectory(t, "kyw-dev-journal-outside-");
  const marker = join(outside, "marker.txt");
  writeFileSync(marker, "outside\n", "utf8");
  const location = resolveInstallLocation({ scope: "user", home });
  mkdirSync(location.skillsRoot, { recursive: true });
  const baseTransaction = {
    schemaVersion: 1,
    operation: "install",
    scope: "user",
    processId: 99999999,
    force: false,
    stageDirectory: ".kyw-dev-stage-00000000-0000-4000-8000-000000000003",
    backupDirectory: ".kyw-dev-backup-00000000-0000-4000-8000-000000000004",
    oldFiles: [],
    newFiles: [{ path: "../outside/marker.txt", sha256: hashFile(marker) }],
    hadOldMetadata: false,
    oldMetadataHash: null,
    newMetadataHash: "0".repeat(64),
  };
  writeJson(location.transactionPath, baseTransaction);
  expectInstallationError(() => recoverInterruptedInstallation(location), {
    code: "RECOVERY_REQUIRED",
    exitCode: EXIT_CODES.RECOVERY_REQUIRED,
  });
  assert.equal(readFileSync(marker, "utf8"), "outside\n");
  assert.ok(existsSync(location.transactionPath));

  writeJson(location.transactionPath, {
    ...baseTransaction,
    newFiles: [
      { path: "kyw-init/SKILL.md", sha256: "1".repeat(64) },
      { path: "KYW-INIT/skill.md", sha256: "2".repeat(64) },
    ],
  });
  expectInstallationError(() => recoverInterruptedInstallation(location), {
    code: "RECOVERY_REQUIRED",
    exitCode: EXIT_CODES.RECOVERY_REQUIRED,
  });
  assert.equal(readFileSync(marker, "utf8"), "outside\n");
});

test("recovery never unlinks an unsafe orphaned completion marker", (t) => {
  const home = temporaryDirectory(t);
  const outside = temporaryDirectory(t, "kyw-dev-marker-target-");
  const marker = join(outside, "marker.txt");
  writeFileSync(marker, "outside\n", "utf8");
  const location = resolveInstallLocation({ scope: "user", home });
  mkdirSync(location.skillsRoot, { recursive: true });
  const fixtureType = createRequiredDirectoryLink(
    outside,
    location.transactionCompletePath,
    "unsafe completion-marker preservation",
  );
  t.diagnostic(`created and verified native ${fixtureType} fixture on ${process.platform}`);

  expectInstallationError(() => recoverInterruptedInstallation(location), {
    code: "RECOVERY_REQUIRED",
    exitCode: EXIT_CODES.RECOVERY_REQUIRED,
  });
  assert.equal(lstatSync(location.transactionCompletePath).isSymbolicLink(), true);
  assert.equal(readFileSync(marker, "utf8"), "outside\n");
});

test("CLI grammar and documented exit categories are deterministic", (t) => {
  const root = temporaryDirectory(t);
  const home = join(root, "home");
  mkdirSync(home);
  const output = () => {
    let value = "";
    return { stream: { write(chunk) { value += chunk; } }, value: () => value };
  };

  for (const args of [
    ["install"],
    ["install", "--scope", "global"],
    ["update", "--scope", "user", "--force"],
    ["doctor", "--scope", "user"],
  ]) {
    const stdout = output();
    const stderr = output();
    assert.equal(runCli(args, { stdout: stdout.stream, stderr: stderr.stream, home }), EXIT_CODES.USAGE);
    assert.match(stderr.value(), /usage error/);
  }

  const runtimeError = output();
  assert.equal(
    runCli(["install", "--scope", "user"], {
      stdout: output().stream,
      stderr: runtimeError.stream,
      home,
      nodeVersion: "21.9.0",
    }),
    EXIT_CODES.UNSUPPORTED_RUNTIME,
  );
  assert.match(runtimeError.value(), /UNSUPPORTED_RUNTIME/);

  const scopeError = output();
  assert.equal(
    runCli(["install", "--scope", "project"], {
      stdout: output().stream,
      stderr: scopeError.stream,
      home,
      cwd: root,
    }),
    EXIT_CODES.SCOPE_RESOLUTION,
  );

  assert.equal(
    runCli(["install", "--scope", "user"], { stdout: output().stream, stderr: output().stream, home }),
    EXIT_CODES.OK,
  );
  const conflict = output();
  assert.equal(
    runCli(["install", "--scope", "user"], { stdout: output().stream, stderr: conflict.stream, home }),
    EXIT_CODES.CONFLICT,
  );

  const location = resolveInstallLocation({ scope: "user", home });
  writeFileSync(location.metadataPath, "{broken\n", "utf8");
  const invalid = output();
  assert.equal(
    runCli(["update", "--scope", "user"], { stdout: output().stream, stderr: invalid.stream, home }),
    EXIT_CODES.INVALID_STATE,
  );

  writeFileSync(location.metadataPath, `${JSON.stringify({ broken: true })}\n`, "utf8");
  const doctorFilesystem = output();
  assert.equal(
    runCli(["doctor"], {
      stdout: doctorFilesystem.stream,
      stderr: output().stream,
      home,
      cwd: root,
      commandRunner,
      accessChecker() {
        const error = new Error("denied");
        error.code = "EACCES";
        throw error;
      },
    }),
    EXIT_CODES.FILESYSTEM,
  );

  rmSync(location.metadataPath);
  mkdirSync(join(location.skillsRoot, ".kyw-dev-stage-orphan"));
  const recovery = output();
  assert.equal(
    runCli(["install", "--scope", "user"], { stdout: output().stream, stderr: recovery.stream, home }),
    EXIT_CODES.RECOVERY_REQUIRED,
  );
});

test("packaged managed source inventory is stable and fully hashed", () => {
  const inventory = buildManagedSourceInventory();
  assert.equal(inventory.version, "0.1.0");
  assert.equal(inventory.files.length, 19);
  assert.deepEqual(
    inventory.files.map((file) => file.path),
    [...inventory.files].map((file) => file.path).sort((left, right) => left.localeCompare(right)),
  );
  assert.ok(inventory.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)));
});

test("actual npm tarball installs, diagnoses, runs its installed adapter, and uninstalls", (t) => {
  const root = temporaryDirectory(t, "kyw-dev-packed-smoke-");
  const npmExecutable = process.env.npm_execpath;
  let packed;
  if (npmExecutable) {
    packed = spawnSync(
      process.execPath,
      [npmExecutable, "pack", "--json", "--pack-destination", root],
      { cwd: PACKAGE_ROOT, encoding: "utf8" },
    );
  } else if (process.platform === "win32") {
    packed = spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", "npm", "pack", "--json", "--pack-destination", root],
      { cwd: PACKAGE_ROOT, encoding: "utf8" },
    );
  } else {
    packed = spawnSync("npm", ["pack", "--json", "--pack-destination", root], {
      cwd: PACKAGE_ROOT,
      encoding: "utf8",
    });
  }
  assert.equal(packed.status, 0, packed.stderr);
  const report = JSON.parse(packed.stdout)[0];
  assert.equal(report.entryCount, 29);
  const extractRoot = join(root, "extract");
  mkdirSync(extractRoot);
  const extracted = spawnSync("tar", ["-xf", join(root, report.filename), "-C", extractRoot], {
    encoding: "utf8",
  });
  assert.equal(extracted.status, 0, extracted.stderr);

  const home = join(root, "home");
  const work = join(root, "work");
  const target = join(root, "target");
  mkdirSync(home);
  mkdirSync(work);
  mkdirSync(target);
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const cli = join(extractRoot, "package", "bin", "kyw-dev.mjs");
  const install = spawnSync(process.execPath, [cli, "install", "--scope", "user"], {
    cwd: work,
    env,
    encoding: "utf8",
  });
  assert.equal(install.status, 0, install.stderr);

  const doctor = spawnSync(process.execPath, [cli, "doctor"], { cwd: work, env, encoding: "utf8" });
  assert.equal(doctor.status, 0, doctor.stderr);
  assert.equal(doctor.stderr, "");
  assert.match(doctor.stdout, /Result: healthy/);

  const adapter = join(home, ".agents", "skills", "kyw-task", "scripts", "task-artifacts.mjs");
  const adapterResult = spawnSync(
    process.execPath,
    [adapter, "create", "--tasks-root", join(target, "docs", "tasks"), "--title", "Packed smoke"],
    { encoding: "utf8" },
  );
  assert.equal(adapterResult.status, 0, adapterResult.stderr);
  const created = JSON.parse(adapterResult.stdout);
  assert.equal(created.id, "0001");
  assert.ok(existsSync(join(created.directory, "TASK.md")));
  assert.ok(existsSync(join(created.directory, "TEST.md")));
  const dispatchResult = spawnSync(
    process.execPath,
    [
      adapter,
      "dispatch",
      "--tasks-root",
      join(target, "docs", "tasks"),
      "--invocation",
      "task 0001 실행해줘",
      "--managed-routing",
      "false",
    ],
    { encoding: "utf8" },
  );
  assert.equal(dispatchResult.status, 0, dispatchResult.stderr);
  const dispatchOutput = JSON.parse(dispatchResult.stdout);
  assert.equal(dispatchOutput.outcome, "FALLBACK_REQUIRED");
  assert.equal(dispatchOutput.portableFallback, "$kyw-task 0001");

  const uninstall = spawnSync(process.execPath, [cli, "uninstall", "--scope", "user"], {
    cwd: work,
    env,
    encoding: "utf8",
  });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  assert.equal(existsSync(join(home, ".agents", "skills", INSTALL_METADATA_NAME)), false);
});
