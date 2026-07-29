# TEST 0061 — Enforce Future Terminal Task/Test Immutability

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially Task/Test artifact compatibility, hard dependencies, queue selection, evidence honesty, and the `STANDARD` delivery contract.
- Architecture constraints: `../../ARCHITECTURE.md`, especially Task artifact runtime, existing-Task flow, exact-SHA delivery, evidence storage, rolling continuity, and package boundaries.
- Repository rules and projection: `../../../AGENTS.md` and `../../../templates/project/AGENTS.md`.
- User-facing contract: `../../../README.md`.
- Canonical procedures: `../../../skills/kyw-task/SKILL.md`, `../../../skills/kyw-impl/SKILL.md`, and `../../../skills/kyw-impl/references/execution.md`.
- Shared runtime owners: `../../../src/core/template-contracts.mjs`, `../../../src/core/task-artifact-contract.mjs`, `../../../src/core/task-artifact-queue.mjs`, `../../../src/core/task-artifact-delivery.mjs`, `../../../src/core/task-artifact-hydration.mjs`, `../../../src/core/task-artifact-continuity.mjs`, and `../../../skills/kyw-task/scripts/task-artifacts.mjs`.
- Dependency and continuity baseline: Task 0060 `TASK.md` and `TEST.md` plus its rolling checkpoint behavior.
- Grandfathering baseline: Task 0059 `TASK.md`, `TEST.md`, first terminal merge, and later correction merge.
- Existing focused regressions: `../../../test/template-contracts.test.mjs`, `../../../test/task-artifacts.test.mjs`, `../../../test/task-dispatch.test.mjs`, `../../../test/task-delivery-hydration.test.mjs`, `../../../test/task-delivery-continuity.test.mjs`, `../../../test/kyw-task.test.mjs`, `../../../test/kyw-impl.test.mjs`, `../../../test/instruction-surfaces.test.mjs`, `../../../test/completed-outcome-retention.test.mjs`, `../../../test/skill-installation.test.mjs`, and `../../../test/distribution.test.mjs`.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — future contract cutover and prior-contract readability | Create old terminal, current nonterminal, and newly authored pair fixtures. Require only the active cutover pair and later pairs to adopt the future contract, while old pairs validate and remain byte-identical. | Contract/compatibility | PASS | Contract/template focused suite passes for contracts 1–3 and rejects unsupported version 4; final historical hash comparison remains in T-12. |
| T-02 | AC-02 — one canonical delivery binds exact terminal bytes | Build a real temporary Git graph with one future Task, exact terminal outcome, protected two-parent merge, and complete hardened evidence. Require one canonical graph, exact pair digests, and stable unchanged terminal satisfaction. | Git/delivery integration | PASS | Temporary real-Git exact-head fixture passes with one protected merge and unchanged pair identity. |
| T-03 | AC-03, AC-09 — later pair mutation fails closed | From the satisfied fixture, independently change `TASK.md`, change `TEST.md`, delete, rename, replace, worktree-shadow, link, case-confuse, and identity-drift each path. Require a pre-dispatch blocker naming the Task/path and byte-identical checkpoint, refs, transaction, and unaffected files. | Mutation/security integration | PASS | Uncovered and checkpoint-covered fixtures reject edit, deletion, rename, unsupported type, shadow, case confusion, link path, history reversion, redelivery, and ambiguous identity before dispatch with Task/path guidance. |
| T-04 | AC-04 — delivered exact invocation is report-only | Invoke the unchanged delivered Task and correction-shaped invocations. Require terminal reporting or exact new-Task guidance, zero pair/status/implementation mutation, zero dispatcher retry, and no second delivery attempt for the original Task. | Routing/behavioral | PASS | Dispatch tests prove unchanged report-only and explicit correction guidance for contract 3 while contract 2 retains grandfathered terminal behavior. |
| T-05 | AC-05 — correction is a new hard-dependent Task | Author a correction fixture through the ordinary batch path. Require a new complete pair with the delivered Task as its canonical dependency, original pair hashes unchanged, normal dependency satisfaction, and no automatic implementation chaining. | Authoring/queue integration | PASS | Correction fixture stays gated before original delivery satisfaction, selects afterward, and preserves original pair bytes. |
| T-06 | AC-06 — real pre-cutover history is grandfathered | Validate and hydrate the repository's Task 0059 two-merge history plus representative unmarked and prior-contract fixtures. Require unchanged queue/delivery classifications and exact before/after hashes for every pre-existing Task/Test file. | Real-Git compatibility | PASS | Real `main` discovery binds Task 0059 to PR #46, accepts later PR #47 under contract 2, and all 120 files for Tasks 0001–0060 equal their `main` bytes. |
| T-07 | AC-07 — no multi-PR chain machinery | Inspect public/runtime schemas, exports, checkpoint bytes, package inventory, and normalized delivery state. Require one canonical graph per future Task and absence of PR arrays, chain receipts, second checkpoints, alternate ledgers, or recursive delivery-history collection. | Architecture/static/package | PASS | Public facade/dependency tests, source search, checkpoint diff, package inventory, and final diff show one graph/checkpoint and no chain, PR array, receipt list, or alternate ledger. |
| T-08 | AC-08 — continuity and hardened evidence regressions | Run covered, one-uncovered, terminal-closure, causal apply, over-gap, exact dependency, actual-head, synthetic merge, review, protected merge, and post-main fixtures across grandfathered and future contracts. | Delivery/continuity regression | PASS | Full 386-test suite passes every existing continuity and hardened-evidence branch with only three explicit environment/live skips. |
| T-09 | AC-09 — ambiguous and malformed state is failure-atomic | Mutate contract versions, canonical merge candidates, evidence roles, repository identity, paths, ancestry, and checkpoint inputs. Require deterministic errors before dispatch and no owned or unrelated mutation. | Failure/security regression | PASS | Focused and full suites reject version 4, ambiguous candidates, path/type/link/identity drift, stale evidence, ancestry/checkpoint mismatch, and over-gap state without mutation. |
| T-10 | AC-10 — source, direct, and packed/plugin parity | Exercise fresh source, direct user/project, tarball, and local marketplace processes. Require identical contract behavior, package exclusion, version/dependency/lifecycle stability, and no repository checkpoint packaging. | Distribution/integration | PASS | 48 installation/distribution tests, 43-file pack and packed candidate pass; version stays `0.1.0`, dependency/lifecycle fields stay absent, and the repository checkpoint stays excluded. |
| T-11 | AC-11 — permanent and procedural truth stays consistent | Inspect SPEC, ARCHITECTURE, README, root/generated AGENTS, Skill/reference owners, prompts, templates, and permanent-document delta evidence for one concise immutable-boundary meaning and no copied chain procedure. | Documentation/instruction static | PASS | All 29 instruction/retention tests, foundation lint, exact delta table, owner diff, and 36,849-byte representative bundle pass without raising the 36,864-byte limit. |
| T-12 | AC-01–AC-12 — final scope, verification, and history audit | Run the exact final changed-path plan and every selected non-publishing check; validate all pairs/queue, compare pre-existing hashes, inspect full diff/package/publication state, and map each introduced branch to executed evidence. | Stable/Release/integrity | PASS | Planner selected Stable for 25 paths; release composite, all 61 pair/queue checks, old-byte comparison, direct/packed checks, diff whitespace, package boundaries, and zero tag/Release state pass. |

## Regression Coverage

- Current Task/Test status pairs, canonical dependency grammar, one-active selection, exact/next/continuous routing, and terminal all-complete verdicts.
- Unmarked legacy and prior current-contract pair validation without historical rewrites.
- Task 0059 first terminal delivery plus its later correction merge, and Task 0060 rolling continuity checkpoint bootstrap/steady-state behavior.
- `HARDENED_EXACT_HEAD` repository/workflow/base/head/run/attempt/job/log/checkout/synthetic-parent/review/merge/post-main identity rules.
- Covered continuity, one-uncovered fresh proof, causal one-delivery lag, over-gap/rebaseline failure, aligned-main trust, and pair-digest enforcement.
- New Task batch allocation, deterministic key derivation, hard-dependency graph validation, one next implementation command, and no create-and-execute chaining.
- Current-Task mutation boundary, terminal report-only behavior, preservation of other numbered Tasks, and final diff coverage review.
- Source/direct/plugin runtime parity, package allowlist and checkpoint exclusion, package/plugin `0.1.0`, zero dependencies, and lifecycle absence.
- Permanent-document ownership/growth, root/generated instruction projection, GitHub current-ledger authority, and publication separation.

## Commands

- Executed focused contract/queue command: `node --test test/template-contracts.test.mjs test/task-artifacts.test.mjs test/task-artifact-prevalidation.test.mjs test/task-dispatch.test.mjs`.
- Executed focused hydration command: `node --test test/task-delivery-hydration.test.mjs`.
- Executed hydration/continuity/dispatch regression command: `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs test/task-dispatch.test.mjs`.
- Executed instruction/retention command: `node --test test/kyw-task.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs test/completed-outcome-retention.test.mjs`.
- Executed instruction budget retry: `node --test test/instruction-surfaces.test.mjs`.
- Executed full focused contract/runtime command: `node --test test/template-contracts.test.mjs test/task-artifacts.test.mjs test/task-artifact-prevalidation.test.mjs test/task-dispatch.test.mjs test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs`.
- Executed installation/distribution command: `node --test test/skill-installation.test.mjs test/distribution.test.mjs`.
- Executed direct behavioral command: `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures`.
- Executed exact changed-path planner: `npm run verify:plan -- <25 exact changed paths>`.
- Executed full non-publishing gate for package-sensitive bytes: `npm run release:ci`.
- Executed pair/queue validation in one Node process, plus `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- Executed Tasks 0001–0060 working/main byte comparison in one Node process, `git diff --check`, package metadata/diff inspection, exact `main` identity checks, and GitHub tag/Release counts.
- Inspected PR #49 exact-head Actions run `30426553069`, attempt 1, and the original failed logs for representative Ubuntu, macOS, Windows, and merge-compatibility jobs without rerunning them.
- Executed focused hydration retry after the exact-SHA checkout portability correction: `node --test test/task-delivery-hydration.test.mjs`.
- Executed the terminal-state Stable retry after that correction: `npm run check`.

## Results

- PASS — the initial authored `READY/READY` pair validated under contract 2, and transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`.
- PASS — the Tasks 0001–0060 immutable baseline contains exactly 120 Task/Test files with aggregate SHA-256 `51dd92b113ea3f0d149c126612fcdf4a77bfc70a15a7c256dddbc5117c7c3240`.
- PASS — local `HEAD`, local `main`, upstream `main`, cached `origin/main`, direct remote `main`, and GitHub `main` all equal `4aa0d7dfea29b8980677a870d48a57b39f8092ef`; the only pre-dispatch worktree paths were this selected untracked pair.
- PASS — the sole packaged dispatcher call production-evaluated the one uncovered Task 0060 outcome, returned `SELECTED / IMPLEMENT / 0061` with ordinary `STANDARD` authority, and prepared one opaque continuity transition without exposing its bytes.
- FAIL → PASS (operator-only preflight correction) — unsupported `--help` and mistyped plural `inspect-transactions` probes exited 1 and printed the canonical adapter grammar; the documented `validate` and singular `inspect-transaction` commands then exited 0 without repository mutation.
- PASS — the opaque predecessor transition was applied once and advanced the rolling checkpoint through Task 0060 at digest `5ed4f0cf3e82dc77ce6c22ba06660e4abf3a3e006bf7feeb5f0e6cc1eab1fb1a`.
- FAIL → PASS — the first contract-focused run exposed one obsolete contract-2 fixture expectation; after migrating only new-authoring fixtures to contract 3, all 63 focused contract/queue/dispatch tests passed.
- PASS — the temporary-Git hydration suite passed 20 tests with one intentionally skipped platform-sensitive link case, covering unchanged binding, both pair mutations, delete/rename/type/shadow, committed change-and-reversion, duplicate delivery, and ambiguous candidates.
- PASS — the combined hydration/continuity/dispatch regression passed 50 tests with two intentional skips before the final checkpoint-path refinement.
- FAIL → PASS — the representative instruction bundle initially exceeded its 36 KiB hard budget at 38,069 bytes, then at 37,093 and 36,930 bytes during compaction; the unchanged 36,864-byte ceiling now passes with all nine instruction-surface tests.
- FAIL — the first foundation lint reached permanent-document validation and required this Task's exact four-owner delta evidence; JavaScript syntax validation had already passed, and no budget was raised.
- PASS — the refined hydration/continuity/dispatch regression passes 58 tests with three intentional environment/live skips, including production-queue deletion/rename/case confusion, checkpoint-covered normalization/history, and the real Task 0059 two-merge history.
- FAIL → PASS — the first complete focused aggregate found the historical parser had introduced an unnecessary direct hydration-to-contract module edge; parsing was routed through the queue's existing canonical owner, restoring the tested dependency graph without changing behavior.
- PASS — `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures` returned `{"valid":true,"method":"CURRENT_SESSION_DIRECT","scenarioCount":6}`.
- PASS — installation/distribution verification passed 48/48 across isolated direct, user/project, npm tarball, and marketplace/plugin lifecycles.
- PASS — the exact 25-path planner selected `STABLE` and required `npm run check`; hosted PR/main exact-SHA roles remain required.
- PASS — `npm run release:ci` passed 383/386 tests with three explicit skips, lint over 81 modules/foundation, format over 326 text files, a 43-file/130,721-byte pack check, and packed candidate SHA-256 `889287f9d19974d3dc771d8f351f3fa3c2523f18743ab460b4872099b0d7919b`.
- PASS — all 61 Task directories validate; queue inspection reports 54 `DONE/PASSED`, five historical `BLOCKED/BLOCKED`, one historical `CANCELLED/BLOCKED`, this sole terminalizing pair, zero errors, and contracts 1/2/3 at 29/31/1.
- PASS — every one of the 120 Task/Test files for Tasks 0001–0060 is byte-identical to `main`; the working and `main` comparison manifests both hash to `39e0a94de01b3a36f3859f6966a1e35cd2907c923478d59060914fb614386d9c`.
- PASS — package/plugin stay `0.1.0` with no dependency or lifecycle fields, no package/workflow/manifest diff, no added packaged path, and no local or GitHub tag/Release.
- PASS — `git diff --check`, transaction `NONE / NO_TRANSACTION_EVIDENCE`, final 25-path scope, negative chain-state search, and local/upstream/cached/direct/GitHub `main` equality at `4aa0d7dfea29b8980677a870d48a57b39f8092ef` all pass.
- PASS — after the pair entered `DONE/PASSED`, canonical validation and terminal-state `npm run check`, including the post-Actions correction retry, passed 383/386 tests with the same three explicit skips, lint over 81 modules/foundation, format over 326 files, and the unchanged 43-file/130,721-byte pack boundary.
- FAIL → PASS — PR #49 run `30426553069` at exact head `33dc27fc59065d29e1ab06e3f430f169c9442ccd` passed quality and packed release but failed all seven behavioral jobs plus merge compatibility because the real Task 0059 graph assertion addressed absent `refs/heads/main` in shallow detached checkouts. The original attempt was not rerun; the assertion now skips only when complete local `main` history is unavailable, while the full-checkout retry passes 23/25 with the existing link and live skips.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 14666 | 15189 | 223 | 229 | 523 | 3.57% | setup, usage, and contributor entry | Users need the future terminal report-only behavior, explicit correction command, and grandfathering boundary. | The existing Task execution and evidence paragraphs absorb the rule; no command catalog or procedural section was added. |
| `AGENTS.md` | 3731 | 3945 | 48 | 48 | 214 | 5.74% | repository-wide Codex rules | Managed repositories need one thin invariant preventing mutation of delivered future pairs. | One existing scope-and-routing bullet absorbs immutability and correction authority; mechanics remain in the execution reference. |
| `docs/SPEC.md` | 37084 | 39176 | 439 | 447 | 2092 | 5.64% | observable product behavior and acceptance | Contract-3 cutover, canonical byte binding, report-only delivery, hard-dependent correction, and prior-contract compatibility are changed product requirements. | Existing artifact, implementation, delivery, and package requirements absorb the behavior without a new permanent owner or delivery-chain model. |
| `docs/ARCHITECTURE.md` | 33558 | 34915 | 714 | 735 | 1357 | 4.04% | stable components, boundaries, dependencies, flows, and trade-offs | The shared contract reader, delivery graph binding, pre-dispatch enforcement path, and correction boundary are durable system structure. | Existing runtime, flow, evidence, storage, and trade-off sections absorb the boundary; exact algorithms and fixtures remain in source/tests. |
| `Combined` | 89039 | 93225 | 1424 | 1459 | 4186 | 4.70% | all four permanent-document owners | Behavior, structure, user guidance, and repository mutation authority all change at the contract-3 delivery boundary. | Four existing owner projections replace mutable-terminal meaning concisely; no new permanent document, ledger, receipt list, or copied procedure was added. |

## Unverified

- This Windows host could not create the focused file-symlink fixture without elevated link permission; the same future-pair branch is covered by unsupported-type/link-aware code plus existing native link/junction regressions, and hosted Linux exact-head CI remains required.
- This Task's PR actual-head, reviewed protected merge, and post-main evidence do not exist yet and are not pre-claimed; ordinary authorized `STANDARD` delivery must establish them before final delivery reporting.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
