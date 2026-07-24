# TEST 0038 — Post-Simplification Release Readiness Re-Gate
<!-- kyw-task-contract: 2 -->

## Status

PASSED

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
- Candidate Commit A: `4db0578804ec9860891c31aef39a3e29b724e566`, tree `f9d8e58bd1be17dea925c32ec17625f6732874cf`, subject `chore: form post-simplification release candidate`. It changes only the outcome-safe README authority paragraph and this Task/Test lifecycle pair from the exact base. `docs/tasks/` is excluded from the npm package; README is intentionally part of the candidate.
- After Commit A is recorded, no amend, rebase, squash, force movement, or candidate-byte repair is permitted. A product or gate defect produces `BLOCKED`.
- Task 0029 comparison: 14 packed paths changed by Tasks 0030–0037—`README.md`, `package.json`, two Audit Skill paths, four Task Skill/adapter paths, four CLI/core paths, and three project/Task templates—so Task 0029 cannot authorize the new bytes.
- Local exact-candidate checks: stable `npm run check`; one persistent real `npm pack --json` archive with exact inventory, safe-entry, source-byte, metadata, legal, CLI/plugin/Skill, shasum/integrity/SHA-256 checks; direct SPEC fixture validation; isolated release lifecycle/protected-state gate; exact relevant-byte carry-forward review; and final package identity comparison.
- Hosted exact-candidate check: one new `workflow_dispatch` attempt 1 at immutable Commit A, with every Stable and packed job inspected. PR-head and post-merge `main` CI are later external-ledger boundaries at the evidence head.
- External read-only checks: the current official Codex manual and public npm name/authentication state. Publication, publication dry-run, `release:check`, registry mutation, tag, Release, public submission, rollback, rerun, model/effort change, and Task 0039 creation remain forbidden.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Task 0029 supersession | Compare packed/release-relevant bytes and durable status; preserve Task 0029 while marking changed bytes as requiring this new candidate. | Identity/review | PASS | Fourteen packed paths changed; Task 0029 bytes remain untouched, and candidate README identifies its historical/superseded boundary. |
| T-02 | AC-02 — Immutable candidate | Record parent/tree/SHA, normal push, clean detached worktree, and no history rewrite. | Git/integrity | PASS | Commit A `4db0578804ec9860891c31aef39a3e29b724e566`, parent `cc7a0ef…`, tree `f9d8e58…`; normal push and clean detached checkout passed. |
| T-03 | AC-03 — Real tarball identity | Inspect exact entries, bytes, metadata, legal files, CLI/plugin/Skills, hashes, and exclusions. | Package | PASS | Retained 29-file archive `ba0ffd…`; exact source bytes, inventory, safe types, metadata, legal/CLI/plugin/Skill validators, hygiene, shasum, and integrity passed. |
| T-04 | AC-04 — Complete SPEC evidence matrix | Map every criterion to current execution or exact relevant-byte carry-forward with explicit limitations. | Acceptance | PASS | Complete SPEC §15 matrix below; current candidate execution plus 28-path exact Task 0037 carry-forward covers AC-01–AC-11, while published-tarball-only AC-12 remains pending. |
| T-05 | AC-05 — Lifecycle, audit, marketplace, filesystem, evaluator | Run exact candidate user/project and protected-state gates. | Acceptance/regression | PASS | Stable 257/257, direct six-scenario validation, exact Task 0037 carry-forward, and release isolation attempt-1 `CLEAN` with all direct/marketplace/protected-state steps. |
| T-06 | AC-06 — Official and registry state | Recheck primary official sources, name availability, and authentication prerequisite read-only. | External read-only | PASS | Official manual current 2026-07-24; isolated registry window returned PONG/E404/zero exact matches/expected ENEEDAUTH with no mutation. |
| T-07 | AC-07 — Fresh exact-candidate hosted CI | Dispatch one attempt-1 workflow and inspect every required job/native fixture. | Hosted integration | PASS | Attempt-1 run `30066159147` completed all nine jobs successfully at exact candidate SHA. Linux/macOS passed 258/259 with only the intentional Windows-only skip; Windows passed 257/257 with zero skips; native links/junctions and exact package SHA were verified. |
| T-08 | AC-08 — Verification-only terminal verdict | Validate `READY_FOR_APPROVAL` or `BLOCKED`, preserve failures, and prove no defect repair. | Static/integrity | PASS | All frozen gates passed without candidate repair or hidden failure; the paired terminal state is `READY_FOR_APPROVAL` with `DONE/PASSED`. |
| T-09 | AC-09 — Candidate/evidence-head identity and ledger boundary | Compare candidate and repository evidence-head package bytes for exact recorded SHAs; confirm PR/merge/post-merge evidence remains external to Task/Test completion. | Package/integrity | PASS | Prepared evidence head differs from Commit A only in this excluded pair; all 29 package Git blobs match exactly, inventory SHA-256 `a4978a6d…`. The resulting evidence SHA and later delivery facts belong to the external exact-SHA ledger. |
| T-10 | AC-10 — Publication and user-state boundary | Prove zero publish/tag/Release/submission/rollback/Task0039 action and unchanged normal state. | Integrity | PASS | Final diff and action review found no prohibited action; release isolation also proved all three normal protected snapshots unchanged and removed its isolated root. |

## SPEC §15 Evidence Matrix

| SPEC criterion | Result | Exact candidate evidence |
|---|---|---|
| AC-01 package files | PASS | Retained real 29-file tarball; safe regular entries, exact allowlist, source-byte equality, hygiene, metadata, CLI smoke, and archive identities passed. |
| AC-02 user installation | PASS | Exact-candidate isolation attempt 1 installed, updated, diagnosed, and normally uninstalled exactly four user Skills with ownership and preservation evidence. |
| AC-03 project installation | PASS | The same isolated lifecycle used a fresh Git project, kept project/user boundaries, and completed install-update-doctor-uninstall without protected-state drift. |
| AC-04 init/adopt | PASS | Task 0037 S-08 current-configured-model evidence carries forward through exact identity of all 28 behavior-relevant packed paths; current Stable regressions also passed. |
| AC-05 Task create/resume | PASS | Task 0037 S-09 and dispatch/resume evidence carries forward through the same exact 28-path identity; current Stable regressions passed. |
| AC-06 implementation refusal | PASS | Task 0037 S-09 shared-understanding/confirmation evidence and current Task regressions apply to byte-identical Skill/template/helper inputs. |
| AC-07 untested branch | PASS | Exact candidate `spec-behavioral-acceptance` returned `CURRENT_SESSION_DIRECT` for six scenarios and retained the intentional S-05 gap proof. |
| AC-08 ordinary small change | PASS | Exact candidate direct scenario validation plus Task 0037 S-10 carry-forward covers no-Task and permanent-document routing behavior. |
| AC-09 audit detection | PASS | Task 0037 S-11 bare/fix/native-preservation evidence carries through exact Audit Skill/reference identity; current Stable audit regressions passed. |
| AC-10 lifecycle safety | PASS | Exact-candidate Stable 257/257 and isolation `CLEAN` cover doctor/update/uninstall, ownership, duplicate, preservation, recovery, containment, filesystem, evaluator, and isolation contracts. |
| AC-11 packaged loading | PASS | Current Codex CLI `0.145.0` completed local marketplace add/discover/install/list/remove with exactly four packed Skills and cleanup. |
| AC-12 licensing | PREPUBLICATION_CANDIDATE_PASS | Candidate legal bytes and current system validators passed; literal identity/licensing in the actually published tarball remains `PUBLISHED_TARBALL_CHECK_PENDING`. |

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
- Exact-path staging and `git commit -m "chore: form post-simplification release candidate"` — PASS; only README and this pair entered Commit A.
- Normal branch push and direct remote ref inspection — PASS; remote Task 0038 branch resolved exactly to candidate SHA `4db0578804ec9860891c31aef39a3e29b724e566`.
- `git worktree add --detach C:/1kyw/5.personal/kyw_dev-task0038-cc7a0ef2/candidate-worktree 4db0578…` plus exact SHA/tree/status checks — PASS; clean detached worktree at tree `f9d8e58bd1be17dea925c32ec17625f6732874cf`.
- Detached `npm run check` — PASS in 36,070 ms: 257/257 tests, lint over 59 modules and foundation metadata, format over 256 files, and exact 29-file/82,573-byte package selection.
- One persistent `npm pack --ignore-scripts --json` plus exact extraction/inspection — PASS: 29 files, 82,573/324,936 bytes, shasum `5127c22f3a409155f6b1cbe04d6cb03099ff3d2a`, integrity `sha512-epVtHphpwwhEBBYy2KnTbMbLxx3HJU1R8Fl8Ab+ZnWYRGuaT5/TB2jx97n6hvNrFTw4j27/FvVW6A0jnOMtbEw==`, SHA-256 `ba0ffd878c4c47f2db6df163a8129d45c2df32e3645712ad8cd6e40da6465e3c`, zero unsafe/reparse/source-byte mismatch. A first custom hygiene expression accidentally retained trailing spaces on three path regexes; the unchanged extracted archive was rescanned with corrected expressions and had zero findings.
- Current `quick_validate.py` over all four extracted Skills and current `validate_plugin.py` over the extracted plugin — PASS, 5/5.
- `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures` — PASS in 242 ms; `CURRENT_SESSION_DIRECT`, six scenarios.
- Candidate versus Task 0037 Git-tree identity over all 28 non-README packed paths — PASS, zero mismatches, combined Git-blob inventory SHA-256 `7d325656525b559aedb64b8b0100f18ae7d81d8803a958cbd5bb8d5a5b4b8133`; packed diff is README only.
- `node ./scripts/release-gate-isolation.mjs` — PASS in 12,731 ms; attempt-1 `CLEAN`, identical archive SHA-256, 17 guarded targets, three unchanged protected locations, all direct/force/marketplace steps, and cleanup passed.
- `gh workflow run ci.yml --ref task/0038-post-simplification-release-regate` — accepted exactly once as attempt-1 run `30066159147` at candidate SHA `4db0578804ec9860891c31aef39a3e29b724e566`; no pre-existing candidate run or rerun existed.
- `gh run view 30066159147 --log` plus exact run/job metadata inspection — PASS: attempt 1 completed in success with all nine jobs successful. Ubuntu Node 22/24 and 26 compatibility plus macOS Node 22/24 each ran 259 tests with 258 passes and one intentional Windows-only evaluator skip; Windows Node 22/24 each ran 257/257 with zero skips. Every OS family logged verified native link or junction fixtures, the packed job reproduced 29 files/82,573 bytes/SHA-256 `ba0ffd878c4c47f2db6df163a8129d45c2df32e3645712ad8cd6e40da6465e3c`, and the required credential-free job observed both Stable and packed results as `success`.
- `npm pack --ignore-scripts --dry-run --json` plus candidate/worktree Git-blob comparison — PASS: 29 selected files, 82,573/324,936 bytes, zero blob mismatches, combined path/blob inventory SHA-256 `a4978a6de7184c4681f55454f8d10fd53358b8e3398478a89695355d0bca3b16`; the evidence diff contains only this package-excluded pair.
- Terminal pair validator, `npm run format:check`, `git diff --check`, remote candidate-ref inspection, and detached candidate status inspection — PASS: `DONE/PASSED` is valid, 256 files are UTF-8/LF compliant, the diff is clean, and both remote and detached candidate remain exact at `4db0578804ec9860891c31aef39a3e29b724e566` with zero detached-worktree changes.

## Results

- Execution preflight, dependency delivery, current official manual freshness, pair validation, exact dispatch, and clean branch formation passed.
- Task 0029 supersession and immutable candidate formation passed.
- All rows T-01 through T-10 passed for immutable candidate `4db0578804ec9860891c31aef39a3e29b724e566`.
- Terminal verdict: `READY_FOR_APPROVAL`.
- No product repair, candidate movement, selective retry, model/effort change, publication mutation, or external-delivery claim was introduced.

## Unverified

- The actually published tarball does not yet exist, so SPEC AC-12 remains `PUBLISHED_TARBALL_CHECK_PENDING`.
- Publication credentials were intentionally not acquired or exercised.
- The API surface did not expose an exact active model identifier, reasoning effort, or Codex version; the recorded provenance remains `UNAVAILABLE`, not inferred.

## Final Coverage Review

- [x] Compare candidate and evidence diffs to the matrix.
- [x] Map every acceptance criterion to exact executed or byte-identity evidence.
- [x] Confirm all time-sensitive checks name access time and source.
- [x] Confirm no repair, selective retry, model/effort change, or publication mutation occurred.
- [x] Confirm candidate/evidence-head package identity is exact and this pair makes no external-delivery claim.
- [x] Confirm any published-tarball-only requirement remains explicit until publication.
