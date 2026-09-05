import assert from "node:assert/strict";
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MAX_TASK_BATCH_PAYLOAD_BYTES,
  createTaskArtifactBatch,
  recoverTaskBatchTransaction,
} from "../src/core/task-artifacts.mjs";
import { runTaskArtifactCommand } from "../skills/kyw-task/scripts/task-artifacts.mjs";

function readyTaskMarkdown() {
  return `# TASK {{TASK_ID}} — {{TASK_TITLE}}

<!-- kyw-task-contract: 4 -->

## Status

READY

## Goal

Deliver one independently verifiable batch-authored outcome.

## Dependencies

{{TASK_DEPENDENCIES}}

## In Scope

- Implement the named outcome.

## Out of Scope

- Do not implement another Task.

## Acceptance Criteria

- [ ] AC-01: The named outcome is independently verified.

## Plan

- [ ] Implement and verify the outcome.

## Decisions

- Use the smallest compatible design.

## Risks

- Preserve existing behavior while adding the outcome.

## Discoveries and Changes

- Not applicable — implementation has not started.

## Documentation Impact

- SPEC: Review after implementation.
- ARCHITECTURE: Review after implementation.
- README: Review after implementation.
- AGENTS: Review after implementation.

## Delivery

- Requirement: STANDARD
- Release version: {{TASK_RELEASE_VERSION}}
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Not applicable — implementation has not started.

## Remaining

- Implement and verify the outcome.

## Resume Point

- Begin with the scoped implementation.

## Blockers

- Not applicable — no blocker is known.
`;
}

function readyTestMarkdown() {
  return `# TEST {{TASK_ID}} — {{TASK_TITLE}}

<!-- kyw-task-contract: 4 -->

## Status

READY

## Test Basis

- Task: \`./TASK.md\`
- Product requirements: \`../../SPEC.md\`
- Architecture constraints: \`../../ARCHITECTURE.md\`

## Model Provenance

- Model identifier: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Requested model alias: \`NOT_REQUESTED\` (\`OBSERVED\`: no override was requested)
- Reasoning effort: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Codex surface: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)
- Codex version: \`UNAVAILABLE\` (\`UNAVAILABLE\`: not observed yet)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Independently verified outcome | Run the focused acceptance check. | Integration | TODO | Not run — newly authored pair. |

## Regression Coverage

- Preserve existing behavior around the named outcome.

## Commands

- Planned: focused acceptance and required regressions.

## Results

- Not applicable — verification has not run.

## Unverified

- Not applicable — no residual risk is recorded yet.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [ ] Confirm PASS evidence is reproducible.
- [ ] Confirm required regressions ran.
`;
}

let nextFixtureRelease = 1;

function definition(
  title,
  dependencies = [],
  key,
  releaseVersion = `0.0.${nextFixtureRelease++}`,
) {
  return {
    ...(key === undefined ? {} : { key }),
    title,
    taskMarkdown: readyTaskMarkdown(),
    testMarkdown: readyTestMarkdown(),
    dependencies,
    releaseVersion,
  };
}

async function temporaryTasksRoot(t, name) {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), `kyw-dev-task0056-${name}-`),
  );
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  return path.join(temporaryRoot, "docs", "tasks");
}

async function assertAbsent(target) {
  await assert.rejects(
    lstat(target),
    (error) => error.code === "ENOENT",
  );
}

function observedMutationHooks(observed) {
  return {
    afterPrevalidation() {
      observed.push("prevalidation");
    },
    beforeTaskIdAllocation() {
      observed.push("allocator");
    },
    afterAllocation() {
      observed.push("allocated");
    },
    afterLock() {
      observed.push("lock");
    },
    afterStageDirectoryCreate() {
      observed.push("stage");
    },
    beforePublish() {
      observed.push("publish");
    },
  };
}

test("complete planning derives missing keys, preserves explicit keys, and resolves taskTitle dependencies", async (t) => {
  const tasksRoot = await temporaryTasksRoot(t, "success");
  const observed = [];
  const created = await createTaskArtifactBatch({
    tasksRoot,
    tasks: [
      definition("Foundation outcome"),
      definition("Dependent outcome", [{ taskTitle: "  foundation   outcome " }]),
      definition("Compatibility title", [], "compatibility-explicit-key"),
    ],
    hooks: {
      async afterPrevalidation({ tasks }) {
        observed.push("prevalidation");
        assert.deepEqual(Object.keys(tasks[0]).sort(), [
          "dependencies",
          "key",
          "keySource",
          "releaseVersion",
          "slug",
          "title",
        ]);
        assert.equal(tasks[0].keySource, "DERIVED");
        assert.equal(tasks[2].keySource, "EXPLICIT");
        await assertAbsent(tasksRoot);
      },
      beforeTaskIdAllocation() {
        observed.push("allocator");
      },
      afterAllocation({ tasks }) {
        observed.push("allocated");
        assert.match(tasks[0].id, /^\d{4}$/);
        assert.equal(path.basename(tasks[0].directory), "0001-foundation-outcome");
      },
      afterLock() {
        observed.push("lock");
      },
    },
  });

  assert.deepEqual(observed, [
    "prevalidation",
    "lock",
    "allocator",
    "allocated",
  ]);
  assert.deepEqual(
    created.tasks.map(({ key, dependencies }) => ({ key, dependencies })),
    [
      { key: "foundation-outcome", dependencies: [] },
      { key: "dependent-outcome", dependencies: ["0001"] },
      { key: "compatibility-explicit-key", dependencies: [] },
    ],
  );
});

test("derived duplicates, explicit-derived collisions, and ambiguous taskTitle references fail before all hooks", async (t) => {
  const cases = [
    {
      name: "derived duplicate",
      tasks: [
        definition("Alpha  Beta"),
        definition("alpha---beta"),
      ],
      code: "INVALID_TASK_BATCH",
    },
    {
      name: "explicit-derived collision",
      tasks: [
        definition("Alpha beta"),
        definition("Different title", [], "alpha-beta"),
      ],
      code: "INVALID_TASK_BATCH",
    },
    {
      name: "ambiguous title",
      tasks: [
        definition("Shared title", [], "first-explicit"),
        definition("  Shared   title ", [], "second-explicit"),
        definition("Dependent", [{ taskTitle: "Shared title" }]),
      ],
      code: "INVALID_TASK_BATCH",
    },
  ];

  for (const scenario of cases) {
    const tasksRoot = await temporaryTasksRoot(t, scenario.name.replaceAll(" ", "-"));
    const observed = [];
    await assert.rejects(
      createTaskArtifactBatch({
        tasksRoot,
        tasks: scenario.tasks,
        hooks: observedMutationHooks(observed),
      }),
      (error) => error.code === scenario.code,
      scenario.name,
    );
    assert.deepEqual(observed, [], scenario.name);
    await assertAbsent(tasksRoot);
  }
});

test("invalid pair, graph, and oversized payload reject before allocator and residue", async (t) => {
  const invalidMarker = definition("Invalid marker");
  invalidMarker.taskMarkdown += "\n<!-- kyw-task-contract: 2 -->\n";
  const invalidStatus = definition("Invalid status");
  invalidStatus.testMarkdown = invalidStatus.testMarkdown.replace(
    "\nREADY\n",
    "\nDRAFT\n",
  );
  const missingSection = definition("Missing section");
  missingSection.taskMarkdown = missingSection.taskMarkdown.replace(
    "## Risks\n\n- Preserve existing behavior while adding the outcome.\n\n",
    "",
  );
  const invalidMapping = definition("Invalid mapping");
  invalidMapping.testMarkdown = invalidMapping.testMarkdown.replace(
    "| T-01 | AC-01 — Independently verified outcome |",
    "| T-01 | AC-02 — Unmapped acceptance criterion |",
  );
  const oversized = definition("Oversized payload");
  oversized.taskMarkdown = "x".repeat(MAX_TASK_BATCH_PAYLOAD_BYTES + 1);
  const cases = [
    {
      name: "marker",
      tasks: [invalidMarker],
      code: "INVALID_TASK_BATCH_PAIR",
    },
    {
      name: "status",
      tasks: [invalidStatus],
      code: "INVALID_TASK_BATCH_PAIR",
    },
    {
      name: "required-section",
      tasks: [missingSection],
      code: "INVALID_TASK_BATCH_PAIR",
    },
    {
      name: "ac-t-mapping",
      tasks: [invalidMapping],
      code: "INVALID_TASK_BATCH_PAIR",
    },
    {
      name: "dependency",
      tasks: [definition("Missing dependency", [{ taskKey: "absent" }])],
      code: "MISSING_TASK_DEPENDENCY",
    },
    {
      name: "dependency-cycle",
      tasks: [
        definition("Cycle first", [{ taskTitle: "Cycle second" }]),
        definition("Cycle second", [{ taskTitle: "Cycle first" }]),
      ],
      code: "TASK_DEPENDENCY_CYCLE",
    },
    {
      name: "payload",
      tasks: [oversized],
      code: "TASK_BATCH_PAYLOAD_TOO_LARGE",
    },
  ];

  for (const scenario of cases) {
    const tasksRoot = await temporaryTasksRoot(t, scenario.name);
    const observed = [];
    await assert.rejects(
      createTaskArtifactBatch({
        tasksRoot,
        tasks: scenario.tasks,
        hooks: observedMutationHooks(observed),
      }),
      (error) => error.code === scenario.code,
      scenario.name,
    );
    assert.deepEqual(observed, [], scenario.name);
    await assertAbsent(tasksRoot);
  }
});

test("retained transaction key collision is deterministic and preserves all evidence", async (t) => {
  const tasksRoot = await temporaryTasksRoot(t, "retained");
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot,
      tasks: [definition("Retained collision")],
      hooks: {
        afterLock() {
          throw new Error("interrupt after retained INIT");
        },
        beforeRollback() {
          throw new Error("preserve retained transaction");
        },
      },
    }),
    (error) => error.code === "TASK_BATCH_ROLLBACK_FAILED",
  );

  const beforeEntries = await readdir(tasksRoot);
  assert.deepEqual(beforeEntries, [".kyw-dev-task-create.lock"]);
  const markerPath = path.join(tasksRoot, beforeEntries[0]);
  const beforeMarker = await readFile(markerPath);
  const observed = [];
  await assert.rejects(
    createTaskArtifactBatch({
      tasksRoot,
      tasks: [definition("Retained collision")],
      hooks: observedMutationHooks(observed),
    }),
    (error) =>
      error.code === "TASK_BATCH_KEY_COLLISION" &&
      /retained-collision/.test(error.message),
  );
  assert.deepEqual(observed, []);
  assert.deepEqual(await readdir(tasksRoot), beforeEntries);
  assert.deepEqual(await readFile(markerPath), beforeMarker);

  const recovery = await recoverTaskBatchTransaction({ tasksRoot });
  assert.equal(recovery.action, "rolled-back");
  assert.deepEqual(await readdir(tasksRoot), []);
});

test("adapter rejects an oversized caller-owned file before reading or creating repository state", async (t) => {
  const tasksRoot = await temporaryTasksRoot(t, "adapter-payload");
  const payloadPath = path.join(path.dirname(path.dirname(tasksRoot)), "batch.json");
  const payload = Buffer.alloc(MAX_TASK_BATCH_PAYLOAD_BYTES + 1, 0x78);
  await writeFile(payloadPath, payload);

  await assert.rejects(
    runTaskArtifactCommand([
      "create-batch",
      "--tasks-root",
      tasksRoot,
      "--batch-file",
      payloadPath,
    ]),
    (error) => error.code === "TASK_BATCH_PAYLOAD_TOO_LARGE",
  );
  assert.deepEqual(await readFile(payloadPath), payload);
  await assertAbsent(tasksRoot);
});
