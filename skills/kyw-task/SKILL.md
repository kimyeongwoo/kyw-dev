---
name: kyw-task
description: Author a complete dependency-aware kyw-dev Task/Test set or finish one DRAFT pair. Use only for explicit $kyw-task authoring; do not use for implementation, delivery.
---

# kyw Task Authoring

## Inputs and boundary

A goal-style explicit `$kyw-task` always publishes the smallest justified complete `READY/READY` pair set and stops.

Accept `$kyw-task NNNN` only for one `DRAFT/DRAFT` pair. For any other state, make no change and return the exact `$kyw-impl NNNN` migration command. The managed Korean execution aliases belong to `kyw-impl`. Keep `allow_implicit_invocation: false`; incidental “task” prose stays ordinary, and create-and-execute stops after authoring and needs a new `$kyw-impl NNNN`.

This Skill owns inspection, adaptive decomposition, genuine Task-level grilling, atomic allocation, complete pair validation/publication, reporting, and legacy DRAFT authoring. For a new outcome, mutate only the returned pair set. Do not edit implementation, tests, configuration, permanent documents, existing Tasks, Git/PR/CI, or delivery. Record expected documentation impact; `kyw-impl` owns actual synchronization. Never auto-invoke another Skill.

## Inspect without writing

Read every applicable `AGENTS.md` and selected/current Task/Test pair. Index or search headings in `README.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`; use the goal, scope, Documentation Impact, changed code, and dependencies to read only the owning permanent-document sections. Fully read all existing permanent documents for rebaseline, major redesign, broad cross-owner scope, source conflict, ambiguous/missing ownership, or insufficient targeted truth. Stop if a conflict remains unresolved.

Inspect only relevant code, tests, manifests, commands, Git state, Task inventory, dependencies, creation residue, queue validity, and active-Task state. Preserve user work; do not ask for inspectable facts. Separate settled facts and current-user decisions from genuine unresolved Task decisions.

Do not create `docs/`, `docs/tasks/`, a lock, a scratch file, or a Task artifact during inspection.

## Derive and settle the pair set

Keep one pair per independently verifiable outcome. Split only for independently shippable outcomes, separate acceptance/decisions, dependency order, or work likely to require more than one compaction—never file count or guessed tokens. Preserve explicit count, boundaries, order, titles, and dependencies when truthful, verifiable, consistent, and safe; otherwise state the conflict and minimum safe alternative, and ask only when the user must choose.

Corrections to delivered contract-3 Tasks use new hard-dependent pairs; preserve the old pair bytes. Reuse `$kyw-grilling` only for unresolved intent or a user-owned blocker: one question and recommendation. Do not write while a required answer is unknown.

## Prepare complete READY pairs

For each outcome, render complete project-specific Markdown from the canonical Task/Test templates in memory. The packaged adapter delegates deterministic portable internal-key derivation to the core's sole canonical owner; ordinary authoring never asks the user or model to invent or shorten one.

- include `{{TASK_ID}}` and `{{TASK_TITLE}}` in both headers and `{{TASK_DEPENDENCIES}}` in Task Dependencies;
- include the current contract marker exactly once per artifact and set both statuses to `READY`;
- fill every canonical section, static `STANDARD` or reasoned `NONE`, and the Test template's five-field model provenance;
- use stable unchecked `AC-NN` and `TODO` `T-NN` identifiers with complete mapping, failure/compatibility coverage, planned commands, no fabricated evidence, and reasoned N/A entries only; never leave empty required content, bare None, comments, or template guidance;
- do not repeat the contract identity in examples, comments, quotations, criteria, or test prose.

The ordinary production batch has exactly this outer schema:

```json
{"schemaVersion":1,"tasks":[{"title":"First outcome","taskMarkdown":"<complete Markdown>","testMarkdown":"<complete Markdown>","dependencies":[{"taskId":"0039"},{"taskTitle":"Earlier outcome"}]}]}
```

Each dependency object has exactly one field. Omit dependencies or use an empty array when none exist. A correction depends on the delivered Task with `{"taskId":"NNNN"}`. Explicit `key`/`taskKey` fields are low-level compatibility only and remain caller-controlled. Never guess final IDs or hand-create directories.

## Publish atomically

Call the single packaged adapter once for the complete set:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs create-batch --tasks-root <repository>/docs/tasks (--batch-json <json> | --batch-file <existing external scratch path>)
```

Use an external file for multi-pair or large input, never the repository. Before any transaction, lock, staging, or ID/path allocation, the core derives keys and completely prevalidates the batch; one transaction atomically publishes all pairs. Expected failure rolls back batch-owned final paths only with complete ownership proof; otherwise evidence remains and readers fail closed.

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
