# TASK 0028 — Windows Evaluator Cleanup Determinism

## Status

DONE

## Goal

Determine why the existing evaluator interruption-cleanup contract produced a Windows/Node 24 post-merge CI failure after passing on the same PR head, make the smallest evidence-supported deterministic correction without weakening owned-state cleanup, reconcile Task 0027's historical delivery evidence, and restore exact-head plus post-merge required CI to 9/9.

## Dependencies

- Exact implementation base: `origin/main@a72d3cdbd1e860271143ac4068501b4853b973ac`.
- PR #12 head `b7b8dd0f6dd5a9663ba092efe6f3754bed372bdb`, merge commit `a72d3cdbd1e860271143ac4068501b4853b973ac`, exact-head run `29928926570` (`SUCCESS`, 9/9), and post-merge run `29929111557` (`FAILURE`, 7/9).
- Historical evaluator contract and evidence: `../0024-interrupt-safe-evaluator-cleanup/TASK.md` and `../0024-interrupt-safe-evaluator-cleanup/TEST.md`.
- Behavioral result and incomplete delivery evidence to reconcile: `../0027-spec-behavioral-acceptance/TASK.md` and `../0027-spec-behavioral-acceptance/TEST.md`.
- Permanent truth: `../../../AGENTS.md`, `../../../README.md`, `../../SPEC.md`, and `../../ARCHITECTURE.md`.
- Evaluator implementation and verification surfaces: `../../../scripts/evaluator-process.mjs`, `../../../scripts/audit-smoke.mjs`, `../../../scripts/grilling-eval/core.mjs`, the three evaluator test files, their directly used fixtures, and `../../../.github/workflows/ci.yml`.
- Preserved original job log: `C:/1kyw/5.personal/kyw_dev_task0028_evidence_a72d3cdb/run-29929111557-job-88953825441.log`, 46,842 bytes, 476 normalized lines, SHA-256 `e8dde322b9a0d0e18f58a4d0d436e4fc56ea0e5345943a1ff02fa58d06d68717`.

## In Scope

- Preserve and analyze the complete original Windows/Node 24 job log and exact GitHub run/job metadata.
- Reproduce the exact focused failure under the installed Node 24 and CI-like environment, then run bounded focused and file-level stress only as needed to expose nondeterminism.
- Add bounded, non-secret diagnostics when the current assertion cannot identify the flow, phase, owned path label, existence/process state, event order, or cleanup diagnostics.
- Classify the failure into exactly one user-authorized root-cause category using concrete evidence.
- Apply only the smallest deterministic production or test-fixture correction justified by that category.
- Strengthen exact-race regression coverage while preserving owned temporary-root and isolated-path removal, staging removal, no incomplete publication, auth-source immutability, first-cause preservation, listener restoration, owned child-tree termination, cleanup diagnostics, and idempotent finalization.
- Reconcile Task 0027 without rerunning or relabeling its `CURRENT_SESSION_DIRECT` S-01 through S-06 behavioral evidence.
- Run the focused, stress, full, package, documentary, scope, and integrity gates authorized for Task 0028.
- Deliver a successful result through one commit, non-force push, one non-draft PR, exact-head PR CI 9/9, expected-head merge, and post-merge main CI 9/9.

## Out of Scope

- Task 0029, a release-readiness re-gate, publication, registry mutation, tag, GitHub Release, or public plugin submission.
- Rerunning Task 0027 S-01 through S-06, Task 0026's harness, nested `codex exec`, model-backed probes, fresh-session cohorts, or subagents.
- Modifying or resuming Tasks 0017, 0020, or 0026; resuming Task 0027 for implementation; or erasing Task 0027's historical post-merge failure.
- A general evaluator rewrite, daemon, supervisor framework, watcher, tracing system, retry framework, ambient process scan, new dependency, or generic abstraction.
- Weakening cleanup into a warning, arbitrary sleep, global timeout increase, assertion polling without a proven eventual contract, Windows/Node 24 skip, or flaky-test label.
- Reset, clean, stash, rebase, force operations, branch deletion, existing-run reruns, or removal of unexpected user work.

## Acceptance Criteria

- [x] AC-01: Exact local/remote/PR/Actions preflight and collision checks are preserved; Task 0028 starts exactly at `a72d3cdb...`, and the complete original failing job log identifies every fact it can prove without inferring an unreported subcase.
- [x] AC-02: Bounded reproduction plus diagnostics establish exactly one concrete root-cause category A–F. The historical log's flow/phase remain explicitly unknowable; the deterministic first local failure names audit/temporary-root, its event/terminal order, remaining root, absent child state, and cleanup state.
- [x] AC-03: The smallest evidence-supported deterministic correction is implemented without weakening the documented promise that evaluator-owned unpublished state is gone when the evaluator promise reaches its terminal point.
- [x] AC-04: Deterministic regression coverage exercises the proven race and preserves every required cleanup, interruption, listener, process-ownership, diagnostic, publication, auth, and idempotence invariant.
- [x] AC-05: Task 0027 remains behaviorally passed as `SPEC_AC04_AC08_DIRECTLY_VERIFIED`/`CURRENT_SESSION_DIRECT`, while its Task/Test overall states and delivery evidence truthfully record PR #12 and `POST_MERGE_MAIN_CI_FAILED`; remediation ownership points only to Task 0028.
- [x] AC-06: Canonical Task validation, acceptance/evidence validators, syntax, focused files, combined evaluator suite, Node 24 stress (focused 20/20 and cleanup file 10/10), stable commands, `release:ci`, and `git diff --check` all pass on final bytes.
- [x] AC-07: Final diff, package allowlist, historical Task hashes, Skill bytes, permanent-document impact, normal state, Task 0029 absence, and publication/tag/release absence are reviewed with no unexplained path or mutation.
- [x] AC-08: The exact non-force/expected-head integration guards and stop conditions are locally verified and ready. Because the single Task commit cannot contain its own future PR/merge facts, actual non-draft PR CI 9/9, merge, and post-merge main CI 9/9 remain a mandatory out-of-band terminal delivery gate before reporting overall success.

## Plan

- [x] Verify exact local/remote state and the absence of later unexpected work or Task 0028 collisions.
- [x] Fetch normally and create `task/0028-windows-evaluator-cleanup-determinism` exactly from `origin/main@a72d3cdb...` without synchronizing local `main`.
- [x] Read all required permanent, historical, evaluator, test, fixture, and workflow sources.
- [x] Retrieve and preserve the complete original Windows job log and identify its exact stack boundary.
- [x] Create this Task/Test pair together before any source or test edit.
- [x] Capture exact local runtimes and run the focused test, cleanup file, and bounded pre-fix stress under CI-like variables.
- [x] Add only the bounded diagnostics needed to expose future failures' exact subcase and state.
- [x] Prove one root-cause category, apply the smallest deterministic fix, and add exact regression coverage.
- [x] Reconcile Task 0027's historical delivery evidence without touching its behavioral evidence.
- [x] Run focused, stress, full, package, documentary, scope, and integrity verification; review the final diff and set terminal states.
- [ ] Commit, push non-force, open one non-draft PR, require exact-head 9/9, merge with expected-head protection, require post-merge 9/9, and stop.

## Decisions

- The original log proves the remaining object was the evaluator-owned temporary root because the stack points to `test/evaluator-cleanup.test.mjs:196`, but it does not identify the loop's flow or phase. No narrower subcase will be inferred from `true !== false`.
- The aggregate `Required / credential-free CI` failure is derivative of the actual `Stable / Windows / Node 24.x` failure and is not a second product defect.
- Task 0027's behavioral sub-verdict remains valid and distinct from its failed delivery lifecycle; Task 0028 CI cannot rewrite the historical result at merge commit `a72d3cdb...`.
- The first terminal cause, bounded evaluator-owned child-tree termination, cleanup diagnostics, listener removal, idempotence, auth-source immutability, and atomic publication boundary remain mandatory.
- No production dependency, lifecycle script, model execution, or generalized framework is planned.
- Root-cause category is exactly `A. PRODUCTION_CLEANUP_ORDER_DEFECT`. The historical runner did not preserve the handle owner's identity, so the triggering Windows handle condition is not overclaimed as category B.
- The existing synchronous `defaultRemoveOwnedPath` remains unchanged for Task 0026 and other synchronous evidence cleanup. Evaluator production defaults use a new evaluator-specific asynchronous remover, and both evaluator cleanup callbacks await injected or default removal.
- Recursive evaluator removal uses Node's own bounded retry semantics: five retries at 100 ms linear delay, at most 1.5 seconds of scheduled delay. There is no background deletion, assertion retry, arbitrary sleep-only fix, or unbounded loop.

## Risks

- The failure passed on the exact PR head and may require bounded repetition to expose; a local pass alone cannot establish a root cause.
- A loop-level assertion without flow/phase context can misattribute residue; diagnostics must bind every owned path observation to one exact subcase and event sequence.
- Windows deletion can expose a real child/stream handle lifetime defect, a hidden cleanup failure, or test-owned timing/global-state interference; only observed state may select the category.
- A diagnostic edit can perturb timing. The retained form must stay bounded and useful, and root-cause proof must combine multiple observations rather than timing alone.
- Task/Test evidence added before integration cannot contain future PR/merge CI facts; those facts will be reported from exact GitHub state without an evidence-only follow-up commit.

## Discoveries and Changes

- Exact preflight matched the user-supplied state: local Task 0027 branch/head was clean and `+0/-0`; live `main`, Task 0027 remote branch, PR #12 head/merge, and both CI identities were exact.
- No commit, PR, Actions run, branch, tag, release, Task directory, local/remote Task branch, or Task 0028 commit collision existed after the expected post-merge run.
- Normal fetch left user work untouched. The new Task branch began at `a72d3cdbd1e860271143ac4068501b4853b973ac`; local Task 0027 remained at `b7b8dd0...`.
- PR run `29928926570` succeeded 9/9 at head `b7b8dd0...`. Push run `29929111557` failed 7/9 at merge head `a72d3cdb...`: actual job `88953825441` failed, and aggregate job `88954204846` failed derivatively.
- Original host evidence: runner `2.335.1`; provisioner `20260707.563`; Windows Server 2025 `10.0.26100` Datacenter; image `windows-2025-vs2026@20260714.173.1`; Node `v24.18.0`; npm `11.16.0`; Git `2.55.0.windows.2`.
- `npm test` ran 220 tests with 219 passing. The sole failure was `interruption checkpoints clean partially acquired resources and prevent publication`, reported at test declaration line 326 and `assertOwnedStateRemoved` line 196 after 4,103.2627 ms.
- Line 196 is exactly `existsSync(temporary.temporaryRoot) === false`; therefore the observed remaining object was the evaluator temporary root. The log contains no flow/phase label, owned path text, cleanup diagnostic, child/descendant state, or listener state for the failed iteration.
- Local runtime is Node `v24.11.0`, npm `11.18.0`, Git `2.51.2.windows.1`, Windows 11 Home `10.0.26200` build 26200 AMD64. Only `C:\Program Files\nodejs\node.exe` is installed; no Node 22 alias or nvm/fnm/volta/nvs manager is locally available. Hosted Windows/Node 22 evidence remains the comparison.
- Under the exact CI-like environment, the first focused run passed 1/1 and the first complete cleanup-file run passed 9/9. The bounded pre-fix loops then passed focused 20/20 and cleanup-file 10/10 without reproducing the hosted residue. One complete `npm test` run passed 220/220. Two additional bounded full-suite invocations were started, but their final output cell was not retained; no test process remained when inspected, they receive no PASS credit, and they were not rerun pre-fix.
- Same-head controls confirm nondeterminism: PR Windows/Node 24 job `88953195346` passed the checkpoint test in 6,675.7768 ms and 220/220 overall; main Windows/Node 22 job `88953825540` passed it in 6,102.2851 ms and 220/220. The failing Windows/Node 24 job ended the checkpoint test after 4,103.2627 ms with the temporary root present.
- Bounded diagnostics now attach flow, phase, stable path label, normalized Task-owned path, existence state, event order, observed child/descendant liveness, and safe cleanup/termination diagnostics to cleanup assertions. They do not print credentials, auth contents, normal HOME, unrelated paths, or environment dumps.
- A controlled child-current-directory probe showed that cwd alone did not prevent Windows root removal and ruled out that narrower mechanism. The first exclusive-handle probe closed before readiness and was invalid; its exact Task-owned residue was verified and removed before retry.
- A valid Windows probe held one Task-owned file with `FileShare.None` for 300 ms. The production primitive's one-shot synchronous removal failed in 1 ms with `EPERM` and left the root. A synchronous `maxRetries` option did not retry that locked file. The asynchronous standard-library recursive removal with five 100 ms retries awaited release and removed the same root in 612 ms.
- The first deterministic pre-fix regression then failed exactly at audit/temporary-root: while injected owned removal was still gated and the root still existed, the evaluator promise was already `rejected` instead of `pending`. Event order had reached `temporary-root>cleanup-complete`; no child had spawned. This directly proves category A's terminal-order defect.
- `scripts/evaluator-process.mjs` now provides evaluator-specific asynchronous bounded removal while preserving the existing synchronous helper. `runAuditSmoke` and `runEvaluation` await every owned removal before finalization can settle; staging, temporary root, and evaluator-created empty output-root ordering remain narrow and sequential.
- The new terminal-order regression passes for both audit and grilling and verifies root presence before release, terminal pending state, final root removal, no incomplete publication, unchanged auth source, first interruption code, and listener restoration. The Windows exclusive-handle regression reproduces one-shot `EPERM` residue and proves bounded awaited removal succeeds after release.
- Post-fix syntax passed for all five changed JavaScript modules. The new terminal-order regression passed 1/1, the original checkpoint regression passed 1/1, the Windows handle regression passed 1/1, and cleanup plus process tests passed 18/18.
- Task 0027 Task/Test now remain behaviorally passed as `SPEC_AC04_AC08_DIRECTLY_VERIFIED`/`CURRENT_SESSION_DIRECT` but are overall `BLOCKED/BLOCKED`. They record commit `b7b8dd0...`, PR #12, PR run `29928926570` 9/9, merge `a72d3cdb...`, main run `29929111557` 7/9, actual job `88953825441`, derivative aggregate `88954204846`, and overall `POST_MERGE_MAIN_CI_FAILED`; implementation must not resume there.
- Final individual checks passed: terminal-order focused 1/1, original checkpoint focused 1/1, cleanup 10/10, process 8/8, and actual Windows console Ctrl+C platform 2/2. The relevant audit/grilling/evaluator combined suite passed 53/53.
- Post-fix Windows/Node 24 stress passed the original focused regression 20/20 in 68.484 seconds and the complete cleanup file 10/10 in 180.018 seconds, with no retry or failure.
- Standalone final gates passed `npm test` 222/222, lint 54 JavaScript modules/metadata, format 218 UTF-8/LF files, and pack check 29 files/62,184 bytes. Final `npm run release:ci` repeated 222/222 plus every stable gate and passed the packed lifecycle at SHA-256 `3355736ce550c21dff1a64e20cd84f68f81cec0f51fd5435314ae574a1d932aa`.
- The 29-file package allowlist is unchanged. Its byte count changes only because the required README contract is packed; Skill bytes, production dependencies, package metadata, workflow, and Task 0017/0020/0026 bytes are unchanged.
- Final integrity found exactly eleven intended paths: README, Architecture, Task 0027 Task/Test, three evaluator modules, two evaluator tests, and the Task 0028 pair. External evidence retains only the hashed original job log; diagnostic probe residue and evaluator fixture processes are zero.
- A final normal fetch confirmed `origin/main` remains `a72d3cdb...`, the Task 0028 remote branch and PR are absent, and no post-run PR, Actions run, tag, GitHub Release, Task 0029, or publication exists.

## Documentation Impact

- SPEC: Unchanged. The development-only evaluator cleanup implementation is not a SPEC product requirement, and the existing safety/acceptance meaning is preserved.
- ARCHITECTURE: Updated to record awaited asynchronous recursive removal, five 100 ms linear retries, the 1.5-second scheduled-delay bound, and fail-closed exhaustion rather than background eventual cleanup.
- README: Updated the grilling and audit lifecycle descriptions with the same terminal and bounded-removal contract.
- AGENTS: Unchanged unless repository-wide completion or workflow rules change; none are planned.

## Completed

- Completed exact local/remote/GitHub preflight and collision checks.
- Created the exact Task branch from the required remote main SHA without modifying local `main` or Task 0027's branch.
- Read and reconciled every required permanent document, historical Task pair, evaluator module, evaluator test, direct process fixture, and CI workflow.
- Preserved the complete original failing job log outside the checkout and recorded its byte count, line count, hash, runtime/image identity, test count, stack, and evidence limits.
- Created and authored this Task/Test pair together before source or test edits.
- Completed bounded reproduction, same-head hosted comparison, local runtime inventory, controlled Windows handle probes, and a deterministic failing terminal-order regression.
- Implemented the evaluator-specific awaited bounded removal and retained only bounded safe failure diagnostics.
- Added exact terminal-order and Windows-handle regression coverage and passed the initial focused/combined checks.
- Reconciled Task 0027's historical delivery evidence without rerunning or relabeling any behavioral scenario.
- Passed every focused, platform, combined, post-fix stress, canonical/evidence, stable, package, release, diff, and integrity gate on the final implementation and diagnostic bytes.
- Reviewed all eleven intended changed paths and confirmed no unexplained file, dependency, workflow, Skill, protected historical Task, Task 0029, tag, release, publication, probe residue, or evaluator process.

## Remaining

- No local implementation or verification work remains.
- Complete the authorized out-of-band single-commit, non-force push, non-draft PR, exact-head CI 9/9, expected-head merge, and post-merge main CI 9/9. A failed or cancelled new workflow is a stop condition and must not be rerun.

## Resume Point

Do not resume implementation. Deliver this exact reviewed local terminal state through the guarded integration lifecycle, then stop after exact post-merge main CI 9/9 or report the first integration blocker.

## Blockers

- None locally. Overall delivery success remains conditional on the out-of-band PR and post-merge CI gates described in AC-08.
