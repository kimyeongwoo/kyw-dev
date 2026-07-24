#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const FIXTURE_ROOT = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "spec-behavioral-e2e",
);
export const DIRECT_EVIDENCE_METHOD = "CURRENT_SESSION_DIRECT";

const PERMANENT_DOCUMENTS = Object.freeze([
  "README.md",
  "AGENTS.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
]);

export const SCENARIO_CONTRACTS = Object.freeze([
  Object.freeze({
    id: "S-01",
    acceptance: "SPEC AC-04",
    fixture: "s01-empty",
    intent: "Initialize an empty project only after shared-understanding confirmation.",
    expectedMutations: PERMANENT_DOCUMENTS,
  }),
  Object.freeze({
    id: "S-02",
    acceptance: "SPEC AC-04",
    fixture: "s02-adopt",
    intent: "Adopt an existing project without replacing preserved user or application bytes.",
    expectedMutations: PERMANENT_DOCUMENTS,
  }),
  Object.freeze({
    id: "S-03",
    acceptance: "SPEC AC-05 / AC-06",
    fixture: "s03-task",
    intent: "Atomically allocate the exact next READY Task/Test pair and stop for create-only intent.",
    expectedMutations: Object.freeze([
      "docs/tasks/0004-<allocated-slug>/TASK.md",
      "docs/tasks/0004-<allocated-slug>/TEST.md",
    ]),
  }),
  Object.freeze({
    id: "S-04",
    acceptance: "SPEC AC-05",
    fixture: "S-03 resulting-state copy",
    intent: "Recover the existing create-only READY pair without reallocating or recreating it.",
    expectedMutations: Object.freeze([]),
  }),
  Object.freeze({
    id: "S-05",
    acceptance: "SPEC AC-07",
    fixture: "s05-gap baseline plus working overlay",
    intent: "Detect the intentionally uncovered casual branch despite a passing generic suite.",
    expectedMutations: Object.freeze([
      "docs/tasks/0001-greeting-style/TASK.md and/or TEST.md evidence only",
    ]),
  }),
  Object.freeze({
    id: "S-06",
    acceptance: "SPEC AC-08",
    fixture: "s06-ordinary",
    intent: "Apply a bounded ordinary prompt and route only the changed durable README meaning.",
    expectedMutations: Object.freeze([
      "README.md",
      "src/greeting.mjs",
      "test/greeting.test.mjs",
    ]),
  }),
]);

const EXPECTED_FIXTURE_FILES = Object.freeze([
  "s01-empty/sentinel/user-note.txt",
  "s02-adopt/package.json",
  "s02-adopt/README.md",
  "s02-adopt/src/greeting.mjs",
  "s02-adopt/test/greeting.test.mjs",
  "s03-task/AGENTS.md",
  "s03-task/docs/ARCHITECTURE.md",
  "s03-task/docs/SPEC.md",
  "s03-task/docs/tasks/0001-foundation/.keep",
  "s03-task/docs/tasks/0002-tests/.keep",
  "s03-task/docs/tasks/0003-documentation/.keep",
  "s03-task/package.json",
  "s03-task/README.md",
  "s03-task/src/greeting.mjs",
  "s03-task/test/greeting.test.mjs",
  "s05-gap/baseline/AGENTS.md",
  "s05-gap/baseline/docs/ARCHITECTURE.md",
  "s05-gap/baseline/docs/SPEC.md",
  "s05-gap/baseline/docs/tasks/0001-greeting-style/TASK.md",
  "s05-gap/baseline/docs/tasks/0001-greeting-style/TEST.md",
  "s05-gap/baseline/package.json",
  "s05-gap/baseline/README.md",
  "s05-gap/baseline/src/greeting.mjs",
  "s05-gap/baseline/test/greeting.test.mjs",
  "s05-gap/working/src/greeting.mjs",
  "s05-gap/working/test/greeting.test.mjs",
  "s06-ordinary/AGENTS.md",
  "s06-ordinary/docs/ARCHITECTURE.md",
  "s06-ordinary/docs/SPEC.md",
  "s06-ordinary/package.json",
  "s06-ordinary/README.md",
  "s06-ordinary/src/greeting.mjs",
  "s06-ordinary/test/greeting.test.mjs",
]);
const FIXTURE_TEST_FILES = Object.freeze([
  "s02-adopt/test/greeting.test.mjs",
  "s03-task/test/greeting.test.mjs",
  "s05-gap/working/test/greeting.test.mjs",
  "s06-ordinary/test/greeting.test.mjs",
]);

export class BehavioralAcceptanceError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "BehavioralAcceptanceError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new BehavioralAcceptanceError(code, message, options);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function toPosix(filePath) {
  return filePath.replaceAll("\\", "/");
}

function assertSafeTree(root, label) {
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      const state = lstatSync(entryPath);
      if (entry.isSymbolicLink() || state.isSymbolicLink()) {
        fail("UNSAFE_FIXTURE", `${label} contains a symbolic link`);
      }
      if (entry.isDirectory() && state.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (!entry.isFile() || !state.isFile()) {
        fail("UNSAFE_FIXTURE", `${label} contains an unsupported entry`);
      }
    }
  };
  visit(root);
}

export function snapshotTree(root, { exclude = new Set([".git"]) } = {}) {
  const files = [];
  const tree = createHash("sha256");
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (exclude.has(entry.name)) continue;
      const entryPath = join(directory, entry.name);
      const state = lstatSync(entryPath);
      if (entry.isSymbolicLink() || state.isSymbolicLink()) {
        fail("UNSAFE_FIXTURE", "Snapshot contains a symbolic link");
      }
      if (entry.isDirectory() && state.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (!entry.isFile() || !state.isFile()) {
        fail("UNSAFE_FIXTURE", "Snapshot contains an unsupported entry");
      }
      const relativePath = toPosix(relative(root, entryPath));
      const bytes = readFileSync(entryPath);
      const digest = sha256(bytes);
      files.push(Object.freeze({ path: relativePath, sha256: digest, size: bytes.length }));
      tree.update(relativePath, "utf8");
      tree.update("\0");
      tree.update(bytes);
      tree.update("\0");
    }
  };
  visit(root);
  return Object.freeze({
    sha256: tree.digest("hex"),
    files: Object.freeze(files),
  });
}

export function mutationManifest(before, after) {
  const beforeFiles = new Map(before.files.map((entry) => [entry.path, entry]));
  const afterFiles = new Map(after.files.map((entry) => [entry.path, entry]));
  const paths = new Set([...beforeFiles.keys(), ...afterFiles.keys()]);
  return Object.freeze(
    [...paths]
      .sort()
      .flatMap((path) => {
        const previous = beforeFiles.get(path);
        const current = afterFiles.get(path);
        if (!previous) return [Object.freeze({ path, kind: "added" })];
        if (!current) return [Object.freeze({ path, kind: "removed" })];
        if (previous.sha256 !== current.sha256 || previous.size !== current.size) {
          return [Object.freeze({ path, kind: "modified" })];
        }
        return [];
      }),
  );
}

function preservationBlock(readme) {
  return /<!-- KYW-PRESERVE-BEGIN -->[\s\S]*?<!-- KYW-PRESERVE-END -->/.exec(readme)?.[0];
}

export function fixtureGapProof(repository) {
  const source = readFileSync(join(repository, "src", "greeting.mjs"), "utf8");
  const test = readFileSync(join(repository, "test", "greeting.test.mjs"), "utf8");
  const sourceHasFormalBranch = source.includes("acceptance-branch: formal");
  const sourceHasCasualBranch = source.includes("acceptance-branch: casual");
  const testExercisesFormal = test.includes('"formal"');
  const testExercisesCasual = /"casual"|Hi, Ada/.test(test);
  return Object.freeze({
    sourceHasFormalBranch,
    sourceHasCasualBranch,
    testExercisesFormal,
    testExercisesCasual,
    intentionalGapProven:
      sourceHasFormalBranch &&
      sourceHasCasualBranch &&
      testExercisesFormal &&
      !testExercisesCasual,
  });
}

function runFixtureTests(onLaunch) {
  const launch = Object.freeze({
    scenarioIds: Object.freeze(["S-02", "S-03", "S-05", "S-06"]),
    command: process.execPath,
    args: Object.freeze(["--test", ...FIXTURE_TEST_FILES]),
  });
  onLaunch?.(launch);
  return spawnSync(launch.command, launch.args, {
    cwd: FIXTURE_ROOT,
    encoding: "utf8",
    timeout: 60_000,
    windowsHide: true,
  });
}

export async function validateFixtureContracts({ onLaunch } = {}) {
  const errors = [];
  if (!existsSync(FIXTURE_ROOT)) return ["behavioral fixture root is missing"];
  assertSafeTree(FIXTURE_ROOT, "behavioral fixture root");

  const actualFiles = snapshotTree(FIXTURE_ROOT, { exclude: new Set() }).files.map(
    ({ path }) => path,
  );
  if (JSON.stringify(actualFiles) !== JSON.stringify(EXPECTED_FIXTURE_FILES)) {
    errors.push("fixture inventory differs from the exact 33-file contract");
  }

  const adoptReadme = readFileSync(join(FIXTURE_ROOT, "s02-adopt", "README.md"), "utf8");
  if (!preservationBlock(adoptReadme)) errors.push("S-02 preservation block is missing");
  for (const scenarioName of ["s03-task", "s05-gap/baseline", "s06-ordinary"]) {
    const agentsPath = join(FIXTURE_ROOT, ...scenarioName.split("/"), "AGENTS.md");
    if (statSync(agentsPath).size >= 4096) {
      errors.push(`${scenarioName} AGENTS.md is not thin`);
    }
  }

  const genericResult = runFixtureTests(onLaunch);
  if (genericResult.status !== 0) {
    errors.push("S-02/S-03/S-05/S-06 generic fixture suite failed");
  }
  const gapRepository = join(FIXTURE_ROOT, "s05-gap", "working");
  if (!fixtureGapProof(gapRepository).intentionalGapProven) {
    errors.push("S-05 intentional branch gap is not independently proven");
  }
  return errors;
}

function stripCodeBlocks(message) {
  return message.replace(/```[\s\S]*?```/g, "");
}

export function questionCount(message) {
  return (
    stripCodeBlocks(message).match(
      /(?:^|\n)\s*(?:#{1,6}\s*)?(?:question(?:\s+\d+)?\s*[:—-]|[^.!?\n]{2,}\?)/gim,
    ) ?? []
  ).length;
}

export function recommendationCount(message) {
  return (
    stripCodeBlocks(message).match(
      /(?:^|\n)\s*(?:[-*]\s*)?(?:#{1,6}\s*)?(?:recommendation|recommended answer)\s*[:—-]/gim,
    ) ?? []
  ).length;
}

export function coverageGapClaim(message) {
  return (
    /casual/i.test(message) &&
    /(?:uncovered|untested|not covered|coverage gap|lacks?[^.\n]{0,80}coverage)/i.test(message)
  );
}

export function documentationImpactClaim(message) {
  return /(?:documentation|permanent-document) impact/i.test(message);
}

export function expectedMutationSet(id) {
  const contract = SCENARIO_CONTRACTS.find((scenario) => scenario.id === id);
  return contract ? [...contract.expectedMutations] : undefined;
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(value ?? "");
}

export function validateDirectScenarioEvidence(record) {
  const errors = [];
  const requireCheck = (name, expected = true) => {
    if (record.checks?.[name] !== expected) errors.push(`${record.id}: ${name}`);
  };
  const expectedMutations = expectedMutationSet(record.id);
  if (!expectedMutations) {
    errors.push("scenario ID is invalid");
    return errors;
  }
  if (record.method !== DIRECT_EVIDENCE_METHOD) {
    errors.push(`${record.id}: evidence method must be ${DIRECT_EVIDENCE_METHOD}`);
  }
  if (JSON.stringify(record.expectedMutationSet) !== JSON.stringify(expectedMutations)) {
    errors.push(`${record.id}: expected mutation set`);
  }
  if (!isSha256(record.fixtureBeforeSha256) || !isSha256(record.fixtureAfterSha256)) {
    errors.push(`${record.id}: fixture tree hashes are incomplete`);
  }
  if (
    !isSha256(record.package?.sourceTreeSha256) ||
    !isSha256(record.package?.tarballSha256) ||
    record.package?.packedBytesMatch !== true
  ) {
    errors.push(`${record.id}: package byte identity is incomplete`);
  }
  if (
    !Array.isArray(record.commands) ||
    record.commands.length === 0 ||
    record.commands.some(
      (command) =>
        typeof command?.label !== "string" ||
        !command.label.trim() ||
        !Number.isInteger(command.exitCode),
    )
  ) {
    errors.push(`${record.id}: command evidence is incomplete`);
  }
  requireCheck("expectedMutationManifest");
  if ((record.checks?.unexpectedMutations ?? []).length > 0) {
    errors.push(`${record.id}: unexpected fixture mutation`);
  }
  requireCheck("unsupportedTerminalClaim", false);

  if (record.id === "S-01") {
    for (const name of [
      "interviewProtocol",
      "confirmationRequested",
      "documentsComplete",
      "agentsThin",
      "noTask",
      "noApplication",
      "sentinelPreserved",
    ]) {
      requireCheck(name);
    }
    requireCheck("preConfirmationDurableWrites", false);
  }
  if (record.id === "S-02") {
    for (const name of [
      "interviewProtocol",
      "confirmationRequested",
      "documentsComplete",
      "adoptMode",
      "preservationSection",
      "applicationPreserved",
      "noTask",
    ]) {
      requireCheck(name);
    }
    requireCheck("preConfirmationDurableWrites", false);
  }
  if (record.id === "S-03") {
    for (const name of [
      "singleTaskCreated",
      "pairComplete",
      "traceability",
      "readyPair",
      "createOnlyStop",
      "applicationUnchanged",
    ]) {
      requireCheck(name);
    }
    if (record.checks?.taskNumber !== "0004") errors.push("S-03: wrong Task number");
  }
  if (record.id === "S-04") {
    for (const name of [
      "existingTaskPreserved",
      "permanentDocsRead",
      "taskPairRead",
      "gitStateRead",
      "handoffFieldsRead",
      "readyPair",
      "createOnlyStop",
    ]) {
      requireCheck(name);
    }
    requireCheck("resumeAllocatedTask", false);
  }
  if (record.id === "S-05") {
    for (const name of [
      "genericSuitePass",
      "intentionalGapProven",
      "diffInspected",
      "genericTestExecuted",
      "gapDetected",
      "gapRecorded",
      "productTestsUnchanged",
    ]) {
      requireCheck(name);
    }
  }
  if (record.id === "S-06") {
    for (const name of [
      "noSkillInvocation",
      "sourceChanged",
      "testChanged",
      "readmeImpactHandled",
      "proportionateVerification",
      "finalDocumentationReport",
    ]) {
      requireCheck(name);
    }
    requireCheck("ordinaryCreatedTask", false);
  }
  return errors;
}

export function directScenarioVerdict(record) {
  const errors = validateDirectScenarioEvidence(record);
  return Object.freeze({ verdict: errors.length === 0 ? "PASS" : "FAIL", errors });
}

function usage() {
  return "Usage: node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures";
}

async function main(argv) {
  if (argv.length !== 1 || argv[0] !== "--validate-fixtures") {
    fail("INVALID_ARGUMENT", usage());
  }
  const errors = await validateFixtureContracts();
  if (errors.length > 0) fail("FIXTURE_INVALID", errors.join("; "));
  process.stdout.write(
    `${JSON.stringify({ valid: true, method: DIRECT_EVIDENCE_METHOD, scenarioCount: 6 })}\n`,
  );
}

function isMainModule() {
  return (
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  main(process.argv.slice(2)).catch((error) => {
    const code =
      typeof error?.code === "string" ? error.code : "SPEC_BEHAVIORAL_ACCEPTANCE_FAILED";
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${code}: ${message}\n`);
    process.exitCode = 1;
  });
}
