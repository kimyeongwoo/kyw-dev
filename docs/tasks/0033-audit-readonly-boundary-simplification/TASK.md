# TASK 0033 — Audit Read-Only Boundary Simplification
<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Reduce the custom shell-classifier maintenance burden by enforcing a smaller explicit read-only command boundary for bare audit, without weakening mutation prevention, diagnostics, or exact `--fix` behavior.

## Dependencies

- Task 0032.

## In Scope

- Inventory the current POSIX/PowerShell classifier branches, false-positive history, supported grammar, and directly exercised command corpus.
- Design a strict read-only command/argument boundary that permits required audit inspection and rejects shell wrappers, redirects, dynamic/encoded launchers, and ambiguous grammar by default.
- Define the threat model and required read-only workload first, then compare the strict boundary and current classifier against the full deterministic fixture corpus before deleting logic.
- Make the existing parser secondary diagnostics or remove only branches proven unnecessary by the strict boundary.
- Preserve stable finding IDs, bounded redacted diagnostics, original offset/context where still relevant, and bare-audit repository byte invariance.
- Keep exact `--fix` mode's separate bounded repair contract unchanged except for shared helper simplification proven safe.

## Out of Scope

- Attempting to parse every shell dialect or hostile script.
- Allowing arbitrary `bash -c`, `sh -c`, `pwsh -Command`, encoded commands, redirects, or sourced scripts in bare audit.
- Weakening fail-closed behavior, mutation detection, or fixture invariants.
- Model cohort tuning or release publication.

## Acceptance Criteria

- [x] AC-01: The required bare-audit inspection workload fits the documented strict read-only boundary on Windows, macOS, and Linux.
- [x] AC-02: Known mutators, redirects, shell wrappers, dynamic/encoded launchers, and malformed grammar fail closed before execution.
- [x] AC-03: Historical harmless quoted/data cases no longer depend on broad whole-shell interpretation to avoid false positives.
- [x] AC-04: Repository, fixture, Git status, auth, and protected-state bytes remain unchanged in bare mode.
- [x] AC-05: Exact `--fix` still requires a visible plan, bounded paths, preservation, and rerun evidence.
- [x] AC-06: Removed classifier branches/tests and retained security checks are enumerated, and the final boundary shows a net reduction in executable grammar/maintenance surface without moving equivalent complexity elsewhere.
- [x] AC-07: If the corpus disproves safe simplification, the Task ends `BLOCKED` without speculative parser changes.

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

- The goal is a smaller accepted command language, not a more complete shell parser.
- Ambiguous commands are skipped with an explicit limitation rather than executed optimistically.
- Security behavior and a net complexity reduction must be proven before any classifier deletion; otherwise the Task ends `BLOCKED`.

## Risks

- The allowlist may be too narrow for useful audits.
- Platform-specific executable resolution may reintroduce complexity.
- Fix mode may accidentally inherit read-only restrictions intended only for bare audit.

## Discoveries and Changes

- Fresh local/remote/GitHub preflight found a clean worktree, Task 0032 merged through PR #19, and exact successful PR-head and post-merge `main` CI for Tasks 0030, 0031, 0032, and 0039.
- Managed exact dispatch selected Task 0033 with action `IMPLEMENT`, authority `STANDARD_LIFECYCLE`, and no ceremonial confirmation after all transitive dependency delivery ledgers were supplied.
- Task 0033 now runs on `task/0033-audit-readonly-boundary-simplification` from exact `origin/main` SHA `8a225aafe0fb17e2d274ed02e7853143b6a91d42`; the pre-transition pair validator and `git diff --check` passed.
- The accepted workload is now one literal executable and a bounded argument shape for repository-relative PowerShell/POSIX reads, `rg`, guarded Git reads, or the packaged Task validator. Shell wrappers, operators, redirects including `2>&1`, variables, substitutions, dynamic/encoded launchers, unsafe paths, and ambiguous forms fail closed.
- Removed the recursive whole-shell command-position parser, nested-shell dialect/source mapping, here-document and arithmetic/substitution traversal, descriptor-duplication exception, and their branch-specific tests. Retained the OS read-only sandbox, file-change events, strict path/argument validation, bounded redacted original-offset diagnostics, tree/Git/auth/protected-state invariants, repair-plan ordering, bounded repair paths, preservation, and rerun gates.
- Historical harmless mutator names, arrows, comparisons, redirects, substitutions, and here-document-looking text are covered as opaque single-quoted `rg` pattern data. Executable `node -e`, here-documents, and output commands remain outside the accepted workload instead of requiring recursive interpretation.
- The initial focused post-change run passed 19/21 and exposed two stale expected offsets; the first documentation-aligned run passed 20/21 and exposed one wording assertion. Both failures remain recorded, and the corrected focused audit suite passed 21/21 plus the instruction bundle passed 25/25.
- The first full `npm test` run passed 241/243 and exposed a fake-Codex fixture still emitting the removed synthetic `read <absolute-path>` command. The fixture now emits the same platform-specific literal repository-relative read as a real audit; its focused evaluator lifecycle passed 10/10.
- Final stable and packed verification passed 243/243 tests, lint, 254-file format validation, 29-file package validation, and real packed-release isolation with SHA-256 `660abd02a7c924739e40e6b84cdaea600e7e21ba4515c4e8d7b4d742d16298d2`.
- Complexity measurement against exact `origin/main` reduced the executable command boundary from 954 lines/25 functions to 619 lines/19 functions; the consolidated audit test file fell from 1,012 to 552 lines without moving a general shell parser elsewhere.
- Final changed-path review found only the audit boundary/runner, packaged audit instructions, deterministic audit/evaluator fixtures and tests, permanent-document owners, and this Task pair. No production dependency, future Task outcome, publication, model/effort change, or unrelated behavior was introduced.

## Documentation Impact

- SPEC: Defines the strict literal bare-audit inspection language and repair-baseline transition.
- ARCHITECTURE: Owns the new development-only boundary module, accepted grammar, fail-closed flow, and retained sandbox/invariance design.
- README: Projects the simpler boundary, rejected forms, opaque pattern data, and unchanged repair behavior.
- AGENTS: Unchanged — repository-wide execution and completion invariants did not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- Revalidated the clean repository, branch and remote refs, Task inventory, dependency graph, PR review state, and exact PR/post-merge Actions identities.
- Read the four permanent documents, this pair, and the directly referenced Task 0032 dependency evidence.
- Exact managed dispatch selected this `READY/READY` pair for implementation without another question.
- Created the Task 0033 branch from exact delivered `origin/main` and entered `IN_PROGRESS/RUNNING`.
- Captured the full pre-change deterministic audit baseline at 27/27 and measured the legacy classifier at 954 lines/25 functions.
- Added `scripts/audit-readonly-boundary.mjs`, removed the recursive shell parser from the smoke runner, and aligned the runner prompt and fake-Codex source-read event with the strict platform-specific command shapes.
- Synchronized the audit Skill/reference, SPEC, Architecture, README, audit scenarios, and deterministic contract tests.
- Consolidated the historical false-positive, wrapper, mutator, redirect, ambiguity, diagnostic, plan-ordering, and byte/Git/protected-state corpus under the strict boundary.
- Preserved two focused failure rounds and the first 241/243 full-suite failure, corrected the stale expectations/fixture, and passed the focused, evaluator, stable, package, and packed-release checks.
- Reviewed every changed path, removed branch, retained security gate, permanent-document owner, acceptance mapping, and introduced error path.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker remains.
