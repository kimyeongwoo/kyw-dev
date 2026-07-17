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
    ["one decision question", /Ask exactly one decision question per turn/],
    ["no bundled follow-up", /Do not hide additional questions/],
    ["recommended answer", /Include one recommended answer/],
    ["wait for feedback", /Wait for the user's answer before continuing/],
    ["fact inspection", /Inspect relevant repository and tool facts with read-only operations/],
    ["user-owned decisions", /Keep decisions with the user/],
  ];

  for (const [label, pattern] of requiredContracts) {
    assert.match(skill, pattern, `missing ${label} contract`);
  }

  assert.match(skill, /Question: <one decision question>/);
  assert.match(skill, /Recommendation: <recommended answer>/);
  assert.doesNotMatch(skill, /is not implemented yet/);
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
