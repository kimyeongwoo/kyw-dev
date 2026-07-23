# TEST 0038 — Post-Simplification Release Readiness Re-Gate
<!-- kyw-task-contract: 2 -->

## Status

READY

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially the complete MVP acceptance set.
- Architecture and release entry point: `../../ARCHITECTURE.md` and `../../../README.md`.
- Historical comparison: Task 0029 exact candidate/evidence.
- Current inputs: terminal Tasks 0030 through 0037 and exact integrated `main`.
- Verification policy: exact immutable candidate, current configured model/effort, current-session direct where needed, fresh hosted CI, and no publication.

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

## Results

- Not run yet.

## Unverified

- All rows remain unverified until this Task is executed.

## Final Coverage Review

- [ ] Compare candidate and evidence diffs to the matrix.
- [ ] Map every acceptance criterion to exact executed or byte-identity evidence.
- [ ] Confirm all time-sensitive checks name access time and source.
- [ ] Confirm no repair, selective retry, model/effort change, or publication mutation occurred.
- [ ] Confirm candidate/evidence-head package identity is exact and this pair makes no external-delivery claim.
- [ ] Confirm any published-tarball-only requirement remains explicit until publication.
