---
name: kyw-task
description: Author a complete dependency-aware Task/Test set or finish one DRAFT pair. For explicit $kyw-task authoring; do not use for implementation, delivery.
---

# kyw Task Authoring

## Inputs and boundary

Goal-style explicit `$kyw-task` publishes the smallest justified complete `READY/READY` pair set and stops; `$kyw-task NNNN` accepts only `DRAFT/DRAFT`. Other states stay unchanged and return exact `$kyw-impl NNNN`. Managed Korean execution aliases belong to `kyw-impl`; execution needs a later `$kyw-impl NNNN`.

<!-- kyw-active-skill-guardrails:v1 -->

Exact `$kyw-task` alone activates; otherwise ordinary. Aligned work needs no duplicate confirmation. Baseline/Task/acceptance/scope/action/target/attempt/Skill/mode change gets an old/new warning: implementation, Task/Test, permanent-document, verification, delivery impacts, exact bounds, then zero-mutation wait. Only the trusted current user's immediate next unambiguous explicit reconfirmation of the unchanged warning advances mutable criteria; Skill/mode/route identity replacement expires; its own exact route is required; origin cannot self-confirm. Cancel/decline/ambiguity or stale/intervened/fact/bound drift clears/replaces it. Sync applicable mutable Task/Test and owners before the warned action; completion/cancel/stop/expiry deactivates. Never redispatch/chain Skills or relax system/platform safety, honest evidence, user work, delivered-pair immutability. Open answers align; DRAFT promotion keeps native confirmation.

This Skill owns inspection, adaptive decomposition, grilling, publication, and DRAFT authoring; mutate only returned pairs. Do not edit implementation/tests/configuration/permanent truth/existing Tasks; `kyw-impl` owns synchronization. Never auto-invoke another Skill.

## Inspect without writing

Read applicable `AGENTS.md` and selected/current pairs. Index or search headings in `README.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`; read only the owning permanent-document sections chosen by goal, scope, Documentation Impact, code, and dependencies. Fully read all permanent documents for rebaseline, redesign, broad scope, source conflict, ambiguous ownership, or insufficient truth; stop if a conflict remains unresolved.

Inspect relevant code/tests/manifests/commands, state, dependencies, and residue; preserve user work and do not ask for inspectable facts. Separate settled facts and current-user decisions from unresolved Task decisions. Write nothing while inspecting.

## Derive and settle the pair set

Keep one pair per independently verifiable outcome. Split only for independently shippable outcomes, distinct acceptance/decisions, dependency order, or likely multi-compaction work. Preserve explicit count, boundaries, order, titles, and dependencies when safe; otherwise give the minimum safe alternative and ask only when the user must choose.

Corrections to delivered contract-3 Tasks use new hard-dependent pairs; preserve old bytes. A correction depends on the delivered Task with `{"taskId":"NNNN"}`. Reuse `$kyw-grilling` only for unresolved intent or a user-owned blocker: one question and recommendation. Do not write while a required answer is unknown.

## Prepare complete READY pairs

Render complete pairs from canonical templates in memory; the adapter derives its key.

- Include identity/dependency fields, the contract marker exactly once per artifact, and set both statuses to `READY`.
- Fill every section, static `STANDARD` or reasoned `NONE`, and five-field provenance.
- Use stable unchecked `AC-NN` and `TODO` `T-NN` identifiers with complete mapping, failure/compatibility coverage, commands, honest evidence, and reasoned N/A entries only; never leave empty required content, bare None, comments, or template guidance.
- do not repeat the contract identity.

The ordinary production batch has exactly this outer schema:

```json
{"schemaVersion":1,"tasks":[{"title":"First outcome","taskMarkdown":"<complete Markdown>","testMarkdown":"<complete Markdown>","dependencies":[{"taskId":"0039"},{"taskTitle":"Earlier outcome"}]}]}
```

Dependency objects have one field; omit them or use `[]`. Explicit `key`/`taskKey` is caller compatibility only. Never guess IDs or hand-create directories.

## Publish atomically

Call the packaged adapter once:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs create-batch --tasks-root <repository>/docs/tasks (--batch-json <json> | --batch-file <existing external scratch path>)
```

Use an external file for multi-pair or large input, never the repository. Prevalidate and publish once. Expected failure rolls back batch-owned final paths only with complete ownership proof; otherwise fail closed. Validate paths, markers, and residue; do not post-edit. On failure, do not retry, reuse an ID, hand-create a replacement, or implement.

Read-only diagnosis and separately authorized recovery use:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs inspect-transaction --tasks-root <repository>/docs/tasks
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs recover-transaction --tasks-root <repository>/docs/tasks
```

## Report and stop

Report ordered IDs/titles/paths/dependencies; if eligible, print exactly one next command for the first eligible pair:

```text
$kyw-impl NNNN
```

Do not print several implementation commands, call `kyw-impl`, implement, edit permanent truth, or deliver.

## Existing DRAFT compatibility

Resolve exact `$kyw-task NNNN` without allocation. If not `DRAFT/DRAFT`, report state and `$kyw-impl NNNN` without editing. Otherwise complete, validate, summarize, then require explicit confirmation before promoting both statuses to `READY`. Preserve ID/path/contract and stop with `$kyw-impl NNNN`.
