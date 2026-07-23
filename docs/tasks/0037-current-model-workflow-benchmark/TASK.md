# TASK 0037 — Current-Configured-Model Workflow Benchmark

## Status

READY

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

- [ ] AC-01: Observable model, effort, Codex version, surface, Skill/package hashes, and source SHA are recorded exactly; unavailable fields are explicit and not guessed.
- [ ] AC-02: Portable exact-ID, managed-repository alias, automatic, and continuous commands select and stop correctly with no generated mega-prompt.
- [ ] AC-03: Appended constraints are honored at the documented scope and configured model/effort remains unchanged.
- [ ] AC-04: Resume, status-pair, dependency, historical/current blocker, delivery-ledger, session-boundary, and all-complete behavior pass on separate controlled fixtures.
- [ ] AC-05: Representative init/task/ordinary/audit/grilling contracts pass without unsupported PASS claims or user-state mutation.
- [ ] AC-06: Each scenario records all observable context/instruction bytes, turns, tool/command counts, files read, and wall time; unavailable metrics are explicit, and concrete bottlenecks are identified from supported measurements.
- [ ] AC-07: Current official compatibility is verified separately from actual current-session execution evidence.
- [ ] AC-08: The final verdict is `USABLE_NO_MATERIAL_BOTTLENECK`, `USABLE_WITH_BOTTLENECKS`, or `BLOCKED`, with exact reasons, preserved failures, and no automatic repair or new Task.
- [ ] AC-09: With the current queue fully `DONE/PASSED` or `CANCELLED` and externally delivered, the workflow returns the exact no-work message and creates nothing; a current blocked frontier reports the blocker instead.

## Plan

- [ ] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [ ] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [ ] Treat selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned benchmark decision remains.
- [ ] Transition this pair to `IN_PROGRESS/RUNNING`, freeze scenario definitions and measurement rules, and capture source/package/model observability baselines.
- [ ] Execute the bounded benchmark once per defined scenario, preserving failures and allowing only explicitly classified infrastructure retries.
- [ ] Run the deterministic validators and stable/package checks required to establish benchmark integrity; do not modify product behavior to obtain a pass.
- [ ] Review evidence completeness, protected-state preservation, metric availability, bottlenecks, and every verdict predicate.
- [ ] Set the evidence-backed repository outcome and usability verdict in this pair without preclaiming future delivery; complete external delivery through the exact GitHub ledger and stop on any blocker.

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

- None yet.

## Documentation Impact

- SPEC: Unchanged unless executed evidence disproves current product behavior.
- ARCHITECTURE: Unchanged unless supported measurements reveal a durable boundary issue.
- README: Update only measured usage guidance that changed in meaning.
- AGENTS: Unchanged.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- No benchmark or verification has run.

## Remaining

- Benchmark execution and repository evidence have not started. External delivery is intentionally not a future fact required inside this artifact.

## Resume Point

When selected, revalidate current state and dependencies, treat the selection as execution confirmation, transition to `IN_PROGRESS/RUNNING`, freeze the benchmark inputs, and begin at the first unchecked Plan item.

## Blockers

- None known at planning time.
