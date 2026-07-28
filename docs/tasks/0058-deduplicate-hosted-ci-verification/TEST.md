# TEST 0058 — Deduplicate Hosted CI Verification

<!-- kyw-task-contract: 2 -->

## Status

READY

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

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the authoring surface does not expose the exact identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the invocation requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the authoring surface does not expose the exact setting)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: the artifact contract requires evidence rather than inference)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the authoring surface does not expose an exact version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — exact supported behavioral matrix | Parse matrix expansion and mutate every OS/runtime entry; require Linux/macOS/Windows on Node 22/24 plus Ubuntu Node 26, with behavioral tests reached in each lane. | Static/CI contract | TODO | Not run — newly authored pair. |
| T-02 | AC-02 — SHA proof precedes every repository command | Enumerate all code-executing jobs and command steps; require event-specific expected/actual validation and schema-2 evidence before the first repository command, then mutate order, expected source, actual checkout, and event inputs. | Static/failure ordering | TODO | Not run — newly authored pair. |
| T-03 | AC-03, AC-08 — distinct exact-head roles and identity binding | Table-drive actual PR head, synthetic merge, reviewed expected-head merge, and post-main evidence through delivery classification; reject wrong repo/workflow/run/attempt/job/key/SHA/checkout/parents and any reused job or role. | Unit/integration failure | TODO | Not run — newly authored pair. |
| T-04 | AC-04, AC-09 — quality deduplication and honest metrics | Expand the effective command graph before/after, count hosted job instances and leaf commands, require lint/format/package-selection exactly where justified, and prove at least 45% leaf-command reduction without uncounted wrappers or removed contracts. | Static/metric | TODO | Not run — newly authored pair. |
| T-05 | AC-05 — synthetic identity, two parents, and complete combined-state check | Exercise exact synthetic/base/head SHA and ordered two-parent assertions, shallow/extra/reversed/wrong-parent mutations, and removal or failure of every complete-check component after the identity step. | CI contract/integration | TODO | Not run — newly authored pair. |
| T-06 | AC-06 — one real non-publishing packed candidate | Build one archive, inspect the emitted artifact count, extract into isolation, validate allowlist/content/installation behavior, and reject zero/multiple archives, source-tree-only checks, publish commands, credentials, or registry/version mutation. | Packaging/integration | TODO | Not run — newly authored pair. |
| T-07 | AC-07 — Required fail-closed aggregation | Table-drive success, missing need, wrong-event skipped, expected skip, failure, cancellation, stale/partial/reused/mismatched evidence, and unknown conclusion; require success only for the exact event-appropriate complete set. | Unit/CI failure | TODO | Not run — newly authored pair. |
| T-08 | AC-08 — delivery expectation topology parity | Update trusted expectations and fixtures to the exact job sets; mutate job ID/name/key, workflow path/name/ID, run attempt, event, checkout, merge parents, post-main SHA, and set cardinality, requiring deterministic non-satisfaction. | Unit/integration compatibility | TODO | Not run — newly authored pair. |
| T-09 | AC-09 — recorded baseline and reduction calculation | Reproduce the current 10-job/33-leaf baseline from the pre-change workflow, calculate the post-change graph from executable steps, report both counts and percentage, and fail if reduction is below 45% unless the Task blocks rather than weakens a contract. | Static/audit | TODO | Not run — newly authored pair. |
| T-10 | AC-10, AC-11 — first-attempt actual-head, merge, and post-main evidence | On this Task's real PR, collect actual-head and synthetic evidence from the first run attempt; after merge collect final merge-SHA post-main evidence. Reject rerun, wrong attempt/head/event, stale history, or a failed first required run and stop fail-closed. | External STANDARD delivery | TODO | Not run — newly authored pair. |
| T-11 | AC-12 — public-CI security and immutability | Inspect permissions, credentials persistence, action references, timeouts, environment, dependencies, model/registry/release commands, artifact writes, and publish paths; mutate each control and require deterministic rejection. | Static/security | TODO | Not run — newly authored pair. |
| T-12 | AC-13 — omission, duplication, assignment, and false-aggregate mutations | Delete, duplicate, move, skip, or fail quality/packed/merge commands and needs edges; require focused workflow/evaluator tests to fail whenever work is missing or Required could falsely succeed. | Mutation/regression | TODO | Not run — newly authored pair. |
| T-13 | AC-01–AC-13 — final pair, diff, docs, stable, and package audit | Validate dependency and pair, run the exact changed-path planner and selected checks, review final workflow expansion/counts/security/pins, map every changed branch to this matrix, and reject historical/unrelated/version/dependency/publication drift. | Contract/release audit | TODO | Not run — newly authored pair. |

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

- Not applicable — no workflow, test, delivery, or acceptance command has run for this newly authored pair; the 10 hosted job/33 leaf-command baseline is read-only discovery, not a future PASS claim.

## Unverified

- The selected topology, post-change metrics, mutation results, first-attempt PR actual-head/merge evidence, final post-main merge-SHA evidence, and future STANDARD delivery remain unverified.
- No future CI, rerun, merge, registry, version, tag, Release, publication, or public-submission result is claimed.

## Final Coverage Review

- [ ] Map AC-01 through AC-13 to final PASS evidence and review every positive, omission, duplication, wrong-event, stale, reused, mismatch, and false-aggregate branch.
- [ ] Recompute hosted jobs and leaf commands from executable workflow structure; verify at least 45% leaf reduction without hiding or deleting contracts.
- [ ] Confirm all code-executing jobs prove SHA first, all four exact-head roles stay distinct, and synthetic identity includes exactly two ordered parents.
- [ ] Confirm the first authorized PR/post-main attempts provide exact current evidence and stop fail-closed on any required failure without rerun.
- [ ] Validate the pair/dependency and final diff, permanent-document projections, action pins, package/security boundaries, and planner-selected stable/packed gates.
