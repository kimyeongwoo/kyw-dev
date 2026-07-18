# TEST 0016 — Release Readiness Gate

## Status

BLOCKED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Dependency evidence: Tasks `0010`, `0012`, `0013`, `0014`, and `0015`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 all evidence maps to a clean exact SHA | Record SHA/status and isolate checkout | Release audit | PASS | Dirty source bytes were copied into a detached clean snapshot and committed locally as `c769b6f8ed10f1a4159e468ec1abc97508a50530`; all candidate checks ran there. The source checkout stayed at parent `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`. |
| T-02 | AC-02 hosted CI is green for the SHA | Inspect required GitHub Actions conclusions | Hosted CI | BLOCKED | The candidate SHA has no remote ref and `gh run list --commit c769...` returned no runs. Green dependency run `29595270211` belongs to parent SHA `2a90...`, not the candidate. |
| T-03 | AC-03 source and packed checks pass | Run full command set before/after packing | Release E2E | PASS | Tests 120/120, lint, format, pack, check, and non-publishing `release:ci` passed; retained 29-file tarball passed extract/content/validator/direct-install checks. `release:check` was forbidden because it invokes `npm publish --dry-run`. |
| T-04 | AC-04 grilling parity thresholds still pass | Reproduce pinned benchmark/report checksums | Behavior eval | FAIL | Deterministic 32-run report failed: `pressure-to-code` delta `-11.9149` is below the `-10` floor. Aggregate and all other scenario gates passed. |
| T-05 | AC-05 security and audit regressions pass | Run focused suites and inspect matrix evidence | Security/Behavior | FAIL | Local filesystem 35/35 and deterministic audit 14/14 passed; fix-mode model smoke passed. Exact-SHA hosted platform evidence is absent, and read-only audit smoke failed `READONLY_MUTATION_ATTEMPT`. |
| T-06 | AC-06 direct install lifecycles pass from tarball | Isolated user/project E2E | Distribution E2E | FAIL | Correctly isolated rerun passed the entire product lifecycle, but an earlier PowerShell variable collision temporarily wrote two synthetic files under normal `%USERPROFILE%\.agents`. They were removed and health rechecked; the no-touch contract still failed. |
| T-07 | AC-07 marketplace plugin loads four Skills from tarball | Isolated marketplace install and inspection | Plugin E2E | PASS | Isolated local marketplace add/install/list/remove exposed exactly four Skills whose `SKILL.md` hashes matched the extracted tarball; no lifecycle script was used. |
| T-08 | AC-08 four fresh-session Skill smokes pass | Bounded isolated Codex sessions | Manual/Model E2E | PASS | All four packed-byte repo-local sessions preserved tree/git/auth state and produced their required first-turn/read-only behavior. A separate audit provenance session captured the exact Skill-read command after the first predicate proved too strict. |
| T-09 | AC-09 metadata/legal/runtime/name/docs are current | Re-run metadata and registry/package audits | Release audit | PASS | Package/plugin/legal/docs/runtime values agree; current official validators passed; final isolated npm probe returned E404 and zero exact-name search hits. Availability remains time-sensitive and npm authentication is absent. |
| T-10 | AC-10 release/rollback steps exist and nothing publishes | Review exact commands and external state | Release safety | PASS | Exact candidate commands and recovery paths are recorded below. Registry package, local/remote tags, and GitHub releases remain absent; no publishing/tag/release/submission mutation ran. |
| T-11 | AC-11 final verdict is evidence-backed | Independent final coverage review | Audit | PASS | Failed/blocked rows remain explicit, residual risks are listed, and the sole final recommendation is `BLOCKED`. |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered during the gate.

## Regression Coverage

- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run pack:check`
- [x] `npm run check`
- [ ] `npm run release:check`
- [x] Real tarball checksum and file list recorded.
- [x] Direct user/project install-update-doctor-uninstall lifecycles pass from tarball.
- [x] Local marketplace plugin installation passes from tarball.
- [ ] Grilling parity benchmark passes.
- [ ] Filesystem hardening suite passes across required CI platforms.
- [ ] Audit read-only and explicit-fix behavior passes.
- [x] Four Skill smoke scenarios pass in fresh sessions.
- [ ] No normal user configuration, credentials, package publication, tag, or release changed.

## Commands

All candidate commands ran from the clean detached snapshot unless another root is named. Authentication paths were explicit but are redacted.

- Provenance/tools: `git rev-parse HEAD`, `git status --short`, `git diff --check 2a90b1759357d8c42e5e0cc50c212fcca8350a7c..c769b6f8ed10f1a4159e468ec1abc97508a50530`, and version commands for PowerShell, Git, Node, npm, `gh`, Codex, and Python.
- Hosted state: `git ls-remote origin`, `gh run list --repo kimyeongwoo/kyw-dev --commit c769b6f8ed10f1a4159e468ec1abc97508a50530`, plus direct run/job/log reads for dependency run `29595270211`.
- Source/release: `npm test`, `npm run lint`, `npm run format:check`, `npm run pack:check`, `npm run check`, and `npm run release:ci`.
- Artifact: `npm pack --dry-run --json` and `npm pack --json --pack-destination C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0016-artifacts-c769b6f8`, followed by extraction, hashing, exact-list inspection, packed checks, and current plugin/Skill validators.
- Filesystem/audit deterministic: `node --test test/skill-installation.test.mjs` and `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs`.
- Grilling: `npm run eval:grilling:unit`; then `npm --silent run eval:grilling:compare -- --allow-model --scenario all --model gpt-5.6-luna --reasoning-effort high --runs 2 --auth-file <explicit-auth-source>`; then the reporter twice over the same comparison.
- Audit model: `npm --silent run eval:audit:smoke -- --allow-model --mode readonly --model gpt-5.6-sol --reasoning-effort high --auth-file <explicit-auth-source>` and the same command with `--mode fix`.
- Direct distribution: exact-tarball CLI calls covering user/project install, update, doctor, uninstall, force-uninstall preservation, and guarded cleanup; then isolated `codex marketplace add/list/remove` and `codex plugin add/list/remove` through `pwsh -File codex.ps1`.
- Fresh Skill sessions used the normalized form `codex exec --sandbox read-only --cd <bounded-fixture> --json --ignore-user-config --ignore-rules --strict-config -c 'shell_environment_policy.inherit="none"' -c 'model_reasoning_effort="high"' --model gpt-5.6-sol --output-last-message <isolated-control-file> --ephemeral <prompt>` with per-run isolated HOME/Codex/npm paths.
- Registry/release state: isolated `npm ping`, `npm view kyw-dev ... --json`, `npm search kyw-dev --json`, read-only `npm whoami`, local/remote tag listing, and `gh release list --repo kimyeongwoo/kyw-dev`.

`npm run release:check` was deliberately not run because its final step is `npm publish --dry-run --json`. The user prohibited all `npm publish` execution, including dry-run. `npm run release:ci` and a real pack/extract lifecycle covered every non-publication check.

### Prepared publication commands — not executed

These commands are exact for the observed local candidate. They remain blocked unless this exact SHA is published to the remote, all its required hosted jobs pass, every behavioral blocker is cleared without changing bytes, npm authentication is established, and the tarball hash is reverified.

```powershell
$candidateSha = "c769b6f8ed10f1a4159e468ec1abc97508a50530"
$repository = "kimyeongwoo/kyw-dev"
$registry = "https://registry.npmjs.org/"
$tarball = "C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0016-artifacts-c769b6f8\kyw-dev-0.1.0.tgz"
$expectedSha256 = "bc1886d298e86eda28b0b8deafe2bbded3ac5b9fb2ce6a232ee2ce8da57e6885"

if ((git rev-parse HEAD).Trim() -ne $candidateSha) { throw "Wrong release SHA" }
if (git status --porcelain=v1 --untracked-files=all) { throw "Release checkout is dirty" }
if ((Get-FileHash -LiteralPath $tarball -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedSha256) { throw "Tarball hash mismatch" }
$remoteRefs = git ls-remote origin
if (-not ($remoteRefs | Where-Object { $_ -match "^$candidateSha\s" })) { throw "Candidate SHA has no remote ref" }
$ciRuns = gh run list --repo $repository --workflow CI --commit $candidateSha --json databaseId,headSha,status,conclusion,workflowName | ConvertFrom-Json
$ciRun = $ciRuns | Where-Object { $_.headSha -eq $candidateSha -and $_.status -eq "completed" -and $_.conclusion -eq "success" } | Select-Object -First 1
if (-not $ciRun) { throw "No successful exact-SHA CI run" }
$jobReport = gh run view $ciRun.databaseId --repo $repository --json headSha,conclusion,jobs | ConvertFrom-Json
$requiredJobs = @(
  "Stable / Ubuntu / Node 22.x", "Stable / macOS / Node 22.x", "Stable / Windows / Node 22.x",
  "Stable / Ubuntu / Node 24.x", "Stable / macOS / Node 24.x", "Stable / Windows / Node 24.x",
  "Stable / Ubuntu / Node 26.x compatibility", "Packed release / Ubuntu / Node 24.x", "Required / credential-free CI"
)
foreach ($jobName in $requiredJobs) {
  if (-not ($jobReport.jobs | Where-Object { $_.name -eq $jobName -and $_.conclusion -eq "success" })) { throw "Required CI job is not green: $jobName" }
}
npm run release:ci
npm whoami --registry=$registry
npm view kyw-dev name version dist-tags --json --registry=$registry

npm publish $tarball --access public --registry=$registry
npm view kyw-dev@0.1.0 name version dist.integrity dist.shasum --json --registry=$registry

git tag -a v0.1.0 $candidateSha -m "kyw-dev 0.1.0"
git push origin refs/tags/v0.1.0
gh release create v0.1.0 "$tarball#kyw-dev-0.1.0.tgz" --repo $repository --verify-tag --title "kyw-dev 0.1.0" --generate-notes
```

### Prepared recovery commands — not executed

If npm publication did not occur but a tag/release did, remove only the new release/tag:

```powershell
gh release delete v0.1.0 --repo kimyeongwoo/kyw-dev --cleanup-tag --yes
git tag -d v0.1.0
```

If `0.1.0` reached npm with a release defect, do not overwrite it. Deprecate it, publish a separately gated `0.1.1`, and move `latest` only after that publication verifies:

```powershell
npm deprecate kyw-dev@0.1.0 "Deprecated: use kyw-dev@0.1.1." --registry=https://registry.npmjs.org/
npm dist-tag add kyw-dev@0.1.1 latest --registry=https://registry.npmjs.org/
```

Only under separate explicit approval and current npm unpublish policy would the exceptional destructive command be considered:

```powershell
npm unpublish kyw-dev@0.1.0 --force --registry=https://registry.npmjs.org/
```

## Results

### Provenance and hosted CI

- Validation began at `2026-07-18T12:07:33+09:00` on Windows `10.0.26200`, PowerShell `7.6.0`, Git `2.51.2.windows.1`, Node `v24.11.0`, npm `11.18.0`, `gh` `2.96.0`, Codex CLI `0.144.5`, and Python `3.13.9`.
- Original checkout: branch `task/0013-filesystem-security-hardening`, HEAD `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`, dirty candidate state preserved. Detached validation worktree: `C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0016-20260718-120732`, clean local snapshot SHA `c769b6f8ed10f1a4159e468ec1abc97508a50530`. `git diff --check` passed.
- Exact candidate: zero remote-ref matches and zero hosted workflow runs. T-02 is blocked.
- Dependency evidence was reproduced, not trusted: run `29595270211`, parent SHA `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`, conclusion success. Packed job `87934012196`, macOS 22/24 `87934012208`/`87934012361`, Windows 22/24 `87934012399`/`87934012236`, Ubuntu 22/24/26 `87934012433`/`87934012338`/`87934012431`, aggregate `87934240296` all succeeded. Direct Ubuntu 22, macOS 22, and Windows 22 logs reported 95 tests, 94 pass, 0 fail, 1 optional marketplace skip, including native link/junction and FIFO/path-conflict cases.

### Source and real tarball

- `npm test`: exit 0, 120/120 pass, 0 skip. `npm run lint`: exit 0, 33 JavaScript modules plus foundation metadata. `npm run format:check`: exit 0, 152 UTF-8/LF files. `npm run pack:check`, `npm run check`, and `npm run release:ci`: exit 0.
- After recording gate evidence, `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0016-release-readiness-gate` returned `valid: true`, and a fresh source-checkout `npm run check` again exited 0 with 120/120 tests plus lint, format, and 29-file/59,225-byte pack checks.
- Artifact: `C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0016-artifacts-c769b6f8\kyw-dev-0.1.0.tgz`; exactly 29 files; packed 59,225 bytes; unpacked 229,405 bytes; npm SHA-1 `575051e49328bd4923c4411bcb29b69b80586495`; integrity `sha512-GRn1DSYuMVt9/uy3w8Nti+PY/7m38cfpAtwsC8Y3ndV+TJZqJpX+ZpFlidpAP73XZ6URc72KE6750Rb+HuI7KQ==`; archive SHA-256 `bc1886d298e86eda28b0b8deafe2bbded3ac5b9fb2ce6a232ee2ce8da57e6885`.
- The tarball contains only package/plugin/CLI/runtime/templates, four Skills and required internal files, README, project MIT license, `THIRD_PARTY_NOTICES.md`, and upstream MIT license. No development root, docs/tasks, test/eval data, credentials, npm config, local absolute path, or generated archive was included.
- Key hashes: project LICENSE `61eabc556e3cdcc6bf644325b78ae10d2e4ce24b59a7e69952d3d8cb347f5832`; notices `82731243ded9e599fe515e38aece6be97fff05c3e7cb4b13d319fbb3d631ca25`; upstream license `0e7ac423bf2c6e223b7c5b156f8cf72da49d748e56a1641402c31f22ad07dbb5`.
- Current bundled plugin validator passed both source and extracted manifest. Current official Skill quick validator passed all four extracted Skills under UTF-8 mode.

### Behavior, security, and audit

- Filesystem focus: `node --test test/skill-installation.test.mjs` exit 0, 35/35. Real Windows junctions were exercised. Exact-candidate cross-platform hosted coverage is absent.
- Deterministic audit: `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs` exit 0, 14/14.
- Grilling unit suite: 14/14. Comparison ID `20260718040643245-comparison-aa8d0432`; 32 runs/128 turns; source/auth/fixture invariants and all 15 condition checks true. Skill SHA-256 `59a38fa1dc73d995b1b44bb42bfa8150944b1c9a704f352e6de73f0134f38406`; config v9 `9fffd4a17271d75c0ca0095e83ccbd28050b20590a4180cfab4c5c649a716ac4`; rubric `4904bc5c30a09ac62a3d7d17fc3f6d9c9782280ff9048be524e68454ece32323`; schema v3 `212206a93f45fb9182e77afe1185ad35af1a11c22d6704f1acace01f1f946f49`; upstream `44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`.
- Grilling report was regenerated twice with stable SHA-256 `8543586f4e11c412fe05f85d941518dc73f7052d33946531d22a5a5985eea060`; comparison JSON SHA-256 `b026e791126815cb7a993e4753f84aae7ebb18a6d0f214b4f5f016751e26dd9a`; gate result `fail`. Aggregate kyw/upstream quality `85.9125/78.1426`, delta `+7.7699`; critical violations 0; token ratio `1.3883`; turns 4/4. Scenario deltas: conflicting `+4.6385`, existing-code `+9.4698`, greenfield `+5.8987`, migration `+12.5260`, multi-layer `-5.7811`, oversized `+12.4272`, pressure-to-code `-11.9149` FAIL, uncertain `+13.7593`.
- Audit read-only model: exit 1 after 252.2 seconds, `READONLY_MUTATION_ATTEMPT`; auth source SHA-256 remained `b3c8c5f11348391c8c66406ea58b7acf11f868c04406b6b1fe5779e656d1c81b`; no result artifact was published and temporary fixture state was removed.
- Audit fix model: exit 0 after 307.7 seconds; verdict `PASS`; `skillSourceRead=true`; `planBeforeMutation=true`; mutation attempt count 6; only `docs/tasks/0001-greeting-contract/TASK.md`, matching `TEST.md`, `src/greeting.mjs`, and `test/greeting.test.mjs` changed. Pre-existing `notes/user-draft.md`, `generated/cache.txt`, and `scratch/idea.txt` remained represented in final Git status. Final-message SHA-256 `ece95e0d0fdbf724286d1ad156189f52e87e52ab236890134572c964046a76c6`.

### Distribution and fresh sessions

- Correctly isolated direct user lifecycle: install/update/doctor/normal uninstall/reinstall all exited 0. With modified owned content, unknown content, and an unrelated Skill, normal uninstall exited 4 and preserved all three; force uninstall exited 0, removed only owned paths/metadata, and preserved unknown/unrelated content. Correctly isolated project install/update/doctor/uninstall exited 0 and did not synthesize README, AGENTS, SPEC, or ARCHITECTURE.
- Gate-process failure: an earlier retry reused an isolated user root in an invalid state; a second retry used case-insensitive `$home`, collided with PowerShell's normal `$HOME`, and temporarily created exactly `%USERPROFILE%\.agents\skills\kyw-init\user-note.txt` plus `%USERPROFILE%\.agents\skills\unrelated-skill\SKILL.md`. Validated non-recursive cleanup removed only those synthetic paths; subsequent checks found neither file/directory nor kyw metadata/runtime state, and normal `doctor` exited 0 `healthy`. This restoration does not make T-06 pass.
- Marketplace lifecycle: initial direct execution of the Windows `codex.ps1` shim failed before state change. A new isolated Codex home using `pwsh -File codex.ps1` passed marketplace add/list, plugin add/list, four-Skill cache hash comparison, plugin remove, and marketplace remove.
- Packed Skill hashes: grilling `59a38fa1dc73d995b1b44bb42bfa8150944b1c9a704f352e6de73f0134f38406`; init `a926a71916182ef4f345e3aad6c807fb42f6d907316ef506863f66af45a4bf76`; task `03a11f7bf89bd663073ddd5507bf64b6d2f439c5eb5cab0aca161b595511d5ec`; audit `0e09b55fbaddcfae4be7fae2c2407a3aad72580bf702591b213dd1f6d9ae059b`.
- Fresh-session grilling: exit 0 in 86.4 seconds; exact source read true; question/recommendation true; tree/status/auth unchanged; final SHA-256 `eff2e9c3bfa13b64791954fc3c3fb76c66590d218950e02fabc84feb4186b67c`.
- Fresh-session init: exit 0 in 121.3 seconds; exact source read true; selected `adopt`, asked one recommendation-backed question, made no files; tree/status/auth unchanged; final SHA-256 `1ab3537b484aa5530eb205fd34437a7277e530709ed1d4031c96495e3c5f214e`.
- Fresh-session task: exit 0 in 138.1 seconds; exact source read true; selected one Task and asked one recommendation-backed question before authoring; tree/status/auth unchanged; final SHA-256 `e931f1fd9267fded70e5f460e15754527d347f10f2df7e4408a3ff6069e1d8ae`.
- Fresh-session audit: exit 0 in 434.5 seconds; locked `read-only`, reported F-01 through F-03, ended `BLOCKED`, and preserved tree/status/auth; final SHA-256 `23e73ce10ccc64d91b1940761fac1a070c4f44f23a083b0a7754547efa89af68`. The initial predicate incorrectly expected `F-0001`-style IDs and did not retain its source-read event. A separate 16.7-second provenance session exited 0, captured the exact packed Skill path in a command event, returned `# kyw Audit Workflow`, and preserved state.

### Current publication state and forbidden actions

- At `2026-07-18T13:39:48.7744621+09:00`, an isolated npm probe returned ping exit 0, `npm view kyw-dev` exit 1/E404, search exit 0, and exact-name count 0. A separate read-only `npm whoami` failed unauthenticated without logging credential values.
- Final handoff probe at `2026-07-18T13:51:26.1192301+09:00` again returned npm view E404, exact search count 0, zero local/remote tags, zero GitHub releases, and zero hosted runs for the candidate SHA.
- Package identity remains `kyw-dev` `0.1.0`, author `Kim Yeongwoo`, MIT, public registry, Node `>=22`, public GitHub source/issues, no install/publish lifecycle scripts. Current official plugin/Skill requirements and validators accept the packaged structure.
- Local tags: none. Remote tags: none. GitHub releases: none. The first release-list query requested an unsupported `url` field and failed read-only; the corrected query returned zero releases.
- No `npm publish` command, including dry-run, was executed. No tag, GitHub release, public plugin submission, deprecation, dist-tag mutation, or unpublish command was executed.

Final recommendation: `BLOCKED`.

## Unverified

- No hosted CI exists for the exact local candidate SHA; required candidate-platform coverage is therefore unverified.
- `npm run release:check` was not run because it invokes prohibited `npm publish --dry-run`; every non-publication release check passed independently.
- The exact command that triggered `READONLY_MUTATION_ATTEMPT` was not retained by the failing audit harness, so the defect requires a diagnostic follow-on before repair.
- The normal-profile cleanup verified exact synthetic file/path absence and a healthy doctor result, but cannot prove untouched directory metadata or retroactively satisfy the no-touch contract.
- npm name availability can change, and the current CLI is unauthenticated. Both must be rechecked under separate publication approval.
- Registry installation, npm publication, tag/release creation, and public plugin submission remain intentionally unverified and unexecuted.

## Final Coverage Review

Before marking this Test `PASSED`:

- [ ] Confirm every result belongs to the recorded clean commit SHA.
- [x] Confirm source and real tarball both passed.
- [ ] Confirm hosted CI and all required platforms passed.
- [ ] Confirm model-backed results use the pinned configuration and meet thresholds.
- [x] Confirm no external publish/tag/release state changed.
- [x] Confirm exact publish and rollback steps are ready for separate user approval.
- [x] State one final recommendation: `BLOCKED`.
