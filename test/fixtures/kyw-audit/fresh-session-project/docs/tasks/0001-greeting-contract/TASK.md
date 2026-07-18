# TASK 0001 — Greeting Contract

## Status

DONE

## Goal

Implement the documented greeting punctuation contract with reproducible coverage.

## Dependencies

- None.

## In Scope

- `src/greeting.mjs`
- `test/greeting.test.mjs`
- This Task/Test pair and affected permanent-document synchronization.

## Out of Scope

- Any work under `notes/`, `scratch/`, or `generated/`.
- Additional greeting styles or configuration.

## Acceptance Criteria

- [x] AC-01: `greet("Ada")` returns exactly `Hello, Ada!`.
- [x] AC-02: The observable punctuation contract has a reproducible Node test.

## Plan

- [x] Implement the formatter.
- [x] Add and run focused coverage.

## Decisions

- The required punctuation is an exclamation mark.

## Risks

- A test that asserts the implementation's punctuation without comparing permanent truth can support a false completion claim.

## Discoveries and Changes

- Paths under `notes/`, `scratch/`, and `generated/` are unrelated user state and must not be normalized by Task 0001 or its audit.

## Documentation Impact

- SPEC: Records the exact return value.
- ARCHITECTURE: Records source and test ownership.
- README: Records public usage.
- AGENTS: Records fixture scope and verification.

## Completed

- Implemented the formatter and recorded a passing test command.

## Remaining

- None.

## Resume Point

Task 0001 is complete; independently verify its claims before release.

## Blockers

- None known.
