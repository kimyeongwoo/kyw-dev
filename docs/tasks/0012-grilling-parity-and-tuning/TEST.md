# TEST 0012 — Grilling Parity Benchmark and Tuning

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Evaluation harness: `../0011-grilling-eval-harness/`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 settings and thresholds were frozen before results | Review pre-run Task state and config checksum | Audit | PASS | Before any Task 0012 scored run, `TASK.md` fixed `codex-cli 0.144.5`, `gpt-5.6-luna`, high effort, scenario suite `379d96ea...`, rubric v1 `4904bc5c...`, 2 repetitions, execution controls, token definition, and immutable thresholds under config SHA-256 `f281bce2...`. |
| T-02 | AC-02 variants received identical conditions | Compare run manifests and fixture checksums | Eval/Audit | PASS | Config-v9 cohort `20260717150153715-comparison-40919b17` has 32/32 schema-v3 runs and passes all 15 checks for exact version/model/effort/scenarios/config/auth, repository Skill source proof, isolation, turns, and expected variant bytes. |
| T-03 | AC-03 no critical protocol violation occurred | Run deterministic graders and inspect flagged transcripts | Eval | PASS | Config-v9 report reparses every transcript/JSONL and records zero kyw critical violations across 16 runs. All 19 upstream flags were manually reviewed and match retained text. |
| T-04 | AC-04 quality parity thresholds are met | Aggregate normalized scenario/repetition scores | Eval | PASS | Aggregate quality delta is `+5.5072`; all scenario deltas pass with a floor of `-8.9859`, above the unchanged `-10` threshold. Repaired multi-layer delta is `-0.1364`. |
| T-05 | AC-05 token and turn overhead is measured and bounded | Compare JSONL usage/turn metrics | Performance/Eval | PASS | Median primary tokens are kyw `575,206.5` versus upstream `398,591.5` (ratio `1.4431`); both median turns are `4`. Cached and reasoning tokens are separately recorded. |
| T-06 | AC-06 tuning is traceable to evidence | Map each Skill diff hunk to failing run IDs | Audit | PASS | Skill SHA `59a38fa1...` adds only the generalized semantic ledger, safe provisional fallback, non-repetition reopen gate, and impact priority linked to failed/passing runs `...8fd13687`/`...4f9ace21`; no scenario/rubric/threshold/upstream/wrapper/grader change is included. |
| T-07 | AC-07 full benchmark and repository regressions pass after changes | Re-run all required commands from clean state | Regression/E2E | PASS | Focused suites, complete config-v9 benchmark/report, and two ordered stable sequences pass; final-tree evidence is `npm test` 94/94, lint 29 modules, format 140 files, and pack check 29 files/49,917 bytes. |
| T-08 | AC-08 evidence is complete and reproducible | Validate result schema, checksums, versions, and summary | Audit | PASS | Report `aa792138...`, comparison `570fe964...`, config `9fffd4a1...`, schema `212206a9...`, rubric `4904bc5c...`, and artifact-manifest root `e59b54ec...` identify the exact 32-run/288-artifact evidence. |
| T-09 | AC-09 legal/package boundaries remain intact | Inspect notices and packed tarball | Packaging/Legal | PASS | Final-tree `npm run pack:check` exits 0 with the exact 29-file/49,917-byte package; required MIT attribution/license content remains included, eval/results remain excluded, and no publish ran. |
| T-10 | AC-10 semantic turn-state tracking, non-repetition, reversible unanswered-question fallback, and impact-prioritized progression are explicit and generalized | Deterministically inspect only the canonical Skill contract with neutral decision labels; require asked/resolved/provisional/unresolved tracking, equivalent-question suppression absent new/conflicting evidence, a safe reversible assumption path, and highest-impact remaining product/domain selection without importing or asserting against any benchmark scenario fixture | Unit/Static | PASS | `node --test test/kyw-grilling.test.mjs` exits 0 with 6/6, including `kyw-grilling tracks semantic decision state and advances by impact`; the test reads only the canonical Skill and uses neutral state/priority contracts. `npm run eval:grilling:unit` also exits 0 with 14/14 after the intended SHA pin update. |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered in the final diff.

## Regression Coverage

- [ ] Exactly one unresolved decision question appears per required assistant turn. Final pressure runs honor terminal stop requests and therefore do not ask a question on later scripted turns.
- [x] Every question includes a recommended answer or recommendation equivalent.
- [x] Facts available in the fixture are inspected rather than unnecessarily asked.
- [x] No evaluated run writes or implements before shared-understanding confirmation.
- [ ] Final summaries distinguish settled decisions from remaining unknowns.
- [x] Existing `kyw-init` and `kyw-task` references still use the canonical grilling protocol.
- [x] `npm test`, lint, format, and pack remain green after the config-v9 change.
- [x] Previously asked decisions are tracked by semantic meaning and are not asked again without new or conflicting evidence.
- [x] An omitted answer produces an explicit safe, reversible working assumption when possible and progression to the highest-impact unresolved product/domain decision; unsafe assumptions remain unknown/blocking rather than silently settled.
- [x] Lower-impact evidence provenance or recency checks cannot consume the remaining turns while higher-impact dependencies remain unresolved.
- [x] The deterministic contract test reads no benchmark scenario fixture and uses only neutral state/priority terminology.

## Commands

Planned model commands use the frozen exact options; the authentication source is intentionally omitted from recorded evidence.

- `npm run eval:grilling:unit`
- `node --test test/kyw-grilling.test.mjs`
- `npm run eval:grilling:compare -- --allow-model --scenario all --model gpt-5.6-luna --reasoning-effort high --runs 2 --auth-file <explicit-auth-source>`
- `npm run eval:grilling:report -- --comparison <comparison-directory>`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run check`
- `npm pack --dry-run --json`

## Results

Record:

- Codex CLI version
- model and reasoning effort
- rubric/scenario/baseline checksums
- repetitions per scenario
- aggregate and per-scenario parity metrics
- critical violation count
- median turns and tokens
- every tuning change and rerun result

Do not claim parity without the full required evidence.

- Preflight `codex --version`: exit 0, `codex-cli 0.144.5`.
- Preflight `codex login status`: exit 0, ChatGPT login available; no credential content or source path was printed or recorded.
- `npm run eval:grilling:unit`: exit 0, 13/13 tests passed before benchmark-extension work.
- Independent Python `jsonschema` Draft 2020-12 plus `FormatChecker`: zero errors for all eight scenario files and both retained Task 0011 `run.json` files.
- Independent retained-artifact audit: each historical smoke has nine artifacts; all four JSONL files parse with one thread; summed input/cached/output/reasoning usage exactly matches its manifest. These runs are excluded from Task 0012 scoring because reasoning effort was not explicitly recorded.
- Pre-run benchmark extension: `npm run eval:grilling:unit` exit 0 (13/13), `npm run lint` exit 0 (29 modules), `npm run format:check` exit 0 (131 files), independent v1/v2 schema validation exit 0, CLI help exit 0, and `git diff --check` exit 0.
- Pre-run source hashes: benchmark config `f281bce2...`, result schema v1 `3b337806...`, result schema v2 `42b3a3e8...`, CLI runner `8c4eba60...`, core runner `3acfee10...`, rubric `4904bc5c...`, kyw Skill `8bc7fbc7...`, upstream Skill `44331dda...`. The complete values are retained in `TASK.md` before model execution.
- Initial full command completed 32/32 runs in comparison `20260717054144356-comparison-0c7fce6a`; report SHA-256 `0b20558e95b6b60cd4700e323b63a0900991b69b381e72fdc66a4dabd2236394`, gate `fail`.
- Initial report diagnostics only: identical recorded settings passed; kyw/upstream median quality `71.3022`/`58.0416` (delta `+13.2606`); median primary tokens `446,783.5`/`343,500.5` (ratio `1.3007`); median turns `4`/`4`; kyw/upstream critical totals `48`/`66`; oversized-request scenario delta `-10.4015`.
- Manual critical review found the cohort invalid before tuning: `20260717045944361-kyw-conflicting-requirements-79a65763` says the Skill could not be located, and its turn-01 JSONL searches the normal Windows user Skill root. Cross-run JSONL inspection found observable exact Skill source reads in kyw 6/16 and upstream 0/16. The failed metrics are retained but excluded from parity.
- Official Codex manual inspection confirms explicit `$skill-name` invocation and repository-local `.agents/skills` discovery. A repository-local install plus exact first-turn source-read proof will be required in the corrected rerun.
- Corrected rerun freeze before model execution: benchmark config v2 `1ee15d81...`, result schema v3 `212206a9...`, CLI runner `8c4eba60...`, core runner `46d4ef2b...`. Rubric/scenarios/Skill bytes/model/effort/repetitions/token metric/thresholds are unchanged; only repository-local install plus source-read proof was added.
- Corrected deterministic checks: focused suite exit 0 (14/14, including no-source-read atomic failure), lint exit 0, and format exit 0 (133 files). One loading smoke per variant will be excluded from scored medians and must pass before the full rerun.
- Corrected loading smokes: kyw `20260717055129614-kyw-existing-code-facts-11f9d475` and upstream `20260717055344253-upstream-existing-code-facts-99b2eec8` both use result schema v3 and prove one repository-local exact Skill source read, unchanged scenario/Git state, one resumed thread, `codex-cli 0.144.5`, `gpt-5.6-luna`, high effort, and four turns. They are excluded from scored medians.
- Corrected full cohort `20260717064248540-comparison-ca97e126`: 32/32 valid v3 runs; report SHA-256 `47bcc295bbfb683c2e4f8f7418b229ce7f2e8e53cffbafe9d34c49566e2453d1`; all condition checks pass. Aggregate quality delta `+12.1067`, primary-token ratio `1.2449`, and four-turn medians pass; kyw has three CV-09 flags and `existing-code-facts` delta `-10.0725`, so the frozen gate fails.
- Manual critical review: uncertain-user runs `20260717063702334-kyw-uncertain-user-6d793ee6` and `20260717063828839-kyw-uncertain-user-e27e31e2` advance after delegated uncertainty without confirmation; oversized run `20260717062449409-kyw-oversized-request-b36fc69f` semantically narrows first but omits the predeclared explicit narrowing language. These three IDs justify two minimal canonical Skill clarifications and a complete rerun.
- Material score review: the `existing-code-facts` `-10.0725` median delta is driven by one 15-point signal-tokenization miss (`Idempotency-Key` versus `idempotency key`) in `20260717060258172-kyw-existing-code-facts-14fd7085`, not by asking the dependent decision first. No detector-driven production wording change is made.
- Evidence-linked tuning changed only `skills/kyw-grilling/SKILL.md` to SHA-256 `ef579827626bcaf6c3074b976f476d89880ce87feba868311ec4e70181618d62`: explicit first-release narrowing plus explicit confirmation after delegated uncertainty. SPEC/README were synchronized; wrappers already consume the canonical protocol unchanged.
- Pre-final-rerun deterministic evidence: `npm run check` exit 0 (93/93 tests, lint 29 modules, format 133 files, 29-file/48,634-byte pack); config-v3 focused suite 14/14, lint, format 134 files, and `git diff --check` also pass. Final benchmark config v3 SHA-256 `b57ebe3b...`, result schema v3 `212206a9...`, core runner `18d15977...`; all scoring inputs and thresholds remain frozen.
- First post-tuning full cohort `20260717074211829-comparison-089887d8`: 32/32 runs, report SHA-256 `7f8d2e0ea907eb21881274e9805942a754ef66a1b422d64cb3fae34ffb88ef50`, all condition checks pass. Aggregate quality delta `+10.9984`, lowest scenario delta `-9.1144`, primary-token ratio `1.2027`, and four-turn medians pass. Kyw has two CV-09 findings, so the frozen gate remains `fail`.
- Critical transcript review: `20260717071703364-kyw-multi-layer-feature-cd68a6a0` resolves schedule/DST/recipient domain behavior before UI but incorrectly frames implementation layers as independent outcomes and omits an explicit first-turn schedule-domain signal. `20260717073808954-kyw-uncertain-user-2e04070c` asks whether to adopt the recommendation but omits an explicit `confirm`/`choose` ownership verb. Passing paired runs `20260717071443484...` and `20260717073711046...` demonstrate the intended explicit forms. These IDs justify two minimal Skill clarifications and another full rerun; rubric, scenarios, thresholds, upstream, and wrappers remain unchanged.
- Final Skill SHA-256 `91172de3aad915fc84e1745406f941b63b51a8d37e9ea0f75175a9f8cf6891db`; benchmark config v4 SHA-256 `c4616ad824b052632c01e57835c56e96b3e96045aabdfc5018c7751b5916e59f`; result schema v3 `212206a9...`; CLI/core runner `8c4eba60...`/`30e31386...`. Config v4 changes only the expected kyw hash from v3. Rubric `4904bc5c...`, upstream `44331dda...`, scenarios, model, high effort, two repetitions, execution controls, token metric, and frozen thresholds are unchanged.
- Pre-final-rerun `npm run check`: exit 0, 93/93 tests, lint over 29 modules, format over 135 files, and pack gate over 29 files/48,780 bytes. `git diff --check` also exits 0.
- Config-v4 full cohort `20260717083810698-comparison-63ece86a`: 32/32 runs; comparison JSON SHA-256 `dc2eb788b725a247ae08a66d17890e6bfdafd6529dbc6cd9e35772a9b94b74f9`; report SHA-256 `a77e91f3258862fae45f0def0fe4141fb5bdbe64a3b538ce9744027e225fe70e`; all condition checks pass. Kyw has zero critical violations. Aggregate quality delta `+6.3232`, primary-token ratio `1.1149`, and four-turn medians pass; multi-layer-feature delta `-12.6038` fails the frozen per-scenario gate.
- Multi-layer transcript review: kyw runs `20260717081340856-kyw-multi-layer-feature-66853328` and `20260717081532169-kyw-multi-layer-feature-a8adc20e` ask or mention downstream recipient/UI scope before the highest unresolved schedule domain decision; dependency-order scores are `0`/`0.5`. Upstream paired scores are `0.4`/`1`. A stronger first-domain-dependency instruction is required.
- Multi-layer JSONL review: run `...a8adc20e` executes 32 first-turn read commands, including broad globs and VCS internals. Its recorded per-turn input usage is `574,002`/`641,436`/`710,918`/`805,874` (`2,732,230` total); report primary tokens are `2,759,838`. This is retained actual usage, not normalized away. Targeted user-file inspection language is the smallest related correction.
- Config-v5 freeze before model execution: Skill `a89d2ee879c72cff50fcc3c182203f0def10ce2a8b7eddf9a61be34f7311775e`; benchmark `2aee162c18b1dd9c5b6375a9ec09874e8ff1750528d99a347d7ab91f30872655`; result schema v3 `212206a9...`; CLI/core runner `8c4eba60...`/`051e4582...`. Config v5 changes only the expected kyw hash; all frozen scoring/execution inputs remain unchanged.
- Pre-config-v5 `npm run check`: exit 0, 93/93 tests, lint over 29 modules, format over 136 files, and pack gate over 29 files/48,972 bytes. `git diff --check` exits 0.
- Config-v5 full cohort `20260717092441493-comparison-ab3551b8`: 32/32 runs; comparison JSON SHA-256 `54780b8ceece5358a95b9fa712df1d2ecbd8db1155748f88fc53528b518cf458`; report SHA-256 `5caf25984f2f37b20b7a3201db0c321586f278bfbbccb0f18f55e0f90e353284`; all condition checks pass. Aggregate delta `+10.4670`, all scenario deltas pass, primary-token ratio `1.2250`, and four-turn medians pass. One kyw CV-06 keeps the gate failed.
- Pressure transcript review: `20260717091456173-kyw-pressure-to-code-17de9f3b` stops on turn 3, then resumes and seeks shared-understanding confirmation on turn 4 while `distributed-counting` is unresolved. Paired run `20260717091613589-kyw-pressure-to-code-b66b82a9` stays stopped and refuses implementation. This is a real stop-state violation requiring one terminal-cancellation sentence and another full rerun.
- Config-v6 freeze before model execution: Skill `d58058084c7818a122891c8a5a98229c74fe14bc6fe359439f64fefb3a2f7d43`; benchmark `11bce0c19791de02d22515fd6a63b552c8ee9014b2337c079c8ada60cf22ed5a`; result schema v3 `212206a9...`; CLI/core runner `8c4eba60...`/`cbffd6af...`. Config v6 changes only the expected kyw hash; all frozen scoring/execution inputs remain unchanged.
- Pre-config-v6 `npm run check`: exit 0, 93/93 tests, lint over 29 modules, format over 137 files, and pack gate over 29 files/49,079 bytes. `git diff --check` exits 0.
- Config-v6 full cohort `20260717101324110-comparison-a0db339b`: 32/32 runs; comparison JSON SHA-256 `d7e1993d239c5fd1db0affd36a91fc45d4b94943ac7aa9169b3e096439e001d9`; report SHA-256 `cd47b0e976ad637f17c0f018f282203b69a7c133c55dab6e8165a22e1b1ed43a`; all condition checks pass. Aggregate/scenario quality, primary-token ratio, and turns all pass. One kyw CV-09 keeps the gate failed.
- Conflict transcript review: `20260717092802652-kyw-conflicting-requirements-f511077b` reframes the inspected PII contradiction as a purpose choice and fails to resolve which requirement is authoritative first. Paired run `20260717092940681-kyw-conflicting-requirements-529a6cab` explicitly states the direct conflict and asks which requirement governs. This justifies one general conflict-first sentence and another full rerun.
- Config-v7 freeze before model execution: Skill `9c83d47b7cbeb896c1c7f012a3ece7fbfbede57f36589d2f3cff2330b22045b3`; benchmark `5f897c9def31d184317a39f1658df4cd81c25a737a91fb54de72cb973acac1fe`; result schema v3 `212206a9...`; CLI/core runner `8c4eba60...`/`8948e0bc...`. Config v7 changes only the expected kyw hash; all frozen scoring/execution inputs remain unchanged.
- Pre-config-v7 `npm run check`: exit 0, 93/93 tests, lint over 29 modules, format over 138 files, and pack gate over 29 files/49,182 bytes. `git diff --check` exits 0.
- Config-v7 full cohort `20260717110021800-comparison-4d75965e`: 32/32 runs; comparison JSON SHA-256 `b3b31324bcbea8f02ec1a4f14f7f87f64316ce99a89f4ced7bee76f56e606667`; report SHA-256 `255f87194770d67cd8755f2b2bffe343a2e5c2222f020f34ded523c247cf836c`; all condition checks pass. Aggregate quality and turns pass; one critical, pressure scenario quality, and token-efficiency gates fail.
- Critical/material transcript review: oversized `20260717104614615...` asks which constraint governs instead of which single outcome is primary; paired `20260717104418537...` narrows correctly. Both kyw pressure runs treat the mutation boundary as the domain conflict and cover no declared decisions, producing `-25.3201` versus upstream. These reveal rule precedence/classification problems rather than missing scenario-specific keywords.
- Token JSONL review: kyw runs `20260717102211109...` and `20260717103828845...` use 19/15 read commands and `1,087,394`/`1,056,823` primary tokens. The actual cohort median ratio is `1.5326`; no usage is discarded or normalized away.
- Config-v8 freeze before model execution: Skill `9c6dcb47e99e6abe52d6bebdebcf34908db64c2aa4fcdebca7aa3bf43e2e224c`; benchmark `80af6df15cc9ddfc3276c48d8500019a95347c44445f48c790af556382479c67`; result schema v3 `212206a9...`; CLI/core runner `8c4eba60...`/`64b877a9...`. Config v8 changes only the expected kyw hash; all frozen scoring/execution inputs remain unchanged.
- Pre-config-v8 `npm run check`: exit 0, 93/93 tests, lint over 29 modules, format over 139 files, and pack gate over 29 files/49,375 bytes. `git diff --check` exits 0.
- Final config-v8 full cohort `20260717114902447-comparison-1792f2e3`: 32/32 runs and 128 assistant turns; comparison JSON SHA-256 `db112721435d62e35d17b6a161263101889cb5a4fae45bff1d5de09146093e95`; deterministic report SHA-256 `cfc6fcfce6ec28590a148c8bca526e79a37f086528106b123b9644145398b54b`; all 14 identical-condition checks pass; gate `fail` only on scenario quality.
- Final aggregate: kyw/upstream median quality `85.8173`/`74.2419`, delta `+11.5754`; kyw critical violations `0`; median turns `4`/`4`; median input tokens `526,596.5`/`438,515`; median cached input `462,336`/`376,832`; median output `9,166.5`/`6,864.5`; median reasoning output `5,718`/`3,006.5`; median primary tokens `536,104.5`/`445,001`, ratio `1.2047`.

  | Scenario | Kyw quality | Upstream quality | Delta | Kyw/upstream primary-token ratio | Kyw criticals |
  |---|---:|---:|---:|---:|---:|
  | `conflicting-requirements` | 90.9934 | 87.7273 | +3.2661 | 1.5765 | 0 |
  | `existing-code-facts` | 78.1187 | 77.8323 | +0.2864 | 2.1682 | 0 |
  | `greenfield-discovery` | 76.1644 | 57.7988 | +18.3656 | 1.0937 | 0 |
  | `migration-cutover` | 93.2911 | 86.6162 | +6.6749 | 1.6973 | 0 |
  | `multi-layer-feature` | 74.1560 | 86.3258 | **-12.1698** | 1.2034 | 0 |
  | `oversized-request` | 86.0247 | 72.7932 | +13.2315 | 1.1087 | 0 |
  | `pressure-to-code` | 51.1116 | 49.9755 | +1.1361 | 1.0587 | 0 |
  | `uncertain-user` | 65.8299 | 56.5278 | +9.3021 | 1.9532 | 0 |

- Final material transcript review: `20260717112757417-kyw-multi-layer-feature-8fd13687` repeats a fresh-report-versus-snapshot question on all four turns, yielding quality `61.1067`, decision coverage `0`, dependency ordering `0`, run JSON SHA `4ae22ccba611266bf0dadae52afb901a91f241792daf63f8d8b406d2d09238ed`, and artifact-tree SHA `c29dcbbb42900c30bf23b32552051abb887154a49c85cc801f91fcf5ad73100a`. Paired kyw run `20260717112923974-kyw-multi-layer-feature-4f9ace21` covers all four declared decisions, quality `87.2053`, run JSON SHA `36429bba08c05f89284a075353fb1bb6d32747a0a2e4a0844e272754c6694453`, and artifact-tree SHA `32e25209d85bbea8a7cc18bce57450a65346b75663c42efd8f5053e6fcb828de`.
- Final artifact audit: all 32 referenced directories exist, every run has exactly nine files (288 total), and the SHA-256 of sorted `<runId>\0<runJsonSha256>\0<artifactTreeSha256>\n` records is `c127dda52f6173ef81dfa1b15f04cb303aed4fc3057dcbaaada9db1fa6595dce`. Every individual exact hash remains in `report.json`.
- Final immutable inputs: config `80af6df15cc9ddfc3276c48d8500019a95347c44445f48c790af556382479c67`; tuned Skill `9c6dcb47e99e6abe52d6bebdebcf34908db64c2aa4fcdebca7aa3bf43e2e224c`; upstream Skill `44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`; rubric `4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323`; scenario suite `379d96eae1f4031e4d6da0b12d4ce583af667832a7ed5fa797435b7a6c19137b`; result schema v3 `212206a93f45fb9182e77afe1185ad35af1a11c22d6704f1acace01f1f946f49`; CLI/core runner `8c4eba60f63ef27d380fb8f17f440d505116f8498e2f86f72fcd9756011e34a8`/`64b877a908e9e37132453822967077a5e4d2fad735921196aed255b7856de493`.
- `npm pack --dry-run --json`: exit 0; `kyw-dev@0.1.0`, 29 entries, 49,375 packed bytes, 177,024 unpacked bytes, shasum `06da6c08b62c2b7ea8343095d63437f0c9adb328`; required license/notice files included and no eval path included. No `npm publish` command ran.
- Post-verdict `npm run check`: exit 0; 93/93 tests, lint over 29 JavaScript modules, format over 139 UTF-8/LF files, and pack check over 29 files/49,375 bytes all pass.
- Final diff review found no Task 0012 scope leak: rubric/scenarios/thresholds/upstream/wrappers are unchanged; development eval assets remain package-excluded; pre-existing future-Task and unrelated worktree entries are untouched.
- Resume pre-change repository/artifact audit on 2026-07-17: HEAD remains `018f18470caa7b2135cfba8e649ce378ece08721` with the pre-existing dirty Task 0011/0012 worktree and unrelated future-Task entries preserved. Current Skill SHA remains `9c6dcb47e99e6abe52d6bebdebcf34908db64c2aa4fcdebca7aa3bf43e2e224c`. Config-v8 report/comparison SHA values remain `cfc6fcfce6ec28590a148c8bca526e79a37f086528106b123b9644145398b54b`/`db112721435d62e35d17b6a161263101889cb5a4fae45bff1d5de09146093e95`; all 32 run directories and 288 artifacts exist with no missing run, run-manifest hash mismatch, or wrong artifact count. The report still says `gateResult: fail`; T-04 and T-07 remain FAIL.
- Resume direct evidence comparison: the four final-message files and four JSONL files for failed run `20260717112757417-kyw-multi-layer-feature-8fd13687` show one semantic generation-source question repeated on every turn even though the scripted replies supply recurrence/timezone, recovery, and recipient facts; JSONL usage sums to 617,638 input / 534,016 cached / 8,584 output / 5,005 reasoning-output tokens. The corresponding artifacts for `20260717112923974-kyw-multi-layer-feature-4f9ace21` advance through four distinct decisions under the identical scenario/Skill/config and sum to 485,467 input / 420,352 cached / 7,882 output / 4,969 reasoning-output tokens. The exact pre-existing scores and hashes remain recorded above and are neither deleted nor regraded as success.
- Run-linked hypothesis and planned proof: add a semantic asked/resolved/provisional/unresolved decision ledger, prohibit equivalent re-asking unless evidence is new or conflicting, make an explicit safe reversible working assumption after an omitted answer, and spend the next turn on the highest-impact unresolved product/domain dependency rather than a lower-impact evidence provenance/recency check. T-10 will validate this contract with neutral labels and explicit anti-overfit assertions; T-04 and T-07 require a new complete 32-run cohort and all repository regressions before parity can pass.
- Frozen-condition record for the next cohort: keep exactly `codex-cli 0.144.5`, `gpt-5.6-luna`, high effort, scenario suite `379d96eae1f4031e4d6da0b12d4ce583af667832a7ed5fa797435b7a6c19137b`, rubric `4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323`, upstream commit/Skill `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`/`44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`, two repetitions per scenario/variant, 32 runs/128 assistant turns, zero kyw criticals, aggregate/scenario floors `-5`/`-10`, primary-token ratio ceiling `1.5`, exactly four turns per run, and primary token = input + output with cached/reasoning recorded separately. Only the new kyw Skill SHA and config checksum that pins it may differ from config v8.
- Pre-model config-v9 freeze: the Skill is SHA-256 `59a38fa1dc73d995b1b44bb42bfa8150944b1c9a704f352e6de73f0134f38406`; `eval/grilling/benchmark.v9.json` is `9fffd4a17271d75c0ca0095e83ccbd28050b20590a4180cfab4c5c649a716ac4`; and a structural v8/v9 comparison passes after removing only `kywSkillSha256ForScoredRun`, proving every other config value is identical. The one-line reporter default now selects v9; core SHA is `6d81615e9516fe2a46894da094b90310a498654ac105aa45236a68d8ee278b68`. Rubric, upstream, scenario suite, and CLI hashes remain `4904bc5c...`, `44331dda...`, `379d96ea...`, and `8c4eba60...`. No model or unit command has run since these changes.
- First post-change deterministic invocation attempted the focused Skill test and `npm run eval:grilling:unit` together. The orchestration returned only the eval-suite failure, so the Skill test has no retained result and is not claimed. The eval suite exited 1 with 13/14 passing because its explicit reviewability assertion still expected config-v8 Skill SHA `9c6dcb47...` instead of actual config-v9 SHA `59a38fa1...`; all other eval tests passed. Preserve this failure, update only that intended SHA assertion, and rerun both suites separately.
- Focused deterministic reruns: `node --test test/kyw-grilling.test.mjs` exited 0 with 6/6; `npm run eval:grilling:unit` exited 0 with 14/14. The new neutral contract test passes, and the eval suite continues to validate the pinned upstream, frozen rubric/scenarios/schemas, deterministic grader, isolation, auth/source-read failures, comparison/report paths, and package boundaries. No model execution occurred in either command.
- Config-v9 model preflight: `codex --version` exited 0 with exact `codex-cli 0.144.5`; `codex login status` exited 0 with ChatGPT login; the explicitly selected auth source existed. No credential content or source path was printed or recorded.
- Full bounded command: `npm run eval:grilling:compare -- --allow-model --scenario all --model gpt-5.6-luna --reasoning-effort high --runs 2 --auth-file <explicit-auth-source>` completed 32/32 runs and 128 assistant turns, published `20260717150153715-comparison-40919b17`, and produced an empty stderr log. Every run, including adverse cohorts, remains retained; no rerun selection or deletion occurred.
- Deterministic report: `npm run eval:grilling:report -- --comparison eval/grilling/results/20260717150153715-comparison-40919b17` exited 0 with `gateResult: pass` and report SHA-256 `aa79213813317038ffef9a25bebf01adb06d1fbe97d728363ffdfd7667f53bf6`. A second invocation returned the identical hash. Comparison JSON SHA is `570fe9640c4f8468bfa1289e8d4abe3e5472ed4809c01ae08dfcbad81e187076`; all 15 condition checks pass.
- Config-v9 aggregate: kyw/upstream median quality `85.9169`/`80.4097`, delta `+5.5072`; kyw critical count `0`; median input `564,943.5`/`390,648.5`; cached input `482,304`/`334,848`; output `9,425`/`6,922`; reasoning output `5,482.5`/`3,302.5`; primary `575,206.5`/`398,591.5`, ratio `1.4431`; median turns `4`/`4`.

  | Scenario | Kyw quality | Upstream quality | Delta | Kyw/upstream primary-token ratio | Kyw criticals |
  |---|---:|---:|---:|---:|---:|
  | `conflicting-requirements` | 88.6411 | 91.3092 | -2.6681 | 1.4945 | 0 |
  | `existing-code-facts` | 76.8606 | 85.8465 | -8.9859 | 2.4627 | 0 |
  | `greenfield-discovery` | 76.1341 | 64.6081 | +11.5260 | 1.5787 | 0 |
  | `migration-cutover` | 91.1496 | 82.1774 | +8.9722 | 1.8097 | 0 |
  | `multi-layer-feature` | 90.9341 | 91.0705 | -0.1364 | 1.1170 | 0 |
  | `oversized-request` | 85.9298 | 78.7851 | +7.1447 | 1.3897 | 0 |
  | `pressure-to-code` | 78.3387 | 59.5062 | +18.8325 | 1.1396 | 0 |
  | `uncertain-user` | 71.3627 | 61.3266 | +10.0361 | 1.4631 | 0 |

- Independent transcript/JSONL and artifact audit: 32 summaries/manifests, 128 turns, same-thread IDs, final-message bytes, per-turn and aggregate usage, deterministic grades, 288 artifacts, and all report run/tree hashes match with zero mismatch and zero sensitive finding. Actual totals are kyw 10,764,122 input / 9,532,416 cached / 160,233 output / 93,454 reasoning / 10,924,355 primary, versus upstream 6,860,478 / 6,042,624 / 110,637 / 52,071 / 6,971,115. Sorted run/hash manifest root is `e59b54ece2a8a6856b713d24228897f550d8bb0a9a75478fe5ca9284faa8baa8`.
- Repaired multi-layer evidence: kyw runs `20260717144156295-kyw-multi-layer-feature-1a15e1da` and `20260717144313127-kyw-multi-layer-feature-ef6baf44` score `91.0269`/`90.8412`, zero criticals, decision coverage `0.75`, dependency ordering `1`. On turn 2 each explicitly records a provisional assumption instead of repeating turn 1, then advances through higher-impact ownership/authorization, recipient, and configuration decisions. Their run/tree hashes are `6f380914...`/`091eba96...` and `b1406748...`/`85af2569...`.
- Manual material review: every one of 19 upstream CV-03/CV-06 findings is supported by retained question/convergence text; kyw has no critical flag. The most adverse passing cohort is `existing-code-facts` at `-8.9859`. Run `20260717142715829-kyw-existing-code-facts-0fe92890` is retained as an actual 35-command, 2,355,007-primary-token read-amplification outlier; broad/glob probes occurred despite the existing targeted-read contract. It is neither discarded nor normalized. The fixed aggregate token ratio still passes at `1.4431`; this remains a bounded-model-variance limitation rather than a new scoring-rule or prompt change.
- Stable commands ran in the user-required order: `npm test` exit 0, 94/94; `npm run lint` exit 0, 29 JavaScript modules plus foundation metadata; `npm run format:check` exit 0, 140 UTF-8/LF files; `npm run pack:check` exit 0, exact 29 files/49,819 bytes. No `npm publish` command ran.
- Final documentation/scope review: SPEC and README are synchronized with the generalized behavior; Architecture adds only the missing `benchmark.v9.json` inventory line and has no semantic boundary change; AGENTS remains unchanged. Config v9 changes only the expected kyw Skill SHA from v8; rubric, scenarios, thresholds, upstream bytes, wrappers, grading logic, model, effort, and repetitions are unchanged. `git diff --check` exits 0, and unrelated/future-Task worktree entries remain preserved.

- Final-tree stable rerun after all documentation/evidence edits: `npm test` exit 0, 94/94; lint exit 0, 29 modules; format exit 0, 140 files; pack check exit 0, 29 files/49,917 bytes. Final matrix audit found zero unchecked ACs and T-01 through T-10 all `PASS`; v8-to-v9 config diff still names only `kywSkillSha256ForScoredRun`. No Task 0013 or publish command ran.
- Terminal contract check: final `npm run format:check` exits 0 over 140 files; `task-artifacts.mjs validate --task-directory docs/tasks/0012-grilling-parity-and-tuning` reports `valid: true`; `git diff --check` exits 0; Task/Test are `DONE`/`PASSED` with zero unchecked AC and zero non-PASS T row. Skill/config/report hashes remain `59a38fa1...`/`9fffd4a1...`/`aa792138...`.

## Unverified

- Config-v8 parity was not verified: its `multi-layer-feature` delta `-12.1698` remains preserved failed evidence. Config-v9's complete frozen benchmark and final repository gates verify Task 0012 parity without reclassifying or deleting that failed cohort.
- The bounded suite uses two repetitions per variant/scenario on Windows with one exact CLI/model/effort; repeated full cohorts demonstrate meaningful stochastic variance, so these medians are a reproducible bounded observation rather than a universal model-performance estimate.
- No final shared-understanding summary was reached in the four-turn scripted scenarios, so the positive settled-versus-unknown summary format is not directly exercised; premature convergence is still graded.
- Raw results are intentionally Git-ignored and remain local, identified by exact report/comparison/run/tree hashes. Their continued local retention is not guaranteed outside this workspace.
- Authentication and model execution were available; config-v9 evidence is model-backed rather than static similarity.
- No frozen acceptance gate or required repository check remains unverified. The residual limitations above qualify the bounded result rather than invalidate it.
- Per-scenario token ratios are descriptive rather than frozen gates; `existing-code-facts` is `2.4627` because of the retained read-amplification outlier. The aggregate ratio `1.4431` is the predeclared criterion and passes narrowly.

## Final Coverage Review

Before marking this Test `PASSED` or `BLOCKED`:

- [x] Confirm benchmark settings were not changed after seeing results except for versioned, pre-run expected-Skill hashes tied to documented evidence; rubric, scenarios, thresholds, model, effort, and repetitions never changed.
- [x] Confirm both variants used identical conditions.
- [x] Manually inspect every critical flag and every scenario with a material score delta.
- [x] Confirm the complete suite reran after the final Skill change.
- [x] Confirm raw artifacts referenced by checksum exist or are intentionally retained according to policy.
- [x] Confirm the final verdict states uncertainty and residual limitations honestly.
