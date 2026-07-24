# TASK 0038 — Post-Simplification Release Readiness Re-Gate
<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Supersede the Task 0029 pre-change candidate with one immutable candidate built from the fully integrated Tasks 0030 through 0037, run the complete authorized pre-publication release gate on those exact bytes, and record `READY_FOR_APPROVAL` or `BLOCKED` without publishing.

## Dependencies

- Task 0037.
- The immutable historical 0029 candidate and its `READY_FOR_APPROVAL` evidence, used for comparison only and not as a hard queue edge.
- Current official Codex Plugin/Skill requirements and current public npm registry state at execution time.

## In Scope

- Prove whether Tasks 0030 through 0037 changed packed bytes or release behavior and explicitly mark the Task 0029 candidate as historical/superseded for future publication when they did.
- Form one immutable candidate commit from the exact current integrated `main`; no amend, rebase, squash, or force movement after its SHA is recorded.
- Use the active configured model and reasoning effort unchanged for any current-session direct behavioral evidence required by the final bytes.
- Run stable source checks, a real tarball and exact allowlist/identity inspection, user/project lifecycle, audit, marketplace loading, filesystem/evaluator safety, current official requirements, registry name checks, protected-state comparison, and fresh exact-candidate hosted CI.
- Reuse earlier behavioral evidence only when exact relevant-byte identity and unchanged acceptance conditions are proven; otherwise execute bounded current-session direct verification rather than claiming carry-forward.
- Keep actual publication, tag, GitHub Release, public plugin submission, deprecation, and unpublish outside this Task.
- Record repository outcome in Task/Test and complete PR/merge/post-merge delivery through the external exact-SHA ledger without requiring future facts inside the candidate/evidence commit.

## Out of Scope

- Fixing a defect discovered by the gate.
- Changing model or reasoning effort, running a mandatory cohort, or selecting favorable retries.
- `npm publish`, publication dry-run, `release:check`, registry mutation, Git tag, GitHub Release, or public plugin submission.
- Rewriting Task 0029 historical evidence.
- Automatically creating Task 0039.

## Acceptance Criteria

- [x] AC-01: The relation between the Task 0029 candidate and final current bytes is explicit; any changed packed/release behavior supersedes Task 0029 for future publication without rewriting its historical evidence.
- [x] AC-02: One immutable candidate SHA/tree is formed from exact current `main`, pushed normally, verified from a clean detached worktree, and never amended or force-moved.
- [x] AC-03: A real candidate tarball has a safe exact inventory, source-byte identity, legal files, CLI/plugin/Skill validity, and recorded shasum/integrity/SHA-256.
- [x] AC-04: Every SPEC acceptance criterion is mapped to executed current evidence or exact relevant-byte carry-forward; published-tarball-only evidence remains explicitly pending.
- [x] AC-05: User/project install-update-doctor-uninstall, audit bare/fix, local marketplace, filesystem, evaluator, cleanup, and protected-state contracts pass on exact candidate bytes.
- [x] AC-06: Current official requirements and registry name state are rechecked read-only with access time/source, and publication credentials remain a separate prerequisite.
- [x] AC-07: One fresh attempt-1 exact-candidate hosted run and all required stable/packed jobs succeed with real native fixtures and no capability skip.
- [x] AC-08: The terminal result is exactly `READY_FOR_APPROVAL` with `DONE/PASSED` or `BLOCKED` with `BLOCKED/BLOCKED`; no defect is repaired or failed evidence hidden in this Task.
- [x] AC-09: Candidate and repository evidence-head package identity are proven for exact recorded SHAs, while external PR/merge/post-merge delivery remains exclusively in the GitHub ledger and is not a Task/Test completion claim.
- [x] AC-10: No publication, tag, Release, public submission, rollback command, Task 0039, or normal user-state mutation occurs.

## Plan

- [x] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, Actions, tags, Releases, and registry state before mutation.
- [x] Read permanent truth, this Task/Test pair, Task 0029, and the terminal evidence from Tasks 0030–0037.
- [x] Treat selection of this `READY/READY` Task as execution confirmation; ask only if a new publication-independent product decision blocks candidate formation.
- [x] Transition this pair to `IN_PROGRESS/RUNNING`, determine Task 0029 supersession, and form one immutable candidate from exact current mainline bytes.
- [x] Verify the candidate from isolated detached state through the complete acceptance, package, lifecycle, hosted, official, registry, and protected-state gate.
- [x] Preserve the first failure and make no product repair; determine `READY_FOR_APPROVAL` or `BLOCKED` from the frozen criteria.
- [x] Commit only terminal evidence allowed outside the candidate, prove package identity, and update durable release-status wording only where its meaning changed.
- [x] Set the repository outcome and stop at the first real blocker.

## Decisions

- Task 0029 remains valid historical evidence for its exact old candidate; it cannot authorize publication of changed final bytes.
- Current configured model/effort is preserved.
- This is a verification-only release gate; defects produce `BLOCKED` and a later user decision.
- Published-tarball identity/licensing remains pending until a separately approved publication Task.
- This Task's explicit In Scope delivery line—not its `STANDARD` declaration alone—authorizes normal commit, push, PR, and merge actions when Task 0038 is selected.

## Risks

- Time-sensitive official or registry state may change.
- Package changes across Tasks 0030–0037 may invalidate earlier carry-forward assumptions.
- Hosted CI or lifecycle evidence can block release readiness even when local tests pass.
- External delivery facts occur after repository evidence commits and must remain in the canonical GitHub ledger.

## Discoveries and Changes

- Task 0037 is repository-complete and externally delivered: PR #24 merged exact outcome SHA `21753d2412e680687ce4bc91d3af7f8e552c23d8` to `main` as `cc7a0ef2779df62263f10c4d36a0fece50e4db2c`; PR run `30063998592` and post-merge run `30064124256` are successful with no review blocker.
- Fresh exact-SHA delivery evidence for Tasks 0030–0037 and Task 0039 satisfied the complete transitive dependency chain. Managed exact dispatch returned `SELECTED/IMPLEMENT`, `STANDARD_LIFECYCLE`, and no ceremonial confirmation.
- The clean Task branch `task/0038-post-simplification-release-regate` starts from exact delivered `origin/main` SHA `cc7a0ef2779df62263f10c4d36a0fece50e4db2c`, tree `8c2f41a47a2206d6f55450e4771c4d4298cda046`.
- Before execution there was no Task 0038 remote branch, tag, or GitHub Release. The only open pull request was unrelated historical draft PR #3.
- The current official Codex manual was already current on 2026-07-24 and retains the required plugin manifest, Skill front matter, optional `agents/openai.yaml` invocation policy, local marketplace, progressive-disclosure, and lifecycle-free npm acquisition contracts.
- Exact packed/release-relevant comparison from Task 0029 candidate `5fa5a3d2637073580a64a01a7396f4d533d0d5b6` to current `main` found 14 changed packed paths: README, package metadata, Audit/Task Skills and references, the Task adapter, CLI/core modules, and project/Task templates. Task 0029 therefore remains valid only for its historical bytes and is superseded for future publication.
- Fresh isolated public-registry checks from `2026-07-24T04:02:52.8521489Z` through `2026-07-24T04:02:55.7242356Z` returned PONG, exact `kyw-dev` E404, zero exact-name search matches, and expected unauthenticated `ENEEDAUTH`; no registry or normal npm configuration mutation occurred.
- README now names Task 0029 as historical/superseded and Task 0038 as the outcome-neutral authoritative current re-gate without pre-claiming a verdict. SPEC, Architecture, and AGENTS remain unchanged in meaning.
- Immutable candidate Commit A is `4db0578804ec9860891c31aef39a3e29b724e566`, parent `cc7a0ef2779df62263f10c4d36a0fece50e4db2c`, tree `f9d8e58bd1be17dea925c32ec17625f6732874cf`, and subject `chore: form post-simplification release candidate`. It changes only README and this pair, was pushed normally, and is checked out clean and detached below the Task-owned verification root.
- Exact candidate Stable verification passed 257/257 tests, lint over 59 JavaScript modules and foundation metadata, format over 256 UTF-8/LF files, and the exact 29-file/82,573-byte package selection.
- The retained real candidate archive is `kyw-dev-0.1.0.tgz`: 29 files, 82,573 packed bytes, 324,936 unpacked bytes, npm shasum `5127c22f3a409155f6b1cbe04d6cb03099ff3d2a`, integrity `sha512-epVtHphpwwhEBBYy2KnTbMbLxx3HJU1R8Fl8Ab+ZnWYRGuaT5/TB2jx97n6hvNrFTw4j27/FvVW6A0jnOMtbEw==`, and SHA-256 `ba0ffd878c4c47f2db6df163a8129d45c2df32e3645712ad8cd6e40da6465e3c`. All entries are safe regular files and byte-identical to candidate source.
- Current system validators accepted the extracted plugin and all four Skills. Package/plugin identity, lifecycle-script absence, legal contents, CLI help/version, credential/path hygiene, and the exact package/public-registry metadata passed.
- The exact-candidate isolated release lifecycle returned attempt-1 `CLEAN`: user/project install-update-doctor-uninstall, refusal/force preservation, local marketplace add/discover/install/list/remove, 17 guarded targets, three protected locations, unchanged normal npm/agents/Codex snapshots, and identity-checked cleanup all passed. Its independently packed lifecycle archive matched the retained candidate SHA-256 exactly.
- Current direct fixture validation returned `CURRENT_SESSION_DIRECT` for all six SPEC behavioral scenarios. Separately, all 28 packed behavior-relevant paths outside README have exact Git-blob identity with the Task 0037 verified source and combined inventory SHA-256 `7d325656525b559aedb64b8b0100f18ae7d81d8803a958cbd5bb8d5a5b4b8133`; Task 0037 current-model evidence therefore carries forward with its recorded limitations.
- One new hosted attempt-1 workflow run `30066159147` was dispatched at exact candidate SHA `4db0578804ec9860891c31aef39a3e29b724e566` and completed successfully without retry or rerun. All nine jobs passed. Linux/macOS ran 259 tests with 258 passes and only the intentional Windows-only evaluator test skipped; Windows ran 257/257 with zero skips. All three OS families created and verified their real native link or junction fixtures, and the packed job reproduced 29 files, 82,573 bytes, and SHA-256 `ba0ffd878c4c47f2db6df163a8129d45c2df32e3645712ad8cd6e40da6465e3c`.
- The prepared repository evidence head differs from immutable candidate Commit A only in this excluded Task/Test pair. All 29 selected package paths have exact Git-blob identity with the candidate, with combined path/blob inventory SHA-256 `a4978a6de7184c4681f55454f8d10fd53358b8e3398478a89695355d0bca3b16`; a non-writing npm pack selection reproduced 29 files and 82,573/324,936 packed/unpacked bytes.
- No defect repair, candidate rewrite, selective retry, publication, tag, Release, public submission, rollback, Task 0039 creation, or normal protected-state mutation occurred.

## Final Result

`READY_FOR_APPROVAL`

The exact post-simplification candidate passed every authorized pre-publication gate. The literal published-tarball identity/licensing check and publication credentials remain prerequisites of a separately approved publication Task; this result does not authorize or perform publication.

## Documentation Impact

- SPEC: Unchanged unless current execution disproves a product requirement.
- ARCHITECTURE: Unchanged unless final integrated behavior changes a durable boundary.
- README: Reconciled Task 0029 historical/superseded status, Task 0038 authority, and the unchanged publication boundary before candidate freeze.
- AGENTS: Unchanged.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as the final step of the ordered follow-up queue.
- Revalidated the clean local repository, exact local/direct remote refs, Task inventory, open PRs, tags, Releases, and Task 0038 branch absence.
- Read the Task Skill and execution reference, four permanent documents, this pair, Task 0029 historical candidate evidence, and terminal/dependency evidence from Tasks 0030–0037 and 0039.
- Validated this pair and every current transitive dependency pair.
- Queried fresh PR, review, exact-head Actions, merge, and post-merge `main` Actions evidence for the complete dependency chain and obtained a deterministic `SELECTED/IMPLEMENT` dispatch result.
- Created the Task 0038 branch from exact delivered `origin/main` and entered `IN_PROGRESS/RUNNING` without changing the configured model or reasoning effort.
- Reconciled README with outcome-safe Task 0029 supersession and Task 0038 authority wording.
- Formed and normally pushed immutable candidate Commit A `4db0578804ec9860891c31aef39a3e29b724e566`, then created a clean detached worktree at that exact SHA and tree.
- Passed exact-candidate Stable checks, detailed retained-tarball inspection, current official plugin/Skill validators, direct six-scenario acceptance validation, Task 0037 relevant-byte carry-forward proof, and the complete isolated direct/plugin/protected-state lifecycle.
- Dispatched exactly one fresh candidate hosted run at attempt 1 without rerunning an existing workflow.
- Inspected all nine jobs and the complete logs of hosted run `30066159147`; the required credential-free job, packed identity, stable matrix, native fixtures, and platform-appropriate skip counts all passed.
- Proved that the prepared evidence-only head changes only this package-excluded pair and retains all 29 candidate package blobs exactly.
- Completed the frozen matrix without finding or repairing a defect and recorded `READY_FOR_APPROVAL`.
- Validated the terminal pair, passed the 256-file format check and diff hygiene check, reconfirmed the remote candidate ref, and reconfirmed the detached candidate worktree clean at its immutable SHA.

## Remaining

- None — repository outcome is complete. External delivery is tracked only in the canonical GitHub ledger.

## Resume Point

- None — repository outcome is complete.

## Blockers

- Not applicable — no repository blocker remains.
