# TEST 0084 — Separate Implementation and STANDARD Delivery

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially explicit Skill ownership, Task states, queue selection, evidence honesty, activation-scoped guardrails, `STANDARD` delivery, compatibility, distribution, and separate authority boundaries.
- Architecture constraints: `../../ARCHITECTURE.md`, especially single-adapter dependency direction, implementation and delivery flows, external ledger, continuity causal lag, installation projections, and validation architecture.
- Repository rules and usage: `../../../AGENTS.md`, `../../../README.md`, and `../../../CODEX_PROMPTS.md`.
- Delivered dependency baseline: Task 0083.
- Regression baselines: Tasks 0039, 0053, 0054, 0058, 0059, 0060, 0061, 0062, 0070, and 0073.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — exactly six explicit-only Skills and one consistent responsibility map | Inspect and execute foundation, instruction-surface, Skill metadata, plugin prompt, managed-template, and user/maintainer command assertions for the author → implement → deliver → audit flow. | Contract / discovery | PASS | Foundation/instruction/distribution tests and package inspection expose exactly `kyw-audit`, `kyw-deliver`, `kyw-grilling`, `kyw-impl`, `kyw-init`, and `kyw-task` with aligned ownership. |
| T-02 | AC-02 — implementation ends at truthful repository completion and exact handoff | Exercise exact, next, and continuous implementation scenarios from READY and active states through `DONE/PASSED`; assert zero selected-Task Git/GitHub delivery mutation, exact `다음 단계: $kyw-deliver NNNN`, stop, and no Skill chain. | Behavior / integration | PASS | `kyw-impl`, lifecycle, and dispatcher cases prove local completion, exact handoff, zero delivery selection, and stop behavior for exact and managed routes. |
| T-03 | AC-03 — implementation routes do not auto-select pending delivery | Build queues with current and predecessor pending `STANDARD` Tasks plus reasoned `NONE` controls; assert exact deliver guidance blocks advancement, delivery is never selected by implementation aliases, and local-only terminal behavior remains compatible. | Queue / regression | PASS | Dispatcher/hydration regressions return the earliest exact predecessor handoff, keep all three aliases implementation-only, reject over-gap state, and preserve `NONE` behavior. |
| T-04 | AC-04 — delivery is an exact-only lifecycle with closed state eligibility | Parse positive and adversarial `$kyw-deliver NNNN` inputs and dispatch every supported Task/Test/delivery disposition; prove only exact terminal `STANDARD` pending state resumes and satisfied contract-3 state is immutable report-only. | Routing / state | PASS | Eight delivery contract cases plus exhaustive dispatch state tests accept only the exact four-digit terminal `STANDARD` route and preserve satisfied contract-3 pairs report-only. |
| T-05 | AC-05 — delivery sequence and exact identities remain ordered and distinct | Drive fixtures through exact-path commit, non-force push, non-draft PR, actual-head jobs, synthetic merge compatibility, review/mergeability, expected-head merge, post-main jobs, and final reporting; assert repository, workflow, run, job, attempt, checkout, head, and merge identities. | Delivery integration | PASS | Hydration/evaluator tests execute stage and identity normalization; the canonical Skill reference and static fixtures enforce external action ordering without claiming that GitHub delivery itself ran in this implementation invocation. |
| T-06 | AC-06 — interrupted delivery resumes without repeats, reruns, retries, or fallback | Cover pre-commit, committed/unpushed, pushed/no-PR, PR/head-CI pending, review or mergeability blocked, merged/post-main pending, failed later attempt, and satisfied stages; assert first-unfinished-action continuation and fail-closed diagnostics. | Resume / negative | PASS | Interrupted-stage fixtures and adversarial hydration cases preserve actual-head proof, authoritative latest attempts, delayed review, deleted-remote history, and first-unfinished fail-closed resume. |
| T-07 | AC-07 — one shared dispatcher/evaluator and predecessor-only continuity application | Inspect imports and exported identities, count dispatcher calls, inject hydration failures, prepare/apply/replay transitions, and attempt wrong-Task, wrong-branch, stale-main, self-covering, and over-gap inputs. | Core / continuity | PASS | Core graph inspection and continuity tests prove one adapter/dispatcher/evaluator, predecessor-only tokens, no selected self-coverage, idempotence, fresh locked validation, and atomic CAS. |
| T-08 | AC-08 — user work and immutable terminal pairs remain protected | Exercise unrelated tracked/untracked/staged/generated work, ambiguous scope, exact path staging, Task/Test path/type/mode/content/newline drift, and genuine same-Task redelivery; assert preservation, block, report-only, and correction routing. | Safety / compatibility | PASS | Terminal-pair and queue tests reject path/type/mode/stage/byte/history drift while exact staging rules and report-only/correction contracts preserve unrelated work and delivered pairs. |
| T-09 | AC-09 — six-Skill plugin/direct installation and two legacy generations are safe | Pack and inspect actual bytes; run user/project install, doctor, update, uninstall, collision, modified/unknown content, plugin-cache duplicate discovery, four-to-six, and five-to-six ownership transitions without lifecycle scripts. | Installation / packaging | PASS | Installation passed 48/48; current six-, previous five-, and original four-Skill metadata, 31 managed files, unknown-byte preservation, and the 46-entry package all passed. |
| T-10 | AC-10 — durable owners, templates, projections, examples, links, and budgets agree | Run deterministic owner/projection and Markdown-link validation, inspect every affected command example and copied routing fixture, measure all permanent documents before/after, and record required durable-necessity and replacement/absorption evidence. | Documentation / policy | PASS | Foundation/instruction tests and exact measurements validate every owner/projection/link; the four permanent documents shrink by 908 bytes and 20 lines combined. |
| T-11 | AC-11 — focused behavior and final diff coverage close every requested branch | Run the focused Skill, dispatcher, hydration, continuity, guardrail, fixture, installation, and package suites; compare the final diff to all acceptance criteria and add evidence for any introduced branch or compatibility effect. | Stable / coverage | PASS | Named focused and foundation suites, direct fixtures, planner, full Release gate, final diff review, and two independent read-only audits pass with failures, skips, and residual limits retained below. |
| T-12 | AC-12 — excluded schemas, engines, dependencies, routes, and external authorities remain absent | Inspect the final source/package graph, Task templates and historical pairs, package metadata, refs, command history, and changed paths for forbidden duplication, schema/version drift, background/implicit behavior, external rerun/retry, or unauthorized mutation. | Boundary audit | PASS | Task 0083 blobs and main refs are unchanged; version remains `0.1.4`, dependencies remain absent, and the diff adds no second engine/checkpoint, schema, implicit route, external mutation, or publication action. |

## Regression Coverage

- `$kyw-task` remains author-only, atomically publishes complete pairs, prints one next `$kyw-impl NNNN`, and uses state-appropriate implementation versus delivery guidance without invoking either Skill.
- `$kyw-impl` retains exact existing-Task selection, three anchored managed aliases, one-active-Task enforcement, hard dependencies, BLOCKED recheck, model provenance, live evidence, documentation routing, local verification, checkpoints, and final coverage while losing current delivery authority.
- `$kyw-audit`, `$kyw-init`, and `$kyw-grilling` retain their exact activation and mutation boundaries; all six Skills share the Task 0083 activation-scoped warning/reconfirmation lifecycle without implicit invocation or chaining.
- Contract-3, contract-2, and unmarked legacy Task readers; status pairs; dependency grammar; static delivery policy; terminal queue verdicts; immutable delivered pairs; and new hard-dependent correction routing remain deterministic.
- Existing `HARDENED_EXACT_HEAD`, legacy continuity, and durable continuity evaluator inputs retain their schema and classification meaning. Actual-head, synthetic merge, protected merge, and post-main roles remain distinct, and later attempts stay authoritative.
- One-uncovered predecessor, fixed-bounded checkpoint, opaque transition, exact aligned-main ancestry, atomic/idempotent apply, no self-coverage, no growing receipt history, and no automatic rebaseline remain fail-closed.
- Direct install/update/uninstall/doctor containment, transaction recovery, collision handling, unknown-byte preservation, plugin-cache diagnosis, legacy four-Skill metadata, and immediately previous five-Skill metadata remain safe.
- Package version `0.1.4`, zero production dependencies, no lifecycle installation, GitHub-only current ledger, publication isolation, and all separately authorized external actions remain unchanged.

## Commands

- `node --test test/kyw-impl.test.mjs test/kyw-deliver.test.mjs test/task-dispatch.test.mjs test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs`
- `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs test/skill-installation.test.mjs test/distribution.test.mjs test/verification-plan.test.mjs test/spec-behavioral-acceptance.test.mjs`
- `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures`
- `npm run verify:plan -- .codex-plugin/plugin.json AGENTS.md CODEX_PROMPTS.md README.md docs/SPEC.md docs/ARCHITECTURE.md templates/project/AGENTS.md skills/kyw-task/SKILL.md skills/kyw-task/scripts/task-artifacts.mjs skills/kyw-impl/SKILL.md skills/kyw-impl/agents/openai.yaml skills/kyw-impl/references/execution.md skills/kyw-deliver/SKILL.md skills/kyw-deliver/agents/openai.yaml skills/kyw-deliver/references/delivery.md src/core/skill-installation-shared.mjs src/core/skill-installation-inventory.mjs src/core/task-artifact-continuity.mjs src/core/task-artifact-delivery.mjs src/core/task-artifact-hydration.mjs src/core/task-artifact-queue.mjs src/core/task-artifacts.mjs scripts/lib/validate-foundation.mjs scripts/spec-behavioral-acceptance.mjs scripts/verification-plan.mjs test/kyw-impl.test.mjs test/kyw-deliver.test.mjs test/task-dispatch.test.mjs test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs test/support/kyw-invocation-lifecycle.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs test/skill-installation.test.mjs test/distribution.test.mjs test/verification-plan.test.mjs test/spec-behavioral-acceptance.test.mjs test/fixtures/kyw-task/execution-scenarios.json test/fixtures/kyw-deliver/execution-scenarios.json`
- `npm run release:ci`
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0084-separate-implementation-and-standard-delivery`
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`
- `git diff --check`

## Results

- PASS — initial pair validation returned `valid: true`; transaction inspection returned `NONE` / `NO_TRANSACTION_EVIDENCE`.
- PASS — local, upstream, cached, direct-remote, and GitHub `main` aligned at `64e4f2df72507f287ccd57b13405baafe7ec348d`; the sole exact dispatcher call used `NO_TASK_OVERRIDE`, production-evaluated Task 0083 as `HARDENED_EXACT_HEAD`, and selected Task 0084 as `IMPLEMENT` without retry or external mutation.
- PASS — the dispatcher-issued transition applied exactly once on `task/0084-separate-implementation-and-standard-delivery`; checkpoint digest `7d5767e9e21c9b09c8126cb54f1882c89d6c0a14cc099a1ea661481a50f42f7a` covers 49 predecessors through Task 0083 and does not cover selected Task 0084.
- BASELINE — exact `main` tree `c28b553e67aa427577d5ad767211ec942f6d5977` contains five Skills, package/plugin version `0.1.4`, no dependency or lifecycle-install requirement, `src/core` tree `4f8fa9d60b92e673b9ff6e22c9e81b612bbcd7ba`, adapter tree `c836e7da5313a100e5cb8b33a22166ef170315a3`, and Task 0083 pair blobs `682be9f3309ea2ca429036f6e29e35960a05df7b` / `e9db052247770942c55f4073d3b70ab5f28993fd`.
- BASELINE — permanent documents measure README 17,748 bytes / 229 lines, AGENTS 4,089 / 50, SPEC 48,305 / 467, ARCHITECTURE 44,557 / 882, and 114,699 bytes / 1,628 lines combined.
- EXPECTED FAIL — the first ten-file focused run overlapped the intentional six-Skill inventory cutover and finished 226 tests / 218 passes / four failures / four skips. One assertion still expected four duplicate plugin sources, while three installation/transaction/tarball cases failed closed with `INVALID_PACKAGE` because `kyw-deliver` had not yet landed; no passing claim is made and the full command must be rerun after the atomic source projection is complete.
- EXPECTED FAIL — the first two-Skill contract run during prose/test synchronization finished 15 tests / six passes / nine failures. It exposed an ordered-stage assertion matching an earlier summary phrase, a missing explicit no-CI-rerun projection, and stale or over-literal `kyw-impl` anchors after removal of delivery procedure; these failures remain recorded and require a green rerun after canonical procedure and assertions align.
- EXPECTED FAIL — an installation-focused rerun during concurrent projection replacement passed 47/48, including both exact legacy generations and unknown-byte preservation; only the tarball count was 45 versus 46 while the generated project AGENTS template was temporarily absent. The package assertion must be rerun against the stable complete tree.
- PASS — the stable two-Skill contract run passed 16/16; the combined Skill/instruction/planner slice passed 53/53; behavioral acceptance passed 24/24; direct fixture validation, formatting, and whitespace checks passed.
- PASS — foundation plus distribution passed 27/27 after permanent-document evidence landed; the exact changed-path planner selected `RELEASE` and `npm run release:ci` without authorizing publication.
- PASS — the full installation suite passed 48/48, including exact six-/five-/four-Skill metadata, doctor/update/uninstall, unknown-byte preservation, 31 managed direct-install files, a runnable shared adapter, and the real 46-entry tarball.
- RESOLVED ADVERSARIAL FINDINGS — read-only review found selected-current checkpoint gap inflation, managed-route first-pending ambiguity, checkpoint-covered report-only refetch, cancelled-delivery dead-end, binary in-flight hydration, stale cached apply checks, and a concurrent checkpoint overwrite race. Focused core changes closed each boundary, and the final focused, Release, and independent-review runs found no acceptance or runtime blocker.
- PASS — the final focused command completed 126 tests: 122 passed, zero failed, and four live/platform cases skipped with deterministic substitutes (`177652.7021 ms`). The final foundation/instruction/installation/distribution/planner/behavior command passed 125/125 (`207560.0105 ms`).
- PASS — fixture validation returned `valid: true`, `CURRENT_SESSION_DIRECT`, and six scenarios. The exact changed-path planner selected tier `RELEASE`, composite `npm run release:ci`, and five local leaf checks without granting hosted or publication authority.
- EXPECTED FAIL, THEN PASS — the first Release run completed 429 tests with 424 passes, one failure, and four skips; it exposed one stale `$kyw-audit` prompt index after inserting the sixth Skill. The single assertion was corrected, its focused file passed 10/10, and the complete Release command was rerun from the start.
- PASS — final `npm run release:ci` completed 429 tests with 425 passes, zero failures, and four documented skips (`185515.2799 ms`), then passed lint for 83 JavaScript modules, format for 377 files, pack for 46 files / 151,422 bytes, and retained release candidate SHA-256 `22d5ab92b905ffe30c84d6e8c350c634fe17480c327923cc72bb9dd142524c88`.
- PASS — independent review found no acceptance or runtime blocker after 117 tests / 113 passes / four documented skips, syntax and whitespace checks, and a separate 52/52 installation/distribution run. It verified route separation, bounded actual-head proof, exact predecessor composition, anchored branch identity, continuity locks/CAS, immutable pair checks, and six-/five-/four-Skill ownership.
- PASS — final scope inspection retained Task 0083 pair blobs `682be9f3309ea2ca429036f6e29e35960a05df7b` / `e9db052247770942c55f4073d3b70ab5f28993fd`; HEAD, local `main`, and `origin/main` remain `64e4f2df72507f287ccd57b13405baafe7ec348d`; package version is `0.1.4`, production dependencies are absent, and exactly six Skill directories exist.
- EXPECTED FAIL, THEN PASS — terminal pair validation rejected bare `None` and then the generic `Not applicable` form because current-contract terminal sections require exact reasoned `None — <reason>` entries. Both entries were normalized and validation returned `valid: true`.
- PASS — final pair validation returned `valid: true`; transaction inspection returned `NONE` / `NO_TRANSACTION_EVIDENCE`; `git diff --check`, the post-terminalization 377-file format check, and 31/31 terminal foundation/template regressions passed.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 17748 | 17562 | 229 | 223 | -186 | -1.05% | setup, installation, commands, usage, and contributor entry | Users need the six-Skill workflow and the explicit implementation-to-delivery handoff at the entry surface. | Existing five-Skill and combined implementation/delivery guidance was replaced and compacted, so README shrinks. |
| `AGENTS.md` | 4089 | 4083 | 50 | 41 | -6 | -0.15% | repository-wide Codex routing, boundaries, preservation, and completion rules | Managed repositories need exact implementation versus delivery routing and a local-completion boundary. | Existing five-Skill and automatic-delivery bullets absorb the sixth route while staying below the 4 KiB target. |
| `docs/SPEC.md` | 48305 | 48300 | 467 | 474 | -5 | -0.01% | observable product behavior, safety, and acceptance | Product truth must define exact delivery selection, resume/no-rerun behavior, continuity ownership, and six-Skill compatibility. | Combined implementation/delivery requirements were split and redundant wording removed, keeping SPEC below 48 KiB. |
| `docs/ARCHITECTURE.md` | 44557 | 43846 | 882 | 870 | -711 | -1.60% | components, boundaries, dependencies, flows, storage, and distribution | Stable architecture must expose the separate route over one adapter/core and the predecessor-versus-current hydration boundary. | Existing combined flow and duplicated delivery detail were replaced by compact owner, control-flow, and distribution projections. |
| `Combined` | 114699 | 113791 | 1628 | 1608 | -908 | -0.79% | four permanent documents as one governed set | The governed set must agree on six Skills and the explicit local-to-external lifecycle boundary. | Obsolete five-Skill and automatic-delivery meaning was absorbed across all owners; the combined set shrinks without a budget change. |

- PASS — all twelve intent rows are closed on the final implementation tree; exact terminal pair/transaction validation and whitespace inspection are the final bookkeeping checks performed after this evidence synchronization.

## Unverified

- Hosted exact-SHA CI and external commit/push/PR/merge/post-main actions were intentionally not run: they belong to the separately authorized `$kyw-deliver 0084` lifecycle. Their no-repeat and post-merge synchronization safeguards are Skill-procedural/static-fixture evidence, not runtime-executed GitHub mutation evidence.
- Four final-suite cases remain skipped by design: two live repository/GitHub probes and two platform-specific symlink/executable-mode probes unavailable on this Windows host; deterministic adapters and injected Windows-safe counterparts passed.
- Transition tokens are canonical and digest-bound, and apply strongly revalidates authoritative state, but token issuance provenance is procedurally guarded rather than cryptographically authenticated. Persisted coverage also uses injected rather than fully external graphs for one managed exact-topology and one post-main pending case; independent probes passed and found no runtime defect.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
