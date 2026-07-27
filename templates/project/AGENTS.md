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

This is the minimal derived projection required for loaded repository routing. The installed `$kyw-impl` execution reference owns the detailed procedure.

- `$kyw-task "goal"` only authors the smallest dependency-aware `READY/READY` pair set, reports one exact next `$kyw-impl NNNN`, and stops without implementation or automatic chaining. `$kyw-task NNNN` only resumes compatible `DRAFT/DRAFT` authoring; a non-DRAFT pair receives `$kyw-impl NNNN` migration guidance.
- `$kyw-impl NNNN` is portable for existing Tasks. With this contract, route only `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘` to `kyw-impl`; incidental `task` text never triggers.
- Keep one Task active: exact cannot bypass it; ready selection confirms; otherwise resume the sole active, then resumable `STANDARD` delivery, then the lowest eligible ready. Continuous mode is serial here.
- Preserve model/effort unless overridden. Task/Test owns repository outcome; GitHub gates delivery. Selected `IMPLEMENT`, `RESUME`, or `DELIVER` needs no ordinary `STANDARD` reconfirmation. Ask one question with one recommendation only for a real user-owned blocker; otherwise consume appended constraints and proceed. Publication/force/destructive/non-standard actions stay separate.

## Documentation Sync

- Product behavior or acceptance criteria → `docs/SPEC.md`
- Components, boundaries, dependencies, or data flow → `docs/ARCHITECTURE.md`
- Setup, commands, configuration, or usage → `README.md`
- Repository-wide agent invariants → `AGENTS.md`

Record each impact decision in the active Task. Do not edit an unaffected document merely to mark it reviewed.

## Verification

{{VERIFY_COMMANDS}}

Run proportionate verification directly by default; delegate only when requested or materially confidence-improving. Record only commands that ran, their results, and unverified work in the active `TEST.md`.

## Completion Gate

A Task is complete only when its acceptance criteria pass, required checks ran, the final diff was reviewed, affected permanent documents are synchronized, and Task/Test evidence is auditable. Otherwise report the work as blocked with the remaining risk.
