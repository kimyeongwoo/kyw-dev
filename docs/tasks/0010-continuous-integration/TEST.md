# TEST 0010 — Continuous Integration

## Status

RUNNING

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 workflow triggers, permissions, concurrency, and timeouts are safe | Inspect workflow and a hosted run | CI/Audit | TODO | |
| T-02 | AC-02 supported OS and Node matrix is complete | Inspect expanded jobs and run results | CI | TODO | |
| T-03 | AC-03 stable checks run in every required lane without secrets | Review logs and required-check conclusions | CI | TODO | |
| T-04 | AC-04 real packed tarball is produced and inspected without publishing | Run packaging job and inspect artifact/log | Packaging | TODO | |
| T-05 | AC-05 path-sensitive tests execute on Windows and macOS | Review platform logs for the relevant test files | CI | TODO | |
| T-06 | AC-06 scripts, runtime support, and exit behavior agree | Compare package metadata, doctor behavior, workflow, and docs | Integration/Audit | PASS | `package.json`, foundation validation, CI contract tests, README, Spec, and Architecture agree on `>=22`, the 22/24 LTS matrix, bounded 26 lane, stable commands, and `release:ci`; local checks exited 0. |
| T-07 | AC-07 hosted run is green for the implementation commit | Record workflow URL, commit SHA, and conclusions | Hosted E2E | TODO | |
| T-08 | AC-08 only affected durable docs changed | Review final diff and documentation impact | Audit | TODO | |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered in the final diff.

## Regression Coverage

- [ ] `npm test` passes locally on the minimum supported Node line available.
- [x] `npm run lint` passes.
- [x] `npm run format:check` passes.
- [x] `npm run pack:check` passes.
- [x] `npm run check` passes.
- [x] No workflow step contains an npm publish command, registry token, Codex API key, or broad write permission.
- [x] Generated tarballs and temporary workflow artifacts are not committed.

## Commands

Planned commands; replace or extend them with the repository's verified commands.

- `node --version`
- `npm --version`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run check`
- `npm run release:ci`
- `npm pack --dry-run --json`
- `gh workflow view <workflow>` when GitHub CLI access is available
- `gh run view <run-id> --log` when GitHub CLI access is available

## Results

Record exact commands, versions, exit status, hosted run URL, commit SHA, and concise outcome. Do not mark a row PASS without evidence.

- Pre-change `git status --short --branch`: exit 0; `main` matched `origin/main`, with only untracked Task directories 0010 through 0016. `git diff`, `git diff --cached`, and both stats exited 0 with no tracked/staged change.
- Repository context: `gh auth status`, `gh repo view`, Actions-permission API inspection, and `gh pr status` all exited 0. The authenticated owner has `repo`/`workflow` scopes, Actions is enabled, and no PR exists for the starting branch.
- Official support review: Node.js reports 22/24 as LTS and 26 as Current; GitHub documents the three requested `*-latest` runner labels, `contents: read`, same-workflow/ref cancellation, and current checkout/setup-node v6 usage. This is design evidence, not hosted execution evidence.
- Test inventory review found one Codex-availability skip after packed direct lifecycles and two privilege-dependent symlink skips. The CLI, actual tarball, user/project installation, POSIX/Windows dialect, and temporary native filesystem paths are otherwise exercised without OS-wide skips.
- `node --test test/continuous-integration.test.mjs test/distribution.test.mjs test/foundation.test.mjs`: exit 0 on local Windows; 6/6 passed. It proved the trigger/permission/concurrency contract, exact seven-lane matrix, four commands per stable lane, credential-free packed/aggregate jobs, package-script agreement, actual tarball direct/marketplace lifecycles, and foundation metadata.
- `node ./scripts/packed-release-check.mjs`: exit 0 on local Windows; created and extracted the real 29-file, 46,486-byte npm tarball, verified SHA-256 `a0f3ffabccf2b880e7bc77c93c16bec930015c6886b419ef3918d889baf0a16f`, checked packed-only boundaries, smoke-tested version/help, and removed its temporary directory.
- `npm run lint`: exit 0; syntax and foundation metadata passed across 25 JavaScript modules.
- `npm run format:check`: exit 0; 112 UTF-8/LF text files passed, including the preserved future Task files.
- `git diff --check`: exit 0 with only Git's existing `core.autocrlf` LF-to-CRLF working-copy warnings and no whitespace error.
- First post-documentation `npm test`: exit 1; 77/78 passed. `kyw-task execution and resume documentation matches the packaged workflow` expected the stale README phrase `Tasks 0001 through 0009`, while the synchronized README correctly states `0010`. This failed evidence is retained and requires a focused rerun after the assertion update.
- `node --test test/kyw-task.test.mjs`: exit 0 after updating the stale README assertion; 11/11 passed.
- `npm run pack:check`: exit 0; the exact 29-file package allowlist passed at 46,984 packed bytes.
- Repeated `npm test`: exit 0; 78/78 passed with no skip, including native isolated CLI/install paths and both actual-tarball test cases.
- `npm run check`: exit 0 on Node.js v24.11.0/npm 11.18.0; 78/78 tests plus lint over 25 modules, format over 112 text files, and the exact 29-file/46,984-byte pack check passed.
- `npm run release:ci`: exit 0; repeated the stable suite and then created, extracted, inspected, and smoke-tested the real 29-file/46,984-byte archive with SHA-256 `3e2343ab5a845c12ed7b4d7c5d6f8c38d31dccd856d35412e1f6cc6ed3579cb3`. No publication command ran and no tarball remained in the repository.
- `node --version` and `npm --version`: exit 0; `v24.11.0` and `11.18.0`.
- `npm pack --dry-run --json`: exit 0; 29 files, 46,984 packed bytes, 169,875 unpacked bytes, shasum `3e8cb5a4756471e4ddf431076e8d280227c99586`, and no development/CI file in the package.
- Pre-commit scoped review: `git diff --cached --name-status`, `--stat`, and `--check` exited 0 for exactly 12 Task-owned paths (607 insertions, 11 deletions), with no unstaged change. Task 0011 through 0016 remained untracked and excluded; no root tarball existed.
- Terminal pre-commit `node --test test/continuous-integration.test.mjs`: exit 0; 3/3 passed. Repeated `npm run format:check`: exit 0 over 112 text files.
- `python <gh-fix-ci>/scripts/inspect_pr_checks.py --repo "." --pr "2" --json`: exit 1 because the bundled helper decoded `gh`'s Unicode job logs as Windows CP949 and then received no log text. Manual `gh run view ... --log-failed` inspection was used as the documented fallback.
- Initial hosted pull-request run https://github.com/kimyeongwoo/kyw-dev/actions/runs/29552814664 targets implementation SHA `084a6e4cbfe79e18dc2d413304d15aad4b96b87f`. Ubuntu 22, Ubuntu 24, Ubuntu 26 compatibility, and packed Ubuntu 24 jobs passed. macOS 22/24 each failed five `skill-installation` cases: two expected `/var/...` while the implementation returned physical `/private/var/...`; the doctor permission stub consequently returned exit 5 instead of 6; and two direct adapter calls exited 0 with empty stdout because the lexical entrypoint URL did not equal the physical module URL. Codex marketplace coverage skipped only after its required packed direct lifecycles passed.
- The same initial run completed with both Windows LTS jobs and the aggregate gate failed. Windows checkout produced CRLF working-tree text, so all three CI workflow assertions saw `\r\n`, foundation validation rejected the LF shebang/front matter/YAML, installation returned `INVALID_PACKAGE`, and Task/Test parser assertions received empty results. This is addressed by a repository-wide `.gitattributes` LF materialization contract plus a focused static assertion.
- Post-fix `node --test test/continuous-integration.test.mjs test/skill-installation.test.mjs test/distribution.test.mjs test/foundation.test.mjs test/template-contracts.test.mjs`: exit 0; 28/28 affected tests passed locally.
- `git check-attr text eol -- <representative workflow/runtime/Skill/YAML/template paths>`: exit 0; every inspected text path reported `text: auto` and `eol: lf`.
- Post-fix `npm run check`: exit 0; 78/78 tests, lint over 25 modules, format over 112 files, and the exact 29-file/47,068-byte pack check passed.
- Post-fix `npm run release:ci`: exit 0; it repeated the stable suite and verified the real 29-file/47,068-byte archive with SHA-256 `569986c23fa08c7a56892f5c3df2bd2b671fd6b68becb21a3a89c5e936fb5892`.

## Unverified

- Hosted CI is unverified until the workflow commit is pushed and the real run is inspected.
- `npm run release:check` was not run because it adds the approval-only `npm publish --dry-run`; Task 0010's required hosted/local gate is the credential-free `release:ci` path and the user prohibited publication actions.

## Final Coverage Review

Before marking this Test `PASSED`:

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to at least one test row.
- [ ] Confirm all required OS/Node combinations actually ran.
- [ ] Confirm skipped or optional jobs are not hiding required support failures.
- [ ] Confirm no secret-bearing/model-backed job is required for normal pull requests.
- [ ] Confirm the packed artifact corresponds to the audited commit.
