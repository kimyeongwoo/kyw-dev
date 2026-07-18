import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SKILL_PATH = join(REPOSITORY_ROOT, "skills", "kyw-grilling", "SKILL.md");
const METADATA_PATH = join(REPOSITORY_ROOT, "skills", "kyw-grilling", "agents", "openai.yaml");

function read(relativePath) {
  return readFileSync(join(REPOSITORY_ROOT, relativePath), "utf8");
}

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

test("kyw-grilling Skill is discoverable only by explicit invocation", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const metadata = readFileSync(METADATA_PATH, "utf8");
  const frontmatter = frontmatterFields(skill);

  assert.deepEqual(Object.keys(frontmatter), ["name", "description"]);
  assert.equal(frontmatter.name, "kyw-grilling");
  assert.match(frontmatter.description, /explicitly invokes \$kyw-grilling/);
  assert.match(frontmatter.description, /do not use for ordinary prompts/);
  assert.match(metadata, /^interface:\n/m);
  assert.match(metadata, /default_prompt: "Use \$kyw-grilling /);
  assert.match(metadata, /policy:\n  allow_implicit_invocation: false\n/);
  assert.doesNotMatch(metadata, /^dependencies:/m);
});

test("kyw-grilling Skill encodes the one-question decision-tree protocol", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const requiredContracts = [
    ["dependency order", /resolve it in dependency order/],
    ["one progress-turn decision question", /On every interview-progress turn, ask exactly one decision question/],
    ["no bundled follow-up", /Do not hide additional questions/],
    ["one recommended answer", /Include exactly one recommended answer/],
    ["wait for feedback", /Wait for the user's answer before continuing/],
    ["fact inspection", /Inspect relevant repository and tool facts with read-only operations/],
    ["targeted inspection", /Target only relevant user-authored paths/],
    ["no broad repository reads", /do not bulk-read broad globs, version-control internals/],
    ["end repository discovery", /End repository discovery after those relevant files are read/],
    ["specific later read", /specific previously unread user-authored path newly relevant/],
    ["user-owned decisions", /Keep decisions with the user/],
    ["surface conflict first", /explicitly state the conflict on the first turn/],
    ["resolve authoritative side", /ask which side is authoritative before any other decision/],
    ["scope precedence", /only conflict is bundled scope exceeding a single-outcome boundary, apply step 5 directly/],
    ["boundary is not product conflict", /state or mutation boundary is not a product conflict/],
    ["highest unresolved dependency first", /first decision question target the highest unresolved domain dependency/],
    ["no downstream substitute", /do not substitute a downstream scope, authorization, recipient, recovery/],
    ["cross-layer dependency ordering", /layers of one cross-layer feature as dependencies of one outcome/],
    ["domain before interface", /Do not mention interface scope .* until its upstream domain dependencies are settled/],
    ["oversized first-release narrowing", /single primary outcome for the first release/],
    ["delegated uncertainty confirmation", /do not treat the recommendation as settled/],
    ["explicit delegated choice", /Ask one explicit confirmation or choice question/],
    ["explicit ownership verb", /Use an explicit ownership verb/],
    ["reject indirect adoption", /do not rely on an indirect “should we adopt” formulation/],
    ["unbundled terminal cancellation", /clear request to stop or cancel the interview is terminal only when it is not combined/],
    ["bundled action precedence", /combined case is implementation pressure and follows the confirmation-boundary rule/],
    ["no stopped interview restart", /After stopping, do not resume the interview in response to later implementation pressure/],
  ];

  for (const [label, pattern] of requiredContracts) {
    assert.match(skill, pattern, `missing ${label} contract`);
  }

  assert.match(skill, /Question: <one decision question>/);
  assert.match(skill, /Recommendation: <recommended answer>/);
  assert.doesNotMatch(skill, /is not implemented yet/);
});

test("kyw-grilling cancellation precedence covers stop and implementation-pressure regressions", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");

  const regressionContracts = [
    {
      case: "pure stop or cancel",
      pattern:
        /clear request to stop or cancel the interview is terminal only when it is not combined, before confirmation, with a request to implement, edit, produce file output, or otherwise mutate/,
    },
    {
      case: "implement now",
      pattern:
        /asks for implementation, editing, file output, or another mutation before confirmation, decline that action/,
    },
    {
      case: "stop interviewing and edit the code",
      pattern:
        /Stop\/cancel wording bundled into the same prohibited request follows this implementation-pressure branch rather than terminal cancellation/,
    },
    {
      case: "implementation pressure after terminal stop",
      pattern:
        /Once terminal cancellation is established, stop immediately[\s\S]*After stopping, do not resume the interview in response to later implementation pressure/,
    },
    {
      case: "one question and recommendation per progress turn",
      pattern:
        /On every interview-progress turn, ask exactly one decision question[\s\S]*Include exactly one recommended answer and concise reasoning with every interview-progress decision question/,
    },
  ];

  for (const { case: label, pattern } of regressionContracts) {
    assert.match(skill, pattern, `missing ${label} precedence contract`);
  }

  assert.match(
    skill,
    /If an answerable decision remains, continue with exactly the next single unresolved decision question, one recommended answer, and concise reasoning/,
  );
  assert.match(skill, /terminal response under the stop conditions is not a progress turn and asks no decision question/);
  assert.match(skill, /require a new explicit `\$kyw-grilling` invocation/);
});

test("kyw-grilling fixture-backed scenario distinguishes inspectable facts from decisions", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const fixture = JSON.parse(read("test/fixtures/kyw-grilling/repository-facts.json"));

  assert.equal(fixture.runtime, "Node.js 22");
  assert.equal(fixture.persistence, "none");
  assert.deepEqual(fixture.productionDependencies, []);
  assert.match(skill, /Do not ask the user for a fact that the environment can establish/);
  assert.match(skill, /Do not disguise the missing fact as a user decision/);
});

test("kyw-grilling tracks semantic decision state and advances by impact", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const requiredContracts = [
    ["semantic decision ledger", /semantic ledger of every decision as asked, resolved, provisionally assumed, or unresolved/],
    ["paraphrase equivalence", /treat paraphrases as the same decision/],
    ["new-evidence reopen gate", /Unless new or conflicting evidence materially reopens an item/],
    ["no equivalent re-asking", /do not ask a semantically equivalent question again/],
    ["safe reversible fallback", /safe, reversible working assumption exists/],
    ["provisional rather than settled", /mark the decision provisionally assumed rather than settled/],
    ["highest-impact progression", /advance to the highest-impact unresolved product or domain decision/],
    ["lower-impact evidence checks", /provenance, recency, or completeness of supporting material are lower impact/],
    ["dependency non-blocking", /must not keep those dependencies blocked/],
    ["unsafe fallback stays unknown", /keep the item as an explicit remaining unknown/],
    ["single ownership revisit", /new evidence for one ownership question; ask it once/],
    ["no ownership-question loop", /provisional-assumption or remaining-unknown rule instead of repeating it/],
  ];

  for (const [label, pattern] of requiredContracts) {
    assert.match(skill, pattern, `missing ${label} contract`);
  }
});

test("kyw-grilling standalone confirmation and zero-mutation boundaries are explicit", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");

  assert.match(skill, /Ask for explicit confirmation that the summary represents shared understanding/);
  assert.match(skill, /Wait for the user's confirmation/);
  assert.match(skill, /Do not invoke another Skill or act on the result/);
  assert.match(skill, /Do not create, edit, rename, move, or delete files/);
  assert.match(skill, /Do not implement the plan before or after confirmation/);
});

test("kyw-grilling upstream MIT license attribution remains preserved", () => {
  const notice = read("THIRD_PARTY_NOTICES.md");
  const license = read("licenses/mattpocock-skills-MIT.txt");

  assert.match(notice, /mattpocock\/skills — grilling \/ grill-me method/);
  assert.match(notice, /Copyright \(c\) 2026 Matt Pocock/);
  assert.match(notice, /licenses\/mattpocock-skills-MIT\.txt/);
  assert.match(license, /^MIT License\n\nCopyright \(c\) 2026 Matt Pocock\n/);
});
