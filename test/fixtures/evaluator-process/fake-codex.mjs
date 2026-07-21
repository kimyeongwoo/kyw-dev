#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const THREAD_ID = "22222222-3333-4444-8555-666666666666";
let args = process.argv.slice(2);

if (args.length === 0) process.exit(0);
if (args.length === 1 && args[0] === "--version") {
  console.log("codex-cli 9.9.9-interrupt-test");
  process.exit(0);
}
if (args[0] === "exec" && args[1] === "--help") {
  console.log(
    "--json --output-last-message --sandbox read-only --ignore-user-config --ignore-rules --config --ephemeral --dangerously-bypass-approvals-and-sandbox",
  );
  process.exit(0);
}
if (args[0] === "exec" && args[1] === "resume" && args[2] === "--help") {
  console.log(
    "Usage: codex exec resume [SESSION_ID] --json --output-last-message --ignore-user-config --ignore-rules",
  );
  process.exit(0);
}
if (args[0] === "sandbox" && args[1] === "--help") {
  console.log("codex sandbox --permission-profile");
  process.exit(0);
}

if (args[0] === "sandbox") {
  const separator = args.indexOf("--");
  const nested = separator === -1 ? [] : args.slice(separator + 1);
  const execIndex = nested.indexOf("exec");
  args = execIndex === -1 ? [] : nested.slice(execIndex);
}

if (args[0] !== "exec") {
  process.stderr.write(`unexpected fake Codex invocation: ${args.join(" ")}`);
  process.exit(2);
}

readFileSync(0, "utf8");
const behavior = process.env.FAKE_EVALUATOR_BEHAVIOR ?? "normal";
if (behavior === "nonzero") {
  process.stderr.write("synthetic model child failure");
  process.exit(9);
}

const repositoryOption = args.indexOf("--cd");
const repository = repositoryOption === -1 ? process.cwd() : args[repositoryOption + 1];
const stateFile = process.env.FAKE_EVALUATOR_STATE_FILE;

if (behavior === "hang" || behavior === "hang-ignore-term") {
  const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore",
    windowsHide: true,
  });
  if (behavior === "hang-ignore-term") {
    process.on("SIGTERM", () => {});
  } else if (process.platform !== "win32") {
    process.on("SIGTERM", () => {
      if (descendant.exitCode !== null || descendant.signalCode !== null) process.exit(0);
      descendant.once("exit", () => process.exit(0));
      descendant.kill("SIGTERM");
    });
  }
  if (stateFile) {
    writeFileSync(
      stateFile,
      `${JSON.stringify({
        authCopy: join(process.env.CODEX_HOME, "auth.json"),
        codexHome: process.env.CODEX_HOME,
        descendantPid: descendant.pid,
        pid: process.pid,
        ready: true,
        repository,
        temporaryHome: process.env.HOME,
        temporaryRoot: process.env.TEMP,
      })}\n`,
      "utf8",
    );
  }
  process.stdout.write(`READY child=${process.pid} descendant=${descendant.pid}\n`);
  setInterval(() => {}, 1_000);
  await new Promise(() => {});
}

const outputOption = args.indexOf("--output-last-message");
if (outputOption === -1 || !args[outputOption + 1]) {
  process.stderr.write("missing --output-last-message");
  process.exit(2);
}

const skillsRoot = join(repository, ".agents", "skills");
const skillNames = existsSync(skillsRoot)
  ? readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];
const skillPath =
  skillNames.length === 1 ? join(skillsRoot, skillNames[0], "SKILL.md") : null;
const skillSource = skillPath && existsSync(skillPath) ? readFileSync(skillPath, "utf8") : "";
const isAudit = existsSync(join(repository, "docs", "tasks", "0001-greeting-contract"));
const message = isAudit
  ? "F-01: synthetic fixture contract mismatch.\n\n## Verdict\n\nBLOCKED"
  : "Question: What identity should define a duplicate request?\nRecommendation: Scope it to tenant and endpoint.";
const statePath = join(process.env.CODEX_HOME, "fake-interrupt-session.json");
const isResume = args[1] === "resume";
let turn = 1;
if (isResume && existsSync(statePath)) {
  turn = JSON.parse(readFileSync(statePath, "utf8")).turn + 1;
}
writeFileSync(statePath, `${JSON.stringify({ turn })}\n`, "utf8");
writeFileSync(args[outputOption + 1], `${message}\n`, "utf8");

for (const event of [
  { type: "thread.started", thread_id: THREAD_ID },
  {
    type: "item.completed",
    item: {
      type: "command_execution",
      command: skillPath ? `read ${skillPath}` : "read installed Skill",
      aggregated_output: skillSource,
      status: "completed",
    },
  },
  { type: "item.completed", item: { type: "agent_message", text: message } },
  {
    type: "turn.completed",
    usage: {
      input_tokens: 10 + turn,
      cached_input_tokens: 2,
      output_tokens: 5,
      reasoning_output_tokens: 1,
    },
  },
]) {
  console.log(JSON.stringify(event));
}
