# TASK 0075 — Make the Invocation Command Cache Policy-Independent and Strict

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Make invocation-local command deduplication independent of caller policy by caching one raw execution result per complete execution identity and applying allowFailure, task, and role semantics separately for every caller, so strict and tolerant requests cannot change one another based on call order or concurrency.

## Dependencies

- Task 0070.
- Task 0071.

## In Scope

- Cache the raw command completion or equivalent policy-neutral execution record instead of a Promise whose resolution already embeds the first caller's allowFailure decision.
- Apply nonzero-exit strict rejection or tolerant resolution after each caller retrieves the shared raw result, using that caller's task and role for bounded redacted diagnostics.
- Prove tolerant-first then strict, strict-first then tolerant, and concurrent mixed-policy calls each observe their own semantics while the command runner executes once for an identical execution identity.
- Include maxBuffer in the execution identity or replace it with one fixed invariant buffer policy that is documented and tested so calls with different execution bounds cannot alias silently.
- Preserve command, arguments, cwd, shell-free execution, bounded cache size, command/query counters, success deduplication, and credential-safe redaction.
- Cover runner errors, nonzero status, stdout/stderr bounds, task/role-specific messages, cache exhaustion, and differing execution identities without exposing raw secrets.
- Keep source, packaged, cached, and direct-install runtime behavior aligned and update only the architecture owner text needed to describe the corrected cache boundary.
- Preserve Task 0070 bytes, the dispatcher-authorized one-step predecessor continuity transition and its resulting checkpoint state, hydration classifications, GitHub evidence selection, and release metadata; do not otherwise mutate continuity.

## Out of Scope

- Changing which Git or GitHub commands hydration issues, widening command/query bounds, adding retries, or accepting new delivery evidence.
- Refactoring the full hydration module, changing terminal-pair comparison, reintroducing or otherwise altering the already retired Task 0070 shim path, or performing unrelated parser cleanup.
- Logging stderr, commands with credentials, access tokens, response bodies, or unbounded failure details.
- Changing version metadata, preparing 0.1.4, publishing, or mutating any external state.

## Acceptance Criteria

- [x] AC-01: An identical failing command requested tolerant-first then strict returns the raw failure to the tolerant caller and throws a redacted strict error for the strict caller while executing the runner once.
- [x] AC-02: The same command requested strict-first then tolerant or concurrently with mixed policies produces the same per-caller outcomes and one execution, independent of scheduling.
- [x] AC-03: Strict diagnostics use the requesting caller's task and role, remain bounded and redacted, and never inherit the first caller's label or expose sensitive stdout, stderr, command arguments, or environment data.
- [x] AC-04: Successful identical requests still deduplicate, while differing command, arguments, cwd, or maxBuffer values use distinct execution identities and command counts.
- [x] AC-05: Cache, command, query, and buffer bounds; runner-error handling; and exhaustion behavior remain fail closed without retries or hidden extra executions.
- [x] AC-06: Focused order, concurrency, redaction, bound, hydration, and package-projection tests plus all Stable commands pass with architecture text, Task 0070 hashes, and checkpoint state aligned.

## Plan

- [x] Add focused reproductions for both call orders, concurrent mixed policy, caller-specific labels, and different maxBuffer values.
- [x] Separate raw execution caching from per-caller policy application without changing command construction or counters.
- [x] Exercise success, nonzero status, runner error, redaction, cache exhaustion, and execution-identity branches through production exports.
- [x] Synchronize the invocation-local cache architecture description and verify every runtime projection.
- [x] Run focused and Stable checks, package parity, immutable hashes, transaction inspection, and final diff review.

## Decisions

- Cache execution facts, not authorization or failure policy; allowFailure and diagnostic ownership belong to each requesting call.
- Treat maxBuffer as execution identity because it can change whether and how the child process completes.
- Keep one runner execution for concurrent identical work by sharing the raw-result Promise, then branch only after it settles.
- Snapshot arguments and resolve the working directory before runner invocation so the recorded identity cannot diverge from a caller-mutated execution; cache thrown/rejected runner failures as neutral records that still fail closed for every policy with caller-owned redacted diagnostics.
- Preserve existing redaction and bounds as security properties rather than surfacing raw child-process data for easier debugging.

## Risks

- Moving rejection after cache retrieval can accidentally double-count commands or execute the runner twice under concurrency.
- Caching a thrown runner exception without a neutral representation could still preserve first-caller labels or produce unhandled rejections.
- An incomplete execution key could silently reuse results across different cwd or buffer semantics.
- Improper diagnostic construction could leak secrets that current redaction intentionally suppresses.

## Discoveries and Changes

- The current cache key includes command, arguments, and cwd, while the cached Promise captures the first caller's allowFailure, task, and role behavior.
- A tolerant-first reproduction lets a later strict request resolve, and a strict-first reproduction makes a later tolerant request reject.
- Current tests prove only same-policy success deduplication and basic redaction; they do not cover mixed policy, call order, concurrency, or maxBuffer identity.
- No production call site currently known to authoring intentionally mixes strict and tolerant requests for the same argv, but the primitive is fail-open and must be corrected before reuse.
- Task 0072 already removed the consumed Task 0070 one-time rebaseline shim; preserving its absence is the current baseline, so this Task will not reintroduce or otherwise change that retired path.

## Documentation Impact

- SPEC: Expected unchanged — observable delivery acceptance and authority do not change.
- ARCHITECTURE: Clarify that the invocation-local cache owns raw execution deduplication, complete execution identity, and per-caller policy application after retrieval.
- README: Expected unchanged — commands, setup, and usage do not change.
- AGENTS: Expected unchanged — repository execution and completion rules do not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Revalidated the Task 0075 pair, Tasks 0070 and 0071, exact Task 0070 pair hashes, the clean transaction state, and the separated pre-existing Task 0076 authoring work.
- Confirmed local, cached, direct-remote, and GitHub `main` at `0e63632aaedf058b793284681b0c134d70318bf1`, with Task 0074 as the sole uncovered prior `STANDARD` outcome.
- Ran the sole production dispatcher call, received `IMPLEMENT` for Task 0075, and created `task/0075-invocation-command-cache-policy-independent` from aligned `main`.
- Validated the active pair and applied the opaque predecessor transition exactly once; a post-command response-serialization failure was not replayed, and read-only inspection proved checkpoint count `43`, last Task `0074`, digest `b1509329cca7fa288d0982f6905d6325333d576deebb33cc7fcf89dd46361539`, and transaction state `NONE`.
- Implemented complete execution identity over command, snapshotted arguments, resolved cwd, and validated maxBuffer; cached one tagged policy-neutral completion/runner-error record with immutable failure classification and per-caller policy/diagnostics.
- Added order, concurrency, identity, mutation, redaction, runner-error, real buffer-overflow, cache-bound, and invalid-bound regressions; delegated only the initial focused test authoring, then directly expanded and reran the final matrix.
- Updated only the owning ARCHITECTURE hydration paragraph and proved source, packed, direct-install, and plugin-cache byte/runtime projection through the focused projection suite and forced isolated marketplace lifecycle.
- Completed the planner-selected Stable aggregate: 428 tests / 424 passes / four explicit host/live skips / zero failures, lint over 84 JavaScript modules and foundation metadata, format over 360 UTF-8/LF files, and pack selection of 43 files / 134833 bytes.
- Built the final release candidate from the corrected production bytes: 43 files / 134833 bytes / SHA-256 `d1d587ad10282308ab12e74be7008d6a11281eb4bd4b3c20521c0604c4daef9e`.
- Closed the final independent review's hostile-completion coverage finding, reran the focused matrix, and completed diff/matrix review with all introduced completion, runner-error, policy, identity, bound, redaction, counter, and projection branches mapped.
- Revalidated exact Task 0070 hashes, the count-43 Task 0074 checkpoint, permanent-document deltas, queue, transaction, pair, and whitespace state while preserving untracked Task 0076 at its exact pre-existing hashes.

## Remaining

- None — the repository implementation, documentation, verification, and final coverage review are complete; ordinary `STANDARD` delivery remains the separate GitHub queue gate.

## Resume Point

- None — repository work is complete. If delivery is interrupted, resume only the ordinary `STANDARD` lifecycle for this exact terminal pair without repeating dispatcher selection or the applied predecessor transition.

## Blockers

- Not applicable — no blocker is known at authoring time.
