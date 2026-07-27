# TEST 0052 — Windows Release Evidence Harness Hardening

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially evidence honesty, cross-platform compatibility, package boundaries, and separate publication authority.
- Architecture constraints: `../../ARCHITECTURE.md`, especially development-only validation, path identity, protected state, release boundaries, package exclusion, and external delivery.
- Repository rules: `../../../AGENTS.md`.
- Related evidence: blocked Task 0051 establishes the root-role and npm-provenance failure requirements but is not a hard dependency or PASS source.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose an exact model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose the configured effort)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose a concrete CLI, IDE, or desktop identifier)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active surface version is not exposed)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Root equality allowed | Unit-test a safe canonical external root whose lexical/canonical identities equal the validated root. | Unit/path | PASS | Focused test `evidence root equality is valid while output equality is rejected`. |
| T-02 | AC-02 — Output containment | Test normal descendant PASS plus root equality, sibling, and prefix-confusion rejection with distinct output errors. | Unit/path/security | PASS | Focused root/output tests pass with distinct `EVIDENCE_ROOT_UNSAFE` and `EVIDENCE_OUTPUT_UNSAFE` branches. |
| T-03 | AC-03 — Windows normalization | Test case, separator, drive extended prefix, and UNC extended prefix normalization without relying on a real 8.3 alias. | Unit/Windows identity | PASS | Platform-independent long drive path and drive/UNC ordinary/extended identity assertions pass. |
| T-04 | AC-03 — Long/short alias identity | Inject a narrow canonical identity mapping where simulated short and long paths resolve to the same object and require PASS. | Unit/Windows identity | PASS | Narrow simulated `PROGRA~1`/long-name canonical mapping passes without host 8.3 support. |
| T-05 | AC-04 — Repository and link/reparse escape | Reject repository overlap, real symlink/junction escape where supported, and injected reparse/ancestor identity escape before child execution. | Integration/security | PASS | Repository overlap, injected identity escape, and native Windows junction escape tests pass. |
| T-06 | AC-05 — Matching npm provenance | Prove requested launcher, launcher hash/version, child npm fields, effective nested npm, Node, and PATH precedence agree. | Integration/provenance | PASS | Windows launcher, selected CLI, child `npm_execpath`, user agent, first resolvable PATH launcher, and effective npm all resolve to npm `11.18.0`; Node is `v24.11.0`. |
| T-07 | AC-05 — Mismatch gates child | Inject outer/effective mismatch and assert `NPM_PROVENANCE_MISMATCH` with gated child count zero. | Unit/provenance/failure | PASS | Focused injected effective-version mismatch raises `NPM_PROVENANCE_MISMATCH` before any release child. |
| T-08 | AC-06 — Exit 7 durability | Run the harmless self-test child, require separated stdout/stderr, exit 7, signal, timestamps, and monotonic runtime durably written. | Integration/evidence | PASS | Focused and exact external self-test preserve exit `7`, separated streams, timestamps, runtime, and hashes. |
| T-09 | AC-06 — Parser/post-processing failure | Force summary parsing failure after child return and prove raw streams, exit record, provenance, runtime, and hashes remain. | Integration/failure | PASS | Deliberate parser failure raises `POST_PROCESSING_FAILED` only after raw stream/exit/provenance-hash files and atomic failure summary exist. |
| T-10 | AC-07 — Atomic bounded redaction | Observe summary only after atomic rename, reject temporary exposure, and prove secret-shaped output is redacted and bounded. | Integration/security | PASS | Temporary/target observation, npm/auth/private-key patterns, stream redaction, per-string/document bounds, and zero retained external credential match pass. |
| T-11 | AC-08 — Duplicate/no-retry contract | Attempt duplicate execution and simulated failure; assert one child maximum, duplicate rejection, and zero retry path. | Unit/integration | PASS | Duplicate guard raises `DUPLICATE_INVOCATION`; constants and command plan prove maximum 1 and retry 0. |
| T-12 | AC-08 — Cleanup ownership | Prove cleanup removes only the exact owned root after preservation proof and refuses parent, repository, foreign-entry, or identity-changed targets. | Integration/filesystem | PASS | Focused cleanup rejects parent/repository targets, wrong token, changed identity, and a foreign addition, then removes only the exact sealed direct child while preserving its evidence root. |
| T-13 | AC-08, AC-11 — Exact dry plan | Run `--dry-validate`; assert exact `npm run release:check`, maximum 1, no standalone dry run/publish/retry/lifecycle surprise, and all evidence paths under the external root. | Integration/contract | PASS | Exact external dry validation returned `DRY_VALIDATION_PASS`; plan fields are command 1, retry 0, standalone dry run 0, actual publish 0, isolation/model 0, and an injected pre-script surprise fails. |
| T-14 | AC-08 — Protected configuration | Compare repository/package/userconfig/protected-state observations around self-test/dry validation and prove no credential or normal config mutation. | Integration/security | PASS | Focused byte-identity test passes; both exact external modes reported protected state `CLEAN` and external credential scan count 0. |
| T-15 | AC-08 — Supported CLI modes | Execute `--self-test` and `--dry-validate` from a caller-owned external root and assert no release/registry/isolation/model/public child. | E2E/harmless | PASS | Initial and final exact external invocations of both allowed modes returned `SELF_TEST_PASS` and `DRY_VALIDATION_PASS`; no forbidden command ran. |
| T-16 | AC-09 — Stable matrix reachability | Prove the focused test is default-discovered by `npm test`/`npm run check` and existing CI runs that suite on Windows, macOS, and Linux; keep actual hosted outcomes in the external ledger. | Stable/static/external | PASS | Final `npm run check` discovered the test and passed 305/305 on Windows; CI contract tests prove unfiltered `npm test` reachability on Windows/macOS/Linux. Exact hosted outcomes remain external delivery evidence. |
| T-17 | AC-10 — Development-only/package boundary | Inspect package allowlist and packed-path selection; assert script/test exclusion, zero production dependencies, unchanged version, and no publish/tag/Release/public command. | Package/audit | PASS | `pack:check` passed 39 files/93,783 bytes; only README is package-selected, version/dependencies/allowlist are unchanged, and forbidden publication state/actions remain absent. |
| T-18 | AC-11 — Task 0051 reuse documentation | Verify the exact path, supported commands, external-root ownership, evidence files, no-retry rule, and separately approved release boundary are documented consistently. | Documentation/manual | PASS | README exact commands and Architecture boundary consistently document ownership, modes, evidence, no retry, package exclusion, and separate approval. |
| T-19 | AC-01–AC-11 — Final integrity and coverage | Validate every Task, scan changed text/evidence for credentials, run whitespace/lint/format/Stable checks, inspect every changed path and map final branches/errors to rows. | Integrity/audit | PASS | All 52 pairs validate; exact six-path diff, credential candidates, whitespace, Stable, docs, package boundary, Task 0051 chronology, and every AC/error branch were reviewed. |

## Regression Coverage

- Existing release, candidate, registry dry-run, and isolation commands remain unchanged and are not executed by focused or Stable verification.
- Existing package `files` allowlist continues to exclude root `scripts/`, `test/`, numbered Task artifacts, raw evidence, credentials, and machine-local paths.
- Task artifact creation/validation, CLI installation, Skills, evaluator, distribution, and release-isolation tests remain green through the Stable suite.
- Normal npm user configuration, credentials, repository source, package version, tags, Releases, publication state, and public submission state remain unchanged.
- Task 0051 stays `BLOCKED/BLOCKED` and is not automatically resumed.

## Commands

- Focused syntax/tests: `node --check ./scripts/release-evidence-harness.mjs`; `node --test ./test/release-evidence-harness.test.mjs`.
- Focused provenance diagnosis: `node --test --test-name-pattern="outer, child" ./test/release-evidence-harness.test.mjs`.
- Exact harmless self-test: `node ./scripts/release-evidence-harness.mjs --self-test --repository "C:\1kyw\5.personal\kyw_dev" --allowed-parent "C:\1kyw\5.personal" --evidence-root "C:\1kyw\5.personal\kyw-dev-task0052-evidence-20260727"`.
- Exact harmless dry validation: `node ./scripts/release-evidence-harness.mjs --dry-validate --repository "C:\1kyw\5.personal\kyw_dev" --allowed-parent "C:\1kyw\5.personal" --evidence-root "C:\1kyw\5.personal\kyw-dev-task0052-evidence-20260727"`.
- Stable check: `npm run check`.
- Canonical validation: ran `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <task-directory>` for every numbered Task.
- Explicit repository checks: `npm run format:check`; `npm run lint`; `npm run pack:check`; `git diff --check`.
- Manual/static reviews: credential scan; exact changed-path and package-boundary review; Task 0051 blocker-to-acceptance review; final diff-to-matrix review. GitHub exact-head and post-merge facts remain in their external ledger.
- Forbidden during this Task: `npm run release:check`, `npm publish --dry-run --json`, registry/auth probes, release isolation, actual publish, registry/config mutation, version/tag/Release/public submission, model-backed commands, workflow reruns, force/destructive operations, and Task 0053 creation.

## Results

- Initial combined syntax/focused run: 12/17 PASS and 5 FAIL. Two alias tests incorrectly asserted lexical short/long path equality; three npm-dependent tests exposed unsafe Windows launcher invocation. No release child ran.
- After canonical alias assertions and the first Windows launcher correction: 14/17 PASS and 3 FAIL. `cmd.exe` quoting still failed safely before a gated child.
- After `windowsVerbatimArguments`: 14/17 PASS and 3 FAIL. Launcher, selected, and effective versions were all `11.18.0`; diagnostics isolated the remaining failure to a literal first-PATH-entry assertion.
- Targeted provenance command first reproduced 0/1 with `pathPrecedenceMatches: false`, then passed 1/1 after verifying the first actually resolvable npm launcher instead of npm's injected empty package-local `.bin` entry.
- Full focused run then passed 17/17. A later summary-bound regression fixture initially passed 16/17 because one oversized string was already correctly bounded below the whole-document cap; the corrected many-field fixture exercised the document cap, and the final focused run passed 17/17 in about 4.6 seconds.
- `npm run lint`: PASS, 72 JavaScript modules and foundation metadata.
- `npm run format:check`: PASS, 296 UTF-8/LF text files.
- Exact external `--self-test`: PASS, status `SELF_TEST_PASS`, deliberate child exit `7`, protected state `CLEAN`, summary SHA-256 `70887df228aae30b9a0b7c05445b85aa887e48b2198f89c41073e0e1a469e90d`.
- Exact external `--dry-validate`: PASS, status `DRY_VALIDATION_PASS`, release command executions `0`, protected state `CLEAN`, summary SHA-256 `403b0501101665190f566d3580a669006339480a773862917e6b83b4a43c29b0`.
- Both external modes recorded requested-launcher, selected-CLI, and effective npm `11.18.0` plus Node `v24.11.0`; the retained external credential scan found 0 matching file.
- After Task/Test preservation, ownership seals covered 32 self-test and 22 dry-validation inventory entries. Exact-token cleanup removed both run roots, and the verified empty caller root was removed non-recursively; the repository and its parent/siblings were not cleanup targets.
- Final post-hardening exact external reruns: `SELF_TEST_PASS` with exit `7` and summary SHA-256 `a7dadeda36a9d7511fb45b7efe3e47b349993cff42f252399926f75ac705bb42`; `DRY_VALIDATION_PASS` with summary SHA-256 `0f71c48c033ec39d4942c74156354a555c493d5b5cb0d2533f17a2d764a59c01`. Both observed protected state `CLEAN`, npm `11.18.0` across all three provenance roles, Node `v24.11.0`, and 0 credential-bearing external file; self-test raw hashes include the separate provenance record.
- Final preservation seals covered 32 self-test and 22 dry-validation entries. Exact-token cleanup removed both final run roots, then an exact direct-child/empty/repository-different proof preceded non-recursive caller-root removal.
- External-root setup first attempted unsupported `New-Item -LiteralPath` and failed without creating a path; the corrected exact `New-Item -Path` created the previously absent empty caller-owned root.
- Windows-focused final command passed 5/5 path, alias, repository/junction escape, and npm provenance tests.
- Final `npm run check`: PASS — 305/305 tests; lint 72 JavaScript modules plus foundation metadata; format 296 UTF-8/LF files; package selection 39 files/93,783 compressed bytes.
- Canonical all-Task validation: PASS for 52 pairs, from 0001 through 0052. `git diff --check` also passed.
- Exact changed-path review: PASS for six intended paths only. Package-boundary review found README as the only selected path (+1,935 source bytes; current compressed package +600 bytes versus Task 0050's 93,183-byte result); version `0.1.0`, dependency absence, and allowlist stayed unchanged.
- Credential scan reviewed one candidate path containing only deliberate synthetic auth/private-key redaction fixtures; no credential or raw secret output is retained.
- Task 0051 review confirmed unchanged `BLOCKED/BLOCKED`, no Task 0051 diff, and preserved wrapper/root/ambient/npm chronology. The blocker-to-acceptance mapping covers AC-01 through AC-11 without treating historical failure as PASS.
- The first terminal all-Task validation stopped on Task 0052 because `DONE` requires reasoned `None` entries in `Remaining` and `Resume Point`; replacing the reasoned `Not applicable` wording with the canonical `None — <reason>` form corrected only that contract shape before rerun.
- No `npm run release:check`, standalone npm dry run, registry/auth probe, release isolation, publish, registry/config mutation, version/tag/Release/public submission, model-backed command, CI rerun, force/destructive repository operation, or Task 0053 creation ran.

## Unverified

- Not applicable — repository behavior and evidence are verified; mutable PR/head/main CI and merge facts belong only to the external GitHub delivery ledger.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
