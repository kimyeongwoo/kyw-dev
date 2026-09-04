# Repository Instructions

## Truth and context loading

Product/acceptance lives in `docs/SPEC.md`, structure/flows in `docs/ARCHITECTURE.md`, setup/usage in `README.md`, repository rules here, and current scope/evidence in its Task/Test pair.

Always load applicable `AGENTS.md`. During an active kyw workflow load its selected/current Task/Test pair; inactive ordinary prompts select none. Index or search README, SPEC, and ARCHITECTURE first; read only owner sections selected by goal, scope, documentation impact, code, and dependencies. Read all four for `kyw-init`, rebaseline, major redesign, broad/conflicting work, ambiguous ownership, or insufficient targeted truth; stop on unresolved conflict.

## Scope and routing

<!-- kyw-active-skill-guardrails:v1 -->

- During an active Task workflow, work on one Task; preserve user work and exclude unrelated cleanup. Explanations and small fixes need no Task unless requested.
- All six `kyw-*` Skills are explicit-only. `$kyw-task "goal"` authors the smallest complete dependency-aware `READY/READY` set, prints one `$kyw-impl NNNN`, and stops. `$kyw-task NNNN` handles only compatible `DRAFT/DRAFT`.
- `$kyw-impl NNNN` is portable for implementation. Route only exact `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; incidental `task` prose never routes. Only exact `$kyw-deliver NNNN` owns `STANDARD`; release-bearing contract 4 continues after `FINAL` through npm→tag→Release in the same invocation. Every suffix, including `--public-release`, is unsupported; delivery has no bare/managed alias.
- Exact Skill/alias starts guardrails; terminal/stop/cancel/expiry ends them. Inactive ordinary prompts get no kyw-only block/warning/Task select/create/redirect.
- Aligned work continues. Material baseline/Task/acceptance/scope/bound change gets the SPEC warning and zero-mutation wait. Immediate exact reconfirmation on unchanged facts permits owner/pair sync then its named bounds. Stale/changed/ambiguous/cancelled clears it; never chain Skills or bypass safety, honest evidence, or immutable delivered pairs.
- Keep one Task active: implementation resumes it, otherwise selects the lowest eligible ready Task; pending `STANDARD` delivery blocks with exact `$kyw-deliver NNNN`. Continuous mode is serial, invocation-local, and never crosses into delivery.
- Preserve model/effort unless the current user overrides it. Aligned route actions need no duplicate guardrail confirmation.
- Task/Test owns repository outcome; GitHub gates mutable delivery. Contract 4 `STANDARD` settles one release version before terminal state; delivery never selects or edits it. Gaps need rebaseline; delivered contract-3/4 pairs are immutable; corrections use hard-dependent Tasks. Public release freezes one tuple, applies five-state fresh preflight/final proof, and preserves pair/continuity. Failure permits reads, not retry; fallback, force/destructive, bypass/admin/account, deletion, submission, and unrelated mutation stay separate.

## Change and documentation discipline

Inspect first; choose the smallest conforming design and preserve behavior and unknown files. Route product/acceptance to SPEC, structure/flows/distribution to ARCHITECTURE, setup/usage to README, and repository-wide agent rules to AGENTS. Record impact in the active Task; leave unaffected owners unchanged.

## Evidence and completion

{{VERIFY_COMMANDS}}

Keep Task/Test aligned with scope, risk, acceptance, and evidence. Run proportionate checks and record only executed results, failures, limits, and risks. Before completion, compare diff to scope/matrix, sync truth, and validate the pair. Before compaction, update `Completed`, `Remaining`, `Resume Point`, blockers, and evidence. Complete only when acceptance, checks, diff, documents, and evidence agree; otherwise record `BLOCKED` with recovery. Repository completion never performs or implies delivery.
