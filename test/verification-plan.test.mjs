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

function assertCommandRegistryContract(registry) {
  const ids = new Set();
  const commands = new Set();
  const tiers = new Set(Object.values(VERIFICATION_TIERS));
  for (const entry of registry) {
    assert.equal(ids.has(entry.id), false, `duplicate registry ID: ${entry.id}`);
    assert.equal(commands.has(entry.command), false, `duplicate command: ${entry.command}`);
    assert.equal(tiers.has(entry.tier), true, `unsupported tier: ${entry.tier}`);
    assert.match(entry.trigger, /\S/);
    assert.equal(Number.isInteger(entry.leafCommandCount) && entry.leafCommandCount > 0, true);
    assert.doesNotMatch(
      `${entry.id}\n${entry.command}\n${entry.trigger}`,
      /release\.(?:isolation|registry-dry-run)|release:check|release-evidence-(?:manual-runner|harness)\.mjs|release-gate-isolation\.mjs/i,
    );
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
  ]) {
    assert.equal(
      [...commands].some((command) => command.startsWith(entryPoint)),
      true,
      `unowned verification entry point: ${entryPoint}`,
    );
  }

  assert.deepEqual(
    registry
      .filter(({ tier }) => tier === VERIFICATION_TIERS.RELEASE)
      .map(({ id, command, leafCommandCount }) => ({ id, command, leafCommandCount })),
    [
      {
        id: "release.candidate",
        command: "npm run release:candidate",
        leafCommandCount: 1,
      },
      {
        id: "release.local",
        command: "npm run release:ci",
        leafCommandCount: 5,
      },
      {
        id: "release.published-package",
        command: "Verify the downloaded published npm package identity",
        leafCommandCount: 1,
      },
    ],
  );
}

test("verification commands have one tier, trigger, and unique registry identity", () => {
  assertCommandRegistryContract(VERIFICATION_COMMAND_REGISTRY);
});

test("verification registry rejects retired release command layers", () => {
  for (const staleEntry of [
    {
      id: "release.isolation",
      tier: VERIFICATION_TIERS.RELEASE,
      command: "node ./scripts/release-gate-isolation.mjs",
      trigger: "Retired isolation layer",
      leafCommandCount: 1,
    },
    {
      id: "stable.reintroduced-registry-dry-run",
      tier: VERIFICATION_TIERS.STABLE,
      command: "npm run release:check",
      trigger: "Retired mandatory registry dry run",
      leafCommandCount: 1,
    },
    {
      id: "focused.reintroduced-release-runner",
      tier: VERIFICATION_TIERS.FOCUSED,
      command: "node ./scripts/release-evidence-manual-runner.mjs --run",
      trigger: "Retired release runner",
      leafCommandCount: 1,
    },
  ]) {
    assert.throws(() =>
      assertCommandRegistryContract([...VERIFICATION_COMMAND_REGISTRY, staleEntry]),
    );
  }
});

test("documentation and Skill changes receive smaller focused plans", () => {
  const documentation = planVerification({
    changedPaths: [
      "README.md",
      "docs/SPEC.md",
      "docs/ARCHITECTURE.md",
      "docs/tasks/0055-compact-permanent-documents-and-add-growth-guard/TASK.md",
      "docs/tasks/0055-compact-permanent-documents-and-add-growth-guard/TEST.md",
    ],
  });
  assert.equal(documentation.changeClass, "documentation");
  assert.equal(documentation.highestTier, "FOCUSED");
  assert.equal(documentation.leafCommandCount, 2);
  assert.deepEqual(documentation.riskPaths, [
    "README.md",
    "docs/ARCHITECTURE.md",
    "docs/SPEC.md",
  ]);
  assert.deepEqual(documentation.evidencePaths, [
    "docs/tasks/0055-compact-permanent-documents-and-add-growth-guard/TASK.md",
    "docs/tasks/0055-compact-permanent-documents-and-add-growth-guard/TEST.md",
  ]);
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
      "skills/kyw-impl/references/execution.md",
      "docs/tasks/0035-verification-tiering/TEST.md",
    ],
  });
  assert.equal(skill.changeClass, "skill");
  assert.equal(skill.highestTier, "FOCUSED");
  assert.equal(skill.leafCommandCount, 3);
  assert.match(skill.commands[0].command, /test\/kyw-task\.test\.mjs/);
  assert.match(skill.commands[0].command, /test\/kyw-impl\.test\.mjs/);
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
    ["skills/kyw-task/scripts/task-artifacts.mjs"],
    ["skills/kyw-task/scripts/check.ps1"],
    ["skills/kyw-audit/scripts/check.py"],
    ["templates/task/tool.sh"],
    ["docs/component/AGENTS.md"],
    [{ path: "docs/new.md", status: "A" }],
    [{ path: "skills/kyw-task/SKILL.md", status: "D" }],
    [{ path: "docs/renamed.md", previousPath: "src/core/adapter.mjs", status: "R100" }],
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

  const foundationValidator = planVerification({
    changedPaths: ["scripts/lib/validate-foundation.mjs"],
  });
  assert.equal(foundationValidator.changeClass, "release");
  assert.equal(foundationValidator.highestTier, "RELEASE");
  assert.equal(foundationValidator.leafCommandCount, 5);
  assert.deepEqual(foundationValidator.commands.map(({ command }) => command), [
    "npm run release:ci",
  ]);

  const mixedRelease = planVerification({
    changedPaths: ["skills/kyw-task/SKILL.md", "package.json"],
  });
  assert.equal(mixedRelease.changeClass, "release");
  assert.deepEqual(mixedRelease.commands.map(({ command }) => command), ["npm run release:ci"]);

  for (const changedPath of [
    ".github/workflows/ci.yml",
    ".github/workflows/publish.yml",
    "scripts/publish-gate.mjs",
    "scripts/ci-plan.mjs",
    "src/core/ci-evidence.mjs",
    "scripts/packed-release-check.mjs",
    "test/continuous-integration.test.mjs",
    "test/distribution.test.mjs",
    "test/publish-workflow.test.mjs",
  ]) {
    const trustedPublishing = planVerification({ changedPaths: [changedPath] });
    assert.equal(trustedPublishing.changeClass, "release");
    assert.equal(trustedPublishing.highestTier, "RELEASE");
    assert.deepEqual(
      trustedPublishing.commands.map(({ command }) => command),
      ["npm run release:ci"],
    );
  }

  for (const changedPath of [
    "scripts/release-evidence-harness.mjs",
    "scripts/release-evidence-manual-runner.mjs",
    "scripts/release-gate-isolation.mjs",
    "test/release-evidence-harness.test.mjs",
    "test/release-evidence-manual-runner.test.mjs",
    "test/release-gate-isolation.test.mjs",
  ]) {
    const retiredLayer = planVerification({ changedPaths: [changedPath] });
    assert.equal(retiredLayer.changeClass, "runtime");
    assert.equal(retiredLayer.highestTier, "STABLE");
    assert.deepEqual(retiredLayer.commands.map(({ command }) => command), ["npm run check"]);
  }
});

test("AGENTS and known Markdown instructions select behavior owners, not guidance-only checks", () => {
  const plan = planVerification({ changedPaths: ["AGENTS.md"] });
  assert.equal(plan.changeClass, "skill");
  assert.equal(plan.hosted.profile, "instruction");
  assert.match(plan.commands[0].command, /test\/kyw-impl.test.mjs/);
  assert.match(plan.commands[0].command, /test\/kyw-deliver.test.mjs/);
  assert.throws(() => planVerification({ changedPaths: [{ path: "docs/a.md", status: "R100" }] }), /previous/);
});

test("candidate intent selects the single composite Release command", () => {
  const candidate = planVerification({
    changedPaths: ["README.md"],
    releaseCandidate: true,
  });
  assert.equal(candidate.changeClass, "release");
  assert.equal(candidate.highestTier, "RELEASE");
  assert.equal(candidate.leafCommandCount, 5);
  assert.deepEqual(candidate.commands.map(({ command }) => command), ["npm run release:ci"]);
  assert.equal(candidate.hosted.profile, "release");
  assert.equal(candidate.hosted.behavioralLanes, 7);
  assert.equal(candidate.hosted.required, true);
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

  const implementationSkill = planVerification({
    changedPaths: ["skills/kyw-impl/SKILL.md"],
  });
  assert.equal(implementationSkill.changeClass, "skill");
  assert.match(implementationSkill.commands[0].command, /test\/kyw-impl\.test\.mjs/);

  const deliverySkill = planVerification({
    changedPaths: ["skills/kyw-deliver/references/delivery.md"],
  });
  assert.equal(deliverySkill.changeClass, "skill");
  assert.match(deliverySkill.commands[0].command, /test\/kyw-deliver\.test\.mjs/);
  assert.match(deliverySkill.commands[0].command, /test\/task-public-release\.test\.mjs/);

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
    [scriptPath, "--json", "skills/kyw-impl/SKILL.md"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.changeClass, "skill");
  assert.equal(plan.leafCommandCount, 3);
  assert.match(plan.commands[0].command, /test\/kyw-impl\.test\.mjs/);
  assert.equal(plan.hosted.profile, "instruction");
  assert.equal(plan.hosted.behavioralLanes, 0);

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
  const workflow = readRepositoryText(".github/workflows/ci.yml");
  const packageJson = JSON.parse(readRepositoryText("package.json"));

  assert.equal(packageJson.scripts.test, "node --test");
  assert.equal(packageJson.scripts["verify:plan"], "node ./scripts/verification-plan.mjs");
  assert.equal(packageJson.scripts["release:candidate"], "node ./scripts/packed-release-check.mjs");
  assert.equal(packageJson.scripts["release:ci"], "npm run check && npm run release:candidate");
  for (const ordinaryTestPath of [
    "test/foundation.test.mjs",
    "test/instruction-surfaces.test.mjs",
  ]) {
    assert.match(ordinaryTestPath, /^test\/[^/]+\.test\.mjs$/);
    assert.match(readRepositoryText(ordinaryTestPath), /from "node:test"/);
  }
  assert.equal((workflow.match(/- name: Test\s+run: npm test/g) ?? []).length, 1);
  assert.equal((workflow.match(/run: npm run release:candidate/g) ?? []).length, 1);
  assert.equal((workflow.match(/run: npm run release:ci/g) ?? []).length, 0);
  assert.match(workflow, /^  behavioral:\s*$/mu);
  assert.match(workflow, /^  quality:\s*$/mu);
  assert.match(workflow, /^  merge-compatibility:\s*$/mu);
  for (const command of [
    "npm test",
    "npm run lint",
    "npm run format:check",
    "npm run pack:check",
    "npm run check",
  ]) {
    assert.equal(
      (
        workflow.match(
          new RegExp(`run: ${command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"),
        ) ?? []
      ).length,
      1,
    );
  }
});
