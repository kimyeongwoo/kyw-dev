import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";

import {
  EXPECTED_TARBALL_FILES,
  PRESERVED_LEGAL_HASHES,
  RELEASE_METADATA,
  REPOSITORY_ROOT,
  assertFoundation,
} from "./lib/validate-foundation.mjs";

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

const forbiddenPackageRoots = [
  ".agents",
  ".github",
  ".npmrc",
  "DOCUMENT_BUNDLE.txt",
  "auth.json",
  "docs",
  "eval",
  "scripts",
  "test",
];

const packedTextPatterns = [
  {
    label: "credential-shaped token",
    pattern:
      /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,})\b/,
  },
  {
    label: "private key",
    pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/,
  },
  {
    label: "credential assignment",
    pattern: /(?:^|\s)(?:_authToken|npmAuthToken|password|passwd)\s*[:=]\s*["']?[^<\s"']{8,}/im,
  },
  {
    label: "Windows absolute path",
    pattern: /(?:^|[\s"'(=])[A-Za-z]:[\\/][^\s"'`)]+/m,
  },
  {
    label: "UNC absolute path",
    pattern: /(?:^|[\s"'(=])\\\\[^\\\s]+\\[^\s"'`)]+/m,
  },
  {
    label: "local POSIX absolute path",
    pattern: /(?:^|[\s"'(=])\/(?:Users|home|root|tmp|private\/tmp)\/[^\s"'`)]+/m,
  },
  {
    label: "local file dependency",
    pattern: /\bfile:(?:\.\.?[\\/]|\/|[A-Za-z]:[\\/])/i,
  },
];

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
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

function assertPackedHygiene(packageRoot) {
  for (const excludedPath of forbiddenPackageRoots) {
    if (existsSync(join(packageRoot, excludedPath))) {
      throw new Error(`Packed package contains forbidden path: ${excludedPath}`);
    }
  }

  for (const filePath of collectFiles(packageRoot)) {
    if (
      !/\.(?:json|md|mjs|txt|yaml|yml)$/.test(filePath) &&
      basename(filePath).toUpperCase() !== "LICENSE"
    ) {
      continue;
    }
    const contents = readFileSync(filePath, "utf8");
    if (contents.includes(REPOSITORY_ROOT)) {
      throw new Error(`Packed file exposes the source checkout path: ${filePath}`);
    }
    for (const { label, pattern } of packedTextPatterns) {
      if (pattern.test(contents)) {
        throw new Error(`Packed file contains ${label}: ${filePath}`);
      }
    }
  }

  const projectLicense = readFileSync(join(packageRoot, "LICENSE"), "utf8");
  if (!projectLicense.includes(RELEASE_METADATA.copyright)) {
    throw new Error("Packed project LICENSE does not contain the confirmed copyright holder");
  }

  for (const [relativePath, expectedHash] of Object.entries(PRESERVED_LEGAL_HASHES)) {
    const actualHash = sha256(readFileSync(join(packageRoot, ...relativePath.split("/"))));
    if (actualHash !== expectedHash) {
      throw new Error(`Packed legal file hash mismatch: ${relativePath}`);
    }
  }
  const thirdPartyNotice = readFileSync(join(packageRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
  const upstreamLicense = readFileSync(
    join(packageRoot, "licenses", "mattpocock-skills-MIT.txt"),
    "utf8",
  );
  if (!thirdPartyNotice.includes("Copyright (c) 2026 Matt Pocock")) {
    throw new Error("Packed third-party notice is missing Matt Pocock attribution");
  }
  if (!upstreamLicense.startsWith("MIT License\n\nCopyright (c) 2026 Matt Pocock\n")) {
    throw new Error("Packed upstream MIT license is incomplete");
  }
}

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

assertFoundation();

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
  const archiveSha256 = sha256(archive);

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
  assertPackedHygiene(packageRoot);

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
    `packed release check passed (${actualFiles.length} files, ${archive.length} bytes, sha256 ${archiveSha256})`,
  );
} finally {
  const resolvedTemporaryRoot = resolve(temporaryRoot);
  const resolvedSystemTemp = resolve(tmpdir());
  if (!resolvedTemporaryRoot.startsWith(`${resolvedSystemTemp}${sep}`)) {
    throw new Error(`Refusing to remove unexpected temporary path: ${resolvedTemporaryRoot}`);
  }
  rmSync(resolvedTemporaryRoot, { recursive: true, force: true });
}
