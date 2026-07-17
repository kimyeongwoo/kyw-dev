# TASK 0001 — Plugin Foundation

## Status

DONE

## Goal

Create a valid, packable `kyw-dev` npm/Codex plugin foundation with a minimal CLI entrypoint and test harness.

## Dependencies

- None

## In Scope

- Initialize `package.json` for an ESM CLI package.
- Create `.codex-plugin/plugin.json` with the required plugin identity and `./skills/` path.
- Create the target source, Skill, template, test, and legal directory skeletons.
- Provide `kyw-dev --help` and `kyw-dev --version` without filesystem mutation.
- Provide all four planned Skills as valid, explicit-invocation-only, non-mutating stubs.
- Choose and configure the initial test, lint, and formatting commands.
- Add development-only, dependency-free validation for syntax, metadata, text format, and package contents.
- Add project license after confirming the publication license; retain third-party notices.

## Out of Scope

- Implementing workflow behavior inside the Skills.
- User/project installation behavior.
- Public npm publication or plugin-directory submission.

## Acceptance Criteria

- [x] AC-01: `package.json` and plugin manifest identify `kyw-dev` and have synchronized versions.
- [x] AC-02: The manifest uses valid relative paths and references `./skills/`.
- [x] AC-03: `kyw-dev --help` and `--version` execute successfully on the supported Node version.
- [x] AC-04: The repository has a runnable automated test command.
- [x] AC-05: `npm pack --dry-run` contains required plugin, legal, README, CLI, and future Skill paths without unrelated development artifacts.
- [x] AC-06: The final project license decision is recorded before any publish action.
- [x] AC-07: All four Skill directories have valid metadata, allow explicit invocation only, and stop with an unimplemented notice without modifying files.
- [x] AC-08: The foundation has no production/development dependencies, npm lifecycle scripts, MCP servers, apps, or hooks.
- [x] AC-09: The CLI accepts no arguments/help/version aliases, rejects unknown arguments with exit code 1, and never changes the caller's working directory.
- [x] AC-10: The stable test, lint, format, and package checks run on Node.js 22 or newer using only development-time Node built-ins.

## Plan

- [x] Verify the current official plugin manifest requirements and npm package conventions.
- [x] Scaffold package metadata and directory structure.
- [x] Implement minimal CLI dispatch for help/version only.
- [x] Add manifest/package consistency validation.
- [x] Configure tests, lint/format, and package-file inspection.
- [x] Run the full Task 0001 test matrix and update documentation.

## Decisions

- Follow `docs/SPEC.md` and `docs/ARCHITECTURE.md`; record any necessary deviation before implementing it.
- Require Node.js 22 or newer because Node.js 20 reached end-of-life on 2026-03-24.
- Use MIT for `kyw-dev`, publisher/author name `kyw-dev`, and `Copyright (c) 2026 kyw-dev`.
- Keep both production and development dependencies at zero; use Node built-ins for the Task 0001 harness.
- Keep the npm package private until a future release Task explicitly authorizes publication.
- Use the official creator scripts only in a temporary directory as scaffold references; do not create a marketplace entry.

## Risks

- The preferred unscoped npm name may be unavailable; package metadata must allow a scoped fallback without changing plugin/CLI identity.
- A generated plugin scaffold may add unneeded app, MCP, or hook files; remove them from MVP.
- The preferred package name and later publication metadata remain release risks, but Task 0001 prevents publishing with `private: true`.

## Discoveries and Changes

- The working directory has no Git metadata (`git rev-parse --is-inside-work-tree` exited 128). Do not initialize Git. A verified 26-file pre-change snapshot was created at `C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0001-before-11482f500d7543aaafe9bdb03e514004`; final review will use `git diff --no-index` plus file-list comparison.
- Current official Node.js release information lists Node.js 20 as EOL and Node.js 22 as supported LTS, so the minimum runtime changed from the provisional Node.js 20 target to Node.js 22.
- The plugin validator requires real `description`, `author.name`, and install-surface `interface` metadata in addition to the minimal plugin identity and Skill path.
- On this Windows host, `python` resolves to Python 3.13.9 while `python3` is unavailable. Official Python validators must be invoked with `python` here.
- The user confirmed MIT, publisher/author display name `kyw-dev`, and the project copyright holder `kyw-dev` in the implementation plan.
- Task 0001 now explicitly covers valid non-mutating stubs for all four future Skills and the CLI unknown-argument branch so the packed foundation is behaviorally closed without implementing future workflows.
- The first Windows `pack:check` attempt exposed that direct `spawnSync("npm.cmd")` did not provide a usable process result. The checker now executes npm through `npm_execpath` when available and uses a Windows shell fallback only outside npm; the same check then passed.

## Documentation Impact

- SPEC: Updated the supported runtime from provisional Node.js 20+ to Node.js 22+, recorded the confirmed MIT/publication identity decisions, and defined help/version/usage/cwd behavior.
- ARCHITECTURE: Updated the runtime and added the development-only validation boundary excluded from the package.
- README: Updated the actual Task 0001 status, stub/CLI limits, prerequisites, commands, and MIT license.
- AGENTS: Added the four stable repository verification commands.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Inspected the permanent documents, Task/Test contract, legal notices, current environment, and official plugin/Skill/npm/Node requirements.
- Created and hash-verified the pre-change snapshot without initializing Git.
- Reconciled the permanent documentation before implementation.
- Generated official plugin and Skill scaffolds in a temporary directory without creating a marketplace entry, then applied only the reviewed Task 0001 structure.
- Implemented the ESM CLI, package/plugin metadata, MIT license, four explicit-only Skill stubs, template skeletons, Node built-in tests, and development-only validation scripts.
- Passed the official plugin validator, all four official Skill validators, the Node.js 24 and Node.js 22.23.1 CLI/test runs, the stable repository checks, and the exact 19-file npm tarball allowlist.
- Reviewed the full snapshot diff and hash/file-list audit: 6 expected existing files changed, 22 expected files added, 20 existing files unchanged, and no files deleted.

## Remaining

- None.

## Resume Point

Task 0001 is complete. Begin any later workflow implementation from its own numbered Task; do not extend these stubs under Task 0001.

## Blockers

- None known.
