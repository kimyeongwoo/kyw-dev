import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
  "kyw-audit",
];

const IMPLEMENTED_SKILL_NAMES = new Set(SKILL_NAMES);

export const RELEASE_METADATA = Object.freeze({
  name: "kyw-dev",
  version: "0.1.3",
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
  "skills/kyw-grilling/SKILL.md",
  "skills/kyw-grilling/agents/openai.yaml",
  "skills/kyw-impl/SKILL.md",
  "skills/kyw-impl/agents/openai.yaml",
  "skills/kyw-impl/references/execution.md",
  "skills/kyw-init/SKILL.md",
  "skills/kyw-init/agents/openai.yaml",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-task/agents/openai.yaml",
  "skills/kyw-task/scripts/task-artifacts.mjs",
  "src/cli/run.mjs",
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

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

const pattern = (source, flags = "m") => ({ source, flags });

export const PERMANENT_DOCUMENT_POLICY = deepFreeze({
  schemaVersion: 1,
  documents: [
    {
      path: "README.md",
      templatePath: "templates/project/README.md",
      role: "setup-usage-and-contributor-entry",
      warningBytes: 20_480,
      hardBytes: 24_576,
      requiredHeadings: [
        pattern("^# kyw-dev$"),
        pattern("^## Start here$"),
        pattern("^## Installation details$"),
        pattern("^## Development$"),
      ],
    },
    {
      path: "AGENTS.md",
      templatePath: "templates/project/AGENTS.md",
      role: "repository-wide-codex-rules",
      warningBytes: 4_096,
      hardBytes: 8_192,
      requiredHeadings: [
        pattern("^# kyw-dev Repository Rules$"),
        pattern("^## Truth and context loading$"),
        pattern("^## Scope and routing$"),
        pattern("^## Evidence and completion$"),
      ],
    },
    {
      path: "docs/SPEC.md",
      templatePath: "templates/project/SPEC.md",
      role: "observable-product-behavior-and-acceptance",
      warningBytes: 40_960,
      hardBytes: 49_152,
      requiredHeadings: [
        pattern("^# kyw-dev Product Specification$"),
        pattern("^## .*Goals", "mi"),
        pattern("^## .*Acceptance", "mi"),
      ],
    },
    {
      path: "docs/ARCHITECTURE.md",
      templatePath: "templates/project/ARCHITECTURE.md",
      role: "system-boundaries-and-flows",
      warningBytes: 57_344,
      hardBytes: 65_536,
      requiredHeadings: [
        pattern("^# kyw-dev Architecture$"),
        pattern("^## .*System context", "mi"),
        pattern("^## .*component", "mi"),
        pattern("^## .*flow", "mi"),
        pattern("trade-offs?", "i"),
      ],
    },
  ],
  combined: {
    path: "Combined",
    role: "permanent-document-set",
    warningBytes: 114_688,
    hardBytes: 131_072,
  },
});

export const PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE = deepFreeze({
  schemaVersion: 1,
  taskId: "0055",
  targets: {
    "README.md": 18_432,
    "AGENTS.md": 4_096,
    "docs/SPEC.md": 34_816,
    "docs/ARCHITECTURE.md": 49_152,
    Combined: 106_496,
  },
  before: {
    "README.md": { bytes: 21_605, lines: 245 },
    "AGENTS.md": { bytes: 4_489, lines: 75 },
    "docs/SPEC.md": { bytes: 47_998, lines: 616 },
    "docs/ARCHITECTURE.md": { bytes: 93_002, lines: 973 },
    Combined: { bytes: 167_094, lines: 1_909 },
  },
});

export const PERMANENT_DOCUMENT_POLICY_BASELINE = deepFreeze({
  schemaVersion: 1,
  documents: [
    { path: "README.md", warningBytes: 20_480, hardBytes: 24_576 },
    { path: "AGENTS.md", warningBytes: 4_096, hardBytes: 8_192 },
    { path: "docs/SPEC.md", warningBytes: 40_960, hardBytes: 49_152 },
    { path: "docs/ARCHITECTURE.md", warningBytes: 57_344, hardBytes: 65_536 },
  ],
  combined: {
    path: "Combined",
    warningBytes: 114_688,
    hardBytes: 131_072,
  },
});

export const PERMANENT_DOCUMENT_DELTA_MARKER =
  "<!-- kyw-permanent-document-delta:v1 -->";
export const PERMANENT_DOCUMENT_BUDGET_CHANGE_MARKER =
  "<!-- kyw-permanent-document-budget-change:v1 -->";

export const REQUIRED_INSTRUCTION_RULE_FAMILY_IDS = Object.freeze([
  "five-skills-explicit-invocation",
  "grilling-procedure",
  "initialization-procedure",
  "task-authoring-procedure",
  "existing-task-execution-procedure",
  "independent-audit-procedure",
  "task-artifact-shape",
  "test-evidence-shape",
  "standard-delivery-evidence",
  "stable-system-structure",
  "installation-safety",
  "publication-authority",
  "progressive-context-loading",
  "repository-routing-and-completion",
]);

export const PERMANENT_RULE_FAMILIES = deepFreeze([
  {
    id: "five-skills-explicit-invocation",
    owner: {
      path: "docs/SPEC.md",
      anchors: [pattern("five .*Skills", "i"), pattern("explicit", "i")],
    },
    projections: [
      {
        path: "README.md",
        anchors: [pattern("All five packaged Skills disable implicit invocation")],
      },
      {
        path: "AGENTS.md",
        anchors: [pattern("All five `kyw-\\*` Skills are explicit-only")],
      },
      ...SKILL_NAMES.map((skillName) => ({
        path: `skills/${skillName}/SKILL.md`,
        anchors: [pattern(`\\$${skillName.replace("-", "\\-")}`)],
      })),
    ],
    forbiddenDetailedAnchors: [],
  },
  {
    id: "grilling-procedure",
    owner: {
      path: "skills/kyw-grilling/SKILL.md",
      anchors: [
        pattern("^## Interview protocol$"),
        pattern("ask exactly one decision question"),
        pattern("^## State and mutation boundary$"),
      ],
    },
    projections: [
      {
        path: "README.md",
        anchors: [pattern("\\$kyw-grilling"), pattern("without creating files")],
      },
      {
        path: "docs/SPEC.md",
        anchors: [pattern("detailed interview state machine belongs to")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("kyw-grilling.*conversation-only", "is")],
      },
    ],
    forbiddenDetailedAnchors: [
      pattern("Question: <one decision question>"),
      pattern("Once terminal cancellation is established"),
    ],
  },
  {
    id: "initialization-procedure",
    owner: {
      path: "skills/kyw-init/SKILL.md",
      anchors: [
        pattern("Limit final mutations to:"),
        pattern("^## Phase 1 - Inspect without writing$"),
        pattern("^## Phase 3 - Materialize the confirmed baseline$"),
      ],
    },
    projections: [
      {
        path: "README.md",
        anchors: [pattern("\\$kyw-init"), pattern("four permanent documents")],
      },
      {
        path: "docs/SPEC.md",
        anchors: [pattern("\\$kyw-init"), pattern("shared-understanding confirmation")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("### 5\\.1 Initialization")],
      },
    ],
    forbiddenDetailedAnchors: [
      pattern("templates/project/\\{README,AGENTS,SPEC,ARCHITECTURE\\}\\.md"),
      pattern("If any inspected document changed during the interview"),
    ],
  },
  {
    id: "task-authoring-procedure",
    owner: {
      path: "skills/kyw-task/SKILL.md",
      anchors: [
        pattern("This Skill owns inspection, adaptive decomposition"),
        pattern("## Publish atomically"),
      ],
    },
    projections: [
      {
        path: "README.md",
        anchors: [pattern("\\$kyw-task \"goal\".*stops", "is")],
      },
      {
        path: "docs/SPEC.md",
        anchors: [pattern("\\$kyw-task")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("kyw-task", "i")],
      },
    ],
    forbiddenDetailedAnchors: [
      pattern("Expected failure rolls back batch-owned final paths only with complete ownership proof"),
      pattern("create-batch --tasks-root"),
    ],
  },
  {
    id: "existing-task-execution-procedure",
    owner: {
      path: "skills/kyw-impl/references/execution.md",
      anchors: [
        pattern("canonical detailed execution procedure"),
        pattern("HARDENED_EXACT_HEAD"),
      ],
    },
    projections: [
      {
        path: "skills/kyw-impl/SKILL.md",
        anchors: [pattern("\\[Task Execution and Resume\\]\\(references/execution\\.md\\)")],
      },
      {
        path: "AGENTS.md",
        anchors: [pattern("Detailed procedure: `skills/kyw-impl/references/execution\\.md`")],
      },
      {
        path: "README.md",
        anchors: [pattern("\\$kyw-impl` never allocates or authors a Task")],
      },
      {
        path: "docs/SPEC.md",
        anchors: [pattern("\\$kyw-impl")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("kyw-impl", "i")],
      },
    ],
    forbiddenDetailedAnchors: [
      pattern("--delivery-expectations-json"),
      pattern("actualHead: \"UNVERIFIED\""),
      pattern("claim: \"FINAL\""),
    ],
  },
  {
    id: "independent-audit-procedure",
    owner: {
      path: "skills/kyw-audit/references/audit.md",
      anchors: [
        pattern("^# Independent Task Audit$"),
        pattern("Assign findings stable sequential IDs"),
      ],
    },
    projections: [
      {
        path: "skills/kyw-audit/SKILL.md",
        anchors: [pattern("\\[Independent Task Audit\\]\\(references/audit\\.md\\)")],
      },
      {
        path: "README.md",
        anchors: [pattern("\\$kyw-audit` is independent")],
      },
      {
        path: "docs/SPEC.md",
        anchors: [pattern("\\$kyw-audit")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("kyw-audit", "i")],
      },
    ],
    forbiddenDetailedAnchors: [
      pattern("Assign findings stable sequential IDs"),
      pattern("Before any eligible repair, send a standalone conversation message"),
    ],
  },
  {
    id: "task-artifact-shape",
    owner: {
      path: "templates/task/TASK.md",
      anchors: [
        pattern("<!-- kyw-task-contract: 3 -->"),
        pattern("^## Acceptance Criteria$"),
        pattern("^## Delivery$"),
        pattern("^## Resume Point$"),
      ],
    },
    projections: [
      {
        path: "skills/kyw-task/SKILL.md",
        anchors: [pattern("canonical Task/Test templates"), pattern("set both statuses to `READY`")],
      },
      {
        path: "skills/kyw-impl/references/execution.md",
        anchors: [pattern("Keep Plan and handoff factual")],
      },
      {
        path: "docs/SPEC.md",
        anchors: [pattern("Templates own exact shape")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("Canonical Task/Test templates own exact sections")],
      },
    ],
    forbiddenDetailedAnchors: [
      pattern("State one independently testable outcome"),
      pattern("For DONE, use `- None — repository outcome complete\\.`"),
    ],
  },
  {
    id: "test-evidence-shape",
    owner: {
      path: "templates/task/TEST.md",
      anchors: [
        pattern("^## Model Provenance$"),
        pattern("\\| ID \\| Intent / acceptance criterion \\| Method \\| Level \\| Status \\| Evidence \\|"),
        pattern("^## Final Coverage Review$"),
      ],
    },
    projections: [
      {
        path: "skills/kyw-task/SKILL.md",
        anchors: [pattern("five-field model provenance"), pattern("stable unchecked `AC-NN`")],
      },
      {
        path: "skills/kyw-impl/references/execution.md",
        anchors: [pattern("canonical five fields in `templates/task/TEST\\.md`")],
      },
      {
        path: "skills/kyw-audit/references/audit.md",
        anchors: [pattern("Confirm each row states a meaningful intent, method, level, status, and evidence")],
      },
      {
        path: "docs/SPEC.md",
        anchors: [pattern("Model-dependent evidence records the model identifier")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("Stable acceptance IDs and matrix IDs form a traceability graph")],
      },
    ],
    forbiddenDetailedAnchors: [
      pattern("not recorded yet"),
      pattern("Add one row for every acceptance criterion"),
    ],
  },
  {
    id: "standard-delivery-evidence",
    owner: {
      path: "docs/SPEC.md",
      anchors: [
        pattern("STANDARD"),
        pattern("actual PR-head|actual head", "i"),
        pattern("merge compatib", "i"),
        pattern("post-merge", "i"),
      ],
    },
    projections: [
      {
        path: "README.md",
        anchors: [
          pattern("actual PR-head"),
          pattern("synthetic merge compatibility"),
          pattern("post-merge"),
        ],
      },
      {
        path: "AGENTS.md",
        anchors: [pattern("Task/Test owns repository outcome; GitHub gates mutable delivery")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("merge compatib", "i"), pattern("post-merge", "i")],
      },
      {
        path: "skills/kyw-impl/references/execution.md",
        anchors: [
          pattern("HARDENED_EXACT_HEAD"),
          pattern("PR_MERGE_COMPATIBILITY"),
          pattern("POST_MERGE_MAIN"),
        ],
      },
    ],
    forbiddenDetailedAnchors: [],
  },
  {
    id: "stable-system-structure",
    owner: {
      path: "docs/ARCHITECTURE.md",
      anchors: [
        pattern("### Instruction authority and projections"),
        pattern("### Code dependency direction"),
        pattern("## 5\\. Control and data flows"),
      ],
    },
    projections: [
      {
        path: "README.md",
        anchors: [pattern("## Repository map and contributing"), pattern("docs/ARCHITECTURE\\.md")],
      },
      {
        path: "docs/SPEC.md",
        anchors: [pattern("docs/ARCHITECTURE\\.md` owns stable structure and boundaries")],
      },
    ],
    forbiddenDetailedAnchors: [
      pattern("one packaged Task adapter[\\s\\S]{0,120}Task artifact facade"),
    ],
  },
  {
    id: "installation-safety",
    owner: {
      path: "docs/SPEC.md",
      anchors: [
        pattern("uninstall", "i"),
        pattern("--force"),
        pattern("lifecycle scripts?", "i"),
      ],
    },
    projections: [
      {
        path: "README.md",
        anchors: [pattern("--force"), pattern("lifecycle scripts?", "i")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("Direct.*install", "is"), pattern("Plugin.*install", "is")],
      },
    ],
    forbiddenDetailedAnchors: [],
  },
  {
    id: "publication-authority",
    owner: {
      path: "docs/SPEC.md",
      anchors: [
        pattern("npm publish", "i"),
        pattern("separate explicit", "i"),
      ],
    },
    projections: [
      {
        path: "README.md",
        anchors: [
          pattern("Version `0\\.1\\.3`"),
          pattern("requires separate explicit authority"),
        ],
      },
      {
        path: "AGENTS.md",
        anchors: [pattern("Publication, registry/version/tag/Release/public submission")],
      },
      {
        path: "templates/project/AGENTS.md",
        anchors: [pattern("Publication, registry/version/tag/Release/public submission")],
      },
      {
        path: "docs/ARCHITECTURE.md",
        anchors: [pattern("Publication", "i"), pattern("separate", "i")],
      },
      {
        path: "skills/kyw-impl/SKILL.md",
        anchors: [pattern("Publication, registry/version/tag/Release/public submission")],
      },
      {
        path: "skills/kyw-impl/references/execution.md",
        anchors: [pattern("Publication/registry/version/tag/Release/public submission")],
      },
    ],
    forbiddenDetailedAnchors: [],
  },
  {
    id: "progressive-context-loading",
    owner: {
      path: "AGENTS.md",
      anchors: [
        pattern("Always load applicable `AGENTS\\.md` and the selected/current Task/Test pair"),
        pattern("Index or search README, SPEC, and ARCHITECTURE first"),
        pattern("Read all four permanent documents for `kyw-init`, rebaseline, major redesign"),
      ],
    },
    projections: [
      {
        path: "templates/project/AGENTS.md",
        anchors: [
          pattern("Always load applicable `AGENTS\\.md` and the selected/current Task/Test pair"),
          pattern("Index or search README, SPEC, and ARCHITECTURE first"),
        ],
      },
      {
        path: "skills/kyw-task/SKILL.md",
        anchors: [
          pattern("Index or search headings in `README\\.md`, `docs/SPEC\\.md`, and `docs/ARCHITECTURE\\.md`"),
          pattern("read only the owning permanent-document sections"),
        ],
      },
      {
        path: "skills/kyw-impl/references/execution.md",
        anchors: [
          pattern("Index or search headings in README, SPEC, and ARCHITECTURE"),
          pattern("read only the owning permanent-document sections"),
        ],
      },
      {
        path: "skills/kyw-audit/references/audit.md",
        anchors: [
          pattern("Index or search headings in README, SPEC, and ARCHITECTURE"),
          pattern("read only the owning permanent-document sections"),
        ],
      },
    ],
    forbiddenDetailedAnchors: [],
  },
  {
    id: "repository-routing-and-completion",
    owner: {
      path: "AGENTS.md",
      anchors: [
        pattern("Work on one Task at a time"),
        pattern("Keep one Task active"),
        pattern("Before completion, compare the final diff"),
      ],
    },
    projections: [
      {
        path: "templates/project/AGENTS.md",
        anchors: [
          pattern("Work on one Task"),
          pattern("Keep one Task active"),
          pattern("Before completion, compare diff to scope/matrix"),
        ],
      },
    ],
    forbiddenDetailedAnchors: [],
  },
]);

const PERMANENT_DOCUMENT_PATHS = PERMANENT_DOCUMENT_POLICY.documents.map(
  ({ path: relativePath }) => relativePath,
);
const EXPECTED_PROJECT_TEMPLATE_NAMES = PERMANENT_DOCUMENT_POLICY.documents
  .map(({ templatePath }) => templatePath.split("/").at(-1))
  .sort();
export const INSTRUCTION_SURFACE_PATHS = Object.freeze([
  ...PERMANENT_DOCUMENT_PATHS,
  "templates/project/AGENTS.md",
  "templates/task/TASK.md",
  "templates/task/TEST.md",
  "skills/kyw-grilling/SKILL.md",
  "skills/kyw-init/SKILL.md",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-impl/SKILL.md",
  "skills/kyw-impl/references/execution.md",
  "skills/kyw-audit/SKILL.md",
  "skills/kyw-audit/references/audit.md",
]);
const GUARDED_SURFACE_PATHS = new Set(INSTRUCTION_SURFACE_PATHS);
const FORBIDDEN_PERMANENT_MIRROR_PATHS = [
  "PLAN.md",
  "PROGRESS.md",
  "STATUS.md",
  "SUMMARY.md",
  "HANDOFF.md",
  "VERIFICATION.md",
  "TEST_PLAN.md",
  "docs/PLAN.md",
  "docs/PROGRESS.md",
  "docs/STATUS.md",
  "docs/SUMMARY.md",
  "docs/HANDOFF.md",
  "docs/VERIFICATION.md",
  "docs/TEST_PLAN.md",
];
const MUTABLE_CHRONOLOGY_PATTERNS = [
  ["numbered historical Task", /\bTask 0\d{3}\b/],
  ["numbered pull request", /\b(?:PR|pull request)\s+#?\d+\b/i],
  ["mutable Actions run identity", /\b(?:Actions )?run(?: ID)?\s+#?\d{4,}\b/i],
  ["full Git SHA", /\b[0-9a-f]{40}\b/i],
  ["historical candidate verdict", /\b(?:READY_FOR_APPROVAL|UNCHANGED at the audited point)\b/],
];
const EVIDENCE_LEAKAGE_PATTERNS = [
  [
    "Task/Test evidence heading",
    /^## (?:Commands|Results|Completed|Remaining|Resume Point|Blockers|Model Provenance|Intent-to-Test Matrix|Final Coverage Review)\s*$/m,
  ],
  ["mutable delivery evidence field", /\b(?:runId|runAttempt|actualCheckoutSha)\b/],
];
const DETAILED_PROCEDURE_PATTERNS = [
  ["internal Task adapter payload", /\bcreate-batch --tasks-root\b/],
  ["internal delivery payload", /--delivery-(?:expectations|ledger)-json/],
  ["ordered install algorithm", /^## \d+(?:\.\d+)? Atomic update strategy\s*$/m],
  [
    "development test catalog",
    /^### (?:Static validation|Unit tests|Integration fixtures|Skill contract scenarios|End-to-end release checks)\s*$/m,
  ],
  [
    "development evaluator procedure",
    /^### (?:Grilling evaluation harness|Audit behavior smoke|Direct SPEC behavioral acceptance fixtures)\s*$/m,
  ],
  ["evaluator timing constant", /\b(?:1\.5 seconds|five retries|100-millisecond)\b/],
  ["transaction hash-chain mechanics", /\b(?:hash-chained records|exclusive-create semantics)\b/],
  ["audit tokenizer mechanics", /\bSingle-quoted search data is opaque\b/],
];
const CROSS_OWNER_HEADING_PATTERNS = {
  "docs/SPEC.md": [
    [
      "ARCHITECTURE-owned structural heading",
      /^## (?:Component groups|Authority and dependency direction|Control and data flow|Architecture trade-offs)\s*$/m,
    ],
  ],
  "docs/ARCHITECTURE.md": [
    [
      "SPEC-owned product heading",
      /^## (?:Product goals|Product non-goals|Observable product behavior|Product acceptance criteria)\s*$/m,
    ],
  ],
};

function compilePattern(candidate) {
  return new RegExp(candidate.source, candidate.flags);
}

function matchesPattern(text, candidate) {
  return compilePattern(candidate).test(text);
}

function meaningfulEvidence(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !/^Not applicable(?:\s|$)/i.test(value.trim()) &&
    !/^(?:N\/A|None)$/i.test(value.trim())
  );
}

function countTextLines(text) {
  if (text.length === 0) {
    return 0;
  }
  return text.split("\n").length - Number(text.endsWith("\n"));
}

export function measurePermanentDocuments(documents) {
  const measured = {};
  let combinedBytes = 0;
  let combinedLines = 0;
  for (const relativePath of PERMANENT_DOCUMENT_PATHS) {
    const text = documents[relativePath];
    if (typeof text !== "string") {
      throw new TypeError(`Permanent document ${relativePath} must be supplied as text`);
    }
    const bytes = Buffer.byteLength(text, "utf8");
    const lines = countTextLines(text);
    measured[relativePath] = Object.freeze({ bytes, lines });
    combinedBytes += bytes;
    combinedLines += lines;
  }
  measured.Combined = Object.freeze({ bytes: combinedBytes, lines: combinedLines });
  return Object.freeze(measured);
}

export function selectPermanentDocumentEvidence(
  candidates,
  { marker = PERMANENT_DOCUMENT_DELTA_MARKER } = {},
) {
  const errors = [];
  if (!Array.isArray(candidates)) {
    return {
      selected: undefined,
      errors: ["permanent-document evidence candidates must be an array"],
    };
  }
  const marked = [];
  for (const candidate of candidates) {
    if (
      !candidate ||
      !/^\d{4}$/.test(candidate.taskId ?? "") ||
      typeof candidate.testPath !== "string" ||
      typeof candidate.markdown !== "string"
    ) {
      errors.push("permanent-document evidence candidate is malformed");
      continue;
    }
    if (candidate.markdown.includes(marker)) {
      marked.push(candidate);
    }
  }
  const active = marked.filter(
    ({ taskStatus, testStatus }) =>
      taskStatus === "IN_PROGRESS" && testStatus === "RUNNING",
  );
  if (active.length > 1) {
    errors.push("multiple active permanent-document evidence candidates exist");
  }
  const pool = active.length === 1 ? active : marked;
  const selected = [...pool].sort(
    (left, right) =>
      Number(right.taskId) - Number(left.taskId) ||
      right.testPath.localeCompare(left.testPath),
  )[0];
  return { selected, errors };
}

export function derivePermanentDocumentEvidenceBaseline(
  candidates,
  selected,
  { acceptance = PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE } = {},
) {
  const errors = [];
  if (!selected || !/^\d{4}$/.test(selected.taskId ?? "")) {
    return {
      baseline: undefined,
      previous: undefined,
      errors: ["selected permanent-document delta evidence is missing or malformed"],
    };
  }
  if (selected.taskId === acceptance.taskId) {
    return {
      baseline: acceptance.before,
      previous: undefined,
      errors,
    };
  }
  const earlier = (Array.isArray(candidates) ? candidates : [])
    .filter(
      (candidate) =>
        candidate &&
        /^\d{4}$/.test(candidate.taskId ?? "") &&
        Number(candidate.taskId) < Number(selected.taskId) &&
        typeof candidate.testPath === "string" &&
        typeof candidate.markdown === "string" &&
        candidate.markdown.includes(PERMANENT_DOCUMENT_DELTA_MARKER),
    )
    .sort(
      (left, right) =>
        Number(right.taskId) - Number(left.taskId) ||
        right.testPath.localeCompare(left.testPath),
    );
  const previous = earlier[0];
  if (!previous) {
    return {
      baseline: undefined,
      previous: undefined,
      errors: [
        `${selected.testPath} has no earlier permanent-document delta evidence baseline`,
      ],
    };
  }
  const parsed = parsePermanentDocumentDeltaEvidence(previous.markdown);
  errors.push(
    ...parsed.errors.map(
      (error) => `${previous.testPath} earlier permanent-document evidence: ${error}`,
    ),
  );
  const expectedPaths = [...PERMANENT_DOCUMENT_PATHS, "Combined"];
  expect(
    sameJson([...parsed.rows.keys()].sort(), [...expectedPaths].sort()),
    `${previous.testPath} earlier permanent-document delta rows are incomplete`,
    errors,
  );
  const baseline = {};
  for (const relativePath of expectedPaths) {
    const row = parsed.rows.get(relativePath);
    if (
      !row ||
      !Number.isSafeInteger(row.afterBytes) ||
      row.afterBytes < 0 ||
      !Number.isSafeInteger(row.afterLines) ||
      row.afterLines < 0
    ) {
      errors.push(
        `${previous.testPath} earlier ${relativePath} after bytes/lines are invalid`,
      );
      continue;
    }
    baseline[relativePath] = {
      bytes: row.afterBytes,
      lines: row.afterLines,
    };
  }
  if (Object.keys(baseline).length === expectedPaths.length) {
    const documentMeasurements = PERMANENT_DOCUMENT_PATHS.map(
      (relativePath) => baseline[relativePath],
    );
    expect(
      baseline.Combined.bytes ===
        documentMeasurements.reduce(
          (total, measurement) => total + measurement.bytes,
          0,
        ),
      `${previous.testPath} earlier Combined after bytes do not equal its document rows`,
      errors,
    );
    expect(
      baseline.Combined.lines ===
        documentMeasurements.reduce(
          (total, measurement) => total + measurement.lines,
          0,
        ),
      `${previous.testPath} earlier Combined after lines do not equal its document rows`,
      errors,
    );
  }
  return {
    baseline:
      Object.keys(baseline).length === expectedPaths.length &&
      errors.length === 0
        ? deepFreeze(baseline)
        : undefined,
    previous,
    errors,
  };
}

export function validatePermanentDocumentCompactionAcceptance({
  measurements,
  acceptance = PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE,
}) {
  const errors = [];
  for (const [relativePath, target] of Object.entries(acceptance.targets)) {
    const actual = measurements?.[relativePath]?.bytes;
    expect(
      Number.isSafeInteger(actual) && actual <= target,
      `${relativePath} one-time compaction target exceeded: ${actual ?? "missing"} > ${target}`,
      errors,
    );
  }
  return errors;
}

export function evaluatePermanentDocumentBudget(
  policyEntry,
  bytes,
  { hasGrowthEvidence = false } = {},
) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    throw new TypeError("Permanent-document byte counts must be non-negative safe integers");
  }
  if (bytes > policyEntry.hardBytes) {
    return Object.freeze({
      status: "HARD_LIMIT_EXCEEDED",
      acceptable: false,
      evidenceRequired: true,
    });
  }
  if (bytes > policyEntry.warningBytes && !hasGrowthEvidence) {
    return Object.freeze({
      status: "GROWTH_EVIDENCE_REQUIRED",
      acceptable: false,
      evidenceRequired: true,
    });
  }
  return Object.freeze({
    status:
      bytes <= policyEntry.warningBytes
        ? "WITHIN_WARNING_BUDGET"
        : "WITHIN_HARD_LIMIT_WITH_EVIDENCE",
    acceptable: true,
    evidenceRequired: bytes > policyEntry.warningBytes,
  });
}

export function requiresPermanentDocumentGrowthEvidence({
  beforeBytes,
  afterBytes,
  combined = false,
}) {
  if (
    !Number.isSafeInteger(beforeBytes) ||
    beforeBytes < 0 ||
    !Number.isSafeInteger(afterBytes) ||
    afterBytes < 0
  ) {
    throw new TypeError("Permanent-document growth inputs must be non-negative safe integers");
  }
  const increase = afterBytes - beforeBytes;
  return (
    increase > 0 &&
    (combined || increase >= 2_048 || increase * 100 >= beforeBytes * 10)
  );
}

function formatPercentage(delta, before) {
  if (before === 0) {
    return delta === 0 ? "0.00%" : "N/A";
  }
  return `${((delta * 100) / before).toFixed(2)}%`;
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return undefined;
  }
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function parseEvidenceInteger(value) {
  if (!/^[+-]?\d[\d,]*$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parsePermanentDocumentDeltaEvidence(markdown) {
  const errors = [];
  if (typeof markdown !== "string") {
    return { rows: new Map(), errors: ["permanent-document delta evidence must be Markdown text"] };
  }
  const resultsMatch = /^## Results\s*$/m.exec(markdown);
  if (!resultsMatch) {
    return { rows: new Map(), errors: ["current TEST is missing ## Results"] };
  }
  const resultsStart = resultsMatch.index + resultsMatch[0].length;
  const nextHeading = /^## [^\n]+$/m.exec(markdown.slice(resultsStart));
  const resultsEnd = nextHeading ? resultsStart + nextHeading.index : markdown.length;
  const results = markdown.slice(resultsStart, resultsEnd);
  const markerIndex = results.indexOf(PERMANENT_DOCUMENT_DELTA_MARKER);
  if (markerIndex < 0) {
    return {
      rows: new Map(),
      errors: ["current TEST Results is missing kyw-permanent-document-delta:v1 evidence"],
    };
  }

  const lines = results.slice(markerIndex + PERMANENT_DOCUMENT_DELTA_MARKER.length).split(/\r?\n/);
  const firstTableLine = lines.findIndex((line) => line.trim().startsWith("|"));
  if (firstTableLine < 0) {
    return { rows: new Map(), errors: ["permanent-document delta marker has no Markdown table"] };
  }
  const expectedHeader = [
    "Path",
    "Before bytes",
    "After bytes",
    "Before lines",
    "After lines",
    "Byte delta",
    "Percent",
    "Canonical owner",
    "Durable necessity",
    "Replacement or absorption",
  ];
  const header = splitMarkdownRow(lines[firstTableLine]);
  expect(
    sameJson(header, expectedHeader),
    `permanent-document delta header must be: ${expectedHeader.join(" | ")}`,
    errors,
  );
  const separator = splitMarkdownRow(lines[firstTableLine + 1] ?? "");
  expect(
    Array.isArray(separator) &&
      separator.length === expectedHeader.length &&
      separator.every((cell) => /^:?-{3,}:?$/.test(cell)),
    "permanent-document delta table separator is invalid",
    errors,
  );

  const rows = new Map();
  for (const line of lines.slice(firstTableLine + 2)) {
    const cells = splitMarkdownRow(line);
    if (!cells) {
      if (rows.size > 0 && line.trim().length > 0) {
        break;
      }
      continue;
    }
    if (cells.length !== expectedHeader.length) {
      errors.push("permanent-document delta row has the wrong column count");
      continue;
    }
    const rowPath = cells[0].replace(/^`|`$/g, "");
    if (rows.has(rowPath)) {
      errors.push(`permanent-document delta has duplicate row ${rowPath}`);
      continue;
    }
    rows.set(rowPath, {
      path: rowPath,
      beforeBytes: parseEvidenceInteger(cells[1]),
      afterBytes: parseEvidenceInteger(cells[2]),
      beforeLines: parseEvidenceInteger(cells[3]),
      afterLines: parseEvidenceInteger(cells[4]),
      byteDelta: parseEvidenceInteger(cells[5]),
      percent: cells[6],
      canonicalOwner: cells[7],
      durableNecessity: cells[8],
      replacementOrAbsorption: cells[9],
    });
  }
  return { rows, errors };
}

export function validatePermanentDocumentGrowthEvidence({
  markdown,
  measurements,
  baseline,
  policy = PERMANENT_DOCUMENT_POLICY,
}) {
  const expectedPaths = [...PERMANENT_DOCUMENT_PATHS, "Combined"];
  const { rows, errors } = parsePermanentDocumentDeltaEvidence(markdown);
  const effectiveBaseline =
    baseline ??
    Object.fromEntries(
      [...rows.entries()].map(([relativePath, row]) => [
        relativePath,
        { bytes: row.beforeBytes, lines: row.beforeLines },
      ]),
    );
  const actualPaths = [...rows.keys()].sort();
  expect(
    sameJson(actualPaths, [...expectedPaths].sort()),
    `permanent-document delta rows must be exactly ${expectedPaths.join(", ")}`,
    errors,
  );
  const policies = new Map([
    ...policy.documents.map((entry) => [entry.path, entry]),
    [policy.combined.path, policy.combined],
  ]);
  for (const relativePath of expectedPaths) {
    const row = rows.get(relativePath);
    const before = effectiveBaseline[relativePath];
    const after = measurements[relativePath];
    if (!row || !before || !after) {
      continue;
    }
    for (const [field, expectedValue] of [
      ["beforeBytes", before.bytes],
      ["afterBytes", after.bytes],
      ["beforeLines", before.lines],
      ["afterLines", after.lines],
    ]) {
      expect(
        row[field] === expectedValue,
        `${relativePath} delta evidence ${field} must be ${expectedValue}`,
        errors,
      );
    }
    const delta = after.bytes - before.bytes;
    expect(
      row.byteDelta === delta,
      `${relativePath} byte delta must be ${delta}`,
      errors,
    );
    expect(
      row.percent === formatPercentage(delta, before.bytes),
      `${relativePath} percentage must be ${formatPercentage(delta, before.bytes)}`,
      errors,
    );
    expect(
      typeof row.canonicalOwner === "string" && row.canonicalOwner.trim().length > 0,
      `${relativePath} delta evidence must name its canonical owner`,
      errors,
    );
    const growthRequired =
      requiresPermanentDocumentGrowthEvidence({
        beforeBytes: before.bytes,
        afterBytes: after.bytes,
        combined: relativePath === "Combined",
      }) || after.bytes > policies.get(relativePath).warningBytes;
    if (growthRequired) {
      expect(
        meaningfulEvidence(row.durableNecessity),
        `${relativePath} growth requires durable-necessity evidence`,
        errors,
      );
      expect(
        meaningfulEvidence(row.replacementOrAbsorption),
        `${relativePath} growth requires replacement/absorption evidence`,
        errors,
      );
    }
  }
  const documentRows = PERMANENT_DOCUMENT_PATHS.map((relativePath) =>
    rows.get(relativePath),
  );
  const combinedRow = rows.get("Combined");
  if (documentRows.every(Boolean) && combinedRow) {
    expect(
      combinedRow.beforeBytes ===
        documentRows.reduce((total, row) => total + row.beforeBytes, 0),
      "Combined before bytes must equal the four document rows",
      errors,
    );
    expect(
      combinedRow.beforeLines ===
        documentRows.reduce((total, row) => total + row.beforeLines, 0),
      "Combined before lines must equal the four document rows",
      errors,
    );
    expect(
      combinedRow.afterBytes ===
        documentRows.reduce((total, row) => total + row.afterBytes, 0),
      "Combined after bytes must equal the four document rows",
      errors,
    );
    expect(
      combinedRow.afterLines ===
        documentRows.reduce((total, row) => total + row.afterLines, 0),
      "Combined after lines must equal the four document rows",
      errors,
    );
  }
  return errors;
}

export function parsePermanentDocumentBudgetChangeEvidence(markdown) {
  const evidence = {};
  const errors = [];
  if (typeof markdown !== "string") {
    return { evidence, errors: ["permanent-document budget evidence must be Markdown text"] };
  }
  const resultsMatch = /^## Results\s*$/m.exec(markdown);
  if (!resultsMatch) {
    return { evidence, errors: ["current TEST is missing ## Results"] };
  }
  const resultsStart = resultsMatch.index + resultsMatch[0].length;
  const nextHeading = /^## [^\n]+$/m.exec(markdown.slice(resultsStart));
  const resultsEnd = nextHeading ? resultsStart + nextHeading.index : markdown.length;
  const results = markdown.slice(resultsStart, resultsEnd);
  const markerIndex = results.indexOf(PERMANENT_DOCUMENT_BUDGET_CHANGE_MARKER);
  if (markerIndex < 0) {
    return {
      evidence,
      errors: ["current TEST Results is missing permanent-document budget-change evidence"],
    };
  }
  const lines = results
    .slice(markerIndex + PERMANENT_DOCUMENT_BUDGET_CHANGE_MARKER.length)
    .split(/\r?\n/);
  const firstTableLine = lines.findIndex((line) => line.trim().startsWith("|"));
  const expectedHeader = [
    "Path",
    "Field",
    "Before bytes",
    "After bytes",
    "Reason existing sections cannot absorb",
    "New durable meaning",
    "Removed or replaced duplication",
    "Task acceptance",
    "User approval",
  ];
  const header = splitMarkdownRow(lines[firstTableLine] ?? "");
  expect(
    sameJson(header, expectedHeader),
    `permanent-document budget-change header must be: ${expectedHeader.join(" | ")}`,
    errors,
  );
  const separator = splitMarkdownRow(lines[firstTableLine + 1] ?? "");
  expect(
    Array.isArray(separator) &&
      separator.length === expectedHeader.length &&
      separator.every((cell) => /^:?-{3,}:?$/.test(cell)),
    "permanent-document budget-change table separator is invalid",
    errors,
  );
  const seen = new Set();
  for (const line of lines.slice(firstTableLine + 2)) {
    const cells = splitMarkdownRow(line);
    if (!cells) {
      if (seen.size > 0 && line.trim().length > 0) break;
      continue;
    }
    if (cells.length !== expectedHeader.length) {
      errors.push("permanent-document budget-change row has the wrong column count");
      continue;
    }
    const relativePath = cells[0].replace(/^`|`$/g, "");
    const field = cells[1].replace(/^`|`$/g, "");
    const key = `${relativePath}:${field}`;
    if (seen.has(key)) {
      errors.push(`permanent-document budget-change has duplicate row ${key}`);
      continue;
    }
    seen.add(key);
    evidence[relativePath] ??= {};
    evidence[relativePath][field] = {
      beforeBytes: parseEvidenceInteger(cells[2]),
      afterBytes: parseEvidenceInteger(cells[3]),
      reasonCannotAbsorb: cells[4],
      newDurableMeaning: cells[5],
      removedOrReplacedDuplication: cells[6],
      taskAcceptance: cells[7],
      userApproval: cells[8],
    };
  }
  return { evidence, errors };
}

export function validatePermanentDocumentBudgetChange({
  previousPolicy,
  proposedPolicy,
  evidence = {},
}) {
  const errors = [];
  const previousEntries = new Map([
    ...previousPolicy.documents.map((entry) => [entry.path, entry]),
    [previousPolicy.combined.path, previousPolicy.combined],
  ]);
  const proposedEntries = new Map([
    ...proposedPolicy.documents.map((entry) => [entry.path, entry]),
    [proposedPolicy.combined.path, proposedPolicy.combined],
  ]);
  for (const [relativePath, proposed] of proposedEntries) {
    const previous = previousEntries.get(relativePath);
    if (!previous) {
      continue;
    }
    for (const field of ["warningBytes", "hardBytes"]) {
      if (proposed[field] === previous[field]) {
        continue;
      }
      const record = evidence[relativePath]?.[field] ?? evidence[relativePath];
      const prefix = `${relativePath} ${field} change`;
      expect(
        meaningfulEvidence(record?.reasonCannotAbsorb),
        `${prefix} requires the reason existing sections cannot absorb the meaning`,
        errors,
      );
      expect(
        meaningfulEvidence(record?.newDurableMeaning),
        `${prefix} requires the new durable meaning`,
        errors,
      );
      expect(
        record?.beforeBytes === previous[field] &&
          record?.afterBytes === proposed[field],
        `${prefix} requires exact before/after bytes ${previous[field]} -> ${proposed[field]}`,
        errors,
      );
      expect(
        meaningfulEvidence(record?.removedOrReplacedDuplication),
        `${prefix} requires removed or replaced duplication`,
        errors,
      );
      expect(
        typeof record?.taskAcceptance === "string" &&
          /\bAC-\d{2}\b/.test(record.taskAcceptance),
        `${prefix} requires explicit Task acceptance`,
        errors,
      );
      expect(
        meaningfulEvidence(record?.userApproval),
        `${prefix} requires explicit user approval`,
        errors,
      );
    }
  }
  return errors;
}

export function planPermanentDocumentLoading({
  workflow = "ordinary",
  hasCurrentPair = false,
  taskPath,
  testPath,
  goal = [],
  scope = [],
  documentationImpact = [],
  changedCode = [],
  dependencies = [],
  rebaseline = false,
  majorRedesign = false,
  broadCrossOwner = false,
  sourceConflict = false,
  conflictResolved = false,
  ambiguousOwner = false,
  missingOwnerHeading = false,
  targetedTruthInsufficient = false,
  unresolvedAfterFullRead = false,
} = {}) {
  const alwaysRead = ["AGENTS.md"];
  if (hasCurrentPair) {
    alwaysRead.push(taskPath ?? "<selected TASK.md>", testPath ?? "<selected TEST.md>");
  }
  const indexed = ["README.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"];
  const targetedSections = [
    ...new Set([
      ...goal,
      ...scope,
      ...documentationImpact,
      ...changedCode,
      ...dependencies,
    ]),
  ].sort();
  const fullReadReasons = [];
  if (workflow === "kyw-init") fullReadReasons.push("kyw-init");
  if (rebaseline) fullReadReasons.push("rebaseline");
  if (majorRedesign) fullReadReasons.push("major-redesign");
  if (broadCrossOwner) fullReadReasons.push("broad-cross-owner");
  if (sourceConflict) fullReadReasons.push("source-conflict");
  if (ambiguousOwner) fullReadReasons.push("ambiguous-owner");
  if (missingOwnerHeading) fullReadReasons.push("missing-owner-heading");
  if (targetedTruthInsufficient) fullReadReasons.push("targeted-truth-insufficient");
  const blocked =
    (sourceConflict && !conflictResolved) ||
    (fullReadReasons.length > 0 && unresolvedAfterFullRead);
  return deepFreeze({
    mode: fullReadReasons.length > 0 ? "FULL" : "TARGETED",
    alwaysRead,
    indexOrSearch: indexed,
    targetedSections,
    fullRead:
      fullReadReasons.length > 0
        ? ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"]
        : [],
    fullReadReasons,
    blocked,
  });
}

export function validatePermanentRuleFamilies(
  registry,
  texts,
  {
    allowedSurfacePaths = GUARDED_SURFACE_PATHS,
    requiredFamilyIds = [],
  } = {},
) {
  const errors = [];
  const ids = new Set();
  for (const family of registry) {
    expect(
      typeof family?.id === "string" && family.id.length > 0,
      "guarded rule family is missing an ID",
      errors,
    );
    if (ids.has(family?.id)) {
      errors.push(`guarded rule family ID is duplicated: ${family.id}`);
    }
    ids.add(family?.id);
    expect(
      family?.owner &&
        !Array.isArray(family.owner) &&
        typeof family.owner.path === "string" &&
        family.owner.path.length > 0,
      `${family?.id ?? "<unknown>"} must declare exactly one canonical owner`,
      errors,
    );
    if (!family?.owner || Array.isArray(family.owner) || !family.owner.path) {
      continue;
    }
    expect(
      allowedSurfacePaths.has(family.owner.path),
      `${family.id} owner path is not a guarded surface: ${family.owner.path}`,
      errors,
    );
    const ownerText = texts[family.owner.path];
    expect(
      typeof ownerText === "string",
      `${family.id} canonical owner is missing: ${family.owner.path}`,
      errors,
    );
    for (const anchor of family.owner.anchors ?? []) {
      try {
        expect(
          typeof ownerText === "string" && matchesPattern(ownerText, anchor),
          `${family.id} canonical owner is missing anchor ${anchor.source}`,
          errors,
        );
      } catch (error) {
        errors.push(`${family.id} has invalid owner anchor ${anchor.source}: ${error.message}`);
      }
    }

    const projectionPaths = new Set();
    for (const projection of family.projections ?? []) {
      if (
        projection.path === family.owner.path ||
        projectionPaths.has(projection.path) ||
        !allowedSurfacePaths.has(projection.path)
      ) {
        errors.push(`${family.id} has an unlisted or duplicate projection: ${projection.path}`);
        continue;
      }
      projectionPaths.add(projection.path);
      const projectionText = texts[projection.path];
      expect(
        typeof projectionText === "string",
        `${family.id} projection is missing: ${projection.path}`,
        errors,
      );
      for (const anchor of projection.anchors ?? []) {
        try {
          expect(
            typeof projectionText === "string" && matchesPattern(projectionText, anchor),
            `${family.id} projection ${projection.path} is stale at anchor ${anchor.source}`,
            errors,
          );
        } catch (error) {
          errors.push(
            `${family.id} has invalid projection anchor ${anchor.source}: ${error.message}`,
          );
        }
      }
    }

    for (const detail of family.forbiddenDetailedAnchors ?? []) {
      for (const [relativePath, text] of Object.entries(texts)) {
        if (
          relativePath === family.owner.path ||
          (projectionPaths.has(relativePath) &&
            relativePath.startsWith("skills/")) ||
          typeof text !== "string"
        ) {
          continue;
        }
        try {
          if (matchesPattern(text, detail)) {
            errors.push(
              `${family.id} detailed procedure appears as an unlisted projection in ${relativePath}: ${detail.source}`,
            );
          }
        } catch (error) {
          errors.push(`${family.id} has invalid detailed anchor ${detail.source}: ${error.message}`);
        }
      }
    }
  }
  const requiredIds = new Set(requiredFamilyIds);
  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) {
      errors.push(`guarded rule family is ownerless or unregistered: ${requiredId}`);
    }
  }
  for (const id of ids) {
    if (requiredIds.size > 0 && !requiredIds.has(id)) {
      errors.push(`guarded rule family is outside the required inventory: ${id}`);
    }
  }
  return errors;
}

export function validatePermanentDocumentPolicy(policy = PERMANENT_DOCUMENT_POLICY) {
  const errors = [];
  expect(policy?.schemaVersion === 1, "permanent-document policy schema must be 1", errors);
  const paths = policy?.documents?.map(({ path: relativePath }) => relativePath) ?? [];
  expect(
    sameJson(paths, PERMANENT_DOCUMENT_PATHS),
    `permanent-document policy paths must be exactly ${PERMANENT_DOCUMENT_PATHS.join(", ")}`,
    errors,
  );
  const roles = new Set();
  for (const entry of policy?.documents ?? []) {
    if (roles.has(entry.role)) {
      errors.push(`permanent-document role is duplicated: ${entry.role}`);
    }
    roles.add(entry.role);
    expect(
      Number.isSafeInteger(entry.warningBytes) &&
        Number.isSafeInteger(entry.hardBytes) &&
        entry.warningBytes <= entry.hardBytes,
      `${entry.path} byte policy must satisfy warning <= hard`,
      errors,
    );
  }
  const combined = policy?.combined;
  expect(combined?.path === "Combined", "combined permanent-document policy is missing", errors);
  expect(
    Number.isSafeInteger(combined?.warningBytes) &&
      Number.isSafeInteger(combined?.hardBytes) &&
      combined.warningBytes <= combined.hardBytes,
    "combined byte policy must satisfy warning <= hard",
    errors,
  );
  return errors;
}

export function validatePermanentDocumentContents({
  documents,
  templateNames = EXPECTED_PROJECT_TEMPLATE_NAMES,
  surfaceTexts = documents,
  packageScripts = {},
  pathExists = () => false,
  policy = PERMANENT_DOCUMENT_POLICY,
  ruleFamilies = PERMANENT_RULE_FAMILIES,
  requiredRuleFamilyIds =
    ruleFamilies === PERMANENT_RULE_FAMILIES
      ? REQUIRED_INSTRUCTION_RULE_FAMILY_IDS
      : [],
}) {
  const errors = [...validatePermanentDocumentPolicy(policy)];
  const documentPaths = Object.keys(documents).sort();
  expect(
    sameJson(documentPaths, [...PERMANENT_DOCUMENT_PATHS].sort()),
    `permanent-document inventory must be exactly ${PERMANENT_DOCUMENT_PATHS.join(", ")}`,
    errors,
  );
  expect(
    sameJson([...templateNames].sort(), EXPECTED_PROJECT_TEMPLATE_NAMES),
    `project template inventory must be exactly ${EXPECTED_PROJECT_TEMPLATE_NAMES.join(", ")}`,
    errors,
  );
  for (const mirrorPath of FORBIDDEN_PERMANENT_MIRROR_PATHS) {
    expect(!pathExists(mirrorPath), `generated permanent-document mirror is forbidden: ${mirrorPath}`, errors);
  }

  for (const entry of policy.documents ?? []) {
    const text = documents[entry.path];
    expect(typeof text === "string", `permanent document is missing: ${entry.path}`, errors);
    if (typeof text !== "string") {
      continue;
    }
    for (const heading of entry.requiredHeadings ?? []) {
      expect(
        matchesPattern(text, heading),
        `${entry.path} no longer satisfies its ${entry.role} role at ${heading.source}`,
        errors,
      );
    }
    for (const [label, candidate] of MUTABLE_CHRONOLOGY_PATTERNS) {
      expect(!candidate.test(text), `${entry.path} leaks ${label}`, errors);
    }
    for (const [label, candidate] of EVIDENCE_LEAKAGE_PATTERNS) {
      expect(!candidate.test(text), `${entry.path} leaks ${label}`, errors);
    }
    for (const [label, candidate] of DETAILED_PROCEDURE_PATTERNS) {
      expect(!candidate.test(text), `${entry.path} retains ${label}`, errors);
    }
    for (const [label, candidate] of CROSS_OWNER_HEADING_PATTERNS[entry.path] ?? []) {
      expect(!candidate.test(text), `${entry.path} retains ${label}`, errors);
    }

    for (const match of text.matchAll(/\bnpm run ([a-z0-9][a-z0-9:_-]*)\b/gi)) {
      expect(
        typeof packageScripts[match[1]] === "string",
        `${entry.path} references stale npm command npm run ${match[1]}`,
        errors,
      );
    }
    for (const match of text.matchAll(/\bnode \.\/([A-Za-z0-9_./-]+\.mjs)\b/g)) {
      const commandPath = match[1];
      expect(
        pathExists(commandPath),
        `${entry.path} references stale Node command node ./${commandPath}`,
        errors,
      );
    }
  }
  errors.push(
    ...validatePermanentRuleFamilies(ruleFamilies, surfaceTexts, {
      requiredFamilyIds: requiredRuleFamilyIds,
    }),
  );
  return errors;
}

function readArtifactStatus(markdown) {
  return /^## Status\s*\r?\n+\s*([A-Z_]+)\s*$/m.exec(markdown ?? "")?.[1];
}

function collectPermanentDocumentEvidenceCandidates(root) {
  const tasksRoot = join(root, "docs", "tasks");
  if (!existsSync(tasksRoot)) {
    return [];
  }
  const candidates = [];
  for (const entry of readdirSync(tasksRoot, { withFileTypes: true })) {
    const taskId = /^(\d{4})-[a-z0-9-]+$/.exec(entry.name)?.[1];
    if (!entry.isDirectory() || !taskId) {
      continue;
    }
    const taskPath = `docs/tasks/${entry.name}/TASK.md`;
    const testPath = `docs/tasks/${entry.name}/TEST.md`;
    const absoluteTaskPath = join(root, taskPath);
    const absoluteTestPath = join(root, testPath);
    if (!existsSync(absoluteTestPath)) {
      continue;
    }
    const markdown = readFileSync(absoluteTestPath, "utf8");
    if (
      !markdown.includes(PERMANENT_DOCUMENT_DELTA_MARKER) &&
      !markdown.includes(PERMANENT_DOCUMENT_BUDGET_CHANGE_MARKER)
    ) {
      continue;
    }
    const taskMarkdown = existsSync(absoluteTaskPath)
      ? readFileSync(absoluteTaskPath, "utf8")
      : "";
    candidates.push({
      taskId,
      taskPath,
      testPath,
      taskStatus: readArtifactStatus(taskMarkdown),
      testStatus: readArtifactStatus(markdown),
      markdown,
    });
  }
  return candidates;
}

function collectPermanentDocumentState(root, packageJson, errors) {
  const documents = {};
  for (const relativePath of PERMANENT_DOCUMENT_PATHS) {
    const absolutePath = join(root, relativePath);
    if (!existsSync(absolutePath)) {
      errors.push(`permanent document is missing: ${relativePath}`);
      continue;
    }
    documents[relativePath] = readFileSync(absolutePath, "utf8");
  }
  const templateRoot = join(root, "templates", "project");
  const templateNames = existsSync(templateRoot)
    ? readdirSync(templateRoot).filter((name) => name.endsWith(".md"))
    : [];
  const surfaceTexts = { ...documents };
  for (const relativePath of GUARDED_SURFACE_PATHS) {
    if (relativePath in surfaceTexts) {
      continue;
    }
    const absolutePath = join(root, relativePath);
    if (existsSync(absolutePath)) {
      surfaceTexts[relativePath] = readFileSync(absolutePath, "utf8");
    }
  }
  return {
    documents,
    templateNames,
    surfaceTexts,
    packageScripts: packageJson?.scripts ?? {},
    pathExists: (relativePath) => existsSync(join(root, relativePath)),
    evidenceCandidates: collectPermanentDocumentEvidenceCandidates(root),
  };
}

export function validatePermanentDocumentState({
  documents,
  templateNames,
  surfaceTexts,
  packageScripts,
  pathExists,
  evidenceCandidates = [],
  policy = PERMANENT_DOCUMENT_POLICY,
  ruleFamilies = PERMANENT_RULE_FAMILIES,
  requiredRuleFamilyIds =
    ruleFamilies === PERMANENT_RULE_FAMILIES
      ? REQUIRED_INSTRUCTION_RULE_FAMILY_IDS
      : [],
}) {
  const errors = validatePermanentDocumentContents({
    documents,
    templateNames,
    surfaceTexts,
    packageScripts,
    pathExists,
    policy,
    ruleFamilies,
    requiredRuleFamilyIds,
  });
  if (!PERMANENT_DOCUMENT_PATHS.every((relativePath) => typeof documents[relativePath] === "string")) {
    return errors;
  }
  const measurements = measurePermanentDocuments(documents);
  const deltaSelection = selectPermanentDocumentEvidence(evidenceCandidates);
  errors.push(...deltaSelection.errors);
  if (!deltaSelection.selected) {
    errors.push("no permanent-document delta evidence exists in a current or retained TEST");
    return errors;
  }
  const continuity = derivePermanentDocumentEvidenceBaseline(
    evidenceCandidates,
    deltaSelection.selected,
  );
  errors.push(...continuity.errors);
  const growthErrors = continuity.baseline
    ? validatePermanentDocumentGrowthEvidence({
        markdown: deltaSelection.selected.markdown,
        measurements,
        baseline: continuity.baseline,
        policy,
      })
    : [];
  errors.push(...growthErrors);
  const evidenceValid =
    continuity.errors.length === 0 && growthErrors.length === 0;
  if (
    deltaSelection.selected.taskId ===
    PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.taskId
  ) {
    errors.push(
      ...validatePermanentDocumentCompactionAcceptance({
        measurements,
      }),
    );
  }

  const budgetSelection = selectPermanentDocumentEvidence(evidenceCandidates, {
    marker: PERMANENT_DOCUMENT_BUDGET_CHANGE_MARKER,
  });
  errors.push(...budgetSelection.errors);
  let budgetChangeEvidence = {};
  if (budgetSelection.selected) {
    const parsedBudgetEvidence = parsePermanentDocumentBudgetChangeEvidence(
      budgetSelection.selected.markdown,
    );
    errors.push(...parsedBudgetEvidence.errors);
    budgetChangeEvidence = parsedBudgetEvidence.evidence;
  }
  errors.push(
    ...validatePermanentDocumentBudgetChange({
      previousPolicy: PERMANENT_DOCUMENT_POLICY_BASELINE,
      proposedPolicy: policy,
      evidence: budgetChangeEvidence,
    }),
  );
  for (const entry of [...policy.documents, policy.combined]) {
    const result = evaluatePermanentDocumentBudget(entry, measurements[entry.path].bytes, {
      hasGrowthEvidence: evidenceValid,
    });
    if (!result.acceptable) {
      errors.push(
        `${entry.path} permanent-document budget failed: ${result.status} (${measurements[entry.path].bytes} bytes)`,
      );
    }
  }
  return errors;
}

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

  const placeholderScan =
    skillName === "kyw-task"
      ? skill
          .replace("`TODO` `T-NN` identifiers", "")
          .replace("`TODO` `T-01`, `T-02` identifiers", "")
      : skill;
  expect(!placeholderScan.includes("TODO"), `${skillName} contains a TODO placeholder`, errors);
  expect(skill.includes(`$${skillName}`), `${skillName} must name its explicit invocation`, errors);
  expect(skill.includes("## Inputs") || skill.includes("## Input"), `${skillName} must define its inputs`, errors);
  expect(/\bmutat(?:e|es|ion|ions)\b/.test(skill), `${skillName} must define a mutation boundary`, errors);

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
      expect(
        skill.includes("Do not create `docs/`, `docs/tasks/`, a lock, a scratch file, or a Task artifact during inspection"),
        `${skillName} must settle adaptive boundaries before writes`,
        errors,
      );
      expect(
        skill.includes("set both statuses to `READY`") &&
          skill.includes("require explicit confirmation before promoting both statuses to `READY`"),
        `${skillName} must distinguish adaptive READY publication from compatible DRAFT confirmation`,
        errors,
      );
      expect(
        /Failure rolls back (?:batch-)?owned final paths only with complete (?:ownership )?proof/i.test(
          skill,
        ),
        `${skillName} must require atomic batch publication`,
        errors,
      );
      expect(!skill.includes("exact(task-id)"), `${skillName} must not route existing Task execution`, errors);
      expect(
        !skill.includes("[Task Execution and Resume](references/execution.md)"),
        `${skillName} must not retain the execution reference`,
        errors,
      );
      expect(
        !existsSync(join(root, "skills", skillName, "references", "execution.md")),
        `${skillName} must not retain a duplicate execution reference`,
        errors,
      );
      expect(existsSync(adapterPath), `${skillName} is missing its deterministic Task adapter`, errors);
      if (existsSync(adapterPath)) {
        const adapter = readFileSync(adapterPath, "utf8");
        expect(adapter.includes("../../../src/core/task-artifacts.mjs"), `${skillName} adapter must delegate to the core artifact helper`, errors);
        expect(adapter.includes("../../.kyw-dev/runtime/src/core/task-artifacts.mjs"), `${skillName} adapter must support the managed direct-install runtime`, errors);
        expect(!adapter.includes("writeFile"), `${skillName} adapter must not duplicate core file-writing logic`, errors);
      }
    }
    if (skillName === "kyw-impl") {
      const executionReferencePath = join(root, "skills", skillName, "references", "execution.md");
      expect(
        skill.includes("`$kyw-impl NNNN` selects one exact existing Task"),
        `${skillName} must route exact existing Tasks`,
        errors,
      );
      expect(
        skill.includes("[Task Execution and Resume](references/execution.md)"),
        `${skillName} must link its execution reference`,
        errors,
      );
      expect(existsSync(executionReferencePath), `${skillName} is missing its execution reference`, errors);
      expect(
        !existsSync(join(root, "skills", skillName, "scripts", "task-artifacts.mjs")),
        `${skillName} must reuse the sole kyw-task adapter rather than duplicate it`,
        errors,
      );
      if (existsSync(executionReferencePath)) {
        const executionReference = readFileSync(executionReferencePath, "utf8");
        expect(executionReference.includes("## Contents"), `${skillName} execution reference must provide navigation`, errors);
        expect(executionReference.includes("READY` / `READY` to `IN_PROGRESS` / `RUNNING"), `${skillName} must define the execution transition`, errors);
        expect(
          executionReference.includes("Edit another numbered Task only for a bounded contract migration"),
          `${skillName} must enforce the current-Task boundary`,
          errors,
        );
        expect(executionReference.includes("Never use `DONE` or `PASSED` with an unexecuted required test"), `${skillName} must block unsupported terminal success`, errors);
        expect(executionReference.includes("Persist a compaction or interruption checkpoint"), `${skillName} must define a compaction handoff`, errors);
        expect(executionReference.includes("Perform the final diff coverage review"), `${skillName} must define final coverage review`, errors);
      }
    }
    if (skillName === "kyw-audit") {
      const auditReferencePath = join(root, "skills", skillName, "references", "audit.md");
      expect(skill.includes("[Independent Task Audit](references/audit.md)"), `${skillName} must link its audit reference`, errors);
      expect(skill.includes("no token means `read-only`; exactly `--fix` means `repair`"), `${skillName} must lock the exact invocation modes`, errors);
      expect(skill.includes("keep the repository byte-for-byte unchanged for the entire invocation"), `${skillName} must enforce the default zero-write boundary`, errors);
      expect(
        skill.includes("Before the first mutation, send a standalone conversation message beginning `Bounded repair plan:`"),
        `${skillName} must plan before an authorized repair`,
        errors,
      );
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
        expect(auditReference.includes("## Preserve the read-only contract"), `${skillName} must keep bare audit findings report-only`, errors);
        expect(auditReference.includes("## Repair only in explicit fix mode"), `${skillName} must require explicit repair mode`, errors);
        expect(auditReference.includes("Any repository write or attempted mutating command"), `${skillName} must treat a read-only mutation attempt as failure`, errors);
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
  const metadataKeys = { interface: [], policy: [] };
  const metadataSections = [];
  let metadataSection;
  for (const line of metadata.split("\n")) {
    const section = line.match(/^([a-z_]+):\s*$/)?.[1];
    if (section) {
      metadataSection = section;
      metadataSections.push(section);
      continue;
    }
    const key = line.match(/^  ([a-z_]+):/)?.[1];
    if (key && metadataSection in metadataKeys) {
      metadataKeys[metadataSection].push(key);
    }
  }
  expect(
    sameJson(metadataSections, ["interface", "policy"]) &&
      sameJson(metadataKeys.interface, ["display_name", "short_description", "default_prompt"]) &&
      sameJson(metadataKeys.policy, ["allow_implicit_invocation"]),
    `${skillName} metadata must use only the supported interface and invocation-policy fields`,
    errors,
  );
  expect(metadata.includes("interface:\n"), `${skillName} metadata is missing interface`, errors);
  expect(/  display_name: "[^"]+"/.test(metadata), `${skillName} metadata is missing a quoted display_name`, errors);
  expect(/  short_description: "[^"]{25,64}"/.test(metadata), `${skillName} short_description must be 25-64 characters`, errors);
  expect(metadata.includes(`default_prompt: "Use $${skillName} `), `${skillName} default_prompt must mention the Skill`, errors);
  expect(metadata.includes("policy:\n  allow_implicit_invocation: false\n"), `${skillName} must disable implicit invocation`, errors);
  expect(!metadata.includes("dependencies:"), `${skillName} must not declare tool dependencies`, errors);
}

export function validateFoundation(
  root = REPOSITORY_ROOT,
  { permanentDocumentPolicy = PERMANENT_DOCUMENT_POLICY } = {},
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
    expect(packageJson.version === RELEASE_METADATA.version, "package version must be 0.1.3", errors);
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
    expect(!("dependencies" in packageJson), "release package must remain production-dependency free", errors);
    expect(!("devDependencies" in packageJson), "release package must remain development-dependency free", errors);

    for (const [name, command] of Object.entries(requiredScripts)) {
      expect(packageJson.scripts?.[name] === command, `package script ${name} is missing or changed`, errors);
    }
    for (const name of forbiddenLifecycleScripts) {
      expect(!(name in (packageJson.scripts ?? {})), `npm lifecycle script ${name} is not allowed`, errors);
    }

    if (publishWorkflow) {
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
        (publishWorkflow.match(/^        run: npm publish /gm) ?? []).length === 1,
        "trusted publishing workflow must contain exactly one publish command",
        errors,
      );
      expect(
        publishWorkflow.includes(
          "        run: npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/",
        ),
        "trusted publishing workflow must publish the exact checkout directory",
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
      Array.isArray(pluginJson.interface?.defaultPrompt) && pluginJson.interface.defaultPrompt.length === 4,
      "plugin defaultPrompt must contain the four release workflows",
      errors,
    );
    for (const prompt of pluginJson.interface?.defaultPrompt ?? []) {
      expect(typeof prompt === "string" && prompt.length <= 128, "plugin default prompts must be strings of at most 128 characters", errors);
    }
    for (const field of ["mcpServers", "apps", "hooks"]) {
      expect(!(field in pluginJson), `plugin field ${field} is out of scope`, errors);
    }
  }

  const permanentDocumentState = collectPermanentDocumentState(root, packageJson, errors);
  errors.push(
    ...validatePermanentDocumentState({
      ...permanentDocumentState,
      policy: permanentDocumentPolicy,
    }),
  );

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
