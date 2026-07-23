# TASK 0035 — Verification Tiering and Maintainer Workflow Simplification
<!-- kyw-task-contract: 2 -->

## Status

READY

## Goal

Define and enforce proportional focused, stable, and release verification tiers so ordinary Task delivery does not repeatedly execute release-grade evidence machinery, while retaining full safety and immutable-candidate gates where they add real confidence.

## Dependencies

- Task 0034.

## In Scope

- Inventory repeated commands, package hashing, protected-state snapshots, evaluator stress, exact-SHA checks, and CI steps across ordinary, Task, PR, and release workflows.
- Define three explicit tiers: focused change-specific checks; stable repository/PR checks; release candidate/publication checks.
- Route local and Task-specific checks by changed behavior and risk rather than ceremonial repetition, while keeping the stable hosted PR/main workflow authoritative and unchanged unless acceptance evidence proves a narrower edit is safe.
- Deduplicate package identity proofs that operate on the same immutable bytes while keeping proofs at candidate, evidence-head, registry, and published boundaries where identities can differ.
- Keep all supported OS/runtime CI lanes, native link/junction evidence, filesystem safety, and publication boundaries.
- Measure wall time and command count on representative documentation, Skill, runtime, and release changes.

## Out of Scope

- Weakening required acceptance-specific evidence.
- Removing cross-platform CI or package allowlists.
- Changing the user's configured model/effort.
- Publication or a generic workflow engine.

## Acceptance Criteria

- [ ] AC-01: Each verification command has one documented tier and trigger condition.
- [ ] AC-02: Ordinary documentation and bounded changes avoid unrelated local release/model/evaluator gates; stable hosted PR/main CI remains required and is not silently reduced.
- [ ] AC-03: Stable PR/main CI continues to cover supported Node/OS lanes, packaging, and aggregate required status.
- [ ] AC-04: Release candidate and publication boundaries retain immutable SHA, real tarball, registry, licensing, and protected-state checks.
- [ ] AC-05: Duplicate same-byte checks are removed or justified; no acceptance claim loses its only evidence.
- [ ] AC-06: Representative command count and wall time improve materially for at least two non-release change classes.
- [ ] AC-07: Failure histories, retries, and unverified states remain explicit and fail closed.
- [ ] AC-08: Full repository and release regression checks pass after the routing change.

## Plan

- [ ] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [ ] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [ ] Treat the explicit or automatic selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [ ] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [ ] Implement the smallest design that satisfies the acceptance criteria.
- [ ] Run focused and locally reproducible stable/package checks, verify the hosted workflow contract, and leave mutable run results to the external ledger.
- [ ] Review every changed path against scope, tests, permanent-document impact, and evidence honesty.
- [ ] Set an evidence-backed repository outcome in this pair and stop at the first real blocker.

## Decisions

- Tiering changes which local/task-specific checks run and when; it does not reduce stable hosted CI or what counts as acceptance evidence.
- Cross-platform safety and external publication checks are not optimization targets.
- No daemon, cache database, watcher, or generic scheduler is added.

## Risks

- An overly narrow trigger can miss a transitive package or documentation effect.
- Timing results vary by host; command-count and identical fixture comparisons are also required.
- Release-only tests may rot if never exercised before release.

## Discoveries and Changes

- None yet.

## Documentation Impact

- SPEC: Clarify proportional verification only if user-visible workflow changes.
- ARCHITECTURE: Document verification tiers and evidence boundaries.
- README: Document maintainer commands by tier.
- AGENTS: Keep only the invariant to run risk-proportionate acceptance-specific checks.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- No implementation or verification has run.

## Remaining

- Repository implementation and verification have not started.

## Resume Point

When selected by an exact or automatic Task invocation, revalidate current state and dependencies, treat the selection as execution confirmation, transition to `IN_PROGRESS/RUNNING`, and begin at the first unchecked Plan item. Do not repeat completed predecessor work.

## Blockers

- None known at planning time.
