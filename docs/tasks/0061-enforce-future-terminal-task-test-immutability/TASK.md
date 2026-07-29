# TASK 0061 — Enforce Future Terminal Task/Test Immutability

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Make every future current-contract `STANDARD` outcome use one canonical delivery and immutable terminal Task/Test evidence: after the first complete evaluator-satisfied delivery, any later correction must be a new hard-dependent Task, while all pre-cutover history remains readable and byte-unchanged and no multi-PR delivery-chain model is introduced.

## Dependencies

- Task 0060.

## In Scope

- Introduce a future-only Task/Test contract revision, migrate only this still-nonterminal pair as the cutover outcome during implementation, and make subsequent `kyw-task` authoring use that revision.
- Keep every pre-existing terminal pair on its recorded contract and preserve its exact bytes, status, dependencies, delivery history, and queue meaning without bulk migration or retroactive validation failure.
- Define the immutable boundary as the first complete production-evaluator-satisfied `HARDENED_EXACT_HEAD` delivery for a future-contract `STANDARD` Task, including its exact outcome, protected merge, and successful post-main roles.
- Bind the terminal `TASK.md` and `TEST.md` bytes at that canonical delivery so unchanged future reads, dependency checks, delivery continuity, and terminal reporting remain deterministic.
- Reject a later edit, replacement, deletion, rename, worktree substitution, or additional delivery attempt for either file of an already delivered future pair before dispatcher or implementation mutation, with the exact Task/path and correction route reported.
- Make an invocation for an already delivered future Task report-only. Route any later product, code, test, documentation, or evidence correction to a new explicit `$kyw-task "<correction outcome>"` request rather than reopening the old pair.
- Require a correction pair to hard-depend on the delivered Task it corrects, preserve the original pair byte-for-byte, and retain the existing rule that the dependency becomes selectable only after repository and external delivery satisfaction.
- Reuse the current Task artifact, queue, hydration, evaluator, and continuity engine. Keep one canonical GitHub delivery graph per future Task and one rolling continuity transition; add no PR-chain collection or storage abstraction.
- Add deterministic temporary-Git fixtures for the cutover contract, one unchanged canonical delivery, later `TASK.md` and `TEST.md` mutation, deletion/rename/worktree drift, correction dependency routing, and pre-cutover multi-merge compatibility.
- Update the canonical `kyw-task` and `kyw-impl` instructions, Task templates/runtime inventory, root and generated repository rules, focused tests, and the minimum durable SPEC, ARCHITECTURE, and README truth.
- Verify source checkout, direct managed installation, and packed/plugin installation share the same contract and enforcement with no package version, dependency, lifecycle, publication, or alternate-ledger change.

## Out of Scope

- Rewriting, renaming, reformatting, rehashing, or changing the status or delivery classification of Tasks 0001–0060 or their Test files.
- Treating Task 0059's historical correction PR as invalid, reconstructing old Task histories, or requiring existing repositories to replay or normalize pre-cutover multi-merge outcomes.
- Building a list of PRs per Task, a delivery-chain schema, per-PR receipts, a second checkpoint, another mutable ledger, a provider interface, or a new permanent document.
- Changing actual-head, synthetic-merge, review, protected-merge, post-main, attempt, job, checkout, or exact-SHA evidence requirements for the first canonical delivery.
- Changing the existing resumable or blocked behavior for a first `STANDARD` delivery that has not yet become evaluator-satisfied; the immutable correction rule starts only after canonical delivery is complete.
- Applying the new post-delivery rule to `NONE` delivery, cancelled outcomes, draft/ready/active pairs, or ordinary nonterminal evidence updates.
- Automatically allocating a correction Task from `kyw-impl`, silently inventing a dependency, implementing the correction while authoring it, or bypassing the explicit `kyw-task` boundary.
- Server-side branch protection, Git hooks, a background watcher, destructive history repair, publication, registry/version/tag/Release/public submission, force operations, workflow reruns, bypasses, branch deletion, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: A new future-only artifact contract is canonical for newly authored pairs, this Task adopts it while still nonterminal, and every pre-existing terminal pair remains readable under its recorded contract without any historical file rewrite.
- [x] AC-02: For a future-contract `STANDARD` Task, the first complete hardened exact-head delivery binds exactly one outcome/merge/post-main graph and the exact terminal `TASK.md` and `TEST.md` bytes; unchanged terminal reads remain satisfied and deterministic.
- [x] AC-03: After that canonical delivery, changing, deleting, renaming, replacing, or worktree-shadowing either terminal file fails closed before dispatcher or implementation mutation, identifies the affected Task/path, and never starts a second PR under the original Task.
- [x] AC-04: An exact invocation for an unchanged already delivered future Task is report-only, while correction intent returns explicit new-Task guidance and does not reopen, edit, demote, or redeliver the original pair.
- [x] AC-05: A post-delivery correction is represented by one new complete Task/Test pair with a canonical hard dependency on the delivered Task; the old pair stays byte-identical and normal dependency/delivery satisfaction gates the correction Task.
- [x] AC-06: All pre-cutover unmarked and current-contract histories, including Task 0059's later correction merge, retain their existing queue and delivery meaning without migration, warning-only edits, checkpoint rewrite, or retroactive immutability failure.
- [x] AC-07: The runtime stores and evaluates no multi-PR chain, PR array, correction receipt list, or alternate delivery state. One future Task has one canonical delivery graph, and later corrections obtain their own Task identity and delivery.
- [x] AC-08: Rolling continuity, the one-uncovered bound, causal checkpoint lag, exact dependency discovery, terminal reporting, and every hardened GitHub evidence role continue to work for unchanged future pairs and grandfathered prior pairs.
- [x] AC-09: Malformed contract versions, ambiguous canonical deliveries, path escape, links, unsupported types, identity drift, incomplete evidence, or unprovable mutation history fail closed without changing pair, checkpoint, refs, or transaction state.
- [x] AC-10: Source, direct user/project, and packed/plugin surfaces use one shared implementation; package/plugin version `0.1.0`, zero dependency fields, lifecycle-script absence, checkpoint package exclusion, and publication boundaries remain unchanged.
- [x] AC-11: SPEC, ARCHITECTURE, README, root/generated AGENTS, canonical Skill instructions, and templates agree on the future-only immutable boundary, dependent correction route, grandfathering rule, and absence of delivery-chain machinery.
- [x] AC-12: Focused mutation/compatibility tests, canonical pair and queue validation, planner-selected Stable or Release verification, package inspection, historical-byte comparison, final diff mapping, and whitespace checks pass with auditable evidence.

## Plan

- [x] Freeze the cutover contract, canonical-delivery boundary, immutable byte identity, correction dependency rule, grandfathering behavior, and failure taxonomy before changing runtime behavior.
- [x] Extend template/contract readers and creation so this active pair can migrate to the new contract, new pairs use it, and every prior terminal contract remains readable without rewrite.
- [x] Bind future terminal pair bytes to the existing single hardened delivery graph and add fail-closed pre-dispatch/history/worktree immutability checks without adding chain state.
- [x] Update `kyw-impl` terminal/correction routing and `kyw-task` correction authoring so a delivered Task stays report-only and a correction becomes a new hard-dependent pair.
- [x] Add positive, mutation, deletion/rename, worktree, ambiguous-history, correction-dependency, Task 0059 compatibility, continuity, queue, and failure-atomic fixtures.
- [x] Synchronize only the affected permanent owners, root/generated instruction projection, Task templates, shared runtime inventory, and packed Skill surfaces.
- [x] Run focused and planner-selected verification, compare every pre-existing pair hash, validate the full queue, inspect package and publication boundaries, and close the final diff-to-matrix review.

## Decisions

- Keep one Task because contract cutover, deterministic enforcement, correction routing, compatibility, and installed-runtime parity are one atomic lifecycle invariant; partial delivery would either leave new pairs mutable or make old history unreadable.
- Use an explicit future artifact-contract revision instead of a repository-specific Task-number or commit cutoff. This pair is the only pre-existing nonterminal pair allowed to migrate, making its own eventual delivery the first enforced outcome.
- Start immutability only after the complete canonical `STANDARD` graph is evaluator-satisfied, not merely when a PR exists. This preserves current hard-dependency semantics and leaves pending or failed first delivery under its existing resumable/blocking behavior.
- Represent every later correction as a new Task hard-dependent on the delivered outcome. Do not reopen the old Task, append evidence to it, or treat several PRs as one delivery chain.
- Grandfather pre-cutover history through reader compatibility and unchanged bytes, including legitimate historical multi-merge shapes; do not add exemptions by editing old artifacts or the continuity checkpoint.
- Reuse the single exact-SHA GitHub ledger and rolling checkpoint. The immutable pair binding is an invariant of the existing delivery graph, not a new ledger or receipt collection.
- Keep `kyw-impl` unable to allocate Tasks and `kyw-task` unable to implement them; correction routing remains two explicit invocations.
- Leave `NONE`, draft, ready, active, blocked, and cancelled lifecycle behavior unchanged because the requested boundary is a completed canonical `STANDARD` delivery.

## Risks

- Applying the rule before full delivery satisfaction could deadlock a correction behind an unsatisfied dependency; the cutover must use the existing evaluator-satisfied boundary exactly.
- A loose merge-subject or Task-number heuristic could bind the wrong delivery; enforcement must reuse exact repository, outcome, PR, merge, post-main, and pair identities already established by the hardened evaluator.
- Rejecting every historical pair delta would invalidate Task 0059 and other legitimate pre-cutover history; compatibility must be version-scoped and proved against real repository graphs.
- Accepting a second terminal merge for a future pair would silently recreate the multi-PR chain the Task removes; ambiguity must block rather than choose the newest merge.
- A contract revision can accidentally make prior terminal pairs unsupported or make new nonterminal pairs validate under obsolete grammar; creation, readers, queue, and templates must be tested together.
- Instruction-only enforcement would miss pre-existing worktree drift, while Git-only enforcement cannot prevent an agent from editing after dispatch; deterministic preflight and final current-Task scope review must reinforce the same invariant.
- Pair hashes or path checks can be bypassed by worktree substitution, rename, link, case, or normalization tricks unless physical containment and aligned-main trust are preserved.
- Permanent-document growth or duplicated procedure can obscure the single owner; durable meaning must stay concise and detailed mechanics remain in the canonical execution reference and source tests.

## Discoveries and Changes

- The repository currently has 60 canonically valid pairs: 54 `DONE/PASSED`, five historical `BLOCKED/BLOCKED`, one historical `CANCELLED/BLOCKED`, and no active, ready, or draft pair.
- Task 0060 is the latest completed outcome and establishes bounded rolling `STANDARD` continuity. Local `main`, cached `origin/main`, and the worktree all point to merge `4aa0d7dfea29b8980677a870d48a57b39f8092ef` with no local diff.
- GitHub PR #48 is merged from Task 0060's exact head, all recorded PR checks succeeded, and the exact merge SHA has a completed successful post-main CI run, so Task 0060 is a satisfied hard dependency for this outcome.
- Task 0059 reached terminal bytes in PR #46 and later changed only its `TEST.md` plus one runtime test in correction PR #47. Current local discovery still binds its first terminal delivery while the continuity checkpoint binds the later grandfathered terminal bytes; this is the concrete history that must remain valid without becoming the future model.
- The current artifact template and creator emit one current contract; readers additionally support unmarked legacy pairs and completed compatibility. A future contract revision is the portable cutover mechanism and avoids a repository-specific ID rule.
- Current checkpoint validation already rejects changes to checkpoint-covered terminal pairs after the checkpoint source main, but uncovered local delivery discovery accepts the first terminal transition without a general future post-delivery immutability contract.
- The relevant shared owners are `src/core/template-contracts.mjs`, Task artifact contract/queue/delivery/hydration/continuity modules, the packaged Task adapter, canonical Task templates, `kyw-task`/`kyw-impl` instructions, and focused artifact/delivery/instruction/installation tests.
- Full reading of README, AGENTS, SPEC, ARCHITECTURE, Task 0060, and its Test found no unresolved owner conflict. Product behavior, architecture, usage, and repository completion projections all require bounded updates.
- Task-creation transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`; all 60 existing pairs validated, the worktree is clean, and no implementation, permanent document, existing Task, Git ref, PR, CI, package, or publication state changed during authoring.
- Contract 3 is now the authoring cutover while contracts 1 and 2 remain readable; queue-aware grammar is shared by contracts 2 and 3, and terminal immutability is scoped only to contract 3.
- Canonical binding reuses the first evaluator-satisfied exact-head delivery, its protected two-parent merge, and exact Git path/blob identities. Later committed edits remain detectable even after byte reversion, and no delivery-chain or receipt schema was added.
- Focused contract, queue, dispatch, hydration, correction-dependency, and instruction tests now exercise the principal positive and negative branches. The initial fixture-marker expectation and instruction-size budget failures were corrected without relaxing their assertions.
- The pre-queue fallback reconstructs only contract-3 terminal identities already present in first-parent `main` history. It reuses the normal production evaluator and propagates immutability only after satisfaction, so invalid queue shape cannot mask delivered drift and pending first delivery keeps its existing semantics.
- Checkpoint-covered enforcement rediscovers the canonical merge/history and compares worktree content through Git blob normalization. This catches committed change-and-reversion and structural substitution without false failures from declared newline filters.
- The exact 25-path verification plan classified the change `STABLE`; the full non-publishing release composite, direct behavior, source/direct/plugin installation, historical-pair, package, publication-boundary, and final scope checks all passed.

## Documentation Impact

- SPEC: Define the future canonical-delivery immutability rule, dependent correction behavior, grandfathered compatibility, and one-delivery-per-Task acceptance without weakening existing hardened evidence.
- ARCHITECTURE: Add the artifact-contract cutover, canonical pair-byte binding and enforcement flow, correction dependency boundary, and explicit no-chain/no-new-ledger structure.
- README: Explain that a delivered Task is report-only and a later correction starts with a new explicit `kyw-task` request depending on the delivered outcome; keep the normal one-line implementation UX.
- AGENTS: Add the thin repository-wide invariant that future canonically delivered terminal pairs are immutable and corrections use a new dependent Task; keep root and generated projections aligned.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Loaded and reconciled the full permanent-document set, the canonical execution procedure, and Task 0060/Test 0060 with no unresolved source conflict.
- Validated the authored pair, confirmed `NONE / NO_TRANSACTION_EVIDENCE`, and established the immutable Tasks 0001–0060 baseline at 120 files with aggregate SHA-256 `51dd92b113ea3f0d149c126612fcdf4a77bfc70a15a7c256dddbc5117c7c3240`.
- Proved local, upstream, cached remote, direct remote, and GitHub `main` all equal `4aa0d7dfea29b8980677a870d48a57b39f8092ef`, with only this selected pair untracked.
- Called the packaged dispatcher exactly once with an empty verified execution preflight; it returned `SELECTED / IMPLEMENT / 0061`, ordinary `STANDARD` authority, and one opaque predecessor-continuity transition.
- Created branch `task/0061-enforce-future-terminal-task-test-immutability` from the verified exact `main` and entered the paired implementation lifecycle.
- Applied the opaque Task 0060 continuity transition exactly once; the checkpoint now covers Task 0060 at digest `5ed4f0cf3e82dc77ce6c22ba06660e4abf3a3e006bf7feeb5f0e6cc1eab1fb1a`.
- Migrated only this nonterminal pair and the authoring templates to contract 3, while retaining contract-1/2 reader and queue compatibility.
- Implemented canonical future-delivery discovery, exact pair binding, terminal report-only routing, explicit correction guidance, and hard-dependency gating with no new production dependency or persistent schema.
- Synchronized SPEC, ARCHITECTURE, README, root/generated AGENTS, and the canonical `kyw-task`/`kyw-impl` procedure; the representative instruction bundle again passes its fixed byte budget.
- Closed the checkpoint-covered and pre-queue structural gaps with real-Git fixtures for deletion, rename, case-confused shadowing, link/type rejection, newline normalization, history reversion, duplicate delivery, and ambiguous identity.
- Proved Task 0059's real PR #46 terminal merge plus PR #47 correction merge remains one grandfathered contract-2 outcome, and proved all 120 Task/Test files for Tasks 0001–0060 remain byte-identical to `main`.
- Passed all 61 pair validations and queue inspection, the six-scenario direct acceptance check, 48 installation/distribution tests, the 386-test Stable suite, lint/format/package gates, and the packed release candidate.
- Entered the canonical `DONE/PASSED` lifecycle, validated the terminal pair, and passed the final terminal-state Stable composite without changing package or permanent-document measurements.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker is known.
