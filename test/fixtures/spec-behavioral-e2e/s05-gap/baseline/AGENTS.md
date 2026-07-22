# Fixture Repository Rules

## Sources of Truth

- Product behavior: `docs/SPEC.md`
- Architecture: `docs/ARCHITECTURE.md`
- Setup and usage: `README.md`
- Current Task and Test: `docs/tasks/0001-greeting-style/`

## Working Scope

- Work only on the current Task and preserve unrelated files.
- Small ordinary fixes do not require a Task unless requested.

## Documentation Sync

Route behavior to SPEC, structure to Architecture, commands and usage to README, and invariant agent rules to AGENTS.

## Verification

- `npm test`

## Completion Gate

A generic passing suite is insufficient when a meaningful implementation branch lacks acceptance-specific coverage.
