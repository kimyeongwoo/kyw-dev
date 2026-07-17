# TASK 0007 — kyw-audit Skill

## Status

DONE

## Goal

Implement an independent evidence-based audit of Task scope, implementation, tests, and permanent-document synchronization.

## Dependencies

- `0006-kyw-task-execution`

## In Scope

- Create `kyw-audit` Skill and explicit invocation metadata.
- Accept a Task ID and inspect its Task/Test, permanent docs, implementation, and relevant diff/history.
- Check acceptance coverage, meaningful branches/error paths, regression evidence, scope, and documentation drift.
- Distinguish reproducible evidence from claims.
- Fix only clear in-scope findings and rerun affected checks.
- Convert out-of-scope findings into a proposed new Task rather than broadening the audited Task.
- Return PASS or BLOCKED with structured findings.

## Out of Scope

- General code review unrelated to a Task.
- Security certification.
- Automatically publishing audit results externally.

## Acceptance Criteria

- [x] AC-01: Audit catches an unmapped acceptance criterion.
- [x] AC-02: Audit catches a PASS row without executable evidence.
- [x] AC-03: Audit catches a stale SPEC or ARCHITECTURE fixture after code change.
- [x] AC-04: Audit catches an out-of-scope implementation and does not silently accept it.
- [x] AC-05: In-scope fixes update Task/Test and rerun affected checks.
- [x] AC-06: Final result is evidence-based PASS or BLOCKED.

## Plan

- [x] Define finding categories, severity, and output contract.
- [x] Implement audit inspection sequence and evidence rules.
- [x] Create negative fixtures for missing tests, stale docs, and scope drift.
- [x] Create positive fixture that passes without unnecessary edits.
- [x] Run scenario evaluations and package checks.

## Decisions

- Follow `docs/SPEC.md` and `docs/ARCHITECTURE.md`; record any necessary deviation before implementing it.
- Keep production dependencies at zero. Audit classification and repair decisions are a semantic Skill workflow, while existing Task validators remain available as evidence inputs.
- Keep mode selection, mutation boundaries, and terminal output in `SKILL.md`; place the detailed inspection, finding, repair, and verdict protocol in one directly linked `references/audit.md` file.
- Use stable `F-NN` finding IDs with category, severity, evidence, expected/actual state, scope classification, action, and status. An unresolved `BLOCKER` or `ERROR` prevents `PASS`; `WARNING` records a non-blocking limitation or residual risk.
- Keep the initial audit read-only. Apply only clear, safe fixes required by the audited Task, update its Task/Test evidence, and rerun affected checks. Never implement an out-of-scope finding or create its proposed follow-on Task.
- Treat unavailable Git history or diff as an evidence limitation. Use an authorized snapshot, patch, or other reproducible baseline when sufficient; otherwise return `BLOCKED` rather than infer scope or history.

## Risks

- History/diff availability differs across repositories.
- Audit must avoid rewriting valid design based on personal preference.
- A failed external dependency may block reproduction without invalidating all prior evidence.

## Discoveries and Changes

- The supplied workspace and its visible parent path contain no `.git` metadata, so Git working-tree, staging, and history inspection cannot run. A verified 92-file pre-change snapshot was created at `C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0007-before-1784212783499`; final content review will use no-index diff plus an independent file/hash comparison.
- Pre-change `npm run check` passed: 44/44 tests, lint over 17 JavaScript modules plus foundation metadata, 84 UTF-8/LF text files, and the exact 27-file package at 27,692 bytes. The current Task contract and official Skill validator also passed, and the snapshot had no content difference.
- At baseline, `kyw-audit` was the original zero-inspection stub. Foundation validation classified only `kyw-grilling`, `kyw-init`, and `kyw-task` as implemented and the tarball allowlist contained no audit reference.
- Task 0002 supplies the canonical Task/Test state, traceability, evidence, and pair-validation contracts. Task 0006 supplies the current-Task scope, documentation-routing, handoff, and final-diff gates that the independent audit must verify without duplicating its implementation workflow.
- The Skill authoring guidance favors a concise main Skill, one-level progressive references, explicit-only UI metadata, and official validation. The existing stub means initialization is unnecessary; its metadata must be regenerated or synchronized after implementation.
- The user's instruction to continue only Task 0007 authorizes this prepared Task/Test pair to move through `READY` into implementation. It does not broaden the distributed `$kyw-audit` mutation boundary.
- The metadata generator produced the intended interface values but omitted the required explicit-invocation policy and wrote CRLF. The policy was restored and the generated values were normalized to UTF-8/LF before validation.
- The first focused audit run passed seven of eight audit-specific tests. The clean-fixture test expected a semantically equivalent but non-literal Architecture phrase; its assertion was corrected to the actual durable wording while retaining the same stable finding-ID contract.
- The corrected focused audit suite passed, but the first full check exposed a Task 0006 documentation regression assertion fixed to `Tasks 0001 through 0006`. Because README now truthfully reports Task 0007, that single existing assertion was advanced to 0007 without changing `kyw-task` behavior.
- Final content review found that the generated default prompt hard-coded this repository's Task `0007`. The packaged metadata and its test now request a generic four-digit Task ID, while README retains `0007` only as a concrete usage example.
- The first terminal hash-audit command falsely counted one mismatch because PowerShell combined two empty `Compare-Object` results as a null element. Printed actual/expected lists were identical; separately arraying both comparisons corrected the command and passed with zero mismatch.

## Documentation Impact

- SPEC: Unchanged; this Task implements the existing independent audit guarantees and `PASS`/`BLOCKED` output without changing product requirements.
- ARCHITECTURE: Updated with the packaged audit reference boundary, inspection/repair flow, finding schema, and verdict gate.
- README: Updated implementation status, explicit invocation, audit behavior, repair boundary, and result format.
- AGENTS: Unchanged; repository-wide source, scope, documentation-sync, and completion rules already cover this work.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the permanent documents, current Task/Test contract, Task 0002 template/evidence contract, and explicit Task 0006 dependency.
- Inspected the audit stub and metadata, the dependent Task workflow/reference and scenario-test pattern, foundation/package validation, and stable commands.
- Confirmed missing Git metadata, created and hash-verified the pre-change snapshot, reviewed its empty baseline diff, and passed all baseline stable and contract checks.
- Defined the zero-dependency Skill/reference split, finding categories and severity, read-only inspection boundary, safe repair loop, follow-on recommendation boundary, and evidence-based terminal gate.
- Replaced the audit stub with an explicit-only one-Task workflow, synchronized generic UI metadata, and added the packaged independent baseline, finding, evidence, scope/docs, repair, rerun, report, and verdict reference.
- Added deterministic negative, repair, and clean scenario fixtures plus acceptance-specific contract tests for missing mappings, unsupported PASS evidence, stale SPEC/Architecture, scope drift, safe repair, no-churn PASS, metadata, and output gates.
- Updated foundation validation and the exact tarball allowlist, retaining zero dependencies, the no-lifecycle-script rule, and existing `kyw-grilling`, `kyw-init`, and `kyw-task` behavior.
- Synchronized README and Architecture, confirmed SPEC and AGENTS were unaffected in meaning, and advanced the one README status regression assertion from Task 0006 to Task 0007.
- Passed the corrected focused suite, all stable commands, official Skill and Task validation, Node.js 22, built-in coverage, and direct tarball inspection after final metadata review.
- Reviewed every changed file and the full snapshot diff. The independent hash/file-set audit found exactly 8 expected modifications, 3 expected additions, no deletion, 84 byte-identical pre-existing files, and no out-of-scope or whitespace change.

## Remaining

- None.

## Resume Point

Task 0007 is complete. Begin later work only from its own numbered Task; do not add CLI installation or distribution behavior here.

## Blockers

- None known.
