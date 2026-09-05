---
name: kyw-audit
description: Independently audit a selected Task when the user invokes $kyw-audit NNNN. Preserve original and external state; explicit --fix enables bounded repair.
---

# kyw Audit

Read [Independent Task Audit](references/audit.md). Default `$kyw-audit NNNN` is read-only for the original repository and external systems. `$kyw-audit NNNN --fix` explicitly permits repair within the selected Task's approved scope. Existing explicit repair authorization is sufficient; no additional ritual approval is needed.

Compare acceptance, code, diff, relevant documents, and actual verification evidence independently. Report actionable findings, available evidence, unexecuted verification, and a supported `PASS` or `BLOCKED` verdict. Do not turn a Task parser pass or written PASS claim into behavioral proof.
