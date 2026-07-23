# TASK 0032 — Task Artifact Ergonomics and Blocking Questions
<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Reduce routine Task-document and interview overhead without introducing a second Task type, while keeping acceptance traceability and asking a user question only when a real blocking decision remains.

## Dependencies

- Task 0031.
- Task 0039.

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

- [x] AC-01: Standard Tasks may use concise reasoned N/A entries while all required sections, status pairs, and acceptance mappings remain valid; bare empty/`None` placeholders are rejected.
- [x] AC-02: No new Task artifact type or permanent roadmap document is introduced.
- [x] AC-03: A progress turn with a real blocking decision contains exactly one question and one recommendation.
- [x] AC-04: A selected pre-created Task with no blocking decision proceeds without a ceremonial question or repeated confirmation.
- [x] AC-05: Appended user constraints are consumed without being asked back to the user.
- [x] AC-06: Release/security Tasks can exceed the standard guidance when their evidence justifies it.
- [x] AC-07: Validators reject empty ambiguity, unsupported PASS, and missing acceptance mappings despite the concise form.

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

- Conciseness is guidance plus semantic validation, not a brittle global line limit; N/A requires an explicit reason.
- Questions are for user-owned decisions, not facts discoverable from code/tools or reversible implementation details.
- The existing Task/Test pair remains the only numbered artifact form.
- Operational content checks apply to selectable/active current pairs. Empty required content and missing AC/matrix graph nodes always fail; strict bare-None/N/A-shape checks activate when a pair adopts the updated template's reasoned `Not applicable — <reason>` form.
- Pre-rule contract-v2 artifacts without reasoned N/A remain byte-preserving and readable rather than being rewritten or silently reclassified.

## Risks

- Over-aggressive brevity could remove necessary resume evidence.
- A model may misclassify a decision as reversible and proceed incorrectly.
- Hard size thresholds would encourage evidence compression rather than clarity.

## Discoveries and Changes

- Fresh local/remote/GitHub preflight found a clean worktree, `origin/main` and direct remote `main` at Task 0039 merge SHA `04002f1ac9995667b3052a44a7e6f41d45602fbb`, and no pre-existing Task 0032 branch.
- Exact PR and Actions evidence satisfied the `STANDARD` ledgers for Task 0030 (PR #16), Task 0031 (PR #17), and Task 0039 (PR #18). With those separately supplied ledgers, managed exact dispatch selected Task 0032 with action `IMPLEMENT`, authority `STANDARD_LIFECYCLE`, and no ceremonial confirmation.
- Task 0032 now runs on `task/0032-task-artifact-ergonomics` from exact `origin/main` SHA `04002f1ac9995667b3052a44a7e6f41d45602fbb`; the canonical pair validator and `git diff --check` passed before the lifecycle transition.
- The prior validator required section headings but allowed comment-only content, zero ACs/rows before terminal status, and bare `None`; canonical DRAFT scaffolds also needed an explicit compatibility boundary so authoring and cancellation could remain incomplete without invented content.
- Implemented lifecycle-aware section-content validation, strict reasoned-N/A adoption, selectable/active AC and matrix minimums, and canonical reasoned-N/A defaults without a new Task type or global size cap.
- Added valid standard, documentation-only, bug-fix, blocked, and longer release Task/Test fixtures plus deterministic real-blocker, no-blocker, and appended-constraint question scenarios.
- The first focused run passed 39/42. It exposed three regressions: the representative instruction bundle grew to 38,172 bytes over its 36,382-byte bound, the question test assigned settled-constraint wording to both Skill and execution owner, and strict bare-None validation retroactively rejected Task 0031's completed evidence.
- Consolidating duplicated Skill/reference prose reduced the representative bundle to 35,862 bytes. Settled-constraint ownership now remains in the execution reference, and the reasoned-N/A adoption boundary preserves older contract-v2 bytes. The focused instruction, Task, dispatch, and template suite then passed 42/42, including all current queued artifacts without rewriting them.
- Final diff review found that strict adoption rejected a section containing only bare `None` but could miss bare `None` mixed with substantive lines. The validator now rejects either shape, the focused suite remains 42/42, and README explicitly projects the pre-rule contract-v2 compatibility exception.
- Final verification passed 249/249 tests, lint, UTF-8/LF format, package allowlist, and real packed-release isolation. The final archive contains 29 files and 78,307 bytes with SHA-256 `82ab13261eeb7fd6cc3a1a683b7dfa30df034e98a203f03eaeb6968708be733e`.
- Changed-path review found only the validator, templates, Task workflow instructions, permanent-document projections, Task 0032 evidence, and acceptance fixtures/tests authorized by this Task. No second Task type, future Task implementation, publication, model/effort mutation, or unrelated change was introduced.

## Documentation Impact

- SPEC: Defines one-question blocking behavior, settled appended constraints, reasoned N/A, traceability minimums, compatibility, and evidence-length guidance.
- ARCHITECTURE: Defines lifecycle-aware validator responsibility, reasoned-N/A adoption compatibility, question decision flow, and the absence of a second artifact profile or hard size cap.
- README: Projects concise reasoned-N/A use, mandatory traceability, release/security exceptions, and real-blocker-only questions.
- AGENTS: Adds the short real-user-blocker/appended-constraint invariant; the generated template carries the same tested routing projection.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- Revalidated the clean repository, current branch/refs, all three dependency delivery ledgers, exact PR and Actions identities, and the absence of an existing Task 0032 branch.
- Read the four permanent documents, this pair, and the explicitly named Task 0031 and Task 0039 dependency evidence.
- Exact managed dispatch selected this `READY/READY` pair for implementation without another question.
- Created `task/0032-task-artifact-ergonomics` from exact delivered `origin/main`, validated the pair, and entered `IN_PROGRESS/RUNNING`.
- Synchronized SPEC, Architecture, README, root/generated AGENTS, Task Skill/reference, and canonical Task/Test templates.
- Implemented lifecycle-aware meaningful-content and reasoned-N/A validation with byte-preserving pre-rule contract-v2 compatibility.
- Added five representative Markdown pair fixtures and three deterministic question/constraint scenarios.
- Preserved the initial focused 39/42 failure, corrected all three regressions, and passed the focused suite 42/42 with the representative instruction bundle at 35,862 bytes.
- Hardened strict adoption against bare `None` mixed with substantive lines and reran the focused suite 42/42.
- Passed `npm test` 249/249, lint, format, pack, and packed-release isolation on the final implementation state.
- Reviewed every changed path and mapped all acceptance criteria and introduced branches to recorded evidence.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker remains.
