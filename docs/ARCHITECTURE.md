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

`kyw-init`, `kyw-task`, `kyw-audit`, and `kyw-grilling` declare `allow_implicit_invocation: false`. Ordinary prompts are governed by project `AGENTS.md`, not automatically escalated into a heavyweight workflow.

### A-04 — Non-destructive by default

Existing project documents and installed files are inspected before modification. CLI-owned files are tracked by metadata and hashes. Generated documents are semantically updated by Codex, not blindly replaced by a package upgrade.

### A-05 — No lifecycle-script dependency

Plugin distribution through npm must work when package lifecycle scripts are not executed. The package is complete as packed; direct CLI execution occurs only when the user explicitly runs `npx`/`npm exec` or an installed binary.

### A-06 — One Task is the context boundary

A Task directory is the resumable execution packet. Completed Task folders are historical evidence, not mandatory context for later Tasks. Durable knowledge must be promoted to permanent documents.

## 4. Top-level package structure

```text
kyw_dev/
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
├─ scripts/
│  └─ development-only validation commands
├─ docs/
├─ package.json
└─ legal files
```

The `templates/` directory is the canonical template source for deterministic tests and CLI packaging. A Skill may reference its own assets or the packaged templates through scripts, but template duplication must be checked for drift.

Root `scripts/` and `test/` are development-only verification surfaces. They validate the package but are excluded from the npm tarball. Runtime and packaged Skill code must not import them.

The packaged deterministic mechanics are split into three core modules:

- `src/core/template-contracts.mjs` owns the canonical template registry, token rendering, required-section contracts, Task/Test status rules, acceptance-to-test traceability, and evidence validation.
- `src/core/task-artifacts.mjs` owns Task directory inventory, max-plus-one ID allocation, bounded ASCII slug generation, cross-platform path containment, atomic Task/Test scaffolding, and file-backed Task validation.
- `src/core/skill-installation.mjs` owns direct-install source inventory and hashing, user/project scope resolution, ownership metadata, conflict inspection, journaled file transactions and recovery, ownership-safe uninstall, tool detection, and doctor diagnostics.

The artifact module depends on the template-contract module. The installation module inventories the same two core files and canonical templates as direct-install runtime inputs but does not import their Task logic. No core module depends on the CLI, Skills, or development-only validation surfaces.

`skills/kyw-task/scripts/task-artifacts.mjs` is a thin packaged process adapter for the core artifact module's create and validate operations. It parses explicit arguments and reports structured results, but owns no numbering, slug, template, validation, or file-write logic. In a plugin/npm tree it imports the package-root core; in a direct-Skills tree it falls back to `.agents/skills/.kyw-dev/runtime/src/core/`. This keeps deterministic mechanics in the core modules while giving the reasoning Skill a stable invocation surface in both distribution layouts.

`skills/kyw-task/references/execution.md` is the packaged semantic state-machine reference for Task execution and resume. `SKILL.md` loads it only after create-mode confirmation or a numeric Task invocation. It owns reasoning gates for repository verification, current-Task scope, documentation impact, live Task/Test evidence, compaction handoff, final diff coverage, and terminal status; it does not duplicate deterministic artifact mechanics.

`skills/kyw-audit/references/audit.md` is the packaged semantic reference for an independent Task review. `SKILL.md` resolves one explicitly supplied Task ID and loads the reference before inspection. The reference owns baseline fallback, stable finding classification, acceptance/evidence reproduction, scope and durable-document comparison, safe in-scope repair, affected-check reruns, and the final audit verdict. It consumes existing Task validators as evidence but adds no deterministic runtime module or production dependency.

## 5. Plugin manifest

Required path:

```text
.codex-plugin/plugin.json
```

MVP manifest responsibilities:

- stable plugin identifier `kyw-dev`;
- semantic version matching `package.json`;
- description and publisher metadata;
- `skills: "./skills/"`;
- install-surface metadata suitable for a productivity/developer workflow plugin.

The release manifest describes the implemented workflows rather than foundation stubs, exposes only the actual `Interactive` and `Write` capabilities, and provides three bounded starter prompts for init, Task, and audit. Optional URLs, contact fields, and branding assets remain absent until real values and files exist.

MVP does not include `mcpServers`, `apps`, or `hooks`. Those fields may be added only through an explicit future architecture decision.

A build/test check must fail when plugin and npm versions differ.

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

Responsibility: Task authoring, execution, resume, synchronization, and verification.

Modes:

```text
create(goal)
resume(task-id)
```

Mutation boundary includes:

- current Task and Test files;
- Task implementation files;
- affected permanent documents;
- tests required by the Task.

It must not implement future Tasks or silently broaden scope.

During `create(goal)`, the mutation boundary is narrower: inspection, sizing, and Task-level grilling occur without writes; authoring may then change only the one newly published Task/Test pair. Both files remain `DRAFT` until the user confirms the current shared-understanding summary, then move together to `READY`. Implementation files, permanent documents, existing Tasks, and follow-on Task proposals stay read-only during authoring. Execution and resume expand the boundary only in their later workflow phase.

After confirmation, create mode may continue into execution; `resume(task-id)` resolves exactly one existing four-digit Task and dispatches from its verified Task/Test state. A `READY` pair enters `IN_PROGRESS`/`RUNNING` before implementation, an `IN_PROGRESS` pair continues from verified handoff fields, and a `BLOCKED` pair continues only after its recorded condition clears. `DONE`/`PASSED` and `CANCELLED` are non-implementation terminal states. Contradictory pairs block before implementation.

Execution mutations remain limited to the current pair, implementation/tests required by its acceptance criteria, and permanent documents whose durable meaning changed. Resume verifies Completed work against repository evidence and begins at Resume Point or the first valid Remaining item instead of blindly repeating recorded actions.

Deterministic helper needs:

- list valid Task directories;
- allocate next non-reused four-digit ID;
- create a safe slug;
- scaffold Task/Test atomically;
- validate required sections and status values.

The packaged `skills/kyw-task/scripts/task-artifacts.mjs` adapter exposes those existing core operations to the Skill without duplicating them.

## 6.5 `kyw-audit`

Responsibility: independent consistency and evidence review.

Inputs:

- Task ID;
- permanent docs;
- current code/diff/history and test artifacts.

Outputs:

- findings grouped by scope, behavior, architecture, docs, and test evidence;
- in-scope fixes where safe;
- final `PASS` or `BLOCKED`.

It does not invent new product requirements. Out-of-scope findings become recommendations for a new Task.

The audit begins read-only and treats Task status, checked acceptance criteria, Test rows, command logs, and handoff summaries as claims. It establishes a comparison baseline from Git status/diff/history when available, or records a reproducible snapshot, patch, artifact, inventory, or hash fallback. If the available baseline cannot establish required scope or behavior, the audit blocks instead of implying recovered Git evidence.

Findings receive stable `F-NN` IDs and exactly one category (`scope`, `behavior`, `architecture`, `docs`, or `test-evidence`), severity (`BLOCKER`, `ERROR`, or `WARNING`), evidence, expected/actual state, scope classification, action, and status. An unmapped acceptance criterion, unsupported PASS row, stale durable document, uncovered meaningful branch, or out-of-scope implementation is an error even when a generic suite passes.

Mutation begins only for an unambiguous repair already required by current Task and permanent truth. Eligible changes remain within the audited Task/Test pair, its required implementation/tests/configuration, and permanent documents whose durable meaning is restored or changed. The audit records the finding first, preserves failed evidence, applies the smallest fix, reruns the affected acceptance-specific check plus required regressions, and re-audits the final diff. It never edits or absorbs out-of-scope work, allocates a follow-on ID, or writes a separate audit report artifact.

```text
explicit $kyw-audit NNNN
        ↓
read-only baseline + Task/Test validation
        ↓
acceptance/evidence + implementation/scope/docs review
        ├─ clear in-scope error → record → repair → affected checks → re-audit
        └─ out-of-scope/unsafe/unproven → record + follow-on recommendation
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
IN_PROGRESS
      ├─ discovery → update docs / Task / Test
      ├─ possible compaction → persist handoff fields
      └─ verification + final diff coverage audit
            ├─ evidence complete → DONE / TEST PASSED
            └─ unmet condition   → BLOCKED
```

Task status and Test status are separate because implementation can be complete while verification remains blocked.

During execution, discoveries update Task intent and Test coverage together; durable meaning is routed to its permanent owner before implementation alignment. Before compaction or interruption, the workflow persists Completed, Remaining, Resume Point, Blockers, current decisions/document impact, repository state, commands, results, row evidence, and unverified risks in the existing pair. Terminal `DONE`/`PASSED` requires mapped acceptance criteria, executed required checks, synchronized durable documents, a complete final diff coverage review, reproducible evidence, and final pair validation. An unavailable required check produces recorded `BLOCKED` status instead of inferred success.

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

Project scope realpath-resolves the current directory and walks parents until it finds a real `.git` directory or file. It does not spawn Git or follow a symlinked marker. Project installation fails with a helpful message if no repository root is found; an explicit target path remains a future interface.

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

Metadata paths use normalized relative POSIX separators and may name only the four managed Skill containers or `.kyw-dev/runtime/`. This containment rule prevents malformed metadata from authorizing deletion of unrelated Skills.

## 10.5 Atomic update strategy

1. Validate the package/plugin/Skill source and build a sorted hash inventory without touching the target.
2. Resolve a real scope root, recover any trustworthy prior transaction, and compare installed bytes and unknown paths with ownership metadata.
3. Exclusively publish a journal naming the owning process, reserved sibling stage/backup directories, and old/new hashes, then stage and rehash all new bytes. Another live owner is a conflict, not a recovery target.
4. Create a commit-started marker, recheck the target against the captured hashes, move old managed files to backup, and move staged files into place.
5. Move old metadata to backup and publish new metadata last. Uninstall omits new metadata and moves only files named by valid ownership metadata.
6. Publish a commit-complete marker, then remove the reserved backup, stage, journal, and marker.
7. On interruption before commit, discard only the stage. During an incomplete commit, remove bytes that still match the journal and restore backups. After commit-complete, retain the new state and finish cleanup.

Install/update refuse unmanaged, missing, modified, unknown, or unsafe state. Uninstall does the same unless `--force` explicitly permits missing/modified/unknown state; force still preserves unknown bytes and refuses unsafe owned entries. Transaction cleanup may recursively remove only validated, reserved stage/backup directories below the selected Skills root. It never recursively deletes a broad `.agents/skills` directory or follows a symlink.

## 10.6 Doctor and error flow

`doctor` builds and validates the packaged source inventory, checks Node and detectable npm/Codex versions, inspects user scope and the enclosing project scope when available, validates ownership metadata and Skill front matter/UI policy, compares installed hashes and unknown paths, detects reserved transaction artifacts and duplicate Skill names, and probes the nearest existing scope directory for read/write access. It performs no recovery or other mutation.

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

Before publication, `test/fixtures/distribution/marketplace-root/.agents/plugins/marketplace.json` is the canonical local catalog. It points at `./plugins/kyw-dev` and declares explicit availability, authentication timing, and category metadata. The distribution E2E creates a temporary marketplace root, copies the extracted npm tarball to that path, sets a fresh `CODEX_HOME`, adds the marketplace through the Codex CLI, installs the plugin, and confirms that all four cached `SKILL.md` files are discoverable. The temporary cache and marketplace are deleted after the check, and neither the fixture nor tests enter the npm tarball.

## 11.3 Duplicate-install policy

`doctor` reports a conflict when the same `kyw-*` Skill names exist in both active direct-install scopes:

- project `.agents/skills`;
- user `~/.agents/skills`.

An installed plugin surface remains reportable when future tooling exposes a trustworthy location. The tool does not automatically remove another installation source. Duplicate diagnosis is read-only.

## 11.4 Release gate

`package.json` is release-ready rather than publication-blocked: `private` is false and `publishConfig` fixes public access to the npm public registry. The repository provides no npm lifecycle script that can install the plugin or publish the package. `npm run release:check` runs the stable verification suite and then `npm publish --dry-run --json`; this command is non-publishing evidence only. The actual `npm publish --access public` command remains outside automation and requires explicit approval after a fresh name, identity, tarball, and version check.

The first-release notes, approval checklist, exact commands, and rollback/deprecation procedure live in Task 0009 rather than a new permanent release document. A bad published version is corrected with a new semantic version and normally deprecated rather than removed; npm unpublish is an exceptional, policy-bound, irreversible response.

## 12. Template architecture

Templates define section contracts, not final project content.

### Project templates

- `SPEC.md`: headings and guidance comments/placeholders;
- `ARCHITECTURE.md`: headings and guidance comments/placeholders;
- `AGENTS.md`: compact invariant rules with replaceable command slots;
- `README.md`: project entry sections.

### Task templates

- `TASK.md`: lifecycle and handoff fields;
- `TEST.md`: traceability and evidence fields.

`kyw-init` and `kyw-task` must customize templates from inspected facts and settled decisions. They must not leave unexplained placeholders in completed documents.

The six canonical files are `templates/project/{README,AGENTS,SPEC,ARCHITECTURE}.md` and `templates/task/{TASK,TEST}.md`. Project-name, verification-command, Task-ID, and Task-title tokens are explicit inputs; explanatory HTML comments are authoring guidance and must be removed or resolved when final project-specific content is materialized.

## 13. Validation architecture

### Static validation

- JSON parsing and manifest required fields;
- YAML metadata shape at a pragmatic level;
- Skill directory and name consistency;
- required Markdown sections;
- Task/Test status values;
- relative plugin paths beginning with `./`;
- version synchronization;
- package file inclusion.
- direct-install source/metadata path containment, Skill contract shape, and SHA-256 syntax.
- public release metadata, absence of lifecycle publish/install scripts, implemented plugin copy, and canonical local marketplace policy/source shape.

Development-only validation scripts use Node built-ins to check JavaScript syntax, canonical JSON formatting, text-file encoding and whitespace, and the npm tarball allowlist. These scripts stay outside the packed runtime boundary.

### Unit tests

- task number allocation;
- slug generation;
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

Distribution integration packs and extracts the actual archive, scans packaged text for source paths or secret-shaped tokens, runs install/update/doctor/uninstall at both direct scopes from the extracted CLI, materializes the canonical local marketplace around those same bytes, and exercises Codex marketplace add/list/install/remove with an isolated `CODEX_HOME` when the CLI is available.

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
- audit repairs only clear in-scope findings, reruns affected checks, and leaves a clean Task unchanged.

### End-to-end release checks

- `npm test`;
- lint/format checks selected in Task 0001;
- `npm pack --dry-run` and tarball inspection;
- direct user/project install in isolated temporary homes/repos;
- update/uninstall safety;
- isolated local marketplace add/list/install/remove and cached Skill discovery where the environment supports it;
- manual invocation of each Skill in a fresh Codex session.
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

Skill-level blocked states must be written into Task/Test when applicable rather than disguised as completion.

## 15. Security and privacy

- No telemetry in MVP.
- No network call is required after package acquisition.
- Do not copy repository contents outside the user's requested scope.
- Do not log secrets or full sensitive file contents in reports.
- Validate paths to prevent traversal outside selected install roots.
- Symlink handling must be explicit; do not follow an unexpected symlink during destructive operations.

## 16. Context-budget strategy

- Keep root `AGENTS.md` under the project target size.
- Keep each Skill focused and move long material to `references/`.
- A running Task reads current Task/Test, permanent docs, and explicit dependencies only.
- Before compaction, persist handoff fields.
- Completed Task details required by future work are promoted to durable documents or summarized in the new Task dependency section.

## 17. Deferred architecture

The following require future Spec and Architecture changes:

- lifecycle hooks that enforce checks automatically;
- MCP integrations with issue trackers or repositories;
- GitHub/Jira/Linear Task synchronization;
- automatic PR generation;
- telemetry or hosted collaboration;
- non-Codex agent adapters;
- a schema-driven Markdown AST editor.
