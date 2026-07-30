# TEST 0065 — Prepare kyw-dev 0.1.2 on main for OIDC Publication

<!-- kyw-task-contract: 3 -->

## Status

READY

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
| T-01 | AC-01 — Delivered workflow/publisher state and unused-version preflight are exact. | Validate dependency delivery and hashes; read trusted-publisher tuple; query versions/latest and require expected absence before edits and terminalization. | External/integrity | TODO | Planned; dependency delivery and current registry state have not been rechecked. |
| T-02 | AC-02 — All current release identities become `0.1.2` without historical corruption. | Inspect owners, run focused assertions, and classify repository-wide `0.1.0`, `0.1.1`, and `0.1.2` searches by current versus historical ownership. | Integration | TODO | Planned; no version file has changed. |
| T-03 | AC-03 — Candidate and public registry truth remain explicitly distinct. | Assert repository/packed README and SPEC candidate wording, public `latest` wording, install commands, and absence of false publication/provenance/tag/Release/submission claims. | Documentation/integration | TODO | Planned; current public truth remains `0.1.1`. |
| T-04 | AC-04 — Exact candidate contents and safety remain valid. | Prepare one candidate; inspect allowlist, manifests, README, legal bytes, CLI, exclusions, dependency/lifecycle fields, file count, sizes, and digests. | Distribution/security | TODO | Planned; no `0.1.2` archive exists. |
| T-05 | AC-05 — Version-sensitive and adjacent regressions pass. | Run focused CLI, distribution, foundation, instruction, release-evidence, workflow, and skill-installation tests, then the full stable suite. | Regression | TODO | Planned; no test has run. |
| T-06 | AC-06 — Permanent-document deltas and ownership are exact. | Measure all four documents against retained baseline, record the canonical delta table, and run foundation/instruction guards. | Policy | TODO | Planned; no delta evidence exists. |
| T-07 | AC-07 — Release routing, gates, and candidate evidence are reproducible without publication. | Run planner, four stable commands, release candidate, isolation, dry-run, and exact candidate inspection; retain exact metadata. | Release | TODO | Planned; no gate result is claimed. |
| T-08 | AC-08 — Workflow and all excluded external surfaces remain unchanged. | Hash workflow/dependency bytes; inspect workflow runs, registry versions/tags, Git tags/Releases, and submission artifacts read-only; reject any mutating command. | External/scope | TODO | Planned; no workflow or registry mutation is authorized. |
| T-09 | AC-09 — Final scope, immutable history, clean transaction, and `STANDARD` dependency gating hold. | Map final diff, validate pair/queue, hash prior terminal pairs, inspect transaction state, and retain PR/main exact-SHA delivery as a separate unclaimed gate. | Delivery/integrity | TODO | Planned; final diff and delivery do not exist. |

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

## Results

- Not applicable — verification has not run.

## Unverified

- Dependency delivery, publisher/workflow identity, and `0.1.2` absence have not been revalidated for execution.
- No `0.1.2` version edit, candidate, focused/stable/release result, document delta, or final diff exists.
- No publication workflow run, registry `0.1.2`, dist-tag change, provenance, tag, Release, or public submission exists or is claimed.
- The exact PR head, merge, post-main SHA, and evaluator result required before the publication dependency becomes eligible do not exist.

## Final Coverage Review

- [ ] Compare the final diff and exact candidate to every matrix row.
- [ ] Map every acceptance criterion to executed evidence.
- [ ] Cover current-version migration, historical preservation, candidate/public truth, and package-safety branches.
- [ ] Confirm workflow/publisher bytes and every excluded external surface remain unchanged.
- [ ] Confirm focused, Stable, Release, document-delta, pair, queue, transaction, and immutability checks passed.
- [ ] Confirm `STANDARD` delivery reaches exact main before any publication Task can run.
