# TASK 0069 — Publish and Prove kyw-dev 0.1.3 through npm OIDC

<!-- kyw-task-contract: 3 -->

## Status

DONE

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

- [x] AC-01: Immediately before dispatch, separate publication authority is explicit; exact candidate/main/workflow/tuple and target-absence preflight passes using public/repository/GitHub evidence with no npm account reauthentication.
- [x] AC-02: Exactly one `publish.yml` workflow_dispatch run exists for exact `0.1.3` main SHA, attempt `1`; no rerun, second dispatch, local publish, token, interactive auth, staged publish, or alternate dist-tag path occurs.
- [x] AC-03: The actual directory-publish job succeeds through GitHub Actions OIDC and is the canonical authentication proof; workflow logs/evidence identify the exact expected repository, workflow, environment, and source SHA.
- [x] AC-04: Public npm registry metadata for `0.1.3` contains `gitHead` exactly equal to the workflow checkout/main SHA, without a synthetic package field or registry post-processing.
- [x] AC-05: Downloaded public tarball bytes match the workflow candidate SHA-256; independent integrity and shasum calculations match registry metadata and package contents/identity remain exact.
- [x] AC-06: Registry signature and SLSA provenance verify and bind the expected GitHub repository/workflow/source identity and exact tarball subject digest.
- [x] AC-07: `latest=0.1.3`; versions `0.1.0` through `0.1.2` remain available and unchanged; no deprecation, independent dist-tag, tag, Release, or public submission mutation occurs.
- [x] AC-08: Any OIDC/publisher/publication/proof failure produces honest `BLOCKED/BLOCKED` evidence with no retry or repair mutation; account-side authentication is used only under separate explicit failure-investigation authority.
- [x] AC-09: README/SPEC publication truth, complete chronology, final matrix/diff, pair validation, transaction cleanliness, and `STANDARD` exact-SHA delivery are auditable without altering Task `0066`.

## Plan

- [x] Load dependency and immutable Task `0066` evidence; perform fresh credential-free exact-main/workflow/tuple/registry/run-history/tag/Release/transaction preflight.
- [x] Confirm separate explicit publication authority and freeze exact version `0.1.3`, main SHA, workflow bytes, expected tuple, and single-dispatch command.
- [x] Dispatch `publish.yml` once and observe run attempt `1` to a terminal state without rerun, second dispatch, token, direct publish, or interactive auth.
- [x] On success, capture exact workflow evidence and verify public version, `gitHead`, tarball bytes/digests, integrity, signature, SLSA provenance, `latest`, and preserved history.
- [x] On any failure, stop all mutation and record `BLOCKED/BLOCKED` with recovery requirements; the actual publication/proof path succeeded, while two local proof wrappers were rejected before execution and were recorded without repair mutation or publication retry.
- [x] Synchronize affected publication-state documents and Task/Test chronology, run final no-mutation/diff/coverage/pair/transaction checks, and complete only the evidence delivery allowed by the actual outcome.

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
- Execution began at `2026-07-31T00:02:33.0116057Z` from clean aligned `main` `caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0`; local `main`, cached `origin/main`, direct remote, and GitHub `main` agreed.
- The current user explicitly authorized exactly one `.github/workflows/publish.yml` dispatch for `0.1.3` at that exact main and exactly one workflow-contained `npm publish`, while expressly withholding rerun, second dispatch, direct/local publish, token fallback, npm account/settings reauthentication, dist-tag, tag, Release, submission, and other public mutation authority.
- Credential-free execution preflight at `2026-07-31T00:00:55.6988889Z` still listed only `0.1.0` through `0.1.2`, kept `latest=0.1.2`, returned HTTP `404` for `0.1.3`, found no deprecation, and found one completed historical publish run with zero active or exact-target runs.
- Exact package/plugin identity remains `0.1.3`; the active manual workflow remains ID `323508270`, Git blob `117078f1c0fb87f12843ca77472a218b3f103e3c`, SHA-256 `a4b3d2cc30f514e021b01981833a2332e73e258f5c2f6e3b45d46950140bd6d8`, and repository-owned tuple `GitHub Actions / kimyeongwoo/kyw-dev / publish.yml / npm-production`.
- The sole packaged dispatcher call selected Task `0069` for `IMPLEMENT`, retained Tasks `0030` through `0067` as durable continuity, freshly classified Task `0068` as `HARDENED_EXACT_HEAD`, and prepared one opaque continuity transition without retry or manual delivery input.
- After the branch and active pair validated, the dispatcher-provided continuity transition applied exactly once and advanced the fixed checkpoint through Task `0068` at digest `ffc574a5f32cd52f2ad8003ffee1dc00ea2d9b52638e880aaaea1a722526959e`.
- The immediate irreversible-action preflight passed at `2026-07-31T00:06:01.9466396Z`: all five main identities equaled `caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0`; package/plugin were `0.1.3`; workflow ID/blob/SHA-256 were exact; the 43-file candidate reproduced at 129,328 bytes and SHA-256 `40c510342755f6bd45c2aa27ed96ad4c60082e1d3b42d82d32fdb8aefa8dc966`; registry state remained `0.1.0`–`0.1.2`, `latest=0.1.2`, target HTTP `404`; and active/target runs, tags, and Releases were zero.
- Exactly one authorized `gh workflow run publish.yml --repo kimyeongwoo/kyw-dev --ref main -f expected_sha=caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0 -f expected_version=0.1.3` began at `2026-07-31T00:06:01.9603091Z`, exited zero at `2026-07-31T00:06:04.1541257Z`, and returned run `30592539397`.
- Read-only resolution found exactly one matching run: `30592539397`, `workflow_dispatch`, branch `main`, exact head SHA, attempt `1`, created `2026-07-31T00:06:03Z`; its initial state was `queued`.
- Run `30592539397` completed successfully at `2026-07-31T00:06:49Z`. Its sole job `91037762487`, `Publish exact npm candidate`, and every dispatch, checkout, runtime, Stable gate, candidate, registry-absence, exact-checkout, OIDC directory-publish, and cleanup step succeeded.
- Bounded extraction from the 1,027-line run log retained only the four actual `KYWPUBLISHEVIDENCE` records and publication markers: exact dispatch/source SHA `caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0`, Node `24.18.0`, npm `11.16.0`, exact 43-file / 129,328-byte candidate and digests, registry target status `404`, `latest` publication, and `+ kyw-dev@0.1.3`.
- Cache-bypassed canonical registry reads at `2026-07-31T00:07:37.3436566Z` list `0.1.0` through `0.1.3`, set only `latest=0.1.3`, expose exact `gitHead` in both root and version metadata, identify `_npmUser` as GitHub Actions with npm's GitHub trusted-publisher marker, and retain the expected repository, maintainer, one registry signature, integrity, shasum, file count, unpacked size, and attestation URL.
- The public tarball was verified without filesystem residue at `2026-07-31T00:09:44.402Z`: 129,328 bytes, exact SHA-1 `43e5ac074d3a04b17e82bc2d5214c3ac4279e9cc`, SHA-256 `40c510342755f6bd45c2aa27ed96ad4c60082e1d3b42d82d32fdb8aefa8dc966`, SHA-512/integrity, 43 safe regular entries, exact package/plugin `0.1.3`, no dependencies or publication lifecycle, and byte-identical package, plugin, README, legal, notice, and CLI files.
- Two earlier PowerShell public-byte wrappers were rejected by local command policy before execution because they contained recursive cleanup; neither created a temporary path or file. The successful replacement downloaded and parsed the tarball entirely in memory and required no cleanup mutation.
- Public npm reports current CLI `12.0.2`, whose Node engine excludes local Node `24.11.0`. An isolated proof used official Node `24.18.0` after matching its official archive SHA-256 `0ae68406b42d7725661da979b1403ec9926da205c6770827f33aac9d8f26e821`, exact npm `12.0.2`, disabled lifecycle scripts, and fresh unauthenticated state; `npm audit signatures` verified one registry signature and one attestation with no warning or stderr.
- The attestation endpoint returned exactly one npm publish statement and one SLSA provenance v1 statement. Both bind `pkg:npm/kyw-dev@0.1.3` to exact SHA-512 `6597bb4de7a61dbe2d65f767164945efa82a23df5b3a2e84946999d1f2f886fd3bbdda00ca8c60a122044dd5372ef78e62d46140ee9b92402c7eaf78d3dea8de`; provenance binds the public repository, `.github/workflows/publish.yml`, `refs/heads/main`, exact source commit, `workflow_dispatch`, GitHub-hosted builder, and run/attempt `30592539397/1`.
- Post-publication reads find exactly two historical publish runs total, exactly one at the `0.1.3` SHA, both attempt `1` and successful, with zero active runs, zero remote tags, and zero GitHub Releases. Public `0.1.2` integrity/shasum and missing historical `gitHead` remain unchanged.
- README and SPEC now identify public `0.1.3`/`latest`, exact-checkout `gitHead`, signature/provenance, retained `0.1.2` history, and `0.1.3` install commands. Their exact current deltas are README +104 bytes, SPEC +10 bytes, AGENTS/ARCHITECTURE unchanged, and combined +114 bytes from the Task `0068` terminal baseline.
- The changed-path verification planner selected `STABLE`; the final 57-test publication/distribution/foundation/instruction/release-evidence suite passed without a failure or retry.
- `npm run check` passed all Stable gates: 395 tests with 392 passes and three explicit skips, lint over 83 JavaScript modules, format validation over 345 files, and package selection of 43 files totaling 129,361 bytes after the publication-truth README edit.
- The final cache-bypassed external snapshot at `2026-07-31T00:20:11.9707918Z` still exposes only `latest=0.1.3`, exact target metadata/digests/signature/attestation/Trusted Publisher identity, unchanged prior `0.1.2` distribution fields, exactly one successful target run at attempt `1`, zero active runs, zero tags, and zero Releases; remote/GitHub `main` remains the frozen publication SHA.
- Final repository scope is exactly README, SPEC, the deterministic instruction projection, this Task/Test pair, and the dispatcher-owned continuity advancement. Task `0066` retains its exact hashes, no Task transaction or temporary publication evidence remains, the permanent-document measurements match the active delta table, and `git diff --check` passes.

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

- Loaded and reconciled the repository rules, complete implementation procedure, selected Task/Test pair, Task `0068` dependency, immutable Task `0066` evidence, and targeted README/SPEC/ARCHITECTURE owner sections.
- Validated the selected/dependency pairs, immutable Task `0066` hashes, clean transaction state, clean worktree, and exact local/cached/direct/GitHub `main` alignment.
- Freshly confirmed package/plugin `0.1.3`, exact workflow bytes and tuple, public `latest=0.1.2`, unused `0.1.3`, no active publication, and no tag or Release without npm account authentication.
- Recorded the user's narrow one-dispatch/one-publish authority, executed the sole packaged dispatcher call, created the selected Task branch, and entered `IN_PROGRESS/RUNNING`.
- Applied the opaque Task `0068` continuity transition exactly once after active-pair validation.
- Reproduced and safely cleaned the exact candidate, repeated the complete immediate external preflight, and issued the sole authorized dispatch for exact `0.1.3` main.
- Resolved run `30592539397` without ambiguity as the sole exact event/branch/SHA run at attempt `1`.
- Observed the sole run and job to successful terminal status and retained only bounded exact workflow evidence.
- Proved canonical registry `gitHead`, OIDC publisher identity, public history/`latest`, tarball byte/digest/content parity, registry signature, and exact npm publish plus SLSA provenance statements without authentication or external repair.
- Synchronized README, SPEC, and the deterministic instruction projection to verified public `0.1.3` truth while leaving AGENTS and ARCHITECTURE byte-stable.
- Passed the changed-path planner, 57-test focused suite, and complete Stable gate.
- Rechecked final public state, workflow history, tags/Releases, remote main, immutable Task `0066` hashes, six-path scope, permanent-document measurements, pair validity, clean transaction state, temporary-state absence, and whitespace integrity.
- Entered `DONE/PASSED`; repository acceptance is complete and `STANDARD` remains the separate exact-SHA GitHub delivery gate.
- Re-ran the complete Stable gate after terminalization and retained the same 395/392/3/0, 83-module, 345-file, and 43-file / 129,361-byte boundaries.

## Remaining

- None — repository outcome complete; external `STANDARD` delivery remains the separate queue gate.

## Resume Point

- None — repository outcome complete; continue only through the declared `STANDARD` delivery gate.

## Blockers

- Not applicable — the authorized publication and all required proof succeeded without retry; no current repository blocker is known.
