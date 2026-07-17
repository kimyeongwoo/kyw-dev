import test from "node:test";
import assert from "node:assert/strict";

import { validateFoundation } from "../scripts/lib/validate-foundation.mjs";

test("package, plugin, Skills, and legal metadata satisfy the foundation contract", () => {
  assert.deepEqual(validateFoundation(), []);
});
