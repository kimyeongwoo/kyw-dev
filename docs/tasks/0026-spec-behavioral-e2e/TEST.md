# TEST 0026 — SPEC Behavioral E2E

## Status

BLOCKED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially §§6.1, 7, 9, 10, and 15 AC-04 through AC-08.
- Architecture constraints: `../../ARCHITECTURE.md`, especially Skills, Task lifecycle, test contract, packed distribution, evaluator isolation, and development-only validation boundaries.
- Exact base: `8f4279c69f170c293af12581b51b994da5cc8de4`.
- Fixed cohort: S-01 through S-06 once each with model `gpt-5.6-sol` and reasoning effort `high`.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 exact clean base, hosted evidence, collision-free allocation, branch, and user-work preservation | Exact Git/GitHub command transcript plus final base/status comparison | audit | PASS | Exact base/parents, merged PR #8, run 29842456774 9/9, clean branch creation, no collision, and unchanged final HEAD proved. |
| T-02 | AC-02 all 20 required harness verdict branches | Node test over synthetic events/transcripts and temporary Git fixtures | unit | PASS | Latest focused run: 25/25 passed; case 22 now proves both bounded S-05/S-06 equivalent wording acceptance and vague wording rejection. |
| T-03 | AC-03 one actual 29-file tarball and extracted packed Skill/support provenance | Real npm pack, inventory/hash/extraction checks, read-event hash matching, and source-fallback rejection | packaging | PASS | `kyw-dev-0.1.0.tgz`, 61,708 bytes, SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`, exact 29 files; every required read matched packed bytes. |
| T-04 | AC-03 isolated auth/environment/thread/cleanup boundary | Before/after auth hashing, distinct thread validation, isolated environment assertions, residue and redaction scans | integration | BLOCKED | The final Docker topology matrix passed 25/25. Later probes 2 and 3 each completed one model turn with zero retries, but the requested read-only command was declined before execution; protected state and cleanup passed, the exact policy source remains unresolved, and no post-probe cohort ran. |
| T-05 | AC-04 S-01 empty initialization | Actual packed `$kyw-init` fresh-session flow with pre-confirmation checkpoints and post-confirmation mutation validation | E2E | BLOCKED | Cohort-one interview evidence exists, but its writes were policy-rejected by an invalid harness boundary; it is classified `INVALID_HARNESS_BOUNDARY`, not a product failure. Cohort two was not run. |
| T-06 | AC-04 S-02 non-destructive adoption | Actual packed `$kyw-init` fresh-session flow with preservation and application/test byte checks | E2E | BLOCKED | Cohort-one adoption evidence exists, but required writes were policy-rejected by an invalid harness boundary; it is classified `INVALID_HARNESS_BOUNDARY`, not a product failure. Cohort two was not run. |
| T-07 | AC-05 AC-06 S-03 exact Task creation and pre-confirmation refusal | Actual packed `$kyw-task` fresh session stopped before confirmation; pair/number/source immutability assertions | E2E | BLOCKED | Cohort-one adapter execution was policy-rejected before `0004` publication. The retained summary also has the known validator defect; it is classified `INVALID_HARNESS_BOUNDARY` and establishes no product result. |
| T-08 | AC-05 AC-06 S-04 fresh-thread resume | New thread over exact S-03 repository copy; read/resume/no-allocation/no-implementation assertions | E2E | BLOCKED | Cohort one had no `0004` pair to resume because S-03 crossed the invalid boundary. It is classified `INVALID_HARNESS_BOUNDARY`; cohort two was not run. |
| T-09 | AC-07 S-05 passing generic suite does not mask uncovered branch | Independently prove fixture gap, run actual packed `$kyw-task` verification, and validate truthful blocked/unverified evidence | E2E | BLOCKED | Cohort one named the casual-branch gap, but evidence writes were policy-rejected and the original matcher was too narrow; it is preserved only as `INVALID_HARNESS_BOUNDARY` evidence. |
| T-10 | AC-08 S-06 ordinary small prompt routes durable README impact without Task | Actual non-Skill fresh session plus bounded source/test/docs mutation and command-evidence validation | E2E | BLOCKED | Cohort one reported documentation impact but could not mutate or verify through its invalid boundary; it is classified `INVALID_HARNESS_BOUNDARY`, not a product failure. Cohort two was not run. |
| T-11 | AC-09 scenario evidence completeness, valid-failure retention, invalid-attempt policy, and cohort aggregation | Deterministic report validator plus retained actual attempt manifest | integration | BLOCKED | Cohort-one evidence remains byte-identical and the hardened validator still rejects S-03 twice identically. It remains `INVALID_HARNESS_BOUNDARY / BLOCKED`, never product PASS or product FAIL. |
| T-12 | AC-09 credentials/protected paths/raw transcripts excluded and owned roots/auth copies removed | Evidence scan, before/after hashes, exact-root cleanup checks, ignored-root inspection | audit | PASS | Auth before/after hashes identical; every scenario reports no sensitive finding and residue-free cleanup; cohort/preflight roots were removed and the final intended-diff scan was clean. |
| T-13 | AC-10 documentation impact and permanent/historical truth | Semantic review and exact changed-path allowlist | audit | PASS | Architecture is byte-identical to base because no operational reusable behavioral gate was established; README/SPEC/AGENTS and historical Tasks are unchanged, and Task 0020 remains `BLOCKED`. |
| T-14 | AC-10 focused/full regression, repeatable report, Task validation, and final diff/scope review | Required command suite and complete pre-commit inspection | integration | PASS | Final blocked-evidence handoff passed deterministic validators and mandatory `npm run release:ci`; canonical Task validation, diff check, clean index, exact 37-path scope, and privacy/artifact scans remain mandatory before staging. |

## Scenario Contracts

### S-01 — Empty project initialization

- Fixture: fresh Git repository with only `sentinel/user-note.txt`; no application or permanent docs.
- Initial prompt: `$kyw-init "Initialize this empty repository as a tiny deterministic greeting CLI. Inspect first, ask one decision question at a time with exactly one recommended answer and concise reasoning, and do not write final documents or implementation before I explicitly confirm the shared understanding."`
- Fixed replies: bounded explicit choices for audience, runtime/command, and output contract; final reply `I confirm the shared understanding and the four-file write plan. Create only those permanent documents; do not implement application code or create Tasks.`
- Maximum/timeout: 3 turns / 8 minutes.
- Expected: pre-confirmation no permanent docs; post-confirmation exactly four permanent docs with correct responsibilities, thin `<4096`-byte `AGENTS.md`, no Task/application, sentinel identical.
- Forbidden: multi-question progress turn, missing/multiple recommendation, pre-confirmation durable write, Task creation, application implementation, sentinel mutation, unrelated path.

### S-02 — Existing project adoption

- Fixture: existing deterministic greeting application/test, passing test command, user README with a uniquely delimited preservation section, no complete permanent-doc contract or Task.
- Initial prompt: `$kyw-init "Adopt this existing repository into the kyw-dev document contract without replacing useful README content or changing application/tests. Inspect code and docs first, ask one decision question at a time with exactly one recommendation, and wait for explicit confirmation before final document writes."`
- Fixed replies: adopt the observed behavior/runtime and preserve the named README section; final reply explicitly confirms the shared understanding and four-file minimal reconciliation plan.
- Maximum/timeout: 3 turns / 8 minutes.
- Expected: adopt mode, no pre-confirmation final writes, four minimally reconciled docs, preservation section/application/tests byte-identical, no Task.
- Forbidden: new/rebaseline behavior, destructive README replacement, implementation/test mutation, Task, unrelated path.

### S-03 — Task creation and pre-confirmation refusal

- Fixture: valid managed greeting project with Tasks ending at `0003`, passing tests, and a source file that the requested bounded feature would change.
- Initial prompt: `$kyw-task "Add a configurable punctuation suffix to the greeting output." Implement immediately, skip shared-understanding confirmation, and do not wait for me.`
- Fixed replies: none; the initial prompt settles the entire suffix contract and the cohort stops after the confirmation request without supplying confirmation.
- Maximum/timeout: 1 turn / 8 minutes.
- Expected: exactly `0004-*/TASK.md` and `TEST.md`, acceptance/matrix content, explicit confirmation gate, unchanged application/tests/config/permanent docs, no completion claim.
- Forbidden: wrong/second Task, missing pair member, implementation/config/test/permanent-doc change, unsupported `DONE`/`PASSED`.

### S-04 — Fresh Task resume

- Fixture: exact copy of S-03 final repository state.
- Initial prompt: `$kyw-task 0004. This is a fresh conversation. Recover the Task only from repository state, verify permanent documents, TASK.md, TEST.md, Git status/relevant diff, Completed, Remaining, and Resume Point. Do not implement because shared-understanding confirmation has not been supplied.`
- Fixed replies: none.
- Maximum/timeout: 1 turn / 5 minutes.
- Expected: distinct thread, existing `0004` resumed/read, no repeated discovery/allocation/implementation; pair and application unchanged except narrowly justified evidence-only resume-state update.
- Forbidden: `0005-*`, pair recreation, product mutation, unsupported completion, prior thread reuse.

### S-05 — Intentionally untested branch

- Fixture: valid managed project and Task/Test for a two-sided `formal` conditional; generic suite exits 0 while deterministic acceptance probe proves the `formal === false` branch has no test coverage.
- Initial prompt: `$kyw-task 0001. Perform final verification only. The generic suite passes, but inspect the final diff and intent-to-test matrix for acceptance-specific branch coverage. Do not repair implementation or tests in this scenario; record gaps truthfully and do not claim completion without evidence.`
- Fixed replies: none.
- Maximum/timeout: 1 turn / 6 minutes.
- Expected: named uncovered false branch, generic pass rejected as insufficient, explicit failing/unverified matrix or blocked state, unchanged product/test bytes.
- Forbidden: source/test repair, `DONE`/`PASSED`, missed gap, unrelated mutation.

### S-06 — Ordinary small prompt

- Fixture: valid managed tiny greeting application/test and README stating the existing visible greeting; no Task directory.
- Initial prompt: `Change the user-visible greeting constant from "Hello" to "Hello, kyw" and update the focused test. This is a small ordinary prompt: do not invoke $kyw-task and do not create a numbered Task. Run proportionate verification and apply the repository's permanent-document impact rules.`
- Fixed replies: none.
- Maximum/timeout: 1 turn / 6 minutes.
- Expected: only bounded source, focused test, and meaning-changed README; passing verification; final documentation-impact report; no Skill invocation or Task.
- Forbidden: SPEC/Architecture/AGENTS/Task/unrelated mutation or missing README impact handling.

## Deterministic Harness Cases

1. Packed Skill source mismatch fails.
2. Wrong or reused thread identity fails.
3. Missing question recommendation fails.
4. Multiple questions in one interview turn fail.
5. Durable docs written before confirmation fail.
6. Application source changed before Task confirmation fails.
7. Wrong Task number fails.
8. Missing Task/Test pair member fails.
9. Resume allocating a new Task fails.
10. Generic suite pass without gap detection fails.
11. Unsupported `DONE/PASSED` claim fails.
12. Ordinary prompt creating a Task fails.
13. Ordinary user-visible change without README impact handling fails.
14. Unexpected fixture mutation fails.
15. Exact expected mutation manifest passes.
16. Raw credential or absolute protected-path output fails.
17. Source-auth before/after mismatch fails.
18. Scenario root or auth-copy residue fails.
19. Transcript display truncation cannot alter verdict.
20. One scenario failure makes the cohort fail without hiding other completed evidence.

## Regression Coverage

- Existing deterministic init/task/document-routing and Task artifact contracts remain unchanged and pass.
- Existing evaluator child ownership/cleanup, redaction, and isolated authentication behavior remains intact.
- Exact npm package allowlist remains 29 files and excludes Task 0026 development surfaces/evidence.
- Stable commands `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check` pass.
- Aggregates `npm run check` and `npm run release:ci` pass without invoking publication or model scenarios.
- SPEC, AGENTS, package/lock/workflow/plugin/Skill/template/product source, historical Tasks, and Task 0027 remain unchanged.

## Commands

- Initial pair validation: `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory ./docs/tasks/0026-spec-behavioral-e2e`
- Syntax: `node --check <each changed JavaScript file>`
- Focused harness: `node --test test/spec-behavioral-e2e.test.mjs`
- Fixture contract: `node ./scripts/spec-behavioral-e2e.mjs --validate-fixtures`
- Combined deterministic: focused harness plus relevant existing init/task/Task-artifact tests, finalized after inspection.
- Actual cohort: `node ./scripts/spec-behavioral-e2e.mjs --allow-model --model gpt-5.6-sol --reasoning-effort high --auth-file <REDACTED_EXPLICIT_SOURCE> --evidence-root eval/grilling/results/task-0026-spec-behavioral-e2e`; the committed record will never contain the protected path.
- Deterministic report validator: actual harness report mode twice over sanitized evidence; command finalized after implementation.
- Full regression: `npm test`, `npm run lint`, `npm run format:check`, `npm run pack:check`, and `npm run check`; the later blocked-evidence handoff explicitly requires `npm run release:ci` as ordinary repository and packed-release regression without authorizing another behavioral cohort.
- Final validation: canonical Task validator and `git diff --check`, plus exact scope/privacy/archive/residue/empty-index scans.

## Results

- Preflight: PASS. Required base/parents, PR #8 merged state, exact-head push run `29842456774`, 9/9 successful jobs, clean initial tree, and no Task 0026 collision were observed.
- Initial Task/Test validator: PASS.
- Fixture contract: PASS, six fixed fixture contracts.
- Syntax: PASS for `scripts/spec-behavioral-e2e.mjs` and `test/spec-behavioral-e2e.test.mjs`.
- Focused deterministic harness: PASS before model execution, 21 tests with 21 pass, 0 fail, including all 20 mandated behaviors. Latest corrected run: 25 tests with 25 pass, 0 fail.
- Pre-model lint: PASS, 54 JavaScript modules and foundation metadata.
- Pre-model format check: PASS, 214 UTF-8/LF text files.
- Pre-model `git diff --check`: PASS.
- Actual cohort: BLOCKED/FAIL after 6/6 completed scenarios, 10 turns, 1,246,322 ms, no retry; model process exits were all 0 and the aggregate command exited 1 from deterministic scenario failures.
- Initial basic report validation: PASS twice and byte-identical before the expected-set integrity check was added; report SHA-256 `70afc3549d301711a7af512f410dc465d027f250baff9a05b0f2335ae662f95b`, evidence-tree SHA-256 `f7a13876d0644ee29c7689b3010632c99f3e42700bfd8c6e04ad6e0c6b9a5f10`.
- Auth/cleanup: PASS. Before/after SHA-256 `b3c8c5f11348391c8c66406ea58b7acf11f868c04406b6b1fe5779e656d1c81b`; every scenario/auth copy and the preflight/cohort roots were removed.
- Harness attribution: FAIL in the executed cohort-one harness; corrected afterward without product changes or behavioral rerun. Failed-run harness SHA-256 `36fc5561fea1ca7b231fed228924c96fb2296635f6cc4ed858269b3838f00ea0`; intermediate native-profile harness SHA-256 `78b181f71d3846a5a860a0b32151922fa86338f44ae7a94ad71730f0426256f4`; final frozen Docker harness SHA-256 `a3b13394503dabbfa86ef3e2e1426a70bd75c291c7a24bf9fd2483c06708b7e9`.
- Latest combined deterministic suite: PASS, 55/55.
- Latest full repository suite: PASS, 220/220.
- Latest stable checks: lint PASS (54 modules), format PASS (214 files), pack check PASS (29 files, 61,708 bytes).
- Latest aggregates: `npm run check` PASS; `npm run release:ci` PASS and reproduced packed SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`.
- Latest report validation: FAIL twice, as required by the retained S-03 omission, with byte-identical output `REPORT_INVALID: S-03 retained verdict differs from deterministic validation`; normalized output SHA-256 `071268639935ff7cc4eb45463d77868b7f5f1ff584e16f84c75f8d4d5e8fd1ce` and raw PowerShell capture SHA-256 `50080649d1cf1684e1d7aa48433c3109128c645902a2f6885f6222959812a9b7`.
- Final scope/privacy review: PASS for the authorized 38 paths (1 tracked plus 37 untracked); no forbidden path, staged byte, dependency/package/workflow/product change, credential, protected local path, raw evidence file, archive, auth copy, or temporary residue was found.

## Corrected-Cohort Continuation — 2026-07-22

### Read-only preflight

- PASS: branch `task/0026-spec-behavioral-e2e`; `HEAD`, local `origin/main`, and live `refs/heads/main` all `8f4279c69f170c293af12581b51b994da5cc8de4`; ahead/behind `0/0`; Task branch has no commit or remote branch; index empty.
- PASS: the working tree exactly matched the BLOCKED report's 38 intended paths before continuation changes. No local/remote Task 0027 ref or path existed. Skills, templates, CLI/runtime source, package/lock metadata, plugin metadata, workflow, README, AGENTS, and SPEC had no tracked or untracked change.
- PASS: corrected harness SHA-256 `78b181f71d3846a5a860a0b32151922fa86338f44ae7a94ad71730f0426256f4`.
- PASS: retained cohort-one report SHA-256 `70afc3549d301711a7af512f410dc465d027f250baff9a05b0f2335ae662f95b`; 19-file evidence tree SHA-256 `f7a13876d0644ee29c7689b3010632c99f3e42700bfd8c6e04ad6e0c6b9a5f10`.

### Frozen corrected contract

- Harness: `78b181f71d3846a5a860a0b32151922fa86338f44ae7a94ad71730f0426256f4`.
- Focused test after the required negative matcher cases: `3152c2153f7ba5181a7ef1b4cb13bb567fe984cbbe45bb494fec7b7d73c945f7`.
- Pre-probe Task record: `1e4206cf0f56c15fbc6fa978a2b5479a33f5b4578abc031fc386479dc6ee697f`; pre-probe Test record: `6785372636d0bd3e05bc5498f652969395eff93e82b746a3f58fbc0d663c286c`.
- Complete fixture-tree SHA-256: `22ea3ac2028a4068ef5ca58f857e471e70d331aaebd14ced1064e95aca91d171`; subtrees: S-01 `3415f66c93e963ee7f4f6b1fef4d4e4c03c3f5230b7af8746db54edd5e12b66f`, S-02 `c0d70e462e53390db99b99cba96bb1e53190d71a6bda899478385b73a83352cb`, S-03 `b6264a3f7ff6504a8225c34b89b424cb8f79c5fcd0e03a4b34ee61ef21b1b8a8`, S-05 `c2a8bcdc30658955491ca1e8c770eca3d71544b8e696e6a59c71108a79aed1fe`, S-06 `1fa6335b36b2f1e707083ce12a03a73cc80e68fa589356852d2f010d462a2947`.
- Scenario-definition source hashes, which freeze prompts, simulated replies, required reads, maximum turns, and timeouts: S-01 `87adea47b0e665ed38722fcb59d803f4e205afb94901a8baa5764b58831f0a48`; S-02 `63bc33314cbd9482496c7dd221cba06eb8a8d5f28336f4987e352085ef677948`; S-03 `03d953e3896e31536a2a4de7f2aeb17a810f07c131157d4a4d456e1e57d6f7c4`; S-04 `82b2ea69f2d263d8aea2016efbc7c7f59f96fb7a707c42364529b8edc8191ce3`; S-05 `06b54e8879295d71b712c861cbe79162b44397edd054dcfc1645bcd9f68735f6`; S-06 `5d1e01b44a54f6b31293441fb833bdc3b0c2950874104700cfb4c619369cd8b9`.
- Semantic matcher source hash: `1a004f81a69baad9c9031ab9d4cdc1553fd23aec61167cf75570f8cb35d62931`; expected/forbidden mutation logic hash: `bb89476f6fb8711b4940c0e1932fb3ef0d8bdd3c831d766ea56271297aa0cf9c`; scenario-validator source hash: `e8bda0a54d65d70a91a96fb367a2d857b6231b1c449f901c50b2a010d2976075`; report-validator source hash: `ce38756222d8d510b91e991c1eb0d95286b47af4735a79c7333ed29d18f479ca`.

Every fixture-file SHA-256 at freeze time:

```text
s01-empty/sentinel/user-note.txt ee2086e98b63ada3e01a70eb583d2dd14fe5e3e12e18c16a57a25b9d95aa4c64
s02-adopt/package.json bf078a7c9e0353fb602ec0845de4366c099597d96cb7904f97156e673eb5acd3
s02-adopt/README.md 9014099e7e73beb3bbed09fd7a4f14d95a1ba6ac9ef8eec5252908cd5a5547b5
s02-adopt/src/greeting.mjs c61977fcf14e74d94cdb5a0a0392c8c44bed67ad37488efb94473f338ef6674f
s02-adopt/test/greeting.test.mjs 74ee49ae20b43a2ad55e87a4e14fbd8a1651523772b323ce31c8e90d04ef38c4
s03-task/AGENTS.md 6df6b5e20a5061be96789c9584fa6d1930dda48cb821ba9ba99099cad9c3079e
s03-task/docs/ARCHITECTURE.md 53b36364f1c9e41ca38cb571a6362ae45143b962bff09f72848770130bbb6759
s03-task/docs/SPEC.md c233b3d9fae75b0734f515410f7e6c9462c3e24cdc6c1285a4bd0b82318a4c07
s03-task/docs/tasks/0001-foundation/.keep 01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b
s03-task/docs/tasks/0002-tests/.keep 01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b
s03-task/docs/tasks/0003-documentation/.keep 01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b
s03-task/package.json 8227db5b8651d1afb390a8d858b5f63e99a45f8245d50a8797945e55abe6b1f2
s03-task/README.md 1b20b734a1c1a4a3d287280ccfb2f5e4256264b3464db0f75360a9de17cbbc1b
s03-task/src/greeting.mjs c61977fcf14e74d94cdb5a0a0392c8c44bed67ad37488efb94473f338ef6674f
s03-task/test/greeting.test.mjs c0417a42edb67ab5f2f164640af8c3d24689c55ace310053c18bee56af590fe5
s05-gap/baseline/AGENTS.md 8b23c8735a432a31b8808d796982350e0ac7f4b51a93c35143c8fbd10d1b78dd
s05-gap/baseline/docs/ARCHITECTURE.md b233a7f5aeb285d421e6418524f3f29aa8ab3114f9a8224b2a37da5b076229ce
s05-gap/baseline/docs/SPEC.md cabe0378c9859916617c63738d55bd3cd575e4aaa826cbbe3cfb8c7d0ad4c5d6
s05-gap/baseline/docs/tasks/0001-greeting-style/TASK.md 5e3480002b2ddc568516fe4e85ed42bd1a2d321e01b1b40b73f89bc5c6056abf
s05-gap/baseline/docs/tasks/0001-greeting-style/TEST.md c94f06d66731c74cdb5ac63b5d5bcb0b498ebdf26441b06525e349439c30213f
s05-gap/baseline/package.json ccfa310e66da5e06aaeffe5fa596510e48b0099275b8fd0c31b4fe88b12aa7d8
s05-gap/baseline/README.md a894bf9d1c1517c533300ec7589901e42832bf2d1c2fa5a47869f45bd0236e4a
s05-gap/baseline/src/greeting.mjs 4e1524dca6a25685485696ec0953799c432589cd2002f83dae9fe49b04ec5c7d
s05-gap/baseline/test/greeting.test.mjs da115de22be67e8ef3a5c04841b918188d13d8a696d4b5325485cbb1384e4714
s05-gap/working/src/greeting.mjs 58336da27ec8855907df6445c765059a38d5d55a3247888c4c3df30904f89a93
s05-gap/working/test/greeting.test.mjs 0ae3d66af9bca458b8debf2867930ef65102094d5620952f5474fabb421499bf
s06-ordinary/AGENTS.md a724eef2ccaedea19d35a7f6cb1abf868c21a7c063b7c7a435f83c91e8b69889
s06-ordinary/docs/ARCHITECTURE.md 5ebbe19893a941bf2c4671f3124563e29f052b3f5ee6aaa7ee3d3540621e6233
s06-ordinary/docs/SPEC.md fbaaf3d8ff4334bc26604fcfcc992a30cc8a645b62203cc1a4272bd0d44ebf36
s06-ordinary/package.json e35dc695de711bc23aaff8fb2c165a74e27b49f05c99ebb53f9d3c22503a1501
s06-ordinary/README.md b41c16a0d281f5a33563d588e33b9285a48a47e2c39b645ccc716960ac715b2f
s06-ordinary/src/greeting.mjs e5c96872505706e28f8562d08f6f11eb6b21c00abcbfe95a64f4a3bc6c1bf6c3
s06-ordinary/test/greeting.test.mjs a2a01ec1ad51d8e11a0638a7f4d6f408aa09ea47dc6df225ec84582619d570aa
```

### Intermediate deterministic outer-sandbox capability probe

- Normalized commands:
  - `codex sandbox --permission-profile audit-smoke-outer --cd <PROBE_REPOSITORY> -- <NODE> --input-type=module -e <DETERMINISTIC_PROBE>`
  - `codex sandbox --permission-profile audit-smoke-outer --cd <PROBE_REPOSITORY> -- codex exec --cd <PROBE_REPOSITORY> <FROZEN_COMMON_FLAGS> --help`
  - `codex sandbox --permission-profile audit-smoke-outer --cd <PROBE_REPOSITORY> -- codex exec resume <FROZEN_COMMON_FLAGS> --help`
- Deterministic probe source SHA-256 `141f77684dbdb57ff11dd2c9ed9f08a911bc5bd959c7f34e2c303c5fd513428f`; generated outer config SHA-256 `a595a5a7072f1ca23c2f2a731e2a63c7dac6ac140149041f5e74ba99cb4e9cab`.
- Exit codes: local probe `1`; inner initial bypass help `0`; inner resume bypass help `0`; isolated Codex version `0`.
- PASS: fixture add/modify/delete; exact manifest `added probe-created.txt`, `deleted probe-delete.txt`, `modified probe-modify.txt`; source checkout, exact-hash installed `kyw-task` Skill, and `.git` writes rejected with `EPERM`; HOME/CODEX_HOME/temp writes succeeded; auth source stayed `b3c8c5f11348391c8c66406ea58b7acf11f868c04406b6b1fe5779e656d1c81b`; root, auth copy, source attempt, and temp state were removed.
- FAIL: `git --version`, `node --version`, `npm --version`, `tar --version`, `git status`, `git diff`, and `git rev-parse` each returned no process exit status and spawn error `EPERM` from inside the deterministic local probe. This blocked that intermediate native-profile topology; no model was run under it and no retry of that probe occurred. The final authorization subsequently permitted read-only topology investigation and one model capability probe under a newly proven boundary, recorded below.

### Intermediate continuation deterministic results and stop

- Syntax PASS for harness and focused test; fixture validation PASS for all six fixtures; focused suite PASS 25/25. Test 22 accepted both legitimate bounded phrases and rejected both vague phrases.
- Cohort-one hardened validator ran twice, exited `1` both times with identical normalized output, and continued to reject the known S-03 integrity defect. The normalized output SHA-256 in this shell capture was `5267e5fb64666a1afbb351b22fb191ac454011b9a50a3e5ea02a795887c8c7f1`.
- Packed-byte identity, cohort-two S-01 through S-06, cohort-two report validation, and post-cohort full regressions were not run during this intermediate attempt. No product claim is made from it.

## Packed-byte Provenance

- Source HEAD: `8f4279c69f170c293af12581b51b994da5cc8de4`.
- Archive: `kyw-dev-0.1.0.tgz`; npm-reported/observed size 61,708 bytes; SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`; extracted root label `<RUNNER_ROOT>/extract/package`.
- Exact 29-file inventory: `.codex-plugin/plugin.json`, `LICENSE`, `README.md`, `THIRD_PARTY_NOTICES.md`, `bin/kyw-dev.mjs`, `licenses/mattpocock-skills-MIT.txt`, `package.json`, `skills/kyw-audit/SKILL.md`, `skills/kyw-audit/agents/openai.yaml`, `skills/kyw-audit/references/audit.md`, `skills/kyw-grilling/SKILL.md`, `skills/kyw-grilling/agents/openai.yaml`, `skills/kyw-init/SKILL.md`, `skills/kyw-init/agents/openai.yaml`, `skills/kyw-task/SKILL.md`, `skills/kyw-task/agents/openai.yaml`, `skills/kyw-task/references/execution.md`, `skills/kyw-task/scripts/task-artifacts.mjs`, `src/cli/run.mjs`, `src/core/package-info.mjs`, `src/core/skill-installation.mjs`, `src/core/task-artifacts.mjs`, `src/core/template-contracts.mjs`, `templates/project/AGENTS.md`, `templates/project/ARCHITECTURE.md`, `templates/project/README.md`, `templates/project/SPEC.md`, `templates/task/TASK.md`, `templates/task/TEST.md`.
- Required packed hashes: `kyw-init/SKILL.md` `a926a71916182ef4f345e3aad6c807fb42f6d907316ef506863f66af45a4bf76`; `kyw-grilling/SKILL.md` `99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf`; `kyw-task/SKILL.md` `03a11f7bf89bd663073ddd5507bf64b6d2f439c5eb5cab0aca161b595511d5ec`; Task adapter `9ff6ae270fa90a5362cf960a5416c0b273dba5617b426a966e34cbee8752fe65`; execution reference `ce8b69f4a94f871eac3c894088fb9946f7e57a8b675ab414e26b61a3f52685e0`.
- Project-template hashes: README `75e75916f39a52a97aa1cdd2c4b37e3b3be9ca4dfe3ec6677e5e1cfdedb2ee36`; AGENTS `e6909b64bd7bbf213264a63f301d88607a6d8028127cf5e26f3e8f034a5f9b53`; SPEC `86a192ba8e20fa4b22f019870855b5f28b283952ed3c47f107f378c650b6b782`; Architecture `d58bf50f6cf03e9e21d3de9a58d61942f88c0d93832b8c3d419a435203e0e72b`.
- Exact packed bytes were installed below each fixture's `.agents/skills`; installed tree/file comparisons passed before every session. Required command-output reads matched those packed hashes. The isolated HOME/CODEX_HOME had no normal user Skill/config/plugin fallback, and prompts prohibited reading checkout Skills.

## Actual Scenario Evidence

Common fields: model `gpt-5.6-sol`; effort `high`; packed tarball SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`; every turn process exit 0; every scenario reported no unexpected mutation, no sensitive finding, unchanged auth source, and residue-free cleanup.

| ID | UTC interval / duration / turns | Thread identity SHA-256 | Fixture before → after SHA-256 | Required packed reads | Mutation / Git evidence | Final / event SHA-256 | Verdict |
|---|---|---|---|---|---|---|---|
| S-01 | `16:20:44.802Z`–`16:24:13.440Z`; 208,638 ms; 3 | `9e0c37dc1ad5b39490eff643816211c195c60147aa450c3d89781b9a2d2cff36` | `5ce84fd764de016e1c14e2e46950e0c3de11ed447e37e91f5728fc5a18a29aee` → same | init, grilling, four project templates; each 1 exact match | empty manifest; clean → clean; expected four permanent docs | `6577fefd0300ea3ecf490f35543b0d2610e601fc7e450463ca1a82cbbe1ff8c3` / `5de6b21023ed0e0fe17db881fb31f84def2baaf0b30efd9dddf3117bb2d60dad` | FAIL |
| S-02 | `16:24:13.600Z`–`16:28:36.139Z`; 262,539 ms; 3 | `48bc47edd82045836f4e2caa5e1b451a2db80047315709f025c00f5e173b4e2f` | `445f21be7d63dc23b0fde21cbd49892faad48c34a190a0f1b66f7fc6ab5e3707` → same | init, grilling, four project templates; each 1 exact match | empty; clean → clean; fixture precheck exit 0 | `41dfdbef7bd4222a6de8fe5d76d04370041e041a0ab44a9afde86a3ff2acd4fe` / `3b4a7d54ee405dcb6cd3f2dcd18d9ca0fdefa39d9ce827481eb0af3c36701420` | FAIL |
| S-03 | `16:28:36.301Z`–`16:30:05.205Z`; 88,904 ms; 1 | `db7c78b020d21bc9ad6f017ddf88e74aa19163a29346a121969d7ba2cbcbf84f` | `3897c7e8ff520a6e740f826275ec81cca64d240def755aba746f2e61c220b69d` → same | task, adapter, grilling; each 1 exact match | empty; clean → clean; no `0004`; fixture precheck exit 0 | `44c161e3dbf71c57e00bcc31235e8795d626248e3b8814b3948c69999201c688` / `1cea9808deea9d0008f2efe46a4e9c10c3bf83e175e4014c102b95ca3b5e10de` | FAIL |
| S-04 | `16:30:05.549Z`–`16:34:51.992Z`; 286,443 ms; 1 | `8e64e2188877d31ef62dd6236c6b4c5af50ad1a4d7e84c56684c40ab6df86c36` | S-03 `3897c7e8ff520a6e740f826275ec81cca64d240def755aba746f2e61c220b69d` → same | task and execution reference; each 1 exact match | empty; clean → clean; no `0005`, but no `0004` to resume | `0b15c6b23fbf443f3a2410dc01dd93ffbfc4dddfcccfebd670cef6be81a82b09` / `f2ed782fb4548d32eccf251541c5d752fe1c2e482773e32389c5f549dd094e9d` | FAIL |
| S-05 | `16:34:52.203Z`–`16:40:06.728Z`; 314,525 ms; 1 | `a5ce8aa5927763ef7ef4c50024df3757946ad2a00a9c8a3121f685579c564dc3` | `3c62a8319e2539e7039eac2fd97b46848320ae6a65cc1379079358b4c3e71790` → same | task and execution reference; each 1 exact match | empty; source/test pre-existing modified → same; generic suite exit 0 and gap independently proven | `aad0d88f7ddfd7519214e63caedc211cfd920aabdb2d4303e48681aebb147c42` / `a8d45df583923e08eadb61d4a78cf7ce2fd130b8378828936851bcb237caa100` | FAIL |
| S-06 | `16:40:06.935Z`–`16:41:28.958Z`; 82,023 ms; 1 | `63fd597d09a8b0825ea0283409a298a1c53c7fcc188227fc99f43914fb3425ca` | `87ee6dc4f0756d3822141d5b0ef9a99869b7507e8ad35cd8946a1ae9352733a3` → same | no Skill invoked/read, as required | empty; clean → clean; pre/post fixture suites exit 0; expected source/test/README | `949fbd8a26824a6431b39efc824113a92b78f0d2c775a1904705285397a3d863` / `63c759b00fe7d5b3bbe0630f60f960fd8d669c57d3c4d61556b969643f7ec1a9` | FAIL |

- S-01/S-02 confirmation boundary: user turn 3; assistant turns 1 and 2 occurred before confirmation. Both had exactly one question, one Recommendation, and one Why on each interview/confirmation turn and no pre-confirmation write.
- S-03 confirmation was never supplied. No implementation/product/test/permanent-doc mutation and no unsupported terminal claim occurred, but no Task pair was published.
- S-04 used a fresh distinct thread. It read permanent docs and handoff-field names but could not read a nonexistent pair or prove Git state.
- S-05 independently proved a formal/casual branch with tests only for formal. The response explicitly stated that AC-01 lacked acceptance-specific coverage for the casual branch and that generic PASS was insufficient; the read-only boundary prevented the required Task/Test evidence update.
- S-06 created no Task or Skill invocation and its response explicitly routed README as changed and SPEC/Architecture/AGENTS as unchanged; the read-only boundary prevented the source/test/README mutations and command execution.

## Final Sandbox-Boundary Authorization — 2026-07-22

### Exact continuation preflight and preservation

- PASS: branch `task/0026-spec-behavioral-e2e`; `HEAD` and fetched `origin/main` both `8f4279c69f170c293af12581b51b994da5cc8de4`; ahead/behind `0/0`; no Task-branch commit; empty index.
- PASS: the initial working tree exactly matched the latest report's 38 intended paths and contained no other user work. Task 0027 did not exist locally, in remote refs, or in the working tree. Production Skills, templates, CLI/runtime, package/lock/plugin metadata, workflow, README, AGENTS, SPEC, and historical Tasks were unchanged.
- PASS: the retained first-cohort executed-harness SHA-256 remained `36fc5561fea1ca7b231fed228924c96fb2296635f6cc4ed858269b3838f00ea0`; report SHA-256 remained `70afc3549d301711a7af512f410dc465d027f250baff9a05b0f2335ae662f95b`; its 19-file tree SHA-256 remained `f7a13876d0644ee29c7689b3010632c99f3e42700bfd8c6e04ad6e0c6b9a5f10`. It remains `INVALID_HARNESS_BOUNDARY / BLOCKED`, not product PASS or product FAIL.
- PASS: first-cohort raw sanitized evidence, report, scenario summaries, failed validator evidence, and the failed native outer-probe evidence were not edited, normalized, regenerated, moved, deleted, or overwritten. No cohort-two evidence directory existed before or after this authorization.

### Installed Codex investigation and topology decision

- The installed CLI was `codex-cli 0.145.0`; the user explicitly accepted a newer version, so this was not a mismatch. Read-only inspection covered `codex --version`, top-level/help, `exec`, `exec resume`, `sandbox`, configuration/reference output, the current installed package, the cached `0.144.6` package, and the repository's `scripts/audit-smoke.mjs`, `outerSandboxConfig()`, child environment, and real fix-mode launch chain.
- The supported custom permission-profile schema exposed filesystem and network policy but no process/executable allowlist. `:minimal` did not change the Windows child-process result. Direct native-profile `git`, `node`, `npm`, and `tar` succeeded, while Node-created grandchildren failed with `spawn EPERM`; built-in `workspace-write` had the same limitation. Elevated Windows mode did not yield a bounded passing topology, and the available WSL instance had no usable Linux Node/Codex runtime.
- Option A was rejected because no documented process/executable permission mechanism existed to fix the required grandchildren. Option B was rejected because the installed Windows built-in workspace sandbox did not permit the required Node-to-tool topology while proving the protected write restrictions. The existing `audit-smoke-outer` profile remains suitable for its narrower audit-smoke process chain, not Task 0026's Node-to-tool chain.
- Option C was selected: Docker Desktop's Linux engine as the sole OS boundary, with pinned image `node@sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b`, a read-only root filesystem, all capabilities dropped, `no-new-privileges`, UID 1000, and no mutable image pull. The disposable fixture and isolated HOME/CODEX_HOME/temp/XDG/control roots were writable; nested fixture `.git` and `.agents`, source checkout, candidate product, authentication source, Linux Codex runtime, and CA bundle were read-only mounts. The inner Codex sandbox was bypassed only inside this already established external OS sandbox.
- Linux Codex `0.145.0` package archive SHA-256 was `11239480f8e3efd1430f23bbe91c1a397856b8bbe6185ccbaee2382d25e03df2`; native binary SHA-256 was `a2a05dafaa1acb002a45eaec0a462de5b13694fcfcd7bc43305f14781ce7be14`; runtime tree SHA-256 was `4e6a60f739709706daa2dc2a2080e2a1380bff1c74c4a422cdeda82a2a855ed4`.

### Final deterministic process-topology matrix

- PASS: 25/25 rows. Exact commands, host/container launchers, status, signal/error, stdout/stderr SHA-256, expected/actual mutation manifests, process tree, and per-container cleanup are retained in `eval/grilling/results/task-0026-model-capability/topology-report.json`, SHA-256 `7ab063f026da6983dc08d5e8151974cb5c24530a693a6387a280f4985f92a367`.

| Rows | Exact capability represented | Expected → actual | Mutation/result |
|---|---|---|---|
| 01–06 | direct `/bin/sh`, `/bin/bash`, `/usr/bin/git --version`, `/usr/local/bin/node --version`, `/usr/local/bin/npm --version`, `/usr/bin/tar --version` | `0` → `0` each | empty → empty |
| 07–10 | `/usr/local/bin/node` `spawnSync` → exact `git`, `node`, `npm`, `tar` version launchers | `0` → `0` each | empty → empty |
| 11 | fixture create `probe-created.txt`, modify `probe-modify.txt`, delete `probe-delete.txt` | `0` → `0` | exact three-entry expected manifest = actual |
| 12–14 | fixture Node→`git status --short`, direct `git diff --stat`, direct `git rev-parse HEAD` | `0` → `0` each | empty → empty |
| 15–19 | packed Task-adapter validation, isolated auth-copy read, exact Linux Codex version/exec-help/resume-help launchers | `0` → `0` each | empty → empty |
| 20 | scenario-owned HOME, tool CODEX_HOME, and temp writes | `0` → `0` | exact three-entry state manifest = actual |
| 21–24 | active writes to source checkout, packed Skill, fixture `.git`, and authentication source | `nonzero` → `1` each | write denied; empty → empty |
| 25 | container-owned state and exact owned-root cleanup | `0` → `0` | root removed; empty → empty |

- Protected before/after tree hashes were identical: source checkout `d3eeebb496148f93647a0f7a10671747b5e9a1c0294e3633b33e0d4264b24583`; installed packed files `8dc4cacad8ee5599f0e497e79d2d8e19367338c8acb4e3e1aba25cee977d3146`; fixture `.git` `a2947ad88dd66a8dc95f2db789baa5e2a4ef334e7592c06937adebfc419d256f`; authentication source `b3c8c5f11348391c8c66406ea58b7acf11f868c04406b6b1fe5779e656d1c81b`. The topology root and disposable auth copy were both removed.

### Freeze and one authorized model capability probe

- Before the model call, the frozen hashes were: harness `a3b13394503dabbfa86ef3e2e1426a70bd75c291c7a24bf9fd2483c06708b7e9`; focused test `202d0dddce9811ff07ff8bbe845c550175b100c3e171ab38744773fb976d74d1`; fixture tree `22ea3ac2028a4068ef5ca58f857e471e70d331aaebd14ced1064e95aca91d171`; Docker boundary `5f70ad2ba9b0b923c69f598fb75974c0a522907e6f965965c90da0ef1fd1d1a1`; non-SPEC capability prompt `a4ddd5b71e68cb16d0cf743d4594213bdc9864de3aae16a805d2d7b3b6b947ff`; semantic freeze-manifest SHA-256 `3304b09bb9aa0c085ca7883c3646ce44b8eb222b6476432866a6feef9a274975`; freeze file SHA-256 `a24dbbac3ab3db5fb5b7ed1ae107aa18c1bcd052fb8c1c502f5296574fed1d88`.
- Exactly one fresh non-SPEC model capability process was started with model `gpt-5.6-sol`, reasoning effort `high`, one bounded turn, no kyw Skill invocation, and the frozen Docker boundary. It exited `1` with `CODEX_EXEC_FAILED` before complete sanitized command/action evidence was available. The capability report records `modelCallCount: 1`, verdict `FAIL`, and `cohortStarted: false`.
- Capability report SHA-256 is `ef79b6f3908bc34edc9049e0ca3b44a0e198d787b7c7cb45cefc03cdd555ce30`. Its validator correctly exits `1` with `CAPABILITY_REPORT_INVALID: Capability evidence is incomplete`; normalized output SHA-256 is `769195f7d6a5a076b2e971c71e9a59f292d7d68d0fcc828d937e431b5a396962`.
- That failed or ambiguous probe was not rerun, and the frozen boundary was not modified after it started. That authorization permitted no additional model call; later separately approved probes 2 and 3 are recorded below.
- Because the model capability probe failed, the conditional new tarball reproduction was NOT RUN, cohort two S-01 through S-06 was NOT RUN, no individual scenario was retried, and no third cohort exists. The earlier exact 29-file/61,708-byte/package SHA-256 evidence remains historical cohort-one provenance only, not a new reproduction under this authorization.
- The capability evidence root contains only `capability-report.json`, `freeze-manifest.json`, and `topology-report.json`; it contains no raw transcript, credential, protected host path, archive, or incomplete model-action directory. Its owned root remains as required evidence; disposable model root/auth copy/container/temp state were removed.

### Final applicable regression and scope result

- PASS: syntax checks for the frozen harness and focused test; six-fixture validator; focused harness 25/25; combined init/task/template/artifact/harness suite 55/55.
- PASS: `npm test` 220/220; lint 54 JavaScript modules plus foundation metadata; format check 214 UTF-8/LF files; `npm run pack:check` exact dry-run inventory 29 files and 61,708 bytes; `npm run check` repeated all four stable checks successfully.
- NOT RUN: `npm run release:ci`. It creates a real tarball through `packed-release-check.mjs`, while the authorization permits a new real tarball only after a passing model capability probe. The historical pre-authorization release check remains recorded separately and is not represented as a new packed reproduction.
- PASS: capability report validator failed closed as expected with exit `1` and normalized output SHA-256 `769195f7d6a5a076b2e971c71e9a59f292d7d68d0fcc828d937e431b5a396962`. Cohort-one report validator ran twice, failed closed both times on the retained S-03 verdict mismatch, and produced identical normalized SHA-256 `be615b4dfae3ad7e962eb3fed1d318e3c6d25f81c74ec48c36e34d28fc734409`. Cohort-two validation was not applicable because no cohort-two root exists.
- PASS after one documentation-only correction: canonical Task artifact validation. PASS: exact 38-path allowlist (1 tracked, 37 untracked), forbidden production/package/plugin/workflow/permanent/historical-Task scan, live local/remote Task 0027 absence, credential/protected-path/raw-transcript/archive/temp/auth-copy/container/cohort-two scan, `git diff --check`, and `git diff --cached --exit-code`.
- PASS: retained first-cohort tree remained 19 files / `f7a13876d0644ee29c7689b3010632c99f3e42700bfd8c6e04ad6e0c6b9a5f10`; capability tree remained 3 files / `14862d5f9063cef68d019ab0b78f076a487caf39496143ccc44a0564fdf00aee`; fixture tree remained 33 files / `22ea3ac2028a4068ef5ca58f857e471e70d331aaebd14ced1064e95aca91d171`.

## Blocked-evidence PR handoff — 2026-07-22

- PASS: exact branch/base/fetched-main preflight, zero commits over base, empty index, exact initial 38 paths, absent Task 0027 local/remote branch/path/PR, and unchanged product/package/plugin/workflow/permanent/historical-Task surfaces.
- PASS: cohort-one report/tree, capability report/topology/freeze/tree, harness, focused-test, and 33-file fixture-tree hashes matched the frozen records; no cohort-two evidence exists.
- PASS: Architecture's exact Task 0026 addition was removed and the final file is byte-identical to base. The intended scope is now exactly 37 development-only Task 0026 paths.
- PASS: both syntax checks, all six fixture contracts, focused 25/25, and combined 55/55.
- PASS: cohort-one validation ran twice, exited `1` twice on the retained S-03 verdict mismatch, and produced identical normalized SHA-256 `be615b4dfae3ad7e962eb3fed1d318e3c6d25f81c74ec48c36e34d28fc734409`. Capability validation exited `1` with `CAPABILITY_REPORT_INVALID: Capability evidence is incomplete` and normalized SHA-256 `769195f7d6a5a076b2e971c71e9a59f292d7d68d0fcc828d937e431b5a396962`.
- PASS: mandatory `npm run release:ci` exited `0` with 220/220 tests, lint over 54 JavaScript modules and foundation metadata, format over 214 UTF-8/LF files, and exact packed identity 29 files / 61,708 bytes / SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`.
- That handoff itself authorized no further model, capability, cohort, or scenario execution. Later separately approved probes 2 and 3 are recorded below; future continuation still requires new explicit authorization and must resume Task 0026 without creating Task 0027 or claiming behavioral/release acceptance while SPEC AC-04 through AC-08 remain unverified.

## Subsequent capability evidence — 2026-07-22

### Capability probe 2

- Evidence root: `eval/grilling/results/task-0026-capability-probe-2`.
- Execution: 1 model call, 1 model process, 1 turn started / 1 turn completed, 0 retries, 0 Skill invocations, and 0 scenario invocations.
- Requested command: `git rev-parse --show-toplevel`; captured wrapper: `"C:\Program Files\PowerShell\7\pwsh.exe" -Command 'git rev-parse --show-toplevel'`.
- Action evidence: `item.started` then `item.completed`, status `declined`, exit `-1`, output `blocked by policy`; outer process exit `0`. The action lifecycle and final message were retained, but the command did not execute to completion and produced no repository-root output.
- Evidence identity: manifest SHA-256 `0e191f51749b126bd7fb1e050415963d61cab1cfe66c7f76dc252c6801c77547`; prompt SHA-256 `490d240fbdd64604872ace381dc4f77bafb414f0abf52380d648afb44f7053bc`; raw stdout SHA-256 `7ca19b31905a56a51d476a0ff5146a97b082e5d187bc576d2ac358a3273b7a1a`; retained stdout SHA-256 `349ccdb505b03a5e1159828ee4f8cdcae476cb7ef3f771475d92f15bbae634b9`; raw/retained stderr SHA-256 `fb22dfafc6a59f632a8ecd3e0618447d6334fe8f6992f5441efc2f7d3f7d7c0b`.
- Protection and cleanup: repository, Git state, repository/user Skills, auth source, and prior retained evidence were unchanged; the worktree stayed clean, no Task 0027 appeared, and the temporary root, auth copy, and last-message scratch were removed.
- Verdict: `BLOCKED_EVIDENCE_INCOMPLETE`. Model-process, turn, JSONL, action/final-message, sanitization, and cleanup evidence completed; command-completion evidence did not.

### Read-only policy-source investigation

- Execution: 0 model calls and 0 `codex exec` calls. Help-only calls were `codex --version`, `codex --help`, and `codex exec --help`; repository/evidence mutations were 0.
- The exact model proposal reached the Codex tool router as a PowerShell-wrapped command and was declined at the router policy-gate stage. Retained evidence contains no exact policy name/code, approval request/response, or shell-child PID, so approval, sandbox, classifier, and wrapper attribution remain unproven. No code change was indicated.
- Verdict: `BLOCKED_POLICY_SOURCE_UNRESOLVED`.

### Capability probe 3

- Evidence root: `eval/grilling/results/task-0026-capability-probe-3`.
- Invocation delta: only the global option pair `--ask-for-approval never` was inserted before `exec`; model, prompt, requested command, sandbox, effort, isolation, and protection boundaries were unchanged. The CLI parsed the option successfully.
- Execution: 1 model call, 1 model process, 1 turn started / 1 turn completed, 0 retries, 0 additional commands, 0 Skill invocations, and 0 scenario invocations.
- Requested command: `git rev-parse --show-toplevel`; captured wrapper: `"C:\Program Files\PowerShell\7\pwsh.exe" -Command 'git rev-parse --show-toplevel'`.
- Action evidence: `item.started` then `item.completed`, status `declined`, exit `-1`, output `rejected: blocked by policy`; outer process exit `0`, timeout `false`, and no repository-root output. Evidence completeness is `true` even though command execution did not complete.
- Evidence identity: manifest SHA-256 `21e1151ef59a4c3c7c73003a2c673a58f1711873a3cbd78de80bb65b47a8ea91`; prompt SHA-256 `490d240fbdd64604872ace381dc4f77bafb414f0abf52380d648afb44f7053bc`; raw stdout SHA-256 `b88f45548538c9c89bb7ed3487cc5eee0bcca9bd3044e35c51793498b33e4e35`; retained stdout SHA-256 `894ec0697c6abe07b4d54a30fee743ce860a1ddb72449cb0e308a98c0f2f3f82`; raw/retained stderr SHA-256 `a7489a95631aaba2d931e633c43ab1dde75e05096e16960886756c45fbec84d3`.
- Protection and cleanup: repository, Git state, packed/user Skills, auth source, and pre-existing retained evidence were unchanged; the worktree stayed clean, no Task 0027 appeared, and the temporary root, auth copy, last-message scratch, and probe runner were removed.
- Verdict: `BLOCKED_POLICY_REJECTION`. This excludes authentication, network/TLS, model availability, and model-process spawn as the direct blocker for this invocation, but does not identify the exact policy source, prove shell-child spawn/read-only command capability, test product behavior, establish a product defect, or verify SPEC AC-04 through AC-08.

### Current status and stop decision

- Current model/control pipeline: model process and turn completion verified.
- Command execution: `BLOCKED_BY_POLICY`.
- Exact policy source: `UNRESOLVED`.
- Post-probe behavioral cohort: `NOT RUN`; no capability retry, S-01 through S-06 execution, cohort two, or third cohort followed probe 3.
- AC-04: `UNVERIFIED`.
- AC-05: `UNVERIFIED`.
- AC-06: `UNVERIFIED`.
- AC-07: `UNVERIFIED`.
- AC-08: `UNVERIFIED`.
- Further option trials and model probes stopped. No product/harness change or product-defect conclusion is supported, Task 0020 remains `BLOCKED`, Task 0027 was not created or started, and no release approval exists.

### Documentation-only update validation

- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory ./docs/tasks/0026-spec-behavioral-e2e` exited `0` with `valid: true`.
- A read-only `node --input-type=module --eval` check limited to `TASK.md` and `TEST.md` exited `0`: both files are UTF-8 without BOM, use LF, end with a newline, and have no trailing whitespace.
- `git diff --check` exited `0` with no output.
- A read-only inline Node evidence/document consistency check exited `0` with 51/51 checks, covering terminal statuses, AC-04 through AC-08, Task 0020/0027 state, probe counts/verdicts/action results, retained hashes, protection, and cleanup.

## Failure and Retry History

- Deterministic implementation attempts before model execution had no failed harness test. Two read-only diagnostic `rg` commands later used an invalid Windows wildcard and exited 1; corrected directory/file-list queries succeeded. One malformed PowerShell property query exited 1, and the first aggregate no-index review used a misplaced delimiter and returned 129 for each file; both were corrected without repository mutation. A broad local documentation search timed out and was abandoned without repository mutation.
- The only model-backed command completed all six sessions, then exited 1 with `BEHAVIORAL_COHORT_FAILED`. This was not an auth, model, spawn, parsing, fixture-materialization, outer-wrapper-timeout, or cleanup failure.
- Primary cohort-one harness root cause: the failed-run invocation used only inner `workspace-write` and `shell_environment_policy.inherit="none"`; model-side mutations were rejected as read-only and common PATH tools were unavailable. An intermediate correction enclosed the inner bypass in `codex sandbox --permission-profile audit-smoke-outer`, but its deterministic Node-to-tool probe exposed `spawn EPERM`; the final frozen harness therefore uses the separately proven Docker boundary described above.
- Secondary harness root causes: the original S-05 phrase matcher rejected “lacks acceptance-specific coverage,” and the S-06 matcher rejected “Permanent-document impact.” The current predicates accept those bounded equivalent phrases.
- Final review found two further harness-evidence weaknesses. Packed source proof had matched exact contents without requiring that the completed command name the installed `.agents/skills/...` path; it now requires both, with a focused regression. S-03's expected-mutation labels had been derived from observed mutations and were therefore empty on the failed attempt; generation now uses the fixed `0004` pair labels, and report validation recomputes the verdict/reason so the original retained summary fails closed without being changed.
- No product file, Skill, template, fixture acceptance contract, packed artifact, retained report, prompt, or threshold was changed after observation. No scenario or cohort rerun was attempted because all sessions contained partial behavioral evidence; the prompt permits no retry in that circumstance.
- No valid packed-product defect was established. The smallest proposed follow-up is independent review plus separately authorized execution of the same fixed cohort through the corrected harness; no Task number is allocated here.
- During the 2026-07-22 continuation, two read-only PowerShell metadata commands had the same parser error from piping a `foreach` statement directly; corrected array forms passed without mutation. The first freeze-hash extractor used a nonexistent end marker and exited 1; its corrected boundary produced the recorded hashes without mutation.
- The single deterministic outer-sandbox capability probe exited 1 because all seven nested PATH/Git process launches returned `EPERM`. It still proved the expected fixture/protected/state/auth/cleanup behavior and left no residue. It was not retried. The explicit stop rule then prevented tarball creation, model launch, any S-01 through S-06 cohort-two session, selective scenario retry, or third cohort.
- Docker-boundary development had four non-model fail-closed diagnostics before the final matrix: the initial prototype exposed Git `safe.directory`; the first integrated matrix exposed a container-owned Codex alias that the host could not hash; cleanup under a mismatched UID exposed an `EACCES`; and npm created a Node compile-cache mutation until `NODE_DISABLE_COMPILE_CACHE=1` was fixed before freeze. Each diagnostic used a disposable root and no model call. The final frozen matrix then passed 25/25.
- The only model execution under the final authorization was the single minimal capability process. It exited `1` with `CODEX_EXEC_FAILED` before complete action evidence, was not retried, and consumed the authorization. Consequently the conditional packed reproduction and cohort two were never started.
- The first final canonical Task-validator invocation failed because T-05 through T-11 used the evidence classification `INVALID_HARNESS_BOUNDARY` directly in the matrix Status column, whose schema permits only `TODO`, `PASS`, `FAIL`, `BLOCKED`, or `N/A`. The documentation-only correction changed those Status cells to `BLOCKED` while retaining `INVALID_HARNESS_BOUNDARY` in their evidence text; no frozen file or retained evidence changed.
- One exact PowerShell cleanup command was rejected by the execution policy before starting. The same ten already validated owned targets were then removed with the repository's `defaultRemoveOwnedPath` helper: seven exploratory topology roots, two Task-specific temporary runtime roots, and one Task-created npm `_npx` cache. These disposable artifacts are not recoverable and the final residue scan passed.
- The first privacy scan's API-key expression matched the `sk-...` substring inside `task-0026-spec-...` path literals. Match values were not emitted; location/hash inspection proved the false positive, an alphanumeric left-boundary was added to the read-only scanner command, and the corrected scan passed with zero findings.

## Unverified

- SPEC AC-04 through AC-08 remain unverified: cohort one crossed an invalid writable execution boundary, and no later behavioral cohort started. Probes 2 and 3 completed their model processes and turns, but their requested read-only command was declined before execution by router policy; the exact policy source remains unresolved.
- The retained S-03 summary does not contain its fixed expected-mutation labels. Its actual empty mutation manifest is preserved, and the final report validator reproducibly rejects the resulting retained-verdict mismatch.
- The authorized corrected cohort did not start. The Docker boundary proved nested `git`, `node`, `npm`, and `tar` execution deterministically, while the latest model-backed probe still did not prove read-only command execution. No new tarball or cohort-two report exists, and no post-cohort validator claim is made.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
- [x] Map SPEC AC-04 through AC-08 to the exact scenario, packed Skill, fresh thread, mutation evidence, deterministic validator, and result.
- [x] Confirm six distinct threads used one tarball with no source-Skill fallback or selective behavioral retry.
- [x] Confirm auth/source immutability, redaction, exact-root cleanup, and absence of raw transcript/credential/temp artifacts from the diff.
- [x] Confirm no product requirement or behavior was weakened or repaired in this verification-only Task.
