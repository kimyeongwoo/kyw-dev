---
name: kyw-task
description: Create, execute, resume, or serially advance session-sized kyw-dev Tasks through verified completion. Use only when the user explicitly invokes $kyw-task or an applicable managed-repository AGENTS.md routes one exact Task alias; do not use for ordinary prompts, independent audits, installation work, or backlog creation.
---

# kyw Task Workflow

## Inputs and modes

Accept a natural-language goal or four-digit Task ID from explicit `$kyw-task`. With a loaded managed-repository `AGENTS.md`, also accept:

- `task NNNN 실행해줘` selects that existing Task;
- `task 진행해줘` resumes the one active Task, otherwise resumable `STANDARD` delivery, otherwise the lowest dependency-satisfied `READY/READY` Task;
- `남은 task 계속 실행해줘` repeats that selection serially for pre-created Tasks during this invocation.

These aliases are repository routing, not Skill matching. Keep `allow_implicit_invocation: false`; incidental text containing “task” never invokes this workflow. Without managed routing, use `$kyw-task NNNN`. Default to the repository containing the working directory.

- Use `create(goal, mode)` for new work: `CREATE_ONLY` authors; `CREATE_AND_EXECUTE` authors and starts one eligible Task. Plain goal-style `$kyw-task "<goal>"` keeps the historical create-and-execute default.
- Use `exact(task-id)` for one existing Task, then follow [Task Execution and Resume](references/execution.md).
- Use `next` or `continuous` only for the managed aliases above. They select existing current-contract Tasks and never allocate a Task.
- For missing or materially ambiguous input, ask one clarification question with one recommendation and wait without writing.

Create mode may author several Tasks but never executes them concurrently. `CREATE_AND_EXECUTE` enters at most one new Task; only continuous mode may process several pre-created Tasks, and it does so serially. Read `references/execution.md` completely before starting or resuming implementation, not during create-only authoring.

This Skill owns adaptive decomposition, Task authoring, and dispatch entry. `kyw-grilling` may help discover intent or resolve one blocking decision, but it owns neither decomposition nor file mutation. The execution reference is the canonical detailed procedure for selected work.

For any existing-Task form, pass the exact current-user invocation as a separate adapter argument before selecting:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs dispatch --tasks-root <repository>/docs/tasks --invocation <exact invocation text> --managed-routing <true|false> [--delivery-ledger-json <json>] [--delivery-expectations-json <json>] [--execution-preflight-json <json>]
```

Use `true` only with managed routing. Pass verified conflict, unexplained-work, drift, and user-decision findings inline; keep expectations and ledger separate. Honor blockers, fallback, and no-work; selected `IMPLEMENT`, `RESUME`, or `DELIVER` needs no ceremonial confirmation.

## Mutation boundaries

Stay read-only until target, facts, boundaries, mode, and Task decisions are settled. Create authoring may publish only the returned new Task/Test pair set. Do not edit permanent documents, implementation, tests, configuration, package metadata, or existing Tasks merely to author the set.

Create-only authority ends after atomic `READY/READY` publication and reporting. Create-and-execute authority expands only for the first dependency-satisfied returned Task through the execution reference. Do not implement another new pair or invoke continuous mode implicitly.

`create --title` and existing `DRAFT/DRAFT` pairs remain compatible low-level/resume paths. Adaptive create uses `create-batch`, never a post-publication DRAFT scaffold.

## Phase 1 - Inspect facts without writing

1. Resolve the repository and `AGENTS.md`; read `README.md`, `AGENTS.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`, stopping on conflict.
2. Inspect only relevant implementation, tests, manifests, commands, version-control state, Task inventory, and dependencies; record pre-existing changes.
3. Separate facts and settled decisions from unresolved Task decisions. Do not ask the user to repeat inspectable facts.
4. Check creation lock, queue validity, and any active Task blocking create-and-execute.

Do not create `docs/`, `docs/tasks/`, a lock, scratch file, or Task artifact during inspection.

## Phase 2 - Derive the adaptive pair set

Describe each candidate with one Goal. Keep one pair for one independently verifiable outcome, coherent acceptance set, valid standalone state, and realistic one-session path.

Create several when outcomes can ship or revert independently, acceptance sets separate, dependency order or separate decisions are required, or one Task is unrealistic. Derive the smallest dependency-aware set; do not split by file count or pretend-exact token estimates.

Do not stop at a decomposition proposal or ask the user to choose one outcome. The create result is the complete set. Preserve explicit current-prompt Task count, boundaries, order, titles, dependency relations, and create mode when they remain independently verifiable, truthful, consistent with permanent truth, and safe.

If an explicit structure violates those invariants, state the exact conflict and minimum safe alternative. Ask one decision question with one recommended answer only when the user must choose; otherwise use the minimum safe interpretation and proceed. Never silently ignore or rewrite the constraint.

## Phase 3 - Resolve only real blockers

Reuse the installed `$kyw-grilling` protocol only for unresolved intent or a genuine unresolved user-owned blocker. One progress turn gets exactly one question and one recommendation. Otherwise use repository evidence or a safe reversible choice. Skip settled product behavior, architecture, commands, and repository rules.

Do not allocate or write while a required answer remains unknown. Cancellation or inaccessible required facts stop with no new artifact.

## Phase 4 - Prepare complete READY pairs

Give each outcome a unique lowercase ASCII key in queue order. Use `taskKey` for this batch and exact `taskId` only for existing Tasks.

For every definition, prepare complete project-specific `TASK.md` and `TEST.md` Markdown in memory:

- put `{{TASK_ID}}` and `{{TASK_TITLE}}` in both headers and `{{TASK_DEPENDENCIES}}` in Task Dependencies;
- preserve `<!-- kyw-task-contract: 2 -->` and set both statuses to `READY`;
- include Goal, scope, Plan, decisions, risks, documentation impact, handoff, and static `STANDARD` or reasoned `NONE`;
- use stable unchecked `AC-01`, `AC-02` and `TODO` `T-01`, `T-02` identifiers with complete AC-to-test mapping, failure/compatibility coverage, planned commands, and no fabricated evidence;
- keep routine work concise with reasoned `Not applicable — <reason>` entries and no bare None/empty/reasonless content; retain necessary release/security evidence without a global cap.

The batch specification has exactly this outer shape:

```json
{"schemaVersion":1,"tasks":[{"key":"first-outcome","title":"First outcome","taskMarkdown":"<complete Markdown>","testMarkdown":"<complete Markdown>","dependencies":[{"taskId":"0039"},{"taskKey":"earlier-outcome"}]}]}
```

Each dependency object contains exactly one field. Omit dependencies or use an empty array when none exist. Do not guess final IDs or hand-create directories.

## Phase 5 - Publish the batch atomically

Run the packaged adapter exactly once for the complete set, including a one-item set:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs create-batch --tasks-root <repository>/docs/tasks (--batch-json <json> | --batch-file <existing scratch path>)
```

Pass JSON as one argument, or use a caller-owned temporary file outside the repository. Never interpolate user text into source or a shell expression, or store the specification in the repository.

The core must preallocate all contiguous IDs/paths, resolve dependencies, canonically validate every pair and the combined missing-edge/cycle graph, acquire one creation lock, recheck targets, stage and revalidate the full set, then publish it. Queue readers fail closed under the lock. Expected failure rolls every batch-owned final directory back and leaves no partial queue.

On success:

1. Use only returned IDs, paths, and dependencies; validate every directory once.
2. Confirm `READY/READY`, exact path creation, and no remaining lock/staging path.
3. Do not post-edit placeholders; complete content was validated before publication.

If publication fails, do not retry, reuse an ID, hand-create a replacement, or implement anything. Report that no batch-owned pair remains. `TASK_BATCH_ROLLBACK_FAILED` is a fail-closed blocker: preserve the creation lock and exact owned paths for recovery instead of claiming rollback.

## Phase 6 - Stop or execute one Task

For `CREATE_ONLY`, report ordered IDs, titles, paths, and dependencies and stop without implementation mutation.

For `CREATE_AND_EXECUTE`:

1. Reinspect status, returned pairs, dependencies, and delivery evidence.
2. Choose only the first hard-dependency-satisfied Task; if none, report the blocker and leave all `READY/READY`.
3. Read [Task Execution and Resume](references/execution.md) completely, enter `IN_PROGRESS/RUNNING`, and apply create-and-execute authority only to that Task and its ordinary declared `STANDARD` lifecycle.
4. Never activate a second pair; full continuation requires a later `남은 task 계속 실행해줘`.

## Compatible existing DRAFT authoring

When exact dispatch returns `AUTHOR` for one existing `DRAFT/DRAFT` pair, customize and validate that pair, summarize it, and require explicit confirmation before promoting both statuses to `READY`. Never allocate another ID; adaptive create still publishes atomically as `READY/READY`.

Follow the execution reference for existing READY implementation, active resume, blocker recheck, terminal reporting, delivery, and continuous transition. Never perform the independent audit owned by `$kyw-audit`.
