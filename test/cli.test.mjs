import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { HELP_TEXT, VERSION, runCli } from "../src/cli/run.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const executable = join(repositoryRoot, "bin", "kyw-dev.mjs");

function runInCleanDirectory(args) {
  const directory = mkdtempSync(join(tmpdir(), "kyw-dev-cli-"));
  const before = readdirSync(directory, { recursive: true }).sort();
  try {
    const result = spawnSync(process.execPath, [executable, ...args], {
      cwd: directory,
      encoding: "utf8",
    });
    const after = readdirSync(directory, { recursive: true }).sort();
    assert.deepEqual(after, before, `CLI wrote files for arguments: ${args.join(" ")}`);
    return result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const args of [[], ["-h"], ["--help"]]) {
  test(`help mode ${args.join(" ") || "<no arguments>"} is deterministic and non-mutating`, () => {
    const result = runInCleanDirectory(args);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, HELP_TEXT);
    assert.equal(result.stderr, "");
  });
}

for (const args of [["-V"], ["--version"]]) {
  test(`version mode ${args[0]} returns the exact package version`, () => {
    const result = runInCleanDirectory(args);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, `${VERSION}\n`);
    assert.equal(result.stderr, "");
  });
}

for (const args of [["--unknown"], ["unexpected", "arguments"]]) {
  test(`unknown arguments ${args.join(" ")} report usage, exit 1, and do not write files`, () => {
    const result = runInCleanDirectory(args);
    const label = args.length === 1 ? "argument" : "arguments";
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(`^kyw-dev: unknown ${label}: ${args.join(" ")}\\n\\nkyw-dev 0\\.1\\.0`));
    assert.match(result.stderr, /Usage:\n  kyw-dev install --scope <user\|project>/);
  });
}

test("in-process dispatch never changes the working directory", () => {
  const cwd = process.cwd();
  for (const args of [[], ["-h"], ["--help"], ["-V"], ["--version"], ["--unknown"]]) {
    const stream = { write() {} };
    runCli(args, { stdout: stream, stderr: stream });
    assert.equal(process.cwd(), cwd, `cwd changed for arguments: ${args.join(" ")}`);
  }
});
