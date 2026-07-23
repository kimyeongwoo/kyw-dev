# TEST 0037 — Current-Configured-Model Workflow Benchmark

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
| T-01 | AC-01 — Provenance and observability | Capture exact observable model/effort/surface/version/source/package identity and explicit unavailable fields. | Evidence | TODO | Not run. |
| T-02 | AC-02 — Portable and repository-local exact commands | Run `$kyw-task NNNN` and the managed repository alias, including unsupported-surface fallback. | Behavioral | TODO | Not run. |
| T-03 | AC-02, AC-04 — Automatic resume/next and status/dependency checks | Run active-resume, next-ready, inconsistent-pair, missing-dependency, and cycle fixtures. | Behavioral | TODO | Not run. |
| T-04 | AC-02, AC-04 — Continuous, blocker, delivery, and session stop | Run serial queue fixtures with current/historical blockers, delivery gates, and a simulated session boundary. | Behavioral | TODO | Not run. |
| T-05 | AC-03 — Appended overrides and model/effort preservation | Apply first-Task and explicitly global constraints; verify the configured model/effort is unchanged. | Behavioral | TODO | Not run. |
| T-06 | AC-09 — Completed versus blocked frontier | Return the exact no-work message only for a delivered DONE/CANCELLED frontier; report a current blocked frontier. | Behavioral | TODO | Not run. |
| T-07 | AC-05 — Core Skill scenarios | Run bounded init/task/ordinary/audit/grilling fixtures. | Acceptance | TODO | Not run. |
| T-08 | AC-06 — Observable metrics and bottlenecks | Record required minimum metrics and every additional surface-exposed metric per scenario; mark unsupported metrics explicitly. | Performance | TODO | Not run. |
| T-09 | AC-07 — Official compatibility | Recheck current primary OpenAI sources and distinguish them from executed evidence. | External read-only | TODO | Not run. |
| T-10 | AC-05 — Protected state | Prove repository, user files, auth/config, and unrelated state preservation. | Integrity | TODO | Not run. |
| T-11 | AC-08 — Terminal verdict and no repair | Validate one allowed verdict, preserve adverse evidence, and prove no product fix or new Task was created. | Static/integrity | TODO | Not run. |

## Regression Coverage

- Task 0030 dispatch/status/dependency/delivery contracts.
- Lean instruction, concise artifact, audit boundary, retired harness, tiering, and installation guidance outputs from Tasks 0031–0036.
- Existing packed Skill/package, user-work, filesystem, evidence-honesty, model/effort, and publication boundaries.
- All observed failure, metric-unavailable, and compatibility branches.

## Commands

- Freeze exact commands and scenario inputs before execution.
- Do not record an unexecuted or unavailable metric as `PASS`.
- Do not change the configured model or reasoning effort.

## Results

- Not run yet.

## Unverified

- All rows remain unverified until this Task is executed.

## Final Coverage Review

- [ ] Compare the final evidence diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Confirm scenario inputs were frozen, retries were classified, and adverse evidence was retained.
- [ ] Confirm model/effort and unavailable metrics were recorded without inference.
- [ ] Confirm user/protected state remained unchanged and no product repair occurred.
- [ ] Confirm future delivery evidence is read from exact GitHub state rather than pre-claimed.
