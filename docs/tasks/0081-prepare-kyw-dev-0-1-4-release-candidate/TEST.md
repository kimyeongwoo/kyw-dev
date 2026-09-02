# TEST 0081 — Prepare kyw-dev 0.1.4 Release Candidate

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Simplified release baseline: Task 0079.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — exact next-version and external-state preflight | Compare exact main/package/plugin, public versions/latest/target status, workflow runs, tags, and Releases. | External read-only / identity | PASS | Exact main and package/plugin baseline, public history/latest, target E404, workflow inventory, and tag/Release absence passed. |
| T-02 | AC-02 — all current version owners agree without historical drift | Inspect package/plugin/foundation/install current assertions and scan final diff for historical or dependency/lifecycle mutation. | Static / regression | PASS | Focused/current-version tests and independent diff audit passed; package/plugin differ only by version and historical evidence is untouched. |
| T-03 | AC-03 — candidate/public truth remains honest | Run instruction/foundation checks and inspect README/SPEC current owner sentences against public registry facts. | Documentation / contract | PASS | Instruction/foundation tests and exact permanent-document delta validation passed. |
| T-04 | AC-04 — package remains releasable | Run focused tests, exact planner, composite Release verification, and independently inspect the real archive. | Release / package | PASS | Focused 96/96 and final Release 393/389/4/0 passed; two candidate runs reproduced the same 43-file bytes and SHA-256. |
| T-05 | AC-05 — evidence and scope close cleanly | Validate pair/transaction, exact permanent deltas, workflow stability, final diff, and no external mutation. | Integrity / coverage | PASS | Pair/transaction/diff checks, exact delta table, unchanged workflow blob, target absence, and independent audit passed. |
| T-06 | AC-06 — exact candidate is ready for main | Confirm the terminal repository outcome declares `STANDARD`, is immutable and locally green, and leaves PR-head/merge/post-main observation to the separate delivery gate. | STANDARD handoff | PASS | Terminal repository outcome is ready; hosted delivery remains explicitly unverified rather than preclaimed. |

## Regression Coverage

- Package and plugin versions remain equal and the packaged installer records `0.1.4`.
- Public npm remains `latest=0.1.3` until the later one-attempt OIDC publication succeeds.
- Required Release verification remains exactly Task 0079's Stable/candidate/composite graph; optional dry run is not credited.
- `publish.yml`, dependencies, lifecycle scripts, package allowlist, historical Task pairs, and old release metadata remain unchanged.
- No npm publication, tag, GitHub Release, workflow rerun, credential fallback, account mutation, force, bypass, deletion, or public submission occurs in this outcome.

## Commands

- `node --test test/skill-installation.test.mjs test/distribution.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs test/publish-workflow.test.mjs test/verification-plan.test.mjs`
- `npm run verify:plan -- .codex-plugin/plugin.json package.json README.md docs/SPEC.md docs/tasks/.kyw-dev-standard-delivery-continuity.json scripts/lib/validate-foundation.mjs test/instruction-surfaces.test.mjs test/skill-installation.test.mjs docs/tasks/0081-prepare-kyw-dev-0-1-4-release-candidate/TASK.md docs/tasks/0081-prepare-kyw-dev-0-1-4-release-candidate/TEST.md`
- `npm run release:ci`
- `npm run release:candidate`
- Packaged Task 0081 dispatch and one `apply-continuity` call using the returned opaque token; the token was not retained.
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0081-prepare-kyw-dev-0-1-4-release-candidate`
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`
- `git diff --check`

## Results

- PASS — exact `origin/main` is Task 0080 merge `14fcf53498cdb091f357f47041e6faf4a428b28f`; its post-main CI succeeded before this candidate branch was created.
- PASS — credential-free registry reads list `0.1.0` through `0.1.3`, keep `latest=0.1.3`, and show target `0.1.4` absent. No active publication run, remote `v0.1.4` tag, or GitHub Release exists.
- PASS — current main package/plugin identity began at `0.1.3`; the local-only blocked Task 0076 branch and consumed Task 0078 evidence were not reused or changed.
- PASS — the focused six-suite command passed 96/96; exact changed-path planning selected `RELEASE` and only `npm run release:ci`, with hosted topology of 11 PR jobs and 10 successful main jobs.
- FAIL → corrected — the first full Release run produced 393 tests with 387 pass, 4 explicit skip, and 2 failures. Both asserted aligned tracked-main identity and observed stale local `main=dee58b1d…` versus `origin/main=14fcf534…`; package/version behavior did not fail.
- PASS — worktree inventory showed no worktree on local `main`, and ancestry proved a clean fast-forward. After aligning only the local ref, the two named hydration regressions passed 2/2.
- EARLIER PASS, superseded for finality — the first corrected `npm run release:ci` passed 393 tests (389 pass, 4 explicit skip), lint, format, package selection, and candidate creation. The later continuity transition changed repository evidence and required the final run below.
- PASS — the packaged dispatcher returned `SELECTED / RESUME / 0081`; its single opaque transition incorporated exact delivered Task 0080 and applied once at 47 covered Tasks with checkpoint digest `9f9aea3e204a9f984afb7a7ddb2657b1b1c84928117eefadf120741964579d1c`.
- PASS — final `npm run release:ci` on the complete diff passed 393 tests (389 pass, 4 explicit platform/live skip, 0 fail), lint for 81 JavaScript modules, format for 364 UTF-8/LF files, package selection for 43 files / 135,958 bytes, and the real candidate with SHA-256 `c01513dd903ea3254284a1438ecd808d1defe469e1dd61cfa8e3cdacc322c632`.
- PASS — independent `npm run release:candidate` reproduced exactly 43 files / 135,958 bytes / SHA-256 `c01513dd903ea3254284a1438ecd808d1defe469e1dd61cfa8e3cdacc322c632`.
- PASS — final credential-free public reads still list only `0.1.0` through `0.1.3`, keep `latest=0.1.3`, and return the expected E404 for `0.1.4`; only the two historical successful publication runs exist, with no target run, tag, or Release.
- PASS — current and `origin/main` publication workflow blobs both equal `df24f26552697a286bdf0bd16017174cd23c20d8`; Task 0078 and the old Task 0076 branch remain untouched, and independent scope audit found no blocker.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 17820 | 17926 | 228 | 228 | +106 | 0.59% | setup, commands, usage, and contributor entry | Users must distinguish the installed public 0.1.3 release from the exact unpublished 0.1.4 source candidate. | Existing Start here and Release status sentences replace current-release wording; no procedure or chronology section is added. |
| `AGENTS.md` | 3921 | 3921 | 47 | 47 | 0 | 0.00% | repository-wide Codex routing, authority, preservation, and completion rules | Not applicable — existing direct-authority and release boundaries already govern the candidate. | AGENTS remains byte-stable. |
| `docs/SPEC.md` | 47949 | 48011 | 468 | 468 | +62 | 0.13% | observable product behavior and acceptance | Package-boundary and publication-state truth must identify the 0.1.4 source candidate without falsely claiming registry publication. | Existing package-boundary and publication-state sentences replace current-version wording; historical registry facts remain intact. |
| `docs/ARCHITECTURE.md` | 43217 | 43217 | 853 | 853 | 0 | 0.00% | components, boundaries, dependencies, flows, and distribution | Not applicable — Task 0079 already owns the simplified verification and exact-main OIDC flow. | ARCHITECTURE remains byte-stable. |
| `Combined` | 112907 | 113075 | 1596 | 1596 | +168 | 0.15% | four permanent documents as one governed set | The permanent set must keep candidate/source identity separate from public registry truth during the delivery boundary. | Two existing owner sentences absorb the complete durable change; no new permanent document or budget increase is introduced. |

## Unverified

- `STANDARD` PR-head, merge, and post-main exact-SHA evidence is pending and is not preclaimed.
- npm publication, tag, and GitHub Release are later separate actions and have not occurred.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Confirm current-version replacements exclude historical evidence.
- [x] Confirm final package and permanent-document measurements.
- [x] Confirm no external publication, tag, or Release mutation occurred.
