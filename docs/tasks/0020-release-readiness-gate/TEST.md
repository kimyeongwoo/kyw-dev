# TEST 0020 — Release Readiness Gate

## Status

BLOCKED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Prior gate and remediation evidence: Tasks `0016`, `0017`, `0018`, and `0019`
- CI contract: `../../../.github/workflows/ci.yml`
- Package and lifecycle contracts: `../../../package.json`, `../../../scripts/packed-release-check.mjs`, and `../../../scripts/release-gate-isolation.mjs`
- Behavior contracts: `../../../scripts/grilling-eval.mjs`, `../../../scripts/audit-smoke.mjs`, and the four packaged Skills
- Current official requirements: the current Codex manual sections for plugin structure, marketplaces, and Skill authoring/discovery loaded through the `openai-docs` Skill

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 next number and diff attribution are unambiguous | Compare local Task dirs/refs, remote heads, Git status/index, Task 0016 snapshot, and Tasks 0017–0019 path sets | Audit | PASS | `0020` was absent locally/remotely; `2a90...→c769...` is the recorded 78-path Tasks 0011–0016 snapshot, and current-hash delta from `c769...` contains only Task 0016 final evidence plus declared Tasks 0017–0019 paths. Index was empty. |
| T-02 | AC-02 candidate SHA, dedicated branch, push, and detached cleanliness | Commit reviewed paths, push normally, add detached worktree, and record SHA/status | Release provenance | PASS | Candidate `54b9f8207c51cbc22af2d0a1c3faac1f04b09310`; one 89-path commit on `task/0020-release-readiness-gate`; local/remote refs exact; clean detached worktree at `C:\1kyw\5.personal\kyw_dev_task0020_verify_54b9f820`. |
| T-03 | AC-03 all nine hosted jobs pass for exact SHA | Dispatch CI, inspect run `headSha`, job names/conclusions, and relevant native logs | Hosted CI | PASS | Run `29636806057`, exact candidate `54b9f820...`; all nine required job names concluded `success`. |
| T-04 | AC-04 requested source commands pass | Execute six named commands in the detached worktree | Regression/Packaging | PASS | Each named command exited 0; direct test 130/130; `release:ci` packed SHA-256 `cd85d391...d121`; detached status remained clean. |
| T-05 | AC-05 real tarball identity, exact contents, and extracted validators pass | Pack once, hash/list/extract, run allowlist/hygiene/legal/CLI and current plugin/four-Skill validators | Packaging/Release E2E | PASS | Retained tarball SHA-256 `cd85d391...d121`, 60,140 bytes/29 files; safe list and byte parity; legal/CLI/current plugin/four Skill validators passed. |
| T-06 | AC-06 full pinned grilling parity passes | Verify frozen config, run all eight scenarios/two variants/two repetitions, report twice, audit artifacts and flags | Model E2E/Eval | PASS | Comparison `20260718090729697-comparison-e718e167`: 32/32 runs, 128 turns, 288 artifacts; report `ddead7bf...` twice; all frozen gates pass; zero kyw criticals. |
| T-07 | AC-07 filesystem hardening passes locally and in exact-SHA hosted lanes | Run focused suite and inspect native link/type evidence in hosted logs | Security/CI | PASS | Local 35/35 with seven native junctions/zero skips; all seven hosted Stable lanes logged seven native fixtures, zero skips, and success. |
| T-08 | AC-08 audit deterministic/read-only/fix contracts pass | Run focused deterministic suite and both isolated model smoke modes | Unit/Model E2E/Security | FAIL | Deterministic 16/16 and fix smoke pass. Read-only exits 1 with two `OUTPUT_REDIRECTION_GRAMMAR` diagnostics rendered `[matched=>]`; `matched=` is the label and `>` the captured operator, while the retained previews lack match offsets/quoting context. Fixture/tree/Git remain invariant. No fix/retry. |
| T-09 | AC-09 guarded direct lifecycle passes without protected-state change | Run the standalone required release-isolation runner and inspect all direct steps, sentinels, env, cleanup | Distribution E2E/Security | PASS | All 11 direct steps matched expected exits; force preservation passed; byte-identical tarball; path guard, cleanup, protected sentinels, and parent env passed. |
| T-10 | AC-10 marketplace/plugin lifecycle passes on the same tarball | Require Codex, verify add/discover/install/cache byte parity/remove flow | Plugin E2E | PASS | All six marketplace/plugin steps passed under Codex `0.144.5`; exactly four Skill names/bytes; removal and isolated cleanup passed. |
| T-11 | AC-11 four packed-Skill fresh sessions pass | Run one bounded isolated session per Skill with source-read and fixture/auth invariants | Model E2E | PASS | Four separate sessions read exact packed Skill commands and met grilling/init/task/audit predicates; every fixture/Git/auth invariant passed. |
| T-12 | AC-12 npm name and official requirements are current | Isolated read-only npm probes; current manual inspection; official/current plugin and Skill validation | Registry/Documentation/Audit | PASS | `2026-07-18T09:33:07Z`: E404 and exact search count 0; current manual and extracted plugin/four-Skill validators pass. ENEEDAUTH remains explicit. |
| T-13 | AC-13 no forbidden action and exact later commands are ready | Audit refs/releases/registry and record exact guarded publish plus rollback/deprecation commands without execution | Release safety | PASS | Exact guarded commands below; zero local/remote tags, releases, PRs, or registry package; no forbidden command executed. |
| T-14 | AC-14 exact-SHA mapping, document impact, diff coverage, and final result are complete | Reconcile every row/result/path/hash and terminal states | Audit | PASS | All evidence maps to `54b9f820...`/`cd85d391...`; detached tree clean; only Task 0020 evidence differs afterward; permanent docs unchanged; terminal status/result are `BLOCKED`. |

Every acceptance criterion maps to at least one row. Any required unavailable or failed gate remains `FAIL`/`BLOCKED`; this Task does not repair it.

## Regression Coverage

- [x] Exact candidate SHA is pushed and cleanly materialized in a detached worktree.
- [x] Ubuntu/macOS/Windows Node 22 and Node 24 jobs pass for that SHA.
- [x] Ubuntu Node 26 compatibility, packed release, and required aggregate jobs pass for that SHA.
- [x] `npm test`, lint, format, pack, check, and release:ci pass.
- [x] Real tarball checksum, exact list, extracted hygiene/legal/CLI, plugin, and four Skill validators pass.
- [x] Complete frozen grilling parity passes without selective retry or changed inputs.
- [ ] Filesystem hardening, audit deterministic, audit read-only, and audit fix gates pass.
- [x] Guarded user/project/force lifecycle and isolated marketplace lifecycle pass from real packed bytes.
- [x] All four fresh-session Skill smokes pass with exact source-read and state-preservation evidence.
- [x] Read-only npm name and current official requirement checks pass or record a blocker.
- [x] Normal protected state, credentials, parent environment, unrelated work, and forbidden release state remain unchanged.
- [x] Exact publication and recovery commands are prepared but not run.

## Commands

Planned commands; Results will retain only commands actually run and their outcomes. Authentication paths and values must remain redacted.

- Provenance: `git status --short --branch`, `git diff`, `git diff --cached`, `git diff --check`, path/hash comparisons against `c769b6f8...`, candidate `git rev-parse HEAD`, `git ls-remote`, and clean detached-worktree status.
- Candidate: intentional `git add` of the reviewed path set, one `git commit`, and normal `git push -u origin task/0020-release-readiness-gate`.
- Hosted: `gh workflow run CI --ref task/0020-release-readiness-gate`, then `gh run list/view` and direct nine-job/log inspection with exact `headSha` matching.
- Source: `npm test`, `npm run lint`, `npm run format:check`, `npm run pack:check`, `npm run check`, and `npm run release:ci`.
- Artifact: isolated `npm pack --ignore-scripts --json --pack-destination <approved-temp-root>`, SHA-256, `tar -tf`, safe extraction, exact-file comparison, and extracted validators.
- Grilling: `npm run eval:grilling:unit`; frozen-input hash/structural checks; `npm --silent run eval:grilling:compare -- --allow-model --scenario all --model gpt-5.6-luna --reasoning-effort high --runs 2 --auth-file <explicit-isolated-auth-source>`; reporter twice; artifact/flag audit.
- Filesystem: `node --test test/skill-installation.test.mjs` plus exact-SHA hosted native-log inspection.
- Audit: `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs`; read-only and fix `npm --silent run eval:audit:smoke -- --allow-model --mode <mode> --model gpt-5.6-sol --reasoning-effort high --auth-file <explicit-isolated-auth-source>`.
- Lifecycle: `node ./scripts/release-gate-isolation.mjs` in required-marketplace mode.
- Fresh Skills: four isolated `codex exec` sessions over the extracted packed Skills, each with explicit model/effort/auth source, ignored normal config/rules, bounded fixture, and source-read/state predicates.
- Registry/docs: isolated `npm ping`, `npm view kyw-dev ... --json`, `npm search kyw-dev --json`, read-only `npm whoami`; current Codex manual target sections; current official/local plugin and Skill validators.
- Safety/final: local/remote tags, GitHub releases, package registry state, temporary-root residue, source checkout status, Task validator, and final diff/package coverage review.

`npm run release:check` and every `npm publish` form are prohibited in this Task.

## Prepared Publication Commands — Not Executed

These are the exact commands that would publish the recorded candidate and are retained for audit only. Do not run them while this gate is `BLOCKED`. A later fixed and newly gated candidate must regenerate every SHA, run, branch, and artifact value rather than reuse this block. The guards intentionally fail closed if this recorded candidate's identity differs:

```powershell
$candidateSha = '54b9f8207c51cbc22af2d0a1c3faac1f04b09310'
$candidateBranch = 'task/0020-release-readiness-gate'
$tarball = 'C:\1kyw\5.personal\kyw_dev_task0020_state_54b9f820\artifact\kyw-dev-0.1.0.tgz'
$expectedTarballSha256 = 'cd85d391687a2a69ed6e20c06f645db63e82f0a8150882d3c40e4217691cd121'
$repository = 'kimyeongwoo/kyw-dev'
$registry = 'https://registry.npmjs.org/'
$runId = '29636806057'

if ((git -C 'C:\1kyw\5.personal\kyw_dev_task0020_verify_54b9f820' rev-parse HEAD) -ne $candidateSha) { throw 'candidate mismatch' }
$remoteSha = git ls-remote --heads origin "refs/heads/$candidateBranch" | ForEach-Object { ($_ -split '\s+')[0] }
if ($remoteSha -ne $candidateSha) { throw 'remote candidate mismatch' }
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $tarball).Hash.ToLowerInvariant() -ne $expectedTarballSha256) { throw 'tarball mismatch' }
$expectedJobs = @(
  'Stable / Ubuntu / Node 22.x',
  'Stable / macOS / Node 22.x',
  'Stable / Windows / Node 22.x',
  'Stable / Ubuntu / Node 24.x',
  'Stable / macOS / Node 24.x',
  'Stable / Windows / Node 24.x',
  'Stable / Ubuntu / Node 26.x compatibility',
  'Packed release / Ubuntu / Node 24.x',
  'Required / credential-free CI'
)
$ci = gh run view $runId --repo $repository --json headSha,status,conclusion,jobs | ConvertFrom-Json
if ($ci.headSha -ne $candidateSha -or $ci.status -ne 'completed' -or $ci.conclusion -ne 'success') { throw 'CI mismatch' }
$successfulJobs = @($ci.jobs | Where-Object { $_.conclusion -eq 'success' } | ForEach-Object { $_.name })
$missingJobs = @($expectedJobs | Where-Object { $_ -notin $successfulJobs })
if ($ci.jobs.Count -ne 9 -or $missingJobs.Count -ne 0) { throw "required CI job mismatch: $($missingJobs -join ', ')" }

npm whoami --registry=$registry
if ($LASTEXITCODE -ne 0) { throw 'npm identity unavailable' }
$nameProbe = @(npm view kyw-dev name version dist-tags --json --registry=$registry 2>&1)
$nameProbeExit = $LASTEXITCODE
if ($nameProbeExit -eq 0 -or ($nameProbe -join "`n") -notmatch 'E404') { throw 'npm name is no longer proven unclaimed' }
npm publish $tarball --access public --registry=$registry
if ($LASTEXITCODE -ne 0) { throw 'npm publication failed' }
npm view kyw-dev@0.1.0 name version dist.integrity dist.shasum --json --registry=$registry

git tag -a v0.1.0 $candidateSha -m 'kyw-dev 0.1.0'
git push origin refs/tags/v0.1.0
gh release create v0.1.0 "$tarball#kyw-dev-0.1.0.tgz" --repo $repository --verify-tag --title 'kyw-dev 0.1.0' --generate-notes
```

## Prepared Recovery Commands — Not Executed

If tag/release publication must be rolled back before npm publication:

```powershell
gh release delete v0.1.0 --repo kimyeongwoo/kyw-dev --cleanup-tag --yes
git tag -d v0.1.0
```

If `0.1.0` reaches npm with a release defect, do not overwrite it. Deprecate it and move `latest` only after a separately fixed, fully gated `0.1.1` publication verifies:

```powershell
npm deprecate kyw-dev@0.1.0 'Deprecated: use kyw-dev@0.1.1.' --registry=https://registry.npmjs.org/
npm dist-tag add kyw-dev@0.1.1 latest --registry=https://registry.npmjs.org/
```

Only with separate explicit destructive approval and after rechecking current npm policy:

```powershell
npm unpublish kyw-dev@0.1.0 --force --registry=https://registry.npmjs.org/
```

## Results

- Task-number/diff preflight completed before this pair was created. Local Task names ended at `0019`; local and remote refs had no `task/0020-*`. Branch `task/0020-release-readiness-gate` was created without moving or clearing the worktree.
- Initial checkout parent is `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`; Task 0016 snapshot is `c769b6f8ed10f1a4159e468ec1abc97508a50530`. Snapshot diff contains exactly 78 recorded Tasks 0011–0016 paths. A current-file hash comparison to that snapshot contains only Task 0016 final evidence and Tasks 0017–0019 declared changes. No staged or unexplained path existed.
- Task 0017 is not terminally successful: `TASK.md` and `TEST.md` both say `BLOCKED` after one config-v10 kyw CV-06. This is retained as dependency evidence rather than silently reconciled with the request's “completed” label.
- Current official-manual preflight used the `openai-docs` helper, which reported its cached manual already current. Targeted official sections confirm the candidate's required plugin/Skill/marketplace surfaces in principle; exact candidate validation is not yet claimed.
- The candidate commit is `54b9f8207c51cbc22af2d0a1c3faac1f04b09310` (89 paths, 12,311 insertions, 400 deletions). `git push -u origin task/0020-release-readiness-gate` was a normal new-branch push; `git ls-remote` returned the exact SHA. The detached worktree at `C:\1kyw\5.personal\kyw_dev_task0020_verify_54b9f820` reported `HEAD (no branch)` and no porcelain changes.
- Hosted run `29636806057` (`headSha=54b9f820...`) completed successfully. Job IDs: packed Ubuntu/24 `88060476070`; Stable Ubuntu/24 `88060476089`, macOS/22 `88060476101`, Ubuntu/22 `88060476105`, Windows/22 `88060476110`, macOS/24 `88060476113`, Ubuntu/26 compatibility `88060476114`, Windows/24 `88060476115`; required aggregate `88060566634`. Every conclusion was `success`.
- `npm test`, `npm run lint`, `npm run format:check`, `npm run pack:check`, `npm run check`, and `npm run release:ci` each exited 0 under isolated npm cache/userconfig. Direct test result was 130 pass/0 fail/0 skip; the worktree remained clean.
- Real tarball `kyw-dev-0.1.0.tgz`: SHA-256 `cd85d391687a2a69ed6e20c06f645db63e82f0a8150882d3c40e4217691cd121`; SHA-1 `a7e73511054a7f936db0bc66b4161856d52634ca`; integrity `sha512-bn2gMsrSUTtA/XDAkCHQpPl+N+4nnwvnRqQUrCKp1drYqSaJJC1MSvIaD+Uuza9MD5Ist4wem0M4FR4P/iwXKg==`; 60,140 packed/232,256 unpacked bytes; 29 files. npm metadata and archive list matched exactly, all entries were safe, all extracted hashes matched candidate sources, legal hashes matched, CLI help/version passed, and current `validate_plugin.py` plus four `quick_validate.py` runs passed. A first auxiliary hygiene regex falsely included the intentionally packaged nested Task adapter; corrected top-level hygiene found zero forbidden entries.
- Focused `node --test test/skill-installation.test.mjs` passed 35/35 with seven verified native Windows junction fixtures and zero skips. Direct log inspection of all seven hosted Stable jobs found seven verified native fixtures per lane (`dir` or `junction`) and zero skips.
- Audit deterministic command passed 16/16. Read-only model smoke (`gpt-5.6-sol`, high, explicit auth copy) exited 1 after 264.1 seconds with `READONLY_MUTATION_ATTEMPT`, attempt count 2, tree SHA unchanged (`a0776c4e...` before/after), and Git invariant true. Both attempts cite `OUTPUT_REDIRECTION_GRAMMAR` and render `[matched=>]`, meaning the `matched=` label followed by the captured `>` operator. Because the retained command preview is capped at 600 characters and records no match offset or local quoting context, this evidence does not prove a literal arrow or an executable redirect. No result artifact was published and no retry ran. Fix smoke exited 0 after 325.1 seconds: `verdict=PASS`, source read true, plan before mutation true, auth unchanged, and exact changed paths were the two Task files, source, and test.
- Grilling unit passed 15/15. Config-v10 SHA-256 `0608857d5d4333083d298014f14671db927b4abcdbfc785806a1596bcbc07bde` matched current kyw Skill `99e633b0...` and upstream Skill `44331dda...`, frozen CLI/model/effort/suite/rubric/repetitions, and 32-run/128-turn contract. The one full comparison completed in 2,631.1 seconds without selective retry. Deterministic report ran twice with identical stdout and report SHA-256 `ddead7bf5dd9c1df61c5c1f8f75c9ee60216d0f1fb7ad56849e2a5cc3697f04e`; all gate checks are true. Aggregate quality delta is `+5.9767`, worst scenario delta `-8.1132`, primary-token ratio `1.3246`, and kyw critical count 0. Independent audit rechecked all 32 run JSON files, 128 turns/JSONLs, 288 artifacts, hashes, frozen controls, thread/source/auth/fixture invariants, and sensitive scan with zero failure; manifest root `414bf70609268039b221af8e3e0c8bdf7ad673258ee24050f9dd3165ad754cea`.
- `node ./scripts/release-gate-isolation.mjs --help` executed the runner because it has no help branch. The authorized gate itself exited 0: tarball SHA-256 `cd85d391...d121`; path guard and cleanup passed; protected normal `.agents`/Codex/npm sentinels and parent environment were unchanged. Direct results were install/update/doctor/uninstall for user and project all 0, force fixture install 0, expected preservation refusal 4, and force uninstall 0. Unknown and unrelated hashes remained unchanged.
- The same runner's required marketplace phase passed under `codex-cli 0.144.5`: marketplace add, plugin discovery/install/list/remove, and marketplace removal all exited 0. Installed Skills were exactly `kyw-audit`, `kyw-grilling`, `kyw-init`, and `kyw-task`, with packed-byte parity.
- Four separate extracted-Skill sessions used `gpt-5.6-sol`, high effort, read-only sandbox, isolated user/Codex/npm paths, ignored normal config/rules, strict config, and no inherited shell environment. Grilling exited 0 in 51.1 seconds, read the Skill twice, asked one question with a recommendation, and has final SHA `f18bb063...`. Init exited 0 in 196.3 seconds, read twice, selected `adopt`, asked one recommendation-backed question, final `0a1ebbfc...`. Task exited 0 in 131.9 seconds, read twice, split four independent outcomes and recommended the first, final `5604410e...`. Audit exited 0 in 561.5 seconds, read the Skill and reference twice each, reported F-01 through F-04 and final `BLOCKED`, final `449dcb64...`. All four external fixture hashes, empty Git statuses, and auth hashes were unchanged.
- The final `openai-docs` helper run reported its Codex manual already current. Targeted official sections confirm required `.codex-plugin/plugin.json`, plugin-root `skills/`, Skill `SKILL.md` name/description front matter, optional `agents/openai.yaml`, repository/user discovery, explicit invocation with implicit invocation disabled, `./`-relative contained local-marketplace paths, and npm plugin download without lifecycle scripts. Current extracted `validate_plugin.py` and four `quick_validate.py` executions passed.
- Isolated npm registry probe at `2026-07-18T09:33:07.5848514Z`: ping exit 0; `npm view kyw-dev ...` exit 1/E404; search exit 0 with 20 returned records and zero exact `kyw-dev`; isolated `npm whoami` exit 1/ENEEDAUTH. No credential value entered a log. Name state is time-sensitive and no publication identity is established by this gate.
- Protected before/after snapshots contain the same 2,330 path/type/length/hash records for normal `.agents`, Codex auth/config/plugins/skills, and npm userconfig; explicit auth bytes still match. Candidate worktree is detached and clean. Source-checkout diff after candidate is exactly this Task/Test evidence pair.
- Final forbidden-state audit: zero local tags, zero remote tags, zero GitHub releases, zero PRs for the candidate branch, unchanged remote `main` `f5e35fe33ffc0316b22791865423232b9f2da463`, candidate remote `54b9f820...`, and exact-SHA CI success. No direct-main push, force-push, tag, npm publication/dry-run, GitHub release, merge, or public submission occurred.
- Terminal documentation audit after all evidence: Task artifact validator returned `valid: true`; format check passed 163 UTF-8/LF files; `git diff --check` exited 0; there is exactly one unchecked acceptance criterion, one `FAIL` matrix row, and zero `TODO` rows. Candidate tree is `0e9dc9a8365c50ae13ef3db3f6c2094b31d6a0db`; the detached worktree is clean and the two-file source diff is evidence-only.

## Unverified

- Audit read-only is a retained exact-candidate failure and makes AC-08/T-08 fail. It was neither repaired nor rerun.
- Task 0017 remains terminally recorded as `BLOCKED/BLOCKED` in the candidate even though this gate's independent config-v10 cohort passes. Old dependency evidence was not rewritten.
- npm authentication, registry installation, publication, tag/release creation, merge, and public plugin submission remain intentionally unexecuted. Name availability and official requirements must be rechecked immediately before any separately approved publication.

## Final Coverage Review

- [x] Confirm every result names the candidate SHA and, where applicable, the same tarball SHA-256.
- [x] Confirm all nine hosted job names and conclusions directly.
- [x] Confirm all source, extracted-package, model, filesystem, audit, lifecycle, marketplace, and Skill gates actually ran.
- [x] Confirm no selective retry, tuning, defect fix, normal-state mutation, or forbidden external action occurred.
- [x] Compare every candidate path and meaningful behavior with this matrix and the permanent-document routing.
- [x] Validate this Task/Test pair and record every failure, limitation, residual risk, and prepared command.
- [x] Record exactly one final result.

## Final Result

BLOCKED
