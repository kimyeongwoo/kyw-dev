import assert from "node:assert/strict";
import test from "node:test";

import { greeting } from "../src/greeting.mjs";

test("returns the existing greeting", () => {
  assert.equal(greeting("Ada"), "Hello, Ada!");
});
