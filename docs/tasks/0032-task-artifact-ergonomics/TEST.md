# TEST 0032 — Task Artifact Ergonomics and Blocking Questions
<!-- kyw-task-contract: 2 -->

## Status

READY

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules: `../../../AGENTS.md`
- Verification policy: current-session direct and risk-proportionate by default; preserve the configured model and reasoning effort.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Concise standard Task | Validate a complete bounded Task with concise N/A sections. | Unit | TODO | Not run. |
| T-02 | AC-02 — Documentation-only Task | Prove no irrelevant risk/architecture prose is required. | Unit | TODO | Not run. |
| T-03 | AC-03 — Real blocking decision | Assert exactly one question and one recommendation. | Behavioral | TODO | Not run. |
| T-04 | AC-04 — No blocking decision | Assert implementation proceeds without an invented question. | Behavioral | TODO | Not run. |
| T-05 | AC-05 — Appended constraints | Ensure supplied settings are not re-asked. | Behavioral | TODO | Not run. |
| T-06 | AC-06 — Release exception | Validate a longer evidence-heavy Task without applying a hard cap. | Regression | TODO | Not run. |
| T-07 | AC-07 — Unsupported PASS/missing mapping | Ensure concise mode does not bypass evidence rules. | Negative | TODO | Not run. |
| T-08 | AC-07 — Stable/package regression | Run Task helpers, Skills, full suite, and pack checks. | Regression | TODO | Not run. |

## Regression Coverage

- Existing Task artifact and template contracts.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, and publication boundaries.
- Exact changed behaviors and error paths discovered during implementation.

## Commands

- Not selected yet. Record exact focused and final commands during execution.
- Do not record an unexecuted method as `PASS`.
- Do not change the configured model or reasoning effort unless the user explicitly directs it.

## Results

- Not run yet.

## Unverified

- All rows remain unverified until this Task is executed.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [ ] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [ ] Confirm required regressions actually ran.
- [ ] Confirm this pair records repository evidence only and makes no external-delivery claim.
