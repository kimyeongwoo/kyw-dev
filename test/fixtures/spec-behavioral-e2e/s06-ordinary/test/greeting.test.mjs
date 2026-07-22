import assert from "node:assert/strict";
import test from "node:test";

import { greeting } from "../src/greeting.mjs";

test("exports the documented greeting", () => {
  assert.equal(greeting, "Hello");
});
