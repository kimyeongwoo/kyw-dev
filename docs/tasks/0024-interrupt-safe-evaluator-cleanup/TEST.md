# TEST 0024 — Interrupt-safe evaluator cleanup

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules and developer entry point: `../../../AGENTS.md` and `../../../README.md`
- Exact base: `d03e8da841a403caeec8136236d8f266d482ce42`
- Evaluators: `../../../scripts/audit-smoke.mjs`, `../../../scripts/grilling-eval.mjs`, and `../../../scripts/grilling-eval/core.mjs`
- Existing regressions: `../../../test/audit-smoke.test.mjs` and `../../../test/grilling-eval.test.mjs`
- Prior evidence: Tasks `0011`, `0014`, `0017`, `0018`, `0020`, and `0023`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-10 — exact base, PR/CI evidence, clean branch, collision absence, and atomic pair provenance | Inspect exact local/remote Git state, PR #6, run 29786931114 and nine jobs, branch/Task/PR collisions, helper output, and validator | Provenance/Audit | PASS | Exact base/parents, merged PR, successful nine-job push run, clean collision-free start, safe main fast-forward, atomic pair creation, and DRAFT/READY/IN_PROGRESS validation all passed. Final terminal validation is T-14. |
| T-02 | AC-01/AC-05 — shared live-child helper preserves success, nonzero, timeout, spawn ENOENT, per-stream output limit, input, UTF-8, and bounded results | Drive deterministic fake children through the shared helper with fixed small test bounds and observable result objects | Unit/Integration | PASS | `test/evaluator-process.test.mjs`: success/UTF-8/input, exit 7, ENOENT, ETIMEDOUT, ENOBUFS, and exact PID-rooted ownership passed; final focused bundle 7/7 helper cases. |
| T-03 | AC-01/AC-04/AC-05/AC-08 — grilling evaluator normal/failure/timeout/spawn/interruption and publication behavior | Run `runEvaluation` with deterministic fake launchers and isolated auth/output; inspect child state, temp/auth cleanup, source hash, staging, and completed results | Integration | PASS | Concrete cleanup suite passed normal, nonzero, timeout, ENOENT, setup/spawn/staging/publication/cleanup interruption, source bytes, no incomplete publication, and completed-run preservation. |
| T-04 | AC-01/AC-04/AC-05 — audit evaluator normal/failure/timeout/spawn/interruption and cleanup behavior | Run `runAuditSmoke` with deterministic fake launchers/dependencies; inspect owned state, source hash, result classification, and cleanup | Integration | PASS | The same concrete suite passed the audit normal, nonzero, timeout, ENOENT, setup/spawn/active/cleanup interruption, exact-root cleanup, and source-byte cases. |
| T-05 | AC-01/AC-02/AC-03 — only evaluator-owned child/tree terminates and an unrelated sibling remains alive | Fake child emits a ready file with root/descendant PIDs; interrupt evaluator, poll exact PIDs with bounds, and verify separately launched sibling survival; statically reject OS-wide scanning | Security/Platform integration | PASS | Direct, Windows-console, and Linux-signal tests observed root/descendant termination and sibling survival; source guard proves POSIX negative-PID and Windows `/PID ... /T` targeting with no enumerator command. |
| T-06 | AC-04/AC-08 — temporary repo/HOME/CODEX_HOME/auth/scratch/staging disappear while source auth and published results remain | Record acquired evaluator-owned paths through a test hook, interrupt after readiness, and inspect exact paths/hashes and result inventory | Integration/Security | PASS | Both platform and concrete suites verified acquired roots/repositories/HOME/CODEX_HOME/auth copy/staging absent, source auth byte-identical, no incomplete result, and already-published result retention. |
| T-07 | AC-06 — repeated signal, signal-timeout, signal-exit, partial setup, cleanup reentry, and listener baselines are bounded/idempotent | Deterministic lifecycle injections plus real subprocess races using readiness/barrier files and bounded polling; compare listener counts before/after | Unit/Integration | PASS | Repeated signal, timeout-first race, post-child-exit signal, setup/auth/spawn/staging/publication/cleanup checkpoints, double-finalize, partial cleanup, listener baselines, and fixed polling budgets passed. |
| T-08 | AC-07 — cleanup failure is safely diagnosed and primary cause remains authoritative | Inject one failure at the owned removal seam; assert stable operation/path label/code, bounded output, primary interruption/failure code, and absence of credential/source/raw-home text | Unit/Security | PASS | Both flows retained their interruption codes and emitted unique `operation`/`pathLabel`/`reason=EACCES` lines without the injected secret, auth path, or home path. |
| T-09 | AC-02/AC-04/AC-06/AC-08 — actual POSIX SIGINT and SIGTERM contract | Launch each evaluator test entrypoint on a real POSIX host, wait for ready marker, send the actual signal, and verify exit 130/143, child/tree death, exact cleanup, source hash, listeners/process completion, and no incomplete publication | Platform E2E | PASS | Cached Linux `node:24-bookworm` (Node 24.14.0, kernel 6.6.87.2) final run passed 4/4 in 1.49 seconds: both flows under real SIGINT and SIGTERM, no skips. |
| T-10 | AC-03/AC-04/AC-06/AC-08 — actual Windows console Ctrl+C contract | Create a hidden separate Windows console, launch each evaluator entrypoint, attach a helper to that console and call `GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0)`, then verify exit 130, child/tree death, exact cleanup, source hash, and no incomplete publication | Platform E2E | PASS | Windows 10.0.26200 final focused run passed both flows with real `GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0)`, exit 130, exact cleanup/tree death, and sibling survival; no `process.kill` substitution or skip. |
| T-11 | AC-05/AC-08 — existing grading, audit invariants, atomic run/comparison publication, and no-failed-artifact rules remain | Run complete existing grilling/audit tests plus targeted assertions that completed result dirs persist and incomplete comparison cleanup removes only owned results | Regression/Integration | PASS | Audit 18/18, grilling 15/15, combined audit 27/27, canonical grilling 15/15, plus concrete preservation coverage passed. |
| T-12 | AC-09 — README/Architecture truth is precise and SPEC/AGENTS stay unaffected | Review permanent-document diff against actual platform evidence and search for stale unresolved/support claims | Documentation/Audit | PASS | README/Architecture now state the evidenced signals, exit codes, 1.5s+1.5s escalation, owned cleanup/publication/diagnostic boundaries, and abrupt limits; SPEC/AGENTS/Task 0020 unchanged. |
| T-13 | AC-10 — focused, full stable, and credential-free packed checks pass | Run focused interruption tests, both existing evaluator files, deterministic grilling command, audit suite, `npm run check`, and `npm run release:ci` without model/auth | Regression/Packaging | PASS | Final focused/audit bundle passed 36/36; final credential-free `release:ci` passed 162/162, lint, format, 29-file pack check, and packed-release SHA-256 verification. The integration continuation preserved the external-wrapper exit 124 and then passed the identical full command with a 15-minute outer allowance in 32.538 seconds. |
| T-14 | AC-10 — final Task artifacts, whitespace, staged/dependency/scope boundaries, and diff-to-matrix review pass | Run Task validator, `git diff --check`, status/name/stat/complete diff/cached checks, dependency/lockfile/workflow/Skill/Plugin/publication/later-Task inventories, and manual AC review | Audit | PASS | Validator retry returned `valid: true`; exact 15-path allowlist, branch/base, complete tracked/untracked reread, whitespace, empty staged diff, forbidden-scope diff, no Task 0025, and manual AC review passed. |

Every AC maps to one or more rows. New branches discovered during implementation require appended rows before terminal status; IDs will not be renumbered.

## Regression Coverage

- [x] Audit read-only/fix event analysis, plan ordering, repair scope, fixture hashes/Git status, auth-source checks, redaction, verdicts, and no-artifact behavior remain unchanged.
- [x] Grilling schema/rubric/grading/session/source-read, fixture/auth isolation, per-turn JSONL/final-message artifacts, comparison/report, and package boundaries remain unchanged.
- [x] Success, child nonzero, timeout, ENOENT/spawn failure, and maximum-output behavior are covered without a model or credential; both concrete flows map the shared result consistently.
- [x] Only long-running evaluator children become asynchronous; bounded Git/preflight/helper subprocesses stay synchronous.
- [x] Signal listeners are run-scoped, idempotent, and return to baseline on success and every handled failure.
- [x] POSIX SIGINT/SIGTERM and Windows real console Ctrl+C evidence execute rather than skip.
- [x] Completed atomically published results remain; incomplete staging is removed on successful cleanup and never appears completed when cleanup itself fails.
- [x] No dependency, lockfile, workflow, production Skill, Plugin, publication, release-verdict, or Task 0025 path changes.

## Commands

Planned commands; Results will preserve every actual attempt, exit status, host/runtime, concise count, failure, code/test change, and retry.

```text
node --test test/evaluator-process.test.mjs
node --test test/evaluator-cleanup.test.mjs
node --test test/evaluator-platform.test.mjs
node --test test/audit-smoke.test.mjs
node --test test/grilling-eval.test.mjs
node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs
npm run eval:grilling:unit
npm run check
npm run release:ci
node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0024-interrupt-safe-evaluator-cleanup
git diff --check
```

Actual POSIX command:

```text
docker run --rm --mount "type=bind,source=C:\1kyw\5.personal\kyw_dev,target=/workspace" -w /workspace node:24-bookworm node --test test/evaluator-platform.test.mjs
```

Actual Windows console evidence is part of `node --test test/evaluator-platform.test.mjs`; the test launches `windows-console-ctrl-c.ps1`, which creates a hidden new console and calls Win32 `GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0)`. No model-backed command, credential use, `npm publish` form, workflow dispatch, commit, stage, push, PR, merge, tag, release, or submission command is authorized.

## Results

- Primary host: Microsoft Windows 10.0.26200 (`win32`), PowerShell, Node `v24.11.0`, npm `11.18.0`.
- POSIX evidence host: cached Docker image `node:24-bookworm`, Linux kernel `6.6.87.2-microsoft-standard-WSL2`, Node `v24.14.0`, npm `11.9.0`, Git `2.39.5`; no image pull or project installation occurred.
- Initial Git/GitHub preflight passed: clean source tree, exact required `origin/main`, PR #6 merge/head/base, successful push run 29786931114 with all nine expected jobs, no Task 0024 collision, safe local-main fast-forward, exact Task branch/base, and no altered user work.
- Canonical atomic creation exited 0 and returned ID `0024`, slug `interrupt-safe-evaluator-cleanup`, and both expected paths in one published directory.
- Syntax: all four changed production scripts passed `node --check` before focused execution.
- Initial existing regressions passed: grilling 15/15 and audit 18/18.
- Direct helper attempt 1 passed 6/6. Concrete evaluator attempt 1 passed 8/9, then attempt 2 passed 9/9 after correcting the cleanup-failure publication assertion.
- Windows platform attempt 1 passed 2/2; after fixture/test refinements, attempt 2 passed 2/2 and the final combined focused run passed both Windows cases again.
- POSIX platform final attempt passed 4/4 with actual SIGINT/SIGTERM for both flows in 1.49 seconds and no skip/todo.
- Static/focused validation passed: lint 42 modules, format 178 files, final interruption bundle 18/18, audit 18/18, grilling 15/15, canonical grilling 15/15, and combined audit 27/27.
- `npm run check` attempt 2 passed 161/161 plus lint, format, and pack check (29 files, 61,294 bytes).
- The final `npm run release:ci` passed 162/162 plus lint over 42 modules/foundation metadata, format over 178 files, the 29-file/61,294-byte pack check, and packed-release SHA-256 `75411a0750c2b013cad435a9a2468a786c4d9e1f23c4dcd57f0f4f2a973c89a5`.
- During the first integration continuation, the focused bundle passed 36/36, but the next `npm run release:ci` invocation was terminated by its external execution wrapper after 5.0 seconds with exit 124. The wrapper had been configured with an inadequate one-second allowance (subject to the tool's approximately five-second minimum); the repository command had not produced a test assertion failure or completion result. A read-only stop audit found the same 15 paths, no staged files, unchanged base refs, and no residual repository-scoped npm/Node child.
- The authorized retry kept the repository-defined command unchanged and raised only the external allowance to 15 minutes. It ran from `2026-07-21T02:28:17.3975565Z` through `2026-07-21T02:28:49.9353942Z`, exited 0 after 32.538 seconds, passed 162/162 tests with zero failures/cancellations/skips, lint over 42 modules/foundation metadata, format over 178 files, the 29-file/61,294-byte pack check, and packed-release SHA-256 `75411a0750c2b013cad435a9a2468a786c4d9e1f23c4dcd57f0f4f2a973c89a5`.
- The post-full focused command ran from `2026-07-21T02:29:28.9281909Z` through `2026-07-21T02:29:47.1143141Z`, exited 0 after 18.186 seconds, and passed 36/36 including both real Windows console Ctrl+C evaluator cases. The post-full Task validator, whitespace, exact 15-path allowlist, forbidden-scope, credential/artifact, and empty-index checks also exited 0.
- Hosted PR run `29796198557` at original head `d8bf35813eb385f18f519b6affddcb551e33e289` completed with all Ubuntu, Windows, and packed-release jobs successful. The macOS Node 22.x and 24.x jobs reached the Test step, emitted passing test output, then remained live until their 20-minute job timeouts cancelled the Test steps. `Required / credential-free CI` consequently failed.
- The exact hosted-only cause was the test helper `processAlive(pid)`: every non-Windows platform attempted `/proc/<pid>/stat`, although macOS has no `/proc`. Its `ENOENT` path therefore misclassified a live unrelated child as dead, so `t.after()` skipped terminating that child and the Node test worker remained live. The repair limits `/proc` `X`/`Z` zombie detection to Linux; macOS and other non-Windows POSIX hosts use `process.kill(pid, 0)`, while Windows behavior and unexpected-error propagation remain unchanged.
- Failed run `29796198557` will not be rerun. The minimal repair will be verified by local Task 0024 checks and a new hosted Actions run created by the repair commit; hosted success will be recorded on PR #7 without an evidence-only commit.
- Repair verification on the Windows host passed `node --test test/evaluator-platform.test.mjs` at 2/2 and the complete Task 0024 focused command at 36/36, including actual Windows console Ctrl+C for both evaluator flows. The cached Linux Node 24 container passed the same platform file at 4/4 with actual SIGINT/SIGTERM for both flows, preserving Linux zombie-sensitive liveness coverage. Neither command is claimed as macOS evidence.
- The repair `npm run release:ci` exited 0: 162/162 tests, lint over 42 JavaScript modules/foundation metadata, format over 178 UTF-8/LF files, the 29-file/61,294-byte pack check, and packed-release SHA-256 `75411a0750c2b013cad435a9a2468a786c4d9e1f23c4dcd57f0f4f2a973c89a5` all passed.
- Task validation, whitespace, format, exact two-path repair scope, and dependency/lockfile/workflow/Skill/Plugin/Task 0020/Task 0025 gates exited 0. Credential scanning found zero matches. The artifact audit preserved 2,938 pre-existing ignored eval files whose newest write was `2026-07-18T05:50:04.8739286Z`, before repair base commit time `2026-07-21T02:33:00Z`; it found zero repair-era eval files and no temporary archive/staging/log artifacts. Product behavior, architecture, setup, and repository-wide rules did not change, so README, Architecture, SPEC, AGENTS, and Task 0020 remain unchanged.

### Executed command history

Unless a row says Linux, the host was Microsoft Windows 10.0.26200 with Node `v24.11.0` and npm `11.18.0`.

| Order | Exact command | Attempt / exit | Evidence class and result |
|---|---|---|---|
| 1 | `node ./skills/kyw-task/scripts/task-artifacts.mjs create --tasks-root ./docs/tasks --title "Interrupt-safe evaluator cleanup"` | 1 / 0 | Documentary: atomically created exact Task/Test pair. |
| 2 | `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0024-interrupt-safe-evaluator-cleanup` | DRAFT, READY, IN_PROGRESS attempts / 0 each | Documentary: each authored lifecycle state valid before implementation. |
| 3 | `node --check scripts/evaluator-process.mjs` and the equivalent checks for `scripts/audit-smoke.mjs`, `scripts/grilling-eval.mjs`, `scripts/grilling-eval/core.mjs` | 1 / 0 each | Focused syntax: 4/4. |
| 4 | `node --test test/grilling-eval.test.mjs` | 1 / 0 | Focused regression: 15/15. |
| 5 | `node --test test/audit-smoke.test.mjs` | 1 / 0 | Focused regression: 18/18. |
| 6 | `node --test test/evaluator-process.test.mjs` | 1 / 0 | Focused lifecycle: initial 6/6. |
| 7 | `node --test test/evaluator-cleanup.test.mjs` | 1 / 1 | Focused concrete flows: 8/9; cleanup-failure assertion failed. |
| 8 | `node --test test/evaluator-cleanup.test.mjs` | 2 / 0 | Focused unchanged production retry after test correction: 9/9. |
| 9 | `node --test test/evaluator-platform.test.mjs` | 1 / 0 | Windows platform: actual console Ctrl+C 2/2. |
| 10 | `wsl.exe -d Ubuntu -- bash -lc 'uname -a && node --version && npm --version && pwd'` | 1 / 1 | Platform discovery: Ubuntu present, Node absent; no test claimed. |
| 11 | `docker run --rm node:24-bookworm sh -lc 'uname -a && node --version && npm --version && git --version'` | 1 / 0 | Platform discovery: cached Linux image, Node 24.14.0/npm 11.9.0/Git 2.39.5. |
| 12 | `docker run --rm --mount "type=bind,source=C:\1kyw\5.personal\kyw_dev,target=/workspace" -w /workspace node:24-bookworm node --test test/evaluator-platform.test.mjs` | 1 / 1 | Linux platform: 0/4 due zombie-sensitive liveness assertion. |
| 13 | same Docker platform command | 2 / 0 | Linux platform: 4/4, but retained 30-second test timer observed. |
| 14 | `node --test test/evaluator-platform.test.mjs` | 2 / 0 | Windows platform after fixture refinement: 2/2. |
| 15 | same Docker platform command | 3 / 0 | Linux platform final: actual SIGINT/SIGTERM 4/4 in 1.49 seconds. |
| 16 | `npm run lint` | 1 / 0 | Static: 42 modules and foundation metadata. |
| 17 | `npm run format:check` | 1 / 0 | Static: 178 UTF-8/LF files. |
| 18 | `node --test test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs test/evaluator-platform.test.mjs` | final pre-review / 0 | Focused/platform: 18/18 after coverage additions. |
| 19 | `node --test test/audit-smoke.test.mjs` | final standalone / 0 | Regression: 18/18. |
| 20 | `node --test test/grilling-eval.test.mjs` | final standalone / 0 | Regression: 15/15. |
| 21 | `npm run eval:grilling:unit` | 1 / 0 | Canonical deterministic grilling: 15/15. |
| 22 | `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs` | 1 / 0 | Combined audit: 27/27. |
| 23 | `npm run check` | 1 / CANCELED | Full: default test discovery hung in no-argument fake child; exact process chain stopped after diagnosis. |
| 24 | `npm run check` | 2 / 0 | Full retry: 161/161 plus lint/format/pack. |
| 25 | `npm run release:ci` | final / 0 | Packed: 162/162, all stable checks, 29 files/61,294 bytes, SHA-256 above. |
| 26 | `node --check scripts/evaluator-process.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --check scripts/audit-smoke.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs test/evaluator-platform.test.mjs test/audit-smoke.test.mjs` | final / 0 | Focused syntax and regression after timing/message review: 36/36. |
| 27 | `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0024-interrupt-safe-evaluator-cleanup` | completion retry / 0 | Documentary: `valid: true` after canonical row repair. |
| 28 | `git diff --check` and `git diff --cached --exit-code` | completion / 0 each | Audit: no whitespace errors and no staged files. |
| 29 | `git status --porcelain=v1 -uall` compared with the explicit Task 0024 allowlist | completion / 0 | Audit: exactly 15 intended paths, no unexpected path. |
| 30 | `node --check scripts/evaluator-process.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --check scripts/audit-smoke.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs test/evaluator-platform.test.mjs test/audit-smoke.test.mjs` | integration continuation attempt 1 / 0 | Focused/platform: 36/36 including both real Windows console Ctrl+C cases. |
| 31 | `npm run release:ci` | integration continuation attempt 1 / 124 | Full/packed: external execution wrapper stopped the command after 5.0 seconds before any repository test result; this is NOT a product-test failure and is not counted as PASS. |
| 32 | `git fetch origin --prune` plus exact branch/base/index/15-path/forbidden-scope/credential-artifact/remote-collision preflight | integration continuation / 0 | Audit: exact Task branch and base, unchanged `origin/main`, empty index, exact allowlist, no forbidden artifact or remote collision. |
| 33 | `npm run release:ci` | integration continuation retry / 0 | Full/packed: 15-minute external allowance; 32.538 seconds actual, 162/162 tests, lint 42 modules/foundation metadata, format 178 files, pack 29 files/61,294 bytes, packed SHA-256 verified. |
| 34 | Task validator, `git diff --check`, exact 15-path allowlist, forbidden-scope scan, credential/temp-artifact scan, and `git diff --cached --exit-code` | post-full / 0 each | Documentary/audit: all mandatory scope and state gates passed. |
| 35 | `node --check scripts/evaluator-process.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --check scripts/audit-smoke.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs test/evaluator-platform.test.mjs test/audit-smoke.test.mjs` | post-full final / 0 | Focused/platform: 36/36 in 18.186 seconds, including real Windows console Ctrl+C for audit and grilling. |
| 36 | `node --test test/evaluator-platform.test.mjs` | CI repair / 0 | Windows platform: actual console Ctrl+C 2/2; no skips, and unrelated sibling cleanup completed. |
| 37 | `node --check scripts/evaluator-process.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --check scripts/audit-smoke.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/evaluator-process.test.mjs test/evaluator-cleanup.test.mjs test/evaluator-platform.test.mjs test/audit-smoke.test.mjs` | CI repair / 0 | Complete focused/platform regression: 36/36 including both actual Windows console Ctrl+C cases. |
| 38 | `docker run --rm --mount "type=bind,source=C:\1kyw\5.personal\kyw_dev,target=/workspace" -w /workspace node:24-bookworm node --test test/evaluator-platform.test.mjs` | CI repair / 0 | Linux platform: actual SIGINT/SIGTERM 4/4 for audit and grilling; Linux `/proc` zombie handling retained. |
| 39 | `npm run release:ci` | CI repair / 0 | Full/packed: 162/162 tests, lint 42 modules/foundation metadata, format 178 files, pack 29 files/61,294 bytes, packed SHA-256 verified. |
| 40 | Task validator, `git diff --check`, `npm run format:check`, exact repair-path check, and forbidden dependency/lockfile/workflow/Skill/Plugin/Task 0020/Task 0025 scan | CI repair / 0 each | Documentary/audit: valid Task pair, clean whitespace/format, exactly the two authorized repair paths, empty index/untracked set, and no forbidden scope or Task 0025 branch/directory. |
| 41 | Credential, eval-result, and temporary-artifact scan | CI repair attempt 1 / 1 | Audit command was over-broad: it correctly found no credential or temp match but treated 2,938 pre-existing ignored eval files as repair output. No file was changed or removed. |
| 42 | Refined credential, repair-era eval-result, and temporary-artifact scan against repair-base commit time | CI repair attempt 2 / 0 | Zero credential matches, zero eval files newer than the repair base, no root/ignored temp artifacts; all 2,938 older ignored eval files were preserved. |

## Failure and Retry History

- `node --test test/evaluator-cleanup.test.mjs` attempt 1 exited 1 with 8/9 passing. The cleanup-failure case incorrectly required an intentionally non-removable hidden staging directory to disappear. The test was corrected to require no completed/non-hidden publication; attempt 2 passed 9/9.
- `wsl.exe -d Ubuntu -- bash -lc 'uname -a && node --version && npm --version && pwd'` exited 1 because that Ubuntu distro has no Node. No test was claimed. A cached Docker Node image was then verified and used without network or installation.
- POSIX platform attempt 1 exited 1 with 0/4 because exact `kill(pid, 0)` liveness saw an unreaped descendant zombie under the container's Node PID 1. Reproduction showed evaluator exit 130, terminal cleanup success, and no child PIDs under a reaping shell PID 1. Fixtures were changed to reap their descendant and exact-PID test liveness now treats `/proc` state `Z`/`X` as terminated; attempt 2 passed 4/4.
- POSIX attempt 2 passed assertions but took 31.6 seconds because the successful-exit branch left a 30-second diagnostic timer referenced. The test helper now clears that timer; unchanged platform behavior passed attempt 3 at 4/4 in 1.49 seconds.
- First `npm run check` attempt was canceled after its exact process chain remained live: default `node --test` discovered `test/fixtures/evaluator-process/fake-child.mjs` with no arguments, whose default success mode blocked on the worker's open stdin. Only the four verified npm/test PIDs were stopped. The fake child and entrypoint now exit 0 in no-argument discovery mode; the exact retry passed 161/161 and every stable subcommand.
- First completion-gate validator retry exited 1 because T-13 used noncanonical matrix status `RUNNING`; the row was changed to evidence-supported `PASS`, and the exact validator command was retried.
- The first integration-continuation `npm run release:ci` invocation exited 124 after 5.0 seconds because its external command wrapper was mistakenly given a one-second limit; the repository suite itself reported neither an assertion failure nor a completion result. No source change was made. The user explicitly authorized continuation, the identical repository command was retried with a 15-minute outer allowance, and it exited 0 after 32.538 seconds with every test/lint/format/pack stage passing.
- PR run `29796198557` preserved the first hosted failure evidence: `Stable / macOS / Node 22.x` and `Stable / macOS / Node 24.x` each had a cancelled Test step after the 20-minute job timeout, while all Ubuntu, Windows, and packed-release jobs succeeded and the aggregate required job failed. macOS lacks `/proc`, so the test-only liveness helper treated `ENOENT` as a missing PID, skipped unrelated-child cleanup, and left the Node worker alive. The bounded repair changes only that helper's `/proc` branch to Linux-only and will be exercised by a new commit-triggered run rather than rerunning the failed workflow.
- The first repair artifact audit exited 1 because it assumed the ignored `eval/grilling/results/` tree must be absent. A read-only timestamp audit showed all 2,938 files predated the repair base; the scan was narrowed to repair-era files plus credential/temp patterns, then exited 0 without deleting or modifying the preserved evidence.

## Unverified

- Hosted repair CI is `NOT RUN` until the repair commit is pushed. Original-head run `29796198557` is intentionally preserved and will not be rerun; only the new commit-triggered run will count as hosted repair evidence.
- Model-backed evaluator behavior and real credentials are `NOT RUN` by design; all implementation tests use deterministic fake children/launchers.
- Windows Ctrl+Break/SIGBREAK and console-close/session-manager behavior are unsupported and `NOT RUN`.
- `SIGKILL` directed at the evaluator, OS crash, and power loss are outside the guarantee and `NOT RUN`.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible and host-specific claims actually ran.
- [x] Confirm required evaluator, stable, packed, documentary, and Task-artifact regressions ran.
- [x] Confirm no incomplete artifact or unrelated process/path was affected.
- [x] Confirm permanent-document impact and unsupported-case wording match evidence.
