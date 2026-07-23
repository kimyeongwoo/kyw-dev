# TEST 0030 — Self-Contained Task Dispatch and Queue Progression

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules: `../../../AGENTS.md`
- Verification policy: current-session direct and risk-proportionate by default; preserve the configured model and reasoning effort.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Portable and managed-repository exact invocation | Run `$kyw-task NNNN` and the anchored repository alias against one existing READY fixture; assert exact resolution, loaded context, and no external mega-prompt. | Behavioral | PASS | READY fixture and current-repository commands selected exactly one Task; the live `$kyw-task 0030` run loaded the required Task/Test/permanent and Git/GitHub context without a mega-prompt. |
| T-02 | AC-01, AC-10 — Alias scope and non-trigger | Prove the alias works only with the managed routing contract and incidental mentions do not trigger; require the portable fallback on an unsupported surface. | Negative/behavioral | PASS | Anchored positive/near-miss tables, unsupported-surface fallbacks with preserved overrides, and an actual ordinary-prose command all returned the expected structured result. |
| T-03 | AC-02 — READY selection is confirmation | Select a READY/READY Task and prove no repeated confirmation is asked when no unresolved decision exists. | Behavioral | PASS | `exact READY selection is confirmation...` returned `confirmation: true`; Skill/static checks forbid a ceremonial second confirmation. |
| T-04 | AC-03 — Resume active Task and status consistency | Resume one IN_PROGRESS/RUNNING fixture; reject multiple active or mismatched Task/Test states. | Behavioral | PASS | Active and actual current Task runs returned `action: RESUME`; multiple active, duplicate section, malformed marker, and invalid pair fixtures failed closed. |
| T-05 | AC-03 — Hard dependency grammar | Parse literal Task IDs only; select the first satisfied READY Task and reject missing references, cycles, and unsatisfied dependencies. | Unit/behavioral | PASS | Focused fixtures covered literal singular edges, ignored plural prose, lowest eligible selection, missing edges, cycles, active/terminal blockers, and exact header/path identity. |
| T-06 | AC-04 — Continuous queue and session boundary | Complete serial fixtures one at a time with fresh preflights; prove durable resume after a simulated host/session stop. | E2E | PASS | Repeated resolver calls re-read durable state, reselected the first Task after a simulated stop, blocked on pending prior delivery, then selected the second Task only after fresh bound evidence. |
| T-07 | AC-05 — Appended override precedence | Preserve first-Task and explicitly global override intent; reject conflicts with acceptance, safety, evidence, or external authority in the semantic contract. | Unit/static | PASS | Parser tests preserve appended text and fallback text with default first-Task scope; Skill/reference assertions require explicit global scope and reject protected-contract conflicts. |
| T-08 | AC-06 — Configured model/effort preservation | Capture observable before/after provenance and assert no automatic model or effort change. | Static/session evidence | PASS | Resolver contains no model-setting path; Skill/static tests prohibit substitution. Exact model/effort/version were not exposed by this surface, were recorded `UNAVAILABLE`, and were not changed. |
| T-09 | AC-07 — Delivery ledger | Prove repository completion can precede delivery, queue advancement waits for local-expectation-bound exact PR/Actions success, and the Task artifact does not preclaim future facts. | Integration | PASS | Unit tables reject wrong repo/base/outcome/PR/merge/run/review/check state; resolver blocks missing/stale evidence and prior transitions; adapter accepts valid inline and existing-file expectation/ledger inputs. |
| T-10 | AC-08 — Historical versus current blocker | Ignore an unrelated historical BLOCKED Task; stop on an active/frontier/hard-dependency BLOCKED Task. | Behavioral | PASS | Separate fixtures selected past unrelated legacy blockers and reported exact active, current-frontier, and hard-dependency blockers. |
| T-11 | AC-09 — All work complete | With no READY/active Task and a delivered `DONE/PASSED` or `CANCELLED/BLOCKED` frontier, return the exact no-work message; with a blocked frontier, report the blocker. | Behavioral | PASS | DONE and CANCELLED fixtures returned the exact Korean message only after bound delivery; blocked/dependency/prior-undelivered cases stopped, and before/after inventory proved no Task creation. |
| T-12 | AC-10 — Ordinary prompt regression | Prompts mentioning “task” generically do not invoke the workflow. | Regression | PASS | Anchoring table rejected prefixed, punctuated, wrong-ID, and incidental forms; actual prose returned `NOT_TASK_INVOCATION/NO_ANCHORED_TASK_COMMAND`. |
| T-13 | AC-11 — Queued-artifact migration and historical compatibility | Validate Tasks 0031–0038 under the new contract and prove immutable historical Task bytes need no rewrite. | Static/integration | PASS | All current pairs validate with paired markers/static Delivery and repository-only handoff checks; `git diff --name-only origin/main -- docs/tasks` showed no Task 0001–0029 path. |
| T-14 | AC-12 — Stable/package/actual routing regression | Run focused tests, full suite, lint, format, pack, packed Skill checks, and representative actual routing invocations. | Regression | PASS | Focused 72/72, full 236/236, lint, format, pack, `release:ci`, direct-install/tarball adapter checks, and portable/managed/ordinary actual commands passed. |

## Regression Coverage

- Existing Task artifact and template contracts, including historical Task compatibility.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, model/effort, and publication boundaries.
- Exact queue, dependency, frontier, alias, override, delivery, and failure branches introduced during implementation.

## Commands

- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory ./docs/tasks/0030-self-contained-task-dispatch` — pre-execution validation passed.
- All 38 existing Task directories were validated with the packaged adapter before mutation; 38 passed and zero failed.
- `node --test ./test/kyw-task.test.mjs ./test/template-contracts.test.mjs ./test/task-artifacts.test.mjs` — focused baseline passed 23/23.
- `node --test test/template-contracts.test.mjs test/task-artifacts.test.mjs test/task-dispatch.test.mjs test/kyw-task.test.mjs` — first implementation run failed 2/34 on stale architecture/comment expectations; retry failed 1/34 on one remaining renamed phrase; corrected retry passed 34/34.
- The same focused command after independent-review hardening passed 37/37; an independent read-only reviewer separately reran it at 37/37 and found no remaining blocker.
- `npm run lint` — first post-change run failed only because foundation checks still required old `resume(task-id)`/absolute other-Task wording; after aligning those checks to `exact(task-id)` and the scoped migration exception, lint passed.
- `node --test test/template-contracts.test.mjs test/task-artifacts.test.mjs test/task-dispatch.test.mjs test/kyw-task.test.mjs test/skill-installation.test.mjs` — first expanded run failed 1/72 because the direct-install test expected DRAFT to be unselectable; corrected to the required `SELECTED/AUTHOR` behavior, then passed 72/72.
- `npm test` — passed 236/236.
- `npm run lint` — passed 55 JavaScript modules plus foundation metadata.
- `npm run format:check` — passed 239 UTF-8/LF text files.
- `npm run pack:check` — passed 29 files, 75,433 bytes.
- `npm run release:ci` — passed full 236/236, lint, format, pack, and packed release verification; packed SHA-256 `0e06e67062c38b2dfe884a018b759f2ff2cdaa5af8b87870c98f8fcfed29aa79`.
- Actual adapter invocations: portable `$kyw-task 0030`, managed exact `task 0030 실행해줘`, and automatic `task 진행해줘` each selected only active Task 0030; ordinary prose returned `NOT_TASK_INVOCATION`.
- Final terminal-pair rerun passed focused 37/37, lint, format, and `git diff --check`; final automatic dispatch then stopped before Task 0031 with `NO_DEPENDENCY_SATISFIED_TASK` because Task 0030 has no trusted local/GitHub delivery inputs.
- `git diff --check`, final status/name/stat inspection, and legacy Task-path filter passed; only scoped Task 0030 implementation/permanent docs and the explicitly authorized 0031–0038 contract migration changed.

## Results

- Repository/GitHub preflight, focused and expanded suites, full stable suite, direct/packed installation, lint, format, pack, packed release, actual routing, all-pair validation, and final diff coverage passed.
- Independent read-only review found and verified fixes for delivery/transition, dependency, marker/section, path/header, terminal-handoff, adapter-schema, authority, and documentation conflicts; its final result reported no remaining concrete blocker.

## Unverified

- Exact configured model identifier, reasoning-effort value, and Codex version were not exposed by the current surface; they remain `UNAVAILABLE`, were not guessed, and no setting was changed.
- Mutable PR, merge, and hosted Actions state for this repository outcome was not created or claimed. `STANDARD` delivery remains an external gate requiring separately scoped authority and fresh local/GitHub evidence.
- Publication was neither authorized nor attempted.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Cover status-pair, dependency-cycle, queue-frontier, alias-scope, override-conflict, session-stop, and delivery-ledger branches.
- [x] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [x] Confirm required regressions actually ran.
- [x] Confirm this pair records repository evidence only and leaves mutable PR/merge/post-merge state to the exact GitHub ledger.
