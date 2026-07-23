---
name: kyw-task
description: Create, execute, resume, or serially advance session-sized kyw-dev Tasks through verified completion. Use only when the user explicitly invokes $kyw-task or an applicable managed-repository AGENTS.md routes one exact Task alias; do not use for ordinary prompts, independent audits, installation work, or backlog creation.
---

# kyw Task Workflow

## Inputs and modes

Accept a natural-language goal or a four-digit Task ID supplied with an explicit `$kyw-task` invocation. In a kyw-managed repository, also accept an exact alias only when the applicable `AGENTS.md` routing contract is loaded:

- `task NNNN 실행해줘` selects that existing Task;
- `task 진행해줘` resumes the one active Task, otherwise the lowest current `DONE/PASSED` Task with resumable `STANDARD` delivery, otherwise the lowest dependency-satisfied current `READY/READY` Task;
- `남은 task 계속 실행해줘` repeats that selection serially for pre-created Tasks during this invocation.

These anchored aliases are repository routing, not implicit Skill matching. Keep `allow_implicit_invocation: false`; incidental text containing “task” never invokes this workflow. If managed routing is unavailable, direct the user to `$kyw-task NNNN` instead of claiming an alias worked. Use the repository containing the current working directory unless the invocation names another target.

- Use `create(goal)` for a new outcome. Follow Phases 1 through 6, then execute the confirmed Task.
- Use `exact(task-id)` for an existing Task. Resolve exactly one matching directory, then author, implement, resume, recheck, or report its verified state through [Task Execution and Resume](references/execution.md).
- Use `next` or `continuous` only for the managed aliases above. They select existing current-contract Tasks and never allocate a Task.
- If the input could be either a goal or an ID, ask one clarification question with a recommendation and wait without writing.
- If the input is missing, ask for one narrowly scoped goal or four-digit Task ID with a recommended framing and wait.

Do not combine modes, run Tasks concurrently, or implement an independent audit in one invocation. Only continuous mode may process multiple Tasks, and it does so serially. Read `references/execution.md` completely before starting or resuming implementation; do not load it for create-mode inspection or authoring alone.

This Skill owns Task authoring and dispatch entry. The execution reference is the canonical detailed procedure for selected existing work; do not mirror that procedure here.

For any existing-Task form, pass the exact current-user invocation as a separate adapter argument before selecting:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation <exact invocation text> --managed-routing <true|false> [--delivery-ledger-json <json>] [--delivery-expectations-json <json>] [--execution-preflight-json <json>]
```

Use `true` only with managed routing. Pass verified conflict, unexplained-work, drift, and user-decision findings inline; keep expectation and ledger separate. `SELECTED` action is `AUTHOR`, `IMPLEMENT`, `RESUME`, `DELIVER`, or `RECHECK_BLOCKER`; the three lifecycle actions carry authority and ceremonial-confirmation fields. Honor blockers, fallback, and no-work. Selected READY or resumable DONE work needs no ceremonial confirmation; DRAFT still requires Phase 5.

## Mutation boundaries

Keep the repository read-only until one outcome is selected, relevant facts are inspected, and Task-level decisions are settled. Once the deterministic adapter publishes a pair, limit mutations to the returned new `TASK.md` and `TEST.md` paths.

Do not modify permanent documents, implementation files, target-product tests, configuration, package metadata, or any existing Task. Do not create multiple Task directories. Creating or editing the new pair is authoring, not permission to implement its Plan.

After confirmation or existing-Task selection, the execution reference owns the expanded mutation, preservation, delivery, and terminal-state boundaries. Read it before any implementation mutation.

## Phase 1 - Inspect facts without writing

1. Resolve the target repository and applicable `AGENTS.md` instructions.
2. Read `README.md`, `AGENTS.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`. If required permanent truth is missing or the sources conflict materially, stop and request reconciliation instead of silently choosing a claim.
3. Inspect only code, tests, manifests, commands, current version-control status and relevant diff, and explicit Task dependencies needed to understand this goal. Inspect existing Task directory names for allocation, but do not load unrelated completed Tasks.
4. Record pre-existing changed paths so authoring changes are not confused with user changes. Never expose secrets encountered during inspection.
5. Separate established facts and settled permanent decisions from unresolved Task-level decisions. Do not ask the user to repeat facts that inspection can establish.

Do not create `docs/`, `docs/tasks/`, a lock file, or any draft artifact during inspection.

## Phase 2 - Apply the size gate

Express the requested result as one Goal sentence and test it against the permanent sizing policy. Keep one Task only when it has one independently testable outcome, one coherent acceptance set, a valid standalone repository state, and a realistic one-session path with at most one compaction.

Split when outcomes can ship or revert independently, separate subsystems need separate decisions, the test matrix separates naturally, more than one compaction is likely, or no single Goal sentence describes the work. Do not decide from file count or a pretend-exact token estimate.

For an oversized request:

1. Propose a small ordered set of independently testable Task outcomes, with dependencies and a concise reason for each boundary.
2. Recommend the first outcome that leaves the repository valid on its own.
3. Ask exactly one selection question and wait.
4. Do not allocate an ID, run the adapter, create a directory, or write any file before the user selects one outcome.

After selection, restart inspection and the size gate for only that outcome. Never create the other proposed Tasks automatically.

## Phase 3 - Grill Task-level decisions

Apply the installed `$kyw-grilling` protocol in dependency order. A genuine unresolved user-owned blocker gets exactly one decision question per turn, one recommended answer, and a wait; otherwise use evidence or a safe reversible choice. Skip product behavior, architecture, commands, and repository rules already settled by documents or inspection. Record inaccessible facts as unknowns or blockers, not preferences.

Do not allocate or write while questions remain.

## Phase 4 - Author one DRAFT pair

Before allocation, derive title, one Goal, dependencies, scope boundaries, Plan/decisions/risks, documentation impact, handoff, and static `STANDARD` or reasoned `NONE` delivery. Add stable IDs `AC-01`, `AC-02` and stable IDs `T-01`, `T-02` with method, level, unexecuted status, regressions, commands, and blank evidence.

Map every acceptance criterion to at least one initial test row, including failures and compatibility. Append IDs; never renumber or reuse them. For the one artifact type, keep standard, documentation-only, and bug-fix Tasks concise: use `Not applicable — <reason>`, never bare `None`/empty/reasonless content. ACs/matrix stay substantive; release/security evidence has no global length cap.

If the user cancels or required facts remain inaccessible before publication, stop with no artifact and do not run the adapter.

Run the packaged adapter exactly once, passing every value as a separate process argument rather than interpolating user text into source code or a shell expression:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs create --tasks-root <repository>/docs/tasks --title <Task title>
```

Use the returned ID, slug, directory, and file paths. Do not hand-create the directory or rerun creation after a successful publication.

Replace all template guidance in both files with the prepared project-specific content while preserving the paired current-contract markers. Keep both Status values `DRAFT`, keep acceptance boxes unchecked, keep test rows unexecuted with no fabricated evidence, and ensure `Completed` describes authoring only. Validate the pair with:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs validate --task-directory <new Task directory>
```

If validation or customization fails after publication, leave both files visibly `DRAFT`, report the exact pair and incomplete work, and stop. Do not delete or reuse the published Task number, create a replacement Task, or touch implementation files.

If the adapter fails before publication, rely on its atomic rollback and report that no final pair was created. Cancellation or authoring failure after publication leaves the same pair and number in `DRAFT`.

## Phase 5 - Confirm shared understanding

Present one current-summary confirmation containing:

- Goal, dependencies, In Scope, and Out of Scope;
- the acceptance-criterion-to-test-row mapping;
- known risks, remaining unknowns, and expected documentation impact;
- the exact DRAFT paths and confirmation-dependent `DRAFT -> READY` transition;
- a reminder that implementation has not started and that confirmation will authorize this current Task to enter execution.

Ask the user to confirm this exact summary and recommend correcting any mismatch first. The initial invocation, selection of a split outcome, an earlier interview answer, or a request to implement immediately is not confirmation of the current summary.

Until confirmation, keep both files `DRAFT` and make no implementation change. If the user revises intent, update both DRAFT files while preserving published IDs, validate again, present the revised summary, and request confirmation again.

## Phase 6 - Promote to READY and execute

Proceed only after explicit confirmation of the current summary.

1. Re-read the new pair, relevant repository status, and changed-path diff. If either file or a material inspected fact changed outside this workflow, reconcile the difference and obtain confirmation again.
2. Confirm that only the new pair was changed by authoring and that the traceability validator succeeds.
3. Change Task Status and Test Status from `DRAFT` to `READY` in one edit operation when available. Do not change acceptance or test-row execution states.
4. Validate the pair again. Never report `READY` unless both files contain `READY` and validation succeeds.
5. Read [Task Execution and Resume](references/execution.md) completely, use the current-summary confirmation as execution authorization, and follow its `READY` entry path without broadening scope.

For an existing pair, use the dispatch action as the handoff: resume Phase 4 customization of the same `DRAFT/DRAFT` pair, validate it, and then continue to Phase 5; follow the execution reference for implementation, resume, blocker recheck, terminal reporting, continuous transition, and all execution stop conditions. Do not allocate another ID.
