---
name: kyw-impl
description: Implement or resume an existing Task when the user explicitly invokes $kyw-impl NNNN. Complete local behavior and verification independently of PR, merge, and release.
---

# kyw Impl

Select the named Task using the shared `kyw-task/scripts/task-artifacts.mjs` adapter. The portable form is `$kyw-impl NNNN`; managed aliases are `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`. Other prose remains an ordinary request.

Read [Task Execution and Resume](references/execution.md) for implementation. Work on the selected outcome and actual dependencies. Unrelated Task states, unreleased versions, npm availability, and historical delivery reconstruction are not local prerequisites. Coordinate writes when another worker touches the same paths.

Preserve the current model and reasoning effort unless the user changes them. Complete authorized work without repeated permission questions. Local completion does not authorize PR, merge, or public release.
