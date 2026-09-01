# TEST 0077 — Make Windows Evaluator Fixture Teardown Close-Bound

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially evidence honesty and fail-closed safety.
- Architecture constraints: `../../ARCHITECTURE.md`, especially optional evaluator native boundaries, owned process trees, bounded diagnostics, and no background repair.
- Direct owner: Task 0057 and `../../../scripts/evaluator-process.mjs`.
- Focused surfaces: `../../../test/evaluator-process.test.mjs`, `../../../test/evaluator-cleanup.test.mjs`, `../../../test/evaluator-platform.test.mjs`, and directly used evaluator fixtures.
- Causal evidence: blocked Task 0076, read-only.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — one retained-handle teardown owner replaces both PID/status helpers | Inspect both native suites and assert they call the shared child-handle/close contract without a numeric success allowlist. | Static / unit | PASS | Exact-source search finds the duplicated helpers, `{0,128}` allowlist, and suite-local `spawnSync` nowhere; both suites import the one child owner and all five retained-close tests pass. |
| T-02 | AC-02 — spawn-time retention and early cleanup registration | Inject controlled children that close before readiness, fail readiness, or fail a later assertion; prove close observation and cleanup ownership exist from spawn onward. | Deterministic lifecycle | PASS | The fake TestContext proves `after()` registration precedes spawn and the wrapper installs exit/close listeners before return; real flow spawn-failure and pre-readiness ownership regressions pass. |
| T-03 | AC-03 — already-closed and live-child close postconditions | Drive already-closed and still-open handles; assert no duplicate kill for the former and exact-tree termination plus bounded close for the latter. | Unit / native boundary | PASS | Controlled already-closed/live Windows records, captured POSIX group/root cases, and the real Windows timeout/max-output tree test pass with close as the postcondition. |
| T-04 | AC-04 — command status is diagnostic, no-close is fail-closed | Inject nonzero status followed by close and nonzero/error without close; require PASS only for observed close and bounded state-rich failure otherwise. | Unit / failure | PASS | Status 255 and launch-error records pass only after close; both reject at the exact bound without close and expose bounded state/status/error fields. |
| T-05 | AC-05 — missing, failed, and repeated cleanup is safe | Cover spawn failure, no handle, duplicate teardown, listener/timer finalization, and PID-reuse resistance without unrelated termination. | Unit / race | PASS | Missing/throwing spawn, idempotent retention/cleanup, exit-before-close suppression, multi-record failure, zero final timers/listeners, and unrelated-process survival pass. |
| T-06 | AC-06 — evaluator behavior and owned-tree assertions remain intact | Run timeout, output overflow, interruption, cleanup, listener, publication, redaction, descendant-death, and unrelated-sibling regressions through production defaults. | Integration / regression | PASS | The current process/cleanup/platform command passes 28/28, including real Windows console, root/descendant death, unrelated survival, cleanup/redaction/publication, and listener assertions. |
| T-07 | AC-07 — Windows and cross-platform verification is stable | Run the affected native Windows proof in three fresh bounded processes without rerun credit, then run the evaluator bundle, Stable commands, and non-publishing release CI. | Native / Stable / Release | PASS | Three fresh Windows processes passed 6/6 each; the expanded bundle passed 55/55, standalone Stable passed 430/4/0, and release CI reproduced Stable plus the candidate gate without a retry. |
| T-08 | AC-08 — scope, package, documents, and history remain unchanged | Inspect the exact diff, dependency/package selection, workflows, permanent documents, Task 0076 bytes, historical pairs, transaction state, and forbidden external actions. | Integrity / authority | PASS | Final eight-path review proves no dependency/package/workflow/permanent-document/history/Task 0076/Task 0078 change; transaction state is `NONE` and no forbidden external action ran. |

## Regression Coverage

- Production evaluator real-spawn defaults, timeout/output mappings, interruption exit codes, first-cause precedence, listener removal, redaction, cleanup, and atomic result publication remain unchanged.
- Windows PID-rooted tree termination and POSIX process-group termination remain narrow; no global process scan or unrelated-process kill is introduced.
- Native tests continue to prove both root and descendant termination and preservation of an unrelated sibling.
- Model-backed evaluators remain development-only and absent from required public CI and package bytes.
- Task 0076 and Tasks 0024, 0028, and 0057 remain unchanged; the credential-free release-evidence one-shot is not run here.

## Commands

- `node --check ./scripts/audit-smoke.mjs`
- `node --check ./scripts/grilling-eval/core.mjs`
- `node --test --test-name-pattern="retained.*close|timeout and max-output causes terminate the exact owned child tree" ./test/evaluator-process.test.mjs`
- `node --test ./test/evaluator-process.test.mjs ./test/evaluator-cleanup.test.mjs ./test/evaluator-platform.test.mjs`
- `node --test ./test/audit-smoke.test.mjs ./test/grilling-eval.test.mjs ./test/evaluator-process.test.mjs ./test/evaluator-cleanup.test.mjs ./test/evaluator-platform.test.mjs`
- Windows-only bounded proof: run the affected native focused command in exactly three fresh Node processes, stop on the first nonzero exit, and do not use a CI rerun as evidence.
- `npm run verify:plan -- scripts/audit-smoke.mjs scripts/grilling-eval/core.mjs test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run release:ci`
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this Task directory>`
- `node ./skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root ./docs/tasks`
- `git diff --check`

## Results

- PASS — entry validation accepted Task 0077, its Task 0057 dependency, and the current Task 0076 pair; Task transaction state is `NONE`, no Task 0077 branch collision exists, and local, cached, direct-remote, and GitHub `main` all align at `12c3267b0e7bf094e1e9c39a3ee7277e84019467`.
- PASS — the sole production dispatcher freshly evaluated the one uncovered prior STANDARD outcome, selected `IMPLEMENT / 0077`, and prepared one predecessor-continuity transition; no workflow rerun, release-evidence invocation, publication, or other external mutation occurred.
- PASS — after the Task 0077 branch and valid active pair existed, the prepared transition applied exactly once; the bounded checkpoint now covers 44 delivered outcomes through Task 0075 with digest `a41e4a6a…`, while Task 0077 remains uncovered and transaction state remains clean.
- PASS — delegated read-only inspection independently isolated the duplicate test-only helpers and confirmed production already owns the child/close lifecycle; delegated implementation added only the shared owner and two narrow spawn pass-throughs, which were directly reviewed before acceptance.
- PASS — `node --check` passed for `scripts/audit-smoke.mjs`, `scripts/grilling-eval/core.mjs`, `test/fixtures/evaluator-process/child-owner.mjs`, `test/evaluator-process.test.mjs`, and `test/evaluator-cleanup.test.mjs`; `git diff --check` reported no issue.
- PASS — the first focused helper plus native-tree command passed 5/5. After POSIX/multi-record coverage was added, the final retained-close focus passed 5/5 with zero timers/listeners left by the asserted paths.
- PASS — the process/cleanup/platform bundle passed 27/27 before the final POSIX branch addition and 28/28 on final current source, including both real Windows console cases and every retained root/descendant/unrelated-process assertion.
- PASS — the final bounded Windows proof launched exactly three fresh Node processes with stop-on-first-failure semantics; runs 1, 2, and 3 each passed the identical six-test retained-close/native-tree focus with no retry, stress loop, or CI rerun.
- PASS — the expanded audit/grilling/process/cleanup/platform command passed 55/55 with zero skips or failures. The exact eight changed paths selected `STABLE` and prescribed `npm run check` plus hosted exact-SHA gates.
- PASS — standalone `npm test` passed 430 of 434 tests with four explicit environment/live skips and zero failures; standalone lint passed 85 JavaScript modules, format checked 363 UTF-8/LF files, and package selection passed 43 files / 134833 bytes.
- PASS — non-publishing `npm run release:ci` reproduced 430 passes/four skips/zero failures, lint, format, and 43-file package selection, then created, verified, and cleaned one candidate at SHA-256 `d1d587ad10282308ab12e74be7008d6a11281eb4bd4b3c20521c0604c4daef9e`.
- PASS — final integrity validates both Task 0077 and pre-authored Task 0078, reports transaction state `NONE`, keeps local/cached/direct remote `main` aligned at `12c3267b…`, and finds no remote Task 0077 branch or PR collision before delivery.
- PASS — final diff coverage is exactly the bounded continuity transition, two optional spawn pass-throughs, one shared test-only owner, two native suites, and this pair. README, AGENTS, SPEC, ARCHITECTURE, package/plugin metadata, workflows, production dependencies, Tasks 0024/0028/0057, Task 0076 at branch tip `4e504f7…`, and Task 0078 remain unchanged; `git diff --check` passes.

## Unverified

- Ordinary `STANDARD` push, PR, exact-head Actions, review, merge, and post-main observation have not started; they remain external ledger work and are not repository acceptance gaps.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
