# TEST 0064 — Harden the npm OIDC Trusted Publishing Workflow

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Hard dependency: delivered Task `0063`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Setup and contributor truth: `../../../README.md`
- Existing hosted CI: `../../../.github/workflows/ci.yml`
- Release owners: `../../../package.json`, `../../../scripts/packed-release-check.mjs`, `../../../scripts/lib/validate-foundation.mjs`
- Official npm Trusted Publishing requirements: `https://docs.npmjs.com/trusted-publishers/`
- Official npm trust command: `https://docs.npmjs.com/cli/v11/commands/npm-trust`
- Official GitHub manual-workflow requirements: `https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Publisher tuple matches without external configuration mutation. | Capture authenticated `npm trust list` JSON or the equivalent package-settings view, project only the provider/repository/file/environment/actions fields, compare case-sensitively, and verify external settings are unchanged. | External/read-only | PASS | Authenticated settings proved the exact tuple; foundation/workflow tests bind it case-sensitively, and the untouched edit view was cancelled. |
| T-02 | AC-02 — Manual trigger and exact event/ref/repository/SHA/version guards fail closed. | Parse the workflow and exercise a repository-owned guard helper or deterministic fixtures for valid main dispatch and every mismatched input/event branch. | Contract/integration | PASS | Workflow contract and mutation variants prove manual-only trigger plus exact event/repository/main/input/event/checkout/package/plugin gates. |
| T-03 | AC-03 — OIDC permissions and supply-chain hardening are minimal. | Assert runner class, timeout, concurrency, exact Action SHAs, checkout/cache settings, permission map, and absence of token/secret/interactive or broad write references. | Security/static | PASS | Focused static proof found only job-scoped `contents: read`/`id-token: write`, exact existing Action SHAs, disabled credentials/cache, bounded runtime/concurrency, and no token/OTP reference. |
| T-04 | AC-04 — One retained exact candidate is safe and compatible. | Exercise the candidate helper in owned temporary directories; inspect its archive and JSON; inject unsafe roots, collisions, malformed pack output, hygiene failures, and cleanup cases; rerun disposable candidate behavior. | Integration/security | PASS | Real retained/disposable candidates, exact JSON/archive/digest checks, unsafe-root/collision/malformed/hygiene fixtures, and guarded cleanup all passed. |
| T-05 | AC-05 — The workflow verifies then publishes exactly once through OIDC. | Statistically count publish and pack paths, prove ordered stable/candidate/absence gates, check runtime minimum enforcement, and reject retry, token fallback, independent dist-tag, tag, and Release commands. | Release contract | PASS | Static ordering/count proof finds Stable → one retained pack → 404-only absence → one exact-path publish → cleanup, with minimums and zero-retry/no-fallback guards. No workflow run occurred. |
| T-06 | AC-06 — Every failure and ambiguity branch stops before another mutation. | Run focused fixtures for tuple/environment, trigger/ref/SHA/version, unsafe candidate, occupied version, permission/token, duplicate publish, retry, and ambiguous-result cases. | Failure/security | PASS | The corrected mutation suite rejects all 23 authority/identity/candidate/occupied/ambiguous/retry weakenings; helper failure fixtures clean partial owned state. |
| T-07 | AC-07 — Current CI, delivery roles, package, and release commands remain compatible. | Compare `ci.yml` behavior and required names, run hosted-CI/planner/foundation/distribution regressions, and assert no dependency, lockfile, lifecycle, or package-allowlist drift. | Regression | PASS | The first PR head exposed the macOS alias bug; physical-parent normalization plus an ancestor-alias regression now pass focused/full Release checks without CI, dependency, lifecycle, lockfile, or allowlist drift. |
| T-08 | AC-08 — Permanent truth owns the new boundary without duplication. | Run foundation and instruction-surface projections; inspect README/SPEC/architecture/AGENTS ownership and contradictions. | Documentation/policy | PASS | Foundation/instruction tests and exact delta evidence pass; README/SPEC/architecture align while AGENTS remains unchanged. |
| T-09 | AC-09 — Focused, Stable, Release, and permanent-document evidence is complete. | Run the exact planner, focused suite, four stable commands, non-publishing release checks, and validate the retained-baseline four-document delta table. | Verification | PASS | Corrected focused 47/47, current release CI 390/393 with three skips, lint/format/pack, clean isolation, planner, and exact document evidence pass. |
| T-10 | AC-10 — Scope, immutable history, no publication, transaction cleanliness, and `STANDARD` gating hold. | Compare final diff and prior-pair hashes, inspect workflow runs/registry/tags/Releases/submission state read-only, validate the pair/queue, inspect transaction residue, and retain external delivery as unverified until completed. | Delivery/integrity | PASS | The correction remains inside mapped helper/test/evidence paths, prior terminal/critical owners stay unchanged, no publication mutation occurred, and corrected exact-head delivery remains separate. |

## Regression Coverage

- Existing `ci.yml` triggers, permissions, exact checkout roles, job names, OS/runtime matrix, required aggregate, and post-main evidence remain unchanged.
- `npm run release:candidate`, `npm run release:ci`, and `npm run release:check` retain their current non-publishing meanings.
- Package allowlist, legal bytes, plugin/package parity, CLI smoke, no dependency fields, no lockfile, no lifecycle scripts, and safe temporary cleanup remain enforced.
- Verification planning treats the new workflow and candidate-helper changes as Release-sensitive.
- Task queue, terminal-pair immutability, rolling continuity, publication authority, and exact-head delivery remain fail closed.
- No GitHub secret, npm token, trusted-publisher configuration, version, dist-tag, tag, Release, or public submission is mutated.

## Commands

- Planned publisher preflight: `npm trust list kyw-dev --json --registry=https://registry.npmjs.org/`, retaining only non-secret tuple fields and no auth-session material.
- Planned registry baseline: `npm view kyw-dev versions dist-tags --json --registry=https://registry.npmjs.org/` and an expected-absence lookup for `kyw-dev@0.1.2`.
- Planned focused tests: `node --test test/publish-workflow.test.mjs test/distribution.test.mjs test/verification-plan.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs`.
- Planned release routing: `npm run verify:plan -- .github/workflows/publish.yml scripts/packed-release-check.mjs test/publish-workflow.test.mjs test/distribution.test.mjs test/verification-plan.test.mjs README.md docs/SPEC.md docs/ARCHITECTURE.md`.
- Planned stable checks: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Planned non-publishing release checks: `npm run release:ci` and `node ./scripts/release-gate-isolation.mjs`; run `npm run release:check` only if the final planner and Task scope require the registry dry-run boundary.
- Planned workflow static proof: inspect parsed trigger, permissions, concurrency, environment projection, action SHAs, step order, publish count, token absence, and failure fixtures without calling `gh workflow run`.
- Planned immutable-history proof: hash-compare Task `0063` and all earlier contract-3 terminal pairs against aligned `main`.
- Planned Task validation: `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this-task-directory>`.
- Planned transaction proof: `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- Planned final repository checks: `git status --short`, `git diff --check`, full mapped diff inspection, workflow-run absence, registry version/dist-tag reads, and read-only tag/Release/public-submission inspection.
- Planned delivery proof: capture the separate non-draft PR actual-head checks, synthetic merge compatibility, expected-head merge, post-main exact-SHA CI, and evaluator result through `$kyw-impl`; do not edit this pair after its first hardened delivery.
- Executed `node --version`, `npm --version`, and authenticated `npm whoami --registry=https://registry.npmjs.org/`.
- Executed `npm trust list kyw-dev --json --registry=https://registry.npmjs.org/ --loglevel=error`; it stopped at `EOTP` before returning settings. Deleted the one exact npm debug log containing authentication-session material.
- Executed authenticated read-only npm package-settings inspection, projected only provider/repository/workflow/environment/action/access fields, opened the untouched trusted-publisher edit view solely to expose all configured fields, and cancelled without saving.
- Read current official npm Trusted Publishing/npm-trust and GitHub manual-workflow/workflow-syntax documentation.
- Executed the first focused command `node --test test/publish-workflow.test.mjs test/distribution.test.mjs test/verification-plan.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs`; it passed 42/47 and retained five failures.
- Executed the corrected focused command after delta and mutation-harness fixes; it passed 47/47.
- Executed `npm run format:check` and `npm run lint`; they passed over 338 UTF-8/LF files and 82 JavaScript modules/foundation metadata.
- Executed the exact 19-path `npm run verify:plan -- ...`; it selected `RELEASE`, one five-leaf local command, and retained hosted exact-SHA PR/main requirements.
- Re-executed the five-file focused command after the final archive-report hardening; it passed 47/47.
- Executed standalone `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Executed planner-required `npm run release:ci` and `node ./scripts/release-gate-isolation.mjs`; did not run `npm run release:check` because the final plan did not require the separate registry dry-run boundary.
- Executed cache-bypassed public registry metadata/version reads, GitHub workflow-registration/run reads, local/remote tag reads, GitHub Release reads, and a read-only public-search check; no workflow dispatch or external mutation command ran.
- Executed final aligned-main/status/diff/critical-owner/prior-pair/temp-root inspection, all three pair validations, and transaction inspection.
- Re-executed `npm test` after entering `DONE/PASSED` to validate the terminal queue/continuity lifecycle.
- Executed authenticated `gh` PR/check/run/job inspection for PR `#52`, including the bundled `gh-fix-ci` inspector first under default encoding and then under Python UTF-8 mode, without requesting a workflow rerun.
- Executed the corrected focused command, `npm run release:ci`, and `node ./scripts/release-gate-isolation.mjs`.
- Re-executed `npm test` after restoring corrected `DONE/PASSED` lifecycle state.

## Results

- PASS — the selected and dependency pairs validated, Task transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`, and Tasks `0064`–`0066` are the only worktree paths, each as an explained pre-created `READY/READY` pair before execution began.
- PASS — local `HEAD`, local `main`, fetched `origin/main`, direct remote `main`, and GitHub `main` all equal `59664f4f02c58e9703776bb8ad9a40a2e658d7d5`; Task `0063` is unchanged from `HEAD`.
- PASS — the sole packaged dispatcher call selected `0064` for `IMPLEMENT`, classified Tasks `0030`–`0062` as `DURABLE_STANDARD_CONTINUITY`, freshly evaluated Task `0063` as `HARDENED_EXACT_HEAD`, and prepared one opaque transition without retry or manual delivery input.
- PASS — active-pair validation succeeded and the opaque transition applied exactly once, advancing the fixed-bounded checkpoint through Task `0063` at digest `d0b2656132acd9f0f0197c3fbba2efba3aded7cb3a1dcafc0ecfb412ea326e1d`.
- PASS — local runtime is Node.js `24.11.0` with npm `11.18.0`, authenticated as `kimyw`, satisfying both the OIDC publication minimum and the newer `npm trust` command minimum.
- BLOCKED → PASS — non-interactive `npm trust list` stopped at npm's `EOTP` security verification before returning publisher data. The single generated auth-session debug log was deleted immediately, then the authenticated package-settings view supplied equivalent read-only evidence without any save or configuration mutation.
- PASS — the configured tuple is provider `GitHub Actions`, organization/user `kimyeongwoo`, repository `kyw-dev`, workflow `publish.yml`, environment `npm-production`, with `npm publish` allowed and `npm stage publish` not allowed. Package access is `public`, and publishing access requires 2FA while disallowing bypass-2FA tokens.
- FAIL — the first five-file focused run passed 42/47 tests. Four failures were the expected foundation cascade from missing current permanent-document delta evidence after README/SPEC/architecture edits; the remaining failure showed that one intentional workflow weakening was not yet rejected by the mutation harness.
- PASS — the exact permanent-document delta table cleared the foundation cascade, the retained-candidate helper again produced the exact 43-file / 128,771-byte / SHA-256 `fe83330252a44fbea946579a77e76449ebcb071df87299aa74705e818a5dd70f` package and removed its owned root, and the corrected focused suite passed 47/47.
- PASS — the exact changed-path plan selected `RELEASE`; formatting passed 338 UTF-8/LF files, lint passed 82 JavaScript modules and foundation metadata, pair validation succeeded, transaction state remains `NONE / NO_TRANSACTION_EVIDENCE`, and `git diff --check` passed.
- PASS — the final hardened focused rerun passed 47/47. Standalone Stable verification completed 393 tests with 390 passes, three explicit skips, and zero failures; lint covered 82 JavaScript modules, format covered 338 UTF-8/LF files, and pack selection covered 43 files / 128,953 bytes.
- PASS — `npm run release:ci` repeated the Stable result and validated the current 43-file / 128,953-byte tarball at SHA-256 `e3287e4de7172f69e1d2f4394e7597865f688eedca714a1c47b4409e9199133d`. The final Release plan did not select `npm run release:check`, so no registry dry-run was performed or claimed.
- PASS — release isolation returned `CLEAN` in one attempt, matched the same tarball bytes, passed every direct and marketplace step, kept normal npm/Agents/Codex sentinels unchanged, removed its owned root, and left zero candidate temporary roots.
- PASS — cache-bypassed registry reads list only `0.1.0` and `0.1.1`, keep `latest` at `0.1.1`, and return HTTP 404 for `0.1.2`. The last 100 Actions runs contain no trusted-publish run and `publish.yml` is not registered before merge; local/remote tags and GitHub Releases are empty, public search returned no `kyw-dev` plugin submission, and no publication/settings/submission mutation command ran.
- PASS — local `HEAD`, local `main`, direct `origin/main`, and GitHub `main` remain aligned at `59664f4f02c58e9703776bb8ad9a40a2e658d7d5`. All three earlier contract-3 terminal pairs (`0061`–`0063`) have no worktree diff, and `AGENTS.md`, `ci.yml`, package/plugin version owners, dependencies, lifecycle fields, lockfiles, and package allowlist remain unchanged.
- PASS — the exact final 19-path plan retained `RELEASE`; Tasks `0064`–`0066` validate, transaction inspection remains `NONE / NO_TRANSACTION_EVIDENCE`, `git diff --check` passes, and no owned candidate root remains.
- PASS — the terminal-lifecycle `npm test` rerun reproduced 393 tests with 390 passes, three explicit skips, zero failures, and a valid repository-only `STANDARD` handoff.
- FAIL — PR `#52` exact head `8ab7c465d6686e038d09336cc69421179d48b98f` completed with both macOS Node 22/24 behavioral jobs failing and the required aggregate consequently failing. Ubuntu/Windows behavioral, Ubuntu Node 26 compatibility, quality, packed-release, and synthetic-merge roles passed.
- FAIL → PASS — the bundled PR-check inspector initially failed locally because Windows CP949 could not decode UTF-8 Actions output. Re-running the same read-only inspection with Python UTF-8 mode succeeded; this was a diagnostic-tool encoding failure, not a CI or repository failure.
- FAIL — both macOS logs identify `test/distribution.test.mjs`'s collision fixture: it expected `already exists` but received `Requested candidate root must be a direct child of its temporary parent`. The physical parent is `/private/var/...` while the lexical candidate parent retains `/var/...`; no workflow rerun was requested.
- PASS — the correction canonicalizes both existing parent directories before comparing direct-child identity, retains final physical root parent/name/structure checks, and adds a cross-platform ancestor-alias fixture. The corrected focused suite passed 47/47.
- PASS — corrected `npm run release:ci` completed 393 tests with 390 passes, three explicit skips, and zero failures; lint covered 82 modules, format covered 338 files, and pack/candidate evidence remained 43 files / 128,953 bytes / SHA-256 `e3287e4de7172f69e1d2f4394e7597865f688eedca714a1c47b4409e9199133d`.
- PASS — corrected release isolation returned `CLEAN` in one attempt, preserved all normal-state sentinels, passed direct/marketplace lifecycles, and removed its owned root.
- PASS — the corrected terminal-lifecycle `npm test` rerun completed 393 tests with 390 passes, three explicit skips, zero failures, and a valid repository-only `STANDARD` handoff.

### Final changed-path map

| Paths | Scope / acceptance |
|---|---|
| `.github/workflows/publish.yml` | Manual trigger, exact identity, least privilege, retained-candidate ordering, 404-only preflight, one OIDC publish, and cleanup — AC-02, AC-03, AC-05, AC-06. |
| `scripts/packed-release-check.mjs`; `scripts/lib/validate-foundation.mjs`; `scripts/verification-plan.mjs` | Exact publisher owner, safe retained/disposable candidate contract, and Release routing — AC-01, AC-04, AC-07. |
| `test/publish-workflow.test.mjs`; `test/distribution.test.mjs`; `test/foundation.test.mjs`; `test/instruction-surfaces.test.mjs`; `test/verification-plan.test.mjs` | Valid-path, mutation, cleanup, package, document, and planner regression proof — AC-02 through AC-09. |
| `README.md`; `docs/SPEC.md`; `docs/ARCHITECTURE.md` | Durable manual OIDC, provenance, flow, and separate-authority truth — AC-08. |
| `docs/tasks/.kyw-dev-standard-delivery-continuity.json` | Exactly-once Task `0063` hardened-continuity transition for selected execution — AC-10. |
| `docs/tasks/0064-harden-the-npm-oidc-trusted-publishing-workflow/{TASK.md,TEST.md}` | Current scope, decisions, acceptance, failures, commands, results, deltas, and handoff evidence — AC-01 through AC-10. |
| `docs/tasks/0065-prepare-kyw-dev-0-1-2-on-main-for-oidc-e0cb8852/{TASK.md,TEST.md}`; `docs/tasks/0066-publish-and-prove-kyw-dev-0-1-2-through-npm-oidc/{TASK.md,TEST.md}` | Preserved byte-unchanged pre-created dependency contracts from the atomic authoring set; neither future Task is implemented — AC-10. |

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 15077 | 15546 | 227 | 227 | 469 | 3.11% | setup, usage, and contributor entry | Maintainers need the manual OIDC workflow, exact-input, tokenless, and separate-authority usage boundary. | The existing Release status section replaces two shorter publication-evidence lines with the complete current maintainer contract. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — existing publication authority and completion rules remain sufficient. | The repository-wide rule surface remains byte-stable; Task-specific evidence stays in this pair. |
| `docs/SPEC.md` | 39199 | 40489 | 447 | 452 | 1290 | 3.29% | observable product behavior and acceptance | Manual-only OIDC behavior, fail-closed identity/candidate gates, one-publish semantics, and provenance are durable product acceptance. | Existing MVP acceptance and publication-state sections absorb the new contract without a separate specification document. |
| `docs/ARCHITECTURE.md` | 34944 | 36809 | 735 | 767 | 1865 | 5.34% | stable components, boundaries, dependencies, flows, and distribution | The trusted-workflow component, job-scoped OIDC flow, retained exact-candidate handoff, cleanup, and evidence states are durable architecture. | Existing distribution/publication and validation/CI sections absorb one bounded trusted-publication subsection and replace stale single-workflow wording. |
| `Combined` | 93165 | 96789 | 1457 | 1494 | 3624 | 3.89% | all four permanent-document owners | README, SPEC, and ARCHITECTURE must agree on the new manual OIDC boundary while AGENTS stays unchanged. | Existing owner sections absorb the workflow contract; detailed algorithms and evidence remain in source, tests, and this pair. |

## Unverified

- Repository acceptance has no unverified required row. GitHub has not yet interpreted the new workflow from default-branch bytes, and OIDC authentication/publication remains intentionally reserved for the later authorized publication Task.
- No `publish.yml` run, npm publication, `0.1.2` registry object, provenance, or dist-tag change exists or is claimed by this Task.
- The non-draft PR, exact-head CI, merge, post-main run, and evaluator result required by `STANDARD` do not exist yet.

## Final Coverage Review

- [x] Compare the final diff and workflow/helper behavior to every matrix row.
- [x] Map every acceptance criterion to one or more executed test rows.
- [x] Cover valid dispatch plus every identity, permission, token, candidate, occupied-version, retry, and ambiguity failure branch.
- [x] Confirm current CI/release/package behavior and immutable prior pairs remain intact.
- [x] Confirm no workflow dispatch, publication, bump, dist-tag, tag, Release, public submission, or settings mutation occurred.
- [x] Confirm permanent-document deltas, pair validation, transaction cleanliness, and the separate `STANDARD` gate are auditable.
