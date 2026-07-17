# TASK 0004 — kyw-init Skill

## Status

DONE

## Goal

Implement project discovery, grilling, and non-destructive materialization of the four permanent documents.

## Dependencies

- `0002-template-contracts`
- `0003-kyw-grilling-skill`

## In Scope

- Create `kyw-init` Skill and explicit invocation metadata.
- Detect or infer `new`, `adopt`, and `rebaseline` modes.
- Inspect existing project facts before interviewing.
- Use the grilling protocol for unresolved durable decisions.
- Require shared-understanding confirmation before writing.
- Create or minimally update README, AGENTS, SPEC, and ARCHITECTURE.
- Keep generated AGENTS below the product size target.
- Preserve useful existing sections and report conflicts.
- Propose Task decomposition without implementing application code or creating all Tasks.

## Out of Scope

- Implementing target-project features.
- Automatically creating a complete backlog.
- Replacing unknown existing docs wholesale.

## Acceptance Criteria

- [x] AC-01: Empty-project fixture receives all four documents with project-specific content and no unexplained placeholders.
- [x] AC-02: Existing-project fixture is adopted without losing unrelated README/AGENTS content.
- [x] AC-03: No document is written before shared-understanding confirmation.
- [x] AC-04: Repository facts available in fixtures are not asked as user decisions.
- [x] AC-05: Generated AGENTS is thin and routes ordinary small-change documentation impact.
- [x] AC-06: The Skill stops after durable docs and Task recommendations; no application code is changed.
- [x] AC-07: New, adopt, and rebaseline scenarios are classified from inspected facts, with intentional rebaseline conflicts surfaced before replacement.

## Plan

- [x] Define Skill inputs, modes, outputs, and mutation boundary.
- [x] Implement/author repository inspection checklist.
- [x] Integrate the grilling primitive.
- [x] Implement document materialization guidance with non-destructive rules.
- [x] Add empty/adopt/rebaseline fixture scenarios.
- [x] Run contract tests/manual evaluations and audit docs.

## Decisions

- Follow `docs/SPEC.md` and `docs/ARCHITECTURE.md`; record any necessary deviation before implementing it.
- Keep production dependencies at zero. `kyw-init` is an instruction-only reasoning workflow and does not need a deterministic runtime helper.
- Compose the installed `$kyw-grilling` protocol for the interview phase. Its standalone zero-write stop returns control to this wrapper; only `$kyw-init` may materialize the confirmed summary, and only inside the four-document mutation boundary.
- Treat `templates/project/` as the canonical section contract without copying those templates into Skill assets. The Skill must resolve their guidance into project-specific prose and preserve existing user sections instead of performing a blind template replacement.
- Infer `new` and `adopt` from repository facts. Enter `rebaseline` only when the invocation or the confirmed summary intentionally requests reconciliation of an existing kyw-dev baseline.
- Exercise the natural-language workflow with deterministic fixtures, executable contract checks, and context-isolated forward evaluations; do not add an application-code generator.

## Risks

- Semantic merging of arbitrary Markdown cannot be fully deterministic; Skill instructions must favor preservation and explicit conflict reporting.
- A README may mix user and contributor docs in unfamiliar structures.
- Rebaseline can be destructive if confirmation is not precise.

## Discoveries and Changes

- The workspace has no Git metadata, so `git status`, staged state, and Git-native working-tree diff are unavailable. A verified 68-file pre-change snapshot was created at `C:\Users\DEVHAM~1\AppData\Local\Temp\kyw-dev-task0004-before-1784207359597`; final review will use no-index diff plus independent file-set and SHA-256 comparison.
- The snapshot's first audit reported 68 mismatches because `%TEMP%` used an 8.3 base-path spelling while relative keys used the expanded path. Recomputing relative paths with `System.IO.Path.GetRelativePath` verified 68 source files, 68 snapshot files, no missing/extra paths, and zero hash mismatches.
- Pre-change `npm run check` passed: 26/26 tests, 14 JavaScript modules, 62 UTF-8/LF text files, and the exact 25-file package allowlist at 17,201 bytes.
- The existing `kyw-init` directory is a complete explicit-only stub, so Skill initialization scaffolding is unnecessary. The foundation validator currently recognizes only `kyw-grilling` as implemented and must advance exactly `kyw-init`, leaving `kyw-task` and `kyw-audit` as stubs.
- The current official Codex manual confirms the existing repository contract: a focused instruction-only `SKILL.md` with `name` and `description`, optional quoted UI metadata, and `policy.allow_implicit_invocation: false` for explicit-only use.
- The canonical project templates already cover all four document responsibilities. Arbitrary Markdown adoption remains a reasoning task; a deterministic semantic merge script would exceed the smallest design needed here.
- The user's instruction to continue Task 0004 supplies authorization to move the prepared Task/Test contract into implementation, while the Skill itself must still require confirmation in target repositories.
- The first focused test run passed 12/13 checks and exposed only a wording mismatch: the recovery contract says “exact paths that changed,” while its assertion expected “changed paths.” The fixture's `.mjs` source was also auto-discovered by Node's test runner, so the fixture now uses an executable extensionless source path and the assertion follows the more precise contract wording.
- The first official `quick_validate.py` run failed before validation because Python 3.13 used the Korean Windows `cp949` default to read UTF-8 phase-heading em dashes. Replacing those decorative dashes with ASCII keeps the Skill portable and allows the documented validator command to run without locale flags.
- The first full check passed 32/33 tests before stopping: the foundation validator interpreted the literal word `TODO` inside a prohibition as a live placeholder. The Skill now says “unexplained unfinished markers,” preserving the behavior without weakening the existing placeholder guard.
- Three context-isolated forward evaluations exercised `new`, `adopt`, and `rebaseline` through multiple conversational turns. Every scenario kept its complete pre-confirmation file set and SHA-256 hashes unchanged, asked only unresolved decisions with recommendations, presented the final summary/write plan, and waited for explicit confirmation.
- After confirmation, each evaluation changed exactly `README.md`, `AGENTS.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`; no unexpected file, application path, package file, test, or numbered Task changed. Generated AGENTS sizes were 2,566 bytes (`new`), 2,918 bytes (`adopt`), and 2,413 bytes (`rebaseline`), with no template-token or authoring-comment hits.
- The adopt evaluation preserved both requested README/AGENTS sentences verbatim and left `package.json`, `src/server`, and `ops/runbook.md` hash-identical. The rebaseline evaluation preserved the `ledger-finch import` contract semantically while minimally clarifying its sentence; the fixture now distinguishes verbatim adoption markers from rebaseline concepts.
- Isolated fixture test commands found zero implementation tests. They validate the documentation-only mutation boundary, not target-application behavior; the generated documents correctly expose those implementation gaps rather than claiming completion.
- Final acceptance-specific checks passed, followed by all four stable commands: 33/33 full tests, 15 JavaScript modules plus foundation metadata, 74 UTF-8/LF text files, and the exact 25-file tarball allowlist at 19,970 bytes. Node.js 22 independently passed 33/33 tests.
- The no-index name/status review found exactly 6 expected modifications and 13 expected additions across 19 Task-scoped paths; stat and per-file content were reviewed and `git diff --no-index --check` reported no whitespace errors.
- The first final hash-audit summary counted one missing expectation because two empty PowerShell pipelines were combined into an array containing `$null`; the printed missing-path list was empty. Separately materialized arrays corrected the audit to 68 before files, 81 after files, 6 expected modifications, 13 expected additions, 0 removals, 62 byte-identical existing files, and zero unexpected or missing paths.
- The first direct Task-contract one-liner treated `validateTaskDirectory()` as an object with `valid/errors`, but the Task 0002 API returns an error array; the diagnostic script failed while reading `result.errors`. The corrected array-based command passed, followed by a successful terminal `npm run check` in the DONE/PASSED state.

## Documentation Impact

- SPEC: Unchanged; this Task implements the existing initialization modes and output contract without changing product requirements.
- ARCHITECTURE: Unchanged; the existing instruction/script split, grilling dependency, document responsibilities, and four-file mutation boundary already describe the implemented design.
- README: Updated implementation status, explicit invocation usage, confirmation boundary, preservation behavior, and mutation limits.
- AGENTS: Unchanged; repository-wide development and completion rules do not change.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the permanent documents, current Task/Test, Task 0002 contract/evidence, and Task 0003 dependency/evidence.
- Inspected the current Skill stub and metadata, grilling dependency, canonical project templates, foundation validator, relevant tests, package allowlist, and stable verification scripts.
- Confirmed missing Git metadata, created and independently verified the pre-change snapshot, and passed the pre-change stable verification baseline.
- Reconciled the current official Codex Skill format with the repository's explicit-invocation and zero-dependency constraints.
- Defined the instruction-only modes, interview/confirmation handoff, preservation policy, mutation boundary, and verification approach.
- Replaced the `kyw-init` stub and UI copy with the explicit-only discovery, grilling, confirmation, non-destructive materialization, verification, and stop workflow.
- Advanced foundation validation for exactly `kyw-init`, leaving `kyw-task` and `kyw-audit` as zero-mutation stubs.
- Added deterministic new/adopt/rebaseline fixtures and seven acceptance-specific Skill contract tests without adding packaged files or dependencies.
- Passed the corrected focused suite, official Skill validator, and a preliminary full stable check (33/33 tests, 15 JavaScript modules, 74 UTF-8/LF text files, and 25 packed files).
- Passed all three context-isolated forward evaluations and independent pre/post file-set, SHA-256, mutation-boundary, placeholder, preservation, and AGENTS-size audits.
- Synchronized README and confirmed that SPEC, Architecture, and AGENTS require no semantic change.
- Passed the final focused suite, official Skill validator, all stable commands, the Node.js 22 suite, and the full no-index/hash diff audit.
- Compared every final diff behavior with the intent-to-test matrix and found no unplanned or untested behavior.
- Passed direct Task 0004 contract validation and the terminal stable-check run after setting Task/Test to DONE/PASSED.

## Remaining

- None.

## Resume Point

Task 0004 is complete. Begin later work only from its own numbered Task; do not extend `kyw-task`, `kyw-audit`, CLI installation, or target-project application functionality here.

## Blockers

- None known.
