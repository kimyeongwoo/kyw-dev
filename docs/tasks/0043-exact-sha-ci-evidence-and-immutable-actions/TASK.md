# TASK 0043 — Exact-SHA CI Evidence and Immutable Actions

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Ensure every push to `main` retains terminal exact-SHA CI evidence while obsolete runs for the same pull request may still be cancelled, and pin every external GitHub Action to an upstream-verified immutable commit without changing the runtime matrix or publication boundary.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- `.github/workflows/ci.yml` concurrency grouping and cancellation semantics.
- Pull-request-specific cancellation and commit-SHA-specific non-cancelling `main` push groups.
- Manual-dispatch grouping that cannot cancel an unrelated exact-SHA `main` run.
- Full 40-character upstream-verified commit pins for every `actions/checkout` and `actions/setup-node` use, with readable release/version comments.
- Static workflow tests for immutable references, concurrency semantics, read-only permissions, credential handling, current matrix/jobs, and no publication/tag/merge behavior.
- Minimal authoritative documentation wording only where CI evidence semantics change.

## Out of Scope

- Removing or downgrading Node 26 bounded compatibility without measured evidence.
- Dependabot, a custom Action updater, another CI provider, reusable-workflow framework, or deployment job.
- Required branch-protection changes outside the repository.
- Publication, registry mutation, tag, GitHub Release, auto-merge, force operation, or workflow rerun.

## Acceptance Criteria

- [x] AC-01: Pull-request runs use a PR-specific concurrency group and may cancel older runs only for the same pull request.
- [x] AC-02: Pushes to `main` use a commit-SHA-specific concurrency group and are not cancelled by a later `main` push.
- [x] AC-03: Manual runs cannot cancel an unrelated exact-SHA `main` run.
- [x] AC-04: Every external Action reference is pinned to an official upstream-verified full 40-character commit SHA with a human-readable version comment.
- [x] AC-05: Node 22/24 cross-platform lanes, the Node 26 Ubuntu compatibility lane, packed-release job, aggregate result, permissions, credential handling, and no-publication behavior remain unchanged unless repository evidence requires a scoped correction.
- [x] AC-06: Tests fail if a movable Action tag is reintroduced or if PR, `main`, or manual concurrency semantics regress.
- [x] AC-07: Repository evidence keeps hosted exact-head pull-request CI and post-merge `main` CI in the subsequent external `STANDARD` delivery ledger rather than pre-claiming either result as a behavioral PASS.

## Plan

- [x] Revalidate the workflow, current static tests, official upstream Action refs, runtime matrix, permissions, and no-publication boundary.
- [x] Define event-specific concurrency expressions that cancel only superseded runs for the same PR and preserve every `main` SHA run.
- [x] Replace movable Action tags with official full-SHA pins and readable version comments without changing Action behavior.
- [x] Extend static workflow tests for every event, pin shape, matrix/job invariant, permission, credential, and forbidden mutation.
- [x] Synchronize only the authoritative CI evidence explanation if observable semantics changed.
- [x] Run focused workflow tests, exact-path planning, Stable checks, canonical validation, and final workflow/diff review; terminalize the repository outcome for subsequent ordinary `STANDARD` delivery.

## Decisions

- Cancellation is scoped to superseded runs for one pull request; `main` evidence is keyed by immutable commit SHA.
- Action immutability uses exact official upstream commits while comments preserve human readability.
- The existing supported runtime matrix and credential-free no-publication design remain deliberate non-changes.
- Workflow reruns and branch-protection administration remain outside ordinary implementation authority.

## Risks

- A broad branch-based concurrency key can erase terminal evidence for an earlier `main` SHA.
- Manual and push events expose different context fields; an unsafe fallback can collide with `main` groups.
- A syntactically valid SHA can still be the wrong upstream commit; pin provenance must be verified from the official Action repository.
- Static edits can unintentionally change permissions, matrix coverage, checkout credentials, or packed-job behavior.

## Discoveries and Changes

- Fresh preflight verified `main`, its upstream, local `main`, `origin/main`, and direct remote `main` at `4c6c121808cfa3b86f4369d0edf6d2ed0c493d28`; staged and unstaged sets were empty, and the only untracked paths were the five pre-created Task/Test pairs 0043–0047.
- The corrected external ledger uses exact `taskId` `"0042"` and freshly binds PR #28 head `a4812d1e07b7d0412da58a106fef9a506d8d4d2d`, merge SHA `4c6c121808cfa3b86f4369d0edf6d2ed0c493d28`, PR run `30142590555`, and post-merge run `30142658184`; no repository artifact required repair.
- No Git lock, merge/rebase/sequencer state, Task creation transaction, staging root, or current-queue residue exists. Three historical detached worktree metadata entries predate the current queue and do not own the current branch, index, or Task transaction.
- The original AC-07/T-07 phrasing made mutable hosted delivery look like a prerequisite for repository `DONE/PASSED`. It was reconciled with the permanent repository-versus-delivery boundary while preserving the stable IDs and exact-SHA delivery requirement.
- Official upstream refs currently bind `actions/checkout@v6` to signed commit `d23441a48e516b6c34aea4fa41551a30e30af803` (`v6.1.0`) and `actions/setup-node@v6` to signed commit `249970729cb0ef3589644e2896645e5dc5ba9c38` (`v6.5.0`).
- Workflow concurrency now uses PR number, push commit SHA, or manual run ID as mutually distinct event identities and enables cancellation only for pull requests.
- All four external Action uses are pinned to the two verified commits with readable release comments; runtime lanes, permissions, credentials, timeouts, Stable commands, packed candidate, aggregate result, and forbidden publication behavior are unchanged.
- Static regressions cover the production workflow plus unsafe PR/push/manual identity replacements, unconditional cancellation, movable tags, and missing readable provenance.
- The exact-path planner classified the workflow change as `RELEASE`; `npm run release:ci` passed 279 tests, lint, format, package selection, and one real candidate archive without registry or publication mutation.

## Documentation Impact

- SPEC: Reviewed; its exact-SHA delivery, supported-runtime, credential-free CI, and no-publication requirements already own the unchanged product behavior, so it was not edited.
- ARCHITECTURE: Updated the authoritative event-specific concurrency and immutable external-Action boundaries.
- README: Updated the concise user projection for PR cancellation, exact-SHA `main` retention, manual isolation, and immutable Action pins.
- AGENTS: Reviewed; stable commands, routing, and repository completion invariants did not change, so it was not edited.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed fresh local, direct-remote, PR, Actions, queue, lock, worktree, and transaction preflight.
- Corrected the session delivery expectation shape with exact `taskId` `"0042"` without changing repository bytes or repeating Task 0042 delivery.
- Revalidated AC-01–AC-07 against T-01–T-08 and reconciled the repository-versus-external evidence boundary.
- Verified both current v6 Action refs and release identities directly against the official upstream repositories.
- Implemented event-specific concurrency and upstream-verified full-SHA pins in `.github/workflows/ci.yml`.
- Added positive and mutation-based negative workflow tests while preserving the complete runtime, permission, credential, packed, aggregate, timeout, and no-publication contract.
- Synchronized README and ARCHITECTURE, reviewed SPEC and AGENTS as unaffected, and added no dependency.
- Passed focused 4/4, planner-selected Release verification with 279/279 plus lint/format/package and real-candidate evidence, all 47 canonical pair validations, transaction-residue inspection, `git diff --check`, and the complete scope/coverage review.

## Remaining

- None — repository implementation and verification are complete; required GitHub delivery is tracked externally by the `STANDARD` ledger.

## Resume Point

- None — repository work is terminal at `DONE`; resume only the ordinary external `STANDARD` delivery lifecycle if its ledger is not yet satisfied.

## Blockers

- Not applicable — no blocker is known.
