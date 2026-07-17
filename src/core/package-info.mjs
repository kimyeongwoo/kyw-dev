import { readFileSync } from "node:fs";

const packageJsonUrl = new URL("../../package.json", import.meta.url);

export function readPackageInfo() {
  return JSON.parse(readFileSync(packageJsonUrl, "utf8"));
}
