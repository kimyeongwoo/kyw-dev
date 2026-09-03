import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SKILL_ROOT = join(REPOSITORY_ROOT, "skills", "kyw-impl");
const SKILL_PATH = join(SKILL_ROOT, "SKILL.md");
const METADATA_PATH = join(SKILL_ROOT, "agents", "openai.yaml");
const EXECUTION_REFERENCE_PATH = join(SKILL_ROOT, "references", "execution.md");
const SHARED_ADAPTER_PATH = join(
  REPOSITORY_ROOT,
  "skills",
  "kyw-task",
  "scripts",
  "task-artifacts.mjs",
);
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-task");
const EXECUTION_FIXTURE_ROOT = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "task-repositories",
  "ergonomics",
  "0101-standard-task",
);

const executionScenarios = JSON.parse(
  await readFile(join(FIXTURE_ROOT, "execution-scenarios.json"), "utf8"),
);
const ergonomicsScenarios = JSON.parse(
  await readFile(join(FIXTURE_ROOT, "ergonomics-scenarios.json"), "utf8"),
);

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

function normalizedProse(value) {
  return value.replace(/\s+/g, " ").trim();
}

function runAdapter(args) {
  return spawnSync(process.execPath, [SHARED_ADAPTER_PATH, ...args], {
    encoding: "utf8",
    cwd: REPOSITORY_ROOT,
  });
}

async function temporaryTasksRoot(t) {
  const root = await mkdtemp(join(tmpdir(), "kyw-dev-impl-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tasksRoot = join(root, "docs", "tasks");
  const taskDirectory = join(tasksRoot, "0101-standard-task");
  await mkdir(taskDirectory, { recursive: true });
  const [taskMarkdown, testMarkdown] = await Promise.all([
    readFile(join(EXECUTION_FIXTURE_ROOT, "TASK.md"), "utf8"),
    readFile(join(EXECUTION_FIXTURE_ROOT, "TEST.md"), "utf8"),
  ]);
  await Promise.all([
    writeFile(join(taskDirectory, "TASK.md"), taskMarkdown, "utf8"),
    writeFile(join(taskDirectory, "TEST.md"), testMarkdown, "utf8"),
  ]);
  return { tasksRoot, taskDirectory, taskMarkdown, testMarkdown };
}

test("kyw-impl Skill is explicit-only and owns existing-Task execution", async () => {
  const [skill, metadata, execution] = await Promise.all([
    readFile(SKILL_PATH, "utf8"),
    readFile(METADATA_PATH, "utf8"),
    readFile(EXECUTION_REFERENCE_PATH, "utf8"),
  ]);
  const frontmatter = frontmatterFields(skill);

  assert.deepEqual(Object.keys(frontmatter), ["name", "description"]);
  assert.equal(frontmatter.name, "kyw-impl");
  assert.match(frontmatter.description, /explicitly invokes \$kyw-impl/);
  assert.match(frontmatter.description, /already existing kyw-dev Task/);
  assert.match(frontmatter.description, /do not use for Task authoring, new outcomes, ordinary prompts/);
  assert.match(skill, /`\$kyw-impl NNNN` selects one exact existing Task/);
  assert.match(skill, /task \d{4} 실행해줘/);
  assert.match(skill, /task 진행해줘/);
  assert.match(skill, /남은 task 계속 실행해줘/);
  assert.match(skill, /anchored repository routing, not Skill matching/);
  assert.match(skill, /Without managed routing, return `\$kyw-impl NNNN`/);
  assert.match(skill, /\[Task Execution and Resume\]\(references\/execution\.md\)/);
  assert.match(execution, /canonical detailed execution procedure/);
  assert.match(metadata, /default_prompt: "Use \$kyw-impl NNNN/);
  assert.match(metadata, /implement, resume, verify, and ordinarily deliver an existing Task/);
  assert.match(metadata, /policy:\n  allow_implicit_invocation: false\n/);
  assert.doesNotMatch(metadata, /^dependencies:/m);
  assert.doesNotMatch(metadata, /publish|version|tag|Release|authority/i);
});

test("kyw-impl has no authoring engine and calls the one shared packaged adapter", async () => {
  const [skill, adapter] = await Promise.all([
    readFile(SKILL_PATH, "utf8"),
    readFile(SHARED_ADAPTER_PATH, "utf8"),
  ]);

  await assert.rejects(access(join(SKILL_ROOT, "scripts")), (error) => error.code === "ENOENT");
  await assert.rejects(
    access(join(REPOSITORY_ROOT, "skills", "kyw-task", "references", "execution.md")),
    (error) => error.code === "ENOENT",
  );
  assert.match(skill, /sole packaged Task adapter in the sibling `kyw-task` Skill/);
  assert.match(skill, /\.\.\/kyw-task\/scripts\/task-artifacts\.mjs dispatch/);
  assert.match(skill, /owns no copied parser, state, dependency, queue, transaction, or delivery engine/);
  assert.match(
    skill,
    /validates prior `STANDARD` continuity[\s\S]{0,100}fixed-bounded checkpoint/,
  );
  assert.match(skill, /freshly production-evaluates at most one uncovered GitHub outcome/);
  assert.match(skill, /no whole-history fallback/);
  assert.doesNotMatch(skill, /--delivery-(?:ledger|expectations)(?:-json)?/);
  assert.doesNotMatch(skill, /create-batch --tasks-root|inspect-transaction --tasks-root|recover-transaction --tasks-root/);
  assert.match(adapter, /\.\.\/\.\.\/\.\.\/src\/core\/task-artifacts\.mjs/);
  assert.match(adapter, /resolveTaskDispatch/);
});

test("kyw-impl rejects creation and DRAFT authoring while preserving execution modes", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.doesNotMatch(skill, /^A goal, missing ID, or new outcome causes zero mutation/m);
  assert.match(
    normalizedProse(skill),
    /attempted[^.]{0,80}`?\$?kyw-impl`?[^.]{0,180}(?:goal|missing ID|new outcome)[^.]{0,180}zero mutation/i,
  );
  assert.match(skill, /`\$kyw-task "<outcome>"`/);
  assert.match(
    skill,
    /Never infer\/allocate IDs, create pairs, author\/promote DRAFT/,
  );
  assert.match(skill, /`DRAFT\/DRAFT` stops with exact `\$kyw-task NNNN` authoring guidance/);
  for (const [state, action] of [
    ["READY/READY", "IMPLEMENT"],
    ["IN_PROGRESS/RUNNING", "RESUME"],
    ["DONE/PASSED", "DELIVER"],
  ]) {
    assert.match(skill, new RegExp(`\`${state}\`[^\\n]*\`${action}\``));
  }
  assert.match(skill, /`BLOCKED\/BLOCKED`[^.\n]*condition recheck/);
  assert.match(skill, /Automatic\/continuous forms never allocate/);
  assert.match(skill, /never in parallel\/background or beyond this host invocation/);
});

test("kyw-impl applies the activation-scoped warning and bounded-reconfirmation lifecycle", async () => {
  const [skill, execution] = await Promise.all([
    readFile(SKILL_PATH, "utf8"),
    readFile(EXECUTION_REFERENCE_PATH, "utf8"),
  ]);
  for (const value of [skill, execution]) {
    assert.equal(value.match(/<!-- kyw-active-skill-guardrails:v1 -->/g)?.length, 1);
  }
  assert.match(skill, /exact route activates only that invocation/i);
  assert.match(skill, /aligned[^.]{0,180}without duplicate confirmation/i);
  assert.match(skill, /baseline\/Task\/acceptance\/scope\/action\/target\/attempt\/Skill\/mode change[^.]{0,240}zero-mutation wait/i);
  assert.match(skill, /immediate exact reconfirmation (?:on|of) unchanged facts/i);
  assert.match(skill, /owner\/pair sync (?:then|and) only (?:the )?bounded action/i);
  assert.match(execution, /`INACTIVE`[^.]{0,240}do not warn, block, select\/create\/redirect a Task/i);
  assert.match(execution, /In `ACTIVE_ALIGNED`[^.]{0,220}continues without duplicate confirmation/i);
  assert.match(execution, /enter `CHANGE_PENDING`[^.]{0,180}empty mutation trace/i);
  for (const impact of [
    "implementation",
    "mutable Task/Test",
    "permanent-owner",
    "verification",
    "delivery",
  ]) assert.ok(execution.includes(impact), `warning must cover ${impact}`);
  assert.match(execution, /action, target, scope, attempt, and facts/i);
  assert.match(execution, /immediate next applicable turn[^.]{0,200}`RECONFIRMED_BOUNDED`/i);
  assert.match(execution, /First synchronize applicable mutable Task\/Test and affected permanent owners/i);
  assert.match(execution, /execute only its (?:bounded )?action, target, scope, and attempt/i);
  assert.match(execution, /combined routed message activates\/routes once/i);
  assert.match(execution, /cannot count its changing origin as reconfirmation/i);
  assert.match(
    execution,
    /Clear to `CANCELLED_OR_EXPIRED` or (?:replace with a fresh warning|rewarn)/i,
  );
  assert.match(execution, /terminal preflight remains exactly `TASK_OVERRIDE_PRESENT` or `NO_TASK_OVERRIDE`/i);
  assert.match(execution, /Never redispatch or chain Skills/i);
  assert.match(execution, /System\/platform safety[^.]{0,300}remain non-waivable/i);
});

test("kyw-impl routes durable changes and enforces the current-Task boundary", async () => {
  const execution = await readFile(EXECUTION_REFERENCE_PATH, "utf8");
  const routes = Object.fromEntries(
    executionScenarios.documentationRouting.map(({ change, owner }) => [change, owner]),
  );

  assert.equal(routes["The automatic lock duration changes from thirty to sixty minutes."], "docs/SPEC.md");
  assert.equal(
    routes["Authentication policy ownership moves from src/auth to src/security."],
    "docs/ARCHITECTURE.md",
  );
  assert.equal(
    routes["The contributor verification command changes from npm test to npm run check."],
    "README.md",
  );
  assert.equal(
    routes["All repository Tasks now require an additional invariant completion gate."],
    "AGENTS.md",
  );
  assert.equal(routes["A local variable is renamed without changing behavior or structure."], null);
  assert.match(execution, /product\/acceptance -> `docs\/SPEC\.md`/);
  assert.match(
    execution,
    /components\/dependencies\/flows\/storage\/distribution -> `docs\/ARCHITECTURE\.md`/,
  );
  assert.match(
    execution,
    /setup\/install\/commands\/configuration\/usage\/contributing -> `README\.md`/,
  );
  assert.match(execution, /Edit another numbered Task only for a bounded contract migration/);
  assert.match(execution, /If it is independently shippable or belongs to a future Task, leave it out of scope/);
});

test("kyw-impl resumes from verified handoff state without repeating completed work", async () => {
  const execution = await readFile(EXECUTION_REFERENCE_PATH, "utf8");
  const scenario = executionScenarios.resume;
  const appended = ergonomicsScenarios.appendedConstraint;

  assert.equal(scenario.invocation, "$kyw-impl 0042");
  assert.equal(scenario.taskStatus, "IN_PROGRESS");
  assert.equal(scenario.testStatus, "RUNNING");
  assert.equal(scenario.repositoryVerification.completedArtifactsPresent, true);
  assert.equal(scenario.repositoryVerification.nextActionStillPending, true);
  assert.equal(scenario.completed.length, 2);
  assert.equal(scenario.remaining.length, 2);
  assert.match(scenario.resumePoint, /permission-denied case/);
  assert.equal(scenario.mustNotRepeat.length, 2);
  assert.equal(appended.settledConstraints.length, 1);
  assert.equal(appended.reaskedConstraints.length, 0);
  assert.equal(appended.progressTurn.questions.length, 0);
  assert.match(execution, /Treat `Completed` as a claim to verify, not a command to repeat or trust blindly/);
  assert.match(execution, /start at `Resume Point` or the first still-valid item in Remaining/);
  assert.match(execution, /redoing only the affected work/);
  assert.match(execution, /Do not rerun a completed destructive or externally visible action/);
  assert.match(execution, /consume settled aligned constraints without re-asking/i);
});

test("kyw-impl preserves evidence honesty, final coverage review, and checkpoint state", async () => {
  const execution = await readFile(EXECUTION_REFERENCE_PATH, "utf8");
  const blocked = executionScenarios.blockedRequiredTest;
  const coverage = executionScenarios.coverageGap;
  const checkpoint = executionScenarios.compaction;
  const scopeDrift = executionScenarios.scopeDrift;

  assert.equal(blocked.executed, false);
  assert.equal(blocked.rowStatus, "BLOCKED");
  assert.equal(blocked.taskStatus, "BLOCKED");
  assert.equal(blocked.testStatus, "BLOCKED");
  assert.equal(blocked.forbiddenTaskStatus, "DONE");
  assert.equal(blocked.forbiddenTestStatus, "PASSED");
  assert.match(execution, /Never use `DONE` or `PASSED` with an unexecuted required test/);
  assert.match(execution, /do not substitute a generic passing command/);

  assert.deepEqual(coverage.missingBeforeReview, ["permission-denied branch"]);
  assert.equal(coverage.requiredAddition.id, "T-02");
  assert.equal(coverage.finalReviewCompleteAfterAddition, true);
  assert.match(execution, /When a newly introduced branch lacks coverage, append a test row/);
  assert.match(execution, /A generic full-suite pass does not close an unmapped branch/);

  assert.deepEqual(checkpoint.taskFields, [
    "Plan",
    "Decisions",
    "Discoveries and Changes",
    "Documentation Impact",
    "Completed",
    "Remaining",
    "Resume Point",
    "Blockers",
  ]);
  assert.deepEqual(checkpoint.testFields, [
    "Status",
    "Intent-to-Test Matrix",
    "Commands",
    "Results",
    "Unverified",
  ]);
  assert.deepEqual(checkpoint.repositoryState, [
    "pre-existing changed paths",
    "current Task changed paths",
    "status or diff limitations",
  ]);
  assert.equal(scopeDrift.currentTaskId, "0042");
  assert.match(scopeDrift.unexpectedPath, /0043-session-storage/);
  assert.match(execution, /Checkpoint when compaction appears likely/);
  assert.match(execution, /A fresh session must be able to verify the repository and continue/);
  assert.match(execution, /If safe reconciliation is impossible, record and block rather than hiding scope drift/);
});

test("kyw-impl uses bounded durable continuity without weakening uncovered hardened evidence", async () => {
  const execution = await readFile(EXECUTION_REFERENCE_PATH, "utf8");
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.match(execution, /pass no delivery payload/);
  assert.match(execution, /sole dispatcher call/);
  assert.match(execution, /invocation-local command cache/);
  assert.match(execution, /fixed-bounded rolling continuity checkpoint/);
  assert.match(execution, /exact ordered prefix/);
  assert.match(execution, /`DURABLE_STANDARD_CONTINUITY`/);
  assert.match(execution, /At most one prior `STANDARD` outcome may remain uncovered/);
  assert.match(execution, /without automatic whole-history replay/);
  assert.match(execution, /Expired covered logs do not invalidate/);
  assert.match(execution, /apply-continuity/);
  assert.match(execution, /selected Task cannot cover itself/);
  assert.match(skill, /opaque continuity transition token/);
  assert.match(skill, /After establishing (?:the selected Task|its) branch and active pair/);
  assert.match(execution, /trusted-local expectation uses `schemaVersion: 2`/);
  assert.match(execution, /HARDENED_EXACT_HEAD/);
  assert.match(execution, /`PR_ACTUAL_HEAD`/);
  assert.match(execution, /`PR_MERGE_COMPATIBILITY`/);
  assert.match(execution, /`POST_MERGE_MAIN`/);
  assert.match(execution, /`KYWCIEVIDENCE`/);
  assert.match(execution, /run-level latest attempt/);
  assert.match(execution, /logical job's actual execution attempt/);
  assert.match(execution, /`filter=all`/);
  assert.match(execution, /`filter=latest`/);
  assert.match(execution, /attempt-specific job collections/);
  assert.match(execution, /later actual execution supersedes/i);
  assert.match(execution, /never falls back/);
  assert.match(execution, /uniquely proven equivalent projection/);
  assert.match(execution, /every four-digit ID uses the same generic queue path/);
  assert.match(execution, /separate `bootstrap-continuity` command/);
  assert.match(execution, /(?:requires|with) exact `EXPLICIT_REBASELINE` authority/);
  assert.match(execution, /not a dispatch option, source-repair path, or Task-ID exception/);
  assert.match(skill, /dispatch reserves none for recovery/);
  assert.match(skill, /accepts no migration\/bootstrap authority option/);
  assert.doesNotMatch(execution, /Task `0070` recovery|frozen allowlist/);
  assert.doesNotMatch(skill, /pre-dispatch repair|continuity-bootstrap-authority/);
  assert.match(execution, /behavioral\/quality\/packed job-name sets/);
  assert.match(execution, /job only at `refs\/pull\/<number>\/merge`/);
  assert.match(execution, /do not rerun CI/i);
  assert.match(execution, /`LEGACY_PRE_CONTRACT`/);
  assert.match(execution, /actualHead: "UNVERIFIED"/);
  assert.match(execution, /forbidden for the selected new outcome/);
  assert.match(
    execution,
    /For contract 3, the first evaluator-satisfied `HARDENED_EXACT_HEAD` graph binds pair paths\/bytes/,
  );
  assert.match(execution, /unchanged invocation reports only/);
  assert.match(execution, /contracts 1\/2 are grandfathered/);
  assert.match(
    skill,
    /drift or redelivery stops with Task\/path[\s\S]{0,80}hard-dependent `\$kyw-task "<correction outcome>"` guidance/,
  );
});

test("shared adapter dispatches kyw-impl and leaves rejected authoring inputs byte-stable", async (t) => {
  const { tasksRoot, taskDirectory, taskMarkdown, testMarkdown } =
    await temporaryTasksRoot(t);
  const deliveryTestSeam = [
    "--delivery-ledger-json",
    "{}",
    "--delivery-expectations-json",
    "{}",
  ];

  const selectedResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    "$kyw-impl 0101",
    "--managed-routing",
    "false",
    ...deliveryTestSeam,
  ]);
  assert.equal(selectedResult.status, 0, selectedResult.stderr);
  const selected = JSON.parse(selectedResult.stdout);
  assert.equal(selected.outcome, "SELECTED");
  assert.equal(selected.action, "IMPLEMENT");
  assert.equal(selected.task.id, "0101");
  assert.equal(selected.authorityScope, "REPOSITORY_LIFECYCLE");

  const fallbackResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    "task 0101 실행해줘",
    "--managed-routing",
    "false",
    ...deliveryTestSeam,
  ]);
  assert.equal(fallbackResult.status, 0, fallbackResult.stderr);
  const fallback = JSON.parse(fallbackResult.stdout);
  assert.equal(fallback.outcome, "FALLBACK_REQUIRED");
  assert.equal(fallback.portableFallback, "$kyw-impl 0101");

  await Promise.all([
    writeFile(join(taskDirectory, "TASK.md"), taskMarkdown.replace("\nREADY\n", "\nDRAFT\n"), "utf8"),
    writeFile(join(taskDirectory, "TEST.md"), testMarkdown.replace("\nREADY\n", "\nDRAFT\n"), "utf8"),
  ]);
  const inventoryBefore = await readdir(tasksRoot);
  const draftResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    "$kyw-impl 0101",
    "--managed-routing",
    "false",
    ...deliveryTestSeam,
  ]);
  assert.equal(draftResult.status, 0, draftResult.stderr);
  const draft = JSON.parse(draftResult.stdout);
  assert.equal(draft.outcome, "BLOCKED");
  assert.equal(draft.code, "DRAFT_AUTHORING_REQUIRED");
  assert.equal("action" in draft, false);
  assert.match(draft.message, /\$kyw-task 0101/);

  const missingResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    "$kyw-impl 0999",
    "--managed-routing",
    "false",
    ...deliveryTestSeam,
  ]);
  assert.equal(missingResult.status, 0, missingResult.stderr);
  const missing = JSON.parse(missingResult.stdout);
  assert.equal(missing.outcome, "BLOCKED");
  assert.equal(missing.code, "TASK_NOT_FOUND");
  assert.equal("action" in missing, false);
  assert.match(missing.message, /\$kyw-task "<outcome>"/);

  const goalResult = runAdapter([
    "dispatch",
    "--tasks-root",
    tasksRoot,
    "--invocation",
    '$kyw-impl "a new outcome"',
    "--managed-routing",
    "false",
    ...deliveryTestSeam,
  ]);
  assert.equal(goalResult.status, 0, goalResult.stderr);
  const goal = JSON.parse(goalResult.stdout);
  assert.equal(goal.outcome, "NOT_TASK_INVOCATION");
  assert.equal(goal.code, "NO_ANCHORED_IMPLEMENTATION_COMMAND");
  assert.equal(goal.mutationRequired, false);
  assert.match(goal.message, /\$kyw-task "<outcome>"/);

  assert.deepEqual(await readdir(tasksRoot), inventoryBefore);
  assert.equal(
    await readFile(join(taskDirectory, "TASK.md"), "utf8"),
    taskMarkdown.replace("\nREADY\n", "\nDRAFT\n"),
  );
  assert.equal(
    await readFile(join(taskDirectory, "TEST.md"), "utf8"),
    testMarkdown.replace("\nREADY\n", "\nDRAFT\n"),
  );
});
