import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { assertFoundation, REPOSITORY_ROOT } from "./lib/validate-foundation.mjs";

const generatedEvalResults = join(REPOSITORY_ROOT, "eval", "grilling", "results");

function collectModules(directory) {
  const modules = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (path === generatedEvalResults) {
        continue;
      }
      modules.push(...collectModules(path));
    } else if (entry.isFile() && entry.name.endsWith(".mjs")) {
      modules.push(path);
    }
  }
  return modules;
}

const modules = collectModules(REPOSITORY_ROOT).sort();
const failures = [];

for (const modulePath of modules) {
  const result = spawnSync(process.execPath, ["--check", modulePath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    failures.push(`${modulePath}\n${result.stderr.trim()}`);
  }
}

if (failures.length > 0) {
  throw new Error(`JavaScript syntax validation failed:\n${failures.join("\n")}`);
}

assertFoundation();
console.log(`lint passed (${modules.length} JavaScript modules and foundation metadata)`);
