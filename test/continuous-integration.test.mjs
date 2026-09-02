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
      uses: 4,
    }),
  ],
  [
    "actions/setup-node",
    Object.freeze({
      sha: "249970729cb0ef3589644e2896645e5dc5ba9c38",
      version: "v6.5.0",
      uses: 4,
    }),
  ],
]);
const expectedBehavioralLanes = Object.freeze([
  Object.freeze({ label: "Ubuntu / Node 22.x", os: "ubuntu-latest", node: "22.x" }),
  Object.freeze({ label: "macOS / Node 22.x", os: "macos-latest", node: "22.x" }),
  Object.freeze({ label: "Windows / Node 22.x", os: "windows-latest", node: "22.x" }),
  Object.freeze({ label: "Ubuntu / Node 24.x", os: "ubuntu-latest", node: "24.x" }),
  Object.freeze({ label: "macOS / Node 24.x", os: "macos-latest", node: "24.x" }),
  Object.freeze({ label: "Windows / Node 24.x", os: "windows-latest", node: "24.x" }),
  Object.freeze({
    label: "Ubuntu / Node 26.x compatibility",
    os: "ubuntu-latest",
    node: "26.x",
  }),
]);
const baselinePullRequestTopology = Object.freeze({
  hostedJobInstances: 10,
  leafRepositoryCommands: 33,
  calculation:
    "7 Stable lanes × 4 commands + 1 packed command + 4 merge commands + Required",
});

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
  assert.equal(references.length, 8, "every external Action use must be provenance-checked");

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

function repositoryRunCommands(jobText) {
  return [...jobText.matchAll(/^        run: (npm (?:test|run [a-z][a-z:-]*))$/gm)].map(
    ([, command]) => command,
  );
}

function assertCredentialFreeWorkflow(workflowText) {
  assert.doesNotMatch(
    workflowText,
    /pull_request_target|\bsecrets\.|\bpermissions:[\s\S]*?\bwrite\b/,
  );
  assert.doesNotMatch(
    workflowText,
    /\bnpm publish\b|--dry-run|npm run release:check|npm (?:login|logout|adduser|whoami|view|trust|token|config)\b|NODE_AUTH_TOKEN|NPM_TOKEN|CODEX_(?:API_KEY|HOME)|release-evidence-(?:manual-runner|harness)\.mjs|release-gate-isolation\.mjs/i,
  );
}

function expandLeafCommands(commands, scripts = packageJson.scripts) {
  return commands.flatMap((command) => {
    if (command !== "npm run check") return [command];
    return scripts.check.split(" && ");
  });
}

function behavioralLanes(workflowText = workflow) {
  const behavioral = jobBody("behavioral", "quality", workflowText);
  return [...behavioral.matchAll(/- label: (.+)\n\s+os: (.+)\n\s+node: (.+)/g)].map(
    ([, label, os, node]) => ({ label, os, node }),
  );
}

function assertBehavioralMatrix(workflowText = workflow) {
  assert.deepEqual(behavioralLanes(workflowText), expectedBehavioralLanes);
}

function calculatePullRequestTopology(workflowText = workflow, scripts = packageJson.scripts) {
  const jobsText = workflowText.slice(workflowText.indexOf("\njobs:\n") + "\njobs:\n".length);
  const jobNames = [...jobsText.matchAll(/^  ([a-z][a-z-]+):$/gm)].map(
    ([, name]) => name,
  );
  const laneCount = behavioralLanes(workflowText).length;
  const hostedJobInstances = jobNames.reduce(
    (total, name) => total + (name === "behavioral" ? laneCount : 1),
    0,
  );
  const leafRepositoryCommands = jobNames.reduce((total, name, index) => {
    const body = jobBody(name, jobNames[index + 1], workflowText);
    const multiplier = name === "behavioral" ? laneCount : 1;
    return total + expandLeafCommands(repositoryRunCommands(body), scripts).length * multiplier;
  }, 0);
  return Object.freeze({ hostedJobInstances, leafRepositoryCommands });
}

function assertCommandTopology(workflowText = workflow, scripts = packageJson.scripts) {
  const behavioral = jobBody("behavioral", "quality", workflowText);
  const quality = jobBody("quality", "packed-release", workflowText);
  const packed = jobBody("packed-release", "merge-compatibility", workflowText);
  const mergeCompatibility = jobBody(
    "merge-compatibility",
    "required",
    workflowText,
  );
  const required = jobBody("required", undefined, workflowText);
  assert.deepEqual(repositoryRunCommands(behavioral), ["npm test"]);
  assert.deepEqual(repositoryRunCommands(quality), [
    "npm run lint",
    "npm run format:check",
    "npm run pack:check",
  ]);
  assert.deepEqual(repositoryRunCommands(packed), ["npm run release:candidate"]);
  assert.deepEqual(repositoryRunCommands(mergeCompatibility), ["npm run check"]);
  assert.deepEqual(repositoryRunCommands(required), []);
  assert.equal(
    scripts.check,
    "npm test && npm run lint && npm run format:check && npm run pack:check",
    "the complete combined-state wrapper must expose all four leaf commands",
  );

  const metrics = calculatePullRequestTopology(workflowText, scripts);
  assert.deepEqual(metrics, {
    hostedJobInstances: 11,
    leafRepositoryCommands: 15,
  });
  const reduction =
    ((baselinePullRequestTopology.leafRepositoryCommands -
      metrics.leafRepositoryCommands) /
      baselinePullRequestTopology.leafRepositoryCommands) *
    100;
  assert.ok(reduction >= 45, `leaf-command reduction ${reduction.toFixed(1)}% is below 45%`);
  return metrics;
}

function assertRequiredGateTopology(workflowText = workflow) {
  const required = jobBody("required", undefined, workflowText);
  assert.match(
    required,
    /needs:\n      - behavioral\n      - quality\n      - packed-release\n      - merge-compatibility/,
  );
  for (const [variable, need] of [
    ["BEHAVIORAL_RESULT", "behavioral"],
    ["QUALITY_RESULT", "quality"],
    ["PACKED_RESULT", "packed-release"],
    ["MERGE_COMPATIBILITY_RESULT", "merge-compatibility"],
  ]) {
    assert.match(
      required,
      new RegExp(`${variable}: \\$\\{\\{ needs\\.${need}\\.result \\}\\}`),
    );
  }
  for (const variable of ["BEHAVIORAL_RESULT", "QUALITY_RESULT", "PACKED_RESULT"]) {
    assert.match(required, new RegExp(`test "\\$${variable}" = "success"`));
  }
  assert.match(required, /if test "\$EVENT_NAME" = "pull_request"; then/);
  assert.match(required, /test "\$MERGE_COMPATIBILITY_RESULT" = "success"/);
  assert.match(required, /test "\$MERGE_COMPATIBILITY_RESULT" = "skipped"/);
}

function assertExactCheckoutEvidenceTopology(workflowText) {
  const behavioral = jobBody("behavioral", "quality", workflowText);
  const quality = jobBody("quality", "packed-release", workflowText);
  const packed = jobBody("packed-release", "merge-compatibility", workflowText);
  const mergeCompatibility = jobBody(
    "merge-compatibility",
    "required",
    workflowText,
  );
  const actualHeadRef =
    "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}";
  for (const [label, body] of [
    ["behavioral", behavioral],
    ["quality", quality],
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
    assert.match(
      body,
      /EXPECTED_SHA: \$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/,
    );
    assert.match(body, /'PR_ACTUAL_HEAD'/);
    assert.match(body, /'POST_MERGE_MAIN'/);
    assert.ok(
      body.indexOf("Assert checkout identity") < body.search(/^        run: npm /m),
      `${label} must prove checkout identity before its first repository command`,
    );
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
  assert.match(
    mergeAssertion,
    /read -r -a actual_parents <<<"\$\(git show --no-patch --format=%P HEAD\)"/,
  );
  assert.match(mergeAssertion, /test "\$\{#actual_parents\[@\]\}" -eq 2/);
  assert.match(mergeAssertion, /actual_base_sha="\$\{actual_parents\[0\]\}"/);
  assert.match(mergeAssertion, /actual_head_sha="\$\{actual_parents\[1\]\}"/);
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
  assert.deepEqual(repositoryRunCommands(mergeCompatibility), ["npm run check"]);
  assert.ok(
    mergeCompatibility.indexOf("Assert synthetic merge identity and parents") <
      mergeCompatibility.search(/^        run: npm /m),
    "merge compatibility must prove synthetic identity before the complete check",
  );
  assertRequiredGateTopology(workflowText);
}

test("CI triggers, permissions, concurrency, and credentials are safe for public pull requests", () => {
  assert.equal(gitAttributes, "* text=auto eol=lf\n");
  assert.match(workflow, /^name: CI\n\non:\n  pull_request:\n  push:\n    branches:\n      - main\n  workflow_dispatch:\n/m);
  assert.match(workflow, /\npermissions:\n  contents: read\n/);
  assertEventScopedConcurrency(workflow);
  assertImmutableOfficialActionPins(workflow);
  assertExactCheckoutEvidenceTopology(workflow);
  assertCredentialFreeWorkflow(workflow);
  assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 4);
  assert.equal((workflow.match(/package-manager-cache: false/g) ?? []).length, 4);
});

test("CI retains the complete behavioral matrix and isolates platform-independent quality", () => {
  assert.equal(packageJson.engines.node, ">=22");
  const behavioral = jobBody("behavioral", "quality");
  const quality = jobBody("quality", "packed-release");
  assertBehavioralMatrix();
  assert.deepEqual(repositoryRunCommands(behavioral), ["npm test"]);
  assert.deepEqual(repositoryRunCommands(quality), [
    "npm run lint",
    "npm run format:check",
    "npm run pack:check",
  ]);
  assert.match(behavioral, /uses: actions\/checkout@[0-9a-f]{40} # v6\.1\.0/);
  assert.match(behavioral, /uses: actions\/setup-node@[0-9a-f]{40} # v6\.5\.0/);
  assert.match(behavioral, /timeout-minutes: 20/);
  assert.match(behavioral, /fail-fast: false/);
  assert.match(quality, /name: Quality \/ Ubuntu \/ Node 24\.x/);
  assert.match(quality, /runs-on: ubuntu-latest/);
  assert.match(quality, /node-version: 24\.x/);
  assert.match(quality, /timeout-minutes: 15/);
  assert.doesNotMatch(`${behavioral}\n${quality}`, /npm (?:ci|install)/);

  for (const lane of expectedBehavioralLanes) {
    const laneBlock =
      `          - label: ${lane.label}\n` +
      `            os: ${lane.os}\n` +
      `            node: ${lane.node}`;
    for (const [field, replacement] of [
      ["label", `${lane.label} changed`],
      ["os", "unsupported-runner"],
      ["node", "99.x"],
    ]) {
      const mutatedBlock = laneBlock.replace(
        `${field}: ${lane[field]}`,
        `${field}: ${replacement}`,
      );
      const variant = workflow.replace(laneBlock, mutatedBlock);
      assert.notEqual(variant, workflow, `${lane.label} block must exist`);
      assert.throws(() => assertBehavioralMatrix(variant), `${lane.label} ${field}`);
    }
  }
});

test("CI command graph records the 10/33 baseline and reduces leaf duplication by 54.5%", () => {
  assert.deepEqual(baselinePullRequestTopology, {
    hostedJobInstances: 10,
    leafRepositoryCommands: 33,
    calculation:
      "7 Stable lanes × 4 commands + 1 packed command + 4 merge commands + Required",
  });
  const metrics = assertCommandTopology();
  assert.equal(metrics.hostedJobInstances, 11);
  assert.equal(metrics.leafRepositoryCommands, 15);
  assert.equal(
    (
      ((baselinePullRequestTopology.leafRepositoryCommands -
        metrics.leafRepositoryCommands) /
        baselinePullRequestTopology.leafRepositoryCommands) *
      100
    ).toFixed(1),
    "54.5",
  );

  const invalidCommandGraphs = [
    workflow.replace("        run: npm test\n", ""),
    workflow.replace("        run: npm test\n", "        run: npm test\n        run: npm test\n"),
    workflow.replace("        run: npm run lint\n", ""),
    workflow.replace("        run: npm run format:check\n", ""),
    workflow.replace("        run: npm run pack:check\n", ""),
    workflow.replace("        run: npm run release:candidate\n", ""),
    workflow.replace("        run: npm run release:candidate\n", "        run: npm run check\n"),
    workflow.replace("        run: npm run check\n", "        run: npm test\n"),
    workflow.replace(
      "        run: npm run lint\n",
      "        run: npm run lint\n        run: npm run lint\n",
    ),
  ];
  for (const variant of invalidCommandGraphs) {
    assert.throws(() => assertCommandTopology(variant));
  }

  const incompleteScripts = structuredClone(packageJson.scripts);
  incompleteScripts.check = "npm test && npm run lint && npm run format:check";
  assert.throws(() => assertCommandTopology(workflow, incompleteScripts));
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
    workflow.replace(
      "EXPECTED_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
      "EXPECTED_SHA: ${{ github.sha }}",
    ),
    workflow.replace(
      "      - name: Assert checkout identity\n",
      "      - name: Premature repository command\n        run: npm test\n      - name: Assert checkout identity\n",
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
    workflow.replace('test "${#actual_parents[@]}" -eq 2', "true"),
    workflow.replace('actual_base_sha="${actual_parents[0]}"', "actual_base_sha="),
    workflow.replace('actual_head_sha="${actual_parents[1]}"', "actual_head_sha="),
    workflow.replace(
      'test "$actual_sha" = "$EXPECTED_SYNTHETIC_SHA"',
      "true",
    ),
    workflow.replace('test "$actual_base_sha" = "$EXPECTED_BASE_SHA"', "true"),
    workflow.replace('test "$actual_head_sha" = "$EXPECTED_HEAD_SHA"', "true"),
    workflow.replace("      - behavioral\n", ""),
    workflow.replace("      - quality\n", ""),
    workflow.replace("      - merge-compatibility\n", ""),
    workflow.replace(
      "QUALITY_RESULT: ${{ needs.quality.result }}",
      "QUALITY_RESULT: ${{ needs.behavioral.result }}",
    ),
    workflow.replace('test "$BEHAVIORAL_RESULT" = "success"', "true"),
    workflow.replace('test "$QUALITY_RESULT" = "success"', "true"),
    workflow.replace('test "$PACKED_RESULT" = "success"', "true"),
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

  const packedCommand = "        run: npm run release:candidate\n";
  const forbiddenCommands = [
    "npm publish . --access public",
    "npm publish --dry-run --json",
    "npm run release:check",
    "npm login",
    "node ./scripts/release-evidence-manual-runner.mjs --run",
    "node ./scripts/release-evidence-harness.mjs",
    "node ./scripts/release-gate-isolation.mjs",
  ];
  for (const [index, command] of forbiddenCommands.entries()) {
    const variant = workflow.replace(
      packedCommand,
      `${packedCommand}      - name: Forbidden CI layer ${index + 1}\n        run: ${command}\n`,
    );
    assert.notEqual(variant, workflow, `missing packed command for mutation ${index + 1}`);
    assert.throws(() => assertCredentialFreeWorkflow(variant));
  }

  for (const variant of [
    workflow.replace("  pull_request:\n", "  pull_request_target:\n"),
    workflow.replace(
      '  NPM_CONFIG_AUDIT: "false"\n',
      '  NPM_CONFIG_AUDIT: "false"\n  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}\n',
    ),
  ]) {
    assert.notEqual(variant, workflow);
    assert.throws(() => assertCredentialFreeWorkflow(variant));
  }
});

test("packed release and aggregate gates are credential-free and agree with package scripts", () => {
  const packed = jobBody("packed-release", "merge-compatibility");
  const required = jobBody("required");
  assert.match(packed, /runs-on: ubuntu-latest/);
  assert.match(packed, /node-version: 24\.x/);
  assert.match(packed, /timeout-minutes: 25/);
  assert.deepEqual(repositoryRunCommands(packed), ["npm run release:candidate"]);
  assert.doesNotMatch(packed, /run: npm run (?:check|release:ci)/);
  assert.match(required, /if: \$\{\{ always\(\) \}\}/);
  assertRequiredGateTopology();
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
    "npm publish --dry-run --json",
  );
  assert.doesNotMatch(
    packed,
    /npm publish|npm login|npm whoami|npm view|npm version|registry|NODE_AUTH_TOKEN|secrets\./i,
  );
});
