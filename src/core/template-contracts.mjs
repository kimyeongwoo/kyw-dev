import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const TEMPLATE_ROOT = fileURLToPath(new URL("../../templates/", import.meta.url));

export const TASK_STATUSES = Object.freeze([
  "DRAFT",
  "READY",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
  "CANCELLED",
]);
export const TEST_STATUSES = Object.freeze(["DRAFT", "READY", "RUNNING", "PASSED", "BLOCKED"]);
export const TEST_ROW_STATUSES = Object.freeze(["TODO", "PASS", "FAIL", "BLOCKED", "N/A"]);

export const DOCUMENT_CONTRACTS = Object.freeze({
  README: Object.freeze({
    relativePath: "project/README.md",
    requiredSections: Object.freeze([
      "Purpose",
      "Prerequisites",
      "Installation and Setup",
      "Commands",
      "Configuration",
      "Usage",
      "Repository Map",
      "Project Documents",
    ]),
    requiredTokens: Object.freeze(["PROJECT_NAME"]),
  }),
  AGENTS: Object.freeze({
    relativePath: "project/AGENTS.md",
    requiredSections: Object.freeze([
      "Sources of Truth",
      "Working Scope",
      "Documentation Sync",
      "Verification",
      "Completion Gate",
    ]),
    requiredTokens: Object.freeze(["VERIFY_COMMANDS"]),
  }),
  SPEC: Object.freeze({
    relativePath: "project/SPEC.md",
    requiredSections: Object.freeze([
      "Goals",
      "Non-goals",
      "User-visible Behavior",
      "Business and Domain Rules",
      "Functional Requirements",
      "Quality Requirements",
      "Acceptance Criteria",
      "Unresolved Decisions",
    ]),
    requiredTokens: Object.freeze(["PROJECT_NAME"]),
  }),
  ARCHITECTURE: Object.freeze({
    relativePath: "project/ARCHITECTURE.md",
    requiredSections: Object.freeze([
      "System Context",
      "Components and Responsibilities",
      "Module and Dependency Boundaries",
      "Data and Control Flow",
      "Storage and External Interfaces",
      "Cross-cutting Constraints",
      "Trade-offs",
    ]),
    requiredTokens: Object.freeze(["PROJECT_NAME"]),
  }),
  TASK: Object.freeze({
    relativePath: "task/TASK.md",
    requiredSections: Object.freeze([
      "Status",
      "Goal",
      "Dependencies",
      "In Scope",
      "Out of Scope",
      "Acceptance Criteria",
      "Plan",
      "Decisions",
      "Discoveries and Changes",
      "Documentation Impact",
      "Completed",
      "Remaining",
      "Resume Point",
      "Blockers",
    ]),
    requiredTokens: Object.freeze(["TASK_ID", "TASK_TITLE"]),
  }),
  TEST: Object.freeze({
    relativePath: "task/TEST.md",
    requiredSections: Object.freeze([
      "Status",
      "Test Basis",
      "Intent-to-Test Matrix",
      "Regression Coverage",
      "Commands",
      "Results",
      "Unverified",
      "Final Coverage Review",
    ]),
    requiredTokens: Object.freeze(["TASK_ID", "TASK_TITLE"]),
  }),
});

const matrixHeaders = ["ID", "Intent / acceptance criterion", "Method", "Level", "Status", "Evidence"];
const unsupportedEvidence = /^(?:-|none|n\/a|not run(?: yet)?|todo|pending)[.!]?$/i;

function normalizeKind(kind) {
  const normalized = String(kind).toUpperCase().replace(/\.MD$/, "");
  if (!(normalized in DOCUMENT_CONTRACTS)) {
    throw new TypeError(`Unknown document contract: ${kind}`);
  }
  return normalized;
}

function stripComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

function normalizeHeading(heading) {
  return heading.trim().replace(/\s+#+$/, "").replace(/\s+/g, " ").toLowerCase();
}

function parseSections(markdown) {
  const sections = new Map();
  const lines = markdown.split(/\r?\n/);
  let current;

  for (const line of lines) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      current = normalizeHeading(match[1]);
      if (!sections.has(current)) {
        sections.set(current, []);
      }
      continue;
    }
    if (current) {
      sections.get(current).push(line);
    }
  }

  return sections;
}

function sectionText(sections, heading) {
  return (sections.get(normalizeHeading(heading)) ?? []).join("\n");
}

function firstContentLine(markdown) {
  return stripComments(markdown)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function splitTableRow(line) {
  const cells = [];
  let cell = "";
  let escaped = false;
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");

  for (const character of trimmed) {
    if (escaped) {
      cell += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
      cell += character;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseMatrix(markdown) {
  const lines = stripComments(markdown)
    .split(/\r?\n/)
    .map((line) => line.trim());
  const headerIndex = lines.findIndex((line) => line.startsWith("|") && splitTableRow(line)[0] === "ID");
  if (headerIndex < 0) {
    return { errors: ["TEST.md: Intent-to-Test Matrix is missing its header row"], rows: [] };
  }

  const headers = splitTableRow(lines[headerIndex]);
  const errors = [];
  if (JSON.stringify(headers) !== JSON.stringify(matrixHeaders)) {
    errors.push(`TEST.md: matrix headers must be: ${matrixHeaders.join(" | ")}`);
  }

  const separator = lines[headerIndex + 1] ?? "";
  if (!/^\|?(?:\s*:?-{3,}:?\s*\|){5}\s*:?-{3,}:?\s*\|?$/.test(separator)) {
    errors.push("TEST.md: matrix header must be followed by a six-column Markdown separator");
  }

  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) {
      if (rows.length > 0 && line) {
        break;
      }
      continue;
    }
    const cells = splitTableRow(line);
    if (cells.length !== matrixHeaders.length) {
      errors.push(`TEST.md: matrix row must have six columns: ${line}`);
      continue;
    }
    rows.push(Object.fromEntries(matrixHeaders.map((header, index) => [header, cells[index]])));
  }

  return { errors, rows };
}

function extractIdentifiers(markdown, pattern) {
  const identifiers = [];
  for (const match of stripComments(markdown).matchAll(pattern)) {
    identifiers.push(match[0].toUpperCase());
  }
  return identifiers;
}

function extractAcceptanceIds(markdown) {
  const identifiers = [];
  for (const line of stripComments(markdown).split(/\r?\n/)) {
    const match = /^\s*(?:[-*]\s+(?:\[[ xX]\]\s+)?)?(AC-\d+)\b/i.exec(line);
    if (match) {
      identifiers.push(match[1].toUpperCase());
    }
  }
  return identifiers;
}

function duplicateValues(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function hasSupportedEvidence(evidence) {
  const normalized = evidence.trim();
  return Boolean(normalized) && !unsupportedEvidence.test(normalized);
}

function checklistItems(markdown) {
  return stripComments(markdown)
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\[[ xX]\]/.test(line));
}

function uncheckedItems(markdown) {
  return checklistItems(markdown).filter((line) => /^\s*-\s+\[\s\]/.test(line));
}

export function getTemplatePath(kind, templateRoot = TEMPLATE_ROOT) {
  return join(templateRoot, DOCUMENT_CONTRACTS[normalizeKind(kind)].relativePath);
}

export async function readCanonicalTemplate(kind, templateRoot = TEMPLATE_ROOT) {
  return readFile(getTemplatePath(kind, templateRoot), "utf8");
}

export function renderTemplate(template, values) {
  const missing = new Set();
  const rendered = template.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (token, name) => {
    if (!Object.hasOwn(values, name)) {
      missing.add(name);
      return token;
    }
    return String(values[name]);
  });
  if (missing.size > 0) {
    throw new Error(`Missing template values: ${[...missing].sort().join(", ")}`);
  }
  return rendered;
}

export function validateDocumentSections(kind, markdown) {
  const normalizedKind = normalizeKind(kind);
  if (typeof markdown !== "string") {
    return [`${normalizedKind}.md: content must be a string`];
  }

  const sections = parseSections(markdown);
  return DOCUMENT_CONTRACTS[normalizedKind].requiredSections
    .filter((heading) => !sections.has(normalizeHeading(heading)))
    .map((heading) => `${normalizedKind}.md: missing required section "${heading}"`);
}

export function validateCanonicalTemplate(kind, markdown) {
  const normalizedKind = normalizeKind(kind);
  const errors = validateDocumentSections(normalizedKind, markdown);
  if (typeof markdown !== "string") {
    return errors;
  }
  for (const token of DOCUMENT_CONTRACTS[normalizedKind].requiredTokens) {
    if (!markdown.includes(`{{${token}}}`)) {
      errors.push(`${normalizedKind}.md: missing required template token {{${token}}}`);
    }
  }
  return errors;
}

export function validateTaskTestContract({ taskMarkdown, testMarkdown }) {
  const errors = [
    ...validateDocumentSections("TASK", taskMarkdown),
    ...validateDocumentSections("TEST", testMarkdown),
  ];
  if (typeof taskMarkdown !== "string" || typeof testMarkdown !== "string") {
    return errors;
  }

  const taskSections = parseSections(taskMarkdown);
  const testSections = parseSections(testMarkdown);
  const taskStatus = firstContentLine(sectionText(taskSections, "Status"));
  const testStatus = firstContentLine(sectionText(testSections, "Status"));

  if (!TASK_STATUSES.includes(taskStatus)) {
    errors.push(`TASK.md: invalid Status "${taskStatus ?? "<missing>"}"; allowed: ${TASK_STATUSES.join(", ")}`);
  }
  if (!TEST_STATUSES.includes(testStatus)) {
    errors.push(`TEST.md: invalid Status "${testStatus ?? "<missing>"}"; allowed: ${TEST_STATUSES.join(", ")}`);
  }

  const taskIdentity = /^# TASK (\d{4}) — (.+)$/m.exec(taskMarkdown);
  const testIdentity = /^# TEST (\d{4}) — (.+)$/m.exec(testMarkdown);
  if (!taskIdentity) {
    errors.push("TASK.md: first-level heading must contain a four-digit ID and title");
  }
  if (!testIdentity) {
    errors.push("TEST.md: first-level heading must contain a four-digit ID and title");
  }
  if (taskIdentity && testIdentity && taskIdentity[1] !== testIdentity[1]) {
    errors.push(`TASK.md/TEST.md: IDs do not match (${taskIdentity[1]} != ${testIdentity[1]})`);
  }
  if (taskIdentity && testIdentity && taskIdentity[2].trim() !== testIdentity[2].trim()) {
    errors.push("TASK.md/TEST.md: titles do not match");
  }

  const acceptanceSection = sectionText(taskSections, "Acceptance Criteria");
  const acceptanceIds = extractAcceptanceIds(acceptanceSection);
  for (const duplicate of duplicateValues(acceptanceIds)) {
    errors.push(`TASK.md: duplicate acceptance criterion ${duplicate}`);
  }

  const matrix = parseMatrix(sectionText(testSections, "Intent-to-Test Matrix"));
  errors.push(...matrix.errors);
  const testIds = [];
  const mappedAcceptance = new Set();
  const acceptanceSet = new Set(acceptanceIds);

  for (const [index, row] of matrix.rows.entries()) {
    const rowLabel = row.ID || `row ${index + 1}`;
    testIds.push(row.ID);
    if (!/^T-\d+$/.test(row.ID)) {
      errors.push(`TEST.md: matrix ${rowLabel} has an invalid test ID`);
    }
    if (!row["Intent / acceptance criterion"].trim()) {
      errors.push(`TEST.md: matrix ${rowLabel} is missing intent`);
    }
    if (!row.Method.trim()) {
      errors.push(`TEST.md: matrix ${rowLabel} is missing Method`);
    }
    if (!row.Level.trim()) {
      errors.push(`TEST.md: matrix ${rowLabel} is missing Level`);
    }
    if (!TEST_ROW_STATUSES.includes(row.Status)) {
      errors.push(
        `TEST.md: matrix ${rowLabel} has invalid Status "${row.Status}"; allowed: ${TEST_ROW_STATUSES.join(", ")}`,
      );
    }
    if (["PASS", "N/A"].includes(row.Status) && !hasSupportedEvidence(row.Evidence)) {
      errors.push(`TEST.md: matrix ${rowLabel} cannot use ${row.Status} without reproducible evidence or a reason`);
    }

    const references = extractIdentifiers(row["Intent / acceptance criterion"], /\bAC-\d+\b/gi);
    for (const reference of references) {
      if (acceptanceSet.has(reference)) {
        mappedAcceptance.add(reference);
      } else {
        errors.push(`TEST.md: matrix ${rowLabel} references unknown acceptance criterion ${reference}`);
      }
    }
  }

  for (const duplicate of duplicateValues(testIds)) {
    errors.push(`TEST.md: duplicate matrix test ID ${duplicate}`);
  }
  for (const acceptanceId of acceptanceSet) {
    if (!mappedAcceptance.has(acceptanceId)) {
      errors.push(`TASK.md/TEST.md: acceptance criterion ${acceptanceId} has no matrix reference`);
    }
  }

  if (testStatus === "PASSED") {
    if (matrix.rows.length === 0) {
      errors.push("TEST.md: PASSED requires at least one matrix row");
    }
    for (const row of matrix.rows) {
      if (!["PASS", "N/A"].includes(row.Status)) {
        errors.push(`TEST.md: PASSED is unsupported while ${row.ID || "a matrix row"} is ${row.Status}`);
      }
    }
    const results = firstContentLine(sectionText(testSections, "Results")) ?? "";
    if (!hasSupportedEvidence(results.replace(/^[-*]\s+/, ""))) {
      errors.push("TEST.md: PASSED requires recorded Results evidence");
    }
    const finalReview = sectionText(testSections, "Final Coverage Review");
    if (checklistItems(finalReview).length === 0) {
      errors.push("TEST.md: PASSED requires a Final Coverage Review checklist");
    } else if (uncheckedItems(finalReview).length > 0) {
      errors.push("TEST.md: PASSED requires every Final Coverage Review item to be checked");
    }
  }

  if (taskStatus === "DONE") {
    if (testStatus !== "PASSED") {
      errors.push(`TASK.md: DONE requires TEST.md Status PASSED, found ${testStatus ?? "<missing>"}`);
    }
    if (uncheckedItems(acceptanceSection).length > 0) {
      errors.push("TASK.md: DONE requires every Acceptance Criteria checklist item to be checked");
    }
    if (acceptanceIds.length === 0) {
      errors.push("TASK.md: DONE requires at least one acceptance criterion");
    }
  }

  return errors;
}
