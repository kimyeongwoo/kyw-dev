# TEST 0019 — Release Gate Isolation

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Release failure evidence: `../0016-release-readiness-gate/TASK.md` and `TEST.md`
- Restored audit isolation evidence: `../0018-audit-readonly-diagnostics/TASK.md` and `TEST.md`
- Direct/package/marketplace dependencies named in the Task

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 development-only boundary and zero dependencies | Inspect imports, package allowlist/dependency fields, dry-run/real tarball inventory | Static/Packaging | PASS | Runner is excluded under `scripts/`; package/packed-check hashes stayed unchanged, dependencies remain absent, and real/dry-run inventories remain exactly 29 files. |
| T-02 | AC-02 collision-resistant local names | Static source assertion for required identifiers and forbidden PowerShell-style local declarations | Static/Safety | PASS | Focused source test finds all three required identifiers and no forbidden local declaration; repository safety search also returns no assignment. |
| T-03 | AC-03/AC-04 fail-closed path guard before child start | Invoke the real runner with exact/descendant protected-path overrides and an injected child spy; test pure Windows identity variants | Unit/Security | PASS | Normal agents case/separator alias, Codex descendant, and npm userconfig exact collision each returned `ISOLATION_PATH_GUARD`, matched a protected label, and invoked zero child calls; pure win32 exact/descendant/sibling checks pass. |
| T-04 | AC-03 materialized targets are real strict descendants | Inspect the generated plan and re-run realpath/link/type/containment validation before spawning | Integration/Security | PASS | Required E2E guarded 17 absolute targets and revalidated root identity plus every existing path chain before every spawn; summary reports approved root removed. |
| T-05 | AC-05 isolated environment is child-only | Compare relevant parent environment entries before/after and inspect injected child env | Unit/Integration | PASS | Focused test strips mixed-case inherited aliases, injects only isolated values, finds one key per identity, and proves parent keys unchanged; E2E reports `childOnly`/`parentUnchanged` true. |
| T-06 | AC-06 normal-state sentinel/hash is mandatory | Synthetic mismatch test plus actual before/after agents/Codex/npm snapshots around E2E | Unit/Security/E2E | PASS | Synthetic mismatch returns `NORMAL_STATE_CHANGED`; one live-log delta intentionally failed E2E; final agents/Codex-control/npm before/after entry counts and SHA-256 values are identical. |
| T-07 | AC-07 cleanup is exact and bounded | Test substituted/broad root rejection; inspect successful identity/link-free exact-root cleanup and absence | Unit/Security | PASS | System temp broad target returned `CLEANUP_GUARD`; an exact identity-owned fixture and every E2E root were removed after validation, with zero residual runner roots. |
| T-08 | AC-08 actual tarball direct lifecycles | Run packed CLI user/project install, update, doctor, normal uninstall; exercise normal refusal and force preservation | Distribution E2E | PASS | User/project lifecycle steps exited 0; preservation refusal exited expected 4; force exited 0 and retained unknown `948cb7c4...8f64` plus unrelated `45600552...ea3` bytes. |
| T-09 | AC-09 actual tarball marketplace lifecycle | Require local Codex CLI, add isolated marketplace, install/cache four packed Skills, then remove plugin/marketplace | Plugin E2E | PASS | Required Codex `0.144.5` run completed all six steps and byte-compared every packed file in all four cached Skill trees before plugin/marketplace removal. |
| T-10 | AC-10 stable/final verification and forbidden-action boundary | Run focused/full tests, four stable commands, Task validation, diff/status/command audit | Regression/Audit | PASS | Final `release:ci` passes 130/130, lint 35, format 161, pack/packed checks 29 files/60,140 bytes with matching SHA-256; Task validation/diff/residue/scope reviews pass and no forbidden action ran. |

Every acceptance criterion maps to at least one row. Add rows for any meaningful new branch discovered in the final diff.

## Regression Coverage

- [x] Exact normal `.agents`, `.codex`, configured Codex root, and npm userconfig targets fail before child execution.
- [x] Descendants and Windows case/separator aliases fail the same guard.
- [x] Every writable/cwd target is absolute and a real strict descendant of the approved temporary root.
- [x] Parent environment remains unchanged while every child receives isolated user/Codex/npm/temp/XDG state.
- [x] Protected-state mismatch overrides an otherwise successful lifecycle result.
- [x] Cleanup refuses a substituted or broad recursive root and removes only the verified exact root.
- [x] Actual tarball user/project install, update, doctor, and normal uninstall pass.
- [x] Normal uninstall refuses modified/unknown state; force removes only owned bytes and preserves unknown/unrelated bytes.
- [x] Actual tarball marketplace add/install/cache/remove exposes exactly four Skills when Codex is available.
- [x] Stable commands, real package boundaries, legal hashes, and no-lifecycle-script policy remain passing.
- [x] Normal user state, unrelated worktree changes, and external release state remain untouched.

## Commands

Planned commands; Results will retain only commands actually run and their outcomes.

- `node --test test/release-gate-isolation.test.mjs`
- `node --test test/distribution.test.mjs test/release-gate-isolation.test.mjs`
- `node ./scripts/release-gate-isolation.mjs`
- `node --check scripts/release-gate-isolation.mjs test/release-gate-isolation.test.mjs test/distribution.test.mjs` (run as one check per file)
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run release:ci`
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0019-release-gate-isolation`
- `git diff --check`
- Path-scoped `git status --short`, `git diff`, package inventory, and forbidden-action review.

## Results

- Initial checkout: branch `task/0013-filesystem-security-hardening`, HEAD `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`; extensive existing tracked/untracked work is preserved as user-owned baseline.
- Task 0019 was absent and its Task/Test pair was created together before implementation.
- Source inspection identified the existing release distribution lifecycle as the unsafe orchestration boundary: child HOME/USERPROFILE and Codex variables were set ad hoc, npm state was inherited, normal protected roots were not compared, and no pre-spawn collision guard existed.
- `node --check` passed the runner and both affected tests before execution.
- First `node --test test/release-gate-isolation.test.mjs`: 5/6 passed. The normal Codex snapshot hit one Windows-locked file with `EBUSY`; no lifecycle child was part of this focused test. Readable files remain content-hashed, while locked control files now contribute metadata/identity plus explicit unreadable state. Focused reruns pass 6/6.
- First distribution E2E failed at the first child: Windows direct `npm.cmd` spawn returned `EINVAL`. No product state changed, sentinel comparison and cleanup completed, and the launcher changed to `cmd.exe /d /c npm` without changing the isolated environment.
- Second distribution E2E ran product work but intentionally failed final `normal-codex` comparison. Recent-path inspection showed the active host writing only `sessions/*.jsonl` and `logs_2.sqlite*`; normal plugin control was not touched. Codex sentinel scope now byte/tree-hashes top-level structure plus plugin/Skill/config/auth/control state and represents volatile host payloads structurally. It does not whitelist plugin-control changes.
- Focused `node --test test/release-gate-isolation.test.mjs`: exit 0, 6/6. Combined focused distribution/guard command: exit 0, 8/8.
- Required `node ./scripts/release-gate-isolation.mjs`: exit 0. It guarded 17 targets and three actual protected locations, left parent environment unchanged, and removed its exact root. Residual `kyw-dev-release-gate-*` directory count is zero.
- Final real tarball evidence at this stage: `kyw-dev-0.1.0.tgz`, 29 files, 60,140 bytes, SHA-256 `cd85d391687a2a69ed6e20c06f645db63e82f0a8150882d3c40e4217691cd121`. Packed allowlist, forbidden roots/patterns/lifecycle scripts, project/upstream legal hashes, archive paths, and every cached Skill file passed.
- Direct steps: user install/update/doctor/normal uninstall; project install/update/doctor/normal uninstall; force fixture install; expected normal preservation refusal exit 4; force uninstall exit 0. Unknown hash `948cb7c4a3cf9139c5c52d0d4cea74e4ac79dc4e083888954645fc6e8a7a8f64` and unrelated hash `45600552c3a77669b953e7dac28beb80516a5e47005e8512ea89433f92626ea3` remained.
- Marketplace steps under `codex-cli 0.144.5`: marketplace add, discovery, plugin install, installed list, plugin remove, and marketplace remove all exited 0. Cached `kyw-audit`, `kyw-grilling`, `kyw-init`, and `kyw-task` trees matched extracted packed bytes.
- Actual before/after protected evidence is identical: normal agents 5 entries/SHA-256 `b7d5676714da2cd2d23bf17277b8078e5f1674e15152c22c9cb73713d5b2ad17`; normal Codex control 3,469 entries/`4181716c3fce9f35f0057ae06fe55acde9189b195ef71d06ca4df7b9bbb65968`; default npm userconfig 1 entry/`4a141f5f79fd1ff6dbb8f90998b59a58468d7806d0842633345a0d6478b0a9b5`. All unreadable counts are zero in final evidence.
- Full `npm test`: exit 0, 130/130 in 21.4 seconds. Preliminary exact stable commands: lint passed 35 modules plus metadata; format passed 161 files; pack check passed 29 files/60,140 bytes. Earlier 59,850-byte tarball evidence preceded the final README synchronization and is superseded.
- Scope/boundary preflight: package and packed-check SHA-256 remain their initial `504d7cc8...bf3d8`/`873dfcad...e9e4a`; dependency fields remain absent; `scripts/` remains unpacked; safety assignment search and `git diff --check` return no finding.
- Final `npm run release:ci`: exit 0 in 25.6 seconds. Its nested stable commands passed 130/130 tests in 20.0 seconds, lint 35 modules plus foundation metadata, format 161 files, and pack check 29 files/60,140 bytes. The independent packed-release check produced the identical archive SHA-256 `cd85d391687a2a69ed6e20c06f645db63e82f0a8150882d3c40e4217691cd121`.
- Final repository audit: Task validation returned `valid: true`; `git diff --check` exited 0; workspace `.tgz` count and system-temp `kyw-dev-release-gate-*` directory count are both zero. Task 0019 added only its Task/Test pair, runner, and guard test, and changed only the pre-existing dirty README, Architecture, and distribution test paths declared in scope.
- Permanent document decision: README and Architecture were synchronized; Spec and AGENTS remained unchanged because no product or repository-wide Codex contract changed.
- Forbidden actions: no `npm publish` command (including dry-run), tag creation/push, GitHub release, deprecation/dist-tag/unpublish, or public plugin submission ran.
- Terminal evidence-only rerun: `npm run format:check` passed 161 files, Task validation remained `valid: true`, `git diff --check` exited 0, Task/Test contained no TODO/unchecked/non-terminal state, and runner-root residue remained zero.

## Unverified

- Marketplace availability remains environment-dependent in public tests; Task 0019's required local standalone evidence passed and did not use the optional branch.
- Hosted cross-platform execution of the new runner will occur only after these uncommitted bytes are formed into a real candidate commit. Current acceptance-specific native evidence is Windows plus platform-neutral `path.win32` identity regression; this does not weaken the completed local isolation contract.

## Final Coverage Review

Before marking this Test `PASSED` or `BLOCKED`:

- [x] Confirm every Task acceptance criterion has direct evidence and no TODO row remains.
- [x] Confirm guard failures occurred before any child call and did not create a normal-state path.
- [x] Confirm actual protected before/after sentinel/tree hashes match exactly.
- [x] Confirm the real tarball, not source-tree bytes, drove every direct and marketplace lifecycle command.
- [x] Confirm every child received isolated state and the parent environment remained unchanged.
- [x] Confirm cleanup targeted only the verified exact temporary root and it is absent.
- [x] Confirm final diff behavior, docs impact, package boundary, and stable commands are fully covered.
- [x] Confirm no npm publish, tag, GitHub release, or public plugin submission occurred.
