import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  CURRENT_TASK_CONTRACT_VERSION,
  SINGLE_TASK_CONTRACT_VERSION,
  parseTaskMetadata,
  getTaskContractVersion,
  isStableReleaseVersion,
  readCanonicalTemplate,
  renderTemplate,
  validateTaskTestContract,
} from "./template-contracts.mjs";
import {
  MAX_TASK_NUMBER,
  MAX_TASK_SLUG_LENGTH,
  buildTaskDirectoryName,
  deriveTaskKey,
  firstSectionLine,
  formatTaskId,
  inspectTaskDirectories,
  markdownSection,
  normalizeTaskTitle,
  parseDeliveryRequirement,
  parseHardDependencies,
  resolveTaskDirectory,
  slugPattern,
  slugifyTaskTitle,
  stripMarkdownComments,
  validateTaskDirectory,
} from "./task-artifact-contract.mjs";
import {
  dependencyGraphErrors,
  inspectTaskQueueContents,
} from "./task-artifact-queue.mjs";
import {
  TaskArtifactError,
  batchReleaseMarkerName,
  batchReleaseMarkerPrefix,
  batchStagePrefix,
  batchTransactionHashPattern,
  batchTransactionKind,
  batchTransactionSchemaVersion,
  batchTransactionTokenPattern,
  bigintPathState,
  boundedOwnerMetadata,
  creationLockName,
  filesystemIdentity,
  isBatchReleaseMarkerName,
  listBatchTransactionArtifacts,
  maxBatchDiagnosticObservations,
  maxBatchJournalBytes,
  maxBatchPayloadBytes,
  pathState,
  proofMatchesExpected,
  readRegularFileProof,
  sameFilesystemIdentity,
  sha256,
  taskLayoutError,
  validFilesystemIdentity,
} from "./task-artifact-shared.mjs";

const batchKeyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const batchIdToken = "{{TASK_ID}}";
const batchTitleToken = "{{TASK_TITLE}}";
const batchDependenciesToken = "{{TASK_DEPENDENCIES}}";
const batchReleaseVersionToken = "{{TASK_RELEASE_VERSION}}";

async function ensureTasksRoot(tasksRoot) {
  try {
    await mkdir(tasksRoot, { recursive: true });
  } catch (error) {
    throw new TaskArtifactError("TASK_ROOT_CREATE_FAILED", `Cannot create tasks root ${tasksRoot}: ${error.message}`, {
      cause: error,
    });
  }
  const state = await lstat(tasksRoot);
  if (state.isSymbolicLink()) {
    throw new TaskArtifactError("SYMLINK_TASK_ROOT", `Refusing to create Task artifacts through symlink ${tasksRoot}`);
  }
  if (!state.isDirectory()) {
    throw new TaskArtifactError("INVALID_TASK_ROOT", `Tasks root is not a directory: ${tasksRoot}`);
  }
  return realpath(tasksRoot);
}

function invalidBatch(message, code = "INVALID_TASK_BATCH") {
  return new TaskArtifactError(code, message);
}

function assertBoundedBatchPayload(tasks) {
  let serialized;
  try {
    serialized = JSON.stringify({ tasks });
  } catch (error) {
    throw invalidBatch(`Task batch payload must be JSON-serializable: ${error.message}`);
  }
  if (
    typeof serialized !== "string" ||
    Buffer.byteLength(serialized, "utf8") > maxBatchPayloadBytes
  ) {
    throw invalidBatch(
      `Task batch payload must not exceed ${maxBatchPayloadBytes} UTF-8 bytes`,
      "TASK_BATCH_PAYLOAD_TOO_LARGE",
    );
  }
}

function normalizeBatchTaskDefinitions(tasks) {
  assertBoundedBatchPayload(tasks);
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw invalidBatch("Task batch must contain at least one task definition");
  }
  if (tasks.length > MAX_TASK_NUMBER) {
    throw invalidBatch(`Task batch cannot contain more than ${MAX_TASK_NUMBER} definitions`);
  }

  const normalized = tasks.map((definition, index) => {
      const label = `Task batch definition ${index + 1}`;
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
        throw invalidBatch(`${label} must be an object`);
      }
      const allowedKeys = new Set([
        "key",
        "title",
        "taskMarkdown",
        "testMarkdown",
        "dependencies",
        "releaseVersion",
      ]);
      const unknownKeys = Object.keys(definition).filter((key) => !allowedKeys.has(key));
      if (unknownKeys.length > 0) {
        throw invalidBatch(`${label} contains unknown fields: ${unknownKeys.sort().join(", ")}`);
      }

      let title;
      try {
        title = normalizeTaskTitle(definition.title);
      } catch (error) {
        throw invalidBatch(`${label} title is invalid: ${error.message}`);
      }
      const explicitKey = Object.hasOwn(definition, "key");
      const key = explicitKey ? definition.key : deriveTaskKey(title);
      if (
        typeof key !== "string" ||
        !batchKeyPattern.test(key) ||
        key.length > MAX_TASK_SLUG_LENGTH
      ) {
        throw invalidBatch(
          explicitKey
            ? `${label} key must be lowercase ASCII kebab-case beginning with a letter and contain at most ${MAX_TASK_SLUG_LENGTH} characters`
            : `${label} title did not produce a usable internal Task key`,
        );
      }
      const taskMarkdown = definition.taskMarkdown;
      const testMarkdown = definition.testMarkdown;
      const single = getTaskContractVersion(taskMarkdown) === SINGLE_TASK_CONTRACT_VERSION;
      if (typeof taskMarkdown !== "string" || !taskMarkdown.trim()) {
        throw invalidBatch(`${label} taskMarkdown must be a non-empty string`);
      }
      if ((!single || testMarkdown !== undefined) && (typeof testMarkdown !== "string" || !testMarkdown.trim())) {
        throw invalidBatch(`${label} testMarkdown must be a non-empty string`);
      }
      if (taskMarkdown.includes("\0") || (testMarkdown ?? "").includes("\0")) {
        throw invalidBatch(`${label} Markdown must not contain NUL bytes`);
      }
      for (const token of [batchIdToken, batchTitleToken, ...(single ? [] : [batchDependenciesToken])]) {
        if (!taskMarkdown.includes(token)) {
          throw invalidBatch(`${label} taskMarkdown must contain ${token}`);
        }
      }
      const dependencySection = stripMarkdownComments(
        markdownSection(taskMarkdown, "Dependencies"),
      ).trim();
      if (
        !single && (taskMarkdown.split(batchDependenciesToken).length !== 2 ||
        dependencySection !== batchDependenciesToken)
      ) {
        throw invalidBatch(
          `${label} taskMarkdown must place exactly one ${batchDependenciesToken} as the complete Dependencies section`,
        );
      }
      for (const token of testMarkdown === undefined ? [] : [batchIdToken, batchTitleToken]) {
        if (!(testMarkdown ?? "").includes(token)) {
          throw invalidBatch(`${label} testMarkdown must contain ${token}`);
        }
      }
      if ((testMarkdown ?? "").includes(batchDependenciesToken)) {
        throw invalidBatch(`${label} testMarkdown must not contain ${batchDependenciesToken}`);
      }

      const hasReleaseVersion = Object.hasOwn(definition, "releaseVersion");
      const releaseVersion = definition.releaseVersion;
      if (hasReleaseVersion && !isStableReleaseVersion(releaseVersion)) {
        throw invalidBatch(
          `${label} releaseVersion must be an exact stable SemVer x.y.z without prerelease, build metadata, or leading zeros`,
        );
      }
      const releaseVersionTokenCount =
        taskMarkdown.split(batchReleaseVersionToken).length - 1;
      const deliveryReleaseVersionTokenCount = stripMarkdownComments(
        markdownSection(taskMarkdown, "Delivery"),
      )
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(
          (line) =>
            line === `- Release version: ${batchReleaseVersionToken}`,
        ).length;
      if (
        hasReleaseVersion &&
        (releaseVersionTokenCount !== 1 ||
          deliveryReleaseVersionTokenCount !== 1)
      ) {
        throw invalidBatch(
          `${label} taskMarkdown must place exactly one ${batchReleaseVersionToken} as the canonical Delivery Release version`,
        );
      }
      if (!hasReleaseVersion && releaseVersionTokenCount > 0) {
        throw invalidBatch(
          `${label} must provide releaseVersion for ${batchReleaseVersionToken}`,
        );
      }
      if ((testMarkdown ?? "").includes(batchReleaseVersionToken)) {
        throw invalidBatch(
          `${label} testMarkdown must not contain ${batchReleaseVersionToken}`,
        );
      }

      const dependencies = definition.dependencies ?? [];
      if (!Array.isArray(dependencies)) {
        throw invalidBatch(`${label} dependencies must be an array`);
      }
      return {
        key,
        keySource: explicitKey ? "EXPLICIT" : "DERIVED",
        title,
        taskMarkdown,
        testMarkdown,
        rawDependencies: dependencies,
        ...(hasReleaseVersion ? { releaseVersion } : {}),
        label,
      };
    });

  const keys = new Set();
  for (const definition of normalized) {
    if (keys.has(definition.key)) {
      throw invalidBatch(`Task batch key is duplicated: ${definition.key}`);
    }
    keys.add(definition.key);
  }
  const byTitle = new Map();
  for (const definition of normalized) {
    const titleKey = deriveTaskKey(definition.title);
    const matches = byTitle.get(titleKey) ?? [];
    matches.push(definition);
    byTitle.set(titleKey, matches);
  }

  return Object.freeze(
    normalized.map((definition) => {
      const normalizedDependencies = definition.rawDependencies.map((dependency, dependencyIndex) => {
        const label = definition.label;
        const dependencyLabel = `${label} dependency ${dependencyIndex + 1}`;
        if (!dependency || typeof dependency !== "object" || Array.isArray(dependency)) {
          throw invalidBatch(`${dependencyLabel} must be an object`);
        }
        const dependencyKeys = Object.keys(dependency);
        const hasTaskTitle = Object.hasOwn(dependency, "taskTitle");
        const hasTaskKey = Object.hasOwn(dependency, "taskKey");
        const hasTaskId = Object.hasOwn(dependency, "taskId");
        if (
          dependencyKeys.length !== 1 ||
          Number(hasTaskTitle) + Number(hasTaskKey) + Number(hasTaskId) !== 1
        ) {
          throw invalidBatch(
            `${dependencyLabel} must contain exactly one of taskTitle, taskKey, or taskId`,
          );
        }
        if (hasTaskTitle) {
          let dependencyTitle;
          try {
            dependencyTitle = normalizeTaskTitle(dependency.taskTitle);
          } catch (error) {
            throw invalidBatch(`${dependencyLabel} taskTitle is invalid: ${error.message}`);
          }
          const matches = byTitle.get(deriveTaskKey(dependencyTitle)) ?? [];
          if (matches.length === 0) {
            throw invalidBatch(
              `${dependencyLabel} references missing batch title ${dependencyTitle}`,
              "MISSING_TASK_DEPENDENCY",
            );
          }
          if (matches.length > 1) {
            throw invalidBatch(
              `${dependencyLabel} taskTitle is ambiguous within the batch: ${dependencyTitle}`,
            );
          }
          return Object.freeze({ kind: "BATCH", value: matches[0].key });
        }
        if (hasTaskKey) {
          if (
            typeof dependency.taskKey !== "string" ||
            !batchKeyPattern.test(dependency.taskKey) ||
            dependency.taskKey.length > MAX_TASK_SLUG_LENGTH
          ) {
            throw invalidBatch(`${dependencyLabel} taskKey is invalid`);
          }
          return Object.freeze({ kind: "BATCH", value: dependency.taskKey });
        }
        if (typeof dependency.taskId !== "string" || !/^\d{4}$/.test(dependency.taskId)) {
          throw invalidBatch(`${dependencyLabel} taskId must be a four-digit string`);
        }
        return Object.freeze({ kind: "EXISTING", value: formatTaskId(dependency.taskId) });
      });

      return Object.freeze({
        key: definition.key,
        keySource: definition.keySource,
        title: definition.title,
        taskMarkdown: definition.taskMarkdown,
        testMarkdown: definition.testMarkdown,
        dependencies: Object.freeze(normalizedDependencies),
        ...(definition.releaseVersion
          ? { releaseVersion: definition.releaseVersion }
          : {}),
      });
    }),
  );
}

function prevalidateBatchPlan(tasksRoot, inventory, definitions, existingTasks) {
  if (inventory.malformed.length > 0 || inventory.conflicts.length > 0) {
    throw taskLayoutError(inventory);
  }
  if (inventory.maxId + definitions.length > MAX_TASK_NUMBER) {
    throw new TaskArtifactError(
      "TASK_ID_EXHAUSTED",
      `Cannot allocate ${definitions.length} Tasks after ${formatTaskId(inventory.maxId)}; four-digit Task IDs are exhausted`,
    );
  }

  const occupiedIds = new Set(inventory.entries.map((entry) => entry.id));
  const validationIds = [];
  for (let number = 1; number <= MAX_TASK_NUMBER && validationIds.length < definitions.length; number += 1) {
    const id = formatTaskId(number);
    if (!occupiedIds.has(id)) {
      validationIds.push(id);
    }
  }
  if (validationIds.length !== definitions.length) {
    throw new TaskArtifactError(
      "TASK_ID_EXHAUSTED",
      "The Task queue has no validation-only identities available for the complete batch plan",
    );
  }

  const validationRoot = path.resolve(tasksRoot);
  const validationTasks = Object.freeze(
    definitions.map((definition, index) => {
      const id = validationIds[index];
      const slug = slugifyTaskTitle(definition.title);
      const directory = resolveTaskDirectory(validationRoot, id, slug);
      return Object.freeze({
        ...definition,
        id,
        number: Number(id),
        slug,
        directory,
        taskPath: path.join(directory, "TASK.md"),
        testPath: path.join(directory, "TEST.md"),
      });
    }),
  );
  const rendered = renderBatchTasks(validationTasks, existingTasks);
  return Object.freeze(
    rendered.map((task) =>
      Object.freeze({
        key: task.key,
        keySource: task.keySource,
        title: task.title,
        slug: task.slug,
        dependencies: task.dependencies,
        ...(task.releaseVersion
          ? { releaseVersion: task.releaseVersion }
          : {}),
      }),
    ),
  );
}

function projectBatchTasks(resolvedRoot, inventory, definitions) {
  if (inventory.malformed.length > 0 || inventory.conflicts.length > 0) {
    throw taskLayoutError(inventory);
  }
  if (inventory.maxId + definitions.length > MAX_TASK_NUMBER) {
    throw new TaskArtifactError(
      "TASK_ID_EXHAUSTED",
      `Cannot allocate ${definitions.length} Tasks after ${formatTaskId(inventory.maxId)}; four-digit Task IDs are exhausted`,
    );
  }

  return Object.freeze(
    definitions.map((definition, index) => {
      const id = formatTaskId(inventory.maxId + index + 1);
      const slug = slugifyTaskTitle(definition.title);
      const directory = resolveTaskDirectory(resolvedRoot, id, slug);
      return Object.freeze({
        ...definition,
        id,
        number: Number(id),
        slug,
        directory,
        taskPath: path.join(directory, "TASK.md"),
        testPath: path.join(directory, "TEST.md"),
      });
    }),
  );
}

function sameOrderedValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function renderBatchTasks(preallocated, existingTasks) {
  const byKey = new Map(preallocated.map((task) => [task.key, task]));
  const existingById = new Map(existingTasks.map((task) => [task.id, task]));
  const allocatedIds = new Set(preallocated.map((task) => task.id));

  const prepared = preallocated.map((task) => {
    const resolvedDependencies = [];
    for (const dependency of task.dependencies) {
      let dependencyId;
      if (dependency.kind === "BATCH") {
        const target = byKey.get(dependency.value);
        if (!target) {
          throw invalidBatch(
            `Task batch key ${task.key} references missing batch dependency ${dependency.value}`,
            "MISSING_TASK_DEPENDENCY",
          );
        }
        dependencyId = target.id;
      } else {
        dependencyId = dependency.value;
        if (allocatedIds.has(dependencyId)) {
          throw invalidBatch(
            `Task batch key ${task.key} must reference new Task ${dependencyId} by taskTitle (taskKey is low-level compatibility only)`,
          );
        }
        if (!existingById.has(dependencyId)) {
          throw invalidBatch(
            `Task batch key ${task.key} references missing hard dependency Task ${dependencyId}`,
            "MISSING_TASK_DEPENDENCY",
          );
        }
      }
      if (resolvedDependencies.includes(dependencyId)) {
        throw invalidBatch(
          `Task batch key ${task.key} repeats dependency Task ${dependencyId}`,
        );
      }
      resolvedDependencies.push(dependencyId);
    }

    const dependencyMarkdown =
      resolvedDependencies.length === 0
        ? "- Not applicable — no hard dependency is required for this outcome."
        : resolvedDependencies.map((dependencyId) => `- Task ${dependencyId}.`).join("\n");
    let taskMarkdown;
    let testMarkdown;
    try {
      const values = {
        TASK_ID: task.id,
        TASK_TITLE: task.title,
        TASK_DEPENDENCIES: dependencyMarkdown,
        ...(task.releaseVersion
          ? { TASK_RELEASE_VERSION: task.releaseVersion }
          : {}),
      };
      taskMarkdown = renderTemplate(task.taskMarkdown, values);
      if (getTaskContractVersion(taskMarkdown) === SINGLE_TASK_CONTRACT_VERSION) {
        const metadata = parseTaskMetadata(taskMarkdown);
        if (metadata.dependencies.length > 0 && !sameOrderedValues(metadata.dependencies, resolvedDependencies)) {
          throw invalidBatch(`Task batch key ${task.key} metadata dependencies conflict with its declared dependency references`);
        }
        taskMarkdown = taskMarkdown.replace(/<!--\s*kyw-task:\s*[\s\S]*?-->/g,
          `<!-- kyw-task: ${JSON.stringify({ ...metadata, dependencies: resolvedDependencies })} -->`);
      }
      testMarkdown = task.testMarkdown === undefined ? undefined : renderTemplate(task.testMarkdown, values);
    } catch (error) {
      throw invalidBatch(
        `Task batch key ${task.key} could not render complete Markdown: ${error.message}`,
      );
    }

    const contractErrors = validateTaskTestContract({ taskMarkdown, testMarkdown });
    if (contractErrors.length > 0) {
      throw invalidBatch(
        `Task batch key ${task.key} failed canonical validation:\n- ${contractErrors.join("\n- ")}`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }
    const contractVersion = getTaskContractVersion(taskMarkdown);
    if (![2, 3, 4, CURRENT_TASK_CONTRACT_VERSION].includes(contractVersion)) {
      throw invalidBatch(
        `Task batch key ${task.key} must use current Task contract ${CURRENT_TASK_CONTRACT_VERSION}`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }
    if (
      contractVersion !== SINGLE_TASK_CONTRACT_VERSION && (firstSectionLine(taskMarkdown, "Status") !== "READY" ||
      firstSectionLine(testMarkdown, "Status") !== "READY")
    ) {
      throw invalidBatch(
        `Task batch key ${task.key} must render a READY/READY pair`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }
    const taskHeader = /^# TASK (\d{4}) — (.+)$/m.exec(taskMarkdown);
    const testHeader = /^# TEST (\d{4}) — (.+)$/m.exec(testMarkdown);
    if (
      taskHeader?.[1] !== task.id ||
      taskHeader?.[2]?.trim() !== task.title ||
      (contractVersion !== SINGLE_TASK_CONTRACT_VERSION && (testHeader?.[1] !== task.id || testHeader?.[2]?.trim() !== task.title))
    ) {
      throw invalidBatch(
        `Task batch key ${task.key} headers must match allocated Task ${task.id} and title`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }
    const parsedDependencies = parseHardDependencies(
      taskMarkdown,
      contractVersion,
    );
    if (
      parsedDependencies.errors.length > 0 ||
      !sameOrderedValues(parsedDependencies.dependencies, resolvedDependencies)
    ) {
      throw invalidBatch(
        `Task batch key ${task.key} Dependencies must match its declared dependency references`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }
    const deliveryRequirement = parseDeliveryRequirement(
      taskMarkdown,
      contractVersion,
    );
    if (contractVersion === 4 && deliveryRequirement.kind === "STANDARD") {
      if (!task.releaseVersion) {
        throw invalidBatch(
          `Task batch key ${task.key} STANDARD delivery requires a settled releaseVersion definition`,
          "INVALID_TASK_BATCH_PAIR",
        );
      }
      if (deliveryRequirement.releaseVersion !== task.releaseVersion) {
        throw invalidBatch(
          `Task batch key ${task.key} releaseVersion must match its canonical Delivery Release version`,
          "INVALID_TASK_BATCH_PAIR",
        );
      }
    } else if (task.releaseVersion) {
      throw invalidBatch(
        `Task batch key ${task.key} ${deliveryRequirement.kind} delivery must not define releaseVersion`,
        "INVALID_TASK_BATCH_PAIR",
      );
    }

    return Object.freeze({
      ...task,
      taskMarkdown,
      testMarkdown,
      resolvedDependencies: Object.freeze(resolvedDependencies),
      deliveryRequirement,
    });
  });

  const combinedTasks = [
    ...existingTasks,
    ...prepared.map((task) =>
      Object.freeze({
        id: task.id,
        number: task.number,
        name: path.basename(task.directory),
        directory: task.directory,
        taskPath: task.taskPath,
        testPath: task.testPath,
        title: task.title,
        taskStatus: firstSectionLine(task.taskMarkdown, "Status"),
        testStatus: "READY",
        contractVersion: CURRENT_TASK_CONTRACT_VERSION,
        dependencies: task.resolvedDependencies,
        deliveryRequirement: task.deliveryRequirement,
        blocker: "Not applicable — no blocker is known.",
      }),
    ),
  ];
  const graphErrors = dependencyGraphErrors(
    combinedTasks,
    new Map(combinedTasks.map((task) => [task.id, task])),
  );
  if (graphErrors.length > 0) {
    let code = "MISSING_TASK_DEPENDENCY";
    if (graphErrors.some((error) => error.startsWith("Release version "))) {
      code = "TASK_RELEASE_VERSION_CONFLICT";
    }
    if (graphErrors.some((error) => error.startsWith("Hard dependency cycle:"))) {
      code = "TASK_DEPENDENCY_CYCLE";
    }
    throw invalidBatch(
      `Task batch dependency graph is invalid:\n- ${graphErrors.join("\n- ")}`,
      code,
    );
  }
  return Object.freeze(prepared);
}

function expectedBatchTasks(prepared) {
  return Object.freeze(
    prepared.map((task) =>
      Object.freeze({
        key: task.key,
        id: task.id,
        slug: task.slug,
        directoryName: path.basename(task.directory),
        dependencies: task.resolvedDependencies,
        files: Object.freeze(
          [
            ["TASK.md", task.taskMarkdown],
            ["TEST.md", task.testMarkdown],
          ].filter(([, content]) => content !== undefined).map(([name, content]) =>
            Object.freeze({
              name,
              bytes: Buffer.byteLength(content, "utf8"),
              sha256: sha256(content),
            }),
          ),
        ),
      }),
    ),
  );
}

function preparedBatchFingerprint(expectedTasks) {
  return sha256(JSON.stringify(expectedTasks));
}

async function captureTaskQueueSnapshot(tasksRoot, dependencyIds = []) {
  const queue = await inspectTaskQueueContents(tasksRoot, { selectedTaskIds: dependencyIds });
  if (queue.errors.length > 0) {
    throw invalidBatch(
      `Cannot create a Task batch until the queue is reconciled:\n- ${queue.errors.join("\n- ")}`,
      "INVALID_TASK_QUEUE",
    );
  }
  const inventory = await inspectTaskDirectories(tasksRoot);
  if (inventory.malformed.length > 0 || inventory.conflicts.length > 0) {
    throw taskLayoutError(inventory);
  }
  const entries = [];
  for (const entry of inventory.entries.filter((entry) => queue.tasks.some((task) => task.id === entry.id))) {
    const directory = resolveTaskDirectory(tasksRoot, entry.id, entry.slug);
    const directoryState = await bigintPathState(directory);
    if (!directoryState || directoryState.isSymbolicLink() || !directoryState.isDirectory()) {
      throw new TaskArtifactError(
        "INVALID_TASK_QUEUE",
        `Task directory identity is not a real directory: ${entry.name}`,
      );
    }
    const [taskProof, testProof] = await Promise.all([
      readRegularFileProof(path.join(directory, "TASK.md")),
      pathState(path.join(directory, "TEST.md")).then((state) => state ? readRegularFileProof(path.join(directory, "TEST.md")) : undefined),
    ]);
    entries.push({
      name: entry.name,
      directoryIdentity: filesystemIdentity(directoryState),
      task: {
        identity: taskProof.identity,
        bytes: taskProof.bytes,
        sha256: taskProof.sha256,
      },
      test: testProof ? {
        identity: testProof.identity,
        bytes: testProof.bytes,
        sha256: testProof.sha256,
      } : null,
    });
  }
  const semanticQueue = queue.tasks.map((task) => ({
    id: task.id,
    name: task.name,
    title: task.title,
    taskStatus: task.taskStatus,
    testStatus: task.testStatus,
    contractVersion: task.contractVersion,
    dependencies: task.dependencies,
    deliveryRequirement: task.deliveryRequirement,
    blocker: task.blocker,
  }));
  return Object.freeze({
    queue,
    inventory,
    fingerprint: sha256(JSON.stringify({ names: inventory.entries.map((entry) => entry.name), entries, semanticQueue })),
  });
}

async function rejectRetainedBatchTransaction(tasksRoot, definitions) {
  const transactionArtifacts = await listBatchTransactionArtifacts(tasksRoot);
  if (transactionArtifacts.length === 0) {
    return;
  }

  let loaded;
  try {
    loaded = await loadBatchTransaction(tasksRoot);
  } catch {
    throw new TaskArtifactError(
      "TASK_CREATION_LOCKED",
      "Another Task creation or unrecovered batch transaction exists",
    );
  }
  const retainedKeys = new Set(
    loaded.parsed.state.initial.tasks.map((task) => task.key),
  );
  const collisions = definitions
    .map((definition) => definition.key)
    .filter((key) => retainedKeys.has(key));
  if (collisions.length > 0) {
    throw invalidBatch(
      `Task batch key collides with retained transaction evidence: ${[...new Set(collisions)].sort().join(", ")}`,
      "TASK_BATCH_KEY_COLLISION",
    );
  }
  throw new TaskArtifactError(
    "TASK_CREATION_LOCKED",
    "Another Task creation or unrecovered batch transaction exists",
  );
}

async function assertBatchRootIdentity(tasksRoot, expectedIdentity) {
  const state = await bigintPathState(tasksRoot);
  if (
    !state ||
    state.isSymbolicLink() ||
    !state.isDirectory() ||
    !sameFilesystemIdentity(filesystemIdentity(state), expectedIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "The Task root identity changed during batch creation",
    );
  }
}

async function assertPreparedBatchStillCurrent(prepared, expectedTasks, expectedFingerprint) {
  const currentExpected = expectedBatchTasks(prepared);
  if (
    preparedBatchFingerprint(currentExpected) !== expectedFingerprint ||
    JSON.stringify(currentExpected) !== JSON.stringify(expectedTasks)
  ) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "Prepared Task pair content changed during batch creation",
    );
  }
}

async function assertBatchTargetsAbsent(tasksRoot, expectedTasks) {
  for (const task of expectedTasks) {
    const target = path.join(tasksRoot, task.directoryName);
    if (await bigintPathState(target)) {
      throw new TaskArtifactError(
        "TASK_CREATION_CONFLICT",
        `Task ${task.id} was claimed before the batch could be published`,
      );
    }
  }
}

async function revalidateBatchSnapshot({
  tasksRoot,
  rootIdentity,
  queueFingerprint,
  prepared,
  expectedTasks,
  preparedFingerprint,
}) {
  await assertBatchRootIdentity(tasksRoot, rootIdentity);
  let current;
  try {
    const allocatedIds = new Set(prepared.map((task) => task.id));
    current = await captureTaskQueueSnapshot(tasksRoot, prepared.flatMap((task) => task.resolvedDependencies).filter((id) => !allocatedIds.has(id)));
  } catch (error) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "The Task queue became invalid during batch creation",
      { cause: error },
    );
  }
  if (current.fingerprint !== queueFingerprint) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "The Task queue or a dependency source changed during batch creation",
    );
  }
  await assertPreparedBatchStillCurrent(prepared, expectedTasks, preparedFingerprint);
  await assertBatchTargetsAbsent(tasksRoot, expectedTasks);
}

function journalRecordBody({ sequence, token, event, previousHash, data }) {
  return {
    schemaVersion: batchTransactionSchemaVersion,
    kind: batchTransactionKind,
    sequence,
    token,
    event,
    previousHash,
    data,
  };
}

function createJournalRecord(record) {
  const body = journalRecordBody(record);
  return Object.freeze({ ...body, hash: sha256(JSON.stringify(body)) });
}

function exactObjectKeys(value, expected) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...expected].sort().join(",")
  );
}

function validExpectedBatchFile(file) {
  return (
    exactObjectKeys(file, ["name", "bytes", "sha256"]) &&
    ["TASK.md", "TEST.md"].includes(file.name) &&
    Number.isSafeInteger(file.bytes) &&
    file.bytes >= 0 &&
    batchTransactionHashPattern.test(file.sha256)
  );
}

function validateInitialJournalData(data, token) {
  if (
    !exactObjectKeys(data, [
      "owner",
      "lockIdentity",
      "rootIdentity",
      "queueFingerprint",
      "preparedFingerprint",
      "stageName",
      "tasks",
    ]) ||
    !validFilesystemIdentity(data.lockIdentity) ||
    !validFilesystemIdentity(data.rootIdentity) ||
    !batchTransactionHashPattern.test(data.queueFingerprint) ||
    !batchTransactionHashPattern.test(data.preparedFingerprint) ||
    !Array.isArray(data.tasks) ||
    data.tasks.length === 0 ||
    !exactObjectKeys(data.owner, ["processId", "host", "createdAt"]) ||
    !Number.isSafeInteger(data.owner.processId) ||
    data.owner.processId < 0 ||
    typeof data.owner.host !== "string" ||
    data.owner.host.length < 1 ||
    data.owner.host.length > 64 ||
    /[\u0000-\u001f\u007f/\\]/.test(data.owner.host) ||
    typeof data.owner.createdAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.owner.createdAt)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest INIT record is invalid",
    );
  }
  const firstId = data.tasks[0]?.id;
  const lastId = data.tasks.at(-1)?.id;
  if (data.stageName !== `${batchStagePrefix}${firstId}-${lastId}-${token}.tmp`) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction staging path does not match its identity",
    );
  }
  const ids = new Set();
  const keys = new Set();
  for (const [index, task] of data.tasks.entries()) {
    if (
      !exactObjectKeys(task, [
        "key",
        "id",
        "slug",
        "directoryName",
        "dependencies",
        "files",
      ]) ||
      typeof task.key !== "string" ||
      !batchKeyPattern.test(task.key) ||
      keys.has(task.key) ||
      typeof task.id !== "string" ||
      !/^\d{4}$/.test(task.id) ||
      task.id === "0000" ||
      ids.has(task.id) ||
      typeof task.slug !== "string" ||
      !slugPattern.test(task.slug) ||
      task.directoryName !== buildTaskDirectoryName(task.id, task.slug) ||
      !Array.isArray(task.dependencies) ||
      task.dependencies.some(
        (dependency) => typeof dependency !== "string" || !/^\d{4}$/.test(dependency),
      ) ||
      !Array.isArray(task.files) ||
      ![1, 2].includes(task.files.length) ||
      task.files.some((file) => !validExpectedBatchFile(file)) ||
      !["TASK.md", "TASK.md,TEST.md"].includes(task.files.map((file) => file.name).sort().join(","))
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        `The batch transaction manifest Task entry ${index + 1} is invalid`,
      );
    }
    if (
      index > 0 &&
      Number(task.id) !== Number(data.tasks[index - 1].id) + 1
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        "The batch transaction manifest Task IDs are not contiguous",
      );
    }
    ids.add(task.id);
    keys.add(task.key);
  }
}

function validOwnershipFiles(files) {
  return (
    Array.isArray(files) &&
    [1, 2].includes(files.length) &&
    files.every(
      (file) =>
        exactObjectKeys(file, ["name", "identity"]) &&
        ["TASK.md", "TEST.md"].includes(file.name) &&
        validFilesystemIdentity(file.identity),
    ) &&
    ["TASK.md", "TASK.md,TEST.md"].includes(files.map((file) => file.name).sort().join(","))
  );
}

const batchTransactionPhases = new Set([
  "LOCKED",
  "POST_LOCK_VALIDATED",
  "STAGED",
  "PUBLISHING",
  "ROLLING_BACK",
  "ROLLED_BACK",
  "COMMITTED",
]);

function reduceBatchJournal(records) {
  const initial = records[0];
  validateInitialJournalData(initial.data, initial.token);
  const expectedById = new Map(initial.data.tasks.map((task) => [task.id, task]));
  const ownership = new Map();
  const finalOwnership = new Map();
  const published = new Set();
  let phase = "LOCKED";
  let stageIdentity;

  for (const record of records.slice(1)) {
    if (record.event === "STAGE_CREATED") {
      if (
        !exactObjectKeys(record.data, ["identity"]) ||
        !validFilesystemIdentity(record.data.identity) ||
        stageIdentity
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction STAGE_CREATED record is invalid",
        );
      }
      stageIdentity = record.data.identity;
      continue;
    }
    if (record.event === "TASK_STAGED") {
      if (
        !exactObjectKeys(record.data, [
          "id",
          "directoryIdentity",
          "files",
        ]) ||
        !expectedById.has(record.data.id) ||
        !validFilesystemIdentity(record.data.directoryIdentity) ||
        !validOwnershipFiles(record.data.files) ||
        ownership.has(record.data.id)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction TASK_STAGED record is invalid",
        );
      }
      ownership.set(
        record.data.id,
        Object.freeze({
          directoryIdentity: record.data.directoryIdentity,
          files: Object.freeze(record.data.files),
        }),
      );
      continue;
    }
    if (record.event === "FINAL_DIRECTORY_CREATED") {
      if (
        !exactObjectKeys(record.data, ["id", "directoryIdentity"]) ||
        !expectedById.has(record.data.id) ||
        !validFilesystemIdentity(record.data.directoryIdentity) ||
        finalOwnership.has(record.data.id)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction FINAL_DIRECTORY_CREATED record is invalid",
        );
      }
      finalOwnership.set(record.data.id, {
        directoryIdentity: record.data.directoryIdentity,
        files: [],
      });
      continue;
    }
    if (record.event === "FINAL_FILE_CREATED") {
      const final = finalOwnership.get(record.data?.id);
      if (
        !exactObjectKeys(record.data, ["id", "name", "identity"]) ||
        !final ||
        !["TASK.md", "TEST.md"].includes(record.data.name) ||
        !validFilesystemIdentity(record.data.identity) ||
        final.files.some((file) => file.name === record.data.name)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction FINAL_FILE_CREATED record is invalid",
        );
      }
      final.files.push(
        Object.freeze({
          name: record.data.name,
          identity: record.data.identity,
        }),
      );
      continue;
    }
    if (record.event === "TASK_PUBLISHED") {
      const final = finalOwnership.get(record.data?.id);
      if (
        !exactObjectKeys(record.data, ["id"]) ||
        !expectedById.has(record.data.id) ||
        !final ||
        !validOwnershipFiles(final.files) ||
        published.has(record.data.id)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction TASK_PUBLISHED record is invalid",
        );
      }
      published.add(record.data.id);
      continue;
    }
    if (record.event === "PHASE") {
      if (
        !exactObjectKeys(record.data, ["phase"]) ||
        !batchTransactionPhases.has(record.data.phase)
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_MANIFEST_INVALID",
          "The batch transaction PHASE record is invalid",
        );
      }
      phase = record.data.phase;
      continue;
    }
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      `Unsupported batch transaction event ${record.event}`,
    );
  }
  return Object.freeze({
    initial: initial.data,
    token: initial.token,
    phase,
    stageIdentity,
    ownership,
    finalOwnership,
    published,
    lastHash: records.at(-1).hash,
    sequence: records.at(-1).sequence,
  });
}

function parseBatchJournal(content) {
  if (!Buffer.isBuffer(content) || content.byteLength > maxBatchJournalBytes) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest exceeds its bounded size",
    );
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch (error) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest is not valid UTF-8",
      { cause: error },
    );
  }
  if (!text || !text.endsWith("\n")) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest has an incomplete final record",
    );
  }
  const lines = text.slice(0, -1).split("\n");
  const records = [];
  let token;
  let previousHash = null;
  for (const [index, line] of lines.entries()) {
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        `The batch transaction manifest record ${index} is invalid JSON`,
        { cause: error },
      );
    }
    if (
      !exactObjectKeys(record, [
        "schemaVersion",
        "kind",
        "sequence",
        "token",
        "event",
        "previousHash",
        "data",
        "hash",
      ]) ||
      record.schemaVersion !== batchTransactionSchemaVersion ||
      record.kind !== batchTransactionKind ||
      record.sequence !== index ||
      typeof record.event !== "string" ||
      !record.event ||
      !batchTransactionTokenPattern.test(record.token) ||
      !batchTransactionHashPattern.test(record.hash) ||
      record.previousHash !== previousHash ||
      (token && record.token !== token)
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        `The batch transaction manifest record ${index} has invalid identity fields`,
      );
    }
    const body = journalRecordBody(record);
    if (sha256(JSON.stringify(body)) !== record.hash) {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        `The batch transaction manifest record ${index} failed its hash chain`,
      );
    }
    if (index === 0 && record.event !== "INIT") {
      throw new TaskArtifactError(
        "TASK_BATCH_MANIFEST_INVALID",
        "The batch transaction manifest does not start with INIT",
      );
    }
    token = record.token;
    previousHash = record.hash;
    records.push(Object.freeze(record));
  }
  return Object.freeze({
    records: Object.freeze(records),
    state: reduceBatchJournal(records),
  });
}

async function writeAllAt(fileHandle, buffer, position) {
  let offset = 0;
  while (offset < buffer.byteLength) {
    const result = await fileHandle.write(
      buffer,
      offset,
      buffer.byteLength - offset,
      position + offset,
    );
    if (result.bytesWritten < 1) {
      throw new Error("The batch transaction manifest write made no progress");
    }
    offset += result.bytesWritten;
  }
}

async function readOwnedBatchJournal(markerPath, expectedIdentity) {
  const proof = await readRegularFileProof(markerPath);
  if (!sameFilesystemIdentity(proof.identity, expectedIdentity)) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The batch transaction marker no longer has its acquired identity",
    );
  }
  return Object.freeze({ proof, parsed: parseBatchJournal(proof.content) });
}

async function assertOpenBatchHandle(transaction) {
  if (!transaction.handle) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The batch transaction no longer holds its lock handle",
    );
  }
  const handleState = await transaction.handle.stat({ bigint: true });
  if (
    !handleState.isFile() ||
    !sameFilesystemIdentity(filesystemIdentity(handleState), transaction.lockIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The held batch transaction lock identity changed",
    );
  }
}

async function assertOwnedBatchTransaction(transaction) {
  await assertOpenBatchHandle(transaction);
  const loaded = await readOwnedBatchJournal(
    transaction.markerPath,
    transaction.lockIdentity,
  );
  if (
    loaded.parsed.state.token !== transaction.token ||
    loaded.parsed.state.lastHash !== transaction.lastHash ||
    loaded.proof.content.byteLength !== transaction.journalBytes
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The batch transaction marker content changed outside its owner",
    );
  }
  return loaded;
}

async function appendBatchJournal(transaction, event, data) {
  if (transaction.sequence >= 0) {
    await assertOwnedBatchTransaction(transaction);
  } else {
    await assertOpenBatchHandle(transaction);
  }
  const sequence = transaction.sequence + 1;
  const record = createJournalRecord({
    sequence,
    token: transaction.token,
    event,
    previousHash: transaction.lastHash,
    data,
  });
  if (transaction.hooks.beforeJournalAppend) {
    await transaction.hooks.beforeJournalAppend({ event, sequence });
  }
  const bytes = Buffer.from(`${JSON.stringify(record)}\n`, "utf8");
  if (transaction.journalBytes + bytes.byteLength > maxBatchJournalBytes) {
    throw new TaskArtifactError(
      "TASK_BATCH_MANIFEST_INVALID",
      "The batch transaction manifest would exceed its bounded size",
    );
  }
  await writeAllAt(transaction.handle, bytes, transaction.journalBytes);
  await transaction.handle.sync();
  if (transaction.hooks.afterJournalAppend) {
    await transaction.hooks.afterJournalAppend({ event, sequence });
  }
  transaction.sequence = sequence;
  transaction.lastHash = record.hash;
  transaction.journalBytes += bytes.byteLength;
  const loaded = await assertOwnedBatchTransaction(transaction);
  transaction.state = loaded.parsed.state;
  return loaded.parsed.state;
}

async function removeMarkerWithExpectedIdentity(markerPath, expectedIdentity) {
  const quarantinePath = `${markerPath}.discard`;
  if (await bigintPathState(quarantinePath)) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "An unexpected transaction discard marker already exists",
    );
  }
  await rename(markerPath, quarantinePath);
  const state = await bigintPathState(quarantinePath);
  if (
    !state ||
    state.isSymbolicLink() ||
    !state.isFile() ||
    !sameFilesystemIdentity(filesystemIdentity(state), expectedIdentity)
  ) {
    if (!(await bigintPathState(markerPath)) && (await bigintPathState(quarantinePath))) {
      await rename(quarantinePath, markerPath);
    }
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The transaction lock was replaced before cleanup",
    );
  }
  await unlink(quarantinePath);
}

async function acquireBatchTransaction({
  tasksRoot,
  lockPath,
  rootIdentity,
  queueFingerprint,
  preparedFingerprint,
  expectedTasks,
  stageName,
  token,
  hooks,
}) {
  let handle;
  let lockIdentity;
  try {
    handle = await open(lockPath, "wx+");
    const handleState = await handle.stat({ bigint: true });
    lockIdentity = filesystemIdentity(handleState);
    const transaction = {
      tasksRoot,
      lockPath,
      markerPath: lockPath,
      handle,
      lockIdentity,
      token,
      hooks,
      sequence: -1,
      lastHash: null,
      journalBytes: 0,
      state: undefined,
    };
    await appendBatchJournal(transaction, "INIT", {
      owner: boundedOwnerMetadata(),
      lockIdentity,
      rootIdentity,
      queueFingerprint,
      preparedFingerprint,
      stageName,
      tasks: expectedTasks,
    });
    return transaction;
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new TaskArtifactError(
        "TASK_CREATION_LOCKED",
        `Another Task creation or unrecovered transaction exists at ${lockPath}`,
        { cause: error },
      );
    }
    if (handle) {
      await handle.close().catch(() => {});
      if (lockIdentity) {
        await removeMarkerWithExpectedIdentity(lockPath, lockIdentity).catch(() => {});
      }
    }
    throw error;
  }
}

function expectedTaskFile(task, name) {
  return task.files.find((file) => file.name === name);
}

function ownershipFile(ownership, name) {
  return ownership.files.find((file) => file.name === name);
}

async function assertDirectoryIdentityAndEntries(
  directory,
  expectedIdentity,
  expectedEntries,
) {
  const before = await bigintPathState(directory);
  if (
    !before ||
    before.isSymbolicLink() ||
    !before.isDirectory() ||
    !sameFilesystemIdentity(filesystemIdentity(before), expectedIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Directory identity is not transaction-owned: ${directory}`,
    );
  }
  const entries = (await readdir(directory, { withFileTypes: true }))
    .map((entry) => entry.name)
    .sort();
  if (entries.join("\n") !== [...expectedEntries].sort().join("\n")) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Directory entries are not the exact transaction-owned set: ${directory}`,
    );
  }
  const after = await bigintPathState(directory);
  if (
    !after ||
    after.isSymbolicLink() ||
    !after.isDirectory() ||
    !sameFilesystemIdentity(filesystemIdentity(after), expectedIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Directory identity changed during proof: ${directory}`,
    );
  }
}

async function proveRecordedTaskDirectory(
  directory,
  task,
  ownership,
  { requireComplete = true } = {},
) {
  if (!ownership) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Task ${task.id} has no recorded regular-file ownership`,
    );
  }
  const names = ownership.files.map((file) => file.name).sort();
  if (
    requireComplete &&
    names.join(",") !== task.files.map((file) => file.name).sort().join(",")
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Task ${task.id} has incomplete regular-file ownership`,
    );
  }
  await assertDirectoryIdentityAndEntries(
    directory,
    ownership.directoryIdentity,
    names,
  );
  for (const name of names) {
    const proof = await readRegularFileProof(path.join(directory, name));
    const expected = expectedTaskFile(task, name);
    const observedOwnership = ownershipFile(ownership, name);
    if (
      !proofMatchesExpected(proof, {
        ...expected,
        identity: observedOwnership.identity,
      })
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Task ${task.id} ${name} no longer matches its recorded identity and hash`,
      );
    }
  }
  await assertDirectoryIdentityAndEntries(
    directory,
    ownership.directoryIdentity,
    names,
  );
}

async function proveOwnedTaskDirectory(directory, task, ownership) {
  await proveRecordedTaskDirectory(directory, task, ownership);
}

async function captureStagedTaskOwnership(directory, task) {
  const state = await bigintPathState(directory);
  if (!state || state.isSymbolicLink() || !state.isDirectory()) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `Staged Task ${task.id} is not a real directory`,
    );
  }
  const directoryIdentity = filesystemIdentity(state);
  await assertDirectoryIdentityAndEntries(
    directory,
    directoryIdentity,
    task.files.map((file) => file.name),
  );
  const files = [];
  for (const name of task.files.map((file) => file.name)) {
    const proof = await readRegularFileProof(path.join(directory, name));
    const expected = expectedTaskFile(task, name);
    if (!proofMatchesExpected(proof, expected)) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Staged Task ${task.id} ${name} changed before ownership was recorded`,
      );
    }
    files.push(Object.freeze({ name, identity: proof.identity }));
  }
  return Object.freeze({
    directoryIdentity,
    files: Object.freeze(files),
  });
}

async function classifyTaskLocation(
  directory,
  task,
  ownership,
  { requireComplete = true } = {},
) {
  const state = await bigintPathState(directory);
  if (!state) {
    return "MISSING";
  }
  if (!ownership) {
    return "FOREIGN";
  }
  try {
    await proveRecordedTaskDirectory(directory, task, ownership, {
      requireComplete,
    });
    return "OWNED";
  } catch {
    return "FOREIGN";
  }
}

async function restoreMovedForeign(source, destination) {
  if (!(await bigintPathState(source)) && (await bigintPathState(destination))) {
    await rename(destination, source);
  }
}

async function removeProvenRegularFile({
  transaction,
  filePath,
  expected,
  label,
  useRollbackHooks = true,
}) {
  const proof = await readRegularFileProof(filePath);
  if (!proofMatchesExpected(proof, expected)) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `${label} no longer matches its recorded identity and hash`,
    );
  }
  const quarantinePath = `${filePath}.${transaction.token}.remove`;
  if (await bigintPathState(quarantinePath)) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `${label} removal quarantine is unexpectedly occupied`,
    );
  }
  if (useRollbackHooks && transaction.hooks.beforeRollbackFileMove) {
    await transaction.hooks.beforeRollbackFileMove({ label });
  }
  await rename(filePath, quarantinePath);
  try {
    const movedProof = await readRegularFileProof(quarantinePath);
    if (!proofMatchesExpected(movedProof, expected)) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `${label} was replaced during ownership-safe removal`,
      );
    }
    if (useRollbackHooks && transaction.hooks.beforeRollbackFileUnlink) {
      await transaction.hooks.beforeRollbackFileUnlink({ label });
    }
    const finalProof = await readRegularFileProof(quarantinePath);
    if (!proofMatchesExpected(finalProof, expected)) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `${label} changed before ownership-safe unlink`,
      );
    }
    await unlink(quarantinePath);
  } catch (error) {
    await restoreMovedForeign(filePath, quarantinePath);
    throw error;
  }
}

async function removeProvenEmptyDirectory({
  transaction,
  directory,
  identity,
  label,
  useRollbackHooks = true,
}) {
  await assertDirectoryIdentityAndEntries(directory, identity, []);
  const quarantinePath = `${directory}.${transaction.token}.remove`;
  if (await bigintPathState(quarantinePath)) {
    throw new TaskArtifactError(
      "TASK_BATCH_OWNERSHIP_UNPROVEN",
      `${label} removal quarantine is unexpectedly occupied`,
    );
  }
  if (useRollbackHooks && transaction.hooks.beforeRollbackDirectoryRemove) {
    await transaction.hooks.beforeRollbackDirectoryRemove({ label });
  }
  await rename(directory, quarantinePath);
  try {
    await assertDirectoryIdentityAndEntries(quarantinePath, identity, []);
    if (useRollbackHooks && transaction.hooks.beforeRollbackDirectoryRmdir) {
      await transaction.hooks.beforeRollbackDirectoryRmdir({ label });
    }
    await assertDirectoryIdentityAndEntries(quarantinePath, identity, []);
    await rmdir(quarantinePath);
  } catch (error) {
    await restoreMovedForeign(directory, quarantinePath);
    throw error;
  }
}

async function removeProvenTaskDirectory({
  transaction,
  directory,
  task,
  ownership,
  requireComplete = true,
  useRollbackHooks = true,
}) {
  await proveRecordedTaskDirectory(directory, task, ownership, {
    requireComplete,
  });
  const remaining = ownership.files.map((file) => file.name).sort();
  for (const name of [...remaining]) {
    await removeProvenRegularFile({
      transaction,
      filePath: path.join(directory, name),
      expected: {
        ...expectedTaskFile(task, name),
        identity: ownershipFile(ownership, name).identity,
      },
      label: `Task ${task.id} ${name}`,
      useRollbackHooks,
    });
    remaining.splice(remaining.indexOf(name), 1);
    await assertDirectoryIdentityAndEntries(
      directory,
      ownership.directoryIdentity,
      remaining,
    );
  }
  await removeProvenEmptyDirectory({
    transaction,
    directory,
    identity: ownership.directoryIdentity,
    label: `Task ${task.id} directory`,
    useRollbackHooks,
  });
}

async function planBatchRollback(transaction) {
  const {
    initial,
    ownership,
    finalOwnership,
    published,
    stageIdentity,
  } = transaction.state;
  const stageDirectory = path.join(transaction.tasksRoot, initial.stageName);
  const stageState = await bigintPathState(stageDirectory);
  if (stageState) {
    if (!stageIdentity) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "The staging directory exists without a recorded transaction identity",
      );
    }
    const allowed = new Set(initial.tasks.map((task) => task.directoryName));
    const entries = await readdir(stageDirectory, { withFileTypes: true });
    if (entries.some((entry) => !allowed.has(entry.name))) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "The staging directory contains an unexpected entry",
      );
    }
    await assertDirectoryIdentityAndEntries(
      stageDirectory,
      stageIdentity,
      entries.map((entry) => entry.name),
    );
  }

  const tasks = [];
  for (const task of [...initial.tasks].reverse()) {
    const stagedOwnership = ownership.get(task.id);
    const recordedFinalOwnership = finalOwnership.get(task.id);
    const finalDirectory = path.join(transaction.tasksRoot, task.directoryName);
    const stagedDirectory = path.join(stageDirectory, task.directoryName);
    const finalCategory = await classifyTaskLocation(
      finalDirectory,
      task,
      recordedFinalOwnership,
      { requireComplete: false },
    );
    const stagedCategory = await classifyTaskLocation(
      stagedDirectory,
      task,
      stagedOwnership,
    );
    if (stagedCategory === "FOREIGN") {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Staged Task ${task.id} is not fully transaction-owned`,
      );
    }
    if (recordedFinalOwnership && finalCategory !== "OWNED") {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Final Task ${task.id} no longer matches its recorded ownership`,
      );
    }
    if (published.has(task.id) && finalCategory !== "OWNED") {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Published Task ${task.id} no longer has a provable final location`,
      );
    }
    tasks.push(
      Object.freeze({
        task,
        stagedOwnership,
        finalOwnership: recordedFinalOwnership,
        finalDirectory,
        stagedDirectory,
        removeFinal: finalCategory === "OWNED",
        removeStaged: stagedCategory === "OWNED",
      }),
    );
  }
  return Object.freeze({
    stageDirectory,
    stageIdentity,
    tasks: Object.freeze(tasks),
  });
}

async function rollbackBatchTransaction(transaction) {
  const plan = await planBatchRollback(transaction);
  await appendBatchJournal(transaction, "PHASE", { phase: "ROLLING_BACK" });
  if (transaction.hooks.beforeRollback) {
    await transaction.hooks.beforeRollback();
  }
  for (const step of plan.tasks) {
    if (step.removeFinal) {
      await removeProvenTaskDirectory({
        transaction,
        directory: step.finalDirectory,
        task: step.task,
        ownership: step.finalOwnership,
        requireComplete: false,
      });
    }
  }

  if (await bigintPathState(plan.stageDirectory)) {
    for (const step of plan.tasks) {
      if (!step.removeStaged) {
        continue;
      }
      if (
        (await classifyTaskLocation(
          step.stagedDirectory,
          step.task,
          step.stagedOwnership,
        )) !==
        "OWNED"
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_OWNERSHIP_UNPROVEN",
          `Staged Task ${step.task.id} changed during rollback`,
        );
      }
      await removeProvenTaskDirectory({
        transaction,
        directory: step.stagedDirectory,
        task: step.task,
        ownership: step.stagedOwnership,
      });
    }
    await removeProvenEmptyDirectory({
      transaction,
      directory: plan.stageDirectory,
      identity: plan.stageIdentity,
      label: "batch staging directory",
    });
  }
  await appendBatchJournal(transaction, "PHASE", { phase: "ROLLED_BACK" });
}

async function proveCommittedBatch(transaction) {
  const { initial, finalOwnership, stageIdentity } = transaction.state;
  for (const task of initial.tasks) {
    const finalDirectory = path.join(transaction.tasksRoot, task.directoryName);
    await proveOwnedTaskDirectory(
      finalDirectory,
      task,
      finalOwnership.get(task.id),
    );
  }
  const stageDirectory = path.join(transaction.tasksRoot, initial.stageName);
  if (await bigintPathState(stageDirectory)) {
    if (!stageIdentity) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "The committed transaction staging root has no identity record",
      );
    }
    await removeProvenEmptyDirectory({
      transaction,
      directory: stageDirectory,
      identity: stageIdentity,
      label: "committed batch staging directory",
      useRollbackHooks: false,
    });
  }
}

async function closeBatchTransactionHandle(transaction) {
  if (transaction.handle) {
    const handle = transaction.handle;
    transaction.handle = undefined;
    await handle.close();
  }
}

async function releaseOwnedBatchTransaction(transaction) {
  await assertOwnedBatchTransaction(transaction);
  const releasePath = path.join(
    transaction.tasksRoot,
    batchReleaseMarkerName(transaction.token),
  );
  if (transaction.markerPath === transaction.lockPath) {
    if (await bigintPathState(releasePath)) {
      throw new TaskArtifactError(
        "TASK_BATCH_LOCK_OWNERSHIP_LOST",
        "The transaction release marker is unexpectedly occupied",
      );
    }
    if (transaction.hooks.beforeLockReleaseRename) {
      await transaction.hooks.beforeLockReleaseRename();
    }
    await closeBatchTransactionHandle(transaction);
    await rename(transaction.lockPath, releasePath);
    transaction.markerPath = releasePath;
    if (transaction.hooks.afterLockReleaseRename) {
      await transaction.hooks.afterLockReleaseRename();
    }
  } else {
    await closeBatchTransactionHandle(transaction);
  }

  let loaded;
  try {
    loaded = await readOwnedBatchJournal(
      transaction.markerPath,
      transaction.lockIdentity,
    );
  } catch (error) {
    if (
      transaction.markerPath === releasePath &&
      !(await bigintPathState(transaction.lockPath)) &&
      (await bigintPathState(releasePath))
    ) {
      await rename(releasePath, transaction.lockPath);
      transaction.markerPath = transaction.lockPath;
    }
    throw error;
  }
  if (
    loaded.parsed.state.token !== transaction.token ||
    loaded.parsed.state.lastHash !== transaction.lastHash
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The transaction release marker does not belong to the expected token",
    );
  }
  if (await bigintPathState(transaction.lockPath)) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "A replacement creation lock appeared during transaction release",
    );
  }
  if (transaction.hooks.beforeReleaseMarkerUnlink) {
    await transaction.hooks.beforeReleaseMarkerUnlink();
  }
  const finalProof = await readOwnedBatchJournal(
    transaction.markerPath,
    transaction.lockIdentity,
  );
  if (
    finalProof.parsed.state.token !== transaction.token ||
    finalProof.parsed.state.lastHash !== transaction.lastHash
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_LOCK_OWNERSHIP_LOST",
      "The transaction release marker changed before unlink",
    );
  }
  await unlink(transaction.markerPath);
  transaction.markerPath = undefined;
}

function normalizeBatchCreationFailure(error, firstId, lastId) {
  if (error instanceof TaskArtifactError) {
    return error;
  }
  return new TaskArtifactError(
    "TASK_BATCH_CREATION_FAILED",
    `Could not create Task batch ${firstId}-${lastId}: ${error.message}`,
    { cause: error },
  );
}

export async function createTaskArtifactBatch({ tasksRoot, tasks, hooks = {} }) {
  const definitions = normalizeBatchTaskDefinitions(tasks);
  const root = await resolveExistingTaskRoot(tasksRoot);
  const planningRoot = root.resolved;
  const dependencyIds = definitions.flatMap((task) => task.dependencies.filter((dependency) => dependency.kind === "EXISTING").map((dependency) => dependency.value));
  const planningBaseline = await captureTaskQueueSnapshot(planningRoot, dependencyIds);
  const plan = prevalidateBatchPlan(
    planningRoot,
    planningBaseline.inventory,
    definitions,
    planningBaseline.queue.tasks,
  );
  await rejectRetainedBatchTransaction(planningRoot, definitions);
  if (hooks.afterPrevalidation) {
    await hooks.afterPrevalidation({ tasks: plan });
  }
  const resolvedRoot = await ensureTasksRoot(planningRoot);
  const rootState = await bigintPathState(resolvedRoot);
  const rootIdentity = filesystemIdentity(rootState);
  const baseline = await captureTaskQueueSnapshot(resolvedRoot, dependencyIds);
  if (baseline.fingerprint !== planningBaseline.fingerprint) {
    throw new TaskArtifactError(
      "TASK_CREATION_CONFLICT",
      "The Task queue changed after complete batch prevalidation",
    );
  }
  const projected = projectBatchTasks(
    resolvedRoot,
    baseline.inventory,
    definitions,
  );
  const prepared = renderBatchTasks(projected, baseline.queue.tasks);
  const expectedTasks = expectedBatchTasks(prepared);
  const preparedFingerprint = preparedBatchFingerprint(expectedTasks);

  const firstId = prepared[0].id;
  const lastId = prepared.at(-1).id;
  const token = randomUUID().replaceAll("-", "");
  const stageName = `${batchStagePrefix}${firstId}-${lastId}-${token}.tmp`;
  const stageDirectory = path.join(resolvedRoot, stageName);
  const lockPath = path.join(resolvedRoot, creationLockName);
  let transaction;
  let committed = false;

  try {
    transaction = await acquireBatchTransaction({
      tasksRoot: resolvedRoot,
      lockPath,
      rootIdentity,
      queueFingerprint: baseline.fingerprint,
      preparedFingerprint,
      expectedTasks,
      stageName,
      token,
      hooks,
    });
    if (hooks.afterLock) {
      await hooks.afterLock({ tasks: prepared, lockPath });
    }
    if (hooks.beforeTaskIdAllocation) {
      await hooks.beforeTaskIdAllocation({ tasks: plan });
    }
    if (hooks.afterAllocation) {
      await hooks.afterAllocation({ tasks: prepared });
    }
    await revalidateBatchSnapshot({
      tasksRoot: resolvedRoot,
      rootIdentity,
      queueFingerprint: baseline.fingerprint,
      prepared,
      expectedTasks,
      preparedFingerprint,
    });
    await appendBatchJournal(transaction, "PHASE", {
      phase: "POST_LOCK_VALIDATED",
    });
    if (hooks.afterPostLockRevalidation) {
      await hooks.afterPostLockRevalidation({ tasks: prepared });
    }

    await mkdir(stageDirectory);
    const stageState = await bigintPathState(stageDirectory);
    if (!stageState || stageState.isSymbolicLink() || !stageState.isDirectory()) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "The batch staging path is not a real directory",
      );
    }
    await appendBatchJournal(transaction, "STAGE_CREATED", {
      identity: filesystemIdentity(stageState),
    });
    if (hooks.afterStageDirectoryCreate) {
      await hooks.afterStageDirectoryCreate({ stageDirectory });
    }

    for (const [index, task] of prepared.entries()) {
      const expectedTask = expectedTasks[index];
      const stagedTaskDirectory = path.join(
        stageDirectory,
        expectedTask.directoryName,
      );
      await mkdir(stagedTaskDirectory);
      await writeFile(
        path.join(stagedTaskDirectory, "TASK.md"),
        task.taskMarkdown,
        { encoding: "utf8", flag: "wx" },
      );
      if (task.testMarkdown !== undefined) await writeFile(
        path.join(stagedTaskDirectory, "TEST.md"),
        task.testMarkdown,
        { encoding: "utf8", flag: "wx" },
      );
      const ownership = await captureStagedTaskOwnership(
        stagedTaskDirectory,
        expectedTask,
      );
      await appendBatchJournal(transaction, "TASK_STAGED", {
        id: task.id,
        directoryIdentity: ownership.directoryIdentity,
        files: ownership.files,
      });
      if (hooks.afterPairWrite) {
        await hooks.afterPairWrite({
          stageDirectory,
          stagedTaskDirectory,
          task,
          index,
        });
      }
      await proveOwnedTaskDirectory(
        stagedTaskDirectory,
        expectedTask,
        transaction.state.ownership.get(task.id),
      );
      const stageErrors = await validateTaskDirectory(stagedTaskDirectory);
      if (stageErrors.length > 0) {
        throw invalidBatch(
          `Staged Task ${task.id} failed canonical validation:\n- ${stageErrors.join("\n- ")}`,
          "INVALID_TASK_BATCH_PAIR",
        );
      }
    }
    await appendBatchJournal(transaction, "PHASE", { phase: "STAGED" });
    if (hooks.beforePublish) {
      await hooks.beforePublish({ stageDirectory, tasks: prepared });
    }
    await revalidateBatchSnapshot({
      tasksRoot: resolvedRoot,
      rootIdentity,
      queueFingerprint: baseline.fingerprint,
      prepared,
      expectedTasks,
      preparedFingerprint,
    });
    for (const task of expectedTasks) {
      await proveOwnedTaskDirectory(
        path.join(stageDirectory, task.directoryName),
        task,
        transaction.state.ownership.get(task.id),
      );
    }
    await appendBatchJournal(transaction, "PHASE", { phase: "PUBLISHING" });

    for (const [index, task] of prepared.entries()) {
      const expectedTask = expectedTasks[index];
      const stagedTaskDirectory = path.join(
        stageDirectory,
        expectedTask.directoryName,
      );
      if (hooks.beforeDirectoryPublish) {
        await hooks.beforeDirectoryPublish({ task, index });
      }
      await proveOwnedTaskDirectory(
        stagedTaskDirectory,
        expectedTask,
        transaction.state.ownership.get(task.id),
      );
      try {
        await mkdir(task.directory);
      } catch (error) {
        if (error.code === "EEXIST") {
          throw new TaskArtifactError(
            "TASK_CREATION_CONFLICT",
            `Task ${task.id} was claimed immediately before publication`,
            { cause: error },
          );
        }
        throw error;
      }
      const finalDirectoryState = await bigintPathState(task.directory);
      if (
        !finalDirectoryState ||
        finalDirectoryState.isSymbolicLink() ||
        !finalDirectoryState.isDirectory()
      ) {
        throw new TaskArtifactError(
          "TASK_BATCH_OWNERSHIP_UNPROVEN",
          `Final Task ${task.id} is not a real transaction-owned directory`,
        );
      }
      await appendBatchJournal(transaction, "FINAL_DIRECTORY_CREATED", {
        id: task.id,
        directoryIdentity: filesystemIdentity(finalDirectoryState),
      });
      if (hooks.afterFinalDirectoryCreate) {
        await hooks.afterFinalDirectoryCreate({ task, index });
      }
      for (const [name, content] of [
        ["TASK.md", task.taskMarkdown],
        ["TEST.md", task.testMarkdown],
      ].filter(([, content]) => content !== undefined)) {
        const finalPath = path.join(task.directory, name);
        await writeFile(finalPath, content, { encoding: "utf8", flag: "wx" });
        const proof = await readRegularFileProof(finalPath);
        if (!proofMatchesExpected(proof, expectedTaskFile(expectedTask, name))) {
          throw new TaskArtifactError(
            "TASK_BATCH_OWNERSHIP_UNPROVEN",
            `Final Task ${task.id} ${name} changed before ownership was recorded`,
          );
        }
        await appendBatchJournal(transaction, "FINAL_FILE_CREATED", {
          id: task.id,
          name,
          identity: proof.identity,
        });
        if (hooks.afterFinalFileCreate) {
          await hooks.afterFinalFileCreate({ task, index, name });
        }
      }
      await proveOwnedTaskDirectory(
        task.directory,
        expectedTask,
        transaction.state.finalOwnership.get(task.id),
      );
      await appendBatchJournal(transaction, "TASK_PUBLISHED", { id: task.id });
      await removeProvenTaskDirectory({
        transaction,
        directory: stagedTaskDirectory,
        task: expectedTask,
        ownership: transaction.state.ownership.get(task.id),
        useRollbackHooks: false,
      });
      if (hooks.afterDirectoryPublish) {
        await hooks.afterDirectoryPublish({ task, index });
      }
    }
    await appendBatchJournal(transaction, "PHASE", { phase: "COMMITTED" });
    committed = true;
    await proveCommittedBatch(transaction);
    await releaseOwnedBatchTransaction(transaction);
  } catch (error) {
    const primary = normalizeBatchCreationFailure(error, firstId, lastId);
    if (!transaction) {
      throw primary;
    }
    if (committed || transaction.state?.phase === "COMMITTED") {
      await closeBatchTransactionHandle(transaction).catch(() => {});
      throw new TaskArtifactError(
        "TASK_BATCH_FINALIZATION_FAILED",
        `Task batch ${firstId}-${lastId} was committed but final cleanup is blocked; inspect and recover the preserved transaction evidence`,
        { cause: primary },
      );
    }
    try {
      await rollbackBatchTransaction(transaction);
      await releaseOwnedBatchTransaction(transaction);
    } catch (rollbackError) {
      await closeBatchTransactionHandle(transaction).catch(() => {});
      throw new TaskArtifactError(
        "TASK_BATCH_ROLLBACK_FAILED",
        `Task batch creation failed and ownership-safe rollback is blocked: ${rollbackError.message}`,
        { cause: primary },
      );
    }
    throw primary;
  }

  return Object.freeze({
    firstId,
    lastId,
    tasks: Object.freeze(
      prepared.map((task) =>
        Object.freeze({
          key: task.key,
          id: task.id,
          slug: task.slug,
          directory: task.directory,
          taskPath: task.taskPath,
          ...(task.testMarkdown === undefined ? {} : { testPath: task.testPath }),
          dependencies: task.resolvedDependencies,
          ...(task.releaseVersion
            ? { releaseVersion: task.releaseVersion }
            : {}),
        }),
      ),
    ),
  });
}

async function resolveExistingTaskRoot(tasksRoot) {
  if (typeof tasksRoot !== "string" || !tasksRoot.trim()) {
    throw new TaskArtifactError(
      "INVALID_TASK_ROOT",
      "Tasks root must be a non-empty path string",
    );
  }
  const resolved = path.resolve(tasksRoot);
  const state = await bigintPathState(resolved);
  if (!state) {
    return Object.freeze({ resolved, exists: false });
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    throw new TaskArtifactError(
      "INVALID_TASK_ROOT",
      "Task transaction inspection requires a real Task root directory",
    );
  }
  return Object.freeze({
    resolved: await realpath(resolved),
    exists: true,
    identity: filesystemIdentity(state),
  });
}

async function loadBatchTransaction(tasksRoot) {
  const artifacts = await listBatchTransactionArtifacts(tasksRoot);
  if (artifacts.length === 0) {
    return Object.freeze({ exists: false, artifacts });
  }
  const markers = artifacts.filter(
    (name) => name === creationLockName || isBatchReleaseMarkerName(name),
  );
  if (markers.length !== 1) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "Transaction evidence does not contain exactly one lock or release marker",
    );
  }
  const markerName = markers[0];
  const markerPath = path.join(tasksRoot, markerName);
  const proof = await readRegularFileProof(markerPath);
  const parsed = parseBatchJournal(proof.content);
  const expectedMarkerNames = new Set([
    creationLockName,
    batchReleaseMarkerName(parsed.state.token),
  ]);
  if (
    !expectedMarkerNames.has(markerName) ||
    !sameFilesystemIdentity(proof.identity, parsed.state.initial.lockIdentity)
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "The transaction marker name or filesystem identity is unproven",
    );
  }
  const rootState = await bigintPathState(tasksRoot);
  if (
    !rootState ||
    rootState.isSymbolicLink() ||
    !rootState.isDirectory() ||
    !sameFilesystemIdentity(
      filesystemIdentity(rootState),
      parsed.state.initial.rootIdentity,
    )
  ) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "The Task root no longer matches the transaction root identity",
    );
  }
  const allowedArtifacts = new Set([
    markerName,
    parsed.state.initial.stageName,
  ]);
  if (artifacts.some((name) => !allowedArtifacts.has(name))) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "Unexpected transaction-like evidence is present beside the owned marker",
    );
  }
  return Object.freeze({
    exists: true,
    artifacts,
    markerName,
    markerPath,
    proof,
    parsed,
  });
}

async function openLoadedBatchTransaction(tasksRoot, loaded, hooks) {
  const handle = await open(loaded.markerPath, "r+");
  try {
    const handleState = await handle.stat({ bigint: true });
    if (
      !handleState.isFile() ||
      !sameFilesystemIdentity(
        filesystemIdentity(handleState),
        loaded.proof.identity,
      )
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_RECOVERY_BLOCKED",
        "The transaction marker changed while recovery acquired it",
      );
    }
    const transaction = {
      tasksRoot,
      lockPath: path.join(tasksRoot, creationLockName),
      markerPath: loaded.markerPath,
      handle,
      lockIdentity: loaded.proof.identity,
      token: loaded.parsed.state.token,
      hooks,
      sequence: loaded.parsed.state.sequence,
      lastHash: loaded.parsed.state.lastHash,
      journalBytes: loaded.proof.content.byteLength,
      state: loaded.parsed.state,
    };
    await assertOwnedBatchTransaction(transaction);
    return transaction;
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
}

async function stageObservation(tasksRoot, state) {
  const stagePath = path.join(tasksRoot, state.initial.stageName);
  const observed = await bigintPathState(stagePath);
  if (!observed) {
    return "MISSING";
  }
  if (
    !state.stageIdentity ||
    observed.isSymbolicLink() ||
    !observed.isDirectory() ||
    !sameFilesystemIdentity(
      filesystemIdentity(observed),
      state.stageIdentity,
    )
  ) {
    return "UNPROVEN";
  }
  const entries = await readdir(stagePath, { withFileTypes: true });
  const allowed = new Set(state.initial.tasks.map((task) => task.directoryName));
  if (entries.some((entry) => !allowed.has(entry.name))) {
    return "UNEXPECTED_ENTRY";
  }
  return entries.length === 0 ? "OWNED_EMPTY" : "OWNED_CONTENT";
}

async function diagnosticTaskObservations(tasksRoot, state) {
  const observations = [];
  let truncated = 0;
  const firstId = state.initial.tasks[0].id;
  const lastId = state.initial.tasks.at(-1).id;
  const diagnosticStageName =
    `${batchStagePrefix}${firstId}-${lastId}-${state.token.slice(0, 8)}….tmp`;
  for (const task of state.initial.tasks) {
    const stageDirectory = path.join(
      tasksRoot,
      state.initial.stageName,
      task.directoryName,
    );
    const finalDirectory = path.join(tasksRoot, task.directoryName);
    for (const [relativePath, directory, ownership, requireComplete] of [
      [
        `${diagnosticStageName}/${task.directoryName}`,
        stageDirectory,
        state.ownership.get(task.id),
        true,
      ],
      [
        task.directoryName,
        finalDirectory,
        state.finalOwnership.get(task.id),
        false,
      ],
    ]) {
      const category = await classifyTaskLocation(
        directory,
        task,
        ownership,
        { requireComplete },
      );
      if (category === "MISSING") {
        continue;
      }
      if (observations.length < maxBatchDiagnosticObservations) {
        observations.push(
          Object.freeze({
            path: relativePath,
            category:
              category === "OWNED"
                ? "EXPECTED_IDENTITY_AND_HASH"
                : "UNPROVEN_CONTENT",
          }),
        );
      } else {
        truncated += 1;
      }
    }
  }
  return Object.freeze({
    observations: Object.freeze(observations),
    truncated,
  });
}

function noBatchTransactionDiagnostic() {
  return Object.freeze({
    schemaVersion: batchTransactionSchemaVersion,
    state: "NONE",
    category: "NO_TRANSACTION_EVIDENCE",
    observations: Object.freeze([]),
    truncatedObservations: 0,
  });
}

export async function inspectTaskBatchTransaction({ tasksRoot }) {
  let root;
  try {
    root = await resolveExistingTaskRoot(tasksRoot);
    if (!root.exists) {
      return noBatchTransactionDiagnostic();
    }
    const loaded = await loadBatchTransaction(root.resolved);
    if (!loaded.exists) {
      return noBatchTransactionDiagnostic();
    }
    const state = loaded.parsed.state;
    const firstId = state.initial.tasks[0].id;
    const lastId = state.initial.tasks.at(-1).id;
    const diagnosticStageName =
      `${batchStagePrefix}${firstId}-${lastId}-${state.token.slice(0, 8)}….tmp`;
    const diagnosticMarkerName =
      loaded.markerName === creationLockName
        ? creationLockName
        : `${batchReleaseMarkerPrefix}${state.token.slice(0, 8)}….lock`;
    const taskObservations = await diagnosticTaskObservations(
      root.resolved,
      state,
    );
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      state: "RECOVERY_REQUIRED",
      category: "TRANSACTION_EVIDENCE_PRESENT",
      phase: state.phase,
      tokenPrefix: state.token.slice(0, 8),
      journalHashPrefix: state.lastHash.slice(0, 12),
      preparedHashPrefix: state.initial.preparedFingerprint.slice(0, 12),
      marker: Object.freeze({
        path: diagnosticMarkerName,
        category: "EXPECTED_IDENTITY_AND_HASH_CHAIN",
      }),
      stage: Object.freeze({
        path: diagnosticStageName,
        category: await stageObservation(root.resolved, state),
      }),
      owner: Object.freeze({
        processId: state.initial.owner.processId,
        host: state.initial.owner.host,
        createdAt: state.initial.owner.createdAt,
      }),
      expectedTaskCount: state.initial.tasks.length,
      publishedTaskCount: state.published.size,
      observations: taskObservations.observations,
      truncatedObservations: taskObservations.truncated,
    });
  } catch (error) {
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      state: "BLOCKED",
      category:
        error instanceof TaskArtifactError
          ? error.code
          : "TASK_BATCH_DIAGNOSTIC_FAILED",
      observations: Object.freeze([]),
      truncatedObservations: 0,
    });
  }
}

async function proveRolledBackBatch(transaction) {
  const { initial, finalOwnership, stageIdentity } = transaction.state;
  const stageDirectory = path.join(transaction.tasksRoot, initial.stageName);
  if (await bigintPathState(stageDirectory)) {
    if (!stageIdentity) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        "Rolled-back staging content has no recorded identity",
      );
    }
    await assertDirectoryIdentityAndEntries(
      stageDirectory,
      stageIdentity,
      [],
    );
  }
  for (const task of initial.tasks) {
    const finalDirectory = path.join(transaction.tasksRoot, task.directoryName);
    if (
      (await classifyTaskLocation(
        finalDirectory,
        task,
        finalOwnership.get(task.id),
        { requireComplete: false },
      )) === "OWNED"
    ) {
      throw new TaskArtifactError(
        "TASK_BATCH_OWNERSHIP_UNPROVEN",
        `Rolled-back Task ${task.id} still exists as transaction-owned content`,
      );
    }
  }
  if (await bigintPathState(stageDirectory)) {
    await removeProvenEmptyDirectory({
      transaction,
      directory: stageDirectory,
      identity: stageIdentity,
      label: "rolled-back batch staging directory",
    });
  }
}

export async function recoverTaskBatchTransaction({ tasksRoot, hooks = {} }) {
  const root = await resolveExistingTaskRoot(tasksRoot);
  if (!root.exists) {
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      recovered: false,
      action: "none",
      state: "NONE",
    });
  }
  let loaded;
  try {
    loaded = await loadBatchTransaction(root.resolved);
  } catch (error) {
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "Batch transaction recovery cannot prove the preserved evidence",
      { cause: error },
    );
  }
  if (!loaded.exists) {
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      recovered: false,
      action: "none",
      state: "NONE",
    });
  }
  let transaction;
  try {
    transaction = await openLoadedBatchTransaction(
      root.resolved,
      loaded,
      hooks,
    );
    let action;
    if (transaction.state.phase === "COMMITTED") {
      await proveCommittedBatch(transaction);
      action = "completed-cleanup";
    } else if (transaction.state.phase === "ROLLED_BACK") {
      await proveRolledBackBatch(transaction);
      action = "rolled-back-cleanup";
    } else {
      await rollbackBatchTransaction(transaction);
      action = "rolled-back";
    }
    await releaseOwnedBatchTransaction(transaction);
    return Object.freeze({
      schemaVersion: batchTransactionSchemaVersion,
      recovered: true,
      action,
      state: "RECOVERED",
      tokenPrefix: loaded.parsed.state.token.slice(0, 8),
    });
  } catch (error) {
    if (transaction) {
      await closeBatchTransactionHandle(transaction).catch(() => {});
    }
    throw new TaskArtifactError(
      "TASK_BATCH_RECOVERY_BLOCKED",
      "Batch transaction recovery stopped because ownership proof failed; all unproven evidence was preserved",
      { cause: error },
    );
  }
}

export async function createTaskArtifacts({ tasksRoot, title, templateRoot, hooks = {}, detailedTests = false }) {
  const taskMarkdown = await readCanonicalTemplate("TASK", templateRoot);
  const testMarkdown = detailedTests ? await readCanonicalTemplate("TEST", templateRoot) : undefined;
  const result = await createTaskArtifactBatch({ tasksRoot, tasks: [{ title, taskMarkdown, ...(testMarkdown ? { testMarkdown } : {}) }], hooks });
  return result.tasks[0];
}
