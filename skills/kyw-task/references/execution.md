# Task Execution and Resume

Use this workflow only after create mode has a confirmed `READY` pair or the packaged dispatcher selects one existing Task from a portable or managed-repository command. Keep one Task as the context and mutation boundary.

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

1. Resolve the repository and use the packaged dispatch result for exactly one `docs/tasks/NNNN-*/` directory. Treat a missing or duplicate ID, inconsistent status pair, dependency error, cycle, or multiple active Tasks as a blocker; do not guess from titles or timestamps.
2. Read the current `TASK.md`, matching `TEST.md`, the four permanent documents, explicitly named Task dependencies, applicable repository instructions, and only the implementation/tests needed for this Task. Do not load unrelated completed or future Task contents.
3. Inspect version-control status and the relevant diff before mutation. Separate pre-existing changes from work owned by this execution. If version-control metadata is unavailable, record that limitation and establish the safest available baseline within the authorized scope without claiming Git state.
4. Run the packaged validator against the pair. Compare its status, acceptance criteria, Plan, Decisions, Discoveries, Completed, Remaining, Resume Point, and Blockers with the files and repository state. Also compare every Test row, command, result, and unverified item with available evidence.
5. Stop and reconcile a conflict among permanent sources, the Task/Test pair, or the repository before implementation. Never silently choose a convenient claim.
6. Pass verified conflict, unexplained work, remote drift, or unresolved decisions as execution-preflight findings; empty means checked and clear.

Dispatch from verified state:

- `DRAFT` / `DRAFT`: resume existing-pair customization and current-summary confirmation without allocating another ID; do not implement.
- `READY` / `READY`: start when the current summary has been confirmed and the recognized invocation authorizes implementation plus ordinary declared delivery.
- `IN_PROGRESS` / `RUNNING`: resume from verified recorded state.
- `BLOCKED` / `BLOCKED`: recheck the recorded blocker. Resume only if it cleared; otherwise refresh evidence and stop blocked.
- `DONE` / `PASSED`: validate the repository result; resume authorized ordinary `STANDARD` delivery when final evidence is absent, stop on supplied failing or unsafe evidence, or report terminal completion when delivery is satisfied.
- `CANCELLED` / `BLOCKED`: stop without implementation mutations.
- Any unsupported or contradictory pair: record the inconsistency as a blocker and stop before implementation.

A confirmation of the current create-mode summary authorizes its implementation when the summary says implementation will begin. For an already confirmed existing Task, a recognized exact, automatic, or continuous invocation that selects it authorizes implementation and its ordinary declared `STANDARD` lifecycle. An inspect-only, ambiguous, or non-matching request does not.

## Dispatch and advance the queue

Keep the Skill explicit-only. `$kyw-task NNNN` is portable anywhere the Skill is available. The three natural-language aliases work only when the applicable managed `AGENTS.md` routing contract is loaded; otherwise return the portable `$kyw-task NNNN` fallback. Match the complete anchored command plus optional appended current-user text. Ordinary prose containing “task” is not a dispatch command.

The current contract is identified by the paired `<!-- kyw-task-contract: 2 -->` marker. It uses only these Task/Test pairs:

- `DRAFT/DRAFT`;
- `READY/READY`;
- `IN_PROGRESS/RUNNING`;
- `DONE/PASSED`;
- `BLOCKED/BLOCKED`;
- `CANCELLED/BLOCKED`.

Legacy unmarked Task/Test evidence remains readable and valid under its historical contract. Do not recursively reinterpret a terminal legacy Task's old free-form dependencies, handoff prose, or delivery sequence as current queue state.

For current-contract Tasks, parse as a hard dependency only a literal singular `Task NNNN` reference inside `## Dependencies`. Ignore other prose as a queue edge. Missing referenced Tasks and cycles fail closed. A hard dependency is satisfied only by `DONE/PASSED` plus any required external delivery; `BLOCKED`, `CANCELLED`, draft, ready, active, missing, or undelivered dependencies are unsatisfied.

Selection is deterministic:

1. Fail closed if more than one `IN_PROGRESS/RUNNING` Task exists.
2. Exact selection may return a `DRAFT/DRAFT` pair for authoring, a `BLOCKED/BLOCKED` pair for read-only condition recheck, or select/resume READY or active work; another active Task blocks a different exact Task.
3. Automatic selection resumes the one active Task. With none active, select the lowest-numbered current `DONE/PASSED` Task with resumable `STANDARD` delivery before the lowest-numbered dependency-satisfied current `READY/READY` Task.
4. Historical `BLOCKED` Tasks that are neither active nor hard dependencies do not block unrelated current work.
5. Continuous mode uses the same selection once, finishes one Task serially, then performs a fresh preflight and calls the dispatcher again. It never allocates, parallelizes, or continues in the background.

When no Task is active, resumable for delivery, or selectable, use the highest current-contract Task as the queue frontier. A blocked frontier reports its blocker. Return exactly `현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?` only when that frontier is `DONE/PASSED` or `CANCELLED/BLOCKED`, every hard dependency is satisfied, and required delivery is proven. Do not create a Task in response.

Current-contract `## Delivery` contains static policy only:

- `STANDARD` uses GitHub PR/Actions exact-SHA state as the canonical ledger.
- `NONE — <reason>` requires a concrete reason and has no external delivery gate.

For `STANDARD`, first derive trusted expectations from the verified local Git remote, selected base, and repository-outcome SHA:

```json
{
  "0030": {
    "source": "LOCAL_GIT",
    "taskId": "0030",
    "repository": "owner/repository",
    "baseRef": "main",
    "outcomeSha": "<40-lowercase-hex-PR-head>"
  }
}
```

Then collect a fresh read-only GitHub snapshot as a separate Task-keyed object:

```json
{
  "0030": {
    "source": "GITHUB",
    "taskId": "0030",
    "repository": "owner/repository",
    "outcomeSha": "<40-lowercase-hex-PR-head>",
    "pullRequest": {
      "number": 123,
      "headSha": "<same-outcome-sha>",
      "baseRef": "main",
      "mergeSha": "<40-lowercase-hex-merge-sha>",
      "state": "MERGED",
      "checks": "SUCCESS",
      "review": "CLEAR",
      "runId": 456
    },
    "merge": {
      "repository": "owner/repository",
      "branch": "main",
      "sha": "<same-merge-sha>",
      "mainRunHeadSha": "<same-merge-sha>",
      "checks": "SUCCESS",
      "runId": 789
    }
  }
}
```

Pass the two objects separately through `--delivery-expectations-json` and `--delivery-ledger-json`; use path forms only for existing authorized snapshots and never create a repository file. The evaluator binds GitHub repository, base, and PR head to the independently inspected local expectations. Exact-head checks must succeed, review state must be clear, the PR merge SHA must identify the successful base-branch run head, exact run/PR identifiers must be present, and the snapshot must come from the fresh trusted GitHub query.

Classify delivery as:

- `RESUMABLE`: final evidence is absent or an identity-bound snapshot is pending; select the complete Task with `DELIVER`.
- `BLOCKED`: supplied evidence is failing, blocked, unsafe, malformed, or identity-drifted; report exact issues.
- `SATISFIED`: fresh exact evidence proves the ledger; return terminal without duplicate mutation.

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

Before the first implementation mutation, update the verified pair together from `READY` / `READY` to `IN_PROGRESS` / `RUNNING`, record the start in Completed or Discoveries, make Remaining and Resume Point concrete, and validate again.

Exact, automatic, or continuous `READY/READY` selection confirms implementation and ordinary delivery; selected resumable `DONE/PASSED` confirms delivery. Never reconfirm. Only a genuine unresolved user-owned blocker permits one question with one recommendation; otherwise use evidence or a safe reversible choice.

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

The agent executing the current Task performs risk-proportionate verification directly in the current session by default. Subagents, fresh sessions, and isolated delegates are optional tools: use them only when the user explicitly requests them, acceptance-specific independence or isolation is materially necessary, or the active agent determines that delegation would add meaningful evidence. Do not automatically create nested `codex exec` runs or a subagent cohort to satisfy generic verification, and do not block a Task merely because delegation was not used.

When delegation is used, record its purpose, scope, and result in Test evidence. Whether verification is direct or delegated, record only checks that actually ran and never turn an unexecuted check into `PASS`.

For each matrix row:

- `PASS` requires reproducible evidence from an executed command or explicit verification method.
- `FAIL` records the actual failure while corrective work continues.
- `BLOCKED` records the unavailable condition, why the row is required, recovery action, and residual risk.
- `N/A` requires a concrete reason and is valid only when the acceptance intent remains satisfied without execution.
- `TODO` means no pass claim is available.

If a required check cannot run, do not substitute a generic passing command. Set the affected row and Test to `BLOCKED`, set the Task to `BLOCKED` when completion depends on it, refresh the handoff fields, and report the limitation. Never use `DONE` or `PASSED` with an unexecuted required test.

## Perform the final diff coverage review

After implementation and documentation synchronization:

1. Reinspect status and the complete relevant diff against the pre-change state. Separate this Task's paths from pre-existing user changes.
2. Enumerate every meaningful behavior, branch, error path, fallback, compatibility effect, document change, and package/distribution change introduced by this Task.
3. Map every item to an existing matrix row. When a newly introduced branch lacks coverage, append a test row, add the smallest meaningful test or explicit verification, execute it, and record evidence before continuing.
4. Investigate out-of-scope paths or behavior. Remove only this workflow's unintended change when safe; preserve unrelated user work. If safe reconciliation is impossible, record and block rather than hiding scope drift.
5. Compare all acceptance criteria to one or more rows, confirm required regressions ran, and check every Final Coverage Review item only after the review is true.

A generic full-suite pass does not close an unmapped branch or acceptance criterion.

## Persist a compaction or interruption checkpoint

Checkpoint when compaction appears likely, the user asks for a handoff, or the session must stop before a terminal state. Do not create a separate progress, handoff, or verification document.

Before stopping, persist:

- `Completed`: verified work only, including material files and decisions;
- `Remaining`: the ordered work still required by scope and coverage;
- `Resume Point`: the exact next action, relevant path, command, and minimum context needed by a fresh session;
- `Blockers`: each active condition, its evidence, owner or clearing condition, and safe recovery step;
- current Plan, Decisions, Discoveries and Changes, Risks, and Documentation Impact;
- repository state: pre-existing changes, this Task's changed paths, and the status/diff limitation if any;
- Test Status, every row status/evidence, commands actually run, results including failures, and Unverified residual risks.

Validate the updated pair and report the checkpoint. A fresh session must be able to verify the repository and continue without rereading unrelated Tasks or repeating Completed work.

## Set terminal status

Set `TEST.md` to `PASSED` and `TASK.md` to `DONE` only when all of the following are true:

1. every acceptance criterion is checked and mapped;
2. every required matrix row is `PASS` or justified `N/A` with evidence;
3. acceptance-specific and required regression commands actually ran;
4. the final diff coverage review is complete with every checklist item checked;
5. permanent documents are synchronized only where meaning changed;
6. no unsafe scope drift or unresolved blocker remains;
7. Completed, Remaining, Resume Point, Blockers, Results, and Unverified accurately describe the terminal repository;
8. the final Task/Test pair passes validation.

For the current contract, every Plan item must also be checked and both Remaining and Resume Point must record reasoned `None` when the repository outcome is complete. External delivery state is not a ninth repository terminal condition; it is the separate queue-advancement gate in the GitHub ledger.

Use `BLOCKED` / `BLOCKED` when a required condition remains unmet and record the recovery path. Use `CANCELLED` only on explicit user cancellation and preserve the pair's history. Never mark terminal success because implementation merely looks complete or because time/context is low.

Report the Task ID, repository terminal state, scope delivered, documentation impact, exact verification summary, diff/coverage review, external delivery state from the ledger when queried, and residual risks. In exact or next mode, do not automatically start another Task. In continuous mode only, re-preflight and dispatch the next pre-created Task after the current repository outcome and required delivery succeed. In next mode, a repository-complete Task with resumable delivery is the selected work and no newer ready Task may bypass it. Never perform the independent audit owned by `$kyw-audit`.
