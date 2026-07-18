# Independent Task Audit

Use this workflow only after an explicit `$kyw-audit NNNN` or `$kyw-audit NNNN --fix` invocation resolves one existing kyw-dev Task. Audit the Task against established intent and evidence; do not invent a better design or new product requirement.

## Contents

- Establish an independent baseline
- Record findings consistently
- Audit acceptance and test evidence
- Audit implementation, scope, and durable documents
- Preserve the read-only contract
- Repair only in explicit fix mode
- Re-audit and set the verdict
- Report the result

## Lock the audit mode

Lock the mode once, before repository inspection:

- `$kyw-audit NNNN` is `read-only` mode. It may inspect and report but must leave every tracked, untracked, generated, Task/Test, and durable-document byte unchanged.
- `$kyw-audit NNNN --fix` is `repair` mode. The literal `--fix` token immediately after the one Task ID is the only repair authorization.

Surrounding prose may narrow scope or provide evidence. It cannot upgrade a bare invocation. Natural-language requests such as “fix the findings” or “repair anything clear” without the literal token remain read-only; report that a new exact invocation is required. Reject unknown flags and multiple IDs without inspection or mutation. Do not convert modes later because a finding is easy, a Task is marked complete, or the user confirms a proposed fix without issuing a new explicit invocation.

## Establish an independent baseline

1. Resolve the target repository and exactly one `docs/tasks/NNNN-*/` directory. A missing or duplicate ID is a blocking finding; never choose by title, timestamp, or apparent relevance.
2. Read the audited `TASK.md` and `TEST.md`, the applicable `AGENTS.md`, the four permanent documents, explicitly named dependencies, and only the implementation, tests, manifests, or configuration needed to evaluate this Task. Do not load unrelated completed or future Tasks.
3. Inspect version-control status with non-mutating options before any possible repair. Inspect the relevant staged and unstaged diff, Task baseline or comparison commit when recorded, and only the history needed to attribute current changes. Separate pre-existing or user-authored changes from work attributable to the audited Task. Disable optional Git locks or refresh writes when the environment supports it.
4. If Git metadata or a recorded comparison point is unavailable, record the limitation and use the safest authorized reproducible substitute, such as a pre-change snapshot, supplied patch, release artifact, file inventory, or hashes. Return `BLOCKED` when the substitute cannot establish the scope and behavior needed for this audit; never imply that Git state or history was recovered.
5. Run the repository's Task/Test contract validator when available. Independently compare status, acceptance criteria, scope, Decisions, Discoveries, Documentation Impact, Completed, Remaining, Resume Point, Blockers, matrix rows, Commands, Results, Unverified, and Final Coverage Review with the repository. A validator pass is useful evidence, not a substitute for this audit.
6. Inventory the changed paths, observable behaviors, branches and error paths, permanent-document claims, test commands, package effects, and recorded limitations that the final verdict must cover.

If permanent sources conflict materially, record the competing claims and return `BLOCKED`. Do not silently select one or repair code against an unsettled source.

## Record findings consistently

Assign findings stable sequential IDs `F-01`, `F-02`, and so on. Keep an ID stable through repair and re-audit.

Use exactly one category:

- `scope`: changed work cannot be attributed to the audited Task or exceeds its boundaries;
- `behavior`: implementation does not satisfy established acceptance or product behavior;
- `architecture`: components, dependencies, boundaries, data flow, storage, or distribution disagree with established architecture;
- `docs`: README, AGENTS, SPEC, or other durable claims are stale or routed to the wrong owner;
- `test-evidence`: intent mapping, meaningful coverage, execution evidence, handoff state, or result claims are incomplete or unsupported.

Use one severity:

- `BLOCKER`: the audit, required reproduction, or a safe repair cannot proceed because a prerequisite or trustworthy baseline is unavailable;
- `ERROR`: evidence demonstrates a mismatch that must be fixed or explicitly removed from the audited Task's completion claim;
- `WARNING`: a concrete non-blocking limitation or residual risk does not falsify an acceptance claim.

For every finding record:

| Field | Required content |
|---|---|
| ID | Stable `F-NN` identifier |
| Category | One allowed category |
| Severity | `BLOCKER`, `ERROR`, or `WARNING` |
| Evidence | Path and line, diff hunk, command and exit result, or reproducible artifact |
| Expected / actual | Existing source of expected truth and observed mismatch |
| Scope | `in-scope`, `out-of-scope`, or `uncertain` with reason |
| Action | Repair, recovery step, or proposed follow-on outcome |
| Status | `OPEN`, `FIXED`, `DEFERRED`, or `BLOCKED` |

Do not report taste, preferred refactors, speculative risks, or generic best practices as findings. When evidence is insufficient, say what is missing and classify the finding as uncertain instead of asserting a defect.

## Audit acceptance and test evidence

1. Enumerate every published acceptance ID without renumbering it. Confirm that each criterion maps to at least one matrix row and that every referenced acceptance ID exists. Prose mentions do not count as mappings.
2. Confirm each row states a meaningful intent, method, level, status, and evidence appropriate to that status. A checked criterion or generic full-suite pass does not replace acceptance-specific coverage.
3. Treat a `PASS` row as a claim. Require an exact executed command or explicit verification procedure, a concise result with exit status or observable outcome, and enough test or artifact identity to reproduce the claim. Placeholders, future-tense plans, `all tests passed`, an unavailable command, or evidence copied from another state do not support `PASS`.
4. Reproduce the narrowest safe acceptance-specific checks and required regressions allowed by the locked mode. Do not repeat destructive, externally visible, expensive, credential-dependent, or writing actions merely to obtain a fresh timestamp; verify retained evidence when possible and return `BLOCKED` when required proof cannot be recovered safely. In read-only mode, do not prepare or clean an isolated rerun copy as a workaround.
5. Compare the final implementation diff with the original matrix. Add findings for meaningful branches, error paths, fallbacks, compatibility behavior, package changes, or regressions that have no test or explicit verification.
6. Verify that Commands and Results retain actual failures and retries, Unverified names every skipped or unavailable check with residual risk, and Final Coverage Review boxes are checked only when their claims are true.
7. Verify that Completed work exists, Remaining and Resume Point match reality, Blockers are current, and terminal Task/Test statuses agree with reproducible evidence.

Record an unmapped criterion or unsupported `PASS` as an `ERROR` in `test-evidence`. Never downgrade it because unrelated tests pass.

## Audit implementation, scope, and durable documents

For each changed path and meaningful behavior:

1. Map it to an existing acceptance criterion, explicit In Scope item, necessary test/fixture, or required documentation synchronization.
2. Compare implementation behavior with `docs/SPEC.md`; compare components, boundaries, dependencies, data flow, storage, and distribution with `docs/ARCHITECTURE.md`.
3. Compare setup, commands, configuration, usage, and contributor entry with `README.md`; compare repository-wide Codex invariants with `AGENTS.md`.
4. Distinguish a stale permanent document from an intentional Task-local choice. Task prose cannot silently override permanent truth; a durable behavior or structure change must update its owner.
5. Confirm package and distribution changes are covered when the final diff changes packed files, metadata, adapters, or runtime boundaries.
6. Preserve unrelated user work. When attribution is uncertain, record the ambiguity and block any destructive reconciliation.

An out-of-scope implementation is an open `scope` error even when it appears useful or tests pass. Do not edit, delete, or absorb it into the current Task. Propose a follow-on Task with a one-sentence Goal, dependency, scope boundary, and observable acceptance outline in the report only; do not allocate an ID or create files.

## Preserve the read-only contract

In `read-only` mode, complete the full inspection and reporting workflow without a repository mutation:

1. Do not call file-editing tools or run a command that can create, edit, rename, move, delete, format, generate, install, recover, clean, stage, commit, or publish filesystem content. This prohibition covers the repository and temporary, control, cache, snapshot, and isolated-copy locations; a denied attempt still violates the contract.
2. Do not update Task/Test status, check boxes, findings, Results, Unverified, handoff fields, permanent documents, generated files, caches, snapshots, or audit reports in the repository.
3. Rerun a command in place only when repository evidence establishes that it is worktree-byte-preserving. When a required test, formatter, generator, packager, or build may write, use retained reproducible evidence. Do not create, populate, run against, or remove an isolated copy during the read-only invocation; skip the rerun and record the proof limitation.
4. Record every skipped rerun and the resulting proof limitation. Reduced rerun evidence may produce `BLOCKED`, but never authorizes a helpful write.
5. Report all findings with stable IDs, scope/document/test drift, exact evidence inspected, residual risk, and the final verdict in the response only. `Fixes and reruns` must say `None` unless a byte-preserving rerun actually occurred and is clearly identified.

Any repository write or attempted mutating command during `read-only` mode is a contract failure. The command boundary applies outside the repository too, so temporary-copy preparation or cleanup is not an exception. Stop, disclose it, and return `BLOCKED`; do not hide the attempt because the sandbox prevented it or because the final worktree happens to match.

## Repair only in explicit fix mode

This section applies only when the locked mode is `repair`. A finding is not repairable in a bare audit, even when every eligibility rule below is satisfied.

A finding is repairable only when all of the following are true:

- established Task or permanent truth determines the expected result without a new user decision;
- the repair is required by an existing acceptance criterion or its necessary evidence;
- affected files lie inside the audited Task's permitted implementation, test, Task/Test, or documentation boundary;
- the smallest fix preserves user-authored and pre-existing work;
- the repair can be verified with an available focused check.

Before any eligible repair, send a standalone conversation message beginning `Bounded repair plan:`. Name the finding IDs, the exact intended path set, the smallest expected change, the focused check, and the required regressions. Do not combine this message with a mutation tool call. If the plan reveals an ambiguous requirement, uncertain ownership, or out-of-scope path, do not mutate it.

For an eligible repair after the plan is visible:

1. Record the finding before changing files. Update Task/Test intent, Discoveries, risk, coverage, or handoff fields first when the discovery makes them inaccurate; preserve published `AC-NN` and `T-NN` IDs and append new test IDs when coverage grows.
2. Route durable meaning to its permanent owner. Restore stale documentation when implementation already matches established Task intent; do not rewrite requirements merely to make current code pass.
3. Apply the smallest implementation, test, fixture, configuration, or documentation change that closes the finding.
4. Update Task/Test with the exact fix, changed documentation impact, command, exit result, and retained failed or unsupported prior evidence.
5. Rerun the affected acceptance-specific check, then every regression or package check made necessary by the repair. A generic suite alone is insufficient when the finding names a narrower behavior.
6. Reinspect the complete relevant diff and finding. Mark it `FIXED` only when expected and actual state agree and rerun evidence is reproducible.

If a repair fails, requires a new product/design decision, would overwrite uncertain work, or grows beyond current scope, stop changing it. Retain the failed evidence, mark the finding `BLOCKED` or `DEFERRED` as appropriate, and return `BLOCKED`.

## Re-audit and set the verdict

After every authorized repair, repeat the affected acceptance, scope, documentation, evidence, and diff checks. Before the verdict, review all changed paths and map every meaningful behavior, branch, error path, compatibility effect, durable-document change, and package effect to a matrix row or explicit blocking limitation. In read-only mode, perform the same verdict review with every finding left in its observed state.

Return `PASS` only when all of these gates hold:

1. the Task and comparison baseline are resolved with enough evidence;
2. permanent sources and the final Task/Test pair are consistent;
3. every acceptance criterion has meaningful mapped coverage;
4. every required `PASS` or justified `N/A` claim is reproducible, and required regressions actually ran;
5. meaningful implementation branches and error paths are covered;
6. implementation scope and durable documents agree with established intent;
7. every in-scope repair has affected-check rerun evidence and final diff coverage;
8. no out-of-scope implementation, unresolved blocker, or open error remains;
9. Task/Test evidence and handoff fields describe the final repository accurately and the pair validates.

Return `BLOCKED` when any gate is unproven. A `WARNING` may remain with `PASS` only when its evidence shows that it does not undermine scope, acceptance, required verification, or document consistency. There is no third verdict, and partial success is not `PASS`.

## Report the result

Return the report in this order:

1. `Verdict`: `PASS` or `BLOCKED` and one-sentence reason.
2. `Audited Task`: ID, directory, locked mode, final Task/Test state, and comparison baseline.
3. `Findings`: ordered finding records; write `None` when there are no findings.
4. `Fixes and reruns`: files changed, exact commands or procedures, exit results, and retained failures; write `None` for repository fixes when the audit was read-only and distinguish any byte-preserving or isolated evidence rerun.
5. `Coverage and consistency`: acceptance mapping, meaningful branches, scope, permanent documents, package effects, and final diff review.
6. `Proposed follow-on Tasks`: recommendations for out-of-scope findings without created IDs or files.
7. `Residual risks`: unavailable Git/history, skipped checks, external dependencies, warnings, and recovery actions.

Keep the report concise but evidence-specific. Do not write it to the repository or publish it externally. Never claim that a check ran when it did not.
