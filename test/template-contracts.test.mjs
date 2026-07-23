import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateTaskDirectory } from "../src/core/task-artifacts.mjs";
import {
  DOCUMENT_CONTRACTS,
  MODEL_PROVENANCE_FIELDS,
  TASK_CONTRACT_MARKER,
  TASK_TEST_STATUS_PAIRS,
  readCanonicalTemplate,
  renderTemplate,
  validateCanonicalTemplate,
  validateModelProvenance,
  validateTaskTestContract,
} from "../src/core/template-contracts.mjs";

const fixturesRoot = fileURLToPath(new URL("./fixtures/task-repositories/", import.meta.url));
const ergonomicsFixturesRoot = path.join(fixturesRoot, "ergonomics");

test("template contracts cover every canonical project, Task, and Test document", async () => {
  for (const kind of Object.keys(DOCUMENT_CONTRACTS)) {
    const template = await readCanonicalTemplate(kind);
    assert.deepEqual(validateCanonicalTemplate(kind, template), [], kind);
  }

  const readme = await readCanonicalTemplate("README");
  const missingPurpose = readme.replace(/^## Purpose[\s\S]*?(?=^## )/m, "");
  assert.match(validateCanonicalTemplate("README", missingPurpose).join("\n"), /missing required section "Purpose"/);
});

test("rendered Task templates form a valid DRAFT pair without unresolved tokens", async () => {
  const values = { TASK_ID: "0042", TASK_TITLE: "Deterministic contracts" };
  const taskMarkdown = renderTemplate(await readCanonicalTemplate("TASK"), values);
  const testMarkdown = renderTemplate(await readCanonicalTemplate("TEST"), values);

  assert.doesNotMatch(taskMarkdown, /\{\{[A-Z_]+\}\}/);
  assert.doesNotMatch(testMarkdown, /\{\{[A-Z_]+\}\}/);
  assert.deepEqual(validateTaskTestContract({ taskMarkdown, testMarkdown }), []);
  assert.throws(
    () => renderTemplate("{{KNOWN}} {{MISSING}}", { KNOWN: "value" }),
    /Missing template values: MISSING/,
  );
});

test("current Task ergonomics accept reasoned N/A, reject empty ambiguity, and retain one artifact type", async () => {
  const fixtureNames = [
    "0101-standard-task",
    "0102-documentation-only",
    "0103-bug-fix",
    "0104-blocked-task",
    "0105-release-task",
  ];
  for (const fixtureName of fixtureNames) {
    assert.deepEqual(
      await validateTaskDirectory(path.join(ergonomicsFixturesRoot, fixtureName)),
      [],
      fixtureName,
    );
  }

  const standardDirectory = path.join(ergonomicsFixturesRoot, "0101-standard-task");
  const standardTask = await readFile(path.join(standardDirectory, "TASK.md"), "utf8");
  const standardTest = await readFile(path.join(standardDirectory, "TEST.md"), "utf8");
  const validateStandardMutation = (taskMarkdown, testMarkdown = standardTest) =>
    validateTaskTestContract({ taskMarkdown, testMarkdown }).join("\n");

  assert.match(
    validateStandardMutation(
      standardTask.replace(
        "- Not applicable — the pure string transformation has no material compatibility risk.",
        "- None",
      ),
    ),
    /section "Risks" cannot use bare None/,
  );
  assert.match(
    validateStandardMutation(
      standardTask.replace(
        "- Not applicable — existing normalization policy settles the implementation choice.",
        "- Preserve the existing normalization policy.\n- None",
      ),
    ),
    /section "Decisions" cannot use bare None/,
  );
  assert.match(
    validateStandardMutation(
      standardTask.replace(
        "## Decisions\n\n- Not applicable — existing normalization policy settles the implementation choice.",
        "## Decisions\n\n<!-- unresolved placeholder -->",
      ),
    ),
    /section "Decisions" requires meaningful content/,
  );
  assert.match(
    validateStandardMutation(
      standardTask.replace(
        "- Not applicable — no discovery has changed the approved fixture scope.",
        "- Not applicable",
      ),
    ),
    /section "Discoveries and Changes" must use one standalone "Not applicable — <reason>" entry/,
  );
  assert.match(
    validateStandardMutation(
      standardTask.replace(
        "- [ ] AC-01: A display label is returned without surrounding whitespace.",
        "- Not applicable — the Task still requires observable acceptance.",
      ),
    ),
    /requires at least one acceptance criterion/,
  );
  assert.match(
    validateStandardMutation(
      standardTask,
      standardTest.replace(
        "| T-01 | AC-01 — surrounding whitespace is removed | Run the focused label fixture | Unit | TODO | Verification has not run. |",
        "",
      ),
    ),
    /requires at least one matrix row/,
  );

  const releaseDirectory = path.join(ergonomicsFixturesRoot, "0105-release-task");
  const releaseTask = await readFile(path.join(releaseDirectory, "TASK.md"), "utf8");
  assert.ok(
    releaseTask.split(/\r?\n/).length > standardTask.split(/\r?\n/).length,
    "the same validator accepts longer justified release evidence without a size profile",
  );

  const values = { TASK_ID: "0999", TASK_TITLE: "Cancelled draft" };
  const cancelledDraftTask = renderTemplate(await readCanonicalTemplate("TASK"), values).replace(
    "\nDRAFT\n",
    "\nCANCELLED\n",
  );
  const cancelledDraftTest = renderTemplate(await readCanonicalTemplate("TEST"), values).replace(
    "\nDRAFT\n",
    "\nBLOCKED\n",
  );
  assert.deepEqual(
    validateTaskTestContract({
      taskMarkdown: cancelledDraftTask,
      testMarkdown: cancelledDraftTest,
    }),
    [],
    "cancelled authoring preserves incomplete DRAFT history without invented content",
  );
});

test("model provenance records observed and unavailable values without inference", async () => {
  const unavailable = await readCanonicalTemplate("TEST");
  assert.deepEqual(validateModelProvenance(unavailable, { required: true }), []);
  for (const field of MODEL_PROVENANCE_FIELDS) {
    assert.match(unavailable, new RegExp(`^- ${field}:`, "m"));
  }

  const observedValues = new Map([
    ["Model identifier", "gpt-example-1"],
    ["Requested model alias", "example-alias"],
    ["Reasoning effort", "high"],
    ["Codex surface", "CLI"],
    ["Codex version", "1.2.3"],
  ]);
  const observed = [
    "## Model Provenance",
    "",
    ...MODEL_PROVENANCE_FIELDS.map(
      (field) => `- ${field}: \`${observedValues.get(field)}\` (\`OBSERVED\`: exposed by fixture)`,
    ),
  ].join("\n");
  assert.deepEqual(validateModelProvenance(observed, { required: true }), []);

  const mixed = observed
    .replace(
      "- Model identifier: `gpt-example-1` (`OBSERVED`: exposed by fixture)",
      "- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: fixture hides the exact identifier)",
    )
    .replace(
      "- Requested model alias: `example-alias` (`OBSERVED`: exposed by fixture)",
      "- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: fixture supplied no override)",
    );
  assert.deepEqual(validateModelProvenance(mixed, { required: true }), []);

  assert.match(
    validateModelProvenance(
      mixed.replace(
        "- Reasoning effort: `high` (`OBSERVED`: exposed by fixture)",
        "- Reasoning effort: `high` (`UNAVAILABLE`: hidden by fixture)",
      ),
    ).join("\n"),
    /marked UNAVAILABLE must use value UNAVAILABLE/,
  );
  assert.match(
    validateModelProvenance(
      mixed.replace(
        "- Codex version: `1.2.3` (`OBSERVED`: exposed by fixture)",
        "- Codex version: `UNAVAILABLE` (`OBSERVED`: exposed by fixture)",
      ),
    ).join("\n"),
    /marked OBSERVED must record an observed value/,
  );
  assert.deepEqual(validateModelProvenance("# TEST 0001 — Legacy\n"), []);
  assert.match(
    validateModelProvenance("# TEST 0001 — New\n", { required: true }).join("\n"),
    /missing required section "Model Provenance"/,
  );
  assert.match(
    validateModelProvenance(undefined).join("\n"),
    /Model Provenance content must be a string/,
  );
  assert.match(
    validateModelProvenance(`${mixed}\n\n${mixed}`).join("\n"),
    /Model Provenance must appear exactly once/,
  );
  assert.match(
    validateModelProvenance(
      mixed.replace(/^- Codex surface:.*\n/m, ""),
    ).join("\n"),
    /must contain exactly 5 field lines[\s\S]*requires exactly one "Codex surface" field/,
  );
  assert.match(
    validateModelProvenance(
      mixed.replace(
        "- Codex version: `1.2.3` (`OBSERVED`: exposed by fixture)",
        "- Codex version: 1.2.3 observed by fixture",
      ),
    ).join("\n"),
    /must use `value` \(`OBSERVED\|UNAVAILABLE`: basis\)/,
  );
  assert.match(
    validateModelProvenance(
      observed.replace(
        "- Model identifier: `gpt-example-1` (`OBSERVED`: exposed by fixture)",
        "- Model identifier: `   ` (`OBSERVED`: exposed by fixture)",
      ),
    ).join("\n"),
    /must use `value` \(`OBSERVED\|UNAVAILABLE`: basis\)/,
  );
  assert.match(
    validateModelProvenance(
      observed.replace(
        "- Model identifier: `gpt-example-1` (`OBSERVED`: exposed by fixture)",
        "- Model identifier: `NOT_REQUESTED` (`OBSERVED`: no identifier requested)",
      ),
    ).join("\n"),
    /NOT_REQUESTED is valid only for "Requested model alias"/,
  );
  assert.match(
    validateModelProvenance(
      observed.replace(
        "- Model identifier: `gpt-example-1` (`OBSERVED`: exposed by fixture)",
        "- Model identifier: `gpt-example-1` (`OBSERVED`:    )",
      ),
    ).join("\n"),
    /must use `value` \(`OBSERVED\|UNAVAILABLE`: basis\)/,
  );
  assert.match(
    validateModelProvenance(
      observed.replace(
        "- Codex surface: `CLI` (`OBSERVED`: exposed by fixture)",
        "- Reasoning effort: `high` (`OBSERVED`: exposed by fixture)",
      ),
    ).join("\n"),
    /requires exactly one "Reasoning effort" field[\s\S]*requires exactly one "Codex surface" field/,
  );
  assert.match(
    validateModelProvenance(
      observed.replace(
        "- Codex surface: `CLI` (`OBSERVED`: exposed by fixture)",
        "- Runtime flavor: `CLI` (`OBSERVED`: exposed by fixture)",
      ),
    ).join("\n"),
    /unknown field line[\s\S]*requires exactly one "Codex surface" field/,
  );
  const outOfOrderLines = observed.split("\n");
  [outOfOrderLines[2], outOfOrderLines[3]] = [outOfOrderLines[3], outOfOrderLines[2]];
  assert.match(
    validateModelProvenance(outOfOrderLines.join("\n")).join("\n"),
    /fields must use the canonical order/,
  );

  const withoutBlock = unavailable.replace(/^## Model Provenance[\s\S]*?(?=^## )/m, "");
  assert.match(
    validateCanonicalTemplate("TEST", withoutBlock).join("\n"),
    /missing required section "Model Provenance"/,
  );
});

test("validator accepts a complete fixture and reports actionable malformed-state errors", async () => {
  const validDirectory = path.join(fixturesRoot, "normal", "docs", "tasks", "0001-complete-task");
  assert.deepEqual(await validateTaskDirectory(validDirectory), []);

  const malformedDirectory = path.join(fixturesRoot, "malformed", "docs", "tasks", "0001-broken-task");
  const errors = (await validateTaskDirectory(malformedDirectory)).join("\n");
  assert.match(errors, /missing required section "Blockers"/);
  assert.match(errors, /invalid Status "FLYING"/);
  assert.match(errors, /invalid Status "SUCCESS"/);
  assert.match(errors, /cannot use PASS without reproducible evidence/);
  assert.match(errors, /duplicate matrix test ID T-01/);
  assert.match(errors, /unknown acceptance criterion AC-03/);
  assert.match(errors, /acceptance criterion AC-02 has no matrix reference/);
  assert.match(errors, /PASSED requires recorded Results evidence/);
  assert.match(errors, /PASSED requires every Final Coverage Review item to be checked/);
});

test("validator rejects invalid Test status and inconsistent DONE or PASS claims", async () => {
  const directory = path.join(fixturesRoot, "normal", "docs", "tasks", "0001-complete-task");
  const taskMarkdown = await readFile(path.join(directory, "TASK.md"), "utf8");
  const passedTest = await readFile(path.join(directory, "TEST.md"), "utf8");

  const invalidStatus = passedTest.replace("\nPASSED\n", "\nCOMPLETE\n");
  assert.match(
    validateTaskTestContract({ taskMarkdown, testMarkdown: invalidStatus }).join("\n"),
    /invalid Status "COMPLETE"/,
  );

  const runningTest = passedTest.replace("\nPASSED\n", "\nRUNNING\n");
  assert.match(
    validateTaskTestContract({ taskMarkdown, testMarkdown: runningTest }).join("\n"),
    /DONE requires TEST.md Status PASSED/,
  );

  const unsupportedPass = passedTest.replace(
    "| PASS | Contract validator returned no errors. |",
    "| PASS | |",
  );
  assert.match(
    validateTaskTestContract({ taskMarkdown, testMarkdown: unsupportedPass }).join("\n"),
    /cannot use PASS without reproducible evidence/,
  );

  const emptyFinalReview = passedTest.replace(
    /^## Final Coverage Review[\s\S]*$/m,
    "## Final Coverage Review\n\nReview completed in prose.\n",
  );
  assert.match(
    validateTaskTestContract({ taskMarkdown, testMarkdown: emptyFinalReview }).join("\n"),
    /PASSED requires a Final Coverage Review checklist/,
  );

  const mismatchedId = passedTest.replace("# TEST 0001", "# TEST 0002");
  assert.match(
    validateTaskTestContract({ taskMarkdown, testMarkdown: mismatchedId }).join("\n"),
    /IDs do not match \(0001 != 0002\)/,
  );
});

test("validator enforces exact lifecycle pairs while retaining legacy completed evidence", async () => {
  const directory = path.join(fixturesRoot, "normal", "docs", "tasks", "0001-complete-task");
  const doneTask = await readFile(path.join(directory, "TASK.md"), "utf8");
  const passedTest = await readFile(path.join(directory, "TEST.md"), "utf8");
  const currentTask = doneTask
    .replace(/^# TASK 0001 — Complete Task$/m, `$&\n\n${TASK_CONTRACT_MARKER}`)
    .replace(
      /^## Completed$/m,
      "## Delivery\n\n- Requirement: STANDARD\n- Canonical ledger: GitHub PR/Actions exact-SHA state.\n\nRepository outcome only.\n\n## Completed",
    )
    .replace(
      /^## Discoveries and Changes$/m,
      "## Risks\n\n- None known.\n\n## Discoveries and Changes",
    )
    .replace(
      /^## Dependencies\n\n- None$/m,
      "## Dependencies\n\n- Not applicable — the fixture has no hard Task dependency.",
    )
    .replace(
      /^## Discoveries and Changes\n\n- None\.$/m,
      "## Discoveries and Changes\n\n- Not applicable — no discovery changed the fixture.",
    )
    .replace(
      /^## Blockers\n\n- None\.$/m,
      "## Blockers\n\n- Not applicable — no blocker remains.",
    )
    .replace(
      /^## Remaining\n\n- None\.$/m,
      "## Remaining\n\n- None — repository outcome complete.",
    )
    .replace(
      /^## Resume Point\n\nNo work remains\.$/m,
      "## Resume Point\n\n- None — repository outcome complete.",
    );
  const currentTest = passedTest
    .replace(/^# TEST 0001 — Complete Task$/m, `$&\n\n${TASK_CONTRACT_MARKER}`)
    .replace(
      /^## Unverified\n\n- None\.$/m,
      "## Unverified\n\n- Not applicable — no residual risk remains.",
    );

  for (const [taskStatus, testStatus] of TASK_TEST_STATUS_PAIRS) {
    const taskMarkdown = currentTask.replace("\nDONE\n", `\n${taskStatus}\n`);
    const testMarkdown = currentTest.replace("\nPASSED\n", `\n${testStatus}\n`);
    assert.deepEqual(
      validateTaskTestContract({ taskMarkdown, testMarkdown }),
      [],
      `${taskStatus}/${testStatus}`,
    );
  }

  for (const [taskStatus, testStatus] of [
    ["DRAFT", "READY"],
    ["READY", "RUNNING"],
    ["IN_PROGRESS", "READY"],
    ["BLOCKED", "READY"],
    ["CANCELLED", "READY"],
    ["READY", "PASSED"],
  ]) {
    const taskMarkdown = currentTask.replace("\nDONE\n", `\n${taskStatus}\n`);
    const testMarkdown = currentTest.replace("\nPASSED\n", `\n${testStatus}\n`);
    assert.match(
      validateTaskTestContract({ taskMarkdown, testMarkdown }).join("\n"),
      new RegExp(`inconsistent status pair ${taskStatus}/${testStatus}`),
    );
  }

  assert.deepEqual(validateTaskTestContract({ taskMarkdown: doneTask, testMarkdown: passedTest }), []);
  const legacyFreeformProvenance = passedTest.replace(
    /^## Results$/m,
    "## Model Provenance\n\nHistorical free-form note.\n\n## Results",
  );
  assert.deepEqual(
    validateTaskTestContract({
      taskMarkdown: doneTask,
      testMarkdown: legacyFreeformProvenance,
    }),
    [],
    "an unmarked legacy pair retains its historical free-form extra-section meaning",
  );
  const malformedCurrentProvenance = currentTest.replace(
    /^## Results$/m,
    "## Model Provenance\n\nHistorical free-form note.\n\n## Results",
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask,
      testMarkdown: malformedCurrentProvenance,
    }).join("\n"),
    /Model Provenance must contain exactly 5 field lines/,
  );
  assert.deepEqual(
    validateTaskTestContract({
      taskMarkdown: doneTask.replace("\nDONE\n", "\nREADY\n"),
      testMarkdown: passedTest.replace("\nPASSED\n", "\nRUNNING\n"),
    }),
    [],
    "unmarked history retains its legacy status validation",
  );
});

test("current contract validates static delivery policy and repository-only terminal handoff", async () => {
  const directory = path.join(fixturesRoot, "normal", "docs", "tasks", "0001-complete-task");
  const legacyTask = await readFile(path.join(directory, "TASK.md"), "utf8");
  const legacyTest = await readFile(path.join(directory, "TEST.md"), "utf8");
  const currentTask = legacyTask
    .replace(/^# TASK 0001 — Complete Task$/m, `$&\n\n${TASK_CONTRACT_MARKER}`)
    .replace(
      /^## Completed$/m,
      "## Delivery\n\n- Requirement: STANDARD\n- Canonical ledger: GitHub PR/Actions exact-SHA state.\n\nRepository outcome only.\n\n## Completed",
    )
    .replace(
      /^## Discoveries and Changes$/m,
      "## Risks\n\n- None known.\n\n## Discoveries and Changes",
    )
    .replace(
      /^## Dependencies\n\n- None$/m,
      "## Dependencies\n\n- Not applicable — the fixture has no hard Task dependency.",
    )
    .replace(
      /^## Discoveries and Changes\n\n- None\.$/m,
      "## Discoveries and Changes\n\n- Not applicable — no discovery changed the fixture.",
    )
    .replace(
      /^## Blockers\n\n- None\.$/m,
      "## Blockers\n\n- Not applicable — no blocker remains.",
    )
    .replace(
      /^## Remaining\n\n- None\.$/m,
      "## Remaining\n\n- None — repository outcome complete.",
    )
    .replace(/^## Resume Point\n\nNo work remains\.$/m, "## Resume Point\n\n- None — repository outcome complete.");
  const currentTest = legacyTest
    .replace(/^# TEST 0001 — Complete Task$/m, `$&\n\n${TASK_CONTRACT_MARKER}`)
    .replace(
      /^## Unverified\n\n- None\.$/m,
      "## Unverified\n\n- Not applicable — no residual risk remains.",
    );

  assert.deepEqual(
    validateTaskTestContract({ taskMarkdown: currentTask, testMarkdown: currentTest }),
    [],
  );

  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(/^## Delivery[\s\S]*?(?=^## Completed$)/m, ""),
      testMarkdown: currentTest,
    }).join("\n"),
    /current contract requires exactly one section "Delivery"/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(/^## Risks[\s\S]*?(?=^## Discoveries and Changes$)/m, ""),
      testMarkdown: currentTest,
    }).join("\n"),
    /current contract requires exactly one section "Risks"/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: `${currentTask}\n## Status\n\nCANCELLED\n`,
      testMarkdown: currentTest,
    }).join("\n"),
    /current contract requires exactly one section "Status"/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "- Requirement: STANDARD",
        "- Requirement: NONE",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /Delivery Requirement must be STANDARD or NONE/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "- Requirement: STANDARD",
        "- Requirement: STANDARD\n- Requirement: NONE — local-only fixture",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /requires exactly one Delivery Requirement/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "- Requirement: STANDARD",
        "- Requirement: NONE — local-only fixture",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /NONE delivery must not declare an external canonical ledger/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "Repository outcome only.",
        "- State: PENDING",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /mutable GitHub delivery state belongs in the external ledger/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "Repository outcome only.",
        "PR #999 is merged; Actions passed on deadbeef.",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /must not contain mutable PR, merge, SHA, or Actions results/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "- None — repository outcome complete.",
        "- None.",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /DONE requires Remaining to record reasoned None/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "## Resume Point\n\n- None — repository outcome complete.",
        "## Resume Point\n\nMerge the pull request after this commit.",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /DONE requires Resume Point to record reasoned None/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "## Remaining\n\n- None — repository outcome complete.",
        "## Remaining\n\n- None — repository outcome complete.\n- Open a pull request later.",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /DONE requires Remaining to record reasoned None/,
  );
  assert.match(
    validateTaskTestContract({
      taskMarkdown: currentTask.replace(
        "## Resume Point\n\n- None — repository outcome complete.",
        "## Resume Point\n\n- None — repository outcome complete.\n- Merge later.",
      ),
      testMarkdown: currentTest,
    }).join("\n"),
    /DONE requires Resume Point to record reasoned None/,
  );

  const malformedTask = currentTask.replace(TASK_CONTRACT_MARKER, "<!-- kyw-task-contract: 2.0 -->");
  const malformedTest = currentTest.replace(TASK_CONTRACT_MARKER, "<!-- kyw-task-contract: 2.0 -->");
  const malformedErrors = validateTaskTestContract({
    taskMarkdown: malformedTask,
    testMarkdown: malformedTest,
  }).join("\n");
  assert.match(malformedErrors, /TASK.md: malformed Task contract marker/);
  assert.match(malformedErrors, /TEST.md: malformed Task contract marker/);
});
