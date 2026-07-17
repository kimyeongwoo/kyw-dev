---
name: kyw-task
description: Create, execute, or resume one session-sized kyw-dev Task through verified completion. Use only when the user explicitly invokes $kyw-task with a natural-language goal or four-digit Task ID; do not use for ordinary prompts, independent audits, installation work, or bulk backlog creation.
---

# kyw Task Workflow

## Inputs and modes

Accept either a natural-language goal or a four-digit Task ID supplied with an explicit `$kyw-task` invocation. Use the repository containing the current working directory unless the invocation names another target.

- Use `create(goal)` for a new outcome. Follow Phases 1 through 6, then execute the confirmed Task.
- Use `resume(task-id)` for an existing Task. Resolve exactly one matching directory and follow [Task Execution and Resume](references/execution.md).
- If the input could be either a goal or an ID, ask one clarification question with a recommendation and wait without writing.
- If the input is missing, ask for one narrowly scoped goal or four-digit Task ID with a recommended framing and wait.

Do not combine modes, run multiple Tasks, or implement an independent audit in one invocation. Read `references/execution.md` completely before starting or resuming implementation; do not load it for create-mode inspection or authoring alone.

## Mutation boundaries

Keep the repository read-only until one outcome is selected, relevant facts are inspected, and Task-level decisions are settled. Once the deterministic adapter publishes a pair, limit mutations to the returned new `TASK.md` and `TEST.md` paths.

Do not modify permanent documents, implementation files, target-product tests, configuration, package metadata, or any existing Task. Do not create multiple Task directories. Creating or editing the new pair is authoring, not permission to implement its Plan.

After the current Task is confirmed and enters execution, expand mutations only to its Task/Test pair, implementation and tests required by its acceptance criteria, and permanent documents whose durable meaning changed. Preserve pre-existing user changes and never edit another numbered Task or implement a future outcome.

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

Apply the installed `$kyw-grilling` protocol as the interview phase. Preserve dependency order, exactly one decision question per turn, one recommended answer with concise reasoning, user-owned decisions, and a wait after every question.

Ask only unresolved choices needed to make this Task independently implementable and verifiable, such as precise scope, visible edge behavior, compatibility, migration, failure handling, or verification. Skip product behavior, architecture, commands, and repository rules already settled in the permanent documents or inspected code. If a material fact is inaccessible, record it as a remaining unknown or blocker; do not turn it into a user preference.

Do not allocate or write while questions remain.

## Phase 4 - Author one DRAFT pair

Before allocation, derive:

- a concise title and single-sentence Goal;
- explicit dependencies;
- In Scope and nearby Out of Scope boundaries;
- observable acceptance criteria with sequential stable IDs `AC-01`, `AC-02`, and so on;
- an implementation Plan, Task-level Decisions, Risks, documentation-impact expectations, Remaining work, and a concrete Resume Point;
- initial test rows with stable IDs `T-01`, `T-02`, and so on, including method, level, an unexecuted status, required regressions, expected commands, and blank evidence.

Map every acceptance criterion to at least one initial test row. Include known failure paths and compatibility regressions. Once the pair is published, never renumber or reuse an acceptance or test ID; append a new ID when intent grows and explain any retired case.

Run the packaged adapter exactly once, passing every value as a separate process argument rather than interpolating user text into source code or a shell expression:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs create --tasks-root <repository>/docs/tasks --title <Task title>
```

Use the returned ID, slug, directory, and file paths. Do not hand-create the directory or rerun creation after a successful publication.

Replace all template guidance in both files with the prepared project-specific content. Keep both Status values `DRAFT`, keep acceptance boxes unchecked, keep test rows unexecuted with no fabricated evidence, and ensure `Completed` describes authoring only. Validate the pair with:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs validate --task-directory <new Task directory>
```

If validation or customization fails after publication, leave both files visibly `DRAFT`, report the exact pair and incomplete work, and stop. Do not delete or reuse the published Task number, create a replacement Task, or touch implementation files.

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

## Resume or execute an existing Task

When the argument is a four-digit ID, do not allocate an ID or create another pair. Read [Task Execution and Resume](references/execution.md) completely and follow it from repository-state verification through the appropriate lifecycle state. If the verified pair is still `DRAFT`, resume customization and Phase 5 confirmation on that existing pair only.

Use the current Task/Test pair as the resumable packet. Verify its recorded state against code, tests, permanent documents, status, and relevant diff; continue at its verified Resume Point without repeating Completed work. An explicit numeric execution/continuation request authorizes a confirmed `READY` Task unless the user requested inspection only.

## Failure and stop conditions

- Before publication, cancellation, an unresolved source conflict, an oversized unselected request, or inaccessible required facts must stop with no Task artifact.
- Adapter creation failures rely on its atomic rollback: either both files publish or no final Task directory remains.
- After publication but before confirmation, cancellation or authoring failure leaves the pair and its number in place as `DRAFT`; report recovery details and do not allocate another ID.
- During execution, persist failures, blockers, test evidence, Remaining, and Resume Point in the current pair before stopping.
- Do not invoke an audit, create proposed follow-on Tasks, install Skills, or implement work outside the current Task.
- Report `DONE`, `BLOCKED`, or `CANCELLED` only from the evidence gates in the execution reference; never infer success from an unexecuted check.
