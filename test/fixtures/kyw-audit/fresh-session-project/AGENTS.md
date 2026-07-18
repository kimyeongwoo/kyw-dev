# Audit Fixture Rules

## Sources of truth

- Product behavior: `docs/SPEC.md`
- Structure: `docs/ARCHITECTURE.md`
- Usage: `README.md`
- Current work: `docs/tasks/0001-greeting-contract/TASK.md` and `TEST.md`

## Scope and verification

- Audit only Task 0001.
- Preserve all pre-existing changes under `notes/`, `scratch/`, and `generated/`; they are unrelated user work outside Task 0001.
- Use `node --test` for the focused and full fixture verification.
- Do not create a follow-on Task, commit, push, or publish.
