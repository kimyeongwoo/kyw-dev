# TASK 0038 — Post-Simplification Release Readiness Re-Gate
<!-- kyw-task-contract: 2 -->

## Status

IN_PROGRESS

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

- [ ] AC-01: The relation between the Task 0029 candidate and final current bytes is explicit; any changed packed/release behavior supersedes Task 0029 for future publication without rewriting its historical evidence.
- [ ] AC-02: One immutable candidate SHA/tree is formed from exact current `main`, pushed normally, verified from a clean detached worktree, and never amended or force-moved.
- [ ] AC-03: A real candidate tarball has a safe exact inventory, source-byte identity, legal files, CLI/plugin/Skill validity, and recorded shasum/integrity/SHA-256.
- [ ] AC-04: Every SPEC acceptance criterion is mapped to executed current evidence or exact relevant-byte carry-forward; published-tarball-only evidence remains explicitly pending.
- [ ] AC-05: User/project install-update-doctor-uninstall, audit bare/fix, local marketplace, filesystem, evaluator, cleanup, and protected-state contracts pass on exact candidate bytes.
- [ ] AC-06: Current official requirements and registry name state are rechecked read-only with access time/source, and publication credentials remain a separate prerequisite.
- [ ] AC-07: One fresh attempt-1 exact-candidate hosted run and all required stable/packed jobs succeed with real native fixtures and no capability skip.
- [ ] AC-08: The terminal result is exactly `READY_FOR_APPROVAL` with `DONE/PASSED` or `BLOCKED` with `BLOCKED/BLOCKED`; no defect is repaired or failed evidence hidden in this Task.
- [ ] AC-09: Candidate and repository evidence-head package identity are proven for exact recorded SHAs, while external PR/merge/post-merge delivery remains exclusively in the GitHub ledger and is not a Task/Test completion claim.
- [ ] AC-10: No publication, tag, Release, public submission, rollback command, Task 0039, or normal user-state mutation occurs.

## Plan

- [x] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, Actions, tags, Releases, and registry state before mutation.
- [x] Read permanent truth, this Task/Test pair, Task 0029, and the terminal evidence from Tasks 0030–0037.
- [x] Treat selection of this `READY/READY` Task as execution confirmation; ask only if a new publication-independent product decision blocks candidate formation.
- [ ] Transition this pair to `IN_PROGRESS/RUNNING`, determine Task 0029 supersession, and form one immutable candidate from exact current mainline bytes.
- [ ] Verify the candidate from isolated detached state through the complete acceptance, package, lifecycle, hosted, official, registry, and protected-state gate.
- [ ] Preserve the first failure and make no product repair; determine `READY_FOR_APPROVAL` or `BLOCKED` from the frozen criteria.
- [ ] Commit only terminal evidence allowed outside the candidate, prove package identity, and update durable release-status wording only where its meaning changed.
- [ ] Set the repository outcome and stop at the first real blocker.

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

## Remaining

- Compare Task 0029 and current packed/release-relevant bytes, reconcile the outcome-safe README authority statement, and form the immutable candidate commit.
- Verify the exact candidate through the complete frozen local, package, lifecycle, official, registry, protected-state, and fresh hosted gates.
- Record the evidence-only terminal verdict and complete the authorized external delivery ledger.

## Resume Point

Compare Task 0029 candidate `5fa5a3d2637073580a64a01a7396f4d533d0d5b6` with exact current `main` package/release inputs, update only the outcome-safe README authority wording required before candidate freeze, then create and record immutable candidate Commit A.

## Blockers

- None known at planning time.
