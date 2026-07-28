#!/usr/bin/env node

import { waitForReadiness } from "./readiness.mjs";

const [path, expectedRunId, pathLabel = "native-evaluator"] = process.argv.slice(2);

if (!path && !expectedRunId) process.exit(0);
if (!path || !expectedRunId) {
  process.stderr.write(
    "Usage: wait-for-readiness.mjs <path> <expected-run-id> [path-label]\n",
  );
  process.exit(2);
}

try {
  const record = await waitForReadiness({ path, expectedRunId, pathLabel });
  process.stdout.write(`${JSON.stringify(record)}\n`);
} catch (error) {
  process.stderr.write(`${error?.code ?? "READINESS_ERROR"}: ${error.message}\n`);
  process.exitCode = 1;
}
