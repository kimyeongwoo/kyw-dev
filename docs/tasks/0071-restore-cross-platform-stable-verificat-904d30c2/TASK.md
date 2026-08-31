# TASK 0071 — Restore Cross-Platform Stable Verification and Frontier-Relative Live Tests

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Restore trustworthy post-Task-0070 verification by making retained release-candidate and installation-doctor junction cases deterministic on supported Windows hosts and by making the two opt-in live delivery tests derive their assertions from the current queue and trusted continuity frontier instead of obsolete Task IDs or counts.

## Dependencies

- Task 0070.

## In Scope

- Create a retained candidate beneath the canonical physical temporary parent while preserving the caller-visible alias path used to observe and validate the candidate.
- Revalidate the candidate as the exact intended direct child with the expected basename, directory type, containment, ownership, and cleanup boundary after canonicalization.
- Build the Codex-home ancestor-alias installation fixture in the physical target, then invoke doctor through the alias so fixture setup no longer fails before the system under test runs.
- Keep linked Codex-home leaf rejection and every collision, repository-overlap, wrong-parent, link, type, containment, and guarded-cleanup negative fail closed.
- Replace fixed live-hydration Task 0059 classifications and fixed continuity Task 0060/0061 and 29/30 assumptions with queue- and checkpoint-derived current covered and uncovered frontier expectations.
- Keep both live tests explicit, read-only, credential-free, bounded, and skipped unless their existing opt-in environment gate is set.
- Add deterministic helpers or fixtures that prove the frontier-relative calculation without GitHub access, then run the real opt-in probes separately against the current repository state.
- Preserve Task 0070 TASK.md and TEST.md bytes and the count-38 checkpoint through Task 0069 as the immutable pre-entry baseline; apply only the canonical selected-Task continuity transition to count 39 through Task 0070, then preserve that active baseline and every pre-existing GitHub, npm, tag, and Release object apart from Task 0071's ordinary `STANDARD` PR/CI/merge lifecycle.

## Out of Scope

- Changing delivery hydration, dispatcher, checkpoint, terminal-pair, installer, or doctor product semantics beyond the physical-fixture and candidate-path defects needed for these tests.
- Reorganizing the test suite, narrowing default Node test discovery, splitting large test files, or adding elapsed-time performance thresholds.
- Rerunning GitHub workflows, writing any checkpoint other than the dispatcher-prepared selected-Task transition through Task 0070, changing a package version, producing the 0.1.4 candidate, or publishing anything.
- Editing, reopening, reterminalizing, renaming, or replacing Task 0070 or any earlier Task/Test pair.

## Acceptance Criteria

- [x] AC-01: A retained candidate requested beneath a Windows junction alias is created once beneath the canonical physical parent and remains observable through the alias without EEXIST or a second physical directory.
- [x] AC-02: Candidate collision, repository overlap, non-direct-child, wrong basename, link, unsupported type, containment escape, and unowned cleanup cases remain rejected with no deletion outside the proven candidate root.
- [x] AC-03: The ancestor-alias doctor fixture materializes plugin-cache bytes beneath the physical Codex-home target and calls doctor through the alias, passing on Windows without weakening linked-leaf rejection or read-only diagnosis.
- [x] AC-04: The live hydration test derives the current queue-required delivery set and verifies every current fresh classification and satisfied ledger entry without fixed historical Task IDs.
- [x] AC-05: The live continuity test derives the trusted covered prefix, current uncovered frontier, next synthetic selection, expected count, and last Task from repository truth and remains valid across one normal rolling transition.
- [x] AC-06: Default Stable verification stays deterministic and offline; each live test runs only under its explicit opt-in gate, performs no mutation, and reports bounded command and GitHub-query counts.
- [x] AC-07: Targeted Windows/junction and frontier tests, both opt-in live tests, npm test, npm run lint, npm run format:check, npm run pack:check, and npm run release:candidate pass with Task 0070 bytes unchanged and the canonical count-39 checkpoint through Task 0070 unchanged after selected-Task entry.

## Plan

- [x] Capture the exact failing Windows candidate and doctor-fixture cases and the current stale live-test assertions as focused red evidence.
- [x] Correct retained-candidate physical creation and post-canonicalization validation without widening cleanup authority.
- [x] Separate physical fixture materialization from alias-path doctor observation and retain every unsafe leaf or path rejection.
- [x] Introduce one deterministic frontier-relative derivation shared by the live assertions or equivalently proven helpers, removing obsolete IDs and counts.
- [x] Run targeted, opt-in live, Stable, release-candidate, pair-integrity, and transaction checks; record only executed evidence.

## Decisions

- Treat the two Windows failures and the stale live assertions as one verification-reliability outcome because all four currently prevent the repository verification surface from truthfully representing supported hosts and the moving delivery frontier.
- Materialize test data through a proven physical path and observe behavior through the alias; the alias remains part of the system-under-test input rather than fixture-construction authority.
- Retain the existing environment gates instead of introducing a new test runner or package command in this correction.
- Do not use elapsed time as acceptance evidence; use deterministic selection, bounded queries, explicit live opt-in, and exit status.

## Risks

- Canonicalizing the parent but creating or cleaning through the wrong spelling could still produce duplicate candidates or delete an unrelated path.
- A live test derived too loosely from the queue could become tautological and stop detecting missing, over-wide, or stale delivery evidence.
- Windows junction behavior and POSIX symlink behavior differ, so positive alias coverage must not weaken hostile-link negatives on either host.
- Live GitHub evidence can expire or external state can drift; a real probe failure must be recorded as a limitation or blocker rather than rewritten as a pass.

## Discoveries and Changes

- On Windows with Node 24.11.0, npm test currently reports two failures: retained-candidate creation beneath a junction alias fails with EEXIST, and the doctor ancestor-alias fixture fails with ESRCH before doctor runs.
- The hydration live test still branches around Task 0059 and old hardened ID lists, while the continuity live test still assumes Tasks 0060/0061 and covered counts 29/30.
- npm run lint, npm run format:check, and npm run pack:check pass at authoring; no implementation or external mutation was performed.
- Task 0070 validates as the immutable delivered baseline, and the worktree and Task transaction state were clean before authoring.
- Execution started at `2026-09-01T07:51:11+09:00` after local, cached, direct-remote, and GitHub `main` aligned at `dd7c1f30bcadf7e05843bfff74eb63e5839f25ed`; the sole dispatcher selected `IMPLEMENT / 0071` and freshly classified Task `0070` as `HARDENED_EXACT_HEAD`.
- Full permanent-truth reconciliation resolved the authoring-time count-38 preservation wording against the canonical selected-Task transition: count 38 through Task `0069` remains the immutable pre-entry baseline, while one active-branch apply advanced only Task `0070` to count 39 and digest `a055031dff2d216728929b339142e0c19473f1da433245a8c4d967aa89fa3a65`; Task `0071` remains uncovered.
- Focused red execution reproduced exactly two Windows failures: candidate creation raised `EEXIST` at `scripts/packed-release-check.mjs:220`, the ancestor-alias doctor fixture raised `ESRCH` in fixture copy at `test/skill-installation.test.mjs:215`, and the linked Codex-home leaf rejection passed.
- Immutable `HEAD` source inspection confirmed the two live blocks still selected fixed Tasks `0059`, `0060`, and `0061` and asserted fixed required/covered counts `3`/`28` and `29`/`30`; historical fixed-ID regression fixtures outside those live blocks remain intentionally in scope to preserve.
- Parallel read-only reconnaissance and disjoint implementation were delegated for the Windows and frontier groups; the root agent reviewed the complete combined diff and directly reran every acceptance-specific, live, Stable, and Release boundary.
- Retained-candidate creation now derives one physical child from the canonical parent and requested basename, rejects both alias and physical collisions, creates only that physical path, and revalidates ownership through the caller-visible alias without changing cleanup functions.
- The doctor ancestor-alias fixture now writes plugin-cache bytes beneath the physical Codex-home target and supplies the alias path only to diagnosis; reported alias paths, physical identity, linked-leaf rejection, and before/after metadata remain exact.
- A test-only frontier helper reads raw aligned-main checkpoint bytes without trimming and composes the existing production discovery and partition primitives. Offline fixtures pin active normalization, the current one-step frontier, a completed roll, the next frontier, and over-gap rejection so live expectations are not tautological.
- The first corrected Windows rerun reached the fixed candidate and doctor paths but then failed the existing over-warning SPEC guard because the active Test's zero-byte delta row used non-substantive wording. Updating only that evidence row made the same 3-test command pass; implementation and permanent documents were unchanged.
- Direct verification passed the 51-test distribution/installation suite, 50-test delivery suite with three explicit default skips, both separately gated live probes, and planner-selected `npm run release:ci`. The live frontier was required `39`, covered `38` through `0069`, uncovered `0070`, with each probe bounded at `388` commands, `15` GitHub API calls, `21` log fetches, and zero retries.
- Final Release verification passed 410 tests with 407 passes and three explicit skips, lint over 84 JavaScript modules, format over 358 text files, pack selection of 43 files / 136,857 bytes, and a disposable candidate SHA-256 `f91d2cdfb94310fa555276021cda59f6e85ea726385fc5ed3e486863b013de73`.
- Final integrity review found no Task 0070 byte change, no post-entry checkpoint change, no permanent-document change, no Task transaction, no Task-0071-era temporary directory, and no mutation to pre-created Tasks 0072–0075.

## Documentation Impact

- SPEC: Unchanged — full-source reconciliation confirmed that supported-host and delivery evidence meaning already requires these cases to be truthful.
- ARCHITECTURE: Unchanged — candidate containment, doctor read-only inspection, and continuity boundaries do not change; only implementation and fixtures were corrected.
- README: Unchanged — setup, commands, and contributor workflow remain the same.
- AGENTS: Unchanged — repository routing, authority, preservation, and completion rules remain the same.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Revalidated the Task 0070 dependency, Task 0071 pair, transaction state, pre-created queue, direct remote, immutable Task 0070 pair hashes, and count-38 checkpoint baseline.
- Completed the sole production dispatcher call and established the selected Task 0071 branch plus active pair without editing any prior terminal Task/Test pair.
- Applied the untouched continuity transition exactly once, advancing only the delivered predecessor Task 0070 to count 39 while preserving its pair bytes and excluding Task 0071.
- Captured the two deterministic Windows failures and exact stale live-test constants before implementation mutation.
- Corrected canonical physical candidate creation and the physical-write/alias-observe doctor fixture without widening cleanup or doctor product semantics.
- Replaced both live-only historical assumptions with one deterministic queue/checkpoint frontier derivation and offline rolling-transition coverage while preserving historical fixtures.
- Passed direct targeted, full related, offline delivery, both live, planner, Stable, Release, pair, transaction, hash, temp-state, documentation-impact, and final-diff checks recorded in `TEST.md`.

## Remaining

- None — repository acceptance, verification, scope review, documentation-impact review, and evidence are complete; ordinary `STANDARD` delivery remains the separate external gate.

## Resume Point

- None — repository work is complete. If delivery is interrupted, resume only from the Task 0071 branch/PR external state without repeating dispatcher hydration or continuity application.

## Blockers

- Not applicable — all repository requirements pass; hosted exact-head, merge-compatibility, protected-merge, and post-main observations remain the ordinary `STANDARD` delivery gate.
