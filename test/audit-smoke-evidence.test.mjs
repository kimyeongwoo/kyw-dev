import assert from "node:assert/strict";
import test from "node:test";

import { analyzeEvents } from "../scripts/audit-smoke-evidence.mjs";

function item(type, id, fields = {}, eventType = "item.completed") {
  return { type: eventType, item: { id, type, ...fields } };
}

function trace(items) {
  return [
    { type: "thread.started", thread_id: "synthetic-audit-thread" },
    { type: "turn.started" },
    ...items,
    { type: "turn.completed", usage: {} },
  ];
}

function analyze(items, options = {}) {
  return analyzeEvents(trace(items), { shell: "powershell", ...options });
}

test("supported reads and unsupported read syntax have separate evidence without mutation guesses", () => {
  const cases = [
    ["Get-Content -Raw -LiteralPath 'README.md'", true],
    ["Get-Content -LiteralPath 'README.md'", false],
    ["Get-Content -LiteralPath 'README.md' -Raw", false],
    ["Get-Content -Raw -LiteralPath \"README.md\"", false],
    ["rg --files", true],
    ["rg --files -g '*.md'", false],
    ["rg --files; rg --files", false],
    ["Set-Content 'out.txt' 'changed'; Remove-Item 'out.txt'", false],
  ];
  for (const [command, supported] of cases) {
    const result = analyze([item("command_execution", "command-1", { command })]);
    assert.equal(result.trace.status, "COMPLETE");
    assert.equal(result.readOnlyCommands.length, Number(supported), command);
    assert.equal(result.unverifiedCommands.length, Number(!supported), command);
    assert.deepEqual(result.mutatingCommands, []);
    assert.deepEqual(result.mutationAttempts, []);
    assert.equal(result.firstMutationIndex, null);
    assert.equal(result.planBeforeMutation, supported ? "NOT_APPLICABLE" : "UNVERIFIED", command);
    if (!supported) {
      assert.equal(result.unverifiedCommands[0].reasons[0].code, "READ_ONLY_COMMAND_BOUNDARY");
      assert.ok(result.unverifiedCommands[0].reasons[0].issues.length > 0);
      assert.equal(result.planEvidence.reasons[0].code, "FIRST_WRITE_ORDER_UNVERIFIED");
    }
  }
});

test("unsupported event item data cannot establish a file-change attempt", () => {
  const result = analyze([
    item("file_change", "noise", { changes: [{ path: "src/greeting.mjs", kind: "update" }] }, "unsupported_event"),
  ], { mode: "readonly" });
  assert.equal(result.trace.status, "UNVERIFIED");
  assert.ok(result.trace.reasons.some(({ code }) => code === "TRACE_EVENT_UNVERIFIED"));
  assert.deepEqual(result.fileChanges, []);
  assert.deepEqual(result.mutationAttempts, []);
  assert.equal(result.firstMutationIndex, null);
});

test("unsupported envelopes cannot establish commands or visible speech before a supported write", () => {
  const result = analyze([
    item("command_execution", "noise-read", { command: "rg --files" }, "unsupported_event"),
    item("command_execution", "noise-command", { command: "node --test" }, "unsupported_event"),
    item("agent_message", "noise-message", { text: "I will update the source and test." }, "unsupported_event"),
    item("file_change", "write-1"),
  ]);
  assert.equal(result.trace.status, "UNVERIFIED");
  assert.deepEqual(result.commands, []);
  assert.deepEqual(result.readOnlyCommands, []);
  assert.deepEqual(result.unverifiedCommands, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.planMessages, []);
  assert.deepEqual(result.planEvidence.priorMessageIndices, []);
  assert.equal(result.planBeforeMutation, "UNVERIFIED");
  assert.equal(result.mutationAttempts.length, 1);
  assert.equal(result.firstMutationIndex, 5);
});

test("supported file-change attempts survive malformed and unknown trace markers", () => {
  for (const marker of [{ type: "unparsed_jsonl" }, { type: "unsupported_event" }]) {
    const result = analyze([
      marker,
      item("file_change", "write-1", { changes: [{ path: "src/greeting.mjs", kind: "update" }] }),
    ], { mode: "readonly" });
    assert.equal(result.trace.status, "UNVERIFIED");
    assert.equal(result.fileChanges.length, 1);
    assert.equal(result.mutationAttempts.length, 1);
    assert.equal(result.firstMutationIndex, 3);
    assert.deepEqual(result.mutationAttempts[0].paths, ["src/greeting.mjs"]);
  }
});

test("file-change attempts use the first event and deduplicate a started, updated and completed item", () => {
  const result = analyze([
    item("file_change", "write-1", { changes: [{ path: "src/greeting.mjs", kind: "update" }] }, "item.started"),
    item("file_change", "write-1", { changes: [{ path: "src/greeting.mjs", kind: "update" }] }, "item.updated"),
    item("file_change", "write-1", { changes: [{ path: "src/greeting.mjs", kind: "update" }, { path: "new-file", kind: "add" }], status: "failed" }),
    item("file_change", "write-2", { changes: [{ operation: "delete" }] }),
  ]);
  assert.equal(result.trace.status, "COMPLETE");
  assert.equal(result.fileChanges.length, 2);
  assert.equal(result.mutationAttempts.length, 2);
  assert.equal(result.firstMutationIndex, 2);
  assert.deepEqual(result.mutationAttempts[0].fileChangeKinds, ["update", "add"]);
  assert.deepEqual(result.mutationAttempts[0].paths, ["src/greeting.mjs", "new-file"]);
  assert.equal(result.mutationAttempts[0].status, "failed");
  assert.deepEqual(result.mutationAttempts[1].fileChangeKinds, ["delete"]);
  assert.equal(result.planBeforeMutation, "ABSENT");
  assert.match(result.mutationAttempts[0].reasons[0].description, /does not establish a lasting byte change/);
});

test("no visible speech before a file-change attempt is ABSENT only for a complete ordered trace", () => {
  const items = [
    item("reasoning", "reasoning-1", { text: "Private reasoning is not visible speech." }),
    item("command_execution", "read-1", { command: "rg --files" }),
    item("file_change", "write-1"),
    item("agent_message", "message-1", { text: "I changed the greeting." }),
  ];
  const result = analyze(items);
  assert.equal(result.planBeforeMutation, "ABSENT");
  assert.deepEqual(result.planEvidence.priorMessageIndices, []);
  assert.equal(result.planEvidence.reasons[0].code, "NO_VISIBLE_MESSAGE_BEFORE_WRITE");
  const partial = analyzeEvents(items, { shell: "powershell" });
  assert.equal(partial.planBeforeMutation, "UNVERIFIED");
  assert.equal(partial.trace.status, "UNVERIFIED");
});

test("natural language, greetings, quoted and negated markers never prove plan meaning", () => {
  for (const text of [
    "I will update the greeting punctuation and its regression test; execution remains pending.",
    "안녕하세요.",
    "The quoted string is 'repair plan F-01'.",
    "I do not have a repair plan for F-01.",
    "수리 계획: F-01 changes source and its assertion.",
  ]) {
    const result = analyze([
      item("agent_message", "message-1", { text }),
      item("file_change", "write-1"),
    ]);
    assert.equal(result.planBeforeMutation, "UNVERIFIED", text);
    assert.equal(result.planEvidence.reasons[0].code, "PLAN_MEANING_UNVERIFIED", text);
    assert.deepEqual(result.planEvidence.priorMessageIndices, [2]);
    assert.equal(result.planMessages[0].text, text);
  }
});

test("an earlier unsupported command leaves first-write ordering unverified", () => {
  const result = analyze([
    item("command_execution", "command-1", { command: "Get-Content -LiteralPath 'README.md'" }),
    item("agent_message", "message-1", { text: "I will update the source and test." }),
    item("file_change", "write-1"),
  ]);
  assert.equal(result.firstMutationIndex, 4);
  assert.equal(result.mutationAttempts.length, 1);
  assert.equal(result.planBeforeMutation, "UNVERIFIED");
  assert.equal(result.planEvidence.reasons[0].code, "FIRST_WRITE_ORDER_UNVERIFIED");
  assert.deepEqual(result.planEvidence.priorUnverifiedCommandIndices, [2]);
});

test("a later unsupported command does not erase confirmed absent speech before a write", () => {
  const result = analyze([
    item("file_change", "write-1"),
    item("command_execution", "command-1", { command: "node --test" }),
  ]);
  assert.equal(result.planBeforeMutation, "ABSENT");
  assert.equal(result.unverifiedCommands.length, 1);
});

test("command lifecycle duplicates do not multiply unverified evidence", () => {
  const result = analyze([
    item("command_execution", "command-1", { command: "rg --files -g '*.md'" }, "item.started"),
    item("command_execution", "command-1", { command: "rg --files -g '*.md'", aggregated_output: "README.md" }),
  ]);
  assert.equal(result.trace.status, "COMPLETE");
  assert.equal(result.commands.length, 1);
  assert.equal(result.unverifiedCommands.length, 1);
  assert.equal(result.unverifiedCommands[0].index, 2);
  assert.equal(result.mutationAttempts.length, 0);

  const commandOnCompletion = analyze([
    item("command_execution", "command-2", {}, "item.started"),
    item("command_execution", "command-2", { command: "rg --files" }),
  ]);
  assert.equal(commandOnCompletion.trace.status, "COMPLETE");
  assert.equal(commandOnCompletion.readOnlyCommands.length, 1);
  assert.equal(commandOnCompletion.unverifiedCommands.length, 0);
});

test("missing envelope, ids, completions and ambiguous order cannot establish plan absence", () => {
  const write = item("file_change", "write-1");
  const cases = [
    [write],
    trace([write]).slice(1),
    trace([write]).slice(0, -1),
    trace([{ type: "item.completed", item: { type: "file_change" } }]),
    trace([item("file_change", "write-1", {}, "item.started")]),
    trace([write, write]),
    trace([write, item("file_change", "write-1", {}, "item.started")]),
    trace([item("file_change", "write-1", {}, "item.updated"), write]),
    trace([item("mcp_tool_call", "unknown-1"), write]),
    trace([item("agent_message", "message-1"), write]),
    [write, ...trace([])],
  ];
  for (const events of cases) {
    const result = analyzeEvents(events, { shell: "powershell" });
    assert.equal(result.trace.status, "UNVERIFIED", JSON.stringify(events));
    assert.equal(result.planBeforeMutation, "UNVERIFIED", JSON.stringify(events));
    assert.ok(result.trace.reasons.length > 0);
    assert.ok(result.planEvidence.reasons.length > 0);
    assert.ok(result.mutationAttempts.length > 0);
  }
});

test("conflicting command identity cannot prove a read or complete trace", () => {
  const result = analyze([
    item("command_execution", "command-1", { command: "rg --files -g '*.md'" }, "item.started"),
    item("command_execution", "command-1", { command: "rg --files" }),
    item("file_change", "write-1"),
  ]);
  assert.equal(result.trace.status, "UNVERIFIED");
  assert.ok(result.trace.reasons.some(({ code }) => code === "TRACE_COMMAND_ID_UNVERIFIED"));
  assert.equal(result.planBeforeMutation, "UNVERIFIED");
  assert.equal(result.readOnlyCommands.length, 0);
  assert.equal(result.unverifiedCommands.length, 1);
});

test("read-only plan applicability never hides command or write evidence", () => {
  const result = analyze([
    item("command_execution", "command-1", { command: "rg --files -g '*.md'" }),
    item("file_change", "write-1"),
  ], { mode: "readonly" });
  assert.equal(result.planBeforeMutation, "NOT_APPLICABLE");
  assert.equal(result.unverifiedCommands.length, 1);
  assert.equal(result.mutationAttempts.length, 1);
});
