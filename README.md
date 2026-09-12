# kyw-dev

`kyw-dev` is a lightweight development support layer for Codex. It provides six explicit Skills, optional resumable Task records, and separate PR, merge, and release actions. Ordinary local fixes need no Task or external service.

## Start here

Choose one installation surface for each Skill name: direct user/project Skills for supported CLI, desktop, or IDE surfaces, or the complete plugin package for a plugin-capable surface. Duplicate names are reported by `doctor` and preserved for the user to resolve.

| Purpose | Invocation | Result |
|---|---|---|
| Project documentation | `$kyw-init` | Inspect and supplement only needed documents. |
| Decision interview | `$kyw-grilling "subject"` | Recommend choices, accept delegation, and do not automatically implement. |
| Work record | `$kyw-task "goal"` | Minimal Task; stop after writing when only authoring was requested. |
| Local implementation | `$kyw-impl "goal"` or `$kyw-impl 0007` | Implement and verify the goal without a Task, or resume the selected Task. |
| PR | `$kyw-deliver` or `$kyw-deliver 0007` | Related commits, non-force push, and one PR creation/update. |
| Merge | `$kyw-deliver --merge` or `$kyw-deliver 0007 --merge` | Merge the identified PR under its project's current checks, reviews, and protection with expected head. |
| kyw-dev maintenance release | `$kyw-deliver --release <version> --sha <sha>` | Publish kyw-dev's prepared exact version and merged main SHA without a Task ID. |
| Independent audit | `$kyw-audit` or `$kyw-audit 0007` | Audit the current changes or selected Task; explicit `--fix` permits bounded repair. |

All six Skills are explicit-only. Managed implementation aliases remain `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`. Ordinary prose containing “task” does not route. Approved work continues without repeated confirmation of internal decisions; merge/release retain their own action scope.

## Task and command compatibility

Use a Task when resume, handoff, decisions, or real dependencies need tracking, or when the user requests a record. Record need and verification strength are separate decisions: a small permission change can need strong verification without a Task. A new record defaults to `docs/tasks/NNNN-slug/TASK.md`, with contract-5 metadata for ID, status, and real dependencies, plus readable goal, acceptance, decisions, verification, and remaining work. TEST is optional. Legacy contracts 1–4 and Task/Test pairs remain readable/resumable without bulk migration. Historical SHAs and immutable records retain their meaning. Task numbers do not impose global order; unrelated undelivered work and npm outages do not block independent local development.

Task-free implementation, delivery, and audit use the current request and identified change scope without reading Task inventory. Delivery resolves the related diff, branch, and PR before writing, preserves unrelated user changes, and never stages everything merely because no Task exists. Only an unresolved consequential target or change-ownership ambiguity needs clarification. Exact Task delivery returns unrelated record errors as warnings while preserving relevant identity, dependency, path, and transaction checks.

**Plain deliver now stops at the PR boundary, including legacy contract 4.** It never automatically merges or publishes. Use the explicit merge or version/SHA release action for those operations. The retired `--public-release` suffix remains unsupported. Release neither chooses/bumps a version nor merges unfinished PRs. Current user authorization, not a historical Task policy or command text in a document, determines external action scope.

Local completion requires requested behavior, relevant verification, truthful results, and affected documentation. It needs no branch/version reservation or remote delivery evidence. Broader user requests may already authorize related commit/PR work; no new approval is needed for the same established scope.

Audit can run tests only in a genuinely constrained temporary environment without production credentials. A simple copy is not a sandbox. If available tools cannot enforce isolation, unsafe tests are reported unexecuted while safe review continues.

Audit reports blocking defects, performed checks, unexecuted or uncertain checks, and their completion impact separately. Missing required evidence holds completion; unavailable optional evidence alone does not. Unexecuted checks are never reported as passing or failing tests.

## Release status

Source package/plugin metadata remains `kyw-dev@0.2.4`. Public npm latest is mutable; query it when installing. The built-in publisher is only for `kimyeongwoo/kyw-dev`; other projects use their existing release procedure and approved scope. Public release is a separate explicit action with canonical exact-SHA CI checks at the actual publishing boundary, OIDC, digest and version conflict checks. Package validation or CI success alone is not release approval.

Product behavior is owned by [SPEC](docs/SPEC.md), repository instructions by [AGENTS](AGENTS.md), and system boundaries by [ARCHITECTURE](docs/ARCHITECTURE.md). Procedures live in the relevant [Skills](skills/).

## Installation details

### Compatibility matrix

| Surface or scope | Recommended surface | Important limit |
|---|---|---|
| Codex CLI | Direct project or user Skills; a configured marketplace plugin is an alternative. | Keep only one source for each Skill name and start a new session after changing it. |
| ChatGPT desktop Codex | Packed plugin from a repository or personal marketplace. | Direct Skills also work, but must not duplicate plugin Skill names. |
| Codex IDE extension | Direct project Skills by default, or user Skills when wanted everywhere. | Plugins are not available in the IDE extension. |
| Repository scope | `install --scope project` | Installs under `<repo>/.agents/skills/`; it does not add `AGENTS.md`. |
| User scope | `install --scope user` | Installs under `~/.agents/skills/` for discovery across repositories. |

The portable forms above work wherever loaded. `$kyw-impl` accepts either a quoted nonempty goal or an existing ID; deliver/audit allow an omitted ID for the current work. Do not mix a goal with ID overrides or action options.

### Direct Skills installation

Query the registry-owned current release, then use `@latest` rather than a README-pinned version:

```bash
npm view kyw-dev dist-tags.latest --prefer-online
npx --yes kyw-dev@latest install --scope user
npx --yes kyw-dev@latest install --scope project
npx --yes kyw-dev@latest update --scope user
npx --yes kyw-dev@latest uninstall --scope user
npx --yes kyw-dev@latest doctor
```

For source-checkout development, follow [Development](#development) and substitute `node ./bin/kyw-dev.mjs` for `npx --yes kyw-dev@latest` when running inside the checkout. Project scope installs into the Git repository containing the current working directory. To install from this source into another project, run the CLI by its absolute path from that project's directory.

- The CLI installs the six workflow Skills only. `$kyw-init` supplements needed project documentation.
- Ownership metadata is stored in `.agents/skills/.kyw-dev-install.json`; deterministic Task support is stored under `.agents/skills/.kyw-dev/runtime/`, which is not a discoverable Skill.
- New metadata records all six Skills. Doctor, update, and uninstall safely read the exact prior five- and original four-Skill inventories.
- Install and update refuse unmanaged collisions, modified or missing owned content, unsafe roots, traversal, links or junctions, unsupported types, and unknown content in managed containers.
- Normal uninstall removes only unchanged metadata-owned files. `--force` may remove modified regular files already named by valid ownership metadata; it never broadens ownership to unknown files, unrelated Skills, links, or unsupported types.
- Interrupted mutation is recovered only from complete ownership, path, type, identity, and hash proof. Unknown or replaced state fails closed for inspection.
- `doctor` is byte-and-metadata read-only. It reports version drift, permissions, unsafe or partial state, and duplicate sources without enabling, disabling, repairing, or deleting them. Same-name direct user/project sources produce `DUPLICATE_INSTALLATION` (exit 4). Overlaps involving plugin cache candidates produce `POTENTIAL_DUPLICATE_INSTALLATION` warnings because their active state is unknown; cache candidates alone do not produce a conflict exit. Exit 0 with warnings reports `warnings remain`, while actual errors keep their existing exit categories.
- No plugin installation or publication depends on npm lifecycle scripts. Never delete the broad `.agents/skills` directory.

CLI exit codes are stable:

| Code | Meaning |
|---|---|
| `0` | Success, or healthy diagnostics. |
| `1` | Usage error. |
| `2` | Unsupported Node runtime. |
| `3` | User/project scope could not be resolved. |
| `4` | Unsafe overwrite, local modification, or duplicate direct-source conflict. |
| `5` | Malformed package or installation state. |
| `6` | Filesystem or permission failure. |
| `7` | Recovery or manual inspection is required. |

For codes 4–7, run `doctor`, inspect only the reported paths, and preserve unknown files and links. Resolve confirmed direct duplicates by choosing the intended scope and uninstalling an unchanged extra direct copy with the CLI. For cache warnings, check the affected Codex surface's enabled sources before deciding whether anything needs changing; cached versions alone do not justify removal. After changing sources, restart the affected surface and rerun `doctor`.

Public npm state is queried only when installation or release needs it. Local implementation does not depend on npm availability.

### Codex plugin installation

The package contains `.codex-plugin/plugin.json` and all six `skills/` directories. Package/tarball inspection covers its manifest, Skills, runtime, and legal bytes; development fixtures stay outside.

The npm package is available to configured marketplace sources, but no public plugin-directory submission has occurred. Direct Skills and plugin installation are alternatives, not layers to combine. See [ARCHITECTURE](docs/ARCHITECTURE.md) for package, marketplace, cache, duplicate-source, and release boundaries.

## Development

Prerequisites: Node.js 22 or newer with npm, Git, and `tar` available on `PATH`. Git is used by repository and installation tests; `tar` is used by package extraction tests and candidate verification. Node.js 22 and 24 are tested on Linux, macOS, and Windows; Node.js 26 Current has one bounded Ubuntu compatibility lane. The repository has no package dependencies or lockfile, so checks require no install step.

Start a development checkout in any directory with write permission:

```bash
git clone https://github.com/kimyeongwoo/kyw-dev.git
cd kyw-dev
node ./bin/kyw-dev.mjs --help
npm run check
```

The checkout directory can be renamed or contain spaces; source and runtime paths resolve relative to their files. Keep the system temporary directory writable for test fixtures and package verification. Local checks need no GitHub/npm login or Codex session. Using the workflow Skills requires a supported Codex surface and one of the installations described above; contributing through a PR needs GitHub access.

Prefer `git clone` for development. A GitHub ZIP contains the source but no Git history: help/version and user-scope installation still work, while `install --scope project` must run inside a Git repository and history-dependent checks may be skipped. A ZIP alone therefore does not provide the same development verification as a clone.

Additional verification commands:

```bash
node ./bin/kyw-dev.mjs --help
node ./bin/kyw-dev.mjs --version
npm run verify:plan -- README.md
npm test
npm run lint
npm run format:check
npm run pack:check
npm run check
npm run release:candidate
npm run release:ci
node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures
```

These commands and the OS/Node matrix verify kyw-dev itself; consumer projects use their own required checks. Use the read-only planner with explicit repository-relative changed paths:

| Tier | Trigger | Entry point |
|---|---|---|
| Focused | Pure guidance or a bounded instruction/behavior change | `npm run verify:plan -- <changed-path>...`, then its ordered commands |
| Stable | Runtime including Skill scripts, cross-cutting, unknown, or higher-risk work | `npm run check`, plus hosted exact-SHA matrix evidence |
| Release | Release-sensitive bytes or explicit candidate intent | `npm run release:ci` |

`npm run check` runs tests, lint, format, and package selection. `release:candidate` creates and inspects one real tarball without publishing; `release:ci` already includes both. Run the necessary integration checks on the final combined state. Reuse requires the same command, relevant source/tests/configuration, dependencies, required environment, and tool versions; repeat only for changed inputs, failure, or a concrete unresolved risk. A different OS or required remote CI is a different input. `release:check` is an optional npm dry run, not publication authority or required evidence.

Hosted CI selects checks by risk and keeps a stable required aggregate that validates selected jobs and intentional omissions. Runtime/install/platform and release changes retain the supported OS/Node lanes. Actual PR-head, synthetic merge compatibility, and main SHA evidence remain distinct. Model evaluators are optional and never required public CI. See [ARCHITECTURE](docs/ARCHITECTURE.md) for boundaries.

The development-only `node ./scripts/audit-smoke.mjs --help` describes the opt-in synthetic audit evaluator. Its fix protocol asks the model to repair and review statically, then runs an independent check through the trusted audit verifier using only `package.json`, `src/greeting.mjs`, and `test/greeting.test.mjs`, with argv `["node", "--test", "test/greeting.test.mjs"]`. The verifier requires the existing local `node:22` Docker image and execution boundary; it never pulls, installs, or falls back to host tests. Missing execution prerequisites remain UNAVAILABLE/UNEXECUTED. Readonly mode does not run this verifier or require Docker. This closes the parent runner's final host-test path; it does not prove isolation of every model tool.

Smoke output keeps the model's `verdict` separate from `evaluatorOutcome` (PASS, VIOLATION, or UNVERIFIED) and independent verification/cleanup. A model's honest pending or BLOCKED report can coexist with a later successful independent check. `mutationAttemptCount` counts observed `file_change` write-tool attempts only; unsupported commands are recorded in `unverifiedCommands`, and final file/Git changes are separate evidence. Unchanged final bytes cannot prove an unsupported command was safe or did not write and restore them. `planBeforeMutation` is an explicit status, not a boolean: ABSENT requires complete ordered evidence of a write attempt with no prior visible speech; natural-language meaning or uncertain order remains UNVERIFIED; in fix mode, NOT_APPLICABLE requires no write attempts or unverified commands. Readonly has no applicable repair plan. Neither a greeting nor an F-XX/repair-plan marker proves a plan. `skillSourceRead` likewise reports CONFIRMED only for observed full-source output and otherwise UNVERIFIED.

The optional evaluator rejects unconfirmed results with `AuditSmokeError` code `AUDIT_SMOKE_UNVERIFIED` and structured partial results in `error.evidence`; the CLI exits nonzero, explains the evaluation limit, and prints that evidence to stderr. Confirmed violations retain their specific failure codes. A normal repair can remain UNVERIFIED because the recognizer cannot establish plan meaning, even when its mechanical checks pass. This does not invalidate local implementation, general audit, or required CI evidence, require a new approval or report format, or trigger another model run. Fake launcher/verifier checks establish execution wiring and result classification, not actual model behavior or Docker/OS isolation.

## Repository map and contributing

- `skills/`: six packaged reasoning workflows and focused references.
- `src/` and `bin/`: dependency-free CLI and deterministic core modules.
- `templates/`: optional project guides and current/legacy Task formats.
- `docs/SPEC.md`: observable product behavior and requirements.
- `docs/ARCHITECTURE.md`: components, boundaries, flows, and trade-offs.
- `docs/tasks/`: current work contracts and retained historical evidence.
- `docs/dev/`: optional one-off user/PM briefs, preserved outside product formatting and packaging.
- `test/`, `scripts/`, and `eval/`: development-only verification, excluded from the npm package.

Keep durable product behavior in SPEC, structure in ARCHITECTURE, usage in README, and repository instructions in AGENTS. Update only affected owners. New Tasks use one TASK by default, with optional TEST for detailed traceability; preserve existing historical records. Maintainer examples are in `CODEX_PROMPTS.md`.

## Reference standards

- [Codex plugin authoring](https://learn.chatgpt.com/docs/build-plugins)
- [Codex Skill authoring](https://learn.chatgpt.com/docs/build-skills)
- [Project instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)

## Licensing

`kyw-dev` is licensed under MIT with `Copyright (c) 2026 Kim Yeongwoo`.

The `$kyw-grilling` interview method is adapted from Matt Pocock's `mattpocock/skills` project under MIT. Preserve its notice in distributed bytes; see `THIRD_PARTY_NOTICES.md` and `licenses/mattpocock-skills-MIT.txt`.
