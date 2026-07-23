# TASK 0030 — Self-Contained Task Dispatch and Queue Progression

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Let a user execute an exact existing Task or advance a pre-created Task queue with a short command, while keeping one Task active at a time, preserving the configured model and reasoning effort, applying explicit execution overrides safely, and separating repository outcome from external GitHub delivery evidence.

## Dependencies

- Task 0029 terminal `READY_FOR_APPROVAL` evidence and the current integrated `main`.
- Current `kyw-task` Skill, execution reference, Task artifact helper, templates, permanent documents, and invocation metadata.

## In Scope

- Keep `$kyw-task NNNN` as the portable explicit invocation on every surface that supports the Skill.
- In a kyw-managed repository whose `AGENTS.md` routing contract is loaded, recognize the anchored aliases `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; on a surface where that routing contract is unavailable, direct the user to `$kyw-task NNNN` rather than claiming the alias worked.
- Treat an exact selection of an already-created `READY/READY` Task as the user's execution confirmation. Do not ask for another ceremonial confirmation unless appended instructions conflict or a genuinely unresolved user-owned decision remains.
- Define consistent Task/Test queue states: `READY/READY` is selectable, `IN_PROGRESS/RUNNING` is active, `DONE/PASSED` is repository-complete, `CANCELLED/BLOCKED` is terminal, and inconsistent pairs fail closed.
- Treat literal `Task NNNN` references in `## Dependencies` as hard Task dependencies. Other dependency bullets are evidence or implementation inputs, not queue edges. Missing references, dependency cycles, and unsatisfied hard dependencies fail closed.
- For `task 진행해줘`, resume the single active Task when safe; otherwise select the lowest-numbered dependency-satisfied `READY/READY` Task. Multiple active Tasks fail closed.
- For `남은 task 계속 실행해줘`, process only pre-created eligible Tasks serially in the current invocation, with one active Task and a fresh local/remote/GitHub preflight at every transition. Never claim unattended background execution; if the host session ends, durable Task state supports the next short invocation.
- Stop on an active or required dependency `BLOCKED` state, unsafe drift, a new product decision, review/CI failure, publication authority, or unexplained user work. Historical `BLOCKED` Tasks that are neither active nor hard dependencies do not block an unrelated current queue.
- When there is no `READY/READY` or `IN_PROGRESS/RUNNING` Task, the highest current queue frontier is `DONE/PASSED` or `CANCELLED/BLOCKED`, and required delivery is satisfied, return exactly: `현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?` A current queue frontier in `BLOCKED` must report its blocker instead.
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
- Automatic commit, push, PR creation, or merge when neither the current user nor the selected Task explicitly authorizes it.
- Rewriting completed historical Task evidence merely to normalize old formatting.
- Claiming repository-local natural-language aliases work on a surface that does not load the managed routing contract.

## Acceptance Criteria

- [x] AC-01: `$kyw-task NNNN` and the managed-repository exact alias resolve exactly one existing Task, load its Task/Test/permanent truth and current Git/GitHub state, and require no generated mega-prompt.
- [x] AC-02: Exact selection of a `READY/READY` Task is execution confirmation and does not trigger a repeated confirmation unless a real unresolved decision or override conflict exists.
- [x] AC-03: Automatic selection deterministically resumes the single active Task or selects the first dependency-satisfied `READY/READY` Task; status mismatches, missing dependencies, and cycles fail closed.
- [x] AC-04: Continuous mode executes only pre-created Tasks serially in the current invocation, re-preflights between Tasks, persists a durable resume point, and stops at the first blocker or authority boundary.
- [x] AC-05: Appended current-user text is recorded and applied with explicit scope and precedence; it is not silently promoted to later Tasks or allowed to waive protected contracts.
- [x] AC-06: The configured model and reasoning effort remain unchanged unless the current user explicitly overrides them; observable provenance is recorded without guessing unavailable values.
- [x] AC-07: Repository outcome and external delivery state no longer create self-referential `DONE`/`Remaining` contradictions; exact GitHub evidence governs required delivery completion.
- [x] AC-08: Historical unrelated blockers do not freeze a new queue, while an active Task, current queue frontier, or hard dependency in `BLOCKED` stops advancement with an exact reason.
- [x] AC-09: The exact no-work message is returned only when the current queue has no selectable/active Task, its frontier is `DONE/PASSED` or `CANCELLED/BLOCKED`, and required delivery is satisfied; no Task is created.
- [x] AC-10: Existing ordinary-prompt behavior remains unchanged and incidental uses of “task” do not trigger execution.
- [x] AC-11: Pre-created Tasks 0031 through 0038 remain valid, selectable, and free of future-delivery self-reference after the contract migration; completed historical Tasks remain readable without forced rewrite.
- [x] AC-12: Focused, full, packed, and representative actual-Skill/routing invocation evidence pass on supported surfaces without publication.

## Plan

- [x] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [x] Read the permanent documents, this Task/Test pair, the pre-created 0031–0038 pairs, and only directly referenced implementation/evidence dependencies.
- [x] Treat the explicit selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [x] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [x] Implement the smallest dispatcher, dependency/status parser, override boundary, delivery-ledger integration, and queued-artifact migration that satisfy the acceptance criteria.
- [x] Run focused verification, then the locally reproducible stable/package checks implied by the final diff; leave mutable hosted delivery results to the external ledger.
- [x] Review every changed path against scope, tests, permanent-document impact, historical compatibility, and evidence honesty.
- [x] Set an evidence-backed repository outcome in this pair and leave any separately authorized external delivery to the exact GitHub ledger without embedding future facts in Task/Test.

## Decisions

- `$kyw-task NNNN` remains the portable fallback; natural-language aliases are a managed-repository routing feature, not a claim about every Codex surface.
- Exact or automatic selection of a pre-created `READY/READY` Task authorizes its repository lifecycle. `STANDARD` delivery alone authorizes no commit, push, PR, or merge action; that needs a current-user instruction or explicit selected-Task scope.
- Literal Task IDs in `Dependencies` are the only machine-interpreted hard dependency edges.
- A historical lower-numbered `BLOCKED` Task is not a queue blocker unless the current Task explicitly depends on it.
- Only one Task is active at any instant, including continuous mode; continuous execution is bounded to the current invocation and leaves durable state if interrupted.
- Task files own repository outcome and reproducible evidence. GitHub owns future PR/merge/post-merge delivery facts.
- Current configured model/effort is the default; no automatic downgrade is permitted.
- A paired current-contract marker will distinguish queue-aware artifacts from immutable legacy Tasks. Current-contract pairs declare only a static `STANDARD` or reasoned `NONE` delivery requirement; mutable delivery results remain outside Task/Test.
- The existing Task artifact core and thin adapter will own deterministic local dispatch. The packaged Skill/reference will own semantic override checks, model/effort preservation, serial re-preflight, and read-only GitHub ledger collection.

## Risks

- Overbroad natural-language matching could execute a Task accidentally.
- Free-form dependency text could be misread unless only literal Task references are interpreted.
- Historical blockers could freeze all future work if queue scope is based on numeric order rather than dependencies/frontier state.
- Applying one override to all queued Tasks could expand scope unexpectedly.
- External delivery inspection must not reinterpret CI success as behavioral acceptance.
- Changing the validator could invalidate historical evidence unless compatibility is explicit.

## Discoveries and Changes

- Task 0029 is `DONE/PASSED` with terminal `READY_FOR_APPROVAL`; PR #14, exact-head run `29970712571`, and exact-merge run `29970822270` are successful, so its hard dependency is satisfied.
- The queue-planning commit `3cbaac64c819071f166772fd9e8b64e50369a305` was already merged by PR #15. Exact-head run `30003608539` and post-merge `origin/main@f05578f6732babe3acea70facd1440fffcef2600` run `30003799341` passed all nine jobs.
- The planning branch and merge commit have the same tree. A clean Task branch was created from exact `origin/main@f05578f6732babe3acea70facd1440fffcef2600`; no pre-existing user changes were present.
- The pre-change validator accepted all 38 existing Task/Test pairs but did not resolve current status-pair consistency, hard dependencies, cycles, queue selection, delivery requirements, or short aliases.
- Before migration, every pre-created Task 0031–0038 mixed a repository-outcome Plan with future GitHub delivery language, and each TEST final review asked for evidence that could not exist inside the repository-outcome commit. Task 0038 additionally mapped future PR/merge proof into AC-09/T-09; the bounded contract-only migration keeps those stable IDs without implementing their outcomes.
- Independent review exposed and drove fail-closed fixes for malformed markers, header/path identity, symlinked dispatch paths, exact active/terminal dependency bypass, prior undelivered transitions, cancelled dependencies, complete handoff sections, ledger PR-to-merge identity, and the documented delivery-authority boundary.
- Task 0029 is immutable legacy evidence whose `Dependencies` mention historical blocked Tasks and whose handoff predates the new delivery boundary. The current queue must not recursively reinterpret legacy terminal prose or retroactively require the new contract.
- The current official Codex manual confirms that `AGENTS.md` is loaded as repository guidance, Skills support explicit `$skill` invocation on CLI/IDE/desktop surfaces, and `allow_implicit_invocation: false` keeps implicit Skill matching disabled. Repository aliases therefore belong in managed `AGENTS.md`, with `$kyw-task NNNN` as the portable fallback.

## Documentation Impact

- SPEC: Update user-visible invocation, queue selection, overrides, model/effort preservation, completion, and delivery-boundary behavior.
- ARCHITECTURE: Document routing scope, resolver inputs, status/dependency graph, one-active-Task state, queue frontier, and external delivery ledger.
- README: Document portable and repository-local short forms, bootstrap behavior, continuous-mode limits, and examples.
- AGENTS: Keep thin; add only invariant repository-local routing, queue, confirmation, and external-delivery rules.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim mutable delivery state.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- Verified Task 0029, current local/remote refs, PRs, exact-SHA Actions state, worktree cleanliness, Task inventory, and all existing pair validators.
- Read the permanent documents, current Task/Test pair, pre-created Tasks 0031–0038, current Skill/reference/templates/validator, and directly referenced dependency evidence.
- Entered execution from exact integrated main without changing the configured model or reasoning effort.
- Implemented anchored portable/managed invocation parsing, exact/automatic/continuous queue selection, paired-state and dependency validation, DRAFT/blocked re-entry, one-active enforcement, safe path/header checks, override preservation, and the exact no-work result.
- Added static current-contract Delivery policy, complete terminal handoff validation, legacy compatibility, local-expectation-bound GitHub ledger verification, and prior-terminal delivery gates.
- Migrated only the pre-created nonterminal Tasks 0031–0038 to the paired current contract without changing Tasks 0001–0029 or implementing future outcomes.
- Synchronized README, SPEC, ARCHITECTURE, root/generated AGENTS contracts, Skill/reference guidance, foundation checks, canonical templates, direct-install/packed adapter behavior, and regression coverage.
- Preserved all failed verification attempts, resolved every independent-review finding, and completed focused, full, lint, format, pack, packed-release, actual-routing, and final-diff checks.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- None known at planning time.
