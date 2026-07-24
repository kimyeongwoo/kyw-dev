# TASK 0034 — Retire the Cancelled Nested Behavioral Harness
<!-- kyw-task-contract: 2 -->

## Status

DONE

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

- [x] AC-01: No production, Skill, CI, release, or supported direct-verification path calls the cancelled nested behavioral execution path.
- [x] AC-02: S-01 through S-06 fixtures and deterministic acceptance contracts remain runnable without a nested model process.
- [x] AC-03: Task 0026 historical bytes and its `CANCELLED/BLOCKED` meaning remain unchanged.
- [x] AC-04: Removed code/flags/tests are exact, attributable, and absent from the npm package before and after.
- [x] AC-05: Current-session direct behavior and Task 0027 carry-forward assumptions retain focused coverage.
- [x] AC-06: Full tests, lint, format, pack, and release CI pass with a recorded maintenance/runtime reduction.
- [x] AC-07: Any still-reachable nested path blocks deletion rather than being silently broken.

## Plan

- [x] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [x] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [x] Treat the explicit or automatic selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [x] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [x] Implement the smallest design that satisfies the acceptance criteria.
- [x] Run focused verification, then locally reproducible stable/package checks; leave mutable hosted delivery results to the external ledger.
- [x] Review every changed path against scope, tests, permanent-document impact, and evidence honesty.
- [x] Set an evidence-backed repository outcome in this pair and stop at the first real blocker.

## Decisions

- Fixtures are product evidence assets; the cancelled orchestration is not.
- Historical documentation is preserved even when its executable method is retired.
- No replacement framework is introduced.

## Risks

- A release validator may depend indirectly on the old runner.
- Overbroad deletion could remove current direct acceptance fixtures.
- Ignored evidence cleanup could accidentally target user-owned files.

## Discoveries and Changes

- Fresh local, remote, and GitHub preflight found a clean Task 0033 worktree, exact delivered `origin/main` SHA `a9c249131c55bd14abfebd406db2f95941bd0a85`, merged PR #20, and successful exact PR-head and post-merge `main` CI.
- Managed exact dispatch selected Task 0034 with action `IMPLEMENT`, authority `STANDARD_LIFECYCLE`, and no ceremonial confirmation after Tasks 0030 through 0033 and Task 0039 delivery ledgers were supplied.
- Task 0034 now runs on `task/0034-retire-cancelled-behavioral-harness` from the exact delivered `origin/main` SHA.
- Reachability inspection found no package script, production/Skill import, CI step, release step, or current permanent-document command for `scripts/spec-behavioral-e2e.mjs`; its only executable repository caller is `test/spec-behavioral-e2e.test.mjs`, which `npm test` discovers.
- The cancelled surface is 3,968 runner lines plus 413 focused-test lines. The retained fixture tree is 33 files, 540 lines, and 12,108 bytes; all tracked `scripts/**/*.mjs` and `test/**/*.mjs` total 50 files, 20,271 lines, and 758,862 bytes before cleanup.
- Pre-change fixture validation passed in 701 ms, the focused 25-test suite passed in 455 ms, full `npm test` passed 243/243 in 32,628 ms, and package validation passed with 29 files / 79,011 bytes in 1,227 ms.
- Task 0026 historical pair hashes and all four retained evidence-tree hashes were recorded before implementation; Task 0027 pair hashes were also recorded for carry-forward integrity.
- Removed `scripts/spec-behavioral-e2e.mjs` and `test/spec-behavioral-e2e.test.mjs`. Their nested Codex launch, Docker sandbox, fixed model/effort/base, authentication-copy, capability/topology, tarball cohort, report-writing/validation, fixed-order aggregation, and multi-mode argument branches have no remaining current caller.
- Added `scripts/spec-behavioral-acceptance.mjs` and `test/spec-behavioral-acceptance.test.mjs` as a direct-only replacement. It retains the exact 33-file fixture inventory, S-01 through S-06 intent, deterministic per-scenario validators, mutation attribution, package-byte evidence requirements, and S-05 gap proof.
- The direct fixture command accepts only `--validate-fixtures`, launches one current-Node `--test` child over four focused fixture tests, and has no Codex/model, Docker, cohort, capability, authentication, or retained-report path. The retired `--allow-model` form fails before fixture work.
- Removed fixed-cohort-only tests for fresh thread identity, credential/path redaction, auth immutability, owned model residue, transcript truncation, six-record aggregation, Docker invocation, and installed-path command-event proof. Retained/adapted confirmation, Task allocation/resume, uncovered branch, unsupported completion, ordinary-prompt docs, exact mutations, wording, and package identity checks.
- The first replacement focused run passed 21/22 and exposed a test-only URL/path mismatch in the independent S-05 proof. The corrected suite passed, and the fixture runner was then simplified from four copied-repository child launches to one exact Node test invocation without changing fixture bytes or acceptance.
- Historical Task 0026/0027 pairs, four retained Task 0026 evidence roots, and all 33 fixture files remain byte-identical. The fixture-tree SHA-256 remains `22ea3ac2028a4068ef5ca58f857e471e70d331aaebd14ced1064e95aca91d171`.
- The focused source/test surface fell from 4,381 to 850 lines (3,531 lines / 80.6% removed). All tracked-result script/test MJS fell from 20,271 to 16,740 lines. Fixture validation fell from 701 to 311 ms and the focused suite from 455 to 208 ms in the recorded like-for-like run.
- Post-change full `npm test` passed 239/239; its 32,727-ms wall time was within 0.3% of the 32,628-ms baseline and is treated as runtime variance, not an improvement claim. Lint, format, package, and a complete local `release:ci` also passed.

## Documentation Impact

- SPEC: Unchanged — current-session direct and optional independent verification behavior was already authoritative.
- ARCHITECTURE: Added the retained direct fixture/validator component and explicitly removed the cancelled nested runner from the current component model.
- README: Added the direct fixture-validation command and clarified that nested Codex/fixed-cohort/capability/Docker execution is unsupported.
- AGENTS: Unchanged — repository-wide execution and completion invariants did not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- Revalidated the clean repository, branch and remote refs, Task inventory, dependency graph, PR review state, and exact PR/post-merge Actions identities.
- Read the four permanent documents, this pair, the Task execution reference, and Task 0033 dependency evidence.
- Validated the Task 0033 and Task 0034 pairs and confirmed a clean pre-transition diff.
- Exact managed dispatch selected this `READY/READY` pair for implementation without another question.
- Created the Task 0034 branch from exact delivered `origin/main` and entered `IN_PROGRESS/RUNNING`.
- Read the explicitly referenced Task 0026/0027 contracts and captured pre-change historical/evidence hashes, focused/full runtime, source/test size, fixture integrity, and package inventory.
- Replaced the cancelled 3,968-line runner and 413-line fixed-cohort test with the 496-line direct validator and 354-line direct test.
- Preserved and validated the exact 33 fixture files, deterministic S-01 through S-06 contracts, S-05 intentional gap, direct package/mutation evidence, and historical Task/evidence bytes.
- Synchronized Architecture and README for the new direct-only development surface; confirmed SPEC and AGENTS remain unchanged in meaning.
- Preserved the initial 21/22 focused failure, corrected the test-only path issue, and passed the replacement focused, instruction/foundation, full, lint, format, package, and local release checks.
- Reviewed all eight changed paths against AC-01 through AC-07, the intent-to-test matrix, package boundaries, and immutable historical/fixture paths; no out-of-scope change remains.
- Passed the final complete `npm run release:ci` on the terminal implementation: 240/240 tests, lint, format, exact 29-file package validation, and packed SHA-256 `da7fc6af06ed764095edafa8373887dae3c33d47fd26e3075acd619bf19df813`.

## Remaining

- None — repository outcome is complete.

## Resume Point

- None — repository outcome complete; use the GitHub delivery ledger for mutable PR, exact-head CI, merge, and post-merge `main` CI state.

## Blockers

- None — no repository blocker remains.
