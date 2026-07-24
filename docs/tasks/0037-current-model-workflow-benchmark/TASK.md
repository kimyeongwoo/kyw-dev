# TASK 0037 — Current-Configured-Model Workflow Benchmark
<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Verify the final kyw-dev workflow on the currently configured Codex model and reasoning effort, measure observable invocation and context bottlenecks, and produce an evidence-based usability verdict without changing model or effort settings or repairing defects in this verification-only Task.

## Dependencies

- Task 0036.

## In Scope

- Record the active Codex surface/version and the configured model and reasoning effort when observable; never guess unavailable values.
- Use the current configured model and effort exactly. Do not lower, substitute, or run an effort sweep.
- Run bounded representative scenarios for portable exact-ID execution, managed-repository aliases, automatic next/resume selection, appended overrides, dependency and blocked stops, continuous queue session boundaries, all-complete messaging, init/adopt, Task create/resume, ordinary prompt, audit bare/fix, and grilling decisions.
- Measure observable selection accuracy, turns, questions, tool calls, files read, loaded instruction bytes, wall time, executed checks, unsupported claims, and user-work preservation. Mark a surface metric `UNAVAILABLE` with a reason rather than inventing it; at minimum record wall time, command/tool count, known loaded instruction bytes, and repository file reads for each scenario.
- Recheck current official model/Codex/Skills compatibility and distinguish official compatibility from executed evidence.
- Use current-session direct evidence by default; no nested `codex exec`, subagent, or alternate model is required merely for formality.
- Report exact bottlenecks and one terminal usability verdict. Preserve the first failure and do not fix product defects here.
- If this Task ends `BLOCKED`, do not execute the pre-created Task 0038 release re-gate. If it passes, external delivery must succeed before Task 0038 is eligible.

## Out of Scope

- Changing model or reasoning effort.
- Comparing cheaper models or multiple effort levels.
- A large stochastic cohort, hidden retries, or favorable result selection.
- Product fixes, publication, or automatic creation of another Task.
- Executing Task 0038 after a `BLOCKED` result.

## Acceptance Criteria

- [x] AC-01: Observable model, effort, Codex version, surface, Skill/package hashes, and source SHA are recorded exactly; unavailable fields are explicit and not guessed.
- [x] AC-02: Portable exact-ID, managed-repository alias, automatic, and continuous commands select and stop correctly with no generated mega-prompt.
- [x] AC-03: Appended constraints are honored at the documented scope and configured model/effort remains unchanged.
- [x] AC-04: Resume, status-pair, dependency, historical/current blocker, delivery-ledger, session-boundary, and all-complete behavior pass on separate controlled fixtures.
- [x] AC-05: Representative init/task/ordinary/audit/grilling contracts pass without unsupported PASS claims or user-state mutation.
- [x] AC-06: Each scenario records all observable context/instruction bytes, turns, tool/command counts, files read, and wall time; unavailable metrics are explicit, and concrete bottlenecks are identified from supported measurements.
- [x] AC-07: Current official compatibility is verified separately from actual current-session execution evidence.
- [x] AC-08: The final verdict is `USABLE_NO_MATERIAL_BOTTLENECK`, `USABLE_WITH_BOTTLENECKS`, or `BLOCKED`, with exact reasons, preserved failures, and no automatic repair or new Task.
- [x] AC-09: In a controlled fixture whose current queue is fully `DONE/PASSED` or `CANCELLED/BLOCKED` and whose required delivery ledger is satisfied, the workflow returns the exact no-work message and creates nothing; a current blocked frontier reports the blocker instead.

## Plan

- [x] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [x] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [x] Treat selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned benchmark decision remains.
- [x] Transition this pair to `IN_PROGRESS/RUNNING`, freeze scenario definitions and measurement rules, and capture source/package/model observability baselines.
- [x] Execute the bounded benchmark once per defined scenario, preserving failures and allowing only explicitly classified infrastructure retries.
- [x] Run the deterministic validators and stable/package checks required to establish benchmark integrity; do not modify product behavior to obtain a pass.
- [x] Review evidence completeness, protected-state preservation, metric availability, bottlenecks, and every verdict predicate.
- [x] Set the evidence-backed repository outcome and usability verdict in this pair and stop on any blocker.

## Decisions

- The configured model and effort are fixed test inputs, not optimization variables.
- No exact Sol claim is made unless the execution surface exposes and confirms that exact model.
- A bounded deterministic scenario set is preferred over another mandatory cohort.
- Unsupported internal metrics are recorded as unavailable; observable measurements are never extrapolated into exact hidden context/token claims.
- This Task reports defects; it does not repair them.

## Risks

- The surface may not expose the exact model, effort, token/context, or tool metrics.
- Current-session direct evidence is not independent fresh-session evidence.
- Wall-time measurements can be noisy; scenario structure, command counts, file reads, and known loaded instruction bytes must also be recorded.
- A newly discovered blocker requires later user action and prevents the final release re-gate, but no new Task is created automatically.

## Discoveries and Changes

- The clean execution branch `task/0037-current-model-workflow-benchmark` starts from exact delivered `origin/main` SHA `8af664d8a37204e4793f81f7f27c038bc8ce0872`.
- Fresh GitHub evidence bound Tasks 0030–0036 and 0039 to merged PRs, successful exact-head PR CI, clear review state, and successful exact post-merge `main` CI. Managed exact dispatch then selected Task 0037 with action `IMPLEMENT`, `STANDARD_LIFECYCLE` authority, no override, and no ceremonial confirmation.
- The active surface is observably API-based and the current user requested no model override. Exact model identifier, reasoning-effort value, and Codex version are not exposed by this surface and remain `UNAVAILABLE`; no setting was changed or inferred.
- The source/package baseline is `kyw-dev@0.1.0` at SHA `8af664d8a37204e4793f81f7f27c038bc8ce0872`; the verified release candidate contains 29 files and 82,480 bytes with SHA-256 `cbb3a0a393be83868bbe989b3cfb0dd36f9767325c191337fed67f39d2b06841`.
- The twelve frozen scenarios passed 32 of 32 tests with zero product retries. Aggregate wall time was 5,340 ms, median scenario wall time was 234.5 ms, known repository-read occurrences totaled 63, and repeated per-scenario instruction-byte occurrences totaled 230,593.
- The complete non-`.git` workspace remained exactly 3,243 files and 12,829,239 bytes with SHA-256 `7a4b4593f9cde428b579a9166a773ce69f1a98f085d07a27f606fb0f442b449f` before and after the scenario batch. Only this Task/Test pair was modified.
- The first live exact-dispatch attempt supplied only the direct Task 0036 delivery ledger and failed closed with missing transitive ledger requirements for Tasks 0030–0035 and 0039. Supplying all eight exact ledgers selected Task 0037 without a question. This preserved adverse event exposes a material evidence-gathering bottleneck rather than a correctness defect.
- Before benchmark execution, the unique repository execution instructions explicitly loaded by this session comprised 24 files and 380,959 UTF-8 bytes: 158,228 bytes of permanent documents, 33,693 bytes of Task Skill/procedure, 18,413 bytes of this then-current pair, and 170,625 bytes of dependency pairs. These are measured bytes, not inferred context tokens.
- Official OpenAI documentation current on 2026-07-24 confirms repository `AGENTS.md` guidance, progressive Skill disclosure, supported Skill surfaces, and the narrower plugin-surface matrix. This compatibility review is external documentation evidence, not proof of the active API model/version.
- Final verdict: `USABLE_WITH_BOTTLENECKS`. Selection, stop, preservation, verification, and package contracts are usable and deterministic; the exact-ID delivery preflight and dependency-document load impose material but non-blocking overhead. No product repair or new Task was created.

## Documentation Impact

- SPEC: Unchanged. Executed evidence did not disprove product behavior or acceptance rules.
- ARCHITECTURE: Unchanged. The measured bottlenecks concern invocation evidence and document-load cost, not a new durable component or boundary defect.
- README: Unchanged. The dated official compatibility check agrees with current installation and usage guidance.
- AGENTS: Unchanged. No repository-wide execution or completion rule changed.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- Revalidated the clean worktree, local/direct remote refs, Task inventory, transitive dependency pairs, merged PR identities, review state, and exact PR/post-merge Actions results.
- Read the Task Skill and execution reference, four permanent documents, this pair, and the explicit dependency chain required by deterministic dispatch.
- Validated Task 0036 and Task 0037, supplied fresh exact-SHA delivery ledgers for the transitive current-contract dependency chain, and obtained a deterministic `SELECTED/IMPLEMENT` dispatch result.
- Created the Task 0037 branch from exact delivered `origin/main` and entered `IN_PROGRESS/RUNNING`.
- Froze and executed twelve representative scenarios once each; all 32 scenario assertions passed with recorded wall time, command/tool count, known repository reads, instruction bytes, and explicit unsupported metrics.
- Captured exact source, package, manifest, Skill-tree, installed-runtime, and workspace identities without inferring unavailable active-model telemetry.
- Verified current official Codex, Skills, plugins, and `AGENTS.md` compatibility separately from executed current-session evidence.
- Ran the focused 92-test workflow suite, six-scenario direct acceptance fixture, verification planner, full 257-test Stable contract, lint, format, pack, and packed release-candidate checks successfully.
- Reviewed the final evidence against every acceptance criterion, preserved all adverse/infrastructure events, confirmed no product or permanent-document change, and recorded `USABLE_WITH_BOTTLENECKS`.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no repository blocker remains.
