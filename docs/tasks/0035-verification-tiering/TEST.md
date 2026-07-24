# TEST 0035 — Verification Tiering and Maintainer Workflow Simplification
<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules: `../../../AGENTS.md`
- Verification policy: current-session direct and risk-proportionate by default; preserve the configured model and reasoning effort.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose an exact model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user supplied no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose a version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Command inventory | Map every stable/release command to owner, trigger, and evidence claim. | Static | PASS | Every public verification script plus direct behavioral, hosted, isolation, registry, and published-package boundary has one unique registry owner, tier, trigger, and leaf count; permanent, Task, package, and hosted projections align. |
| T-02 | AC-02 — Documentation change routing | Run only justified focused/stable checks; verify no lost contract. | Integration | PASS | Planner selected two focused commands while retaining mandatory hosted Stable; fixed workload passed in 674 ms. |
| T-03 | AC-02 — Skill change routing | Require packed Skill and behavioral coverage without unrelated publication checks. | Integration | PASS | Planner selected owning-Skill tests, format, and pack only; fixed workload passed in 5,754 ms. |
| T-04 | AC-02 — Runtime change routing | Require focused, full, cross-platform, and pack gates as appropriate. | Integration | PASS | Runtime, mixed, and unknown paths fail closed to four-leaf `npm run check`; tests passed. |
| T-05 | AC-04 — Release candidate routing | Require the complete immutable candidate gate. | E2E | PASS | Full release/registry regression passed; the terminal candidate reproduced 29 files/79,813 bytes at SHA-256 `73718b9be2b84cb1029519c87188a61fc0be6d2d3c0dd6ef5a69b4ba11feb299`. |
| T-06 | AC-05 — Identity deduplication | Prove same-byte checks are removed only where hashes/trees are identical. | Integrity | PASS | Hosted packed job dropped only its repeated Stable composite (33→29 leaf commands); native Stable and candidate/isolation/registry/published boundaries remain separately mapped. |
| T-07 | AC-06 — Performance comparison | Record before/after commands and wall time on fixed fixtures. | Performance | PASS | Documentation 4/38,253 ms→2/674 ms; Skill 4/38,253 ms→3/5,754 ms. Runtime stays 4; Release stays 5. |
| T-08 | AC-03, AC-07 — CI/native fixtures | Verify all supported lanes and real link/junction evidence. | Hosted | PASS | Workflow contract tests retain all seven Node/OS Stable lanes, four commands per lane, packed candidate, and aggregate; native Windows link/junction, Ctrl+C, package, and protected-state tests passed locally. Mutable exact-head PR/main results remain in the delivery ledger. |
| T-09 | AC-08 — Full stable/release regression | Run both final tiers once. | Regression | PASS | `release:check` passed the full release plus registry dry-run boundary; terminal `npm run check` passed 249/249, lint, format, and pack, then `release:candidate` reproduced the exact archive SHA without repeating Stable again. |

## Regression Coverage

- Existing Task artifact and template contracts.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, and publication boundaries.
- Exact changed behaviors and error paths discovered during implementation.

## Commands

- `git fetch origin --prune`, guarded Git status/ref/history inspection, and fresh GitHub PR/Actions queries — PASS; clean baseline and exact delivered dependency identities confirmed.
- Canonical Task validators for Task 0035 and current transitive dependencies — PASS.
- Managed exact dispatch with separate trusted local expectations and fresh GitHub ledgers for Tasks 0030 through 0034 and Task 0039 — `SELECTED/IMPLEMENT`, `STANDARD_LIFECYCLE`, no ceremonial confirmation.
- `git switch -c task/0035-verification-tiering origin/main` — PASS; branch starts at exact delivered SHA `9c0f1594cd12dd0ae69727280de852a1f297ce5a`.
- Pre-change `npm run check` — PASS, four leaf commands, 240/240 tests, 38,253 ms wall time.
- Pre-change `npm run release:ci` — PASS, five leaf commands, 240/240 tests plus real tarball SHA-256 `da7fc6af06ed764095edafa8373887dae3c33d47fd26e3075acd619bf19df813`, 36,421 ms wall time.
- Fixed documentation workload (`node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs` plus `npm run format:check`) — PASS, 6/6 tests, two leaf commands, 648 ms.
- Fixed Skill workload (`node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs test/kyw-task.test.mjs`, format, pack) — PASS, 20/20 tests, three leaf commands, 5,811 ms.
- Initial focused implementation command (`node --test test/verification-plan.test.mjs test/continuous-integration.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs test/kyw-task.test.mjs`) — FAIL, 29/30; representative instruction bundle was 37,138 bytes against the retained 36,382-byte ceiling.
- First compression retry of the same focused command — FAIL, 29/30; the same sole bundle assertion improved to 36,550 bytes but remained 168 bytes over the retained ceiling.
- Second compression retry of the same focused command — FAIL, 29/30; the same sole bundle assertion measured 36,408 bytes, 26 bytes above the retained ceiling.
- Third compression retry of the same focused command — FAIL, 29/30; the instruction bundle passed, while the new tier-contract test retained the pre-compression reference phrase and required a test-only expectation correction.
- Corrected focused command — PASS, 30/30.
- `node --test test/distribution.test.mjs test/release-gate-isolation.test.mjs` — PASS, 31/31; real tarball direct/plugin lifecycle, native Windows evidence, protected-state attribution, failure, retry, and cleanup boundaries passed.
- Final combined focused command over verification planning, CI, foundation, instructions, Task, distribution, and release isolation — PASS, 61/61.
- Representative `npm run verify:plan` CLI runs — PASS: documentation 2, Skill 3, runtime 4, release-sensitive 5, and explicit candidate 5 leaf commands; hosted result is always 29 leaf commands plus aggregate.
- Post-change fixed documentation workload — PASS, 6/6 plus format, two leaf commands, 674 ms.
- Post-change fixed Skill workload — PASS, 20/20 plus format and pack, three leaf commands, 5,754 ms; package allowlist remained 29 files.
- `npm run release:check` — PASS in 38,801 ms: 247/247 tests, lint over 59 modules, format over 256 files, 29-file/79,813-byte package checks, candidate SHA-256 `73718b9be2b84cb1029519c87188a61fc0be6d2d3c0dd6ef5a69b4ba11feb299`, and non-publishing registry dry run. Registry identity: shasum `bd853e27ccdc16fd780077922262b468a0766ddc`; integrity `sha512-B7AGMHKALo+99Zhc6+kRpvmPi7j/EwzFxhb7NTQ/JUteVYUocAi9yS2TD7JA6pCJ50sSUPFWTw0muTtvsnBK7A==`.
- Final planner branch test after coverage review — PASS, 9/9, including template owners, unknown Skill fallback, evidence-only/deduplicated inputs, mixed Release, invalid path/type, help, and unknown option paths.
- Final `npm run check` on terminal implementation/test bytes — PASS: 249/249 tests, lint over 59 JavaScript modules and foundation metadata, format over 256 UTF-8/LF files, and exact 29-file/79,813-byte package selection.
- Terminal `npm run release:candidate` — PASS: 29 files/79,813 bytes and unchanged SHA-256 `73718b9be2b84cb1029519c87188a61fc0be6d2d3c0dd6ef5a69b4ba11feb299`; the final planner/test-only additions are development-only.
- Planner over all 13 changed paths — PASS: Release, five local leaf commands, 29 mandatory hosted leaf commands before aggregate.
- Canonical Task pair validation and `git diff --check` during final review — PASS.
- Do not record an unexecuted method as `PASS`.
- Do not change the configured model or reasoning effort unless the user explicitly directs it.

## Results

- Repository, dependency delivery, pair validation, exact dispatch, and clean-branch preflight passed.
- Pre-change stable, release, documentation, and Skill comparison workloads passed; the current hosted contract totals 33 leaf verification commands before its aggregate gate.
- The first acceptance-specific implementation run retained one instruction-overhead failure; all new planner, CI, package-script, and routing assertions passed.
- All four focused failure rounds remain recorded. The corrected combined focused suite passes 61/61.
- Fixed comparison proves material local improvement for documentation and Skill classes while runtime/release coverage and hosted Stable authority remain intact.
- Full Stable, real-candidate, isolated lifecycle, protected-state, licensing, package, and registry dry-run boundaries passed. The dry run did not publish.
- Final diff and branch coverage review mapped every acceptance criterion and found no unintended packaged bytes, production dependency, unsupported lane reduction, or residual repository gap.

## Unverified

- Exact-head PR and post-merge `main` Actions results are mutable delivery-ledger evidence and will be checked after this repository outcome is committed; they are not pre-claimed here.
- Model-backed evaluators were not run because no acceptance contract supplied an explicit model, effort, authentication source, and cost gate. Publication and downloaded-package verification were not run because publication is out of scope; the recorded registry operation was dry-run only.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [x] Confirm required regressions actually ran.
- [x] Confirm this pair records repository evidence only and makes no external-delivery claim.
