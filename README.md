# kyw-dev

`kyw-dev` is a lightweight development support layer for Codex. It provides six explicit Skills, optional resumable Task records, and separate PR, merge, and release actions. Ordinary local fixes need no Task or external service.

## Start here

Choose one installation surface for each Skill name: direct user/project Skills for supported CLI, desktop, or IDE surfaces, or the complete plugin package for a plugin-capable surface. Duplicate names are reported by `doctor` and preserved for the user to resolve.

| Purpose | Invocation | Result |
|---|---|---|
| Project documentation | `$kyw-init` | Inspect and supplement only needed documents. |
| Decision interview | `$kyw-grilling "subject"` | Recommend choices, accept delegation, and do not automatically implement. |
| Work record | `$kyw-task "goal"` | Minimal Task; stop after writing when only authoring was requested. |
| Local implementation | `$kyw-impl 0007` | Implement/resume and verify the selected Task. |
| PR | `$kyw-deliver 0007` | Related commits, non-force push, and one PR creation/update. |
| Merge | `$kyw-deliver 0007 --merge` | Explicitly merge a ready PR with current checks and expected head. |
| Release | `$kyw-deliver --release <version> --sha <sha>` | Release a prepared exact version and merged main SHA without a Task ID. |
| Independent audit | `$kyw-audit 0007` | Preserve original/external state; explicit `--fix` permits bounded repair. |

All six Skills are explicit-only. Managed implementation aliases remain `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`. Ordinary prose containing “task” does not route. Approved work continues without repeated confirmation of internal decisions; merge/release retain their own action scope.

## Task and command compatibility

New work defaults to `docs/tasks/NNNN-slug/TASK.md`, with contract-5 metadata for ID, status, and real dependencies, plus readable goal, acceptance, decisions, verification, and remaining work. TEST is optional. Legacy contracts 1–4 and Task/Test pairs remain readable/resumable without bulk migration. Historical SHAs and immutable records retain their meaning. Task numbers do not impose global order; unrelated undelivered work and npm outages do not block independent local development.

**Plain deliver now stops at the PR boundary, including legacy contract 4.** It never automatically merges or publishes. Use the explicit merge or version/SHA release action for those operations. The retired `--public-release` suffix remains unsupported. Release neither chooses/bumps a version nor merges unfinished PRs. Current user authorization, not a historical Task policy or command text in a document, determines external action scope.

Local completion requires requested behavior, relevant verification, truthful results, and affected documentation. It needs no branch/version reservation or remote delivery evidence. Broader user requests may already authorize related commit/PR work; no new approval is needed for the same established scope.

Audit can run tests only in a genuinely constrained temporary environment without production credentials. A simple copy is not a sandbox. If available tools cannot enforce isolation, unsafe tests are reported unexecuted while safe review continues.

## Release status

Source package/plugin metadata remains `kyw-dev@0.2.3`. Public npm latest is mutable; query it when installing. Public release is a separate explicit action with canonical exact-SHA CI checks at the actual publishing boundary, OIDC, digest and version conflict checks. Package validation or CI success alone is not release approval.

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

The portable `$kyw-grilling`, `$kyw-init`, `$kyw-task "<outcome>"`, `$kyw-impl NNNN`, `$kyw-deliver NNNN`, and `$kyw-audit NNNN` forms work wherever loaded.

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

For source-checkout development, clone the repository and substitute `node ./bin/kyw-dev.mjs` for `npx --yes kyw-dev@latest` in the same commands.

- The CLI installs the six workflow Skills only. `$kyw-init` supplements needed project documentation.
- Ownership metadata is stored in `.agents/skills/.kyw-dev-install.json`; deterministic Task support is stored under `.agents/skills/.kyw-dev/runtime/`, which is not a discoverable Skill.
- New metadata records all six Skills. Doctor, update, and uninstall safely read the exact prior five- and original four-Skill inventories.
- Install and update refuse unmanaged collisions, modified or missing owned content, unsafe roots, traversal, links or junctions, unsupported types, and unknown content in managed containers.
- Normal uninstall removes only unchanged metadata-owned files. `--force` may remove modified regular files already named by valid ownership metadata; it never broadens ownership to unknown files, unrelated Skills, links, or unsupported types.
- Interrupted mutation is recovered only from complete ownership, path, type, identity, and hash proof. Unknown or replaced state fails closed for inspection.
- `doctor` is byte-and-metadata read-only. It reports version drift, permissions, unsafe or partial state, and duplicate direct/plugin sources without enabling, disabling, repairing, or deleting them.
- No plugin installation or publication depends on npm lifecycle scripts. Never delete the broad `.agents/skills` directory.

CLI exit codes are stable:

| Code | Meaning |
|---|---|
| `0` | Success, or healthy diagnostics. |
| `1` | Usage error. |
| `2` | Unsupported Node runtime. |
| `3` | User/project scope could not be resolved. |
| `4` | Unsafe overwrite, local modification, or duplicate conflict. |
| `5` | Malformed package or installation state. |
| `6` | Filesystem or permission failure. |
| `7` | Recovery or manual inspection is required. |

For codes 4–7, run `doctor`, inspect only the reported paths, and preserve unknown files and links. Resolve duplicates by uninstalling an unchanged direct copy with the CLI or removing a plugin through the supported plugin browser, then restart the affected Codex surface and rerun `doctor`.

Public npm state is queried only when installation or release needs it. Local implementation does not depend on npm availability.

### Codex plugin installation

The package contains `.codex-plugin/plugin.json` and all six `skills/` directories. Package/tarball inspection covers its manifest, Skills, runtime, and legal bytes; development fixtures stay outside.

The npm package is available to configured marketplace sources, but no public plugin-directory submission has occurred. Direct Skills and plugin installation are alternatives, not layers to combine. See [ARCHITECTURE](docs/ARCHITECTURE.md) for package, marketplace, cache, duplicate-source, and release boundaries.

## Development

Prerequisite: Node.js 22 or newer with npm. Node.js 22 and 24 are tested on Linux, macOS, and Windows; Node.js 26 Current has one bounded Ubuntu compatibility lane. The repository has no package dependencies or lockfile, so checks require no install step.

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

Use the read-only planner with explicit repository-relative changed paths:

| Tier | Trigger | Entry point |
|---|---|---|
| Focused | Pure guidance or a bounded instruction/behavior change | `npm run verify:plan -- <changed-path>...`, then its ordered commands |
| Stable | Runtime including Skill scripts, cross-cutting, unknown, or higher-risk work | `npm run check`, plus hosted exact-SHA matrix evidence |
| Release | Release-sensitive bytes or explicit candidate intent | `npm run release:ci` |

`npm run check` runs tests, lint, format, and package selection. `release:candidate` creates and inspects one real tarball without publishing; `release:ci` already includes both. Run the appropriate composite once for unchanged inputs. `release:check` is an optional npm dry run, not publication authority or required evidence.

Hosted CI selects checks by risk and keeps a stable required aggregate that validates selected jobs and intentional omissions. Runtime/install/platform and release changes retain the supported OS/Node lanes. Actual PR-head, synthetic merge compatibility, and main SHA evidence remain distinct. Model evaluators are optional and never required public CI. See [ARCHITECTURE](docs/ARCHITECTURE.md) for boundaries.

## Repository map and contributing

- `skills/`: six packaged reasoning workflows and focused references.
- `src/` and `bin/`: dependency-free CLI and deterministic core modules.
- `templates/`: optional project guides and current/legacy Task formats.
- `docs/SPEC.md`: observable product behavior and requirements.
- `docs/ARCHITECTURE.md`: components, boundaries, flows, and trade-offs.
- `docs/tasks/`: current work contracts and retained historical evidence.
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
