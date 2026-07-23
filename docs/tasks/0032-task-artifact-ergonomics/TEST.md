# TEST 0032 — Task Artifact Ergonomics and Blocking Questions
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
| T-01 | AC-01 — Concise standard Task | Validate a complete bounded Task with concise N/A sections. | Unit | PASS | `0101-standard-task` validated; bare `None`, comment-only content, and reasonless N/A mutations were rejected. |
| T-02 | AC-02 — Documentation-only Task | Prove no irrelevant risk/architecture prose is required. | Unit | PASS | Terminal `0102-documentation-only` validated with concise reasoned N/A entries and complete AC/test evidence. |
| T-03 | AC-03 — Real blocking decision | Assert exactly one question and one recommendation. | Behavioral | PASS | The exhausted-evidence/no-safe-choice scenario contains exactly one question and one recommendation; Skill/reference contracts matched. |
| T-04 | AC-04 — No blocking decision | Assert implementation proceeds without an invented question. | Behavioral | PASS | The selected `READY/READY` scenario contains zero questions/recommendations and advances to `IN_PROGRESS/RUNNING`. |
| T-05 | AC-05 — Appended constraints | Ensure supplied settings are not re-asked. | Behavioral | PASS | The appended error-message constraint is consumed once, has zero re-asked constraints, and produces zero questions. |
| T-06 | AC-06 — Release exception | Validate a longer evidence-heavy Task without applying a hard cap. | Regression | PASS | `0105-release-task` is longer than the standard fixture and validates under the same contract with no size profile. |
| T-07 | AC-07 — Unsupported PASS/missing mapping | Ensure concise mode does not bypass evidence rules. | Negative | PASS | Focused contract tests rejected empty sections, standalone or mixed bare `None`, reasonless N/A, zero ACs/rows, unsupported PASS, and missing mappings. |
| T-08 | AC-07 — Stable/package regression | Run Task helpers, Skills, full suite, and pack checks. | Regression | PASS | Final implementation passed 249/249 tests, lint, 253-file format validation, 29-file pack validation, and packed-release isolation. |
| T-09 | AC-01, AC-02, AC-06 — Compatibility and instruction overhead | Validate every current queued artifact without mutation and keep the representative instruction bundle below its fixed baseline while adding no artifact type/reference path. | Regression/static | PASS | All current queued artifacts validated byte-preserving; focused suite passed 42/42; bundle measured 35,862 bytes versus the 36,382-byte bound. |

## Regression Coverage

- Existing Task artifact and template contracts.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, and publication boundaries.
- Exact changed behaviors and error paths discovered during implementation.

## Commands

- Managed exact dispatch with freshly queried Task 0030, 0031, and 0039 local expectations plus GitHub exact-SHA ledgers — `SELECTED/IMPLEMENT`, `STANDARD_LIFECYCLE`, no ceremonial confirmation.
- `git fetch --prune origin` plus local/remote ref, branch, PR, and Actions inspection — clean worktree; exact delivered `origin/main` SHA `04002f1ac9995667b3052a44a7e6f41d45602fbb`.
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0032-task-artifact-ergonomics` — PASS before lifecycle transition.
- `git diff --check` — PASS before lifecycle transition.
- `node --test test/template-contracts.test.mjs test/task-dispatch.test.mjs test/kyw-task.test.mjs test/instruction-surfaces.test.mjs` — first run FAIL, 39/42: instruction bundle 38,172 bytes exceeded 36,382; settled-constraint assertion had the wrong owner breadth; completed Task 0031 was rejected for historical `- None.`.
- Same focused command after compatibility and instruction consolidation — PASS, 42/42; current queued artifacts validated without byte rewrites and the representative bundle measured 35,862 bytes.
- Same focused command after final-review mixed-bare-None hardening — PASS, 42/42.
- `npm test` — PASS, 249/249.
- `npm run lint` — PASS, 56 JavaScript modules and foundation metadata.
- `npm run format:check` — PASS, 253 UTF-8/LF files.
- `npm run pack:check` — PASS, 29 files and 78,307 bytes.
- `npm run release:ci` — PASS, including 249/249 tests, lint, format, pack, and packed-release SHA-256 `82ab13261eeb7fd6cc3a1a683b7dfa30df034e98a203f03eaeb6968708be733e`.
- Final `git diff --check`, exact changed-path inventory, acceptance-to-test mapping, introduced-branch review, and permanent-document ownership review — PASS.
- Terminal pair validation plus the focused four-file suite after the `DONE/PASSED` transition — PASS, canonical `valid: true` and 42/42; final format and `git diff --check` also passed.

## Results

- Dependency delivery and exact dispatch preflight passed.
- The clean delivered baseline pair passed canonical validation before entering `IN_PROGRESS/RUNNING`.
- Five representative current-contract pairs validate: standard, documentation-only, bug-fix, blocked, and evidence-heavy release.
- Deterministic scenarios cover exactly-one blocking question/recommendation, zero-question selected READY execution, and zero re-asking of an appended constraint.
- Negative mutations prove empty/comment-only required content, bare `None`, reasonless N/A, missing ACs/rows, unsupported PASS, and missing mappings remain invalid.
- The first focused regression exposed and preserved three failures; the corrected focused run passed 42/42 with historical compatibility and lower instruction overhead.
- Final-review hardening added mixed-content bare-None rejection and kept focused coverage at 42/42.
- Full regression and release isolation passed on the final implementation: 249/249 tests, lint, 253-file format validation, 29-file/78,307-byte package validation, and archive digest `82ab13261eeb7fd6cc3a1a683b7dfa30df034e98a203f03eaeb6968708be733e`.
- Final diff review mapped every introduced lifecycle, compatibility, validation, question, constraint, and evidence-length branch to T-01 through T-09 and found no unintended path.
- The terminal `DONE/PASSED` pair remained canonically valid, current queued artifacts validated without rewriting historical Tasks, and the terminal focused suite passed 42/42.

## Unverified

- Not applicable — no residual repository risk remains after the required checks and final coverage review.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [x] Confirm required regressions actually ran.
- [x] Confirm this pair records repository evidence only and makes no external-delivery claim.
