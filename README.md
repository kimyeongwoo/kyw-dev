# kyw-dev

`kyw-dev` is a lightweight, spec-driven development workflow plugin for Codex.

It turns an idea into a shared understanding, records the durable product and architecture decisions, splits implementation into session-sized numbered Tasks, and makes test intent traceable so completed-looking work is not accepted without verification.

> Working directory: `kyw_dev`
>
> Product, plugin, CLI, and preferred npm package name: `kyw-dev`

## Status

Tasks 0001 through 0010 establish the `0.1.0` npm/Codex plugin release candidate, six canonical project/Task/Test templates, dependency-free deterministic Task helpers, the four complete workflow Skills, safe direct-Skills installation, isolated marketplace verification, and credential-free cross-platform CI with a packed release gate. The CLI supports user/project install, conflict-aware update, ownership-safe uninstall, read-only diagnostics, help, and version output. The package is configured for public npm distribution, but no npm publication or public plugin-directory submission has occurred; both remain behind explicit approval.

`$kyw-grilling` is implemented as an explicit-invocation-only, read-only interview Skill. `$kyw-init` is implemented as its explicit-only initialization wrapper: it inspects first, waits for confirmation, and then creates or minimally updates only the four permanent documents. `$kyw-task` sizes and clarifies one outcome, authors one atomic DRAFT Task/Test pair, enters execution after confirmation, or resumes an existing Task by four-digit ID. It keeps scope, documents, handoff state, tests, and final diff coverage synchronized until evidence supports `DONE`/`PASSED` or a recorded blocker. `$kyw-audit` independently treats those completion records as claims, reproduces available evidence, detects scope and documentation drift, repairs only clear in-scope findings, and returns `PASS` or `BLOCKED`.

The authoritative product requirements are in `docs/SPEC.md`; the system structure is in `docs/ARCHITECTURE.md`; implementation is divided under `docs/tasks/`.

## Development

Prerequisite: Node.js 22 or newer with npm. Node.js 22 and 24 are the fully tested LTS lines on Linux, macOS, and Windows; Node.js 26 Current has a bounded Ubuntu compatibility lane. Tasks 0001 through 0010 have no production or development package dependencies and no lockfile, so no install step is required before running the checks. The release marketplace E2E also uses a current `codex` CLI when it is available, but CI does not require Codex or its authentication.

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
```

`npm run check` runs the four stable verification commands. `npm run release:ci` repeats that suite, creates and extracts a real npm tarball in an isolated temporary directory, checks its exact allowlist and packed-only boundaries, smoke-tests the packed CLI, and cleans up without publishing. `npm run release:check` builds on the same packed gate and then runs `npm publish --dry-run --json`; the dry run reports what npm would publish but does not publish it. `npm pack --dry-run --json` can be used to inspect the package contents directly. The focused `node --test test/distribution.test.mjs` check creates a real tarball, runs both direct-install lifecycles, and installs the packed plugin through an isolated local marketplace and `CODEX_HOME` without changing the normal user plugin configuration.

`.github/workflows/ci.yml` runs on public pull requests, pushes to `main`, and manual dispatch. Every Node.js 22/24 Linux, macOS, and Windows lane executes `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`; one Ubuntu Node.js 26 lane checks forward compatibility. A separate Ubuntu Node.js 24 job runs `npm run release:ci`, and one aggregate credential-free result can be selected as the required branch check. The workflow uses read-only repository permission, persists no checkout credential, references no secret, and performs no install, publish, tag, release, or merge action.

The canonical section contracts live under `templates/project/` and `templates/task/`. Runtime consumers can use `src/core/template-contracts.mjs` to render and validate them and `src/core/task-artifacts.mjs` to inspect or create Task directories. `src/core/skill-installation.mjs` owns direct-install scope resolution, file ownership, transactions, recovery, and diagnostics. `kyw-grilling` provides the standalone conversational interview primitive, `kyw-init` wraps it with confirmed, non-destructive permanent-document materialization, `kyw-task` combines a thin packaged creation/validation adapter with a packaged execution/resume reference, and `kyw-audit` packages an independent inspection, finding, repair, and verdict reference without adding a runtime dependency.

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
| `$kyw-task` | Implemented | Create one confirmed Task/Test pair, execute it within scope, or resume it by ID through evidence-backed completion or a recorded blocker. |
| `$kyw-audit` | Implemented | Independently compare one Task's intent, current code and diff, reproducible test evidence, scope, and permanent-document consistency; repair only clear in-scope findings. |

All four Skills require explicit invocation. To use the implemented primitive directly:

```text
$kyw-grilling "stress-test this account lockout design"
```

The Skill inspects available facts with read-only operations, asks exactly one dependent decision question per turn with a recommendation, summarizes settled decisions and remaining unknowns, and waits for shared-understanding confirmation. A standalone invocation never writes files or implements the result.

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

Numeric resume verifies the recorded Task/Test state against permanent documents, repository status, relevant diff, code, and test evidence. It continues at the verified `Resume Point` without repeating Completed work. A required test that cannot run leaves evidence-backed `BLOCKED` status; the Skill never substitutes an unsupported `DONE`/`PASSED` claim.

To independently audit one Task:

```text
$kyw-audit 0007
```

The Skill starts read-only and resolves exactly one Task by four-digit ID. It compares acceptance mappings, meaningful branches and error paths, implementation scope, permanent documents, package effects, Task/Test handoff state, and claimed results with reproducible repository evidence. Findings use stable IDs and scope, behavior, architecture, docs, or test-evidence categories. A clear repair already required by the audited Task may update that Task/Test pair, its implementation or tests, and affected permanent documents, followed by the narrow affected check and required regressions. Out-of-scope work is preserved and proposed as a follow-on Task without allocating an ID or creating files. The report records limitations, exact reruns, residual risks, and one final `PASS` or `BLOCKED` verdict; unavailable required evidence cannot be reported as a pass.

## Installation surfaces

### Direct Skills installation with npm CLI

Until the first explicitly approved npm publication, use the checkout entrypoint. After `kyw-dev@0.1.0` is actually present on npm, the same arguments apply to `npx --yes kyw-dev@0.1.0 ...`; do not treat the prepared package as already published.

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
- Install refuses an existing unmanaged or managed copy. Use `update` for an owned installation.
- Update proceeds only when every recorded file still matches its installed SHA-256 and no unknown file is present inside a managed directory.
- Uninstall removes only metadata-owned files. It refuses missing, modified, unknown, or unsafe state by default. `uninstall --scope <scope> --force` explicitly permits removal of modified owned files while still preserving unknown files and unrelated Skills.
- Mutating commands automatically recover a valid interrupted transaction before continuing. `doctor` is read-only and reports a transaction or unsafe partial state instead of changing it.

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

If a command returns 4 through 7, run `doctor`, inspect the named paths, and preserve unknown files. Do not delete the broad `.agents/skills` directory. A valid journal is recovered by retrying the intended mutating command; orphaned paths without a trustworthy journal require manual reconciliation.

The release candidate targets the unscoped npm name `kyw-dev`. The registry returned no package record during Task 0009, but that does not reserve the name; recheck it immediately before an approved publish. If it becomes unavailable, stop and select a real owner scope rather than inventing one, while keeping the CLI command and plugin name `kyw-dev`.

### Codex plugin distribution

The npm package contains `.codex-plugin/plugin.json` and all four `skills/` directories. Task 0009 verifies the exact packed bytes by copying the extracted package to `./plugins/kyw-dev` beneath an isolated local marketplace, adding that marketplace with `codex plugin marketplace add`, installing `kyw-dev@kyw-dev-local`, and inspecting the cached Skill files. The repository fixture is development-only and is not included in the npm tarball.

An npm marketplace entry can replace the local source after the package is published. No GitHub source URL or public-directory entry is advertised until a real repository and an explicit submission decision exist. Plugin and direct-Skills installation are alternative paths; avoid installing both copies at once because duplicate Skill names can appear separately.

## Target repository layout

```text
kyw_dev/
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

## Development sequence

Implement one folder at a time:

1. `0001-plugin-foundation`
2. `0002-template-contracts`
3. `0003-kyw-grilling-skill`
4. `0004-kyw-init-skill`
5. `0005-kyw-task-authoring`
6. `0006-kyw-task-execution`
7. `0007-kyw-audit-skill`
8. `0008-cli-installation`
9. `0009-distribution-and-release`
10. `0010-continuous-integration`

The recommended Codex prompts are in `CODEX_PROMPTS.md`.

## Design principles

- **Durable truth is small:** Spec, Architecture, README, and AGENTS hold only information that should survive individual Tasks.
- **Task context is disposable:** each Task is one independently verifiable outcome and should normally fit in one Codex session, with at most one compaction.
- **Testing starts before code:** `TEST.md` is created with `TASK.md`, evolves during development, and stores final execution evidence.
- **Facts are inspected; decisions are asked:** Codex should inspect code and files for facts, while product or trade-off decisions remain with the user.
- **No silent documentation drift:** even ordinary small changes must update durable documents when their truth changed.
- **No document proliferation:** do not create Plan, Progress, Status, Handoff, or Verification documents when their content belongs in Task or Test.

## Reference standards

The implementation should follow the current Codex plugin and Skill formats:

- Codex plugin authoring: https://developers.openai.com/codex/build-plugins
- Codex Skill authoring: https://developers.openai.com/codex/build-skills
- Project instructions with `AGENTS.md`: https://developers.openai.com/codex/agent-configuration/agents-md
- npm `package.json`: https://docs.npmjs.com/cli/v11/configuring-npm/package-json

## Licensing

The `kyw-dev` project is licensed under MIT with `Copyright (c) 2026 kyw-dev`.

The `kyw-grilling` interview method is adapted from Matt Pocock's `mattpocock/skills` project, which is also MIT-licensed. Preserve the upstream copyright and license notice in the distributed package. See `THIRD_PARTY_NOTICES.md` and `licenses/mattpocock-skills-MIT.txt`.
