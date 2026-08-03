---
name: kyw-impl
description: Implement, resume, verify, and ordinarily deliver one already existing kyw-dev Task. Use only when the user explicitly invokes $kyw-impl with a four-digit ID or a loaded managed AGENTS.md routes an exact execution alias; do not use for Task authoring, new outcomes, ordinary prompts, audits, or publication.
---

# kyw Task Implementation

## Inputs and routing

Accept only existing-Task execution forms:

- `$kyw-impl NNNN` selects one exact existing Task on every supported surface;
- `task 0007 실행해줘` selects that exact Task under loaded managed routing;
- `task 진행해줘` resumes the active Task, otherwise resumable `STANDARD` delivery, otherwise the lowest eligible ready Task;
- `남은 task 계속 실행해줘` repeats that selection serially for pre-created Tasks during only this managed invocation.

Keep `allow_implicit_invocation: false`. The Korean forms are anchored repository routing, not Skill matching. Match the complete command plus optional current-user text; incidental “task” prose is not an invocation. Without managed routing, return `$kyw-impl NNNN`.

A goal, missing ID, or new outcome causes zero mutation and exact `$kyw-task "<outcome>"` guidance. Never infer or allocate an ID, create a directory/pair, author or promote DRAFT, or invoke another Skill.

## Shared entry and procedure

Read [Task Execution and Resume](references/execution.md) completely before inspection or action; it owns the execution, evidence, documentation, terminal, and delivery procedure. Use the sole packaged Task adapter in the sibling `kyw-task` Skill. This entry calls only validation and dispatch and owns no copied parser, state, dependency, queue, transaction, or delivery engine.

Pass the exact current-user invocation separately:

```text
node <kyw-impl-skill-directory>/../kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation <exact invocation text> --managed-routing <true|false> [--execution-preflight-json <json>]
```

Use `true` only for loaded managed routing. Pass verified conflict, unexplained-work, drift, and user-decision findings through execution preflight. Before the sole dispatcher call, the adapter validates prior `STANDARD` continuity from aligned `main`'s fixed-bounded checkpoint and freshly production-evaluates at most one uncovered GitHub outcome; there is no whole-history fallback. Never ask for delivery JSON, checkpoint content, transition tokens, or evidence IDs.

Delivered contract-3 Tasks are bound to their first complete hardened graph and pair bytes: unchanged invocation reports only; drift or redelivery stops with Task/path and new hard-dependent `$kyw-task "<correction outcome>"` guidance.

A correction Task may use a separately explicit, contract-recorded pre-dispatch repair only when its frozen allowlist, focused proof, one evaluator-satisfied uncovered frontier, sole-dispatch selection, and active-pair transition checks all succeed. This is not ambient implementation authority, a manual delivery seam, or a general rebaseline path; any failed condition stops without retry.

A selected result may carry an opaque continuity transition token. After establishing the selected Task branch and active pair, pass it unchanged once to `apply-continuity`. Never construct, decode, edit, retain, or apply it after a terminal result; exact resume replay is idempotent and any mismatch stops.

## Dispatch handoff

`READY/READY` may return `IMPLEMENT`; `IN_PROGRESS/RUNNING`, `RESUME`; and repository-complete `DONE/PASSED`, resumable `DELIVER` or a terminal result. `BLOCKED/BLOCKED` permits only condition recheck, and `DRAFT/DRAFT` stops with exact `$kyw-task NNNN` authoring guidance. Cancelled, missing, inconsistent, dependency-blocked, multi-active, drifted, unsafe, or unsupported state stops with the adapter result.

Automatic and continuous forms never allocate. Continuous mode re-preflights and processes only pre-created eligible Tasks serially; it never runs in parallel, in the background, or beyond this host invocation.

Only `IMPLEMENT`, `RESUME`, or `DELIVER` enters the reference's one-current-Task mutation and ordinary `STANDARD` lifecycle without ceremonial confirmation.

Publication, registry/version/tag/Release/public submission, force/destructive recovery, branch deletion, CI rerun, bypass/admin override, and unrelated mutation stay separate. Conflict, unexplained work, remote drift, failed required evidence, review blockage, or a user-owned decision stops.

Never perform the independent audit owned by `$kyw-audit`.
