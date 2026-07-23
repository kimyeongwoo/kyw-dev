import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const README_PATH = join(REPOSITORY_ROOT, "README.md");
const ARCHITECTURE_PATH = join(REPOSITORY_ROOT, "docs", "ARCHITECTURE.md");
const SKILL_PATH = join(REPOSITORY_ROOT, "skills", "kyw-task", "SKILL.md");
const METADATA_PATH = join(REPOSITORY_ROOT, "skills", "kyw-task", "agents", "openai.yaml");
const EXECUTION_REFERENCE_PATH = join(REPOSITORY_ROOT, "skills", "kyw-task", "references", "execution.md");
const ADAPTER_PATH = join(REPOSITORY_ROOT, "skills", "kyw-task", "scripts", "task-artifacts.mjs");
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-task");

const scenarios = JSON.parse(await readFile(join(FIXTURE_ROOT, "scenarios.json"), "utf8"));
const executionScenarios = JSON.parse(
  await readFile(join(FIXTURE_ROOT, "execution-scenarios.json"), "utf8"),
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

function markdownSection(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const collected = [];
  let active = false;
  for (const line of lines) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      if (active) {
        break;
      }
      active = match[1] === heading;
      continue;
    }
    if (active) {
      collected.push(line);
    }
  }
  return collected.join("\n");
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), "kyw-dev-task0006-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function runAdapter(args) {
  return spawnSync(process.execPath, [ADAPTER_PATH, ...args], {
    encoding: "utf8",
    cwd: REPOSITORY_ROOT,
  });
}

test("kyw-task Skill is explicit-only and supports create, exact, next, and continuous dispatch", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  const metadata = await readFile(METADATA_PATH, "utf8");
  const frontmatter = frontmatterFields(skill);

  assert.deepEqual(Object.keys(frontmatter), ["name", "description"]);
  assert.equal(frontmatter.name, "kyw-task");
  assert.match(frontmatter.description, /explicitly invokes \$kyw-task/);
  assert.match(frontmatter.description, /do not use for ordinary prompts/);
  assert.doesNotMatch(skill, /is not implemented yet/);
  assert.match(skill, /Use `create\(goal\)`/);
  assert.match(skill, /Use `exact\(task-id\)`/);
  assert.match(skill, /task NNNN 실행해줘/);
  assert.match(skill, /task 진행해줘/);
  assert.match(skill, /남은 task 계속 실행해줘/);
  assert.match(skill, /incidental text containing “task” never invokes this workflow/);
  assert.match(skill, /applies only to the first selected Task/);
  assert.match(skill, /explicitly says it applies to every remaining Task/);
  assert.match(skill, /cannot waive acceptance, evidence honesty, safety/);
  assert.match(skill, /configured model and reasoning effort unchanged/);
  assert.match(skill, /`STANDARD` is a gate, never action authority by itself/);
  assert.match(skill, /bounded contract-only edit to explicitly named pre-created nonterminal Task pairs/);
  assert.match(skill, /Only continuous mode may process multiple Tasks/);
  assert.match(skill, /--delivery-ledger-json <json>/);
  assert.match(skill, /future PR, merge, post-merge, or Actions results/);
  assert.match(skill, /four-digit Task ID/);
  assert.match(skill, /\[Task Execution and Resume\]\(references\/execution\.md\)/);
  assert.match(skill, /If the verified pair is still `DRAFT`, resume customization and Phase 5 confirmation/);
  assert.doesNotMatch(skill, /supports only `create\(goal\)`/);
  assert.match(metadata, /default_prompt: "Use \$kyw-task /);
  assert.match(metadata, /Create, execute, or resume one verified Task/);
  assert.match(metadata, /policy:\n  allow_implicit_invocation: false\n/);
  assert.doesNotMatch(metadata, /^dependencies:/m);
});

test("kyw-task execution and resume documentation matches the packaged workflow", async () => {
  const readme = await readFile(README_PATH, "utf8");
  const architecture = await readFile(ARCHITECTURE_PATH, "utf8");

  assert.match(readme, /Tasks 0001 through 0015/);
  assert.match(readme, /\$kyw-task 0006/);
  assert.match(readme, /continues at the verified `Resume Point` without repeating Completed work/);
  assert.match(readme, /never substitutes an unsupported `DONE`\/`PASSED` claim/);
  assert.doesNotMatch(readme, /Task execution\/resume and audit remain unavailable/);
  assert.match(architecture, /references\/execution\.md/);
  assert.match(architecture, /semantic state-machine reference for exact, automatic, and continuous Task execution/);
  assert.match(architecture, /selecting a current-contract `READY\/READY` pair is implementation confirmation/);
  assert.match(architecture, /An unavailable required check produces recorded `BLOCKED` status/);
});

test("kyw-task authoring inspects facts and grills only unresolved Task decisions", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  const readme = await readFile(join(FIXTURE_ROOT, "settled-project", "README.md"), "utf8");
  const specification = await readFile(join(FIXTURE_ROOT, "settled-project", "docs", "SPEC.md"), "utf8");
  const architecture = await readFile(join(FIXTURE_ROOT, "settled-project", "docs", "ARCHITECTURE.md"), "utf8");
  const source = await readFile(join(FIXTURE_ROOT, "settled-project", "src", "auth", "policy"), "utf8");

  assert.equal(scenarios.normal.settledFacts.length, 4);
  assert.match(readme, /Node\.js 22/);
  assert.match(specification, /Five failed sign-in attempts within fifteen minutes/);
  assert.match(architecture, /`src\/auth` owns/);
  assert.match(source, /failureLimit: 5/);
  assert.match(skill, /Do not ask the user to repeat facts that inspection can establish/);
  assert.match(skill, /Apply the installed `\$kyw-grilling` protocol/);
  assert.match(skill, /exactly one decision question per turn/);
  assert.match(skill, /Skip product behavior, architecture, commands, and repository rules already settled/);
});

test("kyw-task authoring size gate splits independent outcomes before allocation or writes", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.equal(scenarios.oversized.independentOutcomes.length, 3);
  assert.equal(scenarios.oversized.writesBeforeSelection, 0);
  assert.match(skill, /outcomes can ship or revert independently/);
  assert.match(skill, /Propose a small ordered set of independently testable Task outcomes/);
  assert.match(skill, /Ask exactly one selection question and wait/);
  assert.match(skill, /Do not allocate an ID, run the adapter, create a directory, or write any file/);
  assert.match(skill, /Never create the other proposed Tasks automatically/);
});

test("kyw-task authoring preserves traceability and the confirmation state boundary", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.equal(scenarios.confirmation.beforeExplicitConfirmation, "DRAFT");
  assert.equal(scenarios.confirmation.afterExplicitConfirmation, "READY");
  assert.equal(scenarios.confirmation.implementationStarts, false);
  assert.match(skill, /stable IDs `AC-01`, `AC-02`/);
  assert.match(skill, /stable IDs `T-01`, `T-02`/);
  assert.match(skill, /Map every acceptance criterion to at least one initial test row/);
  assert.match(skill, /Until confirmation, keep both files `DRAFT`/);
  assert.match(skill, /Change Task Status and Test Status from `DRAFT` to `READY`/);
  assert.match(skill, /Never report `READY` unless both files contain `READY` and validation succeeds/);
  assert.match(skill, /confirmation will authorize this current Task to enter execution/);
  assert.match(skill, /use the current-summary confirmation as execution authorization/);
});

test("kyw-task authoring mutation boundary excludes implementation and existing artifacts", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.deepEqual(scenarios.normal.allowedAuthoringFiles, ["TASK.md", "TEST.md"]);
  assert.match(skill, /limit mutations to the returned new `TASK\.md` and `TEST\.md` paths/);
  assert.match(skill, /Do not modify permanent documents, implementation files/);
  assert.match(skill, /Do not create multiple Task directories/);
  assert.match(skill, /or touch implementation files/);
  assert.match(skill, /expand mutations only to its Task\/Test pair/);
  assert.match(skill, /never edit another numbered Task or implement a future outcome/);
});

test("kyw-task execution routes durable changes and enforces the current-Task boundary", async () => {
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
  assert.match(execution, /product behavior, requirements, business rules, or acceptance meaning -> `docs\/SPEC\.md`/);
  assert.match(execution, /components, boundaries, dependencies, data flow, storage, or distribution structure -> `docs\/ARCHITECTURE\.md`/);
  assert.match(execution, /setup, installation, commands, configuration, usage, or contributor entry -> `README\.md`/);
  assert.match(execution, /Edit another numbered Task only for a bounded contract migration/);
  assert.match(execution, /If it is independently shippable or belongs to a future Task, leave it out of scope/);
});

test("kyw-task resume verifies recorded state and skips completed work", async () => {
  const execution = await readFile(EXECUTION_REFERENCE_PATH, "utf8");
  const scenario = executionScenarios.resume;

  assert.equal(scenario.taskStatus, "IN_PROGRESS");
  assert.equal(scenario.testStatus, "RUNNING");
  assert.equal(scenario.repositoryVerification.completedArtifactsPresent, true);
  assert.equal(scenario.repositoryVerification.nextActionStillPending, true);
  assert.equal(scenario.completed.length, 2);
  assert.equal(scenario.remaining.length, 2);
  assert.match(scenario.resumePoint, /permission-denied case/);
  assert.equal(scenario.mustNotRepeat.length, 2);
  assert.match(execution, /Treat `Completed` as a claim to verify, not a command to repeat or trust blindly/);
  assert.match(execution, /`DRAFT` \/ `DRAFT`: resume existing-pair customization/);
  assert.match(execution, /start at `Resume Point` or the first still-valid item in Remaining/);
  assert.match(execution, /redoing only the affected work/);
  assert.match(execution, /Do not rerun a completed destructive or externally visible action/);
});

test("kyw-task execution blocks an unexecuted required test and closes final coverage gaps", async () => {
  const execution = await readFile(EXECUTION_REFERENCE_PATH, "utf8");
  const blocked = executionScenarios.blockedRequiredTest;
  const coverage = executionScenarios.coverageGap;

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
});

test("kyw-task compaction handoff preserves fresh-session state and scope drift evidence", async () => {
  const execution = await readFile(EXECUTION_REFERENCE_PATH, "utf8");
  const checkpoint = executionScenarios.compaction;
  const scopeDrift = executionScenarios.scopeDrift;

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

test("kyw-task authoring adapter scaffolds one pair and task execution validates its lifecycle", async (t) => {
  const root = await temporaryDirectory(t);
  const tasksRoot = join(root, "docs", "tasks");
  const existingDirectory = join(tasksRoot, "0001-existing-task");
  const existingMarker = join(existingDirectory, "marker.txt");
  await mkdir(existingDirectory, { recursive: true });
  await writeFile(existingMarker, "preserve me\n", "utf8");

  const createdResult = runAdapter([
    "create",
    "--tasks-root",
    tasksRoot,
    "--title",
    "Administrator account unlock",
  ]);
  assert.equal(createdResult.status, 0, createdResult.stderr);

  const created = JSON.parse(createdResult.stdout);
  assert.equal(created.command, "create");
  assert.equal(created.id, "0002");
  assert.equal(created.slug, "administrator-account-unlock");
  assert.deepEqual((await readdir(tasksRoot)).sort(), ["0001-existing-task", "0002-administrator-account-unlock"]);
  assert.deepEqual((await readdir(created.directory)).sort(), ["TASK.md", "TEST.md"]);
  assert.equal(await readFile(existingMarker, "utf8"), "preserve me\n");

  let taskMarkdown = await readFile(created.taskPath, "utf8");
  let testMarkdown = await readFile(created.testPath, "utf8");
  assert.match(taskMarkdown, /## Status\n\nDRAFT/);
  assert.match(testMarkdown, /## Status\n\nDRAFT/);

  taskMarkdown = taskMarkdown
    .replace(
      "<!-- State one independently testable outcome. -->",
      "An administrator can unlock one currently locked account.",
    )
    .replace("<!-- List the changes required for this outcome. -->", "- Add the administrator unlock action.")
    .replace("<!-- Name nearby work that this Task must not absorb. -->", "- Session storage changes.")
    .replace(
      "<!-- Add checklist entries such as \"- [ ] AC-01: observable result\". -->",
      "- [ ] AC-01: An administrator can unlock one currently locked account.",
    )
    .replace(
      "<!-- Add implementation steps and keep their completion state current. -->",
      "- [ ] Implement and verify the unlock action.",
    )
    .replace("<!-- Record Task-level choices that affect the implementation. -->", "- Preserve automatic unlock behavior.")
    .replace(
      "<!-- Record meaningful failure, compatibility, migration, or verification risks. -->",
      "- Permission checks require explicit regression coverage.",
    )
    .replace(
      "<!-- Update this section when facts, design, scope, or expected behavior change. -->",
      "- No discoveries yet.",
    )
    .replace("- SPEC: <!-- changed meaning or why unaffected -->", "- SPEC: Unchanged; existing behavior is implemented.")
    .replace(
      "- ARCHITECTURE: <!-- changed meaning or why unaffected -->",
      "- ARCHITECTURE: Unchanged; the existing auth boundary is retained.",
    )
    .replace("- README: <!-- changed meaning or why unaffected -->", "- README: Unchanged; no setup or usage change.")
    .replace("- AGENTS: <!-- changed meaning or why unaffected -->", "- AGENTS: Unchanged; no repository rule change.")
    .replace(
      "<!-- Use `STANDARD` with the canonical ledger below, or `NONE — <reason>`. Record policy only, never future delivery state. -->",
      "",
    )
    .replace(
      "<!-- List the work still needed to satisfy the Task. -->",
      "- Implement and verify the unlock action.",
    )
    .replace(
      "<!-- Give the next concrete action and the minimum context needed to continue. -->",
      "Implement the unlock action, then run the focused account fixture.",
    )
    .replaceAll("<!-- For DONE, use `- None — repository outcome complete.` -->", "");
  testMarkdown = testMarkdown
    .replace(
      "<!-- Add one row for every acceptance criterion and meaningful discovered behavior. -->",
      "| T-01 | AC-01 administrator unlock succeeds | Run the account fixture | Integration | TODO | |",
    )
    .replace(
      "<!-- List existing behavior that must remain intact. -->",
      "- [ ] Existing automatic unlock behavior remains intact.",
    )
    .replace(
      "<!-- List exact commands or manual procedures before execution, then preserve what actually ran. -->",
      `- ${executionScenarios.happyPath.command}`,
    );
  await writeFile(created.taskPath, taskMarkdown, "utf8");
  await writeFile(created.testPath, testMarkdown, "utf8");

  const draftValidation = runAdapter(["validate", "--task-directory", created.directory]);
  assert.equal(draftValidation.status, 0, draftValidation.stderr);
  assert.equal(JSON.parse(draftValidation.stdout).valid, true);

  await writeFile(created.taskPath, taskMarkdown.replace("\nDRAFT\n", "\nREADY\n"), "utf8");
  await writeFile(created.testPath, testMarkdown.replace("\nDRAFT\n", "\nREADY\n"), "utf8");
  const readyValidation = runAdapter(["validate", "--task-directory", created.directory]);
  assert.equal(readyValidation.status, 0, readyValidation.stderr);

  const readyTaskMarkdown = await readFile(created.taskPath, "utf8");
  const readyTestMarkdown = await readFile(created.testPath, "utf8");
  const runningTaskMarkdown = readyTaskMarkdown.replace("\nREADY\n", "\nIN_PROGRESS\n");
  const runningTestMarkdown = readyTestMarkdown.replace("\nREADY\n", "\nRUNNING\n");
  await writeFile(created.taskPath, runningTaskMarkdown, "utf8");
  await writeFile(created.testPath, runningTestMarkdown, "utf8");
  const runningValidation = runAdapter(["validate", "--task-directory", created.directory]);
  assert.equal(runningValidation.status, 0, runningValidation.stderr);

  const doneTaskMarkdown = runningTaskMarkdown
    .replace("\nIN_PROGRESS\n", "\nDONE\n")
    .replace("- [ ] AC-01", "- [x] AC-01")
    .replace("- [ ] Implement and verify the unlock action.", "- [x] Implement and verify the unlock action.")
    .replace("## Completed\n\n- None yet.", "## Completed\n\n- Implemented and verified administrator unlock.")
    .replace(
      "## Remaining\n\n- Implement and verify the unlock action.",
      "## Remaining\n\n- None — repository outcome complete.",
    )
    .replace(
      "## Resume Point\n\nImplement the unlock action, then run the focused account fixture.",
      "## Resume Point\n\n- None — repository outcome complete.",
    );
  const passedTestMarkdown = runningTestMarkdown
    .replace("\nRUNNING\n", "\nPASSED\n")
    .replace(
      "| T-01 | AC-01 administrator unlock succeeds | Run the account fixture | Integration | TODO | |",
      `| T-01 | AC-01 administrator unlock succeeds | Run the account fixture | Integration | PASS | ${executionScenarios.happyPath.evidence} |`,
    )
    .replace("- Not run yet.", `- ${executionScenarios.happyPath.command}: exit 0; fixture passed.`)
    .replaceAll("- [ ]", "- [x]");
  assert.doesNotMatch(doneTaskMarkdown.replace("<!-- kyw-task-contract: 2 -->", ""), /<!--/);
  assert.doesNotMatch(passedTestMarkdown.replace("<!-- kyw-task-contract: 2 -->", ""), /<!--/);
  assert.match(doneTaskMarkdown, /## Remaining\n\n- None — repository outcome complete\./);
  assert.match(doneTaskMarkdown, /## Resume Point\n\n- None — repository outcome complete\./);
  await writeFile(created.taskPath, doneTaskMarkdown, "utf8");
  await writeFile(created.testPath, passedTestMarkdown, "utf8");
  const doneValidation = runAdapter(["validate", "--task-directory", created.directory]);
  assert.equal(doneValidation.status, 0, doneValidation.stderr);
  assert.deepEqual(executionScenarios.happyPath.states, [
    { task: "READY", test: "READY" },
    { task: "IN_PROGRESS", test: "RUNNING" },
    { task: "DONE", test: "PASSED" },
  ]);
  assert.equal(executionScenarios.happyPath.currentSummaryConfirmed, true);
  assert.equal(executionScenarios.happyPath.exitCode, 0);

  const dispatchRoot = join(root, "dispatch", "docs", "tasks");
  const dispatchDirectory = join(dispatchRoot, "0002-administrator-account-unlock");
  await mkdir(dispatchDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(dispatchDirectory, "TASK.md"), readyTaskMarkdown, "utf8"),
    writeFile(join(dispatchDirectory, "TEST.md"), readyTestMarkdown, "utf8"),
  ]);
  const dispatchResult = runAdapter([
    "dispatch",
    "--tasks-root",
    dispatchRoot,
    "--invocation",
    "$kyw-task 0002",
    "--managed-routing",
    "false",
  ]);
  assert.equal(dispatchResult.status, 0, dispatchResult.stderr);
  const dispatch = JSON.parse(dispatchResult.stdout);
  assert.equal(dispatch.outcome, "SELECTED");
  assert.equal(dispatch.task.id, "0002");
  assert.equal(dispatch.confirmation, true);

  await Promise.all([
    writeFile(join(dispatchDirectory, "TASK.md"), doneTaskMarkdown, "utf8"),
    writeFile(join(dispatchDirectory, "TEST.md"), passedTestMarkdown, "utf8"),
  ]);
  const outcomeSha = "a".repeat(40);
  const mergeSha = "b".repeat(40);
  const deliveryLedger = {
    "0002": {
      source: "GITHUB",
      taskId: "0002",
      repository: "example/adapter-fixture",
      outcomeSha,
      pullRequest: {
        number: 42,
        headSha: outcomeSha,
        baseRef: "main",
        mergeSha,
        state: "MERGED",
        checks: "SUCCESS",
        review: "CLEAR",
        runId: 1001,
      },
      merge: {
        repository: "example/adapter-fixture",
        branch: "main",
        sha: mergeSha,
        mainRunHeadSha: mergeSha,
        checks: "SUCCESS",
        runId: 1002,
      },
    },
  };
  const deliveryExpectations = {
    "0002": {
      source: "LOCAL_GIT",
      taskId: "0002",
      repository: "example/adapter-fixture",
      baseRef: "main",
      outcomeSha,
    },
  };
  const inlineDeliveryResult = runAdapter([
    "dispatch",
    "--tasks-root",
    dispatchRoot,
    "--invocation",
    "task 진행해줘",
    "--managed-routing",
    "true",
    "--delivery-ledger-json",
    JSON.stringify(deliveryLedger),
    "--delivery-expectations-json",
    JSON.stringify(deliveryExpectations),
  ]);
  assert.equal(inlineDeliveryResult.status, 0, inlineDeliveryResult.stderr);
  assert.equal(JSON.parse(inlineDeliveryResult.stdout).outcome, "NO_WORK");

  const ledgerPath = join(root, "delivery-ledger.json");
  const expectationsPath = join(root, "delivery-expectations.json");
  await Promise.all([
    writeFile(ledgerPath, JSON.stringify(deliveryLedger), "utf8"),
    writeFile(expectationsPath, JSON.stringify(deliveryExpectations), "utf8"),
  ]);
  const fileDeliveryResult = runAdapter([
    "dispatch",
    "--tasks-root",
    dispatchRoot,
    "--invocation",
    "task 진행해줘",
    "--managed-routing",
    "true",
    "--delivery-ledger",
    ledgerPath,
    "--delivery-expectations",
    expectationsPath,
  ]);
  assert.equal(fileDeliveryResult.status, 0, fileDeliveryResult.stderr);
  assert.equal(JSON.parse(fileDeliveryResult.stdout).outcome, "NO_WORK");

  const invalidRoot = join(root, "invalid-attempt", "docs", "tasks");
  const invalidResult = runAdapter(["create", "--tasks-root", invalidRoot]);
  assert.equal(invalidResult.status, 1);
  assert.match(invalidResult.stderr, /INVALID_TASK_ADAPTER_ARGUMENTS/);
  await assert.rejects(readdir(invalidRoot), (error) => error.code === "ENOENT");

  const blankRootResult = runAdapter([
    "create",
    "--tasks-root",
    " ",
    "--title",
    "Must not use the process directory",
  ]);
  assert.equal(blankRootResult.status, 1);
  assert.match(blankRootResult.stderr, /requires a non-empty value/);

  const invalidCases = [
    {
      args: ["create", "--tasks-root", invalidRoot, "--title", "Invalid option", "--extra", "value"],
      pattern: /Unknown option --extra/,
    },
    {
      args: ["create", "--tasks-root", invalidRoot, "--title", "First", "--title", "Second"],
      pattern: /Option --title may be provided only once/,
    },
    {
      args: ["validate", "--task-directory"],
      pattern: /Option --task-directory requires a value/,
    },
    {
      args: ["validate", "--task-directory", existingDirectory],
      pattern: /INVALID_TASK_DIRECTORY/,
    },
    {
      args: ["resume", "--task-directory", existingDirectory],
      pattern: /Expected create, validate, or dispatch/,
    },
    {
      args: [
        "dispatch",
        "--tasks-root",
        dispatchRoot,
        "--invocation",
        "task 진행해줘",
        "--managed-routing",
        "maybe",
      ],
      pattern: /--managed-routing must be true or false/,
    },
    {
      args: [
        "dispatch",
        "--tasks-root",
        dispatchRoot,
        "--invocation",
        "task 진행해줘",
        "--managed-routing",
        "true",
        "--delivery-ledger-json",
        "{",
      ],
      pattern: /INVALID_DELIVERY_LEDGER/,
    },
    {
      args: [
        "dispatch",
        "--tasks-root",
        dispatchRoot,
        "--invocation",
        "task 진행해줘",
        "--managed-routing",
        "true",
        "--delivery-expectations-json",
        "[]",
      ],
      pattern: /INVALID_DELIVERY_EXPECTATIONS/,
    },
  ];
  for (const { args, pattern } of invalidCases) {
    const result = runAdapter(args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, pattern);
  }
  await assert.rejects(readdir(invalidRoot), (error) => error.code === "ENOENT");
});

test("current queued artifacts validate without rewriting immutable historical Tasks", async () => {
  const tasksRoot = join(REPOSITORY_ROOT, "docs", "tasks");
  const directories = (await readdir(tasksRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{4}-/.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of directories) {
    const id = Number(entry.name.slice(0, 4));
    const directory = join(tasksRoot, entry.name);
    const taskMarkdown = await readFile(join(directory, "TASK.md"), "utf8");
    const testMarkdown = await readFile(join(directory, "TEST.md"), "utf8");
    const validation = runAdapter(["validate", "--task-directory", directory]);
    assert.equal(validation.status, 0, `${entry.name}: ${validation.stderr}`);

    if (id <= 29) {
      assert.doesNotMatch(taskMarkdown, /kyw-task-contract: 2/, entry.name);
      assert.doesNotMatch(testMarkdown, /kyw-task-contract: 2/, entry.name);
    } else if (id <= 38) {
      assert.match(taskMarkdown, /<!-- kyw-task-contract: 2 -->/, entry.name);
      assert.match(testMarkdown, /<!-- kyw-task-contract: 2 -->/, entry.name);
      assert.match(taskMarkdown, /- Requirement: STANDARD/, entry.name);
      assert.match(
        taskMarkdown,
        /- Canonical ledger: GitHub PR\/Actions exact-SHA state\./,
        entry.name,
      );
      assert.doesNotMatch(
        testMarkdown,
        /Confirm future external delivery evidence is read/,
        entry.name,
      );
      const repositoryHandoff = [
        markdownSection(taskMarkdown, "Plan"),
        markdownSection(taskMarkdown, "Remaining"),
        markdownSection(taskMarkdown, "Resume Point"),
        markdownSection(testMarkdown, "Final Coverage Review"),
      ].join("\n");
      assert.doesNotMatch(
        repositoryHandoff,
        /\b(?:open|create|merge)\s+(?:the\s+)?(?:PR|pull request)\b|post-merge delivery|future external delivery|deliver this Task/i,
        entry.name,
      );
    }
  }
});
