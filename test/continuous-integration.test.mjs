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

function jobBody(name, nextName) {
  const startMarker = `  ${name}:\n`;
  const start = workflow.indexOf(startMarker);
  assert.notEqual(start, -1, `missing workflow job: ${name}`);
  const end = nextName ? workflow.indexOf(`  ${nextName}:\n`, start + startMarker.length) : workflow.length;
  assert.notEqual(end, -1, `missing workflow job after ${name}: ${nextName}`);
  return workflow.slice(start, end);
}

test("CI triggers, permissions, concurrency, and credentials are safe for public pull requests", () => {
  assert.equal(gitAttributes, "* text=auto eol=lf\n");
  assert.match(workflow, /^name: CI\n\non:\n  pull_request:\n  push:\n    branches:\n      - main\n  workflow_dispatch:\n/m);
  assert.match(workflow, /\npermissions:\n  contents: read\n/);
  assert.match(
    workflow,
    /\nconcurrency:\n  group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}\n  cancel-in-progress: true\n/,
  );
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
  assert.match(stable, /uses: actions\/checkout@v6/);
  assert.match(stable, /uses: actions\/setup-node@v6/);
  assert.match(stable, /timeout-minutes: 20/);
  assert.match(stable, /fail-fast: false/);
  assert.doesNotMatch(stable, /npm (?:ci|install)/);
});

test("packed release and aggregate gates are credential-free and agree with package scripts", () => {
  const packed = jobBody("packed-release", "required");
  const required = jobBody("required");
  assert.match(packed, /runs-on: ubuntu-latest/);
  assert.match(packed, /node-version: 24\.x/);
  assert.match(packed, /timeout-minutes: 25/);
  assert.match(packed, /run: npm run release:ci/);
  assert.match(required, /if: \$\{\{ always\(\) \}\}/);
  assert.match(required, /- stable\n      - packed-release/);
  assert.match(required, /timeout-minutes: 5/);
  assert.equal(
    packageJson.scripts["release:ci"],
    "npm run check && node ./scripts/packed-release-check.mjs",
  );
  assert.equal(
    packageJson.scripts["release:check"],
    "npm run release:ci && npm publish --dry-run --json",
  );
  assert.doesNotMatch(packed, /npm publish|secrets\./);
});
