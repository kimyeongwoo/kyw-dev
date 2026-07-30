import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_TARBALL_FILES,
  PRESERVED_LEGAL_HASHES,
  RELEASE_METADATA,
  REPOSITORY_ROOT,
  assertFoundation,
} from "./lib/validate-foundation.mjs";

export const RETAINED_CANDIDATE_SCHEMA_VERSION = 1;
export const PACKED_RELEASE_TEMPORARY_PREFIX = "kyw-dev-packed-release-";

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

function pathIsWithin(parent, candidate) {
  const child = relative(parent, candidate);
  return (
    child === "" ||
    (child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child))
  );
}

function canonicalDirectory(directory, label) {
  if (typeof directory !== "string" || !isAbsolute(directory)) {
    throw new Error(`${label} must be an absolute path`);
  }
  if (!existsSync(directory)) {
    throw new Error(`${label} does not exist`);
  }
  const metadata = lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a physical directory`);
  }
  return realpathSync(directory);
}

function safeTemporaryParent(temporaryParent = tmpdir()) {
  const systemTemporaryRoot = canonicalDirectory(resolve(tmpdir()), "system temporary root");
  const parent = canonicalDirectory(resolve(temporaryParent), "candidate temporary parent");
  if (!pathIsWithin(systemTemporaryRoot, parent)) {
    throw new Error("Candidate temporary parent must stay within the system temporary root");
  }

  const repositoryRoot = realpathSync(REPOSITORY_ROOT);
  if (pathIsWithin(repositoryRoot, parent) || pathIsWithin(parent, repositoryRoot)) {
    throw new Error("Candidate temporary parent must not overlap the repository");
  }
  return parent;
}

function assertCandidateRootName(candidateRoot) {
  const name = basename(candidateRoot);
  if (
    !name.startsWith(PACKED_RELEASE_TEMPORARY_PREFIX) ||
    !/^[A-Za-z0-9._-]+$/.test(name) ||
    name.length > 160
  ) {
    throw new Error("Candidate root has an unsafe name");
  }
}

export function assertOwnedCandidateRoot(
  candidateRoot,
  { temporaryParent = tmpdir(), requireRetainedStructure = false } = {},
) {
  if (typeof candidateRoot !== "string" || !isAbsolute(candidateRoot)) {
    throw new Error("Candidate root must be an absolute path");
  }
  const parent = safeTemporaryParent(temporaryParent);
  const resolvedRoot = resolve(candidateRoot);
  assertCandidateRootName(resolvedRoot);
  const physicalCandidateParent = canonicalDirectory(
    dirname(resolvedRoot),
    "candidate root parent",
  );
  if (physicalCandidateParent !== parent) {
    throw new Error("Candidate root must be a direct child of its temporary parent");
  }
  if (!existsSync(resolvedRoot)) {
    throw new Error("Candidate root does not exist");
  }
  const metadata = lstatSync(resolvedRoot);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Candidate root must be a physical directory");
  }
  const physicalRoot = realpathSync(resolvedRoot);
  if (
    dirname(physicalRoot) !== parent ||
    basename(physicalRoot) !== basename(resolvedRoot)
  ) {
    throw new Error("Candidate root physical identity changed");
  }

  if (requireRetainedStructure) {
    const rootEntries = readdirSync(physicalRoot, { withFileTypes: true });
    if (
      rootEntries.length !== 1 ||
      rootEntries[0].name !== "pack" ||
      !rootEntries[0].isDirectory() ||
      rootEntries[0].isSymbolicLink()
    ) {
      throw new Error("Retained candidate root has an unexpected structure");
    }
    const packDirectory = join(physicalRoot, "pack");
    const packMetadata = lstatSync(packDirectory);
    if (!packMetadata.isDirectory() || packMetadata.isSymbolicLink()) {
      throw new Error("Retained candidate pack path must be a physical directory");
    }
    const archiveEntries = readdirSync(packDirectory, { withFileTypes: true });
    const expectedFilename = `${RELEASE_METADATA.name}-${RELEASE_METADATA.version}.tgz`;
    if (
      archiveEntries.length !== 1 ||
      archiveEntries[0].name !== expectedFilename ||
      !archiveEntries[0].isFile() ||
      archiveEntries[0].isSymbolicLink()
    ) {
      throw new Error("Retained candidate root must contain exactly the expected archive");
    }
  }
  return physicalRoot;
}

export function prepareCandidateRoot({
  temporaryParent = tmpdir(),
  candidateRoot,
} = {}) {
  const parent = safeTemporaryParent(temporaryParent);
  if (candidateRoot === undefined) {
    return mkdtempSync(join(parent, PACKED_RELEASE_TEMPORARY_PREFIX));
  }
  if (typeof candidateRoot !== "string" || !isAbsolute(candidateRoot)) {
    throw new Error("Requested candidate root must be an absolute path");
  }
  const resolvedRoot = resolve(candidateRoot);
  assertCandidateRootName(resolvedRoot);
  const physicalCandidateParent = canonicalDirectory(
    dirname(resolvedRoot),
    "requested candidate root parent",
  );
  if (physicalCandidateParent !== parent) {
    throw new Error("Requested candidate root must be a direct child of its temporary parent");
  }
  if (existsSync(resolvedRoot)) {
    throw new Error("Requested candidate root already exists");
  }
  mkdirSync(resolvedRoot);
  return assertOwnedCandidateRoot(resolvedRoot, { temporaryParent });
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
      } else {
        throw new Error(`Packed package contains unsupported filesystem entry: ${entryPath}`);
      }
    }
  }
  visit(root);
  return files;
}

export function assertPackedHygiene(packageRoot) {
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

export function runNpmPack(destination) {
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

export function parsePackReport(stdout) {
  let value;
  try {
    value = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`npm pack did not return JSON: ${error.message}`);
  }
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    typeof value[0]?.filename !== "string" ||
    !Array.isArray(value[0]?.files)
  ) {
    throw new Error("npm pack returned an unexpected report shape");
  }
  return value[0];
}

function removeOwnedWorkingRoot(candidateRoot, temporaryParent) {
  const ownedRoot = assertOwnedCandidateRoot(candidateRoot, { temporaryParent });
  rmSync(ownedRoot, { recursive: true });
}

function removeOwnedExtractDirectory(extractDirectory, candidateRoot) {
  const ownedRoot = resolve(candidateRoot);
  const resolvedExtract = resolve(extractDirectory);
  if (dirname(resolvedExtract) !== ownedRoot || basename(resolvedExtract) !== "extract") {
    throw new Error("Refusing to remove an unexpected extraction directory");
  }
  const metadata = lstatSync(resolvedExtract);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Extraction path must remain a physical directory");
  }
  rmSync(resolvedExtract, { recursive: true });
}

export function cleanupPackedReleaseCandidate(
  candidateRoot,
  { temporaryParent = tmpdir() } = {},
) {
  const ownedRoot = assertOwnedCandidateRoot(candidateRoot, {
    temporaryParent,
    requireRetainedStructure: true,
  });
  rmSync(ownedRoot, { recursive: true });
  if (existsSync(ownedRoot)) {
    throw new Error("Retained candidate cleanup did not remove the owned root");
  }
  return Object.freeze({
    schemaVersion: RETAINED_CANDIDATE_SCHEMA_VERSION,
    kind: "KYW_PACKED_RELEASE_CANDIDATE_CLEANUP",
    cleaned: true,
  });
}

export function createPackedReleaseCandidate({
  retainCandidate = false,
  temporaryParent = tmpdir(),
  candidateRoot,
  packRunner = runNpmPack,
} = {}) {
  assertFoundation();

  const temporaryRoot = prepareCandidateRoot({ temporaryParent, candidateRoot });
  let keepTemporaryRoot = false;
  try {
    const packDirectory = join(temporaryRoot, "pack");
    const extractDirectory = join(temporaryRoot, "extract");
    mkdirSync(packDirectory);
    mkdirSync(extractDirectory);

    const packed = packRunner(packDirectory);
    assertSucceeded(packed, "npm pack");
    const report = parsePackReport(packed.stdout);
    const expectedFilename = `${RELEASE_METADATA.name}-${RELEASE_METADATA.version}.tgz`;
    if (
      report.name !== RELEASE_METADATA.name ||
      report.version !== RELEASE_METADATA.version ||
      report.filename !== expectedFilename ||
      !Number.isSafeInteger(report.size) ||
      report.size <= 0 ||
      !Number.isSafeInteger(report.unpackedSize) ||
      report.unpackedSize <= 0 ||
      typeof report.integrity !== "string" ||
      typeof report.shasum !== "string" ||
      !report.files.every(
        ({ path, size }) =>
          typeof path === "string" &&
          path.length > 0 &&
          Number.isSafeInteger(size) &&
          size >= 0,
      ) ||
      (report.entryCount !== undefined && report.entryCount !== report.files.length) ||
      report.files.reduce((total, file) => total + file.size, 0) !== report.unpackedSize
    ) {
      throw new Error("npm pack report identity or metadata is invalid");
    }

    const archivePath = resolve(packDirectory, report.filename);
    if (
      dirname(archivePath) !== resolve(packDirectory) ||
      basename(archivePath) !== report.filename
    ) {
      throw new Error(`npm pack returned an unsafe archive name: ${report.filename}`);
    }
    if (!existsSync(archivePath)) {
      throw new Error(`npm pack did not create ${report.filename}`);
    }
    const archiveMetadata = lstatSync(archivePath);
    if (!archiveMetadata.isFile() || archiveMetadata.isSymbolicLink()) {
      throw new Error("npm pack archive must be a physical file");
    }

    const actualFiles = report.files.map(({ path }) => path).sort();
    const expectedFiles = [...EXPECTED_TARBALL_FILES].sort();
    const duplicateFiles = actualFiles.filter(
      (path, index) => index > 0 && path === actualFiles[index - 1],
    );
    const missing = expectedFiles.filter((path) => !actualFiles.includes(path));
    const unexpected = actualFiles.filter((path) => !expectedFiles.includes(path));
    if (
      actualFiles.length !== expectedFiles.length ||
      duplicateFiles.length > 0 ||
      missing.length > 0 ||
      unexpected.length > 0
    ) {
      throw new Error(
        `Packed release allowlist mismatch; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}; duplicate: ${duplicateFiles.join(", ") || "none"}`,
      );
    }

    const archive = readFileSync(archivePath);
    if (archive.length !== report.size) {
      throw new Error(`Packed size mismatch: report=${report.size}, actual=${archive.length}`);
    }
    const archiveSha256 = sha256(archive);
    const archiveShasum = createHash("sha1").update(archive).digest("hex");
    const archiveIntegrity = `sha512-${createHash("sha512")
      .update(archive)
      .digest("base64")}`;
    if (report.shasum !== archiveShasum || report.integrity !== archiveIntegrity) {
      throw new Error("Packed archive digest does not match npm pack metadata");
    }

    const extracted = spawnSync("tar", ["-xf", archivePath, "-C", extractDirectory], {
      encoding: "utf8",
    });
    assertSucceeded(extracted, "packed release extraction");

    const packageRoot = join(extractDirectory, "package");
    const extractedFiles = collectFiles(packageRoot)
      .map((filePath) => relative(packageRoot, filePath).split(sep).join("/"))
      .sort();
    if (JSON.stringify(extractedFiles) !== JSON.stringify(expectedFiles)) {
      throw new Error("Extracted archive files do not match the package allowlist");
    }
    const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    const pluginJson = JSON.parse(
      readFileSync(join(packageRoot, ".codex-plugin", "plugin.json"), "utf8"),
    );
    if (
      packageJson.name !== RELEASE_METADATA.name ||
      packageJson.version !== RELEASE_METADATA.version ||
      pluginJson.name !== packageJson.name ||
      pluginJson.version !== packageJson.version ||
      "dependencies" in packageJson ||
      "devDependencies" in packageJson
    ) {
      throw new Error("Packed package/plugin identity or dependency contract is invalid");
    }
    for (const scriptName of forbiddenLifecycleScripts) {
      if (scriptName in (packageJson.scripts ?? {})) {
        throw new Error(`Packed package contains forbidden lifecycle script: ${scriptName}`);
      }
    }
    assertPackedHygiene(packageRoot);

    const executable = join(packageRoot, packageJson.bin?.["kyw-dev"] ?? "");
    const version = spawnSync(process.execPath, [executable, "--version"], {
      encoding: "utf8",
    });
    assertSucceeded(version, "packed CLI version smoke test");
    if (version.stdout !== `${packageJson.version}\n` || version.stderr !== "") {
      throw new Error("Packed CLI version output does not match package metadata");
    }

    const help = spawnSync(process.execPath, [executable, "--help"], {
      encoding: "utf8",
    });
    assertSucceeded(help, "packed CLI help smoke test");
    if (!help.stdout.startsWith(`kyw-dev ${packageJson.version}\n`) || help.stderr !== "") {
      throw new Error("Packed CLI help output is not deterministic");
    }

    removeOwnedExtractDirectory(extractDirectory, temporaryRoot);
    const candidate = Object.freeze({
      schemaVersion: RETAINED_CANDIDATE_SCHEMA_VERSION,
      kind: "KYW_PACKED_RELEASE_CANDIDATE",
      retained: Boolean(retainCandidate),
      ownedRoot: resolve(temporaryRoot),
      archivePath,
      filename: report.filename,
      name: packageJson.name,
      version: packageJson.version,
      fileCount: actualFiles.length,
      size: archive.length,
      unpackedSize: report.unpackedSize,
      integrity: archiveIntegrity,
      shasum: archiveShasum,
      sha256: archiveSha256,
    });
    if (retainCandidate) {
      assertOwnedCandidateRoot(temporaryRoot, {
        temporaryParent,
        requireRetainedStructure: true,
      });
      keepTemporaryRoot = true;
    }
    return candidate;
  } finally {
    if (!keepTemporaryRoot && existsSync(temporaryRoot)) {
      removeOwnedWorkingRoot(temporaryRoot, temporaryParent);
    }
  }
}

function usage() {
  return [
    "Usage: node ./scripts/packed-release-check.mjs",
    "   or: node ./scripts/packed-release-check.mjs --retain-candidate",
    "   or: node ./scripts/packed-release-check.mjs --cleanup-candidate <absolute-owned-root>",
  ].join("\n");
}

function runCli(argv) {
  if (argv.length === 0) {
    const candidate = createPackedReleaseCandidate();
    console.log(
      `packed release check passed (${candidate.fileCount} files, ${candidate.size} bytes, sha256 ${candidate.sha256})`,
    );
    return;
  }
  if (argv.length === 1 && argv[0] === "--retain-candidate") {
    const candidate = createPackedReleaseCandidate({ retainCandidate: true });
    console.log(JSON.stringify(candidate));
    return;
  }
  if (argv.length === 2 && argv[0] === "--cleanup-candidate") {
    console.log(JSON.stringify(cleanupPackedReleaseCandidate(argv[1])));
    return;
  }
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    console.log(usage());
    return;
  }
  throw new Error("Unsupported packed release check arguments");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(`packed release check failed: ${error.message}`);
    console.error(usage());
    process.exitCode = 1;
  }
}
