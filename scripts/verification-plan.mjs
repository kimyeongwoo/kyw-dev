import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const VERIFICATION_TIERS = Object.freeze({
  FOCUSED: "FOCUSED",
  STABLE: "STABLE",
  RELEASE: "RELEASE",
});

export const VERIFICATION_COMMAND_REGISTRY = Object.freeze([
  {
    id: "focused.documentation-tests",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs",
    trigger: "Documentation-only durable or instruction-surface changes.",
    leafCommandCount: 1,
  },
  {
    id: "focused.skill-tests",
    tier: VERIFICATION_TIERS.FOCUSED,
    command:
      "node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs test/<owning-skill>.test.mjs",
    trigger: "One or more packaged Skill or canonical template changes.",
    leafCommandCount: 1,
  },
  {
    id: "focused.format",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "npm run format:check",
    trigger: "Changed repository text selected by a Focused documentation or Skill plan.",
    leafCommandCount: 1,
  },
  {
    id: "focused.package-selection",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "npm run pack:check",
    trigger: "Packaged Skill or template bytes change.",
    leafCommandCount: 1,
  },
  {
    id: "focused.spec-behavioral",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures",
    trigger: "SPEC workflow behavior or its retained direct-acceptance fixtures change.",
    leafCommandCount: 1,
  },
  {
    id: "focused.audit-model",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "npm run eval:audit:smoke -- <explicit model/effort/auth/cost arguments>",
    trigger: "An acceptance contract explicitly requires model-backed audit evidence.",
    leafCommandCount: 1,
  },
  {
    id: "focused.grilling-unit",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "npm run eval:grilling:unit",
    trigger: "The deterministic grilling evaluator or its rubric changes.",
    leafCommandCount: 1,
  },
  {
    id: "focused.grilling-smoke-model",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "npm run eval:grilling:smoke -- <explicit model/effort/auth/cost arguments>",
    trigger: "An acceptance contract explicitly requires model-backed grilling evidence.",
    leafCommandCount: 1,
  },
  {
    id: "focused.grilling-compare-model",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "npm run eval:grilling:compare -- <explicit model/effort/auth/cost arguments>",
    trigger: "An acceptance contract explicitly requires a repeated model comparison.",
    leafCommandCount: 1,
  },
  {
    id: "focused.grilling-report",
    tier: VERIFICATION_TIERS.FOCUSED,
    command: "npm run eval:grilling:report -- <completed comparison directory>",
    trigger: "A completed frozen grilling comparison requires deterministic reporting.",
    leafCommandCount: 1,
  },
  {
    id: "stable.test",
    tier: VERIFICATION_TIERS.STABLE,
    command: "npm test",
    trigger: "The complete local Stable suite or a hosted Stable lane runs.",
    leafCommandCount: 1,
  },
  {
    id: "stable.lint",
    tier: VERIFICATION_TIERS.STABLE,
    command: "npm run lint",
    trigger: "The complete local Stable suite or a hosted Stable lane runs.",
    leafCommandCount: 1,
  },
  {
    id: "stable.local",
    tier: VERIFICATION_TIERS.STABLE,
    command: "npm run check",
    trigger: "Runtime, cross-cutting, unknown, or otherwise higher-risk local changes.",
    leafCommandCount: 4,
  },
  {
    id: "stable.pull-request",
    tier: VERIFICATION_TIERS.STABLE,
    command: "GitHub PR CI at the exact head SHA",
    trigger: "Every pull request, regardless of the local Focused plan.",
    leafCommandCount: 29,
  },
  {
    id: "stable.main",
    tier: VERIFICATION_TIERS.STABLE,
    command: "GitHub main CI at the exact merge SHA",
    trigger: "Every push to main after merge.",
    leafCommandCount: 29,
  },
  {
    id: "release.candidate",
    tier: VERIFICATION_TIERS.RELEASE,
    command: "npm run release:candidate",
    trigger: "One immutable real-tarball candidate must be inspected.",
    leafCommandCount: 1,
  },
  {
    id: "release.local",
    tier: VERIFICATION_TIERS.RELEASE,
    command: "npm run release:ci",
    trigger: "Release-sensitive implementation needs local Stable plus candidate regression.",
    leafCommandCount: 5,
  },
  {
    id: "release.isolation",
    tier: VERIFICATION_TIERS.RELEASE,
    command: "node ./scripts/release-gate-isolation.mjs",
    trigger: "A pre-publication candidate needs direct/plugin lifecycle and protected-state proof.",
    leafCommandCount: 1,
  },
  {
    id: "release.registry-dry-run",
    tier: VERIFICATION_TIERS.RELEASE,
    command: "npm run release:check",
    trigger: "The intended version is immediately approaching an approved publication decision.",
    leafCommandCount: 6,
  },
  {
    id: "release.published-package",
    tier: VERIFICATION_TIERS.RELEASE,
    command: "Verify the downloaded published npm package identity",
    trigger: "A separately approved publication has completed.",
    leafCommandCount: 1,
  },
]);

const registryById = new Map(VERIFICATION_COMMAND_REGISTRY.map((entry) => [entry.id, entry]));
const taskEvidencePattern = /^docs\/tasks\/\d{4}-[^/]+\/(?:TASK|TEST)\.md$/;
const skillTestNames = new Map([
  ["kyw-audit", "test/kyw-audit.test.mjs"],
  ["kyw-grilling", "test/kyw-grilling.test.mjs"],
  ["kyw-init", "test/kyw-init.test.mjs"],
  ["kyw-task", "test/kyw-task.test.mjs"],
]);

const releaseSensitiveExactPaths = new Set([
  ".codex-plugin/plugin.json",
  ".github/workflows/ci.yml",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "package.json",
  "scripts/lib/validate-foundation.mjs",
  "scripts/pack-check.mjs",
  "scripts/packed-release-check.mjs",
  "scripts/release-gate-isolation.mjs",
  "test/continuous-integration.test.mjs",
  "test/distribution.test.mjs",
  "test/release-gate-isolation.test.mjs",
]);

const documentationExactPaths = new Set([
  "AGENTS.md",
  "CODEX_PROMPTS.md",
  "README.md",
  "docs/ARCHITECTURE.md",
  "docs/SPEC.md",
]);

function commandFromRegistry(id, overrides = {}) {
  const entry = registryById.get(id);
  if (!entry) {
    throw new Error(`Unknown verification command registry ID: ${id}`);
  }
  return Object.freeze({ ...entry, ...overrides });
}

export function normalizeChangedPath(input) {
  if (typeof input !== "string" || input.length === 0 || input.includes("\0")) {
    throw new Error("Changed paths must be non-empty repository-relative strings");
  }
  let normalized = input.replaceAll("\\", "/");
  while (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.includes("//") ||
    normalized.split("/").some((segment) => segment === "" || segment === "..")
  ) {
    throw new Error(`Changed path must stay repository-relative: ${input}`);
  }
  return normalized;
}

function classifyPath(path) {
  if (
    releaseSensitiveExactPaths.has(path) ||
    path.startsWith("licenses/") ||
    path.startsWith(".github/workflows/")
  ) {
    return "release";
  }
  if (path.startsWith("skills/") || path.startsWith("templates/")) {
    return "skill";
  }
  if (
    documentationExactPaths.has(path) ||
    (path.startsWith("docs/") && path.endsWith(".md"))
  ) {
    return "documentation";
  }
  return "runtime";
}

function focusedSkillTests(paths) {
  const tests = new Set([
    "test/foundation.test.mjs",
    "test/instruction-surfaces.test.mjs",
  ]);
  for (const path of paths) {
    const skillMatch = /^skills\/([^/]+)\//.exec(path);
    if (skillMatch) {
      const testPath = skillTestNames.get(skillMatch[1]);
      if (!testPath) {
        return undefined;
      }
      tests.add(testPath);
    }
    if (path.startsWith("templates/task/")) {
      tests.add("test/template-contracts.test.mjs");
      tests.add("test/kyw-task.test.mjs");
    }
    if (path.startsWith("templates/project/")) {
      tests.add("test/template-contracts.test.mjs");
      tests.add("test/kyw-init.test.mjs");
    }
  }
  return [...tests].sort();
}

function highestChangeClass(classes) {
  if (classes.has("release")) {
    return "release";
  }
  if (classes.has("runtime")) {
    return "runtime";
  }
  if (classes.has("skill")) {
    return "skill";
  }
  return "documentation";
}

export function planVerification({ changedPaths, releaseCandidate = false } = {}) {
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) {
    throw new Error("At least one changed path is required");
  }
  const paths = [...new Set(changedPaths.map(normalizeChangedPath))].sort();
  const evidencePaths = paths.filter((path) => taskEvidencePattern.test(path));
  const riskPaths = paths.filter((path) => !taskEvidencePattern.test(path));
  const classes = new Set(riskPaths.map(classifyPath));
  let changeClass = highestChangeClass(classes);
  let commands;

  if (releaseCandidate || changeClass === "release") {
    changeClass = "release";
    commands = [commandFromRegistry("release.local")];
  } else if (changeClass === "runtime") {
    commands = [commandFromRegistry("stable.local")];
  } else if (changeClass === "skill") {
    const tests = focusedSkillTests(riskPaths);
    if (!tests) {
      changeClass = "runtime";
      commands = [commandFromRegistry("stable.local")];
    } else {
      commands = [
        commandFromRegistry("focused.skill-tests", {
          command: `node --test ${tests.join(" ")}`,
          trigger: `Changed packaged Skill/template owners: ${tests
            .filter((path) => /^test\/kyw-|template-contracts/.test(path))
            .join(", ")}`,
        }),
        commandFromRegistry("focused.format"),
        commandFromRegistry("focused.package-selection"),
      ];
    }
  } else {
    commands = [
      commandFromRegistry("focused.documentation-tests"),
      commandFromRegistry("focused.format"),
    ];
  }

  const highestTier =
    changeClass === "release"
      ? VERIFICATION_TIERS.RELEASE
      : changeClass === "runtime"
        ? VERIFICATION_TIERS.STABLE
        : VERIFICATION_TIERS.FOCUSED;
  const leafCommandCount = commands.reduce((total, command) => total + command.leafCommandCount, 0);

  return Object.freeze({
    schemaVersion: 1,
    changeClass,
    highestTier,
    releaseCandidate,
    changedPaths: Object.freeze(paths),
    evidencePaths: Object.freeze(evidencePaths),
    riskPaths: Object.freeze(riskPaths),
    commands: Object.freeze(commands),
    leafCommandCount,
    hosted: Object.freeze({
      required: true,
      stableLanes: 7,
      commandsPerStableLane: 4,
      candidateJobs: 1,
      leafCommandCount: 29,
      pullRequest: "GitHub PR CI at the exact head SHA",
      main: "GitHub main CI at the exact merge SHA",
    }),
  });
}

function usage() {
  return [
    "Usage: node ./scripts/verification-plan.mjs [--json] [--candidate] <changed-path>...",
    "",
    "Prints a conservative local verification plan; it does not execute commands or inspect Git.",
  ].join("\n");
}

function formatText(plan) {
  const lines = [
    `Verification tier: ${plan.highestTier}`,
    `Change class: ${plan.changeClass}`,
    `Local leaf commands: ${plan.leafCommandCount}`,
    `Changed paths: ${plan.changedPaths.join(", ")}`,
  ];
  if (plan.evidencePaths.length > 0) {
    lines.push(`Task evidence paths ignored for risk classification: ${plan.evidencePaths.join(", ")}`);
  }
  lines.push("Run in order:");
  plan.commands.forEach((command, index) => {
    lines.push(`${index + 1}. [${command.tier}] ${command.command}`);
  });
  lines.push(
    `Hosted Stable remains required: ${plan.hosted.stableLanes} lanes × ${plan.hosted.commandsPerStableLane} commands + ${plan.hosted.candidateJobs} candidate job = ${plan.hosted.leafCommandCount} leaf commands before the aggregate gate.`,
  );
  return lines.join("\n");
}

function runCli(argv) {
  let json = false;
  let releaseCandidate = false;
  const changedPaths = [];
  for (const argument of argv) {
    if (argument === "--json") {
      json = true;
    } else if (argument === "--candidate") {
      releaseCandidate = true;
    } else if (argument === "--help" || argument === "-h") {
      console.log(usage());
      return;
    } else if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      changedPaths.push(argument);
    }
  }
  const plan = planVerification({ changedPaths, releaseCandidate });
  console.log(json ? JSON.stringify(plan, null, 2) : formatText(plan));
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(`verification plan failed: ${error.message}`);
    console.error(usage());
    process.exitCode = 1;
  }
}
