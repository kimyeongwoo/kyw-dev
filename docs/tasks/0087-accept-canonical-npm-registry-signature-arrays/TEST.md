# TEST 0087 — Accept Canonical npm Registry Signature Arrays

<!-- kyw-task-contract: 4 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Immutable release baseline: Task 0086.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — one or multiple valid same-key signatures are exact | Drive existing-target tuple hydration and fresh npm reads with one valid entry and two independently valid entries under the frozen key; classify the result. | Integration / cryptographic | PASS | Both guards accept one and two independently valid entries; canonical read returns the unchanged frozen `keyId` plus aggregate `verified=true` and classifies exact. |
| T-02 | AC-02 — every signature must validate | Inject empty, malformed, mixed/wrong-key, invalid-first, invalid-later, and exact-message mismatch states into both guards; require rejection or `CONFLICT`. | Negative / security | PASS | Both matrices reject every hostile mode; wrong-first proves no fallback, wrong-message proves exact message binding, and first/later invalid placement proves all-entry rather than any-entry validation. |
| T-03 | AC-03 — surrounding immutable proof and state machine are preserved | Retain endpoint/index identity drift, active-key, classifier, provenance, ordering, failure, and one-write regression coverage. | Regression / integration | PASS | Divergent endpoint/index arrays reject before mutation; the unchanged classifier and shared runner block an invalid later signature and allow two-valid npm to issue only fixture TAG→RELEASE requests. |
| T-04 | AC-04 — durable and procedural owners agree | Inspect SPEC, ARCHITECTURE, and public-release reference wording and confirm README/AGENTS/workflow/package/plugin stay outside the diff. | Documentation / scope | PASS | The three owning statements use one nonempty/all-entry/frozen-key/exact-message invariant; README, AGENTS, workflow, and package/plugin metadata have no diff. |
| T-05 | AC-05 — complete repository verification is green with no live writes | Run focused hydration/public/instruction tests, Release and Stable graphs, pair/transaction/diff checks, and inspect fixture/injected traces. | Stable / Release / safety | PASS | Final focused and 490-test graphs, lint, format, pack, candidate, pair/transaction, and diff checks pass; every test mutator is injected and live GitHub/npm mutation count is zero. |
| T-06 | AC-06 — Task 0086 and published package identity remain immutable | Compare Task 0086 pair blobs, package/plugin/workflow/continuity paths, original merge/tarball/workflow identities, and ensure no publish dispatch or npm mutation occurred. | Preservation / external read-only | PASS | Task 0086 blobs match original merge, protected paths have no diff, exact npm/workflow proof remains bound to `85f8f757…`, and fresh tag/Release reads remain absent without redispatch or republication. |

## Regression Coverage

- Task 0086 remains byte-immutable and continues to own `0.2.0`, its original merge SHA, exact tarball, successful OIDC attempt, and later tag/Release stages.
- Single-signature packages remain accepted; empty/malformed/mixed/partially invalid arrays never become exact.
- Current/expiry-aware key selection, endpoint/index immutable identity comparison, aggregate npm classifier, provenance validation, canonical tarball proof, and release ordering remain fail closed.
- Package/plugin metadata, publish workflow, dependencies, public tuple schema, checkpoint/continuity, and dispatcher behavior remain unchanged.
- Verification uses fixtures, injected clients, mocks, or owned loopback only and performs no live GitHub/npm write.

## Commands

- `node --test test/task-delivery-hydration.test.mjs test/task-public-release.test.mjs`
- `node --test test/kyw-deliver.test.mjs test/instruction-surfaces.test.mjs test/foundation.test.mjs test/distribution.test.mjs test/skill-installation.test.mjs`
- `npm run verify:plan -- src/core/task-artifact-hydration.mjs test/task-delivery-hydration.test.mjs test/kyw-deliver.test.mjs docs/SPEC.md docs/ARCHITECTURE.md skills/kyw-deliver/references/public-release.md docs/tasks/0087-accept-canonical-npm-registry-signature-arrays/TASK.md docs/tasks/0087-accept-canonical-npm-registry-signature-arrays/TEST.md`
- `npm run release:ci`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0087-accept-canonical-npm-registry-signature-arrays`
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`
- `git diff --check`
- `git ls-tree -r 85f8f757e97f9ee12e63ffa6c7f07b08ddf0879f -- docs/tasks/0086-unify-standard-delivery-for-kyw-dev-0-2-0/TASK.md docs/tasks/0086-unify-standard-delivery-for-kyw-dev-0-2-0/TEST.md`
- `git hash-object docs/tasks/0086-unify-standard-delivery-for-kyw-dev-0-2-0/TASK.md docs/tasks/0086-unify-standard-delivery-for-kyw-dev-0-2-0/TEST.md`
- Cache-bypassed `https://registry.npmjs.org/kyw-dev`, exact-version, signing-key, tarball, and attestation reads with independent digest and every-signature cryptographic verification.
- Isolated lifecycle-disabled `kyw-dev@0.2.0` install followed by npm 11.18.0 `npm audit signatures --json`; the exact owned OS-temporary directory was boundary-checked and removed.
- `gh api "repos/kimyeongwoo/kyw-dev/actions/workflows/publish.yml/runs?event=workflow_dispatch&per_page=100"`
- `gh api "repos/kimyeongwoo/kyw-dev/actions/runs/33862909430/jobs?filter=all&per_page=100"`
- `gh api "repos/kimyeongwoo/kyw-dev/git/matching-refs/tags/v0.2.0"`
- `gh api "repos/kimyeongwoo/kyw-dev/releases?per_page=100"`

## Results

- FAIL → PASS — the first expanded three-test run exposed only a stale expected-error pattern for the wrong-first no-fallback branch; after matching the existing key-selector diagnostic, the final four directly affected tests passed 4/4.
- PASS — the complete hydration/public-release focused command passed 105 tests with 100 passes, five explicit environment skips, and zero failures before the final adversarial additions; final `release:ci` and standalone `npm test` reran the completed matrix.
- FAIL → PASS — the first broader continuity/dispatch/installation/instruction command completed 138 tests with 133 passes, one skip, and four failures: three required this Task's exact permanent-document delta marker and one required the changed signature-procedure assertion. The cause-focused rerun passed 18/18.
- PASS — the planner classified the exact eight-path outcome as `STABLE` and selected `npm run check`; the separately required `npm run release:ci` passed 490 tests with 484 passes, six explicit platform/live skips, and zero failures, then lint passed 85 modules, format passed 386 files, pack passed 48 files / 200,443 bytes, and the candidate SHA-256 was `e58f5ab08c657012cf7bb861eb150673c5023bc695f7516660228c16aee9c25e`.
- PASS — standalone `npm test` reproduced 490 tests with 484 passes, six explicit platform/live skips, and zero failures. Standalone lint, format, and pack reproduced 85 modules, 386 files, and 48 files / 200,443 bytes.
- PASS — fresh canonical reads at `2026-09-04T16:33:41Z`–`16:36:25Z` report `latest=0.2.0`, versions `0.1.0`–`0.2.0`, exact `gitHead=85f8f757e97f9ee12e63ffa6c7f07b08ddf0879f`, 200,256 tarball bytes, SHA-1 `d546961e9be1e227087f12ea6d15f7e3dd50c150`, SHA-256 `235d882dd97972441db4aa0bfbb366c64cef28d42368331d3767bbb312e33073`, and matching SHA-512 integrity.
- PASS — both registry signatures use current non-expiring key `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U` and independently verify the exact npm message. Two attestations bind the exact SHA-512; SLSA provenance binds source commit `85f8f757…` and workflow invocation `33862909430/1`. A final isolated npm 11.18.0 audit returned `missing=[]` and `invalid=[]`; two earlier wrapper attempts did not reach a supported audit and their owned temporary state was removed.
- PASS — GitHub reports exactly one target publish run `33862909430`, attempt 1, with its sole job and publish step successful; fresh matching-ref and Release inventory reads return empty, and no workflow rerun or dispatch occurred.
- PASS — Task 0086 pair modes remain `100644` at blobs `21c21b471d737e74c60d6cdb39eb0654d2d615aa` / `7b988766e02eeaa0d0f62c810512e8b07d011a6a`; worktree hashes match, and package/plugin/workflow/continuity/Task 0086 paths have no diff.
- PASS — source/test/docs/pair are the exact eight changed paths, `git diff --check` passes, final matrix/scope review has no uncovered branch, and all implementation/verification traces contain zero live workflow dispatch, npm publish, tag creation, Release creation, or ref mutation.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 19129 | 19129 | 226 | 226 | 0 | 0.00% | setup, installation, commands, usage, and contributor entry | Not applicable — user-visible setup and command behavior do not change. | README remains byte-stable. |
| `AGENTS.md` | 4093 | 4093 | 41 | 41 | 0 | 0.00% | repository-wide Codex routing, authority, preservation, and completion rules | Not applicable — existing direct-correction, immutable-pair, verification, and release-failure rules already govern this work. | AGENTS remains byte-stable. |
| `docs/SPEC.md` | 48785 | 48996 | 482 | 482 | +211 | 0.43% | observable public-release behavior and acceptance | Exact npm proof must distinguish valid signature multiplicity from empty, mixed-key, malformed, or partially invalid arrays. | The existing publication-state paragraph absorbs the complete invariant without a new section or owner. |
| `docs/ARCHITECTURE.md` | 50344 | 50853 | 966 | 974 | +509 | 1.01% | components, boundaries, dependencies, control/data flow, and distribution | Tuple reconstruction and later canonical reads must apply the same nonempty/all-entry rule through the existing key/verifier/classifier boundaries. | The existing same-invocation public-release section absorbs the data flow without a new component, schema, or store. |
| `Combined` | 122351 | 123071 | 1715 | 1723 | +720 | 0.59% | four permanent documents as one governed set | The permanent set must state the corrected proof rule while leaving unrelated setup and repository instructions stable. | Two existing owner sections absorb the change; README and AGENTS remain unchanged. |

## Unverified

- Task 0087's directly authorized PR, hosted exact-head/synthetic/post-main CI, and ordinary merge remain pending outside its reasoned `NONE` acceptance ledger.
- Task 0086's separately authorized original-SHA tag and asset-free published Release continuation remains pending until the correction is merged and fresh canonical proof remains exact.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
