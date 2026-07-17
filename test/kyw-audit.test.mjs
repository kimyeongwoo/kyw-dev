import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const README_PATH = join(REPOSITORY_ROOT, "README.md");
const ARCHITECTURE_PATH = join(REPOSITORY_ROOT, "docs", "ARCHITECTURE.md");
const SKILL_PATH = join(REPOSITORY_ROOT, "skills", "kyw-audit", "SKILL.md");
const METADATA_PATH = join(REPOSITORY_ROOT, "skills", "kyw-audit", "agents", "openai.yaml");
const AUDIT_REFERENCE_PATH = join(
  REPOSITORY_ROOT,
  "skills",
  "kyw-audit",
  "references",
  "audit.md",
);
const FIXTURE_PATH = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "kyw-audit",
  "scenarios.json",
);

const scenarios = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));

function frontmatterFields(skill) {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1];
  assert.ok(block, "SKILL.md must have YAML front matter");
  return Object.fromEntries(
    block.split("\n").map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator), line.slice(separator + 1).trim()];
    }),
  );
}

test("kyw-audit Skill is implemented, explicit-only, and routes one Task to its audit reference", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  const metadata = await readFile(METADATA_PATH, "utf8");
  const frontmatter = frontmatterFields(skill);

  assert.deepEqual(Object.keys(frontmatter), ["name", "description"]);
  assert.equal(frontmatter.name, "kyw-audit");
  assert.match(frontmatter.description, /explicitly invokes \$kyw-audit with a four-digit Task ID/);
  assert.match(frontmatter.description, /do not use for general code review/);
  assert.doesNotMatch(skill, /is not implemented yet/);
  assert.match(skill, /Accept exactly one four-digit Task ID/);
  assert.match(skill, /\[Independent Task Audit\]\(references\/audit\.md\)/);
  assert.match(skill, /Start read-only/);
  assert.match(skill, /Do not edit another numbered Task/);
  assert.match(skill, /exactly one final verdict: `PASS` or `BLOCKED`/);
  assert.match(metadata, /short_description: "Independently audit one Task's evidence"/);
  assert.match(metadata, /default_prompt: "Use \$kyw-audit with a four-digit Task ID /);
  assert.match(metadata, /policy:\n  allow_implicit_invocation: false\n/);
  assert.doesNotMatch(metadata, /^dependencies:/m);
});

test("kyw-audit establishes an independent baseline and a stable finding contract", async () => {
  const audit = await readFile(AUDIT_REFERENCE_PATH, "utf8");

  assert.match(audit, /## Contents/);
  assert.match(audit, /Inspect version-control status before any mutation/);
  assert.match(audit, /pre-change snapshot, supplied patch, release artifact, file inventory, or hashes/);
  assert.match(audit, /Return `BLOCKED` when the substitute cannot establish the scope and behavior/);
  assert.match(audit, /A validator pass is useful evidence, not a substitute for this audit/);
  assert.match(audit, /Assign findings stable sequential IDs `F-01`, `F-02`/);
  for (const category of ["scope", "behavior", "architecture", "docs", "test-evidence"]) {
    assert.match(audit, new RegExp(`- \`${category}\`:`));
  }
  for (const severity of ["BLOCKER", "ERROR", "WARNING"]) {
    assert.match(audit, new RegExp(`- \`${severity}\`:`));
  }
  for (const field of ["Evidence", "Expected / actual", "Scope", "Action", "Status"]) {
    assert.match(audit, new RegExp(`\\| ${field.replace("/", "\\/")} \\|`));
  }
});

test("kyw-audit catches an acceptance criterion with no matrix mapping", async () => {
  const audit = await readFile(AUDIT_REFERENCE_PATH, "utf8");
  const scenario = scenarios.unmappedAcceptance;
  const mapped = new Set(scenario.testRows.flatMap(({ acceptanceIds }) => acceptanceIds));
  const missing = scenario.acceptanceCriteria.filter((id) => !mapped.has(id));

  assert.deepEqual(missing, scenario.expected.missingAcceptanceIds);
  assert.equal(scenario.expected.category, "test-evidence");
  assert.equal(scenario.expected.severity, "ERROR");
  assert.equal(scenario.expected.status, "OPEN");
  assert.equal(scenario.expected.verdict, "BLOCKED");
  assert.match(audit, /Confirm that each criterion maps to at least one matrix row/);
  assert.match(audit, /Record an unmapped criterion or unsupported `PASS` as an `ERROR`/);
});

test("kyw-audit rejects a PASS row without executable reproducible evidence", async () => {
  const audit = await readFile(AUDIT_REFERENCE_PATH, "utf8");
  const scenario = scenarios.unsupportedPass;
  const execution = scenario.executionRecord;

  assert.equal(scenario.row.status, "PASS");
  assert.equal(scenario.row.evidence, "All tests passed.");
  assert.equal(execution.command, null);
  assert.equal(execution.exitCode, null);
  assert.equal(execution.reproducible, false);
  assert.equal(scenario.expected.category, "test-evidence");
  assert.equal(scenario.expected.severity, "ERROR");
  assert.equal(scenario.expected.verdict, "BLOCKED");
  assert.match(audit, /Treat a `PASS` row as a claim/);
  assert.match(audit, /exact executed command or explicit verification procedure/);
  assert.match(audit, /`all tests passed`.*do not support `PASS`/);
  assert.match(audit, /Never downgrade it because unrelated tests pass/);
});

test("kyw-audit catches stale SPEC behavior and stale ARCHITECTURE ownership", async () => {
  const audit = await readFile(AUDIT_REFERENCE_PATH, "utf8");
  const { spec, architecture } = scenarios.staleDocuments;

  assert.notEqual(spec.implementation, spec.documented);
  assert.equal(spec.owner, "docs/SPEC.md");
  assert.equal(spec.expectedCategory, "docs");
  assert.equal(spec.repairScope, "in-scope");
  assert.equal(spec.initialVerdict, "BLOCKED");
  assert.notEqual(architecture.implementation, architecture.documented);
  assert.equal(architecture.owner, "docs/ARCHITECTURE.md");
  assert.equal(architecture.expectedCategory, "architecture");
  assert.equal(architecture.repairScope, "in-scope");
  assert.equal(architecture.initialVerdict, "BLOCKED");
  assert.match(audit, /Compare implementation behavior with `docs\/SPEC\.md`/);
  assert.match(audit, /compare components, boundaries, dependencies, data flow, storage, and distribution with `docs\/ARCHITECTURE\.md`/);
  assert.match(audit, /a durable behavior or structure change must update its owner/);
  assert.match(audit, /Restore stale documentation when implementation already matches established Task intent/);
});

test("kyw-audit blocks out-of-scope implementation and proposes rather than creates follow-on work", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  const audit = await readFile(AUDIT_REFERENCE_PATH, "utf8");
  const scenario = scenarios.scopeDrift;
  const pathIsInScope = scenario.inScopePaths.some((path) => scenario.changedPath.startsWith(path));

  assert.equal(pathIsInScope, false);
  assert.equal(scenario.acceptanceMapping, null);
  assert.deepEqual(scenario.mutationLog, []);
  assert.equal(scenario.expected.category, "scope");
  assert.equal(scenario.expected.scope, "out-of-scope");
  assert.equal(scenario.expected.verdict, "BLOCKED");
  assert.match(scenario.expected.proposedFollowOn.goal, /standalone account export report/);
  assert.match(skill, /implement an out-of-scope finding, create a proposed follow-on Task/);
  assert.match(audit, /An out-of-scope implementation is an open `scope` error/);
  assert.match(audit, /do not allocate an ID or create files/);
});

test("kyw-audit repairs only a clear in-scope finding and reruns affected checks", async () => {
  const audit = await readFile(AUDIT_REFERENCE_PATH, "utf8");
  const scenario = scenarios.inScopeRepair;

  assert.equal(scenario.finding.scope, "in-scope");
  assert.equal(scenario.finding.statusBeforeRepair, "OPEN");
  assert.equal(scenario.finding.statusAfterRepair, "FIXED");
  assert.deepEqual(scenario.mutationOrder.slice(0, 2), [
    "docs/tasks/0042-account-unlock/TASK.md",
    "docs/tasks/0042-account-unlock/TEST.md",
  ]);
  assert.equal(scenario.testUpdate.id, "T-02");
  assert.equal(scenario.testUpdate.status, "PASS");
  assert.match(scenario.retainedPriorEvidence, /no executable permission-denied coverage/);
  assert.deepEqual(
    scenario.reruns.map(({ exitCode }) => exitCode),
    [0, 0],
  );
  assert.match(scenario.reruns[0].command, /permission-denied/);
  assert.equal(scenario.finalVerdict, "PASS");
  assert.match(audit, /Record the finding before changing files/);
  assert.match(audit, /append new test IDs when coverage grows/);
  assert.match(audit, /retained failed or unsupported prior evidence/);
  assert.match(audit, /Rerun the affected acceptance-specific check/);
  assert.match(audit, /Mark it `FIXED` only when expected and actual state agree/);
});

test("kyw-audit gives a clean Task PASS without churn and documents the verdict contract", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  const audit = await readFile(AUDIT_REFERENCE_PATH, "utf8");
  const readme = await readFile(README_PATH, "utf8");
  const architecture = await readFile(ARCHITECTURE_PATH, "utf8");
  const scenario = scenarios.clean;

  assert.deepEqual(scenario.acceptanceCriteria, scenario.mappedAcceptanceIds);
  assert.deepEqual(scenario.meaningfulBranches, scenario.coveredBranches);
  assert.equal(scenario.changedPathsMapped, true);
  assert.equal(scenario.durableDocumentsSynchronized, true);
  assert.equal(scenario.taskPairValid, true);
  assert.ok(scenario.requiredCommands.every(({ exitCode, reproduced }) => exitCode === 0 && reproduced));
  assert.deepEqual(scenario.findings, []);
  assert.deepEqual(scenario.mutationLog, []);
  assert.equal(scenario.expectedVerdict, "PASS");
  assert.match(audit, /Return `PASS` only when all of these gates hold/);
  assert.match(audit, /There is no third verdict, and partial success is not `PASS`/);
  assert.match(audit, /`Fixes and reruns`.*write `None` when the audit was read-only/);
  assert.match(skill, /Do not.*write a separate audit report file/);
  assert.match(readme, /\$kyw-audit 0007/);
  assert.match(readme, /final `PASS` or `BLOCKED`/);
  assert.match(architecture, /references\/audit\.md/);
  assert.match(architecture, /Findings receive stable `F-NN` IDs/);
});
