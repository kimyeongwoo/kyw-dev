---
name: kyw-deliver
description: Deliver an existing Task's current STANDARD lifecycle and its eligible public release only when the user explicitly invokes exact $kyw-deliver NNNN; not for implementation, authoring, ordinary prompts, suffixes, or audits.
---

<!-- kyw-active-skill-guardrails:v1 -->

# kyw Delivery

## Input and exact route

Only exact `$kyw-deliver NNNN` selects delivery. For a release-bearing contract-4 `STANDARD` Task, it completes/resumes Git/GitHub and continues in the same invocation through one ordered npm publication → exact-SHA GitHub tag → GitHub Release attempt after `STANDARD FINAL`. Versionless contract 1–3 Tasks retain historical GitHub-only delivery/report behavior. Every suffix, including `--public-release`, is unsupported. Every bare form, Korean/managed alias, implicit request, next/continuous mode, chain, or background run is non-authoritative.

Keep `allow_implicit_invocation: false`. Other input mutates nothing, reports only `$kyw-deliver NNNN`, and invokes no Skill. This exact route activates only its current invocation; it grants no implementation, authoring, audit, version edit, submission, retry, force, deletion, bypass/account, or unrelated mutation.

## Progressive shared entry

Read [STANDARD Delivery and Resume](references/delivery.md) completely first. Load [Public Release and Resume](references/public-release.md) only after the dispatcher identifies an eligible release-bearing contract-4 Task at exact `FINAL`, before any public read/write. Historical contract 1–3 delivery never loads or executes that procedure.

Use the sole packaged Task adapter in sibling `kyw-task`; this Skill owns no copied parser, queue, evaluator, hydration, continuity, public classifier, or engine. Call its dispatcher exactly once:

```text
node <kyw-deliver-skill-directory>/../kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation '$kyw-deliver NNNN' --managed-routing false
```

On `DELIVER`, follow STANDARD to `FINAL`; for eligible contract 4, retain the same invocation, load the public reference, and call the internal adapter once. An initial `PUBLIC_RELEASE` loads that reference first. This is not another user route:

```text
node <kyw-deliver-skill-directory>/../kyw-task/scripts/task-artifacts.mjs public-release --tasks-root <repository>/docs/tasks --invocation '$kyw-deliver NNNN' --managed-routing false
```

It requires fresh `PUBLIC_RELEASE`, returns `COMPLETE` or `BLOCKED`, and is never called again. Preflight conflict/work/drift/decisions; accept no user state, checkpoint, token, tuple, credential, ledger, ID reservation, or migration authority.

## Eligibility and handoff

Only repository-complete `DONE/PASSED` with static `STANDARD` is selectable. Missing, duplicate, `DRAFT`, `READY`, `IN_PROGRESS`, `BLOCKED`, `CANCELLED`, reasoned `NONE`, dependency-blocked, multi-active, drifted, unsafe, malformed, or unsupported state stops without implementation/pair mutation.

`DELIVER` follows STANDARD from its first unfinished safe action. An unchanged satisfied contract-3/4 Task stays immutable; contract 1–3 is report-only, while eligible contract 4 proceeds to the public stage without another user command. Drift, redelivery, or correction stops with Task/path and exact `$kyw-task "<correction outcome>"` for a hard-dependent pair.

For contract 4, cross-check the immutable Task version against delivered package/plugin bytes; never choose or edit it. Actionable public reads and writes wait for evaluator `FINAL`; the public reference then owns tuple freeze, five-state create-once resume, proof, and redaction. Pair/continuity stays unchanged.

Before `DELIVER`, that adapter applies prepared predecessor continuity through the validated atomic path at most once. Failure or uncertainty returns no successful selection and blocks later mutation. Never request or relay continuity state or a manual subcommand.

## Activation-scoped guardrails

The exact route supplies aligned STANDARD and eligible fixed public bounds without duplicate confirmation. A changed baseline, Task, acceptance, scope, action, target, attempt, Skill, mode, route, release version, or tuple gets the SPEC warning covering implementation, Task/Test, permanent-document, verification, and delivery impacts, then a zero-mutation wait. Only immediate exact reconfirmation on unchanged facts permits affected-owner synchronization and the bounded action; origin cannot self-confirm, redispatch, or chain Skills.

Cancellation, ambiguity, intervention, staleness, drift, or added bounds clears it; a Skill/mode/route change needs its own exact route. Safety, secrets, evidence, user work, immutable pairs, exact routing, and separate authorities remain non-waivable. Failure grants reads only, never retry, fallback, later write, or a new attempt.

## Stop and report

Report Task, route, stage, redacted evidence/limits, preservation, risk, STANDARD protection, and public classification/recovery/resume. Never persist chronology. Stop after the report without chaining or background work.
