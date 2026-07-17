# TASK 0002 — Template Contracts and Deterministic Helpers

## Status

DONE

## Goal

Implement canonical project/Task/Test templates and deterministic helpers that safely allocate and validate Task artifacts.

## Dependencies

- `0001-plugin-foundation`

## In Scope

- Create canonical templates for README, AGENTS, SPEC, ARCHITECTURE, TASK, and TEST.
- Implement next Task number allocation from existing directory names.
- Implement safe ASCII kebab slug generation with a deterministic fallback.
- Implement atomic creation of a Task directory with both `TASK.md` and `TEST.md`.
- Validate required sections, allowed statuses, acceptance-to-test references, and PASS evidence rules.
- Add fixture repositories for normal, gapped, malformed, and conflicting Task states.

## Out of Scope

- Natural-language generation of final project-specific content.
- Running Codex interviews.
- CLI installation.

## Acceptance Criteria

- [x] AC-01: Templates cover all required document sections in the Spec.
- [x] AC-02: The allocator starts at `0001`, skips used IDs, tolerates gaps, and never reuses the highest prior ID.
- [x] AC-03: Task and Test files are created together or neither remains after failure.
- [x] AC-04: Slug/path handling cannot escape the target `docs/tasks` directory.
- [x] AC-05: Validation reports actionable errors for missing sections, invalid statuses, unmapped acceptance criteria, and unsupported PASS evidence.
- [x] AC-06: Unit and fixture tests pass cross-platform path cases.

## Plan

- [x] Finalize template schemas from Spec and Architecture.
- [x] Implement number and slug helpers.
- [x] Implement atomic Task/Test scaffolding.
- [x] Implement Markdown contract validation using minimal parsing.
- [x] Build fixtures and unit/integration tests.
- [x] Inspect package inclusion and update docs.

## Decisions

- Follow `docs/SPEC.md` and `docs/ARCHITECTURE.md`; record any necessary deviation before implementing it.
- Keep production dependencies at zero; Node.js built-ins are sufficient for the deterministic helpers.
- Keep `templates/project/` and `templates/task/` as the single canonical template source. Do not duplicate these files into Skill assets in this Task.
- Allocate `max(existing valid Task ID) + 1`; gaps and cancelled Tasks remain consumed, while duplicate IDs are actionable conflicts.
- Normalize slugs to bounded lowercase ASCII kebab-case and use a stable SHA-256-derived `task-<hash>` fallback when no ASCII token remains.
- Create Task artifacts in a temporary sibling directory and rename that directory into place only after both files are complete. Reject a symlinked tasks root and any non-direct-child target.
- Keep Markdown validation line-oriented and section/table focused; do not introduce a Markdown parser dependency or enforce prose formatting outside the documented contracts.

## Risks

- Overly strict Markdown parsing could reject legitimate project customization.
- Unicode titles require a stable fallback when the slug becomes empty.
- Template duplication between package root and Skill assets can drift.

## Discoveries and Changes

- The supplied workspace has no Git metadata, so `git status` and repository diff commands cannot run. A verified 48-file pre-change snapshot was created at `C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0002-before-1784203699359`; final review will use `git diff --no-index` plus an independent file/hash comparison.
- Before implementation, the workspace matched that snapshot exactly and `npm run check` passed: 9 tests, 9 JavaScript modules, 48 text files, and the 19-file package allowlist.
- The foundation contains only `templates/project/placeholder.txt` and `templates/task/placeholder.txt`; package validation and the tarball allowlist explicitly name those placeholders and must be updated with the real contracts.
- The user's instruction to continue Task 0002 supplies the confirmation to move the prepared Task/Test contract into implementation.
- The first focused test run showed that placeholder Results ending in punctuation (for example, `Not run yet.`) were accepted as PASS evidence. The evidence predicate now rejects the same unsupported sentinel phrases with optional terminal punctuation.
- The coverage review tightened two minimal-parser boundaries: acceptance IDs are collected only from criterion definition lines so prose cross-references do not look like duplicates, and `PASSED` requires an actual checked Final Coverage Review checklist rather than an empty section heading.

## Documentation Impact

- SPEC: Unchanged; this Task implements the existing artifact contract without changing product behavior or acceptance criteria.
- ARCHITECTURE: Updated with the durable helper-module boundaries, canonical template paths, and atomic Task scaffolding flow.
- README: Updated the implementation status and described the packaged template/helper foundation while retaining the contributor verification commands.
- AGENTS: Unchanged; repository-wide agent behavior and completion rules did not change.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the permanent documents, Task/Test contract, and the explicitly referenced Task 0001 dependency.
- Inspected the relevant template, core, validation, test, and package files.
- Confirmed the missing Git metadata, created and verified a pre-change snapshot, reviewed the empty baseline diff, and passed the pre-change stable checks.
- Finalized the template, allocation, slug, path-containment, atomic-write, and minimal-validation design without adding dependencies.
- Replaced the two placeholder files with six canonical project/Task/Test templates and added packaged template-contract and Task-artifact core modules.
- Added empty, normal, gapped, malformed, and conflicting fixture repositories plus acceptance-specific unit and integration coverage.
- Passed the corrected focused suite (14/14) and a preliminary full verification run (21/21 tests, 13 JavaScript modules, 60 text files, and the exact 25-file tarball allowlist).
- Synchronized README and Architecture, confirmed SPEC and AGENTS were unaffected, and preserved the zero-dependency and no-lifecycle-script constraints.
- Passed the focused suite, all four stable checks, the full Node.js 22 suite, direct npm pack inspection, and the built-in coverage audit.
- Reviewed the snapshot diff, per-file implementation/document changes, whitespace check, and independent hash/file-set audit: 5 expected existing files changed, 20 expected files added, 2 placeholders removed, and 41 existing files unchanged.

## Remaining

- None.

## Resume Point

Task 0002 is complete. Begin later work only from its own numbered Task; do not extend the Skill stubs or CLI workflows under this Task.

## Blockers

- None known.
