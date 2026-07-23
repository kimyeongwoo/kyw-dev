# TASK 0039 — Restore Standard Delivery Authority

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Restore the approved Task-dispatch authority contract so a recognized exact, automatic, or continuous invocation completes the selected Task's ordinary `STANDARD` lifecycle without a second ceremonial approval, while failing closed at real blockers and separately authorized external boundaries.

## Dependencies

- Task 0030 planning and outcome history plus the preserved delivery-authority diagnostic diff described below.
- Task 0031 repository outcome and completed `STANDARD` delivery at exact outcome SHA `910f5820cad73fcc187ac61abf27565cf2b842b5`.

## In Scope

- Preserve and transfer the user-approved Task 0030 diagnostic diff into this Task/Test pair with reproducible blob, SHA-256, patch, commit, and Task 0031 incident evidence; only after verification, restore both completed Task 0030 files to exact `origin/main` bytes.
- Define recognized `$kyw-task NNNN`, managed `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘` invocations as authority for the selected Task's ordinary declared `STANDARD` lifecycle.
- Include implementation, acceptance-specific verification, repository `DONE/PASSED`, exact-path commit, non-force branch push, non-draft PR, exact-head PR CI, expected-head protected merge, and exact post-merge `main` CI in that ordinary lifecycle.
- Make a repository-complete `DONE/PASSED` Task with missing or pending `STANDARD` delivery return an actionable delivery-resume decision instead of an approval blocker.
- Keep complete exact-SHA delivery terminal and idempotent so another commit, PR, or merge is not requested or created.
- Fail closed on unexplained user work, local/remote identity drift, merge conflict, failed CI, review blockers, unsafe delivery evidence, or a new user-owned decision.
- Keep publication, npm registry mutation, tag, GitHub Release, public plugin submission, force push, destructive recovery, branch deletion, manual rerun, bypass, and unrelated mutation outside automatic `STANDARD` authority.
- Add acceptance-specific deterministic adapter/routing scenarios, including the Task 0031 regression shape and non-trigger behavior, not parser-only coverage.
- Preserve completed Tasks 0001–0031 and 0033–0038 byte-for-byte; add only the user-authorized literal `Task 0039` dependency to still-ready Task 0032 so active, blocked, and resumable-delivery Task 0039 states cannot be bypassed.
- Synchronize the permanent behavior, architecture, usage, repository-invariant, Skill/reference, template, and test projections affected by the restored contract.

## Out of Scope

- Implementing Task 0032 or any other pre-created future Task.
- Creating Task 0040.
- Changing the configured model or reasoning effort.
- Publishing to npm, creating a tag or GitHub Release, submitting a public plugin, deleting a branch, force pushing, rebasing, stashing, cleaning, resetting, or performing destructive recovery.
- Rewriting completed Task 0030 history in the final commit; its temporary diagnostic additions are evidence inputs that must be restored to exact `origin/main` bytes after transfer.
- Building a GitHub client into the deterministic local dispatcher. The dispatcher owns selection, authority, delivery-state decisions, and fail-closed evidence classification; the semantic execution layer performs authorized Git/GitHub actions.

## Acceptance Criteria

- [x] AC-01: Exact selection of an existing `READY/READY` Task by `$kyw-task NNNN` or managed `task NNNN 실행해줘` returns implementation plus ordinary `STANDARD` lifecycle authority with no second confirmation.
- [x] AC-02: Automatic and continuous selection carry the same per-selected-Task authority, while continuous mode remains serial and re-preflights between Tasks.
- [x] AC-03: For `DONE/PASSED` plus `RESUMABLE` required delivery, `task 진행해줘` returns an actionable delivery-resume decision rather than an approval question or generic evidence blocker.
- [x] AC-04: Valid exact-head PR and post-merge evidence returns terminal completion without authorizing or requesting duplicate commit, push, PR, or merge actions.
- [x] AC-05: Publication and the other explicitly separate external/destructive boundaries remain outside automatic `STANDARD` authority and require distinct user scope.
- [x] AC-06: CI failure, review blocker, SHA/repository/base drift, conflict, unexplained user work, and new user-owned decisions fail closed with exact reasons.
- [x] AC-07: The Task 0031 failure shape is fixed by a deterministic scenario; ordinary prose remains a non-invocation; every required invocation form is covered where available.
- [x] AC-08: The diagnostic evidence is reproduced here with verified hashes, completed Task 0030 bytes equal `origin/main` in the final diff, all Tasks 0001–0038 remain valid, and only the explicitly authorized Task 0032 dependency changes among them.
- [x] AC-09: Task 0032 declares literal `Task 0039`, is not selected while Task 0039 is active, blocked, or delivery-resumable, and becomes eligible under synthetic satisfied Task 0039 evidence without implementing Task 0032.
- [x] AC-10: The active model and effort remain unchanged, permanent sources stay synchronized, and focused, full, lint, format, pack, release, actual-routing, and final-diff verification pass as actually executed.

## Plan

- [x] Complete exact local/remote/GitHub preflight and freeze the known Task 0030 diagnostic file identities.
- [x] Create and validate this DRAFT pair, record the user-supplied shared-understanding confirmation, and promote it to `READY/READY`.
- [x] Transfer the full diagnostic facts and hashes into this pair, verify the transfer, then restore both Task 0030 files to exact `origin/main` bytes.
- [x] Prove pending-delivery priority and the bounded literal dependency protect Task 0032 without starting it.
- [x] Enter `IN_PROGRESS/RUNNING`, update canonical product/architecture/usage/repository/Skill contracts, and implement the smallest deterministic dispatcher authority and delivery-resume decision.
- [x] Add acceptance-specific integration/routing, blocker, idempotence, Task 0031 regression, ordinary-prompt, and historical-compatibility coverage.
- [x] Run focused verification, full tests, lint, format, pack/release checks, and actual routing scenarios; preserve every failure and retry.
- [x] Review the final diff against every acceptance criterion, test row, permanent-document impact, Task 0030 restoration, Task 0032 boundary, user work, and package surface.
- [x] Set this pair to evidence-backed repository `DONE/PASSED` with no repository work left in Plan, Remaining, or Resume Point, then validate it.

## Decisions

- The current user's detailed Task 0039 prompt is the explicit shared-understanding confirmation and authorizes creation, implementation, verification, and ordinary `STANDARD` delivery through post-merge `main` CI; no further ceremonial confirmation is permitted.
- A recognized invocation is the positive authority bridge. A static `STANDARD` field without a recognized current-user invocation remains only a policy declaration.
- The deterministic dispatcher will expose ordinary lifecycle authority and an explicit delivery-resume action; it will not perform Git or GitHub mutations.
- Missing or identity-bound pending delivery evidence means authorized delivery work remains. Supplied evidence that proves failure, review blockage, or identity/schema drift is a blocker; fully bound success is terminal and idempotent.
- The ordinary `STANDARD` action set is bounded to repository implementation/verification, exact-path commit, non-force push, non-draft PR, exact-head CI observation, expected-head protected merge, and exact post-merge `main` CI observation.
- Publication, registry mutation, tags, releases, public submission, force push, destructive recovery, branch deletion, manual workflow rerun, bypass/admin override, and unrelated mutation require separately explicit authority.
- Automatic/continuous dispatch selects the oldest authorized `DONE/PASSED` Task with resumable `STANDARD` delivery before `READY/READY`. Task 0032 also names literal `Task 0039` so a repository-blocked Task 0039 cannot be bypassed.
- Repository `DONE/PASSED` precedes and does not record mutable GitHub delivery. This pair terminalizes the repository outcome; the current invocation and external ledger own commit-through-post-merge completion.
- No production dependency is required.

## Risks

- Treating every delivery issue as resumable could hide CI, review, or identity blockers; final and unsafe states need separate deterministic classification.
- Encoding too little authority repeats the Task 0031 approval regression; encoding too much could authorize publication or destructive actions.
- Task 0032's reverse-number dependency must not create a cycle or make it permanently ineligible after Task 0039 delivery.
- Restoring the Task 0030 files before evidence transfer verification would lose user-approved diagnosis; retaining them in the final commit would rewrite completed historical evidence.
- Static instruction parity can pass while the actual adapter result remains ambiguous, so process-level routing scenarios are required.

## Discoveries and Changes

- Exact preflight on 2026-07-24 found local and remote `main` at `94b559893d33b352b1cfb95a847e31e198f9d175`; Task 0031 is `DONE/PASSED`, PR #17 head run `30015833323` and merge run `30016021273` are each 9/9 successful, Task 0032 is `READY/READY`, index and untracked sets are empty, and only the two expected Task 0030 files are modified.
- The known diagnostic patch has stable patch-id `dc6dc2205c7d1bf402605c1278f2496428fe1461`.
- `docs/tasks/0030-self-contained-task-dispatch/TASK.md`: `origin/main` blob `c74bd0318947fc63505cc0f6f09e66ba695d5e6b`; diagnostic worktree blob `ff56ebb3f8c7bc27bf33339fa9e29c2408167765`; diagnostic SHA-256 `801798cae0c1903cf917347ec7ea7b2988280bc6a09ca99a19558b927ba716d9`.
- `docs/tasks/0030-self-contained-task-dispatch/TEST.md`: `origin/main` blob `2cd93d7d34a07eadd3196c47572b83f407f68543`; diagnostic worktree blob `724b0633b0a44ef8044e3083dc39317549bfb862`; diagnostic SHA-256 `45fe59702e470b1bccec440dc8bef01087bddbd3917417b9d4797e44bd7c5032`.
- Approved planning contract `3cbaac64c819071f166772fd9e8b64e50369a305` said exact or automatic selection authorized the selected Task's “standard lifecycle” and required completing and inspecting external delivery before stop/advance. Its separate boundaries named publication, force push, workflow rerun, branch deletion, and authority outside the selected Task.
- Task 0030 outcome `665579b0fb6ce2a2e9f2242aee3b3577efb5cf8d` changed “standard lifecycle” to “repository lifecycle,” changed the Plan to “separately authorized external delivery,” and introduced negative `STANDARD`-alone authority wording. Task/Test recorded no reconciliation of that narrowing with the approved baseline or a current-user decision.
- The implementation correctly kept the local resolver read-only and made GitHub exact-SHA evidence a gate, but the semantic contract omitted the positive bridge from a recognized invocation to ordinary delivery authority.
- The defect reproduced on Task 0031: `task 0031 실행해줘` reached `DONE/PASSED` but ordinary commit, push, PR, merge, and post-merge CI waited for the added `main CI 확인까지 진행` instruction; `task 진행해줘` likewise did not resume delivery and prompted for authority again.
- Existing T-03 covered `READY/READY` implementation confirmation and T-09 covered supplied final ledger identity. They did not prove invocation-to-ordinary-delivery authority, delivery resume from missing evidence, exceptional-action exclusion, or the Task 0031 regression shape.
- After the evidence transfer was validated against the still-modified sources, both Task 0030 files were restored by removing only their appended diagnostic sections. Their worktree blobs now equal the recorded `origin/main` blobs, so completed Task 0030 has zero final diff.
- A literal Task 0032 dependency was considered, briefly added, and removed after the initial design review favored pending-delivery priority alone. Final adversarial review then proved `BLOCKED/BLOCKED` Task 0039 could still be bypassed by lower-numbered ready Task 0032. The user-authorized literal `Task 0039` dependency was therefore restored as the smallest fail-closed barrier; no Task 0032 implementation changed.
- The dispatcher now classifies `STANDARD` evidence as `RESUMABLE`, `BLOCKED`, or `SATISFIED`; emits `DELIVER` for authorized repository-complete work; attaches recognized-invocation lifecycle authority to `IMPLEMENT`, `RESUME`, and `DELIVER`; and keeps satisfied delivery mutation-free.
- Automatic and continuous dispatch inspect repository-complete pending delivery before any ready pair, including the reverse-number Task 0039/Task 0032 shape.
- Resolver regressions cover portable/managed exact, next, continuous, missing and identity-bound pending evidence, exact success, distinct CI/review versus identity blockers, verified execution-preflight blockers, the Task 0031 incident shape, active/blocked/delivery Task 0039 barriers, and ordinary-prompt non-routing. The packaged adapter executes all four invocation forms in child processes.

## Documentation Impact

- SPEC: Restore user-visible invocation authority, ordinary `STANDARD` lifecycle contents, delivery-resume, idempotence, and real-blocker behavior.
- ARCHITECTURE: Separate positive invocation authority from static delivery policy and define deterministic authorization/resume/block/terminal decisions.
- README: Project the normal no-second-confirmation workflow and separately authorized boundaries concisely.
- AGENTS: Keep thin; update the repository routing invariant so recognized Task execution includes ordinary `STANDARD` delivery while exceptional actions remain separate.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

<!-- Use `STANDARD` with the canonical ledger below, or `NONE — <reason>`. Record policy only, never future delivery state. -->

## Completed

- Exact local/remote/GitHub preflight passed with no unexpected drift or path.
- The user-approved Task 0030 diagnostic diff, file identities, and patch-id were captured before any restoration.
- This Task/Test pair was allocated once as Task 0039 and customized from the canonical scaffold.
- The customized DRAFT pair passed canonical validation, its diagnostic identities matched the still-preserved source files, and the current user's explicit full-lifecycle instruction supplied shared-understanding confirmation for `READY/READY`.
- The validated `READY/READY` pair entered `IN_PROGRESS/RUNNING` before any diagnostic-source restoration or implementation mutation.
- Verified the diagnostic transfer a final time and restored both completed Task 0030 files byte-for-byte to `origin/main`.
- Synchronized SPEC, Architecture, README, root/generated AGENTS, Skill, and execution reference; implemented tri-state delivery decisions, verified-preflight blocking, and explicit ordinary lifecycle authority.
- Added only literal `Task 0039` to Task 0032 Dependencies after adversarial review exposed the repository-blocked bypass; Task 0032 remains `READY/READY` and unimplemented.
- Focused resolver tests passed 16/16; packaged Task/instruction tests passed 16/16; every current Task validated without rewriting Tasks 0001–0038.
- Actual repository adapter routing with separately verified Task 0030/0031 exact ledgers returned Task 0039 `SELECTED/RESUME`, `STANDARD_LIFECYCLE`, and `ceremonialConfirmationRequired: false` for `$kyw-task 0039`, managed exact, next, and continuous forms. Ordinary explanatory prose remained `NOT_TASK_INVOCATION`.
- Final `npm run release:ci` passed 246/246 tests plus lint, format, pack, and isolated packed-release verification; the packed artifact contained 29 files and 77,618 bytes with SHA-256 `1ff93597dca86239b918764a8075ef73af279c183db44b13d6716afb702a8778`.
- Final integrity review found local `HEAD`, `origin/main`, and direct remote `main` unchanged at `94b559893d33b352b1cfb95a847e31e198f9d175`, an empty index, exactly the 15 authorized Task 0039 paths, zero Task 0030 diff, and no unexpected work.
- Both restored Task 0030 blobs equal `origin/main`: TASK `c74bd0318947fc63505cc0f6f09e66ba695d5e6b` / SHA-256 `4c447102d03c2bd87f0e14241c8112c8c746bfb81ee10384f38c216d4d6a5bec`; TEST `2cd93d7d34a07eadd3196c47572b83f407f68543` / SHA-256 `2b3a107ddbbd312bf4e0369c8c3a32a1c2a32b2f8b8a871130a3606f019e00a6`.
- All historical Tasks 0001–0038 validated with zero byte mutation; their only final diff is Task 0032's one literal `Task 0039` dependency line. `git diff --check` and the acceptance/diff review passed.

## Remaining

- None — repository outcome complete; mutable `STANDARD` delivery remains external and authorized by the current invocation.

## Resume Point

- None — repository outcome complete; continue only the authorized exact-SHA `STANDARD` delivery ledger.

## Blockers

- None known.
