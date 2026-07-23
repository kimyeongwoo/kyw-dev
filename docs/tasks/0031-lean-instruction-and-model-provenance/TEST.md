# TEST 0031 — Lean Instruction Surfaces and Model Provenance
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
| T-01 | AC-01, AC-07 — Instruction ownership inventory | Map each rule to one canonical source and detect contradictory duplicates. | Static | TODO | Not run. |
| T-02 | AC-02 — Short invocation parity | Run exact and automatic invocation fixtures using only the short user command. | Behavioral | TODO | Not run. |
| T-03 | AC-03 — Context measurement | Measure the same representative instruction bundle before/after and record byte/token estimates. | Performance | TODO | Not run. |
| T-04 | AC-04 — Provenance rendering | Verify observable and unavailable model/effort cases serialize honestly. | Unit | TODO | Not run. |
| T-05 | AC-05 — No model mutation | Assert no code or instruction performs automatic model/effort changes. | Static/behavioral | TODO | Not run. |
| T-06 | AC-06, AC-07 — Semantic contract | Check safety, publication, evidence, and delivery invariants across all retained surfaces. | Regression | TODO | Not run. |
| T-07 | AC-06 — Stable/package regression | Run full repository and packed Skill checks. | Regression | TODO | Not run. |

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
