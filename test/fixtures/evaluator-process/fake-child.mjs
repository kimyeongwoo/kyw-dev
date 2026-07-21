#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [mode, stateFile] = process.argv.slice(2);

if (!mode) process.exit(0);

function writeReady(descendantPid = null) {
  if (!stateFile) return;
  writeFileSync(
    stateFile,
    `${JSON.stringify({
      descendantPid,
      pid: process.pid,
      ready: true,
    })}\n`,
    "utf8",
  );
}

if (mode === "success") {
  const input = readFileSync(0, "utf8");
  process.stdout.write(`stdout:${input}:한글`);
  process.stderr.write("stderr:bounded");
} else if (mode === "nonzero") {
  process.stderr.write("synthetic child failure");
  process.exitCode = 7;
} else if (mode === "overflow") {
  process.stdout.write("x".repeat(64 * 1024));
} else if (mode === "exit-race") {
  writeReady();
  setTimeout(() => process.exit(0), 75);
} else if (mode === "hang" || mode === "hang-ignore-term") {
  const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore",
    windowsHide: true,
  });
  if (mode === "hang-ignore-term") {
    process.on("SIGTERM", () => {});
  } else if (process.platform !== "win32") {
    process.on("SIGTERM", () => {
      if (descendant.exitCode !== null || descendant.signalCode !== null) process.exit(0);
      descendant.once("exit", () => process.exit(0));
      descendant.kill("SIGTERM");
    });
  }
  writeReady(descendant.pid);
  process.stdout.write(`READY child=${process.pid} descendant=${descendant.pid}\n`);
  setInterval(() => {}, 1_000);
} else {
  process.stderr.write(`unknown fake child mode: ${mode}`);
  process.exitCode = 2;
}
