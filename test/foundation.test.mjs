import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPOSITORY_ROOT, RELEASE_METADATA, TRUSTED_PUBLISHER_EXPECTATION, validateFoundation } from "../scripts/lib/validate-foundation.mjs";
import { assertSupportedRuntime } from "../src/core/skill-installation.mjs";

test("package, plugin, Skills, and legal metadata satisfy the foundation contract", () => {
  assert.equal(RELEASE_METADATA.version, "0.2.1");
  assert.deepEqual(validateFoundation(), []);
  assert.deepEqual(TRUSTED_PUBLISHER_EXPECTATION, {
    provider: "GitHub Actions",
    organizationOrUser: "kimyeongwoo",
    repository: "kyw-dev",
    repositoryFullName: "kimyeongwoo/kyw-dev",
    workflowFilename: "publish.yml",
    workflowPath: ".github/workflows/publish.yml",
    environment: "npm-production",
    allowedActions: ["npm publish"],
    packageAccess: "public",
  });
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

test("foundation keeps distribution safety without project-document or historical-Task prerequisites", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "kyw-foundation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of [
    "package.json", ".codex-plugin", "bin", "skills", "templates", ".github/workflows",
    "LICENSE", "THIRD_PARTY_NOTICES.md", "licenses",
  ]) {
    await cp(join(REPOSITORY_ROOT, path), join(root, path), { recursive: true });
  }
  assert.deepEqual(validateFoundation(root), []);

  const packagePath = join(root, "package.json");
  const original = await readFile(packagePath, "utf8");
  const manifest = JSON.parse(original);
  manifest.scripts.postinstall = "node installer.mjs";
  manifest.dependencies = { unexpected: "*" };
  manifest.files.push("docs/dev/");
  await writeFile(packagePath, JSON.stringify(manifest));
  const errors = validateFoundation(root);
  assert.ok(errors.some((error) => error.includes("lifecycle script postinstall")));
  assert.ok(errors.some((error) => error.includes("dependency free")));
  assert.ok(errors.some((error) => error.includes("files allowlist")));
  await writeFile(packagePath, original);

  const metadataPath = join(root, "skills", "kyw-init", "agents", "openai.yaml");
  await writeFile(metadataPath, (await readFile(metadataPath, "utf8")).replace("allow_implicit_invocation: false", "allow_implicit_invocation: true"));
  await writeFile(join(root, "licenses", "mattpocock-skills-MIT.txt"), "changed notice\n");
  const unsafe = validateFoundation(root);
  assert.ok(unsafe.some((error) => error.includes("explicit invocation policy")));
  assert.ok(unsafe.some((error) => error.includes("preserved upstream notice")));
});
