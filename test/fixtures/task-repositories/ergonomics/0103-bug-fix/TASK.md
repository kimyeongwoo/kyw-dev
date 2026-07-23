# TASK 0103 — Bounded Parser Bug Fix

<!-- kyw-task-contract: 2 -->

## Status

READY

## Goal

Reject a trailing delimiter without changing valid parser output.

## Dependencies

- Not applicable — the parser fixture has no hard Task dependency.

## In Scope

- Reject input ending with an unescaped delimiter.
- Preserve valid escaped-delimiter input.

## Out of Scope

- Replacing the parser or changing its public output schema.

## Acceptance Criteria

- [ ] AC-01: A trailing unescaped delimiter returns the existing parse error.
- [ ] AC-02: Valid escaped-delimiter input retains its current output.

## Plan

- [ ] Add the failing regression, implement the bounded fix, and run parser regressions.

## Decisions

- Preserve the existing error type and message.

## Risks

- The fix could reject a valid escaped delimiter if boundary handling is too broad.

## Discoveries and Changes

- Not applicable — no discovery has changed the approved fixture scope.

## Documentation Impact

- SPEC: Existing parser behavior is restored.
- ARCHITECTURE: Not applicable — parser ownership and dependencies are unchanged.
- README: Not applicable — public commands are unchanged.
- AGENTS: Not applicable — repository rules are unchanged.

## Delivery

- Requirement: NONE — this deterministic bug-fix fixture is not externally delivered.

## Completed

- Not applicable — implementation has not started.

## Remaining

- Implement and verify AC-01 and AC-02.

## Resume Point

Add the trailing-delimiter regression before changing the parser.

## Blockers

- Not applicable — no blocker is known.
