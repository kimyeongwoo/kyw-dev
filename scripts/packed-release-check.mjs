import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";

import { EXPECTED_TARBALL_FILES, REPOSITORY_ROOT } from "./lib/validate-foundation.mjs";

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

function runNpmPack(destination) {
  const npmExecutable = process.env.npm_execpath;
  if (npmExecutable) {
    return spawnSync(
      process.execPath,
      [npmExecutable, "pack", "--json", "--pack-destination", destination],
      { cwd: REPOSITORY_ROOT, encoding: "utf8" },
    );
  }
  if (process.platform === "win32") {
    return spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", "npm", "pack", "--json", "--pack-destination", destination],
      { cwd: REPOSITORY_ROOT, encoding: "utf8" },
    );
  }
  return spawnSync("npm", ["pack", "--json", "--pack-destination", destination], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });
}

function assertSucceeded(result, label) {
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.error?.message || "unknown process error";
    throw new Error(`${label} failed: ${detail}`);
  }
}

function parsePackReport(stdout) {
  let value;
  try {
    value = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`npm pack did not return JSON: ${error.message}`);
  }
  if (!Array.isArray(value) || value.length !== 1 || !value[0]?.filename) {
    throw new Error("npm pack returned an unexpected report shape");
  }
  return value[0];
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "kyw-dev-packed-release-"));

try {
  const packDirectory = join(temporaryRoot, "pack");
  const extractDirectory = join(temporaryRoot, "extract");
  mkdirSync(packDirectory);
  mkdirSync(extractDirectory);

  const packed = runNpmPack(packDirectory);
  assertSucceeded(packed, "npm pack");
  const report = parsePackReport(packed.stdout);
  const archivePath = resolve(packDirectory, report.filename);
  if (dirname(archivePath) !== resolve(packDirectory) || basename(archivePath) !== report.filename) {
    throw new Error(`npm pack returned an unsafe archive name: ${report.filename}`);
  }
  if (!existsSync(archivePath)) {
    throw new Error(`npm pack did not create ${report.filename}`);
  }

  const actualFiles = report.files.map(({ path }) => path).sort();
  const expectedFiles = [...EXPECTED_TARBALL_FILES].sort();
  const missing = expectedFiles.filter((path) => !actualFiles.includes(path));
  const unexpected = actualFiles.filter((path) => !expectedFiles.includes(path));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Packed release allowlist mismatch; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}`,
    );
  }

  const archive = readFileSync(archivePath);
  if (archive.length !== report.size) {
    throw new Error(`Packed size mismatch: report=${report.size}, actual=${archive.length}`);
  }
  const sha256 = createHash("sha256").update(archive).digest("hex");

  const extracted = spawnSync("tar", ["-xf", archivePath, "-C", extractDirectory], {
    encoding: "utf8",
  });
  assertSucceeded(extracted, "packed release extraction");

  const packageRoot = join(extractDirectory, "package");
  const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  for (const scriptName of forbiddenLifecycleScripts) {
    if (scriptName in (packageJson.scripts ?? {})) {
      throw new Error(`Packed package contains forbidden lifecycle script: ${scriptName}`);
    }
  }
  for (const excludedPath of [".github", "docs", "scripts", "test"]) {
    if (existsSync(join(packageRoot, excludedPath))) {
      throw new Error(`Packed package contains development-only path: ${excludedPath}`);
    }
  }

  const executable = join(packageRoot, packageJson.bin?.["kyw-dev"] ?? "");
  const version = spawnSync(process.execPath, [executable, "--version"], { encoding: "utf8" });
  assertSucceeded(version, "packed CLI version smoke test");
  if (version.stdout !== `${packageJson.version}\n` || version.stderr !== "") {
    throw new Error("Packed CLI version output does not match package metadata");
  }

  const help = spawnSync(process.execPath, [executable, "--help"], { encoding: "utf8" });
  assertSucceeded(help, "packed CLI help smoke test");
  if (!help.stdout.startsWith(`kyw-dev ${packageJson.version}\n`) || help.stderr !== "") {
    throw new Error("Packed CLI help output is not deterministic");
  }

  console.log(
    `packed release check passed (${actualFiles.length} files, ${archive.length} bytes, sha256 ${sha256})`,
  );
} finally {
  const resolvedTemporaryRoot = resolve(temporaryRoot);
  const resolvedSystemTemp = resolve(tmpdir());
  if (!resolvedTemporaryRoot.startsWith(`${resolvedSystemTemp}${sep}`)) {
    throw new Error(`Refusing to remove unexpected temporary path: ${resolvedTemporaryRoot}`);
  }
  rmSync(resolvedTemporaryRoot, { recursive: true, force: true });
}
