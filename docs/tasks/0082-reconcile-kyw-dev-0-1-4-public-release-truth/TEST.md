# TEST 0082 — Reconcile kyw-dev 0.1.4 Public Release Truth

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Frozen candidate and delivery baseline: Task 0081.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — exact completed npm/GitHub release proof | Bind workflow/run/job/log evidence to cache-bypassed registry metadata, downloaded bytes/digests, signature audit, decoded attestations, tag ref, and Release API identity. | External read-only / supply chain | PASS | Run `33613645977/1`, public metadata, exact candidate digest, signature/attestation verification, direct tag target, and Release identity all agree on `8e5d1c43…` / `0.1.4`. |
| T-02 | AC-02 — durable public truth is current and bounded | Inspect README/SPEC replacements against registry/tag/Release facts and retain historical/public-submission boundaries. | Documentation / contract | PASS | Current owner paragraphs now identify public `0.1.4`, retained history, exact-source tag/Release, historical `0.1.2`, and no submission. |
| T-03 | AC-03 — current install and assertion projections agree without release-byte drift | Run the instruction suite; inspect exact changed paths, package/plugin/workflow and Task 0081 identities. | Focused / integrity | PASS | Instruction tests passed 12/12; implementation paths are bounded and release-source owners remain unchanged. |
| T-04 | AC-04 — final repository verification and evidence close cleanly | Validate pair/transaction/delta, rerun failed focused tests and `npm run check`, then inspect final diff and external state. | Stable / coverage | PASS | Cause-focused 26/26 plus 2/2 passed, final Stable passed completely, and final integrity/external review found no blocker. |
| T-05 | AC-05 — no managed delivery claim is invented | Validate reasoned `NONE` policy and confirm the managed checkpoint is unchanged while direct GitHub synchronization remains separate from Task acceptance. | Delivery boundary | N/A | This ordinary correction was not selected by `kyw-impl`; no `STANDARD` ledger is required or claimed. |

## Regression Coverage

- Public `0.1.4` remains byte-identical to Task 0081's candidate and bound to its exact merge SHA.
- Package/plugin version, publish workflow, dependencies/lifecycle, package allowlist, Task 0081 bytes, tag, and Release remain unchanged.
- Current install examples and permanent truth no longer claim public `0.1.3` or an unpublished candidate.
- No second publish run, rerun, fallback, dist-tag change, tag/Release edit, asset upload, public submission, account mutation, force, bypass, or deletion occurs.

## Commands

- Cache-bypassed registry root/version/tarball/attestation reads; independent SHA-1/SHA-256/SHA-512/integrity calculation and decoded SLSA/publish statements.
- `gh run view 33613645977 --repo kimyeongwoo/kyw-dev` metadata, job, step, and bounded `KYWPUBLISHEVIDENCE` log inspection.
- Isolated `npm install kyw-dev@0.1.4 --ignore-scripts` plus `npm audit signatures`; exact owned temporary proof cleanup to the Recycle Bin.
- GitHub tag/ref and Release API reads plus remote-tag and release-inventory checks.
- `node --test test/instruction-surfaces.test.mjs`
- `npm run verify:plan -- README.md docs/SPEC.md test/instruction-surfaces.test.mjs`
- `node --test test/foundation.test.mjs test/distribution.test.mjs`
- `node --test --test-name-pattern="current tracked-main redelivery identity scan is read-only|real Task 0059 multi-merge history remains grandfathered under contract 2" test/task-delivery-hydration.test.mjs`
- `npm run verify:plan -- README.md docs/SPEC.md test/instruction-surfaces.test.mjs docs/tasks/0082-reconcile-kyw-dev-0-1-4-public-release-truth/TASK.md docs/tasks/0082-reconcile-kyw-dev-0-1-4-public-release-truth/TEST.md`
- `npm run check` (first run failed as recorded below; the cause-corrected final run passed)
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0082-reconcile-kyw-dev-0-1-4-public-release-truth`
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`
- `git diff --check`

## Results

- PASS — Task 0081 PR head/merge/post-main evidence binds the frozen candidate tree to exact source `8e5d1c43c69314e941e35e6835ae36a6cb40c981` before publication.
- PASS — exactly one new publication run exists: `33613645977`, attempt 1, job `100194400260`, manual event, `main`, exact source/version, every guard and publish step successful, and `+ kyw-dev@0.1.4` in bounded logs.
- PASS — public versions are `0.1.0` through `0.1.4`, only `latest=0.1.4`, and canonical metadata exposes the exact `gitHead`, Trusted Publisher, signature, integrity, shasum, file count, unpacked size, and attestation URL.
- PASS — downloaded tarball bytes total 135,958 and independently match registry shasum/integrity plus Task 0081 SHA-256 `c01513dd903ea3254284a1438ecd808d1defe469e1dd61cfa8e3cdacc322c632`.
- PASS — decoded npm-publish and SLSA provenance statements subject the exact SHA-512 and bind repository, workflow, `refs/heads/main`, source commit, manual event, GitHub-hosted builder, and run `33613645977/1`; `npm audit signatures` verified the registry signature and attestation.
- PASS — `v0.1.4` is one lightweight tag directly at the published source. Release `381124298` uses that tag and exact target, is non-draft/non-prerelease, and has zero uploaded assets.
- PASS — focused instruction tests passed 12/12 and the exact three-path planner selected Stable `npm run check` with ordinary 11-job PR / 10-success-job main hosted topology.
- FAIL → causes identified — the first `npm run check` ran 393 tests with 383 pass, four explicit skip, and six failures. Four distribution/foundation failures were one missing fresh permanent-document delta-marker cascade; two hydration failures observed stale unoccupied local main `14fcf534…` against `origin/main=8e5d1c43…`.
- PASS — worktree and ancestry inspection proved the local main ref could fast-forward safely; it now equals exact `origin/main` without reset, worktree mutation, force push, or external retry.
- PASS — after adding this exact marker, foundation/distribution passed 26/26 and the two named hydration tests passed 2/2.
- PASS — final `npm run check` passed 393 tests with 389 pass, four explicit platform/live skip, and zero failures; lint covered 81 JavaScript modules, format covered 366 UTF-8/LF files, and package selection covered 43 files / 135,948 bytes.
- PASS — final read-only state retains exactly one successful target publication attempt and zero active runs, `latest=0.1.4`, exact source-bound tag/Release, unchanged Task 0081 blobs and workflow/package/plugin identity, absent proof temp state, and the expected five repository paths.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 17926 | 17901 | 228 | 228 | -25 | -0.14% | setup, commands, usage, and contributor entry | Users must see the actual public 0.1.4 release, exact-source GitHub release identity, and install commands after deployment. | Existing Start here, Release status, and Direct Skills installation sentences replace candidate/0.1.3 wording without a new section. |
| `AGENTS.md` | 3921 | 3921 | 47 | 47 | 0 | 0.00% | repository-wide Codex routing, authority, preservation, and completion rules | Not applicable — existing direct-action and bounded-fix rules already govern reconciliation. | AGENTS remains byte-stable. |
| `docs/SPEC.md` | 48011 | 48026 | 468 | 468 | +15 | 0.03% | observable product behavior and acceptance | Package-boundary and publication-state truth must identify the verified public release, tag, and Release. | Existing owner sentences replace candidate/public-version facts; durable release flow is unchanged. |
| `docs/ARCHITECTURE.md` | 43217 | 43217 | 853 | 853 | 0 | 0.00% | components, boundaries, dependencies, flows, and distribution | Not applicable — system components and publication flow did not change. | ARCHITECTURE remains byte-stable. |
| `Combined` | 113075 | 113065 | 1596 | 1596 | -10 | -0.01% | four permanent documents as one governed set | The permanent set must replace transient candidate truth with current public state while remaining within existing owners and budgets. | Two owner paragraphs absorb the complete meaning with a net byte reduction. |

## Unverified

- Direct GitHub PR/merge/post-main observation is intentionally outside Task acceptance because Delivery is `NONE`; no managed `STANDARD` evidence is claimed.

## Final Coverage Review

- [x] Map every acceptance criterion to one or more test rows.
- [x] Compare the public tarball to the frozen Task 0081 candidate rather than post-sync docs.
- [x] Compare the final diff to the matrix and exact path scope.
- [x] Confirm final permanent-document measurements, pair/transaction state, immutable Task 0081 bytes, and no further external mutation.
