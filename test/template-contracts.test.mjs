import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateTaskDirectory } from "../src/core/task-artifacts.mjs";
import {
  DOCUMENT_CONTRACTS,
  readCanonicalTemplate,
  renderTemplate,
  validateCanonicalTemplate,
  validateTaskTestContract,
} from "../src/core/template-contracts.mjs";

const fixturesRoot = fileURLToPath(new URL("./fixtures/task-repositories/", import.meta.url));

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
    /DONE requires TEST\.md Status PASSED/,
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
