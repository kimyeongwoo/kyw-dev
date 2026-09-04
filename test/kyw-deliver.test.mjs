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
const PUBLIC_RELEASE_REFERENCE_PATH = join(
  SKILL_ROOT,
  "references",
  "public-release.md",
);
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

test("kyw-deliver exposes one exact-ID STANDARD and eligible public-release route", async () => {
  const [skill, metadata, delivery, publicRelease] = await Promise.all([
    readFile(SKILL_PATH, "utf8"),
    readFile(METADATA_PATH, "utf8"),
    readFile(DELIVERY_REFERENCE_PATH, "utf8"),
    readFile(PUBLIC_RELEASE_REFERENCE_PATH, "utf8"),
  ]);
  const frontmatter = frontmatterFields(skill);

  assert.deepEqual(Object.keys(frontmatter), ["name", "description"]);
  assert.equal(frontmatter.name, "kyw-deliver");
  assert.match(frontmatter.description, /explicitly invokes exact \$kyw-deliver/);
  assert.match(frontmatter.description, /current STANDARD lifecycle/);
  assert.match(frontmatter.description, /eligible public release/);
  assert.match(frontmatter.description, /suffixes/);
  assert.match(skill, /Only exact `\$kyw-deliver NNNN` selects delivery/);
  assert.match(skill, /release-bearing contract-4 `STANDARD` Task[^.]*same invocation/i);
  assert.match(skill, /Every suffix, including `--public-release`[^.]*unsupported/i);
  assert.match(skill, /bare form, Korean\/managed alias, implicit/);
  assert.match(skill, /\[STANDARD Delivery and Resume\]\(references\/delivery\.md\)/);
  assert.match(
    skill,
    /Load \[Public Release and Resume\]\(references\/public-release\.md\)[^.]*only after[^.]*release-bearing contract-4 Task[^.]*`FINAL`/i,
  );
  assert.match(skill, /Historical contract 1–3 delivery never loads or executes that procedure/i);
  assert.match(delivery, /canonical detailed Git\/GitHub procedure/);
  assert.match(publicRelease, /canonical internal public-release procedure/);
  assert.match(metadata, /default_prompt: "Use exact \$kyw-deliver NNNN/);
  assert.doesNotMatch(metadata, /--public-release/);
  assert.match(metadata, /policy:\n  allow_implicit_invocation: false\n/);
  assert.doesNotMatch(skill, /task \d{4} 실행해줘|task 진행해줘|남은 task 계속 실행해줘/);
  assert.doesNotMatch(metadata, /^dependencies:/m);
});

test("kyw-deliver reuses the sole packaged adapter and owns no duplicate engine", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");

  await assert.rejects(access(join(SKILL_ROOT, "scripts")), (error) => error.code === "ENOENT");
  assert.match(skill, /sole packaged Task adapter in sibling `kyw-task`/);
  assert.match(
    skill,
    /owns no copied parser, queue, evaluator, hydration, continuity, public classifier, or engine/,
  );
  assert.match(skill, /\.\.\/kyw-task\/scripts\/task-artifacts\.mjs/);
  assert.match(skill, /task-artifacts\.mjs public-release/);
  assert.match(skill, /--invocation '\$kyw-deliver NNNN'/);
  assert.doesNotMatch(skill, /--invocation '\$kyw-deliver NNNN --public-release'/);
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
  assert.match(skill, /unchanged satisfied contract-3\/4 Task stays immutable/i);
  assert.match(skill, /contract 1–3 is report-only[^.]*contract 4 proceeds/i);
  assert.match(delivery, /terminal Task\/Test bytes remain unchanged/);
  assert.match(delivery, /\$kyw-task "<correction outcome>"/);
  assert.match(delivery, /hard-depend on Task NNNN/);
});

test("public release is progressively loaded and strictly gated by STANDARD FINAL", async () => {
  const [skill, publicRelease] = await Promise.all([
    readFile(SKILL_PATH, "utf8"),
    readFile(PUBLIC_RELEASE_REFERENCE_PATH, "utf8"),
  ]);

  assert.match(publicRelease, /exact `\$kyw-deliver NNNN`/);
  assert.match(publicRelease, /Every suffix[^.]*`--public-release`[^.]*no public authority/i);
  assert.match(
    publicRelease,
    /npm publication → exact-SHA GitHub tag → GitHub Release/,
  );
  assert.match(
    publicRelease,
    /belongs to \[STANDARD Delivery and Resume\]\(delivery\.md\)[\s\S]*No npm, tag, or Release mutation is eligible until[^.]*production evaluator returns `FINAL`/,
  );
  assert.match(publicRelease, /expected-head PR merge[^.]*exact merge SHA and tree/);
  assert.match(publicRelease, /successful post-main evidence[^.]*that SHA/);
  assert.match(
    publicRelease,
    /After `STANDARD FINAL`, call the sole internal adapter path once[\s\S]*task-artifacts\.mjs public-release/,
  );
  assert.match(publicRelease, /Only a fresh `PUBLIC_RELEASE` selection may enter the public stages/);
  assert.match(publicRelease, /`DELIVER`, historical\/report-only, or any other result stops/);
  assert.doesNotMatch(publicRelease, /--execution-preflight(?:-json)?/);
  assert.match(skill, /Historical contract 1–3 delivery never loads or executes that procedure/i);
  assert.doesNotMatch(
    await readFile(DELIVERY_REFERENCE_PATH, "utf8"),
    /^## Perform the ordered public release$/m,
  );
});

test("public release freezes one tuple and uses the closed five-state preflight", async () => {
  const publicRelease = await readFile(PUBLIC_RELEASE_REFERENCE_PATH, "utf8");

  for (const identity of [
    "Task ID",
    "owner/repository",
    "target merge SHA",
    "target tree",
    "workflow numeric ID",
    "package, plugin, and CLI name/version",
    "public access",
    "sorted prior versions and `priorLatest`",
    "expected packed entry set and raw tarball bytes",
    "lightweight tag `v<version>`",
    "title `v<version>`",
  ]) {
    assert.ok(publicRelease.includes(identity), identity);
  }
  const classifications = [
    "ABSENT",
    "EXACT_ALREADY_COMPLETE",
    "PENDING_PROOF",
    "CONFLICT",
    "UNKNOWN",
  ];
  for (const classification of classifications) {
    assert.ok(publicRelease.includes("`" + classification + "`"), classification);
  }
  assert.match(
    publicRelease,
    /read all four surfaces before the first public mutation and again immediately before each applicable mutation/,
  );
  assert.match(publicRelease, /Only `ABSENT` admits[^.]*one create action/);
  assert.match(publicRelease, /`PENDING_PROOF` is observation-only/);
  assert.match(publicRelease, /`CONFLICT` and `UNKNOWN` block/);
  assert.match(publicRelease, /`CONFLICT`[^.]*out of order/i);
  assert.match(publicRelease, /strictly newer than every frozen prior version/);
  assert.match(publicRelease, /target-version 404 alone is unknown/);
});

test("public release performs create-once npm, tag, and Release stages with monotonic resume", async () => {
  const publicRelease = await readFile(PUBLIC_RELEASE_REFERENCE_PATH, "utf8");
  const ordered = [
    "### 1. `STANDARD_FINAL`",
    "### 2. `NPM`",
    "### 3. `TAG`",
    "### 4. `RELEASE`",
    "### 5. `FINAL_PROOF`",
  ];
  let previous = publicRelease.indexOf("## Perform the ordered public release");
  assert.ok(previous >= 0);
  for (const marker of ordered) {
    const index = publicRelease.indexOf(marker);
    assert.ok(index > previous, `${marker} must appear in public-release order`);
    previous = index;
  }

  assert.match(publicRelease, /dispatch `\.github\/workflows\/publish\.yml` once/);
  assert.match(publicRelease, /npm publish \. --access public --ignore-scripts/);
  assert.match(publicRelease, /`gitHead` equal to the target merge SHA/);
  assert.match(publicRelease, /tarball raw bytes equal to expected bytes/);
  assert.match(publicRelease, /registry signature identity/);
  assert.match(publicRelease, /SLSA provenance/);
  assert.match(publicRelease, /submit one GitHub ref-creation request/);
  assert.match(publicRelease, /send one create request with the frozen deterministic fields/);
  assert.match(publicRelease, /npm-success\/tag-failure[^.]*never republishes/);
  assert.match(
    publicRelease,
    /npm-plus-tag-success\/Release-failure[^.]*never republishes or recreates the tag/,
  );
  assert.match(publicRelease, /never (?:grants )?retry, rerun, fallback/);
});

test("public completion uses canonical proof, redacts secrets, and preserves pair continuity", async () => {
  const publicRelease = await readFile(PUBLIC_RELEASE_REFERENCE_PATH, "utf8");

  assert.match(
    publicRelease,
    /`COMPLETE` requires[\s\S]*workflow run and authoritative successful attempt[\s\S]*npm metadata[\s\S]*tag direct\/peeled target[\s\S]*Release metadata/,
  );
  assert.match(publicRelease, /fresh cache-bypassed (?:npm )?registry reads/i);
  assert.match(publicRelease, /selected pair[^.]*bytes throughout this procedure/);
  assert.match(publicRelease, /continuity checkpoint is also read-only/);
  for (const secret of [
    "npm token",
    "GitHub token",
    "OIDC JWT",
    "OTP",
    "authentication URL",
    "cookie",
    "`Authorization` header",
    "credential environment value",
  ]) {
    assert.ok(publicRelease.includes(secret), secret);
  }
  assert.match(publicRelease, /Sanitize before retaining or displaying any external error/);
  assert.match(publicRelease, /injected clients, deterministic mocks, and owned loopback/);
  assert.match(publicRelease, /never dispatch the live workflow, publish to npm, create a live tag or Release/);
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
    "### 7. expected-head PR merge",
    "### 8. post-main exact-SHA CI observation",
    "### 9. final STANDARD result",
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

test("base protection is optional while existing rules and exact-head merge safety remain mandatory", async () => {
  const delivery = await readFile(DELIVERY_REFERENCE_PATH, "utf8");

  for (const disposition of ["PRESENT", "ABSENT", "UNKNOWN"]) {
    assert.ok(delivery.includes("`" + disposition + "`"), disposition);
  }
  assert.match(delivery, /optional repository configuration and noncanonical report metadata/i);
  assert.match(delivery, /GET \/repos\/\{owner\}\/\{repo\}\/rules\/branches\/\{branch\}/i);
  assert.match(delivery, /includes active repository- and organization-level rules/i);
  assert.match(delivery, /excludes evaluate, disabled, and non-targeting rules/i);
  assert.match(delivery, /`ABSENT` requires[^.]*`protected: false`[^.]*complete successful empty/i);
  assert.match(delivery, /A 403 or 404 alone, malformed or partial pagination[^.]*`UNKNOWN` and stops/i);
  assert.match(delivery, /exact route already authorizes one merge attempt/i);
  assert.match(delivery, /do not ask for duplicate kyw confirmation/i);
  assert.match(delivery, /synchronous ordinary PR merge request/i);
  assert.match(delivery, /expected head SHA and merge method `merge`/i);
  assert.match(delivery, /GitHub must enforce every present rule/i);
  assert.match(delivery, /Never push to the base directly/i);
  assert.match(delivery, /enable auto-merge, enter a merge queue/i);
  assert.match(delivery, /select squash\/rebase/i);
  assert.match(delivery, /alter or bypass protection, use admin authority/i);
  assert.match(delivery, /A rejected request is terminal for this invocation/i);
  assert.match(delivery, /exactly two ordered parents equal to the expected base and head/i);
  assert.match(delivery, /repeat the exact-base\/effective-rules reads/i);
  assert.match(delivery, /Protection drift to `UNKNOWN` or to an unsatisfied `PRESENT`[^.]*stops before any request/i);
  assert.match(delivery, /expected-head field is not an atomic base compare-and-swap/i);
  assert.match(delivery, /ordered-parent postcondition detects but cannot prevent it/i);
  assert.match(delivery, /do not repeat it or retroactively gate post-main observation on current protection/i);
  assert.match(delivery, /report that limitation instead of inventing or relabeling it/i);
  assert.match(delivery, /never changes evaluator, checkpoint, or Task\/Test schema/i);
  assert.doesNotMatch(delivery, /expected-head protected merge|expected protected base|remote protected `main`/i);
});

test("protection inspection fixtures distinguish effective absence, inherited rules, and unknown reads", async () => {
  const fixture = JSON.parse(await readFile(EXECUTION_SCENARIOS_PATH, "utf8"));
  const cases = new Map(
    fixture.protectionInspectionCases.map((entry) => [entry.name, entry]),
  );

  assert.deepEqual(
    [...cases.keys()],
    [
      "exact-unprotected-empty-effective-rules",
      "classic-protection-present",
      "repository-ruleset-present",
      "inherited-organization-ruleset-present",
      "evaluate-disabled-and-other-branch-rules-are-not-effective",
      "effective-rules-forbidden",
      "exact-branch-not-found",
      "effective-rules-partial-pagination",
      "conflicting-protection-signals",
    ],
  );
  assert.equal(
    cases.get("exact-unprotected-empty-effective-rules").expectedDisposition,
    "ABSENT",
  );
  assert.equal(cases.get("classic-protection-present").expectedDisposition, "PRESENT");
  assert.deepEqual(
    cases.get("inherited-organization-ruleset-present").effectiveRuleSources,
    ["Organization"],
  );
  assert.equal(
    cases.get("inherited-organization-ruleset-present").expectedDisposition,
    "PRESENT",
  );
  assert.deepEqual(
    cases.get("evaluate-disabled-and-other-branch-rules-are-not-effective")
      .nonEffectiveRules,
    ["evaluate", "disabled", "other-branch"],
  );
  for (const name of [
    "effective-rules-forbidden",
    "exact-branch-not-found",
    "effective-rules-partial-pagination",
    "conflicting-protection-signals",
  ]) {
    assert.equal(cases.get(name).expectedDisposition, "UNKNOWN", name);
  }
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
  assert.match(delivery, /git fetch --no-tags --no-recurse-submodules --refmap= origin refs\/heads\/main/);
  assert.match(delivery, /`FETCH_HEAD`[^.]*equal `N`/);
  assert.match(delivery, /one `git update-ref --stdin` transaction/);
  assert.match(delivery, /transaction: `start`/);
  assert.match(delivery, /old-value CAS updates[^.]*refs\/remotes\/origin\/main[^.]*refs\/heads\/main/);
  assert.match(delivery, /immediate direct-remote and GitHub `N` re-read, `prepare`, and `commit`/);
  assert.match(delivery, /unchanged except that both local refs now equal `N`/);
  assert.match(delivery, /Any other main mismatch remains blocked/);
  assert.match(delivery, /Call the sole adapter dispatcher exactly once/);
  assert.match(delivery, /Do not redispatch/);
});

test("kyw-deliver preserves unrelated work and applies predecessor-only continuity", async () => {
  const delivery = await readFile(DELIVERY_REFERENCE_PATH, "utf8");

  assert.match(delivery, /stage only the selected Task's exact verified path set/i);
  assert.match(delivery, /unrelated tracked, untracked, staged, and generated work/i);
  assert.match(delivery, /broad staging, cleanup, reset, or destructive recovery/i);
  assert.doesNotMatch(delivery, /apply-continuity|transition token/i);
  assert.match(delivery, /dispatcher runs exactly once/i);
  assert.match(delivery, /apply runs zero or one time/i);
  assert.match(delivery, /returns no successful delivery selection/i);
  assert.match(delivery, /blocks commit, push, PR, merge, npm, tag, and Release mutation/i);
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
      "protection-absent-merge-pending",
      "protection-present-merge-pending",
      "protection-unknown",
      "protection-rule-blocked",
      "protection-drift-before-merge",
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

  const unprotected = fixture.scenarios.find(
    ({ name }) => name === "protection-absent-merge-pending",
  );
  assert.equal(unprotected.protectionDisposition, "ABSENT");
  assert.equal(unprotected.expectedNext, "MERGE_EXPECTED_HEAD");

  const protectedReady = fixture.scenarios.find(
    ({ name }) => name === "protection-present-merge-pending",
  );
  assert.equal(protectedReady.protectionDisposition, "PRESENT");
  assert.equal(protectedReady.expectedNext, "MERGE_EXPECTED_HEAD");

  for (const name of ["protection-unknown", "protection-rule-blocked"]) {
    const blocked = fixture.scenarios.find((scenario) => scenario.name === name);
    assert.equal(blocked.blocked, true, name);
    assert.equal(blocked.expectedNext, null, name);
    assert.equal(
      blocked.protectionDisposition,
      name === "protection-unknown" ? "UNKNOWN" : "PRESENT",
      name,
    );
    assert.match(blocked.blocker, /protection/i, name);
  }

  const drift = fixture.scenarios.find(
    ({ name }) => name === "protection-drift-before-merge",
  );
  assert.equal(drift.previousProtectionDisposition, "ABSENT");
  assert.equal(drift.protectionDisposition, "UNKNOWN");
  assert.equal(drift.mergeAttempted, false);
  assert.equal(drift.expectedNext, null);

  for (const name of ["merged-post-main-pending", "satisfied"]) {
    const resumed = fixture.scenarios.find((scenario) => scenario.name === name);
    assert.equal(resumed.protectionDisposition, null, name);
    assert.equal(resumed.currentProtectionGatesResume, false, name);
    assert.match(resumed.protectionReport, /merge-time disposition unavailable/i, name);
  }
});
