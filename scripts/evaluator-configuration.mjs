// Syntax safety only: Codex, not the evaluator, decides semantic support.
export function isReasoningEffortToken(value) {
  // Absolute end assertion: unlike $, this cannot accept a trailing newline.
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]*(?![\s\S])/.test(value);
}

export function createConfigurationProvenance(model, reasoningEffort, source = "direct-call") {
  return {
    requested: { model, reasoningEffort, source },
    observed: { status: "UNAVAILABLE", model: null, reasoningEffort: null, source: null },
    serverExecution: { status: "UNAVAILABLE", model: null, reasoningEffort: null, source: null },
  };
}

function exactKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

export function configurationProvenanceError(value, { model, reasoningEffort }) {
  if (!exactKeys(value, ["requested", "observed", "serverExecution"])) {
    return "configurationProvenance must contain requested, observed, and serverExecution";
  }
  const requested = value.requested;
  if (!exactKeys(requested, ["model", "reasoningEffort", "source"]) ||
      typeof requested.model !== "string" || requested.model.trim().length === 0 ||
      !isReasoningEffortToken(requested.reasoningEffort) ||
      !["cli", "direct-call"].includes(requested.source) ||
      requested.model !== model || requested.reasoningEffort !== reasoningEffort) {
    return "configurationProvenance.requested must match the evaluator input aliases and source";
  }
  for (const name of ["observed", "serverExecution"]) {
    const evidence = value[name];
    if (!exactKeys(evidence, ["status", "model", "reasoningEffort", "source"]) ||
        evidence.status !== "UNAVAILABLE" || evidence.model !== null ||
        evidence.reasoningEffort !== null || evidence.source !== null) {
      return `configurationProvenance.${name} must be UNAVAILABLE with null values; no observation collector is implemented`;
    }
  }
  return null;
}
