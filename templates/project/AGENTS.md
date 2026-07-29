# Repository Instructions

## Truth and context loading

- Product/acceptance: `docs/SPEC.md`; structure/flows: `docs/ARCHITECTURE.md`.
- Setup/usage/contributing: `README.md`; current scope/evidence: its Task/Test pair.

Always load applicable `AGENTS.md` and the selected/current Task/Test pair. Index or search README, SPEC, and ARCHITECTURE first; read only owner sections selected by Goal, scope, Documentation Impact, changed code, and dependencies.

Read all four permanent documents for `kyw-init`, rebaseline, major redesign, broad cross-owner change, source conflict, missing/ambiguous ownership, or insufficient targeted truth. Stop if a conflict remains unresolved.

## Scope and routing

- Work on one Task; preserve user work and exclude future Tasks/unrelated cleanup.
- Do not create a Task for an explanation or small fix unless requested.
- All five `kyw-*` Skills are explicit-only. `$kyw-task "goal"` authors the smallest complete dependency-aware `READY/READY` set, prints one `$kyw-impl NNNN`, and stops. `$kyw-task NNNN` handles only compatible `DRAFT/DRAFT`.
- `$kyw-impl NNNN` is portable for existing Tasks. Route only exact `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; incidental `task` prose never routes.
- Keep one Task active: exact cannot bypass it; otherwise resume active work, resumable `STANDARD` delivery, then the lowest eligible ready Task. Continuous mode is serial and current-invocation-only.
- Preserve model/effort unless overridden. Selected `IMPLEMENT`, `RESUME`, or `DELIVER` needs no ceremonial `STANDARD` reconfirmation.
- Task/Test owns repository outcome; GitHub gates mutable delivery. Aligned-main continuity preserves only evaluator-complete prior `STANDARD` delivery; uncovered/current GitHub proof remains mandatory, and invalid or over-gap continuity requires explicit rebaseline. Publication, registry/version/tag/Release/public submission, force/destructive work, reruns, bypasses, branch deletion, and unrelated changes require separate authority.

## Change and documentation discipline

- Inspect first; choose the smallest conforming design and preserve behavior/unknown files.
- Product/acceptance → `docs/SPEC.md`; structure/flows/distribution → `docs/ARCHITECTURE.md`.
- Setup/usage/contributing → `README.md`; repository-wide agent rules → `AGENTS.md`.
- Record impact in the active Task; do not edit unaffected documents merely to mark them reviewed.

## Evidence and completion

{{VERIFY_COMMANDS}}

Keep Task/Test aligned with scope, risk, acceptance, and results. Run proportionate acceptance checks. Record only executed commands, failures, limitations, and residual risk.

Before completion, compare diff to scope/matrix, synchronize affected truth, and validate the pair. Before compaction, update `Completed`, `Remaining`, `Resume Point`, blockers, and evidence. Complete only when acceptance, checks, diff, documents, and evidence agree; otherwise record `BLOCKED` with recovery.
