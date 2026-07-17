#!/usr/bin/env node

import { runCli } from "../src/cli/run.mjs";

process.exitCode = runCli(process.argv.slice(2));
