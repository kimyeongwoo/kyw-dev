# TASK 0013 — Filesystem Security Hardening

## Status

IN_PROGRESS

## Goal

Harden direct Skill installation, update, doctor, transaction recovery, and uninstall against path traversal, symlink/junction escape, unsafe file types, ownership races, and broad deletion while preserving the existing ownership-safe contract.

## Dependencies

- `0010-continuous-integration`

## In Scope

- Threat-model every filesystem path derived from CLI arguments, Git roots, home directories, package metadata, install metadata, transaction journals, and managed file manifests.
- Normalize and confine all managed relative paths beneath the resolved user/project Skill root.
- Reject absolute paths, traversal, mixed-separator escapes, ambiguous/colliding managed paths, and unsupported file types.
- Detect and refuse symlinks, Windows junctions/reparse-style directory links where detectable, or any managed path component that can redirect mutations outside the trusted root.
- Revalidate file type, containment, ownership metadata, and content hash immediately before destructive replacement or deletion.
- Keep transaction temp/staging paths inside the validated managed root and make interrupted recovery bounded and inspectable.
- Preserve unknown files and unrelated Skills in normal and `--force` operations.
- Add cross-platform security regression tests, including capability-aware Windows link tests.
- Keep `doctor` strictly read-only and keep documented exit-code categories stable unless a durable contract change is explicitly made.

## Out of Scope

- Signing npm packages or implementing registry provenance.
- Sandboxing the Node.js process at the operating-system level.
- Protecting against a fully privileged local attacker who can continuously replace directories during execution beyond reasonable atomic checks.
- Deleting unmanaged duplicates automatically.
- Adding a native dependency solely for filesystem inspection.

## Acceptance Criteria

- [ ] AC-01: Every metadata-derived or argument-derived managed path is normalized, relative, non-empty where required, and proven confined beneath the intended root before use.
- [ ] AC-02: Absolute, traversal, mixed-separator escape, duplicate/case-colliding, and malformed managed paths fail closed with stable non-zero errors.
- [ ] AC-03: Install, update, recovery, and uninstall refuse symlink/junction or unsupported-file-type components that could redirect reads or writes outside the managed root.
- [ ] AC-04: Destructive operations revalidate the target and ownership/hash state immediately before mutation and never recursively remove the broad `.agents/skills` root.
- [ ] AC-05: `--force` may remove modified owned files only; it still preserves unknown files, unrelated Skills, and unsafe link targets.
- [ ] AC-06: Transaction staging, commit, rollback, and recovery cannot escape the trusted root and leave a diagnosable state after injected interruption.
- [ ] AC-07: Linux, macOS, and Windows CI execute the applicable path/link/security tests; capability-based skips are explicit and do not hide portable logic.
- [ ] AC-08: `doctor` detects unsafe path/link/transaction state without changing any file.
- [ ] AC-09: Existing successful install/update/uninstall behavior and documented exit-code categories remain compatible, or all affected durable documents are intentionally updated.

## Plan

- [x] Map all filesystem trust boundaries and mutation call sites in `src/core/skill-installation.mjs` and related CLI code.
- [x] Add or refine centralized path-confinement, file-type, link, and ownership revalidation helpers.
- [x] Make staging/recovery paths bounded and inject failures at each transaction phase in tests.
- [x] Add malicious metadata, traversal, symlink, junction, collision, race-window, and unknown-file fixtures.
- [ ] Run focused security tests on every available local platform and rely on Task 0010 CI for the full matrix.
- [x] Re-run normal lifecycle and package E2E tests to prevent safety changes from breaking valid installations.
- [x] Review error messages for actionable paths without leaking unrelated user data.
- [x] Synchronize affected Spec, Architecture, README, and Task/Test evidence.

## Decisions

- Fail closed when path ownership, file type, or containment cannot be proven.
- Never follow a managed symlink/junction for mutation, even when the resolved target appears to remain under the root; this keeps the rule understandable and avoids race-prone exceptions.
- `--force` is not permission to delete unknown files or traverse unsafe links.
- Prefer standard-library primitives and narrow helper refactors over a new production dependency.
- Tests may use injected filesystem operations or phase hooks to make race/interruption cases deterministic, but production behavior must remain simple.

## Risks

- Windows junction and symlink creation can require environment capabilities; tests must distinguish unavailable fixture creation from a product pass.
- Case sensitivity differs by filesystem, not only operating system.
- Overly strict link handling may reject legitimate user layouts; public behavior changes require documentation.
- Complete TOCTOU elimination is not portable in user-space Node.js; document residual limitations honestly.

## Discoveries and Changes

- Pre-change inspection on 2026-07-18 found existing user-authored work for Tasks 0011 through 0016 and related evaluation/documentation changes. Task 0013 will preserve that work and limit edits to its installation implementation, security tests, current Task/Test pair, and durable documents whose filesystem-safety meaning changes.
- The CLI and binary dispatch contain no direct filesystem calls. Importing `src/cli/run.mjs` reads root `package.json` once through `src/core/package-info.mjs`; every lifecycle/doctor filesystem operation after dispatch is owned by `src/core/skill-installation.mjs`.
- Pre-change read/status call-site inventory: `pathState` centralizes `lstatSync`; `hashFile` centralizes byte reads; `readJson` reads package/plugin/install JSON; Skill validation reads `SKILL.md` and `agents/openai.yaml`; source inventory uses `realpathSync`, `readdirSync`, and `lstatSync`; scope discovery realpaths the starting directory and lstats `.git`; managed inspection reads directories and file hashes; recovery reads its journal; doctor additionally enumerates Skill/reserved names and calls the injected read/write-access probe.
- Pre-change create/write call-site inventory: scope setup creates only `.agents` and `skills`; managed-parent setup creates normalized ancestors; a transaction creates sibling stage/backup roots, exclusively writes the journal, copies and chmods source files into stage, exclusively writes staged metadata plus commit-started/commit-complete markers, and never writes from doctor.
- Pre-change rename call-site inventory: commit moves each old managed file to its reserved backup, each staged file to its managed target, old metadata to backup, and staged metadata to the live path; rollback moves hash-validated backup files and metadata back to their live paths.
- Pre-change delete call-site inventory: hash-checked recovery uses `unlinkSync`; empty known managed directories use `rmdirSync`; journal/marker cleanup uses `unlinkSync`; the sole recursive `rmSync` is reserved for validated transaction stage/backup directories. There is no call that recursively removes `.agents/skills`.
- Initial threat review found gaps to test before implementation: host-independent Windows absolute paths and case/prefix collisions are not all rejected; several reads and mutations validate only the leaf rather than every managed component; source files can change type after inventory; cleanup marker unlinks do not consistently revalidate type/content; doctor does not explicitly report an unsafe Skills-root chain; and existing link skips do not prove hosted platform coverage.
- Managed-path parsing now rejects POSIX/Windows absolute and drive-relative forms, traversal, backslash/mixed separators, Windows-reserved or malformed segments, and exact/case/Unicode-normalization/file-prefix collisions independently of the host filesystem. Package, install-metadata, and transaction manifests use the same portable identity rule.
- User/project scope roots are physically resolved and leaf links are rejected. `.agents`, `skills`, source, managed, stage, backup, and metadata parents are checked as real canonical directories; regular-file reads compare identity before/after and every destructive rename/unlink/rmdir/rm revalidates type, containment, and hash immediately before mutation.
- Transaction journals now bind UUID stage/backup names, force policy, actual current hashes, installed ownership hashes when different, and old/new metadata hashes. Recovery proves metadata ownership before rollback/cleanup, validates every present reserved entry, preserves unknown/link/special transaction content, and recursively removes only the two journal-named directories. The broad Skills root is never an `rmSync` target.
- Force uninstall continues to tolerate missing/modified owned state and unknown entries for compatibility, but its removal list contains only existing metadata-owned regular files. Known-path links/special types fail closed; unknown files, directories, links, unrelated Skills, and their targets remain untouched.
- `doctor` now reports unsafe scope chains, portable case collisions, links/types, malformed ownership, and transaction artifacts while retaining a code path with no filesystem mutation. Healthy and hostile tests compare bytes plus type/mode/size/mtime/ctime snapshots.
- Standard Node path APIs cannot eliminate a final same-user component-swap race without portable directory-handle-relative operations. The residual continuously privileged-attacker limitation remains out of scope and is documented in Architecture; immediate before/after checks, same-root atomic renames, exclusive markers, and fail-closed recovery narrow it.

## Documentation Impact

- SPEC: Updated public path/link/type refusal behavior, force semantics, transaction cleanup boundary, doctor read-only contract, and required native link evidence.
- ARCHITECTURE: Updated physical trust roots, portable identity and component invariants, transaction ownership/revalidation flow, recursive cleanup boundary, and residual TOCTOU assumption.
- README: Updated direct-install safety/refusal behavior, force/unknown preservation, recovery, and troubleshooting guidance.
- AGENTS: Unchanged because repository-wide Codex behavior and the four stable verification commands did not change.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the four permanent documents, Task 0013 pair, and explicit Task 0010 dependency/evidence.
- Captured pre-change Git status, unstaged diff, and staged diff before any Task 0013 edit.
- Recorded every direct read/status, create/write/copy, rename, narrow-delete, and recursive-delete call site reachable from install, update, uninstall, recovery, and doctor.
- Implemented centralized portable path identity, canonical component/type checks, before/after file reads, mutation-time ownership/hash revalidation, bounded transaction ownership proof, and read-only unsafe-state diagnosis without a new dependency.
- Added cross-platform path/metadata/journal tables, native link/junction fixtures that fail rather than skip when unavailable, Windows unsupported-role and POSIX FIFO fixtures, source/target race injection, force/unknown/link preservation, doctor metadata snapshots, all seven transaction phase interruptions, and unknown-backup preservation.
- Passed the focused 35-case security/lifecycle file and the full 111-test Windows suite with zero skips; seven native Windows junction creations were proven by test diagnostics.
- Passed `npm run check`: 111/111 tests, lint over 29 modules, format over 140 files, and the exact 29-file package check.
- Synchronized Spec, Architecture, and README; kept AGENTS unchanged after impact review.

## Remaining

- Obtain and inspect actual Linux/macOS/Windows Task 0010 hosted CI logs, including native link/junction/FIFO fixture diagnostics and zero hidden security-test skips.
- Run the remaining packed release gate, complete final call-site/diff coverage review, record terminal evidence, and set Task/Test terminal status only if every hosted lane passes.

## Resume Point

Commit only Task 0013 implementation/test evidence, trigger the Task 0010 matrix from a draft Task 0013 PR, and inspect each platform log before claiming AC-07.

## Blockers

- Hosted Linux/macOS native link and FIFO evidence is pending. Any fixture-creation failure is a blocker, not a passing skip.
