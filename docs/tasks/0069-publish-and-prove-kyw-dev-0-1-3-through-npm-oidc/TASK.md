# TASK 0069 — Publish and Prove kyw-dev 0.1.3 through npm OIDC

<!-- kyw-task-contract: 3 -->

## Status

READY

## Goal

Under separate explicit publication authority, dispatch exactly one exact-main GitHub Actions OIDC publication for `kyw-dev@0.1.3` and prove its registry `gitHead`, tarball bytes, integrity, signature, SLSA provenance, and `latest` state without npm account reauthentication, retry, credential fallback, tag, or Release mutation.

## Dependencies

- Task 0068.

## In Scope

- Require separate explicit authority for the public registry mutation before dispatch; authoring and ordinary Task selection alone do not publish.
- Freshly validate exact delivered candidate/main/workflow bytes, repository-owned expected Trusted Publisher tuple, public versions/`latest`, target absence, workflow history, clean transaction state, and absence of concurrent publication without authenticated npm account/settings inspection.
- Dispatch `.github/workflows/publish.yml` exactly once for version `0.1.3` at the exact candidate main SHA and observe only run attempt `1`; do not rerun or issue a second dispatch.
- Treat successful completion of the actual directory-based publish job as canonical proof that npm accepted the GitHub Actions OIDC Trusted Publisher identity.
- Capture workflow-side exact checkout commit and candidate metadata, then query/download public registry artifacts read-only and prove registry `gitHead` equals that commit.
- Prove public tarball bytes and SHA-256 match the workflow candidate, `dist.integrity` and shasum match independently computed bytes, the registry signature verifies, and the SLSA provenance binds the exact repository/workflow/source identity and subject digest.
- Prove `latest=0.1.3`, preserve availability/history for `0.1.0` through `0.1.2`, and record one bounded publication chronology with no deprecation or alternate dist-tag.
- If OIDC, publisher tuple, exact-main/version gate, publish, signature, provenance, `gitHead`, or byte proof fails, record `BLOCKED/BLOCKED` without automatic retry, second dispatch, token fallback, direct publish, or state-repair mutation; account-side authentication may be requested only as an explicitly authorized failure investigation.
- Synchronize publication-state README/SPEC truth and complete evidence/diff/pair/transaction checks plus `STANDARD` delivery without creating a Git tag, GitHub Release, or public plugin submission.

## Out of Scope

- Any publication without separate explicit authority, any version other than exact `0.1.3`, or a second attempt after the authorized dispatch.
- `npm login`, OTP, security-key authentication, authenticated `npm trust list`, or npm account/settings inspection during a healthy normal release.
- Long-lived npm tokens, `NPM_TOKEN`, local/direct public `npm publish`, tarball-input publication, automatic retry, alternate workflow, staged publish, or fallback dist-tag.
- Republishing, unpublishing, deprecating, retagging, or otherwise repairing `0.1.2`; editing or reterminalizing Task `0066`.
- Adding synthetic `gitHead` package metadata or changing registry metadata after publication.
- Creating a Git tag, GitHub Release, public plugin submission, another version, account configuration change, or unrelated cleanup.

## Acceptance Criteria

- [ ] AC-01: Immediately before dispatch, separate publication authority is explicit; exact candidate/main/workflow/tuple and target-absence preflight passes using public/repository/GitHub evidence with no npm account reauthentication.
- [ ] AC-02: Exactly one `publish.yml` workflow_dispatch run exists for exact `0.1.3` main SHA, attempt `1`; no rerun, second dispatch, local publish, token, interactive auth, staged publish, or alternate dist-tag path occurs.
- [ ] AC-03: The actual directory-publish job succeeds through GitHub Actions OIDC and is the canonical authentication proof; workflow logs/evidence identify the exact expected repository, workflow, environment, and source SHA.
- [ ] AC-04: Public npm registry metadata for `0.1.3` contains `gitHead` exactly equal to the workflow checkout/main SHA, without a synthetic package field or registry post-processing.
- [ ] AC-05: Downloaded public tarball bytes match the workflow candidate SHA-256; independent integrity and shasum calculations match registry metadata and package contents/identity remain exact.
- [ ] AC-06: Registry signature and SLSA provenance verify and bind the expected GitHub repository/workflow/source identity and exact tarball subject digest.
- [ ] AC-07: `latest=0.1.3`; versions `0.1.0` through `0.1.2` remain available and unchanged; no deprecation, independent dist-tag, tag, Release, or public submission mutation occurs.
- [ ] AC-08: Any OIDC/publisher/publication/proof failure produces honest `BLOCKED/BLOCKED` evidence with no retry or repair mutation; account-side authentication is used only under separate explicit failure-investigation authority.
- [ ] AC-09: README/SPEC publication truth, complete chronology, final matrix/diff, pair validation, transaction cleanliness, and `STANDARD` exact-SHA delivery are auditable without altering Task `0066`.

## Plan

- [ ] Load dependency and immutable Task `0066` evidence; perform fresh credential-free exact-main/workflow/tuple/registry/run-history/tag/Release/transaction preflight.
- [ ] Confirm separate explicit publication authority and freeze exact version `0.1.3`, main SHA, workflow bytes, expected tuple, and single-dispatch command.
- [ ] Dispatch `publish.yml` once and observe run attempt `1` to a terminal state without rerun, second dispatch, token, direct publish, or interactive auth.
- [ ] On success, capture exact workflow evidence and verify public version, `gitHead`, tarball bytes/digests, integrity, signature, SLSA provenance, `latest`, and preserved history.
- [ ] On any failure, stop all mutation and record `BLOCKED/BLOCKED` with recovery requirements; do not repair or retry within this Task.
- [ ] Synchronize affected publication-state documents and Task/Test chronology, run final no-mutation/diff/coverage/pair/transaction checks, and complete only the evidence delivery allowed by the actual outcome.

## Decisions

- Exact version is `0.1.3`, chosen from the authoring-time fresh registry where `0.1.2` is `latest` and `0.1.3` is absent. Any changed occupancy before dispatch blocks this contract.
- A separate publication Task is necessary because public npm mutation has a distinct authority boundary and can only run after the exact candidate is evaluator-complete on `main`.
- Healthy release preflight does not authenticate to npm account surfaces. Static expected tuple plus delivered workflow bytes establish expected configuration; successful npm OIDC acceptance establishes runtime identity.
- One failed run is terminal for this Task. Retrying, dispatching again, falling back to credentials, or directly publishing would create a new mutation decision and requires a new explicit contract/authority.
- `gitHead` must be npm-derived from the real checkout directory and equal the exact workflow SHA; neither package-field fabrication nor registry repair is admissible.
- Task `0066` remains `BLOCKED/BLOCKED` historical evidence even if `0.1.3` later succeeds.

## Risks

- The target can become occupied or main/workflow bytes can move before dispatch; either change invalidates the frozen preflight and must block.
- Publication is irreversible; post-publication proof can discover a defect that cannot be repaired in place.
- OIDC can succeed while a later proof fails; the Task must preserve both facts and remain blocked rather than retrying.
- Registry replication can delay read-only proof; bounded observation may continue, but no second publication or state mutation is allowed.
- Provenance/signature or tarball comparison can be misread if evidence comes from a different run/SHA; every artifact must be causally tied to the one dispatch.

## Discoveries and Changes

- Authoring-time registry state lists `0.1.0`, `0.1.1`, and `0.1.2`, keeps `latest=0.1.2`, and returns `E404` for `0.1.3`.
- The only existing publication workflow run is Task `0066` run `30530304990`, exact main SHA `60b3270e679bb9794de8c1fd40be3286cfd73dda`, workflow_dispatch, attempt `1`, success; it must not be rerun.
- Task `0066` proves that successful OIDC, tarball, signature, and provenance do not by themselves satisfy a contract requiring `gitHead`; its immutable `BLOCKED/BLOCKED` chronology remains the recovery baseline.
- This Task deliberately waits for the corrected workflow and exact `0.1.3` candidate dependencies and receives no publication authority from this authoring invocation.

## Documentation Impact

- SPEC: Change public registry/current-version truth to `0.1.3` only after verified success; otherwise preserve candidate/public facts and record the blocker.
- ARCHITECTURE: Expected unchanged if the dependency's OIDC directory-publish flow works as designed; edit only for a newly discovered durable boundary.
- README: Change installation/release status to public `0.1.3` only after complete registry proof; retain honest failure wording otherwise.
- AGENTS: Unchanged — external mutation authority, immutable evidence, serial execution, and blocked recovery rules do not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.
- External publication authority: required separately and not granted by Task authoring; absent authority permits read-only preflight only and forbids dispatch.

## Completed

- Not applicable — implementation and publication have not started.

## Remaining

- Wait for the hard dependency to become evaluator-complete.
- Obtain separate explicit publication authority, then execute and prove exactly one OIDC publication or record the first failure honestly.
- Deliver the resulting Task/Test evidence without changing Task `0066`.

## Resume Point

- After dependency completion, start with a fresh credential-free registry/GitHub/main/workflow preflight; stop before dispatch unless separate explicit publication authority is present.

## Blockers

- Public mutation authority is intentionally absent from this authoring invocation. This does not prevent read-only preflight, but execution must stop before dispatch until the user grants separate explicit authority.
