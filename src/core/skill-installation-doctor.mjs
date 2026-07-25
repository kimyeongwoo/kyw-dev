import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants as fsConstants,
  readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";

import {
  EXIT_CODES,
  INSTALL_METADATA_NAME,
  MANAGED_SKILL_NAMES,
  PACKAGE_ROOT,
  assertCanonicalRealPath,
  assertLocationLayout,
  findRepositoryRoot,
  pathState,
  resolveInstallLocation,
  resolveScopeLayout,
  resolveUserHome,
} from "./skill-installation-shared.mjs";
import {
  buildManagedSourceInventory,
  validateSkillContract,
} from "./skill-installation-inventory.mjs";
import {
  assertScopeDirectoryChain,
  directManagedContainers,
  inspectManagedInstallation,
  listManagedRootIdentityCollisions,
  listReservedArtifacts,
  readInstallMetadata,
  stateConflictSummary,
} from "./skill-installation-state.mjs";

function discoverKywSkills(skillsRoot) {
  const state = pathState(skillsRoot);
  if (!state?.isDirectory() || state.isSymbolicLink()) {
    return [];
  }
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.name.startsWith("kyw-") && (entry.isDirectory() || entry.isSymbolicLink()))
    .map((entry) => entry.name)
    .sort();
}

function doctorFinding(severity, code, message, exitCode = 0) {
  return Object.freeze({ severity, code, message, exitCode });
}

function listDoctorDirectory(directory, label, trustedRoot, findings) {
  let state;
  try {
    state = pathState(directory);
  } catch (error) {
    findings.push(
      doctorFinding(
        "error",
        "PLUGIN_CACHE_UNREADABLE",
        `Cannot inspect ${label} at ${directory}: ${error.message}`,
        EXIT_CODES.FILESYSTEM,
      ),
    );
    return undefined;
  }
  if (!state) {
    return undefined;
  }
  if (!state.isDirectory() || state.isSymbolicLink()) {
    findings.push(
      doctorFinding(
        "error",
        "UNSAFE_PLUGIN_CACHE",
        `${label} must be a real directory: ${directory}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
    return undefined;
  }
  try {
    assertCanonicalRealPath(directory, label, "RECOVERY_REQUIRED", trustedRoot);
    return readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  } catch (error) {
    findings.push(
      doctorFinding(
        "error",
        error.code === "RECOVERY_REQUIRED" ? "UNSAFE_PLUGIN_CACHE" : "PLUGIN_CACHE_UNREADABLE",
        `Cannot inspect ${label} at ${directory}: ${error.message}`,
        error.code === "RECOVERY_REQUIRED" ? EXIT_CODES.RECOVERY_REQUIRED : EXIT_CODES.FILESYSTEM,
      ),
    );
    return undefined;
  }
}

function doctorPluginDirectories(directory, label, trustedRoot, findings) {
  const entries = listDoctorDirectory(directory, label, trustedRoot, findings);
  if (!entries) {
    return [];
  }
  const directories = [];
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) {
      continue;
    }
    const child = path.join(directory, entry.name);
    if (listDoctorDirectory(child, `${label} entry ${JSON.stringify(entry.name)}`, trustedRoot, findings)) {
      directories.push(Object.freeze({ name: entry.name, path: child }));
    }
  }
  return directories;
}

function doctorInspectionRoot(directory) {
  const resolved = path.resolve(directory);
  let before;
  try {
    before = pathState(resolved);
  } catch {
    return resolved;
  }
  if (!before?.isDirectory() || before.isSymbolicLink()) {
    return resolved;
  }
  try {
    const canonical = realpathSync(resolved);
    const after = pathState(resolved);
    if (
      !after?.isDirectory() ||
      after.isSymbolicLink() ||
      before.dev !== after.dev ||
      before.ino !== after.ino
    ) {
      return resolved;
    }
    return canonical;
  } catch {
    return resolved;
  }
}

function inspectDoctorPluginCache(codexHome) {
  const findings = [];
  const sources = [];
  const resolvedCodexHome = path.resolve(codexHome);
  const inspectionCodexHome = doctorInspectionRoot(resolvedCodexHome);
  const cacheRoot = path.join(resolvedCodexHome, "plugins", "cache");
  const inspectionCacheRoot = path.join(inspectionCodexHome, "plugins", "cache");
  const codexEntries = listDoctorDirectory(inspectionCodexHome, "Codex home", undefined, findings);
  if (codexEntries) {
    const pluginsRoot = path.join(inspectionCodexHome, "plugins");
    if (listDoctorDirectory(pluginsRoot, "Codex plugins directory", inspectionCodexHome, findings)) {
      const marketplaces = doctorPluginDirectories(
        inspectionCacheRoot,
        "Codex plugin cache",
        inspectionCodexHome,
        findings,
      );
      for (const marketplace of marketplaces) {
        const plugins = doctorPluginDirectories(
          marketplace.path,
          `plugin marketplace ${JSON.stringify(marketplace.name)}`,
          inspectionCodexHome,
          findings,
        );
        for (const plugin of plugins) {
          const versions = doctorPluginDirectories(
            plugin.path,
            `plugin ${JSON.stringify(`${marketplace.name}/${plugin.name}`)}`,
            inspectionCodexHome,
            findings,
          );
          for (const version of versions) {
            const skillsRoot = path.join(version.path, "skills");
            const skillEntries = listDoctorDirectory(
              skillsRoot,
              `plugin Skills ${JSON.stringify(`${marketplace.name}/${plugin.name}@${version.name}`)}`,
              inspectionCodexHome,
              findings,
            );
            if (!skillEntries) {
              continue;
            }
            const skillNames = [];
            for (const entry of skillEntries) {
              if (!entry.name.startsWith("kyw-")) {
                continue;
              }
              skillNames.push(entry.name);
              if (!entry.isDirectory() || entry.isSymbolicLink()) {
                findings.push(
                  doctorFinding(
                    "error",
                    "MALFORMED_PLUGIN_SKILL",
                    `Plugin Skill ${JSON.stringify(entry.name)} is not a real directory at ${skillsRoot}`,
                    EXIT_CODES.INVALID_STATE,
                  ),
                );
              }
            }
            if (skillNames.length > 0) {
              sources.push(
                Object.freeze({
                  marketplace: marketplace.name,
                  plugin: plugin.name,
                  version: version.name,
                  skillsRoot: path.join(
                    resolvedCodexHome,
                    path.relative(inspectionCodexHome, skillsRoot),
                  ),
                  skillNames: Object.freeze(skillNames.sort()),
                }),
              );
            }
          }
        }
      }
    }
  }
  let available = false;
  try {
    const cacheState = pathState(inspectionCacheRoot);
    available = Boolean(codexEntries && cacheState?.isDirectory() && !cacheState.isSymbolicLink());
  } catch {
    // The preceding guarded inspection already records an unreadable cache.
  }
  return Object.freeze({
    codexHome: resolvedCodexHome,
    cacheRoot,
    available,
    sources: Object.freeze(sources),
    findings: Object.freeze(findings),
  });
}

function duplicateSkillFinding(scopes, pluginCache) {
  const sourcesBySkill = new Map();
  const addSource = (skillName, source) => {
    const sources = sourcesBySkill.get(skillName) ?? [];
    sources.push(source);
    sourcesBySkill.set(skillName, sources);
  };
  for (const scope of scopes) {
    if (!scope.available) {
      continue;
    }
    for (const skillName of scope.skillNames) {
      addSource(skillName, scope.scope);
    }
  }
  for (const source of pluginCache.sources) {
    const label = `plugin ${JSON.stringify(`${source.marketplace}/${source.plugin}@${source.version}`)}`;
    for (const skillName of source.skillNames) {
      addSource(skillName, label);
    }
  }
  const duplicates = [...sourcesBySkill.entries()]
    .filter(([, sources]) => sources.length > 1)
    .sort(([left], [right]) => left.localeCompare(right));
  if (duplicates.length === 0) {
    return undefined;
  }
  return doctorFinding(
    "error",
    "DUPLICATE_INSTALLATION",
    `Duplicate Skill sources: ${duplicates
      .map(([skillName, sources]) => `${skillName} (${sources.join(", ")})`)
      .join("; ")}`,
    EXIT_CODES.CONFLICT,
  );
}

function nearestExistingDirectory(directory) {
  let current = path.resolve(directory);
  while (!pathState(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
  return current;
}

function inspectDoctorScope(location, { currentVersion, accessChecker = accessSync } = {}) {
  const findings = [];
  try {
    assertLocationLayout(location, "RECOVERY_REQUIRED");
    assertScopeDirectoryChain(location, { errorCode: "RECOVERY_REQUIRED" });
  } catch (error) {
    findings.push(
      doctorFinding(
        "error",
        "UNSAFE_SCOPE",
        `${location.scope} scope path is unsafe: ${error.message}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
    return Object.freeze({
      scope: location.scope,
      available: true,
      skillsRoot: location.skillsRoot,
      installed: false,
      version: undefined,
      skillNames: Object.freeze([]),
      findings: Object.freeze(findings),
    });
  }
  const skills = discoverKywSkills(location.skillsRoot);
  const reserved = listReservedArtifacts(location.skillsRoot);
  const identityCollisions = listManagedRootIdentityCollisions(location.skillsRoot);
  if (identityCollisions.length > 0) {
    findings.push(
      doctorFinding(
        "error",
        "UNSAFE_MANAGED_PATH",
        `${location.scope} scope has case-colliding managed paths: ${identityCollisions.join(", ")}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
  }
  if (reserved.length > 0) {
    findings.push(
      doctorFinding(
        "error",
        "PARTIAL_INSTALL",
        `${location.scope} scope has recoverable transaction artifacts: ${reserved.join(", ")}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
  }

  let metadata;
  const metadataState = pathState(location.metadataPath);
  if (metadataState) {
    try {
      metadata = readInstallMetadata(location, { required: true });
    } catch (error) {
      findings.push(
        doctorFinding("error", error.code, error.message, error.exitCode ?? EXIT_CODES.INVALID_STATE),
      );
    }
  } else if (MANAGED_SKILL_NAMES.some((name) => skills.includes(name)) || directManagedContainers(location).length > 0) {
    findings.push(
      doctorFinding(
        "error",
        "PARTIAL_INSTALL",
        `${location.scope} scope contains kyw-dev paths without ${INSTALL_METADATA_NAME}`,
        EXIT_CODES.RECOVERY_REQUIRED,
      ),
    );
  }

  if (metadata) {
    try {
      const state = inspectManagedInstallation(location, metadata);
      const details = stateConflictSummary(state);
      if (details.length > 0) {
        findings.push(
          doctorFinding(
            "error",
            "PARTIAL_INSTALL",
            `${location.scope} scope managed state is incomplete or modified: ${details.join("; ")}`,
            state.missing.length > 0 || state.unsafe.length > 0
              ? EXIT_CODES.RECOVERY_REQUIRED
              : EXIT_CODES.INVALID_STATE,
          ),
        );
      }
    } catch (error) {
      findings.push(
        doctorFinding(
          "error",
          error.code ?? "PARTIAL_INSTALL",
          error.message,
          error.exitCode ?? EXIT_CODES.RECOVERY_REQUIRED,
        ),
      );
    }
    if (metadata.version !== currentVersion) {
      findings.push(
        doctorFinding(
          "warning",
          "VERSION_DRIFT",
          `${location.scope} scope has kyw-dev ${metadata.version}; current CLI is ${currentVersion}`,
        ),
      );
    }
  }

  for (const skillName of skills) {
    const contractErrors = validateSkillContract(path.join(location.skillsRoot, skillName), skillName, {
      errorCode: "INVALID_INSTALL_METADATA",
      trustedRoot: location.skillsRoot,
    });
    if (contractErrors.length > 0) {
      findings.push(
        doctorFinding(
          "error",
          "MALFORMED_SKILL",
          `${location.scope} scope ${skillName} is malformed: ${contractErrors.join("; ")}`,
          EXIT_CODES.INVALID_STATE,
        ),
      );
    }
  }

  const permissionTarget = nearestExistingDirectory(location.skillsRoot);
  if (permissionTarget) {
    try {
      accessChecker(permissionTarget, fsConstants.R_OK | fsConstants.W_OK);
    } catch (error) {
      findings.push(
        doctorFinding(
          "error",
          "PERMISSION_DENIED",
          `${location.scope} scope is not readable and writable at ${permissionTarget}: ${error.message}`,
          EXIT_CODES.FILESYSTEM,
        ),
      );
    }
  }

  return Object.freeze({
    scope: location.scope,
    available: true,
    skillsRoot: location.skillsRoot,
    installed: Boolean(metadata),
    version: metadata?.version,
    skillNames: Object.freeze(skills),
    findings: Object.freeze(findings),
  });
}

function defaultCommandRunner(command, args) {
  if (process.platform === "win32") {
    if (!/^[a-z0-9-]+$/i.test(command) || JSON.stringify(args) !== JSON.stringify(["--version"])) {
      throw new TypeError("Windows command detection accepts only a fixed tool name and --version");
    }
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `${command} --version`], {
      encoding: "utf8",
    });
  }
  return spawnSync(command, args, { encoding: "utf8" });
}

function detectCommand(command, commandRunner) {
  try {
    const result = commandRunner(command, ["--version"]);
    if (result?.status === 0) {
      return Object.freeze({ available: true, version: String(result.stdout ?? "").trim() || "detected" });
    }
    return Object.freeze({ available: false });
  } catch {
    return Object.freeze({ available: false });
  }
}

export function diagnoseInstallations({
  cwd = process.cwd(),
  home = resolveUserHome(),
  codexHome = path.join(home, ".codex"),
  sourceRoot = PACKAGE_ROOT,
  nodeVersion = process.versions.node,
  commandRunner = defaultCommandRunner,
  accessChecker = accessSync,
} = {}) {
  const findings = [];
  let currentVersion = "unknown";
  try {
    const inventory = buildManagedSourceInventory({ sourceRoot });
    currentVersion = inventory.version;
  } catch (error) {
    findings.push(
      doctorFinding("error", error.code ?? "INVALID_PACKAGE", error.message, EXIT_CODES.INVALID_STATE),
    );
  }

  const runtimeMajor = Number.parseInt(String(nodeVersion).split(".")[0], 10);
  if (!Number.isInteger(runtimeMajor) || runtimeMajor < 22) {
    findings.push(
      doctorFinding(
        "error",
        "UNSUPPORTED_RUNTIME",
        `Node.js 22 or newer is required; current runtime is ${nodeVersion ?? "unknown"}`,
        EXIT_CODES.UNSUPPORTED_RUNTIME,
      ),
    );
  }
  const npm = detectCommand("npm", commandRunner);
  const codex = detectCommand("codex", commandRunner);
  if (!npm.available) {
    findings.push(doctorFinding("warning", "NPM_NOT_DETECTED", "npm was not detected on PATH"));
  }
  if (!codex.available) {
    findings.push(doctorFinding("warning", "CODEX_NOT_DETECTED", "Codex was not detected on PATH"));
  }

  const scopes = [];
  let userLocation;
  try {
    userLocation = resolveInstallLocation({ scope: "user", home });
    scopes.push(inspectDoctorScope(userLocation, { currentVersion, accessChecker }));
  } catch (error) {
    const fallbackLocation = resolveScopeLayout({ scope: "user", home, repositoryRoot: undefined });
    const finding = doctorFinding(
      "error",
      "UNSAFE_SCOPE",
      `user scope could not be resolved safely: ${error.message}`,
      error.exitCode ?? EXIT_CODES.SCOPE_RESOLUTION,
    );
    scopes.push(
      Object.freeze({
        scope: "user",
        available: true,
        skillsRoot: fallbackLocation.skillsRoot,
        installed: false,
        version: undefined,
        skillNames: Object.freeze([]),
        findings: Object.freeze([finding]),
      }),
    );
  }
  let projectRoot;
  try {
    projectRoot = findRepositoryRoot(cwd);
    const projectLocation = resolveInstallLocation({
      scope: "project",
      home,
      repositoryRoot: projectRoot,
    });
    scopes.push(inspectDoctorScope(projectLocation, { currentVersion, accessChecker }));
  } catch (error) {
    if (error.code === "SCOPE_RESOLUTION_FAILED") {
      const noRepository = /^No Git repository root was found/.test(error.message);
      const scopeFindings = noRepository
        ? []
        : [
            doctorFinding(
              "error",
              "UNSAFE_SCOPE",
              `project scope could not be resolved safely: ${error.message}`,
              error.exitCode ?? EXIT_CODES.SCOPE_RESOLUTION,
            ),
          ];
      scopes.push(
        Object.freeze({
          scope: "project",
          available: false,
          skillsRoot: undefined,
          installed: false,
          version: undefined,
          skillNames: Object.freeze([]),
          findings: Object.freeze(scopeFindings),
        }),
      );
    } else {
      throw error;
    }
  }
  for (const scopeResult of scopes) {
    findings.push(...scopeResult.findings);
  }

  const pluginCache = inspectDoctorPluginCache(codexHome);
  findings.push(...pluginCache.findings);
  const duplicate = duplicateSkillFinding(scopes, pluginCache);
  if (duplicate) {
    findings.push(duplicate);
  }

  const exitCode = findings.reduce((highest, finding) => Math.max(highest, finding.exitCode ?? 0), 0);
  return Object.freeze({
    version: currentVersion,
    runtime: Object.freeze({ node: nodeVersion, npm, codex }),
    projectRoot,
    scopes: Object.freeze(scopes),
    pluginCache,
    findings: Object.freeze(findings),
    exitCode,
  });
}

export function formatDoctorReport(report) {
  const lines = [
    `kyw-dev doctor ${report.version}`,
    `Node: ${report.runtime.node}`,
    `npm: ${report.runtime.npm.available ? report.runtime.npm.version : "not detected"}`,
    `Codex: ${report.runtime.codex.available ? report.runtime.codex.version : "not detected"}`,
    "Scopes:",
  ];
  for (const scope of report.scopes) {
    if (!scope.available) {
      lines.push(
        `  ${scope.scope}: unavailable (${scope.findings.length > 0 ? "unsafe scope" : "not inside a Git repository"})`,
      );
    } else if (scope.installed) {
      lines.push(`  ${scope.scope}: ${scope.skillsRoot} (installed ${scope.version})`);
    } else {
      lines.push(`  ${scope.scope}: ${scope.skillsRoot} (not managed)`);
    }
  }
  lines.push("Plugin Skills:");
  if (report.pluginCache.sources.length === 0) {
    lines.push(`  none (${report.pluginCache.cacheRoot})`);
  } else {
    for (const source of report.pluginCache.sources) {
      lines.push(
        `  ${source.marketplace}/${source.plugin}@${source.version}: ${source.skillNames.join(", ")} (${source.skillsRoot})`,
      );
    }
  }
  lines.push("Findings:");
  if (report.findings.length === 0) {
    lines.push("  none");
  } else {
    for (const finding of report.findings) {
      lines.push(`  [${finding.severity.toUpperCase()} ${finding.code}] ${finding.message}`);
    }
  }
  lines.push(`Result: ${report.exitCode === 0 ? "healthy" : `issues found (exit ${report.exitCode})`}`);
  return `${lines.join("\n")}\n`;
}
