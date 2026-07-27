import { readdirSync, realpathSync } from "node:fs";
import path from "node:path";

import {
  INSTALL_METADATA_NAME,
  INSTALL_SCHEMA_VERSION,
  LEGACY_MANAGED_SKILL_NAMES,
  MANAGED_SKILL_NAMES,
  PACKAGE_ROOT,
  SkillInstallationError,
  assertCanonicalRealPath,
  assertManagedManifest,
  hashFile,
  installationError,
  isAllowedManagedPath,
  managedManifestErrors,
  normalizeManagedPath,
  packageName,
  pathState,
  readJson,
  readRegularFile,
  semanticVersionPattern,
  sha256Pattern,
} from "./skill-installation-shared.mjs";

export function validateSkillContract(skillDirectory, skillName, { errorCode = "INVALID_PACKAGE", trustedRoot } = {}) {
  const errors = [];
  const rootState = pathState(skillDirectory);
  if (!rootState) {
    return [`${skillName} directory is missing`];
  }
  if (rootState.isSymbolicLink() || !rootState.isDirectory()) {
    return [`${skillName} must be a real directory`];
  }
  const skillPath = path.join(skillDirectory, "SKILL.md");
  const metadataPath = path.join(skillDirectory, "agents", "openai.yaml");
  const skillState = pathState(skillPath);
  const metadataState = pathState(metadataPath);
  if (!skillState?.isFile() || skillState.isSymbolicLink()) {
    errors.push(`${skillName}/SKILL.md is missing or unsafe`);
  }
  if (!metadataState?.isFile() || metadataState.isSymbolicLink()) {
    errors.push(`${skillName}/agents/openai.yaml is missing or unsafe`);
  }
  if (errors.length > 0) {
    return errors;
  }
  let skill;
  let metadata;
  try {
    skill = readRegularFile(skillPath, {
      label: `${skillName}/SKILL.md`,
      errorCode,
      trustedRoot,
      relativePath: trustedRoot ? path.relative(trustedRoot, skillPath).replaceAll("\\", "/") : undefined,
    }).toString("utf8");
    metadata = readRegularFile(metadataPath, {
      label: `${skillName}/agents/openai.yaml`,
      errorCode,
      trustedRoot,
      relativePath: trustedRoot ? path.relative(trustedRoot, metadataPath).replaceAll("\\", "/") : undefined,
    }).toString("utf8");
  } catch (error) {
    errors.push(error.message);
    return errors;
  }
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(skill)?.[1];
  if (!frontmatter) {
    errors.push(`${skillName}/SKILL.md has invalid front matter`);
  } else {
    if (!new RegExp(`^name: ${skillName}$`, "m").test(frontmatter)) {
      errors.push(`${skillName}/SKILL.md name does not match its directory`);
    }
    if (!/^description:\s+\S.{20,}$/m.test(frontmatter)) {
      errors.push(`${skillName}/SKILL.md needs a descriptive trigger boundary`);
    }
  }
  if (!metadata.includes("policy:\n  allow_implicit_invocation: false\n")) {
    errors.push(`${skillName}/agents/openai.yaml must disable implicit invocation`);
  }
  return errors;
}

function collectSourceTree(sourceDirectory, targetPrefix, sourceRoot) {
  const rootState = pathState(sourceDirectory);
  if (!rootState?.isDirectory() || rootState.isSymbolicLink()) {
    throw installationError("INVALID_PACKAGE", `Packaged source directory is missing or unsafe: ${sourceDirectory}`);
  }
  const files = [];

  function visit(directory, relativeDirectory = "") {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const sourcePath = path.join(directory, entry.name);
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const state = pathState(sourcePath);
      if (!state || entry.isSymbolicLink() || state.isSymbolicLink()) {
        throw installationError("INVALID_PACKAGE", `Packaged source must not contain symlinks: ${sourcePath}`);
      }
      if (entry.isDirectory() && state.isDirectory()) {
        assertCanonicalRealPath(sourcePath, "packaged source directory", "INVALID_PACKAGE", sourceRoot);
        visit(sourcePath, relativePath);
      } else if (entry.isFile() && state.isFile()) {
        const targetPath = normalizeManagedPath(`${targetPrefix}/${relativePath}`);
        files.push(
          Object.freeze({
            path: targetPath,
            sourcePath,
            sourceRoot,
            sourceRelativePath: path.relative(sourceRoot, sourcePath).replaceAll("\\", "/"),
            sha256: hashFile(sourcePath, {
              label: "packaged source file",
              errorCode: "INVALID_PACKAGE",
              trustedRoot: sourceRoot,
              relativePath: path.relative(sourceRoot, sourcePath).replaceAll("\\", "/"),
            }),
            mode: state.mode & 0o777,
          }),
        );
      } else {
        throw installationError("INVALID_PACKAGE", `Unsupported packaged source entry: ${sourcePath}`);
      }
    }
  }

  visit(sourceDirectory);
  return files;
}

function validatePluginPackage(sourceRoot, packageJson) {
  const pluginPath = path.join(sourceRoot, ".codex-plugin", "plugin.json");
  const pluginJson = readJson(pluginPath, "INVALID_PACKAGE", "Plugin manifest", {
    trustedRoot: sourceRoot,
    relativePath: ".codex-plugin/plugin.json",
  });
  const errors = [];
  if (packageJson.name !== packageName) {
    errors.push(`package name must be ${packageName}`);
  }
  if (!semanticVersionPattern.test(packageJson.version ?? "")) {
    errors.push(`package version is invalid: ${packageJson.version ?? "<missing>"}`);
  }
  if (pluginJson.name !== packageJson.name) {
    errors.push("plugin and package names do not match");
  }
  if (pluginJson.version !== packageJson.version) {
    errors.push("plugin and package versions do not match");
  }
  if (pluginJson.skills !== "./skills/") {
    errors.push("plugin skills path must be ./skills/");
  }
  if (errors.length > 0) {
    throw installationError("INVALID_PACKAGE", `Packaged kyw-dev metadata is invalid:\n- ${errors.join("\n- ")}`);
  }
}

export function buildManagedSourceInventory({ sourceRoot = PACKAGE_ROOT } = {}) {
  const requestedRoot = path.resolve(sourceRoot);
  const requestedState = pathState(requestedRoot);
  if (!requestedState || requestedState.isSymbolicLink() || !requestedState.isDirectory()) {
    throw installationError("INVALID_PACKAGE", `Packaged source root is missing or unsafe: ${requestedRoot}`);
  }
  let resolvedRoot;
  try {
    resolvedRoot = realpathSync(requestedRoot);
  } catch (error) {
    throw installationError("INVALID_PACKAGE", `Cannot resolve packaged source ${sourceRoot}: ${error.message}`, error);
  }
  const rootState = pathState(resolvedRoot);
  if (!rootState?.isDirectory() || rootState.isSymbolicLink()) {
    throw installationError("INVALID_PACKAGE", `Packaged source root is missing or unsafe: ${resolvedRoot}`);
  }
  const packageJson = readJson(path.join(resolvedRoot, "package.json"), "INVALID_PACKAGE", "package.json", {
    trustedRoot: resolvedRoot,
    relativePath: "package.json",
  });
  validatePluginPackage(resolvedRoot, packageJson);

  const files = [];
  for (const skillName of MANAGED_SKILL_NAMES) {
    const skillDirectory = path.join(resolvedRoot, "skills", skillName);
    const contractErrors = validateSkillContract(skillDirectory, skillName, {
      errorCode: "INVALID_PACKAGE",
      trustedRoot: resolvedRoot,
    });
    if (contractErrors.length > 0) {
      throw installationError("INVALID_PACKAGE", `Packaged Skill ${skillName} is malformed:\n- ${contractErrors.join("\n- ")}`);
    }
    files.push(...collectSourceTree(skillDirectory, skillName, resolvedRoot));
  }

  const coreMappings = [
    ["src/core/task-artifact-contract.mjs", ".kyw-dev/runtime/src/core/task-artifact-contract.mjs"],
    ["src/core/task-artifact-creation.mjs", ".kyw-dev/runtime/src/core/task-artifact-creation.mjs"],
    ["src/core/task-artifact-delivery.mjs", ".kyw-dev/runtime/src/core/task-artifact-delivery.mjs"],
    ["src/core/task-artifact-queue.mjs", ".kyw-dev/runtime/src/core/task-artifact-queue.mjs"],
    ["src/core/task-artifact-shared.mjs", ".kyw-dev/runtime/src/core/task-artifact-shared.mjs"],
    ["src/core/task-artifacts.mjs", ".kyw-dev/runtime/src/core/task-artifacts.mjs"],
    ["src/core/template-contracts.mjs", ".kyw-dev/runtime/src/core/template-contracts.mjs"],
  ];
  for (const [sourceRelative, targetRelative] of coreMappings) {
    const sourcePath = path.join(resolvedRoot, ...sourceRelative.split("/"));
    const state = pathState(sourcePath);
    if (!state?.isFile() || state.isSymbolicLink()) {
      throw installationError("INVALID_PACKAGE", `Required direct-install runtime file is missing: ${sourceRelative}`);
    }
    files.push(
      Object.freeze({
        path: targetRelative,
        sourcePath,
        sourceRoot: resolvedRoot,
        sourceRelativePath: sourceRelative,
        sha256: hashFile(sourcePath, {
          label: "packaged runtime file",
          errorCode: "INVALID_PACKAGE",
          trustedRoot: resolvedRoot,
          relativePath: sourceRelative,
        }),
        mode: state.mode & 0o777,
      }),
    );
  }
  files.push(
    ...collectSourceTree(path.join(resolvedRoot, "templates"), ".kyw-dev/runtime/templates", resolvedRoot),
  );
  files.sort((left, right) => left.path.localeCompare(right.path));

  const paths = [];
  for (const file of files) {
    if (!isAllowedManagedPath(file.path)) {
      throw installationError("INVALID_PACKAGE", `Packaged inventory escaped managed containers: ${file.path}`);
    }
    paths.push(file.path);
  }
  assertManagedManifest(paths, "Packaged inventory", "INVALID_PACKAGE");
  return Object.freeze({
    sourceRoot: resolvedRoot,
    packageName: packageJson.name,
    version: packageJson.version,
    files: Object.freeze(files),
  });
}

function timestamp(now) {
  const value = typeof now === "function" ? now() : now;
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Installation timestamp source returned an invalid date");
  }
  return date.toISOString();
}

export function createInstallMetadata({ inventory, scope, previousMetadata, now = () => new Date() }) {
  const currentTimestamp = timestamp(now);
  return Object.freeze({
    schemaVersion: INSTALL_SCHEMA_VERSION,
    packageName,
    version: inventory.version,
    scope,
    installedAt: previousMetadata?.installedAt ?? currentTimestamp,
    updatedAt: currentTimestamp,
    skills: Object.freeze(MANAGED_SKILL_NAMES.map((name) => Object.freeze({ name, path: name }))),
    files: Object.freeze(
      inventory.files.map(({ path: filePath, sha256 }) => Object.freeze({ path: filePath, sha256 })),
    ),
  });
}

export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function validateInstallMetadata(metadata, { expectedScope } = {}) {
  const errors = [];
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return ["metadata root must be an object"];
  }
  if (metadata.schemaVersion !== INSTALL_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${INSTALL_SCHEMA_VERSION}`);
  }
  if (metadata.packageName !== packageName) {
    errors.push(`packageName must be ${packageName}`);
  }
  if (!semanticVersionPattern.test(metadata.version ?? "")) {
    errors.push("version must be semantic version text");
  }
  if (!["user", "project"].includes(metadata.scope)) {
    errors.push("scope must be user or project");
  } else if (expectedScope && metadata.scope !== expectedScope) {
    errors.push(`scope ${metadata.scope} does not match requested scope ${expectedScope}`);
  }
  for (const field of ["installedAt", "updatedAt"]) {
    if (typeof metadata[field] !== "string" || Number.isNaN(Date.parse(metadata[field]))) {
      errors.push(`${field} must be an ISO timestamp`);
    }
  }

  const skillNames = [];
  if (!Array.isArray(metadata.skills)) {
    errors.push("skills must be an array");
  } else {
    for (const skill of metadata.skills) {
      if (!skill || typeof skill !== "object" || typeof skill.name !== "string" || skill.path !== skill.name) {
        errors.push("each Skill entry must contain matching name and path strings");
        continue;
      }
      skillNames.push(skill.name);
    }
    const skillListIdentity = JSON.stringify(skillNames);
    if (
      skillListIdentity !== JSON.stringify(MANAGED_SKILL_NAMES) &&
      skillListIdentity !== JSON.stringify(LEGACY_MANAGED_SKILL_NAMES)
    ) {
      errors.push(
        "skills must list exactly the current inventory " +
          `(${MANAGED_SKILL_NAMES.join(", ")}) or legacy schema-1 inventory ` +
          `(${LEGACY_MANAGED_SKILL_NAMES.join(", ")})`,
      );
    }
  }

  const filePaths = [];
  if (!Array.isArray(metadata.files) || metadata.files.length === 0) {
    errors.push("files must be a non-empty array");
  } else {
    for (const file of metadata.files) {
      if (!file || typeof file !== "object" || typeof file.path !== "string") {
        errors.push("each managed file must contain a path string");
        continue;
      }
      try {
        normalizeManagedPath(file.path);
      } catch (error) {
        errors.push(error.message);
        continue;
      }
      if (!isAllowedManagedPath(file.path)) {
        errors.push(`managed file is outside kyw-dev containers: ${file.path}`);
      }
      filePaths.push(file.path);
      if (!sha256Pattern.test(file.sha256 ?? "")) {
        errors.push(`managed file has invalid SHA-256: ${file.path}`);
      }
    }
    errors.push(...managedManifestErrors(filePaths, "managed file inventory"));
  }
  return errors;
}
