---
name: kyw-audit
description: Independently audit one kyw-dev Task's scope, implementation, durable documentation, and test evidence, optionally repairing only clear in-scope findings. Use only when the user explicitly invokes $kyw-audit with a four-digit Task ID; do not use for general code review, security certification, Task execution, or release publishing.
---

# kyw Audit Workflow

## Inputs

Accept exactly one four-digit Task ID supplied with an explicit `$kyw-audit` invocation. Use the repository containing the current working directory unless the invocation names another target repository.

- If the ID is missing, ask for one Task ID and wait without inspecting or writing.
- If the input is ambiguous or selects more than one directory, report the ambiguity and stop without guessing.
- Do not turn a general review request into an audit or invoke `$kyw-task` on the user's behalf.

Read [Independent Task Audit](references/audit.md) completely before inspecting the repository, then follow it from baseline establishment through the final verdict.

## Independence and mutation boundary

Start read-only. Treat Task status, checked criteria, Test rows, command logs, and prior summaries as claims to verify against repository evidence.

After recording a finding, make a change only when the expected state is already established by the audited Task and permanent documents, the repair is clearly inside that Task, and the change is safe. Limit eligible mutations to:

- the audited `TASK.md` and `TEST.md`;
- implementation, tests, fixtures, or configuration required by its existing acceptance criteria;
- permanent documents whose durable meaning the in-scope repair changes or restores.

Preserve pre-existing and user-authored changes. Do not edit another numbered Task, broaden acceptance criteria to normalize drift, implement an out-of-scope finding, create a proposed follow-on Task, commit, push, publish, or write a separate audit report file.

## Required output

Return one structured report containing:

- audited Task and baseline or evidence limitations;
- findings with stable IDs, category, severity, evidence, scope, action, and status;
- in-scope fixes and exact affected-check reruns, including failed attempts;
- acceptance coverage, scope, durable-document, and final-diff conclusions;
- follow-on Task proposals for out-of-scope findings without creating them;
- residual risks and exactly one final verdict: `PASS` or `BLOCKED`.

Never claim that a command, test, diff, or history check ran when it did not.

## Stop conditions

Stop with `BLOCKED` when required sources conflict, the Task cannot be resolved uniquely, evidence is insufficient to establish scope or reproduce a required claim, a necessary repair is unsafe or out of scope, or an unresolved blocking/error finding remains. Return `PASS` only through every gate in the audit reference.
