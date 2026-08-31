# TEST 0071 — Restore Cross-Platform Stable Verification and Frontier-Relative Live Tests

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: ./TASK.md
- Product requirements: ../../SPEC.md
- Architecture constraints: ../../ARCHITECTURE.md
- Pre-entry continuity baseline: `../.kyw-dev-standard-delivery-continuity.json`, file SHA-256 `706d729f469a173b3e833718e167d417492b3d31f12f3b5faad0a95bf376bc8f`, digest `4db847cb90b443f1e0e419bc39582ec7c4f29cd26b3114ae5dfae2ee01e43fec`, count `38`, last Task `0069`
- Active continuity baseline after the sole selected-Task transition: file SHA-256 `bf3b230a21c0363a9c790507f6c7d577b8edda3bf5d5ef979eba0cf0ad4f7ee0`, digest `a055031dff2d216728929b339142e0c19473f1da433245a8c4d967aa89fa3a65`, count `39`, last Task `0070`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no model override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Junction-alias candidate creation uses one canonical physical child and remains visible through the alias. | Reproduce retained-candidate creation under a real Windows junction and assert physical identity, alias observation, and no duplicate directory. | Integration / Windows | PASS | Initial `EEXIST` is retained below; corrected focused and 51-test suites proved one physical child, alias identity, and collision stability on Windows Node 24.11.0. |
| T-02 | AC-02 — Candidate containment and cleanup remain fail closed. | Exercise collision, overlap, wrong-parent, basename, link, type, escape, and unowned-cleanup attacks and inspect the surviving paths. | Security / regression | PASS | The direct 51-test distribution/installation suite and final 410-test Stable suite passed every retained collision, containment, type, link, cleanup, and transaction regression. |
| T-03 | AC-03 — Doctor ancestor-alias fixture reaches the system under test while linked leaves stay rejected. | Create bytes under the physical target, diagnose through the ancestor alias, then run linked-leaf and read-only negatives. | Integration / Windows | PASS | Physical fixture materialization plus alias diagnosis passed; linked Codex-home leaf and unsupported cache entries remained rejected, with metadata snapshots unchanged. |
| T-04 | AC-04 — Live hydration expectations follow the current required delivery set. | Unit-test frontier derivation, then run the opt-in hydration probe and validate every required classification and ledger result. | Unit plus live read-only | PASS | Offline composition passed and the explicit hydration probe verified all 39 required keys: 38 durable covered entries and fresh `0070`, each evaluator-satisfied. |
| T-05 | AC-05 — Live continuity follows the current checkpoint and one rolling frontier. | Exercise current and synthetic-next queue views derived from the trusted checkpoint, including count and last-Task assertions. | Integration plus live read-only | PASS | Offline pre/post-roll, next-frontier, and over-gap fixtures passed; the live probe derived covered `38`, frontier `0070`, and expected checkpoint count/last `39/0070`. |
| T-06 | AC-06 — Stable is offline and live probes are explicit, bounded, and non-mutating. | Run default tests without gates, run each gate separately, inspect query counters, and hash the active checkpoint plus terminal pairs before and after implementation verification. | Process / integrity | PASS | Default Stable skipped only the two live gates plus unavailable local symlink fixture; separate probes each used `388/15/21` command/API/log counts with zero retries and exact status/checkpoint invariance. |
| T-07 | AC-07 — The complete correction passes required checks without adjacent drift. | Run targeted, Stable, release-candidate, pair validation, transaction inspection, final diff, and immutable-hash checks against the active count-39 baseline. | Regression / delivery | PASS | Planner-selected Release verification, pair/transaction validation, hashes, permanent-document evidence, temp-state inspection, and final diff coverage all passed. |

## Regression Coverage

- Retained candidates outside an allowed physical temporary parent remain impossible and cleanup never follows an alias or unproven path.
- Doctor remains byte-and-metadata read-only and continues rejecting a linked Codex-home leaf before target inspection.
- Default test execution does not make GitHub requests merely because live tests exist.
- Continuity coverage remains ordered, bounded, checkpoint-derived, and unable to self-cover the selected Task.
- Task 0070 pair bytes and the canonical active checkpoint through Task 0070 remain unchanged after selected entry; pre-existing external release state is not mutated by local or live verification.

## Commands

- node --test --test-name-pattern "candidate root|ancestor path alias|linked Codex-home leaf" test/distribution.test.mjs test/skill-installation.test.mjs
- node --test --test-name-pattern "live repository and GitHub hydration|live STANDARD delivery continuity" test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs
- PowerShell opt-in run with KYW_LIVE_GITHUB_HYDRATION=1 for the named hydration live test
- PowerShell opt-in run with KYW_LIVE_GITHUB_CONTINUITY=1 for the named continuity live test
- npm test
- npm run lint
- npm run format:check
- npm run pack:check
- npm run release:candidate
- node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <allocated-task-directory>
- node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks
- git diff --check
- Initial Windows red — `node --test --test-name-pattern "candidate root|ancestor path alias|linked Codex-home leaf" test/distribution.test.mjs test/skill-installation.test.mjs`; Node reported three tests, one pass, and two failures (`EEXIST`, `ESRCH`).
- Initial live-assertion red inspection — `git show HEAD:test/task-delivery-hydration.test.mjs | rg -n "0059|hardenedTaskIds|legacyTaskIds|KYW_LIVE_GITHUB_HYDRATION"` and `git show HEAD:test/task-delivery-continuity.test.mjs | rg -n "0060|0061|29|30|KYW_LIVE_GITHUB_CONTINUITY"`; both exposed the fixed live-only IDs and counts.
- Corrected Windows focused — first post-change execution of the named 3-test command reported two functional passes before a candidate assertion was masked by missing substantive over-warning SPEC evidence; after correcting only this Test's delta row, the exact command exited `0`, three passes.
- Related full regression — `node --test test/distribution.test.mjs test/skill-installation.test.mjs`; exit `0`, 51 passes, zero skips/failures.
- Delivery focused — `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs`; exit `0`, 50 tests, 47 passes, three explicit skips, zero failures.
- Hydration live — PowerShell-scoped `KYW_LIVE_GITHUB_HYDRATION=1` plus the named hydration test; exit `0`, one pass, frontier `39/38/0070`, query counts `388/15/21`, zero retries.
- Continuity live — PowerShell-scoped `KYW_LIVE_GITHUB_CONTINUITY=1` plus the named continuity test; exit `0`, one pass, frontier `39/38/0070`, expected count/last `39/0070`, query counts `388/15/21`, zero retries.
- Changed-path plan — `npm run verify:plan -- <the nine exact active paths>`; exit `0`, `RELEASE`, ordered command `npm run release:ci`.
- Release verification — `npm run release:ci`; exit `0`: 410 tests / 407 passes / three explicit skips, lint 84 modules, format 358 files, pack 43 files / 136,857 bytes, candidate SHA-256 `f91d2cdfb94310fa555276021cda59f6e85ea726385fc5ed3e486863b013de73`.
- Integrity review — `git diff --check`, exact status/diff/hash reads, packaged pair validation, transaction inspection, checkpoint parse, permanent-document hashes, and Task-start-relative temp inspection; exit `0` with zero Task-0071-era temporary directories.
- Terminal synchronization — packaged Task 0071 validation, focused foundation/current-queue tests, `npm run format:check`, and `git diff --check`; exit `0`, two passes, format over 358 files, canonical `DONE/PASSED` pair.

## Results

- PASS — execution preflight aligned local, cached, direct-remote, and GitHub `main` at `dd7c1f30bcadf7e05843bfff74eb63e5839f25ed`; packaged Task 0071 validation and transaction inspection passed before the sole dispatcher selected `IMPLEMENT`.
- PASS — the dispatcher freshly classified Task `0070` as `HARDENED_EXACT_HEAD`; after the Task 0071 branch and active pair validated, one opaque transition apply advanced the checkpoint from count `38` / last `0069` / digest `4db847…` to count `39` / last `0070` / digest `a05503…`, with Task `0071` excluded and Task `0070` pair hashes unchanged.
- FAIL — the initial Windows-focused test reported two failures and one pass: the junction-alias candidate path raised `EEXIST`, the doctor ancestor-alias fixture raised `ESRCH` before product diagnosis, and linked Codex-home leaf rejection stayed fail closed.
- FAIL — immutable pre-change live-block inspection found obsolete Task-specific selectors and counts for `0059`, `0060`, `0061`, `3`/`28`, and `29`/`30`; no GitHub mutation or query was needed to establish the stale assertion defect.
- FAIL — the first post-change 3-test run proved both corrected path cases but exited `1` later because the active Test's zero-byte SPEC row did not satisfy the existing over-warning evidence guard. The row was made substantive without changing permanent truth or implementation, and the exact command then passed 3/3.
- PASS — physical candidate creation and alias observation passed without a duplicate child; every related collision, overlap, type, link, containment, cleanup, packaging, installer, doctor, and transaction regression passed in the direct 51-test run.
- PASS — the shared test-only helper derives a synthetic maximum-plus-one selection, required prefix, covered/uncovered split, classification map, and expected next count/last from production primitives and raw aligned-main checkpoint bytes. Offline roll and over-gap cases passed without GitHub access.
- PASS — the hydration and continuity live probes each independently evaluated required `39`, covered `38`, uncovered Task `0070`, and every ledger entry with `388` bounded commands, `15` GitHub API reads, `21` log fetches, zero retries, and byte-identical aligned-main checkpoint plus exact porcelain status before/after.
- PASS — default Stable remained offline with three explicit skips, while `npm run release:ci` passed tests, lint, format, pack selection, and one disposable candidate; no publication, tag, Release, registry mutation, workflow rerun, or 0.1.4 candidate occurred.
- PASS — Task 0070 SHA-256 values remain `2d678278…` / `79e47459…`; the active checkpoint remains file SHA-256 `bf3b230a…`, digest `a055031d…`, count `39`, last/transition Task `0070`; all four permanent documents remain byte-stable and the Task transaction state is `NONE`.
- PASS — after terminal synchronization, the packaged validator accepts Task 0071 as canonical `DONE/PASSED`; focused foundation/current-queue tests, format, and diff checks pass with no adjacent Task mutation.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16881 | 16881 | 227 | 227 | 0 | 0.00% | setup, usage, and contributor entry | Not applicable — invocation, installation, doctor usage, development commands, and release status do not change. | README remains byte-stable; fixture mechanics and current evidence stay in tests and this pair. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — routing, authority, preservation, and completion rules do not change. | AGENTS remains byte-stable; selected-entry chronology stays Task-owned. |
| `docs/SPEC.md` | 43524 | 43524 | 452 | 452 | 0 | 0.00% | observable product behavior and acceptance | Full-source reconciliation confirms the existing over-warning SPEC already owns supported-host path safety, read-only doctor behavior, and frontier-relative delivery meaning, so this Task requires zero new durable bytes. | The existing sections absorb the complete meaning unchanged; fixture mechanics and current frontier evidence stay in source/tests and Task 0071 rather than growing SPEC. |
| `docs/ARCHITECTURE.md` | 40251 | 40251 | 816 | 816 | 0 | 0.00% | stable components, boundaries, dependencies, flows, and distribution | Not applicable — candidate containment, doctor inspection, continuity, and verification boundaries remain unchanged. | ARCHITECTURE remains byte-stable; exhaustive path and frontier mechanics belong in source/tests. |
| `Combined` | 104601 | 104601 | 1543 | 1543 | 0 | 0.00% | all four permanent-document owners | Not applicable — no durable owner meaning changes. | All four permanent documents remain byte-stable and current evidence stays in Task 0071. |

## Unverified

- The corrected native-junction behavior passed locally on Windows Node 24.11.0; Node 22 and POSIX exact-head execution remain hosted CI evidence rather than a second local runtime claim.
- Live GitHub observations are current read-only evidence and can drift after capture; ordinary delivery freshly validates Task 0071's own exact-head, merge-compatibility, merge, and post-main graph.
- Repository verification is complete. The non-force push, PR, automatically triggered CI, expected-head merge, and post-main observation remain the separate ordinary `STANDARD` delivery gate.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
