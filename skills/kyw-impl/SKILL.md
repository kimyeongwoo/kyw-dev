---
name: kyw-impl
description: Implement, resume, verify, and ordinarily deliver one already existing kyw-dev Task. Use only when the user explicitly invokes $kyw-impl with a four-digit ID or a loaded managed AGENTS.md routes an exact execution alias; do not use for Task authoring, new outcomes, ordinary prompts, audits, or publication.
---

<!-- kyw-active-skill-guardrails:v1 -->

# kyw Task Implementation

## Inputs and routing

Accept only existing-Task execution forms:

- `$kyw-impl NNNN` selects one exact existing Task on every supported surface;
- `task 0007 실행해줘` selects that exact Task under loaded managed routing;
- `task 진행해줘` resumes the active Task, otherwise resumable `STANDARD` delivery, otherwise the lowest eligible ready Task;
- `남은 task 계속 실행해줘` repeats that selection serially for pre-created Tasks during only this managed invocation.

Keep `allow_implicit_invocation: false`. The Korean forms are anchored repository routing, not Skill matching. Match the full command plus optional current-user text; incidental “task” prose does not invoke. Without managed routing, return `$kyw-impl NNNN`. An exact route activates only that invocation; terminal, cancellation, or expiry ends it.

Only an attempted `$kyw-impl` with a goal/missing ID/new outcome causes zero mutation and points to `$kyw-task "<outcome>"`. Standalone ordinary instructions stay outside and are not redirected. Never infer/allocate IDs, create pairs, author/promote DRAFT, or invoke another Skill.

## Shared entry and procedure

Read [Task Execution and Resume](references/execution.md) completely before inspection or action; it owns the execution, evidence, documentation, terminal, and delivery procedure. Use the sole packaged Task adapter in the sibling `kyw-task` Skill. This entry calls only validation and dispatch and owns no copied parser, state, dependency, queue, transaction, or delivery engine.

Pass the exact current-user invocation separately:

```text
node <kyw-impl-skill-directory>/../kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation <exact invocation text> --managed-routing <true|false> [--execution-preflight-json <json>]
```

Use `true` only for loaded managed routing. Preflight verified conflict, unexplained work, drift, and user decisions. Before the sole call, the adapter validates prior `STANDARD` continuity from aligned `main`'s fixed-bounded checkpoint and freshly production-evaluates at most one uncovered GitHub outcome; no whole-history fallback. Never ask for delivery JSON, checkpoint content, tokens, or evidence IDs.

Delivered contract-3 Tasks are bound to their first complete hardened graph and pair bytes: unchanged invocation reports only; drift or redelivery stops with Task/path and new hard-dependent `$kyw-task "<correction outcome>"` guidance.

Every four-digit ID uses this generic path; dispatch reserves none for recovery and accepts no migration/bootstrap authority option. Only separate `bootstrap-continuity` with exact `EXPLICIT_REBASELINE` authority may cross that fail-closed migration boundary; it permits neither source repair nor automatic replay.

A result may carry an opaque continuity transition token. After establishing its branch and active pair, pass it unchanged once to `apply-continuity`. Never construct, decode, edit, retain, or use it after terminal; exact replay is idempotent and mismatch stops.

## Dispatch handoff

`READY/READY` may return `IMPLEMENT`; `IN_PROGRESS/RUNNING`, `RESUME`; and repository-complete `DONE/PASSED`, resumable `DELIVER` or a terminal result. `BLOCKED/BLOCKED` permits only condition recheck, and `DRAFT/DRAFT` stops with exact `$kyw-task NNNN` authoring guidance. Cancelled, missing, inconsistent, dependency-blocked, multi-active, drifted, unsafe, or unsupported state stops with the adapter result.

Automatic/continuous forms never allocate. Continuous mode re-preflights pre-created eligible Tasks serially, never in parallel/background or beyond this host invocation.

Aligned work continues without duplicate confirmation; classify `overrideText` once. A baseline/Task/acceptance/scope/action/target/attempt/Skill/mode change gets an old/new implementation, Task/Test, permanent-document, verification, delivery-impact, exact-bounds warning and zero-mutation wait. Immediate exact reconfirmation of unchanged facts permits owner/pair sync and only bounded action; Skill/mode/route identity replacement expires; its own exact route is required. Completion deactivates. Origin cannot self-confirm/redispatch/chain Skills; invalid/stale/enlarged assent grants nothing.

Publication/registry/version/tag/Release/submission, retry/fallback, force/destructive, deletion/rerun, bypass/admin/account, and unrelated mutation stay separate; failure grants no retry. Conflict, unexplained work, drift, failed evidence/review, or user choice stops.

Never perform the independent audit owned by `$kyw-audit`.
