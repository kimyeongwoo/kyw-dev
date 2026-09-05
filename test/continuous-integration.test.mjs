import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertSelectedCiResults, parseGitChanges, planHostedCi } from "../scripts/ci-plan.mjs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
function job(name) {
  const match = new RegExp("^  " + name + ":\\n([\\s\\S]*?)(?=^  [a-z-]+:|$(?![\\s\\S]))", "m").exec(workflow);
  assert.ok(match, name);
  return match[0];
}
function needsFor(profile, eventName) {
  const full = ["runtime", "release"].includes(profile);
  return {
    plan: { result: "success", outputs: { profile, reason: "fixture selection" } },
    focused: { result: full ? "skipped" : "success" },
    behavioral: { result: full ? "success" : "skipped" },
    quality: { result: "success" },
    "packed-release": { result: full ? "success" : "skipped" },
    "merge-compatibility": { result: full && eventName === "pull_request" ? "success" : "skipped" },
  };
}

test("selection distinguishes guidance, instructions, runtime, structural, and unknown changes", () => {
  assert.equal(planHostedCi(["README.md"], "pull_request").profile, "documentation");
  const instructions = planHostedCi(["skills/kyw-task/SKILL.md"], "pull_request");
  assert.equal(instructions.profile, "instruction");
  assert.ok(instructions.focusedTests.includes("test/kyw-task.test.mjs"));
  for (const paths of [["src/core/install.mjs"], ["skills/kyw-task/scripts/task-artifacts.mjs"],
    [{ path: "README.md", status: "D" }], ["unknown.file"], []]) {
    const plan = planHostedCi(paths, "pull_request");
    assert.equal(plan.behavioral, true);
    assert.equal(plan.packed, true);
    assert.equal(plan.merge, true);
  }
  assert.equal(planHostedCi(["README.md"], "workflow_dispatch").profile, "release");
  assert.equal(planHostedCi(["src/core/install.mjs"], "push").merge, false);
  assert.throws(() => planHostedCi(["README.md"], "pull_request_target"));
  assert.deepEqual(parseGitChanges("M\0README.md\0R100\0src/old.mjs\0docs/new.md\0"), [
    { status: "M", path: "README.md" },
    { status: "R100", previousPath: "src/old.mjs", path: "docs/new.md" },
  ]);
  assert.throws(() => parseGitChanges("M\0README.md"));
  assert.throws(() => parseGitChanges("R100\0old\0"));
});

test("required aggregate rejects missing, failed, cancelled, and unexpectedly skipped selected jobs", () => {
  for (const eventName of ["pull_request", "push", "workflow_dispatch"]) {
    for (const profile of eventName === "workflow_dispatch" ? ["release"] : ["documentation", "instruction", "runtime", "release"]) {
      const needs = needsFor(profile, eventName);
      assert.equal(assertSelectedCiResults(needs, eventName).profile, profile);
      for (const name of Object.keys(needs)) {
        const missing = structuredClone(needs);
        delete missing[name];
        assert.throws(() => assertSelectedCiResults(missing, eventName), name);
        for (const result of ["success", "skipped", "failure", "cancelled", "", "in_progress"]) {
          if (result === needs[name].result) continue;
          const changed = structuredClone(needs);
          changed[name].result = result;
          assert.throws(() => assertSelectedCiResults(changed, eventName), name + ":" + result);
        }
      }
      for (const outputs of [{}, { profile }, { profile: "unknown", reason: "x" }]) {
        const changed = structuredClone(needs);
        changed.plan.outputs = outputs;
        assert.throws(() => assertSelectedCiResults(changed, eventName));
      }
    }
  }
  assert.throws(() => assertSelectedCiResults(needsFor("documentation", "push"), "workflow_dispatch"));
});

test("hosted workflow keeps stable required aggregation and all supported platform safety lanes", () => {
  assert.match(workflow, /^name: CI\n\non:\n  pull_request:\n  push:\n    branches:\n      - main\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /paths-ignore:|paths:|pull_request_target|secrets\.|contents: write|id-token: write|continue-on-error/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
  const pins = { "actions/checkout": "d23441a48e516b6c34aea4fa41551a30e30af803", "actions/setup-node": "249970729cb0ef3589644e2896645e5dc5ba9c38" };
  for (const [, action, pin] of workflow.matchAll(/uses: ([^@\s]+)@([^\s]+)/g)) assert.equal(pin, pins[action]);
  const matrix = [...job("behavioral").matchAll(/- label: (.+)\n\s+os: (.+)\n\s+node: (.+)/g)].map(([, label, os, node]) => ({ label, os, node }));
  assert.equal(matrix.length, 7);
  for (const node of ["22.x", "24.x"]) for (const os of ["ubuntu-latest", "macos-latest", "windows-latest"]) {
    assert.ok(matrix.some((lane) => lane.os === os && lane.node === node));
  }
  assert.ok(matrix.some((lane) => lane.os === "ubuntu-latest" && lane.node === "26.x"));
  for (const name of ["behavioral", "packed-release", "merge-compatibility"]) {
    assert.match(job(name), /needs: plan/);
    assert.match(job(name), /needs.plan.outputs.profile == 'runtime' \|\| needs.plan.outputs.profile == 'release'/);
  }
  assert.match(job("focused"), /profile == 'documentation' \|\| needs.plan.outputs.profile == 'instruction'/);
  assert.match(job("focused"), /node .\/scripts\/ci-plan.mjs focused/);
  assert.match(job("plan"), /node .\/scripts\/ci-plan.mjs select/);
  assert.match(job("quality"), /profile != 'documentation'/);
  assert.match(job("required"), /name: Required \/ credential-free CI/);
  assert.match(job("required"), /if: \$\{\{ always\(\) \}\}/);
  for (const name of ["plan", "focused", "behavioral", "quality", "packed-release", "merge-compatibility"]) assert.ok(job("required").includes("      - " + name));
  assert.match(job("required"), /NEEDS_JSON: \$\{\{ toJSON\(needs\) \}\}/);
  assert.match(job("required"), /name: Validate selected CI results/);
  assert.match(job("required"), /run: node .\/scripts\/ci-plan.mjs aggregate/);
});

test("runtime CI still asserts actual head and synthetic merge identities before validation", () => {
  for (const name of ["behavioral", "quality", "packed-release"]) {
    const body = job(name);
    assert.match(body, /github.event.pull_request.head.sha \|\| github.sha/);
    assert.match(body, /test "\$actual_sha" = "\$EXPECTED_SHA"/);
    assert.match(body, /PR_ACTUAL_HEAD/);
    assert.match(body, /POST_MERGE_MAIN/);
    assert.ok(body.indexOf("Assert checkout identity") < body.indexOf("run: npm"));
  }
  const merge = job("merge-compatibility");
  assert.match(merge, /github.event_name == 'pull_request'/);
  assert.match(merge, /role=PR_MERGE_COMPATIBILITY/);
  assert.match(merge, /test "\$actual_base_sha" = "\$EXPECTED_BASE_SHA"/);
  assert.match(merge, /test "\$actual_head_sha" = "\$EXPECTED_HEAD_SHA"/);
  assert.match(merge, /run: npm run check/);
  assert.doesNotMatch(workflow, /npm publish|NODE_AUTH_TOKEN|NPM_TOKEN|npm (?:login|trust|token|view)/);
});
