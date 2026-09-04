import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE,
  PERMANENT_DOCUMENT_POLICY,
} from "../scripts/lib/validate-foundation.mjs";
import {
  evaluateTaskExecutionPreflight,
  parseTaskInvocation,
} from "../src/core/task-artifacts.mjs";
import { runSkillInvocationScenario } from "./support/kyw-invocation-lifecycle.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const REPRESENTATIVE_BUDGET_BYTES = 36_864;
const REPRESENTATIVE_TOKEN_BUDGET = 9_216;
const REPRESENTATIVE_TARGET_BYTES = 32_768;
const REPRESENTATIVE_TARGET_TOKENS = 8_192;
const REQUIRED_BYTE_HEADROOM = 4_096;
const REQUIRED_TOKEN_HEADROOM = 1_024;
const BASELINE_PROMPT_BYTES = 5_839;
const REPRESENTATIVE_INSTRUCTION_PATHS = Object.freeze([
  "templates/project/AGENTS.md",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-impl/SKILL.md",
  "skills/kyw-impl/references/execution.md",
]);
const DELIVERY_INSTRUCTION_PATHS = Object.freeze([
  "templates/project/AGENTS.md",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-deliver/SKILL.md",
  "skills/kyw-deliver/references/delivery.md",
]);
const PERMANENT_INDEX_PATHS = Object.freeze([
  "README.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
]);

async function read(relativePath) {
  return readFile(join(REPOSITORY_ROOT, relativePath), "utf8");
}

const ACTIVE_SKILL_CONTRACT = Object.freeze({
  skill: "kyw-impl",
  mode: "implementation",
  routeCapability: "impl-exact-task",
  baseline: "main@9431dbf",
  selectedTask: "0083",
  selectedTaskDirectory:
    "docs/tasks/0083-scope-kyw-skill-guardrails-to-active-in-60ce0c5c",
  taskPairDisposition: "MUTABLE",
  deliveryDisposition: "NONE",
  acceptance: Object.freeze(["AC-01", "AC-02", "AC-03", "AC-04"]),
  scope: "activation-scoped kyw guardrails",
  action: "implement",
  target: "Task 0083 repository outcome",
  attempt: "task-0083-implementation-1",
});

const CHANGE_IMPACTS = Object.freeze({
  implementation: "implementation must follow the requested criterion",
  taskTest: Object.freeze({
    summary: "the active mutable Task/Test pair must synchronize",
    paths: Object.freeze([
      "docs/tasks/0083-scope-kyw-skill-guardrails-to-active-in-60ce0c5c/TASK.md",
      "docs/tasks/0083-scope-kyw-skill-guardrails-to-active-in-60ce0c5c/TEST.md",
    ]),
  }),
  permanentDocuments: Object.freeze({
    summary: "SPEC and ARCHITECTURE must synchronize",
    paths: Object.freeze(["docs/SPEC.md", "docs/ARCHITECTURE.md"]),
  }),
  verification: "state-transition and regression coverage must change",
  delivery: "the delivered exact-SHA scope would change",
});

const NO_SYNC_IMPACTS = Object.freeze({
  implementation: "the warned action changes within the current workflow",
  taskTest: Object.freeze({ summary: "no Task/Test pair is mutable", paths: [] }),
  permanentDocuments: Object.freeze({
    summary: "no permanent owner changes",
    paths: [],
  }),
  verification: "the bounded action still needs verification",
  delivery: "no delivery mutation applies",
});

function requestedContract(overrides = {}) {
  return {
    ...ACTIVE_SKILL_CONTRACT,
    acceptance: Array.isArray(ACTIVE_SKILL_CONTRACT.acceptance)
      ? [...ACTIVE_SKILL_CONTRACT.acceptance]
      : ACTIVE_SKILL_CONTRACT.acceptance,
    ...overrides,
  };
}

function contractForSkill(skill) {
  const tasklessProfiles = {
    "kyw-grilling": {
      mode: "decision-interview",
      routeCapability: "grilling-exact",
      action: "interview",
    },
    "kyw-init": {
      mode: "initialization",
      routeCapability: "init-exact",
      action: "initialize",
    },
    "kyw-task": {
      mode: "authoring",
      routeCapability: "task-goal",
      action: "author",
    },
  };
  if (tasklessProfiles[skill]) {
    return requestedContract({
      skill,
      ...tasklessProfiles[skill],
      selectedTask: null,
      selectedTaskDirectory: null,
      taskPairDisposition: "NONE",
      acceptance: null,
      target: `${skill} outcome`,
    });
  }
  if (skill === "kyw-deliver") {
    return requestedContract({
      skill,
      mode: "delivery",
      routeCapability: "deliver-exact-task",
      action: "deliver",
      taskPairDisposition: "IMMUTABLE",
      deliveryDisposition: "RESUMABLE",
    });
  }
  return requestedContract({
    skill,
    mode: skill === "kyw-audit" ? "read-only" : "implementation",
    routeCapability: skill === "kyw-audit" ? "audit-read-only" : "impl-exact-task",
    action: skill === "kyw-audit" ? "audit" : "implement",
  });
}

function draftTaskContract(overrides = {}) {
  return requestedContract({
    skill: "kyw-task",
    mode: "authoring",
    routeCapability: "task-draft-id",
    action: "author",
    ...overrides,
  });
}

function exactBounds(contract) {
  return Object.fromEntries(
    ["action", "target", "scope", "attempt"].map((field) => [field, contract[field]]),
  );
}

function impactsForTask(taskId, { includePermanentOwners = true } = {}) {
  const directory = taskDirectoryFor(taskId);
  return {
    ...CHANGE_IMPACTS,
    taskTest: {
      summary: `Task ${taskId} pair must synchronize`,
      paths: [`${directory}/TASK.md`, `${directory}/TEST.md`],
    },
    permanentDocuments: includePermanentOwners
      ? CHANGE_IMPACTS.permanentDocuments
      : NO_SYNC_IMPACTS.permanentDocuments,
  };
}

function taskDirectoryFor(taskId) {
  return taskId === "0083"
    ? "docs/tasks/0083-scope-kyw-skill-guardrails-to-active-in-60ce0c5c"
    : `docs/tasks/${taskId}-route-bound-task`;
}

function taskSelection(taskId) {
  return { selectedTask: taskId, selectedTaskDirectory: taskDirectoryFor(taskId) };
}


test("instruction surfaces retain one canonical owner and minimal projections", async () => {
  const [
    agents,
    agentsTemplate,
    readme,
    spec,
    architecture,
    authoring,
    implementation,
    execution,
    deliverySkill,
    delivery,
    publicRelease,
    prompts,
    plugin,
  ] = await Promise.all([
    read("AGENTS.md"),
    read("templates/project/AGENTS.md"),
    read("README.md"),
    read("docs/SPEC.md"),
    read("docs/ARCHITECTURE.md"),
    read("skills/kyw-task/SKILL.md"),
    read("skills/kyw-impl/SKILL.md"),
    read("skills/kyw-impl/references/execution.md"),
    read("skills/kyw-deliver/SKILL.md"),
    read("skills/kyw-deliver/references/delivery.md"),
    read("skills/kyw-deliver/references/public-release.md"),
    read("CODEX_PROMPTS.md"),
    read(".codex-plugin/plugin.json").then(JSON.parse),
  ]);

  assert.match(architecture, /### Instruction authority and projections/);
  assert.match(architecture, /Each normative rule family has one owner/);
  assert.match(architecture, /`CODEX_PROMPTS\.md` is maintainer convenience, not normative authority/);
  assert.match(
    architecture,
    /\| Exact Task\/Test shape \| Canonical Task and Test templates \| Deterministic template validator/,
  );
  assert.match(
    readme,
    /Product behavior is owned by \[SPEC\][\s\S]*Detailed procedure belongs only to \[`kyw-impl`\][\s\S]*\[`kyw-deliver`\]/,
  );
  for (const projection of [agents, agentsTemplate]) {
    assert.match(
      projection,
      /Always load applicable `AGENTS\.md`[\s\S]{0,100}active kyw workflow[\s\S]{0,80}selected\/current Task\/Test pair[\s\S]{0,100}inactive ordinary prompts? (?:does not select one|select(?:s)? none)/,
    );
    assert.match(projection, /Index or search README, SPEC, and ARCHITECTURE first/);
    assert.match(
      projection,
      /Read all four(?: permanent documents)? for `kyw-init`, rebaseline/,
    );
    for (const routingAnchor of [
      "All six `kyw-*` Skills are explicit-only",
      "Keep one Task active",
      "Task/Test owns repository outcome; GitHub gates mutable delivery",
    ]) {
      assert.ok(projection.includes(routingAnchor), routingAnchor);
    }
    assert.match(projection, /`\$kyw-impl NNNN` is portable for (?:existing )?implementation/);
    assert.match(projection, /Only exact `\$kyw-deliver NNNN`/);
    assert.match(projection, /exact `\$kyw-deliver NNNN --public-release`/i);
  }

  assert.match(authoring, /author/i);
  assert.match(authoring, /DRAFT\/DRAFT/);
  assert.doesNotMatch(authoring, /\]\(references\/execution\.md\)/);
  const ordinaryBatchBlock = authoring.match(
    /The ordinary production batch[\s\S]*?```json\r?\n([\s\S]*?)\r?\n```/,
  );
  assert.ok(ordinaryBatchBlock, "kyw-task must show its ordinary production batch");
  const ordinaryBatch = JSON.parse(ordinaryBatchBlock[1]);
  const ordinaryTask = ordinaryBatch.tasks[0];
  assert.equal(Object.hasOwn(ordinaryTask, "key"), false);
  assert.equal(ordinaryTask.title, "First outcome");
  assert.deepEqual(ordinaryTask.dependencies, [
    { taskId: "0039" },
    { taskTitle: "Earlier outcome" },
  ]);
  assert.match(
    authoring,
    /adapter (?:derives its key|[\s\S]{0,120}delegates[\s\S]{0,120}internal-key derivation[\s\S]{0,120}canonical owner)/i,
  );
  assert.match(authoring, /`key`\/`taskKey`[\s\S]{0,80}(?:low-level|caller) compatibility/i);
  assert.doesNotMatch(authoring, /Give each new outcome[^\n]*taskKey/i);
  assert.doesNotMatch(
    authoring,
    /\b48(?:-|\s)*(?:character|char|자)|INVALID_TASK_BATCH[\s\S]{0,100}(?:short|key)/i,
  );
  assert.match(authoring, /READY\/READY[\s\S]{0,40}(?:pair set and stops|authoring)/i);
  assert.match(authoring, /state-appropriate report-only guidance/);
  assert.match(authoring, /repository work uses exact `\$kyw-impl NNNN`/);
  assert.match(authoring, /pending terminal `STANDARD` delivery uses exact `\$kyw-deliver NNNN`/);
  assert.match(implementation, /\[Task Execution and Resume\]\(references\/execution\.md\)/);
  assert.match(implementation, /existing Task/i);
  assert.match(execution, /canonical detailed repository implementation procedure/);
  assert.match(deliverySkill, /\[STANDARD Delivery and Resume\]\(references\/delivery\.md\)/);
  assert.match(delivery, /canonical detailed Git\/GitHub delivery procedure/);
  assert.match(
    deliverySkill,
    /\[Public Release and Resume\]\(references\/public-release\.md\)/,
  );
  assert.match(publicRelease, /canonical detailed public-release procedure/);
  assert.match(publicRelease, /^## Perform the ordered public release$/m);
  assert.doesNotMatch(delivery, /^## Perform the ordered public release$/m);
  assert.doesNotMatch(implementation, /create-batch --tasks-root/);

  for (const surface of [readme, spec]) {
    assert.match(surface, /\$kyw-task "<(?:goal|outcome|confirmed outcome)>"/i);
    assert.match(surface, /\$kyw-impl NNNN/);
    assert.match(surface, /\$kyw-deliver NNNN/);
  }
  assert.match(architecture, /kyw-task/i);
  assert.match(architecture, /kyw-impl/i);
  assert.match(spec, /READY\/READY[\s\S]*stop/i);
  assert.match(spec, /does not (?:invoke|chain)[\s\S]*`?\$kyw-impl/i);
  assert.match(readme, /\$kyw-task "goal"[\s\S]*authors[\s\S]*stops/i);
  assert.match(readme, /stops, including continuous mode/);
  assert.match(readme, /Pending delivery blocks with exact `\$kyw-deliver NNNN`/);
  assert.match(readme, /Exact `\$kyw-deliver NNNN` retains `STANDARD`-only behavior/);
  assert.match(readme, /exact `\$kyw-deliver NNNN --public-release`/);
  assert.match(readme, /fixed-bounded checkpoint in exact aligned `main`/);
  assert.match(readme, /at most one freshly reconstructed uncovered predecessor/);
  assert.match(spec, /before (?:its )?one dispatcher call/);
  assert.match(architecture, /bounded local-Git \/ GitHub hydration inputs/);
  assert.match(readme, /surface without the managed contract uses `\$kyw-impl NNNN`/);
  assert.match(readme, /selected implementation action owns repository mutation through `DONE\/PASSED`/i);
  assert.match(readme, /selected delivery owns only its separate aligned GitHub lifecycle/i);
  assert.match(
    architecture,
    /no automatic registry publish, version\/tag\/Release creation, public[\s\S]*submission, force push, CI rerun, or (?:branch-)?protection bypass/,
  );
  for (const surface of [readme, spec, architecture]) {
    assert.match(surface, /actual PR[- ]head|actual[- ]head/i);
    assert.match(surface, /merge compatib/i);
    assert.match(surface, /post-merge/i);
  }
  assert.doesNotMatch(execution, /PR_ACTUAL_HEAD|PR_MERGE_COMPATIBILITY|POST_MERGE_MAIN/);
  assert.match(delivery, /PR_ACTUAL_HEAD/);
  assert.match(delivery, /PR_MERGE_COMPATIBILITY/);
  assert.match(delivery, /POST_MERGE_MAIN/);
  assert.match(delivery, /HARDENED_EXACT_HEAD/);
  assert.match(delivery, /LEGACY_PRE_CONTRACT/);
  assert.match(delivery, /DURABLE_STANDARD_CONTINUITY/);
  assert.match(execution, /without automatic whole-history replay/);
  assert.match(execution, /separate `bootstrap-continuity` command/);
  assert.match(execution, /not a dispatch option, source-repair path, or Task-ID exception/);
  assert.doesNotMatch(execution, /apply-continuity/);
  assert.match(delivery, /apply-continuity/);
  assert.match(delivery, /actual head visibly `UNVERIFIED`/);
  assert.match(execution, /contracts 1\/2 are grandfathered/);
  assert.match(authoring, /delivered contract-3 Tasks use new hard-dependent pairs/);
  assert.match(implementation, /unchanged invocation reports only/i);
  for (const projection of [agents, agentsTemplate]) {
    assert.match(
      projection,
      /(?:future-contract terminal pair becomes byte-immutable|Delivered contract-3 pairs are immutable)/i,
    );
    assert.match(projection, /hard-dependent Task/);
  }
  assert.match(
    delivery,
    /(?:successful job at|job) only (?:at )?`refs\/pull\/<number>\/merge`[\s\S]{0,80}(?:cannot prove actual head|is merge compatibility)/,
  );
  assert.match(readme, /actual PR-head jobs, synthetic merge compatibility/);
  assert.match(spec, /reused/i);
  assert.match(architecture, /`KYWCIEVIDENCE`/);
  for (const surface of [readme, spec, architecture]) {
    assert.doesNotMatch(surface, /--delivery-(?:expectations|ledger)-json/);
    assert.doesNotMatch(surface, /actualHead: "UNVERIFIED"/);
  }

  assert.match(prompts, /절차를 복제하지 않고 호출만 제공한다/);
  assert.match(prompts, /\$kyw-impl/);
  assert.doesNotMatch(prompts, /설치된 `\$kyw-task` 실행 reference/);
  assert.match(plugin.interface.defaultPrompt[1], /\$kyw-task "goal"/);
  assert.match(plugin.interface.defaultPrompt[1], /author[\s\S]*stop/i);
  assert.doesNotMatch(plugin.interface.defaultPrompt[1], /execute|implement|deliver/i);
  assert.doesNotMatch(plugin.interface.defaultPrompt[1], /taskKey|\b48\b/);
  assert.match(plugin.interface.defaultPrompt[2], /\$kyw-impl 0001/);
  assert.match(plugin.interface.defaultPrompt[2], /repository completion[\s\S]*stop/i);
  assert.match(plugin.interface.defaultPrompt[3], /\$kyw-deliver 0001/);
  assert.match(plugin.interface.defaultPrompt[3], /--public-release/);
  assert.match(plugin.interface.defaultPrompt[4], /\$kyw-audit 0001/);
  for (const invocation of [
    '$kyw-task "<outcome>"',
    "$kyw-impl 0001",
    "$kyw-deliver 0001",
    "$kyw-deliver 0001 --public-release",
    "task 0001 실행해줘",
    "task 진행해줘",
    "남은 task 계속 실행해줘",
  ]) {
    assert.ok(prompts.includes(invocation), `${invocation}: prompt projection`);
  }
  for (const alias of [
    /task (?:NNNN|\d{4}) 실행해줘/,
    /task 진행해줘/,
    /남은 task 계속 실행해줘/,
  ]) {
    assert.match(spec, alias);
    assert.match(implementation, alias);
  }
  for (const surface of [deliverySkill, delivery, publicRelease, readme, spec]) {
    assert.match(surface, /\$kyw-deliver NNNN/);
  }
  for (const surface of [deliverySkill, publicRelease, readme, spec, architecture]) {
    assert.match(surface, /\$kyw-deliver NNNN --public-release/);
  }
});

test("activation-scoped guardrails have one canonical contract and every required projection", async () => {
  const paths = [
    "docs/SPEC.md",
    "README.md",
    "AGENTS.md",
    "docs/ARCHITECTURE.md",
    "templates/project/AGENTS.md",
    "skills/kyw-grilling/SKILL.md",
    "skills/kyw-init/SKILL.md",
    "skills/kyw-task/SKILL.md",
    "skills/kyw-impl/SKILL.md",
    "skills/kyw-impl/references/execution.md",
    "skills/kyw-deliver/SKILL.md",
    "skills/kyw-deliver/references/delivery.md",
    "skills/kyw-deliver/references/public-release.md",
    "skills/kyw-audit/SKILL.md",
    "skills/kyw-audit/references/audit.md",
  ];
  const entries = await Promise.all(paths.map(async (path) => [path, await read(path)]));
  for (const [path, text] of entries) {
    assert.equal(
      [...text.matchAll(/<!-- kyw-active-skill-guardrails:v1 -->/g)].length,
      1,
      `${path}: activation-scoped projection marker`,
    );
  }
  const texts = Object.fromEntries(entries);
  assert.match(texts["docs/SPEC.md"], /Activation-scoped guardrails and ordinary prompts/);
  assert.match(
    texts["docs/SPEC.md"],
    /INACTIVE[\s\S]*ACTIVE_ALIGNED[\s\S]*CHANGE_PENDING[\s\S]*RECONFIRMED_BOUNDED[\s\S]*CANCELLED_OR_EXPIRED/,
  );
  assert.match(
    texts["docs/SPEC.md"],
    /controlling old criterion[\s\S]*requested new criterion[\s\S]*implementation[\s\S]*Task\/Test[\s\S]*permanent-document[\s\S]*verification[\s\S]*delivery[\s\S]*action, target, scope, and attempt/i,
  );
  assert.match(
    texts["docs/SPEC.md"],
    /Non-route changes rewarn[\s\S]{0,100}route-locked replacement expires[\s\S]{0,80}exact route/,
  );
  assert.match(
    texts["skills/kyw-impl/references/execution.md"],
    /Skill, mode, or route identity[\s\S]{0,80}requires its exact route/,
  );
  assert.ok(
    texts["docs/ARCHITECTURE.md"].includes(
      "During an active kyw\nworkflow, load its selected/current Task/Test pair; inactive ordinary prompts\nselect none.",
    ),
    "ARCHITECTURE A-03 must not load a Task/Test pair for inactive ordinary prompts",
  );
  assert.ok(
    texts["docs/ARCHITECTURE.md"].includes(
      "always: applicable AGENTS\nactive kyw only: selected/current TASK/TEST when applicable",
    ),
    "ARCHITECTURE progressive loading must bind Task/Test context to active kyw workflows",
  );
  for (const skillPath of [
    "skills/kyw-grilling/SKILL.md",
    "skills/kyw-init/SKILL.md",
    "skills/kyw-task/SKILL.md",
    "skills/kyw-impl/SKILL.md",
    "skills/kyw-deliver/SKILL.md",
    "skills/kyw-audit/SKILL.md",
  ]) {
    assert.match(
      texts[skillPath],
      /active invocation|activates only its current invocation|exact[^.\n]{0,80}(?:route )?(?:alone )?activates|starts an active kyw workflow/i,
      skillPath,
    );
    assert.match(texts[skillPath], /aligned/i, skillPath);
    assert.match(texts[skillPath], /warning/i, skillPath);
    assert.match(texts[skillPath], /reconfirm/i, skillPath);
  }
});

test("inactive and post-terminal prompts stay outside kyw workflow gating", () => {
  const inactive = runSkillInvocationScenario([{ type: "ordinary" }]);
  assert.equal(inactive.workflow, "INACTIVE");
  assert.equal(inactive.routeCount, 0);
  assert.equal(inactive.dispatchCount, 0);
  assert.deepEqual(inactive.warnings, []);
  assert.deepEqual(inactive.mutations, []);
  assert.deepEqual(inactive.ordinaryOutcomeMutations, []);
  assert.deepEqual(inactive.events, [{ type: "ORDINARY_HANDLING", turn: 0 }]);

  const ordinaryChange = runSkillInvocationScenario([
    {
      type: "ordinary",
      outcome: {
        action: "update",
        target: "ordinary requested repository outcome",
        scope: "requested change and affected permanent truth",
        attempt: "ordinary-change-1",
        permanentOwners: ["docs/SPEC.md"],
        taskTestPaths: [],
      },
    },
  ]);
  assert.equal(ordinaryChange.state, "INACTIVE");
  assert.equal(ordinaryChange.routeCount, 0);
  assert.equal(ordinaryChange.dispatchCount, 0);
  assert.deepEqual(ordinaryChange.warnings, []);
  assert.deepEqual(ordinaryChange.mutations, []);
  assert.deepEqual(
    ordinaryChange.ordinaryOutcomeMutations.map(({ type }) => type),
    ["SYNC_PERMANENT_OWNER", "ORDINARY_ACTION"],
  );

  const activeOrdinaryChange = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    {
      type: "ordinary",
      outcome: {
        action: "delete",
        target: "outside active Task",
        scope: "unclassified workflow-boundary change",
        attempt: "ordinary-change-2",
        permanentOwners: [],
        taskTestPaths: [],
      },
    },
  ]);
  assert.equal(activeOrdinaryChange.state, "CANCELLED_OR_EXPIRED");
  assert.deepEqual(activeOrdinaryChange.mutations, []);
  assert.deepEqual(activeOrdinaryChange.ordinaryOutcomeMutations, []);

  for (const skill of [
    "kyw-grilling",
    "kyw-init",
    "kyw-task",
    "kyw-impl",
    "kyw-audit",
  ]) {
    const activated = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: contractForSkill(skill),
      },
    ]);
    assert.equal(activated.state, "ACTIVE_ALIGNED", skill);
    assert.equal(activated.active.skill, skill);
    assert.equal(activated.routeCount, 1, skill);
  }

  for (const routeCapability of [
    "impl-managed-task-id",
    "impl-managed-auto",
    "impl-managed-continuous",
  ]) {
    const managed = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "MANAGED_ALIAS",
        contract: requestedContract({ routeCapability }),
      },
    ]);
    assert.equal(managed.state, "ACTIVE_ALIGNED", routeCapability);
    assert.equal(managed.active.routeCapability, routeCapability);
    assert.equal(managed.routeCount, 1, routeCapability);
  }

  const repairContract = requestedContract({
    skill: "kyw-audit",
    mode: "repair",
    routeCapability: "audit-repair",
    action: "repair",
  });
  const repair = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: repairContract,
    },
  ]);
  assert.equal(repair.state, "ACTIVE_ALIGNED");
  assert.equal(repair.active.mode, "repair");

  for (const [name, routeKind, contract] of [
    ["managed alias cannot activate audit", "MANAGED_ALIAS", contractForSkill("kyw-audit")],
    [
      "read-only audit cannot implement",
      "EXPLICIT_SKILL",
      { ...contractForSkill("kyw-audit"), action: "implement" },
    ],
    [
      "decision interview cannot acquire a Task",
      "EXPLICIT_SKILL",
      {
        ...contractForSkill("kyw-grilling"),
        selectedTask: "0083",
        acceptance: ["AC-01"],
      },
    ],
    [
      "Task route ID must be exactly four digits",
      "EXPLICIT_SKILL",
      { ...requestedContract(), selectedTask: "83" },
    ],
    [
      "Task acceptance must be a dense string array",
      "EXPLICIT_SKILL",
      requestedContract({ acceptance: Array(1) }),
    ],
  ]) {
    assert.throws(
      () =>
        runSkillInvocationScenario([
          { type: "activate", recognized: true, routeKind, contract },
        ]),
      /activation contract and route must be compatible/,
      name,
    );
  }

  const postTerminal = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    { type: "complete" },
    { type: "ordinary" },
  ]);
  assert.equal(postTerminal.workflow, "INACTIVE");
  assert.deepEqual(
    postTerminal.events.map(({ type }) => type),
    ["ACTIVATED", "TERMINAL", "POST_TERMINAL_INACTIVE", "ORDINARY_HANDLING"],
  );

  const staleAfterCompletion = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    { type: "complete" },
    { type: "reconfirm" },
    { type: "ordinary" },
  ]);
  assert.deepEqual(
    staleAfterCompletion.events.map(({ type }) => type),
    [
      "ACTIVATED",
      "TERMINAL",
      "POST_TERMINAL_INACTIVE",
      "INACTIVE_NO_GUARDRAIL",
      "ORDINARY_HANDLING",
    ],
  );

  const stopped = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    { type: "stop" },
  ]);
  assert.equal(stopped.state, "CANCELLED_OR_EXPIRED");
  assert.equal(stopped.active, undefined);
  assert.deepEqual(stopped.mutations, []);

  const reactivated = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    { type: "complete" },
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract({ attempt: "task-0083-implementation-2" }),
    },
    { type: "ordinary" },
  ]);
  assert.equal(reactivated.workflow, "ACTIVE");
  assert.equal(reactivated.state, "ACTIVE_ALIGNED");
  assert.equal(reactivated.routeCount, 2);
  assert.equal(reactivated.events.at(-1).type, "ACTIVE_NONMUTATING_TURN");

  for (const terminalTurn of [{ type: "cancel" }, { type: "facts-changed" }]) {
    const afterCancelledOrExpired = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract(),
      },
      {
        type: "change",
        requested: requestedContract({ scope: "changed scope" }),
        impacts: CHANGE_IMPACTS,
        factsRevision: "facts-1",
      },
      terminalTurn,
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract({ attempt: "task-0083-implementation-2" }),
      },
    ]);
    assert.deepEqual(afterCancelledOrExpired.visitedStates, [
      "INACTIVE",
      "ACTIVE_ALIGNED",
      "CHANGE_PENDING",
      "CANCELLED_OR_EXPIRED",
      "INACTIVE",
      "ACTIVE_ALIGNED",
    ]);
    assert.deepEqual(
      afterCancelledOrExpired.events.slice(-2).map(({ type }) => type),
      ["POST_TERMINAL_INACTIVE", "ACTIVATED"],
    );
  }

  for (const staleTurn of [
    { type: "reconfirm", warningId: "warning-1-1" },
    { type: "change", requested: requestedContract({ scope: "stale change" }) },
    { type: "unclassified-post-terminal" },
  ]) {
    const staleReuse = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract(),
      },
      {
        type: "change",
        requested: requestedContract({ scope: "changed scope" }),
        impacts: CHANGE_IMPACTS,
        factsRevision: "facts-1",
      },
      { type: "cancel" },
      staleTurn,
    ]);
    assert.equal(staleReuse.state, "INACTIVE");
    assert.equal(staleReuse.workflow, "INACTIVE");
    assert.equal(staleReuse.active, undefined);
    assert.equal(staleReuse.pendingWarning, undefined);
    assert.equal(staleReuse.pendingDisposition, "NONE");
    assert.deepEqual(staleReuse.mutations, []);
    assert.deepEqual(staleReuse.events.slice(-2).map(({ type }) => type), [
      "POST_TERMINAL_INACTIVE",
      "INACTIVE_NO_GUARDRAIL",
    ]);
  }
});

test("active aligned commands continue without duplicate reconfirmation", () => {
  const result = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    { type: "aligned", contract: requestedContract(), clause: "continue-current-task" },
  ]);
  assert.equal(result.workflow, "ACTIVE");
  assert.equal(result.activeSubstate, "ALIGNED");
  assert.equal(result.state, "ACTIVE_ALIGNED");
  assert.equal(result.duplicateConfirmations, 0);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.mutations.map(({ type }) => type), ["ALIGNED_CONTINUE"]);
  assert.deepEqual(result.mutations[0].bounds, exactBounds(ACTIVE_SKILL_CONTRACT));

  for (const skill of ["kyw-grilling", "kyw-audit"]) {
    const contract = contractForSkill(skill);
    const readOnly = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract,
      },
      { type: "aligned", contract, clause: "continue-read-only-work" },
    ]);
    assert.deepEqual(readOnly.mutations, [], skill);
    assert.equal(readOnly.events.at(-1).type, "ALIGNED_CONTINUE", skill);
  }

  for (const [profile, contract] of [
    ["kyw-init", contractForSkill("kyw-init")],
    ["kyw-task DRAFT", draftTaskContract()],
  ]) {
    const decision = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract,
      },
      {
        type: "aligned",
        contract,
        clause: "answer-open-decision",
        operation: "decision",
      },
    ]);
    assert.deepEqual(decision.mutations, [], profile);
    assert.equal(decision.events.at(-1).repositoryMutation, "NONE", profile);

    const unconfirmedWrite = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract,
      },
      {
        type: "aligned",
        contract,
        clause: "write-without-native-confirmation",
        operation: "write",
      },
    ]);
    assert.deepEqual(unconfirmedWrite.mutations, [], profile);
    assert.equal(unconfirmedWrite.events.at(-1).type, "NATIVE_CONFIRMATION_REQUIRED");

    const confirmedWrite = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract,
      },
      {
        type: "aligned",
        contract,
        clause: "native-confirmed-write",
        operation: "write",
        nativeConfirmation: true,
      },
    ]);
    assert.deepEqual(confirmedWrite.mutations.map(({ type }) => type), [
      "ALIGNED_CONTINUE",
    ]);

    const combinedDecision = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract,
        clauses: [
          {
            id: "combined-open-decision",
            kind: "ALIGNED",
            contract,
            operation: "decision",
          },
        ],
      },
    ]);
    assert.deepEqual(combinedDecision.mutations, [], profile);
    assert.equal(combinedDecision.events.at(-1).repositoryMutation, "NONE", profile);

    const originCannotConfirmWrite = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract,
        clauses: [
          {
            id: "origin-write",
            kind: "ALIGNED",
            contract,
            operation: "write",
            nativeConfirmation: true,
          },
        ],
      },
    ]);
    assert.deepEqual(originCannotConfirmWrite.mutations, [], profile);
    assert.equal(
      originCannotConfirmWrite.events.at(-1).type,
      "NATIVE_CONFIRMATION_REQUIRED",
      profile,
    );
  }

  const taskGoal = contractForSkill("kyw-task");
  const goalAuthoring = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: taskGoal,
    },
    { type: "aligned", contract: taskGoal, clause: "author-ready-pair" },
  ]);
  assert.deepEqual(goalAuthoring.mutations.map(({ type }) => type), [
    "ALIGNED_CONTINUE",
  ]);

  for (const [name, alignedTurn] of [
    [
      "second action",
      {
        type: "aligned",
        contract: requestedContract(),
        clause: "continue-current-task",
        secondAction: "git-tag",
      },
    ],
    [
      "additional actions",
      {
        type: "aligned",
        contract: requestedContract(),
        clause: "continue-current-task",
        additionalActions: ["publish"],
      },
    ],
    [
      "unrelated native confirmation",
      {
        type: "aligned",
        contract: requestedContract(),
        clause: "continue-current-task",
        nativeConfirmation: true,
      },
    ],
  ]) {
    const rejected = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract(),
      },
      alignedTurn,
    ]);
    assert.equal(rejected.state, "CANCELLED_OR_EXPIRED", name);
    assert.deepEqual(rejected.mutations, [], name);
  }
});

test("material active changes warn without mutation and exact reconfirmation synchronizes before bounded action", () => {
  for (const [field, value] of [
    ["skill", "kyw-audit"],
    ["mode", "delivery"],
    ["routeCapability", "impl-managed-auto"],
    ["baseline", "main@changed"],
    ["selectedTask", "0084"],
    ["acceptance", ["AC-01", "AC-09"]],
    ["scope", "expanded guardrail scope"],
    ["action", "publish"],
    ["target", "kyw-dev@0.1.5"],
    ["attempt", "task-0083-implementation-2"],
  ]) {
    const requested = requestedContract(
      field === "selectedTask" ? taskSelection(value) : { [field]: value },
    );
    const impacts = field === "selectedTask" ? impactsForTask(value) : CHANGE_IMPACTS;
    const warned = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract(),
      },
      {
        type: "change",
        requested,
        impacts,
        factsRevision: "facts-1",
      },
    ]);
    assert.equal(warned.activeSubstate, "CHANGE_PENDING", field);
    assert.deepEqual(warned.mutations, [], field);
    assert.equal(warned.warnings.length, 1, field);
    assert.ok(warned.warnings[0].changes.includes(field), field);
    assert.deepEqual(warned.warnings[0].bounds, exactBounds(requested), field);
    assert.deepEqual(Object.keys(warned.warnings[0].impacts), [
      "implementation",
      "taskTest",
      "permanentDocuments",
      "verification",
      "delivery",
    ]);
  }

  const selfConfirmedOrigin = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    {
      type: "change",
      requested: requestedContract({ scope: "changed scope" }),
      impacts: CHANGE_IMPACTS,
      factsRevision: "facts-1",
      selfConfirmation: true,
    },
  ]);
  assert.equal(selfConfirmedOrigin.state, "CHANGE_PENDING");
  assert.deepEqual(selfConfirmedOrigin.mutations, []);
  assert.ok(
    selfConfirmedOrigin.events.some(({ type }) => type === "SELF_CONFIRMATION_REJECTED"),
  );

  for (const [name, extra] of [
    ["additional action", { additionalActions: ["publish"] }],
    ["additional choice", { additionalChoices: ["also tag"] }],
  ]) {
    const rejected = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract(),
      },
      {
        type: "change",
        requested: requestedContract({ scope: "changed scope" }),
        impacts: CHANGE_IMPACTS,
        factsRevision: "facts-1",
        ...extra,
      },
    ]);
    assert.equal(rejected.state, "CANCELLED_OR_EXPIRED", name);
    assert.deepEqual(rejected.warnings, [], name);
    assert.deepEqual(rejected.mutations, [], name);
  }

  for (const [field, value] of [
    ["skill", "kyw-audit"],
    ["mode", "delivery"],
    ["routeCapability", "impl-managed-auto"],
  ]) {
    const requested = requestedContract({ [field]: value });
    const result = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract(),
      },
      {
        type: "change",
        requested,
        impacts: CHANGE_IMPACTS,
        factsRevision: "facts-1",
      },
      {
        type: "reconfirm",
        source: "current-user",
        trusted: true,
        explicit: true,
        unambiguous: true,
        warningId: "warning-1-1",
        factsRevision: "facts-1",
        accepted: requested,
        bounds: exactBounds(requested),
        permanentOwners: CHANGE_IMPACTS.permanentDocuments.paths,
        taskTestPaths: CHANGE_IMPACTS.taskTest.paths,
        executionBounds: exactBounds(requested),
      },
    ]);
    assert.equal(result.state, "CANCELLED_OR_EXPIRED", field);
    assert.equal(result.pendingDisposition, "EXPIRED", field);
    assert.deepEqual(result.mutations, [], field);
    assert.ok(result.events.some(({ type }) => type === "EXACT_ROUTE_REQUIRED"), field);
  }

  for (const [name, active, requested, impacts = NO_SYNC_IMPACTS] of [
    [
      "read-only audit cannot reconfirm repair",
      contractForSkill("kyw-audit"),
      { ...contractForSkill("kyw-audit"), action: "repair" },
    ],
    [
      "decision interview cannot reconfirm implementation",
      contractForSkill("kyw-grilling"),
      { ...contractForSkill("kyw-grilling"), action: "implement" },
    ],
    [
      "audit cannot reconfirm a different resolved Task",
      contractForSkill("kyw-audit"),
      { ...contractForSkill("kyw-audit"), ...taskSelection("0084") },
    ],
    [
      "goal authoring cannot reconfirm DRAFT-ID routing",
      contractForSkill("kyw-task"),
      requestedContract({
        skill: "kyw-task",
        mode: "authoring",
        routeCapability: "task-draft-id",
        action: "author",
      }),
      impactsForTask("0083", { includePermanentOwners: false }),
    ],
    [
      "DRAFT-ID authoring cannot reconfirm another Task ID",
      requestedContract({
        skill: "kyw-task",
        mode: "authoring",
        routeCapability: "task-draft-id",
        action: "author",
      }),
      requestedContract({
        skill: "kyw-task",
        mode: "authoring",
        routeCapability: "task-draft-id",
        action: "author",
        ...taskSelection("0084"),
      }),
      impactsForTask("0084", { includePermanentOwners: false }),
    ],
    [
      "implementation cannot reconfirm another Task ID",
      requestedContract(),
      requestedContract(taskSelection("0084")),
      impactsForTask("0084"),
    ],
    [
      "implementation cannot reconfirm an unsupported action profile",
      requestedContract(),
      requestedContract({ action: "audit" }),
    ],
  ]) {
    const result = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: active,
      },
      {
        type: "change",
        requested,
        impacts,
        factsRevision: "facts-1",
      },
      {
        type: "reconfirm",
        source: "current-user",
        trusted: true,
        explicit: true,
        unambiguous: true,
        warningId: "warning-1-1",
        factsRevision: "facts-1",
        accepted: requested,
        bounds: exactBounds(requested),
        permanentOwners: impacts.permanentDocuments.paths,
        taskTestPaths: impacts.taskTest.paths,
        executionBounds: exactBounds(requested),
      },
    ]);
    assert.equal(result.state, "CANCELLED_OR_EXPIRED", name);
    assert.deepEqual(result.mutations, [], name);
    assert.ok(result.events.some(({ type }) => type === "EXACT_ROUTE_REQUIRED"), name);
  }

  const requested = requestedContract({
    routeCapability: "impl-managed-task-id",
    acceptance: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-09"],
    scope: "approved expanded guardrail scope",
  });
  const confirmed = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "MANAGED_ALIAS",
      contract: requestedContract({ routeCapability: "impl-managed-task-id" }),
    },
    {
      type: "change",
      requested,
      impacts: CHANGE_IMPACTS,
      factsRevision: "facts-1",
    },
    {
      type: "reconfirm",
      source: "current-user",
      trusted: true,
      explicit: true,
      unambiguous: true,
      warningId: "warning-1-1",
      factsRevision: "facts-1",
      accepted: Object.fromEntries(Object.entries(requested).reverse()),
      bounds: Object.fromEntries(Object.entries(exactBounds(requested)).reverse()),
      permanentOwners: ["docs/SPEC.md", "docs/ARCHITECTURE.md"],
      taskTestPaths: CHANGE_IMPACTS.taskTest.paths,
      executionBounds: exactBounds(requested),
    },
  ]);
  assert.equal(confirmed.state, "INACTIVE");
  assert.deepEqual(confirmed.visitedStates, [
    "INACTIVE",
    "ACTIVE_ALIGNED",
    "CHANGE_PENDING",
    "RECONFIRMED_BOUNDED",
    "INACTIVE",
  ]);
  assert.deepEqual(confirmed.mutations.map(({ type }) => type), [
    "SYNC_PERMANENT_OWNER",
    "SYNC_PERMANENT_OWNER",
    "SYNC_TASK",
    "SYNC_TEST",
    "BOUNDED_ACTION",
  ]);
  assert.deepEqual(confirmed.mutations.at(-1).bounds, exactBounds(requested));

  const changedAction = requestedContract({
    action: "publish",
    target: "kyw-dev@0.1.5",
    attempt: "publish-1",
  });
  const actionConfirmed = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    {
      type: "change",
      requested: changedAction,
      impacts: NO_SYNC_IMPACTS,
      factsRevision: "facts-1",
    },
    {
      type: "reconfirm",
      source: "current-user",
      trusted: true,
      explicit: true,
      unambiguous: true,
      warningId: "warning-1-1",
      factsRevision: "facts-1",
      accepted: changedAction,
      bounds: exactBounds(changedAction),
      permanentOwners: [],
      taskTestPaths: [],
      executionBounds: exactBounds(changedAction),
    },
  ]);
  assert.equal(actionConfirmed.state, "INACTIVE");
  assert.equal(actionConfirmed.mutations.at(-1).type, "BOUNDED_ACTION");
  assert.deepEqual(actionConfirmed.mutations.at(-1).bounds, exactBounds(changedAction));

  for (const [field, value] of [
    ["permanentOwners", null],
    ["permanentOwners", undefined],
    ["taskTestPaths", null],
    ["taskTestPaths", undefined],
  ]) {
    const rejected = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract(),
      },
      {
        type: "change",
        requested: changedAction,
        impacts: NO_SYNC_IMPACTS,
        factsRevision: "facts-1",
      },
      {
        type: "reconfirm",
        source: "current-user",
        trusted: true,
        explicit: true,
        unambiguous: true,
        warningId: "warning-1-1",
        factsRevision: "facts-1",
        accepted: changedAction,
        bounds: exactBounds(changedAction),
        permanentOwners: [],
        taskTestPaths: [],
        executionBounds: exactBounds(changedAction),
        [field]: value,
      },
    ]);
    assert.equal(rejected.state, "CANCELLED_OR_EXPIRED", `${field}: ${value}`);
    assert.deepEqual(rejected.mutations, [], `${field}: ${value}`);
  }

  const deferredReconfirmation = {
    type: "reconfirm",
    source: "current-user",
    trusted: true,
    explicit: true,
    unambiguous: true,
    warningId: "warning-1-1",
    factsRevision: "facts-1",
    accepted: changedAction,
    bounds: exactBounds(changedAction),
    permanentOwners: [],
    taskTestPaths: [],
    executionBounds: exactBounds(changedAction),
    deferExecution: true,
  };
  for (const interruption of [
    { type: "cancel" },
    { type: "stop" },
    { type: "facts-changed" },
  ]) {
    const interruptedBounded = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: requestedContract(),
      },
      {
        type: "change",
        requested: changedAction,
        impacts: NO_SYNC_IMPACTS,
        factsRevision: "facts-1",
      },
      deferredReconfirmation,
      interruption,
    ]);
    assert.deepEqual(interruptedBounded.visitedStates, [
      "INACTIVE",
      "ACTIVE_ALIGNED",
      "CHANGE_PENDING",
      "RECONFIRMED_BOUNDED",
      "CANCELLED_OR_EXPIRED",
    ]);
    assert.deepEqual(interruptedBounded.mutations, []);
  }

  const noSyncDeferredPrefix = [
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    {
      type: "change",
      requested: changedAction,
      impacts: NO_SYNC_IMPACTS,
      factsRevision: "facts-1",
    },
    deferredReconfirmation,
  ];
  for (const [field, value] of [
    ["permanentOwners", null],
    ["permanentOwners", undefined],
    ["taskTestPaths", null],
    ["taskTestPaths", undefined],
  ]) {
    const rejected = runSkillInvocationScenario([
      ...noSyncDeferredPrefix,
      {
        type: "execute-bounded",
        warningId: "warning-1-1",
        factsRevision: "facts-1",
        permanentOwners: [],
        taskTestPaths: [],
        executionBounds: exactBounds(changedAction),
        [field]: value,
      },
    ]);
    assert.equal(rejected.state, "CANCELLED_OR_EXPIRED", `${field}: ${value}`);
    assert.deepEqual(rejected.mutations, [], `${field}: ${value}`);
  }

  const deferredRequested = requestedContract({ scope: "deferred bounded scope" });
  const deferredPrefix = [
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
    },
    {
      type: "change",
      requested: deferredRequested,
      impacts: CHANGE_IMPACTS,
      factsRevision: "facts-1",
    },
    {
      type: "reconfirm",
      source: "current-user",
      trusted: true,
      explicit: true,
      unambiguous: true,
      warningId: "warning-1-1",
      factsRevision: "facts-1",
      accepted: deferredRequested,
      bounds: exactBounds(deferredRequested),
      permanentOwners: CHANGE_IMPACTS.permanentDocuments.paths,
      taskTestPaths: CHANGE_IMPACTS.taskTest.paths,
      executionBounds: exactBounds(deferredRequested),
      deferExecution: true,
    },
  ];
  const exactDeferredExecution = {
    type: "execute-bounded",
    warningId: "warning-1-1",
    factsRevision: "facts-1",
    permanentOwners: CHANGE_IMPACTS.permanentDocuments.paths,
    taskTestPaths: CHANGE_IMPACTS.taskTest.paths,
    executionBounds: exactBounds(deferredRequested),
  };
  for (const [name, override] of [
    ["null permanent-owner approval", { permanentOwners: null }],
    ["undefined permanent-owner approval", { permanentOwners: undefined }],
    ["sparse permanent-owner approval", { permanentOwners: Array(2) }],
    ["null Task/Test approval", { taskTestPaths: null }],
    ["undefined Task/Test approval", { taskTestPaths: undefined }],
    ["sparse Task/Test approval", { taskTestPaths: Array(2) }],
    [
      "changed deferred execution bounds",
      {
        executionBounds: {
          ...exactBounds(deferredRequested),
          target: "unwarned target",
        },
      },
    ],
  ]) {
    const rejectedApproval = runSkillInvocationScenario([
      ...deferredPrefix.slice(0, 2),
      { ...deferredPrefix[2], ...override },
      exactDeferredExecution,
    ]);
    assert.equal(rejectedApproval.state, "INACTIVE", name);
    assert.deepEqual(rejectedApproval.mutations, [], name);
    assert.equal(rejectedApproval.boundedApproval, undefined, name);
    assert.equal(
      rejectedApproval.events.some(({ type }) => type === "EXACT_RECONFIRMED"),
      false,
      name,
    );
  }
  const deferredSuccess = runSkillInvocationScenario([
    ...deferredPrefix,
    exactDeferredExecution,
  ]);
  assert.equal(deferredSuccess.state, "INACTIVE");
  assert.deepEqual(deferredSuccess.mutations.map(({ type }) => type), [
    "SYNC_PERMANENT_OWNER",
    "SYNC_PERMANENT_OWNER",
    "SYNC_TASK",
    "SYNC_TEST",
    "BOUNDED_ACTION",
  ]);

  for (const invalidExecution of [
    { ...exactDeferredExecution, warningId: "warning-stale" },
    { ...exactDeferredExecution, factsRevision: "facts-stale" },
    { ...exactDeferredExecution, permanentOwners: [] },
    { ...exactDeferredExecution, taskTestPaths: [] },
    {
      ...exactDeferredExecution,
      executionBounds: {
        ...exactDeferredExecution.executionBounds,
        target: "unwarned target",
      },
    },
    { ...exactDeferredExecution, alsoDo: "delete-branch" },
  ]) {
    const rejectedExecution = runSkillInvocationScenario([
      ...deferredPrefix,
      invalidExecution,
    ]);
    assert.equal(rejectedExecution.state, "CANCELLED_OR_EXPIRED");
    assert.deepEqual(rejectedExecution.mutations, []);
    assert.equal(rejectedExecution.boundedApproval, undefined);
  }

  for (const skill of ["kyw-grilling", "kyw-audit"]) {
    const active = contractForSkill(skill);
    const requested = { ...active, scope: `${active.scope} changed` };
    const readOnly = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: active,
      },
      {
        type: "change",
        requested,
        impacts: NO_SYNC_IMPACTS,
        factsRevision: "facts-1",
      },
      {
        type: "reconfirm",
        source: "current-user",
        trusted: true,
        explicit: true,
        unambiguous: true,
        warningId: "warning-1-1",
        factsRevision: "facts-1",
        accepted: requested,
        bounds: exactBounds(requested),
        permanentOwners: [],
        taskTestPaths: [],
        executionBounds: exactBounds(requested),
      },
    ]);
    assert.equal(readOnly.state, "INACTIVE", skill);
    assert.deepEqual(readOnly.mutations, [], skill);
    assert.equal(readOnly.events.at(-2).type, "BOUNDED_ACTION", skill);
    assert.equal(readOnly.events.at(-2).repositoryMutation, "NONE", skill);
  }

  const immutableAudit = {
    ...contractForSkill("kyw-audit"),
    taskPairDisposition: "IMMUTABLE",
  };
  for (const [field, value] of [
    ["scope", `${immutableAudit.scope} changed`],
    ["acceptance", [...immutableAudit.acceptance, "AC-05"]],
  ]) {
    const requested = { ...immutableAudit, [field]: value };
    const audited = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        contract: immutableAudit,
      },
      {
        type: "change",
        requested,
        impacts: NO_SYNC_IMPACTS,
        factsRevision: "facts-1",
      },
      {
        type: "reconfirm",
        source: "current-user",
        trusted: true,
        explicit: true,
        unambiguous: true,
        warningId: "warning-1-1",
        factsRevision: "facts-1",
        accepted: requested,
        bounds: exactBounds(requested),
        permanentOwners: [],
        taskTestPaths: [],
        executionBounds: exactBounds(requested),
      },
    ]);
    assert.equal(audited.state, "INACTIVE", field);
    assert.deepEqual(audited.mutations, [], field);
    assert.equal(audited.events.at(-2).type, "BOUNDED_ACTION", field);
    assert.equal(audited.events.at(-2).repositoryMutation, "NONE", field);
  }

  const initActive = contractForSkill("kyw-init");
  const initRequested = { ...initActive, scope: `${initActive.scope} changed` };
  const initImpacts = {
    ...NO_SYNC_IMPACTS,
    permanentDocuments: {
      summary: "SPEC owns the changed initialization criterion",
      paths: ["docs/SPEC.md"],
    },
  };
  const initializationPrefix = [
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: initActive,
    },
    {
      type: "change",
      requested: initRequested,
      impacts: initImpacts,
      factsRevision: "facts-1",
    },
    {
      type: "reconfirm",
      source: "current-user",
      trusted: true,
      explicit: true,
      unambiguous: true,
      warningId: "warning-1-1",
      factsRevision: "facts-1",
      accepted: initRequested,
      bounds: exactBounds(initRequested),
      permanentOwners: ["docs/SPEC.md"],
      taskTestPaths: [],
      executionBounds: exactBounds(initRequested),
    },
  ];
  const awaitingInitializationConfirmation = runSkillInvocationScenario(
    initializationPrefix,
  );
  assert.equal(awaitingInitializationConfirmation.state, "RECONFIRMED_BOUNDED");
  assert.deepEqual(awaitingInitializationConfirmation.mutations, []);
  assert.equal(
    awaitingInitializationConfirmation.events.at(-1).type,
    "NATIVE_CONFIRMATION_REQUIRED",
  );

  const malformedInitializationConfirmation = runSkillInvocationScenario([
    ...initializationPrefix.slice(0, 2),
    { ...initializationPrefix[2], nativeConfirmation: "yes" },
  ]);
  assert.equal(malformedInitializationConfirmation.state, "CANCELLED_OR_EXPIRED");
  assert.deepEqual(malformedInitializationConfirmation.mutations, []);

  const initialized = runSkillInvocationScenario([
    ...initializationPrefix,
    {
      type: "execute-bounded",
      warningId: "warning-1-1",
      factsRevision: "facts-1",
      permanentOwners: ["docs/SPEC.md"],
      taskTestPaths: [],
      executionBounds: exactBounds(initRequested),
      nativeConfirmation: true,
    },
  ]);
  assert.deepEqual(initialized.mutations.map(({ type }) => type), [
    "SYNC_PERMANENT_OWNER",
    "BOUNDED_ACTION",
  ]);

  const malformedInitializationExecution = runSkillInvocationScenario([
    ...initializationPrefix,
    {
      type: "execute-bounded",
      warningId: "warning-1-1",
      factsRevision: "facts-1",
      permanentOwners: ["docs/SPEC.md"],
      taskTestPaths: [],
      executionBounds: exactBounds(initRequested),
      nativeConfirmation: "yes",
    },
  ]);
  assert.equal(malformedInitializationExecution.state, "CANCELLED_OR_EXPIRED");
  assert.deepEqual(malformedInitializationExecution.mutations, []);

  const taskActive = draftTaskContract();
  const taskRequested = { ...taskActive, scope: `${taskActive.scope} changed` };
  const taskImpacts = impactsForTask("0083", { includePermanentOwners: false });
  const taskReconfirmation = {
    type: "reconfirm",
    source: "current-user",
    trusted: true,
    explicit: true,
    unambiguous: true,
    warningId: "warning-1-1",
    factsRevision: "facts-1",
    accepted: taskRequested,
    bounds: exactBounds(taskRequested),
    permanentOwners: [],
    taskTestPaths: taskImpacts.taskTest.paths,
    executionBounds: exactBounds(taskRequested),
  };
  const unconfirmedAuthoring = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: taskActive,
    },
    {
      type: "change",
      requested: taskRequested,
      impacts: taskImpacts,
      factsRevision: "facts-1",
    },
    taskReconfirmation,
  ]);
  assert.equal(unconfirmedAuthoring.state, "RECONFIRMED_BOUNDED");
  assert.deepEqual(unconfirmedAuthoring.mutations, []);

  const confirmedAuthoring = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: taskActive,
    },
    {
      type: "change",
      requested: taskRequested,
      impacts: taskImpacts,
      factsRevision: "facts-1",
    },
    { ...taskReconfirmation, nativeConfirmation: true },
  ]);
  assert.deepEqual(confirmedAuthoring.mutations.map(({ type }) => type), [
    "SYNC_TASK",
    "SYNC_TEST",
    "BOUNDED_ACTION",
  ]);

  const goalActive = contractForSkill("kyw-task");
  const goalRequested = { ...goalActive, scope: `${goalActive.scope} changed` };
  const goalAuthoring = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: goalActive,
    },
    {
      type: "change",
      requested: goalRequested,
      impacts: NO_SYNC_IMPACTS,
      factsRevision: "facts-1",
    },
    {
      type: "reconfirm",
      source: "current-user",
      trusted: true,
      explicit: true,
      unambiguous: true,
      warningId: "warning-1-1",
      factsRevision: "facts-1",
      accepted: goalRequested,
      bounds: exactBounds(goalRequested),
      permanentOwners: [],
      taskTestPaths: [],
      executionBounds: exactBounds(goalRequested),
    },
  ]);
  assert.deepEqual(goalAuthoring.mutations.map(({ type }) => type), [
    "BOUNDED_ACTION",
  ]);

  const resumableDelivery = contractForSkill("kyw-deliver");
  const changedDelivery = {
    ...resumableDelivery,
    target: "changed delivery target",
  };
  const deliveryReconfirmation = {
    type: "reconfirm",
    source: "current-user",
    trusted: true,
    explicit: true,
    unambiguous: true,
    warningId: "warning-1-1",
    factsRevision: "facts-1",
    accepted: changedDelivery,
    bounds: exactBounds(changedDelivery),
    permanentOwners: [],
    taskTestPaths: [],
    executionBounds: exactBounds(changedDelivery),
  };
  const boundedDelivery = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: resumableDelivery,
    },
    {
      type: "change",
      requested: changedDelivery,
      impacts: NO_SYNC_IMPACTS,
      factsRevision: "facts-1",
    },
    deliveryReconfirmation,
  ]);
  assert.deepEqual(boundedDelivery.mutations.map(({ type }) => type), [
    "BOUNDED_ACTION",
  ]);
  assert.equal(
    boundedDelivery.mutations.some(({ type }) =>
      ["SYNC_TASK", "SYNC_TEST"].includes(type),
    ),
    false,
  );
  const changedDeliveryScope = {
    ...resumableDelivery,
    scope: "changed resumable delivery scope",
  };
  const immutableDeliveryScope = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: resumableDelivery,
    },
    {
      type: "change",
      requested: changedDeliveryScope,
      impacts: NO_SYNC_IMPACTS,
      factsRevision: "facts-1",
    },
    {
      ...deliveryReconfirmation,
      accepted: changedDeliveryScope,
      bounds: exactBounds(changedDeliveryScope),
      executionBounds: exactBounds(changedDeliveryScope),
    },
  ]);
  assert.equal(immutableDeliveryScope.state, "CANCELLED_OR_EXPIRED");
  assert.deepEqual(immutableDeliveryScope.mutations, []);
  assert.ok(
    immutableDeliveryScope.events.some(({ type }) => type === "EXACT_ROUTE_REQUIRED"),
  );

  const satisfiedReport = {
    ...contractForSkill("kyw-deliver"),
    action: "report",
    deliveryDisposition: "SATISFIED",
  };
  const terminalReport = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: satisfiedReport,
    },
    {
      type: "aligned",
      contract: satisfiedReport,
      clause: "report-canonical-delivery",
    },
    { type: "complete" },
  ]);
  assert.equal(terminalReport.state, "INACTIVE");
  assert.deepEqual(terminalReport.mutations, []);

  const changedSatisfiedScope = {
    ...satisfiedReport,
    scope: "changed canonically delivered Task scope",
  };
  const immutableScopeChange = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: satisfiedReport,
    },
    {
      type: "change",
      requested: changedSatisfiedScope,
      impacts: NO_SYNC_IMPACTS,
      factsRevision: "facts-1",
    },
    {
      ...deliveryReconfirmation,
      accepted: changedSatisfiedScope,
      bounds: exactBounds(changedSatisfiedScope),
      executionBounds: exactBounds(changedSatisfiedScope),
    },
  ]);
  assert.equal(immutableScopeChange.state, "CANCELLED_OR_EXPIRED");
  assert.deepEqual(immutableScopeChange.mutations, []);
  assert.ok(
    immutableScopeChange.events.some(({ type }) => type === "EXACT_ROUTE_REQUIRED"),
  );

  const changedSatisfiedAction = {
    ...satisfiedReport,
    action: "publish",
    target: "registry",
    attempt: "publish-1",
  };
  const immutableActionChange = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: satisfiedReport,
    },
    {
      type: "change",
      requested: changedSatisfiedAction,
      impacts: NO_SYNC_IMPACTS,
      factsRevision: "facts-1",
    },
    {
      ...deliveryReconfirmation,
      accepted: changedSatisfiedAction,
      bounds: exactBounds(changedSatisfiedAction),
      executionBounds: exactBounds(changedSatisfiedAction),
    },
  ]);
  assert.equal(immutableActionChange.state, "CANCELLED_OR_EXPIRED");
  assert.deepEqual(immutableActionChange.mutations, []);
  assert.ok(
    immutableActionChange.events.some(
      ({ type }) => type === "EXACT_ROUTE_REQUIRED",
    ),
  );

  for (const requested of [
    requestedContract({
      action: "deliver",
      taskPairDisposition: "IMMUTABLE",
      deliveryDisposition: "RESUMABLE",
    }),
    { ...contractForSkill("kyw-deliver"), taskPairDisposition: "MUTABLE" },
    requestedContract({ action: "implement", taskPairDisposition: "IMMUTABLE" }),
  ]) {
    assert.throws(
      () =>
        runSkillInvocationScenario([
          {
            type: "activate",
            recognized: true,
            routeKind: "EXPLICIT_SKILL",
            contract: requestedContract(),
          },
          {
            type: "change",
            requested,
            impacts: NO_SYNC_IMPACTS,
            factsRevision: "facts-1",
          },
        ]),
      /warning requested contract must be complete/,
    );
  }

  assert.throws(
    () =>
      runSkillInvocationScenario([
        {
          type: "activate",
          recognized: true,
          routeKind: "EXPLICIT_SKILL",
          contract: {
            ...resumableDelivery,
            deliveryDisposition: "SATISFIED",
          },
        },
      ]),
    /activation contract and route must be compatible/,
  );
});

test("pending warnings reject cancellation ambiguity staleness changed facts and widened approval", () => {
  const requested = requestedContract({ scope: "changed scope" });
  const activation = {
    type: "activate",
    recognized: true,
    routeKind: "EXPLICIT_SKILL",
    contract: requestedContract(),
  };
  const change = {
    type: "change",
    requested,
    impacts: CHANGE_IMPACTS,
    factsRevision: "facts-1",
  };
  const exact = {
    type: "reconfirm",
    source: "current-user",
    trusted: true,
    explicit: true,
    unambiguous: true,
    warningId: "warning-1-1",
    factsRevision: "facts-1",
    accepted: requested,
    bounds: exactBounds(requested),
    permanentOwners: CHANGE_IMPACTS.permanentDocuments.paths,
    taskTestPaths: CHANGE_IMPACTS.taskTest.paths,
    executionBounds: exactBounds(requested),
  };
  for (const [name, invalidTurn, disposition] of [
    ["cancellation", { type: "cancel" }, "CANCELLED"],
    ["decline", { type: "decline" }, "CANCELLED"],
    ["stop", { type: "stop" }, "CANCELLED"],
    ["pending completion", { type: "complete" }, "EXPIRED"],
    ["ambiguous", { ...exact, unambiguous: false }, "EXPIRED"],
    ["wrong source", { ...exact, source: "prior-user" }, "EXPIRED"],
    ["not explicit", { ...exact, explicit: false }, "EXPIRED"],
    ["stale warning", { ...exact, warningId: "warning-older" }, "EXPIRED"],
    ["untrusted", { ...exact, trusted: false }, "EXPIRED"],
    ["changed facts", { type: "facts-changed" }, "EXPIRED"],
    [
      "changed accepted Skill",
      { ...exact, accepted: { ...requested, skill: "kyw-audit" } },
      "EXPIRED",
    ],
    [
      "changed accepted mode",
      { ...exact, accepted: { ...requested, mode: "delivery" } },
      "EXPIRED",
    ],
    [
      "changed accepted route capability",
      {
        ...exact,
        accepted: { ...requested, routeCapability: "impl-managed-auto" },
      },
      "EXPIRED",
    ],
    [
      "changed accepted baseline",
      { ...exact, accepted: { ...requested, baseline: "main@other" } },
      "EXPIRED",
    ],
    [
      "changed accepted Task",
      { ...exact, accepted: { ...requested, ...taskSelection("0084") } },
      "EXPIRED",
    ],
    [
      "changed accepted acceptance",
      { ...exact, accepted: { ...requested, acceptance: [...requested.acceptance, "AC-09"] } },
      "EXPIRED",
    ],
    [
      "changed accepted scope",
      { ...exact, accepted: { ...requested, scope: "other accepted scope" } },
      "EXPIRED",
    ],
    ...["action", "target", "scope", "attempt"].map((field) => [
      `changed ${field} bound`,
      { ...exact, bounds: { ...exact.bounds, [field]: `other ${field}` } },
      "EXPIRED",
    ]),
    ["additional action", { ...exact, additionalActions: ["git-tag"] }, "EXPIRED"],
    [
      "additional choice",
      { ...exact, additionalChoices: ["choose another rollout"] },
      "EXPIRED",
    ],
    ["intervening turn", { type: "intervening" }, "EXPIRED"],
    ["duplicate confirmation", { type: "duplicate-confirmation" }, "EXPIRED"],
    ["unclassified intervention", { type: "unknown-turn" }, "EXPIRED"],
    ["unknown approval field", { ...exact, alsoDo: "delete-branch" }, "EXPIRED"],
    ["invalid defer flag", { ...exact, deferExecution: false }, "EXPIRED"],
    [
      "aligned intervention",
      { type: "aligned", contract: requestedContract(), clause: "too-late" },
      "EXPIRED",
    ],
    ["missing permanent sync", { ...exact, permanentOwners: [] }, "EXPIRED"],
    ["missing Task/Test sync", { ...exact, taskTestPaths: [] }, "EXPIRED"],
    [
      "sparse permanent sync",
      { ...exact, permanentOwners: Array(2) },
      "EXPIRED",
    ],
    [
      "sparse Task/Test sync",
      { ...exact, taskTestPaths: Array(2) },
      "EXPIRED",
    ],
    [
      "out-of-bounds execution",
      {
        ...exact,
        executionBounds: { ...exact.executionBounds, target: "unwarned target" },
      },
      "EXPIRED",
    ],
  ]) {
    const result = runSkillInvocationScenario([activation, change, invalidTurn]);
    assert.equal(result.pendingDisposition, disposition, name);
    assert.deepEqual(result.mutations, [], name);
    assert.equal(result.pendingWarning, undefined, name);
    assert.equal(result.active, undefined, name);
  }

  for (const factsRevision of [undefined, "", " ", "\t"]) {
    assert.throws(
      () =>
        runSkillInvocationScenario([
          activation,
          { ...change, factsRevision },
        ]),
      /warning facts revision must be concrete/,
    );
  }

  for (const impacts of [
    { ...CHANGE_IMPACTS, taskTest: "docs/tasks/0083/TASK.md" },
    { ...CHANGE_IMPACTS, permanentDocuments: "docs/SPEC.md" },
    { ...CHANGE_IMPACTS, implementation: " " },
    { ...CHANGE_IMPACTS, verification: "\t" },
    { ...CHANGE_IMPACTS, delivery: "\n" },
    { ...CHANGE_IMPACTS, secondaryAction: "git-tag" },
    { ...CHANGE_IMPACTS, taskTest: { summary: " ", paths: [] } },
    { ...CHANGE_IMPACTS, taskTest: { summary: "invalid", paths: [""] } },
    {
      ...CHANGE_IMPACTS,
      taskTest: {
        summary: "incomplete pair",
        paths: [
          "docs/tasks/0083-scope-kyw-skill-guardrails-to-active-in-60ce0c5c/TASK.md",
        ],
      },
    },
    {
      ...CHANGE_IMPACTS,
      taskTest: {
        summary: "traversal pair",
        paths: ["docs/tasks/../TASK.md", "docs/tasks/../TEST.md"],
      },
    },
    {
      ...CHANGE_IMPACTS,
      permanentDocuments: {
        summary: "not a canonical permanent owner",
        paths: ["templates/project/AGENTS.md"],
      },
    },
    {
      ...CHANGE_IMPACTS,
      permanentDocuments: {
        summary: "sparse permanent-owner paths",
        paths: Array(1),
      },
    },
    {
      ...CHANGE_IMPACTS,
      taskTest: {
        summary: "sparse Task/Test paths",
        paths: Array(2),
      },
    },
  ]) {
    assert.throws(
      () => runSkillInvocationScenario([activation, { ...change, impacts }]),
      /all warning impacts must be concrete/,
    );
  }

  for (const impacts of [NO_SYNC_IMPACTS, impactsForTask("0084")]) {
    assert.throws(
      () => runSkillInvocationScenario([activation, { ...change, impacts }]),
      /Task-bearing criterion change requires its selected Task\/Test pair|Task\/Test impacts must match the selected Task/,
    );
  }

  for (const requested of [
    requestedContract({ action: "publish" }),
    requestedContract({ target: "different target" }),
    requestedContract({ attempt: "task-0083-implementation-2" }),
  ]) {
    assert.throws(
      () =>
        runSkillInvocationScenario([
          activation,
          { ...change, requested, impacts: impactsForTask("0084") },
        ]),
      /Task\/Test impacts must match the selected Task/,
    );
  }

  assert.throws(
    () =>
      runSkillInvocationScenario([
        activation,
        {
          ...change,
          impacts: {
            ...CHANGE_IMPACTS,
            taskTest: {
              summary: "same ID but wrong directory",
              paths: [
                "docs/tasks/0083-other-task/TASK.md",
                "docs/tasks/0083-other-task/TEST.md",
              ],
            },
          },
        },
      ]),
    /Task\/Test impacts must match the selected Task/,
  );

  for (const skill of ["kyw-init", "kyw-task"]) {
    const active = contractForSkill(skill);
    assert.throws(
      () =>
        runSkillInvocationScenario([
          {
            type: "activate",
            recognized: true,
            routeKind: "EXPLICIT_SKILL",
            contract: active,
          },
          {
            type: "change",
            requested: { ...active, scope: `${active.scope} changed` },
            impacts: CHANGE_IMPACTS,
            factsRevision: "facts-1",
          },
        ]),
      /taskless or immutable warning cannot claim Task\/Test synchronization/,
      skill,
    );
  }

  const tasklessAuthoring = contractForSkill("kyw-task");
  assert.throws(
    () =>
      runSkillInvocationScenario([
        {
          type: "activate",
          recognized: true,
          routeKind: "EXPLICIT_SKILL",
          contract: tasklessAuthoring,
        },
        {
          type: "change",
          requested: { ...tasklessAuthoring, scope: "changed authoring scope" },
          impacts: {
            ...NO_SYNC_IMPACTS,
            permanentDocuments: {
              summary: "forbidden owner sync",
              paths: ["docs/SPEC.md"],
            },
          },
          factsRevision: "facts-1",
        },
      ]),
    /kyw-task warning cannot claim permanent-owner synchronization/,
  );

  for (const invalidRequested of [
    { ...requested, baseline: "" },
    { ...requested, baseline: " " },
    { ...requested, action: "\t" },
    { ...requested, secondaryAction: "git-tag" },
    { ...requested, acceptance: [""] },
    { ...requested, acceptance: [" "] },
    { ...requested, acceptance: ["AC-01", "AC-01"] },
    {
      ...requested,
      selectedTask: null,
      selectedTaskDirectory: null,
      acceptance: null,
    },
  ]) {
    assert.throws(
      () =>
        runSkillInvocationScenario([
          activation,
          { ...change, requested: invalidRequested },
        ]),
      /warning requested contract must be complete/,
    );
  }

  const replacement = runSkillInvocationScenario([
    activation,
    change,
    {
      ...change,
      requested: requestedContract({ scope: "different changed scope" }),
      factsRevision: "facts-2",
    },
  ]);
  assert.equal(replacement.pendingDisposition, "REPLACED");
  assert.equal(replacement.warnings.length, 2);
  assert.notEqual(replacement.warnings[0].id, replacement.warnings[1].id);
  assert.deepEqual(replacement.mutations, []);

  for (const [name, requested, impacts] of [
    [
      "pending Skill replacement",
      requestedContract({
        skill: "kyw-audit",
        mode: "read-only",
        routeCapability: "audit-read-only",
        action: "audit",
      }),
      CHANGE_IMPACTS,
    ],
    [
      "pending Task-route replacement",
      requestedContract(taskSelection("0084")),
      impactsForTask("0084"),
    ],
  ]) {
    const routeReplacement = runSkillInvocationScenario([
      activation,
      change,
      { ...change, requested, impacts, factsRevision: "facts-2" },
    ]);
    assert.equal(routeReplacement.state, "CANCELLED_OR_EXPIRED", name);
    assert.equal(routeReplacement.pendingDisposition, "EXPIRED", name);
    assert.equal(routeReplacement.warnings.length, 1, name);
    assert.equal(
      routeReplacement.events.filter(({ type }) => type === "WARNING_REPLACED").length,
      0,
      name,
    );
    assert.ok(
      routeReplacement.events.some(({ type }) => type === "EXACT_ROUTE_REQUIRED"),
      name,
    );
    assert.deepEqual(routeReplacement.mutations, [], name);
  }
});

test("combined routed messages dispatch once, preserve aligned clauses, and cannot self-confirm changes", () => {
  const invocation = parseTaskInvocation(
    "$kyw-impl 0083 continue the selected Task; widen delivery scope; confirm now",
  );
  assert.equal(invocation.recognized, true);
  assert.equal(invocation.taskId, "0083");
  assert.equal(
    invocation.overrideText,
    "continue the selected Task; widen delivery scope; confirm now",
  );
  assert.deepEqual(
    evaluateTaskExecutionPreflight({ overrideClassification: "TASK_OVERRIDE_PRESENT" }),
    {
      safe: true,
      issues: [],
      overrideClassification: "TASK_OVERRIDE_PRESENT",
    },
  );

  const changed = requestedContract({ scope: "expanded delivery scope" });
  const pending = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: invocation.recognized,
      routeKind: "EXPLICIT_SKILL",
      dispatch: true,
      contract: requestedContract(),
      selfConfirmation: true,
      clauses: [
        { id: "aligned", kind: "ALIGNED", contract: requestedContract() },
        {
          id: "change",
          kind: "CHANGE",
          requested: changed,
          impacts: CHANGE_IMPACTS,
          factsRevision: "facts-1",
        },
      ],
    },
  ]);
  assert.equal(pending.routeCount, 1);
  assert.equal(pending.dispatchCount, 1);
  assert.equal(pending.skillChainCount, 0);
  assert.equal(pending.activeSubstate, "CHANGE_PENDING");
  assert.deepEqual(pending.mutations.map(({ type }) => type), ["ALIGNED_CONTINUE"]);
  assert.ok(pending.events.some(({ type }) => type === "SELF_CONFIRMATION_REJECTED"));

  const confirmed = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: invocation.recognized,
      routeKind: "EXPLICIT_SKILL",
      dispatch: true,
      contract: requestedContract(),
      selfConfirmation: true,
      clauses: [
        { id: "aligned", kind: "ALIGNED", contract: requestedContract() },
        {
          id: "change",
          kind: "CHANGE",
          requested: changed,
          impacts: CHANGE_IMPACTS,
          factsRevision: "facts-1",
        },
      ],
    },
    {
      type: "reconfirm",
      source: "current-user",
      trusted: true,
      explicit: true,
      unambiguous: true,
      warningId: "warning-0-1",
      factsRevision: "facts-1",
      accepted: changed,
      bounds: exactBounds(changed),
      permanentOwners: CHANGE_IMPACTS.permanentDocuments.paths,
      taskTestPaths: CHANGE_IMPACTS.taskTest.paths,
      executionBounds: exactBounds(changed),
    },
  ]);
  assert.equal(confirmed.routeCount, 1);
  assert.equal(confirmed.dispatchCount, 1);
  assert.equal(confirmed.skillChainCount, 0);
  assert.equal(confirmed.state, "INACTIVE");
  assert.equal(
    confirmed.events.filter(({ type }) => type === "DISPATCH_PREFLIGHTED").length,
    1,
  );
  assert.equal(
    confirmed.events.find(({ type }) => type === "DISPATCH_PREFLIGHTED")
      .repositoryMutation,
    "NONE",
  );
  assert.equal(confirmed.mutations.at(-1).type, "BOUNDED_ACTION");

  const noChain = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      dispatch: true,
      contract: requestedContract(),
    },
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      dispatch: true,
      contract: contractForSkill("kyw-audit"),
    },
  ]);
  assert.equal(noChain.routeCount, 1);
  assert.equal(noChain.dispatchCount, 1);
  assert.equal(noChain.skillChainAttempts, 1);
  assert.equal(noChain.skillChainCount, 0);
  assert.equal(noChain.state, "CANCELLED_OR_EXPIRED");
  assert.equal(noChain.active, undefined);
  assert.equal(noChain.pendingWarning, undefined);
  assert.deepEqual(noChain.mutations, []);
  assert.ok(noChain.events.some(({ type }) => type === "SKILL_CHAIN_REJECTED"));

  const malformedNoChain = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      dispatch: true,
      contract: requestedContract(),
    },
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      contract: requestedContract(),
      secondAction: "publish",
    },
  ]);
  assert.equal(malformedNoChain.routeCount, 1);
  assert.equal(malformedNoChain.dispatchCount, 1);
  assert.equal(malformedNoChain.skillChainAttempts, 1);
  assert.equal(malformedNoChain.state, "CANCELLED_OR_EXPIRED");
  assert.deepEqual(malformedNoChain.mutations, []);
  assert.equal(malformedNoChain.events.at(-1).type, "SKILL_CHAIN_REJECTED");

  const alignedClause = {
    id: "aligned",
    kind: "ALIGNED",
    contract: requestedContract(),
  };
  const changeClause = {
    id: "change",
    kind: "CHANGE",
    requested: changed,
    impacts: CHANGE_IMPACTS,
    factsRevision: "facts-1",
  };
  const changeBeforeAligned = runSkillInvocationScenario([
    {
      type: "activate",
      recognized: true,
      routeKind: "EXPLICIT_SKILL",
      dispatch: true,
      contract: requestedContract(),
      clauses: [changeClause, alignedClause],
    },
  ]);
  assert.equal(changeBeforeAligned.dispatchCount, 1);
  assert.equal(changeBeforeAligned.activeSubstate, "CHANGE_PENDING");
  assert.deepEqual(changeBeforeAligned.mutations.map(({ type }) => type), [
    "ALIGNED_CONTINUE",
  ]);

  for (const [name, clauses] of [
    ["unknown clause", [alignedClause, { id: "unknown", kind: "UNKNOWN" }]],
    [
      "aligned clause extra action",
      [{ ...alignedClause, secondAction: "git-tag" }],
    ],
    [
      "changing clause extra choice",
      [{ ...changeClause, additionalChoices: ["also publish"] }],
    ],
    ["duplicate clause identity", [alignedClause, { ...alignedClause }]],
    [
      "additional change",
      [
        changeClause,
        {
          ...changeClause,
          id: "another-change",
          requested: requestedContract({ target: "another target" }),
        },
      ],
    ],
  ]) {
    const rejected = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        dispatch: true,
        contract: requestedContract(),
        clauses,
      },
    ]);
    assert.equal(rejected.routeCount, 1, name);
    assert.equal(rejected.dispatchCount, 0, name);
    assert.equal(rejected.state, "CANCELLED_OR_EXPIRED", name);
    assert.deepEqual(rejected.mutations, [], name);
    assert.equal(rejected.events.at(-1).type, "CLAUSE_PREFLIGHT_REJECTED", name);
  }

  for (const [skill, contract] of [
    ["kyw-init", contractForSkill("kyw-init")],
    ["kyw-task", draftTaskContract()],
  ]) {
    for (const [name, clause] of [
      [
        "invalid native operation",
        {
          id: "bad-operation",
          kind: "ALIGNED",
          contract,
          operation: "bogus",
        },
      ],
      [
        "invalid native confirmation type",
        {
          id: "bad-confirmation",
          kind: "ALIGNED",
          contract,
          operation: "write",
          nativeConfirmation: "yes",
        },
      ],
    ]) {
      const rejected = runSkillInvocationScenario([
        {
          type: "activate",
          recognized: true,
          routeKind: "EXPLICIT_SKILL",
          dispatch: true,
          contract,
          clauses: [clause],
        },
      ]);
      assert.equal(rejected.routeCount, 1, `${skill}: ${name}`);
      assert.equal(rejected.dispatchCount, 0, `${skill}: ${name}`);
      assert.equal(rejected.state, "CANCELLED_OR_EXPIRED", `${skill}: ${name}`);
      assert.deepEqual(rejected.mutations, [], `${skill}: ${name}`);
      assert.equal(
        rejected.events.at(-1).type,
        "CLAUSE_PREFLIGHT_REJECTED",
        `${skill}: ${name}`,
      );
    }
  }

  for (const [name, malformedActivation] of [
    [
      "top-level extra action",
      {
        clauses: [alignedClause],
        secondAction: "git-tag",
      },
    ],
    [
      "top-level additional actions",
      {
        clauses: [alignedClause],
        additionalActions: ["publish"],
      },
    ],
    ["explicit null clauses", { clauses: null }],
  ]) {
    const rejected = runSkillInvocationScenario([
      {
        type: "activate",
        recognized: true,
        routeKind: "EXPLICIT_SKILL",
        dispatch: true,
        contract: requestedContract(),
        ...malformedActivation,
      },
    ]);
    assert.equal(rejected.routeCount, 1, name);
    assert.equal(rejected.dispatchCount, 0, name);
    assert.equal(rejected.state, "CANCELLED_OR_EXPIRED", name);
    assert.deepEqual(rejected.mutations, [], name);
    assert.equal(rejected.events.at(-1).type, "ACTIVATION_PREFLIGHT_REJECTED", name);
  }
});

test("README puts installation, explicit Skills, first use, and current status before maintainer detail", async () => {
  const readme = await read("README.md");
  const orderedMarkers = [
    "## Start here",
    "### Choose one installation surface",
    "### Invoke a Skill explicitly",
    "## Release status",
    "## Task routing and evidence",
    "## Installation details",
    "## Development",
  ];
  let previous = -1;
  for (const marker of orderedMarkers) {
    const index = readme.indexOf(marker);
    assert.ok(index > previous, `${marker} must appear in the first-use order`);
    previous = index;
  }

  const firstUse = readme.slice(0, readme.indexOf("## Release status"));
  for (const invocation of [
    "$kyw-init",
    "$kyw-task",
    "$kyw-impl",
    "$kyw-deliver",
    "$kyw-audit",
    "$kyw-grilling",
  ]) {
    assert.ok(firstUse.includes(invocation), `${invocation} must be visible before release detail`);
  }
  assert.match(
    readme,
    /Version `0\.1\.4`[\s\S]*current source\/package release and public `latest`/,
  );
  assert.match(
    readme,
    /Exact historical results live only in numbered Task\/Test pairs and GitHub/,
  );
  assert.match(
    readme,
    /`kyw-dev@0\.1\.4` is published to the public npm registry under the `latest` tag/,
  );
  assert.match(
    readme,
    /canonical version metadata exposes a `gitHead` field matching the published source commit/,
  );
  assert.match(
    readme,
    /The `v0\.1\.4` Git tag identifies the published source commit, and the corresponding GitHub Release uses that tag/,
  );
  assert.match(readme, /No public plugin submission has occurred/);
  assert.match(readme, /npx --yes kyw-dev@0\.1\.4 install --scope user/);
  assert.match(readme, /Version change[\s\S]{0,180}remain separate bounds/);
  assert.doesNotMatch(readme, /\bTask 0\d{3}\b|READY_FOR_APPROVAL|UNCHANGED at the audited point/);
  assert.doesNotMatch(readme, /^### Grilling evaluation harness$/m);
  assert.doesNotMatch(readme, /^### Audit behavior smoke$/m);
  assert.doesNotMatch(readme, /^## Target repository layout$/m);
  assert.doesNotMatch(
    firstUse,
    /result schema|SIGINT|process group|protected snapshots|native sandbox/i,
  );
  assert.ok(
    Buffer.byteLength(readme) <=
      PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.targets["README.md"],
    "README must satisfy its one-time compaction target",
  );
});

test("permanent truth separates credential-free CI, manual OIDC publication, and authority", async () => {
  const [readme, specification, architecture] = await Promise.all([
    read("README.md"),
    read("docs/SPEC.md"),
    read("docs/ARCHITECTURE.md"),
  ]);

  assert.match(
    readme,
    /\.github\/workflows\/publish\.yml[\s\S]*manual-only[\s\S]*GitHub Actions \/ kimyeongwoo\/kyw-dev \/ publish\.yml \/ npm-production[\s\S]*exact real Git checkout directory[\s\S]*tokenless, OTP-free/,
  );
  assert.match(
    readme,
    /Merging the workflow, passing credential-free exact-SHA CI[\s\S]*cannot execute it/,
  );
  assert.match(readme, /public repository receives npm provenance automatically/);
  assert.match(
    readme,
    /Routine release preflight[\s\S]*(?:without|Neither needs) `npm login`, OTP, security-key authentication, account-settings inspection, or `npm trust list`[\s\S]*setup[\s\S]*security\/configuration audit\/change[\s\S]*actual OIDC failure/,
  );
  assert.match(
    readme,
    /Routine release preflight validates (?:the )?expected tuple and exact workflow bytes; only (?:the )?(?:authorized|requested) workflow validates public package identity and target-version absence/,
  );
  assert.doesNotMatch(
    readme,
    /Routine release preflight[^.;]*target-version absence/i,
  );
  assert.match(
    readme,
    /successful actual publish is the runtime proof that npm accepted that identity/,
  );
  assert.match(
    readme,
    /`npm run check`[\s\S]*one real `npm run release:candidate`[\s\S]*`npm run release:ci`[\s\S]*complete required local release graph/,
  );
  assert.match(
    readme,
    /`npm run release:check` is only an optional thin maintainer alias[\s\S]*planner, CI, and publication workflow never invoke it/,
  );

  assert.match(
    specification,
    /One owned expectation defines `GitHub Actions`[\s\S]*`kimyeongwoo\/kyw-dev`[\s\S]*\.github\/workflows\/publish\.yml[\s\S]*npm-production[\s\S]*npm publish/,
  );
  assert.match(
    specification,
    /without automatic trigger[\s\S]*token\/interactive\/account inspection[\s\S]*retry\/second dispatch\/fallback/,
  );
  assert.match(
    specification,
    /complete required local Release graph[\s\S]*`npm run check`[\s\S]*`npm run release:candidate`[\s\S]*`npm run release:ci`[\s\S]*`npm run release:check` is only an optional thin alias/,
  );
  assert.match(
    specification,
    /workflow requires current `main`, exact SHA, and package\/plugin version[\s\S]*Repository\/event\/ref\/input\/checkout\/runtime\/registry\/version-absence\/clean-tree mismatch[\s\S]*npm publish \. --ignore-scripts` once/,
  );
  assert.match(
    specification,
    /published version `0\.1\.4`[\s\S]*public npm registry serves `kyw-dev@0\.1\.4`[\s\S]*canonical metadata exposes matching `gitHead`[\s\S]*Tag `v0\.1\.4` and its GitHub Release identify it[\s\S]*Historical `0\.1\.2`[\s\S]*lacks `gitHead`/,
  );
  assert.match(
    specification,
    /Routine release preflight does not require npm account\/settings inspection[\s\S]*account auth is limited to setup[\s\S]*actual OIDC failure investigation/,
  );
  assert.match(
    specification,
    /Success proves npm accepted the OIDC identity[\s\S]*rejection blocks public release without demoting the Task/,
  );

  assert.match(architecture, /### 8\.5 Trusted publication workflow/);
  assert.match(
    architecture,
    /One repository-owned expectation[\s\S]*\.github\/workflows\/publish\.yml[\s\S]*The manual-only workflow is separate from credential-free CI/,
  );
  assert.match(
    architecture,
    /only its single[\s\S]*job receives `contents: read` plus `id-token: write`/,
  );
  assert.match(
    architecture,
    /`release:ci` composes Stable and candidate[\s\S]*publication workflow[\s\S]*does not rerun[\s\S]*Stable[\s\S]*optional dry run[\s\S]*publishes the exact real Git directory once with `npm publish \.`/,
  );
  assert.match(
    architecture,
    /Successful trusted publication[\s\S]*creates npm provenance automatically/,
  );
  assert.match(
    architecture,
    /actual successful publish[\s\S]*canonical runtime proof[\s\S]*OIDC\/publisher[\s\S]*rejection has one path[\s\S]*public release reports `BLOCKED`[\s\S]*without changing the terminal Task/,
  );
  assert.match(
    architecture,
    /development-only integration fixture[\s\S]*actual npm CLI[\s\S]*raw submitted packument[\s\S]*directory publication supplies the exact commit as `gitHead`[\s\S]*prebuilt tarball cannot synthesize[\s\S]*post-capture registry rewriting/,
  );
  assert.doesNotMatch(
    [readme, specification, architecture].join("\n"),
    /release-evidence-manual-runner|release-evidence-harness|release-gate-isolation|retained candidate|registry dry-run|isolated lifecycle verification/i,
  );

  for (const projection of [readme, specification, architecture]) {
    assert.match(projection, /\$kyw-deliver NNNN --public-release/);
    assert.match(projection, /STANDARD(?:`)? FINAL|STANDARD` graph is\s+final/i);
    assert.match(projection, /npm[^\n]{0,80}(?:→|then)[^\n]{0,80}tag[^\n]{0,80}(?:→|then)[^\n]{0,80}Release/i);
    assert.match(projection, /(?:terminal )?Task\/Test|terminal Task/i);
  }
  assert.match(
    specification,
    /`ABSENT`[\s\S]*`EXACT_ALREADY_COMPLETE`[\s\S]*`PENDING_PROOF`[\s\S]*`CONFLICT`[\s\S]*`UNKNOWN`/,
  );
  assert.match(architecture, /Development tests supply mocks or owned loopback[\s\S]*zero live public writes/);
});

test("permanent-document inventory and deliberate scope boundaries stay explicit", async () => {
  const [readme, specification, architecture] = await Promise.all([
    read("README.md"),
    read("docs/SPEC.md"),
    read("docs/ARCHITECTURE.md"),
  ]);
  const projectTemplates = (await readdir(join(REPOSITORY_ROOT, "templates", "project")))
    .filter((name) => name.endsWith(".md"))
    .sort();

  assert.deepEqual(projectTemplates, ["AGENTS.md", "ARCHITECTURE.md", "README.md", "SPEC.md"]);
  assert.deepEqual(
    PERMANENT_DOCUMENT_POLICY.documents.map(({ path }) => path),
    ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"],
  );
  assert.match(readme, /The four permanent documents are README, AGENTS, SPEC, and ARCHITECTURE/);
  assert.match(specification, /A managed project uses four permanent documents/);
  assert.match(
    specification,
    /Supporting installation\/discovery paths beyond managed direct user\/project Skills and Codex plugin marketplace\/cache bytes/,
  );
  assert.match(
    specification,
    /Supporting a current-contract `STANDARD` delivery ledger other than GitHub PR\/Actions exact-SHA evidence/,
  );
  assert.match(architecture, /## 12\. Deliberate scope boundaries/);
  for (const boundary of [
    /no delivery-provider interface/,
    /no generic install backend/,
    /no shared transaction\/filesystem framework/,
    /daemon, watcher,[\s\S]*filesystem\/process(?:\/OS)? tracing/,
    /no generated permanent-document summary/,
    /no automatic registry publish/,
  ]) {
    assert.match(architecture, boundary);
  }
  assert.match(architecture, /### 9\.1 Foundation and permanent-document policy/);
  assert.match(
    architecture,
    /historical Task\/Test evidence/,
  );
  assert.doesNotMatch(
    architecture,
    /\bTask 0\d{3}\b|READY_FOR_APPROVAL|UNCHANGED at the audited point/,
  );
});

test("permanent-document local Markdown references resolve to repository files", async () => {
  for (const relativePath of ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"]) {
    const markdown = await read(relativePath);
    for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
      const reference = match[1];
      if (/^(?:https?:|#)/.test(reference)) {
        continue;
      }
      const target = decodeURIComponent(reference.split("#", 1)[0]);
      await assert.doesNotReject(
        access(join(REPOSITORY_ROOT, dirname(relativePath), target)),
        `${relativePath} contains a missing local reference: ${reference}`,
      );
    }
  }
});

test("route-specific representative instruction bundles stay concise with one procedure reference", async () => {
  const routeBundles = await Promise.all(
    [REPRESENTATIVE_INSTRUCTION_PATHS, DELIVERY_INSTRUCTION_PATHS].map(
      async (paths) => Promise.all(paths.map((relativePath) => read(relativePath))),
    ),
  );
  for (const [index, contents] of routeBundles.entries()) {
    const label = index === 0 ? "implementation" : "delivery";
    const currentBytes = contents.reduce(
      (total, content) => total + Buffer.byteLength(content),
      0,
    );
    const currentTokenEstimate = Math.ceil(currentBytes / 4);
    assert.ok(
      currentBytes < REPRESENTATIVE_BUDGET_BYTES,
      `${label}: expected fewer than ${REPRESENTATIVE_BUDGET_BYTES} bytes, received ${currentBytes}`,
    );
    assert.ok(
      currentTokenEstimate < REPRESENTATIVE_TOKEN_BUDGET,
      `${label}: expected fewer than ${REPRESENTATIVE_TOKEN_BUDGET} estimated tokens, received ${currentTokenEstimate}`,
    );
    assert.ok(
      currentBytes <= REPRESENTATIVE_TARGET_BYTES,
      `${label}: expected at most ${REPRESENTATIVE_TARGET_BYTES} bytes, received ${currentBytes}`,
    );
    assert.ok(
      currentTokenEstimate <= REPRESENTATIVE_TARGET_TOKENS,
      `${label}: expected at most ${REPRESENTATIVE_TARGET_TOKENS} estimated tokens, received ${currentTokenEstimate}`,
    );
    assert.ok(
      REPRESENTATIVE_BUDGET_BYTES - currentBytes >= REQUIRED_BYTE_HEADROOM,
      `${label}: representative instructions must retain at least 4 KiB below the byte guard`,
    );
    assert.ok(
      REPRESENTATIVE_TOKEN_BUDGET - currentTokenEstimate >= REQUIRED_TOKEN_HEADROOM,
      `${label}: representative instructions must retain at least 1,024 estimated tokens below the token guard`,
    );
  }
  assert.equal(REPRESENTATIVE_INSTRUCTION_PATHS.length, 4);
  assert.equal(DELIVERY_INSTRUCTION_PATHS.length, 4);
  assert.equal(PERMANENT_INDEX_PATHS.length, 3);
  assert.deepEqual(PERMANENT_INDEX_PATHS, [
    "README.md",
    "docs/SPEC.md",
    "docs/ARCHITECTURE.md",
  ]);
  await Promise.all(PERMANENT_INDEX_PATHS.map((relativePath) => read(relativePath)));

  const authoringSkill = routeBundles[0][1];
  const implementationSkill = routeBundles[0][2];
  const deliverySkill = routeBundles[1][2];
  assert.deepEqual(
    [...authoringSkill.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((match) => match[1]),
    [],
  );
  const referenceLinks = [
    ...implementationSkill.matchAll(/\]\((references\/[^)]+\.md)\)/g),
  ].map((match) => match[1]);
  assert.deepEqual([...new Set(referenceLinks)], ["references/execution.md"]);
  const deliveryReferenceLinks = [
    ...deliverySkill.matchAll(/\]\((references\/[^)]+\.md)\)/g),
  ].map((match) => match[1]);
  assert.deepEqual([...new Set(deliveryReferenceLinks)], [
    "references/delivery.md",
    "references/public-release.md",
  ]);
  assert.equal(
    DELIVERY_INSTRUCTION_PATHS.includes(
      "skills/kyw-deliver/references/public-release.md",
    ),
    false,
    "plain STANDARD representative context must not load the public-release procedure",
  );
});

test("routine Task workflows index owners before targeted reads and escalate only when required", async () => {
  const [agents, agentsTemplate, init, task, implementation, execution, audit] =
    await Promise.all([
      read("AGENTS.md"),
      read("templates/project/AGENTS.md"),
      read("skills/kyw-init/SKILL.md"),
      read("skills/kyw-task/SKILL.md"),
      read("skills/kyw-impl/SKILL.md"),
      read("skills/kyw-impl/references/execution.md"),
      read("skills/kyw-audit/references/audit.md"),
    ]);

  for (const projection of [agents, agentsTemplate]) {
    assert.match(
      projection,
      /Always load applicable `AGENTS\.md`[\s\S]{0,100}active kyw workflow[\s\S]{0,80}selected\/current Task\/Test pair[\s\S]{0,100}inactive ordinary prompts? (?:does not select one|select(?:s)? none)/,
    );
    assert.match(projection, /Index or search README, SPEC, and ARCHITECTURE first/);
    assert.match(projection, /read only owner sections selected by [Gg]oal, scope/);
    assert.match(
      projection,
      /Read all four(?: permanent documents)? for `kyw-init`, rebaseline/,
    );
    assert.match(projection, /[Ss]top (?:if|on) (?:a )?unresolved conflict/);
  }

  for (const workflow of [task, execution, audit]) {
    assert.match(
      workflow,
      /applicable[\s\S]{0,80}`?AGENTS\.md`?|applicable repository instructions/i,
    );
    assert.match(
      workflow,
      /(?:Index or search headings in `?README(?:\.md)?`?,\s*`?(?:docs\/)?SPEC(?:\.md)?`?,\s*and\s*`?(?:docs\/)?ARCHITECTURE(?:\.md)?`?|Search README, SPEC, and ARCHITECTURE headings)/,
    );
    assert.match(
      workflow,
      /(?:read|to) (?:only the\s+owning permanent-document sections|owner sections)/i,
    );
    assert.match(
      workflow,
      /(?:full(?:y)? read|full read of|read) all (?:(?:existing|four) )?permanent documents/i,
    );
    assert.match(workflow, /source conflict|conflicting work/i);
    assert.match(
      workflow,
      /stop(?: with `BLOCKED`)? (?:if a conflict remains unresolved|on unresolved conflict|when a source conflict remains\s+unresolved)/i,
    );
    assert.doesNotMatch(
      workflow,
      /Read `README\.md`, `AGENTS\.md`, `docs\/SPEC\.md`, and `docs\/ARCHITECTURE\.md`/,
    );
  }

  assert.match(init, /every `kyw-init` mode[\s\S]*full read/i);
  assert.match(init, /all four existing permanent-document paths/);
  assert.match(implementation, /\[Task Execution and Resume\]\(references\/execution\.md\)/);
  assert.doesNotMatch(implementation, /Index or search headings in README/);
});

test("maintainer Task prompts use short invocation instead of an external mega-prompt", async () => {
  const prompts = await read("CODEX_PROMPTS.md");

  assert.match(prompts, /^task 0001 실행해줘$/m);
  assert.match(prompts, /^\$kyw-task "<outcome>"$/m);
  assert.match(prompts, /^\$kyw-impl 0001$/m);
  assert.match(prompts, /^task 진행해줘$/m);
  assert.match(prompts, /^남은 task 계속 실행해줘$/m);
  assert.doesNotMatch(prompts, /^## 최초 구현 프롬프트$/m);
  assert.doesNotMatch(prompts, /^## 다음 Task 실행 프롬프트$/m);
  assert.doesNotMatch(prompts, /^## Compact 또는 새 세션 이후 재개 프롬프트$/m);
  assert.doesNotMatch(prompts, /다음만 읽는다|완료 조건과 검증의 대응 관계/);
  assert.ok(Buffer.byteLength(prompts) < BASELINE_PROMPT_BYTES);
});

test("Task runtime has no model or reasoning-effort mutation path", async () => {
  const runtimePaths = [
    "src/core/task-artifacts.mjs",
    "skills/kyw-task/scripts/task-artifacts.mjs",
  ];
  for (const relativePath of runtimePaths) {
    const runtime = await read(relativePath);
    assert.doesNotMatch(
      runtime,
      /--model\b|--reasoning-effort\b|model_reasoning_effort\s*=|reasoning_effort\s*=/,
      relativePath,
    );
  }

  const execution = await read("skills/kyw-impl/references/execution.md");
  assert.match(execution, /Inherit the active session's configured model and reasoning effort/);
  assert.match(execution, /unless the current user explicitly requests it/);
  assert.match(execution, /use `UNAVAILABLE` for unexposed fields/);
});

test("installation guidance distinguishes supported surfaces, scopes, aliases, and duplicate resolution", async () => {
  const [readme, spec, architecture] = await Promise.all([
    read("README.md"),
    read("docs/SPEC.md"),
    read("docs/ARCHITECTURE.md"),
  ]);

  for (const officialSource of [
    "https://learn.chatgpt.com/docs/build-skills",
    "https://learn.chatgpt.com/docs/build-plugins",
    "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
  ]) {
    assert.ok(readme.includes(officialSource), `missing official source ${officialSource}`);
  }
  for (const row of [
    "| Codex CLI |",
    "| ChatGPT desktop Codex |",
    "| Codex IDE extension |",
    "| Repository scope |",
    "| User scope |",
  ]) {
    assert.ok(readme.includes(row), `missing compatibility row ${row}`);
  }
  assert.match(readme, /Plugins are not available in the IDE extension/);
  assert.match(readme, /`install --scope project`/);
  assert.match(readme, /`install --scope user`/);
  assert.match(
    readme,
    /The portable `\$kyw-grilling`, `\$kyw-init`, `\$kyw-task "<outcome>"`, `\$kyw-impl NNNN`, `\$kyw-deliver NNNN`, and `\$kyw-audit NNNN` forms/,
  );
  assert.match(
    readme,
    /surface without the managed contract uses `\$kyw-impl NNNN`/,
  );
  assert.match(readme, /removing a plugin through the supported plugin browser/);
  assert.match(readme, /Direct Skills and plugin installation are alternatives, not layers to combine/);
  assert.match(
    readme,
    /`--force` may remove modified regular files already named by valid ownership metadata/,
  );
  assert.match(readme, /it never broadens ownership to unknown files/);

  assert.match(
    spec,
    /duplicate Skill names/,
  );
  assert.match(spec, /Plugin-cache discovery reports installed bytes and source without claiming/);
  assert.match(architecture, /plugin-cache Skill sources/);
  assert.match(
    architecture,
    /Cache presence proves installed[\s\S]*bytes, not enabled session state/,
  );
  assert.match(architecture, /never follows a linked or unsupported[\s\S]*component/);
});
