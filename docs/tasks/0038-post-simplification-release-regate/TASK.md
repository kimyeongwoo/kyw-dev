# TASK 0038 — Post-Simplification Release Readiness Re-Gate

## Status

READY

## Goal

Supersede the Task 0029 pre-change candidate with one immutable candidate built from the fully integrated Tasks 0030 through 0037, run the complete authorized pre-publication release gate on those exact bytes, and record `READY_FOR_APPROVAL` or `BLOCKED` without publishing.

## Dependencies

- Task 0037.
- Task 0029 immutable historical candidate and `READY_FOR_APPROVAL` evidence for comparison only.
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
- [ ] AC-09: Candidate/evidence/merge package identity and external exact-head/post-merge delivery are proven through the GitHub ledger without self-referential future text in the Task artifact.
- [ ] AC-10: No publication, tag, Release, public submission, rollback command, Task 0039, or normal user-state mutation occurs.

## Plan

- [ ] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, Actions, tags, Releases, and registry state before mutation.
- [ ] Read permanent truth, this Task/Test pair, Task 0029, and the terminal evidence from Tasks 0030–0037.
- [ ] Treat selection of this `READY/READY` Task as execution confirmation; ask only if a new publication-independent product decision blocks candidate formation.
- [ ] Transition this pair to `IN_PROGRESS/RUNNING`, determine Task 0029 supersession, and form one immutable candidate from exact current mainline bytes.
- [ ] Verify the candidate from isolated detached state through the complete acceptance, package, lifecycle, hosted, official, registry, and protected-state gate.
- [ ] Preserve the first failure and make no product repair; determine `READY_FOR_APPROVAL` or `BLOCKED` from the frozen criteria.
- [ ] Commit only terminal evidence allowed outside the candidate, prove package identity, and update durable release-status wording only where its meaning changed.
- [ ] Set the repository outcome without preclaiming future delivery; complete exact-head PR/merge/post-merge delivery through the GitHub ledger and stop.

## Decisions

- Task 0029 remains valid historical evidence for its exact old candidate; it cannot authorize publication of changed final bytes.
- Current configured model/effort is preserved.
- This is a verification-only release gate; defects produce `BLOCKED` and a later user decision.
- Published-tarball identity/licensing remains pending until a separately approved publication Task.

## Risks

- Time-sensitive official or registry state may change.
- Package changes across Tasks 0030–0037 may invalidate earlier carry-forward assumptions.
- Hosted CI or lifecycle evidence can block release readiness even when local tests pass.
- External delivery facts occur after repository evidence commits and must remain in the canonical GitHub ledger.

## Discoveries and Changes

- None yet.

## Documentation Impact

- SPEC: Unchanged unless current execution disproves a product requirement.
- ARCHITECTURE: Unchanged unless final integrated behavior changes a durable boundary.
- README: Reconcile current candidate/readiness status and publication boundary.
- AGENTS: Unchanged.

## Completed

- Task scope and initial acceptance contract were approved as the final step of the ordered follow-up queue.
- No candidate or verification has run.

## Remaining

- Candidate formation and the complete pre-publication gate have not started. External delivery is intentionally not a future fact required inside this artifact.

## Resume Point

When selected after Task 0037 is repository-complete and externally delivered, revalidate all time-sensitive state, transition to `IN_PROGRESS/RUNNING`, freeze the candidate criteria, and begin at the first unchecked Plan item.

## Blockers

- None known at planning time.
