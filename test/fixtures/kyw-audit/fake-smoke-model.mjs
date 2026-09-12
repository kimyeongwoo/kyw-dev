#!/usr/bin/env node

// Offline evaluator fixture. Only writes the disposable repository selected by
// the test runner; it never invokes a model, Docker, or modified fixture code.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

let args = process.argv.slice(2);
if (!args.length) process.exit(0);
if (args[0] === "--version") {
  console.log("codex-cli 9.9.9-audit-fixture");
  process.exit(0);
}
if (args[1] === "--help") {
  console.log("--json --config --ephemeral --ignore-user-config --ignore-rules --dangerously-bypass-approvals-and-sandbox --permission-profile");
  process.exit(0);
}
if (args[0] === "sandbox") args = args.slice(args.indexOf("exec"));
if (args[0] !== "exec") throw new Error("Unexpected synthetic model invocation");
const prompt = readFileSync(0, "utf8");
const repository = resolve(args[args.indexOf("--cd") + 1]);
const lastMessage = args[args.indexOf("--output-last-message") + 1];
if (process.env.FAKE_AUDIT_PROMPT_LOG) writeFileSync(process.env.FAKE_AUDIT_PROMPT_LOG, prompt);
const events = [
  { type: "thread.started", thread_id: "audit-synthetic-only" },
  { type: "turn.started" },
];
let itemId = 0;
function emit(item, eventType = "item.completed") {
  events.push({ type: eventType, item: { id: `synthetic-${++itemId}`, ...item } });
}
emit({
  type: "command_execution",
  command: process.platform === "win32"
    ? "Get-Content -Raw -LiteralPath '.agents/skills/kyw-audit/SKILL.md'"
    : "cat -- '.agents/skills/kyw-audit/SKILL.md'",
  aggregated_output: process.env.FAKE_AUDIT_SKIP_SKILL_READ === "1" ? "truncated" : readFileSync(join(repository, ".agents/skills/kyw-audit/SKILL.md"), "utf8"),
  status: "completed",
}, process.env.FAKE_AUDIT_READ_EVENT);
if (process.env.FAKE_AUDIT_COMMAND) emit({ type: "command_execution", command: process.env.FAKE_AUDIT_COMMAND, status: "completed" });
const fix = process.env.FAKE_AUDIT_CASE === "fix";
if (fix) {
  if (process.env.FAKE_AUDIT_PLAN !== "none") emit({
    type: "agent_message",
    text: process.env.FAKE_AUDIT_PLAN ?? "I will correct greeting punctuation and its expectation, update the Task evidence, and leave execution pending for the independent runner.",
  });
  writeFileSync(join(repository, "src/greeting.mjs"), 'export function greet(name) {\n  return `Hello, ${name}!`;\n}\n');
  writeFileSync(join(repository, "test/greeting.test.mjs"), 'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { greet } from "../src/greeting.mjs";\ntest("greeting contract", () => assert.equal(greet("Ada"), "Hello, Ada!"));\n');
  for (const name of ["TASK.md", "TEST.md"]) {
    appendFileSync(join(repository, "docs/tasks/0001-greeting-contract", name), "\nSynthetic repair and static review completed. Independent execution pending / UNEXECUTED.\n");
  }
  emit({ type: "file_change", status: "completed", changes: [
    "src/greeting.mjs", "test/greeting.test.mjs", "docs/tasks/0001-greeting-contract/TASK.md", "docs/tasks/0001-greeting-contract/TEST.md",
  ].map((path) => ({ path, kind: "update" })) });
}
if (process.env.FAKE_AUDIT_MUTATION) {
  const target = resolve(repository, process.env.FAKE_AUDIT_MUTATION);
  const local = relative(repository, target);
  if (local.startsWith("..") || !local) throw new Error("Synthetic mutation must stay inside fixture");
  appendFileSync(target, "\nSynthetic observed change.\n");
  emit({ type: "file_change", status: "completed", changes: [{ path: local, kind: "update" }] });
}
if (process.env.FAKE_AUDIT_WRITE_ATTEMPT === "1") emit({ type: "file_change", status: "failed", changes: [{ path: "src/greeting.mjs", kind: "update" }] }, process.env.FAKE_AUDIT_WRITE_EVENT);
const report = process.env.FAKE_AUDIT_REPORT ?? (fix
  ? "Edits and static review completed. Execution checks remain pending / UNEXECUTED for the independent runner.\n\n## Verdict\nBLOCKED"
  : "The greeting still uses a period, contrary to the required exclamation mark.\n\n## Verdict\nBLOCKED");
emit({ type: "agent_message", text: report }, process.env.FAKE_AUDIT_REPORT_EVENT);
events.push({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } });
if (process.env.FAKE_AUDIT_SKIP_REPORT_FILE !== "1") writeFileSync(lastMessage, report);
let malformedEmitted = false;
for (const event of events) {
  console.log(JSON.stringify(event));
  if (event.item?.type === "file_change" && process.env.FAKE_AUDIT_MALFORMED_JSONL === "1" && !malformedEmitted) {
    console.log("{ synthetic malformed JSONL");
    malformedEmitted = true;
  }
}
