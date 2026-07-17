# TEST 0001 — Plugin Foundation

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 and AC-02 manifest and package identity are valid and synchronized | Parse and validate package/plugin JSON and run the official plugin validator | Static | PASS | Foundation test passed; `validate_plugin.py` exited 0. |
| T-02 | AC-03 and AC-09 CLI help aliases and no-argument mode succeed without writes or cwd changes | Run CLI variants in a clean temporary directory and compare filesystem/cwd | Integration | PASS | Node tests passed for no arguments, `-h`, and `--help`; before/after trees matched. |
| T-03 | AC-03 and AC-09 CLI version aliases equal package version | Run `-V` and `--version` and compare exact output | Integration | PASS | Both tests returned exactly `0.1.0` plus newline with exit 0. |
| T-04 | AC-09 unknown CLI arguments report usage and exit 1 without writes or cwd changes | Run unknown single and multiple arguments in clean temporary directories | Integration | PASS | Both error branches exited 1, included usage, preserved cwd, and wrote no files. |
| T-05 | AC-04 and AC-10 stable automated checks are runnable | Run test, lint, format, and package check commands | Static / integration | PASS | `npm run check` exited 0: 9 tests, 9 JS modules, 48 text files, 19 packed files. |
| T-06 | AC-05 npm tarball contains the allowlisted runtime, plugin, Skills, templates, README, and legal files only | Run `npm pack --dry-run --json` and independent entry inspection | Packaging | PASS | Exact 19-entry allowlist passed; size 6073 bytes, no docs/test/scripts/AGENTS/prompt bundle. |
| T-07 | AC-06 licensing is resolved before publish | Validate SPDX fields, project MIT text, copyright, private flag, and retained upstream notices | Audit | PASS | MIT fields/text and `private: true` passed; both upstream legal SHA-256 hashes matched the snapshot. |
| T-08 | AC-07 all four Skills are valid explicit-only non-mutating stubs | Validate each Skill and metadata file; inspect stub stop/mutation contract | Static | PASS | Four `quick_validate.py` runs passed; foundation checks confirmed explicit-only policy and zero-mutation stop text. |
| T-09 | AC-08 no dependencies, lifecycle scripts, MCP, app, or hook components are enabled | Inspect package and plugin keys plus packed entries | Static | PASS | Foundation validation passed with all prohibited keys absent. |
| T-10 | AC-10 supported-runtime behavior works on Node.js 22 | Run help, version, and the automated test suite through `node@22` | Integration | PASS | Node `v22.23.1` printed help/`0.1.0`; all 9 tests passed. |
| T-11 | AC-10 source files meet syntax, canonical JSON, UTF-8/LF, final-newline, and trailing-whitespace rules | Run lint and format checks | Static | PASS | Lint checked 9 modules; format checked 48 files, both exit 0. |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered in the final diff.

## Regression Coverage

- [x] Documentation files remain present and unchanged unless affected.
- [x] Minimal CLI does not modify current directory.
- [x] No MCP, app, or hook components are accidentally enabled.
- [x] No npm lifecycle script or dependency is introduced.
- [x] Skill stubs do not perform their future workflows or write files.

## Commands

Commands actually run:

- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run check`
- `npm pack --dry-run --json`
- `python C:/Users/DevHamster/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .`
- `python C:/Users/DevHamster/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/<skill-name>` for each of the four Skills
- `npx --yes node@22 --version`
- `npx --yes node@22 ./bin/kyw-dev.mjs --help`
- `npx --yes node@22 ./bin/kyw-dev.mjs --version`
- `npx --yes node@22 --test`
- `git -c core.autocrlf=false diff --no-index --no-renames <snapshot> <workspace>`
- PowerShell SHA-256/file-set comparison of the snapshot and workspace

## Results

All commands below ran from `C:\1kyw\5.personal\kyw_dev` unless an explicit validator working directory is named.

- Environment probes: `node --version` → `v24.11.0`; `npm --version` → `11.18.0`; `python --version` → `3.13.9`; `python3 --version` was unavailable as expected on this Windows host.
- Initial `npm run pack:check` attempt: exit 1 because direct Windows `npm.cmd` spawning returned no usable stderr. The checker was changed to use `npm_execpath` with a Windows-only fallback; the same command subsequently exited 0. This was the only failed required-check attempt and it was fully resolved before completion.
- `npm run check`: exit 0. `npm test` passed 9/9; lint passed 9 JavaScript modules plus foundation metadata; format passed 48 UTF-8/LF files; pack check passed the exact 19-file allowlist at 6073 bytes.
- `npm pack --dry-run --json`: exit 0; `kyw-dev@0.1.0`, 19 entries, 6073 packed bytes and 16840 unpacked bytes. Required plugin, runtime, four Skill stubs, two template placeholders, README, project MIT license, third-party notice, and upstream MIT text were present; development files were absent.
- Plugin creator directory: `python scripts/validate_plugin.py C:\1kyw\5.personal\kyw_dev` → exit 0, `Plugin validation passed`.
- Skill creator directory: four `python scripts/quick_validate.py C:\1kyw\5.personal\kyw_dev\skills\<name>` invocations → exit 0, `Skill is valid!` for `kyw-grilling`, `kyw-init`, `kyw-task`, and `kyw-audit`.
- Node 22 compatibility: `npx --yes node@22 --version` printed `v22.23.1`; help and version commands exited 0 with the expected output; `npx --yes node@22 --test` passed 9/9.
- Snapshot audit: raw `git diff --no-index` returned the expected difference status and was reviewed in full. The independent hash/file-set command exited 0 with verdict `PASS`: 26 before files, 48 after files, 6 expected existing files changed, 22 expected files added, 20 existing files byte-identical, and no deletions.

## Unverified

- None. All required checks ran successfully after the recorded Windows pack-check correction.

## Final Coverage Review

Before marking this Test `PASSED`:

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to at least one test row.
- [x] Add tests for newly introduced branches, error paths, or compatibility behavior.
- [x] Confirm recorded PASS claims are reproducible.
- [x] Confirm required regressions ran.

Coverage mapping is complete: AC-01/02 → T-01; AC-03 → T-02/03; AC-04 → T-05; AC-05 → T-06; AC-06 → T-07; AC-07 → T-08; AC-08 → T-09; AC-09 → T-02/03/04; AC-10 → T-05/10/11. The final diff introduced no behavior outside these rows.
