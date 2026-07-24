import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  VERIFICATION_COMMAND_REGISTRY,
  VERIFICATION_TIERS,
  normalizeChangedPath,
  planVerification,
} from "../scripts/verification-plan.mjs";

const scriptPath = fileURLToPath(new URL("../scripts/verification-plan.mjs", import.meta.url));
const readRepositoryText = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");

test("verification commands have one tier, trigger, and unique registry identity", () => {
  const ids = new Set();
  const commands = new Set();
  const tiers = new Set(Object.values(VERIFICATION_TIERS));
  for (const entry of VERIFICATION_COMMAND_REGISTRY) {
    assert.equal(ids.has(entry.id), false, `duplicate registry ID: ${entry.id}`);
    assert.equal(commands.has(entry.command), false, `duplicate command: ${entry.command}`);
    assert.equal(tiers.has(entry.tier), true, `unsupported tier: ${entry.tier}`);
    assert.match(entry.trigger, /\S/);
    assert.equal(Number.isInteger(entry.leafCommandCount) && entry.leafCommandCount > 0, true);
    ids.add(entry.id);
    commands.add(entry.command);
  }
  assert.deepEqual(tiers, new Set(["FOCUSED", "STABLE", "RELEASE"]));

  for (const entryPoint of [
    "npm test",
    "npm run lint",
    "npm run format:check",
    "npm run pack:check",
    "npm run check",
    "npm run eval:audit:smoke",
    "npm run eval:grilling:unit",
    "npm run eval:grilling:smoke",
    "npm run eval:grilling:compare",
    "npm run eval:grilling:report",
    "npm run release:candidate",
    "npm run release:ci",
    "npm run release:check",
  ]) {
    assert.equal(
      [...commands].some((command) => command.startsWith(entryPoint)),
      true,
      `unowned verification entry point: ${entryPoint}`,
    );
  }
});

test("documentation and Skill changes receive smaller focused plans", () => {
  const documentation = planVerification({
    changedPaths: [
      "README.md",
      "docs/SPEC.md",
      "docs/tasks/0035-verification-tiering/TASK.md",
      "docs/tasks/0035-verification-tiering/TEST.md",
    ],
  });
  assert.equal(documentation.changeClass, "documentation");
  assert.equal(documentation.highestTier, "FOCUSED");
  assert.equal(documentation.leafCommandCount, 2);
  assert.deepEqual(
    documentation.commands.map(({ command }) => command),
    [
      "node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs",
      "npm run format:check",
    ],
  );
  assert.equal(documentation.evidencePaths.length, 2);

  const skill = planVerification({
    changedPaths: [
      "skills/kyw-task/SKILL.md",
      "skills/kyw-task/references/execution.md",
      "docs/tasks/0035-verification-tiering/TEST.md",
    ],
  });
  assert.equal(skill.changeClass, "skill");
  assert.equal(skill.highestTier, "FOCUSED");
  assert.equal(skill.leafCommandCount, 3);
  assert.match(skill.commands[0].command, /test\/kyw-task\.test\.mjs/);
  assert.deepEqual(
    skill.commands.slice(1).map(({ command }) => command),
    ["npm run format:check", "npm run pack:check"],
  );
});

test("runtime, mixed, unknown, and release-sensitive paths escalate conservatively", () => {
  for (const changedPaths of [
    ["src/core/task-artifacts.mjs"],
    ["README.md", "test/task-artifacts.test.mjs"],
    ["unclassified/config.custom"],
  ]) {
    const plan = planVerification({ changedPaths });
    assert.equal(plan.changeClass, "runtime");
    assert.equal(plan.highestTier, "STABLE");
    assert.equal(plan.leafCommandCount, 4);
    assert.deepEqual(plan.commands.map(({ command }) => command), ["npm run check"]);
  }

  const release = planVerification({ changedPaths: ["package.json"] });
  assert.equal(release.changeClass, "release");
  assert.equal(release.highestTier, "RELEASE");
  assert.equal(release.leafCommandCount, 5);
  assert.deepEqual(release.commands.map(({ command }) => command), ["npm run release:ci"]);

  const mixedRelease = planVerification({
    changedPaths: ["skills/kyw-task/SKILL.md", "package.json"],
  });
  assert.equal(mixedRelease.changeClass, "release");
});

test("candidate intent only escalates without duplicating a separate isolation boundary", () => {
  const candidate = planVerification({
    changedPaths: ["README.md"],
    releaseCandidate: true,
  });
  assert.equal(candidate.changeClass, "release");
  assert.equal(candidate.highestTier, "RELEASE");
  assert.equal(candidate.leafCommandCount, 5);
  assert.deepEqual(candidate.commands.map(({ command }) => command), ["npm run release:ci"]);
  assert.deepEqual(candidate.hosted, {
    required: true,
    stableLanes: 7,
    commandsPerStableLane: 4,
    candidateJobs: 1,
    leafCommandCount: 29,
    pullRequest: "GitHub PR CI at the exact head SHA",
    main: "GitHub main CI at the exact merge SHA",
  });
});

test("template owners stay focused while an unknown packaged Skill fails closed to Stable", () => {
  const taskTemplate = planVerification({ changedPaths: ["templates/task/TASK.md"] });
  assert.equal(taskTemplate.changeClass, "skill");
  assert.match(taskTemplate.commands[0].command, /test\/template-contracts\.test\.mjs/);
  assert.match(taskTemplate.commands[0].command, /test\/kyw-task\.test\.mjs/);

  const projectTemplate = planVerification({ changedPaths: ["templates/project/AGENTS.md"] });
  assert.equal(projectTemplate.changeClass, "skill");
  assert.match(projectTemplate.commands[0].command, /test\/template-contracts\.test\.mjs/);
  assert.match(projectTemplate.commands[0].command, /test\/kyw-init\.test\.mjs/);

  const unknownSkill = planVerification({ changedPaths: ["skills/unknown/SKILL.md"] });
  assert.equal(unknownSkill.changeClass, "runtime");
  assert.deepEqual(unknownSkill.commands.map(({ command }) => command), ["npm run check"]);
});

test("Task evidence alone stays focused and duplicate path inputs collapse deterministically", () => {
  const plan = planVerification({
    changedPaths: [
      "docs/tasks/0035-verification-tiering/TASK.md",
      "docs/tasks/0035-verification-tiering/TASK.md",
      "docs/tasks/0035-verification-tiering/TEST.md",
    ],
  });
  assert.equal(plan.changeClass, "documentation");
  assert.equal(plan.highestTier, "FOCUSED");
  assert.equal(plan.changedPaths.length, 2);
  assert.equal(plan.riskPaths.length, 0);
  assert.equal(plan.evidencePaths.length, 2);
});

test("changed paths fail closed before classification", () => {
  assert.equal(normalizeChangedPath(".\\skills\\kyw-task\\SKILL.md"), "skills/kyw-task/SKILL.md");
  for (const invalid of [
    "",
    "docs/\0SPEC.md",
    "/tmp/file",
    "C:\\temp\\file",
    "../README.md",
    "docs/../README.md",
    "docs//SPEC.md",
  ]) {
    assert.throws(() => normalizeChangedPath(invalid), /repository-relative|non-empty/);
  }
  assert.throws(() => normalizeChangedPath(42), /non-empty/);
  assert.throws(() => planVerification({ changedPaths: [] }), /At least one changed path/);
});

test("CLI emits a reproducible JSON plan and rejects missing input", () => {
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--json", "skills/kyw-task/SKILL.md"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.changeClass, "skill");
  assert.equal(plan.leafCommandCount, 3);
  assert.equal(plan.hosted.leafCommandCount, 29);

  const missing = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /At least one changed path is required/);

  const help = spawnSync(process.execPath, [scriptPath, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node \.\/scripts\/verification-plan\.mjs/);

  const unknown = spawnSync(process.execPath, [scriptPath, "--unknown", "README.md"], {
    encoding: "utf8",
  });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Unknown option: --unknown/);
});

test("permanent, Task, package, and hosted surfaces keep the tier contract aligned", () => {
  const specification = readRepositoryText("docs/SPEC.md");
  const architecture = readRepositoryText("docs/ARCHITECTURE.md");
  const readme = readRepositoryText("README.md");
  const execution = readRepositoryText("skills/kyw-task/references/execution.md");
  const workflow = readRepositoryText(".github/workflows/ci.yml");
  const packageJson = JSON.parse(readRepositoryText("package.json"));

  assert.match(specification, /### Verification tiers[\s\S]*\*\*Focused\*\*[\s\S]*\*\*Stable\*\*[\s\S]*\*\*Release\*\*/);
  assert.match(architecture, /## 11\.6 Verification tier planner/);
  assert.match(architecture, /Immutable candidate archive[\s\S]*release:candidate/);
  assert.match(readme, /npm run verify:plan -- <changed-path>/);
  assert.match(execution, /Classify verification proportionally; use the repository planner/);

  assert.equal(packageJson.scripts["verify:plan"], "node ./scripts/verification-plan.mjs");
  assert.equal(packageJson.scripts["release:candidate"], "node ./scripts/packed-release-check.mjs");
  assert.equal(packageJson.scripts["release:ci"], "npm run check && npm run release:candidate");
  assert.equal((workflow.match(/run: npm run release:candidate/g) ?? []).length, 1);
  assert.equal((workflow.match(/run: npm run release:ci/g) ?? []).length, 0);
  for (const command of ["npm test", "npm run lint", "npm run format:check", "npm run pack:check"]) {
    assert.equal((workflow.match(new RegExp(`run: ${command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g")) ?? []).length, 1);
  }
});
