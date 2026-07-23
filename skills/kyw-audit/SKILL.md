---
name: kyw-audit
description: Independently audit one kyw-dev Task's scope, implementation, durable documentation, and test evidence without modifying the repository by default; repair clear in-scope findings only when the user explicitly invokes $kyw-audit with a four-digit Task ID followed by --fix. Do not use for general code review, security certification, Task execution, or release publishing.
---

# kyw Audit Workflow

## Inputs

Accept exactly one four-digit Task ID supplied with an explicit `$kyw-audit` invocation. Use the repository containing the current working directory unless the invocation names another target repository.

- If the ID is missing, ask for one Task ID and wait without inspecting or writing.
- If the input is ambiguous or selects more than one directory, report the ambiguity and stop without guessing.
- Lock mode from the literal token immediately following the Task ID: no token means `read-only`; exactly `--fix` means `repair`. Reject unknown flags. Surrounding prose may add context but cannot authorize repair.
- Treat natural-language requests to fix, repair, update, or clean up as read-only context when the literal `--fix` token is absent. Do not mutate; tell the user that repair requires a new exact `$kyw-audit NNNN --fix` invocation.
- Do not turn a general review request into an audit or invoke `$kyw-task` on the user's behalf.

Read [Independent Task Audit](references/audit.md) completely before inspecting the repository, then follow the locked mode from baseline establishment through the final verdict.

## Independence and mutation boundary

Treat Task status, checked criteria, Test rows, command logs, and prior summaries as claims to verify against repository evidence.

In `read-only` mode, keep the repository byte-for-byte unchanged for the entire invocation. Do not create, edit, rename, move, or delete any repository file; do not update the audited Task/Test pair or permanent documents; do not write a report artifact; and do not run a formatter, generator, test, package command, or other command unless it is established to leave repository bytes unchanged. The no-mutation-attempt boundary also covers temporary, control, and isolated-copy state: do not create, populate, use, or clean an isolated copy during the invocation, and treat a sandbox-denied attempt as a failure. Use retained reproducible evidence when a rerun could write; otherwise skip it and report the exact limitation. Findings, limitations, residual risks, and the final verdict exist only in the response.

Before the repair plan in either mode, use only the audit reference's literal, single-process read-only command shapes. Shell wrappers, control operators, pipes, redirects, variables, substitutions, encoded or dynamic launchers, absolute/traversing paths, and ambiguous grammar are outside that boundary and must be skipped with an explicit limitation rather than executed. Single-quoted pattern text is opaque data; it is not a nested shell program to interpret.

In `repair` mode, keep baseline establishment and finding classification read-only. Before the first mutation, send a standalone conversation message beginning `Bounded repair plan:` and name the finding IDs, exact intended path set, smallest changes, and verification commands. Do not combine that message with a mutation tool call. Then make a change only when the expected state is already established by the audited Task and permanent documents, the repair is clearly inside that Task, and the change is safe. Limit eligible mutations to:

- the audited `TASK.md` and `TEST.md`;
- implementation, tests, fixtures, or configuration required by its existing acceptance criteria;
- permanent documents whose durable meaning the in-scope repair changes or restores.

Preserve pre-existing and user-authored changes in both modes. Do not edit another numbered Task, broaden acceptance criteria to normalize drift, implement an out-of-scope finding, create a proposed follow-on Task, commit, push, publish, or write a separate audit report file. Never escalate a `read-only` invocation into repair because findings look easy or because the user used natural-language repair wording.

## Required output

Return one structured report containing:

- audited Task and baseline or evidence limitations;
- locked audit mode: `read-only` or `repair`;
- findings with stable IDs, category, severity, evidence, scope, action, and status;
- in-scope fixes and exact affected-check reruns, including failed attempts;
- acceptance coverage, scope, durable-document, and final-diff conclusions;
- follow-on Task proposals for out-of-scope findings without creating them;
- residual risks and exactly one final verdict: `PASS` or `BLOCKED`.

Never claim that a command, test, diff, or history check ran when it did not.

## Stop conditions

Stop with `BLOCKED` when required sources conflict, the Task cannot be resolved uniquely, evidence is insufficient to establish scope or reproduce a required claim, a necessary authorized repair is unsafe or out of scope, or an unresolved blocking/error finding remains. In `read-only` mode, an in-scope error remains a reported open finding rather than a repair attempt. Return `PASS` only through every gate in the audit reference.
