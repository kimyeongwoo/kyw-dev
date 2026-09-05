import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_RELEASE_ATTEMPT_SCOPE,
  PUBLIC_RELEASE_CLASSIFICATIONS,
  PUBLIC_RELEASE_STAGES,
  classifyGitHubRelease,
  classifyGitTag,
  classifyNpmPublication,
  classifyPublicationWorkflow,
  classifyPublicReleaseState,
  createPackedEntrySetDigest,
  createCanonicalPublicReleaseProof,
  createPriorVersionSetDigest,
  derivePublicReleasePlan,
  derivePublicReleaseWorkflowInputs,
  freezePublicReleaseTuple,
  parsePublicReleaseInvocation,
  redactPublicReleaseDiagnostics,
  recoverPublicReleaseSigningTuple,
  runPublicRelease as executePublicRelease,
} from "../src/core/task-artifact-public-release.mjs";

// Fixtures explicitly authorize only the frozen public target.
const runPublicRelease = (options) => executePublicRelease({
  invocation: `$kyw-deliver --release ${options.tuple.package.version} --sha ${options.tuple.target.mergeSha}`,
  ...options,
});

const mergeSha = "a".repeat(40);
const treeSha = "b".repeat(40);
const tarballSha256 = "c".repeat(64);
const shasum = "d".repeat(40);
const integrity = `sha512-${Buffer.alloc(64, 7).toString("base64")}`;

function releaseTuple(overrides = {}) {
  const tuple = {
    schemaVersion: 1,
    taskId: "0085",
    repository: "owner/repository",
    baseBranch: "main",
    target: { mergeSha, treeSha },
    publishWorkflow: {
      id: 42,
      name: "Publish npm package through OIDC",
      path: ".github/workflows/publish.yml",
      state: "active",
      ref: "refs/heads/main",
      event: "workflow_dispatch",
      environment: "npm-production",
      publisher: {
        provider: "GitHub Actions",
        authentication: "OIDC",
        repository: "owner/repository",
        workflow: "publish.yml",
        environment: "npm-production",
        action: "npm publish",
      },
    },
    package: {
      name: "example-package",
      version: "1.2.3",
      repository: "git+https://github.com/owner/repository.git",
      access: "public",
      registry: "https://registry.npmjs.org/",
      tarball: {
        bytes: 1234,
        integrity,
        shasum,
        sha256: tarballSha256,
        entries: [".codex-plugin/plugin.json", "package.json", "src/index.mjs"],
      },
      signature: { required: true, keyId: "SHA256:trusted-key" },
      provenance: {
        required: true,
        sourceRepository: "owner/repository",
        workflowPath: ".github/workflows/publish.yml",
        workflowRef: "refs/heads/main",
        sourceCommit: mergeSha,
        subjectSha256: tarballSha256,
      },
      priorVersions: ["1.0.0", "1.1.0"],
      priorLatest: "1.1.0",
    },
    plugin: { name: "example-package", version: "1.2.3" },
    tag: { name: "v1.2.3", ref: "refs/tags/v1.2.3" },
    release: {
      tagName: "v1.2.3",
      title: "v1.2.3",
      body: "",
      draft: false,
      prerelease: false,
      generateReleaseNotes: false,
      assets: [],
    },
  };
  return Object.assign(tuple, overrides);
}

function standardFinal(tuple = releaseTuple()) {
  return {
    satisfied: true,
    classification: "HARDENED_EXACT_HEAD",
    claim: "FINAL",
    taskId: tuple.taskId,
    repository: tuple.repository,
    baseBranch: tuple.baseBranch,
    mergeSha: tuple.target.mergeSha,
    mergeTreeSha: tuple.target.treeSha,
    postMainCi: "VERIFIED_EXACT_CHECKOUT",
  };
}

function exactWorkflow(tuple = releaseTuple()) {
  return {
    runId: 101,
    runAttempt: 1,
    repository: tuple.repository,
    workflowId: tuple.publishWorkflow.id,
    workflowName: tuple.publishWorkflow.name,
    workflowPath: tuple.publishWorkflow.path,
    event: tuple.publishWorkflow.event,
    ref: tuple.publishWorkflow.ref,
    headSha: tuple.target.mergeSha,
    inputs: derivePublicReleaseWorkflowInputs(tuple),
    status: "completed",
    conclusion: "success",
    publishAttempts: [
      {
        checkoutSha: tuple.target.mergeSha,
        conclusion: "SUCCESS",
        command: `npm publish . --access public --ignore-scripts --registry=${tuple.package.registry}`,
      },
    ],
  };
}

function exactNpm(tuple = releaseTuple()) {
  return {
    status: 200,
    name: tuple.package.name,
    version: tuple.package.version,
    registry: tuple.package.registry,
    repository: tuple.package.repository,
    access: tuple.package.access,
    gitHead: tuple.target.mergeSha,
    distTags: { latest: tuple.package.version },
    tarball: { ...tuple.package.tarball, rawBytesVerified: true },
    signature: { keyId: tuple.package.signature.keyId, verified: true },
    provenance: {
      verified: true,
      sourceRepository: tuple.package.provenance.sourceRepository,
      workflowPath: tuple.package.provenance.workflowPath,
      workflowRef: tuple.package.provenance.workflowRef,
      sourceCommit: tuple.package.provenance.sourceCommit,
      subjectSha256: tuple.package.provenance.subjectSha256,
      runId: 101,
      runAttempt: 1,
    },
    versions: [...tuple.package.priorVersions, tuple.package.version],
  };
}

function absentNpm(tuple = releaseTuple()) {
  return {
    status: 404,
    absent: true,
    name: tuple.package.name,
    version: tuple.package.version,
    registry: tuple.package.registry,
    signatureKeyId: tuple.package.signature.keyId,
    indexComplete: true,
    versions: [...tuple.package.priorVersions],
    distTags: { latest: tuple.package.priorLatest },
  };
}

function exactTag(tuple = releaseTuple()) {
  return {
    repository: tuple.repository,
    ref: tuple.tag.ref,
    objectType: "commit",
    targetSha: tuple.target.mergeSha,
  };
}

function exactRelease(tuple = releaseTuple()) {
  return {
    id: 202,
    repository: tuple.repository,
    tagName: tuple.release.tagName,
    tagTargetSha: tuple.target.mergeSha,
    title: tuple.release.title,
    body: tuple.release.body,
    draft: false,
    prerelease: false,
    state: "published",
    assets: [],
  };
}

function exactSnapshot(tuple = releaseTuple(), readSequence = 1) {
  return {
    workflow: [exactWorkflow(tuple)],
    npm: exactNpm(tuple),
    tag: exactTag(tuple),
    release: exactRelease(tuple),
    readContext: { fresh: true, cacheBypass: true, sequence: readSequence },
  };
}

function createStateClients(tuple, initial = {}) {
  const trace = [];
  let state = {
    workflow: initial.workflow ?? [],
    npm: initial.npm ?? absentNpm(tuple),
    tag: initial.tag ?? null,
    release: initial.release ?? null,
  };
  const hooks = initial.hooks ?? {};

  function read(surface) {
    return async (_tuple, context) => {
      trace.push({ kind: "READ", surface, ...context });
      if (hooks.beforeRead) await hooks.beforeRead(surface, context, state);
      return state[surface];
    };
  }

  const clients = {
    readWorkflowRuns: read("workflow"),
    readNpmVersion: read("npm"),
    readTag: read("tag"),
    readRelease: read("release"),
    async dispatchPublishWorkflow(_tuple, context) {
      trace.push({ kind: "WRITE", stage: "NPM", ...context });
      if (hooks.dispatchPublishWorkflow) {
        return hooks.dispatchPublishWorkflow({ tuple, context, state, setState });
      }
      state = { ...state, workflow: [exactWorkflow(tuple)], npm: exactNpm(tuple) };
      return { accepted: true };
    },
    async createTag(_tuple, context) {
      trace.push({ kind: "WRITE", stage: "TAG", ...context });
      if (hooks.createTag) return hooks.createTag({ tuple, context, state, setState });
      state = { ...state, tag: exactTag(tuple) };
      return { accepted: true };
    },
    async createRelease(_tuple, context) {
      trace.push({ kind: "WRITE", stage: "RELEASE", ...context });
      if (hooks.createRelease) {
        return hooks.createRelease({ tuple, context, state, setState });
      }
      state = { ...state, release: exactRelease(tuple) };
      return { accepted: true };
    },
  };

  function setState(next) {
    state = { ...state, ...next };
  }

  return { clients, trace, state: () => state, setState };
}

test("public-release routing requires the explicit version and SHA action", () => {
  assert.deepEqual(parsePublicReleaseInvocation(`$kyw-deliver --release 1.2.3 --sha ${mergeSha}`), {
    recognized: true,
    route: "RELEASE",
    mode: "RELEASE",
    source: "PORTABLE_SKILL",
    taskId: null,
    releaseVersion: "1.2.3",
    releaseSha: mergeSha,
    overrideText: "",
    overrideScope: "NONE",
  });
  for (const invocation of [
    "$kyw-deliver 0085",
    "$kyw-deliver 0085 --merge",
    "$kyw-deliver 0085 --public-release",
    "$kyw-deliver 85 --public-release",
    "$kyw-deliver 0085 --public-release now",
    "$kyw-deliver 0085 --PUBLIC-RELEASE",
    "$kyw-deliver --public-release 0085",
    "please $kyw-deliver 0085 --public-release",
    "$kyw-deliver 0085 --public-release && npm publish",
    "task 0085 실행해줘 --public-release",
    "남은 task 계속 실행해줘 --public-release",
    "$kyw-deliver 0085 --public-release &",
    "$kyw-deliver 0085 --public-release\nnext",
  ]) {
    assert.equal(parsePublicReleaseInvocation(invocation), null, invocation);
  }
});

test("workflow input identities use deterministic domain-separated set digests", () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const inputs = derivePublicReleaseWorkflowInputs(tuple);
  assert.equal(Object.isFrozen(inputs), true);
  assert.deepEqual(inputs, {
    expected_sha: mergeSha,
    expected_version: "1.2.3",
    expected_tarball_bytes: "1234",
    expected_tarball_sha256: tarballSha256,
    expected_tarball_shasum: shasum,
    expected_tarball_integrity: integrity,
    expected_packed_entries_sha256:
      "40f79f94bec29a4334290b4348336e210fb184031bc34fa6d8a121f4c7943108",
    expected_prior_versions_sha256:
      "9cdda3a2d7b962873e3dc469a2039af39a1cd51c361311223164b45961bec9a5",
    expected_prior_latest: "1.1.0",
    expected_signing_key_id: "SHA256:trusted-key",
  });
  assert.equal(
    createPackedEntrySetDigest([...tuple.package.tarball.entries].reverse()),
    inputs.expected_packed_entries_sha256,
  );
  assert.equal(
    createPriorVersionSetDigest([...tuple.package.priorVersions].reverse()),
    inputs.expected_prior_versions_sha256,
  );
  assert.throws(
    () => createPackedEntrySetDigest(["package.json", "package.json"]),
    TypeError,
  );
  assert.throws(() => createPriorVersionSetDigest("1.0.0"), TypeError);

  const noPrior = freezePublicReleaseTuple(
    releaseTuple({
      package: {
        ...releaseTuple().package,
        priorVersions: [],
        priorLatest: null,
      },
    }),
  );
  const noPriorInputs = derivePublicReleaseWorkflowInputs(noPrior);
  assert.equal(noPriorInputs.expected_prior_latest, "null");
  assert.equal(
    noPriorInputs.expected_prior_versions_sha256,
    "da9d4957efc0ab7833550d9505a3a1cadb5d46bccc326febbcf41dd6431e5ac5",
  );
});

test("the frozen tarball byte count shares the bounded production fetch envelope", () => {
  for (const bytes of [0, 8 * 1024 * 1024 + 1, 1.5, Number.NaN]) {
    assert.throws(
      () =>
        freezePublicReleaseTuple(
          releaseTuple({
            package: {
              ...releaseTuple().package,
              tarball: { ...releaseTuple().package.tarball, bytes },
            },
          }),
        ),
      (error) =>
        error?.code === "PUBLIC_RELEASE_TUPLE_INVALID" &&
        error.issues.some((issue) => issue.includes("integer from 1 through 8388608")),
      String(bytes),
    );
  }
  assert.equal(
    freezePublicReleaseTuple(
      releaseTuple({
        package: {
          ...releaseTuple().package,
          tarball: { ...releaseTuple().package.tarball, bytes: 8 * 1024 * 1024 },
        },
      }),
    ).package.tarball.bytes,
    8 * 1024 * 1024,
  );
});

test("the frozen tarball integrity is one canonical 64-byte SHA-512 SRI", () => {
  const encoded = integrity.slice("sha512-".length);
  const noncanonicalEquivalent = `sha512-${encoded.slice(0, -3)}x==`;
  assert.equal(
    Buffer.from(noncanonicalEquivalent.slice("sha512-".length), "base64").equals(
      Buffer.from(encoded, "base64"),
    ),
    true,
  );
  const invalidValues = [
    "sha512-a",
    `sha512-${encoded.slice(0, -2)}`,
    `sha512-${Buffer.alloc(63, 7).toString("base64")}`,
    `sha512-${encoded.slice(0, -2)}AA`,
    noncanonicalEquivalent,
  ];
  for (const invalidIntegrity of invalidValues) {
    assert.throws(
      () =>
        freezePublicReleaseTuple(
          releaseTuple({
            package: {
              ...releaseTuple().package,
              tarball: {
                ...releaseTuple().package.tarball,
                integrity: invalidIntegrity,
              },
            },
          }),
        ),
      (error) =>
        error?.code === "PUBLIC_RELEASE_TUPLE_INVALID" &&
        error.issues.some((issue) => issue.includes("canonical 95-character SHA-512")),
      invalidIntegrity,
    );
  }
  assert.equal(freezePublicReleaseTuple(releaseTuple()).package.tarball.integrity, integrity);
});

test("the frozen signing key ID is a bounded workflow-safe token", () => {
  for (const keyId of ["", "SHA256:key with space", "SHA256:key\nnext", "x".repeat(257)]) {
    assert.throws(
      () =>
        freezePublicReleaseTuple(
          releaseTuple({
            package: {
              ...releaseTuple().package,
              signature: { ...releaseTuple().package.signature, keyId },
            },
          }),
        ),
      (error) =>
        error?.code === "PUBLIC_RELEASE_TUPLE_INVALID" &&
        error.issues.some((issue) => issue.includes("non-whitespace token")),
      keyId,
    );
  }
  assert.equal(
    freezePublicReleaseTuple(releaseTuple()).package.signature.keyId,
    "SHA256:trusted-key",
  );
});

test("completed workflow proof requires every frozen input identity", () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const expectedInputs = derivePublicReleaseWorkflowInputs(tuple);
  const mismatches = {
    expected_sha: "e".repeat(40),
    expected_version: "9.9.9",
    expected_tarball_bytes: "1235",
    expected_tarball_sha256: "e".repeat(64),
    expected_tarball_shasum: "e".repeat(40),
    expected_tarball_integrity: `sha512-${Buffer.alloc(64, 8).toString("base64")}`,
    expected_packed_entries_sha256: "e".repeat(64),
    expected_prior_versions_sha256: "f".repeat(64),
    expected_prior_latest: "1.0.0",
    expected_signing_key_id: "SHA256:other-key",
  };

  for (const [inputName, mismatch] of Object.entries(mismatches)) {
    const missingInputs = { ...expectedInputs };
    delete missingInputs[inputName];
    assert.equal(
      classifyPublicationWorkflow(tuple, [
        { ...exactWorkflow(tuple), inputs: missingInputs },
      ]).classification,
      "UNKNOWN",
      `${inputName} omission must not prove a completed run`,
    );
    assert.equal(
      classifyPublicationWorkflow(tuple, [
        {
          ...exactWorkflow(tuple),
          inputs: { ...expectedInputs, [inputName]: mismatch },
        },
      ]).classification,
      "CONFLICT",
      `${inputName} mismatch must conflict with the frozen tuple`,
    );
  }

  assert.equal(
    classifyPublicationWorkflow(tuple, [
      {
        ...exactWorkflow(tuple),
        inputs: { ...expectedInputs, unexpected_input: "value" },
      },
    ]).classification,
    "CONFLICT",
  );
  assert.equal(
    classifyPublicationWorkflow(tuple, [
      {
        ...exactWorkflow(tuple),
        inputs: {
          ...expectedInputs,
          expectedTarballBytes: "1235",
        },
      },
    ]).classification,
    "CONFLICT",
  );
  assert.equal(
    classifyPublicationWorkflow(tuple, [
      {
        ...exactWorkflow(tuple),
        inputs: {
          ...expectedInputs,
          expectedSigningKeyId: "SHA256:other-key",
        },
      },
    ]).classification,
    "CONFLICT",
  );

  const { expected_signing_key_id: signingKeyId, ...camelSigningInputs } =
    expectedInputs;
  assert.equal(
    classifyPublicationWorkflow(tuple, [
      {
        ...exactWorkflow(tuple),
        inputs: { ...camelSigningInputs, expectedSigningKeyId: signingKeyId },
      },
    ]).classification,
    "EXACT_ALREADY_COMPLETE",
  );

  const exact = classifyPublicationWorkflow(tuple, [exactWorkflow(tuple)]);
  assert.equal(exact.classification, "EXACT_ALREADY_COMPLETE");
  assert.deepEqual(exact.evidence.inputs, expectedInputs);
});

test("the release tuple is strict, relationally cross-checked, and deeply frozen", () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  assert.equal(Object.isFrozen(tuple), true);
  assert.equal(Object.isFrozen(tuple.package.tarball), true);
  assert.equal(Object.isFrozen(tuple.release.assets), true);
  assert.deepEqual(PUBLIC_RELEASE_CLASSIFICATIONS, [
    "ABSENT",
    "EXACT_ALREADY_COMPLETE",
    "PENDING_PROOF",
    "CONFLICT",
    "UNKNOWN",
  ]);
  assert.deepEqual(PUBLIC_RELEASE_STAGES, [
    "STANDARD_FINAL",
    "NPM",
    "TAG",
    "RELEASE",
    "FINAL_PROOF",
  ]);

  const invalidTuples = [
    { ...releaseTuple(), taskId: "85" },
    { ...releaseTuple(), repository: "not-a-repository" },
    { ...releaseTuple(), target: { mergeSha: "A".repeat(40), treeSha } },
    {
      ...releaseTuple(),
      publishWorkflow: { ...releaseTuple().publishWorkflow, state: "disabled_manually" },
    },
    {
      ...releaseTuple(),
      publishWorkflow: { ...releaseTuple().publishWorkflow, ref: "refs/heads/other" },
    },
    {
      ...releaseTuple(),
      package: { ...releaseTuple().package, access: "restricted" },
    },
    {
      ...releaseTuple(),
      package: {
        ...releaseTuple().package,
        repository: "git+https://github.com/other/repository.git",
      },
    },
    {
      ...releaseTuple(),
      package: {
        ...releaseTuple().package,
        version: "1.0.0",
        priorVersions: ["1.1.0"],
        priorLatest: "1.1.0",
      },
      plugin: { name: "example-package", version: "1.0.0" },
      tag: { name: "v1.0.0", ref: "refs/tags/v1.0.0" },
      release: { ...releaseTuple().release, tagName: "v1.0.0", title: "v1.0.0" },
    },
    {
      ...releaseTuple(),
      package: {
        ...releaseTuple().package,
        tarball: { ...releaseTuple().package.tarball, bytes: 0 },
      },
    },
    {
      ...releaseTuple(),
      package: {
        ...releaseTuple().package,
        tarball: {
          ...releaseTuple().package.tarball,
          entries: ["package.json", ".codex-plugin/plugin.json"],
        },
      },
    },
    {
      ...releaseTuple(),
      package: {
        ...releaseTuple().package,
        priorVersions: Array.from({ length: 1025 }, (_, index) => `0.0.${index}`),
        priorLatest: "0.0.1024",
      },
    },
    {
      ...releaseTuple(),
      package: {
        ...releaseTuple().package,
        version: `1.${"2".repeat(64)}.3`,
      },
    },
    {
      ...releaseTuple(),
      package: {
        ...releaseTuple().package,
        provenance: {
          ...releaseTuple().package.provenance,
          sourceCommit: "e".repeat(40),
        },
      },
    },
    { ...releaseTuple(), plugin: { name: "other", version: "1.2.3" } },
    { ...releaseTuple(), tag: { name: "v9.9.9", ref: "refs/tags/v9.9.9" } },
    {
      ...releaseTuple(),
      release: { ...releaseTuple().release, draft: true },
    },
    { ...releaseTuple(), unexpected: true },
  ];
  for (const candidate of invalidTuples) {
    assert.throws(
      () => freezePublicReleaseTuple(candidate),
      (error) => error.code === "PUBLIC_RELEASE_TUPLE_INVALID",
    );
  }
});

test("every frozen tuple dimension independently fails closed when canonical facts stay fixed", () => {
  const baseline = freezePublicReleaseTuple(releaseTuple());
  const snapshot = exactSnapshot(baseline);
  const gate = standardFinal(baseline);
  const mutations = [
    ["Task ID", (value) => ({ ...value, taskId: "0086" })],
    ["repository", (value) => ({ ...value, repository: "other/repository" })],
    ["base branch", (value) => ({ ...value, baseBranch: "release" })],
    [
      "merge SHA",
      (value) => ({ ...value, target: { ...value.target, mergeSha: "e".repeat(40) } }),
    ],
    [
      "merge tree SHA",
      (value) => ({ ...value, target: { ...value.target, treeSha: "e".repeat(40) } }),
    ],
    [
      "workflow ID",
      (value) => ({
        ...value,
        publishWorkflow: { ...value.publishWorkflow, id: 43 },
      }),
    ],
    [
      "workflow name",
      (value) => ({
        ...value,
        publishWorkflow: { ...value.publishWorkflow, name: "Other workflow" },
      }),
    ],
    [
      "workflow path",
      (value) => ({
        ...value,
        publishWorkflow: {
          ...value.publishWorkflow,
          path: ".github/workflows/other.yml",
        },
      }),
    ],
    [
      "workflow state",
      (value) => ({
        ...value,
        publishWorkflow: { ...value.publishWorkflow, state: "disabled_manually" },
      }),
    ],
    [
      "workflow ref",
      (value) => ({
        ...value,
        publishWorkflow: { ...value.publishWorkflow, ref: "refs/heads/release" },
      }),
    ],
    [
      "workflow event",
      (value) => ({
        ...value,
        publishWorkflow: { ...value.publishWorkflow, event: "push" },
      }),
    ],
    [
      "workflow environment",
      (value) => ({
        ...value,
        publishWorkflow: { ...value.publishWorkflow, environment: "production" },
      }),
    ],
    ...[
      ["provider", "Other Actions"],
      ["authentication", "TOKEN"],
      ["repository", "other/repository"],
      ["workflow", "other.yml"],
      ["environment", "production"],
      ["action", "npm stage publish"],
    ].map(([field, changed]) => [
      `publisher ${field}`,
      (value) => ({
        ...value,
        publishWorkflow: {
          ...value.publishWorkflow,
          publisher: { ...value.publishWorkflow.publisher, [field]: changed },
        },
      }),
    ]),
    [
      "package name",
      (value) => ({ ...value, package: { ...value.package, name: "other-package" } }),
    ],
    [
      "package version",
      (value) => ({ ...value, package: { ...value.package, version: "1.2.4" } }),
    ],
    [
      "package repository",
      (value) => ({
        ...value,
        package: {
          ...value.package,
          repository: "git+https://github.com/other/repository.git",
        },
      }),
    ],
    [
      "package access",
      (value) => ({ ...value, package: { ...value.package, access: "restricted" } }),
    ],
    [
      "registry",
      (value) => ({
        ...value,
        package: { ...value.package, registry: "https://registry.example.invalid/" },
      }),
    ],
    [
      "tarball bytes",
      (value) => ({
        ...value,
        package: {
          ...value.package,
          tarball: { ...value.package.tarball, bytes: value.package.tarball.bytes + 1 },
        },
      }),
    ],
    [
      "tarball integrity",
      (value) => ({
        ...value,
        package: {
          ...value.package,
          tarball: {
            ...value.package.tarball,
            integrity: `sha512-${Buffer.alloc(64, 8).toString("base64")}`,
          },
        },
      }),
    ],
    [
      "tarball shasum",
      (value) => ({
        ...value,
        package: {
          ...value.package,
          tarball: { ...value.package.tarball, shasum: "e".repeat(40) },
        },
      }),
    ],
    [
      "tarball SHA-256",
      (value) => ({
        ...value,
        package: {
          ...value.package,
          tarball: { ...value.package.tarball, sha256: "e".repeat(64) },
        },
      }),
    ],
    [
      "packed entry set",
      (value) => ({
        ...value,
        package: {
          ...value.package,
          tarball: {
            ...value.package.tarball,
            entries: [...value.package.tarball.entries, "src/other.mjs"].sort(),
          },
        },
      }),
    ],
    [
      "signature",
      (value) => ({
        ...value,
        package: {
          ...value.package,
          signature: { ...value.package.signature, keyId: "SHA256:other-key" },
        },
      }),
    ],
    [
      "provenance",
      (value) => ({
        ...value,
        package: {
          ...value.package,
          provenance: { ...value.package.provenance, workflowRef: "refs/heads/release" },
        },
      }),
    ],
    [
      "prior versions",
      (value) => ({
        ...value,
        package: { ...value.package, priorVersions: ["1.0.0"] },
      }),
    ],
    [
      "prior latest",
      (value) => ({
        ...value,
        package: { ...value.package, priorLatest: "1.0.0" },
      }),
    ],
    ["plugin name", (value) => ({ ...value, plugin: { ...value.plugin, name: "other" } })],
    [
      "plugin version",
      (value) => ({ ...value, plugin: { ...value.plugin, version: "1.2.4" } }),
    ],
    ["tag name", (value) => ({ ...value, tag: { ...value.tag, name: "v1.2.4" } })],
    ["tag ref", (value) => ({ ...value, tag: { ...value.tag, ref: "refs/tags/v1.2.4" } })],
    [
      "Release tag",
      (value) => ({ ...value, release: { ...value.release, tagName: "v1.2.4" } }),
    ],
    [
      "Release title",
      (value) => ({ ...value, release: { ...value.release, title: "Other title" } }),
    ],
    ["Release body", (value) => ({ ...value, release: { ...value.release, body: "notes" } })],
    ["Release draft", (value) => ({ ...value, release: { ...value.release, draft: true } })],
    [
      "Release prerelease",
      (value) => ({ ...value, release: { ...value.release, prerelease: true } }),
    ],
    [
      "Release generated notes",
      (value) => ({
        ...value,
        release: { ...value.release, generateReleaseNotes: true },
      }),
    ],
    [
      "Release assets",
      (value) => ({ ...value, release: { ...value.release, assets: ["asset.tgz"] } }),
    ],
  ];

  for (const [label, mutate] of mutations) {
    const candidate = mutate(releaseTuple());
    let result;
    try {
      const frozen = freezePublicReleaseTuple(candidate);
      result = derivePublicReleasePlan({ standardDelivery: gate, tuple: frozen, snapshot });
    } catch (error) {
      result = { outcome: "BLOCKED", code: error.code };
    }
    assert.equal(result.outcome, "BLOCKED", label);
  }
});

test("each remote surface has the same five closed classifications", () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const workflowCases = [
    [[], "ABSENT"],
    [[exactWorkflow(tuple)], "EXACT_ALREADY_COMPLETE"],
    [[{ ...exactWorkflow(tuple), status: "in_progress", conclusion: null }], "PENDING_PROOF"],
    [[{ ...exactWorkflow(tuple), conclusion: "failure" }], "CONFLICT"],
    [undefined, "UNKNOWN"],
  ];
  const npmCases = [
    [absentNpm(tuple), "ABSENT"],
    [exactNpm(tuple), "EXACT_ALREADY_COMPLETE"],
    [{ pending: true }, "PENDING_PROOF"],
    [{ ...exactNpm(tuple), gitHead: "e".repeat(40) }, "CONFLICT"],
    [undefined, "UNKNOWN"],
  ];
  const tagCases = [
    [null, "ABSENT"],
    [exactTag(tuple), "EXACT_ALREADY_COMPLETE"],
    [{ pending: true }, "PENDING_PROOF"],
    [{ ...exactTag(tuple), targetSha: "e".repeat(40) }, "CONFLICT"],
    [undefined, "UNKNOWN"],
  ];
  const releaseCases = [
    [null, "ABSENT"],
    [exactRelease(tuple), "EXACT_ALREADY_COMPLETE"],
    [{ pending: true }, "PENDING_PROOF"],
    [{ ...exactRelease(tuple), prerelease: true }, "CONFLICT"],
    [undefined, "UNKNOWN"],
  ];
  for (const [raw, expected] of workflowCases) {
    assert.equal(classifyPublicationWorkflow(tuple, raw).classification, expected);
  }
  for (const [raw, expected] of npmCases) {
    assert.equal(classifyNpmPublication(tuple, raw).classification, expected);
  }
  for (const [raw, expected] of tagCases) {
    assert.equal(classifyGitTag(tuple, raw).classification, expected);
  }
  for (const [raw, expected] of releaseCases) {
    assert.equal(classifyGitHubRelease(tuple, raw).classification, expected);
  }
});

test("npm ABSENT requires a fresh complete unchanged index and latest proof", () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  assert.equal(classifyNpmPublication(tuple, absentNpm(tuple)).classification, "ABSENT");
  assert.equal(classifyNpmPublication(tuple, null).classification, "UNKNOWN");
  assert.equal(
    classifyNpmPublication(tuple, { ...absentNpm(tuple), indexComplete: false })
      .classification,
    "UNKNOWN",
  );
  assert.equal(
    classifyNpmPublication(tuple, {
      ...absentNpm(tuple),
      versions: [...tuple.package.priorVersions, "1.2.2"],
    }).classification,
    "CONFLICT",
  );
  assert.equal(
    classifyNpmPublication(tuple, {
      ...absentNpm(tuple),
      distTags: { latest: "1.0.0" },
    }).classification,
    "CONFLICT",
  );
  assert.equal(
    classifyNpmPublication(tuple, {
      ...absentNpm(tuple),
      signatureKeyId: "SHA256:rotated-key",
    }).classification,
    "CONFLICT",
  );
  assert.equal(
    classifyNpmPublication(tuple, {
      ...absentNpm(tuple),
      versions: [...tuple.package.priorVersions, tuple.package.version],
    }).classification,
    "CONFLICT",
  );
});

test("supply-chain, tag peel, Release asset, run ambiguity, and future-stage conflicts fail closed", () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  for (const npmState of [
    { ...exactNpm(tuple), tarball: { ...exactNpm(tuple).tarball, bytes: 1235 } },
    {
      ...exactNpm(tuple),
      tarball: { ...exactNpm(tuple).tarball, rawBytesVerified: false },
    },
    {
      ...exactNpm(tuple),
      tarball: {
        ...exactNpm(tuple).tarball,
        entries: [".codex-plugin/plugin.json", "package.json", "src/tampered.mjs"],
      },
    },
    { ...exactNpm(tuple), signature: { ...exactNpm(tuple).signature, verified: false } },
    {
      ...exactNpm(tuple),
      provenance: { ...exactNpm(tuple).provenance, workflowPath: ".github/workflows/other.yml" },
    },
    {
      ...exactNpm(tuple),
      provenance: { ...exactNpm(tuple).provenance, runAttempt: 11 },
    },
    { ...exactNpm(tuple), distTags: { latest: "1.1.0" } },
    { ...exactNpm(tuple), versions: [tuple.package.version] },
  ]) {
    assert.equal(classifyNpmPublication(tuple, npmState).classification, "CONFLICT");
  }
  const provenanceMismatch = classifyPublicReleaseState(tuple, {
    workflow: [exactWorkflow(tuple)],
    npm: {
      ...exactNpm(tuple),
      provenance: { ...exactNpm(tuple).provenance, runId: 999 },
    },
    tag: null,
    release: null,
  });
  assert.equal(provenanceMismatch.disposition, "BLOCKED");
  assert.equal(provenanceMismatch.classifications.npm, "CONFLICT");
  const pendingRunMismatch = classifyPublicReleaseState(tuple, {
    workflow: [{ ...exactWorkflow(tuple), status: "in_progress", conclusion: null }],
    npm: {
      ...exactNpm(tuple),
      provenance: { ...exactNpm(tuple).provenance, runId: 999 },
    },
    tag: null,
    release: null,
  });
  assert.equal(pendingRunMismatch.disposition, "BLOCKED");
  assert.equal(pendingRunMismatch.classifications.npm, "CONFLICT");
  assert.equal(
    classifyGitTag(tuple, {
      repository: tuple.repository,
      ref: tuple.tag.ref,
      objectType: "tag",
      peelComplete: true,
      peeledSha: tuple.target.mergeSha,
    }).classification,
    "EXACT_ALREADY_COMPLETE",
  );
  assert.equal(
    classifyGitTag(tuple, {
      repository: tuple.repository,
      ref: tuple.tag.ref,
      objectType: "tag",
      peelComplete: false,
      peeledSha: tuple.target.mergeSha,
    }).classification,
    "CONFLICT",
  );
  assert.equal(
    classifyGitHubRelease(tuple, { ...exactRelease(tuple), assets: [{ name: "asset.tgz" }] })
      .classification,
    "CONFLICT",
  );
  assert.equal(
    classifyPublicationWorkflow(tuple, [exactWorkflow(tuple), exactWorkflow(tuple)])
      .classification,
    "CONFLICT",
  );
  assert.equal(
    classifyPublicationWorkflow(tuple, [
      {
        ...exactWorkflow(tuple),
        publishAttempts: [
          ...exactWorkflow(tuple).publishAttempts,
          ...exactWorkflow(tuple).publishAttempts,
        ],
      },
    ]).classification,
    "CONFLICT",
  );
  assert.equal(
    classifyPublicationWorkflow(tuple, [
      {
        ...exactWorkflow(tuple),
        publishAttempts: [
          { ...exactWorkflow(tuple).publishAttempts[0], command: "npm publish package.tgz" },
        ],
      },
    ]).classification,
    "CONFLICT",
  );
  const { publishAttempts: _publishAttempts, ...workflowWithoutAttempt } =
    exactWorkflow(tuple);
  assert.equal(
    classifyPublicationWorkflow(tuple, [workflowWithoutAttempt]).classification,
    "UNKNOWN",
  );
  const { inputs: _pendingInputs, ...pendingWithoutInputs } = exactWorkflow(tuple);
  assert.equal(
    classifyPublicationWorkflow(tuple, [
      { ...pendingWithoutInputs, status: "in_progress", conclusion: null },
    ]).classification,
    "PENDING_PROOF",
  );
  assert.equal(
    classifyPublicationWorkflow(tuple, [
      {
        ...exactWorkflow(tuple),
        status: "in_progress",
        conclusion: null,
        inputs: {
          ...derivePublicReleaseWorkflowInputs(tuple),
          expected_version: "9.9.9",
        },
      },
    ]).classification,
    "CONFLICT",
  );
  assert.equal(
    classifyPublicationWorkflow(tuple, [pendingWithoutInputs]).classification,
    "UNKNOWN",
  );
  assert.equal(
    classifyPublicationWorkflow(tuple, [
      { ...pendingWithoutInputs, conclusion: "failure" },
    ]).classification,
    "CONFLICT",
  );

  const futureState = classifyPublicReleaseState(tuple, {
    workflow: [],
    npm: absentNpm(tuple),
    tag: exactTag(tuple),
    release: exactRelease(tuple),
  });
  assert.equal(futureState.disposition, "BLOCKED");
  assert.equal(futureState.classifications.tag, "CONFLICT");
  assert.equal(futureState.classifications.release, "CONFLICT");
});

test("malformed pagination, collisions, duplicates, and Release metadata are closed states", () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const cases = [
    [
      "workflow incomplete pagination",
      classifyPublicationWorkflow(tuple, { runs: [], complete: false }).classification,
      "UNKNOWN",
    ],
    [
      "tag incomplete pagination",
      classifyGitTag(tuple, { tags: [], complete: false }).classification,
      "UNKNOWN",
    ],
    [
      "Release incomplete pagination",
      classifyGitHubRelease(tuple, { releases: [], complete: false }).classification,
      "UNKNOWN",
    ],
    [
      "tag namespace collision",
      classifyGitTag(tuple, { ...exactTag(tuple), namespaceCollision: true }).classification,
      "CONFLICT",
    ],
    [
      "duplicate tag",
      classifyGitTag(tuple, { tags: [exactTag(tuple), exactTag(tuple)], complete: true })
        .classification,
      "CONFLICT",
    ],
    [
      "wrong tag ref",
      classifyGitTag(tuple, { ...exactTag(tuple), ref: "refs/tags/v9.9.9" }).classification,
      "CONFLICT",
    ],
    [
      "wrong tag target",
      classifyGitTag(tuple, { ...exactTag(tuple), targetSha: "e".repeat(40) }).classification,
      "CONFLICT",
    ],
    [
      "unreadable tag object",
      classifyGitTag(tuple, { ...exactTag(tuple), objectType: undefined }).classification,
      "UNKNOWN",
    ],
    [
      "duplicate Release",
      classifyGitHubRelease(tuple, {
        releases: [exactRelease(tuple), exactRelease(tuple)],
        complete: true,
      }).classification,
      "CONFLICT",
    ],
    [
      "draft Release",
      classifyGitHubRelease(tuple, { ...exactRelease(tuple), draft: true }).classification,
      "CONFLICT",
    ],
    [
      "wrong Release title",
      classifyGitHubRelease(tuple, { ...exactRelease(tuple), title: "Other" }).classification,
      "CONFLICT",
    ],
    [
      "wrong Release repository",
      classifyGitHubRelease(tuple, { ...exactRelease(tuple), repository: "other/repo" })
        .classification,
      "CONFLICT",
    ],
    [
      "wrong Release tag",
      classifyGitHubRelease(tuple, { ...exactRelease(tuple), tagName: "v9.9.9" })
        .classification,
      "CONFLICT",
    ],
    [
      "wrong Release target",
      classifyGitHubRelease(tuple, {
        ...exactRelease(tuple),
        tagTargetSha: "e".repeat(40),
      }).classification,
      "CONFLICT",
    ],
    [
      "prerelease flag",
      classifyGitHubRelease(tuple, { ...exactRelease(tuple), prerelease: true })
        .classification,
      "CONFLICT",
    ],
    [
      "unreadable Release assets",
      classifyGitHubRelease(tuple, { ...exactRelease(tuple), assets: undefined }).classification,
      "UNKNOWN",
    ],
  ];
  for (const [label, actual, expected] of cases) {
    assert.equal(actual, expected, label);
  }
});

test("STANDARD FINAL and exact tuple identity gate every remote read and write", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const stateClient = createStateClients(tuple);
  const pendingStandard = { ...standardFinal(tuple), postMainCi: "PENDING" };
  const blocked = await runPublicRelease({
    standardDelivery: pendingStandard,
    tuple,
    clients: stateClient.clients,
  });
  assert.equal(blocked.outcome, "BLOCKED");
  assert.equal(blocked.code, "STANDARD_DELIVERY_NOT_FINAL");
  assert.equal(blocked.blockingStage, "STANDARD_FINAL");
  assert.deepEqual(stateClient.trace, []);

  const wrongTree = derivePublicReleasePlan({
    standardDelivery: { ...standardFinal(tuple), mergeTreeSha: "e".repeat(40) },
    tuple,
    snapshot: exactSnapshot(tuple),
  });
  assert.equal(wrongTree.outcome, "BLOCKED");
  assert.equal(wrongTree.code, "STANDARD_DELIVERY_NOT_FINAL");
});

test("one exact authorized invocation performs at most one ordered write per absent stage", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const stateClient = createStateClients(tuple);
  const result = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: stateClient.clients,
  });
  assert.equal(result.outcome, "COMPLETE");
  assert.equal(result.attemptScope, PUBLIC_RELEASE_ATTEMPT_SCOPE);
  assert.equal(PUBLIC_RELEASE_ATTEMPT_SCOPE, "EXACT_AUTHORIZED_INVOCATION");
  assert.equal(
    result.mutations.every(
      (mutation) =>
        mutation.attempt === 1 && mutation.attemptScope === PUBLIC_RELEASE_ATTEMPT_SCOPE,
    ),
    true,
  );
  assert.deepEqual(
    result.mutations.map(({ stage, attempt, status }) => ({ stage, attempt, status })),
    [
      { stage: "NPM", attempt: 1, status: "ACCEPTED" },
      { stage: "TAG", attempt: 1, status: "ACCEPTED" },
      { stage: "RELEASE", attempt: 1, status: "ACCEPTED" },
    ],
  );
  assert.deepEqual(
    stateClient.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["NPM", "TAG", "RELEASE"],
  );
  const readsByPurpose = Map.groupBy(
    stateClient.trace.filter((entry) => entry.kind === "READ"),
    (entry) => entry.purpose,
  );
  for (const purpose of [
    "PREFLIGHT",
    "PRE_NPM_WRITE",
    "PROVE_NPM_AFTER_WRITE",
    "PRE_TAG_WRITE",
    "PROVE_TAG_AFTER_WRITE",
    "PRE_RELEASE_WRITE",
    "PROVE_RELEASE_AFTER_WRITE",
    "FINAL_PROOF",
  ]) {
    assert.equal(readsByPurpose.get(purpose)?.length, 4, purpose);
    assert.equal(
      readsByPurpose.get(purpose).every((entry) => entry.fresh && entry.cacheBypass),
      true,
      purpose,
    );
  }
  assert.equal(result.proof.mergeSha, tuple.target.mergeSha);
  assert.equal(result.proof.package.gitHead, tuple.target.mergeSha);
  assert.equal(result.proof.package.tarball.rawBytesVerified, true);
  assert.equal(result.proof.package.tarball.entryCount, tuple.package.tarball.entries.length);
  assert.equal(Object.hasOwn(result.proof.package.tarball, "entries"), false);
  assert.deepEqual(result.proof.classifications, {
    npm: "EXACT_ALREADY_COMPLETE",
    release: "EXACT_ALREADY_COMPLETE",
    tag: "EXACT_ALREADY_COMPLETE",
    workflow: "EXACT_ALREADY_COMPLETE",
  });
});

test("canonical concurrent state appearing before npm dispatch blocks the local attempt", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const pendingRun = { ...exactWorkflow(tuple), status: "in_progress", conclusion: null };
  let appeared = false;
  const stateClient = createStateClients(tuple, {
    hooks: {
      beforeRead(surface, context) {
        if (!appeared && surface === "workflow" && context.purpose === "PRE_NPM_WRITE") {
          appeared = true;
          stateClient.setState({ workflow: [pendingRun] });
        }
      },
    },
  });
  const result = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: stateClient.clients,
  });
  assert.equal(result.outcome, "BLOCKED");
  assert.equal(result.attemptScope, PUBLIC_RELEASE_ATTEMPT_SCOPE);
  assert.equal(result.classification, "PENDING_PROOF");
  assert.equal(result.resumePoint, "NPM");
  assert.equal(stateClient.trace.some((entry) => entry.kind === "WRITE"), false);
});

test("simultaneous exact invocations are independent attempts, not a distributed lock", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const dispatches = [];
  let dispatchArrivals = 0;
  let openDispatchBarrier;
  const dispatchBarrier = new Promise((resolve) => {
    openDispatchBarrier = resolve;
  });
  const clients = {
    async readWorkflowRuns() {
      return [];
    },
    async readNpmVersion() {
      return absentNpm(tuple);
    },
    async readTag() {
      return null;
    },
    async readRelease() {
      return null;
    },
    async dispatchPublishWorkflow(_tuple, context) {
      dispatches.push(context);
      dispatchArrivals += 1;
      if (dispatchArrivals === 2) openDispatchBarrier();
      await dispatchBarrier;
      throw new Error("both separately authorized attempts lost their response");
    },
    async createTag() {
      throw new Error("unreachable later stage");
    },
    async createRelease() {
      throw new Error("unreachable later stage");
    },
  };

  const results = await Promise.all([
    runPublicRelease({ standardDelivery: standardFinal(tuple), tuple, clients }),
    runPublicRelease({ standardDelivery: standardFinal(tuple), tuple, clients }),
  ]);
  assert.equal(dispatches.length, 2);
  assert.equal(
    dispatches.every(
      (context) =>
        context.attempt === 1 && context.attemptScope === PUBLIC_RELEASE_ATTEMPT_SCOPE,
    ),
    true,
  );
  assert.equal(results.every((result) => result.outcome === "BLOCKED"), true);
  assert.equal(results.every((result) => result.classification === "UNKNOWN"), true);
  assert.equal(
    results.every(
      (result) =>
        result.mutations.length === 1 && result.mutations[0].status === "AMBIGUOUS_OR_FAILED",
    ),
    true,
  );
});

test("all-exact and partial-success resumes skip every completed mutator", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const exactClient = createStateClients(tuple, exactSnapshot(tuple));
  const exactResult = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: exactClient.clients,
  });
  assert.equal(exactResult.outcome, "COMPLETE");
  assert.deepEqual(exactResult.mutations, []);
  assert.equal(exactClient.trace.some((entry) => entry.kind === "WRITE"), false);

  const tagResume = createStateClients(tuple, {
    workflow: [exactWorkflow(tuple)],
    npm: exactNpm(tuple),
  });
  const tagResult = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: tagResume.clients,
  });
  assert.equal(tagResult.outcome, "COMPLETE");
  assert.deepEqual(
    tagResume.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["TAG", "RELEASE"],
  );

  const releaseResume = createStateClients(tuple, {
    workflow: [exactWorkflow(tuple)],
    npm: exactNpm(tuple),
    tag: exactTag(tuple),
  });
  const releaseResult = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: releaseResume.clients,
  });
  assert.equal(releaseResult.outcome, "COMPLETE");
  assert.deepEqual(
    releaseResume.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["RELEASE"],
  );
});

test("partial public success remains resumable after the base branch advances", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const advancedStandard = {
    ...standardFinal(tuple),
    currentBaseSha: "f".repeat(40),
    targetIsBaseAncestor: true,
  };

  const tagResume = createStateClients(tuple, {
    workflow: [exactWorkflow(tuple)],
    npm: exactNpm(tuple),
  });
  const tagResult = await runPublicRelease({
    standardDelivery: advancedStandard,
    tuple,
    clients: tagResume.clients,
  });
  assert.equal(tagResult.outcome, "COMPLETE");
  assert.deepEqual(
    tagResume.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["TAG", "RELEASE"],
  );

  const releaseResume = createStateClients(tuple, {
    workflow: [exactWorkflow(tuple)],
    npm: exactNpm(tuple),
    tag: exactTag(tuple),
  });
  const releaseResult = await runPublicRelease({
    standardDelivery: advancedStandard,
    tuple,
    clients: releaseResume.clients,
  });
  assert.equal(releaseResult.outcome, "COMPLETE");
  assert.deepEqual(
    releaseResume.trace
      .filter((entry) => entry.kind === "WRITE")
      .map((entry) => entry.stage),
    ["RELEASE"],
  );
});

test("matching active workflow is observed without redispatch and can resume later stages", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const pendingRun = { ...exactWorkflow(tuple), status: "in_progress", conclusion: null };
  const stateClient = createStateClients(tuple, {
    workflow: [pendingRun],
    hooks: {
      beforeRead(surface, context, _state) {
        if (surface === "workflow" && context.purpose === "OBSERVE_NPM_1") {
          stateClient.setState({ workflow: [exactWorkflow(tuple)], npm: exactNpm(tuple) });
        }
      },
    },
  });
  const result = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: stateClient.clients,
  });
  assert.equal(result.outcome, "COMPLETE");
  assert.deepEqual(
    stateClient.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["TAG", "RELEASE"],
  );
});

test("pre-write races skip an already-created tag and conflicts block all writes", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  let injectedRace = false;
  const raceClient = createStateClients(tuple, {
    workflow: [exactWorkflow(tuple)],
    npm: exactNpm(tuple),
    hooks: {
      beforeRead(surface, context) {
        if (!injectedRace && surface === "tag" && context.purpose === "PRE_TAG_WRITE") {
          injectedRace = true;
          raceClient.setState({ tag: exactTag(tuple) });
        }
      },
    },
  });
  const raced = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: raceClient.clients,
  });
  assert.equal(raced.outcome, "COMPLETE");
  assert.deepEqual(
    raceClient.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["RELEASE"],
  );

  const conflictClient = createStateClients(tuple, {
    release: { ...exactRelease(tuple), tagTargetSha: "e".repeat(40) },
  });
  const conflict = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: conflictClient.clients,
  });
  assert.equal(conflict.outcome, "BLOCKED");
  assert.equal(conflict.classification, "CONFLICT");
  assert.equal(conflictClient.trace.some((entry) => entry.kind === "WRITE"), false);
});

test("once exact, npm, tag, and Release state can only regress to a read-only block", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const cases = [
    {
      label: "npm becomes absent before tag creation",
      initial: { workflow: [exactWorkflow(tuple)], npm: exactNpm(tuple) },
      surface: "workflow",
      purpose: "PRE_TAG_WRITE",
      replacement: { workflow: [], npm: absentNpm(tuple) },
      code: "PUBLIC_RELEASE_NPM_STATE_REGRESSION",
      blockingStage: "NPM",
      classification: "ABSENT",
    },
    {
      label: "tag becomes unreadable before Release creation",
      initial: {
        workflow: [exactWorkflow(tuple)],
        npm: exactNpm(tuple),
        tag: exactTag(tuple),
      },
      surface: "tag",
      purpose: "PRE_RELEASE_WRITE",
      replacement: { tag: undefined },
      code: "PUBLIC_RELEASE_TAG_STATE_REGRESSION",
      blockingStage: "TAG",
      classification: "UNKNOWN",
    },
    {
      label: "Release conflicts during final proof",
      initial: exactSnapshot(tuple),
      surface: "release",
      purpose: "FINAL_PROOF",
      replacement: {
        release: { ...exactRelease(tuple), tagTargetSha: "e".repeat(40) },
      },
      code: "PUBLIC_RELEASE_FINAL_PROOF_REGRESSION",
      blockingStage: "RELEASE",
      classification: "CONFLICT",
    },
  ];

  for (const scenario of cases) {
    let changed = false;
    const stateClient = createStateClients(tuple, {
      ...scenario.initial,
      hooks: {
        beforeRead(surface, context) {
          if (!changed && surface === scenario.surface && context.purpose === scenario.purpose) {
            changed = true;
            stateClient.setState(scenario.replacement);
          }
        },
      },
    });
    const result = await runPublicRelease({
      standardDelivery: standardFinal(tuple),
      tuple,
      clients: stateClient.clients,
    });
    assert.equal(result.outcome, "BLOCKED", scenario.label);
    assert.equal(result.code, scenario.code, scenario.label);
    assert.equal(result.blockingStage, scenario.blockingStage, scenario.label);
    assert.equal(result.classification, scenario.classification, scenario.label);
    assert.equal(result.resumePoint, scenario.blockingStage, scenario.label);
    assert.equal(result.mutationRequired, false, scenario.label);
    assert.equal(Object.hasOwn(result, "nextStage"), false, scenario.label);
    assert.equal(
      stateClient.trace.some((entry) => entry.kind === "WRITE"),
      false,
      scenario.label,
    );
  }
});

test("an ambiguous create reconciles read-only, forbids later writes, and resumes monotonically", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const first = createStateClients(tuple, {
    workflow: [exactWorkflow(tuple)],
    npm: exactNpm(tuple),
    hooks: {
      createTag({ setState }) {
        setState({ tag: exactTag(tuple) });
        throw new Error(
          "Authorization: Bearer ghp_123456789012345678901234567890 lost response",
        );
      },
    },
  });
  const blocked = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: first.clients,
  });
  assert.equal(blocked.outcome, "BLOCKED");
  assert.equal(blocked.code, "PUBLIC_RELEASE_TAG_MUTATION_AMBIGUOUS");
  assert.equal(blocked.completedStage, "TAG");
  assert.equal(blocked.resumePoint, "RELEASE");
  assert.deepEqual(
    first.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["TAG"],
  );
  assert.doesNotMatch(JSON.stringify(blocked), /ghp_|1234567890/);

  const resumed = createStateClients(tuple, {
    workflow: first.state().workflow,
    npm: first.state().npm,
    tag: first.state().tag,
  });
  const completed = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: resumed.clients,
  });
  assert.equal(completed.outcome, "COMPLETE");
  assert.deepEqual(
    resumed.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["RELEASE"],
  );
});

test("a lost response that remains absent is UNKNOWN and a fresh exact call is a new attempt", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const lost = createStateClients(tuple, {
    hooks: {
      dispatchPublishWorkflow() {
        throw new Error("dispatch response was lost before canonical visibility");
      },
    },
  });
  const blocked = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: lost.clients,
  });
  assert.equal(blocked.outcome, "BLOCKED");
  assert.equal(blocked.classification, "UNKNOWN");
  assert.equal(blocked.completedStage, "STANDARD_FINAL");
  assert.equal(blocked.resumePoint, "NPM");
  assert.deepEqual(
    lost.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["NPM"],
  );

  const freshAttempt = createStateClients(tuple);
  const completed = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: freshAttempt.clients,
  });
  assert.equal(completed.outcome, "COMPLETE");
  assert.equal(completed.attemptScope, "EXACT_AUTHORIZED_INVOCATION");
  assert.deepEqual(
    freshAttempt.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["NPM", "TAG", "RELEASE"],
  );
});

test("ambiguous workflow dispatch and Release creation reconcile without retry or later writes", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const dispatch = createStateClients(tuple, {
    hooks: {
      dispatchPublishWorkflow({ setState }) {
        setState({ workflow: [exactWorkflow(tuple)], npm: exactNpm(tuple) });
        throw new Error("dispatch response was lost");
      },
    },
  });
  const dispatchBlocked = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: dispatch.clients,
  });
  assert.equal(dispatchBlocked.outcome, "BLOCKED");
  assert.equal(dispatchBlocked.code, "PUBLIC_RELEASE_NPM_MUTATION_AMBIGUOUS");
  assert.equal(dispatchBlocked.completedStage, "NPM");
  assert.equal(dispatchBlocked.resumePoint, "TAG");
  assert.deepEqual(
    dispatch.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["NPM"],
  );

  const release = createStateClients(tuple, {
    workflow: [exactWorkflow(tuple)],
    npm: exactNpm(tuple),
    tag: exactTag(tuple),
    hooks: {
      createRelease({ setState }) {
        setState({ release: exactRelease(tuple) });
        return { accepted: false, status: "TIMEOUT" };
      },
    },
  });
  const releaseBlocked = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: release.clients,
  });
  assert.equal(releaseBlocked.outcome, "BLOCKED");
  assert.equal(releaseBlocked.code, "PUBLIC_RELEASE_RELEASE_MUTATION_AMBIGUOUS");
  assert.equal(releaseBlocked.completedStage, "RELEASE");
  assert.equal(releaseBlocked.resumePoint, "FINAL_PROOF");
  assert.deepEqual(
    release.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["RELEASE"],
  );
});

test("known terminal non-success publication attempts take precedence and never redispatch", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  for (const conclusion of [
    "failure",
    "cancelled",
    "timed_out",
    "action_required",
    "neutral",
    "skipped",
    "stale",
    "startup_failure",
  ]) {
    const client = createStateClients(tuple, {
      workflow: [{ ...exactWorkflow(tuple), conclusion }],
    });
    const result = await runPublicRelease({
      standardDelivery: standardFinal(tuple),
      tuple,
      clients: client.clients,
    });
    assert.equal(result.outcome, "BLOCKED", conclusion);
    assert.equal(result.classification, "CONFLICT", conclusion);
    assert.equal(client.trace.some((entry) => entry.kind === "WRITE"), false, conclusion);
    const repeated = await runPublicRelease({
      standardDelivery: standardFinal(tuple),
      tuple,
      clients: client.clients,
    });
    assert.equal(repeated.outcome, "BLOCKED", `${conclusion} repeated read`);
    assert.equal(repeated.classification, "CONFLICT", `${conclusion} repeated read`);
    assert.equal(
      client.trace.some((entry) => entry.kind === "WRITE"),
      false,
      `${conclusion} repeated read`,
    );
  }

  const laterFailure = createStateClients(tuple, {
    workflow: [
      exactWorkflow(tuple),
      { ...exactWorkflow(tuple), runId: 102, conclusion: "failure" },
    ],
  });
  const result = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: laterFailure.clients,
  });
  assert.equal(result.outcome, "BLOCKED");
  assert.equal(result.classification, "CONFLICT");
  assert.equal(laterFailure.trace.some((entry) => entry.kind === "WRITE"), false);
});

test("accepted commands never prove completion without fresh canonical reads", async () => {
  const tuple = freezePublicReleaseTuple(releaseTuple());
  const client = createStateClients(tuple, {
    hooks: {
      dispatchPublishWorkflow() {
        return { accepted: true, message: "workflow said success" };
      },
    },
  });
  const result = await runPublicRelease({
    standardDelivery: standardFinal(tuple),
    tuple,
    clients: client.clients,
    reconciliationReads: 1,
  });
  assert.equal(result.outcome, "BLOCKED");
  assert.equal(result.code, "PUBLIC_RELEASE_NPM_PROOF_PENDING");
  assert.equal(result.resumePoint, "NPM");
  assert.deepEqual(
    client.trace.filter((entry) => entry.kind === "WRITE").map((entry) => entry.stage),
    ["NPM"],
  );

  const staleProof = exactSnapshot(tuple);
  delete staleProof.readContext;
  assert.throws(
    () => createCanonicalPublicReleaseProof(tuple, staleProof),
    (error) => error.code === "PUBLIC_RELEASE_FINAL_READ_NOT_FRESH",
  );
});

test("diagnostics deterministically redact credentials and bound hostile logs", () => {
  const hostile = {
    Authorization: "Bearer ghp_123456789012345678901234567890",
    cookie: "session=top-secret",
    env: {
      ORDINARY_NAME: "nonstandard-env-credential",
      NPM_TOKEN: "npm_123456789012345678901234567890",
      OTP_VALUE: "123456",
    },
    environment: {
      UNRECOGNIZED_NAME: "nonstandard-environment-credential",
    },
    jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZWNyZXQifQ.abcdefghijklmnopqrstuvwxyz",
    authUrl: "https://example.com/oauth/authorize?token=secret&code=private",
    link: "https://example.com/callback?code=credential-value&state=opaque-state",
    stderr: "x".repeat(20_000),
    nested: { password: "secret-value", safe: "retained" },
  };
  const first = redactPublicReleaseDiagnostics(hostile, { maxBytes: 2048 });
  const second = redactPublicReleaseDiagnostics(hostile, { maxBytes: 2048 });
  assert.deepEqual(first, second);
  const serialized = JSON.stringify(first);
  assert.ok(Buffer.byteLength(serialized, "utf8") <= 2048);
  for (const secret of [
    "ghp_",
    "npm_123",
    "github_pat_",
    "123456",
    "eyJhbGci",
    "secret-value",
    "nonstandard-env-credential",
    "nonstandard-environment-credential",
    "oauth/authorize",
    "credential-value",
  ]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
  assert.match(serialized, /REDACTED/);
  assert.match(serialized, /TRUNCATED|DIAGNOSTIC_LIMIT/);
});

test("plain delivery and mismatched release targets make zero public calls even for legacy contract 4", async () => {
  const tuple = releaseTuple();
  for (const invocation of [undefined, "$kyw-deliver 0085", "$kyw-deliver 0085 --merge",
    `$kyw-deliver --release 1.2.4 --sha ${mergeSha}`,
    `$kyw-deliver --release 1.2.3 --sha ${"f".repeat(40)}`]) {
    const state = createStateClients(tuple);
    const result = await executePublicRelease({ invocation, tuple, standardDelivery: standardFinal(tuple), clients: state.clients });
    assert.equal(result.code, "PUBLIC_RELEASE_AUTHORITY_REQUIRED");
    assert.deepEqual(state.trace, []);
  }
});

test("an explicit prepared release works without any Task identity or delivery history", async () => {
  const tuple = releaseTuple({ taskId: null });
  const state = createStateClients(tuple);
  const standardDelivery = { releaseTarget: { repository: tuple.repository, baseBranch: "main",
    sha: mergeSha, treeSha, currentMainSha: mergeSha } };
  const result = await runPublicRelease({ tuple, standardDelivery, clients: state.clients });
  assert.equal(result.outcome, "COMPLETE");
  assert.deepEqual(state.trace.filter((item) => item.kind === "WRITE").map((item) => item.stage), ["NPM", "TAG", "RELEASE"]);
  const invalid = createStateClients(tuple);
  const blocked = await runPublicRelease({ tuple, standardDelivery: { releaseTarget: {
    ...standardDelivery.releaseTarget, currentMainSha: "f".repeat(40) } }, clients: invalid.clients });
  assert.equal(blocked.outcome, "BLOCKED");
  assert.deepEqual(invalid.trace, []);
});

test("proven pre-publication failures permit a new attempt, ambiguous failures never do", async () => {
  const tuple = releaseTuple();
  const failed = { ...exactWorkflow(tuple), conclusion: "failure", publishBoundary: "NOT_EXECUTED", publishAttempts: [] };
  const safe = createStateClients(tuple, { workflow: [failed] });
  const result = await runPublicRelease({ tuple, standardDelivery: standardFinal(tuple), clients: safe.clients });
  assert.equal(result.outcome, "COMPLETE");
  assert.equal(safe.trace.filter((item) => item.kind === "WRITE" && item.stage === "NPM").length, 1);
  for (const prior of [ { ...failed, publishBoundary: undefined },
    { ...failed, publishAttempts: exactWorkflow(tuple).publishAttempts }, { ...failed, headSha: "f".repeat(40) } ]) {
    const state = createStateClients(tuple, { workflow: [prior] });
    const blocked = await runPublicRelease({ tuple, standardDelivery: standardFinal(tuple), clients: state.clients });
    assert.equal(blocked.outcome, "BLOCKED");
    assert.equal(state.trace.filter((item) => item.kind === "WRITE").length, 0);
  }
  const complete = classifyPublicationWorkflow(tuple, [failed, { ...exactWorkflow(tuple), runId: 102 }]);
  assert.equal(complete.classification, "EXACT_ALREADY_COMPLETE");
});

test("canonical dispatch recovery preserves multi-key and historical signing identities after publication", async () => {
  const frozen = releaseTuple();
  frozen.package.signature = { required: true, keyId: "SHA256:A", keyIds: ["SHA256:A", "SHA256:B"] };
  const original = freezePublicReleaseTuple(frozen);
  const publishedCandidate = structuredClone(original);
  publishedCandidate.package.signature = { required: true, keyId: "SHA256:B", keyIds: ["SHA256:B"] };
  const recordedRun = exactWorkflow(original);
  const recovered = recoverPublicReleaseSigningTuple(publishedCandidate, { runs: [recordedRun], complete: true });
  assert.deepEqual(recovered, original);
  const npm = exactNpm(recovered);
  npm.signature.keyIds = ["SHA256:B"];
  const state = createStateClients(recovered, { workflow: [recordedRun], npm });
  const completed = await runPublicRelease({ tuple: recovered, standardDelivery: standardFinal(recovered), clients: state.clients });
  assert.equal(completed.outcome, "COMPLETE");
  assert.deepEqual(state.trace.filter((item) => item.kind === "WRITE").map((item) => item.stage), ["TAG", "RELEASE"]);

  const historical = releaseTuple();
  const legacyRecovered = recoverPublicReleaseSigningTuple(publishedCandidate, [exactWorkflow(historical)]);
  assert.deepEqual(legacyRecovered.package.signature, historical.package.signature);
  assert.equal(derivePublicReleaseWorkflowInputs(legacyRecovered).expected_signing_key_ids, undefined);
  for (const mutate of [
    (run) => { run.inputs.expected_sha = "f".repeat(40); },
    (run) => { run.inputs.expected_tarball_sha256 = "e".repeat(64); },
    (run) => { run.inputs.expected_signing_key_ids = '["SHA256:B","SHA256:A"]'; },
    (run) => { run.inputs.expectedSigningKeyId = "SHA256:B"; },
  ]) {
    const wrong = structuredClone(recordedRun);
    mutate(wrong);
    assert.throws(() => recoverPublicReleaseSigningTuple(publishedCandidate, [wrong]));
  }
  assert.throws(() => recoverPublicReleaseSigningTuple(publishedCandidate, {
    runs: [recordedRun], complete: false,
  }));
  assert.throws(() => recoverPublicReleaseSigningTuple(publishedCandidate, [recordedRun, exactWorkflow(publishedCandidate)]), /conflicting/);
});

test("safe rerun completion requires every earlier attempt unexecuted and matching provenance attempt", async () => {
  const tuple = releaseTuple();
  const workflow = { ...exactWorkflow(tuple), runAttempt: 3, priorAttempts: [
    { attempt: 1, publishBoundary: "NOT_EXECUTED" }, { attempt: 2, publishBoundary: "NOT_EXECUTED" },
  ] };
  const npm = exactNpm(tuple);
  npm.provenance.runAttempt = 3;
  const state = createStateClients(tuple, { workflow: [workflow], npm });
  const completed = await runPublicRelease({ tuple, standardDelivery: standardFinal(tuple), clients: state.clients });
  assert.equal(completed.outcome, "COMPLETE");
  assert.deepEqual(state.trace.filter((item) => item.kind === "WRITE").map((item) => item.stage), ["TAG", "RELEASE"]);
  for (const priorAttempts of [undefined, [], workflow.priorAttempts.slice(1),
    [{ attempt: 1, publishBoundary: "NOT_EXECUTED" }, { attempt: 2, publishBoundary: "UNKNOWN" }]]) {
    const blockedState = createStateClients(tuple, { workflow: [{ ...workflow, priorAttempts }], npm });
    const blocked = await runPublicRelease({ tuple, standardDelivery: standardFinal(tuple), clients: blockedState.clients });
    assert.equal(blocked.outcome, "BLOCKED");
    assert.equal(blockedState.trace.filter((item) => item.kind === "WRITE").length, 0);
  }
  const mismatch = classifyPublicReleaseState(tuple, { workflow: [workflow], npm: exactNpm(tuple), tag: null, release: null });
  assert.equal(mismatch.classifications.npm, "CONFLICT");
  const unexecuted = { ...workflow, conclusion: "failure", publishBoundary: "NOT_EXECUTED", publishAttempts: [] };
  const retry = createStateClients(tuple, { workflow: [unexecuted] });
  const retried = await runPublicRelease({ tuple, standardDelivery: standardFinal(tuple), clients: retry.clients });
  assert.equal(retried.outcome, "COMPLETE");
  assert.equal(retry.trace.filter((item) => item.kind === "WRITE" && item.stage === "NPM").length, 1);
});
