# TASK 0034 — Retire the Cancelled Nested Behavioral Harness

## Status

READY

## Goal

Remove unreachable nested/fixed-cohort SPEC behavioral execution machinery while preserving reusable S-01 through S-06 fixtures, deterministic acceptance validators, historical evidence, and current-session direct verification.

## Dependencies

- Task 0033.

## In Scope

- Perform a reachability inventory of the Task 0026 behavioral runner, flags, capability probes, process topology, fixtures, tests, package boundaries, and documentation references.
- Preserve S-01 through S-06 fixture intent, deterministic validators, intentionally untested branch coverage, package-byte identity checks, and direct current-session workflow support.
- Remove nested `codex exec` orchestration, mandatory six-session/fixed-cohort logic, capability-probe variants, and tests used only by the cancelled method when proven unreachable.
- Keep historical Task 0026 `CANCELLED/BLOCKED` files and retained evidence unchanged.
- Measure source/test size and stable-suite runtime before/after and enumerate every removed path or branch.

## Out of Scope

- Removing audit/grilling evaluators that remain separately justified.
- Rerunning Task 0026 model cohorts or reclassifying its evidence.
- Changing SPEC AC-04 through AC-08 behavior.
- Deleting historical Task documents or raw evidence outside exact owned cleanup.

## Acceptance Criteria

- [ ] AC-01: No production, Skill, CI, release, or supported direct-verification path calls the cancelled nested behavioral execution path.
- [ ] AC-02: S-01 through S-06 fixtures and deterministic acceptance contracts remain runnable without a nested model process.
- [ ] AC-03: Task 0026 historical bytes and its `CANCELLED/BLOCKED` meaning remain unchanged.
- [ ] AC-04: Removed code/flags/tests are exact, attributable, and absent from the npm package before and after.
- [ ] AC-05: Current-session direct behavior and Task 0027 carry-forward assumptions retain focused coverage.
- [ ] AC-06: Full tests, lint, format, pack, and release CI pass with a recorded maintenance/runtime reduction.
- [ ] AC-07: Any still-reachable nested path blocks deletion rather than being silently broken.

## Plan

- [ ] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [ ] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [ ] Treat the explicit or automatic selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [ ] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [ ] Implement the smallest design that satisfies the acceptance criteria.
- [ ] Run focused verification, then the required stable/package/hosted checks implied by the final diff.
- [ ] Review every changed path against scope, tests, permanent-document impact, and evidence honesty.
- [ ] Set an evidence-backed repository outcome in this pair without preclaiming future PR/merge/post-merge facts; complete external delivery through the exact GitHub ledger and stop at the first real blocker.

## Decisions

- Fixtures are product evidence assets; the cancelled orchestration is not.
- Historical documentation is preserved even when its executable method is retired.
- No replacement framework is introduced.

## Risks

- A release validator may depend indirectly on the old runner.
- Overbroad deletion could remove current direct acceptance fixtures.
- Ignored evidence cleanup could accidentally target user-owned files.

## Discoveries and Changes

- None yet.

## Documentation Impact

- SPEC: Unchanged unless a supported verification method is described there.
- ARCHITECTURE: Remove the cancelled runner from current component inventory; retain historical boundary notes where needed.
- README: Remove current guidance that suggests the cancelled path is supported.
- AGENTS: Unchanged.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- No implementation or verification has run.

## Remaining

- Repository implementation and verification have not started. External delivery is intentionally not a future fact required inside this artifact.

## Resume Point

When selected by an exact or automatic Task invocation, revalidate current state and dependencies, treat the selection as execution confirmation, transition to `IN_PROGRESS/RUNNING`, and begin at the first unchecked Plan item. Do not repeat completed predecessor work.

## Blockers

- None known at planning time.
