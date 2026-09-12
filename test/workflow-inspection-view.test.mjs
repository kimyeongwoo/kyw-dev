import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { workflowInspectionView } from "../src/core/workflow-inspection-view.mjs";

test("inspection removes only supported external YAML comments without adding empty rows", () => {
  const source = [
    "# npm publish is performed only below",
    "permissions: {} # no global authority",
    "jobs:",
    "  publish: # job",
    "    steps:",
    "      # run: node ./scripts/publish-gate.mjs",
    "      - name: Publish # NPM_TOKEN is not used",
    "        # explanatory step comment",
    "        run: npm publish . # exact checkout",
    "# trailing comment",
    "",
  ].join("\n");
  assert.equal(workflowInspectionView(source), [
    "permissions: {}",
    "jobs:",
    "  publish:",
    "    steps:",
    "      - name: Publish",
    "        run: npm publish .",
    "",
  ].join("\n"));
});

test("inspection preserves quoted hashes, quote escapes, URL fragments and shell expansion", () => {
  const source = [
    'double: "a # b \\"quoted\\"" # outside',
    "single: 'it''s # literal' # outside",
    "url: https://example.invalid/path#fragment # outside",
    "length: ${#EXPECTED_SHA} # outside",
    'run: echo "a#b"',
    "",
  ].join("\n");
  assert.equal(workflowInspectionView(source), [
    'double: "a # b \\"quoted\\""',
    "single: 'it''s # literal'",
    "url: https://example.invalid/path#fragment",
    "length: ${#EXPECTED_SHA}",
    'run: echo "a#b"',
    "",
  ].join("\n"));
});

test("block scalar headers allow comments while their bodies remain byte-for-byte exact", () => {
  const body = [
    "  # NPM_TOKEN and npm publish are execution-language text",
    '  echo "a # b" "${#EXPECTED_SHA}" https://example.invalid/#anchor',
    "  node <<'NODE'",
    '  const text = "# \\"literal\\""; // preserve this comment',
    "  NODE",
    "  ",
    "",
  ].join("\r\n");
  for (const header of ["|", ">", "|-", "|+", ">-", ">+", "|2", "|2-", "|+2", ">2+", ">-2"]) {
    const source = `run: ${header} # header comment\r\n${body}next: true # outside\r\n`;
    assert.equal(workflowInspectionView(source), `run: ${header}\r\n${body}next: true\r\n`, header);
  }
  assert.equal(
    workflowInspectionView("steps:\n  - run: |2 # header\n      # body\n    name: next # outside\n"),
    "steps:\n  - run: |2\n      # body\n    name: next\n",
  );
  assert.equal(
    workflowInspectionView("run: |\n  echo one\n# dedented comment\nnext: value # sibling\n"),
    "run: |\n  echo one\nnext: value\n",
  );
});

test("unsupported or ambiguous boundaries atomically retain the whole original workflow", () => {
  for (const unsupported of [
    "flow: [one, # unclear\n  two]\n",
    "flow: { key: value } # flow mapping\n",
    "quoted: 'several\n  lines' # outside\n",
    'quoted: "several\\\n  lines" # outside\n',
    'quoted: "closed"unseparated # unclear\n',
    'quoted: "closed"#unseparated\n',
    'run: echo "a # b"\n',
    "run: echo 'a # b'\n",
    "plain: first line\n  continues # unclear\n",
    "plain: first line\n  next: resembles a mapping # unclear\n",
    "value: &anchor plain # anchor\n",
    "value: *anchor # alias\n",
    "run: |0 # invalid indent\n  content\n",
    "run: | # inferred indent\n    content\n  # unclear indentation\n",
    "run: |4 # explicit indent\n  # too little indentation\n",
    "run: |\n  echo one\n# dedented comment\n  next: value # resumed scalar?\n",
    "run: |\n# empty block ended\n  next: value # ambiguous re-entry\n",
  ]) {
    const source = `# npm publish must survive atomic fallback\nname: guarded # NPM_TOKEN must survive\n${unsupported}`;
    assert.equal(workflowInspectionView(source), source, unsupported);
  }
});

test("standalone CR boundaries retain the whole source before removing any comments", () => {
  for (const boundary of [
    "env:\n  # explanatory comment\r  NPM_TOKEN: synthetic-marker\n",
    "steps:\r\n  # explanatory comment\r  - run: npm publish .\n",
    "env:\n  value: safe # explanatory comment\r  NPM_TOKEN: synthetic-marker\r\n",
    "run: | # header\r\n  # body\r  npm publish .\n",
    "\rname: guarded\n",
    "name: guarded\r",
    "# explanatory comment\r\r\nname: guarded\n",
  ]) {
    const source = `# removable first\r\nname: guarded # removable inline\n${boundary}`;
    const originalBytes = Buffer.from(source);
    const originalHash = createHash("sha256").update(originalBytes).digest("hex");
    const view = workflowInspectionView(source);
    assert.equal(view, source, JSON.stringify(boundary));
    assert.deepEqual(Buffer.from(view), originalBytes);
    assert.equal(createHash("sha256").update(view).digest("hex"), originalHash);
  }
});

test("LF and CRLF comments still strip around literal backslash-r and exact scalar bodies", () => {
  for (const ending of ["\n", "\r\n"]) {
    const body = ["  # scalar body", '  printf "\\r"', ""].join(ending);
    const source = [
      "# literal \\r is comment text",
      'value: "\\r" # outside',
      "run: | # header",
      body,
    ].join(ending);
    assert.equal(workflowInspectionView(source), `value: "\\r"${ending}run: |${ending}${body}`);
  }
});

test("comment-free source and raw source digests retain their original identities", () => {
  const workflow = readFileSync(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  const commentFree = workflow.replace(/ # v[^\n]+/gu, "");
  assert.equal(workflowInspectionView(commentFree), commentFree);
  const variant = `# npm publish source explanation\n${workflow}`;
  const beforeBytes = Buffer.from(variant);
  assert.equal(workflowInspectionView(variant), workflowInspectionView(workflow));
  assert.deepEqual(Buffer.from(variant), beforeBytes);
  const digest = (text) => createHash("sha256").update(text).digest("hex");
  assert.notEqual(digest(variant), digest(workflow));
});
