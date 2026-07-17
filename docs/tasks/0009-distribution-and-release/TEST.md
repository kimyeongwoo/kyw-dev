# TEST 0009 — Distribution and Release

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 tarball is complete and minimal | Inspect packed tarball manifest | Packaging | PASS | `npm pack --dry-run --json` and pack check matched exactly 29 allowlisted files, 46,467 packed bytes, and no test fixture. |
| T-02 | AC-02 plugin source loads without lifecycle scripts | Install from packed source/marketplace and invoke Skill | E2E | PASS | The actual archive installed through `kyw-dev-local` in an isolated `CODEX_HOME`; discovery found all four cached Skills and add/remove completed with no lifecycle script. |
| T-03 | AC-03 direct install lifecycle passes | Run user/project install-update-doctor-uninstall | E2E | PASS | The extracted tarball completed install, update, doctor, and uninstall at isolated user and nested project scopes. |
| T-04 | AC-04 core Skills work in fresh sessions | Run documented manual E2E transcripts | Manual/E2E | PASS | Fresh sessions invoked `$kyw-init`, exact `$kyw-task 0001`, and exact `$kyw-audit 0001`; init planned safely, Task verified completion, and audit reproduced clean `PASS` plus later expected finding `BLOCKED` behavior without mutation. |
| T-05 | AC-05 ordinary prompt does not create Task and syncs docs | Run fixture small-change scenario | E2E | PASS | The small API prompt updated implementation/test and all three affected permanent docs, passed 5/5 plus lint, and retained exactly one Task directory. |
| T-06 | AC-06 legal files are complete | Inspect package and metadata | Audit | PASS | Exact archive inspection found MIT `LICENSE`, `THIRD_PARTY_NOTICES.md`, and the preserved upstream MIT notice/hash. |
| T-07 | AC-07 README commands are reproducible | Execute all documented commands where applicable | Audit | PASS | Checkout CLI, stable checks, focused distribution E2E, Node 22, pack, and release dry-run commands all exited 0; post-publication commands remain explicitly conditional. |
| T-08 | AC-08 release/rollback checklist exists | Review release evidence | Audit | PASS | Task records preparation/approval gates, exact safe versus approval-only commands, deprecation-first correction, exceptional unpublish, and direct-install recovery. |
| T-09 | AC-09 no publication without approval | Verify no publish command was executed | Audit | PASS | Only `npm publish --dry-run --json` ran; no registry mutation, public-directory submission, `npm whoami`, or non-dry-run publish was attempted. |
| T-10 | AC-01, AC-02, AC-06, and AC-09 release metadata is public-ready but contains no lifecycle install/publish action or leaked local data | Validate package/plugin/marketplace metadata and scan the real archive | Static / packaging | PASS | Focused release test passed: public `publishConfig`, no forbidden lifecycle scripts, implemented plugin copy, canonical marketplace policy, exact 29-file archive, legal files, and no source path or secret-shaped token. |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered in the final diff.

## Regression Coverage

- [x] All previous automated tests pass, and runtime lifecycle smoke runs from packed contents.
- [x] Fresh install works without source checkout assumptions.
- [x] No secret or local absolute path appears in the package.

## Commands

Commands executed for acceptance, regression, release, and terminal verification:

- `node --test test/distribution.test.mjs test/foundation.test.mjs`
- `npm test -- --test-name-pattern="release|tarball|marketplace|package|README"`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run release:check`
- `npx --yes node@22 --test`
- `node --test --experimental-test-coverage`
- `npm pack --dry-run --json`
- `python <plugin-creator>/scripts/validate_plugin.py .`
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0009-distribution-and-release`
- Snapshot-based no-index name/status, stat, content, whitespace, and independent file/hash review.

## Results

Record exact commands, exit status, and concise outcome. Do not mark a row PASS without evidence.

- Pre-change Git commands: `git status --short`, `git diff --stat`, and `git diff --cached --stat` could not inspect repository state because the workspace has no `.git` metadata. This limitation is retained rather than reported as a pass.
- Verified pre-change snapshot: 97 workspace files and 97 snapshot files, zero missing paths or SHA-256 differences; `git -c core.autocrlf=false diff --no-index --quiet <snapshot> <workspace>` exited 0.
- Pre-change `npm run check`: exit 0; 70/70 tests passed, lint checked 20 JavaScript modules plus foundation metadata, format checked 89 UTF-8/LF text files, and pack check matched 29 files at 45,911 bytes. This is baseline evidence only.
- `python .../plugin-creator/scripts/validate_plugin.py .`: exit 0; the pre-change plugin structure and manifest schema passed official local validation.
- `npm view kyw-dev name version dist-tags --json`: exit 1 with registry E404; no package record was returned. This supports but does not reserve the selected name.
- Environment probes: Node.js v24.11.0, npm 11.18.0, and `codex-cli 0.144.5`; plugin and marketplace help commands exited 0 and exposed the documented add/list/remove grammar.
- Focused `node --test test/distribution.test.mjs test/foundation.test.mjs`: exit 0; 3/3 passed. The actual tarball matched all 29 expected paths, completed user/project direct lifecycles, passed package text scanning, and completed isolated local marketplace add/discover/install/cache/remove with all four Skills present.
- Official plugin validation after release metadata changes: exit 0; plugin structure and manifest passed.
- Focused post-documentation test command: exit 0; 15/15 selected tests passed, including both actual-tarball cases, release metadata, package foundation, and README/Task regressions. `npm run format:check` also exited 0 over 91 text files at that point.
- Fresh read-only `$kyw-grilling`: exit 0; inspected implementation/tests/README, asked exactly one whitespace decision with a recommendation, changed no file, and left Git clean.
- Fresh read-only `$kyw-init`: exit 0; classified the fixture as `adopt`, preserved the existing README, reconciled intended MIT licensing with the absent license file, proposed exactly four permanent-document paths, and stopped for explicit confirmation with no change.
- Three confirmed init writes under requested child `workspace-write` were blocked before mutation because the installed CLI reported a read-only sandbox. Every retry exited 0 with an explicit blocked report, an empty diff, and no partial target.
- Bounded full-access init continuation: exit 0; exactly README, AGENTS, SPEC, and ARCHITECTURE changed, AGENTS was 1,696 bytes, fixture tests passed 2/2, lint passed, and no application/package/license/Task path changed.
- Fresh Task authoring: exit 0; exactly one atomic DRAFT Task/Test pair was created, AC-01 through AC-06 mapped to T-01 through T-07, and implementation/permanent docs remained unchanged pending confirmation.
- Fresh numeric Task resume: exit 0 after 468.9 seconds; the confirmed pair moved through READY and execution to `DONE`/`PASSED`, focused and full tests passed 4/4, lint and artifact validation passed, affected docs were synchronized, and final coverage contained exactly seven Task-owned paths.
- Fresh independent audit: exit 0; reproduced focused/full 4/4 tests, lint, manifest invariants, artifact validation, and diff hygiene; found no finding, changed no file, and returned final `PASS`.
- Fresh ordinary prompt: exit 0; added one tested exported constant, updated README/SPEC/ARCHITECTURE, passed 5/5 tests and lint, and retained exactly one existing Task directory with no new Task.
- Initial `npm run release:check`: exit 0 but not accepted as terminal evidence because npm warned that `./bin/kyw-dev.mjs` was auto-corrected and removed from its temporary publish manifest. The manifest was normalized to `bin/kyw-dev.mjs`, with path and shebang regression assertions added.
- Repeated `npm run release:check`: exit 0 with no correction warning; 75/75 tests, lint over 23 modules plus metadata, 95 UTF-8/LF files, exact 29-file pack at 46,467 bytes, and non-mutating public-registry dry-run metadata all passed.
- `npx --yes node@22 --test`: exit 0; all 75 tests passed under the minimum supported major.
- `node --test --experimental-test-coverage`: exit 0; 75/75 passed with 86.53% line, 71.91% branch, and 99.37% function coverage.
- `npm pack --dry-run --json`: exit 0; 29 entries, 46,467 packed bytes, 168,562 unpacked bytes, integrity `sha512-OjeKeQcNYxqWzR90m4k48Lfyw5hfdQDCqxU9tTfi++a0Qy77vlZzLdDSZxtcFUfPuW6nd2zQUEG2VRbhy+11Bg==`.
- Official plugin validator and four official Skill validators: exit 0; plugin structure passed and each Skill reported valid. Current Task artifact validation also exited 0.
- Exact read-only `$kyw-task 0001`: exit 0 after 143.4 seconds; loaded the installed Skill, validated the pair, passed 5/5 and lint, reported no remaining Task work, and made no change.
- Exact read-only `$kyw-audit 0001`: the first 184.2-second process timed out; `codex exec resume --last` then exited 0 after 227.6 seconds. The installed Skill made no repair and correctly returned `BLOCKED` for the deliberately post-completion ordinary-prompt change that was outside Task 0001, while the earlier audit before that change had returned `PASS`.
- Snapshot review: 97 before files versus 104 final files; exactly 7 additions, 9 modifications, 0 deletions, and 0 root `.tgz` files. The first `git diff --no-index --check` found one extra fixture EOF blank line; it was removed before terminal review.
- Terminal `npm run check` after completion-evidence edits: exit 0; 75/75 tests, lint over 23 modules plus metadata, 95 UTF-8/LF files, and the exact 29-file/46,467-byte pack passed. Terminal Task validation returned `"valid": true`.
- Final independent snapshot audit: expected and actual added/modified path sets matched exactly at 7/9 with no deletion or root tarball. `git diff --no-index --check` emitted no whitespace diagnostic and returned only the expected no-index-differences code; final stat was 16 paths, 664 insertions, and 79 deletions.

## Unverified

- Git working-tree, staging, history, and native diff state are unavailable because the supplied workspace contains no `.git` metadata. Final scope review must use the verified snapshot; Git state cannot be reconstructed.
- Public npm ownership and the name's availability at the future approval moment are not proven by today's E404 and must be rechecked before publication.
- No npm publication or public plugin-directory submission is authorized or attempted.
- Native ChatGPT desktop plugin invocation was unavailable. Codex CLI marketplace/cache discovery and read-only explicit Skill invocation passed, while full write sessions applied the installed contracts directly because the child full-access session catalog reported those Skills unavailable. Desktop/new-thread invocation remains the principal release residual risk.

## Final Coverage Review

Before marking this Test `PASSED`:

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to at least one test row.
- [x] Add tests for newly introduced branches, error paths, or compatibility behavior.
- [x] Confirm recorded PASS claims are reproducible.
- [x] Confirm required regressions ran.
