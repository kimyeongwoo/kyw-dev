# TEST 0033 — Audit Read-Only Boundary Simplification
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

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose an exact model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user supplied no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose a version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Current corpus baseline | Run and retain the full current audit command fixture corpus. | Regression | PASS | Pre-change focused audit suite passed 27/27 before classifier deletion. |
| T-02 | AC-01 — Allowed read-only set | Verify each required inspection command and argument shape. | Unit/integration | PASS | PowerShell/POSIX literal reads, `rg`, guarded Git forms, and both Task-validator paths pass the strict boundary table. |
| T-03 | AC-02 — Mutator/redirect rejection | Cover direct, nested, quoted-path, and platform variants. | Negative | PASS | Direct mutators, unsafe Git/npm/node shapes, all redirects including `2>&1`, wrappers, operators, and unsafe paths reject with exact kind/offset/context. |
| T-04 | AC-02 — Ambiguous shell rejection | Block wrapper, encoded, dynamic, sourced, and malformed forms. | Negative | PASS | Wrapper/encoded payloads, variables, splatting, multi-command/newline, double/malformed quoting, here-documents, unlisted options, and glob paths fail closed without payload exposure. |
| T-05 | AC-03 — Historical false positives | Reproduce harmless literals/arrows/comparisons without mutation. | Regression | PASS | Four historical data families pass as opaque single-quoted `rg` patterns on both shell dialects; executable script/here-document forms remain rejected. |
| T-06 | AC-04 — Bare audit invariants | Run a fresh fixture and prove exact byte/Git/protected-state identity. | Behavioral | PASS | Native Windows literal read plus guarded Git inspection left repository tree SHA, Git status, and separate protected-state tree SHA identical. |
| T-07 | AC-05 — Exact fix parity | Run bounded fix fixture and preservation checks. | Behavioral | PASS | Event tests keep the strict baseline before `Bounded repair plan:`; evaluator lifecycle 10/10 and full fix-path/preservation/rerun regressions pass. |
| T-08 | AC-06 — Complexity delta | Record removed branches/LOC/tests and remaining rationale. | Review | PASS | Legacy recursive classifier 954 lines/25 functions → strict boundary 619/19; audit tests 1,012 → 552 lines; removed/retained branches are enumerated in TASK. |
| T-09 | AC-07 — Cross-platform/full/package | Run native and stable repository checks. | Regression | PASS | Both shell dialects are table-tested, native Windows invariance passed, and final local suite passed 243/243, lint, format, package, and packed-release isolation. |

## Regression Coverage

- Existing Task artifact and template contracts.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, and publication boundaries.
- Exact changed behaviors and error paths discovered during implementation.

## Commands

- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0033-audit-readonly-boundary-simplification` — PASS before lifecycle transition.
- `git diff --check` — PASS before lifecycle transition.
- Managed exact dispatch with fresh local expectations and GitHub exact-SHA ledgers for Tasks 0030, 0031, 0032, and 0039 — `SELECTED/IMPLEMENT`, `STANDARD_LIFECYCLE`, no ceremonial confirmation.
- `node --test test/audit-smoke.test.mjs test/kyw-audit.test.mjs` on exact pre-change implementation — PASS, 27/27.
- Same focused command after strict-boundary implementation — FAIL, 19/21; two assertions retained stale hard-coded offsets.
- Same focused command after offset correction and documentation synchronization — FAIL, 20/21; one reference wording assertion remained stale.
- Same focused command after assertion correction and final hardening — PASS, 21/21.
- `node --test test/audit-smoke.test.mjs test/kyw-audit.test.mjs test/instruction-surfaces.test.mjs` — PASS, 25/25.
- `npm run lint`, `npm run format:check`, and `git diff --check` during implementation — PASS.
- Initial `npm test` — FAIL, 241/243; two evaluator-cleanup tests exposed the stale fake-Codex `read <absolute-path>` source-read command.
- `node --test test/evaluator-cleanup.test.mjs` after fixture alignment — PASS, 10/10.
- `npm run check` — PASS: 243/243 tests, lint, 254-file format validation, and 29-file/79,011-byte package validation.
- `npm run release:ci` — PASS: repeated stable checks plus packed-release SHA-256 `660abd02a7c924739e40e6b84cdaea600e7e21ba4515c4e8d7b4d742d16298d2`.
- Exact `origin/main`/worktree complexity command — legacy classifier 954 lines/25 functions, strict boundary 619/19, audit tests 1,012 → 552 lines.
- Final `git status`, changed-path inventory, stale-parser search, `git diff --check`, acceptance mapping, and permanent-document ownership review — PASS.
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0033-audit-readonly-boundary-simplification` after terminalization — PASS (`valid: true`); the accompanying `git diff --check` also passed.

## Results

- Repository and dependency delivery preflight passed, and the clean delivered baseline pair validated before execution.
- The legacy deterministic corpus passed before deletion; the strict boundary covers every accepted workload, negative family, historical data case, diagnostic, plan edge, and native invariance claim.
- Focused regressions retain both stale-expectation failure rounds. The first full run retains the fake-Codex fixture failure; the corrected evaluator lifecycle and final stable suite pass.
- The new boundary removes recursive whole-shell interpretation while retaining exact fail-closed diagnostics, OS sandboxing, tree/Git/auth/protected-state invariants, and exact-`--fix` plan/scope/preservation/rerun checks.
- Final implementation passed 243/243 tests, lint, 254-file format validation, 29-file/79,011-byte package validation, and packed-release isolation with digest `660abd02a7c924739e40e6b84cdaea600e7e21ba4515c4e8d7b4d742d16298d2`.
- Final diff review mapped all accepted commands, rejected forms, data handling, diagnostic privacy, repair transition, fixture alignment, documentation changes, and package effects to T-01 through T-09.

## Unverified

- Model-backed audit smoke was not run because this invocation supplied no explicit model, reasoning effort, authentication source, or model-cost gate. It is not required evidence for this deterministic boundary Task; model choice remains fail-closed behind the same outer sandbox and event boundary.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [x] Confirm required regressions actually ran.
- [x] Confirm this pair records repository evidence only and makes no external-delivery claim.
