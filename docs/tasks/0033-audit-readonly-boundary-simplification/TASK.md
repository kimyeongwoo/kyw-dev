# TASK 0033 — Audit Read-Only Boundary Simplification
<!-- kyw-task-contract: 2 -->

## Status

READY

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

- [ ] AC-01: The required bare-audit inspection workload fits the documented strict read-only boundary on Windows, macOS, and Linux.
- [ ] AC-02: Known mutators, redirects, shell wrappers, dynamic/encoded launchers, and malformed grammar fail closed before execution.
- [ ] AC-03: Historical harmless quoted/data cases no longer depend on broad whole-shell interpretation to avoid false positives.
- [ ] AC-04: Repository, fixture, Git status, auth, and protected-state bytes remain unchanged in bare mode.
- [ ] AC-05: Exact `--fix` still requires a visible plan, bounded paths, preservation, and rerun evidence.
- [ ] AC-06: Removed classifier branches/tests and retained security checks are enumerated, and the final boundary shows a net reduction in executable grammar/maintenance surface without moving equivalent complexity elsewhere.
- [ ] AC-07: If the corpus disproves safe simplification, the Task ends `BLOCKED` without speculative parser changes.

## Plan

- [ ] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [ ] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [ ] Treat the explicit or automatic selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [ ] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [ ] Implement the smallest design that satisfies the acceptance criteria.
- [ ] Run focused verification, then locally reproducible stable/package checks; leave mutable hosted delivery results to the external ledger.
- [ ] Review every changed path against scope, tests, permanent-document impact, and evidence honesty.
- [ ] Set an evidence-backed repository outcome in this pair and stop at the first real blocker.

## Decisions

- The goal is a smaller accepted command language, not a more complete shell parser.
- Ambiguous commands are skipped with an explicit limitation rather than executed optimistically.
- Security behavior and a net complexity reduction must be proven before any classifier deletion; otherwise the Task ends `BLOCKED`.

## Risks

- The allowlist may be too narrow for useful audits.
- Platform-specific executable resolution may reintroduce complexity.
- Fix mode may accidentally inherit read-only restrictions intended only for bare audit.

## Discoveries and Changes

- None yet.

## Documentation Impact

- SPEC: Update only the user-visible bare/fix command boundary if semantics change.
- ARCHITECTURE: Document strict command boundary and fail-closed handling.
- README: Simplify audit behavior explanation and supported limits.
- AGENTS: Unchanged unless invariant behavior changes.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- No implementation or verification has run.

## Remaining

- Repository implementation and verification have not started.

## Resume Point

When selected by an exact or automatic Task invocation, revalidate current state and dependencies, treat the selection as execution confirmation, transition to `IN_PROGRESS/RUNNING`, and begin at the first unchecked Plan item. Do not repeat completed predecessor work.

## Blockers

- None known at planning time.
