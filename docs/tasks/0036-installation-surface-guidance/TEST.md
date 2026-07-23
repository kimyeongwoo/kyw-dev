# TEST 0036 — Installation Surface Guidance and Duplicate Resolution

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
| T-01 | AC-01, AC-07 — Official source check | Verify current plugin/Skill surface support and record source/date. | External read-only | TODO | Not run. |
| T-02 | AC-01, AC-02 — README matrix assertions | Check every surface, recommendation, fallback, and limitation. | Static | TODO | Not run. |
| T-03 | AC-02, AC-05 — User direct install | Install/discover/doctor/uninstall exact packed Skills in isolation. | E2E | TODO | Not run. |
| T-04 | AC-02, AC-05 — Project direct install | Prove project-only visibility and preservation. | E2E | TODO | Not run. |
| T-05 | AC-02, AC-05 — Local plugin lifecycle | Add/install/list/remove exact packed plugin in isolated Codex state. | E2E | TODO | Not run. |
| T-06 | AC-03 — Duplicate doctor | Create controlled duplicates; verify diagnosis and non-destructive guidance. | Integration | TODO | Not run. |
| T-07 | AC-04 — Task aliases by surface | Verify explicit and supported natural invocation forms. | Behavioral | TODO | Not run. |
| T-08 | AC-06 — Stable/package regression | Run focused/full/pack checks. | Regression | TODO | Not run. |

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
