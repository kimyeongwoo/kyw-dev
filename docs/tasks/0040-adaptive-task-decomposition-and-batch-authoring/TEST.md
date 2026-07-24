# TEST 0040 — Adaptive Task Decomposition and Batch Authoring

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially `$kyw-task`, Task sizing, test lifecycle, ordinary prompts, safety, compatibility, distribution, and MVP acceptance.
- Architecture constraints: `../../ARCHITECTURE.md`, especially Task ownership, deterministic mechanics, lifecycle, atomic publication, direct-install fallback, and validation.
- Repository rules: `../../../AGENTS.md`.
- Verification policy: acceptance-specific batch/process failure evidence plus Stable and exact-head hosted delivery; no model/effort change or publication.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose a Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Adaptive one-versus-many decomposition | Freeze one-outcome, independent-outcome, dependency, and oversize behavior; require one pair or the smallest actual batch without a selection-only stop. | Behavioral/static | PASS | `test/fixtures/kyw-task/scenarios.json` and `test/kyw-task.test.mjs`; final `npm test` passed. |
| T-02 | AC-02, AC-03 — Explicit structure, conflict handling, and owner boundary | Exercise safe count/order/title/dependency/mode preservation and an incompatible one-Task request; assert the minimum safe alternative, no unnecessary question, and unchanged grilling ownership. | Behavioral/static | PASS | Adaptive Skill scenarios and static owner/mutation assertions passed; final diff has no `skills/kyw-grilling` path. |
| T-03 | AC-04, AC-05 — Atomic core batch publication | Unit-test contiguous preallocation, exact paths, complete `READY/READY` rendering, strict dependency-token placement, existing/intra-batch dependencies, missing references, cycles, exhaustion, lock, race, staged failure, and failure after first or final publication. | Unit/integrity | PASS | `node --test test/task-artifacts.test.mjs test/kyw-task.test.mjs` passed `29/29`; failure cases left no batch-owned partial queue. |
| T-04 | AC-04, AC-05, AC-08 — Packaged adapter and single-pair compatibility | Run inline/file-backed batch adapter calls, invalid schemas/pairs, direct-install fallback, actual-tarball runtime, and compatible one-pair scaffold regressions. | Integration/process/package | PASS | `test/kyw-task.test.mjs` passed; `test/skill-installation.test.mjs` passed `42/42`; final pack gate passed. |
| T-05 | AC-06 — Create-only and create-and-execute boundaries | Assert create-only stop, first returned eligible pair selection, unselected `READY/READY` state, one-active execution, and separately invoked continuous progression. | Integration/behavioral | PASS | Adaptive scenario and Skill/execution static contract passed; dispatcher regression passed `16/16`. |
| T-06 | AC-07 — Model/effort and provenance preservation | Scan instruction/runtime surfaces for mutation paths and retain observed/unavailable provenance validation. | Static/behavioral | PASS | Instruction-surface and template-contract tests passed in the final `265/265` suite; this pair records no inferred model or effort. |
| T-07 | AC-08 — Existing dispatch and historical compatibility | Run exact/resume/next/continuous, ordinary non-trigger, appended override, delivery/no-work, validator, DRAFT scaffold, installed adapter, and historical queue regressions. | Regression/integration | PASS | Dispatcher `16/16`, focused Skill/core `29/29`, installed package `42/42`, and complete suite all passed. |
| T-08 | AC-09 — Conditional historical migration | Recheck Task 0037/0038 status/delivery and compare every historical pair blob with `origin/main`. | Integrity/external read-only | PASS | Preflight proved both Tasks already delivered; all four working blob hashes equal `origin/main`, and `git diff --name-only` reports no 0037/0038 path. |
| T-09 | AC-10 — Durable contract and package parity | Verify permanent truth, thin AGENTS projections, Skill/metadata, foundation validation, adapter/core, package bytes, and forbidden-path absence. | Static/package | PASS | Foundation `2/2`, instruction parity, direct-install/tarball, lint, format, and pack checks passed; no Task 0041 or grilling diff exists. |
| T-10 | AC-01–AC-10 — Stable and final repository coverage | Run the exact-path verification planner, acceptance-specific suites, Stable commands, pair/all-Task validation, `git diff --check`, exact changed-path review, and final matrix review; keep hosted delivery in the external ledger. | Regression/integrity | PASS | Planner selected `STABLE`; final `npm run check` passed `265/265` tests, lint, format, and pack; the terminal pair and all 40 Tasks validated; final diff/format checks passed. |

## Regression Coverage

- Current one-pair allocation, slug/path safety, template validation, creation lock, and atomic two-file publication.
- Portable exact dispatch, managed aliases, active/delivery/ready priority, dependency and blocker stops, continuous serial reinspection, and exact no-work message.
- DRAFT/current and historical Task/Test validation plus resume compatibility for already-created artifacts.
- Ordinary-prompt non-routing, appended constraints, model/effort preservation, user-work protection, and real-blocker one-question behavior.
- `STANDARD` lifecycle authority and separate publication/force/destructive boundaries.
- Package allowlist, direct-install namespaced runtime fallback, plugin Skill metadata, and cross-platform behavior.

## Commands

- Passed lifecycle validation before implementation: `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory ./docs/tasks/0040-adaptive-task-decomposition-and-batch-authoring`.
- Passed focused core/Skill: `node --test test/task-artifacts.test.mjs test/kyw-task.test.mjs` (`29/29`).
- Passed focused dispatcher: `node --test test/task-dispatch.test.mjs` (`16/16`).
- Passed focused behavioral predicates: `node --test test/spec-behavioral-acceptance.test.mjs` (`23/23`).
- Passed direct behavioral fixture validation: `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures` (`6` scenarios).
- Passed direct-install and actual-tarball coverage: `node --test test/skill-installation.test.mjs` (`42/42`).
- Passed foundation contract after its adaptive-create update: `node --test test/foundation.test.mjs` (`2/2`).
- Passed exact-path selection twice, including the final path set: `npm run verify:plan -- <exact changed paths>` (`STABLE`).
- Passed final required local gate: `npm run check` (`265/265` tests, lint, format, and pack).
- Passed terminal artifact validation for Task 0040 and a deterministic loop over all 40 numbered Task directories.
- Passed post-terminal documentation checks: `npm run format:check` and `git diff --check`.
- Passed integrity checks: `git diff --check`; Task 0037/0038 working-blob versus `origin/main` comparison; no-Task-0041, no-grilling-diff, no-historical-diff, and exact changed-path review.

## Results

- The atomic core covers a batch of one and many, existing and intra-batch dependencies, contiguous allocation, canonical prevalidation, missing/cycle rejection, one lock, staged validation, and rollback after staged, prefix, or full publication failure.
- Process tests prove both inline and file-backed schema-v1 adapter input, exact returned paths/dependencies, validation of every published pair, and rejection of invalid pair/schema input.
- Direct-install and extracted npm-tarball tests execute the installed `create-batch` adapter successfully while the legacy DRAFT scaffold remains runnable.
- Behavioral and instruction tests prove safe explicit structure preservation, the minimum safe alternative for conflicting structure, create-only stop, first-pair-only activation, separate continuous dispatch, exact no-work text, and unchanged grilling/model/effort boundaries.
- The first `npm run check` stopped at `npm test` with `264/265` because the foundation validator still required the retired adaptive-DRAFT wording. That validator was updated to require adaptive READY publication plus compatible DRAFT confirmation, its focused test passed, and the complete final Stable rerun passed.
- The final instruction bundle is 35,814 bytes, below its 36,382-byte historical ceiling, with no new reference path.
- Permanent documents and packed metadata agree; Task 0037/0038 bytes are unchanged; Task 0041, publication, tag, GitHub Release, and `kyw-grilling` mutations are absent.

## Unverified

- Not applicable — all repository acceptance and regression rows are verified. Mutable PR, merge, exact-head CI, and post-merge `main` CI evidence remains in the separate `STANDARD` GitHub ledger.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
