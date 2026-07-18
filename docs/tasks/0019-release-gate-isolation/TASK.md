# TASK 0019 — Release Gate Isolation

## Status

DONE

## Goal

Create a development-only, fail-closed release lifecycle runner that proves real-tarball direct and marketplace installation behavior entirely inside an approved temporary root while detecting any change to normal user state.

## Dependencies

- `0015-release-metadata-and-hygiene`
- `0016-release-readiness-gate`
- `0018-audit-readonly-diagnostics`
- `../../../test/distribution.test.mjs`
- `../../../scripts/packed-release-check.mjs`
- `../../../bin/kyw-dev.mjs`
- `../../../src/cli/run.mjs`
- `../../../src/core/skill-installation.mjs`
- `../../../test/fixtures/distribution/marketplace-root/.agents/plugins/marketplace.json`

## In Scope

- Add one development-only release lifecycle runner and deterministic guard/sentinel helpers under `scripts/`.
- Resolve every writable/cwd lifecycle target to an absolute path and prove it is a real strict descendant of one runner-created approved temporary root.
- Reject a candidate target before any child process starts when it equals or descends from normal `%USERPROFILE%\.agents`, normal `.codex`, an explicitly configured normal Codex root, or the actual/default npm userconfig path.
- Treat Windows path identity as case-insensitive and accept both separator spellings when checking equality/containment.
- Use unambiguous local identifiers such as `isolatedUserRoot`, `isolatedCodexRoot`, and `isolatedNpmRoot`; never use `$home`, `$HOME`, or `$CODEX_HOME` as local variables.
- Pass isolated HOME/USERPROFILE, Codex, npm userconfig/cache, temporary, and XDG locations only through each child process environment without mutating the runner process environment.
- Hash normal protected state read-only before and after the lifecycle and fail regardless of product success if any protected sentinel/hash changes.
- Limit recursive cleanup to the exact identity-checked, link-free approved temporary root and reject broad or substituted cleanup targets.
- From one real npm tarball, exercise user and project install/update/doctor/normal-uninstall; user normal-uninstall refusal plus force preservation of unknown/unrelated content; and Codex marketplace add/plugin install/plugin remove/marketplace remove.
- Replace the distribution test's ad hoc lifecycle orchestration with the guarded runner and add intentional pre-spawn guard-failure coverage.

## Out of Scope

- Changing production CLI installation, update, doctor, uninstall, metadata, or transaction behavior.
- Adding any production or development package dependency.
- Changing public package contents or relying on npm lifecycle scripts.
- Publishing to npm, creating/pushing a tag, creating a GitHub release, or submitting a public plugin.
- Implementing Task 0016's hosted-CI, publication-authentication, or Task 0017 model-evaluation blockers.

## Acceptance Criteria

- [x] AC-01: The design is development-only, imports no production dependency into the packaged runtime, adds no package dependency, and leaves the tarball allowlist unchanged.
- [x] AC-02: Runner locals use collision-resistant names including `isolatedUserRoot`, `isolatedCodexRoot`, and `isolatedNpmRoot`; no local `$home`, `$HOME`, or `$CODEX_HOME` variable exists.
- [x] AC-03: Every lifecycle target/cwd is absolute, materialized targets are real/link-free strict descendants of the approved temporary root, and a normal agents/Codex/npm path collision fails before the first child process.
- [x] AC-04: Guard tests cover exact and descendant collisions plus Windows case-insensitive and `/` versus `\` separator variants.
- [x] AC-05: Isolated HOME/USERPROFILE, Codex, npm userconfig/cache, TEMP/TMP/TMPDIR, and XDG values are present only in child environments; the parent environment is byte-for-byte unchanged for those keys.
- [x] AC-06: Normal agents, Codex, configured Codex, and actual/default npm userconfig sentinel/tree hashes are captured read-only before/after; any difference makes the runner fail even if every product command passed.
- [x] AC-07: Cleanup recursively removes only the exact runner-created root after parent, prefix, identity, realpath, containment, and link-free tree checks; a broad/substituted target is refused.
- [x] AC-08: One actual tarball passes user and project install/update/doctor/normal uninstall plus the conflict/force preservation branch, with unknown and unrelated bytes retained.
- [x] AC-09: When Codex is available, the same extracted tarball passes isolated marketplace add, four-Skill plugin install/cache verification, plugin remove, and marketplace remove; explicit required mode fails closed if Codex is unavailable.
- [x] AC-10: Focused guard tests, the complete isolated lifecycle E2E, all four stable commands, Task validation, and final diff review pass; normal state and unrelated work remain unchanged and no forbidden release action runs.

## Plan

- [x] Read permanent truth, Tasks 0015–0018 evidence, and the explicit direct-install/marketplace/distribution implementation dependency graph.
- [x] Confirm Task 0019 was absent, capture the dirty-worktree baseline, and create this Task/Test pair together.
- [x] Implement pure cross-platform path comparison, protected-state snapshot, child-environment, pre-spawn guard, and exact-root cleanup primitives in a development-only runner.
- [x] Implement the real-tarball user/project/force/marketplace lifecycle and bounded JSON evidence summary.
- [x] Replace ad hoc distribution orchestration and add intentional guard-failure plus sentinel/environment/cleanup regressions.
- [x] Synchronize Architecture and README only where the new development command/boundary changes durable truth.
- [x] Run focused tests, the required-marketplace real lifecycle, four stable commands, Task validation, and final scope/diff review.

## Decisions

- Keep production installation code unchanged. Task 0016 proved the packed product lifecycle after correcting orchestration; the defect was the release harness's state boundary.
- Use one Node.js development-only runner so PowerShell's case-insensitive variable namespace cannot alias a normal home path.
- Guard lexically before creating target directories, then re-prove realpaths/link-free ancestry after materialization and immediately before child execution.
- Protect both the profile-default `.codex` path and a distinct configured `CODEX_HOME`, and protect both an explicit npm userconfig and its profile-default fallback where applicable.
- A missing Codex CLI may be explicitly tolerated only by the public-test caller; the standalone release-gate command requires marketplace evidence and fails closed.
- No production dependency is required.

## Risks

- Normal Codex state can change concurrently; strict before/after comparison intentionally reports that as a failed isolation proof rather than guessing its cause.
- npm and Codex launchers differ across Windows/POSIX; every spawned command must inherit only the constructed child environment while retaining a usable PATH.
- A cached plugin tree could contain a link or special file; cleanup must fail and retain the exact temporary root rather than follow or broadly remove it.
- Moving existing distribution assertions into the runner could accidentally weaken packed-content coverage; retain the exact allowlist, legal, secret/local-path, and cached-byte checks.

## Discoveries and Changes

- Task 0016's correctly isolated rerun passed the product lifecycle. Its no-touch failure came from a PowerShell `$home` local colliding case-insensitively with normal `$HOME`, temporarily directing writes to `%USERPROFILE%\.agents`.
- The current distribution E2E builds `{ ...process.env, HOME: home, USERPROFILE: home }` and `{ ...process.env, CODEX_HOME: codexHome }`, but it has no normal-path collision guard, no isolated npm userconfig/cache, no protected-state before/after hash, and cleanup relies only on a test temporary-directory callback.
- The production CLI resolves Windows user scope from `USERPROFILE || HOME`, performs ownership-safe conflict/force behavior, and already has direct tests for unknown/unrelated preservation. Task 0019 will exercise those public commands from extracted tarball bytes rather than alter the implementation.
- `scripts/packed-release-check.mjs` already demonstrates exact archive-name containment and a temporary-root cleanup prefix check, but it does not own the direct/marketplace lifecycle. Its packed-content contract remains an explicit dependency, not a production import target.
- Initial baseline: branch `task/0013-filesystem-security-hardening`, HEAD `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`, with extensive pre-existing tracked/untracked user work. Relevant initial SHA-256 values are package `504d7cc8...bf3d8`, distribution test `d493fd3a...ac6ae`, packed check `873dfcad...e9e4a`, Architecture `26d009cb...abd`, and README `905a636d...fe8`.
- The first guard-only run correctly started no lifecycle child but could not byte-hash one Windows-locked normal Codex file (`EBUSY`). The sentinel now hashes readable control bytes and records type/size/time/identity plus an unreadable-state marker for a locked control file, so inability to read does not become silent exclusion.
- A first real E2E attempt failed before npm state change because Windows rejected direct `spawnSync` execution of `npm.cmd` with `EINVAL`. The runner now uses the already-proven `cmd.exe /d /c npm` launcher only on Windows; all child isolation remains identical.
- The next real E2E intentionally failed its final `normal-codex` sentinel even though product steps ran. Read-only timestamp inspection showed only the live host's `sessions/*.jsonl` and `logs_2.sqlite*` payloads changing, not normal plugin state. The final Codex sentinel therefore hashes top-level structure and all plugin/Skill/config/auth/control bytes while representing active session/log/cache payloads structurally. It still fails on any normal marketplace/plugin-control change.
- The implemented runner guards 17 named target paths, passes isolated user/Codex/npm/temp/XDG state only to children, revalidates the root and every existing path chain before each spawn, and refuses cleanup unless the exact root parent/prefix/identity/realpath/link-free-tree proof holds.
- Required-mode E2E passed from `kyw-dev-0.1.0.tgz` with 29 files, 60,140 bytes, and SHA-256 `cd85d391687a2a69ed6e20c06f645db63e82f0a8150882d3c40e4217691cd121`. All 11 direct steps and six Codex `0.144.5` marketplace steps passed; every packed file in all four cached Skill trees matched.
- Before/after sentinels were identical: normal agents `b7d56767...ad17` (5 entries), normal Codex control `4181716c...5968` (3,469 entries), and actual default npm userconfig `4a141f5f...a9b5` (1 entry). Parent environment was unchanged, exact-root cleanup succeeded, and zero `kyw-dev-release-gate-*` roots remain.
- `package.json` and `scripts/packed-release-check.mjs` retain their initial SHA-256 values, dependencies/devDependencies remain absent, `scripts/` remains outside package files, and dry-run packing still reports exactly 29 files.

## Documentation Impact

- SPEC: Unchanged; this Task adds development verification isolation without changing product behavior or requirements.
- ARCHITECTURE: Updated the development-only validation boundary, release-gate data flow, guarded targets, sentinels, and cleanup ownership.
- README: Updated the contributor/release verification command and its isolated-state/marketplace prerequisites.
- AGENTS: Unchanged; repository-wide workflow and completion rules remain accurate.

## Completed

- Read and reconciled every user-required document and explicit implementation dependency.
- Confirmed Task 0019 was absent and created its Task/Test pair together before implementation.
- Captured initial repository provenance, dirty-state constraint, relevant source hashes, failure cause, and the smallest Architecture-aligned design.
- Implemented the development-only fail-closed runner, replaced the distribution test's ad hoc lifecycle, and added six focused guard/sentinel/environment/cleanup regressions.
- Preserved exact packed-content/legal checks, strengthened marketplace verification to compare every file in all four cached Skill trees, and exercised all required direct/force/plugin lifecycle branches.
- Synchronized README and Architecture without changing Spec, AGENTS, package dependencies, package scripts, production code, or tarball contents.
- Passed focused 6/6, combined 8/8, required-marketplace real-tarball execution, full `npm test` 130/130, preliminary lint/format/pack checks, and cleanup/residual scans.
- Passed the final `npm run release:ci`: 130/130 tests, lint 35 modules plus foundation metadata, format 161 files, pack check 29 files/60,140 bytes, and packed release check SHA-256 `cd85d391...cd121`.
- Validated the Task pair, reviewed the seven declared Task 0019 paths against the initial dirty baseline, found no generated archive or runner-root residue, and passed `git diff --check`. Every pre-existing unrelated tracked/untracked status entry remains.
- Confirmed no normal agents/Codex/npm control state, parent environment, package dependency, production module, publication, tag, GitHub release, or public plugin-submission state changed.

## Remaining

- None.

## Resume Point

Task 0019 is complete. Use `node ./scripts/release-gate-isolation.mjs` for required local release lifecycle evidence; do not replace it with ad hoc shell variables or bypass its guard/sentinel/cleanup failures.

## Blockers

- None.
