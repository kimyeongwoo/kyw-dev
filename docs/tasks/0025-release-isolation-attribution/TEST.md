# TEST 0025 — Release Isolation Attribution

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Exact base: `360859c2694bb2bd94f550edd260f2a68ece9e7f`
- Existing isolation contract/evidence: Tasks `0019` and relevant retained Task `0020` evidence
- Current runner/package contracts: `../../../scripts/release-gate-isolation.mjs`, `../../../scripts/packed-release-check.mjs`, and `../../../scripts/lib/validate-foundation.mjs`
- Current deterministic suites: `../../../test/release-gate-isolation.test.mjs` and `../../../test/distribution.test.mjs`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 exact, exclusive clean/violation/ambient outcomes and distinct failure categories | Pure synthetic before/after evidence plus injected snapshot failure; assert exact codes/status and unknown never clean | Unit/Safety | PASS | Focused tests `identical protected state is CLEAN`, managed/ambient cases, and `snapshot failure retains NORMAL_STATE_SNAPSHOT_FAILED`; 29/29 passed. |
| T-02 | AC-02 safe deterministic entry evidence and truncation-independent classification | Synthetic added/removed/modified/type-changed entries; compare stable sorted relative paths/reasons with display cap below full difference count | Unit/Privacy | PASS | Focused evidence-kind, unknown-control stability, privacy, and truncation tests; 29/29 passed. |
| T-03 | AC-03 narrow normal-agents attribution | Change each managed Skill/ownership path and one unrelated Skill/path; assert violation only for exact managed paths absent another marker | Unit/Security | PASS | Focused managed Skill, ownership metadata, and unrelated Skill tests; 29/29 passed. |
| T-04 | AC-03 narrow Codex/npm/packed-byte attribution | Inject exact kyw-dev plugin/marketplace/cache identifiers, matching packed Skill digest, unrelated session/log/cache/control changes, and unmarked npmrc change | Unit/Security | PASS | Focused Codex marker, packed-byte, structural drift, unknown-control, and npmrc tests; 29/29 passed. |
| T-05 | AC-03/AC-05 parent protected-environment attribution and clean parent invariance | Inject parent environment mutation seam and compare normal clean execution environment snapshots | Unit/Integration | PASS | Pure and runner-observed parent-mutation focused tests plus distribution and standalone clean runs passed. |
| T-06 | AC-04 ambient retry state machine | Inject ambient→clean, ambient→ambient, and violation-first outcomes; assert attempt count, final status, safe history, retryability, and nonzero CLI-equivalent failure | Unit/Integration | PASS | Three focused transition tests and attributed error-code assertion passed; 29/29 focused tests. |
| T-07 | AC-04/AC-05 nonretryable failures and attempt ownership | Inject guard/snapshot/child/package/marketplace/cleanup failures; observe one attempt; capture distinct approved roots, cleanup targets, and fresh evidence per attempt | Unit/Security | PASS | Five nonretryable error subtests, collision guard, ambient retry root/evidence, and exact-root cleanup tests passed. |
| T-08 | AC-06 API/CLI safe structured output | Inspect success/failure summaries, the failure formatter, and the main CLI catch/exit branch for exact statuses, bounded diagnostics, no old ordinary code, and no absolute/content/token leakage | Unit/CLI/Privacy | PASS | Summary/error assertions, credential/path/payload redaction assertions, source-boundary review, and standalone structured output passed; every thrown terminal result reaches `process.exitCode = 1`. |
| T-09 | AC-07/AC-08 deterministic synthetic protected state | Run distribution lifecycle with a temporary protected fixture outside attempt roots and prove byte/state identity without intentional real-user assertions | Distribution E2E | PASS | `node --test test/distribution.test.mjs`: 2/2 passed; synthetic fixture digest remained unchanged and outside cleaned roots. |
| T-10 | AC-07/AC-09 existing isolation and lifecycle regression | Re-run Windows identity, pre-spawn guards, isolated child env, exact cleanup, direct install/update/doctor/uninstall/preservation, and marketplace/cache-byte assertions | Unit/Distribution E2E | PASS | Combined focused suite 31/31 and full suite 185/185 passed; standalone direct/marketplace lifecycle passed. |
| T-11 | AC-10 development-only/no-dependency/package boundary | Inspect imports/package fields/allowlist and run lint, format, pack, check, release:ci | Static/Packaging | PASS | Lint 42 modules; format 180 files; pack 29 files/61,708 bytes; aggregate and release-CI passed with packed SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`. |
| T-12 | AC-11 documentation synchronization and historical immutability | Review README/Architecture semantics; verify SPEC/AGENTS and Tasks 0019/0020/0024 unchanged from base | Documentation/Audit | PASS | Final changed-path and forbidden-path review found only the seven authorized Task 0025 paths; SPEC/AGENTS/historical Tasks have no diff. |
| T-13 | AC-12 complete validation and pre-commit scope | Execute every required command, Task validator, diff check, complete diff/untracked review, empty-index/HEAD/branch/forbidden-path scans | Regression/Audit | PASS | Final review retained exact branch/base, seven authorized unstaged paths, zero staged diff, clean diff check, unchanged forbidden paths, and no residual artifact; canonical validation passed after the recorded interim vocabulary correction. |

Every acceptance criterion maps to at least one row. Add rows if the final diff introduces another meaningful branch or error path.

## Regression Coverage

- [x] Identical protected state returns only `CLEAN`.
- [x] Exact managed Skill and `.kyw-dev-install.json` normal-user changes return `ISOLATION_VIOLATION`.
- [x] Exact kyw-dev Codex identifiers and matching packed Skill bytes return `ISOLATION_VIOLATION`.
- [x] Unrelated Codex session/log/cache/control and unrelated `.agents` changes return `AMBIENT_STATE_CHANGED`.
- [x] Unmarked normal npm userconfig change returns `AMBIENT_STATE_CHANGED`.
- [x] Parent protected-environment mutation returns `ISOLATION_VIOLATION`; snapshot failure retains its own code.
- [x] Ambient receives exactly one retry; violation and guard/snapshot/child/package/marketplace/cleanup failures receive none.
- [x] Retry roots, snapshots, evidence, and cleanup are distinct and attempt-scoped.
- [x] Diagnostics expose no absolute protected path, raw config/auth/session/log content, or credential-shaped token.
- [x] Diagnostic truncation does not affect classification; displayed paths/reasons are sorted and deterministic.
- [x] Windows path identity, pre-spawn guard, child environment, parent environment, and exact-root cleanup remain unchanged.
- [x] Direct and marketplace packed lifecycles and exact cached Skill byte checks remain unchanged.
- [x] Package allowlist remains exactly 29 files and contains no development runner/test/Task paths.
- [x] Historical Tasks 0019, 0020, and 0024 remain unchanged; Task 0020 remains `BLOCKED`.

## Commands

Planned commands; Results will retain the exact commands actually run, host/runtime, attempt number, exit status, counts, failures, and retries.

- `node --test test/release-gate-isolation.test.mjs`
- `node --test test/distribution.test.mjs`
- `node --test test/release-gate-isolation.test.mjs test/distribution.test.mjs`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run check`
- `npm run release:ci`
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0025-release-isolation-attribution`
- `git diff --check`
- Standalone `node ./scripts/release-gate-isolation.mjs` only if its no-credential prerequisites are available; record its exact real-host outcome without converting ambient to pass.
- Final branch/HEAD/status/name-status/stat/complete-diff/untracked/index/scope/dependency/package/workflow/publication/artifact/credential scans.

Prohibited: `npm run release:check`, every `npm publish` form including dry-run, model-backed evaluation/audit, workflow dispatch, registry mutation, tag/release/public-Plugin operations, staging, commit, push, merge, and Task 0026 creation.

## Results

- Host preflight: Windows PowerShell on branch `task/0024-interrupt-safe-evaluator-cleanup`; clean index/tracked/untracked state; initial HEAD `d0a98480f6fbe8733ce89bfadf0cddd44417cdb0`.
- `git fetch origin --prune` advanced `origin/main` to exact `360859c2694bb2bd94f550edd260f2a68ece9e7f`. Git and GitHub evidence prove PR #7 `MERGED`, exact head `d0a98480...`, exact two parents, and push run `29810632745` on `main`/exact merge head with 9/9 `success` jobs.
- Collision checks found no local/remote `*0025*` branch, no `docs/tasks/0025-*`, and no PR whose title/head matched Task 0025. Local main had no unique commits, was fast-forwarded only, and the Task branch was created at exact base with a clean tree.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs create --tasks-root docs/tasks --title "Release Isolation Attribution"`: attempt 1, exit 0; atomically created exactly this Task/Test pair.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0025-release-isolation-attribution`: initial attempt 1, exit 0, `valid: true`; the pre-implementation pair satisfied the canonical contract.
- Static syntax iterations (`node --check scripts/release-gate-isolation.mjs` and both changed tests): exit 0 each. These were implementation sanity checks, not acceptance substitutes.
- `node --test test/release-gate-isolation.test.mjs`: initial implemented suite exit 0, 28/28; after evidence-kind/redaction additions exit 0, 29/29; final attempt exit 0, 29/29. Focused classification/retry/privacy/safety evidence.
- `node --test test/distribution.test.mjs`: initial and final attempts exit 0, 2/2 each. Distribution lifecycle and synthetic protected-state evidence.
- `node --test test/release-gate-isolation.test.mjs test/distribution.test.mjs`: initial and final attempts exit 0, 31/31 each. Combined focused regression.
- `npm test`: Windows/Node `v24.11.0`, initial attempt exit 0, 185/185; final recorded unchanged rerun exit 0, 185/185, 0 failed/skipped/todo. Full regression.
- `npm run lint`: final attempt exit 0; 42 JavaScript modules and foundation metadata. Static check.
- `npm run format:check`: final attempt exit 0; 180 UTF-8/LF text files. Static/documentary check.
- `npm run pack:check`: final attempt exit 0; exact allowlist 29 files, 61,708 bytes. Package boundary.
- `npm run check`: final attempt exit 0; nested 185/185 tests, lint 42 modules, format 180 files, pack 29 files/61,708 bytes. Stable aggregate.
- `npm run release:ci`: final attempt exit 0; nested aggregate passed and packed release passed at 29 files/61,708 bytes, SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`. Credential-free release aggregate.
- Standalone prerequisites were available: npm `11.18.0`, Codex CLI `0.144.6`, and bsdtar `3.8.4`. Final `node ./scripts/release-gate-isolation.mjs` attempt 1 exited 0 as exact `CLEAN`, one attempt, zero differences, unchanged parent environment, removed exact root, direct 11-step preservation lifecycle and marketplace 6-step lifecycle passed, tarball 29 files/61,708 bytes at the same SHA-256. No release approval is inferred.
- Final read-only Git audit: `git status --short --branch` showed exact branch `task/0025-release-isolation-attribution` with five tracked modifications and the Task 0025 directory untracked; `git rev-parse HEAD` stayed exact base `360859c2694bb2bd94f550edd260f2a68ece9e7f`; `git rev-list --count <base>..HEAD` returned 0; `git diff --name-status` listed only the five authorized tracked paths; `git diff --stat` reported 1,376 insertions/154 deletions before the untracked pair; `git diff --check` and `git diff --cached --exit-code` exited 0.
- Complete tracked diffs and the complete contents of both intended untracked files were re-read. The seven-path allowlist audit passed; forbidden package/lock/workflow/plugin/production-Skill/SPEC/AGENTS/Task-0019/0020/0024 paths had no diff; dependencies/devDependencies and lockfiles remained absent; workspace archive and three temporary-prefix residue counts were zero; exact local-path matches were zero. The sole credential-shaped source match is the deterministic fake token in the focused redaction test, never output by the runner.
- Terminal `DONE`/`PASSED` validation with the canonical Task artifact command exited 0 and returned `valid: true`; the post-record rerun is the final pre-commit validator evidence. The accompanying format check still covered 180 UTF-8/LF files and `git diff --check` remained clean.

## Failure and Retry History

- No source assertion, focused test, full test, package check, aggregate gate, or standalone execution failed.
- Interim Task validator attempt 2 failed with `TEST.md: matrix T-13 has invalid Status "RUNNING"; allowed: TODO, PASS, FAIL, BLOCKED, N/A`. Root cause: an in-progress matrix row used a document-level status rather than the canonical row vocabulary. `TEST.md` changed T-13 to `TODO`; the exact validator retry is recorded below.
- The exact unchanged validator retry exited 0 with `valid: true` after T-13 changed to `TODO`.
- One final `npm test` invocation returned a running tool handle before conversation compaction; the handle was unavailable afterward, so no result was claimed for that invocation. The exact command was rerun unchanged and passed 185/185 with exit 0. This was a tooling-evidence interruption, not a source/test failure or a product retry.
- The first combined read-only scope-audit command bundle exited 1 before collecting sibling results because PowerShell parsed `Test-Path ... -or Test-Path ...` as a duplicate `-LiteralPath` parameter. No repository state changed. The command grammar was corrected with explicit parenthesized `Test-Path` calls; the unchanged audit intent then passed all eight checks.
- Runtime retry behavior was exercised only with synthetic protected-state cases: ambient→clean used exactly two attempts and succeeded; ambient→ambient used exactly two attempts and failed with retryable/inconclusive metadata; violation and five injected non-attribution failure categories each used one attempt.

## Unverified

- Hosted non-Windows evidence is not available before commit/push and is not claimed by this pre-commit Task.

## Final Coverage Review

- [x] Compare the final diff to the matrix and enumerate every new outcome, state transition, error path, and compatibility behavior.
- [x] Map every acceptance criterion to implementation, deterministic test, and exact executed evidence.
- [x] Confirm all three exact outcomes are reachable and exclusive; unknown changed state cannot become clean.
- [x] Confirm ambient retries once at most, while violation and every other failure do not retry.
- [x] Confirm attempt roots/snapshots/evidence/cleanup are isolated and diagnostic truncation cannot alter classification.
- [x] Confirm no actual user state is intentionally mutated, repaired, deleted, or exposed.
- [x] Confirm existing direct/marketplace lifecycles, path guards, child/parent environment, cleanup, and package allowlist remain passing.
- [x] Confirm README/Architecture are synchronized and SPEC/AGENTS/historical Tasks remain unchanged.
- [x] Confirm required regressions, Task validation, complete diff, scope, privacy, forbidden-action, and empty-index reviews pass.
