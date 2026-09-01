# TASK 0077 — Make Windows Evaluator Fixture Teardown Close-Bound

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Make native evaluator-test teardown deterministic on Windows by retaining the actual spawned `ChildProcess`, treating an observed bounded `close` as the cleanup postcondition, and removing the already-terminated PID/`taskkill` status race without weakening owned-tree termination, failure, or no-background-work behavior.

## Dependencies

- Task 0057.

## In Scope

- Replace the duplicated readiness-PID-based defensive teardown in the evaluator process and evaluator cleanup tests with one narrow test-only child-handle lifecycle.
- Retain each real native fixture `ChildProcess` immediately when it is spawned, attach its close observation before readiness or assertions can fail, and register asynchronous cleanup while the exact handle is still owned.
- If close is already observed, complete teardown without another kill; otherwise request termination only for the retained root's owned tree and require close within one fixed bound.
- Treat `taskkill` launch errors and exit statuses as bounded diagnostics rather than the success postcondition: a nonzero status followed by observed close is safe, while absence of close remains a fail-closed error.
- Cover missing/spawn-failed handles, repeated teardown, teardown-before-readiness, taskkill nonzero races, and close timeouts without leaking timers, listeners, subprocesses, or background work.
- Preserve the native test-body assertions that the root and descendant stop, unrelated processes survive, readiness remains run-bound, and evaluator listeners return to baseline.
- Preserve production evaluator timeout, interruption, first-cause, output-bound, cleanup, redaction, publication, POSIX group, and Windows console behavior; any narrow injection plumbing must keep the existing real-spawn defaults.
- Run focused deterministic coverage, real Windows native coverage in a bounded repeated proof, all Stable commands, and non-publishing release verification without consuming the credential-free release-evidence one-shot.

## Out of Scope

- Adding `255` or other speculative `taskkill` statuses to a success allowlist, converting cleanup failure to a warning, or accepting PID liveness, `child.killed`, or an exit-code snapshot as a substitute for `close`.
- Rewriting the production evaluator termination algorithm unless implementation evidence disproves the settled diagnosis that it already retains and bounds the child close lifecycle.
- Global process enumeration, command-line matching, arbitrary sleeps, unbounded polling or stress, flaky-test labels, platform skips, test retries, or CI workflow reruns.
- Implementing or executing the exact-SHA hermetic release-evidence runner, resuming Task 0076, or editing Task 0076 or any terminal historical pair.
- Publication, registry or dist-tag mutation, workflow dispatch, Git tag, GitHub Release, public plugin submission, authentication changes, dependency additions, or package-boundary expansion.

## Acceptance Criteria

- [x] AC-01: Both duplicated evaluator native-test teardown paths use one retained-handle/close contract and no longer decide cleanup success from a readiness PID plus a numeric `taskkill` allowlist.
- [x] AC-02: Every real fixture child that may need defensive cleanup is captured at spawn, has close observation installed before readiness or later assertions, and has its asynchronous teardown registered early enough to cover setup and readiness failures.
- [x] AC-03: An already-closed retained child causes no second kill, while an open retained child receives only exact owned-tree termination and must emit `close` within a fixed bound before teardown passes.
- [x] AC-04: Deterministic tests prove that nonzero `taskkill` plus bounded close passes, but taskkill error/nonzero plus no close fails with bounded state-rich diagnostics; no status value is silently promoted to lifecycle proof.
- [x] AC-05: Spawn failure or absence of a child is safe, repeated teardown is idempotent, and every path removes its timers/listeners without acting on a reused PID or unrelated process.
- [x] AC-06: Timeout, maximum-output, interruption, first-cause, root/descendant death, unrelated-process survival, readiness, cleanup, listener, redaction, and atomic non-publication regressions retain their existing observable results.
- [x] AC-07: Focused deterministic suites, a bounded repeated real Windows proof, cross-platform evaluator regressions, all Stable commands, and non-publishing release CI pass without a test retry or harness rerun supplying credit.
- [x] AC-08: The correction adds no dependency, package byte, workflow/publication behavior, permanent-document meaning, Task 0076 mutation, or historical evidence rewrite.

## Plan

- [x] Reconfirm the Task 0076 status-255 chronology, the two duplicated helpers, the production close lifecycle, and Tasks 0024, 0028, and 0057 compatibility boundaries.
- [x] Introduce the smallest shared test-only handle/close owner and only the optional spawn plumbing needed for cleanup integration tests.
- [x] Replace both PID/status teardowns and register handle-bound cleanup before readiness-dependent failure points.
- [x] Add deterministic already-closed, live-close, nonzero-status-close, no-close, missing-handle, spawn-failure, repeated-cleanup, and diagnostic coverage.
- [x] Run focused and bounded native Windows proofs, then the cross-platform evaluator bundle, all Stable commands, and non-publishing release CI.
- [x] Review the final diff, pair/matrix mapping, package boundary, Task 0076 and historical-pair immutability, transaction state, and residual process/listener state.

## Decisions

- The retained `ChildProcess` close observation is the teardown success postcondition because it follows process exit and stream closure; readiness PIDs remain diagnostic and test-body evidence only.
- A termination-command status may explain why close was requested or delayed, but it cannot independently prove either cleanup success or failure.
- One shared test-only helper is preferred over two local status allowlists. Any caller injection seam remains optional and preserves the production real-spawn default.
- The actual credential-free release-evidence invocation belongs only to the dependent hermetic-runner Task so this correction cannot consume the one allowed attempt.

## Risks

- Installing the close listener after spawn-time events can miss the only authoritative observation and recreate the race.
- Treating root close as proof of descendant cleanup could hide a leak; existing explicit descendant and unrelated-process assertions must remain.
- An over-broad test seam could fork production behavior; the implementation must pass through the same real lifecycle with only handle observation added.
- A timeout that is too broad can hide a hang, while a narrow elapsed-time success threshold recreates runner-speed sensitivity; only the fixed failure bound is contractual.

## Discoveries and Changes

- Production `createEvaluatorRunScope` already retains the spawned child, records `close`, and bounds both Windows termination phases; the observed Task 0076 failure occurred only in defensive test teardown after the owned fixture tree was already absent.
- `test/evaluator-process.test.mjs` and `test/evaluator-cleanup.test.mjs` duplicate a helper that reissues `taskkill /T /F` from readiness data and accepts only statuses `0` and `128`.
- The approved Task 0076 rerun received status `255` from that after-hook after the test body had established root and descendant termination, so widening the allowlist would hide rather than remove the identity/postcondition defect.
- Task 0057 is the satisfied direct owner of deterministic evaluator process tests; Tasks 0024 and 0028 remain compatibility evidence for owned-tree termination and awaited cleanup. Blocked Task 0076 is causal evidence, not a satisfiable dependency.
- Execution preflight found the Task 0077 pair valid, the Task transaction state `NONE`, Task 0057 delivered, no 0077 branch collision, and local, cached, direct-remote, and GitHub `main` aligned at `12c3267b0e7bf094e1e9c39a3ee7277e84019467`; the existing Task 0076 branch and pre-authored Task 0078 pair are separated preservation boundaries.
- The sole production dispatcher freshly evaluated the one uncovered prior STANDARD outcome, selected `IMPLEMENT / 0077`, and prepared one opaque predecessor-continuity transition without changing repository or external state.
- After the Task 0077 branch and active pair were established, the prepared transition applied exactly once and advanced the bounded checkpoint through delivered Task 0075 at count `44` and digest `a41e4a6a…`; Task 0077 remains uncovered.
- One test-only `createFixtureChildOwner` now registers asynchronous cleanup before spawn, wraps the real or injected spawn, retains every returned handle with spawn-time PID/detached ownership, observes `exit` only to suppress unsafe post-exit PID action, and requires `close` within one fixed 5-second bound as the sole cleanup success postcondition.
- The owner requests only Windows `/PID <retained-root> /T /F`, the retained detached POSIX group, or a retained non-detached root. Taskkill status/error and POSIX request errors remain bounded diagnostic fields; already-closed and exit-before-close records perform no PID action, repeated cleanup reuses one promise, and multi-record cleanup removes every timer/listener before reporting failure.
- `runAuditSmoke` and `runEvaluation` now pass one optional `spawnChild` dependency into the existing production scope while preserving the real-spawn default and serializable PID-only `onState` events. Both native suites use the same owner before readiness, and readiness PIDs remain only body assertions/diagnostics.
- Focused helper/native execution and the complete process/cleanup/platform bundle pass on the current Windows host; root/descendant death, unrelated survival, console interruption, cleanup ordering, listener baselines, redaction, and non-publication observations remain unchanged.
- The final Windows proof launched exactly three fresh Node processes; each passed the same six focused retained-close/native-tree tests and no retry or CI rerun supplied credit. The expanded evaluator bundle passed 55/55, standalone Stable passed 430 with four explicit skips, and non-publishing release CI reproduced those results plus one 43-file candidate.
- Final diff coverage finds exactly eight Task-owned paths: the bounded continuity transition, two optional spawn pass-throughs, one shared test fixture, two native suites, and the current pair. Permanent documents, package metadata/selection, workflows, production dependencies, Tasks 0024/0028/0057, the Task 0076 branch tip, and the pre-authored Task 0078 pair remain unchanged.

## Documentation Impact

- SPEC: Unchanged — public behavior, acceptance meaning, and evidence honesty do not change.
- ARCHITECTURE: Unchanged — the optional-evaluator section already assigns exact fixture mechanics and time bounds to source/tests while requiring bounded native diagnostics.
- README: Unchanged — no supported command, setup, usage, or contributor entry point changes.
- AGENTS: Unchanged — repository routing, completion, authority, and verification rules remain intact.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Loaded the managed repository rules, complete `$kyw-impl` execution procedure, Task 0077 pair, direct dependency Task 0057, compatibility history, selected permanent-document owner sections, and current evaluator lifecycle/test surfaces.
- Validated the Task 0077 and current Task 0076 pairs, confirmed transaction state `NONE`, aligned all `main` identities, separated the clean Task 0076 tracked branch from the untracked Task 0077/0078 pairs, and received `IMPLEMENT / 0077` from the sole production dispatcher.
- Created `task/0077-make-windows-evaluator-fixture-teardown-b48711f3` from exact aligned `main` while preserving Task 0076 and Task 0078 unchanged.
- Activated the valid `IN_PROGRESS/RUNNING` pair and applied the prepared predecessor-continuity transition exactly once; only the bounded checkpoint advanced through Task 0075.
- Added the shared retained-handle/close owner, optional audit/grilling spawn pass-through, early owner registration in both native suites, and deterministic Windows/POSIX lifecycle coverage; reviewed delegated changes directly and reran the affected tests.
- Passed syntax for all five changed JavaScript modules, the retained-close focused coverage, and the complete evaluator process/cleanup/platform bundle at 28/28 on Windows.
- Passed exactly three final fresh Windows focused processes at 6/6 each, the expanded evaluator bundle at 55/55, the exact-path `STABLE` verification plan, standalone `npm test` at 430 passes/four explicit skips/zero failures, lint, format, package selection, and non-publishing release CI with candidate SHA-256 `d1d587ad…`.
- Completed final diff/matrix review, confirmed all introduced Windows/POSIX/error/idempotence branches are mapped, verified transaction state `NONE`, and proved package/workflow/permanent-document/history/Task 0076/Task 0078 preservation without invoking the release-evidence harness.

## Remaining

- None — repository implementation, acceptance verification, documentation review, and terminal evidence are complete; ordinary `STANDARD` delivery proceeds through the selected external authority.

## Resume Point

- None — no repository implementation work remains; continue only the ordinary push/PR/exact-head/review/merge/post-main delivery sequence for this exact terminal pair.

## Blockers

- Not applicable — no blocker is known.
