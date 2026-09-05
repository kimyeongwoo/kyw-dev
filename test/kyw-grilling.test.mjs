import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PRESERVED_LEGAL_HASHES } from "../scripts/lib/validate-foundation.mjs";

test("grilling attribution preserves the upstream license bytes", async () => {
  for (const [path, digest] of Object.entries(PRESERVED_LEGAL_HASHES)) {
    const content = await readFile(new URL("../" + path, import.meta.url));
    assert.equal(createHash("sha256").update(content).digest("hex"), digest);
  }
});
