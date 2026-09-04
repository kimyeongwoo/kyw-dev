---
name: kyw-task
description: Author a complete dependency-aware Task/Test set or finish one DRAFT pair. For explicit $kyw-task authoring; do not use for implementation, delivery.
---

# kyw Task Authoring

## Inputs and boundary

Goal-style explicit `$kyw-task` publishes the smallest justified complete `READY/READY` pair set and stops; `$kyw-task NNNN` accepts only `DRAFT/DRAFT`. Other states stay unchanged with state-appropriate report-only guidance: repository work uses exact `$kyw-impl NNNN`, pending terminal `STANDARD` delivery uses exact `$kyw-deliver NNNN`, and satisfied/cancelled state gets no action. Do not invoke either Skill. Managed Korean execution aliases belong only to `kyw-impl`. Never auto-invoke another Skill.

<!-- kyw-active-skill-guardrails:v1 -->

Exact `$kyw-task` alone activates. Aligned work needs no duplicate confirmation. A baseline, Task/acceptance, scope, action, target, attempt, or Skill/mode change gets a warning covering implementation, Task/Test, permanent-document, verification, and delivery impacts, then a zero-mutation wait. Route replacement requires its own exact route. Only the immediately next unambiguous explicit reconfirmation of that unchanged warning advances. Cancellation/decline/ambiguity clears or replaces it. Sync applicable mutable Task/Test and owners before the warned action; the originating turn cannot self-confirm; completion/cancel/stop/expiry deactivates. Never redispatch/chain Skills or weaken system/platform safety, honest evidence, user work, or delivered-pair immutability. DRAFT promotion retains native confirmation.

This Skill owns inspection, adaptive decomposition, grilling, publication, and DRAFT authoring; mutate only returned pairs. Do not edit implementation/tests/configuration/permanent truth; `kyw-impl` owns synchronization.

## Inspect and settle without writing

Read applicable `AGENTS.md` and selected/current pairs. Index or search headings in `README.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`; read only the owning permanent-document sections selected by goal, scope, Documentation Impact, code, and dependencies. Read all permanent documents for rebaseline, redesign, broad or conflicting work, or ambiguity; stop on unresolved conflict. Inspect code, tests, state, dependencies, residue, and user work; do not ask for inspectable facts. Separate settled facts and current-user decisions. Write nothing while inspecting.

Use one pair per verifiable outcome; split only for independently shippable outcomes, acceptance/decision bounds, dependencies, or multi-compaction work. Preserve explicit count, boundaries, order, titles, and dependencies when safe; ask only when the user must choose. Corrections to delivered contract-3 or contract-4 Tasks use new hard-dependent pairs. A correction depends on the delivered Task with `{"taskId":"NNNN"}`. Preserve old bytes. Reuse `$kyw-grilling` only for unresolved intent or a user-owned blocker: one question and recommendation. Do not write while a required answer is unknown.

Each prospective `STANDARD` pair needs one user-settled stable SemVer; never infer, increment, or substitute it. Fresh reads must find no conflict across npm history, bounded attempts, tags, Release-by-tag, package/plugin, or queue claims. Bad or incomplete evidence blocks. `NONE` is version-free.

## Prepare and publish complete READY pairs

Render canonical templates in memory; the adapter derives its key. Include identity/dependencies, the contract-4 marker exactly once per artifact, every section, and set both statuses to `READY`. `STANDARD` has one `- Release version: x.y.z` and ledger; `NONE` has neither. Use five-field provenance, stable unchecked `AC-NN` and `TODO` `T-NN` identifiers, complete mapping, failure/compatibility coverage, commands, honest evidence, and reasoned N/A entries only; do not repeat the contract identity; never leave empty required content, bare None, comments, or template guidance.

The ordinary production batch is:

```json
{"schemaVersion":1,"tasks":[{"title":"First outcome","taskMarkdown":"<complete Markdown containing {{TASK_RELEASE_VERSION}}>","testMarkdown":"<complete Markdown>","releaseVersion":"1.2.3","dependencies":[{"taskId":"0039"},{"taskTitle":"Earlier outcome"}]}]}
```

Dependency objects have one field; omit or use `[]`. `releaseVersion` is `STANDARD`-only, matches the Delivery token, and is forbidden for `NONE`. `key`/`taskKey` is caller compatibility only. Never guess IDs or hand-create directories.

## Publish atomically

Call once:

```text
node <kyw-task-skill-directory>/scripts/task-artifacts.mjs create-batch --tasks-root <repository>/docs/tasks (--batch-json <json> | --batch-file <existing external scratch path>)
```

Use an external file for multi-pair or large input. Prevalidate and publish once. Expected failure rolls back batch-owned final paths only with complete ownership proof; otherwise fail closed. Validate residue; do not retry, reuse an ID, hand-create a replacement, post-edit, or implement.

Read-only diagnosis and separately authorized recovery use `inspect-transaction --tasks-root` and `recover-transaction --tasks-root` on the same adapter.

## Report and stop

Report ordered IDs/titles/paths/dependencies and print exactly one next command for the first eligible pair. Do not print several implementation commands, call `kyw-impl`, deliver, or invoke the command:

```text
$kyw-impl NNNN
```

## Existing DRAFT compatibility

Resolve exact `$kyw-task NNNN` without allocation. Non-`DRAFT/DRAFT` is report-only with its applicable implementation/delivery command. Otherwise complete, validate, summarize, then require explicit confirmation before promoting both statuses to `READY`. Preserve ID/path/contract; stop with `$kyw-impl NNNN`.
