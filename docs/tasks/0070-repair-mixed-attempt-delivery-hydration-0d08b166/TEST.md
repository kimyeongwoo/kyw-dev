# TEST 0070 — Repair Mixed-Attempt Delivery Hydration and One-Step Rebaseline

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Hard dependency: Task `0068`, the exact evaluator-complete checkpoint frontier
- Immutable causal evidence and recovery target: Task `0069`, not a hard dependency
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Execution procedure: `../../../skills/kyw-impl/references/execution.md`
- Hydration and continuity owners: `../../../src/core/task-artifact-hydration.mjs`, `../../../src/core/task-artifact-continuity.mjs`, `../../../src/core/task-artifact-delivery.mjs`, `../../../src/core/task-artifact-queue.mjs`
- Process adapter: `../../../skills/kyw-task/scripts/task-artifacts.mjs`
- Existing checkpoint: `../.kyw-dev-standard-delivery-continuity.json`, digest `ffc574a5f32cd52f2ad8003ffee1dc00ea2d9b52638e880aaaea1a722526959e`, last Task `0068`
- Exact mixed-attempt graph: PR `#57`, PR run `30593586295`, post-main run `30599908879`, and immutable Task `0069` base/head/merge identities recorded in `TASK.md`
- External no-mutation baseline: publication run `30592539397` attempt `1` and public `latest=0.1.3`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no model override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Run-level latest attempt and logical-job execution attempts are independently derived from bounded GitHub collections. | Fixture the run, all/latest jobs, every needed attempt-specific collection, pagination, and malformed/partial responses; assert the collector preserves both attempt dimensions and never trusts the log alone. | Unit/integration | PASS | Focused mixed-attempt and GitHub-adapter tests passed; live hydration queried bounded all/latest/attempt-specific collections and retained separate projection/execution attempts. |
| T-02 | AC-02 — The unique latest actual execution is authoritative while a proven untouched earlier execution may remain valid. | Cover one-attempt, full-rerun, subset-rerun, carried projection, and later successful rerun histories; assert authoritative job IDs/attempts and replacement behavior by logical job. | Integration | PASS | One-attempt, full-rerun, and exact PR `#57` subset-rerun fixtures passed; live chronology selected nine PR jobs at actual attempt `1` and Windows/Node 22 plus Required at actual attempt `2`. |
| T-03 | AC-03 — API identity, role/SHA envelope, marker-free gate, and emitted job attempt are exact. | Mutate run ID, workflow, event, PR, role, job key, expected/actual SHA, conclusion, gate dependency, and embedded attempt independently; require exact acceptance only for the derived authoritative execution. | Security/integrity | PASS | Hardened normalization, synthetic-parent, gate, role, checkout, and attempt mutations remained fail closed; live Task `0069` reached the unchanged evaluator only with all exact roles verified. |
| T-04 | AC-04 — No fallback or ambiguous evidence graph is accepted. | Exercise later failed/cancelled/incomplete jobs, missing/malformed logs, stale projections, reused logs, fabricated attempts, same-name duplicates, cross-run/PR/SHA records, role confusion, alias ambiguity, and all/latest/attempt collection mismatch. | Negative/security | PASS | The stale alias, collection attack, projection ambiguity, later non-success, cross-attempt, role, job, checkout, missing-log, and malformed-evidence corpus passed by rejecting every mutated graph. |
| T-05 | AC-05 — Valid legacy shapes and the exact PR `#57` mixed-attempt graph reach the production evaluator. | Run the existing hardened fixture suite plus an exact Task `0069` fixture: run latest `2`, Windows/Node 22 and Required actual attempt `2`, other PR jobs actual attempt `1`, and post-main attempt `1`; require literal `HARDENED_EXACT_HEAD`. | Production-evaluator regression | PASS | Fixture evaluation and the sole live production hydration both returned literal `HARDENED_EXACT_HEAD`; post-main run `30599908879` used actual attempt `1`. |
| T-06 | AC-06 — Existing-checkpoint explicit rebaseline accepts only the exact Task `0068` to Task `0069` frontier. | Fixture valid and invalid checkpoint digest, ordered coverage, pair hashes, current main/ancestry, zero/one/multiple uncovered outcomes, terminal state, and evaluator verdict under `EXPLICIT_REBASELINE`. | Continuity/integrity | PASS | Focused one-step guards passed and live preparation accepted only digest `ffc574…`, last `0068`, sole uncovered `0069`, aligned main `184c080…`, and exact immutable pair hashes. |
| T-07 | AC-07 — Preparation is read-only and token creation is selected-dispatch-only. | Instrument filesystem writes and dispatcher calls for missing/wrong authority, wrong invocation, focused failure, hydration failure, non-selected results, and exact `IMPLEMENT`; require zero pre-dispatch checkpoint writes and a token only in the exact selected case. | Integration/authority | PASS | Adapter authority tests passed; live diagnostics reported `checkpointWritten: false`, then the sole dispatcher selected `IMPLEMENT / 0070` and emitted one opaque token. |
| T-08 | AC-08 — Token application advances exactly through Task `0069` after Task `0070` activation and cannot rewrite or self-cover. | Exercise active/inactive pair, branch/main drift, wrong selected Task, self-coverage, over-gap, stale/divergent token, previous-digest mismatch, exact apply, and existing exact idempotent replay behavior. | Transaction/security | PASS | Continuity regressions passed; after active-pair validation one apply advanced count `37→38`, last `0068→0069`, previous digest exact, and the resulting checkpoint contains no `0070`. |
| T-09 | AC-09 — The one-time pre-dispatch bootstrap is allowlisted, separately authorized, and single-dispatch. | Freeze path/hash fixtures, reject any out-of-allowlist or pre-existing drift, instrument commit/push/PR/CI/external commands, and assert every failure stops before dispatcher or after the one failed call without retry, manual payload, or workaround. | Authority/process | PASS | Exact first-record/path-set self-check and adapter failure tests passed; live counts are one hydration, one dispatcher, one token creation, and one apply with no manual payload, retry, or pre-dispatch external mutation. |
| T-10 | AC-10 — The real immutable Task `0069` graph hydrates credential-free with no adjacent mutation. | Freshly read PR/run/job/log/commit data and public registry state; production-hydrate Task `0069`, compare exact pair hashes and main/checkpoint identities, and resnapshot publication/CI/tag/Release/registry state without mutation. | Live read-only/integrity | PASS | PR `#57`, runs `30593586295` and `30599908879`, ordered identities, and job logs evaluated successfully; Task `0069` hashes stayed exact, publication run `30592539397/1`, `latest=0.1.3`, zero tags, and zero Releases remained unchanged. |
| T-11 | AC-11 — Durable and procedural owners express the corrected narrow meaning without scope drift. | Verify SPEC/ARCHITECTURE and `kyw-impl` owner text, permanent-document measurements and projections, changed-path planning, README/AGENTS stability, and absence of unrelated Windows/release/installer changes. | Documentation/scope | PASS | Owner tests and foundation guard passed; SPEC/ARCHITECTURE and minimum Skill projections are synchronized, the exact delta table is current, and README/AGENTS diffs are empty. |
| T-12 | AC-12 — Complete repository and delivery readiness is auditable. | Run focused tests, verification planner, Stable commands, final diff/matrix review, pair/transaction validation, Task `0069` immutability hashes, no-adjacent-mutation reads, and later Task `0070` ordinary exact-SHA delivery. | Regression/delivery | PASS | Final focused passed 113/116 with three skips; aggregate Stable passed 404/407 with three skips plus lint/format/pack, final scope and matrix are complete, and ordinary GitHub delivery remains the separate external gate. |
| T-13 | AC-13 — Structured status parsing, normal Git type-change records, and terminal newline equivalence preserve exact immutability semantics. | Exercise scalar versus raw porcelain output; exact `" T"`/`"T "` codes and first-record spaces for canonical TASK/TEST paths; LF/CRLF framing; malformed and rename/copy ambiguity; exact allowlist diagnostics; canonical LF/worktree CRLF only under code `" M"`; and semantic/path/link/type drift. | Regression/security | PASS | Historical PR `#58` run `30780897593/1` failure remains recorded. Correction cycle 1 added only `T` to the parser alphabet; targeted passed four with one explicit local symlink-permission skip, focused passed 114/117 with three skips, and Stable passed 405/408 with three skips. Exact TASK/TEST type-change records parse, both regular-file XY type changes remain immutable drift, malformed/rename/deletion/newline negatives pass, and the actual POSIX symlink branch remains the new exact-head hosted-CI proof. |

## Regression Coverage

- A one-attempt successful run and a genuine full rerun remain accepted with exact per-job attempts.
- A subset rerun accepts only uniquely proven carried executions plus the actual later jobs and dependent gate; it never treats every job as the run-level latest attempt.
- A later successful actual execution supersedes an earlier success, while later failure, cancellation, incompleteness, or missing evidence blocks without fallback.
- Actual PR-head, synthetic merge compatibility, reviewed merge, Required gate, and post-main roles retain exact repository/workflow/run/PR/SHA/parent separation and distinct numeric identities.
- Existing stale/cross-attempt, cross-run, cross-PR, cross-SHA, role-confusion, reused-job/log, missing-log, malformed-evidence, pagination, and bound attacks remain rejected.
- Normal aligned-main checkpoint validation, zero/one-uncovered operation, empty-history behavior, exact opaque-token validation, atomic apply, and idempotent exact replay remain intact outside the narrow explicit path.
- Missing/corrupt/stale/forked checkpoints, gaps larger than one, self-coverage, wrong selected Task, and manual delivery/expectation payloads remain unusable as production recovery.
- Task `0069` `DONE/PASSED` bytes and publication chronology remain immutable; Task `0068` remains the dependency and prior checkpoint frontier.
- No PR/job/workflow rerun, publish dispatch, npm authentication, registry mutation, version change, tag, Release, public submission, branch-protection bypass, or unrelated Windows console change occurs.

## Commands

- Exact-state/frozen preflight — `git status --porcelain=v1 --untracked-files=all`, ref/hash/checkpoint reads, exact content hashes, and production-parser exact-set assertions; exit 0 after the corrected production-argument self-check.
- Parser-focused — `node --test --test-name-pattern "Git scalar|pre-dispatch" test/task-delivery-hydration.test.mjs`; exit 0, 4/4.
- Terminal-pair focused — `node --test --test-name-pattern "future terminal delivery binds|production queue validation cannot mask|terminal artifact newline equivalence|terminal-pair porcelain|checkpoint-covered future pairs remain exact" test/task-delivery-hydration.test.mjs`; exit 0, five passes and one host symlink skip.
- Mixed-attempt positive — `node --test --test-name-pattern "authoritative job history accepts" test/task-delivery-hydration.test.mjs`; exit 0, 1/1.
- Mixed-attempt negative — `node --test --test-name-pattern "authoritative job history rejects|hardened normalization rejects" test/task-delivery-hydration.test.mjs`; exit 0, 2/2.
- One-step rebaseline — `node --test --test-name-pattern "existing-checkpoint explicit rebaseline|checkpoint hydration freshly evaluates|explicit Task 0070 rebaseline" test/task-delivery-continuity.test.mjs test/task-delivery-hydration.test.mjs`; exit 0, 3/3.
- Full focused — `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs test/task-dispatch.test.mjs test/task-artifacts.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs`; two pre-hydration executions each exited 0 with 116 tests, 113 passes, and three skips.
- Sole production adapter — `node skills/kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root docs/tasks --invocation '$kyw-impl 0070' --managed-routing false --continuity-bootstrap-authority EXPLICIT_REBASELINE --execution-preflight-json <verified-empty-preflight>`; exit 0 after one hydration and one dispatcher call.
- Selected transition — pair activation, packaged `validate`, then `node skills/kyw-task/scripts/task-artifacts.mjs apply-continuity --tasks-root docs/tasks --selected-task 0070 --transition-token <opaque-token>`; exit 0 on the sole apply.
- Changed-path selection — `npm run verify:plan -- <the 12 exact active paths>`; exit 0, `STABLE`, one ordered command: `npm run check`.
- Stable checks — initial `npm run check` exited 1 during `npm test` with four foundation/distribution failures caused by missing active delta evidence. A later aggregate run exited 1 on the invalid matrix status `RUNNING`; changing it to the canonical nonterminal `TODO` made packaged validation and the queue regression pass. The final `npm run check` exited 0: 407 tests / 404 passes / three skips, lint over 83 modules, format over 347 files, and pack over 43 files / 136,856 bytes.
- Integrity/no-mutation reads — packaged validation for Tasks `0068`–`0070`, transaction inspection, queue inspection, Task `0069` SHA-256, checkpoint JSON, `gh pr view`, GitHub API GETs, `git ls-remote`, public `npm view kyw-dev dist-tags --json`, tag and Release GETs; all completed without mutation.
- Correction exact-state preflight — `git status --porcelain=v1 --untracked-files=all`, local/upstream/ref/hash/checkpoint reads, `git ls-remote`, GitHub app PR reads, `gh pr view 58`, `gh run view 30780897593`, and GitHub `main` ref GET; exit 0 with the expected clean branch/base/head/main/checkpoint/hash state and no mutation.
- CI inspection — the bundled `inspect_pr_checks.py` first exited 1 because Windows CP949 could not decode UTF-8 Actions logs; `python -X utf8 ... --pr 58 --json` then returned the existing failed check graph and exited 1 because failures remain. `gh run view 30780897593 --log-failed` with bounded matching exited 0 and confirmed the exact test, malformed diagnostic, source stack, attempt `1`, and head SHA. Neither command reran a workflow.
- Correction targeted — `node --test --test-name-pattern "delivered pair link|terminal-pair porcelain|newline equivalence|deletion or rename" test/task-delivery-hydration.test.mjs`; exit 0, five tests, four passes, one explicit `file symlink creation is unavailable on this host` skip, zero failures.
- Correction focused — `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs test/task-dispatch.test.mjs test/task-artifacts.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs`; exit 0, 117 tests, 114 passes, three explicit skips, zero failures.
- Correction Stable — `npm run check`; exit 0: 408 tests / 405 passes / three explicit skips / zero failures, lint over 83 JavaScript modules, format over 347 UTF-8/LF files, and pack selection of 43 files / 136,857 bytes.
- Correction final review — `git diff --check`, exact changed-path/source diff, Task `0069` SHA-256, checkpoint JSON, CRLF-guard source reads, and package/publication diff reads; exit 0 with exactly four authorized paths, one production alphabet character, unchanged Task `0069` hashes, checkpoint digest/count/last Task `4db847…` / `38` / `0069`, and no package/publication/checkpoint diff.
- Terminal pair validation — `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0070-repair-mixed-attempt-delivery-hydration-0d08b166`; exit 0 with canonical `DONE/PASSED` state after correction evidence and coverage synchronization.

## Results

- PASS — scalar Git output removes only its final command delimiter while structured porcelain output preserves the first byte; fixed-width LF/CRLF records and exact diagnostics pass, and malformed/ambiguous records fail closed.
- PASS — the actual production-argument worktree self-check read first record ` M docs/ARCHITECTURE.md`, parsed the exact 9 tracked plus 2 untracked paths, and found no exact `ocs/ARCHITECTURE.md` element. The first self-check omitted `--untracked-files=all`, observed Git's collapsed untracked-directory record, made no mutation, and was corrected before live hydration.
- PASS — terminal regular-file comparison accepts only exact bytes or CRLF-pair-to-LF equality for TASK/TEST; character, added/deleted line, trailing-space, final-newline, malformed status, deletion, rename, shadow, link, and unsupported type cases remain immutable failures.
- PASS — the live production call used 379 bounded commands, 17 GitHub API requests, and 30 job-log fetches with zero retries. Task `0069` returned literal `HARDENED_EXACT_HEAD`, actual head, ordered synthetic parents, expected-head merge, and exact-SHA post-main roles all verified.
- PASS — PR run `30593586295/2` selected Windows/Node 22 job `91049018006` and Required job `91049232063` at actual execution attempt `2`; the other nine successful PR logical jobs retained uniquely proven actual attempt `1`. Post-main run `30599908879/1` selected all ten required logical jobs at actual attempt `1`.
- PASS — one prepared checkpoint had previous digest `ffc574a5f32cd52f2ad8003ffee1dc00ea2d9b52638e880aaaea1a722526959e`, sole uncovered Task `0069`, and no pre-dispatch write. The sole dispatcher returned `SELECTED / IMPLEMENT / 0070` and one opaque transition.
- PASS — after `IN_PROGRESS/RUNNING` validation, the sole token apply wrote digest `4db847cb90b443f1e0e419bc39582ec7c4f29cd26b3114ae5dfae2ee01e43fec`, count `38`, last Task `0069`, exact previous digest, aligned source/covered main `184c0802a3327a1c287634e701206b31dec44b2f`, and no Task `0070` self-coverage.
- PASS — Task `0069` remains byte-identical at TASK SHA-256 `53d973f700ce91b3ee4f3c92692c7ba691e622732f36c9cb95f7691ee522e813` and TEST SHA-256 `6da2f8f8f4af2734753d4f7adcb9ac357c0b528e3589053bda941612cb283a67`.
- PASS — PR `#57` remains merged at exact base/head/merge `caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0` / `52bf834fd2ef19b4e56d5e9571cb50279dd34391` / `184c0802a3327a1c287634e701206b31dec44b2f`; PR CI, post-main CI, and publication remain their recorded successful attempts.
- PASS — public `latest=0.1.3`, zero Git tags, zero GitHub Releases, publication run `30592539397/1`, package version, workflow history, and registry state remain unchanged; no npm login, publish, dispatch, account inspection, dist-tag mutation, or public submission occurred.
- PASS — final focused, aggregate Stable, diff/matrix coverage, immutable-hash, queue, pair, transaction, checkpoint, documentation, and external no-adjacent-mutation checks all pass; repository outcome is complete.
- FAIL — PR `#58` exact-head CI run `30780897593`, attempt `1`, at `a5d1f54fd4641e96b1e4e7220da8566fd9f42a47` failed `production queue validation cannot mask a delivered pair link`: `parseTerminalPairWorktreeStatus()` rejected Git's normal type-change status as `worktree porcelain status is malformed or ambiguous`, so the expected exact canonical path plus link/unsupported-type diagnostic was masked before `lstat()`. The run remains untouched and will not be rerun.
- PASS — correction cycle 1 accepts exact `" T"` and `"T "` records with their first-row leading space and canonical TASK/TEST paths intact; type changes cannot enter the exact-code `" M"` CRLF exception, and a regular file with either type-change code is rejected as immutable worktree shadowing rather than malformed status.
- PASS — targeted, focused, and Stable checks preserve malformed XY, rename/copy ambiguity, deletion/rename, character/space/line/final-newline drift, mixed-attempt hydration, and one-step rebaseline behavior. The local host explicitly skipped only actual symlink creation; no pass is claimed for that host-only integration branch before new POSIX CI.
- PASS — final review proves exactly four authorized changed paths, one-character production semantics, unchanged Task `0069` bytes, unchanged count-38 checkpoint through Task `0069`, and no npm/package/publication/tag/Release implementation change.
- PASS — the reterminalized Task `0070` pair validates canonically; a final validation is repeated after recording this evidence before commit.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16881 | 16881 | 227 | 227 | 0 | 0.00% | setup, usage, and contributor entry | Not applicable — supported setup, usage, contributor workflow, and public release status do not change. | README remains byte-stable; the correction is internal delivery evidence handling. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — repository-wide routing, authority, preservation, and completion rules do not change. | AGENTS remains byte-stable; the one-time exception stays in the Task and owning execution procedure. |
| `docs/SPEC.md` | 42016 | 43524 | 452 | 452 | 1508 | 3.59% | observable product behavior and acceptance | Durable delivery truth must distinguish a run's latest attempt from each logical job's authoritative execution, bound the one-frontier explicit correction, and define the sole line-ending equivalence. | Existing STANDARD delivery paragraphs absorb the corrected selection, recovery, and immutable-worktree semantics without a new section; fixtures and chronology remain in tests and Task evidence. |
| `docs/ARCHITECTURE.md` | 38557 | 40251 | 792 | 816 | 1694 | 4.39% | stable components, boundaries, dependencies, flows, and distribution | The GitHub collection-to-job normalization flow, read-only prepare-to-selected-token boundary, and terminal porcelain/blob comparison order changed and require durable system-boundary documentation. | Existing external-ledger and STANDARD delivery flow sections absorb reconciliation, one-step recovery, and CRLF-only worktree equivalence; algorithms and Task-specific constants remain in source/tests. |
| `Combined` | 101399 | 104601 | 1519 | 1543 | 3202 | 3.16% | all four permanent-document owners | SPEC and ARCHITECTURE must agree on authoritative per-job attempts, the narrow one-step correction, and exact terminal-worktree drift semantics while setup and repository-wide rules remain unchanged. | Two existing owner sections replace the incomplete attempt and worktree meanings; README and AGENTS remain byte-stable and detailed evidence stays Task-owned. |

## Unverified

- Actual symlink creation was unavailable on this local Windows host; the new exact-head POSIX CI is the canonical cross-platform execution proof for the exact-path link/type diagnostic.
- A new non-force-pushed exact head, its automatically triggered attempt-1 CI, expected-head merge, post-main exact-SHA CI, and final production-evaluator literal verdict remain the separate ordinary `STANDARD` delivery gate.
- No existing-run rerun, further source patch after the new CI, bypass, publication, registry mutation, tag, Release, public submission, dispatcher, hydration, transition-token, or checkpoint mutation is authorized.

## Final Coverage Review

- [x] Compare the final correction diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows after the correction.
- [x] Add coverage for the introduced `T` parser branches and preserved failures.
- [x] Confirm correction PASS evidence is reproducible.
- [x] Confirm requested regressions ran.
