import assert from "node:assert/strict";
import test from "node:test";

import { greet } from "../src/greeting.mjs";

test("greet returns a personalized greeting", () => {
  assert.equal(greet("Ada"), "Hello, Ada!");
});

test("greet rejects a missing name", () => {
  assert.throws(() => greet(""), /non-empty string/);
  assert.throws(() => greet(), /non-empty string/);
});
