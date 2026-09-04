# kyw-dev Repository Rules

## Truth and context loading

- Product/acceptance: `docs/SPEC.md`
- System/flows: `docs/ARCHITECTURE.md`
- Setup/usage/contributor entry: `README.md`
- Scope/handoff: `docs/tasks/NNNN-*/TASK.md`
- Verification: `TEST.md`

Always load applicable `AGENTS.md`. An active kyw workflow loads its selected/current Task/Test pair; inactive prompts select none. Index or search README, SPEC, and ARCHITECTURE first; read owner sections by goal, scope, documentation impact, code, and dependencies.

Read all four for `kyw-init`, rebaseline, redesign, broad/conflicting work, or ambiguous/insufficient truth; stop on unresolved conflict.

## Scope and routing

<!-- kyw-active-skill-guardrails:v1 -->

- During an active Task workflow, work on one Task; preserve user work, exclude unrelated cleanup. Fixes need no Task unless requested.
- All six `kyw-*` Skills are explicit-only. `$kyw-task "goal"` authors minimal dependency-aware `READY/READY` pairs, prints one `$kyw-impl NNNN`, stops; `$kyw-task NNNN` handles only compatible `DRAFT/DRAFT`.
- `$kyw-impl NNNN` is portable. Route only exact `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; incidental `task` prose never routes. Only exact `$kyw-deliver NNNN` owns `STANDARD`; release-bearing contract 4 continues after `FINAL` through npm→tag→Release in the same invocation. Every suffix, including `--public-release`, is unsupported; delivery has no bare/managed alias.
- Exact Skill/alias starts guardrails; terminal/stop/cancel/expiry ends them. Inactive prompts get no kyw block, warning, Task selection/creation, or redirect.
- Aligned work continues. Material baseline/Task/acceptance/scope/bound change gets the SPEC warning and zero-mutation wait; immediate exact reconfirmation on unchanged facts permits owner/pair sync then named bounds. Stale/changed/ambiguous/cancelled assent clears it. Never chain Skills or bypass safety/evidence/immutable pairs.
- Keep one Task active. Implementation resumes it, else selects the lowest eligible ready Task; pending `STANDARD` blocks with exact `$kyw-deliver NNNN`. Continuous mode is serial, invocation-local, and stops before delivery.
- Procedures: `skills/kyw-impl/references/execution.md` through `DONE/PASSED`; `skills/kyw-deliver/references/delivery.md` through `FINAL`, then `public-release.md` for contract 4. Preserve model/effort unless overridden; aligned actions need no duplicate confirmation.
- Task/Test owns repository outcome; GitHub gates mutable delivery. Contract 4 `STANDARD` fixes one preterminal version; delivery only consumes it. Gaps need rebaseline; contract-3/4 delivery freezes pairs; corrections need hard-dependent Tasks. Public release freezes one tuple; five-state proof preserves pair/continuity. Failure permits reads, never retry; fallback/force/destructive/bypass/admin/account/deletion/submission/unrelated mutation stay separate.

## Change and documentation discipline

- Inspect first; choose the smallest conforming design and preserve unknown files.
- Product behavior or acceptance meaning → `docs/SPEC.md`.
- Components, boundaries, dependencies, data flow, storage, or distribution → `docs/ARCHITECTURE.md`.
- Setup, installation, commands, configuration, usage, or contributor workflow → `README.md`.
- Repository-wide Codex behavior or completion rules → `AGENTS.md`.
- Record impact/new dependencies in the active Task; leave unaffected documents unchanged. Never rely on npm lifecycle scripts for plugin installation.

## Evidence and completion

Stable commands are `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.

Keep Task/Test aligned with scope, risk, acceptance, and evidence. Before completion, compare diff to scope/matrix, sync truth, validate the pair, and record failures/limits/risks. Before compaction update Completed/Remaining/Resume Point, blockers, and evidence. Complete only if acceptance, checks, diff, documents, and evidence agree; else record `BLOCKED` with recovery. Repository completion never implies delivery.
