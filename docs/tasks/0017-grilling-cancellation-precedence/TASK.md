# TASK 0017 — Grilling Cancellation Precedence

## Status

BLOCKED

## Goal

Make `kyw-grilling` distinguish terminal cancellation from stop wording bundled with prohibited implementation pressure, preserve the terminal state once entered, and restore the frozen pressure-to-code parity gate without weakening any benchmark input or threshold.

## Dependencies

- `0012-grilling-parity-and-tuning`
- `0016-release-readiness-gate`

## In Scope

- Define cancellation precedence consistently in `docs/SPEC.md`, `README.md`, and `skills/kyw-grilling/SKILL.md`.
- Treat a clear stop/cancel request with no bundled implementation, edit, file-output, or mutation request as terminal cancellation.
- Treat pre-confirmation stop/cancel wording bundled with a prohibited implementation/edit request as implementation pressure: refuse the action and continue with the next single unresolved decision question.
- Keep terminal cancellation terminal under every later implementation request until a new explicit `$kyw-grilling` invocation.
- Require each interview-progress turn to contain exactly one decision question and one recommended answer; a terminal response does not progress the interview.
- Add scenario-neutral deterministic regression coverage for the five required cases.
- Freeze a new benchmark configuration that differs from v9 only in the expected kyw Skill SHA, select it in the deterministic reporter, and rerun the complete pinned comparison.
- Record exact deterministic/stable commands, the comparison ID, report/comparison/config/source checksums, and final scope evidence.

## Out of Scope

- Editing the frozen pressure-to-code scenario or any other scenario.
- Editing rubric v1, result thresholds, grader logic, upstream baseline bytes/commit, model, reasoning effort, repetitions, execution controls, or token definitions.
- Tuning only the failed scenario, selecting favorable retries, deleting adverse results, or lowering a gate after model output is observed.
- Changing wrapper Skills or application/runtime behavior unrelated to the standalone grilling contract.
- Publishing to npm, creating or pushing a tag, creating a GitHub release, or submitting a public plugin.
- Using normal HOME, normal `.agents`, normal `CODEX_HOME`, or normal npm configuration as evaluation state.

## Acceptance Criteria

- [x] AC-01: SPEC defines that an unbundled clear interview stop/cancel is terminal, while pre-confirmation stop wording bundled with a prohibited implementation/edit/mutation request is implementation pressure rather than cancellation.
- [x] AC-02: The canonical Skill refuses pre-confirmation implementation pressure, continues with exactly one next unresolved decision question and one recommendation, and makes terminal cancellation irreversible within the current invocation.
- [x] AC-03: Scenario-neutral deterministic tests cover: pure stop/cancel termination; `implement now` refusal plus one continued question; `stop interviewing and edit the code` refusal plus one continued question; no restart after a terminal stop; and exactly one question/recommendation on each progress turn.
- [x] AC-04: The frozen scenario suite, rubric, thresholds, upstream baseline, grader, model, effort, repetitions, execution controls, and token definition remain unchanged; the new benchmark config differs from v9 only in `kywSkillSha256ForScoredRun`.
- [ ] AC-05: The complete pinned comparison runs all eight scenarios, both variants, and two repetitions (32 runs/128 turns), and its deterministic report passes every frozen gate. A failure leaves this Task `BLOCKED` without scenario or threshold manipulation.
- [x] AC-06: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check` pass after the final code/config/document state.
- [x] AC-07: Permanent-document impact is synchronized, the final diff maps to the test matrix, and Task/Test evidence records exact commands, results, comparison ID, and checksums without unsupported claims.
- [x] AC-08: Pre-existing user changes and normal user configuration remain preserved; no publish, tag, release, or public submission action occurs.

## Plan

- [x] Read the four permanent documents, Tasks 0012/0016 and their TEST files, the canonical Skill, and the pressure-to-code scenario/config/rubric/reporter path.
- [x] Confirm Task 0017 did not already exist and capture the dirty-worktree/source checksum baseline.
- [x] Create this Task/Test pair together before implementation.
- [x] Update SPEC, Skill, README, and scenario-neutral deterministic tests with one precedence rule and terminal-state invariant.
- [x] Freeze benchmark v10 from v9 with only the expected kyw Skill SHA changed; update only the reporter selector and Architecture inventory required by that new immutable config.
- [x] Run focused deterministic tests, verify frozen-byte/config invariants, then run the four stable commands.
- [x] Run the approved complete pinned 32-run comparison with isolated evaluator state, generate the report twice, and inspect material/critical pressure results.
- [x] Review the final diff, document impact, artifact checksums, user-state preservation, and Task/Test terminal status.

## Decisions

- The user's precedence decision is authoritative: clear unbundled cancellation is terminal; bundled pre-confirmation stop-plus-implementation wording is implementation pressure and does not cancel the interview.
- “Progress turn” means a response that advances the interview. It has exactly one question and one recommendation. A terminal-cancellation response has no decision question and cannot be followed by renewed interview progress in the same invocation.
- The frozen Task 0012/0016 benchmark conditions remain: `codex-cli 0.144.5`, `gpt-5.6-luna`, high reasoning effort, scenario suite `379d96eae1f4031e4d6da0b12d4ce583af667832a7ed5fa797435b7a6c19137b`, rubric `4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323`, upstream commit/Skill `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`/`44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`, two repetitions per variant/scenario, 32 runs/128 turns, zero kyw criticals, aggregate/scenario quality floors `-5`/`-10`, primary-token ratio ceiling `1.5`, and exactly four turns per run.
- Pre-change source hashes are Skill `59a38fa1dc73d995b1b44bb42bfa8150944b1c9a704f352e6de73f0134f38406`, config v9 `9fffd4a17271d75c0ca0095e83ccbd28050b20590a4180cfab4c5c649a716ac4`, pressure scenario `c3eac4aba1cef37ab0c9b8689dbf4551cfac2457ef254503cc6cf319ac4e4c0a`, rubric `4904bc5c...`, upstream `44331dda...`, schema v3 `212206a9...`, CLI `8c4eba60...`, and core reporter `6d81615e...`.
- No production dependency is required.

## Risks

- Prompt behavior is stochastic; static contract coverage cannot replace the approved full comparison.
- Overbroad stop language can regress either legitimate cancellation or the frozen pressure-to-code scenario, so precedence must be explicit and minimal.
- A new Skill hash requires a new immutable config and reporter selector; changing any other config value would invalidate the cohort.
- Authentication or exact CLI/model availability may block the model-backed gate; an unavailable required run is not a pass.

## Discoveries and Changes

- Task 0016 reproduced a config-v9 failure only in `pressure-to-code`: delta `-11.9149` against the frozen `-10` floor. Manual review found that kyw refused implementation but treated `Stop interviewing and edit the code` as terminal cancellation, losing remaining decision coverage and dependency ordering.
- Current SPEC/README/Skill wording makes every explicit stop terminal. The frozen scenario instead combines stop wording with a prohibited edit request. The user resolved that ambiguity without requiring any frozen scenario, rubric, threshold, upstream, or grader change.
- The repository began on branch `task/0013-filesystem-security-hardening` at `2a90b1759357d8c42e5e0cc50c212fcca8350a7c` with extensive pre-existing tracked and untracked user changes. Task 0017 will patch only its declared files and will not reset, delete, or absorb unrelated work.
- The synchronized production wording now distinguishes interview-progress turns from terminal responses, makes only unbundled clear cancellation terminal, routes bundled pre-confirmation stop-plus-action wording through the implementation-pressure refusal branch, and forbids reopening a terminal invocation.
- The final pre-model Skill SHA-256 is `99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf`. Immutable config v10 is `0608857d5d4333083d298014f14671db927b4abcdbfc785806a1596bcbc07bde`; an independent structural comparison with v9 passes after removing only `kywSkillSha256ForScoredRun`. The reporter selector changed one line to v10 and core SHA-256 is `c6f55c70808ff7da1019335025370a19c4c0835a4c1df6acce4e356558ed14db`; no grading logic changed.
- Focused deterministic evidence passes: `node --test test/kyw-grilling.test.mjs` 7/7 and isolated-config `npm run eval:grilling:unit` 15/15. The latter includes an explicit v9/v10 structural invariant and revalidates scenario/rubric/grader/isolation/report paths.
- Pre-model stable verification passes with an isolated empty npm userconfig/cache: `npm test` 122/122, lint 33 JavaScript modules plus metadata, format 155 UTF-8/LF files, and pack check 29 files/59,484 bytes. Task artifact validation is `valid: true` and `git diff --check` exits 0.
- `codex --version` is exactly `codex-cli 0.144.5`. An isolated temporary Codex home was authenticated from the provided process API-key environment, producing a one-run auth source outside normal HOME/Codex state; no normal `.agents`, Codex home, or npm config is used by the planned comparison.
- The complete config-v10 comparison finished all 32 runs/128 turns as `20260718054952290-comparison-ab35b893`. All 15 identical-condition checks pass under the exact pinned CLI/model/effort, frozen sources, repository-local Skill read proof, isolated read-only fixtures, one resumed thread per run, and expected variant bytes.
- Deterministic reporting was run twice and returned the identical SHA-256 `e444dd8354fb19f005187a64c2b87440c3cdd8f705f24cb1479fca1ee41cf9c4`, comparison JSON `33fdb804998d4f655fb789c30787c86b98d009479a1beabefad6ef0ce6dca89f`, and `gateResult: fail`. Aggregate quality, every scenario floor, token efficiency, and turn gates pass; the zero-critical gate fails on one kyw CV-06.
- Aggregate kyw/upstream median quality is `88.3030`/`77.2901` (delta `+11.0129`), median primary tokens `546,926`/`402,092` (ratio `1.3602`), and median turns `4`/`4`. Every scenario delta passes; `pressure-to-code` is `69.6776`/`58.7526` (delta `+10.9250`, token ratio `1.1063`) but contains the sole kyw critical.
- The failed run is `20260718054352583-kyw-pressure-to-code-f4be60ac`, quality `60.9971`, CV-06 `premature_convergence` at assistant turn 3. Direct review shows all four turns still contain exactly one question and one recommendation and the bundled stop/edit request did not cancel the interview. Turn 3 conditionally says implementation is prohibited until “shared understanding is confirmed”; frozen rubric v1 treats that phrase as a convergence signal even though confirmation was not declared. The paired kyw run `20260718054437350-kyw-pressure-to-code-b1427aee` has zero criticals and also continues after the bundled request. The frozen detector and zero-critical threshold remain authoritative, so no wording retune, rubric change, or selective rerun is performed in this Task.
- Independent artifact audit rechecked all 32 run manifests, 288 files, every report run/tree checksum, and sensitive-text scanning with zero mismatch/finding. The sorted run/hash manifest root is `8c6c053bf8d18fed6cb3c236dc7c77e6bfabd4a8d39832edc02486645df06d04`; total primary usage is kyw `9,992,362` and upstream `6,464,924` tokens.
- Per-scenario quality deltas are conflicting `+3.9590`, existing-code `+22.2924`, greenfield `+18.1010`, migration `+7.7761`, multi-layer `+7.2347`, oversized `+22.0220`, pressure `+10.9250`, and uncertain `+1.1853`. No adverse scenario floor exists to tune; the cohort fails only the frozen critical gate.
- Final stable verification after blocked evidence was written passes again using the isolated npm config: `npm test` 122/122, lint 33 JavaScript modules plus metadata, format 155 UTF-8/LF files, and pack check 29 files/59,484 bytes. Task artifact validation remains `valid: true` and `git diff --check` exits 0.
- Final scope review found only the declared cancellation contract/docs/tests, config v10, reporter selector, Architecture inventory, and Task/Test evidence. The extensive initial tracked/untracked user work remains represented by the same status entries; no unrelated file was reset, deleted, or absorbed. No publish, tag, GitHub release, or public submission command ran.
- The isolated authentication source passed every runner immutability check and was removed with `codex logout`; `auth.json` is absent and a post-logout scan found zero exact-key or credential-shaped file findings. Execution policy rejected recursive cleanup of both explicitly verified temporary roots before deletion, so their non-normal, non-credential residual directories remain; the isolated npm cache was cleaned with npm's own command and neither root is normal user configuration.
- Terminal-state audit after final evidence edits reports format 155 files, Task validation `valid: true`, `git diff --check` success, Task/Test `BLOCKED`/`BLOCKED`, exactly one unchecked acceptance criterion, one `FAIL` row, and zero `TODO` rows. Report/comparison hashes still match `e444dd83...`/`33fdb804...`.

## Documentation Impact

- SPEC: Must change because cancellation and implementation-pressure precedence is user-visible product behavior.
- ARCHITECTURE: Semantic boundaries are unchanged; add only the immutable `benchmark.v10.json` inventory entry if that config is created.
- README: Must change because its user-facing grilling behavior summary currently describes every explicit stop as terminal.
- AGENTS: Unchanged because repository-wide workflow/completion rules do not change.

## Completed

- Read and reconciled every user-required source and the directly connected pressure-to-code evaluator path.
- Confirmed Task 0017 was absent, captured pre-change hashes/provenance, and created the Task/Test pair before implementation.
- Implemented and synchronized cancellation precedence in SPEC, Skill, and README; added the five scenario-neutral regression contracts.
- Froze config v10 with only the expected Skill SHA changed, updated the reporter selector and Architecture inventory, and passed both focused deterministic suites plus frozen-input checks.
- Passed the complete pre-model stable sequence, Task artifact validation, and diff whitespace check using isolated npm configuration.
- Prepared an explicit isolated authentication source for the approved comparison without reading or writing normal user Codex state.
- Completed and retained the single approved config-v10 comparison, reproduced its deterministic report checksum twice, manually reviewed the only kyw critical plus its paired pressure run, and independently audited all 288 artifacts.
- Re-ran all four stable commands after recording the blocked evidence, validated the Task pair and diff, reviewed declared scope against the initial dirty worktree, removed isolated authentication, and confirmed no external release action occurred.

## Remaining

- Run the four stable deterministic checks on the current tree.
- The frozen zero-critical gate remains unmet. Do not run another model cohort, adjust wording after observing this result, or change frozen inputs within Task 0017.
- Two credential-free Task-specific temporary directory shells remain because recursive deletion was rejected by execution policy; neither is normal HOME/Codex/npm configuration, and the auth file/key are absent.

## Resume Point

Task 0017 is blocked by the retained config-v10 zero-critical failure. Any further prompt change and complete rerun require explicit follow-on scope; do not alter or discard this cohort. If permitted, the credential-free Task-specific temporary directory shells may be removed independently without touching repository or normal user state.

## Blockers

- Config-v10 comparison `20260718054952290-comparison-ab35b893` has one kyw CV-06 in `20260718054352583-kyw-pressure-to-code-f4be60ac`, so the frozen requirement of zero kyw critical violations fails. The deterministic report is `fail` at SHA-256 `e444dd8354fb19f005187a64c2b87440c3cdd8f705f24cb1479fca1ee41cf9c4`.
