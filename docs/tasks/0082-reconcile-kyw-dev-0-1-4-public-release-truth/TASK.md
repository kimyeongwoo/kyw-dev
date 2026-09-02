# TASK 0082 — Reconcile kyw-dev 0.1.4 Public Release Truth

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Reconcile durable repository truth with the separately authorized and completed `kyw-dev@0.1.4` npm publication, exact-source `v0.1.4` tag, and GitHub Release while preserving Task 0081 and every external release object unchanged.

## Dependencies

- Task 0081.

## In Scope

- Read-only prove the one successful `0.1.4` OIDC publication, public registry identity and bytes, exact `gitHead`, signature, attestations, tag target, and GitHub Release state.
- Synchronize README and SPEC from unpublished-candidate wording to public `0.1.4`/`latest`, retained history, exact-source tag/Release, and no-public-plugin-submission truth.
- Update only the instruction-surface assertions that own those durable statements and current public install examples.
- Record exact permanent-document deltas, the initial verification failures, final scope and immutable Task 0081 checks, and proportionate Stable evidence.
- Close the evidence record with `NONE` delivery because the bounded documentation correction follows a direct ordinary action rather than a managed Task invocation; any GitHub synchronization remains a separate current-user-authorized action.

## Out of Scope

- Dispatching, rerunning, or replacing the completed npm workflow; another publish, dist-tag or package-version mutation; direct/token/fallback publication; or npm account/settings change.
- Creating, editing, replacing, or deleting `v0.1.4`, the GitHub Release, its notes, or any Release asset.
- Editing or reterminalizing Task 0081, changing package/plugin/workflow/foundation/runtime behavior, or creating another release candidate.
- Public plugin-directory submission, force/bypass/admin mutation, branch deletion, retry after external failure, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: Read-only evidence proves exactly one successful attempt-1 OIDC publication for source `8e5d1c43c69314e941e35e6835ae36a6cb40c981`, public `latest=0.1.4`, exact candidate bytes and `gitHead`, verified registry signature/attestation, and the exact-source tag and Release.
- [x] AC-02: README and SPEC identify `0.1.4` as current source/package/public `latest`, retain public versions `0.1.0` through `0.1.3` and the historical `0.1.2` limitation, link tag/Release to the published source, and keep public plugin submission absent.
- [x] AC-03: Current npm install examples and focused instruction assertions use `0.1.4`; package/plugin/workflow bytes and immutable Task 0081 remain unchanged.
- [x] AC-04: Exact changed-path planning, focused tests, final `npm run check`, permanent-document validation, pair/transaction validation, and final diff/coverage review pass with the initial failures retained.
- [x] AC-05: Delivery policy is explicitly `NONE`: this record closes the bounded ordinary correction without claiming a managed `STANDARD` ledger, while separately authorized GitHub synchronization is neither required nor credited as Task acceptance.

## Plan

- [x] Freeze the completed npm/GitHub release chronology and independently verify public bytes, metadata, supply-chain identity, tag, and Release.
- [x] Replace only current public-release truth and its direct instruction assertions.
- [x] Add exact current delta evidence, rerun the failed Stable graph after local-main alignment, and close scope/pair/transaction review.
- [x] Terminalize the pair with reasoned `NONE` delivery and leave separately authorized GitHub synchronization outside managed Task evidence.

## Decisions

- Treat npm publication, tag creation, and Release creation as completed external actions under the user's earlier direct authority. This Task records and reconciles their result; it does not authorize, repeat, repair, or mutate them.
- Compare the public tarball with Task 0081's frozen candidate at the publication source SHA, not with the later documentation-only reconciliation tree.
- Keep exact run IDs, hashes, timestamps, and Release identity in this pair; permanent docs retain only durable current behavior.
- Limit implementation paths to README, SPEC, the owning instruction test, and this pair; leave the managed continuity checkpoint unchanged because no `kyw-impl` route selected this ordinary correction.

## Risks

- A registry, tag, or Release recheck could expose drift; any mismatch blocks rather than mutating public state.
- Reusing Task 0081's terminal evidence would violate immutability; all later facts belong only here.
- Permanent-document validation requires a fresh exact delta marker even though the user-facing wording change is small.
- Shared local `main` can lag newly merged remote main and cause hydration tests to fail independently of product behavior.

## Discoveries and Changes

- Task 0081 delivered through PR #68: exact head `fdf5f42cd0867412f392584c18378cde57fdd53f`, 11/11 PR checks, merge `8e5d1c43c69314e941e35e6835ae36a6cb40c981`, and successful post-main run `33612900565`.
- Publish run `33613645977`, attempt 1, job `100194400260`, used `workflow_dispatch`, `main`, the exact merge SHA, Node `24.19.0`, npm `11.17.0`, and completed successfully after every identity/absence/checkout guard.
- Public npm now exposes only `latest=0.1.4`, versions `0.1.0` through `0.1.4`, exact `gitHead=8e5d1c43…`, GitHub Actions Trusted Publisher identity, one registry signature, and two causal attestations.
- The 135,958-byte, 43-file registry tarball has SHA-1 `9b3e2beda81b0ad81c9c72ea94b29520c83216dc` and SHA-256 `c01513dd903ea3254284a1438ecd808d1defe469e1dd61cfa8e3cdacc322c632`, exactly matching Task 0081's candidate.
- `npm audit signatures` under Node `24.11.0` / npm `11.18.0` verified one registry signature and one attestation from an isolated lifecycle-disabled install; the owned proof directory was moved to the Recycle Bin after direct recursive cleanup was unavailable.
- Lightweight tag `v0.1.4` points directly to the published source commit. Release `381124298` is non-draft, non-prerelease, targets that SHA, has no uploaded assets, and was published at `2026-09-02T09:27:44Z`.
- The first `npm run check` after the three-path truth edit produced 393 tests with 383 pass, four explicit skip, and six failures: four were the missing fresh permanent-document marker cascade; two observed stale local `main=14fcf534…` versus `origin/main=8e5d1c43…`. Local main was not checked out and was safely fast-forwarded after ancestry proof.

## Documentation Impact

- README: Replace candidate/public split and `0.1.3` install examples with verified public `0.1.4`, tag, Release, and retained-history truth.
- SPEC: Replace package-boundary and publication-state candidate facts with the verified public release state.
- ARCHITECTURE: Unchanged — publication components, flow, and trust boundaries did not change.
- AGENTS: Unchanged — direct authority, small-fix, Task, and delivery rules already govern this work.

## Delivery

- Requirement: NONE — this bounded post-release truth reconciliation follows a direct ordinary action and has no managed Task delivery gate.

## Completed

- Completed the separately authorized one-attempt npm publication plus exact-source tag and GitHub Release, then independently verified public metadata, bytes, signature, attestations, and GitHub identities.
- Updated only README, SPEC, and their instruction-surface assertions; focused instruction tests passed 12/12 and the exact planner selected Stable `npm run check`.
- Preserved the first full-check failure evidence and safely aligned the stale, unoccupied local main ref to exact `origin/main`.
- Added exact permanent-document delta evidence; foundation/distribution passed 26/26, the two affected hydration cases passed 2/2, and final `npm run check` passed 393 tests (389 pass, four explicit skip), lint for 81 modules, format for 366 files, and package selection for 43 files / 135,948 bytes.
- Rechecked one successful target publication and zero active runs, public `latest=0.1.4`, exact tag/Release state, immutable Task 0081 blobs, unchanged package/plugin/workflow identities, absent proof temp state, and the five-path repository scope.

## Remaining

- None — repository truth, verification, evidence, and reasoned delivery policy are complete; direct GitHub synchronization is a separate authorized action.

## Resume Point

- None — the local repository outcome is complete and can be synchronized to GitHub without treating that action as Task `STANDARD` evidence.

## Blockers

- None — the public release is exact and stable, all local verification is green, and the managed continuity checkpoint remains intentionally unchanged.
