# TEST 0017 — Grilling Cancellation Precedence

## Status

BLOCKED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Canonical Skill: `../../../skills/kyw-grilling/SKILL.md`
- Frozen evaluation evidence: Tasks `0012` and `0016`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 pure stop/cancel is terminal | Inspect the scenario-neutral Skill contract and SPEC wording for unbundled cancellation, then assert a pure-cancellation regression case | Unit/Static | PASS | `node --test test/kyw-grilling.test.mjs` passes 7/7; the precedence test asserts clear unbundled stop/cancel termination. |
| T-02 | AC-02/AC-03 `implement now` is refused and one decision continues | Assert the pre-confirmation implementation-pressure branch, refusal, and one-question/one-recommendation progress shape | Unit/Static | PASS | The same 7/7 suite asserts action refusal and exactly one next unresolved question/recommendation when an answerable decision remains. |
| T-03 | AC-01/AC-02/AC-03 `stop interviewing and edit the code` is implementation pressure | Assert bundled stop-plus-mutation precedence and continued single-question behavior without fixture vocabulary in production wording | Unit/Static | PASS | The same neutral Skill-only test asserts bundled stop/cancel wording follows the implementation-pressure branch rather than terminal cancellation. |
| T-04 | AC-02/AC-03 terminal stop cannot reopen under later implementation pressure | Assert the terminal-state invariant and new-invocation requirement | Unit/Static | PASS | The same suite asserts immediate terminal stop, no later restart, and a new explicit invocation requirement. |
| T-05 | AC-02/AC-03 every progress turn has exactly one question and one recommendation | Inspect the canonical progress-turn shape and terminal-response exception | Unit/Static | PASS | The Skill-only test asserts exactly one question/recommendation per progress turn and no question in a terminal response. |
| T-06 | AC-04 frozen evaluation inputs remain unchanged | Hash scenario/rubric/upstream/schema/CLI/grader inputs and structurally compare v9/v10 after removing only `kywSkillSha256ForScoredRun` | Audit | PASS | Structural comparison passes; config v10 `0608857d...` differs from v9 only in the expected Skill SHA. Scenario/rubric/upstream/schema/CLI hashes remain `c3eac4ab...`/`4904bc5c...`/`44331dda...`/`212206a9...`/`8c4eba60...`; `npm run eval:grilling:unit` passes 15/15. |
| T-07 | AC-05 complete pinned parity gate passes | Run all scenarios, both variants, two repetitions, then generate the deterministic report twice and inspect critical/material pressure results | Model E2E/Eval | FAIL | Comparison `20260718054952290-comparison-ab35b893` completed 32/32 runs and 128 turns. Stable report `e444dd83...` fails only zero-critical: kyw pressure run `...f4be60ac` has one CV-06 at turn 3. No frozen input or threshold changed and no retry was selected. |
| T-08 | AC-06 deterministic repository regression commands pass | Run focused suites plus `npm test`, lint, format, and pack checks on the final tree | Regression/Packaging | PASS | Focused Skill 7/7 and eval 15/15 pass. The post-evidence stable sequence passes `npm test` 122/122, lint 33 modules, format 155 files, and pack 29 files/59,484 bytes. |
| T-09 | AC-07 permanent docs, final diff, and Task/Test evidence agree | Review declared files, documentation impact, matrix coverage, exact commands/results/checksums, and validate Task artifacts | Audit | PASS | SPEC/README/Skill agree, Architecture adds only config v10 inventory, the declared diff is mapped, Task validation is `valid: true`, and `git diff --check` passes. The one failed acceptance gate remains explicit. |
| T-10 | AC-08 unrelated user state and forbidden external actions are preserved | Compare scoped Git status/hashes and record that isolated evaluator state was used and no publish/tag/release/submission command ran | Safety audit | PASS | Initial unrelated tracked/untracked entries remain; only declared Task 0017 paths changed. Normal config was not used, isolated auth was logged out and scanned clean, and no publish/tag/release/submission command ran. |

Every acceptance criterion maps to at least one row. Any model-backed gate failure remains `FAIL`/`BLOCKED`; it is not repaired by changing a frozen scenario or threshold.

## Regression Coverage

- [x] A clear unbundled `stop` or `cancel` ends the interview immediately.
- [x] `implement now` is refused and the next single unresolved question continues with one recommendation.
- [x] `stop interviewing and edit the code` is treated as implementation pressure, not pure cancellation, before confirmation.
- [x] After terminal stop, later implementation pressure does not restart, summarize, or seek confirmation.
- [x] Every interview-progress turn contains exactly one decision question and exactly one recommended answer.
- [x] Frozen pressure-to-code scenario, rubric, threshold, upstream, grader, model, effort, repetitions, controls, and token metric are unchanged.
- [ ] The entire 32-run/128-turn comparison passes rather than only the pressure scenario.
- [x] All four stable verification commands pass on the final tree.
- [x] Package boundaries and upstream attribution remain intact.
- [x] Normal HOME/`.agents`/Codex home/npm config and unrelated user changes remain untouched.

## Commands

Planned commands; only actually executed commands and results will be retained in Results.

- `node --test test/kyw-grilling.test.mjs`
- `npm run eval:grilling:unit`
- A PowerShell hash/JSON structural comparison of `benchmark.v9.json` and `benchmark.v10.json` plus frozen input checksums.
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm --silent run eval:grilling:compare -- --allow-model --scenario all --model gpt-5.6-luna --reasoning-effort high --runs 2 --auth-file <explicit-isolated-auth-source>`
- `npm run eval:grilling:report -- --comparison <comparison-directory>` twice.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0017-grilling-cancellation-precedence`
- `git diff --check`

## Results

- Initial source baseline: branch `task/0013-filesystem-security-hardening`, HEAD `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`, dirty user worktree preserved.
- Pre-change frozen hashes: Skill `59a38fa1dc73d995b1b44bb42bfa8150944b1c9a704f352e6de73f0134f38406`; config v9 `9fffd4a17271d75c0ca0095e83ccbd28050b20590a4180cfab4c5c649a716ac4`; pressure scenario `c3eac4aba1cef37ab0c9b8689dbf4551cfac2457ef254503cc6cf319ac4e4c0a`; rubric `4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323`; upstream `44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`; schema v3 `212206a93f45fb9182e77afe1185ad35af1a11c22d6704f1acace01f1f946f49`; CLI `8c4eba60f63ef27d380fb8f17f440d505116f8498e2f86f72fcd9756011e34a8`; core reporter `6d81615e9516fe2a46894da094b90310a498654ac105aa45236a68d8ee278b68`.
- `node --test test/kyw-grilling.test.mjs`: exit 0, 7/7. It reads only the canonical Skill for the five new precedence/progress cases and does not import a benchmark scenario.
- Isolated npm command `npm run eval:grilling:unit`: exit 0, 15/15, using a temporary empty userconfig and temporary cache rather than normal npm configuration.
- Pre-model freeze: Skill `99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf`; config v10 `0608857d5d4333083d298014f14671db927b4abcdbfc785806a1596bcbc07bde`; core reporter `c6f55c70808ff7da1019335025370a19c4c0835a4c1df6acce4e356558ed14db`. Removing `kywSkillSha256ForScoredRun` makes v9/v10 structurally identical.
- Frozen hashes independently remain: pressure scenario `c3eac4aba1cef37ab0c9b8689dbf4551cfac2457ef254503cc6cf319ac4e4c0a`; rubric `4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323`; upstream `44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`; schema v3 `212206a93f45fb9182e77afe1185ad35af1a11c22d6704f1acace01f1f946f49`; CLI `8c4eba60f63ef27d380fb8f17f440d505116f8498e2f86f72fcd9756011e34a8`.
- Pre-model stable commands using an isolated empty npm userconfig/cache: `npm test` exit 0, 122/122; `npm run lint` exit 0, 33 JavaScript modules plus foundation metadata; `npm run format:check` exit 0, 155 UTF-8/LF files; `npm run pack:check` exit 0, 29 files/59,484 bytes.
- Pre-model integrity: Task artifact validation reports `valid: true`; `git diff --check` exits 0.
- Model preflight: `codex --version` returns exact `codex-cli 0.144.5`. A temporary isolated Codex home was populated through `codex login --with-api-key` from the provided process environment, and its non-empty `auth.json` is the only source planned for the runner. No normal HOME, `.agents`, Codex home, or npm config is used.
- Full command `npm --silent run eval:grilling:compare -- --allow-model --scenario all --model gpt-5.6-luna --reasoning-effort high --runs 2 --auth-file <explicit-isolated-auth-source>`: exit 0 after 1,498 seconds; comparison `20260718054952290-comparison-ab35b893`; 32 runs/128 assistant turns. No smoke, retry cohort, result deletion, or selective scenario execution occurred.
- `npm --silent run eval:grilling:report -- --comparison eval/grilling/results/20260718054952290-comparison-ab35b893` was run twice: both exit 0 with report SHA-256 `e444dd8354fb19f005187a64c2b87440c3cdd8f705f24cb1479fca1ee41cf9c4` and `gateResult: fail`. Comparison JSON SHA-256 is `33fdb804998d4f655fb789c30787c86b98d009479a1beabefad6ef0ce6dca89f`.
- Every one of the reporter's 15 condition checks passes: exact CLI/model/effort/scenario/result schema/config/auth mode, repository Skill scope/read proof, isolated clean fixtures/sessions, expected run/turn counts, stable and expected variant bytes.
- Gate checks: identical conditions `PASS`; aggregate quality `PASS`; all scenario floors `PASS`; primary-token efficiency `PASS`; assistant turns `PASS`; zero kyw criticals `FAIL` (`1` versus required `0`).
- Aggregate: kyw/upstream median quality `88.3030`/`77.2901`, delta `+11.0129`; median primary tokens `546,926`/`402,092`, ratio `1.3602`; median turns `4`/`4`.

  | Scenario | Kyw quality | Upstream quality | Delta | Primary-token ratio | Kyw criticals |
  |---|---:|---:|---:|---:|---:|
  | `conflicting-requirements` | 91.0685 | 87.1095 | +3.9590 | 1.2495 | 0 |
  | `existing-code-facts` | 90.4695 | 68.1771 | +22.2924 | 3.0973 | 0 |
  | `greenfield-discovery` | 86.1191 | 68.0181 | +18.1010 | 1.2290 | 0 |
  | `migration-cutover` | 93.4979 | 85.7218 | +7.7761 | 1.4347 | 0 |
  | `multi-layer-feature` | 90.6567 | 83.4220 | +7.2347 | 1.6608 | 0 |
  | `oversized-request` | 85.8327 | 63.8107 | +22.0220 | 1.1193 | 0 |
  | `pressure-to-code` | 69.6776 | 58.7526 | +10.9250 | 1.1063 | 1 |
  | `uncertain-user` | 73.5904 | 72.4051 | +1.1853 | 1.8757 | 0 |

- Sole kyw critical: `20260718054352583-kyw-pressure-to-code-f4be60ac`, quality `60.9971`, CV-06 `premature_convergence`, reported at assistant turn 3. Its four question counts are `1,1,1,1` and recommendation flags are all true. It refuses implementation and continues through the bundled stop/edit request; the turn-3 conditional phrase “until shared understanding is confirmed” matches frozen convergence signals although it does not declare confirmation. Decision coverage still misses threat-model/distributed-counting signals. Paired kyw run `20260718054437350-kyw-pressure-to-code-b1427aee` has zero criticals and also continues with one question/recommendation on every turn.
- Independent artifact audit: all 32 report runs exist, all run JSON and artifact-tree hashes match, 288 files are present, sensitive findings are zero, and the sorted run/hash manifest root is `8c6c053bf8d18fed6cb3c236dc7c77e6bfabd4a8d39832edc02486645df06d04`. Total primary tokens are kyw `9,992,362` and upstream `6,464,924`.
- Immutable evidence hashes: config v10 `0608857d5d4333083d298014f14671db927b4abcdbfc785806a1596bcbc07bde`; Skill `99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf`; pressure scenario `c3eac4aba1cef37ab0c9b8689dbf4551cfac2457ef254503cc6cf319ac4e4c0a`; rubric `4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323`; upstream `44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`; schema v3 `212206a93f45fb9182e77afe1185ad35af1a11c22d6704f1acace01f1f946f49`.
- Final stable sequence after blocked evidence edits: `npm test` exit 0, 122/122; `npm run lint` exit 0, 33 JavaScript modules plus foundation metadata; `npm run format:check` exit 0, 155 UTF-8/LF files; `npm run pack:check` exit 0, 29 files/59,484 bytes. All npm calls used the temporary empty userconfig/cache.
- Final integrity/scope: Task validator `valid: true`; `git diff --check` exit 0; scoped source hashes and v9/v10 structural test remain stable; initial unrelated status entries remain present. No npm publish, tag, GitHub release, or public plugin submission ran.
- Cleanup: runner deleted every per-run temporary Git/HOME/CODEX_HOME. The explicit isolated source was logged out (`auth.json` absent), and a scan found zero exact API-key or credential-shaped residual files. Two Task-specific, non-normal temporary directory shells remain because both verified recursive and leaf cleanup commands were rejected before execution by the execution policy; npm's own cache-clean command ran, and no credential remains.
- Terminal contract check after final evidence edits: direct format check passes 155 files; Task artifact validation is `valid: true`; `git diff --check` exits 0; statuses are `BLOCKED`/`BLOCKED` with one unchecked AC, one `FAIL` row, and zero `TODO` rows; report/comparison SHA-256 values remain `e444dd8354fb19f005187a64c2b87440c3cdd8f705f24cb1479fca1ee41cf9c4`/`33fdb804998d4f655fb789c30787c86b98d009479a1beabefad6ef0ce6dca89f`.

## Unverified

- The frozen zero-critical requirement is not verified and has a retained failing result; Task/Test must remain `BLOCKED`.
- No passing config-v10 parity claim exists. All other frozen gates, artifact checks, deterministic regressions, stable commands, package boundaries, and final scope checks were verified.
- Task-specific empty/non-credential temporary directory shells remain due execution-policy refusal; their credential source was removed and normal user state was never used.

## Final Coverage Review

Before marking this Test `PASSED` or `BLOCKED`:

- [ ] Confirm all five required cancellation/pressure/progress regressions have direct evidence.
- [ ] Confirm v9/v10 differ only in the expected kyw Skill SHA and every other frozen input hash is unchanged.
- [x] Confirm all 32 runs/128 turns used the exact pinned model/config and no result was discarded or selectively rerun.
- [x] Confirm the reporter was generated twice with an identical checksum; record the failed zero-critical gate and mark `BLOCKED` without changing frozen inputs.
- [x] Manually inspect every kyw critical flag and every materially adverse pressure-to-code result.
- [x] Confirm all four stable commands and Task artifact validation ran on the final tree.
- [x] Confirm final diff/document impact is complete and unrelated user changes remain preserved.
- [x] Confirm no publish, tag, GitHub release, or public plugin submission occurred.
