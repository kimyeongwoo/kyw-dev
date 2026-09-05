import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseTaskInvocation } from "../src/core/task-artifacts.mjs";

test("the plugin's delivery prompt resolves to the PR action", async () => {
  const plugin = JSON.parse(await readFile(new URL("../.codex-plugin/plugin.json", import.meta.url), "utf8"));
  const prompt = plugin.interface.defaultPrompt.find((entry) => entry.includes("$kyw-deliver"));
  const invocation = /\$kyw-deliver \d{4}/u.exec(prompt)?.[0];
  assert.ok(invocation);
  const parsed = parseTaskInvocation(invocation);
  assert.equal(parsed.route, "DELIVERY");
  assert.equal(parsed.action, "PR");
});
