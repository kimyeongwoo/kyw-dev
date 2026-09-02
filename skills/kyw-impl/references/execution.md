# Task Execution and Resume

Use this workflow only after the packaged dispatcher selects one existing Task from an explicit portable or managed-repository implementation command. `kyw-impl` never authors, allocates, or promotes a Task. Keep one Task as the execution context and mutation boundary.

## Authority

This is the canonical detailed execution procedure. Follow loaded `AGENTS.md` invariants and SPEC behavior; Task/Test owns only current scope and evidence. Stop on conflict rather than copying this procedure elsewhere.

## Contents

Establish and dispatch; apply overrides; enter/resume one Task; keep scope, evidence, and durable truth live; verify; review the final diff; checkpoint interruptions; then set an honest terminal state.

## Establish the repository state

1. Resolve the repository and dispatch-selected single `docs/tasks/NNNN-*/` directory; missing/duplicate IDs, pair/dependency errors, cycles, or multiple active Tasks block.
2. Read applicable `AGENTS.md`, the pair, and named dependencies; omit unrelated Tasks.
3. Index or search headings in README, SPEC, and ARCHITECTURE, then read only the owning permanent-document sections selected by Goal, scope, Documentation Impact, changed paths, and code dependencies. Fully read all four permanent documents for rebaseline, major redesign, broad cross-owner scope, source conflict, ambiguous ownership, or insufficient targeted truth. Stop if a conflict remains unresolved.
4. Inspect status and relevant diff before mutation, separating pre-existing work. If Git metadata is absent, establish a safe in-scope baseline, record the limitation, and never claim Git state.
5. Validate the pair and compare lifecycle, acceptance, plan, handoff, blockers, matrix, commands, and results with repository evidence.
6. Reconcile contradictions. Pass verified conflict, unexplained work, remote drift, and unresolved decisions through execution preflight; empty means checked and clear.

Large refactors derive bytes from verified exact `main`; record and re-prove branch-base, exact-head PR-base, and pre-merge-main SHAs. Treat snapshots and broad cherry-picks only as comparison evidence, and report missing proof or upstream movement as `remoteDrift`.

Proceed only when the sole dispatcher returns `IMPLEMENT`, `RESUME`, or `DELIVER`. Draft, cancelled, invalid, blocked-with-uncleared-condition, failing evidence, and nonmatching requests stop without implementation mutation.

## Dispatch and advance the queue

Keep the Skill explicit-only. `$kyw-impl NNNN` is portable; every four-digit ID uses the same generic queue path and none is reserved or intercepted for recovery. The three natural-language aliases require loaded managed `AGENTS.md` routing. Match the full command plus appended current-user text; ordinary “task” prose does not dispatch.

New pairs use contract 3; contract 2 stays queue-aware and unmarked contract 1 stays legacy. Current pairs allow only `DRAFT/DRAFT`, `READY/READY`, `IN_PROGRESS/RUNNING`, `DONE/PASSED`, `BLOCKED/BLOCKED`, and `CANCELLED/BLOCKED`. Never migrate terminal history or reinterpret its prose under contract 3.

A non-complete current Task uses the exact no-dependency sentence or distinct `- Task NNNN.` bullets; reject prose, duplicates/mixing, missing references, and cycles. Historical readers retain literal references. A hard dependency requires `DONE/PASSED` plus required external delivery.

Selection is deterministic:

1. Multiple active pairs fail closed.
2. Exact selection rejects DRAFT, permits BLOCKED condition recheck, selects eligible READY/active work, and cannot bypass another active Task.
3. Automatic selection chooses the active Task, then the lowest repository-complete Task with resumable `STANDARD` delivery, then the lowest dependency-satisfied READY Task.
4. Unrelated historical blockers do not freeze the queue.
5. Continuous mode finishes one selected Task, re-preflights, and dispatches again; it never allocates, parallelizes, or becomes background work.

With nothing selectable, report the actual frontier; never infer completion from the highest ID. Return exactly `현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?` only when every applicable Task, dependency, and delivery is satisfied, without creating work.

Current `## Delivery` is static policy: `STANDARD` uses GitHub PR/Actions exact-SHA state; reasoned `NONE` has no external gate.

For normal `$kyw-impl NNNN`, pass no delivery payload. Before its sole dispatcher call, derive the exact prior `STANDARD` set and trust one fixed-bounded rolling continuity checkpoint only when local/upstream/cached/direct/GitHub `main`, exact ordered prefix, terminal pairs, and ancestry align. Covered results are production-evaluated `DURABLE_STANDARD_CONTINUITY`, never relabeled fresh, legacy, or current ledger.

For contract 3, the first evaluator-satisfied `HARDENED_EXACT_HEAD` graph binds pair paths/bytes. Pre-dispatch rejects drift/redelivery with Task/path and `$kyw-task "<correction outcome>"`; unchanged invocation reports only. Corrections hard-depend; contracts 1/2 are grandfathered.

At most one prior `STANDARD` outcome may remain uncovered; collect its full GitHub graph through an invocation-local command cache and the unchanged evaluator, never covered GitHub objects/logs. Empty history may prepare genesis. Missing, corrupt, stale, forked, mismatched, or over-gap existing continuity stops normal dispatch without automatic whole-history replay. The separate `bootstrap-continuity` command is the only migration entry and requires exact `EXPLICIT_REBASELINE` authority; it remains fail closed on its general checkpoint, history, evaluator, identity, gap, drift, and self-coverage contract. It is not a dispatch option, source-repair path, or Task-ID exception. Persist no raw logs, secrets, API responses, mutable graph, or growing receipts; manual delivery flags are test/compatibility seams only and never production recovery input.

The trusted-local expectation uses `schemaVersion: 2`, exact repository/workflow ID/name/path, behavioral/quality/packed job-name sets, and distinct merge/gate names. Its `FINAL` binds `pullRequest`, `actualHead`/`PR_ACTUAL_HEAD`, `mergeCompatibility`/`PR_MERGE_COMPATIBILITY`, `merge`, and `postMerge`/`POST_MERGE_MAIN` to the run-level latest attempt plus each logical job's actual execution attempt, exact jobs, checkouts, and parents.

Get numeric identities, conclusions, and execution chronology from bounded GitHub `filter=all`, `filter=latest`, and attempt-specific job collections, then confirm checkout/parents from each checkout-bearing job's `KYWCIEVIDENCE` line. The run-level latest attempt never overwrites a logical job's independently derived actual execution attempt. A later actual execution supersedes earlier evidence and a failure, cancellation, incomplete result, or missing/invalid evidence never falls back; an untouched earlier execution survives only through a uniquely proven equivalent projection. A successful job at only `refs/pull/<number>/merge` is merge compatibility, never actual head. Missing logs, reused jobs, stale or fabricated attempts, ambiguous names/projections, or mismatch stops; do not rerun CI. Only wholly valid `PENDING` is resumable; `FINAL` requires the full graph.

Legacy continuity requires trusted proof predating the hardened anchor: `LEGACY_PRE_CONTRACT` version 1, `LOCAL_GIT_PRE_CONTRACT_HISTORY`, and exact anchor/merge SHAs. Its schema-1 ledger says `LEGACY_PRE_CONTRACT_CONTINUITY` and `actualHead: "UNVERIFIED"`; it never becomes exact-head PASS and is forbidden for the selected new outcome.

Classify absent or valid-pending evidence `RESUMABLE`; failing, incomplete-final, unknown-version, malformed, stale, role-confused, reused, or drifted evidence `BLOCKED`; and only a complete hardened graph or explicitly eligible legacy continuity `SATISFIED`.

Schema-3 checkpoint input is `SATISFIED` only when repository, Task, outcome, covered-main, terminal-pair, covered-set, evidence, and checkpoint digests agree. Expired covered logs do not invalidate the complete result; uncovered/current proof still fails closed, and CI never replaces behavioral acceptance.

`STANDARD` grants no ambient authority. Selection covers acceptance/terminal state, exact-path commit, non-force push, non-draft PR, exact-head review/merge/post-main, and reporting. Direct authority may arrive before/after/with dispatch without another Skill call. External categories stay separate; failure grants no retry. Conflict/drift, failed evidence/review, missing objects, or user decisions stop.

## Apply overrides and preserve model provenance

`overrideText` preserves suffix transport; consume it without re-asking. It is not permission. Classify once: Task method/order/scope/check = first-Task override; affirmative external action = separate authority; prohibition/cancellation/revocation/scope reduction narrows overlap; else no grant. Terminal preflight accepts `TASK_OVERRIDE_PRESENT` or `NO_TASK_OVERRIDE`; omission stays fail-closed. Ambiguity/contradiction stops it. Never redispatch/chain or waive acceptance, evidence honesty, safety, or preservation.

Mutation authority is a separate channel. The latest applicable directive from the trusted current user must affirm act-now and resolve action/target/scope/current attempt. Status neither grants nor revokes active work; static/untrusted text grants nothing. Assent must immediately accept one concrete resolved proposal with no choice. Conditions need act-now plus an objective, safely verified, currently true fact; otherwise no mutation/monitoring or older revival. Terminal outcome or target/scope drift ends the attempt; failure permits no retry/fallback. Standalone external commands do not redirect.

Inherit the active session's configured model and reasoning effort; do not change either unless the current user explicitly requests that change. Use the canonical five fields in `templates/task/TEST.md`: exact model, requested alias, effort, Codex surface, and version with per-field basis.

Use exact exposed values with `OBSERVED`. Use `UNAVAILABLE` as both value and observability for unexposed fields; record a known absent user override as `NOT_REQUESTED`/`OBSERVED`. Never infer values or substitute another installed CLI. Add the canonical block to an older current pair if missing.

## Enter or re-enter execution

Before implementation mutation, create/verify the selected branch; change the pair from `READY` / `READY` to `IN_PROGRESS` / `RUNNING`; record start, Remaining, and Resume Point; validate. A selected ready pair needs no reconfirmation.

If the recognized dispatcher result contains `continuityTransitionToken`, only after that branch and active pair exist invoke:

```text
node <kyw-impl-skill-directory>/../kyw-task/scripts/task-artifacts.mjs apply-continuity --tasks-root <repository>/docs/tasks --selected-task NNNN --transition-token <exact opaque token>
```

The adapter rechecks token, selected ID, active pair/branch, unchanged source `main`, required set, prior digest, and that the selected Task cannot cover itself, then atomically replaces only the checkpoint. Exact replay is byte-identical; divergent, stale, self-covering, wrong-branch/Task, or terminal use stops. Never decode, synthesize, edit, log, or retain the token; no token means no mutation.

Only a genuine user-owned blocker permits one question/recommendation. When a blocker clears, change `BLOCKED/BLOCKED` to `IN_PROGRESS/RUNNING`, record why, validate, and retain earlier blocked commands/results.

For an `IN_PROGRESS` resume:

1. Treat `Completed` as a claim to verify, not a command to repeat or trust blindly.
2. Confirm completed files, decisions, and evidence against the repository.
3. Preserve verified work and start at `Resume Point` or the first still-valid item in Remaining.
4. If it is missing, stale, or contradicted, update Discoveries, handoff, and Test before redoing only the affected work.
5. Do not rerun a completed destructive or externally visible action merely to prove it happened; use retained evidence or block.

## Enforce the current-Task boundary

During execution, mutations may include only:

- the current `TASK.md` and `TEST.md`;
- implementation and tests required by current acceptance criteria;
- permanent documents whose durable meaning changed;
- narrowly related configuration or fixtures required to verify this Task.

Preserve user-authored and pre-existing changes. Edit another numbered Task only for a bounded contract migration that the selected Task explicitly names and only while that other pair is pre-created and nonterminal; never implement its outcome. Otherwise do not edit another Task, invoke `$kyw-audit`, add installation behavior, or absorb a nearby cleanup merely because it is convenient.

Before each meaningful expansion, ask whether it is required for a current acceptance criterion. If it is required but changes intent, update the Task, Test, and owning permanent document before implementation. If it is independently shippable or belongs to a future Task, leave it out of scope and report it without creating or implementing that Task.

## Keep Task and Test live

Update both files when discovery changes design, scope, risk, behavior, commands, or coverage; after code/config changes, reassess every permanent owner in Documentation Impact.

- Keep Plan and handoff factual; check an AC only after its mapped result, and preserve published `AC-NN`/`T-NN` IDs.
- Record decisions, contradictions, discovered branches/failures/fallbacks/compatibility, and append needed Test rows before claiming coverage.
- Record exact commands, exits, concise outputs, failures/retries/skips, and residual risk; never replace failure history with only the later pass.
- Keep current evidence repository-local and never pre-claim PR/merge/post-main results. Use reasoned `Not applicable`, never bare None/empty content, and do not cap substantive release/security evidence.

Validate after lifecycle changes and before checkpoints or terminal reports.

## Route durable documentation changes

Follow `AGENTS.md` ownership: product/acceptance -> `docs/SPEC.md`; components/dependencies/flows/storage/distribution -> `docs/ARCHITECTURE.md`; setup/install/commands/configuration/usage/contributing -> `README.md`; repository-wide Codex/completion rules -> `AGENTS.md`. Update changed owners first, align Task/Test and implementation, and leave unaffected documents byte-stable with the reason recorded.

## Execute and record verification

Discover commands from repository truth and the Task. Run acceptance-specific checks, required regressions, and final-diff-implied branches. Use the planner when present: **Focused** covers changed behavior/near regressions/model evidence; **Stable** covers runtime, cross-cutting, unknown, or higher risk and still requires exact-head/post-main CI; **Release** covers release-sensitive or candidate/published boundaries. Do not duplicate proof at one boundary.

Verify directly unless the user or meaningful acceptance independence requires delegation; record any delegation. Only executed proof may pass: `PASS` is reproducible, `FAIL` preserves failure, `BLOCKED` gives condition/recovery/risk, `N/A` gives reason, and `TODO` claims nothing.

If a required check cannot run, do not substitute a generic passing command. Mark its row/Test and, when completion depends on it, Task `BLOCKED`; refresh handoff and limitation. Never use `DONE` or `PASSED` with an unexecuted required test.

## Perform the final diff coverage review

After implementation and documentation sync:

1. Reinspect status and full relevant diff against baseline; separate user work.
2. Enumerate introduced behavior, branches/errors/fallbacks, compatibility, documents, and distribution.
3. Map each to the matrix. When a newly introduced branch lacks coverage, append a test row, run the smallest proof, and record it.
4. Investigate scope drift, removing only this workflow's unintended change when safe. If safe reconciliation is impossible, record and block rather than hiding scope drift.
5. Map every AC, confirm regressions, then check the Final Coverage Review.

A generic full-suite pass does not close an unmapped branch or acceptance criterion.

## Persist a compaction or interruption checkpoint

Checkpoint when compaction appears likely, on handoff request, or before nonterminal stop. Create no separate progress/evidence file.

Persist factual `Completed`, ordered `Remaining`, executable `Resume Point`, each blocker and recovery, current decisions/discoveries/risks/document impact, separated status/diff, and Test rows/commands/failures/unverified risks.

Validate the updated pair and report the checkpoint. A fresh session must be able to verify the repository and continue without rereading unrelated Tasks or repeating Completed work.

## Set terminal status

Set `TEST.md` to `PASSED` and `TASK.md` to `DONE` only when every AC is checked/mapped, required rows and checks are evidenced, final coverage is complete, permanent truth is synchronized, no unsafe drift/blocker remains, handoff/results are accurate, and the pair validates.

For queue-aware contracts, check every Plan item and record reasoned `None` in Remaining and Resume Point. External delivery is a separate GitHub queue gate, not another repository terminal condition.

Use `BLOCKED/BLOCKED` with recovery for unmet requirements; use `CANCELLED` only on explicit cancellation and preserve pair history. Time or apparent completeness never justifies success.

Report Task ID, terminal state, scope, documentation impact, exact verification, diff/coverage, ledger delivery when queried, and residual risk. Exact/next mode stops; continuous alone re-preflights the next pre-created Task after repository and delivery success. Resumable delivery cannot be bypassed. Never perform `$kyw-audit`.
