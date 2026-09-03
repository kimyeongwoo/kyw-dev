# kyw-dev Repository Rules

## Truth and context loading

- Product behavior and acceptance: `docs/SPEC.md`
- System boundaries and flows: `docs/ARCHITECTURE.md`
- Setup, usage, and contributor entry: `README.md`
- Current scope/handoff: `docs/tasks/NNNN-*/TASK.md`
- Verification evidence: its `TEST.md`

Always load applicable `AGENTS.md`. During an active kyw workflow load its selected/current Task/Test pair; inactive ordinary prompts select none. Index or search README, SPEC, and ARCHITECTURE first; read only owner sections selected by goal, scope, documentation impact, code, and dependencies.

Read all four for `kyw-init`, rebaseline, redesign, broad/conflicting work, ambiguous ownership, or insufficient truth. Stop on unresolved conflict.

## Scope and routing

<!-- kyw-active-skill-guardrails:v1 -->

- During an active Task workflow, work on one Task; preserve user work and exclude unrelated cleanup. Explanations and small fixes need no Task unless requested.
- All six `kyw-*` Skills are explicit-only. `$kyw-task "goal"` authors minimal complete dependency-aware `READY/READY` pairs, prints one `$kyw-impl NNNN`, and stops; `$kyw-task NNNN` handles only compatible `DRAFT/DRAFT`.
- `$kyw-impl NNNN` is portable for existing implementation. Route only exact `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; incidental `task` prose never routes. Only exact `$kyw-deliver NNNN` performs or resumes current `STANDARD` delivery; it has no bare or managed alias.
- Exact Skill/alias starts guardrails; terminal/stop/cancel/expiry ends them. Inactive prompts get no kyw-only block/warning/Task select/create/redirect.
- Aligned work continues. Material baseline/Task/acceptance/scope/bound change gets the SPEC warning and zero-mutation wait. Immediate exact reconfirmation on unchanged facts permits owner/pair sync then named bounds. Stale/changed/ambiguous/cancelled assent clears it; never chain Skills or bypass safety, honest evidence, or immutable pairs.
- Keep one Task active. Implementation resumes it, otherwise selects the lowest eligible ready Task; pending `STANDARD` delivery blocks with exact `$kyw-deliver NNNN`. Continuous mode is serial, invocation-local, and never crosses into delivery.
- Procedures: `skills/kyw-impl/references/execution.md` through `DONE/PASSED`; `skills/kyw-deliver/references/delivery.md` for delivery. Preserve model/effort unless overridden; aligned actions need no duplicate confirmation.
- Task/Test owns repository outcome; GitHub gates mutable delivery. Gaps need rebaseline; delivered contract-3 pairs are immutable and corrections use hard-dependent Tasks. Publication/registry/version/tag/Release/public submission, retry/fallback, force/destructive recovery, bypass/admin/account change, branch deletion, and unrelated mutation are distinct; failure grants no retry.

## Change and documentation discipline

- Inspect first; choose the smallest conforming design and preserve unknown files.
- Product behavior or acceptance meaning → `docs/SPEC.md`.
- Components, boundaries, dependencies, data flow, storage, or distribution → `docs/ARCHITECTURE.md`.
- Setup, installation, commands, configuration, usage, or contributor workflow → `README.md`.
- Repository-wide Codex behavior or completion rules → `AGENTS.md`.
- Record impact and new production dependencies in the active Task; leave unaffected documents unchanged. Never rely on npm lifecycle scripts for plugin installation.

## Evidence and completion

Stable commands are `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.

Keep Task/Test aligned with scope, risk, acceptance, and executed evidence. Before completion, compare the final diff with scope/matrix, sync truth, validate the pair, and record failures/limits/risks. Before compaction update Completed, Remaining, Resume Point, blockers, and evidence. Complete only when acceptance, checks, diff, documents, and evidence agree; otherwise record `BLOCKED` with recovery. Repository completion never performs or implies delivery.
