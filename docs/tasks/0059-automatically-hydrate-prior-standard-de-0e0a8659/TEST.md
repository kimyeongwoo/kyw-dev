# TEST 0059 — Automatically Hydrate Prior STANDARD Delivery Evidence

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially `$kyw-impl`, queue selection, evidence honesty, `STANDARD` delivery, compatibility, safety, distribution, and permanent-document growth.
- Architecture constraints: `../../ARCHITECTURE.md`, especially the single Task/runtime/delivery engine, existing-Task flow, external GitHub ledger, exact-SHA roles, mutation boundary, packaging, and bounded/no-background constraints.
- Repository rules: `../../../AGENTS.md`.
- Canonical implementation procedure: `../../../skills/kyw-impl/SKILL.md` and `../../../skills/kyw-impl/references/execution.md`.
- Runtime owners: `../../../skills/kyw-task/scripts/task-artifacts.mjs`, `../../../src/core/task-artifacts.mjs`, `../../../src/core/task-artifact-queue.mjs`, and `../../../src/core/task-artifact-delivery.mjs`.
- Existing focused regressions: `../../../test/task-dispatch.test.mjs`, `../../../test/kyw-impl.test.mjs`, `../../../test/instruction-surfaces.test.mjs`, `../../../test/completed-outcome-retention.test.mjs`, `../../../test/distribution.test.mjs`, and `../../../test/skill-installation.test.mjs`.
- Historical exact-SHA fixtures: Tasks 0054–0058 and fresh GitHub PRs #41–#45; historical Task/Test files remain read-only.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01, AC-02 — one-line clean dispatch and fresh-session recovery | Create an isolated clean queue with satisfied prior delivery and one READY Task; invoke only `$kyw-impl NNNN` through the normal installed Skill/adapter path, assert hydration precedes one `SELECTED/IMPLEMENT` dispatch, then repeat in a new process/session using only repository and fresh external fixtures. Assert no manual JSON, run/job IDs, synthetic SHA, anchor, or prior conversation is supplied. | Behavioral/integration | PASS | Source, direct-install, and packed new-process adapter tests plus two fresh live hydration runs passed with only the one-line invocation. |
| T-02 | AC-02, AC-13 — no-prior and exact required-set discovery | Exercise a queue with no prior `STANDARD` outcome and queues with unrelated historical blockers, `NONE` delivery, non-required completed Tasks, and hard dependencies. Assert hydration requests every and only prior `STANDARD` outcome needed for the exact transition and cannot omit one eligible Task. | Unit/integration | PASS | Pure discovery tests passed for no-prior, dependency, blocker, `NONE`, and old-exact/global-anchor cases; live required IDs were exactly 28. |
| T-03 | AC-03, AC-13 — legacy-only ancestry classification | Build real temporary Git graphs with outcomes before, at, after, and off the hardened anchor; require `LEGACY_PRE_CONTRACT` only for exact ancestor-proven eligible outcomes with bound outcome/merge/anchor identities. Mutate Task numbers and timestamps to prove they do not affect classification. | Git integration/compatibility | PASS | Number-independent mixed and legacy-only classification tests passed; live local Git proof bound 23 outcomes to anchor `4463051d…8f80`. |
| T-04 | AC-03, AC-04, AC-13 — hardened-only and mixed histories | Exercise hardened-only and mixed legacy+hardened queues, including fixture projections of Tasks 0054–0058. Assert Tasks at or after the hardened contract remain `HARDENED_EXACT_HEAD`, every required outcome reaches the existing evaluator, and queue selection occurs only after all are `SATISFIED`. | Integration/regression | PASS | Hardened-only/mixed tests and final live Tasks 0054–0058 evaluator assertions passed. |
| T-05 | AC-04 — complete hardened exact-head graph | Hydrate one accepted PR graph and assert exact repository/workflow ID-name-path/base/PR/head, one run attempt, complete Behavioral/Quality/Packed checkout jobs, Required gate, distinct synthetic job/SHA/two ordered parents, expected-head merge, and distinct post-main run/attempt/jobs/gate reach `SATISFIED`. | Unit/integration | PASS | Complete normalized schema-2 graph reached `SATISFIED/HARDENED_EXACT_HEAD`; live graphs passed the same evaluator. |
| T-06 | AC-05, AC-13 — failed chronology and accepted-attempt isolation | Model PR #41's failed earlier-head run followed by its accepted final-head run and Task 0055's main run attempt 1 failure followed by attempt 2 success. Assert failed chronology remains observable, only one accepted attempt supplies its own jobs, and mixing any attempt-1 job into attempt 2 is rejected. | Integration/failure chronology | PASS | Cross-attempt mutation failed closed; both live passes retained Task 0055 attempt 1 failure separately from accepted attempt 2. |
| T-07 | AC-05, AC-06 — role and identity mutation rejection | Mutate repository, workflow ID/name/path, event, base ref/SHA, PR number/head, run ID/attempt/head, job ID/name/key, expected/actual checkout SHA, Required gate, role reuse, Task mapping, and post-main branch/SHA. Require non-satisfaction with the exact Task and role in the blocker. | Mutation/unit | PASS | Hardened mutation table rejected every listed identity/role/job/checkout/review/merge mutation with Task 0058 and role diagnostics. |
| T-08 | AC-04, AC-06 — synthetic parent and checkout failures | Test stale head, missing checkout evidence, missing Required or checkout job, shallow/missing parent, one/three parents, reversed parents, extra parent, wrong base/head parent, synthetic-only success, and merge SHA whose ordered parents do not bind expected base/head. | Mutation/Git/GitHub adapter | PASS | Missing log/job/gate and zero/one/reversed/extra/wrong-parent fixtures all failed closed; live synthetic commits had exact ordered parents. |
| T-09 | AC-06, AC-07 — GitHub unavailable and malformed/partial responses | Inject unavailable CLI/API, auth denial, permission denial, rate limit, timeout, bounded retry exhaustion, truncated pagination, missing logs, invalid JSON/schema, partial run/job pages, and malformed ledger normalization. Assert fail-closed pre-selection blockers and never `SATISFIED`. | Failure/integration | PASS | Sanitized external failure classes, malformed JSON/log, and partial pagination tests passed with zero retry and no satisfaction. |
| T-10 | AC-08 — behavioral acceptance and blocked lifecycle separation | Supply successful CI for a non-accepted or `BLOCKED/BLOCKED` Task and a delivered dependency whose repository acceptance is incomplete. Assert hydration/evaluator cannot promote repository lifecycle, Test evidence, behavioral acceptance, or a blocked outcome. | Queue/behavioral regression | PASS | Existing queue/evaluator and full Stable regressions preserved repository lifecycle gates and blocked evidence semantics. |
| T-11 | AC-09 — ordering, zero residue, and single dispatcher invocation | Instrument the collector, evaluator, dispatcher, filesystem, Git refs, and transaction owner. On every hydration failure assert dispatcher count 0 and byte-identical branch, lifecycle pair, Task root, lock/staging/manifest, staged/unstaged/untracked sets; on success assert hydration/evaluation complete first and dispatcher count exactly 1. | Integration/mutation safety | PASS | Instrumented adapter observed hydrate→dispatch once on success and zero dispatch on failure; transaction/residue and exact-path audits stayed clean. |
| T-12 | AC-10 — normal instruction surface hides manual payloads | Inspect `kyw-impl`, README, prompts, plugin metadata, and installed Skill bytes. Require the one-line invocation and automatic hydration, reject normal-user ledger/expectation/run/job/anchor construction guidance, and, if manual flags remain, prove they are confined to low-level compatibility/test documentation. | Static/instruction/distribution | PASS | Instruction tests passed at 36,853 bytes; normal command has no delivery flags, while the adapter-only manual seam remains deterministic. |
| T-13 | AC-11 — current/legacy and queue/Skill regressions | Run current/legacy readers, status/dependency grammar, one-active, exact/next/continuous selection, completed-outcome retention, existing evaluator classifications, ordinary `STANDARD` authority, five explicit-only Skill boundaries, and author/implementation separation tests. | Unit/integration/compatibility | PASS | Full 365-test suite passed all current/legacy, queue, evaluator, Skill, and retention regressions (one opt-in live test skipped). |
| T-14 | AC-12 — bounded queries, invocation cache, and secret hygiene | Use counting fakes for repository, PR, run, attempt, job, log, and commit reads; assert exact configured bounds, no unnecessary duplicate reads, no full-history scan, no retry loop/background/persistent state, and redaction/non-storage of token, auth source, headers, and raw credentials in diagnostics or Task evidence. | Unit/performance/security | PASS | Counting cache deduplicated exact reads; bounds/redaction/failure tests and live runs passed with zero retry and no persistent state. |
| T-15 | AC-14 — source, direct, and packed/plugin parity | Run the adapter from source, an isolated direct project/user installation, and the actual packed plugin/runtime in a fresh fixture. Require the same hydration behavior and errors, one engine, version 0.1.0, zero dependencies, no lifecycle hook, and no repository snapshot file. | Distribution/integration/packaging | PASS | Source/direct/packed new-process adapters selected from one-line input; 42-file candidate and isolated marketplace lifecycle passed at version 0.1.0. |
| T-16 | AC-15 — permanent-owner projection and growth policy | Measure UTF-8 bytes/lines before and after for all four permanent documents and combined; validate canonical owner/projection rules, durable necessity and replacement/absorption evidence for any growth threshold, budgets, chronology separation, and absence of manual payload grammar in permanent truth. | Static/document contract | PASS | Exact delta table below passed foundation growth/owner validation; AGENTS stayed byte-identical and existing sections absorbed all projections. |
| T-17 | AC-01–AC-15 — planner, final diff, pair, graph, package, and publication audit | Run the exact changed-path planner and every selected non-publishing command; validate the pair, inspect complete diff/graph and exact paths, map every branch to this matrix, verify historical pair byte stability, dependency/package/plugin/version/tag/Release/publication boundaries, transaction/residue absence, and `git diff --check`. | Contract/stable/release audit | PASS | RELEASE planner selected `npm run release:ci`, which passed; pair, 17-path scope, Task 0058 bytes, package/version/dependency/publication, transaction, and scratch audits passed. |

## Regression Coverage

- No-prior, legacy-only, hardened-only, mixed, and continuous Tasks 0054–0058 delivery histories.
- PR #41 failed earlier head versus accepted final head, Task 0055 main attempt 1 versus attempt 2, and strict non-mixing of attempts/jobs.
- Actual PR head, distinct synthetic compatibility, expected-head merge, exact post-main checkout, Required gates, ordered parents, and distinct numeric identities.
- Wrong repository/workflow/event/path/run/attempt/job/SHA, missing or partial API/log data, stale or reused evidence, and malformed compatibility inputs.
- Current/legacy readers, one-active Task, dependency and lifecycle grammar, exact/next/continuous routing, deterministic dispatcher, existing evaluator, ordinary `STANDARD`, and five-Skill boundaries.
- One-line normal UX, fresh-session recovery, hidden low-level manual compatibility, zero mutation on hydration failure, and one dispatcher call on success.
- Source, direct user/project, packed plugin/marketplace runtime parity, package selection, version 0.1.0, zero dependencies, and no lifecycle installation.
- Permanent-document ownership/growth, secret hygiene, bounded cache/query behavior, publication separation, and historical Task/Test byte stability.

## Commands

- `node --test test/task-delivery-hydration.test.mjs` — initial exit 1 before implementation; final deterministic exit 0 with 15 PASS and one live skip.
- `$env:KYW_LIVE_GITHUB_HYDRATION='1'; node --test --test-name-pattern='live repository and GitHub hydration' test/task-delivery-hydration.test.mjs` — intermediate exits 1 preserved above; final exit 0 in 342.8 seconds.
- `node --test test/task-delivery-hydration.test.mjs test/task-dispatch.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs test/completed-outcome-retention.test.mjs test/task-artifacts.test.mjs test/task-artifact-prevalidation.test.mjs` — first exit 1 on instruction budget; affected reruns exit 0.
- `node --test test/skill-installation.test.mjs test/distribution.test.mjs` — first exit 1 on stale exact counts; failed named rerun exit 0, then full coverage passed in `release:ci`.
- `npm run lint` — first exit 1 on stale document delta evidence; subsequent exits 0.
- `npm run format:check` — exit 0.
- `npm run verify:plan -- <17 exact changed paths>` — exit 0; selected RELEASE and `npm run release:ci`.
- `npm run release:ci` — exit 0; 364 PASS, one opt-in live skip, lint/format/pack PASS, and release candidate PASS.
- Final `npm run check` after `DONE/PASSED` synchronization — exit 0; 364 PASS, one opt-in live skip, lint/format/pack PASS.
- `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures` — exit 0 with six valid direct scenarios.
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0059-automatically-hydrate-prior-standard-de-0e0a8659` — exit 0 before terminal synchronization; rerun below validates terminal bytes.
- Final read-only Git/path/history/package/publication/transaction/residue commands — exit 0 after one quoted-upstream correction; `git diff --check` and exact staged audit run below.

## Results

- PASS — fresh implementation preflight aligned local HEAD/upstream/local `main`/cached `origin/main`/direct remote/GitHub `main` at `be98d3b20dd28f1067cda117458588cfdb7fdd5a`; the only worktree paths were the two authored Task 0059 files with exact requested SHA-256 values.
- PASS — canonical pair validation, 59-pair frontier inspection, single-active invariant, Task 0058 dependency state, empty Task transaction/residue, no open PR, package/plugin `0.1.0`, zero dependency fields/lifecycle hooks, zero tags, and zero GitHub Releases were freshly confirmed.
- PASS — local first-parent ancestry selected exactly 28 required prior `STANDARD` outcomes: Tasks 0030–0050 and 0052–0053 are 23 anchor-proven `LEGACY_PRE_CONTRACT` entries; Tasks 0054–0058 are five full `HARDENED_EXACT_HEAD` entries.
- PASS — fresh bounded GitHub PR/run/attempt/job/log/commit collection produced 97 distinct accepted job IDs, five exact ordered synthetic-parent pairs, separate failed chronology, and no secret-like scratch input.
- PASS — the absolute packaged adapter `C:\1kyw\5.personal\kyw_dev\skills\kyw-task\scripts\task-artifacts.mjs` was invoked directly for dispatch exactly once and returned `SELECTED / IMPLEMENT / 0059 / STANDARD_LIFECYCLE`.
- PASS — pre-implementation review reconfirmed that AC-01 through AC-15 are covered by T-01 through T-17; no matrix row is promoted before its implementation command runs.
- FAIL — the first `node --test test/task-delivery-hydration.test.mjs` exited 1 before implementation because the shared facade did not yet export `classifyLocalDeliveryContracts`; this is the preserved test-first failure for the new hydration boundary.
- FAIL → PASS — the first implemented focused run exposed one incomplete ancestry fixture and a string-valued evidence schema; the fixture gained the required anchor-to-main edge, the parser normalized schema 2, and all four initial tests passed.
- FAIL → PASS — live production hydration first rejected custom merge subjects for Tasks 0037, 0044, and 0050; terminal mapping now requires the exact two-parent transition from a nonterminal base pair to `DONE/PASSED`, accepts both GitHub merge-subject forms, and binds the observed PR ref back to any local subject hint.
- FAIL → PASS — the next live runs found normalized run objects losing workflow name/path on a second normalization pass and GitHub shell traces containing literal `^[[...` color markers before an echoed `printf`; both parsers were narrowed, deterministic ANSI/echo coverage was added, and the final live run rebuilt all 28 prior outcomes in 340.7 seconds with Tasks 0054–0058 evaluator-satisfied and Task 0055 attempts separated.
- PASS — `node --test test/task-delivery-hydration.test.mjs` now reports 14 deterministic PASS and one credentialed live test skipped by default; the separate live command reports 1 PASS with no dispatcher call.
- FAIL → PASS — the first combined instruction run exceeded the retained 36 KiB representative bundle at 38,041 bytes; the new behavior was absorbed into existing delivery paragraphs, and the rerun passed at 36,853 bytes without raising the 36,864-byte limit.
- FAIL → PASS — direct/packed installation regressions found four exact inventory/tarball counts still reflecting the old runtime; expectations were updated for the one added shared hydration module, and both failed named tests then passed.
- FAIL — the first `npm run lint` reached foundation validation but correctly rejected stale permanent-document delta evidence; the current Task table below now records the exact prior baseline and current owner projections before rerun.
- PASS — the exact 17-path planner selected RELEASE; `npm run release:ci` passed 364/365 tests with only the opt-in live test skipped, plus lint, format, 42-file pack, and candidate SHA-256 `e846e2a6150bb7c496e7459fc28142705c53a66de29d7bf45bd941b74a205fcb`.
- PASS — the final terminal-pair `npm run check` repeated the same 364 PASS/one opt-in skip and all three static/package gates successfully.
- PASS — direct behavioral fixtures returned `{valid:true, method:"CURRENT_SESSION_DIRECT", scenarioCount:6}`; final fresh live hydration passed in 342.8 seconds after the global-anchor and reported-attempt hardening.
- PASS — package/plugin remain `0.1.0` with no dependency fields or lifecycle hooks; tags and Releases remain zero, Task 0058 bytes are unchanged, transaction state is `NONE`, and the exact owned scratch root was moved recoverably to the Windows Recycle Bin with no other cleanup.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 13894 | 14363 | 217 | 221 | 469 | 3.38% | setup, usage, and contributor entry | Users need the one-line hydration behavior, GitHub CLI prerequisite, and fail-closed recovery boundary. | The existing Task routing and evidence section absorbs the projection; no new command catalog or section was added. |
| `AGENTS.md` | 3531 | 3531 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — routing, authority, evidence honesty, and completion rules remain unchanged. | Existing repository rules already require the fresh Task/Test and GitHub gates. |
| `docs/SPEC.md` | 34803 | 35641 | 432 | 435 | 838 | 2.41% | observable product behavior and acceptance | Automatic pre-dispatch hydration and its one-line input/fail-closed result are durable product behavior. | Existing `$kyw-impl` and `STANDARD` owner paragraphs absorb the meaning without procedural API detail. |
| `docs/ARCHITECTURE.md` | 30651 | 31206 | 669 | 678 | 555 | 1.81% | stable components, boundaries, dependencies, flows, and trade-offs | The shared hydration module, transient cache, and pre-dispatch data flow are durable system boundaries. | Existing dependency, external-ledger, and existing-Task flow sections absorb the component and data path. |
| `Combined` | 82879 | 84741 | 1366 | 1382 | 1862 | 2.25% | all four permanent-document owners | README, SPEC, and ARCHITECTURE each own one minimal changed meaning; AGENTS remains stable. | Three existing owner sections replace the former manual-input meaning; chronology and mechanics remain in this pair and focused tests. |

## Unverified

- Hosted PR exact-head and post-main delivery evidence is intentionally external and was not available before these repository bytes were committed; it must pass on each first authorized attempt before final delivery is reported.
- No registry query, publication, version/tag/Release mutation, workflow rerun, force push, branch deletion, or model-backed evaluation was executed.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
