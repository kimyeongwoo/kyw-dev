# TEST 0042 — Ownership-Safe Task Batch Transactions

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Hard dependency: Task 0041 must be repository-complete and externally delivered before implementation.
- Product requirements: `../../SPEC.md`, especially adaptive batch atomicity, user-file preservation, queue-reader lock behavior, and cross-platform compatibility.
- Architecture constraints: `../../ARCHITECTURE.md`, especially Task transactions, package adapter boundaries, path/type safety, and fail-closed recovery.
- Repository rules: `../../../AGENTS.md`.
- Verification policy: deterministic fault injection, real file-backed adapter processes, local Stable/package and canonical validation, and no inferred cleanup success; cross-platform exact-head hosted checks remain external delivery evidence.
- Installed CLI provenance: `codex-cli 0.145.0` from the installed `codex` command (`OBSERVED` before implementation); this does not substitute for the active API surface fields below.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose a Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01, AC-02 — Lock token and identity ownership | Replace the lock path after acquisition and assert only the original proven lock may be released. | Unit/failure | PASS | `batch transaction lock identity is versioned and a replacement lock is never unlinked` proves schema/token identity and byte-preserved replacement behavior. |
| T-02 | AC-03 — Post-lock queue, dependency, target, and hash revalidation | Inject frontier, dependency content/status, staged/prepared-byte, pre-publication target, and immediate publish-target drift. | Unit/integrity | PASS | Allocation-race, dependency-byte, `beforePublish`, exclusive `beforeDirectoryPublish`, and changed staged-hash fixtures abort without overwriting the competing path. |
| T-03 | AC-04, AC-05 — Exact rollback and fail-closed preservation | Inject extra entries, links/junctions, changed pair files, partial finals, and foreign replacements across staging and publication. | Unit/security | PASS | Ownership-negative tests preserve unknown bytes and linked entries, return `TASK_BATCH_ROLLBACK_FAILED`, retain evidence, and demonstrate no recursive batch cleanup. |
| T-04 | AC-06 — Bounded read-only diagnostics | Inspect valid and hostile transactions and assert relative bounded categories, prefix-only identities, and absence of unnecessary absolute paths. | Unit/privacy | PASS | Diagnostic fixture reports at most 64 observations, relative redacted stage/marker paths, token/hash prefixes, and no Task-root or full token. |
| T-05 | AC-07 — Proof-based idempotent recovery | Recover fully proven pre-publish, partial-publish, rolled-back, and committed states twice; reject unproven variants byte-preservingly. | Integration/recovery | PASS | Three recovery tests cover every phase family, second-call `NONE`, committed preservation, and byte-identical rejection of unknown content. Adapter process coverage exercises both commands. |
| T-06 | AC-08 — Clean normal success | Create a multi-pair batch, validate every pair and edge, and assert no lock, staging, manifest, or recovery residue. | Integration/filesystem | PASS | Atomic batch success validates both pairs/dependency edge with an exact final root inventory; repository residue inspection found no transaction artifact. |
| T-07 | AC-09 — Large file-backed cross-platform transport | Submit a valid payload above 8 KiB through a caller-owned external scratch file and assert exact results under Windows-valid process semantics. | Process/compatibility | PASS | `kyw-task adapter publishes complete READY batches from file or inline JSON` measured the file above 8 KiB and created the exact two-pair result through a real Windows adapter process. |
| T-08 | AC-10 — Compatibility surfaces | Re-run one-pair create, schema-v1 inline/file input, ID/dependency validation, adapter outputs, direct-install fallback, and packed-byte tests. | Regression/package | PASS | Focused 38/38 and installed/packed 42/42 passed; final Stable regression and package boundary also passed. |
| T-09 | AC-01–AC-08 — Boundary-complete fault matrix | Inject failure across staging, manifest, partial-final, publication, rollback, and both lock-release boundaries and classify retained state. | Unit/meta | PASS | `batch failure boundaries either restore the prior queue or retain explicit recovery evidence` covers nine clean/recoverable boundaries plus manifest, rollback-unlink, and release-marker cases. |
| T-10 | AC-01–AC-10 — Final repository coverage | Run the exact-path planner, Stable/package gates, canonical all-Task validation, residue and complete-diff review; keep mutable GitHub evidence in the external ledger. | Stable/integrity | PASS | Planner selected `STABLE`; final `npm run check` passed 278/278 plus lint, 272-file format, and 29-file package checks. All 47 pairs validated and `git diff --check` passed. |

## Regression Coverage

- Current batch schema v1, contiguous allocation, placeholder rendering, graph checks, pair validation, and public result/error contracts.
- Compatible DRAFT one-pair creation, exact/automatic/continuous readers, and fail-closed queue inspection during a held lock.
- Direct-install namespaced runtime fallback, package allowlist, actual adapter process behavior, and cross-platform Task-root containment.
- Preservation of unknown user content and the prohibition on age/PID-only cleanup, automatic stale-lock deletion, and generic transaction infrastructure.

## Commands

- `node --test test/task-artifacts.test.mjs test/kyw-task.test.mjs` — passed 38/38.
- `node --test test/skill-installation.test.mjs` — passed 42/42, including direct-install and actual packed adapter behavior.
- `node --test --test-name-pattern "rollback preserves changed pair bytes" test/task-artifacts.test.mjs` — passed 1/1 with the Windows junction branch executed.
- `npm run verify:plan -- src/core/task-artifacts.mjs skills/kyw-task/scripts/task-artifacts.mjs skills/kyw-task/SKILL.md test/task-artifacts.test.mjs test/kyw-task.test.mjs test/skill-installation.test.mjs docs/SPEC.md docs/ARCHITECTURE.md README.md docs/tasks/0042-ownership-safe-task-batch-transactions/TASK.md docs/tasks/0042-ownership-safe-task-batch-transactions/TEST.md` — selected `STABLE`, runtime change.
- Initial `npm run check` — failed truthfully at 275/278 because three foundation/instruction projections no longer matched; implementation tests passed.
- `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs test/kyw-task.test.mjs` after reconciliation — passed 22/22.
- Final `npm run check` — passed 278/278, lint, format check over 272 UTF-8/LF files, and package check over 29 files / 98,289 bytes.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0042-ownership-safe-task-batch-transactions` — passed before implementation; the first terminal run rejected noncanonical Remaining/Resume sentinels, which were changed to reasoned `None — ...` entries before the passing terminal rerun.
- Canonical all-Task validation loop — passed all 47 Task/Test pairs before terminalization; terminal rerun is recorded below.
- `git diff --check` and exact `docs/tasks` transaction-residue inventory — passed; no lock, release marker, batch stage, or manifest residue remained.

## Results

- Local/remote preflight established branch base `c738352a9275494ed656edf4283cf8f5f5d4ce04`, matching upstream, `origin/main`, and direct remote `main`; staged and unstaged sets were empty and the only untracked paths were the pre-created Task 0042–0047 pairs.
- Task 0041 delivery evidence matched outcome SHA `5f86f04bf80238f83c1061f1e58aa2ddf87e27c2`, merge SHA `c738352a9275494ed656edf4283cf8f5f5d4ce04`, PR run `30141042081`, and post-merge run `30141127458`, all successful.
- Acceptance-to-test mapping was rechecked before implementation and again against the final diff. AC-01–AC-10 remain fully covered by T-01–T-10, including negative ownership and recovery branches.
- Focused, direct-install, packed adapter, large file-backed, linked-entry, fault-matrix, recovery, privacy, canonical validation, Stable, lint, format, package, diff, and residue checks all passed as recorded above.
- The first Stable failure remains recorded and was not rewritten as a pass; the final complete rerun passed after the exact projection fixes.
- The first terminal pair validation failed only because DONE Remaining and Resume Point used `Not applicable — ...` instead of the required reasoned `None — ...` form; the exact contract issue was corrected and retained here before rerunning validation.

## Unverified

- No repository acceptance remains unverified. Exact-head pull-request CI and post-merge `main` CI have not yet run for this outcome and remain mutable external `STANDARD` delivery-ledger evidence, not a PASS claim in this file.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
