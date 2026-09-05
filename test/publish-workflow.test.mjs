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
const inputNames = [
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
  "expected_signing_key_ids",
];
const stepNames = [
  "Guard manual dispatch identity",
  "Check out exact source",
  "Set up supported Node.js",
  "Guard checkout, runtime, and package identity",
  "Require frozen packed artifact and registry preconditions",
  "Require latest canonical CI before publication",
  "Publish the exact checkout directory through OIDC",
];

function occurrences(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function stepBlock(text, name, nextName) {
  const marker = `      - name: ${name}\n`;
  const start = text.indexOf(marker);
  const end = nextName
    ? text.indexOf(`      - name: ${nextName}\n`, start + marker.length)
    : text.length;
  assert.ok(start >= 0 && end > start, `missing bounded workflow step: ${name}`);
  return text.slice(start, end);
}

function assertRequiredFragments(text, fragments) {
  for (const fragment of fragments) {
    assert.ok(text.includes(fragment), `missing workflow contract fragment: ${fragment}`);
  }
}

function assertPublishWorkflowContract(text) {
  assert.equal(text.includes("\r"), false);
  assert.match(text, /^name: Publish npm package through OIDC\n/);

  const triggerStart = text.indexOf("\non:\n");
  const permissionsStart = text.indexOf("\npermissions: {}\n");
  assert.ok(triggerStart >= 0 && permissionsStart > triggerStart);
  const trigger = text.slice(triggerStart, permissionsStart);
  assert.deepEqual(
    [...trigger.matchAll(/^      ([a-z0-9_]+):$/gm)].map(([, name]) => name),
    inputNames,
  );
  assert.equal(occurrences(trigger, /^  workflow_dispatch:$/gm), 1);
  assert.doesNotMatch(
    trigger,
    /^  (?:push|pull_request|schedule|workflow_call|workflow_run|repository_dispatch):/m,
  );
  for (const [index, name] of inputNames.entries()) {
    const start = trigger.indexOf(`      ${name}:\n`);
    const end = inputNames[index + 1]
      ? trigger.indexOf(`      ${inputNames[index + 1]}:\n`, start + name.length)
      : trigger.length;
    const block = trigger.slice(start, end);
    assert.match(block, new RegExp(`^        required: ${name === "expected_signing_key_ids" ? "false" : "true"}$`, "m"));
    assert.match(block, /^        type: string$/m);
  }

  assert.equal(occurrences(text, /^[ \t]*permissions:/gm), 2);
  assert.match(text, /^permissions: {}$/m);
  assert.deepEqual(
    [...text.matchAll(/^      ([a-z-]+): (read|write)$/gm)].map(
      ([, permission, access]) => ({ permission, access }),
    ),
    [
      { permission: "actions", access: "read" },
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

  const jobsText = text.slice(text.indexOf("\njobs:\n") + "\njobs:\n".length);
  assert.deepEqual(
    [...jobsText.matchAll(/^  ([A-Za-z_][A-Za-z0-9_-]*):$/gm)].map(([, job]) => job),
    ["publish"],
  );
  assert.deepEqual(
    [...jobsText.matchAll(/^      - name: (.+)$/gm)].map(([, name]) => name),
    stepNames,
  );

  const dispatch = stepBlock(text, stepNames[0], stepNames[1]);
  const source = stepBlock(text, stepNames[3], stepNames[4]);
  const prepublish = stepBlock(text, stepNames[4], stepNames[5]);
  const ciGate = stepBlock(text, stepNames[5], stepNames[6]);
  const publish = stepBlock(text, stepNames[6]);
  assertRequiredFragments(ciGate, [
    "GITHUB_TOKEN: ${{ github.token }}", "EXPECTED_SHA: ${{ inputs.expected_sha }}",
    "run: node ./scripts/publish-gate.mjs",
  ]);
  assert.match(publish, /^        run: npm publish \. --access public --ignore-scripts --registry=https:\/\/registry\.npmjs\.org\/$/m);
  assert.doesNotMatch(ciGate + publish, /^\s+if:|continue-on-error/m);
  assertRequiredFragments(dispatch, [
    "ACTUAL_EVENT: ${{ github.event_name }}",
    "ACTUAL_REF: ${{ github.ref }}",
    "ACTUAL_REPOSITORY: ${{ github.repository }}",
    "ACTUAL_SHA: ${{ github.sha }}",
    'test "$ACTUAL_EVENT" = "workflow_dispatch"',
    `test "$ACTUAL_REPOSITORY" = "${TRUSTED_PUBLISHER_EXPECTATION.repositoryFullName}"`,
    'test "$ACTUAL_REF" = "refs/heads/main"',
    'test "$ACTUAL_SHA" = "$EXPECTED_SHA"',
    'test "${#EXPECTED_SHA}" -eq 40',
    "(( ${#EXPECTED_VERSION} > 64 ))",
    '[[ "$EXPECTED_TARBALL_BYTES" =~ ^[1-9][0-9]*$ ]]',
    "(( ${#EXPECTED_TARBALL_BYTES} > 7 ))",
    "(( EXPECTED_TARBALL_BYTES > 8388608 ))",
    '[[ "$digest" =~ ^[0-9a-f]{64}$ ]]',
    '[[ "$EXPECTED_TARBALL_SHASUM" =~ ^[0-9a-f]{40}$ ]]',
    '[[ "$EXPECTED_TARBALL_INTEGRITY" =~ ^sha512-[A-Za-z0-9+/]+={0,2}$ ]]',
    '[ "${#EXPECTED_TARBALL_INTEGRITY}" -ne 95 ]',
    "expected_packed_entries_sha256=%s",
    "expected_prior_versions_sha256=%s",
    "expected_prior_latest=%s",
    "expected_signing_key_id=%s",
    '[[ "$EXPECTED_SIGNING_KEY_ID" =~ ^[^[:space:]]{1,256}$ ]]',
  ]);
  for (const name of inputNames) {
    const envName = name.toUpperCase();
    assert.ok(
      dispatch.includes(`${envName}: \${{ inputs.${name} }}`),
      `missing dispatch input projection: ${name}`,
    );
  }

  assertRequiredFragments(source, [
    "EXPECTED_SHA: ${{ inputs.expected_sha }}",
    "EXPECTED_VERSION: ${{ inputs.expected_version }}",
    "EXPECTED_REPOSITORY: ${{ github.repository }}",
    'actual_sha="$(git rev-parse HEAD)"',
    'test "$actual_sha" = "$EXPECTED_SHA"',
    'const packageJson = JSON.parse(readFileSync("package.json", "utf8"));',
    'readFileSync(".codex-plugin/plugin.json", "utf8")',
    'execFileSync("npm", ["--version"]',
    'typeof packageJson.name !== "string"',
    'Buffer.byteLength(packageJson.name, "utf8") > 214',
    "packageJson.version !== expectedVersion",
    '`git+https://github.com/${expectedRepository}.git`',
    "Object.keys(packageJson.publishConfig).sort()",
    '\'["access","registry"]\'',
    'packageJson.publishConfig.access !== "public"',
    'packageJson.publishConfig.registry !== "https://registry.npmjs.org/"',
    'existsSync(".npmrc")',
    "[22, 14, 0]",
    "[11, 5, 1]",
  ]);
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "bundledDependencies",
    "bundleDependencies",
  ]) {
    assert.ok(source.includes(`"${field}" in packageJson`));
  }
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
    assert.match(source, new RegExp(`^            "${scriptName}",$`, "m"));
  }

  for (const name of inputNames) {
    const envName = name.toUpperCase();
    assert.ok(
      prepublish.includes(`${envName}: \${{ inputs.${name} }}`),
      `missing prepublish input projection: ${name}`,
    );
  }
  assertRequiredFragments(prepublish, [
    "          set -euo pipefail",
    '"kyw-public-release/packed-entry-set/v1\\n"',
    '"kyw-public-release/prior-version-set/v1\\n"',
    '["pack", "--json", "--ignore-scripts", "--pack-destination", packRoot]',
    "statSync(archivePath).size",
    "archiveSize > 8 * 1024 * 1024",
    'createHash("sha512").update(archive).digest("base64")',
    'createHash("sha1").update(archive).digest("hex")',
    'createHash("sha256").update(archive).digest("hex")',
    "safePackedEntries(report)",
    "actualIntegrity !== process.env.EXPECTED_TARBALL_INTEGRITY",
    "actualShasum !== process.env.EXPECTED_TARBALL_SHASUM",
    "actualSha256 !== process.env.EXPECTED_TARBALL_SHA256",
    "actualEntriesDigest !== process.env.EXPECTED_PACKED_ENTRIES_SHA256",
    'const registryUrl = new URL(encodeURIComponent(packageName), "https://registry.npmjs.org/");',
    '"cache-control": "no-cache"',
    "for await (const chunk of response.body)",
    "bytes > maxBytes",
    "packageIndex.name !== packageName",
    "priorVersions.includes(version)",
    "priorVersions.length > 1024",
    'Buffer.byteLength(JSON.stringify(priorVersions), "utf8") > 128 * 1024',
    "compareStableVersions(version, prior) <= 0",
    "digestStringSet(priorVersions, priorVersionDomain)",
    "actualPriorDigest !== process.env.EXPECTED_PRIOR_VERSIONS_SHA256",
    "actualPriorLatest !== expectedPriorLatest",
    "actualPriorLatest !== highestPriorVersion",
    'const keysUrl = new URL("-/npm/v1/keys", "https://registry.npmjs.org/")',
    "!Array.isArray(keyIndex.keys)",
    "keyIndex.keys.some(",
    "function isCanonicalSupportedSpki(value)",
    'der.toString("base64") !== value',
    "createPublicKey({",
    'verifySignature("sha256", Buffer.alloc(0), publicKey, Buffer.alloc(0))',
    "!isCanonicalSupportedSpki(key.key)",
    "new Set(keyIndex.keys.map((key) => key.keyid)).size !== keyIndex.keys.length",
    "!activeKeys.some((key) => key.keyid === process.env.EXPECTED_SIGNING_KEY_ID)",
    "requireFrozenSigningKeys(process.env.EXPECTED_SIGNING_KEY_IDS",
    'redirect: "error"',
    'GITHUB_TOKEN: ${{ github.token }}',
    "REPOSITORY: ${{ github.repository }}",
    'const packageName = JSON.parse(readFileSync("package.json", "utf8")).name',
    "const repository = process.env.REPOSITORY",
    "await requireSafePublishAttempt({",
    "read: githubReader(process.env.GITHUB_TOKEN), sha: expectedSha",
    "matchingTags.length !== 0",
    "releaseResponse.status !== 404",
    'test "$(git rev-parse HEAD)" = "${{ inputs.expected_sha }}"',
    'test -z "$(git status --porcelain --untracked-files=all)"',
    "test ! -e .npmrc",
  ]);

  assert.deepEqual(
    [...text.matchAll(/uses: ([^@\s]+)@([0-9a-f]{40}) # (v[^\s]+)/g)].map(
      ([, action, sha, version]) => ({ action, sha, version }),
    ),
    [
      { action: "actions/checkout", sha: checkoutPin, version: "v6.1.0" },
      { action: "actions/setup-node", sha: setupNodePin, version: "v6.5.0" },
    ],
  );
  assert.equal(occurrences(text, /persist-credentials: false/g), 1);
  assert.equal(occurrences(text, /package-manager-cache: false/g), 1);
  assert.equal(occurrences(text, /await fetchRead\(/g), 4);
  assert.equal(occurrences(text, /redirect: "error"/g), 4);
  assert.equal(occurrences(text, /\["pack", "--json", "--ignore-scripts"/g), 1);
  assert.equal(occurrences(text, /^        run: npm publish /gm), 1);
  assert.equal(occurrences(text, /^        run: node \.\/scripts\/publish-gate\.mjs$/gm), 1);
  assert.match(
    text,
    /^        run: node \.\/scripts\/publish-gate\.mjs$/m,
  );
  assert.equal(
    text.slice(text.lastIndexOf("      - name:")).startsWith(
      "      - name: Publish the exact checkout directory through OIDC\n",
    ),
    true,
  );
  assert.match(text, /^  NPM_CONFIG_FETCH_RETRIES: "0"$/m);
  assert.match(text, /^  NPM_CONFIG_PROVENANCE: "true"$/m);
  assert.match(text, /^  NPM_CONFIG_LOGS_MAX: "0"$/m);

  assert.doesNotMatch(
    text,
    /\bsecrets\.|NODE_AUTH_TOKEN|NPM_TOKEN|npmAuthToken|_authToken|\botp\b|security[- ]key|(?:^|\n)\s*(?:run:\s*)?npm (?:login|logout|adduser|whoami|trust|token|config)\b/im,
  );
  assert.doesNotMatch(
    text,
    /continue-on-error|\bretry\b|npm stage publish|npm dist-tag|npm version(?:\s|$)|git tag|git push --tags|gh release|gh workflow run|workflow_call|uses:\s+\.\//i,
  );
  assert.doesNotMatch(
    text,
    /CANDIDATE_TARBALL|npm publish [^\n]*\.tgz|packageJson\.gitHead|["']gitHead["']\s*:|method:\s*["'](?:PUT|PATCH|DELETE)["']/i,
  );
}

test("trusted publishing workflow binds one exact frozen public-release tuple", () => {
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

test("workflow regression guards reject identity, artifact, registry, and write weakenings", () => {
  const uniqueRequiredFragments = [
    "        required: true\n",
    "permissions: {}",
    "cancel-in-progress: false",
    "persist-credentials: false",
    "package-manager-cache: false",
    'test "$ACTUAL_REPOSITORY" = "kimyeongwoo/kyw-dev"',
    'test "$ACTUAL_REF" = "refs/heads/main"',
    'test "$ACTUAL_SHA" = "$EXPECTED_SHA"',
    "Object.keys(packageJson.publishConfig).sort()",
    "(( EXPECTED_TARBALL_BYTES > 8388608 ))",
    "(( ${#EXPECTED_TARBALL_BYTES} > 7 ))",
    '"optionalDependencies" in packageJson',
    '"peerDependencies" in packageJson',
    '"bundledDependencies" in packageJson',
    '["pack", "--json", "--ignore-scripts", "--pack-destination", packRoot]',
    "statSync(archivePath).size",
    "actualIntegrity !== process.env.EXPECTED_TARBALL_INTEGRITY",
    "actualShasum !== process.env.EXPECTED_TARBALL_SHASUM",
    "actualSha256 !== process.env.EXPECTED_TARBALL_SHA256",
    "actualEntriesDigest !== process.env.EXPECTED_PACKED_ENTRIES_SHA256",
    "packageIndex.name !== packageName",
    "priorVersions.includes(version)",
    "priorVersions.length > 1024",
    "actualPriorLatest !== highestPriorVersion",
    "!isCanonicalSupportedSpki(key.key)",
    "new Set(keyIndex.keys.map((key) => key.keyid)).size !== keyIndex.keys.length",
    "!activeKeys.some((key) => key.keyid === process.env.EXPECTED_SIGNING_KEY_ID)",
    'redirect: "error"',
    "actualPriorDigest !== process.env.EXPECTED_PRIOR_VERSIONS_SHA256",
    "actualPriorLatest !== expectedPriorLatest",
    'test -z "$(git status --porcelain --untracked-files=all)"',
    "test ! -e .npmrc",
  ];
  const weakened = uniqueRequiredFragments.map((fragment) => {
    const variant = workflow.replaceAll(fragment, "REMOVED_CONTRACT_GUARD");
    assert.notEqual(variant, workflow, `mutation source is missing: ${fragment}`);
    return variant;
  });
  weakened.push(
    workflow.replace("  workflow_dispatch:\n", "  push:\n  workflow_dispatch:\n"),
    workflow.replace(checkoutPin, "v6"),
    workflow.replace(setupNodePin, "v6"),
    workflow.replace(
      "      id-token: write\n",
      "      packages: write\n      id-token: write\n",
    ),
    workflow.replace(
      "run: npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/",
      "run: npm publish . || npm publish .",
    ),
    workflow.replace(
      "run: npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/",
      "run: npm publish ./kyw-dev.tgz",
    ),
    workflow.replace("run: node ./scripts/publish-gate.mjs", "run: node ./scripts/unrelated-gate.mjs"),
    workflow.replace(
      "      - name: Publish the exact checkout directory through OIDC\n",
      "      - name: Publish the exact checkout directory through OIDC\n        if: always()\n",
    ),
    workflow.replace(
      '  NPM_CONFIG_PROVENANCE: "true"',
      '  NPM_CONFIG_PROVENANCE: "false"',
    ),
    workflow.replace(
      "      - name: Publish the exact checkout directory through OIDC\n",
      "      - name: Retry publication\n        run: npm publish .\n\n      - name: Publish the exact checkout directory through OIDC\n",
    ),
  );
  for (const [index, variant] of weakened.entries()) {
    assert.throws(
      () => assertPublishWorkflowContract(variant),
      `workflow weakening ${index + 1} must fail closed`,
    );
  }
});
