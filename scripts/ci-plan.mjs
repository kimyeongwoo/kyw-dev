import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planVerification } from "./verification-plan.mjs";

export { CI_REQUIRED_JOB, CI_AGGREGATE_STEP } from "../src/core/ci-evidence.mjs";

export function parseGitChanges(output) {
  const fields = output.split("\0");
  if (fields.pop() !== "") throw new Error("Incomplete Git change listing");
  const changes = [];
  while (fields.length) {
    const header = fields.shift();
    const raw = /^:([0-7]{6}) ([0-7]{6}) (?:[0-9a-f]{40}|[0-9a-f]{64}) (?:[0-9a-f]{40}|[0-9a-f]{64}) ([A-Z]\d{0,3})$/.exec(header);
    if (header.startsWith(":") && !raw) throw new Error("Invalid Git raw change metadata");
    const status = raw ? raw[3] : header;
    const previousPath = /^[RC]/.test(status) ? fields.shift() : undefined;
    const path = fields.shift();
    if (!path) throw new Error("Incomplete Git change entry");
    changes.push({ path, status, ...(previousPath ? { previousPath } : {}),
      ...(raw ? { oldMode: raw[1], newMode: raw[2] } : {}) });
  }
  return changes;
}

export function planHostedCi(changedPaths, eventName) {
  if (!["push", "pull_request", "workflow_dispatch"].includes(eventName)) {
    throw new Error("Unsupported CI event");
  }
  const plan = planVerification({
    changedPaths: changedPaths.length ? changedPaths : ["unknown-empty-change"],
    releaseCandidate: eventName === "workflow_dispatch",
  });
  const profile = plan.hosted.profile;
  const full = ["runtime", "release"].includes(profile);
  return {
    profile,
    reason: full ? "Runtime, release, structural, or unknown changes require all supported platforms" :
      profile === "instruction" ? "Instruction changes require owner behavior tests" :
        "Guidance changes require document validation",
    focused: !full,
    behavioral: full,
    packed: full,
    merge: full && eventName === "pull_request",
    focusedTests: !full ? plan.commands[0].command.split(" ").slice(2) : [],
  };
}

export function assertSelectedCiResults(needs, eventName) {
  const expectedNames = ["plan", "focused", "behavioral", "quality", "packed-release", "merge-compatibility"];
  if (!needs || JSON.stringify(Object.keys(needs).sort()) !== JSON.stringify(expectedNames.sort())) {
    throw new Error("Required CI dependency set is incomplete or unexpected");
  }
  if (needs.plan.result !== "success") throw new Error("CI selection did not succeed");
  const { profile, reason } = needs.plan.outputs ?? {};
  if (!["documentation", "instruction", "runtime", "release"].includes(profile) || !reason) {
    throw new Error("CI selection profile/reason is missing");
  }
  const full = ["runtime", "release"].includes(profile);
  const selected = { focused: !full, behavioral: full, "packed-release": full,
    "merge-compatibility": full && eventName === "pull_request", quality: true };
  if (!["push", "pull_request", "workflow_dispatch"].includes(eventName)) throw new Error("Unknown CI event");
  if (eventName === "workflow_dispatch" && profile !== "release") throw new Error("Manual CI requires release coverage");
  for (const [name, required] of Object.entries(selected)) {
    const expected = required ? "success" : "skipped";
    if (needs[name]?.result !== expected) throw new Error(`${name}: expected ${expected}, got ${needs[name]?.result}`);
  }
  return { profile, reason, selected };
}

function currentPlan() {
  const { BASE_SHA, EXPECTED_SHA, GITHUB_EVENT_NAME } = process.env;
  if (!/^[0-9a-f]{40}$/.test(EXPECTED_SHA ?? "")) throw new Error("Invalid CI head SHA");
  const actual = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (actual !== EXPECTED_SHA) throw new Error("CI checkout differs from exact event head");
  // Missing/initial history falls back to full coverage rather than a guessed diff.
  if (!/^[0-9a-f]{40}$/.test(BASE_SHA ?? "") || /^0+$/.test(BASE_SHA)) {
    return planHostedCi(["unknown-base"], GITHUB_EVENT_NAME);
  }
  let diff;
  try {
    diff = execFileSync("git", ["diff", "--raw", "-z", "--no-abbrev", "--find-renames",
      "--find-copies", "--find-copies-harder", BASE_SHA, EXPECTED_SHA, "--"],
      { encoding: "utf8", maxBuffer: 1024 * 1024 });
  } catch {
    return planHostedCi(["unknown-base"], GITHUB_EVENT_NAME);
  }
  return planHostedCi(parseGitChanges(diff), GITHUB_EVENT_NAME);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const action = process.argv[2];
    if (action === "aggregate") {
      console.log(JSON.stringify(assertSelectedCiResults(JSON.parse(process.env.NEEDS_JSON), process.env.GITHUB_EVENT_NAME)));
    } else {
      const plan = currentPlan();
      if (action === "focused") {
        if (!plan.focused) throw new Error("Focused job was selected for a full CI plan");
        execFileSync(process.execPath, ["--test", ...plan.focusedTests], { stdio: "inherit" });
      } else if (action === "select") {
        appendFileSync(process.env.GITHUB_OUTPUT, `profile=${plan.profile}\nreason=${plan.reason}\n`);
        console.log(JSON.stringify(plan));
      } else throw new Error("Expected select, focused, or aggregate");
    }
  } catch (error) {
    console.error(`CI policy failed: ${error.message}`);
    process.exitCode = 1;
  }
}
