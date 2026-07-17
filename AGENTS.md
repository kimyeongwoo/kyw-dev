# kyw-dev Repository Rules

## Sources of truth

- Product behavior and requirements: `docs/SPEC.md`
- System structure and constraints: `docs/ARCHITECTURE.md`
- Installation, usage, and contributor entry point: `README.md`
- Current implementation unit: its `docs/tasks/NNNN-*/TASK.md`
- Current verification contract and evidence: the matching `TEST.md`

When documents conflict, stop and reconcile them before continuing. Do not silently choose one.

## Working scope

- Work on one numbered Task at a time.
- Read only the current Task, its `TEST.md`, the four permanent documents, and explicitly referenced dependencies.
- Do not implement future Tasks while completing the current Task.
- Do not create a numbered Task for explanations or small, clearly bounded fixes unless the user explicitly asks for one.
- Keep `AGENTS.md` thin. Put detailed procedures and templates in Skills, references, or Task documents.

## Change discipline

- Inspect the existing repository before changing it.
- Preserve user-authored content and public behavior unless the active Task explicitly changes them.
- Prefer the smallest design that satisfies the Spec and Architecture.
- Do not add production dependencies without recording the reason in the active Task.
- Never rely on npm lifecycle scripts for plugin installation.

## Stable verification commands

- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`

## Documentation sync

After every code or configuration change, check whether a permanent source of truth changed:

- Product behavior, requirements, business rules, or acceptance criteria → update `docs/SPEC.md`.
- Components, boundaries, dependencies, data flow, storage, or distribution structure → update `docs/ARCHITECTURE.md`.
- Setup, install, commands, configuration, usage, or contributor workflow → update `README.md`.
- Repository-wide Codex behavior or completion rules → update `AGENTS.md`.

Do not edit unaffected documents merely to mark them reviewed. Record the impact decision in the active `TASK.md`.

## Task and test lifecycle

- Create `TASK.md` and `TEST.md` together before implementation begins.
- Map every Task acceptance criterion to at least one test or an explicit verification method.
- Update both files when discoveries, scope, design, or risk changes during implementation.
- Before reporting completion, compare the final diff against the Task and the intent-to-test matrix.
- Record commands actually run, results, and anything not verified.
- If compaction is likely, first update `Completed`, `Remaining`, `Resume Point`, and current test results.

## Completion gate

A Task is complete only when:

1. Its acceptance criteria are satisfied.
2. Required tests and checks were actually run.
3. The final diff was reviewed for unintended changes.
4. Permanent documents are synchronized where affected.
5. `TASK.md` and `TEST.md` contain enough evidence to resume or audit the work.

If a required check cannot run, mark the Task `BLOCKED` or explicitly record the limitation and residual risk. Never claim an unexecuted test passed.
