# TEST 0037 — Current-Configured-Model Workflow Benchmark
<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules: `../../../AGENTS.md`
- Verification policy: current-session direct and risk-proportionate by default; preserve the configured model and reasoning effort.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user supplied no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose a Codex version)

## Frozen Benchmark Inputs

- Source boundary: exact delivered base `8af664d8a37204e4793f81f7f27c038bc8ce0872`; only this Task/Test pair may differ while scenarios run.
- Execution count: one deliberate run per scenario in a fresh Node process. A product/test failure is retained and is not retried or repaired in this Task. Only a process-launch or external-service failure with no product assertion may receive one explicitly classified infrastructure retry.
- Timing: `System.Diagnostics.Stopwatch` surrounds the exact child command and records elapsed milliseconds plus exit code.
- Counts: each row records one shell tool call and one child command. TAP pass/fail/skip counts are recorded from output. Model turns, hidden context, internal model tool calls, and exact tokens are `UNAVAILABLE` because the deterministic child process and active API surface do not expose them.
- Repository reads: record the explicit test file, imported repository modules, and repository fixtures/instructions intentionally read by that scenario. Node/runtime-internal reads and dynamically discovered OS files are `UNAVAILABLE`; they are not estimated.
- Instruction bytes: sum exact UTF-8 bytes only for repository instruction/source-of-truth Markdown files explicitly read by the scenario. Pure core-dispatch fixtures record zero instruction bytes. This is not an inferred model-context or token count.
- Preservation: compare repository status and the complete non-`.git` workspace snapshot before and after the scenario batch; separately retain deterministic protected-state assertions from the audit/distribution regressions.

| Scenario | Frozen intent | Exact command |
|---|---|---|
| S-01 | Portable exact-ID selection and `READY/READY` confirmation | `node --test --test-name-pattern='exact READY selection is confirmation' test/task-dispatch.test.mjs` |
| S-02 | Managed exact alias, unsupported-surface fallback, and incidental non-trigger | `node --test --test-name-pattern='anchored invocation parsing preserves overrides and rejects incidental task text' test/task-dispatch.test.mjs` |
| S-03 | Automatic active resume and next eligible selection | `node --test --test-name-pattern='automatic dispatch resumes one active Task\|automatic dispatch uses literal hard dependencies' test/task-dispatch.test.mjs` |
| S-04 | Appended override consumption and real-blocker question rule | `node --test --test-name-pattern='asks only one real blocking question and consumes settled constraints' test/kyw-task.test.mjs` |
| S-05 | Preflight, dependency, cycle, active dependency, and current blocker stops | `node --test --test-name-pattern='verified execution preflight blockers\|missing dependencies, cycles\|exact active and terminal Tasks\|Task 0039 active, blocked' test/task-dispatch.test.mjs` |
| S-06 | Continuous serial transition, override scope, and simulated session stop/resume | `node --test --test-name-pattern='continuous dispatch re-inspects serial state' test/task-dispatch.test.mjs` |
| S-07 | Exact delivery ledger, blocked frontier, and exact all-complete message | `node --test --test-name-pattern='all-complete dispatch message\|exact GitHub ledger evidence\|cancelled frontiers require standard delivery' test/task-dispatch.test.mjs` |
| S-08 | Init new/adopt/rebaseline classification, preservation, confirmation, and four-file boundary | `node --test test/kyw-init.test.mjs` |
| S-09 | Task authoring pair creation/confirmation and verified resume | `node --test --test-name-pattern='authoring adapter scaffolds one pair\|resume verifies recorded state\|authoring preserves traceability' test/kyw-task.test.mjs` |
| S-10 | Ordinary-prompt no-Task behavior and durable-document impact | `node --test --test-name-pattern='ordinary prompt that creates a numbered Task fails\|durable visible change without README impact handling fails' test/spec-behavioral-acceptance.test.mjs` |
| S-11 | Audit bare/fix mode lock, bounded repair, and native read-only preservation | `node --test --test-name-pattern='locks bare read-only and exact-flag repair modes\|repairs only a clear in-scope finding\|native allowed inspection preserves repository' test/kyw-audit.test.mjs test/audit-smoke.test.mjs` |
| S-12 | Grilling dependency order, one-question/recommendation, decision state, and cancellation | `node --test --test-name-pattern='encodes the one-question decision-tree protocol\|cancellation precedence\|fixture-backed scenario\|tracks semantic decision state' test/kyw-grilling.test.mjs` |

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Provenance and observability | Capture exact observable model/effort/surface/version/source/package identity and explicit unavailable fields. | Evidence | PASS | Source/package/manifest/Skill identities below; unavailable active API fields remain explicit. |
| T-02 | AC-02 — Portable and repository-local exact commands | Run `$kyw-task NNNN` and the managed repository alias, including unsupported-surface fallback. | Behavioral | PASS | S-01 and S-02; focused instruction/dispatch suite also passed. |
| T-03 | AC-02, AC-04 — Automatic resume/next and status/dependency checks | Run active-resume, next-ready, inconsistent-pair, missing-dependency, and cycle fixtures. | Behavioral | PASS | S-03 and S-05 plus the full dispatch regression suite. |
| T-04 | AC-02, AC-04 — Continuous, blocker, delivery, and session stop | Run serial queue fixtures with current/historical blockers, delivery gates, and a simulated session boundary. | Behavioral | PASS | S-05 through S-07; live exact-SHA delivery preflight selected this Task after all required ledgers were supplied. |
| T-05 | AC-03 — Appended overrides and model/effort preservation | Apply first-Task and explicitly global constraints; verify the configured model/effort is unchanged. | Behavioral | PASS | S-04 and focused model-mutation/instruction tests; no model or effort override was requested or applied. |
| T-06 | AC-09 — Completed versus blocked frontier | Return the exact no-work message only for a delivered `DONE/PASSED` or `CANCELLED/BLOCKED` frontier; report a current blocked frontier. | Behavioral | PASS | S-07 covers exact no-work text, satisfied ledgers, cancelled/blocked terminal state, and a blocked current frontier. |
| T-07 | AC-05 — Core Skill scenarios | Run bounded init/task/ordinary/audit/grilling fixtures. | Acceptance | PASS | S-08 through S-12; direct six-scenario acceptance fixture and focused suite passed. |
| T-08 | AC-06 — Observable metrics and bottlenecks | Record required minimum metrics and every additional surface-exposed metric per scenario; mark unsupported metrics explicitly. | Performance | PASS | Per-scenario table and aggregate/context measurements below. |
| T-09 | AC-07 — Official compatibility | Recheck current primary OpenAI sources and distinguish them from executed evidence. | External read-only | PASS | Official Codex manual refreshed/read on 2026-07-24; compatibility findings are separated below. |
| T-10 | AC-05 — Protected state | Prove repository, user files, auth/config, and unrelated state preservation. | Integrity | PASS | Pre/post workspace snapshot is byte-identical; S-11 and Stable regressions protect repository/auth/config/unrelated state. |
| T-11 | AC-08 — Terminal verdict and no repair | Validate one allowed verdict, preserve adverse evidence, and prove no product fix or new Task was created. | Static/integrity | PASS | `USABLE_WITH_BOTTLENECKS`; only this pair changed, the initial ledger blocker is retained, and no Task was created. |

## Identity Evidence

- Source SHA: `8af664d8a37204e4793f81f7f27c038bc8ce0872`.
- Package: `kyw-dev@0.1.0`; `package.json` SHA-256 `44b55f2473987e05d97a5f18369492c75310d3bf58eb3445fee99cdd2b163b2e`; plugin manifest SHA-256 `5cb5e03234b00b7f243c4deec19346d8844e4775418835e8b6aaacae16199892`.
- Packed release candidate: 29 files, 82,480 bytes, SHA-256 `cbb3a0a393be83868bbe989b3cfb0dd36f9767325c191337fed67f39d2b06841`.
- Runtime: Node `v24.11.0`; npm `11.18.0`.
- Installed local CLI: `codex-cli 0.145.0`. This is installed-CLI evidence only and is not claimed as the active API Codex version.

| Skill | Files | Bytes | Canonical tree SHA-256 | `SKILL.md` SHA-256 |
|---|---:|---:|---|---|
| `kyw-grilling` | 2 | 7,602 | `aa4797f34339633f8af4ad2d2e0473135f55af389b7f8872a7b96f1096115eb8` | `99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf` |
| `kyw-init` | 2 | 8,442 | `7ca0537bfd5c66971d82af0bcb61f397a5c8e6b5ea9db609e12d972edd25128f` | `a926a71916182ef4f345e3aad6c807fb42f6d907316ef506863f66af45a4bf76` |
| `kyw-task` | 4 | 40,761 | `d029bd3828cc9a4ac0056661d0cb69121089203a0fd6abb7baf310e799fb5ab3` | `e8a601d890d3c8d03804644ed8f1cd2233bb1b1e9fd79d3da4fd8a5e8a72a2b9` |
| `kyw-audit` | 3 | 23,192 | `860da706a3a0dcb9899d91e8317853e6d7b2834df958e1e512ebbc271992ea74` | `91ac4ddc3cffa0e16211a10a1beb34879582ebd7c0adaefbb6f9b830d13af7b7` |

Canonical tree hashes use sorted `relative-path<TAB>file-SHA-256` records separated by LF.

## Benchmark Measurements

| Scenario | Tests | Wall ms | Shell tools / child commands | Known repository reads | Instruction files / bytes |
|---|---:|---:|---:|---:|---:|
| S-01 | 1/1 PASS | 236 | 1 / 1 | 3 | 0 / 0 |
| S-02 | 1/1 PASS | 209 | 1 / 1 | 3 | 0 / 0 |
| S-03 | 2/2 PASS | 268 | 1 / 1 | 3 | 0 / 0 |
| S-04 | 1/1 PASS | 212 | 1 / 1 | 9 | 5 / 151,234 |
| S-05 | 4/4 PASS | 294 | 1 / 1 | 3 | 0 / 0 |
| S-06 | 1/1 PASS | 233 | 1 / 1 | 3 | 0 / 0 |
| S-07 | 3/3 PASS | 269 | 1 / 1 | 3 | 0 / 0 |
| S-08 | 7/7 PASS | 208 | 1 / 1 | 12 | 7 / 11,937 |
| S-09 | 3/3 PASS | 2,002 | 1 / 1 | 11 | 4 / 37,140 |
| S-10 | 2/2 PASS | 204 | 1 / 1 | 2 | 0 / 0 |
| S-11 | 3/3 PASS | 999 | 1 / 1 | 8 | 2 / 22,915 |
| S-12 | 4/4 PASS | 206 | 1 / 1 | 3 | 1 / 7,367 |

- Aggregate: 32/32 tests passed; zero failures, skips, or product retries; 5,340 ms total wall time; 234.5 ms median scenario wall time; 12 shell tool calls; 12 child commands; 63 known repository-read occurrences; 230,593 repeated per-scenario instruction-byte occurrences.
- S-09 was slowest at 2,002 ms, followed by native-preservation S-11 at 999 ms. Neither exceeded its bound or mutated the workspace.
- S-04 deterministically proves one blocker question with one recommendation, then zero questions for settled selection/appended constraints. The live Task selection required one user invocation and zero follow-up questions after clean evidence.
- Model turns, hidden context, internal model tool calls, and exact token counts are `UNAVAILABLE`: neither the deterministic Node child processes nor this active API surface expose them. No proxy is presented as those values.
- Before the scenarios, the unique execution documents explicitly loaded into this session totaled 24 files and 380,959 UTF-8 bytes: permanent documents 158,228; Task Skill/procedure 33,693; then-current Task/Test pair 18,413; dependency pairs 170,625. This is an explicit-read footprint, not an exact hidden-context or token count.
- The first live dispatch supplied only Task 0036's direct delivery ledger and failed closed while requesting transitive exact ledgers for Tasks 0030–0035 and 0039. The second supplied all eight ledgers and selected Task 0037. This is retained as material preflight/context overhead.

## Preservation Evidence

- Before and after the frozen scenario batch, the complete non-`.git` workspace contained 3,243 files and 12,829,239 bytes with SHA-256 `7a4b4593f9cde428b579a9166a773ce69f1a98f085d07a27f606fb0f442b449f`.
- Git status before and after contained only this Task/Test pair. No product, permanent document, protected auth/config, unrelated user state, or additional Task changed.
- The first general filesystem snapshot implementation exceeded its 30-second instrumentation bound before any scenario ran. A read-only `rg --files` implementation then captured the baseline; this is an instrumentation substitution, not a product-scenario retry.

## Official Compatibility

- The official Codex manual was refreshed/read on 2026-07-24 from the current primary sources for [Skills](https://learn.chatgpt.com/docs/build-skills), [plugins](https://learn.chatgpt.com/docs/plugins), [plugin construction](https://learn.chatgpt.com/docs/build-plugins), and [`AGENTS.md`](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- The sources confirm automatic `AGENTS.md` loading, progressive Skill disclosure, repository/user Skill locations, and Codex CLI/desktop Skill support. They also confirm plugins have a narrower supported-surface matrix and require a new session after installation.
- These statements establish official compatibility only. Actual current-session evidence is the API surface and commands recorded here; it does not expose the exact active model, reasoning effort, or Codex version.

## Regression Coverage

- Task 0030 dispatch/status/dependency/delivery contracts.
- Lean instruction, concise artifact, audit boundary, retired harness, tiering, and installation guidance outputs from Tasks 0031–0036.
- Existing packed Skill/package, user-work, filesystem, evidence-honesty, model/effort, and publication boundaries.
- All observed failure, metric-unavailable, and compatibility branches.

## Commands

- Canonical Task validators for Tasks 0036 and 0037 — PASS before lifecycle transition.
- Guarded Git status/ref/history inspection and `git ls-remote` — PASS; clean baseline, exact remote branches, and delivered `main` SHA confirmed.
- Fresh GitHub PR/review/Actions inspection for Tasks 0030–0036 and 0039 — PASS; exact-head PR CI and exact post-merge `main` CI succeeded with no review blocker.
- First managed exact dispatch with only the direct Task 0036 ledger — BLOCKED as designed; preserved missing transitive ledger requirements for Tasks 0030–0035 and 0039.
- Managed exact dispatch with separate local expectations and all eight required fresh GitHub ledgers — `SELECTED/IMPLEMENT`, `STANDARD_LIFECYCLE`, no ceremonial confirmation.
- `git fetch origin main` and `git switch -c task/0037-current-model-workflow-benchmark origin/main` — PASS; branch starts at `8af664d8a37204e4793f81f7f27c038bc8ce0872`.
- Frozen S-01 through S-12 commands above — PASS, 32/32, zero retries; per-scenario measurements recorded above.
- Non-`.git` workspace snapshot — PASS before and after scenarios; identical count, bytes, and SHA-256. Initial `Get-ChildItem` instrumentation attempt timed out before the batch; `rg --files` replacement succeeded.
- `node C:/Users/DevHamster/.codex/skills/.system/openai-docs/scripts/fetch-codex-manual.mjs` — PASS; local official manual current on 2026-07-24.
- `node --test test/task-dispatch.test.mjs test/kyw-task.test.mjs test/kyw-init.test.mjs test/kyw-audit.test.mjs test/audit-smoke.test.mjs test/kyw-grilling.test.mjs test/spec-behavioral-acceptance.test.mjs test/instruction-surfaces.test.mjs` — PASS, 92/92, 4,447 ms wall time.
- `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures` — PASS, `CURRENT_SESSION_DIRECT`, six scenarios, 313 ms wall time.
- `npm run verify:plan -- docs/tasks/0037-current-model-workflow-benchmark/TASK.md docs/tasks/0037-current-model-workflow-benchmark/TEST.md` — PASS; documentation-only Task evidence planned FOCUSED foundation/instruction/format checks.
- First `npm run check` output exceeded the interface context limit, so its exit status was unavailable. One explicitly classified evidence-recovery rerun — PASS in 37,299 ms: 257/257 tests, lint over 59 JavaScript modules, format over 256 files, pack 29 files/82,480 bytes.
- `npm run release:candidate` — PASS in 1,405 ms; 29 files, 82,480 bytes, SHA-256 `cbb3a0a393be83868bbe989b3cfb0dd36f9767325c191337fed67f39d2b06841`.
- First terminal `task-artifacts.mjs validate` — FAIL because `DONE` requires a reasoned `None` Resume Point; corrected only that evidence field. Final terminal validator — PASS.
- Configured model and reasoning effort were not changed.

## Results

- Verdict: `USABLE_WITH_BOTTLENECKS`.
- Correctness and integrity are usable: all frozen scenarios, focused regressions, direct acceptance evidence, Stable checks, and the packed candidate passed; exact no-work/current-blocker behavior is separately covered; workspace/protected state remained unchanged.
- Material bottleneck 1: live exact-ID execution required exact delivery evidence for eight transitive historical Tasks. The first direct-dependency-only attempt stopped safely but generated a large cascading ledger requirement before the second attempt selected the Task.
- Material bottleneck 2: the execution preflight explicitly loaded 24 instruction/evidence files totaling 380,959 bytes, dominated by 170,625 bytes of dependency pairs and 158,228 bytes of permanent documents.
- The slowest deterministic scenario was Task create/resume at 2,002 ms; this is measured latency, not independently material enough to block use.
- No product defect was observed, no repair was attempted, and no new Task was created.

## Unverified

- Exact active API model identifier, configured reasoning-effort value, active Codex version, hidden prompt/context, internal model tool count, and token counts remain `UNAVAILABLE` because the surface does not expose them.
- `codex-cli 0.145.0` describes the installed CLI only; it does not identify the active API runtime.
- No independent model-backed fresh session or desktop UI was run; the Task explicitly permits current-session direct and deterministic fixture evidence.
- External PR/Actions delivery is not claimed by this repository evidence artifact and remains governed by the STANDARD delivery gate.

## Final Coverage Review

- [x] Compare the final evidence diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Confirm scenario inputs were frozen, retries were classified, and adverse evidence was retained.
- [x] Confirm model/effort and unavailable metrics were recorded without inference.
- [x] Confirm user/protected state remained unchanged and no product repair occurred.
- [x] Confirm this pair records repository evidence only and makes no external-delivery claim.
