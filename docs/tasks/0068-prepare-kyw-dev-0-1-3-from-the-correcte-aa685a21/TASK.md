# TASK 0068 — Prepare kyw-dev 0.1.3 from the Corrected Git Checkout Path

<!-- kyw-task-contract: 3 -->

## Status

READY

## Goal

Prepare and deliver the exact next patch candidate, `kyw-dev@0.1.3`, from the corrected real-Git-checkout release path on exact `main`, with auditable candidate bytes and no npm account reauthentication, workflow dispatch, or public registry mutation.

## Dependencies

- Task 0067.

## In Scope

- Revalidate the corrected predecessor as evaluator-complete on exact `main`, including the repository-owned Trusted Publisher tuple, delivered workflow bytes, directory-publish path, actual-npm `gitHead` fixture, and fail-closed tests.
- Freshly query public npm versions and `latest`; require `0.1.3` to remain unused immediately before version edits and terminalization, and block instead of silently renumbering if that fact changes.
- Update package, plugin, CLI/current-version, installer, release metadata, documentation, and current non-historical assertions from `0.1.2` to `0.1.3` while preserving immutable `0.1.2` and Task `0066` history.
- Keep repository and packed documentation explicit that `0.1.3` is an unpublished candidate while public `latest` remains `0.1.2`.
- Build and inspect the exact directory candidate from a real committed Git checkout using the corrected release path; record exact source commit, filename, sizes, file count, allowlist, SHA-256, integrity, shasum, manifest/plugin parity, dependency/lifecycle absence, and cleanup.
- Run the actual-npm fixture and focused version, distribution, installation, foundation, instruction, workflow, and release-harness coverage, then all stable and release candidate/dry-run/isolation gates.
- Perform routine preflight only from public registry/GitHub data and repository-owned tuple/workflow bytes; do not authenticate to npm account/settings surfaces.
- Complete diff/document/pair/transaction validation and `STANDARD` delivery so the exact `0.1.3` source commit is on `main` before any public dispatch is eligible.

## Out of Scope

- Dispatching or rerunning `publish.yml`, invoking public-registry `npm publish`, publishing or staging `0.1.3`, or changing any dist-tag.
- Reauthenticating with `npm login`, OTP, security key, authenticated `npm trust list`, or npm account/settings UI during normal preflight.
- Republishing, unpublishing, deprecating, or otherwise mutating `0.1.2`; editing or reterminalizing Task `0066`.
- Changing the corrected workflow/contract except for a newly discovered blocker that requires a separate explicit Task.
- Creating a Git tag, GitHub Release, public plugin submission, another version, production dependency, lockfile, or lifecycle hook.
- Treating local packing, dry-run, or fixture success as proof that production OIDC authentication or public publication occurred.

## Acceptance Criteria

- [ ] AC-01: Read-only preflight proves the corrected predecessor is evaluator-complete on exact `main`, its tuple/workflow/directory-publish contract is intact, public `latest=0.1.2`, and `0.1.3` is unused without authenticating to npm account surfaces.
- [ ] AC-02: Every current package/plugin/CLI/foundation/installer/release identity owner and non-historical assertion agrees on `0.1.3`, while `0.1.0` through `0.1.2` and Task `0066` history remain unchanged.
- [ ] AC-03: README and SPEC distinguish the unpublished `0.1.3` candidate from public `latest=0.1.2` and make no publication, OIDC-success, provenance, tag, Release, or submission claim for `0.1.3`.
- [ ] AC-04: One exact candidate from a real committed Git checkout passes allowlist, manifest/plugin parity, legal/README/CLI, dependency/lifecycle, exclusion, size, inventory, and digest checks, and is safely cleaned after evidence capture.
- [ ] AC-05: The actual-npm fixture still proves directory publication derives exact `gitHead` and tarball-input publication does not, with no synthetic package field or registry rewrite.
- [ ] AC-06: Focused, stable, release CI, one-attempt clean isolation, public-registry dry-run, and final candidate checks pass without workflow or registry mutation.
- [ ] AC-07: Final registry/workflow/tag/Release/account-auth no-mutation proof, prior-pair immutability, diff/coverage, document ownership, pair validation, and clean transaction state are auditable.
- [ ] AC-08: `STANDARD` delivery puts the exact `0.1.3` source and corrected workflow bytes on `main` with hardened exact-SHA evidence before the publication Task can execute.

## Plan

- [ ] Revalidate dependency delivery, exact main/workflow/tuple bytes, transaction state, registry history/latest, and `0.1.3` absence using only routine credential-free reads.
- [ ] Update current version owners and assertions to `0.1.3` while preserving all historical release and Task evidence.
- [ ] Synchronize candidate-versus-public documentation without changing durable architecture or AGENTS unless implementation meaning actually changes.
- [ ] Run focused version/distribution/workflow/install/release and actual-npm fixture coverage, then stable and release gates without publication.
- [ ] Produce and inspect one exact candidate from the committed Git checkout, retain bounded metadata evidence, and safely remove only Task-owned temporary state.
- [ ] Recheck target absence and excluded external state, compare final diff to the matrix, validate pair/transaction/immutability, and complete `STANDARD` exact-SHA delivery.

## Decisions

- Use exact patch version `0.1.3`: authoring observed public `0.1.0`, `0.1.1`, and `0.1.2`, `latest=0.1.2`, and `E404` for `0.1.3`. Execution blocks and requires a new explicit contract if `0.1.3` becomes occupied.
- Keep candidate preparation separate from public publication so the publication Task can hard-depend on one exact delivered source SHA and receive separate mutation authority.
- Reuse the corrected directory-publish contract and actual-npm fixture; do not add `gitHead` to `package.json`, publish a retained tarball, or infer production authentication from local tests.
- Routine release preflight validates repository-owned expected configuration and delivered workflow bytes only. Account-side reauthentication is not a candidate gate.
- Keep delivery `STANDARD`; local success cannot make an undelivered candidate eligible for publication.

## Risks

- `0.1.3` may become occupied after authoring; immutable npm versions make silent renumbering unsafe.
- Current-version edits can corrupt historical `0.1.2` evidence or leave an owner projection stale.
- Candidate bytes can drift after inspection; final package-input review and exact-main delivery must follow all source-affecting changes.
- Git metadata may be absent in a copied or archived workspace; all candidate/fixture proof must run from a real committed checkout.
- Dry-run and loopback results do not prove npm OIDC acceptance and must not be reported as publication evidence.

## Discoveries and Changes

- Authoring-time public registry state is exactly `0.1.0`, `0.1.1`, and `0.1.2`, with `latest=0.1.2`; `kyw-dev@0.1.3` returns `E404`, so `0.1.3` is the next unused patch at authoring.
- Task `0066` remains immutable `BLOCKED/BLOCKED` because public `0.1.2` lacks required registry `gitHead`; its successful tarball, signature, and provenance evidence remains valid and must be preserved.
- This Task is intentionally downstream of the workflow/contract correction so candidate truth cannot outrun the real-Git directory-publish guarantee.

## Documentation Impact

- SPEC: Update current candidate identity to `0.1.3` while keeping public registry truth at `0.1.2`; durable corrected auth/publish behavior should remain unchanged.
- ARCHITECTURE: Expected unchanged — the dependency owns the durable directory-publish and OIDC flow; edit only if implementation exposes a new stable boundary.
- README: State that repository/package metadata is the unpublished `0.1.3` candidate while installation/public `latest` remains `0.1.2`.
- AGENTS: Unchanged — repository-wide routing, authority, delivery, and immutability rules do not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.
- External publication authority: none — public registry and workflow-dispatch mutation are prohibited in this Task.

## Completed

- Not applicable — implementation has not started.

## Remaining

- Implement and verify the `0.1.3` candidate outcome.
- Deliver the exact candidate source to `main`.

## Resume Point

- Begin with credential-free validation of the corrected dependency and fresh public-registry confirmation that `0.1.3` is still unused.

## Blockers

- Not applicable — no current repository blocker is known; occupancy of `0.1.3` at execution would create a fail-closed blocker.
