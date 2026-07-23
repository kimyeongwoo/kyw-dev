# TASK 0105 — Evidence-heavy Release Gate

<!-- kyw-task-contract: 2 -->

## Status

READY

## Goal

Verify one exact release candidate across supported runtime, package, and provenance boundaries.

## Dependencies

- Not applicable — fixture dependencies are represented by its frozen candidate identity.

## In Scope

- Verify the frozen candidate on supported LTS runtime and operating-system lanes.
- Inspect the exact packed file allowlist and legal notices.
- Reproduce install, update, doctor, and uninstall isolation boundaries.
- Record candidate, package, and verification identities without publication.

## Out of Scope

- npm publication, tags, GitHub Releases, or public plugin submission.
- Changing package identity, supported runtime policy, or release acceptance.

## Acceptance Criteria

- [ ] AC-01: Every required runtime and operating-system lane passes for the frozen candidate.
- [ ] AC-02: The extracted package exactly matches the allowlist and contains required legal notices.
- [ ] AC-03: Direct and marketplace lifecycles preserve protected ambient state.
- [ ] AC-04: Candidate and evidence identities are exact, reproducible, and publication-free.

## Plan

- [ ] Freeze candidate and package identities before execution.
- [ ] Run the complete supported runtime matrix.
- [ ] Inspect packed bytes, legal notices, and lifecycle isolation.
- [ ] Reconcile every failure, retry, skipped lane, and residual risk.
- [ ] Complete the final coverage and release-boundary review.

## Decisions

- One exact candidate SHA and one exact packed archive digest bind every result.
- Publication remains separately authorized after this repository-only gate.
- Required lanes cannot be replaced by a generic local pass.

## Risks

- A passing local lane could hide cross-platform path or filesystem behavior.
- Repacking after verification would invalidate candidate identity.
- Marketplace availability can differ from direct lifecycle evidence and must be classified separately.
- Legal-notice or allowlist drift could make a technically passing archive unacceptable.
- Ambient profile mutation would invalidate otherwise successful lifecycle results.

## Discoveries and Changes

- Candidate identity is frozen before verification.
- Runtime lanes, package checks, lifecycle boundaries, and legal evidence remain distinct acceptance inputs.
- Retry evidence must preserve the initial failure rather than replacing it with only the final result.
- The fixture intentionally retains this longer evidence because compressing it would weaken safe resume and audit.

## Documentation Impact

- SPEC: Release acceptance and publication boundaries remain unchanged.
- ARCHITECTURE: Existing package and isolation boundaries are verified without structural change.
- README: Existing release commands remain unchanged.
- AGENTS: Existing verification and delivery rules remain unchanged.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Frozen the acceptance contract; implementation and verification have not started.

## Remaining

- Execute every Plan item and satisfy AC-01 through AC-04.

## Resume Point

Record the exact candidate SHA and archive digest, then start the supported runtime matrix.

## Blockers

- Not applicable — no blocker is known before release verification.
