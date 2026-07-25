# TASK 0041 — Truthful Task Queue Terminal Verdicts

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Ensure exact and automatic Task dispatch never returns the exact all-complete verdict while any applicable current-contract Task is not truthfully complete, while preserving historical compatibility and accepting current hard dependencies only through one explicit canonical grammar.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Current-contract Task state classification used by queue inspection and exact, automatic-next, and continuous dispatch.
- Truthful terminal, blocker, selectable, and no-work outcomes for `DRAFT/DRAFT`, `READY/READY`, `IN_PROGRESS/RUNNING`, `BLOCKED/BLOCKED`, `CANCELLED/BLOCKED`, and `DONE/PASSED` with incomplete or invalid required delivery evidence.
- The existing byte-exact Korean all-complete message and the conditions under which it may be returned.
- A strict current-contract `Dependencies` grammar with one canonical no-dependency sentinel or one canonical `Task NNNN` reference per bullet.
- Table-driven state, dependency, delivery-disposition, exact-mode, automatic-mode, and continuous-mode regression coverage.
- Minimal updates to authoritative permanent or Skill wording only where observable behavior changes.

## Out of Scope

- Batch creation lock, staging, rollback, diagnostic, or recovery changes.
- Rewriting historical Task artifacts or automatically changing Task status or external delivery evidence.
- Module splitting or unrelated Task artifact refactoring.
- Publication, registry mutation, Git tag, GitHub Release, provider abstraction, or another delivery backend.

## Acceptance Criteria

- [x] AC-01: A current `BLOCKED/BLOCKED` Task followed by a later `DONE/PASSED` Task cannot produce `ALL_TASKS_COMPLETE` or the exact all-complete message.
- [x] AC-02: Every current draft, ready, active, blocked, cancelled, delivery-incomplete, or otherwise non-complete state yields a truthful selectable, blocker, or terminal classification instead of a false completion claim.
- [x] AC-03: The existing all-complete Korean message remains byte-for-byte unchanged and is returned only when every applicable current-contract Task is repository-complete and every required terminal delivery gate is satisfied.
- [x] AC-04: A current cancelled Task remains terminal for transitions where required but yields a distinct no-selectable/cancelled result rather than the statement that all Tasks are complete.
- [x] AC-05: Historical legacy `BLOCKED` evidence remains compatible and does not globally block the current queue, while an explicit current hard dependency on an unsatisfied historical Task still fails closed.
- [x] AC-06: Current dependency parsing accepts only the canonical grammar and rejects negated prose, explanatory `Task NNNN` mentions, duplicate or ambiguous forms, missing references, and cycles.
- [x] AC-07: A table-driven matrix covers every current status pair, relevant legacy/current combination, delivery disposition, dispatch mode, canonical dependency form, and misleading dependency text.
- [x] AC-08: Exact-ID dispatch, automatic-next, continuous serial progression, ordinary `STANDARD` delivery authority, direct-install adapter behavior, package behavior, and historical artifact readability remain compatible.

## Plan

- [x] Revalidate the selected baseline, queue states, exact all-complete behavior, dependency parser, adapter contract, and relevant permanent truth before mutation.
- [x] Define one exhaustive truthful classification table and one canonical current dependency grammar without reinterpreting legacy artifacts.
- [x] Correct queue/dependency parsing and dispatch at the smallest owning boundary while preserving public result codes and the exact message.
- [x] Add table-driven unit and process regressions for statuses, delivery dispositions, exact/next/continuous modes, misleading dependency prose, missing edges, and cycles.
- [x] Synchronize only authoritative permanent and Skill projections whose observable meaning changed.
- [x] Run focused verification, the exact-path planner, required Stable/package checks, current/all-Task canonical validation, and final diff-to-matrix review.
- [x] Record truthful evidence, terminal repository status, and handoff before ordinary `STANDARD` delivery.

## Decisions

- Current-contract terminal truth is evaluated across all applicable current Tasks, not inferred only from the highest-numbered or last selectable record.
- Cancellation may terminate transitions without being semantically relabeled as completed work.
- Current dependency syntax is deliberately narrow; legacy artifacts retain their historical parsing contract.
- The exact all-complete message is a compatibility surface and must not be edited while its eligibility is corrected.

## Risks

- Fixing only the known blocked-then-done example could leave other false terminal combinations; the state table must be exhaustive.
- Tightening dependency parsing can accidentally break historical evidence unless current and legacy contracts stay separate.
- Delivery evidence and repository completion are distinct; conflating them can create either false completion or permanent false blocking.
- Exact, automatic, and continuous modes can diverge unless they share the same tested classification source.

## Discoveries and Changes

- Preflight fixed `main`, upstream, `origin/main`, and direct remote `main` at `913123b9b364cb66e1431785d2bd8ca158bcc863` with `0/0` ahead/behind and no staged or unstaged paths.
- The only untracked paths are the pre-created current-contract queue pairs for Tasks 0041 through 0047; Task 0041 is isolated on `task/0041-truthful-task-queue-terminal-verdicts`.
- The installed CLI observation is `codex-cli 0.145.0` at `C:\Users\DevHamster\AppData\Roaming\npm\codex.ps1`; it is not substituted for the active API surface version.
- A temporary current-contract fixture reproduced the defect: `BLOCKED/BLOCKED` Task 0001 followed by `DONE/PASSED` Task 0002 returned `NO_WORK`, `ALL_TASKS_COMPLETE`, and the exact Korean all-complete message.
- One exhaustive status-pair table now owns current lifecycle classification, and automatic terminal resolution inspects the first non-complete current Task before allowing the byte-exact all-complete result.
- Non-complete current pairs now accept only the canonical sentinel or distinct `- Task NNNN.` bullets. Repository-complete current artifacts retain the previous literal-reference reader solely to preserve immutable pre-rule evidence.
- The first Stable run exposed a missing canonical SPEC/README instruction projection; the projection was restored and both the focused owner test and the complete Stable gate passed on rerun.

## Documentation Impact

- SPEC: Updated current dependency grammar, all-current completion eligibility, and distinct cancellation semantics.
- ARCHITECTURE: Updated the exhaustive queue-state, dependency-parser compatibility, and terminal-resolution boundaries.
- README: Updated the concise user-facing grammar and truthful terminal projection.
- AGENTS: Unaffected; repository-wide routing, authority, and completion invariants did not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Revalidated Task/Test, permanent truth, owning runtime and adapter surfaces, and the acceptance-to-test mapping.
- Completed local and remote preflight, preserved the pre-created queue, and reproduced the false terminal verdict without repository mutation.
- Implemented exhaustive lifecycle classification, all-current terminal eligibility, strict open-Task dependency grammar, completed-history compatibility, and canonical template projection.
- Added table-driven core, pair-validator, packaged-adapter, direct-install, and package regressions.
- Synchronized SPEC, ARCHITECTURE, README, and the packaged execution reference; reviewed AGENTS and the thin SKILL projection as unaffected.
- Passed final focused, Stable, canonical 47-pair, lint, format, package, diff-integrity, and AC-to-test reviews.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker is known.
