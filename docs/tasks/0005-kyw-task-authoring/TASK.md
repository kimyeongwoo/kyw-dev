# TASK 0005 — kyw-task Authoring

## Status

DONE

## Goal

Implement the create path of `$kyw-task`: scope discovery, size gate, grilling, numbering, and simultaneous Task/Test authoring.

## Dependencies

- `0002-template-contracts`
- `0003-kyw-grilling-skill`
- `0004-kyw-init-skill`

## In Scope

- Create `kyw-task` Skill and explicit invocation metadata.
- Accept a natural-language goal for a new Task.
- Read permanent docs and inspect relevant code.
- Grill unresolved Task-level decisions only.
- Apply the one-outcome/session-size gate and propose splits when needed.
- Allocate the next Task ID and slug deterministically.
- Create `TASK.md` and `TEST.md` together.
- Map acceptance criteria to initial test rows.
- Require shared-understanding confirmation before implementation.

## Out of Scope

- Task implementation/resume mechanics beyond the handoff into `READY`.
- Independent audit behavior.
- Automatic creation of multiple Task directories from a large request.

## Acceptance Criteria

- [x] AC-01: A valid goal creates exactly one next-numbered Task folder with both files.
- [x] AC-02: A too-large fixture request produces a proposed split and creates no Task files until one outcome is selected.
- [x] AC-03: Acceptance criteria have stable IDs and map to initial test cases.
- [x] AC-04: Task and Test remain `DRAFT` before confirmation and become `READY` only after confirmation.
- [x] AC-05: Task-level questions do not re-interview settled permanent decisions.
- [x] AC-06: No implementation files are changed during the authoring phase.

## Plan

- [x] Specify create-mode inputs and state transitions.
- [x] Integrate inspection and grilling.
- [x] Integrate deterministic Task/Test scaffolding.
- [x] Implement acceptance-to-test mapping guidance and validation.
- [x] Create size-gate and normal-path scenario tests.
- [x] Review docs and package content.

## Decisions

- Follow `docs/SPEC.md` and `docs/ARCHITECTURE.md`; record any necessary deviation before implementing it.
- Keep production dependencies at zero. The create workflow needs semantic Skill instructions plus the existing Node.js built-in-only artifact helpers.
- Implement only `create(goal)` in this Task. A numeric Task ID or resume/execution request must stop without mutation and report that Task 0006 owns that path.
- Apply the size gate and resolve Task-level decisions before allocating an ID. Oversized requests receive a proposed split and one selection question, with no Task artifacts created.
- Publish the canonical DRAFT pair through a thin packaged `kyw-task` script that delegates to `src/core/task-artifacts.mjs`; do not duplicate numbering, slug, template, path, or atomic-write logic inside the Skill.
- After scaffolding, customize both files from inspected facts and settled decisions, preserve stable `AC-NN`/`T-NN` identifiers, validate traceability, and request explicit confirmation. Only confirmation of the current summary may promote both documents from `DRAFT` to `READY`.
- Limit authoring mutations to the newly created `TASK.md` and `TEST.md`. Permanent documents, implementation files, tests for the target product, and existing Tasks remain read-only during this phase.

## Risks

- Task sizing is judgment-based; the Skill needs clear signals without pretending token estimates are exact.
- The create and execute phases must not accidentally cross before confirmation.
- Repeated failed attempts must not consume or reuse Task IDs incorrectly.

## Discoveries and Changes

- The supplied workspace has no `.git` metadata, so `git status` and Git-native working-tree/staging diff are unavailable. A 17-file Task-scoped snapshot was created at `C:\Users\DEVHAM~1\AppData\Local\Temp\kyw-dev-task0005-before-1784209497811` for final no-index and SHA-256 review.
- Pre-change `npm run check` passed: 33/33 tests, 15 JavaScript modules plus foundation metadata, 74 UTF-8/LF text files, and the exact 25-file package allowlist at 19,970 bytes.
- The existing `kyw-task` Skill and metadata are a complete explicit-only, zero-mutation stub. Foundation validation currently permits only `kyw-grilling` and `kyw-init` as implemented Skills and must advance exactly `kyw-task` while leaving `kyw-audit` a stub.
- Task 0002 already supplies canonical Task/Test templates, max-plus-one ID allocation, deterministic slugging, path containment, atomic pair publication, rollback, and contract validation. Task 0005 should add only a safe Skill-facing adapter and authoring workflow around those mechanics.
- Task 0003 supplies the dependency-ordered, one-question, recommendation, fact-inspection, user-decision, and confirmation protocol. Task 0004 demonstrates how a wrapper composes that protocol while retaining its own post-confirmation mutation authority.
- The current official Codex manual confirms that a Skill requires `SKILL.md` with `name` and `description`, may include scripts for deterministic behavior, may include `agents/openai.yaml`, and can enforce explicit-only use with `policy.allow_implicit_invocation: false`.
- The user's instruction to continue only Task 0005 supplies authorization to move this repository Task from its prepared DRAFT contract into implementation. It does not weaken the confirmation boundary that the implemented `$kyw-task` must apply in target repositories.
- The first focused run passed 11/12 selected checks; the only failure was a case-sensitive duplicate wording assertion for the already enforced implementation mutation boundary. Aligning that assertion with the Skill text produced a 12/12 focused pass, and the official Skill validator passed.
- The Skill metadata generator emitted the intended UI values but omitted the explicit-invocation policy and used Windows CRLF. The policy was restored and the same generated values were normalized to the repository's required UTF-8/LF form.
- The first full check passed 38/39 tests before stopping at the CRLF-sensitive foundation metadata assertion. After normalization, the preliminary full check passed 39/39 tests, 17 JavaScript modules plus foundation metadata, 82 UTF-8/LF text files, and the exact 26-file package allowlist at 23,280 bytes.
- A post-test adapter audit found that resolving a blank path argument would select the process directory. The adapter now rejects every blank required value before path resolution, and the integration test covers the no-write failure.
- Final diff-to-test review added direct coverage for every adapter argument and validation error category. The corrected suite gives the adapter 100% line and function coverage without changing the core helper boundary.
- Final focused, official Skill, stable, Node.js 22, coverage, direct package, Task-contract, and scoped diff/hash checks passed. The exact final terminal-state results are retained in `TEST.md`.

## Documentation Impact

- SPEC: Unchanged; the implementation follows the existing create behavior, sizing policy, status lifecycle, and artifact contract without altering product requirements.
- ARCHITECTURE: Updated with the create-phase mutation boundary and thin packaged adapter that delegates to the existing core helper.
- README: Updated implementation status, create-only invocation behavior, confirmation boundary, output, and current execution/resume limitation.
- AGENTS: Unchanged; repository-wide Codex and completion rules did not change.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the permanent documents, current Task/Test contract, and Tasks 0002 through 0004 as explicit dependencies.
- Inspected the current Task Skill stub, grilling/init dependencies, canonical templates, core artifact/contract helpers, foundation validation, relevant tests, package contract, and stable verification scripts.
- Confirmed missing Git metadata, created a scoped pre-change snapshot, and passed the pre-change stable verification baseline.
- Reconciled the create-only state machine and explicit Skill format with the current official Codex manual.
- Finalized the zero-dependency instruction/helper split, size-gate ordering, authoring mutation boundary, and DRAFT-to-READY confirmation rule.
- Replaced the `kyw-task` stub and UI copy with the explicit-only create workflow while keeping numeric resume/execution out of scope.
- Added the packaged create/validate adapter that delegates all deterministic mechanics to the Task 0002 core helper.
- Advanced foundation validation for exactly `kyw-task`, kept `kyw-audit` a stub, and added the adapter to the exact package allowlist.
- Added settled-fact, oversized, confirmation, mutation-boundary, traceability, adapter-success, and adapter-argument fixture coverage.
- Updated README and Architecture for the create-only user flow and thin adapter boundary; confirmed SPEC and AGENTS remain semantically unchanged.
- Passed the final focused suite, official Skill validator, all four stable commands, Node.js 22 suite, built-in coverage run, direct package inspection, and Task contract validation.
- Reviewed the scoped no-index diff, every added/modified file, whitespace, package contents, and independent hash/file-set audit against all acceptance and test rows.

## Remaining

- None.

## Resume Point

Task 0005 is complete. Begin Task execution/resume only from Task 0006; do not extend `kyw-task` execution, `kyw-audit`, or installation behavior here.

## Blockers

- None known.
