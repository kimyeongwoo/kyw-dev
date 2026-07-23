# TASK 0036 — Installation Surface Guidance and Duplicate Resolution
<!-- kyw-task-contract: 2 -->

## Status

READY

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

- [ ] AC-01: The README matrix accurately covers supported CLI, desktop, IDE, repository, and user paths using current official sources.
- [ ] AC-02: Each surface has one primary recommendation and a documented fallback where supported.
- [ ] AC-03: Duplicate user/project/plugin Skills are detected and reported without deleting unknown content.
- [ ] AC-04: Invocation guidance distinguishes portable `$kyw-task` support from repository-local aliases and does not claim implicit alias support on a surface that lacks managed routing.
- [ ] AC-05: Packed direct and local-plugin lifecycles expose exactly the expected Skills under isolated state.
- [ ] AC-06: No normal Codex, `.agents`, or project user content is modified by verification.
- [ ] AC-07: Time-sensitive official facts include access date/source and are not invented when unavailable.

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

- Documentation is the default fix; runtime changes require a reproduced defect.
- Duplicate resolution is user-directed and ownership-safe.
- Publication and public directory submission remain separate.

## Risks

- Official surface support can change after the Task.
- Implicit/natural invocation behavior may differ across Codex surfaces.
- A compatibility table can become stale unless it names its verification date.

## Discoveries and Changes

- None yet.

## Documentation Impact

- SPEC: Update supported invocation/discovery behavior only if needed.
- ARCHITECTURE: Update surface/discovery boundaries and duplicate handling.
- README: Primary output: compatibility matrix and safe resolution guidance.
- AGENTS: Unchanged unless alias invariants need a pointer.

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
