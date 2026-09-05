# Task Execution and Resume

Read the selected `TASK.md`, optional `TEST.md`, applicable AGENTS, and relevant source/doc sections. Inspect status and diff first. Preserve pre-existing user changes and legacy contract evidence.

For a new contract-5 record, set status to `IN_PROGRESS` when work starts, and `DONE` when acceptance and required verification are met. Legacy pairs retain their existing state pairs, including `IN_PROGRESS/RUNNING` and `DONE/PASSED`; resume them without bulk conversion. Mark a real blocker with the reason and recovery action. Historical immutable records remain historical.

Implement the approved goal with the simplest correct approach. Accept explicit design delegation and aligned changes without ritual reconfirmation. Actual unavailable prerequisite code may block its dependent work; an unrelated prior Task's PR or release status does not.

Exact local dispatch selects a structurally valid Task and reports dependency records for inspection. Review its warnings and dependency checks, then inspect the actual prerequisite files, code, and interfaces in the current worktree before relying on them. An unfinished record does not prove absence, and a DONE record does not prove availability. Selection never means these results were verified. If a needed result is missing, identify the dependent blocker or implement the prerequisite within the approved goal; continue independent work. Coordinate overlapping source writes even when Task record paths differ.

Choose nearby checks for changed behavior, including relevant negative paths, compatibility, and data preservation. Reuse a result only when command, relevant source/tests/configuration, dependencies, required environment, and tool versions still match. A written PASS alone is insufficient. Do not repeat successful checks without changed inputs, failure, or a specific unresolved risk. Complete the required integration checks once on the final combined state.

Update affected durable documentation and inspect the final diff against acceptance. Separate the judgment that acceptance is met from observed verification: executed command, result, relevant source state, and unexecuted or uncertain scope. Exit 0 or passing tests alone do not establish acceptance; timeout, interruption, or a lost response is not confirmed success. Identify mocks and isolated production-adapter fixtures as such, without claiming actual model behavior or external execution. Optional detailed matrices should add useful traceability rather than duplicate evidence.

Update the record at meaningful intermediate completion, interruption/handoff, or final completion: completed work, remaining work, and an actionable resume point where needed. Session context remains with the available Codex features; their absence or disabled state does not block local work or require configuration changes. No separate progress ledger is required.

Report implementation judgment, observed checks, remaining uncertainty, and the actual local/PR/merge/publication state separately. A Task may finish locally without a branch, npm lookup, reserved version, or remote service. Default implementation stops at its requested local boundary. Additional commit/PR work may continue when already authorized; merge and release require their own explicit action scope.
