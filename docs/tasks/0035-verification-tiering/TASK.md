# TASK 0035 — Verification Tiering and Maintainer Workflow Simplification
<!-- kyw-task-contract: 2 -->

## Status

DONE

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

- [x] AC-01: Each verification command has one documented tier and trigger condition.
- [x] AC-02: Ordinary documentation and bounded changes avoid unrelated local release/model/evaluator gates; stable hosted PR/main CI remains required and is not silently reduced.
- [x] AC-03: Stable PR/main CI continues to cover supported Node/OS lanes, packaging, and aggregate required status.
- [x] AC-04: Release candidate and publication boundaries retain immutable SHA, real tarball, registry, licensing, and protected-state checks.
- [x] AC-05: Duplicate same-byte checks are removed or justified; no acceptance claim loses its only evidence.
- [x] AC-06: Representative command count and wall time improve materially for at least two non-release change classes.
- [x] AC-07: Failure histories, retries, and unverified states remain explicit and fail closed.
- [x] AC-08: Full repository and release regression checks pass after the routing change.

## Plan

- [x] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [x] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [x] Treat the explicit or automatic selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [x] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [x] Implement the smallest design that satisfies the acceptance criteria.
- [x] Run focused and locally reproducible stable/package checks, verify the hosted workflow contract, and leave mutable run results to the external ledger.
- [x] Review every changed path against scope, tests, permanent-document impact, and evidence honesty.
- [x] Set an evidence-backed repository outcome in this pair and stop at the first real blocker.

## Decisions

- Tiering changes which local/task-specific checks run and when; it does not reduce stable hosted CI or what counts as acceptance evidence.
- Cross-platform safety and external publication checks are not optimization targets.
- No daemon, cache database, watcher, or generic scheduler is added.
- The planner is read-only, accepts explicit repository-relative paths, ignores only the current Task/Test evidence shape for risk classification, and escalates mixed, unknown, runtime, or candidate inputs conservatively.
- Hosted Stable lanes remain unchanged; the packed job runs only the one immutable-candidate command because the separate Stable matrix already owns complete exact-head repository evidence.
- Working-tree package selection, immutable candidate, isolated lifecycle, registry dry run, and published bytes remain distinct identity boundaries. Native OS/runtime package and junction checks remain justified Stable evidence rather than duplicate candidate proofs.

## Risks

- An overly narrow trigger can miss a transitive package or documentation effect.
- Timing results vary by host; command-count and identical fixture comparisons are also required.
- Release-only tests may rot if never exercised before release.

## Discoveries and Changes

- Fresh local and remote preflight found a clean worktree, no existing local or remote Task 0035 branch, and exact delivered `origin/main` SHA `9c0f1594cd12dd0ae69727280de852a1f297ce5a`.
- Fresh GitHub evidence proved Tasks 0030 through 0034 and Task 0039 delivered through merged exact-head PRs, successful PR CI, clear review state, and successful exact post-merge `main` CI.
- Managed exact dispatch selected Task 0035 with action `IMPLEMENT`, authority `STANDARD_LIFECYCLE`, no override, and no ceremonial confirmation.
- Task 0035 now runs on `task/0035-verification-tiering` from the exact delivered `origin/main` SHA.
- Pre-change `npm run check` executes four leaf commands and passed in 38,253 ms; `npm run release:ci` executes those same four plus the real-candidate check and passed in 36,421 ms on this host.
- The current hosted workflow executes 28 stable leaf commands across seven lanes, then repeats all four once inside the packed job before its real-candidate check: 33 leaf verification commands before the aggregate gate.
- Fixed representative documentation checks passed in 648 ms with two leaf commands; fixed representative `kyw-task` Skill checks passed in 5,811 ms with three leaf commands. These are the pre-change comparable focused workloads, not yet an implemented routing contract.
- Inventory assigned the supported local, hosted, model-backed, candidate, isolation, registry, and published-package commands to one of Focused, Stable, or Release with one trigger each.
- The selected implementation adds a deterministic plan-only classifier, a dedicated `release:candidate` command, and a hosted packed-job split. It adds no production dependency, background execution, cache, or generic workflow engine.
- The first focused implementation run passed 29/30 and preserved one failure: the expanded Task execution reference measured 37,138 bytes in the representative instruction bundle against the retained 36,382-byte ceiling. The detailed tier contract remains in permanent documents, while the loaded execution procedure was compressed without removing tier, hosted-Stable, or identity-boundary behavior.
- The first compression retry again passed 29/30 and reduced the same sole overhead failure to 36,550 bytes, 168 bytes above the ceiling; the projection was shortened again rather than weakening or raising the retained bound.
- The second compression retry again passed 29/30 and left only a 26-byte overage at 36,408 bytes; one redundant phrase was removed without changing the procedure.
- The third compression retry passed the retained bundle ceiling and 29 other checks; its only failure was the new Task-specific test still asserting the pre-compression wording, so that stale test expectation was aligned to the canonical short phrase.
- Final focused routing, instruction, CI, package metadata, real-tarball lifecycle, and protected-state coverage passed 61/61.
- The final planner selects 2 leaf commands for documentation, 3 for a packaged `kyw-task` Skill, 4 for runtime/unknown work, and 5 for release-sensitive or explicitly escalated candidate work. Task/Test evidence paths do not inflate the change class.
- Compared with the pre-change four-command/38,253-ms local Stable default, the final documentation plan is 2 commands/674 ms (-50% commands, -98.2% wall time) and the Skill plan is 3 commands/5,754 ms (-25% commands, -85.0% wall time). Runtime remains four commands and Release remains five by design.
- Hosted source command count falls from 33 to 29 leaf commands (-4/-12.1%) by removing the packed job's duplicate exact-head Stable composite; all seven Stable lanes, their four commands, the real candidate, and the aggregate gate remain.
- `npm run release:check` passed the complete 247-test repository regression, lint, format, 29-file package selection, real candidate SHA-256 `73718b9be2b84cb1029519c87188a61fc0be6d2d3c0dd6ef5a69b4ba11feb299`, and a non-publishing npm registry dry run. The registry reported shasum `bd853e27ccdc16fd780077922262b468a0766ddc` and integrity `sha512-B7AGMHKALo+99Zhc6+kRpvmPi7j/EwzFxhb7NTQ/JUteVYUocAi9yS2TD7JA6pCJ50sSUPFWTw0muTtvsnBK7A==`.
- Final branch coverage added template ownership, unknown packaged-Skill fallback, evidence-only and duplicate inputs, mixed Release escalation, CLI help/unknown options, NUL/non-string paths, and every public verification-script owner. The final `npm run check` passed 249/249 tests, lint over 59 JavaScript modules, format over 256 files, and the unchanged 29-file/79,813-byte package selection.
- A terminal `npm run release:candidate` reproduced the same 29-file/79,813-byte archive and exact SHA-256 after the final development-only planner/test additions. No production dependency or packaged file was added.
- Final changed-path planning classified the complete 13-path diff as Release with five local leaf commands and retained 29 hosted leaf commands before the aggregate gate. Changed-path, branch, package-boundary, permanent-document, and acceptance-matrix review found no out-of-scope or untested repository behavior.

## Documentation Impact

- SPEC: Added the user-visible Focused/Stable/Release behavior, conservative escalation, mandatory hosted Stable gate, and identity-boundary rules.
- ARCHITECTURE: Added the deterministic planner, tier/CI control flow, packed-job deduplication, and package identity ownership boundaries.
- README: Added maintainer tier commands, planner usage, candidate/local-release distinction, and hosted behavior.
- AGENTS: Unchanged — its existing acceptance-specific, risk-proportionate verification invariant remains sufficient.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- Revalidated the clean repository, local and remote refs, Task inventory, dependency graph, PR review state, and exact PR/post-merge Actions identities.
- Read the four permanent documents, this pair, the Task execution reference, and the explicit Task 0034 dependency chain needed by deterministic dispatch.
- Validated Task 0035 and every current transitive dependency pair.
- Exact managed dispatch selected this `READY/READY` pair for implementation without another question.
- Created the Task 0035 branch from exact delivered `origin/main` and entered `IN_PROGRESS/RUNNING`.
- Captured successful fixed pre-change stable, release, documentation-focused, and Skill-focused command-count and wall-time baselines.
- Added the three-tier command registry and deterministic fail-closed planner with documentation, Skill/template, runtime/unknown, release-sensitive, evidence-path, invalid-path, mixed-path, CLI, and explicit-candidate coverage.
- Added the dedicated `release:candidate` package command and changed only the hosted packed job to use it; local `release:ci` still composes full Stable plus one real candidate.
- Synchronized SPEC, Architecture, README, and the concise Task execution projection; confirmed AGENTS remains unchanged in meaning.
- Passed final focused implementation and release-isolation coverage at 61/61 after preserving all four intermediate focused failures.
- Passed the non-publishing full release/registry regression, then the terminal 249-test Stable suite and one unchanged candidate reproduction after final development-only coverage additions.
- Reviewed all 13 changed paths, planner state/error branches, package membership, hosted command ownership, documentation impact, and acceptance-to-test mappings.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no repository blocker remains.
