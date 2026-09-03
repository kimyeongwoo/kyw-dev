---
name: kyw-deliver
description: Perform, resume, or report one existing kyw-dev Task's current STANDARD delivery. Use only when the user explicitly invokes $kyw-deliver with a four-digit ID; do not use for implementation, authoring, managed aliases, ordinary prompts, audits, publication, or unrelated external actions.
---

<!-- kyw-active-skill-guardrails:v1 -->

# kyw STANDARD Delivery

## Input and exact route

Only exact `$kyw-deliver NNNN` selects a Task. It has no bare form, Korean alias, implicit invocation, suffix authority, next/continuous mode, chaining, or background behavior. A malformed, missing-ID, goal-style, appended-text, or ordinary-language request mutates nothing and reports the exact supported form without invoking another Skill.

Keep `allow_implicit_invocation: false`. This route activates only its current invocation; terminal report, cancellation, stop, or expiry ends it. It never implements, authors, promotes, audits, publishes, retries, force-pushes, deletes a branch, bypasses protection, changes an account, or performs an unrelated mutation.

## Shared entry

Read [STANDARD Delivery and Resume](references/delivery.md) completely before inspection or action. It is the canonical detailed Git/GitHub delivery procedure. Use the sole packaged Task adapter in the sibling `kyw-task` Skill; this Skill owns no copied parser, queue, evaluator, hydration, continuity, or delivery engine.

Pass the exact invocation separately:

```text
node <kyw-deliver-skill-directory>/../kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation <exact invocation text> --managed-routing false [--execution-preflight-json <json>]
```

Preflight verified conflict, unexplained user work, remote drift, and user-owned decisions. Ask for no delivery JSON, checkpoint content, transition token, evidence ID, credential, or mutable ledger snapshot. Dispatch reserves no Task ID and accepts no bootstrap/migration authority.

## Eligibility and handoff

Only a repository-complete `DONE/PASSED` Task whose static policy is `STANDARD` may be selected for mutable delivery. Missing, duplicate, `DRAFT`, `READY`, `IN_PROGRESS`, `BLOCKED`, `CANCELLED`, reasoned `NONE`, dependency-blocked, multi-active, drifted, unsafe, malformed, or unsupported state stops with the adapter result and no implementation or pair mutation.

A valid pending result is `DELIVER`; follow the reference from its revalidated first unfinished safe action. A complete result is terminal report-only. An unchanged satisfied contract-3 Task remains immutable and report-only; drift, redelivery, or correction intent stops with the Task/path and exact `$kyw-task "<correction outcome>"` guidance for a new hard-dependent pair.

If the result carries an opaque continuity transition token, apply it exactly once only at the terminal delivery boundary and exactly as the reference directs. Never construct, decode, edit, retain, or replay it after terminal.

## Activation-scoped guardrails

Aligned delivery continues without duplicate confirmation. A baseline, Task, acceptance, scope, action, target, attempt, Skill, mode, or route change gets a concrete old/new warning naming implementation, mutable Task/Test, permanent-document, verification, and delivery impacts plus exact bounds, then a zero-mutation wait. Only the trusted current user's immediate next unambiguous explicit reconfirmation of that unchanged warning permits affected-owner synchronization and the bounded action. The originating or combined message cannot self-confirm, redispatch, or chain Skills.

Cancellation, decline, ambiguity, intervention, staleness, fact drift, or changed/added bounds clears or replaces the warning. Skill/mode/route identity replacement expires and requires its own exact route. System/platform safety, secrets, honest evidence, user-work preservation, terminal-pair immutability, exact routing, and separate external-action authority remain non-waivable.

## Stop and report

Report Task ID, delivery disposition, exact completed and pending stage, bounded evidence identities or limitations, observed base-protection disposition or inspection limitation, preservation result, and residual risk. Never write mutable GitHub chronology into the terminal pair or a permanent document. Stop after the terminal report; never invoke `$kyw-impl`, `$kyw-task`, or `$kyw-audit`.
