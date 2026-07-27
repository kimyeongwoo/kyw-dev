import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASELINE_REPRESENTATIVE_BYTES = 36_382;
const BASELINE_REPRESENTATIVE_TOKEN_ESTIMATE = 9_096;
const BASELINE_PROMPT_BYTES = 5_839;
const REPRESENTATIVE_INSTRUCTION_PATHS = Object.freeze([
  "templates/project/AGENTS.md",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-impl/SKILL.md",
  "skills/kyw-impl/references/execution.md",
]);
const STABLE_INSTRUCTION_PATHS = Object.freeze([
  "AGENTS.md",
  "README.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-impl/SKILL.md",
  "skills/kyw-impl/references/execution.md",
]);
const RUNTIME_CONTEXT_PATHS = Object.freeze([
  ...STABLE_INSTRUCTION_PATHS,
  "docs/tasks/0031-lean-instruction-and-model-provenance/TASK.md",
  "docs/tasks/0031-lean-instruction-and-model-provenance/TEST.md",
]);

async function read(relativePath) {
  return readFile(join(REPOSITORY_ROOT, relativePath), "utf8");
}

function sectionBullets(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const bullets = [];
  let active = false;
  for (const line of lines) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      if (active) break;
      active = match[1].toLowerCase() === heading.toLowerCase();
    } else if (active && line.startsWith("- ")) {
      bullets.push(line);
    }
  }
  return bullets;
}

test("instruction surfaces split authoring from one canonical implementation owner", async () => {
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
    /\| Artifact shape and default evidence fields \| Canonical Task\/Test templates \| `src\/core\/template-contracts\.mjs` enforces/,
  );
  assert.match(readme, /These commands are a concise user projection/);
  assert.match(agentsTemplate, /minimal derived projection required for loaded repository routing/);
  assert.equal(sectionBullets(agentsTemplate, "Task Routing").length, 4);
  assert.equal(sectionBullets(agents, "Task routing").length, 4);
  assert.deepEqual(
    sectionBullets(agentsTemplate, "Task Routing"),
    sectionBullets(agents, "Task routing"),
    "the generated routing projection must preserve every repository routing invariant",
  );

  assert.match(authoring, /author/i);
  assert.match(authoring, /DRAFT\/DRAFT/);
  assert.doesNotMatch(authoring, /\]\(references\/execution\.md\)/);
  assert.match(implementation, /\[Task Execution and Resume\]\(references\/execution\.md\)/);
  assert.match(implementation, /existing Task/i);
  assert.match(execution, /canonical detailed execution procedure/);
  assert.doesNotMatch(implementation, /create-batch --tasks-root/);

  for (const surface of [readme, spec, architecture]) {
    assert.match(surface, /\$kyw-task "<(?:goal|outcome|confirmed outcome)>"/i);
    assert.match(surface, /\$kyw-impl NNNN/);
  }
  assert.match(spec, /READY\/READY[\s\S]*stop/i);
  assert.match(spec, /does not (?:invoke|chain)[\s\S]*`?\$kyw-impl/i);
  assert.match(readme, /authoring[\s\S]*stops/i);
  assert.match(readme, /continuous mode remains serial and current-invocation-only/);
  assert.match(readme, /Automatic selection resumes active work, then resumable delivery/);
  assert.match(readme, /Invalid states or dependencies fail closed/);
  assert.match(readme, /surface without the managed contract uses `\$kyw-impl NNNN`/);
  assert.match(
    readme,
    /`IMPLEMENT`, `RESUME`, or `DELIVER` selection authorizes exact-path commit, non-force push, non-draft PR, exact-head CI, expected-head merge, post-merge base-branch CI, and terminal reporting without ceremonial reconfirmation/,
  );
  assert.match(
    architecture,
    /Publication, registry mutation, tags, releases, public submission, force push, destructive recovery, branch deletion, rerun, bypass, and unrelated mutation remain separate authority boundaries/,
  );
  for (const surface of [readme, spec, architecture]) {
    assert.match(surface, /actual PR-head|actual head/i);
    assert.match(surface, /merge compatib/i);
    assert.match(surface, /post-merge/i);
  }
  assert.match(execution, /actualHead/);
  assert.match(execution, /merge compatib/i);
  assert.match(execution, /postMerge/);
  assert.match(execution, /HARDENED_EXACT_HEAD/);
  assert.match(execution, /LEGACY_PRE_CONTRACT/);
  assert.match(execution, /actualHead: "UNVERIFIED"/);
  assert.match(execution, /successful job at only `refs\/pull\/<number>\/merge`/);
  assert.match(readme, /successful synthetic checkout never counts as actual-head PASS/);
  assert.match(spec, /reused role\/job/);
  assert.match(architecture, /`KYWCIEVIDENCE`/);

  assert.match(prompts, /절차를 복제하지 않고 호출만 제공한다/);
  assert.match(prompts, /\$kyw-impl/);
  assert.doesNotMatch(prompts, /설치된 `\$kyw-task` 실행 reference/);
  assert.match(plugin.interface.defaultPrompt[1], /\$kyw-task "goal"/);
  assert.match(plugin.interface.defaultPrompt[1], /author[\s\S]*stop/i);
  assert.doesNotMatch(plugin.interface.defaultPrompt[1], /execute|implement|deliver/i);
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
    /task \d{4} 실행해줘/,
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
    "### First workflow",
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
  assert.match(readme, /Task 0020 is `BLOCKED`/);
  assert.match(readme, /Tasks 0029 and 0038 reached `READY_FOR_APPROVAL` and were later superseded/);
  assert.match(readme, /Task 0047's exact historical candidate also reached `READY_FOR_APPROVAL`/);
  assert.match(readme, /Task 0048 found its package-relevant bytes `UNCHANGED` at the audited point/);
  assert.match(
    readme,
    /numbered Task\/Test artifacts—not this durable summary—are the authoritative record for exact candidate identities, verdicts, and supersession/,
  );
  assert.match(
    readme,
    /Candidate readiness describes only the exact evaluated bytes and never authorizes publication, registry mutation, a version change, a tag, a GitHub Release, or a public submission/,
  );
  assert.match(
    readme,
    /No publication-boundary package version change, version tag, GitHub Release, npm publication, registry mutation, or public plugin-directory submission has occurred/,
  );
  assert.doesNotMatch(readme, /A fresh full release re-gate is required/);
  assert.doesNotMatch(readme, /current repository bytes are not release-approved/);
  assert.doesNotMatch(readme, /Tasks 0001 through 0015/);
  assert.doesNotMatch(readme, /^### Grilling evaluation harness$/m);
  assert.doesNotMatch(readme, /^### Audit behavior smoke$/m);
  assert.doesNotMatch(readme, /^## Target repository layout$/m);
  assert.doesNotMatch(
    firstUse,
    /result schema|SIGINT|process group|protected snapshots|native sandbox/i,
  );
  assert.ok(Buffer.byteLength(readme) < 24_000, "README must remain a concise user entry point");
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
  assert.match(architecture, /## 17\. Deliberate scope boundaries/);
  for (const boundary of [
    "Delivery-provider interface",
    "Generic provider or install-backend framework",
    "Shared generic transaction/filesystem framework",
    "daemon, watcher, filesystem/process/OS tracing",
    "Full Node.js 22/24 LTS matrix",
    "Separately approved registry identity check",
  ]) {
    assert.ok(architecture.includes(boundary), `missing deliberate boundary: ${boundary}`);
  }
  assert.match(architecture, /### Release-isolation lifecycle/);
  assert.match(
    architecture,
    /Historical run-specific evidence and verdicts remain in their immutable Task\/Test pairs/,
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
    currentBytes < BASELINE_REPRESENTATIVE_BYTES,
    `expected fewer than ${BASELINE_REPRESENTATIVE_BYTES} bytes, received ${currentBytes}`,
  );
  assert.ok(
    currentTokenEstimate < BASELINE_REPRESENTATIVE_TOKEN_ESTIMATE,
    `expected fewer than ${BASELINE_REPRESENTATIVE_TOKEN_ESTIMATE} estimated tokens, received ${currentTokenEstimate}`,
  );
  assert.equal(REPRESENTATIVE_INSTRUCTION_PATHS.length, 4);
  assert.equal(STABLE_INSTRUCTION_PATHS.length, 7);
  assert.equal(RUNTIME_CONTEXT_PATHS.length, 9);
  assert.equal(new Set(RUNTIME_CONTEXT_PATHS).size, RUNTIME_CONTEXT_PATHS.length);
  await Promise.all(RUNTIME_CONTEXT_PATHS.map((relativePath) => read(relativePath)));

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

  assert.match(readme, /Official surface behavior was checked on \*\*2026-07-24\*\*/);
  for (const officialSource of [
    "https://learn.chatgpt.com/docs/build-skills",
    "https://learn.chatgpt.com/docs/plugins",
    "https://learn.chatgpt.com/docs/build-plugins",
    "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
  ]) {
    assert.ok(readme.includes(officialSource), `missing dated official source ${officialSource}`);
  }
  for (const row of [
    "| Codex CLI |",
    "| Desktop Codex in the ChatGPT desktop app |",
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
    /If that contract is absent, not loaded, or outside the current instruction chain, use `\$kyw-impl NNNN`/,
  );
  assert.match(readme, /Remove a plugin through the desktop Plugins Directory or the CLI `\/plugins` browser/);
  assert.match(readme, /do not manually delete the broad plugin cache/);
  assert.match(readme, /`--force` can remove only modified files already named by valid kyw-dev ownership metadata/);

  assert.match(
    spec,
    /duplicate `kyw-\*` Skill names across direct user, direct repository, and installed plugin-cache sources/,
  );
  assert.match(spec, /Plugin-cache discovery reports installed bytes and their source; it does not infer/);
  assert.match(architecture, /plugins\/cache\/<marketplace>\/<plugin>\/<version>\/skills\//);
  assert.match(architecture, /Cache presence proves installed bytes, not enabled state/);
  assert.match(architecture, /never follows a linked or unsupported cache component/);
});
