import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SKILL_PATH = join(REPOSITORY_ROOT, "skills", "kyw-init", "SKILL.md");
const METADATA_PATH = join(REPOSITORY_ROOT, "skills", "kyw-init", "agents", "openai.yaml");
const FIXTURE_ROOT = join(REPOSITORY_ROOT, "test", "fixtures", "kyw-init");

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

function fixture(relativePath) {
  return readFileSync(join(FIXTURE_ROOT, relativePath), "utf8");
}

const scenarios = JSON.parse(fixture("scenarios.json"));

test("kyw-init Skill is implemented and explicit-only", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const metadata = readFileSync(METADATA_PATH, "utf8");
  const frontmatter = frontmatterFields(skill);

  assert.deepEqual(Object.keys(frontmatter), ["name", "description"]);
  assert.equal(frontmatter.name, "kyw-init");
  assert.match(frontmatter.description, /explicitly invokes \$kyw-init/);
  assert.match(frontmatter.description, /do not use for ordinary prompts/);
  assert.doesNotMatch(skill, /is not implemented yet/);
  assert.match(metadata, /default_prompt: "Use \$kyw-init /);
  assert.match(metadata, /policy:\n  allow_implicit_invocation: false\n/);
  assert.doesNotMatch(metadata, /^dependencies:/m);
});

test("kyw-init classifies all three modes from facts and intentional replacement", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");

  assert.deepEqual(
    Object.values(scenarios).map(({ expectedMode }) => expectedMode),
    ["new", "adopt", "rebaseline"],
  );
  assert.match(skill, /`new`: little or no application implementation exists/);
  assert.match(skill, /`adopt`: meaningful implementation exists/);
  assert.match(skill, /`rebaseline`: an existing kyw-dev baseline/);
  assert.match(skill, /Never infer permission to rebaseline/);
  assert.match(skill, /conflicting claims explicitly/);
});

test("kyw-init inspects facts and uses the grilling confirmation boundary before writes", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const adoptPackage = JSON.parse(fixture("adopt-project/package.json"));
  const adoptSource = fixture("adopt-project/src/server");

  assert.equal(adoptPackage.engines.node, ">=22");
  assert.equal(adoptPackage.scripts.start, "node ./src/server");
  assert.equal(adoptPackage.scripts.test, "node --test");
  assert.match(adoptSource, /DEFAULT_PORT = 4318/);
  assert.match(skill, /Inspect existing files with read-only operations before asking questions/);
  assert.match(skill, /never ask the user to repeat a fact that inspection can establish/);
  assert.match(skill, /Apply the installed `\$kyw-grilling` protocol/);
  assert.match(skill, /one decision question per turn/);
  assert.match(skill, /Ask the user to confirm that summary and write plan explicitly/);
  assert.match(skill, /Proceed only after explicit confirmation/);
  assert.match(skill, /do not create `docs\/` as a pre-confirmation marker/);
});

test("kyw-init limits materialization to four canonical project documents", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const expectedPaths = ["README.md", "AGENTS.md", "docs/SPEC.md", "docs/ARCHITECTURE.md"];

  assert.deepEqual(scenarios.new.requiredDocuments, expectedPaths);
  assert.deepEqual(scenarios.new.allowedMutations, expectedPaths);
  for (const path of expectedPaths) {
    assert.match(skill, new RegExp(path.replace("/", "\\/")));
  }
  assert.match(skill, /templates\/project\/\{README,AGENTS,SPEC,ARCHITECTURE\}\.md/);
  assert.match(skill, /Do not modify application code/);
  assert.match(skill, /Do not create proposed Task directories/);
  assert.match(skill, /Do not leave `\{\{\.\.\.\}\}`/);
  assert.match(skill, /unexplained unfinished markers/);
  assert.match(skill, /only the four allowed paths changed/);
});

test("kyw-init adoption fixtures expose inspectable facts and preservation markers", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const adoptReadme = fixture("adopt-project/README.md");
  const adoptAgents = fixture("adopt-project/AGENTS.md");
  const rebaselineReadme = fixture("rebaseline-project/README.md");
  const rebaselineSpec = fixture("rebaseline-project/docs/SPEC.md");
  const rebaselineArchitecture = fixture("rebaseline-project/docs/ARCHITECTURE.md");

  for (const { path, text } of scenarios.adopt.preserve) {
    const content = path === "README.md" ? adoptReadme : adoptAgents;
    assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(rebaselineReadme, /ledger-finch import/);
  assert.deepEqual(scenarios.rebaseline.preserveConcepts, ["ledger-finch import"]);
  assert.match(rebaselineSpec, /PostgreSQL/);
  assert.match(rebaselineArchitecture, /SQLite/);
  assert.match(skill, /preserve unrelated user-authored sections/);
  assert.match(skill, /do not erase an unknown section/);
  assert.match(skill, /If any inspected document changed during the interview, stop/);
});

test("kyw-init generated AGENTS contract stays thin and routes ordinary small changes", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const canonicalAgents = read("templates/project/AGENTS.md");

  assert.ok(Buffer.byteLength(canonicalAgents, "utf8") < 4096);
  assert.match(skill, /Keep a newly generated `AGENTS\.md` below 4 KiB/);
  assert.match(skill, /before an edit would make `AGENTS\.md` exceed 8 KiB/);
  assert.match(skill, /ordinary small changes/);
  for (const contract of [
    "source-of-truth routing",
    "substantial-versus-small Task rule",
    "documentation-impact routing",
    "repository verification commands",
    "completion gate",
  ]) {
    assert.match(skill, new RegExp(contract));
  }
});

test("kyw-init stops after verified documents and Task recommendations", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");

  assert.match(skill, /Task decomposition as recommendations only/);
  assert.match(skill, /Do not implement application functionality/);
  assert.match(skill, /do not continue into implementation/);
  assert.match(skill, /exact paths that changed, the incomplete paths, and the safest recovery action/);
});
