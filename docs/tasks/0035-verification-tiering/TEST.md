# TEST 0035 — Verification Tiering and Maintainer Workflow Simplification

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
| T-01 | AC-01 — Command inventory | Map every stable/release command to owner, trigger, and evidence claim. | Static | TODO | Not run. |
| T-02 | AC-02 — Documentation change routing | Run only justified focused/stable checks; verify no lost contract. | Integration | TODO | Not run. |
| T-03 | AC-02 — Skill change routing | Require packed Skill and behavioral coverage without unrelated publication checks. | Integration | TODO | Not run. |
| T-04 | AC-02 — Runtime change routing | Require focused, full, cross-platform, and pack gates as appropriate. | Integration | TODO | Not run. |
| T-05 | AC-04 — Release candidate routing | Require the complete immutable candidate gate. | E2E | TODO | Not run. |
| T-06 | AC-05 — Identity deduplication | Prove same-byte checks are removed only where hashes/trees are identical. | Integrity | TODO | Not run. |
| T-07 | AC-06 — Performance comparison | Record before/after commands and wall time on fixed fixtures. | Performance | TODO | Not run. |
| T-08 | AC-03, AC-07 — CI/native fixtures | Verify all supported lanes and real link/junction evidence. | Hosted | TODO | Not run. |
| T-09 | AC-08 — Full stable/release regression | Run both final tiers once. | Regression | TODO | Not run. |

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
