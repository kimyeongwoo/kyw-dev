# TEST 0079 — Simplify Release Verification and Publication Gates

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially verification proportionality, package boundary, exact-SHA credential-free CI, publication authority, and trusted-workflow acceptance.
- Architecture constraints: `../../ARCHITECTURE.md`, especially development validation, package/publication boundaries, verification planning, hosted CI, release verification, and OIDC workflow flow.
- Satisfied baselines: Tasks 0052, 0067, and 0077.
- Immutable causal evidence: blocked Task 0078 and its retained external evidence, read-only.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — preserve Task 0078 blocked evidence | Hash both pair files against the recorded SHA-256 values, inspect pair state and final diff, and confirm no command or cleanup touched the retained external attempt/state/evidence roots or reran the consumed attempt. | Historical integrity / no-touch | PASS | Final pair hashes are exact; attempt, outer seal/summary, and runner-state seal rehash to `4e234f89…`, `afd1d0e0…`, `6f9e1835…`, and `0fd25aaa…`; state remains 1,265 entries / 1,018 files / 9,159,650 bytes. |
| T-02 | AC-02 — retire runner, harness, and isolation layers | Assert the three scripts and three dedicated tests are absent; scan active source, shared tests, configuration, planner, workflows, and permanent docs for imports, commands, identifiers, and stale guidance while exempting unchanged historical pairs. | Static / deletion / regression | PASS | All seven retired files are deleted, active surfaces have no executable coupling, and remaining names occur only in negative mutations that reject reintroduction. |
| T-03 | AC-03 — required commands plus optional thin dry run | Inspect package/foundation/distribution/CI command graphs: require unchanged `check`, `release:candidate`, and `release:ci`; require `release:check` to equal only `npm publish --dry-run --json`; assert planner, CI, publish workflow, and required documentation never invoke it. | Command contract / authority | PASS | Exact script inspection plus focused/full regressions prove the retained three commands and thin optional alias; required gates and workflows never invoke it. |
| T-04 | AC-04 — planner exposes only retained Release gate | Exercise release-sensitive, candidate-intent, mixed, deleted-layer, unknown, and documentation paths; require Release selection to contain exactly `npm run release:ci` and mutation tests to reject reintroduced isolation or registry-dry-run entries. | Unit / planner | PASS | Exact changed-path planning returns RELEASE with one command, `npm run release:ci`; 10/10 planner tests reject retired ids, commands, and trigger guidance in every tier. |
| T-05 | AC-05 — exact-SHA credential-free CI remains intact | Parse and mutate `ci.yml` to verify actual PR head, synthetic merge parents, main merge SHA, supported behavioral lanes, quality/candidate/aggregate topology, immutable actions, read-only permissions, and absence of publish, dry-run, credentials, runner, harness, and isolation commands. | Workflow / security / compatibility | PASS | CI workflow remains byte-stable at SHA-256 `6bf2806c…`; five CI regressions and final full suite preserve its 11-job PR / 10-job main topology and credential-free command graph. |
| T-06 | AC-06 — narrowed manual exact-main OIDC publication | Test the canonical workflow and mutations for event/repository/ref/SHA/checkout/version/runtime/registry/cleanliness/OIDC/absence guards and exactly one directory publish; reject automatic triggers, 404 ambiguity, Stable/candidate/cleanup/dry-run layers, credentials, retry/fallback, tarball/dist-tag/tag/Release, and duplicate publish paths. | Workflow / failure injection / authority | PASS | Two workflow tests bind the exact seven steps, GitHub/source/runtime/registry/freshness data flow, fail-fast and final ignored-config checks, least privilege, and one final directory publish while rejecting all weakening mutations. |
| T-07 | AC-07 — actual candidate inventory and selected-byte invariance | Run one independent real candidate, inspect the exact 43-file archive and hygiene report, and compare pre/post Git or extracted bytes for CLI/runtime, plugin metadata, five Skills, templates, licenses, and notices while allowing only README and exact package script metadata deltas. | Package / integration / byte comparison | PASS | Independent and composite candidates pass at 43 files / 134,965 bytes / SHA-256 `4987a2da…`; extracted baseline/current inventories match, and all 41 frozen files match canonical manifest SHA-256 `9bec5da2…`. |
| T-08 | AC-08 — package identity, dependencies, and lifecycle stay fixed | Inspect `package.json`, plugin metadata, packed manifest, repository config, and final diff for unchanged identity/version/files/publishConfig, no dependency fields, lockfile or `.npmrc`, no forbidden install/publish lifecycle script, and no deleted development layer in the tarball. | Package / static / lifecycle | PASS | Identity remains `kyw-dev@0.1.3`, public files/registry/access are exact, package SHA is the expected one-value delta `1afc792b…`, and dependency/config/lock/lifecycle absence plus 43-file hygiene pass. |
| T-09 | AC-09 — integrated verification, documentation, and delivery | Run the focused six-suite command, exact changed-path planner, `npm run check`, independent `release:candidate`, `release:ci`, permanent-document measurements, pair/transaction/diff/final-matrix checks, then require actual PR-head and post-merge exact-SHA hosted evidence without optional dry-run or publication dispatch. | Integrated / documentation / STANDARD | PASS | Final focused 52/52, standalone Stable, independent candidate, composite Release, document/diff/matrix, and read-only audit evidence pass; canonical pair/transaction closure follows below, and exact-SHA hosted evidence remains the external STANDARD gate rather than a repository claim. |

## Regression Coverage

- `npm run check` remains exactly test, lint, format, and package selection; no removed layer is inserted into Stable verification.
- `release:candidate` continues to create and inspect a real archive, validate inventory/hygiene/legal/CLI behavior, and publish nothing.
- `release:ci` remains exactly `npm run check && npm run release:candidate` and is the sole local command emitted for Release plans.
- `release:check` remains available as a standard optional dry-run alias but supplies no required evidence or mutation authority.
- Credential-free PR/main/manual CI retains exact checkout identities, supported OS/runtime coverage, package selection, real-candidate, merge compatibility, and aggregate gating.
- Manual trusted publication retains exact current-main identity, package/plugin version, public registry identity, OIDC least privilege, target-version absence, clean checkout, one directory publish, provenance behavior, and no credentials or retry.
- Direct and plugin installation behavior, package file selection, runtime/Skill/template/plugin/legal bytes, dependency absence, and lifecycle-script absence remain unchanged.
- Task 0078 and all other historical Task/Test evidence remain unchanged; its failed actual attempt is never reused as PASS.
- Publication, version, registry, dist-tag, tag, Release, and public-submission mutations remain outside this Task authority.

## Commands

- `node --test test/distribution.test.mjs test/continuous-integration.test.mjs test/publish-workflow.test.mjs test/verification-plan.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs`
- `npm run verify:plan -- package.json .github/workflows/publish.yml scripts/lib/validate-foundation.mjs scripts/verification-plan.mjs scripts/release-evidence-manual-runner.mjs scripts/release-evidence-harness.mjs scripts/release-gate-isolation.mjs test/distribution.test.mjs test/continuous-integration.test.mjs test/publish-workflow.test.mjs test/verification-plan.test.mjs README.md docs/SPEC.md docs/ARCHITECTURE.md`
- `npm run check`
- `npm run release:candidate`
- `npm run release:ci`
- Read-only SHA-256 comparison of Task 0078 TASK/TEST against `419a504fb81169e31117332112dac8a181628093e193630669229ffa49a1c72e` and `ae8b2d90b31c69454dea5cdc00a7163927bafa234f32198994466152946f1227`, plus no-touch inspection of its recorded external evidence parent.
- Compare the final tarball inventory and all packaged paths except README and exact `package.json` script metadata against the pre-implementation baseline.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this Task directory>`
- `node ./skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root ./docs/tasks`
- `git diff --check`
- Observe required GitHub PR actual-head, synthetic-merge, protected-merge, and post-merge `main` exact-SHA evidence through ordinary `STANDARD` delivery; do not dispatch `publish.yml`.

## Results

- PASS — entry validation accepted Tasks 0052, 0067, 0077, 0078, and 0079; transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`, and fresh fetch kept local/cached/direct-remote `main` aligned at `ae2ca0e23e8bcbf3beb53b9bb659c2358b67d60a`.
- PASS — Task 0078 remains `BLOCKED/BLOCKED` at the required TASK/TEST SHA-256 values, and its retained actual evidence root exists with 38 files / 186,708 bytes under the recorded sealed run directory; no external evidence command or cleanup ran.
- PASS — the sole production dispatcher freshly evaluated Task 0077 as `HARDENED_EXACT_HEAD`, classified the prior covered set as durable continuity, selected `IMPLEMENT / 0079`, and prepared one predecessor transition without repository or external mutation.
- PASS — active-pair validation succeeded and continuity application reported an idempotent existing checkpoint at digest `755fdc165f7f98ea3f8f853b8bbe5cd26c604dafa2b35c6760b66f4dff6f4bb7`, covering 45 delivered outcomes through Task 0077 without changing the checkpoint.
- PASS — the pre-change actual candidate passed at 43 files / 135,268 bytes / SHA-256 `dc7aa85b4402e77097514b1911df92e367d72a19d5588834319959512f567ee4`; extracted inventory digest is `b40c1b35…`, and the fixed 41-path digest excluding README and `package.json` is `9616e2c4…`.
- PASS — package scripts, identity, version, files, public registry metadata, dependency/lifecycle absence, planner outputs, and workflow topology were captured. Both changed release paths and explicit candidate intent emit exactly `npm run release:ci`; `ci.yml` SHA-256 is `6bf2806c…` and baseline `publish.yml` SHA-256 is `a4b3d2cc…`.
- PASS — Task 0078 no-touch baselines rehash the actual attempt marker / outer seal / summary / runner-state seal to `4e234f89…` / `afd1d0e0…` / `6f9e1835…` / `0fd25aaa…`; the actual state root contains 1,265 entries / 1,018 files / 9,159,650 bytes. No runner, harness, cleanup, dry-run, or publication command ran.
- PASS — the retired three scripts, three dedicated tests, and isolation-only marketplace fixture are absent. Active source, configuration, planner, workflows, README, SPEC, and ARCHITECTURE contain no stale execution guidance; negative test strings intentionally prove that reintroduction fails.
- PASS — package scripts remain exact for `check`, `release:candidate`, and `release:ci`; `release:check` is exactly the optional `npm publish --dry-run --json`. No dependency/devDependency, lockfile, repository `.npmrc`, lifecycle script, package/plugin identity/version, files, or publishConfig drift exists.
- PASS — exact changed-path planning returns RELEASE / five local leaves / only `npm run release:ci`, with the unchanged hosted 11-job PR / 10-job main topology. Final `ci.yml` and AGENTS hashes remain `6bf2806c…` and `b06e54bf…`.
- PASS — the final focused command passed 52/52. It includes retained distribution/package tests, five CI tests, two publication workflow tests, ten planner tests, 21 foundation tests, and ten instruction/document tests.
- PASS — independent read-only audit found no remaining implementation or acceptance violation after its identified planner all-tier/trigger and publication context/source/runtime/fetch/freshness/fail-fast/ignored-config mutation gaps were added and rerun.
- PASS — standalone `npm run check` passed 388 tests / 384 passes / four explicit host/live skips / zero failures, lint over 81 JavaScript modules and foundation metadata, format over 360 UTF-8/LF files, and package selection at 43 files / 134,965 bytes. Final test-only mutation hardening then passed focused reruns and the final composite Stable leaf with the same counts.
- PASS — independent `npm run release:candidate` and final `npm run release:ci` passed. Both final candidates are 43 files / 134,965 bytes / SHA-256 `4987a2da492e4602f19573a745626b39a755c0c346eed6c416c3de2a3aa6dc71`; the composite reran the complete Stable graph successfully.
- PASS — actual baseline and final candidates have the identical 43 sorted paths. The 41 frozen files produce a 3,992-byte canonical hash/path manifest SHA-256 `9bec5da217874ca0bf87215f66a75721b1d3f89c2c5b9bf8d5557d72dc3fe05b` and path/hash/size digest `9616e2c43a19f37d2aca871deede6fdd5da38881bbe3bd7a9c25f6c168e91ef7`; README and the normalized `release:check` value are the only packed deltas.
- PASS — final permanent-document review measures README 17,322 bytes / 228 lines, AGENTS 3,945 / 48, SPEC 45,239 / 456, and ARCHITECTURE 41,589 / 833, for a net-shrunk combined 108,095 bytes / 1,565 lines. Their exact delta evidence follows and foundation accepts the warning-sized SPEC rationale.
- PASS — final diff coverage maps workflow/package/planner/foundation/shared-test/document changes and all seven deletions to T-02 through T-09; `git diff --check` passes and no temporary candidate proof root or script remains.
- PASS — canonical active-pair validation accepted the complete pair, transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`, foundation plus instruction surfaces passed 31/31, formatting passed, and Task 0078 hashes remained exact immediately before terminalization.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 18313 | 17322 | 243 | 228 | -991 | -5.41% | setup, commands, usage, and contributor entry | Not applicable — the document shrank while the supported release commands and authority boundary changed. | Replaced runner and isolation procedures with the complete required local graph, optional thin dry run, and narrowed manual-workflow entry guidance. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex execution and completion rules | Not applicable — existing evidence honesty, stable commands, and separate publication authority already govern the simplified flow. | AGENTS remains byte-stable; Task-specific implementation and evidence stay in this pair. |
| `docs/SPEC.md` | 44348 | 45239 | 454 | 456 | +891 | 2.01% | observable product behavior and acceptance | The warning-sized product owner must state which release gates are required, which dry run is optional, and which checks remain outside the manual publication workflow. | Existing verification, trusted-workflow acceptance, and publication-authority sections absorb the corrected meaning without adding chronology or implementation detail. |
| `docs/ARCHITECTURE.md` | 42634 | 41589 | 849 | 833 | -1045 | -2.45% | components, boundaries, dependencies, flows, and distribution | Not applicable — the document shrank while obsolete release components and flows were removed. | Replaced runner, harness, isolation, retained-candidate, and mandatory dry-run flow with the retained candidate, CI, planner, and one-directory-publish boundaries. |
| `Combined` | 109240 | 108095 | 1594 | 1565 | -1145 | -1.05% | four permanent documents as one governed set | The permanent set shrank overall while product and architecture owners were synchronized to the new release contract. | README, SPEC, and ARCHITECTURE absorb the durable meaning in existing sections; AGENTS remains unchanged and no fifth permanent document is introduced. |

## Unverified

- The optional `release:check` command is intentionally not run or credited; it is not required acceptance evidence.
- The manual publication workflow is intentionally not dispatched, and no registry/version/tag/Release/submission mutation is authorized by this Task.
- `STANDARD` PR-head, synthetic-merge, protected-merge, and post-merge `main` exact-SHA evidence remains the external GitHub delivery gate and is not preclaimed by this repository pair.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
