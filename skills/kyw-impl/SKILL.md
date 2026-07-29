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

Read [Task Execution and Resume](references/execution.md) completely before inspection or action. Use the sole packaged Task adapter in the sibling `kyw-task` Skill. It is a shared bridge to one package/direct-install runtime; this Skill calls only validation and dispatch and owns no copied parser, state, dependency, queue, transaction, or delivery engine.

Pass the exact current-user invocation separately:

```text
node <kyw-impl-skill-directory>/../kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation <exact invocation text> --managed-routing <true|false> [--execution-preflight-json <json>]
```

Use `true` only for loaded managed routing. Pass verified conflict, unexplained-work, drift, and user-decision findings through execution preflight. Before its one dispatcher call, the adapter validates the exact prior `STANDARD` set from the fixed-bounded checkpoint on aligned `main` and freshly production-evaluates at most one uncovered GitHub outcome; there is no whole-history fallback. Fail closed and never ask for delivery JSON, checkpoint content, transition tokens, or evidence IDs.

For delivered contract-3 Tasks, pre-dispatch binds the first complete hardened graph and pair bytes. Unchanged invocation reports only; drift or redelivery fails with Task/path and routes to a new hard-dependent `$kyw-task "<correction outcome>"`.

A selected result may carry an opaque continuity transition token. After establishing the selected Task branch and active pair, pass it unchanged once to `apply-continuity`. Never construct, decode, edit, retain, or apply it after a terminal result; exact resume replay is idempotent and any mismatch stops.

## Selection boundary

- `READY/READY` may return `IMPLEMENT`; `IN_PROGRESS/RUNNING` may return `RESUME`.
- `BLOCKED/BLOCKED` permits only condition recheck until the blocker is proven clear.
- `DONE/PASSED` may return `DELIVER` for resumable ordinary delivery or a terminal result.
- `DRAFT/DRAFT` stops with exact `$kyw-task NNNN` authoring guidance.
- Cancelled, missing, inconsistent, dependency-blocked, multi-active, drifted, unsafe, or unsupported state stops with the adapter result.

Automatic and continuous forms never allocate. Continuous processes only pre-created eligible Tasks one at a time, re-preflights after every repository and delivery transition, and never runs in parallel, in the background, or beyond this host invocation.

Only `IMPLEMENT`, `RESUME`, or `DELIVER` enters the execution reference and its one-current-Task mutation boundary. Recognized selection preserves existing ordinary authority for implementation, acceptance verification, live evidence, minimal durable-doc synchronization, terminal status, exact-path commit, non-force push, non-draft PR, exact-head CI, expected-head protected merge, post-merge main CI, and reporting without ceremonial confirmation.

Publication, registry/version/tag/Release/public submission, force or destructive recovery, branch deletion, CI rerun, bypass/admin override, and unrelated mutation remain separate. Conflict, unexplained user work, critical remote drift, failed or missing required evidence, review blockage, or a genuine user-owned decision stops.

Never perform the independent audit owned by `$kyw-audit`.
