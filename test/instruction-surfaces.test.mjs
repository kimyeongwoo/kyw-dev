import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASELINE_REPRESENTATIVE_BYTES = 36_382;
const BASELINE_REPRESENTATIVE_TOKEN_ESTIMATE = 9_096;
const BASELINE_PROMPT_BYTES = 5_839;
const REPRESENTATIVE_INSTRUCTION_PATHS = Object.freeze([
  "templates/project/AGENTS.md",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-task/references/execution.md",
]);
const STABLE_INSTRUCTION_PATHS = Object.freeze([
  "AGENTS.md",
  "README.md",
  "docs/SPEC.md",
  "docs/ARCHITECTURE.md",
  "skills/kyw-task/SKILL.md",
  "skills/kyw-task/references/execution.md",
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

test("instruction rule families have one canonical owner and minimal identified projections", async () => {
  const [agents, agentsTemplate, readme, spec, architecture, skill, execution, prompts] =
    await Promise.all([
      read("AGENTS.md"),
      read("templates/project/AGENTS.md"),
      read("README.md"),
      read("docs/SPEC.md"),
      read("docs/ARCHITECTURE.md"),
      read("skills/kyw-task/SKILL.md"),
      read("skills/kyw-task/references/execution.md"),
      read("CODEX_PROMPTS.md"),
    ]);

  assert.match(architecture, /### Instruction authority and projections/);
  assert.match(architecture, /Each normative rule family has one owner/);
  assert.match(architecture, /`CODEX_PROMPTS\.md` is maintainer convenience, not normative authority/);
  assert.match(
    architecture,
    /\| Repository-wide workspace, routing, model\/delivery preservation, change\/document discipline, Task\/Test lifecycle, stable-check, and completion invariants \| Root or generated `AGENTS\.md` \|/,
  );
  assert.match(
    architecture,
    /\| Artifact shape and default evidence fields \| Canonical Task\/Test templates \| `src\/core\/template-contracts\.mjs` enforces/,
  );
  assert.match(readme, /These commands are a concise user projection/);
  assert.match(agentsTemplate, /minimal derived projection required for loaded repository routing/);
  assert.equal(sectionBullets(agentsTemplate, "Task Routing").length, 3);
  assert.equal(sectionBullets(agents, "Task routing").length, 3);
  assert.deepEqual(
    sectionBullets(agentsTemplate, "Task Routing"),
    sectionBullets(agents, "Task routing"),
    "the generated routing projection must preserve every repository routing invariant",
  );
  assert.match(skill, /execution reference is the canonical detailed procedure/);
  assert.doesNotMatch(skill, /^## Resume or execute an existing Task$/m);
  assert.match(execution, /This reference is the canonical detailed execution procedure/);
  assert.match(prompts, /절차를 복제하지 않고 호출만 제공한다/);
  assert.match(
    prompts,
    /`AGENTS\.md`는 저장소 불변 규칙을, 현재 Task\/Test는 현재 범위와 증거를, 설치된 `\$kyw-task` 실행 reference는 상세 실행 절차를 소유한다/,
  );
  assert.doesNotMatch(prompts, /현재 Task가 명백히 작은 경우가 아니라면/);
  assert.doesNotMatch(prompts, /여러 Task는 연속 모드에서만 직렬로 진행한다/);

  const projectionParity = [
    {
      name: "READY selection lifecycle authority",
      owner: spec,
      ownerPattern:
        /Selecting a current-contract `READY\/READY` pair confirms implementation and, for `STANDARD`, the ordinary delivery lifecycle/,
      projection: readme,
      projectionPattern:
        /Exact `READY\/READY` selection confirms implementation and ordinary `STANDARD` delivery/,
    },
    {
      name: "continuous mode",
      owner: spec,
      ownerPattern:
        /For `남은 task 계속 실행해줘`, use the same priority and authority for each selected Task, process only pre-created eligible Tasks serially and within the current invocation/,
      projection: readme,
      projectionPattern: /continuous mode remains serial and current-invocation-only/,
    },
    {
      name: "resume point continuity",
      owner: spec,
      ownerPattern: /Resume at `Resume Point` rather than repeating completed work/,
      projection: readme,
      projectionPattern:
        /continues at the verified `Resume Point` without repeating Completed work/,
    },
    {
      name: "automatic eligible selection",
      owner: spec,
      ownerPattern:
        /safely resume the sole active pair; if none exists, resume the lowest-numbered repository-complete Task whose `STANDARD` delivery is classified `RESUMABLE`; only then select the lowest-numbered dependency-satisfied ready pair/,
      projection: readme,
      projectionPattern: /Automatic selection resumes active work, then resumable delivery/,
    },
    {
      name: "invalid state and dependency failure",
      owner: spec,
      ownerPattern:
        /A missing referenced Task, dependency cycle, or unsatisfied hard dependency fails closed/,
      projection: readme,
      projectionPattern: /Invalid states or dependencies fail closed/,
    },
    {
      name: "managed aliases and portable fallback",
      owner: spec,
      ownerPattern:
        /natural-language forms are anchored repository aliases available only when a kyw-managed `AGENTS\.md` routing contract is loaded/,
      projection: readme,
      projectionPattern:
        /incidental “task” prose does not route, and a surface without the managed contract uses `\$kyw-task NNNN`/,
    },
    {
      name: "first-Task override safety",
      owner: spec,
      ownerPattern:
        /It applies to the first selected Task unless the user explicitly scopes it to every remaining Task, and it cannot waive acceptance, evidence honesty, safety/,
      projection: readme,
      projectionPattern:
        /Appended user text may constrain the first selected Task but cannot waive safety or evidence/,
    },
    {
      name: "model and effort preservation",
      owner: spec,
      ownerPattern:
        /Preserve the active model and reasoning effort unless the current user explicitly overrides them/,
      projection: readme,
      projectionPattern:
        /configured model and reasoning effort stay unchanged unless that user explicitly overrides them/,
    },
    {
      name: "provenance fields and unavailable values",
      owner: spec,
      ownerPattern:
        /record model identifier, requested model alias, reasoning effort, concrete Codex surface, Codex version, and per-field observability/,
      projection: readme,
      projectionPattern:
        /records model identifier, requested alias, reasoning effort, Codex surface, version, and per-field observability; hidden values remain `UNAVAILABLE`, never guessed/,
    },
    {
      name: "repository and delivery ledger ownership",
      owner: spec,
      ownerPattern:
        /Let Task\/Test own repository outcome and reproducible evidence[\s\S]*GitHub PR\/Actions exact-SHA state as its canonical ledger/,
      projection: readme,
      projectionPattern:
        /Task\/Test owns repository outcome; GitHub owns mutable delivery state/,
    },
    {
      name: "static delivery declaration has no ambient authority",
      owner: spec,
      ownerPattern:
        /The static `STANDARD` declaration alone grants no ambient mutation authority/,
      projection: readme,
      projectionPattern: /The static declaration alone grants no ambient authority/,
    },
    {
      name: "recognized selection grants ordinary delivery authority",
      owner: spec,
      ownerPattern:
        /a recognized exact, automatic, or continuous invocation returning `IMPLEMENT`, `RESUME`, or `DELIVER` grants the selected Task's ordinary lifecycle authority without another ceremonial confirmation/,
      projection: readme,
      projectionPattern:
        /`IMPLEMENT`, `RESUME`, or `DELIVER` selection authorizes exact-path commit, non-force push, non-draft PR, exact-head CI, expected-head merge, post-merge base-branch CI, and terminal reporting without ceremonial reconfirmation/,
    },
    {
      name: "separate authority boundary",
      owner: spec,
      ownerPattern:
        /It excludes publication, registry mutation, tags, GitHub Releases, public plugin submission, force push, destructive recovery, branch deletion, workflow rerun, bypass, and unrelated mutation/,
      projection: readme,
      projectionPattern:
        /Publication, registry mutation, tags\/releases, public submission, force\/destructive operations, reruns, bypasses, and unrelated mutations remain separately authorized/,
    },
  ];
  for (const rule of projectionParity) {
    assert.match(rule.owner, rule.ownerPattern, `${rule.name}: canonical owner`);
    assert.match(rule.projection, rule.projectionPattern, `${rule.name}: README projection`);
  }

  for (const invocation of [
    { prompt: "$kyw-task 0001", ownerPattern: /\$kyw-task NNNN/ },
    { prompt: "task 0001 실행해줘", ownerPattern: /task \d{4} 실행해줘/ },
    { prompt: "task 진행해줘", ownerPattern: /task 진행해줘/ },
    { prompt: "남은 task 계속 실행해줘", ownerPattern: /남은 task 계속 실행해줘/ },
  ]) {
    assert.match(spec, invocation.ownerPattern, `${invocation.prompt}: SPEC owner`);
    assert.ok(prompts.includes(invocation.prompt), `${invocation.prompt}: prompt projection`);
  }

  assert.match(
    architecture,
    /Publication, registry mutation, tags, releases, public submission, force push, destructive recovery, branch deletion, rerun, bypass, and unrelated mutation remain separate authority boundaries/,
  );
});

test("the same representative instruction bundle shrinks without a new reference path", async () => {
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
  assert.equal(REPRESENTATIVE_INSTRUCTION_PATHS.length, 3);
  assert.equal(STABLE_INSTRUCTION_PATHS.length, 6);
  assert.equal(RUNTIME_CONTEXT_PATHS.length, 8);
  assert.equal(new Set(RUNTIME_CONTEXT_PATHS).size, RUNTIME_CONTEXT_PATHS.length);
  await Promise.all(RUNTIME_CONTEXT_PATHS.map((relativePath) => read(relativePath)));

  const skill = contents[1];
  const referenceLinks = [
    ...skill.matchAll(/\]\((references\/[^)]+\.md)\)/g),
  ].map((match) => match[1]);
  assert.deepEqual([...new Set(referenceLinks)], ["references/execution.md"]);
});

test("maintainer Task prompts use short invocation instead of an external mega-prompt", async () => {
  const prompts = await read("CODEX_PROMPTS.md");

  assert.match(prompts, /^task 0001 실행해줘$/m);
  assert.match(prompts, /^\$kyw-task 0001$/m);
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

  const execution = await read("skills/kyw-task/references/execution.md");
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
  assert.match(readme, /The portable `\$kyw-grilling`, `\$kyw-init`, `\$kyw-task NNNN`, and `\$kyw-audit NNNN` forms/);
  assert.match(readme, /If that contract is absent, not loaded, or outside the current instruction chain, use `\$kyw-task NNNN`/);
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
