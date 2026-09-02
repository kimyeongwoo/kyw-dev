import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { TRUSTED_PUBLISHER_EXPECTATION } from "../scripts/lib/validate-foundation.mjs";

const workflowPath = fileURLToPath(
  new URL("../.github/workflows/publish.yml", import.meta.url),
);
const workflow = readFileSync(workflowPath, "utf8");

const checkoutPin = "d23441a48e516b6c34aea4fa41551a30e30af803";
const setupNodePin = "249970729cb0ef3589644e2896645e5dc5ba9c38";

function occurrenceCount(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function replaceRequired(text, search, replacement) {
  const variant = text.replace(search, replacement);
  assert.notEqual(variant, text, `mutation source is missing: ${search}`);
  return variant;
}

function insertStepBeforePublish(text, name, command) {
  const marker = "      - name: Publish the exact checkout directory through OIDC\n";
  return replaceRequired(
    text,
    marker,
    `      - name: ${name}\n        run: ${command}\n\n${marker}`,
  );
}

function workflowStepBlock(text, name, nextName) {
  const marker = `      - name: ${name}\n`;
  const nextMarker = `      - name: ${nextName}\n`;
  const start = text.indexOf(marker);
  const end = text.indexOf(nextMarker, start + marker.length);
  assert.ok(start >= 0 && end > start, `missing bounded workflow step: ${name}`);
  return text.slice(start, end);
}

function replaceInWorkflowStep(text, name, nextName, search, replacement) {
  const block = workflowStepBlock(text, name, nextName);
  const variant = replaceRequired(block, search, replacement);
  return text.replace(block, variant);
}

function assertPublishWorkflowContract(text) {
  assert.equal(text.includes("\r"), false);
  assert.match(text, /^name: Publish npm package through OIDC\n/);

  const triggerStart = text.indexOf("\non:\n");
  const permissionStart = text.indexOf("\npermissions: {}\n");
  assert.ok(triggerStart >= 0 && permissionStart > triggerStart);
  const trigger = text.slice(triggerStart, permissionStart);
  assert.match(trigger, /^\non:\n  workflow_dispatch:\n/);
  assert.equal(occurrenceCount(trigger, /^  workflow_dispatch:$/gm), 1);
  assert.doesNotMatch(
    trigger,
    /^  (?:push|pull_request|schedule|workflow_call|workflow_run|repository_dispatch):/m,
  );
  const inputNames = ["expected_sha", "expected_version"];
  for (const [index, input] of inputNames.entries()) {
    const marker = `      ${input}:\n`;
    const start = trigger.indexOf(marker);
    const nextMarker = inputNames[index + 1]
      ? `      ${inputNames[index + 1]}:\n`
      : undefined;
    const end = nextMarker ? trigger.indexOf(nextMarker, start + marker.length) : trigger.length;
    assert.ok(start >= 0 && end > start, `missing bounded input block: ${input}`);
    const inputBlock = trigger.slice(start, end);
    assert.match(inputBlock, /^        required: true$/m);
    assert.match(inputBlock, /^        type: string$/m);
  }

  assert.equal(occurrenceCount(text, /^[ \t]*permissions:/gm), 2);
  assert.match(text, /^permissions: {}$/m);
  assert.deepEqual(
    [...text.matchAll(/^      ([a-z-]+): (read|write)$/gm)].map(
      ([, permission, access]) => ({ permission, access }),
    ),
    [
      { permission: "contents", access: "read" },
      { permission: "id-token", access: "write" },
    ],
  );
  assert.match(
    text,
    /\nconcurrency:\n  group: kyw-dev-npm-publish\n  cancel-in-progress: false\n/,
  );
  assert.match(text, /^    runs-on: ubuntu-latest$/m);
  assert.match(text, /^    timeout-minutes: 30$/m);
  assert.match(text, /^    name: Publish exact npm checkout$/m);
  assert.match(
    text,
    new RegExp(`^    environment: ${TRUSTED_PUBLISHER_EXPECTATION.environment}$`, "m"),
  );
  const jobsStart = text.indexOf("\njobs:\n");
  assert.ok(jobsStart >= 0, "missing jobs block");
  const jobsText = text.slice(jobsStart + "\njobs:\n".length);
  assert.deepEqual(
    [...jobsText.matchAll(/^  ([A-Za-z_][A-Za-z0-9_-]*):$/gm)].map(([, job]) => job),
    ["publish"],
  );
  assert.deepEqual(
    [...jobsText.matchAll(/^      - name: (.+)$/gm)].map(([, name]) => name),
    [
      "Guard manual dispatch identity",
      "Check out exact source",
      "Set up supported Node.js",
      "Guard checkout, runtime, and package identity",
      "Require registry version absence",
      "Reconfirm exact checkout before OIDC publication",
      "Publish the exact checkout directory through OIDC",
    ],
  );

  const dispatchBlock = workflowStepBlock(
    text,
    "Guard manual dispatch identity",
    "Check out exact source",
  );
  const sourceBlock = workflowStepBlock(
    text,
    "Guard checkout, runtime, and package identity",
    "Require registry version absence",
  );
  const absenceBlock = workflowStepBlock(
    text,
    "Require registry version absence",
    "Reconfirm exact checkout before OIDC publication",
  );
  const reconfirmBlock = workflowStepBlock(
    text,
    "Reconfirm exact checkout before OIDC publication",
    "Publish the exact checkout directory through OIDC",
  );
  for (const projection of [
    "ACTUAL_EVENT: ${{ github.event_name }}",
    "ACTUAL_REF: ${{ github.ref }}",
    "ACTUAL_REPOSITORY: ${{ github.repository }}",
    "ACTUAL_SHA: ${{ github.sha }}",
    "EXPECTED_SHA: ${{ inputs.expected_sha }}",
    "EXPECTED_VERSION: ${{ inputs.expected_version }}",
  ]) {
    assert.ok(dispatchBlock.includes(projection), `missing dispatch projection: ${projection}`);
  }
  assert.match(dispatchBlock, /^          set -euo pipefail$/m);
  assert.ok(sourceBlock.includes("EXPECTED_SHA: ${{ inputs.expected_sha }}"));
  assert.ok(sourceBlock.includes("EXPECTED_VERSION: ${{ inputs.expected_version }}"));
  assert.match(sourceBlock, /^          set -euo pipefail$/m);
  assert.match(sourceBlock, /^          actual_sha="\$\(git rev-parse HEAD\)"$/m);
  assert.match(
    sourceBlock,
    /^          ACTUAL_SHA="\$actual_sha" node --input-type=module <<'NODE'$/m,
  );
  assert.match(sourceBlock, /const expectedSha = process\.env\.EXPECTED_SHA;/);
  assert.match(sourceBlock, /const expectedVersion = process\.env\.EXPECTED_VERSION;/);
  assert.match(sourceBlock, /const actualSha = process\.env\.ACTUAL_SHA;/);
  assert.match(
    sourceBlock,
    /const packageJson = JSON\.parse\(readFileSync\("package\.json", "utf8"\)\);/,
  );
  assert.match(
    sourceBlock,
    /const pluginJson = JSON\.parse\(\s*readFileSync\("\.codex-plugin\/plugin\.json", "utf8"\),\s*\);/,
  );
  assert.match(
    sourceBlock,
    /const npmVersion = execFileSync\("npm", \["--version"\], \{\s*encoding: "utf8",\s*\}\)\.trim\(\);/,
  );
  assert.match(sourceBlock, /numericVersion\(process\.versions\.node, "Node\.js"\)/);
  assert.match(sourceBlock, /numericVersion\(npmVersion, "npm"\)/);
  assert.ok(absenceBlock.includes("EXPECTED_VERSION: ${{ inputs.expected_version }}"));
  assert.match(absenceBlock, /const version = process\.env\.EXPECTED_VERSION;/);
  assert.match(
    absenceBlock,
    /`\$\{encodeURIComponent\(packageName\)\}\/\$\{encodeURIComponent\(version\)\}`/,
  );
  assert.match(absenceBlock, /registryUrl\.searchParams\.set\(\s*"kyw-run",/);
  assert.match(
    absenceBlock,
    /`\$\{process\.env\.GITHUB_RUN_ID\}-\$\{process\.env\.GITHUB_RUN_ATTEMPT\}`/,
  );
  assert.match(absenceBlock, /"cache-control": "no-cache"/);
  assert.match(absenceBlock, /const response = await fetch\(registryUrl, \{/);
  assert.ok(reconfirmBlock.includes("EXPECTED_SHA: ${{ inputs.expected_sha }}"));
  assert.match(reconfirmBlock, /^          set -euo pipefail$/m);
  assert.match(reconfirmBlock, /^          test ! -e \.npmrc$/m);

  assert.deepEqual(
    [...text.matchAll(/uses: ([^@\s]+)@([0-9a-f]{40}) # (v[^\s]+)/g)].map(
      ([, action, sha, version]) => ({ action, sha, version }),
    ),
    [
      { action: "actions/checkout", sha: checkoutPin, version: "v6.1.0" },
      { action: "actions/setup-node", sha: setupNodePin, version: "v6.5.0" },
    ],
  );
  assert.equal(occurrenceCount(text, /persist-credentials: false/g), 1);
  assert.equal(occurrenceCount(text, /package-manager-cache: false/g), 1);
  assert.match(text, /ref: \$\{\{ inputs\.expected_sha \}\}/);

  for (const guard of [
    'test "$ACTUAL_EVENT" = "workflow_dispatch"',
    `test "$ACTUAL_REPOSITORY" = "${TRUSTED_PUBLISHER_EXPECTATION.repositoryFullName}"`,
    'test "$ACTUAL_REF" = "refs/heads/main"',
    'test "$ACTUAL_SHA" = "$EXPECTED_SHA"',
    'test "${#EXPECTED_SHA}" -eq 40',
    '*[!0-9a-f]*|"")',
    'test "$actual_sha" = "$EXPECTED_SHA"',
    'packageJson.name !== "kyw-dev"',
    "packageJson.version !== expectedVersion",
    "pluginJson.name !== packageJson.name",
    "pluginJson.version !== packageJson.version",
    '"git+https://github.com/kimyeongwoo/kyw-dev.git"',
    'packageJson.publishConfig?.access !== "public"',
    'packageJson.publishConfig?.registry !== "https://registry.npmjs.org/"',
    "[22, 14, 0]",
    "[11, 5, 1]",
    '"dependencies" in packageJson',
    '"devDependencies" in packageJson',
    'existsSync(".npmrc")',
  ]) {
    assert.ok(text.includes(guard), `missing fail-closed guard: ${guard}`);
  }
  assert.match(
    text,
    /\^\(0\|\[1-9\]\[0-9\]\*\)\\\.\(0\|\[1-9\]\[0-9\]\*\)\\\.\(0\|\[1-9\]\[0-9\]\*\)\$/,
  );
  for (const scriptName of [
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
  ]) {
    assert.match(text, new RegExp(`^            "${scriptName}",$`, "m"));
  }

  assert.doesNotMatch(
    text,
    /npm run (?:check|release:candidate|release:ci|release:check)|--dry-run|--retain-candidate|--cleanup-candidate|packed-release-check\.mjs|release-evidence-(?:manual-runner|harness)\.mjs|release-gate-isolation\.mjs/i,
  );
  assert.equal(occurrenceCount(text, /\bnpm pack\b/g), 0);

  assert.match(text, /const packageName = "kyw-dev"/);
  assert.ok(
    text.includes('            "https://registry.npmjs.org/",\n          );'),
    "registry absence must query the public npm registry",
  );
  assert.equal(occurrenceCount(text, /await fetch\(/g), 1);
  assert.match(text, /response\.status === 404/);
  assert.match(text, /else if \(response\.ok\)/);
  assert.match(text, /Registry version \$\{packageName\}@\$\{version\} already exists/);
  assert.match(text, /Registry absence check was ambiguous with status/);
  assert.match(text, /^  NPM_CONFIG_FETCH_RETRIES: "0"$/m);
  assert.match(text, /^  NPM_CONFIG_PROVENANCE: "true"$/m);
  assert.match(text, /^  NPM_CONFIG_LOGS_MAX: "0"$/m);

  const dispatchIndex = text.indexOf("- name: Guard manual dispatch identity");
  const checkoutIndex = text.indexOf("- name: Check out exact source");
  const setupIndex = text.indexOf("- name: Set up supported Node.js");
  const sourceIndex = text.indexOf("- name: Guard checkout, runtime, and package identity");
  const absenceIndex = text.indexOf("- name: Require registry version absence");
  const reconfirmIndex = text.indexOf(
    "- name: Reconfirm exact checkout before OIDC publication",
  );
  const publishIndex = text.indexOf("run: npm publish .");
  assert.ok(
    dispatchIndex >= 0 &&
      dispatchIndex < checkoutIndex &&
      checkoutIndex < setupIndex &&
      setupIndex < sourceIndex &&
      sourceIndex < absenceIndex &&
      absenceIndex < reconfirmIndex &&
      reconfirmIndex < publishIndex,
    "dispatch, checkout, source, absence, cleanliness, and publish steps must stay ordered",
  );
  assert.match(
    text,
    /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/,
  );
  assert.match(
    text,
    /test -z "\$\(git status --porcelain --untracked-files=all\)"/,
  );
  assert.equal(occurrenceCount(text, /^        run: npm publish /gm), 1);
  assert.match(
    text,
    /^        run: npm publish \. --access public --ignore-scripts --registry=https:\/\/registry\.npmjs\.org\/$/m,
  );
  assert.equal(
    text.slice(text.lastIndexOf("      - name:")).startsWith(
      "      - name: Publish the exact checkout directory through OIDC\n",
    ),
    true,
    "the exact directory publish must be the final workflow step",
  );

  assert.doesNotMatch(
    text,
    /\bsecrets\.|NODE_AUTH_TOKEN|NPM_TOKEN|npmAuthToken|_authToken|\botp\b|security[- ]key|(?:^|\n)\s*(?:run:\s*)?npm (?:login|logout|adduser|whoami|trust|token|config)\b/im,
  );
  assert.doesNotMatch(
    text,
    /continue-on-error|\bretry\b|npm stage publish|npm dist-tag|npm version|git tag|git push --tags|gh release|gh workflow run|workflow_call|uses:\s+\.\//i,
  );
  assert.doesNotMatch(
    text,
    /CANDIDATE_TARBALL|steps\.candidate\.outputs\.archive_path|npm publish [^\n]*\.tgz|packageJson\.gitHead|["']gitHead["']\s*:|method:\s*["'](?:PUT|PATCH|DELETE)["']/i,
  );
  assert.doesNotMatch(text, /NPM_CONFIG_PROVENANCE:\s*"false"/);
}

test("trusted publishing workflow matches the repository-owned expected tuple", () => {
  assert.deepEqual(TRUSTED_PUBLISHER_EXPECTATION, {
    provider: "GitHub Actions",
    organizationOrUser: "kimyeongwoo",
    repository: "kyw-dev",
    repositoryFullName: "kimyeongwoo/kyw-dev",
    workflowFilename: "publish.yml",
    workflowPath: ".github/workflows/publish.yml",
    environment: "npm-production",
    allowedActions: ["npm publish"],
    packageAccess: "public",
  });
  assert.equal(
    workflowPath
      .replaceAll("\\", "/")
      .endsWith(TRUSTED_PUBLISHER_EXPECTATION.workflowPath),
    true,
  );
  assertPublishWorkflowContract(workflow);
});

test("workflow regression guards reject identity weakenings and removed publication layers", () => {
  const weakenedGuards = [
    replaceRequired(
      workflow,
      "  workflow_dispatch:\n",
      "  push:\n    branches:\n      - main\n  workflow_dispatch:\n",
    ),
    replaceRequired(workflow, "        required: true\n", "        required: false\n"),
    replaceRequired(workflow, "environment: npm-production", "environment: production"),
    replaceRequired(workflow, 'test "$ACTUAL_EVENT" = "workflow_dispatch"', "true"),
    replaceInWorkflowStep(
      workflow,
      "Guard manual dispatch identity",
      "Check out exact source",
      "          set -euo pipefail\n",
      "",
    ),
    replaceInWorkflowStep(
      workflow,
      "Guard manual dispatch identity",
      "Check out exact source",
      "ACTUAL_EVENT: ${{ github.event_name }}",
      "ACTUAL_EVENT: workflow_dispatch",
    ),
    replaceInWorkflowStep(
      workflow,
      "Guard manual dispatch identity",
      "Check out exact source",
      "ACTUAL_REPOSITORY: ${{ github.repository }}",
      "ACTUAL_REPOSITORY: kimyeongwoo/kyw-dev",
    ),
    replaceInWorkflowStep(
      workflow,
      "Guard manual dispatch identity",
      "Check out exact source",
      "ACTUAL_REF: ${{ github.ref }}",
      "ACTUAL_REF: refs/heads/main",
    ),
    replaceInWorkflowStep(
      workflow,
      "Guard manual dispatch identity",
      "Check out exact source",
      "ACTUAL_SHA: ${{ github.sha }}",
      "ACTUAL_SHA: ${{ inputs.expected_sha }}",
    ),
    replaceRequired(
      workflow,
      'test "$ACTUAL_REPOSITORY" = "kimyeongwoo/kyw-dev"',
      "true",
    ),
    replaceRequired(workflow, 'test "$ACTUAL_REF" = "refs/heads/main"', "true"),
    replaceRequired(workflow, 'test "$ACTUAL_SHA" = "$EXPECTED_SHA"', "true"),
    replaceRequired(workflow, 'test "${#EXPECTED_SHA}" -eq 40', "true"),
    replaceRequired(workflow, '*[!0-9a-f]*|"")', "*)"),
    replaceRequired(
      workflow,
      "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$",
      "^.*$",
    ),
    replaceRequired(
      workflow,
      "ref: ${{ inputs.expected_sha }}",
      "ref: ${{ github.sha }}",
    ),
    replaceRequired(workflow, 'test "$actual_sha" = "$EXPECTED_SHA"', "true"),
    replaceInWorkflowStep(
      workflow,
      "Guard checkout, runtime, and package identity",
      "Require registry version absence",
      "          set -euo pipefail\n",
      "",
    ),
    replaceRequired(
      workflow,
      'ACTUAL_SHA="$actual_sha" node --input-type=module',
      'ACTUAL_SHA="$EXPECTED_SHA" node --input-type=module',
    ),
    replaceInWorkflowStep(
      workflow,
      "Guard checkout, runtime, and package identity",
      "Require registry version absence",
      "EXPECTED_SHA: ${{ inputs.expected_sha }}",
      "EXPECTED_SHA: ${{ github.sha }}",
    ),
    replaceInWorkflowStep(
      workflow,
      "Guard checkout, runtime, and package identity",
      "Require registry version absence",
      "EXPECTED_VERSION: ${{ inputs.expected_version }}",
      "EXPECTED_VERSION: 0.0.0",
    ),
    replaceRequired(
      workflow,
      "const expectedVersion = process.env.EXPECTED_VERSION;",
      "const expectedVersion = packageJson.version;",
    ),
    replaceRequired(
      workflow,
      "const actualSha = process.env.ACTUAL_SHA;",
      "const actualSha = expectedSha;",
    ),
    replaceRequired(
      workflow,
      'const packageJson = JSON.parse(readFileSync("package.json", "utf8"));',
      'const packageJson = { name: "kyw-dev", version: expectedVersion };',
    ),
    replaceRequired(
      workflow,
      'readFileSync(".codex-plugin/plugin.json", "utf8")',
      'JSON.stringify({ name: packageJson.name, version: packageJson.version })',
    ),
    replaceRequired(
      workflow,
      'const npmVersion = execFileSync("npm", ["--version"], {',
      'const npmVersion = execFileSync("node", ["--version"], {',
    ),
    replaceRequired(
      workflow,
      'numericVersion(process.versions.node, "Node.js")',
      'numericVersion("24.0.0", "Node.js")',
    ),
    replaceRequired(workflow, 'packageJson.name !== "kyw-dev"', "false"),
    replaceRequired(workflow, "packageJson.version !== expectedVersion", "false"),
    replaceRequired(workflow, "pluginJson.name !== packageJson.name", "false"),
    replaceRequired(workflow, "pluginJson.version !== packageJson.version", "false"),
    replaceRequired(
      workflow,
      '"git+https://github.com/kimyeongwoo/kyw-dev.git"',
      '"git+https://example.invalid/kyw-dev.git"',
    ),
    replaceRequired(workflow, 'packageJson.publishConfig?.access !== "public"', "false"),
    replaceRequired(
      workflow,
      'packageJson.publishConfig?.registry !== "https://registry.npmjs.org/"',
      "false",
    ),
    replaceRequired(workflow, "[22, 14, 0]", "[0, 0, 0]"),
    replaceRequired(workflow, "[11, 5, 1]", "[0, 0, 0]"),
    replaceRequired(workflow, '"dependencies" in packageJson', "false"),
    replaceRequired(workflow, '"devDependencies" in packageJson', "false"),
    replaceRequired(workflow, 'existsSync(".npmrc")', "false"),
    replaceRequired(workflow, '            "publish",\n', ""),
    replaceRequired(workflow, "persist-credentials: false", "persist-credentials: true"),
    replaceRequired(workflow, "package-manager-cache: false", "package-manager-cache: true"),
    replaceRequired(workflow, checkoutPin, "v6"),
    replaceRequired(workflow, setupNodePin, "v6"),
    replaceRequired(workflow, "permissions: {}", "permissions:\n  id-token: write"),
    replaceRequired(workflow, "      contents: read\n", ""),
    replaceRequired(workflow, "      id-token: write\n", ""),
    replaceRequired(
      workflow,
      "      contents: read\n      id-token: write\n",
      "      contents: read\n      packages: read\n      id-token: write\n",
    ),
    replaceRequired(
      workflow,
      '  NPM_CONFIG_PROVENANCE: "true"\n',
      '  NPM_CONFIG_PROVENANCE: "true"\n  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}\n',
    ),
    replaceRequired(
      workflow,
      '  NPM_CONFIG_FETCH_RETRIES: "0"',
      '  NPM_CONFIG_FETCH_RETRIES: "1"',
    ),
    replaceRequired(
      workflow,
      '  NPM_CONFIG_PROVENANCE: "true"',
      '  NPM_CONFIG_PROVENANCE: "false"',
    ),
    replaceRequired(workflow, "cancel-in-progress: false", "cancel-in-progress: true"),
    replaceRequired(workflow, "response.status === 404", "response.status >= 400"),
    replaceRequired(workflow, "else if (response.ok)", "else if (false)"),
    replaceInWorkflowStep(
      workflow,
      "Require registry version absence",
      "Reconfirm exact checkout before OIDC publication",
      "EXPECTED_VERSION: ${{ inputs.expected_version }}",
      "EXPECTED_VERSION: 0.0.0",
    ),
    replaceRequired(
      workflow,
      "const version = process.env.EXPECTED_VERSION;",
      'const version = "0.0.0";',
    ),
    replaceRequired(
      workflow,
      "${encodeURIComponent(packageName)}/${encodeURIComponent(version)}",
      "${encodeURIComponent(packageName)}/0.0.0",
    ),
    replaceRequired(
      workflow,
      '          registryUrl.searchParams.set(\n            "kyw-run",\n            `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,\n          );\n',
      "",
    ),
    replaceRequired(workflow, '              "cache-control": "no-cache",\n', ""),
    replaceRequired(
      workflow,
      "const response = await fetch(registryUrl, {",
      'const response = await fetch("https://registry.npmjs.org/kyw-dev/0.0.0", {',
    ),
    replaceRequired(
      workflow,
      '            "https://registry.npmjs.org/",',
      '            "https://registry.example.invalid/",',
    ),
    replaceRequired(
      workflow,
      'test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"',
      "true",
    ),
    replaceInWorkflowStep(
      workflow,
      "Reconfirm exact checkout before OIDC publication",
      "Publish the exact checkout directory through OIDC",
      "          set -euo pipefail\n",
      "",
    ),
    replaceInWorkflowStep(
      workflow,
      "Reconfirm exact checkout before OIDC publication",
      "Publish the exact checkout directory through OIDC",
      "EXPECTED_SHA: ${{ inputs.expected_sha }}",
      "EXPECTED_SHA: ${{ github.sha }}",
    ),
    replaceRequired(
      workflow,
      'test -z "$(git status --porcelain --untracked-files=all)"',
      "true",
    ),
    replaceRequired(workflow, "test ! -e .npmrc", "true"),
  ];

  const forbiddenSteps = [
    ["Rerun Stable verification", "npm run check"],
    [
      "Create a retained candidate",
      "node ./scripts/packed-release-check.mjs --retain-candidate",
    ],
    [
      "Clean a retained candidate",
      'node ./scripts/packed-release-check.mjs --cleanup-candidate "$CANDIDATE_ROOT"',
    ],
    ["Run a registry dry run", "npm publish --dry-run --json"],
    [
      "Run the release evidence runner",
      "node ./scripts/release-evidence-manual-runner.mjs --run",
    ],
    ["Run the release evidence harness", "node ./scripts/release-evidence-harness.mjs"],
    ["Run release isolation", "node ./scripts/release-gate-isolation.mjs"],
    ["Authenticate to npm", "npm login"],
    ["Mutate the dist tag", "npm dist-tag add kyw-dev@0.1.3 latest"],
    ["Create a Git tag", "git tag v0.1.3"],
    ["Create a GitHub Release", "gh release create v0.1.3"],
    ["Dispatch another workflow", "gh workflow run publish.yml"],
    ["Create ignored npm configuration", "printf 'registry=https://example.invalid/' > .npmrc"],
  ].map(([name, command]) => insertStepBeforePublish(workflow, name, command));

  const publishPathWeakenings = [
    replaceRequired(
      workflow,
      "run: npm publish .",
      "run: npm publish . || npm publish .",
    ),
    replaceRequired(
      workflow,
      "run: npm publish .",
      'run: npm publish "$CANDIDATE_TARBALL"',
    ),
    replaceRequired(
      workflow,
      "run: npm publish .",
      "run: npm stage publish .",
    ),
    replaceRequired(
      workflow,
      " --access public --ignore-scripts --registry=https://registry.npmjs.org/",
      " --access public --registry=https://registry.npmjs.org/",
    ),
    insertStepBeforePublish(
      workflow,
      "Publish through a duplicate path",
      "npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/",
    ),
    replaceRequired(
      workflow,
      "\n  publish:\n",
      "\n  alternate_publish:\n    runs-on: ubuntu-latest\n    steps: []\n\n  publish:\n",
    ),
  ];
  const variants = [...weakenedGuards, ...forbiddenSteps, ...publishPathWeakenings];
  for (const [index, variant] of variants.entries()) {
    assert.throws(
      () => assertPublishWorkflowContract(variant),
      `workflow weakening ${index + 1} must fail closed`,
    );
  }
});
