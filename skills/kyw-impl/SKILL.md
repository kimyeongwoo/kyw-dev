---
name: kyw-impl
description: Implement an explicit quoted goal without requiring a Task, or resume an existing Task with $kyw-impl NNNN. Complete local behavior and verification independently of PR, merge, and release.
---

# kyw Impl

Route the explicit invocation through the shared `kyw-task/scripts/task-artifacts.mjs` adapter: `node <adapter> dispatch --repository-root <project> --invocation '<user invocation>'`. `$kyw-impl "goal"` selects the current goal without Task inventory or record creation. `$kyw-impl NNNN` selects an existing Task. Goals use non-empty double quotes (JSON escaping for embedded quotes); do not append IDs or options to a goal. Existing prose after an ID remains a Task override, including quoted prose; a leading `--option` is not an override. The same rule applies to managed aliases.

Managed aliases remain `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`; pass `--managed-routing true` only where managed routing is available. Other prose remains an ordinary request. The adapter selects a route; it neither implements the goal nor proves the user's authorization or the scope of changed files.

Read [Task Execution and Resume](references/execution.md) for implementation. Work on the selected outcome and actual dependencies. Unrelated Task states, unreleased versions, npm availability, and historical delivery reconstruction are not local prerequisites. Coordinate writes when another worker touches the same paths.

Preserve the current model and reasoning effort unless the user changes them. Complete authorized work without repeated permission questions. Local completion does not authorize PR, merge, or public release.
