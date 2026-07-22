import assert from "node:assert/strict";
import test from "node:test";

import { greeting } from "../src/greeting.mjs";

test("returns named and default greetings", () => {
  assert.equal(greeting("Ada"), "Hello, Ada!");
  assert.equal(greeting(), "Hello, world!");
});
