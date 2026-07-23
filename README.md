# kyw-dev

`kyw-dev` is a lightweight, spec-driven development workflow plugin for Codex.

It turns an idea into a shared understanding, records the durable product and architecture decisions, splits implementation into session-sized numbered Tasks, and makes test intent traceable so completed-looking work is not accepted without verification.

> Product, plugin, CLI, and preferred npm package name: `kyw-dev`

## Status

Tasks 0001 through 0015 implemented the initial `0.1.0` pre-publication package/plugin surfaces. Work through Task 0028 now provides six canonical project/Task/Test templates, dependency-free deterministic Task helpers, four workflow Skills, safe direct-Skills installation, isolated marketplace verification, credential-free cross-platform CI, development-only evaluation/audit harnesses with interrupt-safe owned-state cleanup, marker-based release-isolation attribution, filesystem hardening, package metadata/hygiene checks, directly verified current behavioral evidence from Task 0027, and deterministic Windows evaluator-cleanup evidence from Task 0028. The CLI supports user/project install, conflict-aware update, ownership-safe uninstall, read-only diagnostics, help, and version output. These are implemented capabilities and evidence inputs, not by themselves an acceptance or release verdict.

Task 0020 remains immutable historical `BLOCKED` evidence for its old candidate. Task 0029 is the authoritative current full release-readiness re-gate: its terminal `READY_FOR_APPROVAL` or `BLOCKED` verdict controls whether its exact candidate has satisfied the authorized pre-publication gate. No version tag, GitHub Release, npm publication, or public plugin-directory submission has occurred. Even a successful pre-publication verdict is not final [SPEC §15](docs/SPEC.md#15-mvp-acceptance-criteria) MVP acceptance; the required MIT and third-party licensing and package identity must still be verified in the actually published tarball.

Source: [kimyeongwoo/kyw-dev](https://github.com/kimyeongwoo/kyw-dev) · Issues: [GitHub issue tracker](https://github.com/kimyeongwoo/kyw-dev/issues)

`$kyw-grilling` is implemented as an explicit-invocation-only, read-only interview Skill. `$kyw-init` is implemented as its explicit-only initialization wrapper: it inspects first, waits for confirmation, and then creates or minimally updates only the four permanent documents. `$kyw-task` sizes and clarifies one outcome, authors one atomic DRAFT Task/Test pair, executes an exact existing Task, or advances a pre-created dependency-aware queue one Task at a time. It keeps scope, documents, handoff state, tests, final diff coverage, and repository-versus-delivery evidence honest until completion or a recorded blocker. `$kyw-audit` independently treats those completion records as claims, reproduces available evidence, detects scope and documentation drift, and returns `PASS` or `BLOCKED` without modifying the repository by default. Only the exact `--fix` form authorizes bounded in-scope repair.

The authoritative product requirements are in `docs/SPEC.md`; the system structure is in `docs/ARCHITECTURE.md`; implementation is divided under `docs/tasks/`.

## Development

Prerequisite: Node.js 22 or newer with npm. Node.js 22 and 24 are the fully tested LTS lines on Linux, macOS, and Windows; Node.js 26 Current has a bounded Ubuntu compatibility lane. The repository has no production or development package dependencies and no lockfile, so no install step is required before running the checks. Root `.gitattributes` materializes repository text as LF on every host to match the format and package contracts. The release marketplace E2E also uses a current `codex` CLI when it is available, but CI does not require Codex or its authentication.

```bash
node ./bin/kyw-dev.mjs --help
node ./bin/kyw-dev.mjs --version
npm test
npm run lint
npm run format:check
npm run pack:check
npm run check
npm run release:ci
npm run release:check
node ./scripts/release-gate-isolation.mjs
```

`npm run check` runs the four stable verification commands. `npm run release:ci` repeats that suite, creates and extracts a real npm tarball in an isolated temporary directory, checks its exact allowlist and packed-only boundaries, smoke-tests the packed CLI, and cleans up without publishing. `npm run release:check` builds on the same packed gate and then runs `npm publish --dry-run --json`; the dry run reports what npm would publish but does not publish it. `npm pack --dry-run --json` can be used to inspect the package contents directly.

`node ./scripts/release-gate-isolation.mjs` is the development-only, fail-closed real-tarball lifecycle gate. Before starting a child process it resolves every writable target, proves each is a real strict descendant of one approved temporary root, and rejects normal user `.agents`, `.codex`, configured Codex, or npm userconfig aliases including Windows case/separator variants. It passes isolated user/Codex/npm/temp state only to children, compares read-only protected state before/after, runs user/project install-update-doctor-uninstall plus force-preservation and local marketplace add-install-remove, and cleans only its exact identity-checked root. The standalone command protects the actual normal-state locations resolved from its inherited environment and requires a working Codex CLI so marketplace evidence cannot be skipped. `node --test test/distribution.test.mjs` passes a temporary synthetic protected-state fixture through that same boundary and permits only the marketplace portion to be unavailable in credential-free public environments; the real-tarball direct lifecycle and every isolation guard remain required.

The isolation summary reports exactly `CLEAN`, `ISOLATION_VIOLATION`, or `AMBIENT_STATE_CHANGED`. `CLEAN` is the only success. A violation requires an exact kyw-dev managed path, identifier, packed Skill digest, or runner-owned protected-environment change. An unmarked protected delta is ambient and inconclusive rather than guessed to be caused by the lifecycle. Only a first ambient result receives one immediate unchanged retry with a fresh root and snapshots; a second ambient result remains retryable/inconclusive but exits nonzero. Violations and guard, snapshot, child, package, marketplace, or cleanup failures never retry. Diagnostics contain only bounded protected labels, normalized relative paths/categories, change kinds, entry types, known markers, and digest prefixes. The runner never repairs or deletes normal user files, and a correct `CLEAN` result does not make the package release-approved.

`.github/workflows/ci.yml` runs on public pull requests, pushes to `main`, and manual dispatch. Every Node.js 22/24 Linux, macOS, and Windows lane executes `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`; one Ubuntu Node.js 26 lane checks forward compatibility. A separate Ubuntu Node.js 24 job runs `npm run release:ci`, and one aggregate credential-free result can be selected as the required branch check. The workflow uses read-only repository permission, persists no checkout credential, references no secret, and performs no install, publish, tag, release, or merge action.

### Grilling evaluation harness

The evaluation sources under `eval/grilling/`, their runner under `scripts/`, and their tests are development-only. Deterministic validation is part of `npm test` and can also be run directly without Codex authentication or network access:

```bash
npm run eval:grilling:unit
```

Model-backed commands are separate and require the explicit `--allow-model` cost gate, an exact model, an explicit reasoning effort, and one explicit authentication source. The runner passes that effort through strict Codex config on the initial and every resumed turn and records it in result schema v2. `--auth-file` copies the named file into a temporary `CODEX_HOME`, checks that the source did not change, and deletes the copy with the temporary workspace. `--use-env-api-key` instead passes an already-set `CODEX_API_KEY` only to each `codex exec` process. The harness never discovers or copies normal authentication implicitly.

```bash
npm run eval:grilling:smoke -- --allow-model --variant kyw --scenario existing-code-facts --model MODEL_ID --reasoning-effort EFFORT --auth-file PATH_TO_AUTH_JSON
npm run eval:grilling:smoke -- --allow-model --variant upstream --scenario existing-code-facts --model MODEL_ID --reasoning-effort EFFORT --auth-file PATH_TO_AUTH_JSON
npm run eval:grilling:compare -- --allow-model --scenario existing-code-facts --model MODEL_ID --reasoning-effort EFFORT --runs 3 --auth-file PATH_TO_AUTH_JSON
npm run eval:grilling:report -- --comparison PATH_TO_COMPARISON_DIRECTORY
```

Replace the uppercase placeholders before running a command; quote values as required by the active shell. Start with one smoke per variant. A smoke currently uses four model turns. A comparison uses `2 × scenarios × runs × 4` turns, so `--scenario all --runs 3` consumes 192 model turns and should be deliberate. `--runs` is required for comparison and is capped at 10.

Each successful run writes redacted JSONL events, one final-message file per turn, and `run.json` under `eval/grilling/results/<run-id>/`. The evaluated variant is installed alone under the temporary repository's `.agents/skills/`; the first turn must read that exact `SKILL.md`, or the run fails before publication. A completed comparison adds a descriptive `comparison.json`; it does not make a parity claim. For a frozen all-scenario comparison, the report command independently reparses JSONL, regrades the retained transcripts, verifies identical execution conditions and artifact trees, and writes deterministic medians, thresholds, and checksums to `report.json`. Result schema v1 remains supported for historical results; effort-controlled results use v2, and source-read-proven results use v3. Generated results are Git-ignored and excluded from the npm package, but should still be reviewed before sharing. Capability, authentication, missing Skill-read proof, or incomplete-comparison failure publishes no failed-run result.

While a grilling run owns temporary state, it installs run-scoped handlers for POSIX `SIGINT`/`SIGTERM` and Windows console Ctrl+C. The first terminal cause wins: interruption exits with code `130` for `SIGINT`/Ctrl+C or `143` for `SIGTERM`, terminates only the evaluator-created child process group/tree with a 1.5-second graceful bound followed by a 1.5-second forced bound, and then performs idempotent cleanup. Cleanup removes the evaluator-owned temporary repository, HOME, `CODEX_HOME`, copied `auth.json`, last-message scratch files, and unpublished JSONL/result staging; the named auth source remains unchanged, and a completed atomically published result directory remains for review. Recursive owned-state removal is awaited before the evaluator promise becomes terminal and uses Node's bounded retry for retryable filesystem errors: at most five retries with a 100-millisecond linear delay, or 1.5 seconds of scheduled delay. Cleanup failures after that bound keep the non-zero primary result and report only a safe operation, owned path label, and reason code. Handlers are removed on every completed or handled failure path. Windows Ctrl+Break/SIGBREAK is not claimed; `SIGKILL`, OS crash, and power loss remain outside the cleanup guarantee.

### Audit behavior smoke

The development-only fresh-session audit smoke copies a synthetic completed Task into a temporary Git repository, installs only the repository's current `kyw-audit` Skill, and requires an explicit model, reasoning effort, authentication source, and cost gate. The complete model process runs inside an evaluator-owned native Codex sandbox so it does not depend on machine-local command rules. Read-only mode gives that outer sandbox read-only repository access and requires identical before/after fixture SHA-256 plus identical Git status with no mutating command attempt. Fix mode gives the outer sandbox write access only to the fixture and isolated control state, requires a visible bounded plan before the first mutation, restricts changed paths to the audited Task's known repair set, preserves unrelated tracked and untracked bytes, and reruns the fixture test.

```bash
npm run eval:audit:smoke -- --allow-model --mode readonly --model MODEL_ID --reasoning-effort EFFORT --auth-file PATH_TO_AUTH_JSON
npm run eval:audit:smoke -- --allow-model --mode fix --model MODEL_ID --reasoning-effort EFFORT --auth-file PATH_TO_AUTH_JSON
```

The smoke publishes no repository result artifact. A successful run prints a compact summary containing the Codex version, requested model/effort, source-read proof, before/after fixture hashes and Git status, mutation/plan ordering, changed paths, test result, and final verdict. Command analysis uses one dependency-free PowerShell/POSIX lexical parse for executable mutator tokens and output redirects. Mutators and supported nested launchers are classified only at command positions, including positions after separators, pipelines, and control operators; quoted POSIX executables, PowerShell call-operator targets, and absolute/relative executable paths are normalized by basename, while ordinary argument text is ignored. The complete grammar is applied recursively to executable substitutions and supported literal shell `-c`/`-Command` scripts. Recognized encoded-command options are never decoded and fail closed with payload-free evidence, and a dynamic launcher command-mode option also fails closed without expansion. Quoted POSIX here-document bodies are literal data; in unquoted bodies, executable command and backtick substitutions are recursively analyzed at original offsets while ordinary Python/Node comparison and arrow text remains data. Scanning resumes after each terminator, and a redirect outside the body still blocks. The classifier detects file redirects including `2>`/`2>>`, preserves only exact boundary-valid `2>&1` as descriptor duplication, and does not treat quoted command text, JavaScript arrows, or shell-escaped literal `>` text as writes. Malformed or unsupported explicit nested grammar fails closed. Alias expansion, sourced-script resolution, and hostile-parser completeness remain outside this bounded normal local-command grammar. A mutation failure prints bounded redacted evidence with the structural match or issue, original zero-based command offset, effective shell and nested evaluation state, and at most 160 characters of original-command context. Credentials and absolute user/temporary paths are removed, and full commands are omitted when match-local evidence is sufficient.

The audit smoke uses the same run-scoped POSIX `SIGINT`/`SIGTERM` and Windows console Ctrl+C lifecycle, exit codes, two-phase child-tree termination bounds, awaited bounded owned-state removal, idempotent cleanup, and safe cleanup-failure diagnostics as the grilling evaluator. Cleanup owns only its single temporary root, including the repository, isolated HOME/`CODEX_HOME`, copied `auth.json`, control files, and last-message scratch file; it publishes no repository result artifact and leaves the auth source unchanged. Windows Ctrl+Break/SIGBREAK is not claimed, and `SIGKILL`, OS crash, and power loss remain outside the cleanup guarantee.

The canonical section contracts live under `templates/project/` and `templates/task/`. Runtime consumers can use `src/core/template-contracts.mjs` to render and validate them and `src/core/task-artifacts.mjs` to inspect, create, validate, and resolve Task directories and queues. `src/core/skill-installation.mjs` owns direct-install scope resolution, file ownership, transactions, recovery, and diagnostics. `kyw-grilling` provides the standalone conversational interview primitive, `kyw-init` wraps it with confirmed, non-destructive permanent-document materialization, `kyw-task` combines a thin packaged artifact/dispatch adapter with a packaged execution and queue reference, and `kyw-audit` packages independent read-only inspection plus an exact-flag repair workflow without adding a runtime dependency.

## Target workflow

```text
Idea or major redesign
        ↓
$kyw-init
        ↓
One-question-at-a-time grilling
        ↓
README.md + AGENTS.md + docs/SPEC.md + docs/ARCHITECTURE.md
        ↓
$kyw-task "one testable outcome"
        ↓
docs/tasks/NNNN-slug/TASK.md + TEST.md
        ↓
Implement → synchronize docs → verify → audit
```

Small questions and narrowly scoped changes do not require a Task folder. They still follow the documentation-sync and verification rules in `AGENTS.md`.

## User-facing Skills

| Skill | Status | Purpose |
|---|---|---|
| `$kyw-grilling` | Implemented | Internal/advanced interview primitive: resolve dependent decisions one at a time, with a recommended answer. |
| `$kyw-init` | Implemented | Discover, adopt, or intentionally re-baseline a project, grill unresolved durable decisions, then create or minimally update the four permanent documents after confirmation. |
| `$kyw-task` | Implemented | Create one confirmed Task/Test pair, execute an exact Task, or advance a pre-created queue serially through evidence-backed completion or a recorded blocker. |
| `$kyw-audit` | Implemented | Independently compare one Task's intent, code/diff, test evidence, scope, and permanent documents without writes; repair only through the exact `--fix` form. |

All four packaged Skills keep implicit invocation disabled. Use their explicit `$skill-name` forms on every supported surface; a kyw-managed repository may additionally route only the exact Task aliases documented below through its loaded `AGENTS.md`.

```text
$kyw-grilling "stress-test this account lockout design"
```

The Skill inspects targeted user-authored facts once with read-only operations rather than broad repository or version-control reads, revisiting only a specific path made newly relevant by an answer. It surfaces incompatible product requirements and asks which is authoritative first, but routes scope-only conflicts directly to one primary first-release outcome and does not misclassify implementation pressure as a product conflict. It asks exactly one dependent decision question with exactly one recommendation on every interview-progress turn, prioritizes the highest-impact unresolved product or domain dependency over lower-impact supporting-material checks, treats implementation layers as dependencies, and requires an explicit ownership verb when the user delegates a decision back to the recommendation. Across turns it tracks decisions by semantic meaning and does not repeat an equivalent question without new or conflicting evidence; an omitted answer becomes an explicit safe, reversible provisional assumption when possible so the interview can advance, while unsafe assumptions remain unknown or blocking. It summarizes settled decisions and remaining unknowns, then waits for shared-understanding confirmation. A clear unbundled cancellation or stop is terminal until a new invocation. Before confirmation, stop wording bundled with a prohibited implementation, edit, file-output, or mutation request is instead implementation pressure: the action is refused and the next single unresolved decision continues. Once terminal cancellation is established, later implementation pressure cannot reopen the interview. A standalone invocation never writes files or implements the result.

To initialize or adopt the current repository:

```text
$kyw-init "adopt this repository without replacing existing contributor guidance"
```

The Skill inspects code and documentation, classifies the run as `new`, `adopt`, or intentional `rebaseline`, and uses the grilling protocol only for unresolved durable decisions. It makes no change until the user confirms the final shared-understanding summary and four-file write plan. After confirmation it may create or minimally update only `README.md`, `AGENTS.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`; it preserves unrelated sections, reports conflicts and remaining unknowns, and recommends ordered Tasks without creating them or implementing application code.

To create and execute one new Task:

```text
$kyw-task "add account lockout"
```

The Skill inspects permanent truth and relevant code, proposes a split without writing when the request contains independent outcomes, and asks only unresolved Task-level decisions. For one confirmed outcome it allocates the next ID, creates `TASK.md` and `TEST.md` together in `DRAFT`, maps stable acceptance and test IDs, and waits for confirmation. Confirmation promotes the pair to `READY`, then execution records `IN_PROGRESS`/`RUNNING`, implementation and documentation impact, exact test evidence, compaction-ready handoff state, and final diff coverage before terminal status.

To resume one existing Task:

```text
$kyw-task 0006
```

Existing-Task execution verifies the recorded pair and repository evidence, continues at the verified `Resume Point` without repeating Completed work, and never substitutes an unsupported `DONE`/`PASSED` claim. `$kyw-task NNNN` is the portable exact form. A repository whose managed `AGENTS.md` contract is loaded also supports:

```text
task 0006 실행해줘
task 진행해줘
남은 task 계속 실행해줘
```

These commands are a concise user projection; [SPEC §6.1](docs/SPEC.md#61-codex-skills) owns product behavior, `AGENTS.md` owns repository invariants, and the packaged Task execution reference owns the detailed procedure. Exact `READY/READY` selection confirms implementation and ordinary `STANDARD` delivery. Automatic selection resumes active work, then resumable delivery, then one eligible ready Task; continuous mode remains serial and current-invocation-only. Invalid states or dependencies fail closed, incidental “task” prose does not route, and a surface without the managed contract uses `$kyw-task NNNN`.

Appended user text may constrain the first selected Task but cannot waive safety or evidence. The configured model and reasoning effort stay unchanged unless that user explicitly overrides them. `TEST.md` records model identifier, requested alias, reasoning effort, Codex surface, version, and per-field observability; hidden values remain `UNAVAILABLE`, never guessed.

Routine Tasks should keep required sections concise. When a section truly has no applicable content, use `Not applicable — <reason>`; an empty section, bare `None`, or reasonless N/A is not a valid shortcut once an updated Task is ready to run. Pre-rule contract-v2 pairs remain readable without historical rewrites. Acceptance criteria and test mappings remain mandatory. Release and security Tasks use the same artifact type and may retain longer evidence when needed. During authoring or execution, Codex asks exactly one question with one recommendation only for a genuine user-owned blocking decision; otherwise it proceeds and consumes appended constraints without asking them back.

Current pairs declare `STANDARD` delivery through the GitHub PR/Actions exact-SHA ledger or reasoned `NONE`. Task/Test owns repository outcome; GitHub owns mutable delivery state. The static declaration alone grants no ambient authority, but `IMPLEMENT`, `RESUME`, or `DELIVER` selection authorizes exact-path commit, non-force push, non-draft PR, exact-head CI, expected-head merge, post-merge base-branch CI, and terminal reporting without ceremonial reconfirmation. Publication, registry mutation, tags/releases, public submission, force/destructive operations, reruns, bypasses, and unrelated mutations remain separately authorized.

To independently audit one Task:

```text
$kyw-audit 0007
```

The bare invocation is strictly read-only for its entire run. It resolves exactly one Task by four-digit ID and compares acceptance mappings, meaningful branches and error paths, implementation scope, permanent documents, package effects, Task/Test handoff state, and claimed results with reproducible repository evidence. Findings use stable IDs and scope, behavior, architecture, docs, or test-evidence categories. The Skill does not update Task/Test status, permanent documents, generated files, or an audit report in the repository. The no-attempt boundary includes temporary and isolated-copy state: a potentially writing rerun uses retained evidence or is skipped with an explicit limitation, and the audit does not prepare or clean a disposable copy itself. The response records findings, exact evidence inspected or safely rerun, scope and document drift, residual risks, and one final `PASS` or `BLOCKED` verdict.

To authorize bounded repair, use the exact form:

```text
$kyw-audit 0007 --fix
```

Only the literal `--fix` token immediately after the Task ID selects repair mode; natural-language requests to fix findings do not. Repair mode establishes the baseline and records findings read-only, then presents a bounded plan naming finding IDs, intended paths, and verification before its first mutation. A clear repair already required by the audited Task may update only that Task/Test pair, its required implementation/tests/configuration, and affected permanent documents, followed by the narrow affected check and required regressions. Pre-existing user changes are preserved. Ambiguous or out-of-scope work remains a report-only proposal without allocating an ID or creating a follow-on Task. Unavailable required evidence cannot be reported as a pass.

## Installation surfaces

### Direct Skills installation with npm CLI

Until the first explicitly approved npm publication, use the checkout entrypoint. After `kyw-dev@0.1.0` is actually present on npm, the same arguments apply to `npx --yes kyw-dev@0.1.0 ...`; do not treat the prepared package as already published.

```bash
git clone https://github.com/kimyeongwoo/kyw-dev.git
cd kyw-dev
```

```bash
node ./bin/kyw-dev.mjs install --scope user
node ./bin/kyw-dev.mjs install --scope project
node ./bin/kyw-dev.mjs update --scope user
node ./bin/kyw-dev.mjs uninstall --scope user
node ./bin/kyw-dev.mjs doctor
```

- `user`: install managed Skill directories under `~/.agents/skills/`.
- `project`: find the enclosing Git root from the current directory and install under `<repo>/.agents/skills/`.
- The CLI installs workflow Skills only. It does not create a project's Spec, Architecture, README, AGENTS, or Task files; `$kyw-init` does that after interviewing the user and inspecting the repository.
- The CLI records ownership in `.agents/skills/.kyw-dev-install.json`. It also installs Task-helper runtime support under `.agents/skills/.kyw-dev/runtime/`; both are private implementation paths, not additional discoverable Skills.
- The selected home/Git root is resolved physically. Install refuses an existing unmanaged or managed copy, a linked `.agents`/`skills` component, or any absolute, traversal, mixed-separator, case-colliding, linked, or unsupported managed path. Use `update` for an owned installation.
- Update proceeds only when every recorded regular file still matches its installed SHA-256, every managed parent and package source remains link-free and confined, and no unknown file is present inside a managed directory. It rechecks ownership/type/hash immediately before each rename.
- Uninstall removes only metadata-owned regular files. It refuses missing, modified, unknown, or unsafe state by default. `uninstall --scope <scope> --force` permits removal of modified owned regular files and can tolerate missing owned or preserved unknown entries; it still never deletes an unknown file, unrelated Skill, symlink/junction, or unsupported type.
- Mutating commands automatically recover a valid interrupted transaction before continuing. Recovery recursively cleans only UUID-named journal-owned stage/backup directories whose present contents all match the journal; unknown or unsafe transaction content remains for inspection. `doctor` is byte-and-metadata read-only and reports unsafe roots, links/types, collisions, or partial transactions without changing them.

`doctor` checks Node support, detectable npm/Codex commands, packaged plugin and Skill metadata, user/project locations, version drift, duplicate Skill names, ownership hashes, partial transactions, and permissions. A project location is informationally unavailable when the command is not run inside a Git repository.

CLI exit codes are stable:

| Code | Meaning |
|---|---|
| `0` | Command succeeded, or doctor found no error. |
| `1` | Command usage error. |
| `2` | Unsupported Node runtime. |
| `3` | User/project scope could not be resolved. |
| `4` | Unsafe overwrite, local modification, or duplicate-install conflict. |
| `5` | Malformed package or installation metadata/state. |
| `6` | Filesystem or permission failure. |
| `7` | A partial transaction needs recovery or manual inspection. |

If a command returns 4 through 7, run `doctor`, inspect the named paths, and preserve unknown files and links. Do not delete the broad `.agents/skills` directory and do not point `--force` at an unsafe link. A valid, ownership-proven journal is recovered by retrying the intended mutating command; an unsafe/colliding path, unknown transaction entry, or orphaned path without a trustworthy journal requires manual reconciliation.

The preferred pre-publication npm name is the unscoped `kyw-dev`, but it is not reserved by repository configuration or prior checks. Recheck it immediately before any separately approved publish. If it is unavailable, stop and select a real owner scope rather than inventing one, while keeping the CLI command and plugin name `kyw-dev`.

### Codex plugin distribution

The npm package contains `.codex-plugin/plugin.json` and all four `skills/` directories. Pre-publication local verification copies extracted package bytes to `./plugins/kyw-dev` beneath an isolated marketplace, adds that marketplace with `codex plugin marketplace add`, installs `kyw-dev@kyw-dev-local`, and inspects the cached Skill files. The repository fixture is development-only and is not included in the npm tarball.

An npm marketplace entry can replace the local source after the package is published. No GitHub source URL or public-directory entry is advertised until a real repository and an explicit submission decision exist. Plugin and direct-Skills installation are alternative paths; avoid installing both copies at once because duplicate Skill names can appear separately.

## Target repository layout

```text
kyw-dev/
├─ .gitattributes
├─ .gitignore
├─ .github/
│  └─ workflows/ci.yml
├─ .codex-plugin/
│  └─ plugin.json
├─ skills/
│  ├─ kyw-grilling/
│  ├─ kyw-init/
│  ├─ kyw-task/
│  └─ kyw-audit/
├─ templates/
│  ├─ project/
│  └─ task/
├─ src/
│  ├─ cli/
│  └─ core/
├─ test/
│  └─ fixtures/
├─ eval/
│  └─ grilling/
├─ scripts/
│  └─ development-only validation commands
├─ docs/
│  ├─ SPEC.md
│  ├─ ARCHITECTURE.md
│  └─ tasks/
├─ AGENTS.md
├─ CODEX_PROMPTS.md
├─ package.json
├─ README.md
├─ LICENSE
└─ THIRD_PARTY_NOTICES.md
```

The exact implementation may evolve, but changes to this structure must be reflected in `docs/ARCHITECTURE.md`.

## Contributor guidance

Numbered work contracts and retained evidence live under `docs/tasks/`; use the active Task rather than an old chronological list to determine current scope. Recommended Codex prompts are in `CODEX_PROMPTS.md`.

## Design principles

- **Durable truth is small:** Spec, Architecture, README, and AGENTS hold only information that should survive individual Tasks.
- **Task context is disposable:** each Task is one independently verifiable outcome and should normally fit in one Codex session, with at most one compaction.
- **Testing starts before code:** `TEST.md` is created with `TASK.md`, evolves during development, and stores final execution evidence.
- **Facts are inspected; decisions are asked:** Codex should inspect code and files for facts, while product or trade-off decisions remain with the user.
- **No silent documentation drift:** even ordinary small changes must update durable documents when their truth changed.
- **No document proliferation:** do not create Plan, Progress, Status, Handoff, or Verification documents when their content belongs in Task or Test.

## Reference standards

The implementation should follow the current Codex plugin and Skill formats:

- Codex plugin authoring: https://learn.chatgpt.com/docs/build-plugins
- Codex Skill authoring: https://learn.chatgpt.com/docs/build-skills
- Project instructions with `AGENTS.md`: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- npm `package.json`: https://docs.npmjs.com/cli/v11/configuring-npm/package-json

## Licensing

The `kyw-dev` project is licensed under MIT with `Copyright (c) 2026 Kim Yeongwoo`.

The `kyw-grilling` interview method is adapted from Matt Pocock's `mattpocock/skills` project, which is also MIT-licensed. Preserve the upstream copyright and license notice in the distributed package. See `THIRD_PARTY_NOTICES.md` and `licenses/mattpocock-skills-MIT.txt`.
