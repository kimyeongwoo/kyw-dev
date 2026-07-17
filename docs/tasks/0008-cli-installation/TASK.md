# TASK 0008 — CLI Installation

## Status

DONE

## Goal

Implement safe user/project Skill installation, update, uninstall, and diagnostics through the npm CLI.

## Dependencies

- `0001-plugin-foundation`
- `0002-template-contracts`
- `0003-kyw-grilling-skill`
- `0004-kyw-init-skill`
- `0005-kyw-task-authoring`
- `0006-kyw-task-execution`
- `0007-kyw-audit-skill`

## In Scope

- Implement install for user and project scopes.
- Resolve home and Git repository paths cross-platform.
- Copy complete managed Skill directories without creating project documents.
- Write ownership/version/hash metadata.
- Implement conflict-aware atomic update and recovery.
- Implement ownership-safe uninstall.
- Implement doctor diagnostics for runtime, metadata, duplicates, malformed Skills, and partial installs.
- Add help text and exit-code behavior.
- Test isolated temporary homes and repositories.

## Out of Scope

- Installing plugins through the ChatGPT desktop UI.
- Editing user Codex configuration beyond managed Skill files.
- Automatic removal of duplicate installations.

## Acceptance Criteria

- [x] AC-01: User install places discoverable Skills under an isolated `~/.agents/skills`.
- [x] AC-02: Project install places discoverable Skills under the fixture repo `.agents/skills`.
- [x] AC-03: Install refuses destructive overwrite of unmanaged or locally modified files.
- [x] AC-04: Update replaces unchanged managed files and reports conflicts for modified files.
- [x] AC-05: Uninstall removes only owned files and preserves unrelated Skills.
- [x] AC-06: Doctor reports duplicate user/project installs and malformed/partial state.
- [x] AC-07: Interrupted staging leaves a recoverable state without corrupting the prior install.
- [x] AC-08: Windows-style and POSIX path tests pass.
- [x] AC-09: Ownership metadata records the schema, package version, scope, managed Skill paths, and SHA-256 hashes, and a directly installed `kyw-task` adapter remains runnable with managed runtime support.
- [x] AC-10: Help/version remain read-only, command grammar is deterministic, and usage, runtime, scope, conflict, invalid-state, filesystem, and recovery failures use documented exit codes.

## Plan

- [x] Finalize CLI command and exit-code contracts.
- [x] Implement scope/root resolution and managed-file inventory.
- [x] Implement atomic install/update with conflict detection.
- [x] Implement safe uninstall and doctor.
- [x] Add integration tests in isolated environments.
- [x] Run package, CLI, and documentation checks.

## Decisions

- Follow `docs/SPEC.md` and `docs/ARCHITECTURE.md`; record any necessary deviation before implementing it.
- Keep production and development dependencies at zero; Node.js built-ins are sufficient for hashing, path resolution, staging, recovery, command detection, and tests.
- Accept only `install|update|uninstall --scope <user|project>`, with `--force` limited to uninstall, plus argument-free `doctor`, help, and version. Preserve exit 0 for success, exit 1 for usage, then use 2 runtime, 3 scope, 4 safety conflict, 5 malformed state/package, 6 filesystem/permission, and 7 recovery-required.
- Store direct-install ownership at `<scope>/.agents/skills/.kyw-dev-install.json`. Record schema 1, package name/version, scope, timestamps, the four Skill paths, and a sorted SHA-256 inventory of every managed file.
- Install the four complete Skill directories plus namespaced support under `.agents/skills/.kyw-dev/runtime/`. The support contains only the Task artifact core modules and canonical templates needed by the directly installed `kyw-task` adapter; the package-root sources remain canonical and installation hashes the copied bytes.
- Keep install/update/uninstall recoverable with reserved staging, backup, journal, commit-started, and commit-complete artifacts under the selected Skills root. Metadata is committed last; an incomplete commit rolls back, while a commit-complete marker finishes cleanup.
- Refuse install/update over unmanaged, missing, modified, unknown, symlinked, or malformed managed state. Uninstall also refuses such state by default; explicit `--force` may remove modified files listed in ownership metadata while preserving unknown files and unrelated Skill directories.
- Resolve project scope by walking from the current directory to a real `.git` directory or file. Do not shell out to Git, change the caller's working directory, create project documents, or edit Codex configuration.

## Risks

- Symlinks and permissions can make destructive operations unsafe.
- Project-root detection may fail outside Git repositories.
- A user may install the plugin and direct Skills simultaneously; doctor must explain rather than guess which to remove.

## Discoveries and Changes

- The supplied workspace and its visible ancestors contain no `.git` metadata. `git status` and Git-native staged/unstaged diff inspection exit 128, so a verified 95-file pre-change snapshot was created at `C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0008-before-1784214662853` for no-index and independent hash/file-set review.
- The pre-change snapshot matches all 95 workspace files byte-for-byte, and `git diff --no-index --quiet` reports no content difference.
- Pre-change `npm run check` passed: 52/52 tests, lint over 18 JavaScript modules plus foundation metadata, 87 UTF-8/LF text files, and the exact 28-file package at 32,034 bytes.
- The existing CLI implements only help/version/unknown-argument handling. No install ownership, scope resolution, mutation transaction, recovery, uninstall, or doctor module exists.
- `skills/kyw-task/scripts/task-artifacts.mjs` imports `../../../src/core/task-artifacts.mjs`, which works in the npm/plugin tree but resolves outside a directly copied Skill. Direct installation therefore needs namespaced managed runtime support and an adapter fallback; copying only the visible Skill directories would violate AC-01/AC-02 despite successful discovery.
- The current package already contains the exact canonical core modules and six templates required by that fallback, so Task 0008 can remain dependency-free and avoid source duplication in the repository.
- The user's instruction to continue only Task 0008 supplies authorization to move the prepared Task/Test pair into implementation. It does not authorize Task 0009 publication or marketplace work.
- The first focused installation run passed 19/20 selected checks. The only failure compared the locale-aware inventory order with JavaScript's default Unicode sort; the test now uses the production comparator, and the corrected focused run passed 20/20.
- A later full run after permanent-document synchronization passed 66/67 checks. The only failure was an existing README status assertion fixed to “Tasks 0001 through 0007”; advancing it to the intentional Task 0008 status restored the full pass without changing prior workflow behavior.
- Direct-install inventory contains 19 files: 11 complete Skill files plus two core modules and six canonical templates in the hidden runtime namespace. Both installed metadata and post-copy verification use the source bytes' SHA-256 values.
- Separate child processes interrupted update after staging and after the first target swap. Doctor reported both partial transactions without mutation; recovery discarded the untouched stage in the first case and restored every prior file/metadata hash in the second before a clean retry reached 0.2.0.
- A real Windows junction at a managed Skill path was rejected without following it or changing the target marker.
- Preliminary synchronized stable checks pass with 67/67 tests, 20 JavaScript modules plus foundation metadata, 89 UTF-8/LF text files, and the exact 29-file package at 45,819 bytes.
- Final review found a POSIX concurrency risk in journal publication: rename may replace an existing destination. The journal now uses exclusive `wx` creation, records its owning PID, refuses recovery while another owner is alive, and retains dead-owner recovery. The live-owner and child-crash tests both pass.
- The first external actual-tarball smoke command was rejected before execution because its PowerShell cleanup used a recursive removal disallowed by the execution policy. No file changed. The smoke was moved into the test harness's verified Temp boundary and now packs, extracts, installs, diagnoses, runs the installed adapter, uninstalls, and cleans up automatically.
- Node.js 22 exposed a deprecation warning when Windows tool detection used `shell: true` with arguments. Tool detection now invokes the fixed `<tool> --version` command through `ComSpec` without the deprecated option; isolated doctor and packed-doctor tests require empty stderr.
- Final pre-terminal checks passed: focused 25/25, stable 70/70, Node.js 22 70/70, actual 29-entry tarball smoke, official Skill validation, Task validation, and coverage at 83.60% lines / 69.53% branches / 100% functions for the installation core.
- The final pre-terminal snapshot audit passed with 95 before files and 97 after files: 10 expected modifications, 2 expected additions, 0 deletions, 85 byte-identical existing files, no unexpected path, no root tarball, and no whitespace diagnostic.
- Post-terminal pure `node --test --experimental-test-coverage` exposed a Windows-only test-runner defect hidden by `npm run` and `npx`: the actual-tarball fixture passed one quoted command string through `cmd /s /c`, so npm received literal quote characters in its destination path. The fallback now passes the npm command and destination as separate `cmd /c` arguments; production CLI behavior was unaffected.
- After that correction, the direct tarball case passed 1/1 and direct coverage passed 70/70. The stable check, Node.js 22 suite, standalone 29-entry dry pack, official Skill validator, and Task validator all passed again.
- The post-fix snapshot audit again found only the expected Task 0008 scope: 10 modifications, 2 additions, 0 deletions, 85 byte-identical prior files, no root tarball, and no whitespace diagnostic.

## Documentation Impact

- SPEC: Update with the finalized CLI grammar, force boundary, metadata/support behavior, and stable exit codes.
- ARCHITECTURE: Update with the installation module boundary, namespaced direct-install runtime, ownership schema, transaction/recovery flow, and doctor inspection flow.
- README: Replace planned installation text with verified commands, scope behavior, update/uninstall safety, doctor output, recovery guidance, and exit codes.
- AGENTS: Unchanged unless implementation changes repository-wide commands or completion rules; the existing four stable checks remain authoritative.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the permanent documents, current Task/Test contract, Task 0002 contract/evidence, and all explicitly listed Tasks 0001 through 0007 dependencies.
- Inspected the current CLI, package metadata and allowlist, all managed Skill paths, the `kyw-task` adapter and core/template dependency chain, foundation validation, CLI tests, and stable verification scripts.
- Confirmed missing Git metadata, created and hash-verified the 95-file pre-change snapshot, reviewed its empty no-index diff, and passed the pre-change stable check.
- Finalized the dependency-free command grammar, exit categories, scope paths, metadata model, direct-install runtime support, conflict rules, force boundary, transaction recovery, and doctor responsibilities.
- Implemented the deterministic installation/diagnostic core, CLI grammar and output, managed runtime adapter fallback, exact package allowlist update, and user/project transaction flow.
- Added actual binary, core integration, path-dialect, conflict, force-uninstall, duplicate/malformed/permission/version-drift doctor, symlink, child-process interruption/recovery, metadata/hash, and installed-adapter coverage.
- Synchronized SPEC, Architecture, and README with the finalized behavior and confirmed AGENTS and the four stable repository commands remain unchanged.
- Passed the final focused suite, all four stable checks, Node.js 22 suite, built-in coverage, direct npm dry-run, actual packed-package lifecycle smoke, official `kyw-task` validation, and current Task contract validation.
- Reviewed the full no-index diff, every changed path, package contents, whitespace, and independent file/hash inventory against all acceptance and matrix rows.
- Corrected and reproduced the Windows no-`npm_execpath` tarball-test branch, then repeated the complete terminal verification and snapshot scope audit.

## Remaining

- None.

## Resume Point

Task 0008 is complete. Begin public publication or marketplace work only from Task 0009; do not extend release behavior under this Task.

## Blockers

- None known.
