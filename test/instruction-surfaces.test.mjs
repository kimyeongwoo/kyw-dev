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
      name: "READY selection confirmation",
      owner: spec,
      ownerPattern: /Selecting a current-contract `READY\/READY` pair confirms execution/,
      projection: readme,
      projectionPattern: /Exact `READY\/READY` selection confirms execution/,
    },
    {
      name: "continuous mode",
      owner: spec,
      ownerPattern:
        /For `남은 task 계속 실행해줘`, process only pre-created eligible Tasks, serially and within the current invocation/,
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
        /safely resume the sole active pair; if none exists, select the lowest-numbered dependency-satisfied ready pair/,
      projection: readme,
      projectionPattern: /automatic selection resumes or chooses one eligible Task/,
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
      name: "delivery does not grant mutation authority",
      owner: spec,
      ownerPattern: /`STANDARD` is a gate, not authority to commit, push, open or merge a PR/,
      projection: readme,
      projectionPattern: /The gate authorizes no commit, push, PR, or merge by itself/,
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
    /Publication, force push, rerun, branch deletion, and other separately authorized actions remain outside dispatch authority/,
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
