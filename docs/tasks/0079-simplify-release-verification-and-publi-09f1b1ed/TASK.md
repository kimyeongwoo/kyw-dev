# TASK 0079 — Simplify Release Verification and Publication Gates

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Replace the overbuilt release-evidence runner, harness, isolation, and mandatory registry-dry-run layers with one small release verification contract: required local verification is `npm run check`, one real-tarball `npm run release:candidate`, and `npm run release:ci`; hosted verification remains credential-free exact-SHA CI; `release:check` remains only an optional thin standard npm dry-run command; and the existing manual exact-main OIDC workflow retains fail-closed identity/version guards, target-version absence, and exactly one directory publish.

## Dependencies

- Task 0052.
- Task 0067.
- Task 0077.

## In Scope

- Preserve Task 0078 `BLOCKED/BLOCKED` Task/Test bytes and its retained external failure evidence exactly; do not rerun, replace, clean, reinterpret, or promote the consumed failed attempt.
- Remove `scripts/release-evidence-manual-runner.mjs`, `scripts/release-evidence-harness.mjs`, and `scripts/release-gate-isolation.mjs`, their three dedicated test files, and all active imports, command wiring, planner entries, and permanent-document guidance for those layers.
- Remove the isolation-only fixture/helpers and release-evidence assertions embedded in shared distribution, CI, foundation, instruction-surface, workflow, and planner tests while retaining the simpler package, installation, CI, and publication invariants they also own.
- Keep `npm run check`, `npm run release:candidate`, and `npm run release:ci` as the complete required local release-verification graph, with `release:candidate` creating and inspecting a real tarball and `release:ci` remaining exactly Stable plus candidate.
- Keep `release:check` in `package.json` as the optional thin maintainer alias `npm publish --dry-run --json`; it must not chain `release:ci`, become a required gate, appear in planner output, or run in credential-free CI or the publication workflow.
- Remove `release.isolation`, `release.registry-dry-run`, deleted-path classifications, and mandatory dry-run wording from the verification planner and its tests while preserving Release classification and `npm run release:ci` selection for release-sensitive changes and explicit candidate intent.
- Preserve `.github/workflows/ci.yml` as credential-free exact-SHA PR, main, and manual CI with its behavioral matrix, quality, real-candidate, merge-compatibility, and required aggregate roles.
- Simplify `.github/workflows/publish.yml` by removing its Stable rerun, retained-candidate creation/validation/cleanup, dry-run, isolation, and evidence-harness layers while retaining manual-only dispatch, the repository-owned publisher tuple, exact current `main` SHA/version and checkout guards, job-scoped OIDC permissions, a fail-closed public-registry version-absence check, a final clean exact checkout check, and exactly one `npm publish .` command.
- Preserve the exact tarball file inventory and every packaged CLI/runtime, plugin metadata, five-Skill, template, and legal/notice/license byte except the explicitly allowed README verification-documentation changes and necessary development-only `package.json` script metadata change.
- Keep package/plugin identity and version, `files` selection, public registry metadata, dependency and devDependency absence, lockfile and repository `.npmrc` absence, and installation/publication lifecycle-script absence unchanged.
- Synchronize README, SPEC, and ARCHITECTURE with the simplified required verification and publication boundaries; keep AGENTS unchanged.

## Out of Scope

- Dispatching or rerunning `publish.yml`, executing an actual public publish, changing a registry version or dist-tag, creating a Git tag or GitHub Release, or making a public plugin submission.
- Treating the optional `release:check` dry run as acceptance evidence, publication authority, a required preflight, or a substitute for a real candidate or exact-SHA CI.
- Deleting or weakening `release:candidate`, `release:ci`, `packed-release-check.mjs`, real-tarball inspection, package hygiene, hosted exact-SHA CI, or required `STANDARD` delivery evidence.
- Editing Task 0078 or any other historical Task/Test pair, deleting its external attempt/state/evidence roots, rerunning its consumed command, or relabeling its 451-pass / 26-fail / 6-skip result.
- Changing packaged runtime, CLI, plugin, Skill, template, legal, license, or notice behavior/bytes; changing the tarball inventory; adding dependencies, devDependencies, a lockfile, `.npmrc`, or any npm lifecycle script.
- A package version bump, publication candidate preparation for a new version, public-byte post-publication proof, account authentication/configuration audit, or Trusted Publisher account change.
- A generic sandbox, filesystem/process isolation framework, release evidence store, retry engine, alternate publication workflow, or unrelated test cleanup.

## Acceptance Criteria

- [x] AC-01: Task 0078 remains `BLOCKED/BLOCKED` with TASK SHA-256 `419a504fb81169e31117332112dac8a181628093e193630669229ffa49a1c72e` and TEST SHA-256 `ae8b2d90b31c69454dea5cdc00a7163927bafa234f32198994466152946f1227`; its retained failed attempt is neither rerun, removed, rewritten, nor credited as success.
- [x] AC-02: The three release runner/harness/isolation scripts and their three dedicated tests are absent, shared tests contain no imports or executable coupling to them, and active source, configuration, planner, workflow, README, SPEC, and ARCHITECTURE contain no stale layer reference; historical Task/Test evidence remains exempt and unchanged.
- [x] AC-03: Required local verification consists only of unchanged `npm run check`, real-tarball `npm run release:candidate`, and unchanged `npm run release:ci`; `release:check` exists only as `npm publish --dry-run --json` and is not invoked or described as mandatory by any required gate, planner result, CI job, or publish job.
- [x] AC-04: Release-sensitive paths and explicit candidate intent still produce a Release plan containing exactly `npm run release:ci`, while planner registries, help/tests, and release-sensitive path ownership contain no isolation, runner, harness, or registry-dry-run command layer.
- [x] AC-05: Credential-free CI retains exact PR-head, synthetic merge, and post-merge main identities plus its supported runtime/OS behavioral lanes, quality job, one actual packed-candidate job, and aggregate required result, with no credential, account, publish, dry-run, runner, harness, or isolation command.
- [x] AC-06: The manual `publish.yml` workflow fails closed unless repository, manual event, `refs/heads/main`, literal expected SHA, actual checkout SHA, expected package/plugin version, runtime, registry identity, clean checkout, and target-version 404 absence all match; only its single publishing job has `contents: read` and `id-token: write`, and it contains exactly one non-retried `npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/` with no Stable rerun, retained candidate, cleanup, dry-run, token, login, fallback, tarball publish, dist-tag, tag, Release, or second dispatch path.
- [x] AC-07: A fresh actual `release:candidate` preserves the existing 43-file tarball inventory and package hygiene, and exact comparison proves all packaged CLI/runtime, plugin metadata, five-Skill, template, legal, license, and notice bytes remain unchanged; only README verification prose and the narrowly required development-only `package.json` script metadata may differ.
- [x] AC-08: Package/plugin name and version, `files` allowlist, public registry metadata, dependency/devDependency/lockfile/`.npmrc` absence, and forbidden installation/publication lifecycle-script absence remain unchanged; no removed development-only release layer enters package bytes.
- [x] AC-09: Focused release/workflow/distribution/planner/document tests, `npm run check`, an independent `npm run release:candidate`, `npm run release:ci`, final diff/matrix and permanent-document review, pair/transaction validation, and `STANDARD` exact-SHA hosted delivery evidence all pass without running optional `release:check` or dispatching publication.

## Plan

- [x] Capture the pre-implementation Task 0078 hashes, external-evidence preservation boundary, package inventory/selected-byte baseline, required command graph, planner output, CI topology, and publish-workflow guards.
- [x] Delete the three development-only release layers and dedicated tests, then remove their imports, shared fixtures, active references, and obsolete planner classifications without weakening retained package or CI coverage.
- [x] Normalize `release:check` to the optional thin npm dry-run alias, keep `check`/`release:candidate`/`release:ci` exact, and update deterministic foundation, distribution, CI, and planner assertions around the new required/optional boundary.
- [x] Narrow the manual exact-main OIDC workflow and mutation tests to identity/checkout/version/absence guards plus one directory publish, removing Stable/candidate/cleanup/dry-run duplication and rejecting every automatic, credential, retry, fallback, or second-publish mutation.
- [x] Replace obsolete README, SPEC, and ARCHITECTURE release guidance in place, record the allowed packaged-content delta, and keep AGENTS and unaffected product/package bytes unchanged.
- [x] Run focused, Stable, real-candidate, composite Release, planner, package-invariant, pair/transaction, whitespace, final-coverage, and exact-SHA hosted delivery checks; record only executed evidence and never invoke the optional dry run or publication workflow.

## Decisions

- Use one Task because layer retirement, command-graph simplification, workflow narrowing, tests, and durable documentation form one independently verifiable release-boundary outcome.
- Hard-depend on Task 0052 as the retained harness baseline, Task 0067 as the delivered exact-main OIDC directory-publish baseline being narrowed, and Task 0077 as the satisfied Windows full-suite prerequisite carried forward from Task 0078.
- Task 0078 is immutable causal failure evidence, not a hard dependency: a blocked pair cannot satisfy queue selection, so this Task preserves its bytes and facts while depending only on satisfied predecessors.
- `release:check` remains available but becomes a thin optional alias for the standard `npm publish --dry-run --json`; it does not rerun `release:ci`, participate in planning, or establish publication readiness or authority.
- The required release graph is `check` for Stable, `release:candidate` for one actual inspected archive, `release:ci` for their composition, and credential-free exact-SHA CI for hosted delivery evidence.
- The publication workflow keeps only the identity and safety preconditions intrinsic to the existing manual exact-main OIDC surface, the fail-closed version-absence decision, final clean checkout confirmation, and one directory publish; it does not duplicate verification already owned by required CI/candidate gates.
- Packaged-content change is limited to README verification documentation and the exact development-only `package.json` script metadata needed for the optional dry-run alias. Tarball inventory and every other packaged byte remain fixed, with dependency and lifecycle absence preserved.
- No command in this Task authorizes registry mutation; publication workflow execution remains a separate explicit user authority boundary.

## Risks

- Removing large defensive layers can leave stale imports, documentation, planner identities, or test assumptions that fail only on another platform; repository-wide active-reference scans and full CI coverage must close that gap.
- A merely renamed or dormant dry-run dependency could remain effectively mandatory; tests must prove absence from planner results, CI, publish workflow, and required-gate documentation rather than checking only command names.
- Narrowing the publish workflow can accidentally weaken exact-main, version, registry-absence, OIDC, clean-checkout, or one-publish guards; mutation tests must fail for every removed guard and every retry, credential, tarball, or automatic-trigger path.
- README and package script metadata change packed bytes even though runtime does not change; inventory and selected-byte comparisons must distinguish the two allowed files from any unauthorized packaged delta.
- Removing isolation-specific tests must not remove ordinary installation, package hygiene, lifecycle absence, or credential-free CI coverage still required by permanent truth.
- Task 0078 external evidence is outside repository ownership; any cleanup or rerun would destroy the causal record and must remain prohibited throughout implementation and delivery.

## Discoveries and Changes

- Execution preflight validated Tasks 0052, 0067, 0077, 0078, and 0079 plus transaction state `NONE`; local, cached, direct-remote, and GitHub `main` all align at `ae2ca0e23e8bcbf3beb53b9bb659c2358b67d60a`, and the only pre-existing work is this selected untracked pair on the clean tracked Task 0078 branch.
- Task 0078 remains `BLOCKED/BLOCKED` at exact pair SHA-256 values `419a504fb81169e31117332112dac8a181628093e193630669229ffa49a1c72e` and `ae8b2d90b31c69454dea5cdc00a7163927bafa234f32198994466152946f1227`; its retained actual evidence root exists with the recorded sealed failure artifacts and is a read-only no-touch boundary.
- The sole production dispatcher freshly evaluated Task 0077 as the one uncovered prior `STANDARD` outcome, selected `IMPLEMENT / 0079`, and prepared one opaque predecessor-continuity transition without changing repository or external state.
- The prepared transition revalidated the selected branch and active pair, then reported an exact idempotent checkpoint match at digest `755fdc165f7f98ea3f8f853b8bbe5cd26c604dafa2b35c6760b66f4dff6f4bb7`; the branch already carries the 45-outcome checkpoint through delivered Task 0077, so no checkpoint byte changed.
- The pre-implementation retained real candidate is 43 files / 135,268 bytes with archive SHA-256 `dc7aa85b4402e77097514b1911df92e367d72a19d5588834319959512f567ee4`. Its canonical extracted inventory digest is `b40c1b35c239810c584f28409506a593bbccb1df95760c169ae4ccf3de038c46`, and the 41 paths excluding the only allowed README and `package.json` deltas bind to `9616e2c43a19f37d2aca871deede6fdd5da38881bbe3bd7a9c25f6c168e91ef7`.
- Baseline packed hashes are `2c2b3714e9aa1547e2f25c4e4de1e1640ac457ea057984fab366094539f9fd90` for README and `584f0c0a5e8b8fd3bafeaac9cf6c8e41bcfcc6ad4b965004305d91c61bc92fe6` for `package.json`. Package identity/version/files/publishConfig and dependency/lifecycle absence are unchanged before implementation.
- Baseline planner paths and explicit `--candidate` intent both produce `RELEASE` with exactly `npm run release:ci`, five local leaves, and the credential-free 11-job PR / 10-job main topology. `ci.yml` is byte-stable against aligned main at SHA-256 `6bf2806cf7a8d854ed070eff28d92a93aba535a9b5592be30bc92b14a6471072`.
- Baseline `publish.yml` SHA-256 is `a4b3d2cc30f514e021b01981833a2332e73e258f5c2f6e3b45d46950140bd6d8`; it has one manual publishing job and one directory publish but still contains the Stable, retained-candidate, and cleanup layers selected for removal.
- The complete Task 0078 external parent remains present. Its actual attempt marker, outer seal, outer summary, and runner-state seal rehash to `4e234f89…`, `afd1d0e0…`, `6f9e1835…`, and `0fd25aaa…`; the actual state root contains 1,265 entries / 1,018 files / 9,159,650 bytes before implementation.
- Task 0078 consumed exactly one runner/harness/release attempt with zero retries, failed during `npm test` at 451 passes / 26 failures / 6 skips before candidate or npm dry-run, retained clean protected/source state and unchanged public state, and ended `BLOCKED/BLOCKED` without `STANDARD` delivery.
- The current required local graph already has stable owners: `check` runs test/lint/format/package selection, `release:candidate` creates and inspects one real archive, and `release:ci` composes those two. The extra runner/harness/isolation and registry-dry-run layers are development-only additions rather than package/runtime requirements.
- The current planner contains unused isolation and registry-dry-run registry entries plus deleted-layer path classifications even though Release plans already select only `npm run release:ci`.
- The current publication workflow repeats Stable verification and retained-candidate machinery before its version-absence check and single directory publish; the user selected the simpler exact-main OIDC boundary and preserved separate verification gates.
- `package.json` and README are packaged content. The user explicitly allows only the optional dry-run script metadata and README verification-prose deltas while requiring the tarball inventory and all other packaged bytes, dependencies, and lifecycle behavior to remain unchanged.
- The retired scripts, dedicated tests, and isolation-only marketplace fixture are deleted. Shared distribution, foundation, CI, workflow, and planner tests retain package/install/identity coverage without importing or executing a retired layer; remaining retired names are negative mutations that prove reintroduction is rejected.
- `release:check` is exactly `npm publish --dry-run --json`, while `check`, `release:candidate`, and `release:ci` retain their exact prior values. Planner paths and candidate intent emit only `npm run release:ci`; retired ids, commands, and trigger guidance are rejected across every tier.
- The manual workflow now has exactly seven steps and no Stable/candidate/cleanup/dry-run duplication. Bounded mutation tests bind GitHub context to dispatch/source/absence/reconfirm inputs, actual Git/package/plugin/npm/Node data sources, cache-busted public-registry 404 evidence, `set -euo pipefail`, final clean checkout plus ignored `.npmrc` absence, least privilege, and one final directory publish.
- README, SPEC, and ARCHITECTURE now share the same required local graph, optional dry-run, credential-free exact-SHA CI, and separately authorized manual-publication boundary. Final permanent-document measurements are 17,322 / 3,945 / 45,239 / 41,589 bytes and 228 / 48 / 456 / 833 lines respectively; the combined set shrank to 108,095 bytes / 1,565 lines and AGENTS stayed byte-stable.
- Extracting fresh actual candidates from baseline commit `8f937b0f695e50a255dd27f299acacc91cc941d2` and the final tree proved the identical 43-path inventory. The 41 byte-frozen paths bind to a 3,992-byte canonical manifest SHA-256 `9bec5da217874ca0bf87215f66a75721b1d3f89c2c5b9bf8d5557d72dc3fe05b` and the recorded path/hash/size digest `9616e2c43a19f37d2aca871deede6fdd5da38881bbe3bd7a9c25f6c168e91ef7`; only README and the one normalized `release:check` value differ.
- Independent read-only audit found no remaining implementation violation after strengthening all-tier planner rejection and publication data-flow/freshness/fail-fast/ignored-config mutations.

## Documentation Impact

- SPEC: Update required Release verification, optional dry-run, and trusted-publication acceptance so exact-SHA CI/candidate evidence stays separate from the manual version-absence plus one-publish workflow.
- ARCHITECTURE: Remove the runner/harness/isolation and mandatory registry-dry-run components/flows; simplify verification planning and trusted publication boundaries around the retained commands and workflow guards.
- README: Remove obsolete runner and isolation usage, describe `release:check` as optional, list only required verification gates, and describe the narrowed manual exact-main OIDC publication workflow. This is an explicitly allowed packaged documentation delta.
- AGENTS: Expected unchanged — stable commands, evidence honesty, separate publication authority, Task execution, and documentation routing already govern the outcome.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Loaded and reconciled the complete managed execution procedure, all four permanent documents, the Task 0079 pair, hard dependencies 0052/0067/0077, and immutable causal Task 0078 evidence.
- Validated the selected/dependency/causal pairs, transaction state, exact aligned `main`, current branch ancestry, Task 0078 pair hashes, and retained external evidence boundary with no conflict, unexplained work, drift, or unresolved user-owned decision.
- Received `IMPLEMENT / 0079` from the sole dispatcher and created `task/0079-simplify-release-verification-and-publi-09f1b1ed` from exact Task 0078 tip `8f937b0f695e50a255dd27f299acacc91cc941d2` over aligned base `ae2ca0e23e8bcbf3beb53b9bb659c2358b67d60a`.
- Validated the active pair and confirmed the dispatcher transition as an exact idempotent checkpoint replay, then captured the real 43-file archive, fixed selected-byte digest, package command/identity state, planner results, CI/publish workflow hashes/topology, permanent-document measurements, and external Task 0078 no-touch baselines.
- Removed 12,000-plus lines of retired runner, harness, isolation, fixture, and dedicated-test code; simplified the package/planner/publication contracts; synchronized permanent truth; and retained ordinary package, installation, CI, and publication invariants with strengthened negative mutations.
- Passed the final 52-test focused integration, exact RELEASE planner, standalone Stable and independent candidate commands, final composite `release:ci`, extracted-candidate inventory/byte proof, package and permanent-document invariants, whitespace review, and independent read-only audit. No optional dry run, runner/harness/isolation attempt, workflow dispatch, registry mutation, or publication command ran.
- Canonical active-pair validation passed, transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`, and terminal repository coverage is complete; the immutable pair now hands off only the external `STANDARD` GitHub ledger gate.

## Remaining

- None — repository implementation, acceptance verification, documentation, final coverage, and canonical pair/transaction checks are complete; `STANDARD` delivery is the external immutable-ledger continuation.

## Resume Point

- None — resume is not required for repository work; the next lifecycle action is the already-authorized external `STANDARD` delivery of this terminal pair.

## Blockers

- Not applicable — no blocker is known.
