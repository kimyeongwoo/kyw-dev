# TEST 0083 — Scope kyw Skill Guardrails to Active Invocations with Bounded Reconfirmation

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Corrected immutable baseline: Task 0080.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — activation is exact and inactive ordinary prompts stay outside kyw workflow gating | Drive an executable multi-turn oracle from inactive through explicit and managed activation, completion, cancellation, and a later ordinary prompt; pair it with anchored parser non-routing assertions. | Behavior / routing | PASS | Exact Skill routes and all three aliases activate; ordinary and post-terminal prompts remain inactive, and fixture negatives reject warning, selection, creation, or redirect. |
| T-02 | AC-02 — aligned active commands continue without duplicate confirmation | Feed an aligned command with matching baseline, Task, acceptance, scope, action, target, and attempt into the active state and assert continuation with no warning or extra confirmation. | Behavior / compatibility | PASS | Aligned profiles for all five Skills continue directly; Skill-native init/DRAFT write confirmations remain separate and no ceremonial implementation confirmation was added. |
| T-03 | AC-03 — every material active change warns concretely before zero mutation | Vary baseline, selected Task, acceptance, scope, and execution bounds independently; assert the warning records old and new criteria, concrete impacts, exact bounds, a pending identity, and an empty mutation trace. | Behavior / safety | PASS | Each changed field produces one fresh warning with the five impact categories and zero Task/Test, owner, implementation, dispatcher, or external mutation. |
| T-04 | AC-04 — fresh exact reconfirmation synchronizes truth before bounded action and cannot be permanently vetoed | Reconfirm the immediately preceding warning exactly, assert Task/Test and affected permanent-owner events precede implementation or external mutation, and reject any event outside the approved action, target, scope, or attempt. | State transition / ordering | PASS | Immediate and deferred paths validate the same warning, facts, inventories, and bounds; event traces order owner sync, pair sync, then only the bounded action. |
| T-05 | AC-05 — cancellation and invalid, stale, changed, or enlarged approval grant nothing | Exercise cancellation, decline, ambiguity, intervention, changed facts, changed or additional fields, old-warning reuse, malformed shapes, and nullable or sparse inventories; assert zero mutation and cleared/replaced state. | Negative / safety | PASS | Closed-schema negatives and an independent 84-case inventory matrix reject every non-exact immediate/deferred form with zero mutation. |
| T-06 | AC-06 — combined routed messages route once and cannot self-confirm a change | Use the real invocation parser and closed preflight enum with an executable clause/state oracle; assert one route, preserved override text, aligned-clause continuation, warning before a changing clause, later exact confirmation, and no redispatch or Skill chaining. | Integration / regression | PASS | Combined messages preserve unique classified clauses, `routeCount=1`, `dispatchCount=1`, nonmutating preflight, later-only confirmation, and zero Skill chains. |
| T-07 | AC-07 — canonical owners and every Skill projection agree while established security boundaries remain | Run foundation, instruction-surface, five Skill, parser, dispatcher, queue, terminal-immutability, and package assertions; inspect exact metadata, aliases, changed paths, Task 0080/WIP hashes, and owner projections. | Contract / compatibility | PASS | Structural foundation ownership, projection markers, route profiles, lifecycle graph, immutable reporting, native modes, explicit-only metadata, aliases, and Task 0080 identities all agree. |
| T-08 | AC-08 — scenario, Stable, package, pair, transaction, and final-diff gates close honestly | Run all named focused scenarios, the changed-path planner, required full checks, artifact validation, transaction inspection, permanent-document measurement, and final diff-to-matrix review while retaining failures and skips. | Stable / package / coverage | PASS | Focused 135/135, evaluator 15/15, final Release 400 pass / 4 skip, pair/transaction/diff/budget/immutability checks, and two independent final reviews passed without external mutation. |

## Regression Coverage

- All five `allow_implicit_invocation: false` policies, portable explicit forms, and the three anchored managed aliases remain exact.
- Inactive ordinary prompts neither allocate Tasks nor enter `$kyw-task` or `$kyw-impl`, while requested durable meaning may still update its owning document without becoming a Task gate.
- One-active-Task selection, hard dependencies, closed `TASK_OVERRIDE_PRESENT` or `NO_TASK_OVERRIDE` preflight, one dispatcher call, and terminal pair immutability remain fail-closed without a Task-ID exception.
- Delivered Task 0080, its canonical pair bytes and delivery identity, and `wip/0080-pre-dispatch-draft` remain unchanged comparison evidence.
- Read-only, author-only, implementation, and audit workflow identities do not silently chain; a requested project-baseline change must pass through the explicit warning and fresh reconfirmation transition.
- System and platform safety, secret protection, evidence honesty, user-work preservation, action granularity, and attempt bounds cannot be waived by broad or stale approval.
- No new production dependency, persistent approval record, background process, publication, version/tag/Release mutation, public submission, force/bypass/account change, or unrelated delivery action is introduced.

## Commands

- `node --test test/instruction-surfaces.test.mjs test/kyw-grilling.test.mjs test/kyw-init.test.mjs test/kyw-task.test.mjs test/kyw-impl.test.mjs test/kyw-audit.test.mjs test/task-dispatch.test.mjs test/foundation.test.mjs test/spec-behavioral-acceptance.test.mjs`
- `node --test test/grilling-eval.test.mjs`
- `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures`
- `npm run verify:plan -- AGENTS.md README.md docs/SPEC.md docs/ARCHITECTURE.md docs/tasks/.kyw-dev-standard-delivery-continuity.json docs/tasks/0083-scope-kyw-skill-guardrails-to-active-in-60ce0c5c/TASK.md docs/tasks/0083-scope-kyw-skill-guardrails-to-active-in-60ce0c5c/TEST.md templates/project/AGENTS.md skills/kyw-grilling/SKILL.md skills/kyw-init/SKILL.md skills/kyw-task/SKILL.md skills/kyw-impl/SKILL.md skills/kyw-impl/references/execution.md skills/kyw-audit/SKILL.md skills/kyw-audit/references/audit.md eval/grilling/benchmark.v11.json scripts/grilling-eval/core.mjs scripts/lib/validate-foundation.mjs scripts/spec-behavioral-acceptance.mjs test/grilling-eval.test.mjs test/instruction-surfaces.test.mjs test/kyw-grilling.test.mjs test/kyw-init.test.mjs test/kyw-task.test.mjs test/kyw-impl.test.mjs test/kyw-audit.test.mjs test/foundation.test.mjs test/spec-behavioral-acceptance.test.mjs test/support/kyw-invocation-lifecycle.mjs`
- `npm run release:ci`
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0083-scope-kyw-skill-guardrails-to-active-in-60ce0c5c`
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`
- `git hash-object docs/tasks/0080-honor-direct-user-authority-without-skill-syntax/TASK.md`
- `git hash-object docs/tasks/0080-honor-direct-user-authority-without-skill-syntax/TEST.md`
- `git rev-parse wip/0080-pre-dispatch-draft`
- `git diff --check`

## Results

- PASS — initial and final pair validation returned `valid: true`; transaction inspection returned `NONE` / `NO_TRANSACTION_EVIDENCE`; no competing active Task was present.
- PASS — local `main` safely fast-forwarded from `8e5d1c43c69314e941e35e6835ae36a6cb40c981` to remote-aligned `9431dbfb0ab17eb87f6b2b4d72f66072822811de`; the sole dispatcher call returned `IMPLEMENT` for Task 0083 after production-evaluating Task 0081 as the one uncovered `STANDARD` outcome.
- PASS — the one-use continuity transition applied once on `task/0083-scope-kyw-skill-guardrails`, producing checkpoint digest `3f0ee68ab369b9e7fba2b0fc6e7fa13b05454156bb2945fdade72664fc2e5a6c` with 48 covered predecessor Tasks.
- BASELINE / FINAL PASS — before implementation the nine-file focused command passed 125/125; after all schema, lifecycle, projection, and context-loading corrections it passed 135/135 with zero failures.
- EXPECTED FAIL → PASS — the first lifecycle projection run passed 17/18 and failed only on the missing SPEC marker. Intermediate foundation runs exposed stale owner anchors, and focused runs twice reached 134/135 on intentionally outdated wording assertions; canonical owners and assertions were synchronized and reran green.
- EXPECTED FAIL → PASS — the first full `npm test` after changing `kyw-grilling` recorded 398 passes and two stale-hash failures. Immutable `benchmark.v10.json` stayed byte-stable; new v11 and the default selector resolved the expected Skill-byte change.
- EXPECTED FAIL → PASS — one representative-bundle run passed 15/16 at 32,772 bytes, four bytes above the 32,768-byte target. Procedure wording was compacted to 32,751 bytes without removing behavior; the unchanged 36,864-byte hard budget retains 4,113 bytes of headroom.
- EXPECTED FAIL → PASS — focused hardening runs progressed through 81/85 and 84/85 on stale execution anchors, plus isolated 15/16 instruction and 47/48 foundation failures for Task-impact, managed-alias, and delta-evidence mismatches. The final exact projections and evidence all pass.
- CORRECTED DIAGNOSTICS — an initial adapter validation call used invalid arguments, a first Task 0080 hash used the wrong path, and an attempted `skills/kyw-grilling/scripts/validate-fixture.mjs` command failed with `MODULE_NOT_FOUND`; each was corrected to the documented `validate`, canonical 0080 path, and `scripts/spec-behavioral-acceptance.mjs --validate-fixtures` forms. A later `task-artifacts.mjs --help` diagnostic also returned its documented invalid-argument usage because that adapter has no help mode.
- EXPECTED ADVERSARIAL FAILURES → PASS — transient lifecycle reruns exposed incomplete Task-directory binding, permissive/null/sparse synchronization inventories, delivery-versus-immutability conflation, terminal `REPORT` action drift, and deferred approval inventory substitution. Closed shapes, exact raw inventory checks at approval and execution, route locks, and stage dispositions now reject all such inputs with zero mutation.
- INTERRUPTED → PASS — the first final `npm run release:ci` was deliberately interrupted after review found two stale ARCHITECTURE statements that always loaded Task/Test context; its test summary was 317 tests / 312 passes / two cancellations / three skips / zero assertion failures, and no candidate ran. A-03 and flow 5.6 were corrected and regression-tested before the complete final run.
- PASS — `node --test test/grilling-eval.test.mjs` passed 15/15; direct fixture validation returned `{"valid":true,"method":"CURRENT_SESSION_DIRECT","scenarioCount":6}`.
- PASS — the final 29-path planner selected `RELEASE` with only `npm run release:ci`, correctly ignored the two Task evidence paths for risk classification, and reported hosted PR and main exact-SHA CI as the remaining external delivery evidence.
- PASS — final `npm run release:ci` completed the entire graph: 404 tests / 400 passes / four explicit platform or live skips / zero failures or cancellations, lint for 82 JavaScript modules and foundation metadata, format for 370 UTF-8/LF files, package selection for 43 files / 136,863 bytes, and an inspected candidate with the same inventory/size and SHA-256 `ddecdd4b5754bf81538cc6c9372012aedca8fa8dab6f6953ee3b407df25764969`.
- PASS — after setting `DONE/PASSED`, foundation, authoring, and dispatcher regressions passed 60/60; the terminal pair remained valid and the transaction state remained `NONE` / `NO_TRANSACTION_EVIDENCE`.
- PASS — two independent read-only reviews found no remaining lifecycle or final-diff issue after the reported deferred-approval and architecture-loading gaps were corrected; the separate 84-case inventory matrix accepted only exact immediate/deferred inventories.
- PASS — delivered Task 0080 blobs remain `56dd16285dd5333cb58a5426877dad36be3337d5` and `9d0ff00939cc85d9a37bc9d7f442872a9b5391c4`; `wip/0080-pre-dispatch-draft` remains `ab03a813784c994a9f1c4369f0f1b1573b981c3b`; final scope review found no Task 0080 diff, production dependency, publication, version/tag/Release, push, PR, merge, or other external mutation.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 17901 | 17748 | 228 | 229 | -153 | -0.85% | setup, commands, usage, and contributor entry | Users need the activation, inactive-prompt, warning, and bounded-reconfirmation behavior at the entry surface. | Existing explicit-Skill and routing guidance replaces the global direct-authority wording while the document shrinks. |
| `AGENTS.md` | 3921 | 4089 | 47 | 50 | +168 | 4.28% | repository-wide Codex routing, authority, preservation, and completion rules | Managed repositories need the active-invocation-only guardrail projection and explicit inactive behavior. | Existing truth-loading and scope bullets absorb the five-state projection in place of the global authority model. |
| `docs/SPEC.md` | 48026 | 48305 | 468 | 467 | +279 | 0.58% | observable product behavior and acceptance | Product truth must define all five states, warning identity, synchronization order, and bounded reconfirmation. | Section 6.3 replaces the global direct-authority contract and surrounding requirements were compacted rather than duplicated. |
| `docs/ARCHITECTURE.md` | 43217 | 44557 | 853 | 882 | +1340 | 3.10% | components, boundaries, dependencies, flows, and distribution | Stable architecture must own the invocation lifecycle, state transitions, synchronization boundary, and ordered flow. | Existing authority, owner-family, context-loading, and control-flow sections absorb the model without adding runtime classifier or storage components. |
| `Combined` | 113065 | 114699 | 1596 | 1628 | +1634 | 1.45% | four permanent documents as one governed set | The governed set must expose one consistent activation-scoped lifecycle across product, architecture, setup, and agent rules. | Obsolete direct-authority meaning is replaced across all four owners and the combined set remains below its warning budget. |

## Unverified

- No repository acceptance criterion remains unverified.
- `STANDARD` PR-head, synthetic-merge, protected-merge, and post-merge `main` exact-SHA evidence remains the external GitHub delivery gate. It was intentionally not attempted or claimed because push, PR, merge, and external actions are outside Task 0083's implementation scope.

## Final Coverage Review

- [x] Compare the final diff to the matrix and exact Task scope.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failure paths, malformed inputs, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible and retains earlier failures.
- [x] Confirm focused, evaluator, Stable, package, pair, transaction, immutability, budget, and final-diff regressions ran.
