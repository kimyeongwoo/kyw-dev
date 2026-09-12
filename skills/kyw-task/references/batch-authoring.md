# Authoring a Task batch

Use `create` to allocate one default DRAFT record from the Task template. Use `create-batch` to allocate and validate authored records atomically, including actual dependencies between outcomes. Contract 5 accepts DRAFT as well as READY: `create-batch` neither promotes records to READY nor requires that status. The example below is READY because its goals, acceptance conditions, and remaining work are prepared; implementation and verification still remain.

Resolve the [adapter](../scripts/task-artifacts.mjs) relative to the installed `kyw-task` directory in either the package/plugin or direct installation. Keep the target repository as the working directory. These are alternative commands; replace `<resolved kyw-task>` with that directory:

```text
node "<resolved kyw-task>/scripts/task-artifacts.mjs" create --tasks-root docs/tasks --title "Describe an outcome"
node "<resolved kyw-task>/scripts/task-artifacts.mjs" create-batch --tasks-root docs/tasks --batch-file batch.json
```

For the batch command, save the complete JSON block below as UTF-8 `batch.json`. `--batch-file` reads that file as JSON; use it instead of inline `--batch-json` for substantial payloads. The main example needs no existing Tasks and can also use an empty temporary directory as `--tasks-root`. The adapter allocates the IDs, replaces `{{TASK_ID}}` and `{{TASK_TITLE}}`, and returns the resulting Task paths.

```json
{
  "schemaVersion": 1,
  "tasks": [
    {
      "title": "Normalize tag labels",
      "taskMarkdown": "# TASK {{TASK_ID}} — {{TASK_TITLE}}\n\n<!-- kyw-task-contract: 5 -->\n<!-- kyw-task: {\"id\":\"{{TASK_ID}}\",\"status\":\"READY\",\"dependencies\":[]} -->\n\n## Goal\nProvide a reusable normalizeTags(labels) function for an array of string labels.\n\n## Acceptance\n- Trim whitespace, convert labels to lowercase, and omit empty labels.\n- Remove duplicates while preserving the first occurrence order.\n- An empty input array returns an empty array without changing the input.\n\n## Verification\nNot run. Add and run focused tests for whitespace, case, duplicates, empty input, and input preservation. Record the actual command and result after execution.\n\n## Remaining work\n- Implement the normalization function.\n- Add the acceptance tests and run them.\n- Record the implementation location and verification result for the dependent Task.\n",
      "dependencies": []
    },
    {
      "title": "Filter items by normalized tags",
      "taskMarkdown": "# TASK {{TASK_ID}} — {{TASK_TITLE}}\n\n<!-- kyw-task-contract: 5 -->\n<!-- kyw-task: {\"id\":\"{{TASK_ID}}\",\"status\":\"READY\",\"dependencies\":[]} -->\n\n## Goal\nUse the normalization function produced by Normalize tag labels to filter items with string-array tags by selected labels.\n\n## Acceptance\n- Normalize each item's tags and the selected labels with the shared function.\n- Include an item when every normalized selected label matches one of its normalized tags.\n- An empty normalized selection includes all items in their original order.\n- Filtering leaves the input items and their tags unchanged.\n\n## Verification\nNot run. Add and run focused tests for case and whitespace equivalence, multiple selected labels, unmatched labels, empty selection, and input preservation. Record the actual command and result after execution.\n\n## Remaining work\n- Inspect the prerequisite normalization implementation and its recorded verification.\n- Implement filtering with that function.\n- Add the acceptance tests, run them, and record the result.\n",
      "dependencies": [
        { "taskTitle": "Normalize tag labels" }
      ]
    }
  ]
}
```

The top-level object contains exactly `schemaVersion: 1` and `tasks`. Each Task supplies `title` and `taskMarkdown` with the contract-5 marker, one metadata comment, and both required replacement tokens. Contract 5 creates only `TASK.md` by default. A separate TEST is optional via `testMarkdown`; if supplied, it also needs `{{TASK_ID}}` and `{{TASK_TITLE}}`. `key`, `releaseVersion`, and legacy contract fields or dependency/release replacement tokens are not required for this format.

For new Tasks in the same batch, copy the prerequisite's title into `{ "taskTitle": "Normalize tag labels" }`; do not predict its allocated ID. Title lookup is within the current batch after normalization. A missing title rejects the batch; an ambiguous title also rejects it. Give outcomes distinct titles instead of guessing which match will be used. Titles that produce the same internal key may be rejected as duplicates before dependency lookup.

Use `dependencies: [{ "taskId": "0001" }]` only after confirming that Task `0001` already exists as a valid record in the target tasks root and represents an actual prerequisite. Its implementation need not be complete when authoring the new Task; confirm the required result in the worktree when implementing the dependent work. This is a separate existing-Task example, not a prerequisite of the main JSON batch. A reference to an absent Task or an ID allocated to a new Task in this batch is invalid.

Declare actual prerequisites in each Task's structured `dependencies` array. Leave the metadata comment's `dependencies` as `[]` while authoring new references, as in the example: the adapter fills it with resolved IDs. If metadata already contains IDs, they must match the resolved structured references in the same order; conflicting or undeclared metadata dependencies reject the batch. Keep dependency explanations in the prose consistent with those references.

Successful creation already validates the staged contracts and proves the final bytes, ownership, and committed batch. If the validation inputs and returned records remain unchanged, a separate `validate` call for each result is not required. Run the adapter's `validate --task-directory <returned directory>` after manual edits or imports, when resuming with changed validation inputs, or when a concrete error calls the record's validity into question. Preserve and inspect transaction evidence when creation reports an interrupted or incomplete result.
