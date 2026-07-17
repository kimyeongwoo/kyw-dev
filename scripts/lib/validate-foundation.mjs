import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import {
  DOCUMENT_CONTRACTS,
  validateCanonicalTemplate,
} from "../../src/core/template-contracts.mjs";

export const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

export const SKILL_NAMES = ["kyw-grilling", "kyw-init", "kyw-task", "kyw-audit"];

const IMPLEMENTED_SKILL_NAMES = new Set(SKILL_NAMES);

export const PACKAGE_FILES_ALLOWLIST = [
  ".codex-plugin/",
  "bin/",
  "src/",
  "skills/",
  "templates/",
  "README.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "licenses/",
];

export const EXPECTED_TARBALL_FILES = [
  ".codex-plugin/plugin.json",
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "bin/kyw-dev.mjs",
  "licenses/mattpocock-skills-MIT.txt",
  "package.json",
  "skills/kyw-audit/SKILL.md",
  "skills/kyw-audit/agents/openai.yaml",
  "skills/kyw-audit/references/audit.md",
  "skills/kyw-grilling/SKILL.md",
  "skills/kyw-grilling/agents/openai.yaml",
  "skills/kyw-init/SKILL.md",
  "skills/kyw-init/agents/openai.yaml",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-task/agents/openai.yaml",
  "skills/kyw-task/references/execution.md",
  "skills/kyw-task/scripts/task-artifacts.mjs",
  "src/cli/run.mjs",
  "src/core/package-info.mjs",
  "src/core/skill-installation.mjs",
  "src/core/task-artifacts.mjs",
  "src/core/template-contracts.mjs",
  "templates/project/AGENTS.md",
  "templates/project/ARCHITECTURE.md",
  "templates/project/README.md",
  "templates/project/SPEC.md",
  "templates/task/TASK.md",
  "templates/task/TEST.md",
];

const requiredScripts = {
  test: "node --test",
  lint: "node ./scripts/lint.mjs",
  "format:check": "node ./scripts/format-check.mjs",
  "pack:check": "node ./scripts/pack-check.mjs",
  check: "npm test && npm run lint && npm run format:check && npm run pack:check",
  "release:check": "npm run check && npm publish --dry-run --json",
};

const releaseKeywords = [
  "codex",
  "agent-skills",
  "spec-driven-development",
  "developer-workflow",
];

const releasePublishConfig = {
  access: "public",
  registry: "https://registry.npmjs.org/",
};

const forbiddenLifecycleScripts = [
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepack",
  "postpack",
  "prepublish",
  "prepublishOnly",
  "publish",
  "postpublish",
];

const preservedLegalHashes = {
  "THIRD_PARTY_NOTICES.md": "ff43a078ac25b63b18dcdc02865baa56b5bc695fc819dd88e4d693ae25ebb873",
  "licenses/mattpocock-skills-MIT.txt":
    "0e7ac423bf2c6e223b7c5b156f8cf72da49d748e56a1641402c31f22ad07dbb5",
};

function readJson(root, relativePath, errors) {
  try {
    return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
  } catch (error) {
    errors.push(`${relativePath} is not valid JSON: ${error.message}`);
    return undefined;
  }
}

function expect(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateSkill(root, skillName, errors) {
  const skillPath = join(root, "skills", skillName, "SKILL.md");
  const metadataPath = join(root, "skills", skillName, "agents", "openai.yaml");

  expect(existsSync(skillPath), `${skillName} is missing SKILL.md`, errors);
  expect(existsSync(metadataPath), `${skillName} is missing agents/openai.yaml`, errors);

  if (!existsSync(skillPath) || !existsSync(metadataPath)) {
    return;
  }

  const skill = readFileSync(skillPath, "utf8");
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1];
  expect(Boolean(frontmatter), `${skillName}/SKILL.md has invalid front matter`, errors);

  if (frontmatter) {
    const keys = frontmatter
      .split("\n")
      .map((line) => line.match(/^([a-z_]+):/)?.[1])
      .filter(Boolean);
    expect(sameJson(keys, ["name", "description"]), `${skillName} front matter must contain only name and description`, errors);
    expect(new RegExp(`^name: ${skillName}$`, "m").test(frontmatter), `${skillName} front matter name must match its directory`, errors);
    expect(/^description: .{40,}$/m.test(frontmatter), `${skillName} needs a descriptive trigger boundary`, errors);
  }

  expect(!skill.includes("TODO"), `${skillName} contains a TODO placeholder`, errors);
  expect(skill.includes(`$${skillName}`), `${skillName} must name its explicit invocation`, errors);
  expect(skill.includes("## Inputs") || skill.includes("## Input"), `${skillName} must define its inputs`, errors);
  expect(skill.includes("mutation") || skill.includes("mutations"), `${skillName} must define a mutation boundary`, errors);

  if (IMPLEMENTED_SKILL_NAMES.has(skillName)) {
    expect(!skill.includes("is not implemented yet"), `${skillName} must not remain an unimplemented stub`, errors);
    if (skillName === "kyw-grilling") {
      expect(skill.includes("Do not create, edit, rename, move, or delete files"), `${skillName} must retain its zero-mutation boundary`, errors);
    }
    if (skillName === "kyw-init") {
      expect(skill.includes("Do not create, edit, rename, move, or delete files during inspection or interviewing"), `${skillName} must prohibit writes before confirmation`, errors);
      expect(skill.includes("Limit final mutations to:"), `${skillName} must define its four-document mutation boundary`, errors);
    }
    if (skillName === "kyw-task") {
      const adapterPath = join(root, "skills", skillName, "scripts", "task-artifacts.mjs");
      const executionReferencePath = join(root, "skills", skillName, "references", "execution.md");
      expect(skill.includes("Do not allocate an ID, run the adapter, create a directory, or write any file"), `${skillName} must apply its size gate before writes`, errors);
      expect(skill.includes("Until confirmation, keep both files `DRAFT`"), `${skillName} must retain its pre-confirmation DRAFT boundary`, errors);
      expect(skill.includes("resume(task-id)"), `${skillName} must route numeric Task resume`, errors);
      expect(skill.includes("[Task Execution and Resume](references/execution.md)"), `${skillName} must link its execution reference`, errors);
      expect(existsSync(executionReferencePath), `${skillName} is missing its execution reference`, errors);
      if (existsSync(executionReferencePath)) {
        const executionReference = readFileSync(executionReferencePath, "utf8");
        expect(executionReference.includes("## Contents"), `${skillName} execution reference must provide navigation`, errors);
        expect(executionReference.includes("READY` / `READY` to `IN_PROGRESS` / `RUNNING"), `${skillName} must define the execution transition`, errors);
        expect(executionReference.includes("Do not edit another numbered Task"), `${skillName} must enforce the current-Task boundary`, errors);
        expect(executionReference.includes("Never use `DONE` or `PASSED` with an unexecuted required test"), `${skillName} must block unsupported terminal success`, errors);
        expect(executionReference.includes("Persist a compaction or interruption checkpoint"), `${skillName} must define a compaction handoff`, errors);
        expect(executionReference.includes("Perform the final diff coverage review"), `${skillName} must define final coverage review`, errors);
      }
      expect(existsSync(adapterPath), `${skillName} is missing its deterministic Task adapter`, errors);
      if (existsSync(adapterPath)) {
        const adapter = readFileSync(adapterPath, "utf8");
        expect(adapter.includes("../../../src/core/task-artifacts.mjs"), `${skillName} adapter must delegate to the core artifact helper`, errors);
        expect(adapter.includes("../../.kyw-dev/runtime/src/core/task-artifacts.mjs"), `${skillName} adapter must support the managed direct-install runtime`, errors);
        expect(!adapter.includes("writeFile"), `${skillName} adapter must not duplicate core file-writing logic`, errors);
      }
    }
    if (skillName === "kyw-audit") {
      const auditReferencePath = join(root, "skills", skillName, "references", "audit.md");
      expect(skill.includes("[Independent Task Audit](references/audit.md)"), `${skillName} must link its audit reference`, errors);
      expect(skill.includes("Start read-only"), `${skillName} must start with a read-only inspection boundary`, errors);
      expect(skill.includes("implement an out-of-scope finding"), `${skillName} must prohibit out-of-scope repairs`, errors);
      expect(skill.includes("exactly one final verdict: `PASS` or `BLOCKED`"), `${skillName} must define its terminal verdicts`, errors);
      expect(existsSync(auditReferencePath), `${skillName} is missing its audit reference`, errors);
      if (existsSync(auditReferencePath)) {
        const auditReference = readFileSync(auditReferencePath, "utf8");
        expect(auditReference.includes("## Contents"), `${skillName} audit reference must provide navigation`, errors);
        expect(auditReference.includes("Assign findings stable sequential IDs `F-01`, `F-02`"), `${skillName} must define stable finding IDs`, errors);
        expect(auditReference.includes("Confirm that each criterion maps to at least one matrix row"), `${skillName} must audit acceptance traceability`, errors);
        expect(auditReference.includes("Treat a `PASS` row as a claim"), `${skillName} must distinguish claimed and reproducible evidence`, errors);
        expect(auditReference.includes("An out-of-scope implementation is an open `scope` error"), `${skillName} must block scope drift`, errors);
        expect(auditReference.includes("Rerun the affected acceptance-specific check"), `${skillName} must rerun checks after repairs`, errors);
        expect(auditReference.includes("Return `PASS` only when all of these gates hold"), `${skillName} must define an evidence-based PASS gate`, errors);
      }
    }
  } else {
    expect(skill.includes("is not implemented yet"), `${skillName} must report its unimplemented state`, errors);
    expect(skill.includes("Do not inspect or modify any files"), `${skillName} must prohibit inspection and mutation`, errors);
    expect(skill.includes("Do not create, edit, rename, move, or delete files"), `${skillName} must define a zero-mutation boundary`, errors);
    expect(skill.includes("Stop immediately"), `${skillName} must define its stub stop condition`, errors);
  }

  const metadata = readFileSync(metadataPath, "utf8");
  expect(metadata.includes("interface:\n"), `${skillName} metadata is missing interface`, errors);
  expect(/  display_name: "[^"]+"/.test(metadata), `${skillName} metadata is missing a quoted display_name`, errors);
  expect(/  short_description: "[^"]{25,64}"/.test(metadata), `${skillName} short_description must be 25-64 characters`, errors);
  expect(metadata.includes(`default_prompt: "Use $${skillName} `), `${skillName} default_prompt must mention the Skill`, errors);
  expect(metadata.includes("policy:\n  allow_implicit_invocation: false\n"), `${skillName} must disable implicit invocation`, errors);
  expect(!metadata.includes("dependencies:"), `${skillName} must not declare tool dependencies`, errors);
}

export function validateFoundation(root = REPOSITORY_ROOT) {
  const errors = [];
  const packageJson = readJson(root, "package.json", errors);
  const pluginJson = readJson(root, ".codex-plugin/plugin.json", errors);

  if (packageJson && pluginJson) {
    expect(packageJson.name === "kyw-dev", "package name must be kyw-dev", errors);
    expect(packageJson.version === "0.1.0", "package version must be 0.1.0", errors);
    expect(packageJson.private === false, "release package must be publishable only through the explicit approval gate", errors);
    expect(sameJson(packageJson.keywords, releaseKeywords), "package release keywords changed", errors);
    expect(packageJson.type === "module", "package type must be module", errors);
    expect(packageJson.engines?.node === ">=22", "package must require Node.js >=22", errors);
    expect(packageJson.bin?.["kyw-dev"] === "bin/kyw-dev.mjs", "package bin path is invalid", errors);
    expect(packageJson.license === "MIT", "package license must be MIT", errors);
    expect(packageJson.author?.name === "kyw-dev", "package author must be kyw-dev", errors);
    expect(sameJson(packageJson.publishConfig, releasePublishConfig), "package publishConfig must target the public npm registry", errors);
    expect(sameJson(packageJson.files, PACKAGE_FILES_ALLOWLIST), "package files allowlist changed", errors);
    expect(!("dependencies" in packageJson), "production dependencies are not allowed in Task 0001", errors);
    expect(!("devDependencies" in packageJson), "development dependencies are not allowed in Task 0001", errors);

    for (const [name, command] of Object.entries(requiredScripts)) {
      expect(packageJson.scripts?.[name] === command, `package script ${name} is missing or changed`, errors);
    }
    for (const name of forbiddenLifecycleScripts) {
      expect(!(name in (packageJson.scripts ?? {})), `npm lifecycle script ${name} is not allowed`, errors);
    }

    const executable = readFileSync(join(root, "bin/kyw-dev.mjs"), "utf8");
    expect(
      executable.startsWith("#!/usr/bin/env node\n"),
      "package bin entry must start with the Node.js shebang",
      errors,
    );

    expect(pluginJson.name === packageJson.name, "plugin and package names must match", errors);
    expect(pluginJson.version === packageJson.version, "plugin and package versions must match", errors);
    expect(pluginJson.license === packageJson.license, "plugin and package licenses must match", errors);
    expect(pluginJson.author?.name === "kyw-dev", "plugin author must be kyw-dev", errors);
    expect(pluginJson.skills === "./skills/", "plugin skills path must be ./skills/", errors);
    expect(pluginJson.interface?.developerName === "kyw-dev", "plugin developerName must be kyw-dev", errors);
    expect(pluginJson.interface?.category === "Productivity", "plugin category must be Productivity", errors);
    expect(
      sameJson(pluginJson.interface?.capabilities, ["Interactive", "Write"]),
      "plugin capabilities must describe the implemented workflow",
      errors,
    );
    expect(!/foundation|stub/i.test(pluginJson.description ?? ""), "plugin description must describe the implemented release", errors);
    expect(!/foundation|stub/i.test(pluginJson.interface?.longDescription ?? ""), "plugin longDescription must not describe stubs", errors);
    expect(
      Array.isArray(pluginJson.interface?.defaultPrompt) && pluginJson.interface.defaultPrompt.length === 3,
      "plugin defaultPrompt must contain the three release workflows",
      errors,
    );
    for (const prompt of pluginJson.interface?.defaultPrompt ?? []) {
      expect(typeof prompt === "string" && prompt.length <= 128, "plugin default prompts must be strings of at most 128 characters", errors);
    }
    for (const field of ["mcpServers", "apps", "hooks"]) {
      expect(!(field in pluginJson), `plugin field ${field} is out of scope`, errors);
    }
  }

  for (const skillName of SKILL_NAMES) {
    validateSkill(root, skillName, errors);
  }

  const marketplaceJson = readJson(
    root,
    "test/fixtures/distribution/marketplace-root/.agents/plugins/marketplace.json",
    errors,
  );
  if (marketplaceJson) {
    expect(marketplaceJson.name === "kyw-dev-local", "release marketplace name must be kyw-dev-local", errors);
    expect(
      marketplaceJson.interface?.displayName === "kyw-dev Local",
      "release marketplace display name is invalid",
      errors,
    );
    expect(Array.isArray(marketplaceJson.plugins) && marketplaceJson.plugins.length === 1, "release marketplace must contain one plugin", errors);
    const marketplacePlugin = marketplaceJson.plugins?.[0];
    expect(marketplacePlugin?.name === "kyw-dev", "release marketplace plugin name must be kyw-dev", errors);
    expect(
      sameJson(marketplacePlugin?.source, { source: "local", path: "./plugins/kyw-dev" }),
      "release marketplace must use the isolated local plugin path",
      errors,
    );
    expect(
      sameJson(marketplacePlugin?.policy, {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL",
      }),
      "release marketplace policy is invalid",
      errors,
    );
    expect(marketplacePlugin?.category === "Productivity", "release marketplace category is invalid", errors);
  }

  for (const [kind, contract] of Object.entries(DOCUMENT_CONTRACTS)) {
    const relativePath = `templates/${contract.relativePath}`;
    const templatePath = join(root, "templates", contract.relativePath);
    expect(existsSync(templatePath), `${relativePath} is missing`, errors);
    if (existsSync(templatePath)) {
      errors.push(...validateCanonicalTemplate(kind, readFileSync(templatePath, "utf8")));
    }
  }

  const license = existsSync(join(root, "LICENSE")) ? readFileSync(join(root, "LICENSE"), "utf8") : "";
  expect(license.startsWith("MIT License\n"), "project LICENSE must contain the MIT text", errors);
  expect(license.includes("Copyright (c) 2026 kyw-dev"), "project copyright is missing", errors);

  for (const [relativePath, expectedHash] of Object.entries(preservedLegalHashes)) {
    if (!existsSync(join(root, relativePath))) {
      errors.push(`${relativePath} is missing`);
      continue;
    }
    const actualHash = createHash("sha256").update(readFileSync(join(root, relativePath))).digest("hex");
    expect(actualHash === expectedHash, `${relativePath} changed from the preserved upstream notice`, errors);
  }

  return errors;
}

export function assertFoundation(root = REPOSITORY_ROOT) {
  const errors = validateFoundation(root);
  if (errors.length > 0) {
    throw new Error(`Foundation validation failed:\n- ${errors.join("\n- ")}`);
  }
}
