# TASK 0031 — Lean Instruction Surfaces and Model Provenance
<!-- kyw-task-contract: 2 -->

## Status

DONE

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

- [x] AC-01: Every normative rule in scope has one documented canonical authority; any necessary surface-local projection is minimal, identified as derived, and covered for semantic parity with no contradiction.
- [x] AC-02: A short exact-ID and automatic Task invocation still performs the full Task 0030 contract without an externally generated long prompt.
- [x] AC-03: The same representative loaded surfaces remove at least one complete duplicated normative block and show a recorded byte reduction without deleting required behavior or shifting equivalent overhead into extra file/tool reads.
- [x] AC-04: Model, requested alias, effort, Codex surface/version, and observability are recorded consistently for model-dependent evidence.
- [x] AC-05: No test or code path changes the configured model or effort unless an explicit user override is present.
- [x] AC-06: Existing safety, evidence, publication, and one-active-Task invariants retain deterministic coverage.
- [x] AC-07: Permanent-document responsibilities remain distinct and no new permanent document is added.

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

- No fixed percentage is accepted as proof by itself; byte reduction plus semantic contract tests are both required.
- Unavailable model/effort values are recorded as unavailable, never inferred.
- The detailed lifecycle belongs in the packaged `kyw-task` execution reference rather than every invocation prompt; README, AGENTS, and generated templates may carry only the minimum derived projection their surface must load.
- `SKILL.md` remains canonical for Task creation/authoring and dispatch entry; the execution reference alone owns selected existing-Task procedure.
- The canonical Test template includes `Model Provenance`, and the validator enforces it when present without making it a global contract-v2 requirement that would invalidate existing Tasks.
- Byte reduction is asserted on the fixed three-file project-AGENTS/Skill/reference bundle and separately measured on six stable policy-bearing instruction paths. The current Task/Test pair is excluded from byte deltas to avoid self-referential evidence growth but remains in the unchanged eight-path runtime-context audit.

## Risks

- Removing apparently duplicated text could remove the only instruction loaded on one surface.
- Model provenance may be unavailable on some Codex surfaces.
- Context-size measurement can be misleading unless the same representative fixture is used.

## Discoveries and Changes

- Task 0030 delivery is satisfied by merged PR #16: outcome SHA `665579b0fb6ce2a2e9f2242aee3b3577efb5cf8d`, merge SHA `9446c22372b5aff95093deb53de79293f49a14cd`, successful PR run `30009899722`, and successful `main` run `30010099111`, each with all nine jobs successful.
- Exact managed dispatch with separately supplied `LOCAL_GIT` expectations and fresh `GITHUB` ledger evidence returned `SELECTED/IMPLEMENT` for Task 0031 with no override. Work began from clean `origin/main@9446c22372b5aff95093deb53de79293f49a14cd` on `task/0031-lean-instruction-and-model-provenance`.
- The fixed six stable instruction paths (`AGENTS.md`, `README.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `skills/kyw-task/SKILL.md`, and `skills/kyw-task/references/execution.md`) measured 169,551→169,221 UTF-8 bytes (-330; -0.1946%) and 42,388→42,306 estimated tokens (-82). This is a separate measurement, not the automated representative-bundle assertion.
- The fixed representative projection/Skill/reference bundle (`templates/project/AGENTS.md`, `skills/kyw-task/SKILL.md`, and `skills/kyw-task/references/execution.md`) measured 36,382→34,683 bytes (-1,699; -4.6699%) and 9,096→8,671 estimated tokens (-425). The removed trailing `SKILL.md` block was 3,021 bytes and included a fully duplicated 1,856-byte existing-Task section; terse create-mode safeguards remain. The runtime-context contract remains eight distinct paths and one distinct execution-reference path.
- The conversation establishes the Codex product family and that the user supplied no model override, but it does not expose a concrete CLI/IDE/desktop/app/cloud subtype. Exact model identifier, reasoning effort, concrete Codex surface, and Codex version are recorded as `UNAVAILABLE`; no setting was changed or inferred.
- The current official Codex manual confirms that short, accurate `AGENTS.md` guidance should hold durable repository rules, repeated workflows belong in Skills, and model/reasoning defaults live in configuration. This supports the owner/projection split without changing the active settings.
- Implementation removed the duplicated Skill tail, reduced maintainer Task prompts to exact short invocations, documented one owner per rule family, added a compatible provenance validator/template block, and introduced deterministic ownership, parity, byte/path-count, prompt, and model-mutation coverage.
- Three read-only reviews found and drove bounded corrections for create-mode stop/resume safety, authority-family boundaries, projection parity, exact terminal wording, measurement evidence, provenance negative branches, and unmarked legacy compatibility. Final contract and coverage re-reviews found no implementation blocker.

## Documentation Impact

- SPEC: Recorded the standard provenance meaning while retaining product ownership of dispatch behavior.
- ARCHITECTURE: Recorded instruction authority, derived projections, compatibility, and the fixed progressive-loading boundary.
- README: Reduced Task guidance to concise invocation and user-facing provenance/delivery projections.
- AGENTS: Kept repository invariants and the minimal derived routing projection, with its detailed procedure identified.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

This artifact records repository outcome only and does not pre-claim delivery.

## Completed

- Task scope and initial acceptance contract were approved as part of the ordered follow-up queue.
- Revalidated the clean local/remote repository, Task 0030 dependency, merged PR, exact outcome/merge SHAs, and successful PR/post-merge Actions.
- Read the permanent documents, current pair, Task 0030 dependency evidence, packaged Task Skill/reference, canonical templates, CODEX prompts, and directly relevant validators/tests.
- Captured the fixed six-path instruction, nested three-path representative, eight-path runtime-context, and complete duplicated-block baselines without changing model or effort.
- Entered `IN_PROGRESS/RUNNING` from an exact confirmed short invocation.
- Implemented canonical instruction ownership and minimal projections, removed the complete duplicated Skill execution tail without losing create-mode safeguards, and replaced Task mega-prompts with short commands.
- Added the standard five-field provenance block, optional-compatible validation, canonical scaffold, and positive/negative observability coverage.
- Resolved every confirmed independent-review finding and preserved unmarked legacy pairs whose historical free-form section happens to use the new heading.
- Passed final focused verification 45/45, the full suite 242/242, lint, format, package allowlist, and real packed-release isolation; the final packed archive contained 29 files / 74,874 bytes with SHA-256 `4f2a334924ec146afa3d388a528cf4dca3521405bf413951945a9ae9901c07a9`.
- Reviewed every changed path and the untracked new regression file against this Task; no other numbered Task, dependency, production dependency, or new permanent document changed.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- None.
