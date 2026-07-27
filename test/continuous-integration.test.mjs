import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const gitAttributes = readFileSync(
  fileURLToPath(new URL("../.gitattributes", import.meta.url)),
  "utf8",
);
const workflow = readFileSync(
  fileURLToPath(new URL("../.github/workflows/ci.yml", import.meta.url)),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
);

const expectedConcurrency = Object.freeze({
  group:
    "${{ github.workflow }}-${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || github.event_name == 'push' && format('push-{0}', github.sha) || format('manual-{0}', github.run_id) }}",
  cancelInProgress: "${{ github.event_name == 'pull_request' }}",
});
const expectedActionPins = new Map([
  [
    "actions/checkout",
    Object.freeze({
      sha: "d23441a48e516b6c34aea4fa41551a30e30af803",
      version: "v6.1.0",
      uses: 3,
    }),
  ],
  [
    "actions/setup-node",
    Object.freeze({
      sha: "249970729cb0ef3589644e2896645e5dc5ba9c38",
      version: "v6.5.0",
      uses: 3,
    }),
  ],
]);

function jobBody(name, nextName, workflowText = workflow) {
  const startMarker = `  ${name}:\n`;
  const start = workflowText.indexOf(startMarker);
  assert.notEqual(start, -1, `missing workflow job: ${name}`);
  const end = nextName
    ? workflowText.indexOf(`  ${nextName}:\n`, start + startMarker.length)
    : workflowText.length;
  assert.notEqual(end, -1, `missing workflow job after ${name}: ${nextName}`);
  return workflowText.slice(start, end);
}

function stepBody(name, nextName, jobText) {
  const startMarker = `      - name: ${name}\n`;
  const start = jobText.indexOf(startMarker);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);
  const end = nextName
    ? jobText.indexOf(`      - name: ${nextName}\n`, start + startMarker.length)
    : jobText.length;
  assert.notEqual(end, -1, `missing workflow step after ${name}: ${nextName}`);
  return jobText.slice(start, end);
}

function assertEventScopedConcurrency(workflowText) {
  const match = /^concurrency:\n  group: (.+)\n  cancel-in-progress: (.+)$/m.exec(workflowText);
  assert.ok(match, "missing exact two-field workflow concurrency block");
  assert.equal(match[1], expectedConcurrency.group);
  assert.equal(match[2], expectedConcurrency.cancelInProgress);
}

function assertImmutableOfficialActionPins(workflowText) {
  const references = [
    ...workflowText.matchAll(
      /^\s*uses:\s+([^@\s]+)@([^\s#]+)(?:\s+#\s+(\S+))?\s*$/gm,
    ),
  ].map(([, action, ref, version]) => ({ action, ref, version }));
  assert.equal(references.length, 6, "every external Action use must be provenance-checked");

  const usesByAction = new Map();
  for (const reference of references) {
    const expected = expectedActionPins.get(reference.action);
    assert.ok(expected, `unverified external Action: ${reference.action}`);
    assert.match(reference.ref, /^[0-9a-f]{40}$/, `${reference.action} must use a full SHA`);
    assert.equal(reference.ref, expected.sha, `${reference.action} must use the verified commit`);
    assert.equal(
      reference.version,
      expected.version,
      `${reference.action} must retain its readable release comment`,
    );
    usesByAction.set(reference.action, (usesByAction.get(reference.action) ?? 0) + 1);
  }
  for (const [action, expected] of expectedActionPins) {
    assert.equal(usesByAction.get(action), expected.uses, `${action} use count changed`);
  }
}

function assertExactCheckoutEvidenceTopology(workflowText) {
  const stable = jobBody("stable", "packed-release", workflowText);
  const packed = jobBody("packed-release", "merge-compatibility", workflowText);
  const mergeCompatibility = jobBody(
    "merge-compatibility",
    "required",
    workflowText,
  );
  const required = jobBody("required", undefined, workflowText);
  const actualHeadRef =
    "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}";
  for (const [label, body] of [
    ["stable", stable],
    ["packed-release", packed],
  ]) {
    const checkout = stepBody(
      "Check out repository",
      "Assert checkout identity",
      body,
    );
    assert.equal(
      checkout.split(actualHeadRef).length - 1,
      1,
      `${label} must check out the event-specific exact SHA`,
    );
    assert.doesNotMatch(
      checkout,
      /fetch-depth:/,
      `${label} does not need parent history`,
    );
    assert.equal(
      checkout.match(/^      - name:/gm)?.length,
      1,
      `${label} must assert identity immediately after checkout`,
    );
    assert.match(body, /role=%s repository=%s event=%s pr=%s workflow=%s run_id=%s run_attempt=%s job=%s expected_sha=%s actual_sha=%s/);
    assert.match(body, /test "\$actual_sha" = "\$EXPECTED_SHA"/);
    assert.match(body, /'PR_ACTUAL_HEAD'/);
    assert.match(body, /'POST_MERGE_MAIN'/);
  }

  assert.match(
    mergeCompatibility,
    /if: \$\{\{ github\.event_name == 'pull_request' \}\}/,
  );
  const mergeCheckout = stepBody(
    "Check out synthetic merge",
    "Assert synthetic merge identity and parents",
    mergeCompatibility,
  );
  const mergeAssertion = stepBody(
    "Assert synthetic merge identity and parents",
    "Set up Node.js 24.x",
    mergeCompatibility,
  );
  assert.match(mergeCheckout, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(mergeCheckout, /^          fetch-depth: 2$/m);
  assert.equal(
    mergeCompatibility.match(/fetch-depth:/g)?.length,
    1,
    "merge compatibility must set history depth only on its synthetic checkout",
  );
  assert.match(mergeAssertion, /role=PR_MERGE_COMPATIBILITY/);
  assert.match(
    mergeAssertion,
    /EXPECTED_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/,
  );
  assert.match(
    mergeAssertion,
    /EXPECTED_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(mergeAssertion, /git show --no-patch --format=%P HEAD/);
  assert.match(
    mergeAssertion,
    /test "\$actual_sha" = "\$EXPECTED_SYNTHETIC_SHA"/,
  );
  assert.match(
    mergeAssertion,
    /test "\$actual_base_sha" = "\$EXPECTED_BASE_SHA"/,
  );
  assert.match(
    mergeAssertion,
    /test "\$actual_head_sha" = "\$EXPECTED_HEAD_SHA"/,
  );
  assert.match(mergeAssertion, /test -z "\$\{extra_parent:-\}"/);
  for (const command of [
    "npm test",
    "npm run lint",
    "npm run format:check",
    "npm run pack:check",
  ]) {
    assert.equal(
      mergeCompatibility.split(`run: ${command}`).length - 1,
      1,
      `merge compatibility must run ${command}`,
    );
  }

  assert.match(required, /- merge-compatibility/);
  assert.match(
    required,
    /MERGE_COMPATIBILITY_RESULT: \$\{\{ needs\.merge-compatibility\.result \}\}/,
  );
  assert.match(required, /test "\$MERGE_COMPATIBILITY_RESULT" = "success"/);
  assert.match(required, /test "\$MERGE_COMPATIBILITY_RESULT" = "skipped"/);
}

test("CI triggers, permissions, concurrency, and credentials are safe for public pull requests", () => {
  assert.equal(gitAttributes, "* text=auto eol=lf\n");
  assert.match(workflow, /^name: CI\n\non:\n  pull_request:\n  push:\n    branches:\n      - main\n  workflow_dispatch:\n/m);
  assert.match(workflow, /\npermissions:\n  contents: read\n/);
  assertEventScopedConcurrency(workflow);
  assertImmutableOfficialActionPins(workflow);
  assertExactCheckoutEvidenceTopology(workflow);
  assert.doesNotMatch(workflow, /pull_request_target|\bsecrets\.|\bpermissions:[\s\S]*?\bwrite\b/);
  assert.doesNotMatch(workflow, /npm publish|npm token|NODE_AUTH_TOKEN|CODEX_(?:API_KEY|HOME)/i);
  assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 3);
  assert.equal((workflow.match(/package-manager-cache: false/g) ?? []).length, 3);
});

test("CI runs every stable command on the complete LTS matrix and one bounded Node 26 lane", () => {
  assert.equal(packageJson.engines.node, ">=22");
  const stable = jobBody("stable", "packed-release");
  const lanes = [...stable.matchAll(/- label: (.+)\n\s+os: (.+)\n\s+node: (.+)/g)].map(
    ([, label, os, node]) => ({ label, os, node }),
  );
  assert.deepEqual(lanes, [
    { label: "Ubuntu / Node 22.x", os: "ubuntu-latest", node: "22.x" },
    { label: "macOS / Node 22.x", os: "macos-latest", node: "22.x" },
    { label: "Windows / Node 22.x", os: "windows-latest", node: "22.x" },
    { label: "Ubuntu / Node 24.x", os: "ubuntu-latest", node: "24.x" },
    { label: "macOS / Node 24.x", os: "macos-latest", node: "24.x" },
    { label: "Windows / Node 24.x", os: "windows-latest", node: "24.x" },
    {
      label: "Ubuntu / Node 26.x compatibility",
      os: "ubuntu-latest",
      node: "26.x",
    },
  ]);
  for (const command of ["npm test", "npm run lint", "npm run format:check", "npm run pack:check"]) {
    assert.equal(stable.split(`run: ${command}`).length - 1, 1, `stable job must run ${command}`);
  }
  assert.match(stable, /uses: actions\/checkout@[0-9a-f]{40} # v6\.1\.0/);
  assert.match(stable, /uses: actions\/setup-node@[0-9a-f]{40} # v6\.5\.0/);
  assert.match(stable, /timeout-minutes: 20/);
  assert.match(stable, /fail-fast: false/);
  assert.doesNotMatch(stable, /npm (?:ci|install)/);
});

test("CI regression guards reject movable Action refs and unsafe event concurrency", () => {
  const unsafeConcurrencyVariants = [
    workflow.replace("github.event.pull_request.number", "github.head_ref"),
    workflow.replace("format('push-{0}', github.sha)", "github.ref"),
    workflow.replace("format('manual-{0}', github.run_id)", "github.ref"),
    workflow.replace(expectedConcurrency.cancelInProgress, "true"),
  ];
  for (const variant of unsafeConcurrencyVariants) {
    assert.throws(() => assertEventScopedConcurrency(variant));
  }

  const movableActionVariants = [
    workflow.replace(expectedActionPins.get("actions/checkout").sha, "v6"),
    workflow.replace(expectedActionPins.get("actions/setup-node").sha, "v6"),
    workflow.replace(" # v6.1.0", ""),
  ];
  for (const variant of movableActionVariants) {
    assert.throws(() => assertImmutableOfficialActionPins(variant));
  }

  const exactEvidenceVariants = [
    workflow.replace(
      "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
      "ref: ${{ github.sha }}",
    ),
    workflow.replace('test "$actual_sha" = "$EXPECTED_SHA"', "true"),
    workflow.replace("role=PR_MERGE_COMPATIBILITY", "role=PR_ACTUAL_HEAD"),
    workflow.replace("          fetch-depth: 2\n", ""),
    workflow.replace("          fetch-depth: 2", "          fetch-depth: 1"),
    workflow
      .replace("          fetch-depth: 2\n", "")
      .replace(
        "          ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
        "          ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}\n          fetch-depth: 2",
      ),
    workflow
      .replace("          fetch-depth: 2\n", "")
      .replace(
        "          package-manager-cache: false",
        "          package-manager-cache: false\n          fetch-depth: 2",
      ),
    workflow
      .replace("          fetch-depth: 2\n", "")
      .replace(
        "      - name: Assert synthetic merge identity and parents\n        shell: bash",
        "      - name: Assert synthetic merge identity and parents\n        shell: bash\n        fetch-depth: 2",
      ),
    workflow.replace(
      'git show --no-patch --format=%P HEAD',
      'printf ""',
    ),
    workflow.replace(
      'test "$actual_sha" = "$EXPECTED_SYNTHETIC_SHA"',
      "true",
    ),
    workflow.replace('test "$actual_base_sha" = "$EXPECTED_BASE_SHA"', "true"),
    workflow.replace('test "$actual_head_sha" = "$EXPECTED_HEAD_SHA"', "true"),
    workflow.replace('test -z "${extra_parent:-}"', "true"),
    workflow.replace("      - merge-compatibility\n", ""),
    workflow.replace(
      'test "$MERGE_COMPATIBILITY_RESULT" = "success"',
      'test "$MERGE_COMPATIBILITY_RESULT" = "skipped"',
    ),
    workflow.replace(
      'test "$MERGE_COMPATIBILITY_RESULT" = "skipped"',
      'test "$MERGE_COMPATIBILITY_RESULT" = "success"',
    ),
  ];
  for (const variant of exactEvidenceVariants) {
    assert.throws(() => assertExactCheckoutEvidenceTopology(variant));
  }
});

test("packed release and aggregate gates are credential-free and agree with package scripts", () => {
  const packed = jobBody("packed-release", "merge-compatibility");
  const required = jobBody("required");
  assert.match(packed, /runs-on: ubuntu-latest/);
  assert.match(packed, /node-version: 24\.x/);
  assert.match(packed, /timeout-minutes: 25/);
  assert.match(packed, /run: npm run release:candidate/);
  assert.doesNotMatch(packed, /run: npm run (?:check|release:ci)/);
  assert.match(required, /if: \$\{\{ always\(\) \}\}/);
  assert.match(required, /- stable\n      - packed-release\n      - merge-compatibility/);
  assert.match(required, /timeout-minutes: 5/);
  assert.equal(
    packageJson.scripts["release:candidate"],
    "node ./scripts/packed-release-check.mjs",
  );
  assert.equal(
    packageJson.scripts["release:ci"],
    "npm run check && npm run release:candidate",
  );
  assert.equal(
    packageJson.scripts["release:check"],
    "npm run release:ci && npm publish --dry-run --json",
  );
  assert.doesNotMatch(packed, /npm publish|secrets\./);
});
