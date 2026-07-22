# TASK 0027 — SPEC Behavioral Acceptance

## Status

BLOCKED

## Goal

Use the current active Codex session and the exact packed kyw-dev Skills to verify SPEC §15 AC-04 through AC-08 acceptance-specifically, apply only a proven minimal repository fix when allowed, and integrate either reproducible PASS evidence or an honest BLOCKED result.

## Dependencies

- Exact source base: `origin/main@46ea3ddd4a23bbdaccd75c43335bd70d2c25c465`.
- PR #11 head `b384a4c7e39f3f6860bbb3274aa12dda21b7f8c1`, merge commit `46ea3ddd4a23bbdaccd75c43335bd70d2c25c465`, and post-merge CI run `29922054134` with nine successful jobs.
- Permanent truth: `../../../README.md`, `../../../AGENTS.md`, `../../SPEC.md`, and `../../ARCHITECTURE.md`.
- Historical release evidence: Task 0020 remains `BLOCKED/BLOCKED` and is read-only for this Task.
- Historical behavioral evidence: Task 0026 remains `CANCELLED/BLOCKED`; its S-01 through S-06 intent and fixtures may be reused, but its nested/fixed-cohort execution path and verdict may not be resumed or reinterpreted.
- Packed workflow sources: the four `../../../skills/kyw-*/SKILL.md` files, directly referenced templates/references/support, `../../../scripts/spec-behavioral-e2e.mjs`, `../../../test/spec-behavioral-e2e.test.mjs`, and `../../../test/fixtures/spec-behavioral-e2e/`.

## In Scope

- Reproduce the exact local, remote, PR, and Actions preflight and create this branch from the required `origin/main` SHA without rewriting local history or user work.
- Create one unpublished real npm tarball, extract it under Task-owned isolated state, and record its source SHA, exact Codex CLI version, filename, SHA-256, packed/unpacked size, exact file count/list, four Skill hashes, extraction root, source-to-packed byte identity, and package exclusions.
- Execute S-01 through S-06 directly as the current active Codex model, with one distinct fresh filesystem fixture copy per scenario and no nested Codex, subagent, fresh-model cohort, capability probe, or additional model-backed call.
- Retain per-scenario pre/post file inventories and hashes, Git status/diff, commands/exits, mutations, preservation checks, protected-source invariants, retry history, and SPEC mapping under the evidence label `CURRENT_SESSION_DIRECT`.
- If a scenario proves a concrete repository contract or implementation defect that needs no new product decision, preserve the first failure, make the smallest allowed Skill/reference/permanent-document/test change, add focused deterministic coverage, and rerun only as authorized by the Task contract.
- Run focused and full repository verification, reconcile permanent-document impact, review final changed-path and package coverage, and set one evidence-backed terminal verdict.
- Deliver an eligible terminal result through the separately authorized one-commit, non-force push, non-draft PR, exact-head CI, expected-head merge, and post-merge main CI lifecycle without publishing the package or starting another Task.

## Out of Scope

- Resuming or modifying Tasks 0017, 0020, or 0026, or retroactively changing any of their statuses or evidence.
- Creating Task 0028 or any follow-on Task.
- Nested `codex exec`, another Codex process, subagents, a fresh model cohort, capability probes, additional model-backed calls, or Task 0026's nested S-01 through S-06 execution mode.
- Selective behavioral retry, stochastic retuning, prompt/rubric/threshold weakening, or changing acceptance to fit observed output.
- Speculative evaluator/framework work or a product change that requires a new user decision or exceeds the minimal allowed repair boundary.
- Reset, clean, stash, rebase, force operations, branch deletion, or removal of unexpected user work.
- `npm publish`, `npm publish --dry-run`, `npm run release:check`, registry mutation, tags, GitHub Releases, public plugin submission, or any other publication action.

## Acceptance Criteria

- [x] AC-01: Exact preflight proves the expected repository root, branch/HEAD/worktree, local and remote refs, remote main, PR #11, post-merge CI, Task/branch/PR number availability, and absence of later unexpected work; Tasks 0017/0020/0026 remain unchanged.
- [x] AC-02: One real unpublished tarball is attributable to the exact source commit and current Codex CLI, has a recorded exact identity/inventory, contains byte-identical packed Skills/support, excludes Task/docs/test/eval development inputs, and is extracted only under isolated Task-owned state.
- [x] AC-03: Direct S-01 and S-02 evidence proves SPEC §15 AC-04 for empty-project initialization and non-destructive existing-project adoption while preserving sentinels, user content, and application/test bytes.
- [x] AC-04: Direct S-03 evidence proves SPEC §15 AC-05 and AC-06 by allocating the exact next Task number, creating `TASK.md` and `TEST.md` together with pre-implementation traceability, refusing implementation before current-summary confirmation, and asking at most one genuine unresolved question with one recommendation when needed.
- [x] AC-05: Direct S-04 evidence proves SPEC §15 AC-05 resume behavior by reading permanent truth, the existing pair, Git state/diff, and handoff fields, then continuing from the recorded point without reallocating, recreating, repeating completed work, or making an unsupported terminal claim.
- [x] AC-06: Direct S-05 evidence proves SPEC §15 AC-07 by detecting the intentionally uncovered branch despite a passing generic suite, preserving product/test bytes, and recording the gap as unverified or blocked without claiming an unexecuted pass.
- [x] AC-07: Direct S-06 evidence proves SPEC §15 AC-08 by handling the ordinary bounded change without a numbered Task, running proportionate verification, reviewing all permanent-document routes, and editing only the document whose durable meaning changed.
- [x] AC-08: Every scenario uses a separate fresh fixture copy and records complete `CURRENT_SESSION_DIRECT` evidence, same-session limitations, exact commands/exits, pre/post hashes and Git state, mutation attribution, sentinel/unrelated preservation, protected source/package/Git/auth invariants, isolated writable state, and honest failure/retry history.
- [x] AC-09: Any observed behavioral failure is preserved; only an allowed concrete repository defect receives a minimal fix and focused regression, while model variance, policy/environment limits, unsafe user-work overlap, new decisions, or broad fixes produce an exact `BLOCKED` result without selective retry.
- [x] AC-10: Task artifact/evidence validators, focused affected tests, `npm test`, lint, format, pack check, `npm run release:ci`, and `git diff --check` actually run; final diff/package/behavior coverage and permanent-document impact are reconciled with no Task 0028, tag, release, publication, or normal-state mutation.
- [x] AC-11: The terminal result is exactly `SPEC_AC04_AC08_DIRECTLY_VERIFIED` with `DONE/PASSED` only if every required scenario and deterministic check passes; otherwise the pair is honestly `BLOCKED/BLOCKED` without claiming Task 0026, Task 0020, the full SPEC MVP, or release readiness changed.

## Plan

- [x] Reproduce the exact preflight, fetch normally, and create `task/0027-spec-behavioral-acceptance` from the required `origin/main` SHA.
- [x] Read the permanent documents, historical Task 0020/0026 evidence, packed Skill contracts and direct references, ordinary-prompt contract, existing harness/test, fixtures, and Task helper dependencies before source edits.
- [x] Create this Task/Test pair together before acceptance execution or implementation.
- [x] Validate the initialized pair and capture the exact pre-scenario repository/protected-state baseline.
- [x] Create, inspect, hash, and extract one real npm tarball without publication.
- [x] Materialize six separate isolated fixture repositories and execute S-01 through S-06 once each directly in this current session.
- [x] Classify every interruption, preserve failed evidence, make no product repair because no repository defect was proven, and use only the permitted S-04 infrastructure retry.
- [x] Run focused and full verification, validate evidence, reconcile documentation impact, and complete final diff/package coverage review.
- [x] Set the terminal Task/Test state and verdict. The authorized commit/PR/merge/CI lifecycle follows this local terminal pair and is reported out-of-band because it cannot be written into the single commit it delivers.

## Decisions

- The verification method is `CURRENT_SESSION_DIRECT`: the active Codex model reads and follows the exact extracted packed Skill bytes and performs filesystem/command work itself.
- This evidence is deliberately not labeled independent, fresh-session, subagent-verified, model-backed cohort, or hosted behavioral PASS. The same-session limitation remains explicit even if every scenario passes.
- Each scenario receives one default execution in a distinct fresh filesystem copy. There is no favorable-result retry after a behavioral failure.
- One unchanged retry is allowed only for a clearly classified OS interruption, child timeout, transient tool startup failure, or fixture copy/extraction infrastructure failure, using a new fixture and preserving the first attempt.
- The historical Task 0026 fixtures and scenario intent are inputs only. Its nested harness, retained outputs, and statuses remain unchanged.
- A real repository defect may be fixed only within the canonical Skill/direct reference, necessary permanent truth, focused deterministic test, and this pair. No new production dependency is planned.
- CI success is repository regression evidence, not behavioral acceptance evidence; direct scenario evidence is evaluated separately.
- The direct behavioral sub-verdict is immutable historical evidence. Task 0028 may remediate the repository at a different commit, but it cannot convert Task 0027's failed post-merge delivery into success.

## Risks

- Current-session execution can confirm contract-following behavior in this session but cannot provide independence or fresh-model evidence.
- Scenario interpretation can drift unless preconditions, expected/forbidden paths, and acceptance predicates are frozen before each execution.
- Temporary state or npm defaults could touch normal HOME, `.agents`, Codex, or npm configuration unless every writable target is explicitly isolated and protected locations are hashed before/after.
- S-03/S-04 share logical Task state but must use separate filesystem copies; careless reuse could weaken resume evidence.
- A behavioral failure may reflect model variance rather than a repository defect; in that case repair is forbidden and the honest result is BLOCKED.
- Windows timing or tool startup failures may be transient; only the narrowly authorized unchanged infrastructure retry is allowed.

## Discoveries and Changes

- Initial local state exactly matched the expected Task 0026 branch/HEAD, clean worktree, and `+0/-0` upstream relation.
- Live remote main was `46ea3ddd4a23bbdaccd75c43335bd70d2c25c465`; PR #11 and run `29922054134` matched the supplied merge/head identities and nine successful jobs, with no later commit, PR, or Actions run.
- Task 0027 directory, local/remote branch, and related PR were absent before allocation. Normal fetch advanced only `origin/main`; local `main` was neither checked out nor synchronized.
- The new branch began exactly at the required merge commit with an empty index and worktree.
- Permanent truth now explicitly permits direct current-session acceptance verification; Architecture's fresh-session references describe separate release/evaluator checks and do not require that method for this Task.
- Existing fixtures preserve the required S-01 through S-06 intent. Their nested model runner is out of scope, but their fixture bytes and deterministic gap contracts are reusable.
- One read-only reference-discovery command had an invalid regular expression and exited `1`; the corrected targeted `rg` command exited `0`. It changed no repository byte and is not a scenario retry.
- The exact current CLI is `codex-cli 0.145.0`; Node is `v24.11.0`, npm is `11.18.0`, Git is `2.51.2.windows.1`, and bsdtar is `3.8.4`.
- One isolated `npm pack --ignore-scripts --json` produced `kyw-dev-0.1.0.tgz` from source commit `46ea3ddd4a23bbdaccd75c43335bd70d2c25c465`: packed 62,049 bytes, unpacked 237,768 bytes, exact 29-file allowlist, SHA-256 `ff484e1d17562a2d2da9f574fe7fb8688a9dd0e9de31eae574870df396022f79`.
- All 29 extracted files are byte-identical to source. The four packed Skill hashes are audit `af1d016d...`, grilling `99e633b0...`, init `a926a719...`, and task `03a11f7b...`; no `docs/`, `test/`, `eval/`, or `scripts/` development input is packed.
- `CURRENT_SESSION_DIRECT` S-01 through S-06 all satisfied their scenario verdicts. S-05 succeeded by detecting and truthfully blocking the fixture's missing casual-branch coverage, not by treating its generic suite as acceptance PASS.
- No canonical Skill, reference, production source, permanent document, deterministic test, package configuration, or historical Task defect was proven. Accordingly, this Task makes no product repair and the only repository-owned changed paths remain its own `TASK.md` and `TEST.md`.
- S-04's first fresh copy and the retry's initial copy each exposed a Windows Git index stat-cache refresh after copied working-file timestamps changed. The first attempt is retained as invalid infrastructure evidence; the one allowed fresh retry established a stabilized `.git` pre-state and then proved identical pre/post product, Task/Test, Skill, refs/objects, status/diff, and stabilized `.git` bytes without repeating completed work.
- The acceptance-specific fail-closed validator ultimately passed all six exact status/mutation contracts, 29-file package identity, source/packed equality, Skill hashes, preservation hashes, S-03/S-04 lifecycle states, S-05 blocked row, and S-06 no-Task/document routing. Earlier validator mistakes remain recorded in `TEST.md`.
- Focused verification passed script syntax, all six fixture contracts, and 25/25 behavioral harness tests. Standalone full checks passed `npm test` 220/220, lint over 54 modules/metadata, format over 216 UTF-8/LF files, and pack check for 29 files/62,049 bytes.
- The separately required `npm run release:ci` repeated 220/220 tests, lint, format, and pack checks and passed the packed release lifecycle with the same 29 files, 62,049 bytes, and SHA-256 `ff484e1d17562a2d2da9f574fe7fb8688a9dd0e9de31eae574870df396022f79`.
- The Task-owned tarball/extraction/fixture/home/cache root was removed after evidence capture. Link-aware normal-state checkpoints, direct auth/config/npm hashes, source Git content, source Skills, and historical Tasks remained unchanged; final Git status contains only this Task's two files.
- Final local/remote safety found remote `main` still `46ea3ddd...`, no Task 0027 remote branch or PR, no run after `29922054134`, no tag, no GitHub Release, no Task 0028, and no publication action.
- Task 0027 was committed as `b7b8dd0f6dd5a9663ba092efe6f3754bed372bdb` with parent `46ea3ddd4a23bbdaccd75c43335bd70d2c25c465`, pushed non-force, and delivered through non-draft PR #12 from `task/0027-spec-behavioral-acceptance` to `main`.
- Exact-head PR run `29928926570` succeeded 9/9 at `b7b8dd0...`, including Windows/Node 24 job `88953195346`. PR #12 merged as `a72d3cdbd1e860271143ac4068501b4853b973ac` with parents `46ea3ddd... b7b8dd0...`.
- Exact-SHA post-merge main run `29929111557` failed 7/9 at `a72d3cdb...`. The actual failure was `Stable / Windows / Node 24.x` job `88953825441`: `npm test` passed 219/220 and failed `test/evaluator-cleanup.test.mjs` at `interruption checkpoints clean partially acquired resources and prevent publication`, where the evaluator temporary root still existed. `Required / credential-free CI` job `88954204846` failed only as the derivative aggregate.
- The overall delivery verdict is therefore `POST_MERGE_MAIN_CI_FAILED`. The `SPEC_AC04_AC08_DIRECTLY_VERIFIED` behavioral sub-verdict and all `CURRENT_SESSION_DIRECT` S-01 through S-06 evidence remain passed and retain their original limitations.

## Documentation Impact

- SPEC: Unchanged; Task 0027 verifies the existing AC-04 through AC-08 without changing product meaning or acceptance.
- ARCHITECTURE: Unchanged; direct evidence adds no component, dependency, data flow, storage, or distribution boundary.
- README: Unchanged; setup, commands, configuration, usage, and publication state do not change.
- AGENTS: Unchanged; the current-session direct-verification rule already governs this Task.

## Completed

- Reproduced and recorded the exact local/remote/PR/Actions preflight without modifying unexpected state.
- Fetched `origin` normally and created the dedicated Task branch at the exact required `origin/main` commit.
- Read and reconciled every required permanent, historical, Skill/reference/template/support, harness/test, fixture, and ordinary-prompt source.
- Atomically allocated Task 0027 and created this Task/Test pair before scenario execution or product implementation.
- Validated the pair, captured pre-scenario repository/protected-state evidence, and proved normal writable state was redirected below `C:/1kyw/5.personal/kyw_dev_task0027_state_46ea3ddd`.
- Created and inspected the one real unpublished tarball, extracted it below the Task-owned root, and proved its exact identity, allowlist, exclusions, four Skill hashes, and complete source byte parity.
- Read the extracted packed Skills/support directly and executed S-01 through S-06 in separate fixture roots as `CURRENT_SESSION_DIRECT` without a nested Codex process, subagent, fresh model cohort, capability probe, or added model call.
- Preserved every interruption and invalid infrastructure attempt; used one fresh S-04 retry for a classified fixture-copy/Git-index cache issue and no behavioral-result retry.
- Passed the aggregate Task 0027 acceptance-specific evidence validator; no repository defect or product fix was required.
- Passed focused syntax/fixture/25-test verification, standalone full verification, and `npm run release:ci`; reviewed every changed path, package file, behavior, branch, fallback, document route, and explicit limitation.
- Rechecked normal/protected state and historical Tasks, removed the exact Task-owned disposable root, and confirmed only this Task/Test pair remains changed.
- Set terminal verdict `SPEC_AC04_AC08_DIRECTLY_VERIFIED`. This does not alter Task 0017, Task 0020, Task 0026, full-MVP acceptance, release readiness, or publication authority.
- Completed the original pre-merge lifecycle through exact-head PR CI 9/9 and expected-head PR #12 merge; the subsequent exact-merge-SHA main CI failure prevented delivery completion.

## Remaining

- Historical delivery blocker: exact merge commit `a72d3cdbd1e860271143ac4068501b4853b973ac` has post-merge main run `29929111557` at 7/9 with actual Windows/Node 24 job `88953825441` failed and aggregate job `88954204846` failed derivatively.
- Task 0027 must not be resumed for implementation or re-execution. Remediation is owned exclusively by Task 0028.

## Resume Point

Do not resume Task 0027 for implementation, behavioral rerun, or status conversion. Preserve its direct behavioral PASS and failed post-merge delivery evidence; continue remediation only in Task 0028.

## Blockers

- `POST_MERGE_MAIN_CI_FAILED`: run `29929111557` at exact Task 0027 merge SHA `a72d3cdb...` failed 7/9 because Windows/Node 24 job `88953825441` failed 219/220; aggregate job `88954204846` is derivative. This historical blocker is not cleared by later Task 0028 commits or CI.

## Verdict

Behavioral sub-verdict: `SPEC_AC04_AC08_DIRECTLY_VERIFIED` (`CURRENT_SESSION_DIRECT`, passed)

Overall delivery verdict: `POST_MERGE_MAIN_CI_FAILED`
