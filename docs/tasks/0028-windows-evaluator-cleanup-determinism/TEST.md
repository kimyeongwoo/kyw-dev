# TEST 0028 — Windows Evaluator Cleanup Determinism

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially safety, compatibility, and acceptance evidence boundaries.
- Architecture constraints: `../../ARCHITECTURE.md`, especially evaluator child ownership, run-scoped listeners, two-phase termination, idempotent cleanup, safe diagnostics, and atomic publication.
- Repository rules and contributor entry: `../../../AGENTS.md` and `../../../README.md`.
- Historical cleanup contract: Task 0024 Task/Test.
- Behavioral evidence and delivery reconciliation target: Task 0027 Task/Test.
- Exact implementation base: `a72d3cdbd1e860271143ac4068501b4853b973ac`.
- Original GitHub evidence: PR run `29928926570`; main run `29929111557`; actual failing job `88953825441`; derivative aggregate job `88954204846`.
- Preserved complete job log: 46,842 bytes, 476 normalized lines, SHA-256 `e8dde322b9a0d0e18f58a4d0d436e4fc56ea0e5345943a1ff02fa58d06d68717` at the Task-owned external evidence path recorded in `TASK.md`.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 exact preflight, branch provenance, collisions, and complete original CI evidence | Inspect local refs/status/upstream, live remote refs, PR #12, all later PR/run/ref/tag/release state, run/job metadata, full job log, exact stack source, and branch creation | Provenance/Audit | PASS | All supplied SHA/state values matched; no later unexpected work or Task 0028 collision; branch starts at exact `a72d3cdb...`; full log is preserved and hashed. |
| T-02 | AC-02 exact bounded reproduction and one evidence-backed category | Run the exact focused test, cleanup file, up to 20 focused and 10 file iterations; add bounded flow/phase/path/process/event diagnostics; use a controlled Windows handle and terminal gate where nondeterminism does not recur | Integration/Diagnosis | PASS | Initial focused 1/1, cleanup 9/9, focused stress 20/20, cleanup stress 10/10; controlled one-shot removal left root with `EPERM`; pre-fix audit/temporary-root regression failed because terminal rejection preceded gated removal. Category exactly A. |
| T-03 | AC-03 deterministic minimal fix without contract weakening | Inspect the proven lifecycle boundary, change only the responsible production code, and assert cleanup is complete at terminal resolution | Unit/Integration | PASS | Evaluator-specific async `rm` uses five 100 ms bounded retries; audit/grilling await it. Existing sync helper and Task 0026 callers unchanged; no background cleanup or new dependency. |
| T-04 | AC-04 exact race and cleanup invariant regression | Verify both flows at temporary-root gate, Windows exclusive-handle release, all checkpoint paths, staging/publication, auth source, first cause, listeners, child/descendant termination, diagnostics, and repeated finalize | Regression/Security | PASS | New terminal-order 1/1, original checkpoint 1/1, Windows handle 1/1, cleanup/process combined 18/18. Remaining final evaluator/stress commands are tracked by T-06. |
| T-05 | AC-05 Task 0027 historical evidence reconciliation | Validate exact required strings/statuses plus preservation of `SPEC_AC04_AC08_DIRECTLY_VERIFIED` and `CURRENT_SESSION_DIRECT`; ensure no behavioral scenario was rerun | Documentation/Audit | PASS | Task 0027 is now `BLOCKED/BLOCKED`, preserves behavioral PASS, records PR #12 and exact runs/jobs, states `POST_MERGE_MAIN_CI_FAILED`, forbids implementation resume, and assigns remediation to Task 0028. |
| T-06 | AC-06 focused syntax, evaluator suites, and bounded post-fix stress | Run changed-module `node --check`, focused regression, three evaluator files, relevant combined suite, focused 20/20, and cleanup file 10/10 under Node 24 CI variables | Regression/Stress | PASS | Five changed modules syntax-clean; focused 1/1 each; cleanup 10/10; process 8/8; platform 2/2; combined 53/53; focused stress 20/20; cleanup stress 10/10. |
| T-07 | AC-06 stable/full/package/documentary verification | Run canonical Task validator, Task 0027 reconciliation validator, Task 0028 acceptance validator, `npm test`, lint, format, pack, `release:ci`, and `git diff --check` | Integration/Packaging/Audit | PASS | Validators pass; standalone 222/222, lint 54, format 218, pack 29/62,184; final release CI repeats 222/222 and packed SHA `3355736c...32aa`; diff check clean. |
| T-08 | AC-07 final scope, package, history, Skill, permanent-doc, normal-state, and publication safety | Review complete diff/stat/status and exact forbidden-path/hash/ref/release/tag/publication conditions | Audit | PASS | Exactly 11 intended paths; Task 0017/0020/0026, Skills, workflow, dependency/package metadata unchanged; no probe/process residue, Task 0029, tag, release, publication, remote branch, PR, or remote drift. |
| T-09 | AC-08 guarded integration readiness and out-of-band delivery gate | Verify exact refs, reviewed staging scope, non-force/expected-head commands, and stop conditions; require actual PR and post-merge 9/9 before user-facing success | GitHub/Delivery | PASS | Local terminal gate is exact at base `a72d3cdb...`; remote main unchanged and Task branch/PR absent. The single commit cannot record its own future identities, so actual delivery remains mandatory out-of-band and is not preclaimed here. |

## Regression Coverage

- [x] The failing exact flow/phase is named in every future failure; the historical log's missing flow/phase are not invented.
- [x] Evaluator-owned temporary root and every acquired isolated child path are absent at the documented terminal point.
- [x] Unpublished staging and incomplete result/comparison paths are absent; already atomically published results remain intact.
- [x] Explicit auth-source bytes remain unchanged and credential contents/normal HOME/unrelated paths are never logged.
- [x] First interruption/failure cause remains authoritative; cleanup failures remain safe, unique diagnostics and are not hidden.
- [x] Listener counts return to baseline; repeated interruption/finalization remains bounded and idempotent.
- [x] Evaluator-owned child and descendant are terminated without ambient process scanning or unrelated-process effects.
- [x] Node 22/24 and Windows/macOS/Linux intended behavior remains covered without skipping or weakening a required lane.
- [x] Package allowlist, zero production dependencies, Skill bytes, and workflow matrix remain unchanged; packed bytes change only through the required README contract update.
- [x] Tasks 0017, 0020, and 0026 remain unchanged; Task 0027 behavioral evidence remains intact; no Task 0029 exists.

## Commands

Planned commands and procedures are frozen here before reproduction; the evidence table below records only commands actually run.

```text
node --test --test-name-pattern "interruption checkpoints clean partially acquired resources and prevent publication" test/evaluator-cleanup.test.mjs
node --test test/evaluator-cleanup.test.mjs
focused loop: maximum 20 sequential executions, stop after sufficient failure evidence
cleanup-file loop: maximum 10 sequential executions, stop after sufficient failure evidence
node --check <each changed JavaScript module>
node --test test/evaluator-process.test.mjs
node --test test/evaluator-platform.test.mjs
node --test test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs test/evaluator-platform.test.mjs
npm test
npm run lint
npm run format:check
npm run pack:check
npm run release:ci
node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0028-windows-evaluator-cleanup-determinism
git diff --check
```

Every reproduction and stress command uses `CI=true`, `FORCE_COLOR=0`, `NO_COLOR=1`, `NPM_CONFIG_AUDIT=false`, `NPM_CONFIG_COLOR=false`, `NPM_CONFIG_FUND=false`, and `NPM_CONFIG_UPDATE_NOTIFIER=false`. Node 22 comparison is attempted only if already locally available without installation or toolchain mutation.

## Command and Evidence Table

| ID | Exact command or procedure | Attempt / exit | Evidence status |
|---|---|---|---|
| E-01 | Local root/branch/HEAD/status/upstream and `git ls-remote --heads --tags origin` | 1 / 0 | PASS: exact supplied Task 0027 state, clean `0/0`, main/Task branch refs exact, Task 0028 absent. |
| E-02 | GitHub PR/run/job/PR-after-12/run-after-main/ref/tag/release/commit collision inventory | 1 / 0 | PASS: PR #12 exact, PR CI 9/9, main CI 7/9, no later or colliding work. |
| E-03 | `git fetch origin` then `git switch -c task/0028-windows-evaluator-cleanup-determinism origin/main` with exact SHA guards | 1 / 0 | PASS: branch exact at `a72d3cdb...`; Task 0027 local branch retained. |
| E-04 | GitHub connector full job-log retrieval and `gh api repos/kimyeongwoo/kyw-dev/actions/jobs/88953825441/logs` preservation | 1 / 0 | PASS: 46,842 bytes, 476 lines, SHA-256 `e8dde322...68717`; failure stack and runner details retained. |
| E-05 | Canonical `task-artifacts.mjs create` for `Windows Evaluator Cleanup Determinism` | 1 / 0 | PASS: exact atomic `0028-windows-evaluator-cleanup-determinism` pair created before source/test edits. |
| E-06 | `node --version`; `npm --version`; Git/Windows identity; local Node 22/version-manager inventory | 1 / 0 | PASS: Node `v24.11.0`, npm `11.18.0`, Git `2.51.2.windows.1`, Windows `10.0.26200` AMD64; no local Node 22 or version manager. |
| E-07 | Exact focused checkpoint test, then `node --test test/evaluator-cleanup.test.mjs`, CI-like environment | 1 each / 0 | PASS: focused 1/1 in 3,903 ms; cleanup 9/9 in 18.1 s. |
| E-08 | Sequential pre-fix focused loop, maximum 20 | 20 / all 0 | PASS: 20/20, 68.8 s; no residue reproduced. |
| E-09 | Sequential pre-fix cleanup-file loop, maximum 10 | 10 / all 0 | PASS: 10/10, 179.2 s; no residue reproduced. |
| E-10 | First pre-fix `npm test` under CI-like environment | 1 / 0 | PASS: 220/220 in 29.8 s. Two further bounded invocations were started, but their final output handle was not retained; they receive no PASS credit. |
| E-11 | Same-head hosted control logs: PR job `88953195346` and main Node 22 job `88953825540` | 1 / 0 | PASS: Windows/Node 24 PR 220/220, checkpoint 6,675.7768 ms; Windows/Node 22 main 220/220, checkpoint 6,102.2851 ms. |
| E-12 | External Task-owned Windows child-cwd probe | 1 / 0 | PASS: default removal removed the root while the child still had that cwd; cwd alone ruled out. |
| E-13 | First exclusive-handle probe | 1 / invalid exit 1 | INVALID PRESERVED: PowerShell holder closed before readiness; exact residue was inspected, no holder remained, and only that external Task-owned probe root was removed. |
| E-14 | Valid external Task-owned 300 ms `FileShare.None` probe: sync removal then sync `maxRetries` | 1 / probe exit 0 | REPRODUCED: one-shot `rmSync` failed `EPERM` in 1 ms and left the root; sync `maxRetries` also returned `EPERM`; root removed only after holder release. |
| E-15 | Valid external Task-owned 300 ms `FileShare.None` probe: async `rm` with `maxRetries: 5`, `retryDelay: 100` | 1 / 0 | PASS: awaited 612 ms, holder exited 0, root absent. |
| E-16 | Added regression, then `node --test --test-name-pattern "both evaluator flows await owned removal before interruption becomes terminal" test/evaluator-cleanup.test.mjs` before production fix | 1 / 1 expected | REPRODUCED: audit/temporary-root actual terminal state `rejected`, expected `pending`, 162.834 ms; removal gate had not released and no child had spawned. |
| E-17 | Changed-module `node --check`; new terminal-order regression; original focused checkpoint regression | 1 / 0 | PASS: syntax clean; new 1/1; original 1/1. |
| E-18 | `node --test --test-name-pattern "Windows evaluator cleanup awaits bounded release of an owned exclusive handle" test/evaluator-process.test.mjs` | 1 / 0 | PASS: 1/1 in 774.0023 ms. |
| E-19 | `node --test test/evaluator-cleanup.test.mjs test/evaluator-process.test.mjs` | 1 / 0 | PASS: 18/18 in 17,975.3937 ms. |
| E-20 | `npm run format:check` after implementation/document reconciliation | 1 / 0 | PASS: interim 218 UTF-8/LF text files; E-25 records the final release gate on later diagnostic-redaction bytes. |
| E-21 | Final individual commands: two focused patterns, cleanup file, process file, platform file | 1 each / 0 | PASS: 1/1, 1/1, 10/10, 8/8, and actual Windows Ctrl+C 2/2. |
| E-22 | `node --test test/evaluator-cleanup.test.mjs test/evaluator-process.test.mjs test/evaluator-platform.test.mjs test/audit-smoke.test.mjs test/grilling-eval.test.mjs` | 1 / 0 | PASS: relevant combined evaluator suite 53/53 in 19,046.991 ms. |
| E-23 | Post-fix original focused loop maximum 20; post-fix complete cleanup-file loop maximum 10 | 20 + 10 / all 0 | PASS: focused 20/20 in 68.484 s; cleanup 10/10 in 180.018 s; no failure/retry. |
| E-24 | Standalone `npm test`; `npm run lint`; `npm run format:check`; `npm run pack:check` | 1 each / 0 | PASS: 222/222 in 24,534.8093 ms; lint 54; format 218; exact 29-file allowlist, 62,184 bytes. |
| E-25 | Final `npm run release:ci` after diagnostic redaction review | 1 / 0 | PASS: 222/222 in 24,612.6452 ms; lint/format/pack pass; packed release 29 files, 62,184 bytes, SHA-256 `3355736ce550c21dff1a64e20cd84f68f81cec0f51fd5435314ae574a1d932aa`. |
| E-26 | Canonical pair validator, Task 0027 reconciliation validator, Task 0028 acceptance validator, `git diff --check`, changed/forbidden path and residue audit | 1 each / 0 | PASS: exact strings/status/evidence and implementation constants/awaits validated; no whitespace error, unexpected path, protected history/Skill/workflow/dependency change, probe residue, or evaluator process. |

## Original CI Failure Evidence

- Run `29929111557`: `push` on `main` at exact merge commit `a72d3cdbd1e860271143ac4068501b4853b973ac`, `completed/failure`, run number 27.
- Actual job `88953825441`: `Stable / Windows / Node 24.x`, `completed/failure`.
- Derivative job `88954204846`: `Required / credential-free CI`, `completed/failure`; seven other jobs succeeded.
- PR control run `29928926570`: `pull_request` at exact head `b7b8dd0f6dd5a9663ba092efe6f3754bed372bdb`, `completed/success`, all nine jobs successful including Windows/Node 24 job `88953195346`.
- Runner: Actions runner `2.335.1`; provisioner `20260707.563` commit `02667638...`; Windows Server 2025 `10.0.26100` Datacenter; `windows-2025-vs2026@20260714.173.1`; Node `v24.18.0`; npm `11.16.0`; Git `2.55.0.windows.2`.
- `npm test`: 220 total, 219 pass, 1 fail, 0 cancelled/skipped/todo, 46,185.4233 ms.
- Failed test: `interruption checkpoints clean partially acquired resources and prevent publication`, 4,103.2627 ms.
- Stack: declaration `test/evaluator-cleanup.test.mjs:326:1`; caller line 358; `assertOwnedStateRemoved` line 196; `actual: true`, `expected: false`.
- Line 196 checks only `existsSync(temporary.temporaryRoot)`. Thus the remaining object is the evaluator-owned temporary root. The original assertion and log do not disclose audit versus grilling, exact phase, normalized root, process/handle state, event order, or cleanup diagnostics.
- The complete log contains no `cleanup operation=` or `termination operation=` diagnostic associated with the failure. No precise flow/phase will be inferred until bounded reproduction supplies it.

## Reproduction Attempts

- F-01 exact focused, F-02 cleanup file, F-03 focused 20-run loop, and F-04 cleanup 10-run loop all passed under Node `v24.11.0` and the frozen CI-like environment. This bounded 32-run targeted evidence confirms the historical failure is not a persistent assertion or path bug but does not erase it.
- F-05 child-cwd probe passed removal and ruled out cwd alone.
- F-06 first exclusive-handle fixture was invalid because it produced no readiness marker; its residue was inspected and removed safely.
- F-07 held one exact Task-owned file with Windows `FileShare.None`: current one-shot synchronous removal reproduced `EPERM` and root residue.
- F-08 used the same lock lifetime with Node's asynchronous bounded removal and removed the root after release.
- F-09 was the first deterministic repository-level failure: audit/temporary-root reached terminal rejection while its injected owned-removal Promise was still blocked. Event order was `temporary-root>cleanup-complete`, the temporary root still existed, no child had spawned, and there was no cleanup diagnostic because the unawaited Promise had not failed or completed.

## Failed and Successful Runs

- Historical PR control: run `29928926570`, 9/9 PASS.
- Historical post-merge failure: run `29929111557`, 7/9 PASS with the actual Windows job and derivative aggregate failed.
- Pre-fix local targeted runs: focused 21/21 total (one initial plus 20 stress), cleanup file 11/11 total (one initial plus 10 stress), and credited full suite 220/220.
- Pre-fix deterministic terminal-order regression: 0/1, expected failure, audit/temporary-root `rejected` before removal release.
- Post-fix initial runs: terminal-order 1/1; original checkpoint 1/1; Windows handle 1/1; cleanup/process 18/18.
- Post-fix final runs: focused regressions 1/1 each; cleanup 10/10; process 8/8; platform 2/2; combined evaluator 53/53; focused stress 20/20; cleanup stress 10/10; standalone and final release full suites 222/222 each.

## Root-Cause Evidence

- Category: `A. PRODUCTION_CLEANUP_ORDER_DEFECT`.
- Historical proof: the exact assertion shows the evaluator temporary root remained after the evaluator promise rejected. Same-head PR Windows/Node 24 and main Windows/Node 22 passed, while bounded local targeted stress also passed, excluding a persistent wrong-path assertion.
- Trigger proof: a real transient Windows exclusive handle makes the exact prior one-shot synchronous primitive fail immediately with `EPERM` and leave the owned root. Awaited asynchronous standard-library removal with the documented retry bound removes it after release.
- Ordering proof: before the fix, an injected asynchronous owned remover reported start but remained gated; audit/temporary-root nevertheless emitted cleanup completion and rejected terminally. Thus the cleanup callback did not await required owned removal, exactly matching category A.
- Historical limitation: run `29929111557` did not log its loop flow, phase, error code, or handle owner. Those facts remain unknown rather than being inferred. The first deterministic failure is exactly audit/temporary-root; future checkpoint failures now report their exact flow/phase/path/process/event/diagnostic context.
- Fix proof: both flows now await injected/default removal; the evaluator-specific default uses bounded async removal; terminal-order and real Windows handle tests pass. Cleanup exhaustion still produces the prior safe diagnostic and preserves the first terminal cause.

## Results

- Preflight, required reads, original-log preservation, bounded reproduction, root-cause proof, minimal implementation, regression, documentation sync, Task 0027 reconciliation, every focused/platform/stress/full/package gate, and final scope/integrity review passed.
- Local verdict is `DONE/PASSED`. Actual commit/PR/CI/merge/post-merge facts are intentionally not preclaimed in the commit that creates them; they remain the out-of-band terminal delivery gate before overall success is reported.

## Unverified

- Historical failing flow/phase and handle owner are irrecoverable from the original log; no claim is made for them.
- Only future integration identities/results are not present in this single commit. They must be verified exactly and reported out-of-band; any new failed/cancelled PR or post-merge workflow stops without rerun.

## Final Coverage Review

- [x] Compare the final diff and exact changed-path set to Task scope and this matrix.
- [x] Map every acceptance criterion and discovered branch/error path to executed evidence.
- [x] Confirm original failure, first local reproduction, diagnostic-only attempts, and all retries remain visible.
- [x] Confirm every existence assertion includes useful flow/phase/path context and user-home prefixes are redacted from retained diagnostics.
- [x] Confirm the fix preserves terminal cleanup rather than converting it to eventual best effort without a permanent contract change.
- [x] Confirm focused 20/20 and cleanup file 10/10 Node 24 post-fix stress actually ran.
- [x] Confirm required full/stable/package/documentary checks ran on final bytes and no unexecuted PASS is recorded.
- [x] Confirm Task 0027 remains behaviorally passed but historically delivery-blocked at its own merge SHA.
- [x] Confirm Skills/package/workflow/historical Tasks/normal state and all prohibited Task 0029/release/publication surfaces remain unchanged.
- [x] Confirm exact pre-integration base/branch/remote state and expected-head stop guards; require actual commit/PR/CI/merge/post-merge identities out-of-band before reporting overall success.
