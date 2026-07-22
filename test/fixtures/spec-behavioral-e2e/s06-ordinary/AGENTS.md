# Fixture Repository Rules

## Sources of Truth

- Product behavior: `docs/SPEC.md`
- Architecture: `docs/ARCHITECTURE.md`
- Setup and user-visible usage: `README.md`
- A current numbered Task and matching Test when substantial Task work exists.

Stop and reconcile conflicts.

## Working Scope

- Do not create a numbered Task for a small, clearly bounded change unless the user asks.
- Preserve unrelated user files and behavior.

## Documentation Sync

- Behavior or acceptance meaning → `docs/SPEC.md`.
- Components or data flow → `docs/ARCHITECTURE.md`.
- Setup, commands, configuration, or user-visible usage → `README.md`.
- Repository-wide agent rules → `AGENTS.md`.
- Review all four routes after code changes, but edit only documents whose meaning changed.

## Verification

- `npm test`

## Completion Gate

Run proportionate tests, review the final diff, and report documentation impact.
