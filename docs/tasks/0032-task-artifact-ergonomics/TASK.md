# TASK 0032 — Task Artifact Ergonomics and Blocking Questions

## Status

READY

## Goal

Reduce routine Task-document and interview overhead without introducing a second Task type, while keeping acceptance traceability and asking a user question only when a real blocking decision remains.

## Dependencies

- Task 0031.

## In Scope

- Allow required Task/Test sections to use concise `Not applicable — <reason>` entries; a bare `None`, empty placeholder, or unexplained omission is not sufficient.
- Add guidance and validation for concise standard Tasks while allowing release/security Tasks to retain longer evidence.
- Keep exactly one question and one recommendation when a blocking user-owned decision is genuinely needed. Exact or automatic selection of a pre-created `READY/READY` Task is already execution confirmation.
- Do not manufacture a question when repository evidence or a safe reversible implementation choice resolves the work.
- Treat appended invocation instructions from Task 0030 as settled constraints unless they conflict with durable truth or leave a real decision.
- Add representative standard, documentation-only, bug-fix, blocked, and release Task fixtures.

## Out of Scope

- Creating `Lite Task`, `Mini Task`, or another artifact type.
- Weakening the intent-to-test matrix or acceptance-specific evidence.
- Changing queue semantics or model configuration.
- Rewriting historical Task documents.

## Acceptance Criteria

- [ ] AC-01: Standard Tasks may use concise reasoned N/A entries while all required sections, status pairs, and acceptance mappings remain valid; bare empty/`None` placeholders are rejected.
- [ ] AC-02: No new Task artifact type or permanent roadmap document is introduced.
- [ ] AC-03: A progress turn with a real blocking decision contains exactly one question and one recommendation.
- [ ] AC-04: A selected pre-created Task with no blocking decision proceeds without a ceremonial question or repeated confirmation.
- [ ] AC-05: Appended user constraints are consumed without being asked back to the user.
- [ ] AC-06: Release/security Tasks can exceed the standard guidance when their evidence justifies it.
- [ ] AC-07: Validators reject empty ambiguity, unsupported PASS, and missing acceptance mappings despite the concise form.

## Plan

- [ ] Revalidate current repository, branch, refs, worktree, Task inventory, PRs, and Actions before mutation.
- [ ] Read the permanent documents, this Task/Test pair, and only the directly referenced implementation/evidence dependencies.
- [ ] Treat the explicit or automatic selection of this `READY/READY` Task as execution confirmation; ask only if a real unresolved user-owned decision remains.
- [ ] Transition this pair to `IN_PROGRESS/RUNNING`, capture an acceptance-specific baseline, and preserve existing failure evidence and user work.
- [ ] Implement the smallest design that satisfies the acceptance criteria.
- [ ] Run focused verification, then the required stable/package/hosted checks implied by the final diff.
- [ ] Review every changed path against scope, tests, permanent-document impact, and evidence honesty.
- [ ] Set an evidence-backed repository outcome in this pair without preclaiming future PR/merge/post-merge facts; complete external delivery through the exact GitHub ledger and stop at the first real blocker.

## Decisions

- Conciseness is guidance plus semantic validation, not a brittle global line limit; N/A requires an explicit reason.
- Questions are for user-owned decisions, not facts discoverable from code/tools or reversible implementation details.
- The existing Task/Test pair remains the only numbered artifact form.

## Risks

- Over-aggressive brevity could remove necessary resume evidence.
- A model may misclassify a decision as reversible and proceed incorrectly.
- Hard size thresholds would encourage evidence compression rather than clarity.

## Discoveries and Changes

- None yet.

## Documentation Impact

- SPEC: Clarify when questions are and are not required and retain one-question progress behavior.
- ARCHITECTURE: No change unless validator responsibilities change.
- README: Add concise Task-authoring guidance only if externally useful.
- AGENTS: Keep a short invariant: ask only real user-owned blockers.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- No implementation or verification has run.

## Remaining

- Repository implementation and verification have not started. External delivery is intentionally not a future fact required inside this artifact.

## Resume Point

When selected by an exact or automatic Task invocation, revalidate current state and dependencies, treat the selection as execution confirmation, transition to `IN_PROGRESS/RUNNING`, and begin at the first unchecked Plan item. Do not repeat completed predecessor work.

## Blockers

- None known at planning time.
