import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  INSTALL_METADATA_NAME,
  MANAGED_SKILL_NAMES,
  TRANSACTION_COMPLETE_NAME,
  TRANSACTION_NAME,
  assertCanonicalRealPath,
  assertLocationLayout,
  assertRealDirectory,
  assertSafeManagedParents,
  backupPrefix,
  hashFile,
  installationError,
  pathState,
  portablePathIdentity,
  readJson,
  resolveManagedPath,
  stagePrefix,
} from "./skill-installation-shared.mjs";
import { validateInstallMetadata } from "./skill-installation-inventory.mjs";

export function readInstallMetadata(location, { required = false } = {}) {
  assertLocationLayout(location, "INVALID_INSTALL_METADATA");
  const hasSkillsRoot = assertScopeDirectoryChain(location, {
    requireSkills: required,
    errorCode: "INVALID_INSTALL_METADATA",
  });
  if (!hasSkillsRoot) {
    return undefined;
  }
  const state = pathState(location.metadataPath);
  if (!state) {
    if (required) {
      throw installationError(
        "INSTALL_NOT_FOUND",
        `No managed kyw-dev installation metadata exists at ${location.metadataPath}`,
      );
    }
    return undefined;
  }
  if (state.isSymbolicLink() || !state.isFile()) {
    throw installationError("INVALID_INSTALL_METADATA", `Installation metadata is unsafe: ${location.metadataPath}`);
  }
  const metadata = readJson(location.metadataPath, "INVALID_INSTALL_METADATA", "Installation metadata", {
    trustedRoot: location.skillsRoot,
    relativePath: INSTALL_METADATA_NAME,
  });
  const errors = validateInstallMetadata(metadata, { expectedScope: location.scope });
  if (errors.length > 0) {
    throw installationError(
      "INVALID_INSTALL_METADATA",
      `Installation metadata is malformed at ${location.metadataPath}:\n- ${errors.join("\n- ")}`,
    );
  }
  return metadata;
}

export function assertScopeDirectoryChain(
  location,
  { create = false, requireSkills = false, errorCode = "FILESYSTEM_ERROR" } = {},
) {
  assertLocationLayout(location, errorCode);
  if (!assertRealDirectory(location.baseDirectory, "Scope root", { errorCode })) {
    throw installationError(
      errorCode === "FILESYSTEM_ERROR" ? "SCOPE_RESOLUTION_FAILED" : errorCode,
      `Scope root does not exist: ${location.baseDirectory}`,
    );
  }
  for (const [directory, label] of [
    [location.agentsRoot, "Agents directory"],
    [location.skillsRoot, "Skills directory"],
  ]) {
    if (!assertRealDirectory(directory, label, { errorCode, trustedRoot: location.baseDirectory })) {
      if (!create) {
        if (requireSkills) {
          throw installationError(errorCode, `${label} does not exist: ${directory}`);
        }
        return false;
      }
      mkdirSync(directory);
      if (!assertRealDirectory(directory, label, { errorCode, trustedRoot: location.baseDirectory })) {
        throw installationError(errorCode, `${label} was not created safely: ${directory}`);
      }
    }
  }
  return true;
}

export function ensureScopeDirectories(location) {
  assertScopeDirectoryChain(location, { create: true });
}

export function knownManagedDirectories(filePaths) {
  const directories = new Set(MANAGED_SKILL_NAMES);
  directories.add(".kyw-dev");
  directories.add(".kyw-dev/runtime");
  for (const filePath of filePaths) {
    const segments = filePath.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join("/"));
    }
  }
  return directories;
}

function scanManagedContainer(
  location,
  containerPath,
  knownFiles,
  knownDirectories,
  knownPathsByIdentity,
  result,
) {
  const absoluteContainer = resolveManagedPath(location.skillsRoot, containerPath);
  const state = pathState(absoluteContainer);
  if (!state) {
    result.missingContainers.push(containerPath);
    return;
  }
  if (state.isSymbolicLink() || !state.isDirectory()) {
    result.unsafe.push(containerPath);
    return;
  }
  try {
    assertCanonicalRealPath(
      absoluteContainer,
      "managed container",
      "INVALID_INSTALL_METADATA",
      location.skillsRoot,
    );
  } catch {
    result.unsafe.push(containerPath);
    return;
  }

  function visit(directory, relativeDirectory) {
    const entries = readdirSync(directory, { withFileTypes: true });
    if (entries.length === 0 && !knownDirectories.has(relativeDirectory)) {
      result.unknown.push(`${relativeDirectory}/`);
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = `${relativeDirectory}/${entry.name}`;
      const expected = knownPathsByIdentity.get(portablePathIdentity(relative));
      if (expected !== undefined && expected !== relative) {
        result.unsafe.push(`${relative} (collides with ${expected})`);
        continue;
      }
      const entryState = pathState(absolute);
      if (!entryState) {
        result.unsafe.push(relative);
      } else if (entry.isSymbolicLink() || entryState.isSymbolicLink()) {
        if (knownFiles.has(relative) || knownDirectories.has(relative)) {
          result.unsafe.push(relative);
        } else {
          result.unknown.push(relative);
        }
      } else if (entry.isDirectory() && entryState.isDirectory()) {
        if (!knownDirectories.has(relative)) {
          result.unknown.push(`${relative}/`);
          continue;
        }
        try {
          assertCanonicalRealPath(
            absolute,
            "managed directory",
            "INVALID_INSTALL_METADATA",
            location.skillsRoot,
          );
        } catch {
          result.unsafe.push(relative);
          continue;
        }
        visit(absolute, relative);
      } else if (entry.isFile() && entryState.isFile()) {
        if (!knownFiles.has(relative)) {
          result.unknown.push(relative);
        }
      } else {
        result.unsafe.push(relative);
      }
    }
  }
  visit(absoluteContainer, containerPath);
}

export function inspectManagedInstallation(location, metadata) {
  assertLocationLayout(location, "INVALID_INSTALL_METADATA");
  assertScopeDirectoryChain(location, {
    requireSkills: true,
    errorCode: "INVALID_INSTALL_METADATA",
  });
  const metadataErrors = validateInstallMetadata(metadata, { expectedScope: location.scope });
  if (metadataErrors.length > 0) {
    throw installationError(
      "INVALID_INSTALL_METADATA",
      `Cannot inspect malformed installation metadata:\n- ${metadataErrors.join("\n- ")}`,
    );
  }
  const knownFiles = new Set(metadata.files.map((file) => file.path));
  const knownDirectories = knownManagedDirectories(knownFiles);
  const knownPathsByIdentity = new Map(
    [...knownFiles, ...knownDirectories].map((relativePath) => [portablePathIdentity(relativePath), relativePath]),
  );
  const result = {
    missing: [],
    modified: [],
    unknown: [],
    unsafe: [],
    missingContainers: [],
    existingFiles: new Map(),
  };
  result.unsafe.push(...listManagedRootIdentityCollisions(location.skillsRoot));

  for (const file of metadata.files) {
    const target = resolveManagedPath(location.skillsRoot, file.path);
    try {
      assertSafeManagedParents(location.skillsRoot, file.path, { errorCode: "INVALID_INSTALL_METADATA" });
    } catch {
      result.unsafe.push(file.path);
      continue;
    }
    const state = pathState(target);
    if (!state) {
      result.missing.push(file.path);
      continue;
    }
    if (state.isSymbolicLink() || !state.isFile()) {
      result.unsafe.push(file.path);
      continue;
    }
    let actualHash;
    try {
      actualHash = hashFile(target, {
        label: "managed file",
        errorCode: "INVALID_INSTALL_METADATA",
        trustedRoot: location.skillsRoot,
        relativePath: file.path,
      });
    } catch {
      result.unsafe.push(file.path);
      continue;
    }
    result.existingFiles.set(file.path, actualHash);
    if (actualHash !== file.sha256) {
      result.modified.push(file.path);
    }
  }

  for (const container of [...MANAGED_SKILL_NAMES, ".kyw-dev/runtime"]) {
    scanManagedContainer(
      location,
      container,
      knownFiles,
      knownDirectories,
      knownPathsByIdentity,
      result,
    );
  }
  for (const key of ["missing", "modified", "unknown", "unsafe", "missingContainers"]) {
    result[key] = [...new Set(result[key])].sort();
  }
  return result;
}

export function stateConflictSummary(state) {
  const details = [];
  for (const [label, paths] of [
    ["missing managed files", state.missing],
    ["modified managed files", state.modified],
    ["unknown files or directories", state.unknown],
    ["unsafe filesystem entries", state.unsafe],
  ]) {
    if (paths.length > 0) {
      details.push(`${label}: ${paths.join(", ")}`);
    }
  }
  return details;
}

export function listManagedRootIdentityCollisions(skillsRoot) {
  const state = pathState(skillsRoot);
  if (!state?.isDirectory() || state.isSymbolicLink()) {
    return [];
  }
  const exactNames = [
    ...MANAGED_SKILL_NAMES,
    ".kyw-dev",
    INSTALL_METADATA_NAME,
    TRANSACTION_NAME,
    TRANSACTION_COMPLETE_NAME,
  ];
  const expectedByIdentity = new Map(exactNames.map((name) => [portablePathIdentity(name), name]));
  const collisions = [];
  for (const name of readdirSync(skillsRoot)) {
    const identity = portablePathIdentity(name);
    const expected = expectedByIdentity.get(identity);
    if (expected !== undefined && name !== expected) {
      collisions.push(`${name} (collides with ${expected})`);
      continue;
    }
    for (const prefix of [stagePrefix, backupPrefix]) {
      if (identity.startsWith(portablePathIdentity(prefix)) && !name.startsWith(prefix)) {
        collisions.push(`${name} (collides with ${prefix}*)`);
      }
    }
  }
  return collisions.sort();
}

export function directManagedContainers(location) {
  return [...MANAGED_SKILL_NAMES, ".kyw-dev/runtime"].filter((relativePath) =>
    Boolean(pathState(resolveManagedPath(location.skillsRoot, relativePath))),
  );
}

export function listReservedArtifacts(skillsRoot) {
  const state = pathState(skillsRoot);
  if (!state?.isDirectory() || state.isSymbolicLink()) {
    return [];
  }
  return readdirSync(skillsRoot)
    .filter(
      (name) => {
        const identity = portablePathIdentity(name);
        return (
          identity === portablePathIdentity(TRANSACTION_NAME) ||
          identity === portablePathIdentity(TRANSACTION_COMPLETE_NAME) ||
          identity.startsWith(portablePathIdentity(stagePrefix)) ||
          identity.startsWith(portablePathIdentity(backupPrefix))
        );
      },
    )
    .sort();
}
