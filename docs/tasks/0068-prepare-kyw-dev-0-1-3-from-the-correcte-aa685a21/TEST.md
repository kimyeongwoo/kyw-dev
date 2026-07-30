# TEST 0068 — Prepare kyw-dev 0.1.3 from the Corrected Git Checkout Path

<!-- kyw-task-contract: 3 -->

## Status

READY

## Test Basis

- Task: `./TASK.md`
- Hard dependency: the corrected npm OIDC release-contract Task named in `TASK.md`
- Immutable recovery evidence: Task `0066`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Setup and release truth: `../../../README.md`
- Release owners: `../../../package.json`, `../../../.codex-plugin/plugin.json`, `../../../scripts/lib/validate-foundation.mjs`
- Registry baseline: public `0.1.0`, `0.1.1`, and `0.1.2`, `latest=0.1.2`, and absent `0.1.3` at authoring

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Dependency/main/tuple/workflow and unused-version preflight are exact and credential-free. | Validate dependency delivery and hashes; query public registry/GitHub; assert no account-auth command or UI inspection occurs. | External/integrity | TODO | Not run. |
| T-02 | AC-02 — Current identities become `0.1.3` without historical corruption. | Inspect all version owners, classify repository-wide version occurrences, and hash prior terminal pairs including Task `0066`. | Integration/integrity | TODO | Not run. |
| T-03 | AC-03 — Candidate and public truth remain distinct. | Assert repository/packed README and SPEC wording, public install commands, and absence of false publication/provenance/tag/Release/submission claims. | Documentation | TODO | Not run. |
| T-04 | AC-04 — Exact real-Git candidate contents and metadata are safe and reproducible. | Pack from the committed checkout; inspect inventory, manifests, README/legal/CLI, exclusions, dependencies/lifecycle, sizes, and independent digests; guard cleanup. | Distribution/security | TODO | Not run. |
| T-05 | AC-05 — Actual npm behavior continues to guarantee the `gitHead` condition. | Run the dependency's real temporary-Git/loopback fixture with directory-positive and tarball-negative controls. | Integration/fixture | TODO | Not run. |
| T-06 | AC-06 — All required gates pass without external publication. | Run focused tests, four stable commands, release CI, one-attempt isolation, dry-run, and final candidate inspection. | Regression/release | TODO | Not run. |
| T-07 | AC-07 — Excluded external state, prior evidence, documents, and transaction remain exact. | Repeat registry/workflow/tag/Release reads, auth-command audit, prior-pair hashes, document measurements, matrix/diff review, pair validation, and transaction inspection. | Scope/policy | TODO | Not run. |
| T-08 | AC-08 — Exact-main STANDARD delivery gates publication. | Require non-draft actual-head and merge checks, expected-head merge, post-main exact-SHA CI, and evaluator evidence. | Delivery | TODO | Not run. |

## Regression Coverage

- Corrected OIDC-only directory publication, exact-main/version gates, provenance, expected tuple, fail-closed behavior, and actual-npm `gitHead` fixture remain intact.
- Package allowlist, legal notices, CLI/install behavior, zero production dependencies, no lockfile/lifecycle scripts, and cleanup remain enforced.
- Historical `0.1.0` through `0.1.2` and Task `0066` publication/blocker evidence remain unchanged.
- No account reauthentication, workflow dispatch, public publication, dist-tag mutation, tag, Release, or public submission occurs.

## Commands

- Planned preflight: validate the dependency and Task `0066`, inspect transaction/continuity, compare exact main/workflow/tuple bytes, and query `npm view kyw-dev versions dist-tags --json` plus `npm view kyw-dev@0.1.3 version --json`.
- Planned focused regressions: version, CLI, distribution, foundation, instruction-surface, release-evidence, workflow, installation, and actual-npm directory-publish fixture tests.
- Planned version inventory: owner-aware searches for `0.1.0` through `0.1.3`, candidate/public wording, and prohibited publication/authentication paths.
- Planned stable commands: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Planned release gates: `npm run release:ci`, one-attempt release isolation, and `npm run release:check`; dry-run grants no publication authority.
- Planned exact candidate proof: invoke the retained-candidate helper from the real committed checkout, independently inspect archive/inventory/digests, then remove only proven Task-owned temporary state.
- Planned no-mutation proof: read-only registry/workflow/tag/Release checks and audit that no account authentication, workflow dispatch, public publish, dist-tag, tag, Release, or submission mutation occurred.
- Planned Task/delivery proof: validate the pair and transaction, review exact diff/matrix, then complete `STANDARD` exact-SHA delivery through `$kyw-impl`.

## Results

- Not applicable — verification has not run.

## Unverified

- `0.1.3` source edits, candidate bytes, tests, delivery, and exact source SHA do not exist yet.
- No production OIDC publish or public `0.1.3` exists or is claimed.

## Final Coverage Review

- [ ] Compare the final diff and candidate to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for version, history, Git metadata, and failure branches.
- [ ] Confirm PASS evidence is reproducible.
- [ ] Confirm required regressions ran.
- [ ] Confirm all excluded external surfaces and Task `0066` remain unchanged.
