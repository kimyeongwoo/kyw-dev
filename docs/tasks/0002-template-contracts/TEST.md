# TEST 0002 — Template Contracts and Deterministic Helpers

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 all six canonical templates contain the Spec sections and validate | Run template contract tests against packaged files and missing-section mutations | Static | PASS | `template contracts cover every canonical project, Task, and Test document` passed; pack check included all six files. |
| T-02 | AC-02 allocation starts at 0001 and advances past sequential, gapped, and cancelled IDs | Run unit tables and empty/normal/gapped fixtures, including the 9999 boundary | Unit / integration | PASS | Allocation fixture/table test passed for 0001, sequential, gap, cancellation, conflict, and exhaustion cases. |
| T-03 | AC-03 creation publishes both files together and cleans staged content on injected failure or final-path conflict | Run temporary-repository integration tests with a failure hook | Integration | PASS | Success, injected-between-writes failure, and final-directory conflict integration tests passed without partial artifacts. |
| T-04 | AC-04 slug and path handling contain ASCII, Unicode, traversal, absolute-looking, overlong, and symlink-root inputs | Run slug/path unit tables and filesystem safety tests | Unit / integration | PASS | Slug/path tables and the real Windows junction-root rejection test passed with no skip. |
| T-05 | AC-05 validation reports missing sections, invalid Task/Test/row statuses, unmapped or unknown criteria, unsupported PASS evidence, and inconsistent DONE/PASSED state | Run focused unit cases and the malformed fixture | Unit / integration | PASS | Negative contract tests reported every planned category; empty final review, ID mismatch, and punctuated placeholder evidence were also covered. |
| T-06 | AC-06 path construction is stable with both `path.posix` and `path.win32` | Run platform-dialect unit cases independent of the host OS | Unit | PASS | POSIX and Windows dialect assertions passed on the Windows host and under Node.js 22. |
| T-07 | AC-02 and AC-05 malformed and duplicate-ID repositories are diagnosed without silently allocating through conflicts | Run malformed/conflicting fixture tests | Integration | PASS | Malformed-name and duplicate-0001 fixture tests returned `INVALID_TASK_LAYOUT` with actionable paths. |
| T-08 | AC-01 and AC-06 templates and runtime helpers are included in the exact npm tarball while foundation regressions remain green | Run stable test, lint, format, and pack checks | Packaging / regression | PASS | Four stable commands passed; exact npm dry run contained 25 allowlisted files and no development fixtures/tests. |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered in the final diff.

## Regression Coverage

- [x] Existing valid Task folders still validate after helper changes.
- [x] Cancelled Task numbers are not reused.
- [x] Template files are included in the npm package.
- [x] Existing CLI, plugin metadata, Skill stubs, legal hashes, zero-dependency policy, and lifecycle-script prohibition remain intact.

## Commands

Commands actually run:

- `npm test -- --test-name-pattern="template|task|slug|number|validator"`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `node --test --experimental-test-coverage`
- `npx --yes node@22 --test`
- `npm pack --dry-run --json`
- `node --input-type=module -e "import('./src/core/task-artifacts.mjs').then(...validateTaskDirectory('./docs/tasks/0002-template-contracts')...)"`
- `git -c core.autocrlf=false diff --no-index --no-renames --name-status <snapshot> <workspace>`
- `git -c core.autocrlf=false diff --no-index --no-renames --stat <snapshot> <workspace>`
- `git -c core.autocrlf=false diff --no-index --check <snapshot> <workspace>`
- Per-file `git diff --no-index` review of every modified existing file plus full reads of added core, template, fixture, and test files.
- PowerShell SHA-256 and file-set comparison of the snapshot and workspace.

## Results

Record exact commands, exit status, and concise outcome. Do not mark a row PASS without evidence.

- Pre-change `npm run check`: exit 0; 9/9 tests passed, lint checked 9 modules, format checked 48 files, and the exact 19-file package allowlist passed. This establishes the baseline only and is not final Task evidence.
- Initial `npm test -- --test-name-pattern="template|task|slug|number|validator"`: exit 1; 13/14 passed. The malformed-fixture assertion exposed that `Not run yet.` with terminal punctuation was treated as Results evidence. The predicate was corrected; this failed run is retained as discovery evidence pending rerun.
- Corrected `npm test -- --test-name-pattern="template|task|slug|number|validator"`: exit 0; 14/14 passed with no skips, including the Windows symlink-root case.
- Preliminary post-implementation stable commands: all exited 0. `npm test` passed 21/21; lint checked 13 JavaScript modules; format checked 60 UTF-8/LF text files; pack check matched all 25 expected files at 15,775 bytes. These commands will be rerun after documentation synchronization for final evidence.
- Post-documentation focused and stable checks: all exited 0. The focused suite passed 14/14; `npm test` passed 21/21; lint checked 13 JavaScript modules; format checked 60 UTF-8/LF text files; pack check matched 25 files at 16,139 bytes.
- `npx --yes node@22 --test`: exit 0; 21/21 passed on Node.js 22 with no skips.
- `node --test --experimental-test-coverage`: exit 0; 21/21 passed. Runtime coverage was 81.05% lines / 77.78% branches for `task-artifacts.mjs` and 90.55% lines / 75.53% branches for `template-contracts.mjs`; all functions in both modules were exercised.
- `npm pack --dry-run --json`: exit 0; `kyw-dev@0.1.0`, 25 entries, 16,139 packed bytes and 50,076 unpacked bytes. Runtime core modules and all six templates were present; development scripts, tests, fixtures, Task docs, and AGENTS were absent.
- Snapshot diff review: name/status, stat, per-file content, and `--check` were reviewed with no whitespace errors or out-of-scope paths. The first hash-audit command compared Windows backslashes to normalized expected slashes and failed diagnostically; after correcting only that command's path normalization, the audit passed with 48 before files, 66 after files, 5 expected changes, 20 expected additions, 2 expected placeholder removals, and 41 byte-identical existing files.
- Post-terminal `npm run check`: exit 0. Tests passed 21/21 with no skips, lint checked 13 modules, format checked 60 files, and pack check matched 25 files at 16,139 bytes. Direct validation of `docs/tasks/0002-template-contracts` also exited 0 with `Task 0002 contract validation passed`.

## Unverified

- Git working-tree status and Git-native history/staging diff are unavailable because the supplied workspace contains no `.git` metadata. The verified pre-change snapshot was used for no-index content and hash/file-set review, but Git staging state cannot be recovered; this is the only residual verification limitation.

## Final Coverage Review

Before marking this Test `PASSED`:

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to at least one test row.
- [x] Add tests for newly introduced branches, error paths, or compatibility behavior.
- [x] Confirm recorded PASS claims are reproducible.
- [x] Confirm required regressions ran.

Coverage mapping is complete: AC-01 → T-01/T-08; AC-02 → T-02/T-07; AC-03 → T-03; AC-04 → T-04; AC-05 → T-05/T-07; AC-06 → T-06/T-08. The final diff adds no behavior outside these rows.
