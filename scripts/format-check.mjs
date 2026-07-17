import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { TextDecoder } from "node:util";

import { REPOSITORY_ROOT } from "./lib/validate-foundation.mjs";

const textExtensions = new Set([".json", ".md", ".mjs", ".txt", ".yaml", ".yml"]);
const textNames = new Set(["LICENSE"]);
const decoder = new TextDecoder("utf-8", { fatal: true });

function collectTextFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTextFiles(path));
    } else if (entry.isFile() && (textExtensions.has(extname(entry.name)) || textNames.has(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

const files = collectTextFiles(REPOSITORY_ROOT).sort();
const errors = [];

for (const path of files) {
  const relativePath = relative(REPOSITORY_ROOT, path).replaceAll("\\", "/");
  const bytes = readFileSync(path);
  let text;

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    errors.push(`${relativePath}: UTF-8 BOM is not allowed`);
  }

  try {
    text = decoder.decode(bytes);
  } catch {
    errors.push(`${relativePath}: file is not valid UTF-8`);
    continue;
  }

  if (text.includes("\r")) {
    errors.push(`${relativePath}: use LF line endings`);
  }
  if (!text.endsWith("\n")) {
    errors.push(`${relativePath}: final newline is required`);
  }

  const lines = text.split("\n");
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (/[ \t]+$/.test(lines[index])) {
      errors.push(`${relativePath}:${index + 1}: trailing whitespace`);
    }
  }

  if (extname(path) === ".json") {
    try {
      const canonical = `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
      if (text !== canonical) {
        errors.push(`${relativePath}: JSON must use canonical two-space formatting`);
      }
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON (${error.message})`);
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Format validation failed:\n- ${errors.join("\n- ")}`);
}

console.log(`format check passed (${files.length} UTF-8/LF text files)`);
