# TEST 0045 — Cohesive Skill Installation Core Modules

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially direct installation, update/uninstall safety, doctor, ownership metadata, compatibility, and distribution.
- Architecture constraints: `../../ARCHITECTURE.md`, especially installer ownership, path/transaction boundaries, direct/plugin surfaces, package runtime, and residual filesystem risk.
- Repository rules: `../../../AGENTS.md`.
- Verification policy: facade/API compatibility, hostile-state and cross-platform regression, actual tarball lifecycle, exact diff review, Stable/candidate, and hosted exact-SHA delivery.
- Installed CLI provenance: `codex-cli 0.145.0` from the installed `codex` command (`OBSERVED` before implementation); it does not substitute for the active API surface fields below.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose a Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Public facade, CLI, metadata, and error compatibility | Inventory and exercise exported functions, CLI grammar/output, result/error categories, metadata schema, and supported imports before and after extraction. | Unit/API | PASS | Exact 28-export facade regression, 83/83 final focused tests, and 283/283 aggregate tests passed. |
| T-02 | AC-02 — Complete install lifecycle safety | Re-run install, update, normal/force uninstall, doctor, interruption recovery, direct-Skills, and plugin-cache flows across healthy and hostile fixtures. | Integration/security | PASS | Final focused command passed 83/83, including native junction/type fixtures, every transaction phase, doctor surfaces, and two real packed-byte lifecycles. |
| T-03 | AC-03 — Unknown-content preservation | Exercise unknown files, links/junctions, special types, missing/modified owned bytes, collisions, and hostile transaction entries and compare untouched bytes. | Integration/failure | PASS | Focused hostile-state tests passed for unknown files/links, changed bytes, unsafe parents, source-link races, journal traversal/collisions, and recovery ownership. |
| T-04 | AC-04 — Cohesive acyclic modules without frameworks | Inspect import direction and responsibilities and assert no cycle, provider/backend layer, generic filesystem adapter, or shared transaction framework. | Static/architecture | PASS | Exact six-file dependency-graph/cycle regression passed; normalized source-body comparison matched 426/303/302/1,272/569 lines across the five internals. |
| T-05 | AC-05 — Package module completeness | Inspect real packed bytes and execute the packed CLI/runtime while rejecting development-only files. | Package/integration | PASS | Package and candidate gates passed with the exact 39-file, 100,457-byte allowlist and SHA-256 `0d3f40d4d0795511f80e75507353a491db0fcb6edf8ca87e16774b142ab9c8b2`. |
| T-06 | AC-06 — Cross-platform and real-tarball compatibility | Run existing installer, CLI, distribution, and release-isolation deterministic suites with only necessary import/inventory updates. | Regression/E2E | PASS | Final 83/83 focused and 283/283 aggregate tests passed on the native Windows host, including actual-tarball CLI and isolation lifecycles. |
| T-07 | AC-07 — Complete local gate and delivery boundary | Run the exact-path planner, Stable/candidate/package checks, canonical validation, and final diff review; keep PR/main hosted results in the subsequent external ledger. | Stable/integrity | PASS | Exact paths classified `RELEASE`; lint/format/package/candidate, 47-pair canonical validation, transaction inspection, and `git diff --check` passed. Hosted results remain unclaimed external evidence. |

## Regression Coverage

- Scope/root resolution, portable path identity, containment, symlink/junction/type checks, ownership hashes, and immediate mutation-time revalidation.
- Journal, marker, staging, backup, rollback, committed cleanup, recovery ownership, and normal/force uninstall preservation.
- Read-only doctor snapshots, duplicate direct/plugin discovery, error categories, CLI output, and two supported installation surfaces.
- Package allowlist, actual tarball CLI/lifecycle behavior, direct-install runtime support, and absence of new dependencies or frameworks.

## Commands

- `node --check` against the facade and all five extracted installer modules; then an ESM import smoke for the facade export inventory.
- `node --test test/skill-installation.test.mjs test/cli.test.mjs test/distribution.test.mjs test/release-gate-isolation.test.mjs` — run five times during extraction and once as the final focused gate.
- `node --test test/skill-installation.test.mjs` after adding facade and graph invariants.
- Inline Node source-body comparison using `git show HEAD:src/core/skill-installation.mjs` and all five extracted modules.
- `npm run verify:plan -- README.md docs/ARCHITECTURE.md docs/tasks/0045-cohesive-skill-installation-core-modules/TASK.md docs/tasks/0045-cohesive-skill-installation-core-modules/TEST.md scripts/lib/validate-foundation.mjs src/core/skill-installation-doctor.mjs src/core/skill-installation-inventory.mjs src/core/skill-installation-shared.mjs src/core/skill-installation-state.mjs src/core/skill-installation-transaction.mjs src/core/skill-installation.mjs test/skill-installation.test.mjs`.
- `npm run release:ci`, which executed `npm run check` and `npm run release:candidate`.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0045-cohesive-skill-installation-core-modules`.
- The same canonical validator across every sorted direct child of `docs/tasks`, plus `node ./skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- `git diff --check`, exact changed-path inspection, complete source/diff review, and final AC-to-test review.
- Subsequent external delivery commands are intentionally absent from repository PASS evidence.

## Results

- Fresh preflight confirmed exact clean `main` SHA `bf2d63e6b751f16e70ad04c14e2a03299c7bc040`, only pre-created 0045–0047 untracked pairs, no active Git/installer/Task transaction, and a freshly satisfied exact-SHA delivery ledger through Task 0044.
- The public baseline contains 28 facade exports, stable CLI consumers, and a 3,017-line mixed-responsibility core. The package exact-file inventory requires explicit updates for extracted npm runtime modules; direct-Skills managed inventory does not import the installer core.
- The planned internal graph is acyclic by construction: shared; inventory/metadata; installed state; transaction/recovery; doctor/discovery; and one facade. Internal tests remain limited to export inventory, graph direction/cycle absence, and package completeness while existing facade/E2E suites protect behavior.
- AC-07/T-07 was reconciled before extraction so mutable hosted results remain the external delivery gate rather than a self-referential repository PASS prerequisite.
- Six syntax checks and the facade import smoke passed after extraction.
- The repeated focused command first reported 48/81 PASS with missing shared parent-safety ownership and packed inventory drift; then 56/81 with missing `knownManagedDirectories` and `assertCanonicalRealPath`; then 56/81 with missing `validateInstallMetadata`; then 56/81 with missing `normalizedComparable`; and finally 81/81 PASS after each exact import/inventory correction.
- The installer-only suite passed 44/44 after adding exact 28-export facade and acyclic graph assertions. The final four-file focused gate then passed 83/83 in 30.3 seconds.
- Normalized body comparison against the pre-Task monolith returned `BODY_MATCH` for shared 426/426, inventory 303/303, state 302/302, transaction 1,272/1,272, and doctor 569/569 lines.
- The exact 12-path planner selected `RELEASE`.
- `npm run release:ci` passed: 283/283 tests in 42.9 seconds; lint across 69 JavaScript modules; format across 282 UTF-8/LF text files; package check across 39 files and 100,457 bytes; and packed candidate SHA-256 `0d3f40d4d0795511f80e75507353a491db0fcb6edf8ca87e16774b142ab9c8b2`.
- Current-pair and all 47 canonical pair validations passed; transaction inspection returned `NONE` / `NO_TRANSACTION_EVIDENCE`; `git diff --check` passed. Review found only the exact 12 Task-owned paths plus untouched pre-created 0046–0047 pairs.
- The final diff preserves exact implementation bodies, 28 public exports, CLI imports, metadata and transaction schemas, error/result contracts, and both supported installation surfaces. No dependency, provider/backend framework, publication path, or unrelated change was introduced.

## Unverified

- None — T-01 through T-07 and all repository verification are complete. Exact-head pull-request CI and post-merge `main` CI are subsequent mutable external ledger evidence and are not claimed here.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
