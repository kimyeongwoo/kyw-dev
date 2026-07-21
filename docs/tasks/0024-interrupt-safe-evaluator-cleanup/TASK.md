# TASK 0024 — Interrupt-safe evaluator cleanup

## Status

DONE

## Goal

Make both development-only evaluator flows terminate only their owned long-running child tree and clean evaluator-owned unpublished temporary state after supported interruption, without weakening existing success, failure, timeout, redaction, authentication, or atomic-publication behavior.

## Dependencies

- Exact implementation base `d03e8da841a403caeec8136236d8f266d482ce42` (PR #6 merge; Task 0023 implementation parent `b0a723699870d1b4561e3b0cc5d7500e2974be06`).
- `../../../AGENTS.md`
- `../../../README.md`
- `../../SPEC.md`
- `../../ARCHITECTURE.md`
- `../../../package.json`
- `../../../templates/task/TASK.md` and `../../../templates/task/TEST.md`
- `../../../skills/kyw-task/SKILL.md`, its `references/execution.md`, and its canonical `scripts/task-artifacts.mjs` adapter/core validator.
- Evaluator provenance and behavior evidence from Tasks `0011`, `0014`, `0017`, `0018`, `0020`, and `0023`.
- `../../../scripts/audit-smoke.mjs`
- `../../../scripts/grilling-eval.mjs` and `../../../scripts/grilling-eval/core.mjs`
- `../../../test/audit-smoke.test.mjs`, `../../../test/grilling-eval.test.mjs`, and directly used deterministic evaluator fixtures.

## In Scope

- Replace only the two long-running evaluator/model `spawnSync` paths with a live-handle asynchronous child lifecycle; retain bounded synchronous Git, capability, fixture-test, and report helpers.
- Add one small development-only shared internal lifecycle helper because both evaluator flows require the same signal ownership, bounded child-tree termination, output/timeout semantics, idempotent cleanup, listener removal, and safe diagnostics.
- Register run-scoped listeners only after an evaluator owns temporary state: POSIX `SIGINT` and `SIGTERM`, and Windows console Ctrl+C as Node `SIGINT`.
- Give each long-running child a narrowly owned POSIX process group or Windows PID-rooted process tree; request graceful termination within a fixed bound, then force only that owned group/tree within a second fixed bound.
- Preserve input, UTF-8 output, maximum-output limits, timeout and spawn-failure mapping, isolated cwd/environment, auth-source immutability, redaction, fixture hashes/Git checks, grading, and atomic result publication.
- Make temporary-root and unpublished-staging cleanup idempotent, listener-safe, and injectable only at the owned removal operation for deterministic failure coverage.
- Add deterministic fake-child/launcher fixtures and focused unit/integration tests for success, model failure, timeout, spawn failure, ownership, cleanup, races, diagnostics, and publication boundaries in both evaluators.
- Execute actual POSIX `SIGINT`/`SIGTERM` integration evidence in an available POSIX environment and actual Windows hidden-console Ctrl+C evidence on this Windows host.
- Update README and Architecture only for the durable supported-interruption guarantee and its limits; update Task/Test continuously with executed evidence.

## Out of Scope

- SIGKILL, OS crash, power loss, Windows console-close/session-manager emulation, and a general guarantee for every abrupt process-termination mechanism.
- Ctrl+Break/SIGBREAK unless implementation evidence proves it is required for the smallest Ctrl+C contract; no support claim is planned.
- OS-wide process enumeration, command-line matching, ambient Codex termination, daemon/watcher/service work, a generic supervisor, or orphan recovery.
- Changing production Skills, CLI/plugin installation, package/public Plugin behavior, manifests, publication metadata, release verdicts, Task 0020 evidence, or any Task 0025 work.
- A model-backed evaluator, real credentials, network/model use, publication, tag, release, workflow dispatch, commit, staging, push, PR, or merge.
- Adding a package dependency, lockfile, native addon, parser/tracing framework, database, service, or watcher.

## Acceptance Criteria

- [x] AC-01: Both evaluator flows retain a live handle for every long-running evaluator-owned model child and terminate only that child or its narrowly owned descendant group/tree.
- [x] AC-02: On POSIX, real `SIGINT` and `SIGTERM` cause bounded owned-child termination followed by idempotent cleanup of evaluator-owned unpublished staging and temporary state.
- [x] AC-03: On Windows, a real console Ctrl+C event causes the same bounded owned-child termination and cleanup; Ctrl+Break/SIGBREAK is not claimed unless separately implemented and actually evidenced.
- [x] AC-04: After supported interruption, the temporary repository, temporary HOME, `CODEX_HOME`, copied `auth.json`, scratch/final-message files, and unpublished staging are gone; the explicitly named auth source remains byte-identical and is never logged.
- [x] AC-05: Normal success, handled evaluator/model failure, timeout, spawn failure, maximum-output failure, and ordinary cleanup retain their existing externally observable classifications, limits, output, and publication behavior.
- [x] AC-06: Repeated or racing interruption/timeout/child-exit/cleanup requests do not duplicate publication or diagnostics, remove unrelated paths, leak listeners, hang, or wait without fixed bounds; partial setup and already-removed resources are safe.
- [x] AC-07: Cleanup failure reports only a bounded evaluator-owned operation, safe path label, and reason/error code; it exposes no credential contents/tokens, auth-source path, raw transcript secret, or unrelated home path, and it preserves the first interruption/failure cause.
- [x] AC-08: An interrupted or incomplete run never appears as a completed atomically published result; a result already completed and atomically published remains intact.
- [x] AC-09: README and Architecture document the exact run-scoped POSIX/Windows guarantee, bounded escalation, owned cleanup/publication/diagnostic boundaries, and the unsupported SIGKILL/OS-crash/power-loss cases without implying release readiness.
- [x] AC-10: Focused deterministic regressions, stable repository checks, credential-free packed-release checks, Task validation, diff review, and mandatory actual POSIX and Windows interruption evidence all pass, with every failure/retry/unexecuted item retained honestly.

## Plan

- [x] Verify the exact local/remote base, PR #6, nine-job post-merge run, clean tree, collision absence, safe main fast-forward, and exact Task branch.
- [x] Read the permanent sources, canonical Task/Test lifecycle tooling, named prior evidence, evaluator call graphs, implementation, tests, and directly used fixtures.
- [x] Atomically publish and fully author this DRAFT Task/Test pair before implementation.
- [x] Validate DRAFT, use this implementation prompt as confirmation, promote the pair through READY to IN_PROGRESS/RUNNING, and validate each transition.
- [x] Implement the shared internal run scope and change only the long-running child paths in both evaluators.
- [x] Add deterministic fake-child/launcher, lifecycle, race, diagnostic, ownership, and publication tests.
- [x] Add real POSIX signal and Windows console Ctrl+C integration tests and execute them on the required hosts/environments.
- [x] Synchronize README/Architecture durable truth; keep SPEC/AGENTS unchanged unless an actual ownership decision changes.
- [x] Run focused, regression, stable, packed, documentary, artifact, and whitespace gates.
- [x] Re-read every changed file, reconcile each AC with executed evidence, and set only the evidence-supported terminal Task/Test state.

## Decisions

- Only evaluator model execution is a long-running child. Git, capability help/version, focused fixture tests, and reporting remain synchronous and bounded.
- The shared helper is development-only and evaluator-specific. It owns one active root child at a time, never scans the OS, and uses a POSIX process group or Windows PID-rooted `taskkill /T` escalation.
- Fixed child termination has two 1.5-second phases: graceful request and bounded wait, then forced request and a second bounded wait. The constants are internal and test-injectable only for deterministic timing.
- Supported interruption exits are `130` for `SIGINT`/Windows Ctrl+C and `143` for POSIX `SIGTERM`; the first terminal cause remains authoritative and cleanup diagnostics are appended without replacing it.
- Signal listeners exist only from temporary-root acquisition through final cleanup and are removed on every outcome. No module-import global process state is allowed.
- Result publication stays a same-parent atomic rename. Cleanup owns only unpublished staging, evaluator temporary roots, and an evaluator-created empty result root; it never removes completed published results.
- Cleanup diagnostics prefer stable path labels over raw absolute paths and include only a bounded operation and sanitized error code.
- No dependency or publication/package-surface change is needed.

## Risks

- Windows Ctrl+C is a console event, not equivalent to `process.kill(pid, "SIGINT")`; evidence must create a separate real console, attach to it, and generate `CTRL_C_EVENT` without signaling the test runner.
- POSIX group termination and Windows PID-tree termination differ; a false ownership boundary could kill unrelated work or leak a descendant.
- Async output collection must preserve per-stream limits, UTF-8 decoding, input semantics, and existing error mapping without unbounded memory.
- A signal racing with timeout, child close, publication, or cleanup can overwrite the primary cause or duplicate work unless claims and cleanup are idempotent.
- Linux containers whose PID 1 does not reap orphans can retain a terminated descendant as state `Z`; exact-PID test liveness treats kernel zombie state as terminated while still requiring the evaluator-owned root and descendant to stop executing.

## Discoveries and Changes

- Initial branch `task/0023-audit-command-classifier-hardening` was clean at `b0a723699870d1b4561e3b0cc5d7500e2974be06`; local `main` was a strict two-commit ancestor of `origin/main` and fast-forwarded safely to the required merge.
- `origin/main` is exactly `d03e8da841a403caeec8136236d8f266d482ce42`, whose parents are `611a1d73839fe968662677d40ef355478781bc1b` and Task 0023 commit `b0a723699870d1b4561e3b0cc5d7500e2974be06`.
- GitHub PR #6 is `MERGED` into `main` at the exact merge SHA with the exact Task 0023 head. Push run `29786931114` is `completed/success` at that SHA and represents the seven Stable jobs, packed-release job, and required aggregate.
- No local/remote `*0024*` branch, Task 0024 directory, matching Task 0024 PR, or unpushed local commit existed. PR #6 only mentioned Task 0024 as explicitly out of scope.
- `scripts/audit-smoke.mjs` has one long-running model call behind `runProcess` plus bounded synchronous Codex/Git/fixture helpers. `scripts/grilling-eval/core.mjs` has one long-running per-turn model call behind `runProcess` plus bounded synchronous Codex/Git helpers.
- At the exact base, both long-running paths used `spawnSync`; neither evaluator registered import-time or run-time signal listeners. Their `finally` blocks synchronously removed evaluator-owned temporary state, but an abrupt supported signal could not reliably drive those blocks.
- The audit flow owns one temporary root containing repository, isolated home/`CODEX_HOME`, copied auth, control/CA/config, and last-message scratch. The grilling flow additionally owns unpublished output staging and atomically renames only complete run/comparison results.
- `scripts/evaluator-process.mjs` now owns the shared live-child lifecycle. It keeps output bounded per stream, preserves input/UTF-8/error results, claims the first terminal cause, terminates only the detached POSIX group or Windows PID tree, and removes its run-scoped listeners during one idempotent finalization promise.
- Both evaluators now checkpoint acquired setup, active child, staging/publication, and cleanup phases. Their CLI entrypoints preserve normal error mapping and use interruption exits `130`/`143`; bounded Git/preflight/test helpers remain synchronous.
- `runComparison` no longer deletes runs that completed their atomic publication before a later run failed; it still publishes no incomplete comparison.
- Deterministic fixtures cover owned descendants, an ambient sibling, setup/spawn/timeout/exit/publication/cleanup races, cleanup failure, source-auth bytes, staging, listener baselines, and safe diagnostics. A Win32 helper generates a real console Ctrl+C event; the Linux platform test sends real `SIGINT` and `SIGTERM`.
- Initial cleanup-failure coverage incorrectly required injected failed cleanup to remove its hidden staging path. The corrected contract asserts that the retained failure evidence is never exposed as a completed result.
- The first full `npm run check` attempt hung because default Node test discovery executed `fake-child.mjs` without arguments and it waited on the worker's open stdin. The attempt was canceled after exact process-chain diagnosis; the fixture now exits immediately only in its no-argument discovery mode, and the unchanged command passed on retry.

## Documentation Impact

- SPEC: Unchanged. This is a development-only harness implementation guarantee, not a public product requirement or MVP acceptance change.
- ARCHITECTURE: Updated for the shared run-scoped listener, owned child group/tree, two-phase termination, cleanup, diagnostic, platform, and atomic-publication design.
- README: Updated both evaluator sections and status wording with the evidenced POSIX/Windows guarantee and retained abrupt-termination/release-readiness limits.
- AGENTS: Unchanged. Repository-wide Codex scope, documentation routing, verification commands, and completion rules remain accurate.

## Completed

- Completed the exact-SHA local/remote/Actions/collision preflight and created `task/0024-interrupt-safe-evaluator-cleanup` at the required base without altering user work.
- Read and reconciled all authorized permanent, lifecycle, prior-evidence, evaluator, test, helper, and directly used fixture sources.
- Atomically published the canonical Task/Test pair and authored the full DRAFT scope, decisions, risks, AC mapping, and planned evidence before implementation.
- Validated the DRAFT pair, applied the prompt's explicit confirmation, promoted both artifacts through READY to IN_PROGRESS/RUNNING, and retained unexecuted test rows.
- Implemented the development-only shared lifecycle and integrated it only into the audit and grilling model-child paths, preserving bounded synchronous helpers.
- Added deterministic lifecycle/cleanup/platform fixtures and tests, including actual Windows console Ctrl+C and actual Linux `SIGINT`/`SIGTERM` evidence for both evaluator flows.
- Synchronized README and Architecture, retained SPEC/AGENTS and Task 0020 without churn, and passed focused, historical, full stable, and credential-free packed-release checks.
- Re-read all changed code/tests/docs, reconciled every AC with the final diff and executed evidence, validated the exact 15-path allowlist, and confirmed clean whitespace, empty staged diff, unchanged dependency/publication boundaries, exact branch, and exact base HEAD.

## Remaining

- None.

## Resume Point

Independent review can begin from the unchanged base HEAD with all intended changes left unstaged in the working tree.

## Blockers

- None known.
