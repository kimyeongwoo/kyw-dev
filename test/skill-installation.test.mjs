import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
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
  resolveInstallLocation,
  resolveScopeLayout,
  uninstallManagedSkills,
  updateManagedSkills,
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

test("project root detection resolves a nested repository without changing cwd", (t) => {
  const root = createRepository(join(temporaryDirectory(t), "repository"));
  const nested = join(root, "src", "feature");
  mkdirSync(nested, { recursive: true });
  const cwd = process.cwd();
  assert.equal(findRepositoryRoot(nested), root);
  assert.equal(process.cwd(), cwd);
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

test("install refuses a symlinked managed Skill path without following it", (t) => {
  const home = temporaryDirectory(t);
  const outside = temporaryDirectory(t, "kyw-dev-symlink-target-");
  const marker = join(outside, "marker.txt");
  writeFileSync(marker, "outside\n", "utf8");
  const skillsRoot = join(home, ".agents", "skills");
  mkdirSync(skillsRoot, { recursive: true });
  const link = join(skillsRoot, "kyw-init");
  try {
    symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) {
      t.skip(`symlinks unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  expectInstallationError(() => installManagedSkills({ scope: "user", home }), {
    code: "INSTALL_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  assert.equal(readFileSync(marker, "utf8"), "outside\n");
  assert.equal(existsSync(join(skillsRoot, INSTALL_METADATA_NAME)), false);
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

test("recovery refuses a transaction owned by another live process", (t) => {
  const home = temporaryDirectory(t);
  const location = resolveInstallLocation({ scope: "user", home });
  mkdirSync(location.skillsRoot, { recursive: true });
  assert.ok(process.ppid > 0);
  writeJson(location.transactionPath, {
    schemaVersion: 1,
    operation: "update",
    scope: "user",
    processId: process.ppid,
    stageDirectory: ".kyw-dev-stage-live-owner",
    backupDirectory: ".kyw-dev-backup-live-owner",
    oldFiles: [],
    newFiles: [],
    hadOldMetadata: false,
    oldMetadataHash: null,
    newMetadataHash: null,
  });

  expectInstallationError(() => recoverInterruptedInstallation(location), {
    code: "INSTALL_CONFLICT",
    exitCode: EXIT_CODES.CONFLICT,
  });
  assert.ok(existsSync(location.transactionPath));
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

  const uninstall = spawnSync(process.execPath, [cli, "uninstall", "--scope", "user"], {
    cwd: work,
    env,
    encoding: "utf8",
  });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  assert.equal(existsSync(join(home, ".agents", "skills", INSTALL_METADATA_NAME)), false);
});
