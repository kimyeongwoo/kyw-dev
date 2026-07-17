import { spawnSync } from "node:child_process";

import {
  EXPECTED_TARBALL_FILES,
  REPOSITORY_ROOT,
  assertFoundation,
} from "./lib/validate-foundation.mjs";

assertFoundation();

const npmExecutable = process.env.npm_execpath;
const command = npmExecutable ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const args = npmExecutable
  ? [npmExecutable, "pack", "--dry-run", "--json"]
  : ["pack", "--dry-run", "--json"];
const result = spawnSync(command, args, {
  cwd: REPOSITORY_ROOT,
  encoding: "utf8",
  shell: !npmExecutable && process.platform === "win32",
});

if (result.status !== 0) {
  const detail = result.error?.message ?? result.stderr?.trim() ?? "unknown npm execution error";
  throw new Error(`npm pack --dry-run failed:\n${detail}`);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  throw new Error(`npm pack did not return JSON: ${error.message}\n${result.stdout}`);
}

const packageReport = report[0];
const actual = packageReport.files.map(({ path }) => path).sort();
const expected = [...EXPECTED_TARBALL_FILES].sort();
const missing = expected.filter((path) => !actual.includes(path));
const unexpected = actual.filter((path) => !expected.includes(path));

if (missing.length > 0 || unexpected.length > 0) {
  throw new Error(
    `Tarball allowlist mismatch:\nMissing: ${missing.join(", ") || "none"}\nUnexpected: ${unexpected.join(", ") || "none"}`,
  );
}

console.log(`pack check passed (${actual.length} files, ${packageReport.size} bytes)`);
