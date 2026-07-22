# Fixture Repository Rules

## Sources of Truth

- Product behavior: `docs/SPEC.md`
- Architecture: `docs/ARCHITECTURE.md`
- Setup and usage: `README.md`
- Current work: `docs/tasks/NNNN-*/TASK.md` and `TEST.md`

Stop when these sources conflict.

## Working Scope

- Use one numbered Task for substantial outcomes.
- Do not create a Task for a small bounded fix unless requested.
- Preserve user work and do not implement future Tasks.

## Documentation Sync

- Behavior or acceptance meaning → SPEC.
- Components or data flow → Architecture.
- Commands or usage → README.
- Repository-wide agent rules → AGENTS.

## Verification

- `npm test`

## Completion Gate

Require mapped acceptance evidence, executed checks, final-diff review, and synchronized durable documents before completion.
