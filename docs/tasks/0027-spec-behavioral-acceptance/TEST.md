# TEST 0027 — SPEC Behavioral Acceptance

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially §§6.1, 7, 9, 10, 11, 13, and §15 AC-04 through AC-08.
- Architecture constraints: `../../ARCHITECTURE.md`, especially Skills, Task/Test lifecycle, package boundary, verification, and isolation responsibilities.
- Repository rules and contributor entry: `../../../AGENTS.md` and `../../../README.md`.
- Historical dependency evidence: Tasks 0020 and 0026, read-only and unchanged.
- Packed behavior sources: the four canonical Skills, their direct references/templates/support, and one real extracted npm tarball from the exact Task 0027 source state.
- Scenario definitions and fixture intent: `../../../scripts/spec-behavioral-e2e.mjs`, `../../../test/spec-behavioral-e2e.test.mjs`, and `../../../test/fixtures/spec-behavioral-e2e/`; nested execution mode is prohibited.
- Evidence method: `CURRENT_SESSION_DIRECT`, performed by the active Codex model in this same session.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 exact starting state, availability, branch creation, and historical preservation | Compare repository root, exact refs/status/diffs, live remote heads, PRs, Actions, Task directories, and branch/PR collisions before mutation | Audit/GitHub | PASS | Root `C:/1kyw/5.personal/kyw_dev`; local `task/0026-spec-behavioral-e2e@b384a4c...`, clean and `+0/-0`; live main `46ea3ddd...`; PR #11 head/merge exact; run `29922054134` 9/9 SUCCESS; no later commit/PR/run or Task 0027 collision; normal fetch and new branch at `46ea3ddd...`. |
| T-02 | AC-02 real tarball identity, exact package boundary, Skill hashes, and source/packed equality | Run isolated `npm pack --json`, hash/list/extract, compare allowlist and every packed file to source, and verify development exclusions | Packaging | PASS | Source `46ea3ddd...`; Codex `0.145.0`; `kyw-dev-0.1.0.tgz` 62,049/237,768 bytes, 29 files, SHA-256 `ff484e1d...`; every extracted file equals source and development/state inputs are absent. |
| T-03 | AC-03 / SPEC AC-04 empty initialization and existing-project adoption | Directly apply packed `kyw-init`/`kyw-grilling` contracts to separate S-01/S-02 fixture copies; inspect/write/verify exact paths and preservation predicates | Behavioral E2E (`CURRENT_SESSION_DIRECT`) | PASS | S-01 created exactly four permanent docs after one recommended greeting decision/confirmation; sentinel and installed/Git bytes stayed fixed. S-02 inspected and tested first, preserved README block/application/test/package bytes, and changed only README plus three missing permanent docs. |
| T-04 | AC-04 / SPEC AC-05 and AC-06 next Task/Test creation plus pre-confirmation refusal | Directly apply packed `kyw-task` create contract to S-03; verify exact allocation, pair/matrix, one-question rule when applicable, confirmation boundary, and source immutability | Behavioral E2E (`CURRENT_SESSION_DIRECT`) | PASS | Existing IDs `0001`-`0003`; packed adapter ran once and returned exact `0004-configurable-greeting-punctuation`; valid `DRAFT/DRAFT` pair has five mapped rows; only that pair changed; implementation/permanent docs unchanged pending current-summary confirmation. |
| T-05 | AC-05 / SPEC AC-05 resume from repository state | Directly apply packed numeric-resume contract to an independent copy of the S-03 result; verify reads, Git/handoff recovery, no repeat/allocation/mutation/terminal overclaim | Behavioral E2E (`CURRENT_SESSION_DIRECT`) | PASS | Separate S-04 copy was byte-identical to S-03; current model read packed Task workflow/reference, four permanent docs, pair, Git state/diff, Completed/Remaining/Resume Point; validator passed; no test repeat, allocation, file mutation, or terminal claim. Same-session simulation only. |
| T-06 | AC-06 / SPEC AC-07 intentionally untested branch detection | Prove S-05 generic suite passes and casual branch is uncovered, then directly perform final-diff/Test review without product/test repair | Behavioral E2E (`CURRENT_SESSION_DIRECT`) | PASS | `npm test` 1/1 PASS covered only `formal`; direct diff review found the separate casual return and no non-formal test. Product/test hashes stayed fixed; fixture pair became truthful `BLOCKED/BLOCKED` with T-02 casual coverage BLOCKED and no unsupported PASS. |
| T-07 | AC-07 / SPEC AC-08 ordinary bounded prompt | Directly make the S-06 source/test/README change without a Task, run focused verification, and review all permanent-document routes | Behavioral E2E (`CURRENT_SESSION_DIRECT`) | PASS | Pre/post `npm test` 1/1 PASS; exact mutations `README.md`, `src/greeting.mjs`, `test/greeting.test.mjs`; no Task. SPEC/Architecture/AGENTS/package/Skills/Git hashes stayed fixed and their durable meaning was explicitly reviewed as unaffected. |
| T-08 | AC-08 per-scenario evidence completeness and isolated-state integrity | Record fresh-copy pre/post lists/hashes, Git status/diff, commands/exits, mutations, preserved paths, protected hashes, writable-root attribution, evidence label/limitation, and cleanup | Integration/Audit | PASS | Six distinct fixture roots; exact tree/Git/Skill/preservation hashes and statuses below. HOME/USERPROFILE/CODEX_HOME/npm cache+config/TEMP/TMP all pointed below Task-owned state. Aggregate evidence validator exited 0. Cleanup remains part of T-10 final safety. |
| T-09 | AC-09 failure, retry, and minimal-defect policy | Preserve every first failure; audit classification and unchanged retry conditions; if fixed, require smallest allowed diff, focused regression, and fresh affected scenario evidence | Audit/Regression | PASS | No behavioral failure or repository defect occurred. All command/evidence mistakes remain listed below. Only S-04 used one permitted fresh-copy infrastructure retry; product/Skill wording and verdict conditions were unchanged; no selective favorable-result retry or repair occurred. |
| T-10 | AC-10 focused/full verification, package allowlist, historical immutability, and final diff coverage | Run Task/evidence validators, affected tests, stable/full commands, release CI, diff check, hash historical files, inspect refs/releases/publication/normal state, and map every changed behavior | Integration/Packaging/Audit | PASS | Fixture contract 6/6; focused 25/25; standalone `npm test` 220/220; lint 54; format 216; pack 29/62,049; `release:ci` repeated all and packed SHA `ff484e1d...`; validators/diff/safety/cleanup PASS. |
| T-11 | AC-11 exact terminal verdict and non-overclaim boundary | Reconcile all matrix rows and required evidence; validate terminal pair and assert historical/release/publication claims remain unchanged | Audit | PASS | All T-01 through T-10 PASS; Task/Test `DONE/PASSED`; exact verdict `SPEC_AC04_AC08_DIRECTLY_VERIFIED`; explicit same-session and historical/release non-overclaim retained. |

## Regression Coverage

- [x] The four canonical Skill/source bytes and their directly referenced packaged support remain unchanged unless a scenario proves a permitted minimal defect.
- [x] Task 0017 remains historical `BLOCKED/BLOCKED`; Task 0020 remains `BLOCKED/BLOCKED`; Task 0026 remains `CANCELLED/BLOCKED` with no Git diff or status entry.
- [x] Exact package allowlist contains no Task 0027 docs, repository docs/tasks, root tests/fixtures/eval sources, generated archives, or machine-local/config/auth files.
- [x] Source checkout, packed/extracted Skills, `.git`, auth source, sentinels, and unrelated fixture files remain unchanged except for each scenario's predeclared allowed mutation set and the fully recorded S-04 copied-index cache event.
- [x] No normal HOME, normal `.agents`, normal/configured Codex home, normal npm config/cache, tag, release, Task 0028, or publication state is created or mutated.
- [x] Stable commands and `npm run release:ci` pass after final evidence reconciliation.
- [x] CI evidence remains distinct from direct behavioral acceptance evidence.

## Commands

Planned commands are listed before execution; Results and the command/evidence table retain only commands actually run and their outcomes.

- Pair/baseline: `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory ./docs/tasks/0027-spec-behavioral-acceptance`; exact Git status/diff/ref and SHA-256 snapshot commands.
- Codex identity: `codex --version` using the current installed CLI; no `codex exec` form is allowed.
- Pack: isolated `npm pack --ignore-scripts --json --pack-destination <TASK_OWNED_ROOT>`, SHA-256, npm file metadata inspection, safe extraction, exact source/packed comparisons, and package exclusion checks. `npm publish --dry-run` is not allowed.
- Fixtures: one isolated copy/Git baseline per S-01 through S-06, with S-04 copied from S-03's completed fixture state into a separate root.
- Scenario verification: scenario-specific read, edit, Git, hash, and test commands executed directly by this active Codex model under the extracted packed Skill contracts.
- Focused: existing fixture/harness tests and any deterministic test added for a proven minimal fix.
- Full: `npm test`; `npm run lint`; `npm run format:check`; `npm run pack:check`; `npm run release:ci`; `git diff --check`.
- Final safety: exact historical Task hashes, package allowlist/exclusions, local/remote refs, tags, releases, Task 0028 absence, normal-state before/after hashes, changed-path attribution, and canonical Task/evidence validation.

Prohibited commands include nested `codex exec`, `npm publish`, `npm publish --dry-run`, `npm run release:check`, force/reset/clean/stash/rebase operations, tag/release creation, and CI rerun/retry without new authorization.

## Command and Evidence Table

| ID | Command or procedure | Exit / outcome | Evidence status |
|---|---|---|---|
| E-01 | Local Git root/branch/HEAD/status/index/untracked/ref inventory | Exit 0; exact expected clean Task 0026 state | PASS |
| E-02 | Live `git ls-remote`, PR #11/all-PR inventory, run `29922054134`, and recent Actions inventory | Exit 0; exact expected main/PR/run and no later work | PASS |
| E-03 | Normal `git fetch origin`, post-fetch exact SHA/status check, and `git switch -c task/0027-spec-behavioral-acceptance 46ea3ddd...` | Exit 0; origin/main advanced normally and new branch starts at exact SHA | PASS |
| E-04 | Packaged Task adapter create for `SPEC Behavioral Acceptance` | Exit 0; exact `0027-spec-behavioral-acceptance` pair published atomically | PASS |
| E-05 | Customized Task artifact validation | Exit 0 before packing; valid Task/Test pair | PASS |
| E-06 | Real tarball creation/identity/extraction | Exit 0; exact unpublished 29-file tarball and full source parity | PASS |
| E-07 | S-01 through S-06 direct execution | All six acceptance verdicts PASS; S-05 PASS means required gap detection; no behavioral retry | PASS |
| E-08 | Focused and full verification | Exit 0: fixture 6, focused 25/25, full 220/220, lint 54, format 216, pack 29/62,049, release CI and packed SHA exact | PASS |
| E-09 | Final diff/document/package/safety review | Exit 0; only Task/Test changed, historical/protected/package state intact, owned root removed, no Task 0028/tag/release/publication | PASS |

## Retry and Interruption History

- No behavioral output failed and no favorable-result behavioral retry occurred. S-01, S-02, S-03, S-05, and S-06 each have one valid behavioral execution. S-04 has one invalid infrastructure attempt plus the single permitted fresh-copy infrastructure retry.
- Pre-read: one malformed `rg` expression exited `1`; a corrected targeted read exited `0`. No byte changed.
- Isolated-root setup: PowerShell `New-Item -LiteralPath` was unsupported for this call and created nothing; the unchanged root creation with `-Path` exited `0`.
- S-01 pre-start: the first packed install command accidentally used the source checkout as cwd and installed exactly the managed project Skill inventory there. No behavioral scenario had started. Packed uninstall removed the owned files; verified-empty directories were removed non-recursively; source `.agents` returned absent and source/normal/historical hashes matched baseline before work continued.
- S-01 discarded-root cleanup: initial recursive `Remove-Item` without force partially failed on hidden Git entries; the proposed force call was rejected before execution. The repository's contained-path `defaultRemoveOwnedPath` helper then removed only the two validated disposable attempt roots. The failure evidence remains here.
- S-01 evidence startup: importing a Windows `C:` path as ESM failed with `ERR_UNSUPPORTED_ESM_URL_SCHEME`; the unchanged read-only command used `file:///` and exited `0` before the valid attempt.
- S-02 pre-start: a tool call named the not-yet-created fixture as its cwd and was rejected with `NotADirectory` before its script ran. The path was then created from the source cwd and the sole behavioral attempt proceeded.
- S-02 evidence: post-change `npm test` passed 1/1, then a read-only evidence script had one missing parenthesis and exited `1`; the corrected script on unchanged bytes exited `0`.
- S-03 evidence: the first packed validator call used unsupported `--task-dir` and exited `1`; the correct `--task-directory` call exited `0`. Pair/product bytes were unchanged by the failed call.
- S-04 attempt 1: copying S-03 preserved every byte, but required `git status` refreshed `.git/index` because copied worktree timestamps differed; `.git` aggregate changed `644c1ef2... -> 2bec1575...`. This attempt is invalid and retained; product/Skill/Task bytes did not change.
- S-04 permitted retry: a fresh exact copy again began at product tree `2a94237c...` and Git `644c1ef2...`. Windows Git refreshed only the 4,089-byte index stat cache even with `GIT_OPTIONAL_LOCKS=0`; S-03 vs retry `.git` differed only at `index` (`efd0a1a7... -> 5cd47901...`). After classifying that preparation event, the stabilized valid window proved identical pre/post tree `2a94237c...`, `.agents` `4dc04fd1...`, and `.git` `e314f06c...`, with unchanged refs/objects/status/diff and no model/Skill/criterion change.
- Aggregate evidence validator: four failed read-only drafts remain visible: array-order mismatch, bare Node `git` child `ENOENT`, absolute Git child `ENOENT`, and an incorrect S-01 attempt-root mapping. The final PowerShell-status plus no-child Node validator corrected only its own evidence code and exited `0` on unchanged fixture bytes.
- Protected-state recheck: a fixture-only tree helper rejected the normal Codex plugin `latest` junction, and a follow-up probe named the wrong Task 0017 slug. Both exited before mutation; normal paths were then reviewed with link-aware counts/content hashes plus exact Git diff attribution.
- Post-full-check protected comparison: the metadata-sensitive source `.git` snapshot differed because Git read commands refreshed metadata, while its exact 750-file content tree remained `b165fabe...` and 2,096,308 bytes with unchanged HEAD/refs/status. All normal and historical protected snapshots were byte/metadata identical to their checkpoint. No retry or repair was needed.

## Results

- Exact preflight, safe branch creation, pair creation/validation, real package identity, and S-01 through S-06 direct acceptance all passed.
- Evidence label is exactly `CURRENT_SESSION_DIRECT`. The same active Codex model read the extracted packed bytes and performed every scenario; this is not independent, fresh-session, subagent, cohort, hosted, or additional model-backed evidence.
- No concrete kyw-dev repository defect was found and no production/Skill/test/permanent-document repair was made. Repository scope is still exactly this Task/Test pair.
- Focused commands passed: `node --check`, fixture contract 6/6, and `node --test test/spec-behavioral-e2e.test.mjs` 25/25.
- Standalone required commands passed: `npm test` 220/220; lint 54; format 216; pack check 29 files/62,049 bytes; `git diff --check` exit 0.
- `npm run release:ci` passed independently, including another 220/220 suite and packed release check at exact SHA-256 `ff484e1d17562a2d2da9f574fe7fb8688a9dd0e9de31eae574870df396022f79`.
- The exact Task-owned root was safely removed and verified absent. Final source status contains only this pair; no historical Task, permanent document, Skill, source/test/config/package/workflow path changed.
- Task 0027 verdict: `SPEC_AC04_AC08_DIRECTLY_VERIFIED`.

### Packed tarball identity

- Source: `46ea3ddd4a23bbdaccd75c43335bd70d2c25c465`; Codex: `codex-cli 0.145.0`.
- Tarball: `kyw-dev-0.1.0.tgz`; SHA-256 `ff484e1d17562a2d2da9f574fe7fb8688a9dd0e9de31eae574870df396022f79`; npm shasum `7b90ff21a766b70abadcc9845b6a3b4333dfa0d1`; packed 62,049 bytes; unpacked 237,768 bytes; 29 files.
- Extracted root: `C:/1kyw/5.personal/kyw_dev_task0027_state_46ea3ddd/extract/package`.
- Skill SHA-256: `kyw-audit` `af1d016d7cbab0b8b69f2e4394fd23d32ffae110acb87a2bf69c7f282edb7f60`; `kyw-grilling` `99e633b0c92c7e85b4df43991210843f6b66a1c65efd0e9b5df1db556fd837cf`; `kyw-init` `a926a71916182ef4f345e3aad6c807fb42f6d907316ef506863f66af45a4bf76`; `kyw-task` `03a11f7bf89bd663073ddd5507bf64b6d2f439c5eb5cab0aca161b595511d5ec`.
- Exact file list: `.codex-plugin/plugin.json`, `LICENSE`, `README.md`, `THIRD_PARTY_NOTICES.md`, `bin/kyw-dev.mjs`, `licenses/mattpocock-skills-MIT.txt`, `package.json`, `skills/kyw-audit/SKILL.md`, `skills/kyw-audit/agents/openai.yaml`, `skills/kyw-audit/references/audit.md`, `skills/kyw-grilling/SKILL.md`, `skills/kyw-grilling/agents/openai.yaml`, `skills/kyw-init/SKILL.md`, `skills/kyw-init/agents/openai.yaml`, `skills/kyw-task/SKILL.md`, `skills/kyw-task/agents/openai.yaml`, `skills/kyw-task/references/execution.md`, `skills/kyw-task/scripts/task-artifacts.mjs`, `src/cli/run.mjs`, `src/core/package-info.mjs`, `src/core/skill-installation.mjs`, `src/core/task-artifacts.mjs`, `src/core/template-contracts.mjs`, `templates/project/AGENTS.md`, `templates/project/ARCHITECTURE.md`, `templates/project/README.md`, `templates/project/SPEC.md`, `templates/task/TASK.md`, `templates/task/TEST.md`.

### Direct scenario evidence

| Scenario | SPEC mapping | Pre / post tree SHA-256 | Git / packed state | Exact result |
|---|---|---|---|---|
| S-01 | AC-04 empty init | `e786e6c1...` / `a95bc393...` | Git `37d6835f...`; 19 packed managed files identical; sentinel `ee2086e9...` | PASS: question and confirmed recommendation `Hello, kyw!`; exactly four permanent docs created; no app/Task; sentinel preserved. |
| S-02 | AC-04 adopt | `d8d72fc2...` / `87cb5009...` | Git `d2274748...`; `.agents` `ea3cd5cf...`; preserve block `cd10c585...` | PASS: inspected first; pre/post `npm test` 1/1; README minimally extended plus three missing docs; source `c61977fc...`, test `74ee49ae...`, package `bf078a7c...` unchanged. |
| S-03 | AC-05 create, AC-06 refuse | `cae577e3...` / `2a94237c...` | Git `644c1ef2...`; `.agents` `4dc04fd1...`; only exact pair untracked | PASS: exact next `0004`; valid five-row `DRAFT/DRAFT` pair; one suffix question/recommendation; no confirmation, implementation, permanent-doc edit, or `0005`. |
| S-04 | AC-05 resume | copied tree `2a94237c...`; stabilized pre/post same | `.agents` `4dc04fd1...`; stabilized Git `e314f06c...`; index-cache history above | PASS: same-session resume simulation read required state/handoff and stopped at confirmation; no allocation, repeat, edit, or terminal overclaim. Not fresh/independent evidence. |
| S-05 | AC-07 gap detection | `2a42f1e7...` / `1e0d7c7a...` | Git `25a5c759...`; `.agents` `b108d469...`; source `58336da2...` and test `0ae3d66a...` unchanged | PASS: generic 1/1 PASS did not cover casual; pair truthfully `BLOCKED/BLOCKED`, T-02 BLOCKED; no unexecuted PASS or repair. |
| S-06 | AC-08 ordinary prompt | `77a0ecd4...` / `fec86af2...` | Git `042d5c05...`; `.agents` `63c47050...`; unaffected SPEC `fbaaf3d8...`, Architecture `5ebbe198...`, AGENTS `a724eef2...` | PASS: pre/post 1/1; exactly README/source/test changed; no Task; document impact routed proportionately. |

- Common isolation: each packed install/test command used scenario-owned HOME, USERPROFILE, CODEX_HOME, npm userconfig/cache, TEMP, and TMP below the Task-owned root. Normal auth direct SHA-256 remains `b3c8c5f11348391c8c66406ea58b7acf11f868c04406b6b1fe5779e656d1c81b`; normal `.agents`, Codex Skills/plugins, and npm config counts/bytes match the pre-scenario inventory. Source Git reports only this Task's two untracked files; source Skills and Tasks 0017/0020/0026 have no diff.

## Unverified

- Same-session direct evidence does not establish fresh-session, independent-model, subagent, or model-cohort behavior; those claims are intentionally outside this Task and are not required for its direct verdict.
- Commit/PR/CI/merge/post-merge delivery evidence is reported out-of-band after this single terminal commit; CI success remains repository evidence and is never substituted for S-01 through S-06.

## Final Coverage Review

- [x] Compare the final diff and exact changed-path attribution to this matrix and the authorized scope.
- [x] Map every acceptance criterion and SPEC AC-04 through AC-08 to executed direct evidence.
- [x] Enumerate every meaningful behavior, branch, error path, fallback, compatibility, documentation, and package effect and map it to a test or explicit blocker.
- [x] Confirm every PASS has reproducible command/procedure evidence and every failure/retry remains visible.
- [x] Confirm focused and required full regressions actually ran on the final implementation/package bytes; final evidence-only pair reconciliation is covered by the terminal validator and format/diff checks.
- [x] Confirm source/packed Skill identity, package allowlist/exclusions, and extracted-root cleanup.
- [x] Confirm per-scenario fresh copies, pre/post hashes/Git state, mutation manifests, preservation checks, and `CURRENT_SESSION_DIRECT` limitation.
- [x] Confirm Task 0017/0020/0026 paths and historical states are unchanged and no Task 0028 exists.
- [x] Confirm no normal-state mutation, nested model execution, selective retry, publication, tag, or GitHub Release occurred.
- [x] Validate the terminal Task/Test pair and record exactly one final verdict without release/MVP overclaim.
