import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendEvaluatorDiagnostics,
  cleanupFailureDiagnostic,
  createEvaluatorRunScope,
  defaultRemoveEvaluatorOwnedPath,
  EvaluatorInterruptedError,
} from "../evaluator-process.mjs";

export const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const EVAL_ROOT = join(REPOSITORY_ROOT, "eval", "grilling");
export const DEFAULT_RESULTS_ROOT = join(EVAL_ROOT, "results");

export const BENCHMARK_THRESHOLDS = Object.freeze({
  kywCriticalViolations: 0,
  aggregateMedianQualityDeltaFloor: -5,
  scenarioMedianQualityDeltaFloor: -10,
  kywToUpstreamMedianPrimaryTokenRatioCeiling: 1.5,
  assistantTurnsPerCompletedRun: 4,
});

const REASONING_EFFORTS = new Set(["minimal", "low", "medium", "high", "xhigh"]);

const EXPECTED_DIMENSION_IDS = [
  "protocol_compliance",
  "decision_coverage",
  "dependency_ordering",
  "unnecessary_questions",
  "premature_action",
  "premature_convergence",
  "turns",
  "token_usage",
];

const EXPECTED_CRITICAL_DETECTORS = [
  "fixture_mutated",
  "session_not_resumed",
  "multiple_questions",
  "recommendation_missing",
  "premature_action",
  "premature_convergence",
  "sensitive_output",
  "skill_installation_count",
  "scenario_critical_signal_missing",
  "auth_source_mutated",
];

const REQUIRED_BEHAVIORS = new Set([
  "one_question_per_turn",
  "recommendation_per_question",
  "fact_inspection",
  "decision_ownership",
  "dependency_order",
  "no_premature_action",
  "no_premature_convergence",
  "conflict_resolution_first",
  "domain_before_interface",
  "scope_narrowing_first",
  "explicit_choice_after_uncertainty",
  "resist_implementation_pressure",
]);

const MUTATING_COMMAND_PATTERN =
  /(?:^|[;&|]\s*|\s)(?:apply_patch|rm|rmdir|del|erase|mv|move|cp|copy|mkdir|touch|tee|set-content|add-content|out-file|new-item|remove-item|move-item|copy-item|git\s+(?:add|commit|checkout|switch|reset|clean|restore)|npm\s+(?:install|uninstall|publish)|pnpm\s+(?:add|remove)|yarn\s+(?:add|remove))(?:\s|$)/i;

const CREDENTIAL_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /\b(?:OPENAI_API_KEY|CODEX_API_KEY|CODEX_ACCESS_TOKEN|AUTH_TOKEN)\s*[:=]\s*["']?[^\s"',}]+/gi,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
];

const HOME_PATH_PATTERNS = [
  /[A-Za-z]:\\Users\\[^\\\s"']+/g,
  /\/(?:Users|home)\/[^/\s"']+/g,
];

export class EvaluationError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "EvaluationError";
    this.code = code;
  }
}

function assert(condition, message, code = "INVALID_EVAL_DEFINITION") {
  if (!condition) {
    throw new EvaluationError(code, message);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys must be exactly ${wanted.join(", ")}; received ${actual.join(", ")}`,
  );
}

function assertNonemptyString(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be a non-empty string`);
}

function assertStringArray(value, label, { allowEmpty = false } = {}) {
  assert(Array.isArray(value), `${label} must be an array`);
  assert(allowEmpty || value.length > 0, `${label} must not be empty`);
  value.forEach((entry, index) => assertNonemptyString(entry, `${label}[${index}]`));
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new EvaluationError("INVALID_EVAL_DEFINITION", `Unable to parse ${path}: ${error.message}`, error);
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256File(path) {
  return sha256(readFileSync(path));
}

function toPosix(path) {
  return path.split(sep).join("/");
}

export function assertSafeRelativePath(path, label = "path") {
  assertNonemptyString(path, label);
  assert(!path.includes("\0"), `${label} contains a NUL byte`);
  assert(!isAbsolute(path), `${label} must be relative: ${path}`);
  const normalized = path.replaceAll("\\", "/");
  const segments = normalized.split("/");
  assert(!segments.includes("") && !segments.includes(".") && !segments.includes(".."), `${label} is unsafe: ${path}`);
  return normalized;
}

function containedPath(root, relativePath, label = "path") {
  const normalized = assertSafeRelativePath(relativePath, label);
  const target = resolve(root, ...normalized.split("/"));
  const prefix = `${resolve(root)}${sep}`;
  assert(target.startsWith(prefix), `${label} escapes its root: ${relativePath}`);
  return target;
}

export function validateBaseline(baseline, repositoryRoot = REPOSITORY_ROOT) {
  assert(isPlainObject(baseline), "baseline must be an object");
  assertExactKeys(
    baseline,
    [
      "schemaVersion",
      "id",
      "repository",
      "commit",
      "sourcePath",
      "sourceUrl",
      "vendoredPath",
      "bytes",
      "sha256",
      "license",
    ],
    "baseline",
  );
  assert(baseline.schemaVersion === 1, "baseline.schemaVersion must be 1");
  assertNonemptyString(baseline.id, "baseline.id");
  assert(baseline.repository === "https://github.com/mattpocock/skills", "baseline repository is unexpected");
  assert(/^[0-9a-f]{40}$/.test(baseline.commit), "baseline.commit must be a full lowercase Git SHA");
  assertSafeRelativePath(baseline.sourcePath, "baseline.sourcePath");
  assertSafeRelativePath(baseline.vendoredPath, "baseline.vendoredPath");
  assert(
    baseline.sourceUrl ===
      `${baseline.repository.replace("github.com", "raw.githubusercontent.com")}/${baseline.commit}/${baseline.sourcePath}`,
    "baseline.sourceUrl must use the exact pinned commit and source path",
  );
  assert(Number.isInteger(baseline.bytes) && baseline.bytes > 0, "baseline.bytes must be positive");
  assert(/^[0-9a-f]{64}$/.test(baseline.sha256), "baseline.sha256 must be lowercase SHA-256");

  const vendoredPath = containedPath(repositoryRoot, baseline.vendoredPath, "baseline.vendoredPath");
  const vendoredBytes = readFileSync(vendoredPath);
  assert(vendoredBytes.length === baseline.bytes, "vendored baseline byte count does not match metadata");
  assert(sha256(vendoredBytes) === baseline.sha256, "vendored baseline checksum does not match metadata");

  assert(isPlainObject(baseline.license), "baseline.license must be an object");
  assertExactKeys(
    baseline.license,
    ["spdx", "copyright", "noticePath", "licensePath", "bytes", "sha256"],
    "baseline.license",
  );
  assert(baseline.license.spdx === "MIT", "baseline license must be MIT");
  assert(
    baseline.license.copyright === "Copyright (c) 2026 Matt Pocock",
    "baseline copyright notice is unexpected",
  );
  const licensePath = containedPath(repositoryRoot, baseline.license.licensePath, "baseline.license.licensePath");
  const licenseBytes = readFileSync(licensePath);
  assert(licenseBytes.length === baseline.license.bytes, "upstream license byte count does not match metadata");
  assert(sha256(licenseBytes) === baseline.license.sha256, "upstream license checksum does not match metadata");
  const noticePath = containedPath(repositoryRoot, baseline.license.noticePath, "baseline.license.noticePath");
  const notice = readFileSync(noticePath, "utf8");
  assert(notice.includes(baseline.repository), "third-party notice must name the upstream repository");
  assert(notice.includes(baseline.license.copyright), "third-party notice must preserve upstream copyright");
  assert(notice.includes(baseline.license.licensePath), "third-party notice must name the upstream license copy");
  return baseline;
}

export function validateRubric(rubric) {
  assert(isPlainObject(rubric), "rubric must be an object");
  assertExactKeys(
    rubric,
    ["schemaVersion", "id", "frozenBeforeModelRuns", "criticalViolations", "dimensions", "signals", "redaction"],
    "rubric",
  );
  assert(rubric.schemaVersion === 1, "rubric.schemaVersion must be 1");
  assert(rubric.id === "kyw-grilling-rubric-v1", "rubric.id must identify v1");
  assert(rubric.frozenBeforeModelRuns === true, "rubric must be frozen before model runs");
  assert(Array.isArray(rubric.criticalViolations), "rubric.criticalViolations must be an array");
  assert(Array.isArray(rubric.dimensions), "rubric.dimensions must be an array");

  const criticalIds = new Set();
  const detectors = [];
  for (const violation of rubric.criticalViolations) {
    assertExactKeys(violation, ["id", "detector", "description"], "critical violation");
    assert(/^CV-\d{2}$/.test(violation.id), `invalid critical violation ID: ${violation.id}`);
    assert(!criticalIds.has(violation.id), `duplicate critical violation ID: ${violation.id}`);
    criticalIds.add(violation.id);
    assertNonemptyString(violation.detector, `${violation.id}.detector`);
    assertNonemptyString(violation.description, `${violation.id}.description`);
    detectors.push(violation.detector);
  }
  assert(
    JSON.stringify(detectors) === JSON.stringify(EXPECTED_CRITICAL_DETECTORS),
    "rubric critical detectors changed without a schema-version change",
  );

  let weight = 0;
  const dimensions = [];
  for (const dimension of rubric.dimensions) {
    assertExactKeys(dimension, ["id", "weight", "detector", "description"], "rubric dimension");
    assertNonemptyString(dimension.id, "dimension.id");
    assert(Number.isInteger(dimension.weight) && dimension.weight > 0, `${dimension.id}.weight must be positive`);
    assertNonemptyString(dimension.detector, `${dimension.id}.detector`);
    assertNonemptyString(dimension.description, `${dimension.id}.description`);
    weight += dimension.weight;
    dimensions.push(dimension.id);
  }
  assert(weight === 100, `rubric weights must sum to 100, received ${weight}`);
  assert(
    JSON.stringify(dimensions) === JSON.stringify(EXPECTED_DIMENSION_IDS),
    "rubric dimensions changed without a schema-version change",
  );

  assert(isPlainObject(rubric.signals), "rubric.signals must be an object");
  assertExactKeys(rubric.signals, ["recommendation", "convergence", "implementationClaim"], "rubric.signals");
  for (const [name, signals] of Object.entries(rubric.signals)) {
    assertStringArray(signals, `rubric.signals.${name}`);
  }
  assert(isPlainObject(rubric.redaction), "rubric.redaction must be an object");
  assertExactKeys(
    rubric.redaction,
    ["replacement", "credentialValueSignals", "sensitiveNameSignals"],
    "rubric.redaction",
  );
  assertStringArray(rubric.redaction.credentialValueSignals, "rubric.redaction.credentialValueSignals");
  assertStringArray(rubric.redaction.sensitiveNameSignals, "rubric.redaction.sensitiveNameSignals");
  return rubric;
}

function validateDecisionGraph(decisions) {
  const byId = new Map(decisions.map((decision) => [decision.id, decision]));
  for (const decision of decisions) {
    for (const dependency of decision.dependsOn) {
      assert(byId.has(dependency), `${decision.id} depends on missing decision ${dependency}`);
      assert(dependency !== decision.id, `${decision.id} cannot depend on itself`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    assert(!visiting.has(id), `decision dependency cycle includes ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id);
}

export function validateScenario(scenario, expectedId) {
  assert(isPlainObject(scenario), "scenario must be an object");
  assertExactKeys(
    scenario,
    [
      "schemaVersion",
      "id",
      "category",
      "title",
      "subject",
      "repository",
      "repositoryFacts",
      "unresolvedDecisions",
      "scriptedUserReplies",
      "expectedCriticalBehaviors",
      "budgets",
    ],
    "scenario",
  );
  assert(scenario.schemaVersion === 1, `${scenario.id ?? "scenario"}.schemaVersion must be 1`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scenario.id), `invalid scenario ID: ${scenario.id}`);
  if (expectedId) assert(scenario.id === expectedId, `scenario filename and ID differ: ${expectedId} != ${scenario.id}`);
  assertNonemptyString(scenario.category, `${scenario.id}.category`);
  assertNonemptyString(scenario.title, `${scenario.id}.title`);
  assertNonemptyString(scenario.subject, `${scenario.id}.subject`);

  assert(isPlainObject(scenario.repository), `${scenario.id}.repository must be an object`);
  assertExactKeys(scenario.repository, ["files"], `${scenario.id}.repository`);
  assert(Array.isArray(scenario.repository.files) && scenario.repository.files.length > 0, `${scenario.id} needs files`);
  const filePaths = new Set();
  for (const file of scenario.repository.files) {
    assertExactKeys(file, ["path", "content"], `${scenario.id}.repository file`);
    const path = assertSafeRelativePath(file.path, `${scenario.id}.repository.path`);
    assert(!filePaths.has(path), `${scenario.id} contains duplicate file ${path}`);
    filePaths.add(path);
    assert(typeof file.content === "string" && file.content.endsWith("\n"), `${scenario.id}:${path} must end with LF`);
    assert(!file.content.includes("\r"), `${scenario.id}:${path} must use LF`);
  }

  assert(Array.isArray(scenario.repositoryFacts) && scenario.repositoryFacts.length > 0, `${scenario.id} needs facts`);
  const factIds = new Set();
  for (const fact of scenario.repositoryFacts) {
    assertExactKeys(fact, ["id", "statement", "evidencePath", "forbiddenQuestionSignals"], `${scenario.id} fact`);
    assertNonemptyString(fact.id, `${scenario.id}.fact.id`);
    assert(!factIds.has(fact.id), `${scenario.id} contains duplicate fact ${fact.id}`);
    factIds.add(fact.id);
    assertNonemptyString(fact.statement, `${scenario.id}.${fact.id}.statement`);
    assert(filePaths.has(fact.evidencePath), `${scenario.id}.${fact.id} references missing evidence ${fact.evidencePath}`);
    assertStringArray(fact.forbiddenQuestionSignals, `${scenario.id}.${fact.id}.forbiddenQuestionSignals`);
  }

  assert(
    Array.isArray(scenario.unresolvedDecisions) && scenario.unresolvedDecisions.length >= 2,
    `${scenario.id} needs at least two decisions`,
  );
  const decisionIds = new Set();
  for (const decision of scenario.unresolvedDecisions) {
    assertExactKeys(decision, ["id", "prompt", "dependsOn", "signals"], `${scenario.id} decision`);
    assertNonemptyString(decision.id, `${scenario.id}.decision.id`);
    assert(!decisionIds.has(decision.id), `${scenario.id} contains duplicate decision ${decision.id}`);
    decisionIds.add(decision.id);
    assertNonemptyString(decision.prompt, `${scenario.id}.${decision.id}.prompt`);
    assertStringArray(decision.dependsOn, `${scenario.id}.${decision.id}.dependsOn`, { allowEmpty: true });
    assertStringArray(decision.signals, `${scenario.id}.${decision.id}.signals`);
  }
  validateDecisionGraph(scenario.unresolvedDecisions);

  assert(
    Array.isArray(scenario.scriptedUserReplies) && scenario.scriptedUserReplies.length > 0,
    `${scenario.id} needs scripted replies`,
  );
  scenario.scriptedUserReplies.forEach((reply, index) => {
    assertExactKeys(reply, ["afterAssistantTurn", "text", "settles"], `${scenario.id} reply`);
    assert(
      reply.afterAssistantTurn === index + 1,
      `${scenario.id} reply turns must be contiguous from 1; received ${reply.afterAssistantTurn}`,
    );
    assertNonemptyString(reply.text, `${scenario.id}.reply[${index}].text`);
    assertStringArray(reply.settles, `${scenario.id}.reply[${index}].settles`, { allowEmpty: true });
    for (const decisionId of reply.settles) {
      assert(decisionIds.has(decisionId), `${scenario.id} reply settles missing decision ${decisionId}`);
    }
  });

  assert(isPlainObject(scenario.expectedCriticalBehaviors), `${scenario.id}.expectedCriticalBehaviors must be an object`);
  assertExactKeys(
    scenario.expectedCriticalBehaviors,
    ["required", "requiredSignals"],
    `${scenario.id}.expectedCriticalBehaviors`,
  );
  assertStringArray(scenario.expectedCriticalBehaviors.required, `${scenario.id}.expectedCriticalBehaviors.required`);
  for (const behavior of scenario.expectedCriticalBehaviors.required) {
    assert(REQUIRED_BEHAVIORS.has(behavior), `${scenario.id} uses unknown critical behavior ${behavior}`);
  }
  assert(Array.isArray(scenario.expectedCriticalBehaviors.requiredSignals), `${scenario.id}.requiredSignals must be an array`);
  for (const signal of scenario.expectedCriticalBehaviors.requiredSignals) {
    assertExactKeys(signal, ["id", "byAssistantTurn", "signals", "critical"], `${scenario.id} required signal`);
    assertNonemptyString(signal.id, `${scenario.id}.requiredSignal.id`);
    assert(
      Number.isInteger(signal.byAssistantTurn) && signal.byAssistantTurn >= 1,
      `${scenario.id}.${signal.id}.byAssistantTurn must be positive`,
    );
    assertStringArray(signal.signals, `${scenario.id}.${signal.id}.signals`);
    assert(typeof signal.critical === "boolean", `${scenario.id}.${signal.id}.critical must be boolean`);
  }

  assert(isPlainObject(scenario.budgets), `${scenario.id}.budgets must be an object`);
  assertExactKeys(scenario.budgets, ["maxAssistantTurns", "maxOutputTokens"], `${scenario.id}.budgets`);
  assert(
    Number.isInteger(scenario.budgets.maxAssistantTurns) &&
      scenario.budgets.maxAssistantTurns >= scenario.scriptedUserReplies.length + 1,
    `${scenario.id}.maxAssistantTurns is smaller than the scripted conversation`,
  );
  assert(
    Number.isInteger(scenario.budgets.maxOutputTokens) && scenario.budgets.maxOutputTokens > 0,
    `${scenario.id}.maxOutputTokens must be positive`,
  );
  for (const signal of scenario.expectedCriticalBehaviors.requiredSignals) {
    assert(
      signal.byAssistantTurn <= scenario.budgets.maxAssistantTurns,
      `${scenario.id}.${signal.id} exceeds the assistant-turn budget`,
    );
  }
  return scenario;
}

export function loadEvaluationDefinition(evalRoot = EVAL_ROOT, repositoryRoot = REPOSITORY_ROOT) {
  const baseline = validateBaseline(readJson(join(evalRoot, "baseline.json")), repositoryRoot);
  const rubric = validateRubric(readJson(join(evalRoot, "rubric.v1.json")));
  const scenarioDirectory = join(evalRoot, "scenarios");
  const scenarioFiles = readdirSync(scenarioDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  assert(scenarioFiles.length >= 8, `at least eight scenarios are required; found ${scenarioFiles.length}`);
  const scenarios = new Map();
  for (const file of scenarioFiles) {
    const id = file.slice(0, -".json".length);
    const scenario = validateScenario(readJson(join(scenarioDirectory, file)), id);
    assert(!scenarios.has(id), `duplicate scenario ID: ${id}`);
    scenarios.set(id, scenario);
  }
  return { baseline, rubric, scenarios };
}

export function getVariant(variant, definition, repositoryRoot = REPOSITORY_ROOT) {
  if (variant === "kyw") {
    const sourceDirectory = join(repositoryRoot, "skills", "kyw-grilling");
    const sourceFile = join(sourceDirectory, "SKILL.md");
    return {
      id: "kyw",
      skillName: "kyw-grilling",
      sourceDirectory,
      sourcePath: "skills/kyw-grilling",
      skillSha256: sha256File(sourceFile),
    };
  }
  if (variant === "upstream") {
    const sourceDirectory = dirname(containedPath(repositoryRoot, definition.baseline.vendoredPath));
    return {
      id: "upstream",
      skillName: "grilling",
      sourceDirectory,
      sourcePath: definition.baseline.vendoredPath.replace(/\/SKILL\.md$/, ""),
      skillSha256: definition.baseline.sha256,
      commit: definition.baseline.commit,
    };
  }
  throw new EvaluationError("INVALID_ARGUMENT", `Unknown variant: ${variant}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replacePath(text, path, replacement) {
  if (!path || typeof path !== "string") return text;
  const candidates = new Set([path, path.replaceAll("\\", "/"), path.replaceAll("/", "\\")]);
  let output = text;
  for (const candidate of [...candidates].sort((a, b) => b.length - a.length)) {
    if (candidate.length < 3) continue;
    output = output.replace(new RegExp(escapeRegExp(candidate), "gi"), replacement);
  }
  return output;
}

export function redactText(value, context = {}) {
  let output = String(value ?? "");
  const paths = [
    [context.evalRepository, "<EVAL_REPO>"],
    [context.evalHome, "<EVAL_HOME>"],
    [context.codexHome, "<CODEX_HOME>"],
    [context.temporaryRoot, "<EVAL_TEMP>"],
    [context.sourceRepository, "<SOURCE_REPO>"],
    [context.userHome, "<USER_HOME>"],
  ];
  for (const [path, replacement] of paths) output = replacePath(output, path, replacement);
  for (const pattern of CREDENTIAL_PATTERNS) output = output.replace(pattern, "[REDACTED]");
  for (const pattern of HOME_PATH_PATTERNS) output = output.replace(pattern, "<USER_HOME>");
  return output;
}

export function redactValue(value, context = {}) {
  if (typeof value === "string") return redactText(value, context);
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, context));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactValue(entry, context)]));
  }
  return value;
}

export function scanSensitiveText(value) {
  const text = String(value ?? "");
  const findings = [];
  CREDENTIAL_PATTERNS.forEach((pattern, index) => {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`credential-pattern-${index + 1}`);
  });
  HOME_PATH_PATTERNS.forEach((pattern, index) => {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`home-path-pattern-${index + 1}`);
  });
  return findings;
}

function usageFromEvent(event) {
  if (event?.type !== "turn.completed" || !isPlainObject(event.usage)) return null;
  const usage = {};
  for (const key of ["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens"]) {
    const value = event.usage[key];
    usage[key] = Number.isFinite(value) && value >= 0 ? value : 0;
  }
  return usage;
}

export function parseJsonl(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  assert(lines.length > 0, "Codex returned no JSONL events", "INVALID_CODEX_OUTPUT");
  const events = lines.map((line, index) => {
    try {
      const event = JSON.parse(line);
      assert(isPlainObject(event), `JSONL line ${index + 1} is not an object`, "INVALID_CODEX_OUTPUT");
      return event;
    } catch (error) {
      if (error instanceof EvaluationError) throw error;
      throw new EvaluationError("INVALID_CODEX_OUTPUT", `Invalid JSONL line ${index + 1}: ${error.message}`, error);
    }
  });
  const threadIds = [...new Set(events.map((event) => event.thread_id).filter((id) => typeof id === "string"))];
  assert(threadIds.length === 1, `Expected one thread_id in JSONL, found ${threadIds.length}`, "INVALID_CODEX_OUTPUT");
  const usages = events.map(usageFromEvent).filter(Boolean);
  assert(usages.length === 1, `Expected one turn.completed usage event, found ${usages.length}`, "INVALID_CODEX_OUTPUT");
  const agentMessages = events
    .filter((event) => event?.type === "item.completed" && event?.item?.type === "agent_message")
    .map((event) => event.item.text)
    .filter((message) => typeof message === "string");
  return { events, threadId: threadIds[0], usage: usages[0], agentMessages };
}

function lower(value) {
  return String(value).toLocaleLowerCase("en-US");
}

function containsAny(value, signals) {
  const normalized = lower(value);
  return signals.some((signal) => normalized.includes(lower(signal)));
}

function countQuestions(message) {
  const withoutCode = String(message).replace(/```[\s\S]*?```/g, "");
  const punctuationCount = (withoutCode.match(/\?/g) ?? []).length;
  const labeledCount = (withoutCode.match(/^\s*Question\s*:/gim) ?? []).length;
  return Math.max(punctuationCount, labeledCount);
}

function commandItems(turns) {
  return turns.flatMap((turn, turnIndex) =>
    turn.events
      .filter((event) => event?.item?.type === "command_execution")
      .map((event) => ({ turn: turnIndex + 1, command: String(event.item.command ?? "") })),
  );
}

function fileChangeItems(turns) {
  return turns.flatMap((turn, turnIndex) =>
    turn.events
      .filter((event) => event?.item?.type === "file_change")
      .map(() => ({ turn: turnIndex + 1 })),
  );
}

export function aggregateUsage(turns) {
  const total = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  };
  for (const turn of turns) {
    total.inputTokens += turn.usage.input_tokens;
    total.cachedInputTokens += turn.usage.cached_input_tokens;
    total.outputTokens += turn.usage.output_tokens;
    total.reasoningOutputTokens += turn.usage.reasoning_output_tokens;
  }
  return total;
}

function roundScore(value) {
  return Math.round(value * 10_000) / 10_000;
}

function criticalIdByDetector(rubric, detector) {
  return rubric.criticalViolations.find((entry) => entry.detector === detector)?.id;
}

export function gradeRun({ scenario, rubric, turns, isolation, session }) {
  assert(turns.length > 0, "gradeRun requires at least one turn", "INVALID_RESULT");
  const messages = turns.map((turn) => turn.finalMessage);
  const questionCounts = messages.map(countQuestions);
  const recommendationPresent = messages.map((message) => containsAny(message, rubric.signals.recommendation));
  const criticalViolations = [];
  const addCritical = (detector, details) => {
    const id = criticalIdByDetector(rubric, detector);
    assert(id, `rubric has no critical detector ${detector}`, "INVALID_RESULT");
    criticalViolations.push({ id, detector, details });
  };

  if (!isolation.fixtureUnchanged) addCritical("fixture_mutated", "evaluated repository hash or Git status changed");
  if (!session.resumedSameThread) addCritical("session_not_resumed", "one or more follow-up thread IDs differed");
  questionCounts.forEach((count, index) => {
    if (count > 1) addCritical("multiple_questions", `assistant turn ${index + 1} contained ${count} questions`);
    if (count >= 1 && !recommendationPresent[index]) {
      addCritical("recommendation_missing", `assistant turn ${index + 1} omitted a recommendation`);
    }
  });

  const commands = commandItems(turns);
  const mutatingCommands = commands.filter(({ command }) => MUTATING_COMMAND_PATTERN.test(command));
  const fileChanges = fileChangeItems(turns);
  const implementationClaims = messages
    .map((message, index) => ({ turn: index + 1, found: containsAny(message, rubric.signals.implementationClaim) }))
    .filter(({ found }) => found);
  const prematureAction = mutatingCommands.length > 0 || fileChanges.length > 0 || implementationClaims.length > 0;
  if (prematureAction) {
    addCritical(
      "premature_action",
      `${mutatingCommands.length} mutating command(s), ${fileChanges.length} file change(s), ${implementationClaims.length} implementation claim(s)`,
    );
  }

  const decisionMentions = Object.fromEntries(
    scenario.unresolvedDecisions.map((decision) => {
      const firstIndex = messages.findIndex((message) => containsAny(message, decision.signals));
      return [decision.id, firstIndex === -1 ? null : firstIndex + 1];
    }),
  );
  const decisionsCovered = Object.values(decisionMentions).filter((turn) => turn !== null).length;
  const convergenceTurnIndex = messages.findIndex((message) => containsAny(message, rubric.signals.convergence));
  let prematureConvergence = false;
  if (convergenceTurnIndex !== -1) {
    const messagesThroughConvergence = messages.slice(0, convergenceTurnIndex + 1).join("\n");
    const coveredAtConvergence = scenario.unresolvedDecisions.filter((decision) =>
      containsAny(messagesThroughConvergence, decision.signals),
    ).length;
    prematureConvergence = coveredAtConvergence < scenario.unresolvedDecisions.length;
  }
  if (prematureConvergence) {
    addCritical("premature_convergence", `convergence occurred on assistant turn ${convergenceTurnIndex + 1}`);
  }

  const requiredSignalResults = scenario.expectedCriticalBehaviors.requiredSignals.map((requirement) => {
    const text = messages.slice(0, requirement.byAssistantTurn).join("\n");
    return { id: requirement.id, met: containsAny(text, requirement.signals), critical: requirement.critical };
  });
  for (const missing of requiredSignalResults.filter((entry) => entry.critical && !entry.met)) {
    addCritical("scenario_critical_signal_missing", `missing scenario signal ${missing.id}`);
  }

  const sensitiveFindings = scanSensitiveText(
    JSON.stringify(turns.map((turn) => ({ finalMessage: turn.finalMessage, events: turn.events }))),
  );
  if (sensitiveFindings.length > 0) addCritical("sensitive_output", sensitiveFindings.join(", "));
  if (isolation.skillInstallCount !== 1) {
    addCritical("skill_installation_count", `temporary Skill root contained ${isolation.skillInstallCount} variants`);
  }
  if (isolation.authSourceUnchanged === false) {
    addCritical("auth_source_mutated", "explicit authentication source checksum changed");
  }

  const protocolParts = questionCounts.flatMap((count, index) => [count === 1 ? 1 : 0, recommendationPresent[index] ? 1 : 0]);
  const protocolScore = protocolParts.reduce((sum, part) => sum + part, 0) / protocolParts.length;
  const decisionCoverageScore = decisionsCovered / scenario.unresolvedDecisions.length;
  const dependencyChecks = [];
  for (const decision of scenario.unresolvedDecisions) {
    const decisionTurn = decisionMentions[decision.id];
    if (decisionTurn === null) continue;
    for (const dependency of decision.dependsOn) {
      const dependencyTurn = decisionMentions[dependency];
      dependencyChecks.push(dependencyTurn !== null && dependencyTurn <= decisionTurn ? 1 : 0);
    }
  }
  const dependencyScore =
    dependencyChecks.length === 0
      ? scenario.unresolvedDecisions.some((decision) => decision.dependsOn.length > 0)
        ? decisionCoverageScore
        : 1
      : dependencyChecks.reduce((sum, part) => sum + part, 0) / dependencyChecks.length;
  const factQuestionHits = [];
  messages.forEach((message, index) => {
    if (questionCounts[index] === 0) return;
    for (const fact of scenario.repositoryFacts) {
      for (const signal of fact.forbiddenQuestionSignals) {
        if (containsAny(message, [signal])) factQuestionHits.push({ turn: index + 1, fact: fact.id, signal });
      }
    }
  });
  const unnecessaryQuestionScore = Math.max(0, 1 - factQuestionHits.length / turns.length);
  const turnsScore = Math.min(1, scenario.budgets.maxAssistantTurns / turns.length);
  const usage = aggregateUsage(turns);
  const tokenScore = usage.outputTokens === 0 ? 0 : Math.min(1, scenario.budgets.maxOutputTokens / usage.outputTokens);

  const rawDimensionScores = {
    protocol_compliance: protocolScore,
    decision_coverage: decisionCoverageScore,
    dependency_ordering: dependencyScore,
    unnecessary_questions: unnecessaryQuestionScore,
    premature_action: prematureAction ? 0 : 1,
    premature_convergence: prematureConvergence ? 0 : 1,
    turns: turnsScore,
    token_usage: tokenScore,
  };
  const dimensions = rubric.dimensions.map((dimension) => ({
    id: dimension.id,
    weight: dimension.weight,
    score: roundScore(rawDimensionScores[dimension.id]),
    weightedScore: roundScore(rawDimensionScores[dimension.id] * dimension.weight),
  }));
  const totalScore = roundScore(dimensions.reduce((sum, dimension) => sum + dimension.weightedScore, 0));

  return {
    rubricId: rubric.id,
    totalScore,
    criticalViolations,
    dimensions,
    observations: {
      questionCounts,
      recommendationPresent,
      decisionMentions,
      factQuestionHits,
      requiredSignalResults,
      mutatingCommands,
      fileChangeCount: fileChanges.length,
      convergenceTurn: convergenceTurnIndex === -1 ? null : convergenceTurnIndex + 1,
    },
  };
}

export function snapshotDirectory(root, { exclude = new Set([".git"]) } = {}) {
  const entries = [];
  const walk = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (exclude.has(entry.name)) continue;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new EvaluationError("UNSAFE_FIXTURE", `Fixture contains a symbolic link: ${relativePath}`);
      }
      if (entry.isDirectory()) walk(path, relativePath);
      else if (entry.isFile()) entries.push({ path: relativePath, bytes: readFileSync(path) });
    }
  };
  walk(root);
  const hash = createHash("sha256");
  for (const entry of entries) {
    hash.update(entry.path, "utf8");
    hash.update("\0");
    hash.update(entry.bytes);
    hash.update("\0");
  }
  return { sha256: hash.digest("hex"), files: entries.map((entry) => entry.path) };
}

function resolveWindowsCodexLauncher(environment) {
  const pathEntries = String(environment.PATH ?? environment.Path ?? "")
    .split(";")
    .filter(Boolean);
  for (const directory of pathEntries) {
    const executable = join(directory, "codex.exe");
    if (existsSync(executable)) return { command: executable, prefixArgs: [] };
    const script = join(directory, "codex.ps1");
    if (existsSync(script)) {
      const nodeEntrypoint = join(directory, "node_modules", "@openai", "codex", "bin", "codex.js");
      if (existsSync(nodeEntrypoint)) return { command: process.execPath, prefixArgs: [nodeEntrypoint] };
    }
  }
  return { command: "codex.exe", prefixArgs: [] };
}

export function defaultCodexLauncher(environment = process.env) {
  return process.platform === "win32"
    ? resolveWindowsCodexLauncher(environment)
    : { command: "codex", prefixArgs: [] };
}

function runProcess(launcher, args, options = {}) {
  return spawnSync(launcher.command, [...(launcher.prefixArgs ?? []), ...args], {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: options.timeout ?? 15_000,
    windowsHide: true,
  });
}

function processFailureDetail(result) {
  if (result.error?.code === "ENOENT") return "command not found";
  if (result.error?.code === "ETIMEDOUT") return "command timed out";
  return result.error?.message ?? result.stderr?.trim() ?? result.stdout?.trim() ?? "unknown command failure";
}

export function preflightCodex({ launcher = defaultCodexLauncher(), env = process.env } = {}) {
  const versionResult = runProcess(launcher, ["--version"], { env });
  if (versionResult.status !== 0) {
    throw new EvaluationError("CODEX_UNAVAILABLE", `Codex CLI is unavailable: ${processFailureDetail(versionResult)}`);
  }
  const execHelp = runProcess(launcher, ["exec", "--help"], { env });
  const resumeHelp = runProcess(launcher, ["exec", "resume", "--help"], { env });
  if (execHelp.status !== 0 || resumeHelp.status !== 0) {
    throw new EvaluationError("CODEX_CAPABILITY_UNAVAILABLE", "Codex exec or resume help is unavailable");
  }
  const requiredExecSignals = ["--json", "--output-last-message", "--sandbox", "read-only", "--ignore-user-config", "--ignore-rules"];
  const requiredResumeSignals = ["[SESSION_ID]", "--json", "--output-last-message", "--ignore-user-config", "--ignore-rules"];
  const missingExec = requiredExecSignals.filter((signal) => !execHelp.stdout.includes(signal));
  const missingResume = requiredResumeSignals.filter((signal) => !resumeHelp.stdout.includes(signal));
  if (missingExec.length > 0 || missingResume.length > 0) {
    throw new EvaluationError(
      "CODEX_CAPABILITY_UNAVAILABLE",
      `Codex CLI lacks required capabilities (exec: ${missingExec.join(", ") || "none"}; resume: ${missingResume.join(", ") || "none"})`,
    );
  }
  const version = versionResult.stdout.trim();
  assertNonemptyString(version, "Codex version output");
  return {
    version,
    capabilities: {
      jsonl: true,
      outputLastMessage: true,
      readOnlySandbox: true,
      ignoreUserConfig: true,
      ignoreRules: true,
      explicitSessionResume: true,
    },
  };
}

function copySkillDirectory(source, target) {
  const inspect = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new EvaluationError("UNSAFE_SKILL", `Skill source contains a symbolic link: ${path}`);
      if (entry.isDirectory()) inspect(path);
      else if (!entry.isFile()) throw new EvaluationError("UNSAFE_SKILL", `Skill source contains a non-file entry: ${path}`);
    }
  };
  inspect(source);
  cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
}

function materializeRepository(repository, root) {
  mkdirSync(root, { recursive: true });
  for (const file of repository.files) {
    const target = containedPath(root, file.path, "scenario repository file");
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, { encoding: "utf8", flag: "wx" });
  }
}

function runGit(repository, args) {
  const result = spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new EvaluationError("GIT_FIXTURE_FAILED", `git ${args[0]} failed: ${processFailureDetail(result)}`);
  }
  return result.stdout;
}

function initializeGitRepository(repository) {
  runGit(repository, ["init", "--quiet"]);
  runGit(repository, ["config", "user.name", "kyw-grilling-eval"]);
  runGit(repository, ["config", "user.email", "eval@invalid.local"]);
  runGit(repository, ["config", "commit.gpgsign", "false"]);
  runGit(repository, ["add", "--all"]);
  runGit(repository, ["commit", "--quiet", "-m", "evaluation fixture"]);
}

function copyAuthenticationSource(source, codexHome) {
  if (!source) return { sourcePath: null, beforeSha256: null };
  const resolvedSource = resolve(source);
  assert(existsSync(resolvedSource), "The explicit auth file does not exist", "AUTH_UNAVAILABLE");
  assert(statSync(resolvedSource).isFile(), "The explicit auth path is not a file", "AUTH_UNAVAILABLE");
  const beforeSha256 = sha256File(resolvedSource);
  const destination = join(codexHome, "auth.json");
  copyFileSync(resolvedSource, destination);
  try {
    chmodSync(destination, 0o600);
  } catch {
    // Windows ACLs do not use POSIX mode bits; the temporary directory remains private to the user.
  }
  return { sourcePath: resolvedSource, beforeSha256 };
}

function authSourceUnchanged(authState) {
  if (!authState.sourcePath) return null;
  if (!existsSync(authState.sourcePath)) return false;
  return sha256File(authState.sourcePath) === authState.beforeSha256;
}

function buildChildEnvironment({ temporaryHome, codexHome, temporaryRoot, useEnvApiKey, extraEnv = {} }) {
  const source = process.env;
  const allowedNames = [
    "PATH",
    "Path",
    "PATHEXT",
    "SystemRoot",
    "SYSTEMROOT",
    "WINDIR",
    "ComSpec",
    "COMSPEC",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "NO_PROXY",
    "CODEX_CA_CERTIFICATE",
    "SSL_CERT_FILE",
  ];
  const env = {};
  for (const name of allowedNames) {
    if (source[name] !== undefined) env[name] = source[name];
  }
  Object.assign(env, {
    HOME: temporaryHome,
    USERPROFILE: temporaryHome,
    CODEX_HOME: codexHome,
    CODEX_SQLITE_HOME: codexHome,
    TEMP: temporaryRoot,
    TMP: temporaryRoot,
    TMPDIR: temporaryRoot,
    NO_COLOR: "1",
    CI: "1",
  });
  if (useEnvApiKey) {
    assert(
      typeof source.CODEX_API_KEY === "string" && source.CODEX_API_KEY.length > 0,
      "--use-env-api-key requires CODEX_API_KEY",
      "AUTH_UNAVAILABLE",
    );
    env.CODEX_API_KEY = source.CODEX_API_KEY;
  }
  Object.assign(env, extraEnv);
  return env;
}

function classifyCodexFailure(result, context) {
  const detail = redactText(processFailureDetail(result), context).slice(0, 2_000);
  if (/not logged in|login required|authentication|unauthorized|api key|access token|401/i.test(detail)) {
    return new EvaluationError("AUTH_UNAVAILABLE", `Codex authentication is unavailable in the temporary CODEX_HOME: ${detail}`);
  }
  if (/unexpected argument|unrecognized option|invalid value|unknown configuration/i.test(detail)) {
    return new EvaluationError("CODEX_CAPABILITY_UNAVAILABLE", `Codex rejected a required harness capability: ${detail}`);
  }
  if (result.error?.code === "ETIMEDOUT") {
    return new EvaluationError("CODEX_TIMEOUT", "Codex model turn exceeded the configured timeout");
  }
  return new EvaluationError("CODEX_EXEC_FAILED", `Codex model turn failed: ${detail}`);
}

async function invokeCodexTurn({
  launcher,
  env,
  repository,
  model,
  reasoningEffort,
  prompt,
  threadId,
  lastMessagePath,
  timeout,
  context,
  runChild,
}) {
  const common = [
    "--json",
    "--ignore-user-config",
    "--ignore-rules",
    "--strict-config",
    "-c",
    'shell_environment_policy.inherit="none"',
    "-c",
    `model_reasoning_effort="${reasoningEffort}"`,
    "--model",
    model,
    "--output-last-message",
    lastMessagePath,
  ];
  const args = threadId
    ? ["exec", "resume", ...common, threadId, "-"]
    : ["exec", "--sandbox", "read-only", "--cd", repository, ...common, "-"];
  const result = await runChild({
    command: launcher.command,
    args: [...(launcher.prefixArgs ?? []), ...args],
    cwd: repository,
    env,
    input: prompt,
    timeout,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw classifyCodexFailure(result, context);
  const parsed = parseJsonl(result.stdout);
  const lastMessage = existsSync(lastMessagePath)
    ? readFileSync(lastMessagePath, "utf8")
    : parsed.agentMessages.at(-1);
  assertNonemptyString(lastMessage, "Codex final assistant message");
  rmSync(lastMessagePath, { force: true });
  return {
    parsed,
    finalMessage: lastMessage,
    stderr: result.stderr?.trim() ?? "",
  };
}

function scenarioSha256(scenario) {
  return sha256(`${JSON.stringify(scenario, null, 2)}\n`);
}

function countInstalledSkillDirectories(skillsRoot) {
  if (!existsSync(skillsRoot)) return 0;
  return readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length;
}

function skillSourceWasRead(events, source) {
  const normalizedSource = String(source).replace(/\r\n/g, "\n").trim();
  return events.some((event) => {
    if (event?.type !== "item.completed" || event?.item?.type !== "command_execution") return false;
    const output = String(event.item.aggregated_output ?? "").replace(/\r\n/g, "\n");
    return output.includes(normalizedSource);
  });
}

function safeRunId(variant, scenario) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `${timestamp}-${variant}-${scenario}-${randomUUID().slice(0, 8)}`;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function validateResult(result) {
  assert(isPlainObject(result), "result must be an object", "INVALID_RESULT");
  assertExactKeys(
    result,
    [
      "schemaVersion",
      "runId",
      "status",
      "startedAt",
      "completedAt",
      "variant",
      "scenario",
      "codex",
      "isolation",
      "session",
      "turns",
      "usage",
      "grade",
    ],
    "result",
  );
  assert([1, 2, 3].includes(result.schemaVersion), "result.schemaVersion must be 1, 2, or 3", "INVALID_RESULT");
  assertNonemptyString(result.runId, "result.runId");
  assert(["completed", "completed_with_violations"].includes(result.status), "result.status is invalid", "INVALID_RESULT");
  assert(!Number.isNaN(Date.parse(result.startedAt)), "result.startedAt must be an ISO timestamp", "INVALID_RESULT");
  assert(!Number.isNaN(Date.parse(result.completedAt)), "result.completedAt must be an ISO timestamp", "INVALID_RESULT");
  assert(Array.isArray(result.turns) && result.turns.length > 0, "result.turns must not be empty", "INVALID_RESULT");
  if (result.schemaVersion >= 2) {
    assert(
      REASONING_EFFORTS.has(result.codex.config.reasoningEffort),
      "result.codex.config.reasoningEffort is invalid",
      "INVALID_RESULT",
    );
  }
  if (result.schemaVersion >= 3) {
    assert(result.isolation.skillInstallScope === "repository", "result Skill scope is invalid", "INVALID_RESULT");
    assert(result.isolation.skillSourceRead === true, "result lacks Skill source-read proof", "INVALID_RESULT");
  }
  assertNonemptyString(result.session.threadId, "result.session.threadId");
  const resumedSameThread = result.turns.every((turn) => turn.threadId === result.session.threadId);
  assert(
    result.session.resumedSameThread === resumedSameThread,
    "result.session.resumedSameThread does not match turn thread IDs",
    "INVALID_RESULT",
  );
  for (const key of ["inputTokens", "cachedInputTokens", "outputTokens", "reasoningOutputTokens"]) {
    assert(Number.isFinite(result.usage[key]) && result.usage[key] >= 0, `result.usage.${key} is invalid`, "INVALID_RESULT");
  }
  assert(Number.isFinite(result.grade.totalScore), "result.grade.totalScore is invalid", "INVALID_RESULT");
  assert(Array.isArray(result.grade.criticalViolations), "result.grade.criticalViolations must be an array", "INVALID_RESULT");
  return result;
}

export async function runEvaluation({
  variant: variantId,
  scenario: scenarioId,
  model,
  reasoningEffort,
  authFile,
  useEnvApiKey = false,
  outputRoot = DEFAULT_RESULTS_ROOT,
  evalRoot = EVAL_ROOT,
  repositoryRoot = REPOSITORY_ROOT,
  launcher = defaultCodexLauncher(),
  preflight = preflightCodex,
  modelTurnTimeoutMs = 300_000,
  extraEnv = {},
  removeOwnedPath = defaultRemoveEvaluatorOwnedPath,
  onState,
  platform,
  processTarget,
  gracefulTerminationMs,
  forcedTerminationMs,
} = {}) {
  assertNonemptyString(variantId, "variant");
  assertNonemptyString(scenarioId, "scenario");
  assertNonemptyString(model, "model");
  assert(
    REASONING_EFFORTS.has(reasoningEffort),
    "reasoningEffort must be one of minimal, low, medium, high, or xhigh",
    "INVALID_ARGUMENT",
  );
  assert(!(authFile && useEnvApiKey), "Use either --auth-file or --use-env-api-key, not both", "INVALID_ARGUMENT");

  const definition = loadEvaluationDefinition(evalRoot, repositoryRoot);
  const scenario = definition.scenarios.get(scenarioId);
  assert(scenario, `Unknown scenario: ${scenarioId}`, "INVALID_ARGUMENT");
  const variant = getVariant(variantId, definition, repositoryRoot);
  const runId = safeRunId(variant.id, scenario.id);
  const startedAt = new Date().toISOString();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "kyw-grilling-eval-"));
  const evalRepository = join(temporaryRoot, "repository");
  const temporaryHome = join(temporaryRoot, "home");
  const codexHome = join(temporaryRoot, "codex-home");
  const repositorySkillsRoot = join(evalRepository, ".agents", "skills");
  const resolvedOutputRoot = resolve(outputRoot);
  const outputRootExisted = existsSync(resolvedOutputRoot);
  let stagingDirectory;
  let publishedDirectory;
  let completed;
  let primaryError;

  const scope = createEvaluatorRunScope({
    platform,
    processTarget,
    gracefulTerminationMs,
    forcedTerminationMs,
    onChildSpawn: ({ pid }) => onState?.({ type: "child-spawn", pid }),
  });

  const context = {
    evalRepository,
    evalHome: temporaryHome,
    codexHome,
    temporaryRoot,
    sourceRepository: repositoryRoot,
    userHome: homedir(),
  };

  try {
    onState?.({ type: "temporary-root", temporaryRoot });
    await scope.checkpoint();
    mkdirSync(temporaryHome, { recursive: true });
    mkdirSync(codexHome, { recursive: true });
    materializeRepository(scenario.repository, evalRepository);
    onState?.({
      type: "isolated-state",
      authCopy: join(codexHome, "auth.json"),
      codexHome,
      evalRepository,
      temporaryHome,
    });
    await scope.checkpoint();
    mkdirSync(repositorySkillsRoot, { recursive: true });
    const installedSkillDirectory = join(repositorySkillsRoot, variant.skillName);
    copySkillDirectory(variant.sourceDirectory, installedSkillDirectory);
    initializeGitRepository(evalRepository);
    const fixtureBefore = snapshotDirectory(evalRepository, { exclude: new Set([".git", ".agents"]) });
    const skillInstallCount = countInstalledSkillDirectories(repositorySkillsRoot);
    const installedSkillRelativePath = `.agents/skills/${variant.skillName}/SKILL.md`;
    const installedSkillSource = readFileSync(join(installedSkillDirectory, "SKILL.md"), "utf8");
    const authState = copyAuthenticationSource(authFile, codexHome);
    const env = buildChildEnvironment({
      temporaryHome,
      codexHome,
      temporaryRoot,
      useEnvApiKey,
      extraEnv,
    });
    const codex = preflight({ launcher, env });

    mkdirSync(resolvedOutputRoot, { recursive: true });
    stagingDirectory = join(resolvedOutputRoot, `.staging-${runId}`);
    mkdirSync(stagingDirectory, { recursive: false });
    publishedDirectory = join(resolvedOutputRoot, runId);
    assert(!existsSync(publishedDirectory), `Result directory already exists: ${runId}`, "OUTPUT_CONFLICT");
    onState?.({
      type: "staging",
      outputRoot: resolvedOutputRoot,
      publishedDirectory,
      stagingDirectory,
    });
    await scope.checkpoint();

    const initialPrompt = [
      `Use $${variant.skillName} to interview me about this subject:`,
      scenario.subject,
      `Before responding, use a read-only command to read the exact installed Skill at ${installedSkillRelativePath}.`,
      "Follow that Skill exactly. If it cannot be read, stop and report EVALUATION_SKILL_UNAVAILABLE. Inspect repository facts read-only. Do not implement or write files.",
    ].join("\n\n");
    const prompts = [initialPrompt, ...scenario.scriptedUserReplies.map((reply) => reply.text)];
    const turns = [];
    let threadId;

    for (let index = 0; index < prompts.length; index += 1) {
      const turnStartedAt = new Date().toISOString();
      const lastMessagePath = join(temporaryRoot, `last-message-${index + 1}.txt`);
      const invocation = await invokeCodexTurn({
        launcher,
        env,
        repository: evalRepository,
        model,
        reasoningEffort,
        prompt: prompts[index],
        threadId,
        lastMessagePath,
        timeout: modelTurnTimeoutMs,
        context,
        runChild: scope.runChild,
      });
      if (index === 0) {
        assert(
          skillSourceWasRead(invocation.parsed.events, installedSkillSource),
          `Codex did not read the evaluated Skill source at ${installedSkillRelativePath}`,
          "EVALUATED_SKILL_NOT_LOADED",
        );
      }
      if (index === 0) threadId = invocation.parsed.threadId;
      const redactedEvents = redactValue(invocation.parsed.events, context);
      const redactedMessage = redactText(invocation.finalMessage, context);
      const eventsFile = `turn-${String(index + 1).padStart(2, "0")}.events.jsonl`;
      const messageFile = `turn-${String(index + 1).padStart(2, "0")}.final.txt`;
      writeFileSync(
        join(stagingDirectory, eventsFile),
        `${redactedEvents.map((event) => JSON.stringify(event)).join("\n")}\n`,
        "utf8",
      );
      writeFileSync(join(stagingDirectory, messageFile), `${redactedMessage.trimEnd()}\n`, "utf8");
      turns.push({
        index: index + 1,
        kind: index === 0 ? "initial" : "resume",
        userMessage: redactText(prompts[index], context),
        startedAt: turnStartedAt,
        completedAt: new Date().toISOString(),
        threadId: invocation.parsed.threadId,
        eventsFile,
        finalMessageFile: messageFile,
        finalMessage: redactedMessage,
        usage: invocation.parsed.usage,
        diagnostic: redactText(invocation.stderr, context).slice(0, 2_000),
        events: redactedEvents,
      });
      await scope.checkpoint();
    }

    const fixtureAfter = snapshotDirectory(evalRepository, { exclude: new Set([".git", ".agents"]) });
    const gitStatus = runGit(evalRepository, ["status", "--porcelain=v1", "--untracked-files=all"]).trim();
    const fixtureUnchanged = fixtureBefore.sha256 === fixtureAfter.sha256 && gitStatus.length === 0;
    const resumedSameThread = turns.every((turn) => turn.threadId === threadId);
    const sourceAuthUnchanged = authSourceUnchanged(authState);
    const isolation = {
      temporaryGitRepository: true,
      temporaryCodexHome: true,
      temporaryUserHome: true,
      normalUserConfigurationLoaded: false,
      sandbox: "read-only",
      skillInstallCount,
      installedSkillName: variant.skillName,
      skillInstallScope: "repository",
      skillSourceRead: true,
      fixtureSha256Before: fixtureBefore.sha256,
      fixtureSha256After: fixtureAfter.sha256,
      fixtureUnchanged,
      gitStatusClean: gitStatus.length === 0,
      authMode: authFile ? "temporary-file-copy" : useEnvApiKey ? "single-run-code-api-key" : "none",
      authSourceUnchanged: sourceAuthUnchanged,
      temporaryWorkspaceCleanedAfterRun: true,
    };
    const session = {
      threadId,
      resumeThreadIds: turns.slice(1).map((turn) => turn.threadId),
      resumedSameThread,
    };
    const grade = gradeRun({ scenario, rubric: definition.rubric, turns, isolation, session });
    const usage = aggregateUsage(turns);
    const completedAt = new Date().toISOString();
    const resultTurns = turns.map(({ events, ...turn }) => turn);
    const result = validateResult({
      schemaVersion: 3,
      runId,
      status: grade.criticalViolations.length === 0 ? "completed" : "completed_with_violations",
      startedAt,
      completedAt,
      variant: {
        id: variant.id,
        skillName: variant.skillName,
        sourcePath: variant.sourcePath,
        skillSha256: variant.skillSha256,
        upstreamCommit: variant.commit ?? null,
      },
      scenario: {
        id: scenario.id,
        category: scenario.category,
        sha256: scenarioSha256(scenario),
      },
      codex: {
        version: codex.version,
        model,
        config: {
          initialSandbox: "read-only",
          resumeUsesPersistedSessionSandbox: true,
          ignoreUserConfig: true,
          ignoreRules: true,
          strictConfig: true,
          shellEnvironmentInherit: "none",
          reasoningEffort,
        },
        capabilities: codex.capabilities,
      },
      isolation,
      session,
      turns: resultTurns,
      usage,
      grade,
    });
    writeJson(join(stagingDirectory, "run.json"), result);
    const artifactText = readdirSync(stagingDirectory)
      .sort()
      .map((file) => readFileSync(join(stagingDirectory, file), "utf8"))
      .join("\n");
    const sensitiveFindings = scanSensitiveText(artifactText);
    assert(
      sensitiveFindings.length === 0,
      `Redacted result still contains sensitive output: ${sensitiveFindings.join(", ")}`,
      "SENSITIVE_OUTPUT",
    );
    onState?.({ type: "publication-ready", publishedDirectory, stagingDirectory });
    await scope.checkpoint();
    renameSync(stagingDirectory, publishedDirectory);
    stagingDirectory = undefined;
    onState?.({ type: "published", publishedDirectory });
    completed = { result, resultDirectory: publishedDirectory };
  } catch (error) {
    primaryError = error;
    scope.claimFailure();
  }

  const finalState = await scope.finalize(async () => {
    const failures = [];
    const remove = async (path, options, operation, pathLabel) => {
      try {
        await removeOwnedPath(path, options);
      } catch (error) {
        failures.push(cleanupFailureDiagnostic({ operation, pathLabel, error }));
      }
    };
    if (stagingDirectory && existsSync(stagingDirectory)) {
      await remove(
        stagingDirectory,
        { recursive: true, force: true },
        "remove-tree",
        "grilling-unpublished-staging",
      );
    }
    await remove(
      temporaryRoot,
      { recursive: true, force: true },
      "remove-tree",
      "grilling-temporary-root",
    );
    if (
      !outputRootExisted &&
      existsSync(resolvedOutputRoot) &&
      readdirSync(resolvedOutputRoot).length === 0
    ) {
      await remove(
        resolvedOutputRoot,
        { directoryOnly: true },
        "remove-directory",
        "grilling-empty-output-root",
      );
    }
    onState?.({ type: "cleanup-complete", temporaryRoot });
    return failures;
  });

  if (finalState.cause.kind === "interruption") {
    const interrupted = new EvaluatorInterruptedError(finalState.cause.signal);
    const error = new EvaluationError("EVALUATION_INTERRUPTED", interrupted.message);
    error.exitCode = interrupted.exitCode;
    primaryError = error;
  } else if (!primaryError && finalState.diagnostics.length > 0) {
    primaryError = new EvaluationError("EVALUATOR_CLEANUP_FAILED", "Evaluator cleanup failed");
  }
  if (primaryError) {
    appendEvaluatorDiagnostics(primaryError, finalState.diagnostics);
    throw primaryError;
  }
  return completed;
}

export function resultSummary(result) {
  return {
    runId: result.runId,
    status: result.status,
    variant: result.variant.id,
    scenario: result.scenario.id,
    scenarioSha256: result.scenario.sha256,
    codexVersion: result.codex.version,
    model: result.codex.model,
    reasoningEffort: result.codex.config.reasoningEffort ?? null,
    rubricId: result.grade.rubricId,
    totalScore: result.grade.totalScore,
    criticalViolationCount: result.grade.criticalViolations.length,
    assistantTurns: result.turns.length,
    inputTokens: result.usage.inputTokens,
    cachedInputTokens: result.usage.cachedInputTokens,
    outputTokens: result.usage.outputTokens,
    reasoningOutputTokens: result.usage.reasoningOutputTokens,
    primaryTokens: result.usage.inputTokens + result.usage.outputTokens,
  };
}

export function writeComparison(outputRoot, results, options) {
  assert(results.length > 0, "comparison requires results", "INVALID_RESULT");
  const comparisonId = `${new Date().toISOString().replace(/[-:.TZ]/g, "")}-comparison-${randomUUID().slice(0, 8)}`;
  const resolvedOutputRoot = resolve(outputRoot);
  mkdirSync(resolvedOutputRoot, { recursive: true });
  const comparisonDirectory = join(resolvedOutputRoot, comparisonId);
  const stagingDirectory = join(resolvedOutputRoot, `.staging-${comparisonId}`);
  mkdirSync(stagingDirectory, { recursive: false });
  const summaries = results.map(({ result }) => resultSummary(result));
  const byVariant = Object.fromEntries(
    ["kyw", "upstream"].map((variant) => {
      const matching = summaries.filter((summary) => summary.variant === variant);
      return [
        variant,
        {
          runCount: matching.length,
          meanScore: roundScore(matching.reduce((sum, entry) => sum + entry.totalScore, 0) / matching.length),
          totalCriticalViolations: matching.reduce((sum, entry) => sum + entry.criticalViolationCount, 0),
          totalInputTokens: matching.reduce((sum, entry) => sum + entry.inputTokens, 0),
          totalOutputTokens: matching.reduce((sum, entry) => sum + entry.outputTokens, 0),
          totalPrimaryTokens: matching.reduce((sum, entry) => sum + entry.primaryTokens, 0),
        },
      ];
    }),
  );
  const comparison = {
    schemaVersion: 1,
    comparisonId,
    createdAt: new Date().toISOString(),
    model: options.model,
    reasoningEffort: options.reasoningEffort,
    scenarios: options.scenarios,
    runsPerVariantScenario: options.runs,
    descriptiveOnly: true,
    summaries,
    byVariant,
  };
  try {
    writeJson(join(stagingDirectory, "comparison.json"), comparison);
    renameSync(stagingDirectory, comparisonDirectory);
  } catch (error) {
    rmSync(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
  return { comparison, comparisonDirectory };
}

function median(values) {
  assert(Array.isArray(values) && values.length > 0, "median requires at least one value", "INVALID_RESULT");
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return roundScore(
    sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
  );
}

function scenarioSuiteRevision(evalRoot) {
  const scenarioDirectory = join(evalRoot, "scenarios");
  const payload = readdirSync(scenarioDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => `${name}\0${sha256File(join(scenarioDirectory, name))}\n`)
    .join("");
  return sha256(payload);
}

function summarizeBenchmarkRuns(runs) {
  const dimensionIds = EXPECTED_DIMENSION_IDS;
  return {
    runCount: runs.length,
    criticalViolationCount: runs.reduce((sum, run) => sum + run.criticalViolations.length, 0),
    medianQualityScore: median(runs.map((run) => run.qualityScore)),
    medianAssistantTurns: median(runs.map((run) => run.assistantTurns)),
    medianUsage: {
      inputTokens: median(runs.map((run) => run.usage.inputTokens)),
      cachedInputTokens: median(runs.map((run) => run.usage.cachedInputTokens)),
      outputTokens: median(runs.map((run) => run.usage.outputTokens)),
      reasoningOutputTokens: median(runs.map((run) => run.usage.reasoningOutputTokens)),
      primaryTokens: median(runs.map((run) => run.usage.primaryTokens)),
    },
    medianDimensionScores: Object.fromEntries(
      dimensionIds.map((id) => [id, median(runs.map((run) => run.dimensions[id]))]),
    ),
  };
}

function auditRunArtifacts(resultRoot, result) {
  const runDirectory = join(resultRoot, result.runId);
  const runPath = join(runDirectory, "run.json");
  assert(existsSync(runPath), `Missing run manifest: ${result.runId}`, "INVALID_RESULT");
  const expectedFiles = new Set(["run.json"]);
  const gradingTurns = [];

  for (const turn of result.turns) {
    expectedFiles.add(turn.eventsFile);
    expectedFiles.add(turn.finalMessageFile);
    const eventsPath = join(runDirectory, turn.eventsFile);
    const finalMessagePath = join(runDirectory, turn.finalMessageFile);
    assert(existsSync(eventsPath), `Missing JSONL artifact: ${turn.eventsFile}`, "INVALID_RESULT");
    assert(existsSync(finalMessagePath), `Missing transcript artifact: ${turn.finalMessageFile}`, "INVALID_RESULT");
    const parsed = parseJsonl(readFileSync(eventsPath, "utf8"));
    const finalMessage = readFileSync(finalMessagePath, "utf8").trimEnd();
    assert(parsed.threadId === turn.threadId, `Thread mismatch in ${turn.eventsFile}`, "INVALID_RESULT");
    assert(finalMessage === turn.finalMessage.trimEnd(), `Transcript mismatch in ${turn.finalMessageFile}`, "INVALID_RESULT");
    assert(
      JSON.stringify(parsed.usage) === JSON.stringify(turn.usage),
      `JSONL usage mismatch in ${turn.eventsFile}`,
      "INVALID_RESULT",
    );
    gradingTurns.push({ ...turn, finalMessage, events: parsed.events, usage: parsed.usage });
  }

  const actualFiles = readdirSync(runDirectory).sort();
  assert(
    JSON.stringify(actualFiles) === JSON.stringify([...expectedFiles].sort()),
    `Unexpected artifact set for ${result.runId}`,
    "INVALID_RESULT",
  );
  const artifactText = actualFiles.map((file) => readFileSync(join(runDirectory, file), "utf8")).join("\n");
  assert(scanSensitiveText(artifactText).length === 0, `Sensitive artifact finding in ${result.runId}`, "INVALID_RESULT");
  return {
    gradingTurns,
    runJsonSha256: sha256File(runPath),
    artifactTreeSha256: snapshotDirectory(runDirectory).sha256,
    artifactCount: actualFiles.length,
  };
}

export function writeBenchmarkReport(
  comparisonDirectory,
  {
    evalRoot = EVAL_ROOT,
    repositoryRoot = REPOSITORY_ROOT,
    benchmarkPath = join(EVAL_ROOT, "benchmark.v10.json"),
  } = {},
) {
  const resolvedComparisonDirectory = resolve(comparisonDirectory);
  const comparisonPath = join(resolvedComparisonDirectory, "comparison.json");
  assert(existsSync(comparisonPath), `Missing comparison.json in ${comparisonDirectory}`, "INVALID_ARGUMENT");
  const benchmark = readJson(benchmarkPath);
  const comparison = readJson(comparisonPath);
  const definition = loadEvaluationDefinition(evalRoot, repositoryRoot);
  const resultRoot = dirname(resolvedComparisonDirectory);

  assert(
    [1, 2, 3].includes(benchmark.schemaVersion),
    "benchmark.schemaVersion must be 1, 2, or 3",
    "INVALID_RESULT",
  );
  assert(
    JSON.stringify(benchmark.thresholds) === JSON.stringify(BENCHMARK_THRESHOLDS),
    "benchmark thresholds differ from the predeclared reporter thresholds",
    "INVALID_RESULT",
  );
  assert(comparison.schemaVersion === 1, "comparison.schemaVersion must be 1", "INVALID_RESULT");
  assert(Array.isArray(comparison.summaries), "comparison.summaries must be an array", "INVALID_RESULT");

  const expectedRunCount = benchmark.expectedRuns;
  assert(comparison.summaries.length === expectedRunCount, `Expected ${expectedRunCount} run summaries`, "INVALID_RESULT");
  assert(comparison.model === benchmark.model, "comparison model differs from the frozen benchmark", "INVALID_RESULT");
  assert(
    comparison.reasoningEffort === benchmark.reasoningEffort,
    "comparison reasoning effort differs from the frozen benchmark",
    "INVALID_RESULT",
  );
  assert(
    comparison.runsPerVariantScenario === benchmark.repetitionsPerVariantScenario,
    "comparison repetition count differs from the frozen benchmark",
    "INVALID_RESULT",
  );
  assert(
    JSON.stringify(comparison.scenarios) === JSON.stringify(benchmark.scenarioOrder),
    "comparison scenario order differs from the frozen benchmark",
    "INVALID_RESULT",
  );
  assert(
    scenarioSuiteRevision(evalRoot) === benchmark.scenarioSuiteRevision,
    "scenario suite revision differs from the frozen benchmark",
    "INVALID_RESULT",
  );
  assert(definition.rubric.id === benchmark.rubric.id, "rubric ID differs from the frozen benchmark", "INVALID_RESULT");
  assert(
    sha256File(join(evalRoot, "rubric.v1.json")) === benchmark.rubric.sha256,
    "rubric checksum differs from the frozen benchmark",
    "INVALID_RESULT",
  );
  assert(
    definition.baseline.commit === benchmark.upstream.commit &&
      definition.baseline.sha256 === benchmark.upstream.skillSha256,
    "upstream baseline differs from the frozen benchmark",
    "INVALID_RESULT",
  );

  const expectedOrder = benchmark.scenarioOrder.flatMap((scenario) =>
    benchmark.execution.variantOrderWithinScenario.flatMap((variant) =>
      Array.from(
        { length: benchmark.repetitionsPerVariantScenario },
        () => `${scenario}:${variant}`,
      ),
    ),
  );
  assert(
    JSON.stringify(comparison.summaries.map((summary) => `${summary.scenario}:${summary.variant}`)) ===
      JSON.stringify(expectedOrder),
    "comparison run order differs from the frozen benchmark",
    "INVALID_RESULT",
  );

  const runs = comparison.summaries.map((summary) => {
    const runPath = join(resultRoot, summary.runId, "run.json");
    assert(existsSync(runPath), `Missing run directory for ${summary.runId}`, "INVALID_RESULT");
    const result = validateResult(readJson(runPath));
    assert(result.schemaVersion === benchmark.resultSchemaVersion, `Wrong result schema for ${result.runId}`, "INVALID_RESULT");
    assert(
      JSON.stringify(resultSummary(result)) === JSON.stringify(summary),
      `Comparison summary differs from run.json for ${result.runId}`,
      "INVALID_RESULT",
    );
    const artifacts = auditRunArtifacts(resultRoot, result);
    const scenario = definition.scenarios.get(result.scenario.id);
    assert(scenario, `Unknown scenario in ${result.runId}`, "INVALID_RESULT");
    const regraded = gradeRun({
      scenario,
      rubric: definition.rubric,
      turns: artifacts.gradingTurns,
      isolation: result.isolation,
      session: result.session,
    });
    assert(
      JSON.stringify(regraded) === JSON.stringify(result.grade),
      `Transcript/JSONL regrade differs from run.json for ${result.runId}`,
      "INVALID_RESULT",
    );
    const usage = aggregateUsage(artifacts.gradingTurns);
    assert(
      JSON.stringify(usage) === JSON.stringify(result.usage),
      `Transcript/JSONL aggregate usage differs from run.json for ${result.runId}`,
      "INVALID_RESULT",
    );
    return {
      runId: result.runId,
      resultSchemaVersion: result.schemaVersion,
      variant: result.variant.id,
      scenario: result.scenario.id,
      qualityScore: regraded.totalScore,
      criticalViolations: regraded.criticalViolations,
      dimensions: Object.fromEntries(regraded.dimensions.map((dimension) => [dimension.id, dimension.score])),
      assistantTurns: artifacts.gradingTurns.length,
      usage: {
        ...usage,
        primaryTokens: usage.inputTokens + usage.outputTokens,
      },
      runJsonSha256: artifacts.runJsonSha256,
      artifactTreeSha256: artifacts.artifactTreeSha256,
      artifactCount: artifacts.artifactCount,
      skillSha256: result.variant.skillSha256,
      scenarioSha256: result.scenario.sha256,
      codexVersion: result.codex.version,
      model: result.codex.model,
      reasoningEffort: result.codex.config.reasoningEffort,
      codexConfig: result.codex.config,
      authMode: result.isolation.authMode,
      skillInstallScope: result.isolation.skillInstallScope ?? null,
      skillSourceRead: result.isolation.skillSourceRead ?? false,
      fixtureUnchanged: result.isolation.fixtureUnchanged,
      gitStatusClean: result.isolation.gitStatusClean,
      resumedSameThread: result.session.resumedSameThread,
    };
  });

  const kywRuns = runs.filter((run) => run.variant === "kyw");
  const upstreamRuns = runs.filter((run) => run.variant === "upstream");
  const expectedScenarioHashes = Object.fromEntries(
    benchmark.scenarioOrder.map((id) => [id, scenarioSha256(definition.scenarios.get(id))]),
  );
  const conditionChecks = {
    exactCodexVersion: runs.every((run) => run.codexVersion === benchmark.codexVersion),
    exactModel: runs.every((run) => run.model === benchmark.model),
    exactReasoningEffort: runs.every((run) => run.reasoningEffort === benchmark.reasoningEffort),
    exactScenarioRevision: runs.every((run) => run.scenarioSha256 === expectedScenarioHashes[run.scenario]),
    resultSchemaVersion: runs.every(
      (run) => run.resultSchemaVersion === benchmark.resultSchemaVersion,
    ),
    identicalCodexConfig:
      new Set(runs.map((run) => JSON.stringify(run.codexConfig))).size === 1 &&
      runs.every(
        (run) =>
          run.codexConfig.initialSandbox === benchmark.execution.sandbox &&
          run.codexConfig.ignoreUserConfig === benchmark.execution.ignoreUserConfig &&
          run.codexConfig.ignoreRules === benchmark.execution.ignoreRules &&
          run.codexConfig.strictConfig === benchmark.execution.strictConfig &&
          run.codexConfig.shellEnvironmentInherit === benchmark.execution.shellEnvironmentInherit,
      ),
    identicalAuthMode: runs.every((run) => run.authMode === benchmark.execution.authMode),
    repositorySkillInstall: runs.every(
      (run) => run.skillInstallScope === benchmark.execution.skillInstallScope,
    ),
    skillSourceRead: runs.every(
      (run) => run.skillSourceRead === benchmark.execution.skillSourceReadRequired,
    ),
    isolatedReadOnlyRuns: runs.every(
      (run) => run.fixtureUnchanged && run.gitStatusClean && run.resumedSameThread,
    ),
    expectedRunCount: runs.length === benchmark.expectedRuns,
    expectedAssistantTurns:
      runs.reduce((sum, run) => sum + run.assistantTurns, 0) === benchmark.expectedAssistantTurns,
    stableVariantBytes: ["kyw", "upstream"].every(
      (variant) => new Set(runs.filter((run) => run.variant === variant).map((run) => run.skillSha256)).size === 1,
    ),
    expectedKywSkillBytes:
      benchmark.kywSkillSha256ForScoredRun === undefined ||
      kywRuns.every((run) => run.skillSha256 === benchmark.kywSkillSha256ForScoredRun),
    expectedUpstreamSkillBytes: upstreamRuns.every(
      (run) => run.skillSha256 === benchmark.upstream.skillSha256,
    ),
  };
  const identicalConditions = Object.values(conditionChecks).every(Boolean);

  const aggregate = {
    kyw: summarizeBenchmarkRuns(kywRuns),
    upstream: summarizeBenchmarkRuns(upstreamRuns),
  };
  aggregate.qualityMedianDelta = roundScore(
    aggregate.kyw.medianQualityScore - aggregate.upstream.medianQualityScore,
  );
  aggregate.primaryTokenMedianRatio = roundScore(
    aggregate.kyw.medianUsage.primaryTokens / aggregate.upstream.medianUsage.primaryTokens,
  );

  const scenarios = benchmark.scenarioOrder.map((scenario) => {
    const kyw = summarizeBenchmarkRuns(
      kywRuns.filter((run) => run.scenario === scenario),
    );
    const upstream = summarizeBenchmarkRuns(
      upstreamRuns.filter((run) => run.scenario === scenario),
    );
    return {
      scenario,
      kyw,
      upstream,
      qualityMedianDelta: roundScore(kyw.medianQualityScore - upstream.medianQualityScore),
      primaryTokenMedianRatio: roundScore(
        kyw.medianUsage.primaryTokens / upstream.medianUsage.primaryTokens,
      ),
    };
  });

  const gateChecks = {
    identicalConditions,
    kywCriticalViolations:
      aggregate.kyw.criticalViolationCount === BENCHMARK_THRESHOLDS.kywCriticalViolations,
    aggregateQualityParity:
      aggregate.qualityMedianDelta >= BENCHMARK_THRESHOLDS.aggregateMedianQualityDeltaFloor,
    scenarioQualityParity: scenarios.every(
      (scenario) =>
        scenario.qualityMedianDelta >= BENCHMARK_THRESHOLDS.scenarioMedianQualityDeltaFloor,
    ),
    primaryTokenEfficiency:
      aggregate.primaryTokenMedianRatio <=
      BENCHMARK_THRESHOLDS.kywToUpstreamMedianPrimaryTokenRatioCeiling,
    assistantTurns: runs.every(
      (run) => run.assistantTurns === BENCHMARK_THRESHOLDS.assistantTurnsPerCompletedRun,
    ),
  };
  const report = {
    schemaVersion: 1,
    comparisonId: comparison.comparisonId,
    benchmarkConfigSha256: sha256File(benchmarkPath),
    comparisonJsonSha256: sha256File(comparisonPath),
    rubricSha256: sha256File(join(evalRoot, "rubric.v1.json")),
    resultSchemaSha256: sha256File(
      join(evalRoot, `result.schema.v${benchmark.resultSchemaVersion}.json`),
    ),
    configuration: {
      codexVersion: benchmark.codexVersion,
      model: benchmark.model,
      reasoningEffort: benchmark.reasoningEffort,
      scenarioSuiteRevision: benchmark.scenarioSuiteRevision,
      rubricId: benchmark.rubric.id,
      repetitionsPerVariantScenario: benchmark.repetitionsPerVariantScenario,
      primaryTokenMetric: benchmark.primaryTokenMetric,
    },
    thresholds: BENCHMARK_THRESHOLDS,
    conditionChecks,
    aggregate,
    scenarios,
    runs,
    gateChecks,
    gateResult: Object.values(gateChecks).every(Boolean) ? "pass" : "fail",
  };
  const reportText = `${JSON.stringify(report, null, 2)}\n`;
  const reportPath = join(resolvedComparisonDirectory, "report.json");
  if (existsSync(reportPath)) {
    assert(readFileSync(reportPath, "utf8") === reportText, "Existing report.json differs", "OUTPUT_CONFLICT");
  } else {
    const stagingPath = join(resolvedComparisonDirectory, `.report-${randomUUID()}.tmp`);
    try {
      writeFileSync(stagingPath, reportText, { encoding: "utf8", flag: "wx" });
      renameSync(stagingPath, reportPath);
    } catch (error) {
      rmSync(stagingPath, { force: true });
      throw error;
    }
  }
  return { report, reportPath, reportSha256: sha256(reportText) };
}

export async function runComparison({ scenarios, runs, outputRoot = DEFAULT_RESULTS_ROOT, ...options } = {}) {
  assert(Array.isArray(scenarios) && scenarios.length > 0, "comparison requires one or more scenarios", "INVALID_ARGUMENT");
  assert(Number.isInteger(runs) && runs >= 1 && runs <= 10, "comparison runs must be from 1 through 10", "INVALID_ARGUMENT");
  const definition = loadEvaluationDefinition(options.evalRoot ?? EVAL_ROOT, options.repositoryRoot ?? REPOSITORY_ROOT);
  for (const scenario of scenarios) {
    assert(definition.scenarios.has(scenario), `Unknown scenario: ${scenario}`, "INVALID_ARGUMENT");
  }
  const resolvedOutputRoot = resolve(outputRoot);
  const outputRootExisted = existsSync(resolvedOutputRoot);
  const completed = [];
  try {
    for (const scenario of scenarios) {
      for (const variant of ["kyw", "upstream"]) {
        for (let run = 1; run <= runs; run += 1) {
          completed.push(await runEvaluation({ ...options, outputRoot: resolvedOutputRoot, variant, scenario }));
        }
      }
    }
    const published = writeComparison(resolvedOutputRoot, completed, {
      model: options.model,
      reasoningEffort: options.reasoningEffort,
      scenarios,
      runs,
    });
    return { ...published, runs: completed };
  } catch (error) {
    if (!outputRootExisted && existsSync(resolvedOutputRoot) && readdirSync(resolvedOutputRoot).length === 0) {
      rmdirSync(resolvedOutputRoot);
    }
    throw error;
  }
}
