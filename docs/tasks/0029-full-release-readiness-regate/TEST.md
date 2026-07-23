# TEST 0029 — Full Release Readiness Re-Gate

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially §15 AC-01 through AC-12.
- Architecture and release entry point: `../../ARCHITECTURE.md` and `../../../README.md`.
- Historical evidence: immutable Tasks 0017 and 0020.
- Remediation/acceptance evidence: immutable Tasks 0021, 0023, 0024, 0025, 0026, 0027, and 0028.
- Candidate: immutable Commit A `5fa5a3d2637073580a64a01a7396f4d533d0d5b6`, formed from `origin/main@a8c3cef301de6cc4e1d4883ac55f9a9a6fe245dc`.
- Verification method: exact detached source plus one real unpublished tarball, isolated state, current-session direct behavioral checks, deterministic tests, fresh exact-SHA hosted CI, and fresh read-only external checks.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 exact package contents | Inspect one real candidate tarball, exact allowlist, entry safety, metadata, source-byte identity, exclusions, legal/runtime surfaces. | Package | PASS | 29 safe files; every packed byte equals candidate source; all positive and negative boundaries passed. |
| T-02 | AC-02 user-scope installation | Install exact tarball under isolated user state; inspect Skills, hashes, ownership, unrelated preservation. | Acceptance | PASS | Exactly four user Skills and 19 owned files; all hashes/metadata passed; unrelated sentinel unchanged. |
| T-03 | AC-03 project-scope installation | Install exact tarball into a fresh Git repository; prove project-only discovery and preservation. | Acceptance | PASS | Exactly four project Skills, no user leak, and existing tracked/untracked bytes unchanged. |
| T-04 | AC-04 Task 0027 initialization/adoption carry-forward | Compare every relevant candidate packed behavior byte to Task 0027. | Identity / acceptance | PASS | 28 non-README packed paths are exact; Task 0027 S-01/S-02 direct evidence carries forward. |
| T-05 | AC-05 Task 0027 Task creation/resume carry-forward | Compare every relevant candidate packed behavior byte to Task 0027. | Identity / acceptance | PASS | Exact inputs retain S-03/S-04 next-number/pair/resume direct evidence. |
| T-06 | AC-06 shared-understanding boundary carry-forward | Compare every relevant candidate packed behavior byte to Task 0027. | Identity / acceptance | PASS | Exact packed Task/Grilling/template/helper inputs retain implementation-refusal evidence. |
| T-07 | AC-07 untested-branch detection carry-forward | Compare every relevant candidate packed behavior byte to Task 0027. | Identity / acceptance | PASS | Exact audit/Task inputs retain S-05 truthful BLOCKED detection evidence. |
| T-08 | AC-08 ordinary small-change routing carry-forward | Compare every relevant candidate packed behavior byte to Task 0027. | Identity / acceptance | PASS | Exact Task/Skill/helper inputs retain S-06 no-Task and permanent-doc review evidence. |
| T-09 | AC-09 bare and fix audit contracts | Directly follow exact packed audit bytes in two fresh fixtures and run deterministic classifier/smoke checks. | Direct behavioral | PASS | Bare found both defects, made no mutation, and BLOCKED; fix announced/limited/reran/preserved and passed; classifier 27/27. |
| T-10 | AC-10 lifecycle and filesystem safety | Run real packed lifecycle plus focused/full ownership, recovery, containment, type, link/junction, evaluator, and isolation tests. | Acceptance / regression | PASS | Canonical lifecycle attempt 1 was CLEAN; focused 102/102 and full 222/222 passed; unrelated state preserved. |
| T-11 | AC-11 packaged Skill loading | Run current CLI local `./` marketplace add/discover/install/list/remove using exact candidate bytes. | Acceptance | PASS | Every step exited 0; exactly four byte-matching Skills; isolated Codex state removed and normal state unchanged. |
| T-12 | AC-12 licensing | Hash and inspect candidate MIT/third-party bytes. | Package / manual | PASS | `PREPUBLICATION_CANDIDATE_PASS`; all three required legal files present and exact. Published-tarball check remains pending by design. |
| T-13 | AC-13 stable source verification | Run test, lint, format, pack, aggregate, release CI, and diff check at detached candidate SHA. | Regression | PASS | 222 tests, 54 modules, 220 files, 29/62189 package, aggregate/release/diff all exit 0. |
| T-14 | AC-13 fresh exact-candidate hosted CI | Dispatch one new attempt-1 run and inspect all nine jobs/logs. | Hosted integration | PASS | Run 29969220919 is exact candidate, attempt 1, workflow_dispatch, completed 9/9 SUCCESS with real native fixtures. |
| T-15 | AC-14 registry and official requirements | Perform fresh read-only registry checks; fetch/hash current official manual; run validators/current CLI lifecycle. | External read-only | PASS | Name is exact-match available; official structure/policy/lifecycle requirements conform; whoami is expected unauthenticated prerequisite. |
| T-16 | AC-14 protected-state integrity | Compare protected before/after data, repository/worktree state, auth, environment, runner cleanup, and residue. | Safety | PASS | No kyw-dev protected mutation or credential residue; only attributed current-Codex metadata/shim rotation; runner attempt was exactly restored. |
| T-17 | AC-15 terminal two-commit and package identity | Diff the prepared evidence tree and repack it before Commit B; confirm exact package identity and historical bytes. | Identity | PASS | Only this pair differs from candidate; docs/tasks is unpacked; repack matches every candidate identity field. Post-commit SHA is recorded after this immutable snapshot. |
| T-18 | Current grilling contract | Run frozen deterministic checks and directly verify six bounded packed-contract fixtures without a new cohort. | Direct behavioral / regression | PASS | Unit 15/15, Skill 7/7, and all six CURRENT_SESSION_DIRECT fixtures passed with no mutation. |
| T-19 | AC-16 PR/merge delivery objects | Require post-Commit-B exact-head PR CI, merge parents, and exact-merge main CI; stop on mismatch. | Hosted delivery | N/A | Temporally unavailable inside Commit B by the mandated order, not waived; exact results are mandatory after this snapshot and belong in the terminal report. |
| T-20 | Evaluator/release-isolation guarantees | Run focused/full cleanup, process, platform, isolation-attribution, and native-fixture checks. | Safety regression | PASS | Focused suite 102/102, full suite 222/222, exact hosted Windows/POSIX lanes, and CLEAN isolation attribution passed. |

## Regression Coverage

- Stable package, Skill, CLI, installation, Task-artifact, audit, grilling, evaluator, isolation, CI, legal, and foundation coverage.
- Real native POSIX symbolic links and Windows junctions: seven link/junction diagnostics per hosted stable lane, with `lstat(...).isSymbolicLink()` asserted by the helper. No capability path was skipped.
- The one POSIX suite skip was only `Windows evaluator cleanup awaits bounded release of an owned exclusive handle`, guarded by `process.platform !== "win32"`; both Windows lanes executed it. POSIX lanes reported 224 tests, 223 pass, one explicit platform skip, zero fail. Windows lanes reported 222/222, zero skip.
- Task 0028 guarantees retained: terminal waits for owned removal, bounded Node retry, first cause wins, owned child/descendant only, listener restoration, no incomplete publication, auth-source immutability, safe diagnostics, and no ambient scan.
- Task 0027 S-01 through S-06 was not rerun merely for formality; its exact behavior inputs were proven identical.
- No Task 0028 20/20 or 10/10 stress repetition ran because evaluator bytes were unchanged and current stable/hosted evidence passed.

## Commands

All candidate commands ran from detached `C:/1kyw/5.personal/kyw_dev-task0029-5fa5a3d2/candidate-worktree`, with writable HOME/Codex/npm/temp state below the single Task root unless a command was a read-only GitHub query.

| Command / operation | Exit / result | Recorded output |
|---|---:|---|
| `npm test` | 0 | 222 tests, 222 pass, 0 fail/cancel/skip/todo. |
| `npm run lint` | 0 | 54 JavaScript modules plus package/plugin metadata validated. |
| `npm run format:check` | 0 | 220 UTF-8/LF files. |
| `npm run pack:check` | 0 | 29 files, 62,189 packed bytes. |
| `npm run check` | 0 | Repeated stable test/lint/format/package gates successfully. |
| `npm run release:ci` | 0 | Repeated stable gates and canonical packed lifecycle; candidate SHA-256 exact. |
| `git diff --check` | 0 | No whitespace error; detached worktree clean. |
| `node --test test/audit-smoke.test.mjs` | 0 | 27/27 deterministic audit classifier/smoke tests. |
| `npm run eval:grilling:unit` | 0 | 15/15 frozen deterministic evaluator checks. |
| `node --test test/kyw-grilling.test.mjs` | 0 | 7/7 packed Grilling contract tests. |
| Six focused safety test files via `node --test` | 0 | 102/102 covering audit, install, evaluator cleanup/platform/process, and release isolation. |
| Four current `quick_validate.py` Skill validations with `PYTHONUTF8=1` | 0 | All four Skills valid. |
| Current plugin validator | 0 | Manifest, metadata, paths, packaged Skill structure valid. |
| Exact tarball user/project install verifier | 0 | AC-02 and AC-03 passed. |
| `node scripts/release-gate-isolation.mjs` through `release:ci` | 0 | Attempt 1 `CLEAN`, diff count 0, approved root removed, protected hashes exact. |
| `gh workflow run ci.yml --ref task/0029-full-release-readiness-regate` | accepted once | Created run `29969220919`; no rerun. |
| Official manual helper with Task-owned `--cache-dir` | 0 | Fresh manual/hash/outline verified at 2026-07-23T00:48:51.252Z. |
| `npm ping --registry=https://registry.npmjs.org/` | 0 | PONG. |
| `npm view kyw-dev --json --registry=…` | 1 expected | E404 exact package absent. |
| `npm search kyw-dev --json --registry=…` | 0 | 20 search results, zero exact `kyw-dev`. |
| `npm whoami --registry=…` | 1 expected | ENEEDAUTH; no login/config mutation attempted. |

Forbidden commands were not executed: `npm run release:check`, any `npm publish` including dry-run, `npm deprecate`, `npm unpublish`, registry login/reservation, tag/tag push, GitHub Release, public plugin submission, existing-run rerun, candidate amend/rebase/force/squash, reset/clean/stash, or branch deletion.

Auxiliary command history retained rather than hidden:

- An initially unquoted PowerShell `HEAD^{tree}` expression was parsed incorrectly; the exact read-only query was rerun quoted.
- The Task adapter's initial title slug and the first pair validation exposed the path/status/mapping issues recorded in TASK.md; both were corrected before Commit A.
- One post-worktree identity helper called `.Trim()` on the empty detached-branch output and failed; direct exact HEAD/tree/status queries immediately proved the successfully created worktree.
- One Windows `rg` glob form was invalid; explicit file paths were used instead.
- `node bin/kyw-dev.mjs task --help` and the later `node bin/kyw-dev.mjs task validate 0029` were unsupported attempts to address the packaged Task adapter through the product CLI; both returned usage exit 1. The canonical `skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory …` command then passed.
- The first custom package verifier used an incompatible sort comparator and rejected ordering only; after correcting the Task-owned verifier, the unchanged tarball passed exact set/byte checks.
- The default Windows Python encoding failed while printing the Grilling validator result after Audit had passed; rerunning all four validators with `PYTHONUTF8=1` passed.
- One PowerShell hashing pipeline had a syntax error and was rerun with corrected syntax.
- The official manual helper does not implement `--help`; that read-only probe exited 1, then the documented `--cache-dir --status-json` call succeeded.
- Parallel read-only collections whose promises were rejected by the unsupported helper/CLI probes were collected again as individual commands; no candidate gate was rerun.
- One marketplace fixture display used an incorrect path and a following `rg` discovery returned no match; `Get-ChildItem -Force` found the gitignored fixture path, whose exact metadata was then read. The actual marketplace lifecycle had already passed independently.
- The expected registry E404 and ENEEDAUTH exits are negative-state evidence, not retries or product failures.
- No gate command, hosted workflow, stochastic evaluation, or model result was selectively retried.

## Results

Candidate gate result: PASS. Every authorized candidate-level release-readiness row passed, the only N/A row is the necessarily future post-Commit-B GitHub delivery sequence, and the terminal pre-publication verdict is `READY_FOR_APPROVAL`.

- No release defect, repair, lowered threshold, hidden failure, required-job skip, capability skip, or unsupported PASS occurred.
- The evidence tree changes only this pair; permanent truth remains synchronized by Commit A's outcome-safe README.
- A publication workflow is not authorized. The candidate remains unpublished and untagged.

## Candidate Identity

- Repository: `C:/1kyw/5.personal/kyw_dev`.
- Source branch: `task/0029-full-release-readiness-regate`.
- Base/parent: `a8c3cef301de6cc4e1d4883ac55f9a9a6fe245dc`.
- Candidate SHA: `5fa5a3d2637073580a64a01a7396f4d533d0d5b6`.
- Candidate tree: `34b7820913e3b604665000ec0e46fa6dc09a0a4b`.
- Subject: `chore: form 0.1.0 release candidate`.
- Commit A paths: `README.md`, this `TASK.md`, and this `TEST.md` only.
- Remote branch resolved exactly to the candidate after a normal push and was `+0/-0`.
- Detached worktree: `C:/1kyw/5.personal/kyw_dev-task0029-5fa5a3d2/candidate-worktree`; exact SHA/tree, detached, empty porcelain before and after verification.
- Toolchain: Git `2.51.2.windows.1`; Node `v24.11.0`; npm `11.18.0`; Codex CLI `0.145.0`.

## Package Identity

- Filename/name/version: `kyw-dev-0.1.0.tgz`, `kyw-dev@0.1.0`.
- Source: candidate SHA/tree above; Node `v24.11.0`, npm `11.18.0`, isolated userconfig/cache.
- npm SHA-1 shasum: `7cf6c730a42b783a5e9baf1d0ed401f2ebed6093`.
- SHA-256: `864331238224a78719b90e68dc7a1e59e282b24bf823c96d8bdf9066277379f8`.
- Integrity: `sha512-yKvPejrf9cK+q/VrlYygoIYQVm4Pv+C+oqthJ8+1qtFblPt1zfPhLzAArrmQa9AFkrBhOZ+V4iW+JUfNpmu+cQ==`.
- Packed/unpacked/file count: 62,189 bytes / 238,105 bytes / 29.
- Every tar entry is below `package/`, contains no absolute/traversal path, and extracted as a regular file. Exact sorted inventory after removing `package/`:

  1. `.codex-plugin/plugin.json`
  2. `LICENSE`
  3. `README.md`
  4. `THIRD_PARTY_NOTICES.md`
  5. `bin/kyw-dev.mjs`
  6. `licenses/mattpocock-skills-MIT.txt`
  7. `package.json`
  8. `skills/kyw-audit/SKILL.md`
  9. `skills/kyw-audit/agents/openai.yaml`
  10. `skills/kyw-audit/references/audit.md`
  11. `skills/kyw-grilling/SKILL.md`
  12. `skills/kyw-grilling/agents/openai.yaml`
  13. `skills/kyw-init/SKILL.md`
  14. `skills/kyw-init/agents/openai.yaml`
  15. `skills/kyw-task/SKILL.md`
  16. `skills/kyw-task/agents/openai.yaml`
  17. `skills/kyw-task/references/execution.md`
  18. `skills/kyw-task/scripts/task-artifacts.mjs`
  19. `src/cli/run.mjs`
  20. `src/core/package-info.mjs`
  21. `src/core/skill-installation.mjs`
  22. `src/core/task-artifacts.mjs`
  23. `src/core/template-contracts.mjs`
  24. `templates/project/AGENTS.md`
  25. `templates/project/ARCHITECTURE.md`
  26. `templates/project/README.md`
  27. `templates/project/SPEC.md`
  28. `templates/task/TASK.md`
  29. `templates/task/TEST.md`

- Every packed file is byte-identical to the candidate. Package/plugin metadata, CLI help/version, four Skills/metadata, current validators, templates, helpers, and legal bytes passed. There are no dependencies or lifecycle scripts.
- Excluded: absolute machine paths, credentials/config, Task docs, tests, evaluator source/results, local marketplace fixture, and generated evidence archives.
- Canonical Skill SHA-256 values: Audit `af1d016d7cbab0b8b69f2e4394fd23d32ffae110acb87a2bf69c7f282edb7f60`; Grilling `99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf`; Init `a926a71916182ef4f345e3aad6c807fb42f6d907316ef506863f66af45a4bf76`; Task `03a11f7bf89bd663073ddd5507bf64b6d2f439c5eb5cab0aca161b595511d5ec`.
- Legal SHA-256 values: project MIT `61eabc24f9ac5fee27136e575c5cac5fd9187183d7c842a7f68315cf3f537985`; notices `82731241a4acc133a36c93acf73e513269709903f1164075295b1d8896378f6a`; upstream MIT `0e7ac40c76f101a24783bfe109229e8249e3ff10d46f2156b11dbd3e876d0c46`.
- The prepared evidence tree repacks to the same filename, list, sizes, integrity, npm shasum, and SHA-256 because `docs/tasks/` is excluded. Exact Commit B and later merge identities are confirmed outside this self-referential snapshot.

## Hosted Evidence

Fresh candidate manual run:

- Run `29969220919`; event `workflow_dispatch`; attempt 1; head `5fa5a3d2637073580a64a01a7396f4d533d0d5b6`; created `2026-07-23T00:29:34Z`; completed `2026-07-23T00:31:09Z`; conclusion SUCCESS.
- `89087333364` Stable / Ubuntu / Node 22.x — SUCCESS, Node `v22.23.1`.
- `89087333331` Stable / macOS / Node 22.x — SUCCESS, Node `v22.23.1`.
- `89087333299` Stable / Windows / Node 22.x — SUCCESS, Node `v22.23.1`.
- `89087333305` Stable / Ubuntu / Node 24.x — SUCCESS, Node `v24.18.0`.
- `89087333321` Stable / macOS / Node 24.x — SUCCESS, Node `v24.18.0`.
- `89087333309` Stable / Windows / Node 24.x — SUCCESS, Node `v24.18.0`.
- `89087333355` Stable / Ubuntu / Node 26.x compatibility — SUCCESS, Node `v26.5.0`.
- `89087333200` Packed release / Ubuntu / Node 24.x — SUCCESS, Node `v24.18.0`; log shows `npm run release:ci` and the exact candidate package identity.
- `89087561543` Required / credential-free CI — SUCCESS; stable/packed inputs both `success`; token permissions only Contents read and Metadata read.
- Every checkout showed the exact candidate and `persist-credentials: false`. No required job was missing, cancelled, skipped, or rerun.
- Each POSIX lane emitted seven real native-link diagnostics; each Windows lane emitted seven real junction diagnostics. The only POSIX test skip was the Windows-only handle test and is not a capability skip.

Exact-head PR and exact-merge main run IDs do not exist at Commit B time. They are mandatory post-snapshot evidence and are not pre-claimed here.

## Behavioral Evidence

SPEC §15 matrix:

| SPEC criterion | Result | Evidence |
|---|---|---|
| AC-01 package files | PASS | Exact real 29-file tarball, safe entries, candidate byte equality, positive allowlist and negative exclusions. |
| AC-02 user installation | PASS | Exactly four user Skills, exact hashes/ownership, unrelated sentinel preserved. |
| AC-03 project installation | PASS | Fresh Git fixture, project-only four Skills, no user leak, existing tracked/untracked files preserved. |
| AC-04 init/adopt | PASS | Task 0027 S-01/S-02 `CURRENT_SESSION_DIRECT` carried by exact behavior-byte identity. |
| AC-05 Task create/resume | PASS | Task 0027 S-03/S-04 exact inputs and direct evidence carried forward. |
| AC-06 implementation refusal | PASS | Task 0027 shared-understanding boundary exact inputs/evidence carried forward. |
| AC-07 untested branch | PASS | Task 0027 S-05 exact inputs retained truthful unsupported-branch BLOCKED detection. |
| AC-08 ordinary change | PASS | Task 0027 S-06 exact inputs retained no-Task/permanent-document impact review behavior. |
| AC-09 audit detection | PASS | Bare/fix `CURRENT_SESSION_DIRECT` plus deterministic 27/27 classifier/smoke checks. |
| AC-10 lifecycle safety | PASS | Exact packed lifecycle, focused 102/102, full 222/222, hosted native-fixture coverage. |
| AC-11 packaged loading | PASS | Current Codex CLI local `./` marketplace lifecycle, exactly four byte-matching Skills. |
| AC-12 licensing | PREPUBLICATION_CANDIDATE_PASS | Required bytes exist in unpublished candidate; `PUBLISHED_TARBALL_CHECK_PENDING`. |

Task 0027 carry-forward proof:

- Original source `46ea3ddd4a23bbdaccd75c43335bd70d2c25c465`; tarball SHA-256 `ff484e1d17562a2d2da9f574fe7fb8688a9dd0e9de31eae574870df396022f79`; npm shasum `7b90ff21a766b70abadcc9845b6a3b4333dfa0d1`; 62,049/237,768 bytes; 29 files.
- Candidate-vs-original packed diff contains README only. The other 28 packed paths total 207,447 bytes and produce identical combined SHA-256 `bd5cb0a113cf2285f4a01321388bbf7faf41130b51f69e7c58cb1c67e5714307` on both sources.
- That inventory includes all four Skills and direct references, all templates and Task helper/runtime code, plugin/package metadata relevant to invocation, and every runtime/helper used by S-01 through S-06.
- Git attribution shows intervening Task 0028 changes were README/permanent/task docs plus development-only evaluator/audit/grilling-test tooling; no scenario behavior input changed. README is not read or invoked by S-01 through S-06.
- Reused verdict: `SPEC_AC04_AC08_DIRECTLY_VERIFIED`, evidence label `CURRENT_SESSION_DIRECT`, with its same-session limitation retained.

Audit direct evidence:

- Bare fixture packed hashes: Audit Skill `af1d016d…`, direct reference `49daa9…`. It contained a stale README statement and a TEST claim of 2/2 while the actual deterministic suite was 1/1.
- The active model read the exact packed Skill/reference and relevant fixture truth, reran 1/1, reported stable F-01 documentation ERROR and F-02 unsupported-evidence ERROR, retained limitations, attempted zero mutation, wrote zero bytes, preserved tree hash `efcfd4fd…`, and returned `BLOCKED`.
- Separate fix fixture established the same findings before mutation, then announced a visible two-path plan naming README/TEST and the rerun check. Only those expected paths changed; unrelated tracked `notes.txt` and untracked `scratch.txt`/generated bytes retained hashes `276288…`, `a7ab30…`, and `a54e17…`; rerun passed 1/1 and final verdict was evidence-based PASS.
- Label for both is exactly `CURRENT_SESSION_DIRECT`; neither is independent/fresh-session/cohort/hosted evidence.

Grilling direct evidence:

- Exact packed Skill hash `99e633b0…` was read and applied to six bounded fixtures: one question/one recommendation; highest-impact unresolved dependency; pure terminal cancellation; bundled stop-plus-edit pressure; irreversible terminal cancellation; and multi-outcome narrowing.
- Each contract passed directly with no filesystem mutation. Pure/irreversible cancellation terminated without another question; bundled edit pressure declined mutation and offered one next decision; multi-outcome work selected one primary outcome and deferred the rest.
- Evidence is exactly `CURRENT_SESSION_DIRECT`; no new 32-run/128-turn cohort was launched.

## Historical Evidence Reuse

- Task 0017 remains immutable `BLOCKED/BLOCKED`; its failed cohort is preserved and is not replaced by a universal cohort requirement.
- Task 0020 remains immutable `BLOCKED/BLOCKED` for old candidate `54b9…` and was not resumed.
- Task 0020 nevertheless records supplementary complete comparison `20260718090729697-comparison-e718e167`: 32 runs, 128 turns, 288 artifacts, report SHA-256 `ddead7bf5dd9c1df61c5c1f8f75c9ee60216d0f1fb7ad56849e2a5cc3697f04e`, manifest root `414bf70609268039b221af8e3e0c8bdf7ad673258ee24050f9dd3165ad754cea`, and passing historical gates. Its raw comparison directory is unavailable in current source/worktrees, so no artifact was falsely reported as revalidated or newly executed.
- Current frozen config/rubric/upstream/Skill hashes remain `0608857d5d4333083d298014f14671db927b4abcdbfc785806a1596bcbc07bde`, `4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323`, `44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`, and `99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf`.
- Task 0028 evaluator bytes are unchanged at the candidate. Current stable/focused/exact-hosted evidence passed, so its 20/20 and 10/10 stress loops were not repeated.

## Registry and Official Requirements

- Fresh check window: `2026-07-23T00:50:28Z` through `00:50:31Z`, isolated npm userconfig/cache, intended public registry `https://registry.npmjs.org/`.
- Ping PONG; exact view E404; exact-name search count 0. Preferred unscoped `kyw-dev` remained available at the check time.
- `npm whoami` returned ENEEDAUTH. No login or config change occurred. Explicit identity/credential approval is a later publication prerequisite.
- Official source: current `https://developers.openai.com/codex/codex-manual.md`, fetched by the required helper; checked `2026-07-23T00:48:51.252Z`; remote header and fetched content SHA-256 both `33592e759ffa202ee098034d17f0299f7d084e4e433b130c65b9a853861da5ec`; 16,683 lines.
- Current requirements verified: required `.codex-plugin/plugin.json`; plugin-root `skills: "./skills/"`; per-Skill `SKILL.md` with `name` and `description`; `agents/openai.yaml` UI metadata and explicit `allow_implicit_invocation: false`; repository/user discovery locations; `./`-prefixed in-root local marketplace source plus required policy/category; and npm acquisition without lifecycle scripts.
- Candidate manifest uses stable kebab-case `kyw-dev`, version `0.1.0`, `./skills/`, current interface metadata; all four Skills include required front matter plus display/description/default-prompt/invocation policy.
- The current local marketplace fixture uses `./plugins/kyw-dev`, AVAILABLE/ON_INSTALL, and Productivity. Current CLI `0.145.0` completed its entire lifecycle. No current official requirement change conflicts with the candidate.

## Protected-State Evidence

- Approved Task root: `C:/1kyw/5.personal/kyw_dev-task0029-5fa5a3d2`; all temporary writable verification state was below it.
- Before snapshot: `2026-07-23T00:31:16.677Z`. Candidate-gate after snapshot: `2026-07-23T00:50:57.026Z`. Final prepared-evidence snapshot: `2026-07-23T00:59:39.475Z`.
- Default npm userconfig snapshot SHA-256 stayed `f1cc16645bce996ea86ec4af6f4602de58b7b87e35c275e6fe51a043c396cff7`; normal `.agents` stayed `7e30b31495f066683f96b33fe89420b57f3b11b5e26699aa3585119769e393c6`.
- Configured Codex auth stayed size 4,284 and SHA-256 `b3c8c5f11348391c8c66406ea58b7acf11f868c04406b6b1fe5779e656d1c81b`. Normal npm userconfig/cache identities and all 58 environment name/length/value-hash records stayed exact.
- Normal Codex aggregate ended at SHA-256 `8f998d473456d1227aea406efd1836e3f556e1f1855eb7185e23f4592a993d22`; its diff was limited to active-Codex `tmp/arg0` shim rotation and plugin-cache metadata touches. File content SHA-256 values were identical, marker lists were empty, and no kyw-dev/auth/config content changed.
- The canonical isolated release attempt compared its own protected state immediately before/after and returned `CLEAN`, diff count 0, with normal Codex sentinel SHA-256 `8641208d…` unchanged. Its approved child root was removed and release parent is empty.
- Source stayed exactly at the candidate before this two-file evidence edit; detached worktree stayed exact and clean. No ambient process scan was used; owned child PIDs were bounded by the runner and its terminal cleanup completed.
- No credential discovery, secret content recording, normal HOME/`.agents`/Codex/npm write, credential residue, evaluator process, or unexplained kyw-dev mutation occurred.

## Unverified

- Literal licensing and identity in the actually published npm tarball: `PUBLISHED_TARBALL_CHECK_PENDING`, because publication is expressly unauthorized.
- npm publishing identity/credentials: unauthenticated and requires later explicit approval.
- At this immutable Commit B snapshot only, exact-head PR CI, review/thread/mergeability state, merge SHA/parents, exact-merge main CI, and merge-package identity do not yet exist. They remain mandatory post-B stop gates and must appear in the terminal report; no PASS is claimed here.
- Task 0020's raw passing comparison directory was unavailable, so only its immutable recorded hashes/results are supplementary.
- No npm publication/dry-run, public download, tag, GitHub Release, public plugin submission, or fresh model cohort was performed.

## Final Coverage Review

- [x] Compared the candidate/prepared-evidence diff against every Task acceptance criterion and matrix row.
- [x] Resolved every candidate gate row to reproducible PASS and the temporally future delivery row to explicit reasoned N/A without waiving its terminal stop condition.
- [x] Recorded commands, exits, counts, auxiliary failures/retries, expected negative exits, hosted platform skip, and every unverified item.
- [x] Evaluated SPEC §15 AC-01 through AC-12 separately without using an aggregate PASS as substitute evidence.
- [x] Proved Task 0027 carry-forward by exact relevant-byte identity and retained its `CURRENT_SESSION_DIRECT` limitation.
- [x] Preserved Task 0017/0020 history without rewriting or manufacturing a cohort/artifact PASS.
- [x] Confirmed no product repair, threshold change, candidate rewrite, Task 0030, publication action, tag, release, registry mutation, or existing-run rerun occurred.
- [x] Confirmed permanent-document impact: only Commit A's outcome-safe README changed; SPEC, Architecture, and AGENTS are unaffected.
- [x] Confirmed terminal candidate result `READY_FOR_APPROVAL`, with full published-MVP acceptance and all publication authority explicitly pending.
