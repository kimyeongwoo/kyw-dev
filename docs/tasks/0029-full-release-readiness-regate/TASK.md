# TASK 0029 — Full Release Readiness Re-Gate

## Status

DONE

## Goal

Form one immutable `0.1.0` candidate from the integrated Task 0028 mainline, verify that exact candidate through the complete authorized pre-publication release gate, record one evidence-only terminal verdict, and deliver the immutable evidence through exact-head pull-request and post-merge CI without performing any publication action.

## Dependencies

- `origin/main` at `a8c3cef301de6cc4e1d4883ac55f9a9a6fe245dc`, including merged Tasks 0001 through 0028.
- Task 0017 historical grilling evidence and its retained `BLOCKED/BLOCKED` verdict.
- Task 0020 historical release-gate evidence and its immutable old-candidate `BLOCKED/BLOCKED` verdict.
- Tasks 0021, 0023, 0024, and 0025 remediation and deterministic safety evidence.
- Task 0027 direct SPEC AC-04 through AC-08 behavioral evidence, carried forward only by candidate relevant-byte identity.
- Task 0028 evaluator-cleanup determinism and integrated hosted evidence.
- Current official OpenAI Codex Plugin and Skill requirements and installed Codex CLI `0.145.0`.

## In Scope

- Exact local/remote/collision preflight, one normal fetch, and one exact Task branch.
- This atomic Task/Test pair plus one outcome-safe README reconciliation in immutable Commit A.
- Exact candidate push, clean detached verification, fresh exact-SHA hosted CI, stable source gates, one real unpublished tarball, and SPEC §15 AC-01 through AC-12 evidence.
- Current-session direct audit and grilling contracts, deterministic regressions, lifecycle/filesystem/evaluator safety, official-requirement and registry checks, and protected-state attribution.
- One evidence-only Commit B, package-identity proof, non-draft PR, exact-head CI, expected-head merge commit, exact-merge post-merge CI, cleanup, and terminal report.
- Publication/tag/release/rollback commands as planning text only because the verdict reached `READY_FOR_APPROVAL`.

## Out of Scope

- Any product, Skill, test, workflow, package, legal, or configuration repair.
- Resuming or rewriting Task 0020, modifying Tasks 0017/0020/0026/0027/0028, or creating Task 0030.
- A new model cohort, nested `codex exec`, or subagent orchestration merely for independence.
- Selective stochastic retries or any scenario/rubric/threshold/grader/baseline weakening.
- `npm publish`, publication dry-run, `npm run release:check`, registry mutation, tag, GitHub Release, public plugin submission, or an existing Actions-run rerun.
- Candidate amend/rebase/squash/force-move, reset, clean, stash, or branch deletion.

## Acceptance Criteria

- [x] AC-01: The exact candidate tarball contains only the approved 29-file release allowlist, every file is byte-identical to candidate source, and every entry is safe.
- [x] AC-02: Isolated user-scope installation exposes exactly four byte-matching Skills with ownership metadata and preserves unrelated state.
- [x] AC-03: A fresh isolated Git repository receives exactly four project Skills, no user-scope leak occurs, and existing tracked/untracked files are preserved.
- [x] AC-04: Task 0027 empty-project initialization and existing-project adoption evidence remains directly applicable through exact candidate behavior-byte identity.
- [x] AC-05: Task 0027 next-Task creation and numeric resume evidence remains directly applicable through exact candidate behavior-byte identity.
- [x] AC-06: Task 0027 pre-confirmation implementation refusal remains directly applicable through exact candidate behavior-byte identity.
- [x] AC-07: Task 0027 intentionally untested-branch detection remains directly applicable through exact candidate behavior-byte identity.
- [x] AC-08: Task 0027 ordinary small-change/permanent-document routing remains directly applicable through exact candidate behavior-byte identity.
- [x] AC-09: Exact packed `$kyw-audit` directly reports both stale permanent documentation and unsupported PASS evidence without mutation, while separate exact `--fix` evidence performs only announced bounded repairs and reruns affected checks.
- [x] AC-10: Exact packed install/doctor/update/uninstall, ownership, duplicate, modified/missing/unknown-file, recovery, containment, link/junction, and unsupported-type behavior passes and fails closed where required.
- [x] AC-11: The real candidate completes isolated local `./` marketplace add/discover/install/list/remove with exactly four byte-matching Skills and no normal Codex/plugin-state mutation.
- [x] AC-12: The unpublished candidate contains the required MIT and third-party bytes as `PREPUBLICATION_CANDIDATE_PASS`; `PUBLISHED_TARBALL_CHECK_PENDING` remains explicit.
- [x] AC-13: Stable commands and one fresh exact-candidate attempt-1 hosted run pass; all nine jobs succeed, native POSIX links/Windows junctions are real, and there is no capability skip.
- [x] AC-14: Current official requirements, public-registry name availability, credential prerequisite state, and protected-state before/after attribution support a pre-publication verdict.
- [x] AC-15: The prepared evidence tree changes only this Task/Test pair and repacks byte-identically to Commit A; the immutable Commit B SHA and post-commit confirmation are necessarily reported after this snapshot.
- [x] AC-16: Exact-head PR CI, expected-head merge, and exact-merge main CI remain mandatory post-Commit-B stop gates. This immutable evidence snapshot does not pre-claim those future GitHub results; their exact objects belong in the terminal report.

## Plan

- [x] Revalidate the exact starting checkout, remote objects, PR #13, its two expected CI runs, and every requested collision/drift category before mutation.
- [x] Read permanent truth, historical release evidence, current remediation evidence, and implementation/verification surfaces.
- [x] Create the exact branch and atomic Task/Test pair from the expected `origin/main`.
- [x] Reconcile README without a provisional terminal claim; validate, commit, and normally push immutable Commit A.
- [x] Create the detached exact-SHA worktree, redirect all writable verification state, and capture identities/protected-state baselines.
- [x] Dispatch and inspect one fresh exact-candidate hosted run and complete every authorized local/external release gate.
- [x] Determine `READY_FOR_APPROVAL` without repairing or suppressing any release defect.
- [x] Prepare terminal evidence only in this pair and prove the prepared Commit B package tree is candidate-identical.
- [ ] After this immutable evidence snapshot is committed and pushed, complete the mandatory PR/merge/post-merge sequence and record it in the terminal report.

## Decisions

- Commit A `5fa5a3d2637073580a64a01a7396f4d533d0d5b6` is immutable; no amend, rebase, squash, or force movement is permitted.
- Commit B changes only this pair. Because the user-mandated order creates PR and merge objects after Commit B, repository evidence cannot honestly contain their eventual identities without a forbidden third commit. They are mandatory external delivery gates, not waived checks.
- Task 0020 remains historical `BLOCKED` evidence for candidate `54b9…` and was not resumed.
- Task 0027 evidence is carried forward only for 28 packed behavior-relevant files whose combined identity is exact; README is the sole packed difference and is not an S-01-through-S-06 input.
- Audit and grilling evidence produced here is exactly `CURRENT_SESSION_DIRECT`, not independent, fresh-session, cohort, subagent, or hosted-model evidence.
- Task 0017's failed cohort remains visible; Task 0020's later complete passing comparison is supplementary only and its unavailable raw directory is not reported as re-executed.
- A release defect would have produced `BLOCKED` without a repair. No release defect was found.
- AC-12 cannot exceed candidate-level pre-publication evidence, so success is `READY_FOR_APPROVAL`, never final published-MVP acceptance.

## Risks

- Registry, official requirements, and hosted state can change after this point and must be rechecked in a separately approved publication workflow.
- `npm whoami` is unauthenticated. Publication requires explicit identity/credential approval; this is not a product defect.
- The normal Codex runtime changes its own volatile shim paths and cache metadata while this session runs. Content hashes, auth, config, `.agents`, npm state, environment values, and kyw-dev markers remained unchanged; isolated lifecycle state was exactly restored.
- The literal published-tarball license/identity check cannot run before publication.
- Any failure in exact-head PR CI or post-merge main CI is a terminal delivery blocker and is not authorized for rerun or repair here.

## Discoveries and Changes

- Exact preflight confirmed local Task 0028 at `712f63295b04a13db3611e956acfa7cd28b117f0`, clean and `+0/-0`; remote main `a8c3cef301de6cc4e1d4883ac55f9a9a6fe245dc`; exact Task 0028 remote; merged PR #13; its 9/9 PR run `29965083681`; and its 9/9 post-merge run `29965230338`. No later unexpected commit, PR, run, branch, tag, release, Task 0029 object, or user work existed.
- The adapter initially normalized `Re-Gate` to `re-gate`; before commit, the two newly generated files were identity-checked and moved to the required `0029-full-release-readiness-regate` path. The first pair validation also correctly rejected row-level `RUNNING` states and a compound AC mapping; both were reconciled before Commit A.
- Commit A has parent `a8c3cef301de6cc4e1d4883ac55f9a9a6fe245dc`, tree `34b7820913e3b604665000ec0e46fa6dc09a0a4b`, subject `chore: form 0.1.0 release candidate`, and only `README.md` plus this pair. Its normal push left local/remote branch `+0/-0`.
- Detached worktree `C:/1kyw/5.personal/kyw_dev-task0029-5fa5a3d2/candidate-worktree` stayed clean at the exact candidate. Git is `2.51.2.windows.1`, Node `v24.11.0`, npm `11.18.0`, and Codex CLI `0.145.0`.
- Manual run `29969220919` is `workflow_dispatch`, attempt 1, exact candidate head, completed 9/9 SUCCESS. Hosted Node versions were `v22.23.1`, `v24.18.0`, and `v26.5.0`; checkout credentials were not persisted; the aggregate token had read-only content/metadata permission.
- Local stable evidence is 222/222 tests with zero skip, lint 54 modules, format 220 files, pack 29 files/62,189 bytes, aggregate check PASS, `release:ci` PASS, and `git diff --check` PASS.
- The real tarball is `kyw-dev-0.1.0.tgz`, npm shasum `7cf6c730a42b783a5e9baf1d0ed401f2ebed6093`, SHA-256 `864331238224a78719b90e68dc7a1e59e282b24bf823c96d8bdf9066277379f8`, 62,189 packed bytes, 238,105 unpacked bytes, and 29 files.
- Task 0027 source/package was `46ea3ddd4a23bbdaccd75c43335bd70d2c25c465` / SHA-256 `ff484e1d17562a2d2da9f574fe7fb8688a9dd0e9de31eae574870df396022f79`. All 28 packed paths other than README were byte-identical, with combined SHA-256 `bd5cb0a113cf2285f4a01321388bbf7faf41130b51f69e7c58cb1c67e5714307`; therefore its AC-04-through-AC-08 direct sub-verdict remains applicable.
- Bare audit returned two stable findings and `BLOCKED` with an exactly unchanged fixture. Separate `--fix` evidence announced a two-path plan, changed only README/TEST evidence, preserved unrelated tracked/untracked bytes, reran 1/1, and returned PASS. Both are `CURRENT_SESSION_DIRECT`.
- Current grilling direct evidence passed six bounded contracts; unit/frozen checks passed 15/15 and the packed Skill tests passed 7/7. No new cohort ran.
- Focused audit/lifecycle/evaluator/isolation coverage passed 27/27 and 102/102. Hosted Linux/macOS created seven real native link fixtures per lane; Windows created seven real junction fixtures per lane. The sole POSIX test skip was the explicitly Windows-only exclusive-handle evaluator test, not a capability skip.
- Current official manual `https://developers.openai.com/codex/codex-manual.md` was checked at `2026-07-23T00:48:51.252Z`; header/content SHA-256 is `33592e759ffa202ee098034d17f0299f7d084e4e433b130c65b9a853861da5ec`. Candidate structure, metadata, discovery, invocation policy, local marketplace form, lifecycle-free npm acquisition, validators, and actual CLI lifecycle conform.
- At `2026-07-23T00:50:28Z`, public npm ping succeeded; `npm view kyw-dev` returned E404; search returned zero exact-name matches; `npm whoami` returned expected ENEEDAUTH. No registry mutation occurred.
- Protected-state comparison found no kyw-dev mutation: `.agents`, npm userconfig/cache, Codex auth/config contents, environment values, source/candidate status, and release-runner before/after hashes were stable. Only current Codex runtime metadata/volatile shim rotation was observed and fully attributed; no kyw-dev marker or credential residue appeared.

## Documentation Impact

- SPEC: unchanged; each existing §15 criterion was evaluated separately.
- ARCHITECTURE: unchanged; no component, dependency, data-flow, storage, or distribution boundary changed.
- README: Commit A alone reconciles current evidence authority and the pre-publication boundary without claiming an unconditional PASS.
- AGENTS: unchanged; repository-wide completion rules did not change.

## Completed

- Exact preflight, source/evidence review, branch and pair creation.
- Immutable candidate formation and normal push.
- Detached/isolated stable, package, install, behavioral, lifecycle, evaluator, hosted, registry, official-requirement, and protected-state verification.
- Candidate-level terminal verdict and prepared two-file evidence tree/package identity proof.

## Remaining

- After Commit B, normally push it, create the non-draft PR, require exact-head 9/9 CI, merge only with expected-head protection as a merge commit, require exact-merge post-merge main 9/9 CI, prove the merge package remains identical, remove only identity-checked Task-owned temporary state, and issue the terminal report.
- No remaining release-readiness verification may modify the candidate or add a third commit.

## Resume Point

Commit this exact two-file evidence tree as `test: record 0.1.0 release readiness`, confirm the immutable Commit B scope/package identity, push normally, then begin the mandatory post-B GitHub delivery sequence. Stop immediately on any exact-head, review, mergeability, merge-parent, or post-merge CI mismatch.

## Blockers

- None in the authorized pre-publication candidate gate.
- Publication remains separately blocked on explicit user approval/credentials and later published-tarball license/identity verification.

## Final Result

READY_FOR_APPROVAL

The exact unpublished candidate passed the complete authorized pre-publication gate. This verdict authorizes only a later separately approved Publication Task. No npm publication or dry-run, `release:check`, registry mutation, tag, GitHub Release, public plugin submission, or Task 0030 occurred. Full SPEC MVP acceptance still requires confirming licensing and identity in the actually published tarball.
