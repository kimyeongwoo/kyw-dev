# TEST 0034 — Retire the Cancelled Nested Behavioral Harness
<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules: `../../../AGENTS.md`
- Verification policy: current-session direct and risk-proportionate by default; preserve the configured model and reasoning effort.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose an exact model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user supplied no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose a version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01, AC-07 — Reachability map | Enumerate all imports, scripts, npm commands, tests, docs, and CI references. | Static | PASS | Old runner had one caller: its focused test via `npm test`; no package/Skill/CI/release/current-doc command called it. After deletion, supported surfaces have zero old-path reference. |
| T-02 | AC-02 — Direct fixture contracts | Run preserved S-01 through S-06 deterministic validators. | Acceptance | PASS | Exact 33-file inventory and S-01 through S-06 independent direct contracts passed through the new CLI and 22-test focused suite. |
| T-03 | AC-02 — Untested-branch fixture | Prove the intentional gap remains detected. | Regression | PASS | Focused and CLI validation prove the S-05 working generic test passes while its casual branch remains independently uncovered. |
| T-04 | AC-01, AC-07 — No nested behavioral launch | Assert supported SPEC behavioral paths spawn no Codex/model process. | Negative | PASS | Launch capture observed one `process.execPath --test` child only; static source scan found no retired token/branch, old paths are absent, and `--allow-model` exits `1` before fixture work. |
| T-05 | AC-03 — Historical byte preservation | Hash Task 0026 and retained evidence references before/after. | Integrity | PASS | Task 0026/0027 pair hashes, four retained Task 0026 evidence-tree hashes/file counts, and frozen 33-file fixture hash all match the pre-change baseline exactly. |
| T-06 | AC-04 — Package boundary | Prove removed/retained development files do not alter package allowlist unexpectedly. | Package | PASS | Package stayed at the exact 29-file allowlist; neither old nor new root script/test/fixture path is packed. Size changed 79,011→79,185 bytes only from the packed README guidance. |
| T-07 | AC-06 — Runtime/size delta | Record focused/full test duration and source/test LOC before/after. | Performance | PASS | Focused surface 4,381→850 lines (-3,531/-80.6%); all script/test MJS 20,271→16,740. Fixture validation 701→311 ms; focused suite 455→208 ms. Full wall 32,628→32,727 ms (+0.3%, recorded as variance). |
| T-08 | AC-05, AC-06 — Full stable/release checks | Run repository regression gates. | Regression | PASS | Final `npm run release:ci` passed 240/240 tests, lint, format, and exact 29-file package validation; packed SHA-256 `da7fc6af06ed764095edafa8373887dae3c33d47fd26e3075acd619bf19df813`. |

## Regression Coverage

- Existing Task artifact and template contracts.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, and publication boundaries.
- Exact changed behaviors and error paths discovered during implementation.

## Commands

- `git fetch origin --prune`, guarded Git status/ref/diff inspection, and fresh GitHub PR/Actions queries — PASS; clean baseline and exact delivered dependency identities confirmed.
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0034-retire-cancelled-behavioral-harness` — PASS before lifecycle transition.
- Same validator for Task 0033 and `git diff --check` — PASS before lifecycle transition.
- Managed exact dispatch with fresh local expectations and GitHub exact-SHA ledgers for Tasks 0030 through 0033 and Task 0039 — `SELECTED/IMPLEMENT`, `STANDARD_LIFECYCLE`, no ceremonial confirmation.
- Task 0026 pair SHA-256: `TASK.md` `18645bfaae96c4c16baf202181dcc2bc7a4b352c2228398dfc87490e46859b66`; `TEST.md` `4a1911db978349321ae6ef32937d52371a5aaebfc3d00997c644c55d31cb6e3f`.
- Task 0027 pair SHA-256: `TASK.md` `bf2a0eadd3b95a7a4aa0199a0f087267a97607adb2d1efd01c706209c841590e`; `TEST.md` `47071efae6439d79e8557e38f40d2f43f832dee6021fc66b81b4ba3799127be5`.
- Retained Task 0026 evidence trees: capability probe 2 `f4583ef2a16bdcef878649b01d66203a4a4e16f5b4a0cfbdb614941fbca6da60` (6 files); capability probe 3 `02ed5f516d59f1e0cd7242f7b526da006a0f5d94e72e4deeb29e5afd47243bd8` (6); model capability `14862d5f9063cef68d019ab0b78f076a487caf39496143ccc44a0564fdf00aee` (3); cohort evidence `f7a13876d0644ee29c7689b3010632c99f3e42700bfd8c6e04ad6e0c6b9a5f10` (19).
- `node ./scripts/spec-behavioral-e2e.mjs --validate-fixtures` — pre-change PASS, six scenarios, 701 ms.
- `node --test test/spec-behavioral-e2e.test.mjs` — pre-change PASS, 25/25, 455 ms.
- `npm test` — pre-change PASS, 243/243, 32,628 ms.
- `npm run pack:check` — pre-change PASS, 29 files / 79,011 bytes, 1,227 ms.
- Initial `node --test test/spec-behavioral-acceptance.test.mjs` — FAIL, 21/22; the test passed a file URL where the S-05 proof expected a path string. No fixture or implementation byte changed.
- Corrected replacement focused suite — PASS, initially 22/22; the validator was then simplified to one Node fixture-test launch and the final suite passes 22/22.
- Final like-for-like direct measurements: fixture CLI PASS in 311 ms; focused suite PASS in 208 ms.
- `node --test test/spec-behavioral-acceptance.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs` — PASS, 28/28 before the final negative-flag regression.
- Static reachability/launch/history scan — PASS: no supported old-path reference; one Node fixture-test launch; old paths absent; Task 0026/0027 and fixture diffs empty.
- Post-change historical hashes — exact match for both Task pairs and all four retained evidence roots; fixture tree remains 33 files / `22ea3ac2028a4068ef5ca58f857e471e70d331aaebd14ced1064e95aca91d171`.
- Post-change size: direct script 496 lines, direct test 354 lines, all script/test MJS 16,740 lines / 628,162 bytes; fixture tree unchanged at 33 files / 540 lines / 12,108 bytes.
- `npm test` — post-change PASS, 239/239, 32,727 ms wall.
- `npm run lint` — PASS, 57 JavaScript modules and foundation metadata.
- `npm run format:check` — PASS, 254 UTF-8/LF text files.
- `npm run pack:check` — PASS, unchanged 29-file allowlist / 79,185 bytes; 1,083 ms in the recorded post-change run.
- First post-change `npm run release:ci` — PASS before the final retired-flag CLI regression; embedded 239/239 stable suite and packed SHA-256 `da7fc6af06ed764095edafa8373887dae3c33d47fd26e3075acd619bf19df813`.
- Final focused suite after the retired-flag regression — PASS, 22/22; lint, format, and diff check also passed.
- Final `npm run release:ci` on all terminal implementation/test bytes — PASS in 37,005 ms: 240/240 tests, lint over 57 JavaScript modules and foundation metadata, format over 254 files, exact 29-file / 79,185-byte package, and packed SHA-256 `da7fc6af06ed764095edafa8373887dae3c33d47fd26e3075acd619bf19df813`.
- First terminal pair validation — FAIL because the completed Resume Point did not use the contract's reasoned-`None` form; corrected in Task metadata without changing implementation/test bytes.
- Corrected terminal pair validation — PASS; final documentation-only `npm run format:check` also passed over 254 UTF-8/LF files.
- Do not record an unexecuted method as `PASS`.
- Do not change the configured model or reasoning effort unless the user explicitly directs it.

## Results

- Repository, dependency delivery, pair-validation, selection, and acceptance baselines passed.
- All eight intent-to-test rows pass. Historical/evidence/fixture bytes remain unchanged, the cancelled runner has no supported caller, direct S-01 through S-06 contracts run with only a Node test child, and old execution flags fail closed.
- The final diff contains only the eight intended paths: two documentation updates, this Task/Test pair, replacement script/test additions, and cancelled script/test deletions.
- Maintenance size fell by 3,531 focused lines (80.6%); like-for-like fixture/focused runtimes fell from 701/455 ms to 311/208 ms. Full-suite wall time was effectively unchanged within measured variance.
- Final stable and real-tarball release gates pass on the terminal repository bytes.

## Unverified

- Hosted cross-platform PR and post-merge delivery remain external-ledger work after repository completion; no mutable GitHub result is claimed here.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [x] Confirm required regressions actually ran.
- [x] Confirm this pair records repository evidence only and makes no external-delivery claim.
