# TEST 0057 — Make Evaluator Process Tests Deterministic

<!-- kyw-task-contract: 2 -->

## Status

READY

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially evaluator isolation, safety, evidence honesty, and public-CI boundaries.
- Architecture constraints: `../../ARCHITECTURE.md`, especially development-only evaluator ownership, child lifecycle, cleanup, publication, and cross-platform trade-offs.
- Repository rules: `../../../AGENTS.md`.
- Production lifecycle owner: `../../../scripts/evaluator-process.mjs` and the audit/grilling evaluator callers.
- Focused tests and fixtures: `../../../test/evaluator-cleanup.test.mjs`, `../../../test/evaluator-process.test.mjs`, `../../../test/evaluator-platform.test.mjs`, and `../../../test/fixtures/evaluator-process/`.
- Immutable external history: GitHub Actions run `30322392806`, attempts 1 and 2, at merge SHA `51f45b3baf3db909deae24beb99a0cb67e43bf0d`.
- Historical repository contracts: Task 0024, Task 0028, and Task 0055 pairs, read-only for this outcome.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the authoring surface does not expose the exact identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the invocation requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the authoring surface does not expose the exact setting)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: the artifact contract requires evidence rather than inference)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the authoring surface does not expose an exact version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01, AC-09 — immutable four-failure map and chronology | Read attempt-specific run/job logs and metadata; assert the same SHA, 329/333 then 333/333 chronology, the four named assertion branches, and no edit to Task 0055 or earlier pairs. Map each branch to T-02, T-03, T-04, or T-05. | External read-only/static | TODO | Not run — newly authored pair. |
| T-02 | AC-02, AC-05, AC-06 — deterministic pure lifecycle/state machine | Drive interruption, timeout, child exit, cleanup start/end, listener removal, and first-cause races with injected clock/scheduler/events; advance state explicitly and assert terminal state without sleep or elapsed-time luck. | Unit/state machine | TODO | Not run — newly authored pair. |
| T-03 | AC-02, AC-04, AC-06 — explicit readiness transport | Gate and atomically publish a run-bound readiness record, expose incomplete/malformed/wrong-run states, and prove consumers wait on a validated handshake or return bounded state diagnostics rather than parse partial JSON. | Unit/integration failure | TODO | Not run — newly authored pair. |
| T-04 | AC-03, AC-04, AC-05 — real owned child-tree native smoke | Spawn a real child plus descendant, wait for the validated handshake, trigger timeout/output/interruption causes, and prove exact owned-tree termination, first cause, cleanup, listener restoration, and no late publication on supported OS boundaries. | Native process integration | TODO | Not run — newly authored pair. |
| T-05 | AC-03, AC-04, AC-10 — Windows console and platform fallback smoke | Retain real Windows console Ctrl+C only as a native boundary; validate handshake/run identity, signal delivery, bounded terminal diagnostics, cleanup, and exit code. Exercise POSIX signal/group and Windows fallback branches without performance thresholds. | Cross-platform native | TODO | Not run — newly authored pair. |
| T-06 | AC-05, AC-06 — cleanup failure, redaction, listeners, and no background work | Table-drive cleanup success/failure/race after interrupt, timeout, max-output, and child exit; require one bounded safe diagnostic, credential/path redaction, unchanged auth source, first-cause preservation, zero leaked listeners, and no state change after settlement. | Unit/integration regression | TODO | Not run — newly authored pair. |
| T-07 | AC-05, AC-06, AC-10 — production-default compatibility | Run audit and grilling success, handled failure, spawn failure, timeout, max output, interruption, partial setup, atomic publication, and platform cleanup through production defaults; compare public classifications and exit codes with retained contracts. | Behavioral regression | TODO | Not run — newly authored pair. |
| T-08 | AC-07 — required public CI remains model-free | Inspect workflows, package scripts, fixtures, and environment access; reject model invocation, credentials, production dependency, registry/auth probe, or evaluator publication in required public CI. | Static/CI security | TODO | Not run — newly authored pair. |
| T-09 | AC-08 — exactly three Windows Node 22 focused invocations | In one authorized Windows Node 22 attempt, run the focused process/cleanup/platform command three separate consecutive times, fail immediately with run-index diagnostics on any failure, and require all three; do not count a workflow rerun or historical attempt 2. | Bounded hosted integration | TODO | Not run — newly authored pair. |
| T-10 | AC-09 — historical evidence byte and meaning preservation | Diff/hash Task 0024, Task 0028, Task 0055, and all other historical pairs; reject edits or wording that converts attempt chronology into repository PASS evidence. | Static/history audit | TODO | Not run — newly authored pair. |
| T-11 | AC-01–AC-10 — final diff, documentation, stable, and delivery audit | Validate the pair, map every changed branch to the matrix, run the exact changed-path planner and selected checks, review cross-platform job evidence from the first attempts, and stop fail-closed on a required failure without rerun. | Contract/release audit | TODO | Not run — newly authored pair. |

## Regression Coverage

- Preserve actual interruption codes, exact owned child/process-group termination, bounded escalation, first-cause precedence, cleanup ownership/order, listener restoration, redaction, auth-source immutability, and atomic publication boundaries.
- Preserve success, evaluator/model failure, spawn failure, timeout, maximum-output, cleanup-failure, partial-setup, and racing terminal classifications for both audit and grilling flows.
- Preserve Windows console and taskkill fallback behavior plus POSIX SIGINT/SIGTERM and process-group behavior; deterministic pure tests do not replace material native evidence.
- Preserve development-only model execution and credential-free/model-free required public CI. No rerun, unbounded stress, or historical relabeling is regression evidence.

## Commands

- Planned focused suite: `node --test test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs test/evaluator-platform.test.mjs`.
- Planned Windows Node 22 bounded proof: execute the focused suite above exactly three times as three fresh Node processes in one attempt, stopping on the first nonzero exit and recording the run index and diagnostics.
- Planned related evaluator regression: `node --test test/audit-smoke.test.mjs test/grilling-eval.test.mjs test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs test/evaluator-platform.test.mjs`.
- Planned exact changed-path tier selection: `npm run verify:plan -- <every exact changed path>` followed once by the ordered commands it returns.
- Planned stable gates when selected: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Planned canonical validation: `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this Task directory>`.

## Results

- Not applicable — no implementation or acceptance command has run for this newly authored pair; run `30322392806` attempt metadata/log inspection is immutable discovery only, not repository behavioral PASS evidence.

## Unverified

- The deterministic seam design, readiness protocol, retained native-smoke set, three-run Windows Node 22 proof, cross-platform regression results, and future STANDARD delivery remain unverified.
- No future PR, CI, rerun, merge, post-main, registry, tag, Release, or publication result is claimed.

## Final Coverage Review

- [ ] Bind all four historical failure branches to final deterministic or native test rows and retain their attempt chronology verbatim in meaning.
- [ ] Map AC-01 through AC-10 to final PASS evidence, including failure, race, incomplete-readiness, slow-runner diagnostic, cleanup, redaction, listener, and no-background cases.
- [ ] Confirm exactly three independent focused Windows Node 22 processes passed in the first authorized attempt; reject rerun or unbounded-loop evidence.
- [ ] Compare cross-platform behavior and the final diff against Task 0024/0028 contracts without editing their files.
- [ ] Validate the pair and run planner-selected stable/packaged checks before completion.
