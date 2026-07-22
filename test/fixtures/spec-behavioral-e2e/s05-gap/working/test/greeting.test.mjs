import assert from "node:assert/strict";
import test from "node:test";

import { greeting } from "../src/greeting.mjs";

test("returns the formal greeting", () => {
  assert.equal(greeting("Ada", "formal"), "Good day, Ada.");
});
