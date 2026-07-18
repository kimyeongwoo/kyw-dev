#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const THREAD_ID = "11111111-2222-4333-8444-555555555555";
const args = process.argv.slice(2);

if (args.length === 0) {
  process.exit(0);
}

if (args.length === 1 && args[0] === "--version") {
  console.log("codex-cli 9.9.9-test");
  process.exit(0);
}

if (args[0] === "exec" && args[1] === "--help") {
  console.log("--json --output-last-message --sandbox read-only --ignore-user-config --ignore-rules");
  process.exit(0);
}

if (args[0] === "exec" && args[1] === "resume" && args[2] === "--help") {
  console.log("Usage: codex exec resume [SESSION_ID] [PROMPT] --json --output-last-message --ignore-user-config --ignore-rules");
  process.exit(0);
}

if (args[0] !== "exec") {
  console.error("unexpected fake Codex invocation");
  process.exit(2);
}

if (process.env.FAKE_CODEX_AUTH === "missing") {
  console.error("Not logged in. Run codex login before codex exec.");
  process.exit(1);
}

const reasoningConfigs = args.filter((argument) => argument.startsWith("model_reasoning_effort="));
if (
  reasoningConfigs.length !== 1 ||
  !/^model_reasoning_effort="(?:minimal|low|medium|high|xhigh)"$/.test(reasoningConfigs[0])
) {
  console.error("missing or invalid explicit model_reasoning_effort config");
  process.exit(2);
}
if (
  process.env.FAKE_CODEX_EXPECT_REASONING_EFFORT &&
  reasoningConfigs[0] !== `model_reasoning_effort="${process.env.FAKE_CODEX_EXPECT_REASONING_EFFORT}"`
) {
  console.error("unexpected model_reasoning_effort config");
  process.exit(2);
}

const outputOption = args.indexOf("--output-last-message");
if (outputOption === -1 || !args[outputOption + 1]) {
  console.error("missing --output-last-message");
  process.exit(2);
}

const statePath = join(process.env.CODEX_HOME, "fake-session.json");
const isResume = args[1] === "resume";
let turn = 1;
if (isResume) {
  if (!existsSync(statePath)) {
    console.error("session state missing");
    process.exit(2);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  turn = state.turn + 1;
  if (!args.includes(THREAD_ID)) {
    console.error("resume did not use the original session ID");
    process.exit(2);
  }
}
writeFileSync(statePath, `${JSON.stringify({ turn })}\n`, "utf8");

const messages = [
  "Question: What identity and scope should define a duplicate idempotency key?\nRecommendation: Scope the client key to the tenant and POST /jobs so unrelated requests cannot collide.",
  "Question: What response should a duplicate submission receive?\nRecommendation: Return the original job identifier with the original 202 response.",
  "Question: How long should the idempotency record remain authoritative?\nRecommendation: Start with a bounded 24-hour retention window.",
  "Question: May a failed job be resubmitted with the same key?\nRecommendation: Permit a deliberate retry only after the prior terminal failure is visible.",
];
const message = messages[Math.min(turn - 1, messages.length - 1)];

const repositoryOption = args.indexOf("--cd");
const repository = repositoryOption === -1 ? process.cwd() : args[repositoryOption + 1];
const skillsRoot = join(repository, ".agents", "skills");
const skillNames = existsSync(skillsRoot) ? readdirSync(skillsRoot) : [];
const installedSkillPath =
  skillNames.length === 1 ? join(skillsRoot, skillNames[0], "SKILL.md") : null;
const shouldReadSkill =
  turn === 1 &&
  process.env.FAKE_CODEX_SKIP_SKILL_READ !== "1" &&
  installedSkillPath &&
  existsSync(installedSkillPath);
if (process.env.FAKE_CODEX_MUTATE === "1") {
  writeFileSync(join(repository, "unexpected-change.txt"), "mutation\n", "utf8");
}

const eventThreadId = process.env.FAKE_CODEX_WRONG_THREAD === "1" && isResume ? "99999999-2222-4333-8444-555555555555" : THREAD_ID;
const events = [
  { type: "thread.started", thread_id: eventThreadId },
  { type: "turn.started" },
  {
    type: "item.completed",
    item: {
      id: `command-${turn}`,
      type: "command_execution",
      command:
        process.env.FAKE_CODEX_MUTATE === "1"
          ? `Set-Content ${join(repository, "unexpected-change.txt")}`
          : shouldReadSkill
            ? `Get-Content ${installedSkillPath}`
            : `inspect ${repository} ${process.env.HOME} ${process.env.CODEX_HOME}`,
      aggregated_output: shouldReadSkill ? readFileSync(installedSkillPath, "utf8") : "",
      status: "completed",
    },
  },
  ...(process.env.FAKE_CODEX_MUTATE === "1"
    ? [
        {
          type: "item.completed",
          item: {
            id: `file-${turn}`,
            type: "file_change",
            status: "completed",
          },
        },
      ]
    : []),
  { type: "item.completed", item: { id: `message-${turn}`, type: "agent_message", text: message } },
  {
    type: "turn.completed",
    usage: {
      input_tokens: 100 + turn,
      cached_input_tokens: 50,
      output_tokens: 25,
      reasoning_output_tokens: 5,
    },
  },
];

writeFileSync(args[outputOption + 1], `${message}\n`, "utf8");
for (const event of events) console.log(JSON.stringify(event));
