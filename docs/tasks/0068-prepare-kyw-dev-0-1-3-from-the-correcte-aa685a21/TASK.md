# TASK 0068 — Prepare kyw-dev 0.1.3 from the Corrected Git Checkout Path

<!-- kyw-task-contract: 3 -->

## Status

IN_PROGRESS

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

- [x] Revalidate dependency delivery, exact main/workflow/tuple bytes, transaction state, registry history/latest, and `0.1.3` absence using only routine credential-free reads.
- [x] Update current version owners and assertions to `0.1.3` while preserving all historical release and Task evidence.
- [x] Synchronize candidate-versus-public documentation without changing durable architecture or AGENTS unless implementation meaning actually changes.
- [x] Run focused version/distribution/workflow/install/release and actual-npm fixture coverage, then stable and release gates without publication.
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
- Execution began on 2026-07-31 from clean, aligned `main` at `872ff827a630d6fb39d8ad04e6fdb8e27d6d29a0`; local `main`, cached `origin/main`, direct remote, and GitHub `main` all agree.
- The packaged dispatcher selected Task `0068` for `IMPLEMENT`, classified Task `0067` as fresh `HARDENED_EXACT_HEAD` evidence and Tasks `0030`–`0065` as durable continuity, and prepared one continuity advancement.
- Task `0067` is merged by PR `#55` from exact head `7384570b9db0436db005b6700f30350e5e1e0e1f`; its post-main CI run `30559009784`, attempt `1`, succeeds at exact merge SHA `872ff827a630d6fb39d8ad04e6fdb8e27d6d29a0`.
- Execution-time credential-free registry reads still list exactly `0.1.0`–`0.1.2`, keep `latest=0.1.2`, omit `0.1.2` `gitHead`, and return `E404` for `0.1.3`.
- The delivered workflow is identical in the worktree, `HEAD`, and `origin/main` at Git blob `117078f1c0fb87f12843ca77472a218b3f103e3c` and SHA-256 `a4b3d2cc30f514e021b01981833a2332e73e258f5c2f6e3b45d46950140bd6d8`.
- Task `0066` remains unchanged at SHA-256 `7bcb1d64417a25a2d1f88342806288a3dca8288d330a5a088cf922168664b9b7` for `TASK.md` and `5040e617ea3ef796f0bb91a899a9ff8f29e3426dca30f9f37ae830cbec1277c2` for `TEST.md`; Task transaction inspection is `NONE / NO_TRANSACTION_EVIDENCE`.
- After the branch and active pair validated, the dispatcher-provided continuity transition advanced the fixed checkpoint once to cover 36 prior Tasks at digest `bc9e222639800bf1cc2f3c03e463038be6f5f4a09eef3e4b7552508732fa836a`.
- The first 111-test focused run passed 106 and failed five: four candidate/foundation paths correctly rejected missing current permanent-document delta evidence, and one README projection required the retained `Exact historical...` sentence boundary.
- The first narrow foundation/instruction rerun passed 30/31 and showed that a current active delta marker must begin from the immediately prior terminal marker's after-values, not its earlier cumulative baseline.
- The corrected narrow foundation/instruction rerun passed 31/31, and the final focused release/version suite passed 111/111 including the real npm directory-positive/tarball-negative `gitHead` fixture.
- The exact changed-path planner selected `RELEASE`; current `0.1.3` owners/assertions and intentional public `0.1.2` projections are fully classified with no prior/future Task pair in the diff.
- Standalone Stable verification passed 395 tests with 392 passes and three explicit skips, linted 83 JavaScript modules, formatted 345 UTF-8/LF files, and selected 43 package files totaling 129,328 bytes.
- `release:ci` and its repeat inside `release:check` produced the same 43-file candidate at SHA-256 `40c510342755f6bd45c2aa27ed96ad4c60082e1d3b42d82d32fdb8aefa8dc966`.
- Release isolation was `CLEAN` on attempt `1`, preserved all three normal-state sentinels, removed its approved root, and passed direct plus isolated marketplace lifecycles for `0.1.3`.
- Credential-cleared `release:check` completed without publication and emitted dry-run metadata for `kyw-dev@0.1.3`: size `129328`, unpacked size `587422`, SHA-1 `43e5ac074d3a04b17e82bc2d5214c3ac4279e9cc`, and integrity `sha512-ZZe7TeemHb4tZfdnFklF76gqI99bOi6ElGmZ0fL4hv07vdoAyoxgoSIETdU3LveOYtRhQO6bkkAsfq94096o3g==`.

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

- Loaded and reconciled the repository rules, complete implementation procedure, selected Task/Test pair, hard-dependency Task `0067`, and targeted README/SPEC/ARCHITECTURE owner sections.
- Verified clean exact-main alignment, dependency PR/post-main delivery, workflow identity, Task `0066` immutability, valid Task pairs, and clean transaction state.
- Freshly confirmed public `latest=0.1.2` and unused `0.1.3` through credential-free public-registry reads.
- Executed the sole packaged dispatcher call, created the selected Task branch, and entered `IN_PROGRESS/RUNNING`.
- Applied the opaque continuity transition exactly once after active-pair validation.
- Updated package, plugin, foundation, CLI/installer/release assertions, README, and SPEC to the unpublished `0.1.3` candidate while preserving public `0.1.2` install/history truth.
- Added exact permanent-document delta evidence, retained both initial focused failure causes, and passed the corrected 31-test narrow and 111-test focused suites.
- Passed the four standalone Stable commands, `release:ci`, first-attempt clean isolation, and credential-cleared `release:check` dry-run without registry or workflow mutation.

## Remaining

- Commit the verified scoped state, then create, independently inspect, and clean one retained candidate from that clean committed checkout.
- Recheck public/excluded state, Task `0066` immutability, document deltas, final diff/matrix, pair, and transaction.
- Complete `STANDARD` delivery of the exact candidate source to `main`.

## Resume Point

- Review the scoped diff, commit the verified active state, require an empty committed-checkout status, and run the retained-candidate helper plus independent archive inspection.

## Blockers

- Not applicable — no current repository blocker is known; occupancy of `0.1.3` at execution would create a fail-closed blocker.
