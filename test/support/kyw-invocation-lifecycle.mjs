import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";

const WORKFLOW_FIELDS = Object.freeze(["skill", "mode", "routeCapability"]);
const CRITERION_FIELDS = Object.freeze([
  "baseline",
  "selectedTask",
  "selectedTaskDirectory",
  "taskPairDisposition",
  "deliveryDisposition",
  "acceptance",
  "scope",
]);
const BOUND_FIELDS = Object.freeze(["action", "target", "scope", "attempt"]);
const CONTRACT_FIELDS = Object.freeze([
  ...WORKFLOW_FIELDS,
  "baseline",
  "selectedTask",
  "selectedTaskDirectory",
  "taskPairDisposition",
  "deliveryDisposition",
  "acceptance",
  "scope",
  "action",
  "target",
  "attempt",
]);
const RECONFIRMATION_FIELDS = Object.freeze([
  "type",
  "source",
  "trusted",
  "explicit",
  "unambiguous",
  "warningId",
  "factsRevision",
  "accepted",
  "bounds",
  "permanentOwners",
  "taskTestPaths",
  "executionBounds",
]);
const BOUNDED_EXECUTION_FIELDS = Object.freeze([
  "type",
  "warningId",
  "factsRevision",
  "permanentOwners",
  "taskTestPaths",
  "executionBounds",
]);
const ALIGNED_CLAUSE_FIELDS = Object.freeze(["id", "kind", "contract"]);
const CHANGE_CLAUSE_FIELDS = Object.freeze([
  "id",
  "kind",
  "requested",
  "impacts",
  "factsRevision",
]);
const ALIGNED_TURN_FIELDS = Object.freeze(["type", "contract", "clause"]);
const CHANGE_TURN_FIELDS = Object.freeze([
  "type",
  "requested",
  "impacts",
  "factsRevision",
]);
const ACTIVATION_TURN_FIELDS = Object.freeze([
  "type",
  "recognized",
  "routeKind",
  "contract",
]);
const PERMANENT_OWNER_PATHS = Object.freeze([
  "README.md",
  "AGENTS.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
]);
const SKILL_NAMES = new Set([
  "kyw-grilling",
  "kyw-init",
  "kyw-task",
  "kyw-impl",
  "kyw-audit",
]);
const TASK_PAIR_DISPOSITIONS = new Set(["NONE", "MUTABLE", "IMMUTABLE"]);
const DELIVERY_DISPOSITIONS = new Set(["NONE", "RESUMABLE", "SATISFIED"]);
const IMPLEMENTATION_ACTION_DISPOSITIONS = Object.freeze({
  implement: Object.freeze({ taskPair: "MUTABLE", delivery: "NONE" }),
  resume: Object.freeze({ taskPair: "MUTABLE", delivery: "NONE" }),
  deliver: Object.freeze({ taskPair: "MUTABLE", delivery: "RESUMABLE" }),
  report: Object.freeze({ taskPair: "IMMUTABLE", delivery: "SATISFIED" }),
});

function snapshot(value) {
  return structuredClone(value);
}

function same(left, right) {
  return isDeepStrictEqual(left, right);
}

function changedFields(established, requested) {
  return [
    ...WORKFLOW_FIELDS,
    ...CRITERION_FIELDS,
    ...BOUND_FIELDS.filter((field) => field !== "scope"),
  ].filter((field) => !same(established[field], requested[field]));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolvedRecord(value, fields) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    fields.every((field) => nonEmptyString(value[field]))
  );
}

function recordShapeValid(value, required, optional = []) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((field) => Object.hasOwn(value, field)) &&
    Object.keys(value).every((field) => allowed.has(field))
  );
}

function validStringArray(value, { allowEmpty = false } = {}) {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    [...value.keys()].every(
      (index) => Object.hasOwn(value, index) && nonEmptyString(value[index]),
    ) &&
    new Set(value).size === value.length
  );
}

function completeTaskTestPaths(paths) {
  if (!validStringArray(paths, { allowEmpty: true })) return false;
  const membersByDirectory = new Map();
  for (const path of paths) {
    const match = /^(docs\/tasks\/\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*)\/(TASK|TEST)\.md$/.exec(
      path,
    );
    if (!match) return false;
    const members = membersByDirectory.get(match[1]) ?? new Set();
    members.add(match[2]);
    membersByDirectory.set(match[1], members);
  }
  return [...membersByDirectory.values()].every(
    (members) => members.has("TASK") && members.has("TEST"),
  );
}

function pathsMatchSelectedTask(paths, selectedTaskDirectory) {
  return same(paths, [
    `${selectedTaskDirectory}/TASK.md`,
    `${selectedTaskDirectory}/TEST.md`,
  ]);
}

function validImpactSet(value, kind) {
  if (
    !recordShapeValid(value, ["summary", "paths"]) ||
    !nonEmptyString(value.summary) ||
    !Array.isArray(value.paths)
  ) {
    return false;
  }
  if (kind === "taskTest") return completeTaskTestPaths(value.paths);
  return (
    validStringArray(value.paths, { allowEmpty: true }) &&
    value.paths.every((path) =>
      PERMANENT_OWNER_PATHS.includes(path),
    )
  );
}

function validImpacts(value) {
  return (
    recordShapeValid(value, [
      "implementation",
      "taskTest",
      "permanentDocuments",
      "verification",
      "delivery",
    ]) &&
    resolvedRecord(value, ["implementation", "verification", "delivery"]) &&
    validImpactSet(value.taskTest, "taskTest") &&
    validImpactSet(value.permanentDocuments, "permanentDocuments")
  );
}

function implActionDispositionValid(value) {
  const expected = IMPLEMENTATION_ACTION_DISPOSITIONS[value.action];
  return (
    !expected ||
    (value.taskPairDisposition === expected.taskPair &&
      value.deliveryDisposition === expected.delivery)
  );
}

function contractApplicabilityValid(value) {
  const hasTask = value.selectedTask !== null;
  const hasTaskDirectory = value.selectedTaskDirectory !== null;
  const hasAcceptance = value.acceptance !== null;
  if (hasTask !== hasTaskDirectory || hasTask !== hasAcceptance) return false;
  if (!TASK_PAIR_DISPOSITIONS.has(value.taskPairDisposition)) return false;
  if (!DELIVERY_DISPOSITIONS.has(value.deliveryDisposition)) return false;
  if ((value.taskPairDisposition === "NONE") !== !hasTask) return false;
  if (!hasTask && value.deliveryDisposition !== "NONE") return false;
  if (hasTask && !/^\d{4}$/.test(value.selectedTask)) return false;
  if (hasTask) {
    const match = /^(docs\/tasks\/(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(
      value.selectedTaskDirectory,
    );
    if (!match || match[2] !== value.selectedTask) return false;
  }
  if (
    value.skill === "kyw-impl" &&
    !implActionDispositionValid(value)
  ) {
    return false;
  }
  if (value.skill !== "kyw-impl" && value.deliveryDisposition !== "NONE") {
    return false;
  }
  if (["kyw-impl", "kyw-audit"].includes(value.skill)) return hasTask;
  if (["kyw-grilling", "kyw-init"].includes(value.skill)) return !hasTask;
  return value.skill === "kyw-task";
}

function completeContract(value) {
  return (
    recordShapeValid(value, CONTRACT_FIELDS) &&
    resolvedRecord(value, [
      ...WORKFLOW_FIELDS,
      "baseline",
      "taskPairDisposition",
      "deliveryDisposition",
      "scope",
      "action",
      "target",
      "attempt",
    ]) &&
    SKILL_NAMES.has(value.skill) &&
    (value.selectedTask === null ||
      (typeof value.selectedTask === "string" && value.selectedTask.length > 0)) &&
    (value.acceptance === null || validStringArray(value.acceptance)) &&
    contractApplicabilityValid(value)
  );
}

function validOrdinaryOutcome(value) {
  return (
    recordShapeValid(value, [
      "action",
      "target",
      "scope",
      "attempt",
      "permanentOwners",
      "taskTestPaths",
    ]) &&
    resolvedRecord(value, ["action", "target", "scope", "attempt"]) &&
    validStringArray(value.permanentOwners, { allowEmpty: true }) &&
    value.permanentOwners.every((path) => PERMANENT_OWNER_PATHS.includes(path)) &&
    Array.isArray(value.taskTestPaths) &&
    value.taskTestPaths.length === 0
  );
}

function validActivationContract(value, routeKind) {
  if (!completeContract(value)) return false;
  if (routeKind === "MANAGED_ALIAS" && value.skill !== "kyw-impl") return false;
  const hasTask = value.selectedTask !== null;
  const hasAcceptance = value.acceptance !== null;
  if (hasTask !== hasAcceptance) return false;
  if (value.skill === "kyw-grilling") {
    return (
      routeKind === "EXPLICIT_SKILL" &&
      value.routeCapability === "grilling-exact" &&
      value.mode === "decision-interview" &&
      value.action === "interview" &&
      value.taskPairDisposition === "NONE" &&
      !hasTask
    );
  }
  if (value.skill === "kyw-init") {
    return (
      routeKind === "EXPLICIT_SKILL" &&
      value.routeCapability === "init-exact" &&
      value.mode === "initialization" &&
      value.action === "initialize" &&
      value.taskPairDisposition === "NONE" &&
      !hasTask
    );
  }
  if (value.skill === "kyw-task") {
    return (
      routeKind === "EXPLICIT_SKILL" &&
      value.routeCapability === (hasTask ? "task-draft-id" : "task-goal") &&
      value.mode === "authoring" &&
      value.action === "author" &&
      value.taskPairDisposition === (hasTask ? "MUTABLE" : "NONE")
    );
  }
  if (value.skill === "kyw-impl") {
    return (
      (routeKind === "EXPLICIT_SKILL"
        ? value.routeCapability === "impl-exact-task"
        : [
            "impl-managed-task-id",
            "impl-managed-auto",
            "impl-managed-continuous",
          ].includes(value.routeCapability)) &&
      value.mode === "implementation" &&
      Object.hasOwn(IMPLEMENTATION_ACTION_DISPOSITIONS, value.action) &&
      implActionDispositionValid(value) &&
      hasTask
    );
  }
  return (
    value.skill === "kyw-audit" &&
    routeKind === "EXPLICIT_SKILL" &&
    ((value.mode === "read-only" && value.action === "audit") ||
      (value.mode === "repair" && value.action === "repair")) &&
    (value.mode !== "repair" || value.taskPairDisposition === "MUTABLE") &&
    value.routeCapability ===
      (value.mode === "read-only" ? "audit-read-only" : "audit-repair") &&
    hasTask
  );
}

function permitsRepositoryMutation(contract) {
  return !(
    contract.skill === "kyw-grilling" ||
    (contract.skill === "kyw-impl" && contract.action === "report") ||
    (contract.skill === "kyw-audit" && contract.mode === "read-only")
  );
}

function requiresNativeWriteConfirmation(contract) {
  return (
    permitsRepositoryMutation(contract) &&
    (contract.skill === "kyw-init" ||
      (contract.skill === "kyw-task" &&
        contract.routeCapability === "task-draft-id"))
  );
}

function actionFitsRouteLockedProfile(contract) {
  if (contract.skill === "kyw-impl") {
    return (
      contract.mode === "implementation" &&
      implActionDispositionValid(contract) &&
      !["audit", "repair", "interview", "initialize", "author"].includes(
        contract.action,
      )
    );
  }
  if (contract.skill === "kyw-grilling") {
    return contract.mode === "decision-interview" && contract.action === "interview";
  }
  if (contract.skill === "kyw-init") {
    return contract.mode === "initialization" && contract.action === "initialize";
  }
  if (contract.skill === "kyw-task") {
    return contract.mode === "authoring" && contract.action === "author";
  }
  return (
    contract.skill === "kyw-audit" &&
    ((contract.mode === "read-only" && contract.action === "audit") ||
      (contract.mode === "repair" && contract.action === "repair"))
  );
}

function requiresExactRoute(active, requested) {
  return (
    WORKFLOW_FIELDS.some((field) => !same(active[field], requested[field])) ||
    (["kyw-task", "kyw-impl", "kyw-audit"].includes(active.skill) &&
      (!same(active.selectedTask, requested.selectedTask) ||
        !same(active.selectedTaskDirectory, requested.selectedTaskDirectory) ||
        !same(active.taskPairDisposition, requested.taskPairDisposition) ||
        !same(active.deliveryDisposition, requested.deliveryDisposition))) ||
    (active.taskPairDisposition === "IMMUTABLE" &&
      (active.skill === "kyw-impl" || permitsRepositoryMutation(requested)) &&
      CRITERION_FIELDS.some((field) => !same(active[field], requested[field]))) ||
    (active.skill === "kyw-impl" &&
      active.action === "report" &&
      requested.action !== "report") ||
    !actionFitsRouteLockedProfile(requested)
  );
}

function warningFor({ active, requested, impacts, factsRevision, turnIndex, sequence }) {
  const changes = changedFields(active, requested);
  assert.ok(changes.length > 0, "a warning requires a material contract change");
  assert.ok(validImpacts(impacts), "all warning impacts must be concrete");
  assert.ok(completeContract(requested), "warning requested contract must be complete");
  assert.ok(
    nonEmptyString(factsRevision),
    "warning facts revision must be concrete",
  );
  if (
    requested.selectedTask === null ||
    requested.taskPairDisposition === "IMMUTABLE"
  ) {
    assert.equal(
      impacts.taskTest.paths.length,
      0,
      "taskless or immutable warning cannot claim Task/Test synchronization",
    );
  } else if (impacts.taskTest.paths.length > 0) {
    assert.ok(
      pathsMatchSelectedTask(
        impacts.taskTest.paths,
        requested.selectedTaskDirectory,
      ),
      "Task/Test impacts must match the selected Task",
    );
  }
  if (requested.skill === "kyw-task") {
    assert.equal(
      impacts.permanentDocuments.paths.length,
      0,
      "kyw-task warning cannot claim permanent-owner synchronization",
    );
  }
  if (
    permitsRepositoryMutation(requested) &&
    requested.selectedTask !== null &&
    requested.taskPairDisposition === "MUTABLE" &&
    changes.some((field) => CRITERION_FIELDS.includes(field))
  ) {
    assert.ok(
      impacts.taskTest.paths.length > 0,
      "Task-bearing criterion change requires its selected Task/Test pair",
    );
  }
  if (!permitsRepositoryMutation(requested)) {
    assert.equal(
      impacts.taskTest.paths.length + impacts.permanentDocuments.paths.length,
      0,
      "read-only warning cannot claim repository synchronization",
    );
  }
  return Object.freeze({
    id: `warning-${turnIndex}-${sequence}`,
    originTurn: turnIndex,
    changes: Object.freeze(changes),
    controllingCriterion: Object.freeze(
      Object.fromEntries(changes.map((field) => [field, snapshot(active[field])])),
    ),
    requestedCriterion: Object.freeze(
      Object.fromEntries(changes.map((field) => [field, snapshot(requested[field])])),
    ),
    impacts: Object.freeze(snapshot(impacts)),
    bounds: Object.freeze(
      Object.fromEntries(BOUND_FIELDS.map((field) => [field, snapshot(requested[field])])),
    ),
    requested: Object.freeze(snapshot(requested)),
    factsRevision,
  });
}

function combinedClauseFailure(contract, clauses) {
  if (!Array.isArray(clauses)) return "clauses must be an array";
  let sawChange = false;
  const clauseIds = new Set();
  for (const clause of clauses) {
    if (clause === null || typeof clause !== "object" || Array.isArray(clause)) {
      return "clause must be a classified record";
    }
    if (!nonEmptyString(clause.id) || clauseIds.has(clause.id)) {
      return "clause identity must be concrete and unique";
    }
    clauseIds.add(clause.id);
    if (clause.kind === "ALIGNED") {
      const nativeWriteSkill = requiresNativeWriteConfirmation(
        clause.contract ?? {},
      );
      if (
        !recordShapeValid(
          clause,
          nativeWriteSkill
            ? [...ALIGNED_CLAUSE_FIELDS, "operation"]
            : ALIGNED_CLAUSE_FIELDS,
          nativeWriteSkill ? ["nativeConfirmation"] : [],
        )
      ) {
        return "aligned clause has fields outside its closed shape";
      }
      if (
        nativeWriteSkill &&
        (!["decision", "write"].includes(clause.operation) ||
          (Object.hasOwn(clause, "nativeConfirmation") &&
            typeof clause.nativeConfirmation !== "boolean"))
      ) {
        return "aligned clause has an invalid native operation or confirmation";
      }
      if (!completeContract(clause.contract) || !same(contract, clause.contract)) {
        return "aligned clause must match the activation contract";
      }
      continue;
    }
    if (clause.kind === "CHANGE") {
      if (!recordShapeValid(clause, CHANGE_CLAUSE_FIELDS)) {
        return "changing clause has fields outside its closed shape";
      }
      if (sawChange) return "only one changing clause is permitted";
      try {
        warningFor({
          active: contract,
          requested: clause.requested,
          impacts: clause.impacts,
          factsRevision: clause.factsRevision,
          turnIndex: 0,
          sequence: 0,
        });
      } catch (error) {
        return error instanceof Error ? error.message : "invalid changing clause";
      }
      sawChange = true;
      continue;
    }
    return `closed clause kind rejected: ${clause.kind ?? "<missing>"}`;
  }
  return undefined;
}

export function runSkillInvocationScenario(turns) {
  let workflow = "INACTIVE";
  let state = "INACTIVE";
  let activeSubstate = "NONE";
  let pendingDisposition = "NONE";
  let completedTerminal = false;
  let active;
  let pending;
  let bounded;
  let warningSequence = 0;
  let routeCount = 0;
  let dispatchCount = 0;
  const skillChainCount = 0;
  let skillChainAttempts = 0;
  let duplicateConfirmations = 0;
  const events = [];
  const mutations = [];
  const ordinaryOutcomeMutations = [];
  const warnings = [];
  const visitedStates = [state];

  const enterState = (nextState) => {
    state = nextState;
    if (visitedStates.at(-1) !== nextState) visitedStates.push(nextState);
  };

  const recordMutation = (event) => {
    events.push(event);
    mutations.push(event);
  };

  const expire = (turnIndex, reason) => {
    if (pending || bounded) {
      pendingDisposition = "EXPIRED";
    }
    if (pending) {
      events.push({ type: "WARNING_EXPIRED", turn: turnIndex, reason });
    }
    if (bounded) {
      events.push({ type: "BOUNDED_APPROVAL_EXPIRED", turn: turnIndex, reason });
    }
    pending = undefined;
    bounded = undefined;
    workflow = "TERMINAL";
    activeSubstate = "NONE";
    active = undefined;
    enterState("CANCELLED_OR_EXPIRED");
  };

  const issueWarning = (turn, turnIndex) => {
    if (
      pending &&
      completeContract(turn.requested) &&
      requiresExactRoute(active, turn.requested)
    ) {
      events.push({
        type: "EXACT_ROUTE_REQUIRED",
        turn: turnIndex,
        warningId: pending.id,
      });
      expire(turnIndex, "pending route identity changed");
      return;
    }
    if (pending) {
      pendingDisposition = "REPLACED";
      events.push({
        type: "WARNING_REPLACED",
        turn: turnIndex,
        warningId: pending.id,
      });
    }
    const warning = warningFor({
      active,
      requested: turn.requested,
      impacts: turn.impacts,
      factsRevision: turn.factsRevision,
      turnIndex,
      sequence: ++warningSequence,
    });
    pending = warning;
    warnings.push(warning);
    activeSubstate = "CHANGE_PENDING";
    enterState("CHANGE_PENDING");
    events.push({ type: "WARNING_ISSUED", turn: turnIndex, warningId: warning.id });
    if (turn.selfConfirmation) {
      events.push({
        type: "SELF_CONFIRMATION_REJECTED",
        turn: turnIndex,
        warningId: warning.id,
      });
    }
  };

  const continueAligned = (
    contract,
    turnIndex,
    clause,
    { operation, nativeConfirmation, activationOrigin = false } = {},
  ) => {
    if (!same(active, contract)) {
      throw new Error("an aligned turn must exactly match the active contract");
    }
    const event = {
      type: "ALIGNED_CONTINUE",
      turn: turnIndex,
      clause,
      bounds: Object.freeze(
        Object.fromEntries(BOUND_FIELDS.map((field) => [field, snapshot(contract[field])])),
      ),
    };
    if (requiresNativeWriteConfirmation(contract)) {
      assert.ok(
        ["decision", "write"].includes(operation),
        "init/task aligned turns must classify decision versus write",
      );
      if (operation === "decision") {
        events.push({ ...event, repositoryMutation: "NONE" });
        return;
      }
      if (activationOrigin || nativeConfirmation !== true) {
        events.push({
          type: "NATIVE_CONFIRMATION_REQUIRED",
          turn: turnIndex,
          clause,
          repositoryMutation: "NONE",
        });
        return;
      }
    }
    if (permitsRepositoryMutation(contract)) recordMutation(event);
    else events.push(event);
  };

  const executeBounded = (turn, turnIndex, { deferred = false } = {}) => {
    assert.ok(bounded, "bounded execution requires an exact bound approval");
    if (
      (deferred &&
        (!recordShapeValid(
          turn,
          BOUNDED_EXECUTION_FIELDS,
          requiresNativeWriteConfirmation(bounded.requested)
            ? ["nativeConfirmation"]
            : [],
        ) ||
          (Object.hasOwn(turn, "nativeConfirmation") &&
            typeof turn.nativeConfirmation !== "boolean"))) ||
      turn.warningId !== bounded.id ||
      turn.factsRevision !== bounded.factsRevision
    ) {
      expire(turnIndex, "invalid or stale bounded execution");
      return;
    }
    const requiredPermanentOwners = bounded.impacts.permanentDocuments.paths;
    const requiredTaskTestPaths = bounded.impacts.taskTest.paths;
    if (
      !Array.isArray(turn.permanentOwners) ||
      !Array.isArray(turn.taskTestPaths) ||
      !same(turn.permanentOwners, requiredPermanentOwners) ||
      !same(turn.taskTestPaths, requiredTaskTestPaths) ||
      !same(turn.executionBounds, bounded.bounds)
    ) {
      expire(turnIndex, "missing synchronization or changed execution bounds");
      return;
    }
    if (
      requiresNativeWriteConfirmation(bounded.requested) &&
      turn.nativeConfirmation !== true
    ) {
      events.push({
        type: "NATIVE_CONFIRMATION_REQUIRED",
        turn: turnIndex,
        warningId: bounded.id,
        repositoryMutation: "NONE",
      });
      return;
    }
    for (const owner of requiredPermanentOwners) {
      recordMutation({ type: "SYNC_PERMANENT_OWNER", turn: turnIndex, owner });
    }
    for (const path of requiredTaskTestPaths) {
      recordMutation({
        type: path.endsWith("/TASK.md") ? "SYNC_TASK" : "SYNC_TEST",
        turn: turnIndex,
        path,
      });
    }
    const boundedAction = {
      type: "BOUNDED_ACTION",
      turn: turnIndex,
      bounds: bounded.bounds,
      repositoryMutation: permitsRepositoryMutation(bounded.requested)
        ? "BOUNDED"
        : "NONE",
    };
    if (permitsRepositoryMutation(bounded.requested)) recordMutation(boundedAction);
    else events.push(boundedAction);
    bounded = undefined;
    pendingDisposition = "NONE";
    workflow = "INACTIVE";
    completedTerminal = true;
    activeSubstate = "NONE";
    active = undefined;
    enterState("INACTIVE");
    events.push({ type: "TERMINAL", turn: turnIndex, reason: "BOUNDED_ACTION_COMPLETED" });
  };

  for (const [turnIndex, turn] of turns.entries()) {
    if (state === "CANCELLED_OR_EXPIRED") {
      workflow = "INACTIVE";
      completedTerminal = false;
      pendingDisposition = "NONE";
      activeSubstate = "NONE";
      active = undefined;
      pending = undefined;
      bounded = undefined;
      enterState("INACTIVE");
      events.push({ type: "POST_TERMINAL_INACTIVE", turn: turnIndex });
    }

    if (completedTerminal) {
      completedTerminal = false;
      pendingDisposition = "NONE";
      activeSubstate = "NONE";
      active = undefined;
      pending = undefined;
      bounded = undefined;
      workflow = "INACTIVE";
      enterState("INACTIVE");
      events.push({ type: "POST_TERMINAL_INACTIVE", turn: turnIndex });
    }

    if (state === "RECONFIRMED_BOUNDED") {
      if (turn.type === "execute-bounded") {
        executeBounded(turn, turnIndex, { deferred: true });
        continue;
      }
      if (["cancel", "decline", "stop"].includes(turn.type)) {
        pendingDisposition = "CANCELLED";
        bounded = undefined;
        workflow = "TERMINAL";
        activeSubstate = "NONE";
        active = undefined;
        enterState("CANCELLED_OR_EXPIRED");
        events.push({ type: "BOUNDED_APPROVAL_CANCELLED", turn: turnIndex });
        continue;
      }
      expire(turnIndex, `bounded execution interrupted by ${turn.type ?? "unknown"}`);
      continue;
    }

    if (turn.type === "ordinary") {
      if (workflow === "INACTIVE") {
        events.push({ type: "ORDINARY_HANDLING", turn: turnIndex });
        if (Object.hasOwn(turn, "outcome")) {
          assert.ok(
            validOrdinaryOutcome(turn.outcome),
            "ordinary outcome must stay bounded and outside Task routing",
          );
          for (const owner of turn.outcome.permanentOwners) {
            ordinaryOutcomeMutations.push({
              type: "SYNC_PERMANENT_OWNER",
              turn: turnIndex,
              owner,
            });
          }
          ordinaryOutcomeMutations.push({
            type: "ORDINARY_ACTION",
            turn: turnIndex,
            bounds: Object.freeze(
              Object.fromEntries(
                BOUND_FIELDS.map((field) => [field, snapshot(turn.outcome[field])]),
              ),
            ),
          });
          events.push({ type: "ORDINARY_OUTCOME_EXECUTED", turn: turnIndex });
        }
      } else if (pending) {
        expire(turnIndex, "intervening turn");
      } else if (Object.hasOwn(turn, "outcome")) {
        expire(turnIndex, "active ordinary outcome requires change classification");
      } else {
        events.push({ type: "ACTIVE_NONMUTATING_TURN", turn: turnIndex });
      }
      continue;
    }

    if (turn.type === "activate") {
      if (workflow === "ACTIVE") {
        skillChainAttempts += 1;
        events.push({ type: "SKILL_CHAIN_REJECTED", turn: turnIndex });
        expire(turnIndex, "intervening Skill route");
        continue;
      }
      if (
        !recordShapeValid(turn, ACTIVATION_TURN_FIELDS, [
          "clauses",
          "dispatch",
          "selfConfirmation",
        ]) ||
        (Object.hasOwn(turn, "clauses") && !Array.isArray(turn.clauses)) ||
        (Object.hasOwn(turn, "dispatch") && typeof turn.dispatch !== "boolean") ||
        (Object.hasOwn(turn, "selfConfirmation") &&
          typeof turn.selfConfirmation !== "boolean")
      ) {
        if (turn.recognized === true) routeCount += 1;
        pendingDisposition = "EXPIRED";
        workflow = "TERMINAL";
        activeSubstate = "NONE";
        active = undefined;
        pending = undefined;
        bounded = undefined;
        enterState("CANCELLED_OR_EXPIRED");
        events.push({
          type: "ACTIVATION_PREFLIGHT_REJECTED",
          turn: turnIndex,
          reason: "activation record has fields outside its closed shape",
        });
        continue;
      }
      assert.equal(turn.recognized, true, "activation must come from a recognized exact route");
      assert.ok(
        ["EXPLICIT_SKILL", "MANAGED_ALIAS"].includes(turn.routeKind),
        "activation route must be explicit or managed-exact",
      );
      assert.ok(
        validActivationContract(turn.contract, turn.routeKind),
        "activation contract and route must be compatible",
      );
      const clauses = turn.clauses ?? [];
      const clauseFailure = combinedClauseFailure(turn.contract, clauses);
      if (clauseFailure) {
        routeCount += 1;
        pendingDisposition = "EXPIRED";
        workflow = "TERMINAL";
        activeSubstate = "NONE";
        enterState("CANCELLED_OR_EXPIRED");
        events.push({
          type: "CLAUSE_PREFLIGHT_REJECTED",
          turn: turnIndex,
          reason: clauseFailure,
        });
        continue;
      }
      workflow = "ACTIVE";
      completedTerminal = false;
      activeSubstate = "ALIGNED";
      pendingDisposition = "NONE";
      active = snapshot(turn.contract);
      pending = undefined;
      bounded = undefined;
      enterState("ACTIVE_ALIGNED");
      routeCount += 1;
      events.push({ type: "ACTIVATED", turn: turnIndex, routeKind: turn.routeKind });
      if (turn.dispatch) {
        dispatchCount += 1;
        events.push({
          type: "DISPATCH_PREFLIGHTED",
          turn: turnIndex,
          repositoryMutation: "NONE",
        });
      }
      for (const clause of clauses.filter(({ kind }) => kind === "ALIGNED")) {
        continueAligned(clause.contract, turnIndex, clause.id, {
          ...clause,
          activationOrigin: true,
        });
      }
      const changedClause = clauses.find(({ kind }) => kind === "CHANGE");
      if (changedClause) {
        issueWarning(
          { ...changedClause, selfConfirmation: turn.selfConfirmation },
          turnIndex,
        );
      }
      continue;
    }

    if (workflow !== "ACTIVE") {
      events.push({ type: "INACTIVE_NO_GUARDRAIL", turn: turnIndex });
      continue;
    }

    if (turn.type === "aligned") {
      if (pending) {
        expire(turnIndex, "intervening aligned turn");
        continue;
      }
      const nativeWriteSkill = requiresNativeWriteConfirmation(turn.contract ?? {});
      if (
        !recordShapeValid(
          turn,
          nativeWriteSkill
            ? [...ALIGNED_TURN_FIELDS, "operation"]
            : ALIGNED_TURN_FIELDS,
          nativeWriteSkill ? ["nativeConfirmation"] : [],
        ) ||
        !nonEmptyString(turn.clause) ||
        !completeContract(turn.contract) ||
        !same(active, turn.contract) ||
        (nativeWriteSkill &&
          (!["decision", "write"].includes(turn.operation) ||
            (Object.hasOwn(turn, "nativeConfirmation") &&
              typeof turn.nativeConfirmation !== "boolean")))
      ) {
        expire(turnIndex, "invalid or widened aligned turn");
        continue;
      }
      continueAligned(turn.contract, turnIndex, turn.clause, turn);
      continue;
    }

    if (turn.type === "change") {
      if (
        !recordShapeValid(turn, CHANGE_TURN_FIELDS, ["selfConfirmation"]) ||
        (Object.hasOwn(turn, "selfConfirmation") &&
          typeof turn.selfConfirmation !== "boolean")
      ) {
        expire(turnIndex, "invalid or widened change turn");
        continue;
      }
      issueWarning(turn, turnIndex);
      continue;
    }

    if (["cancel", "decline", "stop"].includes(turn.type)) {
      if (pending) {
        events.push({
          type: "WARNING_CANCELLED",
          turn: turnIndex,
          warningId: pending.id,
        });
      }
      pending = undefined;
      pendingDisposition = "CANCELLED";
      workflow = "INACTIVE";
      completedTerminal = true;
      activeSubstate = "NONE";
      active = undefined;
      enterState("CANCELLED_OR_EXPIRED");
      continue;
    }

    if (turn.type === "facts-changed" || turn.type === "intervening") {
      expire(turnIndex, turn.type);
      continue;
    }

    if (turn.type === "reconfirm") {
      const reconfirmationOptionalFields = [
        "additionalActions",
        "additionalChoices",
        "deferExecution",
        ...(pending && requiresNativeWriteConfirmation(pending.requested)
          ? ["nativeConfirmation"]
          : []),
      ];
      const exactApproval =
        pending &&
        recordShapeValid(turn, RECONFIRMATION_FIELDS, reconfirmationOptionalFields) &&
        turn.source === "current-user" &&
        turn.trusted === true &&
        turn.explicit === true &&
        turn.unambiguous === true &&
        turnIndex === pending.originTurn + 1 &&
        turn.warningId === pending.id &&
        turn.factsRevision === pending.factsRevision &&
        same(turn.accepted, pending.requested) &&
        same(turn.bounds, pending.bounds) &&
        Array.isArray(turn.permanentOwners) &&
        Array.isArray(turn.taskTestPaths) &&
        same(turn.permanentOwners, pending.impacts.permanentDocuments.paths) &&
        same(turn.taskTestPaths, pending.impacts.taskTest.paths) &&
        same(turn.executionBounds, pending.bounds) &&
        (!Object.hasOwn(turn, "additionalActions") ||
          (Array.isArray(turn.additionalActions) && turn.additionalActions.length === 0)) &&
        (!Object.hasOwn(turn, "additionalChoices") ||
          (Array.isArray(turn.additionalChoices) && turn.additionalChoices.length === 0)) &&
        (!Object.hasOwn(turn, "deferExecution") || turn.deferExecution === true) &&
        (!Object.hasOwn(turn, "nativeConfirmation") ||
          typeof turn.nativeConfirmation === "boolean");
      if (!exactApproval) {
        expire(turnIndex, "invalid reconfirmation");
        continue;
      }

      if (requiresExactRoute(active, pending.requested)) {
        events.push({
          type: "EXACT_ROUTE_REQUIRED",
          turn: turnIndex,
          warningId: pending.id,
        });
        expire(turnIndex, "route-locked change requires its own exact route");
        continue;
      }

      events.push({ type: "EXACT_RECONFIRMED", turn: turnIndex, warningId: pending.id });
      bounded = pending;
      pending = undefined;
      activeSubstate = "RECONFIRMED_BOUNDED";
      enterState("RECONFIRMED_BOUNDED");
      if (turn.deferExecution === true) {
        events.push({
          type: "BOUNDED_EXECUTION_DEFERRED",
          turn: turnIndex,
          warningId: bounded.id,
        });
        continue;
      }
      executeBounded(turn, turnIndex);
      continue;
    }

    if (turn.type === "duplicate-confirmation") {
      duplicateConfirmations += 1;
      if (pending) expire(turnIndex, "intervening duplicate confirmation");
      continue;
    }

    if (turn.type === "complete") {
      if (pending) {
        expire(turnIndex, "completion cannot bypass a pending warning");
        continue;
      }
      pending = undefined;
      bounded = undefined;
      workflow = "INACTIVE";
      completedTerminal = true;
      activeSubstate = "NONE";
      active = undefined;
      enterState("INACTIVE");
      events.push({ type: "TERMINAL", turn: turnIndex, reason: "COMPLETED" });
      continue;
    }

    if (pending) {
      expire(turnIndex, "unclassified intervening turn");
      continue;
    }
    assert.fail(`active turn type must be classified: ${turn.type ?? "<missing>"}`);
  }

  return Object.freeze({
    workflow,
    state,
    activeSubstate,
    pendingDisposition,
    routeCount,
    dispatchCount,
    skillChainCount,
    skillChainAttempts,
    duplicateConfirmations,
    active: active ? Object.freeze(snapshot(active)) : undefined,
    pendingWarning: pending,
    boundedApproval: bounded,
    warnings: Object.freeze(warnings),
    visitedStates: Object.freeze(visitedStates),
    events: Object.freeze(events),
    mutations: Object.freeze(mutations),
    ordinaryOutcomeMutations: Object.freeze(ordinaryOutcomeMutations),
  });
}
