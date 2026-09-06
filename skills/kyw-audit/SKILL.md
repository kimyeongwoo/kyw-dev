---
name: kyw-audit
description: Independently audit current changes or a selected Task when the user invokes $kyw-audit [NNNN]. Preserve original and external state; explicit --fix enables bounded repair.
---

# kyw Audit

Read [Independent Audit](references/audit.md). Resolve the exact invocation through the shared `kyw-task/scripts/task-artifacts.mjs` adapter. `$kyw-audit` audits the current request's changes without requiring a Task; `$kyw-audit NNNN` selects that Task. Both are read-only for the original repository and external systems. Adding `--fix` explicitly permits bounded repair within the approved scope. Existing explicit repair authorization is sufficient; no additional ritual approval is needed.

Compare acceptance, code, diff, relevant documents, and actual verification evidence independently. Separate actual blocking findings, performed verification, unexecuted or uncertain checks, and their completion impact. Retain a supported `PASS` or `BLOCKED` verdict for compatibility; optional verification limits alone do not make required evidence fail. Do not turn a Task parser pass or written PASS claim into behavioral proof.
