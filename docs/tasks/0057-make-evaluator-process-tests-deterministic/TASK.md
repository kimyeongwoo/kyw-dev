# TASK 0057 — Make Evaluator Process Tests Deterministic

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Remove wall-clock and runner-speed sensitivity from evaluator lifecycle/readiness tests that produced four Windows Node 22 failures in post-main run `30322392806` attempt 1, while preserving actual process termination, interruption, cleanup, first-cause, redaction, and no-background-work behavior.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Preserve immutable read-only evidence for run `30322392806`, both attempts, merge SHA `51f45b3baf3db909deae24beb99a0cb67e43bf0d`, and the exact four attempt-1 failure branches.
- Split pure lifecycle/state-machine assertions from native OS process-boundary smoke and introduce injected clock, scheduler, readiness, transport, or equivalent deterministic seams for the pure portion.
- Make readiness publication and consumption an explicit observable handshake that cannot parse a merely-created but incomplete file.
- Retain native child-process smoke only where console signaling, owned process-tree termination, or platform fallback adds confidence unavailable from the pure tests.
- Give native smoke bounded failure diagnostics based on observable state, without treating a narrow elapsed-time success threshold as product behavior.
- Preserve evaluator production semantics, development-only/model-backed boundaries, Windows and POSIX cleanup/fallback behavior, and no-background-completion guarantees.
- Add an exactly three-run focused Windows Node 22 proof in the first authorized execution path; all three independent invocations must pass and a GitHub rerun cannot count.

## Out of Scope

- Weakening timeout, maximum-output, interrupt exit-code, owned-tree, first-cause, listener, cleanup, redaction, or atomic publication contracts.
- Rewriting Task 0055, PR #42, run `30322392806`, attempt chronology, or any historical Task/Test evidence.
- Adding model-backed evaluator execution to required public CI or changing development-only evaluator ownership.
- General CI topology deduplication, which belongs to the dependent hosted-CI Task.
- Production dependencies, generalized process frameworks, daemons, watchers, services, npm authentication, registry probes, publication, version/tag/Release changes, workflow reruns, or destructive recovery.

## Acceptance Criteria

- [x] AC-01: The exact four attempt-1 failure branches and assertions are preserved as immutable history and each is mapped to a deterministic seam or a justified native-only boundary before implementation is accepted.
- [x] AC-02: Pure lifecycle/state-machine tests use an injected clock, scheduler, readiness signal, controllable transport, or equivalent deterministic mechanism instead of fixed sleeps, polling luck, or narrow elapsed-time success thresholds.
- [x] AC-03: A native child-process test remains only when an actual OS console, signal, child tree, stream, or platform fallback supplies material confidence beyond the pure seam, and each retained native test states that boundary.
- [x] AC-04: Every retained native smoke uses an explicit validated readiness handshake plus bounded state-rich failure diagnostics; a slow runner does not fail solely for exceeding a non-contractual performance threshold.
- [x] AC-05: Interrupt exit codes, narrowly owned process-tree termination, first-cause preservation, listener removal, cleanup ownership, safe redaction, atomic non-publication on interruption, and no background completion remain unchanged.
- [x] AC-06: Production evaluator behavior is not relaxed or forked for test convenience; test seams are dependency-injected defaults or fixture-side protocols with production-equivalent behavior.
- [x] AC-07: Model-backed execution remains development-only and is not introduced into required public CI, package installation, or acceptance evidence.
- [x] AC-08: Windows Node 22 executes the focused evaluator process/cleanup/platform proof exactly three consecutive times in one authorized attempt, stops on the first failure with diagnostics, and receives PASS only if all three independent invocations pass without a CI rerun.
- [x] AC-09: Attempt 1's four failures followed by attempt 2's same-SHA success remain recorded as external chronology and are never rewritten as repository behavioral PASS evidence.
- [x] AC-10: Linux, macOS, and Windows process cleanup, interruption, signal/console handling, and platform-specific fallback contracts retain deterministic regression coverage.

## Plan

- [x] Preserve a minimal immutable failure map from run `30322392806` attempt 1/2 metadata and logs without editing historical pairs.
- [x] Classify each lifecycle assertion as pure or native-boundary, then write failing deterministic tests for scheduler/readiness ordering and incomplete-handshake publication.
- [x] Add the smallest injected lifecycle seams and atomic/validated fixture handshake while leaving production defaults and classifications intact.
- [x] Retain and harden only material native smoke with bounded observable diagnostics on Windows and POSIX.
- [x] Execute the focused suite exactly three times on Windows Node 22 in one attempt, then run cross-platform/stable/planner-selected checks without a rerun.
- [x] Project only durable evaluator boundary truth to documentation and audit the final diff, historical bytes, and evidence chronology.

## Decisions

- Failure branches 1 and 2 belong to deterministic lifecycle/cleanup orchestration plus explicit readiness signaling; branch 4 belongs to the readiness transport because existence was observed before valid JSON; branch 3 remains a native Windows console boundary but receives an explicit handshake and state diagnostics.
- Three consecutive focused invocations are the smallest useful repeated proof: one is not repetition and two demonstrate only one repeat; three provide an initial run plus two independent repeats while remaining bounded.
- A timeout may bound a hung native smoke and trigger diagnostics, but elapsed time below a narrow threshold is not a success criterion unless the production contract itself defines that bound.
- No GitHub workflow rerun, unbounded stress loop, or attempt-2 historical success can satisfy AC-08.
- Production evaluator defaults remain real clock/scheduler/process operations; deterministic controls enter through narrow testable seams, not environment-dependent special cases.

## Risks

- Over-mocking process behavior can hide real console, stream, or process-tree defects; classification and retained smoke must preserve material OS confidence.
- Atomic readiness publication alone may hide a lifecycle ordering race if consumers do not validate run identity and state; the handshake must bind to the owned child/run.
- Wide timeouts can mask hangs, while narrow thresholds create runner-speed flakes; diagnostics and bounded termination must be separated from performance assertions.
- Windows console signaling and POSIX group termination differ materially; shared seams cannot erase platform-specific cleanup/fallback coverage.
- Changing fixtures or CI proof steps can accidentally increase hosted duplication; only the smallest B-specific proof is in scope, and topology optimization remains dependent Outcome C work.

## Discoveries and Changes

- GitHub read-only inspection confirms run `30322392806` is a `push` at merge SHA `51f45b3baf3db909deae24beb99a0cb67e43bf0d`; attempt 1 failed `Stable / Windows / Node 22.x` and the derivative Required job, while attempt 2 at the same SHA succeeded.
- Attempt 1 ran 333 tests with 329 passing and four failures: the ordinary-cleanup interruption predicate received a command-timeout error; the cleanup-diagnostic case timed out waiting for its readiness marker; the real Windows console Ctrl+C grilling case timed out waiting for evaluator readiness; and the process timeout/max-output case parsed an incomplete readiness JSON file.
- Current test helpers use fixed real-time polling windows and treat file existence as readiness. Fake evaluator children write readiness directly, so a consumer can observe the path before complete JSON is safely published.
- `scripts/evaluator-process.mjs` owns real signal listeners, first-cause state, bounded child-tree termination, cleanup finalization, output/timeout mapping, and safe diagnostics. Those production contracts are regression owners, not targets for relaxation.
- Existing Task 0024 and Task 0028 history already establishes interruption/cleanup contracts and a prior awaited Windows removal fix; their PASS evidence must remain historical and byte-unchanged.
- No implementation, test, workflow, documentation, or historical evidence mutation has occurred during authoring.
- Fresh execution preflight at main `07482015d3eab9bb127bfdb82d81050a7d1ad294` found a clean worktree, aligned local/cached/direct/GitHub main, no transaction residue, Task 0056 delivered, and Task 0058 preserved as `READY/READY` with its Task 0057 dependency.
- The one corrected direct packaged-adapter invocation selected `IMPLEMENT / 0057` with `STANDARD_LIFECYCLE` authority after the production evaluator classified all 26 prior STANDARD deliveries `SATISFIED`.
- `createEvaluatorRunScope` now has one optional scheduler boundary for checkpoint yielding, child timeout ownership, termination polling, and clock reads. Its production defaults are the same real Node timer/immediate operations; audit and grilling only pass the dependency through.
- One fixture-side readiness owner publishes protocol version 1 records through temp-file/rename and validates protocol, state, run ID, PID, and optional descendant PID. Consumers distinguish absent, incomplete, invalid, wrong-run, unreadable, and validated states and emit bounded path-label diagnostics without parsing a merely-created file.
- Pure tests now explicitly drive timeout/late-signal precedence, child-exit/interruption ordering, cleanup gates, listener removal, Windows forced fallback, Linux/macOS group ownership, and post-settlement late events. Native tests are labeled where real console control, handles, streams, spawn failure, or owned process trees add independent confidence.
- The Windows console helper invokes the canonical readiness waiter before Ctrl+C and waits on the process handle while still attached, removing its readiness-existence loop and fixed post-signal sleep.
- Fresh GitHub logs preserve run `30322392806`: attempt 1 Windows Node 22 job `90160790713` failed exactly four branches at 329/333; attempt 2 job `90164854862` passed 333/333 at the same SHA. Neither historical result is relabeled repository behavioral evidence.
- One official-checksum-verified portable Windows Node `v22.23.1` attempt ran the focused 23-test command as exactly three fresh processes; runs 1, 2, and 3 each exited 0. No CI rerun or prior attempt supplied credit.
- The exact 15-path verification planner selected `STABLE` and `npm run check`; it passed 348/348 plus lint, format, and pack. The separate non-publishing packed candidate passed, and final transaction/scratch inspection was empty.

## Documentation Impact

- SPEC: Unchanged; product-visible evaluator behavior and acceptance remain identical.
- ARCHITECTURE: Replaced the optional-evaluator test summary with the stable injected-pure versus validated-native boundary; +242 UTF-8 bytes and +3 lines, below every growth threshold.
- README: Unchanged; no supported command or contributor workflow changed.
- AGENTS: Unchanged; repository-wide evidence honesty, verification, Skill routing, and completion rules remain in force.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed read-only classification of the four immutable attempt-1 failures, same-SHA attempt chronology, current lifecycle/readiness implementation, native Windows fixture, and relevant historical contracts.
- Fixed the pre-implementation verification decision at exactly three consecutive focused Windows Node 22 invocations with no rerun credit.
- Completed fresh Git/GitHub delivery hydration, exact pair/queue/transaction validation, direct absolute-path dispatch, and lifecycle entry on the exact main base.
- Implemented the production-default scheduler seam, atomic run-bound readiness protocol, canonical waiter, and pure/native test split without changing evaluator classifications or publication behavior.
- Passed focused evaluator, audit/grilling, current/legacy Task reader, dispatcher, permanent-document, exact-path planner, full stable, packaging, candidate, pair, historical-byte, scope, and residue verification.
- Completed the single authorized Windows Node 22 proof with exactly three consecutive 23/23 runs and removed all external runtime/download scratch.

## Remaining

- None — repository implementation, acceptance verification, documentation synchronization, and terminal evidence are complete; ordinary `STANDARD` delivery proceeds through the selected external authority.

## Resume Point

- None — no repository implementation work remains; future queue advancement must use the GitHub delivery ledger rather than changing this historical pair.

## Blockers

- None — all repository acceptance evidence passed; PR, merge-compatibility, merge, and post-main evidence remain the ordinary external delivery sequence.
