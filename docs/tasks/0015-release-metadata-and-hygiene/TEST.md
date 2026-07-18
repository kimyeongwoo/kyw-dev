# TEST 0015 — Release Metadata and Repository Hygiene

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 package metadata is complete and real | Parse package JSON and verify public repository fields | Metadata/Audit | PASS | Foundation/distribution tests assert `kyw-dev` `0.1.0`, `Kim Yeongwoo`, the public GitHub repository/issues, MIT, `>=22`, bin, allowlist, and public registry configuration without guessed contact/maintainer fields. |
| T-02 | AC-02 plugin manifest is current and valid | Run official/local validator and inspect supported fields | Plugin/Audit | PASS | Current official validator exited 0; foundation checks lock the supported top-level and interface fields used by the manifest, and all four Skill validators exited 0. |
| T-03 | AC-03 version/name/identity are consistent | Repository-wide metadata consistency test | Unit/Audit | PASS | `npm run release:ci` passed metadata drift tests; CLI version/help report `kyw-dev 0.1.0`, matching package, plugin, runtime package info, install metadata, README, Spec, and Architecture. |
| T-04 | AC-04 Node support agrees everywhere | Compare engines, code, doctor, CI, and docs; run boundary tests | Compatibility | PASS | Engine/runtime/doctor/docs use `>=22`; boundary tests accept 22/24/26 and reject 21/invalid with runtime exit code 2; CI contract tests retain 22/24 cross-platform and bounded 26 Linux lanes. |
| T-05 | AC-05 legal identity was explicitly confirmed | Record decision and inspect all legal metadata | Legal/Audit | PASS | User explicitly confirmed `Kim Yeongwoo`; package/plugin/interface, LICENSE, README, Spec, Architecture, and validation constants agree, with no guessed email or source-maintained `maintainers`. |
| T-06 | AC-06 upstream attribution survives packing | Inspect notices and extracted tarball | Legal/Packaging | PASS | Extracted tarball contains `THIRD_PARTY_NOTICES.md` and `licenses/mattpocock-skills-MIT.txt`; exact source hashes and Matt Pocock notice/full MIT assertions passed. |
| T-07 | AC-07 public package is complete and minimal | Inspect dry-run JSON and real tarball tree/content | Packaging/E2E | PASS | Dry-run and real pack report exactly 29 expected files/59,225 bytes; extracted-content, secret/local-path scans, direct install, and isolated marketplace lifecycle all passed. |
| T-08 | AC-08 bootstrap artifacts are intentionally handled | Inspect repository and tarball for bundle artifacts | Hygiene/Audit | PASS | Obsolete tracked `DOCUMENT_BUNDLE.txt` was deleted; remaining name references are exclusion contract/evidence only, and no bundle path exists in the tarball. |
| T-09 | AC-09 README claims match behavior/state | Execute documented commands and compare current state | Documentation/E2E | PASS | Version/help/doctor and repository/release-state checks match README. No CI badge was added because no hosted `main` run covers the final bytes; npm/public-directory availability is not claimed. |
| T-10 | AC-10 nothing was published or released | Inspect commands, registry/release state, and git refs | Release safety | PASS | Final npm lookup remains E404, Git tag list and GitHub release list are empty, and no publish/tag/release/submission command ran. `release:check` was deliberately not invoked. |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered in the final diff.

## Regression Coverage

- [x] CLI `--version` matches package/plugin version.
- [x] `doctor` accepts/rejects the same Node policy documented publicly.
- [x] All four Skills and required runtime support are present in the tarball.
- [x] Eval sources/results, test fixtures, local marketplaces, generated tarballs, auth files, and absolute local paths are absent from the tarball.
- [x] Project and third-party licenses are readable in the extracted package.
- [x] Existing direct-install and plugin-install E2E still pass from the tarball.
- [x] No publish/tag/release command executed.

## Commands

- `node ./bin/kyw-dev.mjs --version`
- `node ./bin/kyw-dev.mjs --help`
- `node ./bin/kyw-dev.mjs doctor`
- `npm run check`
- `npm run release:ci`
- `npm pack --dry-run --json`
- Official plugin validator against the repository root
- Official Skill quick validator against each of the four packaged Skills with UTF-8 mode enabled
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0015-release-metadata-and-hygiene`
- `git diff --check`
- Repository-wide `rg` searches for product/version/runtime/author/repository/package-boundary/bundle/local-path/credential/tarball occurrences
- Read-only `npm view kyw-dev ... --json`, `git tag --list`, `gh release list`, and hosted `main` workflow inspection

`npm run release:check` was intentionally not executed because its final command is `npm publish --dry-run --json`; the user's prohibition applies to invoking `npm publish`, including dry-run. `npm run release:ci` exercises the same checks through real pack/extract/inspect without any publication command.

## Results

Record exact metadata values, user-confirmed legal identity, commands, exit status, tarball filename/checksum, included/excluded file evidence, and concise outcomes.

- Pre-change official plugin validator: exit 0, `Plugin validation passed`.
- Pre-change official Skill validators: initial Windows-default-encoding attempt failed to decode UTF-8 and is retained as a tooling invocation failure; rerunning each of the four validators with `PYTHONUTF8=1` exited 0 with `Skill is valid!`.
- Read-only metadata preflight: Node `v24.11.0`, npm `11.18.0`, Codex CLI `0.144.5`; public GitHub repository `kimyeongwoo/kyw-dev`; npm registry lookup returned expected E404 with no package record.
- Initial `npm run check`: exit 1 after 119/120 tests passed. The sole failure was a stale README assertion in `test/kyw-task.test.mjs` that required `Tasks 0001 through 0011`; the Task 0015 documentation update truthfully advanced the status through 0015. Lint/format/pack stages did not run after the test short-circuit. The assertion was updated to the current release-candidate boundary before rerunning the complete gate.
- Final metadata: package/plugin/product/CLI `kyw-dev` `0.1.0`; user-confirmed author and copyright holder `Kim Yeongwoo`; repository `https://github.com/kimyeongwoo/kyw-dev`; issues `https://github.com/kimyeongwoo/kyw-dev/issues`; MIT; Node `>=22`; no guessed email, author URL, or `maintainers` field.
- Final official validators: plugin validator exit 0, `Plugin validation passed`; `kyw-grilling`, `kyw-init`, `kyw-task`, and `kyw-audit` quick validators each exit 0, `Skill is valid!` under `PYTHONUTF8=1`.
- CLI verification: `--version` printed exactly `0.1.0`; help headed `kyw-dev 0.1.0`; doctor exited 0 and reported Node `24.11.0`, npm `11.18.0`, Codex CLI `0.144.5`, no findings, and `healthy`.
- Final `npm run release:ci`: exit 0; 120/120 tests passed with no skips, lint passed 33 JavaScript modules/foundation metadata, format passed 152 UTF-8/LF files, pack check passed, and the actual packed-release check passed.
- Final dry-run and real tarball: `kyw-dev-0.1.0.tgz`, exactly 29 files, packed size 59,225 bytes, unpacked size 229,405 bytes, npm SHA-1 `575051e49328bd4923c4411bcb29b69b80586495`, actual archive SHA-256 `bc1886d298e86eda28b0b8deafe2bbded3ac5b9fb2ce6a232ee2ce8da57e6885`.
- Extracted package included package/plugin/CLI/runtime/templates, all four Skills and their required references/adapters, README, project LICENSE, `THIRD_PARTY_NOTICES.md`, and the upstream license. Matt notice hash: `82731243ded9e599fe515e38aece6be97fff05c3e7cb4b13d319fbb3d631ca25`; upstream MIT hash: `0e7ac423bf2c6e223b7c5b156f8cf72da49d748e56a1641402c31f22ad07dbb5`.
- Extracted package excluded `.agents`, `.github`, `.npmrc`, `auth.json`, `DOCUMENT_BUNDLE.txt`, `docs`, `eval`, `scripts`, `test`, raw/generated eval output, local marketplace/test fixtures, generated archives, credential-shaped content, private keys, credential assignments, file dependencies, the checkout root, and Windows/UNC/POSIX local absolute paths. No `.tgz` remained after cleanup.
- Repository-wide post-change scan found no release-surface placeholder, credential-like filename/content, or generated tarball. Remaining absolute paths are historical Task evidence or synthetic platform/path-security tests outside the package allowlist; `kyw_dev` remains only in historical Task 0001 evidence and Task 0015's discovery record.
- Release safety: the final read-only registry lookup returned E404; Git tag and GitHub release lists were empty. No hosted `main` workflow covers the final Task 0015 bytes, so no CI badge was added. No npm publish, tag, GitHub release, public plugin submission, or Task 0016 action occurred.

## Unverified

- npm name availability is time-sensitive and must be rechecked again in Task 0016.
- The final uncommitted Task 0015 bytes have no hosted CI run; only the complete local Windows release gate and the workflow/configuration contract were verified here. This is why a CI badge is intentionally absent.
- Actual registry publication, install from the npm registry, GitHub tag/release creation, and public plugin-directory submission were intentionally not verified because they were explicitly forbidden and outside scope.

## Final Coverage Review

Before marking this Test `PASSED`:

- [x] Confirm every public metadata value is truthful and non-placeholder.
- [x] Confirm all version sources agree.
- [x] Confirm Node boundary behavior matches the published policy.
- [x] Confirm real tarball contents, not only the source tree.
- [x] Confirm both project and third-party license obligations.
- [x] Confirm public docs do not claim npm/plugin-directory availability prematurely.
