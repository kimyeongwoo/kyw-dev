import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  MAX_TASK_SLUG_LENGTH,
  deriveTaskKey,
  slugPattern,
  slugifyTaskTitle,
} from "../src/core/task-artifact-contract.mjs";

const contractModuleUrl = new URL("../src/core/task-artifact-contract.mjs", import.meta.url).href;

function deriveInFreshProcess(title) {
  const script = `
    import { deriveTaskKey } from ${JSON.stringify(contractModuleUrl)};
    process.stdout.write(deriveTaskKey(JSON.parse(process.env.KYW_TASK_KEY_TEST_TITLE)));
  `;
  return execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
    env: {
      ...process.env,
      KYW_TASK_KEY_TEST_TITLE: JSON.stringify(title),
    },
  });
}

test("task key derivation covers the normalized 0/1/47/48/49 boundaries", () => {
  assert.match(deriveTaskKey("!!!"), /^task-[a-f0-9]{8}$/);
  assert.equal(deriveTaskKey("a"), "a");
  assert.equal(deriveTaskKey("a".repeat(47)), "a".repeat(47));
  assert.equal(deriveTaskKey("a".repeat(48)), "a".repeat(48));

  const overBoundary = deriveTaskKey("a".repeat(49));
  assert.equal(overBoundary.length, MAX_TASK_SLUG_LENGTH);
  assert.match(overBoundary, /^a{39}-[a-f0-9]{8}$/);
  assert.throws(
    () => deriveTaskKey(" \n\t "),
    (error) => error.code === "EMPTY_TASK_TITLE",
  );
  assert.throws(() => deriveTaskKey(""), (error) => error.code === "EMPTY_TASK_TITLE");
});

test("ordinary ASCII normalization stays short, stable, and separator-safe", () => {
  assert.equal(deriveTaskKey("  Release API CLI  "), "release-api-cli");
  assert.equal(deriveTaskKey("release---api___cli / docs"), "release-api-cli-docs");
  assert.equal(deriveTaskKey("Release: API / CLI + docs!!!"), "release-api-cli-docs");
  assert.equal(deriveTaskKey("already-normalized-key"), "already-normalized-key");
  assert.equal(deriveTaskKey("2026 roadmap"), "task-2026-roadmap");
  assert.equal(slugifyTaskTitle("already-normalized-key"), "already-normalized-key");
});

test("lossy Unicode normalization uses one deterministic stable suffix", () => {
  const composed = deriveTaskKey("Crème brûlée API");
  const decomposed = deriveTaskKey("Cre\u0300me bru\u0302le\u0301e API");
  assert.equal(composed, decomposed);
  assert.match(composed, /^creme-brulee-api-[a-f0-9]{8}$/);
  assert.equal(deriveTaskKey("Crème brûlée API"), composed);

  const korean = deriveTaskKey("템플릿 계약");
  assert.match(korean, /^task-[a-f0-9]{8}$/);
  assert.equal(deriveTaskKey("템플릿 계약"), korean);

  const fullWidthCompatibilityText = deriveTaskKey("ＡＰＩ");
  assert.equal(fullWidthCompatibilityText, "api");
});

test("long inputs are bounded and distinct when their portable prefixes match", () => {
  const commonPrefix = "shared-prefix-".repeat(8);
  const first = deriveTaskKey(`${commonPrefix}alpha`);
  const second = deriveTaskKey(`${commonPrefix}bravo`);
  assert.notEqual(first, second);
  assert.equal(first.length, MAX_TASK_SLUG_LENGTH);
  assert.equal(second.length, MAX_TASK_SLUG_LENGTH);

  const veryLongAscii = deriveTaskKey("portable ".repeat(1_000));
  const veryLongUnicode = deriveTaskKey("매우 긴 유니코드 제목 ".repeat(1_000));
  assert.ok(veryLongAscii.length <= MAX_TASK_SLUG_LENGTH);
  assert.ok(veryLongUnicode.length <= MAX_TASK_SLUG_LENGTH);

  const processInput = `${commonPrefix}${"유니코드 ".repeat(40)}`;
  assert.equal(deriveInFreshProcess(processInput), deriveTaskKey(processInput));
  assert.equal(deriveInFreshProcess(processInput), deriveTaskKey(processInput));
});

test("empty and lossy portable bases remain collision-resistant and portable", () => {
  const punctuation = deriveTaskKey("!!!");
  const differentPunctuation = deriveTaskKey("???");
  assert.notEqual(punctuation, differentPunctuation);

  const keys = [
    punctuation,
    differentPunctuation,
    deriveTaskKey("C:\\temp\\CON"),
    deriveTaskKey("../../escape"),
    deriveTaskKey("템플릿 계약"),
    deriveTaskKey("word ".repeat(100)),
  ];
  for (const key of keys) {
    assert.match(key, slugPattern);
    assert.ok(key.length <= MAX_TASK_SLUG_LENGTH);
    assert.match(key, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});
