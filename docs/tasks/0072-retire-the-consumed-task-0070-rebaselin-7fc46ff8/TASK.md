# TASK 0072 — Retire the Consumed Task 0070 Rebaseline Shim and Restore Portable Task IDs

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Remove the consumed one-time Task 0070 rebaseline interception and repository-specific package state so an ordinary READY/READY Task 0070 in any project routes exactly like an isomorphic Task with another ID, while preserving the general fail-closed continuity and explicitly authorized migration primitives.

## Dependencies

- Task 0070.
- Task 0071.

## In Scope

- Remove the exact Task-0070 dispatcher interception, its special authority option, and the branch, main SHA, checkpoint digest, Task hashes, path allowlist, and focused-proof constants that existed only for the completed one-time recovery.
- Remove corresponding adapter, kyw-impl Skill, execution-procedure, test-fixture, cached-runtime, direct-install, and package projections that expose or invoke the consumed path.
- Make exact $kyw-impl 0070 against a generic project with an ordinary READY/READY Task 0070 reach the normal queue and dispatch path without MIGRATION_AUTHORITY_REQUIRED.
- Compare generic Task 0070 behavior with an isomorphic non-0070 Task across IMPLEMENT, RESUME, DELIVER, blocked, invalid, and terminal routing outcomes.
- Keep bootstrap-continuity with separate EXPLICIT_REBASELINE authority available as the general migration boundary, without automatic history replay or another Task-specific shortcut.
- Prove source, packed, cached, and direct-install runtimes contain no kyw-dev repository branch, SHA, checkpoint, Task-pair hash, allowlist, or exact Task-0070 recovery state.
- Update SPEC, ARCHITECTURE, and the owning kyw-impl execution procedure to describe the retired historical exception and the restored portable dispatch/package boundary.
- Preserve Task 0070 TASK.md and TEST.md bytes, the trusted continuity checkpoint, and all GitHub/npm state.

## Out of Scope

- Running another rebaseline, preparing or applying a continuity transition, replaying all history, changing the checkpoint, or adding a replacement recovery subsystem.
- Changing ordinary queue precedence, exact selection rules, STANDARD delivery evaluation, or immutable terminal-pair semantics.
- Renumbering any Task, reserving Task 0070 globally, or editing an existing terminal pair to avoid the collision.
- Changing package version metadata, preparing 0.1.4, publishing, dispatching CI, or mutating any external ledger.

## Acceptance Criteria

- [x] AC-01: In an isolated ordinary project, exact $kyw-impl 0070 with a valid READY/READY Task 0070 uses normal dispatch and returns the same selected action as an isomorphic non-0070 Task without requiring migration authority.
- [x] AC-02: IMPLEMENT, RESUME, DELIVER, terminal, incompatible-state, active-Task, and dependency routing remain ID-agnostic and preserve the sole-dispatcher and one-active-Task rules.
- [x] AC-03: Production core and adapter surfaces contain no Task-0070-only validation, bootstrap option, branch/main/checkpoint/hash/path allowlist, or pre-dispatch source-mutation path.
- [x] AC-04: Source, npm candidate, isolated plugin-cache, cached, and direct-install bytes contain no consumed repository-specific identifiers or state, and all runtime projections behave identically.
- [x] AC-05: The separately invoked bootstrap-continuity EXPLICIT_REBASELINE primitive still rejects missing authority, invalid checkpoints, gaps, drift, and self-coverage and accepts only its general documented migration contract.
- [x] AC-06: SPEC, ARCHITECTURE, and kyw-impl procedure describe ordinary portable IDs and package purity without presenting the completed Task 0070 exception as a live path; README and AGENTS remain unchanged.
- [x] AC-07: Focused dispatch, continuity, hydration, instruction-surface, distribution, and installation tests plus all Stable commands and package scans pass with Task 0070 and checkpoint hashes unchanged.

## Plan

- [x] Inventory every source, adapter, Skill, procedure, test, and packaged projection that names the consumed Task 0070 recovery path or embeds repository state.
- [x] Add generic temporary-repository tests that demonstrate the Task ID collision and establish ID-isomorphic expected routing.
- [x] Delete the narrow production interception and package-state constants while retaining the general explicit migration command as a separate fail-closed primitive.
- [x] Synchronize portable dispatch and distribution owner documentation and remove obsolete Task-specific procedure text.
- [x] Run focused, Stable, package/direct-install scan, pair-integrity, transaction, and final-diff checks and record executed evidence.

## Decisions

- Delete rather than generalize the one-time shim because its exact repository frontier has already been consumed and keeping it creates both a portable ID collision and package-state disclosure.
- Retain the general explicit migration primitive as a separately invoked operation; removal of the Task-specific dispatch hook does not authorize migration or weaken its checks.
- Use behaviorally isomorphic Task IDs and real packaged runtimes as the portability oracle instead of checking only for one symbol name.
- Treat all Task 0070 historical details as Task-owned evidence that remains immutable, not as live package configuration.

## Risks

- Removing only the obvious constant while leaving adapter grammar, Skill instructions, generated projections, or tests could preserve the collision or leak through another package path.
- Over-broad removal could accidentally delete the general migration primitive or ordinary rolling continuity transition.
- A source-only positive test could miss stale cached or direct-install runtime bytes.
- Documentation can become misleading if it erases historical evidence rather than distinguishing completed history from the current portable contract.

## Discoveries and Changes

- Production hydration currently recognizes exact Task 0070 before repository identity is established, so a generic project's Task 0070 can be blocked by kyw-dev-specific migration requirements.
- The one-time recovery embeds kyw-dev branch, main, checkpoint, Task-pair hashes, and allowed paths in portable runtime source and package projections.
- Task 0070 completed the intended recovery and is now immutable historical evidence; no new rebaseline authority was requested.
- The preceding verification correction is a hard dependency so this Task can complete the required Stable gate on supported Windows hosts.
- Execution started at `2026-09-01T09:15:19+09:00` after local, upstream, direct-remote, and GitHub-derived `main` aligned at `da2cfd6998495074326180e89833f7fee8d00524`; the pre-created Task 0072–0075 queue was separated from implementation work, and the sole dispatcher selected `IMPLEMENT / 0072` with one continuity transition prepared for delivered predecessor Task 0071.
- After active-pair validation, the untouched transition applied exactly once and advanced the checkpoint from count `39` / last Task `0070` to count `40` / last Task `0071`, digest `d405e676e2097a439203d2060591d8d5eff829a421d81f883b95e947bf5a4b77`, while excluding Task 0072 and preserving Task 0070 hashes `2d678278…` / `79e47459…`.

## Documentation Impact

- SPEC: Update the delivery section to retire the consumed Task-specific exception and state that ordinary Task IDs are portable while explicit migration remains separate.
- ARCHITECTURE: Remove the Task-0070 pre-dispatch branch from the current flow and restore the generic package/runtime boundary while retaining the general migration component.
- README: Expected unchanged — public setup, usage, and release status do not change.
- AGENTS: Expected unchanged — repository-wide routing and authority rules already require explicit rebaseline and immutable corrections.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Revalidated the immutable Task 0070 pair hashes, Task 0071 dependency, count-39 checkpoint baseline, clean Task transaction state, aligned local/upstream/direct-remote main, and the preserved pre-created Task 0072–0075 queue.
- Completed the sole production dispatcher call, established the selected Task 0072 branch, and activated this pair without editing any terminal Task/Test pair.
- Applied the selected predecessor transition once, advancing only delivered Task 0071 into the active count-40 continuity checkpoint and leaving Task 0072 uncovered.
- Removed the exact Task-0070 contract, worktree-checkpoint shortcut, frozen pre-dispatch validation, adapter authority option, and special preparation/diagnostic paths while preserving generic rolling continuity.
- Added source and installed-runtime ID-isomorphism, package-purity, retired-option, separate-authority, and backend migration regressions; the retained backend now rejects exact terminal self-coverage before repository or GitHub access.
- Updated SPEC, ARCHITECTURE, kyw-impl Skill, and execution procedure; README and AGENTS remain byte-stable.
- The planner selected `RELEASE`; the combined core suite passed `115/118` with three expected host/live skips. The first distribution run passed `77/80` and correctly stopped only because this active TEST had not yet recorded the required permanent-document delta table.
- Corrected verification passed the combined core suite `116/119`, distribution/isolation `80/80`, full RELEASE `408/411` with three expected skips, lint, format, the 43-file pack check, and candidate SHA-256 `4a53199b…`.
- The required-marketplace isolation gate completed `CLEAN` in one attempt, byte-matched all 16 cached core files, selected ordinary cached Task `0070` for `IMPLEMENT`, and preserved normal Codex/Agents/npm state.
- Final scope, transaction, permanent-document, immutable Task 0070, checkpoint, whitespace, and pair validation checks passed; pre-created Tasks 0073–0075 remain preserved and outside the Task 0072 index scope.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker is known at authoring time.
