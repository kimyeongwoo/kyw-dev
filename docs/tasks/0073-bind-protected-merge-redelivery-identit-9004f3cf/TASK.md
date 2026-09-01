# TASK 0073 — Bind Protected-Merge Redelivery Identity to the Leading Source Task

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Correct protected-merge redelivery identity so only a supported Task identity at the beginning of the source branch is attributed to that Task, allowing the canonical Task 0072 merge whose descriptive slug contains `task-0070` to remain distinct from Task 0070 while preserving fail-closed rejection of a genuine later Task 0070 protected merge.

## Dependencies

- Task 0070.
- Task 0072.

## In Scope

- Parse a standard two-parent GitHub protected-merge subject into its owner and source branch, then recognize a Task only when the branch begins with the currently supported `task/NNNN`, `task-NNNN`, `agent/task/NNNN`, or `agent/task-NNNN` identity form and has the existing exact ID boundary.
- Stop searching later source-branch slug or description text for another Task-shaped token; owner text, another leading Task ID, nested branch text, and suffix tokens must not become redelivery identity.
- Cover the exact PR `#60` subject and source branch `task/0072-retire-consumed-task-0070-rebaseline-shim`: attribute the protected merge to Task 0072 and never to Task 0070.
- Preserve detection of a genuine later protected merge whose source branch begins with the same delivered Task identity, including the current pre-dispatch immutable-pair error code, canonical pair path, and hard-dependent correction guidance.
- Add deterministic temporary-Git fixtures for the PR `#60` shape, real same-Task follow-up delivery, both Task separators, the historical optional `agent/` namespace, near IDs, different leading IDs, owner tokens, nested tokens, malformed subjects, and bounded first-parent history.
- Prove the corrected local identity scan against current tracked main without mutating Git or GitHub, while retaining canonical terminal-pair binding, pair-byte and worktree drift checks, contract-1/2 grandfathering, hardened GitHub evidence roles, and rolling continuity behavior.
- Because the defect blocks ordinary pre-dispatch hydration, permit execution only under a separately explicit current-user bootstrap authority that freezes the exact pre-mutation allowlist and hashes, changes only the hydration owner, direct regression tests, and minimum permanent owners, passes focused proof, and then makes the sole dispatcher call; do not add a shipped Task-ID exception, migration hook, checkpoint shortcut, retry, or alternate ledger.
- Synchronize the exact source-branch identity boundary in SPEC and ARCHITECTURE; keep README, AGENTS, the `kyw-impl` procedure, package version, and release meaning unchanged unless execution discovers a genuine owner conflict.
- Preserve Task 0070 and Task 0072 terminal pair bytes, pre-existing continuity evidence, tracked main and Git history, and all GitHub, npm, tag, Release, and publication state during authoring and before any ordinary selected-Task transition.

## Out of Scope

- Editing, reopening, reterminalizing, renaming, deleting, replacing, or redelivering Task 0070, Task 0072, or any other terminal pair.
- Weakening the one-canonical-delivery rule, accepting a genuine second same-Task protected merge, or converting immutable-delivery rejection into warning or report-only behavior.
- Changing terminal-pair canonical path, byte, newline, file-mode, link, worktree, or Git-history drift semantics.
- Redesigning canonical delivery candidate discovery, GitHub run/job hydration, workflow evidence, checkpoint schema, transition tokens, migration, queue selection, Task allocation, or branch naming policy beyond the source-identity boundary.
- Supporting arbitrary merge-message formats, squash/rebase history reconstruction, unbounded history search, or heuristic Task-token extraction.
- Rerunning or bypassing CI, rewriting Git history, changing protected branches, force pushing, deleting branches, publishing, changing package or registry versions, creating tags or Releases, or making any other external mutation.
- Implementing the release candidate or absorbing the separately authored newline/file-mode and command-cache corrections.

## Acceptance Criteria

- [x] AC-01: A standard protected-merge subject attributes redelivery only when the source branch begins with one exact supported Task identity; later Task-shaped tokens in owner, branch, slug, or description text are ignored.
- [x] AC-02: The exact PR `#60` source branch is classified as Task 0072 and not Task 0070, so Task 0070 has no false additional-delivery record after its canonical merge.
- [x] AC-03: A later two-parent protected merge from a source branch beginning with Task 0070 still fails before dispatcher mutation with the immutable terminal-pair error, canonical Task path, merge identity, and new-correction guidance.
- [x] AC-04: Deterministic boundary coverage preserves both Task separators and the optional `agent/` namespace while rejecting near IDs, different leading IDs with same-ID suffixes, owner/nested tokens, malformed subjects, ambiguous forms, and out-of-bound history.
- [x] AC-05: Current tracked-main inspection and a PR-60-isomorphic temporary repository both accept the distinct Task 0072 merge without weakening canonical candidate binding, pair drift checks, hardened evidence roles, or contract-1/2 compatibility.
- [x] AC-06: Any pre-dispatch correction is separately authorized, exact-allowlisted, focused-test-gated, single-dispatch, and checkpoint/external-mutation free; production and distributed runtimes gain no Task-specific bootstrap or bypass.
- [x] AC-07: SPEC and ARCHITECTURE agree that protected-merge redelivery identity comes from the leading source-branch Task identity; README, AGENTS, `kyw-impl`, release, installation, and publication meaning remain unchanged.
- [x] AC-08: Focused identity and immutability tests, the planner-selected Stable suite, all four Stable commands, package projection checks, final diff/matrix review, pair validation, transaction inspection, and Task 0070/0072 plus checkpoint invariance checks pass before repository completion and ordinary STANDARD delivery.

## Plan

- [x] Revalidate aligned tracked main, the exact PR `#60` first-parent subject and parents, Task 0070 and Task 0072 pair hashes, the continuity checkpoint, Task transaction state, and the pre-created READY queue.
- [x] Under separate explicit pre-dispatch authority, freeze the exact allowed path/hash set, add the PR-60-isomorphic and adversarial identity fixtures, and make the smallest source-branch boundary correction in the hydration owner.
- [x] Run focused proof and a read-only current-main identity scan; require Task 0070 to have no false additional delivery and the genuine same-Task fixture to remain rejected before making the sole dispatcher call.
- [x] After the dispatcher selects this correction and its branch/pair become active, apply only any generic prepared predecessor transition, synchronize the minimum SPEC and ARCHITECTURE owner text, and keep unrelated owners byte-stable.
- [x] Run acceptance-specific, Stable, package, hash, transaction, pair, and final-scope checks, record truthful evidence, and establish repository readiness for separate ordinary STANDARD delivery without rerun, bypass, publication, or unrelated mutation.

## Decisions

- Keep one correction Task because one source-identity predicate, its compatibility table, and its redelivery invariant form one independently verifiable outcome.
- Use Task 0070 and Task 0072 as hard dependencies: Task 0070 owns the immutable canonical delivery being falsely accused, and Task 0072 owns the later canonical merge that exposes the false match.
- Define identity at the source-branch boundary after the repository owner, not as an arbitrary substring search over the complete merge subject.
- Preserve the optional `agent/` namespace because tracked history contains that supported branch form; preserve both existing Task separators and exact four-digit ID boundaries.
- Keep the deterministic temporary-Git fixture as the portable acceptance oracle and use current-main inspection only as read-only causal proof.
- Treat pre-dispatch source mutation as a one-time, separately authorized execution exception recorded by this Task, never as ambient authority or a production adapter feature. Authoring grants no implementation, checkpoint, GitHub, CI, npm, or registry mutation.

## Risks

- An over-permissive pattern can continue matching a suffix token, while an over-strict split can reject the supported `agent/` namespace or one existing Task separator.
- GitHub merge subjects combine an owner and a branch that may contain slashes; splitting at the wrong boundary can turn a nested token into a false leading identity.
- A positive-only regression can mask weakening of the genuine additional-delivery block, so the existing same-Task negative must remain exact and pre-dispatch.
- Pre-dispatch uncommitted source changes are exceptional; stale hashes, extra worktree paths, failed focused proof, or an interrupted sole-dispatch attempt must stop without checkpoint or external mutation.
- SPEC is already size-sensitive, so durable clarification must replace or tighten the existing delivery paragraph instead of adding algorithmic detail.

## Discoveries and Changes

- Tracked main is the PR `#60` merge, whose subject is `Merge pull request #60 from kimyeongwoo/task/0072-retire-consumed-task-0070-rebaseline-shim`; its source branch begins with Task 0072 and contains `task-0070` only in descriptive suffix text.
- The current additional-delivery predicate scans forward through the complete merge subject and can therefore classify that suffix as Task 0070. Read-only production hydration reproduces `FUTURE_TERMINAL_PAIR_IMMUTABLE` against the PR `#60` merge even though the Task 0070 pair path did not change.
- Tracked history also contains an `agent/task-NNNN-*` protected-merge source branch, so the optional namespace is compatibility truth rather than speculative syntax.
- The active continuity checkpoint covers through Task 0071 and leaves the delivered Task 0072 as the one current frontier; the false Task 0070 redelivery match prevents ordinary hydration from evaluating that frontier.
- Authoring performs no implementation, checkpoint write, Git mutation, GitHub request mutation, CI action, publication, or registry change.
- Execution began at `2026-09-01T11:54:27+09:00` from exact aligned `main` `17ce6ff2b4cd67accad7e842ca64aad5a741a1ff`. The frozen worktree contained only the pre-created Task 0073–0076 pairs plus the two authorized bootstrap paths; the index and Task transaction were empty.
- The pre-dispatch focused proof passed `5/5`, including the exact PR-60 source shape, adversarial identity boundaries, pair-history drift, genuine same-Task rejection, and canonical-candidate ambiguity. The separate tracked-main scan passed `1/1` and left refs, status, and checkpoint bytes unchanged.
- The generic adapter was invoked exactly once with the original invocation and verified-empty execution preflight. It freshly classified Task 0072 as `HARDENED_EXACT_HEAD`, selected `IMPLEMENT / 0073`, created no pre-selection checkpoint write, and prepared one opaque predecessor transition.
- After active-pair validation, the untouched transition applied exactly once and advanced continuity from count `40` / last Task `0071` / digest `d405e676…` to count `41` / last Task `0072` / digest `e183b495…`, with source and covered main `17ce6ff…` and no Task 0073 self-coverage.
- SPEC section 7 and ARCHITECTURE section 5.4 now bind redelivery attribution to the leading supported source-branch Task identity. README, AGENTS, the `kyw-impl` procedure, package, release, installation, and publication owners remain byte-stable.
- Full focused verification passed `119/122` with three explicit host/live skips. Stable passed `411/414` with the same three skips, lint over `84` modules, format over `360` files, and pack selection of `43` files / `133177` bytes.
- The deterministic 4097-record proof preserved the 4096 first-parent bound, package-owner scans found no Task-specific bootstrap or repository identity, and final pair/transaction/hash/checkpoint/diff review found no scope drift.

## Documentation Impact

- SPEC: Clarify in the existing STANDARD delivery contract that another Task-scoped protected merge is identified only by the supported leading Task identity of its source branch.
- ARCHITECTURE: Clarify in the existing STANDARD delivery flow where owner/source parsing and leading Task identity bound first-parent protected-merge attribution.
- README: Expected unchanged — setup, invocation, user-facing one-canonical-delivery guidance, and contributor entry do not change.
- AGENTS: Expected unchanged — correction, authority, immutable-pair, and external-mutation rules already cover this outcome.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Froze and revalidated the exact pre-dispatch manifest, dependency pair hashes, count-40 checkpoint through Task 0071, aligned PR-60 main, and empty transaction/index state.
- Corrected only the hydration owner and direct regression file before dispatch; no Task pair, permanent owner, checkpoint, Git/GitHub, CI, npm, tag, Release, publication, or other external state changed in that phase.
- Passed the one-shot focused identity/immutability proof and separate read-only current-main scan, then completed the sole generic dispatcher call and established the selected Task branch.
- Activated and validated this pair, applied the opaque predecessor transition once through Task 0072 only, and synchronized the minimum SPEC and ARCHITECTURE owner text.
- Passed focused, Stable, package projection, bounded-history, invariant, documentation, transaction, whitespace, and final matrix/diff coverage checks.

## Remaining

- None — repository outcome, documentation synchronization, verification, invariance, and final coverage are complete; ordinary STANDARD delivery remains the separate external ledger.

## Resume Point

- None — repository outcome is complete. If delivery is interrupted, resume only from the recorded branch/PR external state without repeating bootstrap proof, dispatcher, or continuity application.

## Blockers

- Not applicable — no blocker is known at authoring time.
