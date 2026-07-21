#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { runAuditSmoke } from "../../../scripts/audit-smoke.mjs";
import { runEvaluation } from "../../../scripts/grilling-eval/core.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const FAKE_CODEX = join(
  REPOSITORY_ROOT,
  "test",
  "fixtures",
  "evaluator-process",
  "fake-codex.mjs",
);
const [flow, stateDirectory, behavior = "hang"] = process.argv.slice(2);

if (!flow && !stateDirectory) process.exit(0);
if (!new Set(["audit", "grilling"]).has(flow) || !stateDirectory) {
  process.stderr.write("Usage: run-evaluator.mjs <audit|grilling> <state-directory> [behavior]\n");
  process.exit(2);
}

mkdirSync(stateDirectory, { recursive: true });
const authFile = join(stateDirectory, "auth-source.json");
if (!existsSync(authFile)) writeFileSync(authFile, '{"synthetic":"credential-free"}\n', "utf8");
const authBefore = readFileSync(authFile);
const lifecyclePath = join(stateDirectory, "lifecycle.json");
const terminalPath = join(stateDirectory, "terminal.json");
const readyPath = join(stateDirectory, "ready.json");
const lifecycle = { events: [], flow };

function writeJsonAtomic(path, value) {
  const staging = `${path}.${process.pid}.tmp`;
  writeFileSync(staging, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(staging, path);
}

function onState(event) {
  lifecycle.events.push(event);
  writeJsonAtomic(lifecyclePath, lifecycle);
}

const launcher = { command: process.execPath, prefixArgs: [FAKE_CODEX] };
const extraEnv = {
  FAKE_EVALUATOR_BEHAVIOR: behavior,
  FAKE_EVALUATOR_STATE_FILE: readyPath,
};

try {
  const result =
    flow === "audit"
      ? await runAuditSmoke(
          {
            authFile,
            mode: "readonly",
            model: "fake-model",
            reasoningEffort: "high",
            timeoutMs: 20_000,
          },
          {
            extraEnv,
            launcher,
            onState,
          },
        )
      : await runEvaluation({
          authFile,
          extraEnv,
          launcher,
          model: "fake-model",
          modelTurnTimeoutMs: 20_000,
          onState,
          outputRoot: join(stateDirectory, "results"),
          reasoningEffort: "high",
          scenario: "existing-code-facts",
          variant: "kyw",
        });
  writeJsonAtomic(terminalPath, {
    authSourceUnchanged: Buffer.compare(authBefore, readFileSync(authFile)) === 0,
    code: "SUCCESS",
    resultDirectory: result.resultDirectory ?? null,
  });
} catch (error) {
  writeJsonAtomic(terminalPath, {
    authSourceUnchanged: Buffer.compare(authBefore, readFileSync(authFile)) === 0,
    code: error?.code ?? "UNEXPECTED_ERROR",
    exitCode: Number.isInteger(error?.exitCode) ? error.exitCode : 1,
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
}
