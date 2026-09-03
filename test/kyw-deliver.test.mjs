import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SKILL_ROOT = join(REPOSITORY_ROOT, "skills", "kyw-deliver");
const SKILL_PATH = join(SKILL_ROOT, "SKILL.md");
const METADATA_PATH = join(SKILL_ROOT, "agents", "openai.yaml");
const DELIVERY_REFERENCE_PATH = join(SKILL_ROOT, "references", "delivery.md");
const EXECUTION_SCENARIOS_PATH = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "kyw-deliver",
  "execution-scenarios.json",
);

function frontmatterFields(skill) {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1];
  assert.ok(block, "SKILL.md must have YAML front matter");
  return Object.fromEntries(
    block.split("\n").map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator), line.slice(separator + 1).trim()];
    }),
  );
}

test("kyw-deliver is an explicit exact-ID-only STANDARD delivery Skill", async () => {
  const [skill, metadata, delivery] = await Promise.all([
    readFile(SKILL_PATH, "utf8"),
    readFile(METADATA_PATH, "utf8"),
    readFile(DELIVERY_REFERENCE_PATH, "utf8"),
  ]);
  const frontmatter = frontmatterFields(skill);

  assert.deepEqual(Object.keys(frontmatter), ["name", "description"]);
  assert.equal(frontmatter.name, "kyw-deliver");
  assert.match(frontmatter.description, /explicitly invokes \$kyw-deliver with a four-digit ID/);
  assert.match(frontmatter.description, /current STANDARD delivery/);
  assert.match(skill, /Only exact `\$kyw-deliver NNNN`/);
  assert.match(skill, /no bare form, Korean alias, implicit invocation/);
  assert.match(skill, /\[STANDARD Delivery and Resume\]\(references\/delivery\.md\)/);
  assert.match(delivery, /canonical detailed Git\/GitHub delivery procedure/);
  assert.match(metadata, /default_prompt: "Use \$kyw-deliver NNNN/);
  assert.match(metadata, /policy:\n  allow_implicit_invocation: false\n/);
  assert.doesNotMatch(skill, /task \d{4} 실행해줘|task 진행해줘|남은 task 계속 실행해줘/);
  assert.doesNotMatch(metadata, /^dependencies:/m);
});

test("kyw-deliver reuses the sole packaged adapter and owns no duplicate engine", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  await assert.rejects(access(join(SKILL_ROOT, "scripts")), (error) => error.code === "ENOENT");
  assert.match(skill, /sole packaged Task adapter in the sibling `kyw-task` Skill/);
  assert.match(skill, /owns no copied parser, queue, evaluator, hydration, continuity, or delivery engine/);
  assert.match(skill, /\.\.\/kyw-task\/scripts\/task-artifacts\.mjs/);
  assert.doesNotMatch(skill, /--delivery-(?:ledger|expectations)(?:-json)?/);
});

test("kyw-deliver accepts only terminal STANDARD Tasks and keeps immutable results report-only", async () => {
  const [skill, delivery] = await Promise.all([
    readFile(SKILL_PATH, "utf8"),
    readFile(DELIVERY_REFERENCE_PATH, "utf8"),
  ]);

  assert.match(skill, /`DONE\/PASSED`/);
  assert.match(skill, /`STANDARD`/);
  for (const state of [
    "missing",
    "DRAFT",
    "READY",
    "IN_PROGRESS",
    "BLOCKED",
    "CANCELLED",
  ]) {
    assert.match(skill, new RegExp(state, "i"));
  }
  assert.match(skill, /reasoned `NONE`/);
  assert.match(skill, /unchanged satisfied contract-3 Task[^.]*report-only/i);
  assert.match(delivery, /terminal Task\/Test bytes remain unchanged/);
  assert.match(delivery, /\$kyw-task "<correction outcome>"/);
  assert.match(delivery, /hard-depend on Task NNNN/);
});

test("the canonical delivery procedure fixes safe ordering and exact identities", async () => {
  const delivery = await readFile(DELIVERY_REFERENCE_PATH, "utf8");
  const ordered = [
    "### 1. exact-path commit",
    "### 2. non-force push",
    "### 3. non-draft PR",
    "### 4. actual-head exact-SHA CI observation",
    "### 5. synthetic merge compatibility",
    "### 6. review and mergeability",
    "### 7. expected-head protected merge",
    "### 8. post-main exact-SHA CI observation",
    "### 9. final report",
  ];
  let previous = -1;
  for (const marker of ordered) {
    const index = delivery.indexOf(marker);
    assert.ok(index > previous, `${marker} must appear in delivery order`);
    previous = index;
  }

  for (const identity of [
    "HARDENED_EXACT_HEAD",
    "PR_ACTUAL_HEAD",
    "PR_MERGE_COMPATIBILITY",
    "POST_MERGE_MAIN",
    "KYWCIEVIDENCE",
    "filter=all",
    "filter=latest",
  ]) {
    assert.ok(delivery.includes(identity), identity);
  }
  assert.match(delivery, /run-level latest attempt/);
  assert.match(delivery, /logical job's actual execution attempt/);
  assert.match(delivery, /job only at `refs\/pull\/<number>\/merge`[^.]*merge compatibility/i);
});

test("kyw-deliver resumes without repeating or retrying external actions", async () => {
  const delivery = await readFile(DELIVERY_REFERENCE_PATH, "utf8");

  assert.match(delivery, /first unfinished safe action/i);
  for (const action of ["commit", "push", "PR creation", "merge"]) {
    assert.match(delivery, new RegExp(`never repeat[^.]{0,160}${action}|${action}[^.]{0,160}never repeat`, "i"));
  }
  assert.match(delivery, /never rerun CI/i);
  assert.match(delivery, /no retry, rerun, or fallback/i);
  assert.match(delivery, /later actual execution supersedes/i);
  assert.match(delivery, /never falls back to an earlier success/i);
  assert.match(delivery, /Missing, stale, ambiguous, mismatched, failed, cancelled, skipped, or incomplete/i);
  assert.match(
    delivery,
    /Before this first external mutation[^.]*committed selected head[^.]*hardened exact-SHA workflow contract/i,
  );
  assert.match(delivery, /exact workflow ID, name, path, and active state/i);
});

test("post-merge resume aligns only one proven main fast-forward before the sole dispatch", async () => {
  const delivery = await readFile(DELIVERY_REFERENCE_PATH, "utf8");

  assert.match(delivery, /old SHA `O` at local `main`, its upstream, and cached `origin\/main`/);
  assert.match(delivery, /newer SHA `N` at both direct-remote and GitHub `main`/);
  assert.match(delivery, /git worktree list --porcelain/);
  assert.match(
    delivery,
    /git fetch --no-tags --no-recurse-submodules --refmap= origin refs\/heads\/main/,
  );
  assert.match(delivery, /`FETCH_HEAD`[^.]*equal `N`/);
  assert.match(delivery, /one `git update-ref --stdin` transaction/);
  assert.match(delivery, /transaction: `start`/);
  assert.match(delivery, /old-value CAS updates[^.]*refs\/remotes\/origin\/main[^.]*refs\/heads\/main/);
  assert.match(delivery, /immediate direct-remote and GitHub `N` re-read, `prepare`, and `commit`/);
  assert.match(delivery, /unchanged except that both local refs now equal `N`/);
  assert.match(delivery, /Any other main mismatch remains blocked/);
  assert.match(delivery, /Call the sole adapter once/);
  assert.match(delivery, /Never redispatch/);
});

test("kyw-deliver preserves unrelated work and applies predecessor-only continuity", async () => {
  const delivery = await readFile(DELIVERY_REFERENCE_PATH, "utf8");

  assert.match(delivery, /stage only the selected Task's exact verified path set/i);
  assert.match(delivery, /unrelated tracked, untracked, staged, and generated work/i);
  assert.match(delivery, /broad staging, cleanup, reset, or destructive recovery/i);
  assert.match(delivery, /apply-continuity/);
  assert.match(delivery, /already delivered predecessors only/i);
  assert.match(delivery, /selected Task cannot cover itself/i);
  assert.match(delivery, /exact replay is idempotent/i);
  assert.match(delivery, /one-delivery causal lag/i);
});

test("interrupted delivery fixtures resume only the first unfinished safe stage", async () => {
  const fixture = JSON.parse(await readFile(EXECUTION_SCENARIOS_PATH, "utf8"));
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(fixture.orderedStages, [
    "APPLY_PREDECESSOR_CONTINUITY",
    "COMMIT",
    "PUSH",
    "CREATE_PR",
    "OBSERVE_ACTUAL_HEAD_CI",
    "OBSERVE_MERGE_COMPATIBILITY",
    "INSPECT_REVIEW_AND_MERGEABILITY",
    "MERGE_EXPECTED_HEAD",
    "OBSERVE_POST_MAIN_CI",
    "REPORT",
  ]);
  assert.deepEqual(
    fixture.scenarios.map(({ name }) => name),
    [
      "pre-commit",
      "committed-unpushed",
      "pushed-no-pr",
      "pr-head-ci-pending",
      "synthetic-merge-pending",
      "review-blocked",
      "reviewed-merge-pending",
      "merged-post-main-pending",
      "later-failed-attempt",
      "satisfied",
    ],
  );

  for (const scenario of fixture.scenarios) {
    const completed = new Set(scenario.completed);
    const firstUnfinished = fixture.orderedStages.find((stage) => !completed.has(stage));
    assert.equal(firstUnfinished, scenario.pending, scenario.name);
    assert.equal(
      scenario.blocked ? null : firstUnfinished,
      scenario.expectedNext,
      scenario.name,
    );
    for (const stage of scenario.mustNotRepeat) {
      assert.ok(completed.has(stage), `${scenario.name}: ${stage} must be proven complete`);
      assert.notEqual(scenario.expectedNext, stage, `${scenario.name}: ${stage} repeats`);
    }
  }

  const failedAttempt = fixture.scenarios.find(
    ({ name }) => name === "later-failed-attempt",
  );
  assert.ok(failedAttempt.authoritativeFailedAttempt > failedAttempt.olderSuccessfulAttempt);
  assert.equal(failedAttempt.fallbackAllowed, false);
  assert.equal(failedAttempt.expectedNext, null);
});
