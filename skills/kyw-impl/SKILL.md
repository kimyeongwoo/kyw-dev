---
name: kyw-impl
description: Implement, resume, verify, and repository-complete one already existing kyw-dev Task through DONE/PASSED. Use only when the user explicitly invokes $kyw-impl with a four-digit ID or loaded managed AGENTS.md routes an exact implementation alias; do not use for Task authoring, delivery, new outcomes, ordinary prompts, audits, or publication.
---

<!-- kyw-active-skill-guardrails:v1 -->

# kyw Task Implementation

## Inputs and routing

Accept only existing-Task implementation forms:

- `$kyw-impl NNNN` selects one exact existing Task on every supported surface;
- `task 0007 실행해줘` selects that exact Task under loaded managed routing;
- `task 진행해줘` resumes the active Task, otherwise selects the lowest eligible ready Task;
- `남은 task 계속 실행해줘` repeats only repository implementation for pre-created Tasks during this managed invocation.

Keep `allow_implicit_invocation: false`. The Korean forms are anchored repository routing, not Skill matching. Match the full command plus optional current-user constraints; incidental “task” prose does not invoke. Without managed routing, return `$kyw-impl NNNN`. An exact route activates only that invocation; terminal, cancellation, stop, or expiry ends it.

Only an attempted `$kyw-impl` with a goal, missing ID, or new outcome causes zero mutation and points to `$kyw-task "<outcome>"`. Standalone ordinary instructions stay outside and are not redirected. Never infer/allocate IDs, create pairs, author/promote DRAFT, select delivery, or invoke another Skill.

## Shared entry and read-only delivery gate

Read [Task Execution and Resume](references/execution.md) completely before inspection or action. It owns repository execution, evidence, documentation, and terminal procedure through `DONE/PASSED`. Use the sole packaged Task adapter in the sibling `kyw-task` Skill. This entry owns no copied parser, state, dependency, queue, transaction, or delivery engine.

Pass the exact current-user invocation separately:

```text
node <kyw-impl-skill-directory>/../kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation <exact invocation text> --managed-routing <true|false> [--execution-preflight-json <json>]
```

Use `true` only for loaded managed routing. Preflight verified conflict, unexplained work, drift, and user decisions. Before the sole call, the adapter uses the fixed-bounded checkpoint and freshly production-evaluates at most one uncovered GitHub predecessor as a read-only implementation gate; no whole-history fallback. Never ask for delivery JSON, checkpoint content, tokens, or evidence IDs.

Pending `STANDARD` delivery is never selected by an implementation route. It blocks advancement and reports its exact `$kyw-deliver NNNN` command. Delivered contract-3 and contract-4 Tasks remain bound to their canonical pair: unchanged invocation reports only; drift or redelivery stops with Task/path and hard-dependent `$kyw-task "<correction outcome>"` guidance.

## Dispatch handoff

`READY/READY` may return `IMPLEMENT`; `IN_PROGRESS/RUNNING`, `RESUME`; `DONE/PASSED`, a non-mutating repository-complete report or delivery handoff. `BLOCKED/BLOCKED` permits only condition recheck, and `DRAFT/DRAFT` stops with exact `$kyw-task NNNN` authoring guidance. Cancelled, missing, inconsistent, dependency-blocked, delivery-blocked, multi-active, drifted, unsafe, or unsupported state stops with the adapter result.

The implementation route never selects or executes delivery. Automatic and continuous forms never allocate or choose pending delivery, never run in parallel/background, and never continue beyond this invocation. A completed `STANDARD` Task prints exactly:

```text
다음 단계: $kyw-deliver NNNN
```

Then stop, including continuous mode. A reasoned `NONE` Task has no delivery handoff; continuous mode may re-preflight only another dependency-satisfied ready implementation.

Aligned work continues without duplicate confirmation; classify appended constraints once. A baseline, Task, acceptance, scope, action, target, attempt, Skill, or mode change gets an old/new implementation, Task/Test, permanent-document, verification, delivery-impact, exact-bounds warning and zero-mutation wait. Immediate exact reconfirmation of unchanged facts permits owner/pair sync then only the bounded action. Skill/mode/route replacement expires and requires its own exact route. Completion deactivates. Origin cannot self-confirm, redispatch, or chain Skills; invalid, stale, or enlarged assent grants nothing.

For a contract-4 `STANDARD` Task, implementation may only read and validate the already settled Task-owned release version. Before `DONE/PASSED`, freshly prove that exact stable SemVer remains non-conflicting across canonical npm version/history, bounded matching publication attempts, the Git tag namespace, GitHub Release-by-tag, package/plugin agreement, and duplicate claims in the current Task queue. Missing, changed, occupied, duplicate, incomplete, unreadable, or ambiguous evidence blocks terminalization. Never select, infer, increment, substitute, commit, publish, tag, or release a version during implementation.

Publication/registry/tag/Release/submission, delivery, retry/fallback, force/destructive action, deletion/rerun, bypass/admin/account change, and unrelated mutation stay separate. Failure grants no retry. Conflict, unexplained work, drift, failed evidence, or user choice stops. Never perform the independent audit owned by `$kyw-audit`.
