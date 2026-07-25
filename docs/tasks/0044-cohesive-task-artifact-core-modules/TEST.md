# TEST 0044 — Cohesive Task Artifact Core Modules

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Hard dependencies: Tasks 0041 and 0042 must be repository-complete and externally delivered before implementation.
- Product requirements: `../../SPEC.md`, especially Task artifact, queue, evidence, compatibility, and package behavior.
- Architecture constraints: `../../ARCHITECTURE.md`, especially deterministic core ownership, facade/adapter boundaries, direct-install runtime, and acyclic modules.
- Repository rules: `../../../AGENTS.md`.
- Verification policy: behavior-preserving export/API tests, facade-first regression, real packed-byte inclusion, exact diff review, Stable, and hosted exact-SHA delivery.
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
| T-01 | AC-01 — Public facade compatibility | Snapshot and exercise every export, adapter command, result/error shape, code, exact message, and supported import path before and after extraction. | Unit/API | PASS | Exact namespace assertion preserves all 25 exports; facade/adapter regression passed 60/60 and full suite passed 281/281. |
| T-02 | AC-02 — Cohesive acyclic internals | Inspect the internal import graph and assert responsibility boundaries and cycle absence. | Static/architecture | PASS | Exact six-file graph assertion passed; final source review confirms shared/contract/delivery/queue/creation ownership and a re-export-only facade. |
| T-03 | AC-03 — Truthfulness and transaction invariants | Re-run every Task 0041 state/dependency case and Task 0042 ownership/race/recovery case through the public facade. | Regression/security | PASS | Focused public suites passed 60/60 after the red wiring phases; full release suite passed 281/281. |
| T-04 | AC-04 — Facade-first test ownership | Confirm existing public tests remain intact and any new internal tests cover only isolated invariants. | Static/test-review | PASS | Existing behavioral tests retain facade imports; the only new Task-core tests assert public export inventory and static graph/cycle invariants. |
| T-05 | AC-05 — Packed and direct-install module completeness | Pack/extract real bytes, execute the adapter from package and direct-install fallback, and reject development-only inclusions. | Package/integration | PASS | Installation suite passed 42/42; release candidate passed with exactly 34 files, 99,566 bytes, and SHA-256 `46dffb5b517a84d1a0f792f0a63c966f0d6c67e831675a07dcb3c27cb20ed5f6`. |
| T-06 | AC-06 — Dependency and over-abstraction prohibition | Compare package manifests and module design for zero new dependencies, frameworks, and line-count-driven acceptance. | Static/integrity | PASS | `git diff -- package.json package-lock.json` was empty; review found five Task-specific cohesive modules and no framework, generic layer, or size target. |
| T-07 | AC-07 — Complete local gate and delivery boundary | Run focused suites, planner-selected Stable/candidate checks, canonical all-Task validation, and exact diff review; keep PR/main hosted results in the subsequent external ledger. | Stable/integrity | PASS | RELEASE planner and `npm run release:ci` passed; all 47 pairs validated, transaction state was `NONE`, `git diff --check` passed, and the exact Task-owned diff was reviewed. |

## Regression Coverage

- Current/legacy pair parsing, canonical validation, strict dependencies, queue truthfulness, exact/automatic/continuous dispatch, and delivery classification.
- One-pair and batch creation, lock/manifest ownership, post-lock revalidation, diagnosis, recovery, rollback, and exact result/error behavior.
- Packaged adapter, direct-install namespaced runtime, package allowlist, exact messages, and public export/import compatibility.
- No production/development dependency additions, generic abstraction layer, behavior feature, or arbitrary line target.

## Commands

- `node --check src/core/task-artifact-shared.mjs`, `node --check src/core/task-artifact-contract.mjs`, `node --check src/core/task-artifact-delivery.mjs`, `node --check src/core/task-artifact-queue.mjs`, `node --check src/core/task-artifact-creation.mjs`, and `node --check src/core/task-artifacts.mjs`.
- `node --input-type=module -e "import * as m from './src/core/task-artifacts.mjs'; console.log(JSON.stringify(Object.keys(m), null, 2))"`.
- `node --test test/task-artifacts.test.mjs test/task-dispatch.test.mjs test/kyw-task.test.mjs` (four executions: two expected red wiring phases, one green baseline after wiring, and one final green run with new invariants).
- `node --test test/skill-installation.test.mjs` (one red inventory-count phase and one green rerun).
- `npm run verify:plan -- README.md docs/ARCHITECTURE.md docs/tasks/0044-cohesive-task-artifact-core-modules/TASK.md docs/tasks/0044-cohesive-task-artifact-core-modules/TEST.md scripts/lib/validate-foundation.mjs src/core/skill-installation.mjs src/core/task-artifact-contract.mjs src/core/task-artifact-creation.mjs src/core/task-artifact-delivery.mjs src/core/task-artifact-queue.mjs src/core/task-artifact-shared.mjs src/core/task-artifacts.mjs test/skill-installation.test.mjs test/task-artifacts.test.mjs`.
- `npm run release:ci`.
- `git diff --check`.
- Every `docs/tasks/*` directory through `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <directory>`.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- An inline read-only Node comparison using `git show HEAD:src/core/task-artifacts.mjs` and `readFileSync` to compare each original responsibility range with its extracted module after removing only new `export` modifiers and blank separator lines.
- `git diff -- package.json package-lock.json`, `git status --short`, `git diff --name-status`, `git diff --stat`, and exact source/document/test diff inspection.
- External delivery remains subsequent exact-head PR CI and post-merge `main` CI in the `STANDARD` ledger; neither is recorded as behavioral PASS here.

## Results

- Fresh preflight confirmed exact clean `main` SHA `529ddb84cbca032609f082a0d9ecd4b790f4ecca`, only pre-created 0044–0047 untracked pairs, no active Git/Task transaction, and satisfied exact-SHA delivery for both hard dependencies.
- The public baseline contains 25 facade exports, six adapter commands, and a 4,049-line mixed-responsibility core; package and direct-install inventories require explicit updates for extracted runtime modules.
- The planned internal import graph is acyclic by construction and retains one public import path. Internal testing is limited to export inventory, graph direction/cycle absence, and distribution completeness; behavior stays protected through the existing facade suites.
- AC-07/T-07 was reconciled before extraction so mutable hosted results remain the external delivery gate rather than a self-referential repository PASS prerequisite.
- All six extracted/facade modules passed syntax checks, and the import smoke returned the same 25 public symbols.
- The first focused execution failed 36 of 58 tests because the mechanical split omitted `stagingPrefix` and `dependencyGraphErrors` cross-module wiring. After that correction, the second execution failed 25 of 58 because `creationLockName` was still missing from the contract import. The next execution passed 58/58; after adding the two invariant tests, the final focused execution passed 60/60.
- The first installation execution passed 40/42 and failed only because three explicit inventory assertions retained the prior 19/29 counts. Updating those assertions to the actual five-file growth produced a 42/42 green rerun, including direct-install fallback and real npm tarball adapter execution.
- The exact changed-path planner selected `RELEASE`. `npm run release:ci` passed 281/281 tests, lint across 64 JavaScript modules, format across 277 UTF-8/LF text files, package validation at 34 files/99,566 bytes, and candidate SHA-256 `46dffb5b517a84d1a0f792f0a63c966f0d6c67e831675a07dcb3c27cb20ed5f6`.
- Canonical validation passed all 47 Task/Test pairs, transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`, `git diff --check` produced no error, package manifests were unchanged, and final path/diff review found no Task 0045–0047 mutation.
- The independent source-range comparison reported `BODY_MATCH` for contract, delivery, shared, queue, and creation; the extracted executable bodies match the original `main` file line-for-line apart from required cross-module `export` modifiers and blank separators.
- Two terminal-pair validation attempts failed because `DONE` first described delivery work and then used `Not applicable` rather than the contract's exact reasoned `- None — ...` form in `Remaining` and `Resume Point`. The final correction kept delivery exclusively in the external ledger; current-pair and all-47-pair validation then passed.

## Unverified

- No repository acceptance test is unverified. Exact-head PR CI and post-merge `main` CI remain required external `STANDARD` delivery evidence and are intentionally not treated as behavioral PASS.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
