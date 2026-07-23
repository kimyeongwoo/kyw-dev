# TEST 0033 — Audit Read-Only Boundary Simplification

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
| T-01 | AC-01 — Current corpus baseline | Run and retain the full current audit command fixture corpus. | Regression | TODO | Not run. |
| T-02 | AC-01 — Allowed read-only set | Verify each required inspection command and argument shape. | Unit/integration | TODO | Not run. |
| T-03 | AC-02 — Mutator/redirect rejection | Cover direct, nested, quoted-path, and platform variants. | Negative | TODO | Not run. |
| T-04 | AC-02 — Ambiguous shell rejection | Block wrapper, encoded, dynamic, sourced, and malformed forms. | Negative | TODO | Not run. |
| T-05 | AC-03 — Historical false positives | Reproduce harmless literals/arrows/comparisons without mutation. | Regression | TODO | Not run. |
| T-06 | AC-04 — Bare audit invariants | Run a fresh fixture and prove exact byte/Git/protected-state identity. | Behavioral | TODO | Not run. |
| T-07 | AC-05 — Exact fix parity | Run bounded fix fixture and preservation checks. | Behavioral | TODO | Not run. |
| T-08 | AC-06 — Complexity delta | Record removed branches/LOC/tests and remaining rationale. | Review | TODO | Not run. |
| T-09 | AC-07 — Cross-platform/full/package | Run native and stable repository checks. | Regression | TODO | Not run. |

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
- [ ] Confirm future external delivery evidence is read from exact GitHub PR/Actions state rather than pre-claimed in this Task commit.
