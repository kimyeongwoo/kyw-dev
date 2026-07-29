# kyw-dev Repository Rules

## Truth and context loading

- Product behavior and acceptance: `docs/SPEC.md`
- System boundaries and flows: `docs/ARCHITECTURE.md`
- Setup, usage, and contributor entry: `README.md`
- Current scope/handoff: `docs/tasks/NNNN-*/TASK.md`
- Verification evidence: its `TEST.md`

Always load applicable `AGENTS.md` and the selected/current Task/Test pair. Index or search README, SPEC, and ARCHITECTURE first; read only owner sections selected by Goal, scope, Documentation Impact, changed code, and explicit dependencies.

Read all four permanent documents for `kyw-init`, rebaseline, major redesign, broad cross-owner change, source conflict, a missing or ambiguous owner heading, or when targeted reading cannot establish durable truth. Stop if a conflict remains unresolved.

## Scope and routing

- Work on one Task at a time. Preserve user work; do not implement future Tasks or unrelated cleanup.
- Do not create a Task for an explanation or small fix unless requested.
- All five `kyw-*` Skills are explicit-only. `$kyw-task "goal"` authors the smallest complete dependency-aware `READY/READY` set, prints one `$kyw-impl NNNN`, and stops. `$kyw-task NNNN` handles only compatible `DRAFT/DRAFT`.
- `$kyw-impl NNNN` is portable for existing Tasks. Route only exact `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; incidental `task` prose never routes.
- Keep one Task active. Exact selection cannot bypass it; otherwise resume active work, then resumable `STANDARD` delivery, then the lowest eligible ready Task. Continuous mode is serial and current-invocation-only.
- Detailed procedure: `skills/kyw-impl/references/execution.md`. Preserve model/effort unless overridden. Selected `IMPLEMENT`, `RESUME`, or `DELIVER` needs no ceremonial `STANDARD` reconfirmation.
- Task/Test owns repository outcome; GitHub gates mutable delivery. Aligned-main continuity preserves only evaluator-complete prior `STANDARD` delivery; uncovered/current GitHub proof remains mandatory, and invalid or over-gap continuity requires explicit rebaseline. A future-contract terminal pair becomes byte-immutable at its first evaluator-complete hardened delivery; later corrections use a new explicit hard-dependent Task, while prior-contract history stays grandfathered. Publication, registry/version/tag/Release/public submission, force or destructive work, reruns, bypasses, branch deletion, and unrelated changes require separate authority.

## Change and documentation discipline

- Inspect first, choose the smallest conforming design, and never silently replace behavior or unknown files.
- Product behavior or acceptance meaning → `docs/SPEC.md`.
- Components, boundaries, dependencies, data flow, storage, or distribution → `docs/ARCHITECTURE.md`.
- Setup, installation, commands, configuration, usage, or contributor workflow → `README.md`.
- Repository-wide Codex behavior or completion rules → `AGENTS.md`.
- Record impact in the active Task; do not edit unaffected documents merely to mark them reviewed.
- Record any new production dependency in the active Task. Never rely on npm lifecycle scripts for plugin installation.

## Evidence and completion

Stable commands are:

- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`

Keep Task/Test aligned with discoveries, scope, risk, acceptance, and results. Run acceptance-specific, proportionate checks directly by default. Record only executed commands, failures, limitations, and residual risk; never claim an unexecuted check passed.

Before completion, compare the final diff with scope/matrix, synchronize affected truth, and validate the pair. Before compaction,
update `Completed`, `Remaining`, `Resume Point`, blockers, and evidence. Complete only when acceptance and required checks pass,
diff coverage and documents agree, and evidence is auditable; otherwise record `BLOCKED` with recovery.
