# TEST 0034 — Retire the Cancelled Nested Behavioral Harness

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
| T-01 | AC-01, AC-07 — Reachability map | Enumerate all imports, scripts, npm commands, tests, docs, and CI references. | Static | TODO | Not run. |
| T-02 | AC-02 — Direct fixture contracts | Run preserved S-01 through S-06 deterministic validators. | Acceptance | TODO | Not run. |
| T-03 | AC-02 — Untested-branch fixture | Prove the intentional gap remains detected. | Regression | TODO | Not run. |
| T-04 | AC-01, AC-07 — No nested behavioral launch | Assert supported SPEC behavioral paths spawn no Codex/model process. | Negative | TODO | Not run. |
| T-05 | AC-03 — Historical byte preservation | Hash Task 0026 and retained evidence references before/after. | Integrity | TODO | Not run. |
| T-06 | AC-04 — Package boundary | Prove removed/retained development files do not alter package allowlist unexpectedly. | Package | TODO | Not run. |
| T-07 | AC-06 — Runtime/size delta | Record focused/full test duration and source/test LOC before/after. | Performance | TODO | Not run. |
| T-08 | AC-05, AC-06 — Full stable/release checks | Run repository regression gates. | Regression | TODO | Not run. |

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
