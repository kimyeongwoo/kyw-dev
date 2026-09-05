---
name: kyw-task
description: Author minimal resumable work records when the user explicitly invokes $kyw-task with a goal, or continue an existing draft by ID. Ordinary implementation requests do not need a Task.
---

# kyw Task

Read applicable instructions, the requested outcome, and relevant code/document sections. Write the smallest useful work record. Split only for independent outcomes, risk, dependencies, or handoff needs; file counts, sessions, and compaction do not determine Task boundaries.

New work defaults to `docs/tasks/NNNN-slug/TASK.md`, using contract 5 and one structured metadata comment for ID, status, and actual dependencies. Keep goal, acceptance, important decisions, verification, and remaining work in readable Markdown. A separate `TEST.md` or matrix is optional for complex verification or requested traceability. Do not reserve a release version or query npm/GitHub before authoring.

Use the shared `scripts/task-artifacts.mjs` adapter for allocation, atomic batch creation, and validation. Run `create` for a draft or `create-batch` with complete authored content for ready outcomes. Consult the adapter's usage and task template for payload details; use a file argument for substantial JSON. The same adapter resolves the package runtime or hidden direct-install runtime. Preserve existing directories and unknown files; inspect an interrupted owned transaction before attempting recovery.

`create --tasks-root <path> --title <title>` creates the default single record. Add `--detailed-tests true` only when a separate TEST is useful. Invoke the adapter by its resolved installed/package path, keeping the target repository as the working directory.

For `$kyw-task NNNN`, continue the named draft. Read legacy Task/Test pairs in their original contract without rewriting historical evidence or bulk migration. Validate IDs, states, and dependency references, but do not impose global serial delivery.

Accept approved product direction and delegated internal choices. Ask only about a consequential unresolved choice. If the user requested authoring only, report the created record and a useful `$kyw-impl NNNN` invocation and stop. If the user already authorized implementation too, continue within that scope; invoking a Skill does not itself authorize commit, push, merge, or release.
