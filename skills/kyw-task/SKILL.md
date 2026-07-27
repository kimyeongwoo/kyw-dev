---
name: kyw-task
description: Author a complete dependency-aware kyw-dev Task/Test set or finish one DRAFT pair. Use only for explicit $kyw-task authoring; do not use for implementation, delivery, ordinary prompts, audits, installation, or backlog creation.
---

# kyw Task Authoring

## Inputs and boundary

A goal-style explicit `$kyw-task` always publishes the smallest justified complete `READY/READY` pair set and stops.

Accept `$kyw-task NNNN` only for one existing `DRAFT/DRAFT` pair. For any other state, make no change and return the exact `$kyw-impl NNNN` migration command. The three managed Korean execution aliases belong to `kyw-impl` repository routing and never invoke this Skill.

Keep `allow_implicit_invocation: false`; incidental “task” prose remains ordinary. `create-only` is redundant. A create-and-execute request still stops after authoring and requires a new explicit `$kyw-impl NNNN`. Ask one question with one recommendation only for a real blocker.

This Skill owns inspection, adaptive decomposition, genuine Task-level grilling, atomic allocation, complete pair validation/publication, reporting, and legacy DRAFT authoring.

For a new outcome, mutate only the returned pair set. Do not edit implementation, tests, configuration, package metadata, permanent documents, existing Tasks, Git/PR/CI, or delivery state. Record expected documentation impact; `kyw-impl` owns actual synchronization. Never auto-invoke another Skill.

## Inspect without writing

1. Resolve the repository and applicable `AGENTS.md`.
2. Read `README.md`, `AGENTS.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`; stop on conflict.
3. Inspect only relevant code, tests, manifests, commands, Git state, Task inventory, and dependencies. Preserve user work; do not ask for inspectable facts.
4. Check creation residue/lock, queue validity, and active-Task state.
5. Separate settled facts and current-user decisions from genuine unresolved Task decisions.

Do not create `docs/`, `docs/tasks/`, a lock, a scratch file, or a Task artifact during inspection.

## Derive and settle the pair set

Keep one pair for one independently verifiable outcome and coherent acceptance set. Split only for independently shippable outcomes, separate acceptance/decisions, dependency order, or unsafe session scope—never file count or guessed tokens.

Preserve explicit count, boundaries, order, titles, and dependencies when truthful, verifiable, consistent, and safe. Otherwise state the conflict and minimum safe alternative; ask only when the user must choose.

Reuse `$kyw-grilling` only for unresolved intent or a user-owned blocker: one question and recommendation. Do not write while a required answer is unknown.

## Prepare complete READY pairs

Give each new outcome a unique lowercase ASCII `taskKey`. Prepare complete project-specific Task and Test Markdown in memory:

- include `{{TASK_ID}}` and `{{TASK_TITLE}}` in both headers and `{{TASK_DEPENDENCIES}}` in Task Dependencies;
- include the current contract marker exactly once per artifact and set both statuses to `READY`;
- include every canonical section, static `STANDARD` or reasoned `NONE`, and five-field model provenance;
- use stable unchecked `AC-NN` and `TODO` `T-NN` identifiers with complete mapping, failure/compatibility coverage, planned commands, and no fabricated evidence;
- use reasoned N/A entries only; never leave empty required content, bare None, comments, or template guidance;
- do not repeat the contract identity in examples, comments, quotations, criteria, or test prose.

The batch has exactly this outer schema:

```json
{"schemaVersion":1,"tasks":[{"key":"first-outcome","title":"First outcome","taskMarkdown":"<complete Markdown>","testMarkdown":"<complete Markdown>","dependencies":[{"taskId":"0039"},{"taskKey":"earlier-outcome"}]}]}
```

Each dependency object has exactly one field. Omit dependencies or use an empty array when none exist. Never guess final IDs or hand-create directories.

## Publish atomically

Call the single packaged adapter once for the complete set:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs create-batch --tasks-root <repository>/docs/tasks (--batch-json <json> | --batch-file <existing external scratch path>)
```

Use an external file for multi-pair or large input and never put it in the repository. The shared core prevalidates every pair/edge, allocates identities, acquires one versioned manifest/lock, rechecks queue, dependency sources, targets, and prepared hashes, and publishes the whole set. Expected failure rolls back batch-owned final paths only with complete ownership proof; otherwise it preserves evidence and readers fail closed.

On success, validate every returned path, prove one marker occurrence per file and no transaction residue, and do not post-edit. On failure, do not retry, reuse an ID, hand-create a replacement, or implement.

Read-only diagnosis and separately authorized proof-based recovery use the same adapter:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs inspect-transaction --tasks-root <repository>/docs/tasks
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs recover-transaction --tasks-root <repository>/docs/tasks
```

## Report and stop

Report ordered IDs, titles, paths, and dependencies. If a created pair is dependency-satisfied, print exactly one next command for the first eligible pair:

```text
$kyw-impl NNNN
```

Do not print several implementation commands, call `kyw-impl`, edit permanent documents, implement, verify application behavior, commit, push, open a PR, observe CI, merge, or deliver.

## Existing DRAFT compatibility

Resolve and validate exact `$kyw-task NNNN` without allocating another ID. If it is not `DRAFT/DRAFT`, report its state and `$kyw-impl NNNN` without editing. If it is DRAFT, inspect relevant facts, complete and validate the pair, summarize it, and require explicit confirmation before promoting both statuses to `READY`. Preserve its ID, path, and artifact contract; then stop with exactly one `$kyw-impl NNNN` next command.

Never perform the independent audit owned by `$kyw-audit`.
