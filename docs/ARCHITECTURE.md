# kyw-dev Architecture

## 1. Purpose

This document defines how `kyw-dev` is structured to satisfy `SPEC.md`. It describes stable boundaries and flows, not chronological implementation steps.

## 2. System context

```text
GitHub repository
        │ source + releases
        ▼
npm package: kyw-dev (or scoped fallback)
        ├───────────────┐
        │               │
        ▼               ▼
Direct CLI install      Codex marketplace/plugin install
user/project Skills     plugin cache with bundled Skills
        │               │
        └───────┬───────┘
                ▼
        Codex discovers kyw-* Skills
                ▼
        Target software repository
        ├─ README.md
        ├─ AGENTS.md
        ├─ docs/SPEC.md
        ├─ docs/ARCHITECTURE.md
        └─ docs/tasks/NNNN-*/
```

`kyw-dev` has no server component in MVP and sends no project data to an external service.

## 3. Architectural principles

### A-01 — Skills contain reasoning workflows; scripts contain deterministic mechanics

Use `SKILL.md` for interview, decision, documentation, and review instructions. Use Node scripts only for operations that must be deterministic, such as path resolution, task number allocation, installation ownership, atomic copying, metadata validation, and fixture testing.

### A-02 — Progressive context loading

Each Skill is independently focused. `AGENTS.md` stays thin. Detailed templates and procedures live in Skill `references/` and `assets/`, loaded only when relevant.

### A-03 — Explicit invocation for heavyweight workflows

`kyw-init`, `kyw-task`, `kyw-audit`, and `kyw-grilling` declare `allow_implicit_invocation: false`. A managed project `AGENTS.md` may explicitly route only the anchored `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘` forms into `kyw-task`; this repository router does not enable general implicit Skill matching. Ordinary prompts remain ordinary, and a surface without that loaded contract uses `$kyw-task NNNN`.

### A-04 — Non-destructive by default

Existing project documents and installed files are inspected before modification. CLI-owned files are tracked by metadata and hashes. Generated documents are semantically updated by Codex, not blindly replaced by a package upgrade.

### A-05 — No lifecycle-script dependency

Plugin distribution through npm must work when package lifecycle scripts are not executed. The package is complete as packed; direct CLI execution occurs only when the user explicitly runs `npx`/`npm exec` or an installed binary.

### A-06 — One Task is the context boundary

A Task directory is the resumable execution packet. Exactly one Task may be active. Continuous dispatch changes the boundary only after the current Task reaches a repository terminal state and its required external delivery gate passes; it never runs Tasks in parallel or outside the current host invocation. Completed Task folders are historical evidence, not mandatory context for later Tasks. Durable knowledge must be promoted to permanent documents.

## 4. Top-level package structure

```text
kyw-dev/
├─ .gitattributes
├─ .github/
│  └─ workflows/ci.yml
├─ .codex-plugin/
│  └─ plugin.json
├─ skills/
│  ├─ kyw-grilling/
│  │  ├─ SKILL.md
│  │  ├─ agents/openai.yaml
│  │  └─ references/
│  ├─ kyw-init/
│  │  ├─ SKILL.md
│  │  ├─ agents/openai.yaml
│  │  ├─ references/
│  │  └─ assets/
│  ├─ kyw-task/
│  │  ├─ SKILL.md
│  │  ├─ agents/openai.yaml
│  │  ├─ references/
│  │  │  └─ execution.md
│  │  ├─ assets/
│  │  └─ scripts/
│  └─ kyw-audit/
│     ├─ SKILL.md
│     ├─ agents/openai.yaml
│     └─ references/
│        └─ audit.md
├─ templates/
│  ├─ project/
│  └─ task/
├─ src/
│  ├─ cli/
│  └─ core/
├─ bin/
│  └─ kyw-dev.mjs
├─ test/
│  ├─ fixtures/
│  │  └─ distribution/
│  │     ├─ fresh-session-project/
│  │     └─ marketplace-root/.agents/plugins/marketplace.json
│  ├─ unit/
│  ├─ integration/
│  └─ distribution.test.mjs
├─ eval/
│  └─ grilling/
│     ├─ baseline.json
│     ├─ benchmark.v1.json
│     ├─ benchmark.v2.json
│     ├─ benchmark.v3.json
│     ├─ benchmark.v4.json
│     ├─ benchmark.v5.json
│     ├─ benchmark.v6.json
│     ├─ benchmark.v7.json
│     ├─ benchmark.v8.json
│     ├─ benchmark.v9.json
│     ├─ benchmark.v10.json
│     ├─ baselines/upstream-grilling/SKILL.md
│     ├─ rubric.v1.json
│     ├─ scenario.schema.v1.json
│     ├─ result.schema.v1.json
│     ├─ result.schema.v2.json
│     ├─ result.schema.v3.json
│     └─ scenarios/
├─ scripts/
│  ├─ audit-smoke.mjs
│  ├─ evaluator-process.mjs
│  ├─ grilling-eval.mjs
│  ├─ release-gate-isolation.mjs
│  ├─ grilling-eval/
│  └─ development-only validation commands
├─ docs/
├─ package.json
└─ legal files
```

The `templates/` directory is the canonical template source for deterministic tests and CLI packaging. A Skill may reference its own assets or the packaged templates through scripts, but template duplication must be checked for drift.

Root `eval/`, `scripts/`, and `test/` are development-only verification surfaces. They validate the package but are excluded from the npm tarball. Runtime and packaged Skill code must not import them.

`scripts/release-gate-isolation.mjs` owns the development-only direct/marketplace release lifecycle. Each attempt creates one approved native temporary root, rejects every lifecycle target that is not an absolute, real, link-free strict descendant, and compares targets against normal profile `.agents`, default/configured Codex roots, and default/configured npm userconfig identities using native case rules. Windows comparison is case-insensitive and separator-normalized. The runner constructs isolated user, Codex, npm, process-temp, and XDG state without mutating its own environment; every child receives that state explicitly. Cleanup accepts only that attempt's original root identity directly below its approved parent after a complete link/type check.

Protected snapshots are in-memory and attempt-local. They retain a protected label, normalized bounded relative path or category, added/removed/modified/type-changed kind, entry type, metadata identity or content digest where applicable, and only the names of exact known attribution markers. Normal agents/npm files and named Codex control trees use content digests without retaining or emitting contents; unreadable entries retain bounded metadata/error identity. Other Codex session/log/cache trees retain recursive path/type structure rather than full active payload hashes. Classification evaluates the complete difference set before diagnostic capping, while output contains only safe labels, relative paths, change kinds/types, known markers, and digest prefixes—never absolute normal paths, credential values, or protected contents.

The attribution result is exactly `CLEAN`, `ISOLATION_VIOLATION`, or `AMBIENT_STATE_CHANGED`. `CLEAN` requires no protected delta, no parent protected-environment mutation, and no guard, snapshot, lifecycle, or cleanup failure. A violation requires positive deterministic evidence: an exact normal managed Skill/ownership path, an exact `kyw-dev`/`kyw-dev-local`/managed-Skill identifier in protected Codex or agents state, exact packed Skill bytes, or mutation of the runner process's protected environment keys. Generic Codex, unrelated agents, or unmarked npm-userconfig drift is ambient and remains fail-closed/inconclusive. A first ambient result alone triggers one unchanged immediate retry; the retry owns a fresh root and fresh snapshots and discards the first attempt's product result while retaining bounded outcome history. A violation or any guard, snapshot, child, package, marketplace, or cleanup failure is never retried.

This boundary uses no daemon, watcher, filesystem/process/OS tracing, ambient process scan, snapshot database, event journal, telemetry, or normal-state repair. The standalone runner resolves and protects actual normal-state locations from its inherited environment. Deterministic distribution integration instead supplies a temporary synthetic protected-state fixture through the same inherited-environment/location resolver; that fixture remains outside every runner-created lifecycle root and does not weaken standalone defaults.

The positive npm `files` allowlist also excludes repository Tasks/docs, the removed `DOCUMENT_BUNDLE.txt` bootstrap inventory, local marketplace fixtures, generated archives, credential/config files, and machine-local paths. Release validation compares an exact dry-run inventory, extracts a real tarball created in an isolated temporary directory, scans packed text for credential-shaped values and absolute local paths, and verifies the project and Matt Pocock legal notices by content and SHA-256.

The packaged deterministic mechanics are split into three core modules:

- `src/core/template-contracts.mjs` implements the canonical template registry and enforces token rendering, required-section contracts, current-contract and legacy Task/Test status rules, static delivery-requirement parsing, acceptance-to-test traceability, and evidence validation.
- `src/core/task-artifacts.mjs` owns Task directory inventory, max-plus-one ID allocation, bounded ASCII slug generation, cross-platform path containment, atomic Task/Test scaffolding, file-backed validation, hard-dependency graph construction, and deterministic exact/automatic queue resolution.
- `src/core/skill-installation.mjs` owns direct-install source inventory and hashing, user/project scope resolution, ownership metadata, conflict inspection, journaled file transactions and recovery, ownership-safe uninstall, tool detection, and doctor diagnostics.

The artifact module depends on the template-contract module. The installation module inventories the same two core files and canonical templates as direct-install runtime inputs but does not import their Task logic. No core module depends on the CLI, Skills, or development-only validation surfaces.

`skills/kyw-task/scripts/task-artifacts.mjs` is a thin packaged process adapter for the core artifact module's create, validate, and read-only resolve operations. It parses explicit arguments and reports structured results, but owns no numbering, slug, template, validation, dependency, selection, or file-write logic. In a plugin/npm tree it imports the package-root core; in a direct-Skills tree it falls back to `.agents/skills/.kyw-dev/runtime/src/core/`. This keeps deterministic mechanics in the core modules while giving the reasoning Skill a stable invocation surface in both distribution layouts.

`skills/kyw-task/references/execution.md` is the packaged semantic state-machine reference for exact, automatic, and continuous Task execution. `SKILL.md` loads it only after create-mode confirmation or an existing-Task dispatch. It owns reasoning gates for repository and GitHub preflight, current-Task scope, appended override checks, model/effort preservation, documentation impact, live Task/Test evidence, compaction handoff, final diff coverage, terminal repository status, delivery gating, and serial transition; it does not duplicate deterministic artifact mechanics.

`skills/kyw-audit/references/audit.md` is the packaged semantic reference for an independent Task review. `SKILL.md` resolves one explicitly supplied Task ID, locks bare read-only or exact-`--fix` repair mode, and loads the reference before inspection. The reference owns baseline fallback, stable finding classification, acceptance/evidence reproduction, scope and durable-document comparison, the default zero-write boundary, explicit bounded repair, affected-check reruns, and the final audit verdict. It consumes existing Task validators as evidence but adds no deterministic runtime module or production dependency.

## 5. Plugin manifest

Required path:

```text
.codex-plugin/plugin.json
```

MVP manifest responsibilities:

- stable plugin identifier `kyw-dev`;
- semantic version matching `package.json`;
- description, `Kim Yeongwoo` publisher metadata, and the verified public repository/homepage;
- `skills: "./skills/"`;
- install-surface metadata suitable for a productivity/developer workflow plugin.

The release manifest describes the implemented workflows rather than foundation stubs, exposes only the actual `Interactive` and `Write` capabilities, and provides three bounded starter prompts for init, Task, and audit. It uses only fields accepted by the current official plugin format. Unconfirmed email, privacy/terms, and branding metadata remain absent until real values and files exist.

MVP does not include `mcpServers`, `apps`, or `hooks`. Those fields may be added only through an explicit future architecture decision.

A build/test check must fail when plugin and npm versions differ.

`package.json` is the runtime source for product version and the npm source for package name, Node engine range, public repository URLs, author, executable, and packed file boundary. The plugin manifest mirrors name/version/license/author/repository identity, the CLI reads its displayed version from the packed package metadata, and direct-install ownership records that same package name/version. Validation fails on drift across those surfaces.

## 6. Skill architecture

## 6.1 Shared Skill contract

Every Skill directory contains:

```text
SKILL.md
agents/openai.yaml
```

`SKILL.md` front matter contains at least:

- `name` matching the directory;
- a concise `description` with clear trigger and non-trigger scope.

`agents/openai.yaml` contains:

- display name;
- short description;
- optional default prompt;
- `policy.allow_implicit_invocation: false`.

Skill instructions must state explicit inputs, outputs, stop conditions, and file mutation boundaries.

## 6.2 `kyw-grilling`

Responsibility: decision interview only.

Inputs:

- idea, plan, design, or ambiguous Task;
- repository facts available to inspect.

Outputs:

- conversation-level settled decisions;
- explicit remaining unknowns;
- user confirmation of shared understanding.

It is stateless by itself and writes no files. Wrappers decide how to materialize outcomes.

## 6.3 `kyw-init`

Responsibility: permanent-document initialization/adoption/re-baseline.

Dependencies:

- grilling protocol;
- project-document responsibilities and templates.

Mutation boundary:

```text
README.md
AGENTS.md
docs/SPEC.md
docs/ARCHITECTURE.md
```

It may create `docs/` but does not create implementation code or all numbered Tasks.

## 6.4 `kyw-task`

Responsibility: Task authoring, exact and automatic dispatch, serial queue progression, synchronization, and verification.

Modes:

```text
create(goal)
exact(task-id)
automatic-next()
continuous()
```

Mutation boundary includes:

- current Task and Test files;
- Task implementation files;
- affected permanent documents;
- tests required by the Task.
- explicitly named pre-created nonterminal Task pairs only when the selected Task requires a bounded contract migration.

It must not implement future Tasks or silently broaden scope; a contract migration changes their workflow metadata only.

During `create(goal)`, the mutation boundary is narrower: inspection, sizing, and Task-level grilling occur without writes; authoring may then change only the one newly published Task/Test pair. Both files remain `DRAFT` until the user confirms the current shared-understanding summary, then move together to `READY`. Implementation files, permanent documents, existing Tasks, and follow-on Task proposals stay read-only during authoring. Execution and resume expand the boundary only in their later workflow phase.

The portable existing-Task entry is `$kyw-task NNNN`. A loaded managed `AGENTS.md` may route the anchored aliases as follows:

```text
task NNNN 실행해줘          → exact(NNNN)
task 진행해줘               → automatic-next()
남은 task 계속 실행해줘      → continuous()
```

The router matches only those anchored forms, with any following current-user text retained as an appended override. It does not route incidental prose containing `task`. Because direct Skill installation does not modify project documents, repositories without the managed routing contract and surfaces that do not load it must use the portable form.

After confirmation, create mode may continue into execution. Exact mode resolves one existing four-digit Task; selecting a current-contract `READY/READY` pair is implementation confirmation, while a different active Task blocks selection. Exact DRAFT and BLOCKED pairs may be selected only for authoring or condition recheck. Automatic mode resumes the sole `IN_PROGRESS/RUNNING` pair when its state is safe, otherwise selects the lowest-numbered dependency-satisfied `READY/READY` pair. Continuous mode repeats automatic selection only after the current Task and required delivery transition finish. It creates no Task, keeps at most one active pair, and stops when the host invocation ends.

Queue-aware pairs carry `<!-- kyw-task-contract: 2 -->` in both files. Their valid state pairs are:

```text
DRAFT / DRAFT
READY / READY
IN_PROGRESS / RUNNING
DONE / PASSED
BLOCKED / BLOCKED
CANCELLED / BLOCKED
```

Any marker mismatch, unsupported pair, or multiple active pair fails closed. Completed historical artifacts without the current marker retain their legacy validation meaning and are not rewritten or recursively reinterpreted as a current queue.

The resolver reads literal `Task NNNN` references only from the Task `Dependencies` section. Those references form directed hard-dependency edges; other prose is an evidence or implementation input. It rejects duplicate Task IDs, missing references, current-graph cycles, and unsatisfied edges. A terminal legacy dependency is evaluated from its recorded repository outcome without importing historical evidence prose as new edges. This boundary keeps unrelated historical blockers outside the current queue while still stopping on a selected Task's active or hard-dependency blocker.

The current queue frontier is the highest-numbered current-contract Task. If no active or ready pair exists, a blocked or inconsistent frontier reports its exact blocker. A `DONE/PASSED` or `CANCELLED/BLOCKED` frontier produces the exact no-work response only after its static delivery requirement is satisfied.

Only text appended by the current user to the dispatch form is an override. It applies to the first selected Task unless that user explicitly scopes it to every remaining Task. The semantic workflow may accept a bounded method, ordering, or check constraint, but reports a conflict rather than allowing an override to waive acceptance, truthful evidence, safety, user-work preservation, or separately gated external mutation. The active session's model and reasoning effort are inherited unchanged unless the current user explicitly overrides them; observable provenance is recorded and unavailable values are never guessed.

Execution mutations remain limited to the current pair, implementation/tests required by its acceptance criteria, and permanent documents whose durable meaning changed. The only other-pair exception is an explicitly scoped, contract-only migration of named pre-created nonterminal Tasks; their outcomes remain unimplemented. Resume verifies Completed work against repository evidence and begins at Resume Point or the first valid Remaining item instead of blindly repeating recorded actions.

Deterministic helper needs:

- list valid Task directories;
- allocate next non-reused four-digit ID;
- create a safe slug;
- scaffold Task/Test atomically;
- validate required sections, current-contract markers, delivery declarations, and paired statuses;
- extract hard dependencies and reject missing references or cycles;
- resolve exact, active, next-ready, blocked-frontier, and no-work local states.

The packaged `skills/kyw-task/scripts/task-artifacts.mjs` adapter exposes those existing core operations to the Skill without duplicating them.

Every current Task declares one static delivery requirement:

```text
STANDARD → GitHub PR/Actions exact-SHA state is the canonical external ledger
NONE     → the Task records a reason
```

Task/Test owns repository outcome and reproducible behavioral evidence. GitHub owns mutable pull-request head, review, merge, and Actions facts. The resolver receives local repository/base/outcome-SHA expectations separately from the GitHub ledger and requires their exact identity relations. `DONE/PASSED` may therefore precede delivery, but the dispatcher cannot advance while `STANDARD` delivery is unknown, pending, failed, or unbound to local expectations. A fresh local, remote, and GitHub preflight occurs at every serial transition. CI success satisfies delivery only; it cannot replace Task acceptance evidence. `STANDARD` is not mutation authority: commit, push, PR, or merge actions require a current-user instruction or explicit selected-Task scope. Publication, force push, rerun, branch deletion, and other separately authorized actions remain outside dispatch authority.

## 6.5 `kyw-audit`

Responsibility: independent consistency and evidence review.

Inputs:

- exact `$kyw-audit NNNN` or `$kyw-audit NNNN --fix` invocation;
- permanent docs;
- current code/diff/history and test artifacts.

Outputs:

- locked `read-only` or `repair` mode;
- findings grouped by scope, behavior, architecture, docs, and test evidence;
- conversation-only findings and limitations in read-only mode;
- bounded in-scope fixes only in exact-`--fix` repair mode;
- final `PASS` or `BLOCKED`.

It does not invent new product requirements. Out-of-scope findings become recommendations for a new Task.

The mode is locked before inspection. A bare invocation remains read-only through the final response and cannot be upgraded by natural-language repair wording or by an easy finding. It treats Task status, checked acceptance criteria, Test rows, command logs, and handoff summaries as claims and establishes a comparison baseline from non-mutating Git status/diff/history when available, or records a reproducible snapshot, patch, artifact, inventory, or hash fallback. If the available baseline cannot establish required scope or behavior, the audit blocks instead of implying recovered Git evidence.

Findings receive stable `F-NN` IDs and exactly one category (`scope`, `behavior`, `architecture`, `docs`, or `test-evidence`), severity (`BLOCKER`, `ERROR`, or `WARNING`), evidence, expected/actual state, scope classification, action, and status. An unmapped acceptance criterion, unsupported PASS row, stale durable document, uncovered meaningful branch, or out-of-scope implementation is an error even when a generic suite passes.

In read-only mode, the complete mutation boundary is empty: no tracked, untracked, generated, Task/Test, or durable-document byte changes; no repository report; and no attempted mutating command. The command boundary also covers temporary, control, cache, snapshot, and isolated-copy state. A rerun executes only when established byte-preserving; potentially writing checks use retained evidence or are skipped with limitations reported honestly. Preparing or cleaning a disposable copy belongs outside a bare audit and is never an in-invocation workaround.

In repair mode, mutation begins only after the audit records an unambiguous finding already required by current Task and permanent truth and presents a bounded plan naming finding IDs, intended paths, and verification. Eligible changes remain within the audited Task/Test pair, its required implementation/tests/configuration, and permanent documents whose durable meaning is restored or changed. The audit preserves failed evidence, applies the smallest fix, reruns the affected acceptance-specific check plus required regressions, and re-audits the final diff. It never edits or absorbs out-of-scope work, allocates a follow-on ID, or writes a separate audit report artifact.

```text
explicit $kyw-audit NNNN
        ↓
read-only baseline + Task/Test validation
        ↓
acceptance/evidence + implementation/scope/docs review
        ↓
conversation-only findings + safe reruns + residual risk
        ↓
PASS or BLOCKED; repository bytes unchanged

explicit $kyw-audit NNNN --fix
        ↓
read-only baseline + findings
        ├─ clear in-scope error → bounded plan → repair → affected checks → re-audit
        └─ out-of-scope/unsafe/unproven → record + follow-on recommendation only
        ↓
no open blocker/error and every evidence gate proven?
        ├─ yes → PASS
        └─ no  → BLOCKED
```

`PASS` requires a sufficient baseline, consistent sources, complete acceptance mapping, reproducible required evidence, meaningful branch/error-path coverage, synchronized scope and durable documents, verified repairs, complete final-diff coverage, and a valid final Task/Test pair. A non-blocking warning may remain only when it does not undermine those gates; there is no third audit verdict.

## 7. Project document ownership model

```text
Behavior / requirement / business rule     → SPEC
Component / boundary / dependency / flow   → ARCHITECTURE
Setup / command / configuration / usage    → README
Repository-wide Codex invariant            → AGENTS
Current work scope / plan / handoff         → TASK
Test intent / execution evidence            → TEST
```

The owner document is updated first when a durable decision changes, followed by Task/Test alignment and implementation.

### Instruction authority and projections

Each normative rule family has one owner. A surface that cannot load that owner may carry only an identified, minimal projection; deterministic tests keep the projection semantically aligned.

| Rule family | Canonical authority | Permitted projection |
|---|---|---|
| User-visible Task behavior and evidence meaning | `docs/SPEC.md` | Concise commands and outcomes in `README.md`; short invocations in `CODEX_PROMPTS.md` |
| Repository-wide workspace, routing, model/delivery preservation, change/document discipline, Task/Test lifecycle, stable-check, and completion invariants | Root or generated `AGENTS.md` | The canonical project `AGENTS.md` template, tested against this repository's routing invariant bullets |
| Task creation and authoring phases | `skills/kyw-task/SKILL.md` | UI metadata may name the invocation but carries no procedure |
| Detailed selected existing-Task preflight, mutation, evidence-recording, delivery-ledger, queue-advancement, and reporting procedure | `skills/kyw-task/references/execution.md` | `SKILL.md` contains only the dispatch handoff and reference link |
| Artifact shape and default evidence fields | Canonical Task/Test templates | `src/core/template-contracts.mjs` enforces the template-defined contract; existing artifacts retain compatible historical state |
| Current scope, discoveries, handoff, and reproducible evidence | The active `TASK.md` / `TEST.md` pair | None; mutable GitHub delivery remains in its external ledger |

`CODEX_PROMPTS.md` is maintainer convenience, not normative authority. It must invoke repository-resident procedure rather than restate it. `README.md` remains a user projection and links to the owning sources instead of duplicating execution checklists.

## 8. Task lifecycle architecture

```text
requested outcome
      ↓
inspect permanent docs + relevant code
      ↓
grill unresolved Task decisions
      ↓
size check ── too large ──> propose multiple Tasks and stop
      ↓
allocate ID + create TASK/TEST atomically
      ↓
DRAFT
      ↓ user confirms shared understanding
READY
      ↓ implementation starts
IN_PROGRESS / RUNNING
      ├─ discovery → update docs / Task / Test
      ├─ possible compaction → persist handoff fields
      └─ verification + final diff coverage audit
            ├─ evidence complete → DONE / PASSED
            └─ unmet condition   → BLOCKED / BLOCKED
```

Existing-Task dispatch wraps that lifecycle:

```text
exact ID / managed automatic alias
              ↓
current-contract inventory + status/dependency validation
              ├─ one active → resume it
              ├─ no active  → lowest eligible READY/READY
              └─ invalid or blocked frontier → stop with reason
              ↓
one Task executes to repository terminal state
              ↓
Delivery NONE or exact-SHA STANDARD delivery satisfied?
              ├─ no  → stop; GitHub remains the mutable ledger
              └─ yes → report, or re-preflight next Task in continuous mode
```

Task status and Test status remain separate fields but current-contract pairings are closed. Implementation can be blocked while verification is unavailable; cancellation records `CANCELLED/BLOCKED`. A current pair's static delivery requirement does not add a third repository lifecycle state.

During execution, discoveries update Task intent and Test coverage together; durable meaning is routed to its permanent owner before implementation alignment. Before compaction or interruption, the workflow persists Completed, Remaining, Resume Point, Blockers, current decisions/document impact, repository state, commands, results, row evidence, and unverified risks in the existing pair. Terminal `DONE`/`PASSED` requires mapped acceptance criteria, executed required checks, synchronized durable documents, a complete final diff coverage review, reproducible evidence, final pair validation, and no repository work left in Plan, Remaining, or Resume Point. An unavailable required check produces recorded `BLOCKED` status instead of inferred success. Required external delivery is checked afterward from GitHub and never inserted as self-referential future repository work.

Atomic Task creation resolves and rejects a symlinked tasks root, renders and validates both documents before publication, writes them into a unique hidden sibling staging directory, then acquires an exclusive creation lock. While holding the lock it rechecks the allocated ID and target absence before renaming the complete directory into place. Expected failures remove the staging directory, so a final Task directory never exposes only one of the two contract files.

## 9. Test contract architecture

The Task acceptance criteria and Test matrix form a traceability graph:

```text
Acceptance criterion AC-N
        ├─ Test T-N1
        └─ Test T-N2

Final diff behavior B-N
        └─ existing Test or newly added Test
```

Validation checks should detect:

- acceptance criterion with no test reference;
- test row with no intent/source;
- PASS without evidence;
- DONE Task with non-PASSED required test rows;
- missing final coverage review;
- stale documented command after CLI behavior changes.

The canonical Test scaffold includes `Model Provenance` with model identifier, requested alias, reasoning effort, concrete Codex surface, and Codex version. Every field carries its value and an `OBSERVED` or `UNAVAILABLE` basis. A known absent user override is observable as `NOT_REQUESTED`; hidden values remain `UNAVAILABLE`, and a CLI version cannot stand in for a different active surface. The validator requires this block in the canonical template and validates it whenever present on a current-contract pair, while leaving an unmarked legacy pair's same-named free-form section under its historical meaning and keeping already-created current pairs without the block readable. Execution adds the block to a pre-existing pair before recording model-dependent evidence, so provenance adds no path beyond the existing `TEST.md` in the runtime context contract.

## 10. CLI architecture

## 10.1 Runtime

- Node.js 22 or newer using ESM.
- Prefer Node built-in modules and built-in test runner.
- Keep production dependencies at zero unless a dependency materially reduces cross-platform risk and is justified in the active Task.

## 10.2 Command dispatch

```text
bin/kyw-dev.mjs
      ↓
argument parser
      ├─ install
      ├─ update
      ├─ uninstall
      ├─ doctor
      ├─ --help
      └─ --version
```

The dependency-free internal parser accepts exactly one mutating command and one required scope. Only uninstall accepts `--force`; `doctor` accepts no option. Dispatch calls `src/core/skill-installation.mjs` and never changes the process working directory.

## 10.3 Scope resolution

User scope:

```text
$HOME/.agents/skills/
```

Project scope:

```text
<git-root>/.agents/skills/
```

Project scope realpath-resolves the current directory and walks parents until it finds a real `.git` directory or file. User and project scope then resolve the existing scope root to its physical path; a scope-root leaf that is itself a symlink/junction is rejected. The derived `.agents` and `skills` components must be real directories whose real paths equal their expected physical paths. The CLI does not spawn Git or follow a symlinked marker. Project installation fails with a helpful message if no repository root is found; an explicit target path remains a future interface.

## 10.4 Ownership metadata

Direct installation writes ownership metadata at:

```text
<home-or-git-root>/.agents/skills/.kyw-dev-install.json
```

It records:

- schema version 1 and package name/version;
- user or project scope;
- install and last-update timestamps;
- the four installed Skill names and paths;
- a sorted path/SHA-256 record for every managed file.

Metadata paths use non-empty normalized relative POSIX separators and may name only the four managed Skill containers or `.kyw-dev/runtime/`. Validation is host-independent: POSIX, drive, drive-relative, UNC, traversal, backslash/mixed-separator, Windows-reserved/malformed, exact duplicate, Unicode-normalization/case-colliding, and file-as-directory-prefix forms are rejected even on a case-sensitive host. Resolution reconfirms that each path is a strict descendant of the selected Skills root. The same manifest-identity rules apply to package inventory and transaction old/new lists, preventing malformed metadata or journals from authorizing access to unrelated Skills.

## 10.5 Atomic update strategy

1. Resolve the package root physically, reject linked or unsupported source entries, validate portable path identities, and build a sorted hash inventory without touching the target.
2. Resolve and validate the physical scope/Skills chain, recover any trustworthy prior transaction, and compare installed bytes, types, links, case identities, and unknown paths with ownership metadata.
3. Exclusively publish a journal naming the owning process, force policy, UUID-named sibling stage/backup directories, current and ownership hashes, then stage each source only after revalidating its link-free ancestry/type/hash. Revalidate source and staged bytes after copy. Another live owner is a conflict, not a recovery target.
4. Create and hash-check the commit-started marker. Immediately before every destructive rename, revalidate the relevant root and parent chain, regular-file type, absence/presence expectation, ownership hash, and current content; validate the renamed copy again afterward.
5. Move old metadata to backup and publish hash-checked new metadata last. Uninstall omits new metadata and moves only existing regular files named by valid ownership metadata; force records both the installed ownership hash and actual modified hash when they differ.
6. Re-prove metadata ownership and the complete published state, publish an exact hash-checked commit-complete marker, then clean up. Recursive cleanup accepts only the UUID paths named by the journal and only when every present entry is an expected real directory or hash-matching regular file; an unknown/link/special entry leaves a diagnosable recovery state.
7. Before commit, discard only validated staged content. During an incomplete commit, remove only journal-hash-matching new bytes and restore type/hash-proven backups. After commit-complete, retain the revalidated new state and finish cleanup. Journal and marker unlinks also revalidate exact type/content immediately before mutation.

Install/update refuse unmanaged, missing, modified, unknown, colliding, or unsafe state. Normal uninstall does the same. Force may continue past missing/modified owned entries and preserved unknown entries, but its removal set remains existing regular files proven by ownership metadata; it never removes an unknown entry, unrelated Skill, known-path link/junction, or unsupported type. Empty known directories are pruned one at a time. Transaction cleanup never recursively deletes the broad `.agents/skills` directory or follows a link.

Node's path-based standard-library API cannot provide a portable directory-handle-relative `openat` transaction, so a fully privileged same-user attacker continuously replacing components can still win a final check/use race. The implementation narrows this residual risk with physical trusted roots, link-free component checks, before/after identity reads, exclusive markers, atomic same-root renames, and immediate mutation-time revalidation; inability to prove the expected state fails closed and preserves the transaction for inspection.

## 10.6 Doctor and error flow

`doctor` builds and validates the packaged source inventory, checks Node and detectable npm/Codex versions, inspects user scope and the enclosing project scope when available, validates the physical scope chain, ownership metadata, portable path identities, filesystem types/links, and Skill front matter/UI policy, compares installed hashes and unknown paths, detects reserved transaction artifacts and duplicate Skill names, and probes the nearest existing scope directory for read/write access. It performs no directory creation, recovery, cleanup, chmod, write, rename, or deletion; tests compare content plus type/mode/size/mtime/ctime snapshots before and after healthy and hostile diagnostics.

The CLI uses stable numeric categories: 0 success, 1 usage, 2 unsupported runtime, 3 scope resolution, 4 conflict, 5 malformed package/install state, 6 filesystem/permission, and 7 recovery required. Doctor returns the highest applicable error category; warnings such as an undetected optional command or version drift do not alone make diagnostics fail.

## 11. Installation and distribution architecture

## 11.1 Direct npm CLI path

```text
npm registry
   ↓ npx/npm exec explicitly runs bin
kyw-dev CLI
   ↓ copy managed Skill directories + namespaced support
user or repository .agents/skills
```

This path is intended for Codex CLI/IDE users who want direct Skill discovery. The four visible `kyw-*` directories are copied byte-for-byte. The CLI also maps the two canonical Task core modules and six templates into `.agents/skills/.kyw-dev/runtime/`. That hidden namespace is ownership-managed support, not a fifth Skill. The `kyw-task` adapter prefers its package-root import and falls back to this runtime only after direct installation.

## 11.2 Plugin marketplace path

```text
marketplace.json
   ↓ source = npm or GitHub
plugin package
   ↓ .codex-plugin/plugin.json
bundled skills/
```

The npm tarball itself must already contain all plugin files because marketplace npm downloads do not rely on lifecycle scripts.

Before publication, `test/fixtures/distribution/marketplace-root/.agents/plugins/marketplace.json` is the canonical local catalog. It points at `./plugins/kyw-dev` and declares explicit availability, authentication timing, and category metadata. The distribution E2E delegates to the fail-closed release-isolation runner, copies the extracted npm tarball beneath its approved marketplace root, passes a fresh child-only `CODEX_HOME`, adds the marketplace through the Codex CLI, installs the plugin, and confirms that all four cached `SKILL.md` files match packed bytes. Plugin and marketplace removal complete before the exact temporary root is removed. Neither the fixture, runner, nor tests enter the npm tarball.

## 11.3 Duplicate-install policy

`doctor` reports a conflict when the same `kyw-*` Skill names exist in both active direct-install scopes:

- project `.agents/skills`;
- user `~/.agents/skills`.

An installed plugin surface remains reportable when future tooling exposes a trustworthy location. The tool does not automatically remove another installation source. Duplicate diagnosis is read-only.

## 11.4 Release gate

`package.json` is configured to permit a future public publication rather than blocked by `private`: `private` is false and `publishConfig` fixes public access to the npm public registry. That metadata state is not a release-readiness, approval, or publication verdict. The repository provides no npm lifecycle script that can install the plugin or publish the package. `npm run release:ci` runs the stable verification suite and then creates, allowlist-checks, extracts, and smoke-tests the real npm tarball in a validated temporary directory. `npm run release:check` reuses that packed gate and then runs `npm publish --dry-run --json`; the dry run is non-publishing local evidence and is not part of required CI. The actual `npm publish --access public` command remains outside automation and requires explicit approval after a fresh name, identity, tarball, and version check.

The stricter local `node ./scripts/release-gate-isolation.mjs` gate requires Codex and runs the complete extracted-tarball user/project/force-preservation and marketplace lifecycle. Its lexical guard runs before target creation or child execution, its materialized guard rechecks realpaths and filesystem types before every spawn, and protected-state evidence is compared and attributed before attempt cleanup. A successful product lifecycle cannot override an unsafe path, a violation, persistent ambient/inconclusive state, unavailable required Codex CLI, another lifecycle failure, or unverified cleanup identity. Only a first ambient result receives the one unchanged fresh-attempt retry. Public CI keeps Codex optional, but the same runner still requires the complete direct lifecycle and all isolation/attribution gates.

The first-release notes, approval checklist, exact commands, and rollback/deprecation procedure live in Task 0009 rather than a new permanent release document. A bad published version is corrected with a new semantic version and normally deprecated rather than removed; npm unpublish is an exceptional, policy-bound, irreversible response.

## 11.5 Credential-free continuous integration

`.github/workflows/ci.yml` is the only required CI workflow. It runs for pull requests, pushes to `main`, and optional manual dispatch with workflow-level `contents: read`, ref-scoped cancellation, explicit job timeouts, disabled checkout credential persistence, and no secret reference. Root `.gitattributes` forces text checkout materialization to LF on every runner because foundation parsing, deterministic packing, and the repository format contract operate on LF bytes. The repository intentionally has no dependencies or lockfile, so jobs do not run `npm ci` or enable a package-manager cache.

```text
pull request / main push / manual dispatch
        ├─ stable matrix
        │    ├─ Node 22 LTS × ubuntu/macos/windows
        │    ├─ Node 24 LTS × ubuntu/macos/windows
        │    └─ Node 26 Current × ubuntu compatibility
        │         └─ test + lint + format:check + pack:check
        ├─ packed release: Node 24 LTS × ubuntu
        │         └─ release:ci → stable suite + real packed-byte inspection
        └─ aggregate required result
```

The stable matrix runs native temporary-directory CLI and direct-install tests on each host. Codex marketplace coverage remains isolated and executes only where the CLI exists; its absence cannot skip the preceding packed user/project lifecycles or fail a public contributor for missing authentication. The packed job logs the real archive's file count, size, and SHA-256, rejects development/lifecycle content, and runs the extracted CLI. It cannot publish, create a tag or release, merge, or mutate branch-protection settings. Repository administrators may require only the aggregate credential-free result without making a model-backed job part of public PR admission.

## 12. Template architecture

Templates define section contracts, not final project content.

### Project templates

- `SPEC.md`: headings and guidance comments/placeholders;
- `ARCHITECTURE.md`: headings and guidance comments/placeholders;
- `AGENTS.md`: compact invariant rules, exact repository-local Task routing, and replaceable command slots;
- `README.md`: project entry sections.

### Task templates

- `TASK.md`: paired current-contract marker, static delivery requirement, repository lifecycle, and handoff fields;
- `TEST.md`: paired current-contract marker, traceability, and repository evidence fields.

`kyw-init` and `kyw-task` must customize templates from inspected facts and settled decisions. They must not leave unexplained placeholders in completed documents.

The six canonical files are `templates/project/{README,AGENTS,SPEC,ARCHITECTURE}.md` and `templates/task/{TASK,TEST}.md`. Project-name, verification-command, Task-ID, and Task-title tokens are explicit inputs. The reserved `<!-- kyw-task-contract: 2 -->` marker is durable machine-readable contract identity rather than authoring guidance; other explanatory HTML comments must be removed or resolved when final project-specific content is materialized.

## 13. Validation architecture

### Grilling evaluation harness

The `eval/grilling/` boundary owns an immutable upstream source pin, the exact vendored baseline bytes, frozen rubric v1, result schemas v1/v2/v3, predeclared bounded benchmark configurations, and synthetic scripted scenarios. Result schema v1 preserves Task 0011 evidence; v2 adds explicit reasoning-effort evidence; v3 additionally requires repository-local Skill-install scope and observable exact-source reading before scoring. The pinned `mattpocock/skills` commit, upstream source path, source SHA-256, MIT copyright, and byte-identical license checksum are validated offline. `skills/kyw-grilling/` remains production input to the harness; evaluation code does not rewrite or tune it.

`scripts/grilling-eval.mjs` is an explicit model-cost gate over the dependency-free runner in `scripts/grilling-eval/`. Normal test execution imports only deterministic parsing, grading, schema, redaction, hashing, and fake-Codex integration paths. Public CI never invokes a model-backed command.

```text
pinned scenario + exactly one Skill variant
        ↓ materialize + commit
temporary Git repository/.agents/skills + temporary HOME
        ↓
temporary CODEX_HOME + explicit auth copy or single-run CODEX_API_KEY
        ↓
codex exec --json --sandbox read-only --ignore-user-config --ignore-rules
  + strict explicit model reasoning effort
        ↓ exact installed SKILL.md must be read on turn 1
        ↓ thread.started.thread_id
codex exec resume <thread_id> for each scripted reply
        ↓
redact events/final messages → verify fixture hash + Git status → grade rubric v1
        ↓
atomic publication under ignored eval/grilling/results/<run-id>/
```

The runner capability-checks the installed CLI rather than inferring behavior from its version. It installs one evaluated Skill below the temporary Git root's official repository-local `.agents/skills` discovery path, commits that evaluator input, excludes `.agents` from the scenario-content hash, and requires turn-one command output to contain the exact installed Skill source. Missing proof aborts publication instead of grading a fallback interview. The initial turn explicitly requests the read-only sandbox; resume inherits that session boundary and must emit the same thread ID. Every scored run passes the same explicit reasoning effort through strict configuration on the initial and resumed turns. Result schema v3 records timestamps, Codex version, exact requested model and reasoning effort, fixed config, repository Skill scope/read proof, per-turn JSONL/final messages and usage, aggregate usage, fixture hashes, Git cleanliness, Skill-install count, auth-source immutability, and rubric observations.

Task 0012's frozen benchmark configuration fixes the exact CLI/model/effort, baseline and scenario revisions, rubric checksum, repetition count, execution controls, token definition, and thresholds before model execution. Its deterministic report reopens every completed run, reparses JSONL usage, regrades the retained final-message transcripts, verifies scenario/config/isolation parity, calculates aggregate and per-scenario medians, and records a SHA-256 for every `run.json` and complete run artifact tree. Reporting does not weaken the rubric or substitute for manual review of critical flags and material deltas.

Normal `HOME`, user Skills, user config, and normal `CODEX_HOME` are never writable evaluation state. File-based auth is used only when the caller explicitly names a source; it is copied into the evaluator-owned temporary Codex home, never logged, and checked for source immutability. Tool subprocesses inherit no environment variables. Generated artifacts contain redacted synthetic transcripts, are Git-ignored, and are rejected before publication if credential-shaped values or raw local home paths remain.

Only the long-running model-child path is asynchronous. Bounded Git, capability-preflight, fixture-test, and report helpers remain synchronous. From temporary-root acquisition through cleanup, `runEvaluation` owns one live child handle at a time through the development-only `scripts/evaluator-process.mjs` lifecycle. The helper installs no listener at module import: each live run installs POSIX `SIGINT`/`SIGTERM` listeners or one Windows `SIGINT` listener for console Ctrl+C and removes them on every finalized outcome. The first claimed terminal cause—normal failure, timeout, maximum output, spawn failure, interruption, cleanup failure, or success—remains authoritative.

The model child is launched in its own POSIX process group or Windows process tree. Interruption first requests termination only for that evaluator-created group/tree, waits at most 1.5 seconds, then uses group `SIGKILL` or PID-rooted `taskkill /T /F` and waits at most another 1.5 seconds. It never enumerates processes or matches ambient command lines. POSIX interruption exits `130` for `SIGINT` and `143` for `SIGTERM`; Windows real console Ctrl+C exits `130`. Ctrl+Break/SIGBREAK, console-close/session-manager emulation, `SIGKILL` directed at the evaluator, OS crash, and power loss are outside the guarantee.

Finalization is idempotent and removes only acquired evaluator-owned unpublished staging, the temporary root and its repository/HOME/`CODEX_HOME`/copied `auth.json`/last-message scratch files, and an empty result root created by that run. Recursive evaluator-owned removal uses the asynchronous standard-library filesystem operation and is awaited before the run promise becomes terminal. Retryable removal errors receive at most five retries with a 100-millisecond linear delay, for at most 1.5 seconds of scheduled delay; exhaustion remains a cleanup failure instead of becoming eventual background work. The explicitly named auth source is checked for byte immutability. A complete run is exposed only by same-parent atomic rename; an interrupted or otherwise incomplete run never appears as completed, while a result already atomically published remains by design, including when a later comparison or post-publication cleanup is interrupted. Cleanup failures preserve the primary non-zero cause and append only a sanitized operation, stable owned-path label, and reason/error code, never credential contents, auth-source paths, transcript secrets, or unrelated home paths.

The package `files` allowlist and exact tarball allowlist exclude all `eval/`, root `scripts/`, `test/`, ignored results, and temporary state. The packed third-party notice and upstream MIT copy remain included because the production Skill is adapted from that source even though the comparison baseline itself is development-only.

### Audit behavior smoke

`scripts/audit-smoke.mjs` is a development-only, one-turn fresh-session contract check over `test/fixtures/kyw-audit/fresh-session-project`. It copies the fixture and current canonical audit Skill into a temporary Git repository, commits the evaluator input, then adds known unrelated tracked, untracked, and generated worktree state. The runner isolates and ignores normal user configuration behind a temporary home and `CODEX_HOME` containing only an explicitly copied authentication source and evaluator-owned outer-sandbox config, ignores execution rules, passes only an allowlisted process environment to the child, and fixes an exact model and reasoning effort with observable installed-Skill source reading. Its post-execution command analyzer builds one dependency-free source-mapped lexical parse under PowerShell rules on Windows and POSIX shell rules elsewhere. General mutators and supported nested launchers are classified only at command positions, including starts after separators, pipelines, and control operators. Static quoted POSIX executables, PowerShell call-operator targets, and absolute/relative executable paths are normalized by basename; ordinary arguments never become executable candidates. Output redirects consume the same parse, and executable substitutions plus supported literal shell `-c`/`-Command` scripts recursively receive the complete classifier grammar. Recognized PowerShell encoded-command options fail closed without decoding or retaining payload context, and dynamic launcher command-mode options fail closed without expansion; ordinary static launcher options remain supported. POSIX here-document declarations retain delimiter quote state: quoted bodies are skipped as literal data, while unquoted bodies recursively analyze only executable command/backtick substitutions at source-mapped offsets, leaving Python/Node comparison and arrow source text uninterpreted. Scanning resumes after each terminator. Only exact boundary-valid `2>&1` is proven non-file descriptor duplication. Malformed quotes, missing nested scripts, unterminated here-documents/substitutions, source-map failure, and recursion overflow fail closed instead of producing a mutation-free event. Encoded-command decoding, alias/variable expansion, sourced scripts, and hostile-parser completeness remain outside this normal local Codex-command boundary.

The model-facing `codex exec` automation bypasses its inner approval/sandbox layer only while the entire process is already enclosed by a separate native `codex sandbox` permission profile, matching the CLI's documented external-sandbox use case. That outer profile grants filesystem reads generally, keeps `.git` and the installed `.agents` Skill read-only, grants the isolated control directory write access, and grants the fixture root read-only or write access according to the smoke mode. Public egress is enabled for the nested model control plane during this controlled synthetic run; the fixture contains no network-requiring code. A temporary deduplicated PEM bundle made from Node's default and host-system public CA stores supplies TLS trust to the nested CLI and is deleted with control state. This arrangement avoids dependence on machine-local exec rules while preserving an OS-enforced repository boundary.

Read-only mode runs `codex exec` with the OS-enforced read-only sandbox and fails on a worktree hash change, Git-status change, file-change event, or mutating-command attempt. A mutation failure prints only bounded redacted evidence: file-change kind or structural command reason, zero-based event index, and before/after tree and Git-status invariance. General-mutator, output-redirection, and unsupported-grammar reasons retain their matched token/operator/issue, original zero-based command offset, effective shell/quote and nested evaluation state, and at most 160 characters of original-command context. Source mapping keeps those fields attributable after nested quoted-script decoding without retaining a full command when the local evidence is sufficient. Fix mode uses a separate workspace-write fixture and fails unless a bounded plan message precedes the first mutation, every changed path belongs to the audited Task's declared repair set, unrelated baseline bytes remain identical, the focused fixture test passes, and the final report has one supported verdict. The smoke prints a redacted summary and publishes no repository result artifact; event JSONL is parsed from child output rather than retained as a result file.

The audit runner uses the same run-scoped lifecycle, supported signals, exit codes, exact child-group/tree ownership, two 1.5-second termination bounds, first-cause rule, listener removal, and safe cleanup diagnostics as the grilling evaluator. Its idempotent finalizer removes only its single evaluator-owned `mkdtemp` root, including the temporary repository, isolated HOME/`CODEX_HOME`, copied authentication, control files, and last-message scratch file. The smoke has no result-publication path. Ctrl+Break/SIGBREAK, `SIGKILL` directed at the evaluator, OS crash, and power loss remain outside the guarantee. The harness never enters the npm package.

Task 0023 changes only deterministic audit-classifier evidence and did not run a model-backed smoke or replace Task 0020's `BLOCKED` release gate. Task 0024 resolves the supported evaluator-interruption cleanup risk with deterministic fake-child tests plus actual POSIX signal and Windows console Ctrl+C evidence, without running a model. Task 0025 resolves the development-only release-isolation ambiguity with deterministic marker attribution and bounded ambient retry evidence; it does not rerun Task 0020 or change that `BLOCKED` verdict.

### Static validation

- JSON parsing and manifest required fields;
- YAML metadata shape at a pragmatic level;
- Skill directory and name consistency;
- required Markdown sections;
- current-contract Task/Test marker identity, paired status values, and static `STANDARD` or reasoned `NONE` delivery declaration;
- legacy Task/Test readability without applying current queue or delivery rules retroactively;
- literal hard-dependency references, missing IDs, cycles, active-count, deterministic next-ready selection, and queue-frontier outcomes;
- relative plugin paths beginning with `./`;
- version synchronization;
- package file inclusion.
- direct-install source/metadata path containment, Skill contract shape, and SHA-256 syntax.
- public release metadata, absence of lifecycle publish/install scripts, implemented plugin copy, and canonical local marketplace policy/source shape.
- CI triggers, least-privilege permissions, cancellation/timeouts, exact OS/runtime lanes, stable command coverage, credential absence, and package-script agreement.

Development-only validation scripts use Node built-ins to check JavaScript syntax, canonical JSON formatting, text-file encoding and whitespace, and the npm tarball allowlist. These scripts stay outside the packed runtime boundary.

### Unit tests

- task number allocation;
- slug generation;
- exact and automatic Task resolution, status-pair consistency, dependency graphs, historical-blocker isolation, and no-work outcomes;
- repository-root detection;
- scope path resolution;
- ownership hashing;
- conflict detection;
- atomic staging, commit markers, rollback, and committed-cleanup behavior;
- stable CLI grammar and error categories across user/project scopes.

### Integration fixtures

At minimum:

```text
empty-project
existing-project-with-docs
existing-project-with-custom-agents
project-with-completed-tasks
project-with-task-number-gaps
project-with-duplicate-skills
project-with-modified-managed-install
project-with-partial-install-transaction
distribution/marketplace-root
distribution/fresh-session-project
```

Direct-install integration runs the actual CLI against isolated homes and nested Git repositories, executes the installed `kyw-task` adapter through its namespaced runtime fallback, injects staging/swap interruption in a child process, verifies recovery against prior hashes, and confirms doctor leaves both scopes byte-identical.

Distribution integration creates a synthetic normal-user/protected-state fixture outside the runner's attempt roots, passes it through the ordinary inherited-environment resolver, and proves it unchanged. Inside an attempt root it packs and extracts the actual archive, scans packaged text for source paths or secret-shaped tokens, runs install/update/doctor/normal uninstall at both direct scopes, and verifies that normal uninstall refuses modified/unknown state while force removes only owned bytes and preserves unknown/unrelated hashes. It then materializes the canonical local marketplace around the same extracted bytes and exercises Codex marketplace add/list/install/remove with child-only user/Codex/npm/temp configuration when the CLI is available. Unit regressions use synthetic snapshots/fixtures to cover exact managed paths, kyw-dev identifiers and packed bytes, ambient Codex/agents/npm drift, parent-environment violations, diagnostic privacy/truncation, the one ambient retry with fresh roots/evidence, every nonretryable error, normal-path aliases before child call zero, Windows case/separator identity, and broad cleanup rejection.

### Skill contract scenarios

Use deterministic fixtures plus scripted/manual scenario checks to verify:

- one question at a time;
- recommendation included;
- facts inspected instead of asked;
- no document write before confirmation;
- no Task for a normal small prompt;
- Test created with Task;
- final diff coverage audit performed.
- audit rejects unmapped acceptance, unsupported PASS evidence, stale durable documents, and out-of-scope implementation;
- bare audit preserves every fixture byte while retaining stable findings, evidence limitations, drift review, residual risks, and one verdict;
- exact-`--fix` audit announces a bounded plan, repairs only clear in-scope findings, reruns affected checks, preserves unrelated work, and leaves ambiguous/out-of-scope findings report-only.

### End-to-end release checks

- `npm test`;
- lint/format checks selected in Task 0001;
- `npm pack --dry-run` and tarball inspection;
- credential-free `npm run release:ci` with real archive extraction and packed CLI smoke tests;
- direct user/project install in isolated temporary homes/repos;
- update/uninstall safety;
- isolated local marketplace add/list/install/remove and cached Skill discovery where the environment supports it;
- manual invocation of each Skill in a fresh Codex session;
- audit read-only/fix fresh-session smoke with fixture hash and Git-status evidence.
- ordinary small-prompt documentation synchronization without Task creation.
- `npm publish --dry-run --json`, followed by a separately approved manual publish only after identity and name revalidation.

## 14. Error model

CLI errors use stable categories and non-zero exit codes:

- usage error;
- unsupported runtime;
- scope resolution failure;
- unsafe overwrite/conflict;
- malformed package or installed metadata;
- filesystem/permission failure;
- partial installation recovery required.

User-facing errors must include the failed operation, affected path where safe, and recovery action.

Skill-level blocked states must be written into Task/Test when the active workflow authorizes those files. A default read-only `$kyw-audit` reports `BLOCKED` only in its response and must not update Task/Test or any repository byte.

## 15. Security and privacy

- No telemetry in MVP.
- No network call is required after package acquisition.
- Do not copy repository contents outside the user's requested scope.
- Do not log secrets or full sensitive file contents in reports.
- Validate paths and portable identities before resolving them, then prove every managed candidate remains inside a physical selected install root.
- Refuse symlinks, junctions/reparse-style directory links detectable through `lstat`/`realpath`, unsupported types, and redirected managed parents; never follow or unlink an unsafe link during mutation or recovery.
- Treat package metadata, install metadata, transaction journals/markers, source trees, and user/project roots as untrusted filesystem inputs. Force changes conflict policy only; it grants no broader path ownership.

## 16. Context-budget strategy

- Keep root `AGENTS.md` under the project target size.
- Keep each Skill focused and move long material to `references/`.
- A running existing Task uses exactly the loaded repository instructions, four permanent documents, current Task/Test pair, Task Skill, and its single execution reference, plus only explicit dependencies needed by that Task.
- Before compaction, persist handoff fields.
- Completed Task details required by future work are promoted to durable documents or summarized in the new Task dependency section.

## 17. Deferred architecture

The following require future Spec and Architecture changes:

- npm/plugin lifecycle hooks that enforce checks during installation;
- MCP integrations with issue trackers or repositories;
- GitHub/Jira/Linear Task synchronization;
- automatic PR generation without explicit current-user or selected-Task scope authority;
- telemetry or hosted collaboration;
- non-Codex agent adapters;
- a schema-driven Markdown AST editor.
