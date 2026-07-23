# TASK 0030 — Self-Contained Task Dispatch and Queue Progression

## Status

READY

## Goal

Let a user execute an exact existing Task or advance a pre-created Task queue with a short command, while keeping one Task active at a time, preserving the configured model and reasoning effort, applying explicit execution overrides safely, and separating repository outcome from external GitHub delivery evidence.

## Dependencies

- Task 0029 terminal `READY_FOR_APPROVAL` evidence and the current integrated `main`.
- Current `kyw-task` Skill, execution reference, Task artifact helper, templates, permanent documents, and invocation metadata.

## In Scope

- Keep `$kyw-task NNNN` as the portable explicit invocation on every surface that supports the Skill.
- In a kyw-managed repository whose `AGENTS.md` routing contract is loaded, recognize the anchored aliases `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; on a surface where that routing contract is unavailable, direct the user to `$kyw-task NNNN` rather than claiming the alias worked.
- Treat an exact selection of an already-created `READY/READY` Task as the user's execution confirmation. Do not ask for another ceremonial confirmation unless appended instructions conflict or a genuinely unresolved user-owned decision remains.
- Define consistent Task/Test queue states: `READY/READY` is selectable, `IN_PROGRESS/RUNNING` is active, `DONE/PASSED` is repository-complete, `CANCELLED` is terminal, and inconsistent pairs fail closed.
- Treat literal `Task NNNN` references in `## Dependencies` as hard Task dependencies. Other dependency bullets are evidence or implementation inputs, not queue edges. Missing references, dependency cycles, and unsatisfied hard dependencies fail closed.
- For `task 진행해줘`, resume the single active Task when safe; otherwise select the lowest-numbered dependency-satisfied `READY/READY` Task. Multiple active Tasks fail closed.
- For `남은 task 계속 실행해줘`, process only pre-created eligible Tasks serially in the current invocation, with one active Task and a fresh local/remote/GitHub preflight at every transition. Never claim unattended background execution; if the host session ends, durable Task state supports the next short invocation.
- Stop on an active or required dependency `BLOCKED` state, unsafe drift, a new product decision, review/CI failure, publication authority, or unexplained user work. Historical `BLOCKED` Tasks that are neither active nor hard dependencies do not block an unrelated current queue.
- When there is no `READY/READY` or `IN_PROGRESS/RUNNING` Task, the highest current queue frontier is `DONE/PASSED` or `CANCELLED`, and required delivery is satisfied, return exactly: `현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?` A current queue frontier in `BLOCKED` must report its blocker instead.
- Treat only text appended by the current user to the invocation as an execution override. A bounded override may narrow method, ordering, or checks; it may not silently waive acceptance, evidence honesty, safety, user-work preservation, or separately gated external mutation. A conflict is reported rather than ignored.
- In continuous mode, apply appended text only to the first selected Task unless the user explicitly states that it applies to every remaining Task.
- Keep the active session's configured model and reasoning effort unchanged by default. Do not downgrade, substitute, or sweep settings unless the current user explicitly requests it; record observable provenance without guessing unavailable values.
- Let Task/Test artifacts own repository outcome and reproducible evidence. When standard delivery is required, GitHub PR/Actions exact-SHA state is the canonical external delivery ledger. A `DONE/PASSED` repository outcome may still require delivery completion before queue advancement.
- Migrate the pre-created Tasks 0031 through 0038 and the canonical templates/validator to the non-self-referential delivery contract without rewriting completed historical Tasks. New validation must not retroactively invalidate immutable historical evidence.
- Preserve ordinary-prompt behavior: incidental text containing the word “task” must not trigger the dispatcher.

## Out of Scope

- Creating new numbered Tasks automatically.
- Running Tasks in parallel or promising asynchronous/background continuation.
- Bypassing an active Task or hard dependency in `BLOCKED` without explicit safe user direction.
- Changing model or reasoning effort automatically.
- Publication, force push, workflow rerun, branch deletion, or other authority not contained in the selected Task.
- Rewriting completed historical Task evidence merely to normalize old formatting.
- Claiming repository-local natural-language aliases work on a surface that does not load the managed routing contract.

## Acceptance Criteria

- [ ] AC-01: `$kyw-task NNNN` and the managed-repository exact alias resolve exactly one existing Task, load its Task/Test/permanent truth and current Git/GitHub state, and require no generated mega-prompt.
- [ ] AC-02: Exact selection of a `READY/READY` Task is execution confirmation and does not trigger a repeated confirmation unless a real unresolved decision or override conflict exists.
- [ ] AC-03: Automatic selection deterministically resumes the single active Task or selects the first dependency-satisfied `READY/READY` Task; status mismatches, missing dependencies, and cycles fail closed.
- [ ] AC-04: Continuous mode executes only pre-created Tasks serially in the current invocation, re-preflights between Tasks, persists a durable resume point, and stops at the first blocker or authority boundary.
- [ ] AC-05: Appended current-user text is recorded and applied with explicit scope and precedence; it is not silently promoted to later Tasks or allowed to waive protected contracts.
- [ ] AC-06: The configured model and reasoning effort remain unchanged unless the current user explicitly overrides them; observable provenance is recorded without guessing unavailable values.
- [ ] AC-07: Repository outcome and external delivery state no longer create self-referential `DONE`/`Remaining` contradictions; exact GitHub evidence governs required delivery completion.
- [ ] AC-08: Historical unrelated blockers do not freeze a new queue, while an active Task, current queue frontier, or hard dependency in `BLOCKED` stops advancement with an exact reason.
- [ ] AC-09: The exact no-work message is returned only when the current queue has no selectable/active Task, its frontier is `DONE/PASSED` or `CANCELLED`, and required delivery is satisfied; no Task is created.
- [ ] AC-10: Existing ordinary-prompt behavior remains unchanged and incidental uses of “task” do not trigger execution.
- [ ] AC-11: Pre-created Tasks 0031 through 0038 remain valid, selectable, and free of future-delivery self-reference after the contract migration; completed historical Tasks remain readable without forced rewrite.
- [ ] AC-12: Focused, full, packed, and representative actual-Skill/routing invocation evidence pass on supported surfaces without publication.

## Plan

- [ ] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [ ] Read the permanent documents, this Task/Test pair, the pre-created 0031–0038 pairs, and only directly referenced implementation/evidence dependencies.
- [ ] Treat the explicit selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [ ] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [ ] Implement the smallest dispatcher, dependency/status parser, override boundary, delivery-ledger integration, and queued-artifact migration that satisfy the acceptance criteria.
- [ ] Run focused verification, then the stable/package/hosted checks implied by the final diff.
- [ ] Review every changed path against scope, tests, permanent-document impact, historical compatibility, and evidence honesty.
- [ ] Set an evidence-backed repository outcome in this pair. Do not preclaim future PR/merge/post-merge facts; complete and inspect external delivery through the exact GitHub ledger, then stop or advance according to the selected mode.

## Decisions

- `$kyw-task NNNN` remains the portable fallback; natural-language aliases are a managed-repository routing feature, not a claim about every Codex surface.
- Exact or automatic selection of a pre-created `READY/READY` Task is the user's authorization to execute that Task's standard lifecycle.
- Literal Task IDs in `Dependencies` are the only machine-interpreted hard dependency edges.
- A historical lower-numbered `BLOCKED` Task is not a queue blocker unless the current Task explicitly depends on it.
- Only one Task is active at any instant, including continuous mode; continuous execution is bounded to the current invocation and leaves durable state if interrupted.
- Task files own repository outcome and reproducible evidence. GitHub owns future PR/merge/post-merge delivery facts.
- Current configured model/effort is the default; no automatic downgrade is permitted.

## Risks

- Overbroad natural-language matching could execute a Task accidentally.
- Free-form dependency text could be misread unless only literal Task references are interpreted.
- Historical blockers could freeze all future work if queue scope is based on numeric order rather than dependencies/frontier state.
- Applying one override to all queued Tasks could expand scope unexpectedly.
- External delivery inspection must not reinterpret CI success as behavioral acceptance.
- Changing the validator could invalidate historical evidence unless compatibility is explicit.

## Discoveries and Changes

- None yet.

## Documentation Impact

- SPEC: Update user-visible invocation, queue selection, overrides, model/effort preservation, completion, and delivery-boundary behavior.
- ARCHITECTURE: Document routing scope, resolver inputs, status/dependency graph, one-active-Task state, queue frontier, and external delivery ledger.
- README: Document portable and repository-local short forms, bootstrap behavior, continuous-mode limits, and examples.
- AGENTS: Keep thin; add only invariant repository-local routing, queue, confirmation, and external-delivery rules.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- No implementation or verification has run.

## Remaining

- Repository implementation and verification have not started. External delivery is intentionally not a future fact required inside this artifact.

## Resume Point

When explicitly selected, revalidate current state and dependencies, treat the selection as execution confirmation, transition to `IN_PROGRESS/RUNNING`, and begin at the first unchecked Plan item. Do not repeat completed predecessor work.

## Blockers

- None known at planning time.
