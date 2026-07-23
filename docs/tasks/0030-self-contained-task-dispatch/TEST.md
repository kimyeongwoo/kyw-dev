# TEST 0030 — Self-Contained Task Dispatch and Queue Progression

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
| T-01 | AC-01 — Portable and managed-repository exact invocation | Run `$kyw-task NNNN` and the anchored repository alias against one existing READY fixture; assert exact resolution, loaded context, and no external mega-prompt. | Behavioral | TODO | Not run. |
| T-02 | AC-01, AC-10 — Alias scope and non-trigger | Prove the alias works only with the managed routing contract and incidental mentions do not trigger; require the portable fallback on an unsupported surface. | Negative/behavioral | TODO | Not run. |
| T-03 | AC-02 — READY selection is confirmation | Select a READY/READY Task and prove no repeated confirmation is asked when no unresolved decision exists. | Behavioral | TODO | Not run. |
| T-04 | AC-03 — Resume active Task and status consistency | Resume one IN_PROGRESS/RUNNING fixture; reject multiple active or mismatched Task/Test states. | Behavioral | TODO | Not run. |
| T-05 | AC-03 — Hard dependency grammar | Parse literal Task IDs only; select the first satisfied READY Task and reject missing references, cycles, and unsatisfied dependencies. | Unit/behavioral | TODO | Not run. |
| T-06 | AC-04 — Continuous queue and session boundary | Complete serial fixtures one at a time with fresh preflights; prove durable resume after a simulated host/session stop. | E2E | TODO | Not run. |
| T-07 | AC-05 — Appended override precedence | Apply first-Task and explicitly global overrides; reject conflicts with acceptance, safety, evidence, or external authority. | Behavioral | TODO | Not run. |
| T-08 | AC-06 — Configured model/effort preservation | Capture observable before/after provenance and assert no automatic model or effort change. | Integration | TODO | Not run. |
| T-09 | AC-07 — Delivery ledger | Prove repository completion can precede delivery, queue advancement waits for exact PR/Actions success, and the Task artifact does not preclaim future facts. | Integration | TODO | Not run. |
| T-10 | AC-08 — Historical versus current blocker | Ignore an unrelated historical BLOCKED Task; stop on an active/frontier/hard-dependency BLOCKED Task. | Behavioral | TODO | Not run. |
| T-11 | AC-09 — All work complete | With no READY/active Task and a delivered DONE/CANCELLED frontier, return the exact no-work message; with a blocked frontier, report the blocker. | Behavioral | TODO | Not run. |
| T-12 | AC-10 — Ordinary prompt regression | Prompts mentioning “task” generically do not invoke the workflow. | Regression | TODO | Not run. |
| T-13 | AC-11 — Queued-artifact migration and historical compatibility | Validate Tasks 0031–0038 under the new contract and prove immutable historical Task bytes need no rewrite. | Static/integration | TODO | Not run. |
| T-14 | AC-12 — Stable/package/actual routing regression | Run focused tests, full suite, lint, format, pack, packed Skill checks, and representative actual routing invocations. | Regression | TODO | Not run. |

## Regression Coverage

- Existing Task artifact and template contracts, including historical Task compatibility.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, model/effort, and publication boundaries.
- Exact queue, dependency, frontier, alias, override, delivery, and failure branches introduced during implementation.

## Commands

- Not selected yet. Record exact focused and final commands during execution.
- Do not record an unexecuted method as `PASS`.
- Do not change the configured model or reasoning effort unless the current user explicitly directs it.

## Results

- Not run yet.

## Unverified

- All rows remain unverified until this Task is executed.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Cover status-pair, dependency-cycle, queue-frontier, alias-scope, override-conflict, session-stop, and delivery-ledger branches.
- [ ] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [ ] Confirm required regressions actually ran.
- [ ] Confirm future PR/merge/post-merge facts are read from exact GitHub state rather than pre-claimed in this Task commit.
