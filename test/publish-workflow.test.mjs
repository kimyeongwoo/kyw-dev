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
  for (const input of ["expected_sha", "expected_version"]) {
    assert.match(
      trigger,
      new RegExp(`^      ${input}:\\n[\\s\\S]*?^        required: true$`, "m"),
    );
    assert.match(
      trigger,
      new RegExp(`^      ${input}:\\n[\\s\\S]*?^        type: string$`, "m"),
    );
  }

  assert.equal(occurrenceCount(text, /^permissions:/gm), 1);
  assert.match(
    text,
    /\n    permissions:\n      contents: read\n      id-token: write\n/,
  );
  assert.deepEqual(
    [...text.matchAll(/^\s+([a-z-]+): write$/gm)].map(([, permission]) => permission),
    ["id-token"],
  );
  assert.match(
    text,
    /\nconcurrency:\n  group: kyw-dev-npm-publish\n  cancel-in-progress: false\n/,
  );
  assert.match(text, /^    runs-on: ubuntu-latest$/m);
  assert.match(text, /^    timeout-minutes: 30$/m);
  assert.match(
    text,
    new RegExp(`^    environment: ${TRUSTED_PUBLISHER_EXPECTATION.environment}$`, "m"),
  );
  assert.deepEqual(
    [...text.matchAll(/^  ([a-z][a-z-]+):$/gm)].map(([, job]) => job),
    ["publish"],
  );

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
    'test "$actual_sha" = "$EXPECTED_SHA"',
    "packageJson.version !== expectedVersion",
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

  assert.match(text, /^        run: npm run check$/m);
  assert.equal(
    occurrenceCount(text, /--retain-candidate/g),
    1,
  );
  assert.match(
    text,
    /node \.\/scripts\/packed-release-check\.mjs --retain-candidate/,
  );
  assert.equal(
    occurrenceCount(
      text,
      /node \.\/scripts\/packed-release-check\.mjs --cleanup-candidate/g,
    ),
    1,
  );
  assert.equal(occurrenceCount(text, /\bnpm pack\b/g), 0);
  for (const candidateGuard of [
    'candidate.kind !== "KYW_PACKED_RELEASE_CANDIDATE"',
    "candidate.retained !== true",
    'candidate.name !== "kyw-dev"',
    "candidate.version !== expectedVersion",
    "candidate.fileCount !== 43",
    "!isAbsolute(candidate.ownedRoot)",
    "!isAbsolute(candidate.archivePath)",
    "dirname(candidate.archivePath) !== join(candidate.ownedRoot, \"pack\")",
    "archive.size !== candidate.size",
  ]) {
    assert.ok(text.includes(candidateGuard), `missing candidate guard: ${candidateGuard}`);
  }

  assert.match(text, /response\.status === 404/);
  assert.match(text, /else if \(response\.ok\)/);
  assert.match(text, /Registry version \$\{packageName\}@\$\{version\} already exists/);
  assert.match(text, /Registry absence check was ambiguous with status/);
  assert.match(text, /^  NPM_CONFIG_FETCH_RETRIES: "0"$/m);
  assert.match(text, /^  NPM_CONFIG_PROVENANCE: "true"$/m);
  assert.match(text, /^  NPM_CONFIG_LOGS_MAX: "0"$/m);

  const stableIndex = text.indexOf("run: npm run check");
  const candidateIndex = text.indexOf("--retain-candidate");
  const absenceIndex = text.indexOf("- name: Require registry version absence");
  const reconfirmIndex = text.indexOf(
    "- name: Reconfirm exact checkout before OIDC publication",
  );
  const publishIndex = text.indexOf("run: npm publish .");
  const cleanupIndex = text.indexOf("--cleanup-candidate");
  assert.ok(
    stableIndex >= 0 &&
      stableIndex < candidateIndex &&
      candidateIndex < absenceIndex &&
      absenceIndex < reconfirmIndex &&
      reconfirmIndex < publishIndex &&
      publishIndex < cleanupIndex,
    "stable, candidate, absence, checkout, publish, and cleanup steps must stay ordered",
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
  assert.match(
    text,
    /^        if: \$\{\{ always\(\) && steps\.candidate\.outputs\.owned_root != '' \}\}$/m,
  );

  assert.doesNotMatch(
    text,
    /\bsecrets\.|NODE_AUTH_TOKEN|NPM_TOKEN|npmAuthToken|_authToken|\botp\b|security[- ]key|(?:^|\n)\s*(?:run:\s*)?npm (?:login|logout|adduser|whoami|trust|token|config)\b/im,
  );
  assert.doesNotMatch(
    text,
    /continue-on-error|retry|npm stage publish|npm dist-tag|npm version|git tag|gh release|gh workflow run|workflow_call|uses:\s+\.\//i,
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

test("workflow regression guards reject every authority, identity, candidate, and retry weakening", () => {
  const variants = [
    replaceRequired(
      workflow,
      "  workflow_dispatch:\n",
      "  push:\n    branches:\n      - main\n  workflow_dispatch:\n",
    ),
    replaceRequired(workflow, "environment: npm-production", "environment: production"),
    replaceRequired(workflow, 'test "$ACTUAL_EVENT" = "workflow_dispatch"', "true"),
    replaceRequired(workflow, 'test "$ACTUAL_REF" = "refs/heads/main"', "true"),
    replaceRequired(workflow, 'test "$ACTUAL_SHA" = "$EXPECTED_SHA"', "true"),
    replaceRequired(workflow, 'test "$actual_sha" = "$EXPECTED_SHA"', "true"),
    replaceRequired(workflow, "packageJson.version !== expectedVersion", "false"),
    replaceRequired(workflow, "pluginJson.version !== packageJson.version", "false"),
    replaceRequired(workflow, "persist-credentials: false", "persist-credentials: true"),
    replaceRequired(workflow, "package-manager-cache: false", "package-manager-cache: true"),
    replaceRequired(workflow, checkoutPin, "v6"),
    replaceRequired(workflow, "      id-token: write\n", ""),
    replaceRequired(
      workflow,
      '  NPM_CONFIG_PROVENANCE: "true"\n',
      '  NPM_CONFIG_PROVENANCE: "true"\n  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}\n',
    ),
    replaceRequired(workflow, "cancel-in-progress: false", "cancel-in-progress: true"),
    replaceRequired(workflow, "        run: npm run check\n", ""),
    replaceRequired(workflow, "--retain-candidate", "--retain-candidate --retain-candidate"),
    replaceRequired(workflow, "candidate.retained !== true", "false"),
    replaceRequired(workflow, "response.status === 404", "response.status >= 400"),
    replaceRequired(workflow, "else if (response.ok)", "else if (false)"),
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
      'test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"',
      "true",
    ),
    replaceRequired(
      workflow,
      "      - name: Publish the exact checkout directory through OIDC\n",
      "      - name: Authenticate to the npm account\n        run: npm trust list kyw-dev\n\n      - name: Publish the exact checkout directory through OIDC\n",
    ),
    replaceRequired(
      workflow,
      'run: node ./scripts/packed-release-check.mjs --cleanup-candidate "$CANDIDATE_ROOT"\n',
      "",
    ),
  ];
  for (const [index, variant] of variants.entries()) {
    assert.throws(
      () => assertPublishWorkflowContract(variant),
      `workflow weakening ${index + 1} must fail closed`,
    );
  }
});
