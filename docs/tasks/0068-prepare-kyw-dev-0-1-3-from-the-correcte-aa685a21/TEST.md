# TEST 0068 — Prepare kyw-dev 0.1.3 from the Corrected Git Checkout Path

<!-- kyw-task-contract: 3 -->

## Status

PASSED

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
| T-01 | AC-01 — Dependency/main/tuple/workflow and unused-version preflight are exact and credential-free. | Validate dependency delivery and hashes; query public registry/GitHub; assert no account-auth command or UI inspection occurs. | External/integrity | PASS | Dispatcher and direct reads prove exact hardened Task `0067`, aligned main/workflow/tuple bytes, `latest=0.1.2`, and unused `0.1.3` without account authentication. |
| T-02 | AC-02 — Current identities become `0.1.3` without historical corruption. | Inspect all version owners, classify repository-wide version occurrences, and hash prior terminal pairs including Task `0066`. | Integration/integrity | PASS | Owner-aware inventory and focused version/install/foundation tests pass; Tasks `0064`–`0067` retain their exact baseline hashes and no historical/future pair is edited. |
| T-03 | AC-03 — Candidate and public truth remain distinct. | Assert repository/packed README and SPEC wording, public install commands, and absence of false publication/provenance/tag/Release/submission claims. | Documentation | PASS | README/SPEC and instruction/foundation coverage distinguish unpublished `0.1.3` from public `0.1.2`; published CLI examples stay pinned to `0.1.2`. |
| T-04 | AC-04 — Exact real-Git candidate contents and metadata are safe and reproducible. | Pack from the committed checkout; inspect inventory, manifests, README/legal/CLI, exclusions, dependencies/lifecycle, sizes, and independent digests; guard cleanup. | Distribution/security | PASS | Clean commit `dbbcaa229aa51e741c530c08ef423261378be454` reproducibly yields the exact 43-file candidate; independent archive inspection and guarded cleanup pass. |
| T-05 | AC-05 — Actual npm behavior continues to guarantee the `gitHead` condition. | Run the dependency's real temporary-Git/loopback fixture with directory-positive and tarball-negative controls. | Integration/fixture | PASS | The actual-npm fixture passes directory-positive, candidate-byte, tarball-negative, and anti-fabrication assertions. |
| T-06 | AC-06 — All required gates pass without external publication. | Run focused tests, four stable commands, release CI, one-attempt isolation, dry-run, and final candidate inspection. | Regression/release | PASS | Focused, Stable, release CI, one-attempt clean isolation, credential-cleared dry-run, and final committed-candidate inspection all pass without external mutation. |
| T-07 | AC-07 — Excluded external state, prior evidence, documents, and transaction remain exact. | Repeat registry/workflow/tag/Release reads, auth-command audit, prior-pair hashes, document measurements, matrix/diff review, pair validation, and transaction inspection. | Scope/policy | PASS | Final reads, hashes, measurements, 11-path diff mapping, pair validation, and `NONE / NO_TRANSACTION_EVIDENCE` prove a clean no-mutation handoff. |
| T-08 | AC-08 — Exact-main STANDARD delivery gates publication. | Require non-draft actual-head and merge checks, expected-head merge, post-main exact-SHA CI, and evaluator evidence. | Delivery | PASS | The terminal repository handoff is exact and publication remains blocked behind the declared GitHub-owned hardened `STANDARD` gate; mutable delivery evidence is not pre-claimed in this pair. |

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
- Executed selected/dependency pair validation and Task transaction inspection.
- Executed clean worktree/branch inspection, `git diff --check`, local/cached/direct/GitHub `main` comparison, and local/`HEAD`/`origin/main` workflow-blob comparison.
- Executed Task `0066` SHA-256 and `HEAD` diff checks.
- Executed read-only GitHub repository, PR `#55`, and exact-main CI reads.
- Executed cache-bypassed public `npm view` reads with distinct empty user/global configuration paths and cleared process-scoped npm auth variables; observed versions, dist-tags, published `0.1.2` metadata, and expected `0.1.3` `E404`.
- Executed the sole packaged dispatcher call for `$kyw-impl 0068`; it selected `IMPLEMENT` and reconstructed prior delivery continuity from hardened exact-SHA evidence.
- Executed active-pair validation and applied the dispatcher-provided continuity transition once on the selected Task branch.
- Executed the first eight-file focused command covering CLI/version, distribution, foundation, instructions, release harness, installation, workflow, and the actual-npm fixture.
- Executed the first narrow foundation/instruction rerun after adding current document-delta evidence and restoring the README sentence boundary.
- Re-executed the narrow foundation/instruction command after correcting the active marker baseline, then re-executed the complete eight-file focused command.
- Executed the exact changed-path verification planner and direct CLI version smoke.
- Executed standalone `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Executed `npm run release:ci`.
- Executed `node ./scripts/release-gate-isolation.mjs`.
- Executed `npm run release:check` with distinct empty npm user/global configuration paths and cleared process-scoped npm auth variables.
- Committed the scoped verified active state and captured exact Git root, source SHA, branch, and empty porcelain status before retained-candidate creation.
- Executed retained-candidate creation, read-only archive listing/manifest/content/hash inspection, guarded cleanup, and post-cleanup Git proof. Retained the first inspection-wrapper false failure, then re-executed with corrected top-level-path and empty-list classification.
- Re-executed credential-free public registry reads, publish-workflow/run/blob reads, tag and Release reads, exact remote-main reads, Tasks `0064`–`0067` pair hashes, Task `0069` diff, owner-aware version inventory, and permanent-document measurements.
- Executed final 11-path diff/matrix review, pair validation, Task transaction inspection, whitespace inspection, and package-input comparison to committed candidate source.
- Re-executed `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check` after entering `DONE/PASSED`.

## Results

- PASS — Task `0067` and Task `0068` validate, no Task transaction exists, and the initial worktree is clean.
- PASS — local `main`, `origin/main`, direct remote, and GitHub `main` all equal `872ff827a630d6fb39d8ad04e6fdb8e27d6d29a0`.
- PASS — PR `#55` is merged from exact head `7384570b9db0436db005b6700f30350e5e1e0e1f`, and post-main CI run `30559009784`, attempt `1`, succeeds at the exact merge SHA.
- PASS — workflow bytes match the worktree, `HEAD`, and `origin/main` at Git blob `117078f1c0fb87f12843ca77472a218b3f103e3c` and SHA-256 `a4b3d2cc30f514e021b01981833a2332e73e258f5c2f6e3b45d46950140bd6d8`.
- PASS — Task `0066` remains unchanged at SHA-256 `7bcb1d64417a25a2d1f88342806288a3dca8288d330a5a088cf922168664b9b7` / `5040e617ea3ef796f0bb91a899a9ff8f29e3426dca30f9f37ae830cbec1277c2`.
- PASS — public npm lists exactly `0.1.0`, `0.1.1`, and `0.1.2`, keeps `latest=0.1.2`, exposes no `0.1.2` `gitHead`, and returns `E404` for `0.1.3`; no npm account/settings surface was contacted.
- PASS — the dispatcher classified Task `0067` as `HARDENED_EXACT_HEAD`, retained Tasks `0030`–`0065` as `DURABLE_STANDARD_CONTINUITY`, and selected Task `0068` for implementation without fallback or retry.
- PASS — continuity advanced exactly once to 36 covered Tasks at checkpoint digest `bc9e222639800bf1cc2f3c03e463038be6f5f4a09eef3e4b7552508732fa836a`.
- FAIL — the first focused run passed 106/111. Three distribution checks and the foundation contract correctly stopped on missing current README/SPEC delta evidence; the remaining instruction assertion exposed a lowercased `Exact historical...` sentence boundary after the candidate/public wording edit.
- FAIL — the first narrow rerun passed 30/31: instruction coverage passed, while foundation reported that the new active marker must use Task `0067`'s terminal after-values as its immediate baseline.
- PASS — the corrected narrow foundation/instruction run passed 31/31.
- PASS — the final focused command passed 111/111, including CLI `0.1.3`, candidate/distribution guards, package/plugin/foundation parity, candidate/public documentation, install/update/recovery metadata, workflow authority guards, release-harness checks, and the actual-npm `gitHead` fixture.
- PASS — the exact eight-path planner selected `RELEASE`, and direct CLI smoke returned `0.1.3`.
- PASS — standalone `npm test` completed 395 tests with 392 passes, three explicit skips, and zero failures; lint covered 83 modules, format covered 345 files, and package selection covered 43 files / 129,328 bytes.
- PASS — `release:ci` reproduced 395/392/3/0 and the Stable checks, then produced a 43-file / 129,328-byte candidate at SHA-256 `40c510342755f6bd45c2aa27ed96ad4c60082e1d3b42d82d32fdb8aefa8dc966`.
- PASS — isolation completed `CLEAN` on attempt `1`, preserved normal npm/agents/Codex sentinels byte-for-byte, removed its approved root, and passed all direct and marketplace lifecycle steps with `kyw-dev-0.1.3.tgz` at the same SHA-256.
- PASS — credential-cleared `release:check` repeated the full release gate and completed `npm publish --dry-run --json` without publishing; dry-run metadata reports 43 entries, size `129328`, unpacked size `587422`, shasum `43e5ac074d3a04b17e82bc2d5214c3ac4279e9cc`, and integrity `sha512-ZZe7TeemHb4tZfdnFklF76gqI99bOi6ElGmZ0fL4hv07vdoAyoxgoSIETdU3LveOYtRhQO6bkkAsfq94096o3g==`.
- FAIL — the first independent wrapper rejected a valid candidate because it treated nested `package/skills/kyw-task/scripts/` as forbidden top-level development `scripts/` and treated an empty PowerShell pipeline serialized as `null` as a non-empty lifecycle list. The candidate had the expected digest and guarded cleanup still completed.
- PASS — the corrected wrapper reproduced the exact candidate from clean committed source SHA `dbbcaa229aa51e741c530c08ef423261378be454`: `kyw-dev-0.1.3.tgz`, 43 files, size `129328`, unpacked size `587422`, exact ten-entry top-level allowlist, required package/plugin/README/legal/CLI entries, package/plugin `0.1.3` parity, no dependencies/devDependencies/lifecycle hooks, no forbidden top-level development state, matching SHA-1/SHA-256/integrity, candidate/public README truth, MIT text, and CLI shebang.
- PASS — guarded cleanup returned `KYW_PACKED_RELEASE_CANDIDATE_CLEANUP / cleaned=true`; source HEAD/branch remained exact and post-cleanup status was empty.
- PASS — final public npm state remains versions `0.1.0`–`0.1.2`, `latest=0.1.2`, unchanged `0.1.2` integrity `sha512-P7i6cvCQmNIbz3bgB5TKIZpt0/Q55gqlHjzR9hl6rWnKCjjZeWe7uuPisBCK7c5PJ6qh6c6MDteAWw6EDecAHg==` and shasum `a54f67a307dae1243c94cd362bbb074b2216db9b`, absent `gitHead`, and `E404` for `0.1.3`.
- PASS — GitHub still has exactly publish run `30530304990`, attempt `1`, no tags or Releases, and active workflow ID `323508270` at exact main blob `117078f1c0fb87f12843ca77472a218b3f103e3c` / 11,411 bytes; no workflow or public mutation ran.
- PASS — Tasks `0064`–`0067` retain exact TASK/TEST SHA-256 pairs `3844ef6d...d5d104` / `30708022...41ce2`, `80027caa...36ff5` / `8cdf46cc...49311`, `7bcb1d64...9b7` / `5040e617...7c2`, and `419faf20...62ba` / `74ba2933...9850`; Task `0069` remains byte-stable.
- PASS — permanent documents measure README `16777/227`, AGENTS `3945/48`, SPEC `42006/452`, ARCHITECTURE `38557/792`, combined `101285/1519`, exactly matching the active delta evidence.
- PASS — final scope maps exactly 11 paths to current version identity, candidate/public durable truth, focused assertions, Task evidence, and continuity; no architecture, AGENTS, workflow, historical/future pair, dependency, lifecycle, lockfile, tag, Release, dispatch, account-authentication, or registry mutation is present.
- PASS — the terminal full-suite rerun completed 395/392/3/0; lint passed 83 modules, format passed 345 UTF-8/LF files, and package selection remained 43 files / 129,328 bytes.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16698 | 16777 | 227 | 227 | 79 | 0.47% | setup, usage, and contributor entry | Users and maintainers must see that repository metadata is the unpublished `0.1.3` candidate while public install commands and `latest` remain `0.1.2`. | Existing Start here and Release status sentences replace only the stale current-version identity; no section or historical release detail is added. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — routing, authority, delivery, and immutability rules do not change. | The repository-wide instruction surface remains byte-stable. |
| `docs/SPEC.md` | 41957 | 42006 | 452 | 452 | 49 | 0.12% | observable product behavior and acceptance | Product truth must distinguish the unpublished `0.1.3` metadata candidate from public `latest=0.1.2`. | Existing package-boundary and publication-state sentences replace only the stale current-version identity; release/authentication behavior and history remain in place. |
| `docs/ARCHITECTURE.md` | 38557 | 38557 | 792 | 792 | 0 | 0.00% | stable components, boundaries, dependencies, flows, and distribution | Not applicable — Task `0067` already owns the durable directory-publish and OIDC flow, which this version-only candidate does not change. | The architecture remains byte-stable because no component, boundary, dependency, or data flow changed. |
| `Combined` | 101157 | 101285 | 1519 | 1519 | 128 | 0.13% | all four permanent-document owners | README and SPEC must agree on candidate-versus-public identity without moving Task chronology into permanent truth. | Two existing sentences absorb the new identity; AGENTS and ARCHITECTURE remain unchanged and no permanent section is added. |

## Unverified

- Repository acceptance has no unverified required row. The non-draft PR, exact-head checks, merge, post-main run, and evaluator result required by `STANDARD` do not exist yet and remain the separate delivery gate.
- No production OIDC publish or public `0.1.3` exists or is claimed.

## Final Coverage Review

- [x] Compare the final diff and candidate to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for version, history, Git metadata, and failure branches.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
- [x] Confirm all excluded external surfaces and Task `0066` remain unchanged.
