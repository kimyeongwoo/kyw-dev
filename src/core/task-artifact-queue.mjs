import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import {
  getTaskContractVersion,
  isImmutableTerminalTaskContractVersion,
  isQueueAwareTaskContractVersion,
  validateTaskTestContract,
} from "./template-contracts.mjs";
import {
  ALL_TASKS_COMPLETE_MESSAGE,
  MAX_TASK_NUMBER,
  activeTask,
  blockedTask,
  cancelledTask,
  completeTask,
  draftTask,
  firstSectionLine,
  formatTaskId,
  inspectTaskDirectories,
  parseDeliveryRequirement,
  parseHardDependencies,
  readyTask,
  resolveTaskDirectory,
  taskSummary,
} from "./task-artifact-contract.mjs";
import {
  classifyDeliveryEvidence,
  evaluateTaskExecutionPreflight,
  parseTaskInvocation,
} from "./task-artifact-delivery.mjs";
import {
  TaskArtifactError,
  listBatchTransactionArtifacts,
  taskLayoutError,
} from "./task-artifact-shared.mjs";

export function parseTaskQueueMarkdownPair({
  tasksRoot,
  entry,
  taskMarkdown,
  testMarkdown,
}) {
  const directory = resolveTaskDirectory(tasksRoot, entry.id, entry.slug);
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");
  const errors = validateTaskTestContract({ taskMarkdown, testMarkdown }).map(
    (message) => `${entry.name}: ${message}`,
  );
  const taskId = /^# TASK (\d{4}) — (.+)$/m.exec(taskMarkdown);
  const testId = /^# TEST (\d{4}) — (.+)$/m.exec(testMarkdown);
  if (taskId?.[1] !== entry.id || testId?.[1] !== entry.id) {
    errors.push(
      `${entry.name}: directory ID ${entry.id} must match TASK.md and TEST.md headers (${taskId?.[1] ?? "<missing>"}/${testId?.[1] ?? "<missing>"})`,
    );
  }
  const contractVersion = getTaskContractVersion(taskMarkdown);
  const taskStatus = firstSectionLine(taskMarkdown, "Status");
  const testStatus = firstSectionLine(testMarkdown, "Status");
  const deliveryRequirement = parseDeliveryRequirement(
    taskMarkdown,
    contractVersion,
  );
  const baseTask = {
    id: entry.id,
    number: entry.number,
    name: entry.name,
    directory,
    taskPath,
    testPath,
    title: taskId?.[2]?.trim() ?? entry.name,
    taskStatus,
    testStatus,
    contractVersion,
    dependencies: Object.freeze([]),
    deliveryRequirement,
    blocker:
      firstSectionLine(taskMarkdown, "Blockers") ??
      "No blocker reason recorded.",
  };
  const dependencyParse = parseHardDependencies(
    taskMarkdown,
    contractVersion,
    { completedCompatibility: completeTask(baseTask) },
  );
  errors.push(
    ...dependencyParse.errors.map(
      (message) => `${entry.name}: TASK.md: ${message}`,
    ),
  );
  return {
    entry,
    errors,
    taskMarkdown,
    task: Object.freeze({
      ...baseTask,
      dependencies: dependencyParse.dependencies,
    }),
  };
}

async function readTaskQueueEntry(tasksRoot, entry) {
  const directory = resolveTaskDirectory(tasksRoot, entry.id, entry.slug);
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");
  let directoryState;
  let taskState;
  let testState;
  try {
    [directoryState, taskState, testState] = await Promise.all([
      lstat(directory),
      lstat(taskPath),
      lstat(testPath),
    ]);
  } catch (error) {
    return {
      entry,
      errors: [`${entry.name} must contain regular TASK.md and TEST.md files: ${error.message}`],
    };
  }
  const unsafePaths = [];
  if (directoryState.isSymbolicLink() || !directoryState.isDirectory()) {
    unsafePaths.push("Task directory");
  }
  if (taskState.isSymbolicLink() || !taskState.isFile()) {
    unsafePaths.push("TASK.md");
  }
  if (testState.isSymbolicLink() || !testState.isFile()) {
    unsafePaths.push("TEST.md");
  }
  if (unsafePaths.length > 0) {
    return {
      entry,
      errors: [
        `${entry.name} must not dispatch through symbolic-link or non-file paths: ${unsafePaths.join(", ")}`,
      ],
    };
  }

  let taskMarkdown;
  let testMarkdown;
  try {
    [taskMarkdown, testMarkdown] = await Promise.all([
      readFile(taskPath, "utf8"),
      readFile(testPath, "utf8"),
    ]);
  } catch (error) {
    return {
      entry,
      errors: [`${entry.name} must contain readable TASK.md and TEST.md: ${error.message}`],
    };
  }

  return parseTaskQueueMarkdownPair({
    tasksRoot,
    entry,
    taskMarkdown,
    testMarkdown,
  });
}

export function dependencyGraphErrors(tasks, byId) {
  const currentTasks = tasks.filter(
    (task) => isQueueAwareTaskContractVersion(task.contractVersion),
  );
  const errors = [];
  for (const task of currentTasks) {
    for (const dependencyId of task.dependencies) {
      if (!byId.has(dependencyId)) {
        errors.push(`Task ${task.id} references missing hard dependency Task ${dependencyId}`);
      }
    }
  }

  const currentIds = new Set(currentTasks.map((task) => task.id));
  const state = new Map();
  const stack = [];
  const cycles = new Set();
  function visit(task) {
    const currentState = state.get(task.id);
    if (currentState === "DONE") {
      return;
    }
    if (currentState === "ACTIVE") {
      const cycleStart = stack.indexOf(task.id);
      const cycle = [...stack.slice(cycleStart), task.id].join(" -> ");
      cycles.add(`Hard dependency cycle: ${cycle}`);
      return;
    }
    state.set(task.id, "ACTIVE");
    stack.push(task.id);
    for (const dependencyId of task.dependencies) {
      if (currentIds.has(dependencyId)) {
        visit(byId.get(dependencyId));
      }
    }
    stack.pop();
    state.set(task.id, "DONE");
  }
  for (const task of currentTasks) {
    visit(task);
  }
  errors.push(...cycles);
  return errors;
}

export async function inspectTaskQueueContents(tasksRoot) {
  const inventory = await inspectTaskDirectories(tasksRoot);
  const errors = [...inventory.malformed];
  for (const conflict of inventory.conflicts) {
    errors.push(`Task ID ${conflict.id} is used by: ${conflict.names.join(", ")}`);
  }

  const records = await Promise.all(
    inventory.entries.map((entry) => readTaskQueueEntry(tasksRoot, entry)),
  );
  const tasks = [];
  for (const record of records) {
    errors.push(...record.errors);
    if (record.task) {
      tasks.push(record.task);
    }
  }
  const byId = new Map(tasks.map((task) => [task.id, task]));
  errors.push(...dependencyGraphErrors(tasks, byId));
  return Object.freeze({
    tasks: Object.freeze(tasks),
    errors: Object.freeze(errors),
    currentTasks: Object.freeze(
      tasks.filter((task) => isQueueAwareTaskContractVersion(task.contractVersion)),
    ),
  });
}

export async function inspectTaskQueue(tasksRoot) {
  try {
    const rootState = await lstat(tasksRoot);
    if (rootState.isSymbolicLink()) {
      return Object.freeze({
        tasks: Object.freeze([]),
        errors: Object.freeze([`Tasks root must not be a symbolic link: ${tasksRoot}`]),
        currentTasks: Object.freeze([]),
      });
    }
    if (!rootState.isDirectory()) {
      return Object.freeze({
        tasks: Object.freeze([]),
        errors: Object.freeze([`Tasks root is not a directory: ${tasksRoot}`]),
        currentTasks: Object.freeze([]),
      });
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new TaskArtifactError(
        "TASK_ROOT_READ_FAILED",
        `Cannot inspect tasks root ${tasksRoot}: ${error.message}`,
        { cause: error },
      );
    }
  }

  const transactionArtifacts = await listBatchTransactionArtifacts(path.resolve(tasksRoot));
  if (transactionArtifacts.length > 0) {
    return Object.freeze({
      tasks: Object.freeze([]),
      errors: Object.freeze([
        "Task queue creation is locked by batch transaction evidence",
      ]),
      currentTasks: Object.freeze([]),
    });
  }
  return inspectTaskQueueContents(tasksRoot);
}

function blockedResult(code, message, details = {}) {
  return Object.freeze({ outcome: "BLOCKED", code, message, ...details });
}

function isPublicReleaseInvocation(parsedInvocation) {
  return parsedInvocation?.deliveryMode === "PUBLIC_RELEASE";
}

function publicReleaseResult(
  result,
  parsedInvocation,
  {
    authorized = false,
    state = "BLOCKED",
    nextStage = "STANDARD_FINAL",
  } = {},
) {
  if (!isPublicReleaseInvocation(parsedInvocation)) return result;
  return Object.freeze({
    ...result,
    deliveryMode: "PUBLIC_RELEASE",
    publicReleaseAuthorized: authorized,
    publicWriteAuthorized: false,
    publicReleaseState: state,
    publicReleaseNextStage: nextStage,
  });
}

function deliveryClassification(task, deliveryState) {
  if (task.deliveryRequirement.kind !== "STANDARD") {
    return Object.freeze({ disposition: "SATISFIED", issues: Object.freeze([]) });
  }
  return classifyDeliveryEvidence(
    task.id,
    deliveryState.ledger?.[task.id],
    deliveryState.expectations?.[task.id],
  );
}

function deliveryBlockers(task, deliveryState) {
  const classification = deliveryClassification(task, deliveryState);
  if (classification.disposition === "SATISFIED") {
    return [];
  }
  if (classification.disposition === "RESUMABLE") {
    return [`Task ${task.id} delivery is resumable but not yet satisfied`];
  }
  return classification.issues.map((issue) => `Task ${task.id} delivery: ${issue}`);
}

function completionBlockers(task, byId, deliveryState, visited = new Set()) {
  if (visited.has(task.id)) {
    return [];
  }
  visited.add(task.id);
  if (blockedTask(task)) {
    return [`Task ${task.id} is BLOCKED: ${task.blocker}`];
  }
  if (cancelledTask(task)) {
    return [`Task ${task.id} is CANCELLED and cannot satisfy a hard dependency`];
  }
  if (!completeTask(task)) {
    return [`Task ${task.id} is not repository-complete (${task.taskStatus}/${task.testStatus})`];
  }

  const blockers = [...deliveryBlockers(task, deliveryState)];
  for (const dependencyId of task.dependencies) {
    const dependency = byId.get(dependencyId);
    if (!dependency) {
      blockers.push(`Task ${task.id} references missing hard dependency Task ${dependencyId}`);
      continue;
    }
    blockers.push(...completionBlockers(dependency, byId, deliveryState, visited));
  }
  return blockers;
}

function selectionBlockers(task, byId, deliveryState) {
  const blockers = [];
  for (const dependencyId of task.dependencies) {
    const dependency = byId.get(dependencyId);
    if (!dependency) {
      blockers.push(`Task ${task.id} references missing hard dependency Task ${dependencyId}`);
      continue;
    }
    blockers.push(...completionBlockers(dependency, byId, deliveryState));
  }
  return blockers;
}

function terminalGateBlockers(task, byId, deliveryState) {
  return [
    ...selectionBlockers(task, byId, deliveryState),
    ...(cancelledTask(task) ? [] : deliveryBlockers(task, deliveryState)),
  ];
}

function priorTransitionBlockers(task, currentTasks, byId, deliveryState) {
  if (!isQueueAwareTaskContractVersion(task.contractVersion)) {
    return [];
  }
  const blockers = [];
  for (const prior of currentTasks) {
    if (prior.number >= task.number || (!completeTask(prior) && !cancelledTask(prior))) {
      continue;
    }
    for (const blocker of terminalGateBlockers(prior, byId, deliveryState)) {
      blockers.push(`Cannot advance past Task ${prior.id}: ${blocker}`);
    }
  }
  return blockers;
}

function queueSelectionBlockers(task, currentTasks, byId, deliveryState) {
  return [
    ...selectionBlockers(task, byId, deliveryState),
    ...priorTransitionBlockers(task, currentTasks, byId, deliveryState),
  ];
}

function selectionBlockedResult(task, blockers, parsedInvocation) {
  const pendingDeliveryTaskId = blockers
    .map((blocker) => /Task (\d{4}) delivery is resumable/.exec(blocker)?.[1])
    .find(Boolean);
  if (pendingDeliveryTaskId) {
    const deliveryCommand = `$kyw-deliver ${pendingDeliveryTaskId}`;
    return blockedResult(
      "STANDARD_DELIVERY_REQUIRED",
      `다음 단계: ${deliveryCommand}`,
      {
        task: taskSummary(task),
        route: parsedInvocation?.route ?? "IMPLEMENTATION",
        deliveryTaskId: pendingDeliveryTaskId,
        deliveryCommand,
        mutationRequired: false,
      },
    );
  }
  const priorTransitionBlocked = blockers.some((blocker) =>
    blocker.startsWith("Cannot advance past Task "),
  );
  return blockedResult(
    priorTransitionBlocked ? "QUEUE_TRANSITION_BLOCKED" : "UNSATISFIED_DEPENDENCY",
    blockers.join("; "),
    {
      task: taskSummary(task),
      ...(parsedInvocation ? { route: parsedInvocation.route } : {}),
    },
  );
}

function selectedResult(
  task,
  parsedInvocation,
  requestedAction,
  deliveryEvidence,
) {
  const action =
    requestedAction ??
    (blockedTask(task)
      ? "RECHECK_BLOCKER"
      : activeTask(task)
        ? "RESUME"
        : "IMPLEMENT");
  const publicRelease = isPublicReleaseInvocation(parsedInvocation);
  const lifecycleSelection = [
    "IMPLEMENT",
    "RESUME",
    "DELIVER",
    "PUBLIC_RELEASE",
  ].includes(action);
  const standardDeliveryAuthorized =
    lifecycleSelection &&
    parsedInvocation.route === "DELIVERY" &&
    action === "DELIVER" &&
    task.deliveryRequirement.kind === "STANDARD";
  return Object.freeze({
    outcome: "SELECTED",
    route: parsedInvocation.route,
    mode: parsedInvocation.mode,
    action,
    confirmation: readyTask(task),
    continuous: parsedInvocation.mode === "CONTINUOUS",
    task: taskSummary(task),
    ...(lifecycleSelection
      ? {
          authoritySource: "RECOGNIZED_TASK_INVOCATION",
          authorityScope: publicRelease
            ? "PUBLIC_RELEASE"
            : standardDeliveryAuthorized
              ? "STANDARD_DELIVERY"
              : "REPOSITORY_LIFECYCLE",
          standardDeliveryAuthorized,
          ceremonialConfirmationRequired: false,
          separateAuthorityBoundary: publicRelease
            ? "OUT_OF_SCOPE_EXTERNAL_MUTATIONS"
            : "NON_STANDARD_EXTERNAL_MUTATIONS",
        }
      : {}),
    ...(publicRelease
      ? {
          deliveryMode: "PUBLIC_RELEASE",
          publicReleaseAuthorized: true,
          publicWriteAuthorized: false,
          publicReleaseState:
            action === "PUBLIC_RELEASE" ? "READY" : "STANDARD_PENDING",
          publicReleaseNextStage:
            action === "PUBLIC_RELEASE"
              ? "PUBLIC_PREFLIGHT"
              : "STANDARD_DELIVERY",
        }
      : {}),
    ...(action === "DELIVER"
      ? {
          deliveryDisposition: "RESUMABLE",
          deliveryClassification: deliveryEvidence?.classification ?? "PENDING",
          actualHeadEvidence: deliveryEvidence?.actualHead ?? "UNVERIFIED",
          mergeCompatibilityEvidence:
            deliveryEvidence?.mergeCompatibility ?? "UNVERIFIED",
          postMergeEvidence: deliveryEvidence?.postMerge ?? "UNVERIFIED",
          message: `Task ${task.id} is repository-complete; the exact $kyw-deliver route authorizes resuming STANDARD delivery without ceremonial reconfirmation.`,
        }
      : {}),
    ...(action === "PUBLIC_RELEASE"
      ? {
          deliveryDisposition: "SATISFIED",
          deliveryClassification: deliveryEvidence?.classification,
          actualHeadEvidence: deliveryEvidence?.actualHead,
          mergeCompatibilityEvidence: deliveryEvidence?.mergeCompatibility,
          postMergeEvidence: deliveryEvidence?.postMerge,
          message: `Task ${task.id} has a freshly revalidated FINAL STANDARD graph; public-release state preflight is the next read-only stage.`,
        }
      : {}),
    ...(blockedTask(task) ? { blocker: task.blocker } : {}),
    overrideText: parsedInvocation.overrideText,
    overrideScope: parsedInvocation.overrideScope,
  });
}

function deliveryEvidenceBlockedResult(task, classification, parsedInvocation) {
  const deliveryCommand = `$kyw-deliver ${task.id}`;
  return blockedResult(
    classification.blockerCode ?? "DELIVERY_EVIDENCE_INVALID",
    classification.issues.map((issue) => `Task ${task.id} delivery: ${issue}`).join("; "),
    {
      task: taskSummary(task),
      deliveryDisposition: "BLOCKED",
      deliveryClassification: classification.classification,
      actualHeadEvidence: classification.actualHead,
      mergeCompatibilityEvidence: classification.mergeCompatibility,
      postMergeEvidence: classification.postMerge,
      issues: classification.issues,
      ...(parsedInvocation
        ? {
            route: parsedInvocation.route,
            ...(parsedInvocation.route === "IMPLEMENTATION"
              ? { deliveryCommand }
              : {}),
          }
        : {}),
    },
  );
}

function implementationDeliveryRequiredResult(
  task,
  parsedInvocation,
  classification,
  { terminal = false } = {},
) {
  const deliveryCommand = `$kyw-deliver ${task.id}`;
  return Object.freeze({
    outcome: terminal ? "TERMINAL" : "BLOCKED",
    code: "STANDARD_DELIVERY_REQUIRED",
    message: `다음 단계: ${deliveryCommand}`,
    route: "IMPLEMENTATION",
    task: taskSummary(task),
    deliveryTaskId: task.id,
    deliveryCommand,
    deliveryDisposition: "RESUMABLE",
    deliveryClassification: classification.classification,
    actualHeadEvidence: classification.actualHead,
    mergeCompatibilityEvidence: classification.mergeCompatibility,
    postMergeEvidence: classification.postMerge,
    mutationRequired: false,
    overrideText: parsedInvocation.overrideText,
    overrideScope: parsedInvocation.overrideScope,
  });
}

function terminalTaskResult(
  task,
  byId,
  deliveryState,
  parsedInvocation,
  overrideClassification,
) {
  if (completeTask(task)) {
    const dependencyBlockers = selectionBlockers(task, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult(
        "UNSATISFIED_DEPENDENCY",
        dependencyBlockers.join("; "),
        { task: taskSummary(task) },
      );
    }
    const classification = deliveryClassification(task, deliveryState);
    if (classification.disposition === "RESUMABLE") {
      return implementationDeliveryRequiredResult(
        task,
        parsedInvocation,
        classification,
        { terminal: true },
      );
    }
    if (classification.disposition === "BLOCKED") {
      return deliveryEvidenceBlockedResult(task, classification, parsedInvocation);
    }
    const immutableTerminal = isImmutableTerminalTaskContractVersion(
      task.contractVersion,
    );
    const correctionIntent =
      immutableTerminal &&
      Boolean(parsedInvocation.overrideText?.trim()) &&
      overrideClassification !== "NO_TASK_OVERRIDE";
    const correctionRoute = '$kyw-task "<correction outcome>"';
    return Object.freeze({
      outcome: "TERMINAL",
      route: parsedInvocation.route,
      code: correctionIntent
        ? "TASK_CORRECTION_REQUIRES_NEW_TASK"
        : "TASK_COMPLETE",
      message: immutableTerminal
        ? correctionIntent
          ? `Task ${task.id} is canonically delivered and its terminal Task/Test pair is immutable. Use ${correctionRoute}; the new correction Task must hard-depend on Task ${task.id}.`
          : `Task ${task.id} is canonically delivered; this invocation is report-only and the immutable terminal Task/Test pair remains unchanged. Later corrections use ${correctionRoute} with a hard dependency on Task ${task.id}.`
        : `Task ${task.id} is repository-complete and required delivery is satisfied.`,
      task: taskSummary(task),
      deliveryDisposition: "SATISFIED",
      deliveryClassification: classification.classification,
      actualHeadEvidence: classification.actualHead,
      mergeCompatibilityEvidence: classification.mergeCompatibility,
      postMergeEvidence: classification.postMerge,
      mutationRequired: false,
      overrideText: parsedInvocation.overrideText,
      overrideScope: parsedInvocation.overrideScope,
      overrideClassification,
      ...(immutableTerminal
        ? {
            terminalPairImmutable: true,
            correctionRoute,
            correctionDependencyTaskId: task.id,
          }
        : {}),
    });
  }
  if (blockedTask(task)) {
    return blockedResult(
      "TASK_BLOCKED",
      `Task ${task.id} is BLOCKED: ${task.blocker}`,
      { task: taskSummary(task) },
    );
  }
  if (cancelledTask(task)) {
    const dependencyBlockers = selectionBlockers(task, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult(
        "UNSATISFIED_DEPENDENCY",
        dependencyBlockers.join("; "),
        { task: taskSummary(task) },
      );
    }
    return Object.freeze({
      outcome: "TERMINAL",
      route: parsedInvocation.route,
      code: "TASK_CANCELLED",
      message: `Task ${task.id} is CANCELLED and required delivery is satisfied.`,
      task: taskSummary(task),
    });
  }
  return blockedResult(
    "TASK_NOT_SELECTABLE",
    `Task ${task.id} is not selectable (${task.taskStatus}/${task.testStatus}).`,
    { task: taskSummary(task) },
  );
}

function automaticTerminalResult(currentTasks, byId, deliveryState, parsedInvocation) {
  const frontier = currentTasks.at(-1);
  const incomplete = currentTasks.find((task) => !completeTask(task));
  if (incomplete) {
    if (blockedTask(incomplete)) {
      const frontierBlocked = incomplete.id === frontier.id;
      return blockedResult(
        frontierBlocked ? "QUEUE_FRONTIER_BLOCKED" : "QUEUE_TRANSITION_BLOCKED",
        frontierBlocked
          ? `Task ${incomplete.id} is the current queue frontier and is BLOCKED: ${incomplete.blocker}`
          : `Task ${incomplete.id} is BLOCKED and the current queue is not complete: ${incomplete.blocker}`,
        { task: taskSummary(incomplete) },
      );
    }
    if (cancelledTask(incomplete)) {
      return terminalTaskResult(incomplete, byId, deliveryState, parsedInvocation);
    }
    return blockedResult(
      "NO_SELECTABLE_TASK",
      `No READY or active Task exists; current Task ${incomplete.id} is ${incomplete.taskStatus}/${incomplete.testStatus}.`,
      { task: taskSummary(incomplete) },
    );
  }

  for (const task of currentTasks) {
    const dependencyBlockers = selectionBlockers(task, byId, deliveryState);
    if (dependencyBlockers.length > 0) {
      return blockedResult("UNSATISFIED_DEPENDENCY", dependencyBlockers.join("; "), {
        task: taskSummary(task),
      });
    }
    const classification = deliveryClassification(task, deliveryState);
    if (classification.disposition === "RESUMABLE") {
      return implementationDeliveryRequiredResult(
        task,
        parsedInvocation,
        classification,
      );
    }
    if (classification.disposition === "BLOCKED") {
      return deliveryEvidenceBlockedResult(task, classification, parsedInvocation);
    }
  }

  return Object.freeze({
    outcome: "NO_WORK",
    code: "ALL_TASKS_COMPLETE",
    message: ALL_TASKS_COMPLETE_MESSAGE,
    task: taskSummary(frontier),
    deliveryDisposition: "SATISFIED",
    mutationRequired: false,
  });
}

function exactDeliveryResult(
  task,
  active,
  currentTasks,
  byId,
  deliveryState,
  parsedInvocation,
) {
  const publicRelease = isPublicReleaseInvocation(parsedInvocation);
  if (active.length === 1 && active[0].id !== task.id) {
    return publicReleaseResult(
      blockedResult(
        "ANOTHER_TASK_ACTIVE",
        `Task ${active[0].id} is active; Task ${task.id} cannot be delivered while implementation is active.`,
        { route: "DELIVERY", task: taskSummary(active[0]) },
      ),
      parsedInvocation,
    );
  }
  if (!completeTask(task)) {
    return publicReleaseResult(
      blockedResult(
        "TASK_NOT_DELIVERABLE",
        `Task ${task.id} is not repository-complete (${task.taskStatus}/${task.testStatus}); $kyw-deliver accepts only DONE/PASSED Tasks.`,
        { route: "DELIVERY", task: taskSummary(task), mutationRequired: false },
      ),
      parsedInvocation,
    );
  }
  if (task.deliveryRequirement.kind !== "STANDARD") {
    return publicReleaseResult(
      blockedResult(
        "DELIVERY_NOT_REQUIRED",
        `Task ${task.id} declares reasoned NONE delivery; $kyw-deliver applies only to STANDARD delivery.`,
        { route: "DELIVERY", task: taskSummary(task), mutationRequired: false },
      ),
      parsedInvocation,
    );
  }
  const blockers = queueSelectionBlockers(
    task,
    currentTasks,
    byId,
    deliveryState,
  );
  if (blockers.length > 0) {
    return publicReleaseResult(
      selectionBlockedResult(task, blockers, parsedInvocation),
      parsedInvocation,
    );
  }
  const classification = deliveryClassification(task, deliveryState);
  if (classification.disposition === "RESUMABLE") {
    return selectedResult(task, parsedInvocation, "DELIVER", classification);
  }
  if (classification.disposition === "BLOCKED") {
    return publicReleaseResult(
      deliveryEvidenceBlockedResult(task, classification, parsedInvocation),
      parsedInvocation,
      { authorized: true },
    );
  }
  if (publicRelease) {
    const entry = deliveryState.ledger?.[task.id];
    const expectation = deliveryState.expectations?.[task.id];
    const finalHardenedGraph =
      entry?.schemaVersion === 2 &&
      entry?.claim === "FINAL" &&
      expectation?.deliveryContract?.kind === "HARDENED_EXACT_HEAD" &&
      classification.classification === "HARDENED_EXACT_HEAD" &&
      classification.actualHead === "VERIFIED" &&
      classification.mergeCompatibility === "VERIFIED_SYNTHETIC" &&
      classification.postMerge === "VERIFIED_EXACT_CHECKOUT";
    if (!finalHardenedGraph) {
      return publicReleaseResult(
        blockedResult(
          "PUBLIC_RELEASE_STANDARD_FINAL_REQUIRED",
          `Task ${task.id} public release requires a freshly evaluator-satisfied HARDENED_EXACT_HEAD FINAL graph with exact post-main evidence.`,
          {
            route: "DELIVERY",
            task: taskSummary(task),
            deliveryDisposition: "BLOCKED",
            deliveryClassification: classification.classification,
            actualHeadEvidence: classification.actualHead,
            mergeCompatibilityEvidence: classification.mergeCompatibility,
            postMergeEvidence: classification.postMerge,
            mutationRequired: false,
          },
        ),
        parsedInvocation,
        { authorized: true },
      );
    }
    return selectedResult(
      task,
      parsedInvocation,
      "PUBLIC_RELEASE",
      classification,
    );
  }
  return terminalTaskResult(
    task,
    byId,
    deliveryState,
    parsedInvocation,
    "NO_TASK_OVERRIDE",
  );
}

export async function resolveTaskDispatch({
  tasksRoot,
  invocation,
  managedRoutingAvailable = false,
  deliveryLedger = {},
  deliveryExpectations = {},
  executionPreflight = {},
  parsedInvocation: suppliedParsedInvocation,
}) {
  const parsedInvocation =
    suppliedParsedInvocation ??
    parseTaskInvocation(invocation, { managedRoutingAvailable });
  if (!parsedInvocation.recognized) {
    if (parsedInvocation.route === "DELIVERY") {
      return Object.freeze({
        outcome: "NOT_TASK_INVOCATION",
        code: "NO_ANCHORED_DELIVERY_COMMAND",
        message: "$kyw-deliver accepts only the exact form $kyw-deliver NNNN.",
        route: "DELIVERY",
        mutationRequired: false,
      });
    }
    return Object.freeze({
      outcome: "NOT_TASK_INVOCATION",
      code: "NO_ANCHORED_IMPLEMENTATION_COMMAND",
      message:
        'kyw-impl executes only an existing Task. Use $kyw-task "<outcome>" to author a new Task/Test pair set.',
      mutationRequired: false,
    });
  }
  if (parsedInvocation.mode === "FALLBACK_REQUIRED") {
    return Object.freeze({
      outcome: "FALLBACK_REQUIRED",
      code: "MANAGED_ROUTING_UNAVAILABLE",
      message: parsedInvocation.message,
      portableFallback: parsedInvocation.portableFallback,
    });
  }

  const preflight = evaluateTaskExecutionPreflight(executionPreflight);
  if (!preflight.safe) {
    return blockedResult("PREFLIGHT_BLOCKED", preflight.issues.join("; "), {
      preflightIssues: preflight.issues,
    });
  }

  const queue = await inspectTaskQueue(tasksRoot);
  if (queue.errors.length > 0) {
    return blockedResult(
      "INVALID_TASK_QUEUE",
      `Task queue validation failed:\n- ${queue.errors.join("\n- ")}`,
      { errors: queue.errors },
    );
  }

  const byId = new Map(queue.tasks.map((task) => [task.id, task]));
  const deliveryState = Object.freeze({
    ledger: deliveryLedger,
    expectations: deliveryExpectations,
  });
  const active = queue.tasks.filter(activeTask);
  if (active.length > 1) {
    return blockedResult(
      "MULTIPLE_ACTIVE_TASKS",
      `Multiple active Tasks fail closed: ${active.map((task) => task.id).join(", ")}`,
      { taskIds: Object.freeze(active.map((task) => task.id)) },
    );
  }

  if (parsedInvocation.mode === "EXACT") {
    const task = byId.get(parsedInvocation.taskId);
    if (!task) {
      return blockedResult(
        "TASK_NOT_FOUND",
        `No Task directory exists for ${parsedInvocation.taskId}. Use $kyw-task "<outcome>" to author a new Task/Test pair set; kyw-impl never allocates one.`,
      );
    }
    if (parsedInvocation.route === "DELIVERY") {
      return exactDeliveryResult(
        task,
        active,
        queue.currentTasks,
        byId,
        deliveryState,
        parsedInvocation,
      );
    }
    if (active.length === 1 && active[0].id !== task.id) {
      return blockedResult(
        "ANOTHER_TASK_ACTIVE",
        `Task ${active[0].id} is active; Task ${task.id} cannot start concurrently.`,
        { task: taskSummary(active[0]) },
      );
    }
    if (activeTask(task)) {
      const blockers = queueSelectionBlockers(
        task,
        queue.currentTasks,
        byId,
        deliveryState,
      );
      return blockers.length === 0
        ? selectedResult(task, parsedInvocation)
        : selectionBlockedResult(task, blockers, parsedInvocation);
    }
    if (readyTask(task)) {
      const blockers = queueSelectionBlockers(
        task,
        queue.currentTasks,
        byId,
        deliveryState,
      );
      return blockers.length === 0
        ? selectedResult(task, parsedInvocation)
        : selectionBlockedResult(task, blockers, parsedInvocation);
    }
    if (draftTask(task)) {
      return blockedResult(
        "DRAFT_AUTHORING_REQUIRED",
        `Task ${task.id} is DRAFT/DRAFT. Use $kyw-task ${task.id} to complete or promote its authoring; kyw-impl does not author or execute a DRAFT pair.`,
        { task: taskSummary(task), mutationRequired: false },
      );
    }
    if (blockedTask(task)) {
      const blockers = queueSelectionBlockers(
        task,
        queue.currentTasks,
        byId,
        deliveryState,
      );
      return blockers.length === 0
        ? selectedResult(task, parsedInvocation)
        : selectionBlockedResult(task, blockers, parsedInvocation);
    }
    if (completeTask(task)) {
      const blockers = queueSelectionBlockers(
        task,
        queue.currentTasks,
        byId,
        deliveryState,
      );
      if (blockers.length > 0) {
        return selectionBlockedResult(task, blockers, parsedInvocation);
      }
    }
    return terminalTaskResult(
      task,
      byId,
      deliveryState,
      parsedInvocation,
      preflight.overrideClassification,
    );
  }

  if (active.length === 1) {
    const task = active[0];
    const blockers = queueSelectionBlockers(
      task,
      queue.currentTasks,
      byId,
      deliveryState,
    );
    return blockers.length === 0
      ? selectedResult(task, parsedInvocation)
      : selectionBlockedResult(task, blockers, parsedInvocation);
  }

  if (queue.currentTasks.length === 0) {
    return blockedResult(
      "CURRENT_QUEUE_UNAVAILABLE",
      "No current-contract Task queue exists. Select an existing Task with $kyw-impl NNNN.",
    );
  }

  const deliveryCandidates = queue.currentTasks
    .filter(
      (task) => completeTask(task) && task.deliveryRequirement.kind === "STANDARD",
    )
    .sort((left, right) => left.number - right.number);
  const unavailableDelivery = [];
  for (const task of deliveryCandidates) {
    const classification = deliveryClassification(task, deliveryState);
    if (classification.disposition === "SATISFIED") {
      continue;
    }
    if (classification.disposition === "BLOCKED") {
      return deliveryEvidenceBlockedResult(task, classification, parsedInvocation);
    }
    const blockers = queueSelectionBlockers(
      task,
      queue.currentTasks,
      byId,
      deliveryState,
    );
    if (blockers.length === 0) {
      return implementationDeliveryRequiredResult(
        task,
        parsedInvocation,
        classification,
      );
    }
    unavailableDelivery.push(`Task ${task.id}: ${blockers.join("; ")}`);
  }
  if (unavailableDelivery.length > 0) {
    return blockedResult(
      "QUEUE_TRANSITION_BLOCKED",
      unavailableDelivery.join("\n"),
      { blockers: Object.freeze(unavailableDelivery) },
    );
  }

  const ready = queue.currentTasks.filter(readyTask).sort((left, right) => left.number - right.number);
  const unavailable = [];
  for (const task of ready) {
    const blockers = queueSelectionBlockers(
      task,
      queue.currentTasks,
      byId,
      deliveryState,
    );
    if (blockers.length === 0) {
      return selectedResult(task, parsedInvocation);
    }
    unavailable.push(`Task ${task.id}: ${blockers.join("; ")}`);
  }
  if (unavailable.length > 0) {
    return blockedResult("NO_DEPENDENCY_SATISFIED_TASK", unavailable.join("\n"), {
      blockers: Object.freeze(unavailable),
    });
  }

  return automaticTerminalResult(
    queue.currentTasks,
    byId,
    deliveryState,
    parsedInvocation,
  );
}

export async function allocateNextTaskId(tasksRoot) {
  const inventory = await inspectTaskDirectories(tasksRoot);
  if (inventory.malformed.length > 0 || inventory.conflicts.length > 0) {
    throw taskLayoutError(inventory);
  }
  if (inventory.maxId >= MAX_TASK_NUMBER) {
    throw new TaskArtifactError(
      "TASK_ID_EXHAUSTED",
      `Cannot allocate after Task ${formatTaskId(MAX_TASK_NUMBER)}; four-digit Task IDs are exhausted`,
    );
  }
  return formatTaskId(inventory.maxId + 1);
}

export const allocateNextTaskNumber = allocateNextTaskId;
