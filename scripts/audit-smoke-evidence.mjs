import { commandShellForPlatform, inspectReadOnlyCommand } from "./audit-readonly-boundary.mjs";

const ITEM_EVENTS = new Set(["item.started", "item.updated", "item.completed"]);
const OBSERVED_ITEM_TYPES = new Set([
  "agent_message", "command_execution", "file_change", "reasoning", "todo_list", "web_search",
]);

export function isSupportedItemEvent(event) {
  return ITEM_EVENTS.has(event?.type);
}

function reason(code, description) {
  return { code, description };
}

// This checks the received JSONL envelope and per-item ordering. It does not
// establish the semantics of arbitrary tools or commands, or recover missing logs.
function traceEvidence(events) {
  const reasons = [];
  const items = new Map();
  let threadStarted = false;
  let turnStarted = false;
  let turnCompleted = false;
  const addReason = (code, description) => {
    if (!reasons.some((entry) => entry.code === code)) reasons.push(reason(code, description));
  };
  for (const [index, event] of events.entries()) {
    if (event?.type === "thread.started") {
      if (index !== 0 || threadStarted || typeof event.thread_id !== "string" || !event.thread_id.trim()) {
        addReason("TRACE_THREAD_ENVELOPE_UNVERIFIED", "trace has no unique initial thread identity");
      }
      threadStarted = true;
      continue;
    }
    if (event?.type === "turn.started") {
      if (!threadStarted || turnStarted || turnCompleted) {
        addReason("TRACE_TURN_ORDER_UNVERIFIED", "trace does not contain a single ordered turn");
      }
      turnStarted = true;
      continue;
    }
    if (event?.type === "turn.completed") {
      if (!turnStarted || turnCompleted || index !== events.length - 1) {
        addReason("TRACE_TURN_ORDER_UNVERIFIED", "trace does not end with a single completed turn");
      }
      turnCompleted = true;
      continue;
    }
    if (!isSupportedItemEvent(event) || !OBSERVED_ITEM_TYPES.has(event?.item?.type)) {
      addReason("TRACE_EVENT_UNVERIFIED", "trace contains an unsupported event or item type");
      continue;
    }
    if (!turnStarted || turnCompleted) {
      addReason("TRACE_ITEM_ORDER_UNVERIFIED", "item events occur outside the observed active turn");
    }
    if (event.type === "item.completed" && event.item.type === "agent_message" &&
      typeof event.item.text !== "string") {
      addReason("TRACE_MESSAGE_CONTENT_UNVERIFIED", "a completed agent message has no observable text payload");
    }
    const id = event.item.id;
    if (typeof id !== "string" || !id.trim()) {
      addReason("TRACE_ITEM_ID_UNVERIFIED", "item identity is missing, so attempt deduplication and order are uncertain");
      continue;
    }
    const previous = items.get(id);
    if (previous && (previous.type !== event.item.type || previous.completed || event.type === "item.started")) {
      addReason("TRACE_ITEM_ORDER_UNVERIFIED", "item identity or lifecycle ordering is inconsistent");
    }
    if (event.type === "item.updated" && !previous) {
      addReason("TRACE_ITEM_ORDER_UNVERIFIED", "an item update has no preceding item event");
    }
    if (event.item.type === "command_execution" && previous?.command &&
      typeof event.item.command === "string" && previous.command !== event.item.command) {
      addReason("TRACE_COMMAND_ID_UNVERIFIED", "one command identity has conflicting command text");
    }
    items.set(id, {
      command: event.item.command ?? previous?.command,
      completed: event.type === "item.completed",
      type: event.item.type,
    });
  }
  if (!threadStarted || !turnStarted || !turnCompleted) {
    addReason("TRACE_ENVELOPE_INCOMPLETE", "trace lacks a complete thread and turn envelope");
  }
  if ([...items.values()].some((item) => !item.completed)) {
    addReason("TRACE_ITEM_INCOMPLETE", "trace includes an item without its completion event");
  }
  return { status: reasons.length === 0 ? "COMPLETE" : "UNVERIFIED", reasons };
}

function fileChangeKinds(item) {
  const candidates = [];
  for (const change of Array.isArray(item?.changes) ? item.changes : []) {
    candidates.push(change?.kind, change?.type, change?.operation);
  }
  candidates.push(item?.kind, item?.change_type, item?.operation);
  return candidates.filter((value) => typeof value === "string" && value.trim());
}

function itemKey(item, index) {
  return typeof item.id === "string" && item.id.trim() ? `${item.type}:${item.id}` : `event:${index}`;
}

function planEvidenceFor({ mode, trace, firstMutationIndex, messages, unverifiedCommands }) {
  const priorMessageIndices = messages.filter(({ index }) => firstMutationIndex !== null && index < firstMutationIndex)
    .map(({ index }) => index);
  const priorUnverifiedCommandIndices = unverifiedCommands
    .filter(({ index }) => firstMutationIndex === null || index < firstMutationIndex).map(({ index }) => index);
  let status;
  let reasons;
  if (mode === "readonly") {
    status = "NOT_APPLICABLE";
    reasons = [reason("READONLY_PLAN_NOT_APPLICABLE", "read-only mode does not authorize a repair")];
  } else if (trace.status !== "COMPLETE") {
    status = "UNVERIFIED";
    reasons = [reason("PLAN_TRACE_UNVERIFIED", "trace completeness or event ordering is unverified")];
  } else if (firstMutationIndex === null && unverifiedCommands.length === 0) {
    status = "NOT_APPLICABLE";
    reasons = [reason("NO_OBSERVED_WRITE_ATTEMPT", "complete trace contains no file-change attempt or unverified command")];
  } else if (priorUnverifiedCommandIndices.length > 0) {
    status = "UNVERIFIED";
    reasons = [reason("FIRST_WRITE_ORDER_UNVERIFIED", "an unsupported command may write, so the first write time is unverified")];
  } else if (priorMessageIndices.length > 0) {
    status = "UNVERIFIED";
    reasons = [reason("PLAN_MEANING_UNVERIFIED", "prior visible speech is observed, but its meaning as a repair plan is not automatically verified")];
  } else {
    status = "ABSENT";
    reasons = [reason("NO_VISIBLE_MESSAGE_BEFORE_WRITE", "complete ordered trace has no visible agent speech before the first file-change attempt")];
  }
  return { status, reasons, trace, firstMutationIndex, priorMessageIndices, priorUnverifiedCommandIndices };
}

export function analyzeEvents(events, { shell = commandShellForPlatform(), mode = "fix" } = {}) {
  inspectReadOnlyCommand("", { shell });
  const messageItems = new Map();
  const changeItems = new Map();
  const commandItems = new Map();
  events.forEach((event, index) => {
    if (!isSupportedItemEvent(event)) return;
    const item = event?.item;
    if (!item) return;
    const key = itemKey(item, index);
    if (item.type === "agent_message" && typeof item.text === "string" && item.text.trim()) {
      const previous = messageItems.get(key);
      messageItems.set(key, { index: previous?.index ?? index, text: item.text });
    }
    if (item.type === "file_change") {
      const previous = changeItems.get(key);
      const kinds = [...new Set([...(previous?.fileChangeKinds ?? []), ...fileChangeKinds(item)])];
      changeItems.set(key, {
        eventType: "file_change",
        fileChangeKinds: kinds,
        paths: [...new Set([
          ...(previous?.paths ?? []),
          ...(Array.isArray(item.changes) ? item.changes : []).map((change) => change?.path)
            .filter((value) => typeof value === "string"),
        ])],
        status: typeof item.status === "string" ? item.status : previous?.status ?? null,
        index: previous?.index ?? index,
        itemId: typeof item.id === "string" ? item.id : null,
        reasons: [reason("FILE_CHANGE_EVENT", "Codex emitted an observed file-change tool attempt; this does not establish a lasting byte change")],
      });
    }
    if (item.type === "command_execution") {
      const previous = commandItems.get(key);
      commandItems.set(key, {
        command: typeof item.command === "string" ? item.command : previous?.command ??
          (item.command == null ? null : JSON.stringify(item.command)),
        conflictingCommand: previous?.conflictingCommand || Boolean(previous?.command &&
          typeof item.command === "string" && previous.command !== item.command),
        eventType: "command_execution",
        index: previous?.index ?? index,
        itemId: typeof item.id === "string" ? item.id : null,
      });
    }
  });
  const messages = [...messageItems.values()];
  const fileChanges = [...changeItems.values()].map((item) => ({
    ...item,
    fileChangeKinds: item.fileChangeKinds.length > 0 ? item.fileChangeKinds : ["file_change"],
  }));
  const commands = [...commandItems.values()].map((command) => ({ ...command, command: command.command ?? "" }));
  const readOnlyCommands = [];
  const unverifiedCommands = [];
  for (const command of commands) {
    const boundary = inspectReadOnlyCommand(command.command, { shell });
    if (boundary.allowed && !command.conflictingCommand) readOnlyCommands.push({ ...command, status: "CONFIRMED_READ_ONLY", reasons: [] });
    else unverifiedCommands.push({
      ...command,
      status: "UNVERIFIED",
      reasons: command.conflictingCommand
        ? [reason("TRACE_COMMAND_ID_UNVERIFIED", "one command identity has conflicting command text; read-only behavior is unverified")]
        : [{
          code: "READ_ONLY_COMMAND_BOUNDARY",
          description: "command is outside the supported literal read-only recognizer; mutation is unverified",
          issues: boundary.issues,
        }],
    });
  }
  const mutationAttempts = [...fileChanges].sort((left, right) => left.index - right.index);
  const firstMutationIndex = mutationAttempts[0]?.index ?? null;
  const trace = traceEvidence(events);
  const planEvidence = planEvidenceFor({ mode, trace, firstMutationIndex, messages, unverifiedCommands });
  return {
    commands,
    fileChanges,
    firstMutationIndex,
    messages,
    // Retained for existing consumers: unsupported commands never assert mutation.
    mutatingCommands: [],
    mutationAttempts,
    planBeforeMutation: planEvidence.status,
    planEvidence,
    // This is only the observed speech before an attempt, without lexical judgment.
    planMessages: messages.filter(({ index }) => planEvidence.priorMessageIndices.includes(index)),
    readOnlyCommands,
    trace,
    unverifiedCommands,
  };
}
