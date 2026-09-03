import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ACTIVATION_SCOPED_SKILL_GUARDRAIL_CLAIM_IDS,
  INSTRUCTION_SURFACE_PATHS,
  PERMANENT_DOCUMENT_BUDGET_CHANGE_MARKER,
  PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE,
  PERMANENT_DOCUMENT_DELTA_MARKER,
  PERMANENT_DOCUMENT_POLICY,
  PERMANENT_RULE_FAMILIES,
  REPOSITORY_ROOT,
  REQUIRED_ACTIVATION_SCOPED_SKILL_GUARDRAIL_MANIFEST,
  REQUIRED_INSTRUCTION_RULE_FAMILY_IDS,
  TRUSTED_PUBLISHER_EXPECTATION,
  derivePermanentDocumentEvidenceBaseline,
  evaluatePermanentDocumentBudget,
  measurePermanentDocuments,
  parsePermanentDocumentBudgetChangeEvidence,
  parsePermanentDocumentDeltaEvidence,
  planPermanentDocumentLoading,
  requiresPermanentDocumentGrowthEvidence,
  selectPermanentDocumentEvidence,
  validateFoundation,
  validatePermanentDocumentBudgetChange,
  validatePermanentDocumentCompactionAcceptance,
  validatePermanentDocumentContents,
  validatePermanentDocumentGrowthEvidence,
  validatePermanentDocumentPolicy,
  validatePermanentRuleFamilies,
  validatePermanentDocumentState,
} from "../scripts/lib/validate-foundation.mjs";
import { assertSupportedRuntime } from "../src/core/skill-installation.mjs";

test("package, plugin, Skills, and legal metadata satisfy the foundation contract", () => {
  assert.deepEqual(validateFoundation(), []);
  assert.deepEqual(TRUSTED_PUBLISHER_EXPECTATION, {
    provider: "GitHub Actions",
    organizationOrUser: "kimyeongwoo",
    repository: "kyw-dev",
    repositoryFullName: "kimyeongwoo/kyw-dev",
    workflowFilename: "publish.yml",
    workflowPath: ".github/workflows/publish.yml",
    environment: "npm-production",
    allowedActions: ["npm publish"],
    packageAccess: "public",
  });
});

const documentPaths = [
  "README.md",
  "AGENTS.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
];
const templateNames = ["AGENTS.md", "ARCHITECTURE.md", "README.md", "SPEC.md"];

function validDocuments() {
  return {
    "README.md": [
      "# kyw-dev",
      "",
      "## Start here",
      "",
      "User entry.",
      "",
      "## Installation details",
      "",
      "Install safely.",
      "",
      "## Development",
      "",
      "Run `npm run check` and `node ./scripts/verification-plan.mjs`.",
      "",
    ].join("\n"),
    "AGENTS.md": [
      "# kyw-dev Repository Rules",
      "",
      "## Truth and context loading",
      "",
      "Load truth.",
      "",
      "## Scope and routing",
      "",
      "Keep scope.",
      "",
      "## Evidence and completion",
      "",
      "Record evidence.",
      "",
    ].join("\n"),
    "docs/SPEC.md": [
      "# kyw-dev Product Specification",
      "",
      "## Goals",
      "",
      "Observable behavior.",
      "",
      "## Product acceptance",
      "",
      "Acceptance.",
      "",
    ].join("\n"),
    "docs/ARCHITECTURE.md": [
      "# kyw-dev Architecture",
      "",
      "## System context",
      "",
      "Context.",
      "",
      "## Component groups",
      "",
      "Components.",
      "",
      "## Control flow",
      "",
      "Flow.",
      "",
      "## Trade-offs",
      "",
      "Trade-offs.",
      "",
    ].join("\n"),
  };
}

function validateContents(documents, overrides = {}) {
  return validatePermanentDocumentContents({
    documents,
    templateNames,
    surfaceTexts: documents,
    packageScripts: { check: "npm test" },
    pathExists: (relativePath) => relativePath === "scripts/verification-plan.mjs",
    ruleFamilies: [],
    ...overrides,
  });
}

function formatPercent(delta, before) {
  if (before === 0) {
    return delta === 0 ? "0.00%" : "N/A";
  }
  return `${((delta * 100) / before).toFixed(2)}%`;
}

function deltaEvidenceMarkdown({ baseline, measurements, mutateRow } = {}) {
  const rows = [...documentPaths, "Combined"].map((relativePath) => {
    const before = baseline[relativePath];
    const after = measurements[relativePath];
    const delta = after.bytes - before.bytes;
    const row = {
      path: relativePath,
      beforeBytes: before.bytes,
      afterBytes: after.bytes,
      beforeLines: before.lines,
      afterLines: after.lines,
      byteDelta: delta,
      percent: formatPercent(delta, before.bytes),
      canonicalOwner:
        relativePath === "Combined" ? "all permanent-document owners" : relativePath,
      durableNecessity: "Required durable meaning is mapped to AC-09.",
      replacementOrAbsorption: "Existing wording was replaced or absorption was assessed.",
    };
    mutateRow?.(row);
    return [
      `\`${row.path}\``,
      row.beforeBytes,
      row.afterBytes,
      row.beforeLines,
      row.afterLines,
      row.byteDelta >= 0 ? `+${row.byteDelta}` : row.byteDelta,
      row.percent,
      row.canonicalOwner,
      row.durableNecessity,
      row.replacementOrAbsorption,
    ];
  });
  return [
    "# TEST fixture",
    "",
    "## Results",
    "",
    PERMANENT_DOCUMENT_DELTA_MARKER,
    "",
    "| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |",
    "|---|---:|---:|---:|---:|---:|---:|---|---|---|",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "## Unverified",
    "",
    "- Not applicable — fixture evidence is complete.",
    "",
  ].join("\n");
}

function budgetChangeEvidenceMarkdown(rows) {
  return [
    "# TEST fixture",
    "",
    "## Results",
    "",
    PERMANENT_DOCUMENT_BUDGET_CHANGE_MARKER,
    "",
    "| Path | Field | Before bytes | After bytes | Reason existing sections cannot absorb | New durable meaning | Removed or replaced duplication | Task acceptance | User approval |",
    "|---|---|---:|---:|---|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| \`${row.path}\` | \`${row.field}\` | ${row.beforeBytes} | ${row.afterBytes} | ${row.reasonCannotAbsorb} | ${row.newDurableMeaning} | ${row.removedOrReplacedDuplication} | ${row.taskAcceptance} | ${row.userApproval} |`,
    ),
    "",
    "## Unverified",
    "",
    "- Not applicable — fixture evidence is complete.",
    "",
  ].join("\n");
}

function deltaEvidenceCandidate({
  taskId,
  baseline,
  measurements,
  taskStatus = "DONE",
  testStatus = "PASSED",
  mutateRow,
}) {
  return {
    taskId,
    taskStatus,
    testStatus,
    taskPath: `docs/tasks/${taskId}-fixture/TASK.md`,
    testPath: `docs/tasks/${taskId}-fixture/TEST.md`,
    markdown: deltaEvidenceMarkdown({
      baseline,
      measurements,
      mutateRow,
    }),
  };
}

function documentsWithExactBytes(relativePath, bytes) {
  const documents = validDocuments();
  const currentBytes = Buffer.byteLength(documents[relativePath]);
  assert.ok(currentBytes <= bytes, `${relativePath} fixture cannot shrink to ${bytes}`);
  documents[relativePath] += "x".repeat(bytes - currentBytes);
  assert.equal(Buffer.byteLength(documents[relativePath]), bytes);
  return documents;
}

function validateState(documents, evidenceCandidates) {
  return validatePermanentDocumentState({
    documents,
    templateNames,
    surfaceTexts: documents,
    packageScripts: { check: "npm test" },
    pathExists: (relativePath) =>
      relativePath === "scripts/verification-plan.mjs",
    evidenceCandidates,
    ruleFamilies: [],
  });
}

test("permanent-document policy fixes four unique roles and measures exact UTF-8 bytes", () => {
  assert.deepEqual(validatePermanentDocumentPolicy(), []);
  assert.deepEqual(
    PERMANENT_DOCUMENT_POLICY.documents.map(({ path }) => path),
    documentPaths,
  );
  assert.equal(
    new Set(PERMANENT_DOCUMENT_POLICY.documents.map(({ role }) => role)).size,
    4,
  );

  const measurements = measurePermanentDocuments({
    "README.md": "가\n",
    "AGENTS.md": "a\nb\n",
    "docs/SPEC.md": "",
    "docs/ARCHITECTURE.md": "last-line",
  });
  assert.deepEqual(measurements["README.md"], { bytes: 4, lines: 1 });
  assert.deepEqual(measurements["AGENTS.md"], { bytes: 4, lines: 2 });
  assert.deepEqual(measurements["docs/SPEC.md"], { bytes: 0, lines: 0 });
  assert.deepEqual(measurements["docs/ARCHITECTURE.md"], {
    bytes: 9,
    lines: 1,
  });
  assert.deepEqual(measurements.Combined, { bytes: 17, lines: 4 });
});

test("permanent-document inventory rejects added, missing, renamed, mirrored, and duplicate roles", () => {
  assert.deepEqual(validateContents(validDocuments()), []);

  const added = { ...validDocuments(), "docs/SUMMARY-2.md": "# mirror\n" };
  assert.match(validateContents(added).join("\n"), /inventory must be exactly/);

  const missing = validDocuments();
  delete missing["docs/SPEC.md"];
  assert.match(validateContents(missing).join("\n"), /inventory|missing/);

  const renamed = validDocuments();
  renamed["docs/PRODUCT.md"] = renamed["docs/SPEC.md"];
  delete renamed["docs/SPEC.md"];
  assert.match(validateContents(renamed).join("\n"), /inventory|missing/);

  assert.match(
    validateContents(validDocuments(), {
      pathExists: (relativePath) =>
        relativePath === "scripts/verification-plan.mjs" ||
        relativePath === "docs/SUMMARY.md",
    }).join("\n"),
    /generated permanent-document mirror is forbidden/,
  );
  assert.match(
    validateContents(validDocuments(), {
      templateNames: [...templateNames, "SUMMARY.md"],
    }).join("\n"),
    /project template inventory must be exactly/,
  );

  const duplicateRolePolicy = structuredClone(PERMANENT_DOCUMENT_POLICY);
  duplicateRolePolicy.documents[1].role = duplicateRolePolicy.documents[0].role;
  assert.match(
    validatePermanentDocumentPolicy(duplicateRolePolicy).join("\n"),
    /role is duplicated/,
  );
});

test("permanent-document roles reject SPEC/ARCHITECTURE ownership crossover", () => {
  const architectureProductHeading = validDocuments();
  architectureProductHeading["docs/ARCHITECTURE.md"] +=
    "\n## Product acceptance criteria\n\nMoved behavior.\n";
  assert.match(
    validateContents(architectureProductHeading).join("\n"),
    /SPEC-owned product heading/,
  );

  const specificationStructureHeading = validDocuments();
  specificationStructureHeading["docs/SPEC.md"] +=
    "\n## Authority and dependency direction\n\nMoved structure.\n";
  assert.match(
    validateContents(specificationStructureHeading).join("\n"),
    /ARCHITECTURE-owned structural heading/,
  );
});

test("document guard rejects chronology, evidence leakage, detailed procedure, and stale commands", () => {
  const mutations = [
    ["numbered chronology", "README.md", "Task 0047 reached READY_FOR_APPROVAL.", /chronology|verdict/],
    ["full SHA", "docs/SPEC.md", "a".repeat(40), /full Git SHA/],
    ["evidence heading", "AGENTS.md", "## Results", /Task\/Test evidence heading/],
    [
      "internal procedure",
      "docs/ARCHITECTURE.md",
      "Use --delivery-ledger-json here.",
      /internal delivery payload/,
    ],
    [
      "test catalog",
      "docs/ARCHITECTURE.md",
      "### Unit tests",
      /development test catalog/,
    ],
    ["stale npm", "README.md", "Run `npm run missing-script`.", /stale npm command/],
    [
      "stale Node",
      "README.md",
      "Run `node ./scripts/missing-command.mjs`.",
      /stale Node command/,
    ],
  ];
  for (const [label, relativePath, addition, expected] of mutations) {
    const documents = validDocuments();
    documents[relativePath] += `\n${addition}\n`;
    assert.match(validateContents(documents).join("\n"), expected, label);
  }
});

test("document guard permits generic stable vocabulary and current command examples", () => {
  const documents = validDocuments();
  documents["README.md"] += [
    "",
    "Use `task 0006 실행해줘`; generic `Task NNNN`, SHA, release-candidate,",
    "candidate readiness, and CLI exit code 7 are stable vocabulary.",
    "",
  ].join("\n");
  assert.deepEqual(validateContents(documents), []);
});

test("AGENTS warning target and hard ceiling keep exact inclusive boundaries", () => {
  const agentsPolicy = PERMANENT_DOCUMENT_POLICY.documents.find(
    ({ path }) => path === "AGENTS.md",
  );
  assert.equal(
    evaluatePermanentDocumentBudget(agentsPolicy, 4_096).status,
    "WITHIN_WARNING_BUDGET",
  );
  assert.equal(
    evaluatePermanentDocumentBudget(agentsPolicy, 4_097).status,
    "GROWTH_EVIDENCE_REQUIRED",
  );
  assert.equal(
    evaluatePermanentDocumentBudget(agentsPolicy, 8_192).status,
    "GROWTH_EVIDENCE_REQUIRED",
  );
  assert.equal(
    evaluatePermanentDocumentBudget(agentsPolicy, 8_192, {
      hasGrowthEvidence: true,
    }).status,
    "WITHIN_HARD_LIMIT_WITH_EVIDENCE",
  );
  assert.equal(
    evaluatePermanentDocumentBudget(agentsPolicy, 8_193, {
      hasGrowthEvidence: true,
    }).status,
    "HARD_LIMIT_EXCEEDED",
  );
});

test("one-time compaction targets are measured separately from future budgets", () => {
  const measurements = Object.fromEntries(
    Object.entries(PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.targets).map(
      ([relativePath, bytes]) => [relativePath, { bytes, lines: 1 }],
    ),
  );
  assert.deepEqual(
    validatePermanentDocumentCompactionAcceptance({ measurements }),
    [],
  );
  measurements["README.md"].bytes += 1;
  assert.match(
    validatePermanentDocumentCompactionAcceptance({ measurements }).join("\n"),
    /README\.md one-time compaction target exceeded/,
  );

  const readmePolicy = PERMANENT_DOCUMENT_POLICY.documents.find(
    ({ path }) => path === "README.md",
  );
  assert.equal(
    evaluatePermanentDocumentBudget(
      readmePolicy,
      PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.targets["README.md"] + 1,
    ).status,
    "WITHIN_WARNING_BUDGET",
  );
});

test("every per-document and combined warning/hard budget uses inclusive boundaries", () => {
  for (const entry of [
    ...PERMANENT_DOCUMENT_POLICY.documents,
    PERMANENT_DOCUMENT_POLICY.combined,
  ]) {
    assert.equal(
      evaluatePermanentDocumentBudget(entry, entry.warningBytes).acceptable,
      true,
      `${entry.path}: warning boundary`,
    );
    assert.equal(
      evaluatePermanentDocumentBudget(entry, entry.warningBytes + 1).status,
      "GROWTH_EVIDENCE_REQUIRED",
      `${entry.path}: warning + 1`,
    );
    assert.equal(
      evaluatePermanentDocumentBudget(entry, entry.hardBytes, {
        hasGrowthEvidence: true,
      }).acceptable,
      true,
      `${entry.path}: hard boundary`,
    );
    assert.equal(
      evaluatePermanentDocumentBudget(entry, entry.hardBytes + 1, {
        hasGrowthEvidence: true,
      }).status,
      "HARD_LIMIT_EXCEEDED",
      `${entry.path}: hard + 1`,
    );
  }
});

test("growth thresholds use exact integer arithmetic", () => {
  assert.equal(
    requiresPermanentDocumentGrowthEvidence({
      beforeBytes: 100_000,
      afterBytes: 102_047,
    }),
    false,
  );
  assert.equal(
    requiresPermanentDocumentGrowthEvidence({
      beforeBytes: 100_000,
      afterBytes: 102_048,
    }),
    true,
  );
  assert.equal(
    requiresPermanentDocumentGrowthEvidence({
      beforeBytes: 10_000,
      afterBytes: 10_999,
    }),
    false,
  );
  assert.equal(
    requiresPermanentDocumentGrowthEvidence({
      beforeBytes: 10_000,
      afterBytes: 11_000,
    }),
    true,
  );
  for (const [increase, expected] of [
    [-1, false],
    [0, false],
    [1, true],
  ]) {
    assert.equal(
      requiresPermanentDocumentGrowthEvidence({
        beforeBytes: 10_000,
        afterBytes: 10_000 + increase,
        combined: true,
      }),
      expected,
      `combined ${increase}`,
    );
  }
});

test("delta evidence parser binds all rows to exact bytes, lines, deltas, and percentages", () => {
  const baseline = {
    "README.md": { bytes: 9_000, lines: 90 },
    "AGENTS.md": { bytes: 3_000, lines: 30 },
    "docs/SPEC.md": { bytes: 10_000, lines: 100 },
    "docs/ARCHITECTURE.md": { bytes: 12_000, lines: 120 },
    Combined: { bytes: 34_000, lines: 340 },
  };
  const measurements = {
    "README.md": { bytes: 12_000, lines: 95 },
    "AGENTS.md": { bytes: 3_000, lines: 30 },
    "docs/SPEC.md": { bytes: 10_000, lines: 100 },
    "docs/ARCHITECTURE.md": { bytes: 12_000, lines: 120 },
    Combined: { bytes: 37_000, lines: 345 },
  };
  const markdown = deltaEvidenceMarkdown({ baseline, measurements });
  assert.equal(parsePermanentDocumentDeltaEvidence(markdown).rows.size, 5);
  assert.deepEqual(
    validatePermanentDocumentGrowthEvidence({
      markdown,
      measurements,
      baseline,
    }),
    [],
  );

  const afterMismatch = markdown.replace(
    "| 9000 | 12000 | 90 | 95 |",
    "| 9000 | 11999 | 90 | 95 |",
  );
  assert.match(
    validatePermanentDocumentGrowthEvidence({
      markdown: afterMismatch,
      measurements,
      baseline,
    }).join("\n"),
    /afterBytes must be 12000/,
  );

  const missingLines = markdown.replace(
    "| 90 | 95 | +3000 |",
    "| 90 | missing | +3000 |",
  );
  assert.match(
    validatePermanentDocumentGrowthEvidence({
      markdown: missingLines,
      measurements,
      baseline,
    }).join("\n"),
    /afterLines must be 95/,
  );

  const missingJustification = deltaEvidenceMarkdown({
    baseline,
    measurements,
    mutateRow(row) {
      if (row.path === "README.md") {
        row.durableNecessity = "Not applicable";
        row.replacementOrAbsorption = "None";
      }
    },
  });
  assert.match(
    validatePermanentDocumentGrowthEvidence({
      markdown: missingJustification,
      measurements,
      baseline,
    }).join("\n"),
    /durable-necessity.*replacement\/absorption/s,
  );
});

test("missing delta fields and table inventory fail closed", () => {
  const baseline = Object.fromEntries(
    [...documentPaths, "Combined"].map((relativePath) => [
      relativePath,
      { bytes: 1, lines: 1 },
    ]),
  );
  const measurements = structuredClone(baseline);
  measurements["README.md"].bytes = 2;
  measurements.Combined.bytes = 2;
  const missing = "# TEST\n\n## Results\n\n- No table.\n";
  assert.match(
    validatePermanentDocumentGrowthEvidence({
      markdown: missing,
      measurements,
      baseline,
    }).join("\n"),
    /missing kyw-permanent-document-delta/,
  );

  const withoutCombined = deltaEvidenceMarkdown({ baseline, measurements })
    .split("\n")
    .filter((line) => !line.startsWith("| `Combined` |"))
    .join("\n");
  assert.match(
    validatePermanentDocumentGrowthEvidence({
      markdown: withoutCombined,
      measurements,
      baseline,
    }).join("\n"),
    /rows must be exactly/,
  );
});

test("current active TEST evidence wins, otherwise the latest retained marker wins", () => {
  const marked = (taskId, taskStatus, testStatus) => ({
    taskId,
    taskStatus,
    testStatus,
    testPath: `docs/tasks/${taskId}-fixture/TEST.md`,
    markdown: `# TEST ${taskId}\n\n## Results\n\n${PERMANENT_DOCUMENT_DELTA_MARKER}\n`,
  });
  const retained = marked("0055", "DONE", "PASSED");
  const newerRetained = marked("0056", "DONE", "PASSED");
  const current = marked("0057", "IN_PROGRESS", "RUNNING");

  assert.equal(
    selectPermanentDocumentEvidence([retained, newerRetained]).selected.taskId,
    "0056",
  );
  assert.equal(
    selectPermanentDocumentEvidence([retained, newerRetained, current]).selected
      .taskId,
    "0057",
  );
  assert.equal(
    selectPermanentDocumentEvidence([
      retained,
      {
        ...current,
        markdown: "# TEST 0057\n\n## Results\n\n- No document delta.\n",
      },
    ]).selected.taskId,
    "0055",
  );
  assert.match(
    selectPermanentDocumentEvidence([
      current,
      marked("0058", "IN_PROGRESS", "RUNNING"),
    ]).errors.join("\n"),
    /multiple active/,
  );
});

test("future delta evidence continues from the highest earlier marked TEST", () => {
  const documents0055 = validDocuments();
  const measurements0055 = measurePermanentDocuments(documents0055);
  const documents0056 = {
    ...documents0055,
    "README.md": `${documents0055["README.md"]}Future durable meaning.\n`,
  };
  const measurements0056 = measurePermanentDocuments(documents0056);
  const evidence0055 = deltaEvidenceCandidate({
    taskId: "0055",
    baseline: PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.before,
    measurements: measurements0055,
  });
  const evidence0056 = deltaEvidenceCandidate({
    taskId: "0056",
    baseline: measurements0055,
    measurements: measurements0056,
  });
  const candidates = [evidence0055, evidence0056];
  const selected = selectPermanentDocumentEvidence(candidates).selected;
  const continuity = derivePermanentDocumentEvidenceBaseline(
    candidates,
    selected,
  );
  assert.equal(continuity.previous.taskId, "0055");
  assert.deepEqual(continuity.baseline, measurements0055);
  assert.deepEqual(
    validatePermanentDocumentGrowthEvidence({
      markdown: selected.markdown,
      measurements: measurements0056,
      baseline: continuity.baseline,
    }),
    [],
  );
  assert.deepEqual(validateState(documents0056, candidates), []);

  const falsified0056 = deltaEvidenceCandidate({
    taskId: "0056",
    baseline: measurements0055,
    measurements: measurements0056,
    mutateRow(row) {
      row.beforeBytes = row.afterBytes;
      row.beforeLines = row.afterLines;
      row.byteDelta = 0;
      row.percent = "0.00%";
    },
  });
  const falsifiedSelection = selectPermanentDocumentEvidence([
    evidence0055,
    falsified0056,
  ]).selected;
  const derived = derivePermanentDocumentEvidenceBaseline(
    [evidence0055, falsified0056],
    falsifiedSelection,
  );
  assert.match(
    validatePermanentDocumentGrowthEvidence({
      markdown: falsifiedSelection.markdown,
      measurements: measurements0056,
      baseline: derived.baseline,
    }).join("\n"),
    /beforeBytes must be/,
  );
  assert.match(
    validateState(documents0056, [evidence0055, falsified0056]).join("\n"),
    /beforeBytes must be/,
  );
});

test("0055 terminal evidence keeps one-time targets while a later marker switches to budgets", () => {
  const readmeTarget =
    PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.targets["README.md"];
  const documentsAtTarget = documentsWithExactBytes(
    "README.md",
    readmeTarget,
  );
  const measurementsAtTarget = measurePermanentDocuments(documentsAtTarget);
  const documentsOverTarget = documentsWithExactBytes(
    "README.md",
    readmeTarget + 1,
  );
  const measurementsOverTarget =
    measurePermanentDocuments(documentsOverTarget);

  const terminal0055OverTarget = deltaEvidenceCandidate({
    taskId: "0055",
    baseline: PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.before,
    measurements: measurementsOverTarget,
    taskStatus: "DONE",
    testStatus: "PASSED",
  });
  assert.match(
    validateState(documentsOverTarget, [terminal0055OverTarget]).join("\n"),
    /README\.md one-time compaction target exceeded/,
  );

  const terminal0055AtTarget = deltaEvidenceCandidate({
    taskId: "0055",
    baseline: PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.before,
    measurements: measurementsAtTarget,
    taskStatus: "DONE",
    testStatus: "PASSED",
  });
  const laterEvidence = deltaEvidenceCandidate({
    taskId: "0056",
    baseline: measurementsAtTarget,
    measurements: measurementsOverTarget,
    taskStatus: "DONE",
    testStatus: "PASSED",
  });
  assert.deepEqual(
    validateState(documentsOverTarget, [
      terminal0055AtTarget,
      laterEvidence,
    ]),
    [],
  );
});

test("every budget change requires exact approval evidence and foundation rejects an unapproved limit", () => {
  const proposed = structuredClone(PERMANENT_DOCUMENT_POLICY);
  const agents = proposed.documents.find(({ path }) => path === "AGENTS.md");
  agents.warningBytes += 1;
  agents.hardBytes += 1;

  const automatic = validatePermanentDocumentBudgetChange({
    previousPolicy: PERMANENT_DOCUMENT_POLICY,
    proposedPolicy: proposed,
  });
  assert.match(automatic.join("\n"), /cannot absorb/);
  assert.match(automatic.join("\n"), /explicit user approval/);

  const approval = (beforeBytes, afterBytes) => ({
    reasonCannotAbsorb: "Existing owner sections cannot carry the new invariant.",
    newDurableMeaning: "A new repository-wide safety invariant is required.",
    beforeBytes,
    afterBytes,
    removedOrReplacedDuplication: "Duplicate routing prose was removed first.",
    taskAcceptance: "Task acceptance AC-09 explicitly approves the policy review.",
    userApproval: "The current user explicitly approved this exact budget change.",
  });
  assert.deepEqual(
    validatePermanentDocumentBudgetChange({
      previousPolicy: PERMANENT_DOCUMENT_POLICY,
      proposedPolicy: proposed,
      evidence: {
        "AGENTS.md": {
          warningBytes: approval(4_096, 4_097),
          hardBytes: approval(8_192, 8_193),
        },
      },
    }),
    [],
  );

  const decreased = structuredClone(PERMANENT_DOCUMENT_POLICY);
  const decreasedAgents = decreased.documents.find(
    ({ path }) => path === "AGENTS.md",
  );
  decreasedAgents.warningBytes -= 1;
  assert.match(
    validatePermanentDocumentBudgetChange({
      previousPolicy: PERMANENT_DOCUMENT_POLICY,
      proposedPolicy: decreased,
    }).join("\n"),
    /AGENTS\.md warningBytes change requires/,
  );
  assert.deepEqual(
    validatePermanentDocumentBudgetChange({
      previousPolicy: PERMANENT_DOCUMENT_POLICY,
      proposedPolicy: decreased,
      evidence: {
        "AGENTS.md": {
          warningBytes: approval(4_096, 4_095),
        },
      },
    }),
    [],
  );

  const markdown = budgetChangeEvidenceMarkdown([
    {
      path: "AGENTS.md",
      field: "warningBytes",
      ...approval(4_096, 4_097),
    },
    {
      path: "AGENTS.md",
      field: "hardBytes",
      ...approval(8_192, 8_193),
    },
  ]);
  const parsed = parsePermanentDocumentBudgetChangeEvidence(markdown);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(
    validatePermanentDocumentBudgetChange({
      previousPolicy: PERMANENT_DOCUMENT_POLICY,
      proposedPolicy: proposed,
      evidence: parsed.evidence,
    }),
    [],
  );

  const unauthorizedPolicy = structuredClone(PERMANENT_DOCUMENT_POLICY);
  unauthorizedPolicy.documents.find(
    ({ path }) => path === "README.md",
  ).warningBytes += 1;
  assert.match(
    validateFoundation(undefined, {
      permanentDocumentPolicy: unauthorizedPolicy,
    }).join("\n"),
    /README\.md warningBytes change requires/,
  );
});

test("owner/projection registry rejects every ownership and projection failure category", () => {
  const registry = [
    {
      id: "demo",
      owner: {
        path: "owner.md",
        anchors: [{ source: "OWNER ANCHOR", flags: "" }],
      },
      projections: [
        {
          path: "skills/demo/SKILL.md",
          profile: "procedure",
          anchors: [{ source: "PROJECTION ANCHOR", flags: "" }],
        },
        {
          path: "README.md",
          anchors: [{ source: "README PROJECTION", flags: "" }],
        },
      ],
      forbiddenDetailedAnchors: [{ source: "OWNER DETAIL", flags: "" }],
    },
  ];
  const texts = {
    "owner.md": "OWNER ANCHOR\nOWNER DETAIL\n",
    "skills/demo/SKILL.md": "PROJECTION ANCHOR\nOWNER DETAIL\n",
    "README.md": "README PROJECTION\n",
    "other.md": "Other text.\n",
  };
  const allowedSurfacePaths = new Set(Object.keys(texts));
  assert.deepEqual(
    validatePermanentRuleFamilies(registry, texts, {
      allowedSurfacePaths,
      requiredFamilyIds: ["demo"],
    }),
    [],
  );

  const duplicateOwner = structuredClone(registry);
  duplicateOwner[0].owner = [
    duplicateOwner[0].owner,
    { path: "other.md", anchors: [] },
  ];
  assert.match(
    validatePermanentRuleFamilies(duplicateOwner, texts, {
      allowedSurfacePaths,
      requiredFamilyIds: ["demo"],
    }).join("\n"),
    /exactly one canonical owner/,
  );

  const missingOwner = structuredClone(registry);
  missingOwner[0].owner = undefined;
  assert.match(
    validatePermanentRuleFamilies(missingOwner, texts, {
      allowedSurfacePaths,
      requiredFamilyIds: ["demo"],
    }).join("\n"),
    /exactly one canonical owner/,
  );

  const unlistedProjection = structuredClone(registry);
  unlistedProjection[0].projections.push({
    path: "unlisted.md",
    anchors: [],
  });
  assert.match(
    validatePermanentRuleFamilies(unlistedProjection, texts, {
      allowedSurfacePaths,
      requiredFamilyIds: ["demo"],
    }).join("\n"),
    /unlisted or duplicate projection/,
  );

  const copiedProcedure = {
    ...texts,
    "other.md": "OWNER DETAIL\n",
  };
  assert.match(
    validatePermanentRuleFamilies(registry, copiedProcedure, {
      allowedSurfacePaths,
      requiredFamilyIds: ["demo"],
    }).join("\n"),
    /detailed procedure appears as an unlisted projection/,
  );

  const copiedPermanentProjection = {
    ...texts,
    "README.md": "README PROJECTION\nOWNER DETAIL\n",
  };
  assert.match(
    validatePermanentRuleFamilies(registry, copiedPermanentProjection, {
      allowedSurfacePaths,
      requiredFamilyIds: ["demo"],
    }).join("\n"),
    /detailed procedure appears as an unlisted projection in README\.md/,
  );

  const staleProjection = {
    ...texts,
    "skills/demo/SKILL.md": "Stale projection.\n",
  };
  assert.match(
    validatePermanentRuleFamilies(registry, staleProjection, {
      allowedSurfacePaths,
      requiredFamilyIds: ["demo"],
    }).join("\n"),
    /projection .* is stale/,
  );

  assert.match(
    validatePermanentRuleFamilies([], texts, {
      allowedSurfacePaths,
      requiredFamilyIds: ["demo"],
    }).join("\n"),
    /ownerless or unregistered: demo/,
  );
});

test("every named instruction owner and required projection is mutation-guarded", () => {
  const texts = Object.fromEntries(
    INSTRUCTION_SURFACE_PATHS.map((relativePath) => [
      relativePath,
      readFileSync(join(REPOSITORY_ROOT, relativePath), "utf8"),
    ]),
  );
  const options = {
    allowedSurfacePaths: new Set(INSTRUCTION_SURFACE_PATHS),
    requiredFamilyIds: REQUIRED_INSTRUCTION_RULE_FAMILY_IDS,
  };
  assert.deepEqual(
    PERMANENT_RULE_FAMILIES.map(({ id }) => id),
    REQUIRED_INSTRUCTION_RULE_FAMILY_IDS,
  );
  assert.deepEqual(
    validatePermanentRuleFamilies(PERMANENT_RULE_FAMILIES, texts, options),
    [],
  );

  for (const family of PERMANENT_RULE_FAMILIES) {
    const missingOwner = { ...texts, [family.owner.path]: "" };
    assert.match(
      validatePermanentRuleFamilies(
        PERMANENT_RULE_FAMILIES,
        missingOwner,
        options,
      ).join("\n"),
      new RegExp(`${family.id} canonical owner is missing anchor`),
      family.id,
    );
    for (const projection of family.projections) {
      const staleProjection = { ...texts, [projection.path]: "" };
      assert.match(
        validatePermanentRuleFamilies(
          PERMANENT_RULE_FAMILIES,
          staleProjection,
          options,
        ).join("\n"),
        new RegExp(`${family.id} projection .* is stale`),
        `${family.id}:${projection.path}`,
      );
    }
  }

  const ownerless = PERMANENT_RULE_FAMILIES.filter(
    ({ id }) => id !== "test-evidence-shape",
  );
  assert.match(
    validatePermanentRuleFamilies(ownerless, texts, options).join("\n"),
    /ownerless or unregistered: test-evidence-shape/,
  );
});

test("activation-scoped guardrails fix their projection manifest, claims, and lifecycle graph", () => {
  const expectedClaims = [
    "exact-activation-only",
    "inactive-ordinary",
    "aligned-no-reconfirmation",
    "change-warning-zero-mutation",
    "fresh-exact-reconfirmation",
    "truth-sync-before-action",
    "bounded-action",
    "invalid-or-stale-expiry",
    "exact-skill-mode-route-preserved",
    "combined-route-once-no-self-confirm",
    "post-terminal-inactive",
    "safety-boundary-preserved",
  ];
  const expectedProjections = [
    { path: "README.md", profile: "concise" },
    { path: "AGENTS.md", profile: "concise" },
    { path: "templates/project/AGENTS.md", profile: "concise" },
    { path: "docs/ARCHITECTURE.md", profile: "flow" },
    { path: "skills/kyw-grilling/SKILL.md", profile: "procedure" },
    { path: "skills/kyw-init/SKILL.md", profile: "procedure" },
    { path: "skills/kyw-task/SKILL.md", profile: "procedure" },
    { path: "skills/kyw-impl/SKILL.md", profile: "procedure" },
    { path: "skills/kyw-impl/references/execution.md", profile: "procedure" },
    { path: "skills/kyw-audit/SKILL.md", profile: "procedure" },
    { path: "skills/kyw-audit/references/audit.md", profile: "procedure" },
  ];
  const expectedStates = [
    "INACTIVE",
    "ACTIVE_ALIGNED",
    "CHANGE_PENDING",
    "RECONFIRMED_BOUNDED",
    "CANCELLED_OR_EXPIRED",
  ];
  const expectedTransitions = [
    "ordinary-remains-inactive",
    "exact-route-activates",
    "aligned-turn-continues",
    "material-change-warns",
    "route-locked-change-requires-exact-route",
    "exact-warning-reconfirmed",
    "bounded-action-completes",
    "invalid-or-stale-response-expires",
    "changed-request-rewarns",
    "aligned-cancel-or-expire",
    "pending-cancel-or-expire",
    "bounded-cancel-or-expire",
    "aligned-workflow-completes",
    "terminal-next-turn-is-inactive",
  ];
  const expectedTransitionTuples = [
    [
      "ordinary-remains-inactive",
      "INACTIVE",
      "ORDINARY_PROMPT",
      "INACTIVE",
      "NONE",
      ["ALLOW_ORDINARY_OUTCOME"],
      null,
    ],
    ["exact-route-activates", "INACTIVE", "EXACT_ROUTE", "ACTIVE_ALIGNED", "NONE", ["ACTIVATE_ONCE"], null],
    ["aligned-turn-continues", "ACTIVE_ALIGNED", "ALIGNED_TURN", "ACTIVE_ALIGNED", "BOUNDED", ["EXECUTE_ALIGNED_ACTION"], null],
    [
      "material-change-warns",
      "ACTIVE_ALIGNED",
      "MATERIAL_CHANGE",
      "CHANGE_PENDING",
      "NONE",
      ["EMIT_OLD_NEW_IMPACT_WARNING", "WAIT_FOR_RECONFIRMATION"],
      null,
    ],
    [
      "route-locked-change-requires-exact-route",
      "CHANGE_PENDING",
      "ROUTE_LOCKED_CHANGE",
      "CANCELLED_OR_EXPIRED",
      "NONE",
      ["CLEAR_PENDING_WARNING", "REQUIRE_EXACT_ROUTE"],
      null,
    ],
    [
      "exact-warning-reconfirmed",
      "CHANGE_PENDING",
      "EXACT_FRESH_RECONFIRMATION",
      "RECONFIRMED_BOUNDED",
      "NONE",
      ["BIND_EXACT_WARNING"],
      ["ACTION", "TARGET", "SCOPE", "ATTEMPT"],
    ],
    [
      "bounded-action-completes",
      "RECONFIRMED_BOUNDED",
      "SYNC_AND_EXECUTE_WARNED_ACTION",
      "INACTIVE",
      "BOUNDED",
      ["SYNC_TASK_TEST", "SYNC_PERMANENT_OWNERS", "EXECUTE_WARNED_ACTION"],
      ["ACTION", "TARGET", "SCOPE", "ATTEMPT"],
    ],
    [
      "invalid-or-stale-response-expires",
      "CHANGE_PENDING",
      "INVALID_OR_STALE_RESPONSE",
      "CANCELLED_OR_EXPIRED",
      "NONE",
      ["CLEAR_PENDING_WARNING"],
      null,
    ],
    [
      "changed-request-rewarns",
      "CHANGE_PENDING",
      "CHANGED_REQUEST",
      "CHANGE_PENDING",
      "NONE",
      [
        "CLEAR_PENDING_WARNING",
        "EMIT_OLD_NEW_IMPACT_WARNING",
        "WAIT_FOR_RECONFIRMATION",
      ],
      null,
    ],
    [
      "aligned-cancel-or-expire",
      "ACTIVE_ALIGNED",
      "CANCEL_OR_EXPIRE",
      "CANCELLED_OR_EXPIRED",
      "NONE",
      ["CANCEL_ACTIVE_WORKFLOW"],
      null,
    ],
    [
      "pending-cancel-or-expire",
      "CHANGE_PENDING",
      "CANCEL_OR_EXPIRE",
      "CANCELLED_OR_EXPIRED",
      "NONE",
      ["CLEAR_PENDING_WARNING", "CANCEL_ACTIVE_WORKFLOW"],
      null,
    ],
    [
      "bounded-cancel-or-expire",
      "RECONFIRMED_BOUNDED",
      "CANCEL_OR_EXPIRE",
      "CANCELLED_OR_EXPIRED",
      "NONE",
      ["CANCEL_ACTIVE_WORKFLOW"],
      null,
    ],
    [
      "aligned-workflow-completes",
      "ACTIVE_ALIGNED",
      "WORKFLOW_TERMINAL",
      "INACTIVE",
      "NONE",
      ["COMPLETE_ACTIVE_WORKFLOW"],
      null,
    ],
    [
      "terminal-next-turn-is-inactive",
      "CANCELLED_OR_EXPIRED",
      "NEXT_TURN",
      "INACTIVE",
      "NONE",
      ["CLEAR_INVOCATION_STATE"],
      null,
    ],
  ];
  assert.deepEqual(ACTIVATION_SCOPED_SKILL_GUARDRAIL_CLAIM_IDS, expectedClaims);
  assert.deepEqual(REQUIRED_ACTIVATION_SCOPED_SKILL_GUARDRAIL_MANIFEST, {
    id: "activation-scoped-skill-guardrails",
    owner: { path: "docs/SPEC.md", profile: "owner" },
    profiles: {
      owner: { claims: expectedClaims },
      concise: { claims: expectedClaims },
      flow: { claims: expectedClaims },
      procedure: { claims: expectedClaims },
    },
    projections: expectedProjections,
    contract: {
      schemaVersion: 1,
      initialState: "INACTIVE",
      exactRouteLockedFields: ["SKILL", "MODE", "ROUTE_CAPABILITY"],
      taskIdentityRouteLockedFields: [
        "SELECTED_TASK",
        "SELECTED_TASK_DIRECTORY",
        "TASK_PAIR_DISPOSITION",
        "DELIVERY_DISPOSITION",
      ],
      taskIdentityRouteLockedSkills: ["kyw-task", "kyw-impl", "kyw-audit"],
      implementationActionDispositions: [
        ["IMPLEMENT", "MUTABLE", "NONE", "MUTATING"],
        ["RESUME", "MUTABLE", "NONE", "MUTATING"],
        ["DELIVER", "MUTABLE", "RESUMABLE", "MUTATING"],
        ["REPORT", "IMMUTABLE", "SATISFIED", "READ_ONLY"],
      ],
      stateIds: expectedStates,
      transitionIds: expectedTransitions,
      transitionTuples: expectedTransitionTuples,
      nonMutatingTransitionIds: [
        "ordinary-remains-inactive",
        "exact-route-activates",
        "material-change-warns",
        "route-locked-change-requires-exact-route",
        "exact-warning-reconfirmed",
        "invalid-or-stale-response-expires",
        "changed-request-rewarns",
        "aligned-cancel-or-expire",
        "pending-cancel-or-expire",
        "bounded-cancel-or-expire",
        "aligned-workflow-completes",
        "terminal-next-turn-is-inactive",
      ],
      boundedTransitionIds: ["aligned-turn-continues", "bounded-action-completes"],
      warningTransitionId: "material-change-warns",
      exactRouteRequiredTransitionId: "route-locked-change-requires-exact-route",
      reconfirmationTransitionId: "exact-warning-reconfirmed",
      boundedActionTransitionId: "bounded-action-completes",
      requiredSyncEffects: ["SYNC_TASK_TEST", "SYNC_PERMANENT_OWNERS"],
      boundedActionEffect: "EXECUTE_WARNED_ACTION",
      requiredBounds: ["ACTION", "TARGET", "SCOPE", "ATTEMPT"],
    },
  });
  const texts = Object.fromEntries(
    INSTRUCTION_SURFACE_PATHS.map((relativePath) => [
      relativePath,
      readFileSync(join(REPOSITORY_ROOT, relativePath), "utf8"),
    ]),
  );
  texts["docs/SPEC.md"] += [
    "",
    "### 6.3 Activation-scoped guardrails and ordinary prompts",
    "Only an exact route activates this invocation-local workflow.",
    "The controlling old criterion and requested new criterion create a zero mutation wait.",
    "Only the immediately next explicit confirmation advances.",
    "Synchronize every applicable mutable Task/Test contract before action.",
    "The originating combined turn cannot confirm itself.",
  ].join("\n");
  texts["README.md"] +=
    "\nOutside an active workflow, a warning requires reconfirmation.\n";
  for (const relativePath of ["AGENTS.md", "templates/project/AGENTS.md"]) {
    texts[relativePath] +=
      "\nKYW guardrails start only on an exact route; zero-mutation wait requires reconfirmation.\n";
  }
  texts["docs/ARCHITECTURE.md"] +=
    "\n<!-- kyw-active-skill-guardrails:v1 -->\ninactive ordinary handling; active aligned baseline; zero-mutation wait; permanent truth + mutable pair sync; bounded action/target/scope/attempt.\n";
  for (const { path, profile } of
    REQUIRED_ACTIVATION_SCOPED_SKILL_GUARDRAIL_MANIFEST.projections) {
    if (profile === "procedure") {
      texts[path] += "\n<!-- kyw-active-skill-guardrails:v1 -->\n";
    }
  }

  const options = {
    allowedSurfacePaths: new Set(INSTRUCTION_SURFACE_PATHS),
    requiredFamilyIds: [REQUIRED_ACTIVATION_SCOPED_SKILL_GUARDRAIL_MANIFEST.id],
  };
  const family = PERMANENT_RULE_FAMILIES.find(
    ({ id }) => id === REQUIRED_ACTIVATION_SCOPED_SKILL_GUARDRAIL_MANIFEST.id,
  );
  assert.ok(family);
  assert.deepEqual(
    { path: family.owner.path, profile: family.owner.profile },
    REQUIRED_ACTIVATION_SCOPED_SKILL_GUARDRAIL_MANIFEST.owner,
  );
  assert.deepEqual(
    family.projections.map(({ path, profile }) => ({ path, profile })),
    REQUIRED_ACTIVATION_SCOPED_SKILL_GUARDRAIL_MANIFEST.projections,
  );
  assert.deepEqual(family.owner.claims, expectedClaims);
  for (const projection of family.projections) {
    assert.deepEqual(projection.claims, expectedClaims);
  }
  assert.deepEqual(family.contract.states, expectedStates);
  assert.deepEqual(
    family.contract.transitions.map(({ id }) => id),
    expectedTransitions,
  );
  assert.deepEqual(validatePermanentRuleFamilies([family], texts, options), []);

  const errorsAfter = (mutate) => {
    const mutableFamily = structuredClone(family);
    mutate(mutableFamily);
    return validatePermanentRuleFamilies([mutableFamily], texts, options).join("\n");
  };

  assert.match(
    errorsAfter((mutableFamily) => mutableFamily.projections.pop()),
    /exact required projection path\/profile inventory/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.projections[0].profile = "flow";
    }),
    /exact required projection path\/profile inventory/,
  );
  assert.match(
    errorsAfter((mutableFamily) => mutableFamily.projections[0].claims.pop()),
    /missing or reorders required concise claims/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.owner.anchors = [];
    }),
    /must retain at least one wording smoke anchor/,
  );
  assert.match(
    errorsAfter((mutableFamily) => mutableFamily.contract.states.pop()),
    /lifecycle state inventory is incomplete or reordered/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.states.push("INACTIVE");
    }),
    /lifecycle states must be unique nonempty IDs/,
  );
  assert.match(
    errorsAfter((mutableFamily) => mutableFamily.contract.transitions.pop()),
    /lifecycle transition inventory is incomplete or reordered/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.transitions[1].to = "UNKNOWN";
    }),
    /references an unknown state/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.transitions.find(
        ({ id }) => id === "exact-warning-reconfirmed",
      ).to = "INACTIVE";
    }),
    /lifecycle state is unreachable from INACTIVE: RECONFIRMED_BOUNDED/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.transitions[1].from =
        mutableFamily.contract.transitions[0].from;
      mutableFamily.contract.transitions[1].event =
        mutableFamily.contract.transitions[0].event;
    }),
    /lifecycle is nondeterministic/,
  );
  for (const [transitionId, field, value] of [
    ["ordinary-remains-inactive", "to", "ACTIVE_ALIGNED"],
    ["exact-route-activates", "effects", ["DO_NOT_ACTIVATE"]],
    ["aligned-turn-continues", "event", "NOT_ALIGNED"],
    ["invalid-or-stale-response-expires", "to", "CHANGE_PENDING"],
    ["changed-request-rewarns", "to", "INACTIVE"],
    ["terminal-next-turn-is-inactive", "to", "CANCELLED_OR_EXPIRED"],
  ]) {
    assert.match(
      errorsAfter((mutableFamily) => {
        mutableFamily.contract.transitions.find(({ id }) => id === transitionId)[field] =
          value;
      }),
      /lifecycle transition contracts drifted from the manifest/,
      `${transitionId}.${field}`,
    );
  }
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.transitions.find(
        ({ id }) => id === "material-change-warns",
      ).mutation = "BOUNDED";
    }),
    /material-change-warns must remain mutation-free|warning must enter pending state with zero mutation/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.invariants.exactRouteLockedFields.pop();
    }),
    /exact Skill\/mode route-locked fields must remain non-waivable/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.invariants.taskIdentityRouteLockedFields.pop();
    }),
    /task-bearing route identity must lock selected Task, directory, pair, and delivery disposition/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.invariants.taskIdentityRouteLockedSkills.pop();
    }),
    /task-bearing route identity must lock selected Task, directory, pair, and delivery disposition/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.invariants.implementationActionDispositions[2][1] =
        "IMMUTABLE";
    }),
    /implementation action must preserve pair and delivery disposition/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.transitions.find(
        ({ id }) => id === "route-locked-change-requires-exact-route",
      ).mutation = "BOUNDED";
    }),
    /route-locked-change-requires-exact-route must remain mutation-free|route-locked change must expire mutation-free/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      const transition = mutableFamily.contract.transitions.find(
        ({ id }) => id === "bounded-action-completes",
      );
      transition.effects = [
        "EXECUTE_WARNED_ACTION",
        "SYNC_TASK_TEST",
        "SYNC_PERMANENT_OWNERS",
      ];
    }),
    /synchronize Task\/Test and permanent truth before bounded action/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.transitions.find(
        ({ id }) => id === "bounded-action-completes",
      ).to = "RECONFIRMED_BOUNDED";
    }),
    /bounded action must complete the invocation in INACTIVE/,
  );
  assert.match(
    errorsAfter((mutableFamily) => {
      mutableFamily.contract.transitions[2].effects.push("EXECUTE_WARNED_ACTION");
    }),
    /warned bounded action may occur only after exact fresh reconfirmation/,
  );
});

test("activation guardrail details are exempt only in procedure projections", () => {
  const texts = Object.fromEntries(
    INSTRUCTION_SURFACE_PATHS.map((relativePath) => [
      relativePath,
      readFileSync(join(REPOSITORY_ROOT, relativePath), "utf8"),
    ]),
  );
  for (const [relativePath, detail] of [
    [
      "README.md",
      "Immediately next unambiguous explicit reconfirmation of those exact warned bounds.",
    ],
    [
      "AGENTS.md",
      "Concrete implementation, Task/Test, permanent-document, verification, and delivery impacts.",
    ],
    [
      "docs/ARCHITECTURE.md",
      "Changed or additional action, target, scope, and attempt.",
    ],
  ]) {
    const injected = {
      ...texts,
      [relativePath]: `${texts[relativePath]}\n${detail}\n`,
    };
    const errors = validatePermanentRuleFamilies(
      PERMANENT_RULE_FAMILIES,
      injected,
      {
        allowedSurfacePaths: new Set(INSTRUCTION_SURFACE_PATHS),
        requiredFamilyIds: REQUIRED_INSTRUCTION_RULE_FAMILY_IDS,
      },
    ).join("\n");
    assert.match(
      errors,
      new RegExp(
        `activation-scoped-skill-guardrails detailed procedure appears as an unlisted projection in ${relativePath.replaceAll(".", "\\.")}`,
      ),
      relativePath,
    );
  }

  const detail =
    "Immediately next unambiguous explicit reconfirmation of those exact warned bounds.";
  const procedurePath = "skills/kyw-init/SKILL.md";
  const injectedProcedure = {
    ...texts,
    [procedurePath]: `${texts[procedurePath]}\n${detail}\n`,
  };
  const procedureErrors = validatePermanentRuleFamilies(
    PERMANENT_RULE_FAMILIES,
    injectedProcedure,
    {
      allowedSurfacePaths: new Set(INSTRUCTION_SURFACE_PATHS),
      requiredFamilyIds: REQUIRED_INSTRUCTION_RULE_FAMILY_IDS,
    },
  ).join("\n");
  assert.doesNotMatch(
    procedureErrors,
    new RegExp(
      `activation-scoped-skill-guardrails detailed procedure appears as an unlisted projection in ${procedurePath.replaceAll(".", "\\.")}`,
    ),
  );

  const demoted = structuredClone(PERMANENT_RULE_FAMILIES);
  demoted
    .find(({ id }) => id === "activation-scoped-skill-guardrails")
    .projections.find(({ path }) => path === procedurePath).profile = "flow";
  assert.match(
    validatePermanentRuleFamilies(demoted, injectedProcedure, {
      allowedSurfacePaths: new Set(INSTRUCTION_SURFACE_PATHS),
      requiredFamilyIds: REQUIRED_INSTRUCTION_RULE_FAMILY_IDS,
    }).join("\n"),
    new RegExp(
      `activation-scoped-skill-guardrails detailed procedure appears as an unlisted projection in ${procedurePath.replaceAll(".", "\\.")}`,
    ),
  );
});

test("progressive loading targets owner sections and omits a nonexistent authoring pair", () => {
  for (const [label, signal, expected] of [
    ["README setup", { goal: ["README.md#installation"] }, "README.md#installation"],
    [
      "SPEC behavior",
      { scope: ["docs/SPEC.md#task-behavior"] },
      "docs/SPEC.md#task-behavior",
    ],
    [
      "ARCHITECTURE boundary",
      { documentationImpact: ["docs/ARCHITECTURE.md#boundaries"] },
      "docs/ARCHITECTURE.md#boundaries",
    ],
  ]) {
    const plan = planPermanentDocumentLoading(signal);
    assert.equal(plan.mode, "TARGETED", label);
    assert.deepEqual(plan.alwaysRead, ["AGENTS.md"], label);
    assert.deepEqual(plan.targetedSections, [expected], label);
    assert.deepEqual(plan.fullRead, [], label);
  }

  const implementation = planPermanentDocumentLoading({
    workflow: "kyw-impl",
    hasCurrentPair: true,
    taskPath: "docs/tasks/0055-example/TASK.md",
    testPath: "docs/tasks/0055-example/TEST.md",
    goal: ["docs/SPEC.md#behavior"],
    scope: ["README.md#commands"],
    documentationImpact: ["docs/ARCHITECTURE.md#validation"],
    changedCode: ["docs/ARCHITECTURE.md#components"],
    dependencies: ["docs/SPEC.md#compatibility"],
  });
  assert.deepEqual(implementation.alwaysRead, [
    "AGENTS.md",
    "docs/tasks/0055-example/TASK.md",
    "docs/tasks/0055-example/TEST.md",
  ]);
  assert.deepEqual(implementation.indexOrSearch, [
    "README.md",
    "docs/SPEC.md",
    "docs/ARCHITECTURE.md",
  ]);
  assert.deepEqual(implementation.targetedSections, [
    "README.md#commands",
    "docs/ARCHITECTURE.md#components",
    "docs/ARCHITECTURE.md#validation",
    "docs/SPEC.md#behavior",
    "docs/SPEC.md#compatibility",
  ]);
});

test("progressive loading escalates every full-read trigger and blocks unresolved truth", () => {
  for (const [input, reason] of [
    [{ workflow: "kyw-init" }, "kyw-init"],
    [{ rebaseline: true }, "rebaseline"],
    [{ majorRedesign: true }, "major-redesign"],
    [{ broadCrossOwner: true }, "broad-cross-owner"],
    [{ ambiguousOwner: true }, "ambiguous-owner"],
    [{ missingOwnerHeading: true }, "missing-owner-heading"],
    [{ targetedTruthInsufficient: true }, "targeted-truth-insufficient"],
  ]) {
    const plan = planPermanentDocumentLoading(input);
    assert.equal(plan.mode, "FULL", reason);
    assert.deepEqual(plan.fullRead, [
      "README.md",
      "AGENTS.md",
      "docs/SPEC.md",
      "docs/ARCHITECTURE.md",
    ]);
    assert.ok(plan.fullReadReasons.includes(reason));
  }

  const conflict = planPermanentDocumentLoading({ sourceConflict: true });
  assert.equal(conflict.mode, "FULL");
  assert.equal(conflict.blocked, true);

  const resolvedConflict = planPermanentDocumentLoading({
    sourceConflict: true,
    conflictResolved: true,
  });
  assert.equal(resolvedConflict.mode, "FULL");
  assert.equal(resolvedConflict.blocked, false);

  const unresolvedAfterFullRead = planPermanentDocumentLoading({
    ambiguousOwner: true,
    unresolvedAfterFullRead: true,
  });
  assert.equal(unresolvedAfterFullRead.blocked, true);
});

test("runtime support enforces the documented Node.js 22 floor", () => {
  for (const version of ["22.0.0", "24.11.0", "26.0.0"]) {
    assert.doesNotThrow(() => assertSupportedRuntime(version));
  }
  for (const version of ["21.99.0", "not-a-version"]) {
    assert.throws(
      () => assertSupportedRuntime(version),
      (error) => error.code === "UNSUPPORTED_RUNTIME" && error.exitCode === 2,
    );
  }
});
