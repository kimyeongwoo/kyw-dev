---
name: kyw-deliver
description: Deliver an existing Task's current STANDARD lifecycle or public release only when the user explicitly invokes exact $kyw-deliver NNNN or $kyw-deliver NNNN --public-release; not for implementation, authoring, ordinary prompts, or audits.
---

<!-- kyw-active-skill-guardrails:v1 -->

# kyw Delivery

## Input and exact routes

Only exact `$kyw-deliver NNNN` selects unchanged `STANDARD`-only delivery. Only exact `$kyw-deliver NNNN --public-release` adds one ordered npm publication → exact-SHA GitHub tag → GitHub Release attempt after `STANDARD FINAL`. No other suffix, bare form, Korean/managed alias, implicit request, next/continuous mode, chain, or background run has authority.

Keep `allow_implicit_invocation: false`. Other input mutates nothing, reports both forms; it invokes no Skill. Either exact route activates only its current invocation; terminal, cancel, stop, or expiry ends it. Neither implements, authors, audits, selects a version, submits a plugin, retries, forces, deletes, bypasses, changes an account, or mutates unrelated state.

## Progressive shared entry

Read [STANDARD Delivery and Resume](references/delivery.md) completely before inspection or action. It remains the canonical detailed Git/GitHub delivery procedure. If and only if the invocation is exact `--public-release`, also read [Public Release and Resume](references/public-release.md) completely; plain delivery never loads or executes that procedure.

Use the sole packaged Task adapter in sibling `kyw-task`; this Skill owns no copied parser, queue, evaluator, hydration, continuity, public classifier, or engine. Plain delivery calls:

```text
node <kyw-deliver-skill-directory>/../kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation '$kyw-deliver NNNN' --managed-routing false
```

Exact public release calls this command before STANDARD and, only after an initial `DELIVER` result completes, once more in the same invocation:

```text
node <kyw-deliver-skill-directory>/../kyw-task/scripts/task-artifacts.mjs public-release --tasks-root <repository>/docs/tasks --invocation '$kyw-deliver NNNN --public-release' --managed-routing false
```

After a terminal public result, do not call again. Preflight conflict/work/drift/decisions; ask for no state/client JSON, checkpoint, token, tuple, credential, or ledger. Neither accepts ID reservation or bootstrap/migration authority.

## Eligibility and handoff

Only a repository-complete `DONE/PASSED` Task with static `STANDARD` may be selected. Missing, duplicate, `DRAFT`, `READY`, `IN_PROGRESS`, `BLOCKED`, `CANCELLED`, reasoned `NONE`, dependency-blocked, multi-active, drifted, unsafe, malformed, or unsupported state stops with the adapter result and no implementation or pair mutation.

Plain `DELIVER` follows STANDARD from its first unfinished safe action; complete is report-only. An unchanged satisfied contract-3 Task stays immutable/report-only. Drift, redelivery, or correction stops with Task/path and exact `$kyw-task "<correction outcome>"` for a hard-dependent pair.

The public route reconstructs or resumes STANDARD first without repeats. No npm/tag/Release write precedes production-evaluator `FINAL` at the exact expected-head merge with post-main CI. It then freezes one tuple and applies the public reference's five-state preflight, create-once order, canonical proof, redaction, and resume. Only this route may take a satisfied Task into public preflight; pair and continuity stay unchanged.

If a pending result carries an opaque predecessor continuity transition token, apply it once only at the STANDARD terminal boundary as that reference directs. Never construct, decode, edit, retain, or replay it after terminal.

## Activation-scoped guardrails

Either route supplies aligned bounds without duplicate confirmation. A changed baseline, Task, acceptance, scope, action, target, attempt, Skill, mode, route, or tuple gets the SPEC warning covering implementation, Task/Test, permanent-document, verification, and delivery impacts, then a zero-mutation wait. Only immediate exact reconfirmation on unchanged facts permits affected-owner synchronization and the bounded action; origin cannot self-confirm, redispatch, or chain Skills.

Cancellation, ambiguity, intervention, staleness, drift, or added bounds clears it; a Skill/mode/route change needs its own exact route. Safety, secrets, evidence, user work, immutable pairs, exact routing, and separate authorities remain non-waivable. Failure grants reads only, never retry, fallback, later write, or a new attempt.

## Stop and report

Report Task, route, disposition, stage, bounded redacted evidence/limits, preservation, and risk. STANDARD includes protection disposition/limit; public release includes classification, recovery, resume point, and unchanged pair/continuity proof. Never persist external chronology. Stop after the report; do not invoke another Skill or continue in background.
