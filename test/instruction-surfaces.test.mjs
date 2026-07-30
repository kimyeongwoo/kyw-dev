import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE,
  PERMANENT_DOCUMENT_POLICY,
} from "../scripts/lib/validate-foundation.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const REPRESENTATIVE_BUDGET_BYTES = 36_864;
const REPRESENTATIVE_TOKEN_BUDGET = 9_216;
const REPRESENTATIVE_TARGET_BYTES = 32_768;
const REPRESENTATIVE_TARGET_TOKENS = 8_192;
const REQUIRED_BYTE_HEADROOM = 4_096;
const REQUIRED_TOKEN_HEADROOM = 1_024;
const BASELINE_PROMPT_BYTES = 5_839;
const REPRESENTATIVE_INSTRUCTION_PATHS = Object.freeze([
  "templates/project/AGENTS.md",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-impl/SKILL.md",
  "skills/kyw-impl/references/execution.md",
]);
const PERMANENT_INDEX_PATHS = Object.freeze([
  "README.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
]);

async function read(relativePath) {
  return readFile(join(REPOSITORY_ROOT, relativePath), "utf8");
}

test("instruction surfaces retain one canonical owner and minimal projections", async () => {
  const [
    agents,
    agentsTemplate,
    readme,
    spec,
    architecture,
    authoring,
    implementation,
    execution,
    prompts,
    plugin,
  ] = await Promise.all([
    read("AGENTS.md"),
    read("templates/project/AGENTS.md"),
    read("README.md"),
    read("docs/SPEC.md"),
    read("docs/ARCHITECTURE.md"),
    read("skills/kyw-task/SKILL.md"),
    read("skills/kyw-impl/SKILL.md"),
    read("skills/kyw-impl/references/execution.md"),
    read("CODEX_PROMPTS.md"),
    read(".codex-plugin/plugin.json").then(JSON.parse),
  ]);

  assert.match(architecture, /### Instruction authority and projections/);
  assert.match(architecture, /Each normative rule family has one owner/);
  assert.match(architecture, /`CODEX_PROMPTS\.md` is maintainer convenience, not normative authority/);
  assert.match(
    architecture,
    /\| Exact Task\/Test shape \| Canonical Task and Test templates \| Deterministic template validator/,
  );
  assert.match(
    readme,
    /Product behavior is owned by \[SPEC\][\s\S]*detailed implementation procedure by \[`kyw-impl`\]/,
  );
  for (const projection of [agents, agentsTemplate]) {
    assert.match(
      projection,
      /Always load applicable `AGENTS\.md` and the selected\/current Task\/Test pair/,
    );
    assert.match(projection, /Index or search README, SPEC, and ARCHITECTURE first/);
    assert.match(projection, /Read all four permanent documents for `kyw-init`, rebaseline/);
    for (const routingAnchor of [
      "All five `kyw-*` Skills are explicit-only",
      "`$kyw-impl NNNN` is portable for existing Tasks",
      "Keep one Task active",
      "Task/Test owns repository outcome; GitHub gates mutable delivery",
    ]) {
      assert.ok(projection.includes(routingAnchor), routingAnchor);
    }
  }

  assert.match(authoring, /author/i);
  assert.match(authoring, /DRAFT\/DRAFT/);
  assert.doesNotMatch(authoring, /\]\(references\/execution\.md\)/);
  const ordinaryBatchBlock = authoring.match(
    /The ordinary production batch[\s\S]*?```json\r?\n([\s\S]*?)\r?\n```/,
  );
  assert.ok(ordinaryBatchBlock, "kyw-task must show its ordinary production batch");
  const ordinaryBatch = JSON.parse(ordinaryBatchBlock[1]);
  const ordinaryTask = ordinaryBatch.tasks[0];
  assert.equal(Object.hasOwn(ordinaryTask, "key"), false);
  assert.equal(ordinaryTask.title, "First outcome");
  assert.deepEqual(ordinaryTask.dependencies, [
    { taskId: "0039" },
    { taskTitle: "Earlier outcome" },
  ]);
  assert.match(
    authoring,
    /adapter[\s\S]{0,120}delegates[\s\S]{0,120}internal-key derivation[\s\S]{0,120}canonical owner/i,
  );
  assert.match(authoring, /`key`\/`taskKey`[\s\S]{0,80}low-level compatibility/i);
  assert.doesNotMatch(authoring, /Give each new outcome[^\n]*taskKey/i);
  assert.doesNotMatch(
    authoring,
    /\b48(?:-|\s)*(?:character|char|자)|INVALID_TASK_BATCH[\s\S]{0,100}(?:short|key)/i,
  );
  assert.match(authoring, /READY\/READY[\s\S]{0,40}(?:pair set and stops|authoring)/i);
  assert.match(authoring, /needs a new `\$kyw-impl NNNN`/);
  assert.match(implementation, /\[Task Execution and Resume\]\(references\/execution\.md\)/);
  assert.match(implementation, /existing Task/i);
  assert.match(execution, /canonical detailed execution procedure/);
  assert.doesNotMatch(implementation, /create-batch --tasks-root/);

  for (const surface of [readme, spec]) {
    assert.match(surface, /\$kyw-task "<(?:goal|outcome|confirmed outcome)>"/i);
    assert.match(surface, /\$kyw-impl NNNN/);
  }
  assert.match(architecture, /kyw-task/i);
  assert.match(architecture, /kyw-impl/i);
  assert.match(spec, /READY\/READY[\s\S]*stop/i);
  assert.match(spec, /does not (?:invoke|chain)[\s\S]*`?\$kyw-impl/i);
  assert.match(readme, /\$kyw-task "goal"[\s\S]*authors[\s\S]*stops/i);
  assert.match(readme, /Continuous mode remains serial and lasts only for the current invocation/);
  assert.match(readme, /automatic selection resumes active work, then resumable `STANDARD` delivery/);
  assert.match(readme, /one-line `\$kyw-impl NNNN` path validates/);
  assert.match(readme, /fixed-bounded checkpoint in exact aligned `main`/);
  assert.match(readme, /at most one uncovered prior/);
  assert.match(readme, /Expired Actions logs for covered/);
  assert.match(readme, /explicit migration\/rebaseline instead of automatic history replay/);
  assert.match(spec, /before (?:its )?one dispatcher call/);
  assert.match(architecture, /bounded local-Git \/ GitHub hydration inputs/);
  assert.match(readme, /surface without the managed contract uses `\$kyw-impl NNNN`/);
  assert.match(
    readme,
    /selected `IMPLEMENT`, `RESUME`, or `DELIVER` result authorizes ordinary Task delivery/,
  );
  assert.match(
    architecture,
    /no automatic registry publish, version\/tag\/Release creation, public[\s\S]*submission, force push, CI rerun, or branch-protection bypass/,
  );
  for (const surface of [readme, spec, architecture]) {
    assert.match(surface, /actual PR[- ]head|actual[- ]head/i);
    assert.match(surface, /merge compatib/i);
    assert.match(surface, /post-merge/i);
  }
  assert.match(execution, /actualHead/);
  assert.match(execution, /merge compatib/i);
  assert.match(execution, /postMerge/);
  assert.match(execution, /HARDENED_EXACT_HEAD/);
  assert.match(execution, /LEGACY_PRE_CONTRACT/);
  assert.match(execution, /DURABLE_STANDARD_CONTINUITY/);
  assert.match(execution, /no automatic whole-history fallback/);
  assert.match(execution, /apply-continuity/);
  assert.match(execution, /actualHead: "UNVERIFIED"/);
  assert.match(execution, /contracts 1\/2 are grandfathered/);
  assert.match(authoring, /delivered contract-3 Tasks use new hard-dependent pairs/);
  assert.match(implementation, /unchanged invocation reports only/i);
  for (const projection of [agents, agentsTemplate]) {
    assert.match(
      projection,
      /(?:future-contract terminal pair becomes byte-immutable|Delivered contract-3 pairs are immutable)/i,
    );
    assert.match(projection, /hard-dependent Task/);
  }
  assert.match(execution, /successful job at only `refs\/pull\/<number>\/merge`/);
  assert.match(readme, /actual PR-head jobs, synthetic merge compatibility/);
  assert.match(spec, /reused/i);
  assert.match(architecture, /`KYWCIEVIDENCE`/);
  for (const surface of [readme, spec, architecture]) {
    assert.doesNotMatch(surface, /--delivery-(?:expectations|ledger)-json/);
    assert.doesNotMatch(surface, /actualHead: "UNVERIFIED"/);
  }

  assert.match(prompts, /절차를 복제하지 않고 호출만 제공한다/);
  assert.match(prompts, /\$kyw-impl/);
  assert.doesNotMatch(prompts, /설치된 `\$kyw-task` 실행 reference/);
  assert.match(plugin.interface.defaultPrompt[1], /\$kyw-task "goal"/);
  assert.match(plugin.interface.defaultPrompt[1], /author[\s\S]*stop/i);
  assert.doesNotMatch(plugin.interface.defaultPrompt[1], /execute|implement|deliver/i);
  assert.doesNotMatch(plugin.interface.defaultPrompt[1], /taskKey|\b48\b/);
  assert.match(plugin.interface.defaultPrompt[2], /\$kyw-impl 0001/);
  for (const invocation of [
    '$kyw-task "<outcome>"',
    "$kyw-impl 0001",
    "task 0001 실행해줘",
    "task 진행해줘",
    "남은 task 계속 실행해줘",
  ]) {
    assert.ok(prompts.includes(invocation), `${invocation}: prompt projection`);
  }
  for (const alias of [
    /task (?:NNNN|\d{4}) 실행해줘/,
    /task 진행해줘/,
    /남은 task 계속 실행해줘/,
  ]) {
    assert.match(spec, alias);
    assert.match(implementation, alias);
  }
});

test("README puts installation, explicit Skills, first use, and current status before maintainer detail", async () => {
  const readme = await read("README.md");
  const orderedMarkers = [
    "## Start here",
    "### Choose one installation surface",
    "### Invoke a Skill explicitly",
    "## Release status",
    "## Task routing and evidence",
    "## Installation details",
    "## Development",
  ];
  let previous = -1;
  for (const marker of orderedMarkers) {
    const index = readme.indexOf(marker);
    assert.ok(index > previous, `${marker} must appear in the first-use order`);
    previous = index;
  }

  const firstUse = readme.slice(0, readme.indexOf("## Release status"));
  for (const invocation of [
    "$kyw-init",
    "$kyw-task",
    "$kyw-impl",
    "$kyw-audit",
    "$kyw-grilling",
  ]) {
    assert.ok(firstUse.includes(invocation), `${invocation} must be visible before release detail`);
  }
  assert.match(
    readme,
    /Version `0\.1\.2`[\s\S]*current public source\/package release/,
  );
  assert.match(
    readme,
    /Exact historical candidates and results live only in their numbered Task\/Test pairs and GitHub/,
  );
  assert.match(
    readme,
    /`kyw-dev@0\.1\.2` is published to the public npm registry under the `latest` tag/,
  );
  assert.match(
    readme,
    /Canonical version metadata does not expose a `gitHead` field/,
  );
  assert.match(
    readme,
    /No version tag, GitHub Release, or public plugin submission has occurred/,
  );
  assert.match(readme, /npx --yes kyw-dev@0\.1\.2 install --scope user/);
  assert.match(readme, /requires separate explicit authority/);
  assert.doesNotMatch(readme, /\bTask 0\d{3}\b|READY_FOR_APPROVAL|UNCHANGED at the audited point/);
  assert.doesNotMatch(readme, /^### Grilling evaluation harness$/m);
  assert.doesNotMatch(readme, /^### Audit behavior smoke$/m);
  assert.doesNotMatch(readme, /^## Target repository layout$/m);
  assert.doesNotMatch(
    firstUse,
    /result schema|SIGINT|process group|protected snapshots|native sandbox/i,
  );
  assert.ok(
    Buffer.byteLength(readme) <=
      PERMANENT_DOCUMENT_COMPACTION_ACCEPTANCE.targets["README.md"],
    "README must satisfy its one-time compaction target",
  );
});

test("permanent truth separates credential-free CI, manual OIDC publication, and authority", async () => {
  const [readme, specification, architecture] = await Promise.all([
    read("README.md"),
    read("docs/SPEC.md"),
    read("docs/ARCHITECTURE.md"),
  ]);

  assert.match(
    readme,
    /\.github\/workflows\/publish\.yml[\s\S]*manual-only[\s\S]*GitHub Actions \/ kimyeongwoo\/kyw-dev \/ publish\.yml \/ npm-production[\s\S]*exact real Git checkout directory[\s\S]*tokenless, OTP-free/,
  );
  assert.match(
    readme,
    /Merging the workflow, passing credential-free CI[\s\S]*neither dispatches nor authorizes/,
  );
  assert.match(readme, /public repository receives npm provenance automatically/);
  assert.match(
    readme,
    /Routine release preflight[\s\S]*without `npm login`, OTP, security-key authentication, account-settings inspection, or `npm trust list`[\s\S]*initial setup[\s\S]*security\/configuration audit or change[\s\S]*actual OIDC\/publisher failure/,
  );
  assert.match(
    readme,
    /successful actual publish is the runtime proof that npm accepted that identity/,
  );

  assert.match(
    specification,
    /One repository-owned expectation[\s\S]*GitHub Actions[\s\S]*kimyeongwoo\/kyw-dev[\s\S]*\.github\/workflows\/publish\.yml[\s\S]*npm-production[\s\S]*allowed action `npm publish`/,
  );
  assert.match(
    specification,
    /no automatic trigger, long-lived npm token, interactive authentication, account-inspection, retry, second-dispatch, or fallback path/,
  );
  assert.match(
    specification,
    /Stable gate[\s\S]*one exact retained candidate[\s\S]*target version absent[\s\S]*clean exact-SHA checkout[\s\S]*`npm publish \.`[\s\S]*exactly once without retry/,
  );
  assert.match(
    specification,
    /public version `0\.1\.2`[\s\S]*public npm registry serves `kyw-dev@0\.1\.2`[\s\S]*Canonical npm version metadata does not expose `gitHead`/,
  );
  assert.match(
    specification,
    /Routine release preflight does not require npm account\/settings inspection[\s\S]*Account-side authentication is limited to initial setup[\s\S]*actual OIDC\/publisher failure/,
  );
  assert.match(
    specification,
    /Successful publication is canonical runtime proof[\s\S]*OIDC\/publisher rejection fails the workflow and blocks the executing Task/,
  );

  assert.match(architecture, /### 8\.5 Trusted publication workflow/);
  assert.match(
    architecture,
    /One repository-owned expectation[\s\S]*\.github\/workflows\/publish\.yml[\s\S]*The manual-only workflow is separate from credential-free CI/,
  );
  assert.match(
    architecture,
    /only its single[\s\S]*job receives `contents: read` plus `id-token: write`/,
  );
  assert.match(
    architecture,
    /publishes that real Git[\s\S]*directory once with `npm publish \.`[\s\S]*retained[\s\S]*candidate[\s\S]*guarded owned-root cleanup/,
  );
  assert.match(
    architecture,
    /Successful trusted publication[\s\S]*creates npm provenance automatically/,
  );
  assert.match(
    architecture,
    /actual successful publish[\s\S]*canonical runtime proof[\s\S]*OIDC\/publisher[\s\S]*rejection has one path[\s\S]*executing Task[\s\S]*records[\s\S]*BLOCKED/,
  );
  assert.match(
    architecture,
    /development-only integration fixture[\s\S]*actual npm CLI[\s\S]*raw submitted packument[\s\S]*directory publication supplies the exact commit as `gitHead`[\s\S]*prebuilt tarball cannot synthesize[\s\S]*post-capture registry rewriting/,
  );
});

test("permanent-document inventory and deliberate scope boundaries stay explicit", async () => {
  const [readme, specification, architecture] = await Promise.all([
    read("README.md"),
    read("docs/SPEC.md"),
    read("docs/ARCHITECTURE.md"),
  ]);
  const projectTemplates = (await readdir(join(REPOSITORY_ROOT, "templates", "project")))
    .filter((name) => name.endsWith(".md"))
    .sort();

  assert.deepEqual(projectTemplates, ["AGENTS.md", "ARCHITECTURE.md", "README.md", "SPEC.md"]);
  assert.deepEqual(
    PERMANENT_DOCUMENT_POLICY.documents.map(({ path }) => path),
    ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"],
  );
  assert.match(readme, /The four permanent documents are README, AGENTS, SPEC, and ARCHITECTURE/);
  assert.match(specification, /A managed project uses four permanent documents/);
  assert.match(
    specification,
    /Supporting installation\/discovery paths beyond managed direct user\/project Skills and Codex plugin marketplace\/cache bytes/,
  );
  assert.match(
    specification,
    /Supporting a current-contract `STANDARD` delivery ledger other than GitHub PR\/Actions exact-SHA evidence/,
  );
  assert.match(architecture, /## 12\. Deliberate scope boundaries/);
  for (const boundary of [
    /no delivery-provider interface/,
    /no generic install backend/,
    /no shared transaction\/filesystem framework/,
    /daemon, watcher,[\s\S]*filesystem\/process(?:\/OS)? tracing/,
    /no generated permanent-document summary/,
    /no automatic registry publish/,
  ]) {
    assert.match(architecture, boundary);
  }
  assert.match(architecture, /### 9\.1 Foundation and permanent-document policy/);
  assert.match(
    architecture,
    /historical Task\/Test evidence/,
  );
  assert.doesNotMatch(
    architecture,
    /\bTask 0\d{3}\b|READY_FOR_APPROVAL|UNCHANGED at the audited point/,
  );
});

test("permanent-document local Markdown references resolve to repository files", async () => {
  for (const relativePath of ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"]) {
    const markdown = await read(relativePath);
    for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
      const reference = match[1];
      if (/^(?:https?:|#)/.test(reference)) {
        continue;
      }
      const target = decodeURIComponent(reference.split("#", 1)[0]);
      await assert.doesNotReject(
        access(join(REPOSITORY_ROOT, dirname(relativePath), target)),
        `${relativePath} contains a missing local reference: ${reference}`,
      );
    }
  }
});

test("the split representative instruction bundle stays concise with one execution reference", async () => {
  const contents = await Promise.all(
    REPRESENTATIVE_INSTRUCTION_PATHS.map((relativePath) => read(relativePath)),
  );
  const currentBytes = contents.reduce(
    (total, content) => total + Buffer.byteLength(content),
    0,
  );
  const currentTokenEstimate = Math.ceil(currentBytes / 4);

  assert.ok(
    currentBytes < REPRESENTATIVE_BUDGET_BYTES,
    `expected fewer than ${REPRESENTATIVE_BUDGET_BYTES} bytes, received ${currentBytes}`,
  );
  assert.ok(
    currentTokenEstimate < REPRESENTATIVE_TOKEN_BUDGET,
    `expected fewer than ${REPRESENTATIVE_TOKEN_BUDGET} estimated tokens, received ${currentTokenEstimate}`,
  );
  assert.ok(
    currentBytes <= REPRESENTATIVE_TARGET_BYTES,
    `expected at most ${REPRESENTATIVE_TARGET_BYTES} bytes, received ${currentBytes}`,
  );
  assert.ok(
    currentTokenEstimate <= REPRESENTATIVE_TARGET_TOKENS,
    `expected at most ${REPRESENTATIVE_TARGET_TOKENS} estimated tokens, received ${currentTokenEstimate}`,
  );
  assert.ok(
    REPRESENTATIVE_BUDGET_BYTES - currentBytes >= REQUIRED_BYTE_HEADROOM,
    "representative instructions must retain at least 4 KiB below the unchanged byte guard",
  );
  assert.ok(
    REPRESENTATIVE_TOKEN_BUDGET - currentTokenEstimate >=
      REQUIRED_TOKEN_HEADROOM,
    "representative instructions must retain at least 1,024 estimated tokens below the unchanged token guard",
  );
  assert.equal(REPRESENTATIVE_INSTRUCTION_PATHS.length, 4);
  assert.equal(PERMANENT_INDEX_PATHS.length, 3);
  assert.deepEqual(PERMANENT_INDEX_PATHS, [
    "README.md",
    "docs/SPEC.md",
    "docs/ARCHITECTURE.md",
  ]);
  await Promise.all(PERMANENT_INDEX_PATHS.map((relativePath) => read(relativePath)));

  const authoringSkill = contents[1];
  const implementationSkill = contents[2];
  assert.deepEqual(
    [...authoringSkill.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((match) => match[1]),
    [],
  );
  const referenceLinks = [
    ...implementationSkill.matchAll(/\]\((references\/[^)]+\.md)\)/g),
  ].map((match) => match[1]);
  assert.deepEqual([...new Set(referenceLinks)], ["references/execution.md"]);
});

test("routine Task workflows index owners before targeted reads and escalate only when required", async () => {
  const [agents, agentsTemplate, init, task, implementation, execution, audit] =
    await Promise.all([
      read("AGENTS.md"),
      read("templates/project/AGENTS.md"),
      read("skills/kyw-init/SKILL.md"),
      read("skills/kyw-task/SKILL.md"),
      read("skills/kyw-impl/SKILL.md"),
      read("skills/kyw-impl/references/execution.md"),
      read("skills/kyw-audit/references/audit.md"),
    ]);

  for (const projection of [agents, agentsTemplate]) {
    assert.match(
      projection,
      /Always load applicable `AGENTS\.md` and the selected\/current Task\/Test pair/,
    );
    assert.match(projection, /Index or search README, SPEC, and ARCHITECTURE first/);
    assert.match(projection, /read only owner sections selected by Goal, scope/);
    assert.match(projection, /Read all four permanent documents for `kyw-init`, rebaseline/);
    assert.match(projection, /Stop if a conflict remains unresolved/);
  }

  for (const workflow of [task, execution, audit]) {
    assert.match(
      workflow,
      /applicable[\s\S]{0,80}`?AGENTS\.md`?|applicable repository instructions/i,
    );
    assert.match(
      workflow,
      /Index or search headings in `?README(?:\.md)?`?,\s*`?(?:docs\/)?SPEC(?:\.md)?`?,\s*and\s*`?(?:docs\/)?ARCHITECTURE(?:\.md)?`?/,
    );
    assert.match(
      workflow,
      /(?:read|to) only the\s+owning permanent-document sections/i,
    );
    assert.match(
      workflow,
      /(?:full(?:y)? read|full read of) all (?:existing|four) permanent documents/i,
    );
    assert.match(workflow, /source conflict/i);
    assert.match(workflow, /Stop[\s\S]*conflict remains\s+unresolved/i);
    assert.doesNotMatch(
      workflow,
      /Read `README\.md`, `AGENTS\.md`, `docs\/SPEC\.md`, and `docs\/ARCHITECTURE\.md`/,
    );
  }

  assert.match(init, /every `kyw-init` mode[\s\S]*full read/i);
  assert.match(init, /all four existing permanent-document paths/);
  assert.match(implementation, /\[Task Execution and Resume\]\(references\/execution\.md\)/);
  assert.doesNotMatch(implementation, /Index or search headings in README/);
});

test("maintainer Task prompts use short invocation instead of an external mega-prompt", async () => {
  const prompts = await read("CODEX_PROMPTS.md");

  assert.match(prompts, /^task 0001 실행해줘$/m);
  assert.match(prompts, /^\$kyw-task "<outcome>"$/m);
  assert.match(prompts, /^\$kyw-impl 0001$/m);
  assert.match(prompts, /^task 진행해줘$/m);
  assert.match(prompts, /^남은 task 계속 실행해줘$/m);
  assert.doesNotMatch(prompts, /^## 최초 구현 프롬프트$/m);
  assert.doesNotMatch(prompts, /^## 다음 Task 실행 프롬프트$/m);
  assert.doesNotMatch(prompts, /^## Compact 또는 새 세션 이후 재개 프롬프트$/m);
  assert.doesNotMatch(prompts, /다음만 읽는다|완료 조건과 검증의 대응 관계/);
  assert.ok(Buffer.byteLength(prompts) < BASELINE_PROMPT_BYTES);
});

test("Task runtime has no model or reasoning-effort mutation path", async () => {
  const runtimePaths = [
    "src/core/task-artifacts.mjs",
    "skills/kyw-task/scripts/task-artifacts.mjs",
  ];
  for (const relativePath of runtimePaths) {
    const runtime = await read(relativePath);
    assert.doesNotMatch(
      runtime,
      /--model\b|--reasoning-effort\b|model_reasoning_effort\s*=|reasoning_effort\s*=/,
      relativePath,
    );
  }

  const execution = await read("skills/kyw-impl/references/execution.md");
  assert.match(execution, /Inherit the active session's configured model and reasoning effort/);
  assert.match(execution, /unless the current user explicitly requests that change/);
  assert.match(execution, /Use `UNAVAILABLE` as both value and observability/);
});

test("installation guidance distinguishes supported surfaces, scopes, aliases, and duplicate resolution", async () => {
  const [readme, spec, architecture] = await Promise.all([
    read("README.md"),
    read("docs/SPEC.md"),
    read("docs/ARCHITECTURE.md"),
  ]);

  for (const officialSource of [
    "https://learn.chatgpt.com/docs/build-skills",
    "https://learn.chatgpt.com/docs/build-plugins",
    "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
  ]) {
    assert.ok(readme.includes(officialSource), `missing official source ${officialSource}`);
  }
  for (const row of [
    "| Codex CLI |",
    "| ChatGPT desktop Codex |",
    "| Codex IDE extension |",
    "| Repository scope |",
    "| User scope |",
  ]) {
    assert.ok(readme.includes(row), `missing compatibility row ${row}`);
  }
  assert.match(readme, /Plugins are not available in the IDE extension/);
  assert.match(readme, /`install --scope project`/);
  assert.match(readme, /`install --scope user`/);
  assert.match(
    readme,
    /The portable `\$kyw-grilling`, `\$kyw-init`, `\$kyw-task "<outcome>"`, `\$kyw-impl NNNN`, and `\$kyw-audit NNNN` forms/,
  );
  assert.match(
    readme,
    /surface without the managed contract uses `\$kyw-impl NNNN`/,
  );
  assert.match(readme, /removing a plugin through the supported plugin browser/);
  assert.match(readme, /Direct Skills and plugin installation are alternatives, not layers to combine/);
  assert.match(
    readme,
    /`--force` may remove modified regular files already named by valid ownership metadata/,
  );
  assert.match(readme, /it never broadens ownership to unknown files/);

  assert.match(
    spec,
    /duplicate Skill names/,
  );
  assert.match(spec, /Plugin-cache discovery reports installed bytes and source without claiming/);
  assert.match(architecture, /plugin-cache Skill sources/);
  assert.match(
    architecture,
    /Cache presence proves installed[\s\S]*bytes, not enabled session state/,
  );
  assert.match(architecture, /never follows a linked or unsupported[\s\S]*component/);
});
