import test from "node:test";
import assert from "node:assert/strict";

import { validateFoundation } from "../scripts/lib/validate-foundation.mjs";
import { assertSupportedRuntime } from "../src/core/skill-installation.mjs";

test("package, plugin, Skills, and legal metadata satisfy the foundation contract", () => {
  assert.deepEqual(validateFoundation(), []);
});

test("runtime support enforces the documented Node.js 22 floor", () => {
  for (const version of ["22.0.0", "24.11.0", "26.0.0"]) {
    assert.doesNotThrow(() => assertSupportedRuntime(version));
  }
  for (const version of ["21.99.0", "not-a-version"]) {
    assert.throws(
      () => assertSupportedRuntime(version),
      (error) => error.code === "UNSUPPORTED_RUNTIME" && error.exitCode === 2,
    );
  }
});
