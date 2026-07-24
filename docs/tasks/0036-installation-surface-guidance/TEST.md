# TEST 0036 — Installation Surface Guidance and Duplicate Resolution
<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules: `../../../AGENTS.md`
- Verification policy: current-session direct and risk-proportionate by default; preserve the configured model and reasoning effort.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user supplied no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose a Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01, AC-07 — Official source check | Verify current plugin/Skill surface support and record source/date. | External read-only | PASS | 2026-07-24 fetched Codex manual; Build skills, Plugins, Build plugins, and AGENTS.md sources establish the matrix facts and limitations. |
| T-02 | AC-01, AC-02 — README matrix assertions | Check every surface, recommendation, fallback, and limitation. | Static | PASS | Acceptance-specific instruction test verifies five rows, dated official links, plugin/IDE limit, scope commands, and resolution guidance. |
| T-03 | AC-02, AC-05 — User direct install | Install/discover/doctor/uninstall exact packed Skills in isolation. | E2E | PASS | Real-tarball distribution lifecycle installed, diagnosed, updated, and uninstalled exactly four user Skills under isolated state. |
| T-04 | AC-02, AC-05 — Project direct install | Prove project-only visibility and preservation. | E2E | PASS | Same real-tarball lifecycle proved isolated project install/update/doctor/uninstall and protected-state preservation. |
| T-05 | AC-02, AC-05 — Local plugin lifecycle | Add/install/list/remove exact packed plugin in isolated Codex state. | E2E | PASS | Current Codex local marketplace add/discover/install/list/remove passed; cached files matched all four packed Skills. |
| T-06 | AC-03 — Duplicate doctor | Create controlled duplicates; verify diagnosis and non-destructive guidance. | Integration | PASS | Pre-fix fixture reproduced no finding; corrected user/project/plugin fixture reports every source/name with exit 4, rejects an unsafe cache component, and preserves metadata/content snapshots. |
| T-07 | AC-04 — Task aliases by surface | Verify explicit and supported natural invocation forms. | Behavioral | PASS | Documentation assertion plus focused Skill/dispatcher suite passed 30/30 explicit, anchored alias, fallback, and incidental-text cases. |
| T-08 | AC-06 — Stable/package regression | Run focused/full/pack checks. | Regression | PASS | Terminal `npm run check` passed 255/255 tests, lint, format, and exact 29-file/82,308-byte package selection; isolated protected-state lifecycle also passed. |

## Regression Coverage

- Existing Task artifact and template contracts.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, and publication boundaries.
- Exact changed behaviors and error paths discovered during implementation.

## Commands

- Canonical Task validators for Tasks 0035 and 0036 — PASS.
- Guarded Git status/ref/history inspection and `git ls-remote` — PASS; clean baseline, exact remote branches, and delivered `main` SHA confirmed.
- Fresh GitHub PR/review/Actions inspection for Tasks 0030 through 0035 and Task 0039 — PASS; exact-head PR CI and exact post-merge `main` CI succeeded with no review blocker.
- Managed exact dispatch with separate local expectations and fresh GitHub ledgers — `SELECTED/IMPLEMENT`, `STANDARD_LIFECYCLE`, no ceremonial confirmation.
- `git switch -c task/0036-installation-surface-guidance origin/main` — PASS; branch starts at `6ab36ac9675b13b568c7a9a6646e578f465a7ad0`.
- `node <openai-docs>/scripts/fetch-codex-manual.mjs` and targeted manual reads — PASS; current manual updated and four official source pages established 2026-07-24 surface facts.
- Pre-fix isolated temporary-home duplicate reproduction — FAIL as intended; four cached plugin Skills plus user direct Skills produced no finding while bytes remained unchanged.
- `node --test test/skill-installation.test.mjs` — PASS, 38/38 after the bounded doctor correction.
- Corrected isolated temporary-home reproduction — PASS; one plugin source, `DUPLICATE_INSTALLATION`, exit 4, and unchanged bytes.
- `node --test test/skill-installation.test.mjs test/instruction-surfaces.test.mjs` — PASS, 43/43.
- `node --test test/distribution.test.mjs` — PASS, 2/2 real-tarball direct and current Codex marketplace lifecycles.
- `node --test test/kyw-task.test.mjs test/task-dispatch.test.mjs` — PASS, 30/30 explicit/managed invocation and dispatch cases.
- `npm run lint` — PASS over 59 JavaScript modules and foundation metadata.
- `npm run format:check` — PASS over 256 UTF-8/LF files.
- Changed-path `npm run verify:plan` — PASS; classified the seven implementation/document/test paths as Stable and selected `npm run check`.
- First planner-selected `npm run check` — PASS: 253/253 tests, lint, format, and 29-file/82,308-byte package selection.
- Expanded focused documentation/runtime command — FAIL, 44/45; the CLI subprocess caused the Codex test host to create its own temporary command shims beneath the isolated `CODEX_HOME`, invalidating a whole-home metadata assertion without changing any direct, plugin, repository, or product byte.
- Corrected focused retry (`node --test test/skill-installation.test.mjs test/instruction-surfaces.test.mjs`) — PASS, 45/45 after limiting non-mutation evidence to the product-owned direct/plugin/repository roots.
- Terminal `npm run check` — PASS: 255/255 tests, lint over 59 JavaScript modules and foundation metadata, format over 256 UTF-8/LF files, and exact 29-file/82,308-byte package selection.
- Final canonical Task validation, `git diff --check`, exact nine-path inventory, and acceptance/branch/document/package review — PASS.
- Do not record an unexecuted method as `PASS`.
- Do not change the configured model or reasoning effort unless the user explicitly directs it.

## Results

- Repository/dependency preflight, pair validation, exact dispatch, and clean Task branch creation passed.
- Dated official-source review, README assertions, direct/plugin lifecycle, duplicate reporting/preservation, and alias behavior now pass.
- The reproduced runtime defect, host-snapshot assertion failure, corrected retry, and terminal Stable evidence remain recorded.
- Every acceptance criterion maps to passing evidence; final diff review found no uncovered meaningful branch, unsafe scope drift, normal-state mutation, or stale permanent document.

## Unverified

- Exact-head pull-request and post-merge `main` Actions remain mutable external delivery-ledger evidence and are not pre-claimed here.
- Interactive desktop UI was not manually opened; desktop availability and restart/new-chat guidance are supported by the dated official Codex sources, while the exact packed plugin lifecycle was exercised through the current CLI under isolated state.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [x] Confirm required regressions actually ran.
- [x] Confirm this pair records repository evidence only and makes no external-delivery claim.
