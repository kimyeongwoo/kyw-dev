import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SKILL_NAMES } from "../scripts/lib/validate-foundation.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("six explicit Skills retain discoverable metadata and resolvable local references", async () => {
  for (const name of SKILL_NAMES) {
    const directory = join(root, "skills", name);
    const skill = await readFile(join(directory, "SKILL.md"), "utf8");
    const metadata = await readFile(join(directory, "agents", "openai.yaml"), "utf8");
    assert.equal(/^name: (.+)$/mu.exec(skill)?.[1], name);
    assert.match(metadata, /allow_implicit_invocation: false/u);
    assert.ok(metadata.includes("$" + name));
    const files = [join(directory, "SKILL.md")];
    if ((await readdir(directory)).includes("references")) {
      files.push(...(await readdir(join(directory, "references")))
        .filter((file) => file.endsWith(".md"))
        .map((file) => join(directory, "references", file)));
    }
    for (const path of files) {
      const markdown = await readFile(path, "utf8");
      for (const [, target] of markdown.matchAll(/\]\(([^)]+)\)/gu)) {
        if (/^(?:https?:|#)/u.test(target)) continue;
        await access(join(dirname(path), target.split("#")[0]));
      }
    }
  }
});
