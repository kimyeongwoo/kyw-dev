# TEST 0038 — Post-Simplification Release Readiness Re-Gate
<!-- kyw-task-contract: 2 -->

## Status

RUNNING

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially the complete MVP acceptance set.
- Architecture and release entry point: `../../ARCHITECTURE.md` and `../../../README.md`.
- Historical comparison: Task 0029 exact candidate/evidence.
- Current inputs: terminal Tasks 0030 through 0037 and exact integrated `main`.
- Verification policy: exact immutable candidate, current configured model/effort, current-session direct where needed, fresh hosted CI, and no publication.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user supplied no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose a Codex version)

## Frozen Candidate Inputs

- Delivered base and required parent: `origin/main@cc7a0ef2779df62263f10c4d36a0fece50e4db2c`, tree `8c2f41a47a2206d6f55450e4771c4d4298cda046`.
- Candidate Commit A may change only the outcome-safe README authority paragraph and this Task/Test lifecycle pair from that exact base. `docs/tasks/` is excluded from the npm package; README is intentionally part of the candidate.
- After Commit A is recorded, no amend, rebase, squash, force movement, or candidate-byte repair is permitted. A product or gate defect produces `BLOCKED`.
- Task 0029 comparison: 14 packed paths changed by Tasks 0030–0037—`README.md`, `package.json`, two Audit Skill paths, four Task Skill/adapter paths, four CLI/core paths, and three project/Task templates—so Task 0029 cannot authorize the new bytes.
- Local exact-candidate checks: stable `npm run check`; one persistent real `npm pack --json` archive with exact inventory, safe-entry, source-byte, metadata, legal, CLI/plugin/Skill, shasum/integrity/SHA-256 checks; direct SPEC fixture validation; isolated release lifecycle/protected-state gate; exact relevant-byte carry-forward review; and final package identity comparison.
- Hosted exact-candidate check: one new `workflow_dispatch` attempt 1 at immutable Commit A, with every Stable and packed job inspected. PR-head and post-merge `main` CI are later external-ledger boundaries at the evidence head.
- External read-only checks: the current official Codex manual and public npm name/authentication state. Publication, publication dry-run, `release:check`, registry mutation, tag, Release, public submission, rollback, rerun, model/effort change, and Task 0039 creation remain forbidden.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Task 0029 supersession | Compare packed/release-relevant bytes and durable status; preserve Task 0029 while marking changed bytes as requiring this new candidate. | Identity/review | TODO | Not run. |
| T-02 | AC-02 — Immutable candidate | Record parent/tree/SHA, normal push, clean detached worktree, and no history rewrite. | Git/integrity | TODO | Not run. |
| T-03 | AC-03 — Real tarball identity | Inspect exact entries, bytes, metadata, legal files, CLI/plugin/Skills, hashes, and exclusions. | Package | TODO | Not run. |
| T-04 | AC-04 — Complete SPEC evidence matrix | Map every criterion to current execution or exact relevant-byte carry-forward with explicit limitations. | Acceptance | TODO | Not run. |
| T-05 | AC-05 — Lifecycle, audit, marketplace, filesystem, evaluator | Run exact candidate user/project and protected-state gates. | Acceptance/regression | TODO | Not run. |
| T-06 | AC-06 — Official and registry state | Recheck primary official sources, name availability, and authentication prerequisite read-only. | External read-only | TODO | Not run. |
| T-07 | AC-07 — Fresh exact-candidate hosted CI | Dispatch one attempt-1 workflow and inspect every required job/native fixture. | Hosted integration | TODO | Not run. |
| T-08 | AC-08 — Verification-only terminal verdict | Validate `READY_FOR_APPROVAL` or `BLOCKED`, preserve failures, and prove no defect repair. | Static/integrity | TODO | Not run. |
| T-09 | AC-09 — Candidate/evidence-head identity and ledger boundary | Compare candidate and repository evidence-head package bytes for exact recorded SHAs; confirm PR/merge/post-merge evidence remains external to Task/Test completion. | Package/integrity | TODO | Not run. |
| T-10 | AC-10 — Publication and user-state boundary | Prove zero publish/tag/Release/submission/rollback/Task0039 action and unchanged normal state. | Integrity | TODO | Not run. |

## Regression Coverage

- Final dispatch, instruction, artifact, audit, harness-retirement, verification-tier, installation, and benchmark outputs.
- Full stable source/package/lifecycle/evaluator/filesystem/audit contracts.
- Exact candidate, evidence-head, merge, hosted, registry, and protected-state boundaries.
- Failure and unavailable-evidence branches with no unsupported PASS.

## Commands

- Freeze exact candidate and command set before execution.
- Do not execute `npm publish`, publication dry-run, `release:check`, tag, GitHub Release, or rollback commands.
- Do not change the configured model or reasoning effort.
- Canonical validators for Tasks 0030–0038 and 0039 — PASS before lifecycle transition.
- Fresh local/remote/GitHub preflight and managed exact dispatch — PASS; Task 0038 selected with `IMPLEMENT` and `STANDARD_LIFECYCLE` authority.
- `git fetch --prune origin` and `git switch -c task/0038-post-simplification-release-regate origin/main` — PASS; exact base `cc7a0ef2779df62263f10c4d36a0fece50e4db2c`.
- `git diff --name-status 5fa5a3d2637073580a64a01a7396f4d533d0d5b6 cc7a0ef2779df62263f10c4d36a0fece50e4db2c -- <packed roots>` — PASS; 14 packed paths changed, so Task 0029 is superseded.
- Current official manual helper and targeted plugin/Skill reads — PASS; local manual already current on 2026-07-24.
- Isolated npm registry queries — PASS: PONG, exact view E404, zero exact-name search matches, and expected unauthenticated ENEEDAUTH. Initial Task-root `New-Item -LiteralPath` setup emitted a PowerShell parameter error; npm still used the explicit isolated paths and the query results were not retried.

## Results

- Execution preflight, dependency delivery, current official manual freshness, pair validation, exact dispatch, and clean branch formation passed.
- Candidate formation and release-gate rows remain unexecuted.

## Unverified

- T-01 through T-10 remain unverified until candidate formation and the frozen gate execute.

## Final Coverage Review

- [ ] Compare candidate and evidence diffs to the matrix.
- [ ] Map every acceptance criterion to exact executed or byte-identity evidence.
- [ ] Confirm all time-sensitive checks name access time and source.
- [ ] Confirm no repair, selective retry, model/effort change, or publication mutation occurred.
- [ ] Confirm candidate/evidence-head package identity is exact and this pair makes no external-delivery claim.
- [ ] Confirm any published-tarball-only requirement remains explicit until publication.
