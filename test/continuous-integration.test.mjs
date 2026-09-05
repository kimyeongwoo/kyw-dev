import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertSelectedCiResults, parseGitChanges, planHostedCi } from "../scripts/ci-plan.mjs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const ciScript = fileURLToPath(new URL("../scripts/ci-plan.mjs", import.meta.url));

function gitFixture(t, initialFiles = {}) {
  const root = mkdtempSync(join(tmpdir(), "kyw-ci-selection-"));
  const repository = join(root, "repository");
  mkdirSync(repository);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", [
    "-c", "core.autocrlf=false", "-c", `core.hooksPath=${join(root, "no-hooks")}`,
    "-c", "user.name=CI fixture", "-c", "user.email=ci-fixture@example.invalid",
    "-c", "commit.gpgsign=false", ...args,
  ], { cwd: repository, encoding: "utf8" }).trim();
  const write = (path, text) => {
    mkdirSync(dirname(join(repository, path)), { recursive: true });
    writeFileSync(join(repository, path), text);
  };
  const commit = (prepareIndex) => {
    git("add", "--all");
    prepareIndex?.();
    git("commit", "--quiet", "-m", "fixture");
    return git("rev-parse", "HEAD");
  };
  git("init", "--quiet");
  write("README.md", "# Fixture\n");
  for (const [path, text] of Object.entries(initialFiles)) write(path, text);
  const base = commit();
  const select = (head, eventName = "pull_request", overrides = {}) => spawnSync(
    process.execPath, [ciScript, "select"], {
      cwd: repository, encoding: "utf8",
      env: { ...process.env, BASE_SHA: base, EXPECTED_SHA: head,
        GITHUB_EVENT_NAME: eventName, GITHUB_OUTPUT: join(root, "outputs"), ...overrides },
    },
  );
  const changes = (head) => parseGitChanges(git("diff", "--raw", "-z", "--no-abbrev",
    "--find-renames", "--find-copies", "--find-copies-harder", base, head, "--"));
  return { git, write, commit, base, select, changes };
}

function job(name) {
  const match = new RegExp("^  " + name + ":\\n([\\s\\S]*?)(?=^  [a-z-]+:|$(?![\\s\\S]))", "m").exec(workflow);
  assert.ok(match, name);
  return match[0];
}

test("real Git regular documentation additions select focused CI and aggregate fixture results", (t) => {
  const fixture = gitFixture(t);
  fixture.write("docs/new.md", "# New guidance\n");
  fixture.write("docs/tasks/0099-new/TASK.md", "# New Task record\n");
  const head = fixture.commit();
  assert.deepEqual(fixture.changes(head).map(({ status, oldMode, newMode }) =>
    ({ status, oldMode, newMode })), [
    { status: "A", oldMode: "000000", newMode: "100644" },
    { status: "A", oldMode: "000000", newMode: "100644" },
  ]);
  const selection = fixture.select(head);
  assert.equal(selection.status, 0, selection.stderr);
  const plan = JSON.parse(selection.stdout);
  assert.equal(plan.profile, "documentation");
  assert.equal(plan.focused, true);
  assert.equal(plan.behavioral, false);
  const needs = needsFor(plan.profile, "pull_request");
  needs.plan.outputs = { profile: plan.profile, reason: plan.reason };
  const aggregate = spawnSync(process.execPath, [ciScript, "aggregate"], {
    encoding: "utf8", env: { ...process.env, GITHUB_EVENT_NAME: "pull_request",
      NEEDS_JSON: JSON.stringify(needs) },
  });
  assert.equal(aggregate.status, 0, aggregate.stderr);
  assert.equal(JSON.parse(aggregate.stdout).profile, "documentation");

  const manual = fixture.select(head, "workflow_dispatch");
  assert.equal(manual.status, 0, manual.stderr);
  assert.equal(JSON.parse(manual.stdout).profile, "release");
  const wrongHead = fixture.select(fixture.base);
  assert.equal(wrongHead.status, 1);
  assert.match(wrongHead.stderr, /checkout differs from exact event head/);
  for (const BASE_SHA of ["0".repeat(40), "f".repeat(40)]) {
    const unknownBase = fixture.select(head, "pull_request", { BASE_SHA });
    assert.equal(unknownBase.status, 0, unknownBase.stderr);
    assert.equal(JSON.parse(unknownBase.stdout).profile, "runtime");
  }
});

test("real Git roles, modes, and both move/copy paths reach hosted selection and aggregation", async (t) => {
  const cases = [
    {
      name: "ordinary document move and deletion", profile: "documentation", statuses: ["D", "R100"],
      files: { "docs/old.md": "# Prior guidance\n", "docs/removed.md": "# Removed guidance\n" },
      change(fixture) {
        fixture.git("mv", "docs/old.md", "docs/new.md");
        fixture.git("rm", "docs/removed.md");
      },
    },
    {
      name: "instruction addition", profile: "instruction", statuses: ["A"],
      change(fixture) { fixture.write("skills/kyw-task/references/new.md", "# Task instructions\n"); },
    },
    {
      name: "runtime copied to documentation", profile: "runtime", statuses: ["C100"],
      files: { "src/code.mjs": "export const marker = 'runtime';\n" },
      change(fixture) { fixture.write("docs/copied.md", "export const marker = 'runtime';\n"); },
    },
    {
      name: "documentation moved to runtime", profile: "runtime", statuses: ["R100"],
      files: { "docs/old.md": "# Old document\n", "src/placeholder.mjs": "export {};\n" },
      change(fixture) { fixture.git("mv", "docs/old.md", "src/code.mjs"); },
    },
    {
      name: "document becomes a Git symlink", profile: "runtime", statuses: ["T"],
      files: { "docs/type.md": "# Regular document\n" },
      change(fixture) {
        fixture.write("docs/type.md", "README.md");
        return () => fixture.git("update-index", "--cacheinfo",
          `120000,${fixture.git("hash-object", "-w", "docs/type.md")},docs/type.md`);
      },
    },
    {
      name: "new executable Task record", profile: "runtime", statuses: ["A"],
      change(fixture) {
        fixture.write("docs/tasks/0099-new/TASK.md", "# Executable record\n");
        return () => fixture.git("update-index", "--chmod=+x", "docs/tasks/0099-new/TASK.md");
      },
    },
    {
      name: "CI policy addition", profile: "release", statuses: ["A"],
      change(fixture) { fixture.write(".github/workflows/new.yml", "name: Fixture\n"); },
    },
  ];
  for (const scenario of cases) await t.test(scenario.name, (context) => {
    const fixture = gitFixture(context, scenario.files);
    const head = fixture.commit(scenario.change(fixture));
    assert.deepEqual(fixture.changes(head).map(({ status }) => status).sort(), scenario.statuses);
    const result = fixture.select(head);
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.profile, scenario.profile);
    if (scenario.profile === "instruction") assert.ok(plan.focusedTests.includes("test/kyw-task.test.mjs"));
    const needs = needsFor(plan.profile, "pull_request");
    needs.plan.outputs = { profile: plan.profile, reason: plan.reason };
    assert.equal(assertSelectedCiResults(needs, "pull_request").profile, scenario.profile);
    const required = plan.focused ? "focused" : "behavioral";
    needs[required].result = "skipped";
    assert.throws(() => assertSelectedCiResults(needs, "pull_request"), /expected success/);
  });
});

test("raw Git parsing retains file modes and rejects incomplete metadata", () => {
  const objectId = "1".repeat(40);
  const header = (oldMode, newMode, status) => `:${oldMode} ${newMode} ${objectId} ${objectId} ${status}\0`;
  assert.deepEqual(parseGitChanges(
    `${header("000000", "100644", "A")}docs/new.md\0` +
    `${header("100644", "100644", "C100")}src/old.mjs\0docs/copied.md\0`), [
    { path: "docs/new.md", status: "A", oldMode: "000000", newMode: "100644" },
    { path: "docs/copied.md", status: "C100", previousPath: "src/old.mjs", oldMode: "100644", newMode: "100644" },
  ]);
  for (const output of [
    `${header("100644", "100644", "R100")}docs/old.md\0`,
    `${header("100644", "100644", "M")}docs/new.md`,
    ":100644 invalid metadata\0docs/new.md\0",
    `:${header("100644", "100644", "M")}docs/new.md\0`,
  ]) assert.throws(() => parseGitChanges(output), /Incomplete|Invalid/);
  // Legacy name-status input remains readable, but lacks the modes needed for lighter CI.
  for (const status of ["M", "A", "D"]) {
    assert.equal(planHostedCi(parseGitChanges(`${status}\0docs/new.md\0`), "pull_request").profile, "runtime");
  }
});
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
