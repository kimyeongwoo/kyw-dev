import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createTaskArtifactBatch } from "../src/core/task-artifacts.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SKILL_PATH = join(REPOSITORY_ROOT, "skills", "kyw-task", "SKILL.md");
const METADATA_PATH = join(REPOSITORY_ROOT, "skills", "kyw-task", "agents", "openai.yaml");
const ADAPTER_PATH = join(REPOSITORY_ROOT, "skills", "kyw-task", "scripts", "task-artifacts.mjs");
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-task");

const scenarios = JSON.parse(await readFile(join(FIXTURE_ROOT, "scenarios.json"), "utf8"));
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

function batchTaskMarkdown() {
  return `# TASK {{TASK_ID}} — {{TASK_TITLE}}

<!-- kyw-task-contract: 3 -->

## Status

READY

## Goal

Deliver one independently verifiable outcome.

## Dependencies

{{TASK_DEPENDENCIES}}

## In Scope

- Implement the named outcome.

## Out of Scope

- Do not implement another Task.

## Acceptance Criteria

- [ ] AC-01: The outcome is independently verified.

## Plan

- [ ] Implement and verify the outcome.

## Decisions

- Preserve the declared Task boundary.

## Risks

- Compatibility requires regression coverage.

## Discoveries and Changes

- Not applicable — implementation has not started.

## Documentation Impact

- SPEC: Review after implementation.
- ARCHITECTURE: Review after implementation.
- README: Review after implementation.
- AGENTS: Review after implementation.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Not applicable — implementation has not started.

## Remaining

- Implement and verify the outcome.

## Resume Point

- Begin with the scoped implementation.

## Blockers

- Not applicable — no blocker is known.
`;
}

function batchTestMarkdown() {
  return `# TEST {{TASK_ID}} — {{TASK_TITLE}}

<!-- kyw-task-contract: 3 -->

## Status

READY

## Test Basis

- Task: \`./TASK.md\`
- Product requirements: \`../../SPEC.md\`
- Architecture constraints: \`../../ARCHITECTURE.md\`

## Model Provenance

- Model identifier: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Requested model alias: \`NOT_REQUESTED\` (\`OBSERVED\`: no override was requested)
- Reasoning effort: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Codex surface: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Codex version: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Independent outcome | Run the focused check. | Integration | TODO | Not run — newly authored pair. |

## Regression Coverage

- Preserve the surrounding behavior.

## Commands

- Planned: focused acceptance and required regressions.

## Results

- Not applicable — verification has not run.

## Unverified

- Not applicable — no residual risk is recorded yet.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [ ] Confirm PASS evidence is reproducible.
- [ ] Confirm required regressions ran.
`;
}

function batchSpec(tasks) {
  return {
    schemaVersion: 1,
    tasks: tasks.map(({ key, title, dependencies = [] }) => ({
      ...(key === undefined ? {} : { key }),
      title,
      taskMarkdown: batchTaskMarkdown(),
      testMarkdown: batchTestMarkdown(),
      dependencies,
    })),
  };
}

test("kyw-task Skill is explicit-only and owns authoring without execution", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  const metadata = await readFile(METADATA_PATH, "utf8");
  const frontmatter = frontmatterFields(skill);

  assert.deepEqual(Object.keys(frontmatter), ["name", "description"]);
  assert.equal(frontmatter.name, "kyw-task");
  assert.match(frontmatter.description, /explicit \$kyw-task authoring/);
  assert.match(frontmatter.description, /do not use for implementation, delivery/);
  assert.match(skill, /goal-style explicit `\$kyw-task`[\s\S]*`READY\/READY` pair set and stops/i);
  assert.match(skill, /`DRAFT\/DRAFT`/);
  assert.match(skill, /Other states stay unchanged/);
  assert.match(skill, /repository work uses exact `\$kyw-impl NNNN`/);
  assert.match(skill, /pending terminal `STANDARD` delivery uses exact `\$kyw-deliver NNNN`/);
  assert.match(skill, /Do not invoke either Skill/);
  assert.match(skill, /managed Korean execution aliases belong only to `kyw-impl`/i);
  assert.doesNotMatch(skill, /task 진행해줘/);
  assert.doesNotMatch(skill, /남은 task 계속 실행해줘/);
  assert.match(skill, /Never auto-invoke another Skill/);
  assert.match(skill, /create-batch --tasks-root/);
  assert.match(skill, /Use an external file for multi-pair or large input/);
  assert.match(skill, /inspect-transaction --tasks-root/);
  assert.match(skill, /recover-transaction --tasks-root/);
  assert.doesNotMatch(skill, /--delivery-ledger-json|--execution-preflight-json/);
  assert.doesNotMatch(skill, /\]\(references\/execution\.md\)/);
  assert.match(metadata, /default_prompt: "Use \$kyw-task /);
  assert.match(metadata, /author/i);
  assert.doesNotMatch(metadata, /execute|implementation|resume|delivery/i);
  assert.match(metadata, /policy:\n  allow_implicit_invocation: false\n/);
  assert.doesNotMatch(metadata, /^dependencies:/m);
});

test("kyw-task projects activation-scoped guardrails and preserves authoring-only routing", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.equal(skill.match(/<!-- kyw-active-skill-guardrails:v1 -->/g)?.length, 1);
  assert.match(skill, /Exact `\$kyw-task` alone activates/);
  assert.match(skill, /Aligned work needs no duplicate confirmation/);
  assert.match(skill, /baseline[\s\S]*Task(?: or |\/)acceptance[\s\S]*scope[\s\S]*action[\s\S]*target[\s\S]*attempt[\s\S]*Skill\/mode change[\s\S]*implementation[\s\S]*Task\/Test[\s\S]*permanent-document[\s\S]*verification[\s\S]*delivery impacts[\s\S]*zero-mutation wait/i);
  assert.match(skill, /immediate(?:ly)? next unambiguous explicit reconfirmation of (?:those exact warned bounds|(?:that|the) unchanged warning)/);
  assert.match(skill, /Cancel(?:lation)?(?:,|\/)decline(?:,|\/)ambiguity[\s\S]*clears(?: or |\/)replaces (?:the pending warning|it)/i);
  assert.match(skill, /Sync applicable mutable Task\/Test and (?:affected permanent )?owners[\s\S]*warned action/);
  assert.match(skill, /origin(?:ating turn)? cannot self-confirm/);
  assert.match(skill, /completion(?:\/cancel\/stop\/expiry)?(?: also)? deactivates/);
  assert.match(skill, /Never redispatch(?: or |\/)chain Skills/i);
  assert.match(
    skill,
    /system\/platform safety[\s\S]*(?:evidence honesty|honest evidence)[\s\S]*delivered-pair immutability/i,
  );
  assert.match(skill, /DRAFT promotion (?:keeps|retains) native confirmation/);
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
  assert.match(skill, /do not ask for inspectable facts/);
  assert.match(skill, /Reuse `\$kyw-grilling` only for unresolved intent or a user-owned blocker/);
  assert.match(skill, /one question and recommendation/);
  assert.match(skill, /Separate settled facts and current-user decisions/);
});

test("kyw-task asks only one real blocking authoring question", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  const blocker = ergonomicsScenarios.realBlockingDecision;
  const ready = ergonomicsScenarios.selectedReadyWithoutBlocker;

  assert.equal(blocker.repositoryEvidenceExhausted, true);
  assert.equal(blocker.safeReversibleChoiceAvailable, false);
  assert.equal(blocker.progressTurn.questions.length, 1);
  assert.equal(blocker.progressTurn.recommendations.length, 1);
  assert.equal(ready.progressTurn.questions.length, 0);
  assert.equal(ready.progressTurn.recommendations.length, 0);
  assert.match(skill, /user-owned blocker: one question and recommendation/);
  assert.match(skill, /ask only when the user must choose/);
  assert.match(skill, /Do not write while a required answer is unknown/);
});

test("kyw-task keeps one concise authoring artifact contract", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.match(skill, /reasoned N\/A entries only/);
  assert.match(skill, /never leave empty required content, bare None, comments, or template guidance/);
  assert.match(skill, /contract marker exactly once per artifact/);
  assert.match(skill, /do not repeat the contract identity/);
});

test("kyw-task adaptive authoring materializes the smallest dependency-aware set", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.equal(scenarios.oversized.independentOutcomes.length, 3);
  assert.equal(scenarios.oversized.createdPairCount, 3);
  assert.equal(scenarios.oversized.selectionQuestionAsked, false);
  assert.deepEqual(scenarios.oversized.publishedStatuses, [
    "READY/READY",
    "READY/READY",
    "READY/READY",
  ]);
  assert.equal(scenarios.explicitStructure.requestedCount, 2);
  assert.deepEqual(
    scenarios.explicitStructure.requestedOrder,
    scenarios.explicitStructure.requestedTitles,
  );
  assert.equal(scenarios.explicitStructure.authoringOnly, true);
  assert.equal(scenarios.explicitStructure.redundantCreateOnlyIntentAccepted, true);
  assert.equal(scenarios.explicitStructure.preservedExactlyWhenSafe, true);
  assert.equal(scenarios.conflictingStructure.requestedCount, 1);
  assert.equal(scenarios.conflictingStructure.independentOutcomeCount, 2);
  assert.equal(scenarios.conflictingStructure.minimumSafeAlternativePairCount, 2);
  assert.equal(scenarios.conflictingStructure.userDecisionRequired, false);
  assert.equal(scenarios.conflictingStructure.questionCount, 0);
  assert.match(skill, /independently shippable outcomes/);
  assert.match(skill, /smallest justified complete `READY\/READY` pair set/);
  assert.match(skill, /Preserve explicit count, boundaries, order, titles, and dependencies/);
  assert.match(
    skill,
    /Corrections to delivered contract-3 Tasks use new hard-dependent pairs/,
  );
  assert.match(
    skill,
    /A correction depends on the delivered Task with `\{"taskId":"NNNN"\}`/,
  );
});

test("kyw-task adaptive authoring publishes traced READY pairs and preserves DRAFT resume", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.equal(scenarios.adaptiveCreate.beforePublicationPairCount, 0);
  assert.equal(scenarios.adaptiveCreate.publishedStatus, "READY/READY");
  assert.equal(scenarios.adaptiveCreate.postPublicationConfirmationRequired, false);
  assert.equal(scenarios.adaptiveCreate.implementationStarts, false);
  assert.equal(scenarios.adaptiveCreate.permanentDocumentMutationStarts, false);
  assert.equal(scenarios.adaptiveCreate.automaticSkillChainStarts, false);
  assert.equal(scenarios.adaptiveCreate.nextCommandCount, 1);
  assert.equal(scenarios.adaptiveCreate.nextCommand, "$kyw-impl 0004");
  assert.equal(scenarios.adaptiveCreate.unselectedPairStatus, "READY/READY");
  assert.equal(scenarios.adaptiveCreate.explicitImplInvocationRequired, true);
  assert.equal(scenarios.compatibleDraftResume.initialStatus, "DRAFT/DRAFT");
  assert.equal(scenarios.compatibleDraftResume.explicitConfirmationRequired, true);
  assert.equal(scenarios.compatibleDraftResume.promotedStatus, "READY/READY");
  assert.deepEqual(
    scenarios.nonDraftExact.map(({ initialStatus }) => initialStatus),
    [
      "READY/READY",
      "IN_PROGRESS/RUNNING",
      "BLOCKED/BLOCKED",
      "DONE/PASSED",
      "CANCELLED/BLOCKED",
    ],
  );
  for (const scenario of scenarios.nonDraftExact) {
    assert.equal(scenario.implementationStarts, false, scenario.initialStatus);
    assert.equal(scenario.guidance, "$kyw-impl 0042", scenario.initialStatus);
  }
  assert.match(skill, /stable unchecked `AC-NN` and `TODO` `T-NN` identifiers/);
  assert.match(skill, /complete mapping, failure\/compatibility coverage/);
  assert.match(skill, /set both statuses to `READY`/);
  assert.match(skill, /Existing DRAFT compatibility/);
  assert.match(skill, /require explicit confirmation before promoting both statuses to `READY`/);
  assert.match(skill, /print exactly one next command for the first eligible pair/);
  assert.match(skill, /Do not print several implementation commands, call `kyw-impl`/);
});

test("kyw-task authoring mutation boundary permits only the atomic new set", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  assert.deepEqual(scenarios.normal.allowedAuthoringFiles, ["TASK.md", "TEST.md"]);
  assert.match(skill, /mutate only returned pairs/);
  assert.match(skill, /Do not edit implementation\/tests\/configuration/);
  assert.match(skill, /`kyw-impl` owns synchronization/);
  assert.match(skill, /Do not write while a required answer is unknown/);
  assert.match(skill, /Expected failure rolls back batch-owned final paths only with complete ownership proof/);
  assert.match(skill, /do not retry, reuse an ID, hand-create a replacement/);
});

test("kyw-task authoring adapter scaffolds and validates one DRAFT-to-READY pair", async (t) => {
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
  assert.match(testMarkdown, /## Model Provenance/);
  assert.match(testMarkdown, /- Requested model alias: `UNAVAILABLE` \(`UNAVAILABLE`:/);

  taskMarkdown = taskMarkdown
    .replace(
      "<!-- State one independently testable outcome. -->",
      "An administrator can unlock one currently locked account.",
    )
    .replace(
      "<!-- List the changes required for this outcome. Use `Not applicable — <reason>` only when this section genuinely does not apply. -->",
      "- Add the administrator unlock action.",
    )
    .replace(
      "<!-- Name nearby work that this Task must not absorb, or use `Not applicable — <reason>`. -->",
      "- Session storage changes.",
    )
    .replace(
      "<!-- Add checklist entries such as \"- [ ] AC-01: observable result\". -->",
      "- [ ] AC-01: An administrator can unlock one currently locked account.",
    )
    .replace(
      "<!-- Add implementation steps and keep their completion state current. -->",
      "- [ ] Implement and verify the unlock action.",
    )
    .replace(
      "<!-- Record Task-level choices that affect the implementation, or use `Not applicable — <reason>`. -->",
      "- Preserve automatic unlock behavior.",
    )
    .replace(
      "<!-- Record meaningful failure, compatibility, migration, or verification risks, or use `Not applicable — <reason>`. -->",
      "- Permission checks require explicit regression coverage.",
    )
    .replace(
      "<!-- Update this section when facts, design, scope, or expected behavior change, or use `Not applicable — <reason>`. -->",
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
      "<!-- List existing behavior that must remain intact, or use `Not applicable — <reason>`. -->",
      "- [ ] Existing automatic unlock behavior remains intact.",
    )
    .replace(
      "<!-- List exact commands or manual procedures before execution, then preserve what actually ran. -->",
      "- node --test test/account-unlock.test.mjs",
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
  assert.match(readyTaskMarkdown, /## Status\n\nREADY/);
  assert.match(readyTestMarkdown, /## Status\n\nREADY/);
  assert.equal(readyTaskMarkdown.match(/<!-- kyw-task-contract: 3 -->/g)?.length, 1);
  assert.equal(readyTestMarkdown.match(/<!-- kyw-task-contract: 3 -->/g)?.length, 1);
  assert.equal(await readFile(existingMarker, "utf8"), "preserve me\n");
});

test("kyw-task adapter publishes complete READY batches from file or inline JSON", async (t) => {
  const root = await temporaryDirectory(t);
  const fileRoot = join(root, "file", "docs", "tasks");
  const specification = batchSpec([
    { title: "Foundation" },
    {
      title: "Dependent",
      dependencies: [{ taskTitle: "Foundation" }],
    },
  ]);
  const specificationPath = join(root, "batch.json");
  await writeFile(specificationPath, JSON.stringify(specification), "utf8");

  const fileResult = runAdapter([
    "create-batch",
    "--tasks-root",
    fileRoot,
    "--batch-file",
    specificationPath,
  ]);
  assert.equal(fileResult.status, 0, fileResult.stderr);
  const fileBatch = JSON.parse(fileResult.stdout);
  assert.equal(fileBatch.command, "create-batch");
  assert.equal(fileBatch.schemaVersion, 1);
  assert.equal(fileBatch.firstId, "0001");
  assert.equal(fileBatch.lastId, "0002");
  assert.deepEqual(
    fileBatch.tasks.map(({ key, id, dependencies }) => ({ key, id, dependencies })),
    [
      { key: "foundation", id: "0001", dependencies: [] },
      { key: "dependent", id: "0002", dependencies: ["0001"] },
    ],
  );
  for (const task of fileBatch.tasks) {
    const validation = runAdapter(["validate", "--task-directory", task.directory]);
    assert.equal(validation.status, 0, validation.stderr);
    assert.match(await readFile(task.taskPath, "utf8"), /## Status\n\nREADY/);
    assert.match(await readFile(task.testPath, "utf8"), /## Status\n\nREADY/);
  }

  const largeRoot = join(root, "large", "docs", "tasks");
  const largeSpecification = batchSpec([
    { title: "Large foundation" },
    {
      title: "Large dependent",
      dependencies: [{ taskTitle: "Large foundation" }],
    },
  ]);
  largeSpecification.tasks[0].taskMarkdown =
    largeSpecification.tasks[0].taskMarkdown.replace(
      "Deliver one independently verifiable outcome.",
      `Deliver one independently verifiable outcome.\n\n${"Windows-valid-file-backed-payload ".repeat(320)}`,
    );
  const largeSpecificationPath = join(root, "large-batch.json");
  await writeFile(
    largeSpecificationPath,
    JSON.stringify(largeSpecification),
    "utf8",
  );
  assert.ok((await readFile(largeSpecificationPath)).byteLength > 8192);
  const largeResult = runAdapter([
    "create-batch",
    "--tasks-root",
    largeRoot,
    "--batch-file",
    largeSpecificationPath,
  ]);
  assert.equal(largeResult.status, 0, largeResult.stderr);
  const largeBatch = JSON.parse(largeResult.stdout);
  assert.equal(largeBatch.firstId, "0001");
  assert.equal(largeBatch.lastId, "0002");
  assert.deepEqual(await readdir(largeRoot), [
    "0001-large-foundation",
    "0002-large-dependent",
  ]);

  const inlineRoot = join(root, "inline", "docs", "tasks");
  const inlineResult = runAdapter([
    "create-batch",
    "--tasks-root",
    inlineRoot,
    "--batch-json",
    JSON.stringify(batchSpec([{ title: "Single" }])),
  ]);
  assert.equal(inlineResult.status, 0, inlineResult.stderr);
  const inlineBatch = JSON.parse(inlineResult.stdout);
  assert.equal(inlineBatch.firstId, "0001");
  assert.equal(inlineBatch.lastId, "0001");
  assert.equal(inlineBatch.tasks.length, 1);
  assert.equal(inlineBatch.tasks[0].key, "single");

  const compatibilityRoot = join(root, "compatibility", "docs", "tasks");
  const compatibilityResult = runAdapter([
    "create-batch",
    "--tasks-root",
    compatibilityRoot,
    "--batch-json",
    JSON.stringify(
      batchSpec([
        {
          key: "caller-controlled-key",
          title: "A title with a different derived key",
        },
      ]),
    ),
  ]);
  assert.equal(compatibilityResult.status, 0, compatibilityResult.stderr);
  const compatibilityBatch = JSON.parse(compatibilityResult.stdout);
  assert.equal(compatibilityBatch.tasks[0].key, "caller-controlled-key");
  assert.match(
    compatibilityBatch.tasks[0].directory,
    /0001-a-title-with-a-different-derived-key$/,
  );

  const noTransaction = runAdapter([
    "inspect-transaction",
    "--tasks-root",
    inlineRoot,
  ]);
  assert.equal(noTransaction.status, 0, noTransaction.stderr);
  assert.equal(JSON.parse(noTransaction.stdout).state, "NONE");

  const recoverRoot = join(root, "recover", "docs", "tasks");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot: recoverRoot,
      tasks: batchSpec([{ key: "recoverable", title: "Recoverable" }]).tasks,
      hooks: {
        beforeLockReleaseRename() {
          throw new Error("retain committed transaction");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_FINALIZATION_FAILED",
  );
  const transactionInspection = runAdapter([
    "inspect-transaction",
    "--tasks-root",
    recoverRoot,
  ]);
  assert.equal(transactionInspection.status, 0, transactionInspection.stderr);
  const transactionDiagnostic = JSON.parse(transactionInspection.stdout);
  assert.equal(transactionDiagnostic.state, "RECOVERY_REQUIRED");
  assert.equal(transactionDiagnostic.phase, "COMMITTED");
  const transactionRecovery = runAdapter([
    "recover-transaction",
    "--tasks-root",
    recoverRoot,
  ]);
  assert.equal(transactionRecovery.status, 0, transactionRecovery.stderr);
  assert.equal(JSON.parse(transactionRecovery.stdout).action, "completed-cleanup");
  const repeatedRecovery = runAdapter([
    "recover-transaction",
    "--tasks-root",
    recoverRoot,
  ]);
  assert.equal(repeatedRecovery.status, 0, repeatedRecovery.stderr);
  assert.equal(JSON.parse(repeatedRecovery.stdout).state, "NONE");

  const invalidRoot = join(root, "invalid", "docs", "tasks");
  const invalidPair = batchSpec([{ key: "invalid", title: "Invalid" }]);
  invalidPair.tasks[0].testMarkdown = invalidPair.tasks[0].testMarkdown.replace(
    "\nREADY\n",
    "\nDRAFT\n",
  );
  const invalidResult = runAdapter([
    "create-batch",
    "--tasks-root",
    invalidRoot,
    "--batch-json",
    JSON.stringify(invalidPair),
  ]);
  assert.equal(invalidResult.status, 1);
  assert.match(invalidResult.stderr, /INVALID_TASK_BATCH_PAIR/);
  await assert.rejects(
    readdir(invalidRoot),
    (error) => error.code === "ENOENT",
  );

  for (const [args, expectedError] of [
    [
      ["create-batch", "--tasks-root", invalidRoot],
      /INVALID_TASK_BATCH/,
    ],
    [
      [
        "create-batch",
        "--tasks-root",
        invalidRoot,
        "--batch-json",
        JSON.stringify(specification),
        "--batch-file",
        specificationPath,
      ],
      /INVALID_TASK_ADAPTER_ARGUMENTS/,
    ],
    [
      [
        "create-batch",
        "--tasks-root",
        invalidRoot,
        "--batch-json",
        JSON.stringify({ schemaVersion: 2, tasks: [] }),
      ],
      /INVALID_TASK_BATCH/,
    ],
  ]) {
    const result = runAdapter(args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, expectedError);
  }
});

test("current queued artifacts validate without rewriting immutable historical Tasks", async () => {
  const tasksRoot = join(REPOSITORY_ROOT, "docs", "tasks");
  const directories = (await readdir(tasksRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{4}-/.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  assert.deepEqual(
    directories
      .filter((entry) => Number(entry.name.slice(0, 4)) <= 38)
      .map((entry) => entry.name.slice(0, 4)),
    Array.from({ length: 38 }, (_, index) => String(index + 1).padStart(4, "0")),
  );

  for (const entry of directories) {
    const id = Number(entry.name.slice(0, 4));
    const directory = join(tasksRoot, entry.name);
    const taskPath = join(directory, "TASK.md");
    const testPath = join(directory, "TEST.md");
    const taskBytesBefore = await readFile(taskPath);
    const testBytesBefore = await readFile(testPath);
    const taskMarkdown = taskBytesBefore.toString("utf8");
    const testMarkdown = testBytesBefore.toString("utf8");
    const validation = runAdapter(["validate", "--task-directory", directory]);
    assert.equal(validation.status, 0, `${entry.name}: ${validation.stderr}`);
    if (id <= 38) {
      assert.deepEqual(await readFile(taskPath), taskBytesBefore, `${entry.name} TASK.md`);
      assert.deepEqual(await readFile(testPath), testBytesBefore, `${entry.name} TEST.md`);
    }

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
      if (id === 32) {
        assert.match(markdownSection(taskMarkdown, "Dependencies"), /Task 0039/);
      }
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
