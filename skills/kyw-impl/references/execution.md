# Task Execution and Resume

Read the selected `TASK.md`, optional `TEST.md`, applicable AGENTS, and relevant source/doc sections. Inspect status and diff first. Preserve pre-existing user changes and legacy contract evidence.

For a new contract-5 record, set status to `IN_PROGRESS` when work starts, and `DONE` when acceptance and required verification are met. Legacy pairs retain their existing state pairs, including `IN_PROGRESS/RUNNING` and `DONE/PASSED`; resume them without bulk conversion. Mark a real blocker with the reason and recovery action. Historical immutable records remain historical.

Implement the approved goal with the simplest correct approach. Accept explicit design delegation and aligned changes without ritual reconfirmation. Actual unavailable prerequisite code may block its dependent work; an unrelated prior Task's PR or release status does not.

Choose nearby checks for changed behavior, including relevant negative paths, compatibility, and data preservation. Reuse a result only when command, relevant source/tests/configuration, dependencies, required environment, and tool versions still match. A written PASS alone is insufficient. Do not repeat successful checks without changed inputs, failure, or a specific unresolved risk. Complete the required integration checks once on the final combined state.

Update affected durable documentation and inspect the final diff against acceptance. Record verification once with executed command, outcome, relevant source state, and limitations. Do not claim unexecuted tests or model behavior. Optional detailed matrices should add useful traceability rather than duplicate evidence.

Update the record at meaningful intermediate completion, interruption/handoff, or final completion: completed work, remaining work, and an actionable resume point where needed. Session-local reasoning and compaction remain with Codex; no separate progress ledger is required.

Report the result and checks. A Task may finish locally without a branch, npm lookup, reserved version, or remote service. Default implementation stops at its requested local boundary. Additional commit/PR work may continue when already authorized; merge and release require their own explicit action scope.
