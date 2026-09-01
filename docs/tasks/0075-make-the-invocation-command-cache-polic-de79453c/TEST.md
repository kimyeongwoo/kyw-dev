# TEST 0075 — Make the Invocation Command Cache Policy-Independent and Strict

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: ./TASK.md
- Product requirements: ../../SPEC.md
- Architecture constraints: ../../ARCHITECTURE.md

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no model override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Tolerant-first cannot make a later strict request fail open. | Request one deterministic nonzero command tolerant then strict and assert one runner call with distinct caller outcomes. | Unit / security | PASS | The direct focused matrix returned the raw status `17` to the tolerant caller, rejected the later strict caller with its exact label, and recorded one miss/one hit/one runner call. |
| T-02 | AC-02 — Strict-first and concurrent mixed policy are order-independent. | Reverse the order and coordinate simultaneous callers around one deferred runner result. | Unit / concurrency | PASS | Strict-first/later-tolerant and deferred concurrent mixed policy both produced caller-owned outcomes with one shared execution. |
| T-03 | AC-03 — Errors belong to the requesting task and role and remain redacted. | Use distinct caller labels and secret-bearing fake output, then assert bounded exact diagnostics and absence of secrets. | Security / diagnostics | PASS | Distinct callers received exact bounded Task/role diagnostics; stdout, stderr, argv, mutable retained errors, and hostile getter secrets were absent, with failure classification sealed before sharing. |
| T-04 | AC-04 — Success dedupe and execution identity include maxBuffer. | Compare identical success requests with command, args, cwd, and buffer variants and assert runner and counter totals. | Unit / cache | PASS | Identical success returned one object/one execution; command, argv, resolved cwd, and maxBuffer variants produced five identities, while caller argv mutation could not alter the snapshotted execution. |
| T-05 | AC-05 — Bounds and runner failures remain fail closed. | Exercise cache exhaustion, command/query limits, child runner errors, oversized results, and no-retry behavior. | Reliability / regression | PASS | Sync throw and async rejection cached once and rejected every policy with caller labels; real stdout/stderr ENOBUFS, invalid numeric bounds, two-entry exhaustion, counters, and no-retry behavior passed. |
| T-06 | AC-06 — Runtime projections and repository verification agree. | Run focused hydration tests, packaged/direct runtime cases, Stable, documentation diff, pair validation, transaction and immutable-hash checks. | Integration / delivery | PASS | Projection passed `80/80`; forced isolation was CLEAN; Stable passed 424/428 with four explicit skips and zero failures; lint/format/pack, candidate, hashes, checkpoint, pair, transaction, foundation, and final scope/coverage review passed. |

## Regression Coverage

- Successful identical commands remain deduplicated and command/query counts remain deterministic.
- Hydration evidence selection, chronology, classification, and continuity behavior remain unchanged.
- All child processes remain shell-free and bounded, with no retry or credential-bearing diagnostics.
- Source, package, plugin-cache, and direct-install exports remain aligned.
- Task 0070 pair bytes remain unchanged, and the post-transition checkpoint stays byte-identical after its one authorized predecessor advancement.

## Commands

- node --test --test-name-pattern "command cache|allowFailure|maxBuffer|redact" test/task-delivery-hydration.test.mjs
- node --test test/task-delivery-continuity.test.mjs test/task-dispatch.test.mjs test/distribution.test.mjs test/skill-installation.test.mjs
- npm test
- npm run lint
- npm run format:check
- npm run pack:check
- npm run release:candidate
- node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <allocated-task-directory>
- node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks
- git diff --check
- Production dispatcher — `node skills/kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root docs/tasks --invocation '$kyw-impl 0075' --managed-routing false --execution-preflight-json <verified-empty-preflight>`
- Selected transition — active pair validation, then `node skills/kyw-task/scripts/task-artifacts.mjs apply-continuity --tasks-root docs/tasks --selected-task 0075 --transition-token <opaque-token>`
- Delegated initial focused authoring/run — `node --test --test-name-pattern "command cache|allowFailure|maxBuffer|redact" test/task-delivery-hydration.test.mjs`; reported exit `0`, eight passes before direct expansion.
- First direct focused expansion — the same command; exit `1`, eight passes / one expected-test assertion failure because the resolved Windows repository root correctly removed a trailing separator that the new expected fixture retained.
- Corrected direct focused matrix — the same command; exit `0`, nine passes / zero failures.
- Final security/bound-focused matrix — the same command; exit `0`, eleven passes / zero failures.
- Complete near regression — `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs test/task-dispatch.test.mjs`; exit `0`, 93 tests / 89 passes / four explicit host/live skips / zero failures.
- First and second projection attempts — `node --test test/distribution.test.mjs test/skill-installation.test.mjs test/release-gate-isolation.test.mjs`; each exit `1`, 80 tests / 77 passes / three candidate failures caused first by missing and then by stale permanent-document growth evidence; actual tarball/direct/marketplace cases passed in both attempts.
- Foundation recheck — direct `assertFoundation(process.cwd())`; exit `0` after aligning entry-main delta evidence.
- Corrected projection matrix — `node --test test/distribution.test.mjs test/skill-installation.test.mjs test/release-gate-isolation.test.mjs`; exit `0`, 80 passes / zero failures.
- Forced cached lifecycle — `node ./scripts/release-gate-isolation.mjs`; exit `0`, CLEAN in one attempt, direct lifecycle passed, marketplace/plugin-cache dispatch passed, cleanup passed, and tarball selected 43 files / 134833 bytes / SHA-256 `d1d587ad10282308ab12e74be7008d6a11281eb4bd4b3c20521c0604c4daef9e`.
- Exact Task-0075-owned changed-path plan — `npm run verify:plan -- docs/ARCHITECTURE.md docs/tasks/.kyw-dev-standard-delivery-continuity.json docs/tasks/0075-make-the-invocation-command-cache-polic-de79453c/TASK.md docs/tasks/0075-make-the-invocation-command-cache-polic-de79453c/TEST.md src/core/task-artifact-hydration.mjs test/task-delivery-hydration.test.mjs`; exit `0`, runtime / `STABLE`, four local leaves plus hosted exact-SHA gates; pre-existing untracked Task 0076 is explicitly excluded and preserved.
- Planner-selected Stable aggregate — `npm run check`; exit `0`: `npm test` 428 tests / 424 passes / four explicit host/live skips / zero failures; lint 84 JavaScript modules plus foundation; format 360 UTF-8/LF files; pack 43 files / 134833 bytes.
- Post-review focused branch closure — `node --test --test-name-pattern "command cache|allowFailure|maxBuffer|redact" test/task-delivery-hydration.test.mjs`; exit `0`, eleven passes / zero failures, including hostile resolved-completion normalization.
- Final package candidate — `npm run release:candidate`; exit `0`, 43 files / 134833 bytes / SHA-256 `d1d587ad10282308ab12e74be7008d6a11281eb4bd4b3c20521c0604c4daef9e`.
- Post-review leaf rechecks — `npm run lint`, `npm run format:check`, and `npm run pack:check`; all exit `0` with 84 modules, 360 files, and 43 files / 134833 bytes respectively.
- Final invariant review — Task 0070 SHA-256, checkpoint parse/hash, Task 0075/0076 pair validation, queue inspection, transaction inspection, permanent-document measurements/foundation, `git diff --check`, status, and scope diff commands; all exit `0` with exact values retained below.

## Results

- PASS — pre-entry pair/dependency validation, Task transaction inspection, Task 0070 immutable hashes, and local/cached/direct/GitHub `main` identity checks found no blocker or unexplained work.
- PASS — the sole production dispatcher call freshly evaluated the one uncovered predecessor, selected `IMPLEMENT / 0075`, and prepared one opaque predecessor continuity transition without repository or external mutation.
- PASS with retained tooling limitation — active-pair validation passed and the transition adapter ran exactly once. The surrounding result serializer then failed, so the transition was not replayed; read-only inspection proved checkpoint SHA-256 `4c45f7108b14f636c1077c0ce512f1bde1ed8b2c71a30fe389daac96bae6dcae`, count `43`, last Task `0074`, digest `b1509329cca7fa288d0982f6905d6325333d576deebb33cc7fcf89dd46361539`, previous digest `7816d140cce98fbf750dd7d15d6e7c7422e036fde57b39442c87165d49e8edd6`, and transaction `NONE`.
- PASS — the final direct focused matrix passed all eleven order/concurrency/identity/redaction/runner/buffer/bound cases, and the complete hydration/continuity/dispatch regression passed 89/93 with only four pre-existing platform/live skips.
- FAIL, FAIL, then PASS — two projection runs retained three foundation-growth-evidence failures while all runtime projection cases passed; after correcting the Task-owned evidence against entry `main`, the identical 80-test projection matrix passed 80/80.
- PASS — the forced release isolation runner independently packed and exercised source/direct/plugin-cache bytes in one CLEAN attempt without changing protected normal state.
- PASS — `npm run check` completed all four Stable leaves: 428 tests / 424 passes / four explicit platform/live skips / zero failures, lint and foundation passed, format passed, and pack selected 43 files / 134833 bytes.
- PASS — the final release candidate matched the forced-isolation archive at SHA-256 `d1d587ad10282308ab12e74be7008d6a11281eb4bd4b3c20521c0604c4daef9e`.
- PASS — Task 0070 remained `2d6782789b3bde4d55aec6565f8086525580debf7538b29bcea7d59fba7ae184` / `79e47459ea9796a948c018b559fdcad4dd920d4062275c6c9131d9cc3d9c9292`; checkpoint SHA-256 remained `4c45f7108b14f636c1077c0ce512f1bde1ed8b2c71a30fe389daac96bae6dcae`, count `43`, last Task `0074`, digest `b1509329cca7fa288d0982f6905d6325333d576deebb33cc7fcf89dd46361539`; transaction was `NONE`; foundation and pair validation passed.
- PASS — exact Task-0075-owned scope is ARCHITECTURE, checkpoint, current pair, hydration source, and hydration test; pre-existing Task 0076 remained untracked and excluded at hashes `b714034c56be70c4d4707367430171cc8765655ffaf7c5c461373ac561c2112c` / `8c7638aa6f8dd9c7f8d2d8b2a8cea70f7ba14bd1fd81d6b7c54065350b3a61ff`.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16881 | 16881 | 227 | 227 | 0 | 0.00% | setup, usage, and contributor entry | Not applicable — setup, commands, configuration, usage, and contributor workflow do not change. | README remains byte-stable; cache mechanics and evidence stay in architecture, source, tests, and this pair. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — routing, authority, preservation, and completion rules do not change. | AGENTS remains byte-stable; this Task uses the existing implementation and delivery lifecycle. |
| `docs/SPEC.md` | 44348 | 44348 | 454 | 454 | 0 | 0.00% | observable product behavior and acceptance | The warning-sized product owner is re-evidenced at its exact entry bytes to prove that Task 0075 does not change observable delivery acceptance or authority. | Existing product requirements remain sufficient; execution-policy mechanics stay below the product-contract boundary. |
| `docs/ARCHITECTURE.md` | 41259 | 41756 | 829 | 836 | 497 | 1.20% | stable components, boundaries, dependencies, flows, and distribution | The invocation-local execution boundary must durably distinguish policy-neutral records and complete identity from per-caller policy and diagnostics. | Existing external-ledger owner text absorbs the corrected cache boundary; exhaustive cases remain in source/tests. |
| `Combined` | 106433 | 106930 | 1558 | 1565 | 497 | 0.47% | all four permanent-document owners | ARCHITECTURE changes while README, AGENTS, and SPEC remain byte-stable; warning-budget evidence is exact against aligned entry `main`. | The changed meaning is absorbed into the existing hydration paragraph without a new permanent section. |

## Unverified

- Hosted exact-SHA PR, review/merge, and post-main evaluation remain the separate ordinary `STANDARD` delivery ledger and are not pre-claimed by repository PASS.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
