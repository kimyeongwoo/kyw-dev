# Repository Instructions

## Sources of Truth

- Product behavior and requirements: `docs/SPEC.md`
- System structure and constraints: `docs/ARCHITECTURE.md`
- Installation, usage, and contributor entry point: `README.md`
- Current implementation unit: its `docs/tasks/NNNN-*/TASK.md`
- Current verification contract and evidence: the matching `TEST.md`

Stop and reconcile these documents when they conflict.

## Working Scope

- Work on one numbered Task at a time for substantial, independently testable outcomes.
- Do not create a Task for an explanation or a small, clearly bounded fix unless the user asks for one.
- Read the current Task, its Test, the permanent documents, and only explicitly referenced dependencies.
- Preserve user-authored behavior and do not implement future Tasks.

## Task Routing

- `$kyw-task NNNN` is portable for existing Tasks. With this contract, also route only `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; incidental `task` text never triggers.
- Keep one Task active: exact cannot bypass it; ready selection confirms; otherwise resume the sole active or choose the lowest eligible ready. Continuous mode is serial here.
- Preserve model/effort unless the user overrides. Task/Test owns repository outcome; GitHub exact-SHA state gates delivery and advancement.

## Documentation Sync

- Product behavior or acceptance criteria → `docs/SPEC.md`
- Components, boundaries, dependencies, or data flow → `docs/ARCHITECTURE.md`
- Setup, commands, configuration, or usage → `README.md`
- Repository-wide agent invariants → `AGENTS.md`

Record each impact decision in the active Task. Do not edit an unaffected document merely to mark it reviewed.

## Verification

{{VERIFY_COMMANDS}}

Run proportionate verification in the current session by default. Use subagents or isolated sessions only when the user requests them or independent verification would materially improve confidence. Do not require nested Codex execution or a subagent cohort merely to satisfy a generic verification step.

Record commands actually run, their results, and anything not verified in the active `TEST.md`; not using delegation is not by itself a blocker.

## Completion Gate

A Task is complete only when its acceptance criteria pass, required checks ran, the final diff was reviewed, affected permanent documents are synchronized, and Task/Test evidence is auditable. Otherwise report the work as blocked with the remaining risk.
