# TASK 0081 — Prepare kyw-dev 0.1.4 Release Candidate

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Prepare and deliver the exact next patch candidate, `kyw-dev@0.1.4`, from current `main` under the simplified release contract, with synchronized package/plugin truth and reproducible non-publishing Release evidence before any npm, tag, or GitHub Release mutation.

## Dependencies

- Task 0079.

## In Scope

- Freshly prove public npm `latest=0.1.3`, versions `0.1.0` through `0.1.3`, and unused target `0.1.4` before version edits and terminalization.
- Update package, plugin, deterministic foundation metadata, current installation assertions, and current instruction projections from `0.1.3` to `0.1.4` without rewriting historical release evidence.
- Synchronize README and SPEC to distinguish the unpublished `0.1.4` source/package candidate from public npm `latest=0.1.3`.
- Run focused version, installation, distribution, foundation, instruction, and publication-workflow regressions plus the planner-selected Release graph and real candidate inspection.
- Complete final scope, permanent-document, pair, transaction, package, dependency/lifecycle, and no-publication review.
- Deliver the candidate through ordinary `STANDARD` exact-SHA GitHub gates so manual OIDC publication can bind one exact current-main commit.

## Out of Scope

- Dispatching or rerunning `publish.yml`, invoking `npm publish`, changing a dist-tag, authenticating to npm account/settings surfaces, or using a token/direct/fallback publication path.
- Creating or pushing a Git tag, creating a GitHub Release, uploading a Release asset, or making a public plugin-directory submission.
- Reusing, editing, retrying, or merging the local-only blocked Task 0076 branch or the consumed Task 0078 evidence runner.
- Changing the delivered publication workflow, release verification topology, production dependencies, package allowlist, lifecycle scripts, or another version.
- Force push, bypass/admin mutation, branch deletion, retry after failure, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: Fresh public and repository reads establish exact current main, package/plugin `0.1.3`, public `latest=0.1.3`, target `0.1.4` absence, no active target publication, and no existing `v0.1.4` tag or Release before mutation.
- [x] AC-02: Current package/plugin/foundation/install identities agree on `0.1.4`; historical `0.1.0` through `0.1.3`, terminal Task evidence, dependencies, lifecycle, registry, and package boundaries remain unchanged.
- [x] AC-03: README and SPEC truthfully identify an unpublished `0.1.4` candidate while retaining verified public `0.1.3` OIDC, `gitHead`, signature, provenance, and history facts.
- [x] AC-04: Focused tests, exact changed-path planning, `npm run release:ci`, and one independently inspected real candidate pass with manifest/plugin parity and no publication command.
- [x] AC-05: Permanent-document deltas, pair/transaction validation, final diff/coverage, workflow byte stability, public-state recheck, and absence of external mutation are auditable.
- [x] AC-06: The terminal repository outcome is ready for ordinary `STANDARD` delivery, whose separate external gate must place the exact candidate on current `main` with PR-head and post-main CI before publication, tag, or Release action.

## Plan

- [x] Inspect exact current main, public npm state, target absence, workflow history/identity, tag/Release absence, and obsolete Task 0076/0078 boundaries.
- [x] Update the current version owners and candidate/public projections without changing historical evidence or the publication workflow.
- [x] Run focused and full Release verification, measure permanent documents, inspect package bytes, and reconcile all evidence.
- [x] Terminalize the pair after final scope/coverage review and hand the immutable repository outcome to ordinary `STANDARD` delivery.

## Decisions

- Use exact version `0.1.4`: current source and public npm are `0.1.3`, the registry returns target absence, and the obsolete Task 0076 intent independently agrees without supplying reusable code or evidence.
- Keep candidate preparation separate from public npm publication, tag creation, and GitHub Release creation because each has its own irreversible action and attempt boundary.
- Use only the simplified Task 0079 Release graph: required Stable checks, one real candidate, composite `release:ci`, and exact-SHA hosted CI; do not revive removed runner/harness/isolation layers.
- Preserve the manual workflow bytes and publish only from the eventual exact current-main candidate SHA.

## Risks

- Target `0.1.4` could become occupied before publication; any changed registry state blocks rather than silently renumbering.
- Current-version replacements could accidentally rewrite historical evidence or leave package/plugin/install truth inconsistent.
- Candidate bytes can drift between local verification and main; exact-SHA hosted CI and immediate pre-publication revalidation must bind the later attempt.
- Publication, tag, and Release are irreversible and remain excluded from this candidate outcome.

## Discoveries and Changes

- Task 0080 delivered through PR #67 at merge `14fcf53498cdb091f357f47041e6faf4a428b28f`; its PR-head 11-job and post-main 10-success-job graphs passed.
- Fresh public npm reads list `0.1.0` through `0.1.3`, keep only `latest=0.1.3`, and return target absence for `0.1.4`; no active publication run, remote tag, or GitHub Release exists.
- The old Task 0076 pair is local-only `BLOCKED/BLOCKED` on obsolete code and cannot supply the current candidate. Task 0078 is consumed failure evidence; Task 0079 is the active simplified release contract.
- Current `publish.yml` is manual-only, exact-main/exact-version/target-absence guarded, and must not be dispatched until this candidate is delivered.
- The first full Release run passed 387 of 393 tests and exposed two exact local-main identity failures because the shared local `main` ref still pointed to `dee58b1d…` while `origin/main` pointed to `14fcf534…`; no product or package assertion failed.
- Worktree enumeration and ancestry proved local `main` was not checked out and could fast-forward safely. Aligning it to `origin/main` made both named hydration regressions pass 2/2; no force, reset, worktree edit, or external retry occurred.
- The packaged dispatcher resumed Task 0081 and freshly incorporated delivered Task 0080 into the bounded continuity checkpoint. The one transition was applied at 47 covered Tasks with digest `9f9aea3e204a9f984afb7a7ddb2657b1b1c84928117eefadf120741964579d1c`.

## Documentation Impact

- README: Identify source/package `0.1.4` as unpublished while public installation and registry truth remain `0.1.3`.
- SPEC: Synchronize package-boundary and publication-state ownership for the candidate/public split.
- ARCHITECTURE: Unchanged — Task 0079 already owns the simplified verification and exact-main OIDC flow.
- AGENTS: Unchanged — direct authority and release boundaries already govern this outcome.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Confirmed exact `origin/main`, public registry history/latest/target absence, publication workflow state, and tag/Release absence without npm account authentication.
- Rejected the obsolete Task 0076 branch and consumed Task 0078 evidence as candidate sources.
- Updated the bounded current-version owners and candidate/public permanent truth while leaving publication workflow and external state unchanged.
- Passed the 96-test focused suite and exact RELEASE planner, then passed final `npm run release:ci` on the continuity-complete diff: 393 tests (389 pass, 4 explicit skip, 0 fail), lint, format, package selection, and a 43-file / 135,958-byte candidate with SHA-256 `c01513dd903ea3254284a1438ecd808d1defe469e1dd61cfa8e3cdacc322c632`.
- Reproduced the same candidate independently, rechecked public `0.1.4` absence and `latest=0.1.3`, verified unchanged publish-workflow blob `df24f26552697a286bdf0bd16017174cd23c20d8`, and received an independent no-blocker scope audit.

## Remaining

- None — repository implementation and evidence are complete; ordinary `STANDARD` delivery is the separate GitHub gate.

## Resume Point

- None — repository work is complete; continue only through ordinary `STANDARD` delivery, then freeze the exact candidate main SHA for publication preflight.

## Blockers

- None — `0.1.4` remains absent, the final local Release graph is green, and no active publication run exists.
