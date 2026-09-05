import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import {
  DOCUMENT_CONTRACTS,
  validateCanonicalTemplate,
} from "../../src/core/template-contracts.mjs";

export const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

export const SKILL_NAMES = [
  "kyw-grilling",
  "kyw-init",
  "kyw-task",
  "kyw-impl",
  "kyw-deliver",
  "kyw-audit",
];

export const RELEASE_METADATA = Object.freeze({
  name: "kyw-dev",
  version: "0.2.3",
  authorName: "Kim Yeongwoo",
  homepage: "https://github.com/kimyeongwoo/kyw-dev#readme",
  repositoryWebUrl: "https://github.com/kimyeongwoo/kyw-dev",
  repositoryGitUrl: "git+https://github.com/kimyeongwoo/kyw-dev.git",
  issuesUrl: "https://github.com/kimyeongwoo/kyw-dev/issues",
  nodeRange: ">=22",
  copyright: "Copyright (c) 2026 Kim Yeongwoo",
});

export const TRUSTED_PUBLISHER_EXPECTATION = Object.freeze({
  provider: "GitHub Actions",
  organizationOrUser: "kimyeongwoo",
  repository: "kyw-dev",
  repositoryFullName: "kimyeongwoo/kyw-dev",
  workflowFilename: "publish.yml",
  workflowPath: ".github/workflows/publish.yml",
  environment: "npm-production",
  allowedActions: Object.freeze(["npm publish"]),
  packageAccess: "public",
});

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
  "skills/kyw-audit/scripts/verify.mjs",
  "skills/kyw-grilling/SKILL.md",
  "skills/kyw-grilling/agents/openai.yaml",
  "skills/kyw-impl/SKILL.md",
  "skills/kyw-impl/agents/openai.yaml",
  "skills/kyw-impl/references/execution.md",
  "skills/kyw-deliver/SKILL.md",
  "skills/kyw-deliver/agents/openai.yaml",
  "skills/kyw-deliver/references/delivery.md",
  "skills/kyw-deliver/references/public-release.md",
  "skills/kyw-init/SKILL.md",
  "skills/kyw-init/agents/openai.yaml",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-task/agents/openai.yaml",
  "skills/kyw-task/scripts/task-artifacts.mjs",
  "src/cli/run.mjs",
  "src/core/ci-evidence.mjs",
  "src/core/package-info.mjs",
  "src/core/skill-installation-doctor.mjs",
  "src/core/skill-installation-inventory.mjs",
  "src/core/skill-installation-shared.mjs",
  "src/core/skill-installation-state.mjs",
  "src/core/skill-installation-transaction.mjs",
  "src/core/skill-installation.mjs",
  "src/core/task-artifact-contract.mjs",
  "src/core/task-artifact-continuity.mjs",
  "src/core/task-artifact-creation.mjs",
  "src/core/task-artifact-delivery.mjs",
  "src/core/task-artifact-hydration.mjs",
  "src/core/task-artifact-public-release.mjs",
  "src/core/task-artifact-queue.mjs",
  "src/core/task-artifact-shared.mjs",
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
  "verify:plan": "node ./scripts/verification-plan.mjs",
  check: "npm test && npm run lint && npm run format:check && npm run pack:check",
  "release:candidate": "node ./scripts/packed-release-check.mjs",
  "release:ci": "npm run check && npm run release:candidate",
  "release:check": "npm publish --dry-run --json",
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

export const PRESERVED_LEGAL_HASHES = Object.freeze({
  "THIRD_PARTY_NOTICES.md": "82731243ded9e599fe515e38aece6be97fff05c3e7cb4b13d319fbb3d631ca25",
  "licenses/mattpocock-skills-MIT.txt":
    "0e7ac423bf2c6e223b7c5b156f8cf72da49d748e56a1641402c31f22ad07dbb5",
});

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

function sameKeys(value, expected) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    sameJson(Object.keys(value).sort(), [...expected].sort())
  );
}

function validateSkill(root, skillName, errors) {
  const directory = join(root, "skills", skillName);
  const skillPath = join(directory, "SKILL.md");
  const metadataPath = join(directory, "agents", "openai.yaml");
  if (!existsSync(skillPath) || !existsSync(metadataPath)) {
    errors.push(skillName + ": Skill or metadata is missing");
    return;
  }
  const skill = readFileSync(skillPath, "utf8");
  const frontmatter = /^---\n([\s\S]*?)\n---\n/u.exec(skill)?.[1] ?? "";
  expect(frontmatter.split("\n").includes("name: " + skillName), skillName + ": invalid frontmatter name", errors);
  expect(/^description: \S.+$/mu.test(frontmatter), skillName + ": description is missing", errors);
  for (const match of skill.matchAll(/\]\((references\/[^)#]+)(?:#[^)]*)?\)/gu)) {
    expect(existsSync(join(directory, match[1])), skillName + ": missing reference " + match[1], errors);
  }
  const metadata = readFileSync(metadataPath, "utf8");
  expect(/  display_name: "[^"\n]+"/u.test(metadata), skillName + ": display name is missing", errors);
  expect(/  short_description: "[^"\n]{25,64}"/u.test(metadata), skillName + ": short description must be 25-64 characters", errors);
  expect(metadata.includes("$" + skillName), skillName + ": default prompt must mention its Skill", errors);
  expect(/policy:\n  allow_implicit_invocation: false\n/u.test(metadata), skillName + ": explicit invocation policy is missing", errors);
}

export function validateFoundation(
  root = REPOSITORY_ROOT,
) {
  const errors = [];
  const packageJson = readJson(root, "package.json", errors);
  const pluginJson = readJson(root, ".codex-plugin/plugin.json", errors);
  let publishWorkflow;
  try {
    publishWorkflow = readFileSync(
      join(root, ...TRUSTED_PUBLISHER_EXPECTATION.workflowPath.split("/")),
      "utf8",
    );
  } catch (error) {
    errors.push(`trusted publishing workflow is unreadable: ${error.message}`);
  }

  if (packageJson && pluginJson) {
    expect(packageJson.name === RELEASE_METADATA.name, "package name must be kyw-dev", errors);
    expect(packageJson.version === RELEASE_METADATA.version, "package version must be 0.2.3", errors);
    expect(packageJson.private === false, "release package must be publishable only through the explicit approval gate", errors);
    expect(sameJson(packageJson.keywords, releaseKeywords), "package release keywords changed", errors);
    expect(packageJson.homepage === RELEASE_METADATA.homepage, "package homepage must be the public repository README", errors);
    expect(
      sameJson(packageJson.repository, {
        type: "git",
        url: RELEASE_METADATA.repositoryGitUrl,
      }),
      "package repository must use the normalized public Git URL",
      errors,
    );
    expect(
      sameJson(packageJson.bugs, { url: RELEASE_METADATA.issuesUrl }),
      "package bugs URL must use the public GitHub issue tracker",
      errors,
    );
    expect(packageJson.type === "module", "package type must be module", errors);
    expect(packageJson.engines?.node === RELEASE_METADATA.nodeRange, "package must require Node.js >=22", errors);
    expect(packageJson.bin?.["kyw-dev"] === "bin/kyw-dev.mjs", "package bin path is invalid", errors);
    expect(packageJson.license === "MIT", "package license must be MIT", errors);
    expect(
      sameKeys(packageJson.author, ["name"]) && packageJson.author.name === RELEASE_METADATA.authorName,
      "package author must use the user-confirmed legal name without invented contact data",
      errors,
    );
    expect(!("maintainers" in packageJson), "registry-derived maintainers must not be guessed before publication", errors);
    expect(sameJson(packageJson.publishConfig, releasePublishConfig), "package publishConfig must target the public npm registry", errors);
    expect(sameJson(packageJson.files, PACKAGE_FILES_ALLOWLIST), "package files allowlist changed", errors);
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
      "peerDependenciesMeta",
      "bundledDependencies",
      "bundleDependencies",
    ]) {
      expect(
        !(field in packageJson),
        `release package must remain dependency free; ${field} is not allowed`,
        errors,
      );
    }

    for (const [name, command] of Object.entries(requiredScripts)) {
      expect(packageJson.scripts?.[name] === command, `package script ${name} is missing or changed`, errors);
    }
    for (const name of forbiddenLifecycleScripts) {
      expect(!(name in (packageJson.scripts ?? {})), `npm lifecycle script ${name} is not allowed`, errors);
    }

    if (publishWorkflow) {
      for (const input of [
        "expected_sha",
        "expected_version",
        "expected_tarball_bytes",
        "expected_tarball_sha256",
        "expected_tarball_shasum",
        "expected_tarball_integrity",
        "expected_packed_entries_sha256",
        "expected_prior_versions_sha256",
        "expected_prior_latest",
        "expected_signing_key_id",
      ]) {
        expect(
          publishWorkflow.includes(`      ${input}:\n`),
          `trusted publishing workflow input ${input} is missing`,
          errors,
        );
      }
      expect(
        publishWorkflow.includes("\n  workflow_dispatch:\n"),
        "trusted publishing workflow must be manual-only",
        errors,
      );
      expect(
        publishWorkflow.includes(
          `\n    environment: ${TRUSTED_PUBLISHER_EXPECTATION.environment}\n`,
        ),
        "trusted publishing workflow environment does not match npm",
        errors,
      );
      expect(
        publishWorkflow.includes(
          `test "$ACTUAL_REPOSITORY" = "${TRUSTED_PUBLISHER_EXPECTATION.repositoryFullName}"`,
        ),
        "trusted publishing workflow repository does not match npm",
        errors,
      );
      expect(
        !/\bsecrets\.|NODE_AUTH_TOKEN|NPM_TOKEN|npmAuthToken|_authToken|CANDIDATE_TARBALL|\botp\b|security[- ]key|(?:^|\n)\s*(?:run:\s*)?npm (?:login|logout|adduser|whoami|trust|token|config)\b/im.test(
          publishWorkflow,
        ),
        "trusted publishing workflow must not reference a publication credential or account-authentication path",
        errors,
      );
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
    expect(
      sameKeys(pluginJson, [
        "name",
        "version",
        "description",
        "author",
        "homepage",
        "repository",
        "license",
        "keywords",
        "skills",
        "interface",
      ]),
      "plugin manifest contains a missing or unsupported top-level field",
      errors,
    );
    expect(
      sameKeys(pluginJson.author, ["name"]) && pluginJson.author.name === packageJson.author?.name,
      "plugin author must match the user-confirmed package author without invented contact data",
      errors,
    );
    expect(pluginJson.homepage === packageJson.homepage, "plugin and package homepages must match", errors);
    expect(pluginJson.repository === RELEASE_METADATA.repositoryWebUrl, "plugin repository must use the public web URL", errors);
    expect(sameJson(pluginJson.keywords, packageJson.keywords), "plugin and package keywords must match", errors);
    expect(pluginJson.skills === "./skills/", "plugin skills path must be ./skills/", errors);
    expect(
      sameKeys(pluginJson.interface, [
        "displayName",
        "shortDescription",
        "longDescription",
        "developerName",
        "category",
        "capabilities",
        "websiteURL",
        "defaultPrompt",
      ]),
      "plugin interface contains a missing or unsupported field",
      errors,
    );
    expect(pluginJson.interface?.displayName === packageJson.name, "plugin displayName must match the product name", errors);
    expect(pluginJson.interface?.developerName === packageJson.author?.name, "plugin developerName must match the legal author", errors);
    expect(pluginJson.interface?.websiteURL === RELEASE_METADATA.repositoryWebUrl, "plugin websiteURL must use the public repository", errors);
    expect(pluginJson.interface?.category === "Productivity", "plugin category must be Productivity", errors);
    expect(
      sameJson(pluginJson.interface?.capabilities, ["Interactive", "Write"]),
      "plugin capabilities must describe the implemented workflow",
      errors,
    );
    expect(!/foundation|stub/i.test(pluginJson.description ?? ""), "plugin description must describe the implemented release", errors);
    expect(!/foundation|stub/i.test(pluginJson.interface?.longDescription ?? ""), "plugin longDescription must not describe stubs", errors);
    expect(
      Array.isArray(pluginJson.interface?.defaultPrompt) && pluginJson.interface.defaultPrompt.length === 5,
      "plugin defaultPrompt must contain the five workflow prompts",
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
  expect(license.includes(RELEASE_METADATA.copyright), "project copyright is missing", errors);

  for (const [relativePath, expectedHash] of Object.entries(PRESERVED_LEGAL_HASHES)) {
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
