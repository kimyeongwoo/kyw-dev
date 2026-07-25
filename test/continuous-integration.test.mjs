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
      uses: 2,
    }),
  ],
  [
    "actions/setup-node",
    Object.freeze({
      sha: "249970729cb0ef3589644e2896645e5dc5ba9c38",
      version: "v6.5.0",
      uses: 2,
    }),
  ],
]);

function jobBody(name, nextName) {
  const startMarker = `  ${name}:\n`;
  const start = workflow.indexOf(startMarker);
  assert.notEqual(start, -1, `missing workflow job: ${name}`);
  const end = nextName ? workflow.indexOf(`  ${nextName}:\n`, start + startMarker.length) : workflow.length;
  assert.notEqual(end, -1, `missing workflow job after ${name}: ${nextName}`);
  return workflow.slice(start, end);
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
  assert.equal(references.length, 4, "every external Action use must be provenance-checked");

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

test("CI triggers, permissions, concurrency, and credentials are safe for public pull requests", () => {
  assert.equal(gitAttributes, "* text=auto eol=lf\n");
  assert.match(workflow, /^name: CI\n\non:\n  pull_request:\n  push:\n    branches:\n      - main\n  workflow_dispatch:\n/m);
  assert.match(workflow, /\npermissions:\n  contents: read\n/);
  assertEventScopedConcurrency(workflow);
  assertImmutableOfficialActionPins(workflow);
  assert.doesNotMatch(workflow, /pull_request_target|\bsecrets\.|\bpermissions:[\s\S]*?\bwrite\b/);
  assert.doesNotMatch(workflow, /npm publish|npm token|NODE_AUTH_TOKEN|CODEX_(?:API_KEY|HOME)/i);
  assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 2);
  assert.equal((workflow.match(/package-manager-cache: false/g) ?? []).length, 2);
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
});

test("packed release and aggregate gates are credential-free and agree with package scripts", () => {
  const packed = jobBody("packed-release", "required");
  const required = jobBody("required");
  assert.match(packed, /runs-on: ubuntu-latest/);
  assert.match(packed, /node-version: 24\.x/);
  assert.match(packed, /timeout-minutes: 25/);
  assert.match(packed, /run: npm run release:candidate/);
  assert.doesNotMatch(packed, /run: npm run (?:check|release:ci)/);
  assert.match(required, /if: \$\{\{ always\(\) \}\}/);
  assert.match(required, /- stable\n      - packed-release/);
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
