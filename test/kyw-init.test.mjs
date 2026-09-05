import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { renderTemplate, validateDocumentSections } from "../src/core/template-contracts.mjs";

test("project guidance supports an existing useful README without generating a fixed document set", async () => {
  const root = fileURLToPath(new URL("./fixtures/kyw-init/adopt-project/", import.meta.url));
  const existing = await readFile(root + "/README.md", "utf8");
  assert.deepEqual(validateDocumentSections("README", existing), []);
  const scaffold = await readFile(new URL("../templates/project/README.md", import.meta.url), "utf8");
  const rendered = renderTemplate(scaffold, { PROJECT_NAME: "Existing project" });
  assert.ok(rendered.startsWith("# Existing project"));
  assert.ok(!rendered.includes("{{PROJECT_NAME}}"));
});
