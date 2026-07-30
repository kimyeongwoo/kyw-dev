# TEST 0065 — Prepare kyw-dev 0.1.2 on main for OIDC Publication

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Hard dependency: the delivered trusted-publishing workflow Task named in `TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Setup and release truth: `../../../README.md`
- Release owners: `../../../package.json`, `../../../.codex-plugin/plugin.json`, `../../../scripts/lib/validate-foundation.mjs`, `../../../scripts/packed-release-check.mjs`
- Publishing workflow: `../../../.github/workflows/publish.yml`
- Registry baseline: public `kyw-dev@0.1.0` and `0.1.1`, `latest` at `0.1.1`, and absent `0.1.2` at authoring

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Delivered workflow/publisher state and unused-version preflight are exact. | Validate dependency delivery and hashes; read trusted-publisher tuple; query versions/latest and require expected absence before edits and terminalization. | External/integrity | PASS | Task `0064` delivery evaluated as hardened exact-head; workflow blobs match; authenticated settings match; registry lists `0.1.0`/`0.1.1`, `latest=0.1.1`, and `0.1.2` returns `E404`. |
| T-02 | AC-02 — All current release identities become `0.1.2` without historical corruption. | Inspect owners, run focused assertions, and classify repository-wide `0.1.0`, `0.1.1`, and `0.1.2` searches by current versus historical ownership. | Integration | PASS | Current owners/assertions are `0.1.2`; remaining non-Task `0.1.1` is only public registry/install truth; focused/current-version and full-suite checks pass. |
| T-03 | AC-03 — Candidate and public registry truth remain explicitly distinct. | Assert repository/packed README and SPEC candidate wording, public `latest` wording, install commands, and absence of false publication/provenance/tag/Release/submission claims. | Documentation/integration | PASS | README/SPEC and the packed README identify the unpublished `0.1.2` candidate while public commands/`latest` remain `0.1.1`; focused guards pass. |
| T-04 | AC-04 — Exact candidate contents and safety remain valid. | Prepare one candidate; inspect allowlist, manifests, README, legal bytes, CLI, exclusions, dependency/lifecycle fields, file count, sizes, and digests. | Distribution/security | PASS | One retained 43-file candidate passed helper and independent inventory/digest/manifest/README/dependency/lifecycle checks, then guarded cleanup removed its owned root. |
| T-05 | AC-05 — Version-sensitive and adjacent regressions pass. | Run focused CLI, distribution, foundation, instruction, release-evidence, workflow, and skill-installation tests, then the full stable suite. | Regression | PASS | Initial focused 103/109 exposed stale projections; corrected focused is 109/109 and Stable is 390/393 with three explicit skips and zero failures. |
| T-06 | AC-06 — Permanent-document deltas and ownership are exact. | Measure all four documents against retained baseline, record the canonical delta table, and run foundation/instruction guards. | Policy | PASS | Canonical delta table matches measured bytes/lines; foundation/instruction guards pass with README +142 bytes, SPEC +170, and AGENTS/architecture unchanged. |
| T-07 | AC-07 — Release routing, gates, and candidate evidence are reproducible without publication. | Run planner, four stable commands, release candidate, isolation, dry-run, and exact candidate inspection; retain exact metadata. | Release | PASS | Planner selected Release; Stable, release CI, clean isolation, dry-run, and retained-candidate inspection all passed on the same 43-file / 128,987-byte candidate. |
| T-08 | AC-08 — Workflow and all excluded external surfaces remain unchanged. | Hash workflow/dependency bytes; inspect workflow runs, registry versions/tags, Git tags/Releases, and submission artifacts read-only; reject any mutating command. | External/scope | PASS | Workflow blob remains exact with no run; registry stays `0.1.0`/`0.1.1`; no tag or Release exists; no publication/submission mutation command ran. |
| T-09 | AC-09 — Final scope, immutable history, clean transaction, and `STANDARD` dependency gating hold. | Map final diff, validate pair/queue, hash prior terminal pairs, inspect transaction state, and retain PR/main exact-SHA delivery as a separate unclaimed gate. | Delivery/integrity | PASS | Final 11-path diff is mapped; 128 prior pair files are unchanged; pairs validate, transaction is clean, and `STANDARD` remains an unclaimed external gate. |

## Regression Coverage

- CLI version/help/usage, plugin manifest, installer doctor output, package metadata, foundation owner projection, and packed filename derive from one current version.
- Package allowlist, legal notices, zero dependencies, no lockfile, no lifecycle scripts, isolated direct/plugin installation, and candidate cleanup remain enforced.
- Historical `0.1.0` and `0.1.1` Task/Test and registry evidence is preserved rather than globally rewritten.
- `publish.yml` remains manual-only, tokenless, exact-main/SHA/version gated, byte-stable, and untriggered.
- `ci.yml` exact-head roles, verification planning, Task queue/continuity, terminal immutability, and publication authority remain unchanged.
- README/SPEC candidate-versus-public wording remains truthful in both repository and packed bytes.

## Commands

- Planned registry preflight: `npm view kyw-dev versions dist-tags --json --registry=https://registry.npmjs.org/` and `npm view kyw-dev@0.1.2 version --json --registry=https://registry.npmjs.org/` with expected `E404`.
- Planned publisher/workflow proof: authenticated read-only `npm trust list kyw-dev --json`, exact workflow hash comparison to the delivered dependency, and `gh workflow view publish.yml --repo kimyeongwoo/kyw-dev --yaml`.
- Planned focused regressions: `node --test test/cli.test.mjs test/distribution.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs test/release-evidence-harness.test.mjs test/skill-installation.test.mjs test/publish-workflow.test.mjs`.
- Planned version/history inventory: owner-aware `rg` searches for `0.1.0`, `0.1.1`, `0.1.2`, candidate/public wording, provenance claims, and excluded publication surfaces.
- Planned release routing: `npm run verify:plan -- package.json .codex-plugin/plugin.json README.md docs/SPEC.md scripts/lib/validate-foundation.mjs test/cli.test.mjs test/distribution.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs test/release-evidence-harness.test.mjs test/skill-installation.test.mjs`.
- Planned stable checks: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Planned release gates: `npm run release:ci`, `node ./scripts/release-gate-isolation.mjs`, and `npm run release:check`; the last command is dry-run-only and grants no publish authority.
- Planned exact candidate proof: invoke the delivered retained-candidate helper in a Task-owned temporary directory, inspect its JSON and archive, compute independent SHA-1/SHA-256/SHA-512, compare the allowlist, then remove only exactly proven Task-owned temporary state.
- Planned no-mutation proof: read-only `gh run list`, Git tag/Release inspection, registry version/dist-tag reads, and confirmation that no `gh workflow run`, direct `npm publish`, `npm dist-tag`, tag, Release, or submission command ran.
- Planned Task validation: `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this-task-directory>`.
- Planned transaction proof: `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- Planned final checks: `git status --short`, `git diff --check`, complete mapped diff inspection, dependency/prior-pair hashes, and exact retained-baseline document table validation.
- Planned delivery proof: complete non-draft PR actual-head, synthetic merge, expected-head merge, post-main exact-SHA CI, and evaluator evidence through `$kyw-impl`; do not publish during delivery.
- Executed selected/dependency pair validation, transaction inspection, clean status, local/fetched/direct/GitHub `main` alignment, and the sole packaged dispatcher call for `$kyw-impl 0065`.
- Executed `apply-continuity`; the first shell command failed during CLI argument parsing before token validation or mutation, and the subsequent exact opaque argument applied once.
- Executed Git/GitHub workflow blob comparison, `gh workflow view publish.yml --yaml`, and read-only `gh run list --workflow publish.yml`; all workflow blobs equal `74c393fa6e342b7cd1db2ef99489d6e7cc465533` and the workflow run list is empty.
- Executed `npm view kyw-dev versions dist-tags --json`, `npm view kyw-dev@0.1.2 version --json`, `npm whoami`, and non-interactive `npm trust list`; public state matched, the target returned `E404`, identity was `kimyw`, and trust-list stopped with `EOTP` before returning settings.
- Executed authenticated read-only npm package-settings inspection, opened the existing trusted-publisher edit surface only to expose configured fields, and cancelled without saving.
- Executed owner-aware repository searches for `0.1.0`, `0.1.1`, and `0.1.2`, then `git diff --check`.
- Executed the first focused command; it passed 103/109 and retained six failures caused by two stale version projections.
- Re-executed the focused command after the bounded projection corrections; it passed 109/109.
- Executed the exact 11-path `npm run verify:plan -- ...`; it selected `RELEASE`, one local Release command, and retained hosted exact-SHA PR/main requirements.
- Executed standalone `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Executed `npm run release:ci`, `node ./scripts/release-gate-isolation.mjs`, and `npm run release:check`; the final command performed only `npm publish --dry-run --json`.
- Executed `node ./scripts/packed-release-check.mjs --retain-candidate`, independent SHA-1/SHA-256/SHA-512 and tar inventory/manifest/README checks, and the helper's exact-root cleanup mode.
- Re-executed fetched/direct/GitHub `main`, registry versions/latest/target absence, workflow blob/run history, local/remote tags, and GitHub Releases read-only. The first `gh release list` projection rejected unsupported field `url`; the corrected supported-field command returned `[]`.
- Executed final numbered-pair diff and 128-file path/hash manifest proof, critical-owner immutability checks, temporary candidate-root inventory, exact permanent-document measurements, Task `0065`/`0066` validation, transaction inspection, `git diff --check`, status, and complete mapped diff review.
- Re-executed `npm test` after entering `DONE/PASSED` to validate the terminal queue and continuity lifecycle.
- Revalidated the terminal pair, re-executed `npm run format:check`, and repeated `git diff --check`, status, and final stat inspection immediately before commit.

## Results

- PASS — the selected and dependency pairs validate, Task transaction inspection reports `NONE / NO_TRANSACTION_EVIDENCE`, the tracked worktree was clean, and local/fetched/direct/GitHub `main` align at `96b1d120f02c518fcb5f550af524ec035711fef6`.
- PASS — the sole packaged dispatcher call selected Task `0065` for `IMPLEMENT`, classified Tasks `0030`–`0063` as `DURABLE_STANDARD_CONTINUITY`, freshly evaluated Task `0064` as `HARDENED_EXACT_HEAD`, and prepared one opaque transition without retry or manual delivery input.
- FAIL → PASS — the first local continuity-apply command was rejected by CLI argument parsing before token validation or filesystem mutation. Passing the dispatcher output as one opaque argument then applied it exactly once and advanced the checkpoint through Task `0064` at digest `c10bd9c40d700f21c34ca55795bed6829e440445c34b14d6603a350f438991dc`.
- PASS — registered GitHub `publish.yml`, Task `0064` head, local `main`, and GitHub `main` share blob `74c393fa6e342b7cd1db2ef99489d6e7cc465533`; its run list is empty.
- PASS — public npm versions remain exactly `0.1.0` and `0.1.1`, `latest` remains `0.1.1`, and the execution-time `0.1.2` lookup returns `E404`.
- BLOCKED → PASS — non-interactive `npm trust list` stopped with `EOTP` before returning settings. Authenticated read-only package settings proved provider `GitHub Actions`, organization/user `kimyeongwoo`, repository `kyw-dev`, workflow `publish.yml`, environment `npm-production`, `npm publish` allowed, `npm stage publish` disallowed, public access, and the restrictive 2FA/token posture; the form was cancelled unchanged.
- PASS — current source/package/plugin/foundation/installer/release assertions now identify `0.1.2`; every remaining non-Task `0.1.1` occurrence is intentionally public-current registry or install-command truth, and `git diff --check` passes.
- FAIL — the first focused run passed 103/109. Foundation still projected README's current source version through `Version 0.1.1`, cascading into three distribution and two foundation failures; the historical-evidence sentence also failed one case-sensitive instruction assertion.
- PASS — the bounded correction updated the foundation anchor to `0.1.2` and restored the stable sentence boundary. The focused suite then passed 109/109.
- PASS — the exact changed-path planner selected `RELEASE`. Standalone Stable verification completed 393 tests with 390 passes, three explicit skips, and zero failures; lint covered 82 JavaScript modules, format covered 338 UTF-8/LF files, and package selection covered 43 files / 128,987 bytes.
- PASS — `npm run release:ci` reproduced the Stable result and candidate SHA-256 `b1dd93882aa94c7839a904a47e7175f55838003bb31c4e65bc61572715f78392`.
- PASS — release isolation returned `CLEAN` in one attempt, matched `kyw-dev-0.1.2.tgz` at 43 files / 128,987 bytes / the same SHA-256, preserved all protected sentinels, completed direct/marketplace lifecycles, and removed its owned root.
- PASS — `npm run release:check` repeated Release CI and completed `npm publish --dry-run --json` only. It reported 128,987 packed bytes, 586,333 unpacked bytes, 43 entries, shasum `a54f67a307dae1243c94cd362bbb074b2216db9b`, and integrity `sha512-P7i6cvCQmNIbz3bgB5TKIZpt0/Q55gqlHjzR9hl6rWnKCjjZeWe7uuPisBCK7c5PJ6qh6c6MDteAWw6EDecAHg==` without publishing.
- PASS — the retained candidate independently matched all three recorded digests, package/plugin `kyw-dev@0.1.2` parity, packed README candidate/public wording, zero dependency fields, zero lifecycle scripts, and the exact 43-file allowlist. Guarded helper cleanup exited successfully and the owned root no longer exists.
- PASS — final local/cached/direct/GitHub `main` all equal `96b1d120f02c518fcb5f550af524ec035711fef6`; final npm reads still list `0.1.0`/`0.1.1`, keep `latest=0.1.1`, and return `E404` for `0.1.2`.
- PASS — local and GitHub `publish.yml` still share blob `74c393fa6e342b7cd1db2ef99489d6e7cc465533` and its run list is empty. Local/remote tags and GitHub Releases are empty; the first Release-list diagnostic failed only because `url` is unsupported, and the corrected query returned `[]`.
- PASS — all 128 prior Task/Test files match `main`; their path/hash manifest SHA-256 is `5f24152bde7fdb3114aeadca6dd6746243871e350d008cea3357ad683e47d33c`. Numbered-pair diff contains only this Task/Test pair.
- PASS — README 15,688 bytes / 227 lines, AGENTS 3,945 / 48, SPEC 40,659 / 452, and architecture 36,809 / 767 exactly match the delta table. Architecture, AGENTS, `publish.yml`, and Task `0064` remain unchanged.
- PASS — final changed paths are package/plugin identities; README/SPEC candidate truth; foundation owner/projection; instruction/release/installer assertions; the causal continuity checkpoint; and this evidence pair. Every path maps to T-01 through T-09, no uncovered branch or scope drift remains, Task `0065`/`0066` validate, transaction state is `NONE / NO_TRANSACTION_EVIDENCE`, zero candidate temp roots remain, and `git diff --check` passes.
- PASS — the terminal-lifecycle full-suite rerun completed 393 tests with 390 passes, three explicit skips, zero failures, and a valid repository-only `STANDARD` handoff.
- PASS — final pair validation succeeds, terminal formatting again covers 338 UTF-8/LF files, and the pre-commit whitespace/status/stat inspection is clean and scoped to 11 mapped paths.

### Exact candidate inventory

```text
.codex-plugin/plugin.json
bin/kyw-dev.mjs
LICENSE
licenses/mattpocock-skills-MIT.txt
package.json
README.md
skills/kyw-audit/agents/openai.yaml
skills/kyw-audit/references/audit.md
skills/kyw-audit/SKILL.md
skills/kyw-grilling/agents/openai.yaml
skills/kyw-grilling/SKILL.md
skills/kyw-impl/agents/openai.yaml
skills/kyw-impl/references/execution.md
skills/kyw-impl/SKILL.md
skills/kyw-init/agents/openai.yaml
skills/kyw-init/SKILL.md
skills/kyw-task/agents/openai.yaml
skills/kyw-task/scripts/task-artifacts.mjs
skills/kyw-task/SKILL.md
src/cli/run.mjs
src/core/package-info.mjs
src/core/skill-installation-doctor.mjs
src/core/skill-installation-inventory.mjs
src/core/skill-installation-shared.mjs
src/core/skill-installation-state.mjs
src/core/skill-installation-transaction.mjs
src/core/skill-installation.mjs
src/core/task-artifact-continuity.mjs
src/core/task-artifact-contract.mjs
src/core/task-artifact-creation.mjs
src/core/task-artifact-delivery.mjs
src/core/task-artifact-hydration.mjs
src/core/task-artifact-queue.mjs
src/core/task-artifact-shared.mjs
src/core/task-artifacts.mjs
src/core/template-contracts.mjs
templates/project/AGENTS.md
templates/project/ARCHITECTURE.md
templates/project/README.md
templates/project/SPEC.md
templates/task/TASK.md
templates/task/TEST.md
THIRD_PARTY_NOTICES.md
```

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 15546 | 15688 | 227 | 227 | 142 | 0.91% | setup, usage, and contributor entry | Users need the simultaneous `0.1.2` source candidate and public `0.1.1` installation truth before choosing commands. | Existing Start here and Release status sentences absorb the candidate/public distinction without adding a section. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — routing, publication authority, and completion rules do not change. | The repository-wide rule surface remains byte-stable; Task-specific evidence stays in this pair. |
| `docs/SPEC.md` | 40489 | 40659 | 452 | 452 | 170 | 0.42% | observable product behavior and acceptance | Package/plugin candidate identity must be `0.1.2` while canonical public registry truth remains `0.1.1`. | Existing package-boundary and publication-state paragraphs replace their current-version sentences. |
| `docs/ARCHITECTURE.md` | 36809 | 36809 | 767 | 767 | 0 | 0.00% | stable components, boundaries, dependencies, flows, and distribution | Not applicable — the version-independent package and OIDC flows do not change. | Architecture remains byte-stable because Task `0064` already owns the durable candidate/publication boundaries. |
| `Combined` | 96789 | 97101 | 1494 | 1494 | 312 | 0.32% | all four permanent-document owners | README and SPEC must agree on candidate metadata and public registry state while AGENTS and architecture stay unchanged. | Existing owner sections absorb the version-state change; detailed release evidence remains in this pair. |

## Unverified

- Repository acceptance has no unverified required row. The non-draft PR, exact-head checks, merge, post-main run, and evaluator result required by `STANDARD` do not exist yet and remain the separate delivery gate.
- No `publish.yml` run, npm publication, registry `0.1.2`, provenance, dist-tag change, Git tag, GitHub Release, or public submission exists or is claimed.
- No `0.1.2` version edit, candidate, focused/stable/release result, document delta, or final diff exists.
- No publication workflow run, registry `0.1.2`, dist-tag change, provenance, tag, Release, or public submission exists or is claimed.
- The exact PR head, merge, post-main SHA, and evaluator result required before the publication dependency becomes eligible do not exist.

## Final Coverage Review

- [x] Compare the final diff and exact candidate to every matrix row.
- [x] Map every acceptance criterion to executed evidence.
- [x] Cover current-version migration, historical preservation, candidate/public truth, and package-safety branches.
- [x] Confirm workflow/publisher bytes and every excluded external surface remain unchanged.
- [x] Confirm focused, Stable, Release, document-delta, pair, queue, transaction, and immutability checks passed.
- [x] Confirm `STANDARD` remains the external gate that must reach exact main before any publication Task can run.
