# TASK 0057 — Make Evaluator Process Tests Deterministic

<!-- kyw-task-contract: 2 -->

## Status

READY

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

- [ ] AC-01: The exact four attempt-1 failure branches and assertions are preserved as immutable history and each is mapped to a deterministic seam or a justified native-only boundary before implementation is accepted.
- [ ] AC-02: Pure lifecycle/state-machine tests use an injected clock, scheduler, readiness signal, controllable transport, or equivalent deterministic mechanism instead of fixed sleeps, polling luck, or narrow elapsed-time success thresholds.
- [ ] AC-03: A native child-process test remains only when an actual OS console, signal, child tree, stream, or platform fallback supplies material confidence beyond the pure seam, and each retained native test states that boundary.
- [ ] AC-04: Every retained native smoke uses an explicit validated readiness handshake plus bounded state-rich failure diagnostics; a slow runner does not fail solely for exceeding a non-contractual performance threshold.
- [ ] AC-05: Interrupt exit codes, narrowly owned process-tree termination, first-cause preservation, listener removal, cleanup ownership, safe redaction, atomic non-publication on interruption, and no background completion remain unchanged.
- [ ] AC-06: Production evaluator behavior is not relaxed or forked for test convenience; test seams are dependency-injected defaults or fixture-side protocols with production-equivalent behavior.
- [ ] AC-07: Model-backed execution remains development-only and is not introduced into required public CI, package installation, or acceptance evidence.
- [ ] AC-08: Windows Node 22 executes the focused evaluator process/cleanup/platform proof exactly three consecutive times in one authorized attempt, stops on the first failure with diagnostics, and receives PASS only if all three independent invocations pass without a CI rerun.
- [ ] AC-09: Attempt 1's four failures followed by attempt 2's same-SHA success remain recorded as external chronology and are never rewritten as repository behavioral PASS evidence.
- [ ] AC-10: Linux, macOS, and Windows process cleanup, interruption, signal/console handling, and platform-specific fallback contracts retain deterministic regression coverage.

## Plan

- [ ] Preserve a minimal immutable failure map from run `30322392806` attempt 1/2 metadata and logs without editing historical pairs.
- [ ] Classify each lifecycle assertion as pure or native-boundary, then write failing deterministic tests for scheduler/readiness ordering and incomplete-handshake publication.
- [ ] Add the smallest injected lifecycle seams and atomic/validated fixture handshake while leaving production defaults and classifications intact.
- [ ] Retain and harden only material native smoke with bounded observable diagnostics on Windows and POSIX.
- [ ] Execute the focused suite exactly three times on Windows Node 22 in one attempt, then run cross-platform/stable/planner-selected checks without a rerun.
- [ ] Project only durable evaluator boundary truth to documentation and audit the final diff, historical bytes, and evidence chronology.

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

## Documentation Impact

- SPEC: Expected unchanged because product-visible evaluator behavior must remain identical; update only if implementation evidence exposes an actual acceptance-meaning correction.
- ARCHITECTURE: Update the evaluator lifecycle testing boundary only if injected deterministic control and the native-smoke split become durable system structure; preserve owned termination and cleanup flows.
- README: Expected unchanged unless a supported developer verification command or evaluator lifecycle guarantee materially changes.
- AGENTS: Expected unchanged; repository-wide evidence honesty, verification, Skill routing, and completion rules remain in force.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed read-only classification of the four immutable attempt-1 failures, same-SHA attempt chronology, current lifecycle/readiness implementation, native Windows fixture, and relevant historical contracts.
- Fixed the pre-implementation verification decision at exactly three consecutive focused Windows Node 22 invocations with no rerun credit.

## Remaining

- Implement deterministic lifecycle/readiness seams and the atomic validated handshake without changing production semantics.
- Add mapped pure, native, failure-diagnostic, cleanup, redaction, listener, no-background, and platform regressions.
- Execute the exact three-run Windows Node 22 proof and all planner-selected stable checks, then complete STANDARD delivery with honest external evidence.

## Resume Point

- Start with the four failure assertions in `test/evaluator-cleanup.test.mjs`, `test/evaluator-process.test.mjs`, and `test/evaluator-platform.test.mjs`; first make the readiness protocol and pure lifecycle order reproducible before changing `scripts/evaluator-process.mjs`.

## Blockers

- Not applicable — no implementation blocker is known; Windows Node 22 repeated proof and all future delivery evidence remain deliberately unverified.
