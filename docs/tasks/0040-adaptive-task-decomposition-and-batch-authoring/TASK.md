# TASK 0040 — Adaptive Task Decomposition and Batch Authoring

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Extend `kyw-task` create mode so one natural-language request produces the smallest safe dependency-aware set of fully authored, canonically validated `READY/READY` Task/Test pairs atomically, then either stops after creation or starts exactly the first eligible Task as requested, without weakening existing dispatch, evidence, safety, or delivery contracts.

## Dependencies

- Not applicable — the delivered `main` baseline contains every prerequisite, and the conditional reverse-dependency migration does not apply.

## In Scope

- Replace create mode's one-pair size gate with adaptive single-or-batch decomposition based on independently verifiable outcomes, acceptance-set boundaries, dependency order, and session-sized scope.
- Honor explicit current-prompt constraints for Task count, boundaries, order, titles, dependencies, and create-only versus create-and-execute behavior when they are valid and safe.
- Keep intent discovery and genuine blocking questions compatible with `kyw-grilling` while keeping decomposition, number allocation, dependency materialization, and Task/Test authoring owned by `kyw-task`.
- Add one deterministic atomic batch-authoring path that preallocates all IDs and final paths, renders every complete pair, validates the complete dependency graph and every canonical pair before publication, holds one creation lock, and leaves either the full queue or no new Task directory.
- Publish every adaptively authored pair as `READY/READY`; stop after create-only, or hand only the first dependency-satisfied pair to the existing single-Task execution lifecycle for create-and-execute.
- Preserve configured model and reasoning effort plus exact-ID resume, one-pair creation, ordinary-prompt non-routing, appended overrides, `STANDARD` delivery, exact no-work messaging, direct-install adapter behavior, and historical artifact compatibility.
- Add acceptance-specific unit, process, instruction-surface, packaging, and regression evidence, and synchronize every affected permanent source of truth.

## Out of Scope

- Changing `kyw-grilling` responsibility, its standalone read-only contract, or its file-mutation boundary.
- Executing every pair created by one create request; full serial continuation remains the existing `남은 task 계속 실행해줘` dispatcher contract.
- Allowing more than one active Task, parallel Task execution, partial queue publication, or silent repair of an invalid user-specified structure.
- Creating Task 0041 or implementing any outcome represented by a newly created downstream pair beyond the first explicitly authorized eligible Task.
- Changing the configured model or reasoning effort.
- npm publication, registry mutation, Git tag, GitHub Release, public plugin submission, force push, destructive recovery, workflow rerun, bypass, or unrelated mutation.

## Acceptance Criteria

- [x] AC-01: A request with one independently verifiable outcome creates exactly one fully authored pair, while a request with independent outcomes, separate acceptance sets, required dependency ordering, or excess single-Task scope creates the smallest justified dependency-aware pair set instead of stopping at a split proposal.
- [x] AC-02: Valid explicit current-prompt choices for count, boundaries, order, titles, dependencies, and create-only/create-and-execute mode are preserved exactly; a choice that conflicts with independent verification, truthful evidence, permanent truth, or safety is reported with the reason and minimum safe alternative, and only one genuinely necessary user decision is asked.
- [x] AC-03: `kyw-task` owns decomposition, ID/path allocation, dependency materialization, and pair authoring; `kyw-grilling` remains an optional intent/blocker interview dependency with unchanged responsibility and mutation boundary.
- [x] AC-04: Single and multi-pair adaptive creation preallocates the complete contiguous ID/path set, renders and canonically validates every complete pair, rejects missing dependencies and cycles, and acquires one creation lock before any final publication.
- [x] AC-05: Any validation, lock, race, injected write, or publication failure removes every batch-owned visible Task directory and leaves no dispatchable partial queue; success publishes the complete set with every pair valid as `READY/READY`, while an unprovable rollback retains the fail-closed creation lock.
- [x] AC-06: Create-only stops after reporting the created queue without implementation; create-and-execute selects only the first dependency-satisfied new Task and uses the existing execution reference, while all-Task continuation still requires the existing continuous dispatcher and at most one Task is active.
- [x] AC-07: The active model and reasoning effort remain unchanged, and generated or executed `TEST.md` provenance records only observable values without inference.
- [x] AC-08: Portable exact-ID resume, managed aliases, legacy single-pair helper/API compatibility, ordinary-prompt behavior, appended override scope, `STANDARD` delivery authority, exact no-work text, direct-install runtime fallback, and legacy/current Task validation continue to pass.
- [x] AC-09: The repository-specific conditional migration is resolved honestly: Tasks 0037 and 0038 were already started and completed before Task 0040 authoring, so neither historical pair receives a reverse hard dependency or any other edit.
- [x] AC-10: Permanent documents, packaged Skill/runtime bytes, tests, and metadata agree on adaptive batch authoring; the final diff contains no Task 0041, `kyw-grilling` mutation, publication, tag, or GitHub Release behavior.

## Plan

- [x] Revalidate the clean delivered baseline, this pair, relevant create/dispatch implementation, and the conditional Task 0037/0038 state; then promote this pair through the current lifecycle.
- [x] Define the canonical adaptive-create request and result contract, including explicit user structure, intra-batch/existing dependencies, create-only/create-and-execute authority, and real-blocker handling.
- [x] Implement the core atomic batch primitive with full preallocation, canonical prevalidation, graph checks, one lock, staged whole-set publication, and complete rollback; preserve the compatible one-pair helper surface.
- [x] Extend the packaged adapter and direct-install runtime path so `kyw-task` can submit and receive one fully authored batch deterministically without shell-interpolated source code.
- [x] Rewrite create-mode Skill instructions and affected projections/templates so decomposition and authoring ownership, `READY/READY`, stop/execute semantics, grilling boundary, and unchanged dispatcher/delivery behavior are unambiguous.
- [x] Add focused fixtures and tests for single versus multi decomposition, explicit overrides, invalid structures, missing/cyclic dependencies, lock/race/injected failures, no partial queue, first-eligible execution, one-active enforcement, and compatibility.
- [x] Run acceptance-specific checks, the verification planner, Stable/package checks required by the changed paths, pair/all-Task validation, and final diff/traceability review.
- [x] Synchronize Task/Test evidence and affected permanent documents, set an evidence-backed terminal repository state, and hand the exact repository result to the authorized `STANDARD` delivery lifecycle.

## Decisions

- Adaptive create treats a one-item result as a batch of one so single and multi authoring share the same all-or-nothing safety path.
- A minimal set is based on independently verifiable outcomes and dependency structure, never file count or a pretend-exact token estimate.
- User-specified structure is authoritative only inside existing truth, evidence, and safety invariants; incompatible structure is surfaced rather than silently normalized.
- Complete authored content, not placeholder scaffolds awaiting post-publication edits, must pass canonical validation before any final Task directory becomes visible.
- The existing one-pair helper/adapter surface remains available for compatibility, but `kyw-task` adaptive create uses the new complete-batch path for both one and many pairs.
- Create-and-execute authorizes only the first dependency-satisfied new pair. It does not implicitly invoke continuous mode.
- The conditional historical migration is not applicable because both named Tasks were already `DONE/PASSED` and externally delivered before 0040 authoring.

## Risks

- Accepting model-authored Markdown as batch input can create an injection, placeholder, identity, or dependency mismatch unless the deterministic boundary validates exact IDs, paths, statuses, and graph edges.
- A lock or rollback design that operates per pair can expose a prefix of the queue; failure injection must cover every boundary before and during final publication.
- Replacing the DRAFT confirmation path with `READY/READY` authoring can accidentally broaden execution authority unless create-only and create-and-execute are parsed and tested distinctly.
- Retaining the old single-pair helper while adding a new batch command can create divergent contracts unless compatibility and owning surfaces are explicit.
- Instruction-only decomposition judgments are not fully deterministic; fixtures must lock observable decision rules without pretending the core module can infer product boundaries.
- Cross-platform rename and cleanup behavior may differ, so native Stable CI remains required after local acceptance evidence.

## Discoveries and Changes

- Task 0037 is `DONE/PASSED` and was delivered through merged PR #24 with successful post-merge `main` CI.
- Task 0038 is `DONE/PASSED`; PR #25 merged exact head `44711d86dee7be14921eab53a2b634b88dffd1ec` as `7e979655e2d902535926839fb5b313db3a0889d4`, and post-merge `main` run `30066709496` succeeded.
- The pre-authoring worktree was clean and local `main`, `origin/main`, and direct remote `main` were aligned at `7e979655e2d902535926839fb5b313db3a0889d4`.
- Current core creation renders one DRAFT scaffold pair, stages both files, then publishes one directory under `.kyw-dev-task-create.lock`; the packaged adapter exposes only `create`, `validate`, and `dispatch`.
- Current create-mode instructions propose a split and wait for one selection, forbid multiple Task directories, publish DRAFT scaffolds before model customization, and require a later confirmation before `READY`.
- `createTaskArtifactBatch` now accepts strict complete pair definitions, preallocates contiguous IDs/paths, resolves existing and intra-batch dependencies, requires the dependency placeholder to be the complete Dependencies section, validates every rendered pair plus the combined graph, stages the full set under one lock, and reverses every owned publication on failure.
- The packaged adapter now exposes `create-batch` with exactly one inline or file-backed schema-v1 JSON input; the compatible `create --title` DRAFT scaffold and its public core helper remain unchanged.
- Canonical queue inspection now fails closed whenever the shared creation lock exists, so a serialized multi-directory publication prefix cannot be selected or dispatched.
- Adaptive create instructions now own decomposition and complete `READY/READY` authoring, preserve safe explicit structure, reuse `kyw-grilling` only for intent/blockers, stop for create-only, and enter only the first eligible Task for create-and-execute.
- The representative Task instruction bundle initially exceeded its 36,382-byte historical ceiling. Duplicate wording was removed without adding a reference path; the final bundle is 35,814 bytes and all instruction-contract tests pass.
- The first Stable run exposed the foundation validator's obsolete adaptive-DRAFT assumptions (`264/265` tests). The validator now distinguishes adaptive READY publication from compatible DRAFT confirmation; the focused foundation test and the complete Stable rerun pass.
- The final verification planner classified the exact changed paths as `STABLE`; its required `npm run check` completed with `265/265` tests plus lint, format, and pack success.
- Final integrity inspection found no Task 0041, no `skills/kyw-grilling` diff, and no Task 0037/0038 diff. Each historical Task/Test blob hash matches `origin/main`.

## Documentation Impact

- SPEC: Updated user-visible create behavior, authoring authority/status semantics, sizing/decomposition rules, atomicity, and MVP acceptance wording.
- ARCHITECTURE: Updated create-mode ownership, mutation boundary, deterministic batch primitive/adapter flow, lifecycle diagram, and atomic publication design.
- README: Updated user-facing Task creation examples, adaptive single/batch create-only versus create-and-execute behavior, and the superseded Task 0038 candidate note.
- AGENTS: Added one thin routing invariant for atomic adaptive authoring and first-eligible activation; the canonical project template has the identical projection.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

<!-- Use `STANDARD` with the canonical ledger below, or `NONE — <reason>`. Record policy only, never future delivery state. -->

## Completed

- Inspected the delivered repository and GitHub state, all four permanent sources of truth, the current `kyw-task` Skill, relevant create adapter/core/templates/tests, and the explicitly named Task 0037/0038 pairs.
- Applied the size gate and resolved the request as one cross-layer independently testable Task without creating Task 0041.
- Allocated Task 0040 exactly once through the packaged adapter, authored the DRAFT pair only, passed canonical validation, and received explicit confirmation of the exact shared-understanding summary.
- Revalidated local and direct remote `main`, confirmed no Task 0040 branch or open PR exists, promoted the confirmed pair through `READY/READY`, and entered `IN_PROGRESS/RUNNING` before implementation mutation.
- Synchronized SPEC, Architecture, README, root/template AGENTS, packaged Skill instructions/metadata, plugin metadata, behavioral fixtures, and the foundation validator with the adaptive create contract.
- Implemented and process-tested strict one-or-many batch input, full ID/path preallocation, canonical READY pair validation, explicit dependency materialization, missing/cycle checks, one creation lock, staged publication, whole-set rollback, and fail-closed queue inspection.
- Preserved the compatible DRAFT single-pair adapter/core path, exact and automatic dispatch, continuous serial progression, delivery authority, no-work text, direct-install fallback, legacy validation, and model/effort non-mutation.
- Ran focused core, Skill, dispatcher, instruction, behavioral, foundation, direct-install, and actual-tarball tests; then ran the exact-path verification planner and final Stable gate successfully.
- Reviewed the final intent-to-test mapping and diff boundaries, including Task 0037/0038 blob equality, Task 0041 absence, and zero `kyw-grilling` changes.

## Remaining

- None — repository implementation, documentation, verification, and terminal evidence are complete; mutable `STANDARD` delivery state remains in the external GitHub ledger.

## Resume Point

- None — no repository work remains for Task 0040.

## Blockers

- Not applicable — no blocker is known.
