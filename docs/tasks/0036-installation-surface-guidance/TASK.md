# TASK 0036 — Installation Surface Guidance and Duplicate Resolution
<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Make the supported Codex installation/discovery surfaces understandable, recommend the correct plugin or direct-Skill path per surface, and give users a deterministic way to detect and resolve duplicate installations.

## Dependencies

- Task 0035.

## In Scope

- Recheck current official Codex plugin and Skill availability for CLI, desktop Codex, IDE extension, repository, and user scopes.
- Add a concise README compatibility matrix and one recommended path per surface.
- Explain portable explicit invocation and the repository-local Task aliases introduced by Task 0030, including the `$kyw-task NNNN` fallback when a surface does not load managed `AGENTS.md` routing.
- Document duplicate-name behavior and `doctor`-guided resolution without destructive automatic cleanup.
- Exercise current CLI/plugin/direct-Skill installation and discovery paths using packed bytes and isolated state.
- Fix a concrete documentation or doctor defect only when directly proven and within this Task's narrow scope.

## Out of Scope

- Public plugin-directory submission.
- Changing package identity or publication.
- Adding a new installer or discovery service.
- Automatically deleting duplicate or unknown user Skills.

## Acceptance Criteria

- [x] AC-01: The README matrix accurately covers supported CLI, desktop, IDE, repository, and user paths using current official sources.
- [x] AC-02: Each surface has one primary recommendation and a documented fallback where supported.
- [x] AC-03: Duplicate user/project/plugin Skills are detected and reported without deleting unknown content.
- [x] AC-04: Invocation guidance distinguishes portable `$kyw-task` support from repository-local aliases and does not claim implicit alias support on a surface that lacks managed routing.
- [x] AC-05: Packed direct and local-plugin lifecycles expose exactly the expected Skills under isolated state.
- [x] AC-06: No normal Codex, `.agents`, or project user content is modified by verification.
- [x] AC-07: Time-sensitive official facts include access date/source and are not invented when unavailable.

## Plan

- [x] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [x] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [x] Treat the explicit or automatic selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [x] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [x] Implement the smallest design that satisfies the acceptance criteria.
- [x] Run focused verification, then locally reproducible stable/package checks; leave mutable hosted delivery results to the external ledger.
- [x] Review every changed path against scope, tests, permanent-document impact, and evidence honesty.
- [x] Set an evidence-backed repository outcome in this pair and stop at the first real blocker.

## Decisions

- Documentation is the default fix; runtime changes require a reproduced defect.
- Duplicate resolution is user-directed and ownership-safe.
- Publication and public directory submission remain separate.
- The reproduced plugin-cache omission requires a bounded `doctor` fix: inspect only the documented cache shape, report installed Skill sources and cross-source duplicate names, and never infer enabled state or mutate plugin content.

## Risks

- Official surface support can change after the Task.
- Implicit/natural invocation behavior may differ across Codex surfaces.
- A compatibility table can become stale unless it names its verification date.
- Plugin cache presence does not prove enablement; diagnostics must call it an installed-byte source rather than an active-session source.

## Discoveries and Changes

- The clean pre-change repository was on delivered Task 0035 commit `efa881a2eb6f2df3bb72bf775238a6949dc8b3f2`; fresh remote and GitHub evidence binds PR #22 and successful PR/`main` CI to merge commit `6ab36ac9675b13b568c7a9a6646e578f465a7ad0`.
- Fresh exact-SHA ledgers also reconfirmed required delivery for Tasks 0030 through 0034 and Task 0039. Managed exact dispatch selected Task 0036 with action `IMPLEMENT`, `STANDARD_LIFECYCLE` authority, and no ceremonial confirmation.
- Task 0036 now runs on `task/0036-installation-surface-guidance` from exact delivered `origin/main` SHA `6ab36ac9675b13b568c7a9a6646e578f465a7ad0`.
- The existing README already explains direct user/project installation, local plugin verification, explicit Skill invocation, managed Task aliases, and a duplicate warning, but it has no surface-by-surface compatibility matrix or dated official-source basis.
- The official Codex manual fetched on 2026-07-24 confirms that Skills are supported in the ChatGPT desktop app, Codex CLI, and IDE extension; plugins are supported in the desktop app and CLI but not the IDE; repository/user Skill locations are `.agents/skills`; duplicate names are not merged; project `AGENTS.md` guidance is loaded once per run/session.
- A controlled temporary-home baseline installed the same four Skills at direct user and documented plugin-cache sources. Current `doctor` returned no finding, proving the AC-03 plugin omission while preserving all fixture bytes.
- `doctor` now resolves configured/default Codex home, traverses only real directories in the documented plugin-cache shape, reports each `kyw-*` source without claiming enablement, detects duplicate names across user/project/plugin sources, and fails closed on an unsafe cache component.
- Focused documentation/runtime coverage passed 43/43; the corrected temporary-home reproduction reports `DUPLICATE_INSTALLATION` with exit 4 and preserves every fixture byte.
- The real-tarball isolated distribution test passed direct user/project and current Codex local-marketplace lifecycles, including exact four-Skill discovery and protected normal-state preservation.
- Coverage review added plugin-only healthy reporting, malformed cached-Skill handling, and actual CLI `CODEX_HOME` propagation. The first expanded run passed 44/45 but its whole-home snapshot included temporary command shims created by the test host; narrowing the assertion to the product-owned direct/plugin/repository roots preserved the intended non-mutation contract, and the unchanged product implementation passed 45/45.
- Terminal `npm run check` passed 255/255 tests, lint over 59 JavaScript modules and foundation metadata, format over 256 UTF-8/LF files, and the exact 29-file/82,308-byte package selection.
- Final nine-path review mapped every surface assertion, cache state/error branch, duplicate source, invocation boundary, package effect, and durable-document change to the Test matrix. No dependency, unrelated Task, publication action, normal profile mutation, or out-of-scope path was introduced.
- PR #23 exact-head run `30061987281` passed the packed gate plus Ubuntu and Windows Stable lanes but failed both macOS lanes in the three new plugin-cache tests. macOS resolves its `/var` temporary-root prefix through `/private/var`; the scanner incorrectly treated that ancestor alias as if the selected Codex-home leaf or a cache component were a link and returned recovery-required exit 7.
- The correction now proves the selected Codex-home leaf is a stable real directory, scans from its physical root, and maps reported source paths back to the configured spelling. A native symlink/junction ancestor is accepted while a linked Codex-home leaf remains untraversed and recovery-required.
- Corrected focused installation coverage passed 42/42, and terminal `npm run check` passed 257/257 tests, lint, format, and the exact 29-file/82,480-byte package selection.

## Documentation Impact

- SPEC: Updated supported Skill/plugin surfaces and required plugin-cache duplicate reporting.
- ARCHITECTURE: Updated doctor discovery boundaries, physical-root/ancestor-alias semantics, cache semantics, and ownership-safe duplicate handling.
- README: Added the dated compatibility matrix, invocation boundaries, and safe duplicate-resolution guidance.
- AGENTS: Unchanged — its existing managed alias and change-discipline invariants remain correct.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- Revalidated the clean worktree, local/remote refs, Task inventory, dependency pair, merged PR identities, review state, and exact PR/post-merge Actions results.
- Read the Task Skill and execution reference, four permanent documents, this pair, and the explicit Task 0035 dependency.
- Validated the Task 0035 and Task 0036 pairs and obtained a deterministic `SELECTED/IMPLEMENT` dispatch result.
- Created the Task 0036 branch from exact delivered `origin/main` and entered `IN_PROGRESS/RUNNING`.
- Fetched the current Codex manual and recorded dated official sources for Skills, plugins, repository/user discovery, and `AGENTS.md` behavior.
- Added the README compatibility matrix, portable/managed invocation distinction, and ownership-safe duplicate resolution; synchronized SPEC and Architecture and confirmed AGENTS remains unaffected.
- Reproduced and fixed plugin-cache omission in `doctor`, including configured Codex-home resolution, safe cache-source reporting, cross-source duplicate detection, and read-only failure behavior.
- Added focused installation and instruction-surface coverage; passed corrected duplicate reproduction, 43 focused documentation/runtime tests, 30 Task alias/dispatch tests, lint, format, and the two-test real-tarball distribution lifecycle.
- Added final plugin-only, malformed-cache, and CLI environment branches; preserved the one host-snapshot assertion failure and passed the corrected 45-test focused retry.
- Passed the terminal 255-test Stable suite, lint, format, exact package selection, Task validator, whitespace check, and complete nine-path scope/coverage review.
- Committed and pushed the exact nine-path outcome as `cffee2fc83a4c60cb83beaa9e5b754afb42932c6`, opened non-draft PR #23, and preserved the exact-head macOS failure as correction evidence.
- Corrected the macOS ancestor-alias defect without weakening linked-leaf/cache rejection, added native acceptance and rejection fixtures, passed 42 focused installation tests and the 257-test Stable gate, and resynchronized Architecture.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no repository blocker remains.
