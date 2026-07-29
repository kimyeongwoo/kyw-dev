# Task Execution and Resume

Use this workflow only after the packaged dispatcher selects one existing Task from an explicit portable or managed-repository implementation command. `kyw-impl` never authors, allocates, or promotes a Task. Keep one Task as the execution context and mutation boundary.

## Authority

This reference is the canonical detailed execution procedure. `AGENTS.md` owns repository invariants, `docs/SPEC.md` owns product behavior, `README.md` and prompt examples are concise projections, and the current Task/Test pair owns only its delta and evidence. Stop on a contradiction instead of copying this procedure onto another loaded surface.

## Contents

- Establish the repository state
- Dispatch and advance the queue
- Apply overrides and preserve model provenance
- Enter or re-enter execution
- Enforce the current-Task boundary
- Keep Task and Test live
- Route durable documentation changes
- Execute and record verification
- Perform the final diff coverage review
- Persist a compaction or interruption checkpoint
- Set terminal status

## Establish the repository state

1. Resolve the repository and the dispatch-selected single `docs/tasks/NNNN-*/` directory. Missing/duplicate IDs, inconsistent pairs, dependency errors/cycles, or multiple active Tasks block; never guess from title or time.
2. Read applicable instructions, the pair, and named dependencies; omit unrelated Tasks.
3. Index or search headings in README, SPEC, and ARCHITECTURE, then read only the owning permanent-document sections selected by Goal, scope, Documentation Impact, changed paths, and code dependencies. Fully read all four permanent documents for rebaseline, major redesign, broad cross-owner scope, source conflict, ambiguous ownership, or insufficient targeted truth. Stop if a conflict remains unresolved.
4. Inspect status and relevant diff before mutation, separating pre-existing work. Without version-control metadata, record the limitation and establish a safe in-scope baseline without claiming Git state.
5. Validate the pair and compare its lifecycle, acceptance, plan, handoff, blockers, Test matrix, commands, and results with repository evidence.
6. Reconcile contradictions before implementation. Pass verified conflict, unexplained work, remote drift, and unresolved decisions as execution-preflight findings; empty means checked and clear.

Refactors and large-file extractions derive bytes from verified current exact `main`. Record and re-prove branch-base, PR-base at exact-head review, and pre-merge-main SHAs. Missing proof, unexplained drift, or critical-path upstream movement is `remoteDrift`; reconcile against current `main`. Old snapshots, whole-file copies, and broad cherry-picks are comparison evidence, not implementation sources.

Dispatch from verified state:

- `DRAFT` / `DRAFT`: stop without mutation and direct the user to `$kyw-task NNNN` for compatible authoring or promotion.
- `READY` / `READY`: start when a recognized existing-Task invocation authorizes implementation plus ordinary declared delivery.
- `IN_PROGRESS` / `RUNNING`: resume from verified recorded state.
- `BLOCKED` / `BLOCKED`: recheck the recorded blocker. Resume only if it cleared; otherwise refresh evidence and stop blocked.
- `DONE` / `PASSED`: validate the repository result; resume authorized ordinary `STANDARD` delivery when final evidence is absent, stop on supplied failing or unsafe evidence, or report terminal completion when delivery is satisfied.
- `CANCELLED` / `BLOCKED`: stop without implementation mutations.
- Any unsupported or contradictory pair: record the inconsistency as a blocker and stop before implementation.

Recognized selection supplies the authority stated below; inspect-only, ambiguous, create-only, and non-matching requests do not.

## Dispatch and advance the queue

Keep the Skill explicit-only. `$kyw-impl NNNN` is portable anywhere the Skill is available. The three natural-language aliases work only when the applicable managed `AGENTS.md` routing contract is loaded; otherwise return the portable `$kyw-impl NNNN` fallback. Match the complete anchored command plus optional appended current-user text. Ordinary prose containing “task” is not a dispatch command.

The current contract is identified by the paired `<!-- kyw-task-contract: 2 -->` marker. It uses only these Task/Test pairs:

- `DRAFT/DRAFT`;
- `READY/READY`;
- `IN_PROGRESS/RUNNING`;
- `DONE/PASSED`;
- `BLOCKED/BLOCKED`;
- `CANCELLED/BLOCKED`.

Legacy unmarked Task/Test evidence remains readable and valid under its historical contract. Do not recursively reinterpret a terminal legacy Task's old free-form dependencies, handoff prose, or delivery sequence as current queue state.

Each non-complete current Task uses either the exact no-dependency sentence or distinct `- Task NNNN.` bullets. Reject prose, duplicates/mixing, missing references, and cycles. Completed artifacts retain their historical literal-reference reader. Only `DONE/PASSED` plus required external delivery satisfies a hard dependency.

Selection is deterministic:

1. Fail closed if more than one `IN_PROGRESS/RUNNING` Task exists.
2. Exact selection rejects a `DRAFT/DRAFT` pair with `$kyw-task NNNN` authoring guidance, may return a `BLOCKED/BLOCKED` pair for read-only condition recheck, or selects/resumes READY or active work; another active Task blocks a different exact Task.
3. Automatic selection resumes the one active Task. With none active, select the lowest-numbered current `DONE/PASSED` Task with resumable `STANDARD` delivery before the lowest-numbered dependency-satisfied current `READY/READY` Task.
4. Historical `BLOCKED` Tasks that are neither active nor hard dependencies do not block unrelated current work.
5. Continuous mode uses the same selection once, finishes one Task serially, then performs a fresh preflight and calls the dispatcher again. It never allocates, parallelizes, or continues in the background.

With no active, resumable, or selectable Task, classify the first non-complete current Task; never infer completion from the highest ID. Report blocked/draft state or gated `TASK_CANCELLED`. Return exactly `현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?` only when every applicable Task is `DONE/PASSED` with dependencies and delivery satisfied. Never create a Task in response.

Current-contract `## Delivery` contains static policy only:

- `STANDARD` uses GitHub PR/Actions exact-SHA state as the canonical ledger.
- `NONE — <reason>` requires a concrete reason and has no external delivery gate.

For normal `$kyw-impl NNNN`, pass no delivery payload. Before its sole dispatcher call, derive the exact prior `STANDARD` set and load one fixed-bounded rolling continuity checkpoint only from aligned local/upstream/cached/direct/GitHub `main`. Its exact ordered prefix, terminal pairs, and covered ancestry must still match. Covered results use production-evaluated `DURABLE_STANDARD_CONTINUITY`, never fresh/legacy/current-ledger relabeling.

At most one prior `STANDARD` outcome may remain uncovered; collect its full GitHub graph through an invocation-local command cache and the unchanged evaluator. Never read covered GitHub objects or logs. Empty history may prepare genesis without GitHub. Existing history with missing, corrupt, stale, forked, mismatched, or over-gap continuity requires explicit migration/rebaseline: normal dispatch has no automatic whole-history fallback. External failure, drift, partial evidence, or bound exhaustion stops before mutation and retry. Persist no raw logs, secrets, API responses, mutable graph, or growing receipts. Manual delivery flags are test/compatibility seams only.

The trusted-local expectation uses `schemaVersion: 2`, exact identity, `HARDENED_EXACT_HEAD` workflow ID/name/path, behavioral/quality/packed job-name sets, and distinct merge/gate names. Schema-2 `FINAL` binds `pullRequest`, `actualHead`/`PR_ACTUAL_HEAD`, `mergeCompatibility`/`PR_MERGE_COMPATIBILITY`, `merge`, and `postMerge`/`POST_MERGE_MAIN` to exact attempts, jobs, checkouts, and parents.

Get numeric identities/conclusions from GitHub APIs and the asserted checkout/parents from each job's `KYWCIEVIDENCE` line. A successful job at only `refs/pull/<number>/merge` is merge compatibility, never actual head. Missing logs, reused jobs, stale attempts, or mismatch stops; do not rerun CI. `PENDING` is resumable only when every supplied record is valid; `FINAL` requires the whole graph.

Legacy continuity requires trusted local proof that the outcome predates the hardened anchor: `LEGACY_PRE_CONTRACT` version 1, eligibility `LOCAL_GIT_PRE_CONTRACT_HISTORY`, and exact anchor/merge SHAs. Its schema-1 ledger says `LEGACY_PRE_CONTRACT_CONTINUITY` and `actualHead: "UNVERIFIED"`. It never becomes exact-head PASS and is forbidden for the selected new outcome.

Classify absent or valid-pending evidence `RESUMABLE`; failing, incomplete-final, unknown-version, malformed, stale, role-confused, reused, or drifted evidence `BLOCKED`; and only a complete hardened graph or explicitly eligible legacy continuity `SATISFIED`.

Schema-3 checkpoint input reaches `SATISFIED` only when its repository, Task, outcome, covered-main, terminal-pair, covered-set, evidence, and checkpoint digests agree. Expired covered logs do not invalidate that complete result; uncovered/current evidence still fails closed, and CI never replaces behavioral acceptance.

The static `STANDARD` declaration alone authorizes no ambient mutation. A dispatch returning `IMPLEMENT`, `RESUME`, or `DELIVER` authorizes acceptance verification, `DONE/PASSED`, exact-path commit, non-force push, non-draft PR, exact-head CI, review/mergeability inspection, expected-head protected merge, post-merge base CI, and terminal reporting. Do not ask for ceremonial confirmation before those ordinary steps.

Publication, npm registry mutation, tag, GitHub Release, public plugin submission, force push, destructive recovery, branch deletion, workflow rerun, bypass/admin override, and unrelated mutation remain separate authority boundaries. Conflict, unexplained user work, remote drift, failed CI, review blockage, a missing required exact object, or a new user-owned decision stops the invocation.

## Apply overrides and preserve model provenance

Only current-user text appended to the matched invocation is an override. Record and consume it without re-asking. Its default scope is the first selected Task; extend it only when the user explicitly says so. It may narrow method, order, or checks but cannot waive acceptance, evidence honesty, safety, user-work preservation, or separately gated external mutation; conflicts stop.

Inherit the active session's configured model and reasoning effort. Do not set, downgrade, substitute, or sweep either value unless the current user explicitly requests that change. Record exact model, requested alias, effort, Codex surface, and version only when observable; use `UNAVAILABLE` for values the surface does not expose and never infer them.

Record model-dependent evidence in the current `TEST.md` with exactly this five-line block:

```text
## Model Provenance

- Model identifier: `<value>` (`OBSERVED|UNAVAILABLE`: <basis>)
- Requested model alias: `<value>` (`OBSERVED|UNAVAILABLE`: <basis>)
- Reasoning effort: `<value>` (`OBSERVED|UNAVAILABLE`: <basis>)
- Codex surface: `<value>` (`OBSERVED|UNAVAILABLE`: <basis>)
- Codex version: `<value>` (`OBSERVED|UNAVAILABLE`: <basis>)
```

Use the exact exposed value with `OBSERVED`. Use `UNAVAILABLE` as both value and observability when the active surface does not expose a field. A known absence of a user model override is `NOT_REQUESTED` with `OBSERVED`; it is not an inferred model alias. Do not substitute an installed CLI version for the active surface version unless this execution is observably that CLI. New scaffolds contain the block; when executing an older current pair without it, add it to that pair rather than loading another provenance file.

## Enter or re-enter execution

Before implementation mutation, create or verify the selected Task branch; change the pair together from `READY` / `READY` to `IN_PROGRESS` / `RUNNING`; record start, Remaining, and Resume Point; validate.

If the recognized dispatcher result contains `continuityTransitionToken`, only after that branch and active pair exist invoke:

```text
node <kyw-impl-skill-directory>/../kyw-task/scripts/task-artifacts.mjs apply-continuity --tasks-root <repository>/docs/tasks --selected-task NNNN --transition-token <exact opaque token>
```

The adapter rechecks token, selected ID, active pair/branch, unchanged source `main`, required set, prior digest, and that the selected Task cannot cover itself; it atomically replaces only the checkpoint. Exact replay is byte-identical. Divergent, stale, self-covering, wrong-branch/Task, or terminal use stops. Never decode, synthesize, edit, log, or retain the token; no token means no mutation.

A selected ready pair needs no reconfirmation. Only a genuine unresolved user-owned blocker permits one question with one recommendation; otherwise use evidence or a safe reversible choice.

When a recorded blocker has cleared, change `BLOCKED` / `BLOCKED` back to `IN_PROGRESS` / `RUNNING`, record why it cleared, and validate before continuing. Do not erase the earlier blocked result or command evidence.

For an `IN_PROGRESS` resume:

1. Treat `Completed` as a claim to verify, not a command to repeat or trust blindly.
2. Confirm completed files, decisions, and test evidence against the repository.
3. Preserve verified completed work and start at `Resume Point` or the first still-valid item in Remaining.
4. If recorded work is missing, stale, or contradicted by the diff, update Discoveries, Remaining, Resume Point, and Test evidence before redoing only the affected work.
5. Do not rerun a completed destructive or externally visible action merely to prove it happened. Use repository or external evidence; block when required evidence cannot be recovered safely.

## Enforce the current-Task boundary

During execution, mutations may include only:

- the current `TASK.md` and `TEST.md`;
- implementation and tests required by current acceptance criteria;
- permanent documents whose durable meaning changed;
- narrowly related configuration or fixtures required to verify this Task.

Preserve user-authored and pre-existing changes. Edit another numbered Task only for a bounded contract migration that the selected Task explicitly names and only while that other pair is pre-created and nonterminal; never implement its outcome. Otherwise do not edit another Task, invoke `$kyw-audit`, add installation behavior, or absorb a nearby cleanup merely because it is convenient.

Before each meaningful expansion, ask whether it is required for a current acceptance criterion. If it is required but changes intent, update the Task, Test, and owning permanent document before implementation. If it is independently shippable or belongs to a future Task, leave it out of scope and report it without creating or implementing that Task.

## Keep Task and Test live

Update both files whenever discovery changes design, scope, risk, expected behavior, commands, or coverage.

After every code or configuration change, reassess permanent-document impact and update Documentation Impact with the changed owner or the reason each permanent document remains unaffected.

- Keep Plan checkboxes aligned with completed work.
- Check an acceptance criterion only after its observable result and mapped verification are satisfied.
- Preserve published `AC-NN` and `T-NN` identifiers. Append identifiers for new intent; never renumber or reuse one.
- Record meaningful decisions and contradictions in Decisions or Discoveries and Changes.
- Keep Completed factual, Remaining ordered, Resume Point executable, and Blockers current.
- Add Test rows for discovered branches, failures, fallbacks, compatibility behavior, and regressions before claiming coverage.
- Record exact commands, exit status, concise output, failures, retries, skipped work, and residual risk. Never replace failed history with only the final successful run.
- Keep Plan, acceptance, Results, handoff, and Final Coverage Review repository-local. Never pre-claim a future PR, merge, post-merge run, or delivery result. Use one `Not applicable — <reason>`, never bare `None`/empty content; ACs/matrix stay substantive, with no hard cap on release/security evidence.

Validate the pair after lifecycle changes and before every checkpoint or terminal report.

## Route durable documentation changes

Classify every durable meaning change before editing code:

- product behavior, requirements, business rules, or acceptance meaning -> `docs/SPEC.md`;
- components, boundaries, dependencies, data flow, storage, or distribution structure -> `docs/ARCHITECTURE.md`;
- setup, installation, commands, configuration, usage, or contributor entry -> `README.md`;
- repository-wide Codex behavior or completion rules -> `AGENTS.md`.

Update the owning permanent document first, then align the current Task/Test and implementation. A change may affect more than one owner. Edit no permanent document merely to mark it reviewed; record why each unaffected document remains unchanged in Documentation Impact.

## Execute and record verification

Discover commands from the repository and current Task rather than assuming one universal test runner. Run acceptance-specific checks and required regressions, then add checks implied by the final diff.

Classify verification proportionally; use the repository planner when present:

- **Focused**: changed behavior, closest regressions, and explicitly required model evidence.
- **Stable**: runtime, cross-cutting, unknown, or higher-risk work; exact-head PR and post-merge `main` CI stay required.
- **Release**: release-sensitive work and candidate, registry, or published boundaries only.

Add acceptance branches the planner cannot infer. Do not repeat one command or immutable package proof at the same boundary.

Verify directly by default. Delegate only on user request or when meaningful acceptance independence/isolation requires it; never spawn generic verification cohorts or block because none was used. If delegated, record purpose, scope, and result. In all cases, only executed checks may pass.

For each row, `PASS` needs reproducible executed evidence; `FAIL` preserves an actual failure; `BLOCKED` names condition, necessity, recovery, and risk; `N/A` gives a concrete reason without losing acceptance intent; `TODO` makes no pass claim.

If a required check cannot run, do not substitute a generic passing command. Set the affected row and Test to `BLOCKED`, set the Task to `BLOCKED` when completion depends on it, refresh the handoff fields, and report the limitation. Never use `DONE` or `PASSED` with an unexecuted required test.

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

Persist verified `Completed`; ordered `Remaining`; executable `Resume Point`; evidence, owner/clearing condition, and recovery for each `Blocker`; current Plan/Decisions/Discoveries/Risks/Documentation Impact; separated repository status/diff; and Test status, rows, executed commands, failures, and Unverified risks.

Validate the updated pair and report the checkpoint. A fresh session must be able to verify the repository and continue without rereading unrelated Tasks or repeating Completed work.

## Set terminal status

Set `TEST.md` to `PASSED` and `TASK.md` to `DONE` only when every AC is checked/mapped; required rows pass or have evidenced `N/A`; required checks ran; final coverage review is checked; affected permanent truth is synchronized; no unsafe drift/blocker remains; handoff/results are accurate; and the pair validates.

For the current contract, every Plan item must also be checked and both Remaining and Resume Point must record reasoned `None` when the repository outcome is complete. External delivery state is not a ninth repository terminal condition; it is the separate queue-advancement gate in the GitHub ledger.

Use `BLOCKED` / `BLOCKED` when a required condition remains unmet and record the recovery path. Use `CANCELLED` only on explicit user cancellation and preserve the pair's history. Never mark terminal success because implementation merely looks complete or because time/context is low.

Report the Task ID, repository terminal state, scope delivered, documentation impact, exact verification summary, diff/coverage review, external delivery state from the ledger when queried, and residual risks. In exact or next mode, do not automatically start another Task. In continuous mode only, re-preflight and dispatch the next pre-created Task after the current repository outcome and required delivery succeed. In next mode, a repository-complete Task with resumable delivery is the selected work and no newer ready Task may bypass it. Never perform the independent audit owned by `$kyw-audit`.
