# TASK 0025 — Release Isolation Attribution

## Status

DONE

## Goal

Replace the release-isolation runner's ambiguous protected-state failure with deterministic kyw-dev attribution and one bounded unchanged retry for inconclusive ambient changes, while preserving fail-closed release verification and the existing direct/marketplace lifecycle.

## Dependencies

- Exact base: `360859c2694bb2bd94f550edd260f2a68ece9e7f` (PR #7 merge commit; parents `d03e8da841a403caeec8136236d8f266d482ce42` and Task 0024 head `d0a98480f6fbe8733ce89bfadf0cddd44417cdb0`)
- `0019-release-gate-isolation` for the existing runner and isolation contract
- `0020-release-readiness-gate` only for retained release-isolation evidence; its `BLOCKED` verdict is immutable in this Task
- `0024-interrupt-safe-evaluator-cleanup` only for current-main provenance
- `../../../scripts/release-gate-isolation.mjs`
- `../../../scripts/packed-release-check.mjs`
- `../../../scripts/lib/validate-foundation.mjs`
- `../../../test/release-gate-isolation.test.mjs`
- `../../../test/distribution.test.mjs`
- Existing production installation and local marketplace fixtures, read only as needed to identify exact kyw-dev-owned paths and bytes

No package dependency or lockfile change is permitted.

## In Scope

- Replace ordinary protected-state `NORMAL_STATE_CHANGED` ambiguity with exactly `CLEAN`, `ISOLATION_VIOLATION`, and `AMBIENT_STATE_CHANGED` attribution outcomes.
- Capture the smallest attempt-local protected-state evidence needed to compare safe relative paths/categories, change kinds, entry types, bounded identity/digests, and exact kyw-dev markers.
- Positively attribute only exact managed Skill/ownership paths, exact kyw-dev package/plugin/marketplace/cache markers, matching packed kyw-dev Skill bytes, and runner-owned protected-environment mutation.
- Treat every changed but unattributed protected path, including generic Codex and npm-userconfig drift, as ambient/inconclusive and non-success.
- Retry only a first `AMBIENT_STATE_CHANGED`, exactly once, with a fresh approved root and fresh before/after snapshots; keep all other failures single-attempt.
- Expose bounded structured attempt history without absolute protected paths, protected contents, credential values, or full Codex session/log payload hashes.
- Add a narrow synthetic protected-state seam so ordinary deterministic distribution tests never intentionally use or mutate real user state; preserve real defaults for standalone use.
- Retain existing path guards, child environment isolation, direct and marketplace lifecycles, exact-root cleanup, package contents, and development-only boundaries.
- Synchronize contributor-facing README and durable Architecture truth, plus this Task/Test evidence.

## Out of Scope

- Production CLI, Skill installation, plugin metadata, package scripts, package dependencies, lockfiles, workflows, or package allowlist changes.
- Daemons, watchers, filesystem/process/OS tracing, ambient process scans, snapshot databases, journals, telemetry, recovery/repair of user state, or configurable retry/backoff frameworks.
- Reading, recording, or emitting raw protected-file contents, credential values, absolute user-home/config/auth/session/log paths, or complete active Codex session/log payload hashes.
- Modifying, deleting, restoring, or intentionally mutating normal user files or normal `.agents`, Codex, or npm state.
- Publication, publication dry runs, tags, releases, pushes, PR operations, public Plugin submission, or Task 0026.
- Re-gating or rewriting historical Tasks 0019, 0020, or 0024; Task 0020 remains `BLOCKED`.

## Acceptance Criteria

- [x] AC-01: The runner exposes exactly three mutually exclusive attribution outcomes: `CLEAN`, `ISOLATION_VIOLATION`, and `AMBIENT_STATE_CHANGED`; only `CLEAN` succeeds, unknown changed state never becomes clean, and existing snapshot/lifecycle/package/guard/cleanup failures remain distinct.
- [x] AC-02: Protected snapshots retain attempt-local, deterministic evidence for protected label, normalized safe relative path/category, added/removed/modified/type-changed kind, entry type, bounded digest/metadata identity where needed, and exact-marker presence; classification inspects all differences independently of bounded diagnostic display.
- [x] AC-03: Positive attribution is narrow: exact normal managed Skill/ownership paths, exact kyw-dev Codex package/plugin/marketplace/cache/Skill identifiers or packed Skill bytes, and parent protected-environment mutation are violations; unrelated `.agents`, generic Codex control/session/log/cache, unknown Codex, and unmarked npm-userconfig changes are ambient.
- [x] AC-04: A first ambient result receives exactly one immediate unchanged retry with a distinct approved root and fresh snapshots/evidence; ambient-then-clean succeeds with two-outcome history, ambient-then-ambient fails inconclusively, and violation or any other failure never retries.
- [x] AC-05: Each attempt owns and cleans only its exact approved temporary root, attempt-one evidence is not reused by attempt two, cleanup failures remain nonretryable, and the parent process environment remains unchanged on clean execution.
- [x] AC-06: API/CLI summaries provide bounded structured `isolation.status`, attempt count/history, safe reasons/relative paths, and retryable/inconclusive metadata where applicable; every non-clean terminal result exits nonzero and ordinary attribution no longer emits `NORMAL_STATE_CHANGED`.
- [x] AC-07: Deterministic tests cover all required classification, retry, privacy, truncation-independence, Windows identity, guard, child-environment, cleanup, direct lifecycle, marketplace, packed-byte, and unchanged allowlist cases without intentionally using real protected user state.
- [x] AC-08: The distribution lifecycle uses a temporary synthetic protected-state fixture outside each runner-created lifecycle root while the standalone runner retains real protected-state defaults and protection strength.
- [x] AC-09: Direct install/update/doctor/uninstall and preservation behavior, marketplace add/install/cache-byte/remove behavior, exact path guards, and exact-root cleanup remain functionally unchanged.
- [x] AC-10: The runner remains development-only, adds no dependency, persists no evidence store, performs no watcher/tracing/process scan, and leaves the exact 29-file package allowlist unchanged.
- [x] AC-11: README and Architecture document the three outcomes, narrow positive markers, fail-closed ambient retry, safe evidence, synthetic-test/real-default boundary, and no repair/tracing boundary; SPEC and AGENTS remain unchanged because no product or repository-wide agent contract changes.
- [x] AC-12: Focused suites, full/stable/package/release commands, Task validation, diff/scope/privacy scans, and final self-review pass with exact executed evidence; changes remain unstaged at base HEAD and no forbidden release action occurs.

## Plan

- [x] Complete exact-SHA local/remote preflight, collision checks, fast-forward local main, and create the authorized branch.
- [x] Read and reconcile permanent truth, canonical Task/Test machinery, prior isolation evidence, the runner, package validators, and scoped tests.
- [x] Create this Task/Test pair atomically with the canonical adapter and author the initial contract before implementation.
- [x] Implement entry-level protected evidence and narrow attribution classification in the development-only runner.
- [x] Implement attempt-scoped lifecycle ownership and the single ambient retry with bounded structured history.
- [x] Add synthetic classification/retry/privacy fixtures and make the distribution E2E deterministic while preserving real standalone defaults.
- [x] Synchronize README and Architecture, then update live Task/Test discoveries and evidence.
- [x] Run focused then complete verification, preserve every failure/retry, review the full diff/scope, and stop before staging or commit.

## Decisions

- Existing identifiers are the attribution vocabulary: `kyw-dev`, `kyw-dev-local`, the four managed Skill names, exact ownership metadata paths, and packed Skill bytes. No generic rule language is introduced.
- Exact normal-user `skills/.kyw-dev-install.json` and `skills/{kyw-audit,kyw-grilling,kyw-init,kyw-task}/**` changes are direct-lifecycle violations. Other `.agents` paths require another exact marker or remain ambient.
- Generic Codex config/auth/version/log/session/history/cache/plugin changes and normal npm userconfig changes are not causal proof by timing alone; without an exact kyw-dev marker they remain ambient and fail closed.
- Active Codex session/log/cache payloads retain structural evidence rather than full payload hashes. Protected contents are never placed in diagnostics.
- Display evidence may be capped, but attribution always evaluates the complete difference set first.

## Failure and Retry Policy

- Runtime retry policy is fixed: zero retries for `CLEAN`, `ISOLATION_VIOLATION`, guard, snapshot, child, package, marketplace, or cleanup failure; exactly one unchanged retry only after the first `AMBIENT_STATE_CHANGED`.
- Retry means identical repository/package/lifecycle inputs with a new approved temporary root and new before/after snapshots; no code, package input, lifecycle scope, policy, scheduler, or backoff changes occur between attempts.
- Every implementation or verification failure is retained in `TEST.md` with the exact command, assertion/result, root cause, corrective source/test change, and retry result. An unchanged command retry is labeled unchanged.
- A required check that cannot execute is not a pass and leaves this Task/Test `BLOCKED` unless its limitation is explicitly non-mandatory under the acceptance contract.

## No-Dependency Boundary

- `package.json` dependency and devDependency fields remain absent; no lockfile or vendored library is added.
- Use Node.js built-ins and existing package/lifecycle metadata only.

## No-Publication Boundary

- Do not run `npm run release:check`, any `npm publish` form (including dry-run), workflow dispatch, tag/release creation, push, PR creation/merge, or public Plugin submission.
- `npm run release:ci` and real local packing through existing non-publication checks are authorized; no registry mutation is authorized.

## Risks

- Concurrent protected-state activity can remain inconclusive after the one retry; fail-closed ambient status is intentional.
- Marker attribution proves deterministic ownership evidence, not OS-level process causality.
- Locked or racing protected entries must preserve snapshot-failure/type/link safety and must never be silently treated as clean.
- Packed-byte attribution must remain bounded to known managed Skill bytes and not turn generic matching into content exfiltration.
- Refactoring the lifecycle into attempts could accidentally broaden cleanup ownership or alter direct/marketplace behavior; tests must observe roots, calls, and existing result details.

## Discoveries and Changes

- Preflight began clean on retained branch `task/0024-interrupt-safe-evaluator-cleanup` at `d0a98480f6fbe8733ce89bfadf0cddd44417cdb0`; fetch advanced `origin/main` from PR #6 merge `d03e8da...` to exact PR #7 merge `360859c...`.
- PR #7 is `MERGED`, its exact head is `d0a98480...`, and push run `29810632745` targets exact `360859c...` on `main` with all nine required jobs successful.
- No local/remote `*0025*` branch, `docs/tasks/0025-*` directory, or Task-0025 PR title/head collision existed. Local main was behind only and fast-forwarded; no unrelated local commit or user change was altered.
- The current snapshot hashes aggregate location state and `protectedStateDifferences()` reduces every mismatch to a label; `assertProtectedStateUnchanged()` therefore emits only `NORMAL_STATE_CHANGED`.
- Codex volatile top-level state is already represented structurally while named control paths are traversed. The runner snapshots before/after one lifecycle, passes isolated state only to children, checks parent environment afterward, and exact-root cleans in `finally`.
- The direct and marketplace lifecycle implementations already exercise the required packed-byte behavior and must not change semantically.
- The final runner snapshots every protected surface into in-memory entry records, compares all records before bounding display to 20 differences, and emits only protected labels, normalized/redacted relative paths, entry metadata, digests, and exact marker identities.
- Exact managed `.agents` paths, bounded identifier markers, known packed Skill digests, and protected parent-environment keys are the only positive attribution sources. Mixed attributed/unknown changes fail as `ISOLATION_VIOLATION`; wholly unattributed changes fail as `AMBIENT_STATE_CHANGED`.
- The lifecycle now has a fixed two-attempt state machine. Each attempt creates, guards, snapshots, executes, and exact-root-cleans its own root. Only first-attempt ambient state reaches attempt two; no prior product result or snapshot is reused.
- The distribution E2E passes a synthetic protected-state fixture through the inherited-environment boundary, places it outside attempt roots, and proves the fixture digest is unchanged. The standalone default still snapshots the real protected locations.
- The final standalone real-host execution classified the observed state as `CLEAN` in one attempt; this is runtime evidence, not a release-approval claim.

## Documentation Impact

- SPEC: Unchanged; Task 0025 changes a development-only release verification attribution mechanism, not user-visible product behavior or acceptance requirements.
- ARCHITECTURE: Update the release-gate snapshot evidence, exact attribution boundary, three outcomes, one ambient retry, attempt ownership, privacy limits, and synthetic-test versus real-default state flow.
- README: Update contributor guidance for the three outcomes, the one ambient retry, persistent inconclusive failure, no user-state repair, and unchanged non-approval status.
- AGENTS: Unchanged; repository-wide workflow, scope, documentation routing, and completion rules remain accurate.
- Historical Tasks: 0019, 0020, and 0024 remain byte-for-byte unchanged; Task 0020 remains `BLOCKED`.

## Completed

- Recorded and passed the mandated local/remote preflight and collision checks.
- Fast-forwarded local main only, created `task/0025-release-isolation-attribution` at exact base `360859c2694bb2bd94f550edd260f2a68ece9e7f`, and preserved the Task 0024 branch.
- Read the required permanent documents, canonical templates/helper/validator, retained isolation evidence, scoped implementation, and tests.
- Created this Task/Test pair together through the canonical atomic adapter and authored the initial implementation/test contract.
- Implemented exact three-state attribution, safe attempt-local evidence, narrow deterministic markers, and the fixed one-ambient-retry state machine in the development-only runner.
- Added focused synthetic classification, safety, error, retry, root-ownership, and non-regression coverage plus deterministic synthetic protected state for distribution E2E.
- Synchronized README and Architecture; confirmed SPEC, AGENTS, historical Tasks, package metadata, workflows, and package contents do not require or contain changes.
- Passed focused, combined, full, lint, format, package, aggregate, release-CI, Task-validator, standalone real-host, and diff/scope checks recorded in `TEST.md`.
- Re-read every changed source, test, and document; reviewed the complete tracked diff and both untracked Task artifacts; confirmed the exact branch/base, empty index, authorized seven-path scope, historical immutability, and absence of residual archives or temporary roots.

## Remaining

- None. Independent review, staging, commit, push, PR, merge, publication, release, and later Tasks remain outside this implementation run.

## Resume Point

Implementation and local verification are complete at the pre-commit boundary. Begin with independent review of the seven unstaged paths; do not infer any commit, push, PR, release, publication, or Task 0026 work.

## Blockers

- None known.
