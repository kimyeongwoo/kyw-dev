# TASK 0031 — Lean Instruction Surfaces and Model Provenance

## Status

READY

## Goal

Remove repeated execution policy from loaded instruction surfaces, keep one canonical owner for each rule, and record exact model/effort provenance when observable without changing the user's configured model or reasoning effort.

## Dependencies

- Task 0030.

## In Scope

- Inventory normative rules duplicated across root/project AGENTS, SPEC, README, Skill, references, templates, CODEX prompts, and Task scaffolds.
- Assign each rule one canonical authority: product behavior in SPEC, concise user projection in README, execution invariants in AGENTS, detailed procedure in Skill references, and current delta/evidence in Task/Test. Permit only the minimum derived projection needed on a surface that cannot load the authority directly, and test it for semantic parity.
- Replace mega-prompt expectations with short Task invocation plus repository-resident procedure.
- Add a standard provenance block for model identifier or requested alias, reasoning effort, Codex surface/version, and whether values were observable.
- Preserve the active model and effort exactly; do not lower, substitute, benchmark, or recommend a cheaper setting in this Task.
- Measure the same representative loaded instruction/context surfaces before and after, remove at least one complete duplicated normative block, and prove required safety/completion semantics remain covered without increasing file/tool loading.

## Out of Scope

- Changing model selection or reasoning effort.
- Running the final workflow benchmark; that belongs to Task 0037.
- Changing product acceptance or removing safety constraints.
- Creating a generic prompt framework or new configuration language.

## Acceptance Criteria

- [ ] AC-01: Every normative rule in scope has one documented canonical authority; any necessary surface-local projection is minimal, identified as derived, and covered for semantic parity with no contradiction.
- [ ] AC-02: A short exact-ID and automatic Task invocation still performs the full Task 0030 contract without an externally generated long prompt.
- [ ] AC-03: The same representative loaded surfaces remove at least one complete duplicated normative block and show a recorded byte reduction without deleting required behavior or shifting equivalent overhead into extra file/tool reads.
- [ ] AC-04: Model, requested alias, effort, Codex surface/version, and observability are recorded consistently for model-dependent evidence.
- [ ] AC-05: No test or code path changes the configured model or effort unless an explicit user override is present.
- [ ] AC-06: Existing safety, evidence, publication, and one-active-Task invariants retain deterministic coverage.
- [ ] AC-07: Permanent-document responsibilities remain distinct and no new permanent document is added.

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

- No fixed percentage is accepted as proof by itself; byte reduction plus semantic contract tests are both required.
- Unavailable model/effort values are recorded as unavailable, never inferred.
- The detailed lifecycle belongs in the packaged `kyw-task` execution reference rather than every invocation prompt; README, AGENTS, and generated templates may carry only the minimum derived projection their surface must load.

## Risks

- Removing apparently duplicated text could remove the only instruction loaded on one surface.
- Model provenance may be unavailable on some Codex surfaces.
- Context-size measurement can be misleading unless the same representative fixture is used.

## Discoveries and Changes

- None yet.

## Documentation Impact

- SPEC: Clarify provenance and short invocation only if user-visible meaning changes.
- ARCHITECTURE: Record canonical instruction ownership and progressive-loading boundaries.
- README: Replace long execution examples with concise commands.
- AGENTS: Reduce to invariant rules and pointers.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- No implementation or verification has run.

## Remaining

- Repository implementation and verification have not started. External delivery is intentionally not a future fact required inside this artifact.

## Resume Point

When selected by an exact or automatic Task invocation, revalidate current state and dependencies, treat the selection as execution confirmation, transition to `IN_PROGRESS/RUNNING`, and begin at the first unchecked Plan item. Do not repeat completed predecessor work.

## Blockers

- None known at planning time.
