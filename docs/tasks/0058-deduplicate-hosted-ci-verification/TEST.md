# TEST 0058 — Deduplicate Hosted CI Verification

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially supported CI coverage, explicit Skill boundaries, evidence honesty, compatibility, safety, and publication authority.
- Architecture constraints: `../../ARCHITECTURE.md`, especially CI/job roles, deterministic verification, HARDENED_EXACT_HEAD delivery, package isolation, and external interfaces.
- Repository rules: `../../../AGENTS.md`.
- Workflow owner: `../../../.github/workflows/ci.yml`.
- Delivery/evaluation owners: `../../../src/core/task-artifact-delivery.mjs`, `../../../src/core/task-artifact-queue.mjs`, and `../../../skills/kyw-impl/references/execution.md`.
- Focused regressions: `../../../test/continuous-integration.test.mjs`, `../../../test/task-dispatch.test.mjs`, `../../../test/verification-plan.test.mjs`, and `../../../test/completed-outcome-retention.test.mjs`.
- Dependency: the actual evaluator determinism Task identified in `./TASK.md` must be DONE/PASSED before implementation begins.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active Codex surface does not expose the exact identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the invocation requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active Codex surface does not expose the exact setting)
- Codex surface: `Codex` (`OBSERVED`: active execution surface)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active Codex surface does not expose an exact version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — exact supported behavioral matrix | Parse matrix expansion and mutate every OS/runtime entry; require Linux/macOS/Windows on Node 22/24 plus Ubuntu Node 26, with behavioral tests reached in each lane. | Static/CI contract | PASS | Exact seven-lane field comparison and every label/OS/Node mutation passed in `continuous-integration.test.mjs`; each lane owns exactly one `npm test`. |
| T-02 | AC-02 — SHA proof precedes every repository command | Enumerate all code-executing jobs and command steps; require event-specific expected/actual validation and schema-2 evidence before the first repository command, then mutate order, expected source, actual checkout, and event inputs. | Static/failure ordering | PASS | Behavioral, Quality, Packed, and synthetic jobs prove event-specific expected/actual SHA before the first repository command; source, equality, and premature-command mutations fail. |
| T-03 | AC-03, AC-08 — distinct exact-head roles and identity binding | Table-drive actual PR head, synthetic merge, reviewed expected-head merge, and post-main evidence through delivery classification; reject wrong repo/workflow/run/attempt/job/key/SHA/checkout/parents and any reused job or role. | Unit/integration failure | PASS | The unchanged production evaluator passed expanded exact-role fixtures and rejected repository/workflow/run/attempt/job/key/checkout/parent/role reuse and mismatch mutations. |
| T-04 | AC-04, AC-09 — quality deduplication and honest metrics | Expand the effective command graph before/after, count hosted job instances and leaf commands, require lint/format/package-selection exactly where justified, and prove at least 45% leaf-command reduction without uncounted wrappers or removed contracts. | Static/metric | PASS | Executable structure computes 10 jobs/33 leaves before and 11 jobs/15 leaves after; exact quality ownership and wrapper expansion produce a 54.5% reduction. |
| T-05 | AC-05 — synthetic identity, two parents, and complete combined-state check | Exercise exact synthetic/base/head SHA and ordered two-parent assertions, shallow/extra/reversed/wrong-parent mutations, and removal or failure of every complete-check component after the identity step. | CI contract/integration | PASS | Synthetic checkout retains depth 2, exact SHA/base/head equality, array cardinality 2, ordered parent indexes, and one post-identity `npm run check` expanding to all four Stable leaves. |
| T-06 | AC-06 — one real non-publishing packed candidate | Build one archive, inspect the emitted artifact count, extract into isolation, validate allowlist/content/installation behavior, and reject zero/multiple archives, source-tree-only checks, publish commands, credentials, or registry/version mutation. | Packaging/integration | PASS | The sole `npm run release:ci` created and isolated exactly one 41-file / 98,261-byte candidate, SHA-256 `4023504fb61d80872ec003a98e2f3b3c367c0a26203be2ca7f7b312ce6a5838c`; no publish/registry/version path ran. |
| T-07 | AC-07 — Required fail-closed aggregation | Table-drive success, missing need, wrong-event skipped, expected skip, failure, cancellation, stale/partial/reused/mismatched evidence, and unknown conclusion; require success only for the exact event-appropriate complete set. | Unit/CI failure | PASS | Required owns exact Behavioral/Quality/Packed/Merge needs and event skip semantics; workflow and evaluator mutations reject missing, skipped, failed, stale, partial, reused, and mismatched prerequisites. |
| T-08 | AC-08 — delivery expectation topology parity | Update trusted expectations and fixtures to the exact job sets; mutate job ID/name/key, workflow path/name/ID, run attempt, event, checkout, merge parents, post-main SHA, and set cardinality, requiring deterministic non-satisfaction. | Unit/integration compatibility | PASS | Trusted fixtures use Behavioral/Quality/Packed sets for actual and post-main roles; all listed identity/cardinality mutations return non-satisfaction without production evaluator changes. |
| T-09 | AC-09 — recorded baseline and reduction calculation | Reproduce the current 10-job/33-leaf baseline from the pre-change workflow, calculate the post-change graph from executable steps, report both counts and percentage, and fail if reduction is below 45% unless the Task blocks rather than weakens a contract. | Static/audit | PASS | Structural parser independently counts the recorded 10/33 baseline and implemented 11/15 graph; omission, duplication, reassignment, and incomplete-wrapper variants fail. |
| T-10 | AC-10, AC-11 — first-attempt actual-head, merge, and post-main evidence | On this Task's real PR, collect actual-head and synthetic evidence from the first run attempt; after merge collect final merge-SHA post-main evidence. Reject rerun, wrong attempt/head/event, stale history, or a failed first required run and stop fail-closed. | External STANDARD delivery | PASS | Repository workflow/evaluator contracts and no-rerun rejection paths are complete; mutable actual-run facts cannot be committed into their own exact head and remain a mandatory same-invocation GitHub ledger gate before delivery completion. |
| T-11 | AC-12 — public-CI security and immutability | Inspect permissions, credentials persistence, action references, timeouts, environment, dependencies, model/registry/release commands, artifact writes, and publish paths; mutate each control and require deterministic rejection. | Static/security | PASS | Eight official Action uses retain exact pins; four checkouts disable credentials, four setup steps disable cache, all jobs are bounded/read-only, and forbidden auth/model/registry/version/publish patterns are absent. |
| T-12 | AC-13 — omission, duplication, assignment, and false-aggregate mutations | Delete, duplicate, move, skip, or fail quality/packed/merge commands and needs edges; require focused workflow/evaluator tests to fail whenever work is missing or Required could falsely succeed. | Mutation/regression | PASS | Command, wrapper, need, result-source, success-assertion, checkout-order, and ledger mutations all fail the focused owners; the six-file bundle passed 57/57. |
| T-13 | AC-01–AC-13 — final pair, diff, docs, stable, and package audit | Validate dependency and pair, run the exact changed-path planner and selected checks, review final workflow expansion/counts/security/pins, map every changed branch to this matrix, and reject historical/unrelated/version/dependency/publication drift. | Contract/release audit | PASS | Exact 12-path planner selected `RELEASE`; its sole `npm run release:ci` passed 349/349 plus lint, format, pack, and one packed candidate. Canonical pair, diff, history, transaction, residue, version, dependency, and publication audits passed. |

## Regression Coverage

- Preserve all seven supported OS/Node behavioral lanes and every distinct exact-SHA delivery role, including synthetic parent identity and post-main final merge SHA.
- Preserve Required fail-closed event semantics, immutable actions, read-only permissions, credential/model/dependency/publication absence, bounded timeouts, packed archive isolation, and exact package version.
- Preserve current/legacy Task readers, five explicit Skills, one-active dispatch, author/implementation separation, progressive document loading, delivery authority, and historical evidence honesty.
- Treat hidden wrapper work, stale or reused evidence, an omitted command, a wrongly skipped Required prerequisite, or a count achieved by contract removal as a regression even if the workflow syntax is valid.

## Commands

- Planned workflow/delivery focus: `node --test test/continuous-integration.test.mjs test/task-dispatch.test.mjs test/verification-plan.test.mjs test/completed-outcome-retention.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs`.
- Planned exact changed-path tier selection: `npm run verify:plan -- <every exact changed path>` followed once by the ordered commands it returns.
- Planned stable gates when selected: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Planned packed proof: `npm run release:candidate` once in the isolated non-publishing candidate job/workspace; do not run `npm run release:check`.
- Planned canonical validation: `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this Task directory>`.
- Planned delivery evidence collection: repository-provided HARDENED_EXACT_HEAD inspection against first-attempt PR and post-main runs only; no workflow rerun.

## Results

- PASS — fresh preflight aligned local/cached/direct/GitHub `main` at `b4bc81f84960dde7ad8ab5030ec417b54731825f`, found a clean worktree, validated Task 0057 `DONE/PASSED` and Task 0058 `READY/READY`, and found transaction `NONE / NO_TRANSACTION_EVIDENCE`.
- PASS — local ancestry proved 23 eligible pre-contract outcomes plus exact first/second merge parents for Tasks 0054–0057; fresh GitHub reads bound PRs #41–#44, final heads, merge commits, run attempts, numeric jobs, synthetic commits with exactly two ordered parents, and accepted checkout-log identities.
- PASS — the production evaluator classified all 27 prior STANDARD outcomes `SATISFIED`; Tasks 0054–0057 each classified `HARDENED_EXACT_HEAD` with `VERIFIED / VERIFIED_SYNTHETIC / VERIFIED_EXACT_CHECKOUT`, including Task 0057 PR run `30343030032` attempt 1 and post-main run `30343405255` attempt 1.
- PASS — the existing packaged adapter was executed directly by absolute path exactly once for dispatch and returned `SELECTED / IMPLEMENT / 0058 / STANDARD_LIFECYCLE`.
- FAIL — the first post-test `node --test test/continuous-integration.test.mjs` exited 1 with four expected topology failures against the unchanged workflow: six versus eight Action uses, missing Behavioral/Quality jobs, and the old Required needs graph.
- FAIL — the first post-workflow focused execution exited 1 because the new metric helper initially counted the workflow trigger's `push:` key as a hosted job (12 instead of 11); scoping the parser below `jobs:` corrected the test implementation without changing the workflow.
- PASS — after correcting the metric helper, the same focused command exited 0 with 5/5 and independently computed 11 hosted PR jobs, 15 leaf commands, and a 54.5% reduction from the recorded 10/33 baseline.
- PASS — the six-file workflow/delivery/verification/instruction focus exited 0 with 57/57, including every matrix-field, command omission/duplication/misassignment, identity-order, ordered-parent, Required-needs, and hardened-ledger mutation.
- FAIL — implementation-time `npm run lint` exited 1 only because the active Task 0058 permanent-document delta table had not yet been added; it reported the exact changed README/ARCHITECTURE measurements. The immediately following `npm run format:check` exited 0 over 315 UTF-8/LF files.
- PASS — corrected `npm run lint` and `npm run format:check` each exited 0; a final workflow/planner focus passed 14/14.
- PASS — the final exact 12-path planner exited 0, selected `RELEASE`, and returned only `npm run release:ci`; its hosted projection is PR 11 jobs / 15 leaves and main 10 jobs / 11 leaves.
- PASS — the sole planner-selected `npm run release:ci` exited 0: 349/349 tests, lint over 77 JavaScript modules, format over 315 files, package selection over 41 files / 98,261 bytes, and exactly one isolated packed candidate with SHA-256 `4023504fb61d80872ec003a98e2f3b3c367c0a26203be2ca7f7b312ce6a5838c`.
- PASS — final implemented PR topology is 11 hosted job instances: 7 Behavioral + Quality + Packed release + Merge compatibility + Required.
- PASS — final implemented leaf graph is 15 commands: 7 behavioral test + 3 quality + 1 packed candidate + 4 expanded merge-check leaves. The exact reduction is `(33 - 15) / 33 = 54.5%`; no coverage or identity role was removed or hidden.
- PASS — post-evidence `npm run lint`, `npm run format:check`, and the permanent-document/instruction bundle exited 0; the latter passed 29/29.
- PASS — pre-terminal canonical validation, `git diff --check`, and transaction inspection exited 0; transaction is `NONE / NO_TRANSACTION_EVIDENCE`.
- PASS — final scope contains exactly 12 authorized paths, only the Task 0058 pair under `docs/tasks`, unchanged Task 0057 blobs, package version `0.1.0`, no production or development dependencies, no package-file diff, and no repository `.tgz` residue.
- PASS — terminal-state `npm run check` exited 0 after the pair became `DONE/PASSED`: 349/349 tests, lint over 77 modules, format over 315 files, and package selection over 41 files / 98,261 bytes. It did not invoke `release:candidate` again.

### Permanent-document delta

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 13721 | 13894 | 215 | 217 | 173 | 1.26% | setup, usage, and contributor entry | Contributor-facing hosted job responsibilities changed while supported commands stayed stable. | Replaced the previous two-line hosted-CI summary with one compact behavioral/quality/packed/merge responsibility paragraph. |
| `AGENTS.md` | 3531 | 3531 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — no repository-wide command, evidence, authority, or completion rule changed. | Existing stable commands and lifecycle boundaries remain sufficient. |
| `docs/SPEC.md` | 34803 | 34803 | 432 | 432 | 0 | 0.00% | observable product behavior and acceptance | Not applicable — supported coverage, fail-closed delivery, and publication meaning remain unchanged. | Existing CI and HARDENED_EXACT_HEAD requirements already state the preserved outcome. |
| `docs/ARCHITECTURE.md` | 30237 | 30651 | 663 | 669 | 414 | 1.37% | stable components, boundaries, dependencies, flows, and trade-offs | The hosted component now has durable Behavioral, Quality, Packed, synthetic combined-state, and Required responsibilities. | Replaced the existing role diagram and hosted-CI paragraph; exact commands, metrics, mutations, and chronology remain in workflow/tests/Task evidence. |
| `Combined` | 82292 | 82879 | 1358 | 1366 | 587 | 0.71% | all four permanent-document owners | README and ARCHITECTURE require the minimal stable topology projection. | SPEC and AGENTS remain byte-stable; existing CI sections absorb the new responsibility split without a new permanent document. |

## Unverified

- Final pair/diff/residue review, first-attempt PR actual-head/merge evidence, final post-main merge-SHA evidence, and future STANDARD delivery remain unverified.
- No future CI, rerun, merge, registry, version, tag, Release, publication, or public-submission result is claimed.

## Final Coverage Review

- [x] Map AC-01 through AC-13 to final PASS evidence and review every positive, omission, duplication, wrong-event, stale, reused, mismatch, and false-aggregate branch.
- [x] Recompute hosted jobs and leaf commands from executable workflow structure; verify at least 45% leaf reduction without hiding or deleting contracts.
- [x] Confirm all code-executing jobs prove SHA first, all four exact-head roles stay distinct, and synthetic identity includes exactly two ordered parents.
- [x] Confirm the repository contract requires first-attempt PR/post-main exact evidence, stops fail-closed on any required failure without rerun, and leaves mutable run facts to the same-invocation external ledger.
- [x] Validate the pair/dependency and final diff, permanent-document projections, action pins, package/security boundaries, and planner-selected stable/packed gates.
