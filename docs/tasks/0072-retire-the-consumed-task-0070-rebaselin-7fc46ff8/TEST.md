# TEST 0072 — Retire the Consumed Task 0070 Rebaseline Shim and Restore Portable Task IDs

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: ./TASK.md
- Product requirements: ../../SPEC.md
- Architecture constraints: ../../ARCHITECTURE.md
- Pre-entry continuity baseline: `../.kyw-dev-standard-delivery-continuity.json`, file SHA-256 `bf3b230a21c0363a9c790507f6c7d577b8edda3bf5d5ef979eba0cf0ad4f7ee0`, digest `a055031dff2d216728929b339142e0c19473f1da433245a8c4d967aa89fa3a65`, count `39`, last Task `0070`
- Active continuity baseline after the sole selected-Task transition: file SHA-256 `645bf887d830f3f049717c4e20357bae175437766ba0e2ca28adbc1eaf85449d`, digest `d405e676e2097a439203d2060591d8d5eff829a421d81f883b95e947bf5a4b77`, count `40`, last Task `0071`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no model override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — An ordinary Task 0070 routes like another ordinary Task ID. | Build two isolated equivalent queues, invoke exact selection through the process adapter, and compare selected outcomes and absence of migration errors. | Integration / portability | PASS | Source hydration/adapter comparisons passed for `0070` and `0170`; the extracted tarball's directly installed adapter selected ordinary READY Task `0070` and applied its generic genesis transition. |
| T-02 | AC-02 — All ordinary queue states remain ID-agnostic. | Run IMPLEMENT, RESUME, DELIVER, terminal, invalid, active, and dependency matrices for 0070 and a control ID. | Unit plus integration | PASS | The exact-routing matrix passed DRAFT, IMPLEMENT, RESUME, BLOCKED recheck, CANCELLED, terminal, DELIVER, active conflict, dependency block, and invalid pair states for `0070` and `0170`. |
| T-03 | AC-03 — No Task-specific production hook or state remains. | Inspect exported grammar and run bounded source scans for removed options, validators, identifiers, hashes, branch names, and allowlists. | Static / contract | PASS | Production/package-owner scan returned no retired symbol, option, branch, SHA, checkpoint, pair hash, frozen allowlist, or recovery phrase; the removed dispatch option fails before hydration. |
| T-04 | AC-04 — Every distributed runtime is repository-neutral. | Pack and install an exact candidate, scan source and installed projections, and execute the generic 0070 case through each runtime. | Distribution / integration | PASS | Corrected distribution/isolation passed `80/80`; actual candidate/direct bytes and all 16 cached core files matched, and both direct-installed and cached adapters selected ordinary Task `0070`. |
| T-05 | AC-05 — General explicit migration remains fail closed. | Exercise authorized and unauthorized bootstrap-continuity fixtures for checkpoint validity, gaps, drift, self-coverage, and transition boundaries. | Security / continuity | PASS | Separate command rejects missing/wrong authority; the real backend rejects exact terminal self-coverage, partial history, and any existing aligned-main checkpoint before writing; generic suites cover drift, evaluator, one-step, and transition guards. |
| T-06 | AC-06 — Current documentation distinguishes portable runtime from historical recovery evidence. | Run instruction-surface and foundation assertions and inspect permanent-document and kyw-impl procedure diffs. | Documentation / regression | PASS | Instruction-surface tests passed; owner text now states generic IDs plus separate bootstrap, while README/AGENTS remain unchanged. |
| T-07 | AC-07 — The full correction is verified with immutable history. | Run focused suites, Stable, package scans, Task validation, transaction inspection, checkpoint and Task 0070 hashes, and final diff review. | Regression / delivery | PASS | Corrected RELEASE passed `408/411` with three expected skips plus lint/format/pack/candidate; required marketplace isolation was `CLEAN`, and pair/transaction/hash/scope checks passed. |

## Regression Coverage

- Normal rolling continuity, checkpoint loading, transition token application, and terminal closure remain unchanged.
- Explicit migration still requires separate authority and cannot be reached implicitly through ordinary dispatch.
- Queue precedence, one active Task, exact selection, and dependency eligibility remain stable for every ID.
- Source, npm package, plugin cache, and direct-install runtimes remain behaviorally aligned.
- Task 0070 bytes, active checkpoint coverage through Task 0071, and external delivery history remain immutable.

## Commands

- `node --test --test-name-pattern "Task 0070 exact routing" test/task-dispatch.test.mjs`.
- `node --test --test-name-pattern "ordinary READY Task 0070|ordinary Task 0070 adapter|retired dispatch rebaseline option|bootstrap-continuity remains|bootstrap backend rejects" test/task-delivery-hydration.test.mjs`.
- `node --test --test-name-pattern "rolling continuity remains one-step|trusted continuity reads aligned main|transition token" test/task-delivery-continuity.test.mjs`.
- `node --test test/task-delivery-hydration.test.mjs`; `node --test test/task-dispatch.test.mjs`; `node --test test/task-delivery-continuity.test.mjs`.
- `node --test test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs`.
- `node --test --test-name-pattern "user install writes complete|actual npm tarball installs" test/skill-installation.test.mjs`.
- `node --test test/task-artifacts.test.mjs test/task-dispatch.test.mjs test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs`.
- `node --test test/distribution.test.mjs test/skill-installation.test.mjs test/release-gate-isolation.test.mjs`.
- `npm run release:ci`.
- `node ./scripts/release-gate-isolation.mjs`.
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0072-retire-the-consumed-task-0070-rebaselin-7fc46ff8`.
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- `npm run verify:plan -- docs/ARCHITECTURE.md docs/SPEC.md scripts/packed-release-check.mjs scripts/release-gate-isolation.mjs skills/kyw-impl/SKILL.md skills/kyw-impl/references/execution.md skills/kyw-task/scripts/task-artifacts.mjs src/core/task-artifact-hydration.mjs test/distribution.test.mjs test/instruction-surfaces.test.mjs test/kyw-impl.test.mjs test/skill-installation.test.mjs test/task-delivery-continuity.test.mjs test/task-delivery-hydration.test.mjs test/task-dispatch.test.mjs`.
- Bounded `rg` scan of package owner roots for retired symbols, exact recovery identifiers, hashes, and allowlist markers.
- `git diff --check`; `Get-FileHash` for immutable Task 0070 `TASK.md`, `TEST.md`, and the active continuity checkpoint.

## Results

- PASS — execution preflight aligned local, upstream, direct-remote, and GitHub-derived `main` at `da2cfd6998495074326180e89833f7fee8d00524`; Task 0070 hashes and the count-39 continuity checkpoint matched their recorded Task 0071 baseline, the Task transaction state was `NONE`, and the sole dispatcher selected `IMPLEMENT / 0072` with a prepared predecessor transition.
- PASS — after branch and active-pair validation, one opaque transition application advanced only delivered Task 0071 to count `40` / last `0071` / digest `d405e676…`; Task 0072 remains uncovered and immutable Task 0070 hashes remain exact.
- FAIL (corrected during implementation) — the first focused hydration run imported removed shim-only exports; the stale imports and shim-only tests were removed before rerun.
- FAIL (corrected during implementation) — the first ID-isomorphism matrix expected `ACTIVE_TASK_CONFLICT`; the dispatcher contract correctly returned `ANOTHER_TASK_ACTIVE`, and the fixture expectation was corrected.
- FAIL (corrected during implementation) — the first kyw-impl instruction run asserted retired wording; the assertion was synchronized to the generic no-history-replay wording and passed on rerun.
- PASS — individual full hydration (`34` pass / `2` expected skips), dispatch (`26/26`), continuity (`12` pass / `1` live skip), and instruction (`18/18`) suites passed before the final bootstrap-backend addition; its focused authority/backend rerun passed `2/2`.
- PASS — actual tarball/direct-install focus passed `2/2`; extracted and installed runtime/Skill bytes contain no retired marker, and the installed adapter selected/applied ordinary Task `0070` without migration authority.
- PASS — the combined core regression passed `115/118`, with only the Windows symlink-unavailable and two opt-in live probes skipped.
- FAIL (evidence-only, corrected before rerun) — the first distribution/isolation group passed `77/80`; all three failures were the foundation guard requiring this active TEST's exact permanent-document delta evidence. Runtime, installation, and isolation tests otherwise passed.
- PASS — after adding the exact five-row delta table and cached-core execution proof, the corrected distribution/isolation group passed `80/80` with no skips.
- FAIL (evidence-only, corrected before rerun) — the first full `npm run release:ci` reached `407/411` passes with three expected skips; its sole failure was Task validation rejecting interim matrix status `RUNNING`. The two rows were changed to canonical `PASS`/`TODO`; no runtime check failed, and later Stable stages did not run after `npm test` stopped.
- PASS — the corrected full `npm run release:ci` passed `408/411` tests with three expected host/live skips, lint over 84 modules/foundation metadata, format over 358 UTF-8/LF files, the 43-file / 133,062-byte pack check, and candidate SHA-256 `4a53199baca22e1fdad63cae1509f20da9cfb53a05dc2c785670f6bcf0817f6b`.
- PASS — standalone required-marketplace isolation returned `CLEAN` in one attempt with zero protected-state differences, 17 guarded targets, full cleanup, direct lifecycle success, Codex CLI `0.151.0`, all 16 cached core files byte-identical, and cached Task `0070` selected as ordinary `IMPLEMENT`.
- PASS — final transaction state is `NONE`; active pair validation, `git diff --check`, README/AGENTS zero-diff, exact Task 0070 hashes, active checkpoint hash `645bf887…`, branch identity, empty index, and exact status review all passed.
- PASS — verification planning classified the implementation path set as `RELEASE` and prescribed `npm run release:ci` plus hosted exact-SHA CI.
- PASS — bounded production/package-owner scan and `git diff --check` returned no findings; Task 0070 hashes remain `2d678278…` / `79e47459…`, and the active checkpoint file hash remains `645bf887…`.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16881 | 16881 | 227 | 227 | 0 | 0.00% | setup, usage, and contributor entry | Not applicable — setup, installation, commands, contributor workflow, and release status do not change. | README remains byte-stable; internal runtime recovery retirement stays in the owning product, architecture, Skill, and Task evidence. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — explicit routing, authority, preservation, completion, and delivery rules already express the durable boundary. | AGENTS remains byte-stable; no repository-wide procedure is added or weakened. |
| `docs/SPEC.md` | 43524 | 43443 | 452 | 452 | -81 | -0.19% | observable product behavior and acceptance | Durable product truth must stop presenting the consumed correction as live behavior and state that every four-digit ID uses generic dispatch while migration stays separate. | Existing dispatch, continuity, and distribution paragraphs replace the historical exception with shorter portable-ID and repository-neutral package meaning; algorithms and chronology remain outside SPEC. |
| `docs/ARCHITECTURE.md` | 40251 | 40315 | 816 | 816 | +64 | 0.16% | stable components, boundaries, dependencies, flows, and distribution | The live control flow and package boundary changed from an ID-specific intercept to generic dispatch plus a separately authorized bootstrap component. | Existing runtime, continuity-flow, and package-boundary paragraphs absorb the corrected split without a new section; exact recovery state and proof remain Task-owned. |
| `Combined` | 104601 | 104584 | 1543 | 1543 | -17 | -0.02% | all four permanent-document owners | SPEC and ARCHITECTURE must agree on portable IDs, separate migration authority, and repository-neutral distribution while README and AGENTS remain stable. | Two owner documents replace obsolete exception wording in place; the four-document set shrinks overall and detailed evidence remains in this pair. |

## Unverified

- Local repository verification is complete. Exact-head PR CI, merge, and post-main checks remain the separate ordinary `STANDARD` delivery ledger and are not pre-claimed here.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
