# Task Execution and Resume

Use this workflow only after create mode has a confirmed `READY` pair or when an explicit `$kyw-task NNNN` invocation selects an existing Task. Keep one Task as the context and mutation boundary.

## Contents

- Establish the repository state
- Enter or re-enter execution
- Enforce the current-Task boundary
- Keep Task and Test live
- Route durable documentation changes
- Execute and record verification
- Perform the final diff coverage review
- Persist a compaction or interruption checkpoint
- Set terminal status

## Establish the repository state

1. Resolve the repository and exactly one `docs/tasks/NNNN-*/` directory. Treat a missing or duplicate ID as a blocker; do not guess from titles or timestamps.
2. Read the current `TASK.md`, matching `TEST.md`, the four permanent documents, explicitly named Task dependencies, applicable repository instructions, and only the implementation/tests needed for this Task. Do not load unrelated completed or future Task contents.
3. Inspect version-control status and the relevant diff before mutation. Separate pre-existing changes from work owned by this execution. If version-control metadata is unavailable, record that limitation and establish the safest available baseline within the authorized scope without claiming Git state.
4. Run the packaged validator against the pair. Compare its status, acceptance criteria, Plan, Decisions, Discoveries, Completed, Remaining, Resume Point, and Blockers with the files and repository state. Also compare every Test row, command, result, and unverified item with available evidence.
5. Stop and reconcile a conflict among permanent sources, the Task/Test pair, or the repository before implementation. Never silently choose a convenient claim.

Dispatch from verified state:

- `DRAFT` / `DRAFT`: resume existing-pair customization and current-summary confirmation without allocating another ID; do not implement.
- `READY` / `READY`: start only when the current summary has been confirmed and the invocation authorizes execution.
- `IN_PROGRESS` / `RUNNING`: resume from verified recorded state.
- `BLOCKED` / `BLOCKED`: recheck the recorded blocker. Resume only if it cleared; otherwise refresh evidence and stop blocked.
- `DONE` / `PASSED`: validate and report the already completed result without implementation mutations.
- `CANCELLED`: stop without implementation mutations.
- Any unsupported or contradictory pair: record the inconsistency as a blocker and stop before implementation.

A confirmation of the current create-mode summary authorizes its implementation when the summary says implementation will begin. For an already confirmed `READY` pair, an explicit numeric invocation requesting execution or continuation supplies execution authorization. An inspect-only or ambiguous request does not.

## Enter or re-enter execution

Before the first implementation mutation, update the verified pair together from `READY` / `READY` to `IN_PROGRESS` / `RUNNING`, record the start in Completed or Discoveries, make Remaining and Resume Point concrete, and validate again.

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

Preserve user-authored and pre-existing changes. Do not edit another numbered Task, implement a proposed follow-on outcome, invoke `$kyw-audit`, add installation behavior, or absorb a nearby cleanup merely because it is convenient.

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

Use `BLOCKED` / `BLOCKED` when a required condition remains unmet and record the recovery path. Use `CANCELLED` only on explicit user cancellation and preserve the pair's history. Never mark terminal success because implementation merely looks complete or because time/context is low.

Report the Task ID, terminal state, scope delivered, documentation impact, exact verification summary, diff/coverage review, and residual risks. Do not automatically start another Task or perform the independent audit owned by `$kyw-audit`.
