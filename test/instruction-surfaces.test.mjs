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
const PERMANENT_INDEX_PATHS = Object.freeze([
  "README.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
]);

async function read(relativePath) {
  return readFile(join(REPOSITORY_ROOT, relativePath), "utf8");
}

function authorityBoundary(action, defaultAttempt) {
  return Object.freeze({
    action: action.action,
    target: action.target,
    scope: action.scope,
    scopeGroup: action.scopeGroup,
    attempt: action.attempt ?? defaultAttempt,
  });
}

function authorityBoundaryKey(action) {
  return [action.action, action.target, action.scope, action.attempt].join("|");
}

function authorityBoundaryMatches(action, match) {
  const fixedFieldsMatch = ["action", "target", "attempt"].every(
    (field) => match[field] === undefined || action[field] === match[field],
  );
  const scopeMatches =
    match.scope === undefined ||
    action.scope === match.scope ||
    (typeof action.scopeGroup === "string" &&
      action.scopeGroup.length > 0 &&
      action.scopeGroup === match.scopeGroup);
  return fixedFieldsMatch && scopeMatches;
}

function authorityActionsAreResolved(actions, defaultAttempt) {
  return (
    actions.length > 0 &&
    actions.every((action) =>
      [action.action, action.target, action.scope, action.attempt ?? defaultAttempt].every(
        (field) => typeof field === "string" && field.length > 0,
      ),
    )
  );
}

function runAuthorityContractScenario(turns) {
  const grants = new Map();
  const closedAttempts = new Set();
  const snapshots = [];
  let immediatelyPriorTurn;

  const removeMatching = (matches, defaultAttempt) => {
    for (const rawMatch of matches) {
      const match = authorityBoundary(rawMatch, defaultAttempt);
      for (const [key, grant] of grants) {
        if (authorityBoundaryMatches(grant, match)) grants.delete(key);
      }
    }
  };

  const replaceRelevantGrants = (actions, defaultAttempt) => {
    for (const rawAction of actions) {
      const action = authorityBoundary(rawAction, defaultAttempt);
      for (const [key, grant] of grants) {
        if (authorityBoundaryMatches(grant, action)) grants.delete(key);
      }
      grants.set(authorityBoundaryKey(action), action);
    }
  };

  const usesOnlyOpenAttempts = (actions, defaultAttempt) =>
    actions.every(
      (action) => !closedAttempts.has(action.attempt ?? defaultAttempt),
    );

  const closeAttempts = (matches, defaultAttempt) => {
    for (const match of matches) {
      const attempt = match.attempt ?? defaultAttempt;
      if (typeof attempt === "string" && attempt.length > 0) {
        closedAttempts.add(attempt);
      }
    }
  };

  for (const turn of turns) {
    if (["attempt-terminal", "target-scope-drift"].includes(turn.speechAct)) {
      const matches = turn.matches ?? [{ attempt: turn.attempt }];
      removeMatching(matches, turn.attempt);
      closeAttempts(matches, turn.attempt);
    } else if (turn.source === "current-user" && turn.trusted !== false) {
      const actions = turn.actions ?? [];
      if (turn.speechAct === "imperative") {
        removeMatching(turn.matches ?? actions, turn.attempt);
        if (
          turn.affirmative &&
          turn.actNow &&
          authorityActionsAreResolved(actions, turn.attempt) &&
          usesOnlyOpenAttempts(actions, turn.attempt)
        ) {
          replaceRelevantGrants(actions, turn.attempt);
        }
      } else if (turn.speechAct === "conditional") {
        removeMatching(actions, turn.attempt);
        const condition = turn.condition ?? {};
        if (
          turn.actNow &&
          authorityActionsAreResolved(actions, turn.attempt) &&
          usesOnlyOpenAttempts(actions, turn.attempt) &&
          condition.objective &&
          condition.verifiable &&
          condition.satisfied &&
          !condition.subjective &&
          !condition.future
        ) {
          replaceRelevantGrants(actions, turn.attempt);
        }
      } else if (
        ["prohibition", "revocation", "cancellation", "ambiguous-conflict"].includes(
          turn.speechAct,
        )
      ) {
        const matches = turn.matches ?? actions;
        removeMatching(matches, turn.attempt);
        if (turn.speechAct === "cancellation") {
          closeAttempts(matches, turn.attempt);
        }
      } else if (turn.speechAct === "scope-reduction") {
        const activeBeforeReduction = [...grants.values()].some((grant) =>
          (turn.matches ?? []).some((match) =>
            authorityBoundaryMatches(grant, authorityBoundary(match, turn.attempt)),
          ),
        );
        removeMatching(turn.matches ?? [], turn.attempt);
        if (
          activeBeforeReduction &&
          authorityActionsAreResolved(actions, turn.attempt) &&
          usesOnlyOpenAttempts(actions, turn.attempt)
        ) {
          replaceRelevantGrants(actions, turn.attempt);
        }
      } else if (turn.speechAct === "assent" && turn.unambiguous) {
        const proposal = immediatelyPriorTurn;
        if (
          proposal?.source === "assistant" &&
          proposal.speechAct === "execution-proposal" &&
          proposal.single &&
          proposal.concrete &&
          proposal.resolved &&
          !proposal.alternatives &&
          authorityActionsAreResolved(proposal.actions ?? [], proposal.attempt) &&
          usesOnlyOpenAttempts(proposal.actions ?? [], proposal.attempt)
        ) {
          replaceRelevantGrants(proposal.actions ?? [], proposal.attempt);
        }
      }
    }

    const authorized = [...grants.keys()].sort();
    snapshots.push(Object.freeze({ authorized: Object.freeze(authorized) }));
    immediatelyPriorTurn = turn;
  }

  return Object.freeze({
    authorized: Object.freeze([...grants.keys()].sort()),
    snapshots: Object.freeze(snapshots),
  });
}

function classifyCombinedSuffixScenario(invocation, actionByTarget) {
  const clauses = invocation.overrideText
    .split(";")
    .map((clause) => clause.trim())
    .filter(Boolean);
  const taskOverrides = [];
  const authorityTurns = [];
  const classifications = [];

  for (const clause of clauses) {
    const taskConstraint = clause.match(/^run only (.+ checks)$/i);
    const contradictoryPublish = clause.match(
      /^(?:then )?publish (\S+) to npm now but do not publish \1$/i,
    );
    const publish = clause.match(/^(?:then )?publish (\S+) to npm now$/i);
    const prohibition = clause.match(/^do not publish (\S+) to npm$/i);

    if (taskConstraint) {
      taskOverrides.push(clause);
      classifications.push({ kind: "TASK_OVERRIDE", text: clause });
    } else if (contradictoryPublish) {
      const action = actionByTarget.get(contradictoryPublish[1]);
      classifications.push({ kind: "AMBIGUOUS_CONFLICT", text: clause });
      if (action) {
        authorityTurns.push({
          source: "current-user",
          speechAct: "ambiguous-conflict",
          attempt: action.attempt,
          matches: [action],
        });
      }
    } else if (publish) {
      const action = actionByTarget.get(publish[1]);
      classifications.push({ kind: "EXTERNAL_AUTHORITY", text: clause });
      if (action) {
        authorityTurns.push({
          source: "current-user",
          speechAct: "imperative",
          affirmative: true,
          actNow: true,
          attempt: action.attempt,
          actions: [action],
        });
      }
    } else if (prohibition) {
      const action = actionByTarget.get(prohibition[1]);
      classifications.push({ kind: "PROHIBITION", text: clause });
      if (action) {
        authorityTurns.push({
          source: "current-user",
          speechAct: "prohibition",
          attempt: action.attempt,
          matches: [action],
        });
      }
    } else {
      classifications.push({ kind: "NON_AUTHORITY", text: clause });
    }
  }

  return Object.freeze({
    routingDecisions: invocation.recognized ? 1 : 0,
    redispatchCandidates: Object.freeze(
      clauses.filter((clause) => parseTaskInvocation(clause).recognized),
    ),
    taskOverrides: Object.freeze(taskOverrides),
    overrideClassification:
      taskOverrides.length > 0
        ? "TASK_OVERRIDE_PRESENT"
        : "NO_TASK_OVERRIDE",
    authorityTurns: Object.freeze(authorityTurns),
    classifications: Object.freeze(classifications),
  });
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
    /Product behavior is owned by \[SPEC\][\s\S]*detailed implementation procedure by \[`kyw-impl`\]/,
  );
  for (const projection of [agents, agentsTemplate]) {
    assert.match(
      projection,
      /Always load applicable `AGENTS\.md` and the selected\/current Task\/Test pair/,
    );
    assert.match(projection, /Index or search README, SPEC, and ARCHITECTURE first/);
    assert.match(
      projection,
      /Read all four(?: permanent documents)? for `kyw-init`, rebaseline/,
    );
    for (const routingAnchor of [
      "All five `kyw-*` Skills are explicit-only",
      "`$kyw-impl NNNN` is portable for existing Tasks",
      "Keep one Task active",
      "Task/Test owns repository outcome; GitHub gates mutable delivery",
    ]) {
      assert.ok(projection.includes(routingAnchor), routingAnchor);
    }
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
    /adapter[\s\S]{0,120}delegates[\s\S]{0,120}internal-key derivation[\s\S]{0,120}canonical owner/i,
  );
  assert.match(authoring, /`key`\/`taskKey`[\s\S]{0,80}low-level compatibility/i);
  assert.doesNotMatch(authoring, /Give each new outcome[^\n]*taskKey/i);
  assert.doesNotMatch(
    authoring,
    /\b48(?:-|\s)*(?:character|char|자)|INVALID_TASK_BATCH[\s\S]{0,100}(?:short|key)/i,
  );
  assert.match(authoring, /READY\/READY[\s\S]{0,40}(?:pair set and stops|authoring)/i);
  assert.match(authoring, /needs a new `\$kyw-impl NNNN`/);
  assert.match(implementation, /\[Task Execution and Resume\]\(references\/execution\.md\)/);
  assert.match(implementation, /existing Task/i);
  assert.match(execution, /canonical detailed execution procedure/);
  assert.doesNotMatch(implementation, /create-batch --tasks-root/);

  for (const surface of [readme, spec]) {
    assert.match(surface, /\$kyw-task "<(?:goal|outcome|confirmed outcome)>"/i);
    assert.match(surface, /\$kyw-impl NNNN/);
  }
  assert.match(architecture, /kyw-task/i);
  assert.match(architecture, /kyw-impl/i);
  assert.match(spec, /READY\/READY[\s\S]*stop/i);
  assert.match(spec, /does not (?:invoke|chain)[\s\S]*`?\$kyw-impl/i);
  assert.match(readme, /\$kyw-task "goal"[\s\S]*authors[\s\S]*stops/i);
  assert.match(readme, /Continuous mode remains serial and lasts only for the current invocation/);
  assert.match(readme, /automatic selection resumes active work, then resumable `STANDARD` delivery/);
  assert.match(readme, /one-line `\$kyw-impl NNNN` path validates/);
  assert.match(readme, /fixed-bounded checkpoint in exact aligned `main`/);
  assert.match(readme, /at most one uncovered prior/);
  assert.match(readme, /Expired Actions logs for covered/);
  assert.match(readme, /explicit migration\/rebaseline instead of automatic history replay/);
  assert.match(spec, /before (?:its )?one dispatcher call/);
  assert.match(architecture, /bounded local-Git \/ GitHub hydration inputs/);
  assert.match(readme, /surface without the managed contract uses `\$kyw-impl NNNN`/);
  assert.match(
    readme,
    /selected `IMPLEMENT`, `RESUME`, or `DELIVER` result authorizes ordinary Task delivery/,
  );
  assert.match(
    architecture,
    /no automatic registry publish, version\/tag\/Release creation, public[\s\S]*submission, force push, CI rerun, or branch-protection bypass/,
  );
  for (const surface of [readme, spec, architecture]) {
    assert.match(surface, /actual PR[- ]head|actual[- ]head/i);
    assert.match(surface, /merge compatib/i);
    assert.match(surface, /post-merge/i);
  }
  assert.match(execution, /actualHead/);
  assert.match(execution, /merge compatib/i);
  assert.match(execution, /postMerge/);
  assert.match(execution, /HARDENED_EXACT_HEAD/);
  assert.match(execution, /LEGACY_PRE_CONTRACT/);
  assert.match(execution, /DURABLE_STANDARD_CONTINUITY/);
  assert.match(execution, /without automatic whole-history replay/);
  assert.match(execution, /separate `bootstrap-continuity` command/);
  assert.match(execution, /not a dispatch option, source-repair path, or Task-ID exception/);
  assert.match(execution, /apply-continuity/);
  assert.match(execution, /actualHead: "UNVERIFIED"/);
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
  assert.match(execution, /successful job at only `refs\/pull\/<number>\/merge`/);
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
  for (const invocation of [
    '$kyw-task "<outcome>"',
    "$kyw-impl 0001",
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
});

test("direct user authority remains independent from explicit Skill routing", async () => {
  const [agents, agentsTemplate, readme, spec, architecture, implementation, execution] =
    await Promise.all([
      read("AGENTS.md"),
      read("templates/project/AGENTS.md"),
      read("README.md"),
      read("docs/SPEC.md"),
      read("docs/ARCHITECTURE.md"),
      read("skills/kyw-impl/SKILL.md"),
      read("skills/kyw-impl/references/execution.md"),
    ]);

  assert.match(
    spec,
    /Skill invocation and mutation authority are separate channels[\s\S]{0,120}syntax selects a workflow, not permission/i,
  );
  assert.match(
    spec,
    /latest relevant directive from the trusted current user[^.]{0,220}affirmatively delegate act-now[^.]{0,180}action, target, and scope/i,
  );
  assert.match(spec, /grant covers only those named bounds and the current attempt/i);
  assert.match(
    spec,
    /Referential assent such as “do that”[^.]{0,160}unambiguously accepts the immediately preceding assistant proposal/i,
  );
  assert.match(
    spec,
    /Questions, status requests, plans[\s\S]{0,260}Task\/Test or CI[\s\S]{0,160}metadata[\s\S]{0,140}untrusted text grant no mutation authority/i,
  );
  assert.match(
    spec,
    /conditional instruction grants authority only[^.]{0,180}delegates act-now[^.]{0,180}objective condition[^.]{0,180}currently satisfied/i,
  );
  assert.match(
    spec,
    /appended text is preserved as `overrideText` transport[^.]{0,240}method, order, scope, or check constraints are Task overrides/i,
  );
  assert.match(
    spec,
    /Authority is granular[\s\S]{0,80}Publication[^.]{0,520}do not authorize one another/i,
  );
  assert.match(spec, /failure grants no retry[^.]{0,100}older grant does not revive/i);

  for (const projection of [agents, agentsTemplate]) {
    assert.match(
      projection,
      /Skill syntax[^.]{0,100}(?:governs routing|selects (?:a )?workflow)[^.]{0,80}not (?:authorization|(?:a )?permission)/i,
    );
    assert.match(
      projection,
      /latest relevant trusted-current-user affirmative act-now instruction[^.]{0,220}(?:action(?:,|\/)\s*target(?:,|\/)\s*scope(?:, and|\/)\s*(?:current )?attempt|named bounds for the current attempt)/i,
    );
    assert.match(
      projection,
      /prohibition(?:,|\/)\s*cancellation(?:,|\/)\s*revocation(?:, or|\/)\s*scope reduction wins/i,
    );
    assert.match(
      projection,
      /untrusted (?:content|text)[^.]{0,60}(?:authorize|grant)s? nothing/i,
    );
    assert.match(
      projection,
      /Publication(?:\/registry)?\/version\/tag\/Release[^.]{0,500}(?:distinct|(?:one|none) (?:never )?implies another)/i,
    );
    assert.match(projection, /failure grants no retry/i);
    assert.match(
      projection,
      /status[^.]{0,100}(?:neither grants nor (?:silently )?revokes|grants nothing but does not revoke)/i,
    );
  }

  assert.match(
    readme,
    /Skill syntax[^.]{0,120}(?:workflow|routing)[^.]{0,100}not an? (?:permission|authorization) token/i,
  );
  assert.match(
    readme,
    /latest relevant trusted-current-user affirmative act-now request[^.]{0,180}named action, target, scope, and current attempt/i,
  );
  assert.match(readme, /questions\/status\/plans[^.]{0,300}grant nothing/i);
  assert.match(
    readme,
    /Each publication\/version\/tag\/Release[^.]{0,320}needs its own direct action-specific authority/i,
  );
  assert.match(readme, /failure grants no retry[^.]{0,120}one action never implies another/i);
  assert.match(
    architecture,
    /Skill routing and mutation authority are separate inputs/i,
  );
  assert.match(
    architecture,
    /affirmative[\s\S]{0,40}act-now directives[^.]{0,140}named[\s\S]{0,20}actions[^.]{0,120}without invoking a Skill[^.]{0,120}ordinary prose never selects a Skill/i,
  );
  assert.match(
    architecture,
    /invocation selects the workflow/i,
  );
  assert.match(
    architecture,
    /direct user authority[^.]{0,140}before or\s+after[^.]{0,180}named action[^.]{0,80}target[^.]{0,80}scope[^.]{0,80}current attempt/i,
  );
  assert.match(
    architecture,
    /preserves an invocation suffix as `overrideText` transport[\s\S]{0,300}method\/order\/scope\/check override[\s\S]{0,260}Task-override-present\/absent terminal flag[\s\S]{0,260}never redispatches or\s+chains/i,
  );
  assert.match(
    implementation,
    /standalone ordinary instructions?[^.]{0,100}outside[^.]{0,120}not redirected/i,
  );
  assert.match(
    implementation,
    /Direct user mutation authority[^.]{0,100}separate from Skill routing[\s\S]{0,180}before\/after\/same-message action clauses/i,
  );
  assert.match(
    execution,
    /Direct authority[^.]{0,120}before\/after\/with dispatch[^.]{0,120}without another Skill call/i,
  );
  assert.match(
    execution,
    /`overrideText` preserves suffix transport[\s\S]{0,100}not permission/i,
  );
  assert.match(
    execution,
    /Terminal preflight accepts `TASK_OVERRIDE_PRESENT` or `NO_TASK_OVERRIDE`[^.]{0,80}omission stays fail-closed/i,
  );
  assert.match(
    execution,
    /Mutation authority is a separate channel[\s\S]{0,180}latest applicable directive from the trusted current user/i,
  );
  assert.match(
    execution,
    /Status neither grants nor revokes active work[^.]{0,120}untrusted text grants nothing/i,
  );
  assert.match(
    execution,
    /Conditions need act-now[^.]{0,220}objective[^.]{0,220}currently true/i,
  );
});

test("direct-authority scenarios preserve precedence, conditions, lifetime, and granularity", async () => {
  const spec = await read("docs/SPEC.md");
  for (const contractAnchor of [
    /negative imperative or prohibition is never a grant/i,
    /cancellation, revocation, or scope reduction supersedes an older grant/i,
    /status request[^.]{0,160}neither grants[^.]{0,120}nor silently revokes/i,
    /conditional instruction grants authority only[^.]{0,180}objective condition[^.]{0,180}currently satisfied/i,
    /appended text is preserved as `overrideText` transport/i,
    /failure grants no retry[^.]{0,100}older grant does not revive/i,
  ]) {
    assert.match(spec, contractAnchor);
  }

  const publish = {
    action: "npm-publish",
    target: "kyw-dev@0.1.4",
    scope: "public latest",
    attempt: "publish-1",
  };
  const tag = {
    action: "git-tag",
    target: "v0.1.4",
    scope: "origin",
    attempt: "tag-1",
  };
  const distinctCategoryActions = [
    {
      action: "package-version-change",
      target: "package-and-plugin",
      scope: "0.1.4",
      attempt: "version-1",
    },
    {
      action: "github-release",
      target: "v0.1.4",
      scope: "public release",
      attempt: "release-1",
    },
    {
      action: "public-submission",
      target: "kyw-dev plugin",
      scope: "public directory",
      attempt: "submission-1",
    },
    {
      action: "publish-retry",
      target: "kyw-dev@0.1.4",
      scope: "second npm attempt",
      attempt: "publish-2",
    },
    {
      action: "credential-fallback",
      target: "kyw-dev@0.1.4",
      scope: "npm token fallback",
      attempt: "fallback-1",
    },
    {
      action: "force-push",
      target: "task/0080-honor-direct-user-authority",
      scope: "origin",
      attempt: "force-1",
    },
    {
      action: "branch-delete",
      target: "task/0080-honor-direct-user-authority",
      scope: "origin",
      attempt: "delete-1",
    },
    {
      action: "npm-account-change",
      target: "npm-production trusted publisher",
      scope: "account configuration",
      attempt: "account-1",
    },
    {
      action: "admin-bypass",
      target: "main protection",
      scope: "GitHub repository",
      attempt: "bypass-1",
    },
  ];
  const publishKey = authorityBoundaryKey(publish);
  const tagKey = authorityBoundaryKey(tag);
  const grantPublish = {
    source: "current-user",
    speechAct: "imperative",
    affirmative: true,
    actNow: true,
    attempt: publish.attempt,
    actions: [publish],
  };

  assert.deepEqual(runAuthorityContractScenario([grantPublish]).authorized, [publishKey]);
  assert.deepEqual(
    runAuthorityContractScenario([{ ...grantPublish, actNow: false }]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      { ...grantPublish, actNow: false },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      { ...grantPublish, speechAct: "prohibition", affirmative: false },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      { ...grantPublish, affirmative: false },
    ]).authorized,
    [],
  );
  const prohibitedAfterGrant = runAuthorityContractScenario([
    grantPublish,
    {
      source: "current-user",
      speechAct: "prohibition",
      attempt: publish.attempt,
      matches: [publish],
    },
  ]);
  assert.deepEqual(
    prohibitedAfterGrant.snapshots.map(({ authorized }) => authorized),
    [[publishKey], []],
  );
  const cancelled = runAuthorityContractScenario([
    grantPublish,
    {
      source: "current-user",
      speechAct: "cancellation",
      attempt: publish.attempt,
      matches: [publish],
    },
  ]);
  assert.deepEqual(
    cancelled.snapshots.map(({ authorized }) => authorized),
    [[publishKey], []],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      {
        source: "current-user",
        speechAct: "cancellation",
        attempt: publish.attempt,
        matches: [publish],
      },
      grantPublish,
    ]).authorized,
    [],
  );
  const publishAfterCancellation = {
    ...publish,
    attempt: "publish-after-cancellation",
  };
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      {
        source: "current-user",
        speechAct: "cancellation",
        attempt: publish.attempt,
        matches: [publish],
      },
      {
        ...grantPublish,
        attempt: publishAfterCancellation.attempt,
        actions: [publishAfterCancellation],
      },
    ]).authorized,
    [authorityBoundaryKey(publishAfterCancellation)],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      {
        ...grantPublish,
        actions: [{ ...publish, target: undefined }],
      },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      {
        ...grantPublish,
        actions: [{ ...publish, target: undefined }],
      },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      {
        source: "current-user",
        speechAct: "revocation",
        attempt: publish.attempt,
        matches: [publish],
      },
    ]).authorized,
    [],
  );
  const reducedPublish = { ...publish, scope: "public dist-tag latest only" };
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      {
        source: "current-user",
        speechAct: "scope-reduction",
        attempt: publish.attempt,
        matches: [publish],
        actions: [reducedPublish],
      },
    ]).authorized,
    [authorityBoundaryKey(reducedPublish)],
  );

  const statusAfterGrant = runAuthorityContractScenario([
    grantPublish,
    { source: "current-user", speechAct: "status" },
  ]);
  assert.deepEqual(
    statusAfterGrant.snapshots.map(({ authorized }) => authorized),
    [[publishKey], [publishKey]],
  );

  const satisfiedConditional = {
    source: "current-user",
    speechAct: "conditional",
    actNow: true,
    attempt: publish.attempt,
    actions: [publish],
    condition: {
      objective: true,
      verifiable: true,
      satisfied: true,
      subjective: false,
      future: false,
    },
  };
  assert.deepEqual(
    runAuthorityContractScenario([satisfiedConditional]).authorized,
    [publishKey],
  );
  for (const invalidConditional of [
    { ...satisfiedConditional, actNow: false },
    {
      ...satisfiedConditional,
      condition: { ...satisfiedConditional.condition, satisfied: false },
    },
    {
      ...satisfiedConditional,
      condition: { ...satisfiedConditional.condition, verifiable: false },
    },
    {
      ...satisfiedConditional,
      condition: { ...satisfiedConditional.condition, objective: false },
    },
    {
      ...satisfiedConditional,
      condition: { ...satisfiedConditional.condition, subjective: true },
    },
    {
      ...satisfiedConditional,
      condition: { ...satisfiedConditional.condition, future: true },
    },
  ]) {
    assert.deepEqual(runAuthorityContractScenario([invalidConditional]).authorized, []);
  }
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      {
        ...satisfiedConditional,
        condition: { ...satisfiedConditional.condition, satisfied: false },
      },
    ]).authorized,
    [],
  );
  const broadPublish = {
    ...publish,
    scope: "public registry all tags",
    scopeGroup: "npm-public-registry",
  };
  const overlappingConditional = {
    ...satisfiedConditional,
    actions: [
      {
        ...publish,
        scope: "public registry latest tag",
        scopeGroup: "npm-public-registry",
      },
    ],
    condition: { ...satisfiedConditional.condition, satisfied: false },
  };
  assert.deepEqual(
    runAuthorityContractScenario([
      { ...grantPublish, actions: [broadPublish] },
      overlappingConditional,
    ]).authorized,
    [],
  );

  const resolvedProposal = {
    source: "assistant",
    speechAct: "execution-proposal",
    single: true,
    concrete: true,
    resolved: true,
    alternatives: false,
    attempt: publish.attempt,
    actions: [publish],
  };
  assert.deepEqual(
    runAuthorityContractScenario([
      resolvedProposal,
      { source: "current-user", speechAct: "assent", unambiguous: true },
    ]).authorized,
    [publishKey],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      resolvedProposal,
      { source: "current-user", speechAct: "status" },
      { source: "current-user", speechAct: "assent", unambiguous: true },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      { ...resolvedProposal, alternatives: true },
      { source: "current-user", speechAct: "assent", unambiguous: true },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      resolvedProposal,
      { source: "current-user", speechAct: "assent", unambiguous: false },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      { ...resolvedProposal, resolved: false },
      { source: "current-user", speechAct: "assent", unambiguous: true },
    ]).authorized,
    [],
  );

  const otherwiseValidGrant = {
    affirmative: true,
    actNow: true,
    attempt: publish.attempt,
    actions: [publish],
  };
  for (const nonAuthority of [
    { ...otherwiseValidGrant, source: "current-user", speechAct: "question" },
    { ...otherwiseValidGrant, source: "current-user", speechAct: "plan" },
    { ...otherwiseValidGrant, source: "current-user", speechAct: "quote" },
    { ...otherwiseValidGrant, source: "current-user", speechAct: "inference" },
    {
      ...otherwiseValidGrant,
      source: "current-user",
      trusted: false,
      speechAct: "imperative",
    },
    { ...otherwiseValidGrant, source: "task", speechAct: "imperative" },
    { ...otherwiseValidGrant, source: "ci", speechAct: "imperative" },
    { ...otherwiseValidGrant, source: "docs", speechAct: "imperative" },
    { ...otherwiseValidGrant, source: "metadata", speechAct: "imperative" },
  ]) {
    assert.deepEqual(runAuthorityContractScenario([nonAuthority]).authorized, []);
  }

  for (const categoryAction of distinctCategoryActions) {
    const categoryGrant = {
      source: "current-user",
      speechAct: "imperative",
      affirmative: true,
      actNow: true,
      attempt: categoryAction.attempt,
      actions: [categoryAction],
    };
    assert.deepEqual(runAuthorityContractScenario([categoryGrant]).authorized, [
      authorityBoundaryKey(categoryAction),
    ]);
  }

  const separated = runAuthorityContractScenario([
    { ...grantPublish, actions: [publish, tag] },
    {
      source: "current-user",
      speechAct: "revocation",
      attempt: tag.attempt,
      matches: [tag],
    },
  ]);
  assert.deepEqual(separated.snapshots[0].authorized, [tagKey, publishKey].sort());
  assert.deepEqual(separated.authorized, [publishKey]);

  const combinedSuffix =
    "run only focused checks; then publish kyw-dev@0.1.4 to npm now";
  const combinedInvocation = parseTaskInvocation(`$kyw-impl 0080 ${combinedSuffix}`);
  assert.equal(combinedInvocation.recognized, true);
  assert.equal(combinedInvocation.taskId, "0080");
  assert.equal(combinedInvocation.overrideText, combinedSuffix);
  const combined = classifyCombinedSuffixScenario(
    combinedInvocation,
    new Map([[publish.target, publish]]),
  );
  assert.deepEqual(
    combined.classifications,
    [
      { kind: "TASK_OVERRIDE", text: "run only focused checks" },
      {
        kind: "EXTERNAL_AUTHORITY",
        text: "then publish kyw-dev@0.1.4 to npm now",
      },
    ],
  );
  assert.deepEqual(combined.taskOverrides, ["run only focused checks"]);
  assert.equal(combined.overrideClassification, "TASK_OVERRIDE_PRESENT");
  assert.deepEqual(
    evaluateTaskExecutionPreflight({
      overrideClassification: combined.overrideClassification,
    }),
    {
      safe: true,
      issues: [],
      overrideClassification: "TASK_OVERRIDE_PRESENT",
    },
  );
  assert.deepEqual(
    runAuthorityContractScenario(combined.authorityTurns).authorized,
    [publishKey],
  );
  assert.equal(combined.routingDecisions, 1);
  assert.deepEqual(combined.redispatchCandidates, []);

  const externalOnlyInvocation = parseTaskInvocation(
    "$kyw-impl 0080 then publish kyw-dev@0.1.4 to npm now",
  );
  const externalOnly = classifyCombinedSuffixScenario(
    externalOnlyInvocation,
    new Map([[publish.target, publish]]),
  );
  assert.deepEqual(externalOnly.taskOverrides, []);
  assert.equal(externalOnly.overrideClassification, "NO_TASK_OVERRIDE");
  assert.deepEqual(
    evaluateTaskExecutionPreflight({
      overrideClassification: externalOnly.overrideClassification,
    }),
    {
      safe: true,
      issues: [],
      overrideClassification: "NO_TASK_OVERRIDE",
    },
  );

  const contradictoryInvocation = parseTaskInvocation(
    "$kyw-impl 0080 run only focused checks; publish kyw-dev@0.1.4 to npm now but do not publish kyw-dev@0.1.4",
  );
  const contradictory = classifyCombinedSuffixScenario(
    contradictoryInvocation,
    new Map([[publish.target, publish]]),
  );
  assert.deepEqual(
    contradictory.classifications.map(({ kind }) => kind),
    ["TASK_OVERRIDE", "AMBIGUOUS_CONFLICT"],
  );
  assert.deepEqual(
    runAuthorityContractScenario([grantPublish, ...contradictory.authorityTurns])
      .authorized,
    [],
  );
  assert.equal(contradictory.routingDecisions, 1);
  assert.deepEqual(contradictory.redispatchCandidates, []);

  const secondTarget = {
    ...publish,
    target: "other-package@0.1.4",
    attempt: "publish-2",
  };
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      { ...grantPublish, actions: [secondTarget] },
    ]).authorized,
    [authorityBoundaryKey(secondTarget), publishKey].sort(),
  );

  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      { speechAct: "attempt-terminal", attempt: publish.attempt },
      { source: "current-user", speechAct: "status" },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      { speechAct: "attempt-terminal", attempt: publish.attempt },
      grantPublish,
    ]).authorized,
    [],
  );
  const publishNewAttempt = { ...publish, attempt: "publish-2" };
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      { speechAct: "attempt-terminal", attempt: publish.attempt },
      grantPublish,
      {
        ...grantPublish,
        attempt: publishNewAttempt.attempt,
        actions: [publishNewAttempt],
      },
    ]).authorized,
    [authorityBoundaryKey(publishNewAttempt)],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      {
        speechAct: "target-scope-drift",
        attempt: publish.attempt,
        matches: [publish],
      },
    ]).authorized,
    [],
  );
  assert.deepEqual(
    runAuthorityContractScenario([
      grantPublish,
      {
        speechAct: "target-scope-drift",
        attempt: publish.attempt,
        matches: [publish],
      },
      grantPublish,
    ]).authorized,
    [],
  );
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
    "$kyw-audit",
    "$kyw-grilling",
  ]) {
    assert.ok(firstUse.includes(invocation), `${invocation} must be visible before release detail`);
  }
  assert.match(
    readme,
    /Version `0\.1\.3`[\s\S]*current source\/package release and public `latest`/,
  );
  assert.match(
    readme,
    /Exact historical candidates and results live only in their numbered Task\/Test pairs and GitHub/,
  );
  assert.match(
    readme,
    /`kyw-dev@0\.1\.3` is published to the public npm registry under the `latest` tag/,
  );
  assert.match(
    readme,
    /canonical version metadata exposes a `gitHead` field matching the published source commit/,
  );
  assert.match(
    readme,
    /No version tag, GitHub Release, or public plugin submission has occurred/,
  );
  assert.match(readme, /npx --yes kyw-dev@0\.1\.3 install --scope user/);
  assert.match(readme, /needs its own direct action-specific authority/);
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
    /Merging the workflow, passing credential-free exact-SHA CI[\s\S]*neither dispatches nor authorizes/,
  );
  assert.match(readme, /public repository receives npm provenance automatically/);
  assert.match(
    readme,
    /Routine release preflight[\s\S]*(?:without|Neither needs) `npm login`, OTP, security-key authentication, account-settings inspection, or `npm trust list`[\s\S]*initial setup[\s\S]*security\/configuration audit or change[\s\S]*actual OIDC\/publisher failure/,
  );
  assert.match(
    readme,
    /Routine release preflight validates (?:the )?expected tuple and exact workflow bytes; only (?:the )?authorized workflow validates public package identity and target-version absence/,
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
    /One repository-owned expectation[\s\S]*GitHub Actions[\s\S]*kimyeongwoo\/kyw-dev[\s\S]*\.github\/workflows\/publish\.yml[\s\S]*npm-production[\s\S]*allowed action `npm publish`/,
  );
  assert.match(
    specification,
    /no automatic trigger, long-lived npm token, interactive authentication, account-inspection, retry, second-dispatch, or fallback path/,
  );
  assert.match(
    specification,
    /complete required local Release graph[\s\S]*`npm run check`[\s\S]*`npm run release:candidate`[\s\S]*`npm run release:ci`[\s\S]*`npm run release:check` is only an optional thin alias/,
  );
  assert.match(
    specification,
    /repository, manual event, `refs\/heads\/main`, literal expected SHA, actual checkout SHA, expected package\/plugin version, runtime, public-registry identity, target-version absence, and final clean exact-SHA checkout[\s\S]*does not rerun Stable or candidate verification[\s\S]*`npm publish \.`[\s\S]*exactly once without retry/,
  );
  assert.match(
    specification,
    /published version `0\.1\.3`[\s\S]*public npm registry serves `kyw-dev@0\.1\.3`[\s\S]*canonical npm metadata exposes `gitHead` matching the published source commit[\s\S]*Historical `0\.1\.2`[\s\S]*still lacks `gitHead`/,
  );
  assert.match(
    specification,
    /Routine release preflight does not require npm account\/settings inspection[\s\S]*Account-side authentication is limited to initial setup[\s\S]*actual OIDC\/publisher failure/,
  );
  assert.match(
    specification,
    /Successful publication is canonical runtime proof[\s\S]*OIDC\/publisher rejection fails the workflow and blocks the executing Task/,
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
    /actual successful publish[\s\S]*canonical runtime proof[\s\S]*OIDC\/publisher[\s\S]*rejection has one path[\s\S]*executing Task[\s\S]*records[\s\S]*BLOCKED/,
  );
  assert.match(
    architecture,
    /development-only integration fixture[\s\S]*actual npm CLI[\s\S]*raw submitted packument[\s\S]*directory publication supplies the exact commit as `gitHead`[\s\S]*prebuilt tarball cannot synthesize[\s\S]*post-capture registry rewriting/,
  );
  assert.doesNotMatch(
    [readme, specification, architecture].join("\n"),
    /release-evidence-manual-runner|release-evidence-harness|release-gate-isolation|retained candidate|registry dry-run|isolated lifecycle verification/i,
  );
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

test("the split representative instruction bundle stays concise with one execution reference", async () => {
  const contents = await Promise.all(
    REPRESENTATIVE_INSTRUCTION_PATHS.map((relativePath) => read(relativePath)),
  );
  const currentBytes = contents.reduce(
    (total, content) => total + Buffer.byteLength(content),
    0,
  );
  const currentTokenEstimate = Math.ceil(currentBytes / 4);

  assert.ok(
    currentBytes < REPRESENTATIVE_BUDGET_BYTES,
    `expected fewer than ${REPRESENTATIVE_BUDGET_BYTES} bytes, received ${currentBytes}`,
  );
  assert.ok(
    currentTokenEstimate < REPRESENTATIVE_TOKEN_BUDGET,
    `expected fewer than ${REPRESENTATIVE_TOKEN_BUDGET} estimated tokens, received ${currentTokenEstimate}`,
  );
  assert.ok(
    currentBytes <= REPRESENTATIVE_TARGET_BYTES,
    `expected at most ${REPRESENTATIVE_TARGET_BYTES} bytes, received ${currentBytes}`,
  );
  assert.ok(
    currentTokenEstimate <= REPRESENTATIVE_TARGET_TOKENS,
    `expected at most ${REPRESENTATIVE_TARGET_TOKENS} estimated tokens, received ${currentTokenEstimate}`,
  );
  assert.ok(
    REPRESENTATIVE_BUDGET_BYTES - currentBytes >= REQUIRED_BYTE_HEADROOM,
    "representative instructions must retain at least 4 KiB below the unchanged byte guard",
  );
  assert.ok(
    REPRESENTATIVE_TOKEN_BUDGET - currentTokenEstimate >=
      REQUIRED_TOKEN_HEADROOM,
    "representative instructions must retain at least 1,024 estimated tokens below the unchanged token guard",
  );
  assert.equal(REPRESENTATIVE_INSTRUCTION_PATHS.length, 4);
  assert.equal(PERMANENT_INDEX_PATHS.length, 3);
  assert.deepEqual(PERMANENT_INDEX_PATHS, [
    "README.md",
    "docs/SPEC.md",
    "docs/ARCHITECTURE.md",
  ]);
  await Promise.all(PERMANENT_INDEX_PATHS.map((relativePath) => read(relativePath)));

  const authoringSkill = contents[1];
  const implementationSkill = contents[2];
  assert.deepEqual(
    [...authoringSkill.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((match) => match[1]),
    [],
  );
  const referenceLinks = [
    ...implementationSkill.matchAll(/\]\((references\/[^)]+\.md)\)/g),
  ].map((match) => match[1]);
  assert.deepEqual([...new Set(referenceLinks)], ["references/execution.md"]);
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
      /Always load applicable `AGENTS\.md` and the selected\/current Task\/Test pair/,
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
      /Index or search headings in `?README(?:\.md)?`?,\s*`?(?:docs\/)?SPEC(?:\.md)?`?,\s*and\s*`?(?:docs\/)?ARCHITECTURE(?:\.md)?`?/,
    );
    assert.match(
      workflow,
      /(?:read|to) only the\s+owning permanent-document sections/i,
    );
    assert.match(
      workflow,
      /(?:full(?:y)? read|full read of) all (?:existing|four) permanent documents/i,
    );
    assert.match(workflow, /source conflict/i);
    assert.match(workflow, /Stop[\s\S]*conflict remains\s+unresolved/i);
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
  assert.match(execution, /unless the current user explicitly requests that change/);
  assert.match(execution, /Use `UNAVAILABLE` as both value and observability/);
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
    /The portable `\$kyw-grilling`, `\$kyw-init`, `\$kyw-task "<outcome>"`, `\$kyw-impl NNNN`, and `\$kyw-audit NNNN` forms/,
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
